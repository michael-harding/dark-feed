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
} from '@/store/slices/feedsSlice';
import {
  loadArticles,
  toggleStar,
  toggleBookmark,
  markAsRead,
  removeArticlesByFeed,
  updateArticlesFeedTitle,
  updateFilteredArticles,
} from '@/store/slices/articlesSlice';
import {
   selectFeed,
   selectArticle,
   toggleSortMode,
   loadUserSettings,
   setAccentColor,
   setInitialLoading,
   checkFeedFetchStatus,
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
    // Handle mobile routes: /m, /m/feed/{id}, /m/feed/{id}/article/{id}
    if (pathSegments.length >= 1 && pathSegments[0] === 'm') {
      if (pathSegments.length >= 4 && pathSegments[1] === 'feed' && pathSegments[3] === 'article') {
        return 'reader';
      } else if (pathSegments.length >= 3 && pathSegments[1] === 'feed') {
        return 'articles';
      }
    }
    return 'feeds';
  }, []);

  // Update URL without triggering navigation
  const updateURL = useCallback((view: MobileView, feedId?: string, articleId?: string, replaceState = false) => {
    let url = '/m';

    if (view === 'articles' && feedId) {
      url = `/m/feed/${feedId}`;
    } else if (view === 'reader' && feedId && articleId) {
      url = `/m/feed/${feedId}/article/${articleId}`;
    }

    // Use replaceState when going back to previous view to avoid duplicate history entries
    // Use pushState for forward navigation to create new history entries
    if (replaceState) {
      window.history.replaceState({ view, feedId, articleId }, '', url);
    } else {
      window.history.pushState({ view, feedId, articleId }, '', url);
    }
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.view) {
        setCurrentView(state.view);
        if (state.feedId && state.feedId !== 'feed' && state.feedId !== 'article') {
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
          // Handle /m/feed/{feedId}/article/{articleId}
          if (pathSegments.length >= 4 && pathSegments[1] === 'feed' && pathSegments[3] === 'article') {
            const feedId = pathSegments[2];
            const articleId = pathSegments[4];

            if (feedId && feedId !== 'feed' && feedId !== 'article') {
              dispatch(selectFeed(feedId));
            }

            if (articleId) {
              dispatch(selectArticle(articleId));
            }
          }
          // Handle /m/feed/{feedId}
          else if (pathSegments.length >= 3 && pathSegments[1] === 'feed') {
            const feedId = pathSegments[2];

            if (feedId && feedId !== 'feed' && feedId !== 'article') {
              dispatch(selectFeed(feedId));
            } else {
              dispatch(selectFeed(null));
            }
            dispatch(selectArticle(null));
          }
          // Handle /m (feeds view)
          else {
            dispatch(selectFeed(null));
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
  }, [dispatch]);

  // Initialize view from URL on mount
  useEffect(() => {
    const view = getCurrentView();
    setCurrentView(view);

    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    if (pathSegments.length >= 1 && pathSegments[0] === 'm') {
      // Handle /m/feed/{feedId}/article/{articleId}
      if (pathSegments.length >= 4 && pathSegments[1] === 'feed' && pathSegments[3] === 'article') {
        const feedId = pathSegments[2];
        const articleId = pathSegments[4];

        if (feedId && feedId !== 'feed' && feedId !== 'article') {
          dispatch(selectFeed(feedId));
        }

        if (articleId) {
          dispatch(selectArticle(articleId));
        }
      }
      // Handle /m/feed/{feedId}
      else if (pathSegments.length >= 3 && pathSegments[1] === 'feed') {
        const feedId = pathSegments[2];

        if (feedId && feedId !== 'feed' && feedId !== 'article') {
          dispatch(selectFeed(feedId));
        }
      }
      // Handle /m (feeds view) - no feed or article selection needed
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

  // Load feeds when sidebar is shown
  useEffect(() => {
    if (currentView === 'feeds' && feeds.length === 0) {
      const loadFeedsForSidebar = async () => {
        try {
          await dispatch(loadFeeds()).unwrap();
        } catch (error) {
          console.error('Error loading feeds for sidebar:', error);
          toast({
            title: 'Error Loading Feeds',
            description: 'Failed to load feeds. Please try again.',
            variant: 'destructive',
          });
        }
      };

      loadFeedsForSidebar();
    }
  }, [currentView, dispatch, feeds.length, toast]);


  // Initialize app with centralized fetch time check
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Step 1: Load user settings first
        await dispatch(loadUserSettings()).unwrap();

        // Step 2: Check if feeds should be fetched based on user settings
        const fetchStatus = await dispatch(checkFeedFetchStatus()).unwrap();

        // Step 3: Load feeds and articles from database
        await dispatch(loadFeeds()).unwrap();
        await dispatch(loadArticles()).unwrap();

        // Step 4: Get the updated feeds and articles after loading
        const currentFeeds = await dispatch(loadFeeds()).unwrap();
        const currentArticles = await dispatch(loadArticles()).unwrap();

        if (currentFeeds.length === 0) {
          dispatch(setInitialLoading(false));
          return;
        }

        // Step 5: Only refresh feeds if the check indicates they should be fetched
        if (fetchStatus.shouldFetch) {
          // Collect all current article URLs per feed before refresh
          const allCurrentUrlsByFeed = new Map<string, Set<string>>();
          currentFeeds.forEach(feed => {
            const feedArticles = currentArticles.filter(a => a.feedId === feed.id);
            const urls = new Set<string>(feedArticles.map(a => a.url));
            allCurrentUrlsByFeed.set(feed.id, urls);
          });

          // Refresh all feeds
          const result = await dispatch(refreshAllFeeds({ feeds: currentFeeds })).unwrap();

          // After refresh, collect updated URLs (existing + new)
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
              const currentUrls = allCurrentUrlsByFeed.get(feed.id) || new Set<string>();
              newArticles.forEach(article => {
                if (article.url) {
                  currentUrls.add(article.url);
                }
              });
              currentUrls.forEach(url => updatedFeedArticleUrls.add(url));
            }
          });

          // Note: cleanup is now handled automatically in the refreshAllFeeds thunk
          dispatch(updateFilteredArticles({ selectedFeed, sortMode }));

          // Final verification of all unread counts after cleanup using fresh articles
          const refreshedArticles = await dispatch(loadArticles()).unwrap();
          currentFeeds.forEach(feed => {
            const feedArticles = refreshedArticles.filter(a => a.feedId === feed.id);
            const actualUnreadCount = feedArticles.filter(a => !a.isRead).length;

            if (actualUnreadCount !== feed.unreadCount) {
              dispatch(setFeedUnreadCount({ feedId: feed.id, count: actualUnreadCount }));
            }
          });

          // Update filtered articles after refresh (to include new ones)
          dispatch(updateFilteredArticles({ selectedFeed: "all", sortMode }));

          toast({
            title: "Feeds Refreshed",
            description: "Checked for new articles",
          });
        } else {
          // Still update filtered articles to ensure proper display
          dispatch(updateFilteredArticles({ selectedFeed, sortMode }));
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        toast({
          title: 'Initialization Error',
          description: String(error),
          variant: 'destructive',
        });
      } finally {
        dispatch(setInitialLoading(false));
      }
    };

    initializeApp();
  }, []); // Only run on initial page load

  // Handle view changes based on selections
  useEffect(() => {
    // Check if this is a browser back/forward navigation
    const isBrowserNavigation = window.history.state &&
      ((selectedArticle && window.history.state.articleId === selectedArticle) ||
       (selectedFeed && window.history.state.feedId === selectedFeed && !selectedArticle) ||
       (!selectedFeed && !selectedArticle && window.history.state.view === 'feeds'));

    if (isBrowserNavigation) {
      // Browser navigation - just update the view without changing URL
      if (selectedArticle) {
        setCurrentView('reader');
      } else if (selectedFeed) {
        setCurrentView('articles');
      } else {
        setCurrentView('feeds');
      }
      return;
    }

    // Manual navigation - update URL
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
  }, [selectedFeed, selectedArticle, articles]);

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
      dispatch(selectFeed(null));
      dispatch(selectArticle(null));
      updateURL('feeds');
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


  const handleRefreshFeeds = async () => {
    try {
      // Force refresh all feeds, bypassing time limits
      await dispatch(refreshAllFeeds({ feeds, forceRefresh: true })).unwrap();
      toast({
        title: "Feeds Refreshed",
        description: "All feeds have been updated with the latest content.",
      });
    } catch (error) {
      toast({
        title: "Refresh Error",
        description: "Failed to refresh feeds. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleSortMode = () => {
    dispatch(toggleSortMode());
  };

  const handleFeedSelect = (feedId: string) => {
    dispatch(selectFeed(feedId));
  };

  const handleArticleSelect = (articleId: string) => {
    dispatch(selectArticle(articleId));
    const article = articles.find(a => a.id === articleId);
    if (article && !article.isRead) {
      handleMarkAsRead(articleId);
    }
  };

  const handleBackToFeeds = () => {
    dispatch(selectFeed(null));
    dispatch(selectArticle(null));
    updateURL('feeds', undefined, undefined);
  };

  const handleBackToArticles = () => {
    dispatch(selectArticle(null));
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
          onReorderFeeds={handleReorderFeeds}
          onRefreshFeeds={handleRefreshFeeds}
          isLoading={isLoading && feeds.length === 0}
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
          isLoading={isLoading}
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