# Système ELO complet — Ping Pang Paris

Tout ce qu'il te faut pour intégrer l'algo ELO, le classement mondial et l'onboarding de calibration dans ton app **Strav_pingpang**.

---

## Vue d'ensemble

| Fichier | Rôle | Où le mettre |
|---|---|---|
| `01_supabase_schema.sql` | Tables + algo ELO + RLS + classement mondial | Éditeur SQL Supabase |
| `02_eloCalibration.js` | Calcul ELO de départ depuis les réponses onboarding | `src/lib/eloCalibration.js` |
| `03_OnboardingCalibration.jsx` | Nouvel écran d'onboarding (étape calibrage) | `src/screens/OnboardingCalibration.jsx` |
| `04_Leaderboard.jsx` | Page classement mondial complète | `src/screens/Leaderboard.jsx` |
| `05_matches.js` | Création + validation de matchs | `src/lib/matches.js` |
| `06_elo.css` | Styles cohérents avec la DA Ping Pang Paris | `src/styles/elo.css` |

---

## Étape 1 — Exécuter le SQL dans Supabase

1. Connecte-toi à ton projet Supabase
2. Va dans **SQL Editor** (menu de gauche)
3. Clique **New Query**
4. Copie-colle tout le contenu de `01_supabase_schema.sql`
5. Clique **Run**

Si tu as déjà des tables `profiles` ou `matches`, **fais une sauvegarde avant** (le script ne supprime rien mais ajoute des colonnes/triggers).

### Ce que ce script crée

- **Table `profiles`** : profil utilisateur avec `current_elo`, `peak_elo`, `current_streak`, etc.
- **Table `matches`** : tous les matchs avec validation par les 2 joueurs
- **Fonctions ELO** : `calc_expected_score`, `calc_k_factor`, `calc_margin_multiplier`, etc.
- **Trigger automatique** : dès qu'un match est validé par les 2, l'ELO est recalculé
- **Vue `world_ranking`** : classement mondial trié par ELO
- **Vue `country_ranking`** : classement par pays
- **RLS (sécurité)** : impossible de modifier son ELO depuis l'app, seul le trigger le fait

---

## Étape 2 — Installer les fichiers JS/JSX dans ton projet

Depuis la racine de **`Strav_pingpang/`** :

```bash
mkdir -p src/lib src/screens src/styles
```

Puis copie :
- `02_eloCalibration.js` → `src/lib/eloCalibration.js`
- `05_matches.js` → `src/lib/matches.js`
- `03_OnboardingCalibration.jsx` → `src/screens/OnboardingCalibration.jsx`
- `04_Leaderboard.jsx` → `src/screens/Leaderboard.jsx`
- `06_elo.css` → `src/styles/elo.css`

---

## Étape 3 — Vérifier que le client Supabase existe

Le code suppose que tu as déjà un fichier `src/lib/supabase.js` qui exporte un client Supabase :

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

Si tu n'as pas encore Supabase installé :

```bash
npm install @supabase/supabase-js
```

Et dans ton `.env` :

```
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=ta-clé-anon
```

---

## Étape 4 — Importer le CSS

Dans ton `src/main.jsx` (ou `App.jsx`), ajoute :

```js
import './styles/elo.css';
```

---

## Étape 5 — Intégrer dans ton flow d'onboarding existant

Dans ton flow d'onboarding actuel (les 3 étapes que tu as déjà), ajoute **OnboardingCalibration** après l'étape 2 (où l'utilisateur choisit son type de joueur). Si le joueur a choisi "Régulièrement" ou "En club / compétition", on lui montre l'écran de calibration ELO.

```jsx
// Dans ton router d'onboarding
import OnboardingCalibration from './screens/OnboardingCalibration';

function OnboardingFlow({ userId }) {
  const [step, setStep] = useState(1);
  const [playerType, setPlayerType] = useState(null);

  if (step === 1) return <Step1Identity onNext={() => setStep(2)} />;
  if (step === 2) return <Step2PlayerType onNext={(type) => { setPlayerType(type); setStep(3); }} />;
  if (step === 3) {
    // Pour les joueurs casual : skip la calibration, ELO = 1200 par défaut
    if (playerType === 'casual') return <Step3Casual />;
    // Pour les autres : calibration ELO
    return <OnboardingCalibration userId={userId} onComplete={() => navigate('/home')} />;
  }
}
```

---

## Étape 6 — Ajouter la page Leaderboard à ta navigation

Dans ta bottom nav (HOME / TRAIN / FINDER / CHAT / MATCHES / MERCH), tu peux ajouter un accès au classement depuis **MATCHES** ou créer une nouvelle entrée **RANKING**.

```jsx
import Leaderboard from './screens/Leaderboard';

<Route path="/leaderboard" element={<Leaderboard currentUserId={user.id} />} />
```

---

## Étape 7 — Tester l'algo ELO

Pour vérifier que tout marche :

1. Crée 2 comptes test dans ton app
2. Note leurs ELO de départ (visibles dans `profiles`)
3. Crée un match entre eux via `createMatch(...)` puis valide-le avec `validateMatch(...)` (les 2 joueurs doivent valider)
4. Vérifie que les ELO ont été mis à jour dans `profiles` et que `elo_change_a` / `elo_change_b` sont dans `matches`
5. Va dans la vue `world_ranking` (SQL Editor → `SELECT * FROM world_ranking LIMIT 10;`) pour voir le classement

---

## Comment fonctionne l'algo ELO en détail

### Formule complète

```
ΔELO = K × M × F × C × S × (Score_réel − Probabilité_victoire)
```

Avec :
- **K** : K-factor adaptatif (40 / 24 / 16 selon expérience)
- **M** : Marge de victoire (3-0 → ×1.5, 3-1 → ×1.1, 3-2 → ×1.0)
- **F** : Format (BO3 → ×0.85, BO5 → ×1.0, BO7 → ×1.15)
- **C** : Contexte (Amical → ×0, Classé → ×1.0, Tournoi → ×1.2, Championnat → ×1.3)
- **S** : Streak (5+ victoires → ×1.05, 3+ défaites → ×0.95)

### Protection anti-triche

Si écart ELO > 400 et le plus fort gagne, gain plafonné à **5 ELO** (évite que les forts farment sur les faibles).

### Calibration des nouveaux joueurs

Les 10 premiers matchs ont un K=40 (au lieu de 24), ce qui permet à l'ELO de converger rapidement vers le vrai niveau du joueur, même si l'estimation initiale est imparfaite.

### Mise à jour temps réel

Le trigger PostgreSQL recalcule l'ELO **dès la validation du match par les 2 joueurs**. Tu peux écouter ces changements en temps réel côté frontend avec `subscribeToMyEloUpdates()` pour afficher la mise à jour ELO immédiatement à l'utilisateur.

---

## Synchronisation avec ton algo Python existant

Tu as déjà des scripts Python (`algo_classement_mondial.py`, `pingpong_france.py`, etc.) qui scrapent et calculent des classements. Deux options :

### Option A — Les Python restent côté backend
Tes scripts continuent de tourner régulièrement pour calculer des **classements officiels FFTT** que tu importes dans une table séparée (`fftt_rankings`). Tu peux ensuite afficher 2 ELO côte à côte dans le profil : l'ELO interne Ping Pang Paris + le classement FFTT officiel.

### Option B — Migration vers Supabase
Tu portes la logique Python dans des Edge Functions Supabase (TypeScript) qui s'exécutent automatiquement à intervalle régulier.

Pour démarrer, je conseille l'**Option A** : les scripts Python tournent en local ou sur un serveur, et tu fais un `INSERT` dans Supabase quand tu as les nouveaux classements.

---

## Questions fréquentes

**Q : Pourquoi le K-factor change ?**
Plus tu joues, plus ton ELO est fiable. Donc à chaque match il bouge moins (K=16 à haut niveau). Mais quand tu commences (< 10 matchs), il bouge beaucoup (K=40) pour atteindre vite ton vrai niveau.

**Q : Que se passe-t-il si on joue 100 matchs amicaux ?**
Rien sur l'ELO (contexte friendly = ×0). Mais les stats `matches_played` ne s'incrémentent pas non plus (le trigger sort tôt). Si tu veux les compter sans impacter ELO, modifie le trigger.

**Q : Et si Marc refuse de valider mon score ?**
Le match reste en attente. Côté UI, tu peux afficher "En attente de validation". Tu peux ajouter une logique pour auto-valider après X jours sans réponse (à coder via une Edge Function planifiée).

**Q : L'utilisateur peut-il tricher en modifiant son ELO ?**
Non. Les RLS interdisent toute modification directe de `current_elo` depuis l'app. Seul le trigger PostgreSQL (qui tourne avec privilèges) peut le modifier.

**Q : Et pour le classement mondial, ça scale ?**
La vue `world_ranking` est calculée à la volée. Pour 10 000 joueurs ça reste rapide. Si tu dépasses 100 000 joueurs, on peut transformer la vue en **vue matérialisée** rafraîchie toutes les heures.

---

Si tu as des questions ou des bugs, copie l'erreur exacte et je t'aide à débugger.
