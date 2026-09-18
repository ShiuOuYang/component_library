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
    <button type="button"
  v-if="resetBtnShow && enableBrush"
  @click="handleResetZoom"
  class="
    absolute top-2 right-2 px-3 py-1.5
    bg-surface-primary/30 hover:bg-surface-primary/80
    text-content-secondary text-sm
    rounded-md border border-stroke-light
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

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue';
import * as d3 from 'd3';
import type { ChartMargin } from './types/chart.types';
import { sortCategoryLabels } from './utils/sortCategories';

// === 型別 ===

/** 熱力圖的一列資料；欄位名稱由 xField / yField / valueField 指定 */
export type HeatmapDatum = Record<string, unknown>

/** 色階圖例的擺放位置 */
export type ColorLegendPosition = 'right' | 'bottom'

/**
 * 懸停時的高亮範圍。
 * cell 只亮自己；row / column 連同整列或整欄；both 兩者皆是。
 */
export type HighlightMode = 'cell' | 'row' | 'column' | 'both'

/** 色階函式：吃數值、回傳顏色字串 */
export type HeatmapColorScale = (value: d3.NumberValue) => string

/**
 * 一個待繪製的單元格。
 * value 為 null 代表該 x/y 組合沒有資料（由 showMissingValues 決定是否畫出）。
 */
export interface HeatmapCell {
  x: string
  y: string
  value: number | null
  rawData?: HeatmapDatum
}

/** linearGradient 的一個色階停點 */
export interface GradientStop {
  offset: number
  color: string
}

/** 企業級擴展點：接手單元格的繪製 */
export interface HeatmapCustomRenderers {
  cell?: (
    selection: d3.Selection<d3.BaseType, HeatmapCell, SVGGElement, unknown>,
    data: HeatmapCell[],
    colorScale: HeatmapColorScale
  ) => void
}

interface EnterpriseHeatmapProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  /** 啟用自動響應容器大小 */
  autoResize?: boolean
  /** ResizeObserver 防抖延遲（毫秒） */
  debounceDelay?: number
  margin?: ChartMargin

  // === 數據配置 ===
  /**
   * 熱力圖資料，每列一個單元格。
   * 例：[{ x: 'A', y: 'Product1', value: 23.5 }, …]
   */
  data: HeatmapDatum[]

  // === 欄位映射（支援靈活的數據結構） ===
  xField?: string
  yField?: string
  valueField?: string

  // === X 軸配置 ===
  /** 自訂 X 軸順序；null 則由資料推算 */
  xDomain?: Array<string | number> | null
  xAxisLabel?: string
  xAxisFormat?: ((value: string) => string) | null
  /** X 軸標籤旋轉角度 */
  xAxisAngle?: number

  // === Y 軸配置 ===
  /** 自訂 Y 軸順序；null 則由資料推算 */
  yDomain?: Array<string | number> | null
  yAxisLabel?: string
  yAxisFormat?: ((value: string) => string) | null

  // === 色階配置 ===
  /** D3 內建色階名稱，例如 interpolateRdYlGn / interpolateViridis */
  colorScheme?: string
  /** 自訂色階顏色；有指定時優先於 colorScheme */
  colorRange?: string[] | null
  /** 數值範圍 [min, max]；null 則自動計算 */
  valueDomain?: [number, number] | null
  /** 反轉色階（高值 → 冷色，低值 → 暖色） */
  reverseColorScale?: boolean

  // === 單元格配置 ===
  cellPadding?: number
  cellBorderRadius?: number
  cellBorderWidth?: number
  cellBorderColor?: string
  /** 在單元格內顯示數值 */
  showCellValues?: boolean
  cellValueFormat?: (value: number) => string

  // === 視覺配置 ===
  title?: string
  showColorLegend?: boolean
  colorLegendPosition?: ColorLegendPosition
  colorLegendTitle?: string
  animationDuration?: number

  // === 互動配置 ===
  /** 啟用框選縮放 */
  enableBrush?: boolean
  enableTooltip?: boolean
  highlightMode?: HighlightMode

  // === 遺漏值處理 ===
  /** 無數據單元格的顏色 */
  missingValueColor?: string
  /** 是否畫出無數據的單元格 */
  showMissingValues?: boolean

  /** 企業級擴展點：允許完全自定義渲染邏輯 */
  customRenderers?: HeatmapCustomRenderers
}

const props = withDefaults(defineProps<EnterpriseHeatmapProps>(), {
  width: 800,
  height: 600,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 80, right: 120, bottom: 80, left: 100 }),

  xField: 'x',
  yField: 'y',
  valueField: 'value',

  xDomain: null,
  xAxisLabel: '',
  xAxisFormat: null,
  xAxisAngle: -45,

  yDomain: null,
  yAxisLabel: '',
  yAxisFormat: null,

  colorScheme: 'interpolateRdYlGn',
  colorRange: null,
  valueDomain: null,
  reverseColorScale: false,

  cellPadding: 2,
  cellBorderRadius: 2,
  cellBorderWidth: 1,
  cellBorderColor: '#fff',
  showCellValues: false,
  cellValueFormat: (value: number) => value.toFixed(1),

  title: '',
  showColorLegend: true,
  colorLegendPosition: 'right',
  colorLegendTitle: 'Value',
  animationDuration: 500,

  enableBrush: true,
  enableTooltip: true,
  highlightMode: 'cell',

  missingValueColor: '#e0e0e0',
  showMissingValues: true,

  customRenderers: () => ({}),
});

const emit = defineEmits<{
  /** 單元格點擊 */
  'cell-click': [payload: { event: MouseEvent; data: HeatmapDatum | HeatmapCell }]
  /** 單元格懸停 */
  'cell-hover': [payload: {
    event: MouseEvent
    data: HeatmapDatum | HeatmapCell
    clientX: number
    clientY: number
  }]
  'tooltip-show': [payload: { data: HeatmapDatum; position: { pageX: number; pageY: number } }]
  'tooltip-hide': []
  'chart-ready': []
  'chart-resize': [size: { width: number; height: number }]
  /** Brush 選取範圍改變 */
  'selection-change': [payload: { xDomain: string[]; yDomain: string[] }]
  'zoom-reset': []
}>();

// === Refs ===
const containerRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const cellLayerRef = ref<SVGGElement | null>(null);
const xAxisRef = ref<SVGGElement | null>(null);
const yAxisRef = ref<SVGGElement | null>(null);
const colorLegendRef = ref<SVGGElement | null>(null);
const titleLayerRef = ref<SVGGElement | null>(null);
const brushLayerRef = ref<SVGGElement | null>(null);

const chartId = ref(`heatmap-${Math.random().toString(36).slice(2, 11)}`);
const tooltipData = ref<HeatmapDatum | null>(null);
const tooltipVisible = ref(false);
const resetBtnShow = ref(false);

const observedWidth = ref(props.width);
const observedHeight = ref(props.height);
let resizeObserver: ResizeObserver | null = null;
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 保存 brush 實例。
 * 清除選取框要呼叫同一個實例的 move()，每次重建就清不掉舊的框。
 * （d3 的 brush 是函式，ref 不會把它包成 Proxy，可安全存放。）
 */
const brushInstance = ref<d3.BrushBehavior<unknown> | null>(null);

const currentXDomain = ref<string[] | null>(null);
const currentYDomain = ref<string[] | null>(null);

// === 讀取欄位的小工具 ===

/**
 * 把欄位值讀成類別字串。
 *
 * band scale 的 domain 一定是字串（d3 內部也會 String() 一次），因此這裡
 * 提早統一轉型：資料與 xDomain / yDomain prop 兩邊都轉，數字與字串混用時
 * 才不會比對不到。
 */
function readCategory(datum: HeatmapDatum, field: string): string {
  const raw = datum[field];
  return raw === null || raw === undefined ? '' : String(raw);
}

/** 把欄位值讀成數值；空值與非數字都視為「沒有資料」 */
function readValue(datum: HeatmapDatum, field: string): number | null {
  const raw = datum[field];
  if (raw === null || raw === undefined || raw === '') return null;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

// === 計算屬性 ===
const effectiveWidth = computed(() => props.autoResize ? observedWidth.value : props.width);
const effectiveHeight = computed(() => props.autoResize ? observedHeight.value : props.height);

// 當圖例在底部時，增加 SVG 高度以容納圖例
const svgHeight = computed(() => {
  const baseHeight = effectiveHeight.value;
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
const originalXDomain = computed<string[]>(() => {
  if (props.xDomain) return props.xDomain.map(String);
  if (props.data.length === 0) return ['A']; // 空數據預設
  return sortCategoryLabels([...new Set(props.data.map((d) => readCategory(d, props.xField)))]);
});

const originalYDomain = computed<string[]>(() => {
  if (props.yDomain) return props.yDomain.map(String);
  if (props.data.length === 0) return ['1']; // 空數據預設
  return sortCategoryLabels([...new Set(props.data.map((d) => readCategory(d, props.yField)))]);
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
const valueDomainComputed = computed<[number, number]>(() => {
  if (props.valueDomain) return props.valueDomain;
  const values = props.data
    .map((d) => readValue(d, props.valueField))
    .filter((v): v is number => v !== null);
  if (values.length === 0) return [0, 100];

  const min = d3.min(values) ?? 0;
  const max = d3.max(values) ?? 100;

  // min == max 時擴展範圍，否則 scale 的 domain 退化成一個點
  if (min === max) {
    return max === 0 ? [0, 1] : [min * 0.9, max * 1.1];
  }

  return [min, max];
});

/**
 * X 軸 Scale（Band Scale）
 */
const xScale = computed(() => {
  return d3.scaleBand<string>()
    .domain(effectiveXDomain.value)
    .range([0, chartWidth.value])
    .padding(0);
});

/**
 * Y 軸 Scale（Band Scale）
 */
const yScale = computed(() => {
  return d3.scaleBand<string>()
    .domain(effectiveYDomain.value)
    .range([0, chartHeight.value])
    .padding(0);
});

/** d3 的 interpolateXxx 色階由名稱查表取得 */
function resolveInterpolator(name: string): (t: number) => string {
  const candidate = (d3 as unknown as Record<string, unknown>)[name];
  return typeof candidate === 'function'
    ? (candidate as (t: number) => string)
    : d3.interpolateRdYlGn;
}

/**
 * 色階 Scale
 */
const colorScale = computed<HeatmapColorScale>(() => {
  const [min, max] = valueDomainComputed.value;

  // colorRange 至少要兩個顏色才插得出色階，不足時退回 colorScheme
  if (props.colorRange && props.colorRange.length >= 2) {
    const range = props.reverseColorScale ? [...props.colorRange].reverse() : props.colorRange;
    return d3.scaleLinear<string>()
      .domain(d3.range(min, max, (max - min) / (props.colorRange.length - 1)).concat(max))
      .range(range);
  }

  return d3.scaleSequential(resolveInterpolator(props.colorScheme))
    .domain(props.reverseColorScale ? [max, min] : [min, max]);
});

/** 圖例用的 gradient stops（以 20 個停點取代原本的 100 個 rect） */
const gradientStops = computed<GradientStop[]>(() => {
  const [min, max] = valueDomainComputed.value;
  const numStops = 20;
  const stops: GradientStop[] = [];

  if (props.colorRange && props.colorRange.length >= 2) {
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

  return props.data.filter((d) =>
    xDomain.includes(readCategory(d, props.xField)) &&
    yDomain.includes(readCategory(d, props.yField))
  );
});

/**
 * 構建數據映射表（用於快速查找）
 */
const dataMap = computed(() => {
  const map = new Map<string, HeatmapDatum>();
  filteredData.value.forEach((d) => {
    map.set(`${readCategory(d, props.xField)}_${readCategory(d, props.yField)}`, d);
  });
  return map;
});

/** 單元格的 join key */
const cellKey = (d: HeatmapCell): string => `${d.x}_${d.y}`;

// === 渲染函數 ===

/**
 * 渲染熱力圖單元格
 *
 * @description 使用 D3 的 enter-update-exit 模式渲染熱力圖單元格，
 *              支援動畫過渡、自訂顏色、邊框、圓角等配置。
 */
const renderCells = (): void => {
  if (!cellLayerRef.value) return;

  const cellLayer = d3.select(cellLayerRef.value);

  // 準備渲染數據
  const renderData: HeatmapCell[] = [];
  effectiveXDomain.value.forEach((x) => {
    effectiveYDomain.value.forEach((y) => {
      const dataPoint = dataMap.value.get(`${x}_${y}`);

      if (dataPoint || props.showMissingValues) {
        renderData.push({
          x,
          y,
          value: dataPoint ? readValue(dataPoint, props.valueField) : null,
          rawData: dataPoint
        });
      }
    });
  });

  // 檢查是否有自訂渲染器
  if (props.customRenderers.cell) {
    const cells = cellLayer.selectAll<d3.BaseType, HeatmapCell>('.heatmap-cell')
      .data(renderData, cellKey);

    props.customRenderers.cell(cells, renderData, colorScale.value);
    return;
  }

  // 預設渲染邏輯
  const cellWidth = Math.max(0, xScale.value.bandwidth() - props.cellPadding);
  const cellHeight = Math.max(0, yScale.value.bandwidth() - props.cellPadding);
  const cellX = (d: HeatmapCell): number => (xScale.value(d.x) ?? 0) + props.cellPadding / 2;
  const cellY = (d: HeatmapCell): number => (yScale.value(d.y) ?? 0) + props.cellPadding / 2;

  cellLayer.selectAll<SVGRectElement, HeatmapCell>('.heatmap-cell')
    .data(renderData, cellKey)
    .join(
      // Enter: 建立新儲存格
      enter => enter.append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', cellX)
        .attr('y', cellY)
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
    .attr('x', cellX)
    .attr('y', cellY)
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
const renderCellValues = (
  renderData: HeatmapCell[],
  cellWidth: number,
  cellHeight: number
): void => {
  if (!cellLayerRef.value) return;
  const cellLayer = d3.select(cellLayerRef.value);

  // 根據 showCellValues 決定要渲染的資料
  const textData = props.showCellValues
    ? renderData.filter((d) => d.value != null)
    : [];

  const textX = (d: HeatmapCell): number => (xScale.value(d.x) ?? 0) + xScale.value.bandwidth() / 2;
  const textY = (d: HeatmapCell): number => (yScale.value(d.y) ?? 0) + yScale.value.bandwidth() / 2;
  const fontSize = `${Math.min(cellWidth, cellHeight) / 3}px`;
  // textData 已過濾掉 value 為 null 的資料，這裡可安全取值
  const valueOf = (d: HeatmapCell): number => d.value as number;

  cellLayer.selectAll<SVGTextElement, HeatmapCell>('.cell-value')
    .data(textData, cellKey)
    .join(
      // Enter: 建立新文字
      enter => enter.append('text')
        .attr('class', 'cell-value')
        .attr('x', textX)
        .attr('y', textY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-weight', '500')
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .style('fill', d => getContrastColor(colorScale.value(valueOf(d))))
        .style('font-size', fontSize)
        .style('opacity', 0)
        .text(d => props.cellValueFormat(valueOf(d))),
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
    .attr('x', textX)
    .attr('y', textY)
    .style('fill', d => getContrastColor(colorScale.value(valueOf(d))))
    .style('font-size', fontSize)
    .style('opacity', 1)
    .text(d => props.cellValueFormat(valueOf(d)));
};


/**
 * 計算對比色（用於單元格內文字）
 */
const getContrastColor = (hexColor: string): string => {
  const rgb = d3.rgb(hexColor);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

/** 把整層單元格的高亮狀態復原 */
const clearCellHighlight = (): void => {
  if (!cellLayerRef.value) return;
  d3.select(cellLayerRef.value)
    .selectAll('.heatmap-cell')
    .style('opacity', 1)
    .style('stroke', props.cellBorderColor)
    .style('stroke-width', props.cellBorderWidth);
};

/**
 * 處理單元格懸停事件
 *
 * this 指向被懸停的 <rect>，因此必須用 function 而非箭頭函式。
 */
function handleCellHover(this: SVGRectElement, event: MouseEvent, d: HeatmapCell): void {
  if (!props.enableTooltip) return;

  // 高亮效果
  const cell = d3.select(this);
  cell.style('stroke', '#000')
    .style('stroke-width', 2);

  // 根據高亮模式設置效果
  if (!cellLayerRef.value) return;
  const allCells = d3.select(cellLayerRef.value)
    .selectAll<SVGRectElement, HeatmapCell>('.heatmap-cell');
  const self = cell.node();

  if (props.highlightMode === 'row' || props.highlightMode === 'both') {
    allCells
      .filter(function(datum) {
        return datum.y === d.y && this !== self;
      })
      .style('opacity', 0.5);
  }

  if (props.highlightMode === 'column' || props.highlightMode === 'both') {
    allCells
      .filter(function(datum) {
        return datum.x === d.x && this !== self;
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
}

/**
 * 處理單元格離開事件
 */
function handleCellLeave(this: SVGRectElement): void {
  // 恢復樣式
  d3.select(this)
    .style('stroke', props.cellBorderColor)
    .style('stroke-width', props.cellBorderWidth);

  clearCellHighlight();

  tooltipVisible.value = false;
  emit('tooltip-hide');
}

/**
 * 處理單元格點擊事件
 */
const handleCellClick = (event: MouseEvent, d: HeatmapCell): void => {
  emit('cell-click', { event, data: d.rawData || d });
};

/** 座標軸的刻度格式化；沒給就原樣輸出 */
const tickFormatter = (
  format: ((value: string) => string) | null
): ((value: string) => string) => format ?? ((value: string) => value);

/**
 * 渲染 X 軸
 */
const renderXAxis = (): void => {
  if (!xAxisRef.value) return;

  const xAxis = d3.axisBottom(xScale.value)
    .tickFormat(tickFormatter(props.xAxisFormat));

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
const renderYAxis = (): void => {
  if (!yAxisRef.value) return;

  const yAxis = d3.axisLeft(yScale.value)
    .tickFormat(tickFormatter(props.yAxisFormat));

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
 * 以 linearGradient 繪製色階條，而非逐格 rect
 */
const renderColorLegend = (): void => {
  if (!props.showColorLegend || !colorLegendRef.value) return;

  const legendSelection = d3.select(colorLegendRef.value);
  legendSelection.selectAll('*').remove();

  const [min, max] = valueDomainComputed.value;
  const isRight = props.colorLegendPosition === 'right';
  // 根據圖表大小動態調整圖例尺寸
  const legendWidth = isRight ? 20 : Math.min(chartWidth.value * 0.5, 300);
  const legendHeight = isRight ? Math.min(chartHeight.value * 0.6, 200) : 20;
  const legendX = isRight ? chartWidth.value + 20 : chartWidth.value / 2 - legendWidth / 2;
  const legendY = isRight ? chartHeight.value / 2 - legendHeight / 2 : chartHeight.value + 55;

  // 使用 gradient 繪製色階條
  legendSelection.append('rect')
    .attr('x', legendX)
    .attr('y', legendY)
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', `url(#legend-gradient-${chartId.value})`);

  // 刻度軸
  const legendScale = isRight
    ? d3.scaleLinear().domain([min, max]).range([legendY, legendY + legendHeight])
    : d3.scaleLinear().domain([min, max]).range([legendX, legendX + legendWidth]);

  const legendAxis = isRight
    ? d3.axisRight(legendScale).ticks(5)
    : d3.axisBottom(legendScale).ticks(5);

  const axisX = isRight ? legendX + legendWidth : 0;
  const axisY = isRight ? 0 : legendY + legendHeight;

  legendSelection.append('g')
    .attr('transform', `translate(${axisX}, ${axisY})`)
    .call(legendAxis);

  if (props.colorLegendTitle) {
    const titleX = isRight ? legendX + legendWidth / 2 : legendX - 20;
    const titleY = isRight ? legendY - 10 : legendY + 10;

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
 * 初始化 Brush（僅在首次或重新創建時調用）
 */
const initBrush = (): void => {
  if (!props.enableBrush || !brushLayerRef.value) return;

  // 建立 brush 實例並保存。
  // extent 在 call() 之前就給定：少掉一次「先套用、再設 extent、再套用」，
  // 也不必依賴 d3 的 defaultExtent 去讀 svg.width.baseVal。
  brushInstance.value = d3.brush()
    .extent([[0, 0], [chartWidth.value, chartHeight.value]])
    .on('end', handleBrushSelection);

  // 清空現有內容並綁定新 brush
  const brushLayer = d3.select(brushLayerRef.value);
  brushLayer.selectAll('*').remove();
  brushLayer.call(brushInstance.value);

  // 設置 Tooltip 穿透檢測
  setupTooltipDetection(brushLayer.select<SVGRectElement>('.overlay'));
};

/**
 * 更新 Brush 可拖曳範圍（當 chart 尺寸改變時）
 * 只更新 extent，不重新創建 brush
 */
const updateBrushExtent = (): void => {
  if (!brushInstance.value || !brushLayerRef.value) return;

  // 更新 brush extent
  brushInstance.value.extent([[0, 0], [chartWidth.value, chartHeight.value]]);

  // 重新應用 brush（讓 extent 生效）
  d3.select(brushLayerRef.value).call(brushInstance.value);
};

/**
 * 渲染 Brush（框選縮放）功能
 */
const renderBrush = (): void => {
  if (!props.enableBrush) {
    // 禁用 brush 時清理
    if (brushLayerRef.value) {
      d3.select(brushLayerRef.value).selectAll('*').remove();
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
 *
 * brush 的 overlay 蓋在單元格上面（否則接不到拖曳事件），因此 hover 要靠
 * elementFromPoint 手動穿透：暫時關掉 overlay 的 pointer-events，問出底下
 * 是哪一格，再打開。
 */
const setupTooltipDetection = (
  overlay: d3.Selection<SVGRectElement, unknown, null, undefined>
): void => {
  let isDragging = false;
  let currentHoverElement: Element | null = null;

  /** 離開所有單元格：復原高亮並收掉 tooltip */
  const leaveAllCells = (): void => {
    if (!currentHoverElement) return;
    clearCellHighlight();
    currentHoverElement = null;
    tooltipVisible.value = false;
    emit('tooltip-hide');
  };

  overlay
    .on('mousedown.tooltip', () => { isDragging = true; })
    .on('mouseup.tooltip', () => {
      isDragging = false;
      leaveAllCells();
    })
    .on('mousemove.tooltip', function(event: MouseEvent) {
      if (isDragging) return;

      // 臨時穿透檢測底層元素
      d3.select(this).style('pointer-events', 'none');
      const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
      d3.select(this).style('pointer-events', 'all');

      // 檢查是否為熱力圖單元格
      if (elementBelow?.classList.contains('heatmap-cell')) {
        if (elementBelow === currentHoverElement) return;

        // 離開前一個單元格
        if (currentHoverElement) clearCellHighlight();

        // 進入新單元格
        currentHoverElement = elementBelow;
        const boundData = d3.select(elementBelow).datum() as HeatmapCell | undefined;
        if (boundData) {
          // 手動觸發 hover 效果（this 要指向該單元格）
          handleCellHover.call(elementBelow as SVGRectElement, event, boundData);
        }
      } else {
        leaveAllCells();
      }
    })
    .on('mouseleave.tooltip', () => {
      isDragging = false;
      leaveAllCells();
    });
};

/**
 * 處理 Brush 選取完成事件
 * 用保存的 brushInstance.move(null) 清除選取框
 */
const handleBrushSelection = (event: d3.D3BrushEvent<unknown>): void => {
  if (!event.selection) return;

  const [[x0, y0], [x1, y1]] = event.selection as [[number, number], [number, number]];

  // 計算選取範圍內的 X、Y 類別
  const selectedX = originalXDomain.value.filter((d) => {
    const bandStart = xScale.value(d);
    if (bandStart === undefined) return false;
    return bandStart + xScale.value.bandwidth() > x0 && bandStart < x1;
  });

  const selectedY = originalYDomain.value.filter((d) => {
    const bandStart = yScale.value(d);
    if (bandStart === undefined) return false;
    return bandStart + yScale.value.bandwidth() > y0 && bandStart < y1;
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
const handleResetZoom = (): void => {
  currentXDomain.value = null;
  currentYDomain.value = null;
  resetBtnShow.value = false;

  emit('zoom-reset');
};

/**
 * 主渲染函數
 */
const render = (): void => {
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
  // 觸發重新渲染的依賴：讀取即建立追蹤，集中成一個陣列比裸表達式清楚，
  // 也不會被靜態分析誤判為無效果的語句。
  const _deps = [
    effectiveWidth.value,
    effectiveHeight.value,
    props.data,
    effectiveXDomain.value,
    effectiveYDomain.value,
    colorScale.value,
    props.enableBrush,
  ];
  void _deps;

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
        // 防禦性檢查：確保組件未在 debounce 期間卸載
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

  // 清理順序：先清理實例事件，再清理 DOM 事件
  if (brushInstance.value) {
    brushInstance.value.on('end', null);
    brushInstance.value = null;
  }

  // 清理 Brush 相關 DOM 事件（使用 namespace）
  if (brushLayerRef.value) {
    const overlay = d3.select(brushLayerRef.value).selectAll('.overlay');
    if (!overlay.empty()) {
      overlay.on('.tooltip', null); // 清除所有 .tooltip namespace 的事件
    }
  }
});

defineExpose({ containerRef, svgRef });
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
