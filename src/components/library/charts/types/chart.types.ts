import type * as d3 from 'd3'

/**
 * 圖表共用型別
 *
 * charts 群原本整組是 JS，圖層設定、比例尺、brush 事件的形狀只存在於
 * JSDoc 註解裡 —— 寫錯欄位名稱要等到執行期畫不出來才會發現。
 */

// ===== 資料 =====

/** 單筆資料列。欄位由使用端決定，一律透過取值函式存取，不強制欄位名稱 */
export type ChartDatum = Record<string, unknown>

/** 從資料列取出 X 值 */
export type XAccessor<T = ChartDatum> = (datum: T) => string | number | Date

/** 從資料列取出 Y 值 */
export type YAccessor<T = ChartDatum> = (datum: T) => number

// ===== 比例尺 =====

/** 連續型比例尺的種類（對應 d3.scale* 建構子） */
export type ContinuousScaleType = 'linear' | 'log' | 'sqrt' | 'time' | 'symlog'

/** X 軸可用的比例尺種類；band 為離散類別 */
export type XScaleType = ContinuousScaleType | 'band'

/** 離散或連續的 X 軸比例尺 */
export type XScale =
  | d3.ScaleBand<string>
  | d3.ScaleContinuousNumeric<number, number>
  | d3.ScaleTime<number, number>

/** Y 軸比例尺一律為連續型 */
export type YScale = d3.ScaleContinuousNumeric<number, number>

/** X / Y 軸的 domain。band 為類別陣列，連續型為 [min, max] */
export type XDomain = string[] | [number, number] | [Date, Date]
export type YDomain = [number, number]

// ===== 圖層 =====

/**
 * 圖層類型。
 *
 * 'trigger-line' 不是真正的資料圖層 —— 參考線沒有 data 也不參與比例尺計算。
 * 它只出現在 layer-hover / layer-click 的 payload 裡，讓使用端能用同一組
 * 事件處理參考線的互動。這是既有的對外行為，型別如實反映而不改 API。
 */
export type ChartLayerType = 'bar' | 'stacked-bar' | 'line' | 'area' | 'scatter' | 'trigger-line'

/** 圖層要掛在左或右 Y 軸 */
export type ChartAxisSide = 'left' | 'right'

/** 圖層在圖例中的設定 */
export interface ChartLayerLegend {
  /** 是否顯示此圖層的圖例項（預設顯示） */
  show?: boolean
  /** 圖例文字 */
  label?: string
}

/**
 * 單一圖層設定。
 *
 * 一張圖可以疊多個圖層（例如柱狀 + 折線雙軸），每個圖層各自帶資料與取值函式。
 */
export interface ChartLayer<T = ChartDatum> {
  /** 圖層類型 */
  type: ChartLayerType
  /** 此圖層的資料 */
  data?: T[]
  /** 掛在哪一側的 Y 軸 */
  yAxis?: ChartAxisSide
  /** X 值取值函式 */
  xValue?: XAccessor<T>
  /** Y 值取值函式（stacked-bar 不需要，改用 stackKeys） */
  yValue?: YAccessor<T>
  /** 堆疊柱狀圖的堆疊欄位；每個 key 對應一段 */
  stackKeys?: string[]
  /** 圖層名稱（圖例用） */
  name?: string
  /** 顏色或色階 */
  color?: string
  colorScale?: d3.ScaleOrdinal<string, string>
  /** enter-update-exit 的 key 函式，避免重繪時錯位 */
  keyFn?: (datum: T, index: number) => string

  // ===== 折線圖專屬 =====
  /** 線條顏色 */
  lineColor?: string
  /** 線寬（px） */
  strokeWidth?: number
  /** 是否在每個資料點畫圓點 */
  showDots?: boolean
  /** 圓點半徑（px） */
  dotSize?: number
  /** 圓點顏色；未指定時沿用 lineColor */
  dotColor?: string
  /** 圓點不透明度（0~1） */
  dotOpacity?: number
  /** D3 曲線插值器，例如 d3.curveMonotoneX */
  curve?: d3.CurveFactory

  // ===== 圖例 =====
  /** 此圖層在圖例中的設定 */
  legend?: ChartLayerLegend

  /** 由 useChartScales 標記「此圖層的 data 已按 brush 範圍過濾」 */
  _isFiltered?: boolean
}

/**
 * 經過 useChartScales 處理的圖層。
 *
 * 結構與 ChartLayer 相同；用不同名稱只是為了在回傳型別上標示
 * 「這批圖層的 data 可能已按 brush 範圍過濾」（看 _isFiltered 旗標）。
 * 不把 _isFiltered 收窄成 true —— 沒有 brush 範圍時會原樣回傳未過濾的圖層。
 */
export type ProcessedChartLayer<T = ChartDatum> = ChartLayer<T>

// ===== brush =====

/** brush 模式：x 只選 X 範圍、xy 同時選、none 關閉 */
export type BrushMode = 'x' | 'xy' | 'none'

/** brush 選取後發出的範圍 */
export interface BrushSelectionPayload {
  xDomain: XDomain
  yDomain?: YDomain
  yLeftDomain?: YDomain
  yRightDomain?: YDomain
}

/** 圖表容器的內距 */
export interface ChartMargin {
  top: number
  right: number
  bottom: number
  left: number
}

/** 建立 brush 實例所需的尺寸 */
export interface BrushDimensions {
  width: number
  height: number
  margin: ChartMargin
}

/**
 * useChartScales 會讀取的 props 子集。
 *
 * 刻意只宣告它真正用到的欄位 —— 元件的完整 props 型別各自定義，
 * 傳進來時結構相容即可。
 */
export interface ChartScalesProps<T = ChartDatum> {
  layers: ChartLayer<T>[]
  xScaleType?: XScaleType
  yLeftScaleType?: ContinuousScaleType
  yRightScaleType?: ContinuousScaleType
  xDomain?: XDomain | null
  yLeftDomain?: YDomain | null
  yRightDomain?: YDomain | null
  brushMode?: BrushMode
}

// ===== Tooltip =====

/**
 * Tooltip 的座標。
 *
 * pageX / pageY 是視窗座標（可直接配 position: fixed）；
 * containerX / containerY 是相對圖表容器的座標，容器尚未掛載時為 null。
 */
export interface TooltipPosition {
  pageX: number
  pageY: number
  containerX: number | null
  containerY: number | null
}

/**
 * Tooltip 的內容，同時是 tooltip 插槽的 payload 與 tooltip-show 事件的載荷。
 *
 * 外層元件（例如 GridFacetChart）要自行擺放 tooltip 時需要 position，
 * 因此位置資訊放在 payload 裡，而不是只隨事件發出。
 */
export interface TooltipPayload<T = ChartDatum> {
  /** 被懸停元素對應的資料列 */
  data: T
  /** 該元素所屬的圖層設定 */
  layer: ChartLayer<T>
  /** 堆疊圖的系列鍵；非堆疊圖為 undefined */
  seriesKey?: string
  /** 觸發懸停時的滑鼠位置 */
  position: TooltipPosition
}

// ===== 型別守衛 =====

/**
 * 是否為 band scale（離散類別）。
 *
 * 只有 band scale 有 bandwidth()；柱狀圖的寬度與位置計算依賴它。
 * 渲染函式用這個守衛一次收窄，之後就不必在每個呼叫點各自斷言。
 */
export function isBandScale(scale: XScale | null | undefined): scale is d3.ScaleBand<string> {
  return scale !== null && scale !== undefined && typeof (scale as d3.ScaleBand<string>).bandwidth === 'function'
}

/**
 * 是否為連續型比例尺（linear / time / log …）。
 * 連續型有 invert()，band 沒有 —— 框選要把像素換算回資料值時需要它。
 */
export function isContinuousScale(
  scale: XScale | YScale | null | undefined
): scale is d3.ScaleContinuousNumeric<number, number> {
  return (
    scale !== null &&
    scale !== undefined &&
    typeof (scale as d3.ScaleContinuousNumeric<number, number>).invert === 'function'
  )
}
