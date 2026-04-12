<template>
  <div class="w-full h-full flex flex-col">
    <div ref="chartContainer"
      class="overflow-x-auto overflow-y-auto flex-grow relative scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
      <!-- SVG 將在這裡渲染 -->
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  time: {
    type: Array,
    default: () => [
      { year: 2025, month: 7 },
      { year: 2025, month: 8 }
    ]
  },
  width: {
    type: Number,
    default: 1000
  },
  height: {
    type: Number,
    default: 500
  },
  showMembers: {
    type: Boolean,
    default: false
  }
})

const chartContainer = ref(null)
const svgWidth = ref(0)
const containerWidth = ref(0)
const zoomLevel = ref(1)
const baseWidth = ref(0)

// 縮放控制函數
const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value * 1.2, 3)
  redrawWithZoom()
}

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value / 1.2, 0.5)
  redrawWithZoom()
}

const resetZoom = () => {
  zoomLevel.value = 1
  redrawWithZoom()
}

const redrawWithZoom = () => {
  const zoomedWidth = baseWidth.value * zoomLevel.value
  console.log('重新繪製圖表，寬度:', zoomedWidth)
  drawChart(zoomedWidth)
}

const drawChart = (customWidth) => {
  // 清空容器
  const container = chartContainer.value
  if (!container) return
  container.innerHTML = ''

  // 設定任務條相關尺寸變數
  const barHeight = 20
  const taskRowHeight = 60 // 增加行高以容納人員資訊
  const barSpacing = 4
  const taskY_offset = (taskRowHeight - barHeight * 2 - barSpacing) / 2

  // 獲取所有任務，支援多專案結構
  let allTasks = []

  Object.entries(props.data).forEach(([projectName, projectData]) => {
    Object.entries(projectData).forEach(([category, tasks]) => {
      if (!Array.isArray(tasks)) {
        console.warn(`專案 "${projectName}" 類別 "${category}" 的任務不是數組`)
        return
      }
      
      tasks.forEach((task) => {
        allTasks.push({
          ...task,
          project: projectName,
          category,
          planned: task.planned || { start: task.start, end: task.end },
          actual: task.actual || { start: task.start, end: task.end },
          members: task.members || [],
          priority: task.priority || 'medium'
        })
      })
    })
  })

  // 確保所有任務都有有效的開始和結束日期
  allTasks = allTasks.filter((task) => {
    const hasPlanned = task.planned && task.planned.start && task.planned.end
    const hasActual = task.actual && task.actual.start && task.actual.end
    const hasLegacy = task.start && task.end

    if (!hasPlanned && !hasActual && !hasLegacy) {
      console.warn(`任務 "${task.content}" 缺少開始或結束日期`)
      return false
    }
    return true
  })

  // 排序任務
  allTasks.sort((a, b) => {
    const aStartDate = a.planned ? new Date(a.planned.start) : new Date(a.start)
    const bStartDate = b.planned ? new Date(b.planned.start) : new Date(b.start)
    return aStartDate - bStartDate
  })

  // 設置時間範圍
  const startDate = new Date(props.time[0].year, props.time[0].month - 1, 1)
  const endDate = new Date(
    props.time[props.time.length - 1].year,
    props.time[props.time.length - 1].month,
    0
  )

  // 計算實際需要的寬度
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  const dayWidth = 20
  const calculatedWidth = Math.max(totalDays * dayWidth + 200, 1000)

  const containerClientWidth = container.clientWidth
  const effectiveWidth = Math.max(
    calculatedWidth,
    customWidth || props.width || 1000,
    containerClientWidth * 1.5
  )

  // 創建SVG
  const svg = d3.select(chartContainer.value).append('svg')
  svg
    .attr('width', effectiveWidth)
    .attr('height', props.height)
    .style('min-width', `${effectiveWidth}px`)

  const margin = { top: 50, right: 30, bottom: 30, left: 150 } // 增加左邊距以容納專案名稱
  const width = effectiveWidth - margin.left - margin.right
  const height = props.height - margin.top - margin.bottom

  // 添加Y軸線
  svg
    .append('line')
    .attr('x1', margin.left)
    .attr('x2', margin.left)
    .attr('y1', margin.top)
    .attr('y2', props.height)
    .attr('stroke', '#e2e8f0')
    .attr('stroke-width', 1)

  // 建立時間比例尺
  const xScale = d3
    .scaleTime()
    .domain([startDate, endDate])
    .range([margin.left, width + margin.left])

  // 繪製月份標籤和背景
  const months = d3.timeMonths(startDate, d3.timeMonth.offset(endDate, 1))

  // 獲取專案和類別
  const projectCategories = []
  Object.entries(props.data).forEach(([projectName, projectData]) => {
    Object.keys(projectData).forEach(category => {
      projectCategories.push({ project: projectName, category })
    })
  })

  const testColor = [
    '#F0A6A5', '#9799D9', '#FFBD5F', '#A2D6C6',
    '#A8D5BA', '#FFD166', '#EF476F', '#118AB2'
  ]

  // 確保有足夠的顏色
  while (testColor.length < projectCategories.length) {
    testColor.push(testColor[testColor.length % 8])
  }

  // 在 SVG 定義中添加漸變
  const defs = svg.append('defs')

  // 為每個類別創建漸變
  projectCategories.forEach((item, i) => {
    // 實際任務的漸變
    const actualGradient = defs.append('linearGradient')
      .attr('id', `actual-gradient-${i}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%')

    actualGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d3.color(testColor[i]).darker(0.2))

    actualGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', testColor[i])

    // 預估任務的漸變
    const plannedGradient = defs.append('linearGradient')
      .attr('id', `planned-gradient-${i}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%')

    plannedGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d3.color(testColor[i]).brighter(0.5))

    plannedGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', d3.color(testColor[i]).brighter(0.2))
  })

  // 繪製月份背景
  months.forEach((month, i) => {
    const monthStart = xScale(month)
    const nextMonth = d3.timeMonth.offset(month, 1)
    const monthEnd = xScale(nextMonth > endDate ? endDate : nextMonth)

    // 月份背景
    svg
      .append('rect')
      .attr('x', monthStart)
      .attr('y', 0)
      .attr('width', monthEnd - monthStart)
      .attr('height', margin.top / 2)
      .attr('fill', i % 2 === 0 ? '#e6f2ff' : '#d1e6ff')
      .attr('stroke', '#b3d1ff')
      .attr('stroke-width', 0.5)

    // 月份名稱
    const monthLabelX = monthStart + (monthEnd - monthStart) / 2
    const monthLabelWidth = d3.timeFormat('%Y-%m')(month).length * 8
    const isLabelOverflowing = monthLabelX + monthLabelWidth / 2 > width + margin.left - 10

    if (monthEnd - monthStart > 40) {
      svg
        .append('text')
        .attr('x', isLabelOverflowing ? width + margin.left - monthLabelWidth / 2 - 10 : monthLabelX)
        .attr('y', margin.top / 4 - 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', '#2c5282')
        .style('opacity', isLabelOverflowing ? 0.5 : 1)
        .text(function () {
          if (isLabelOverflowing && i === months.length - 1) {
            return d3.timeFormat('%Y-%m')(month).split('-')[0] + '-'
          }
          const monthFormat = i === 0 || month.getMonth() === 0
            ? d3.timeFormat('%Y-%m')
            : d3.timeFormat('%m')
          return monthFormat(month)
        })
    }
  })

  // 繪製週標籤
  const weeks = d3.timeWeeks(startDate, d3.timeDay.offset(endDate, 1))

  weeks.forEach((week, i) => {
    const weekStart = xScale(week)
    const nextWeek = d3.timeWeek.offset(week, 1)
    const weekEnd = xScale(nextWeek > endDate ? endDate : nextWeek)

    // 週背景
    svg
      .append('rect')
      .attr('x', weekStart)
      .attr('y', margin.top / 2)
      .attr('width', weekEnd - weekStart)
      .attr('height', margin.top / 2)
      .attr('fill', i % 2 === 0 ? '#f8fafc' : '#f1f5f9')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 0.5)

    // 週標籤
    const weekLabelX = weekStart + (weekEnd - weekStart) / 2
    const isLabelOverflowing = weekLabelX > width + margin.left - 20

    svg
      .append('text')
      .attr('x', weekLabelX)
      .attr('y', margin.top * 0.75 - 5)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#4a5568')
      .style('opacity', isLabelOverflowing ? 0 : 1)
      .text(`W${d3.timeFormat('%U')(week)}`)

    // 週開始日期
    const isDateOverflowing = weekStart + 4 > width + margin.left - 30

    svg
      .append('text')
      .attr('x', weekStart + 4)
      .attr('y', margin.top * 0.75 + 8)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '9px')
      .style('fill', '#718096')
      .style('opacity', isDateOverflowing ? 0 : 1)
      .text(d3.timeFormat('%m/%d')(week))
  })

  // 繪製日期分隔線
  const days = d3.timeDays(startDate, d3.timeDay.offset(endDate, 1))

  days.forEach((day) => {
    const dayX = xScale(day)

    svg
      .append('line')
      .attr('x1', dayX)
      .attr('x2', dayX)
      .attr('y1', margin.top)
      .attr('y2', height + margin.top)
      .attr('stroke', day.getDay() === 0 || day.getDay() === 6 ? '#cbd5e0' : '#e2e8f0')
      .attr('stroke-width', day.getDay() === 0 || day.getDay() === 6 ? 1 : 0.5)
      .attr('stroke-dasharray', day.getDay() === 0 || day.getDay() === 6 ? '3,3' : null)
      .attr('class', 'day-line')

    // 標記週末
    if (day.getDay() === 0 || day.getDay() === 6) {
      const nextDay = d3.timeDay.offset(day, 1)
      const dayWidth = xScale(nextDay) - dayX

      svg
        .append('rect')
        .attr('x', dayX)
        .attr('y', margin.top)
        .attr('width', dayWidth)
        .attr('height', height)
        .attr('fill', '#f7fafc')
        .attr('opacity', 0.3)
        .attr('class', 'weekend-rect')
    }
  })

  // 繪製專案和任務
  let currentY = margin.top

  projectCategories.forEach((item, categoryIndex) => {
    const { project: projectName, category: categoryName } = item
    const categoryY = currentY

    // 獲取該專案類別的任務
    const categoryTasks = allTasks.filter((task) => 
      task.project === projectName && task.category === categoryName
    )

    if (categoryTasks.length === 0) return

    // 計算任務行位置
    const taskRows = []
    const sortedTasks = [...categoryTasks].sort((a, b) => 
      new Date(a.planned.start) - new Date(b.planned.start)
    )

    sortedTasks.forEach((task) => {
      const rowIndex = taskRows.length
      if (!taskRows[rowIndex]) {
        taskRows[rowIndex] = []
      }
      taskRows[rowIndex].push(task)
      task.rowIndex = rowIndex
    })

    const rowCount = taskRows.length || 1
    const categoryHeight = Math.max(80, rowCount * taskRowHeight + 20)

    // 繪製專案背景
    svg
      .append('rect')
      .attr('x', 0)
      .attr('y', categoryY)
      .attr('width', margin.left - 5)
      .attr('height', categoryHeight)
      .attr('fill', testColor[categoryIndex])
      .attr('rx', 6)
      .attr('ry', 6)

    // 添加左側裝飾條
    svg
      .append('rect')
      .attr('x', 0)
      .attr('y', categoryY)
      .attr('width', 8)
      .attr('height', categoryHeight)
      .attr('fill', '#fff')
      .attr('opacity', 0.3)

    // 繪製專案名稱
    svg
      .append('text')
      .attr('x', margin.left / 2)
      .attr('y', categoryY + 20)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#fff')
      .style('text-shadow', '0px 1px 2px rgba(0,0,0,0.3)')
      .text(projectName)

    // 繪製類別名稱
    svg
      .append('text')
      .attr('x', margin.left / 2)
      .attr('y', categoryY + 35)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '10px')
      .style('fill', '#fff')
      .style('opacity', 0.9)
      .text(categoryName)

    // 繪製該類別的任務
    categoryTasks.forEach((task, taskIndex) => {
      const plannedStartX = xScale(new Date(task.planned?.start || task.start))
      const plannedEndX = xScale(new Date(task.planned?.end || task.end))
      const actualStartX = xScale(new Date(task.actual?.start || task.start))
      const actualEndX = xScale(new Date(task.actual?.end || task.end))

      const taskY = categoryY + task.rowIndex * taskRowHeight + taskY_offset

      // 繪製預估時程（虛線）
      if (plannedStartX !== actualStartX || plannedEndX !== actualEndX) {
        svg
          .append('rect')
          .attr('x', plannedStartX)
          .attr('y', taskY)
          .attr('width', plannedEndX - plannedStartX)
          .attr('height', barHeight)
          .attr('fill', 'url(#planned-gradient-' + categoryIndex + ')')
          .attr('stroke', testColor[categoryIndex])
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .attr('rx', 3)
          .attr('ry', 3)
      }

      // 繪製實際時程
      svg
        .append('rect')
        .attr('x', actualStartX)
        .attr('y', taskY)
        .attr('width', actualEndX - actualStartX)
        .attr('height', barHeight)
        .attr('fill', 'url(#actual-gradient-' + categoryIndex + ')')
        .attr('stroke', testColor[categoryIndex])
        .attr('stroke-width', 1)
        .attr('rx', 3)
        .attr('ry', 3)

      // 繪製任務名稱
      svg
        .append('text')
        .attr('x', actualStartX + 5)
        .attr('y', taskY + barHeight / 2)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', '#fff')
        .style('text-shadow', '0px 1px 2px rgba(0,0,0,0.5)')
        .text(task.content)

      // 繪製人員資訊（如果啟用）
      if (props.showMembers && task.members && task.members.length > 0) {
        const membersText = task.members.join(', ')
        svg
          .append('text')
          .attr('x', actualStartX + 5)
          .attr('y', taskY + barHeight + 12)
          .attr('dominant-baseline', 'middle')
          .style('font-size', '9px')
          .style('fill', '#666')
          .text(membersText)
      }

      // 繪製優先級標記
      if (task.priority === 'high') {
        svg
          .append('circle')
          .attr('cx', actualStartX - 8)
          .attr('cy', taskY + barHeight / 2)
          .attr('r', 4)
          .attr('fill', '#ef4444')
      }
    })

    currentY += categoryHeight + 10
  })

  // 繪製今日線
  const today = new Date()
  if (today >= startDate && today <= endDate) {
    const todayX = xScale(today)
    
    svg
      .append('line')
      .attr('x1', todayX)
      .attr('x2', todayX)
      .attr('y1', margin.top)
      .attr('y2', height + margin.top)
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')

    // 今日標籤
    svg
      .append('text')
      .attr('x', todayX + 5)
      .attr('y', margin.top - 5)
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#10b981')
      .text('今日')
  }

  // 更新所有相關元素的高度
  svg.selectAll('.day-line').attr('y2', currentY)
  svg.selectAll('.weekend-rect').attr('height', currentY - margin.top)
}

// 監聽數據變化
watch(() => props.data, () => {
  drawChart()
}, { deep: true })

watch(() => props.time, () => {
  drawChart()
}, { deep: true })

watch(() => props.width, () => {
  drawChart()
})

watch(() => props.height, () => {
  drawChart()
})

// 組件掛載
onMounted(() => {
  baseWidth.value = props.width
  drawChart()
})

// 組件卸載
onUnmounted(() => {
  // 清理資源
})
</script>

<style scoped>
/* 自訂樣式 */
:deep(svg) {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
}
</style>
