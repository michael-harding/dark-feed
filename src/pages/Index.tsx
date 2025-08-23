import { useState, useEffect } from 'react';
import { FeedSidebar } from '@/components/FeedSidebar';
import { ArticleList } from '@/components/ArticleList';
import { ArticleReader } from '@/components/ArticleReader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/rss-hero.jpg';


interface Feed {
  id: string;
  title: string;
  url: string;
  unreadCount: number;
  category?: string;
}

interface Article {
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

// Helper functions for localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
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

const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// RSS parsing functions using RSS2JSON API
const fetchRSSFeed = async (url: string): Promise<any> => {
  // On dev server, limit fetching to 10 minute intervals to prevent 429 errors
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const FEED_FETCH_TIMES_KEY = 'rss-feed-fetch-times';
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

const Index = () => {
  // Load from localStorage or use empty arrays as defaults
  const [feeds, setFeeds] = useState<Feed[]>(() => {
    const stored = loadFromStorage(FEEDS_KEY, []);
    return stored;
  });
  const [articles, setArticles] = useState<Article[]>(() => {
    const stored = loadFromStorage(ARTICLES_KEY, []);
    // Add sortOrder property if missing
    return stored.map((a: any, i: number) => ({ ...a, sortOrder: i }));
  });
  const [selectedFeed, setSelectedFeed] = useState<string | null>('all');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [sortMode, setSortMode] = useState<'chronological' | 'unreadOnTop'>(() => {
    const saved = localStorage.getItem('rss-sort-mode');
    return saved === 'unreadOnTop' ? 'unreadOnTop' : 'chronological';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  // Initialize accent color from localStorage immediately
  useEffect(() => {
    const saved = localStorage.getItem('rss-accent-color');
    if (saved) {
      // Parse the HSL color string (e.g., "46 87% 65%")
      const [hue, saturation, lightness] = saved.split(' ');
      const h = parseInt(hue);
      const s = parseInt(saturation.replace('%', ''));
      const l = parseInt(lightness.replace('%', ''));

      // Update main accent color
      document.documentElement.style.setProperty('--accent', saved);
      document.documentElement.style.setProperty('--ring', saved);
      document.documentElement.style.setProperty('--feed-unread', saved);

      // Generate and update all accent shades
      const shades = [
        { name: '50', lightness: Math.min(95, l + 30) },
        { name: '100', lightness: Math.min(90, l + 25) },
        { name: '200', lightness: Math.min(85, l + 20) },
        { name: '300', lightness: Math.min(80, l + 15) },
        { name: '400', lightness: Math.min(75, l + 10) },
        { name: '500', lightness: l }, // Default
        { name: '600', lightness: Math.max(10, l - 10) },
        { name: '700', lightness: Math.max(15, l - 20) },
        { name: '800', lightness: Math.max(20, l - 30) },
        { name: '900', lightness: Math.max(25, l - 40) },
        { name: '950', lightness: Math.max(15, l - 50) },
      ];

      shades.forEach(shade => {
        const shadeColor = `${h} ${s}% ${shade.lightness}%`;
        document.documentElement.style.setProperty(`--accent-${shade.name}`, shadeColor);
      });

      // Update favicon color on page load
      import('@/utils/faviconGenerator').then(({ faviconGenerator }) => {
        faviconGenerator.generateAndUpdateFavicon(saved);
      });
    }
  }, []);

  // Save to localStorage whenever feeds or articles change
  useEffect(() => {
    saveToStorage(FEEDS_KEY, feeds);
  }, [feeds]);

  useEffect(() => {
    saveToStorage(ARTICLES_KEY, articles);
  }, [articles]);

  // Clean up old read articles and refresh feeds on page load
  useEffect(() => {
    const initializeApp = async () => {
      if (feeds.length === 0) {
        setInitialLoading(false);
        return;
      }

      setIsLoading(true);

      const currentFeedArticleUrls = new Set<string>();

      try {
        // First, refresh feeds and collect current article URLs
        for (const feed of feeds) {
          try {
            const data = await fetchRSSFeed(feed.url);

            // Collect URLs of current articles in the feed
            data.items?.forEach((item: any) => {
              if (item.link) {
                currentFeedArticleUrls.add(item.link);
              }
            });

            // Convert RSS items to articles
            const newArticles: Article[] = data.items?.map((item: any, index: number) => ({
              id: `${feed.id}-${Date.now()}-${index}`,
              title: item.title || 'Untitled',
              description: item.description?.replace(/<[^>]*>/g, '') || '',
              content: item.content || item.description || '',
              url: item.link || '',
              publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
              feedId: feed.id,
              feedTitle: feed.title,
              isRead: false,
              isStarred: false,
              isBookmarked: false,
              author: item.author || ''
            })) || [];

            // Filter out articles that already exist (by URL)
            setArticles(prev => {
              const existingUrls = prev.map(a => a.url);
              const uniqueNewArticles = newArticles.filter(article => !existingUrls.includes(article.url));

              if (uniqueNewArticles.length > 0) {
                toast({
                  title: 'New Articles',
                  description: `Found ${uniqueNewArticles.length} new articles for ${feed.title}`,
                });

                // Update feed unread count
                setFeeds(prevFeeds => prevFeeds.map(f =>
                  f.id === feed.id
                    ? { ...f, unreadCount: f.unreadCount + uniqueNewArticles.length }
                    : f
                ));

                return [...prev, ...uniqueNewArticles];
              }

              return prev;
            });
          } catch (error) {
            console.error(`Failed to refresh feed ${feed.title}:`, error);
            toast({
              title: 'Feed Refresh Error',
              description: `${feed.title}: ${String(error)}`,
              variant: 'destructive',
            });
          }
        }

        // After refreshing all feeds, clean up read articles older than 48 hours
        // that are no longer present in any feed
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        setArticles(prev => {
          const filteredArticles = prev.filter(article => {
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

          const removedCount = prev.length - filteredArticles.length;
          if (removedCount > 0) {
            toast({
              title: 'Cleanup',
              description: `Cleaned up ${removedCount} old read articles that are no longer in feeds`,
            });
          }
          return filteredArticles;
        });

        toast({
          title: "Feeds Refreshed",
          description: "Checked for new articles",
        });
      } catch (error) {
        console.error('Error refreshing feeds:', error);
        toast({
          title: 'Feeds Refresh Error',
          description: String(error),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setInitialLoading(false);
      }
    };

    initializeApp();
  }, []); // Only run on initial page load

  // Filter articles based on selected feed
  // Helper to set sortOrder for articles
  const setSortOrderForArticles = (articles: Article[], mode: 'chronological' | 'unreadOnTop') => {
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

  useEffect(() => {
    let filtered: Article[] = [];
    if (selectedFeed === 'all') {
      filtered = articles;
    } else if (selectedFeed === 'starred') {
      filtered = articles.filter(article => article.isStarred);
    } else if (selectedFeed === 'bookmarks') {
      filtered = articles.filter(article => article.isBookmarked);
    } else {
      filtered = articles.filter(article => article.feedId === selectedFeed);
    }

    // Set sortOrder for filtered articles
    const withOrder = setSortOrderForArticles(filtered, sortMode);
    setFilteredArticles(withOrder);
  }, [selectedFeed, sortMode]);


  useEffect(() => {
    // When articles change, sort by sortOrder
    setFilteredArticles(prev => [...prev].sort((a, b) => a.sortOrder - b.sortOrder));
  }, [articles]);


  const handleAddFeed = async (url: string) => {
    setIsLoading(true);
    try {
      const data = await fetchRSSFeed(url);
      const feedId = Date.now().toString();

      const newFeed: Feed = {
        id: feedId,
        title: data.feed?.title || 'Unknown Feed',
        url,
        unreadCount: data.items?.length || 0,
      };

      // Convert RSS items to articles
      const newArticles: Article[] = data.items?.map((item: any, index: number) => ({
        id: `${feedId}-${index}`,
        title: item.title || 'Untitled',
        description: item.description?.replace(/<[^>]*>/g, '') || '', // Strip HTML tags
        content: item.content || item.description || '',
        url: item.link || '',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        feedId,
        feedTitle: data.feed?.title || 'Unknown Feed',
        isRead: false,
        isStarred: false,
        isBookmarked: false,
        author: item.author || ''
      })) || [];

      setFeeds(prev => [...prev, newFeed]);
      setArticles(prev => [...prev, ...newArticles]);

      toast({
        title: "Feed Added",
        description: `Successfully added ${data.feed?.title || url}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add RSS feed. Please check the URL.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStar = (articleId: string) => {
    const updateFunc = prev => prev.map(article =>
      article.id === articleId
        ? { ...article, isStarred: !article.isStarred }
        : article
    );

    setArticles(updateFunc);
    setFilteredArticles(updateFunc);
  };

  const handleToggleBookmark = (articleId: string) => {
    const updateFunc = prev => prev.map(article =>
      article.id === articleId
        ? { ...article, isBookmarked: !article.isBookmarked }
        : article
    );

    setArticles(updateFunc);
    setFilteredArticles(updateFunc);
  };

  const handleMarkAsRead = (articleId: string) => {
    const updateFunc = (prev => prev.map(article => article.id === articleId
        ? { ...article, isRead: !article.isRead }
        : article
    ));

    setArticles(updateFunc);
    setFilteredArticles(updateFunc);

    // Update feed unread count
    const article = articles.find(a => a.id === articleId);
    if (article) {
      setFeeds(prev => prev.map(feed => {
        if (feed.id === article.feedId) {
          const delta = article.isRead ? 1 : -1;
          return { ...feed, unreadCount: Math.max(0, feed.unreadCount + delta) };
        }
        return feed;
      }));
    }
  };

  const handleImportFeeds = (importedFeeds: Feed[]) => {
    // Filter out feeds that already exist (by URL)
    const existingUrls = feeds.map(f => f.url);
    const newFeeds = importedFeeds.filter(feed => !existingUrls.includes(feed.url));

    if (newFeeds.length === 0) {
      toast({
        title: "No New Feeds",
        description: "All feeds in the import file already exist.",
      });
      return;
    }

    // Add the new feeds
    setFeeds(prev => [...prev, ...newFeeds]);

    toast({
      title: "Feeds Imported",
      description: `Successfully imported ${newFeeds.length} new feed(s).`,
    });
  };

  const handleRemoveFeed = (feedId: string) => {
    // Remove the feed
    setFeeds(prev => prev.filter(feed => feed.id !== feedId));

    // Remove all articles from this feed
    setArticles(prev => prev.filter(article => article.feedId !== feedId));

    // If the removed feed was selected, switch to "all"
    if (selectedFeed === feedId) {
      setSelectedFeed('all');
    }

    toast({
      title: "Feed Removed",
      description: "Feed and its articles have been removed.",
    });
  };

  const handleReorderFeeds = (reorderedFeeds: Feed[]) => {
    setFeeds(reorderedFeeds);
    toast({
      title: "Feeds Reordered",
      description: "Feed order has been updated.",
    });
  };

  const handleRenameFeed = (feedId: string, newTitle: string) => {
    setFeeds(prev => prev.map(feed =>
      feed.id === feedId
        ? { ...feed, title: newTitle }
        : feed
    ));

    // Also update the feedTitle in all articles from this feed
    setArticles(prev => prev.map(article =>
      article.feedId === feedId
        ? { ...article, feedTitle: newTitle }
        : article
    ));

    toast({
      title: "Feed Renamed",
      description: `Feed renamed to "${newTitle}".`,
    });
  };

  const handleMarkAllAsRead = (feedId: string) => {
    // Mark all articles from this feed as read
    setArticles(prev => prev.map(article =>
      article.feedId === feedId && !article.isRead
        ? { ...article, isRead: true }
        : article
    ));

    // Reset the feed's unread count to 0
    setFeeds(prev => prev.map(feed =>
      feed.id === feedId
        ? { ...feed, unreadCount: 0 }
        : feed
    ));

    const feed = feeds.find(f => f.id === feedId);
    toast({
      title: "Articles Marked as Read",
      description: `All articles in "${feed?.title}" have been marked as read.`,
    });
  };

  const selectedArticleData = articles.find(a => a.id === selectedArticle);

  if (initialLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading feeds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Debug info when no feeds exist */}
      {feeds.length === 0 && (
        <div className="absolute top-4 left-4 z-50 bg-yellow-100 text-yellow-800 p-2 rounded text-sm">
          No feeds loaded. Add a feed to get started!
        </div>
      )}
      {/* Sidebar */}
      <FeedSidebar
        feeds={feeds}
        selectedFeed={selectedFeed}
        onFeedSelect={setSelectedFeed}
        onAddFeed={handleAddFeed}
        onImportFeeds={handleImportFeeds}
        onRemoveFeed={handleRemoveFeed}
        onRenameFeed={handleRenameFeed}
        onMarkAllAsRead={handleMarkAllAsRead}
        onReorderFeeds={handleReorderFeeds}
        isLoading={isLoading}
      />

      {/* Article List */}
      <ArticleList
        articles={filteredArticles}
        selectedArticle={selectedArticle}
        onArticleSelect={setSelectedArticle}
        onToggleStar={handleToggleStar}
        onToggleBookmark={handleToggleBookmark}
        onMarkAsRead={handleMarkAsRead}
        sortMode={sortMode}
        onToggleSortMode={() => {
          setSortMode(m => {
            const newMode = m === 'chronological' ? 'unreadOnTop' : 'chronological';
            localStorage.setItem('rss-sort-mode', newMode);
            // Update sortOrder for all articles
            setArticles(prev => setSortOrderForArticles(prev, newMode));
            return newMode;
          });
        }}
      />

      {/* Article Reader */}
      <ArticleReader
        article={selectedArticleData || null}
        onToggleStar={handleToggleStar}
        onToggleBookmark={handleToggleBookmark}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
};

export default Index;