-- ============================================================
-- Strav_pingpang · Seed data CHAT (donnees actuelles du mockup)
-- A executer APRES 01_schema.sql
-- ============================================================

-- IDs fixes pour pouvoir referencer entre tables
-- Profile "toi" (utilisateur connecte)
insert into profiles (id, full_name, short_name, elo, rank, style, color_light, color_mid, color_dark, online, is_self) values
  ('11111111-1111-1111-1111-111111111111', 'Eugenia Sorel', 'Eugenia', 1450, '#24 Paris', 'Attaquant', '#d6b890', '#6b4a2e', '#1c100a', false, true);

-- Amis (FRIENDS + FRIENDS_ALL)
insert into profiles (id, full_name, short_name, elo, online, color_light, color_mid, color_dark) values
  ('22222222-0000-0000-0000-000000000001', 'Marc Leclerc',    'Marc L.',    1520, true,  '#a8c2db', '#3b5a7a', '#0d1a2a'),
  ('22222222-0000-0000-0000-000000000002', 'Sophie Martin',   'Sophie M.',  1380, false, '#d6a8a8', '#7a3b3b', '#2a0d0d'),
  ('22222222-0000-0000-0000-000000000003', 'Theo Rousseau',   'Theo R.',    1612, true,  '#bedba8', '#5a7a3b', '#1a2a0d'),
  ('22222222-0000-0000-0000-000000000004', 'Lea Petit',       'Lea P.',     1290, false, '#d6c0a8', '#7a5e3b', '#2a1f0d'),
  ('22222222-0000-0000-0000-000000000005', 'Karim Benali',    'Karim B.',   1475, true,  '#a8b8d6', '#3b4d7a', '#0d142a'),
  ('22222222-0000-0000-0000-000000000006', 'Julie Dupont',    'Julie D.',   1340, false, '#d6b890', '#6b4a2e', '#1c100a'),
  ('22222222-0000-0000-0000-000000000007', 'Hugo Tran',       'Hugo T.',    1580, false, '#a8c2db', '#3b5a7a', '#0d1a2a'),
  ('22222222-0000-0000-0000-000000000008', 'Ines Fernandez',  'Ines F.',    1410, true,  '#d6a8a8', '#7a3b3b', '#2a0d0d'),
  ('22222222-0000-0000-0000-000000000009', 'Pierre Garnier',  'Pierre G.',  1655, false, '#bedba8', '#5a7a3b', '#1a2a0d'),
  ('22222222-0000-0000-0000-00000000000a', 'Camille Vidal',   'Camille V.', 1225, false, '#d6c0a8', '#7a5e3b', '#2a1f0d'),
  ('22222222-0000-0000-0000-00000000000b', 'Lucas Bernard',   'Lucas B.',   1495, true,  '#a8b8d6', '#3b4d7a', '#0d142a'),
  ('22222222-0000-0000-0000-00000000000c', 'Manon Simon',     'Manon S.',   1360, false, '#d6b890', '#6b4a2e', '#1c100a'),
  -- Coach Bernard
  ('33333333-0000-0000-0000-000000000001', 'Coach Bernard',   'Bernard',    1700, false, '#d6b890', '#6b4a2e', '#1c100a'),
  -- Antoine D. (demande)
  ('44444444-0000-0000-0000-000000000001', 'Antoine D.',      'Antoine',    1400, false, '#cccccc', '#666666', '#222222');

-- Friendships (Eugenia <-> les 12 amis)
insert into friendships (user_a, user_b, status)
select '11111111-1111-1111-1111-111111111111'::uuid, id, 'accepted'
from profiles
where id::text like '22222222-%';

-- ============================================================
-- CLUBS
-- ============================================================
insert into clubs (id, name, sub, member_count, color_light, color_mid, color_dark, is_active) values
  ('55555555-0000-0000-0000-000000000001', 'Le Marais Ping', 'Club principal · 38 membres', 38, '#d6b890', '#6b4a2e', '#1c100a', true),
  ('55555555-0000-0000-0000-000000000002', 'Bastille TT',    'Loisir · 24 membres',          24, '#a8c2db', '#3b5a7a', '#0d1a2a', false);

-- Eugenia membre des 2 clubs
insert into club_members (club_id, user_id, role) values
  ('55555555-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'member'),
  ('55555555-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'member');

-- Coach Bernard membre du Marais en tant que coach
insert into club_members (club_id, user_id, role) values
  ('55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'coach');

-- ============================================================
-- ANNONCES (Coach Bernard au Marais)
-- ============================================================
insert into announcements (club_id, author_id, text, views, comments, likes, created_at) values
  ('55555555-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000001',
   'Entrainement de jeudi decale a 20h00 (au lieu de 19h). Pensez a vos chaussures propres',
   28, 12, 4,
   now());

-- ============================================================
-- ENTRAINEMENTS
-- ============================================================
insert into trainings (club_id, starts_at, location, title) values
  ('55555555-0000-0000-0000-000000000001',
   (date_trunc('month', now()) + interval '22 days' + interval '20 hours'),
   'Le Marais Ping · Salle 1',
   'Prochain entrainement');

-- ============================================================
-- CONVERSATIONS (CHAT TOUS)
-- ============================================================
-- DM Marc Leclerc
insert into conversations (id, type, preview, preview_at) values
  ('66666666-0000-0000-0000-000000000001', 'dm', 'Defi propose · Samedi 14h', now() - interval '2 minutes');
insert into conversation_members (conversation_id, user_id) values
  ('66666666-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('66666666-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001');

-- DM Theo
insert into conversations (id, type, preview, preview_at) values
  ('66666666-0000-0000-0000-000000000002', 'dm', 'GG pour hier ! Revanche quand tu veux', now() - interval '12 minutes');
insert into conversation_members (conversation_id, user_id) values
  ('66666666-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111'),
  ('66666666-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003');

-- DM Sophie
insert into conversations (id, type, preview, preview_at) values
  ('66666666-0000-0000-0000-000000000003', 'dm', 'Defi a confirmer · Dim. 11h', now() - interval '1 hour');
insert into conversation_members (conversation_id, user_id) values
  ('66666666-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111'),
  ('66666666-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002');

-- DM Karim
insert into conversations (id, type, preview, preview_at) values
  ('66666666-0000-0000-0000-000000000004', 'dm', 'Toi : Ok ca marche, a demain', now() - interval '3 hours');
insert into conversation_members (conversation_id, user_id) values
  ('66666666-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111'),
  ('66666666-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000005');

-- DM Lea (avec voice)
insert into conversations (id, type, preview, preview_at, has_voice) values
  ('66666666-0000-0000-0000-000000000005', 'dm', 'Message vocal · 0:24', now() - interval '1 day', true);
insert into conversation_members (conversation_id, user_id) values
  ('66666666-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111'),
  ('66666666-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000004');

-- Conv Antoine D. (demande)
insert into conversations (id, type, preview, preview_at, is_demande) values
  ('66666666-0000-0000-0000-000000000006', 'request',
   'Salut, j ai vu ton profil sur l app...',
   now() - interval '2 days', true);
insert into conversation_members (conversation_id, user_id) values
  ('66666666-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111'),
  ('66666666-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000001');

-- ============================================================
-- TEAM GROUPS (chats club/equipe)
-- ============================================================
insert into conversations (id, type, name, club_id, preview, preview_at) values
  ('77777777-0000-0000-0000-000000000001', 'team',
   'Equipe 2 · Marais',
   '55555555-0000-0000-0000-000000000001',
   'Coach : Match dimanche a 14h, soyez la',
   now() - interval '2 hours');
insert into conversations (id, type, name, club_id, preview, preview_at) values
  ('77777777-0000-0000-0000-000000000002', 'team',
   'Equipe 1 · Marais',
   '55555555-0000-0000-0000-000000000001',
   'Theo : GG pour la victoire hier !',
   now() - interval '1 day');
insert into conversations (id, type, name, club_id, preview, preview_at) values
  ('77777777-0000-0000-0000-000000000003', 'team',
   'Groupe Loisir',
   '55555555-0000-0000-0000-000000000001',
   'Lea : Quelqu un dispo demain soir ?',
   now() - interval '3 days');

-- Eugenia dans les 3 groupes
insert into conversation_members (conversation_id, user_id)
select c.id, '11111111-1111-1111-1111-111111111111' from conversations c
where c.type = 'team';

-- ============================================================
-- MESSAGES (threads)
-- ============================================================
-- Marc Leclerc
insert into messages (conversation_id, sender_id, text, created_at, is_defi) values
  ('66666666-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Yo, dispo samedi 14h pour un set ?', now() - interval '30 minutes', false),
  ('66666666-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Carrement, Le Marais ?',                now() - interval '26 minutes', false),
  ('66666666-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Defi propose · Samedi 14h',             now() - interval '24 minutes', true);

-- Theo
insert into messages (conversation_id, sender_id, text, created_at) values
  ('66666666-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003', 'GG pour hier !',                    now() - interval '20 minutes'),
  ('66666666-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003', 'Revanche quand tu veux',            now() - interval '20 minutes'),
  ('66666666-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Avec plaisir, t as bien joue',      now() - interval '12 minutes');

-- Sophie
insert into messages (conversation_id, sender_id, text, created_at, is_defi) values
  ('66666666-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'Defi a confirmer · Dim. 11h', now() - interval '1 hour', true);

-- Karim
insert into messages (conversation_id, sender_id, text, created_at) values
  ('66666666-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000005', 'On se voit demain a 19h ?',   now() - interval '4 hours'),
  ('66666666-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Ok ca marche, a demain',      now() - interval '3 hours');

-- Lea (vocal)
insert into messages (conversation_id, sender_id, text, is_voice, audio_duration, created_at) values
  ('66666666-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000004', '[Message vocal]', true, 24, now() - interval '1 day');

-- Antoine
insert into messages (conversation_id, sender_id, text, created_at) values
  ('66666666-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000001',
   'Salut, j ai vu ton profil sur l app. Tu joues au Marais ? On pourrait se faire un match.',
   now() - interval '2 days');

-- ============================================================
-- CHALLENGES
-- ============================================================
-- INCOMING : Marc te defie
insert into challenges (from_id, to_id, status, match_date, venue, format, enjeu, gain_w, loss_l, created_at) values
  ('22222222-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'sent',
   'Sam 21 · 14h',
   'Marais · T3',
   'BO5', 'Classe', 18, 12,
   now() - interval '2 minutes');

-- OUTGOING : Eugenia -> Karim (sent)
insert into challenges (from_id, to_id, status, match_date, venue, format, enjeu, created_at) values
  ('11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000005',
   'sent',
   'Dim 22 · 11h',
   'Bastille TT', 'BO3', 'Amical',
   now() - interval '1 hour');

-- OUTGOING : Eugenia -> Hugo (seen)
insert into challenges (from_id, to_id, status, match_date, venue, format, enjeu, seen_at, created_at) values
  ('11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000007',
   'seen',
   'Sam 21 · 16h',
   'Le Marais', 'BO5', 'Classe',
   now() - interval '30 minutes',
   now() - interval '1 hour');

-- OUTGOING : Eugenia -> Sophie (typing)
insert into challenges (from_id, to_id, status, match_date, venue, format, enjeu, seen_at, created_at) values
  ('11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000002',
   'typing',
   'Dim 22 · 11h',
   'Bastille TT', 'BO3', 'Amical',
   now() - interval '5 minutes',
   now() - interval '30 minutes');

-- OUTGOING : Eugenia -> Lea (refused)
insert into challenges (from_id, to_id, status, match_date, venue, format, enjeu, refusal_reason, responded_at, created_at) values
  ('11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000004',
   'refused',
   'Sam 21 · 19h',
   'Cafe Oberkampf', 'BO3', 'Amical',
   'Pas dispo ce jour-la',
   now() - interval '5 minutes',
   now() - interval '1 hour');

-- OUTGOING : Eugenia -> Theo (counter)
insert into challenges (from_id, to_id, status, match_date, venue, format, enjeu, counter_you, counter_them, counter_message, responded_at, created_at) values
  ('11111111-1111-1111-1111-111111111111',
   '22222222-0000-0000-0000-000000000003',
   'counter',
   'Dim 22 · 11h',
   '', 'BO5', 'Classe',
   'Dim 22 · 11h',
   'Lun 23 · 19h',
   'Le matin c est complique, ca te va lundi soir ?',
   now() - interval '10 minutes',
   now() - interval '1 hour');
