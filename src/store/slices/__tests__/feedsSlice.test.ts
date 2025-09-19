import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import feedsReducer, {
  reorderFeeds,
  setFeedUnreadCount,
  updateFeedUnreadCount,
  markAllAsRead,
  loadFeeds,
  addFeed,
  removeFeed,
  renameFeed,
} from '../feedsSlice'
import { Feed } from '@/services/dataLayer'

const mockFeeds: Feed[] = [
  {
    id: 'feed-1',
    title: 'Test Feed 1',
    url: 'https://example.com/feed1.xml',
    unreadCount: 5,
    category: 'Tech',
  },
  {
    id: 'feed-2',
    title: 'Test Feed 2',
    url: 'https://example.com/feed2.xml',
    unreadCount: 3,
    category: 'News',
  },
]

describe('feedsSlice', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        feeds: feedsReducer,
      },
    })
  })

  it('should handle initial state', () => {
    const state = feedsReducer(undefined, { type: '@@INIT' })
    expect(state).toEqual({
      feeds: [],
      isLoading: false,
      error: null,
    })
  })

  it('should handle reorderFeeds', () => {
    const reorderedFeeds = [mockFeeds[1], mockFeeds[0]]
    const state = feedsReducer({
      feeds: mockFeeds,
      isLoading: false,
      error: null,
    }, reorderFeeds(reorderedFeeds))
    
    expect(state.feeds).toEqual(reorderedFeeds)
  })

  it('should handle setFeedUnreadCount', () => {
    const state = feedsReducer({
      feeds: mockFeeds,
      isLoading: false,
    }, setFeedUnreadCount({ feedId: 'feed-1', count: 10 }))
    
    expect(state.feeds[0].unreadCount).toBe(10)
  })

  it('should handle updateFeedUnreadCount', () => {
    const state = feedsReducer({
      feeds: mockFeeds,
      isLoading: false,
    }, updateFeedUnreadCount({ feedId: 'feed-1', delta: 2 }))
    
    expect(state.feeds[0].unreadCount).toBe(7) // 5 + 2
  })

  it('should handle markAllAsRead', () => {
    const state = feedsReducer({
      feeds: mockFeeds,
      isLoading: false,
    }, markAllAsRead('feed-1'))
    
    expect(state.feeds[0].unreadCount).toBe(0)
  })

  it('should handle loadFeeds pending', () => {
    const state = feedsReducer(undefined, { type: loadFeeds.pending.type, meta: {} as any, payload: undefined })
    expect(state.isLoading).toBe(true)
  })

  it('should handle loadFeeds fulfilled', () => {
    const state = feedsReducer(undefined, { type: loadFeeds.fulfilled.type, payload: mockFeeds, meta: {} as any })
    expect(state.feeds).toEqual(mockFeeds)
    expect(state.isLoading).toBe(false)
  })

  it('should handle addFeed fulfilled', () => {
    const newFeed = {
      id: 'feed-3',
      title: 'New Feed',
      url: 'https://example.com/feed3.xml',
      unreadCount: 0,
    }
    
    const state = feedsReducer(undefined, { 
      type: addFeed.fulfilled.type, 
      payload: { feed: newFeed, articles: [] },
      meta: {} as any
    })
    
    expect(state.feeds).toContainEqual(newFeed)
  })

  it('should handle removeFeed', () => {
    const state = feedsReducer({
      feeds: mockFeeds,
      isLoading: false,
    }, removeFeed('feed-1'))
    
    expect(state.feeds).toHaveLength(1)
    expect(state.feeds[0].id).toBe('feed-2')
  })

  it('should handle renameFeed', () => {
    const state = feedsReducer({
      feeds: mockFeeds,
      isLoading: false,
    }, renameFeed({ id: 'feed-1', newTitle: 'Renamed Feed' }))
    
    expect(state.feeds[0].title).toBe('Renamed Feed')
  })
})