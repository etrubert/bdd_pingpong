"""
Ajoute / complete les colonnes latitude/longitude de maps_clubs.csv.
Strategie multi-passes pour maximiser le taux de reussite :

  Passe 1 : Nominatim avec query enrichie ("<club> tennis de table" + countrycodes)
  Passe 2 : Photon (Komoot) — autre geocoder gratuit, sans rate-limit strict
  Passe 3 : Nominatim sur la ville extraite du club_nom
  Passe 4 : si rien -> vide

Idempotent : les lignes deja remplies sont skip.
"""

import csv
import re
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).parent
INPUT_PATH = ROOT / "maps_clubs.csv"

# Suffixe local "tennis de table" par pays pour enrichir les queries
TENNIS_SUFFIX = {
    "France": "tennis de table",
    "Espagne": "tenis de mesa",
    "Portugal": "tenis de mesa",
    "Chine": "ping pong",            # 乒乓球 marche aussi mais ping pong OK
    "USA": "table tennis",
    "Allemagne": "Tischtennis",
}

COUNTRY_CODE = {
    "France": "fr",
    "Espagne": "es",
    "Portugal": "pt",
    "Chine": "cn",
    "USA": "us",
    "Allemagne": "de",
}

USER_AGENT = "bdd-pingpong/1.0 (research)"
RATE_LIMIT_SEC = 1.1


# -------- Extracteurs de ville depuis club_nom --------
# Tente d'isoler un nom de ville lisible que les geocoders trouveront.

# Mots a virer pour ne garder que la ville
NOISE_WORDS_FR = re.compile(
    r"\b(T\.?T\.?|TT|TENNIS|DE|TABLE|CLUB|ASSOCIATION|ASSOC\.?|"
    r"SPORTING|SPORT|SPORTS|OLYMPIQUE|UNION|S\.?C\.?|U\.?S\.?|A\.?S\.?|"
    r"FC|CSM|CSMF|EP|PSG|RP|U\.|SCT?T?|CO|GC|GDCS|GV|AVENIR|AMICAL|"
    r"SU|US|JS|FRANCE|ESPANA|PORTUGAL|DEUTSCHLAND)\b",
    re.IGNORECASE,
)
ARRONDISSEMENT_RE = re.compile(r"\bPARIS\s*(\d{1,2})", re.IGNORECASE)

# Sigles courants en Espagne
NOISE_WORDS_ES = re.compile(
    r"\b(CD|CDTM|CTM|CTM\.?|TM|CDETM|CT|TEAM|CLUB|DEPORTIVO|"
    r"RC|REAL|RFETM|FEMINAS|FEMENINO|MASCULINO|"
    r"TENIS|MESA|DE|EL|LA|LOS|LAS|SECCION|SD)\b",
    re.IGNORECASE,
)

# Sigles courants au Portugal
NOISE_WORDS_PT = re.compile(
    r"\b(AC|ACDR|APAE|AR|AD|GD|GDC|GDCS|GR|CAD|CFEA|SBR|"
    r"MUS|REC|JAN|TOP|SPIN|CLUBE|CLUB|GRUPO|DESPORTIVO|"
    r"CULTURAL|RECREATIVO|FOOTBALL|ESTRELA|TENIS|MESA|DE|DO|DA|OS|AS)\b",
    re.IGNORECASE,
)


def extract_city_fr(club_nom: str) -> str:
    """Tente d'extraire une ville francaise lisible du nom du club."""
    s = club_nom.upper()
    # Cas special : "PARIS 13", "PARIS XV", "AP 17", "CPS 10eme" -> Paris
    m = ARRONDISSEMENT_RE.search(s)
    if m:
        return f"Paris {m.group(1)}e arrondissement"
    if re.search(r"PARIS|\d+EME|\bXVE?\b|\bIXE?\b", s):
        return "Paris"
    # Sinon, on enleve le bruit et on garde les mots restants
    cleaned = NOISE_WORDS_FR.sub(" ", s)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned.title() if cleaned else club_nom


def extract_city_es(club_nom: str) -> str:
    """Enleve sigles ES, garde noms propres."""
    s = club_nom.upper()
    cleaned = NOISE_WORDS_ES.sub(" ", s)
    cleaned = re.sub(r"[´\.\-,]", " ", cleaned)
    cleaned = re.sub(r"\b\d+\b", "", cleaned)  # virer nombres genre "150 AÑOS"
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned.title() if cleaned else club_nom


def extract_city_pt(club_nom: str) -> str:
    """Enleve sigles PT, garde noms propres."""
    s = club_nom.upper()
    cleaned = NOISE_WORDS_PT.sub(" ", s)
    cleaned = re.sub(r"[\.\-,]", " ", cleaned)
    cleaned = re.sub(r"\b\d+(º|\.|st|nd|rd|th)?\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned.title() if cleaned else club_nom


def extract_city_cn(club_nom: str) -> str:
    """Pour les noms chinois multi-segments separes par ·, on prend la 1ere partie
    qui est generalement la province ou la ville."""
    s = club_nom.strip()
    # Split par middle dot ou point classique
    for sep in ("·", "・", "•", "/"):
        if sep in s:
            return s.split(sep)[0].strip()
    return s


def extract_city_generic(club_nom: str) -> str:
    """Heuristique generique : on enleve les sigles tres courts en debut/fin."""
    s = club_nom.strip()
    parts = s.split()
    while parts and len(parts[0]) <= 3 and parts[0].isalpha():
        parts.pop(0)
    while parts and len(parts[-1]) <= 3 and parts[-1].isalpha():
        parts.pop()
    return " ".join(parts) if parts else club_nom


def extract_city(club_nom: str, pays: str) -> str:
    """Dispatcher par pays."""
    if pays == "France":
        return extract_city_fr(club_nom)
    if pays == "Espagne":
        return extract_city_es(club_nom)
    if pays == "Portugal":
        return extract_city_pt(club_nom)
    if pays == "Chine":
        return extract_city_cn(club_nom)
    return extract_city_generic(club_nom)


# -------- Geocoders --------

_session = requests.Session()
_session.headers["User-Agent"] = USER_AGENT

_last_nominatim_call = 0.0


def nominatim_search(query: str, country: str) -> tuple:
    """Geocode via Nominatim. Respecte le rate limit 1 req/s."""
    global _last_nominatim_call  # noqa: PLW0603
    elapsed = time.time() - _last_nominatim_call
    if elapsed < RATE_LIMIT_SEC:
        time.sleep(RATE_LIMIT_SEC - elapsed)
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": query,
            "format": "json",
            "limit": 1,
            "countrycodes": COUNTRY_CODE.get(country, ""),
        }
        r = _session.get(url, params=params, timeout=20)
        r.raise_for_status()
        results = r.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:
        return None, None
    finally:
        _last_nominatim_call = time.time()
    return None, None


def photon_search(query: str, country: str) -> tuple:
    """Geocode via Photon (Komoot)."""
    try:
        url = "https://photon.komoot.io/api/"
        params = {"q": query, "limit": 1, "lang": "fr"}
        # Bias geographique sur le centre du pays
        country_centers = {
            "France": (46.6, 2.5),
            "Espagne": (40.4, -3.7),
            "Portugal": (39.5, -8.0),
            "Chine": (35.9, 104.2),
            "USA": (39.8, -98.6),
            "Allemagne": (51.2, 10.5),
        }
        if country in country_centers:
            lat_c, lon_c = country_centers[country]
            params["lat"] = lat_c
            params["lon"] = lon_c
        r = _session.get(url, params=params, timeout=20)
        r.raise_for_status()
        features = r.json().get("features", [])
        if features:
            lon, lat = features[0]["geometry"]["coordinates"]
            # Verifier que c'est dans le bon pays
            country_iso = features[0].get("properties", {}).get("countrycode", "").upper()
            wanted_iso = COUNTRY_CODE.get(country, "").upper()
            if country_iso and wanted_iso and country_iso != wanted_iso:
                return None, None
            return float(lat), float(lon)
    except Exception:
        return None, None
    return None, None


# -------- Pipeline par club --------

def try_geocode(club_nom: str, pays: str) -> tuple:
    """Tente 4 strategies en cascade. Retourne (lat, lon, method)."""
    suffix = TENNIS_SUFFIX.get(pays, "table tennis")
    enriched = f"{club_nom} {suffix}"

    # Passe 1 : Nominatim enrichi
    lat, lon = nominatim_search(enriched, pays)
    if lat is not None:
        return lat, lon, "nominatim+suffix"

    # Passe 2 : Photon enrichi
    lat, lon = photon_search(enriched, pays)
    if lat is not None:
        return lat, lon, "photon+suffix"

    # Passe 3 : Nominatim sur la ville extraite (par pays)
    city = extract_city(club_nom, pays)
    if city and city.strip() and city.upper() != club_nom.upper():
        lat, lon = nominatim_search(city, pays)
        if lat is not None:
            return lat, lon, f"nominatim+city({city})"

        # Passe 4 : Photon sur la ville extraite
        lat, lon = photon_search(city, pays)
        if lat is not None:
            return lat, lon, f"photon+city({city})"

    # Passe 5 : prendre les 2 derniers mots du club_nom (souvent = ville)
    parts = club_nom.split()
    if len(parts) >= 2:
        tail = " ".join(parts[-2:])
        if tail.upper() != club_nom.upper():
            lat, lon = nominatim_search(tail, pays)
            if lat is not None:
                return lat, lon, f"nominatim+tail({tail})"
            lat, lon = photon_search(tail, pays)
            if lat is not None:
                return lat, lon, f"photon+tail({tail})"

    # Passe 6 : prendre le dernier mot seul (souvent = nom de ville)
    if parts:
        last = parts[-1]
        if last.upper() != club_nom.upper() and len(last) > 3:
            lat, lon = photon_search(last, pays)
            if lat is not None:
                return lat, lon, f"photon+last({last})"

    return None, None, "none"


def main():
    if not INPUT_PATH.exists():
        print(f"ERREUR : {INPUT_PATH} introuvable", file=sys.stderr)
        sys.exit(1)

    with open(INPUT_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        original_fields = reader.fieldnames or []

    new_fields = list(original_fields)
    for col in ("latitude", "longitude"):
        if col not in new_fields:
            new_fields.append(col)

    for row in rows:
        row.setdefault("latitude", "")
        row.setdefault("longitude", "")

    to_process = [r for r in rows if not r.get("latitude") or not r.get("longitude")]
    print(f"=== Geocoding multi-passes ===")
    print(f"Total: {len(rows)} clubs, a traiter: {len(to_process)}")
    if not to_process:
        print("Rien a faire — tous les clubs ont deja des coordonnees.")
        return

    ok_count = 0
    for i, row in enumerate(to_process, 1):
        club = (row.get("club_nom") or "").strip()
        pays = (row.get("pays") or "").strip()
        if not club:
            continue
        lat, lon, method = try_geocode(club, pays)
        if lat is not None:
            row["latitude"] = f"{lat:.6f}"
            row["longitude"] = f"{lon:.6f}"
            ok_count += 1
            marker = "OK"
        else:
            marker = "??"
        print(f"  [{i:>3}/{len(to_process)}] {marker} {pays:<10} {club[:38]:<38} via={method}")

        # Sauvegarde intermediaire toutes les 30 lignes
        if i % 30 == 0:
            with open(INPUT_PATH, "w", encoding="utf-8-sig", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=new_fields, extrasaction="ignore")
                writer.writeheader()
                writer.writerows(rows)
            print(f"  ... sauvegarde intermediaire ({i} lignes)\n")

    # Sauvegarde finale
    with open(INPUT_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=new_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    total_with_coords = sum(1 for r in rows if r.get("latitude") and r.get("longitude"))
    print(f"\n=== TERMINE ===")
    print(f"  Nouveaux geocodes: {ok_count}/{len(to_process)}")
    print(f"  Total avec coords: {total_with_coords}/{len(rows)} ({100 * total_with_coords / len(rows):.0f}%)")
    print(f"\nFichier mis a jour : {INPUT_PATH}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrompu", file=sys.stderr)
        sys.exit(130)
