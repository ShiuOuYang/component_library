<template>
  <div class="p-6 bg-gradient-to-br from-green-50 to-teal-50 rounded-lg">
    <h2 class="text-3xl font-bold mb-6 text-green-800">🧩 可重用圖表元件（企業級封裝）</h2>

    <!-- 學習目標 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-xl font-bold mb-4 text-green-700">🎯 學習目標</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700">
        <li>設計可注入的 Props 介面（scale/axis factory、renderer）</li>
        <li>以 Frame + Layers 封裝通用圖表元件（長條圖、折線圖，可延展到混合圖）</li>
        <li>用 enter/update/exit（data join）提升增量更新能力</li>
        <li>處理事件與互動：標準化 payload（click/hover/tooltip position）</li>
        <li>Tooltip/UI：用外部 Teleport 統一呈現（圖表元件只 emit）</li>
        <li>響應式設計（RWD）並避免全清空重畫</li>
      </ul>
    </section>

    <!-- 第一部分：通用長條圖元件 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-green-700">1️⃣ 通用長條圖元件</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          以下是一個企業級的長條圖元件範例，展示如何設計靈活的 Props 和事件系統。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm" v-pre><code>&lt;!-- BarChart.vue --&gt;
&lt;template&gt;
  &lt;div class="bar-chart" :style="{ width: width + 'px', height: height + 'px' }"&gt;
    &lt;svg :width="width" :height="height"&gt;
      &lt;g :transform="\`translate(\${margin.left}, \${margin.top})\`"&gt;
        &lt;!-- ✅ 企業級：template 只保留 scaffold + layers。
             rect/text 由 D3 data-join 負責（enter/update/exit），擴充性最好。 --&gt;
        &lt;g ref="gridLayerRef"&gt;&lt;/g&gt;
        &lt;g ref="barsLayerRef"&gt;&lt;/g&gt;
        &lt;g ref="labelsLayerRef"&gt;&lt;/g&gt;
        &lt;g ref="xAxisRef" :transform="\`translate(0, \${chartHeight})\`"&gt;&lt;/g&gt;
        &lt;g ref="yAxisRef"&gt;&lt;/g&gt;
        &lt;g ref="titleLayerRef"&gt;&lt;/g&gt;
      &lt;/g&gt;
    &lt;/svg&gt;

    &lt;!-- ✅ 企業級建議：Tooltip 用外部 Teleport 統一呈現。
         圖表元件只 emit tooltip-show/move/hide（包含 position 多座標系）。 --&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, computed, watchEffect } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  data: { type: Array, required: true },
  width: { type: Number, default: 600 },
  height: { type: Number, default: 400 },
  margin: { 
    type: Object, 
    default: () => ({ top: 40, right: 20, bottom: 60, left: 60 })
  },
  xValue: { type: Function, default: d => d.name },
  yValue: { type: Function, default: d => d.value },
  keyFn: { type: Function, default: d => d.name },
  colorScale: { type: [String, Function], default: 'steelblue' },
  title: { type: String, default: '' },
  showLabels: { type: Boolean, default: false },
  formatValue: { type: Function, default: v => v },

  // ✅ 延展點：可注入 scale / axis factory
  xScaleFactory: { type: Function, default: null },
  yScaleFactory: { type: Function, default: null },
  xAxisFactory: { type: Function, default: null },
  yAxisFactory: { type: Function, default: null }
});

const emit = defineEmits([
  'bar-click',
  'bar-hover',
  'tooltip-show',
  'tooltip-move',
  'tooltip-hide'
]);

const containerRef = ref(null);
const barsLayerRef = ref(null);
const labelsLayerRef = ref(null);
const titleLayerRef = ref(null);
const xAxisRef = ref(null);
const yAxisRef = ref(null);

const chartWidth = computed(() => props.width - props.margin.left - props.margin.right);
const chartHeight = computed(() => props.height - props.margin.top - props.margin.bottom);

const xScale = computed(() => {
  if (typeof props.xScaleFactory === 'function') {
    return props.xScaleFactory({
      d3,
      data: props.data,
      xValue: props.xValue,
      width: chartWidth.value
    });
  }

  return d3.scaleBand()
    .domain(props.data.map(props.xValue))
    .range([0, chartWidth.value])
    .padding(0.2);
});

const yScale = computed(() => {
  if (typeof props.yScaleFactory === 'function') {
    return props.yScaleFactory({
      d3,
      data: props.data,
      yValue: props.yValue,
      height: chartHeight.value
    });
  }

  return d3.scaleLinear()
    .domain([0, d3.max(props.data, props.yValue) || 100])
    .range([chartHeight.value, 0])
    .nice();
});

const getBarColor = (d) => {
  if (typeof props.colorScale === 'function') {
    return props.colorScale(d);
  }
  return props.colorScale;
};

const buildTooltipPosition = (event) => {
  const svgEl = event.currentTarget?.ownerSVGElement;
  const containerEl = svgEl?.parentElement;
  const rect = containerEl?.getBoundingClientRect?.();

  const pageX = event.clientX;
  const pageY = event.clientY;
  const containerX = rect ? pageX - rect.left : null;
  const containerY = rect ? pageY - rect.top : null;
  const plotX = containerX !== null ? containerX - props.margin.left : null;
  const plotY = containerY !== null ? containerY - props.margin.top : null;

  return { pageX, pageY, containerX, containerY, plotX, plotY };
};

const renderBars = () => {
  if (!barsLayerRef.value) return;

  const g = d3.select(barsLayerRef.value);
  const bars = g.selectAll('rect.bar').data(props.data, props.keyFn);

  const enter = bars.enter().append('rect').attr('class', 'bar');

  enter
    .on('mouseenter', (event, d) => {
      emit('bar-hover', d);
      emit('tooltip-show', { position: buildTooltipPosition(event), data: d });
    })
    .on('mousemove', (event, d) => {
      emit('tooltip-move', { position: buildTooltipPosition(event), data: d });
    })
    .on('mouseleave', () => {
      emit('tooltip-hide');
    })
    .on('click', (_event, d) => {
      emit('bar-click', d);
    });

  bars
    .merge(enter)
    .attr('x', (d) => xScale.value(props.xValue(d)))
    .attr('y', (d) => yScale.value(props.yValue(d)))
    .attr('width', xScale.value.bandwidth())
    .attr('height', (d) => chartHeight.value - yScale.value(props.yValue(d)))
    .attr('fill', (d) => getBarColor(d));

  bars.exit().remove();
};

const renderLabels = () => {
  if (!labelsLayerRef.value) return;

  const g = d3.select(labelsLayerRef.value);
  const labelData = props.showLabels ? props.data : [];

  g.selectAll('text.value-label')
    .data(labelData, props.keyFn)
    .join(
      (enter) => enter.append('text').attr('class', 'value-label'),
      (update) => update,
      (exit) => exit.remove()
    )
    .attr('x', (d) => xScale.value(props.xValue(d)) + xScale.value.bandwidth() / 2)
    .attr('y', (d) => yScale.value(props.yValue(d)) - 5)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .text((d) => props.formatValue(props.yValue(d)));
};

const renderTitle = () => {
  if (!titleLayerRef.value) return;

  const g = d3.select(titleLayerRef.value);
  const titleData = props.title ? [props.title] : [];

  g.selectAll('text.chart-title')
    .data(titleData)
    .join(
      (enter) => enter.append('text').attr('class', 'chart-title'),
      (update) => update,
      (exit) => exit.remove()
    )
    .attr('x', chartWidth.value / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .attr('font-size', 16)
    .attr('font-weight', 'bold')
    .text((d) => d);
};

watchEffect(() => {
  if (xAxisRef.value) {
    const axis = typeof props.xAxisFactory === 'function'
      ? props.xAxisFactory({ d3, xScale: xScale.value })
      : d3.axisBottom(xScale.value);

    d3.select(xAxisRef.value).call(axis);
  }
  if (yAxisRef.value) {
    const axis = typeof props.yAxisFactory === 'function'
      ? props.yAxisFactory({ d3, yScale: yScale.value })
      : d3.axisLeft(yScale.value).ticks(5);

    d3.select(yAxisRef.value).call(axis);
  }

  renderBars();
  renderLabels();
  renderTitle();
});
&lt;/script&gt;

&lt;style scoped&gt;
.bar-chart {
  position: relative;
}

.bar {
  cursor: pointer;
}

.bar:hover {
  opacity: 0.8;
}

&lt;/style&gt;</code></pre>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p class="font-semibold text-blue-800 mb-2">🔑 設計亮點</p>
          <ul class="list-disc list-inside text-sm text-blue-700 space-y-1">
            <li><strong>資料存取器函數</strong>：xValue/yValue 讓元件支援任意資料結構</li>
            <li><strong>Key Function</strong>：確保動畫流暢</li>
            <li><strong>彈性配色</strong>：支援固定顏色或函數</li>
            <li><strong>可注入 renderer</strong>：axis/scale 可替換（更好延展）</li>
            <li><strong>事件發射</strong>：父元件可監聽點擊/懸停/tooltip（建議 Teleport 統一 UI）</li>
          </ul>
        </div>
      </div>

      <!-- 互動範例 1：基本使用 -->
      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎨 範例 1：基本使用</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="updateBarData" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            更新資料
          </button>
          <button type="button" @click="toggleLabels" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {{ showLabels1 ? '隱藏' : '顯示' }}標籤
          </button>
        </div>
        
        <!-- 內聯長條圖實作 -->
        <svg width="600" height="400" class="bg-white rounded border">
          <g :transform="`translate(${barMargin1.left}, ${barMargin1.top})`">
            <rect
              v-for="d in barData1"
              :key="d.name"
              :x="barXScale1(d.name)"
              :y="barYScale1(d.value)"
              :width="barXScale1.bandwidth()"
              :height="barChartHeight1 - barYScale1(d.value)"
              fill="steelblue"
              class="cursor-pointer transition-all duration-300"
              @click="handleBarClick1(d)"
            />
            
            <text
              v-for="d in barData1"
              v-show="showLabels1"
              :key="'label-' + d.name"
              :x="barXScale1(d.name) + barXScale1.bandwidth() / 2"
              :y="barYScale1(d.value) - 5"
              text-anchor="middle"
              font-size="12"
              fill="#374151"
            >{{ d.value }}萬</text>
            
            <g ref="barXAxis1" :transform="`translate(0, ${barChartHeight1})`"></g>
            <g ref="barYAxis1"></g>
            
            <text
              :x="barChartWidth1 / 2"
              :y="-10"
              text-anchor="middle"
              font-size="16"
              font-weight="bold"
              fill="#1f2937"
            >月銷售額</text>
          </g>
        </svg>
        
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>點擊記錄：</strong>{{ clickLog1 || '尚未點擊' }}
        </div>
      </div>

      <!-- 互動範例 2：自訂配色 -->
      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎨 範例 2：自訂配色</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="randomizeBarData2" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            隨機資料
          </button>
        </div>
        
        <!-- 內聯長條圖實作（自訂配色） -->
        <svg width="600" height="400" class="bg-white rounded border">
          <g :transform="`translate(${barMargin2.left}, ${barMargin2.top})`">
            <rect
              v-for="d in barData2"
              :key="d.name"
              :x="barXScale2(d.name)"
              :y="barYScale2(d.value)"
              :width="barXScale2.bandwidth()"
              :height="barChartHeight2 - barYScale2(d.value)"
              :fill="getColorByValue(d)"
              class="transition-all duration-300"
            />
            
            <text
              v-for="d in barData2"
              :key="'label-' + d.name"
              :x="barXScale2(d.name) + barXScale2.bandwidth() / 2"
              :y="barYScale2(d.value) - 5"
              text-anchor="middle"
              font-size="12"
              fill="#374151"
            >{{ d.value }}</text>
            
            <g ref="barXAxis2" :transform="`translate(0, ${barChartHeight2})`"></g>
            <g ref="barYAxis2"></g>
            
            <text
              :x="barChartWidth2 / 2"
              :y="-10"
              text-anchor="middle"
              font-size="16"
              font-weight="bold"
              fill="#1f2937"
            >產品評分（依分數配色）</text>
          </g>
        </svg>
        
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded flex gap-4">
          <span class="flex items-center gap-1">
            <span class="w-4 h-4 bg-red-500 rounded"></span>低分 (&lt;50)
          </span>
          <span class="flex items-center gap-1">
            <span class="w-4 h-4 bg-yellow-500 rounded"></span>中分 (50-70)
          </span>
          <span class="flex items-center gap-1">
            <span class="w-4 h-4 bg-green-500 rounded"></span>高分 (&gt;70)
          </span>
        </div>
      </div>
    </section>

    <!-- 第二部分：通用折線圖元件 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-green-700">2️⃣ 通用折線圖元件</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          折線圖元件展示如何處理時間序列資料和多條線的繪製。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm" v-pre><code>&lt;!-- LineChart.vue --&gt;
&lt;template&gt;
  &lt;div class="line-chart"&gt;
    &lt;svg :width="width" :height="height"&gt;
      &lt;defs&gt;
        &lt;!-- 漸層定義（可選） --&gt;
        &lt;linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%"&gt;
          &lt;stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3" /&gt;
          &lt;stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" /&gt;
        &lt;/linearGradient&gt;
      &lt;/defs&gt;
      
      &lt;g :transform="\`translate(\${margin.left}, \${margin.top})\`"&gt;
        &lt;!-- ✅ 企業級：template 只保留 scaffold + layers。
             grid/area/line/dots 交給 D3 data-join（enter/update/exit）。 --&gt;
        &lt;g ref="gridLayerRef" class="grid"&gt;&lt;/g&gt;
        &lt;g ref="areaLayerRef"&gt;&lt;/g&gt;
        &lt;g ref="lineLayerRef"&gt;&lt;/g&gt;
        &lt;g ref="dotsLayerRef"&gt;&lt;/g&gt;

        &lt;!-- 座標軸 --&gt;
        &lt;g ref="xAxisRef" :transform="\`translate(0, \${chartHeight})\`"&gt;&lt;/g&gt;
        &lt;g ref="yAxisRef"&gt;&lt;/g&gt;
      &lt;/g&gt;
    &lt;/svg&gt;

    &lt;!-- ✅ 企業級建議：Tooltip 用外部 Teleport 統一呈現。
         圖表元件只 emit tooltip-show/move/hide（包含 position 多座標系）。 --&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, computed, watchEffect } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  data: { type: Array, required: true },
  width: { type: Number, default: 600 },
  height: { type: Number, default: 400 },
  margin: { 
    type: Object, 
    default: () => ({ top: 20, right: 20, bottom: 60, left: 60 })
  },
  xValue: { type: Function, required: true },
  yValue: { type: Function, required: true },
  lineColor: { type: String, default: '#3b82f6' },
  lineWidth: { type: Number, default: 2 },
  showDots: { type: Boolean, default: true },
  dotRadius: { type: Number, default: 4 },
  showArea: { type: Boolean, default: false },
  showGrid: { type: Boolean, default: true },
  formatX: { type: Function, default: v => v },
  formatY: { type: Function, default: v => v },

  // ✅ 延展點：可注入 scale / axis / generator
  xScaleFactory: { type: Function, default: null },
  yScaleFactory: { type: Function, default: null },
  xAxisFactory: { type: Function, default: null },
  yAxisFactory: { type: Function, default: null },
  lineGeneratorFactory: { type: Function, default: null },
  areaGeneratorFactory: { type: Function, default: null },
  keyFn: { type: Function, default: (_d, i) => i }
});

const emit = defineEmits([
  'point-hover',
  'point-click',
  'tooltip-show',
  'tooltip-move',
  'tooltip-hide'
]);

const containerRef = ref(null);
const gridLayerRef = ref(null);
const areaLayerRef = ref(null);
const lineLayerRef = ref(null);
const dotsLayerRef = ref(null);
const xAxisRef = ref(null);
const yAxisRef = ref(null);

const chartWidth = computed(() => props.width - props.margin.left - props.margin.right);
const chartHeight = computed(() => props.height - props.margin.top - props.margin.bottom);

const xScale = computed(() => {
  if (typeof props.xScaleFactory === 'function') {
    return props.xScaleFactory({ d3, data: props.data, xValue: props.xValue, width: chartWidth.value });
  }
  return d3.scaleTime()
    .domain(d3.extent(props.data, props.xValue))
    .range([0, chartWidth.value]);
});

const yScale = computed(() => {
  if (typeof props.yScaleFactory === 'function') {
    return props.yScaleFactory({ d3, data: props.data, yValue: props.yValue, height: chartHeight.value });
  }
  return d3.scaleLinear()
    .domain([0, d3.max(props.data, props.yValue) || 100])
    .range([chartHeight.value, 0])
    .nice();
});

const buildTooltipPosition = (event) => {
  const rect = containerRef.value?.getBoundingClientRect?.();
  const pageX = event.clientX;
  const pageY = event.clientY;
  const containerX = rect ? pageX - rect.left : null;
  const containerY = rect ? pageY - rect.top : null;
  const plotX = containerX !== null ? containerX - props.margin.left : null;
  const plotY = containerY !== null ? containerY - props.margin.top : null;
  return { pageX, pageY, containerX, containerY, plotX, plotY };
};

const renderDots = () => {
  const dotData = props.showDots ? props.data : [];
  const dots = d3.select(dotsLayerRef.value).selectAll('circle.dot').data(dotData, props.keyFn);
  const enter = dots.enter().append('circle').attr('class', 'dot');

  enter
    .on('mouseenter', (event, d) => {
      emit('point-hover', d);
      emit('tooltip-show', { position: buildTooltipPosition(event), data: d });
    })
    .on('mousemove', (event, d) => {
      emit('tooltip-move', { position: buildTooltipPosition(event), data: d });
    })
    .on('mouseleave', () => emit('tooltip-hide'))
    .on('click', (_event, d) => emit('point-click', d));

  dots.merge(enter)
    .attr('cx', (d) => xScale.value(props.xValue(d)))
    .attr('cy', (d) => yScale.value(props.yValue(d)))
    .attr('r', props.dotRadius)
    .attr('fill', props.lineColor);

  dots.exit().remove();
};

watchEffect(() => {
  // axes / grid / line / area / dots 都用 D3 join 做增量更新
  renderDots();
});
&lt;/script&gt;

&lt;style scoped&gt;
.line-chart {
  position: relative;
}

.line {
  transition: stroke-width 0.3s;
}

.line:hover {
  stroke-width: 4;
}

.dot {
  cursor: pointer;
  transition: r 0.2s;
}

.dot:hover {
  r: 6;
}

&lt;/style&gt;</code></pre>
        </div>
      </div>

      <!-- 互動範例 3：折線圖 -->
      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎨 範例 3：折線圖（時間序列）</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="generateLineData" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            重新生成
          </button>
          <button type="button" @click="toggleArea" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {{ showArea3 ? '隱藏' : '顯示' }}面積
          </button>
          <button type="button" @click="toggleDots" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            {{ showDots3 ? '隱藏' : '顯示' }}資料點
          </button>
        </div>
        
        <!-- 內聯折線圖實作 -->
        <svg width="600" height="400" class="bg-white rounded border">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
            </linearGradient>
          </defs>
          <g :transform="`translate(${lineMargin3.left}, ${lineMargin3.top})`">
            <!-- 網格線 -->
            <g v-if="lineYScale3" class="grid">
              <line
                v-for="tick in lineYScale3.ticks(5)"
                :key="tick"
                :x1="0"
                :x2="lineChartWidth3"
                :y1="lineYScale3(tick)"
                :y2="lineYScale3(tick)"
                stroke="#e5e7eb"
                stroke-dasharray="2,2"
              />
            </g>
            
            <!-- 面積圖 -->
            <path
              v-if="showArea3"
              :d="lineAreaPath3"
              fill="url(#lineGradient)"
            />
            
            <!-- 折線 -->
            <path
              :d="lineLinePath3"
              fill="none"
              stroke="#3b82f6"
              stroke-width="2"
            />
            
            <!-- 資料點 -->
            <circle
              v-for="(d, i) in lineData3"
              v-show="showDots3"
              :key="i"
              :cx="lineXScale3(d.date)"
              :cy="lineYScale3(d.value)"
              r="4"
              fill="#3b82f6"
              class="cursor-pointer"
            />
            
            <g ref="lineXAxis3" :transform="`translate(0, ${lineChartHeight3})`"></g>
            <g ref="lineYAxis3"></g>
          </g>
        </svg>
      </div>
    </section>

    <!-- 第三部分：響應式設計 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-green-700">3️⃣ 響應式設計（RWD）</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          使用 <code>ResizeObserver</code> 或 Vue 的響應式系統實現自適應寬度。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm" v-pre><code>&lt;template&gt;
  &lt;div ref="containerRef" class="w-full"&gt;
    &lt;BarChart
      :data="data"
      :width="containerWidth"
      :height="300"
    /&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, onMounted, onUnmounted } from 'vue';

const containerRef = ref(null);
const containerWidth = ref(600);

let resizeObserver;

onMounted(() => {
  if (containerRef.value) {
    // 初始寬度
    containerWidth.value = containerRef.value.clientWidth;
    
    // 監聽容器大小變化
    resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        containerWidth.value = entry.contentRect.width;
      }
    });
    
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
&lt;/script&gt;</code></pre>
        </div>
      </div>

      <!-- 互動範例 4：響應式圖表 -->
      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎨 範例 4：響應式寬度（調整瀏覽器試試）</h4>
        <div ref="responsiveContainer" class="w-full">
          <svg :width="responsiveWidth" height="300" class="bg-white rounded border">
            <g :transform="`translate(${barMargin4.left}, ${barMargin4.top})`">
              <rect
                v-for="d in barData1"
                :key="d.name"
                :x="barXScale4(d.name)"
                :y="barYScale4(d.value)"
                :width="barXScale4.bandwidth()"
                :height="barChartHeight4 - barYScale4(d.value)"
                fill="steelblue"
                class="transition-all duration-300"
              />
              
              <g ref="barXAxis4" :transform="`translate(0, ${barChartHeight4})`"></g>
              <g ref="barYAxis4"></g>
              
              <text
                :x="barChartWidth4 / 2"
                :y="-10"
                text-anchor="middle"
                font-size="16"
                font-weight="bold"
                fill="#1f2937"
              >響應式長條圖</text>
            </g>
          </svg>
        </div>
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>當前寬度：</strong>{{ responsiveWidth }}px
        </div>
      </div>
    </section>

    <!-- 學習總結 -->
    <section class="p-6 bg-gradient-to-r from-green-100 to-teal-100 rounded-lg">
      <h3 class="text-2xl font-bold mb-4 text-green-800">✅ 學習總結</h3>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-green-700 mb-2">🎯 元件設計原則</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>靈活的 Props（資料存取器函數）</li>
            <li>可注入 factories（scale/axis 可替換）</li>
            <li>事件發射（click/hover/tooltip-*，position 多座標系，搭配 Teleport 統一 UI）</li>
            <li>響應式更新（computed, watchEffect）</li>
            <li>RWD 支援（ResizeObserver）</li>
          </ul>
        </div>
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-teal-700 mb-2">🚀 下一步</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>實作圓餅圖、散佈圖</li>
            <li>添加縮放、拖曳互動</li>
            <li>效能優化（虛擬滾動）</li>
            <li>TypeScript 型別定義</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import * as d3 from 'd3';

// ========== 範例 1：基本長條圖 ==========
const barData1 = ref([
  { name: '1月', value: 30 },
  { name: '2月', value: 50 },
  { name: '3月', value: 40 },
  { name: '4月', value: 60 }
]);

const showLabels1 = ref(false);
const clickLog1 = ref('');
const barXAxis1 = ref(null);
const barYAxis1 = ref(null);

const barMargin1 = { top: 40, right: 20, bottom: 60, left: 60 };
const barChartWidth1 = 600 - barMargin1.left - barMargin1.right;
const barChartHeight1 = 400 - barMargin1.top - barMargin1.bottom;

const barXScale1 = computed(() =>
  d3.scaleBand()
    .domain(barData1.value.map(d => d.name))
    .range([0, barChartWidth1])
    .padding(0.2)
);

const barYScale1 = computed(() =>
  d3.scaleLinear()
    .domain([0, d3.max(barData1.value, d => d.value) || 100])
    .range([barChartHeight1, 0])
    .nice()
);

watchEffect(() => {
  if (barXAxis1.value) {
    d3.select(barXAxis1.value).call(d3.axisBottom(barXScale1.value));
  }
  if (barYAxis1.value) {
    d3.select(barYAxis1.value).call(d3.axisLeft(barYScale1.value).ticks(5));
  }
});

const updateBarData = () => {
  barData1.value = barData1.value.map(d => ({
    ...d,
    value: Math.floor(Math.random() * 60) + 20
  }));
};

const toggleLabels = () => {
  showLabels1.value = !showLabels1.value;
};

const handleBarClick1 = (data) => {
  clickLog1.value = `點擊了 ${data.name}，值為 ${data.value}`;
};

// ========== 範例 2：自訂配色 ==========
const barData2 = ref([
  { name: '產品A', value: 45 },
  { name: '產品B', value: 78 },
  { name: '產品C', value: 32 },
  { name: '產品D', value: 91 },
  { name: '產品E', value: 56 }
]);

const barXAxis2 = ref(null);
const barYAxis2 = ref(null);

const barMargin2 = { top: 40, right: 20, bottom: 60, left: 60 };
const barChartWidth2 = 600 - barMargin2.left - barMargin2.right;
const barChartHeight2 = 400 - barMargin2.top - barMargin2.bottom;

const barXScale2 = computed(() =>
  d3.scaleBand()
    .domain(barData2.value.map(d => d.name))
    .range([0, barChartWidth2])
    .padding(0.2)
);

const barYScale2 = computed(() =>
  d3.scaleLinear()
    .domain([0, d3.max(barData2.value, d => d.value) || 100])
    .range([barChartHeight2, 0])
    .nice()
);

watchEffect(() => {
  if (barXAxis2.value) {
    d3.select(barXAxis2.value).call(d3.axisBottom(barXScale2.value));
  }
  if (barYAxis2.value) {
    d3.select(barYAxis2.value).call(d3.axisLeft(barYScale2.value).ticks(5));
  }
});

const getColorByValue = (d) => {
  const value = d.value;
  if (value < 50) return '#ef4444'; // 紅色
  if (value < 70) return '#eab308'; // 黃色
  return '#22c55e'; // 綠色
};

const randomizeBarData2 = () => {
  barData2.value = barData2.value.map(d => ({
    ...d,
    value: Math.floor(Math.random() * 100)
  }));
};

// ========== 範例 3：折線圖 ==========
const lineData3 = ref([]);
const showArea3 = ref(false);
const showDots3 = ref(true);
const lineXAxis3 = ref(null);
const lineYAxis3 = ref(null);

const lineMargin3 = { top: 20, right: 20, bottom: 60, left: 60 };
const lineChartWidth3 = 600 - lineMargin3.left - lineMargin3.right;
const lineChartHeight3 = 400 - lineMargin3.top - lineMargin3.bottom;

const lineXScale3 = computed(() => {
  if (lineData3.value.length === 0) return null;
  return d3.scaleTime()
    .domain(d3.extent(lineData3.value, d => d.date))
    .range([0, lineChartWidth3]);
});

const lineYScale3 = computed(() => {
  if (lineData3.value.length === 0) return null;
  return d3.scaleLinear()
    .domain([0, d3.max(lineData3.value, d => d.value) || 100])
    .range([lineChartHeight3, 0])
    .nice();
});

const lineLinePath3 = computed(() => {
  if (!lineXScale3.value || !lineYScale3.value || lineData3.value.length === 0) return '';
  const line = d3.line()
    .x(d => lineXScale3.value(d.date))
    .y(d => lineYScale3.value(d.value))
    .curve(d3.curveMonotoneX);
  return line(lineData3.value);
});

const lineAreaPath3 = computed(() => {
  if (!lineXScale3.value || !lineYScale3.value || lineData3.value.length === 0) return '';
  const area = d3.area()
    .x(d => lineXScale3.value(d.date))
    .y0(lineChartHeight3)
    .y1(d => lineYScale3.value(d.value))
    .curve(d3.curveMonotoneX);
  return area(lineData3.value);
});

watchEffect(() => {
  if (lineXAxis3.value && lineXScale3.value) {
    d3.select(lineXAxis3.value).call(d3.axisBottom(lineXScale3.value).ticks(6));
  }
  if (lineYAxis3.value && lineYScale3.value) {
    d3.select(lineYAxis3.value).call(d3.axisLeft(lineYScale3.value).ticks(5));
  }
});

const generateLineData = () => {
  const now = new Date();
  lineData3.value = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date,
      value: Math.random() * 50 + 20 + Math.sin(i / 5) * 10
    };
  });
};

// 預先產生資料，避免首次 render 時 scale 為 null
generateLineData();

const toggleArea = () => {
  showArea3.value = !showArea3.value;
};

const toggleDots = () => {
  showDots3.value = !showDots3.value;
};

// ========== 範例 4：響應式 ==========
const responsiveContainer = ref(null);
const responsiveWidth = ref(600);
const barXAxis4 = ref(null);
const barYAxis4 = ref(null);

const barMargin4 = { top: 40, right: 20, bottom: 60, left: 60 };
const barChartWidth4 = computed(() => responsiveWidth.value - barMargin4.left - barMargin4.right);
const barChartHeight4 = 300 - barMargin4.top - barMargin4.bottom;

const barXScale4 = computed(() =>
  d3.scaleBand()
    .domain(barData1.value.map(d => d.name))
    .range([0, barChartWidth4.value])
    .padding(0.2)
);

const barYScale4 = computed(() =>
  d3.scaleLinear()
    .domain([0, d3.max(barData1.value, d => d.value) || 100])
    .range([barChartHeight4, 0])
    .nice()
);

watchEffect(() => {
  if (barXAxis4.value) {
    d3.select(barXAxis4.value).call(d3.axisBottom(barXScale4.value));
  }
  if (barYAxis4.value) {
    d3.select(barYAxis4.value).call(d3.axisLeft(barYScale4.value).ticks(5));
  }
});

let resizeObserver;

onMounted(() => {
  generateLineData();
  
  if (responsiveContainer.value) {
    responsiveWidth.value = responsiveContainer.value.clientWidth;
    
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        responsiveWidth.value = entry.contentRect.width;
      }
    });
    
    resizeObserver.observe(responsiveContainer.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
code {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

pre code {
  font-size: 0.85em;
  line-height: 1.5;
}
</style>
