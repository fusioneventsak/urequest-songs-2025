-- =====================================================
-- Assign Songs to "2000s-Present" Setlist
-- =====================================================
-- This script assigns songs from 2000s, 2010s, and 2020s to the "2000s-Present" setlist

-- First, let's see what songs match the 2000s-Present criteria
SELECT 
    s.title,
    s.artist,
    s.genre,
    s.user_id
FROM songs s
WHERE s.user_id IS NOT NULL
AND (
    s.genre ILIKE '%2000s%' OR 
    s.genre ILIKE '%2010s%' OR 
    s.genre ILIKE '%2010%' OR 
    s.genre ILIKE '%2020s%'
)
ORDER BY s.title;

-- Now assign these songs to the "2000s-Present" setlist
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
    s.genre ILIKE '%2000s%' OR 
    s.genre ILIKE '%2010s%' OR 
    s.genre ILIKE '%2010%' OR 
    s.genre ILIKE '%2020s%'
)
AND NOT EXISTS (
    SELECT 1 FROM set_list_songs sls 
    WHERE sls.set_list_id = sl.id AND sls.song_id = s.id
);

-- Check the results
SELECT 
    'Songs assigned to 2000s-Present:' as summary,
    COUNT(sls.song_id)::text as count
FROM set_lists sl
LEFT JOIN set_list_songs sls ON sl.id = sls.set_list_id
WHERE sl.name = '2000s-Present';
