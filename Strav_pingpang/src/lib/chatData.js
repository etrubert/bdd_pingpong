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

function mapChallenge(challenge, profile, direction, leaderboardRankById) {
  const mappedProfile = mapProfile(profile, leaderboardRankById);
  const status = mapStatus(challenge.status);
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
    gainW: 14,             // pas dans le schema, valeur indicative
    lossL: 12,             // pas dans le schema, valeur indicative
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

export async function loadChatBundle() {
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
  const self = profilesById.get(SELF_PROFILE_ID) || profiles[0];
  const selfId = self?.id || SELF_PROFILE_ID;

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
    .map((c) => mapChallenge(c, profilesById.get(c.challenger_id), 'incoming', leaderboardRankById));
  const outgoing = challenges
    .filter((c) => c.challenger_id === selfId && c.status !== 'accepted' && c.status !== 'completed')
    .map((c) => mapChallenge(c, profilesById.get(c.challenged_id), 'outgoing', leaderboardRankById));
  const accepted = challenges
    .filter((c) => c.status === 'accepted' && [c.challenger_id, c.challenged_id].includes(selfId))
    .map((c) => {
      const otherId = c.challenger_id === selfId ? c.challenged_id : c.challenger_id;
      return mapChallenge(c, profilesById.get(otherId), 'accepted', leaderboardRankById);
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
