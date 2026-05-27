-- =====================================================================
-- PING PANG PARIS — Schéma Supabase complet pour le système ELO
-- À exécuter dans l'éditeur SQL de Supabase (dans l'ordre, sections séparées si besoin)
-- =====================================================================


-- =====================================================================
-- 1. TABLES PRINCIPALES
-- =====================================================================

-- Profils utilisateurs (lié à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  region TEXT,
  country TEXT DEFAULT 'FR',
  dominant_hand TEXT CHECK (dominant_hand IN ('right', 'left')),
  player_type TEXT CHECK (player_type IN ('casual', 'regular', 'competition')),

  -- ELO
  current_elo INTEGER NOT NULL DEFAULT 1200,
  peak_elo INTEGER NOT NULL DEFAULT 1200,
  initial_elo INTEGER NOT NULL DEFAULT 1200,

  -- Stats agrégées (mises à jour par triggers)
  matches_played INTEGER NOT NULL DEFAULT 0,
  matches_won INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,

  -- Calibrage
  is_calibrated BOOLEAN NOT NULL DEFAULT FALSE,
  last_match_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_elo ON public.profiles(current_elo DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country, current_elo DESC);


-- Matchs joués
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a UUID NOT NULL REFERENCES public.profiles(id),
  player_b UUID NOT NULL REFERENCES public.profiles(id),
  sets_a INTEGER NOT NULL CHECK (sets_a >= 0),
  sets_b INTEGER NOT NULL CHECK (sets_b >= 0),
  format TEXT NOT NULL CHECK (format IN ('BO3', 'BO5', 'BO7')),
  context TEXT NOT NULL DEFAULT 'ranked' CHECK (context IN ('ranked', 'tournament', 'championship', 'friendly')),
  location_name TEXT,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ELO avant/après (calculé par le trigger)
  elo_a_before INTEGER,
  elo_a_after INTEGER,
  elo_b_before INTEGER,
  elo_b_after INTEGER,
  elo_change_a INTEGER,
  elo_change_b INTEGER,

  -- Validation des 2 joueurs
  validated_by_a BOOLEAN NOT NULL DEFAULT FALSE,
  validated_by_b BOOLEAN NOT NULL DEFAULT FALSE,
  is_validated BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_player_a ON public.matches(player_a);
CREATE INDEX IF NOT EXISTS idx_matches_player_b ON public.matches(player_b);
CREATE INDEX IF NOT EXISTS idx_matches_played_at ON public.matches(played_at DESC);


-- =====================================================================
-- 2. FONCTIONS UTILITAIRES
-- =====================================================================

-- Calcul de la probabilité de victoire (formule ELO classique)
CREATE OR REPLACE FUNCTION public.calc_expected_score(rating_a INTEGER, rating_b INTEGER)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN 1.0 / (1.0 + POWER(10, (rating_b - rating_a)::NUMERIC / 400));
END;
$$;


-- K-factor adaptatif
CREATE OR REPLACE FUNCTION public.calc_k_factor(matches_played INTEGER, current_elo INTEGER)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- Joueur en calibrage (moins de 10 matchs)
  IF matches_played < 10 THEN
    RETURN 40;
  -- Joueur établi ELO élevé (stabilité)
  ELSIF current_elo >= 2000 THEN
    RETURN 16;
  -- Joueur actif standard
  ELSE
    RETURN 24;
  END IF;
END;
$$;


-- Multiplicateur de marge de victoire
CREATE OR REPLACE FUNCTION public.calc_margin_multiplier(sets_winner INTEGER, sets_loser INTEGER)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  diff INTEGER;
BEGIN
  diff := sets_winner - sets_loser;
  -- 3-0 / 4-0 → 1.5 ; 3-1 / 4-1 → 1.1 ; 3-2 / 4-2 → 1.0
  IF diff >= 3 THEN RETURN 1.5;
  ELSIF diff = 2 THEN RETURN 1.2;
  ELSIF diff = 1 THEN RETURN 1.0;
  ELSE RETURN 1.0;
  END IF;
END;
$$;


-- Multiplicateur de format
CREATE OR REPLACE FUNCTION public.calc_format_multiplier(format TEXT)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  CASE format
    WHEN 'BO3' THEN RETURN 0.85;
    WHEN 'BO5' THEN RETURN 1.0;
    WHEN 'BO7' THEN RETURN 1.15;
    ELSE RETURN 1.0;
  END CASE;
END;
$$;


-- Multiplicateur de contexte
CREATE OR REPLACE FUNCTION public.calc_context_multiplier(context TEXT)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  CASE context
    WHEN 'friendly' THEN RETURN 0;  -- amical = pas d'impact ELO
    WHEN 'ranked' THEN RETURN 1.0;
    WHEN 'tournament' THEN RETURN 1.2;
    WHEN 'championship' THEN RETURN 1.3;
    ELSE RETURN 1.0;
  END CASE;
END;
$$;


-- Multiplicateur de streak
CREATE OR REPLACE FUNCTION public.calc_streak_multiplier(current_streak INTEGER)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF current_streak >= 5 THEN RETURN 1.05;
  ELSIF current_streak <= -3 THEN RETURN 0.95;
  ELSE RETURN 1.0;
  END IF;
END;
$$;


-- Protection anti-sandbagging
CREATE OR REPLACE FUNCTION public.calc_sandbag_cap(elo_diff INTEGER, base_change NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- Si écart > 400 ELO et c'est le plus fort qui gagne, plafonner à 5 ELO
  IF elo_diff > 400 AND base_change > 0 THEN
    RETURN LEAST(base_change, 5);
  END IF;
  RETURN base_change;
END;
$$;


-- =====================================================================
-- 3. TRIGGER PRINCIPAL : CALCUL ELO APRÈS VALIDATION D'UN MATCH
-- =====================================================================

CREATE OR REPLACE FUNCTION public.update_elo_after_match()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  p_a RECORD;
  p_b RECORD;
  expected_a NUMERIC;
  score_a NUMERIC;
  k_a NUMERIC;
  k_b NUMERIC;
  margin NUMERIC;
  fmt NUMERIC;
  ctx NUMERIC;
  streak_a NUMERIC;
  streak_b NUMERIC;
  change_a NUMERIC;
  change_b NUMERIC;
  new_elo_a INTEGER;
  new_elo_b INTEGER;
  winner_id UUID;
  loser_id UUID;
BEGIN
  -- Ne se déclenche QUE quand le match passe à validé
  IF NEW.is_validated = TRUE AND (OLD.is_validated IS NULL OR OLD.is_validated = FALSE) THEN

    -- Récupérer les profils
    SELECT * INTO p_a FROM public.profiles WHERE id = NEW.player_a;
    SELECT * INTO p_b FROM public.profiles WHERE id = NEW.player_b;

    -- Match amical = pas de calcul ELO, on stocke quand même les stats
    IF NEW.context = 'friendly' THEN
      NEW.elo_a_before := p_a.current_elo;
      NEW.elo_b_before := p_b.current_elo;
      NEW.elo_a_after := p_a.current_elo;
      NEW.elo_b_after := p_b.current_elo;
      NEW.elo_change_a := 0;
      NEW.elo_change_b := 0;
      RETURN NEW;
    END IF;

    -- Score réel
    IF NEW.sets_a > NEW.sets_b THEN
      score_a := 1.0;
      winner_id := NEW.player_a;
      loser_id := NEW.player_b;
    ELSIF NEW.sets_a < NEW.sets_b THEN
      score_a := 0.0;
      winner_id := NEW.player_b;
      loser_id := NEW.player_a;
    ELSE
      score_a := 0.5;
    END IF;

    -- Calcul des facteurs
    expected_a := public.calc_expected_score(p_a.current_elo, p_b.current_elo);
    k_a := public.calc_k_factor(p_a.matches_played, p_a.current_elo);
    k_b := public.calc_k_factor(p_b.matches_played, p_b.current_elo);
    margin := public.calc_margin_multiplier(GREATEST(NEW.sets_a, NEW.sets_b), LEAST(NEW.sets_a, NEW.sets_b));
    fmt := public.calc_format_multiplier(NEW.format);
    ctx := public.calc_context_multiplier(NEW.context);
    streak_a := public.calc_streak_multiplier(p_a.current_streak);
    streak_b := public.calc_streak_multiplier(p_b.current_streak);

    -- Calcul ELO joueur A
    change_a := k_a * margin * fmt * ctx * streak_a * (score_a - expected_a);
    change_a := public.calc_sandbag_cap(p_a.current_elo - p_b.current_elo, change_a);
    change_a := ROUND(change_a);

    -- Calcul ELO joueur B (symétrique)
    change_b := k_b * margin * fmt * ctx * streak_b * ((1 - score_a) - (1 - expected_a));
    change_b := public.calc_sandbag_cap(p_b.current_elo - p_a.current_elo, change_b);
    change_b := ROUND(change_b);

    -- Nouveaux ELO
    new_elo_a := p_a.current_elo + change_a::INTEGER;
    new_elo_b := p_b.current_elo + change_b::INTEGER;

    -- Stocker dans le match
    NEW.elo_a_before := p_a.current_elo;
    NEW.elo_b_before := p_b.current_elo;
    NEW.elo_a_after := new_elo_a;
    NEW.elo_b_after := new_elo_b;
    NEW.elo_change_a := change_a::INTEGER;
    NEW.elo_change_b := change_b::INTEGER;

    -- Mettre à jour les profils
    UPDATE public.profiles SET
      current_elo = new_elo_a,
      peak_elo = GREATEST(peak_elo, new_elo_a),
      matches_played = matches_played + 1,
      matches_won = matches_won + CASE WHEN winner_id = NEW.player_a THEN 1 ELSE 0 END,
      current_streak = CASE
        WHEN winner_id = NEW.player_a THEN GREATEST(current_streak, 0) + 1
        ELSE LEAST(current_streak, 0) - 1
      END,
      best_streak = GREATEST(best_streak, CASE WHEN winner_id = NEW.player_a THEN GREATEST(current_streak, 0) + 1 ELSE best_streak END),
      is_calibrated = (matches_played + 1) >= 10,
      last_match_at = NEW.played_at,
      updated_at = NOW()
    WHERE id = NEW.player_a;

    UPDATE public.profiles SET
      current_elo = new_elo_b,
      peak_elo = GREATEST(peak_elo, new_elo_b),
      matches_played = matches_played + 1,
      matches_won = matches_won + CASE WHEN winner_id = NEW.player_b THEN 1 ELSE 0 END,
      current_streak = CASE
        WHEN winner_id = NEW.player_b THEN GREATEST(current_streak, 0) + 1
        ELSE LEAST(current_streak, 0) - 1
      END,
      best_streak = GREATEST(best_streak, CASE WHEN winner_id = NEW.player_b THEN GREATEST(current_streak, 0) + 1 ELSE best_streak END),
      is_calibrated = (matches_played + 1) >= 10,
      last_match_at = NEW.played_at,
      updated_at = NOW()
    WHERE id = NEW.player_b;

  END IF;

  RETURN NEW;
END;
$$;

-- Attacher le trigger
DROP TRIGGER IF EXISTS trg_update_elo ON public.matches;
CREATE TRIGGER trg_update_elo
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_elo_after_match();


-- =====================================================================
-- 4. VUE : CLASSEMENT MONDIAL
-- =====================================================================

CREATE OR REPLACE VIEW public.world_ranking AS
SELECT
  ROW_NUMBER() OVER (ORDER BY current_elo DESC) AS world_rank,
  id,
  display_name,
  country,
  region,
  current_elo,
  peak_elo,
  matches_played,
  matches_won,
  ROUND((matches_won::NUMERIC / NULLIF(matches_played, 0)) * 100, 1) AS win_rate,
  current_streak,
  best_streak,
  is_calibrated,
  last_match_at
FROM public.profiles
WHERE matches_played > 0
ORDER BY current_elo DESC;


-- Vue par pays
CREATE OR REPLACE VIEW public.country_ranking AS
SELECT
  ROW_NUMBER() OVER (PARTITION BY country ORDER BY current_elo DESC) AS country_rank,
  ROW_NUMBER() OVER (ORDER BY current_elo DESC) AS world_rank,
  id, display_name, country, region, current_elo, peak_elo,
  matches_played, current_streak, is_calibrated
FROM public.profiles
WHERE matches_played > 0;


-- =====================================================================
-- 5. ROW LEVEL SECURITY (CRITIQUE)
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Profiles : tout le monde peut lire (info publique pour le classement)
CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT USING (TRUE);

-- Profiles : seul le propriétaire peut modifier son profil (mais PAS l'ELO)
CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Empêcher la modification directe de l'ELO depuis l'app
    AND current_elo = (SELECT current_elo FROM public.profiles WHERE id = auth.uid())
    AND peak_elo = (SELECT peak_elo FROM public.profiles WHERE id = auth.uid())
    AND matches_played = (SELECT matches_played FROM public.profiles WHERE id = auth.uid())
  );

-- Profiles : insertion à la création de compte uniquement
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Matches : lecture publique (pour l'historique et le classement)
CREATE POLICY "matches_public_read" ON public.matches
  FOR SELECT USING (TRUE);

-- Matches : un joueur peut créer un match s'il en fait partie
CREATE POLICY "matches_create_as_player" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = player_a OR auth.uid() = player_b);

-- Matches : seuls les joueurs impliqués peuvent valider
CREATE POLICY "matches_validate" ON public.matches
  FOR UPDATE USING (auth.uid() = player_a OR auth.uid() = player_b)
  WITH CHECK (auth.uid() = player_a OR auth.uid() = player_b);


-- =====================================================================
-- 6. TRIGGER POUR CRÉER AUTOMATIQUEMENT UN PROFIL À L'INSCRIPTION
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, current_elo, initial_elo, peak_elo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    1200, 1200, 1200
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
