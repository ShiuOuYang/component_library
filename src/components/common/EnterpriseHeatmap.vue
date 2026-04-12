<template>
  <div 
    ref="containerRef" 
    class="enterprise-heatmap"
    :class="{ 'is-auto-resize': autoResize }"
    :style="autoResize ? { width: '100%', height: '100%' } : { width: width + 'px', height: height + 'px' }"
  >
    <svg ref="svgRef" :width="effectiveWidth" :height="svgHeight">
      <defs>
        <!-- Clip Path -->
        <clipPath :id="`clip-${chartId}`">
          <rect :width="chartWidth" :height="chartHeight" />
        </clipPath>
        
        <!-- 🔧 Color Legend Gradient（優化：使用 linearGradient 取代 100 個 rect） -->
        <linearGradient 
          v-if="showColorLegend"
          :id="`legend-gradient-${chartId}`" 
          :x1="colorLegendPosition === 'right' ? '0%' : '0%'"
          :y1="colorLegendPosition === 'right' ? '0%' : '0%'"
          :x2="colorLegendPosition === 'right' ? '0%' : '100%'"
          :y2="colorLegendPosition === 'right' ? '100%' : '0%'"
        >
          <stop 
            v-for="stop in gradientStops" 
            :key="stop.offset"
            :offset="`${stop.offset}%`" 
            :stop-color="stop.color" 
          />
        </linearGradient>
      </defs>

      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- 圖層順序：背景 -> 熱力圖單元格 -> 座標軸 -> 圖例 -> 標題 -->
        
        <!-- ✅ 熱力圖單元格容器：使用 clip-path 防止超出範圍 -->
        <g :clip-path="`url(#clip-${chartId})`">
          <g ref="cellLayerRef" class="cell-layer"></g>
          
          <!-- ✅ Brush 圖層（必須在最上層以接收事件） -->
          <g v-if="enableBrush" ref="brushLayerRef" class="brush-layer"></g>
        </g>

        <!-- 座標軸 -->
        <g ref="xAxisRef" :transform="`translate(0, ${chartHeight})`" class="x-axis"></g>
        <g ref="yAxisRef" class="y-axis"></g>
        
        <!-- 色階圖例 -->
        <g v-if="showColorLegend" ref="colorLegendRef" class="color-legend"></g>
        
        <!-- 標題 -->
        <g ref="titleLayerRef" class="title-layer"></g>
      </g>
    </svg>

    <!-- ✅ 重置縮放按鈕 -->
    <button
  v-if="resetBtnShow && enableBrush"
  @click="handleResetZoom"
  class="
    absolute top-2 right-2 px-3 py-1.5
    bg-white/30 hover:bg-white/80
    text-gray-600 text-sm
    rounded-md border border-gray-200
    backdrop-blur
    shadow-sm
    opacity-70 hover:opacity-100
    transition-all duration-200 z-10
  "
>
  🔄 Reset
</button>

    <!-- Vue 插槽：允許外部注入自定義 Tooltip -->
    <slot 
      name="tooltip" 
      :tooltip-data="tooltipData" 
      :tooltip-visible="tooltipVisible"
    />
  </div>
</template>

<script setup>
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  // === 基礎配置 ===
  width: { type: Number, default: 800 },
  height: { type: Number, default: 600 },
  autoResize: { type: Boolean, default: false }, // 啟用自動響應容器大小
  debounceDelay: { type: Number, default: 150 }, // ResizeObserver 防抖延遲（毫秒）
  margin: { 
    type: Object, 
    default: () => ({ top: 80, right: 120, bottom: 80, left: 100 })
  },

  // === 數據配置 ===
  data: {
    type: Array,
    required: true,
    // 範例結構：
    // [
    //   { x: 'A', y: 'Product1', value: 23.5, metadata: {...} },
    //   { x: 'B', y: 'Product1', value: 45.2, metadata: {...} },
    //   { x: 'A', y: 'Product2', value: 67.8, metadata: {...} },
    // ]
  },

  // === 欄位映射（支援靈活的數據結構） ===
  xField: { type: String, default: 'x' },          // X 軸欄位名稱
  yField: { type: String, default: 'y' },          // Y 軸欄位名稱
  valueField: { type: String, default: 'value' },  // 數值欄位名稱
  
  // === X 軸配置 ===
  xDomain: { type: Array, default: null },  // 自訂 X 軸順序
  xAxisLabel: { type: String, default: '' },
  xAxisFormat: { type: Function, default: null },
  xAxisAngle: { type: Number, default: -45 }, // X 軸標籤旋轉角度

  // === Y 軸配置 ===
  yDomain: { type: Array, default: null },  // 自訂 Y 軸順序
  yAxisLabel: { type: String, default: '' },
  yAxisFormat: { type: Function, default: null },

  // === 色階配置 ===
  colorScheme: { 
    type: String, 
    default: 'interpolateRdYlGn',  // D3 內建色階：interpolateRdYlGn, interpolateViridis, interpolateBlues 等
    validator: (value) => {
      return value.startsWith('interpolate') || value.startsWith('scheme');
    }
  },
  colorRange: { 
    type: Array, 
    default: null // 自訂色階範圍（若指定則優先於 colorScheme）
  },
  valueDomain: { type: Array, default: null }, // 數值範圍 [min, max]，null 則自動計算
  reverseColorScale: { type: Boolean, default: false }, // 反轉色階（高值 -> 冷色，低值 -> 暖色）

  // === 單元格配置 ===
  cellPadding: { type: Number, default: 2 },      // 單元格間距（像素）
  cellBorderRadius: { type: Number, default: 2 }, // 單元格圓角
  cellBorderWidth: { type: Number, default: 1 },  // 單元格邊框寬度
  cellBorderColor: { type: String, default: '#fff' }, // 單元格邊框顏色
  showCellValues: { type: Boolean, default: false }, // 在單元格內顯示數值
  cellValueFormat: { type: Function, default: d => d.toFixed(1) }, // 單元格內數值格式化

  // === 視覺配置 ===
  title: { type: String, default: '' },
  showColorLegend: { type: Boolean, default: true }, // 顯示色階圖例
  colorLegendPosition: { 
    type: String, 
    default: 'right',  // 'right' | 'bottom'
    validator: (value) => ['right', 'bottom'].includes(value)
  },
  colorLegendTitle: { type: String, default: 'Value' },
  animationDuration: { type: Number, default: 500 },

  // === 互動配置 ===
  enableBrush: { type: Boolean, default: true },  // 啟用框選縮放功能
  enableTooltip: { type: Boolean, default: true }, // 啟用 Tooltip
  highlightMode: { 
    type: String, 
    default: 'cell',  // 'cell' | 'row' | 'column' | 'both'
    validator: (value) => ['cell', 'row', 'column', 'both'].includes(value)
  },

  // === 遺漏值處理 ===
  missingValueColor: { type: String, default: '#e0e0e0' }, // 無數據單元格顏色
  showMissingValues: { type: Boolean, default: true },     // 是否顯示無數據單元格

  // ✅ 企業級擴展點：允許完全自定義渲染邏輯
  customRenderers: { 
    type: Object, 
    default: () => ({
      // cell: (selection, data, colorScale) => { /* 自訂單元格渲染 */ },
      // tooltip: (data) => { /* 自訂 Tooltip 內容 */ }
    }) 
  }
});

const emit = defineEmits([
  'cell-click',       // 單元格點擊事件
  'cell-hover',       // 單元格懸停事件
  'tooltip-show',     // Tooltip 顯示
  'tooltip-hide',     // Tooltip 隱藏
  'chart-ready',      // 圖表渲染完成
  'chart-resize',     // 圖表尺寸變化
  'selection-change', // Brush 選取範圍改變
  'zoom-reset'        // 重置縮放
]);

// === Refs ===
const containerRef = ref(null);
const svgRef = ref(null);
const cellLayerRef = ref(null);
const xAxisRef = ref(null);
const yAxisRef = ref(null);
const colorLegendRef = ref(null);
const titleLayerRef = ref(null);
const brushLayerRef = ref(null);

const chartId = ref(`heatmap-${Math.random().toString(36).substr(2, 9)}`);
const tooltipData = ref(null);
const tooltipVisible = ref(false);
const resetBtnShow = ref(false);

const observedWidth = ref(props.width);
const observedHeight = ref(props.height);
let resizeObserver = null;
let resizeDebounceTimer = null;

// 🔧 保存 brush 實例（解決清除選取框 bug）
const brushInstance = ref(null);

const currentXDomain = ref(null);
const currentYDomain = ref(null);

// === 計算屬性 ===
const effectiveWidth = computed(() => props.autoResize ? observedWidth.value : props.width);
const effectiveHeight = computed(() => props.autoResize ? observedHeight.value : props.height);

// 當圖例在底部時，增加 SVG 高度以容納圖例
const svgHeight = computed(() => {
  let baseHeight = effectiveHeight.value;
  if (props.showColorLegend && props.colorLegendPosition === 'bottom') {
    return baseHeight + 40; // 增加空間給底部圖例
  }
  return baseHeight;
});

const chartWidth = computed(() => effectiveWidth.value - props.margin.left - props.margin.right);
const chartHeight = computed(() => effectiveHeight.value - props.margin.top - props.margin.bottom);

/**
 * 計算原始 X 軸 domain
 */
const originalXDomain = computed(() => {
  if (props.xDomain) return props.xDomain;
  if (props.data.length === 0) return ['A']; // 🔧 空數據預設
  return [...new Set(props.data.map(d => d[props.xField]))].sort();
});

const originalYDomain = computed(() => {
  if (props.yDomain) return props.yDomain;
  if (props.data.length === 0) return ['1']; // 🔧 空數據預設
  return [...new Set(props.data.map(d => d[props.yField]))].sort();
});

/**
 * 計算當前有效的 X 軸 domain（考慮 Brush 選取）
 */
const effectiveXDomain = computed(() => {
  return currentXDomain.value || originalXDomain.value;
});

/**
 * 計算當前有效的 Y 軸 domain（考慮 Brush 選取）
 */
const effectiveYDomain = computed(() => {
  return currentYDomain.value || originalYDomain.value;
});

/**
 * 計算數值範圍 [min, max]
 */
const valueDomainComputed = computed(() => {
  if (props.valueDomain) return props.valueDomain;
  const values = props.data.map(d => d[props.valueField]).filter(v => v != null);
  if (values.length === 0) return [0, 100];
  
  const min = d3.min(values) ?? 0;
  const max = d3.max(values) ?? 100;
  
  // 🔧 min==max 時擴展範圍避免 scale 錯誤
  if (min === max) {
    return max === 0 ? [0, 1] : [min * 0.9, max * 1.1];
  }
  
  return [min, max];
});

/**
 * X 軸 Scale（Band Scale）
 */
const xScale = computed(() => {
  return d3.scaleBand()
    .domain(effectiveXDomain.value)
    .range([0, chartWidth.value])
    .padding(0);
});

/**
 * Y 軸 Scale（Band Scale）
 */
const yScale = computed(() => {
  return d3.scaleBand()
    .domain(effectiveYDomain.value)
    .range([0, chartHeight.value])
    .padding(0);
});

/**
 * 色階 Scale
 */
const colorScale = computed(() => {
  const [min, max] = valueDomainComputed.value;
  
  // 🔧 colorRange length < 2 的 fallback
  // 🔧 Null safety: 確保 colorRange 存在且長度足夠
  if (props.colorRange?.length >= 2) {
    const scale = d3.scaleLinear()
      .domain(d3.range(min, max, (max - min) / (props.colorRange.length - 1)).concat(max))
      .range(props.reverseColorScale ? [...props.colorRange].reverse() : props.colorRange);
    return scale;
  }
  
  const interpolator = d3[props.colorScheme] || d3.interpolateRdYlGn;
  return d3.scaleSequential(interpolator)
    .domain(props.reverseColorScale ? [max, min] : [min, max]);
});

// 🔧 優化：gradient stops 用於 linearGradient（10-20 stops）
const gradientStops = computed(() => {
  const [min, max] = valueDomainComputed.value;
  const numStops = 20;
  const stops = [];
  
  // 🔧 Null safety: 使用 optional chaining
  if (props.colorRange?.length >= 2) {
    // 使用 colorRange
    const range = props.reverseColorScale ? [...props.colorRange].reverse() : props.colorRange;
    range.forEach((color, i) => {
      stops.push({
        offset: (i / (range.length - 1)) * 100,
        color
      });
    });
  } else {
    // 使用 D3 interpolator
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
      const value = min + (max - min) * t;
      stops.push({
        offset: t * 100,
        color: colorScale.value(value)
      });
    }
  }
  
  return stops;
});

/**
 * 過濾後的數據（根據當前 domain）
 */
const filteredData = computed(() => {
  const xDomain = effectiveXDomain.value;
  const yDomain = effectiveYDomain.value;
  
  return props.data.filter(d => 
    xDomain.includes(d[props.xField]) && yDomain.includes(d[props.yField])
  );
});

/**
 * 構建數據映射表（用於快速查找）
 */
const dataMap = computed(() => {
  const map = new Map();
  filteredData.value.forEach(d => {
    const key = `${d[props.xField]}_${d[props.yField]}`;
    map.set(key, d);
  });
  return map;
});

// === 渲染函數 ===

/**
 * 渲染熱力圖單元格
 * 
 * @description 使用 D3 的 enter-update-exit 模式渲染熱力圖單元格，
 *              支援動畫過渡、自訂顏色、邊框、圓角等配置。
 */
const renderCells = () => {
  if (!cellLayerRef.value) return;

  const cellLayer = d3.select(cellLayerRef.value);
  
  // 準備渲染數據
  const renderData = [];
  effectiveXDomain.value.forEach(x => {
    effectiveYDomain.value.forEach(y => {
      const key = `${x}_${y}`;
      const dataPoint = dataMap.value.get(key);
      
      if (dataPoint || props.showMissingValues) {
        renderData.push({
          x,
          y,
          value: dataPoint ? dataPoint[props.valueField] : null,
          rawData: dataPoint
        });
      }
    });
  });

  // 檢查是否有自訂渲染器
  if (props.customRenderers.cell) {
    const cells = cellLayer.selectAll('.heatmap-cell')
      .data(renderData, d => `${d.x}_${d.y}`);
    
    props.customRenderers.cell(cells, renderData, colorScale.value);
    return;
  }

  // 預設渲染邏輯
  const cellWidth = Math.max(0, xScale.value.bandwidth() - props.cellPadding);
  const cellHeight = Math.max(0, yScale.value.bandwidth() - props.cellPadding);

  cellLayer.selectAll('.heatmap-cell')
    .data(renderData, d => `${d.x}_${d.y}`)
    .join(
      // Enter: 建立新儲存格
      enter => enter.append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', d => xScale.value(d.x) + props.cellPadding / 2)
        .attr('y', d => yScale.value(d.y) + props.cellPadding / 2)
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('rx', props.cellBorderRadius)
        .attr('ry', props.cellBorderRadius)
        .style('stroke', props.cellBorderColor)
        .style('stroke-width', props.cellBorderWidth)
        .style('cursor', 'pointer')
        .style('opacity', 0)
        .on('mouseenter', handleCellHover)
        .on('mouseleave', handleCellLeave)
        .on('click', handleCellClick)
        .call(enter => enter.transition()
          .duration(props.animationDuration)
          .style('opacity', 1)
        ),
      // Update: 更新現有儲存格
      update => update,
      // Exit: 移除不需要的儲存格
      exit => exit.transition()
        .duration(props.animationDuration)
        .style('opacity', 0)
        .remove()
    )
    // 對所有儲存格（enter + update）套用更新
    .transition()
    .duration(props.animationDuration)
    .attr('x', d => xScale.value(d.x) + props.cellPadding / 2)
    .attr('y', d => yScale.value(d.y) + props.cellPadding / 2)
    .attr('width', cellWidth)
    .attr('height', cellHeight)
    .attr('rx', props.cellBorderRadius)
    .attr('ry', props.cellBorderRadius)
    .style('fill', d => d.value != null ? colorScale.value(d.value) : props.missingValueColor)
    .style('opacity', 1);

  // 渲染單元格內數值（無論 showCellValues 為何都要調用，以處理移除）
  renderCellValues(renderData, cellWidth, cellHeight);
};

/**
 * 渲染單元格內的數值文字
 */
const renderCellValues = (renderData, cellWidth, cellHeight) => {
  const cellLayer = d3.select(cellLayerRef.value);
  
  // 根據 showCellValues 決定要渲染的資料
  const textData = props.showCellValues 
    ? renderData.filter(d => d.value != null) 
    : [];

  cellLayer.selectAll('.cell-value')
    .data(textData, d => `${d.x}_${d.y}`)
    .join(
      // Enter: 建立新文字
      enter => enter.append('text')
        .attr('class', 'cell-value')
        .attr('x', d => xScale.value(d.x) + xScale.value.bandwidth() / 2)
        .attr('y', d => yScale.value(d.y) + yScale.value.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-weight', '500')
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .style('fill', d => getContrastColor(colorScale.value(d.value)))
        .style('font-size', `${Math.min(cellWidth, cellHeight) / 3}px`)
        .style('opacity', 0)
        .text(d => props.cellValueFormat(d.value)),
      // Update: 更新現有文字
      update => update,
      // Exit: 移除不需要的文字
      exit => exit.transition()
        .duration(props.animationDuration)
        .style('opacity', 0)
        .remove()
    )
    // 對所有文字（enter + update）套用更新
    .transition()
    .duration(props.animationDuration)
    .attr('x', d => xScale.value(d.x) + xScale.value.bandwidth() / 2)
    .attr('y', d => yScale.value(d.y) + yScale.value.bandwidth() / 2)
    .style('fill', d => getContrastColor(colorScale.value(d.value)))
    .style('font-size', `${Math.min(cellWidth, cellHeight) / 3}px`)
    .style('opacity', 1)
    .text(d => props.cellValueFormat(d.value));
};


/**
 * 計算對比色（用於單元格內文字）
 */
const getContrastColor = (hexColor) => {
  const rgb = d3.rgb(hexColor);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

/**
 * 處理單元格懸停事件
 */
const handleCellHover = function(event, d) {
  if (!props.enableTooltip) return;

  // 高亮效果
  const cell = d3.select(this);
  cell.style('stroke', '#000')
    .style('stroke-width', 2);

  // 根據高亮模式設置效果
  const cellLayer = d3.select(cellLayerRef.value);
  const allCells = cellLayer.selectAll('.heatmap-cell');
  
  if (props.highlightMode === 'row' || props.highlightMode === 'both') {
    allCells
      .filter(function(datum) { 
        return datum.y === d.y && this !== cell.node();
      })
      .style('opacity', 0.5);
  }
  
  if (props.highlightMode === 'column' || props.highlightMode === 'both') {
    allCells
      .filter(function(datum) { 
        return datum.x === d.x && this !== cell.node();
      })
      .style('opacity', 0.5);
  }

  // 顯示 Tooltip
  tooltipData.value = d.rawData || { 
    [props.xField]: d.x, 
    [props.yField]: d.y, 
    [props.valueField]: d.value 
  };
  tooltipVisible.value = true;

  emit('cell-hover', { 
    event, 
    data: d.rawData || d,
    clientX: event.clientX,
    clientY: event.clientY
  });
  emit('tooltip-show', {
    data: tooltipData.value,
    position: {
      pageX: event.pageX,
      pageY: event.pageY
    }
  });
};

/**
 * 處理單元格離開事件
 */
const handleCellLeave = function(event, d) {
  // 恢復樣式
  d3.select(this)
    .style('stroke', props.cellBorderColor)
    .style('stroke-width', props.cellBorderWidth);

  d3.select(cellLayerRef.value)
    .selectAll('.heatmap-cell')
    .style('opacity', 1);

  tooltipVisible.value = false;
  emit('tooltip-hide');
};

/**
 * 處理單元格點擊事件
 */
const handleCellClick = function(event, d) {
  emit('cell-click', { event, data: d.rawData || d });
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
    .transition()
    .duration(props.animationDuration)
    .call(xAxis);

  // 旋轉 X 軸標籤
  if (props.xAxisAngle !== 0) {
    xAxisSelection.selectAll('text')
      .attr('transform', `rotate(${props.xAxisAngle})`)
      .style('text-anchor', props.xAxisAngle < 0 ? 'end' : 'start')
      .attr('dx', props.xAxisAngle < 0 ? '-0.5em' : '0.5em')
      .attr('dy', '0.5em');
  }

  // 添加 X 軸標籤
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
 * 渲染 Y 軸
 */
const renderYAxis = () => {
  if (!yAxisRef.value) return;

  const yAxis = d3.axisLeft(yScale.value)
    .tickFormat(props.yAxisFormat || (d => d));

  const yAxisSelection = d3.select(yAxisRef.value);
  yAxisSelection
    .transition()
    .duration(props.animationDuration)
    .call(yAxis);

  // 添加 Y 軸標籤
  if (props.yAxisLabel) {
    yAxisSelection.selectAll('.axis-label').remove();
    yAxisSelection.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight.value / 2)
      .attr('y', -60)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(props.yAxisLabel);
  }
};

/**
 * 渲染色階圖例
 * 🔧 優化：使用 linearGradient 而非 100 個 rect
 */
const renderColorLegend = () => {
  if (!props.showColorLegend || !colorLegendRef.value) return;

  const legendSelection = d3.select(colorLegendRef.value);
  legendSelection.selectAll('*').remove();

  const [min, max] = valueDomainComputed.value;
  // 根據圖表大小動態調整圖例尺寸
  const legendWidth = props.colorLegendPosition === 'right' ? 20 : Math.min(chartWidth.value * 0.5, 300);
  const legendHeight = props.colorLegendPosition === 'right' ? Math.min(chartHeight.value * 0.6, 200) : 20;
  const legendX = props.colorLegendPosition === 'right' ? chartWidth.value + 20 : chartWidth.value / 2 - legendWidth / 2;
  const legendY = props.colorLegendPosition === 'right' ? chartHeight.value / 2 - legendHeight / 2 : chartHeight.value + 55;

  // 使用 gradient 繪製色階條
  legendSelection.append('rect')
    .attr('x', legendX)
    .attr('y', legendY)
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', `url(#legend-gradient-${chartId.value})`);

  // 刻度軸
  const legendScale = props.colorLegendPosition === 'right' 
    ? d3.scaleLinear().domain([min, max]).range([legendY, legendY + legendHeight])
    : d3.scaleLinear().domain([min, max]).range([legendX, legendX + legendWidth]);

  const legendAxis = props.colorLegendPosition === 'right'
    ? d3.axisRight(legendScale).ticks(5)
    : d3.axisBottom(legendScale).ticks(5);

  const axisX = props.colorLegendPosition === 'right' ? legendX + legendWidth : 0;
  const axisY = props.colorLegendPosition === 'right' ? 0 : legendY + legendHeight;

  legendSelection.append('g')
    .attr('transform', `translate(${axisX}, ${axisY})`)
    .call(legendAxis);

  if (props.colorLegendTitle) {
    const titleX = props.colorLegendPosition === 'right' ? legendX + legendWidth / 2 : legendX-20 ;
    const titleY = props.colorLegendPosition === 'right' ? legendY - 10 : legendY+10 ;

    legendSelection.append('text')
      .attr('x', titleX)
      .attr('y', titleY)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(props.colorLegendTitle);
  }
};

/**
 * 渲染圖表標題
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
 * 初始化 Brush（僅在首次或重新創建時調用）
 * 🔧 優化：保存 brush 實例，分離初始化和更新
 */
const initBrush = () => {
  if (!props.enableBrush || !brushLayerRef.value) return;

  // 創建新的 brush 實例並保存
  brushInstance.value = d3.brush()
    .on('end', handleBrushSelection);

  // 清空現有內容並綁定新 brush
  const brushLayer = d3.select(brushLayerRef.value);
  brushLayer.selectAll('*').remove();
  brushLayer.call(brushInstance.value);

  // 設置初始範圍
  updateBrushExtent();
  
  // 設置 Tooltip 穿透檢測
  setupTooltipDetection(brushLayer.select('.overlay'));
};

/**
 * 更新 Brush 可拖曳範圍（當 chart 尺寸改變時）
 * 🔧 優化：只更新 extent，不重新創建 brush
 */
const updateBrushExtent = () => {
  if (!brushInstance.value || !brushLayerRef.value || !xScale.value || !yScale.value) return;

  // 更新 brush extent
  brushInstance.value.extent([[0, 0], [chartWidth.value, chartHeight.value]]);

  // 重新應用 brush（讓 extent 生效）
  d3.select(brushLayerRef.value).call(brushInstance.value);
};

/**
 * 渲染 Brush（框選縮放）功能
 * 🔧 重構：改為僅在首次調用 initBrush
 */
const renderBrush = () => {
  if (!props.enableBrush) {
    // 禁用 brush 時清理
    if (brushLayerRef.value) {
      const brushLayer = d3.select(brushLayerRef.value);
      brushLayer.selectAll('*').remove();
    }
    brushInstance.value = null;
    return;
  }
  
  if (!brushInstance.value) {
    initBrush();
  } else {
    updateBrushExtent();
  }
};

/**
 * 設置 Brush overlay 的 Tooltip 穿透檢測
 */
const setupTooltipDetection = (overlay) => {
  let isDragging = false;
  let currentHoverElement = null;
  
  overlay
    .on('mousedown.tooltip', () => { isDragging = true; })
    .on('mouseup.tooltip', () => {
      isDragging = false;
      // 清除當前高亮
      if (currentHoverElement) {
        d3.select(cellLayerRef.value)
          .selectAll('.heatmap-cell')
          .style('opacity', 1)
          .style('stroke', props.cellBorderColor)
          .style('stroke-width', props.cellBorderWidth);
        currentHoverElement = null;
        tooltipVisible.value = false;
        emit('tooltip-hide');
      }
    })
    .on('mousemove.tooltip', function(event) {
      if (isDragging) return;
      
      // 臨時穿透檢測底層元素
      d3.select(this).style('pointer-events', 'none');
      const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
      d3.select(this).style('pointer-events', 'all');
      
      // 檢查是否為熱力圖單元格
      if (elementBelow?.classList.contains('heatmap-cell')) {
        if (elementBelow !== currentHoverElement) {
          // 離開前一個單元格
          if (currentHoverElement) {
            d3.select(cellLayerRef.value)
              .selectAll('.heatmap-cell')
              .style('opacity', 1)
              .style('stroke', props.cellBorderColor)
              .style('stroke-width', props.cellBorderWidth);
          }
          
          // 進入新單元格
          currentHoverElement = elementBelow;
          const boundData = d3.select(elementBelow).datum();
          if (boundData) {
            // 手動觸發 hover 效果
            handleCellHover.call(elementBelow, event, boundData);
          }
        }
      } else {
        // 離開所有單元格
        if (currentHoverElement) {
          d3.select(cellLayerRef.value)
            .selectAll('.heatmap-cell')
            .style('opacity', 1)
            .style('stroke', props.cellBorderColor)
            .style('stroke-width', props.cellBorderWidth);
          currentHoverElement = null;
          tooltipVisible.value = false;
          emit('tooltip-hide');
        }
      }
    })
    .on('mouseleave.tooltip', () => {
      isDragging = false;
      // 清除當前高亮
      if (currentHoverElement) {
        d3.select(cellLayerRef.value)
          .selectAll('.heatmap-cell')
          .style('opacity', 1)
          .style('stroke', props.cellBorderColor)
          .style('stroke-width', props.cellBorderWidth);
        currentHoverElement = null;
        tooltipVisible.value = false;
        emit('tooltip-hide');
      }
    });
};

/**
 * 處理 Brush 選取完成事件
 * 🔧 修正：使用保存的 brushInstance.value.move(null) 清除選取框
 */
const handleBrushSelection = (event) => {
  if (!event.selection) return;

  const [[x0, y0], [x1, y1]] = event.selection;

  // 計算選取範圍內的 X、Y 類別
  const selectedX = originalXDomain.value.filter(d => {
    const bandStart = xScale.value(d);
    const bandEnd = bandStart + xScale.value.bandwidth();
    return bandEnd > x0 && bandStart < x1;
  });

  const selectedY = originalYDomain.value.filter(d => {
    const bandStart = yScale.value(d);
    const bandEnd = bandStart + yScale.value.bandwidth();
    return bandEnd > y0 && bandStart < y1;
  });

  if (selectedX.length === 0 || selectedY.length === 0) return;

  // 更新狀態
  currentXDomain.value = selectedX;
  currentYDomain.value = selectedY;
  resetBtnShow.value = true;

  // 發出事件
  emit('selection-change', {
    xDomain: selectedX,
    yDomain: selectedY
  });

  // 清除選取框（使用保存的 brush 實例）
  if (brushInstance.value && brushLayerRef.value) {
    d3.select(brushLayerRef.value).call(brushInstance.value.move, null);
  }
};

/**
 * 重置圖表縮放狀態
 */
const handleResetZoom = () => {
  currentXDomain.value = null;
  currentYDomain.value = null;
  resetBtnShow.value = false;
  
  emit('zoom-reset');
};

/**
 * 主渲染函數
 */
const render = () => {
  renderCells();
  renderXAxis();
  renderYAxis();
  renderColorLegend();
  renderTitle();
  renderBrush();
  
  emit('chart-ready');
};

// === 響應式渲染 ===
watchEffect(() => {
  // 觸發重新渲染的依賴
  effectiveWidth.value;
  effectiveHeight.value;
  props.data;
  effectiveXDomain.value;
  effectiveYDomain.value;
  colorScale.value;
  props.enableBrush;
  
  if (svgRef.value) {
    render();
  }
});

// === 生命週期 ===

/**
 * 組件掛載後初始化 ResizeObserver
 */
onMounted(() => {
  if (props.autoResize && containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      if (resizeDebounceTimer) {
        clearTimeout(resizeDebounceTimer);
      }
      
      resizeDebounceTimer = setTimeout(() => {
        // 🔧 防禦性檢查：確保組件未在 debounce 期間卸載
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

/**
 * 組件卸載時清理 ResizeObserver 和事件監聽器
 * 🔧 優化：添加 Brush 事件清理，避免內存洩漏
 */
onUnmounted(() => {
  // 清理 ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  
  if (resizeDebounceTimer) {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = null;
  }

  // 🔧 優化清理順序：先清理實例事件，再清理 DOM 事件
  // 清理 Brush 實例
  if (brushInstance.value) {
    brushInstance.value.on('end', null);
    brushInstance.value = null;
  }

  // 清理 Brush 相關 DOM 事件（使用 namespace）
  if (brushLayerRef.value) {
    const layer = d3.select(brushLayerRef.value);
    const overlay = layer.selectAll('.overlay');
    if (!overlay.empty()) {
      overlay.on('.tooltip', null); // 清除所有 .tooltip namespace 的事件
    }
  }
});
</script>

<style scoped>
.enterprise-heatmap {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* ✅ 自動響應式模式已改為 inline style，移除 :has() 以提升相容性 */

.enterprise-heatmap svg {
  display: block;
}

/* 🔧 移除 CSS transition，改由 D3 完全控制動畫，避免與圓角渲染衝突 */

:deep(.x-axis) text,
:deep(.y-axis) text {
  font-size: 12px;
  fill: #6b7280;
}

:deep(.x-axis) path,
:deep(.y-axis) path {
  stroke: #d1d5db;
}

:deep(.x-axis) line,
:deep(.y-axis) line {
  stroke: #d1d5db;
}

:deep(.color-legend) text {
  font-size: 11px;
  fill: #6b7280;
}

:deep(.color-legend) path,
:deep(.color-legend) line {
  stroke: #9ca3af;
}

/* ✅ Brush 樣式 */
:deep(.brush-layer .selection) {
  fill: #3b82f6;
  fill-opacity: 0.15;
  stroke: #3b82f6;
  stroke-width: 2;
}

:deep(.brush-layer .handle) {
  fill: #3b82f6;
  fill-opacity: 0.6;
}

:deep(.brush-layer .selection:hover) {
  fill-opacity: 0.25;
}

:deep(.brush-layer .overlay) {
  cursor: crosshair;
}
</style>
