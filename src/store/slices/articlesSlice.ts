import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DataLayer, Article } from '@/services/dataLayer';
import { addFeed, refreshFeed, refreshAllFeeds, importFeeds } from './feedsSlice';

interface ArticlesState {
  articles: Article[];
  filteredArticles: Article[];
  loading: boolean;
}

const initialState: ArticlesState = {
  articles: [],
  filteredArticles: [],
  loading: false,
};

// Async thunk to load articles
export const loadArticles = createAsyncThunk(
  'articles/loadArticles',
  async () => {
    return await DataLayer.loadArticles();
  }
);

// Async thunk to save articles
export const saveArticles = createAsyncThunk(
  'articles/saveArticles',
  async (articles: Article[]) => {
    await DataLayer.saveArticles(articles);
    return articles;
  }
);

// Async thunk to update a single article
export const updateArticle = createAsyncThunk(
  'articles/updateArticle',
  async (article: Article) => {
    await DataLayer.updateArticle(article);
    return article;
  }
);

const articlesSlice = createSlice({
  name: 'articles',
  initialState,
  reducers: {
    toggleStar: (state, action: PayloadAction<string>) => {
      const article = state.articles.find(a => a.id === action.payload);
      if (article) {
        article.isStarred = !article.isStarred;
        // Update in database async
        DataLayer.updateArticle(article);
      }
    },
    toggleBookmark: (state, action: PayloadAction<string>) => {
      const article = state.articles.find(a => a.id === action.payload);
      if (article) {
        article.isBookmarked = !article.isBookmarked;
        // Update in database async
        DataLayer.updateArticle(article);
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const article = state.articles.find(a => a.id === action.payload);
      if (article) {
        article.isRead = !article.isRead;
        // Update in database async
        DataLayer.updateArticle(article);
      }
    },
    removeArticlesByFeed: (state, action: PayloadAction<string>) => {
      state.articles = state.articles.filter(article => article.feedId !== action.payload);
      // Save updated articles to database async
      DataLayer.saveArticles(state.articles);
    },
    updateArticlesFeedTitle: (state, action: PayloadAction<{ feedId: string; newTitle: string }>) => {
      const { feedId, newTitle } = action.payload;
      state.articles.forEach(article => {
        if (article.feedId === feedId) {
          article.feedTitle = newTitle;
        }
      });
      // Save updated articles to database async
      DataLayer.saveArticles(state.articles);
    },
    markAllAsReadForFeed: (state, action: PayloadAction<string>) => {
      const feedId = action.payload;
      state.articles.forEach(article => {
        if (article.feedId === feedId) {
          article.isRead = true;
        }
      });
      // Save updated articles to database async
      DataLayer.saveArticles(state.articles);
    },
    updateFilteredArticles: (state, action: PayloadAction<{ selectedFeed: string | null; sortMode: 'chronological' | 'unreadOnTop' }>) => {
      const { selectedFeed, sortMode } = action.payload;
      let filtered = DataLayer.filterArticles(state.articles, selectedFeed);
      state.filteredArticles = DataLayer.setSortOrderForArticles(filtered, sortMode);
    },
    cleanupOldArticles: (state, action: PayloadAction<Set<string>>) => {
      const currentFeedArticleUrls = action.payload;
      // This will be handled async in the background
      DataLayer.cleanupOldArticles(state.articles, currentFeedArticleUrls).then(cleanedArticles => {
        // The next load will have cleaned data
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Load articles
      .addCase(loadArticles.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadArticles.fulfilled, (state, action) => {
        state.articles = action.payload;
        state.loading = false;
      })
      .addCase(loadArticles.rejected, (state) => {
        state.loading = false;
      })
      // Save articles
      .addCase(saveArticles.fulfilled, (state, action) => {
        state.articles = action.payload;
      })
      // Update article
      .addCase(updateArticle.fulfilled, (state, action) => {
        const index = state.articles.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.articles[index] = action.payload;
        }
      })
      // Handle feed actions
      .addCase(addFeed.fulfilled, (state, action) => {
        if (action.payload.articles && action.payload.articles.length > 0) {
          const newArticles = action.payload.articles.filter(
            newArticle => !state.articles.some(existingArticle => existingArticle.url === newArticle.url)
          );
          state.articles.push(...newArticles);
          // Save to database async
          DataLayer.saveArticles(state.articles);
        }
      })
      .addCase(refreshFeed.fulfilled, (state, action) => {
        if (action.payload.articles && action.payload.articles.length > 0) {
          const newArticles = action.payload.articles.filter(
            newArticle => !state.articles.some(existingArticle => existingArticle.url === newArticle.url)
          );
          
          state.articles.push(...newArticles);
          
          // Cleanup old articles for this feed async
          const currentFeedArticleUrls = new Set(action.payload.articles.map((a: Article) => a.url));
          DataLayer.cleanupOldArticles(state.articles, currentFeedArticleUrls).then(() => {
            // Update state will happen on next load
          });
          
          // Save to database async
          DataLayer.saveArticles(state.articles);
        }
      })
      .addCase(importFeeds.fulfilled, (state, action) => {
        if (action.payload.newArticles && action.payload.newArticles.length > 0) {
          const filteredNewArticles = action.payload.newArticles.filter(
            newArticle => !state.articles.some(existingArticle => existingArticle.url === newArticle.url)
          );
          state.articles.push(...filteredNewArticles);
          // Save to database async
          DataLayer.saveArticles(state.articles);
        }
      })
      .addCase(refreshAllFeeds.fulfilled, (state, action) => {
        if (action.payload.newArticles && action.payload.newArticles.length > 0) {
          const filteredNewArticles = action.payload.newArticles.filter(
            newArticle => !state.articles.some(existingArticle => existingArticle.url === newArticle.url)
          );
          state.articles.push(...filteredNewArticles);
          
          // Cleanup old articles async
          const allCurrentUrls = new Set(state.articles.map(a => a.url));
          DataLayer.cleanupOldArticles(state.articles, allCurrentUrls).then(() => {
            // Update state will happen on next load
          });
          
          // Save to database async
          DataLayer.saveArticles(state.articles);
        }
      });
  },
});

export const {
  toggleStar,
  toggleBookmark,
  markAsRead,
  removeArticlesByFeed,
  updateArticlesFeedTitle,
  markAllAsReadForFeed,
  updateFilteredArticles,
  cleanupOldArticles,
} = articlesSlice.actions;

export default articlesSlice.reducer;