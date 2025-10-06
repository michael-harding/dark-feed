import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileFeedSidebar } from '@/components/mobile/MobileFeedSidebar';
import { MobileArticleList } from '@/components/mobile/MobileArticleList';
import { MobileArticleReader } from '@/components/mobile/MobileArticleReader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addFeed,
  loadFeeds,
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
  loadArticles,
  toggleStar,
  toggleBookmark,
  markAsRead,
  removeArticlesByFeed,
  updateArticlesFeedTitle,
  markAllAsReadForFeed,
  updateFilteredArticles,
} from '@/store/slices/articlesSlice';
import {
  selectFeed,
  selectArticle,
  toggleSortMode,
  loadUserSettings,
  setAccentColor,
  setInitialLoading,
} from '@/store/slices/uiSlice';
import { Feed } from '@/services/dataLayer';

type MobileView = 'feeds' | 'articles' | 'reader';

const Mobile = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<MobileView>('feeds');

  // Get current view from URL path
  const getCurrentView = useCallback((): MobileView => {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    // Handle both /m and /m/feed/123/article/456 patterns
    if (pathSegments.length >= 1 && pathSegments[0] === 'm') {
      if (pathSegments.length >= 4 && pathSegments[3] === 'article') {
        return 'reader';
      } else if (pathSegments.length >= 3 && pathSegments[2] !== '') {
        return 'articles';
      }
    }
    return 'feeds';
  }, []);

  // Update URL without triggering navigation
  const updateURL = useCallback((view: MobileView, feedId?: string, articleId?: string) => {
    let url = '/m';

    if (view === 'articles' && feedId) {
      url = `/m/feed/${feedId}`;
    } else if (view === 'reader' && feedId && articleId) {
      url = `/m/feed/${feedId}/article/${articleId}`;
    }

    window.history.pushState({ view, feedId, articleId }, '', url);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state) {
        setCurrentView(state.view);
        if (state.feedId) {
          dispatch(selectFeed(state.feedId));
        } else {
          dispatch(selectFeed(null));
        }
        if (state.articleId) {
          dispatch(selectArticle(state.articleId));
        } else {
          dispatch(selectArticle(null));
        }
      } else {
        // Fallback to URL parsing if no state
        const view = getCurrentView();
        setCurrentView(view);

        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        if (pathSegments.length >= 1 && pathSegments[0] === 'm') {
          const feedId = pathSegments[2];
          const articleId = pathSegments[4];

          if (feedId && feedId !== 'feed' && feedId !== 'article') {
            dispatch(selectFeed(feedId));
          } else {
            dispatch(selectFeed(null));
          }

          if (articleId) {
            dispatch(selectArticle(articleId));
          } else {
            dispatch(selectArticle(null));
          }
        } else {
          dispatch(selectFeed(null));
          dispatch(selectArticle(null));
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dispatch, getCurrentView]);

  // Initialize view from URL on mount
  useEffect(() => {
    const view = getCurrentView();
    setCurrentView(view);

    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    if (pathSegments.length >= 1 && pathSegments[0] === 'm') {
      const feedId = pathSegments[2];
      const articleId = pathSegments[4];

      if (feedId && feedId !== 'feed' && feedId !== 'article') {
        dispatch(selectFeed(feedId));
      }

      if (articleId) {
        dispatch(selectArticle(articleId));
      }
    }
  }, [dispatch, getCurrentView]);

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

  // Update filtered articles when selectedFeed or sortMode changes
  useEffect(() => {
    dispatch(updateFilteredArticles({ selectedFeed, sortMode }));
  }, [dispatch, selectedFeed, sortMode]);

  // Initialize app on page load
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await dispatch(loadUserSettings()).unwrap();
        await dispatch(loadFeeds()).unwrap();
        await dispatch(loadArticles()).unwrap();

        const currentFeeds = await dispatch(loadFeeds()).unwrap();
        const currentArticles = await dispatch(loadArticles()).unwrap();

        if (currentFeeds.length === 0) {
          dispatch(setInitialLoading(false));
          return;
        }

        // Verify and correct unread counts
        currentFeeds.forEach(feed => {
          const feedArticles = currentArticles.filter(a => a.feedId === feed.id);
          const actualUnreadCount = feedArticles.filter(a => !a.isRead).length;

          if (actualUnreadCount !== feed.unreadCount) {
            dispatch(setFeedUnreadCount({ feedId: feed.id, count: actualUnreadCount }));
          }
        });

        // Refresh feeds and clean up old articles
        const allCurrentUrlsByFeed = new Map<string, Set<string>>();
        currentFeeds.forEach(feed => {
          const feedArticles = currentArticles.filter(a => a.feedId === feed.id);
          const urls = new Set<string>(feedArticles.map(a => a.url));
          allCurrentUrlsByFeed.set(feed.id, urls);
        });

        const result = await dispatch(refreshAllFeeds(currentFeeds)).unwrap();

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
            const currentUrls = allCurrentUrlsByFeed.get(feed.id) || new Set<string>();
            newArticles.forEach(article => {
              if (article.url) {
                currentUrls.add(article.url);
              }
            });
            currentUrls.forEach(url => updatedFeedArticleUrls.add(url));

            if (newArticles.length > 0) {
              dispatch(updateFeedUnreadCount({ feedId: feed.id, delta: newArticles.length }));
              toast({
                title: 'New Articles',
                description: `Found ${newArticles.length} new articles for ${feed.title}`,
              });
            }
          }
        });

        // Note: cleanup is now handled automatically in the refreshAllFeeds thunk
        dispatch(updateFilteredArticles({ selectedFeed, sortMode }));

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
        dispatch(setInitialLoading(false));
      }
    };

    initializeApp();
  }, []);

  // Handle view changes based on selections
  useEffect(() => {
    if (selectedArticle) {
      setCurrentView('reader');
      const article = articles.find(a => a.id === selectedArticle);
      if (article) {
        updateURL('reader', article.feedId, selectedArticle);
      }
    } else if (selectedFeed) {
      setCurrentView('articles');
      updateURL('articles', selectedFeed, undefined);
    } else {
      setCurrentView('feeds');
      updateURL('feeds');
    }
  }, [selectedFeed, selectedArticle, updateURL, articles]);

  // Handlers
  const handleAddFeed = async (url: string) => {
    try {
      const result = await dispatch(addFeed(url)).unwrap();
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
      const delta = article.isRead ? 1 : -1;
      dispatch(updateFeedUnreadCount({ feedId: article.feedId, delta }));
    }
  };

  const handleImportFeeds = async (importedFeeds: Feed[]) => {
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
      const currentArticles = articles;

      const successfulResults = results.filter(result => !result.error);
      const failedResults = results.filter(result => result.error);

      successfulResults.forEach(({ articles: newArticles, feed }) => {
        if (newArticles.length > 0) {
          const existingFeedArticles = currentArticles.filter(a => a.feedId === feed.id);
          const newFeedArticles = newArticles.filter(a => a.feedId === feed.id);
          const allFeedArticles = [...existingFeedArticles, ...newFeedArticles];
          const unreadCount = allFeedArticles.filter(a => !a.isRead).length;

          dispatch(setFeedUnreadCount({ feedId: feed.id, count: unreadCount }));
        }
      });

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

    if (selectedFeed === feedId) {
      dispatch(selectFeed('all'));
      updateURL('articles', 'all');
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
    dispatch(renameFeed({ id: feedId, newTitle }));
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

  const handleFeedSelect = (feedId: string) => {
    dispatch(selectFeed(feedId));
    updateURL('articles', feedId);
  };

  const handleArticleSelect = (articleId: string) => {
    dispatch(selectArticle(articleId));
    const article = articles.find(a => a.id === articleId);
    if (article && !article.isRead) {
      handleMarkAsRead(articleId);
    }
    updateURL('reader', article?.feedId, articleId);
  };

  const handleBackToFeeds = () => {
    dispatch(selectFeed(null));
    dispatch(selectArticle(null));
    updateURL('feeds');
  };

  const handleBackToArticles = () => {
    dispatch(selectArticle(null));
    updateURL('articles', selectedFeed);
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
    <div className="h-screen bg-background overflow-hidden">
      {currentView === 'feeds' && (
        <MobileFeedSidebar
          feeds={feeds}
          selectedFeed={selectedFeed}
          onFeedSelect={handleFeedSelect}
          onAddFeed={handleAddFeed}
          onImportFeeds={handleImportFeeds}
          onRemoveFeed={handleRemoveFeed}
          onRenameFeed={handleRenameFeed}
          onMarkAllAsRead={handleMarkAllAsRead}
          onReorderFeeds={handleReorderFeeds}
          isLoading={isLoading}
        />
      )}

      {currentView === 'articles' && (
        <MobileArticleList
          articles={filteredArticles}
          selectedArticle={selectedArticle}
          onArticleSelect={handleArticleSelect}
          onToggleStar={handleToggleStar}
          onToggleBookmark={handleToggleBookmark}
          onMarkAsRead={handleMarkAsRead}
          sortMode={sortMode}
          onToggleSortMode={handleToggleSortMode}
          onBack={handleBackToFeeds}
          selectedFeed={selectedFeed}
          feeds={feeds}
        />
      )}

      {currentView === 'reader' && (
        <MobileArticleReader
          article={selectedArticleData || null}
          onToggleStar={handleToggleStar}
          onToggleBookmark={handleToggleBookmark}
          onBack={handleBackToArticles}
        />
      )}
    </div>
  );
};

export default Mobile;