/**
 * StatusScatterMap 用的純函式：版面、刻度、狀態分組與命中測試
 */

// === 範圍 ===

/**
 * 一組數值的 [min, max]，兩端各外推 padRatio × 寬度。
 * - 沒有有效數值：[0, 1]
 * - 所有值相同（寬度 0）：以該值為中心外推 1（值為 0 時）或 |值| × 10%，避免比例尺除以 0
 */
export function extentWithPadding(values: ArrayLike<number>, padRatio = 0.05): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min > max) return [0, 1]
  if (min === max) {
    const half = min === 0 ? 1 : Math.abs(min) * 0.1
    return [min - half, max + half]
  }
  const pad = (max - min) * Math.max(0, padRatio)
  return [min - pad, max + pad]
}

/**
 * 縮放邊界：基準範圍（呼叫端設定的 xDomain / yDomain）與資料實際範圍的聯集。
 * 資料超出的那一側再外推 padRatio × 聯集寬度，點才不會貼在邊上；
 * 資料都在基準範圍內時原樣回傳基準範圍（縮小上限就是基準範圍）。
 */
export function zoomBounds(base: [number, number], values: ArrayLike<number>, padRatio = 0.05): [number, number] {
  let lo = Math.min(base[0], base[1])
  let hi = Math.max(base[0], base[1])
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min > max) return [lo, hi]
  const pad = (Math.max(hi, max) - Math.min(lo, min)) * Math.max(0, padRatio)
  if (min < lo) lo = min - pad
  if (max > hi) hi = max + pad
  return [lo, hi]
}

// === 版面 ===

/** 繪圖區在可用空間中的位置與大小 */
export interface PlotRect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * 等比例版面：X、Y 每單位的像素數相同（座標是實體位置時，圖形才不會被拉扁），
 * 繪圖區置中在可用空間裡。
 */
export function equalAspectRect(availWidth: number, availHeight: number, xSpan: number, ySpan: number): PlotRect {
  const w = Math.max(0, availWidth)
  const h = Math.max(0, availHeight)
  if (!(xSpan > 0) || !(ySpan > 0)) return { left: 0, top: 0, width: w, height: h }
  const pixelsPerUnit = Math.min(w / xSpan, h / ySpan)
  const width = xSpan * pixelsPerUnit
  const height = ySpan * pixelsPerUnit
  return { left: (w - width) / 2, top: (h - height) / 2, width, height }
}

// === 刻度 ===

/** 一個刻度；isEnd 代表它是範圍端點（格式通常不同，例如保留一位小數） */
export interface AxisTick {
  value: number
  isEnd: boolean
}

/**
 * 一般刻度加上範圍兩端的值（端點一定顯示）。
 * 離端點不到 minGapPx 像素的一般刻度會被拿掉，兩個標籤才不會疊在一起；
 * 剛好落在端點上的一般刻度直接標成端點。
 */
export function ticksWithEnds(
  ticks: number[],
  domain: [number, number],
  toPixel: (v: number) => number,
  minGapPx: number
): AxisTick[] {
  const lo = Math.min(domain[0], domain[1])
  const hi = Math.max(domain[0], domain[1])
  const ends = lo === hi ? [lo] : [lo, hi]
  const kept = ticks.filter(
    (v) => !ends.includes(v) && ends.every((end) => Math.abs(toPixel(v) - toPixel(end)) >= minGapPx)
  )
  return [...kept.map((value) => ({ value, isEnd: false })), ...ends.map((value) => ({ value, isEnd: true }))].sort(
    (a, b) => a.value - b.value
  )
}

// === 狀態分組 ===

/**
 * 依狀態把資料索引分組，並決定繪製順序。
 *
 * statuses 的順序就是繪製順序：後面的畫在上層（預設 PASS → NEARFAIL → FAIL，
 * 少數的不良點才不會被大量的良品點蓋住）。不在清單裡的狀態歸到 other，最先畫。
 *
 * @returns groups[i] 是 statuses[i] 的索引；other 是未知狀態的索引
 */
export function groupByStatus(
  statusOf: ArrayLike<string>,
  statuses: readonly string[]
): { groups: number[][]; other: number[] } {
  const slot = new Map<string, number>()
  statuses.forEach((s, i) => slot.set(s, i))
  const groups: number[][] = statuses.map(() => [])
  const other: number[] = []
  for (let i = 0; i < statusOf.length; i++) {
    const g = slot.get(statusOf[i])
    if (g === undefined) other.push(i)
    else groups[g].push(i)
  }
  return { groups, other }
}

// === 命中測試 ===

/**
 * 找出游標半徑內最近的點，依繪製順序比對：距離相同時取後畫的（上層）。
 * 座標為 NaN 的點（被隱藏的狀態）不會被選到。
 *
 * @param drawOrder 依繪製順序排列的索引群組
 * @returns 資料索引；範圍內沒有點時回傳 -1
 */
export function nearestInDrawOrder(
  px: ArrayLike<number>,
  py: ArrayLike<number>,
  drawOrder: ReadonlyArray<ArrayLike<number>>,
  mx: number,
  my: number,
  radius: number
): number {
  let best = -1
  let bestDist = radius * radius
  for (const group of drawOrder) {
    for (let k = 0; k < group.length; k++) {
      const i = group[k]
      const dx = px[i] - mx
      const dy = py[i] - my
      const dist = dx * dx + dy * dy
      if (dist <= bestDist) {
        bestDist = dist
        best = i
      }
    }
  }
  return best
}

// === 直接寫入像素的點繪製 ===

/** 一顆圓點的覆蓋率遮罩（含邊緣反鋸齒） */
export interface DotStamp {
  /** 中心到邊的格數 */
  half: number
  /** 邊長（half × 2 + 1） */
  size: number
  /** 每格的覆蓋率 0~1 */
  mask: Float32Array
}

/** 建立半徑為 radius（裝置像素）的圓點遮罩；邊緣依距離給部分覆蓋率，看起來是平滑的圓 */
export function makeDotStamp(radius: number): DotStamp {
  const r = Math.max(0, radius)
  const half = Math.ceil(r + 1)
  const size = half * 2 + 1
  const mask = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - half, y - half)
      mask[y * size + x] = Math.max(0, Math.min(1, r + 0.5 - d))
    }
  }
  return { half, size, mask }
}

/**
 * 把一批點蓋到 RGBA 像素緩衝區上（source-over 合成）。
 *
 * ✅ 為什麼不用 Canvas API：沒有 GPU 的環境（無頭瀏覽器、遠端桌面 / VDI）由 CPU 光柵化，
 *    5 萬顆點用 arc() 要約 175ms、drawImage 貼圖約 135ms；直接寫像素再 putImageData 約 50ms。
 *
 * @param buf ImageData.data（非預乘 RGBA）
 * @param scale 座標換算成裝置像素的倍率（devicePixelRatio）
 */
export function stampDots(
  buf: Uint8ClampedArray,
  width: number,
  height: number,
  indices: ArrayLike<number>,
  px: ArrayLike<number>,
  py: ArrayLike<number>,
  scale: number,
  stamp: DotStamp,
  color: { r: number; g: number; b: number },
  opacity = 1
): void {
  const { half, size, mask } = stamp
  const op = Math.max(0, Math.min(1, opacity))
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k]
    const x = px[i]
    const y = py[i]
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const cx = Math.round(x * scale)
    const cy = Math.round(y * scale)
    // 整顆點都在畫面外就跳過
    if (cx + half < 0 || cy + half < 0 || cx - half >= width || cy - half >= height) continue
    for (let my = 0; my < size; my++) {
      const yy = cy + my - half
      if (yy < 0 || yy >= height) continue
      for (let mx = 0; mx < size; mx++) {
        const a = mask[my * size + mx] * op
        if (a <= 0) continue
        const xx = cx + mx - half
        if (xx < 0 || xx >= width) continue
        const o = (yy * width + xx) * 4
        const dstA = buf[o + 3] / 255
        const outA = a + dstA * (1 - a)
        const keep = (dstA * (1 - a)) / outA
        const take = a / outA
        buf[o] = color.r * take + buf[o] * keep
        buf[o + 1] = color.g * take + buf[o + 1] * keep
        buf[o + 2] = color.b * take + buf[o + 2] * keep
        buf[o + 3] = outA * 255
      }
    }
  }
}
