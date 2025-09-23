-- Add fetch_time field to feeds table to track when feeds were last fetched
ALTER TABLE public.feeds ADD COLUMN fetch_time TIMESTAMP WITH TIME ZONE;

-- Create index on fetch_time for better query performance
CREATE INDEX idx_feeds_fetch_time ON public.feeds(fetch_time);