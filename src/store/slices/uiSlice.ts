import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DataLayer } from '@/services/dataLayer';

interface UIState {
  selectedFeed: string | null;
  selectedArticle: string | null;
  sortMode: 'chronological' | 'unreadOnTop';
  accentColor: string;
  initialLoading: boolean;
  mobileActionbarPadding: boolean;
  refreshLimitInterval: number; // in minutes, 0 means no limit
  feedFetchTime: number | null; // timestamp when feeds were last fetched
}

const getInitialMobileActionbarPadding = (): boolean => {
  try {
    const stored = localStorage.getItem('mobileActionbarPadding');
    return stored ? JSON.parse(stored) : true;
  } catch {
    return true;
  }
};

const initialState: UIState = {
  selectedFeed: null,
  selectedArticle: null,
  sortMode: 'chronological',
  accentColor: '46 87% 65%',
  initialLoading: true,
  mobileActionbarPadding: getInitialMobileActionbarPadding(),
  refreshLimitInterval: 0, // Default to 0 (no limit)
  feedFetchTime: null, // No feeds fetched yet
};

// Async thunk to load user settings
export const loadUserSettings = createAsyncThunk(
  'ui/loadUserSettings',
  async (_, { dispatch }) => {
    const data = await DataLayer.loadAllProfileData();
    return data;
  }
);

// Async thunk to update feed fetch time
export const updateFeedFetchTime = createAsyncThunk(
  'ui/updateFeedFetchTime',
  async (_, { getState }) => {
    const state = getState() as { ui: UIState };
    const newFetchTime = Date.now();

    // Save to database
    await DataLayer.saveFeedFetchTime(newFetchTime);

    return newFetchTime;
  }
);

// Async thunk to check if feeds should be fetched
export const checkFeedFetchStatus = createAsyncThunk(
  'ui/checkFeedFetchStatus',
  async (_, { getState }) => {
    const state = getState() as { ui: UIState };
    const { refreshLimitInterval, feedFetchTime } = state.ui;

    // If no refresh limit, always fetch
    if (refreshLimitInterval === 0) {
      return { shouldFetch: true, reason: 'no_limit' };
    }

    // If no fetch time recorded, should fetch
    if (!feedFetchTime) {
      return { shouldFetch: true, reason: 'never_fetched' };
    }

    const now = Date.now();
    const timeSinceLastFetch = now - feedFetchTime;
    const refreshLimitMs = refreshLimitInterval * 60 * 1000;

    const shouldFetch = timeSinceLastFetch >= refreshLimitMs;
    return {
      shouldFetch,
      reason: shouldFetch ? 'refresh_limit_exceeded' : 'within_limit',
      timeSinceLastFetch,
      refreshLimitMs
    };
  }
);

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    selectFeed: (state, action: PayloadAction<string>) => {
      state.selectedFeed = action.payload;
      state.selectedArticle = null; // Clear selected article when changing feeds
    },
    selectArticle: (state, action: PayloadAction<string | null>) => {
      state.selectedArticle = action.payload;
    },
    toggleSortMode: (state) => {
      state.sortMode = state.sortMode === 'chronological' ? 'unreadOnTop' : 'chronological';
      DataLayer.saveSortMode(state.sortMode);
    },
    setSortMode: (state, action: PayloadAction<'chronological' | 'unreadOnTop'>) => {
      state.sortMode = action.payload;
      DataLayer.saveSortMode(state.sortMode);
    },
    setAccentColor: (state, action: PayloadAction<string>) => {
      state.accentColor = action.payload;
      DataLayer.saveAccentColor(action.payload);
    },
    setInitialLoading: (state, action: PayloadAction<boolean>) => {
      state.initialLoading = action.payload;
    },
    setMobileActionbarPadding: (state, action: PayloadAction<boolean>) => {
      state.mobileActionbarPadding = action.payload;
      localStorage.setItem('mobileActionbarPadding', JSON.stringify(action.payload));
    },
    setRefreshLimitInterval: (state, action: PayloadAction<number>) => {
      state.refreshLimitInterval = action.payload;
      DataLayer.saveRefreshLimitInterval(action.payload);
    },
    setFeedFetchTime: (state, action: PayloadAction<number | null>) => {
      state.feedFetchTime = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUserSettings.fulfilled, (state, action) => {
        state.sortMode = action.payload.sortMode;
        state.accentColor = action.payload.accentColor;
        state.refreshLimitInterval = action.payload.refreshLimitInterval || 0;
        state.feedFetchTime = action.payload.feedFetchTime || null;
        // mobileActionbarPadding is handled locally via localStorage
      })
      .addCase(updateFeedFetchTime.fulfilled, (state, action) => {
        state.feedFetchTime = action.payload;
      });
  },
});

export const {
  selectFeed,
  selectArticle,
  toggleSortMode,
  setSortMode,
  setAccentColor,
  setInitialLoading,
  setMobileActionbarPadding,
  setRefreshLimitInterval,
  setFeedFetchTime,
} = uiSlice.actions;

export default uiSlice.reducer;