import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import uiReducer, {
  selectFeed,
  selectArticle,
  toggleSortMode,
  setAccentColor,
  setInitialLoading,
  loadUserSettings,
} from '../uiSlice'

describe('uiSlice', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        ui: uiReducer,
      },
    })
  })

  it('should handle initial state', () => {
    const state = uiReducer(undefined, { type: '@@INIT' })
    expect(state).toEqual({
      selectedFeed: null,
      selectedArticle: null,
      sortMode: 'chronological',
      accentColor: '46 87% 65%',
      initialLoading: true,
    })
  })

  it('should handle selectFeed', () => {
    const state = uiReducer(undefined, selectFeed('feed-1'))
    expect(state.selectedFeed).toBe('feed-1')
  })

  it('should handle selectArticle', () => {
    const state = uiReducer(undefined, selectArticle('article-1'))
    expect(state.selectedArticle).toBe('article-1')
  })

  it('should handle toggleSortMode from chronological to unreadOnTop', () => {
    const state = uiReducer(undefined, toggleSortMode())
    expect(state.sortMode).toBe('unreadOnTop')
  })

  it('should handle toggleSortMode from unreadOnTop to chronological', () => {
    const initialState = uiReducer(undefined, toggleSortMode())
    const state = uiReducer(initialState, toggleSortMode())
    expect(state.sortMode).toBe('chronological')
  })

  it('should handle setAccentColor', () => {
    const newColor = '120 60% 50%'
    const state = uiReducer(undefined, setAccentColor(newColor))
    expect(state.accentColor).toBe(newColor)
  })

  it('should handle setInitialLoading', () => {
    const state = uiReducer(undefined, setInitialLoading(false))
    expect(state.initialLoading).toBe(false)
  })

  it('should handle loadUserSettings fulfilled', () => {
    const mockSettings = {
      sortMode: 'unreadOnTop' as const,
      accentColor: '200 80% 60%'
    }

    const state = uiReducer(undefined, {
      type: loadUserSettings.fulfilled.type,
      payload: mockSettings,
      meta: {} as any
    })

    expect(state.sortMode).toBe('unreadOnTop')
    expect(state.accentColor).toBe('200 80% 60%')
  })
})