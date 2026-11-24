<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">NetworkGraph 關係圖</h1>
        <p class="text-lg text-content-secondary">
          「誰跟誰有關係」：設備與子系統的相依、警報之間的關聯、物料共用、人員協作。節點大小是數值（或連線數）、線寬是權重、顏色是群組，同群組的節點會聚在一起。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="dependency" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">設備相依關係</h2>
        <p class="text-sm text-content-secondary mb-4">
          箭頭表示「依賴」（<code>directed</code>）：空壓機停了會影響哪些設備？滑過或點一個節點，高亮它與相鄰的節點；
          點選一個節點後 <strong>Shift + 點</strong>另一個，顯示兩者之間的最短路徑。拖曳節點會釘住（鄰居跟著調整，雙擊放開）；
          拖曳空白處平移、Ctrl + 滾輪縮放；點上方圖例隱藏某個群組。鍵盤：Tab 進入後方向鍵依連線數順序移動、Enter 選取、Escape 取消。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 460px">
            <NetworkGraph
              ref="depRef"
              v-model:selected="depSelected"
              :nodes="depNodes"
              :links="depLinks"
              title="SMT 二廠設備相依"
              directed
              :auto-resize="true"
              @path="(p) => (depLog = p ? `路徑 ${p.length - 1} 步` : '兩者之間沒有路徑')"
              @node-click="(n) => (depLog = `${n.label}：連線 ${n.degree} 條`)"
            />
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-content-secondary">
            <span aria-live="polite">{{ depLog || '（點選節點）' }}</span>
            <span>選取：<code>{{ depSelected ?? 'null' }}</code></span>
            <ChptButton size="xs" color="secondary" is-outline @click="depRef?.showPath('air', 'mes')">空壓機 → MES 的路徑</ChptButton>
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="depCode" />
      </section>

      <section id="large" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">警報關聯（大量節點）</h2>
        <p class="text-sm text-content-secondary mb-4">
          一個月內 10 分鐘內同時發生的警報碼連在一起，線寬是同時發生次數，節點大小是發生次數。
          節點超過 <code>canvas-threshold</code>（預設 400）時改用 Canvas 繪製，操作方式相同（鍵盤使用者改用隱藏的資料表）。
        </p>
        <div class="mb-3">
          <ChptSegmented v-model="alarmCount" :options="alarmOptions" aria-label="警報碼數量" size="xs" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 460px">
            <NetworkGraph :nodes="alarm.nodes" :links="alarm.links" title="警報同時發生" :auto-resize="true" :node-size="[2, 12]" :link-width="[0.5, 4]" :link-distance="24" />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="alarmCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="NetworkGraph" title="Props" :rows="props" />
        <ApiTable of="-" title="資料格式" :rows="dataRows" />
        <ApiTable of="NetworkGraph" title="Events" :rows="events" />
        <ApiTable of="NetworkGraph" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>版面用力導向模擬，初始位置固定（不用亂數），同樣的資料每次排出來都一樣；資料小改時保留原本的位置只微調。
          重複的連線會合併、權重相加（<code>directed</code> 時 A→B 與 B→A 分開算）；端點不存在或自己連自己的連線會略過並以 <code>dropped-links</code> 回報。
          超過 8 個群組時，第 9 個起用灰色 —— 建議把小群組併成「其他」。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ChptButton, ChptCodeBlock, ChptSegmented, NetworkGraph } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

// ---- 設備相依 ----
const depRef = ref(null)
const depSelected = ref(null)
const depLog = ref('')
const depNodes = [
  { id: 'power', label: '主電力 / UPS', group: '公用設施', value: 9 },
  { id: 'air', label: '空壓機', group: '公用設施', value: 7 },
  { id: 'n2', label: '氮氣產生機', group: '公用設施', value: 4 },
  { id: 'chiller', label: '冰水機', group: '公用設施', value: 3 },
  { id: 'printer', label: '錫膏印刷機', group: 'SMT', value: 4 },
  { id: 'spi', label: 'SPI', group: 'SMT', value: 3 },
  { id: 'pp1', label: '貼片機 1', group: 'SMT', value: 4 },
  { id: 'pp2', label: '貼片機 2', group: 'SMT', value: 4 },
  { id: 'reflow', label: '迴焊爐', group: 'SMT', value: 5 },
  { id: 'aoi', label: 'AOI', group: 'SMT', value: 3 },
  { id: 'ict', label: 'ICT', group: '測試', value: 3 },
  { id: 'fct', label: 'FCT', group: '測試', value: 3 },
  { id: 'burnin', label: '燒機房', group: '測試', value: 3 },
  { id: 'mes', label: 'MES', group: '資訊', value: 8 },
  { id: 'spc', label: 'SPC 伺服器', group: '資訊', value: 3 },
  { id: 'switch', label: '網路交換器', group: '資訊', value: 6 },
  { id: 'label', label: '標籤列印', group: '資訊', value: 2 },
  { id: 'tower', label: '智慧料塔', group: '倉儲', value: 3 },
  { id: 'agv', label: 'AGV', group: '倉儲', value: 3 },
]
// A → B：A 依賴 B
const depLinks = [
  ['printer', 'air'], ['pp1', 'air'], ['pp2', 'air'], ['reflow', 'n2'], ['reflow', 'chiller'], ['n2', 'air'],
  ['printer', 'power'], ['pp1', 'power'], ['pp2', 'power'], ['reflow', 'power'], ['air', 'power'], ['chiller', 'power'],
  ['spi', 'printer'], ['aoi', 'reflow'], ['ict', 'aoi'], ['fct', 'ict'], ['burnin', 'power'],
  ['spi', 'spc'], ['aoi', 'spc'], ['spc', 'switch'], ['mes', 'switch'], ['switch', 'power'],
  ['pp1', 'mes'], ['pp2', 'mes'], ['ict', 'mes'], ['fct', 'mes'], ['label', 'mes'],
  ['tower', 'mes'], ['agv', 'tower'], ['agv', 'switch'], ['pp1', 'tower', 3], ['pp2', 'tower', 3],
].map(([source, target, value]) => ({ source, target, value: value ?? 1 }))
const depCode = `<NetworkGraph
  v-model:selected="selected"
  :nodes="[{ id: 'air', label: '空壓機', group: '公用設施', value: 7 }, …]"
  :links="[{ source: 'pp1', target: 'air' }, { source: 'pp1', target: 'tower', value: 3 }, …]"
  title="SMT 二廠設備相依" directed auto-resize
  @path="(ids) => …" @node-click="(n) => …"
/>
// ref：fit()、zoomBy(1.3)、showPath('air', 'mes')、relayout()`

// ---- 警報關聯（決定性的假資料） ----
const alarmCount = ref(120)
const alarmOptions = [
  { label: '120 個警報碼（SVG）', value: 120 },
  { label: '600 個警報碼（Canvas）', value: 600 },
]
const areas = ['印刷', '貼片', '迴焊', 'AOI', '測試', '公用']
const alarm = computed(() => {
  let seed = 7
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  const n = alarmCount.value
  const nodes = Array.from({ length: n }, (_, i) => ({
    id: `A${i}`,
    label: `${areas[i % areas.length]}-${String(100 + i).padStart(4, '0')}`,
    group: areas[i % areas.length],
    value: Math.round(2 + 60 * rand() ** 3),
  }))
  const links = []
  for (let i = 1; i < n; i++) {
    // 偏好連到同區域、而且越早出現的警報越常被連到
    const sameArea = rand() < 0.75
    let j = Math.floor(rand() ** 2 * i)
    if (sameArea) j = j - (j % areas.length) + (i % areas.length)
    if (j >= i) j = i % areas.length === 0 ? 0 : (i % areas.length) - 1
    links.push({ source: `A${i}`, target: `A${Math.max(0, j)}`, value: Math.ceil(rand() * 12) })
    if (rand() < 0.25) links.push({ source: `A${i}`, target: `A${Math.floor(rand() * i)}`, value: Math.ceil(rand() * 4) })
  }
  return { nodes, links }
})
const alarmCode = `<NetworkGraph :nodes="alarms" :links="coOccurrence" :node-size="[2, 12]" :link-width="[0.5, 4]" :link-distance="24" auto-resize />
// 超過 canvas-threshold（400）個節點自動改用 Canvas`

const props = [
  { name: 'nodes', type: 'NetworkNodeInput[]', def: '—', desc: '{ id, label?, group?, value?, color? }' },
  { name: 'links', type: 'NetworkLinkInput[]', def: '—', desc: '{ source, target, value? }；重複的連線合併、權重相加' },
  { name: 'width / height', type: 'number', def: '720 / 440', desc: '尺寸（autoResize 時跟著容器）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器大小（容器要有高度）／防抖毫秒' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'directed', type: 'boolean', def: 'false', desc: '有方向：畫箭頭，A→B 與 B→A 分開' },
  { name: 'sizeBy', type: "'auto' | 'value' | 'degree' | 'none'", def: "'auto'", desc: '節點大小依據；auto = 有 value 用 value，否則用連線數' },
  { name: 'nodeSize / linkWidth', type: '[number, number]', def: '[4, 16] / [1, 6]', desc: '節點半徑／線寬範圍（px）' },
  { name: 'labels', type: "'auto' | 'always' | 'never'", def: "'auto'", desc: '名稱：auto = 大節點、放大或高亮時顯示' },
  { name: 'groupColors', type: 'Record<string, string>', def: '{}', desc: '指定群組顏色（沒給的依序用類別色）' },
  { name: 'groupPull', type: 'number', def: '0.08', desc: '同群組聚集的力道（0 不聚集）' },
  { name: 'linkDistance', type: 'number', def: '50', desc: '連線基本長度（權重越大越短）' },
  { name: 'iterations', type: 'number', def: '300', desc: '版面計算次數' },
  { name: 'canvasThreshold', type: 'number', def: '400', desc: '節點數超過時改用 Canvas' },
  { name: 'selected', type: 'string | null', def: 'null', desc: '選取的節點（v-model:selected）' },
  { name: 'wheelZoomModifier', type: "'none' | 'ctrl' | 'alt'", def: "'ctrl'", desc: '滾輪縮放要按住的鍵（避免捲動頁面時誤縮放）' },
  { name: 'valueFormat', type: '(v: number) => string', def: '千分位', desc: '數值格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有節點時的文字' },
]
const dataRows = [
  { name: 'NetworkNodeInput', type: '{ id, label?, group?, value?, color? }', def: '—', desc: '沒有 color 時用群組顏色' },
  { name: 'NetworkLinkInput', type: '{ source, target, value? }', def: '—', desc: 'value 預設 1；越大線越粗、拉得越近' },
]
const events = [
  { name: 'node-click', params: '({ id, label, group, value, degree })', desc: '點擊或 Enter 一個節點' },
  { name: 'update:selected', params: '(id: string | null)', desc: '選取改變（再點一次或 Escape 取消）' },
  { name: 'path', params: '(ids: string[] | null)', desc: 'Shift + 點選找到的最短路徑；不連通為 null' },
  { name: 'dropped-links', params: '(links: NetworkLinkInput[])', desc: '端點不存在或自己連自己而略過的連線' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [
  { name: 'fit()', type: '() => void', desc: '縮放到看得到全部節點' },
  { name: 'zoomBy(factor)', type: '(factor: number) => void', desc: '放大（> 1）或縮小（< 1）' },
  { name: 'showPath(from, to)', type: '(from: string, to: string) => string[] | null', desc: '高亮兩個節點間的最短路徑' },
  { name: 'relayout()', type: '() => void', desc: '重新排版（清掉釘住的位置）' },
  { name: 'graph()', type: '() => NetworkGraphData', desc: '目前的節點與連線（含位置、度數、鄰居）' },
]
</script>
