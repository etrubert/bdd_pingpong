"""
Enrichit la colonne `sexo` de players_spain.csv.

Le scraper original recupere les rankings M et F separement (param ?sexo=F)
mais drop le champ avant l'ecriture. On re-fetch les 2 rankings et on update
les lignes existantes par licencia (id unique de la RFETM).
"""

import csv
from pathlib import Path

import pingpong_espana as es

ROOT = Path(__file__).parent
CSV_PATH = ROOT / "players_spain.csv"


def main() -> None:
    print("Fetching RFETM rankings M + F...")
    scraper = es.RFETMPlayersScraper()
    joueurs = scraper.collecter_tous()
    print(f"  -> {len(joueurs)} joueurs scrapes")

    sexo_by_lic = {}
    for j in joueurs:
        lic = j.get("licencia", "").strip()
        if lic:
            sexo_by_lic[lic] = j["sexo"]

    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fields = list(reader.fieldnames or [])

    matched = 0
    for r in rows:
        lic = r.get("licence", "").strip()
        if lic in sexo_by_lic:
            r["sexo"] = sexo_by_lic[lic]
            matched += 1

    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    f_count = sum(1 for r in rows if r.get("sexo") == "F")
    print(f"\n=== TERMINE ===")
    print(f"  Matched : {matched}/{len(rows)}")
    print(f"  Total femmes dans CSV : {f_count}")


if __name__ == "__main__":
    main()
