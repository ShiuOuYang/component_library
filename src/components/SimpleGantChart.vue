<template>
  <div class="w-full h-full flex flex-col">
    <div ref="chartContainer"
      class="overflow-x-auto overflow-y-auto flex-grow relative scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
      <!-- SVG 將在這裡渲染 -->
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
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

const drawChart = () => {
  // 清空容器
  const container = chartContainer.value
  if (!container) return
  container.innerHTML = ''

  // 設定任務條相關尺寸變數
  const barHeight = 20
  const taskRowHeight = 60
  const margin = { top: 50, right: 30, bottom: 30, left: 150 }

  // 獲取所有任務
  let allTasks = []
  Object.entries(props.data).forEach(([projectName, projectData]) => {
    Object.entries(projectData).forEach(([category, tasks]) => {
      if (Array.isArray(tasks)) {
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
      }
    })
  })

  if (allTasks.length === 0) {
    return
  }

  // 設置時間範圍
  const startDate = new Date(props.time[0].year, props.time[0].month - 1, 1)
  const endDate = new Date(
    props.time[props.time.length - 1].year,
    props.time[props.time.length - 1].month,
    0
  )

  // 計算寬度
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  const dayWidth = 20
  const calculatedWidth = Math.max(totalDays * dayWidth + 200, 1000)
  const effectiveWidth = Math.max(calculatedWidth, props.width || 1000)

  // 創建SVG
  const svg = d3.select(chartContainer.value).append('svg')
  svg
    .attr('width', effectiveWidth)
    .attr('height', props.height)
    .style('min-width', `${effectiveWidth}px`)

  const width = effectiveWidth - margin.left - margin.right
  const height = props.height - margin.top - margin.bottom

  // 建立時間比例尺
  const xScale = d3
    .scaleTime()
    .domain([startDate, endDate])
    .range([margin.left, width + margin.left])

  // 繪製時間軸標籤
  const months = d3.timeMonths(startDate, d3.timeMonth.offset(endDate, 1))
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
    if (monthEnd - monthStart > 40) {
      const monthLabelX = monthStart + (monthEnd - monthStart) / 2
      svg
        .append('text')
        .attr('x', monthLabelX)
        .attr('y', margin.top / 4 - 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#2c5282')
        .text(d3.timeFormat('%Y-%m')(month))
    }
  })

  // 繪製週別標籤
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
    svg
      .append('text')
      .attr('x', weekLabelX)
      .attr('y', margin.top * 0.75 - 5)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#4a5568')
      .text(`W${d3.timeFormat('%U')(week)}`)

    // 週開始日期
    svg
      .append('text')
      .attr('x', weekStart + 4)
      .attr('y', margin.top * 0.75 + 8)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '9px')
      .style('fill', '#718096')
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
      .attr('y2', props.height - margin.bottom)
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
        .attr('height', props.height - margin.top - margin.bottom)
        .attr('fill', '#f7fafc')
        .attr('opacity', 0.3)
        .attr('class', 'weekend-rect')
    }
  })

  // 添加Y軸線
  svg
    .append('line')
    .attr('x1', margin.left)
    .attr('x2', margin.left)
    .attr('y1', margin.top)
    .attr('y2', props.height - margin.bottom)
    .attr('stroke', '#e2e8f0')
    .attr('stroke-width', 1)

  // 顏色配置
  const colors = ['#F0A6A5', '#9799D9', '#FFBD5F', '#A2D6C6', '#A8D5BA', '#FFD166', '#EF476F', '#118AB2']

  // 繪製任務
  let currentY = margin.top
  const projectCategories = []
  
  Object.entries(props.data).forEach(([projectName, projectData]) => {
    Object.keys(projectData).forEach(category => {
      projectCategories.push({ project: projectName, category })
    })
  })

  projectCategories.forEach((item, categoryIndex) => {
    const { project: projectName, category: categoryName } = item
    const categoryY = currentY

    // 獲取該專案類別的任務
    const categoryTasks = allTasks.filter((task) => 
      task.project === projectName && task.category === categoryName
    )

    if (categoryTasks.length === 0) return

    const rowCount = categoryTasks.length || 1
    const categoryHeight = Math.max(80, rowCount * taskRowHeight + 20)

    // 繪製專案背景
    svg
      .append('rect')
      .attr('x', 0)
      .attr('y', categoryY)
      .attr('width', margin.left - 5)
      .attr('height', categoryHeight)
      .attr('fill', colors[categoryIndex % colors.length])
      .attr('rx', 6)
      .attr('ry', 6)

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

    // 繪製任務
    categoryTasks.forEach((task, taskIndex) => {
      const plannedStartX = xScale(new Date(task.planned.start))
      const plannedEndX = xScale(new Date(task.planned.end))
      const actualStartX = xScale(new Date(task.actual.start))
      const actualEndX = xScale(new Date(task.actual.end))
      const taskY = categoryY + taskIndex * taskRowHeight + 10

      // 繪製預估時程（虛線邊框，在上方）
      svg
        .append('rect')
        .attr('x', plannedStartX)
        .attr('y', taskY - 5)
        .attr('width', plannedEndX - plannedStartX)
        .attr('height', barHeight / 2)
        .attr('fill', 'transparent')
        .attr('stroke', d3.color(colors[categoryIndex % colors.length]).darker(0.5))
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('rx', 2)
        .attr('ry', 2)

      // 繪製實際時程（實心填充，在下方）
      svg
        .append('rect')
        .attr('x', actualStartX)
        .attr('y', taskY + barHeight / 2)
        .attr('width', actualEndX - actualStartX)
        .attr('height', barHeight / 2)
        .attr('fill', colors[categoryIndex % colors.length])
        .attr('stroke', d3.color(colors[categoryIndex % colors.length]).darker(0.3))
        .attr('stroke-width', 1)
        .attr('rx', 2)
        .attr('ry', 2)

      // 顯示實際完成日期
      const today = new Date()
      const taskEnd = new Date(task.actual.end)
      
      // 如果任務已完成，顯示完成日期
      if (today > taskEnd) {
        const completionDate = new Date(task.actual.end)
        const dateText = `${completionDate.getMonth() + 1}/${completionDate.getDate()}`
        
        svg
          .append('text')
          .attr('x', actualEndX + 5)
          .attr('y', taskY + barHeight / 2 + barHeight / 4)
          .attr('dominant-baseline', 'middle')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .style('fill', '#10b981')
          .text(`完成: ${dateText}`)
      }
      
      // 如果任務正在進行中，顯示預計完成日期
      else if (today >= new Date(task.actual.start) && today <= taskEnd) {
        const expectedDate = new Date(task.actual.end)
        const dateText = `${expectedDate.getMonth() + 1}/${expectedDate.getDate()}`
        
        svg
          .append('text')
          .attr('x', actualEndX + 5)
          .attr('y', taskY + barHeight / 2 + barHeight / 4)
          .attr('dominant-baseline', 'middle')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .style('fill', '#f59e0b')
          .text(`預計: ${dateText}`)
      }

      // 繪製任務名稱
      svg
        .append('text')
        .attr('x', actualStartX + 5)
        .attr('y', taskY + barHeight / 2 + barHeight / 4)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', '#fff')
        .style('text-shadow', '0px 1px 2px rgba(0,0,0,0.5)')
        .text(task.content)

      // 繪製人員資訊
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
      .attr('y2', currentY)
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

  // 更新 SVG 高度
  svg.attr('height', currentY + margin.bottom)
  
  // 更新日期分隔線和週末背景的高度
  svg.selectAll('.day-line').attr('y2', currentY)
  svg.selectAll('.weekend-rect').attr('height', currentY - margin.top)
  
  // 更新 Y 軸線高度
  svg.select('line').attr('y2', currentY)
}

// 監聽數據變化
watch(() => props.data, () => {
  drawChart()
}, { deep: true })

watch(() => props.time, () => {
  drawChart()
}, { deep: true })

// 組件掛載
onMounted(() => {
  drawChart()
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