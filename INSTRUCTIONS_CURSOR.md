# Instructions d'intégration — Ping Pang Paris

Ce patch contient **5 changements** sur l'app (frontend Vite + React, dans `Strav_pingpang/`).
Aucun script Python à la racine n'est touché.

---

## ÉTAPE 1 — Appliquer le patch

Place le fichier `pingpang_changes.patch` à la **racine du repo** (à côté du dossier `Strav_pingpang/`), puis lance :

```bash
git apply pingpang_changes.patch
```

Si `git apply` refuse à cause des fins de ligne Windows (CRLF), utilise :

```bash
git apply --whitespace=nowarn pingpang_changes.patch
```

En dernier recours (3-way merge sur la branche courante) :

```bash
git apply --3way pingpang_changes.patch
```

## ÉTAPE 2 — Installer et builder

```bash
cd Strav_pingpang
npm install
npm run build
```

Le build doit passer sans erreur (le warning sur la taille de chunk est préexistant et sans gravité).

---

## CE QUE LE PATCH AJOUTE / MODIFIE

### Fichiers NOUVEAUX
- `Strav_pingpang/src/lib/worldPlayers.js` — classement mondial unifié (CSV normalisés + Supabase)
- `Strav_pingpang/src/lib/loginStreak.js` — tracking du streak de connexion (localStorage)
- `Strav_pingpang/src/lib/streakBoard.js` — données + codes promo mockés du classement streak
- `Strav_pingpang/src/lib/sessions.js` — séances d'entraînement guidées (avec emplacements média)
- `Strav_pingpang/src/components/StreakCard.jsx` — carte streak pour le Home
- `Strav_pingpang/public/data/players_*.csv` — 6 CSV joueurs (copiés depuis la racine vers public/ pour être servis par Vite)
- `Strav_pingpang/public/media/sessions/README.md` — où déposer les photos/vidéos des séances

### Fichiers MODIFIÉS
- `src/App.jsx` — état partagé `merchProduct` (Home → Merch)
- `src/screens/HomeScreen.jsx` — ajout de la `StreakCard` + section boutique en bas
- `src/screens/MerchScreen.jsx` — refactor : exports `useMerchProducts`, `ProductCard`, `ProductDetail`, `MerchHomeSection`
- `src/screens/Leaderboard.jsx` — utilise le classement mondial fusionné au lieu de Supabase seul
- `src/screens/TrainScreen.jsx` — ajout de la section « Séances guidées »

---

## RÉSUMÉ DES 5 CHANGEMENTS

1. **Boutique en bas du Home** — la grille produits Merch apparaît en bas du HomeScreen ; tap sur un produit → onglet MERCH avec la fiche ouverte.
2. **Classement streak de connexion** — carte dédiée sur le Home. Compte les jours consécutifs d'ouverture. Top 3 = codes promo boutique tous les 3 mois (saison trimestrielle). Codes mockés.
3. **Séances d'entraînement** — dans TRAIN, bibliothèque de séances complètes (échauffement → exercices → récup). Chaque étape a un emplacement photo/vidéo (placeholder tant que non rempli).
4. **Géolocalisation** — déjà présente dans FINDER (non modifiée), opt-in utilisateur, liens Google Maps.
5. **Classement mondial ELO** — fusionne les ~2400 joueurs scrapés (6 fédérations) avec les joueurs Supabase de l'app. Les ELO sont normalisés par RANG NATIONAL en percentile (les points_elo bruts ne sont pas comparables entre pays).

---

## APRÈS INTÉGRATION — à faire par l'équipe

- **Médias des séances (ch.3)** : déposer les photos/vidéos dans `public/media/sessions/` et renseigner les chemins dans `src/lib/sessions.js` (voir le README de ce dossier).
- **Streak en prod (ch.2)** : le streak est actuellement en localStorage. Pour un classement réel multi-utilisateurs, créer une table Supabase `login_streaks` et remplacer `MOCK_STREAK_BOARD` dans `streakBoard.js`.
- **Classement mondial (ch.5)** : si l'équipe préfère à terme tout passer en base, importer les CSV dans Supabase plutôt que les charger côté front. Le module `worldPlayers.js` reste le point central à adapter.
