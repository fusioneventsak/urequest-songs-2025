-- =====================================================
-- Assign Songs to Existing Empty Setlists
-- =====================================================
-- This script assigns songs to the existing setlists based on their intended genres

BEGIN;

-- Recreate the genre_contains function
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

-- =====================================================
-- ASSIGN SONGS TO "All Songs" SETLIST
-- =====================================================
-- Assign ALL songs to the "All Songs" setlist
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (ORDER BY s.title) as position,
    NOW()
FROM songs s
CROSS JOIN set_lists sl
WHERE sl.name = 'All Songs'
AND s.user_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO "POP" SETLIST
-- =====================================================
-- Assign all Pop songs to the "POP" setlist
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (ORDER BY s.title) as position,
    NOW()
FROM songs s
CROSS JOIN set_lists sl
WHERE sl.name = 'POP'
AND s.user_id IS NOT NULL
AND genre_contains(s.genre, 'Pop')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO "2000s-Present" SETLIST
-- =====================================================
-- Assign songs from 2000s, 2010s, 2020s to "2000s-Present"
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (ORDER BY s.title) as position,
    NOW()
FROM songs s
CROSS JOIN set_lists sl
WHERE sl.name = '2000s-Present'
AND s.user_id IS NOT NULL
AND (
    genre_contains(s.genre, '2000s') OR 
    genre_contains(s.genre, '2010s') OR 
    genre_contains(s.genre, '2010') OR 
    genre_contains(s.genre, '2020s')
)
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO "80s-90s" SETLIST
-- =====================================================
-- Assign songs from 1980s and 1990s to "80s-90s"
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (ORDER BY s.title) as position,
    NOW()
FROM songs s
CROSS JOIN set_lists sl
WHERE sl.name = '80s-90s'
AND s.user_id IS NOT NULL
AND (
    genre_contains(s.genre, '1980s') OR 
    genre_contains(s.genre, '1990s')
)
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO "60s-70s" SETLIST
-- =====================================================
-- Assign songs from 1960s and 1970s to "60s-70s"
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (ORDER BY s.title) as position,
    NOW()
FROM songs s
CROSS JOIN set_lists sl
WHERE sl.name = '60s-70s'
AND s.user_id IS NOT NULL
AND (
    genre_contains(s.genre, '1960s') OR 
    genre_contains(s.genre, '1970s')
)
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO "70s" SETLIST
-- =====================================================
-- Assign songs from 1970s to "70s"
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (ORDER BY s.title) as position,
    NOW()
FROM songs s
CROSS JOIN set_lists sl
WHERE sl.name = '70s'
AND s.user_id IS NOT NULL
AND genre_contains(s.genre, '1970s')
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- =====================================================
-- ASSIGN SONGS TO "WOLSELEY" SETLIST
-- =====================================================
-- This appears to be a custom setlist, let's assign some variety of songs
-- We'll assign a mix of popular songs from different genres
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (ORDER BY s.title) as position,
    NOW()
FROM songs s
CROSS JOIN set_lists sl
WHERE sl.name = 'WOLSELEY'
AND s.user_id IS NOT NULL
AND (
    -- Include popular/top40 songs
    genre_contains(s.genre, 'Top40') OR
    genre_contains(s.genre, 'Pop') OR
    -- Include some rock classics
    (genre_contains(s.genre, 'Rock') AND genre_contains(s.genre, 'Classic'))
)
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
)
LIMIT 50; -- Limit to 50 songs for this custom setlist

-- =====================================================
-- UPDATE USER ASSIGNMENTS FOR ORPHANED SETLISTS
-- =====================================================
-- Assign these setlists to the user with the most songs (Dashboard User)
UPDATE set_lists 
SET user_id = (
    SELECT user_id 
    FROM songs 
    WHERE user_id IS NOT NULL 
    GROUP BY user_id 
    ORDER BY COUNT(*) DESC 
    LIMIT 1
)
WHERE user_id IS NULL 
AND name IN ('All Songs', '2000s-Present', '80s-90s', '60s-70s', '70s', 'POP', 'WOLSELEY');

-- Clean up function
DROP FUNCTION IF EXISTS genre_contains(TEXT, TEXT);

COMMIT;

-- =====================================================
-- SUMMARY: Show results
-- =====================================================
SELECT 
    'SETLIST ASSIGNMENT SUMMARY' as summary_type,
    '' as details
UNION ALL
SELECT 
    sl.name as summary_type,
    COUNT(sls.song_id)::text || ' songs assigned' as details
FROM set_lists sl
LEFT JOIN set_list_songs sls ON sl.id = sls.set_list_id
WHERE sl.name IN ('WOLSELEY', 'All Songs', '2000s-Present', '80s-90s', '60s-70s', '70s', 'POP')
GROUP BY sl.name
ORDER BY summary_type;
