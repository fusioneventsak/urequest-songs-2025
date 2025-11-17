-- Add is_active column to requests table to preserve historical data
-- When queue is "cleared", we set is_active=false instead of deleting
-- This preserves all data for analytics while clearing the active queue

ALTER TABLE requests
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Set all existing requests to active
UPDATE requests
SET is_active = true
WHERE is_active IS NULL;

-- Create index for filtering active requests
CREATE INDEX IF NOT EXISTS idx_requests_is_active ON requests(is_active);

-- Add comment explaining the column
COMMENT ON COLUMN requests.is_active IS 'Whether this request is in the active queue. Set to false when queue is cleared to preserve analytics data.';
