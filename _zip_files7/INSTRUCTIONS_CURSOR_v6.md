# Instructions d'intégration — Patch v6 (3 onglets par niveau dans TRAIN)

Ce patch remplace le filtre "pills" actuel par **3 vrais onglets pleine largeur**
dans l'écran TRAIN, un par niveau (DÉBUTANT, INTERMÉDIAIRE, EXPERT), avec
les vidéos qui s'affichent en dessous pour le niveau sélectionné.

⚠️ Ce patch est **autonome** — il contient aussi les 18 vidéos YouTube du
patch v5. Donc :
- Si tu n'as PAS appliqué le v5 → applique directement ce v6, il fait tout.
- Si tu as DÉJÀ appliqué le v5 → utilise `git apply --3way` pour merger.

Basé sur l'état du repo `main` (commit `7059ec7`).

---

## APPLIQUER LE PATCH

```bash
git apply --check pingpang_changes_v6.patch
git apply --whitespace=nowarn pingpang_changes_v6.patch
cd Strav_pingpang && npm install && npm run build
```

En cas de conflit (si v5 déjà appliqué) :
```bash
git apply --3way pingpang_changes_v6.patch
```

---

## CE QUI CHANGE

### Onglets niveau dans TRAIN
- Le filtre "pills" est remplacé par **3 onglets pleine largeur** : DÉBUTANT,
  INTERMÉDIAIRE, EXPERT.
- L'onglet actif est souligné en vert mint (accent C.mint).
- Onglet par défaut au chargement : DÉBUTANT.
- Le badge "niveau" sur les cartes est supprimé (redondant avec l'onglet actif).

### Vidéos training (depuis v5, incluses dans ce patch)
- 18 vidéos YouTube pédagogiques embarquées dans `sessions.js`
- 6 séances (2 par niveau)
- Sources : PingSkills, Tom Lodziak, EmRatThich/PingSunday, Ti Long, ITTF

---

## FICHIERS TOUCHÉS (2)

Modifiés : `src/lib/sessions.js`, `src/screens/TrainScreen.jsx`.

Aucun nouveau fichier. Aucun script Python touché. Build testé OK sur clone frais.

---

## COMMENT MODIFIER LES SÉANCES PAR NIVEAU

Dans `src/lib/sessions.js`, chaque séance a un champ `level: 'DÉBUTANT'`,
`'INTERMÉDIAIRE'` ou `'EXPERT'`. Pour déplacer une séance d'un onglet à l'autre,
change simplement la valeur.

Pour ajouter une nouvelle séance, copie la structure existante (voir les 6
séances de référence dans le fichier) et donne-lui un `id` unique et un
`level` parmi les 3 valeurs ci-dessus.
