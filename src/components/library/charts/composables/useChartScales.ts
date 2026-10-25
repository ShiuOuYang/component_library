import { computed, ref, toRaw, type ComputedRef, type Ref } from 'vue'
import * as d3 from 'd3'
import type {
  ChartDatum,
  ChartLayer,
  ChartScalesProps,
  ContinuousScaleType,
  ProcessedChartLayer,
  XAccessor,
  XDomain,
  XScale,
  YDomain,
  YScale,
} from '../types/chart.types'

/**
 * useChartScales - 圖表比例尺與資料處理
 *
 * 封裝以下邏輯：
 * - X / 左右 Y 軸比例尺的建立與更新
 * - 依 brush 選取範圍過濾圖層資料
 * - 堆疊圖的最大值計算
 * - 自動推算 Y 軸範圍（brushMode='x' 時會依選取的 X 範圍重算）
 */

/** 連續型比例尺建構子對照表 */
const SCALE_CONSTRUCTORS: Record<ContinuousScaleType, () => YScale> = {
  linear: () => d3.scaleLinear(),
  log: () => d3.scaleLog(),
  sqrt: () => d3.scaleSqrt(),
  time: () => d3.scaleTime() as unknown as YScale,
  symlog: () => d3.scaleSymlog(),
}

/** 依名稱取得建構子，未知名稱退回 linear */
/**
 * 連續 X 軸上有 type:'bar' 圖層時，把 domain 兩端各往外推半個點距。
 * 長條以資料點為中心畫，不推的話第一根與最後一根會有一半畫到座標軸外面。
 * 沒有 bar 圖層、或只有一個點時原樣回傳。Date domain 仍回傳 Date。
 */
export function padDomainForBars<X extends number | Date, D>(
  domain: [X, X],
  layers: ReadonlyArray<{ type: string; data?: D[]; xValue?: (d: D) => unknown }>
): [X, X] {
  const xs = new Set<number>()
  for (const layer of layers) {
    if (layer.type !== 'bar' || !layer.data || !layer.xValue) continue
    for (const d of layer.data) {
      const v = Number(layer.xValue(d))
      if (Number.isFinite(v)) xs.add(v)
    }
  }
  const sorted = [...xs].sort((a, b) => a - b)
  if (sorted.length < 2) return domain
  let gap = Infinity
  for (let i = 1; i < sorted.length; i++) gap = Math.min(gap, sorted[i] - sorted[i - 1])
  if (!Number.isFinite(gap) || gap <= 0) return domain
  const pad = gap / 2
  const shift = (v: X, delta: number) => (v instanceof Date ? new Date(v.getTime() + delta) : (v as number) + delta) as X
  return [shift(domain[0], -pad), shift(domain[1], pad)]
}

/**
 * 取出圖層資料的原始陣列（不經 Vue Proxy）。
 *
 * ✅ 呼叫端若把 10 萬筆資料放進 ref()，每讀一個欄位都會經過 Proxy 並登記依賴：
 *    逐筆掃描的計算（範圍、最大值、過濾）慢上數倍，記憶體也跟著暴增。
 *    這裡先讀一次 length（陣列長度改變時仍會觸發重算，例如 push），再取原始陣列來掃。
 */
export function layerData<T>(layer: { data?: T[] }): T[] {
  const data = layer.data
  if (!data) return []
  void data.length
  return toRaw(data)
}

function resolveScale(type: string | undefined): () => YScale {
  return SCALE_CONSTRUCTORS[(type ?? 'linear') as ContinuousScaleType] ?? SCALE_CONSTRUCTORS.linear
}

export interface UseChartScalesReturn<T = ChartDatum> {
  // 比例尺（資料不足時為 null）
  xScale: ComputedRef<XScale | null>
  yLeftScale: ComputedRef<YScale | null>
  yRightScale: ComputedRef<YScale | null>

  // 圖層分組
  leftLayers: ComputedRef<ChartLayer<T>[]>
  rightLayers: ComputedRef<ChartLayer<T>[]>
  processedLeftLayers: ComputedRef<ProcessedChartLayer<T>[]>
  processedRightLayers: ComputedRef<ProcessedChartLayer<T>[]>

  // 原始 domain（供 brush 重置）
  originalXDomain: Ref<XDomain | null>
  /** 沒有縮放時的 X domain（props.xDomain 或依資料推算） */
  baseXDomain: ComputedRef<XDomain | null>
  /**
   * 滾輪縮放的邊界：資料全覽範圍（連續型）或完整類別清單（band）。
   * 與 baseXDomain 分開：分面圖同步縮放時，props.xDomain 會被設成「縮放後」的範圍，
   * 不能拿它當邊界，否則縮小不回去。
   */
  xZoomBounds: ComputedRef<XDomain | null>
  /** 沒有縮放時的左右 Y domain（重設縮放回到這裡） */
  yLeftBaseDomain: ComputedRef<YDomain | null>
  yRightBaseDomain: ComputedRef<YDomain | null>
  /**
   * Y 軸滾輪縮放的邊界：顯示中的基準範圍（取整後）與資料實際範圍的聯集。
   * 呼叫端設了 yLeftDomain 而資料超出時，往外縮仍看得到超出的部分。
   */
  yLeftZoomBounds: ComputedRef<YDomain | null>
  yRightZoomBounds: ComputedRef<YDomain | null>
  originalYLeftDomain: Ref<YDomain | null>
  originalYRightDomain: Ref<YDomain | null>

  // 工具函式
  filterDataByXDomain: (data: T[], xValue?: XAccessor<T>) => T[]
  calculateMaxYValue: (layers: ChartLayer<T>[]) => number
}

export function useChartScales<T extends ChartDatum = ChartDatum>(
  props: ChartScalesProps<T>,
  chartWidth: ComputedRef<number> | Ref<number>,
  chartHeight: ComputedRef<number> | Ref<number>,
  currentXDomain: Ref<XDomain | null>,
  currentYLeftDomain: Ref<YDomain | null>,
  currentYRightDomain: Ref<YDomain | null>
): UseChartScalesReturn<T> {
  // 原始 domain，供 brush 重置回復
  const originalXDomain = ref<XDomain | null>(null) as Ref<XDomain | null>
  const originalYLeftDomain = ref<YDomain | null>(null) as Ref<YDomain | null>
  const originalYRightDomain = ref<YDomain | null>(null) as Ref<YDomain | null>

  /** 按 yAxis 分組圖層，方便分別算左右 Y 軸範圍 */
  // 沒指定 yAxis 視為左軸（渲染函式本來就這樣預設）。原本要求 === 'left'，
  // 省略 yAxis 的圖層被靜默丟掉：不畫、也不參與比例尺，文件範例照抄就是空圖
  const leftLayers = computed(() => props.layers.filter((l) => l.yAxis !== 'right'))
  const rightLayers = computed(() => props.layers.filter((l) => l.yAxis === 'right'))

  /**
   * 依當前 X 範圍過濾資料。
   * band scale 用 Set 比對類別；連續型比對數值區間。
   */
  const filterDataByXDomain = (data: T[], xValue?: XAccessor<T>): T[] => {
    if (!currentXDomain.value || !xValue) return data

    if (props.xScaleType === 'band') {
      const currentDomain = new Set(currentXDomain.value as string[])
      return data.filter((d) => currentDomain.has(xValue(d) as string))
    }

    if (Array.isArray(currentXDomain.value)) {
      const [minX, maxX] = currentXDomain.value as [number, number]
      return data.filter((d) => {
        const x = xValue(d) as number
        return x >= minX && x <= maxX
      })
    }

    return data
  }

  /**
   * 計算一組圖層的最大 Y 值。
   * 堆疊圖要先把每列的 stackKeys 加總；brushMode='x' 時只算選取範圍內的資料。
   */
  const calculateMaxYValue = (layers: ChartLayer<T>[]): number => {
    let maxValue = 0

    layers.forEach((layer) => {
      let dataToCalculate = layerData(layer)

      // ✅ brushMode='x' 且有選取範圍時，只計算範圍內的資料，Y 軸才會跟著縮放
      if (props.brushMode === 'x' && currentXDomain.value && layer.xValue) {
        dataToCalculate = filterDataByXDomain(dataToCalculate, layer.xValue)
      }

      if (layer.type === 'stacked-bar') {
        const stackKeys = layer.stackKeys ?? []
        const sums = dataToCalculate.map((d) =>
          stackKeys.reduce((sum, key) => sum + (Number(d[key]) || 0), 0)
        )
        maxValue = Math.max(maxValue, d3.max(sums) ?? 0)
      } else if (layer.yValue) {
        const yValue = layer.yValue
        maxValue = Math.max(maxValue, d3.max(dataToCalculate, (d) => yValue(d)) ?? 0)
      }
    })

    return maxValue
  }

  /** 第一個有 xValue 的圖層的取值函式（決定 X 軸取哪個欄位） */
  const primaryXValue = (): XAccessor<T> =>
    props.layers[0]?.xValue ?? ((d) => d.category as string)

  /**
   * 資料本身的 X 範圍：連續型為 [min, max]（有 bar 圖層時兩端各推半個點距），
   * band 為依出現順序的不重複類別。不受縮放影響，資料不變就不重算。
   */
  const dataXDomain = computed<XDomain | null>(() => {
    const xValue = primaryXValue()
    if (props.xScaleType === 'band') {
      const seen = new Set<string>()
      for (const layer of props.layers) {
        for (const d of layerData(layer)) seen.add(xValue(d) as string)
      }
      return seen.size ? [...seen] : null
    }
    let min = Infinity
    let max = -Infinity
    let any = false
    for (const layer of props.layers) {
      for (const d of layerData(layer)) {
        const v = +(xValue(d) as number)
        if (!Number.isFinite(v)) continue
        any = true
        if (v < min) min = v
        if (v > max) max = v
      }
    }
    if (!any) return null
    // 連續型 X 軸的取值必為 number 或 Date；時間軸要轉回 Date，d3.scaleTime 的刻度才正確
    const isTime = props.xScaleType === 'time'
    const domain = (isTime ? [new Date(min), new Date(max)] : [min, max]) as [number, number]
    return padDomainForBars<number, T>(
      domain,
      props.layers.map((layer) => ({ ...layer, data: layerData(layer) }))
    )
  })

  /** 沒有縮放時的 X domain */
  const baseXDomain = computed<XDomain | null>(() => {
    const hasData = props.layers.some((layer) => layerData(layer).length > 0)
    if (!hasData) return null
    return props.xDomain ?? dataXDomain.value ?? (props.xScaleType === 'band' ? [] : [0, 0])
  })

  /** 滾輪縮放的邊界（見回傳型別說明） */
  const xZoomBounds = computed<XDomain | null>(() => {
    const data = dataXDomain.value
    const explicit = props.xDomain ?? null
    if (props.xScaleType === 'band') {
      const cats = (data ?? []) as string[]
      // 呼叫端給的類別清單通常是用來指定順序；涵蓋所有資料類別時以它為準
      if (explicit && (explicit as string[]).length >= cats.length) return explicit
      return cats.length ? cats : explicit
    }
    if (!data) return explicit
    if (!explicit) return data
    // 連續型：資料範圍與 props.xDomain 取聯集
    const [a0, a1] = (data as [number, number]).map(Number)
    const [b0, b1] = (explicit as [number, number]).map(Number)
    const lo = Math.min(a0, b0)
    const hi = Math.max(a1, b1)
    return (props.xScaleType === 'time' ? [new Date(lo), new Date(hi)] : [lo, hi]) as XDomain
  })

  /**
   * 一組圖層的 Y 值實際範圍（不受縮放影響）。堆疊圖用每列 stackKeys 的總和，並含 0（從 0 往上疊）。
   */
  const calculateYExtent = (layers: ChartLayer<T>[]): YDomain | null => {
    let min = Infinity
    let max = -Infinity
    for (const layer of layers) {
      const data = layerData(layer)
      if (layer.type === 'stacked-bar') {
        const keys = layer.stackKeys ?? []
        for (const d of data) {
          const sum = keys.reduce((acc, key) => acc + (Number(d[key]) || 0), 0)
          min = Math.min(min, 0, sum)
          max = Math.max(max, sum)
        }
      } else if (layer.yValue) {
        for (const d of data) {
          const v = Number(layer.yValue(d))
          if (!Number.isFinite(v)) continue
          if (v < min) min = v
          if (v > max) max = v
        }
      }
    }
    return min <= max ? [min, max] : null
  }

  /**
   * X 軸比例尺。
   * band 用於離散類別，其餘走連續型；隨 currentXDomain 變化實現縮放。
   * ✅ 縮放時只換 domain，不重新掃描資料（原本每次縮放都把全部資料攤平再算一次範圍）
   */
  const xScale = computed<XScale | null>(() => {
    const baseDomain = baseXDomain.value
    if (!baseDomain) return null

    // 首次計算時記下原始 domain，供 brush 重置
    if (!originalXDomain.value) {
      originalXDomain.value = baseDomain
    }

    const effectiveDomain = currentXDomain.value ?? baseDomain

    if (props.xScaleType === 'band') {
      return d3
        .scaleBand<string>()
        .domain(effectiveDomain as string[])
        .range([0, chartWidth.value])
        .padding(0.2)
    }

    return resolveScale(props.xScaleType)
      .call(null)
      .domain(effectiveDomain as [number, number])
      .range([0, chartWidth.value]) as XScale
  })

  /**
   * 建立一側 Y 軸的比例尺。左右兩側邏輯相同，只差圖層來源與 domain 設定。
   */
  function buildBaseYDomain(
    layers: ChartLayer<T>[],
    explicitDomain: YDomain | null | undefined
  ): YDomain | null {
    if (!layers.length) return null
    const maxValue = calculateMaxYValue(layers)
    // 上方留 10% 空白，折線或標籤才不會貼到頂
    return explicitDomain ?? [0, maxValue * 1.1]
  }

  const yLeftBaseDomain = computed(() => buildBaseYDomain(leftLayers.value, props.yLeftDomain))
  const yRightBaseDomain = computed(() => buildBaseYDomain(rightLayers.value, props.yRightDomain))

  function buildYScale(
    baseDomain: YDomain | null,
    originalDomain: Ref<YDomain | null>,
    currentDomain: Ref<YDomain | null>,
    scaleType: ContinuousScaleType | undefined
  ): YScale | null {
    if (!baseDomain) return null

    if (!originalDomain.value) {
      originalDomain.value = baseDomain
    }

    const scale = resolveScale(scaleType)
      .call(null)
      .domain(currentDomain.value ?? baseDomain)
      .range([chartHeight.value, 0])

    // 🔧 只有全覽時取整刻度。使用者縮放後的範圍要原樣呈現：
    //    nice() 會把 [5.5, 104.5] 取整回 [0, 110] —— 滾輪每次小幅縮放都被取整抵銷，等於縮不動
    return currentDomain.value ? scale : scale.nice()
  }

  /**
   * Y 軸縮放邊界。基準範圍先取整（與畫面上全覽時一致）；資料超出的那一側再外推 5%，
   * 點才不會貼在邊上。資料都在基準範圍內時，邊界就是基準範圍本身。
   */
  function buildYZoomBounds(
    layers: ChartLayer<T>[],
    baseDomain: YDomain | null,
    scaleType: ContinuousScaleType | undefined
  ): YDomain | null {
    if (!baseDomain) return null
    const [b0, b1] = resolveScale(scaleType).call(null).domain(baseDomain).nice().domain() as YDomain
    let lo = Math.min(b0, b1)
    let hi = Math.max(b0, b1)
    const extent = calculateYExtent(layers)
    if (!extent) return [lo, hi]
    const pad = (Math.max(hi, extent[1]) - Math.min(lo, extent[0])) * 0.05
    if (extent[0] < lo) lo = extent[0] - pad
    if (extent[1] > hi) hi = extent[1] + pad
    return [lo, hi]
  }

  const yLeftZoomBounds = computed(() =>
    buildYZoomBounds(leftLayers.value, yLeftBaseDomain.value, props.yLeftScaleType)
  )
  const yRightZoomBounds = computed(() =>
    buildYZoomBounds(rightLayers.value, yRightBaseDomain.value, props.yRightScaleType)
  )

  const yLeftScale = computed(() =>
    buildYScale(yLeftBaseDomain.value, originalYLeftDomain, currentYLeftDomain, props.yLeftScaleType)
  )

  const yRightScale = computed(() =>
    buildYScale(yRightBaseDomain.value, originalYRightDomain, currentYRightDomain, props.yRightScaleType)
  )

  /**
   * 把過濾動作提到 computed，渲染函式就不必每次重複過濾。
   */
  function processLayers(layers: ChartLayer<T>[]): ProcessedChartLayer<T>[] {
    return layers.map((layer) => {
      if (!currentXDomain.value || !layer.xValue) {
        // 資料是響應式 Proxy 時換成原始陣列，渲染時逐筆讀取才不會經過 Proxy；
        // 本來就是一般陣列就原樣回傳（不必要的複製會讓渲染誤判變更）
        const raw = layerData(layer)
        return raw === layer.data ? layer : { ...layer, data: raw }
      }

      return {
        ...layer,
        data: filterDataByXDomain(layerData(layer), layer.xValue),
        _isFiltered: true as const,
      }
    })
  }

  const processedLeftLayers = computed(() => processLayers(leftLayers.value))
  const processedRightLayers = computed(() => processLayers(rightLayers.value))

  return {
    xScale,
    yLeftScale,
    yRightScale,
    leftLayers,
    rightLayers,
    processedLeftLayers,
    processedRightLayers,
    originalXDomain,
    originalYLeftDomain,
    originalYRightDomain,
    baseXDomain,
    xZoomBounds,
    yLeftBaseDomain,
    yRightBaseDomain,
    yLeftZoomBounds,
    yRightZoomBounds,
    filterDataByXDomain,
    calculateMaxYValue,
  }
}

export default useChartScales
