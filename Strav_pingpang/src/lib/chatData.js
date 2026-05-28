import { insertRow, isSupabaseConfigured, selectRows, updateRows } from './supabaseClient';

export const SELF_PROFILE_ID = '11111111-1111-1111-1111-111111111111';

const FALLBACK_COLOR = ['#cccccc', '#666666', '#222222'];
const PALETTE = [
  ['#a8c2db', '#3b5a7a', '#0d1a2a'],  // blue
  ['#d6a8a8', '#7a3b3b', '#2a0d0d'],  // red
  ['#bedba8', '#5a7a3b', '#1a2a0d'],  // green
  ['#d6c0a8', '#7a5e3b', '#2a1f0d'],  // brown
  ['#a8b8d6', '#3b4d7a', '#0d142a'],  // indigo
  ['#d6b890', '#6b4a2e', '#1c100a'],  // ochre
];

// Couleur deterministe depuis l'id (utilise quand le profil n'a pas de couleur stockee)
function colorFromId(id) {
  if (!id) return FALLBACK_COLOR;
  const hash = id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
  return PALETTE[hash % PALETTE.length];
}

function profileColor(profile) {
  if (!profile) return FALLBACK_COLOR;
  // colonnes color_* n'existent pas dans le schema — on derive de l'id
  return colorFromId(profile.id);
}

function shortName(fullName = '') {
  const [first, last] = fullName.split(' ');
  return last ? `${first} ${last[0]}.` : fullName;
}

function firstName(profileOrName) {
  const name = typeof profileOrName === 'string'
    ? profileOrName
    : profileOrName?.display_name;
  return (name || '').split(' ')[0] || name || 'Joueur';
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const min = Math.max(0, Math.round(diffMs / 60000));
  if (min < 1) return 'maintenant';
  if (min < 60) return `${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Hier';
  if (days < 7) return `${days} j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

// Pour `match_date` lisible (ex: "Sam 21 · 14h")
function formatMatchDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return `${days[date.getDay()]} ${date.getDate()} · ${date.getHours()}h${date.getMinutes() ? String(date.getMinutes()).padStart(2, '0') : ''}`;
}

function buildMembersByConversation(rows) {
  return rows.reduce((acc, row) => {
    if (!acc.has(row.conversation_id)) acc.set(row.conversation_id, []);
    acc.get(row.conversation_id).push(row.user_id);
    return acc;
  }, new Map());
}

function buildMessagesByConversation(rows, selfId) {
  const map = new Map();
  rows.forEach((message) => {
    if (!map.has(message.conversation_id)) map.set(message.conversation_id, []);
    map.get(message.conversation_id).push({
      id: message.id,
      from: message.sender_id === selfId ? 'me' : 'them',
      text: message.is_voice
        ? `[Message vocal · 0:${String(message.audio_duration || 0).padStart(2, '0')}]`
        : message.text,
      when: formatTime(message.created_at),
      isDefi: message.is_defi,
      isVoice: message.is_voice,
    });
  });
  return map;
}

function mapProfile(profile, leaderboardRankById = new Map()) {
  if (!profile) return null;
  const fullName = profile.display_name || profile.email?.split('@')[0] || 'Joueur';
  return {
    id: profile.id,
    profileId: profile.id,
    name: shortName(fullName),
    full: fullName,
    elo: profile.elo_rating ?? null,
    rank: leaderboardRankById.has(profile.id) ? `#${leaderboardRankById.get(profile.id)}` : null,
    style: profile.play_style,
    online: false, // pas trace dans le schema
    color: profileColor(profile),
  };
}

function challengeSummary(challenge) {
  return [formatMatchDate(challenge.proposed_date), challenge.proposed_location, challenge.message]
    .filter(Boolean)
    .join(' · ');
}

// Map statut Supabase ('pending', 'declined', 'accepted', 'completed', 'expired')
// -> statut app ('sent', 'refused', 'accepted', 'completed', etc.)
function mapStatus(status) {
  switch (status) {
    case 'declined':  return 'refused';
    case 'pending':   return 'sent';
    case 'accepted':  return 'accepted';
    case 'completed': return 'completed';
    case 'expired':   return 'expired';
    default:          return status || 'sent';
  }
}

function computeChallengeEloOutcome(myElo = 1200, oppElo = 1200, kFactor = 32) {
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  return {
    gainW: Math.max(1, Math.round(kFactor * (1 - expected))),
    lossL: Math.max(1, Math.round(kFactor * expected)),
  };
}

const DEMO_SELF_ELO = 1450;

function withDemoEloImpact(challenge, selfElo = DEMO_SELF_ELO) {
  const isFriendly = (challenge.enjeu || '').toLowerCase().includes('amical');
  if (isFriendly) return { ...challenge, gainW: 0, lossL: 0 };
  const { gainW, lossL } = computeChallengeEloOutcome(selfElo, challenge.elo);
  return { ...challenge, gainW, lossL };
}

function mapChallenge(challenge, profile, direction, leaderboardRankById, selfElo) {
  const mappedProfile = mapProfile(profile, leaderboardRankById);
  const status = mapStatus(challenge.status);
  const { gainW, lossL } = computeChallengeEloOutcome(selfElo, mappedProfile?.elo);
  return {
    id: challenge.id,
    challengeId: challenge.id,
    profileId: profile?.id,
    full: mappedProfile?.full,
    from: firstName(profile),
    color: mappedProfile?.color || FALLBACK_COLOR,
    online: mappedProfile?.online || false,
    elo: mappedProfile?.elo,
    rank: mappedProfile?.rank,
    when: formatRelative(challenge.created_at),
    status,
    date: formatMatchDate(challenge.proposed_date),
    venue: challenge.proposed_location,
    format: 'BO5',         // pas dans le schema, defaut affichage
    enjeu: 'Classé',       // pas dans le schema, defaut affichage
    gainW,
    lossL,
    summary: challengeSummary(challenge),
    refusalReason: status === 'refused' ? (challenge.message || 'Pas dispo') : null,
    isNew: direction === 'incoming' && status === 'sent',
  };
}

function mapClub(club) {
  return {
    id: club.id,
    name: club.name,
    sub: club.sub || `${club.member_count || 0} membres`,
    color: colorFromId(club.id),
    active: Boolean(club.is_active),
  };
}

function mapAnnouncement(row, profilesById) {
  const author = profilesById.get(row.author_id);
  return {
    id: row.id,
    author: author?.display_name || 'Coach',
    profileId: author?.id,
    color: profileColor(author),
    message: row.text,
    when: formatRelative(row.created_at),
    vus: row.views || 0,
    comments: row.comments || 0,
    likes: row.likes || 0,
  };
}

function mapTraining(row) {
  const date = new Date(row.starts_at);
  const labels = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
  return {
    id: row.id,
    dayLabel: Number.isNaN(date.getTime()) ? 'JEU' : labels[date.getDay()],
    dayNum: Number.isNaN(date.getTime()) ? '' : date.getDate(),
    title: row.title || 'Prochain entrainement',
    details: `${Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${row.location || ''}`,
  };
}

export async function loadChatBundle(currentUserId) {
  if (!isSupabaseConfigured) return null;

  const [
    profiles,
    memberships,
    conversations,
    messages,
    challenges,
    clubs,
    announcements,
    trainings,
  ] = await Promise.all([
    selectRows('profiles', { select: '*' }),
    selectRows('conversation_members', { select: '*' }),
    selectRows('conversations', { select: '*', order: 'preview_at.desc.nullslast,created_at.desc' }),
    selectRows('messages', { select: '*', order: 'created_at.asc' }),
    selectRows('challenges', { select: '*', order: 'created_at.desc' }),
    selectRows('clubs', { select: '*', order: 'is_active.desc,name.asc' }),
    selectRows('announcements', { select: '*', order: 'created_at.desc', limit: '5' }),
    selectRows('trainings', { select: '*', order: 'starts_at.asc', limit: '5' }),
  ]);

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  // selfId = utilisateur authentifié (jamais un mock par defaut).
  // Si pas connecte, on retourne tout vide pour eviter de "voir" des conversations d'autrui.
  if (!currentUserId) {
    return {
      self: null,
      selfId: null,
      friends: [],
      conversations: [],
      incoming: [],
      outgoing: [],
      accepted: [],
      clubs: clubs.map(mapClub),
      announcements: announcements.map((row) => mapAnnouncement(row, profilesById)),
      training: trainings.length ? mapTraining(trainings[0]) : null,
      teamGroups: [],
      leaderboard: [],
    };
  }
  const self = profilesById.get(currentUserId);
  const selfId = currentUserId;

  // Leaderboard derive de elo_rating
  const leaderboard = [...profiles]
    .filter((profile) => Number.isFinite(profile.elo_rating))
    .sort((a, b) => b.elo_rating - a.elo_rating)
    .map((profile, index) => ({ ...mapProfile(profile), globalRank: index + 1 }));
  const leaderboardRankById = new Map(leaderboard.map((profile) => [profile.id, profile.globalRank]));

  const membersByConversation = buildMembersByConversation(memberships);
  const messagesByConversation = buildMessagesByConversation(messages, selfId);

  // Ne garder que les conversations dont je suis membre
  const myConvIdsForChat = new Set(
    memberships.filter((m) => m.user_id === selfId).map((m) => m.conversation_id),
  );
  const myConversations = conversations.filter((c) => myConvIdsForChat.has(c.id));

  const chatConversations = myConversations.map((conversation) => {
    const memberIds = membersByConversation.get(conversation.id) || [];
    const otherMemberIds = memberIds.filter((id) => id !== selfId);
    const otherProfile = profilesById.get(otherMemberIds[0]);
    const secondProfile = profilesById.get(otherMemberIds[1]);
    const mappedProfile = otherProfile ? mapProfile(otherProfile, leaderboardRankById) : null;
    const convMessages = messagesByConversation.get(conversation.id) || [];
    const isClub = conversation.type === 'team' || conversation.type === 'club';
    const name = conversation.name || mappedProfile?.full || 'Conversation';

    return {
      id: conversation.id,
      conversationId: conversation.id,
      type: conversation.type,
      selfId,
      profileId: otherProfile?.id,
      full: name,
      name: mappedProfile?.name || name,
      elo: mappedProfile?.elo,
      rank: mappedProfile?.rank,
      color: mappedProfile?.color || profileColor(otherProfile),
      colorB: secondProfile ? profileColor(secondProfile) : null,
      online: Boolean(mappedProfile?.online),
      preview: conversation.preview || convMessages.at(-1)?.text || '',
      when: formatRelative(conversation.preview_at || conversation.created_at),
      unread: false,
      isDefi: Boolean(conversation.preview?.toLowerCase().includes('defi') || convMessages.some((m) => m.isDefi)),
      isClub,
      isDemande: Boolean(conversation.is_demande),
      voice: Boolean(conversation.has_voice),
      messages: convMessages,
    };
  });

  const teamGroups = chatConversations
    .filter((conversation) => conversation.isClub)
    .map((conversation, index) => ({
      id: conversation.id,
      conversationId: conversation.conversationId,
      selfId,
      name: conversation.full,
      full: conversation.full,
      tag: index === 0 ? 'TON EQUIPE' : null,
      preview: conversation.preview,
      meta: conversation.type === 'club' ? 'Club' : 'Equipe',
      when: conversation.when,
      unread: conversation.unread,
      extra: Math.max(0, (membersByConversation.get(conversation.id)?.length || 1) - 2),
      colors: [conversation.color, conversation.colorB || FALLBACK_COLOR],
      color: conversation.color,
      online: false,
      messages: conversation.messages,
    }));

  // Amis = profils des autres membres avec qui j'ai au moins une conversation DM.
  // Nouveau user sans aucune conversation -> liste vide (il ajoute qui il veut).
  const myConvIds = new Set(
    memberships.filter((m) => m.user_id === selfId).map((m) => m.conversation_id),
  );
  const dmConvIds = new Set(
    conversations.filter((c) => c.type === 'dm' && myConvIds.has(c.id)).map((c) => c.id),
  );
  const friendIds = new Set();
  memberships.forEach((m) => {
    if (dmConvIds.has(m.conversation_id) && m.user_id !== selfId) {
      friendIds.add(m.user_id);
    }
  });
  const friends = [...friendIds]
    .map((id) => profilesById.get(id))
    .filter(Boolean)
    .map((p) => mapProfile(p, leaderboardRankById));

  // Defis - schema utilise challenger_id / challenged_id, status: pending/accepted/declined
  const incoming = challenges
    .filter((c) => c.challenged_id === selfId && c.status === 'pending')
    .map((c) => mapChallenge(c, profilesById.get(c.challenger_id), 'incoming', leaderboardRankById, self?.elo_rating));
  const outgoing = challenges
    .filter((c) => c.challenger_id === selfId && c.status !== 'accepted' && c.status !== 'completed')
    .map((c) => mapChallenge(c, profilesById.get(c.challenged_id), 'outgoing', leaderboardRankById, self?.elo_rating));
  const accepted = challenges
    .filter((c) => c.status === 'accepted' && [c.challenger_id, c.challenged_id].includes(selfId))
    .map((c) => {
      const otherId = c.challenger_id === selfId ? c.challenged_id : c.challenger_id;
      return mapChallenge(c, profilesById.get(otherId), 'accepted', leaderboardRankById, self?.elo_rating);
    });

  return {
    self: self ? mapProfile(self, leaderboardRankById) : null,
    selfId,
    friends,
    conversations: chatConversations,
    incoming,
    outgoing,
    accepted,
    clubs: clubs.map(mapClub),
    announcements: announcements.map((row) => mapAnnouncement(row, profilesById)),
    training: trainings.length ? mapTraining(trainings[0]) : null,
    teamGroups,
    leaderboard,
  };
}

export async function saveMessage({ conversationId, senderId = SELF_PROFILE_ID, text }) {
  const [message] = await insertRow('messages', {
    conversation_id: conversationId,
    sender_id: senderId,
    text,
  });
  await updateRows('conversations', { id: `eq.${conversationId}` }, {
    preview: `Toi : ${text}`,
    preview_at: new Date().toISOString(),
  });
  return message;
}

export async function saveChallenge({ selfId = SELF_PROFILE_ID, opponentId, matchDate, venue, format, enjeu, message }) {
  const [challenge] = await insertRow('challenges', {
    challenger_id: selfId,
    challenged_id: opponentId,
    status: 'pending',
    proposed_date: matchDate ? new Date(matchDate).toISOString() : null,
    proposed_location: venue,
    message: [format, enjeu, message].filter(Boolean).join(' · '),
  });
  return challenge;
}

// Recherche de profils par nom (ilike) pour suggérer des contacts à ajouter.
// Si query est vide, renvoie une liste par défaut (top profils par ELO).
// Exclut l'utilisateur courant et les ids déjà connus (amis existants par ex).
export async function searchProfiles(query, { excludeIds = [], limit = 8 } = {}) {
  if (!isSupabaseConfigured) return [];
  const trimmed = (query || '').trim();
  const params = {
    select: 'id,display_name,elo_rating,play_style,email',
    limit: String(limit + excludeIds.length + 1),
  };
  if (trimmed.length >= 1) {
    params.display_name = `ilike.%${trimmed}%`;
    params.order = 'display_name.asc';
  } else {
    params.order = 'elo_rating.desc.nullslast,display_name.asc';
  }
  const rows = await selectRows('profiles', params);
  const excluded = new Set(excludeIds);
  return rows
    .filter((p) => !excluded.has(p.id) && p.display_name)
    .slice(0, limit)
    .map((p) => mapProfile(p));
}

// Crée (ou réutilise) une conversation DM entre selfId et otherId.
// Renvoie l'id de la conversation.
export async function startDmWith(selfId, otherId) {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré');
  if (!selfId || !otherId || selfId === otherId) throw new Error('Ids invalides');

  // Cherche une DM existante partagée par les deux.
  const [allMemberships, allConversations] = await Promise.all([
    selectRows('conversation_members', { select: '*' }),
    selectRows('conversations', { select: 'id,type' }),
  ]);
  const dmIds = new Set(allConversations.filter((c) => c.type === 'dm').map((c) => c.id));
  const myDm = new Set(
    allMemberships.filter((m) => m.user_id === selfId && dmIds.has(m.conversation_id)).map((m) => m.conversation_id),
  );
  const shared = allMemberships.find((m) => m.user_id === otherId && myDm.has(m.conversation_id));
  if (shared) return shared.conversation_id;

  const [conversation] = await insertRow('conversations', {
    type: 'dm',
    name: null,
    preview: null,
  });
  await insertRow('conversation_members', [
    { conversation_id: conversation.id, user_id: selfId },
    { conversation_id: conversation.id, user_id: otherId },
  ]);
  return conversation.id;
}

export async function updateChallenge(challengeId, patch) {
  // Si patch contient app status -> mapper vers schema status
  const schemaPatch = { ...patch };
  if (patch.status) {
    const map = { sent: 'pending', refused: 'declined', accepted: 'accepted', completed: 'completed' };
    schemaPatch.status = map[patch.status] || patch.status;
  }
  const [challenge] = await updateRows('challenges', { id: `eq.${challengeId}` }, schemaPatch);
  return challenge;
}

// =============================================================
// JEU DE DONNÉES DÉMO (amis fictifs, conversations, défis)
// Affiché quand le compte n'a pas encore d'amis/conversations
// dans Supabase, pour que le chat/défis ne soient pas vides.
// =============================================================

const DEMO_FRIENDS = [
  { id: 'demo-1', profileId: 'demo-1', name: 'Julien B.',  full: 'Julien Bertin',     elo: 1480, rank: '#218', style: 'attaquant',  online: true,  color: PALETTE[0] },
  { id: 'demo-2', profileId: 'demo-2', name: 'Marie L.',   full: 'Marie Lemaire',     elo: 1390, rank: '#312', style: 'polyvalent', online: false, color: PALETTE[1] },
  { id: 'demo-3', profileId: 'demo-3', name: 'Clara D.',   full: 'Clara Durand',      elo: 1510, rank: '#187', style: 'attaquant',  online: true,  color: PALETTE[2] },
  { id: 'demo-4', profileId: 'demo-4', name: 'Thomas R.',  full: 'Thomas Renaud',     elo: 1455, rank: '#256', style: 'defenseur',  online: false, color: PALETTE[3] },
  { id: 'demo-5', profileId: 'demo-5', name: 'Sophie L.',  full: 'Sophie Leroux',     elo: 1620, rank: '#94',  style: 'attaquant',  online: true,  color: PALETTE[4] },
  { id: 'demo-6', profileId: 'demo-6', name: 'Marc L.',    full: 'Marc Leclerc',      elo: 1520, rank: '#162', style: 'polyvalent', online: false, color: PALETTE[5] },
  { id: 'demo-7', profileId: 'demo-7', name: 'Paul D.',    full: 'Paul Dupont',       elo: 1340, rank: '#398', style: 'defenseur',  online: true,  color: PALETTE[0] },
];

const DEMO_CONVERSATIONS = [
  { id: 'conv-1', conversationId: 'conv-1', profileId: 'demo-1',
    full: 'Julien Bertin', name: 'Julien B.', elo: 1480, rank: '#218',
    color: PALETTE[0], online: true,
    preview: 'On se refait un match ce soir ?', when: '14:32',
    unread: true, isDefi: false, isClub: false, voice: false,
    messages: [
      { id: 'm-1-1', from: 'them', text: 'Salut ! Dispo ce soir ?', when: '14:30', isDefi: false },
      { id: 'm-1-2', from: 'them', text: 'On se refait un match ce soir ?', when: '14:32', isDefi: false },
    ],
  },
  { id: 'conv-2', conversationId: 'conv-2', profileId: 'demo-2',
    full: 'Marie Lemaire', name: 'Marie L.', elo: 1390, rank: '#312',
    color: PALETTE[1], online: false,
    preview: 'Bien joué pour hier ! 🏓', when: 'Hier',
    unread: false, isDefi: false, isClub: false, voice: false,
    messages: [
      { id: 'm-2-1', from: 'me',   text: 'GG pour la victoire !', when: '19:45', isDefi: false },
      { id: 'm-2-2', from: 'them', text: 'Bien joué pour hier ! 🏓', when: '20:02', isDefi: false },
    ],
  },
  { id: 'conv-3', conversationId: 'conv-3', profileId: 'demo-6',
    full: 'Marc Leclerc', name: 'Marc L.', elo: 1520, rank: '#162',
    color: PALETTE[5], online: false,
    preview: 'Je te défie samedi 14h ?', when: '2j',
    unread: true, isDefi: true, isClub: false, voice: false,
    messages: [
      { id: 'm-3-1', from: 'them', text: 'Je te défie samedi 14h ?', when: '10:15', isDefi: true },
    ],
  },
  { id: 'conv-4', conversationId: 'conv-4', profileId: null,
    full: 'Le Marais Ping · Équipe 2', name: 'Le Marais Ping',
    color: PALETTE[2], colorB: PALETTE[3], online: false,
    preview: 'Coach : RDV samedi 8h pour le match', when: '7j',
    unread: false, isDefi: false, isClub: true, voice: false,
    messages: [
      { id: 'm-4-1', from: 'them', text: 'Coach : RDV samedi 8h pour le match', when: '08:00', isDefi: false },
    ],
  },
  { id: 'conv-5', conversationId: 'conv-5', profileId: 'demo-3',
    full: 'Clara Durand', name: 'Clara D.', elo: 1510, rank: '#187',
    color: PALETTE[2], online: true,
    preview: '[Message vocal · 0:42]', when: '3j',
    unread: false, isDefi: false, isClub: false, voice: true,
    messages: [
      { id: 'm-5-1', from: 'them', text: '[Message vocal · 0:42]', when: '16:10', isDefi: false, isVoice: true },
    ],
  },
];

const DEMO_INCOMING = [
  { id: 'def-in-1', challengeId: 'def-in-1', profileId: 'demo-6',
    full: 'Marc Leclerc', from: 'Marc', color: PALETTE[5], online: false,
    elo: 1520, rank: '#162', when: '2h',
    status: 'sent', date: 'Sam 21 · 14h', venue: 'Marais T3',
    format: 'BO5', enjeu: 'Classé', gainW: 22, lossL: 12,
    summary: 'Sam 21 · 14h · Marais T3 · BO5 · Classé',
    isNew: true,
  },
  { id: 'def-in-2', challengeId: 'def-in-2', profileId: 'demo-5',
    full: 'Sophie Leroux', from: 'Sophie', color: PALETTE[4], online: true,
    elo: 1620, rank: '#94', when: '5h',
    status: 'sent', date: 'Dim 22 · 18h', venue: 'Bercy',
    format: 'BO5', enjeu: 'Classé', gainW: 28, lossL: 8,
    summary: 'Dim 22 · 18h · Bercy · BO5 · Classé',
    isNew: true,
  },
];

const DEMO_ACCEPTED = [
  { id: 'def-acc-1', challengeId: 'def-acc-1', profileId: 'demo-2',
    full: 'Marie Lemaire', from: 'Marie', color: PALETTE[1], online: false,
    elo: 1390, rank: '#312', when: '1j',
    status: 'accepted', date: 'Demain · 18h30', venue: 'Villette T1',
    format: 'BO5', enjeu: 'Classé', gainW: 14, lossL: 12,
    summary: 'Demain · 18h30 · Villette T1',
  },
  { id: 'def-acc-2', challengeId: 'def-acc-2', profileId: 'demo-3',
    full: 'Clara Durand', from: 'Clara', color: PALETTE[2], online: true,
    elo: 1510, rank: '#187', when: '2j',
    status: 'accepted', date: 'Sam 21 · 16h', venue: 'Luxembourg',
    format: 'BO7', enjeu: 'Tournoi', gainW: 18, lossL: 10,
    summary: 'Sam 21 · 16h · Luxembourg',
  },
];

const DEMO_OUTGOING = [
  { id: 'def-out-1', challengeId: 'def-out-1', profileId: 'demo-1',
    full: 'Julien Bertin', from: 'Julien', color: PALETTE[0], online: true,
    elo: 1480, rank: '#218', when: '2h',
    status: 'sent', date: 'Sam 21 · 20h', venue: 'BO5',
    format: 'BO5', enjeu: 'Classé', gainW: 14, lossL: 12,
    summary: 'Sam 21 · 20h · BO5',
  },
  { id: 'def-out-2', challengeId: 'def-out-2', profileId: 'demo-7',
    full: 'Paul Dupont', from: 'Paul', color: PALETTE[0], online: true,
    elo: 1340, rank: '#398', when: '1j',
    status: 'sent', date: 'Dim 22 · 11h', venue: 'BO3',
    format: 'BO3', enjeu: 'Amical', gainW: 0, lossL: 0,
    summary: 'Dim 22 · 11h · BO3',
  },
  { id: 'def-out-3', challengeId: 'def-out-3', profileId: 'demo-5',
    full: 'Sophie Leroux', from: 'Sophie', color: PALETTE[4], online: true,
    elo: 1620, rank: '#94', when: '3j',
    status: 'counter', date: 'Sam 21 · 14h', venue: 'Bercy',
    format: 'BO5', enjeu: 'Classé', gainW: 28, lossL: 8,
    summary: 'Contre-proposition reçue',
    counter: {
      you:     'Sam 21 · 14h',
      them:    'Dim 22 · 18h',
      message: 'Pas dispo samedi, dimanche ça t\'irait ?',
    },
  },
];

// --- Persistance "lu / non lu" des conversations (localStorage) ---
// Permet aux conversations marquées comme lues de le rester entre les
// ouvertures successives de la sheet Chat (et entre les reloads).
const READ_KEY = 'pp_read_convs';

export function getReadConvIds() {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export function markConvAsRead(conversationId) {
  if (!conversationId) return;
  const set = getReadConvIds();
  if (set.has(conversationId)) return;
  set.add(conversationId);
  try { localStorage.setItem(READ_KEY, JSON.stringify([...set])); } catch {}
}

function applyReadState(conversations) {
  const readSet = getReadConvIds();
  if (readSet.size === 0) return conversations;
  return conversations.map(c => readSet.has(c.id) ? { ...c, unread: false } : c);
}

export function getDemoChatBundle() {
  return {
    friends:       DEMO_FRIENDS,
    conversations: applyReadState(DEMO_CONVERSATIONS),
    incoming:      DEMO_INCOMING.map((c) => withDemoEloImpact(c)),
    outgoing:      DEMO_OUTGOING.map((c) => withDemoEloImpact(c)),
    accepted:      DEMO_ACCEPTED.map((c) => withDemoEloImpact(c)),
  };
}
