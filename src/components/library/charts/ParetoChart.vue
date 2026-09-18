<template>
  <div class="pareto-chart">
    <!-- 載入狀態 -->
    <div v-if="isLoading" class="flex justify-center items-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2 text-content-secondary">{{ loadingText }}</span>
    </div>

    <!-- 空數據狀態 -->
    <div v-else-if="paretoData.length === 0" class="flex flex-col justify-center items-center py-12 text-content-tertiary">
      <svg class="w-16 h-16 mb-4 text-content-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      <p class="text-sm">{{ emptyText }}</p>
    </div>

    <!-- Pareto 圖表 -->
    <div v-else class="pareto-container">
      <div ref="chartContainer" class="w-full border border-stroke-light rounded bg-surface-primary" :style="chartStyle"></div>
    </div>

    <!-- 統計資訊 -->
    <div v-if="showStatistics && paretoData.length > 0" class="statistics mt-4 bg-surface-secondary rounded-lg p-4">
      <h4 class="text-sm font-medium text-content-primary mb-2">{{ statisticsTitle }}</h4>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div>
          <span class="text-content-secondary">{{ countLabel }}:</span>
          <span class="ml-1 font-medium">{{ totalDefects }}</span>
        </div>
        <div>
          <span class="text-content-secondary">{{ typeLabel }}:</span>
          <span class="ml-1 font-medium">{{ paretoData.length }}</span>
        </div>
        <div>
          <span class="text-content-secondary">閾值設定:</span>
          <span class="ml-1 font-medium text-accent">{{ cumulativeThreshold }}%</span>
        </div>
        <div>
          <span class="text-content-secondary">Top3佔比:</span>
          <span class="ml-1 font-medium text-danger">{{ top3Percentage.toFixed(1) }}%</span>
        </div>
        <div>
          <span class="text-content-secondary">{{ maxLabel }}:</span>
          <span class="ml-1 font-medium text-danger">{{ maxDefect?.name || '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { buildParetoData } from './composables/useParetoData'

// ===== 型別 =====

/** 傳入的一筆資料 */
export interface ParetoInputItem {
  name: string
  count: number
}

/**
 * 圖表實際使用的一筆資料。
 *
 * ⚠️ 這裡的 cumulative 是「累積百分比」，不是累積數量
 *    （與 EnterprisePareto 的欄位語意不同）。這個形狀會透過
 *    update:paretoData 與 chartRendered 對外發出，屬於公開介面，
 *    因此轉型時原樣保留。
 */
export interface ParetoChartDatum {
  name: string
  count: number
  /** 該項佔總量的百分比 */
  percentage: number
  /** 累積百分比（0–100） */
  cumulative: number
}

interface ParetoChartProps {
  /** 柏拉圖輸入數據 */
  paretoInputData?: ParetoInputItem[]
  /** 累積百分比閾值 (%)，超過此閾值的項目會歸類到 Other */
  cumulativeThreshold?: number
  /** 圖表寬度 (0 為自動適應容器) */
  chartWidth?: number
  /** 圖表高度 */
  chartHeight?: number
  /** 是否顯示統計資訊 */
  showStatistics?: boolean
  /** 載入中文字 */
  loadingText?: string
  /** 空數據文字 */
  emptyText?: string
  /** 統計標題 */
  statisticsTitle?: string
  /** 數量標籤 */
  countLabel?: string
  /** 類型標籤 */
  typeLabel?: string
  /** 最大項目標籤 */
  maxLabel?: string
  /** Y軸左側標籤 */
  yAxisLeftLabel?: string
  /** Y軸右側標籤 */
  yAxisRightLabel?: string
  /** 閾值線標籤 */
  thresholdLabel?: string
  /** 顏色方案 */
  colorScheme?: string[]
}

const props = withDefaults(defineProps<ParetoChartProps>(), {
  paretoInputData: () => [],
  cumulativeThreshold: 80,
  chartWidth: 0,
  chartHeight: 400,
  showStatistics: true,
  loadingText: '載入 Pareto 數據...',
  emptyText: '暫無數據',
  statisticsTitle: '統計資訊',
  countLabel: '總數量',
  typeLabel: '類型數',
  maxLabel: '最大項',
  yAxisLeftLabel: '數量',
  yAxisRightLabel: '累積百分比',
  thresholdLabel: '閾值',
  colorScheme: () => [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#6b7280',
    '#14b8a6',
  ],
})

const emit = defineEmits<{
  'update:paretoData': [data: ParetoChartDatum[]]
  chartRendered: [data: ParetoChartDatum[]]
  error: [error: unknown]
}>()

// ===== 響應式數據 =====
const isLoading = ref(false)
const paretoData = ref<ParetoChartDatum[]>([])
const chartContainer = ref<HTMLDivElement | null>(null)

// ===== 計時器管理 =====
/**
 * 這個元件用了不少延遲重繪（Modal 開啟時容器尺寸還沒定案），原本這些
 * setTimeout 都沒有被追蹤，卸載後仍會觸發；尤其 forceRerender 在容器
 * 一直沒有寬度時會每 100ms 自己排下一次，形成沒有盡頭的重試。
 * 這裡統一記下所有待處理的 timer，卸載時一次清掉。
 */
const pendingTimers = new Set<ReturnType<typeof setTimeout>>()

function later(fn: () => void, delay: number): void {
  const id = setTimeout(() => {
    pendingTimers.delete(id)
    fn()
  }, delay)
  pendingTimers.add(id)
}

function clearPendingTimers(): void {
  for (const id of pendingTimers) clearTimeout(id)
  pendingTimers.clear()
}

// ===== 計算屬性 =====
const chartStyle = computed(() => ({
  minHeight: `${props.chartHeight}px`,
  height: `${props.chartHeight}px`,
}))

const totalDefects = computed(() =>
  paretoData.value.reduce((sum, item) => sum + item.count, 0)
)

const maxDefect = computed<ParetoChartDatum | null>(() =>
  paretoData.value.length > 0 ? paretoData.value[0] : null
)

const top3Percentage = computed(() => {
  if (paretoData.value.length === 0) return 0
  const top3Count = paretoData.value.slice(0, 3).reduce((sum, item) => sum + item.count, 0)
  return (top3Count / totalDefects.value) * 100
})

const cumulativeThreshold = computed(() => props.cumulativeThreshold)

/**
 * 處理輸入數據，轉換為柏拉圖格式，並按閾值分類。
 *
 * 排序、累積與「歸為 Other」的計算與 EnterprisePareto 共用
 * （見 composables/useParetoData）。這裡只負責驗證輸入、
 * 以及把結果轉成本元件對外的欄位形狀。
 */
function processInputData(inputData: ParetoInputItem[] | null | undefined): ParetoChartDatum[] {
  if (!inputData || inputData.length === 0) return []

  // 驗證數據格式：名稱不可為空、數量必須是非負數字
  const validData = inputData.filter(
    (item) => item.name != null && item.name !== '' && typeof item.count === 'number' && item.count >= 0
  )

  if (validData.length === 0) {
    console.warn('ParetoChart - 無有效數據')
    return []
  }

  const total = validData.reduce((sum, item) => sum + item.count, 0)
  if (total === 0) return []

  const rows = buildParetoData(validData as unknown as Record<string, unknown>[], {
    categoryField: 'name',
    valueField: 'count',
    sortOrder: 'desc',
    enableThresholdFilter: true,
    thresholdPercent: props.cumulativeThreshold,
    otherLabel: 'Other',
  })

  return rows.map((row) => {
    const count = Number(row.count) || 0
    return {
      // 名稱一律轉成字串：X 軸是 band scale，後面還要用 name.length
      // 算標籤空間，非字串會讓 margin 變成 NaN，整張圖就畫不出來
      name: String(row.name ?? ''),
      count,
      percentage: (count / total) * 100,
      // 本元件的 cumulative 指的是累積百分比
      cumulative: row.cumulativePercent,
    }
  })
}

/**
 * 繪製 Pareto 圖表
 */
const drawParetoChart = async (): Promise<void> => {
  // console.log('ParetoChart - drawParetoChart called:', {
  //   hasContainer: !!chartContainer.value,
  //   dataLength: paretoData.value.length
  // })
  
  // 等待 DOM 更新
  await nextTick()
  
  if (!chartContainer.value || paretoData.value.length === 0) {
    return
  }

  try {
    // 清除現有圖表
    d3.select(chartContainer.value).selectAll('*').remove()

    // 再次檢查容器是否存在
    if (!chartContainer.value) {
      console.error('ParetoChart - 容器不存在，無法繪製圖表')
      return
    }
    
    const container = d3.select(chartContainer.value)
    const containerRect = chartContainer.value.getBoundingClientRect()
    
    // 確保容器有有效尺寸
    if (containerRect.width === 0 || containerRect.height === 0) {
      // Modal 剛開啟時容器還沒有尺寸，稍後再試
      later(() => void drawParetoChart(), 100)
      return
    }
    
    // 如果有設定 props.chartWidth 則使用，否則使用容器寬度
    // 移除原本的 Math.max(..., 600) 限制，以便在小容器中也能正常顯示
    const width = props.chartWidth > 0 ? props.chartWidth : containerRect.width
    const height = props.chartHeight
    
    // console.log('ParetoChart - 容器尺寸:', { width, height, containerRect })
    
    // 動態計算 bottom margin：根據 X 軸標籤的最大字數
    const maxLabelLength = Math.max(...paretoData.value.map(d => d.name.length))
    // 基礎 bottom = 60，每個字元增加約 4px（因為旋轉 45 度）
    const dynamicBottom = Math.max(60, Math.min(60 + maxLabelLength * 4, 200))
    
    const margin = { top: 20, right: 80, bottom: dynamicBottom, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom
    
    // console.log('ParetoChart - Margin 設定:', { maxLabelLength, dynamicBottom, margin })

    // 創建 SVG
    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#fafafa')
      .style('border', '1px solid #e5e7eb')
      
    // console.log('ParetoChart - SVG 已創建')

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // 設置比例尺
    const xScale = d3.scaleBand<string>()
      .domain(paretoData.value.map((d) => d.name))
      .range([0, innerWidth])
      .padding(0.1)

    /** 長條水平中心：折線、點與標籤共用 */
    const barCenterX = (d: ParetoChartDatum): number =>
      (xScale(d.name) ?? 0) + xScale.bandwidth() / 2

    const maxCount = d3.max(paretoData.value, (d) => d.count) || 1
    const yScale = d3.scaleLinear()
      .domain([0, maxCount])
      .range([innerHeight, 0])
      .nice()
      
    // console.log('ParetoChart - 比例尺設定:', { 
    //   maxCount, 
    //   dataCount: paretoData.value.length
    // })

    const yScalePercent = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0])

    // 顏色比例尺
    const colorScale = d3.scaleOrdinal<string, string>()
      .domain(paretoData.value.map((d) => d.name))
      .range(props.colorScheme)

    // 繪製柱狀圖
    g.selectAll<SVGRectElement, ParetoChartDatum>('.bar')
      .data(paretoData.value)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.name) ?? 0)
      .attr('y', (d) => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.count))
      .attr('fill', (d) => colorScale(d.name))
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function (this: SVGRectElement) {
        d3.select(this).attr('opacity', 1)
      })
      .on('mouseout', function (this: SVGRectElement) {
        d3.select(this).attr('opacity', 0.8)
      })
      
    // console.log('ParetoChart - 柱狀圖繪製:', {
    //   barsCount: bars.size()
    // })

    // 添加數值標籤
    g.selectAll<SVGTextElement, ParetoChartDatum>('.bar-label')
      .data(paretoData.value)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', barCenterX)
      .attr('y', (d) => yScale(d.count) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text((d) => d.count)

    // 繪製累積百分比線
    const line = d3.line<ParetoChartDatum>()
      .x(barCenterX)
      .y((d) => yScalePercent(d.cumulative))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(paretoData.value)
      .attr('class', 'cumulative-line')
      .attr('fill', 'none')
      .attr('stroke', '#dc2626')
      .attr('stroke-width', 2)
      .attr('d', line)

    // 添加累積百分比點
    g.selectAll<SVGCircleElement, ParetoChartDatum>('.cumulative-dot')
      .data(paretoData.value)
      .enter()
      .append('circle')
      .attr('class', 'cumulative-dot')
      .attr('cx', barCenterX)
      .attr('cy', (d) => yScalePercent(d.cumulative))
      .attr('r', 3)
      .attr('fill', '#dc2626')

    // 添加累積百分比標籤
    g.selectAll<SVGTextElement, ParetoChartDatum>('.cumulative-label')
      .data(paretoData.value)
      .enter()
      .append('text')
      .attr('class', 'cumulative-label')
      .attr('x', barCenterX)
      .attr('y', (d) => yScalePercent(d.cumulative) - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#dc2626')
      .text((d) => `${d.cumulative.toFixed(1)}%`)

    // 添加累積閾值參考線
    const thresholdY = yScalePercent(props.cumulativeThreshold)
    g.append('line')
      .attr('class', 'threshold-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', thresholdY)
      .attr('y2', thresholdY)
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.8)

    // 添加閾值標籤
    g.append('text')
      .attr('class', 'threshold-label')
      .attr('x', innerWidth - 5)
      .attr('y', thresholdY - 5)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#f59e0b')
      .text(`${props.cumulativeThreshold}% ${props.thresholdLabel}`)

    // 添加 X 軸
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .attr('font-size', '10px')

    // 添加 Y 軸 (數量)
    g.append('g')
      .attr('class', 'y-axis-left')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#000000')
      .style('font-size', '12px')
      .text(props.yAxisLeftLabel)

    // 添加 Y 軸 (百分比)
    g.append('g')
      .attr('class', 'y-axis-right')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(d3.axisRight(yScalePercent).tickFormat((v) => `${v}%`))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 40)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#000000')
      .style('font-size', '12px')
      .text(props.yAxisRightLabel)

    // 發送渲染完成事件
    emit('chartRendered', paretoData.value)
  } catch (error) {
    console.error('ParetoChart - 繪製圖表失敗:', error)
    emit('error', error)
  }
}

/**
 * 更新柏拉圖數據
 */
const updateParetoData = async (): Promise<void> => {
  isLoading.value = true
  
  try {
    // console.log('ParetoChart - updateParetoData called:', {
    //   inputDataLength: props.paretoInputData?.length || 0,
    //   threshold: props.cumulativeThreshold + '%'
    // })
    
    if (props.paretoInputData && props.paretoInputData.length > 0) {
      // 處理輸入數據
      paretoData.value = processInputData(props.paretoInputData)
      // console.log('ParetoChart - 處理後的數據:', paretoData.value)
      
      // 發送更新事件
      emit('update:paretoData', paretoData.value)
    } else {
      paretoData.value = []
      console.warn('[ChptParetoChart] 資料中沒有可繪製的有效數值')
    }
    
    // 確保在下一個 tick 後繪製，讓 DOM 有時間更新
    await nextTick()
    if (paretoData.value.length > 0) {
      // 設置 ResizeObserver
      setupResizeObserver()
      // 延遲渲染以確保容器尺寸正確
      later(() => void drawParetoChart(), 150)
    }
  } catch (error) {
    console.error('ParetoChart - 更新數據失敗:', error)
    paretoData.value = []
    emit('error', error)
  } finally {
    isLoading.value = false
  }
}

// 監聽傳入數據變化
watch(() => props.paretoInputData, async () => {
  // 延遲執行以確保組件已掛載
  await nextTick()
  later(() => void updateParetoData(), 50)
}, { deep: true, immediate: false })

// 監聽閾值變化
watch(() => props.cumulativeThreshold, async () => {
  if (props.paretoInputData && props.paretoInputData.length > 0) {
    await nextTick()
    later(() => void updateParetoData(), 50)
  }
}, { immediate: false })

// 強制重新渲染（用於 Modal 打開後的渲染問題）
const forceRerender = async (): Promise<void> => {
  await nextTick()
  if (paretoData.value.length === 0 || !chartContainer.value) return

  if (chartContainer.value.getBoundingClientRect().width > 0) {
    await drawParetoChart()
  } else {
    // 容器還沒有尺寸（例如 Modal 尚未展開），稍後再試；
    // 重試的 timer 會被記錄下來，卸載時一併清掉
    later(() => void forceRerender(), 100)
  }
}

// 暴露方法供父組件調用
defineExpose({
  forceRerender,
  updateParetoData,
  paretoData: computed(() => paretoData.value)
})

// 監聽視窗大小變化
let resizeTimeout: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null

const handleResize = (): void => {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    resizeTimeout = null
    if (paretoData.value.length > 0) void drawParetoChart()
  }, 100)
}

// 設置容器尺寸監聽器
const setupResizeObserver = (): void => {
  if (chartContainer.value && !resizeObserver) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) handleResize()
      }
    })
    resizeObserver.observe(chartContainer.value)
  }
}

// 清理 ResizeObserver
const cleanupResizeObserver = (): void => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

onMounted(async () => {
  // 等待 DOM 完全載入
  await nextTick()
  // 延遲執行以確保 Modal 完全載入
  later(() => void updateParetoData(), 300)
  window.addEventListener('resize', handleResize)
})

// 組件卸載時清理
onUnmounted(() => {
  cleanupResizeObserver()
  window.removeEventListener('resize', handleResize)
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
    resizeTimeout = null
  }
  // 所有延遲重繪的 timer 一併取消，卸載後不該再有人動 DOM
  clearPendingTimers()
})
</script>

<style scoped>
/* .pareto-chart {
  width: 100%;
}

.pareto-container {
  width: 100%;
}

.statistics {
  border-top: 1px solid #e5e7eb;
} */

/* 圖表樣式 */
/* :deep(.x-axis text) {
  font-size: 10px;
  fill: #6b7280;
}

:deep(.y-axis-left text) {
  font-size: 10px;
  fill: #374151;
}

:deep(.y-axis-right text) {
  font-size: 10px;
  fill: #dc2626;
}

:deep(.bar) {
  transition: opacity 0.2s ease;
}

:deep(.threshold-line) {
  opacity: 0.7;
} */
</style>
