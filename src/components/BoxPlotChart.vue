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
    default: '站點良率分布圖'
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
      right: 550,  // 增加右邊距到550px
      bottom: 60,
      left: 60     // 進一步減少左邊距到60px
    })
  },
  // 圖例類型 - 可以是預設類型或數據屬性名稱
  legendType: {
    type: String,
    default: 'status', // 預設顯示站點圖例
    // 移除 validator，允許任意屬性名稱
  },
  // 是否啟用圖例高亮功能
  enableLegendHighlight: {
    type: Boolean,
    default: true
  },
  // 站點排序順序
  stationOrder: {
    type: Array,
    default: () => []
  },
  // 自定義顏色配置
  customColors: {
    type: Object,
    default: () => ({})
  },
  // 指定需要閃爍的 Legend 項目
  blinkingLegends: {
    type: Array,
    default: () => []
  },
  // 圖例排序順序
  legendOrder: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['data-click', 'tooltip-show', 'tooltip-hide'])

// 響應式變數
const chartContainer = ref(null)
const loading = ref(false)

// 控制面板設定
const showBoxplot = ref(false)

// 計算屬性
const legendStations = computed(() => {
  if (!props.data || props.data.length === 0) return []
  
  let items = []
  
  switch (props.legendType) {
    case 'yield':
      // 根據良率範圍分組
      const yieldRanges = ['0-60%', '60-80%', '80-90%', '90-100%']
      items = yieldRanges.filter(range => {
        const [min, max] = range.split('-').map(r => parseFloat(r.replace('%', '')))
        return props.data.some(d => {
          const yieldValue = d.yield * 100 // 轉換為百分比
          return max === 100 ? (yieldValue >= min && yieldValue <= max) : (yieldValue >= min && yieldValue < max)
        })
      })
      break
    case 'time':
      // 顯示時間範圍
      const timePoints = [...new Set(props.data.map(d => d.timestamp))].sort()
      items = timePoints.slice(0, 8) // 最多顯示8個時間點
      break
    case 'none':
      return []
    default:
      // 檢查是否為數據中的屬性名稱
      const sampleData = props.data[0]
      if (sampleData && sampleData.hasOwnProperty(props.legendType)) {
        // 如果是有效的屬性名稱，返回該屬性的所有不同值
        const uniqueValues = [...new Set(props.data.map(d => d[props.legendType]))]
          .filter(value => value !== null && value !== undefined)
        items = uniqueValues
      } else {
        // 否則默認使用站點
        items = [...new Set(props.data.map(d => d.station))]
      }
  }
  
  // 應用自定義排序
  if (props.legendOrder.length > 0) {
    items = items.sort((a, b) => {
      const aIndex = props.legendOrder.indexOf(a)
      const bIndex = props.legendOrder.indexOf(b)
      
      // 如果項目在排序列表中，按照列表順序排列
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      // 如果其中一個在列表中，將其排在前面
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      // 如果都不在列表中，按字母順序排列
      return String(a).localeCompare(String(b))
    })
  } else {
    // 如果沒有提供排序，使用默認排序
    items = items.sort((a, b) => String(a).localeCompare(String(b)))
  }
  
  return items
})

const colorScale = computed(() => {
  const items = legendStations.value
  let colorRange = []
  
  switch (props.legendType) {
    case 'yield':
      // 良率範圍用不同的綠色系
      colorRange = ['#ef4444', '#f59e0b', '#eab308', '#22c55e'] // 紅->橙->黃->綠
      break
    case 'time':
      // 時間用藍色系漸變 - 修正：確保不會越界
      const n = Math.min(9, Math.max(3, items.length))
      colorRange = d3.schemeBlues[n] || d3.schemeTableau10
      break
    case 'none':
      colorRange = ['#6b7280'] // 灰色
      break
    default:
      // 為任意屬性提供豐富的顏色選擇 - 修正：防止越界
      if (items.length <= 6) {
        colorRange = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']
      } else if (items.length <= 10) {
        // 使用 Tableau10（10 色）
        colorRange = d3.schemeTableau10
      } else {
        // 對於更多項目，使用動態生成的色彩
        colorRange = d3.quantize(t => d3.interpolateTurbo(t), items.length)
      }
  }
  
  // 應用自定義顏色覆蓋
  if (Object.keys(props.customColors).length > 0) {
    colorRange = items.map(item => {
      return props.customColors[item] || colorRange[items.indexOf(item)] || '#6b7280'
    })
  }
  
  const scale = d3.scaleOrdinal()
    .domain(items)
    .range(colorRange)
  return scale
})

// 獲取數據點顏色的函數
const getPointColor = (dataPoint) => {
  
  
  switch (props.legendType) {
    case 'yield':
      // 根據良率值決定顏色（將 0-1 轉換為百分比）
      const yieldValue = dataPoint.yield * 100
      let yieldRange = '90-100%'
      if (yieldValue < 60) yieldRange = '0-60%'
      else if (yieldValue < 80) yieldRange = '60-80%'
      else if (yieldValue < 90) yieldRange = '80-90%'
      const color = colorScale.value(yieldRange)
      
      return color
    case 'time':
      const timeColor = colorScale.value(dataPoint.timestamp)
      
      return timeColor
    case 'none':
      return '#6b7280' // 灰色
    default:
      // 檢查是否為數據中的屬性名稱
      const sampleData = props.data?.[0] // 添加安全檢查
      if (sampleData && sampleData.hasOwnProperty(props.legendType)) {
        const attrColor = colorScale.value(dataPoint[props.legendType])
        
        return attrColor
      }
      // 默認使用站點
      const stationColor = colorScale.value(dataPoint.station)
      
      return stationColor
  }
}

// 圖表相關變數
let svg = null
let xScale = null
let yScale = null
let stationScaleMap = new Map() // 統一管理每個站點的良率比例尺

// 圖例相關函數
const getLegendTitle = () => {
  switch (props.legendType) {
    case 'station':
      return '站點'
    case 'yield':
      return '良率範圍'
    case 'time':
      return '時間點'
    case 'none':
      return ''
    default:
      // 檢查是否為數據中的屬性名稱
      const sampleData = props.data?.[0]
      if (sampleData && sampleData.hasOwnProperty(props.legendType)) {
        // 將屬性名稱轉換為更友好的顯示名稱
        const propertyDisplayNames = {
          station: '站點',
          yield: '良率',
          timestamp: '時間戳',
          type: '類型',
          category: '分類',
          status: 'Status',
          level: '等級',
          priority: '優先級',
          department: '部門',
          team: '團隊',
          project: '專案',
          phase: '階段'
        }
        return propertyDisplayNames[props.legendType] || props.legendType
      }
      return '站點' // 預設
  }
}

const formatLegendLabel = (item) => {
  switch (props.legendType) {
    case 'station':
      return item
    case 'yield':
      return item
    case 'time':
      // 直接返回原始時間，不做格式轉換
      return item
    case 'none':
      return item
    default:
      return item
  }
}

// 時間解析函數 - 修正：回傳 null 而非當前時間，避免污染數據
const parseTime = (timeInput) => {
  try {
    // 如果已經是 Date 物件，檢查有效性
    if (timeInput instanceof Date) {
      return isNaN(timeInput.getTime()) ? null : timeInput
    }
    
    // 嘗試用 Date 構造函數解析
    const result = new Date(timeInput)
    
    if (!isNaN(result.getTime())) {
      return result
    } else {
      console.error('❌ Invalid date format:', timeInput)
      return null // 回傳 null 而非當前時間
    }
  } catch (error) {
    console.error('❌ Error parsing time:', timeInput, error)
    return null // 回傳 null 而非當前時間
  }
}

// 初始化圖表
const initChart = () => {
  
  if (!chartContainer.value) {
    console.log('❌ No chart container found')
    return
  }
  
  // 完全清空現有內容並重置變數
  d3.select(chartContainer.value).selectAll("*").remove()
  svg = null
  xScale = null
  yScale = null
  stationScaleMap.clear() // 清空 station scale map

  const containerWidth = chartContainer.value.clientWidth
  const width = containerWidth - props.margin.left - props.margin.right
  const height = props.chartHeight - props.margin.top - props.margin.bottom

  // 創建新的 SVG
  svg = d3.select(chartContainer.value)
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", props.chartHeight)

  const g = svg.append("g")
    .attr("transform", `translate(${props.margin.left},${props.margin.top})`)

  // 設定比例尺
  if (props.data.length === 0) {
    console.log('❌ No data to display')
    return
  }



  // X軸：時間 (處理 "2025/08/24 09" 格式) - 修正：過濾無效時間
  const safeTimes = props.data
    .map(d => ({ ...d, _parsedTime: parseTime(d.timestamp) }))
    .filter(d => d._parsedTime !== null) // 過濾無效時間
  
  if (safeTimes.length === 0) {
    console.log('❌ No valid timestamps found')
    return
  }
  
  const timeExtent = d3.extent(safeTimes, d => d._parsedTime)
  
  
  xScale = d3.scaleTime()
    .domain(timeExtent)
    .range([0, width])
    

  // Y軸：站點 (Core, Bu, OST, BDT, FLI, BUMP, CC, WPG, VI 等)
  const allStations = [...new Set(props.data.map(d => d.station))]
  
  // 根據 stationOrder prop 進行排序
  const stations = props.stationOrder.length > 0 
    ? allStations.sort((a, b) => {
        const aIndex = props.stationOrder.indexOf(a)
        const bIndex = props.stationOrder.indexOf(b)
        
        // 如果站點名稱在排序列表中，按照列表順序排列
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex
        }
        // 如果其中一個在列表中，將其排在前面
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        // 如果都不在列表中，按字母順序排列
        return a.localeCompare(b)
      })
    : allStations.sort() // 如果沒有提供順序，使用字母排序
  

  
  yScale = d3.scaleBand()
    .domain(stations)
    .range([0, height])
    .padding(0.2) // 減少站點間的間距，讓圖表更緊湊
    

  // 🎯 統一建立每個站點的良率比例尺（避免重複計算）
  stationScaleMap.clear()
  stations.forEach(station => {
    const stationY = yScale(station)
    const stationHeight = yScale.bandwidth()
    
    // 獲取該站點的數據
    const stationData = props.data.filter(d => d.station === station)
    if (stationData.length === 0) return
    
    // 計算該站點的良率範圍
    const stationYieldValues = stationData.map(d => d.yield * 100).sort(ascending)
    const stationYieldMin = stationYieldValues[0]
    const stationYieldMax = stationYieldValues[stationYieldValues.length - 1]
    const stationYieldRange = stationYieldMax - stationYieldMin
    const stationYieldMargin = Math.max(stationYieldRange * 0.1, 1) // 至少1%邊距

    const stationYieldDomainMin = Math.max(0, stationYieldMin - stationYieldMargin)
    const stationYieldDomainMax = Math.min(100, stationYieldMax + stationYieldMargin)
    
    // 創建該站點的良率比例尺並存入 Map
    const stationYieldScale = d3.scaleLinear()
      .domain([stationYieldDomainMin, stationYieldDomainMax])
      .range([stationY + stationHeight, stationY]) // 在站點內，良率越高越往上
    
    stationScaleMap.set(station, {
      scale: stationYieldScale,
      domainMin: stationYieldDomainMin,
      domainMax: stationYieldDomainMax
    })
  })

  // 為每個站點添加背景區域，讓站點更明顯分隔
  stations.forEach((station, index) => {
    const stationY = yScale(station)
    const stationHeight = yScale.bandwidth()
    
    // 為每個站點添加背景色 - 使用更柔和的漸變背景
    g.append("rect")
      .attr("class", "station-background")
      .attr("x", 0)
      .attr("y", stationY)
      .attr("width", width)
      .attr("height", stationHeight)
      .attr("fill", index % 2 === 0 ? "rgba(248, 250, 252, 0.8)" : "rgba(241, 245, 249, 0.8)")
      .attr("stroke", "rgba(203, 213, 225, 0.3)")
      .attr("stroke-width", 1)
      .attr("rx", 4) // 圓角
    
    // 中心參考線 - 使用更細膩的虛線
    const centerY = stationY + stationHeight / 2
    g.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", centerY)
      .attr("y2", centerY)
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4") // 更明顯的虛線
      .attr("opacity", 0.5)
  })

  // 添加軸
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d3.timeFormat("%Y/%m/%d %H")) // 使用年月日格式
    // .ticks(Math.min(6, Math.floor(width / 120))) // 減少刻度數量，避免擁擠
    

  const yAxis = d3.axisLeft(yScale)

  const xAxisGroup = g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    
  // 美化 X 軸樣式
  xAxisGroup.selectAll("text")
    .style("text-anchor", "end")
    .style("font-size", "10px")
    .style("fill", "#4b5563")
    .style("font-weight", "500")
    .attr("transform", "rotate(-50)")
    .attr("dx", "-0.8em")
    .attr("dy", "0.15em")
    
  xAxisGroup.select(".domain")
    .style("stroke", "#6b7280")
    .style("stroke-width", "1px")
    
  xAxisGroup.selectAll(".tick line")
    .style("stroke", "#9ca3af")
    .style("stroke-width", "1px")

  // 不顯示默認的Y軸，我們將手動添加站點標籤
  // g.append("g")
  //   .attr("class", "y-axis")
  //   .call(yAxis)
  //   .selectAll("text")
  //   .style("font-size", "12px")
  //   .style("font-weight", "600")

  // 手動添加美化的站點標籤
  stations.forEach((station, index) => {
    const stationY = yScale(station)
    const stationHeight = yScale.bandwidth()
    
    // 在每個站點區域添加背景標籤框
    g.append("rect")
      .attr("class", "station-label-bg")
      .attr("x", -props.margin.left + 10)
      .attr("y", stationY ) // 調整垂直位置
      .attr("width", props.margin.left - 25)
      .attr("height", stationHeight ) // 調整高度
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", index % 2 === 0 ? "rgba(59, 130, 246, 0.08)" : "rgba(230, 230, 246, 0.12)")
      .attr("stroke", "rgba(59, 130, 246, 0.15)")
      .attr("stroke-width", 1)
    
    // 站點名稱文字
    g.append("text")
      .attr("class", "station-label-text")
      .attr("x", -props.margin.left + (props.margin.left - 50) / 2) // 標籤背景的中心
      .attr("y", stationY + stationHeight / 2) // 垂直居中
      .attr("dy", "0.35em") // 微調垂直對齊
      .style("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "600")
      .style("fill", "#1e40af")
      .style("font-family", "Arial, sans-serif")
      .text(station)
  })

  // 添加站點之間的分隔線，更加明顯
  stations.forEach((station, index) => {
    if (index > 0) {
      const separatorY = yScale(station) - yScale.padding() * yScale.step() / 2
      g.append("line")
        .attr("class", "station-separator")
        .attr("x1", -props.margin.left + 15) // 從左邊距開始
        .attr("x2", width + 15) // 延伸到右邊
        .attr("y1", separatorY)
        .attr("y2", separatorY)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 2)
        // .attr("opacity", 0.4)
        // .attr("stroke-dasharray", "2,3") // 虛線分隔
    }
  })

  // 添加軸標籤
  // 站點標籤 - 放在左上角
  // g.append("text")
  //   .attr("x", -props.margin.left + 15)
  //   .attr("y", -15)
  //   .attr("dy", "0.5em")
  //   .style("text-anchor", "start")
  //   .style("font-size", "14px")
  //   .style("font-weight", "600")
  //   .style("fill", "#374151")
  //   .text("站點")

  // 良率標籤 - 保持在左側（垂直旋轉）
  // g.append("text")
  //   .attr("transform", "rotate(-90)")
  //   .attr("y", 0 - props.margin.left + 45)
  //   .attr("x", 0 - (height / 2))
  //   .attr("dy", "1em")
  //   .style("text-anchor", "middle")
  //   .style("font-size", "14px")
  //   .style("font-weight", "600")
  //   .style("fill", "#374151")
  //   .text("Yield (%)")

  // 時間標籤 - 保持在底部
  // g.append("text")
  //   .attr("transform", `translate(${width / 2}, ${height + props.margin.bottom - 10})`)
  //   .style("text-anchor", "middle")
  //   .style("font-size", "14px")
  //   .style("font-weight", "600")
  //   .style("fill", "#374151")
  //   .text("Time")

  // 為每個站點創建獨立的良率軸與比例尺 - 修正：使用統一的 stationScaleMap
  stations.forEach((station, index) => {
    // 從 Map 中獲取該站點的比例尺資訊
    const scaleInfo = stationScaleMap.get(station)
    if (!scaleInfo) return
    
    const { scale: stationYieldScale, domainMin, domainMax } = scaleInfo
    
    // 獲取該站點的高度
    const stationHeight = yScale.bandwidth()
    
    // 在該站點左側繪製獨立的良率軸
    const stationYieldAxis = d3.axisLeft(stationYieldScale)
      .tickFormat(d => `${d.toFixed(1)}%`) // 改為小數點第一位
      .ticks(Math.min(5, Math.ceil(stationHeight / 20))) // 根據站點高度調整刻度數量
    
    const stationYieldAxisGroup = g.append("g")
      .attr("class", `station-yield-axis-${station.replace(/\s+/g, '-')}`)
      .attr("transform", `translate(-15, 0)`) // 稍微往左偏移，避免與Y軸重疊
      .call(stationYieldAxis)
    
    // 調整該站點良率軸標籤樣式
    stationYieldAxisGroup.selectAll("text")
      .style("font-size", "10.5px")
      .style("fill", "#4b5563")
      .style("font-weight", "500")
    
    // 調整該站點良率軸線條樣式
    stationYieldAxisGroup.select(".domain")
      .style("stroke", "#6b7280")
      .style("stroke-width", "1px")
    
    stationYieldAxisGroup.selectAll(".tick line")
      .style("stroke", "#6b7280")
      .style("stroke-width", "1px")
      .style("stroke-dasharray", "2,2") // 刻度線也使用虛線
    
    // 為該站點添加良率網格線（虛線）
    const stationYieldTicks = stationYieldScale.ticks(Math.min(4, Math.ceil(stationHeight / 25))) // 減少網格線數量
    stationYieldTicks.forEach(tickValue => {
      const gridY = stationYieldScale(tickValue)
      g.append("line")
        .attr("class", `station-yield-grid-${station.replace(/\s+/g, '-')}`)
        .attr("x1", -15)
        .attr("x2", width)
        .attr("y1", gridY)
        .attr("y2", gridY)
        .attr("stroke", "#e2e8f0") // 更淺的顏色
        .attr("stroke-width", 0.8)
        .attr("stroke-dasharray", "2,4") // 更細膩的虛線
        .attr("opacity", 0.4)
    })
    

  })

  // 繪製數據點
  drawDataPoints(g)
  
  // 繪製圖例
  drawLegend(g, width)
}

// 繪製數據點
const drawDataPoints = (g) => {

  
  if (!g) {
    console.log('❌ Missing required parameters for drawDataPoints')
    return
  }
  
  // 為每個站點創建容器
  const stationData = d3.group(props.data, d => d.station)
  

  
  // 獲取圖表尺寸
  const containerWidth = chartContainer.value.clientWidth
  const width = containerWidth - props.margin.left - props.margin.right
  
  stationData.forEach((stationPoints, stationName) => {
    
    // 從統一的 Map 中獲取該站點的比例尺資訊
    const scaleInfo = stationScaleMap.get(stationName)
    if (!scaleInfo) {
      console.log(`❌ No scale info for station ${stationName}`)
      return
    }
    
    const { scale: stationYieldScale, domainMin: stationYieldDomainMin, domainMax: stationYieldDomainMax } = scaleInfo
    
    // 按時間戳分組數據以繪製 boxplot
    const timeGroupedData = d3.group(stationPoints, d => d.timestamp)
    
    // 繪製每個時間點的 boxplot（如果用戶選擇顯示）
    if (showBoxplot.value) {
      timeGroupedData.forEach((timePoints, timestamp) => {
        try {
          const parsedTime = parseTime(timestamp)
          const x = xScale(parsedTime)
          
          if (isNaN(x)) {
            console.log(`❌ Invalid x coordinate for timestamp ${timestamp}`)
            return
          }
          
          // 計算該時間點所有數據的統計值（轉換為百分比）
          const yields = timePoints.map(d => d.yield * 100).sort(d3.ascending)
          const stats = calculateBoxplotStats(yields)
          
          
          // 繪製 boxplot
          drawBoxplot(g, x, stationYieldScale, stats, stationName, timestamp)
          
        } catch (error) {
          console.error(`❌ Error processing boxplot for ${stationName} at ${timestamp}:`, error)
        }
      })
    }
    
    // 為該站點的每個數據點繪製散點圖
    stationPoints.forEach((d, index) => {
      try {
        const parsedTime = parseTime(d.timestamp)
        
        // 如果時間解析失敗，跳過此數據點
        if (parsedTime === null) {
          console.log(`⚠️ Skipping point with invalid timestamp: ${d.timestamp}`)
          return
        }
        
        const x = xScale(parsedTime)
        
        // Y位置：使用該站點的獨立良率比例尺定位（將 0-1 轉換為百分比）
        const y = stationYieldScale(d.yield * 100)
        
        
        if (isNaN(x) || isNaN(y)) {
          console.log(`❌ Invalid coordinates for point: x=${x}, y=${y}`)
          return
        }
        
        // 為同時間點的數據點稍微偏移X位置，避免重疊
        const timePoints = stationPoints.filter(point => point.timestamp === d.timestamp)
        const timePointIndex = timePoints.indexOf(d)
        const pointOffset = (timePointIndex - (timePoints.length - 1) / 2) * 2 // 每個點偏移2px
        const finalX = x + pointOffset
        
        
        // 確保顏色是有效的
        let pointColor = getPointColor(d)
        if (!pointColor || pointColor === 'undefined') {
          console.error('❌ Invalid color for point:', d, 'Using fallback color')
          pointColor = '#3b82f6' // 使用藍色作為備用
        }
        
        const circle = g.append("circle")
          .attr("class", () => {
            // 根據圖例類型決定類名
            let legendValue = ''
            switch (props.legendType) {
              case 'yield':
                const yieldValue = d.yield * 100
                if (yieldValue < 60) legendValue = '0-60%'
                else if (yieldValue < 80) legendValue = '60-80%'
                else if (yieldValue < 90) legendValue = '80-90%'
                else legendValue = '90-100%'
                break
              case 'time':
                legendValue = d.timestamp
                break
              case 'none':
                legendValue = 'none'
                break
              default:
                const sampleData = props.data?.[0]
                if (sampleData && sampleData.hasOwnProperty(props.legendType)) {
                  legendValue = d[props.legendType]
                } else {
                  legendValue = d.station
                }
            }
            // 簡單的字符串清理，替代 CSS.escape
            const cleanValue = String(legendValue).replace(/[^a-zA-Z0-9]/g, '_')
            return `data-point legend-${cleanValue}`
          })
          .attr("cx", finalX)
          .attr("cy", y)
          .attr("r", 4) // 再次增大散點
          .attr("fill", pointColor)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2)
          .attr("opacity", 0.9)
          .style("cursor", "pointer")
          .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))")
          .on("click", () => emit('data-click', d))
          .on("mouseover", function(event) {
            d3.select(this)
              .attr("r", 7) // 懸停時放大
              .attr("opacity", 1)
              .attr("stroke-width", 3)
              .style("filter", "drop-shadow(0 3px 6px rgba(0,0,0,0.25))")
            // 🎯 發射 tooltip-show 事件，而不是直接創建 tooltip
            const containerRect = chartContainer.value.getBoundingClientRect()
            const yieldPercent = d.yield * 100
            const stationYieldPercentile = ((yieldPercent - stationYieldDomainMin) / (stationYieldDomainMax - stationYieldDomainMin) * 100).toFixed(1)
            // 直接使用原始時間戳，不做格式轉換
            const displayTime = d.timestamp
            
            emit('tooltip-show', {
              position: {
                x: containerRect.left + finalX + props.margin.left,
                y: containerRect.top + y + props.margin.top
              },
              data: {
                station: d.station,
                yield: (Number(d.yield) * 100).toFixed(1), // 修正：格式化為一位小數
                lotnum: d.raw.lotnum,
                layerName: d.raw.layer || d.raw.layerName || d.raw.LayerName, // ✅ 添加 layerName
                // position: stationYieldPercentile,
                timestamp: displayTime,
                partNumber: d.raw.part_number,
                color: pointColor,
                status: d.status || 'unknown',
                raw: d.raw || null,
                extra: `點擊查看詳細資訊`
              }
            })
          })
          .on("mouseout", function() {
            const currentCircle = d3.select(this)
            currentCircle
              .attr("r", 4)
              .attr("opacity", 0.9)
              .attr("stroke-width", 2)
              .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))")
            
            // 🎯 發射 tooltip-hide 事件
            emit('tooltip-hide')
            
            // 如果這個元素應該閃爍，重新啟動閃爍動畫
            if (currentCircle.property('shouldBlink')) {
              const blinkFunction = currentCircle.property('blinkFunction')
              if (blinkFunction) {
                blinkFunction()
              }
            }
          })

        // 檢查是否需要閃爍效果 - 在添加 title 之前
        let shouldBlink = false
        let checkValue = ''
        
        switch (props.legendType) {
          case 'yield':
            const yieldValue = d.yield * 100
            if (yieldValue < 60) checkValue = '0-60%'
            else if (yieldValue < 80) checkValue = '60-80%'
            else if (yieldValue < 90) checkValue = '80-90%'
            else checkValue = '90-100%'
            break
          case 'time':
            checkValue = d.timestamp
            break
          case 'none':
            checkValue = 'none'
            break
          default:
            const sampleData = props.data?.[0]
            if (sampleData && sampleData.hasOwnProperty(props.legendType)) {
              checkValue = d[props.legendType]
            } else {
              checkValue = d.station
            }
        }
        
        shouldBlink = props.blinkingLegends.includes(checkValue)
        
        if (shouldBlink) {
          
          // 將閃爍狀態存儲到 circle 元素上
          circle.property('shouldBlink', true)
          
          // 使用 D3 transition 創建持續的閃爍動畫
          function startBlink() {
            // 檢查是否還應該閃爍（防止無限循環）
            if (!circle.property('shouldBlink')) return
            
            circle
              .transition()
              .duration(600)
              .attr("fill", "#ff0000")
              .attr("r", 5)
              .attr("stroke-width", 2)
              .attr("stroke","#ffea00")//黃色
              .transition()
              .duration(600)
              .attr("fill", "#ff0001") // 使用原始顏色
              .attr("r", 4)
              .attr("stroke-width", 2)
              .attr("stroke","#ffea00")//黃色
              .on("end", startBlink) // 重複動畫
          }
          
          // 將閃爍函數存儲到 circle 元素上
          circle.property('blinkFunction', startBlink)
          
          startBlink()
        }

        // 最後添加 title
        // circle.append("title")
          // .text(`${d.station}: ${(d.yield * 100).toFixed(1)}%`)

      } catch (error) {
        console.error(`❌ Error creating point for ${d.station}:`, error)
      }
    })
  })
  
}

// 繪製圖例
const drawLegend = (g, width) => {
  if (legendStations.value.length === 0) return
  
  const legendX = width + 10 // 圖例起始X位置，更靠近圖表
  const legendY = 20 // 圖例起始Y位置
  const itemHeight = 24 // 每個圖例項目的高度，再次增加間距
  const dotSize = 8 // 圖例點的大小
  
  // 創建圖例容器
  const legend = g.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${legendX}, ${legendY})`)
  
  // 添加圖例標題
  legend.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("dy", "0.35em")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .style("fill", "#374151")
    .text(getLegendTitle())
  
  // 添加圖例項目
  const legendItems = legend.selectAll(".legend-item")
    .data(legendStations.value)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${(i + 1) * itemHeight + 10})`)
    .style("cursor", "pointer")
    // .on("mouseover", function(event, d) {
    //   // 背景高亮
    //   d3.select(this).select("rect")
    //     .transition()
    //     .duration(200)
    //     .attr("opacity", 0.15)
      
    //   // 如果啟用圖例高亮功能
    //   if (props.enableLegendHighlight) {
    //     // 簡單的字符串清理，替代 CSS.escape
    //     const legendValue = String(d).replace(/[^a-zA-Z0-9]/g, '_')
        
    //     // 讓相同類別的點高亮，其他變透明，但完全跳過正在閃爍的點
    //     g.selectAll('.data-point')
    //       .filter(function() {
    //         // 只選擇非閃爍的點
    //         return !d3.select(this).property('shouldBlink')
    //       })
    //       .transition()
    //       .duration(300)
    //       .style("opacity", function() {
    //         const hasClass = d3.select(this).attr("class").includes(`legend-${legendValue}`)
    //         return hasClass ? 1 : 0.2
    //       })
    //       .style("filter", function() {
    //         const hasClass = d3.select(this).attr("class").includes(`legend-${legendValue}`)
    //         return hasClass ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" : "drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
    //       })
    //   }
    // })
    // .on("mouseout", function() {
    //   // 背景恢復
    //   d3.select(this).select("rect")
    //     .transition()
    //     .duration(200)
    //     .attr("opacity", 0)
      
    //   // 如果啟用圖例高亮功能，恢復所有點的透明度，但完全跳過正在閃爍的點
    //   if (props.enableLegendHighlight) {
    //     g.selectAll('.data-point')
    //       .filter(function() {
    //         // 只選擇非閃爍的點
    //         return !d3.select(this).property('shouldBlink')
    //       })
    //       .transition()
    //       .duration(300)
    //       .style("opacity", 0.9)
    //       .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))")
    //   }
    // })
  
  // 添加懸停背景
  legendItems.append("rect")
    .attr("x", -5)
    .attr("y", -10)
    .attr("width", 300)  // 大幅增加背景寬度到300px
    .attr("height", itemHeight - 2)
    .attr("rx", 4)
    .attr("fill", "#f3f4f6")
    .attr("opacity", 0)
    .style("transition", "opacity 0.3s ease")
  
  // 添加顏色圓點
  const circles = legendItems.append("circle")
    .attr("cx", dotSize / 2)
    .attr("cy", 0)
    .attr("r", dotSize / 2)
    .attr("fill", d => colorScale.value(d))
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1)
    .style("transition", "transform 0.2s ease")
  
  // 為指定的 Legend 項目添加樣式
  circles.each(function(d) {
    if (props.blinkingLegends.includes(d)) {
      d3.select(this)
        .attr("fill", "#ff0000") // 深紅色內層
        .attr("stroke", "#FFD700") // 黃色外層
        .attr("stroke-width", 3)
        .attr("class", "blinking-legend")
    }
  })
  
  // 為圓點添加懸停動畫（僅當沒有啟用高亮功能時）
  if (!props.enableLegendHighlight) {
    legendItems.selectAll("circle")
      .on("mouseover", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", dotSize / 2 + 1)
          .attr("stroke-width", 2)
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", dotSize / 2)
          .attr("stroke-width", 1)
      })
  }
  
  // 添加標籤文字
  const textElements = legendItems.append("text")
    .attr("x", dotSize + 8)
    .attr("y", 0)
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .style("font-weight", "500")
    .style("fill", "#374151")
    .text(d => {
      const label = formatLegendLabel(d)
      // 大幅增加允許的標籤長度到30字符
      return label.length > 30 ? label.substring(0, 30) + '...' : label
    })
  
  // 為文字添加 title 屬性用於顯示完整文字
  textElements.each(function(d) {
    const fullLabel = formatLegendLabel(d)
    if (fullLabel.length > 30) {
      d3.select(this).append("title").text(fullLabel)
    }
  })
  
  // 添加分隔線
  legend.append("line")
    .attr("x1", 0)
    .attr("x2", 280)  // 大幅增加分隔線寬度到280px
    .attr("y1", (legendStations.value.length + 1) * itemHeight + 20)
    .attr("y2", (legendStations.value.length + 1) * itemHeight + 20)
    .attr("stroke", "#e5e7eb")
    .attr("stroke-width", 1)
  
  // 添加軸說明
  const axisInfoY = (legendStations.value.length + 2) * itemHeight + 25
  const axisInfo = legend.append("g")
    .attr("class", "axis-info")
    .attr("transform", `translate(0, ${axisInfoY})`)
  
  // X軸說明
  axisInfo.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .style("font-size", "10px")
    .style("fill", "#6b7280")
    .text("X軸：時間")
  
  // Y軸說明
  axisInfo.append("text")
    .attr("x", 0)
    .attr("y", 15)
    .style("font-size", "10px")
    .style("fill", "#6b7280")
    .text("Y軸：站點（良率分布）")
  
  // 盒鬚圖說明
  if (showBoxplot.value) {
    axisInfo.append("text")
      .attr("x", 0)
      .attr("y", 30)
      .style("font-size", "10px")
      .style("fill", "#6b7280")
      .text("包含盒鬚圖統計")
  }
}

// 計算 boxplot 統計值 - 修正：使用 d3.quantileSorted 獲得更準確的分位數
const calculateBoxplotStats = (values) => {
  if (!values || values.length === 0) return null
  
  const sorted = values.slice().sort(ascending)
  const n = sorted.length
  
  // 使用 d3.quantileSorted 計算分位數
  const q1 = quantileSorted(sorted, 0.25)
  const median = quantileSorted(sorted, 0.5)
  const q3 = quantileSorted(sorted, 0.75)
  
  const iqr = q3 - q1
  const lowerFence = q1 - 1.5 * iqr
  const upperFence = q3 + 1.5 * iqr
  
  // 找到實際的最小值和最大值（在fence範圍內）
  const min = Math.max(sorted[0], lowerFence)
  const max = Math.min(sorted[n - 1], upperFence)
  
  // 找出離群值
  const outliers = sorted.filter(v => v < lowerFence || v > upperFence)
  
  return {
    min,
    q1,
    median,
    q3,
    max,
    outliers,
    count: n
  }
}

// 繪製單個 boxplot
const drawBoxplot = (g, x, yieldScale, stats, stationName, timestamp) => {
  if (!stats) return
  
  const boxWidth = 12 // boxplot 的寬度
  const whiskerWidth = 8 // 鬚線的寬度
  
  // 計算 Y 座標
  const minY = yieldScale(stats.min)
  const q1Y = yieldScale(stats.q1)
  const medianY = yieldScale(stats.median)
  const q3Y = yieldScale(stats.q3)
  const maxY = yieldScale(stats.max)
  
  // 創建 boxplot 群組
  const boxplotGroup = g.append("g")
    .attr("class", "boxplot")
    .style("cursor", "pointer")
    .on("click", () => {
      // 點擊 boxplot 顯示統計資訊
      emit('data-click', {
        type: 'boxplot',
        station: stationName,
        timestamp,
        stats,
        summary: `統計摘要\n站點: ${stationName}\n時間: ${timestamp}\n樣本數: ${stats.count}\nMin: ${stats.min.toFixed(1)}%\nQ1: ${stats.q1.toFixed(1)}%\nMedian: ${stats.median.toFixed(1)}%\nQ3: ${stats.q3.toFixed(1)}%\nMax: ${stats.max.toFixed(1)}%${stats.outliers.length > 0 ? `\n離群值: ${stats.outliers.length}個` : ''}`
      })
    })
  
  // 繪製垂直線 (whiskers)
  // 上鬚線：Q3 到 Max
  boxplotGroup.append("line")
    .attr("class", "whisker-top")
    .attr("x1", x)
    .attr("x2", x)
    .attr("y1", q3Y)
    .attr("y2", maxY)
    .attr("stroke", "#374151")
    .attr("stroke-width", 1.5)
  
  // 下鬚線：Q1 到 Min
  boxplotGroup.append("line")
    .attr("class", "whisker-bottom")
    .attr("x1", x)
    .attr("x2", x)
    .attr("y1", q1Y)
    .attr("y2", minY)
    .attr("stroke", "#374151")
    .attr("stroke-width", 1.5)
  
  // 繪製盒子 (Q1 到 Q3)
  boxplotGroup.append("rect")
    .attr("class", "box")
    .attr("x", x - boxWidth / 2)
    .attr("y", q3Y)
    .attr("width", boxWidth)
    .attr("height", q1Y - q3Y)
    .attr("fill", "rgba(59, 130, 246, 0.3)")
    .attr("stroke", "#374151")
    .attr("stroke-width", 1.5)
  
  // 繪製中位數線
  boxplotGroup.append("line")
    .attr("class", "median")
    .attr("x1", x - boxWidth / 2)
    .attr("x2", x + boxWidth / 2)
    .attr("y1", medianY)
    .attr("y2", medianY)
    .attr("stroke", "#dc2626")
    .attr("stroke-width", 2)
  
  // 繪製端點線
  // 上端點
  boxplotGroup.append("line")
    .attr("class", "whisker-cap-top")
    .attr("x1", x - whiskerWidth / 2)
    .attr("x2", x + whiskerWidth / 2)
    .attr("y1", maxY)
    .attr("y2", maxY)
    .attr("stroke", "#374151")
    .attr("stroke-width", 1.5)
  
  // 下端點
  boxplotGroup.append("line")
    .attr("class", "whisker-cap-bottom")
    .attr("x1", x - whiskerWidth / 2)
    .attr("x2", x + whiskerWidth / 2)
    .attr("y1", minY)
    .attr("y2", minY)
    .attr("stroke", "#374151")
    .attr("stroke-width", 1.5)
  
  // 繪製離群值
  stats.outliers.forEach(outlier => {
    const outlierY = yieldScale(outlier)
    boxplotGroup.append("circle")
      .attr("class", "outlier")
      .attr("cx", x)
      .attr("cy", outlierY)
      .attr("r", 2)
      .attr("fill", "#ef4444")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .append("title")
      .text(`離群值: ${outlier.toFixed(1)}%`)
  })
  
  // 添加懸停效果
  boxplotGroup
    .on("mouseover", function() {
      d3.select(this).select(".box")
        .attr("fill", "rgba(59, 130, 246, 0.5)")
        .attr("stroke-width", 2)
      
      // 顯示統計提示
      const tooltip = g.append("g")
        .attr("class", "boxplot-tooltip")
        .attr("transform", `translate(${x + 20}, ${medianY - 30})`)
      
      const tooltipText = `統計摘要\n樣本數: ${stats.count}\nMin: ${stats.min.toFixed(1)}%\nQ1: ${stats.q1.toFixed(1)}%\nMedian: ${stats.median.toFixed(1)}%\nQ3: ${stats.q3.toFixed(1)}%\nMax: ${stats.max.toFixed(1)}%`
      const lines = tooltipText.split('\n')
      
      const rect = tooltip.append("rect")
        .attr("fill", "rgba(0,0,0,0.9)")
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("stroke", "#374151")
        .attr("stroke-width", 1)
      
      const textGroup = tooltip.append("g")
      lines.forEach((line, i) => {
        textGroup.append("text")
          .attr("fill", "white")
          .attr("font-size", "10px")
          .attr("dy", `${(i + 1) * 1.2}em`)
          .attr("dx", "0.5em")
          .text(line)
      })
      
      const bbox = textGroup.node().getBBox()
      rect.attr("width", bbox.width + 12)
        .attr("height", bbox.height + 8)
    })
    .on("mouseout", function() {
      d3.select(this).select(".box")
        .attr("fill", "rgba(59, 130, 246, 0.3)")
        .attr("stroke-width", 1.5)
      g.select(".boxplot-tooltip").remove()
    })
}

// 更新圖表
const updateChart = () => {
  if (props.data.length === 0) {
    console.log('❌ No data to update chart')
    return
  }
  nextTick(() => {
    initChart()
  })
}

// 監聽數據變化 - 修正：移除 deep，假設父組件整批替換數據
watch(() => props.data, (newData, oldData) => {

  updateChart()
}, { immediate: false }) // 改為 false，避免重複渲染

// 組件掛載
onMounted(() => {
  nextTick(() => {
    // 只有在有數據時才初始化圖表
    if (props.data && props.data.length > 0) {
      initChart()
    }
  })
  
  // 響應式調整
  const resizeObserver = new ResizeObserver(() => {
    // 只有在有數據時才更新圖表
    if (props.data && props.data.length > 0) {
      updateChart()
    }
  })
  if (chartContainer.value) {
    resizeObserver.observe(chartContainer.value)
  }
  
  onBeforeUnmount(() => {
    resizeObserver.disconnect()
  })
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

/* Y 軸刻度線樣式增強 */
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
