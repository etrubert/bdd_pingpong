## PingPong France — Scraper

### Application web

L'application React/Vite est dans `Strav_pingpang`, mais les scripts npm sont aussi disponibles depuis la racine du projet.

```bash
npm run dev
```

Si les dependances de l'application ne sont pas encore installees :

```bash
npm run install:app
npm run dev
```

Commandes utiles :

```bash
npm run build
npm run preview
npm run lint
```

Les scripts Python, CSV, JSON et GeoJSON restent a la racine du depot. L'app web reste dans `Strav_pingpang` pour garder le frontend separe des fichiers de donnees et de scraping.

---

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
