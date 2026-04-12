<template>
  <div class="chart-container">
    <svg ref="chartRef" class="w-full h-80"></svg>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import * as d3 from 'd3'

// Props
const props = defineProps({
  data: {
    type: Array,
    required: true,
    default: () => []
  },
  width: {
    type: Number,
    default: 500
  },
  height: {
    type: Number,
    default: 320
  },
  margin: {
    type: Object,
    default: () => ({ top: 20, right: 30, bottom: 40, left: 40 })
  },
  strokeColor: {
    type: String,
    default: '#3b82f6'
  },
  strokeWidth: {
    type: Number,
    default: 3
  },
  showArea: {
    type: Boolean,
    default: true
  },
  showDots: {
    type: Boolean,
    default: true
  },
  showCrosshair: {
    type: Boolean,
    default: true
  },
  curve: {
    type: String,
    default: 'curveBasis', // curveBasis, curveLinear, curveMonotoneX 等
    validator: (value) => ['curveBasis', 'curveLinear', 'curveMonotoneX', 'curveCardinal'].includes(value)
  },
  animate: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['dot-click', 'dot-hover', 'chart-mousemove'])

// Template refs
const chartRef = ref(null)

// 創建 tooltip
let tooltip = null

// 繪製 Line Chart
function drawChart() {
  console.log('繪製折線圖，數據', props.data)
  if (!props.data || props.data.length === 0) return

  const svg = d3.select(chartRef.value)
  svg.selectAll('*').remove() // 清除舊的圖表

  svg.attr('width', props.width).attr('height', props.height)

  // 設定比例尺
  const xScale = d3.scaleTime()
    .domain(d3.extent(props.data, d => d.date))
    .range([props.margin.left, props.width - props.margin.right])

  const yScale = d3.scaleLinear()
    .domain(d3.extent(props.data, d => d.value))
    .range([props.height - props.margin.bottom, props.margin.top])

  // 選擇曲線類型
  const curveType = d3[props.curve] || d3.curveBasis

  // 創建線條生成器
  const line = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.value))
    .curve(curveType)

  // 創建 tooltip
  if (!tooltip) {
    tooltip = d3.select('body').selectAll('.d3-line-tooltip')
      .data([0])
      .join('div')
      .attr('class', 'd3-line-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('font-size', '12px')
      .style('z-index', 1000)
  }

  // 添加漸層定義（如果顯示面積圖）
  if (props.showArea) {
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'line-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', props.height - props.margin.bottom)
      .attr('x2', 0).attr('y2', props.margin.top)

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', props.strokeColor)
      .attr('stop-opacity', 0.1)

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', props.strokeColor)
      .attr('stop-opacity', 0.8)

    // 添加面積圖（在線條下方）
    const area = d3.area()
      .x(d => xScale(d.date))
      .y0(props.height - props.margin.bottom)
      .y1(d => yScale(d.value))
      .curve(curveType)

    svg.append('path')
      .datum(props.data)
      .attr('fill', 'url(#line-gradient)')
      .attr('d', area)
      .style('opacity', 0)
      .transition()
      .duration(props.animate ? 1000 : 0)
      .style('opacity', 1)
  }

  // 繪製線條
  const linePath = svg.append('path')
    .datum(props.data)
    .attr('class', 'line')
    .attr('fill', 'none')
    .attr('stroke', props.strokeColor)
    .attr('stroke-width', props.strokeWidth)
    .attr('d', line)

  // 線條動畫
  if (props.animate) {
    const totalLength = linePath.node().getTotalLength()
    linePath
      .attr('stroke-dasharray', totalLength + ' ' + totalLength)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(2000)
      .attr('stroke-dashoffset', 0)
  }

  // 添加數據點
  if (props.showDots) {
    const dots = svg.selectAll('.dot')
      .data(props.data)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.value))
      .attr('r', props.animate ? 0 : 4)
      .attr('fill', props.strokeColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')

    // 數據點動畫
    if (props.animate) {
      dots.transition()
        .duration(800)
        .delay((d, i) => i * 100 + 1000)
        .attr('r', 4)
    }

    // 數據點事件
    dots.on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6)
          .attr('fill', '#ff6b6b')
        
        tooltip
          .style('opacity', 1)
          .html(`<strong>${formatDate(d.date)}</strong><br/>數值: ${d.value.toFixed(1)}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
        
        emit('dot-hover', { event, data: d, element: this })
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4)
          .attr('fill', props.strokeColor)
        
        tooltip.style('opacity', 0)
      })
      .on('click', function(event, d) {
        emit('dot-click', { event, data: d, element: this })
      })
  }

  // 添加 X 軸
  svg.append('g')
    .attr('transform', `translate(0, ${props.height - props.margin.bottom})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%m/%d')))
  //   .selectAll('text')
  //   .style('font-size', '12px')

  // 添加 Y 軸
  svg.append('g')
    .attr('transform', `translate(${props.margin.left}, 0)`)
    .call(d3.axisLeft(yScale))
    .selectAll('text')
    .style('font-size', '12px')

  // 添加滑鼠跟蹤十字線
  if (props.showCrosshair) {
    addCrosshair(svg, xScale, yScale)
  }
}

// 添加十字線功能
function addCrosshair(svg, xScale, yScale) {
  const focus = svg.append('g')
    .attr('class', 'focus')
    .style('display', 'none')

  focus.append('circle')
    .attr('r', 5)
    .attr('fill', '#ff6b6b')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)

  focus.append('line')
    .attr('class', 'crosshair-x')
    .attr('stroke', '#999')
    .attr('stroke-dasharray', '3,3')
    .attr('opacity', 0.6)

  focus.append('line')
    .attr('class', 'crosshair-y')
    .attr('stroke', '#999')
    .attr('stroke-dasharray', '3,3')
    .attr('opacity', 0.6)

  // 添加透明覆蓋層來捕捉滑鼠事件
  svg.append('rect')
    .attr('class', 'overlay')
    .attr('x', props.margin.left)
    .attr('y', props.margin.top)
    .attr('width', props.width - props.margin.left - props.margin.right)
    .attr('height', props.height - props.margin.top - props.margin.bottom)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('mouseover', () => focus.style('display', null))
    .on('mouseout', () => focus.style('display', 'none'))
    .on('mousemove', function(event) {
      const [mouseX] = d3.pointer(event)
      const x0 = xScale.invert(mouseX)
      const bisectDate = d3.bisector(d => d.date).left
      const i = bisectDate(props.data, x0, 1)
      const d0 = props.data[i - 1]
      const d1 = props.data[i]
      const d = x0 - d0?.date > d1?.date - x0 ? d1 : d0
      
      if (d) {
        focus.attr('transform', `translate(${xScale(d.date)}, ${yScale(d.value)})`)
        focus.select('.crosshair-x')
          .attr('x1', -xScale(d.date) + props.margin.left)
          .attr('x2', props.width - props.margin.right - xScale(d.date))
          .attr('y1', 0)
          .attr('y2', 0)
        focus.select('.crosshair-y')
          .attr('x1', 0)
          .attr('x2', 0)
          .attr('y1', -yScale(d.value) + props.margin.top)
          .attr('y2', props.height - props.margin.bottom - yScale(d.value))
        
        emit('chart-mousemove', { event, data: d, mouseX })
      }
    })
}

// 格式化日期
function formatDate(date) {
  return d3.timeFormat('%Y/%m/%d')(date)
}

// 執行動畫
function animateChart() {
  const svg = d3.select(chartRef.value)
  const line = svg.select('.line')
  const totalLength = line.node()?.getTotalLength() || 0
  
  if (totalLength > 0) {
    line
      .attr('stroke-dasharray', totalLength + ' ' + totalLength)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(2000)
      .attr('stroke-dashoffset', 0)
  }
}

// 暴露方法給父組件
defineExpose({
  redraw: drawChart,
  animate: animateChart
})

// 監聽數據變化
watch(() => props.data, () => {
  nextTick(() => {
    drawChart()
  })
}, { deep: true })

// 組件掛載後繪製圖表
onMounted(() => {
  nextTick(() => {
    drawChart()
  })
})
</script>

<style scoped>
.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 確保 SVG 響應式 */
svg {
  max-width: 100%;
  height: auto;
}
</style>