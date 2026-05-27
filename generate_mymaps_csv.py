"""
Genere un CSV pret a importer dans Google My Maps.
Format attendu par My Maps : 2 colonnes (Nom + Adresse).
Google geocode automatiquement les adresses a l'import.
"""

import csv
from pathlib import Path

ROOT = Path(__file__).parent
INPUT = ROOT / "Strav_pingpang" / "public" / "data" / "maps_clubs.csv"
OUTPUT = ROOT / "paris_clubs_mymaps.csv"


def main():
    rows_out = []
    with open(INPUT, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["pays"] != "France":
                continue
            club = row["club_nom"].strip()
            # Suffixe pour aider le geocoding Paris
            adresse = f"{club} tennis de table Paris France"
            rows_out.append({"Nom": club, "Adresse": adresse})

    with open(OUTPUT, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["Nom", "Adresse"])
        writer.writeheader()
        writer.writerows(rows_out)

    print(f"OK : {len(rows_out)} clubs ecrits dans {OUTPUT.name}")
    for r in rows_out[:5]:
        print(f"  - {r['Nom']}")
    if len(rows_out) > 5:
        print(f"  ... et {len(rows_out) - 5} autres")


if __name__ == "__main__":
    main()
