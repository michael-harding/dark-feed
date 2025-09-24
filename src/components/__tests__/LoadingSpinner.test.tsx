import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import { LoadingSpinner } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('h-4', 'w-4')
  })

  it('renders with small size', () => {
    render(<LoadingSpinner size="sm" />)
    
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveClass('h-3', 'w-3')
  })

  it('renders with large size', () => {
    render(<LoadingSpinner size="lg" />)
    
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveClass('h-6', 'w-6')
  })

  it('renders with custom className', () => {
    render(<LoadingSpinner className="custom-class" />)
    
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveClass('custom-class')
  })

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
  })
})