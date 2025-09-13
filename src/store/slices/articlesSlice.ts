import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DataLayer, Article } from '@/services/dataLayer';
import { addFeed, refreshFeed, refreshAllFeeds, setFeedUnreadCount } from './feedsSlice';

interface ArticlesState {
  articles: Article[];
  filteredArticles: Article[];
}

const initialState: ArticlesState = {
  articles: DataLayer.loadArticles(),
  filteredArticles: [],
};

const articlesSlice = createSlice({
  name: 'articles',
  initialState,
  reducers: {
    toggleStar: (state, action: PayloadAction<string>) => {
      const articleId = action.payload;
      const article = state.articles.find(a => a.id === articleId);
      if (article) {
        article.isStarred = !article.isStarred;
        DataLayer.saveArticles(state.articles);
      }
      // Update filtered articles too
      const filteredArticle = state.filteredArticles.find(a => a.id === articleId);
      if (filteredArticle) {
        filteredArticle.isStarred = !filteredArticle.isStarred;
      }
    },
    toggleBookmark: (state, action: PayloadAction<string>) => {
      const articleId = action.payload;
      const article = state.articles.find(a => a.id === articleId);
      if (article) {
        article.isBookmarked = !article.isBookmarked;
        DataLayer.saveArticles(state.articles);
      }
      // Update filtered articles too
      const filteredArticle = state.filteredArticles.find(a => a.id === articleId);
      if (filteredArticle) {
        filteredArticle.isBookmarked = !filteredArticle.isBookmarked;
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const articleId = action.payload;
      const article = state.articles.find(a => a.id === articleId);
      if (article) {
        article.isRead = !article.isRead;
        DataLayer.saveArticles(state.articles);
      }
      // Update filtered articles too
      const filteredArticle = state.filteredArticles.find(a => a.id === articleId);
      if (filteredArticle) {
        filteredArticle.isRead = !filteredArticle.isRead;
      }
    },
    removeArticlesByFeed: (state, action: PayloadAction<string>) => {
      const feedId = action.payload;
      state.articles = state.articles.filter(article => article.feedId !== feedId);
      state.filteredArticles = state.filteredArticles.filter(article => article.feedId !== feedId);
      DataLayer.saveArticles(state.articles);
    },
    updateArticlesFeedTitle: (state, action: PayloadAction<{ feedId: string; newTitle: string }>) => {
      const { feedId, newTitle } = action.payload;
      state.articles.forEach(article => {
        if (article.feedId === feedId) {
          article.feedTitle = newTitle;
        }
      });
      state.filteredArticles.forEach(article => {
        if (article.feedId === feedId) {
          article.feedTitle = newTitle;
        }
      });
      DataLayer.saveArticles(state.articles);
    },
    markAllAsReadForFeed: (state, action: PayloadAction<string>) => {
      const feedId = action.payload;
      state.articles.forEach(article => {
        if (article.feedId === feedId) {
          article.isRead = true;
        }
      });
      state.filteredArticles.forEach(article => {
        if (article.feedId === feedId) {
          article.isRead = true;
        }
      });
      DataLayer.saveArticles(state.articles);
    },
    updateFilteredArticles: (state, action: PayloadAction<{ selectedFeed: string | null; sortMode: 'chronological' | 'unreadOnTop' }>) => {
      const { selectedFeed, sortMode } = action.payload;
      const filtered = DataLayer.filterArticles(state.articles, selectedFeed);
      state.filteredArticles = DataLayer.setSortOrderForArticles(filtered, sortMode);
    },
    cleanupOldArticles: (state, action: PayloadAction<Set<string>>) => {
      const currentFeedArticleUrls = action.payload;
      const cleanedArticles = DataLayer.cleanupOldArticles(state.articles, currentFeedArticleUrls);
      state.articles = cleanedArticles;
      DataLayer.saveArticles(state.articles);
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle new articles from add feed
      .addCase(addFeed.fulfilled, (state, action) => {
        state.articles.push(...action.payload.articles);
        DataLayer.saveArticles(state.articles);
      })
      // Handle new articles from refresh feed
      .addCase(refreshFeed.fulfilled, (state, action) => {
        const { newArticles, feed } = action.payload;

        if (newArticles.length > 0) {
          state.articles.push(...newArticles);
          DataLayer.saveArticles(state.articles);

          // Recalculate unread count for this feed
          const feedArticles = state.articles.filter(a => a.feedId === feed.id);
          const unreadCount = feedArticles.filter(a => !a.isRead).length;
          setFeedUnreadCount({ feedId: feed.id, count: unreadCount });
        }
      })
      // Handle new articles from refresh all feeds
      .addCase(refreshAllFeeds.fulfilled, (state, action) => {
        const results = action.payload;
        let totalNewArticles = 0;
        const affectedFeeds = new Set<string>();

        results.forEach(({ newArticles, feed }) => {
          if (newArticles.length > 0 && !feed.error) {
            state.articles.push(...newArticles);
            totalNewArticles += newArticles.length;
            affectedFeeds.add(feed.id);
          }
        });

        if (totalNewArticles > 0) {
          DataLayer.saveArticles(state.articles);

          // Recalculate unread counts for affected feeds
          affectedFeeds.forEach(feedId => {
            const feedArticles = state.articles.filter(a => a.feedId === feedId);
            const unreadCount = feedArticles.filter(a => !a.isRead).length;
            setFeedUnreadCount({ feedId, count: unreadCount });
          });
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