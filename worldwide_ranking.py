"""
================================================================================
WORLDWIDE RANKING — Classement mondial unifie a partir des 6 bases nationales
================================================================================

Probleme : chaque federation a son propre systeme de notation (points FFTT,
QTTR, USATT, RFETM, FPTM, rang interne CTTA). Les valeurs brutes ne sont pas
comparables entre pays.

Solution : transformation affine par pays, calibree sur 2 ancres publiques :
    - ancre_top    : Elo mondial estime du #1 du pool national scrape
    - ancre_bottom : Elo mondial estime du dernier joueur du pool

Pour chaque joueur :
    rang_pool  = position dans le pool national (1 = top, N = bas)
    intra      = 1 - (rang_pool - 1) / (N - 1)        # in [0, 1]
    world_elo  = ancre_bottom + intra * (ancre_top - ancre_bottom)

Pourquoi le rang plutot que les points bruts ? Parce que les echelles
nationales sont incoherentes (USATT publie parfois des cumuls de saison
en plus du rating, FPTM idem). Le rang est invariant aux outliers et
universellement comparable, au prix d'un leger ecrasement du gradient.

Cas Chine : pas de points_elo publies → on utilise rang_national directement.

Bonus confiance : log10(1 + nombre_matchs) ajoute en tie-breaker (pas en
correction de rating, pour ne pas deformer la calibration).

Sortie :
    - data/worldwide_ranking.csv

Utilisation :
    python worldwide_ranking.py
    python worldwide_ranking.py --debug
    python worldwide_ranking.py --top 50      # affiche le top 50
"""

import argparse
import csv
import logging
import math
import sys
from pathlib import Path
from typing import Optional

# ==============================================================================
# CHEMINS
# ==============================================================================
ROOT_DIR = Path(__file__).parent.resolve()
DATA_DIR = ROOT_DIR / "data"
OUTPUT_CSV = DATA_DIR / "worldwide_ranking.csv"

# ==============================================================================
# SOURCES & ANCRES
# ==============================================================================
# Ancres calibrees sur :
#   - top : Elo international estime du joueur #1 actuel du pays (ITTF / Elo
#     ratings publics type ratingscentral.com et estimations consensus)
#   - bottom : niveau international moyen du dernier joueur de l'echantillon
#     national (joueur de club regional / fond de pro tier 2)
#
# Ces valeurs sont des estimations consensus et peuvent etre ajustees.
# La transformation reste lineaire : modifier ces 2 chiffres rescalibre
# automatiquement tout le pays.

SOURCES = {
    "France": {
        "csv": DATA_DIR / "players.csv",
        # Pool = echantillon par departement FFTT (top du pool = ~N1 ~2000 pts
        # FFTT, pas Lebrun qui n'est pas dans la base).
        "ancre_top": 2400,
        "ancre_bottom": 1100,
    },
    "Espagne": {
        "csv": DATA_DIR / "players_spain.csv",
        "ancre_top": 2400,      # Top RFETM = Robles-class
        "ancre_bottom": 1100,
    },
    "Portugal": {
        "csv": DATA_DIR / "players_portugals.csv",
        # Top FPTM = niveau European top 100. Marcos Freitas peut etre dans
        # le pool ou pas selon la categorie scrapee.
        "ancre_top": 2400,
        "ancre_bottom": 1100,
    },
    "Allemagne": {
        "csv": DATA_DIR / "playeurs_allemagne.csv",
        "ancre_top": 2700,      # Ovtcharov / Qiu Dang, top 15 mondial
        "ancre_bottom": 1700,   # andro-Rangliste = top 300 DE, niveau eleve
    },
    "USA": {
        "csv": DATA_DIR / "players_usa.csv",
        "ancre_top": 2500,      # Kanak Jha, top 100 mondial
        "ancre_bottom": 1500,
    },
    "Chine": {
        "csv": DATA_DIR / "players_chine.csv",
        "ancre_top": 2950,      # Wang Chuqin / Fan Zhendong, #1-#3 mondial
        "ancre_bottom": 2200,   # Pool 100% pro (CTTSL + 甲A) = niveau eleve
    },
}

# ==============================================================================
# LOGGING
# ==============================================================================
logger = logging.getLogger("worldwide_ranking")


def setup_logging(debug: bool):
    level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


# ==============================================================================
# IO
# ==============================================================================
def parse_float(value) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", ".").strip())
    except (ValueError, AttributeError):
        return None


def parse_int(value) -> Optional[int]:
    f = parse_float(value)
    return int(f) if f is not None else None


def load_country(pays: str, csv_path: Path) -> list:
    """Charge les joueurs d'un pays + champ pays + parsing numerique."""
    if not csv_path.exists():
        logger.warning(f"  {pays}: fichier introuvable {csv_path}")
        return []
    rows = []
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["pays"] = pays
            row["points_elo_num"] = parse_float(row.get("points_elo"))
            row["rang_national_num"] = parse_int(row.get("rang_national"))
            row["nombre_matchs_num"] = parse_int(row.get("nombre_matchs")) or 0
            rows.append(row)
    logger.info(f"  {pays:<10}: {len(rows)} joueurs charges depuis {csv_path.name}")
    return rows


# ==============================================================================
# CALCUL — coeur de l'algo
# ==============================================================================
def compute_intra_country_score(players: list, pays: str) -> None:
    """Ajoute 'intra_score' in [0, 1] sur chaque joueur du pays via rang dans le pool.

    Strategie unifiee, robuste aux outliers d'echelle :
      1. On calcule un rang_pool : position du joueur dans son pool national,
         classe par points_elo desc. Pour les joueurs sans points (cas Chine),
         on utilise rang_national (deja un index 1..N).
      2. intra_score = 1 - (rang_pool - 1) / (N - 1)
         → top du pool = 1.0, bas du pool = 0.0
    """
    n = len(players)
    if n == 0:
        return

    points_dispo = sum(1 for p in players if p["points_elo_num"] is not None)
    has_points = points_dispo >= max(2, n // 2)

    if has_points:
        # Tri par points_elo desc, joueurs sans points renvoyes en queue
        # via rang_national (sinon a la fin, ordre arbitraire).
        def sort_key(p):
            pts = p["points_elo_num"]
            if pts is not None:
                return (0, -pts)  # joueurs avec pts en premier, du plus haut au plus bas
            rg = p["rang_national_num"]
            return (1, rg if rg is not None else 999_999)
        players_sorted = sorted(players, key=sort_key)
        method = "points_elo_rank"
    else:
        # Cas Chine : pas de points → rang_national fait foi
        def sort_key(p):
            rg = p["rang_national_num"]
            return rg if rg is not None else 999_999
        players_sorted = sorted(players, key=sort_key)
        method = "rang_national_only"

    # Attribution de intra_score lineaire en rang dans le pool
    for i, p in enumerate(players_sorted, start=1):
        p["rang_pool"] = i
        p["intra_score"] = 1.0 - (i - 1) / max(1, n - 1)
        p["intra_method"] = method

    logger.info(
        f"  {pays:<10}: methode={method} "
        f"N={n} (points dispo: {points_dispo}/{n})"
    )


def project_to_world_elo(players: list, pays: str, ancre_top: float, ancre_bottom: float) -> None:
    """Applique la transformation affine intra_score -> world_elo."""
    spread = ancre_top - ancre_bottom
    for p in players:
        # Elo principal : transformation affine par pays
        world_elo = ancre_bottom + p["intra_score"] * spread
        p["world_elo"] = round(world_elo, 1)

        # Confiance : log du nombre de matchs (sert au tie-breaker)
        # log10(1+m) → 0 matchs=0, 10=1.04, 100=2.0, 1000=3.0
        confiance = math.log10(1 + p["nombre_matchs_num"])
        p["confiance"] = round(confiance, 3)

        # Tie-breaker : world_elo + epsilon * confiance
        # Un joueur a 100 matchs gagne ~0.2 pts d'epsilon vs un sans matchs.
        # Trop faible pour deformer l'ordre, juste pour casser les egalites.
        p["world_elo_ranked"] = round(world_elo + 0.1 * confiance, 4)

    logger.info(
        f"  {pays:<10}: projection [{ancre_bottom}, {ancre_top}] "
        f"-> {len(players)} joueurs"
    )


# ==============================================================================
# PIPELINE
# ==============================================================================
def run_pipeline() -> list:
    logger.info("=" * 70)
    logger.info("CHARGEMENT DES BASES NATIONALES")
    logger.info("=" * 70)
    all_players = []
    for pays, conf in SOURCES.items():
        players = load_country(pays, conf["csv"])
        all_players.extend(players)
        # Stocker la liste par pays pour le calcul intra
        conf["_players"] = players

    logger.info("=" * 70)
    logger.info("CALCUL DES SCORES INTRA-PAYS (normalisation locale)")
    logger.info("=" * 70)
    for pays, conf in SOURCES.items():
        compute_intra_country_score(conf["_players"], pays)

    logger.info("=" * 70)
    logger.info("PROJECTION VERS L'ELO MONDIAL UNIFIE")
    logger.info("=" * 70)
    for pays, conf in SOURCES.items():
        project_to_world_elo(
            conf["_players"], pays, conf["ancre_top"], conf["ancre_bottom"]
        )

    # Tri global descendant + attribution rang mondial
    all_players.sort(key=lambda p: p["world_elo_ranked"], reverse=True)
    for i, p in enumerate(all_players, start=1):
        p["rang_mondial"] = i

    return all_players


# ==============================================================================
# OUTPUT
# ==============================================================================
OUTPUT_FIELDS = [
    "rang_mondial",
    "world_elo",
    "pays",
    "nom",
    "prenom",
    "club_nom",
    "points_elo",         # raw du pays
    "rang_national",
    "classement_officiel",
    "nombre_matchs",
    "intra_score",
    "intra_method",
    "confiance",
    "licence",
]


def write_output(players: list, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for p in players:
            writer.writerow({k: p.get(k, "") for k in OUTPUT_FIELDS})
    logger.info(f"OK : {len(players)} joueurs ecrits dans {path}")


def print_top(players: list, n: int) -> None:
    print()
    print(f"{'#':>4} {'Pays':<10} {'World Elo':>10} {'Nom':<25} {'Prenom':<20} {'Pts brut':>10}")
    print("-" * 90)
    for p in players[:n]:
        pts_brut = p.get("points_elo") or "-"
        print(
            f"{p['rang_mondial']:>4} "
            f"{p['pays']:<10} "
            f"{p['world_elo']:>10} "
            f"{(p.get('nom') or '')[:25]:<25} "
            f"{(p.get('prenom') or '')[:20]:<20} "
            f"{str(pts_brut):>10}"
        )


# ==============================================================================
# MAIN
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Classement mondial unifie cross-pays.",
    )
    parser.add_argument("--debug", action="store_true", help="Logs verbeux")
    parser.add_argument("--top", type=int, default=20, help="Nombre de joueurs a afficher (defaut 20)")
    args = parser.parse_args()

    setup_logging(args.debug)
    players = run_pipeline()
    write_output(players, OUTPUT_CSV)
    print_top(players, args.top)

    # Statistiques par pays
    print()
    print("Repartition dans le top 100 mondial :")
    top100 = players[:100]
    repart = {}
    for p in top100:
        repart[p["pays"]] = repart.get(p["pays"], 0) + 1
    for pays, n in sorted(repart.items(), key=lambda x: -x[1]):
        print(f"  {pays:<10} {n:>3}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
