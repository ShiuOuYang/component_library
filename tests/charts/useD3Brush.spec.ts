import { describe, expect, it, vi } from 'vitest'
import * as d3 from 'd3'
import { useD3Brush } from '@/components/library/charts/composables/useD3Brush'

/** 三個 band，各寬 100，padding 0 → A:[0,100) B:[100,200) C:[200,300) */
function makeScales() {
  const x = d3.scaleBand<string>().domain(['A', 'B', 'C']).range([0, 300]).padding(0)
  const y = d3.scaleLinear().domain([0, 100]).range([200, 0])
  return { x, y }
}

describe('useD3Brush', () => {
  describe('createBrushInstance', () => {
    it('extent 扣掉 margin，不能框到座標軸外', () => {
      const { createBrushInstance } = useD3Brush()
      const brush = createBrushInstance(
        { width: 400, height: 300, margin: { top: 10, right: 20, bottom: 30, left: 40 } },
        () => {}
      )

      expect(brush.extent()).toBeTypeOf('function')
      // d3 的 extent 存成常數函式，呼叫後取回設定值
      const extent = (brush.extent() as () => [[number, number], [number, number]])()
      expect(extent).toEqual([
        [40, 10],
        [380, 270],
      ])
    })
  })

  describe('handleBrushEnd', () => {
    it('沒有選取範圍時不動作', () => {
      const { handleBrushEnd, resetBtnShow } = useD3Brush()
      const redraw = vi.fn()

      handleBrushEnd({ selection: null }, makeScales(), redraw)

      expect(redraw).not.toHaveBeenCalled()
      expect(resetBtnShow.value).toBe(false)
    })

    it('完整落在範圍內的 band 才算選中', () => {
      const { handleBrushEnd } = useD3Brush()
      const scales = makeScales()

      // 框 [0, 200] → A 與 B 完整落入，C 完全在外
      handleBrushEnd({ selection: [[0, 0], [200, 200]] }, scales, () => {})

      expect(scales.x.domain()).toEqual(['A', 'B'])
    })

    it('只被切到一半的 band 不算選中（避免縮放後出現半根柱子）', () => {
      const { handleBrushEnd } = useD3Brush()
      const scales = makeScales()

      // 框 [0, 150] → A 完整落入；B 只被切到一半
      handleBrushEnd({ selection: [[0, 0], [150, 200]] }, scales, () => {})

      expect(scales.x.domain()).toEqual(['A'])
    })

    it('一個 band 都沒完整選到時不動作（不把圖縮成空的）', () => {
      const { handleBrushEnd, resetBtnShow } = useD3Brush()
      const scales = makeScales()
      const before = scales.x.domain()
      const redraw = vi.fn()

      // 框 [110, 190] → 落在 B 中間，沒有任何 band 完整落入
      handleBrushEnd({ selection: [[110, 0], [190, 200]] }, scales, redraw)

      expect(scales.x.domain()).toEqual(before)
      expect(redraw).not.toHaveBeenCalled()
      expect(resetBtnShow.value).toBe(false)
    })

    it('Y domain 依螢幕座標反轉（上緣對應較大值）', () => {
      const { handleBrushEnd } = useD3Brush()
      const scales = makeScales()

      // y 範圍 [0,200] 對應值域 [100,0]：y=50 → 75、y=150 → 25
      handleBrushEnd({ selection: [[0, 50], [300, 150]] }, scales, () => {})

      const [low, high] = scales.y.domain()
      expect(low).toBeCloseTo(25)
      expect(high).toBeCloseTo(75)
      expect(low).toBeLessThan(high)
    })

    it('成功選取後顯示重置按鈕並重繪', () => {
      const { handleBrushEnd, resetBtnShow } = useD3Brush()
      const redraw = vi.fn()

      handleBrushEnd({ selection: [[0, 0], [200, 200]] }, makeScales(), redraw)

      expect(resetBtnShow.value).toBe(true)
      expect(redraw).toHaveBeenCalledTimes(1)
    })

    it('發出 selection-change 並帶上新的 domain', () => {
      const emit = vi.fn()
      const { handleBrushEnd } = useD3Brush(emit)

      handleBrushEnd({ selection: [[0, 50], [200, 150]] }, makeScales(), () => {})

      expect(emit).toHaveBeenCalledTimes(1)
      const [eventName, payload] = emit.mock.calls[0]
      expect(eventName).toBe('selection-change')
      expect(payload.xDomain).toEqual(['A', 'B'])
      expect(payload.yDomain[0]).toBeCloseTo(25)
      expect(payload.yDomain[1]).toBeCloseTo(75)
    })

    it('沒有傳 emit 時不會出錯', () => {
      const { handleBrushEnd } = useD3Brush()
      expect(() =>
        handleBrushEnd({ selection: [[0, 0], [200, 200]] }, makeScales(), () => {})
      ).not.toThrow()
    })

    it('padding 不為 0 時，band 之間的間隙不影響判斷', () => {
      const { handleBrushEnd } = useD3Brush()
      const x = d3.scaleBand<string>().domain(['A', 'B', 'C']).range([0, 300]).padding(0.2)
      const y = d3.scaleLinear().domain([0, 100]).range([200, 0])

      // 框整個範圍應選到全部三個
      handleBrushEnd({ selection: [[0, 0], [300, 200]] }, { x, y }, () => {})
      expect(x.domain()).toEqual(['A', 'B', 'C'])
    })
  })

  describe('resetZoom', () => {
    it('隱藏重置按鈕並在 DOM 更新後重繪', async () => {
      const { resetZoom, resetBtnShow } = useD3Brush()
      resetBtnShow.value = true
      const drawChart = vi.fn()

      resetZoom(drawChart)

      // 先同步隱藏按鈕
      expect(resetBtnShow.value).toBe(false)
      // 重繪排在 nextTick，等 DOM 反映新狀態後才跑
      expect(drawChart).not.toHaveBeenCalled()

      await Promise.resolve()
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(drawChart).toHaveBeenCalledTimes(1)
    })
  })
})
