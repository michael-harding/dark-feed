-- Add missing fields to user_settings table for feed management
ALTER TABLE public.user_settings
ADD COLUMN refresh_limit_interval INTEGER NOT NULL DEFAULT 0,
ADD COLUMN feed_fetch_time TIMESTAMP WITH TIME ZONE;

-- Create index on feed_fetch_time for better query performance
CREATE INDEX idx_user_settings_feed_fetch_time ON public.user_settings(feed_fetch_time);

-- Update existing records to have default refresh_limit_interval
UPDATE public.user_settings SET refresh_limit_interval = 0 WHERE refresh_limit_interval IS NULL;