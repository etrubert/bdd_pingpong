# Instructions d'intégration — Patch v10 (5 vignettes vidéo directement dans l'onglet)

Ce patch supprime le système intermédiaire des « cartes de séance » dans TRAIN
et le remplace par une **grille de 5 vignettes vidéo directement visibles**
dans chaque onglet de niveau.

Basé sur l'état actuel du repo `main` (commit `48a41ff`).

---

## APPLIQUER LE PATCH

```bash
git apply --check pingpang_changes_v10.patch
git apply --whitespace=nowarn pingpang_changes_v10.patch
cd Strav_pingpang && npm install && npm run build
```

En cas de conflit : `git apply --3way pingpang_changes_v10.patch`.

---

## CE QUI CHANGE

### Avant
TRAIN → onglet DÉBUTANT → 2 cartes « Séance » → clic sur séance → sheet
avec les vidéos en interne.

### Après
TRAIN → onglet DÉBUTANT → **5 vignettes vidéo directement visibles**.
Clic sur n'importe quelle vignette → ouverture en **lightbox plein écran
16:9 horizontal**, lecture automatique.

### Contenu
- **DÉBUTANT** — 5 vidéos : grip, coup droit, revers, push, premier service
- **INTERMÉDIAIRE** — 5 vidéos : top-spin CD/revers, top sur coupée,
  améliorer CD, backhand flick, flick simple
- **EXPERT** — 5 vidéos : top revers Zhang Jike, Chinese style, ITTF
  Michael Maze, pendulum 3 clés, secrets de Timo Boll

### Chaque vignette affiche
- Miniature YouTube HD (avec fallback automatique sur la première image
  de la vidéo si la HD n'est pas dispo)
- Bouton play centré
- Titre du geste
- Durée à droite (couleur or)
- Description courte (1 phrase) sous le titre

### Lightbox plein écran
- Format 16:9 horizontal (`min(95vw, 90vh × 16/9)`)
- Fond noir opaque
- Autoplay au clic
- Fermeture : clic à l'extérieur, bouton X, ou touche Échap
- Scroll du body verrouillé pendant l'affichage

---

## FICHIERS TOUCHÉS (2)

Modifiés :
- `src/lib/sessions.js` — restructuré : tableau plat `VIDEOS` au lieu de
  `SESSIONS` avec étapes imbriquées. `SESSION_PHASES` n'est plus exporté
  (plus utilisé).
- `src/screens/TrainScreen.jsx` — réécrit avec composants `VideoCard`,
  `VideoThumb`, `VideoLightbox` et `VideosLibrary`.

Aucun nouveau fichier. Aucun script Python touché. Build testé OK sur
clone frais.

---

## NOTE DE COMPATIBILITÉ

L'ancienne structure exportée (`SESSIONS`, `SESSION_PHASES`) n'existe plus.
Si un autre fichier importait ces noms, l'import échouera. J'ai vérifié
qu'aucun autre fichier du projet ne les utilise. Au cas où tu aurais ajouté
des références ailleurs depuis, regarde dans les logs du build.

Pour ajouter une vidéo, édite simplement `src/lib/sessions.js` et ajoute
un objet à `VIDEOS` :

```js
{
  id: 'd6', level: 'DÉBUTANT',
  title: 'Mon nouveau geste',
  desc: 'Description courte en une phrase.',
  duration: '5 min',
  video: 'https://www.youtube.com/embed/VIDEO_ID',
},
```
