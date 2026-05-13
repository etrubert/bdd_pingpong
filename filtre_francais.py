"""
================================================================================
FILTRE FRANCAIS — Enrichit players_france2.csv avec la nationalite
                   et produit une version 100% francaise.
================================================================================

Pour chaque joueur du CSV :
  1. Fetch sa page PingPocket /licencies/{lic}
  2. Extrait "Nationalite" du HTML
  3. Garde uniquement les "francaise"

Entree  : data/players_france2.csv
Sortie  : data/players_france2.csv             (enrichi avec colonne nationalite)
          data/players_france2_francais.csv    (filtre francais uniquement)
"""

import csv
import logging
import re
import sys
from pathlib import Path

from pingpong_france import HttpClient, PINGPOCKET_BASE, PINGPOCKET_AJAX_HEADERS


ROOT_DIR = Path(__file__).parent.resolve()
DATA_DIR = ROOT_DIR / "data"
INPUT_CSV = DATA_DIR / "players_france2.csv"
OUTPUT_CSV_FULL = DATA_DIR / "players_france2.csv"          # ecrasement avec nationalite ajoutee
OUTPUT_CSV_FR = DATA_DIR / "players_france2_francais.csv"   # uniquement francais

NATIONALITE_RE = re.compile(
    r"Nationalit[eé][^<]*<[^>]+>([^<]+)",
    re.IGNORECASE,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("filtre_francais")


def get_nationalite(http: HttpClient, licence: str) -> str:
    """Retourne la nationalite (ex 'francaise', 'europeenne', 'autre') ou ''."""
    if not licence:
        return ""
    try:
        url = f"{PINGPOCKET_BASE}/app/fftt/licencies/{licence}"
        resp = http.get(url, headers=PINGPOCKET_AJAX_HEADERS)
    except Exception as e:
        logger.warning(f"  lic={licence}: erreur HTTP {e}")
        return ""
    m = NATIONALITE_RE.search(resp.text)
    if not m:
        return ""
    return m.group(1).strip().lower()


def is_francais(nat: str) -> bool:
    # 'francaise', 'française', 'francais', 'française'... — gere les accents
    n = (nat or "").lower()
    return n.startswith("franc") or n.startswith("franç")


def main():
    if not INPUT_CSV.exists():
        logger.error(f"Fichier introuvable : {INPUT_CSV}")
        sys.exit(1)

    with open(INPUT_CSV, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        original_fields = reader.fieldnames or []

    logger.info(f"{len(rows)} joueurs a verifier...")
    # Delai plus long pour eviter les 429
    http = HttpClient(delay_sec=3.0)

    for i, row in enumerate(rows, 1):
        # Skip si nationalite deja remplie (idempotence)
        nat = row.get("nationalite") or ""
        if not nat:
            nat = get_nationalite(http, row.get("licence", ""))
            row["nationalite"] = nat
        marker = "FR" if is_francais(nat) else "  "
        logger.info(
            f"  [{i:>3}/{len(rows)}] {marker} {row.get('nom', ''):<22} "
            f"{row.get('prenom', ''):<15} pts={row.get('points_elo', ''):<6} "
            f"nat={nat or '(inconnu)'}"
        )

    # Construire les nouvelles listes de champs
    new_fields = list(original_fields)
    if "nationalite" not in new_fields:
        new_fields.append("nationalite")

    # Ecriture du CSV enrichi (toutes nationalites confondues)
    with open(OUTPUT_CSV_FULL, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=new_fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    logger.info(f"Enrichi : {len(rows)} joueurs -> {OUTPUT_CSV_FULL}")

    # Ecriture du CSV filtre francais
    francais = [r for r in rows if is_francais(r.get("nationalite", ""))]
    francais.sort(key=lambda r: -float(r.get("points_elo", 0)))
    with open(OUTPUT_CSV_FR, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=new_fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(francais)
    logger.info(f"Francais : {len(francais)} joueurs -> {OUTPUT_CSV_FR}")

    # Recap
    print()
    print(f"Top 15 Francais :")
    for i, r in enumerate(francais[:15], 1):
        print(
            f"  {i:>2}. {r.get('points_elo', ''):>6} pts  "
            f"{r.get('nom', ''):<22} {r.get('prenom', ''):<15} "
            f"{r.get('club_nom', '')[:35]}"
        )

    # Distribution nationalites
    nats = {}
    for r in rows:
        n = r.get("nationalite") or "(inconnu)"
        nats[n] = nats.get(n, 0) + 1
    print()
    print("Distribution nationalites :")
    for n, c in sorted(nats.items(), key=lambda x: -x[1]):
        print(f"  {n:<20} {c}")


if __name__ == "__main__":
    main()
