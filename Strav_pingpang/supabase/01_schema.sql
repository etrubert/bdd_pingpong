-- ============================================================
-- Strav_pingpang · Schema des donnees CHAT
-- A executer dans Supabase Dashboard -> SQL Editor
-- ============================================================

-- Extension pour UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES (utilisateurs)
-- ============================================================
create table if not exists profiles (
  id              uuid primary key default uuid_generate_v4(),
  full_name       text not null,
  short_name      text,                          -- "Marc L."
  elo             int default 1400,
  rank            text,                          -- "#18 Paris"
  style           text,                          -- "Attaquant"
  color_light     text,                          -- "#a8c2db"
  color_mid       text,                          -- "#3b5a7a"
  color_dark      text,                          -- "#0d1a2a"
  online          boolean default false,
  avatar_url      text,
  is_self         boolean default false,         -- true pour l'utilisateur connecte
  created_at      timestamptz default now()
);

-- ============================================================
-- 2. CLUBS
-- ============================================================
create table if not exists clubs (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  sub             text,                          -- "Club principal · 38 membres"
  member_count    int default 0,
  color_light     text,
  color_mid       text,
  color_dark      text,
  is_active       boolean default false,         -- club principal de l'utilisateur
  created_at      timestamptz default now()
);

create table if not exists club_members (
  club_id         uuid references clubs(id) on delete cascade,
  user_id         uuid references profiles(id) on delete cascade,
  role            text default 'member',         -- 'member' | 'coach' | 'captain'
  joined_at       timestamptz default now(),
  primary key (club_id, user_id)
);

-- ============================================================
-- 3. CONVERSATIONS
-- ============================================================
create table if not exists conversations (
  id              uuid primary key default uuid_generate_v4(),
  type            text not null check (type in ('dm','team','club','request')),
  name            text,                          -- pour les groupes
  club_id         uuid references clubs(id),     -- pour les chats club/team
  preview         text,                          -- dernier message preview
  preview_at      timestamptz,
  has_voice       boolean default false,
  is_demande      boolean default false,         -- chat de demande d'ami
  created_at      timestamptz default now()
);

create table if not exists conversation_members (
  conversation_id uuid references conversations(id) on delete cascade,
  user_id         uuid references profiles(id) on delete cascade,
  last_read_at    timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- ============================================================
-- 4. MESSAGES
-- ============================================================
create table if not exists messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id       uuid references profiles(id),
  text            text,
  is_voice        boolean default false,
  audio_duration  int,                           -- en secondes
  is_defi         boolean default false,         -- bulle defi
  created_at      timestamptz default now()
);
create index if not exists idx_messages_conv on messages(conversation_id, created_at desc);

-- ============================================================
-- 5. CHALLENGES (defis)
-- ============================================================
create table if not exists challenges (
  id              uuid primary key default uuid_generate_v4(),
  from_id         uuid references profiles(id),
  to_id           uuid references profiles(id),
  status          text not null check (status in ('sent','seen','typing','accepted','refused','counter')),
  -- Details du defi
  match_date      text,                          -- "Sam 21 · 14h"
  venue           text,                          -- "Marais · T3"
  format          text,                          -- 'BO3' | 'BO5' | 'BO7' | 'Libre'
  enjeu           text,                          -- 'Classe' | 'Amical'
  gain_w          int,                           -- ELO gagne si W
  loss_l          int,                           -- ELO perdu si L
  message         text,
  from_elo        int,                           -- snapshot ELO au moment du defi
  to_elo          int,                           -- snapshot ELO au moment du defi
  score           text,                          -- score final si joue
  winner_id       uuid references profiles(id),
  played_at       timestamptz,
  confirmed_at    timestamptz,
  elo_delta_from  int,
  elo_delta_to    int,
  -- Reponses
  seen_at         timestamptz,
  responded_at    timestamptz,
  refusal_reason  text,
  counter_you     text,                          -- "Dim 22 · 11h" (barre)
  counter_them    text,                          -- "Lun 23 · 19h"
  counter_message text,
  created_at      timestamptz default now()
);
create index if not exists idx_challenges_from on challenges(from_id, created_at desc);
create index if not exists idx_challenges_to on challenges(to_id, created_at desc);

-- Pour les bases deja creees avec une ancienne version du schema.
alter table challenges add column if not exists from_elo int;
alter table challenges add column if not exists to_elo int;
alter table challenges add column if not exists score text;
alter table challenges add column if not exists winner_id uuid references profiles(id);
alter table challenges add column if not exists played_at timestamptz;
alter table challenges add column if not exists confirmed_at timestamptz;
alter table challenges add column if not exists elo_delta_from int;
alter table challenges add column if not exists elo_delta_to int;

-- ============================================================
-- 5b. LEADERBOARD (classement ELO derive des profils)
-- ============================================================
create or replace view leaderboard as
select
  id,
  full_name,
  short_name,
  elo,
  rank() over (order by elo desc nulls last) as global_rank,
  online,
  avatar_url,
  color_light,
  color_mid,
  color_dark
from profiles
where elo is not null;

-- ============================================================
-- 6. ANNOUNCEMENTS (annonces de club)
-- ============================================================
create table if not exists announcements (
  id              uuid primary key default uuid_generate_v4(),
  club_id         uuid references clubs(id) on delete cascade,
  author_id       uuid references profiles(id),
  text            text not null,
  views           int default 0,
  comments        int default 0,
  likes           int default 0,
  created_at      timestamptz default now()
);

-- ============================================================
-- 7. TRAININGS (seances d'entrainement de club)
-- ============================================================
create table if not exists trainings (
  id              uuid primary key default uuid_generate_v4(),
  club_id         uuid references clubs(id) on delete cascade,
  starts_at       timestamptz not null,
  location        text,                          -- "Le Marais Ping · Salle 1"
  title           text,                          -- "Prochain entrainement"
  created_at      timestamptz default now()
);

create table if not exists training_attendance (
  training_id     uuid references trainings(id) on delete cascade,
  user_id         uuid references profiles(id) on delete cascade,
  attending       boolean default true,
  primary key (training_id, user_id)
);

-- ============================================================
-- 8. FRIENDSHIPS
-- ============================================================
create table if not exists friendships (
  user_a          uuid references profiles(id) on delete cascade,
  user_b          uuid references profiles(id) on delete cascade,
  status          text default 'accepted' check (status in ('pending','accepted','blocked')),
  created_at      timestamptz default now(),
  primary key (user_a, user_b)
);

-- ============================================================
-- RLS (Row Level Security) - a activer apres avoir teste
-- ============================================================
-- alter table profiles      enable row level security;
-- alter table conversations enable row level security;
-- alter table messages      enable row level security;
-- alter table challenges    enable row level security;
-- ...
-- Pour le moment on laisse OFF pour les tests rapides.
