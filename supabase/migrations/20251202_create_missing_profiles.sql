/*
  Create Missing Profiles

  Insert profiles for existing users that don't have one
*/

-- Insert profile for info@fusion-events.ca if not exists
INSERT INTO profiles (id, display_name, slug, created_at, updated_at)
VALUES (
  '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9',
  'Fusion Events',
  'fusion-events',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Insert profile for urequestlive@gmail.com if not exists
INSERT INTO profiles (id, display_name, slug, created_at, updated_at)
VALUES (
  '7254d394-9e8a-4701-a39b-7ee56e517213',
  'uRequest Live',
  'urequestlive',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Verify profiles exist
SELECT id, display_name, slug FROM profiles;
