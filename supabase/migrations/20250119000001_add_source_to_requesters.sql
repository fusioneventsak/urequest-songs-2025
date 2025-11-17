/*
  # Add source column to requesters table

  1. Changes
    - Add `source` column to `requesters` table to track each individual request source
    - Set default value to 'web' for backwards compatibility
    - Update existing requesters to have 'web' as source

  2. Purpose
    - Enable tracking of total kiosk requests (not just unique songs)
    - Track every request action, whether it's a new song or adding to existing
*/

-- Add source column to requesters table
ALTER TABLE requesters
ADD COLUMN IF NOT EXISTS source text DEFAULT 'web' CHECK (source IN ('web', 'kiosk'));

-- Update any existing NULL values to 'web' (backwards compatibility)
UPDATE requesters
SET source = 'web'
WHERE source IS NULL;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_requesters_source ON requesters(source);

-- Add comment for documentation
COMMENT ON COLUMN requesters.source IS 'Request source: web (frontend) or kiosk (kiosk mode)';
