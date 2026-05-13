export const C = {
  bg:        '#0C211A',
  bgGrad:    'radial-gradient(140% 80% at 50% 0%, #143329 0%, #0B1E17 65%)',
  card:      '#143226',
  cardHi:    '#193E2F',
  border:    'rgba(184,220,197,0.10)',
  borderHi:  'rgba(184,220,197,0.22)',
  ink:       '#F2F7F2',
  inkDim:    'rgba(242,247,242,0.62)',
  inkFaint:  'rgba(242,247,242,0.40)',
  mint:      '#B8DCC5',
  mintDeep:  '#9BC9AE',
  cream:     '#EFE5C8',
  warm:      '#E8C99B',
  loss:      '#E89B8B',
};

export const fontDisplay = '"Big Shoulders Stencil Display", "Big Shoulders Display", "Saira Condensed", Impact, sans-serif';
export const fontSans    = '"Inter", -apple-system, system-ui, sans-serif';
export const fontItalic  = '"Cormorant Garamond", "EB Garamond", Georgia, serif';

export const kicker = {
  fontFamily: fontSans,
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: '0.18em',
  color: 'rgba(242,247,242,0.78)',
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
  color: '#0C211A',
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
  color: C.cream,
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
  background: 'rgba(8,22,17,0.55)',
  border: `1px solid ${C.border}`,
  color: C.ink,
  fontFamily: fontSans,
  fontSize: 14,
  outline: 'none',
};
