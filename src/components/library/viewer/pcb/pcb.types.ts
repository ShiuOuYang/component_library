/**
 * PCB 佈局的資料型別
 *
 * 描述外部傳進來的結構化 JSON，與畫布、Vue 無關，因此與幾何計算
 * 一起獨立出來，讓計算邏輯可以單獨測試。
 */

/** 圖形類型；也是配色與渲染順序的鍵 */
export type PcbElementType =
  | 'outline'
  | 'trace'
  | 'pad'
  | 'via'
  | 'region'
  | 'silk'
  | 'component'

/** 焊盤形狀 */
export type PcbPadShape = 'circle' | 'rect' | 'oblong'

/** 路徑上的一個點 */
export interface PcbPoint {
  x: number
  y: number
}

/** 板框：封閉的折線 */
export interface PcbOutline {
  type: 'outline'
  path: PcbPoint[]
  width?: number
}

/** 銅箔區域：封閉的填充多邊形 */
export interface PcbRegion {
  type: 'region'
  path: PcbPoint[]
}

/** 走線：一段線 */
export interface PcbTrace {
  type: 'trace'
  x1: number
  y1: number
  x2: number
  y2: number
  width?: number
}

/** 焊盤 */
export interface PcbPad {
  type: 'pad'
  x: number
  y: number
  shape?: PcbPadShape
  width?: number
  /** 省略時沿用 width（正方形／正圓） */
  height?: number
  /** 鑽孔直徑；有值時在焊盤中央挖一個孔 */
  drill?: number
}

/** 過孔：外圈銅 + 內孔 */
export interface PcbVia {
  type: 'via'
  x: number
  y: number
  outerDia?: number
  innerDia?: number
}

/** 絲印：線條或文字 */
export interface PcbSilk {
  type: 'silk'
  path?: PcbPoint[]
  width?: number
  text?: string
  x?: number
  y?: number
  fontSize?: number
}

/** 元件外框 */
export interface PcbComponent {
  type: 'component'
  x: number
  y: number
  width?: number
  height?: number
  rotation?: number
  /** 元件標號，例如 U1 */
  refDes?: string
}

export type PcbElement =
  | PcbOutline
  | PcbRegion
  | PcbTrace
  | PcbPad
  | PcbVia
  | PcbSilk
  | PcbComponent

/** 一個圖層 */
export interface PcbLayerInput {
  name?: string
  color?: string
  visible?: boolean
  elements?: PcbElement[]
}

/** 板子尺寸 */
export interface PcbBoard {
  width?: number
  height?: number
  units?: string
}

/** 元件接收的完整資料 */
export interface PcbData {
  board?: PcbBoard
  /** 有 layers 時優先使用 */
  layers?: PcbLayerInput[]
  /** 沒有 layers 時直接給 elements，元件會依 type 自動分層 */
  elements?: PcbElement[]
}

/** 帶有 x / y 的元素（焊盤、過孔、元件、絲印文字） */
export function hasPosition(
  el: PcbElement
): el is PcbPad | PcbVia | PcbComponent | (PcbSilk & { x: number; y: number }) {
  return typeof (el as { x?: unknown }).x === 'number' &&
    typeof (el as { y?: unknown }).y === 'number'
}
