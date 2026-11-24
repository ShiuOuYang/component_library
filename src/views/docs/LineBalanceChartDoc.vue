<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2 break-words">LineBalanceChart 線平衡圖</h1>
        <p class="text-lg text-content-secondary">
          又叫山積圖（Yamazumi）：每站一根長條，由下往上疊這站的作業元素，依分類（加工、搬運、檢查、等待）上色；紅色虛線是節拍時間（takt）。
          超過節拍的站就是會拖慢產線的站，一眼看出瓶頸與哪裡有空閒。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">找瓶頸</h2>
        <p class="text-sm text-content-secondary mb-4">
          組裝線 6 站、節拍 45 秒（每天 7.5 小時要做 600 台）。上方摘要：瓶頸站與週期、平衡率（總工時 ÷ 人數 × 瓶頸週期）、總工時、
          依節拍算的理論最少人數。「測試」站 2 人，週期是工時除以 2。<code>show-average</code> 畫出平均週期。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 380px">
            <LineBalanceChart
              :stations="stations"
              :elements="baseElements"
              :takt="45"
              :kinds="kinds"
              show-average
              title="組裝二線"
              :auto-resize="true"
              @element-click="(el, st) => (clicked = `${st.name}：${el.name}（${el.time} s）`)"
            />
          </div>
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ clicked || '（點作業元素時顯示）' }}</p>
        </div>
        <ChptCodeBlock class="mt-4" :code="basicCode" />
      </section>

      <section id="rebalance" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">拖曳重新平衡</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>draggable</code> 後可以把作業元素拖到別站，長條即時重新堆疊，放開後送出 <code>v-model:elements</code> 與 <code>move</code>。
          試著把「鎖螺絲」的部分動作移到空閒的站，讓所有站都在節拍內。鍵盤：Tab 到作業元素，Enter 拿起、← → 換站、Enter 放下。
        </p>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <ChptButton size="xs" is-outline icon="restart_alt" @click="reset()">還原</ChptButton>
          <span class="text-xs text-content-secondary">{{ moveLog || '尚未移動' }}</span>
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 380px">
            <LineBalanceChart
              v-model:elements="elements"
              :stations="stations"
              :takt="45"
              :kinds="kinds"
              draggable
              :auto-resize="true"
              @move="(m) => (moveLog = `${m.element.name}：${name(m.from)} → ${name(m.to)}`)"
            />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="dragCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="LineBalanceChart" title="Props" :rows="props" />
        <ApiTable of="-" title="LbStation / LbElement / LineBalanceKind" :rows="dataRows" />
        <ApiTable of="LineBalanceChart" title="Events" :rows="events" />
        <ApiTable of="LineBalanceChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>計算：</strong>週期 = 工時 ÷ 人數；平衡率 = 總工時 ÷（總人數 × 瓶頸週期）；理論最少人數 = ⌈總工時 ÷ 節拍⌉。
          同樣的計算也匯出成 <code>lineBalanceLoads</code>、<code>lineBalanceSummary</code>、<code>moveLineBalanceElement</code>，可以在報表或排程裡用。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptButton, ChptCodeBlock, LineBalanceChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const kinds = [
  { key: 'work', label: '加工（增值）' },
  { key: 'move', label: '搬運 / 走動' },
  { key: 'check', label: '檢查' },
  { key: 'wait', label: '等待' },
]
const stations = [
  { id: 's1', name: '投板' },
  { id: 's2', name: '鎖螺絲' },
  { id: 's3', name: '插線' },
  { id: 's4', name: '測試', operators: 2 },
  { id: 's5', name: '外觀檢查' },
  { id: 's6', name: '包裝' },
]
const name = (id) => stations.find((s) => s.id === id)?.name ?? id
const baseElements = [
  { id: 'e1', station: 's1', name: '取板', time: 8, kind: 'move' },
  { id: 'e2', station: 's1', name: '放治具', time: 12, kind: 'work' },
  { id: 'e3', station: 's1', name: '掃序號', time: 5, kind: 'check' },
  { id: 'e4', station: 's2', name: '鎖外殼 4 顆', time: 24, kind: 'work' },
  { id: 'e5', station: 's2', name: '鎖散熱片 2 顆', time: 14, kind: 'work' },
  { id: 'e6', station: 's2', name: '換起子頭', time: 6, kind: 'wait' },
  { id: 'e7', station: 's2', name: '扭力確認', time: 9, kind: 'check' },
  { id: 'e8', station: 's3', name: '插排線', time: 15, kind: 'work' },
  { id: 'e9', station: 's3', name: '理線', time: 10, kind: 'work' },
  { id: 'e10', station: 's3', name: '送測試站', time: 4, kind: 'move' },
  { id: 'e11', station: 's4', name: '上測試架', time: 12, kind: 'move' },
  { id: 'e12', station: 's4', name: '功能測試', time: 60, kind: 'check' },
  { id: 'e13', station: 's4', name: '等待結果', time: 18, kind: 'wait' },
  { id: 'e14', station: 's5', name: '外觀檢查', time: 22, kind: 'check' },
  { id: 'e15', station: 's5', name: '貼標籤', time: 6, kind: 'work' },
  { id: 'e16', station: 's6', name: '裝袋', time: 14, kind: 'work' },
  { id: 'e17', station: 's6', name: '裝箱', time: 12, kind: 'work' },
  { id: 'e18', station: 's6', name: '搬到棧板', time: 9, kind: 'move' },
]
const clicked = ref('')
const elements = ref(baseElements.map((e) => ({ ...e })))
const moveLog = ref('')
function reset() {
  elements.value = baseElements.map((e) => ({ ...e }))
  moveLog.value = ''
}

const basicCode = `<LineBalanceChart
  :stations="[{ id: 's1', name: '投板' }, { id: 's2', name: '鎖螺絲' }, { id: 's4', name: '測試', operators: 2 }, …]"
  :elements="[{ id: 'e1', station: 's1', name: '取板', time: 8, kind: 'move' }, …]"
  :takt="45"
  :kinds="[{ key: 'work', label: '加工（增值）' }, { key: 'move', label: '搬運 / 走動' }, …]"
  show-average
/>`
const dragCode = `<LineBalanceChart
  v-model:elements="elements"
  :stations="stations"
  :takt="45"
  draggable
  @move="({ element, from, to }) => log(element, from, to)"
/>`

const props = [
  { name: 'stations', type: 'LbStation[]', def: '—', desc: '工站（依順序）；operators 多人時週期 = 工時 ÷ 人數' },
  { name: 'v-model:elements', type: 'LbElement[]', def: '—', desc: '作業元素；同一站依陣列順序由下往上疊' },
  { name: 'takt', type: 'number | null', def: 'null', desc: '節拍時間；超過的站標紅' },
  { name: 'kinds', type: 'LineBalanceKind[]', def: '[]', desc: '作業分類（顏色與圖例）；不給時全部同色' },
  { name: 'unit', type: 'string', def: "'s'", desc: '時間單位' },
  { name: 'draggable', type: 'boolean', def: 'false', desc: '可以把作業元素拖到別站' },
  { name: 'showAverage', type: 'boolean', def: 'false', desc: '畫平均週期線（依人數加權）' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'width / height', type: 'number', def: '720 / 360', desc: '尺寸（autoResize 時跟著容器）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器大小' },
  { name: 'valueFormat', type: '(v) => string', def: 'null', desc: '數值格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有工站時的文字' },
]
const dataRows = [
  { name: 'LbStation', type: '{ id, name, operators? }', def: '—', desc: 'operators 預設 1' },
  { name: 'LbElement', type: '{ id, name, station, time, kind? }', def: '—', desc: 'station 是工站 id；kind 對應 kinds 的 key' },
  { name: 'LineBalanceKind', type: '{ key, label, color? }', def: '—', desc: '沒給顏色時依序取類別色' },
]
const events = [
  { name: 'update:elements', params: '(elements)', desc: '拖曳換站後的作業元素' },
  { name: 'move', params: '({ element, from, to, elements })', desc: '作業元素換站' },
  { name: 'element-click', params: '(element, station)', desc: '點作業元素（draggable 時拖曳不算點擊）' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [
  { name: 'summary', type: 'LbSummary', desc: '瓶頸、平衡率、總工時、理論最少人數、超過節拍的站' },
  { name: 'loads', type: 'LbStationLoad[]', desc: '各站的作業元素、工時、人數、週期' },
]
</script>
