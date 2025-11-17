/*
  # Add source column to requests table

  1. Changes
    - Add `source` column to `requests` table to track request origin (web/kiosk)
    - Set default value to 'web' for backwards compatibility
    - Update existing requests to have 'web' as source

  2. Purpose
    - Enable tracking of kiosk vs web requests for analytics
    - Support separate analytics counters for different request sources
*/

-- Add source column to requests table
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS source text DEFAULT 'web' CHECK (source IN ('web', 'kiosk'));

-- Update any existing NULL values to 'web' (backwards compatibility)
UPDATE requests
SET source = 'web'
WHERE source IS NULL;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_requests_source ON requests(source);

-- Add comment for documentation
COMMENT ON COLUMN requests.source IS 'Request source: web (frontend) or kiosk (kiosk mode)';
