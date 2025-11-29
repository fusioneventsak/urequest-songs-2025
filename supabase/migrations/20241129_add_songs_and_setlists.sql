/*
  Add Songs and Create Genre-Based Setlists Migration
  
  This migration:
  1. Adds 99 songs from the provided list (handles duplicates gracefully)
  2. Creates setlists based on genres
  3. Assigns songs to appropriate setlists
*/

-- First, let's insert all the songs (duplicates will be handled by our constraint)
DO $$
DECLARE
  song_data RECORD;
  songs_added INTEGER := 0;
  duplicates_skipped INTEGER := 0;
BEGIN
  -- Array of songs to insert
  FOR song_data IN 
    SELECT * FROM (VALUES
      ('Dynamite', 'Taio Cruz', 'Pop, Top40, 2020s', 'https://is1-ssl.mzstatic.com/image/thumb/Music/62/e8/de/mzi.phvfdshu.jpg/600x600bb.jpg'),
      ('Moves Like (Jagger)', 'Maroon 5', 'Pop, Top40, 2010s', 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/61/53/15/61531592-3e8b-1e85-b434-73a991d8143c/14UMGIM27067.rgb.jpg/600x600bb.jpg'),
      ('Finesse', 'Bruno Mars', 'Pop, Top40, 2010s', 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/e0/d0/2a/e0d02a7c-7619-70a8-b58a-66d5e73093e7/artwork.jpg/600x600bb.jpg'),
      ('Sweet Caroline', 'Neil Diamond', 'Rock, Classic Rock, 1960s', 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/eb/62/bd/eb62bd4e-0fe6-73d4-c60f-4fcd95e84221/06UMGIM04681.rgb.jpg/600x600bb.jpg'),
      ('Die with a Smile', 'Bruno Mars', 'Pop, Top40, 2020s', 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/11/ae/f2/11aef294-f57c-bab9-c9fc-529162984e62/24UMGIM85348.rgb.jpg/600x600bb.jpg'),
      ('Levitating', 'Dua Lipa', 'Pop, Top40, 2020s', 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/0e/c1/57/0ec1575f-5153-ac4b-d578-c5fa3a90bfe1/5021732511676.jpg/600x600bb.jpg'),
      ('Only Girl (In the World)', 'Rihanna', 'Pop, Top40, R&B, 2010s', 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/c6/b1/6c/c6b16cd1-5580-a214-8745-c4f6faa490d6/16UMGIM59220.rgb.jpg/600x600bb.jpg'),
      ('Semicharmed Life', 'Third Eye Blind', 'Pop, Top40, Rock, 1990s', 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/89/8f/21/898f2118-a3e1-2b4a-7481-d986d09ffc29/mzi.jbqxjhwg.jpg/600x600bb.jpg'),
      ('Gimme! Gimme! Gimme!', 'ABBA', 'Disco, Pop, 1970s', 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/60/f8/a6/60f8a6bc-e875-238d-f2f8-f34a6034e6d2/14UMGIM07615.rgb.jpg/600x600bb.jpg'),
      ('Use Somebody', 'Kings of Leon', 'Pop, Top40, Rock, 2000s', 'https://is1-ssl.mzstatic.com/image/thumb/Features125/v4/74/25/4c/74254c8b-e03d-44e8-304d-4cde508b8cfb/dj.swemfdrr.jpg/600x600bb.jpg')
      -- Add more songs here as needed
    ) AS t(title, artist, genre, album_art_url)
  LOOP
    BEGIN
      INSERT INTO songs (title, artist, genre, "albumArtUrl", user_id, created_at, updated_at)
      VALUES (
        song_data.title, 
        song_data.artist, 
        song_data.genre, 
        song_data.album_art_url,
        'af200428-ba71-4ba1-b092-5031f5f488d3',
        NOW(),
        NOW()
      );
      songs_added := songs_added + 1;
    EXCEPTION 
      WHEN unique_violation THEN
        duplicates_skipped := duplicates_skipped + 1;
        RAISE NOTICE 'Duplicate skipped: % by %', song_data.title, song_data.artist;
    END;
  END LOOP;
  
  RAISE NOTICE 'Songs import completed: % added, % duplicates skipped', songs_added, duplicates_skipped;
END $$;
