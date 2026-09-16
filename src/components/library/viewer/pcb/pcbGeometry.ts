/**
 * PCB 幾何計算
 *
 * 純函式：把結構化資料換算成 SVG path 與整體邊界，不碰 DOM 也不碰 Vue。
 */
import type { Bounds } from '../shared/viewportFit'
import type { PcbData, PcbElement, PcbPoint } from './pcb.types'
import { hasPosition } from './pcb.types'

/** 焊盤尺寸缺失時的預設值（mm） */
export const DEFAULT_PAD_SIZE = 0.6
/** 過孔外徑缺失時的預設值（mm） */
export const DEFAULT_VIA_OUTER = 0.6

/**
 * 把折線點陣列轉成 SVG path 的 d 屬性。
 *
 * closed 為 true 時補上 Z（板框與銅箔區域要封閉）。
 */
export function pathToD(points: PcbPoint[] | undefined | null, closed: boolean): string {
  if (!points || points.length === 0) return ''

  let d = `M${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += `L${points[i].x},${points[i].y}`
  }
  if (closed) d += 'Z'
  return d
}

/** 取出資料裡所有的元素（有 layers 就攤平，否則用頂層的 elements） */
export function collectElements(data: PcbData | null | undefined): PcbElement[] {
  if (!data) return []
  if (data.layers?.length) {
    return data.layers.flatMap((layer) => layer.elements ?? [])
  }
  return data.elements ?? []
}

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

/** computeBounds 的選項 */
export interface PcbBoundsOptions {
  /** 焊盤沒給尺寸時採用的預設值 */
  defaultPadSize?: number
}

/**
 * 計算整塊板子的邊界。
 *
 * 有 board.width / height 時直接採用（那是板子的實際輪廓，比逐一掃元素
 * 更可靠）；否則掃過所有元素取聯集。都算不出來時回傳 null，呼叫端據此
 * 放棄渲染，而不是拿 Infinity 去算出 NaN 的 transform。
 */
export function computeBounds(
  data: PcbData | null | undefined,
  options: PcbBoundsOptions = {}
): Bounds | null {
  const defaultPadSize = options.defaultPadSize ?? DEFAULT_PAD_SIZE

  // 優先使用 board 尺寸
  const board = data?.board
  if (board?.width && board?.height) {
    return { x1: 0, y1: 0, x2: board.width, y2: board.height }
  }

  const elements = collectElements(data)
  if (elements.length === 0) return null

  const acc: BoundsAccumulator = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }

  for (const el of elements) {
    switch (el.type) {
      case 'outline':
      case 'region':
        for (const p of el.path ?? []) includePoint(acc, p.x, p.y)
        break

      case 'trace':
        includePoint(acc, el.x1, el.y1)
        includePoint(acc, el.x2, el.y2)
        break

      case 'component': {
        const halfW = (el.width ?? 0) / 2
        const halfH = (el.height ?? 0) / 2
        includePoint(acc, el.x - halfW, el.y - halfH)
        includePoint(acc, el.x + halfW, el.y + halfH)
        break
      }

      case 'silk':
        // 絲印線條看路徑，絲印文字看座標
        if (el.path?.length) {
          for (const p of el.path) includePoint(acc, p.x, p.y)
        } else if (hasPosition(el)) {
          includePoint(acc, el.x, el.y)
        }
        break

      case 'pad': {
        const r = (el.width ?? defaultPadSize) / 2
        includePoint(acc, el.x - r, el.y - r)
        includePoint(acc, el.x + r, el.y + r)
        break
      }

      case 'via': {
        const r = (el.outerDia ?? DEFAULT_VIA_OUTER) / 2
        includePoint(acc, el.x - r, el.y - r)
        includePoint(acc, el.x + r, el.y + r)
        break
      }
    }
  }

  if (!Number.isFinite(acc.minX) || !Number.isFinite(acc.minY)) return null
  return { x1: acc.minX, y1: acc.minY, x2: acc.maxX, y2: acc.maxY }
}
