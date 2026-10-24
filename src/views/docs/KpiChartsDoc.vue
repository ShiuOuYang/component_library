<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">KPI 小圖：SparklineChart、GaugeChart</h1>
        <p class="text-lg text-content-secondary">
          儀表板最上面那一排數字。單一數值不需要畫成圖表 —— 用 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">ChptStatistic</code> 顯示數字與漲跌，
          旁邊加一條迷你趨勢線（SparklineChart）交代走勢；要對照目標或紅黃綠區間時用儀表（GaugeChart）。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入；型別
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">SparklinePoint</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">SparklineTooltip</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">GaugeBand</code> 也從同一個入口取得。
        </p>
      </div>

      <section id="cards" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">KPI 卡片</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>ChptStatistic</code> 的 <code>footer</code> 插槽放 SparklineChart：數字是主角，趨勢線用淡化色、最新一點用強調色。
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="k in kpis" :key="k.title" class="rounded-xl border border-stroke-light bg-surface-primary p-4">
            <ChptStatistic
              :title="k.title"
              :value="k.value"
              :precision="k.precision"
              :suffix="k.suffix"
              :delta="k.delta"
              delta-suffix="%"
              :higher-is-better="k.higherIsBetter"
              description="與上週比"
            >
              <template #footer>
                <div class="mt-2 h-8">
                  <SparklineChart
                    :data="k.trend"
                    :type="k.type"
                    :title="`${k.title}（近 12 週）`"
                    :value-format="k.format"
                    :auto-resize="true"
                  />
                </div>
              </template>
            </ChptStatistic>
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="cardCode" />
      </section>

      <section id="sparkline" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">迷你趨勢線</h2>
        <p class="text-sm text-content-secondary mb-4">
          線、面積、長條三種。<code>show-min-max</code> 標出最高最低點，<code>reference-value</code> 畫目標線；資料可以是數字陣列，
          或物件陣列（<code>value-field</code>／<code>label-field</code>，滑過時顯示標籤）。<code>null</code> 會斷開線段。
        </p>
        <div class="grid gap-6 sm:grid-cols-3">
          <div v-for="s in sparkDemos" :key="s.label" class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <p class="mb-2 text-xs text-content-secondary">{{ s.label }}</p>
            <SparklineChart v-bind="s.props" :width="200" :height="48" />
          </div>
        </div>
      </section>

      <section id="gauge" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">儀表</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>bands</code> 定義區間（例如未達標／注意／達標）：填色代表目前落在哪一區，軌道是同色的淡色，
          狀態一定同時有圖示與文字。<code>target</code> 畫目標刻度；<code>sweep</code> 調整角度（180 是半圓）。
        </p>
        <div class="mb-4 flex items-center gap-3 text-sm">
          <label for="gauge-value" class="text-content-secondary">良率</label>
          <input id="gauge-value" v-model.number="yieldValue" type="range" min="85" max="100" step="0.1" class="w-60" />
          <span class="tabular-nums text-content-primary">{{ yieldValue.toFixed(1) }}%</span>
        </div>
        <div class="grid gap-6 sm:grid-cols-3">
          <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <GaugeChart
              :value="yieldValue"
              :min="85"
              :max="100"
              :bands="yieldBands"
              :target="97"
              unit="%"
              title="今日良率"
              :value-format="(v) => v.toFixed(1)"
              :auto-resize="true"
            />
          </div>
          <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <GaugeChart :value="oee" :bands="oeeBands" unit="%" title="OEE" :sweep="180" :auto-resize="true" />
          </div>
          <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <GaugeChart :value="1840" :min="0" :max="2400" :target="2000" title="今日產量（pcs）" :auto-resize="true" />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="gaugeCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <h3 class="text-lg font-semibold text-content-primary mt-4">SparklineChart</h3>
        <ApiTable of="SparklineChart" title="Props" :rows="sparkProps" />
        <ApiTable of="SparklineChart" title="Events" :rows="sparkEvents" />
        <ApiTable of="SparklineChart" title="Slots" :rows="sparkSlots" />
        <h3 class="text-lg font-semibold text-content-primary mt-6">GaugeChart</h3>
        <ApiTable of="GaugeChart" title="Props" :rows="gaugeProps" />
        <ApiTable of="GaugeChart" title="Events" :rows="gaugeEvents" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, ChptStatistic, GaugeChart, SparklineChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const kpis = [
  {
    title: '良率',
    value: 98.6,
    precision: 1,
    suffix: '%',
    delta: 0.4,
    higherIsBetter: true,
    type: 'line',
    format: (v) => `${v.toFixed(1)}%`,
    trend: [97.2, 97.8, 97.5, 98.1, 97.9, 98.3, 98.0, 98.4, 98.2, 98.5, 98.2, 98.6],
  },
  {
    title: '產量',
    value: 52840,
    precision: 0,
    suffix: 'pcs',
    delta: 3.1,
    higherIsBetter: true,
    type: 'bar',
    format: (v) => v.toLocaleString(),
    trend: [46100, 47800, 45200, 49900, 48300, 50100, 47600, 51200, 49800, 50600, 51300, 52840],
  },
  {
    title: '不良率',
    value: 1.4,
    precision: 1,
    suffix: '%',
    delta: -0.4,
    higherIsBetter: false,
    type: 'area',
    format: (v) => `${v.toFixed(1)}%`,
    trend: [2.8, 2.2, 2.5, 1.9, 2.1, 1.7, 2.0, 1.6, 1.8, 1.5, 1.8, 1.4],
  },
  {
    title: '停機時數',
    value: 6.5,
    precision: 1,
    suffix: 'h',
    delta: 12.0,
    higherIsBetter: false,
    type: 'line',
    format: (v) => `${v} h`,
    trend: [4.2, 5.1, 3.8, 4.6, 5.9, 4.4, 5.2, 4.8, 6.1, 5.5, 5.8, 6.5],
  },
]

const weekly = ['W31', 'W32', 'W33', 'W34', 'W35', 'W36', 'W37', 'W38', 'W39', 'W40', 'W41', 'W42']
const sparkDemos = [
  {
    label: '線 + 最高最低點（物件資料，滑過顯示週次）',
    props: {
      data: weekly.map((w, i) => ({ week: w, yield: kpis[0].trend[i] })),
      valueField: 'yield',
      labelField: 'week',
      showMinMax: true,
      title: '良率',
      valueFormat: (v) => `${v.toFixed(1)}%`,
    },
  },
  {
    label: '面積 + 目標線（目標 2.0%）',
    props: { data: kpis[2].trend, type: 'area', referenceValue: 2, title: '不良率', valueFormat: (v) => `${v}%` },
  },
  {
    label: '長條，中間缺一筆（null）',
    props: { data: [12, 18, 9, null, 22, 17, 25, 21], type: 'bar', title: '每日異常件數' },
  },
]

const yieldValue = ref(96.4)
const yieldBands = [
  { to: 95, status: 'critical', label: '未達標' },
  { to: 97, status: 'warning', label: '注意' },
  { to: 100, status: 'good', label: '達標' },
]
const oee = 72
const oeeBands = [
  { to: 60, status: 'critical', label: '偏低' },
  { to: 85, status: 'warning', label: '一般' },
  { to: 100, status: 'good', label: '世界級' },
]

const cardCode = `<ChptStatistic title="良率" :value="98.6" :precision="1" suffix="%" :delta="0.4" higher-is-better>
  <template #footer>
    <div class="mt-2 h-8">
      <SparklineChart :data="trend" title="良率（近 12 週）" :auto-resize="true" />
    </div>
  </template>
</ChptStatistic>`

const gaugeCode = `<GaugeChart
  :value="96.4"
  :min="85" :max="100"
  :bands="[
    { to: 95, status: 'critical', label: '未達標' },
    { to: 97, status: 'warning', label: '注意' },
    { to: 100, status: 'good', label: '達標' },
  ]"
  :target="97"
  unit="%"
  title="今日良率"
/>`

const sparkProps = [
  { name: 'data', type: '(number | null | object)[]', def: '—', desc: '數字陣列，或物件陣列（用 valueField / labelField 取值）；null 斷開線段' },
  { name: 'valueField / labelField', type: 'string', def: "'value' / 'label'", desc: '物件資料的數值與標籤欄位（標籤顯示在提示框，例如日期）' },
  { name: 'type', type: "'line' | 'area' | 'bar'", def: "'line'", desc: '線、面積（同色淡淡一層）、長條（從 0 長出來）' },
  { name: 'yDomain', type: '[min, max] | null', def: 'null', desc: '數值範圍；未指定時依資料（長條一定含 0）' },
  { name: 'color / accentColor', type: 'string | null', def: 'null / null', desc: '走勢的顏色（預設淡化色）與最新一點的顏色（預設類別色第 1 號）' },
  { name: 'showLastPoint / showMinMax', type: 'boolean', def: 'true / false', desc: '最新一點（或最後一根長條）用強調色；標出最高最低點' },
  { name: 'referenceValue', type: 'number | null', def: 'null', desc: '參考線（例如目標值）' },
  { name: 'valueFormat', type: '(v) => string', def: "d3.format(',~f')", desc: '提示框與摘要的數值格式' },
  { name: 'title', type: 'string', def: "''", desc: '讀螢幕的摘要名稱（畫面上不顯示）；摘要會念出筆數、首尾、最高最低' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑鼠移動時，垂直線對到最近的一點並顯示數值' },
  { name: 'width / height / autoResize', type: 'number / boolean', def: '120 / 32 / false', desc: 'autoResize 時跟著容器寬高（容器需有高度）' },
  { name: 'margin / debounceDelay', type: '{ top, right, bottom, left } / number', def: '{ 6, 6, 6, 2 } / 150', desc: '預留給端點圓點的空間、autoResize 的重畫延遲（ms）' },
]

const sparkEvents = [
  { name: 'point-hover', type: 'SparklinePoint', desc: '{ index, value, label, datum }' },
  { name: 'tooltip-show / tooltip-hide', type: 'SparklineTooltip / —', desc: '提示框顯示與隱藏' },
  { name: 'chart-ready / chart-resize', type: '{ width, height }', desc: '掛載完成、autoResize 尺寸改變' },
]

const sparkSlots = [{ name: 'tooltip', type: '{ tooltipData, tooltipVisible }', desc: '完全自訂提示框' }]

const gaugeProps = [
  { name: 'value', type: 'number | null', def: '—', desc: '數值；null 顯示「—」' },
  { name: 'min / max', type: 'number', def: '0 / 100', desc: '範圍；超出範圍的值畫在端點，但中央顯示實際數值' },
  { name: 'bands', type: 'GaugeBand[] | null', def: 'null', desc: '由小到大的區間 { to, color?, label?, status? }；status 為 good / warning / critical 時用狀態色與對應圖示' },
  { name: 'target / targetLabel', type: 'number | null / string', def: "null / '目標'", desc: '目標刻度' },
  { name: 'sweep', type: 'number', def: '240', desc: '掃描角度（度，90～300）；180 是半圓' },
  { name: 'thickness', type: 'number', def: '14', desc: '弧的粗細（以 200 寬為基準）' },
  { name: 'title / unit', type: 'string', def: "'' / ''", desc: '數值下方的名稱（也是讀螢幕的名稱）、數值後的單位' },
  { name: 'valueFormat', type: '(v) => string', def: "d3.format(',~f')", desc: '數值格式' },
  { name: 'showMinMax / showBands', type: 'boolean', def: 'true / true', desc: '兩端的最小最大值、外圈的區間細環' },
  { name: 'width / autoResize', type: 'number / boolean', def: '200 / false', desc: '寬度（高度依角度算）；autoResize 時寬度跟著容器' },
]

const gaugeEvents = [{ name: 'chart-ready', type: '{ width, height }', desc: '掛載完成' }]
</script>
