/*
  Remove Duplicate Songs Migration
  
  This migration:
  1. Removes duplicate songs from the songs table
  2. Adds a unique constraint to prevent future duplicates
  3. Updates any references in set_list_songs to point to the kept songs
  
  Strategy:
  - Keep the oldest song (earliest created_at) for each title+artist combination
  - Delete the newer duplicates
  - Add unique constraint on (title, artist, user_id) to prevent future duplicates
*/

-- First, let's create a backup table with all duplicates for safety
CREATE TABLE IF NOT EXISTS songs_duplicates_backup AS
SELECT s.*
FROM songs s
INNER JOIN (
  SELECT title, artist, COUNT(*) as cnt
  FROM songs
  GROUP BY title, artist
  HAVING COUNT(*) > 1
) dups ON s.title = dups.title AND s.artist = dups.artist;

-- Update set_list_songs to reference the songs we're keeping (oldest ones)
UPDATE set_list_songs 
SET song_id = (
  SELECT s.id 
  FROM songs s
  WHERE s.title = (SELECT title FROM songs WHERE id = set_list_songs.song_id)
    AND s.artist = (SELECT artist FROM songs WHERE id = set_list_songs.song_id)
  ORDER BY s.created_at ASC
  LIMIT 1
)
WHERE song_id IN (
  SELECT s.id
  FROM songs s
  INNER JOIN (
    SELECT title, artist, MIN(created_at) as min_created_at
    FROM songs
    GROUP BY title, artist
    HAVING COUNT(*) > 1
  ) dups ON s.title = dups.title 
         AND s.artist = dups.artist 
         AND s.created_at > dups.min_created_at
);

-- Delete duplicate songs (keep only the oldest one for each title+artist combination)
DELETE FROM songs 
WHERE id IN (
  SELECT s.id
  FROM songs s
  INNER JOIN (
    SELECT title, artist, MIN(created_at) as min_created_at
    FROM songs
    GROUP BY title, artist
    HAVING COUNT(*) > 1
  ) dups ON s.title = dups.title 
         AND s.artist = dups.artist 
         AND s.created_at > dups.min_created_at
);

-- Add unique constraint to prevent future duplicates
-- Note: We use title, artist, and user_id to allow different users to have the same song
ALTER TABLE songs 
ADD CONSTRAINT songs_title_artist_user_unique 
UNIQUE (title, artist, user_id);

-- Create an index to improve performance for duplicate checking
CREATE INDEX IF NOT EXISTS idx_songs_title_artist_user 
ON songs (title, artist, user_id);

-- Add a function to check for duplicates before insert
CREATE OR REPLACE FUNCTION check_song_duplicate()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a song with the same title, artist, and user_id already exists
  IF EXISTS (
    SELECT 1 FROM songs 
    WHERE title = NEW.title 
      AND artist = NEW.artist 
      AND user_id = NEW.user_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'A song with title "%" by "%" already exists for this user', NEW.title, NEW.artist;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicates
DROP TRIGGER IF EXISTS prevent_song_duplicates ON songs;
CREATE TRIGGER prevent_song_duplicates
  BEFORE INSERT OR UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION check_song_duplicate();

-- Log the results
DO $$
DECLARE
  duplicate_count INTEGER;
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count FROM songs_duplicates_backup;
  SELECT COUNT(*) INTO remaining_count FROM songs;
  
  RAISE NOTICE 'Duplicate removal completed:';
  RAISE NOTICE '- Backed up % duplicate songs', duplicate_count;
  RAISE NOTICE '- % songs remaining after deduplication', remaining_count;
  RAISE NOTICE '- Added unique constraint on (title, artist, user_id)';
  RAISE NOTICE '- Added trigger to prevent future duplicates';
END $$;
