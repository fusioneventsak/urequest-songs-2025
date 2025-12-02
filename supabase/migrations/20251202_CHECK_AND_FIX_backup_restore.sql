/*
  CHECK AND FIX: Verify backup table and restore songs for info@fusion-events.ca
*/

-- =====================================================
-- STEP 1: Check current song counts per user
-- =====================================================
SELECT
  'Current song counts' as check_type,
  CASE
    WHEN user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' THEN 'info@fusion-events.ca'
    WHEN user_id = '7254d394-9e8a-4701-a39b-7ee56e517213' THEN 'urequestlive@gmail.com'
    ELSE COALESCE(user_id::text, 'NULL')
  END as account,
  COUNT(*) as song_count
FROM songs
GROUP BY user_id;

-- =====================================================
-- STEP 2: Check if backup table exists and count
-- =====================================================
SELECT
  'Backup table exists' as check_type,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'songs_duplicates_backup')
    THEN 'YES'
    ELSE 'NO'
  END as exists;

-- Count backup table rows
SELECT 'Backup table row count' as check_type, COUNT(*) as count
FROM songs_duplicates_backup;

-- =====================================================
-- STEP 3: Check for songs already assigned to info@
-- =====================================================
SELECT
  'Songs for info@fusion-events.ca' as check_type,
  COUNT(*) as count
FROM songs
WHERE user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9';

-- =====================================================
-- STEP 4: FORCE RESTORE from backup for info@ account
-- Drop duplicate trigger temporarily
-- =====================================================

DROP TRIGGER IF EXISTS check_song_duplicate_trigger ON songs;

-- Delete any existing songs for info@ (to do a clean restore)
-- Comment this out if you want to keep existing songs
-- DELETE FROM songs WHERE user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9';

-- Insert ALL songs from backup for info@fusion-events.ca
-- Using DISTINCT ON to avoid duplicates within backup
INSERT INTO songs (
  id,
  title,
  artist,
  genre,
  key,
  notes,
  "albumArtUrl",
  user_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  title,
  artist,
  genre,
  key,
  notes,
  "albumArtUrl",
  '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' as user_id,
  COALESCE(created_at, NOW()) as created_at,
  NOW() as updated_at
FROM (
  SELECT DISTINCT ON (LOWER(title), LOWER(artist))
    title,
    artist,
    genre,
    key,
    notes,
    "albumArtUrl",
    created_at
  FROM songs_duplicates_backup
  ORDER BY LOWER(title), LOWER(artist), created_at DESC
) AS unique_songs
ON CONFLICT DO NOTHING;

-- Recreate the trigger
CREATE OR REPLACE FUNCTION check_song_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM songs
    WHERE LOWER(title) = LOWER(NEW.title)
    AND LOWER(artist) = LOWER(NEW.artist)
    AND user_id = NEW.user_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'A song with title "%" by "%" already exists for this user', NEW.title, NEW.artist;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_song_duplicate_trigger
  BEFORE INSERT OR UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION check_song_duplicate();

-- =====================================================
-- STEP 5: Verify final counts
-- =====================================================
SELECT
  'AFTER RESTORE: Song counts' as verification,
  CASE
    WHEN user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' THEN 'info@fusion-events.ca'
    WHEN user_id = '7254d394-9e8a-4701-a39b-7ee56e517213' THEN 'urequestlive@gmail.com'
    ELSE COALESCE(user_id::text, 'NULL')
  END as account,
  COUNT(*) as song_count
FROM songs
GROUP BY user_id;

SELECT '✅ Backup restore complete!' as status;
