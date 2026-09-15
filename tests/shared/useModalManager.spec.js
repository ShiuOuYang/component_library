import { beforeEach, describe, expect, it, vi } from 'vitest'

/** 狀態是 module-scoped 單例，每個測試重新載入模組 */
async function fresh() {
  vi.resetModules()
  return import('@/components/library/shared/useModalManager')
}

describe('useModalManager', () => {
  let generateModalId
  let manager

  beforeEach(async () => {
    const mod = await fresh()
    generateModalId = mod.generateModalId
    manager = mod.useModalManager()
  })

  describe('id 產生', () => {
    it('每次呼叫產生不重複的 id', () => {
      const ids = new Set([generateModalId(), generateModalId(), generateModalId()])
      expect(ids.size).toBe(3)
    })
  })

  describe('z-index 管理', () => {
    it('未註冊的 modal 回傳基準值', () => {
      expect(manager.getZIndex('unknown')).toBe(100)
    })

    it('註冊後 z-index 高於基準值', () => {
      manager.registerZIndex('a')
      expect(manager.getZIndex('a')).toBeGreaterThan(100)
    })

    it('後註冊的疊在先註冊的上面', () => {
      manager.registerZIndex('a')
      manager.registerZIndex('b')
      expect(manager.getZIndex('b')).toBeGreaterThan(manager.getZIndex('a'))
    })

    it('重複註冊同一個 id 不會改變層級', () => {
      manager.registerZIndex('a')
      const first = manager.getZIndex('a')
      manager.registerZIndex('a')
      expect(manager.getZIndex('a')).toBe(first)
    })

    it('bringToFront 把指定的 modal 拉到最上層', () => {
      manager.registerZIndex('a')
      manager.registerZIndex('b')
      expect(manager.getZIndex('a')).toBeLessThan(manager.getZIndex('b'))

      manager.bringToFront('a')
      expect(manager.getZIndex('a')).toBeGreaterThan(manager.getZIndex('b'))
    })

    it('已在最上層時 bringToFront 不會無限墊高', () => {
      manager.registerZIndex('a')
      const before = manager.getZIndex('a')

      manager.bringToFront('a')
      manager.bringToFront('a')
      manager.bringToFront('a')

      expect(manager.getZIndex('a')).toBe(before)
    })

    it('unregisterZIndex 後回到基準值', () => {
      manager.registerZIndex('a')
      manager.unregisterZIndex('a')
      expect(manager.getZIndex('a')).toBe(100)
    })
  })

  describe('最小化口袋', () => {
    const makeInfo = (id) => ({
      id,
      title: `視窗 ${id}`,
      headerBgColor: 'bg-white',
      restore: vi.fn(),
      close: vi.fn(),
    })

    it('註冊後出現在清單中', () => {
      manager.registerMinimized(makeInfo('a'))
      expect(manager.minimizedCount.value).toBe(1)
      expect(manager.minimizedList.value[0].title).toBe('視窗 a')
    })

    it('同一個 id 重複註冊不會產生兩筆', () => {
      manager.registerMinimized(makeInfo('a'))
      manager.registerMinimized(makeInfo('a'))
      expect(manager.minimizedCount.value).toBe(1)
    })

    it('unregisterMinimized 移除指定項', () => {
      manager.registerMinimized(makeInfo('a'))
      manager.registerMinimized(makeInfo('b'))
      manager.unregisterMinimized('a')

      expect(manager.minimizedCount.value).toBe(1)
      expect(manager.minimizedList.value[0].id).toBe('b')
    })

    it('restoreModal 呼叫該項的 restore', () => {
      const info = makeInfo('a')
      manager.registerMinimized(info)
      manager.restoreModal('a')
      expect(info.restore).toHaveBeenCalledTimes(1)
    })

    it('closeModal 呼叫該項的 close', () => {
      const info = makeInfo('a')
      manager.registerMinimized(info)
      manager.closeModal('a')
      expect(info.close).toHaveBeenCalledTimes(1)
    })

    it('對不存在的 id 操作不會出錯', () => {
      expect(() => manager.restoreModal('nope')).not.toThrow()
      expect(() => manager.closeModal('nope')).not.toThrow()
    })

    it('restoreAll 還原所有最小化的視窗', () => {
      const a = makeInfo('a')
      const b = makeInfo('b')
      manager.registerMinimized(a)
      manager.registerMinimized(b)

      manager.restoreAll()
      expect(a.restore).toHaveBeenCalledTimes(1)
      expect(b.restore).toHaveBeenCalledTimes(1)
    })

    it('closeAll 關閉所有最小化的視窗', () => {
      const a = makeInfo('a')
      const b = makeInfo('b')
      manager.registerMinimized(a)
      manager.registerMinimized(b)

      manager.closeAll()
      expect(a.close).toHaveBeenCalledTimes(1)
      expect(b.close).toHaveBeenCalledTimes(1)
    })

    it('closeAll 時 close 內部若反過來移除自己也不會漏掉', () => {
      // 實作先把 Map 轉成陣列再走訪，避免迭代中修改 Map
      const a = { ...makeInfo('a') }
      const b = { ...makeInfo('b') }
      a.close = vi.fn(() => manager.unregisterMinimized('a'))
      b.close = vi.fn(() => manager.unregisterMinimized('b'))

      manager.registerMinimized(a)
      manager.registerMinimized(b)
      manager.closeAll()

      expect(a.close).toHaveBeenCalledTimes(1)
      expect(b.close).toHaveBeenCalledTimes(1)
      expect(manager.minimizedCount.value).toBe(0)
    })
  })
})
