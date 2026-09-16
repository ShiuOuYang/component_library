import { computed, onMounted, onUnmounted, ref, type ComputedRef, type CSSProperties, type Ref } from 'vue'
import * as d3 from 'd3'
import { sortCategories } from '../../utils/sortCategories'
import type {
  ChartDatum,
  ChartLayer,
  ChartMargin,
  ContinuousScaleType,
  XDomain,
  XScaleType,
  YDomain,
} from '@/components/library/charts/types/chart.types'

/**
 * Facet（分面）圖表的佈局計算
 *
 * 三個獨立的 composable：
 * - useFacetLayout：容器尺寸與 ResizeObserver
 * - useVerticalFacetLayout：垂直堆疊分面的高度與偏移
 * - useGridFacetLayout：二維網格分面
 */

// ===== 共用型別 =====

/** 參考線（例如良率門檻、規格上下限） */
export interface TriggerLine {
  /** 穩定 id，供 enter-update-exit 的 key 使用；未提供時退回索引 */
  id?: string
  /** 落在哪個值 */
  value: number
  /** 水平線（對應 Y 值）或垂直線（對應 X 值） */
  type?: 'horizontal' | 'vertical'
  /** 掛在哪一側的 Y 軸 */
  yAxis?: 'left' | 'right'
  /** 線上顯示的文字 */
  label?: string
  /** 標籤擺放位置 */
  labelPosition?: 'start' | 'middle' | 'end'
  color?: string
  /** 線寬（px） */
  strokeWidth?: number
  /** 虛線樣式，對應 SVG 的 stroke-dasharray */
  strokeDasharray?: string | null
  /** 是否響應滑鼠（hover 高亮、顯示 tooltip） */
  interactive?: boolean
  /** 是否列入圖例 */
  showInLegend?: boolean
}

/** 單一分面的設定 */
export interface FacetConfig<T = ChartDatum> {
  /** 分面標題 */
  title?: string
  /** 此分面的高度；垂直佈局時當作權重 */
  height?: number
  /** 此分面的圖層 */
  layers?: ChartLayer<T>[]

  /** 明確指定的 domain；未提供時由 layers 的資料推算 */
  xDomain?: XDomain
  yLeftDomain?: YDomain
  yRightDomain?: YDomain

  /** 此分面的 Y 軸比例尺種類（未指定時由使用端決定預設） */
  yLeftScaleType?: ContinuousScaleType
  yRightScaleType?: ContinuousScaleType

  /** Y 軸刻度格式化函式 */
  yLeftAxisFormat?: (value: number) => string
  yRightAxisFormat?: (value: number) => string

  /** 此分面要畫的參考線 */
  triggerLines?: TriggerLine[]
}

/** useFacetLayout 讀取的 props 子集 */
export interface FacetLayoutProps {
  width?: number
  height?: number
  totalHeight?: number
  autoResize?: boolean
}

/** 尺寸變化事件 */
type ResizeEmit = (event: 'chart-resize', payload: { width: number; height: number }) => void

/** ResizeObserver 的最小尺寸下限；再小就畫不出可讀的圖 */
const MIN_OBSERVED_WIDTH = 400
const MIN_OBSERVED_HEIGHT = 300
/** 尺寸變化小於此值視為抖動，不重繪 */
const RESIZE_THRESHOLD = 5

export interface UseFacetLayoutReturn {
  containerRef: Ref<HTMLElement | null>
  observedWidth: Ref<number>
  observedHeight: Ref<number>
  effectiveWidth: ComputedRef<number>
  effectiveHeight: ComputedRef<number>
  containerStyle: ComputedRef<CSSProperties>
  /** 每次尺寸真的變化就遞增，供 watch 觸發重繪 */
  chartVersion: Ref<number>
  setupResizeObserver: (debounceDelay?: number) => void
  cleanupResizeObserver: () => void
}

export function useFacetLayout(
  props: FacetLayoutProps,
  emit?: ResizeEmit
): UseFacetLayoutReturn {
  const containerRef = ref<HTMLElement | null>(null)
  const observedWidth = ref(props.width ?? MIN_OBSERVED_WIDTH)
  const observedHeight = ref(props.totalHeight ?? props.height ?? MIN_OBSERVED_HEIGHT)
  const chartVersion = ref(0)

  let resizeObserver: ResizeObserver | null = null
  let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null

  const effectiveWidth = computed(() =>
    props.autoResize ? observedWidth.value : props.width ?? 1200
  )

  const effectiveHeight = computed(() =>
    props.autoResize ? observedHeight.value : props.totalHeight ?? props.height ?? 800
  )

  const containerStyle = computed<CSSProperties>(() => {
    // autoResize 時交給外層 CSS 決定尺寸
    if (props.autoResize) return {}
    return {
      width: `${props.width}px`,
      height: `${props.totalHeight ?? props.height}px`,
    }
  })

  const setupResizeObserver = (debounceDelay = 150): void => {
    if (!props.autoResize || !containerRef.value) return

    resizeObserver = new ResizeObserver((entries) => {
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer)

      resizeDebounceTimer = setTimeout(() => {
        // 🔧 防禦：debounce 期間元件可能已卸載
        if (!containerRef.value) return

        const entry = entries[0]
        if (!entry) return

        const { width, height } = entry.contentRect
        const newWidth = Math.max(width, MIN_OBSERVED_WIDTH)
        const newHeight = Math.max(height, MIN_OBSERVED_HEIGHT)

        // 忽略幾 px 的抖動，避免一直重繪
        const changed =
          Math.abs(observedWidth.value - newWidth) > RESIZE_THRESHOLD ||
          Math.abs(observedHeight.value - newHeight) > RESIZE_THRESHOLD
        if (!changed) return

        observedWidth.value = newWidth
        observedHeight.value = newHeight
        chartVersion.value += 1
        emit?.('chart-resize', { width: newWidth, height: newHeight })
      }, debounceDelay)
    })

    resizeObserver.observe(containerRef.value)
  }

  const cleanupResizeObserver = (): void => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (resizeDebounceTimer) {
      clearTimeout(resizeDebounceTimer)
      resizeDebounceTimer = null
    }
  }

  onMounted(() => setupResizeObserver())
  onUnmounted(cleanupResizeObserver)

  return {
    containerRef,
    observedWidth,
    observedHeight,
    effectiveWidth,
    effectiveHeight,
    containerStyle,
    chartVersion,
    setupResizeObserver,
    cleanupResizeObserver,
  }
}

// ===== 垂直分面 =====

/** useVerticalFacetLayout 讀取的 props 子集 */
export interface VerticalFacetProps<T = ChartDatum> {
  width?: number
  facets: FacetConfig<T>[]
  margin?: Partial<ChartMargin>
  /** 分面之間的間距 */
  facetSpacing?: number
  /** 最後一個分面多給的高度（留給 X 軸標籤） */
  lastFacetExtraHeight?: number
}

/** 分面高度下限，再矮就畫不出座標軸 */
const MIN_FACET_HEIGHT = 100

export interface UseVerticalFacetLayoutReturn {
  chartWidth: ComputedRef<number>
  availableHeight: ComputedRef<number>
  facetHeights: ComputedRef<number[]>
  facetOffsets: ComputedRef<number[]>
}

export function useVerticalFacetLayout<T extends ChartDatum = ChartDatum>(
  props: VerticalFacetProps<T>,
  effectiveHeight: ComputedRef<number> | Ref<number>
): UseVerticalFacetLayoutReturn {
  const chartWidth = computed(() => props.width ?? 1200)

  const availableHeight = computed(() => {
    const spacing = props.facetSpacing ?? 10
    const gaps = Math.max(props.facets.length - 1, 0) * spacing
    return effectiveHeight.value - (props.margin?.top ?? 40) - (props.margin?.bottom ?? 60) - gaps
  })

  /** 最後一個分面多留的高度 */
  const extraFor = (index: number): number =>
    index === props.facets.length - 1 ? props.lastFacetExtraHeight ?? 50 : 0

  /**
   * 每個分面的高度。三種情況：
   * - 全部都有 height：當作權重比例分配
   * - 部分有 height：有的用固定值，其餘均分剩下的空間
   * - 都沒有：全部均分
   */
  const facetHeights = computed<number[]>(() => {
    if (props.facets.length === 0) return []

    const allHaveHeight = props.facets.every((f) => f.height)
    const someHaveHeight = props.facets.some((f) => f.height)

    if (allHaveHeight) {
      const totalWeight = props.facets.reduce((sum, f) => sum + (f.height ?? 1), 0)
      return props.facets.map((facet, index) => {
        const weight = facet.height ?? 1
        const baseHeight = Math.floor(availableHeight.value * (weight / totalWeight))
        return Math.max(baseHeight + extraFor(index), MIN_FACET_HEIGHT)
      })
    }

    if (someHaveHeight) {
      const totalCustomHeight = props.facets.reduce((sum, f) => sum + (f.height ?? 0), 0)
      const remainingCount = props.facets.filter((f) => !f.height).length
      const remainingHeight = availableHeight.value - totalCustomHeight
      const defaultHeight = remainingCount > 0 ? remainingHeight / remainingCount : 0

      return props.facets.map((f, index) =>
        Math.max((f.height ?? defaultHeight) + extraFor(index), MIN_FACET_HEIGHT)
      )
    }

    const baseHeight = Math.floor(availableHeight.value / props.facets.length)
    return props.facets.map((_, index) =>
      Math.max(baseHeight + extraFor(index), MIN_FACET_HEIGHT)
    )
  })

  /** 每個分面的垂直起始位置，由上往下累加 */
  const facetOffsets = computed<number[]>(() => {
    const spacing = props.facetSpacing ?? 10
    const offsets: number[] = []
    let currentY = props.margin?.top ?? 40

    facetHeights.value.forEach((height) => {
      offsets.push(currentY)
      currentY += height + spacing
    })

    return offsets
  })

  return { chartWidth, availableHeight, facetHeights, facetOffsets }
}

// ===== 網格分面 =====

/** 網格分面的一格資料 */
export interface GridFacetDatum<T = ChartDatum> extends FacetConfig<T> {
  [key: string]: unknown
}

/** 組好的網格分面 */
export interface GridFacet<T = ChartDatum> extends FacetConfig<T> {
  id: string
  row: number
  col: number
  xValue: unknown
  yValue: unknown
}

/** useGridFacetLayout 讀取的 props 子集 */
export interface GridFacetProps<T = ChartDatum> {
  data?: GridFacetDatum<T>[]
  /** 決定欄的欄位名稱 */
  xFacetVar?: string
  /** 決定列的欄位名稱 */
  yFacetVar?: string
  xScaleType?: XScaleType
  headerWidth?: number
  headerHeight?: number
}


/**
 * 依資料推算 Y domain，並在兩端留白。
 *
 * 🔧 原本寫成 [min * 0.9, max * 1.1]：min 為負值時 min * 0.9 會往零靠，
 *    domain 反而變窄，最低的資料點會被裁掉。改為依範圍加固定比例的邊界。
 */
function padDomain(values: number[], padRatio: number): YDomain | undefined {
  if (values.length === 0) return undefined

  const min = d3.min(values)
  const max = d3.max(values)
  if (min === undefined || max === undefined || Number.isNaN(min) || Number.isNaN(max)) {
    return undefined
  }

  // min === max 時 span 為 0，改用絕對值的比例（全為 0 則退回 [0, 1]）
  const span = max - min
  const pad = span > 0 ? span * padRatio : Math.abs(max) * padRatio || 1

  return [min - pad, max + pad]
}

export interface UseGridFacetLayoutReturn<T = ChartDatum> {
  uniqueXValues: ComputedRef<unknown[]>
  uniqueYValues: ComputedRef<unknown[]>
  cols: ComputedRef<number>
  rows: ComputedRef<number>
  cellWidth: ComputedRef<number>
  cellHeight: ComputedRef<number>
  headerWidth: ComputedRef<number>
  headerHeight: ComputedRef<number>
  gridFacets: ComputedRef<GridFacet<T>[]>
  getGridCellStyle: (row: number, col: number) => CSSProperties
  getColHeaderStyle: (colIndex: number) => CSSProperties
  getRowHeaderStyle: (rowIndex: number) => CSSProperties
  getCellMargin: (row: number, col: number) => ChartMargin
}

export function useGridFacetLayout<T extends ChartDatum = ChartDatum>(
  props: GridFacetProps<T>,
  effectiveWidth: ComputedRef<number> | Ref<number>,
  effectiveHeight: ComputedRef<number> | Ref<number>
): UseGridFacetLayoutReturn<T> {
  const uniqueXValues = computed(() => {
    if (!props.xFacetVar || !props.data) return []
    const key = props.xFacetVar
    return sortCategories([...new Set(props.data.map((d) => d[key]))])
  })

  const uniqueYValues = computed(() => {
    if (!props.yFacetVar || !props.data) return []
    const key = props.yFacetVar
    return sortCategories([...new Set(props.data.map((d) => d[key]))])
  })

  const cols = computed(() => uniqueXValues.value.length || 1)
  const rows = computed(() => uniqueYValues.value.length || 1)

  const headerWidth = computed(() => props.headerWidth ?? 80)
  const headerHeight = computed(() => props.headerHeight ?? 40)

  const cellWidth = computed(() => (effectiveWidth.value - headerWidth.value) / cols.value)
  const cellHeight = computed(() => (effectiveHeight.value - headerHeight.value) / rows.value)

  /** 從圖層資料推算 X domain */
  function deriveXDomain(facet: GridFacetDatum<T>): XDomain | undefined {
    const firstLayer = facet.layers?.[0]
    if (!firstLayer?.data || !firstLayer.xValue) return undefined

    const xValue = firstLayer.xValue
    const xValues = firstLayer.data.map((d) => xValue(d))

    if (props.xScaleType === 'band') return xValues as string[]

    const [min, max] = d3.extent(xValues as unknown as number[])
    return min === undefined || max === undefined ? undefined : [min, max]
  }

  /** 從 yAxis='left'（或未指定）的圖層推算左 Y domain */
  function deriveYLeftDomain(facet: GridFacetDatum<T>): YDomain | undefined {
    const leftLayers = facet.layers?.filter((l) => l.yAxis === 'left' || !l.yAxis)
    if (!leftLayers?.length) return undefined

    const allYValues: number[] = []

    leftLayers.forEach((layer) => {
      if (!layer.data) return

      if (layer.type === 'stacked-bar' && layer.stackKeys && layer.xValue) {
        const stackKeys = layer.stackKeys
        // 堆疊圖：同一個 X 值的各段要先加總，才是這一根柱子的實際高度
        const groupedData = d3.group(layer.data, layer.xValue)
        groupedData.forEach((items) => {
          const total = stackKeys.reduce(
            (sum, key) => sum + (d3.sum(items, (d) => Number(d[key]) || 0) ?? 0),
            0
          )
          allYValues.push(total)
        })
      } else if (layer.yValue) {
        const yValue = layer.yValue
        layer.data.forEach((d) => allYValues.push(yValue(d)))
      }
    })

    if (allYValues.length === 0) return undefined

    // 左軸從 0 起算（柱狀圖的基線），只在上方留白
    const max = d3.max(allYValues)
    if (max === undefined || Number.isNaN(max)) return undefined
    return [0, max * 1.1]
  }

  /** 從 yAxis='right' 的圖層推算右 Y domain */
  function deriveYRightDomain(facet: GridFacetDatum<T>): YDomain | undefined {
    const rightLayers = facet.layers?.filter((l) => l.yAxis === 'right')
    if (!rightLayers?.length) return undefined

    const allYValues: number[] = []
    rightLayers.forEach((layer) => {
      if (!layer.data || !layer.yValue) return
      const yValue = layer.yValue
      layer.data.forEach((d) => allYValues.push(yValue(d)))
    })

    // 右軸通常是折線（如良率、百分比），不強制從 0 起算，兩端各留 10%
    return padDomain(allYValues, 0.1)
  }

  const gridFacets = computed<GridFacet<T>[]>(() => {
    if (!props.data || !props.xFacetVar || !props.yFacetVar) return []

    const xKey = props.xFacetVar
    const yKey = props.yFacetVar
    const facets: GridFacet<T>[] = []

    uniqueYValues.value.forEach((yVal, rowIndex) => {
      uniqueXValues.value.forEach((xVal, colIndex) => {
        const facetData = props.data?.find((d) => d[xKey] === xVal && d[yKey] === yVal)
        if (!facetData) return

        facets.push({
          ...facetData,
          id: `${String(xVal)}-${String(yVal)}`,
          row: rowIndex,
          col: colIndex,
          xValue: xVal,
          yValue: yVal,
          // 明確傳入的 domain 優先，否則由資料推算（brush 重置需要完整範圍）
          xDomain: facetData.xDomain ?? deriveXDomain(facetData),
          yLeftDomain: facetData.yLeftDomain ?? deriveYLeftDomain(facetData),
          yRightDomain: facetData.yRightDomain ?? deriveYRightDomain(facetData),
        })
      })
    })

    return facets
  })

  // ===== 樣式計算 =====
  // 顏色一律走設計令牌的 CSS 變數；原本是寫死的 #e5e7eb / #4b5563 / #f9fafb，
  // 改品牌色或切深色模式時不會跟著變。

  const getGridCellStyle = (row: number, col: number): CSSProperties => ({
    position: 'absolute',
    top: `${headerHeight.value + row * cellHeight.value}px`,
    left: `${headerWidth.value + col * cellWidth.value}px`,
    width: `${cellWidth.value}px`,
    height: `${cellHeight.value}px`,
    border: '1px solid var(--color-border-light)',
  })

  const getColHeaderStyle = (colIndex: number): CSSProperties => ({
    position: 'absolute',
    top: '0px',
    left: `${headerWidth.value + colIndex * cellWidth.value}px`,
    width: `${cellWidth.value}px`,
    height: `${headerHeight.value}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    borderBottom: '2px solid var(--color-border-dark)',
    backgroundColor: 'var(--color-bg-secondary)',
  })

  const getRowHeaderStyle = (rowIndex: number): CSSProperties => ({
    position: 'absolute',
    top: `${headerHeight.value + rowIndex * cellHeight.value}px`,
    left: '0px',
    width: `${headerWidth.value}px`,
    height: `${cellHeight.value}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    writingMode: 'vertical-rl',
    textOrientation: 'mixed',
    borderRight: '2px solid var(--color-border-dark)',
    backgroundColor: 'var(--color-bg-secondary)',
  })

  /** 只有最外圈的格子需要留空間給座標軸標籤 */
  const getCellMargin = (row: number, col: number): ChartMargin => ({
    top: 5,
    right: col === cols.value - 1 ? 40 : 5,
    bottom: row === rows.value - 1 ? 40 : 5,
    left: col === 0 ? 40 : 5,
  })

  return {
    uniqueXValues,
    uniqueYValues,
    cols,
    rows,
    cellWidth,
    cellHeight,
    headerWidth,
    headerHeight,
    gridFacets,
    getGridCellStyle,
    getColHeaderStyle,
    getRowHeaderStyle,
    getCellMargin,
  }
}
