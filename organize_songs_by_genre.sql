-- =====================================================
-- uRequest Live: Organize Songs by Genre into Setlists
-- =====================================================
-- This script automatically creates genre-based setlists for each user
-- and assigns their songs to appropriate setlists based on genre

BEGIN;

-- Function to extract primary genre from genre string
CREATE OR REPLACE FUNCTION get_primary_genre(genre_text TEXT) 
RETURNS TEXT AS $$
BEGIN
    IF genre_text IS NULL OR genre_text = '' THEN
        RETURN 'Other';
    END IF;
    
    -- Extract the first genre from comma-separated list
    RETURN TRIM(SPLIT_PART(genre_text, ',', 1));
END;
$$ LANGUAGE plpgsql;

-- Function to get decade from genre string
CREATE OR REPLACE FUNCTION get_decade_from_genre(genre_text TEXT) 
RETURNS TEXT AS $$
BEGIN
    IF genre_text IS NULL THEN
        RETURN 'Unknown';
    END IF;
    
    -- Extract decade patterns
    IF genre_text ILIKE '%2020s%' THEN RETURN '2020s';
    ELSIF genre_text ILIKE '%2010s%' OR genre_text ILIKE '%2010%' THEN RETURN '2010s';
    ELSIF genre_text ILIKE '%2000s%' THEN RETURN '2000s';
    ELSIF genre_text ILIKE '%1990s%' THEN RETURN '1990s';
    ELSIF genre_text ILIKE '%1980s%' THEN RETURN '1980s';
    ELSIF genre_text ILIKE '%1970s%' THEN RETURN '1970s';
    ELSIF genre_text ILIKE '%1960s%' THEN RETURN '1960s';
    ELSIF genre_text ILIKE '%1950s%' THEN RETURN '1950s';
    ELSE RETURN 'Unknown';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create genre-based setlists for each user
INSERT INTO set_lists (id, name, user_id, notes, is_active, created_at)
SELECT 
    gen_random_uuid(),
    CASE 
        WHEN primary_genre = 'Pop' THEN primary_genre || ' Hits'
        WHEN primary_genre = 'Rock' THEN primary_genre || ' Classics'
        WHEN primary_genre = 'Country' THEN primary_genre || ' Favorites'
        WHEN primary_genre = 'Hip Hop' THEN 'Hip Hop & Rap'
        WHEN primary_genre = 'R&B' THEN 'R&B & Soul'
        ELSE primary_genre
    END as setlist_name,
    user_id,
    'Auto-generated setlist for ' || primary_genre || ' songs',
    false,
    NOW()
FROM (
    SELECT DISTINCT 
        get_primary_genre(genre) as primary_genre,
        user_id
    FROM songs 
    WHERE user_id IS NOT NULL 
    AND genre IS NOT NULL
    AND get_primary_genre(genre) != 'Other'
) genre_users
WHERE NOT EXISTS (
    SELECT 1 FROM set_lists sl 
    WHERE sl.user_id = genre_users.user_id 
    AND sl.name ILIKE '%' || genre_users.primary_genre || '%'
);

-- Create decade-based setlists for users with many songs
INSERT INTO set_lists (id, name, user_id, notes, is_active, created_at)
SELECT 
    gen_random_uuid(),
    decade || ' Collection',
    user_id,
    'Auto-generated setlist for ' || decade || ' music',
    false,
    NOW()
FROM (
    SELECT DISTINCT 
        get_decade_from_genre(genre) as decade,
        user_id,
        COUNT(*) OVER (PARTITION BY user_id, get_decade_from_genre(genre)) as song_count
    FROM songs 
    WHERE user_id IS NOT NULL 
    AND genre IS NOT NULL
    AND get_decade_from_genre(genre) != 'Unknown'
) decade_users
WHERE song_count >= 3  -- Only create decade setlists if user has 3+ songs from that decade
AND NOT EXISTS (
    SELECT 1 FROM set_lists sl 
    WHERE sl.user_id = decade_users.user_id 
    AND sl.name ILIKE '%' || decade_users.decade || '%'
);

-- Assign songs to genre-based setlists
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id
WHERE s.genre IS NOT NULL
AND s.user_id IS NOT NULL
AND (
    -- Match by primary genre
    sl.name ILIKE '%' || get_primary_genre(s.genre) || '%'
    OR 
    -- Special cases for genre matching
    (get_primary_genre(s.genre) = 'Hip Hop' AND sl.name ILIKE '%Hip Hop%')
    OR
    (get_primary_genre(s.genre) = 'R&B' AND sl.name ILIKE '%R&B%')
)
AND NOT EXISTS (
    -- Don't add duplicates
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- Assign songs to decade-based setlists (secondary assignment)
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id
WHERE s.genre IS NOT NULL
AND s.user_id IS NOT NULL
AND sl.name ILIKE '%' || get_decade_from_genre(s.genre) || '%'
AND get_decade_from_genre(s.genre) != 'Unknown'
AND NOT EXISTS (
    -- Don't add duplicates
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- Create a "Mixed Genres" setlist for songs that don't fit other categories
INSERT INTO set_lists (id, name, user_id, notes, is_active, created_at)
SELECT 
    gen_random_uuid(),
    'Mixed Genres',
    user_id,
    'Songs with unique or mixed genres',
    false,
    NOW()
FROM (
    SELECT DISTINCT user_id
    FROM songs 
    WHERE user_id IS NOT NULL 
    AND (genre IS NULL OR genre = '' OR get_primary_genre(genre) = 'Other')
) mixed_users
WHERE NOT EXISTS (
    SELECT 1 FROM set_lists sl 
    WHERE sl.user_id = mixed_users.user_id 
    AND sl.name = 'Mixed Genres'
);

-- Assign unassigned songs to Mixed Genres setlist
INSERT INTO set_list_songs (id, set_list_id, song_id, position, created_at)
SELECT 
    gen_random_uuid(),
    sl.id as set_list_id,
    s.id as song_id,
    ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY s.title) as position,
    NOW()
FROM songs s
JOIN set_lists sl ON s.user_id = sl.user_id AND sl.name = 'Mixed Genres'
WHERE s.user_id IS NOT NULL
AND (s.genre IS NULL OR s.genre = '' OR get_primary_genre(s.genre) = 'Other')
AND NOT EXISTS (
    -- Don't add if already in another setlist
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.song_id = s.id
);

-- Update existing setlists to have proper user assignments for orphaned setlists
UPDATE set_lists 
SET user_id = (
    SELECT user_id 
    FROM songs 
    WHERE songs.user_id IS NOT NULL 
    GROUP BY user_id 
    ORDER BY COUNT(*) DESC 
    LIMIT 1
)
WHERE user_id IS NULL 
AND name IN ('All Songs', '2000s-Present', '80s-90s', '60s-70s', '70s', 'POP');

-- Clean up functions
DROP FUNCTION IF EXISTS get_primary_genre(TEXT);
DROP FUNCTION IF EXISTS get_decade_from_genre(TEXT);

COMMIT;

-- =====================================================
-- Summary Query: Show results of organization
-- =====================================================
SELECT 
    'SETLIST ORGANIZATION SUMMARY' as summary_type,
    '' as details
UNION ALL
SELECT 
    'User: ' || COALESCE(p.full_name, p.email, 'Unknown') as summary_type,
    sl.name || ' (' || COUNT(sls.song_id) || ' songs)' as details
FROM set_lists sl
LEFT JOIN profiles p ON sl.user_id = p.id
LEFT JOIN set_list_songs sls ON sl.id = sls.set_list_id
WHERE sl.created_at >= NOW() - INTERVAL '1 minute'  -- Show recently created setlists
GROUP BY p.full_name, p.email, sl.name, sl.user_id
ORDER BY summary_type, details;
