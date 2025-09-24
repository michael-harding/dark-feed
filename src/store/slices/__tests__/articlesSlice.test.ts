import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import articlesReducer, {
  toggleStar,
  toggleBookmark,
  markAsRead,
  removeArticlesByFeed,
  updateArticlesFeedTitle,
  markAllAsReadForFeed,
  updateFilteredArticles,
  loadArticles,
  saveArticles,
  updateArticle,
} from '../articlesSlice'
import { Article } from '@/services/dataLayer'

const mockArticles: Article[] = [
  {
    id: 'article-1',
    title: 'Test Article 1',
    description: 'Test description 1',
    content: 'Test content 1',
    url: 'https://example.com/article1',
    publishedAt: '2024-01-01T00:00:00Z',
    feedId: 'feed-1',
    feedTitle: 'Test Feed',
    isRead: false,
    isStarred: false,
    isBookmarked: false,
    author: 'Test Author',
    sortOrder: 0,
  },
  {
    id: 'article-2',
    title: 'Test Article 2',
    description: 'Test description 2',
    content: 'Test content 2',
    url: 'https://example.com/article2',
    publishedAt: '2024-01-02T00:00:00Z',
    feedId: 'feed-1',
    feedTitle: 'Test Feed',
    isRead: true,
    isStarred: true,
    isBookmarked: false,
    author: 'Test Author 2',
    sortOrder: 1,
  },
]

describe('articlesSlice', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        articles: articlesReducer,
      },
    })
  })

  it('should handle initial state', () => {
    const state = articlesReducer(undefined, { type: '@@INIT' })
    expect(state).toEqual({
      articles: [],
      filteredArticles: [],
      loading: false,
    })
  })

  it('should handle toggleStar', () => {
    // Set initial state
    const initialState = {
      articles: mockArticles,
      filteredArticles: [],
      loading: false,
    }
    store.dispatch({ type: 'articles/test', payload: initialState })

    store.dispatch(toggleStar('article-1'))
    const state = store.getState()
    
    expect((state as any).articles.articles[0].isStarred).toBe(true)
  })

  it('should handle toggleBookmark', () => {
    // Initialize state directly in reducer test
    const state = articlesReducer({
      articles: mockArticles,
      filteredArticles: [],
      loading: false,
    }, toggleBookmark('article-1'))
    
    expect(state.articles[0].isBookmarked).toBe(true)
  })

  it('should handle markAsRead', () => {
    const state = articlesReducer({
      articles: mockArticles,
      filteredArticles: [...mockArticles],
      loading: false,
    }, markAsRead('article-1'))
    
    expect(state.articles[0].isRead).toBe(true)
    expect(state.filteredArticles[0].isRead).toBe(true)
  })

  it('should handle removeArticlesByFeed', () => {
    const state = articlesReducer({
      articles: mockArticles,
      filteredArticles: [],
      loading: false,
    }, removeArticlesByFeed('feed-1'))
    
    expect(state.articles).toHaveLength(0)
  })

  it('should handle updateArticlesFeedTitle', () => {
    const state = articlesReducer({
      articles: mockArticles,
      filteredArticles: [],
      loading: false,
    }, updateArticlesFeedTitle({ feedId: 'feed-1', newTitle: 'New Feed Title' }))
    
    expect(state.articles[0].feedTitle).toBe('New Feed Title')
    expect(state.articles[1].feedTitle).toBe('New Feed Title')
  })

  it('should handle markAllAsReadForFeed', () => {
    const state = articlesReducer({
      articles: mockArticles,
      filteredArticles: [...mockArticles],
      loading: false,
    }, markAllAsReadForFeed('feed-1'))
    
    expect(state.articles[0].isRead).toBe(true)
    expect(state.articles[1].isRead).toBe(true)
    expect(state.filteredArticles[0].isRead).toBe(true)
    expect(state.filteredArticles[1].isRead).toBe(true)
  })

  it('should handle updateFilteredArticles', () => {
    const state = articlesReducer({
      articles: mockArticles,
      filteredArticles: [],
      loading: false,
    }, updateFilteredArticles({ selectedFeed: 'all', sortMode: 'chronological' }))
    
    expect(state.filteredArticles).toHaveLength(2)
  })

  it('should handle loadArticles pending', () => {
    const state = articlesReducer(undefined, { type: loadArticles.pending.type, meta: {} as any, payload: undefined })
    expect(state.loading).toBe(true)
  })

  it('should handle loadArticles fulfilled', () => {
    const state = articlesReducer(undefined, { type: loadArticles.fulfilled.type, payload: mockArticles, meta: {} as any })
    expect(state.articles).toEqual(mockArticles)
    expect(state.loading).toBe(false)
  })

  it('should handle loadArticles rejected', () => {
    const state = articlesReducer(undefined, { type: loadArticles.rejected.type, error: {}, meta: {} as any, payload: undefined })
    expect(state.loading).toBe(false)
  })
})