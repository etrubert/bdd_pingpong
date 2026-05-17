"""
Corrige les coordonnees aberrantes / dupliquees des clubs France dans maps_clubs.csv.
Chaque club est repositionne dans son arrondissement reel, avec un petit jitter
pour eviter les superpositions de markers.
"""

import csv
import random
from pathlib import Path

CSV_PATH = Path(__file__).parent / "maps_clubs.csv"

# Coordonnees approximatives du centre de chaque arrondissement de Paris
ARR_COORDS = {
    1: (48.8634, 2.3360),
    2: (48.8678, 2.3424),
    3: (48.8630, 2.3603),
    4: (48.8539, 2.3577),
    5: (48.8448, 2.3470),
    6: (48.8495, 2.3331),
    7: (48.8566, 2.3194),
    8: (48.8720, 2.3140),
    9: (48.8765, 2.3370),
    10: (48.8760, 2.3601),
    11: (48.8594, 2.3801),
    12: (48.8400, 2.3880),
    13: (48.8280, 2.3620),
    14: (48.8290, 2.3270),
    15: (48.8410, 2.2990),
    16: (48.8600, 2.2620),
    17: (48.8876, 2.3070),
    18: (48.8920, 2.3480),
    19: (48.8860, 2.3851),
    20: (48.8640, 2.4010),
}

# Mapping club -> arrondissement reel
FR_CORRECTIONS = {
    "A S VIETNAM": 13,                          # association vietnamienne, Chinatown 13e
    "ALLIANZ ASC": 16,                          # Allianz France, Paris 16e
    "AP 17": 17,                                # Avenir Pongiste 17e
    "APSAP PARIS": 13,                          # association du personnel AP-HP / Pitie-Salpetriere 13e
    "AS BANQUE DE FRANCE": 1,                   # 39 rue Croix des Petits Champs, 1er
    "AS FFTT": 13,                              # siege FFTT 75013
    "AS PONGISTES 8eme": 8,
    "AS RUSSE": 16,                             # rue Daru / Cathedrale russe 16e
    "ASC BNP PARIBAS": 9,                       # 16 Bd des Italiens, 9e
    "ASORTF": 16,                               # ex-ORTF / Maison Radio France 16e
    "ASPTT GRAND PARIS": 12,                    # ASPTT Paris, 12e
    "ASSOC.TENNIS DE TABLE PARIS XVe": 15,
    "Assoc. Patronage Sainte Melanie": 13,
    "CPS 10eme": 10,
    "CSMF PARIS TT": 12,                        # CSM Finances Bercy 12e
    "EP 15": 15,                                # Esperance 15e
    "ESPERANCE REUILLY": 12,                    # Reuilly 12e
    "J A M PARIS 14e": 14,
    "JUMP": 11,
    "PARIS 13 TENNIS DE TABLE": 13,
    "PARIS IX ATT": 9,
    "PING PARIS 14": 14,
    "SPORTING PARIS 20 TT": 20,
}


def main():
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fields = reader.fieldnames or []

    random.seed(42)  # jitter reproductible
    fixed = 0
    for row in rows:
        if row.get("pays") != "France":
            continue
        club = row.get("club_nom", "").strip()
        if club not in FR_CORRECTIONS:
            continue
        arr = FR_CORRECTIONS[club]
        base_lat, base_lng = ARR_COORDS[arr]
        # Jitter ±0.004 deg (~±300m) pour eviter les superpositions
        lat = base_lat + (random.random() - 0.5) * 0.008
        lng = base_lng + (random.random() - 0.5) * 0.008
        old = (row.get("latitude"), row.get("longitude"))
        row["latitude"] = f"{lat:.6f}"
        row["longitude"] = f"{lng:.6f}"
        fixed += 1
        print(f"  {club:<42} -> Paris {arr:>2}e  ({lat:.4f}, {lng:.4f})")

    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"\n{fixed} clubs FR repositionnes dans {CSV_PATH}")


if __name__ == "__main__":
    main()
