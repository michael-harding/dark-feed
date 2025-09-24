import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils/test-utils'
import { ArticleList } from '../ArticleList'
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

const defaultProps = {
  articles: mockArticles,
  selectedArticle: null,
  onArticleSelect: vi.fn(),
  onToggleStar: vi.fn(),
  onToggleBookmark: vi.fn(),
  onMarkAsRead: vi.fn(),
  sortMode: 'chronological' as const,
  onToggleSortMode: vi.fn(),
}

describe('ArticleList', () => {
  it('renders articles list', () => {
    render(<ArticleList {...defaultProps} />)
    
    expect(screen.getByText('Test Article 1')).toBeInTheDocument()
    expect(screen.getByText('Test Article 2')).toBeInTheDocument()
  })

  it('shows empty state when no articles', () => {
    render(<ArticleList {...defaultProps} articles={[]} />)
    
    expect(screen.getByText('No articles available')).toBeInTheDocument()
  })

  it('calls onArticleSelect when article is clicked', () => {
    const onArticleSelect = vi.fn()
    render(<ArticleList {...defaultProps} onArticleSelect={onArticleSelect} />)
    
    fireEvent.click(screen.getByText('Test Article 1'))
    expect(onArticleSelect).toHaveBeenCalledWith('article-1')
  })

  it('calls onToggleStar when star button is clicked', () => {
    const onToggleStar = vi.fn()
    render(<ArticleList {...defaultProps} onToggleStar={onToggleStar} />)
    
    const starButtons = screen.getAllByRole('button', { name: /star/i })
    fireEvent.click(starButtons[0])
    expect(onToggleStar).toHaveBeenCalledWith('article-1')
  })

  it('calls onToggleBookmark when bookmark button is clicked', () => {
    const onToggleBookmark = vi.fn()
    render(<ArticleList {...defaultProps} onToggleBookmark={onToggleBookmark} />)
    
    const bookmarkButtons = screen.getAllByRole('button', { name: /bookmark/i })
    fireEvent.click(bookmarkButtons[0])
    expect(onToggleBookmark).toHaveBeenCalledWith('article-1')
  })

  it('calls onToggleSortMode when sort button is clicked', () => {
    const onToggleSortMode = vi.fn()
    render(<ArticleList {...defaultProps} onToggleSortMode={onToggleSortMode} />)
    
    const sortButton = screen.getByRole('button', { name: /sort/i })
    fireEvent.click(sortButton)
    expect(onToggleSortMode).toHaveBeenCalled()
  })

  it('highlights selected article', () => {
    render(<ArticleList {...defaultProps} selectedArticle="article-1" />)
    
    const selectedArticle = screen.getByText('Test Article 1').closest('[data-testid="article-item"]')
    expect(selectedArticle).toHaveClass('bg-accent')
  })

  it('shows different styles for read and unread articles', () => {
    render(<ArticleList {...defaultProps} />)
    
    const unreadArticle = screen.getByText('Test Article 1')
    const readArticle = screen.getByText('Test Article 2')
    
    expect(unreadArticle).toHaveClass('font-semibold')
    expect(readArticle).not.toHaveClass('font-semibold')
  })

  it('shows star icon for starred articles', () => {
    render(<ArticleList {...defaultProps} />)
    
    const starredArticleContainer = screen.getByText('Test Article 2').closest('[data-testid="article-item"]')
    expect(starredArticleContainer?.querySelector('[data-lucide="star"]')).toBeInTheDocument()
  })
})