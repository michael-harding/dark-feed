import { useState, useEffect } from 'react';
import { FeedSidebar } from '@/components/FeedSidebar';
import { ArticleList } from '@/components/ArticleList';
import { ArticleReader } from '@/components/ArticleReader';
import { useToast } from '@/hooks/use-toast';
import Parser from 'rss-parser';
import heroImage from '@/assets/rss-hero.jpg';

const parser = new Parser({
  customFields: {
    item: ['author', 'creator']
  }
});

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

// RSS parsing functions
const fetchRSSFeed = async (url: string): Promise<any> => {
  try {
    // Use a CORS proxy for RSS feeds
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();
    const feed = await parser.parseString(data.contents);
    return feed;
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    throw error;
  }
};

const Index = () => {
  const [feeds, setFeeds] = useState<Feed[]>(() => loadFromStorage(FEEDS_KEY, []));
  const [articles, setArticles] = useState<Article[]>(() => loadFromStorage(ARTICLES_KEY, []));
  const [selectedFeed, setSelectedFeed] = useState<string | null>('all');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Save to localStorage whenever feeds or articles change
  useEffect(() => {
    saveToStorage(FEEDS_KEY, feeds);
  }, [feeds]);

  useEffect(() => {
    saveToStorage(ARTICLES_KEY, articles);
  }, [articles]);

  // Filter articles based on selected feed
  useEffect(() => {
    if (selectedFeed === 'all') {
      setFilteredArticles(articles);
    } else if (selectedFeed === 'starred') {
      setFilteredArticles(articles.filter(article => article.isStarred));
    } else if (selectedFeed === 'bookmarks') {
      setFilteredArticles(articles.filter(article => article.isBookmarked));
    } else {
      setFilteredArticles(articles.filter(article => article.feedId === selectedFeed));
    }
  }, [selectedFeed, articles]);

  const handleAddFeed = async (url: string) => {
    setIsLoading(true);
    try {
      const feed = await fetchRSSFeed(url);
      const feedId = Date.now().toString();
      
      const newFeed: Feed = {
        id: feedId,
        title: feed.title || 'Unknown Feed',
        url,
        unreadCount: feed.items?.length || 0,
      };

      // Convert RSS items to articles
      const newArticles: Article[] = feed.items?.map((item: any, index: number) => ({
        id: `${feedId}-${index}`,
        title: item.title || 'Untitled',
        description: item.contentSnippet || item.summary || '',
        content: item.content || item.description || '',
        url: item.link || '',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        feedId,
        feedTitle: feed.title || 'Unknown Feed',
        isRead: false,
        isStarred: false,
        isBookmarked: false,
        author: item.author || item.creator || ''
      })) || [];

      setFeeds(prev => [...prev, newFeed]);
      setArticles(prev => [...prev, ...newArticles]);
      
      toast({
        title: "Feed Added",
        description: `Successfully added ${feed.title || url}`,
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

  const selectedArticleData = articles.find(a => a.id === selectedArticle);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <FeedSidebar
        feeds={feeds}
        selectedFeed={selectedFeed}
        onFeedSelect={setSelectedFeed}
        onAddFeed={handleAddFeed}
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