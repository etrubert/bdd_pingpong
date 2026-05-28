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

// Classement mock massif : 200 joueurs avec streak 1 ou 2.
// Le joueur courant est forcé à 3 pour être premier.
const MOCK_COUNT = 200;
export const MOCK_STREAK_BOARD = Array.from({ length: MOCK_COUNT }, (_, i) => ({
  id: `s${i + 1}`,
  name: `Joueur ${String(i + 1).padStart(3, '0')}`,
  streak: i % 2 === 0 ? 2 : 1,
}));

// Construit le classement final : le joueur courant est forcé à 3
// (donc devant tous les mocks à 1 ou 2), puis tri + rang.
export function buildStreakBoard(myStreak, myName = 'Toi') {
  const me = { id: 'me', name: myName, streak: 3, isMe: true };
  const board = [...MOCK_STREAK_BOARD, me]
    .sort((a, b) => b.streak - a.streak)
    .map((p, i) => ({ ...p, rank: i + 1 }));
  return board;
}
