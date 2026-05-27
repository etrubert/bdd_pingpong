# Instructions d'intégration — Patch v3 (Ping Pang Paris)

⚠️ **Pré-requis** : les patchs **v1** ET **v2** doivent déjà être appliqués.
Ce patch v3 vient PAR-DESSUS.

---

## APPLIQUER LE PATCH

```bash
git apply --check pingpang_changes_v3.patch
git apply --whitespace=nowarn pingpang_changes_v3.patch
cd Strav_pingpang && npm install && npm run build
```

En cas de conflit : `git apply --3way pingpang_changes_v3.patch`.

---

## CE QUE CONTIENT LE PATCH V3 (3 changements sur 4)

### Ch.1 — Classement mondial ITTF ⏸️ NON FAIT
**Reporté** : le CSV ITTF n'était pas accessible côté Claude. Sera traité dans
un patch ultérieur dès que le fichier sera fourni.

### Ch.2 — Boutique remise (version simple)
- Onglet MERCH rétabli dans la `BottomNav` et dans `App.jsx`.
- `MerchScreen.jsx` simplifié : grille d'articles avec image + prix uniquement
  (plus de page de détail produit). Tap sur un article = ouverture du lien
  `pingpang.paris` dans un nouvel onglet.

### Ch.3 — Récompenses du streak modifiées
`streakBoard.js` + `StreakCard.jsx` :
- 1er → **un article de la boutique** (code `TOP1-STREAK-PP`)
- 2e → **carte cadeau 50 €** (code `GIFT50-STREAK-PP`)
- 3e → **code promo unique \−20 %** (code `TOP3-20-PP`)

Chaque récompense a maintenant une icône adaptée à son type (sac, cadeau, ticket).

### Ch.4 — Cartes LAST MATCH et STATS JOUEUR redesignées
`HomeScreen.jsx` : les deux cartes du Home sont enrichies avec les infos profil.

**LAST MATCH** : avatar coloré de l'adversaire, badge WIN/LOSS, score grand format,
delta ELO ±N, head-to-head (record + win rate), lieu, gradient subtil selon le
résultat.

**STATS JOUEUR** (anciennement DAILY GOAL) : ELO actuel en grand, badge type
(CLUB / AMATEUR), mini-stats Win Rate et nombre de matchs, barre d'objectif
quotidien conservée.

---

## FICHIERS TOUCHÉS (6)

Modifiés : `App.jsx`, `BottomNav.jsx`, `StreakCard.jsx`, `streakBoard.js`,
`HomeScreen.jsx`, `MerchScreen.jsx`.

Aucun nouveau fichier. Aucun script Python touché. Build testé OK (v1+v2+v3).
