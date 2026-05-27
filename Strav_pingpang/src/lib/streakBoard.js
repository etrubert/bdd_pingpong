// =====================================================================
// PING PANG PARIS — Classement de streak de connexion (changement 2)
//
// Données mockées du leaderboard de streak + codes promo boutique mockés
// pour le top 3 (distribués en fin de saison trimestrielle).
//
// En prod : remplacer MOCK_STREAK_BOARD par une vue Supabase
// `login_streak_ranking` triée par current_login_streak DESC.
// =====================================================================

// Récompenses du top 3 (tous les 3 mois). Codes mockés pour la démo.
export const STREAK_REWARDS = [
  { rank: 1, label: '1er', discount: '-30%', code: 'STREAK30-PP', color: 'gold' },
  { rank: 2, label: '2e',  discount: '-20%', code: 'STREAK20-PP', color: 'silver' },
  { rank: 3, label: '3e',  discount: '-15%', code: 'STREAK15-PP', color: 'bronze' },
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
