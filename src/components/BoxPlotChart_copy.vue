<template>
  <div class="w-full">
    <div v-if="title" class="mb-4">
      <h3 class="text-lg font-semibold text-gray-800">{{ title }}</h3>
    </div>
    
    <div 
      v-show="!loading" 
      class="w-full border border-gray-200 rounded-lg bg-white shadow-sm"
      ref="chartContainer"
      :style="{ height: chartHeight + 'px' }"
    ></div>
    
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="text-gray-500">載入中...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { ascending, quantileSorted } from 'd3-array'
import { getPointValueMeta, buildDataClickPayload, buildTooltipData } from '../utils/boxplotChart/boxplotChartUtils'
import { useScales } from '@/composables/boxplot/useScales'
import { renderXAxis, renderValueAxesLeft, renderValueAxesRight } from '@/composables/boxplot/useAxes'

// ==================== Props 定義 ====================
const props = defineProps({
  // 基礎配置
  data: {
    type: Array,
    default: () => []  // 移除 required，避免衝突
  },
  title: {
    type: String,
    default: '站點良率分布圖'
  },
  chartHeight: {
    type: Number,
    default: 500
  },
  margin: {
    type: Object,
    default: () => ({
      top: 20,
      right: 550,
      bottom: 60,
      left: 60
    })
  },
  
  // 圖例配置
  legendType: {
    type: String,
    default: 'status'
  },
  legendOrder: {
    type: Array,
    default: () => []
  },
  enableLegendHighlight: {
    type: Boolean,
    default: true
  },
  
  // 站點配置
  stationOrder: {
    type: Array,
    default: () => []
  },
  
  // 顏色配置
  customColors: {
    type: Object,
    default: () => ({})
  },
  blinkingLegends: {
    type: Array,
    default: () => []
  },
  
  // 🎯 新增：可調參數
  pointRadius: {
    type: Number,
    default: 4
  },
  pointStrokeWidth: {
    type: Number,
    default: 2
  },
  showBoxplotDefault: {
    type: Boolean,
    default: false
  },

  // 🎯 控制項（與外部 props 對齊）
  // 若傳入 showBoxplot，則以外部值為準；否則使用 showBoxplotDefault + expose toggle。
  showBoxplot: {
    type: Boolean,
    default: undefined
  },
  // 若傳入 showGridLines，覆蓋 valueAxisConfig.gridLines
  showGridLines: {
    type: Boolean,
    default: undefined
  },
  // 全域開關：是否允許 blinkingLegends 動畫
  shouldBlink: {
    type: Boolean,
    default: true
  },
  
  // 🎯 X軸配置
  xAxisConfig: {
    type: Object,
    default: () => ({
      field: 'timestamp',        // 資料欄位名稱
      type: 'time',              // 軸類型: 'time', 'linear', 'band'
      label: '時間',              // 軸標籤
      format: '%Y/%m/%d %H',     // 時間格式（僅 type='time' 時有效）
      tickCount: null,           // tick 數量（null 為自動）
      domain: null,              // 自定義 domain [min, max]
      rotation: -50              // 刻度文字旋轉角度
    })
  },
  
  // 🎯 Y軸配置
  yAxisConfig: {
    type: Object,
    default: () => ({
      field: 'station',          // 資料欄位名稱
      type: 'band',              // 軸類型: 'band', 'linear'
      label: '站點',              // 軸標籤
      order: [],                 // 自定義排序（空陣列則自動排序）
      padding: 0.2,              // band 類型的 padding
      showIndependentScale: true // 是否顯示每個類別的獨立比例尺
    })
  },
  
  // 🎯 數值軸配置（用於良率等數值）
  valueAxisConfig: {
    type: Object,
    default: () => ({
      field: 'yield',            // 資料欄位名稱
      unit: '%',                 // 單位
      multiplier: 100,           // 乘數（例如良率 0.95 * 100 = 95%）
      format: '.1f',             // 格式化字串
      gridLines: true            // 是否顯示網格線
    })
  },

  // 🎯 第二數值軸（Right Y）。提供即可啟用（不影響既有預設顯示）。
  rightValueAxisConfig: {
    type: Object,
    default: null
  },
  // 🎯 指定資料點使用哪個數值軸：d[valueAxisSideField] === 'right' | 'r' => Right
  valueAxisSideField: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'data-click',
  'station-click',
  'outlier-click',
  'tooltip-show',
  'tooltip-hide'
])

// ==================== 響應式變數 ====================
const chartContainer = ref(null)
const loading = ref(false)
const internalShowBoxplot = ref(props.showBoxplotDefault)
const containerWidth = ref(0)

const isBoxplotShown = computed(() => {
  return props.showBoxplot !== undefined ? props.showBoxplot : internalShowBoxplot.value
})

const isGridLinesShown = computed(() => {
  return props.showGridLines !== undefined
    ? props.showGridLines
    : !!props.valueAxisConfig?.gridLines
})

// 圖表核心變數
let svg = null
let xScale = null
let yScale = null
let stationScaleMap = new Map()
let rightStationScaleMap = new Map()
let resizeObserver = null

// Persistent layers (created once, updated on render)
let plotG = null
let layerBackground = null
let layerGrid = null
let layerAxes = null
let layerLabels = null
let layerMarks = null
let layerLegend = null

// ==================== 時間解析（多 parser fallback）====================
const parseYMDH = d3.timeParse('%Y/%m/%d %H')
const parseYMDHM = d3.timeParse('%Y/%m/%d %H:%M')
const parseYMDHMS = d3.timeParse('%Y/%m/%d %H:%M:%S')
const parseISO = (s) => {
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

const parseTime = (timeInput) => {
  if (timeInput instanceof Date) {
    return isNaN(timeInput.getTime()) ? null : timeInput
  }
  if (typeof timeInput !== 'string') return null
  
  // 嘗試多種格式
  return parseYMDHMS(timeInput) || 
         parseYMDHM(timeInput) || 
         parseYMDH(timeInput) || 
         parseISO(timeInput)
}

// ==================== Scales（計算邏輯移出 initChart）====================
const scales = useScales({
  props,
  containerWidthRef: containerWidth,
  parseTime
})

// ==================== 工具函數 ====================
const CSSify = (s) => String(s).replace(/[^a-zA-Z0-9]/g, '_')
const validColor = (c) => (c && c !== 'undefined' ? c : '#3b82f6')

// 🎯 創建 X 軸比例尺
const createXScale = (data, width) => {
  const config = props.xAxisConfig
  
  switch (config.type) {
    case 'time': {
      const safeTimes = data
        .map(d => ({ ...d, _parsedTime: parseTime(d[config.field]) }))
        .filter(d => d._parsedTime !== null)
      
      if (safeTimes.length === 0) return null
      
      const timeExtent = config.domain || d3.extent(safeTimes, d => d._parsedTime)
      return d3.scaleTime().domain(timeExtent).range([0, width])
    }
    
    case 'linear': {
      const values = data.map(d => +d[config.field]).filter(v => !isNaN(v))
      if (values.length === 0) return null
      
      const extent = config.domain || d3.extent(values)
      return d3.scaleLinear().domain(extent).range([0, width])
    }
    
    case 'band': {
      const categories = [...new Set(data.map(d => d[config.field]))]
      const ordered = config.order && config.order.length > 0
        ? categories.sort((a, b) => {
            const aIdx = config.order.indexOf(a)
            const bIdx = config.order.indexOf(b)
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
            if (aIdx !== -1) return -1
            if (bIdx !== -1) return 1
            return String(a).localeCompare(String(b))
          })
        : categories.sort()
      
      return d3.scaleBand()
        .domain(ordered)
        .range([0, width])
        .padding(config.padding || 0.2)
    }
    
    default:
      return null
  }
}

// 🎯 創建 Y 軸比例尺
const createYScale = (data, height) => {
  const config = props.yAxisConfig
  
  switch (config.type) {
    case 'band': {
      const categories = [...new Set(data.map(d => d[config.field]))]
      const ordered = config.order && config.order.length > 0
        ? categories.sort((a, b) => {
            const aIdx = config.order.indexOf(a)
            const bIdx = config.order.indexOf(b)
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
            if (aIdx !== -1) return -1
            if (bIdx !== -1) return 1
            return String(a).localeCompare(String(b))
          })
        : categories.sort()
      
      return d3.scaleBand()
        .domain(ordered)
        .range([0, height])
        .padding(config.padding || 0.2)
    }
    
    case 'linear': {
      const values = data.map(d => +d[config.field]).filter(v => !isNaN(v))
      if (values.length === 0) return null
      
      const extent = d3.extent(values)
      return d3.scaleLinear().domain(extent).range([0, height])
    }
    
    default:
      return null
  }
}

// 🎯 創建數值比例尺（用於每個類別的獨立軸）
// valueConfigOverride: 提供即可建立第二數值軸（Right）
const createValueScales = (data, yScaleFunc, valueConfigOverride = null) => {
  const scaleMap = new Map()
  const yConfig = props.yAxisConfig
  const valueConfig = valueConfigOverride || props.valueAxisConfig
  
  if (!yConfig.showIndependentScale) return scaleMap
  if (!valueConfig || !valueConfig.field) return scaleMap
  
  const categories = yScaleFunc.domain()
  
  categories.forEach(category => {
    const categoryY = yScaleFunc(category)
    const categoryHeight = yScaleFunc.bandwidth()
    
    const categoryData = data.filter(d => d[yConfig.field] === category)
    if (categoryData.length === 0) return
    
    const values = categoryData
      .map(d => +d[valueConfig.field] * (valueConfig.multiplier || 1))
      .sort(ascending)
    
    let minV = values[0]
    let maxV = values[values.length - 1]
    
    // 處理單值情況
    if (minV === maxV) {
      minV = Math.max(0, minV - 0.5)
      maxV = minV + 1
    }
    
    const range = Math.max(1, maxV - minV)
    const pad = Math.max(range * 0.1, 1)
    const domainMin = Math.max(0, minV - pad)
    const domainMax = maxV + pad
    
    const scale = d3.scaleLinear()
      .domain([domainMin, domainMax])
      .range([categoryY + categoryHeight, categoryY])
    
    scaleMap.set(category, {
      scale,
      domainMin,
      domainMax
    })
  })
  
  return scaleMap
}

const legendClassValue = (d) => {
  switch (props.legendType) {

    case 'yield':
      const y = d.yield * 100
      return y < 60 ? '0-60%' : y < 80 ? '60-80%' : y < 90 ? '80-90%' : '90-100%'
    case 'time':
      return d.timestamp
    case 'none':
      return 'none'
    default:
      const sample = props.data?.[0]
      return (sample && Object.prototype.hasOwnProperty.call(sample, props.legendType))
        ? d[props.legendType]
        : d.station
  }
}

// ==================== 計算屬性 ====================
const legendStations = computed(() => {
  if (!props.data || props.data.length === 0) return []
  
  let items = []
  
  switch (props.legendType) {
    case 'yield':
      const yieldRanges = ['0-60%', '60-80%', '80-90%', '90-100%']
      items = yieldRanges.filter(range => {
        const [min, max] = range.split('-').map(r => parseFloat(r.replace('%', '')))
        return props.data.some(d => {
          const yieldValue = d.yield * 100
          return max === 100 
            ? (yieldValue >= min && yieldValue <= max) 
            : (yieldValue >= min && yieldValue < max)
        })
      })
      break
      
    case 'time':
      const timePoints = [...new Set(props.data.map(d => d.timestamp))].sort()
      items = timePoints.slice(0, 8)
      break
      
    case 'none':
      return []
      
    default:
      const sampleData = props.data[0]
      if (sampleData && Object.prototype.hasOwnProperty.call(sampleData, props.legendType)) {
        const uniqueValues = [...new Set(props.data.map(d => d[props.legendType]))]
          .filter(value => value !== null && value !== undefined)
        items = uniqueValues
      } else {
        items = [...new Set(props.data.map(d => d.station))]
      }
  }
  
  // 應用自定義排序
  if (props.legendOrder.length > 0) {
    items = items.sort((a, b) => {
      const aIndex = props.legendOrder.indexOf(a)
      const bIndex = props.legendOrder.indexOf(b)
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return String(a).localeCompare(String(b))
    })
  } else {
    items = items.sort((a, b) => String(a).localeCompare(String(b)))
  }
  
  return items
})

// 🎯 修正：colorScale 不靠 index，用 Map 映射
const colorScale = computed(() => {
  const items = legendStations.value
  let colorRange = []

  switch (props.legendType) {
    case 'yield':
      colorRange = ['#ef4444', '#f59e0b', '#eab308', '#22c55e']
      break
      
    case 'time':
      const n = Math.min(9, Math.max(3, items.length))
      colorRange = d3.schemeBlues[n] || d3.schemeTableau10
      break
      
    case 'none':
      colorRange = ['#6b7280']
      break
      
    default:
      if (items.length <= 6) {
        colorRange = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']
      } else if (items.length <= 10) {
        colorRange = d3.schemeTableau10
      } else {
        colorRange = d3.quantize(t => d3.interpolateTurbo(t), items.length)
      }
  }

  // 先建立基礎映射，再應用 customColors 覆蓋
  const scale = d3.scaleOrdinal().domain(items).range(colorRange)
  const colorMap = new Map(items.map(k => [k, scale(k)]))
  
  // 覆蓋自定義顏色
  for (const [key, value] of Object.entries(props.customColors)) {
    if (colorMap.has(key)) {
      colorMap.set(key, value)
    }
  }
  
  // 返回函數而非 scale 對象
  return (key) => colorMap.get(key) ?? '#6b7280'
})

// 獲取數據點顏色（安全版本）
const getPointColorSafe = (d) => {
  switch (props.legendType) {
    case 'yield':
      return colorScale.value(legendClassValue(d))
    case 'time':
      return colorScale.value(d.timestamp)
    case 'none':
      return '#6b7280'
    default:
      const sample = props.data?.[0]
      return (sample && Object.prototype.hasOwnProperty.call(sample, props.legendType))
        ? colorScale.value(d[props.legendType])
        : colorScale.value(d.station)
  }
}

// ==================== 圖例相關函數 ====================
const getLegendTitle = () => {
  switch (props.legendType) {
    case 'station': return '站點'
    case 'yield': return '良率範圍'
    case 'time': return '時間點'
    case 'none': return ''
    default:
      const propertyDisplayNames = {
        station: '站點', yield: '良率', timestamp: '時間戳',
        type: '類型', category: '分類', status: 'Status',
        level: '等級', priority: '優先級', department: '部門',
        team: '團隊', project: '專案', phase: '階段'
      }
      return propertyDisplayNames[props.legendType] || props.legendType
  }
}

const formatLegendLabel = (item) => {
  return String(item)
}

// ==================== 初始化圖表 ====================
const initChart = () => {
  if (!chartContainer.value) {
    console.log('❌ No chart container found')
    return
  }

  containerWidth.value = chartContainer.value.clientWidth
  const containerW = containerWidth.value
  const width = scales.plotWidth.value
  const height = scales.plotHeight.value

  // Create / update persistent SVG scaffold (no full clears)
  svg = d3.select(chartContainer.value)
    .selectAll('svg.boxplot-root')
    .data([null])
    .join('svg')
    .attr('class', 'boxplot-root')
    .attr('width', containerW)
    .attr('height', props.chartHeight)

  plotG = svg
    .selectAll('g.plot-root')
    .data([null])
    .join('g')
    .attr('class', 'plot-root')
    .attr('transform', `translate(${props.margin.left},${props.margin.top})`)

  layerBackground = plotG.selectAll('g.layer-background').data([null]).join('g').attr('class', 'layer-background')
  layerGrid = plotG.selectAll('g.layer-grid').data([null]).join('g').attr('class', 'layer-grid')
  layerAxes = plotG.selectAll('g.layer-axes').data([null]).join('g').attr('class', 'layer-axes')
  layerLabels = plotG.selectAll('g.layer-labels').data([null]).join('g').attr('class', 'layer-labels')
  layerMarks = plotG.selectAll('g.layer-marks').data([null]).join('g').attr('class', 'layer-marks')
  layerLegend = plotG.selectAll('g.layer-legend').data([null]).join('g').attr('class', 'layer-legend')

  // No data: keep scaffold (no full clears)
  if (!props.data || props.data.length === 0) {
    xScale = null
    yScale = null
    stationScaleMap = new Map()
    rightStationScaleMap = new Map()
    return
  }

  // 🎯 使用 computed 產生的 scales / maps
  xScale = scales.xScale.value
  yScale = scales.yScale.value
  if (!xScale) {
    console.log('❌ Failed to create X scale')
    return
  }
  if (!yScale) {
    console.log('❌ Failed to create Y scale')
    return
  }

  stationScaleMap = scales.stationScaleMap.value
  rightStationScaleMap = scales.rightStationScaleMap.value

  const hasRightAxis = scales.hasRightAxis.value
  
  // 獲取 Y 軸類別（站點或其他分類）
  const categories = scales.categories.value
  const categoryGrouped = scales.categoryGrouped.value

  // ==================== Background rows (Enter/Update/Exit) ====================
  const bgRows = layerBackground
    .selectAll('rect.station-background')
    .data(categories, d => d)
    .join('rect')
    .attr('class', 'station-background')
    .attr('x', 0)
    .attr('width', width)
    .attr('stroke', 'rgba(203, 213, 225, 0.3)')
    .attr('stroke-width', 1)
    .attr('rx', 4)
    .attr('y', d => yScale(d))
    .attr('height', yScale.bandwidth())
    .attr('fill', (_, i) => (i % 2 === 0 ? 'rgba(248, 250, 252, 0.8)' : 'rgba(241, 245, 249, 0.8)'))

  const centerLines = layerBackground
    .selectAll('line.station-centerline')
    .data(categories, d => d)
    .join('line')
    .attr('class', 'station-centerline')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,4')
    .attr('opacity', 0.5)
    .attr('y1', d => yScale(d) + yScale.bandwidth() / 2)
    .attr('y2', d => yScale(d) + yScale.bandwidth() / 2)

  // 🎯 座標軸渲染（移至 useAxes）
  renderXAxis({
    layerAxes,
    xScale,
    height,
    xAxisConfig: props.xAxisConfig
  })

  // 🎯 Y 軸類別標籤（Enter/Update/Exit）
  const stationLabelGroups = layerLabels
    .selectAll('g.station-label')
    .data(categories, d => d)
    .join(
      enter => {
        const group = enter.append('g').attr('class', 'station-label')
        group.append('rect').attr('class', 'station-label-bg')
        group.append('text').attr('class', 'station-label-text')
        return group
      },
      update => update,
      exit => exit.remove()
    )

  stationLabelGroups
    .each(function(category, index) {
      const categoryY = yScale(category)
      const categoryHeight = yScale.bandwidth()
      const group = d3.select(this)

      const emitPayload = () => {
        emit('station-click', {
          station: category,
          category,
          data: categoryGrouped.get(category) || []
        })
      }

      // group.select('rect.station-label-bg')
      //   .attr('x', -props.margin.left + 10)
      //   .attr('y', categoryY)
      //   .attr('width', props.margin.left - 25)
      //   .attr('height', categoryHeight)
      //   .attr('rx', 8)
      //   .attr('fill', index % 2 === 0 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(230, 230, 246, 0.12)')
      //   .attr('stroke', 'rgba(59, 130, 246, 0.15)')
      //   .attr('stroke-width', 1)
      //   .style('cursor', 'pointer')
      //   .on('click', emitPayload)

      group.select('text.station-label-text')
        .attr('x', -props.margin.left + (props.margin.left - 25) / 2)
        .attr('y', categoryY + categoryHeight / 2)
        .attr('dy', '0.35em')
        .style('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .style('fill', '#1e40af')
        .style('cursor', 'pointer')
        .on('click', emitPayload)
        .text(category)
    })

  // 類別分隔線（第一個不畫）
  const separatorData = categories.slice(1)
  layerBackground
    .selectAll('line.station-separator')
    .data(separatorData, d => d)
    .join('line')
    .attr('class', 'station-separator')
    .attr('x1', -props.margin.left + 15)
    .attr('x2', width + 15)
    .attr('stroke', '#94a3b8')
    .attr('stroke-width', 2)
    .attr('y1', d => yScale(d) - yScale.padding() * yScale.step() / 2)
    .attr('y2', d => yScale(d) - yScale.padding() * yScale.step() / 2)

  // 🎯 數值軸（每個類別的獨立軸） - Left
  renderValueAxesLeft({
    layerAxes,
    categories,
    yScale,
    stationScaleMap,
    valueAxisConfig: props.valueAxisConfig,
    cssify: CSSify
  })

  // 網格線（以 tick values data join）
  const gridCategoryGroups = layerGrid
    .selectAll('g.grid-category')
    .data(categories, d => d)
    .join('g')
    .attr('class', d => `grid-category grid-category-${CSSify(d)}`)
    .attr('transform', d => `translate(0, ${yScale(d) ?? 0})`)

  gridCategoryGroups.each(function(category) {
    const scaleInfo = stationScaleMap.get(category)
    if (!scaleInfo) return
    const { scale: valueScale } = scaleInfo
    const categoryHeight = yScale.bandwidth()
    const tickValues = isGridLinesShown.value
      ? valueScale.ticks(Math.min(4, Math.ceil(categoryHeight / 25)))
      : []

    d3.select(this)
      .selectAll('line.station-yield-grid')
      .data(tickValues, d => d)
      .join('line')
      .attr('class', 'station-yield-grid')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => valueScale(d))
      .attr('y2', d => valueScale(d))
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 0.8)
      .attr('stroke-dasharray', '2,4')
      .attr('opacity', 0.4)
  })

  // 🎯 右側數值軸（可選，Dual Y）
  renderValueAxesRight({
    layerAxes,
    categories,
    yScale,
    width,
    rightStationScaleMap,
    rightValueAxisConfig: hasRightAxis ? props.rightValueAxisConfig : null,
    cssify: CSSify
  })

  // 繪製數據點（使用 data join）
  drawDataPoints(layerMarks, width, { hasRightAxis })
  
  // 繪製圖例（使用 data join）
  drawLegend(layerLegend, width, { hasRightAxis, plotG: plotG })
}

// ==================== 繪製數據點（使用 Data Join）====================
const drawDataPoints = (g, width, { hasRightAxis } = { hasRightAxis: false }) => {
  if (!g) return
  
  const yConfig = props.yAxisConfig
  const xConfig = props.xAxisConfig
  const leftConfig = props.valueAxisConfig
  const rightConfig = props.rightValueAxisConfig
  const sideField = props.valueAxisSideField
  
  const grouped = d3.group(props.data, d => d[yConfig.field])

  // 以 yScale domain 為準，確保類別移除時能正確 exit
  const categories = yScale?.domain ? yScale.domain() : [...grouped.keys()]

  const categoryGroups = g
    .selectAll('g.points-category')
    .data(categories, d => d)
    .join(
      enter => enter.append('g').attr('class', 'points-category'),
      update => update,
      exit => exit.remove()
    )
    .attr('class', d => `points-category points-category-${CSSify(d)}`)
    .attr('transform', d => `translate(0, ${yScale(d) ?? 0})`)

  categoryGroups.each(function(categoryName) {
    const categoryG = d3.select(this)
    const categoryPoints = grouped.get(categoryName) || []

    const y0 = yScale(categoryName) ?? 0

    const leftScaleInfo = stationScaleMap.get(categoryName)
    if (!leftScaleInfo) {
      categoryG.selectAll('circle.data-point').remove()
      return
    }

    const rightScaleInfo = hasRightAxis ? rightStationScaleMap.get(categoryName) : null

    const valueAccess = (d) => {
      return getPointValueMeta({
        datum: d,
        sideField,
        hasRightAxis,
        leftConfig,
        rightConfig,
        leftScale: leftScaleInfo.scale,
        rightScale: rightScaleInfo?.scale
      })
    }

    // 🎯 Key 函數：確保數據點唯一性
    const keyFn = (d, i) => `${categoryName}|${d[xConfig.field]}|${d.raw?.lotnum ?? i}`

    const sel = categoryG
      .selectAll('circle.data-point')
      .data(categoryPoints, keyFn)

    // EXIT
    sel.exit()
      .transition().duration(150)
      .attr('r', 0)
      .remove()

    // ENTER
    const entered = sel.enter()
      .append('circle')
      .attr('class', d => {
        const legendValue = legendClassValue(d)
        return `data-point data-point-${CSSify(categoryName)} legend-${CSSify(legendValue)}`
      })
      .attr('cx', d => {
        const xValue = xConfig.type === 'time'
          ? parseTime(d[xConfig.field])
          : d[xConfig.field]

        if (xConfig.type === 'time' && !xValue) return -9999

        const x = xScale(xValue)
        const siblings = categoryPoints.filter(p => p[xConfig.field] === d[xConfig.field])
        const idx = siblings.indexOf(d)
        return x + (idx - (siblings.length - 1) / 2) * 2
      })
      .attr('cy', d => {
        const { scale, value } = valueAccess(d)
        return scale(value)
      })
      .attr('r', 0)
      .attr('fill', d => validColor(getPointColorSafe(d)))
      .attr('stroke', '#fff')
      .attr('stroke-width', props.pointStrokeWidth)
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))')
      .on('click', function (_, d) {
        const meta = valueAccess(d)
        const payload = buildDataClickPayload({
          datum: d,
          yField: yConfig.field,
          meta
        })

        // ✅ 保持既有事件
        emit('data-click', payload)

        // ✅ 可選：離群值事件（僅在顯示 boxplot 時啟用）
        if (isBoxplotShown.value) {
          const xValueRaw = d[xConfig.field]
          const pointsAtX = categoryPoints.filter(p => p[xConfig.field] === xValueRaw)
          const sameSideValues = pointsAtX
            .map(p => valueAccess(p))
            .filter(v => v.side === meta.side && !isNaN(v.value))
            .map(v => v.value)
            .sort(ascending)

          if (sameSideValues.length > 4) {
            const stats = calculateBoxplotStats(sameSideValues)
            const isOutlier = !!(stats?.outliers && stats.outliers.includes(meta.value))
            if (isOutlier) {
              emit('outlier-click', { ...payload, stats })
            }
          }
        }
      })
      .on('mouseover', function (event, d) {
        const circle = d3.select(this)
        circle.transition().duration(120)
          .attr('r', props.pointRadius + 3)
          .attr('opacity', 1)
          .attr('stroke-width', props.pointStrokeWidth + 1)
          .style('filter', 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))')

        const rect = chartContainer.value.getBoundingClientRect()

        const xValue = xConfig.type === 'time'
          ? parseTime(d[xConfig.field])
          : d[xConfig.field]
        const x = xScale(xValue)

        const meta = valueAccess(d)
        const y = y0 + meta.scale(meta.value)
        const color = validColor(getPointColorSafe(d))

        const containerX = props.margin.left + x
        const containerY = props.margin.top + y
        const absX = rect.left + containerX
        const absY = rect.top + containerY

        emit('tooltip-show', {
          position: {
            // legacy (kept): x/y are absolute page coords; pageX/pageY are plot coords
            x: absX,
            y: absY,
            pageX: x,
            pageY: y,

            // standardized: explicit coordinate spaces
            absX,
            absY,
            containerX,
            containerY,
            plotX: x,
            plotY: y
          },
          data: buildTooltipData({
            datum: d,
            yField: yConfig.field,
            xField: xConfig.field,
            meta,
            color,
            extra: '點擊查看詳細資訊',
            legacyFields: true
          })
        })
      })
      .on('mouseout', function () {
        const circle = d3.select(this)
        circle.transition().duration(120)
          .attr('r', props.pointRadius)
          .attr('opacity', 0.9)
          .attr('stroke-width', props.pointStrokeWidth)
          .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))')

        emit('tooltip-hide')

        // 恢復閃爍
        if (props.shouldBlink && circle.property('shouldBlink')) {
          const f = circle.property('blinkFunction')
          f && f()
        }
      })

    // ENTER + UPDATE（平滑過渡）
    entered.merge(sel)
      .transition().duration(180)
      .attr('r', props.pointRadius)
      .attr('cx', d => {
        const xValue = xConfig.type === 'time'
          ? parseTime(d[xConfig.field])
          : d[xConfig.field]

        if (xConfig.type === 'time' && !xValue) return -9999

        const x = xScale(xValue)
        const siblings = categoryPoints.filter(p => p[xConfig.field] === d[xConfig.field])
        const idx = siblings.indexOf(d)
        return x + (idx - (siblings.length - 1) / 2) * 2
      })
      .attr('cy', d => {
        const { scale, value } = valueAccess(d)
        return scale(value)
      })
      .attr('fill', d => validColor(getPointColorSafe(d)))

    // 🎯 閃爍效果
    entered.each(function(d) {
      if (!props.shouldBlink) return
      const value = legendClassValue(d)
      if (props.blinkingLegends.includes(value)) {
        makeBlink(d3.select(this))
      }
    })
  })
}

// 🎯 閃爍函數（修正色碼 & 可中止）
function makeBlink(circle) {
  circle.property('shouldBlink', true)
  
  function loop() {
    if (!circle.property('shouldBlink')) return
    
    circle
      .transition().duration(600)
      .attr('fill', '#ff0000')
      .attr('r', props.pointRadius + 1)
      .attr('stroke-width', props.pointStrokeWidth)
      .attr('stroke', '#ffea00')
      .transition().duration(600)
      .attr('fill', '#ff0000')
      .attr('r', props.pointRadius)
      .attr('stroke-width', props.pointStrokeWidth)
      .attr('stroke', '#ffea00')
      .on('end', loop)
  }
  
  circle.property('blinkFunction', loop)
  loop()
}

// ==================== 繪製圖例 ====================
const drawLegend = (g, width, { hasRightAxis, plotG } = { hasRightAxis: false, plotG: null }) => {
  if (!g) return

  const items = legendStations.value || []
  const legendX = width + (hasRightAxis ? 60 : 10)
  const legendY = 20
  const itemHeight = 24
  const dotSize = 8

  const legend = g
    .selectAll('g.legend')
    .data(items.length ? [null] : [])
    .join('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${legendX}, ${legendY})`)

  legend
    .selectAll('text.legend-title')
    .data([getLegendTitle()])
    .join('text')
    .attr('class', 'legend-title')
    .attr('x', 0)
    .attr('y', 0)
    .attr('dy', '0.35em')
    .style('font-size', '14px')
    .style('font-weight', '600')
    .style('fill', '#374151')
    .text(d => d)

  const legendItems = legend
    .selectAll('g.legend-item')
    .data(items, d => String(d))
    .join(
      enter => {
        const row = enter.append('g').attr('class', 'legend-item')
        row.append('rect')
        row.append('circle')
        row.append('text')
        return row
      },
      update => update,
      exit => exit.remove()
    )
    .attr('transform', (_, i) => `translate(0, ${(i + 1) * itemHeight + 10})`)
    .style('cursor', 'pointer')

  // 🎯 Legend 高亮（保留閃爍點）
  legendItems
    .on('mouseover', function(_, d) {
      d3.select(this).select('rect')
        .transition().duration(150)
        .attr('opacity', 0.15)

      if (!props.enableLegendHighlight) return

      const legendValue = CSSify(String(d))
      const root = plotG || g
      root.selectAll('.data-point')
        .filter(function() { return !d3.select(this).property('shouldBlink') })
        .transition().duration(180)
        .style('opacity', function() {
          return d3.select(this).attr('class').includes(`legend-${legendValue}`) ? 1 : 0.2
        })
        .style('filter', function() {
          return d3.select(this).attr('class').includes(`legend-${legendValue}`)
            ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
        })
    })
    .on('mouseout', function() {
      d3.select(this).select('rect')
        .transition().duration(150)
        .attr('opacity', 0)

      if (!props.enableLegendHighlight) return

      const root = plotG || g
      root.selectAll('.data-point')
        .filter(function() { return !d3.select(this).property('shouldBlink') })
        .transition().duration(180)
        .style('opacity', 0.9)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))')
    })

  legendItems.select('rect')
    .attr('x', -5)
    .attr('y', -10)
    .attr('width', 300)
    .attr('height', itemHeight - 2)
    .attr('rx', 4)
    .attr('fill', '#f3f4f6')
    .attr('opacity', 0)

  legendItems.select('circle')
    .attr('cx', dotSize / 2)
    .attr('cy', 0)
    .attr('r', dotSize / 2)
    .attr('fill', d => (props.blinkingLegends.includes(d) ? '#ff0000' : colorScale.value(d)))
    .attr('stroke', d => (props.blinkingLegends.includes(d) ? '#FFD700' : 'none'))
    .attr('stroke-width', d => (props.blinkingLegends.includes(d) ? 3 : 0))

  legendItems.select('text')
    .attr('x', dotSize + 10)
    .attr('y', 0)
    .attr('dy', '0.35em')
    .style('font-size', '12px')
    .style('fill', '#374151')
    .style('font-weight', '500')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 1)
    .text(d => {
      const label = formatLegendLabel(d)
      return label.length > 30 ? label.substring(0, 30) + '...' : label
    })

  // Long label tooltip via <title>
  legendItems
    .selectAll('title')
    .data(d => {
      const full = formatLegendLabel(d)
      return full.length > 30 ? [full] : []
    })
    .join('title')
    .text(d => d)

  // Separator line
  legend
    .selectAll('line.legend-separator')
    .data([null])
    .join('line')
    .attr('class', 'legend-separator')
    .attr('x1', 0)
    .attr('x2', 280)
    .attr('y1', (items.length + 1) * itemHeight + 20)
    .attr('y2', (items.length + 1) * itemHeight + 20)
    .attr('stroke', '#e5e7eb')
    .attr('stroke-width', 1)

  // Axis info block
  const axisInfoY = (items.length + 2) * itemHeight + 25
  const axisInfo = legend
    .selectAll('g.axis-info')
    .data([null])
    .join('g')
    .attr('class', 'axis-info')
    .attr('transform', `translate(0, ${axisInfoY})`)

  axisInfo
    .selectAll('text.axis-x')
    .data(['X軸：時間'])
    .join('text')
    .attr('class', 'axis-x')
    .attr('x', 0)
    .attr('y', 0)
    .style('font-size', '10px')
    .style('fill', '#6b7280')
    .text(d => d)

  axisInfo
    .selectAll('text.axis-y')
    .data([hasRightAxis ? 'Y軸：站點（良率分布，左右數值軸）' : 'Y軸：站點（良率分布）'])
    .join('text')
    .attr('class', 'axis-y')
    .attr('x', 0)
    .attr('y', 15)
    .style('font-size', '10px')
    .style('fill', '#6b7280')
    .text(d => d)
}

// ==================== 盒鬚圖統計（使用 quantileSorted）====================
const calculateBoxplotStats = (values) => {
  if (!values || values.length === 0) return null
  
  const sorted = values.slice().sort(ascending)
  const n = sorted.length
  
  const q1 = quantileSorted(sorted, 0.25)
  const median = quantileSorted(sorted, 0.5)
  const q3 = quantileSorted(sorted, 0.75)
  
  const iqr = q3 - q1
  const lowerFence = q1 - 1.5 * iqr
  const upperFence = q3 + 1.5 * iqr
  
  const min = Math.max(sorted[0], lowerFence)
  const max = Math.min(sorted[n - 1], upperFence)
  const outliers = sorted.filter(v => v < lowerFence || v > upperFence)
  
  return { min, q1, median, q3, max, outliers, count: n }
}

// ==================== 更新圖表 ====================
const updateChart = () => {
  if (props.data.length === 0) return
  nextTick(() => {
    initChart()
  })
}

// ==================== Watch & 生命週期 ====================
watch(() => props.data, () => {
  updateChart()
}, { immediate: false })

onMounted(() => {
  nextTick(() => {
    if (props.data?.length) initChart()
  })
  
  // 🎯 ResizeObserver
  resizeObserver = new ResizeObserver(() => {
    if (props.data?.length) updateChart()
  })
  
  if (chartContainer.value) {
    resizeObserver.observe(chartContainer.value)
  }
})

onBeforeUnmount(() => {
  // 🎯 清理：中止所有 transition & disconnect observer
  if (svg) svg.selectAll('*').interrupt()
  if (resizeObserver) resizeObserver.disconnect()
})

// ==================== defineExpose（對外暴露）====================
defineExpose({
  reInit: initChart,
  toggleBoxplot: () => {
    internalShowBoxplot.value = !internalShowBoxplot.value
    updateChart()
  }
})
</script>

<style scoped>
.tooltip {
  pointer-events: none;
}

/* 軸線樣式 */
:deep(.x-axis) .domain,
:deep(.y-axis) .domain {
  stroke: #374151;
  stroke-width: 1;
}

:deep(.x-axis) .tick line,
:deep(.y-axis) .tick line,
:deep(.yield-axis) .tick line {
  stroke: #9ca3af;
  stroke-width: 1;
}

:deep(.x-axis) .tick text {
  font-size: 10px;
  fill: #4b5563;
}

:deep(.station-yield-axis) .tick text {
  font-size: 9px;
  fill: #4b5563;
  font-weight: 500;
}

/* 網格線樣式 */
.station-yield-grid {
  stroke-dasharray: 3,3;
  opacity: 0.6;
}

/* 站點分隔線樣式 */
.station-separator {
  opacity: 0.8;
}

/* 站點背景樣式 */
.station-background {
  opacity: 0.3;
}

/* 數據點懸停效果 */
circle:hover {
  filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.3));
}

label {
  cursor: pointer;
  user-select: none;
}
</style>
