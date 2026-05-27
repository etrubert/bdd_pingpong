# Instructions d'intégration — Patch v4 (Charte graphique officielle)

Ce patch applique la **charte graphique officielle** de Ping Pang Paris
(palette Notion + polices Open Sauce + logo PPP_Logo1).

Il est basé sur l'état actuel de la branche `main` du repo (commit `ae36d6b`).

---

## APPLIQUER LE PATCH

Place `pingpang_changes_v4.patch` à la racine du repo, puis :

```bash
git apply --check pingpang_changes_v4.patch
git apply --whitespace=nowarn pingpang_changes_v4.patch
cd Strav_pingpang && npm install && npm run build
```

En cas de conflit (si tu as commit du code entre temps) :
`git apply --3way pingpang_changes_v4.patch`.

---

## CE QUE LE PATCH CHANGE

### Palette de couleurs
- **Evergreen** `#092C25` → fond de l'app et surfaces (cards `#0E3A30`/`#124638`)
- **White** `#F5F6F3` → texte principal et icônes
- **Onyx** `#101010` → disponible via `C.onyx` pour cas ponctuels
- **Or** `#E8C99B` (existant) → réservé au **Leaderboard mondial** (podium, place)
- **Rouge** `#E64949` (NOUVEAU `C.streak`) → réservé au **streak / classement de
  fidélité / récompenses**. Variantes : `C.streakSoft`, `C.streakBd`.

L'ancien Evergreen `#0C211A` et toutes ses variantes ont été migrés partout dans
le code (14 fichiers de composants/écrans). Plus aucune référence à
`rgba(184,220,197,...)` ou `rgba(242,247,242,...)` — tout est aligné sur
`rgba(245,246,243,...)`.

### Polices
- `public/fonts/` : 8 fichiers Open Sauce (One + Two, en 4 graisses chacun)
- `public/fonts/fonts.css` : déclarations `@font-face` propres
- `index.html` : on retire les Google Fonts (Inter, Big Shoulders, Cormorant)
  et on charge `fonts.css` à la place
- `theme.js` :
  - `fontDisplay` → **Open Sauce Two** (gros titres, hero, podiums, chiffres)
  - `fontSans` → **Open Sauce One** (texte courant, boutons, UI)

### Logo
- `public/logos/` : PPP_Logo1 en SVG (Evergreen, White, Onyx)
- `TopBar.jsx` : le texte "PING PANG PARIS" est remplacé par le SVG
  `PPP_Logo1_White.svg`

### Composant Streak (carte Home, sheet, podium, récompenses)
- Toutes les références à `C.warm` (or) → `C.streak` (rouge)
- Backgrounds et bordures du sheet rebasculés en rouge atténué
- Le podium top 3 et le badge "#N" sont en rouge

---

## FICHIERS TOUCHÉS (30)

**Nouveaux** : 8 polices `.ttf`, `fonts.css`, 3 logos SVG.

**Modifiés** : `index.html`, `theme.js`, `App.jsx`, `TopBar.jsx`, `BottomNav.jsx`,
`StreakCard.jsx`, `LocationConsent.jsx`, `UIProvider.jsx`, `AddTableSheet.jsx`,
`SVGIllustrations.jsx`, `FinderScreen.jsx`, `HomeScreen.jsx`, `Leaderboard.jsx`,
`MatchesScreen.jsx`, `MerchScreen.jsx`, `OnboardingCalibration.jsx`,
`OnboardingScreen.jsx`, `TrainScreen.jsx`.

Aucun script Python touché. Build testé OK.

---

## NOTE
Si tu veux modifier la répartition des couleurs plus tard, presque tout est
centralisé dans `src/theme.js` (objet `C`). Changer une valeur là propage dans
toute l'app.
