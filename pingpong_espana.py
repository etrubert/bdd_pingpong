"""
================================================================================
PINGPONG ESPAGNE SCRAPER (RFETM) — Joueurs ranking national
================================================================================

Source : RFETM (Real Federación Española de Tenis de Mesa)
         https://rfetm.es/ranking/

Scrape :
  - Ranking national masculin + féminin (système Glicko)
  - 100 avancés + 100 intermédiaires + 100 débutants = 300 joueurs

Sortie :
  - data/players_spain.csv

Colonnes (en français pour cohérence avec players.csv) :
  licence, nom, prenom, ville, club_nom, club_ville, points_elo,
  rang_national, rang_ligue, rang_comite, classement_officiel,
  niveau_categorie, nombre_matchs

Utilisation :
  python pingpong_espana.py
  python pingpong_espana.py --debug
================================================================================
"""

import argparse
import csv
import logging
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Iterable, Optional

import requests
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential


# ==============================================================================
# CONFIGURATION
# ==============================================================================
ROOT_DIR = Path(__file__).parent
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
PLAYERS_CSV = DATA_DIR / "players_spain.csv"

# RFETM renvoie 406 si on annonce un UA "non navigateur" ; on imite Firefox.
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) "
    "Gecko/20100101 Firefox/124.0"
)
DEFAULT_DELAY_SEC = 1.5
TIMEOUT_SEC = 60
MAX_RETRIES = 3

RFETM_RANKING_URL = "https://rfetm.es/ranking/"
RANKING_YEAR = 2026
RANKING_MONTH = 3
RANKING_TEMPORADA = 11

# Seuils Glicko (RFETM) — calibrés sur la distribution réelle (~3000 joueurs M)
# Top 100 ≈ pts ≥ 1900 / Médian ≈ pts 1300-1500 / Bas ≈ pts < 1100
LEVEL_THRESHOLDS = {"avance": 1900, "intermediaire": 1100, "debutant": 0}

# Catégories officielles RFETM (basées sur les paliers de points Glicko)
CLASSEMENTS_OFFICIELS = [
    (2400, 99999, "Top Nacional"),
    (2200, 2399, "División de Honor"),
    (2000, 2199, "Superdivisión"),
    (1800, 1999, "1ª División Nacional"),
    (1600, 1799, "2ª División Nacional"),
    (1400, 1599, "1ª Autonómica"),
    (1200, 1399, "2ª Autonómica"),
    (1000, 1199, "Provincial"),
    (0, 999, "No Clasificado"),
]

PLAYERS_SAMPLE = {"avance": 100, "intermediaire": 100, "debutant": 100}

# Codes des fédérations autonomiques (préfixe et suffixe '-' dans la colonne FA)
# Servent juste à humaniser les logs (le rang ligue est calculé par groupe FA).
FA_LABELS = {
    "AND": "Andalucía", "ARA": "Aragón", "AST": "Asturias", "BAL": "Baleares",
    "CAN": "Canarias", "CTB": "Cantabria", "CLM": "Castilla-La Mancha",
    "CYL": "Castilla y León", "CAT": "Cataluña", "EXT": "Extremadura",
    "GAL": "Galicia", "MAD": "Madrid", "MUR": "Murcia", "NAV": "Navarra",
    "PVA": "País Vasco", "RIO": "La Rioja", "VAL": "Comunidad Valenciana",
    "CEU": "Ceuta", "MEL": "Melilla",
}

PLAYER_FIELDNAMES = [
    "licence",
    "nom",
    "prenom",
    "ville",
    "club_nom",
    "club_ville",
    "points_elo",
    "rang_national",
    "rang_ligue",
    "rang_comite",
    "classement_officiel",
    "niveau_categorie",
    "nombre_matchs",
    "victoires",
    "defaites",
]

logger = logging.getLogger(__name__)


# ==============================================================================
# HTTP CLIENT (identique au scraper France)
# ==============================================================================
class HttpClient:
    def __init__(self, delay_sec: float = DEFAULT_DELAY_SEC, user_agent: str = USER_AGENT):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent})
        self.delay_sec = delay_sec
        self._last_request_time = 0.0

    def _wait(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self.delay_sec:
            time.sleep(self.delay_sec - elapsed)
        self._last_request_time = time.time()

    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((requests.RequestException,)),
        reraise=True,
    )
    def get(self, url, params=None, **kwargs):
        self._wait()
        resp = self.session.get(url, params=params, timeout=TIMEOUT_SEC, **kwargs)
        resp.raise_for_status()
        return resp

    def close(self):
        self.session.close()


# ==============================================================================
# UTILS — CSV (UTF-8 BOM pour Excel)
# ==============================================================================
def write_csv(path: Path, rows: Iterable[dict], fieldnames: list) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            count += 1
    return count


# ==============================================================================
# CLASSIFICATION
# ==============================================================================
def categoriser_niveau(points: float) -> str:
    if points is None:
        return "inconnu"
    if points >= LEVEL_THRESHOLDS["avance"]:
        return "avance"
    if points >= LEVEL_THRESHOLDS["intermediaire"]:
        return "intermediaire"
    return "debutant"


def classement_officiel(points: float) -> str:
    if points is None:
        return "Inconnu"
    for pmin, pmax, libelle in CLASSEMENTS_OFFICIELS:
        if pmin <= points <= pmax:
            return libelle
    return "Hors barème"


# ==============================================================================
# PARSER — Lignes du tableau ranking RFETM
# ==============================================================================
# Colonnes : LIC | NOMBRE | CLUB | FA | CAT | PTS | CLAF | NAC | SEN | S21 | ...
# Le rang national (NAC) est dans une cellule `<td align='center' bgcolor='#feeadd'>N</td>`
# (les autres rangs ont `<span style='display:none'>99999</span>`).
# Une ligne <tr>...</tr> contient ces cellules dans l'ordre :
#   0:LIC  1:NOMBRE  2:CLUB  3:FA  4:CAT  5:PTS  6:CLAF  7:NAC  8:SEN  9:S21 ...
# Chaque cellule peut contenir soit un nombre visible, soit un placeholder caché
# `<span style='display:none'>99999</span>` (= pas classé dans cette catégorie).
_TD_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.DOTALL)
_PLAYER_LINK_RE = re.compile(
    r"<a[^>]*accion=5&jugador=\d+[^>]*>\s*<b>([^<]+)</b>\s*</a>",
    re.IGNORECASE,
)


def _cell_number(html: str) -> Optional[int]:
    """Extrait un entier d'une cellule de rang. Retourne None si '99999' (caché)."""
    # Strip tags
    txt = re.sub(r"<[^>]+>", "", html).strip()
    if not txt or txt == "99999":
        return None
    try:
        n = int(txt)
        return None if n == 99999 else n
    except ValueError:
        return None


def _split_apellido_nombre(full: str) -> tuple:
    """RFETM affiche 'APELLIDO Nombre' (apellido en MAJUSCULES, nombre capitalisé).

    Ex: 'FERREIRA Diogo Miguel' -> ('FERREIRA', 'Diogo Miguel')
        'GARCIA LOPEZ Juan Carlos' -> ('GARCIA LOPEZ', 'Juan Carlos')
    """
    full = full.strip()
    parts = full.split()
    apellido_tokens, nombre_tokens = [], []
    for i, tok in enumerate(parts):
        # MAJUSCULES (ou particule courte tout en bas comme DA, DE, LA, DEL)
        if tok.isupper() or (len(tok) <= 3 and tok.upper() == tok):
            apellido_tokens.append(tok)
        else:
            nombre_tokens = parts[i:]
            break
    if not nombre_tokens:
        return full, ""
    return " ".join(apellido_tokens), " ".join(nombre_tokens)


def _clean_fa(fa: str) -> str:
    """'-AND-' -> 'AND'. Vide si pas de FA reconnaissable."""
    s = fa.strip().strip("-").strip()
    return s if s else ""


# ==============================================================================
# SCRAPER PRINCIPAL
# ==============================================================================
class RFETMPlayersScraper:
    def __init__(self, http: Optional[HttpClient] = None):
        self.http = http or HttpClient()
        logger.info("Source : RFETM (Real Federación Española de Tenis de Mesa)")

    def _fetch_ranking(self, sexo: str) -> str:
        params = {
            "accion": 2,
            "year": RANKING_YEAR,
            "mes": RANKING_MONTH,
            "sexo": sexo,
            "temporada": RANKING_TEMPORADA,
        }
        logger.info(f"GET ranking {sexo} ({RANKING_YEAR}-{RANKING_MONTH:02d})...")
        resp = self.http.get(RFETM_RANKING_URL, params=params)
        return resp.text

    def _parse_ranking(self, html: str, sexo: str) -> list:
        joueurs = []
        for tr_match in re.finditer(r"<tr>(.*?)</tr>", html, flags=re.DOTALL):
            tr = tr_match.group(0)
            cells = _TD_RE.findall(tr)
            # Une ligne joueur a 21 cellules ; les en-têtes <th> sont filtrés.
            if len(cells) < 8:
                continue
            link = _PLAYER_LINK_RE.search(cells[1])
            if not link:
                continue  # ce n'est pas une ligne joueur
            licencia = re.sub(r"<[^>]+>", "", cells[0]).strip()
            try:
                points = float(re.sub(r"<[^>]+>", "", cells[5]).strip())
            except ValueError:
                continue
            apellido, nombre_pers = _split_apellido_nombre(link.group(1))
            joueurs.append({
                "licencia": licencia,
                "apellido": apellido,
                "nombre": nombre_pers,
                "club": re.sub(r"<[^>]+>", "", cells[2]).strip(),
                "fa": _clean_fa(re.sub(r"<[^>]+>", "", cells[3])),
                "cat": re.sub(r"<[^>]+>", "", cells[4]).strip(),
                "puntos": points,
                "rang_nac": _cell_number(cells[7]),
                "sexo": sexo,
            })
        logger.info(f"  -> {len(joueurs)} joueurs parsés ({sexo})")
        return joueurs

    def collecter_tous(self) -> list:
        all_players = []
        for sexo in ("M", "F"):
            html = self._fetch_ranking(sexo)
            all_players.extend(self._parse_ranking(html, sexo))
        return all_players

    def detail_match_stats(self, licencia: str) -> dict:
        """Récupère matchs/V/D pour un joueur via accion=55 (saison courante).

        La page renvoie jusqu'à 50 matchs. Colonnes :
          FH PART | RK MES | EVENTO | CAT | J1 | NOMBRE J1 | J2 | NOMBRE J2
          | RES 1 | RES 2 | RK 1 | RK 2 | P 1 | P2

        Pour chaque ligne :
          - si J1 == licencia : V si RES1 > RES2, sinon D
          - si J2 == licencia : V si RES2 > RES1, sinon D
        """
        params = {"accion": 55, "jugador": licencia, "temporada": RANKING_TEMPORADA}
        try:
            resp = self.http.get(RFETM_RANKING_URL, params=params)
        except Exception:
            return {}
        # Trouver la table de matchs (la 1ère qui a "FH PART" en header)
        tables = re.findall(r"<table[^>]*>(.*?)</table>", resp.text, flags=re.DOTALL)
        for tbl in tables:
            rows = re.findall(r"<tr[^>]*>(.*?)</tr>", tbl, flags=re.DOTALL)
            if not rows:
                continue
            header_cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", rows[0], flags=re.DOTALL)
            header_text = " ".join(re.sub(r"<[^>]+>", "", c) for c in header_cells)
            if "FH PART" not in header_text or "RES 1" not in header_text:
                continue
            matchs = victoires = defaites = 0
            for row in rows[1:]:
                cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", row, flags=re.DOTALL)
                if len(cells) < 10:
                    continue
                clean = [re.sub(r"<[^>]+>", "", c).strip() for c in cells]
                j1, j2 = clean[4], clean[6]
                try:
                    res1 = int(clean[8])
                    res2 = int(clean[9])
                except ValueError:
                    continue
                matchs += 1
                if j1 == licencia:
                    if res1 > res2:
                        victoires += 1
                    else:
                        defaites += 1
                elif j2 == licencia:
                    if res2 > res1:
                        victoires += 1
                    else:
                        defaites += 1
                else:
                    # ligne sans le joueur — ne devrait pas arriver mais on skip
                    matchs -= 1
            return {
                "nombre_matchs": matchs,
                "victoires": victoires,
                "defaites": defaites,
            }
        return {}

    @staticmethod
    def calculer_rangs_ligue(joueurs: list) -> dict:
        """Rang dans la fédération autonomique (par sexe). Retourne {licencia: rang}."""
        groups = defaultdict(list)
        for j in joueurs:
            key = (j["fa"], j["sexo"])
            groups[key].append(j)
        rang_par_licencia = {}
        for key, members in groups.items():
            members.sort(key=lambda x: x["puntos"], reverse=True)
            for i, m in enumerate(members, start=1):
                rang_par_licencia[m["licencia"]] = i
        return rang_par_licencia

    def echantillonner(self, joueurs: list) -> list:
        """Sélectionne 100/100/100 par niveau, triés par points décroissants."""
        # Tri global par points décroissants (les top arrivent en premier)
        joueurs_tries = sorted(joueurs, key=lambda x: x["puntos"], reverse=True)

        rangs_ligue = self.calculer_rangs_ligue(joueurs)

        buckets = {"avance": [], "intermediaire": [], "debutant": []}
        targets = PLAYERS_SAMPLE

        for j in joueurs_tries:
            niveau = categoriser_niveau(j["puntos"])
            if niveau not in buckets:
                continue
            if len(buckets[niveau]) >= targets[niveau]:
                continue
            stats = self.detail_match_stats(j["licencia"])
            total_buck = sum(len(b) for b in buckets.values())
            logger.info(
                f"  [{total_buck+1:>3}/300] {niveau:<13} "
                f"{j['apellido']:<20} {j['nombre']:<15} "
                f"pts={j['puntos']:<6} matchs={stats.get('nombre_matchs')} "
                f"V={stats.get('victoires')} D={stats.get('defaites')}"
            )
            buckets[niveau].append({
                "licence": j["licencia"],
                "nom": j["apellido"],
                "prenom": j["nombre"],
                "ville": "",
                "club_nom": j["club"],
                "club_ville": "",
                "points_elo": j["puntos"],
                "rang_national": j["rang_nac"],
                "rang_ligue": rangs_ligue.get(j["licencia"]),
                "rang_comite": None,
                "classement_officiel": classement_officiel(j["puntos"]),
                "niveau_categorie": niveau,
                "nombre_matchs": stats.get("nombre_matchs"),
                "victoires": stats.get("victoires"),
                "defaites": stats.get("defaites"),
            })
            if all(len(buckets[n]) >= targets[n] for n in targets):
                break

        for n in targets:
            logger.info(f"Bucket {n}: {len(buckets[n])}/{targets[n]}")

        # Concaténer dans l'ordre avancé > intermédiaire > débutant
        out = []
        for n in ("avance", "intermediaire", "debutant"):
            out.extend(buckets[n])
        # Tri final par points décroissants pour un rendu cohérent
        out.sort(key=lambda r: r["points_elo"], reverse=True)
        return out


# ==============================================================================
# MAIN
# ==============================================================================
def run_players():
    logger.info("=" * 60)
    logger.info(f"SCRAPER JOUEURS RFETM — Objectif : {PLAYERS_SAMPLE}")
    logger.info("=" * 60)

    scraper = RFETMPlayersScraper()
    joueurs = scraper.collecter_tous()

    if not joueurs:
        logger.error("Aucun joueur récupéré depuis le ranking RFETM.")
        return False

    logger.info(f"Total joueurs dans le ranking national : {len(joueurs)}")
    records = scraper.echantillonner(joueurs)

    if not records:
        logger.error("Aucun joueur sélectionné après échantillonnage.")
        return False

    n = write_csv(PLAYERS_CSV, records, PLAYER_FIELDNAMES)
    logger.info(f"OK : {n} joueurs ecrits dans {PLAYERS_CSV}")

    summary = {}
    for r in records:
        summary[r["niveau_categorie"]] = summary.get(r["niveau_categorie"], 0) + 1
    logger.info(f"Repartition : {summary}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Scraper PingPong Espagne (joueurs RFETM)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--debug", action="store_true", help="Logs verbeux")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    success = run_players()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
