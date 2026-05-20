// =====================================================================
// PING PANG PARIS — Calibration ELO initial via onboarding
// À placer dans : Strav_pingpang/src/lib/eloCalibration.js
// =====================================================================

/**
 * Calcule l'ELO de départ d'un nouveau joueur en fonction de ses réponses
 * à l'onboarding.
 *
 * Plage : 800 (vrai débutant) → 2200 (joueur national/pro)
 * Base : 1200 (joueur moyen)
 *
 * @param {Object} answers - Les réponses de l'onboarding
 * @param {string} answers.experience - '<1y' | '1-3y' | '3-5y' | '5-10y' | '10+y'
 * @param {string} answers.frequency - 'rare' | 'monthly' | 'weekly' | '2-3week' | 'daily'
 * @param {string} answers.level - 'leisure' | 'tournament' | 'departmental' | 'regional' | 'national'
 * @param {number} answers.selfRating - 0-100 (slider auto-éval)
 * @param {string} [answers.fftLicense] - N° licence FFTT optionnel
 * @param {number} [answers.officialPoints] - Points FFTT officiels si récupérés
 * @returns {{ elo: number, confidence: 'low'|'medium'|'high', breakdown: object }}
 */
export function calculateInitialElo(answers) {
  // Si on a les points FFTT officiels, c'est la source de vérité
  if (answers.officialPoints && answers.officialPoints > 0) {
    return {
      elo: answers.officialPoints,
      confidence: 'high',
      breakdown: {
        source: 'FFTT officiel',
        points: answers.officialPoints,
      },
    };
  }

  // Sinon, calcul basé sur les réponses
  let elo = 1200; // baseline

  // 1. Expérience (poids fort : -200 à +400)
  const expBonus = {
    '<1y': -200,
    '1-3y': 0,
    '3-5y': 150,
    '5-10y': 300,
    '10+y': 400,
  }[answers.experience] || 0;
  elo += expBonus;

  // 2. Fréquence (poids moyen : -100 à +200)
  const freqBonus = {
    rare: -100,
    monthly: -50,
    weekly: 50,
    '2-3week': 150,
    daily: 200,
  }[answers.frequency] || 0;
  elo += freqBonus;

  // 3. Niveau de compétition (poids très fort : -300 à +600)
  const levelBonus = {
    leisure: -300,
    tournament: -100,
    departmental: 100,
    regional: 350,
    national: 600,
  }[answers.level] || 0;
  elo += levelBonus;

  // 4. Auto-évaluation (ajustement final : -100 à +100)
  // 50 = neutre, < 50 = se sous-estime, > 50 = se surestime
  const selfAdjust = ((answers.selfRating || 50) - 50) * 2;
  elo += selfAdjust;

  // 5. Bornes raisonnables
  elo = Math.max(800, Math.min(2200, elo));

  // 6. Niveau de confiance
  let confidence = 'medium';
  if (answers.level === 'leisure' || answers.experience === '<1y') {
    confidence = 'low'; // Peu d'info, beaucoup d'incertitude
  } else if (answers.level === 'regional' || answers.level === 'national') {
    confidence = 'high'; // Joueur classé, niveau connu
  }

  return {
    elo: Math.round(elo),
    confidence,
    breakdown: {
      baseline: 1200,
      experience: expBonus,
      frequency: freqBonus,
      level: levelBonus,
      selfRating: selfAdjust,
      total: elo,
    },
  };
}


/**
 * Calcule la fourchette ±X autour de l'ELO estimé
 * (plus l'incertitude est grande, plus la fourchette est large)
 */
export function getEloRange(confidence) {
  return {
    low: 150,
    medium: 100,
    high: 50,
  }[confidence] || 100;
}


/**
 * Détermine si le joueur est en phase de calibration (10 premiers matchs)
 * Pendant cette phase, le K-factor est augmenté (40 au lieu de 24)
 * pour que l'ELO converge rapidement vers le vrai niveau.
 */
export function isInCalibration(matchesPlayed) {
  return matchesPlayed < 10;
}


/**
 * Sauvegarde l'ELO initial dans Supabase
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {number} initialElo
 */
export async function saveInitialElo(supabase, userId, initialElo) {
  const { error } = await supabase
    .from('profiles')
    .update({
      current_elo: initialElo,
      initial_elo: initialElo,
      peak_elo: initialElo,
    })
    .eq('id', userId);

  if (error) throw error;
}
