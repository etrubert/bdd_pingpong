"""
Enrichit la colonne `sexo` de playeurs_allemagne.csv.

Le scraper original captait deja le genre (aria-label='maennlich/weiblich')
mais l'avait drop avant l'ecriture. Ici on re-scrape la meme source
(andro-Rangliste top 300) et on update les lignes existantes par (nom, prenom).

Pas de scraping juniors pour l'instant (URL distincte a investiguer
cote myTischtennis.de — probablement /rankings/jugend ou similaire).
"""

import csv
from pathlib import Path

import pingpong_allemagne as de

ROOT = Path(__file__).parent
CSV_PATH = ROOT / "playeurs_allemagne.csv"


def main() -> None:
    # 1. Re-scrape la source pour recuperer (nom, prenom, sexo)
    print("Re-scraping andro-Rangliste top 300 pour recuperer le genre...")
    scraper = de.DTTBPlayersScraper()
    joueurs = scraper.collecter_top300()
    print(f"  -> {len(joueurs)} joueurs scrapes")

    # Index par (nom_upper, prenom_lower) -> sexo
    sexo_lookup = {}
    for j in joueurs:
        key = (j["nom"].strip().upper(), j["prenom"].strip().lower())
        sexo_lookup[key] = j["sexo"]

    # 2. Charger le CSV existant
    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fields = list(reader.fieldnames or [])

    # 3. Updater sexo pour chaque ligne dont (nom, prenom) matche
    matched = unmatched = 0
    for r in rows:
        key = (r["nom"].strip().upper(), r["prenom"].strip().lower())
        if key in sexo_lookup:
            r["sexo"] = sexo_lookup[key]
            matched += 1
        else:
            unmatched += 1

    # 4. Reecrire
    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    f_count = sum(1 for r in rows if r.get("sexo") == "F")
    print(f"\n=== TERMINE ===")
    print(f"  Matched : {matched} / {len(rows)} (non matched : {unmatched})")
    print(f"  Femmes detectees : {f_count}")


if __name__ == "__main__":
    main()
