/**
 * 大量資料（數萬～數十萬筆）渲染用的純函式
 *
 * SVG 每一筆資料一個節點，10 萬筆就是 10 萬個 <circle>，瀏覽器光排版就要好幾秒；
 * 折線則是一條上百萬字元的 path。這裡的工具讓圖表：
 *   - 折線：依「像素欄」降採樣，畫出來的線與原始資料逐像素相同（尖峰不會被削掉）
 *   - 散點 / 長條：改畫在 Canvas 上，滑鼠提示改用座標陣列做命中測試
 */

// === 降採樣 ===

/**
 * 依像素欄降採樣（M4：每一欄保留第一、最後、最小、最大四個點）。
 *
 * @description 折線在同一個像素欄裡的上百個點，畫出來只是一條垂直線段，
 *              保留這四個點就能畫出完全相同的形狀 —— 不像 LTTB 之類的演算法
 *              可能把單一尖峰抹掉（產線資料最在意的就是那個尖峰）。
 *              - 座標不是有限數值的點視為斷點：原樣保留一個索引，讓 line.defined() 斷線
 *              - 依資料原本的順序逐段處理，只合併「連續落在同一欄」的點；
 *                資料沒有按 X 排序時效果變差，但不會畫出錯的線
 *
 * @param px 每筆資料的 X 像素座標
 * @param py 每筆資料的 Y 像素座標
 * @returns 要保留的資料索引（遞增）
 */
export function minMaxDownsample(px: ArrayLike<number>, py: ArrayLike<number>): number[] {
  const n = Math.min(px.length, py.length)
  const out: number[] = []
  let column = NaN
  let first = -1
  let last = -1
  let minI = -1
  let maxI = -1
  let lastWasGap = false

  const flush = () => {
    if (first < 0) return
    // 四個索引去重後依原順序輸出，線段的走向才會正確
    const picks = [first, minI, maxI, last].sort((a, b) => a - b)
    let prev = -1
    for (const i of picks) {
      if (i !== prev) out.push(i)
      prev = i
    }
    first = -1
  }

  for (let i = 0; i < n; i++) {
    const x = px[i]
    const y = py[i]
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      flush()
      column = NaN
      // 連續的斷點只留一個就夠讓線斷開
      if (!lastWasGap) out.push(i)
      lastWasGap = true
      continue
    }
    lastWasGap = false
    const c = Math.floor(x)
    if (c !== column) {
      flush()
      column = c
      first = last = minI = maxI = i
      continue
    }
    last = i
    if (y < py[minI]) minI = i
    if (y > py[maxI]) maxI = i
  }
  flush()
  return out
}

// === 命中測試（Canvas 上沒有 DOM 元素可以 hover） ===

/**
 * 找出離 (mx, my) 最近、且在 radius 像素內的點。
 * 線性掃描：10 萬點約 0.3ms，比每次重繪都重建 quadtree 划算。
 * @returns 索引；範圍內沒有點時回傳 -1
 */
export function nearestPointIndex(
  px: ArrayLike<number>,
  py: ArrayLike<number>,
  mx: number,
  my: number,
  radius: number
): number {
  let best = -1
  let bestDist = radius * radius
  const n = Math.min(px.length, py.length)
  for (let i = 0; i < n; i++) {
    const dx = px[i] - mx
    const dy = py[i] - my
    const dist = dx * dx + dy * dy
    // <= 讓後畫的點（畫在上層）優先
    if (dist <= bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

/**
 * 找出包含 (mx, my) 的矩形（長條）。從後往前找：後畫的在上層。
 * @returns 索引；沒有命中時回傳 -1
 */
export function rectIndexAt(
  x0: ArrayLike<number>,
  y0: ArrayLike<number>,
  x1: ArrayLike<number>,
  y1: ArrayLike<number>,
  mx: number,
  my: number
): number {
  for (let i = x0.length - 1; i >= 0; i--) {
    if (mx >= x0[i] && mx <= x1[i] && my >= y0[i] && my <= y1[i]) return i
  }
  return -1
}

// === Canvas 顏色 ===

/**
 * Canvas 的 fillStyle 看不懂 CSS 變數（rgb(var(--t-accent))），
 * 借一個隱藏元素讓瀏覽器算出實際色值；一般色碼直接回傳。
 */
export function resolveCanvasColor(color: string, host: Element | null): string {
  if (!color.includes('var(') || !host || typeof getComputedStyle === 'undefined') return color
  const probe = document.createElement('span')
  probe.style.color = color
  probe.style.display = 'none'
  host.appendChild(probe)
  const resolved = getComputedStyle(probe).color || color
  probe.remove()
  return resolved
}

// === 滾輪縮放 ===

/**
 * 以 anchor 為中心縮放一段連續 domain。
 *
 * @param domain 目前範圍 [a, b]
 * @param anchor 縮放中心（游標所在的值），縮放前後它在畫面上的位置不變
 * @param k 縮放倍率：< 1 放大（範圍變小）、> 1 縮小
 * @param options.bounds 範圍不得超出這段（X 軸用資料全覽範圍）；縮到比它寬時回傳 null
 * @param options.minSpan 最小範圍（放大上限）
 * @param options.maxSpan 最大範圍；縮到大於等於它時回傳 null（Y 軸沒有 bounds 時用）
 * @returns 新範圍；null 代表「回到全覽」
 */
export function zoomContinuousDomain(
  domain: [number, number],
  anchor: number,
  k: number,
  options: { bounds?: [number, number] | null; minSpan?: number; maxSpan?: number } = {}
): [number, number] | null {
  const [a, b] = domain
  const span = b - a
  if (!Number.isFinite(span) || span === 0 || !Number.isFinite(k) || k <= 0) return domain
  const { bounds = null, minSpan = 0 } = options
  const boundsSpan = bounds ? bounds[1] - bounds[0] : Infinity
  const maxSpan = Math.min(options.maxSpan ?? Infinity, boundsSpan)

  const newSpan = Math.max(Math.abs(span * k), minSpan) * Math.sign(span)
  if (Math.abs(newSpan) >= maxSpan) return null

  // 游標在範圍中的相對位置維持不變
  const t = Number.isFinite(anchor) ? Math.min(1, Math.max(0, (anchor - a) / span)) : 0.5
  let start = anchor - t * newSpan
  if (!Number.isFinite(start)) start = a + (span - newSpan) / 2
  return clampWindow([start, start + newSpan], bounds)
}

/**
 * 平移一段連續 domain（delta 為值域單位），不超出 bounds。
 */
export function panContinuousDomain(
  domain: [number, number],
  delta: number,
  bounds?: [number, number] | null
): [number, number] {
  return clampWindow([domain[0] + delta, domain[1] + delta], bounds ?? null)
}

/** 把視窗推回 bounds 內（保持寬度） */
function clampWindow(window: [number, number], bounds: [number, number] | null): [number, number] {
  if (!bounds) return window
  const span = window[1] - window[0]
  let start = window[0]
  if (start < bounds[0]) start = bounds[0]
  if (start + span > bounds[1]) start = bounds[1] - span
  return [start, start + span]
}

/**
 * 類別軸（band）的縮放：在完整類別清單上移動一個 [start, start + length) 的視窗。
 *
 * @param start 目前視窗起點（在完整清單中的索引）
 * @param length 目前視窗長度
 * @param total 完整清單長度
 * @param anchorFrac 游標在繪圖區的相對位置（0~1）
 * @param k 縮放倍率（同 zoomContinuousDomain）
 * @param minLength 最少顯示幾個類別
 * @returns 新視窗；null 代表「回到全覽」
 */
export function zoomBandWindow(
  start: number,
  length: number,
  total: number,
  anchorFrac: number,
  k: number,
  minLength = 2
): { start: number; length: number } | null {
  if (total <= 0 || length <= 0) return null
  const raw = Math.round(length * k)
  // 倍率很接近 1 時四捨五入會卡在原長度，至少動一格
  const stepped = raw === length ? length + (k > 1 ? 1 : k < 1 ? -1 : 0) : raw
  const newLength = Math.max(Math.min(minLength, total), stepped)
  if (newLength >= total) return null
  const t = Math.min(1, Math.max(0, anchorFrac))
  const anchorIndex = start + t * length
  const newStart = Math.round(anchorIndex - t * newLength)
  return { start: Math.min(Math.max(0, newStart), total - newLength), length: newLength }
}
