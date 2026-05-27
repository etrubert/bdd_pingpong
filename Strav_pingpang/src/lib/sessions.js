// =====================================================================
// PING PANG PARIS — Séances d'entraînement guidées (changement 3)
//
// Chaque séance = échauffement → exercices → récupération.
// Chaque étape a un emplacement média (image OU video) à remplir plus tard.
//
// EMPLACEMENTS MÉDIA :
//   - step.image : chemin vers une photo, ex '/media/sessions/warmup-1.jpg'
//   - step.video : chemin/URL vers une vidéo (mp4 local dans /public/media/...
//                  ou URL YouTube/Vimeo). Si présent, prioritaire sur image.
//   Laisse les deux à null pour afficher le placeholder "média à venir".
//
// Pour ajouter tes médias : dépose les fichiers dans
//   Strav_pingpang/public/media/sessions/  puis renseigne le chemin ici.
// =====================================================================

export const SESSION_PHASES = {
  warmup:   { label: 'ÉCHAUFFEMENT', color: '#9BC9AE' },
  exercise: { label: 'EXERCICES',    color: '#E8C99B' },
  cooldown: { label: 'RÉCUPÉRATION', color: '#7DA9F4' },
};

// image / video : null = emplacement vide (placeholder affiché).
export const SESSIONS = [
  {
    id: 'fondamentaux',
    title: 'Séance Fondamentaux',
    level: 'DÉBUTANT',
    duration: '30 min',
    focus: 'Coup droit & revers de base',
    cover: null, // vignette de couverture (image)
    steps: [
      { phase: 'warmup',   title: 'Mobilité articulaire',     duration: '5 min',  image: null, video: null,
        desc: 'Rotations poignets, épaules et hanches. Préparer le corps au mouvement.' },
      { phase: 'warmup',   title: 'Échanges lents au centre',  duration: '5 min',  image: null, video: null,
        desc: 'Coup droit contre coup droit, rythme régulier, sans puissance.' },
      { phase: 'exercise', title: 'Coup droit en diagonale',   duration: '8 min',  image: null, video: null,
        desc: 'Placement régulier en diagonale. Focus sur le point de contact.' },
      { phase: 'exercise', title: 'Revers bloc',               duration: '7 min',  image: null, video: null,
        desc: 'Bloc revers court contre top-spin. Rester compact près de la table.' },
      { phase: 'cooldown', title: 'Étirements & respiration',  duration: '5 min',  image: null, video: null,
        desc: 'Étirements avant-bras et épaules. Respiration profonde.' },
    ],
  },
  {
    id: 'topspin-power',
    title: 'Top-Spin Puissance',
    level: 'INTERMÉDIAIRE',
    duration: '45 min',
    focus: 'Rotation & accélération',
    cover: null,
    steps: [
      { phase: 'warmup',   title: 'Shadow strokes',            duration: '5 min',  image: null, video: null,
        desc: 'Mouvement complet sans balle pour aligner la rotation d\u2019épaule.' },
      { phase: 'warmup',   title: 'Échanges progressifs',      duration: '7 min',  image: null, video: null,
        desc: 'Monter en intensité graduellement, coup droit puis revers.' },
      { phase: 'exercise', title: 'Top-spin sur coupé',        duration: '12 min', image: null, video: null,
        desc: 'Lift contre balle coupée. Travail du frottement et de la trajectoire.' },
      { phase: 'exercise', title: 'Enchaînement CD/revers',    duration: '10 min', image: null, video: null,
        desc: 'Alternance top coup droit / bloc revers en déplacement latéral.' },
      { phase: 'exercise', title: 'Top-spin à mi-distance',    duration: '6 min',  image: null, video: null,
        desc: 'Recul d\u2019un mètre, top puissant. Engager les jambes.' },
      { phase: 'cooldown', title: 'Retour au calme',           duration: '5 min',  image: null, video: null,
        desc: 'Échanges lents puis étirements ciblés épaules et lombaires.' },
    ],
  },
  {
    id: 'service-retour',
    title: 'Service & Retour',
    level: 'TOUS NIVEAUX',
    duration: '35 min',
    focus: 'Variations & lecture du jeu',
    cover: null,
    steps: [
      { phase: 'warmup',   title: 'Échauffement balle main',   duration: '5 min',  image: null, video: null,
        desc: 'Contrôle de balle, jonglage et toucher pour réveiller la main.' },
      { phase: 'exercise', title: 'Services courts coupés',    duration: '10 min', image: null, video: null,
        desc: 'Service court avec rotation. Travailler la 2e rebond sur la table adverse.' },
      { phase: 'exercise', title: 'Services longs rapides',    duration: '8 min',  image: null, video: null,
        desc: 'Service tendu et profond. Surprendre par le changement de longueur.' },
      { phase: 'exercise', title: 'Lecture & retour',          duration: '7 min',  image: null, video: null,
        desc: 'Identifier l\u2019effet adverse et choisir le bon retour (poussette/flip).' },
      { phase: 'cooldown', title: 'Relâchement',               duration: '5 min',  image: null, video: null,
        desc: 'Mobilité douce et respiration pour clore la séance.' },
    ],
  },
];
