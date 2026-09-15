import { nextTick, ref, type Ref } from 'vue'
import * as d3 from 'd3'
import type {
  BrushDimensions,
  BrushSelectionPayload,
  YScale,
} from '@/components/library/charts/types/chart.types'

/**
 * useD3Brush - D3 Brush（框選縮放）
 *
 * 封裝「框選一段範圍 → 更新比例尺 domain → 重繪」這個循環，
 * 以及重置按鈕的顯示狀態。
 */

/** brush 結束事件（只取用到的欄位，不綁死 d3 的完整事件型別） */
export interface BrushEndEvent {
  /** 選取範圍的兩個角；未選取時為 null */
  selection: [[number, number], [number, number]] | null
}

/** handleBrushEnd 需要的比例尺 */
export interface BrushScales {
  /** X 軸必須是 band scale —— 實作用 domain() 逐一比對 band 位置 */
  x: d3.ScaleBand<string>
  y: YScale
}

export interface UseD3BrushReturn {
  /** 是否顯示「重置縮放」按鈕 */
  resetBtnShow: Ref<boolean>
  createBrushInstance: (
    dimensions: BrushDimensions,
    onBrushEnd: (event: BrushEndEvent) => void
  ) => d3.BrushBehavior<unknown>
  handleBrushEnd: (event: BrushEndEvent, scales: BrushScales, redrawCallback: () => void) => void
  resetZoom: (drawChart: () => void) => void
}

/** emit 只用到 selection-change 這一個事件 */
type SelectionChangeEmit = (event: 'selection-change', payload: BrushSelectionPayload) => void

export function useD3Brush(emit?: SelectionChangeEmit): UseD3BrushReturn {
  const resetBtnShow = ref(false)

  /**
   * 建立 brush 實例。
   * extent 限制在繪圖區內（扣掉 margin），避免可以框到座標軸外面。
   */
  function createBrushInstance(
    dimensions: BrushDimensions,
    onBrushEnd: (event: BrushEndEvent) => void
  ): d3.BrushBehavior<unknown> {
    const { width, height, margin } = dimensions

    return d3
      .brush()
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ])
      .on('end', onBrushEnd as (event: d3.D3BrushEvent<unknown>) => void)
  }

  /**
   * 處理 brush 結束：把選取範圍換算成新的 domain 後重繪。
   *
   * X 軸取「完整落在選取範圍內」的 band —— 只被切到一半的類別不算選中，
   * 否則縮放後邊緣會出現半根柱子。
   */
  function handleBrushEnd(
    event: BrushEndEvent,
    scales: BrushScales,
    redrawCallback: () => void
  ): void {
    if (!event.selection) return

    const [[x0, y0], [x1, y1]] = event.selection
    const { x: xScale, y: yScale } = scales

    const selectedXDomain = xScale.domain().filter((d) => {
      const bandStart = xScale(d)
      // 🔧 xScale(d) 對不在 domain 內的值會回傳 undefined
      if (bandStart === undefined) return false
      const bandEnd = bandStart + xScale.bandwidth()
      return bandStart >= x0 && bandEnd <= x1
    })

    // 一個 band 都沒完整選到時不動作，避免把圖縮成空的
    if (selectedXDomain.length === 0) return

    resetBtnShow.value = true

    // y0 是上緣、y1 是下緣，而螢幕座標往下遞增，所以 invert 後要反過來放
    const selectedYDomain: [number, number] = [yScale.invert(y1), yScale.invert(y0)]

    xScale.domain(selectedXDomain)
    yScale.domain(selectedYDomain)

    emit?.('selection-change', {
      xDomain: selectedXDomain,
      yDomain: selectedYDomain,
    })

    redrawCallback()
  }

  /** 重置縮放：先讓按鈕消失，等 DOM 更新後再重繪 */
  function resetZoom(drawChart: () => void): void {
    resetBtnShow.value = false
    nextTick(() => {
      drawChart()
    })
  }

  return {
    resetBtnShow,
    createBrushInstance,
    handleBrushEnd,
    resetZoom,
  }
}

export default useD3Brush
