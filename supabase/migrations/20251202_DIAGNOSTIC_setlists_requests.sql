/*
  DIAGNOSTIC: Check setlists and requests state
*/

-- Check set_lists by user_id
SELECT
  'set_lists by user_id' as check_type,
  COALESCE(user_id::text, 'NULL') as user_id,
  COUNT(*) as count
FROM set_lists
GROUP BY user_id;

-- Check if there are any set_lists at all
SELECT 'Total set_lists' as check_type, COUNT(*) as count FROM set_lists;

-- Check set_list_songs by user_id
SELECT
  'set_list_songs by user_id' as check_type,
  COALESCE(user_id::text, 'NULL') as user_id,
  COUNT(*) as count
FROM set_list_songs
GROUP BY user_id;

-- Check requests by user_id
SELECT
  'requests by user_id' as check_type,
  COALESCE(user_id::text, 'NULL') as user_id,
  COUNT(*) as count
FROM requests
GROUP BY user_id;

-- Check if there are any requests at all
SELECT 'Total requests' as check_type, COUNT(*) as count FROM requests;

-- Show set_lists with their names
SELECT
  'Set list details' as info,
  id,
  name,
  user_id,
  is_active
FROM set_lists
LIMIT 20;

-- FIX: Assign any remaining NULL user_ids
UPDATE set_lists
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

UPDATE set_list_songs
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

UPDATE requests
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

UPDATE requesters
SET user_id = '7254d394-9e8a-4701-a39b-7ee56e517213'
WHERE user_id IS NULL;

-- Verify after fix
SELECT
  'AFTER FIX: set_lists by user_id' as check_type,
  COALESCE(user_id::text, 'NULL') as user_id,
  COUNT(*) as count
FROM set_lists
GROUP BY user_id;

SELECT
  'AFTER FIX: requests by user_id' as check_type,
  COALESCE(user_id::text, 'NULL') as user_id,
  COUNT(*) as count
FROM requests
GROUP BY user_id;

SELECT '✅ Setlists and requests user_ids fixed!' as status;
