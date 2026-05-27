// Positions mock des amis (autour de Paris)
// En prod : viendraient de Supabase avec timestamp last_known_at
export const FRIEND_POSITIONS = {
  'Marc Leclerc':   { lat: 48.857, lon: 2.366, area: 'Marais' },
  'Theo Rousseau':  { lat: 48.870, lon: 2.345, area: 'Sentier' },
  'Karim Benali':   { lat: 48.845, lon: 2.327, area: 'Rive gauche' },
  'Ines Fernandez': { lat: 48.882, lon: 2.380, area: 'Belleville' },
  'Lucas Bernard':  { lat: 48.838, lon: 2.385, area: 'Bastille' },
  // Amis hors ligne (positions connues mais non diffusées)
  'Sophie Martin':  { lat: 48.856, lon: 2.354, area: 'Centre' },
  'Lea Petit':      { lat: 48.873, lon: 2.328, area: 'Pigalle' },
  'Julie Dupont':   { lat: 48.851, lon: 2.396, area: 'Nation' },
  'Hugo Tran':      { lat: 48.834, lon: 2.356, area: '13e' },
  'Pierre Garnier': { lat: 48.892, lon: 2.305, area: '17e' },
  'Camille Vidal':  { lat: 48.860, lon: 2.314, area: 'Trocadero' },
  'Manon Simon':    { lat: 48.847, lon: 2.345, area: 'Saint-Germain' },
};
