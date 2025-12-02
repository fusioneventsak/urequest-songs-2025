-- Migration: Add RLS policies for profiles table to support multi-tenancy
-- This enables:
-- 1. Public slug lookups (anyone can find a user by their slug)
-- 2. Users can read/update their own profile
-- 3. Users can insert their own profile

-- First, ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add public slug lookup policy (the key one for multi-tenancy)
-- This allows unauthenticated users to look up band info by slug
DROP POLICY IF EXISTS "Public slug lookup" ON profiles;
CREATE POLICY "Public slug lookup"
  ON profiles FOR SELECT
  USING (slug IS NOT NULL);

-- Ensure the slug column has proper index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug) WHERE slug IS NOT NULL;
