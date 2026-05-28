# Instructions d'intégration — Patch v7 (Vidéos visibles dans l'app)

Ce patch corrige le souci d'affichage des vidéos dans TRAIN : au lieu du
placeholder « PHOTO / VIDÉO À VENIR », les cartes affichent maintenant la
**miniature YouTube** de la première vidéo, et les vidéos sont directement
**lisibles dans l'app** (iframe YouTube embed, pas de redirection).

⚠️ Ce patch est **autonome** (il contient aussi les 18 vidéos et les onglets
de niveau du patch v6). Donc :
- Si v6 n'a PAS été appliqué → applique directement v7, il fait tout.
- Si v6 a déjà été appliqué → utilise `git apply --3way` pour merger.

Basé sur l'état du repo `main` (commit `7059ec7`).

---

## APPLIQUER LE PATCH

```bash
git apply --check pingpang_changes_v7.patch
git apply --whitespace=nowarn pingpang_changes_v7.patch
cd Strav_pingpang && npm install && npm run build
```

En cas de conflit (si v5/v6 déjà appliqué) :
```bash
git apply --3way pingpang_changes_v7.patch
```

---

## CE QUI CHANGE

### Sur la carte de séance
- Le placeholder « PHOTO / VIDÉO À VENIR » est remplacé par la **miniature
  YouTube HD** (`hqdefault.jpg`) de la première vidéo de la séance.
- Un bouton play rond bien visible est centré dessus.
- L'aperçu de carte reste cliquable (ouvre le sheet de séance).

### Dans le sheet (détail d'une séance)
- **Couverture du sheet** : utilise la première vidéo de la séance (200 px
  de hauteur, directement lisible).
- **Chaque étape avec vidéo** : iframe YouTube agrandi (200 px), lisible
  dans l'app — clic sur play, ça démarre.
- **Description sous la vidéo** : mieux mise en valeur (séparateur visuel,
  taille 13.5 px, couleur blanche atténuée au lieu du gris).

### Composant technique
- Nouvelle fonction `youtubeIdFrom(url)` qui extrait l'ID d'une URL
  YouTube (embed/watch/youtu.be).
- Nouveau composant `VideoThumbnail` qui génère la miniature HD à partir
  de l'ID (`https://img.youtube.com/vi/<ID>/hqdefault.jpg`).
- L'iframe YouTube reçoit maintenant la `allow` policy complète
  (autoplay, fullscreen, picture-in-picture, etc.).

---

## FICHIERS TOUCHÉS (2)

Modifiés : `src/lib/sessions.js`, `src/screens/TrainScreen.jsx`.

Aucun nouveau fichier. Aucun script Python touché. Build testé OK sur
clone frais.

---

## NOTE SUR LES MINIATURES YOUTUBE

Les miniatures YouTube `hqdefault.jpg` sont servies par
`https://img.youtube.com/` — c'est l'URL officielle de YouTube et
elle ne nécessite ni authentification ni clé API. Ça fonctionne hors-ligne
côté serveur mais pas pour l'utilisateur (qui a besoin d'internet pour les
charger, comme pour la vidéo elle-même).
