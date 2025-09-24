import { configureStore } from '@reduxjs/toolkit';
import feedsReducer from './slices/feedsSlice';
import articlesReducer from './slices/articlesSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    feeds: feedsReducer,
    articles: articlesReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['payload.currentFeedArticleUrls'],
        // Ignore these paths in the state
        ignoredPaths: ['articles.articles.publishedAt'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;