import { describe, it, expect } from 'vitest'
import { cn, parsePublishedDate } from '../utils'

describe('utils', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3')
    })

    it('should handle Tailwind conflicts', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2') // Later class should override
    })

    it('should handle empty inputs', () => {
      expect(cn()).toBe('')
      expect(cn('')).toBe('')
      expect(cn(null, undefined)).toBe('')
    })
  })

  describe('parsePublishedDate function', () => {
    it('should parse ISO date string', () => {
      const dateString = '2024-01-01T00:00:00Z'
      const result = parsePublishedDate(dateString)
      
      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(0) // January is 0
      expect(result.getDate()).toBe(1)
    })

    it('should parse different date formats', () => {
      const testCases = [
        '2024-01-01',
        'Mon, 01 Jan 2024 00:00:00 GMT',
        '01 Jan 2024 00:00:00 GMT',
      ]

      testCases.forEach(dateString => {
        const result = parsePublishedDate(dateString)
        expect(result).toBeInstanceOf(Date)
        expect(result.getFullYear()).toBe(2024)
      })
    })

    it('should handle invalid date strings', () => {
      const result = parsePublishedDate('invalid-date')
      expect(result.toString()).toBe('Invalid Date')
    })
  })
})