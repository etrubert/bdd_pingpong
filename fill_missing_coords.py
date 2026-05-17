"""
Remplit les latitude/longitude manquantes dans maps_clubs.csv.
Strategie : requetes alternatives + overrides manuels documentes.
"""

import csv
import time
from pathlib import Path

import requests

ROOT = Path(__file__).parent
INPUT_PATH = ROOT / "maps_clubs.csv"
USER_AGENT = "bdd-pingpong/1.0 (research)"

# Overrides explicites pour cas connus (cles = (club_nom, pays))
# - Poland/Austria sous "Allemagne" = nationalites de joueurs sans club assigne
#   -> on prend le centre du pays correspondant
# - Atlanta Blazers / Florida Crocs = equipes MLTT sans salle fixe
#   -> on prend la ville d'attache
OVERRIDES = {
    ("Poland", "Allemagne"):           (52.069300,  19.480300),   # centre Pologne
    ("Austria", "Allemagne"):          (47.516200,  14.550100),   # centre Autriche
    ("Atlanta Blazers", "USA"):        (33.749000, -84.388000),   # Atlanta, GA
    ("Florida Crocs", "USA"):          (28.538300, -81.379200),   # Orlando, FL (siege MLTT)
    ("AUBERVILLIERS CMTT", "France"):  (48.914300,   2.383700),   # Aubervilliers (93)
    ("AUDONIENNE USMA TT", "France"):  (48.905100,   2.333800),   # Saint-Ouen-sur-Seine (93)
}

# Requetes alternatives pour clubs reels que les geocoders standards ratent
# cle = (club_nom, pays) -> liste de queries a essayer en ordre
ALT_QUERIES = {
    ("Köpenicker SV-Ajax", "Allemagne"): [
        "SV Ajax Köpenick Berlin",
        "Ajax Köpenick",
        "Köpenick Berlin",
    ],
    # Espagne
    ("CD FIRGONG", "Espagne"): ["Firgas Las Palmas", "Firgas Gran Canaria", "Firgas"],
    ("CTM GAILAK", "Espagne"): ["Gailak Hernani", "Hernani Gipuzkoa", "Hernani Spain"],
    ("GURE TALDE", "Espagne"): ["Galdakao Bizkaia", "Galdakao Spain", "Gure Talde Galdakao"],
    ("NATACIO MATARO", "Espagne"): ["Mataró Barcelona", "Club Natació Mataró", "Mataro"],
    ("NOVACARTAMA TM", "Espagne"): ["Cártama Málaga", "Cartama Spain", "Cartama"],
    # Portugal
    ("AR Canidelense", "Portugal"): ["Canidelo Vila Nova de Gaia", "Canidelo Porto", "Canidelo"],
    ("AR NOVELENSE", "Portugal"): ["Novelas Portugal", "Nogueira Lousada", "Novelas Penafiel"],
    ("CAD. OS VIANENSES", "Portugal"): ["Viana do Castelo", "Vianenses Viana"],
    ("GR ESTª BONFIM", "Portugal"): ["Bonfim Porto", "Estação Bonfim Setúbal", "Bonfim Setubal"],
    ("MONTAMORA SC", "Portugal"): ["Mortágua Portugal", "Mortagua", "Montemor-o-Velho"],
}

COUNTRY_CODE = {"Allemagne": "de", "USA": "us", "France": "fr",
                "Chine": "cn", "Espagne": "es", "Portugal": "pt"}

_session = requests.Session()
_session.headers["User-Agent"] = USER_AGENT
_last = 0.0


def nominatim(query: str, pays: str) -> tuple:
    global _last  # noqa: PLW0603
    delta = time.time() - _last
    if delta < 1.1:
        time.sleep(1.1 - delta)
    try:
        r = _session.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1,
                    "countrycodes": COUNTRY_CODE.get(pays, "")},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    finally:
        _last = time.time()
    return None, None


COUNTRY_CENTERS = {
    "Allemagne": (51.2, 10.5), "Espagne": (40.4, -3.7),
    "Portugal": (39.5, -8.0), "France": (46.6, 2.5),
    "USA": (39.8, -98.6), "Chine": (35.9, 104.2),
}


def photon(query: str, pays: str) -> tuple:
    try:
        params = {"q": query, "limit": 1, "lang": "en"}
        if pays in COUNTRY_CENTERS:
            lat_c, lon_c = COUNTRY_CENTERS[pays]
            params["lat"] = lat_c
            params["lon"] = lon_c
        r = _session.get("https://photon.komoot.io/api/", params=params, timeout=20)
        r.raise_for_status()
        features = r.json().get("features", [])
        if features:
            lon, lat = features[0]["geometry"]["coordinates"]
            iso = features[0].get("properties", {}).get("countrycode", "").upper()
            wanted = COUNTRY_CODE.get(pays, "").upper()
            if iso and wanted and iso != wanted:
                return None, None
            return float(lat), float(lon)
    except Exception:
        pass
    return None, None


def main() -> None:
    with open(INPUT_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames

    missing = [r for r in rows if not r.get("latitude") or not r.get("longitude")]
    print(f"Manquants : {len(missing)}\n")

    filled = 0
    for r in missing:
        club = r["club_nom"].strip()
        pays = r["pays"].strip()
        key = (club, pays)

        # 1. Override manuel ?
        if key in OVERRIDES:
            lat, lon = OVERRIDES[key]
            r["latitude"] = f"{lat:.6f}"
            r["longitude"] = f"{lon:.6f}"
            filled += 1
            print(f"  OK [override] {pays:<10} {club:<30} -> {lat}, {lon}")
            continue

        # 2. Requetes alternatives ? (Nominatim puis Photon en fallback)
        found = False
        if key in ALT_QUERIES:
            for q in ALT_QUERIES[key]:
                for geocoder_name, geocoder_fn in (("nom", nominatim), ("pho", photon)):
                    lat, lon = geocoder_fn(q, pays)
                    if lat is not None:
                        r["latitude"] = f"{lat:.6f}"
                        r["longitude"] = f"{lon:.6f}"
                        filled += 1
                        found = True
                        print(f"  OK [{geocoder_name}:{q}] {pays:<10} {club:<30} -> {lat:.4f}, {lon:.4f}")
                        break
                if found:
                    break
        if not found and key not in OVERRIDES:
            print(f"  ?? toujours manquant : {pays} {club}")

    with open(INPUT_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    total_ok = sum(1 for r in rows if r.get("latitude") and r.get("longitude"))
    print(f"\n=== TERMINE ===")
    print(f"  Rempli : {filled}/{len(missing)}")
    print(f"  Total geocode : {total_ok}/{len(rows)} ({100*total_ok/len(rows):.0f}%)")


if __name__ == "__main__":
    main()
