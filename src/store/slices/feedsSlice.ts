import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DataLayer, Feed } from '@/services/dataLayer';

interface FeedsState {
  feeds: Feed[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FeedsState = {
  feeds: DataLayer.loadFeeds(),
  isLoading: false,
  error: null,
};

// Async thunks
export const addFeed = createAsyncThunk(
  'feeds/addFeed',
  async (url: string) => {
    const data = await DataLayer.fetchRSSFeed(url);
    const feedId = Date.now().toString();

    const newFeed: Feed = {
      id: feedId,
      title: data.feed?.title || 'Unknown Feed',
      url,
      unreadCount: data.items?.length || 0,
    };

    const newArticles = DataLayer.createArticlesFromRSSData(data, feedId, newFeed.title);

    return { feed: newFeed, articles: newArticles };
  }
);

export const importFeeds = createAsyncThunk(
  'feeds/importFeeds',
  async (importedFeeds: Feed[], { getState }) => {
    const state = getState() as { feeds: FeedsState };
    const existingUrls = state.feeds.feeds.map(f => f.url);
    const newFeeds = importedFeeds.filter(feed => !existingUrls.includes(feed.url));

    const results: { feed: Feed; articles: any[] }[] = [];

    for (const feed of newFeeds) {
      try {
        const data = await DataLayer.fetchRSSFeed(feed.url);
        const articles = DataLayer.createArticlesFromRSSData(data, feed.id, feed.title);
        results.push({ feed, articles });
      } catch (error) {
        console.error(`Failed to fetch articles for feed ${feed.title}:`, error);
        results.push({ feed, articles: [] });
      }
    }

    return results;
  }
);

export const refreshFeed = createAsyncThunk(
  'feeds/refreshFeed',
  async (feed: Feed) => {
    const data = await DataLayer.fetchRSSFeed(feed.url);
    const allNewArticles = DataLayer.createArticlesFromRSSData(data, feed.id, feed.title);
    const existingUrls = DataLayer.getExistingArticleUrlsForFeed(feed.id);
    const uniqueNewArticles = allNewArticles.filter(article => !existingUrls.has(article.url));
    return { feed, newArticles: uniqueNewArticles, newCount: uniqueNewArticles.length };
  }
);

export const refreshAllFeeds = createAsyncThunk(
  'feeds/refreshAllFeeds',
  async (feeds: Feed[]) => {
    const results = [];
    for (const feed of feeds) {
      try {
        const data = await DataLayer.fetchRSSFeed(feed.url);
        const allNewArticles = DataLayer.createArticlesFromRSSData(data, feed.id, feed.title);
        const existingUrls = DataLayer.getExistingArticleUrlsForFeed(feed.id);
        const uniqueNewArticles = allNewArticles.filter(article => !existingUrls.has(article.url));
        results.push({ feed, newArticles: uniqueNewArticles, newCount: uniqueNewArticles.length, error: null });
      } catch (error) {
        results.push({ feed, newArticles: [], newCount: 0, error: String(error) });
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
      DataLayer.saveFeeds(state.feeds);
    },
    renameFeed: (state, action: PayloadAction<{ feedId: string; newTitle: string }>) => {
      const { feedId, newTitle } = action.payload;
      const feed = state.feeds.find(f => f.id === feedId);
      if (feed) {
        feed.title = newTitle;
        DataLayer.saveFeeds(state.feeds);
      }
    },
    reorderFeeds: (state, action: PayloadAction<Feed[]>) => {
      state.feeds = action.payload;
      DataLayer.saveFeeds(state.feeds);
    },
    updateFeedUnreadCount: (state, action: PayloadAction<{ feedId: string; delta: number }>) => {
      const { feedId, delta } = action.payload;
      const feed = state.feeds.find(f => f.id === feedId);
      if (feed) {
        feed.unreadCount = Math.max(0, feed.unreadCount + delta);
        DataLayer.saveFeeds(state.feeds);
      }
    },
    setFeedUnreadCount: (state, action: PayloadAction<{ feedId: string; count: number }>) => {
      const { feedId, count } = action.payload;
      const feed = state.feeds.find(f => f.id === feedId);
      if (feed) {
        feed.unreadCount = count;
        DataLayer.saveFeeds(state.feeds);
      }
    },
    updateMultipleFeedUnreadCounts: (state, action: PayloadAction<{ feedIds: string[]; counts: number[] }>) => {
      const { feedIds, counts } = action.payload;
      feedIds.forEach((feedId, index) => {
        const feed = state.feeds.find(f => f.id === feedId);
        if (feed) {
          feed.unreadCount = counts[index];
        }
      });
      DataLayer.saveFeeds(state.feeds);
    },
    markAllAsRead: (state, action: PayloadAction<string>) => {
      const feed = state.feeds.find(f => f.id === action.payload);
      if (feed) {
        feed.unreadCount = 0;
        DataLayer.saveFeeds(state.feeds);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Add feed
      .addCase(addFeed.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addFeed.fulfilled, (state, action) => {
        state.isLoading = false;
        state.feeds.push(action.payload.feed);
        DataLayer.saveFeeds(state.feeds);
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
        state.isLoading = false;
        action.payload.forEach(({ feed }) => {
          state.feeds.push(feed);
        });
        DataLayer.saveFeeds(state.feeds);
      })
      .addCase(importFeeds.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to import feeds';
      })
      // Refresh feed
      .addCase(refreshFeed.pending, (state) => {
        state.isLoading = true;
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
      })
      // Handle unread count updates from articles slice
      .addCase('articles/updateFeedUnreadCounts', (state, action: PayloadAction<{ feedIds: string[]; counts: number[] }>) => {
        const { feedIds, counts } = action.payload;
        feedIds.forEach((feedId, index) => {
          const feed = state.feeds.find(f => f.id === feedId);
          if (feed) {
            feed.unreadCount = counts[index];
          }
        });
        DataLayer.saveFeeds(state.feeds);
      });
  },
});

export const {
  removeFeed,
  renameFeed,
  reorderFeeds,
  updateFeedUnreadCount,
  setFeedUnreadCount,
  updateMultipleFeedUnreadCounts,
  markAllAsRead,
} = feedsSlice.actions;

export default feedsSlice.reducer;