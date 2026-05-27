"""
================================================================================
🏓 SCRAPER CLASSEMENT ITTF — Classement mondial des joueurs (WTT / ITTF)
================================================================================

Récupère le classement mondial OFFICIEL des joueurs de tennis de table depuis
l'API World Table Tennis (worldtabletennis.com), la même que celle utilisée par
le site officiel. Sortie : un seul CSV `classement_ITTF.csv`.

Par défaut : Messieurs simple (MS) + Dames simple (WS), catégorie SENIOR —
c'est-à-dire le classement des JOUEURS (pas les doubles, qui sont des paires).

Source     : https://wttcmsapigateway-new.azure-api.net/internalttu/
Endpoint   : RankingsCurrentWeek/CurrentWeek/GetRankingIndividuals
Auth       : clé d'abonnement publique embarquée dans le front WTT.

Installation :
  pip install -r requirements.txt

Utilisation :
  python pingpong_ittf.py                 # MS + WS, senior -> classement_ITTF.csv
  python pingpong_ittf.py --events MS      # seulement Messieurs simple
  python pingpong_ittf.py --events MS WS   # Messieurs + Dames simple
  python pingpong_ittf.py --age YOU        # catégorie jeunes (U19)
  python pingpong_ittf.py --out mon_fichier.csv
  python pingpong_ittf.py --debug

Options :
  --events   : épreuves à inclure parmi MS WS (défaut: MS WS)
  --age      : catégorie d'âge SEN (senior, défaut) ou YOU (jeunes)
  --out      : chemin du CSV de sortie (défaut: classement_ITTF.csv)
  --debug    : logs verbeux
================================================================================
"""

import argparse
import csv
import logging
import sys
from pathlib import Path
from typing import Iterable

import requests
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

# ==============================================================================
# CONFIGURATION
# ==============================================================================
ROOT_DIR = Path(__file__).parent
DEFAULT_OUT = ROOT_DIR / "classement_ITTF.csv"

# API World Table Tennis (officielle). La clé est publique : elle est servie
# en clair dans le bundle JavaScript du site worldtabletennis.com.
API_BASE = "https://wttcmsapigateway-new.azure-api.net/internalttu/"
RANKING_ENDPOINT = "RankingsCurrentWeek/CurrentWeek/GetRankingIndividuals"
API_KEY = "2bf8b222-532c-4c60-8ebe-eb6fdfebe84a"

HEADERS = {
    "ApiKey": API_KEY,
    "Ocp-Apim-Subscription-Key": API_KEY,
    "Origin": "https://www.worldtabletennis.com",
    "Referer": "https://www.worldtabletennis.com/",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
}

TIMEOUT_SEC = 40

# Épreuves individuelles (joueurs). Les doubles (MD/WD/XD) sont des paires et
# ne font pas partie d'un classement de joueurs individuels.
EVENT_LABELS = {
    "MS": "Messieurs simple",
    "WS": "Dames simple",
}

AGE_LABELS = {
    "SEN": "Senior",
    "YOU": "Jeunes (U19)",
}

# Colonnes du CSV de sortie.
FIELDNAMES = [
    "rang",
    "rang_precedent",
    "evolution",
    "joueur",
    "pays_code",
    "pays",
    "points",
    "epreuve",
    "epreuve_libelle",
    "categorie_age",
    "ittf_id",
    "annee",
    "semaine",
    "date_publication",
]

logger = logging.getLogger("ittf")


# ==============================================================================
# CLIENT HTTP
# ==============================================================================
class HttpClient:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    @retry(
        retry=retry_if_exception_type(requests.RequestException),
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=2, max=20),
        reraise=True,
    )
    def get_json(self, url: str, params: dict) -> dict:
        resp = self.session.get(url, params=params, timeout=TIMEOUT_SEC)
        resp.raise_for_status()
        return resp.json()


# ==============================================================================
# SCRAPING
# ==============================================================================
def fetch_event(http: HttpClient, age_code: str, event_code: str) -> list:
    """Récupère le classement complet d'une épreuve (un seul appel suffit :
    l'API renvoie tous les joueurs classés à partir de StartRank=1)."""
    url = API_BASE + RANKING_ENDPOINT
    params = {"CategoryCode": age_code, "SubEventCode": event_code, "StartRank": 1}
    logger.debug("GET %s %s", url, params)
    payload = http.get_json(url, params)

    if payload.get("StatusCode") != 200:
        logger.warning("Réponse inattendue pour %s/%s : %s",
                       age_code, event_code, payload.get("StatusCode"))
        return []

    result = payload.get("Result") or []
    rows = []
    for r in result:
        rows.append({
            "rang": r.get("CurrentRank"),
            "rang_precedent": r.get("PreviousRank"),
            "evolution": r.get("RankingDifference"),
            "joueur": r.get("PlayerName"),
            "pays_code": r.get("CountryCode"),
            "pays": r.get("CountryName"),
            "points": r.get("RankingPointsYTD") or r.get("RankingPointsCareer"),
            "epreuve": event_code,
            "epreuve_libelle": EVENT_LABELS.get(event_code, event_code),
            "categorie_age": age_code,
            "ittf_id": r.get("IttfId"),
            "annee": r.get("RankingYear"),
            "semaine": r.get("RankingWeek"),
            "date_publication": r.get("PublishDate"),
        })

    # Tri par rang croissant (sécurité).
    rows.sort(key=lambda x: int(x["rang"]) if str(x["rang"]).isdigit() else 10**9)
    logger.info("%s / %s : %d joueurs", age_code, EVENT_LABELS.get(event_code, event_code), len(rows))
    return rows


def write_csv(path: Path, rows: Iterable[dict]) -> int:
    rows = list(rows)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


# ==============================================================================
# MAIN
# ==============================================================================
def main() -> int:
    parser = argparse.ArgumentParser(description="Scraper du classement mondial ITTF/WTT.")
    parser.add_argument("--events", nargs="+", default=["MS", "WS"],
                        choices=list(EVENT_LABELS.keys()),
                        help="Épreuves individuelles à inclure (défaut: MS WS).")
    parser.add_argument("--age", default="SEN", choices=list(AGE_LABELS.keys()),
                        help="Catégorie d'âge (défaut: SEN senior).")
    parser.add_argument("--out", default=str(DEFAULT_OUT),
                        help="Chemin du CSV de sortie (défaut: classement_ITTF.csv).")
    parser.add_argument("--debug", action="store_true", help="Logs verbeux.")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    http = HttpClient()
    all_rows: list = []
    for event in args.events:
        try:
            all_rows.extend(fetch_event(http, args.age, event))
        except requests.RequestException as exc:
            logger.error("Échec récupération %s/%s : %s", args.age, event, exc)
            return 1

    if not all_rows:
        logger.error("Aucun joueur récupéré.")
        return 1

    out_path = Path(args.out)
    n = write_csv(out_path, all_rows)
    logger.info("✅ %d joueurs écrits dans %s", n, out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
