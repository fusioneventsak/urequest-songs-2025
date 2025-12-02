/*
  Data Assignment Migration

  Run this AFTER the multi_tenant_isolation.sql migration

  User IDs:
  - info@fusion-events.ca: 6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9
  - urequestlive@gmail.com: 7254d394-9e8a-4701-a39b-7ee56e517213
*/

-- =====================================================
-- STEP 0: Update duplicate check to be user-aware
-- =====================================================

-- First, drop the old trigger
DROP TRIGGER IF EXISTS check_song_duplicate_trigger ON songs;

-- Update the function to check duplicates per user (multi-tenant aware)
CREATE OR REPLACE FUNCTION check_song_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check for duplicate title+artist ONLY within the same user's songs
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

-- Recreate the trigger
CREATE TRIGGER check_song_duplicate_trigger
  BEFORE INSERT OR UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION check_song_duplicate();

-- =====================================================
-- STEP 1: Assign current songs to urequestlive@gmail.com
-- =====================================================

-- Update all existing songs (the 119 songs) to belong to urequestlive@gmail.com
UPDATE songs
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- =====================================================
-- STEP 2: Restore songs from backup for info@fusion-events.ca
-- =====================================================

-- Temporarily drop the duplicate trigger to allow bulk import
DROP TRIGGER IF EXISTS check_song_duplicate_trigger ON songs;

-- Insert songs from backup for info@fusion-events.ca
-- Use DISTINCT ON to avoid duplicates within the backup itself
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
  '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' as user_id,  -- info@fusion-events.ca
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
) AS unique_songs;

-- Recreate the trigger after import
CREATE TRIGGER check_song_duplicate_trigger
  BEFORE INSERT OR UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION check_song_duplicate();

-- =====================================================
-- STEP 3: Assign existing set_lists to urequestlive@gmail.com
-- =====================================================

UPDATE set_lists
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- =====================================================
-- STEP 4: Assign existing set_list_songs to urequestlive@gmail.com
-- =====================================================

UPDATE set_list_songs
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- =====================================================
-- STEP 5: Assign existing requests to urequestlive@gmail.com
-- =====================================================

UPDATE requests
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- =====================================================
-- STEP 6: Assign existing requesters to urequestlive@gmail.com
-- =====================================================

UPDATE requesters
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- =====================================================
-- STEP 7: Assign existing user_votes owner_id
-- =====================================================

UPDATE user_votes
SET owner_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE owner_id IS NULL;

-- =====================================================
-- STEP 8: Assign existing ui_settings
-- =====================================================

UPDATE ui_settings
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- =====================================================
-- STEP 9: Create profiles for both users if not exists
-- =====================================================

INSERT INTO profiles (id, display_name, slug, created_at, updated_at)
VALUES
  ('6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9', 'Fusion Events', 'fusion-events', NOW(), NOW()),
  ('7254d394-9e8a-4701-a39b-7ee56e517213', 'uRequest Live', 'urequestlive', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  slug = EXCLUDED.slug,
  updated_at = NOW();

-- =====================================================
-- Verification queries (run these to check results)
-- =====================================================

-- Check song counts per user
SELECT
  CASE
    WHEN user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' THEN 'info@fusion-events.ca'
    WHEN user_id = '7254d394-9e8a-4701-a39b-7ee56e517213' THEN 'urequestlive@gmail.com'
    ELSE 'unassigned'
  END as account,
  COUNT(*) as song_count
FROM songs
GROUP BY user_id;

-- Check set_lists per user
SELECT
  CASE
    WHEN user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' THEN 'info@fusion-events.ca'
    WHEN user_id = '7254d394-9e8a-4701-a39b-7ee56e517213' THEN 'urequestlive@gmail.com'
    ELSE 'unassigned'
  END as account,
  COUNT(*) as setlist_count
FROM set_lists
GROUP BY user_id;
