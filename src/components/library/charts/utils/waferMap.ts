/**
 * WaferMap 的純計算：格線範圍、晶粒位置、命中測試、良率統計、鍵盤移動
 *
 * 全部不碰 DOM，方便單獨測試。座標系：
 *   - 「格座標」(x, y)：資料裡晶粒的行列（整數），x 往右、y 預設往下（flipY 時往上）
 *   - 「像素座標」：畫布左上角為 (0, 0)
 */

export type WaferShape = 'wafer' | 'panel'
export type WaferNotch = 'top' | 'bottom' | 'left' | 'right' | 'none'

/** 資料裡晶粒行列的範圍（含兩端） */
export interface WaferGrid {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface WaferLayout {
  shape: WaferShape
  /** 晶圓（或面板）外框：圓心與半徑；面板時為外框矩形 */
  cx: number
  cy: number
  radius: number
  frame: { x: number; y: number; width: number; height: number }
  /** 一顆晶粒的間距（含間隙） */
  pitchX: number
  pitchY: number
  /** 格座標 (minX, minY) 那顆晶粒的左上角 */
  originX: number
  originY: number
  grid: WaferGrid
  flipY: boolean
}

/** 從資料算出行列範圍；沒有資料時回傳 null */
export function gridOf(points: Array<{ x: number; y: number }>): WaferGrid | null {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return minX === Infinity ? null : { minX, maxX, minY, maxY }
}

/**
 * 排版：把晶粒格子放進 width × height 的畫布。
 *
 * - wafer：外框是圓，晶粒格子置中；格子的對角線不一定在圓內（真實晶圓角落本來就沒有晶粒）。
 *   間距取「直徑 ÷ 較多的那一邊格數」再留一點邊，使最外圈的晶粒不會壓到圓周。
 * - panel：外框是矩形，貼齊格子；dieAspect（寬 / 高）決定晶粒形狀。
 */
export function layoutWafer(options: {
  width: number
  height: number
  grid: WaferGrid
  shape?: WaferShape
  /** 外框與畫布邊緣的距離 */
  padding?: number
  /** 晶粒寬高比（寬 / 高） */
  dieAspect?: number
  flipY?: boolean
  /**
   * 晶圓模式：晶粒「最遠的角」到格子中心的距離（以晶粒高為單位，見 farthestCorner）。
   * 給了就依實際晶粒決定大小 —— 晶粒剛好放進圓內；不給時只看行列數（多片並排要一致時用這個）
   */
  reach?: number | null
}): WaferLayout {
  const { width, height, grid } = options
  const shape = options.shape ?? 'wafer'
  const padding = options.padding ?? 8
  const aspect = options.dieAspect && options.dieAspect > 0 ? options.dieAspect : 1
  const cols = grid.maxX - grid.minX + 1
  const rows = grid.maxY - grid.minY + 1
  const availW = Math.max(0, width - padding * 2)
  const availH = Math.max(0, height - padding * 2)
  const cx = width / 2
  const cy = height / 2

  if (shape === 'panel') {
    // 寬 = cols * pitchY * aspect、高 = rows * pitchY，兩邊都要放得下
    const pitchY = Math.min(availH / rows, availW / (cols * aspect))
    const pitchX = pitchY * aspect
    const fw = pitchX * cols
    const fh = pitchY * rows
    const frame = { x: cx - fw / 2, y: cy - fh / 2, width: fw, height: fh }
    return {
      shape, cx, cy, radius: Math.max(fw, fh) / 2, frame,
      pitchX, pitchY, originX: frame.x, originY: frame.y, grid, flipY: !!options.flipY,
    }
  }

  const diameter = Math.min(availW, availH)
  const radius = diameter / 2
  // 格子的半寬、半高（以 pitchY 為單位）要落在圓內：用格子外接矩形的「半對角線」會太保守，
  // 改用較長的一邊加上一顆晶粒的邊界
  const span = options.reach && options.reach > 0 ? options.reach * 2 * 1.03 : Math.max(cols * aspect, rows) + 1
  const pitchY = diameter / span
  const pitchX = pitchY * aspect
  const gw = pitchX * cols
  const gh = pitchY * rows
  return {
    shape, cx, cy, radius,
    frame: { x: cx - radius, y: cy - radius, width: diameter, height: diameter },
    pitchX, pitchY, originX: cx - gw / 2, originY: cy - gh / 2, grid, flipY: !!options.flipY,
  }
}

/**
 * 所有晶粒中，離格子中心最遠的那個角的距離（以晶粒高為單位）。
 * 晶圓排版用它決定晶粒大小：最外圈的晶粒剛好落在圓內，不會凸出圓周。
 */
export function farthestCorner(points: Array<{ x: number; y: number }>, grid: WaferGrid, dieAspect = 1): number {
  const mx = (grid.minX + grid.maxX) / 2
  const my = (grid.minY + grid.maxY) / 2
  let max = 0
  for (const p of points) {
    const dx = (Math.abs(p.x - mx) + 0.5) * dieAspect
    const dy = Math.abs(p.y - my) + 0.5
    max = Math.max(max, Math.hypot(dx, dy))
  }
  return max
}

/** 格座標 → 晶粒左上角像素 */
export function dieRect(layout: WaferLayout, x: number, y: number): { x: number; y: number; width: number; height: number } {
  const col = x - layout.grid.minX
  const row = layout.flipY ? layout.grid.maxY - y : y - layout.grid.minY
  return { x: layout.originX + col * layout.pitchX, y: layout.originY + row * layout.pitchY, width: layout.pitchX, height: layout.pitchY }
}

/** 像素 → 格座標（落在格子外時為 null；不檢查該位置有沒有晶粒） */
export function cellAt(layout: WaferLayout, px: number, py: number): { x: number; y: number } | null {
  if (!(layout.pitchX > 0) || !(layout.pitchY > 0)) return null
  const col = Math.floor((px - layout.originX) / layout.pitchX)
  const row = Math.floor((py - layout.originY) / layout.pitchY)
  const { minX, maxX, minY, maxY } = layout.grid
  if (col < 0 || row < 0 || col > maxX - minX || row > maxY - minY) return null
  return { x: minX + col, y: layout.flipY ? maxY - row : minY + row }
}

/** 定位缺口（notch）或平邊在圓周上的位置：回傳三角形的三個頂點 */
export function notchPath(layout: WaferLayout, side: WaferNotch): Array<[number, number]> | null {
  if (side === 'none' || layout.shape !== 'wafer') return null
  const { cx, cy, radius: r } = layout
  const d = Math.max(3, r * 0.04)
  const dir = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[side] as [number, number]
  const [ux, uy] = dir
  // 切線方向
  const [tx, ty] = [-uy, ux]
  const tip: [number, number] = [cx + ux * (r - d), cy + uy * (r - d)]
  const a: [number, number] = [cx + ux * r + tx * d, cy + uy * r + ty * d]
  const b: [number, number] = [cx + ux * r - tx * d, cy + uy * r - ty * d]
  return [a, tip, b]
}

/** 「格座標」→ 鍵；用來建立查表 */
export const cellKey = (x: number, y: number) => `${x},${y}`

/**
 * 鍵盤移動：從目前的晶粒往 (dx, dy) 方向找下一顆「有資料」的晶粒（跳過缺角與空格）。
 * 超出範圍時停在原地。dy 以畫面方向計（往下為正），flipY 時會換算成資料方向。
 */
export function stepCell(
  has: (x: number, y: number) => boolean,
  grid: WaferGrid,
  from: { x: number; y: number },
  dx: number,
  dy: number,
  flipY = false
): { x: number; y: number } {
  const sy = flipY ? -dy : dy
  let x = from.x + dx
  let y = from.y + sy
  while (x >= grid.minX && x <= grid.maxX && y >= grid.minY && y <= grid.maxY) {
    if (has(x, y)) return { x, y }
    x += dx
    y += sy
  }
  return from
}

/** 最靠近格子中心的晶粒（鍵盤第一次進入時的起點） */
export function centerCell<T extends { x: number; y: number }>(points: T[], grid: WaferGrid): T | null {
  const mx = (grid.minX + grid.maxX) / 2
  const my = (grid.minY + grid.maxY) / 2
  let best: T | null = null
  let bestD = Infinity
  for (const p of points) {
    const d = (p.x - mx) ** 2 + (p.y - my) ** 2
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best
}

// === 良率 ===

export interface BinCount {
  bin: string
  count: number
}

export interface YieldSummary {
  total: number
  pass: number
  /** 0～1；沒有晶粒時為 null */
  yield: number | null
  /** 各 bin 的顆數（依第一次出現的順序） */
  counts: BinCount[]
}

/** 統計各 bin 顆數與良率；isPass 判斷一個 bin 是否算良品 */
export function summarizeBins(bins: string[], isPass: (bin: string) => boolean): YieldSummary {
  const map = new Map<string, number>()
  let pass = 0
  for (const b of bins) {
    map.set(b, (map.get(b) ?? 0) + 1)
    if (isPass(b)) pass++
  }
  const total = bins.length
  return { total, pass, yield: total ? pass / total : null, counts: [...map].map(([bin, count]) => ({ bin, count })) }
}

export interface RingYield {
  /** 第幾圈（1 = 中心） */
  ring: number
  total: number
  pass: number
  yield: number | null
  /** 這一圈的內、外半徑（0～1，相對最遠那顆晶粒） */
  inner: number
  outer: number
}

/**
 * 依晶粒中心到圓心的距離分成 n 圈（等寬的同心環），統計每一圈的良率。
 * 用來看「邊緣良率掉多少」—— 製程問題常常集中在晶圓外圈。
 * 半徑以格座標計（以一顆晶粒的高為單位）：最遠那顆晶粒的中心落在最外圈；maxRadius 是它的距離。
 */
export function ringYields(
  points: Array<{ x: number; y: number; pass: boolean }>,
  grid: WaferGrid,
  rings: number,
  dieAspect = 1
): { maxRadius: number; rings: RingYield[] } {
  const n = Math.max(1, Math.floor(rings))
  const mx = (grid.minX + grid.maxX) / 2
  const my = (grid.minY + grid.maxY) / 2
  const dist = (p: { x: number; y: number }) => Math.hypot((p.x - mx) * dieAspect, p.y - my)
  let maxR = 0
  for (const p of points) maxR = Math.max(maxR, dist(p))
  const out: RingYield[] = Array.from({ length: n }, (_, i) => ({ ring: i + 1, total: 0, pass: 0, yield: null, inner: i / n, outer: (i + 1) / n }))
  for (const p of points) {
    const r = maxR ? dist(p) / maxR : 0
    const i = Math.min(n - 1, Math.floor(r * n))
    out[i].total++
    if (p.pass) out[i].pass++
  }
  for (const o of out) o.yield = o.total ? o.pass / o.total : null
  return { maxRadius: maxR, rings: out }
}
