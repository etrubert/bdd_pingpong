"""
================================================================================
PINGPONG TABLES WORLDWIDE — Scraper OSM Overpass (couverture mondiale)
================================================================================

Récupère TOUTES les tables et clubs de tennis de table dans le monde entier
via OpenStreetMap Overpass API. Estime aussi le nombre de tables par lieu.

Sortie :
  - data/maps_table.csv      (colonnes principales)
  - data/maps_table.json     (brut + champs calculés)
  - data/maps_table.geojson  (FeatureCollection pour Leaflet/Mapbox/QGIS)
  - data/maps_table_checkpoint.json (auto-effacé après succès)

Utilisation :
  python pingpong_tables_world.py
  python pingpong_tables_world.py --debug

Stratégie :
  1. Découpage en 13 régions géographiques (couverture mondiale exhaustive).
  2. Si une bbox retourne ≥ 5000 points ou timeout, subdivision récursive
     en 4 quadrants jusqu'à un max de profondeur 5.
  3. Estimation `nombre_tables` par lieu en cascade :
     a. tags OSM (tables/capacity/count/pitches) → "exact"
     b. clustering géographique (≤ 30m, Haversine) → "probable"
     c. point isolé sans tag → "incertain" (1 table par défaut)
  4. Fallback automatique vers d'autres serveurs Overpass en cas de panne.
  5. Checkpoint après chaque bbox racine : reprise possible en cas d'arrêt.

Zéro clé API, zéro service payant. Bibliothèques standard + requests + tqdm.
================================================================================
"""

import argparse
import csv
import json
import logging
import math
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Optional

import requests

try:
    from tqdm import tqdm
except ImportError:
    def tqdm(it, **kwargs):
        return it


# ==============================================================================
# CONFIGURATION
# ==============================================================================
ROOT_DIR = Path(__file__).parent
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

CSV_OUT = DATA_DIR / "pingpong_tables_world.csv"
JSON_OUT = DATA_DIR / "maps_table.json"
GEOJSON_OUT = DATA_DIR / "maps_table.geojson"
CHECKPOINT = DATA_DIR / "maps_table_checkpoint.json"

USER_AGENT = "PingPongWorldMap/1.0 (projet personnel)"

# Endpoints Overpass — fallback automatique si le principal lâche
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

# Politique de courtoisie + retries
DELAY_SEC = 2.0
TIMEOUT_SEC = 1800
RETRY_DELAYS = [5, 15, 45]   # backoff explicite : 5s, 15s, 45s

# Subdivision : si une bbox dépasse ce seuil, on la coupe en 4 quadrants
SUBDIVIDE_THRESHOLD = 5000
MAX_SUBDIVIDE_DEPTH = 5

# Clustering géographique : tables à ≤ 30m = même lieu
CLUSTER_DISTANCE_M = 30
EARTH_RADIUS_M = 6_371_000

# Découpage régional pour la couverture mondiale exhaustive (13 zones)
REGIONS = {
    "Europe":                       (35, -25, 72, 45),
    "Amérique du Nord":             (15, -170, 72, -50),
    "Amérique centrale + Caraïbes": (7, -120, 33, -58),
    "Amérique du Sud":              (-56, -82, 13, -34),
    "Afrique du Nord":              (15, -18, 38, 52),
    "Afrique subsaharienne":        (-35, -18, 15, 52),
    "Moyen-Orient":                 (12, 25, 42, 65),
    "Asie centrale":                (35, 45, 56, 90),
    "Asie du Sud":                  (5, 60, 38, 98),
    "Asie de l'Est":                (18, 90, 55, 150),
    "Asie du Sud-Est":              (-11, 90, 28, 142),
    "Russie":                       (41, 19, 82, 180),
    "Océanie":                      (-50, 110, 0, 180),
}

# Mapping continent grossier pour stats finales (heuristique par bbox)
CONTINENT_MAP = {
    "Europe": "Europe",
    "Russie": "Europe/Asie",
    "Amérique du Nord": "Amérique du Nord",
    "Amérique centrale + Caraïbes": "Amérique du Nord",
    "Amérique du Sud": "Amérique du Sud",
    "Afrique du Nord": "Afrique",
    "Afrique subsaharienne": "Afrique",
    "Moyen-Orient": "Asie",
    "Asie centrale": "Asie",
    "Asie du Sud": "Asie",
    "Asie de l'Est": "Asie",
    "Asie du Sud-Est": "Asie",
    "Océanie": "Océanie",
}

CSV_FIELDNAMES = [
    "id",
    "type",
    "latitude",
    "longitude",
    "name",
    "type_lieu",
    "nombre_tables",
    "source_count",
    "fiabilite_count",
    "country",
    "city",
    "indoor",
    "access",
    "website",
    "lien_google_maps",
    "lien_openstreetmap",
]

logger = logging.getLogger(__name__)


# ==============================================================================
# CLIENT HTTP — délai 2s + retries explicites + bascule fallback
# ==============================================================================
class OverpassClient:
    """Client Overpass avec rate limiting, retries 5/15/45s, bascule sur
    serveurs de secours en cas d'échec persistent."""

    def __init__(self, delay_sec: float = DELAY_SEC):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self.delay_sec = delay_sec
        self._last_request_time = 0.0
        self.endpoint_index = 0     # endpoint courant

    def _wait(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self.delay_sec:
            time.sleep(self.delay_sec - elapsed)
        self._last_request_time = time.time()

    def _post(self, url: str, query: str) -> requests.Response:
        self._wait()
        return self.session.post(
            url, data={"data": query}, timeout=TIMEOUT_SEC
        )

    def query(self, query: str) -> list:
        """Exécute une requête Overpass. Retourne la liste des éléments JSON.
        Lève une exception si tous les essais (retries × endpoints) échouent."""
        last_error = None

        # On essaie chaque endpoint successivement, avec retries internes
        for endpoint in OVERPASS_ENDPOINTS[self.endpoint_index:]:
            for attempt, delay in enumerate([0] + RETRY_DELAYS):
                if delay > 0:
                    logger.warning(
                        f"  Retry {attempt} après {delay}s (endpoint={endpoint})"
                    )
                    time.sleep(delay)
                try:
                    resp = self._post(endpoint, query)
                    if resp.status_code in (429, 503, 504):
                        last_error = f"HTTP {resp.status_code}"
                        continue
                    resp.raise_for_status()
                    payload = resp.json()
                    return payload.get("elements", [])
                except (requests.RequestException, ValueError) as e:
                    last_error = str(e)
                    continue
            # Cet endpoint a échoué → on bascule sur le suivant
            logger.warning(
                f"Endpoint {endpoint} épuisé. Bascule sur le suivant."
            )
            self.endpoint_index = OVERPASS_ENDPOINTS.index(endpoint) + 1

        raise RuntimeError(
            f"Tous les endpoints Overpass ont échoué. Dernière erreur : {last_error}"
        )


# ==============================================================================
# CHECKPOINT (reprise après interruption)
# ==============================================================================
def load_checkpoint() -> dict:
    if not CHECKPOINT.exists():
        return {"done_zones": [], "elements": []}
    try:
        with open(CHECKPOINT, encoding="utf-8") as f:
            data = json.load(f)
            data.setdefault("done_zones", [])
            data.setdefault("elements", [])
            return data
    except Exception as e:
        logger.warning(f"Checkpoint illisible ({e}), on repart de zéro.")
        return {"done_zones": [], "elements": []}


def save_checkpoint(state: dict):
    with open(CHECKPOINT, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False)


# ==============================================================================
# OVERPASS — requêtes par bbox + subdivision récursive
# ==============================================================================
def build_query(bbox: tuple) -> str:
    south, west, north, east = bbox
    return (
        "[out:json][timeout:900];"
        f'nwr["sport"="table_tennis"]({south},{west},{north},{east});'
        "out center tags;"
    )


def fetch_bbox_recursive(
    client: OverpassClient,
    name: str,
    bbox: tuple,
    depth: int = 0,
) -> list:
    """Fetch une bbox. Subdivise en 4 quadrants si ≥ SUBDIVIDE_THRESHOLD
    éléments OU timeout, jusqu'à MAX_SUBDIVIDE_DEPTH."""
    indent = "  " * (depth + 1)
    south, west, north, east = bbox

    try:
        elems = client.query(build_query(bbox))
    except Exception as e:
        if depth >= MAX_SUBDIVIDE_DEPTH:
            logger.error(f"{indent}{name} : profondeur max atteinte, abandon ({e})")
            return []
        logger.warning(f"{indent}{name} : échec, subdivision en quadrants ({e})")
        return _subdivide(client, name, bbox, depth)

    logger.info(f"{indent}{name} ({south:.0f},{west:.0f},{north:.0f},{east:.0f}) : {len(elems)} éléments")

    if len(elems) >= SUBDIVIDE_THRESHOLD and depth < MAX_SUBDIVIDE_DEPTH:
        logger.info(f"{indent}  ≥ {SUBDIVIDE_THRESHOLD} → subdivision pour exhaustivité")
        return _subdivide(client, name, bbox, depth)

    return elems


def _subdivide(client: OverpassClient, name: str, bbox: tuple, depth: int) -> list:
    south, west, north, east = bbox
    mid_lat = (south + north) / 2
    mid_lon = (west + east) / 2
    quads = [
        ((south, west, mid_lat, mid_lon), "SW"),
        ((south, mid_lon, mid_lat, east), "SE"),
        ((mid_lat, west, north, mid_lon), "NW"),
        ((mid_lat, mid_lon, north, east), "NE"),
    ]
    out = []
    for q_bbox, q_name in quads:
        out.extend(
            fetch_bbox_recursive(client, f"{name}/{q_name}", q_bbox, depth + 1)
        )
    return out


# ==============================================================================
# PARSING — extraction d'un élément OSM
# ==============================================================================
def deduce_type_lieu(tags: dict) -> str:
    """Déduit le type de lieu selon les tags OSM (logique en cascade)."""
    if tags.get("club") == "table_tennis":
        return "club"
    if tags.get("leisure") == "sports_centre":
        return "salle_sport"
    if tags.get("indoor") == "yes":
        return "indoor"
    if tags.get("fee") == "yes":
        return "table_publique_payante"
    if tags.get("leisure") == "pitch":
        access = (tags.get("access") or "").lower()
        if access in ("", "yes", "public", "permissive"):
            return "table_publique_parc"
    return "autre"


def detect_continent(lat: float, lon: float, region_hint: str = "") -> str:
    """Mappe lat/lon vers un continent (heuristique simple)."""
    if region_hint and region_hint.split("/")[0] in REGIONS:
        return CONTINENT_MAP.get(region_hint.split("/")[0], "")
    for region, (s, w, n, e) in REGIONS.items():
        if s <= lat <= n and w <= lon <= e:
            return CONTINENT_MAP.get(region, "")
    return "Inconnu"


def _parse_count_from_tags(tags: dict) -> Optional[int]:
    """Cherche un nombre de tables dans les tags OSM (priorité décroissante)."""
    for key in ("tables", "capacity", "count", "pitches"):
        val = tags.get(key)
        if val is None:
            continue
        try:
            n = int(str(val).strip())
            if n > 0:
                return n
        except (ValueError, AttributeError):
            continue
    return None


def make_gmaps_url(lat: float, lon: float) -> str:
    return f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"


def make_osm_url(osm_type: str, osm_id) -> str:
    return f"https://www.openstreetmap.org/{osm_type}/{osm_id}"


def parse_element(elem: dict, region_hint: str = "") -> Optional[dict]:
    """Convertit un élément Overpass en record exploitable."""
    osm_type = elem.get("type")
    osm_id = elem.get("id")

    if "lat" in elem and "lon" in elem:
        lat, lon = elem["lat"], elem["lon"]
    elif "center" in elem:
        lat = elem["center"].get("lat")
        lon = elem["center"].get("lon")
    else:
        return None
    if lat is None or lon is None:
        return None

    tags = elem.get("tags", {}) or {}

    # Comptage tables : priorité aux tags OSM, sinon estimation par défaut
    tag_count = _parse_count_from_tags(tags)
    if tag_count is not None:
        nombre_tables = tag_count
        source_count = "osm_tag"
        fiabilite = "exact"
    else:
        # Sera potentiellement remplacé après le clustering global
        nombre_tables = 1
        source_count = "estime_1"
        fiabilite = "incertain"

    return {
        "id": osm_id,
        "type": osm_type,
        "latitude": lat,
        "longitude": lon,
        "name": tags.get("name", ""),
        "type_lieu": deduce_type_lieu(tags),
        "nombre_tables": nombre_tables,
        "source_count": source_count,
        "fiabilite_count": fiabilite,
        "ids_clusterises": [],
        "country": tags.get("addr:country", ""),
        "city": tags.get("addr:city", ""),
        "addr_street": tags.get("addr:street", ""),
        "addr_postcode": tags.get("addr:postcode", ""),
        "indoor": tags.get("indoor", ""),
        "access": tags.get("access", ""),
        "operator": tags.get("operator", ""),
        "website": tags.get("website", "") or tags.get("contact:website", ""),
        "opening_hours": tags.get("opening_hours", ""),
        "fee": tags.get("fee", ""),
        "leisure": tags.get("leisure", ""),
        "amenity": tags.get("amenity", ""),
        "surface": tags.get("surface", ""),
        "lien_google_maps": make_gmaps_url(lat, lon),
        "lien_openstreetmap": make_osm_url(osm_type, osm_id),
        "continent": detect_continent(lat, lon, region_hint),
        "_raw_tags": tags,
    }


# ==============================================================================
# CLUSTERING GÉOGRAPHIQUE — Haversine + grid spatial
# ==============================================================================
def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance Haversine en mètres entre deux points lat/lon."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def cluster_records(records: list, max_dist_m: float = CLUSTER_DISTANCE_M) -> list:
    """Regroupe les records sans tag de comptage qui sont à ≤ max_dist_m.

    Algorithme :
      1. Sépare les records "exact" (tag OSM) → conservés tels quels
      2. Pour les records "incertain", indexe par cellule de grille spatiale
         (~33m côté à l'équateur) puis cherche les voisins dans 9 cellules
      3. Union-find pour fusionner les clusters
      4. Pour chaque cluster :
         - taille 1 → conserve, fiabilité "incertain"
         - taille >1 → centroïde, nombre_tables = taille, fiabilité "probable"
    """
    EPS_DEG = 0.0003  # ~33m de côté à l'équateur

    # Records avec count exact (tag OSM) : on les garde tels quels
    exact = [r for r in records if r["source_count"] == "osm_tag"]
    # Records sans tag : à clusteriser
    fuzzy = [r for r in records if r["source_count"] != "osm_tag"]
    n = len(fuzzy)
    if n == 0:
        return exact

    # Indexation grille spatiale
    grid = defaultdict(list)
    for i, r in enumerate(fuzzy):
        cell = (int(r["latitude"] / EPS_DEG), int(r["longitude"] / EPS_DEG))
        grid[cell].append(i)

    # Union-find
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    # Pour chaque point, vérifie ses voisins dans 9 cellules
    for i, r in enumerate(fuzzy):
        cell_lat = int(r["latitude"] / EPS_DEG)
        cell_lon = int(r["longitude"] / EPS_DEG)
        for dlat in (-1, 0, 1):
            for dlon in (-1, 0, 1):
                for j in grid.get((cell_lat + dlat, cell_lon + dlon), []):
                    if j <= i:
                        continue
                    s = fuzzy[j]
                    if haversine_m(r["latitude"], r["longitude"], s["latitude"], s["longitude"]) <= max_dist_m:
                        union(i, j)

    # Regroupe par root
    groups = defaultdict(list)
    for i in range(n):
        groups[find(i)].append(fuzzy[i])

    out = list(exact)
    for members in groups.values():
        if len(members) == 1:
            r = members[0]
            r["nombre_tables"] = 1
            r["source_count"] = "estime_1"
            r["fiabilite_count"] = "incertain"
            r["ids_clusterises"] = []
            out.append(r)
        else:
            # Centroïde géographique
            avg_lat = sum(m["latitude"] for m in members) / len(members)
            avg_lon = sum(m["longitude"] for m in members) / len(members)
            rep = dict(members[0])
            rep["latitude"] = avg_lat
            rep["longitude"] = avg_lon
            rep["nombre_tables"] = len(members)
            rep["source_count"] = "cluster_geographique"
            rep["fiabilite_count"] = "probable"
            rep["ids_clusterises"] = [m["id"] for m in members]
            # Régénère les liens (les coordonnées ont changé pour le centroïde)
            rep["lien_google_maps"] = make_gmaps_url(avg_lat, avg_lon)
            # Le lien OSM reste sur le 1er membre (un cluster n'a pas d'id OSM unique)
            out.append(rep)
    return out


# ==============================================================================
# DÉDUPLICATION par (type, id) OSM
# ==============================================================================
def dedupe_by_osm_id(records: list) -> list:
    seen = set()
    out = []
    for r in records:
        key = (r["type"], r["id"])
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


# ==============================================================================
# EXPORT
# ==============================================================================
def export_csv(records: list, path: Path):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        for r in records:
            writer.writerow(r)
    logger.info(f"CSV  : {len(records)} lignes -> {path}")


def export_json(records: list, path: Path):
    """Export JSON brut, incluant tous les champs calculés et les tags OSM bruts."""
    out = []
    for r in records:
        d = {k: v for k, v in r.items() if not k.startswith("_")}
        d["raw_tags"] = r.get("_raw_tags", {})
        out.append(d)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    logger.info(f"JSON : {len(records)} entrées -> {path}")


def export_geojson(records: list, path: Path):
    """FeatureCollection chargeable directement dans Leaflet/Mapbox/QGIS."""
    features = []
    for r in records:
        props = {k: v for k, v in r.items()
                 if k not in ("latitude", "longitude") and not k.startswith("_")}
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [r["longitude"], r["latitude"]],
            },
            "properties": props,
        })
    geo = {"type": "FeatureCollection", "features": features}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(geo, f, ensure_ascii=False, indent=2)
    logger.info(f"GEO  : {len(features)} features -> {path}")


# ==============================================================================
# COLLECTE — boucle régionale avec checkpoint après chaque zone
# ==============================================================================
def collecter_monde(client: OverpassClient) -> list:
    """Itère sur les 13 régions, avec checkpoint après chacune."""
    state = load_checkpoint()
    done_zones = set(state.get("done_zones", []))
    raw_elements = list(state.get("elements", []))  # éléments bruts cumulés

    pending = [r for r in REGIONS if r not in done_zones]
    if done_zones:
        logger.info(f"Reprise depuis checkpoint : {len(done_zones)} zones déjà faites.")
    logger.info(f"Régions à traiter : {len(pending)}")

    # Couple chaque élément à la région où il a été récupéré
    tagged = [(e, e.get("_region", "")) for e in raw_elements]

    for region in tqdm(pending, desc="Régions"):
        bbox = REGIONS[region]
        try:
            elems = fetch_bbox_recursive(client, region, bbox)
        except Exception as e:
            logger.error(f"Région {region} : ÉCHEC GLOBAL ({e})")
            continue
        for e in elems:
            e["_region"] = region   # marque pour le checkpoint
        tagged.extend([(e, region) for e in elems])
        done_zones.add(region)

        # Checkpoint après chaque région
        state["done_zones"] = sorted(done_zones)
        state["elements"] = [t[0] for t in tagged]
        save_checkpoint(state)

    return tagged


# ==============================================================================
# STATS — résumé final exhaustif
# ==============================================================================
def afficher_stats(records: list):
    total_lieux = len(records)
    total_tables = sum(r.get("nombre_tables", 0) for r in records)

    by_continent_lieux = defaultdict(int)
    by_continent_tables = defaultdict(int)
    by_type = defaultdict(int)
    by_fiabilite = defaultdict(int)
    by_country_lieux = defaultdict(int)
    by_country_tables = defaultdict(int)

    for r in records:
        c = r.get("continent") or "Inconnu"
        by_continent_lieux[c] += 1
        by_continent_tables[c] += r.get("nombre_tables", 0)
        by_type[r.get("type_lieu") or "inconnu"] += 1
        by_fiabilite[r.get("fiabilite_count") or "inconnu"] += 1
        country = r.get("country") or "Inconnu"
        by_country_lieux[country] += 1
        by_country_tables[country] += r.get("nombre_tables", 0)

    sep = "=" * 70
    logger.info("")
    logger.info(sep)
    logger.info(f"TOTAL : {total_lieux} emplacements / {total_tables} tables estimées")
    logger.info(sep)

    logger.info("Par continent :")
    for c, n in sorted(by_continent_lieux.items(), key=lambda x: -x[1]):
        logger.info(f"  {c:<22} {n:>6} lieux  /  {by_continent_tables[c]:>6} tables")

    logger.info("Par type_lieu :")
    for t, n in sorted(by_type.items(), key=lambda x: -x[1]):
        logger.info(f"  {t:<28} {n:>6}")

    logger.info("Par fiabilite_count :")
    for f, n in sorted(by_fiabilite.items(), key=lambda x: -x[1]):
        logger.info(f"  {f:<22} {n:>6}")

    logger.info("")
    logger.info(f"Par pays (LISTE COMPLÈTE — {len(by_country_lieux)} pays) :")
    for country, nlieux in sorted(by_country_lieux.items(), key=lambda x: -x[1]):
        ntables = by_country_tables[country]
        logger.info(f"  {country:<35} {nlieux:>6} lieux  /  {ntables:>6} tables")
    logger.info(sep)


# ==============================================================================
# MAIN
# ==============================================================================
def run():
    logger.info("=" * 70)
    logger.info("PingPong Tables Worldwide — couverture mondiale exhaustive")
    logger.info(f"Endpoints Overpass : {len(OVERPASS_ENDPOINTS)} (avec fallback automatique)")
    logger.info(f"Régions : {len(REGIONS)} | Subdivision auto si ≥ {SUBDIVIDE_THRESHOLD} pts")
    logger.info("=" * 70)

    client = OverpassClient(delay_sec=DELAY_SEC)
    tagged = collecter_monde(client)

    if not tagged:
        logger.error("Aucun élément récupéré.")
        sys.exit(1)

    logger.info(f"Total brut : {len(tagged)} éléments (avant dédup et clustering)")

    # Parsing
    records = []
    for elem, region in tqdm(tagged, desc="Parsing"):
        rec = parse_element(elem, region_hint=region)
        if rec:
            records.append(rec)

    # Dédup par OSM id (les bboxes peuvent se chevaucher en frontière)
    before = len(records)
    records = dedupe_by_osm_id(records)
    logger.info(f"Dédup : {before} → {len(records)} (-{before - len(records)} doublons)")

    # Clustering géographique : regroupe les points sans tag de comptage
    logger.info(f"Clustering géographique (≤ {CLUSTER_DISTANCE_M}m, Haversine)...")
    before = len(records)
    records = cluster_records(records, max_dist_m=CLUSTER_DISTANCE_M)
    logger.info(f"Clustering : {before} → {len(records)} emplacements distincts")

    # Export
    export_csv(records, CSV_OUT)
    export_json(records, JSON_OUT)
    export_geojson(records, GEOJSON_OUT)

    # Stats
    afficher_stats(records)

    # Nettoyage du checkpoint après succès
    if CHECKPOINT.exists():
        CHECKPOINT.unlink()
        logger.info(f"Checkpoint nettoyé : {CHECKPOINT}")


def main():
    parser = argparse.ArgumentParser(
        description="Scraper mondial OSM des tables/clubs de tennis de table.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--debug", action="store_true", help="Logs verbeux.")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    try:
        run()
    except KeyboardInterrupt:
        logger.warning("Interruption — état sauvegardé dans le checkpoint, reprise possible.")
        sys.exit(130)


if __name__ == "__main__":
    main()
