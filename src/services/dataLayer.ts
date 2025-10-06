// Centralized data access layer
import { supabase } from '@/integrations/supabase/client';

export interface Feed {
  id: string;
  title: string;
  url: string;
  unreadCount: number;
  category?: string;
  fetchTime?: string;
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


export class DataLayer {
  // User cache to reduce preflight requests
  private static userCache: { user: { data: { user: { id: string } } }; timestamp: number } | null = null;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Profile/settings cache to reduce duplicate profile requests
  private static profileCache: { sortMode: string; accentColor: string; timestamp: number } | null = null;
  private static profilePromise: Promise<{ sortMode: string; accentColor: string }> | null = null;

  // User profile cache for profiles table
  private static userProfileCache: { profile: { id: string; user_id: string; display_name: string | null; created_at: string; updated_at: string }; timestamp: number } | null = null;

  private static getCachedUser = async () => {
    const now = Date.now();

    // Return cached user if still valid
    if (DataLayer.userCache && (now - DataLayer.userCache.timestamp) < DataLayer.CACHE_TTL) {
      return DataLayer.userCache.user;
    }

    // Fetch fresh user data and cache it
    const userData = await supabase.auth.getUser();
    DataLayer.userCache = {
      user: userData,
      timestamp: now
    };

    return userData;
  };

  private static clearUserCache = () => {
    DataLayer.userCache = null;
    DataLayer.clearUserProfileCache();
  };

  private static ensureProfileLoaded = async () => {
    const now = Date.now();

    // Return cached profile if still valid
    if (DataLayer.profileCache && (now - DataLayer.profileCache.timestamp) < DataLayer.CACHE_TTL) {
      return DataLayer.profileCache;
    }

    // If already fetching, wait for that promise
    if (DataLayer.profilePromise) {
      return await DataLayer.profilePromise;
    }

    // Fetch fresh profile data and cache it
    DataLayer.profilePromise = (async () => {
      try {
        const { data: user } = await DataLayer.getCachedUser();
        if (!user.user) {
          const defaultData = { sortMode: 'chronological', accentColor: '46 87% 65%' };
          DataLayer.profileCache = { ...defaultData, timestamp: now };
          return defaultData;
        }

        const { data, error } = await supabase
          .from('user_settings')
          .select('sort_mode, accent_color')
          .eq('user_id', user.user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No settings exist, create default settings
            await DataLayer.createDefaultSettings();
            const defaultData = { sortMode: 'chronological', accentColor: '46 87% 65%' };
            DataLayer.profileCache = { ...defaultData, timestamp: now };
            return defaultData;
          }
          console.error('Error loading profile:', error);
          const defaultData = { sortMode: 'chronological', accentColor: '46 87% 65%' };
          DataLayer.profileCache = { ...defaultData, timestamp: now };
          return defaultData;
        }

        const profileData = {
          sortMode: (data?.sort_mode as 'chronological' | 'unreadOnTop') || 'chronological',
          accentColor: data?.accent_color || '46 87% 65%'
        };

        DataLayer.profileCache = { ...profileData, timestamp: now };
        return profileData;
      } catch (error) {
        console.error('Error loading profile:', error);
        const defaultData = { sortMode: 'chronological', accentColor: '46 87% 65%' };
        DataLayer.profileCache = { ...defaultData, timestamp: now };
        return defaultData;
      } finally {
        DataLayer.profilePromise = null;
      }
    })();

    return await DataLayer.profilePromise;
  };

  private static getCachedProfileData = () => {
    if (!DataLayer.profileCache) {
      throw new Error('Profile data not loaded yet. Call ensureProfileLoaded() first.');
    }
    return DataLayer.profileCache;
  };

  // Public method to load all profile data at once
  static loadAllProfileData = async (): Promise<{ sortMode: 'chronological' | 'unreadOnTop'; accentColor: string }> => {
    await DataLayer.ensureProfileLoaded();
    const profile = DataLayer.getCachedProfileData();
    return { sortMode: profile.sortMode as 'chronological' | 'unreadOnTop', accentColor: profile.accentColor };
  };

  private static updateCachedProfile = (updates: { sortMode?: string; accentColor?: string }) => {
    if (DataLayer.profileCache) {
      if (updates.sortMode !== undefined) {
        DataLayer.profileCache.sortMode = updates.sortMode;
      }
      if (updates.accentColor !== undefined) {
        DataLayer.profileCache.accentColor = updates.accentColor;
      }
      DataLayer.profileCache.timestamp = Date.now();
    }
  };

  private static clearProfileCache = () => {
    DataLayer.profileCache = null;
    DataLayer.profilePromise = null;
  };

  private static clearUserProfileCache = () => {
    DataLayer.userProfileCache = null;
  };

  // User profile operations
  static loadUserProfile = async (userId: string) => {
    const now = Date.now();

    // Return cached profile if still valid
    if (DataLayer.userProfileCache && (now - DataLayer.userProfileCache.timestamp) < DataLayer.CACHE_TTL) {
      return DataLayer.userProfileCache.profile;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.error('Error loading user profile:', error);
        return null;
      }

      if (!data || data.length === 0) {
        // No profile found for this user
        return null;
      }

      const profile = data[0];
      DataLayer.userProfileCache = {
        profile: profile,
        timestamp: now
      };

      return profile;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  static createUserProfile = async (userId: string, displayName?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          display_name: displayName || null,
        })
        .select()
        .limit(1);

      if (error) {
        console.error('Error creating user profile:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.error('No profile returned after creation');
        return null;
      }

      const profile = data[0];
      // Cache the newly created profile
      DataLayer.userProfileCache = {
        profile: profile,
        timestamp: Date.now()
      };

      return profile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  };

  // Feed operations
  static loadFeeds = async (): Promise<Feed[]> => {
    try {
      const { data: user } = await DataLayer.getCachedUser();
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
        category: feed.category,
        fetchTime: feed.fetch_time ? feed.fetch_time + 'Z' : feed.fetch_time
      }));
    } catch (error) {
      console.error('Error loading feeds:', error);
      return [];
    }
  };

  static saveFeeds = async (feeds: Feed[]): Promise<void> => {
    try {
      const { data: user } = await DataLayer.getCachedUser();
      if (!user.user) return;

      // For simplicity, we'll handle this through individual feed operations
      // This method is mainly used for reordering, which we'll handle differently
    } catch (error) {
      console.error('Error saving feeds:', error);
    }
  };

  static saveFeed = async (feed: Feed, fieldsToUpdate?: (keyof Feed)[]): Promise<void> => {
    try {
      const { data: user } = await DataLayer.getCachedUser();
      if (!user.user) return;

      // If no specific fields are specified, update all fields (backward compatibility)
      const fields = fieldsToUpdate || ['id', 'title', 'url', 'unreadCount', 'category', 'fetchTime'];

      // Build the update object with only the specified fields
      const updateData: any = {
        id: feed.id,
        user_id: user.user.id,
        url: feed.url,
        title: feed.title,
      };

      // if (fields.includes('title')) updateData.title = feed.title;
      if (fields.includes('unreadCount')) updateData.unread_count = feed.unreadCount;
      if (fields.includes('category')) updateData.category = feed.category;
      if (fields.includes('fetchTime')) updateData.fetch_time = feed.fetchTime;

      const { error } = await supabase
        .from('feeds')
        .upsert(updateData);

      if (error) {
        console.error('Error saving feed:', error);
      }
    } catch (error) {
      console.error('Error saving feed:', error);
    }
  };

  static deleteFeed = async (feedId: string): Promise<void> => {
    try {
      const { data: user } = await DataLayer.getCachedUser();
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

  static getFeedByUrl = async (url: string): Promise<Feed | null> => {
    try {
      const { data: user } = await DataLayer.getCachedUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from('feeds')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('url', url)
        .limit(1);

      if (error) {
        console.error('Error getting feed by URL:', error);
        return null;
      }

      if (!data || data.length === 0) {
        // No feed found with this URL
        return null;
      }

      const feed = data[0];
      return {
        id: feed.id,
        title: feed.title,
        url: feed.url,
        unreadCount: feed.unread_count,
        category: feed.category,
        fetchTime: feed.fetch_time ? feed.fetch_time + 'Z' : feed.fetch_time
      };
    } catch (error) {
      console.error('Error getting feed by URL:', error);
      return null;
    }
  };

  // Article operations
  static loadArticles = async (): Promise<Article[]> => {
    try {
      const { data: user } = await DataLayer.getCachedUser();
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
      const { data: user } = await DataLayer.getCachedUser();
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
      const { data: user } = await DataLayer.getCachedUser();
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
      const { data: user } = await DataLayer.getCachedUser();
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
      await DataLayer.ensureProfileLoaded();
      const profile = DataLayer.getCachedProfileData();
      return profile.sortMode as 'chronological' | 'unreadOnTop';
    } catch (error) {
      console.error('Error loading sort mode:', error);
      return 'chronological';
    }
  };

  static saveSortMode = async (mode: 'chronological' | 'unreadOnTop'): Promise<void> => {
    try {
      const { data: user } = await DataLayer.getCachedUser();
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
      } else {
        // Update cache immediately
        DataLayer.updateCachedProfile({ sortMode: mode });
      }
    } catch (error) {
      console.error('Error saving sort mode:', error);
    }
  };

  static loadAccentColor = async (): Promise<string> => {
    try {
      await DataLayer.ensureProfileLoaded();
      const profile = DataLayer.getCachedProfileData();
      return profile.accentColor;
    } catch (error) {
      console.error('Error loading accent color:', error);
      return '46 87% 65%';
    }
  };

  static saveAccentColor = async (color: string): Promise<void> => {
    try {
      const { data: user } = await DataLayer.getCachedUser();
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
      } else {
        // Update cache immediately
        DataLayer.updateCachedProfile({ accentColor: color });
      }
    } catch (error) {
      console.error('Error saving accent color:', error);
    }
  };

  static createDefaultSettings = async (): Promise<void> => {
    try {
      const { data: user } = await DataLayer.getCachedUser();
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
      } else {
        // Update cache with default values
        DataLayer.updateCachedProfile({ sortMode: 'chronological', accentColor: '46 87% 65%' });
      }
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  // RSS fetching
  static fetchRSSFeed = async (url: string): Promise<{ status: string; feed: { title: string }; items: unknown[] }> => {
    // limit fetching to 3 minute intervals to limit data usage and prevent 429 errors
    const feed = await DataLayer.getFeedByUrl(url);
    const now = Date.now();
    const threeMinutes = 0 * 60 * 1000;

    if (feed && feed.fetchTime) {
      const lastFetch = new Date(feed.fetchTime).getTime();

      if (now - lastFetch < threeMinutes) {
        console.log(`RSS feed for ${url} was fetched less than 3 minutes ago`);
        return {
          status: 'skipped',
          feed: { title: 'Feed (skipped)' },
          items: []
        };
      }
    }

    try {
      const feedTimeFilter = feed?.fetchTime ? `&date=${feed.fetchTime.split('T')[0]}` : '';
      const apiUrl = `https://dark-feed-worker.two-852.workers.dev/?url=${encodeURIComponent(url)}${feedTimeFilter}`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'ok') {
        throw new Error(data.message || 'Failed to parse RSS feed');
      }

      // Transform the API response to match the expected format
      // The API returns { title, description, items } but we need { feed: { title }, items }
      const feedTitle = data.title || DataLayer.extractTitleFromUrl(url) || 'Unknown Feed';
      const transformedData = {
        status: data.status,
        feed: { title: feedTitle },
        items: data.items || []
      };

      // Update fetch time in database after successful fetch
      if (feed) {
        const updatedFeed: Feed = {
          ...feed,
          fetchTime: new Date().toISOString()
        };
        await DataLayer.saveFeed(updatedFeed, ['fetchTime']);
      }

      return transformedData;
    } catch (error) {
      console.error('Error fetching RSS feed:', error);
      throw error;
    }
  };

  // Business logic helpers
  static setSortOrderForArticles = (articles: Article[], mode: 'chronological' | 'unreadOnTop'): Article[] => {
    const sorted = [...articles];
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

  static createArticlesFromRSSData = (data: { items?: unknown[] }, feedId: string, feedTitle: string): Article[] => {
    return data.items?.map((item: unknown, index: number) => {
      const rssItem = item as { title?: string; description?: string; content?: string; link?: string; pubDate?: string; author?: string };
      return {
        id: crypto.randomUUID(),
        title: rssItem.title || 'Untitled',
        description: rssItem.description?.replace(/<[^>]*>/g, '') || '',
        content: rssItem.content || rssItem.description || '',
        url: rssItem.link || '',
        publishedAt: rssItem.pubDate ? new Date(rssItem.pubDate).toISOString() : new Date().toISOString(),
        feedId,
        feedTitle,
        isRead: false,
        isStarred: false,
        isBookmarked: false,
        author: rssItem.author || '',
        sortOrder: 0
      };
    }) || [];
  };


  // New cleanup method that deletes articles older than the earliest article date for a specific feed
  static cleanupArticlesByEarliestDate = async (feedId: string, newArticles: Article[]): Promise<void> => {
    try {
      const { data: user } = await DataLayer.getCachedUser();
      if (!user.user) return;

      // Get the earliest (oldest) article date from the newly fetched articles
      if (newArticles.length === 0) return;

      const earliestDate = new Date(
        Math.min(...newArticles.map(article => new Date(article.publishedAt).getTime()))
      );

      console.log(`Cleaning up articles for feed ${feedId} older than ${earliestDate.toISOString()}`);

      // First count how many articles match the criteria
      const { count: matchCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user.id)
        .eq('feed_id', feedId)
        .lt('published_at', earliestDate.toISOString())
        .eq('is_read', true)
        .eq('is_starred', false)
        .eq('is_bookmarked', false);

      console.log(`Found ${matchCount} articles matching deletion criteria`);

      // Delete all articles for this feed that are older than the earliest article date
      // BUT preserve articles that are unread, starred, or bookmarked
      const { error, count } = await supabase
        .from('articles')
        .delete({ count: 'exact' })
        .eq('user_id', user.user.id)
        .eq('feed_id', feedId)
        .lt('published_at', earliestDate.toISOString())
        .eq('is_read', true)  // Only delete articles that have been read
        .eq('is_starred', false)  // Don't delete starred articles
        .eq('is_bookmarked', false);  // Don't delete bookmarked articles

      if (error) {
        console.error('Error deleting articles older than earliest date:', error);
        console.error('Full error details:', JSON.stringify(error));
      } else {
        console.log(`Successfully deleted ${count} articles for feed ${feedId}`);
      }
    } catch (error) {
      console.error('Error in cleanupArticlesByEarliestDate:', error);
    }
  };

  // Helper method to extract a title from URL when RSS feed doesn't have one
  static extractTitleFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Remove www. prefix if present
      const domain = hostname.replace(/^www\./, '');

      // Split by dots and take the main domain name
      const parts = domain.split('.');
      if (parts.length >= 2) {
        // For domains like techcrunch.com, take the first part
        // For domains like news.google.com, take the second part (google)
        if (parts.length === 2) {
          return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        } else if (parts.length === 3 && parts[1].length <= 3) {
          // Handle cases like news.google.com -> Google
          return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        } else {
          // For longer domains, take the first meaningful part
          return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        }
      }

      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch (error) {
      console.error('Error extracting title from URL:', error);
      return null;
    }
  };
}
