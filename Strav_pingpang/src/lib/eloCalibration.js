// =====================================================================
// PING PANG PARIS — Calibration ELO initial via onboarding
// Plage : 400 (débutant total) → 1500 (joueur très avancé)
// =====================================================================

export const ELO_MIN = 400;
export const ELO_MAX = 1500;

/** Points sur la plage 400–1500 (max cumul ≈ 1100). */
const EXP_PTS = {
  '<1y': 0,
  '1-3y': 88,
  '3-5y': 220,
  '5-10y': 352,
  '10+y': 440,
};

const FREQ_PTS = {
  rare: 0,
  monthly: 55,
  weekly: 132,
  '2-3week': 198,
  daily: 264,
};

const LEVEL_PTS = {
  leisure: 0,
  tournament: 99,
  departmental: 220,
  regional: 352,
  national: 440,
};

/**
 * Pré-remplit le slider / valeurs depuis l'étape « Je progresse » (step 3).
 */
export function deriveCalibrationDefaults(answers = {}) {
  const out = {};
  const selfFromProgress = {
    Débutant: 12,
    Loisir: 32,
    Intermédiaire: 55,
    Confirmé: 84,
  }[answers.level];

  if (selfFromProgress != null) {
    out.selfRating = selfFromProgress;
  } else if (answers.playerType === 'fun') {
    out.selfRating = 28;
  }

  return out;
}

/**
 * @param {Object} answers
 * @param {string} answers.experience
 * @param {string} answers.frequency
 * @param {string} answers.level
 * @param {number} answers.selfRating - 0-100
 * @param {number} [answers.officialPoints]
 * @returns {{ elo: number, confidence: 'low'|'medium'|'high', breakdown: object }}
 */
export function calculateInitialElo(answers) {
  if (answers.officialPoints && answers.officialPoints > 0) {
    const elo = Math.round(
      Math.max(ELO_MIN, Math.min(ELO_MAX, answers.officialPoints))
    );
    return {
      elo,
      confidence: 'high',
      breakdown: { source: 'FFTT officiel', points: elo },
    };
  }

  const expPts = EXP_PTS[answers.experience] ?? 0;
  const freqPts = FREQ_PTS[answers.frequency] ?? 0;
  const levelPts = LEVEL_PTS[answers.level] ?? 0;
  const selfPts = ((answers.selfRating ?? 50) - 50) * 1.1;

  let elo = ELO_MIN + expPts + freqPts + levelPts + selfPts;
  elo = Math.max(ELO_MIN, Math.min(ELO_MAX, elo));

  let confidence = 'medium';
  if (
    answers.experience === '<1y' &&
    answers.level === 'leisure' &&
    (answers.selfRating ?? 50) < 35
  ) {
    confidence = 'low';
  } else if (answers.level === 'regional' || answers.level === 'national') {
    confidence = 'high';
  }

  return {
    elo: Math.round(elo),
    confidence,
    breakdown: {
      base: ELO_MIN,
      experience: expPts,
      frequency: freqPts,
      level: levelPts,
      selfRating: Math.round(selfPts),
      total: Math.round(elo),
    },
  };
}

export function getEloRange(confidence) {
  return {
    low: 90,
    medium: 65,
    high: 40,
  }[confidence] || 65;
}

export function isInCalibration(matchesPlayed) {
  return matchesPlayed < 10;
}

export async function saveInitialElo(supabase, userId, initialElo) {
  const elo = Math.round(Math.max(ELO_MIN, Math.min(ELO_MAX, initialElo)));
  const { error } = await supabase
    .from('profiles')
    .update({
      current_elo: elo,
      initial_elo: elo,
      peak_elo: elo,
    })
    .eq('id', userId);

  if (error) throw error;
}
