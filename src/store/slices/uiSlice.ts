import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DataLayer } from '@/services/dataLayer';

interface UIState {
  selectedFeed: string | null;
  selectedArticle: string | null;
  sortMode: 'chronological' | 'unreadOnTop';
  accentColor: string;
  initialLoading: boolean;
  mobileActionbarPadding: boolean;
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
};

// Async thunk to load user settings
export const loadUserSettings = createAsyncThunk(
  'ui/loadUserSettings',
  async () => {
    return await DataLayer.loadAllProfileData();
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUserSettings.fulfilled, (state, action) => {
        state.sortMode = action.payload.sortMode;
        state.accentColor = action.payload.accentColor;
        // mobileActionbarPadding is handled locally via localStorage
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
} = uiSlice.actions;

export default uiSlice.reducer;