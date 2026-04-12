<template>
    <!-- @wheel.prevent="handleWheel" -->
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
      default: () => ({
        UIUX討論: [
          {
            content: '基礎架構設計討論',
            start: '2024-12-01',
            end: '2024-12-05'
          },
          {
            content: '白名單架構設計討論',
            start: '2024-12-03',
            end: '2024-12-08'
          },
          {
            content: '測試',
            start: '2024-12-07',
            end: '2024-12-10'
          },
          {
            content: '後續架構設計討論',
            start: '2024-12-06',
            end: '2024-12-12'
          },
          {
            content: 'AOI介面設計討論',
            start: '2024-12-13',
            end: '2024-12-20'
          }
        ],
        Frontend: [
          {
            content: '登入介面開發',
            start: '2024-12-06',
            end: '2024-12-10'
          },
          {
            content: '白名單介面開發',
            start: '2024-12-06',
            end: '2024-12-10'
          },
          {
            content: '首頁介面開發',
            start: '2024-12-11',
            end: '2024-12-15'
          }
        ],
        Backend: [
          {
            content: '後端AOI API開發',
            start: '2024-12-11',
            end: '2024-12-15'
          },
          {
            content: '後端API開發',
            start: '2024-12-16',
            end: '2024-12-20'
          }
        ],
        QA: [
          {
            content: '交付測試',
            start: '2024-12-16',
            end: '2024-12-20'
          }
        ]
      })
    },
    time: {
      type: Array,
      default: () => [
        {
          year: 2024,
          month: 12
        },
        {
          year: 2025,
          month: 1
        },
        {
          year: 2025,
          month: 2
        }
      ]
    },
    width: {
      type: Number,
      default: 1000
    },
    height: {
      type: Number,
      default: 500
    }
  })
  
  const chartContainer = ref(null)
  const svgWidth = ref(0)
  const containerWidth = ref(0)
  const zoomLevel = ref(1)
  const baseWidth = ref(0) // 基礎寬度，用於縮放計算
  
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
  
  // 重新繪製圖表，應用縮放
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
    const barHeight = 14 // 任務條高度 (從 20 調整為 14)
    const taskRowHeight = 35 // 每行的高度 (從 50 調整為 35)
    const barSpacing = 3 // 上下任務條之間的間距 (從 4 調整為 3)
    const taskY_offset = (taskRowHeight - barHeight * 2 - barSpacing) / 2 // 第一個任務條與基準線的距離
  
    // 獲取所有任務
    let allTasks = []
  
    allTasks = Object.entries(props.data).flatMap(([category, tasks]) => {
      // 確保 tasks 是數組
      if (!Array.isArray(tasks)) {
        console.warn(`類別 "${category}" 的任務不是數組`)
        return []
      }
      return tasks.map((task) => {
        // 確保任務有 planned 和 actual 屬性，如果沒有則使用 start/end
        return {
          ...task,
          category,
          planned: task.planned || { start: task.start, end: task.end },
          actual: task.actual || { start: task.start, end: task.end }
        }
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
  
    // 排序任務 - 根據可用的日期屬性排序
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
    const dayWidth = 8 // 每天的寬度像素 (從 12 調整為 8)
    const calculatedWidth = Math.max(totalDays * dayWidth + 150, 600) // 確保最小寬度 (從 800 調整為 600)
  
    // 使用計算的寬度或自定義寬度，確保有足夠的空間
    const containerClientWidth = container.clientWidth
    const effectiveWidth = Math.max(
      calculatedWidth,
      customWidth || props.width || 600,
      containerClientWidth
    )
  
    // 創建SVG
    const svg = d3.select(chartContainer.value).append('svg')
    svg
      .attr('width', effectiveWidth)
      .attr('height', props.height)
      .style('min-width', `${effectiveWidth}px`) // 確保SVG不會被壓縮
  
    const margin = { top: 50, right: 30, bottom: 30, left: 100 }
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
  
    // 獲取類別和顏色
  
    const categoryObjects = Object.keys(props.data).map((category) => ({ name: category }))
  
    const categories = categoryObjects
    const testColor = [
      '#F0A6A5',
      '#9799D9',
      '#FFBD5F',
      '#A2D6C6',
      '#A8D5BA',
      '#FFD166',
      '#EF476F',
      '#118AB2'
    ]
  
    // 確保有足夠的顏色
    while (testColor.length < categories.length) {
      testColor.push(testColor[testColor.length % 8])
    }
  
    // 在 SVG 定義中添加漸變
    const defs = svg.append('defs');
  
    // 為每個類別創建漸變
    categories.forEach((category, i) => {
      // 實際任務的漸變
      const actualGradient = defs.append('linearGradient')
        .attr('id', `actual-gradient-${i}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
  
      actualGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.color(testColor[i]).darker(0.2));
  
      actualGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', testColor[i]);
  
      // 預估任務的漸變
      const plannedGradient = defs.append('linearGradient')
        .attr('id', `planned-gradient-${i}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
  
      plannedGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.color(testColor[i]).brighter(0.5));
  
      plannedGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', d3.color(testColor[i]).brighter(0.2));
    });
  
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
  
      // 檢查月份標籤是否會超出右邊界
      const monthLabelX = monthStart + (monthEnd - monthStart) / 2
      const monthLabelWidth = d3.timeFormat('%Y-%m')(month).length * 8 // 估計文字寬度
      const isLabelOverflowing = monthLabelX + monthLabelWidth / 2 > width + margin.left - 10
  
      // 只有在月份寬度足夠時才顯示月份名稱
      if (monthEnd - monthStart > 40) {
        // 確保有足夠的空間顯示月份名稱
        // 月份名稱
        svg
          .append('text')
          .attr(
            'x',
            isLabelOverflowing ? width + margin.left - monthLabelWidth / 2 - 10 : monthLabelX
          )
          .attr('y', margin.top / 4 - 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('font-size', '16px')
          .style('font-weight', 'bold')
          .style('fill', '#2c5282')
          .style('opacity', isLabelOverflowing ? 0.5 : 1) // 如果超出，降低透明度
          .text(function () {
            // 如果是最後一個月且超出，則截斷顯示
            if (isLabelOverflowing && i === months.length - 1) {
              return d3.timeFormat('%Y-%m')(month).split('-')[0] + '-'
            }
  
            // 使用更簡潔的格式，只顯示月份
            const monthFormat =
              i === 0 || month.getMonth() === 0
                ? d3.timeFormat('%Y-%m') // 年份變化或第一個月顯示完整格式
                : d3.timeFormat('%m') // 其他月份只顯示月份
  
            return monthFormat(month)
          })
      }
    })
  
    // 繪製週標籤
    const weeks = d3.timeWeeks(startDate, d3.timeDay.offset(endDate, 1))
  
    // 繪製週背景
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
  
      // 檢查週標籤是否會超出右邊界
      const weekLabelX = weekStart + (weekEnd - weekStart) / 2
      const isLabelOverflowing = weekLabelX > width + margin.left - 20
  
      // 週標籤
      svg
        .append('text')
        .attr('x', weekLabelX)
        .attr('y', margin.top * 0.75 - 5)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#4a5568')
        .style('opacity', isLabelOverflowing ? 0 : 1) // 如果超出，則隱藏
        .text(`W${d3.timeFormat('%U')(week)}`)
  
      // 檢查日期標籤是否會超出右邊界
      const isDateOverflowing = weekStart + 4 > width + margin.left - 30
  
      // 添加週開始日期
      svg
        .append('text')
        .attr('x', weekStart + 4)
        .attr('y', margin.top * 0.75 + 8)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '9px')
        .style('fill', '#718096')
        .style('opacity', isDateOverflowing ? 0 : 1) // 如果超出，則隱藏
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
        .attr('y2', height + margin.top) // 這個高度會在後面更新
        .attr('stroke', day.getDay() === 0 || day.getDay() === 6 ? '#cbd5e0' : '#e2e8f0')
        .attr('stroke-width', day.getDay() === 0 || day.getDay() === 6 ? 1 : 0.5)
        .attr('stroke-dasharray', day.getDay() === 0 || day.getDay() === 6 ? '3,3' : null)
        .attr('class', 'day-line') // 添加類名以便後續選擇
  
      // 標記週末
      if (day.getDay() === 0 || day.getDay() === 6) {
        const nextDay = d3.timeDay.offset(day, 1)
        const dayWidth = xScale(nextDay) - dayX
  
        svg
          .append('rect')
          .attr('x', dayX)
          .attr('y', margin.top)
          .attr('width', dayWidth)
          .attr('height', height) // 這個高度會在後面更新
          .attr('fill', '#f7fafc')
          .attr('opacity', 0.3)
          .attr('class', 'weekend-rect') // 添加類名以便後續選擇
      }
    })
  
    // 繪製類別和任務
  
    categories.forEach((category, categoryIndex) => {
  
      const categoryName = category.name // 使用對象的 name 屬性
      const categoryY = margin.top + categoryIndex * 60   ///要看有幾個任務
  
      // 計算前一個類別的高度，用於正確定位當前類別
      let previousCategoryHeight = 0
      if (categoryIndex > 0 && categories[categoryIndex - 1].totalHeight) {
        previousCategoryHeight = categories[categoryIndex - 1].totalHeight
      }
  
      // 更新當前類別的Y位置
      const adjustedCategoryY = margin.top + previousCategoryHeight
  
      // 繪製類別背景
      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', adjustedCategoryY)
        .attr('width', margin.left - 5)
        .attr('height', categoryY)
        .attr('fill', testColor[categoryIndex])
        .attr('rx', 6)
        .attr('ry', 6)
  
      // 添加左側裝飾條
      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', adjustedCategoryY)
        .attr('width', 8)
        .attr('height', categoryY)
        .attr('fill', '#fff')
        .attr('opacity', 0.3)
  
      // 繪製類別名稱（改進左側標題區域）
      svg
        .append('text')
        .attr('x', margin.left / 2 + 12) // 向右移動更多，為左側的圖標留出足夠空間
        .attr('y', adjustedCategoryY + 25)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#fff')
        .style('text-shadow', '0px 1px 2px rgba(0,0,0,0.3)')
        .text(categoryName)
  
      // 根據類別名稱添加不同的SVG圖標
      let iconPath = ''
  
      // 為不同類別設置不同的圖標路徑
      switch (categoryName) {
        case 'UIUX討論':
        case '設計':
          // 設計圖標 - 鉛筆
          iconPath =
            'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
          break
        case 'Frontend':
        case '開發':
          // 開發圖標 - 代碼
          iconPath = 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
          break
        case 'Backend':
          // 後端圖標 - 服務器
          iconPath =
            'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01'
          break
        case 'QA':
        case '測試':
          // 測試圖標 - 檢查表
          iconPath =
            'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
          break
        case '規劃':
          // 規劃圖標 - 天平
          iconPath =
            'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3'
          break
        case '部署':
          // 部署圖標 - 雲上傳
          iconPath =
            'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
          break
        default:
          // 默認圖標 - 文檔
          iconPath =
            'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
      }
  
      // 繪製SVG圖標
      if (iconPath) {
        svg
          .append('g')
          .attr('transform', `translate(${margin.left / 2 - 40}, ${adjustedCategoryY + 25})`) // 放在文字左側，增加間距
          .append('path')
          .attr('d', iconPath)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .attr('fill', 'none')
          .attr('opacity', 0.9)
          .attr('transform', 'scale(0.9)') // 稍微放大圖標
      }
  
      // 獲取該類別的任務
      const categoryTasks = allTasks.filter((task) => task.category === categoryName)
  
  
      // 計算任務行位置，避免重疊
      const taskRows = []
  
      // 按開始時間排序任務，確保時間順序
      const sortedTasks = [...categoryTasks].sort((a, b) => new Date(a.planned.start) - new Date(b.planned.start))
  
      sortedTasks.forEach((task) => {
        // 每個任務都放在新的一行
        const rowIndex = taskRows.length
  
        // 將任務添加到確定的行
        if (!taskRows[rowIndex]) {
          taskRows[rowIndex] = []
        }
        taskRows[rowIndex].push(task)
        task.rowIndex = rowIndex
      })
  
  
      // 根據類別中的任務行數調整類別高度
      const rowCount = taskRows.length || 1
  
      const categoryHeight = Math.max(60, rowCount * taskRowHeight + 20) // 增加每個類別的高度，使用新的行高35
  
      // 保存類別的總高度，用於後續類別的定位
      categories[categoryIndex].totalHeight = previousCategoryHeight + categoryHeight
  
      // 更新類別背景高度
      svg
        .selectAll('rect')
        .filter(function (d, i) {
          return (
            d3.select(this).attr('x') === '0' &&
            d3.select(this).attr('y') === String(adjustedCategoryY)
          )
        })
        .attr('height', categoryHeight)
  
      // 繪製該類別的任務
  
      categoryTasks.forEach((task, taskIndex) => {
        // 獲取預設和實際的開始與結束日期
        const plannedStartX = xScale(new Date(task.planned?.start || task.start))
        const plannedEndX = xScale(new Date(task.planned?.end || task.end))
        const actualStartX = xScale(new Date(task.actual?.start || task.start))
        const actualEndX = xScale(new Date(task.actual?.end || task.end))
  
        // 計算任務條的寬度
        const plannedTaskWidth = Math.max(plannedEndX - plannedStartX, 2)
        const actualTaskWidth = Math.max(actualEndX - actualStartX, 2)
  
        // 計算任務行的垂直位置 - 調整為不同的位置
  
  
        const baseY = adjustedCategoryY + 5 + (task.rowIndex || 0) * taskRowHeight
        const plannedTaskY = baseY + taskY_offset // 預估任務位於上方
        const actualTaskY = baseY + taskY_offset + barHeight + barSpacing // 實際任務位於下方
        const textY = baseY + taskY_offset + barHeight + barSpacing / 2 // 文字位於兩者之間
  
        // 1. 繪製預設計劃任務條（虛線框、白色填充）
        svg
          .append('rect')
          .attr('class', 'planned-task-bar')
          .attr('x', Math.max(plannedStartX, margin.left))
          .attr('y', plannedTaskY)
          .attr('width', () => {
            if (plannedStartX < margin.left) {
              return Math.max(plannedTaskWidth - (margin.left - plannedStartX), 0)
            }
            return plannedTaskWidth
          })
          .attr('height', barHeight)
          .attr('rx', 3)
          .attr('ry', 3)
          .attr('fill', 'white')
          .attr('opacity', 0.9)
          .attr('stroke', d3.color(testColor[categoryIndex]).darker(0.3))
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3,2')
          .attr('data-task-id', `${categoryName}-${taskIndex}-planned`)
          .attr('data-task-content', task.content)
          .on('mouseover', function (event) {
            d3.select(this).attr('opacity', 1).attr('stroke-width', 2)
  
            // 顯示提示框代碼 (與原有代碼類似，但顯示計劃日期)
            const containerRect = chartContainer.value.getBoundingClientRect()
            const scrollLeft = chartContainer.value.scrollLeft
            const scrollTop = chartContainer.value.scrollTop
            const mouseX = event.clientX - containerRect.left + scrollLeft
            const mouseY = event.clientY - containerRect.top + scrollTop
  
            let tooltipX = mouseX + 10
            let tooltipY = mouseY - 10
  
            if (mouseX > containerRect.width - 200) {
              tooltipX = mouseX - 150
            }
  
            if (mouseY > containerRect.height - 100) {
              tooltipY = mouseY - 80
            }
  
            const tooltip = d3
              .select(chartContainer.value)
              .append('div')
              .attr('class', 'absolute bg-white p-2 rounded shadow-md text-sm z-50')
              .style('left', `${tooltipX}px`)
              .style('top', `${tooltipY}px`)
              .style('pointer-events', 'none')
  
            tooltip
              .append('div')
              .attr('class', 'font-bold')
              .text(task.content + ' (預估)')
  
            tooltip
              .append('div')
              .attr('class', 'text-gray-600')
              .text(
                `${new Date(task.planned?.start || task.start).toLocaleDateString()} ~ ${new Date(task.planned?.end || task.end).toLocaleDateString()}`
              )
  
            tooltip
              .append('div')
              .attr('class', 'text-xs text-gray-500 mt-1')
              .text(`類別: ${categoryName}`)
          })
          .on('mouseout', function () {
            d3.select(this).attr('opacity', 0.9).attr('stroke-width', 1.5)
            d3.select(chartContainer.value).selectAll('.absolute').remove()
          })
  
        // 在預設任務條左側添加"預設"標籤
        // svg
        //   .append('text')
        //   .attr('x', Math.max(plannedStartX, margin.left) + 4)
        //   .attr('y', plannedTaskY + 7) // 調整y位置使其與上方的預設任務條對齊
        //   .attr('text-anchor', 'start')
        //   .attr('dominant-baseline', 'middle')
        //   .style('font-size', '10px')
        //   .style('fill', d3.color(testColor[categoryIndex]).darker(0.5))
        //   .style('font-weight', 'bold')
        //   .style('letter-spacing', '2px')
        //   .style('pointer-events', 'none')
        //   .text('預估')
  
        // 2. 繪製實際任務條（原本的樣式）- 位置調整到下方
        svg
          .append('rect')
          .attr('class', 'actual-task-bar')
          .attr('x', Math.max(actualStartX, margin.left))
          .attr('y', actualTaskY)
          .attr('width', () => {
            if (actualStartX < margin.left) {
              return Math.max(actualTaskWidth - (margin.left - actualStartX), 0)
            }
            return actualTaskWidth
          })
          .attr('height', barHeight)
          .attr('rx', 3)
          .attr('ry', 3)
          .attr('fill', testColor[categoryIndex])
          .attr('opacity', 0.8)
          .attr('stroke', d3.color(testColor[categoryIndex]).darker(0.5))
          .attr('stroke-width', 1)
          .attr('data-task-id', `${categoryName}-${taskIndex}-actual`)
          .attr('data-task-content', task.content)
          .on('mouseover', function (event) {
            d3.select(this).attr('opacity', 1).attr('stroke', '#333').attr('stroke-width', 1)
  
            const containerRect = chartContainer.value.getBoundingClientRect()
            const scrollLeft = chartContainer.value.scrollLeft
            const scrollTop = chartContainer.value.scrollTop
            const mouseX = event.clientX - containerRect.left + scrollLeft
            const mouseY = event.clientY - containerRect.top + scrollTop
  
            let tooltipX = mouseX + 10
            let tooltipY = mouseY - 10
  
            if (mouseX > containerRect.width - 200) {
              tooltipX = mouseX - 150
            }
  
            if (mouseY > containerRect.height - 100) {
              tooltipY = mouseY - 80
            }
  
            const tooltip = d3
              .select(chartContainer.value)
              .append('div')
              .attr('class', 'absolute bg-white p-2 rounded shadow-md text-sm z-50')
              .style('left', `${tooltipX}px`)
              .style('top', `${tooltipY}px`)
              .style('pointer-events', 'none')
  
            tooltip
              .append('div')
              .attr('class', 'font-bold')
              .text(task.content + ' (實際)')
  
            tooltip
              .append('div')
              .attr('class', 'text-gray-600')
              .text(
                `${new Date(task.actual?.start || task.start).toLocaleDateString()} ~ ${new Date(task.actual?.end || task.end).toLocaleDateString()}`
              )
  
            tooltip
              .append('div')
              .attr('class', 'text-xs text-gray-500 mt-1')
              .text(`類別: ${categoryName}`)
          })
          .on('mouseout', function () {
            d3.select(this).attr('opacity', 0.8).attr('stroke', 'none')
            d3.select(chartContainer.value).selectAll('.absolute').remove()
          })
  
        // 添加"實際"標籤在實際任務條左側
        // svg
        //   .append('text')
        //   .attr('x', Math.max(actualStartX, margin.left) + 4)
        //   .attr('y', actualTaskY + 7) // 調整y位置使其與下方的實際任務條對齊
        //   .attr('text-anchor', 'start')
        //   .attr('dominant-baseline', 'middle')
        //   .style('font-size', '10px')
        //   .style('fill', 'black')
        //   .style('opacity', 0.4)
        //   .style('font-weight', 'bold')
        //   .style('letter-spacing', '2px')
        //   .style('pointer-events', 'none')
        //   .text('實際')
  
  
        // 3. 使用兩者end最大值來放置任務文字說明
        const farEndX = Math.max(plannedEndX, actualEndX)
  
        svg
          .append('text')
          .attr('x', farEndX + 5)
          .attr('y', textY) // 放在預估和實際之間的垂直中心
          .attr('dominant-baseline', 'middle')
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .style('fill', '#333')
          .style('pointer-events', 'none')
          .text(() => {
            // 檢查是否接近右邊界
            const rightBoundary = width + margin.left - 100
  
            // 如果接近右邊界，則不顯示文字
            if (farEndX > rightBoundary) {
              return ''
            }
  
            // 檢查是否有足夠空間顯示文字
            const availableWidth = rightBoundary - farEndX - 5
            const maxTextLength = Math.floor(availableWidth / 7)
  
            if (maxTextLength < 3) return ''
  
            // 截斷過長的文字
            return task.content.length > maxTextLength
              ? task.content.substring(0, maxTextLength - 3) + '...'
              : task.content;
          });
  
        // 修改延遲標記的位置計算
        if (task.actual && task.actual.end && new Date(task.actual.end) > new Date(task.planned.end)) {
          const plannedEndX = xScale(new Date(task.planned.end));
  
          svg.append('line')
            .attr('class', 'delay-marker')
            .attr('x1', plannedEndX)
            .attr('x2', plannedEndX)
            .attr('y1', actualTaskY - 3) // 使用 actualTaskY 而不是 taskY
            .attr('y2', actualTaskY + barHeight + 3) // 使用 actualTaskY + barHeight
            .attr('stroke', '#f43f5e')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '2,2')
            .attr('opacity', 0.8);
  
          const delayDays = Math.ceil(
            (new Date(task.actual.end) - new Date(task.planned.end)) / (1000 * 60 * 60 * 24)
          );
          if (delayDays > 0) {
            svg.append('text')
              .attr('class', 'delay-text')
              .attr('x', plannedEndX + 4)
              .attr('y', actualTaskY - 5) // 使用 actualTaskY
              .attr('text-anchor', 'start')
              .style('font-size', '9px')
              .style('fill', '#f43f5e')
              .text(`延遲 ${delayDays} 天`);
          }
        }
  
        // 修改進度指示器部分
        const now = new Date();
        if (task.actual && task.actual.start && (!task.actual.end || new Date(task.actual.end) > now)) {
          const actualStartDate = new Date(task.actual.start);
          if (actualStartDate <= now) {
            const taskStart = actualStartDate;
            const taskEnd = task.planned.end ? new Date(task.planned.end) : new Date(task.actual.start);
  
            const taskDuration = taskEnd - taskStart;
            const progressRatio = Math.min(1, Math.max(0, (now - taskStart) / taskDuration));
            const actualStartX = xScale(actualStartDate);
            const taskWidth = plannedTaskWidth; // 使用 plannedTaskWidth
            const progressX = Math.max(actualStartX, margin.left) + (taskWidth * progressRatio);
  
            svg.append('line')
              .attr('class', 'progress-line')
              .attr('x1', progressX)
              .attr('x2', progressX)
              .attr('y1', actualTaskY) // 使用 actualTaskY
              .attr('y2', actualTaskY + barHeight) // 使用 actualTaskY + barHeight
              .attr('stroke', '#fff')
              .attr('stroke-width', 2)
              .attr('opacity', 0.9);
  
            svg.append('circle')
              .attr('class', 'progress-indicator')
              .attr('cx', progressX)
              .attr('cy', actualTaskY + barHeight / 2) // 使用 actualTaskY + barHeight/2
              .attr('r', 4)
              .attr('fill', '#fff')
              .attr('stroke', d3.color(testColor[categoryIndex]).darker(0.3))
              .attr('stroke-width', 1.5);
          }
        }
      })
    })
  
    // 在繪製完所有類別後，調整SVG總高度
  
    const totalHeight =
      categories.length > 0
        ? categories[categories.length - 1].totalHeight + margin.bottom + 50 // 增加額外的底部空間
        : margin.top + margin.bottom
  
    svg.attr('height', totalHeight)
  
    // 添加全局鼠標移動事件處理器，確保提示框正確顯示
    d3.select(chartContainer.value).on('mousemove', function (event) {
      const target = event.target
      // 檢查鼠標是否在任務條上
      if (target.classList.contains('task-bar')) {
        // 如果鼠標在任務條上但沒有顯示提示框，則觸發mouseover事件
        if (d3.select(chartContainer.value).selectAll('.absolute').empty()) {
          const mouseEvent = new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: event.clientX,
            clientY: event.clientY
          })
          target.dispatchEvent(mouseEvent)
        }
      }
    })
  
    // 更新Y軸線的高度
    svg
      .select('line')
      .filter(function () {
        return (
          d3.select(this).attr('x1') === String(margin.left) &&
          d3.select(this).attr('x2') === String(margin.left)
        )
      })
      .attr('y2', totalHeight)
  
    // 調整日期分隔線的高度
    svg.selectAll('line.day-line').attr('y2', totalHeight)
  
    // 調整週末背景的高度
    svg.selectAll('rect.weekend-rect').attr('height', totalHeight - margin.top)
  
    // 添加底部邊界線
    svg
      .append('line')
      .attr('x1', margin.left)
      .attr('x2', width + margin.left)
      .attr('y1', totalHeight - margin.bottom / 2)
      .attr('y2', totalHeight - margin.bottom / 2)
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1)
  
    // 繪製今天的垂直線
    const today = new Date()
    if (today >= startDate && today <= endDate) {
      const todayX = xScale(today)
  
      // 主要今日線
      svg
        .append('line')
        .attr('x1', todayX)
        .attr('x2', todayX)
        .attr('y1', 0)
        .attr('y2', totalHeight)
        .attr('stroke', '#16A34A') // 深綠色
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.8)
  
      // 今日標籤
      svg
        .append('text')
        .attr('x', todayX + 5)
        .attr('y', margin.top - 2)
        .attr('text-anchor', 'start')
        .style('font-size', '12px')
        .style('fill', '#16A34A') // 使用相同的深綠色
        .style('font-weight', '600')
        .text(`Now (${today.getMonth() + 1}/${today.getDate()})`)
    }
  
    // 繪製結束日期線
  
    if (allTasks?.slice(-1)[0]?.actual?.end) {
  
      const taskEndDate = allTasks.slice(-1)[0].actual?.end
      const endDateX = xScale(new Date(taskEndDate))
      svg
        .append('line')
        .attr('x1', endDateX + 3)
        .attr('x2', endDateX + 3)
        .attr('y1', 0)
        .attr('y2', totalHeight)
        .attr('stroke', '#DC2626') // 使用較柔和的紅色
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-opacity', 0.5)
  
      // 繪製結束日期標籤
      svg
        .append('text')
        .attr('x', endDateX + 5)
        .attr('y', margin.top + 15)
        .attr('text-anchor', 'start')
        .attr('font-weight', 'bold')
        .style('font-size', '12px')
        .style('fill', '#DC2626') // 使用相同的紅色
        .text(`預計完成日(${taskEndDate})`)
    }
  
    // 更新容器寬度引用
    svgWidth.value = effectiveWidth
    containerWidth.value = chartContainer.value.clientWidth
  
    // 確保水平滾動條可見
    if (effectiveWidth > containerClientWidth) {
      console.log('SVG寬度超過容器，應該顯示滾動條', effectiveWidth, containerClientWidth)
    }
  }
  
  onMounted(() => {
    // 設置基礎寬度
    baseWidth.value = props.width
    drawChart()
  
    // 定義事件處理函數
    window.addEventListener('resize', handleResize)
  })
  
  // 定義全局的 resize 處理函數
  const handleResize = () => {
    containerWidth.value = chartContainer.value?.clientWidth || 0
    // 窗口大小變化時重新繪製
    redrawWithZoom()
  }
  
  onUnmounted(() => {
    // 正確移除事件監聽器
    window.removeEventListener('resize', handleResize)
  })
  
  watch(() => props.data, drawChart, { deep: true })
  watch(
    () => props.width,
    (newWidth) => {
      baseWidth.value = newWidth
      redrawWithZoom()
    }
  )
  </script>