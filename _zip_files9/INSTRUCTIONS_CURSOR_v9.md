# Instructions d'intégration — Patch v9 (5 vidéos/niveau + lightbox plein écran)

Ce patch finalise le module TRAIN avec :
- **Exactement 5 vidéos par niveau** (15 au total)
- **Descriptions courtes** (1 phrase max) sous chaque vidéo
- **Lecture en plein écran horizontal 16:9** au clic sur la vignette

Basé sur l'état actuel du repo `main` (après les commits récents
"debut videos" et le merge).

---

## APPLIQUER LE PATCH

```bash
git apply --check pingpang_changes_v9.patch
git apply --whitespace=nowarn pingpang_changes_v9.patch
cd Strav_pingpang && npm install && npm run build
```

En cas de conflit : `git apply --3way pingpang_changes_v9.patch`.

---

## CE QUI CHANGE

### Comportement de lecture
Au clic sur la vignette d'une vidéo (couverture de séance OU vidéo d'étape),
une **lightbox plein écran** s'ouvre :
- Vidéo en **format horizontal 16:9 grand écran** (max 95vw, 90vh)
- Fond sombre opaque, scroll de la page verrouillé
- Démarrage automatique de la lecture (autoplay=1)
- Fermeture : clic à l'extérieur, bouton X en haut à droite, ou touche Échap

### Contenu

**DÉBUTANT — 5 vidéos** (2 séances)
- Séance Fondamentaux : coup droit, revers, push
- Premier Service : service de base, 4 services simples

**INTERMÉDIAIRE — 5 vidéos** (2 séances)
- Top-Spin Puissance : top CD/revers, top sur coupée, améliorer son CD
- Flick : Attaque Courte : flick PingSkills, flick simple

**EXPERT — 5 vidéos** (2 séances)
- Top Revers Pro : Zhang Jike, Chinese style, ITTF Michael Maze
- Service Pendulum Pro : 3 clés, secrets de Timo Boll

### Descriptions
Chaque vidéo a maintenant une description en **1 phrase**, claire et
concise (plus de pavés de texte). Sources entre parenthèses
supprimées de la description (déjà identifiables dans le titre).

---

## FICHIERS TOUCHÉS (2)

Modifiés : `src/lib/sessions.js`, `src/screens/TrainScreen.jsx`.

Aucun nouveau fichier. Aucun script Python touché. Build testé OK sur
clone frais.

---

## DÉTAIL TECHNIQUE

Nouveau composant `VideoLightbox` ajouté dans `TrainScreen.jsx` :
- `position: fixed` qui couvre toute la fenêtre (`zIndex: 9999`)
- Conteneur en `aspect-ratio: 16/9`, dimensionné par `min(95vw, 90vh*16/9)`
- L'iframe YouTube reçoit `?autoplay=1` et la `allow` policy complète
- Le scroll du body est verrouillé pendant l'affichage (`overflow: hidden`)
- ESC ferme la lightbox
