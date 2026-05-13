"""
================================================================================
PINGPONG FRANCE 2 — Scraper FFTT cible joueurs PRO (Pro A/B + Nationale 1)
================================================================================

Probleme du scraper principal (pingpong_france.py) : son sampling par
departement + quota fixe a 100 'avances' fait qu'il atteint le quota avec
des N2 lambda BIEN AVANT d'arriver aux clubs Pro A. Resultat : aucun pro
francais (Lebrun, Gauzy, Lebesson...) dans players.csv.

Ce script corrige ca avec une strategie inverse :
  1. Scanne les departements heberge ant des clubs Pro A/B/N1
  2. Recupere TOUS les licencies de tous les clubs de ces departements
  3. Filtre uniquement ceux >= seuil de points (defaut 2000 = N1+)
  4. Deduplique par licence + tri par points decroissants

Sortie :
  - data/players_france2.csv (meme schema que data/players.csv)

Utilisation :
  python pingpong_france2.py                    # seuil 2000, deps PRO connus
  python pingpong_france2.py --seuil 2500       # uniquement les top (NA1+)
  python pingpong_france2.py --all-deps         # tous les 95 deps (long, ~2h)
  python pingpong_france2.py --debug
"""

import argparse
import csv
import logging
import sys
from pathlib import Path

# Reutilisation de la machinerie du scraper principal
from pingpong_france import (
    FFTTPlayersScraper,
    TOUS_DEPARTEMENTS,
    classement_officiel,
    categoriser_niveau,
    write_csv,
)


# ==============================================================================
# CHEMINS & CONFIG
# ==============================================================================
ROOT_DIR = Path(__file__).parent.resolve()
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_CSV = DATA_DIR / "players_france2.csv"

# Departements connus pour heberger des clubs Pro A/B/N1
# (Pro A M/F + Pro B + clubs N1 historiques)
DEPARTEMENTS_PRO = [
    "95",  # Pontoise-Cergy (Pro A M) - Aruna, Pitchford
    "56",  # Hennebont (Pro A M)
    "34",  # Montpellier TT (Pro A M) - Freres Lebrun
    "92",  # Issy, Levallois (Pro A M/F)
    "93",  # Saint-Denis (Pro A M/F)
    "49",  # Angers, La Romagne (Pro A M)
    "76",  # Grand-Quevilly (Pro A F)
    "59",  # Lys-lez-Lannoy (Pro A F)
    "02",  # Saint-Quentin (Pro A F)
    "40",  # Saint-Pierre-du-Mont (Pro A F)
    "32",  # Mirande (Pro A F)
    "68",  # Mulhouse (Pro A F)
    "88",  # Etival Clairefontaine (Pro A F)
    "37",  # Joue-les-Tours
    "61",  # Argentan
    "75",  # Paris (PSG TT, clubs elite)
    "78",  # Yvelines
    "94",  # Val-de-Marne
    "67",  # Strasbourg
    "44",  # Nantes
    "33",  # Bordeaux
    "31",  # Toulouse
    "69",  # Lyon
    "13",  # Marseille
    "06",  # Nice
    "38",  # Grenoble
    "35",  # Rennes
    "29",  # Brest
]

# Seuil de points FFTT pour considerer un joueur 'pro/elite'
# 2000 = Nationale 1, 2200 = NA1+, 2500 = Numerotes (top mondial FR)
SEUIL_PRO_DEFAUT = 2000

FIELDNAMES = [
    "licence", "nom", "prenom", "ville", "club_nom", "club_ville",
    "points_elo", "rang_national", "rang_ligue", "rang_comite",
    "classement_officiel", "niveau_categorie",
    "nombre_matchs", "victoires", "defaites",
]

logger = logging.getLogger("pingpong_france2")


# ==============================================================================
# LOGIQUE PRINCIPALE
# ==============================================================================
def scraper_pros(scraper: FFTTPlayersScraper, departements: list, seuil: int) -> list:
    """Scanne les departements et retient tous les joueurs >= seuil pts.

    Deduplique par licence (un joueur peut etre licencie dans plusieurs clubs
    sur la saison, mais une seule licence active).
    """
    pros = {}  # licence -> record complet

    for i, dep in enumerate(departements, start=1):
        logger.info(f"=== Dep {dep} ({i}/{len(departements)}) ===")
        clubs = scraper.lister_clubs_departement(dep)
        logger.info(f"  {len(clubs)} clubs trouves")

        for club in clubs:
            joueurs = scraper.lister_joueurs_club(club["numero"])
            kept_in_club = 0
            for j in joueurs:
                pts = j.get("points_elo")
                if pts is None or pts < seuil:
                    continue
                if j["licence"] in pros:
                    continue
                # Recuperation rangs + stats (couteux : 2 requetes par joueur)
                rangs = scraper.detail_rangs(j["licence"])
                stats = scraper.detail_stats(j["licence"])
                kept_in_club += 1
                logger.info(
                    f"  +{len(pros)+1:>3} | {j['nom']:<22} {j['prenom']:<15} "
                    f"pts={pts:<6.0f} club={club['nom'][:30]}"
                )
                pros[j["licence"]] = {
                    "licence": j["licence"],
                    "nom": j["nom"],
                    "prenom": j["prenom"],
                    "ville": club["ville"],
                    "club_nom": club["nom"],
                    "club_ville": club["ville"],
                    "points_elo": pts,
                    "rang_national": rangs.get("rang_national"),
                    "rang_ligue": rangs.get("rang_ligue"),
                    "rang_comite": rangs.get("rang_comite"),
                    "classement_officiel": classement_officiel(pts),
                    "niveau_categorie": categoriser_niveau(pts),
                    "nombre_matchs": stats.get("nombre_matchs"),
                    "victoires": stats.get("victoires"),
                    "defaites": stats.get("defaites"),
                }
            if kept_in_club:
                logger.debug(f"    {club['nom']:<40} {kept_in_club} joueur(s) retenu(s)")

    # Tri final par points desc
    rows = sorted(pros.values(), key=lambda r: -r["points_elo"])
    return rows


# ==============================================================================
# MAIN
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Scrape les joueurs PRO francais (Pro A/B + Nationale 1).",
    )
    parser.add_argument(
        "--seuil", type=int, default=SEUIL_PRO_DEFAUT,
        help=f"Seuil de points minimum (defaut {SEUIL_PRO_DEFAUT}=N1)",
    )
    parser.add_argument(
        "--all-deps", action="store_true",
        help="Scanner tous les 95 departements (long, ~2h)",
    )
    parser.add_argument(
        "--max-clubs-per-dep", type=int, default=0,
        help="Limiter le nombre de clubs scannes par dep (0=illimite, pour tests)",
    )
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    deps = TOUS_DEPARTEMENTS if args.all_deps else DEPARTEMENTS_PRO
    logger.info("=" * 70)
    logger.info(f"CIBLE : {len(deps)} departements | seuil={args.seuil} pts FFTT")
    logger.info("=" * 70)

    scraper = FFTTPlayersScraper()
    rows = scraper_pros(scraper, deps, args.seuil)

    if not rows:
        logger.warning("Aucun joueur retenu. Verifie le seuil ou les departements.")
        sys.exit(1)

    count = write_csv(OUTPUT_CSV, rows, FIELDNAMES)
    logger.info("=" * 70)
    logger.info(f"OK : {count} joueurs >= {args.seuil} pts ecrits dans {OUTPUT_CSV}")
    logger.info("=" * 70)
    logger.info("Top 10 :")
    for i, r in enumerate(rows[:10], 1):
        logger.info(
            f"  {i:>2}. {r['nom']:<22} {r['prenom']:<15} "
            f"pts={r['points_elo']:<6.0f} {r['classement_officiel']}"
        )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
