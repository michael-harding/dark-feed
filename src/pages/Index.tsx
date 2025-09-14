import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedSidebar } from '@/components/FeedSidebar';
import { ArticleList } from '@/components/ArticleList';
import { ArticleReader } from '@/components/ArticleReader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addFeed,
  refreshAllFeeds,
  removeFeed,
  renameFeed,
  reorderFeeds,
  updateFeedUnreadCount,
  importFeeds,
  setFeedUnreadCount,
  markAllAsRead,
} from '@/store/slices/feedsSlice';
import {
  toggleStar,
  toggleBookmark,
  markAsRead,
  removeArticlesByFeed,
  updateArticlesFeedTitle,
  markAllAsReadForFeed,
  updateFilteredArticles,
  cleanupOldArticles,
} from '@/store/slices/articlesSlice';
import {
  selectFeed,
  selectArticle,
  toggleSortMode,
  setAccentColor,
  setInitialLoading,
} from '@/store/slices/uiSlice';
import { Feed } from '@/services/dataLayer';
import heroImage from '@/assets/rss-hero.jpg';

const Index = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Redux state
  const { feeds, isLoading } = useAppSelector((state) => state.feeds);
  const { articles, filteredArticles } = useAppSelector((state) => state.articles);
  const {
    selectedFeed,
    selectedArticle,
    sortMode,
    accentColor,
    initialLoading
  } = useAppSelector((state) => state.ui);

  // Initialize accent color from Redux state
  useEffect(() => {
    if (accentColor) {
      // Parse the HSL color string (e.g., "46 87% 65%")
      const [hue, saturation, lightness] = accentColor.split(' ');
      const h = parseInt(hue);
      const s = parseInt(saturation.replace('%', ''));
      const l = parseInt(lightness.replace('%', ''));

      // Update main accent color
      document.documentElement.style.setProperty('--accent', accentColor);
      document.documentElement.style.setProperty('--ring', accentColor);
      document.documentElement.style.setProperty('--feed-unread', accentColor);

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
        faviconGenerator.generateAndUpdateFavicon(accentColor);
      });
    }
  }, [accentColor]);

  // Update filtered articles when selectedFeed or sortMode changes (stable on read toggles)
  useEffect(() => {
    dispatch(updateFilteredArticles({ selectedFeed, sortMode }));
  }, [dispatch, selectedFeed, sortMode]);

  // Clean up old read articles and refresh feeds on page load
  useEffect(() => {
    const initializeApp = async () => {
      if (feeds.length === 0) {
        dispatch(setInitialLoading(false));
        return;
      }

      try {
        // Step 1: Verify and correct all existing unread counts
        feeds.forEach(feed => {
          const feedArticles = articles.filter(a => a.feedId === feed.id);
          const actualUnreadCount = feedArticles.filter(a => !a.isRead).length;

          if (actualUnreadCount !== feed.unreadCount) {
            console.log(`Correcting unread count for ${feed.title}: ${feed.unreadCount} -> ${actualUnreadCount}`);
            dispatch(setFeedUnreadCount({ feedId: feed.id, count: actualUnreadCount }));
          }
        });

        // Step 2: Collect all current article URLs per feed before refresh
        const allCurrentUrlsByFeed = new Map<string, Set<string>>();
        feeds.forEach(feed => {
          const feedArticles = articles.filter(a => a.feedId === feed.id);
          const urls = new Set(feedArticles.map(a => a.url));
          allCurrentUrlsByFeed.set(feed.id, urls);
        });

        // Step 3: Refresh all feeds
        const result = await dispatch(refreshAllFeeds(feeds)).unwrap();

        // Step 4: After refresh, collect updated URLs (existing + new)
        const updatedFeedArticleUrls = new Set<string>();
        result.forEach(({ newArticles, feed, error }) => {
          if (error) {
            console.error(`Failed to refresh feed ${feed.title}:`, error);
            toast({
              title: 'Feed Refresh Error',
              description: `${feed.title}: ${error}`,
              variant: 'destructive',
            });
          } else {
            // Add all current URLs for this feed (from before) plus new ones
            const currentUrls = allCurrentUrlsByFeed.get(feed.id) || new Set();
            newArticles.forEach(article => {
              if (article.url) {
                currentUrls.add(article.url);
              }
            });
            currentUrls.forEach(url => updatedFeedArticleUrls.add(url));

            // Update feed unread count for new articles
            if (newArticles.length > 0) {
              dispatch(updateFeedUnreadCount({ feedId: feed.id, delta: newArticles.length }));
              toast({
                title: 'New Articles',
                description: `Found ${newArticles.length} new articles for ${feed.title}`,
              });
            }
          }
        });

        // Step 5: Clean up old articles using full current URLs
        dispatch(cleanupOldArticles(updatedFeedArticleUrls));

        // Step 6: Final verification of all unread counts after cleanup
        feeds.forEach(feed => {
          const feedArticles = articles.filter(a => a.feedId === feed.id);
          const actualUnreadCount = feedArticles.filter(a => !a.isRead).length;

          if (actualUnreadCount !== feed.unreadCount) {
            console.log(`Final correction for ${feed.title}: ${feed.unreadCount} -> ${actualUnreadCount}`);
            dispatch(setFeedUnreadCount({ feedId: feed.id, count: actualUnreadCount }));
          }
        });

        // Step 7: Update filtered articles after refresh (to include new ones)
        dispatch(updateFilteredArticles({ selectedFeed, sortMode }));

        toast({
          title: "Feeds Refreshed & Verified",
          description: "Checked for new articles and corrected unread counts",
        });
      } catch (error) {
        console.error('Error refreshing feeds:', error);
        toast({
          title: 'Feeds Refresh Error',
          description: String(error),
          variant: 'destructive',
        });
      } finally {
        dispatch(setInitialLoading(false));
      }
    };

    initializeApp();
  }, []); // Only run on initial page load

  // Handlers
  const handleAddFeed = async (url: string) => {
    try {
      const result = await dispatch(addFeed(url)).unwrap();
      // Update filtered articles to include new feed's articles
      dispatch(updateFilteredArticles({ selectedFeed, sortMode }));
      toast({
        title: "Feed Added",
        description: `Successfully added ${result.feed.title}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add RSS feed. Please check the URL.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStar = (articleId: string) => {
    dispatch(toggleStar(articleId));
  };

  const handleToggleBookmark = (articleId: string) => {
    dispatch(toggleBookmark(articleId));
  };

  const handleMarkAsRead = (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (article) {
      dispatch(markAsRead(articleId));
      // Update feed unread count
      const delta = article.isRead ? 1 : -1;
      dispatch(updateFeedUnreadCount({ feedId: article.feedId, delta }));
    }
  };

  const handleImportFeeds = async (importedFeeds: Feed[]) => {
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

    try {
      const results = await dispatch(importFeeds(newFeeds)).unwrap();

      // Get current articles state to calculate existing articles
      const currentArticles = articles;

      // Separate successful and failed imports
      const successfulResults = results.filter(result => !result.error);
      const failedResults = results.filter(result => result.error);

      // Calculate correct unread counts for imported feeds
      successfulResults.forEach(({ articles: newArticles, feed }) => {
        if (newArticles.length > 0) {
          // Get all articles for this feed (existing + new)
          const existingFeedArticles = currentArticles.filter(a => a.feedId === feed.id);
          const newFeedArticles = newArticles.filter(a => a.feedId === feed.id);
          const allFeedArticles = [...existingFeedArticles, ...newFeedArticles];
          const unreadCount = allFeedArticles.filter(a => !a.isRead).length;

          // Update the feed's unread count
          dispatch(setFeedUnreadCount({ feedId: feed.id, count: unreadCount }));
        }
      });

      // Update filtered articles to include new feeds' articles
      dispatch(updateFilteredArticles({ selectedFeed, sortMode }));

      const successfulCount = successfulResults.length;
      const failedCount = failedResults.length;
      
      let description = `Successfully imported ${successfulCount} feed(s).`;
      if (failedCount > 0) {
        description += ` ${failedCount} feed(s) failed to import.`;
      }
      
      toast({
        title: "Feeds Imported",
        description,
        variant: failedCount > 0 ? "destructive" : "default",
      });
    } catch (error) {
      toast({
        title: "Import Error",
        description: "Failed to import some feeds. Check the console for details.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFeed = (feedId: string) => {
    dispatch(removeFeed(feedId));
    dispatch(removeArticlesByFeed(feedId));

    // If the removed feed was selected, switch to "all"
    if (selectedFeed === feedId) {
      dispatch(selectFeed('all'));
    }

    toast({
      title: "Feed Removed",
      description: "Feed and its articles have been removed.",
    });
  };

  const handleReorderFeeds = (reorderedFeeds: Feed[]) => {
    dispatch(reorderFeeds(reorderedFeeds));
    toast({
      title: "Feeds Reordered",
      description: "Feed order has been updated.",
    });
  };

  const handleRenameFeed = (feedId: string, newTitle: string) => {
    dispatch(renameFeed({ feedId, newTitle }));
    dispatch(updateArticlesFeedTitle({ feedId, newTitle }));

    toast({
      title: "Feed Renamed",
      description: `Feed renamed to "${newTitle}".`,
    });
  };

  const handleMarkAllAsRead = (feedId: string) => {
    dispatch(markAllAsReadForFeed(feedId));
    dispatch(markAllAsRead(feedId));

    const feed = feeds.find(f => f.id === feedId);
    toast({
      title: "Articles Marked as Read",
      description: `All articles in "${feed?.title}" have been marked as read.`,
    });
  };

  const handleToggleSortMode = () => {
    dispatch(toggleSortMode());
  };

  const selectedArticleData = articles.find(a => a.id === selectedArticle);

  // Show loading while authenticating
  if (authLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

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
        onFeedSelect={(feedId) => dispatch(selectFeed(feedId))}
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
        onArticleSelect={(articleId) => dispatch(selectArticle(articleId))}
        onToggleStar={handleToggleStar}
        onToggleBookmark={handleToggleBookmark}
        onMarkAsRead={handleMarkAsRead}
        sortMode={sortMode}
        onToggleSortMode={handleToggleSortMode}
      />

      {/* Article Reader */}
      <ArticleReader
        article={selectedArticleData || null}
        onToggleStar={handleToggleStar}
        onToggleBookmark={handleToggleBookmark}
        onClose={() => dispatch(selectArticle(null))}
      />
    </div>
  );
};

export default Index;