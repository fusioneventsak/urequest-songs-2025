/*
  DIAGNOSTIC: Check requests state and see if we can restore info@ requests
*/

-- =====================================================
-- STEP 1: Check requests distribution by user_id
-- =====================================================
SELECT
  'Requests by user_id' as check_type,
  CASE
    WHEN user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' THEN 'info@fusion-events.ca'
    WHEN user_id = '7254d394-9e8a-4701-a39b-7ee56e517213' THEN 'urequestlive@gmail.com'
    WHEN user_id = 'af200428-ba71-4ba1-b092-5031f5f488d3' THEN 'mystery_user (old)'
    ELSE COALESCE(user_id::text, 'NULL')
  END as account,
  COUNT(*) as request_count
FROM requests
GROUP BY user_id
ORDER BY request_count DESC;

-- =====================================================
-- STEP 2: Check total requests
-- =====================================================
SELECT 'Total requests in table' as check_type, COUNT(*) as count FROM requests;

-- =====================================================
-- STEP 3: Check requests for info@fusion-events.ca
-- =====================================================
SELECT
  'Requests for info@fusion-events.ca' as check_type,
  COUNT(*) as count
FROM requests
WHERE user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9';

-- =====================================================
-- STEP 4: Show sample requests (all users)
-- =====================================================
SELECT
  'Sample requests' as info,
  id,
  song_title,
  song_artist,
  requester_name,
  status,
  user_id,
  created_at
FROM requests
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- STEP 5: Check if any requests exist for the mystery user
-- that should be moved to info@
-- =====================================================
SELECT
  'Requests from mystery user (may belong to info@)' as check_type,
  id,
  song_title,
  song_artist,
  requester_name,
  status,
  created_at
FROM requests
WHERE user_id = 'af200428-ba71-4ba1-b092-5031f5f488d3'
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- STEP 6: Check requesters table
-- =====================================================
SELECT
  'Requesters by user_id' as check_type,
  CASE
    WHEN user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' THEN 'info@fusion-events.ca'
    WHEN user_id = '7254d394-9e8a-4701-a39b-7ee56e517213' THEN 'urequestlive@gmail.com'
    WHEN user_id = 'af200428-ba71-4ba1-b092-5031f5f488d3' THEN 'mystery_user (old)'
    ELSE COALESCE(user_id::text, 'NULL')
  END as account,
  COUNT(*) as requester_count
FROM requesters
GROUP BY user_id
ORDER BY requester_count DESC;

SELECT '📋 Run this diagnostic to see current requests state' as status;
