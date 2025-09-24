import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth, AuthProvider } from '../useAuth'
import { ReactNode } from 'react'

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id', email: 'test@example.com' } },
        error: null
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id', email: 'test@example.com' } },
        error: null
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id', email: 'test@example.com' } },
        error: null
      }),
      signOut: vi.fn().mockResolvedValue({
        error: null
      })
    }
  }
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth', () => {
  it('should provide auth context', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await waitFor(() => {
      expect(result.current.user).toBeDefined()
      expect(result.current.loading).toBe(false)
    })
  })

  it('should provide signIn function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(typeof result.current.signIn).toBe('function')
  })

  it('should provide signUp function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(typeof result.current.signUp).toBe('function')
  })

  it('should provide signOut function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(typeof result.current.signOut).toBe('function')
  })
})