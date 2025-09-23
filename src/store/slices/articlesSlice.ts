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
        // Also update the corresponding article in filteredArticles
        const filteredArticle = state.filteredArticles.find(a => a.id === action.payload);
        if (filteredArticle) {
          filteredArticle.isStarred = article.isStarred;
        }
        // Update in database async - create a plain copy
        const plainArticle: Article = JSON.parse(JSON.stringify(article));
        DataLayer.updateArticle(plainArticle);
      }
    },
    toggleBookmark: (state, action: PayloadAction<string>) => {
      const article = state.articles.find(a => a.id === action.payload);
      if (article) {
        article.isBookmarked = !article.isBookmarked;
        // Also update the corresponding article in filteredArticles
        const filteredArticle = state.filteredArticles.find(a => a.id === action.payload);
        if (filteredArticle) {
          filteredArticle.isBookmarked = article.isBookmarked;
        }
        // Update in database async - create a plain copy
        const plainArticle: Article = JSON.parse(JSON.stringify(article));
        DataLayer.updateArticle(plainArticle);
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const article = state.articles.find(a => a.id === action.payload);
      if (article) {
        article.isRead = !article.isRead;
        // Reflect change in filteredArticles without re-sorting
        const filteredArticle = state.filteredArticles.find(a => a.id === article.id);
        if (filteredArticle) {
          filteredArticle.isRead = article.isRead;
        }
        // Update in database async - create a plain copy
        const plainArticle: Article = JSON.parse(JSON.stringify(article));
        DataLayer.updateArticle(plainArticle);
      }
    },
    removeArticlesByFeed: (state, action: PayloadAction<string>) => {
      state.articles = state.articles.filter(article => article.feedId !== action.payload);
      // Save updated articles to database async - create a plain copy
      const plainArticles: Article[] = JSON.parse(JSON.stringify(state.articles));
      DataLayer.saveArticles(plainArticles);
    },
    updateArticlesFeedTitle: (state, action: PayloadAction<{ feedId: string; newTitle: string }>) => {
      const { feedId, newTitle } = action.payload;
      state.articles.forEach(article => {
        if (article.feedId === feedId) {
          article.feedTitle = newTitle;
        }
      });
      // Save updated articles to database async - create a plain copy
      const plainArticles: Article[] = JSON.parse(JSON.stringify(state.articles));
      DataLayer.saveArticles(plainArticles);
    },
    markAllAsReadForFeed: (state, action: PayloadAction<string>) => {
      const feedId = action.payload;
      state.articles.forEach(article => {
        if (article.feedId === feedId) {
          article.isRead = true;
        }
      });
      // Reflect change in filteredArticles without re-sorting
      state.filteredArticles.forEach(article => {
        if (article.feedId === feedId) {
          article.isRead = true;
        }
      });
      // Save updated articles to database async - create a plain copy
      const plainArticles: Article[] = JSON.parse(JSON.stringify(state.articles));
      DataLayer.saveArticles(plainArticles);
    },
    updateFilteredArticles: (state, action: PayloadAction<{ selectedFeed: string | null; sortMode: 'chronological' | 'unreadOnTop' }>) => {
      const { selectedFeed, sortMode } = action.payload;
      let filtered = DataLayer.filterArticles(state.articles, selectedFeed);
      state.filteredArticles = DataLayer.setSortOrderForArticles(filtered, sortMode);
    },
    cleanupOldArticles: (state, action: PayloadAction<Set<string>>) => {
      const currentFeedArticleUrls = action.payload;
      // This will be handled async in the background - create a plain copy
      const plainArticles: Article[] = JSON.parse(JSON.stringify(state.articles));
      DataLayer.cleanupOldArticles(plainArticles, currentFeedArticleUrls).then(cleanedArticles => {
        // Update state immediately with cleaned articles
        state.articles = cleanedArticles;
        // Note: filteredArticles will be updated by the updateFilteredArticles action
        // which should be dispatched after this cleanup completes
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
          // Save to database async - create a plain copy
          const plainArticles: Article[] = JSON.parse(JSON.stringify(state.articles));
          DataLayer.saveArticles(plainArticles);
        }
      })
      .addCase(refreshFeed.fulfilled, (state, action) => {
        if (action.payload.articles && action.payload.articles.length > 0) {
          const newArticles = action.payload.articles.filter(
            newArticle => !state.articles.some(existingArticle => existingArticle.url === newArticle.url)
          );

          state.articles.push(...newArticles);

          // Cleanup old articles for this feed async - create a plain copy
          const currentFeedArticleUrls = new Set(action.payload.articles.map((a: Article) => a.url));
          const plainArticles: Article[] = JSON.parse(JSON.stringify(state.articles));
          DataLayer.cleanupOldArticles(plainArticles, currentFeedArticleUrls).then(cleanedArticles => {
            // Update state immediately with cleaned articles
            state.articles = cleanedArticles;
          });

          // Save to database async - create a plain copy
          DataLayer.saveArticles(plainArticles);
        }
      })
      .addCase(importFeeds.fulfilled, (state, action) => {
        // action.payload is an array of results
        const allNewArticles: Article[] = [];

        action.payload.forEach(result => {
          if (result.articles && result.articles.length > 0) {
            allNewArticles.push(...result.articles);
          }
        });

        if (allNewArticles.length > 0) {
          const filteredNewArticles = allNewArticles.filter(
            newArticle => !state.articles.some(existingArticle => existingArticle.url === newArticle.url)
          );
          state.articles.push(...filteredNewArticles);
          // Save to database async - create a plain copy
          const plainArticles: Article[] = JSON.parse(JSON.stringify(state.articles));
          DataLayer.saveArticles(plainArticles);
        }
      })
      .addCase(refreshAllFeeds.fulfilled, (state, action) => {
        // action.payload is now an array of results per feed
        const allNewArticles: Article[] = [];
        const allCurrentFeedUrls = new Set<string>();

        action.payload.forEach(result => {
          if (result.newArticles && result.newArticles.length > 0) {
            allNewArticles.push(...result.newArticles);
            // Collect URLs from freshly fetched RSS data
            result.newArticles.forEach(article => {
              if (article.url) {
                allCurrentFeedUrls.add(article.url);
              }
            });
          }
        });

        if (allNewArticles.length > 0) {
          const filteredNewArticles = allNewArticles.filter(
            newArticle => !state.articles.some(existingArticle => existingArticle.url === newArticle.url)
          );
          state.articles.push(...filteredNewArticles);

          // Cleanup old articles async - create a plain copy
          // Use URLs from freshly fetched RSS data, not existing state
          const plainArticles: Article[] = JSON.parse(JSON.stringify(state.articles));
          DataLayer.cleanupOldArticles(plainArticles, allCurrentFeedUrls).then(cleanedArticles => {
            // Update state immediately with cleaned articles
            state.articles = cleanedArticles;
          });

          // Save to database async - create a plain copy
          DataLayer.saveArticles(plainArticles);
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