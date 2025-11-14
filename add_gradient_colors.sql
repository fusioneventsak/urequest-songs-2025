-- Add gradient color columns to ui_settings table
-- Each color setting gets its own gradient start and end colors, plus a boolean toggle
ALTER TABLE ui_settings
ADD COLUMN IF NOT EXISTS primary_use_gradient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS primary_gradient_start TEXT DEFAULT '#ff00ff',
ADD COLUMN IF NOT EXISTS primary_gradient_end TEXT DEFAULT '#9d00ff',
ADD COLUMN IF NOT EXISTS secondary_use_gradient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS secondary_gradient_start TEXT DEFAULT '#9d00ff',
ADD COLUMN IF NOT EXISTS secondary_gradient_end TEXT DEFAULT '#7a00cc',
ADD COLUMN IF NOT EXISTS frontend_accent_use_gradient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS frontend_accent_gradient_start TEXT DEFAULT '#ff00ff',
ADD COLUMN IF NOT EXISTS frontend_accent_gradient_end TEXT DEFAULT '#9d00ff',
ADD COLUMN IF NOT EXISTS frontend_bg_use_gradient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS frontend_bg_gradient_start TEXT DEFAULT '#13091f',
ADD COLUMN IF NOT EXISTS frontend_bg_gradient_end TEXT DEFAULT '#0f051d',
ADD COLUMN IF NOT EXISTS nav_bg_use_gradient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nav_bg_gradient_start TEXT DEFAULT '#0f051d',
ADD COLUMN IF NOT EXISTS nav_bg_gradient_end TEXT DEFAULT '#0a0310',
ADD COLUMN IF NOT EXISTS highlight_use_gradient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS highlight_gradient_start TEXT DEFAULT '#ff00ff',
ADD COLUMN IF NOT EXISTS highlight_gradient_end TEXT DEFAULT '#9d00ff',
ADD COLUMN IF NOT EXISTS frontend_secondary_accent_use_gradient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS frontend_secondary_accent_gradient_start TEXT DEFAULT '#9d00ff',
ADD COLUMN IF NOT EXISTS frontend_secondary_accent_gradient_end TEXT DEFAULT '#7a00cc',
ADD COLUMN IF NOT EXISTS song_border_use_gradient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS song_border_gradient_start TEXT DEFAULT '#ff00ff',
ADD COLUMN IF NOT EXISTS song_border_gradient_end TEXT DEFAULT '#9d00ff',
ADD COLUMN IF NOT EXISTS frontend_header_bg_use_gradient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS frontend_header_bg_gradient_start TEXT DEFAULT '#13091f',
ADD COLUMN IF NOT EXISTS frontend_header_bg_gradient_end TEXT DEFAULT '#0f051d';

-- Update existing rows to have default gradient settings if they don't already
UPDATE ui_settings SET primary_use_gradient = FALSE WHERE primary_use_gradient IS NULL;
UPDATE ui_settings SET primary_gradient_start = '#ff00ff' WHERE primary_gradient_start IS NULL;
UPDATE ui_settings SET primary_gradient_end = '#9d00ff' WHERE primary_gradient_end IS NULL;
UPDATE ui_settings SET secondary_use_gradient = FALSE WHERE secondary_use_gradient IS NULL;
UPDATE ui_settings SET secondary_gradient_start = '#9d00ff' WHERE secondary_gradient_start IS NULL;
UPDATE ui_settings SET secondary_gradient_end = '#7a00cc' WHERE secondary_gradient_end IS NULL;
UPDATE ui_settings SET frontend_accent_use_gradient = FALSE WHERE frontend_accent_use_gradient IS NULL;
UPDATE ui_settings SET frontend_accent_gradient_start = '#ff00ff' WHERE frontend_accent_gradient_start IS NULL;
UPDATE ui_settings SET frontend_accent_gradient_end = '#9d00ff' WHERE frontend_accent_gradient_end IS NULL;
UPDATE ui_settings SET frontend_bg_use_gradient = FALSE WHERE frontend_bg_use_gradient IS NULL;
UPDATE ui_settings SET frontend_bg_gradient_start = '#13091f' WHERE frontend_bg_gradient_start IS NULL;
UPDATE ui_settings SET frontend_bg_gradient_end = '#0f051d' WHERE frontend_bg_gradient_end IS NULL;
UPDATE ui_settings SET nav_bg_use_gradient = FALSE WHERE nav_bg_use_gradient IS NULL;
UPDATE ui_settings SET nav_bg_gradient_start = '#0f051d' WHERE nav_bg_gradient_start IS NULL;
UPDATE ui_settings SET nav_bg_gradient_end = '#0a0310' WHERE nav_bg_gradient_end IS NULL;
UPDATE ui_settings SET highlight_use_gradient = FALSE WHERE highlight_use_gradient IS NULL;
UPDATE ui_settings SET highlight_gradient_start = '#ff00ff' WHERE highlight_gradient_start IS NULL;
UPDATE ui_settings SET highlight_gradient_end = '#9d00ff' WHERE highlight_gradient_end IS NULL;
UPDATE ui_settings SET frontend_secondary_accent_use_gradient = FALSE WHERE frontend_secondary_accent_use_gradient IS NULL;
UPDATE ui_settings SET frontend_secondary_accent_gradient_start = '#9d00ff' WHERE frontend_secondary_accent_gradient_start IS NULL;
UPDATE ui_settings SET frontend_secondary_accent_gradient_end = '#7a00cc' WHERE frontend_secondary_accent_gradient_end IS NULL;
UPDATE ui_settings SET song_border_use_gradient = FALSE WHERE song_border_use_gradient IS NULL;
UPDATE ui_settings SET song_border_gradient_start = '#ff00ff' WHERE song_border_gradient_start IS NULL;
UPDATE ui_settings SET song_border_gradient_end = '#9d00ff' WHERE song_border_gradient_end IS NULL;
UPDATE ui_settings SET frontend_header_bg_use_gradient = FALSE WHERE frontend_header_bg_use_gradient IS NULL;
UPDATE ui_settings SET frontend_header_bg_gradient_start = '#13091f' WHERE frontend_header_bg_gradient_start IS NULL;
UPDATE ui_settings SET frontend_header_bg_gradient_end = '#0f051d' WHERE frontend_header_bg_gradient_end IS NULL;
