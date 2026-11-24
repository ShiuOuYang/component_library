<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2 break-words">SunburstChart 旭日圖</h1>
        <p class="text-lg text-content-secondary">
          一次看好幾層的佔比：不良類別 → 原因 → 站別、成本 → 科目 → 細項。中央是目前這一層，往外一圈一層，角度是數量。
          資料格式與 TreemapChart 相同，兩者可以切換 —— 矩形樹圖比較好比大小，旭日圖比較好看階層。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="defects" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">不良原因</h2>
        <p class="text-sm text-content-secondary mb-4">
          11 月的不良數：類別 → 原因 → 站別，三圈。滑過一塊會標出它的路徑，提示顯示佔全部與佔上一層的比例。
          點有子項的弧往下鑽，點中央或上方的路徑回上層；目前位置用 <code>v-model:path</code> 綁定，最外圈的弧送出 <code>node-click</code>。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="levels" :options="levelOptions" aria-label="一次顯示幾圈" size="xs" />
          <span class="text-xs text-content-secondary">path：<code>{{ JSON.stringify(path) }}</code></span>
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 460px">
            <SunburstChart
              v-model:path="path"
              :data="defects"
              title="11 月不良數"
              unit="片"
              :levels="levels"
              :auto-resize="true"
              @node-click="(n, p) => (clicked = `${p.join(' / ')}：${n.value} 片`)"
            />
          </div>
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ clicked || '（點到最外圈時顯示）' }}</p>
        </div>
        <ChptCodeBlock class="mt-4" :code="defectCode" />
      </section>

      <section id="cost" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">成本結構</h2>
        <p class="text-sm text-content-secondary mb-4">
          每台成本（元）。第一圈可以用 <code>color</code> 指定顏色（例如材料一律用藍色系），外圈沿用並越來越淡。
          <code>value-format</code> 自訂數字格式。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 380px">
            <SunburstChart :data="cost" title="每台成本" :value-format="(v) => `$${v.toLocaleString()}`" :levels="2" :auto-resize="true" />
          </div>
        </div>
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="SunburstChart" title="Props" :rows="props" />
        <ApiTable of="-" title="資料（TreemapNode）" :rows="dataRows" />
        <ApiTable of="SunburstChart" title="Events" :rows="events" />
        <ApiTable of="SunburstChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>角度不容易精確比較，要比大小請用長條圖或矩形樹圖。同一層超過 12 項時弧會很細，建議把尾巴併成「其他」。
          放不下的弧不放文字（滑過看提示）。鍵盤：Tab 進入後 ← → 在同一圈移動、↑ 往外、↓ 往內、Enter 往下、Esc / Backspace 回上層；
          圖表附有隱藏的資料表（目前這一層的名稱、數量、佔比）。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, ChptSegmented, SunburstChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const leaf = (name, value) => ({ name, value })
const defects = {
  name: '全部',
  children: [
    {
      name: '焊接',
      children: [
        { name: '空焊', children: [leaf('回焊', 220), leaf('波焊', 90), leaf('手焊', 35)] },
        { name: '短路', children: [leaf('印刷', 140), leaf('回焊', 60)] },
        { name: '錫珠', children: [leaf('印刷', 70), leaf('回焊', 30)] },
      ],
    },
    {
      name: '零件',
      children: [
        { name: '偏移', children: [leaf('貼片', 160), leaf('回焊', 25)] },
        { name: '缺件', children: [leaf('貼片', 95), leaf('手插', 40)] },
        { name: '極性反', children: [leaf('手插', 45), leaf('貼片', 15)] },
      ],
    },
    {
      name: '外觀',
      children: [
        { name: '刮傷', children: [leaf('組裝', 80), leaf('包裝', 20)] },
        { name: '髒污', children: [leaf('組裝', 40)] },
      ],
    },
    { name: '功能', children: [{ name: '測試失敗', children: [leaf('ICT', 55), leaf('FCT', 75)] }] },
  ],
}
const levels = ref(3)
const levelOptions = [
  { label: '兩圈', value: 2 },
  { label: '三圈', value: 3 },
]
const path = ref([])
const clicked = ref('')
const defectCode = `<SunburstChart
  v-model:path="path"
  :data="{ name: '全部', children: [
    { name: '焊接', children: [{ name: '空焊', children: [{ name: '回焊', value: 220 }, …] }, …] },
    …
  ] }"
  unit="片"
  :levels="3"
  @node-click="(node, path) => openDefect(path)"
/>`

const cost = {
  name: '每台成本',
  children: [
    { name: '材料', color: 'rgb(var(--t-chart-1))', children: [leaf('PCB', 180), leaf('IC', 420), leaf('被動元件', 95), leaf('外殼', 130)] },
    { name: '人工', color: 'rgb(var(--t-chart-2))', children: [leaf('SMT', 60), leaf('組裝', 110), leaf('測試', 45)] },
    { name: '製造費用', color: 'rgb(var(--t-chart-3))', children: [leaf('折舊', 70), leaf('水電', 30), leaf('耗材', 25)] },
    { name: '運費', color: 'rgb(var(--t-chart-4))', value: 40 },
  ],
}

const props = [
  { name: 'data', type: 'TreemapNode', def: '—', desc: '根節點；葉節點給 value，群組自動加總（與 TreemapChart 相同）' },
  { name: 'levels', type: 'number', def: '3', desc: '從中央往外畫幾圈' },
  { name: 'v-model:path', type: 'string[]', def: '[]', desc: '目前在中央的節點（每層的 id 或 name）' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題與單位' },
  { name: 'valueFormat', type: '(v) => string', def: 'null', desc: '數量格式' },
  { name: 'width / height', type: 'number', def: '480 / 420', desc: '尺寸（autoResize 時跟著容器）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器大小' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const dataRows = [
  { name: 'id / name', type: 'string', def: '—', desc: 'id 不給時用 name（同一層要不重複）' },
  { name: 'value', type: 'number', def: '—', desc: '葉節點的數量' },
  { name: 'color', type: 'string', def: '—', desc: '指定顏色；第一圈指定時外圈沿用' },
  { name: 'children', type: 'TreemapNode[]', def: '—', desc: '子節點' },
]
const events = [
  { name: 'update:path', params: '(path: string[])', desc: '往下鑽或回上層' },
  { name: 'node-click', params: '(node, path)', desc: '點沒有子節點的弧（或 Enter）' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [
  { name: 'up()', type: '() => void', desc: '回上一層' },
  { name: 'reset()', type: '() => void', desc: '回到最上層' },
  { name: 'drillTo(path)', type: '(path: string[]) => void', desc: '前往某個節點' },
]
</script>
