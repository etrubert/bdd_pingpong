# Médias des séances d'entraînement

Dépose ici les **photos** et **vidéos** des séances guidées (changement 3).

## Comment ça marche

1. Place tes fichiers dans ce dossier, par exemple :
   - `public/media/sessions/topspin-warmup.jpg`
   - `public/media/sessions/topspin-drill1.mp4`

2. Renseigne le chemin dans `src/lib/sessions.js`, sur l'étape concernée :

   ```js
   { phase: 'exercise', title: 'Top-spin sur coupé', duration: '12 min',
     image: '/media/sessions/topspin-drill1.jpg',   // photo
     video: '/media/sessions/topspin-drill1.mp4',   // OU vidéo (prioritaire)
     desc: '...' },
   ```

## Formats acceptés

- **Photos** : `.jpg`, `.png`, `.webp` (champ `image`)
- **Vidéos locales** : `.mp4` (champ `video`)
- **Vidéos YouTube / Vimeo** : colle l'URL d'embed dans `video`
  (ex. `https://www.youtube.com/embed/XXXX`) — détecté automatiquement.

## En attendant

Tant que `image` et `video` valent `null`, l'app affiche un placeholder
« PHOTO / VIDÉO À VENIR » à l'emplacement prévu. Rien à coder de plus.
