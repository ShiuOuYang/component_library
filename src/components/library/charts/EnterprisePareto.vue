<template>
  <div 
    ref="containerRef" 
    class="enterprise-pareto"
    :class="{ 'is-auto-resize': autoResize }"
    :style="autoResize ? { width: '100%', height: '100%' } : { width: width + 'px', height: height + 'px' }"
  >
    <svg ref="svgRef" :width="effectiveWidth" :height="effectiveHeight">
      <defs>
        <!-- Clip Path -->
        <clipPath :id="`clip-${chartId}`">
          <rect :width="chartWidth" :height="chartHeight" />
        </clipPath>
      </defs>

      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- 圖層順序：背景 -> 長條圖 -> 折線圖 -> 座標軸 -> 標題 -->
        
        <!-- 長條圖容器 -->
        <g :clip-path="`url(#clip-${chartId})`">
          <g ref="barsLayerRef" class="bars-layer"></g>
        </g>
        
        <!-- 折線圖容器 -->
        <g :clip-path="`url(#clip-${chartId})`">
          <g ref="lineLayerRef" class="line-layer"></g>
        </g>
        
        <!-- 參考線 -->
        <g ref="referenceLineRef" class="reference-line"></g>

        <!-- 座標軸 -->
        <g ref="xAxisRef" :transform="`translate(0, ${chartHeight})`" class="x-axis"></g>
        <g ref="yAxisLeftRef" class="y-axis-left"></g>
        <g ref="yAxisRightRef" :transform="`translate(${chartWidth}, 0)`" class="y-axis-right"></g>
        
        <!-- 標題 -->
        <g ref="titleLayerRef" class="title-layer"></g>
      </g>
    </svg>

    <!-- Vue 插槽：允許外部注入自定義 Tooltip -->
    <slot 
      name="tooltip" 
      :tooltip-data="tooltipData" 
      :tooltip-visible="tooltipVisible"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  // === 基礎配置 ===
  width: { type: Number, default: 800 },
  height: { type: Number, default: 600 },
  autoResize: { type: Boolean, default: false },
  debounceDelay: { type: Number, default: 150 },
  margin: { 
    type: Object, 
    default: () => ({ top: 80, right: 80, bottom: 80, left: 80 })
  },

  // === 數據配置 ===
  data: {
    type: Array,
    required: true,
    // 範例結構：
    // [
    //   { category: 'A類缺陷', value: 150, metadata: {...} },
    //   { category: 'B類缺陷', value: 120, metadata: {...} },
    //   { category: 'C類缺陷', value: 80, metadata: {...} },
    // ]
  },

  // === 欄位映射 ===
  categoryField: { type: String, default: 'category' },
  valueField: { type: String, default: 'value' },
  
  // === 排序配置 ===
  autoSort: { type: Boolean, default: true }, // 自動按數值降序排列
  sortOrder: { 
    type: String, 
    default: 'desc', // 'desc' | 'asc' | 'none'
    validator: (value) => ['desc', 'asc', 'none'].includes(value)
  },

  // === X 軸配置 ===
  xAxisLabel: { type: String, default: '' },
  xAxisFormat: { type: Function, default: null },
  xAxisAngle: { type: Number, default: -45 },

  // === Y 軸配置（左側：數值） ===
  yAxisLeftLabel: { type: String, default: '數量' },
  yAxisLeftFormat: { type: Function, default: null },
  valueDomain: { 
    type: Array, 
    default: null,
    validator: (value) => {
      if (value === null) return true;
      return Array.isArray(value) && 
             value.length === 2 && 
             typeof value[0] === 'number' && 
             typeof value[1] === 'number' && 
             value[1] > value[0];
    }
  },

  // === Y 軸配置（右側：百分比） ===
  yAxisRightLabel: { type: String, default: '累積百分比 (%)' },
  yAxisRightFormat: { type: Function, default: d => d + '%' },

  // === 長條圖配置 ===
  barColor: { type: String, default: '#3b82f6' },
  barHoverColor: { type: String, default: '#2563eb' },
  barPadding: { 
    type: Number, 
    default: 0.2,
    validator: (value) => value >= 0 && value <= 1
  },
  barBorderRadius: { type: Number, default: 2 },
  barCornerRadius: { type: Number, default: null }, // 別名，優先使用此值
  showValuesOnBars: { type: Boolean, default: false }, // 顯示長條上的數值

  // === 折線圖配置 ===
  lineColor: { type: String, default: '#ef4444' },
  lineWidth: { type: Number, default: 2 },
  showCumulativeLine: { type: Boolean, default: true }, // 顯示累積曲線
  showLinePoints: { type: Boolean, default: true },
  showCumulativePoints: { type: Boolean, default: null }, // 別名，優先使用此值
  pointRadius: { type: Number, default: 4 },
  pointFillColor: { type: String, default: '#ef4444' },

  // === 參考線配置 ===
  showReferenceLine: { type: Boolean, default: true }, // 顯示參考線
  referenceLinePercent: { 
    type: Number, 
    default: 80,
    validator: (value) => value >= 0 && value <= 100
  },
  referenceLineColor: { type: String, default: '#10b981' },
  referenceLineWidth: { type: Number, default: 2 },
  referenceLineDash: { type: Array, default: () => [5, 5] },
  
  // === 數據過濾配置 ===
  enableThresholdFilter: { type: Boolean, default: true }, // 啟用閾值過濾（將超過閾值的項目歸類為 Other）
  otherLabel: { type: String, default: 'Other' }, // "其他" 項目的標籤

  // === 視覺配置 ===
  title: { type: String, default: '' },
  valueFormat: { type: Function, default: d => d.toFixed(0) },
  animationDuration: { type: Number, default: 500 },

  // === 互動配置 ===
  enableTooltip: { type: Boolean, default: true },
  highlightMode: { 
    type: String, 
    default: 'bar', // 'bar' | 'none'
    validator: (value) => ['bar', 'none'].includes(value)
  },

  // === 企業級擴展點 ===
  customRenderers: { 
    type: Object, 
    default: () => ({})
  }
});

const emit = defineEmits([
  'bar-click',
  'bar-hover',
  'tooltip-show',
  'tooltip-hide',
  'chart-ready',
  'chart-resize'
]);

// === Refs ===
const containerRef = ref(null);
const svgRef = ref(null);
const barsLayerRef = ref(null);
const lineLayerRef = ref(null);
const referenceLineRef = ref(null);
const xAxisRef = ref(null);
const yAxisLeftRef = ref(null);
const yAxisRightRef = ref(null);
const titleLayerRef = ref(null);

const chartId = ref(`pareto-${Math.random().toString(36).substr(2, 9)}`);
const tooltipData = ref(null);
const tooltipVisible = ref(false);
const isChartReady = ref(false);

const observedWidth = ref(props.width);
const observedHeight = ref(props.height);
let resizeObserver = null;
let resizeDebounceTimer = null;

// === 計算屬性 ===
const effectiveWidth = computed(() => props.autoResize ? observedWidth.value : props.width);
const effectiveHeight = computed(() => props.autoResize ? observedHeight.value : props.height);

const chartWidth = computed(() => effectiveWidth.value - props.margin.left - props.margin.right);
const chartHeight = computed(() => effectiveHeight.value - props.margin.top - props.margin.bottom);

// 處理 prop 別名
const effectiveBarRadius = computed(() => {
  return props.barCornerRadius !== null ? props.barCornerRadius : props.barBorderRadius;
});

const effectiveShowLinePoints = computed(() => {
  return props.showCumulativePoints !== null ? props.showCumulativePoints : props.showLinePoints;
});

const effectiveShowValues = computed(() => {
  return props.showValuesOnBars;
});

/**
 * 排序後的數據
 */
const sortedData = computed(() => {
  if (!props.data || props.data.length === 0) return [];
  
  const dataCopy = [...props.data];
  
  if (!props.autoSort || props.sortOrder === 'none') {
    return dataCopy;
  }
  
  return dataCopy.sort((a, b) => {
    const valueA = a[props.valueField] ?? 0;
    const valueB = b[props.valueField] ?? 0;
    return props.sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
  });
});

/**
 * 計算累積數據（包含累積百分比）
 * 如果啟用閾值過濾，將超過閾值的項目歸類為 "Other"
 */
const cumulativeData = computed(() => {
  const total = d3.sum(sortedData.value, d => d[props.valueField] ?? 0);
  if (total === 0) return [];
  
  // 如果不啟用閾值過濾，直接計算累積百分比
  if (!props.enableThresholdFilter) {
    let cumulative = 0;
    return sortedData.value.map(d => {
      const value = d[props.valueField] ?? 0;
      cumulative += value;
      const cumulativePercent = (cumulative / total) * 100;
      
      return {
        ...d,
        cumulative,
        cumulativePercent
      };
    });
  }
  
  // 啟用閾值過濾：找到累積百分比超過閾值的位置
  let cumulative = 0;
  let thresholdIndex = sortedData.value.length;
  
  for (let i = 0; i < sortedData.value.length; i++) {
    const value = sortedData.value[i][props.valueField] ?? 0;
    cumulative += value;
    const cumulativePercent = (cumulative / total) * 100;
    
    if (cumulativePercent >= props.referenceLinePercent) {
      thresholdIndex = i + 1;
      break;
    }
  }
  
  // 分離主要項目和其他項目
  const mainItems = sortedData.value.slice(0, thresholdIndex);
  const otherItems = sortedData.value.slice(thresholdIndex);
  
  // 計算主要項目的累積數據
  cumulative = 0;
  const result = mainItems.map(d => {
    const value = d[props.valueField] ?? 0;
    cumulative += value;
    const cumulativePercent = (cumulative / total) * 100;
    
    return {
      ...d,
      cumulative,
      cumulativePercent
    };
  });
  
  // 如果有其他項目，合併為 "Other"
  if (otherItems.length > 0) {
    const otherCount = d3.sum(otherItems, d => d[props.valueField] ?? 0);
    cumulative += otherCount;
    const cumulativePercent = (cumulative / total) * 100;
    
    result.push({
      [props.categoryField]: props.otherLabel,
      [props.valueField]: otherCount,
      cumulative,
      cumulativePercent,
      isOther: true, // 標記為 "其他" 項目
      originalItems: otherItems // 保留原始項目供 tooltip 使用
    });
  }
  
  return result;
});

/**
 * X 軸 Scale（Band Scale）
 */
const xScale = computed(() => {
  return d3.scaleBand()
    .domain(cumulativeData.value.map(d => d[props.categoryField]))
    .range([0, chartWidth.value])
    .padding(props.barPadding);
});

/**
 * Y 軸 Scale（左側：數值）
 */
const yScaleLeft = computed(() => {
  let domain;
  if (props.valueDomain) {
    domain = props.valueDomain;
  } else {
    const maxValue = d3.max(cumulativeData.value, d => d[props.valueField] ?? 0) ?? 100;
    domain = [0, maxValue * 1.1]; // 增加 10% 空間
  }
  
  return d3.scaleLinear()
    .domain(domain)
    .range([chartHeight.value, 0])
    .nice();
});

/**
 * Y 軸 Scale（右側：百分比）
 */
const yScaleRight = computed(() => {
  return d3.scaleLinear()
    .domain([0, 100])
    .range([chartHeight.value, 0]);
});

// === 渲染函數 ===

/**
 * 渲染長條圖
 */
const renderBars = () => {
  if (!barsLayerRef.value) return;

  const barsLayer = d3.select(barsLayerRef.value);

  barsLayer.selectAll('.pareto-bar')
    .data(cumulativeData.value, d => d[props.categoryField])
    .join(
      enter => enter.append('rect')
        .attr('class', 'pareto-bar')
        .attr('x', d => xScale.value(d[props.categoryField]))
        .attr('y', chartHeight.value)
        .attr('width', xScale.value.bandwidth())
        .attr('height', 0)
        .attr('rx', effectiveBarRadius.value)
        .attr('ry', effectiveBarRadius.value)
        .style('fill', props.barColor)
        .style('cursor', 'pointer')
        .on('mouseenter', handleBarHover)
        .on('mouseleave', handleBarLeave)
        .on('click', handleBarClick)
        .call(enter => enter.transition()
          .duration(props.animationDuration)
          .attr('y', d => yScaleLeft.value(d[props.valueField] ?? 0))
          .attr('height', d => chartHeight.value - yScaleLeft.value(d[props.valueField] ?? 0))
        ),
      update => update
        .style('fill', props.barColor)  // 確保顏色更新
        .call(update => update.interrupt().transition()
          .duration(props.animationDuration)
          .attr('x', d => xScale.value(d[props.categoryField]))
          .attr('y', d => yScaleLeft.value(d[props.valueField] ?? 0))
          .attr('width', xScale.value.bandwidth())
          .attr('height', d => chartHeight.value - yScaleLeft.value(d[props.valueField] ?? 0))
          .attr('rx', effectiveBarRadius.value)
          .attr('ry', effectiveBarRadius.value)
        ),
      exit => exit.transition()
        .duration(props.animationDuration)
        .attr('y', chartHeight.value)
        .attr('height', 0)
        .remove()
    );

  // 渲染數值標籤
  if (effectiveShowValues.value) {
    barsLayer.selectAll('.bar-value')
      .data(cumulativeData.value, d => d[props.categoryField])
      .join(
        enter => enter.append('text')
          .attr('class', 'bar-value')
          .attr('x', d => xScale.value(d[props.categoryField]) + xScale.value.bandwidth() / 2)
          .attr('y', chartHeight.value)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('fill', '#374151')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .text(d => props.valueFormat(d[props.valueField] ?? 0))
          .call(enter => enter.transition()
            .duration(props.animationDuration)
            .attr('y', d => yScaleLeft.value(d[props.valueField] ?? 0) - 5)
            .style('opacity', 1)
          ),
        update => update
          .call(update => update.interrupt().transition()
            .duration(props.animationDuration)
            .attr('x', d => xScale.value(d[props.categoryField]) + xScale.value.bandwidth() / 2)
            .attr('y', d => yScaleLeft.value(d[props.valueField] ?? 0) - 5)
            .text(d => props.valueFormat(d[props.valueField] ?? 0))
            .style('opacity', 1)
          ),
        exit => exit.transition()
          .duration(props.animationDuration)
          .style('opacity', 0)
          .remove()
      );
  } else {
    // 當不顯示數值時，清除所有標籤
    barsLayer.selectAll('.bar-value')
      .transition()
      .duration(props.animationDuration)
      .style('opacity', 0)
      .remove();
  }
};

/**
 * 渲染累積百分比折線圖
 */
const renderLine = () => {
  if (!lineLayerRef.value) return;

  const lineLayer = d3.select(lineLayerRef.value);

  // 如果不顯示累積曲線，清除所有元素並返回
  if (!props.showCumulativeLine) {
    lineLayer.selectAll('.cumulative-line').remove();
    lineLayer.selectAll('.line-point').remove();
    return;
  }

  // 定義折線生成器
  const line = d3.line()
    .x(d => xScale.value(d[props.categoryField]) + xScale.value.bandwidth() / 2)
    .y(d => yScaleRight.value(d.cumulativePercent))
    .curve(d3.curveMonotoneX);

  // 渲染折線路徑
  const pathData = lineLayer.selectAll('.cumulative-line')
    .data([cumulativeData.value]);

  pathData.join(
    enter => {
      const path = enter.append('path')
        .attr('class', 'cumulative-line')
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', props.lineColor)
        .style('stroke-width', props.lineWidth);
      
      // 路徑動畫
      const pathNode = path.node();
      if (pathNode) {
        const totalLength = pathNode.getTotalLength();
        path
          .attr('stroke-dasharray', totalLength + ' ' + totalLength)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(props.animationDuration)
          .attr('stroke-dashoffset', 0);
      }
      
      return path;
    },
    update => update
      .style('stroke', props.lineColor)  // 確保線條顏色更新
      .style('stroke-width', props.lineWidth)  // 確保線條寬度更新
      .interrupt().transition()
      .duration(props.animationDuration)
      .attr('d', line)
  );

  // 渲染折線上的點
  if (effectiveShowLinePoints.value) {
    lineLayer.selectAll('.line-point')
      .data(cumulativeData.value, d => d[props.categoryField])
      .join(
        enter => enter.append('circle')
          .attr('class', 'line-point')
          .attr('cx', d => xScale.value(d[props.categoryField]) + xScale.value.bandwidth() / 2)
          .attr('cy', d => yScaleRight.value(d.cumulativePercent))
          .attr('r', 0)
          .style('fill', props.pointFillColor)
          .style('stroke', '#fff')
          .style('stroke-width', 2)
          .call(enter => enter.transition()
            .delay(props.animationDuration / 2)
            .duration(props.animationDuration / 2)
            .attr('r', props.pointRadius)
          ),
        update => update
          .style('fill', props.pointFillColor)  // 確保點的顏色更新
          .interrupt().transition()
          .duration(props.animationDuration)
          .attr('cx', d => xScale.value(d[props.categoryField]) + xScale.value.bandwidth() / 2)
          .attr('cy', d => yScaleRight.value(d.cumulativePercent))
          .attr('r', props.pointRadius),
        exit => exit.transition()
          .duration(props.animationDuration)
          .attr('r', 0)
          .remove()
      );
  } else {
    lineLayer.selectAll('.line-point').remove();
  }

  // 渲染累積百分比數值標籤
  if (effectiveShowLinePoints.value) {
    lineLayer.selectAll('.cumulative-label')
      .data(cumulativeData.value, d => d[props.categoryField])
      .join(
        enter => enter.append('text')
          .attr('class', 'cumulative-label')
          .attr('x', d => xScale.value(d[props.categoryField]) + xScale.value.bandwidth() / 2)
          .attr('y', d => yScaleRight.value(d.cumulativePercent) - 8)
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .style('font-weight', '600')
          .style('fill', props.lineColor)
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .text(d => `${d.cumulativePercent.toFixed(1)}%`)
          .call(enter => enter.transition()
            .delay(props.animationDuration / 2)
            .duration(props.animationDuration / 2)
            .style('opacity', 1)
          ),
        update => update
          .style('fill', props.lineColor)
          .interrupt().transition()
          .duration(props.animationDuration)
          .attr('x', d => xScale.value(d[props.categoryField]) + xScale.value.bandwidth() / 2)
          .attr('y', d => yScaleRight.value(d.cumulativePercent) - 8)
          .text(d => `${d.cumulativePercent.toFixed(1)}%`)
          .style('opacity', 1),
        exit => exit.transition()
          .duration(props.animationDuration)
          .style('opacity', 0)
          .remove()
      );
  } else {
    lineLayer.selectAll('.cumulative-label').remove();
  }
};

/**
 * 渲染參考線
 */
const renderReferenceLine = () => {
  if (!referenceLineRef.value) return;

  const refLayer = d3.select(referenceLineRef.value);
  
  // 根據 showReferenceLine 決定數據
  const referenceData = props.showReferenceLine ? [{ percent: props.referenceLinePercent }] : [];
  const yRef = yScaleRight.value(props.referenceLinePercent);

  // 繪製虛線（使用 join）
  refLayer.selectAll('.reference-line-path')
    .data(referenceData)
    .join(
      enter => enter.append('line')
        .attr('class', 'reference-line-path')
        .attr('x1', 0)
        .attr('x2', chartWidth.value)
        .attr('y1', yRef)
        .attr('y2', yRef)
        .style('stroke', props.referenceLineColor)
        .style('stroke-width', props.referenceLineWidth)
        .style('stroke-dasharray', props.referenceLineDash.join(','))
        .style('opacity', 0)
        .call(enter => enter.transition()
          .duration(props.animationDuration)
          .style('opacity', 0.8)
        ),
      update => update
        .call(update => update.transition()
          .duration(props.animationDuration)
          .attr('x2', chartWidth.value)
          .attr('y1', yRef)
          .attr('y2', yRef)
          .style('stroke', props.referenceLineColor)
          .style('stroke-width', props.referenceLineWidth)
          .style('stroke-dasharray', props.referenceLineDash.join(','))
          .style('opacity', 0.8)
        ),
      exit => exit.transition()
        .duration(props.animationDuration)
        .style('opacity', 0)
        .remove()
    );

  // 標籤（使用 join）
  refLayer.selectAll('.reference-line-label')
    .data(referenceData)
    .join(
      enter => enter.append('text')
        .attr('class', 'reference-line-label')
        .attr('x', chartWidth.value - 5)
        .attr('y', yRef + 4)
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', props.referenceLineColor)
        .style('text-anchor', 'end')
        .text(props.referenceLinePercent + '%')
        .style('opacity', 0)
        .call(enter => enter.transition()
          .duration(props.animationDuration)
          .style('opacity', 1)
        ),
      update => update
        .call(update => update.transition()
          .duration(props.animationDuration)
          .attr('x', chartWidth.value - 5)
          .attr('y', yRef + 4)
          .style('fill', props.referenceLineColor)
          .text(props.referenceLinePercent + '%')
          .style('opacity', 1)
        ),
      exit => exit.transition()
        .duration(props.animationDuration)
        .style('opacity', 0)
        .remove()
    );
};

/**
 * 渲染 X 軸
 */
const renderXAxis = () => {
  if (!xAxisRef.value) return;

  const xAxis = d3.axisBottom(xScale.value)
    .tickFormat(props.xAxisFormat || (d => d));

  const xAxisSelection = d3.select(xAxisRef.value);
  xAxisSelection
    .interrupt()
    .transition()
    .duration(props.animationDuration)
    .call(xAxis);

  if (props.xAxisAngle !== 0) {
    xAxisSelection.selectAll('text')
      .attr('transform', `rotate(${props.xAxisAngle})`)
      .style('text-anchor', props.xAxisAngle < 0 ? 'end' : 'start')
      .attr('dx', props.xAxisAngle < 0 ? '-0.5em' : '0.5em')
      .attr('dy', '0.5em');
  }

  if (props.xAxisLabel) {
    xAxisSelection.selectAll('.axis-label').remove();
    xAxisSelection.append('text')
      .attr('class', 'axis-label')
      .attr('x', chartWidth.value / 2)
      .attr('y', 50)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(props.xAxisLabel);
  }
};

/**
 * 渲染左側 Y 軸（數值）
 */
const renderYAxisLeft = () => {
  if (!yAxisLeftRef.value) return;

  const yAxis = d3.axisLeft(yScaleLeft.value)
    .tickFormat(props.yAxisLeftFormat || (d => d));

  const yAxisSelection = d3.select(yAxisLeftRef.value);
  yAxisSelection
    .interrupt()
    .transition()
    .duration(props.animationDuration)
    .call(yAxis);

  if (props.yAxisLeftLabel) {
    yAxisSelection.selectAll('.axis-label').remove();
    yAxisSelection.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight.value / 2)
      .attr('y', -50)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', props.barColor)
      .text(props.yAxisLeftLabel);
  }
};

/**
 * 渲染右側 Y 軸（百分比）
 */
const renderYAxisRight = () => {
  if (!yAxisRightRef.value) return;

  const yAxis = d3.axisRight(yScaleRight.value)
    .tickFormat(props.yAxisRightFormat);

  const yAxisSelection = d3.select(yAxisRightRef.value);
  yAxisSelection
    .interrupt()
    .transition()
    .duration(props.animationDuration)
    .call(yAxis);

  if (props.yAxisRightLabel) {
    yAxisSelection.selectAll('.axis-label').remove();
    yAxisSelection.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight.value / 2)
      .attr('y', 50)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', props.lineColor)
      .text(props.yAxisRightLabel);
  }
};

/**
 * 渲染標題
 */
const renderTitle = () => {
  if (!props.title || !titleLayerRef.value) return;

  const titleSelection = d3.select(titleLayerRef.value);
  titleSelection.selectAll('*').remove();

  titleSelection.append('text')
    .attr('x', chartWidth.value / 2)
    .attr('y', -30)
    .style('text-anchor', 'middle')
    .style('font-size', '18px')
    .style('font-weight', '700')
    .style('fill', '#1f2937')
    .text(props.title);
};

/**
 * 處理長條 hover
 */
const handleBarHover = function(event, d) {
  if (!props.enableTooltip) return;

  d3.select(this)
    .transition()
    .duration(150)
    .style('fill', props.barHoverColor);

  tooltipData.value = d;
  tooltipVisible.value = true;

  emit('bar-hover', { 
    event, 
    data: d,
    clientX: event.clientX,
    clientY: event.clientY
  });
  emit('tooltip-show', {
    data: tooltipData.value,
    position: {
      pageX: event.clientX,
      pageY: event.clientY
    }
  });
};

/**
 * 處理長條 leave
 */
const handleBarLeave = function(_event, _d) {
  d3.select(this)
    .transition()
    .duration(150)
    .style('fill', props.barColor);

  tooltipVisible.value = false;
  emit('tooltip-hide');
};

/**
 * 處理長條點擊
 */
const handleBarClick = function(event, d) {
  emit('bar-click', { event, data: d });
};

/**
 * 主渲染函數
 */
const render = () => {
  if (!svgRef.value) return;
  
  renderBars();
  renderLine();
  renderReferenceLine();
  renderXAxis();
  renderYAxisLeft();
  renderYAxisRight();
  renderTitle();
  
  // 只 emit 一次
  if (!isChartReady.value) {
    isChartReady.value = true;
    emit('chart-ready');
  }
};

/**
 * 強制重新渲染（參考 ParetoChart）
 */
const forceRerender = () => {
  if (svgRef.value) {
    render();
  }
};

// 暴露方法供父組件調用
defineExpose({
  forceRerender,
  render
});

// === 響應式渲染 ===
// 監聽數據變化
watch(
  () => props.data,
  () => {
    if (svgRef.value) {
      render();
    }
  },
  { deep: true }
);

// 監聽視覺樣式變化（參考 ParetoChart 的分離監聽策略）
watch(
  [
    () => props.barColor,
    () => props.lineColor,
    () => props.barPadding,
    () => props.showValuesOnBars,
    () => props.showCumulativeLine,
    () => props.showCumulativePoints,
    () => props.showReferenceLine,
    () => props.referenceLinePercent,
    () => props.barBorderRadius,
    () => props.barCornerRadius,
    () => props.showLinePoints,
    () => props.title,
    () => props.enableThresholdFilter,
    () => props.otherLabel
  ],
  () => {
    if (svgRef.value) {
      render();
    }
  }
);

// 監聽尺寸變化
watch(
  [effectiveWidth, effectiveHeight],
  () => {
    if (svgRef.value) {
      render();
    }
  }
);

// === 生命週期 ===
onMounted(() => {
  if (props.autoResize && containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      if (resizeDebounceTimer) {
        clearTimeout(resizeDebounceTimer);
      }
      
      resizeDebounceTimer = setTimeout(() => {
        if (!containerRef.value) return;
        
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          observedWidth.value = width;
          observedHeight.value = height;
          emit('chart-resize', { width, height });
        }
      }, props.debounceDelay);
    });
    
    resizeObserver.observe(containerRef.value);
  }
  
  render();
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  
  if (resizeDebounceTimer) {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = null;
  }
});
</script>

<style scoped>
.enterprise-pareto {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.enterprise-pareto svg {
  display: block;
}

:deep(.x-axis) text,
:deep(.y-axis-left) text,
:deep(.y-axis-right) text {
  font-size: 12px;
  fill: #6b7280;
}

:deep(.x-axis) path,
:deep(.x-axis) line,
:deep(.y-axis-left) path,
:deep(.y-axis-left) line,
:deep(.y-axis-right) path,
:deep(.y-axis-right) line {
  stroke: #d1d5db;
}
</style>
