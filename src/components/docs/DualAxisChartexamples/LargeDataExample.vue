<template>
  <div class="mb-8">
    <h3 class="text-2xl font-semibold text-content-primary mb-4">範例 H：大量資料（10 萬筆）與滾輪縮放</h3>
    <p class="text-content-secondary mb-4">
      在圖上<strong>滾動滑鼠滾輪</strong>以游標為中心放大／縮小 X 軸；在左右 Y 軸上滾動則縮放該軸；
      觸控板左右滑動（或 <kbd>Shift</kbd> + 滾輪）平移。縮到底會自動回到全覽。
      左軸用 <code>y-left-domain</code> 聚焦在 56～64，超出的資料在 Y 軸上往外滾就看得到。
      超過 <code>largeDataThreshold</code>（預設 2000 筆）的圖層自動切換為大量資料模式：
      折線依像素降採樣、散點與長條改用 Canvas 繪製，滑鼠提示仍可指到每一筆原始資料。
    </p>

    <div class="mb-3 flex flex-wrap items-center gap-3 text-sm">
      <ChptSegmented v-model="count" :options="countOptions" aria-label="資料筆數" />
      <span class="text-content-secondary" aria-live="polite">
        共 {{ total.toLocaleString() }} 筆<template v-if="renderMs !== null">，渲染 {{ renderMs }} ms</template>
      </span>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <div class="relative bg-surface-secondary rounded-xl p-4 border border-stroke-light">
        <div style="width: 100%; height: 420px;">
          <DualAxisComboChart
            :auto-resize="true"
            :layers="layers"
            x-scale-type="time"
            :x-axis-format="timeFormat"
            :y-left-domain="[56, 64]"
            brush-mode="x"
            title="產線感測器（每秒一筆）"
            y-left-axis-label="溫度"
            y-right-axis-label="振動"
            @tooltip-show="onTooltipShow"
            @tooltip-hide="tooltip = null"
          />
        </div>
        <div
          v-if="tooltip"
          class="pointer-events-none absolute z-10 rounded-md border border-stroke-light bg-surface-primary px-2 py-1 text-xs text-content-primary shadow"
          :style="{ left: `${tooltip.x + 16}px`, top: `${tooltip.y + 16}px` }"
        >
          {{ tooltip.text }}
        </div>
      </div>

      <ChptCodeBlock language="javascript" :code="codeExample" />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import * as d3 from 'd3';
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue';
import { ChptCodeBlock } from '@/components/library';
import ChptSegmented from '@/components/library/ui/ChptSegmented.vue';

const countOptions = [
  { label: '1 萬筆', value: 10000 },
  { label: '10 萬筆', value: 100000 },
  { label: '20 萬筆', value: 200000 },
];
const count = ref(100000);
const renderMs = ref(null);
const tooltip = ref(null);

/** 刻度依縮放程度切換格式：整天顯示日期、整點顯示時分、放大到秒顯示時分秒 */
const formatDay = d3.timeFormat('%m/%d');
const formatMinute = d3.timeFormat('%H:%M');
const formatSecond = d3.timeFormat('%H:%M:%S');
function timeFormat(date) {
  if (d3.timeMinute(date) < date) return formatSecond(date);
  if (d3.timeDay(date) < date) return formatMinute(date);
  return formatDay(date);
}

/** 可重現的亂數（每次切換筆數看到同一組資料） */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 產生 n 筆每秒一筆的感測資料：緩慢漂移的溫度 + 偶發尖峰的振動 */
function generate(n) {
  const rand = seeded(42);
  const start = new Date('2026-10-01T08:00:00').getTime();
  const rows = new Array(n);
  let temp = 60;
  for (let i = 0; i < n; i++) {
    temp += (rand() - 0.5) * 0.4 + (60 - temp) * 0.002;
    const spike = rand() < 0.002 ? rand() * 6 : 0;
    rows[i] = { time: new Date(start + i * 1000), temp, vibration: 1 + rand() * 0.8 + spike };
  }
  return rows;
}

// ✅ 大量資料用 shallowRef：Vue 不必把 10 萬個物件逐一包成響應式 Proxy
const rows = shallowRef(generate(count.value));
const total = computed(() => rows.value.length);

const layers = computed(() => [
  {
    type: 'line',
    data: rows.value,
    yAxis: 'left',
    xValue: (d) => d.time,
    yValue: (d) => d.temp,
    lineColor: '#2563eb',
    strokeWidth: 1.5,
    curve: d3.curveLinear,
    legend: { label: '溫度 (°C)' },
  },
  {
    type: 'scatter',
    data: rows.value,
    yAxis: 'right',
    xValue: (d) => d.time,
    yValue: (d) => d.vibration,
    dotColor: '#f97316',
    dotSize: 2,
    dotOpacity: 0.5,
    legend: { label: '振動 (mm/s)' },
  },
]);

/** 量從換資料到畫面畫完（兩個 animation frame）的時間 */
watch(count, async (n) => {
  renderMs.value = null;
  const t0 = performance.now();
  rows.value = generate(n);
  await nextTick();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  renderMs.value = Math.round(performance.now() - t0);
});

const tooltipFormat = d3.timeFormat('%H:%M:%S');
function onTooltipShow({ position, data, layer }) {
  const label = layer.legend?.label ?? '';
  const value = layer.type === 'line' ? data.temp : data.vibration;
  tooltip.value = {
    x: (position.containerX ?? 0) + 16,
    y: (position.containerY ?? 0) + 16,
    text: `${tooltipFormat(data.time)}  ${label}：${value.toFixed(2)}`,
  };
}

const codeExample = `// 10 萬筆資料：用 shallowRef（或 markRaw）避免 Vue 深層代理
const rows = shallowRef(generate(100000))

const layers = computed(() => [
  { type: 'line', data: rows.value, yAxis: 'left',
    xValue: d => d.time, yValue: d => d.temp, curve: d3.curveLinear },
  { type: 'scatter', data: rows.value, yAxis: 'right',
    xValue: d => d.time, yValue: d => d.vibration, dotSize: 2 },
])

<DualAxisComboChart
  :layers="layers"
  x-scale-type="time"
  brush-mode="x"
  :large-data-threshold="2000"   // 超過就降採樣 / 改用 Canvas
  :enable-wheel-zoom="true"      // 預設開啟
  wheel-zoom-modifier="none"     // 'ctrl' | 'shift' | 'alt'：按住才縮放
  @wheel-zoom="({ axis, domain }) => ..."
/>`;
</script>
