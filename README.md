## PingPong France — Scraper

Script unique pour scraper :
- **Joueurs FFTT** (échantillon multi-niveaux)
- **Lieux pour jouer** (clubs FFTT + tables OpenStreetMap + équipements `data-es` via data.gouv)

### Installation

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Windows (PowerShell)

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### Windows (CMD)

```bat
py -m venv .venv
.\.venv\Scripts\activate.bat
pip install -r requirements.txt
```

### Clonage sur Windows (important)

Si le dépôt / dossier s’appelle `Joueurs : maps`, Windows ne peut pas créer un répertoire contenant `:`. Contournement simple: choisir un nom de dossier sans `:` au moment du clone.

```bash
git clone <URL_DU_DEPOT> joueurs-maps
cd joueurs-maps
```

### Authentification FFTT (optionnelle)

Crée un fichier `.env` à la racine avec :

```bash
FFTT_API_ID=...
FFTT_API_PASSWORD=...
```

### Utilisation

```bash
python pingpong_france.py players
python pingpong_france.py locations
python pingpong_france.py all

# Exemples de skips
python pingpong_france.py locations --skip-osm --skip-datagouv
```

### Sorties

- `data/players.csv`
- `data/locations.csv`
