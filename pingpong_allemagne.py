"""
================================================================================
PINGPONG ALLEMAGNE SCRAPER (DTTB / andro-Rangliste) — Joueurs ranking national
================================================================================

Source : myTischtennis.de — andro-Rangliste publique (top 300 DTTB)
         https://www.mytischtennis.de/rankings/andro-rangliste

Scrape :
  - Top 300 du classement national andro (M+F mélangés, par Q-TTR)
  - Pagination : 3 pages × 100 joueurs

Stratégie niveaux (le ranking public ne contient QUE les top 300 d'Allemagne,
tous très forts en absolu — Q-TTR 2106-2612). On les segmente en tertiles
relatifs au sein du top 300 :
  - Avance       = rangs 1-100  (Q-TTR ~2217-2612)
  - Intermediaire = rangs 101-200 (Q-TTR ~2150-2216)
  - Debutant     = rangs 201-300 (Q-TTR ~2106-2150)
NB : ces "débutants" sont en réalité des joueurs nationaux de très bon niveau ;
     le label est un tertile relatif, pas un niveau absolu.

Sortie :
  - data/playeurs_allemagne.csv  (colonnes FR identiques aux scrapers FR/ES/PT)

Utilisation :
  python pingpong_allemagne.py
  python pingpong_allemagne.py --debug
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
PLAYERS_CSV = DATA_DIR / "playeurs_allemagne.csv"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) "
    "Gecko/20100101 Firefox/124.0"
)
DEFAULT_DELAY_SEC = 1.5
TIMEOUT_SEC = 60
MAX_RETRIES = 3

ANDRO_URL = "https://www.mytischtennis.de/rankings/andro-rangliste"
PAGES = [1, 2, 3]  # 3 pages × 100 joueurs = top 300

# Catégories Q-TTR officielles DTTB (paliers indicatifs sur l'échelle complète)
# Top national = Q-TTR > 2200 ; Bundesliga ~2000+ ; régional ~1500-1800 ; etc.
CLASSEMENTS_OFFICIELS = [
    (2400, 99999, "Top National (Selection DTTB)"),
    (2200, 2399, "Bundesliga / Nationalmannschaft"),
    (2000, 2199, "2. Bundesliga / Regionalliga"),
    (1800, 1999, "Oberliga"),
    (1600, 1799, "Verbandsliga"),
    (1400, 1599, "Landesliga"),
    (1200, 1399, "Bezirksliga"),
    (1000, 1199, "Kreisliga"),
    (0, 999, "Hobby / Anfänger"),
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
# NOTE : nombre_matchs / victoires / defaites sont VIDES pour l'Allemagne.
# La page andro-Rangliste publique n'expose pas ces stats, et l'API
# mytischtennis exige une authentification login (cookie) pour
# /api/statistics/{player_id}/matches/{date_range} qui les contient.
# Investigué : click-tt /spielerportrait/<id> redirige vers /verbaende,
# pas de fiche joueur publique trouvée. → champs laissés vides.

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


def split_nom_de(full: str) -> tuple:
    """Split 'Vorname Nachname' à l'allemande. Convention CSV : nom MAJ, prénom Title.

    Ex: 'Dang Qiu'         -> ('QIU', 'Dang')
        'Josephina Neumann' -> ('NEUMANN', 'Josephina')
        'Bao Chau Elisa Nguyen' -> ('NGUYEN', 'Bao Chau Elisa')
    """
    full = full.strip()
    if not full:
        return "", ""
    parts = full.split()
    if len(parts) == 1:
        return parts[0].upper(), ""
    nom = parts[-1].upper()
    prenom = " ".join(parts[:-1])
    return nom, prenom


# ==============================================================================
# PARSER — Tableau andro-Rangliste
# ==============================================================================
# Colonnes de la <table aria-label="Nationale andro-Rangliste"> :
#   td[0] Rang | td[1] D-Rang | td[2] Spieler | td[3] Verein | td[4] Q-TTR
#
# td[2] (Spieler) contient :
#   <div ...><span aria-label="männlich|weiblich">m|w</span>
#            <span>Vorname<!-- --> <!-- -->Nachname</span></div>
_TBODY_RE = re.compile(r"<tbody[^>]*>(.*?)</tbody>", re.DOTALL)
_TR_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.DOTALL)
_TD_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.DOTALL)
_GENDER_RE = re.compile(r'aria-label="(männlich|weiblich)"', re.IGNORECASE)


def _strip_html(s: str) -> str:
    """Supprime balises et commentaires HTML, normalise espaces."""
    s = re.sub(r"<!--.*?-->", "", s, flags=re.DOTALL)
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _parse_int(s: str) -> Optional[int]:
    s = _strip_html(s)
    if not s:
        return None
    try:
        return int(s)
    except ValueError:
        return None


def _parse_player_cell(html: str) -> tuple:
    """Extrait (gender, nom_complet) depuis la cellule Spieler.

    La cellule contient deux spans : le premier porte aria-label='männlich'/
    'weiblich' et a comme texte 'm' ou 'w' ; le deuxième contient le nom.
    On enlève juste ce premier 'm'/'w' du texte global.
    """
    g_match = _GENDER_RE.search(html)
    gender = "M" if g_match and g_match.group(1).lower() == "männlich" else "F"
    txt = _strip_html(html)
    # Le 1er caractère "m" ou "w" vient de l'icône, on l'enlève s'il précède
    # directement une majuscule (début du prénom).
    if txt[:2] in ("m ", "w "):
        txt = txt[2:]
    elif txt and txt[0] in ("m", "w") and len(txt) > 1 and txt[1].isupper():
        txt = txt[1:]
    return gender, txt.strip()


# ==============================================================================
# SCRAPER PRINCIPAL
# ==============================================================================
class DTTBPlayersScraper:
    def __init__(self, http: Optional[HttpClient] = None):
        self.http = http or HttpClient()
        logger.info("Source : myTischtennis.de — andro-Rangliste (DTTB top 300 public)")

    def _fetch_page(self, page: int) -> str:
        params = {"gender": "all", "resultsPerPage": 100, "page": page}
        logger.info(f"GET andro-Rangliste page {page}/3")
        resp = self.http.get(ANDRO_URL, params=params)
        return resp.text

    def _parse_page(self, html: str) -> list:
        m = _TBODY_RE.search(html)
        if not m:
            return []
        rows = _TR_RE.findall(m.group(1))
        joueurs = []
        for row in rows:
            tds = _TD_RE.findall(row)
            if len(tds) < 5:
                continue
            rang = _parse_int(tds[0])
            d_rang = _parse_int(tds[1])
            gender, nom_complet = _parse_player_cell(tds[2])
            verein = _strip_html(tds[3])
            qttr = _parse_int(tds[4])
            if rang is None or qttr is None or not nom_complet:
                continue
            nom, prenom = split_nom_de(nom_complet)
            joueurs.append({
                "rang_national": rang,
                "d_rang": d_rang,
                "nom": nom,
                "prenom": prenom,
                "club_nom": verein,
                "qttr": qttr,
                "sexo": gender,
            })
        return joueurs

    def collecter_top300(self) -> list:
        all_players = []
        for page in PAGES:
            html = self._fetch_page(page)
            joueurs = self._parse_page(html)
            logger.info(f"  -> {len(joueurs)} joueurs parsés sur la page {page}")
            all_players.extend(joueurs)
        return all_players

    def echantillonner(self, joueurs: list) -> list:
        """Top 100 par rang -> avance ; rangs 101-200 -> intermediaire ;
        rangs 201-300 -> debutant. Garantit 300 joueurs si la source en
        contient au moins autant.
        """
        joueurs_tries = sorted(joueurs, key=lambda x: x["rang_national"])
        n = len(joueurs_tries)
        if n < 300:
            logger.warning(f"Seulement {n} joueurs disponibles (top 300 attendu).")

        records = []
        for j in joueurs_tries:
            r = j["rang_national"]
            if r <= 100:
                niveau = "avance"
            elif r <= 200:
                niveau = "intermediaire"
            elif r <= 300:
                niveau = "debutant"
            else:
                continue
            records.append({
                "licence": "",  # non exposé par andro-Rangliste public
                "nom": j["nom"],
                "prenom": j["prenom"],
                "ville": "",
                "club_nom": j["club_nom"],
                "club_ville": "",
                "points_elo": j["qttr"],
                "rang_national": j["rang_national"],
                "rang_ligue": j["d_rang"],   # D-Rang (rang parmi joueurs allemands)
                "rang_comite": None,
                "classement_officiel": classement_officiel(j["qttr"]),
                "niveau_categorie": niveau,
                "nombre_matchs": None,
                "victoires": None,
                "defaites": None,
            })

        cnt = {"avance": 0, "intermediaire": 0, "debutant": 0}
        for r in records:
            cnt[r["niveau_categorie"]] += 1
        for n_, c in cnt.items():
            logger.info(f"Bucket {n_}: {c}/{PLAYERS_SAMPLE[n_]}")
        return records


# ==============================================================================
# MAIN
# ==============================================================================
def run_players():
    logger.info("=" * 60)
    logger.info(f"SCRAPER JOUEURS DTTB (andro) — Objectif : {PLAYERS_SAMPLE}")
    logger.info("=" * 60)

    scraper = DTTBPlayersScraper()
    joueurs = scraper.collecter_top300()

    if not joueurs:
        logger.error("Aucun joueur récupéré depuis andro-Rangliste.")
        return False

    logger.info(f"Total joueurs recoltes : {len(joueurs)}")
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
        description="Scraper PingPong Allemagne (joueurs DTTB / andro-Rangliste)",
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
