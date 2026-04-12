<template>
  <div class="w-full">
    <div v-if="title" class="mb-4">
      <h3 class="text-lg font-semibold text-gray-800">{{ title }}</h3>
    </div>
    
    <!-- 控制面板 -->
    <div class="flex flex-wrap items-center gap-4 mb-4">
      <!-- 時間範圍選擇器 -->
      <div class="flex items-center space-x-2">
        <label class="text-sm font-medium text-gray-700">時間範圍:</label>
        <select 
          v-model="timeRange" 
          @change="updateChart"
          class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="24h">24小時</option>
          <option value="7d">7天</option>
          <option value="30d">30天</option>
        </select>
      </div>
      
      <!-- 站點選擇器 -->
      <div class="flex items-center space-x-2">
        <label class="text-sm font-medium text-gray-700">顯示站點:</label>
        <select 
          v-model="selectedStations" 
          @change="updateChart"
          multiple
          class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48"
        >
          <option v-for="station in availableStations" :key="station" :value="station">
            {{ station }}
          </option>
        </select>
      </div>
      
      <!-- 點大小控制 -->
      <div class="flex items-center space-x-2">
        <label class="text-sm font-medium text-gray-700">點大小:</label>
        <input 
          v-model.number="pointSize" 
          @input="updateChart"
          type="range" 
          min="2" 
          max="8" 
          step="1"
          class="w-20"
        >
        <span class="text-xs text-gray-500">{{ pointSize }}px</span>
      </div>
      
      <!-- 透明度控制 -->
      <div class="flex items-center space-x-2">
        <label class="text-sm font-medium text-gray-700">透明度:</label>
        <input 
          v-model.number="pointOpacity" 
          @input="updateChart"
          type="range" 
          min="0.1" 
          max="1" 
          step="0.1"
          class="w-20"
        >
        <span class="text-xs text-gray-500">{{ (pointOpacity * 100).toFixed(0) }}%</span>
      </div>
    </div>
    
    <!-- 圖表容器 -->
    <div 
      v-show="!loading" 
      class="w-full border border-gray-200 rounded-lg bg-white shadow-sm"
      ref="chartContainer"
      :style="{ height: chartHeight + 'px' }"
    ></div>
    
    <!-- 載入指示器 -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="text-gray-500">載入中...</div>
    </div>
    
    <!-- 統計資訊 -->
    <div v-if="statisticsInfo" class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-blue-50 p-3 rounded-lg">
        <div class="text-xs text-blue-600 font-medium">總資料點數</div>
        <div class="text-lg font-bold text-blue-800">{{ statisticsInfo.totalPoints }}</div>
      </div>
      <div class="bg-green-50 p-3 rounded-lg">
        <div class="text-xs text-green-600 font-medium">平均良率</div>
        <div class="text-lg font-bold text-green-800">{{ statisticsInfo.avgYield }}%</div>
      </div>
      <div class="bg-yellow-50 p-3 rounded-lg">
        <div class="text-xs text-yellow-600 font-medium">良率範圍</div>
        <div class="text-lg font-bold text-yellow-800">{{ statisticsInfo.yieldRange }}</div>
      </div>
      <div class="bg-purple-50 p-3 rounded-lg">
        <div class="text-xs text-purple-600 font-medium">時間跨度</div>
        <div class="text-lg font-bold text-purple-800">{{ statisticsInfo.timeSpan }}</div>
      </div>
    </div>
    
    <!-- 圖例 -->
    <div class="mt-4 p-4 bg-gray-50 rounded-lg border">
      <!-- 圖例控制面板 -->
      <div class="flex flex-wrap items-center justify-between mb-3">
        <div class="text-sm font-medium text-gray-700">圖例設定:</div>
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <input 
              id="showLegend" 
              type="checkbox" 
              v-model="showLegend"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="showLegend" class="text-sm text-gray-600">顯示圖例</label>
          </div>
          
          <div v-if="showLegend" class="flex items-center space-x-2">
            <label class="text-sm text-gray-600">位置:</label>
            <select 
              v-model="legendPosition" 
              class="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bottom">下方</option>
              <option value="top">上方</option>
              <option value="right">右側</option>
              <option value="left">左側</option>
            </select>
          </div>
          
          <div v-if="showLegend" class="flex items-center space-x-2">
            <label class="text-sm text-gray-600">樣式:</label>
            <select 
              v-model="legendStyle" 
              class="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="horizontal">水平</option>
              <option value="vertical">垂直</option>
              <option value="grid">網格</option>
            </select>
          </div>
          
          <div v-if="showLegend" class="flex items-center space-x-2">
            <label class="text-sm text-gray-600">圖示大小:</label>
            <input 
              v-model.number="legendIconSize" 
              type="range" 
              min="8" 
              max="20" 
              step="2"
              class="w-16"
            >
            <span class="text-xs text-gray-500">{{ legendIconSize }}px</span>
          </div>
        </div>
      </div>
      
      <!-- 圖例顯示區域 -->
      <div v-if="showLegend" :class="legendContainerClasses">
        <div 
          v-for="station in legendStations" 
          :key="station"
          :class="legendItemClasses"
          @click="toggleStationVisibility(station)"
          :style="{ opacity: hiddenStations.includes(station) ? 0.4 : 1 }"
        >
          <div 
            class="rounded-full cursor-pointer transition-all duration-200 hover:scale-110"
            :style="{ 
              width: legendIconSize + 'px', 
              height: legendIconSize + 'px',
              backgroundColor: getStationColor(station),
              border: hiddenStations.includes(station) ? '2px solid #ef4444' : '2px solid transparent'
            }"
          ></div>
          <span 
            class="text-sm text-gray-700 cursor-pointer select-none"
            :class="{ 'line-through text-gray-400': hiddenStations.includes(station) }"
          >
            {{ station }}
          </span>
          <span class="text-xs text-gray-500">
            ({{ getStationPointCount(station) }})
          </span>
        </div>
      </div>
      
      <!-- 圖例操作按鈕 -->
      <div v-if="showLegend" class="mt-3 pt-3 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="text-xs text-gray-500">
            點擊站點名稱以隱藏/顯示對應數據點
          </div>
          <div class="flex space-x-2">
            <button 
              @click="showAllStations"
              class="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              全部顯示
            </button>
            <button 
              @click="hideAllStations"
              class="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              全部隱藏
            </button>
            <button 
              @click="resetLegendSettings"
              class="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              重置設定
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  // 圖表資料
  data: {
    type: Array,
    required: true,
    default: () => []
  },
  // 圖表標題
  title: {
    type: String,
    default: '良率散點圖分析'
  },
  // 圖表高度
  chartHeight: {
    type: Number,
    default: 500
  },
  // 邊距設定
  margin: {
    type: Object,
    default: () => ({
      top: 20,
      right: 30,
      bottom: 60,
      left: 60
    })
  }
})

const emit = defineEmits(['point-click', 'point-hover'])

// 響應式變數
const chartContainer = ref(null)
const loading = ref(false)
const timeRange = ref('24h')
const selectedStations = ref([])
const pointSize = ref(3)
const pointOpacity = ref(0.7)

// 圖例相關設定
const showLegend = ref(true)
const legendPosition = ref('bottom')
const legendStyle = ref('horizontal')
const legendIconSize = ref(12)
const hiddenStations = ref([])

// 計算屬性
const availableStations = computed(() => {
  if (!props.data || props.data.length === 0) return []
  return [...new Set(props.data.map(d => d.station))].sort()
})

const filteredData = computed(() => {
  if (!props.data || props.data.length === 0) return []
  
  let filtered = props.data
  
  // 時間過濾
  const now = new Date()
  let timeThreshold
  
  switch (timeRange.value) {
    case '24h':
      timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    default:
      timeThreshold = new Date(0)
  }
  
  filtered = filtered.filter(d => new Date(d.timestamp) >= timeThreshold)
  
  // 站點過濾
  if (selectedStations.value.length > 0) {
    filtered = filtered.filter(d => selectedStations.value.includes(d.station))
  }
  
  // 隱藏站點過濾
  filtered = filtered.filter(d => !hiddenStations.value.includes(d.station))
  
  // 過濾有效的良率數據
  filtered = filtered.filter(d => {
    const yieldValue = typeof d.yield === 'number' ? d.yield : parseFloat(d.yield)
    return !isNaN(yieldValue) && yieldValue !== null && yieldValue !== undefined
  })
  
  return filtered.map(d => ({
    ...d,
    timestamp: new Date(d.timestamp),
    yield: typeof d.yield === 'number' ? d.yield : parseFloat(d.yield)
  }))
})

// 圖例相關計算屬性
const legendStations = computed(() => {
  return selectedStations.value.filter(station => {
    return props.data.some(d => d.station === station)
  })
})

const legendContainerClasses = computed(() => {
  const baseClasses = 'flex gap-3'
  
  switch (legendStyle.value) {
    case 'vertical':
      return `${baseClasses} flex-col`
    case 'grid':
      return `${baseClasses} flex-wrap max-w-full`
    case 'horizontal':
    default:
      return `${baseClasses} flex-wrap`
  }
})

const legendItemClasses = computed(() => {
  const baseClasses = 'flex items-center space-x-2 cursor-pointer transition-all duration-200 hover:bg-gray-100 rounded px-2 py-1'
  
  switch (legendStyle.value) {
    case 'vertical':
      return `${baseClasses} w-full justify-start`
    case 'grid':
      return `${baseClasses} min-w-max`
    case 'horizontal':
    default:
      return `${baseClasses} min-w-max`
  }
})

const statisticsInfo = computed(() => {
  if (!filteredData.value || filteredData.value.length === 0) return null
  
  const yields = filteredData.value.map(d => d.yield)
  const timestamps = filteredData.value.map(d => d.timestamp)
  
  const avgYield = d3.mean(yields)
  const minYield = d3.min(yields)
  const maxYield = d3.max(yields)
  const minTime = d3.min(timestamps)
  const maxTime = d3.max(timestamps)
  
  const timeDiff = maxTime - minTime
  const hours = Math.floor(timeDiff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  let timeSpanText = ''
  if (days > 0) {
    timeSpanText = `${days}天${hours % 24}小時`
  } else {
    timeSpanText = `${hours}小時`
  }
  
  return {
    totalPoints: filteredData.value.length,
    avgYield: avgYield.toFixed(1),
    yieldRange: `${minYield.toFixed(1)}% - ${maxYield.toFixed(1)}%`,
    timeSpan: timeSpanText
  }
})

// 圖表相關變數
let svg = null
let xScale = null
let yScale = null
let colorScale = null

// 顏色比例尺
const getStationColor = (station) => {
  if (!colorScale) {
    colorScale = d3.scaleOrdinal()
      .domain(availableStations.value)
      .range(d3.schemeCategory10)
  }
  return colorScale(station)
}

// 圖例相關方法
const getStationPointCount = (station) => {
  return props.data.filter(d => d.station === station).length
}

const toggleStationVisibility = (station) => {
  const index = hiddenStations.value.indexOf(station)
  if (index > -1) {
    hiddenStations.value.splice(index, 1)
  } else {
    hiddenStations.value.push(station)
  }
  updateChart()
}

const showAllStations = () => {
  hiddenStations.value = []
  updateChart()
}

const hideAllStations = () => {
  hiddenStations.value = [...selectedStations.value]
  updateChart()
}

const resetLegendSettings = () => {
  showLegend.value = true
  legendPosition.value = 'bottom'
  legendStyle.value = 'horizontal'
  legendIconSize.value = 12
  hiddenStations.value = []
  updateChart()
}

// 初始化圖表
const initChart = () => {
  if (!chartContainer.value || filteredData.value.length === 0) return

  // 清空現有內容
  d3.select(chartContainer.value).selectAll("*").remove()

  const containerWidth = chartContainer.value.clientWidth
  const width = containerWidth - props.margin.left - props.margin.right
  const height = props.chartHeight - props.margin.top - props.margin.bottom

  svg = d3.select(chartContainer.value)
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", props.chartHeight)

  const g = svg.append("g")
    .attr("transform", `translate(${props.margin.left},${props.margin.top})`)

  // 設定比例尺
  const timeExtent = d3.extent(filteredData.value, d => d.timestamp)
  const yieldExtent = d3.extent(filteredData.value, d => d.yield)
  
  xScale = d3.scaleTime()
    .domain(timeExtent)
    .range([0, width])

  yScale = d3.scaleLinear()
    .domain([
      Math.max(0, yieldExtent[0] - 2),
      Math.min(100, yieldExtent[1] + 2)
    ])
    .range([height, 0])

  // 初始化顏色比例尺
  colorScale = d3.scaleOrdinal()
    .domain(availableStations.value)
    .range(d3.schemeCategory10)

  // 添加格線
  const xGrid = d3.axisBottom(xScale)
    .tickSize(-height)
    .tickFormat("")
    .ticks(timeRange.value === '24h' ? d3.timeHour.every(2) : 
           timeRange.value === '7d' ? d3.timeHour.every(12) : d3.timeDay.every(1))

  const yGrid = d3.axisLeft(yScale)
    .tickSize(-width)
    .tickFormat("")
    .ticks(10)

  g.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(xGrid)
    .selectAll("line")
    .style("stroke", "#e0e0e0")
    .style("stroke-width", 0.5)

  g.append("g")
    .attr("class", "grid")
    .call(yGrid)
    .selectAll("line")
    .style("stroke", "#e0e0e0")
    .style("stroke-width", 0.5)

  // 添加軸
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d3.timeFormat(timeRange.value === '24h' ? "%H:%M" : 
                              timeRange.value === '7d' ? "%m/%d %H:%M" : "%m/%d"))
    .ticks(timeRange.value === '24h' ? d3.timeHour.every(3) : 
           timeRange.value === '7d' ? d3.timeHour.every(24) : d3.timeDay.every(2))

  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => `${d}%`)

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", timeRange.value !== '24h' ? "rotate(-45)" : "")
    .style("font-size", "11px")

  g.append("g")
    .attr("class", "y-axis")
    .call(yAxis)
    .selectAll("text")
    .style("font-size", "11px")

  // 添加軸標籤
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - props.margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .text("良率 (%)")

  g.append("text")
    .attr("transform", `translate(${width / 2}, ${height + props.margin.bottom - 5})`)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .text("時間")

  // 繪製散點
  drawScatterPoints(g)
}

// 繪製散點
const drawScatterPoints = (g) => {
  // 創建 tooltip
  const tooltip = d3.select("body")
    .selectAll(".scatter-tooltip")
    .data([0])
    .enter()
    .append("div")
    .attr("class", "scatter-tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("z-index", "1000")

  // 按站點分組繪製點
  const stationGroups = g.selectAll(".station-points")
    .data(d3.group(filteredData.value, d => d.station))
    .enter()
    .append("g")
    .attr("class", "station-points")

  stationGroups.each(function(stationData) {
    const station = stationData[0]
    const points = stationData[1]
    
    // 跳過隱藏的站點
    if (hiddenStations.value.includes(station)) {
      return
    }
    
    d3.select(this)
      .selectAll(".data-point")
      .data(points)
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("cx", d => xScale(d.timestamp))
      .attr("cy", d => yScale(d.yield))
      .attr("r", pointSize.value)
      .attr("fill", getStationColor(station))
      .attr("fill-opacity", pointOpacity.value)
      .attr("stroke", getStationColor(station))
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", pointSize.value + 2)
          .attr("fill-opacity", 1)
          .attr("stroke-width", 2)
        
        tooltip
          .style("visibility", "visible")
          .html(`
            <div><strong>站點:</strong> ${d.station}</div>
            <div><strong>良率:</strong> ${d.yield.toFixed(2)}%</div>
            <div><strong>時間:</strong> ${d3.timeFormat("%Y-%m-%d %H:%M")(d.timestamp)}</div>
            <div><strong>狀態:</strong> ${d.status || 'N/A'}</div>
          `)
        
        emit('point-hover', d)
      })
      .on("mousemove", function(event) {
        tooltip
          .style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px")
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", pointSize.value)
          .attr("fill-opacity", pointOpacity.value)
          .attr("stroke-width", 0.5)
        
        tooltip.style("visibility", "hidden")
      })
      .on("click", function(event, d) {
        emit('point-click', d)
      })
  })
}

// 更新圖表
const updateChart = () => {
  nextTick(() => {
    initChart()
  })
}

// 初始化選中的站點
const initSelectedStations = () => {
  if (availableStations.value.length > 0) {
    selectedStations.value = availableStations.value.slice(0, Math.min(5, availableStations.value.length))
  }
}

// 監聽數據變化
watch(() => props.data, () => {
  updateChart()
}, { deep: true })

watch(availableStations, () => {
  if (selectedStations.value.length === 0) {
    initSelectedStations()
  }
})

// 監聽圖例設定變化
watch([showLegend, legendPosition, legendStyle, legendIconSize], () => {
  // 圖例樣式變化不需要重新繪製圖表，只需要響應式更新
})

watch(hiddenStations, () => {
  updateChart()
}, { deep: true })

// 組件掛載
onMounted(() => {
  initSelectedStations()
  nextTick(() => {
    initChart()
  })
  
  // 響應式調整
  const resizeObserver = new ResizeObserver(() => {
    updateChart()
  })
  if (chartContainer.value) {
    resizeObserver.observe(chartContainer.value)
  }
  
  onBeforeUnmount(() => {
    resizeObserver.disconnect()
    // 清除 tooltip
    d3.select("body").selectAll(".scatter-tooltip").remove()
  })
})

onBeforeUnmount(() => {
  // 清除 tooltip
  d3.select("body").selectAll(".scatter-tooltip").remove()
})
</script>

<style scoped>
.data-point {
  transition: all 0.2s ease;
}

.grid line {
  shape-rendering: crispEdges;
}

.axis text {
  font-family: Arial, sans-serif;
}

.axis path,
.axis line {
  fill: none;
  stroke: #333;
  shape-rendering: crispEdges;
}

/* 圖例樣式 */
.legend-item {
  transition: all 0.2s ease;
}

.legend-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.legend-icon {
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.legend-icon:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 隱藏站點的視覺效果 */
.hidden-station {
  opacity: 0.4;
  text-decoration: line-through;
}

.hidden-station .legend-icon {
  filter: grayscale(50%);
  border: 2px solid #ef4444 !important;
}

/* 控制按鈕樣式 */
button {
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 選擇器樣式改進 */
select {
  transition: all 0.2s ease;
}

select:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

/* 滑塊樣式 */
input[type="range"] {
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: #2563eb;
  transform: scale(1.1);
}

input[type="range"]::-webkit-slider-track {
  background: #e5e7eb;
  height: 4px;
  border-radius: 2px;
}
</style>
