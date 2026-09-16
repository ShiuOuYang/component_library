/**
 * Gerber 幾何計算
 *
 * 純函式：把解析結果換算成 SVG path 與整體邊界，不碰 DOM 也不碰 Vue。
 */
import type { ImageTree, PathSegment } from '@tracespace/plotter'
import type { MoveCommand, ParsedLayer } from './gerber.types'
import { isParsedExcellon } from './gerber.types'

/** 鑽頭直徑缺失時的預設值（mm） */
const DEFAULT_DRILL_DIAMETER = 0.3

/** 圖形的外接矩形 */
export interface Bounds {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * 把 tracespace 的線段陣列轉成 SVG path 的 d 屬性。
 *
 * 弧的 largeArc / sweep 由起終點的角度差決定：
 * 角度差超過 π 就是大弧，終點角度較大則為正向掃掠。
 */
export function segmentsToPath(segments: PathSegment[] | undefined | null): string {
  if (!segments || segments.length === 0) return ''

  let d = `M${segments[0].start[0]},${segments[0].start[1]}`
  for (const seg of segments) {
    if (seg.type === 'line') {
      d += `L${seg.end[0]},${seg.end[1]}`
    } else if (seg.type === 'arc') {
      const r = seg.radius
      const largeArc = Math.abs(seg.end[2] - seg.start[2]) > Math.PI ? 1 : 0
      const sweep = seg.end[2] > seg.start[2] ? 1 : 0
      d += `A${r},${r} 0 ${largeArc} ${sweep} ${seg.end[0]},${seg.end[1]}`
    }
  }
  return d
}

/** 累積邊界用的可變狀態 */
interface BoundsAccumulator {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function includePoint(acc: BoundsAccumulator, x: number, y: number): void {
  if (Number.isFinite(x)) {
    acc.minX = Math.min(acc.minX, x)
    acc.maxX = Math.max(acc.maxX, x)
  }
  if (Number.isFinite(y)) {
    acc.minY = Math.min(acc.minY, y)
    acc.maxY = Math.max(acc.maxY, y)
  }
}

/** 一個待計算邊界的圖層：可能來自 tracespace，也可能來自手動解析 */
export interface BoundsSource {
  imageTree?: ImageTree | null
  parsed?: ParsedLayer | null
  /**
   * 走 tracespace 渲染時單獨取出的 D02 軌跡。
   * tracespace 的 size 不含提筆移動，要顯示軌跡就得把它補算進來。
   */
  movePaths?: MoveCommand[] | null
}

/** computeBounds 的選項 */
export interface BoundsOptions {
  /**
   * 是否把 D02 移動軌跡的端點算進邊界。
   *
   * D02 只有在使用者打開軌跡顯示時才畫出來，預設不畫。把它算進邊界會讓
   * 畫面被「看不見的跳刀」撐開（常見的是第一個 D02 從原點跳出去，整張圖
   * 就被拉到含原點的範圍）。因此預設排除，只有真的要顯示軌跡時才納入。
   */
  includeMovePaths?: boolean
}

/**
 * 計算所有圖層的聯集邊界。
 *
 * 沒有任何有效座標時回傳 null —— 呼叫端據此顯示「無有效座標資料」，
 * 而不是拿 Infinity 去算出 NaN 的 transform。
 */
export function computeBounds(
  layers: BoundsSource[],
  options: BoundsOptions = {}
): Bounds | null {
  const includeMovePaths = options.includeMovePaths ?? false
  const acc: BoundsAccumulator = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }

  for (const layer of layers) {
    if (layer.imageTree) {
      // tracespace 已經算好 size；空陣列代表它也沒有內容
      const size = layer.imageTree.size
      if (size.length === 4) {
        const [x1, y1, x2, y2] = size
        includePoint(acc, x1, y1)
        includePoint(acc, x2, y2)
      }
      if (includeMovePaths) {
        for (const m of layer.movePaths ?? []) {
          includePoint(acc, m.fromX, m.fromY)
          includePoint(acc, m.x, m.y)
        }
      }
      continue
    }

    if (!layer.parsed) continue

    if (isParsedExcellon(layer.parsed)) {
      const { tools, commands } = layer.parsed
      for (const c of commands) {
        const r = (tools[c.tool ?? '']?.diameter ?? DEFAULT_DRILL_DIAMETER) / 2
        if (c.type === 'drill') {
          includePoint(acc, c.x - r, c.y - r)
          includePoint(acc, c.x + r, c.y + r)
        } else {
          includePoint(acc, Math.min(c.x1, c.x2) - r, Math.min(c.y1, c.y2) - r)
          includePoint(acc, Math.max(c.x1, c.x2) + r, Math.max(c.y1, c.y2) + r)
        }
      }
      continue
    }

    for (const c of layer.parsed.commands) {
      if (c.type === 'region') {
        // region 的頂點就是實際邊界（多數 silk / copper 內容都在這裡）
        for (const p of c.points) includePoint(acc, p.x, p.y)
        continue
      }

      if (c.type === 'move' && !includeMovePaths) continue

      includePoint(acc, c.x, c.y)
      if (c.type === 'draw' || c.type === 'move') {
        includePoint(acc, c.fromX, c.fromY)
      }
    }
  }

  if (!Number.isFinite(acc.minX) || !Number.isFinite(acc.minY)) return null
  return { x1: acc.minX, y1: acc.minY, x2: acc.maxX, y2: acc.maxY }
}

/** 把 Gerber 座標系映射到 SVG 像素的參數 */
export interface FitTransform {
  scale: number
  offsetX: number
  offsetY: number
  /** 幾何寬高（Gerber 單位） */
  geoWidth: number
  geoHeight: number
  /** 套用在世界群組上的 transform 字串（含 Y 軸翻轉） */
  transform: string
}

/**
 * 算出「等比置中塞進畫布」的轉換。
 *
 * Gerber 的 Y 軸向上、SVG 向下，所以 scale 的 y 取負值，並先平移到底部。
 * 寬高為 0（單點圖層）時以 1 代替，避免 scale 變成 Infinity。
 */
export function fitToViewport(
  bounds: Bounds,
  width: number,
  height: number,
  padding: number
): FitTransform {
  const geoWidth = bounds.x2 - bounds.x1 || 1
  const geoHeight = bounds.y2 - bounds.y1 || 1

  const scale = Math.min(
    (width - padding * 2) / geoWidth,
    (height - padding * 2) / geoHeight
  )
  const offsetX = (width - geoWidth * scale) / 2
  const offsetY = (height - geoHeight * scale) / 2

  return {
    scale,
    offsetX,
    offsetY,
    geoWidth,
    geoHeight,
    transform:
      `translate(${offsetX},${offsetY + geoHeight * scale}) ` +
      `scale(${scale},${-scale}) ` +
      `translate(${-bounds.x1},${-bounds.y1})`,
  }
}
