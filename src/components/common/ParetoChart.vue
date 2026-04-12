<template>
  <div class="pareto-chart">
    <!-- 載入狀態 -->
    <div v-if="isLoading" class="flex justify-center items-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2 text-gray-600">{{ loadingText }}</span>
    </div>

    <!-- 空數據狀態 -->
    <div v-else-if="paretoData.length === 0" class="flex flex-col justify-center items-center py-12 text-gray-500">
      <svg class="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      <p class="text-sm">{{ emptyText }}</p>
    </div>

    <!-- Pareto 圖表 -->
    <div v-else class="pareto-container">
      <div ref="chartContainer" class="w-full border border-gray-200 rounded bg-white" :style="chartStyle"></div>
    </div>

    <!-- 統計資訊 -->
    <div v-if="showStatistics && paretoData.length > 0" class="statistics mt-4 bg-gray-50 rounded-lg p-4">
      <h4 class="text-sm font-medium text-gray-800 mb-2">{{ statisticsTitle }}</h4>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div>
          <span class="text-gray-600">{{ countLabel }}:</span>
          <span class="ml-1 font-medium">{{ totalDefects }}</span>
        </div>
        <div>
          <span class="text-gray-600">{{ typeLabel }}:</span>
          <span class="ml-1 font-medium">{{ paretoData.length }}</span>
        </div>
        <div>
          <span class="text-gray-600">閾值設定:</span>
          <span class="ml-1 font-medium text-blue-600">{{ cumulativeThreshold }}%</span>
        </div>
        <div>
          <span class="text-gray-600">Top3佔比:</span>
          <span class="ml-1 font-medium text-red-600">{{ top3Percentage.toFixed(1) }}%</span>
        </div>
        <div>
          <span class="text-gray-600">{{ maxLabel }}:</span>
          <span class="ml-1 font-medium text-red-600">{{ maxDefect?.name || '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'

// Props
const props = defineProps({
  // 柏拉圖輸入數據 - 格式: [{ name: string, count: number }, ...]
  paretoInputData: {
    type: Array,
    default: () => []
  },
  // 累積百分比閾值 (%)，超過此閾值的項目會歸類到 Other
  cumulativeThreshold: {
    type: Number,
    default: 80,
    validator: (value) => value > 0 && value <= 100
  },
  // 圖表寬度 (0 為自動適應容器)
  chartWidth: {
    type: Number,
    default: 0
  },
  // 圖表高度
  chartHeight: {
    type: Number,
    default: 400
  },
  // 是否顯示統計資訊
  showStatistics: {
    type: Boolean,
    default: true
  },
  // 載入中文字
  loadingText: {
    type: String,
    default: '載入 Pareto 數據...'
  },
  // 空數據文字
  emptyText: {
    type: String,
    default: '暫無數據'
  },
  // 統計標題
  statisticsTitle: {
    type: String,
    default: '統計資訊'
  },
  // 數量標籤
  countLabel: {
    type: String,
    default: '總數量'
  },
  // 類型標籤
  typeLabel: {
    type: String,
    default: '類型數'
  },
  // 最大項目標籤
  maxLabel: {
    type: String,
    default: '最大項'
  },
  // Y軸左側標籤
  yAxisLeftLabel: {
    type: String,
    default: '數量'
  },
  // Y軸右側標籤
  yAxisRightLabel: {
    type: String,
    default: '累積百分比'
  },
  // 閾值線標籤
  thresholdLabel: {
    type: String,
    default: '閾值'
  },
  // 顏色方案
  colorScheme: {
    type: Array,
    default: () => ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6']
  }
})

// Emits
const emit = defineEmits(['update:paretoData', 'chartRendered', 'error'])

// 響應式數據
const isLoading = ref(false)
const paretoData = ref([])
const chartContainer = ref(null)

// 計算屬性
const chartStyle = computed(() => ({
  minHeight: `${props.chartHeight}px`,
  height: `${props.chartHeight}px`
}))

const totalDefects = computed(() => {
  return paretoData.value.reduce((sum, item) => sum + item.count, 0)
})

const maxDefect = computed(() => {
  return paretoData.value.length > 0 ? paretoData.value[0] : null
})

const top3Percentage = computed(() => {
  if (paretoData.value.length === 0) return 0
  const top3Count = paretoData.value.slice(0, 3).reduce((sum, item) => sum + item.count, 0)
  return (top3Count / totalDefects.value) * 100
})

const cumulativeThreshold = computed(() => {
  return props.cumulativeThreshold
})

/**
 * 處理輸入數據，轉換為柏拉圖格式，並按閾值分類
 */
const processInputData = (inputData) => {
  if (!inputData || inputData.length === 0) return []
  
  // 驗證數據格式
  const validData = inputData.filter(item => 
    item.name && typeof item.count === 'number' && item.count >= 0
  )
  
  if (validData.length === 0) {
    console.warn('ParetoChart - 無有效數據')
    return []
  }
  
  // 按 count 降序排序
  const sortedData = validData.sort((a, b) => b.count - a.count)
  
  // 計算總數
  const total = sortedData.reduce((sum, item) => sum + item.count, 0)
  if (total === 0) return []
  
  // 找到累積百分比超過閾值的位置
  let cumulative = 0
  let thresholdIndex = sortedData.length
  
  for (let i = 0; i < sortedData.length; i++) {
    cumulative += sortedData[i].count
    const cumulativePercent = (cumulative / total) * 100
    if (cumulativePercent >= props.cumulativeThreshold) {
      thresholdIndex = i + 1
      break
    }
  }
  
  // 分離主要項目和其他項目
  const mainItems = sortedData.slice(0, thresholdIndex)
  const otherItems = sortedData.slice(thresholdIndex)
  
  // 計算主要項目的結果
  cumulative = 0
  const result = mainItems.map(item => {
    cumulative += item.count
    return {
      name: item.name,
      count: item.count,
      percentage: (item.count / total) * 100,
      cumulative: (cumulative / total) * 100
    }
  })
  
  // 如果有其他項目，合併為 "Other"
  if (otherItems.length > 0) {
    const otherCount = otherItems.reduce((sum, item) => sum + item.count, 0)
    cumulative += otherCount
    result.push({
      name: 'Other',
      count: otherCount,
      percentage: (otherCount / total) * 100,
      cumulative: (cumulative / total) * 100
    })
  }
  
  // console.log('ParetoChart - 數據處理結果:', {
  //   總數據: sortedData.length,
  //   主要項目: mainItems.length,
  //   其他項目: otherItems.length,
  //   閾值: props.cumulativeThreshold + '%',
  //   最終結果: result.length
  // })
  
  return result
}

/**
 * 繪製 Pareto 圖表
 */
const drawParetoChart = async () => {
  // console.log('ParetoChart - drawParetoChart called:', {
  //   hasContainer: !!chartContainer.value,
  //   dataLength: paretoData.value.length
  // })
  
  // 等待 DOM 更新
  await nextTick()
  
  if (!chartContainer.value || paretoData.value.length === 0) {
    console.log('ParetoChart - 跳過繪製:', !chartContainer.value ? '無容器' : '無數據')
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
      console.log('ParetoChart - 容器尺寸為零，延遲渲染')
      setTimeout(() => drawParetoChart(), 100)
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
    const xScale = d3.scaleBand()
      .domain(paretoData.value.map(d => d.name))
      .range([0, innerWidth])
      .padding(0.1)

    const maxCount = d3.max(paretoData.value, d => d.count) || 1
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
    const colorScale = d3.scaleOrdinal()
      .domain(paretoData.value.map(d => d.name))
      .range(props.colorScheme)

    // 繪製柱狀圖
    const bars = g.selectAll('.bar')
      .data(paretoData.value)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name))
      .attr('y', d => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.count))
      .attr('fill', d => colorScale(d.name))
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1)
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('opacity', 0.8)
      })
      
    // console.log('ParetoChart - 柱狀圖繪製:', {
    //   barsCount: bars.size()
    // })

    // 添加數值標籤
    g.selectAll('.bar-label')
      .data(paretoData.value)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.count) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text(d => d.count)

    // 繪製累積百分比線
    const line = d3.line()
      .x(d => xScale(d.name) + xScale.bandwidth() / 2)
      .y(d => yScalePercent(d.cumulative))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(paretoData.value)
      .attr('class', 'cumulative-line')
      .attr('fill', 'none')
      .attr('stroke', '#dc2626')
      .attr('stroke-width', 2)
      .attr('d', line)

    // 添加累積百分比點
    g.selectAll('.cumulative-dot')
      .data(paretoData.value)
      .enter()
      .append('circle')
      .attr('class', 'cumulative-dot')
      .attr('cx', d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr('cy', d => yScalePercent(d.cumulative))
      .attr('r', 3)
      .attr('fill', '#dc2626')

    // 添加累積百分比標籤
    g.selectAll('.cumulative-label')
      .data(paretoData.value)
      .enter()
      .append('text')
      .attr('class', 'cumulative-label')
      .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr('y', d => yScalePercent(d.cumulative) - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#dc2626')
      .text(d => `${d.cumulative.toFixed(1)}%`)

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
      .call(d3.axisRight(yScalePercent).tickFormat(d => `${d}%`))
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
const updateParetoData = async () => {
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
      console.log('ParetoChart - 無有效數據')
    }
    
    // 確保在下一個 tick 後繪製，讓 DOM 有時間更新
    await nextTick()
    if (paretoData.value.length > 0) {
      // 設置 ResizeObserver
      setupResizeObserver()
      // 延遲渲染以確保容器尺寸正確
      setTimeout(async () => {
        await drawParetoChart()
      }, 150)
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
watch(() => props.paretoInputData, async (newData) => {
  // 延遲執行以確保組件已掛載
  await nextTick()
  setTimeout(() => {
    updateParetoData()
  }, 50)
}, { deep: true, immediate: false })

// 監聽閾值變化
watch(() => props.cumulativeThreshold, async (newThreshold, oldThreshold) => {
  // console.log('ParetoChart - 閾值變化:', { newThreshold, oldThreshold })
  if (props.paretoInputData && props.paretoInputData.length > 0) {
    await nextTick()
    setTimeout(() => {
      updateParetoData()
    }, 50)
  }
}, { immediate: false })

// 強制重新渲染（用於 Modal 打開後的渲染問題）
const forceRerender = async () => {
  await nextTick()
  if (paretoData.value.length > 0 && chartContainer.value) {
    const rect = chartContainer.value.getBoundingClientRect()
    if (rect.width > 0) {
      await drawParetoChart()
    } else {
      // 如果容器還沒有尺寸，再次延遲
      setTimeout(forceRerender, 100)
    }
  }
}

// 暴露方法供父組件調用
defineExpose({
  forceRerender,
  updateParetoData,
  paretoData: computed(() => paretoData.value)
})

// 監聽視窗大小變化
let resizeTimeout = null
let resizeObserver = null

const handleResize = () => {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    if (paretoData.value.length > 0) {
      drawParetoChart()
    }
  }, 100)
}

// 設置容器尺寸監聽器
const setupResizeObserver = () => {
  if (chartContainer.value && !resizeObserver) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          // console.log('ParetoChart - 容器尺寸變化:', { width, height })
          handleResize()
        }
      }
    })
    resizeObserver.observe(chartContainer.value)
  }
}

// 清理 ResizeObserver
const cleanupResizeObserver = () => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

onMounted(async () => {
  // 等待 DOM 完全載入
  await nextTick()
  // 延遲執行以確保 Modal 完全載入
  setTimeout(() => {
    updateParetoData()
  }, 300)
  window.addEventListener('resize', handleResize)
})

// 組件卸載時清理
onUnmounted(() => {
  cleanupResizeObserver()
  window.removeEventListener('resize', handleResize)
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
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
