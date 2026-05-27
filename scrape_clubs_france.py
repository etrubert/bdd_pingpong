"""
================================================================================
SCRAPE CLUBS FRANCE — Récupère TOUS les clubs FFTT de France
================================================================================

Source : https://carte.fftt.com/ (carte officielle FFTT, ~3200 clubs affiliés)

Stratégie :
  1) Pour chaque département métropolitain 01–95 → POST sur ajax_get_data
     avec structures_department=XX&search_range=0 (renvoie tous les clubs du dépt)
  2) Pour la Corse (2A/2B) et les DOM-TOM (971–976) → fallback par code postal
     (l'API n'accepte pas 2A/2B comme code département)
  3) Pour chaque club, on extrait depuis clubsCoords : nom, type (libre/corpo),
     numero, lat/lon, adresse, ville, CP
  4) Fusion avec maps_clubs.csv existant : on PRÉSERVE tous les clubs déjà
     présents (dedup par nom uppercase) et on AJOUTE les nouveaux
  5) Pour les clubs FFTT sans coordonnées GPS, fallback géocodage Nominatim
     (OpenStreetMap) avec adresse complète. Respecte le rate-limit OSM (1 req/s).

Sortie (format inchangé pour l'app) :
  - maps_clubs.csv (racine)
  - Strav_pingpang/public/data/maps_clubs.csv

Colonnes : club_nom, pays, url, latitude, longitude

Usage :
  python3 scrape_clubs_france.py            # mode complet
  python3 scrape_clubs_france.py --debug    # logs verbeux
  python3 scrape_clubs_france.py --no-geocode  # saute Nominatim (rapide)
  python3 scrape_clubs_france.py --dept 75  # un seul département (test)
================================================================================
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).parent
EXISTING_CSV = ROOT_DIR / "maps_clubs.csv"
PUBLIC_CSV = ROOT_DIR / "Strav_pingpang" / "public" / "data" / "maps_clubs.csv"

FIELDNAMES = ["club_nom", "pays", "url", "latitude", "longitude"]

FFTT_ENDPOINT = "https://carte.fftt.com/ajax_get_data"
GMAPS_SEARCH = "https://www.google.com/maps/search/?api=1&query="
NOMINATIM = "https://nominatim.openstreetmap.org/search"

USER_AGENT = "bdd_pingpong/1.0 (clubs FFTT scraper, contact: elyot3112@gmail.com)"

# Codes postaux représentatifs pour Corse + DOM-TOM (l'API filtre par dépt
# ne fonctionne pas pour 2A/2B/971-976, on passe par CP + grand rayon)
ZIPCODE_FALLBACK = {
    "Corse-du-Sud (2A)": ["20000", "20100", "20137", "20166"],
    "Haute-Corse (2B)": ["20200", "20220", "20250", "20290", "20600"],
    "Guadeloupe (971)": ["97110", "97120", "97130", "97140", "97160", "97170", "97180", "97190"],
    "Martinique (972)": ["97200", "97220", "97231", "97232", "97240", "97260", "97290"],
    "Guyane (973)": ["97300", "97310", "97320", "97350", "97360"],
    "Réunion (974)": ["97400", "97410", "97420", "97430", "97440", "97450", "97460", "97470", "97480", "97490"],
    "Mayotte (976)": ["97600", "97610", "97620", "97630", "97640", "97650", "97660", "97670", "97680"],
}

logger = logging.getLogger(__name__)


# ============================================================================
# HTTP helpers
# ============================================================================

def post_fftt(params: dict) -> dict:
    """POST sur carte.fftt.com/ajax_get_data. Retourne le JSON parsé."""
    body = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(
        FFTT_ENDPOINT,
        data=body,
        headers={
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def geocode_nominatim(query: str) -> tuple | None:
    """Géocode une adresse via Nominatim. Retourne (lat, lon) ou None."""
    params = urllib.parse.urlencode({
        "q": query,
        "format": "json",
        "countrycodes": "fr",
        "limit": 1,
    })
    url = f"{NOMINATIM}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            results = json.loads(r.read())
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        logger.debug(f"Nominatim error pour '{query}': {e}")
    return None


# ============================================================================
# FFTT scraping
# ============================================================================

def fetch_dept(code: str) -> dict:
    """Récupère clubsCoords pour un département. Format : {club_nom: [halls...]}"""
    try:
        data = post_fftt({"structures_department": code, "search_range": 0})
        cc = data.get("clubsCoords", {})
        return cc if isinstance(cc, dict) else {}
    except Exception as e:
        logger.error(f"  dept {code} : erreur {e}")
        return {}


def fetch_zipcode(cp: str, search_range: int = 500) -> dict:
    """Récupère clubsCoords autour d'un code postal."""
    try:
        data = post_fftt({"structures_zipcode": cp, "search_range": search_range})
        cc = data.get("clubsCoords", {})
        return cc if isinstance(cc, dict) else {}
    except Exception as e:
        logger.error(f"  CP {cp} : erreur {e}")
        return {}


def pick_main_hall(halls: list) -> dict | None:
    """Choisit la salle principale (mainHall=True), sinon la 1re avec GPS,
    sinon la 1re tout court."""
    if not halls:
        return None
    main = [h for h in halls if h.get("mainHall")]
    if main:
        return main[0]
    with_gps = [h for h in halls if h.get("latitude") and h.get("longitude")]
    if with_gps:
        return with_gps[0]
    return halls[0]


def collect_all_clubs(only_dept: str | None = None) -> dict:
    """Itère tous les départements + CP fallback. Retourne dict[club_nom_upper] = hall."""
    clubs: dict[str, dict] = {}  # clé = club_nom UPPER

    def add(name: str, hall: dict):
        key = name.strip().upper()
        if key in clubs:
            existing = clubs[key]
            # Préférer le hall avec GPS si on n'en avait pas
            if (not existing.get("latitude") or not existing.get("longitude")) and hall.get("latitude"):
                clubs[key] = {**hall, "_display_name": name}
            return
        clubs[key] = {**hall, "_display_name": name}

    # Départements métropolitains
    depts = [f"{d:02d}" for d in range(1, 96)] if not only_dept else [only_dept]
    for code in depts:
        cc = fetch_dept(code)
        for name, halls in cc.items():
            hall = pick_main_hall(halls)
            if hall and hall.get("affilie") == "1":
                add(name, hall)
        logger.info(f"  dept {code} : {len(cc)} clubs (cumul total : {len(clubs)})")
        time.sleep(0.2)  # politesse serveur FFTT

    if only_dept:
        return clubs

    # Fallback Corse + DOM-TOM via code postal
    for region, cps in ZIPCODE_FALLBACK.items():
        before = len(clubs)
        for cp in cps:
            cc = fetch_zipcode(cp, search_range=500)
            for name, halls in cc.items():
                hall = pick_main_hall(halls)
                if hall and hall.get("affilie") == "1":
                    add(name, hall)
            time.sleep(0.2)
        logger.info(f"  {region} : +{len(clubs) - before} clubs")

    return clubs


# ============================================================================
# CSV merge
# ============================================================================

def read_existing(csv_path: Path) -> tuple[list[dict], set[str]]:
    """Lit le CSV existant. Retourne (rows, set_des_noms_upper)."""
    rows = []
    seen = set()
    if not csv_path.exists():
        logger.warning(f"CSV existant introuvable : {csv_path}")
        return rows, seen
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("club_nom") or "").strip()
            if not name:
                continue
            rows.append({
                "club_nom": name,
                "pays": row.get("pays", "France"),
                "url": row.get("url", ""),
                "latitude": row.get("latitude", ""),
                "longitude": row.get("longitude", ""),
            })
            seen.add(name.upper())
    logger.info(f"Existant : {len(rows)} clubs déjà présents dans {csv_path.name}")
    return rows, seen


def build_url(club_nom: str) -> str:
    q = f'"{club_nom}" tennis de table France'
    return GMAPS_SEARCH + urllib.parse.quote_plus(q)


def fftt_to_row(name: str, hall: dict) -> dict:
    lat = hall.get("latitude")
    lon = hall.get("longitude")
    return {
        "club_nom": hall.get("_display_name", name),
        "pays": "France",
        "url": build_url(hall.get("_display_name", name)),
        "latitude": f"{lat:.6f}" if isinstance(lat, (int, float)) else "",
        "longitude": f"{lon:.6f}" if isinstance(lon, (int, float)) else "",
    }


def geocode_missing(rows: list[dict], halls_by_name: dict) -> int:
    """Pour les rows ajoutés sans lat/lon, tente un géocodage Nominatim.
    Modifie les rows en place. Retourne le nb de succès."""
    fixed = 0
    for row in rows:
        if row["latitude"] and row["longitude"]:
            continue
        key = row["club_nom"].upper()
        hall = halls_by_name.get(key)
        if not hall:
            continue
        addr_parts = [
            hall.get("street_address", ""),
            hall.get("postal_code", ""),
            hall.get("address_locality", ""),
            "France",
        ]
        query = ", ".join(p for p in addr_parts if p).strip(", ")
        if not query or query == "France":
            continue
        logger.debug(f"  Géocodage : {row['club_nom']} -> {query}")
        result = geocode_nominatim(query)
        if result:
            lat, lon = result
            row["latitude"] = f"{lat:.6f}"
            row["longitude"] = f"{lon:.6f}"
            fixed += 1
        time.sleep(1.1)  # rate-limit Nominatim : 1 req/s max
    return fixed


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Scrape tous les clubs FFTT de France.")
    parser.add_argument("--debug", action="store_true", help="Logs verbeux")
    parser.add_argument("--no-geocode", action="store_true",
                        help="Saute le géocodage Nominatim pour les clubs sans GPS")
    parser.add_argument("--dept", help="Limite à un seul département (ex: 75) — test")
    parser.add_argument("--dry-run", action="store_true",
                        help="N'écrit pas les CSV, affiche juste le résumé")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    logger.info("=== Lecture du CSV existant ===")
    existing_rows, seen = read_existing(EXISTING_CSV)

    logger.info("=== Scraping FFTT (carte.fftt.com) ===")
    halls = collect_all_clubs(only_dept=args.dept)
    logger.info(f"FFTT : {len(halls)} clubs uniques récupérés")

    new_rows = []
    for key, hall in halls.items():
        if key in seen:
            continue
        new_rows.append(fftt_to_row(key, hall))
        seen.add(key)

    logger.info(f"Nouveaux clubs à ajouter : {len(new_rows)}")
    missing_gps = sum(1 for r in new_rows if not r["latitude"])
    logger.info(f"  dont sans GPS : {missing_gps}")

    if not args.no_geocode and missing_gps > 0:
        logger.info(f"=== Géocodage Nominatim (~{missing_gps} requêtes, ~{missing_gps}s) ===")
        fixed = geocode_missing(new_rows, halls)
        logger.info(f"  +{fixed} clubs géocodés via Nominatim")

    # Combine + tri
    all_rows = existing_rows + new_rows
    all_rows.sort(key=lambda r: r["club_nom"].upper())

    logger.info(f"=== Total final : {len(all_rows)} clubs ===")
    logger.info(f"  préservés : {len(existing_rows)}")
    logger.info(f"  ajoutés   : {len(new_rows)}")

    if args.dry_run:
        logger.info("Dry-run : aucun fichier écrit")
        return

    # Écriture
    for target in (EXISTING_CSV, PUBLIC_CSV):
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
            writer.writeheader()
            for row in all_rows:
                writer.writerow(row)
        logger.info(f"  écrit : {target}")

    sys.exit(0)


if __name__ == "__main__":
    main()
