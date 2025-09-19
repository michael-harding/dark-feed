import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DataLayer, Article, Feed } from '../dataLayer'

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id' } }
      })
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          })),
          single: vi.fn(() => ({
            data: { sort_mode: 'chronological', accent_color: '46 87% 65%' },
            error: null
          }))
        }))
      })),
      upsert: vi.fn(() => ({
        data: null,
        error: null
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }
}))

describe('DataLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('RSS Feed Operations', () => {
    it('should fetch RSS feed data', async () => {
      const mockFeedData = {
        status: 'ok',
        feed: { title: 'Test Feed' },
        items: [
          {
            title: 'Test Article',
            description: 'Test description',
            link: 'https://example.com/article',
            pubDate: '2024-01-01T00:00:00Z',
            author: 'Test Author'
          }
        ]
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFeedData)
      })

      const result = await DataLayer.fetchRSSFeed('https://example.com/feed.xml')
      expect(result).toEqual(mockFeedData)
    })

    it('should handle RSS feed fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(DataLayer.fetchRSSFeed('https://example.com/invalid-feed.xml'))
        .rejects.toThrow('HTTP error! status: 404')
    })
  })

  describe('Article Operations', () => {
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

    it('should filter articles by feed', () => {
      const filtered = DataLayer.filterArticles(mockArticles, 'feed-1')
      expect(filtered).toHaveLength(2)
    })

    it('should filter articles for "all" feed', () => {
      const filtered = DataLayer.filterArticles(mockArticles, 'all')
      expect(filtered).toEqual(mockArticles)
    })

    it('should filter starred articles', () => {
      const filtered = DataLayer.filterArticles(mockArticles, 'starred')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].isStarred).toBe(true)
    })

    it('should filter bookmarked articles', () => {
      const filtered = DataLayer.filterArticles(mockArticles, 'bookmarks')
      expect(filtered).toHaveLength(0) // No bookmarked articles in mock data
    })

    it('should sort articles chronologically', () => {
      const sorted = DataLayer.setSortOrderForArticles(mockArticles, 'chronological')
      expect(sorted[0].publishedAt > sorted[1].publishedAt).toBe(true)
    })

    it('should sort articles with unread on top', () => {
      const sorted = DataLayer.setSortOrderForArticles(mockArticles, 'unreadOnTop')
      expect(sorted[0].isRead).toBe(false) // Unread article should be first
    })
  })

  describe('Data Creation', () => {
    it('should create articles from RSS data', () => {
      const mockRSSData = {
        items: [
          {
            title: 'RSS Article',
            description: 'RSS description',
            content: 'RSS content',
            link: 'https://example.com/rss-article',
            pubDate: '2024-01-01T00:00:00Z',
            author: 'RSS Author'
          }
        ]
      }

      const articles = DataLayer.createArticlesFromRSSData(mockRSSData, 'feed-1', 'Test Feed')
      
      expect(articles).toHaveLength(1)
      expect(articles[0].title).toBe('RSS Article')
      expect(articles[0].feedId).toBe('feed-1')
      expect(articles[0].feedTitle).toBe('Test Feed')
      expect(articles[0].isRead).toBe(false)
    })
  })

  describe('Article Cleanup', () => {
    it('should keep unread articles', async () => {
      const articles: Article[] = [
        {
          id: 'article-1',
          title: 'Unread Article',
          description: 'Test',
          content: 'Test',
          url: 'https://example.com/article1',
          publishedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days old
          feedId: 'feed-1',
          feedTitle: 'Test Feed',
          isRead: false, // Unread
          isStarred: false,
          isBookmarked: false,
          author: 'Test Author',
          sortOrder: 0,
        }
      ]

      const currentUrls = new Set(['https://example.com/article1'])
      const result = await DataLayer.cleanupOldArticles(articles, currentUrls)
      
      expect(result).toHaveLength(1) // Should keep unread article
    })

    it('should keep starred articles', async () => {
      const articles: Article[] = [
        {
          id: 'article-1',
          title: 'Starred Article',
          description: 'Test',
          content: 'Test',
          url: 'https://example.com/article1',
          publishedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days old
          feedId: 'feed-1',
          feedTitle: 'Test Feed',
          isRead: true, // Read
          isStarred: true, // But starred
          isBookmarked: false,
          author: 'Test Author',
          sortOrder: 0,
        }
      ]

      const currentUrls = new Set<string>() // Not in current feed
      const result = await DataLayer.cleanupOldArticles(articles, currentUrls)
      
      expect(result).toHaveLength(1) // Should keep starred article
    })
  })
})