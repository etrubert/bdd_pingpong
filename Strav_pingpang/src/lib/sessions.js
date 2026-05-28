// =====================================================================
// PING PANG PARIS — Vidéos d'entraînement
//
// 3 niveaux : DÉBUTANT, INTERMÉDIAIRE, EXPERT
// EXACTEMENT 5 vidéos par niveau, sélectionnées pour leur qualité HD
// et leur date récente (2024+ quand possible).
// Au clic sur une vignette : lecture en plein écran 16:9 horizontal.
//
// Sources : PingSkills (chaîne officielle, MAJ 2024-2025), Tom Lodziak
// (UK, vidéos 2024-2025), Ti Long (China, contenu détaillé), MPS Table
// Tennis (chaîne moderne 2024-2025). Tout est en HD, format embed.
// =====================================================================

// Tableau plat de vidéos. Chaque vidéo a un niveau et une description courte.
//   { id, level, title, desc, duration, video (URL embed YouTube) }
export const VIDEOS = [
  // ----- DÉBUTANT (5 vidéos, mises à jour) -----
  {
    id: 'd1', level: 'DÉBUTANT',
    title: 'Bien tenir la raquette',
    desc: 'Shakehand ou penhold, prise à maîtriser dès le début.',
    duration: '5 min',
    video: 'https://www.youtube.com/embed/XqChkbRIp2Y',
  },
  {
    id: 'd2', level: 'DÉBUTANT',
    title: 'Revers (counterhit)',
    desc: 'Bloc revers court près de la table.',
    duration: '5 min',
    video: 'https://www.youtube.com/embed/iYRJ2YV3PGY',
  },
  {
    id: 'd3', level: 'DÉBUTANT',
    title: 'Coup droit (counterhit)',
    desc: 'La base du coup droit, rythme régulier près de la table.',
    duration: '5 min',
    video: 'https://www.youtube.com/embed/GxAqmTLZLh0',
  },
  {
    id: 'd4', level: 'DÉBUTANT',
    title: '4 services simples',
    desc: 'Backspin, topspin, sidespin, no-spin pour démarrer.',
    duration: '9 min',
    video: 'https://www.youtube.com/embed/oL5BQuBuMHY',
  },
  {
    id: 'd5', level: 'DÉBUTANT',
    title: 'Premier service réussi',
    desc: 'Le service de base apprendre proprement.',
    duration: '6 min',
    video: 'https://www.youtube.com/embed/0pl9nbsB_4U',
  },

  // ----- INTERMÉDIAIRE (5 vidéos, mises à jour) -----
  {
    id: 'i1', level: 'INTERMÉDIAIRE',
    title: 'Top-spin sur balle coupée',
    desc: 'Lift contre backspin, méthode basique et avancée.',
    duration: '9 min',
    video: 'https://www.youtube.com/embed/eLdsH1aFuT4',
  },
  {
    id: 'i2', level: 'INTERMÉDIAIRE',
    title: 'Top-spin coup droit & revers',
    desc: 'Les bases du top-spin sur les deux côtés.',
    duration: '7 min',
    video: 'https://www.youtube.com/embed/XFRqT3miJ3I',
  },
  {
    id: 'i3', level: 'INTERMÉDIAIRE',
    title: 'Top revers vitesse',
    desc: 'Utiliser le poignet pour accélérer son revers.',
    duration: '4 min',
    video: 'https://www.youtube.com/embed/pg-mNoEyO-4',
  },
  {
    id: 'i4', level: 'INTERMÉDIAIRE',
    title: 'Backhand flick (PingSkills)',
    desc: 'Le geste fondamental expliqué pas à pas.',
    duration: '5 min',
    video: 'https://www.youtube.com/embed/heJZe0OTDnA',
  },
  {
    id: 'i5', level: 'INTERMÉDIAIRE',
    title: '5 indices pour lire l\u2019effet d\u2019un service',
    desc: 'Décoder le spin d\u2019un service en match.',
    duration: '12 min',
    video: 'https://www.youtube.com/embed/rrS7Wjh35cU',
  },

  // ----- EXPERT (5 vidéos, mises à jour) -----
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
    title: 'Pendulum serve : le service pro',
    desc: 'Maîtriser le service le plus utilisé chez les pros.',
    duration: '10 min',
    video: 'https://www.youtube.com/embed/FExU6SlIIl0',
  },
  {
    id: 'e4', level: 'EXPERT',
    title: 'Secrets du pendulum de Timo Boll',
    desc: 'Décomposition détaillée du service de Timo Boll.',
    duration: '7 min',
    video: 'https://www.youtube.com/embed/49f2nGErIEM',
  },
  {
    id: 'e5', level: 'EXPERT',
    title: 'Footwork pro (champion du monde)',
    desc: 'Déplacements latéraux par J-P Gatien.',
    duration: '3 min',
    video: 'https://www.youtube.com/embed/2swUt6GTL58',
  },
];
