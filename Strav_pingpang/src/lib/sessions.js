// =====================================================================
// PING PANG PARIS — Séances d'entraînement guidées
//
// 3 niveaux : DÉBUTANT, INTERMÉDIAIRE, EXPERT
// Chaque séance = échauffement → exercices → récupération
// Les vidéos sont embarquées depuis YouTube (iframe).
//
// FORMAT VIDÉO YOUTUBE
//   Utiliser l'URL "embed" :  https://www.youtube.com/embed/VIDEO_ID
//   où VIDEO_ID est ce qui suit "?v=" dans l'URL de partage classique.
//   Exemple : watch?v=vnaY6ltLY-g  →  embed/vnaY6ltLY-g
//
// COMPOSANT MÉDIA (TrainScreen.jsx → SessionMedia)
//   - step.video : URL YouTube embed (prioritaire si présente)
//   - step.image : photo locale en fallback (ex '/media/sessions/x.jpg')
//   - les deux à null = placeholder "PHOTO / VIDÉO À VENIR"
//
// Sources : PingSkills (Australie), Tom Lodziak (UK), EmRatThich/PingSunday,
// Ti Long et chaîne ITTF. Toutes les vidéos sont publiques et embeddable.
// =====================================================================

export const SESSION_PHASES = {
  warmup:   { label: 'ÉCHAUFFEMENT', color: '#9BC9AE' },
  exercise: { label: 'EXERCICES',    color: '#E8C99B' },
  cooldown: { label: 'RÉCUPÉRATION', color: '#7DA9F4' },
};

export const SESSIONS = [
  // -------------------------------------------------------------------
  // DÉBUTANT — Fondamentaux : grip, posture, premiers gestes
  // -------------------------------------------------------------------
  {
    id: 'fondamentaux',
    title: 'Séance Fondamentaux',
    level: 'DÉBUTANT',
    duration: '30 min',
    focus: 'Grip, coup droit, revers et premier service',
    cover: null,
    steps: [
      {
        phase: 'warmup', title: 'Mobilité articulaire', duration: '5 min',
        image: null, video: null,
        desc: 'Rotations poignets, épaules et hanches. Préparer le corps au mouvement.',
      },
      {
        phase: 'warmup', title: 'Échanges lents au centre', duration: '5 min',
        image: null, video: 'https://www.youtube.com/embed/vnaY6ltLY-g',
        desc: 'Coup droit contre coup droit, rythme régulier, sans puissance. (PingSkills — Forehand counterhit lesson)',
      },
      {
        phase: 'exercise', title: 'Coup droit en diagonale', duration: '8 min',
        image: null, video: 'https://www.youtube.com/embed/iYRJ2YV3PGY',
        desc: 'Placement régulier en diagonale. Focus sur le point de contact. (PingSkills — Forehand & backhand counterhit)',
      },
      {
        phase: 'exercise', title: 'Revers bloc', duration: '7 min',
        image: null, video: 'https://www.youtube.com/embed/Hx5ZQSsmFjo',
        desc: 'Bloc revers court, rester compact près de la table. (PingSkills — Forehand & backhand push)',
      },
      {
        phase: 'cooldown', title: 'Étirements & respiration', duration: '5 min',
        image: null, video: null,
        desc: 'Étirements avant-bras et épaules. Respiration profonde.',
      },
    ],
  },
  {
    id: 'service-debutant',
    title: 'Premier Service',
    level: 'DÉBUTANT',
    duration: '25 min',
    focus: 'Apprendre à servir proprement',
    cover: null,
    steps: [
      {
        phase: 'warmup', title: 'Échauffement balle main', duration: '5 min',
        image: null, video: null,
        desc: 'Contrôle de balle, jonglage et toucher pour réveiller la main.',
      },
      {
        phase: 'exercise', title: 'Service de base', duration: '8 min',
        image: null, video: 'https://www.youtube.com/embed/NfmPcpi4sfc',
        desc: 'Les règles et la technique du premier service. (PingSkills — Basic serve)',
      },
      {
        phase: 'exercise', title: '4 services simples', duration: '8 min',
        image: null, video: 'https://www.youtube.com/embed/oL5BQuBuMHY',
        desc: 'Backspin, topspin, sidespin, no-spin — varier les effets simplement. (Tom Lodziak)',
      },
      {
        phase: 'cooldown', title: 'Étirements & respiration', duration: '4 min',
        image: null, video: null,
        desc: 'Relâchement épaules, poignet, dos.',
      },
    ],
  },

  // -------------------------------------------------------------------
  // INTERMÉDIAIRE — Top-spin et puissance
  // -------------------------------------------------------------------
  {
    id: 'topspin-intermediaire',
    title: 'Top-Spin Puissance',
    level: 'INTERMÉDIAIRE',
    duration: '45 min',
    focus: 'Rotation, accélération, top-spin contrôlé',
    cover: null,
    steps: [
      {
        phase: 'warmup', title: 'Shadow strokes', duration: '5 min',
        image: null, video: null,
        desc: 'Mouvement complet sans balle pour aligner la rotation d’épaule.',
      },
      {
        phase: 'warmup', title: 'Top-spin coup droit & revers', duration: '8 min',
        image: null, video: 'https://www.youtube.com/embed/XFRqT3miJ3I',
        desc: 'Revue des coups de base puis passage au top-spin. (PingSkills — Training 101)',
      },
      {
        phase: 'exercise', title: 'Top-spin sur balle coupée', duration: '12 min',
        image: null, video: 'https://www.youtube.com/embed/eLdsH1aFuT4',
        desc: 'Lift contre balle coupée — méthode basique, spin et vitesse. (Tom Lodziak)',
      },
      {
        phase: 'exercise', title: 'Améliorer son coup droit', duration: '8 min',
        image: null, video: 'https://www.youtube.com/embed/o6RWbZFB0oE',
        desc: 'Casser les mauvaises habitudes, créer la bonne mécanique. (Tom Lodziak)',
      },
      {
        phase: 'exercise', title: 'Revers down the line', duration: '7 min',
        image: null, video: 'https://www.youtube.com/embed/2yZpEHc8vrs',
        desc: 'Placement et précision du revers en ligne droite. (Tom Lodziak)',
      },
      {
        phase: 'cooldown', title: 'Retour au calme', duration: '5 min',
        image: null, video: null,
        desc: 'Échanges lents puis étirements ciblés épaules et lombaires.',
      },
    ],
  },
  {
    id: 'vitesse-revers',
    title: 'Vitesse au Revers',
    level: 'INTERMÉDIAIRE',
    duration: '30 min',
    focus: 'Accélérer son top-spin revers',
    cover: null,
    steps: [
      {
        phase: 'warmup', title: 'Échauffement progressif', duration: '5 min',
        image: null, video: null,
        desc: 'Échanges réguliers, monter en intensité graduellement.',
      },
      {
        phase: 'exercise', title: 'Vitesse du top revers', duration: '12 min',
        image: null, video: 'https://www.youtube.com/embed/pg-mNoEyO-4',
        desc: 'Utilisation du poignet et timing pour accélérer. (PingSunday — EmRatThich)',
      },
      {
        phase: 'exercise', title: 'Revers en déplacement', duration: '8 min',
        image: null, video: 'https://www.youtube.com/embed/iYRJ2YV3PGY',
        desc: 'Enchaîner revers + déplacement latéral, garder la compacité.',
      },
      {
        phase: 'cooldown', title: 'Relâchement', duration: '5 min',
        image: null, video: null,
        desc: 'Mobilité douce, étirements épaules et poignets.',
      },
    ],
  },

  // -------------------------------------------------------------------
  // EXPERT — Techniques avancées, footwork pro
  // -------------------------------------------------------------------
  {
    id: 'expert-zhang-jike',
    title: 'Top Revers Pro',
    level: 'EXPERT',
    duration: '50 min',
    focus: 'Technique Zhang Jike et déclinaisons modernes',
    cover: null,
    steps: [
      {
        phase: 'warmup', title: 'Activation & shadow strokes', duration: '6 min',
        image: null, video: null,
        desc: 'Activation cardio courte puis mise en place de la mécanique.',
      },
      {
        phase: 'exercise', title: 'Top revers Zhang Jike', duration: '12 min',
        image: null, video: 'https://www.youtube.com/embed/Ugrsk_TDdZk',
        desc: 'Décomposition complète de la technique de Zhang Jike. (Ti Long)',
      },
      {
        phase: 'exercise', title: 'Top revers pro Chinese style', duration: '10 min',
        image: null, video: 'https://www.youtube.com/embed/_G3ItT_AJF4',
        desc: 'Les 3 clés pour un revers agressif moderne. (EmRatThich)',
      },
      {
        phase: 'exercise', title: 'Revers avancé/intermédiaire', duration: '8 min',
        image: null, video: 'https://www.youtube.com/embed/NrUDpZzI1Fw',
        desc: 'Ajustements pour passer au niveau supérieur.',
      },
      {
        phase: 'exercise', title: 'Top revers ITTF (Michael Maze)', duration: '5 min',
        image: null, video: 'https://www.youtube.com/embed/W_yifhqHl5o',
        desc: 'Démonstration officielle ITTF par Michael Maze.',
      },
      {
        phase: 'cooldown', title: 'Récupération active', duration: '6 min',
        image: null, video: null,
        desc: 'Échanges lents, étirements ciblés, respiration.',
      },
    ],
  },
  {
    id: 'expert-footwork',
    title: 'Footwork Pro',
    level: 'EXPERT',
    duration: '40 min',
    focus: 'Déplacements latéraux et patterns chinois',
    cover: null,
    steps: [
      {
        phase: 'warmup', title: 'Activation jambes', duration: '6 min',
        image: null, video: null,
        desc: 'Sauts à la corde, talons-fesses, montées de genoux.',
      },
      {
        phase: 'exercise', title: 'Side-to-side de base à avancé', duration: '12 min',
        image: null, video: 'https://www.youtube.com/embed/lUTLexlAmSU',
        desc: 'Progression complète du déplacement latéral. (Ti Long)',
      },
      {
        phase: 'exercise', title: 'Footwork champion (J-P Gatien)', duration: '10 min',
        image: null, video: 'https://www.youtube.com/embed/2swUt6GTL58',
        desc: 'Tutoriel par le champion du monde 1993. (ITTF)',
      },
      {
        phase: 'exercise', title: 'Combinaison frappe + déplacement', duration: '6 min',
        image: null, video: null,
        desc: 'Enchaîner coup droit et revers avec footwork sur toute la table.',
      },
      {
        phase: 'cooldown', title: 'Étirements complets', duration: '6 min',
        image: null, video: null,
        desc: 'Mollets, ischio-jambiers, fléchisseurs de hanche.',
      },
    ],
  },
];
