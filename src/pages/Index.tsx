import { useState, useEffect } from 'react';
import { FeedSidebar } from '@/components/FeedSidebar';
import { ArticleList } from '@/components/ArticleList';
import { ArticleReader } from '@/components/ArticleReader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/rss-hero.jpg';

// Add basic error logging
console.log('Index page loading...');

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
    console.log('Loaded feeds from storage:', stored);
    return stored;
  });
  const [articles, setArticles] = useState<Article[]>(() => {
    const stored = loadFromStorage(ARTICLES_KEY, []);
    console.log('Loaded articles from storage:', stored);
    return stored;
  });
  const [selectedFeed, setSelectedFeed] = useState<string | null>('all');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

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
      // Clean up read articles older than 48 hours
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      setArticles(prev => {
        const filteredArticles = prev.filter(article => 
          !article.isRead || article.publishedAt > fortyEightHoursAgo
        );
        const removedCount = prev.length - filteredArticles.length;
        if (removedCount > 0) {
          console.log(`Cleaned up ${removedCount} old read articles`);
        }
        return filteredArticles;
      });

      if (feeds.length === 0) {
        setInitialLoading(false);
        return;
      }
      
      setIsLoading(true);
      console.log('Refreshing feeds on page load...');
      
      try {
        for (const feed of feeds) {
          try {
            const data = await fetchRSSFeed(feed.url);
            
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
                console.log(`Found ${uniqueNewArticles.length} new articles for ${feed.title}`);
                
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
          }
        }
        
        toast({
          title: "Feeds Refreshed",
          description: "Checked for new articles",
        });
      } catch (error) {
        console.error('Error refreshing feeds:', error);
      } finally {
        setIsLoading(false);
        setInitialLoading(false);
      }
    };

    initializeApp();
  }, []); // Only run on initial page load

  // Show all articles, sorted by date
  useEffect(() => {
    console.log('Showing all articles, length:', articles.length);
    
    // Sort by publishedAt date, newest first
    const sorted = [...articles].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    
    setFilteredArticles(sorted);
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
    setArticles(prev => prev.map(article => 
      article.id === articleId 
        ? { ...article, isStarred: !article.isStarred }
        : article
    ));
  };

  const handleToggleBookmark = (articleId: string) => {
    setArticles(prev => prev.map(article => 
      article.id === articleId 
        ? { ...article, isBookmarked: !article.isBookmarked }
        : article
    ));
  };

  const handleMarkAsRead = (articleId: string) => {
    setArticles(prev => prev.map(article => 
      article.id === articleId 
        ? { ...article, isRead: true }
        : article
    ));

    // Update feed unread count
    const article = articles.find(a => a.id === articleId);
    if (article && !article.isRead) {
      setFeeds(prev => prev.map(feed => 
        feed.id === article.feedId 
          ? { ...feed, unreadCount: Math.max(0, feed.unreadCount - 1) }
          : feed
      ));
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

  const selectedArticleData = articles.find(a => a.id === selectedArticle);

  console.log('Rendering Index component', { 
    feedsLength: feeds.length, 
    articlesLength: articles.length, 
    filteredArticlesLength: filteredArticles.length,
    selectedFeed,
    selectedArticle 
  });

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