// =====================================================================
// PING PANG PARIS — Charte graphique officielle (Notion)
// Primaires : Evergreen #092C25, White #F5F6F3, Onyx #101010
// Accent secondaire : Rouge (Mauve dans la charte) #E64949 — réservé aux
// éléments streak / classement de fidélité / récompenses.
// L'or #E8C99B reste réservé au podium du Leaderboard mondial.
// Polices : Open Sauce One (texte), Open Sauce Two (titres/display).
// =====================================================================

export const C = {
  // Fond et surfaces — déclinaisons de l'Evergreen primaire
  bg:        '#092C25',
  bgGrad:    'radial-gradient(140% 80% at 50% 0%, #0E3A30 0%, #061E18 65%)',
  card:      '#0E3A30',
  cardHi:    '#124638',
  border:    'rgba(245,246,243,0.10)',
  borderHi:  'rgba(245,246,243,0.22)',

  // Texte — basé sur le White primaire
  ink:       '#F5F6F3',
  inkDim:    'rgba(245,246,243,0.66)',
  inkFaint:  'rgba(245,246,243,0.42)',

  // Accents verts clairs (dérivés, pour CTAs, lignes, indicateurs)
  mint:      '#C8E6D2',
  mintDeep:  '#A8D2B6',
  cream:     '#F5F6F3',

  // Accent OR — uniquement Leaderboard mondial (podium, place actuelle)
  warm:      '#E8C99B',

  // Accent ROUGE — uniquement streak, récompenses, classement de fidélité
  streak:    '#E64949',
  streakSoft:'rgba(230,73,73,0.16)',
  streakBd:  'rgba(230,73,73,0.45)',

  // Onyx — noir profond ponctuel (texte sur fonds clairs, ombres marquées)
  onyx:      '#101010',

  // Sémantique
  loss:      '#E89B8B',
};

// Open Sauce TWO pour les titres / display (chiffres ELO, hero, podium).
export const fontDisplay = '"Open Sauce Two", "Open Sauce One", system-ui, sans-serif';
// Open Sauce ONE pour tout le reste : paragraphes, boutons, UI.
export const fontSans    = '"Open Sauce One", -apple-system, system-ui, sans-serif';
// Italique : on garde Open Sauce One italique (pas de serif dans la charte).
export const fontItalic  = '"Open Sauce One", system-ui, sans-serif';

export const kicker = {
  fontFamily: fontSans,
  fontSize: 11.5,
  fontWeight: 600,
  letterSpacing: '0.18em',
  color: 'rgba(245,246,243,0.78)',
  textTransform: 'uppercase',
};

export const iconBtn = {
  background: 'none',
  border: 'none',
  color: C.ink,
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

export const btnPrimary = {
  flex: 1,
  padding: '13px',
  borderRadius: 12,
  border: 'none',
  background: C.mint,
  color: '#092C25',
  fontFamily: fontSans,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: '0.16em',
  cursor: 'pointer',
};

export const btnGhost = {
  flex: 1,
  padding: '13px',
  borderRadius: 12,
  background: 'transparent',
  border: `1px solid ${C.borderHi}`,
  color: C.ink,
  fontFamily: fontSans,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: '0.16em',
  cursor: 'pointer',
};

export const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '13px 16px',
  borderRadius: 12,
  background: 'rgba(6,30,24,0.55)',
  border: `1px solid ${C.border}`,
  color: C.ink,
  fontFamily: fontSans,
  fontSize: 14,
  outline: 'none',
};
