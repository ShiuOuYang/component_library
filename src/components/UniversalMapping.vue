<template>
  <div class="universal-mapping" :style="{ maxWidth: props.width > 0 ? props.width + 'px' : '100%' }">
    <!-- 標題 -->
    <p v-if="showBoardTitle && board !== 0" class="text-center m-0 mb-2 font-semibold text-gray-700">
      {{ boardTitle || `Board ${board}` }}
    </p>

    <!-- 主容器 - 使用 Flex 佈局分離圖表和 Legend -->
    <div class="flex gap-3 relative" :style="mainContainerStyle">
      <!-- 圖表容器 - 左側，自動縮放 -->
      <div 
        ref="chartContainer" 
        :class="containerClass"
        class="flex-1 min-w-0 border border-gray-300 rounded-lg bg-white shadow-sm relative overflow-visible"
        :style="chartContainerStyle"
      >
        <!-- SVG 圖表將在這裡渲染 -->
        <!-- 加入 overflow-visible 類別防止座標軸標籤被切掉 -->
        <svg 
          :id="`mapping-svg-${componentId}`"
          class="w-full h-full overflow-visible"
        ></svg>

        <!-- 空狀態顯示 -->
        <div 
          v-if="!hasData"
          class="absolute inset-0 flex justify-center items-center bg-gray-50"
        >
          <div class="text-center text-gray-500">
            <span class="material-symbols-outlined text-4xl mb-2 block">scatter_plot</span>
            <p class="m-0 mb-1 font-medium text-sm">{{ emptyMessage }}</p>
            <small class="block my-0.5 text-xs">Board: {{ board || 'All' }}</small>
            <small class="block my-0.5 text-xs">數據點: {{ renderDataCount }}</small>
          </div>
        </div>

        <!-- 載入中狀態 (已移至外層) -->
        <!-- <div v-if="loading" ...></div> -->

        <!-- 縮放控制 - 左上角 -->
        <div 
          v-if="showZoomControls && hasData"
          class="absolute top-2 left-2 flex flex-row gap-1 z-10"
        >
          <button
            @click="resetZoom"
            class="bg-white border border-gray-300 rounded w-6 h-6 flex items-center justify-center hover:bg-gray-50 shadow-sm"
            title="重置縮放"
          >
            <span style="font-size: 14px;">↻</span>
          </button>
          <button
            @click="toggleZoomMode"
            :class="{ 'bg-blue-100 text-blue-600': isZoomMode }"
            class="bg-white border border-gray-300 rounded w-6 h-6 flex items-center justify-center hover:bg-gray-50 shadow-sm"
            title="縮放模式"
          >
            <span style="font-size: 12px;">🔍</span>
          </button>
        </div>
      </div>

      <!-- 圖例 - 右側獨立區域，永不覆蓋圖表 -->
      <div 
        v-if="showLegend && defectTypes.length > 0"
        class="flex-shrink-0 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
        :style="legendContainerStyle"
      >
        <!-- 標題 -->
        <!-- <div class="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span class="font-medium text-sm" style="color: #374151; font-size: 13px;">缺點類型</span>
          <span class="text-xs text-gray-500 ml-1" style="color: #6B7280; font-size: 11px;">({{ defectTypes.length }})</span>
        </div> -->
        
        <!-- 可滾動內容區 -->
        <div class="overflow-y-auto overflow-x-hidden px-2 py-2" :style="{ maxHeight: legendScrollHeight, boxSizing: 'border-box' }">
          <div class="space-y-1.5">
            <div 
              v-for="defect in defectTypes" 
              :key="defect"
              :class="['flex items-center cursor-pointer hover:bg-gray-100 rounded transition-colors', legendItemClass]"
              @click="toggleDefectVisibility(defect)"
              @mouseenter="highlightDefect(defect)"
              @mouseleave="clearHighlight"
              :title="`${defect === '0' ? '其他' : defect} ${hiddenDefects.has(defect) ? '(已隱藏)' : ''}`"
              style="min-height: 24px;"
            >
              <div 
                :class="['rounded-full border border-gray-400 flex-shrink-0', legendDotSize]"
                :style="{ backgroundColor: getDefectColor(defect) }"
              ></div>
              <span 
                :class="[
                  'flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis',
                  { 'line-through opacity-50': hiddenDefects.has(defect) }
                ]"
                :style="{ 
                  fontSize: legendFontSize, 
                  color: hiddenDefects.has(defect) ? '#9CA3AF' : '#374151',
                  fontWeight: '500',
                  lineHeight: '1.5'
                }"
              >
                {{ defect === '0' ? '其他' : defect }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 全局載入中狀態 (覆蓋圖表與 Legend) -->
      <div 
        v-if="loading"
        class="absolute inset-0 flex justify-center items-center bg-white bg-opacity-75 z-20 rounded-lg"
      >
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p class="text-sm text-gray-600">載入中...</p>
        </div>
      </div>
    </div>

    <!-- 工具提示 - 已移至父層組件 -->
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'

// =============== Props ===============
const props = defineProps({
  // 數據
  data: {
    type: Array,
    default: () => []
  },
  layoutData: {
    type: Array,
    default: () => []
  },
  
  // 顯示配置
  board: {
    type: Number,
    default: 0
  },
  showBoardTitle: {
    type: Boolean,
    default: true
  },
  boardTitle: {
    type: String,
    default: ''
  },
  
  // 尺寸配置
  width: {
    type: Number,
    default: 0 // 0 表示自適應
  },
  height: {
    type: Number,
    default: 400
  },
  
  // 功能配置
  showZoomControls: {
    type: Boolean,
    default: true
  },
  showLegend: {
    type: Boolean,
    default: true
  },
  enableTooltip: {
    type: Boolean,
    default: true
  },
  
  // 過濾配置
  sideFilter: {
    type: String,
    default: 'B', // 'B', 'C', 'S'
    validator: value => ['B', 'C', 'S'].includes(value)
  },
  showFakePoints: {
    type: Boolean,
    default: false
  },
  repairFilter: {
    type: Boolean,
    default: false
  },
  
  // 樣式配置
  containerClass: {
    type: String,
    default: ''
  },
  emptyMessage: {
    type: String,
    default: 'Mapping 圖表'
  },
  
  // 狀態
  loading: {
    type: Boolean,
    default: false
  }
})

// =============== Emits ===============
const emit = defineEmits([
  'point-click',
  'point-hover',
  'point-leave',
  'zoom-change',
  'chart-ready'
])

// =============== Refs ===============
const chartContainer = ref(null)
const componentId = ref(Math.random().toString(36).substr(2, 9))

// =============== 狀態 ===============
const isZoomMode = ref(false)
const hiddenDefects = ref(new Set())

// D3 相關狀態
const svgElement = ref(null)
const xScale = ref(null)
const yScale = ref(null)
const zoom = ref(null)
const colorScale = ref(null)

// =============== 計算屬性 ===============

// 根據傳入的寬度計算 Legend 寬度（自適應）
const legendWidth = computed(() => {
  if (!props.showLegend) return 0
  
  const totalWidth = props.width || 600 // 預設總寬度
  
  // 根據總寬度計算合適的 Legend 寬度
  if (totalWidth < 200) {
    return 0  // 太小不顯示
  } else if (totalWidth < 300) {
    return 80  // Tooltip 極小尺寸
  } else if (totalWidth < 500) {
    return 90  // 極小
  } else if (totalWidth < 700) {
    return 120  // 小
  } else if (totalWidth < 900) {
    return 140  // 中等
  } else {
    return 160  // 大
  }
})

// 計算實際可用的圖表寬度
const chartWidth = computed(() => {
  if (!props.width) return 0
  const gap = props.showLegend && legendWidth.value > 0 ? 12 : 0 // gap-3 = 12px
  return props.width - legendWidth.value - gap
})

// 圖表容器樣式（動態計算寬度，扣除 Legend 和間隙）
const chartContainerStyle = computed(() => {
  const styles = {}
  
  // 高度設定
  if (props.height > 0) {
    styles.height = props.height + 'px'
  } else {
    styles.height = '400px'
  }
  
  // 寬度設定 - 不設定寬度，讓 flex-1 自動填充
  // 主容器已經通過 mainContainerStyle 限制了總寬度
  
  return styles
})

// Legend 容器樣式（根據總寬度自適應）
const legendContainerStyle = computed(() => {
  const styles = {
    width: legendWidth.value + 'px',
    minWidth: legendWidth.value + 'px',
    maxWidth: legendWidth.value + 'px',  // 防止溢出
    boxSizing: 'border-box'  // 確保 border 和 padding 計入寬度
  }
  
  // 高度與圖表一致
  if (props.height > 0) {
    styles.maxHeight = props.height + 'px'
  } else {
    styles.maxHeight = '400px'
  }
  
  return styles
})

// Hover 狀態
const highlightedDefect = ref(null)

const highlightDefect = (defect) => {
  highlightedDefect.value = defect
  
  if (!svgElement.value) return
  
  // 獲取當前容器寬度來判斷是否為小尺寸
  const containerRect = chartContainer.value?.getBoundingClientRect()
  const width = chartWidth.value || containerRect?.width || 400
  const isSmall = width < 300
  
  svgElement.value.selectAll('.data-point')
    .transition()
    .duration(200)
    .attr('opacity', d => {
      // 如果是被選中的類型，或是目前沒有選中任何類型，則顯示(1)
      if (defect === d.Classify) return 1
      // 其他類型則變淡(0.1)
      return 0.1
    })
    .attr('r', d => {
      // 放大被選中的點
      const baseRadius = d.Classify === '0' ? (isSmall ? 1 : 1.5) : (isSmall ? 2 : 3)
      if (defect === d.Classify) return baseRadius * 1.5
      return baseRadius
    })
}

const clearHighlight = () => {
  highlightedDefect.value = null
  
  if (!svgElement.value) return
  
  // 獲取當前容器寬度來判斷是否為小尺寸
  const containerRect = chartContainer.value?.getBoundingClientRect()
  const width = chartWidth.value || containerRect?.width || 400
  const isSmall = width < 300
  
  svgElement.value.selectAll('.data-point')
    .transition()
    .duration(200)
    .attr('opacity', 1)
    .attr('r', d => d.Classify === '0' ? (isSmall ? 1 : 1.5) : (isSmall ? 2 : 3))
}

// Legend 滾動區域高度
const legendScrollHeight = computed(() => {
  const maxHeight = props.height > 0 ? props.height : 400
  return (maxHeight - 48) + 'px' // 減去標題高度
})

// Legend 字體和間距大小（根據寬度調整）
const legendItemClass = computed(() => {
  const width = legendWidth.value
  
  if (width <= 100) {
    return 'px-1 py-0.5 gap-1'  // 極小
  } else if (width <= 120) {
    return 'px-1.5 py-0.5 gap-1.5'  // 小
  } else {
    return 'px-2 py-1 gap-2'  // 中等/大
  }
})

// Legend 文字大小
const legendTextClass = computed(() => {
  const width = legendWidth.value
  
  if (width <= 100) {
    return 'text-[10px]'  // 極小 10px
  } else if (width <= 120) {
    return 'text-xs'  // 小 12px
  } else {
    return 'text-xs'  // 中等/大 12px
  }
})

// Legend 文字字體大小（像素值，用於內聯樣式）
const legendFontSize = computed(() => {
  const width = legendWidth.value
  
  // 增加最小字體大小，確保可讀性
  if (width <= 80) {
    return '12px'  // 最小 12px（提升可見度）
  } else if (width <= 100) {
    return '12px'
  } else if (width <= 120) {
    return '13px'
  } else {
    return '13px'
  }
})

// 圓點大小（根據寬度調整）
const legendDotSize = computed(() => {
  const width = legendWidth.value
  
  if (width <= 100) {
    return 'w-2 h-2'  // 極小
  } else if (width <= 120) {
    return 'w-2.5 h-2.5'  // 小
  } else {
    return 'w-3 h-3'  // 標準
  }
})

// 主容器樣式（控制整體寬度）
const mainContainerStyle = computed(() => {
  const styles = {}
  if (props.width > 0) {
    styles.width = props.width + 'px'
    styles.maxWidth = props.width + 'px'  // 防止子項溢出
  }
  return styles
})

const containerStyle = computed(() => {
  const styles = {}
  if (props.width > 0) styles.width = props.width + 'px'
  if (props.height > 0) styles.height = props.height + 'px'
  return styles
})

const hasData = computed(() => {
  return renderData.value.length > 0
})

const renderDataCount = computed(() => {
  return renderData.value.length
})

// 過濾後的渲染數據
const renderData = computed(() => {
  if (!props.data || !Array.isArray(props.data)) return []
  
  let filteredData = [...props.data]
  
  // 板號過濾
  if (props.board !== 0) {
    filteredData = filteredData.filter(item => item.BoardNo === props.board)
  }
  
  // 側面過濾
  if (props.sideFilter !== 'B') {
    filteredData = filteredData.filter(item => item.OutSide === props.sideFilter)
  }
  
  // 假點過濾
  if (!props.showFakePoints) {
    filteredData = filteredData.filter(item => item.Classify !== '0')
  }
  
  // 修補過濾
  if (props.repairFilter) {
    filteredData = filteredData.filter(item => 
      item.Scrapped === 1 || (item.Repair === false && item.Scrapped === 0)
    )
  }
  
  // 隱藏的缺點類型過濾
  filteredData = filteredData.filter(item => !hiddenDefects.value.has(item.Classify))
  
  return filteredData.sort((a, b) => a.Classify - b.Classify)
})

// 缺點類型列表
const defectTypes = computed(() => {
  if (!props.data || !Array.isArray(props.data)) return []
  
  // 1. 建立基礎篩選數據用於計算數量 (排除 hiddenDefects 的影響)
  let baseData = [...props.data]

  // 根據 board 篩選
  if (props.board !== 0) {
    baseData = baseData.filter(item => item.BoardNo === props.board)
  }
  
  // 根據側面篩選
  if (props.sideFilter === 'C' || props.sideFilter === 'S') {
    baseData = baseData.filter(item => item.OutSide === props.sideFilter)
  }
  
  // 假點過濾
  if (!props.showFakePoints) {
    baseData = baseData.filter(item => item.Classify !== '0')
  }
  
  // 修補過濾
  if (props.repairFilter) {
    baseData = baseData.filter(item => 
      item.Scrapped === 1 || (item.Repair === false && item.Scrapped === 0)
    )
  }

  // 2. 計算每個類型的數量
  const counts = {}
  baseData.forEach(item => {
    const type = item.Classify
    counts[type] = (counts[type] || 0) + 1
  })

  // 3. 取得類型列表並排序 (數量降冪 > 名稱升冪)
  const types = Object.keys(counts).sort((a, b) => {
    // 優先: 數量多到少
    const countDiff = counts[b] - counts[a]
    if (countDiff !== 0) return countDiff
    
    // 次要: 名稱字串排序
    return String(a).localeCompare(String(b))
  })

  console.log('🎨 [UniversalMapping] 計算缺點類型列表詳情:', {
    sortedTypes: types,
    counts: counts
  })
  
  return types
})

// =============== 方法 ===============
const getDefectColor = (defect) => {
  if (!colorScale.value) return '#999'
  return defect === '0' ? '#7f7f7f' : colorScale.value(defect)
}

const toggleDefectVisibility = (defect) => {
  if (hiddenDefects.value.has(defect)) {
    hiddenDefects.value.delete(defect)
  } else {
    hiddenDefects.value.add(defect)
  }
  drawChart()
}

const toggleZoomMode = () => {
  isZoomMode.value = !isZoomMode.value
  if (svgElement.value) {
    if (isZoomMode.value) {
      svgElement.value.call(zoom.value)
    } else {
      svgElement.value.on('.zoom', null)
    }
  }
}

const resetZoom = () => {
  if (svgElement.value && zoom.value) {
    svgElement.value.transition().duration(750).call(
      zoom.value.transform,
      d3.zoomIdentity
    )
  }
}

const showTooltip = (event, data) => {
  if (!props.enableTooltip) return
  
  // 傳遞事件和數據給父組件處理
  emit('point-hover', {
    event,
    data,
    position: {
      x: event.clientX,
      y: event.clientY
    }
  })
}

const hideTooltip = () => {
  emit('point-leave')
}

// =============== 繪圖輔助函數 ===============

/**
 * 計算圖表尺寸和響應式設定
 */
const calculateChartDimensions = (containerWidth, containerHeight) => {
  const isSmall = containerWidth < 300
  const isTiny = containerWidth < 200
  
  // 動態計算 Margin
  const margin = isSmall 
    ? { top: 10, right: 10, bottom: 25, left: 30 } 
    : { top: 25, right: 20, bottom: 30, left: 35 }
  
  // 極小尺寸微調
  if (isTiny) {
    margin.left = 25
    margin.bottom = 20
    margin.right = 5
    margin.top = 5
  }
  
  const axisFontSize = isTiny ? '9px' : (isSmall ? '10px' : '11px')
  const tickCount = isTiny ? 3 : (isSmall ? 4 : 5)
  
  const innerWidth = containerWidth - margin.left - margin.right
  const innerHeight = containerHeight - margin.top - margin.bottom
  
  // 計算繪圖區域的尺寸
  const availableSize = Math.min(innerWidth, innerHeight)
  const sizeRatio = isSmall ? 0.95 : 0.90
  const plotSize = Math.max(availableSize * sizeRatio, 10)
  
  return {
    isSmall,
    isTiny,
    margin,
    axisFontSize,
    tickCount,
    plotWidth: plotSize,
    plotHeight: plotSize,
    xOffset: margin.left + (innerWidth - plotSize) / 2,
    yOffset: margin.top + (innerHeight - plotSize) / 2
  }
}

/**
 * 設置比例尺
 */
const setupScales = (dimensions) => {
  const { xOffset, yOffset, plotWidth, plotHeight } = dimensions
  
  xScale.value = d3.scaleLinear()
    .domain([0, 510])
    .range([xOffset, xOffset + plotWidth])
  
  yScale.value = d3.scaleLinear()
    .domain([0, 510])
    .range([yOffset + plotHeight, yOffset])
  
  colorScale.value = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(defectTypes.value)
}

/**
 * 設置縮放功能
 */
const setupZoom = (svg, tickCount) => {
  zoom.value = d3.zoom()
    .scaleExtent([0.5, 10])
    .on('zoom', (event) => {
      const { transform } = event
      
      svg.select('.x-axis')
        .call(d3.axisBottom(transform.rescaleX(xScale.value)).ticks(tickCount))
      
      svg.select('.y-axis')
        .call(d3.axisLeft(transform.rescaleY(yScale.value)).ticks(tickCount))
      
      svg.selectAll('.data-point')
        .attr('transform', transform)
      
      svg.selectAll('.layout-path')
        .attr('transform', transform)
      
      emit('zoom-change', transform)
    })
}

/**
 * 繪製座標軸
 */
const drawAxes = (svg, dimensions) => {
  const { xOffset, yOffset, plotHeight, axisFontSize, tickCount } = dimensions
  
  // X 軸 - 使用 join() 增量更新
  const xAxis = svg.selectAll('.x-axis')
    .data([null])  // 單一元素
    .join('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${yOffset + plotHeight})`)
    .call(d3.axisBottom(xScale.value).tickSizeOuter(0).ticks(tickCount))
  
  xAxis.selectAll('text')
    .style('font-size', axisFontSize)
    .style('fill', '#374151')
  
  xAxis.selectAll('line, path')
    .style('stroke', '#9CA3AF')
  
  // Y 軸 - 使用 join() 增量更新
  const yAxis = svg.selectAll('.y-axis')
    .data([null])  // 單一元素
    .join('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${xOffset},0)`)
    .call(d3.axisLeft(yScale.value).tickSizeOuter(0).ticks(tickCount))
  
  yAxis.selectAll('text')
    .style('font-size', axisFontSize)
    .style('fill', '#374151')
  
  yAxis.selectAll('line, path')
    .style('stroke', '#9CA3AF')
}

/**
 * 繪製佈局線條
 */
const drawLayoutPaths = (svg) => {
  const layoutData = props.layoutData || []
  
  const line = d3.line()
    .x(d => xScale.value(d.x))
    .y(d => yScale.value(d.y))
  
  svg.selectAll('.layout-path')
    .data(layoutData)
    .join('path')
    .attr('class', 'layout-path')
    .attr('d', line)
    .attr('stroke', 'rgba(0,0,0,0.2)')
    .attr('fill', 'none')
    .attr('stroke-width', 1)
}

/**
 * 繪製數據點
 * 使用 D3 v5+ 的 join() 方法，更簡潔且便於未來優化
 */
const drawDataPoints = (svg, isSmall) => {
  svg.selectAll('.data-point')
    .data(renderData.value)
    .join('circle')
    .attr('class', 'data-point')
    .attr('cx', d => xScale.value(d.Xvalue))
    .attr('cy', d => yScale.value(d.Yvalue))
    .attr('r', d => d.Classify === '0' ? (isSmall ? 1 : 1.5) : (isSmall ? 2 : 3))
    .attr('fill', d => getDefectColor(d.Classify))
    .attr('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('r', d.Classify === '0' ? 2.5 : 4)
      showTooltip(event, d)
    })
    .on('mouseleave', function(event, d) {
      d3.select(this).attr('r', d.Classify === '0' ? (isSmall ? 1 : 1.5) : (isSmall ? 2 : 3))
      hideTooltip()
    })
    .on('click', function(event, d) {
      emit('point-click', d)
    })
}

/**
 * 主繪圖函數
 */
const drawChart = () => {
  if (!chartContainer.value || !hasData.value) return
  
  const container = d3.select(chartContainer.value)
  const svg = container.select(`#mapping-svg-${componentId.value}`)
  
  // 獲取容器尺寸
  const containerRect = chartContainer.value.getBoundingClientRect()
  const width = chartWidth.value || containerRect.width || 400
  const height = props.height || containerRect.height || 400
  
  // 設定 SVG 尺寸
  svg
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
  
  if (width <= 0 || height <= 0) return
  
  // 計算尺寸和響應式設定
  const dimensions = calculateChartDimensions(width, height)
  
  // 設置比例尺
  setupScales(dimensions)
  
  // 設置縮放功能
  setupZoom(svg, dimensions.tickCount)
  
  svgElement.value = svg
  
  // 使用 join() 實現增量更新，避免每次都清空重繪
  // 座標軸
  drawAxes(svg, dimensions)
  
  // 佈局線條
  drawLayoutPaths(svg)
  
  // 數據點（join 會自動處理新增、更新、刪除）
  drawDataPoints(svg, dimensions.isSmall)
  
  // 啟用縮放模式
  if (isZoomMode.value) {
    svg.call(zoom.value)
  }
  
  emit('chart-ready', { svg, xScale: xScale.value, yScale: yScale.value })
}

// =============== 生命週期 ===============
let resizeObserver = null

onMounted(async () => {
  await nextTick()
  
  // 監聽容器尺寸變化
  resizeObserver = new ResizeObserver(() => {
    drawChart()
  })
  
  if (chartContainer.value) {
    resizeObserver.observe(chartContainer.value)
  }
  
  // 初始繪製
  drawChart()
})

// 清理函數
onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  hideTooltip()
})

// =============== 監聽器 ===============
watch([() => props.data, () => props.layoutData, () => props.board, () => props.sideFilter, () => props.showFakePoints, () => props.repairFilter], () => {
  drawChart()
}, { deep: true })

watch(() => hiddenDefects.value.size, () => {
  drawChart()
})
</script>

<style scoped>
.universal-mapping {
  position: relative;
}

/* 確保 SVG 元素正確顯示且不隱藏溢出內容 */
svg {
  display: block;
  overflow: visible !important; /* 強制顯示溢出的座標軸標籤 */
}

/* 確保 Legend 文字可見 */
.universal-mapping span {
  opacity: 1 !important;
  visibility: visible !important;
}

/* 工具提示動畫 */
.tooltip {
  transition: opacity 0.2s ease-in-out;
}
</style>