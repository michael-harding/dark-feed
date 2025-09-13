// Centralized data access layer
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
  publishedAt: Date;
  feedId: string;
  feedTitle: string;
  isRead: boolean;
  isStarred: boolean;
  isBookmarked: boolean;
  author?: string;
  sortOrder: number;
}

// Local storage keys
const FEEDS_KEY = 'rss-reader-feeds';
const ARTICLES_KEY = 'rss-reader-articles';
const FEED_FETCH_TIMES_KEY = 'rss-feed-fetch-times';
const SORT_MODE_KEY = 'rss-sort-mode';
const ACCENT_COLOR_KEY = 'rss-accent-color';

export class DataLayer {
  // Local storage operations
  static loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects for articles
        if (key === ARTICLES_KEY && Array.isArray(parsed)) {
          return parsed.map(article => ({
            ...article,
            publishedAt: new Date(article.publishedAt)
          })) as T;
        }
        return parsed;
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
    return defaultValue;
  };

  static saveToStorage = <T,>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };

  // Feed operations
  static loadFeeds = (): Feed[] => {
    return DataLayer.loadFromStorage(FEEDS_KEY, []);
  };

  static saveFeeds = (feeds: Feed[]): void => {
    DataLayer.saveToStorage(FEEDS_KEY, feeds);
  };

  // Article operations
  static loadArticles = (): Article[] => {
    const stored = DataLayer.loadFromStorage(ARTICLES_KEY, []);
    // Add sortOrder property if missing
    return stored.map((a: any, i: number) => ({ ...a, sortOrder: i }));
  };

  static saveArticles = (articles: Article[]): void => {
    DataLayer.saveToStorage(ARTICLES_KEY, articles);
  };

  // Settings operations
  static loadSortMode = (): 'chronological' | 'unreadOnTop' => {
    const saved = localStorage.getItem(SORT_MODE_KEY);
    return saved === 'unreadOnTop' ? 'unreadOnTop' : 'chronological';
  };

  static saveSortMode = (mode: 'chronological' | 'unreadOnTop'): void => {
    localStorage.setItem(SORT_MODE_KEY, mode);
  };

  static loadAccentColor = (): string => {
    return localStorage.getItem(ACCENT_COLOR_KEY) || '46 87% 65%';
  };

  static saveAccentColor = (color: string): void => {
    localStorage.setItem(ACCENT_COLOR_KEY, color);
  };

  // RSS fetching
  static fetchRSSFeed = async (url: string): Promise<any> => {
    // On dev server, limit fetching to 10 minute intervals to prevent 429 errors
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      let fetchTimes: Record<string, number> = {};
      try {
        fetchTimes = JSON.parse(localStorage.getItem(FEED_FETCH_TIMES_KEY) || '{}');
      } catch {}
      const now = Date.now();
      const lastFetch = fetchTimes[url] || 0;
      const tenMinutes = 10 * 60 * 1000;
      if (now - lastFetch < tenMinutes) {
        console.warn(`RSS feed for ${url} was fetched less than 10 minutes ago. Skipping fetch on dev server to prevent 429 errors`);
        return {
          status: 'skipped',
          feed: { title: 'Development Feed (skipped)' },
          items: []
        };
      }
      fetchTimes[url] = now;
      localStorage.setItem(FEED_FETCH_TIMES_KEY, JSON.stringify(fetchTimes));
    }
    
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
      sorted.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    } else {
      sorted.sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return b.publishedAt.getTime() - a.publishedAt.getTime();
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
      id: `${feedId}-${Date.now()}-${index}`,
      title: item.title || 'Untitled',
      description: item.description?.replace(/<[^>]*>/g, '') || '',
      content: item.content || item.description || '',
      url: item.link || '',
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      feedId,
      feedTitle,
      isRead: false,
      isStarred: false,
      isBookmarked: false,
      author: item.author || '',
      sortOrder: 0
    })) || [];
  };

  static cleanupOldArticles = (articles: Article[], currentFeedArticleUrls: Set<string>): Article[] => {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    return articles.filter(article => {
      // Keep article if:
      // 1. It's not read, OR
      // 2. It's newer than 48 hours, OR
      // 3. It's still present in the current feed data, OR
      // 4. It's starred or bookmarked
      return (
        !article.isRead ||
        article.publishedAt > fortyEightHoursAgo ||
        currentFeedArticleUrls.has(article.url) ||
        article.isStarred ||
        article.isBookmarked
      );
    });
  };
}
