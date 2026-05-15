"""
Ajoute les clubs uniques d'Allemagne et USA dans maps_clubs.csv.
Source : playeurs_allemagne.csv + players_usa.csv (colonne club_nom).
Aucun doublon (verif contre maps_clubs.csv existant).
lat/lon sont laisses vides — geocode_clubs.py s'en chargera ensuite.
"""

import csv
from pathlib import Path
from urllib.parse import quote_plus

ROOT = Path(__file__).parent
MAPS_CSV = ROOT / "maps_clubs.csv"

SOURCES = [
    ("playeurs_allemagne.csv", "Allemagne", "Tischtennis Deutschland"),
    ("players_usa.csv",        "USA",       "table tennis USA"),
]


def build_url(club: str, suffix: str) -> str:
    """Reproduit le format observe : ...?api=1&query=%22<club>%22+<suffix>"""
    query = f'"{club}" {suffix}'
    return f"https://www.google.com/maps/search/?api=1&query={quote_plus(query)}"


def main() -> None:
    # Lecture des entrees existantes (cle de dedup = (club_nom, pays))
    existing: set[tuple[str, str]] = set()
    rows: list[dict] = []
    with open(MAPS_CSV, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or ["club_nom", "pays", "url", "latitude", "longitude"]
        for r in reader:
            rows.append(r)
            existing.add((r["club_nom"].strip(), r["pays"].strip()))
    print(f"maps_clubs.csv : {len(rows)} lignes existantes")

    added = 0
    for source_file, pays, suffix in SOURCES:
        src = ROOT / source_file
        clubs_seen: set[str] = set()
        with open(src, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for r in reader:
                club = (r.get("club_nom") or "").strip()
                if not club or club in clubs_seen:
                    continue
                clubs_seen.add(club)
                if (club, pays) in existing:
                    # Met a jour l'URL si elle ne suit pas le bon format (+, pas %20)
                    for r in rows:
                        if r["club_nom"].strip() == club and r["pays"].strip() == pays:
                            r["url"] = build_url(club, suffix)
                            break
                    continue
                rows.append({
                    "club_nom": club,
                    "pays": pays,
                    "url": build_url(club, suffix),
                    "latitude": "",
                    "longitude": "",
                })
                existing.add((club, pays))
                added += 1
        print(f"  {pays:<10} : {len(clubs_seen)} clubs uniques dans {source_file}")

    with open(MAPS_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nAjoutees : {added} nouvelles lignes -> total {len(rows)} clubs dans maps_clubs.csv")


if __name__ == "__main__":
    main()
