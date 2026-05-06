"""
================================================================================
PINGPONG USA SCRAPER (USATT + MLTT) — Joueurs américains inscrits en clubs
================================================================================

Le portail USATT (usatt.simplycompete.com) est protégé par Cloudflare et le
nouveau ratings.usatt.org est rendu via JustGo (JS-only). Ces sources ne
sont pas accessibles en scraping HTTP simple.

Solution : on agrège **2 sources publiques** :

  1. **US National Team Rankings** — Google Sheets publiques publiées par
     USATT (Men, Women, Junior). ~240 joueurs avec rang et points.

  2. **MLTT (Major League Table Tennis)** — équipes pro US, 10 teams,
     ~80 joueurs avec club d'appartenance.

Les joueurs apparaissant dans les 2 sources gardent leur club MLTT (préféré).
Sinon, le club est "USA National Team (USATT)".

Niveaux :
  - avance        = Top par points (Tier 1 national / pros MLTT)
  - intermediaire = Tier 2
  - debutant      = Tier 3 / Junior bas

Sortie : data/players_usa.csv

Utilisation :
  python pingpong_usa.py
  python pingpong_usa.py --debug
================================================================================
"""

import argparse
import csv
import logging
import re
import sys
import time
from pathlib import Path
from typing import Iterable, Optional

import requests
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential


# ==============================================================================
# CONFIGURATION
# ==============================================================================
ROOT_DIR = Path(__file__).parent
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
PLAYERS_CSV = DATA_DIR / "players_usa.csv"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) "
    "Gecko/20100101 Firefox/124.0"
)
DELAY_SEC = 1.5
TIMEOUT_SEC = 60
MAX_RETRIES = 3

# Google Sheets exposés par usatt.org/national-team-rankings
# Format CSV via gviz/tq?tqx=out:csv (export public, sans login)
GSHEET_URLS = {
    "Men": "https://docs.google.com/spreadsheets/d/1raRTt5FbMDuj3TlMjIQqSx2lcv6yL8bkrx15gKJcrCY/gviz/tq?tqx=out:csv",
    "Women": "https://docs.google.com/spreadsheets/d/1yQY0DtVjKL6617Y8D7-eIRAL1LIICY_D-LhRjkPg6eY/gviz/tq?tqx=out:csv",
    "Junior": "https://docs.google.com/spreadsheets/d/1WkKSDXXgglu0rO7e-yFu-kVTjd4WbAqiv8ehh4Pj-7A/gviz/tq?tqx=out:csv",
}

# MLTT teams (https://www.mltt.com/teams)
MLTT_TEAMS = [
    "atlanta-blazers",
    "florida-crocs",
    "carolina-gold-rush",
    "new-york-slice",
    "princeton-revolution",
    "chicago-wind",
    "bay-area-blasters",
    "los-angeles-spinners",
    "texas-smash",
    "portland-paddlers",
]
MLTT_BASE = "https://www.mltt.com/mltt-team/"

# Mapping slug -> nom officiel équipe
MLTT_TEAM_NAMES = {
    "atlanta-blazers": "Atlanta Blazers",
    "florida-crocs": "Florida Crocs",
    "carolina-gold-rush": "Carolina Gold Rush",
    "new-york-slice": "New York Slice",
    "princeton-revolution": "Princeton Revolution",
    "chicago-wind": "Chicago Wind",
    "bay-area-blasters": "Bay Area Blasters",
    "los-angeles-spinners": "Los Angeles Spinners",
    "texas-smash": "Texas Smash",
    "portland-paddlers": "Portland Paddlers",
}

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

logger = logging.getLogger(__name__)


# ==============================================================================
# CLIENT HTTP
# ==============================================================================
class HttpClient:
    def __init__(self, delay_sec: float = DELAY_SEC):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self.delay_sec = delay_sec
        self._last_request_time = 0.0

    def _wait(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self.delay_sec:
            time.sleep(self.delay_sec - elapsed)
        self._last_request_time = time.time()

    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=2, min=4, max=30),
        retry=retry_if_exception_type((requests.RequestException,)),
        reraise=True,
    )
    def get(self, url: str, **kwargs) -> requests.Response:
        self._wait()
        resp = self.session.get(url, timeout=TIMEOUT_SEC, **kwargs)
        resp.raise_for_status()
        return resp


# ==============================================================================
# UTILS
# ==============================================================================
def write_csv(path: Path, rows: Iterable[dict], fieldnames: list) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            count += 1
    return count


def split_name(full: str) -> tuple:
    """Retourne (NOM_MAJ, Prenom). Convention CSV identique aux autres pays."""
    full = full.strip()
    if not full:
        return "", ""
    # Format "Last, First" (junior sheet)
    if "," in full:
        parts = [p.strip() for p in full.split(",", 1)]
        if len(parts) == 2:
            return parts[0].upper(), parts[1]
    # Format "First Last" — on prend le dernier mot comme nom
    parts = full.split()
    if len(parts) == 1:
        return parts[0].upper(), ""
    return parts[-1].upper(), " ".join(parts[:-1])


def normalize_key(nom: str, prenom: str) -> str:
    """Clé de dédup : NOM PRENOM en majuscules sans accents/ponctuation."""
    s = f"{nom} {prenom}".upper().strip()
    return re.sub(r"[^A-Z0-9 ]", "", s)


# ==============================================================================
# SOURCE 1 — Google Sheets US National Team
# ==============================================================================
def parse_national_team_csv(text: str, category: str) -> list:
    """Parse un CSV Google Sheets (Men / Women / Junior) en liste de dicts.

    Hommes/Femmes : "Ranking, First name, Last name, 2026 Total Points, ..."
    Junior        : "Rank, Name (Last, First), Total Points, ..."
    """
    reader = csv.reader(text.splitlines())
    rows = list(reader)
    if not rows:
        return []
    header = [h.strip() for h in rows[0]]
    data = rows[1:]

    out = []
    for row in data:
        # Skip si pas assez de colonnes ou ranking vide
        if len(row) < 3:
            continue
        rank_str = row[0].strip()
        if not rank_str.isdigit():
            continue
        rank = int(rank_str)

        if category == "Junior":
            # Une seule colonne "Name" en "Last, First"
            full_name = row[1].strip().strip('"')
            nom, prenom = split_name(full_name)
            try:
                pts = int(row[2].replace(",", "").strip())
            except (ValueError, IndexError):
                pts = 0
        else:
            # Adultes : First / Last séparés
            first = row[1].strip().strip('"')
            last = row[2].strip().strip('"')
            nom, prenom = last.upper(), first
            try:
                pts = int(row[3].replace(",", "").strip())
            except (ValueError, IndexError):
                pts = 0

        if not nom:
            continue
        out.append({
            "nom": nom,
            "prenom": prenom,
            "rank_in_category": rank,
            "points": pts,
            "category": category,
        })
    return out


def collecter_national_team(http: HttpClient) -> list:
    """Télécharge les 3 sheets et retourne tous les joueurs."""
    all_players = []
    for cat, url in GSHEET_URLS.items():
        logger.info(f"GET US National Team — {cat}")
        try:
            resp = http.get(url)
        except Exception as e:
            logger.error(f"  Sheet {cat} : {e}")
            continue
        players = parse_national_team_csv(resp.text, cat)
        logger.info(f"  -> {len(players)} joueurs ({cat})")
        all_players.extend(players)
    return all_players


# ==============================================================================
# SOURCE 2 — MLTT (Major League Table Tennis)
# ==============================================================================
# Pattern HTML : noms dans des cards <div class="...">Player Name</div>
# Utilisation d'un regex tolérant pour extraire les noms autour des liens
# /team-members/<slug>
_MLTT_PLAYER_RE = re.compile(
    r'href="[^"]*/team-members/([^"]+)"[^>]*>\s*[^<]*?'
    r'(?:<[^>]*>\s*)*([A-Z][A-Za-z\'\-]+(?:\s+[A-Z][A-Za-z\'\-]+){0,3})',
    re.DOTALL,
)


def slug_to_name(slug: str) -> str:
    """'jiwei-xia' -> 'Jiwei Xia' ; nettoie 'coach-' / surnoms entre tirets."""
    s = slug.replace("coach-", "")
    parts = s.split("-")
    # Garder seulement les vrais éléments du nom (max 3 mots, capitalisés)
    return " ".join(p.capitalize() for p in parts if len(p) > 1)[:80]


def parse_mltt_team(html: str) -> list:
    """Extrait les slugs /team-members/ de la page d'équipe."""
    slugs = re.findall(r'href="[^"]*/team-members/([a-z0-9\-]+)"', html)
    seen = set()
    players = []
    for slug in slugs:
        if slug in seen or slug.startswith("coach"):
            continue
        seen.add(slug)
        full_name = slug_to_name(slug)
        nom, prenom = split_name(full_name)
        if nom:
            players.append({
                "nom": nom,
                "prenom": prenom,
                "slug": slug,
            })
    return players


def collecter_mltt(http: HttpClient) -> dict:
    """Retourne {slug -> {nom, prenom, club_nom}} pour tous les joueurs MLTT."""
    by_slug = {}
    for team_slug in MLTT_TEAMS:
        url = MLTT_BASE + team_slug
        team_name = MLTT_TEAM_NAMES[team_slug]
        logger.info(f"GET MLTT — {team_name}")
        try:
            resp = http.get(url)
        except Exception as e:
            logger.error(f"  Team {team_slug} : {e}")
            continue
        players = parse_mltt_team(resp.text)
        logger.info(f"  -> {len(players)} joueurs")
        for p in players:
            by_slug[p["slug"]] = {
                "nom": p["nom"],
                "prenom": p["prenom"],
                "club_nom": team_name,
            }
    return by_slug


# ==============================================================================
# CONSOLIDATION
# ==============================================================================
def libelle_classement(points: int, category: str, has_mltt: bool) -> str:
    """Étiquette de classement officiel descriptive."""
    if has_mltt:
        if points >= 30000:
            return "Pro MLTT + National Team Top"
        return "Pro MLTT (Major League)"
    if category == "Men":
        if points >= 30000:
            return "US National Team Men (Top)"
        if points >= 10000:
            return "US National Team Men"
        return "US National Team Men (Reserve)"
    if category == "Women":
        if points >= 30000:
            return "US National Team Women (Top)"
        if points >= 10000:
            return "US National Team Women"
        return "US National Team Women (Reserve)"
    if category == "Junior":
        return "US Junior National Team"
    return "USATT Member"


def consolider(nt_players: list, mltt_by_slug: dict) -> list:
    """Fusionne National Team + MLTT sur la base du nom, puis classifie."""
    # Index MLTT par clé NOM PRENOM
    mltt_by_key = {}
    for slug, p in mltt_by_slug.items():
        key = normalize_key(p["nom"], p["prenom"])
        mltt_by_key[key] = p

    # Index national team par clé (peut avoir doublons entre Men/Junior)
    nt_by_key = {}
    for p in nt_players:
        key = normalize_key(p["nom"], p["prenom"])
        if key not in nt_by_key:
            nt_by_key[key] = p
        else:
            # Garder celui avec le plus de points
            if p["points"] > nt_by_key[key]["points"]:
                nt_by_key[key] = p

    # Fusion : tous les joueurs uniques (NT ∪ MLTT)
    all_keys = set(nt_by_key.keys()) | set(mltt_by_key.keys())

    records = []
    for key in all_keys:
        nt = nt_by_key.get(key)
        mltt = mltt_by_key.get(key)

        # Détermine nom/prenom (priorité NT car plus fiable)
        if nt:
            nom = nt["nom"]
            prenom = nt["prenom"]
        else:
            nom = mltt["nom"]
            prenom = mltt["prenom"]

        # Club : MLTT si dispo, sinon "USA National Team"
        if mltt:
            club_nom = mltt["club_nom"]
        else:
            club_nom = "USA National Team (USATT)"

        # Stats nationales
        points = nt["points"] if nt else 0
        rank = nt["rank_in_category"] if nt else None
        category = nt["category"] if nt else "MLTT"
        has_mltt = mltt is not None

        records.append({
            "nom": nom,
            "prenom": prenom,
            "club_nom": club_nom,
            "points": points,
            "rank_in_category": rank,
            "category": category,
            "has_mltt": has_mltt,
        })

    # Classification par tertiles sur les points (descendant)
    records.sort(key=lambda r: r["points"], reverse=True)
    n = len(records)
    out = []
    for i, r in enumerate(records):
        if i < n / 3:
            niveau = "avance"
        elif i < 2 * n / 3:
            niveau = "intermediaire"
        else:
            niveau = "debutant"
        out.append({
            "licence": "",
            "nom": r["nom"],
            "prenom": r["prenom"],
            "ville": "",
            "club_nom": r["club_nom"],
            "club_ville": "",
            "points_elo": r["points"] if r["points"] else "",
            "rang_national": i + 1,    # rang dans notre échantillon trié
            "rang_ligue": r["rank_in_category"],
            "rang_comite": None,
            "classement_officiel": libelle_classement(
                r["points"], r["category"], r["has_mltt"]
            ),
            "niveau_categorie": niveau,
            "nombre_matchs": None,
            "victoires": None,
            "defaites": None,
        })
    return out


# ==============================================================================
# MAIN
# ==============================================================================
def run_players():
    logger.info("=" * 70)
    logger.info("SCRAPER JOUEURS USA — USATT National Team + MLTT pro league")
    logger.info("=" * 70)

    http = HttpClient()

    nt_players = collecter_national_team(http)
    logger.info(f"Total National Team : {len(nt_players)} joueurs")

    mltt_by_slug = collecter_mltt(http)
    logger.info(f"Total MLTT : {len(mltt_by_slug)} joueurs uniques")

    records = consolider(nt_players, mltt_by_slug)
    logger.info(f"Total fusionné : {len(records)} joueurs uniques")

    if not records:
        logger.error("Aucun joueur collecté.")
        return False

    n = write_csv(PLAYERS_CSV, records, PLAYER_FIELDNAMES)
    logger.info(f"OK : {n} joueurs ecrits dans {PLAYERS_CSV}")

    # Stats
    from collections import Counter
    by_niveau = Counter(r["niveau_categorie"] for r in records)
    by_club = Counter(r["club_nom"] for r in records)
    logger.info(f"Par niveau : {dict(by_niveau)}")
    logger.info(f"Top clubs : {by_club.most_common(5)}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Scraper PingPong USA (USATT NT + MLTT pro)."
    )
    parser.add_argument("--debug", action="store_true", help="Logs verbeux")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    success = run_players()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
