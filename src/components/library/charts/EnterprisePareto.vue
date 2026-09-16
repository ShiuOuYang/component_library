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

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import * as d3 from 'd3';
import type { ChartDatum, ChartMargin } from './types/chart.types';
import { buildParetoData } from './composables/useParetoData';
import type { ParetoDatum, ParetoSortOrder } from './composables/useParetoData';

// === 型別 ===

/** hover 時高亮的範圍；none 表示不高亮 */
export type ParetoHighlightMode = 'bar' | 'none'

/** 企業級擴展點（目前保留，尚未有預設實作被覆寫） */
export type ParetoCustomRenderers = Record<string, unknown>

interface EnterpriseParetoProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  margin?: ChartMargin

  // === 數據配置 ===
  /**
   * 柏拉圖資料，每列一個類別。
   * 例：[{ category: 'A類缺陷', value: 150 }, …]
   */
  data: ChartDatum[]

  // === 欄位映射 ===
  categoryField?: string
  valueField?: string

  // === 排序配置 ===
  /** 自動按數值排序；關閉時照傳入順序 */
  autoSort?: boolean
  sortOrder?: ParetoSortOrder

  // === X 軸配置 ===
  xAxisLabel?: string
  xAxisFormat?: ((value: string) => string) | null
  xAxisAngle?: number

  // === Y 軸配置（左側：數值） ===
  yAxisLeftLabel?: string
  yAxisLeftFormat?: ((value: number) => string) | null
  /** 左軸範圍 [min, max]；null 則依資料推算並留 10% 空間 */
  valueDomain?: [number, number] | null

  // === Y 軸配置（右側：百分比） ===
  yAxisRightLabel?: string
  yAxisRightFormat?: (value: number) => string

  // === 長條圖配置 ===
  barColor?: string
  barHoverColor?: string
  barPadding?: number
  barBorderRadius?: number
  /** barBorderRadius 的別名，有值時優先 */
  barCornerRadius?: number | null
  /** 在長條上方顯示數值 */
  showValuesOnBars?: boolean

  // === 折線圖配置 ===
  lineColor?: string
  lineWidth?: number
  /** 顯示累積曲線 */
  showCumulativeLine?: boolean
  showLinePoints?: boolean
  /** showLinePoints 的別名，有值時優先 */
  showCumulativePoints?: boolean | null
  pointRadius?: number
  pointFillColor?: string

  // === 參考線配置 ===
  showReferenceLine?: boolean
  referenceLinePercent?: number
  referenceLineColor?: string
  referenceLineWidth?: number
  referenceLineDash?: number[]

  // === 數據過濾配置 ===
  /** 把累積超過參考線百分比的尾巴併成一筆「其他」 */
  enableThresholdFilter?: boolean
  otherLabel?: string

  // === 視覺配置 ===
  title?: string
  valueFormat?: (value: number) => string
  animationDuration?: number

  // === 互動配置 ===
  enableTooltip?: boolean
  highlightMode?: ParetoHighlightMode

  /** 企業級擴展點 */
  customRenderers?: ParetoCustomRenderers
}

const props = withDefaults(defineProps<EnterpriseParetoProps>(), {
  width: 800,
  height: 600,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 80, right: 80, bottom: 80, left: 80 }),

  categoryField: 'category',
  valueField: 'value',

  autoSort: true,
  sortOrder: 'desc',

  xAxisLabel: '',
  xAxisFormat: null,
  xAxisAngle: -45,

  yAxisLeftLabel: '數量',
  yAxisLeftFormat: null,
  valueDomain: null,

  yAxisRightLabel: '累積百分比 (%)',
  yAxisRightFormat: (value: number) => `${value}%`,

  barColor: '#3b82f6',
  barHoverColor: '#2563eb',
  barPadding: 0.2,
  barBorderRadius: 2,
  barCornerRadius: null,
  showValuesOnBars: false,

  lineColor: '#ef4444',
  lineWidth: 2,
  showCumulativeLine: true,
  showLinePoints: true,
  showCumulativePoints: null,
  pointRadius: 4,
  pointFillColor: '#ef4444',

  showReferenceLine: true,
  referenceLinePercent: 80,
  referenceLineColor: '#10b981',
  referenceLineWidth: 2,
  referenceLineDash: () => [5, 5],

  enableThresholdFilter: true,
  otherLabel: 'Other',

  title: '',
  valueFormat: (value: number) => value.toFixed(0),
  animationDuration: 500,

  enableTooltip: true,
  highlightMode: 'bar',

  customRenderers: () => ({}),
});

const emit = defineEmits<{
  'bar-click': [payload: { event: MouseEvent; data: ParetoDatum }]
  'bar-hover': [payload: {
    event: MouseEvent
    data: ParetoDatum
    clientX: number
    clientY: number
  }]
  'tooltip-show': [payload: {
    data: ParetoDatum | null
    position: { pageX: number; pageY: number }
  }]
  'tooltip-hide': []
  'chart-ready': []
  'chart-resize': [size: { width: number; height: number }]
}>();

// === Refs ===
const containerRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const barsLayerRef = ref<SVGGElement | null>(null);
const lineLayerRef = ref<SVGGElement | null>(null);
const referenceLineRef = ref<SVGGElement | null>(null);
const xAxisRef = ref<SVGGElement | null>(null);
const yAxisLeftRef = ref<SVGGElement | null>(null);
const yAxisRightRef = ref<SVGGElement | null>(null);
const titleLayerRef = ref<SVGGElement | null>(null);

const chartId = ref(`pareto-${Math.random().toString(36).slice(2, 11)}`);
const tooltipData = ref<ParetoDatum | null>(null);
const tooltipVisible = ref(false);
const isChartReady = ref(false);

const observedWidth = ref(props.width);
const observedHeight = ref(props.height);
let resizeObserver: ResizeObserver | null = null;
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// === 計算屬性 ===
const effectiveWidth = computed(() => props.autoResize ? observedWidth.value : props.width);
const effectiveHeight = computed(() => props.autoResize ? observedHeight.value : props.height);

const chartWidth = computed(() => effectiveWidth.value - props.margin.left - props.margin.right);
const chartHeight = computed(() => effectiveHeight.value - props.margin.top - props.margin.bottom);

// 處理 prop 別名：新名稱有給值時優先
const effectiveBarRadius = computed(() =>
  props.barCornerRadius !== null ? props.barCornerRadius : props.barBorderRadius
);

const effectiveShowLinePoints = computed(() =>
  props.showCumulativePoints !== null ? props.showCumulativePoints : props.showLinePoints
);

const effectiveShowValues = computed(() => props.showValuesOnBars);

/**
 * 柏拉圖資料：排序、累積、必要時把尾巴併成「其他」。
 * 計算邏輯與 ParetoChart 共用（見 useParetoData）。
 */
const cumulativeData = computed<ParetoDatum[]>(() =>
  buildParetoData(props.data, {
    categoryField: props.categoryField,
    valueField: props.valueField,
    // autoSort 關掉就等於不排序
    sortOrder: props.autoSort ? props.sortOrder : 'none',
    enableThresholdFilter: props.enableThresholdFilter,
    thresholdPercent: props.referenceLinePercent,
    otherLabel: props.otherLabel,
  })
);

/** 取類別（band scale 的 domain 一律是字串） */
const categoryOf = (d: ParetoDatum): string => String(d[props.categoryField] ?? '');

/** 取數值 */
const valueOf = (d: ParetoDatum): number => {
  const raw = d[props.valueField];
  return typeof raw === 'number' ? raw : Number(raw) || 0;
};

/**
 * X 軸 Scale（Band Scale）
 */
const xScale = computed(() =>
  d3.scaleBand<string>()
    .domain(cumulativeData.value.map(categoryOf))
    .range([0, chartWidth.value])
    .padding(props.barPadding)
);

/**
 * Y 軸 Scale（左側：數值）
 */
const yScaleLeft = computed(() => {
  let domain: [number, number];
  if (props.valueDomain) {
    domain = props.valueDomain;
  } else {
    const maxValue = d3.max(cumulativeData.value, valueOf) ?? 100;
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
const yScaleRight = computed(() =>
  d3.scaleLinear().domain([0, 100]).range([chartHeight.value, 0])
);

// === 共用的位置計算 ===
/** 長條左緣 */
const barX = (d: ParetoDatum): number => xScale.value(categoryOf(d)) ?? 0;
/** 長條水平中心（折線與標籤用） */
const barCenterX = (d: ParetoDatum): number => barX(d) + xScale.value.bandwidth() / 2;
/** 長條頂端 */
const barTopY = (d: ParetoDatum): number => yScaleLeft.value(valueOf(d));
/** 累積百分比在右軸的位置 */
const cumulativeY = (d: ParetoDatum): number => yScaleRight.value(d.cumulativePercent);

// === 渲染函數 ===

/**
 * 渲染長條圖
 */
const renderBars = (): void => {
  if (!barsLayerRef.value) return;

  const barsLayer = d3.select(barsLayerRef.value);

  barsLayer.selectAll<SVGRectElement, ParetoDatum>('.pareto-bar')
    .data(cumulativeData.value, (d) => categoryOf(d as ParetoDatum))
    .join(
      enter => enter.append('rect')
        .attr('class', 'pareto-bar')
        .attr('x', barX)
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
          .attr('y', barTopY)
          .attr('height', (d) => chartHeight.value - barTopY(d))
        ),
      update => update
        .style('fill', props.barColor)  // 確保顏色更新
        .call(update => update.interrupt().transition()
          .duration(props.animationDuration)
          .attr('x', barX)
          .attr('y', barTopY)
          .attr('width', xScale.value.bandwidth())
          .attr('height', (d) => chartHeight.value - barTopY(d))
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
    barsLayer.selectAll<SVGTextElement, ParetoDatum>('.bar-value')
      .data(cumulativeData.value, (d) => categoryOf(d as ParetoDatum))
      .join(
        enter => enter.append('text')
          .attr('class', 'bar-value')
          .attr('x', barCenterX)
          .attr('y', chartHeight.value)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('fill', '#374151')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .text((d) => props.valueFormat(valueOf(d)))
          .call(enter => enter.transition()
            .duration(props.animationDuration)
            .attr('y', (d) => barTopY(d) - 5)
            .style('opacity', 1)
          ),
        update => update
          .call(update => update.interrupt().transition()
            .duration(props.animationDuration)
            .attr('x', barCenterX)
            .attr('y', (d) => barTopY(d) - 5)
            .text((d) => props.valueFormat(valueOf(d)))
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
const renderLine = (): void => {
  if (!lineLayerRef.value) return;

  const lineLayer = d3.select(lineLayerRef.value);

  // 如果不顯示累積曲線，清除所有元素並返回
  if (!props.showCumulativeLine) {
    lineLayer.selectAll('.cumulative-line').remove();
    lineLayer.selectAll('.line-point').remove();
    return;
  }

  // 定義折線生成器
  const line = d3.line<ParetoDatum>()
    .x(barCenterX)
    .y(cumulativeY)
    .curve(d3.curveMonotoneX);

  // 渲染折線路徑
  const pathData = lineLayer.selectAll<SVGPathElement, ParetoDatum[]>('.cumulative-line')
    .data([cumulativeData.value]);

  pathData.join(
    enter => {
      const path = enter.append('path')
        .attr('class', 'cumulative-line')
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', props.lineColor)
        .style('stroke-width', props.lineWidth);
      
      // 路徑動畫：沿著線「畫出來」
      // getTotalLength 不是每個環境都有（例如沒有幾何引擎的 jsdom），
      // 缺了就跳過動畫，不該讓整張圖的渲染跟著失敗
      const pathNode = path.node();
      if (pathNode && typeof pathNode.getTotalLength === 'function') {
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
    lineLayer.selectAll<SVGCircleElement, ParetoDatum>('.line-point')
      .data(cumulativeData.value, (d) => categoryOf(d as ParetoDatum))
      .join(
        enter => enter.append('circle')
          .attr('class', 'line-point')
          .attr('cx', barCenterX)
          .attr('cy', cumulativeY)
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
          .attr('cx', barCenterX)
          .attr('cy', cumulativeY)
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
    lineLayer.selectAll<SVGTextElement, ParetoDatum>('.cumulative-label')
      .data(cumulativeData.value, (d) => categoryOf(d as ParetoDatum))
      .join(
        enter => enter.append('text')
          .attr('class', 'cumulative-label')
          .attr('x', barCenterX)
          .attr('y', (d) => cumulativeY(d) - 8)
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .style('font-weight', '600')
          .style('fill', props.lineColor)
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .text((d) => `${d.cumulativePercent.toFixed(1)}%`)
          .call(enter => enter.transition()
            .delay(props.animationDuration / 2)
            .duration(props.animationDuration / 2)
            .style('opacity', 1)
          ),
        update => update
          .style('fill', props.lineColor)
          .interrupt().transition()
          .duration(props.animationDuration)
          .attr('x', barCenterX)
          .attr('y', (d) => cumulativeY(d) - 8)
          .text((d) => `${d.cumulativePercent.toFixed(1)}%`)
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
const renderReferenceLine = (): void => {
  if (!referenceLineRef.value) return;

  const refLayer = d3.select(referenceLineRef.value);
  
  // 根據 showReferenceLine 決定數據
  const referenceData: Array<{ percent: number }> =
    props.showReferenceLine ? [{ percent: props.referenceLinePercent }] : [];
  const yRef = yScaleRight.value(props.referenceLinePercent);

  // 繪製虛線（使用 join）
  refLayer.selectAll<SVGLineElement, { percent: number }>('.reference-line-path')
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
  refLayer.selectAll<SVGTextElement, { percent: number }>('.reference-line-label')
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
const renderXAxis = (): void => {
  if (!xAxisRef.value) return;

  const xAxis = d3.axisBottom(xScale.value)
    .tickFormat(props.xAxisFormat ?? ((v: string) => v));

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
const renderYAxisLeft = (): void => {
  if (!yAxisLeftRef.value) return;

  const yAxis = d3.axisLeft(yScaleLeft.value)
    .tickFormat((v: d3.NumberValue) =>
      props.yAxisLeftFormat ? props.yAxisLeftFormat(Number(v)) : String(v)
    );

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
const renderYAxisRight = (): void => {
  if (!yAxisRightRef.value) return;

  const yAxis = d3.axisRight(yScaleRight.value)
    .tickFormat((v: d3.NumberValue) => props.yAxisRightFormat(Number(v)));

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
const renderTitle = (): void => {
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
function handleBarHover(this: SVGRectElement, event: MouseEvent, d: ParetoDatum): void {
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
}

/**
 * 處理長條 leave
 */
function handleBarLeave(this: SVGRectElement): void {
  d3.select(this)
    .transition()
    .duration(150)
    .style('fill', props.barColor);

  tooltipVisible.value = false;
  emit('tooltip-hide');
}

/**
 * 處理長條點擊
 */
const handleBarClick = (event: MouseEvent, d: ParetoDatum): void => {
  emit('bar-click', { event, data: d });
};

/**
 * 主渲染函數
 */
const render = (): void => {
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
const forceRerender = (): void => {
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
