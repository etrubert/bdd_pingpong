"""
================================================================================
🏓 PINGPONG FRANCE SCRAPER — Script unique tout-en-un
================================================================================

Scrape :
  1. Joueurs FFTT (100 avancés + 100 intermédiaires + 100 débutants)
  2. Lieux pour jouer en France (clubs FFTT + tables OSM + équipements data.gouv)

Sortie :
  - data/players.csv
  - data/locations.csv

Installation :
  pip install -r requirements.txt

Utilisation :
  python pingpong_france.py players          # scrape les joueurs
  python pingpong_france.py locations        # scrape les lieux
  python pingpong_france.py all              # les deux
  python pingpong_france.py locations --skip-osm --skip-datagouv

Options :
  --debug         : logs verbeux
  --skip-fftt     : ne pas scraper les clubs FFTT (locations)
  --skip-osm      : ne pas scraper OSM (locations)
  --skip-datagouv : ne pas scraper data.gouv (locations)

Authentification FFTT (optionnelle) :
  Créer un fichier .env à côté de ce script avec :
    FFTT_API_ID=votre_id
    FFTT_API_PASSWORD=votre_password
  (Identifiants gratuits via formulaire FFTT — voir https://www.fftt.com)
================================================================================
"""

import argparse
import csv
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Iterable, Iterator, Optional
from urllib.parse import unquote_plus

import requests
from dotenv import load_dotenv
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

# ==============================================================================
# CONFIGURATION
# ==============================================================================
load_dotenv()

# Chemins
ROOT_DIR = Path(__file__).parent
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
PLAYERS_CSV = DATA_DIR / "players.csv"
LOCATIONS_CSV = DATA_DIR / "locations.csv"

# HTTP
USER_AGENT = "PingPongFrance-Scraper/1.0 (contact: votre-email@example.com)"
DEFAULT_DELAY_SEC = 1.5
TIMEOUT_SEC = 30
MAX_RETRIES = 3

# FFTT — données joueurs/clubs récupérées via PingPocket (partenaire officiel FFTT, sans auth)
PINGPOCKET_BASE = "https://www.pingpocket.fr"
PINGPOCKET_AJAX_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "text/html, */*; q=0.01",
    "Referer": "https://www.pingpocket.fr/",
}

# Catégorisation niveaux (points FFTT : plancher 500, top > 3500)
LEVEL_THRESHOLDS = {"avance": 1500, "intermediaire": 800, "debutant": 0}
CLASSEMENTS_OFFICIELS = [
    (3500, 99999, "Numéroté national (Top)"),
    (2200, 3499, "Nationale 1"),
    (1900, 2199, "Nationale 2"),
    (1700, 1899, "Nationale 3"),
    (1500, 1699, "Régionale 1"),
    (1300, 1499, "Régionale 2"),
    (1200, 1299, "Régionale 3"),
    (1100, 1199, "Pré-Régional"),
    (900, 1099, "Départemental 1"),
    (800, 899, "Départemental 2"),
    (700, 799, "Départemental 3"),
    (600, 699, "Départemental 4"),
    (500, 599, "Non Classé / Plancher"),
]

# Quotas joueurs par niveau
PLAYERS_SAMPLE = {"avance": 100, "intermediaire": 100, "debutant": 100}

# Départements à scanner pour l'échantillon joueurs (gros effectifs licenciés)
DEPARTEMENTS_PRIORITAIRES = [
    "75",
    "92",
    "93",
    "94",
    "13",
    "69",
    "59",
    "33",
    "44",
    "31",
    "67",
    "35",
    "06",
    "38",
    "76",
]

# Tous les départements de France pour les clubs FFTT
TOUS_DEPARTEMENTS = [f"{i:02d}" for i in range(1, 96) if i != 20] + [
    "2A",
    "2B",
    "971",
    "972",
    "973",
    "974",
    "976",
]

# OpenStreetMap
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_QUERY_TABLES_FR = """
[out:json][timeout:120];
area["ISO3166-1"="FR"][admin_level=2]->.france;
(
  node["sport"="table_tennis"](area.france);
  way["sport"="table_tennis"](area.france);
);
out center tags;
"""

# data.gouv.fr (Recensement Équipements Sportifs)
DATA_ES_URL = (
    "https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/"
    "data-es/records"
)

# Schémas CSV
PLAYER_FIELDNAMES = [
    "licence",
    "nom",
    "prenom",
    "ville",
    "club_nom",
    "club_ville",
    "points_elo",
    "rang_national",
    "rang_ligue",
    "rang_comite",
    "classement_officiel",
    "niveau_categorie",
    "nombre_matchs",
    "victoires",
    "defaites",
]

LOCATION_FIELDNAMES = [
    "nom",
    "type",
    "adresse",
    "ville",
    "code_postal",
    "latitude",
    "longitude",
    "acces",
    "nb_tables",
    "source",
]

logger = logging.getLogger(__name__)


# ==============================================================================
# UTILS — Client HTTP poli (User-Agent, délais, retries)
# ==============================================================================
class HttpClient:
    """Client HTTP avec retries automatiques et délais entre requêtes."""

    def __init__(self, delay_sec: float = DEFAULT_DELAY_SEC, user_agent: str = USER_AGENT):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent})
        self.delay_sec = delay_sec
        self._last_request_time = 0.0

    def _wait(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self.delay_sec:
            time.sleep(self.delay_sec - elapsed)
        self._last_request_time = time.time()

    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((requests.RequestException,)),
        reraise=True,
    )
    def get(self, url, params=None, **kwargs):
        self._wait()
        resp = self.session.get(url, params=params, timeout=TIMEOUT_SEC, **kwargs)
        resp.raise_for_status()
        return resp

    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((requests.RequestException,)),
        reraise=True,
    )
    def post(self, url, data=None, json=None, **kwargs):
        self._wait()
        resp = self.session.post(url, data=data, json=json, timeout=TIMEOUT_SEC, **kwargs)
        resp.raise_for_status()
        return resp

    def close(self):
        self.session.close()


# ==============================================================================
# UTILS — Écriture CSV (UTF-8 BOM pour Excel français)
# ==============================================================================
def write_csv(path: Path, rows: Iterable[dict], fieldnames: list) -> int:
    """Écrit un CSV. Retourne le nombre de lignes écrites."""
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            count += 1
    return count


# ==============================================================================
# UTILS — Classification des joueurs FFTT
# ==============================================================================
def categoriser_niveau(points: float) -> str:
    """Catégorise un joueur en avance / intermediaire / debutant."""
    if points is None:
        return "inconnu"
    if points >= LEVEL_THRESHOLDS["avance"]:
        return "avance"
    if points >= LEVEL_THRESHOLDS["intermediaire"]:
        return "intermediaire"
    return "debutant"


def classement_officiel(points: float) -> str:
    """Renvoie le libellé du classement officiel FFTT."""
    if points is None:
        return "Inconnu"
    for points_min, points_max, libelle in CLASSEMENTS_OFFICIELS:
        if points_min <= points <= points_max:
            return libelle
    return "Hors barème"


def parse_points(value) -> Optional[float]:
    """Parse une valeur de points depuis l'API FFTT."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace(",", ".").strip())
    except (ValueError, AttributeError):
        return None


# ==============================================================================
# SCRAPER 1 — Joueurs FFTT (échantillon multi-niveaux)
# ==============================================================================
_CLUB_LINK_RE = re.compile(
    r'href="/app/fftt/clubs/(?P<id>\d+)\?CLUB_NAME=(?P<nom>[^"]+)"',
    re.IGNORECASE,
)
_PLAYER_BLOCK_RE = re.compile(
    r'href="/app/fftt/licencies/(?P<licence>\d+)\?CLUB_ID=(?P<club_id>\d+)"'
    r'.*?<p>(?P<nom_complet>[^<]+)</p>'
    r'.*?<small[^>]*title="(?P<points_debut>[^"]*)"[^>]*>\s*(?P<points>[\d.]+)\s*</small>',
    re.DOTALL,
)
_NOM_PRENOM_RE = re.compile(r"^([A-ZÀ-Ý][A-ZÀ-Ý\s'\-]+?)\s+([A-ZÀ-Ý][a-zà-ÿ].*)$")
_RANG_BLOCK_RE = re.compile(
    r'<li class="item-container">.*?<p>(?P<libelle>[^<]+)</p>'
    r'.*?<small class="counter[^"]*">\s*(?P<rang>\d+)\s*</small>',
    re.DOTALL,
)
# Page /stats : "<p>108 matchs</p>", "<p>64 victoires</p>", "<p>44 défaites</p>"
# Singulier "défaite/match/victoire" possible quand 0 ou 1.
_STATS_MATCHS_RE = re.compile(r"<p>\s*(\d+)\s+matchs?\s*</p>", re.IGNORECASE)
_STATS_WIN_RE = re.compile(r"<p>\s*(\d+)\s+victoires?\s*</p>", re.IGNORECASE)
_STATS_LOSS_RE = re.compile(r"<p>\s*(\d+)\s+d[ée]faites?\s*</p>", re.IGNORECASE)


def _split_nom_prenom(nom_complet: str) -> tuple:
    """'DA SILVA Emmanuel' -> ('DA SILVA', 'Emmanuel')."""
    nom_complet = nom_complet.strip()
    m = _NOM_PRENOM_RE.match(nom_complet)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return nom_complet, ""


class FFTTPlayersScraper:
    """Scrape un échantillon multi-niveaux de joueurs FFTT via PingPocket (sans auth)."""

    def __init__(self, http: Optional[HttpClient] = None):
        self.http = http or HttpClient()
        logger.info("Source : PingPocket (partenaire officiel FFTT, sans authentification)")

    def _get(self, path: str) -> str:
        url = f"{PINGPOCKET_BASE}{path}"
        resp = self.http.get(url, headers=PINGPOCKET_AJAX_HEADERS)
        return resp.text

    def lister_clubs_departement(self, dep: str) -> list:
        # ctid = identifiant comité = numéro département (métropole)
        try:
            html = self._get(f"/app/fftt/clubs/form/resultats?NAME=&CLUB_ID=&ctid={dep}")
        except Exception as e:
            logger.warning(f"Erreur dep {dep}: {e}")
            return []
        clubs = []
        seen = set()
        for m in _CLUB_LINK_RE.finditer(html):
            club_id = m.group("id")
            if club_id in seen:
                continue
            seen.add(club_id)
            clubs.append(
                {
                    "numero": club_id,
                    "nom": unquote_plus(m.group("nom")),
                    "ville": "",
                }
            )
        return clubs

    def lister_joueurs_club(self, num_club: str) -> list:
        try:
            html = self._get(f"/app/fftt/clubs/{num_club}/licencies?SORT=OFFICIAL_RANK")
        except Exception:
            return []
        joueurs = []
        for m in _PLAYER_BLOCK_RE.finditer(html):
            try:
                points = float(m.group("points"))
            except (ValueError, TypeError):
                continue
            nom, prenom = _split_nom_prenom(m.group("nom_complet"))
            joueurs.append(
                {
                    "licence": m.group("licence"),
                    "nom": nom,
                    "prenom": prenom,
                    "points_elo": points,
                }
            )
        return joueurs

    def detail_rangs(self, licence: str) -> dict:
        """Récupère rang national / ligue / comité pour un joueur (page /rangs)."""
        try:
            html = self._get(f"/app/fftt/licencies/{licence}/rangs")
        except Exception:
            return {}
        rangs = {"rang_national": None, "rang_ligue": None, "rang_comite": None}
        for m in _RANG_BLOCK_RE.finditer(html):
            libelle = m.group("libelle").strip()
            rang = int(m.group("rang"))
            if libelle == "France":
                rangs["rang_national"] = rang
            elif libelle.startswith("Comité"):
                rangs["rang_comite"] = rang
            elif libelle and libelle not in ("",) and rangs["rang_ligue"] is None and not libelle.startswith("Comité") and libelle != "France":
                rangs["rang_ligue"] = rang
        return rangs

    def detail_stats(self, licence: str) -> dict:
        """Totaux carrière : matchs, victoires, défaites (page /stats)."""
        try:
            html = self._get(f"/app/fftt/licencies/{licence}/stats")
        except Exception:
            return {}
        out = {}
        m = _STATS_MATCHS_RE.search(html)
        v = _STATS_WIN_RE.search(html)
        d = _STATS_LOSS_RE.search(html)
        if m:
            out["nombre_matchs"] = int(m.group(1))
        if v:
            out["victoires"] = int(v.group(1))
        if d:
            out["defaites"] = int(d.group(1))
        return out

    def collecter_echantillon(self) -> Iterator[dict]:
        buckets = {n: [] for n in PLAYERS_SAMPLE}
        targets = PLAYERS_SAMPLE

        for dep in DEPARTEMENTS_PRIORITAIRES:
            if all(len(buckets[n]) >= targets[n] for n in targets):
                break
            logger.info(f"=== Département {dep} ===")
            clubs = self.lister_clubs_departement(dep)
            logger.info(f"  {len(clubs)} clubs trouvés")

            for club in clubs:
                if all(len(buckets[n]) >= targets[n] for n in targets):
                    break
                joueurs = self.lister_joueurs_club(club["numero"])
                for j in joueurs:
                    points = j.get("points_elo")
                    if points is None:
                        continue
                    niveau = categoriser_niveau(points)
                    if len(buckets[niveau]) >= targets[niveau]:
                        continue
                    rangs = self.detail_rangs(j["licence"])
                    stats = self.detail_stats(j["licence"])
                    total_buck = sum(len(b) for b in buckets.values())
                    logger.info(
                        f"  [{total_buck+1:>3}/300] {niveau:<13} "
                        f"{j['nom']:<20} {j['prenom']:<15} "
                        f"pts={points:<6} matchs={stats.get('nombre_matchs')} "
                        f"V={stats.get('victoires')} D={stats.get('defaites')}"
                    )
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
                        "classement_officiel": classement_officiel(points),
                        "niveau_categorie": niveau,
                        "nombre_matchs": stats.get("nombre_matchs"),
                        "victoires": stats.get("victoires"),
                        "defaites": stats.get("defaites"),
                    }
                    buckets[niveau].append(record)

        all_records = []
        for niveau in targets:
            all_records.extend(buckets[niveau])
            logger.info(f"Bucket {niveau}: {len(buckets[niveau])}/{targets[niveau]}")
        all_records.sort(key=lambda r: r["points_elo"], reverse=True)
        yield from all_records


# ==============================================================================
# SCRAPER 2 — Clubs FFTT (tous départements, pour la partie lieux)
# ==============================================================================
_CLUB_DETAIL_VILLE_RE = re.compile(
    r'<small[^>]*>\s*([0-9]{5})\s+([^<]+?)\s*</small>',
)


class FFTTClubsScraper:
    """Scrape tous les clubs FFTT de France via PingPocket (sans auth)."""

    def __init__(self, http: Optional[HttpClient] = None):
        self.http = http or HttpClient()

    def _get(self, path: str) -> str:
        url = f"{PINGPOCKET_BASE}{path}"
        resp = self.http.get(url, headers=PINGPOCKET_AJAX_HEADERS)
        return resp.text

    def detail_club(self, num_club: str) -> dict:
        try:
            html = self._get(f"/app/fftt/clubs/{num_club}")
        except Exception:
            return {}
        m = _CLUB_DETAIL_VILLE_RE.search(html)
        if not m:
            return {}
        return {"code_postal": m.group(1), "ville": m.group(2).strip(), "adresse": ""}

    def collecter_tous_clubs(self) -> Iterator[dict]:
        for dep in TOUS_DEPARTEMENTS:
            try:
                html = self._get(f"/app/fftt/clubs/form/resultats?NAME=&CLUB_ID=&ctid={dep}")
            except Exception as e:
                logger.warning(f"Dep {dep}: {e}")
                continue
            clubs_found = list(_CLUB_LINK_RE.finditer(html))
            logger.info(f"Dep {dep}: {len(clubs_found)} clubs")
            seen = set()
            for m in clubs_found:
                num = m.group("id")
                if num in seen:
                    continue
                seen.add(num)
                nom = unquote_plus(m.group("nom"))
                detail = self.detail_club(num)
                yield {
                    "nom": nom,
                    "type": "club_fftt",
                    "adresse": detail.get("adresse", ""),
                    "ville": detail.get("ville", ""),
                    "code_postal": detail.get("code_postal", ""),
                    "latitude": "",
                    "longitude": "",
                    "acces": "club",
                    "nb_tables": "",
                    "source": "fftt",
                }


# ==============================================================================
# SCRAPER 3 — Tables ping-pong OpenStreetMap (Overpass API)
# ==============================================================================
class OSMTablesScraper:
    """Scrape toutes les tables de ping-pong en France via OpenStreetMap."""

    def __init__(self, http: Optional[HttpClient] = None):
        self.http = http or HttpClient(delay_sec=2.0)

    def collecter_tables(self) -> Iterator[dict]:
        logger.info("Requête Overpass en cours (peut prendre 1-2 min)...")
        resp = self.http.post(OVERPASS_URL, data={"data": OVERPASS_QUERY_TABLES_FR})
        data = resp.json()
        elements = data.get("elements", [])
        logger.info(f"OSM : {len(elements)} éléments trouvés")

        for el in elements:
            tags = el.get("tags", {})
            if "lat" in el and "lon" in el:
                lat, lon = el["lat"], el["lon"]
            elif "center" in el:
                lat, lon = el["center"]["lat"], el["center"]["lon"]
            else:
                continue

            nom = tags.get("name") or tags.get("operator") or "Table de ping-pong"
            adresse = " ".join(
                p for p in [tags.get("addr:housenumber"), tags.get("addr:street")] if p
            ).strip()

            access = (tags.get("access") or "").lower()
            fee = (tags.get("fee") or "").lower()
            if access in ("yes", "public", "permissive") or fee == "no":
                acces = "libre"
            elif access in ("private", "no", "members"):
                acces = "club"
            elif fee == "yes":
                acces = "payant"
            else:
                acces = "inconnu"

            if tags.get("leisure") == "sports_centre":
                type_lieu = "centre_sportif"
            elif tags.get("amenity") == "school":
                type_lieu = "ecole"
            else:
                type_lieu = "table_publique"

            yield {
                "nom": nom,
                "type": type_lieu,
                "adresse": adresse,
                "ville": tags.get("addr:city", ""),
                "code_postal": tags.get("addr:postcode", ""),
                "latitude": lat,
                "longitude": lon,
                "acces": acces,
                "nb_tables": tags.get("tables", ""),
                "source": "osm",
            }


# ==============================================================================
# SCRAPER 4 — data.gouv.fr (Recensement Équipements Sportifs)
# ==============================================================================
class DataGouvESScraper:
    """Scrape les équipements sportifs (tennis de table) du Ministère des Sports."""

    def __init__(self, http: Optional[HttpClient] = None):
        self.http = http or HttpClient()

    def collecter_equipements(self) -> Iterator[dict]:
        offset = 0
        limit = 100
        total_received = 0
        params_base = {
            "where": "search(equip_aps_nom, 'tennis de table')",
            "limit": limit,
        }

        while True:
            params = {**params_base, "offset": offset}
            try:
                resp = self.http.get(DATA_ES_URL, params=params)
                data = resp.json()
            except Exception as e:
                logger.error(f"Erreur data.gouv : {e}")
                break

            results = data.get("results", [])
            if not results:
                break

            for rec in results:
                coord = rec.get("coordonnees") or {}
                lat = coord.get("lat") or rec.get("equip_y")
                lon = coord.get("lon") or rec.get("equip_x")

                proprio = (rec.get("equip_propr_label") or "").lower()
                if any(k in proprio for k in ("commune", "etat", "département", "région", "public")):
                    acces = "libre"
                elif "association" in proprio or "club" in proprio:
                    acces = "club"
                elif "privé" in proprio or "société" in proprio:
                    acces = "payant"
                else:
                    acces = "inconnu"

                yield {
                    "nom": rec.get("equip_nom") or rec.get("inst_nom") or "Équipement",
                    "type": "equipement_sportif",
                    "adresse": rec.get("inst_adresse") or rec.get("equip_adresse", ""),
                    "ville": rec.get("inst_com_lib", ""),
                    "code_postal": rec.get("inst_cp", ""),
                    "latitude": lat or "",
                    "longitude": lon or "",
                    "acces": acces,
                    "nb_tables": rec.get("equip_nbterrain", ""),
                    "source": "data_gouv",
                }
                total_received += 1

            offset += limit
            total_count = data.get("total_count", 0)
            logger.info(f"data.gouv : {total_received}/{total_count}")
            if offset >= total_count:
                break


# ==============================================================================
# COMMANDES PRINCIPALES
# ==============================================================================
def run_players():
    """Lance le scraper de joueurs FFTT."""
    logger.info("=" * 60)
    logger.info(f"SCRAPER JOUEURS FFTT — Objectif : {PLAYERS_SAMPLE}")
    logger.info("=" * 60)

    scraper = FFTTPlayersScraper()
    records = list(scraper.collecter_echantillon())

    if not records:
        logger.error("❌ Aucun joueur collecté.")
        return False

    n = write_csv(PLAYERS_CSV, records, PLAYER_FIELDNAMES)
    logger.info(f"✅ {n} joueurs écrits dans {PLAYERS_CSV}")

    summary = {}
    for r in records:
        summary[r["niveau_categorie"]] = summary.get(r["niveau_categorie"], 0) + 1
    logger.info(f"Répartition : {summary}")
    return True


def run_locations(skip_fftt: bool = False, skip_osm: bool = False, skip_datagouv: bool = False):
    """Lance le scraper de lieux (clubs FFTT + tables OSM + data.gouv)."""
    logger.info("=" * 60)
    logger.info("SCRAPER LIEUX")
    logger.info("=" * 60)

    all_records = []

    if not skip_fftt:
        logger.info(">>> Clubs FFTT...")
        try:
            for r in FFTTClubsScraper().collecter_tous_clubs():
                all_records.append(r)
        except Exception as e:
            logger.error(f"Erreur FFTT : {e}")

    if not skip_osm:
        logger.info(">>> OpenStreetMap...")
        try:
            for r in OSMTablesScraper().collecter_tables():
                all_records.append(r)
        except Exception as e:
            logger.error(f"Erreur OSM : {e}")

    if not skip_datagouv:
        logger.info(">>> data.gouv.fr...")
        try:
            for r in DataGouvESScraper().collecter_equipements():
                all_records.append(r)
        except Exception as e:
            logger.error(f"Erreur data.gouv : {e}")

    if not all_records:
        logger.error("❌ Aucun lieu collecté.")
        return False

    # Déduplication
    seen = set()
    deduped = []
    for r in all_records:
        try:
            lat = round(float(r["latitude"]), 4) if r["latitude"] else None
            lon = round(float(r["longitude"]), 4) if r["longitude"] else None
        except (ValueError, TypeError):
            lat, lon = None, None
        key = (r["nom"].lower().strip(), r["ville"].lower().strip(), lat, lon)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)

    logger.info(f"Avant dédup : {len(all_records)}, après : {len(deduped)}")

    n = write_csv(LOCATIONS_CSV, deduped, LOCATION_FIELDNAMES)
    logger.info(f"✅ {n} lieux écrits dans {LOCATIONS_CSV}")

    summary = {}
    for r in deduped:
        summary[r["source"]] = summary.get(r["source"], 0) + 1
    logger.info(f"Par source : {summary}")
    return True


# ==============================================================================
# CLI
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="🏓 Scraper PingPong France (joueurs FFTT + lieux pour jouer)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "command",
        choices=["players", "locations", "all"],
        help="Que scraper : 'players' (joueurs), 'locations' (lieux), 'all' (les deux)",
    )
    parser.add_argument(
        "--skip-fftt", action="store_true", help="Ne pas scraper les clubs FFTT (locations)"
    )
    parser.add_argument(
        "--skip-osm", action="store_true", help="Ne pas scraper OpenStreetMap (locations)"
    )
    parser.add_argument(
        "--skip-datagouv", action="store_true", help="Ne pas scraper data.gouv.fr (locations)"
    )
    parser.add_argument("--debug", action="store_true", help="Logs verbeux")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    success = True

    if args.command in ("players", "all"):
        success = run_players() and success

    if args.command in ("locations", "all"):
        success = (
            run_locations(
                skip_fftt=args.skip_fftt,
                skip_osm=args.skip_osm,
                skip_datagouv=args.skip_datagouv,
            )
            and success
        )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

