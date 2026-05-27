# Instructions d'intégration — Patch v2 (Ping Pang Paris)

⚠️ **Pré-requis** : le **patch v1** (`pingpang_changes.patch`) doit DÉJÀ être appliqué.
Ce patch v2 vient PAR-DESSUS. Si tu n'as pas appliqué le v1, fais-le d'abord.

---

## APPLIQUER LE PATCH

Place `pingpang_changes_v2.patch` à la racine du repo (à côté de `Strav_pingpang/`), puis :

```bash
git apply --check pingpang_changes_v2.patch        # vérifie sans rien modifier
git apply --whitespace=nowarn pingpang_changes_v2.patch
```

S'il y a un conflit (tu as modifié les mêmes fichiers entre-temps) :

```bash
git apply --3way pingpang_changes_v2.patch
```

Puis builder :

```bash
cd Strav_pingpang && npm install && npm run build
```

---

## CE QUE CONTIENT LE PATCH V2 (6 changements)

### Ch.1 — Podium du classement streak
`StreakCard.jsx` : le top 3 du classement de streak est maintenant affiché en
**podium 3D** (1er surélevé + couronne, 2e/3e sur les côtés), même style que le
podium du Leaderboard mondial. Le reste du classement est listé à partir du 4e.

### Ch.2 — Écran TRAIN épuré
`TrainScreen.jsx` : tout le contenu généré (Hero, sélecteur de style, focus,
output de drills, trajectory analysis) a été **supprimé**. Il ne reste que les
**séances guidées** (échauffement → exercices → récup), avec un nouvel en-tête.

### Ch.3 — Géolocalisation en direct (style Strava)
- Nouveau `src/lib/liveLocation.js` : suivi continu via `watchPosition` dans un
  store global → la carte suit l'utilisateur en temps réel partout dans l'app.
- Nouveau `src/components/LocationConsent.jsx` : **popup de consentement** (modal
  Accepter / Plus tard) affiché au-dessus de toute l'app (via `App.jsx`).
- `FinderScreen.jsx` branché sur ce hook partagé (remplace l'ancien
  `getCurrentPosition` ponctuel).

### Ch.4 — Classement mondial fiable
⏸️ **NON FAIT volontairement** — en attente du scraping du vrai classement ITTF.
Le classement mondial actuel (normalisation par rang national) reste en place.

### Ch.5 — Suppression de Merch
`BottomNav.jsx`, `App.jsx`, `HomeScreen.jsx` : l'onglet MERCH et la section
boutique du Home sont retirés. Le fichier `MerchScreen.jsx` reste sur le disque
(non référencé) au cas où tu veux le réactiver — aucun autre fichier perturbé.

### Ch.6 — Classement par club
`Leaderboard.jsx` + `worldPlayers.js` : le filtre « club » devient un **sélecteur
de club avec recherche** (parmi les 473 clubs présents dans les données scrapées).
Chaque club affiche le classement interne de ses joueurs, trié par ELO.

---

## FICHIERS TOUCHÉS (10)

Modifiés : `App.jsx`, `components/BottomNav.jsx`, `components/StreakCard.jsx`,
`lib/worldPlayers.js`, `screens/FinderScreen.jsx`, `screens/HomeScreen.jsx`,
`screens/Leaderboard.jsx`, `screens/TrainScreen.jsx`

Nouveaux : `components/LocationConsent.jsx`, `lib/liveLocation.js`

Aucun script Python touché. Le build passe (testé sur un clone frais avec v1+v2).

---

## NOTE — test du suivi live (ch.3)

Le suivi `watchPosition` ne fonctionne qu'en **HTTPS** (ou `localhost`). En dev
local (`npm run dev`), localhost suffit. En production, assure-toi que le site
est servi en HTTPS, sinon le navigateur bloque la géolocalisation.
