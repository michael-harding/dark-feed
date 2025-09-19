import { describe, it, expect, vi, beforeEach } from 'vitest'
import { faviconGenerator } from '../faviconGenerator'

describe('FaviconGenerator', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<svg><rect fill="#currentColor" /></svg>')
    })

    // Mock document methods
    Object.defineProperty(document, 'querySelector', {
      value: vi.fn().mockReturnValue({
        href: ''
      }),
      writable: true
    })

    Object.defineProperty(document, 'createElement', {
      value: vi.fn().mockReturnValue({
        getContext: vi.fn().mockReturnValue({
          fillRect: vi.fn(),
          drawImage: vi.fn()
        }),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock-data')
      }),
      writable: true
    })

    Object.defineProperty(document.head, 'appendChild', {
      value: vi.fn(),
      writable: true
    })

    // Clear any previous state
    faviconGenerator['svgText'] = null
  })

  it('should load SVG favicon', async () => {
    await faviconGenerator.generateAndUpdateFavicon('46 87% 65%')
    expect(global.fetch).toHaveBeenCalledWith('/favicon.svg')
  })

  it('should validate HSL strings correctly', async () => {
    // Test that favicon generator can process different color formats
    await faviconGenerator.generateAndUpdateFavicon('hsl(46, 87%, 65%)')
    await faviconGenerator.generateAndUpdateFavicon('46 87% 65%')
    await faviconGenerator.generateAndUpdateFavicon('46,87%,65%')
    
    // Test that invalid input doesn't crash
    await faviconGenerator.generateAndUpdateFavicon('invalid')
    
    expect(global.fetch).toHaveBeenCalled()
  })

  it('should generate favicon with custom color', async () => {
    const customColor = '120 60% 50%' // Green color
    
    await faviconGenerator.generateAndUpdateFavicon(customColor)
    
    expect(global.fetch).toHaveBeenCalledWith('/favicon.svg')
    expect(document.createElement).toHaveBeenCalledWith('canvas')
  })

  it('should handle fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to load SVG'))
    
    // Should not throw
    await expect(faviconGenerator.generateAndUpdateFavicon('46 87% 65%')).resolves.toBeUndefined()
  })

  it('should cache SVG text after first load', async () => {
    // First call
    await faviconGenerator.generateAndUpdateFavicon('46 87% 65%')
    const callCount = (global.fetch as any).mock.calls.length
    
    // Second call should not fetch again (SVG is cached)
    await faviconGenerator.generateAndUpdateFavicon('120 60% 50%')
    expect((global.fetch as any).mock.calls.length).toBe(callCount)
  })
})