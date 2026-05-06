"""
================================================================================
PINGPONG PORTUGAL SCRAPER (FPTM) — Joueurs ranking national
================================================================================

Source : FPTM (Federação Portuguesa de Ténis de Mesa)
         https://resultados.fptm.pt/players/rankings/Portugal/{cat}/{periodo}

Scrape :
  - Seniores Masculinos absolus + Seniores Femininos absolus
  - 100 avancés + 100 intermédiaires + 100 débutants = 300 joueurs

Méthode niveaux :
  Seuils Pontos calibrés DYNAMIQUEMENT depuis la distribution courante.
  - Avance       = top 100 par points (rang ~1-100)
  - Intermediaire = rang ~101-200 par points
  - Debutant     = rang ~201-300 par points
  Ainsi 300 joueurs sont toujours collectés, même si le ranking change de
  taille au fil des mois.

Sortie :
  - data/players_portugals.csv  (colonnes FR identiques aux scrapers FR/ES)

Utilisation :
  python pingpong_portugal.py
  python pingpong_portugal.py --debug
================================================================================
"""

import argparse
import csv
import logging
import re
import sys
import time
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
PLAYERS_CSV = DATA_DIR / "players_portugals.csv"

# UA navigateur (FPTM/HelloTableTennis filtre les UA non-navigateurs)
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) "
    "Gecko/20100101 Firefox/124.0"
)
DEFAULT_DELAY_SEC = 1.5
TIMEOUT_SEC = 60
MAX_RETRIES = 3

# Catégories ranking FPTM (résolues 2026-04)
#   cat=8  -> Seniores Masculinos
#   cat=11 -> Seniores Femininos
# La période la plus récente est détectée dynamiquement depuis l'index.
FPTM_BASE = "https://resultados.fptm.pt"
RANKINGS = {
    "M": ("Seniores Masculinos", "/players/rankings/Portugal/8"),
    "F": ("Seniores Femininos", "/players/rankings/Portugal/11"),
}

# Catégories officielles affichées en `classement_officiel`
# (mapping basé sur la distribution Pontos FPTM, top ~6000)
CLASSEMENTS_OFFICIELS = [
    (5000, 99999, "Top Nacional / Selecção"),
    (4000, 4999, "1ª Divisão Nacional"),
    (3000, 3999, "2ª Divisão Nacional"),
    (2000, 2999, "3ª Divisão Nacional"),
    (1500, 1999, "Divisão Regional"),
    (1000, 1499, "1ª Divisão Distrital"),
    (500, 999, "2ª Divisão Distrital"),
    (0, 499, "Iniciante / Não Classificado"),
]

PLAYERS_SAMPLE = {"avance": 100, "intermediaire": 100, "debutant": 100}

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
# HTTP CLIENT
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
# UTILS
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


def classement_officiel(points: float) -> str:
    if points is None:
        return "Inconnu"
    for pmin, pmax, libelle in CLASSEMENTS_OFFICIELS:
        if pmin <= points <= pmax:
            return libelle
    return "Hors barème"


def split_nome_pt(full: str) -> tuple:
    """Split 'NOME COMPLETO' à la portugaise.

    Convention CSV (cohérente avec FR/ES) : nom en MAJ, prénom en Title.
    Heuristique : dernier mot = nom (apellido), reste = prénom.

    Ex: 'Taiwo Mati'                       -> ('MATI', 'Taiwo')
        'KIRILL SHVETS'                    -> ('SHVETS', 'Kirill')
        'DIOGO MIGUEL FERREIRA CARVALHO'   -> ('CARVALHO', 'Diogo Miguel Ferreira')
    """
    full = full.strip()
    if not full:
        return "", ""
    parts = full.split()
    if len(parts) == 1:
        return parts[0].upper(), ""
    nom = parts[-1].upper()
    prenom = " ".join(p.capitalize() for p in parts[:-1])
    return nom, prenom


# ==============================================================================
# PARSER
# ==============================================================================
# Une ligne joueur : <td>POS</td><td>LIC</td><td>NOME</td><td>EQUIPA</td>
#                    <td><a href="...">PONTOS</a></td>
_ROW_RE = re.compile(
    r"<td>\s*(?P<pos>\d+)\s*</td>\s*"
    r"<td>\s*(?P<lic>\d+)\s*</td>\s*"
    r"<td>\s*(?P<nome>[^<]+?)\s*</td>\s*"
    r"<td>\s*(?P<equipa>[^<]+?)\s*</td>\s*"
    r"<td>\s*<a[^>]*>\s*(?P<pts>\d+)\s*</a>",
    re.DOTALL,
)
_PERIOD_LINK_RE_TEMPLATE = (
    r'href="' + re.escape(FPTM_BASE) + r'/players/rankings/Portugal/{cat}/(\d+)"'
)


# ==============================================================================
# SCRAPER PRINCIPAL
# ==============================================================================
class FPTMPlayersScraper:
    def __init__(self, http: Optional[HttpClient] = None):
        self.http = http or HttpClient()
        logger.info("Source : FPTM (Federação Portuguesa de Ténis de Mesa)")

    def _detect_latest_period(self, cat_path: str) -> Optional[int]:
        """Fetch l'index de la catégorie et retourne l'ID de période le plus
        récent (le plus grand entier)."""
        cat_id = cat_path.rstrip("/").split("/")[-1]
        url = FPTM_BASE + cat_path
        resp = self.http.get(url)
        pattern = _PERIOD_LINK_RE_TEMPLATE.format(cat=cat_id)
        ids = [int(p) for p in re.findall(pattern, resp.text)]
        if not ids:
            return None
        return max(ids)

    def _parse_ranking(self, html: str, sexo: str, cat_path: str, periode: int) -> list:
        joueurs = []
        for m in _ROW_RE.finditer(html):
            try:
                pts = int(m.group("pts"))
            except ValueError:
                continue
            nom, prenom = split_nome_pt(m.group("nome"))
            joueurs.append({
                "licence": m.group("lic"),
                "nom": nom,
                "prenom": prenom,
                "club_nom": m.group("equipa").strip(),
                "pontos": pts,
                "rang_national": int(m.group("pos")),
                "sexo": sexo,
                "cat_path": cat_path,
                "periode": periode,
            })
        return joueurs

    def collecter_tous(self) -> list:
        all_players = []
        for sexo, (label, cat_path) in RANKINGS.items():
            periode = self._detect_latest_period(cat_path)
            if periode is None:
                logger.warning(f"Pas de période trouvée pour {label} ({cat_path})")
                continue
            url = f"{FPTM_BASE}{cat_path}/{periode}"
            logger.info(f"GET {label} (período {periode}) -> {url}")
            resp = self.http.get(url)
            joueurs = self._parse_ranking(resp.text, sexo, cat_path, periode)
            logger.info(f"  -> {len(joueurs)} joueurs parsés")
            all_players.extend(joueurs)
        return all_players

    def detail_match_stats(self, licencia: str, cat_path: str, periode: int) -> dict:
        """Récupère matchs/V/D pour un joueur via la page /history.

        URL : {BASE}{cat_path}/{periode}/{licencia}/history
        Le tableau d'historique a la première colonne au format "X-Y" où
        X = sets gagnés par le joueur, Y = sets gagnés par l'adversaire.
        """
        url = f"{FPTM_BASE}{cat_path}/{periode}/{licencia}/history"
        try:
            resp = self.http.get(url)
        except Exception:
            return {}
        # Le tableau d'historique est généralement le 2e tableau (le 1er est
        # la fiche d'identité du joueur).
        tables = re.findall(r"<table[^>]*>(.*?)</table>", resp.text, flags=re.DOTALL)
        for tbl in tables:
            rows = re.findall(r"<tr[^>]*>(.*?)</tr>", tbl, flags=re.DOTALL)
            matchs = victoires = defaites = 0
            for row in rows:
                cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", row, flags=re.DOTALL)
                if not cells:
                    continue
                first = re.sub(r"<[^>]+>", "", cells[0]).strip()
                m = re.match(r"^(\d+)\s*-\s*(\d+)$", first)
                if not m:
                    continue
                p_sets, o_sets = int(m.group(1)), int(m.group(2))
                matchs += 1
                if p_sets > o_sets:
                    victoires += 1
                else:
                    defaites += 1
            if matchs > 0:
                return {
                    "nombre_matchs": matchs,
                    "victoires": victoires,
                    "defaites": defaites,
                }
        return {}

    def echantillonner(self, joueurs: list) -> list:
        """Calibre les seuils dynamiquement pour garantir 100/100/100."""
        pts_tries = sorted([j["pontos"] for j in joueurs], reverse=True)
        n = len(pts_tries)
        if n < 300:
            logger.warning(
                f"Seulement {n} joueurs disponibles, on ne pourra pas atteindre 300."
            )
        seuil_avance = pts_tries[99] if n >= 100 else 0
        seuil_inter = pts_tries[199] if n >= 200 else 0
        logger.info(
            f"Seuils calibrés : avance >= {seuil_avance} pts | "
            f"intermediaire >= {seuil_inter} pts"
        )

        joueurs_tries = sorted(joueurs, key=lambda x: x["pontos"], reverse=True)
        buckets = {"avance": [], "intermediaire": [], "debutant": []}
        targets = PLAYERS_SAMPLE

        for j in joueurs_tries:
            pts = j["pontos"]
            # Catégorie cible primaire selon les seuils
            if pts >= seuil_avance:
                primaire = "avance"
            elif pts >= seuil_inter:
                primaire = "intermediaire"
            else:
                primaire = "debutant"
            # Overflow : si le bucket primaire est plein, on déborde vers le
            # bucket suivant (avance -> intermediaire -> debutant). Évite
            # qu'une égalité de points à la frontière ne fasse perdre des joueurs.
            chaine = {
                "avance": ["avance", "intermediaire", "debutant"],
                "intermediaire": ["intermediaire", "debutant"],
                "debutant": ["debutant"],
            }[primaire]
            niveau = next(
                (n for n in chaine if len(buckets[n]) < targets[n]),
                None,
            )
            if niveau is None:
                continue
            stats = self.detail_match_stats(j["licence"], j["cat_path"], j["periode"])
            total_buck = sum(len(b) for b in buckets.values())
            logger.info(
                f"  [{total_buck+1:>3}/300] {niveau:<13} "
                f"{j['nom']:<20} {j['prenom']:<15} "
                f"pts={pts:<5} matchs={stats.get('nombre_matchs')} "
                f"V={stats.get('victoires')} D={stats.get('defaites')}"
            )
            buckets[niveau].append({
                "licence": j["licence"],
                "nom": j["nom"],
                "prenom": j["prenom"],
                "ville": "",
                "club_nom": j["club_nom"],
                "club_ville": "",
                "points_elo": pts,
                "rang_national": j["rang_national"],
                "rang_ligue": None,
                "rang_comite": None,
                "classement_officiel": classement_officiel(pts),
                "niveau_categorie": niveau,
                "nombre_matchs": stats.get("nombre_matchs"),
                "victoires": stats.get("victoires"),
                "defaites": stats.get("defaites"),
            })
            if all(len(buckets[n]) >= targets[n] for n in targets):
                break

        for n in targets:
            logger.info(f"Bucket {n}: {len(buckets[n])}/{targets[n]}")

        out = []
        for n in ("avance", "intermediaire", "debutant"):
            out.extend(buckets[n])
        out.sort(key=lambda r: r["points_elo"], reverse=True)
        return out


# ==============================================================================
# MAIN
# ==============================================================================
def run_players():
    logger.info("=" * 60)
    logger.info(f"SCRAPER JOUEURS FPTM — Objectif : {PLAYERS_SAMPLE}")
    logger.info("=" * 60)

    scraper = FPTMPlayersScraper()
    joueurs = scraper.collecter_tous()

    if not joueurs:
        logger.error("Aucun joueur récupéré depuis le ranking FPTM.")
        return False

    logger.info(f"Total joueurs dans les rankings nationaux : {len(joueurs)}")
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
        description="Scraper PingPong Portugal (joueurs FPTM)",
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
