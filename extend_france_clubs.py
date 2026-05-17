"""
Etend players.csv (France) avec ~200 joueurs hors Paris.
Reutilise les classes scraper de pingpong_france.py.

Strategie :
  - Skip dpt 75 (deja couvert par le scraping initial)
  - Max ~17 joueurs / departement -> ~200 joueurs sur 12 dpts hors Paris
  - Rate limit 2.5s pour eviter 429
  - Append au players.csv racine (pas data/players.csv)
  - sexo='M' / categorie_age='senior' par defaut (PingPocket n'expose pas l'info en HTML statique)
"""

import csv
import sys
import time
from pathlib import Path

import pingpong_france as pf

ROOT = Path(__file__).parent
PLAYERS_CSV = ROOT / "players.csv"
TARGET_COUNT = 200
PER_DEPT_MAX = 17
SKIP_DEPTS = {"75"}  # Paris deja couvert

# Departements prioritaires hors Paris (gros effectifs)
DEPTS_TO_SCAN = [d for d in pf.DEPARTEMENTS_PRIORITAIRES if d not in SKIP_DEPTS]


def existing_licences() -> set[str]:
    """Recharge les licences deja presentes pour eviter doublons."""
    if not PLAYERS_CSV.exists():
        return set()
    with open(PLAYERS_CSV, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return {r["licence"].strip() for r in reader if r.get("licence")}


def read_fields() -> list[str]:
    """Recupere l'ordre exact des colonnes du CSV existant."""
    with open(PLAYERS_CSV, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader.fieldnames or [])


def main() -> None:
    seen_licences = existing_licences()
    fields = read_fields()
    print(f"Deja en base : {len(seen_licences)} licences. Cible : +{TARGET_COUNT}")
    print(f"Departements a scanner : {DEPTS_TO_SCAN}")

    # Rate limit 2.5s pour eviter HTTP 429
    http = pf.HttpClient(delay_sec=2.5)
    scraper = pf.FFTTPlayersScraper(http=http)
    collected: list[dict] = []

    for dep in DEPTS_TO_SCAN:
        if len(collected) >= TARGET_COUNT:
            break
        print(f"\n=== Departement {dep} ===")
        clubs = scraper.lister_clubs_departement(dep)
        print(f"  {len(clubs)} clubs trouves")
        dep_count = 0

        for club in clubs:
            if len(collected) >= TARGET_COUNT or dep_count >= PER_DEPT_MAX:
                break
            joueurs = scraper.lister_joueurs_club(club["numero"])
            for j in joueurs:
                if len(collected) >= TARGET_COUNT or dep_count >= PER_DEPT_MAX:
                    break
                if j["licence"] in seen_licences:
                    continue
                points = j.get("points_elo")
                if points is None:
                    continue
                niveau = pf.categoriser_niveau(points)
                rangs = scraper.detail_rangs(j["licence"])
                stats = scraper.detail_stats(j["licence"])
                record = {
                    "licence": j["licence"],
                    "nom": j["nom"],
                    "prenom": j["prenom"],
                    "ville": club["ville"],
                    "club_nom": club["nom"],
                    "club_ville": club["ville"],
                    "points_elo": points,
                    "rang_national": rangs.get("rang_national"),
                    "rang_ligue": rangs.get("rang_ligue"),
                    "rang_comite": rangs.get("rang_comite"),
                    "classement_officiel": pf.classement_officiel(points),
                    "niveau_categorie": niveau,
                    "nombre_matchs": stats.get("nombre_matchs"),
                    "victoires": stats.get("victoires"),
                    "defaites": stats.get("defaites"),
                    "sexo": "M",
                    "categorie_age": "senior",
                }
                collected.append(record)
                seen_licences.add(j["licence"])
                dep_count += 1
                print(f"  [{len(collected):>3}/{TARGET_COUNT}] dep={dep} club={club['nom'][:25]:<25} "
                      f"{j['nom']:<18} {j['prenom']:<13} pts={points}")

                # Sauvegarde intermediaire toutes les 25 lignes
                if len(collected) % 25 == 0:
                    _append(collected, fields)
                    collected.clear()
                    print(f"  ... sauvegarde intermediaire (+25)\n")

    if collected:
        _append(collected, fields)
    print(f"\n=== TERMINE ===")
    print(f"  Total ajoute : voir players.csv (compter avant/apres)")


def _append(records: list[dict], fields: list[str]) -> None:
    with open(PLAYERS_CSV, "a", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writerows(records)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrompu", file=sys.stderr)
        sys.exit(130)
