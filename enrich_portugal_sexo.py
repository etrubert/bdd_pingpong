"""
Enrichit la colonne `sexo` de players_portugals.csv.

Le scraper Portugal recupere Seniores Masculinos + Seniores Femininos
(cat=10 / cat=11) et capture sexo='M'/'F' mais drop le champ avant ecriture.
On re-fetch les 2 rankings et on update les lignes existantes par licence.
"""

import csv
from pathlib import Path

import pingpong_portugal as pt

ROOT = Path(__file__).parent
CSV_PATH = ROOT / "players_portugals.csv"


def main() -> None:
    print("Fetching FPTM rankings M + F...")
    scraper = pt.FPTMPlayersScraper()
    joueurs = scraper.collecter_tous()
    print(f"  -> {len(joueurs)} joueurs scrapes")

    # Index : essaye d'abord par licence (key 'licencia' ou 'licence')
    sexo_lookup = {}
    name_lookup = {}
    for j in joueurs:
        lic = (j.get("licencia") or j.get("licence") or "").strip()
        if lic:
            sexo_lookup[lic] = j["sexo"]
        # Fallback par nom+prenom
        nom = (j.get("apelido") or j.get("nom") or "").strip().upper()
        prenom = (j.get("nome") or j.get("prenom") or "").strip().lower()
        if nom and prenom:
            name_lookup[(nom, prenom)] = j["sexo"]

    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fields = list(reader.fieldnames or [])

    matched_by_lic = matched_by_name = 0
    for r in rows:
        lic = r.get("licence", "").strip()
        if lic and lic in sexo_lookup:
            r["sexo"] = sexo_lookup[lic]
            matched_by_lic += 1
            continue
        key = (r["nom"].strip().upper(), r["prenom"].strip().lower())
        if key in name_lookup:
            r["sexo"] = name_lookup[key]
            matched_by_name += 1

    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    f_count = sum(1 for r in rows if r.get("sexo") == "F")
    print(f"\n=== TERMINE ===")
    print(f"  Matched par licence : {matched_by_lic}")
    print(f"  Matched par nom+prenom : {matched_by_name}")
    print(f"  Total femmes dans CSV : {f_count}")


if __name__ == "__main__":
    main()
