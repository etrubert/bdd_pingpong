-- =====================================================================
-- PING PANG PARIS — Tables publiques ajoutées par la communauté
-- (à exécuter dans le SQL Editor de Supabase)
--
-- Migration IDEMPOTENTE : rejouable sans casser l'existant.
--
-- Permet à un utilisateur du Finder (onglet TABLES) de signaler une
-- table de ping-pong publique non référencée, photo à l'appui. La photo
-- est stockée dans le bucket Storage `table-photos`, la table dans
-- `public.community_tables`.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLE community_tables
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_tables (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  lat         DOUBLE PRECISION NOT NULL,
  lon         DOUBLE PRECISION NOT NULL,
  name        TEXT,
  nb_tables   INTEGER      NOT NULL DEFAULT 1,
  indoor      TEXT,                 -- 'yes' | 'no' | ''  (aligné sur le CSV monde)
  type        TEXT,                 -- type_lieu libre (parc, gymnase, ...)
  photo_url   TEXT,                 -- URL publique de la photo (bucket table-photos)
  photo_path  TEXT,                 -- chemin objet dans le bucket (pour suppression)
  created_by  UUID,                 -- auth.uid() si connecté, sinon NULL
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  status      TEXT         NOT NULL DEFAULT 'pending'  -- 'pending' | 'approved' | 'rejected'
);

-- Index géographique simple (filtrage par bbox côté client + recherche proximité)
CREATE INDEX IF NOT EXISTS idx_community_tables_latlon
  ON public.community_tables(lat, lon);
CREATE INDEX IF NOT EXISTS idx_community_tables_status
  ON public.community_tables(status);


-- ---------------------------------------------------------------------
-- 2. RLS
--    Convention du repo (cf. README) : RLS souple pour itérer vite.
--    - lecture publique des tables visibles (pending + approved)
--    - insertion ouverte (l'app utilise la clé anon)
--    Resserrer plus tard : created_by = auth.uid() pour update/delete.
-- ---------------------------------------------------------------------
ALTER TABLE public.community_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_tables_select ON public.community_tables;
CREATE POLICY community_tables_select
  ON public.community_tables
  FOR SELECT
  USING (status <> 'rejected');

DROP POLICY IF EXISTS community_tables_insert ON public.community_tables;
CREATE POLICY community_tables_insert
  ON public.community_tables
  FOR INSERT
  WITH CHECK (true);


-- ---------------------------------------------------------------------
-- 3. STORAGE : bucket public `table-photos`
--    Crée le bucket s'il n'existe pas + policies de lecture/écriture.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('table-photos', 'table-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique des objets du bucket
DROP POLICY IF EXISTS table_photos_read ON storage.objects;
CREATE POLICY table_photos_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'table-photos');

-- Upload ouvert dans le bucket (clé anon de l'app)
DROP POLICY IF EXISTS table_photos_insert ON storage.objects;
CREATE POLICY table_photos_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'table-photos');


-- ---------------------------------------------------------------------
-- Vérification rapide :
--   select count(*) from public.community_tables;            -- 0
--   select id, public from storage.buckets where id='table-photos';
-- ---------------------------------------------------------------------
