/**
 * DualAxisComboChart 內部共用的型別與常數（從元件拆出來，各 composable 共用）
 * @internal
 */
import type { ChartDatum, ChartLayer } from '../../types/chart.types'

// === 圖例 ===

/** 圖例中一個項目的樣式種類 */
export type LegendSymbol = 'rect' | 'line' | 'scatter' | 'trigger-line'

/** 圖例項 */
export interface LegendItem {
  label: string
  color: string
  /** 決定要畫方塊、線段還是圓點 */
  type: LegendSymbol
  /** scatter 用的圓點半徑 */
  dotSize?: number
  /** trigger-line 用的虛線樣式 */
  strokeDasharray?: string | null
}

// === D3 事件與綁定資料的型別 ===

/** 綁在 SVG 元素上的資料（供 brush overlay 穿透時讀回） */
export interface BoundDatum {
  rawData: ChartDatum
  layer: ChartLayer
  seriesKey?: string
  /** 連動高亮用的資料鍵（見 datumKey） */
  key?: string
}

/** 連動高亮的標記：點（折線、散點）或矩形（長條、堆疊的一段） */
export type HighlightMark =
  | { kind: 'point'; x: number; y: number; r: number; color: string }
  | { kind: 'rect'; x: number; y: number; w: number; h: number }

/**
 * 大量資料模式的命中測試資料。
 * Canvas 上畫的點與長條沒有 DOM 元素，滑鼠提示改用這些座標陣列找出指到哪一筆。
 */
export type LargeHitStore =
  | {
      kind: 'point'
      layer: ChartLayer
      data: ChartDatum[]
      px: Float32Array
      py: Float32Array
      color: string
      /** hover 標記的半徑 */
      radius: number
    }
  | {
      kind: 'rect'
      layer: ChartLayer
      /** 每個矩形對應的資料列（堆疊圖同一列會出現多次，一段一次） */
      data: ChartDatum[]
      seriesKeys: string[] | null
      x0: Float32Array
      y0: Float32Array
      x1: Float32Array
      y1: Float32Array
    }

/** 滾輪作用的軸；'xy' 是繪圖區（X 與 Y 同時） */
export type WheelTarget = 'x' | 'yLeft' | 'yRight' | 'xy'

/** 一般模式下可以 hover 的 SVG 元素 class */
export const HOVERABLE_CLASSES = ['stacked-bar', 'bar', 'line-dot', 'scatter-dot'];

/** 滾輪縮放速度：一般滑鼠一格（deltaY = 100）約縮放 1.22 倍 */
export const WHEEL_ZOOM_SPEED = 0.002;

/**
 * 不限制縮小時，範圍最多是全覽的幾倍。
 * 實際上等於沒有上限，只是避免一直往外滾讓數值溢位成 Infinity（比例尺會壞掉）
 */
export const MAX_ZOOM_OUT = 1e6;

/** brush 結束事件；x 模式的 selection 是一對座標，xy 模式是兩個角 */
export interface BrushSelectionEvent {
  selection: [number, number] | [[number, number], [number, number]] | null
}

/** 一批要畫在 Canvas 上的矩形（長條） */
export interface RectBatch {
  data: ChartDatum[]
  seriesKeys: string[] | null
  x0: Float32Array
  y0: Float32Array
  x1: Float32Array
  y1: Float32Array
  /** 每個矩形的顏色索引（對應 colors） */
  colorIndex: Uint16Array
  colors: string[]
}
