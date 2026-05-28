# Instructions d'intégration — Patch v11 (Vidéos mises à jour, meilleure qualité)

Ce patch remplace les 15 vidéos actuelles de TRAIN par une sélection plus
récente et de meilleure qualité (HD/1080p+, 2024+ quand possible). La
structure (5 vidéos par niveau, lightbox plein écran) ne change pas.

Basé sur l'état actuel du repo `main` (commit `48a41ff`, après le patch v10).

---

## APPLIQUER LE PATCH

```bash
git apply --check pingpang_changes_v11.patch
git apply --whitespace=nowarn pingpang_changes_v11.patch
cd Strav_pingpang && npm install && npm run build
```

En cas de conflit : `git apply --3way pingpang_changes_v11.patch`.

---

## CONTENU MIS À JOUR (15 vidéos vérifiées HTTP 200)

### DÉBUTANT
1. **Bien tenir la raquette** — PingSkills 2024, HD `XqChkbRIp2Y`
2. **Revers (counterhit)** — PingSkills `iYRJ2YV3PGY`
3. **Coup droit (Forehand drive)** — PingSkills `GxAqmTLZLh0`
4. **4 services simples** — Tom Lodziak `oL5BQuBuMHY`
5. **Premier service réussi** — `0pl9nbsB_4U` (2025-2026)

### INTERMÉDIAIRE
1. **Top-spin sur balle coupée** — Tom Lodziak `eLdsH1aFuT4`
2. **Top-spin coup droit & revers** — PingSkills Training 101 `XFRqT3miJ3I`
3. **Top revers vitesse** — PingSunday/EmRatThich (2024) `pg-mNoEyO-4`
4. **Backhand flick** — PingSkills `heJZe0OTDnA`
5. **5 indices pour lire l'effet d'un service** — Tom Lodziak (2026, récent) `rrS7Wjh35cU`

### EXPERT
1. **Top revers Zhang Jike** — Ti Long `Ugrsk_TDdZk`
2. **Top revers Chinese style** — EmRatThich `_G3ItT_AJF4`
3. **Pendulum serve : le service pro** — Dec 2024, HD `FExU6SlIIl0`
4. **Secrets du pendulum de Timo Boll** — Ti Long `49f2nGErIEM`
5. **Footwork pro (champion du monde)** — J-P Gatien `2swUt6GTL58`

Toutes les vidéos ont été testées : chaque ID YouTube renvoie un statut
HTTP 200 sur la miniature. Aucune n'est privée ou supprimée à la date
du patch.

---

## FICHIER TOUCHÉ (1)

`src/lib/sessions.js` uniquement (tableau `VIDEOS` mis à jour).

Aucun changement de logique, aucun nouveau fichier, aucun script Python
touché. Build testé OK sur clone frais.
