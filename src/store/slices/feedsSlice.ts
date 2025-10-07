import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DataLayer, Feed, Article } from '@/services/dataLayer';
import { checkFeedFetchStatus, updateFeedFetchTime } from '@/store/slices/uiSlice';

interface FeedsState {
  feeds: Feed[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FeedsState = {
  feeds: [],
  isLoading: false,
  error: null,
};

// Async thunk to load feeds with centralized fetch time check
export const loadFeeds = createAsyncThunk(
  'feeds/loadFeeds',
  async (_, { getState, dispatch }) => {
    const state = getState() as { ui: { refreshLimitInterval: number; feedFetchTime: number | null } };

    // Check if feeds should be fetched based on user settings
    const fetchStatus = await dispatch(checkFeedFetchStatus()).unwrap();

    if (!fetchStatus.shouldFetch) {
      console.log('Feeds within refresh limit, skipping fetch');
      // Still load feeds from database to get current state
      const feeds = await DataLayer.loadFeeds();
      return feeds;
    }

    console.log('Fetching fresh feeds');
    const feeds = await DataLayer.loadFeeds();

    // Update fetch time after successful load
    await dispatch(updateFeedFetchTime());

    return feeds;
  }
);

// Async thunk to add a new feed
export const addFeed = createAsyncThunk(
  'feeds/addFeed',
  async (url: string) => {
    try {
      // New feeds should always fetch immediately, ignoring refresh limit
      const data = await DataLayer.fetchRSSFeed(url, 0);

      if (data.status === 'skipped') {
        throw new Error('Feed fetching skipped on development server');
      }

      const feedId = crypto.randomUUID();
      const newFeed: Feed = {
        id: feedId,
        title: data.feed?.title || 'Unknown Feed',
        url: url,
        unreadCount: data.items?.length || 0,
        category: null,
        fetchTime: null
      };

      await DataLayer.saveFeed(newFeed, ['title', 'url', 'unreadCount', 'category', 'fetchTime']);

      const existingUrls = await DataLayer.getExistingArticleUrlsForFeed(feedId);
      const newArticles = DataLayer.createArticlesFromRSSData(data, feedId, newFeed.title)
        .filter(article => !existingUrls.has(article.url));

      return { feed: newFeed, articles: newArticles };
    } catch (error) {
      throw new Error(`Failed to add feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Async thunk to import multiple feeds
export const importFeeds = createAsyncThunk(
  'feeds/importFeeds',
  async (feedsToImport: Feed[], { getState }) => {
    const currentFeeds = await DataLayer.loadFeeds();
    const existingUrls = new Set(currentFeeds.map(feed => feed.url));

    const results: Array<{ articles: Article[]; feed: Feed; error?: string }> = [];

    for (const feed of feedsToImport) {
      if (!existingUrls.has(feed.url)) {
        try {
          // Import should always fetch immediately, ignoring refresh limit
          const data = await DataLayer.fetchRSSFeed(feed.url, 0);

          if (data.status === 'skipped') {
            results.push({ articles: [], feed, error: 'Feed fetching skipped on development server' });
            continue;
          }

          // Validate that feed.id is a proper UUID, generate new one if not
          const isValidUUID = feed.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(feed.id);
          const feedId = isValidUUID ? feed.id : crypto.randomUUID();
          const newFeed: Feed = {
            id: feedId,
            title: data.feed?.title || feed.title || 'Unknown Feed',
            url: feed.url,
            unreadCount: data.items?.length || 0,
            category: feed.category,
            fetchTime: null
          };

          await DataLayer.saveFeed(newFeed, ['title', 'url', 'unreadCount', 'category', 'fetchTime']);

          const existingUrls = await DataLayer.getExistingArticleUrlsForFeed(feedId);
          const feedArticles = DataLayer.createArticlesFromRSSData(data, feedId, newFeed.title)
            .filter(article => !existingUrls.has(article.url));

          results.push({ articles: feedArticles, feed: newFeed });
        } catch (error) {
          console.error(`Failed to import feed ${feed.url}:`, error);
          results.push({
            articles: [],
            feed,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        results.push({ articles: [], feed, error: 'Feed already exists' });
      }
    }

    return results;
  }
);

// Async thunk to refresh a single feed
export const refreshFeed = createAsyncThunk(
  'feeds/refreshFeed',
  async (feedId: string, { getState }) => {
    const feeds = await DataLayer.loadFeeds();
    const feed = feeds.find(f => f.id === feedId);

    if (!feed) {
      throw new Error('Feed not found');
    }

    try {
      const state = getState() as { ui: { refreshLimitInterval: number } };
      const refreshLimitInterval = state.ui.refreshLimitInterval;
      const data = await DataLayer.fetchRSSFeed(feed.url, refreshLimitInterval);

      if (data.status === 'skipped') {
        return { feedId, articles: [], skipped: true };
      }

      const existingUrls = await DataLayer.getExistingArticleUrlsForFeed(feedId);
      const newArticles = DataLayer.createArticlesFromRSSData(data, feedId, feed.title)
        .filter(article => !existingUrls.has(article.url));

      // Clean up old articles for this feed based on the earliest article date
      await DataLayer.cleanupArticlesByEarliestDate(feedId, newArticles);

      // Update the feed's fetch time
      const updatedFeed: Feed = {
        ...feed,
        fetchTime: new Date().toISOString()
      };
      await DataLayer.saveFeed(updatedFeed, ['fetchTime']);

      return { feedId, articles: newArticles };
    } catch (error) {
      throw new Error(`Failed to refresh feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Async thunk to refresh all feeds
export const refreshAllFeeds = createAsyncThunk(
  'feeds/refreshAllFeeds',
  async (feeds: Feed[], { getState }) => {
    const results: Array<{ newArticles: Article[]; feed: Feed; error?: string }> = [];

    for (const feed of feeds) {
      try {
        const state = getState() as { ui: { refreshLimitInterval: number } };
        const refreshLimitInterval = state.ui.refreshLimitInterval;
        const data = await DataLayer.fetchRSSFeed(feed.url, refreshLimitInterval);

        if (data.status === 'skipped') {
          results.push({ newArticles: [], feed });
          continue;
        }
        const feedArticles = DataLayer.createArticlesFromRSSData(data, feed.id, feed.title)

        // Clean up old articles for this feed based on the earliest article date
        await DataLayer.cleanupArticlesByEarliestDate(feed.id, feedArticles);

        // Update the feed's fetch time
        const updatedFeed: Feed = {
          ...feed,
          fetchTime: new Date().toISOString()
        };
        await DataLayer.saveFeed(updatedFeed, ['fetchTime']);

        results.push({ newArticles: feedArticles, feed: updatedFeed });
      } catch (error) {
        console.error(`Failed to refresh feed ${feed.title}:`, error);
        results.push({
          newArticles: [],
          feed,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
);

const feedsSlice = createSlice({
  name: 'feeds',
  initialState,
  reducers: {
    removeFeed: (state, action: PayloadAction<string>) => {
      state.feeds = state.feeds.filter(feed => feed.id !== action.payload);
      // Delete from database async
      DataLayer.deleteFeed(action.payload);
    },
    renameFeed: (state, action: PayloadAction<{ id: string; newTitle: string }>) => {
      const feed = state.feeds.find(f => f.id === action.payload.id);
      if (feed) {
        feed.title = action.payload.newTitle;
        // Update in database async - only update title
        const plainFeed: Feed = JSON.parse(JSON.stringify(feed));
        DataLayer.saveFeed(plainFeed, ['title']);
      }
    },
    reorderFeeds: (state, action: PayloadAction<Feed[]>) => {
      state.feeds = action.payload;
    },
    setFeedUnreadCount: (state, action: PayloadAction<{ feedId: string; count: number }>) => {
      const feed = state.feeds.find(f => f.id === action.payload.feedId);
      if (feed) {
        feed.unreadCount = Math.max(0, action.payload.count);
        // Update in database async - only update unread count
        const plainFeed: Feed = JSON.parse(JSON.stringify(feed));
        DataLayer.saveFeed(plainFeed, ['unreadCount']);
      }
    },
    updateFeedUnreadCount: (state, action: PayloadAction<{ feedId: string; delta: number }>) => {
      const feed = state.feeds.find(f => f.id === action.payload.feedId);
      if (feed) {
        feed.unreadCount = Math.max(0, feed.unreadCount + action.payload.delta);
        // Update in database async - only update unread count
        const plainFeed: Feed = JSON.parse(JSON.stringify(feed));
        DataLayer.saveFeed(plainFeed, ['unreadCount']);
      }
    },
    markAllAsRead: (state, action: PayloadAction<string>) => {
      const feed = state.feeds.find(f => f.id === action.payload);
      if (feed) {
        feed.unreadCount = 0;
        // Update in database async - only update unread count
        const plainFeed: Feed = JSON.parse(JSON.stringify(feed));
        DataLayer.saveFeed(plainFeed, ['unreadCount']);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Load feeds
      .addCase(loadFeeds.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadFeeds.fulfilled, (state, action) => {
        state.feeds = action.payload;
        state.isLoading = false;
      })
      .addCase(loadFeeds.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load feeds';
      })
      // Add feed
      .addCase(addFeed.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addFeed.fulfilled, (state, action) => {
        state.feeds.push(action.payload.feed);
        state.isLoading = false;
      })
      .addCase(addFeed.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to add feed';
      })
      // Import feeds
      .addCase(importFeeds.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importFeeds.fulfilled, (state, action) => {
        const successfulFeeds = action.payload
          .filter(result => !result.error && result.articles.length >= 0)
          .map(result => result.feed);
        state.feeds.push(...successfulFeeds);
        state.isLoading = false;
      })
      .addCase(importFeeds.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to import feeds';
      })
      // Refresh feed
      .addCase(refreshFeed.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshFeed.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(refreshFeed.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to refresh feed';
      })
      // Refresh all feeds
      .addCase(refreshAllFeeds.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshAllFeeds.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(refreshAllFeeds.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to refresh feeds';
      });
  },
});

export const {
  removeFeed,
  renameFeed,
  reorderFeeds,
  setFeedUnreadCount,
  updateFeedUnreadCount,
  markAllAsRead,
} = feedsSlice.actions;

export default feedsSlice.reducer;