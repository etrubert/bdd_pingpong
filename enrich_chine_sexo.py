"""
Enrichit la colonne `sexo` de players_chine.csv.

Les rosters CTTSL/JIA_A sont hardcodes dans pingpong_chine.py :
les equipes femmes sont entre le commentaire "# Femmes" et la fin du bloc.
On parse le source pour identifier les noms chinois feminins, puis on
matche contre la pinyin connue pour tagger les lignes du CSV.
"""

import csv
import re
from pathlib import Path

import pingpong_chine as cn

ROOT = Path(__file__).parent
CSV_PATH = ROOT / "players_chine.csv"


def women_chinese_names() -> set[str]:
    """Parse pingpong_chine.py pour extraire les joueuses des sections '# Femmes'."""
    text = (ROOT / "pingpong_chine.py").read_text()
    women_keys = []
    in_women = False
    for line in text.splitlines():
        s = line.strip()
        if s == "# Femmes":
            in_women = True
            continue
        if in_women:
            if s.startswith("}") or s.startswith("# "):
                in_women = False
                continue
            m = re.match(r'"([^"]+)":\s*\[([^\]]+)\]', s)
            if m:
                women_keys.append(m.group(1))

    names = set()
    for roster in (cn.CTTSL_ROSTER, cn.JIA_A_ROSTER):
        for club, players in roster.items():
            if club in women_keys:
                names.update(players)
    return names


def main() -> None:
    women_cn = women_chinese_names()
    print(f"Joueuses chinoises identifiees dans le source : {len(women_cn)}")

    # Construit lookup (nom_latin, prenom_latin) -> sexo en passant par to_nom_prenom
    lookup = {}
    for nom_cn in women_cn:
        nom, prenom = cn.to_nom_prenom(nom_cn)
        # cle case-insensitive
        lookup[(nom.strip().upper(), prenom.strip().lower())] = "F"

    # Charge CSV
    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fields = list(reader.fieldnames or [])

    # Update sexo
    updated = 0
    for r in rows:
        key = (r["nom"].strip().upper(), r["prenom"].strip().lower())
        if key in lookup:
            r["sexo"] = "F"
            updated += 1

    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    f_total = sum(1 for r in rows if r.get("sexo") == "F")
    print(f"\n=== TERMINE ===")
    print(f"  Lignes mises a jour : {updated}")
    print(f"  Total femmes dans CSV : {f_total}")


if __name__ == "__main__":
    main()
