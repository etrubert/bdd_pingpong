"""
Ajoute les colonnes `sexo` et `categorie_age` aux 6 CSV joueurs.
- USA : enrichi automatiquement depuis classement_officiel (Women/Junior detectes)
- Autres : defaults M / senior (l'info n'a pas ete capturee au scraping initial)

Idempotent : si les colonnes existent deja, met juste a jour USA.
"""

import csv
from pathlib import Path

ROOT = Path(__file__).parent

FILES = [
    "players.csv",
    "playeurs_allemagne.csv",
    "players_usa.csv",
    "players_chine.csv",
    "players_spain.csv",
    "players_portugals.csv",
]


def infer_usa(classement: str) -> tuple[str, str]:
    """USA : classement_officiel contient explicitement Women / Junior."""
    c = classement or ""
    cl = c.lower()
    sexo = "F" if "women" in cl else "M"
    age = "junior" if "junior" in cl else "senior"
    return sexo, age


def process(path: Path) -> None:
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fields = list(reader.fieldnames or [])

    for col in ("sexo", "categorie_age"):
        if col not in fields:
            fields.append(col)

    is_usa = path.name == "players_usa.csv"
    f_count = j_count = 0
    for r in rows:
        if is_usa:
            sexo, age = infer_usa(r.get("classement_officiel", ""))
            r["sexo"] = sexo
            r["categorie_age"] = age
            if sexo == "F":
                f_count += 1
            if age == "junior":
                j_count += 1
        else:
            r.setdefault("sexo", "M")
            r.setdefault("categorie_age", "senior")
            # Si vide (ajout precedent), garder defaults
            if not r["sexo"]:
                r["sexo"] = "M"
            if not r["categorie_age"]:
                r["categorie_age"] = "senior"

    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    note = f" (F={f_count}, junior={j_count} via classement_officiel)" if is_usa else ""
    print(f"  {path.name:<30} : {len(rows)} lignes mises a jour{note}")


def main() -> None:
    for name in FILES:
        p = ROOT / name
        if p.exists():
            process(p)
        else:
            print(f"  {name:<30} : INTROUVABLE, skip")


if __name__ == "__main__":
    main()
