-- ============================================================================
-- Supabase Storage: 24-Hour Photo Auto-Deletion Lifecycle Policy
-- ============================================================================
-- This SQL creates a lifecycle policy to automatically delete user photos
-- after 24 hours to save on storage costs and egress bandwidth.
--
-- IMPORTANT: Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste and Run
-- ============================================================================

-- Create a function to delete old user photos (24+ hours old)
CREATE OR REPLACE FUNCTION delete_old_user_photos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete files from user-photos bucket that are older than 24 hours
  DELETE FROM storage.objects
  WHERE bucket_id = 'user-photos'
    AND created_at < NOW() - INTERVAL '24 hours';

  RAISE NOTICE 'Deleted old user photos (24+ hours old)';
END;
$$;

-- Create a scheduled job to run the cleanup function every hour
-- Note: Supabase uses pg_cron for scheduling
-- If pg_cron is not enabled, you'll need to enable it in your database settings

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run every hour
SELECT cron.schedule(
  'delete-old-user-photos',  -- Job name
  '0 * * * *',               -- Run at the start of every hour (cron format)
  'SELECT delete_old_user_photos();'
);

-- Optional: View scheduled jobs to confirm
-- SELECT * FROM cron.job;

-- Optional: Manually trigger the cleanup function for testing
-- SELECT delete_old_user_photos();

-- ============================================================================
-- ALTERNATIVE APPROACH: Database Trigger (If pg_cron is not available)
-- ============================================================================
-- If pg_cron is not available in your Supabase project, you can use a trigger
-- that runs on INSERT to clean up old photos automatically when new photos
-- are uploaded. This is less ideal but works without cron support.

-- Create the cleanup trigger function
CREATE OR REPLACE FUNCTION cleanup_old_photos_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete photos older than 24 hours whenever a new photo is uploaded
  DELETE FROM storage.objects
  WHERE bucket_id = 'user-photos'
    AND created_at < NOW() - INTERVAL '24 hours'
    AND id != NEW.id;  -- Don't delete the newly inserted photo

  RETURN NEW;
END;
$$;

-- Create the trigger (uncomment if using this approach instead of cron)
-- DROP TRIGGER IF EXISTS trigger_cleanup_old_photos ON storage.objects;
-- CREATE TRIGGER trigger_cleanup_old_photos
--   AFTER INSERT ON storage.objects
--   FOR EACH ROW
--   WHEN (NEW.bucket_id = 'user-photos')
--   EXECUTE FUNCTION cleanup_old_photos_on_insert();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if pg_cron is enabled
-- SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- View all scheduled cron jobs
-- SELECT * FROM cron.job WHERE jobname LIKE '%photo%';

-- View recent photos and their ages
-- SELECT
--   name,
--   created_at,
--   NOW() - created_at AS age,
--   CASE
--     WHEN NOW() - created_at > INTERVAL '24 hours' THEN 'Will be deleted'
--     ELSE 'Active'
--   END AS status
-- FROM storage.objects
-- WHERE bucket_id = 'user-photos'
-- ORDER BY created_at DESC
-- LIMIT 20;

-- ============================================================================
-- CLEANUP / REMOVAL (if you want to remove the policy)
-- ============================================================================

-- To remove the cron job:
-- SELECT cron.unschedule('delete-old-user-photos');

-- To drop the cleanup function:
-- DROP FUNCTION IF EXISTS delete_old_user_photos();
-- DROP FUNCTION IF EXISTS cleanup_old_photos_on_insert();

-- To drop the trigger:
-- DROP TRIGGER IF EXISTS trigger_cleanup_old_photos ON storage.objects;
