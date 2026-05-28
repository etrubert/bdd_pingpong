# Instructions d'intégration — Patch v12 (Coach IA Mistral)

Ce patch ajoute **Coach Ping**, un chatbot IA spécialisé ping-pong, accessible
depuis une **balle de ping-pong flottante** en bas à droite de l'écran.

Basé sur l'état actuel du repo `main`.

---

## APPLIQUER LE PATCH

```bash
git apply --check pingpang_changes_v12.patch
git apply --whitespace=nowarn pingpang_changes_v12.patch
cd Strav_pingpang && npm install && npm run build
```

En cas de conflit : `git apply --3way pingpang_changes_v12.patch`.

---

## CONFIGURATION (.env)

Après application du patch, ajoute ta clé Mistral dans `.env` à la racine
de `Strav_pingpang/` :

```
VITE_MISTRAL_API_KEY=ta_cle_mistral_ici
```

### Où obtenir une clé Mistral
1. Va sur https://console.mistral.ai/
2. Inscription gratuite
3. Section "API Keys" → crée une clé
4. Colle-la dans `.env`

Le tier gratuit de Mistral permet ~1M tokens/mois, largement suffisant
pour un MVP.

**Important** : redémarre `npm run dev` après avoir modifié `.env`,
sinon la nouvelle variable n'est pas prise en compte.

---

## CE QUE LE PATCH AJOUTE

### Balle flottante (FAB)
- Apparaît en bas à droite, au-dessus de la BottomNav
- Design : balle de ping-pong blanche avec dégradé réaliste, point d'accroche
  rouge "?", indicateur "en ligne" vert
- Effet press au tap (scale 0.95)

### Fenêtre de chat
- Sheet qui monte du bas, hauteur ~86 vh
- Header avec avatar 🏓, nom "COACH PING", statut "En ligne, IA Mistral"
- Bulles de chat (utilisateur en vert mint à droite, coach en gris à gauche)
- Zone de saisie avec auto-grow, bouton Envoyer rond
- Fermeture : clic en dehors, bouton X, ou touche Échap
- ESC ferme la fenêtre
- Scroll body verrouillé pendant ouverture

### Personnalité de Coach Ping
Le system prompt le conditionne pour :
- **Refuser les sujets hors ping-pong** (météo, recettes, etc.) et recentrer
- **Poser des questions courtes** sur les matchs récents, points forts/faibles,
  objectifs
- **Proposer des exercices personnalisés** (3-5 points max, listes à puces)
- **Référencer les 15 vidéos disponibles dans TRAIN** quand pertinent
  (ex : "regarde la vidéo Top revers vitesse dans INTERMÉDIAIRE")
- **Refuser tout avis médical**, rediriger vers un kiné
- **Toujours répondre en français**

### Modèle utilisé
`mistral-small-latest` (rapide, gratuit). Pour des réponses plus fines,
change la ligne `const MODEL = ...` dans `src/lib/coachAI.js` pour
`mistral-large-latest` (payant mais excellent).

---

## FICHIERS AJOUTÉS (5)

- `.env.example` — Documentation des variables d'environnement
- `src/lib/coachAI.js` — Client API Mistral + system prompt spécialisé
- `src/components/CoachBubble.jsx` — Balle flottante (FAB) + état ouvert/fermé
- `src/components/CoachChat.jsx` — Fenêtre de chat (sheet)
- Modif `src/App.jsx` — Import + montage de CoachBubble

Aucun script Python touché. Build testé OK sur clone frais.

---

## NOTE SÉCURITÉ

Les variables `VITE_*` sont **exposées au navigateur** après build (c'est une
contrainte de Vite). En production, il faut basculer sur un proxy serveur
(Supabase Edge Function recommandée) qui garde la clé secrète et fait
l'appel API depuis le backend.

Pour le MVP / dev / petit groupe d'utilisateurs : la clé en `.env` est
acceptable, mais **restreins son quota** dans la console Mistral.

---

## TESTER LE COACH

Une fois la clé configurée :
1. `cd Strav_pingpang && npm run dev`
2. Ouvre `http://localhost:5173`
3. Tu vois la balle blanche en bas à droite
4. Clique dessus → la fenêtre s'ouvre avec un message d'accueil
5. Tape "Salut" → Coach Ping te répond et pose des questions
6. Réponds avec un vrai contexte ("J'ai perdu 1-3 hier...") → il propose
   des exercices ciblés
