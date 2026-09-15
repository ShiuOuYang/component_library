import { describe, expect, it, vi } from 'vitest'
import { useFacetBrush } from '@/components/library/charts/composables/faceChart/useFacetBrush'

describe('useFacetBrush', () => {
  describe("handleAxisDrag 的 both 模式（回歸）", () => {
    it('both 模式拖 X 軸會更新該欄的 X domain', () => {
      const api = useFacetBrush()
      api.handleAxisDrag({ axis: 'x', domain: [1, 5] }, 'f', 'both', 0, 2, vi.fn())
      expect(api.colXDomains.value[2]).toEqual([1, 5])
    })

    it('both 模式拖 Y 軸也會更新該列的 Y domain', () => {
      // Bug：原本第二個 syncMode === 'both' 分支永遠不可達（已被 col 分支攔截），
      //      所以 both 模式下拖 Y 軸完全沒有作用。由 TypeScript 的 TS2367 抓到。
      const api = useFacetBrush()
      api.handleAxisDrag({ axis: 'yLeft', domain: [0, 100] }, 'f', 'both', 1, 0, vi.fn())
      expect(api.rowYDomains.value[1]?.yLeft).toEqual([0, 100])
    })

    it('both 模式下 X 與 Y 可各自獨立更新', () => {
      const api = useFacetBrush()
      const emit = vi.fn()

      api.handleAxisDrag({ axis: 'x', domain: [1, 5] }, 'f', 'both', 1, 2, emit)
      api.handleAxisDrag({ axis: 'yRight', domain: [10, 20] }, 'f', 'both', 1, 2, emit)

      expect(api.colXDomains.value[2]).toEqual([1, 5])
      expect(api.rowYDomains.value[1]?.yRight).toEqual([10, 20])
    })

    it('col 模式只處理 X，不動 Y', () => {
      const api = useFacetBrush()
      api.handleAxisDrag({ axis: 'yLeft', domain: [0, 1] }, 'f', 'col', 0, 0, vi.fn())
      expect(api.rowYDomains.value[0]).toBeUndefined()
    })

    it('row 模式只處理 Y，不動 X', () => {
      const api = useFacetBrush()
      api.handleAxisDrag({ axis: 'x', domain: [0, 1] }, 'f', 'row', 0, 0, vi.fn())
      expect(api.colXDomains.value[0]).toBeUndefined()
    })

    it('沒有 domain 時仍會發出事件但不改狀態', () => {
      const api = useFacetBrush()
      const emit = vi.fn()

      api.handleAxisDrag({ axis: 'x' }, 'f', 'all', 0, 0, emit)

      expect(emit).toHaveBeenCalledWith('axis-drag', expect.objectContaining({ axis: 'x' }))
      expect(api.currentXDomain.value).toBeNull()
    })
  })

  describe('handleSelectionChange', () => {
    it('all 模式更新全域 domain', () => {
      const api = useFacetBrush()
      api.handleSelectionChange(
        { xDomain: ['A', 'B'], yLeftDomain: [0, 50] },
        'f',
        'all',
        0,
        0,
        vi.fn()
      )

      expect(api.currentXDomain.value).toEqual(['A', 'B'])
      expect(api.currentYLeftDomain.value).toEqual([0, 50])
    })

    it('col 模式只更新該欄的 X domain', () => {
      const api = useFacetBrush()
      api.handleSelectionChange({ xDomain: ['A'] }, 'f', 'col', 0, 3, vi.fn())

      expect(api.colXDomains.value[3]).toEqual(['A'])
      expect(api.currentXDomain.value).toBeNull()
    })

    it('row 模式只更新該列的 Y domain', () => {
      const api = useFacetBrush()
      api.handleSelectionChange({ yLeftDomain: [0, 10] }, 'f', 'row', 2, 0, vi.fn())

      expect(api.rowYDomains.value[2]?.yLeft).toEqual([0, 10])
    })

    it('both 模式同時更新該欄 X 與該列 Y', () => {
      const api = useFacetBrush()
      api.handleSelectionChange(
        { xDomain: ['A'], yLeftDomain: [0, 10], yRightDomain: [1, 2] },
        'f',
        'both',
        1,
        2,
        vi.fn()
      )

      expect(api.colXDomains.value[2]).toEqual(['A'])
      expect(api.rowYDomains.value[1]?.yLeft).toEqual([0, 10])
      expect(api.rowYDomains.value[1]?.yRight).toEqual([1, 2])
    })

    it('一律轉發 selection-change 並帶上分面座標', () => {
      const api = useFacetBrush()
      const emit = vi.fn()
      api.handleSelectionChange({ xDomain: ['A'] }, 'facet-1', 'none', 1, 2, emit)

      expect(emit).toHaveBeenCalledWith(
        'selection-change',
        expect.objectContaining({ facetId: 'facet-1', row: 1, col: 2 })
      )
    })
  })

  describe('handleResetZoom', () => {
    it('清空所有 domain 並遞增 resetTrigger', () => {
      const api = useFacetBrush()
      api.handleSelectionChange(
        { xDomain: ['A'], yLeftDomain: [0, 1] },
        'f',
        'all',
        0,
        0,
        vi.fn()
      )
      api.handleSelectionChange({ xDomain: ['B'] }, 'f', 'col', 0, 1, vi.fn())

      const triggerBefore = api.resetTrigger.value
      api.handleResetZoom()

      expect(api.currentXDomain.value).toBeNull()
      expect(api.currentYLeftDomain.value).toBeNull()
      expect(api.colXDomains.value).toEqual({})
      expect(api.rowYDomains.value).toEqual({})
      expect(api.resetTrigger.value).toBe(triggerBefore + 1)
    })

    it('有傳 emit 時發出 zoom-reset', () => {
      const api = useFacetBrush()
      const emit = vi.fn()
      api.handleResetZoom(emit)
      expect(emit).toHaveBeenCalledWith('zoom-reset')
    })

    it('沒傳 emit 時不會出錯', () => {
      const api = useFacetBrush()
      expect(() => api.handleResetZoom()).not.toThrow()
    })
  })

  describe('domain 查詢', () => {
    it('依 syncMode 取用正確的來源', () => {
      const api = useFacetBrush()
      api.handleSelectionChange({ xDomain: ['ALL'] }, 'f', 'all', 0, 0, vi.fn())
      api.handleSelectionChange({ xDomain: ['COL'] }, 'f', 'col', 0, 1, vi.fn())

      expect(api.getXDomain('all', 0)).toEqual(['ALL'])
      expect(api.getXDomain('col', 1)).toEqual(['COL'])
    })

    it('none 模式回傳 fallback', () => {
      const api = useFacetBrush()
      expect(api.getXDomain('none', 0, ['FALLBACK'])).toEqual(['FALLBACK'])
      expect(api.getYLeftDomain('none', 0, [0, 9])).toEqual([0, 9])
    })

    it('沒有選取範圍也沒有 fallback 時回傳 undefined 而不是 null', () => {
      const api = useFacetBrush()
      expect(api.getXDomain('all', 0)).toBeUndefined()
      expect(api.getYLeftDomain('row', 0)).toBeUndefined()
      expect(api.getYRightDomain('row', 0)).toBeUndefined()
    })
  })

  describe('hasAnyZoom', () => {
    it('初始為 false', () => {
      expect(useFacetBrush().hasAnyZoom()).toBe(false)
    })

    it('任一種 domain 被設定後為 true', () => {
      const api = useFacetBrush()
      api.handleSelectionChange({ xDomain: ['A'] }, 'f', 'col', 0, 0, vi.fn())
      expect(api.hasAnyZoom()).toBe(true)
    })

    it('重置後回到 false', () => {
      const api = useFacetBrush()
      api.handleSelectionChange({ xDomain: ['A'] }, 'f', 'all', 0, 0, vi.fn())
      api.handleResetZoom()
      expect(api.hasAnyZoom()).toBe(false)
    })
  })
})
