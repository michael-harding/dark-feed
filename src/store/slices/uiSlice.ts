import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DataLayer } from '@/services/dataLayer';

interface UIState {
  selectedFeed: string | null;
  selectedArticle: string | null;
  sortMode: 'chronological' | 'unreadOnTop';
  accentColor: string;
  initialLoading: boolean;
}

const initialState: UIState = {
  selectedFeed: 'all',
  selectedArticle: null,
  sortMode: DataLayer.loadSortMode(),
  accentColor: DataLayer.loadAccentColor(),
  initialLoading: true,
};

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
  },
});

export const {
  selectFeed,
  selectArticle,
  toggleSortMode,
  setSortMode,
  setAccentColor,
  setInitialLoading,
} = uiSlice.actions;

export default uiSlice.reducer;