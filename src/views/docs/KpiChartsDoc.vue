<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">KPI：ChptKpiCard、SparklineChart、GaugeChart</h1>
        <p class="text-lg text-content-secondary">
          儀表板最上面那一排數字。單一數值不需要畫成圖表 —— 用 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">ChptStatistic</code> 顯示數字與漲跌，
          旁邊加一條迷你趨勢線（SparklineChart）交代走勢；要對照目標或紅黃綠區間時用儀表（GaugeChart）。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入；型別
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">SparklinePoint</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">SparklineTooltip</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">GaugeBand</code> 也從同一個入口取得。
        </p>
      </div>

      <section id="cards" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">KPI 卡片：ChptKpiCard</h2>
        <p class="text-sm text-content-secondary mb-4">
          數字、與前期比較、趨勢線、是否達標，一個元件做完。給 <code>previous</code> 自動算出變化；給 <code>target</code>（與 <code>thresholds</code>）
          自動判定達標 / 接近 / 未達標 —— 左側色條、圖示與文字一起表示（不只靠顏色），目標也畫成趨勢線上的虛線。
          好壞跟著 <code>higher-is-better</code>：不良率、停機時數下降才是綠色。
        </p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ChptKpiCard
            v-for="k in kpiCards"
            :key="k.title"
            v-bind="k"
            comparison-label="較上週"
            trend-label="近 12 週"
          />
        </div>

        <h3 class="mt-8 mb-2 text-lg font-semibold text-content-primary">小尺寸、可點、載入中</h3>
        <p class="text-sm text-content-secondary mb-4">
          <code>clickable</code> 時整張卡片可點（送出 <code>click</code>，例如切到明細），鍵盤 Tab 到卡片按 Enter 也可以；
          讀螢幕會念出「標題、數值、狀態、目標」。<code>actions</code> 插槽的按鈕仍可單獨操作。
        </p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ChptKpiCard
            v-for="k in kpiCards"
            :key="`sm-${k.title}`"
            v-bind="k"
            size="sm"
            clickable
            comparison-label="較上週"
            @click="lastClicked = k.title"
          />
        </div>
        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ChptKpiCard title="今日產量" :value="null" loading size="sm" />
          <ChptKpiCard title="在線人數" :value="38" suffix="人" :previous="41" delta-mode="absolute" :delta-precision="0" comparison-label="較昨日" size="sm">
            <template #actions>
              <ChptButton size="xs" is-outline @click="lastClicked = '在線人數：重新整理'">重新整理</ChptButton>
            </template>
          </ChptKpiCard>
        </div>
        <p class="mt-2 text-xs text-content-tertiary" aria-live="polite">{{ lastClicked ? `點了：${lastClicked}` : '點任一張小卡片' }}</p>
        <ChptCodeBlock class="mt-4" :code="cardCode" />
        <p class="mt-3 text-sm text-content-secondary">
          需要更自由的版面時，也可以自己組合：<code>ChptStatistic</code> 的 <code>footer</code> 插槽放 <code>SparklineChart</code>（ChptKpiCard 就是這樣組成的）。
        </p>
      </section>

      <section id="sparkline" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">迷你趨勢線</h2>
        <p class="text-sm text-content-secondary mb-4">
          線、面積、長條三種。<code>show-min-max</code> 標出最高最低點，<code>reference-value</code> 畫目標線；資料可以是數字陣列，
          或物件陣列（<code>value-field</code>／<code>label-field</code>，滑過時顯示標籤）。<code>null</code> 會斷開線段。
        </p>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div v-for="s in sparkDemos" :key="s.label" class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <p class="mb-2 text-xs text-content-secondary">{{ s.label }}</p>
            <SparklineChart v-bind="s.props" :width="200" :height="48" />
          </div>
        </div>
      </section>

      <section id="gauge" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
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
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
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

      <section id="bullet" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">BulletChart 子彈圖</h2>
        <p class="text-sm text-content-secondary mb-4">
          一列一個指標：底色是區間（差 / 普通 / 好）、中間細長條是實際值、直線是目標、淡色細線是前期值。
          比儀表省空間，好幾個指標上下排在一起就能比較。區間格式與 GaugeChart 相同；有 <code>label</code> 時右側顯示狀態（圖示 + 文字）。
          綁 <code>@item-click</code> 後每一列可以點（也能用 Tab + Enter）。
        </p>
        <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
          <BulletChart :items="lineOee" :bands="oeeBands" :max="100" title="各線 OEE（今日）" auto-resize @item-click="(i) => (pickedLine = i.label)" />
          <p class="mt-2 text-xs text-content-tertiary" aria-live="polite">{{ pickedLine ? `已選取：${pickedLine}` : '點一列查看明細' }}</p>
        </div>
        <ChptCodeBlock class="mt-4" :code="bulletCode" />
      </section>

      <section id="funnel" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">YieldFunnel 良率漏斗</h2>
        <p class="text-sm text-content-secondary mb-4">
          依製程順序列出每一站通過後的數量：兩站之間標出站良率與損失，標題列是直通率（RTY = 最後一站 / 投入）。
          損失最多的那一站以紅字與「最大損失」標出 —— 改善先從那一站下手。<code>align="center"</code> 是漏斗外觀。
        </p>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <YieldFunnel :steps="pcbaSteps" unit="pcs" title="PCBA 工單 WO-2611-0042" auto-resize />
          </div>
          <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <YieldFunnel :steps="pcbaSteps" align="center" title="漏斗外觀" :label-width="64" auto-resize />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="funnelCode" />
      </section>

      <section id="calendar" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">CalendarHeatmap 日曆熱圖</h2>
        <p class="text-sm text-content-secondary mb-4">
          每天一格、顏色深淺代表數值：一欄一週、一列一個星期幾，「每週一特別多」這種規律一眼就看得出來（折線圖看不出來）。
          預設把最小～最大值等分成 5 級；<code>thresholds</code> + <code>colors</code> 可以改成門檻分級（例如良率紅黃綠）。
          沒有資料的日子只畫外框（和 0 不同），今天加粗外框；範圍比容器寬時可水平捲動，一開始捲到最近的日子。鍵盤：Tab 進入後 ↑↓ 前後一天、←→ 前後一週、Enter 等同點擊。
        </p>
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <CalendarHeatmap :data="defectDays" title="SMT 每日異常件數（週日停線）" unit="件" end="2026-11-20" @cell-click="(c) => (pickedDay = c)" />
            <p class="mt-2 text-sm text-content-secondary" aria-live="polite">
              {{ pickedDay ? `${pickedDay.date}：${pickedDay.value ?? '無資料'}${pickedDay.value === null ? '' : ' 件'}` : '點一下某一天' }}
            </p>
          </div>
          <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <CalendarHeatmap
              :data="yieldDays"
              title="每日良率（門檻分級）"
              unit="%"
              :thresholds="[95, 98]"
              :colors="['rgb(var(--t-danger-solid))', 'rgb(var(--t-warning-solid))', 'rgb(var(--t-success-solid))']"
              :week-start="0"
              :cell-size="16"
            />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="calendarCode" />
      </section>

      <section id="radar" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">RadarChart 雷達圖</h2>
        <p class="text-sm text-content-secondary mb-4">
          同時比較幾個對象在多個指標上的表現：一個對象一個多邊形，「哪一項特別弱」一眼看出來。每一軸有自己的範圍；
          <code>lowerIsBetter</code> 的指標（不良率、交期天數）反轉方向 —— 越好越靠外圈，整張圖「越大越好」才一致，軸名稱標 ↓。
          滑過點看數值、滑過圖例突顯、點圖例顯示 / 隱藏。指標超過 8 個或系列超過 4 個時建議改用長條圖。
        </p>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <div style="height: 360px">
              <RadarChart :axes="supplierAxes" :series="supplierSeries" title="供應商評分（2026 Q3）" auto-resize />
            </div>
          </div>
          <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
            <div style="height: 360px">
              <RadarChart :axes="oeeAxes" :series="oeeSeries" :max="100" :levels="5" title="各線 OEE 三率（%）" auto-resize />
            </div>
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="radarCode" />
      </section>

      <section id="oee" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">OeeChart OEE 損失瀑布</h2>
        <p class="text-sm text-content-secondary mb-4">
          從<strong>計畫生產時間</strong>依序扣掉六大損失：設備故障、換線調整（稼動損失）→ 小停機、速度降低（性能損失）→ 啟動不良、製程不良（品質損失），
          剩下的就是<strong>有效時間</strong>。上方列出 OEE = 稼動率 × 性能稼動率 × 良率，與世界級水準（OEE 85%、稼動 90%、性能 95%、良率 99.9%）比較，
          並指出最大的單項損失。多台設備時下方並排比較（綠色是有效時間），點一台看它的瀑布圖。
          現場資料若是「停機分鐘 + 理想週期時間 + 生產數 + 良品數」，用 <code>oeeFromCounts</code> 換算成六大損失。
        </p>
        <div class="rounded-xl border border-stroke-light bg-surface-secondary p-4">
          <OeeChart v-model:selected="oeeSelected" :items="oeeItems" title="SMT 線 OEE（11/26 早班，480 分）" auto-resize />
        </div>
        <ChptCodeBlock class="mt-4" :code="oeeCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <h3 class="text-lg font-semibold text-content-primary mt-4">ChptKpiCard</h3>
        <ApiTable of="ChptKpiCard" title="ChptKpiCard Props / Events" :rows="kpiCardProps" />
        <ApiTable of="ChptKpiCard" title="ChptKpiCard Slots" :rows="kpiCardSlots" />
        <ApiTable of="ChptKpiCard" title="ChptKpiCard 方法（ref）" :rows="kpiCardExpose" />
        <h3 class="text-lg font-semibold text-content-primary mt-4">SparklineChart</h3>
        <ApiTable of="SparklineChart" title="Props" :rows="sparkProps" />
        <ApiTable of="SparklineChart" title="Events" :rows="sparkEvents" />
        <ApiTable of="SparklineChart" title="Slots" :rows="sparkSlots" />
        <h3 class="text-lg font-semibold text-content-primary mt-6">GaugeChart</h3>
        <ApiTable of="GaugeChart" title="Props" :rows="gaugeProps" />
        <ApiTable of="GaugeChart" title="Events" :rows="gaugeEvents" />
        <h3 class="text-lg font-semibold text-content-primary mt-6">BulletChart</h3>
        <ApiTable of="BulletChart" title="Props" :rows="bulletProps" />
        <ApiTable of="-" title="BulletItem（items 的每一筆）" :rows="bulletItemRows" />
        <ApiTable of="BulletChart" title="Events" :rows="bulletEvents" />
        <h3 class="text-lg font-semibold text-content-primary mt-6">YieldFunnel</h3>
        <ApiTable of="YieldFunnel" title="Props" :rows="funnelProps" />
        <ApiTable of="YieldFunnel" title="Events" :rows="funnelEvents" />
        <h3 class="text-lg font-semibold text-content-primary mt-6">CalendarHeatmap</h3>
        <ApiTable of="CalendarHeatmap" title="Props" :rows="calendarProps" />
        <ApiTable of="CalendarHeatmap" title="Events" :rows="calendarEvents" />
        <ApiTable of="CalendarHeatmap" title="方法（ref）" :rows="calendarMethods" />
        <h3 class="text-lg font-semibold text-content-primary mt-6">RadarChart</h3>
        <ApiTable of="RadarChart" title="Props" :rows="radarProps" />
        <ApiTable of="-" title="RadarAxis / RadarSeries" :rows="radarDataRows" />
        <ApiTable of="RadarChart" title="Events" :rows="radarEvents" />
        <h3 class="text-lg font-semibold text-content-primary mt-6">OeeChart</h3>
        <ApiTable of="OeeChart" title="Props" :rows="oeeProps" />
        <ApiTable of="-" title="OeeInput / oeeFromCounts" :rows="oeeDataRows" />
        <ApiTable of="OeeChart" title="Events" :rows="oeeEvents" />
        <ApiTable of="OeeChart" title="方法（ref）" :rows="oeeMethods" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { BulletChart, CalendarHeatmap, RadarChart, ChptButton, ChptCodeBlock, ChptKpiCard, GaugeChart, OeeChart, SparklineChart, YieldFunnel, oeeFromCounts } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

// ---- CalendarHeatmap：固定種子的示範資料（每次重新整理都一樣） ----
function seeded(seed) {
  let x = seed
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648)
}
function dayList(endKey, days) {
  const [y, m, d] = endKey.split('-').map(Number)
  return Array.from({ length: days }, (_, i) => new Date(y, m - 1, d - days + 1 + i))
}
const keyOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
const rnd1 = seeded(7)
const defectDays = dayList('2026-11-20', 182)
  .filter((dt) => dt.getDay() !== 0)
  .map((dt) => ({ date: keyOf(dt), value: Math.round((dt.getDay() === 1 ? 14 : 5) + rnd1() * 8 + (dt.getMonth() === 8 ? 6 : 0)) }))
const rnd2 = seeded(42)
const yieldDays = dayList('2026-11-20', 120).map((dt) => ({ date: keyOf(dt), value: Math.round((99.2 - rnd2() ** 3 * 7) * 10) / 10 }))
const pickedDay = ref(null)

// ---- RadarChart ----
const supplierAxes = [
  { key: 'quality', label: '品質分數', max: 100 },
  { key: 'otd', label: '準時交貨率', max: 100, unit: '%' },
  { key: 'price', label: '價格競爭力', max: 100 },
  { key: 'service', label: '服務', max: 100 },
  { key: 'ppm', label: '不良率', max: 1500, unit: 'ppm', lowerIsBetter: true },
  { key: 'lead', label: '交期', max: 30, unit: '天', lowerIsBetter: true },
]
const supplierSeries = [
  { name: '板廠 A', values: { quality: 92, otd: 96, price: 70, service: 85, ppm: 320, lead: 12 } },
  { name: '板廠 B', values: { quality: 78, otd: 88, price: 92, service: 70, ppm: 900, lead: 9 } },
  { name: '板廠 C', values: { quality: 85, otd: 72, price: 80, service: 90, ppm: 540, lead: 21 } },
]
const oeeAxes = [
  { key: 'avail', label: '稼動率', unit: '%' },
  { key: 'perf', label: '性能稼動率', unit: '%' },
  { key: 'quality', label: '良品率', unit: '%' },
  { key: 'oee', label: 'OEE', unit: '%' },
]
const oeeSeries = [
  { name: 'SMT 一線', values: { avail: 92, perf: 88, quality: 99.1, oee: 80.2 } },
  { name: 'SMT 二線', values: { avail: 78, perf: 91, quality: 98.4, oee: 69.9 } },
]
const radarCode = `<RadarChart
  :axes="[
    { key: 'quality', label: '品質分數', max: 100 },
    { key: 'ppm', label: '不良率', max: 1500, unit: 'ppm', lowerIsBetter: true },   // 越小越好：反轉方向
    …
  ]"
  :series="[{ name: '板廠 A', values: { quality: 92, ppm: 320, … } }, …]"
  title="供應商評分" auto-resize
/>

<!-- 同一單位的指標：max 讓所有軸刻度一致 -->
<RadarChart :axes="oeeAxes" :series="lines" :max="100" :levels="5" />`
const radarProps = [
  { name: 'axes', type: 'RadarAxis[]', def: '—', desc: '指標（每一軸）' },
  { name: 'series', type: 'RadarSeries[]', def: '—', desc: '比較的對象（每個一個多邊形）' },
  { name: 'width / height', type: 'number', def: '480 / 400', desc: '尺寸（autoResize 時跟著容器）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器大小（容器要有高度）／防抖毫秒' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'levels', type: 'number', def: '4', desc: '網格圈數' },
  { name: 'max', type: 'number | null', def: 'null', desc: '所有軸共用的最大值（軸自己的 max 優先）' },
  { name: 'fillOpacity', type: 'number', def: '0.18', desc: '填色透明度' },
  { name: 'showLegend', type: 'boolean', def: 'true', desc: '圖例（點選顯示 / 隱藏、滑過突顯）' },
  { name: 'valueFormat', type: '(v, axis) => string', def: '千分位', desc: 'tooltip 與資料表的數值格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const radarDataRows = [
  { name: 'RadarAxis', type: '{ key, label, min?, max?, unit?, lowerIsBetter? }', def: '—', desc: '沒給 max 時取所有系列的最大值再取整；lowerIsBetter 反轉方向' },
  { name: 'RadarSeries', type: '{ name, values: Record<key, number | null>, color? }', def: '—', desc: '沒有值的軸畫在中心、資料表顯示 —' },
]
const radarEvents = [
  { name: 'visibility-change', params: '(visible: string[])', desc: '點圖例後目前顯示的系列' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const calendarCode = `<CalendarHeatmap :data="rows" title="SMT 每日異常件數" unit="件" @cell-click="openDay" />
<!-- rows：[{ date: '2026-11-20', value: 12 }, ...]（同一天多筆會加總） -->

<!-- 門檻分級：< 95 紅、95–98 黃、>= 98 綠 -->
<CalendarHeatmap :data="yieldRows" unit="%" :thresholds="[95, 98]"
  :colors="['rgb(var(--t-danger-solid))', 'rgb(var(--t-warning-solid))', 'rgb(var(--t-success-solid))']" />`
const calendarProps = [
  { name: 'data', type: 'CalendarDatum[]', def: '—', desc: "{ date: 'YYYY-MM-DD' | Date, value: number | null }；同一天多筆加總" },
  { name: 'start / end', type: 'string | Date | null', def: '資料的最早 / 最晚', desc: '顯示範圍；都沒有資料時為今天往前 12 週' },
  { name: 'weekStart', type: '0 | 1', def: '1', desc: '一週從週一（1）或週日（0）開始' },
  { name: 'cellSize / cellGap', type: 'number', def: '14 / 3', desc: '格子大小與間距（px）；範圍很長時外層可水平捲動' },
  { name: 'levels', type: 'number', def: '5', desc: '自動分級的級數（最小～最大值等分）' },
  { name: 'thresholds', type: 'number[] | null', def: 'null', desc: '指定分級門檻（共 thresholds.length + 1 級）' },
  { name: 'colors', type: 'string[] | null', def: '主色由淺到深', desc: '各級顏色（由少到多）' },
  { name: 'domain', type: '[number, number] | null', def: '資料範圍', desc: '自動分級的範圍（固定刻度，跨期比較時用）' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題／單位（tooltip 與念出的數值後面）' },
  { name: 'valueFormat', type: '(v: number) => string', def: '千分位', desc: '數值格式' },
  { name: 'showLegend / showMonths / showWeekdays', type: 'boolean', def: 'true', desc: '圖例／月份／星期標籤' },
  { name: 'markToday', type: 'boolean', def: 'true', desc: '今天加外框' },
]
const calendarEvents = [{ name: 'cell-click', params: "({ date: 'YYYY-MM-DD', value: number | null })", desc: '點擊或按 Enter 某一天' }]
const calendarMethods = [{ name: 'focusDate(date)', type: "(date: 'YYYY-MM-DD') => boolean", desc: '把游標移到某一天並聚焦；不在範圍內時回傳 false' }]

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

// ChptKpiCard：前期數值、目標、門檻
const kpiCards = [
  {
    title: '良率',
    value: 98.6,
    previous: 98.2,
    deltaMode: 'absolute',
    deltaSuffix: ' pt',
    precision: 1,
    suffix: '%',
    target: 98.5,
    thresholds: [97.5, 98.5],
    trend: kpis[0].trend,
    trendFormat: kpis[0].format,
  },
  {
    title: '產量',
    value: 52840,
    previous: 51300,
    precision: 0,
    suffix: 'pcs',
    target: 55000,
    thresholds: [50000, 55000],
    trend: kpis[1].trend,
    trendType: 'bar',
    trendFormat: kpis[1].format,
  },
  {
    title: '不良率',
    value: 1.4,
    previous: 1.8,
    deltaMode: 'absolute',
    deltaSuffix: ' pt',
    precision: 1,
    suffix: '%',
    higherIsBetter: false,
    target: 1.5,
    trend: kpis[2].trend,
    trendType: 'area',
    trendFormat: kpis[2].format,
  },
  {
    title: '停機時數',
    value: 6.5,
    previous: 5.8,
    precision: 1,
    suffix: 'h',
    higherIsBetter: false,
    target: 5,
    thresholds: [6, 5],
    trend: kpis[3].trend,
    trendFormat: kpis[3].format,
  },
]
const lastClicked = ref('')

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

const cardCode = `<!-- thresholds = [接近, 達標]：≥ 98.5 達標、≥ 97.5 接近、其餘未達標 -->
<ChptKpiCard
  title="良率"
  :value="98.6"
  :previous="98.2"
  delta-mode="absolute"
  delta-suffix=" pt"
  :precision="1"
  suffix="%"
  :target="98.5"
  :thresholds="[97.5, 98.5]"
  :trend="weeklyYield"
  trend-label="近 12 週"
  comparison-label="較上週"
  clickable
  @click="openDetail('yield')"
/>

<!-- 越低越好：不良率 1.4%（目標 ≤ 1.5%）是達標、綠色 -->
<ChptKpiCard title="不良率" :value="1.4" :previous="1.8" :target="1.5" :higher-is-better="false" suffix="%" />`

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

const kpiCardProps = [
  { name: 'title', type: 'string', def: '—', desc: '標題（必填）' },
  { name: 'value / precision / groupSeparator / prefix / suffix', type: 'number | string | null / number / boolean / string', def: "null / — / true / ''", desc: '數值與格式（同 ChptStatistic）' },
  { name: 'higherIsBetter', type: 'boolean', def: 'true', desc: '數值越高越好；不良率、停機時間設 false（變化與狀態的好壞都跟著反過來）' },
  { name: 'previous / deltaMode', type: "number | null / 'percent' | 'absolute'", def: "null / 'percent'", desc: '前期數值；自動算出相對變化（%）或差值。前期為 0 時不顯示百分比' },
  { name: 'delta / deltaSuffix / deltaPrecision', type: 'number | null / string / number', def: "— / 依 deltaMode / 1", desc: '直接指定變化量（優先於 previous）與其單位、小數位數' },
  { name: 'comparisonLabel', type: 'string', def: "''", desc: '比較基準（例如「較上週」）；有變化量時才顯示' },
  { name: 'target / showTargetLine / targetFormat', type: 'number | null / boolean / (v) => string', def: 'null / true / —', desc: '目標：顯示「目標 …」、畫在趨勢線上，並用來判定狀態' },
  { name: 'thresholds', type: '[接近, 達標] | null', def: 'null', desc: '狀態門檻；不給時只看 target（達到為達標，否則未達標）' },
  { name: 'status', type: "'good' | 'warning' | 'critical' | null", def: '—', desc: '直接指定狀態（優先於 target / thresholds）；null 不顯示' },
  { name: 'trend / trendType', type: "(number | object)[] / 'line' | 'area' | 'bar'", def: "[] / 'line'", desc: '趨勢資料與圖形；物件陣列用 trendValueField / trendLabelField 取值' },
  { name: 'trendValueField / trendLabelField / trendLabel / trendFormat', type: 'string / string / string / (v) => string', def: "'value' / 'label' / '' / —", desc: '趨勢的欄位、讀螢幕說明（例如「近 12 週」）與提示框格式' },
  { name: 'size', type: "'sm' | 'md'", def: "'md'", desc: '尺寸' },
  { name: 'loading', type: 'boolean', def: 'false', desc: '載入中（數值顯示骨架、隱藏趨勢與狀態）' },
  { name: 'clickable', type: 'boolean', def: 'false', desc: '整張卡片可點（送出 click）；鍵盤可操作' },
  { name: '@click', type: '(event: MouseEvent)', def: '—', desc: 'clickable 時點了卡片' },
]
const kpiCardSlots = [
  { name: 'title', type: '—', desc: '自訂標題內容' },
  { name: 'actions', type: '—', desc: '右上角的小動作（可單獨點，不會觸發卡片的 click）' },
  { name: 'footer', type: '—', desc: '趨勢線與目標下方的補充內容' },
]
const kpiCardExpose = [
  { name: 'status', type: "Ref<'good' | 'warning' | 'critical' | null>", desc: '目前判定的狀態' },
  { name: 'delta', type: 'Ref<number | null>', desc: '實際顯示的變化量' },
]

const gaugeEvents = [{ name: 'chart-ready', type: '{ width, height }', desc: '掛載完成' }]

// ---- BulletChart ----
const pickedLine = ref('')
const lineOee = [
  { key: 'smt1', label: 'SMT-1', value: 91.2, target: 85, previous: 88.4, unit: '%' },
  { key: 'smt2', label: 'SMT-2', value: 83.5, target: 85, previous: 86.1, unit: '%' },
  { key: 'smt3', label: 'SMT-3', sublabel: '換線中', value: 52.8, target: 85, previous: 79.0, unit: '%' },
  { key: 'dip', label: 'DIP', value: 87.9, target: 85, previous: 84.2, unit: '%' },
  { key: 'assy', label: '組裝', value: 94.6, target: 90, previous: 93.8, unit: '%' },
]
const bulletCode = `<BulletChart :items="lines" :bands="bands" :max="100" title="各線 OEE（今日）" @item-click="open" />

const bands = [
  { to: 60, label: '未達標', status: 'critical' },
  { to: 85, label: '注意', status: 'warning' },
  { to: 100, label: '達標', status: 'good' },
]
const lines = [
  { label: 'SMT-1', value: 91.2, target: 85, previous: 88.4, unit: '%' },
  { label: 'SMT-3', sublabel: '換線中', value: 52.8, target: 85, unit: '%' },
]`
const bulletProps = [
  { name: 'items', type: 'BulletItem[]', def: '—', desc: '一列一個指標（見下表）' },
  { name: 'bands', type: 'GaugeBand[] | null', def: 'null', desc: '所有列共用的區間（各列的 bands 優先）；格式同 GaugeChart' },
  { name: 'max', type: 'number | null', def: 'null', desc: '所有列共用的上限（各列的 max 優先）；不給時依數值、目標與區間自動取整' },
  { name: 'width / autoResize', type: 'number / boolean', def: '480 / false', desc: '寬度；autoResize 時跟著容器' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'labelWidth / barHeight / rowGap', type: 'number', def: '112 / 22 / 12', desc: '左側名稱欄寬、長條高度、列距（px）' },
  { name: 'valueFormat', type: '(v: number) => string', def: '千分位', desc: '數值格式' },
]
const bulletItemRows = [
  { name: 'label / sublabel', type: 'string', def: '—', desc: '名稱；第二行小字' },
  { name: 'value', type: 'number | null', def: '—', desc: '實際值' },
  { name: 'target / previous', type: 'number | null', def: '—', desc: '目標（直線）；前期值（淡色細線）' },
  { name: 'min / max', type: 'number', def: '0 / 自動', desc: '軌道範圍' },
  { name: 'bands / unit / key', type: 'GaugeBand[] / string / string | number', def: '—', desc: '這一列的區間；單位；鍵' },
]
const bulletEvents = [{ name: 'item-click', params: '(item: BulletItem)', desc: '點擊一列（有綁才會變成按鈕）' }]

// ---- YieldFunnel ----
const pcbaSteps = [
  { label: '投入', count: 1200 },
  { label: 'SMT', count: 1184 },
  { label: 'AOI', count: 1151 },
  { label: 'ICT', count: 1142 },
  { label: 'FCT', count: 1097 },
  { label: '包裝', count: 1095 },
]
const funnelCode = `<YieldFunnel :steps="steps" unit="pcs" title="PCBA 工單 WO-2611-0042" @step-click="openDefects" />

// 依製程順序；第一站的 count 是投入數，之後是通過該站的數量
const steps = [
  { label: '投入', count: 1200 },
  { label: 'SMT', count: 1184 },
  { label: 'AOI', count: 1151 },
  { label: 'FCT', count: 1097 },
]`
const funnelProps = [
  { name: 'steps', type: 'FunnelStep[]', def: '—', desc: '{ label, count, key? }；依製程順序，第一站是投入數' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題；數量單位' },
  { name: 'align', type: "'left' | 'center'", def: "'left'", desc: '長條靠左（好比較長度）或置中（漏斗外觀）' },
  { name: 'highlightWorst', type: 'boolean', def: 'true', desc: '標出損失最多的站（同數量時取良率較低的）' },
  { name: 'color', type: 'string', def: '主色', desc: '長條顏色' },
  { name: 'width / autoResize', type: 'number / boolean', def: '520 / false', desc: '寬度；autoResize 時跟著容器' },
  { name: 'labelWidth / barHeight', type: 'number', def: '96 / 24', desc: '名稱欄寬、長條高度（px）' },
  { name: 'percentDigits', type: 'number', def: '1', desc: '百分比小數位數' },
  { name: 'valueFormat', type: '(v: number) => string', def: '千分位', desc: '數量格式' },
  { name: 'emptyText', type: 'string', def: '語系（繁中「沒有資料」）', desc: '沒有資料時的文字' },
]
const funnelEvents = [{ name: 'step-click', params: '(step: FunnelStep, row: FunnelRow)', desc: '點擊一站（有綁才會變成按鈕）；row 帶 stepYield、cumulative、loss' }]
// ---- OeeChart ----
const oeeSelected = ref('smt2')
const oeeItems = [
  { id: 'smt1', name: 'SMT-1', plannedTime: 480, losses: { breakdown: 12, setup: 35, minorStops: 18, reducedSpeed: 14, startupRejects: 2, productionRejects: 4 } },
  { id: 'smt2', name: 'SMT-2', plannedTime: 480, losses: { breakdown: 46, setup: 52, minorStops: 22, reducedSpeed: 25, startupRejects: 5, productionRejects: 9 } },
  { id: 'smt3', name: 'SMT-3', plannedTime: 480, losses: { breakdown: 5, setup: 20, minorStops: 8, reducedSpeed: 6, startupRejects: 0.5, productionRejects: 1 } },
  // 用生產數量換算：理想週期 24 秒、生產 1000 片、良品 985 片
  { id: 'smt4', name: 'SMT-4（數量換算）', ...oeeFromCounts({ plannedTime: 480, breakdown: 30, setup: 25, minorStops: 15, idealCycleTime: 24, totalCount: 1000, goodCount: 985, startupRejects: 5 }) },
]
const oeeCode = `<OeeChart v-model:selected="selected" :items="items" title="SMT 線 OEE" auto-resize />

const items = [
  { id: 'smt1', name: 'SMT-1', plannedTime: 480,   // 分鐘（已扣休息、計畫保養）
    losses: { breakdown: 12, setup: 35, minorStops: 18, reducedSpeed: 14, startupRejects: 2, productionRejects: 4 } },
  // 現場只有停機時間與數量：換算成六大損失
  { id: 'smt4', name: 'SMT-4', ...oeeFromCounts({
      plannedTime: 480, breakdown: 30, setup: 25, minorStops: 15,
      idealCycleTime: 24, totalCount: 1000, goodCount: 985, startupRejects: 5 }) },
]

// 只要數字：computeOee(item) → { oee, availability, performance, quality, losses, steps, biggestLoss }`
const oeeProps = [
  { name: 'items', type: 'OeeInput[]', def: '—', desc: '設備 / 產線 / 班別；多筆時下方並排比較' },
  { name: 'selected', type: 'string | null', def: '第一筆', desc: '顯示哪一筆（v-model:selected）' },
  { name: 'unit', type: 'string', def: '「分」', desc: '時間單位的顯示文字' },
  { name: 'benchmark', type: '{ oee?, availability?, performance?, quality? } | false', def: '世界級水準', desc: '目標值（0～1）；false 不比較' },
  { name: 'width / height', type: 'number', def: '760 / 300', desc: '寬度 / 瀑布圖高度' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器寬度調整' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'valueFormat', type: '(v: number) => string', def: 'null', desc: '時間的數字格式' },
  { name: 'emptyText', type: 'string', def: '「沒有資料」', desc: '沒有資料時的文字' },
]
const oeeDataRows = [
  { name: 'OeeInput', type: '{ id, name, plannedTime, losses }', def: '—', desc: 'losses：{ breakdown, setup, minorStops, reducedSpeed, startupRejects, productionRejects }（與 plannedTime 同單位）' },
  { name: 'oeeFromCounts(c)', type: '{ plannedTime, breakdown?, setup?, minorStops?, idealCycleTime, totalCount, goodCount, startupRejects? }', def: '—', desc: 'idealCycleTime 秒 / 件；回傳 { plannedTime, losses }（分鐘）' },
]
const oeeEvents = [
  { name: 'update:selected', params: '(id: string)', desc: '在比較清單點選設備' },
  { name: 'select', params: '(item: OeeInput)', desc: '同上，帶完整資料' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const oeeMethods = [
  { name: 'result()', type: '() => OeeResult | null', desc: '目前設備的計算結果' },
]
</script>
