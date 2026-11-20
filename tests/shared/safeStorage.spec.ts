import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStoredJSON, readStoredString, removeStored, writeStoredJSON, writeStoredString } from '@/components/library/shared/safeStorage'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('safeStorage', () => {
  it('字串與 JSON 的讀寫、刪除', () => {
    expect(writeStoredString('k', 'v')).toBe(true)
    expect(readStoredString('k')).toBe('v')
    expect(readStoredString('missing')).toBeNull()
    expect(writeStoredJSON('j', { a: [1, 2] })).toBe(true)
    expect(readStoredJSON('j', {})).toEqual({ a: [1, 2] })
    removeStored('j')
    expect(readStoredJSON('j', 'fallback')).toBe('fallback')
  })

  it('壞掉的 JSON 或 accept 不合格時回傳 fallback', () => {
    localStorage.setItem('bad', '{oops')
    expect(readStoredJSON('bad', [])).toEqual([])
    localStorage.setItem('obj', '{"a":1}')
    expect(readStoredJSON('obj', [], Array.isArray)).toEqual([])
  })

  it('localStorage 丟錯時不丟錯（私密瀏覽、空間已滿）', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(readStoredString('k')).toBeNull()
    expect(readStoredJSON('k', 1)).toBe(1)
    expect(writeStoredString('k', 'v')).toBe(false)
    expect(writeStoredJSON('k', 1)).toBe(false)
    expect(() => removeStored('k')).not.toThrow()
  })

  it('無法序列化的值（循環參照）寫入失敗但不丟錯', () => {
    const a: Record<string, unknown> = {}
    a.self = a
    expect(writeStoredJSON('c', a)).toBe(false)
  })

  it('沒有 localStorage（SSR）或讀取屬性就丟錯時當作沒有', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(readStoredString('k')).toBeNull()
    expect(writeStoredString('k', 'v')).toBe(false)
    vi.unstubAllGlobals()
    const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    try {
      expect(readStoredString('k')).toBeNull()
      expect(writeStoredString('k', 'v')).toBe(false)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', desc)
    }
  })
})
