"""
Ajoute les nouveaux clubs France (extraits de players.csv) dans maps_clubs.csv.
Sans doublon. URL au format Google Maps + suffixe 'tennis de table France'.
lat/lon laisses vides — geocode_clubs.py s'en chargera.
"""

import csv
from pathlib import Path
from urllib.parse import quote_plus

ROOT = Path(__file__).parent
MAPS_CSV = ROOT / "maps_clubs.csv"
SOURCE = ROOT / "players.csv"
PAYS = "France"
SUFFIX = "tennis de table France"


def build_url(club: str) -> str:
    query = f'"{club}" {SUFFIX}'
    return f"https://www.google.com/maps/search/?api=1&query={quote_plus(query)}"


def main() -> None:
    # Existing
    with open(MAPS_CSV, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or ["club_nom", "pays", "url", "latitude", "longitude"]
        rows = list(reader)
    existing = {(r["club_nom"].strip(), r["pays"].strip()) for r in rows}
    print(f"maps_clubs.csv : {len(rows)} lignes existantes")

    # Source clubs
    with open(SOURCE, "r", encoding="utf-8-sig", newline="") as f:
        sources = list(csv.DictReader(f))
    src_clubs: set[str] = set()
    for r in sources:
        c = (r.get("club_nom") or "").strip()
        if c:
            src_clubs.add(c)
    print(f"players.csv : {len(src_clubs)} clubs uniques")

    added = 0
    for club in sorted(src_clubs):
        if (club, PAYS) in existing:
            continue
        rows.append({
            "club_nom": club,
            "pays": PAYS,
            "url": build_url(club),
            "latitude": "",
            "longitude": "",
        })
        existing.add((club, PAYS))
        added += 1

    with open(MAPS_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nAjoutees : {added} nouvelles lignes France -> total {len(rows)} clubs dans maps_clubs.csv")


if __name__ == "__main__":
    main()
