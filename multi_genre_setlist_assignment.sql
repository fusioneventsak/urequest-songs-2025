-- =====================================================
-- uRequest Live: Multi-Genre Setlist Assignment
-- =====================================================
-- This script assigns songs to ALL applicable setlists based on their genres
-- A song with "Pop, Rock, 1980s" will appear in Pop Hits, Rock Classics, AND 1980s Collection

BEGIN;

-- Clear existing assignments to rebuild them properly
DELETE FROM set_list_songs 
WHERE set_list_id IN (
    SELECT id FROM set_lists 
    WHERE created_at >= NOW() - INTERVAL '1 hour'
);

-- Function to check if a genre string contains a specific genre
CREATE OR REPLACE FUNCTION genre_contains(genre_text TEXT, search_genre TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    IF genre_text IS NULL OR search_genre IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Case-insensitive search for the genre in the comma-separated list
    RETURN LOWER(genre_text) LIKE '%' || LOWER(search_genre) || '%';
END;
$$ LANGUAGE plpgsql;

-- Function to check if a genre string contains a specific decade
CREATE OR REPLACE FUNCTION genre_contains_decade(genre_text TEXT, decade TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    IF genre_text IS NULL OR decade IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check for decade patterns
    RETURN LOWER(genre_text) LIKE '%' || LOWER(decade) || '%';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ASSIGN SONGS TO POP HITS SETLISTS
-- =====================================================
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = 'Pop Hits'
WHERE s.user_id IS NOT NULL
AND genre_contains(s.genre, 'Pop')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO ROCK CLASSICS SETLISTS
-- =====================================================
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = 'Rock Classics'
WHERE s.user_id IS NOT NULL
AND (genre_contains(s.genre, 'Rock') OR genre_contains(s.genre, 'Classic Rock'))
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO COUNTRY FAVORITES SETLISTS
-- =====================================================
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = 'Country Favorites'
WHERE s.user_id IS NOT NULL
AND genre_contains(s.genre, 'Country')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO R&B & SOUL SETLISTS
-- =====================================================
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = 'R&B & Soul'
WHERE s.user_id IS NOT NULL
AND (genre_contains(s.genre, 'R&B') OR genre_contains(s.genre, 'Soul') OR genre_contains(s.genre, 'Motown'))
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO HIP HOP & RAP SETLISTS
-- =====================================================
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = 'Hip Hop & Rap'
WHERE s.user_id IS NOT NULL
AND (genre_contains(s.genre, 'Hip Hop') OR genre_contains(s.genre, 'Rap'))
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO DECADE COLLECTIONS
-- =====================================================

-- 2020s Collection
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = '2020s Collection'
WHERE s.user_id IS NOT NULL
AND genre_contains_decade(s.genre, '2020s')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- 2010s Collection
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = '2010s Collection'
WHERE s.user_id IS NOT NULL
AND (genre_contains_decade(s.genre, '2010s') OR genre_contains_decade(s.genre, '2010'))
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- 2000s Collection
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = '2000s Collection'
WHERE s.user_id IS NOT NULL
AND genre_contains_decade(s.genre, '2000s')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- 1990s Collection
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = '1990s Collection'
WHERE s.user_id IS NOT NULL
AND genre_contains_decade(s.genre, '1990s')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- 1980s Collection
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = '1980s Collection'
WHERE s.user_id IS NOT NULL
AND genre_contains_decade(s.genre, '1980s')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- 1970s Collection
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = '1970s Collection'
WHERE s.user_id IS NOT NULL
AND genre_contains_decade(s.genre, '1970s')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- 1960s Collection
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = '1960s Collection'
WHERE s.user_id IS NOT NULL
AND genre_contains_decade(s.genre, '1960s')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- CREATE ADDITIONAL GENRE SETLISTS
-- =====================================================

-- Create Funk setlists
INSERT INTO set_lists (id, name, user_id, notes, is_active, created_at)
SELECT 
    gen_random_uuid(),
    'Funk Favorites',
    user_id,
    'Auto-generated setlist for Funk songs',
    false,
    NOW()
FROM (
    SELECT DISTINCT s.user_id
    FROM songs s
    WHERE s.user_id IS NOT NULL 
    AND genre_contains(s.genre, 'Funk')
    AND NOT EXISTS (
        SELECT 1 FROM set_lists sl 
        WHERE sl.user_id = s.user_id 
        AND sl.name = 'Funk Favorites'
    )
) funk_users;

-- Assign Funk songs
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = 'Funk Favorites'
WHERE s.user_id IS NOT NULL
AND genre_contains(s.genre, 'Funk')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- Create Reggae setlists
INSERT INTO set_lists (id, name, user_id, notes, is_active, created_at)
SELECT 
    gen_random_uuid(),
    'Reggae Vibes',
    user_id,
    'Auto-generated setlist for Reggae songs',
    false,
    NOW()
FROM (
    SELECT DISTINCT s.user_id
    FROM songs s
    WHERE s.user_id IS NOT NULL 
    AND genre_contains(s.genre, 'Reggae')
    AND NOT EXISTS (
        SELECT 1 FROM set_lists sl 
        WHERE sl.user_id = s.user_id 
        AND sl.name = 'Reggae Vibes'
    )
) reggae_users;

-- Assign Reggae songs
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = 'Reggae Vibes'
WHERE s.user_id IS NOT NULL
AND genre_contains(s.genre, 'Reggae')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- Create Dance setlists
INSERT INTO set_lists (id, name, user_id, notes, is_active, created_at)
SELECT 
    gen_random_uuid(),
    'Dance Floor',
    user_id,
    'Auto-generated setlist for Dance songs',
    false,
    NOW()
FROM (
    SELECT DISTINCT s.user_id
    FROM songs s
    WHERE s.user_id IS NOT NULL 
    AND (genre_contains(s.genre, 'Dance') OR genre_contains(s.genre, 'Disco'))
    AND NOT EXISTS (
        SELECT 1 FROM set_lists sl 
        WHERE sl.user_id = s.user_id 
        AND sl.name = 'Dance Floor'
    )
) dance_users;

-- Assign Dance songs
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = 'Dance Floor'
WHERE s.user_id IS NOT NULL
AND (genre_contains(s.genre, 'Dance') OR genre_contains(s.genre, 'Disco'))
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- Clean up functions
DROP FUNCTION IF EXISTS genre_contains(TEXT, TEXT);
DROP FUNCTION IF EXISTS genre_contains_decade(TEXT, TEXT);

COMMIT;

-- =====================================================
-- VERIFICATION: Show songs that appear in multiple setlists
-- =====================================================
SELECT 
    s.title,
    s.artist,
    s.genre,
    STRING_AGG(sl.name, ', ' ORDER BY sl.name) as appears_in_setlists,
    COUNT(DISTINCT sl.id) as setlist_count
FROM songs s
JOIN set_list_songs sls ON s.id = sls.song_id
JOIN set_lists sl ON sls.set_list_id = sl.id
WHERE s.user_id IS NOT NULL
GROUP BY s.id, s.title, s.artist, s.genre
HAVING COUNT(DISTINCT sl.id) > 1
ORDER BY setlist_count DESC, s.title
LIMIT 10;
