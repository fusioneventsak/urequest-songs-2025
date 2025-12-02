/*
  FIX: Move requests from mystery user to info@fusion-events.ca

  Background: The mystery user (af200428-ba71-4ba1-b092-5031f5f488d3) had 173 songs
  that belonged to info@fusion-events.ca. Any requests associated with that user
  should also be moved to info@.

  User mapping:
  - info@fusion-events.ca: 6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9
  - urequestlive@gmail.com: 7254d394-9e8a-4701-a39b-7ee56e517213
  - mystery_user (old): af200428-ba71-4ba1-b092-5031f5f488d3
*/

-- =====================================================
-- STEP 1: Check current requests distribution BEFORE fix
-- =====================================================
SELECT
  'BEFORE FIX: Requests by user_id' as check_type,
  CASE
    WHEN user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' THEN 'info@fusion-events.ca'
    WHEN user_id = '7254d394-9e8a-4701-a39b-7ee56e517213' THEN 'urequestlive@gmail.com'
    WHEN user_id = 'af200428-ba71-4ba1-b092-5031f5f488d3' THEN 'mystery_user (should be info@)'
    ELSE COALESCE(user_id::text, 'NULL')
  END as account,
  COUNT(*) as request_count
FROM requests
GROUP BY user_id
ORDER BY request_count DESC;

-- =====================================================
-- STEP 2: Move any requests from mystery user to info@
-- =====================================================
UPDATE requests
SET user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9'
WHERE user_id = 'af200428-ba71-4ba1-b092-5031f5f488d3';

-- =====================================================
-- STEP 3: Move requesters from mystery user to info@
-- =====================================================
UPDATE requesters
SET user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9'
WHERE user_id = 'af200428-ba71-4ba1-b092-5031f5f488d3';

-- =====================================================
-- STEP 4: Check requests distribution AFTER fix
-- =====================================================
SELECT
  'AFTER FIX: Requests by user_id' as check_type,
  CASE
    WHEN user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9' THEN 'info@fusion-events.ca'
    WHEN user_id = '7254d394-9e8a-4701-a39b-7ee56e517213' THEN 'urequestlive@gmail.com'
    WHEN user_id = 'af200428-ba71-4ba1-b092-5031f5f488d3' THEN 'mystery_user (should be 0 now)'
    ELSE COALESCE(user_id::text, 'NULL')
  END as account,
  COUNT(*) as request_count
FROM requests
GROUP BY user_id
ORDER BY request_count DESC;

-- =====================================================
-- STEP 5: Show sample requests for info@ to verify
-- =====================================================
SELECT
  'Sample requests for info@fusion-events.ca' as info,
  id,
  title,
  artist,
  status,
  created_at
FROM requests
WHERE user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9'
ORDER BY created_at DESC
LIMIT 10;

SELECT '✅ Requests moved to info@fusion-events.ca!' as status;
