/**
 * 垂直堆疊分面的版面計算
 *
 * 純函式：算出每個分面的高度與垂直偏移。抽出來是為了能單獨測試三種
 * 高度分配規則（全部指定 / 部分指定 / 全不指定）與最後一列的額外空間。
 */

/** 分面最小高度（再怎麼擠也要留得下座標軸） */
export const MIN_FACET_HEIGHT = 100

export interface FacetHeightOptions {
  /** 扣掉邊距與間距後，可以分配給所有分面的總高度 */
  availableHeight: number
  /**
   * 每個分面指定的高度；undefined 表示沒指定。
   * 全部都指定時當作「權重」按比例分配，而不是絕對像素 ——
   * 這樣容器縮放時各分面的比例才維持不變。
   */
  heights: Array<number | undefined>
  /**
   * 最後一個分面的額外高度。
   * 只有它要畫 X 軸刻度與標籤，需要多留一點空間。
   */
  lastFacetExtraHeight?: number
}

/**
 * 算出每個分面的高度。
 *
 * 三種情況：
 * 1. 全部都有指定 → 當權重按比例分配
 * 2. 部分有指定 → 指定的用固定值，其餘均分剩下的空間
 * 3. 全都沒指定 → 平均分配
 */
export function computeFacetHeights(options: FacetHeightOptions): number[] {
  const { availableHeight, heights } = options
  const extra = options.lastFacetExtraHeight ?? 0
  const count = heights.length
  if (count === 0) return []

  const lastIndex = count - 1
  /** 套上最後一列的額外空間並夾住下限 */
  const finalize = (base: number, index: number): number =>
    Math.max(base + (index === lastIndex ? extra : 0), MIN_FACET_HEIGHT)

  const allHaveHeight = heights.every((h) => !!h)
  const someHaveHeight = heights.some((h) => !!h)

  if (allHaveHeight) {
    const totalWeight = heights.reduce<number>((sum, h) => sum + (h || 1), 0)
    return heights.map((h, index) =>
      finalize(Math.floor(availableHeight * ((h || 1) / totalWeight)), index)
    )
  }

  if (someHaveHeight) {
    const totalCustomHeight = heights.reduce<number>((sum, h) => sum + (h || 0), 0)
    const remainingCount = heights.filter((h) => !h).length
    const remainingHeight = availableHeight - totalCustomHeight
    const defaultHeight = remainingCount > 0 ? remainingHeight / remainingCount : 0

    return heights.map((h, index) => finalize(h || defaultHeight, index))
  }

  const baseHeight = Math.floor(availableHeight / count)
  return heights.map((_, index) => finalize(baseHeight, index))
}

/**
 * 依高度算出每個分面的垂直偏移（由上往下堆疊）。
 */
export function computeFacetOffsets(
  facetHeights: number[],
  startY: number,
  spacing: number
): number[] {
  const offsets: number[] = []
  let currentY = startY

  for (const height of facetHeights) {
    offsets.push(currentY)
    currentY += height + spacing
  }
  return offsets
}
