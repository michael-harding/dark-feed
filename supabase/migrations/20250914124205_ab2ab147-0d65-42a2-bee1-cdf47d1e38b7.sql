-- Create feeds table
CREATE TABLE public.feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  unread_count INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, url)
);

-- Create articles table
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feed_id UUID NOT NULL REFERENCES public.feeds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  feed_title TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_bookmarked BOOLEAN NOT NULL DEFAULT false,
  author TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, url)
);

-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  sort_mode TEXT NOT NULL DEFAULT 'chronological' CHECK (sort_mode IN ('chronological', 'unreadOnTop')),
  accent_color TEXT NOT NULL DEFAULT '46 87% 65%',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for feeds
CREATE POLICY "Users can view their own feeds" ON public.feeds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feeds" ON public.feeds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feeds" ON public.feeds
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feeds" ON public.feeds
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for articles
CREATE POLICY "Users can view their own articles" ON public.articles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own articles" ON public.articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own articles" ON public.articles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own articles" ON public.articles
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_settings
CREATE POLICY "Users can view their own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_feeds_updated_at
  BEFORE UPDATE ON public.feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_feeds_user_id ON public.feeds(user_id);
CREATE INDEX idx_articles_user_id ON public.articles(user_id);
CREATE INDEX idx_articles_feed_id ON public.articles(feed_id);
CREATE INDEX idx_articles_published_at ON public.articles(published_at);
CREATE INDEX idx_articles_is_read ON public.articles(is_read);
CREATE INDEX idx_articles_is_starred ON public.articles(is_starred);
CREATE INDEX idx_articles_is_bookmarked ON public.articles(is_bookmarked);