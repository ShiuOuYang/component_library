import { describe, expect, it } from 'vitest'
import {
  MIN_FACET_HEIGHT,
  computeFacetHeights,
  computeFacetOffsets,
} from '@/components/library/charts/composables/useStackedFacetLayout'

describe('computeFacetHeights', () => {
  describe('全部都沒指定高度：平均分配', () => {
    it('三個分面均分可用高度', () => {
      const heights = computeFacetHeights({
        availableHeight: 900,
        heights: [undefined, undefined, undefined],
      })
      expect(heights).toEqual([300, 300, 300])
    })

    it('除不盡時無條件捨去（寧可留白也不要溢出）', () => {
      const heights = computeFacetHeights({
        availableHeight: 1000,
        heights: [undefined, undefined, undefined],
      })
      expect(heights).toEqual([333, 333, 333])
    })
  })

  describe('全部都有指定高度：當權重按比例分配', () => {
    it('依權重比例切分，而不是當成絕對像素', () => {
      // 權重 1:2:1，可用 800 → 200 / 400 / 200
      const heights = computeFacetHeights({
        availableHeight: 800,
        heights: [1, 2, 1],
      })
      expect(heights).toEqual([200, 400, 200])
    })

    it('權重寫成像素值也只看比例（容器縮放時比例維持不變）', () => {
      const small = computeFacetHeights({ availableHeight: 400, heights: [100, 300] })
      const large = computeFacetHeights({ availableHeight: 800, heights: [100, 300] })
      // 兩者都是 1:3
      expect(small).toEqual([100, 300])
      expect(large).toEqual([200, 600])
    })
  })

  describe('部分指定高度：指定的固定，其餘均分剩下的', () => {
    it('指定的用原值，未指定的分剩餘空間', () => {
      // 可用 700，第一個固定 300，剩 400 給兩個 → 各 200
      const heights = computeFacetHeights({
        availableHeight: 700,
        heights: [300, undefined, undefined],
      })
      expect(heights).toEqual([300, 200, 200])
    })

    it('指定高度超過可用空間時，其餘夾到最小高度', () => {
      const heights = computeFacetHeights({
        availableHeight: 200,
        heights: [500, undefined],
      })
      expect(heights[0]).toBe(500)
      expect(heights[1]).toBe(MIN_FACET_HEIGHT)
    })
  })

  describe('最後一個分面的額外高度', () => {
    it('只有最後一個加高（它要畫 X 軸刻度）', () => {
      const heights = computeFacetHeights({
        availableHeight: 600,
        heights: [undefined, undefined, undefined],
        lastFacetExtraHeight: 50,
      })
      expect(heights).toEqual([200, 200, 250])
    })

    it('沒指定時預設不加高', () => {
      const heights = computeFacetHeights({
        availableHeight: 600,
        heights: [undefined, undefined],
      })
      expect(heights).toEqual([300, 300])
    })

    it('只有一個分面時，它同時也是最後一個', () => {
      const heights = computeFacetHeights({
        availableHeight: 400,
        heights: [undefined],
        lastFacetExtraHeight: 50,
      })
      expect(heights).toEqual([450])
    })
  })

  describe('防禦', () => {
    it('沒有分面時回傳空陣列', () => {
      expect(computeFacetHeights({ availableHeight: 500, heights: [] })).toEqual([])
    })

    it('可用高度為 0 或負數時夾到最小高度', () => {
      expect(
        computeFacetHeights({ availableHeight: 0, heights: [undefined, undefined] })
      ).toEqual([MIN_FACET_HEIGHT, MIN_FACET_HEIGHT])

      expect(
        computeFacetHeights({ availableHeight: -100, heights: [undefined] })
      ).toEqual([MIN_FACET_HEIGHT])
    })

    it('高度永遠不會低於最小值', () => {
      const heights = computeFacetHeights({
        availableHeight: 100,
        heights: [1, 1, 1, 1, 1, 1],
      })
      expect(heights.every((h) => h >= MIN_FACET_HEIGHT)).toBe(true)
    })
  })
})

describe('computeFacetOffsets', () => {
  it('由上往下累加高度與間距', () => {
    expect(computeFacetOffsets([100, 200, 150], 40, 10)).toEqual([40, 150, 360])
  })

  it('間距為 0 時緊貼', () => {
    expect(computeFacetOffsets([100, 100], 0, 0)).toEqual([0, 100])
  })

  it('沒有分面時回傳空陣列', () => {
    expect(computeFacetOffsets([], 40, 10)).toEqual([])
  })

  it('第一個分面從起始位置開始', () => {
    expect(computeFacetOffsets([50], 25, 10)).toEqual([25])
  })
})
