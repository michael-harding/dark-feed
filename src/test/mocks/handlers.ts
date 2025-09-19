import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock RSS2JSON API
  http.get('https://api.rss2json.com/v1/api.json', ({ request }) => {
    const url = new URL(request.url)
    const rssUrl = url.searchParams.get('rss_url')
    
    return HttpResponse.json({
      status: 'ok',
      feed: {
        title: 'Test Feed',
        description: 'A test RSS feed',
        link: rssUrl,
      },
      items: [
        {
          title: 'Test Article 1',
          description: 'Test article description',
          content: 'Test article content',
          link: 'https://example.com/article1',
          pubDate: '2024-01-01T00:00:00Z',
          author: 'Test Author',
        },
        {
          title: 'Test Article 2',
          description: 'Another test article description',
          content: 'Another test article content',
          link: 'https://example.com/article2',
          pubDate: '2024-01-02T00:00:00Z',
          author: 'Test Author 2',
        },
      ],
    })
  }),

  // Mock Supabase requests
  http.post('https://ikgvqchqplmyifwhzkdc.supabase.co/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
      },
    })
  }),

  http.get('https://ikgvqchqplmyifwhzkdc.supabase.co/rest/v1/feeds', () => {
    return HttpResponse.json([
      {
        id: 'feed-1',
        title: 'Test Feed 1',
        url: 'https://example.com/feed1.xml',
        unread_count: 5,
        category: 'Tech',
        user_id: 'mock-user-id',
      },
    ])
  }),

  http.get('https://ikgvqchqplmyifwhzkdc.supabase.co/rest/v1/articles', () => {
    return HttpResponse.json([
      {
        id: 'article-1',
        title: 'Test Article 1',
        description: 'Test description',
        content: 'Test content',
        url: 'https://example.com/article1',
        published_at: '2024-01-01T00:00:00Z',
        feed_id: 'feed-1',
        feed_title: 'Test Feed 1',
        is_read: false,
        is_starred: false,
        is_bookmarked: false,
        author: 'Test Author',
        sort_order: 0,
        user_id: 'mock-user-id',
      },
    ])
  }),

  http.get('https://ikgvqchqplmyifwhzkdc.supabase.co/rest/v1/user_settings', () => {
    return HttpResponse.json([
      {
        id: 'settings-1',
        user_id: 'mock-user-id',
        sort_mode: 'chronological',
        accent_color: '46 87% 65%',
      },
    ])
  }),
]