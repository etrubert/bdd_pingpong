-- =====================================================================
-- PING PANG PARIS — Migration ELO (à exécuter dans Supabase SQL editor)
--
-- Cette migration est IDEMPOTENTE : on peut la rejouer sans casser
-- l'existant (toutes les opérations sont guardées par IF NOT EXISTS,
-- CREATE OR REPLACE, ou des blocs DO conditionnels).
--
-- Elle adapte les tables existantes (`profiles`, `matches`) au bundle
-- ELO fourni dans `files (2)/`, en respectant ce qui a déjà été mis
-- en place (auth trigger `handle_new_user`, RLS, colonnes FFTT…).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PROFILES : ajout des colonnes ELO manquantes
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_elo     INTEGER     NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS peak_elo        INTEGER     NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS initial_elo     INTEGER     NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS current_streak  INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak     INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_calibrated   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_match_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS country         TEXT        NOT NULL DEFAULT 'FR';

-- Synchronise current_elo <- elo_rating pour les profils existants
UPDATE public.profiles
SET    current_elo = elo_rating,
       peak_elo    = GREATEST(peak_elo, elo_rating),
       initial_elo = elo_rating
WHERE  current_elo = 1200 AND elo_rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_current_elo
  ON public.profiles(current_elo DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_country_elo
  ON public.profiles(country, current_elo DESC);


-- ---------------------------------------------------------------------
-- 2. MATCHES : renommage player1/player2 -> player_a/player_b + colonnes manquantes
--    (la table est vide aujourd'hui, le renommage est sans risque)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matches' AND column_name='player1_id'
  ) THEN
    ALTER TABLE public.matches RENAME COLUMN player1_id          TO player_a;
    ALTER TABLE public.matches RENAME COLUMN player2_id          TO player_b;
    ALTER TABLE public.matches RENAME COLUMN player1_sets        TO sets_a;
    ALTER TABLE public.matches RENAME COLUMN player2_sets        TO sets_b;
    ALTER TABLE public.matches RENAME COLUMN player1_elo_before  TO elo_a_before;
    ALTER TABLE public.matches RENAME COLUMN player1_elo_after   TO elo_a_after;
    ALTER TABLE public.matches RENAME COLUMN player2_elo_before  TO elo_b_before;
    ALTER TABLE public.matches RENAME COLUMN player2_elo_after   TO elo_b_after;
    ALTER TABLE public.matches RENAME CONSTRAINT matches_player1_id_fkey TO matches_player_a_fkey;
    ALTER TABLE public.matches RENAME CONSTRAINT matches_player2_id_fkey TO matches_player_b_fkey;
  END IF;
END $$;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS format           TEXT,
  ADD COLUMN IF NOT EXISTS context          TEXT       DEFAULT 'ranked',
  ADD COLUMN IF NOT EXISTS validated_by_a   BOOLEAN    NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS validated_by_b   BOOLEAN    NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_validated     BOOLEAN    NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS elo_change_a     INTEGER,
  ADD COLUMN IF NOT EXISTS elo_change_b     INTEGER,
  ADD COLUMN IF NOT EXISTS location_name    TEXT;

-- played_at était NOT NULL sans default — on ajoute le default now()
-- pour que createMatch() puisse omettre la colonne.
ALTER TABLE public.matches ALTER COLUMN played_at SET DEFAULT NOW();


-- ---------------------------------------------------------------------
-- 3. FONCTIONS ELO utilitaires
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calc_expected_score(rating_a INTEGER, rating_b INTEGER)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT 1.0 / (1.0 + POWER(10, (rating_b - rating_a)::NUMERIC / 400))
$$;

CREATE OR REPLACE FUNCTION public.calc_k_factor(matches_played INTEGER, current_elo INTEGER)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN matches_played < 10 THEN 40
    WHEN current_elo >= 2000 THEN 16
    ELSE 24
  END
$$;

CREATE OR REPLACE FUNCTION public.calc_margin_multiplier(sets_winner INTEGER, sets_loser INTEGER)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN sets_winner - sets_loser >= 3 THEN 1.5
    WHEN sets_winner - sets_loser  = 2 THEN 1.2
    ELSE 1.0
  END
$$;

CREATE OR REPLACE FUNCTION public.calc_format_multiplier(format TEXT)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE format
    WHEN 'BO3' THEN 0.85
    WHEN 'BO5' THEN 1.0
    WHEN 'BO7' THEN 1.15
    ELSE 1.0
  END
$$;

CREATE OR REPLACE FUNCTION public.calc_context_multiplier(context TEXT)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE context
    WHEN 'friendly'     THEN 0
    WHEN 'ranked'       THEN 1.0
    WHEN 'tournament'   THEN 1.2
    WHEN 'championship' THEN 1.3
    ELSE 1.0
  END
$$;

CREATE OR REPLACE FUNCTION public.calc_streak_multiplier(current_streak INTEGER)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN current_streak >=  5 THEN 1.05
    WHEN current_streak <= -3 THEN 0.95
    ELSE 1.0
  END
$$;

CREATE OR REPLACE FUNCTION public.calc_sandbag_cap(elo_diff INTEGER, base_change NUMERIC)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN elo_diff > 400 AND base_change > 0 THEN LEAST(base_change, 5)
    ELSE base_change
  END
$$;


-- ---------------------------------------------------------------------
-- 4. TRIGGER PRINCIPAL : recalcul ELO à la validation d'un match
--    (met à jour BOTH current_elo ET elo_rating pour compat)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_elo_after_match()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  p_a RECORD; p_b RECORD;
  expected_a NUMERIC; score_a NUMERIC;
  k_a NUMERIC; k_b NUMERIC;
  margin NUMERIC; fmt NUMERIC; ctx NUMERIC;
  streak_a NUMERIC; streak_b NUMERIC;
  change_a NUMERIC; change_b NUMERIC;
  new_elo_a INTEGER; new_elo_b INTEGER;
  winner_id UUID;
BEGIN
  IF NEW.is_validated = TRUE
     AND (OLD.is_validated IS NULL OR OLD.is_validated = FALSE) THEN

    SELECT * INTO p_a FROM public.profiles WHERE id = NEW.player_a;
    SELECT * INTO p_b FROM public.profiles WHERE id = NEW.player_b;

    -- Amical : pas d'impact ELO mais on conserve la trace
    IF NEW.context = 'friendly' THEN
      NEW.elo_a_before := p_a.current_elo;
      NEW.elo_b_before := p_b.current_elo;
      NEW.elo_a_after  := p_a.current_elo;
      NEW.elo_b_after  := p_b.current_elo;
      NEW.elo_change_a := 0;
      NEW.elo_change_b := 0;
      RETURN NEW;
    END IF;

    -- Score réel
    IF NEW.sets_a > NEW.sets_b THEN
      score_a := 1.0; winner_id := NEW.player_a;
    ELSIF NEW.sets_a < NEW.sets_b THEN
      score_a := 0.0; winner_id := NEW.player_b;
    ELSE
      score_a := 0.5;
    END IF;

    expected_a := public.calc_expected_score(p_a.current_elo, p_b.current_elo);
    k_a   := public.calc_k_factor(p_a.matches_played, p_a.current_elo);
    k_b   := public.calc_k_factor(p_b.matches_played, p_b.current_elo);
    margin:= public.calc_margin_multiplier(GREATEST(NEW.sets_a, NEW.sets_b),
                                           LEAST(NEW.sets_a, NEW.sets_b));
    fmt   := public.calc_format_multiplier(COALESCE(NEW.format, 'BO5'));
    ctx   := public.calc_context_multiplier(COALESCE(NEW.context, 'ranked'));
    streak_a := public.calc_streak_multiplier(p_a.current_streak);
    streak_b := public.calc_streak_multiplier(p_b.current_streak);

    change_a := k_a * margin * fmt * ctx * streak_a * (score_a - expected_a);
    change_a := public.calc_sandbag_cap(p_a.current_elo - p_b.current_elo, change_a);
    change_a := ROUND(change_a);

    change_b := k_b * margin * fmt * ctx * streak_b * ((1 - score_a) - (1 - expected_a));
    change_b := public.calc_sandbag_cap(p_b.current_elo - p_a.current_elo, change_b);
    change_b := ROUND(change_b);

    new_elo_a := p_a.current_elo + change_a::INTEGER;
    new_elo_b := p_b.current_elo + change_b::INTEGER;

    -- Stocker dans le match
    NEW.elo_a_before := p_a.current_elo;
    NEW.elo_b_before := p_b.current_elo;
    NEW.elo_a_after  := new_elo_a;
    NEW.elo_b_after  := new_elo_b;
    NEW.elo_change_a := change_a::INTEGER;
    NEW.elo_change_b := change_b::INTEGER;

    -- Joueur A
    UPDATE public.profiles SET
      current_elo    = new_elo_a,
      elo_rating     = new_elo_a, -- compat avec ancien code (chat, etc.)
      peak_elo       = GREATEST(peak_elo, new_elo_a),
      matches_played = matches_played + 1,
      matches_won    = matches_won + CASE WHEN winner_id = NEW.player_a THEN 1 ELSE 0 END,
      current_streak = CASE
        WHEN winner_id = NEW.player_a THEN GREATEST(current_streak, 0) + 1
        ELSE LEAST(current_streak, 0) - 1
      END,
      best_streak    = GREATEST(best_streak,
        CASE WHEN winner_id = NEW.player_a THEN GREATEST(current_streak, 0) + 1 ELSE best_streak END),
      is_calibrated  = (matches_played + 1) >= 10,
      last_match_at  = NEW.played_at,
      updated_at     = NOW()
    WHERE id = NEW.player_a;

    -- Joueur B
    UPDATE public.profiles SET
      current_elo    = new_elo_b,
      elo_rating     = new_elo_b,
      peak_elo       = GREATEST(peak_elo, new_elo_b),
      matches_played = matches_played + 1,
      matches_won    = matches_won + CASE WHEN winner_id = NEW.player_b THEN 1 ELSE 0 END,
      current_streak = CASE
        WHEN winner_id = NEW.player_b THEN GREATEST(current_streak, 0) + 1
        ELSE LEAST(current_streak, 0) - 1
      END,
      best_streak    = GREATEST(best_streak,
        CASE WHEN winner_id = NEW.player_b THEN GREATEST(current_streak, 0) + 1 ELSE best_streak END),
      is_calibrated  = (matches_played + 1) >= 10,
      last_match_at  = NEW.played_at,
      updated_at     = NOW()
    WHERE id = NEW.player_b;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_elo ON public.matches;
CREATE TRIGGER trg_update_elo
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_elo_after_match();


-- ---------------------------------------------------------------------
-- 5. VUES classement mondial / par pays
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.world_ranking AS
SELECT
  ROW_NUMBER() OVER (ORDER BY current_elo DESC) AS world_rank,
  id, display_name, country, region,
  current_elo, peak_elo,
  matches_played, matches_won,
  ROUND((matches_won::NUMERIC / NULLIF(matches_played, 0)) * 100, 1) AS win_rate,
  current_streak, best_streak, is_calibrated, last_match_at
FROM public.profiles
WHERE matches_played > 0
ORDER BY current_elo DESC;

CREATE OR REPLACE VIEW public.country_ranking AS
SELECT
  ROW_NUMBER() OVER (PARTITION BY country ORDER BY current_elo DESC) AS country_rank,
  ROW_NUMBER() OVER (ORDER BY current_elo DESC)                      AS world_rank,
  id, display_name, country, region,
  current_elo, peak_elo,
  matches_played, current_streak, is_calibrated
FROM public.profiles
WHERE matches_played > 0;


-- ---------------------------------------------------------------------
-- 6. Note sur handle_new_user
--    On NE remplace PAS la fonction `handle_new_user` existante :
--    elle gère déjà `email` (NOT NULL), l'auto-confirm et l'insert
--    sécurisé du profil. Les nouvelles colonnes ELO ont des DEFAULTs,
--    donc l'INSERT existant les remplit automatiquement.
-- ---------------------------------------------------------------------
