import { computed, ref, type ComputedRef, type Ref } from 'vue'
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
} from '@/components/library/charts/types/chart.types'

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
  const leftLayers = computed(() => props.layers.filter((l) => l.yAxis === 'left'))
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
      let dataToCalculate = layer.data ?? []

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

  /**
   * X 軸比例尺。
   * band 用於離散類別，其餘走連續型；隨 currentXDomain 變化實現縮放。
   */
  const xScale = computed<XScale | null>(() => {
    const allData = props.layers.flatMap((layer) => layer.data ?? [])
    if (!allData.length) return null

    const layer = props.layers[0]
    const xValue: XAccessor<T> = layer.xValue ?? ((d) => d.category as string)

    let baseDomain: XDomain
    if (props.xScaleType === 'band') {
      baseDomain = props.xDomain ?? (allData.map(xValue) as string[])
    } else {
      // 連續型 X 軸的取值必為 number 或 Date；xValue 的回傳型別涵蓋 string，
      // 這裡收窄成 number 讓 d3.extent 推論正確（資料為空時 extent 回傳
      // [undefined, undefined]，以 [0, 0] 兜底避免 domain 變成 undefined）
      const numericX = (d: T): number => xValue(d) as unknown as number
      const [min, max] = d3.extent(allData, numericX)
      baseDomain = props.xDomain ?? [min ?? 0, max ?? 0]
    }

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
  function buildYScale(
    layers: ChartLayer<T>[],
    explicitDomain: YDomain | null | undefined,
    originalDomain: Ref<YDomain | null>,
    currentDomain: Ref<YDomain | null>,
    scaleType: ContinuousScaleType | undefined
  ): YScale | null {
    if (!layers.length) return null

    const maxValue = calculateMaxYValue(layers)
    // 上方留 10% 空白，折線或標籤才不會貼到頂
    const baseDomain: YDomain = explicitDomain ?? [0, maxValue * 1.1]

    if (!originalDomain.value) {
      originalDomain.value = baseDomain
    }

    const effectiveDomain = currentDomain.value ?? baseDomain

    return resolveScale(scaleType)
      .call(null)
      .domain(effectiveDomain)
      .range([chartHeight.value, 0])
      .nice()
  }

  const yLeftScale = computed(() =>
    buildYScale(
      leftLayers.value,
      props.yLeftDomain,
      originalYLeftDomain,
      currentYLeftDomain,
      props.yLeftScaleType
    )
  )

  const yRightScale = computed(() =>
    buildYScale(
      rightLayers.value,
      props.yRightDomain,
      originalYRightDomain,
      currentYRightDomain,
      props.yRightScaleType
    )
  )

  /**
   * 把過濾動作提到 computed，渲染函式就不必每次重複過濾。
   */
  function processLayers(layers: ChartLayer<T>[]): ProcessedChartLayer<T>[] {
    return layers.map((layer) => {
      if (!currentXDomain.value || !layer.xValue) return layer

      return {
        ...layer,
        data: filterDataByXDomain(layer.data ?? [], layer.xValue),
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
    filterDataByXDomain,
    calculateMaxYValue,
  }
}

export default useChartScales
