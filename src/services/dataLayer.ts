// Centralized data access layer
import { supabase } from '@/integrations/supabase/client';

export interface Feed {
  id: string;
  title: string;
  url: string;
  unreadCount: number;
  category?: string;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  publishedAt: string;
  feedId: string;
  feedTitle: string;
  isRead: boolean;
  isStarred: boolean;
  isBookmarked: boolean;
  author?: string;
  sortOrder: number;
}

// Local storage key for feed fetch times (to prevent rate limiting during development)
const FEED_FETCH_TIMES_KEY = 'rss-feed-fetch-times';

export class DataLayer {
  // Feed operations
  static loadFeeds = async (): Promise<Feed[]> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('feeds')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading feeds:', error);
        return [];
      }

      return data.map(feed => ({
        id: feed.id,
        title: feed.title,
        url: feed.url,
        unreadCount: feed.unread_count,
        category: feed.category
      }));
    } catch (error) {
      console.error('Error loading feeds:', error);
      return [];
    }
  };

  static saveFeeds = async (feeds: Feed[]): Promise<void> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // For simplicity, we'll handle this through individual feed operations
      // This method is mainly used for reordering, which we'll handle differently
    } catch (error) {
      console.error('Error saving feeds:', error);
    }
  };

  static saveFeed = async (feed: Feed): Promise<void> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('feeds')
        .upsert({
          id: feed.id,
          user_id: user.user.id,
          title: feed.title,
          url: feed.url,
          unread_count: feed.unreadCount,
          category: feed.category
        });

      if (error) {
        console.error('Error saving feed:', error);
      }
    } catch (error) {
      console.error('Error saving feed:', error);
    }
  };

  static deleteFeed = async (feedId: string): Promise<void> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('feeds')
        .delete()
        .eq('id', feedId)
        .eq('user_id', user.user.id);

      if (error) {
        console.error('Error deleting feed:', error);
      }
    } catch (error) {
      console.error('Error deleting feed:', error);
    }
  };

  // Article operations
  static loadArticles = async (): Promise<Article[]> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', user.user.id)
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error loading articles:', error);
        return [];
      }

      return data.map((article, index) => ({
        id: article.id,
        title: article.title,
        description: article.description || '',
        content: article.content || '',
        url: article.url,
        publishedAt: article.published_at,
        feedId: article.feed_id,
        feedTitle: article.feed_title,
        isRead: article.is_read,
        isStarred: article.is_starred,
        isBookmarked: article.is_bookmarked,
        author: article.author || '',
        sortOrder: index
      }));
    } catch (error) {
      console.error('Error loading articles:', error);
      return [];
    }
  };

  static saveArticles = async (articles: Article[]): Promise<void> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const articlesData = articles.map(article => ({
        id: article.id,
        user_id: user.user.id,
        feed_id: article.feedId,
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        published_at: article.publishedAt,
        feed_title: article.feedTitle,
        is_read: article.isRead,
        is_starred: article.isStarred,
        is_bookmarked: article.isBookmarked,
        author: article.author,
        sort_order: article.sortOrder
      }));

      const { error } = await supabase
        .from('articles')
        .upsert(articlesData);

      if (error) {
        console.error('Error saving articles:', error);
      }
    } catch (error) {
      console.error('Error saving articles:', error);
    }
  };

  static updateArticle = async (article: Article): Promise<void> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('articles')
        .update({
          is_read: article.isRead,
          is_starred: article.isStarred,
          is_bookmarked: article.isBookmarked,
          sort_order: article.sortOrder
        })
        .eq('id', article.id)
        .eq('user_id', user.user.id);

      if (error) {
        console.error('Error updating article:', error);
      }
    } catch (error) {
      console.error('Error updating article:', error);
    }
  };

  static getExistingArticleUrlsForFeed = async (feedId: string): Promise<Set<string>> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return new Set();

      const { data, error } = await supabase
        .from('articles')
        .select('url')
        .eq('user_id', user.user.id)
        .eq('feed_id', feedId);

      if (error) {
        console.error('Error getting existing article URLs:', error);
        return new Set();
      }

      return new Set(data.map(article => article.url));
    } catch (error) {
      console.error('Error getting existing article URLs:', error);
      return new Set();
    }
  };

  // Settings operations
  static loadSortMode = async (): Promise<'chronological' | 'unreadOnTop'> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return 'chronological';

      const { data, error } = await supabase
        .from('user_settings')
        .select('sort_mode')
        .eq('user_id', user.user.id)
        .single();

      if (error) {
        // If no settings exist, create default settings
        if (error.code === 'PGRST116') {
          await DataLayer.createDefaultSettings();
          return 'chronological';
        }
        console.error('Error loading sort mode:', error);
        return 'chronological';
      }

      return data.sort_mode as 'chronological' | 'unreadOnTop';
    } catch (error) {
      console.error('Error loading sort mode:', error);
      return 'chronological';
    }
  };

  static saveSortMode = async (mode: 'chronological' | 'unreadOnTop'): Promise<void> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.user.id,
            sort_mode: mode
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error saving sort mode:', error);
      }
    } catch (error) {
      console.error('Error saving sort mode:', error);
    }
  };

  static loadAccentColor = async (): Promise<string> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return '46 87% 65%';

      const { data, error } = await supabase
        .from('user_settings')
        .select('accent_color')
        .eq('user_id', user.user.id)
        .single();

      if (error) {
        // If no settings exist, create default settings
        if (error.code === 'PGRST116') {
          await DataLayer.createDefaultSettings();
          return '46 87% 65%';
        }
        console.error('Error loading accent color:', error);
        return '46 87% 65%';
      }

      return data.accent_color;
    } catch (error) {
      console.error('Error loading accent color:', error);
      return '46 87% 65%';
    }
  };

  static saveAccentColor = async (color: string): Promise<void> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.user.id,
            accent_color: color
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error saving accent color:', error);
      }
    } catch (error) {
      console.error('Error saving accent color:', error);
    }
  };

  static createDefaultSettings = async (): Promise<void> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.user.id,
            sort_mode: 'chronological',
            accent_color: '46 87% 65%'
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error creating default settings:', error);
      }
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  // RSS fetching
  static fetchRSSFeed = async (url: string): Promise<any> => {
    // limit fetching to 3 minute intervals to limit data usage and prevent 429 errors
    let fetchTimes: Record<string, number> = {};
    try {
      fetchTimes = JSON.parse(localStorage.getItem(FEED_FETCH_TIMES_KEY) || '{}');
    } catch {}
    const now = Date.now();
    const lastFetch = fetchTimes[url] || 0;
    const threeMinutes = 3 * 60 * 1000;
    if (now - lastFetch < threeMinutes) {
      console.log(`RSS feed for ${url} was fetched less than 3 minutes ago`);
      return {
        status: 'skipped',
        feed: { title: 'Development Feed (skipped)' },
        items: []
      };
    }
    fetchTimes[url] = now;
    localStorage.setItem(FEED_FETCH_TIMES_KEY, JSON.stringify(fetchTimes));

    try {
      // Use RSS2JSON API which is browser-compatible
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'ok') {
        throw new Error(data.message || 'Failed to parse RSS feed');
      }

      return data;
    } catch (error) {
      console.error('Error fetching RSS feed:', error);
      throw error;
    }
  };

  // Business logic helpers
  static setSortOrderForArticles = (articles: Article[], mode: 'chronological' | 'unreadOnTop'): Article[] => {
    let sorted = [...articles];
    if (mode === 'chronological') {
      sorted.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    } else {
      sorted.sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
      });
    }
    return sorted.map((a, i) => ({ ...a, sortOrder: i }));
  };

  static filterArticles = (articles: Article[], selectedFeed: string | null): Article[] => {
    if (selectedFeed === 'all') {
      return articles;
    } else if (selectedFeed === 'starred') {
      return articles.filter(article => article.isStarred);
    } else if (selectedFeed === 'bookmarks') {
      return articles.filter(article => article.isBookmarked);
    } else {
      return articles.filter(article => article.feedId === selectedFeed);
    }
  };

  static createArticlesFromRSSData = (data: any, feedId: string, feedTitle: string): Article[] => {
    return data.items?.map((item: any, index: number) => ({
      id: crypto.randomUUID(),
      title: item.title || 'Untitled',
      description: item.description?.replace(/<[^>]*>/g, '') || '',
      content: item.content || item.description || '',
      url: item.link || '',
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      feedId,
      feedTitle,
      isRead: false,
      isStarred: false,
      isBookmarked: false,
      author: item.author || '',
      sortOrder: 0
    })) || [];
  };

  static cleanupOldArticles = async (articles: Article[], currentFeedArticleUrls: Set<string>): Promise<Article[]> => {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const articlesToKeep = articles.filter(article => {
      // Keep article if:
      // 1. It's not read, OR
      // 2. It's newer than 48 hours, OR
      // 3. It's still present in the current feed data, OR
      // 4. It's starred or bookmarked
      return (
        !article.isRead ||
        new Date(article.publishedAt) > fortyEightHoursAgo ||
        currentFeedArticleUrls.has(article.url) ||
        article.isStarred ||
        article.isBookmarked
      );
    });

    // Delete articles that should be removed from the database
    const articlesToDelete = articles.filter(article => !articlesToKeep.includes(article));
    if (articlesToDelete.length > 0) {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const { error } = await supabase
            .from('articles')
            .delete()
            .eq('user_id', user.user.id)
            .in('id', articlesToDelete.map(a => a.id));

          if (error) {
            console.error('Error deleting old articles:', error);
          }
        }
      } catch (error) {
        console.error('Error deleting old articles:', error);
      }
    }

    return articlesToKeep;
  };
}
