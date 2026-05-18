import { insertRow, isSupabaseConfigured, selectRows, updateRows } from './supabaseClient';

export const SELF_PROFILE_ID = '11111111-1111-1111-1111-111111111111';

const FALLBACK_COLOR = ['#cccccc', '#666666', '#222222'];

function profileColor(profile) {
  if (!profile) return FALLBACK_COLOR;
  return [
    profile.color_light || FALLBACK_COLOR[0],
    profile.color_mid || FALLBACK_COLOR[1],
    profile.color_dark || FALLBACK_COLOR[2],
  ];
}

function shortName(fullName = '') {
  const [first, last] = fullName.split(' ');
  return last ? `${first} ${last[0]}.` : fullName;
}

function firstName(profileOrName) {
  const name = typeof profileOrName === 'string' ? profileOrName : profileOrName?.full_name;
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
  return {
    id: profile.id,
    profileId: profile.id,
    name: profile.short_name || shortName(profile.full_name),
    full: profile.full_name,
    elo: profile.elo,
    rank: profile.rank || (leaderboardRankById.has(profile.id) ? `#${leaderboardRankById.get(profile.id)}` : null),
    style: profile.style,
    online: Boolean(profile.online),
    color: profileColor(profile),
  };
}

function challengeSummary(challenge) {
  return [challenge.match_date, challenge.venue, challenge.format, challenge.enjeu]
    .filter(Boolean)
    .join(' · ');
}

function mapChallenge(challenge, profile, direction, leaderboardRankById) {
  const mappedProfile = mapProfile(profile, leaderboardRankById);
  const common = {
    id: challenge.id,
    challengeId: challenge.id,
    profileId: profile?.id,
    full: mappedProfile.full,
    from: firstName(profile),
    color: mappedProfile.color,
    online: mappedProfile.online,
    elo: mappedProfile.elo,
    rank: mappedProfile.rank,
    when: formatRelative(challenge.created_at),
    status: challenge.status,
    date: challenge.match_date,
    venue: challenge.venue,
    format: challenge.format,
    enjeu: challenge.enjeu,
    gainW: challenge.gain_w,
    lossL: challenge.loss_l,
    summary: challengeSummary(challenge),
    refusalReason: challenge.refusal_reason,
    seenAgo: challenge.seen_at ? formatRelative(challenge.seen_at) : null,
    counter: challenge.counter_you || challenge.counter_them || challenge.counter_message
      ? {
          you: challenge.counter_you,
          them: challenge.counter_them,
          message: challenge.counter_message,
        }
      : null,
  };
  return direction === 'incoming' ? { ...common, isNew: challenge.status === 'sent' } : common;
}

function mapClub(club) {
  return {
    id: club.id,
    name: club.name,
    sub: club.sub || `${club.member_count || 0} membres`,
    color: [club.color_light, club.color_mid, club.color_dark].map((c, i) => c || FALLBACK_COLOR[i]),
    active: Boolean(club.is_active),
  };
}

function mapAnnouncement(row, profilesById) {
  const author = profilesById.get(row.author_id);
  return {
    id: row.id,
    author: author?.full_name || 'Coach',
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
  const self = profiles.find((profile) => profile.is_self) || profilesById.get(SELF_PROFILE_ID) || profiles[0];
  const selfId = self?.id || SELF_PROFILE_ID;
  const leaderboard = [...profiles]
    .filter((profile) => Number.isFinite(profile.elo))
    .sort((a, b) => b.elo - a.elo)
    .map((profile, index) => ({ ...mapProfile(profile), globalRank: index + 1 }));
  const leaderboardRankById = new Map(leaderboard.map((profile) => [profile.id, profile.globalRank]));
  const membersByConversation = buildMembersByConversation(memberships);
  const messagesByConversation = buildMessagesByConversation(messages, selfId);

  const chatConversations = conversations.map((conversation) => {
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
      online: Boolean(otherProfile?.online),
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

  const friends = profiles
    .filter((profile) => profile.id !== selfId && profile.id?.startsWith('22222222-'))
    .map((profile) => mapProfile(profile, leaderboardRankById));

  const incoming = challenges
    .filter((challenge) => challenge.to_id === selfId && challenge.status !== 'accepted')
    .map((challenge) => mapChallenge(challenge, profilesById.get(challenge.from_id), 'incoming', leaderboardRankById));
  const outgoing = challenges
    .filter((challenge) => challenge.from_id === selfId && challenge.status !== 'accepted')
    .map((challenge) => mapChallenge(challenge, profilesById.get(challenge.to_id), 'outgoing', leaderboardRankById));
  const accepted = challenges
    .filter((challenge) => challenge.status === 'accepted' && [challenge.from_id, challenge.to_id].includes(selfId))
    .map((challenge) => {
      const otherId = challenge.from_id === selfId ? challenge.to_id : challenge.from_id;
      return mapChallenge(challenge, profilesById.get(otherId), 'accepted', leaderboardRankById);
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

export async function saveChallenge({ selfId = SELF_PROFILE_ID, opponentId, matchDate, venue, format, enjeu, message, gainW, lossL, fromElo, toElo }) {
  const [challenge] = await insertRow('challenges', {
    from_id: selfId,
    to_id: opponentId,
    status: 'sent',
    match_date: matchDate,
    venue,
    format,
    enjeu,
    message,
    gain_w: gainW,
    loss_l: lossL,
    from_elo: fromElo,
    to_elo: toElo,
  });
  return challenge;
}

export async function updateChallenge(challengeId, patch) {
  const [challenge] = await updateRows('challenges', { id: `eq.${challengeId}` }, patch);
  return challenge;
}
