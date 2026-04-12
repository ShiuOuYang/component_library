<template>
  <div ref="chart" class="w-full"></div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect, inject } from 'vue'
import * as d3 from 'd3'

/**
 * AOI Distribution Chart 組件
 * 顯示各板號的缺點分布堆疊長條圖（上方 C 面，下方 S 面）
 * 複製自 FLI Distribution，修改為使用 inject('aoiData')
 */

// Inject AOI 數據
const aoiData = inject('aoiData', null)

// 安全訪問 computed 屬性
const sortedBoardArray = computed(() => aoiData?.sortedBoardArray?.value ?? [])
const filteredRenderData = computed(() => aoiData?.filteredRenderData?.value ?? [])
const classifyArray = computed(() => aoiData?.classifyArray?.value ?? [])
const allClassifyArray = computed(() => aoiData?.allClassifyArray?.value ?? [])
const distributionData = computed(() => aoiData?.distributionData?.value ?? { C: [], S: [] })
const distributionMaxValue = computed(() => aoiData?.distributionMaxValue?.value ?? 0.01)

const chart = ref(null)

// RWD 尺寸計算
const windowWidth = ref(window.innerWidth)
const rwdWidth = computed(() => windowWidth.value * 0.9)
const rwdHeight = computed(() => rwdWidth.value * 0.2)
const margin = 30

// 繪製圖表
const drawChart = () => {
  if (!chart.value) return
  if (classifyArray.value.length === 0) return
  
  // 顏色比例尺
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(allClassifyArray.value)
  
  // 清除舊圖表
  d3.select(chart.value).select('.dtb-svg').remove()
  
  // 堆疊數據
  const stackedCData = d3.stack().keys(classifyArray.value)(distributionData.value.C)
  const stackedSData = d3.stack().keys(classifyArray.value)(distributionData.value.S)
  
  // 創建 SVG
  const svg = d3.select(chart.value)
    .append('svg')
    .attr('class', 'dtb-svg')
    .attr('width', rwdWidth.value)
    .attr('height', rwdHeight.value)
  
  // X 軸比例尺
  const xScale = d3.scaleBand()
    .domain(sortedBoardArray.value)
    .range([margin, rwdWidth.value - margin * 2])
    .paddingInner(0.1)
    .paddingOuter(0.1)
  
  // X 軸
  const xAxis = svg
    .append('g')
    .attr('class', 'xAxis')
    .attr('transform', `translate(0,${rwdHeight.value - margin})`)
  
  xAxis.call(d3.axisBottom(xScale).tickSizeOuter(0).tickSizeInner(0))
  
  // Y 軸比例尺（S 面 - 下半部）
  const yScaleS = d3.scaleLinear()
    .domain([0, distributionMaxValue.value])
    .range([rwdHeight.value - margin, rwdHeight.value - margin - ((rwdHeight.value - margin - margin / 2) / 2)])
    .nice()
  
  // Y 軸比例尺（C 面 - 上半部）
  const yScaleC = d3.scaleLinear()
    .domain([0, distributionMaxValue.value])
    .range([(rwdHeight.value - margin / 2) / 2, margin / 2])
    .nice()
  
  // Y 軸（S 面）
  const yAxisS = svg
    .append('g')
    .attr('class', 'yAxis')
    .attr('transform', `translate(${margin},0)`)
  
  yAxisS.call(
    d3.axisLeft(yScaleS)
      .tickFormat((d) => (d * 100) + '%')
      .tickSizeOuter(0)
      .tickSizeInner(5)
      .ticks(5)
  )
  
  // Y 軸（C 面）
  const yAxisC = svg
    .append('g')
    .attr('class', 'yAxis')
    .attr('transform', `translate(${margin},0)`)
  
  yAxisC.call(
    d3.axisLeft(yScaleC)
      .tickFormat((d) => (d * 100) + '%')
      .tickSizeOuter(0)
      .tickSizeInner(5)
      .ticks(5)
  )
  
  // 隱藏 X 軸線
  svg.selectAll('.xAxis .domain').attr('stroke', '#ffffff')
  
  // C 面長條圖組
  const barGroupC = svg
    .append('g')
    .attr('class', 'bar-group-C')
    .selectAll('g')
    .data(stackedCData)
    .join('g')
    .attr('fill', (d) => colorScale(d.key))
  
  barGroupC
    .selectAll('rect')
    .data((d) => d.map((value) => ({ value, parentKey: d.key })))
    .enter()
    .append('rect')
    .attr('class', (d) => `dtb-${d.value.data.Board}-${d.parentKey}-C`)
    .attr('x', (d, i) => xScale(sortedBoardArray.value[i]))
    .attr('y', (d) => yScaleC(d.value[1]))
    .attr('height', (d) => yScaleC(d.value[0]) - yScaleC(d.value[1]))
    .attr('width', xScale.bandwidth())
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      handleBarMouseover(event, d, barGroupC, barGroupS, colorScale)
    })
    .on('mouseleave', function(event, d) {
      handleBarMouseleave(event, d, barGroupC, barGroupS, colorScale)
    })
  
  // S 面長條圖組
  const barGroupS = svg
    .append('g')
    .attr('class', 'bar-group-S')
    .selectAll('g')
    .data(stackedSData)
    .join('g')
    .attr('fill', (d) => colorScale(d.key))
  
  barGroupS
    .selectAll('rect')
    .data((d) => d.map((value) => ({ value, parentKey: d.key })))
    .join('rect')
    .attr('class', (d) => `dtb-${d.value.data.Board}-${d.parentKey}-S`)
    .attr('x', (d, i) => xScale(sortedBoardArray.value[i]))
    .attr('y', (d) => yScaleS(d.value[1]))
    .attr('height', (d) => yScaleS(d.value[0]) - yScaleS(d.value[1]))
    .attr('width', xScale.bandwidth())
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      handleBarMouseover(event, d, barGroupC, barGroupS, colorScale)
    })
    .on('mouseleave', function(event, d) {
      handleBarMouseleave(event, d, barGroupC, barGroupS, colorScale)
    })
  
  // C/S 標籤
  svg
    .append('text')
    .attr('x', rwdWidth.value - margin * 1.5)
    .attr('y', yScaleC(distributionMaxValue.value / 2) + 10)
    .style('text-anchor', 'middle')
    .style('font-weight', 'bold')
    .style('font-size', '14px')
    .text('C')
  
  svg
    .append('text')
    .attr('x', rwdWidth.value - margin * 1.5)
    .attr('y', yScaleS(distributionMaxValue.value / 2) + 10)
    .style('text-anchor', 'middle')
    .style('font-weight', 'bold')
    .style('font-size', '14px')
    .text('S')
  
  // 圖例
  const tagsWrap = svg
    .selectAll('.tags-dtb-classify')
    .data(classifyArray.value)
    .enter()
    .append('g')
    .attr('class', 'tags-dtb-classify')
  
  tagsWrap
    .append('rect')
    .attr('x', rwdWidth.value - margin)
    .attr('y', (d, i) => 20 + (i + 1) * margin / 3)
    .attr('width', 6)
    .attr('height', 6)
    .attr('fill', (d) => colorScale(d))
    .attr('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      handleLegendMouseover(event, d, barGroupC, barGroupS, colorScale)
    })
    .on('mouseleave', function(event, d) {
      handleLegendMouseleave(event, d, barGroupC, barGroupS, colorScale)
    })
  
  tagsWrap
    .append('text')
    .attr('x', rwdWidth.value - margin + 15)
    .attr('y', (d, i) => 20 + (i + 1) * margin / 3)
    .attr('transform', 'translate(5,5)')
    .style('fill', '#000')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .style('text-anchor', 'middle')
    .text((d) => d)
}

// 長條圖 Mouseover 事件處理
const handleBarMouseover = (event, d, barGroupC, barGroupS, colorScale) => {
  const nonMatchC = barGroupC.filter((item) => item.key !== d.parentKey)
  const nonMatchS = barGroupS.filter((item) => item.key !== d.parentKey)
  
  nonMatchC.transition().attr('fill', (item) => {
    const targetColor = d3.color(colorScale(item.key))
    targetColor.opacity = 0.1
    return targetColor
  })
  
  nonMatchS.transition().attr('fill', (item) => {
    const targetColor = d3.color(colorScale(item.key))
    targetColor.opacity = 0.1
    return targetColor
  })
  
  // 顯示 Tooltip
  d3.select(chart.value)
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 1)
    .style('position', 'fixed')
    .style('z-index', '9999')
    .style('background-color', 'white')
    .style('border', `2px solid ${colorScale(d.parentKey)}`)
    .style('border-radius', '0.375rem')
    .style('box-shadow', '0 1px 2px 0 rgb(0 0 0 / 0.05)')
    .style('padding', '0.5rem')
    .style('left', `${event.clientX + 15}px`)
    .style('top', `${event.clientY}px`)
    .html(`
      <div class="flex gap-2 px-1">
        <p class="mb-0 text-sm">板號:</p>
        <p class="mb-0 text-sm font-bold">${d.value.data.Board}</p>
      </div>
      <div class="flex gap-2 px-1">
        <p class="mb-0 text-sm">缺點:</p>
        <p class="mb-0 text-sm font-bold">${d.parentKey}</p>
      </div>
      <div class="flex gap-2 px-1">
        <p class="mb-0 text-sm">佔比:</p>
        <p class="mb-0 text-sm font-bold">${(d.value.data[d.parentKey] * 100).toFixed(0)}%</p>
      </div>
    `)
}

// 長條圖 Mouseleave 事件處理
const handleBarMouseleave = (event, d, barGroupC, barGroupS, colorScale) => {
  barGroupC
    .filter((item) => item.key !== d.parentKey)
    .transition()
    .attr('fill', (item) => colorScale(item.key))
  
  barGroupS
    .filter((item) => item.key !== d.parentKey)
    .transition()
    .attr('fill', (item) => colorScale(item.key))
  
  d3.select('.tooltip').remove()
}

// 圖例 Mouseover 事件處理
const handleLegendMouseover = (event, classify, barGroupC, barGroupS, colorScale) => {
  const barGroup = d3.selectAll('.bar-group-C g, .bar-group-S g')
  const othersBarGroup = barGroup.filter((item) => item.key !== classify)
  
  othersBarGroup._groups[0].forEach((g) => {
    d3.select(g).attr('fill', (d) => {
      const targetColor = d3.color(colorScale(g.__data__.key))
      targetColor.opacity = 0.1
      return targetColor
    })
  })
}

// 圖例 Mouseleave 事件處理
const handleLegendMouseleave = (event, classify, barGroupC, barGroupS, colorScale) => {
  const barGroup = d3.selectAll('.bar-group-C g, .bar-group-S g')
  const othersBarGroup = barGroup.filter((item) => item.key !== classify)
  
  othersBarGroup._groups[0].forEach((g) => {
    d3.select(g).attr('fill', (d) => {
      const targetColor = d3.color(colorScale(g.__data__.key))
      targetColor.opacity = 1
      return targetColor
    })
  })
}

// 生命週期
onMounted(() => {
  console.log('🎯 [AoiDistribution] 組件已掛載')
  console.log('🔍 [AoiDistribution] 初始數據:', {
    filteredRenderDataLength: filteredRenderData.value?.length || 0,
    sortedBoardArrayLength: sortedBoardArray.value?.length || 0,
    classifyArrayLength: classifyArray.value?.length || 0
  })
  
  window.addEventListener('resize', (event) => {
    windowWidth.value = event.target.innerWidth
  })
  
  watchEffect(() => {
    console.log('🔄 [AoiDistribution] watchEffect 觸發，準備繪製圖表')
    drawChart()
  })
})
</script>

<style scoped>
/* Tooltip 樣式已移至 inline style，這裡保留為空 */
</style>
