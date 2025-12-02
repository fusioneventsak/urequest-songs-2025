/*
  FIX: Drop old function overloads that are causing PGRST203 errors

  The database has multiple versions of these functions:
  - add_vote (2 param and 3 param versions)
  - lock_request (1 param and 2 param versions)
  - unlock_request (1 param and 2 param versions)

  We need to drop the old versions so Supabase can resolve the function calls.
*/

-- =====================================================
-- STEP 1: Drop old add_vote function (2 params)
-- =====================================================
DROP FUNCTION IF EXISTS add_vote(uuid, text);

-- =====================================================
-- STEP 2: Drop old lock_request function (1 param)
-- =====================================================
DROP FUNCTION IF EXISTS lock_request(uuid);

-- =====================================================
-- STEP 3: Drop old unlock_request function (1 param)
-- =====================================================
DROP FUNCTION IF EXISTS unlock_request(uuid);

-- =====================================================
-- STEP 4: Verify remaining functions
-- =====================================================
SELECT
  'Remaining add_vote functions' as check_type,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'add_vote';

SELECT
  'Remaining lock_request functions' as check_type,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'lock_request';

SELECT
  'Remaining unlock_request functions' as check_type,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'unlock_request';

SELECT '✅ Old function overloads dropped!' as status;
