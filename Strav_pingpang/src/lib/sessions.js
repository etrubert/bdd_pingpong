// =====================================================================
// PING PANG PARIS — Vidéos d'entraînement
//
// 3 niveaux : DÉBUTANT, INTERMÉDIAIRE, EXPERT
// EXACTEMENT 5 vidéos par niveau.
// Chaque vidéo s'affiche directement comme vignette dans l'onglet ;
// au clic, lecture en plein écran 16:9 (composant VideoLightbox).
//
// Sources : PingSkills (Australie), Tom Lodziak (UK), EmRatThich/PingSunday,
// Ti Long, chaîne officielle ITTF. Vidéos publiques, autorisées à l'embed.
// =====================================================================

// Tableau plat de vidéos. Chaque vidéo a un niveau et une description courte.
//   { id, level, title, desc, duration, video (URL embed YouTube) }
export const VIDEOS = [
  // ----- DÉBUTANT (5 vidéos) -----
  {
    id: 'd1', level: 'DÉBUTANT',
    title: 'Tenir la raquette',
    desc: 'Shakehand ou penhold : choisir et bien tenir.',
    duration: '5 min',
    video: 'https://www.youtube.com/embed/iUK7-z7Zv3Y',
  },
  {
    id: 'd2', level: 'DÉBUTANT',
    title: 'Coup droit (counterhit)',
    desc: 'La base du coup droit, rythme régulier.',
    duration: '8 min',
    video: 'https://www.youtube.com/embed/vnaY6ltLY-g',
  },
  {
    id: 'd3', level: 'DÉBUTANT',
    title: 'Revers (counterhit)',
    desc: 'Bloc revers court près de la table.',
    duration: '7 min',
    video: 'https://www.youtube.com/embed/iYRJ2YV3PGY',
  },
  {
    id: 'd4', level: 'DÉBUTANT',
    title: 'Push (poussette)',
    desc: 'Coup défensif avec rotation arrière.',
    duration: '5 min',
    video: 'https://www.youtube.com/embed/Hx5ZQSsmFjo',
  },
  {
    id: 'd5', level: 'DÉBUTANT',
    title: 'Premier service',
    desc: 'Les règles et la technique du service de base.',
    duration: '6 min',
    video: 'https://www.youtube.com/embed/NfmPcpi4sfc',
  },

  // ----- INTERMÉDIAIRE (5 vidéos) -----
  {
    id: 'i1', level: 'INTERMÉDIAIRE',
    title: 'Top-spin coup droit & revers',
    desc: 'Le top-spin de base, les deux côtés.',
    duration: '7 min',
    video: 'https://www.youtube.com/embed/XFRqT3miJ3I',
  },
  {
    id: 'i2', level: 'INTERMÉDIAIRE',
    title: 'Top-spin sur balle coupée',
    desc: 'Lift contre balle coupée, basique et avancé.',
    duration: '9 min',
    video: 'https://www.youtube.com/embed/eLdsH1aFuT4',
  },
  {
    id: 'i3', level: 'INTERMÉDIAIRE',
    title: 'Améliorer son coup droit',
    desc: 'Casser les mauvaises habitudes.',
    duration: '4 min',
    video: 'https://www.youtube.com/embed/o6RWbZFB0oE',
  },
  {
    id: 'i4', level: 'INTERMÉDIAIRE',
    title: 'Backhand flick',
    desc: 'Le geste fondamental expliqué pas à pas.',
    duration: '4 min',
    video: 'https://www.youtube.com/embed/heJZe0OTDnA',
  },
  {
    id: 'i5', level: 'INTERMÉDIAIRE',
    title: 'Flick simple (intermédiaire)',
    desc: 'Une technique facile et efficace.',
    duration: '6 min',
    video: 'https://www.youtube.com/embed/QUsYDghnLWk',
  },

  // ----- EXPERT (5 vidéos) -----
  {
    id: 'e1', level: 'EXPERT',
    title: 'Top revers Zhang Jike',
    desc: 'Décomposition complète de la technique.',
    duration: '7 min',
    video: 'https://www.youtube.com/embed/Ugrsk_TDdZk',
  },
  {
    id: 'e2', level: 'EXPERT',
    title: 'Top revers Chinese style',
    desc: 'Les 3 clés du revers agressif moderne.',
    duration: '6 min',
    video: 'https://www.youtube.com/embed/_G3ItT_AJF4',
  },
  {
    id: 'e3', level: 'EXPERT',
    title: 'Top revers ITTF (Michael Maze)',
    desc: 'Démonstration officielle ITTF.',
    duration: '2 min',
    video: 'https://www.youtube.com/embed/W_yifhqHl5o',
  },
  {
    id: 'e4', level: 'EXPERT',
    title: 'Service pendulum : 3 clés',
    desc: 'Les 3 conseils clés pour un pendulum efficace.',
    duration: '6 min',
    video: 'https://www.youtube.com/embed/fy4jHZVu4lQ',
  },
  {
    id: 'e5', level: 'EXPERT',
    title: 'Secrets du pendulum de Timo Boll',
    desc: 'Décomposition détaillée du service.',
    duration: '7 min',
    video: 'https://www.youtube.com/embed/49f2nGErIEM',
  },
];
