"""
================================================================================
MAPS CLUBS — Génère des URLs Google Maps pour chaque club
================================================================================

Lit data/players.csv (France) et data/players_spain.csv (Espagne),
extrait les clubs uniques de la colonne `club_nom`, et génère pour chacun
une URL de recherche Google Maps (option B : pas d'API, pas de clé).

Sortie :
  - data/maps_clubs.csv  (colonnes : club_nom, pays, url)

Utilisation :
  python maps_clubs.py
  python maps_clubs.py --debug
================================================================================
"""

import argparse
import csv
import logging
import sys
from pathlib import Path
from urllib.parse import quote_plus

ROOT_DIR = Path(__file__).parent
# Fallback : si data/ existe utilise-le, sinon racine
DATA_DIR = ROOT_DIR / "data" if (ROOT_DIR / "data").exists() else ROOT_DIR
PLAYERS_FR_CSV = DATA_DIR / "players.csv"
PLAYERS_ES_CSV = DATA_DIR / "players_spain.csv"
PLAYERS_PT_CSV = DATA_DIR / "players_portugals.csv"
PLAYERS_CN_CSV = DATA_DIR / "players_chine.csv"
PLAYERS_US_CSV = DATA_DIR / "players_usa.csv"
PLAYERS_DE_CSV = DATA_DIR / "playeurs_allemagne.csv"
OUTPUT_CSV = DATA_DIR / "maps_clubs.csv"

OUTPUT_FIELDNAMES = ["club_nom", "pays", "url"]

# URL de recherche Google Maps (deep link officiel, sans clé API)
GMAPS_SEARCH = "https://www.google.com/maps/search/?api=1&query="

# Contexte de recherche par pays — évite que "JUMP" matche un trampoline
COUNTRY_CONTEXT = {
    "France": "tennis de table France",
    "Espagne": "tenis de mesa España",
    "Portugal": "ténis de mesa Portugal",
    "Chine": "乒乓球 中国",   # "ping-pong" + "Chine" en chinois — Google Maps supporte
    "USA": "table tennis club USA",
    "Allemagne": "Tischtennis Verein Deutschland",
}

logger = logging.getLogger(__name__)


def build_search_url(club_nom: str, pays: str) -> str:
    contexte = COUNTRY_CONTEXT.get(pays, "")
    query = f'"{club_nom}" {contexte}'.strip()
    return GMAPS_SEARCH + quote_plus(query)


def lire_clubs(csv_path: Path) -> set:
    """Retourne l'ensemble des club_nom non vides trouvés dans le CSV."""
    clubs = set()
    if not csv_path.exists():
        logger.warning(f"Fichier introuvable : {csv_path}")
        return clubs
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if "club_nom" not in (reader.fieldnames or []):
            logger.error(f"Colonne 'club_nom' absente dans {csv_path}")
            return clubs
        for row in reader:
            club = (row.get("club_nom") or "").strip()
            if club:
                clubs.add(club)
    return clubs


def collecter_clubs() -> list:
    """Lit les deux CSV, déduplique par (club_nom uppercase, pays). Une URL
    par club unique."""
    sources = [
        (PLAYERS_FR_CSV, "France"),
        (PLAYERS_ES_CSV, "Espagne"),
        (PLAYERS_PT_CSV, "Portugal"),
        (PLAYERS_CN_CSV, "Chine"),
        (PLAYERS_US_CSV, "USA"),
        (PLAYERS_DE_CSV, "Allemagne"),
    ]
    seen = set()
    rows = []
    for csv_path, pays in sources:
        clubs = lire_clubs(csv_path)
        logger.info(f"{csv_path.name} : {len(clubs)} clubs uniques ({pays})")
        for club in sorted(clubs):
            key = (club.upper(), pays)
            if key in seen:
                continue
            seen.add(key)
            rows.append({
                "club_nom": club,
                "pays": pays,
                "url": build_search_url(club, pays),
            })
    return rows


def main():
    parser = argparse.ArgumentParser(
        description="Génère un CSV avec les URLs Google Maps des clubs.",
    )
    parser.add_argument("--debug", action="store_true", help="Logs verbeux")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    rows = collecter_clubs()
    if not rows:
        logger.error("Aucun club collecté.")
        sys.exit(1)

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDNAMES)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    par_pays = {}
    for r in rows:
        par_pays[r["pays"]] = par_pays.get(r["pays"], 0) + 1
    logger.info(f"OK : {len(rows)} clubs ecrits dans {OUTPUT_CSV}")
    logger.info(f"Repartition : {par_pays}")
    sys.exit(0)


if __name__ == "__main__":
    main()
