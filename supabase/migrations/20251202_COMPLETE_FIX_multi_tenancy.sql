/*
  ================================================================
  COMPLETE MULTI-TENANCY FIX - RUN THIS IN SUPABASE SQL EDITOR
  ================================================================

  This script is SAFE TO RUN MULTIPLE TIMES (idempotent).
  It will:
  1. Ensure user_id columns exist on all tables
  2. Assign existing data to user accounts
  3. Fix all RLS policies
  4. Verify the results

  User IDs:
  - info@fusion-events.ca: 6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9
  - urequestlive@gmail.com: 7254d394-9e8a-4701-a39b-7ee56e517213
*/

-- ================================================================
-- PHASE 1: DIAGNOSTIC - Show current state BEFORE changes
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 1: DIAGNOSTIC - Current State';
  RAISE NOTICE '========================================';
END $$;

-- Show songs with NULL user_id
SELECT
  'BEFORE: Songs with NULL user_id' as diagnostic,
  COUNT(*) as count
FROM songs
WHERE user_id IS NULL;

-- Show songs by user_id
SELECT
  'BEFORE: Songs by user_id' as diagnostic,
  COALESCE(user_id::text, 'NULL') as user_id,
  COUNT(*) as count
FROM songs
GROUP BY user_id;

-- ================================================================
-- PHASE 2: ENSURE user_id COLUMNS EXIST
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 2: Ensuring user_id columns exist';
  RAISE NOTICE '========================================';

  -- Add user_id to songs if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'songs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE songs ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
    RAISE NOTICE 'Added user_id column to songs table';
  ELSE
    RAISE NOTICE 'songs.user_id already exists';
  END IF;

  -- Add user_id to set_lists if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'set_lists' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE set_lists ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_set_lists_user_id ON set_lists(user_id);
    RAISE NOTICE 'Added user_id column to set_lists table';
  ELSE
    RAISE NOTICE 'set_lists.user_id already exists';
  END IF;

  -- Add user_id to set_list_songs if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'set_list_songs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE set_list_songs ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_set_list_songs_user_id ON set_list_songs(user_id);
    RAISE NOTICE 'Added user_id column to set_list_songs table';
  ELSE
    RAISE NOTICE 'set_list_songs.user_id already exists';
  END IF;

  -- Add user_id to requests if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE requests ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
    RAISE NOTICE 'Added user_id column to requests table';
  ELSE
    RAISE NOTICE 'requests.user_id already exists';
  END IF;

  -- Add user_id to requesters if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requesters' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE requesters ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_requesters_user_id ON requesters(user_id);
    RAISE NOTICE 'Added user_id column to requesters table';
  ELSE
    RAISE NOTICE 'requesters.user_id already exists';
  END IF;

  -- Add user_id to ui_settings if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ui_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE ui_settings ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_ui_settings_user_id ON ui_settings(user_id);
    RAISE NOTICE 'Added user_id column to ui_settings table';
  ELSE
    RAISE NOTICE 'ui_settings.user_id already exists';
  END IF;

  -- Add owner_id to user_votes if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_votes' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE user_votes ADD COLUMN owner_id UUID REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_user_votes_owner_id ON user_votes(owner_id);
    RAISE NOTICE 'Added owner_id column to user_votes table';
  ELSE
    RAISE NOTICE 'user_votes.owner_id already exists';
  END IF;
END $$;

-- ================================================================
-- PHASE 3: ASSIGN USER_IDs TO EXISTING DATA
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 3: Assigning user_ids to data';
  RAISE NOTICE '========================================';
END $$;

-- IMPORTANT: Assign ALL songs with NULL user_id to urequestlive@gmail.com
-- This is the "default" user for existing data
UPDATE songs
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- Check how many were updated
SELECT
  'Songs assigned to urequestlive@gmail.com' as action,
  COUNT(*) as count
FROM songs
WHERE user_id = '7254d394-9e8a-4701-a39b-7ee56e517213';

-- Assign set_lists with NULL user_id
UPDATE set_lists
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- Assign set_list_songs with NULL user_id
UPDATE set_list_songs
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- Assign requests with NULL user_id
UPDATE requests
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- Assign requesters with NULL user_id
UPDATE requesters
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- Assign ui_settings with NULL user_id
UPDATE ui_settings
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- Assign user_votes with NULL owner_id
UPDATE user_votes
SET owner_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE owner_id IS NULL;

-- ================================================================
-- PHASE 4: RESTORE SONGS FROM BACKUP FOR info@fusion-events.ca
-- ================================================================

DO $$
DECLARE
  backup_exists BOOLEAN;
  backup_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 4: Restoring songs from backup';
  RAISE NOTICE '========================================';

  -- Check if backup table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'songs_duplicates_backup'
  ) INTO backup_exists;

  IF backup_exists THEN
    SELECT COUNT(*) INTO backup_count FROM songs_duplicates_backup;
    RAISE NOTICE 'Backup table exists with % rows', backup_count;

    IF backup_count > 0 THEN
      -- Check if we already have songs for this user
      PERFORM 1 FROM songs WHERE user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' LIMIT 1;
      IF NOT FOUND THEN
        RAISE NOTICE 'Restoring songs from backup for info@fusion-events.ca';
      ELSE
        RAISE NOTICE 'Songs already exist for info@fusion-events.ca, skipping restore';
      END IF;
    ELSE
      RAISE NOTICE 'Backup table is empty';
    END IF;
  ELSE
    RAISE NOTICE 'Backup table does not exist - skipping restore';
  END IF;
END $$;

-- Restore from backup if backup exists and user has no songs
-- This is idempotent - won't duplicate if already run
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
  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'songs_duplicates_backup')
  ORDER BY LOWER(title), LOWER(artist), created_at DESC
) AS unique_songs
WHERE NOT EXISTS (
  SELECT 1 FROM songs
  WHERE user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9'
  LIMIT 1
);

-- ================================================================
-- PHASE 5: FIX RLS POLICIES FOR ALL TABLES
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 5: Fixing RLS policies';
  RAISE NOTICE '========================================';
END $$;

-- Enable RLS on all tables (idempotent)
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_list_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE requesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_votes ENABLE ROW LEVEL SECURITY;

-- ============ SONGS POLICIES ============
DROP POLICY IF EXISTS "Users can view their own songs" ON songs;
DROP POLICY IF EXISTS "Users can insert their own songs" ON songs;
DROP POLICY IF EXISTS "Users can update their own songs" ON songs;
DROP POLICY IF EXISTS "Users can delete their own songs" ON songs;
DROP POLICY IF EXISTS "Enable read access for all users" ON songs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON songs;
DROP POLICY IF EXISTS "Enable update for users based on email" ON songs;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON songs;

CREATE POLICY "Users can view their own songs"
  ON songs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own songs"
  ON songs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own songs"
  ON songs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own songs"
  ON songs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============ SET_LISTS POLICIES ============
DROP POLICY IF EXISTS "Users can view their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can insert their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can update their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can delete their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Anyone can view active set_lists by user_id" ON set_lists;
DROP POLICY IF EXISTS "Enable read access for all users" ON set_lists;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON set_lists;
DROP POLICY IF EXISTS "Enable update for users based on email" ON set_lists;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON set_lists;

CREATE POLICY "Users can view their own set_lists"
  ON set_lists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own set_lists"
  ON set_lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own set_lists"
  ON set_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own set_lists"
  ON set_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can view active setlists for song selection
CREATE POLICY "Anyone can view active set_lists by user_id"
  ON set_lists FOR SELECT
  TO anon, authenticated
  USING (user_id IS NOT NULL AND is_active = true);

-- ============ SET_LIST_SONGS POLICIES ============
DROP POLICY IF EXISTS "Users can view their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can insert their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can update their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can delete their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Anyone can view set_list_songs by user_id" ON set_list_songs;
DROP POLICY IF EXISTS "Enable read access for all users" ON set_list_songs;

CREATE POLICY "Users can view their own set_list_songs"
  ON set_list_songs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own set_list_songs"
  ON set_list_songs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own set_list_songs"
  ON set_list_songs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own set_list_songs"
  ON set_list_songs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view set_list_songs by user_id"
  ON set_list_songs FOR SELECT
  TO anon, authenticated
  USING (user_id IS NOT NULL);

-- ============ REQUESTS POLICIES ============
DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;
DROP POLICY IF EXISTS "Anyone can view requests by user_id" ON requests;
DROP POLICY IF EXISTS "Anyone can insert requests with user_id" ON requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON requests;

CREATE POLICY "Users can view their own requests"
  ON requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view requests by user_id"
  ON requests FOR SELECT
  TO anon, authenticated
  USING (user_id IS NOT NULL);

CREATE POLICY "Anyone can insert requests with user_id"
  ON requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NOT NULL);

CREATE POLICY "Users can update their own requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own requests"
  ON requests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============ REQUESTERS POLICIES ============
DROP POLICY IF EXISTS "Users can view their own requesters" ON requesters;
DROP POLICY IF EXISTS "Anyone can view requesters by user_id" ON requesters;
DROP POLICY IF EXISTS "Anyone can insert requesters with user_id" ON requesters;
DROP POLICY IF EXISTS "Enable read access for all users" ON requesters;

CREATE POLICY "Users can view their own requesters"
  ON requesters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view requesters by user_id"
  ON requesters FOR SELECT
  TO anon, authenticated
  USING (user_id IS NOT NULL);

CREATE POLICY "Anyone can insert requesters with user_id"
  ON requesters FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NOT NULL);

-- ============ UI_SETTINGS POLICIES ============
DROP POLICY IF EXISTS "Users can view their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Users can insert their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Users can update their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Anyone can view ui_settings by user_id" ON ui_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON ui_settings;

CREATE POLICY "Users can view their own ui_settings"
  ON ui_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ui_settings"
  ON ui_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ui_settings"
  ON ui_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view ui_settings by user_id"
  ON ui_settings FOR SELECT
  TO anon, authenticated
  USING (user_id IS NOT NULL);

-- ============ USER_VOTES POLICIES ============
DROP POLICY IF EXISTS "Users can view their own user_votes" ON user_votes;
DROP POLICY IF EXISTS "Anyone can view user_votes by owner_id" ON user_votes;
DROP POLICY IF EXISTS "Anyone can insert user_votes" ON user_votes;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_votes;

CREATE POLICY "Users can view their own user_votes"
  ON user_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can view user_votes by owner_id"
  ON user_votes FOR SELECT
  TO anon, authenticated
  USING (owner_id IS NOT NULL);

CREATE POLICY "Anyone can insert user_votes"
  ON user_votes FOR INSERT
  TO anon, authenticated
  WITH CHECK (owner_id IS NOT NULL);

-- ================================================================
-- PHASE 6: UPDATE DUPLICATE CHECK TRIGGER TO BE USER-AWARE
-- ================================================================

DROP TRIGGER IF EXISTS check_song_duplicate_trigger ON songs;

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

CREATE TRIGGER check_song_duplicate_trigger
  BEFORE INSERT OR UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION check_song_duplicate();

-- ================================================================
-- PHASE 7: VERIFICATION - Show final state
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PHASE 7: Verification';
  RAISE NOTICE '========================================';
END $$;

-- Final song counts
SELECT
  'AFTER: Songs by user_id' as verification,
  CASE
    WHEN user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' THEN 'info@fusion-events.ca'
    WHEN user_id = '7254d394-9e8a-4701-a39b-7ee56e517213' THEN 'urequestlive@gmail.com'
    ELSE COALESCE(user_id::text, 'NULL')
  END as account,
  COUNT(*) as song_count
FROM songs
GROUP BY user_id
ORDER BY song_count DESC;

-- Final set_list counts
SELECT
  'AFTER: Set lists by user_id' as verification,
  CASE
    WHEN user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' THEN 'info@fusion-events.ca'
    WHEN user_id = '7254d394-9e8a-4701-a39b-7ee56e517213' THEN 'urequestlive@gmail.com'
    ELSE COALESCE(user_id::text, 'NULL')
  END as account,
  COUNT(*) as setlist_count
FROM set_lists
GROUP BY user_id
ORDER BY setlist_count DESC;

-- Check for any remaining NULL user_ids
SELECT
  'REMAINING NULL user_ids' as check_type,
  'songs' as table_name,
  COUNT(*) as null_count
FROM songs WHERE user_id IS NULL
UNION ALL
SELECT
  'REMAINING NULL user_ids' as check_type,
  'set_lists' as table_name,
  COUNT(*) as null_count
FROM set_lists WHERE user_id IS NULL
UNION ALL
SELECT
  'REMAINING NULL user_ids' as check_type,
  'requests' as table_name,
  COUNT(*) as null_count
FROM requests WHERE user_id IS NULL;

-- Show RLS policies on songs
SELECT
  'RLS policies on songs' as verification,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'songs';

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
SELECT '✅ MULTI-TENANCY FIX COMPLETE - Refresh the app to see songs!' as status;
