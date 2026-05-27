// =====================================================================
// PING PANG PARIS — Classement de streak de connexion (changement 2)
//
// Données mockées du leaderboard de streak + codes promo boutique mockés
// pour le top 3 (distribués en fin de saison trimestrielle).
//
// En prod : remplacer MOCK_STREAK_BOARD par une vue Supabase
// `login_streak_ranking` triée par current_login_streak DESC.
// =====================================================================

// Récompenses du top 3 (en fin de saison trimestrielle). Codes mockés pour la démo.
// Chaque récompense a un type (kind) différent : article, carte cadeau, code promo.
export const STREAK_REWARDS = [
  {
    rank: 1, label: '1er', color: 'gold',
    kind: 'article',
    title: 'Un article de la boutique',
    detail: 'À choisir parmi le catalogue Ping Pang Paris',
    code: 'TOP1-STREAK-PP',
  },
  {
    rank: 2, label: '2e', color: 'silver',
    kind: 'giftcard',
    title: 'Carte cadeau 50\u00A0€',
    detail: 'Valable sur toute la boutique',
    code: 'GIFT50-STREAK-PP',
  },
  {
    rank: 3, label: '3e', color: 'bronze',
    kind: 'promo',
    title: '\u201120 % sur ta prochaine commande',
    detail: 'Code unique à usage personnel',
    code: 'TOP3-20-PP',
  },
];

// Classement mock (en prod : Supabase). L'utilisateur courant est injecté
// dynamiquement par le composant selon son vrai streak local.
export const MOCK_STREAK_BOARD = [
  { id: 's1', name: 'Sophie Leroux',   streak: 47 },
  { id: 's2', name: 'Théo Rousseau',   streak: 41 },
  { id: 's3', name: 'Clara Durand',    streak: 38 },
  { id: 's4', name: 'Marc Leclerc',    streak: 33 },
  { id: 's5', name: 'Karim Benali',    streak: 29 },
  { id: 's6', name: 'Julien Bertin',   streak: 24 },
  { id: 's7', name: 'Inès Fernandez',  streak: 21 },
  { id: 's8', name: 'Lucas Bernard',   streak: 18 },
  { id: 's9', name: 'Marie Lemaire',   streak: 14 },
  { id: 's10', name: 'Thomas Renaud',  streak: 11 },
];

// Construit le classement final : insère l'utilisateur courant avec son
// vrai streak local, trie par streak décroissant, attribue le rang.
export function buildStreakBoard(myStreak, myName = 'Toi') {
  const me = { id: 'me', name: myName, streak: myStreak, isMe: true };
  const board = [...MOCK_STREAK_BOARD, me]
    .sort((a, b) => b.streak - a.streak)
    .map((p, i) => ({ ...p, rank: i + 1 }));
  return board;
}
