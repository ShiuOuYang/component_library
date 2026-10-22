<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">StatusScatterMap 狀態散佈圖</h1>
        <p class="text-lg text-content-secondary">
          量測點／探針點的位置分佈，依 PASS／NEARFAIL／FAIL 著色。X、Y 等比例（實體座標不會被拉扁），
          不良點畫在最上層。請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library/charts</code> 匯入。
        </p>
      </div>

      <!-- 基本示範 -->
      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">基本示範</h2>
        <p class="text-sm text-content-secondary mb-4">
          點圖例可隱藏／顯示該狀態；滾輪以游標為中心縮放、拖曳平移、雙擊回到全覽。
          範圍用 <code>x-domain</code>／<code>y-domain</code> 指定板子尺寸，軸的兩端會標出端點值。
        </p>
        <div class="grid lg:grid-cols-2 gap-6 items-start">
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <div style="height: 520px">
              <StatusScatterMap
                :data="boardPoints"
                :x-domain="[-15718.5, 15643]"
                :y-domain="[-15718.5, 15643]"
                :auto-resize="true"
                @point-click="({ key }) => (selectedKey = key)"
              />
            </div>
            <p class="mt-2 text-xs text-content-tertiary" aria-live="polite">
              {{ selectedKey ? `已選取：${selectedKey}（highlightKey 會在圖上標出）` : '點任一個點選取' }}
            </p>
          </div>
          <ChptCodeBlock :code="basicCode" />
        </div>
        <div class="mt-4 bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <p class="text-sm text-content-secondary mb-2">連動高亮：上面點選的點（或在下方輸入點號）會在這張圖上標出。</p>
          <div class="mb-2 flex items-center gap-2 text-sm">
            <label for="ssm-key" class="text-content-secondary">點號</label>
            <input id="ssm-key" v-model="selectedKey" class="h-control-sm w-40 rounded-md border border-stroke-default bg-surface-primary px-2 text-content-primary" placeholder="例如 TP-0042" />
          </div>
          <StatusScatterMap
            :data="boardPoints"
            :x-domain="[-15718.5, 15643]"
            :y-domain="[-15718.5, 15643]"
            :width="560"
            :height="420"
            :highlight-key="selectedKey || null"
            :show-counts="true"
            title="同一批資料（顯示筆數）"
          />
        </div>
        <div class="mt-4 bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <p class="text-sm text-content-secondary mb-2">
            設定的範圍只是<strong>預設視窗</strong>：下圖聚焦在左上角，在圖上往外滾（或拖曳平移）就看得到範圍外的其他點，按「重設縮放」回到聚焦範圍。
          </p>
          <StatusScatterMap
            class="ssm-focus-demo"
            :data="boardPoints"
            :x-domain="[-13500, -8500]"
            :y-domain="[8000, 15000]"
            :width="560"
            :height="420"
            title="聚焦左上角（往外滾看全部）"
          />
        </div>
      </section>

      <!-- 大量資料 -->
      <section id="large" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">5 萬個點</h2>
        <p class="text-sm text-content-secondary mb-4">
          資料點畫在 Canvas 上，數萬點也能順暢縮放；滑鼠提示用座標命中測試，仍可指到每一筆。
          資料請用 <code>shallowRef</code> 或 <code>markRaw</code> 傳入。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light" style="height: 560px">
          <StatusScatterMap
            :data="waferPoints"
            :auto-resize="true"
            :show-counts="true"
            :point-radius="1.5"
            x-axis-label="X (µm)"
            y-axis-label="Y (µm)"
            :margin="{ top: 40, right: 32, bottom: 56, left: 80 }"
          />
        </div>
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable title="Props" :rows="propsRows" />
        <ApiTable title="Events" :rows="eventRows" />
        <ApiTable title="Slots" :rows="slotRows" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef } from 'vue'
import { StatusScatterMap } from '@/components/library/charts'
import { ChptCodeBlock } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

/** 可重現的亂數 */
function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** 九成九以上 PASS，少數 NEARFAIL / FAIL */
function pickStatus(rand) {
  const r = rand()
  return r < 0.012 ? 'FAIL' : r < 0.045 ? 'NEARFAIL' : 'PASS'
}

/** 板邊的探針點：左右兩排、上方一列、下方一列稀疏的點（仿實際量測圖） */
function makeBoardPoints() {
  const rand = seeded(7)
  const rows = []
  const push = (x, y) => rows.push({ id: `TP-${String(rows.length + 1).padStart(4, '0')}`, x: Math.round(x), y: Math.round(y), status: pickStatus(rand) })
  for (const side of [-1, 1]) {
    for (const [y0, y1] of [[-8200, -2600], [800, 6500], [8800, 13900]]) {
      for (let y = y0; y <= y1; y += 260) {
        const cols = 2 + Math.floor(rand() * 3)
        for (let c = 0; c < cols; c++) push(side * (10600 + c * 380 + rand() * 120), y + rand() * 80)
      }
    }
  }
  for (let x = -10000; x <= 9600; x += 420) {
    if (rand() < 0.25) continue
    push(x, 13000 + (rand() < 0.5 ? 0 : 800))
  }
  for (let x = -9800; x <= 11200; x += 1960) push(x, -11900)
  push(-12000, -12600)
  push(-12000, -13200)
  push(11900, -13400)
  push(0, -13900)
  return rows
}

/** 5 萬個點：晶圓狀的圓形分佈，邊緣不良率較高 */
function makeWaferPoints() {
  const rand = seeded(11)
  const rows = new Array(50000)
  for (let i = 0; i < rows.length; i++) {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * 100000
    const edge = r / 100000
    const p = rand()
    const status = p < 0.004 + edge ** 6 * 0.08 ? 'FAIL' : p < 0.02 + edge ** 4 * 0.1 ? 'NEARFAIL' : 'PASS'
    rows[i] = { id: `D${i}`, x: Math.cos(a) * r, y: Math.sin(a) * r, status }
  }
  return rows
}

const boardPoints = shallowRef(makeBoardPoints())
const waferPoints = shallowRef(makeWaferPoints())
const selectedKey = ref('')

const basicCode = `<StatusScatterMap
  :data="points"            // [{ id, x, y, status }]
  :x-domain="[-15718.5, 15643]"
  :y-domain="[-15718.5, 15643]"
  :highlight-key="selectedId"
  @point-click="({ key }) => (selectedId = key)"
/>

// 欄位名稱不同時用欄位映射，狀態與顏色可自訂（順序 = 繪製順序，後面的在上層）
<StatusScatterMap
  :data="rows"
  x-field="posX" y-field="posY" status-field="result" key-field="pinNo"
  :statuses="[
    { value: 'OK', label: '良品', color: '#0f9d75' },
    { value: 'WARN', label: '臨界', color: '#fbd45b' },
    { value: 'NG', label: '不良', color: '#ef4565' },
  ]"
/>`

const propsRows = [
  { name: 'data', type: 'object[]', def: '—', desc: '資料列；欄位由 xField / yField / statusField 指定' },
  { name: 'xField / yField / statusField', type: 'string', def: "'x' / 'y' / 'status'", desc: '欄位映射' },
  { name: 'keyField / keyFn', type: 'string / (datum, index) => string', def: "'id' / null", desc: '資料鍵（highlightKey 與事件的 key）；沒有該欄位時用索引' },
  { name: 'statuses', type: '{ value, label?, color }[]', def: 'PASS / NEARFAIL / FAIL', desc: '狀態與顏色；順序就是繪製順序，後面的畫在上層。不在清單裡的狀態歸為「其他」（otherColor）' },
  { name: 'hiddenStatuses', type: 'string[]', def: '[]', desc: '隱藏的狀態，可用 v-model:hidden-statuses；點圖例也會切換' },
  { name: 'xDomain / yDomain', type: '[min, max] | null', def: 'null', desc: '座標範圍（例如板子尺寸）；未指定時依資料並外推 domainPadding。這是預設視窗：資料超出時，往外縮或平移仍看得到範圍外的點，「重設縮放」回到這個範圍' },
  { name: 'equalAspect', type: 'boolean', def: 'true', desc: 'X、Y 每單位像素相同，繪圖區置中' },
  { name: 'showEndTicks / endTickFormat', type: 'boolean / (v) => string', def: "true / ',.1f'", desc: '在軸兩端標出範圍端點值（如 15,643.0）' },
  { name: 'tickFormat', type: '(v) => string', def: "d3.format(',')", desc: '一般刻度格式' },
  { name: 'pointRadius / pointOpacity', type: 'number', def: '3.5 / 1', desc: '點的大小與不透明度' },
  { name: 'showLegend / showCounts / showGrid', type: 'boolean', def: 'true / false / true', desc: '圖例、圖例筆數、格線' },
  { name: 'enableZoom', type: 'boolean', def: 'true', desc: '滾輪縮放、拖曳平移、雙擊重設；已在全覽時往外滾會交還給頁面捲動' },
  { name: 'wheelZoomModifier', type: "'none' | 'ctrl' | 'alt'", def: "'none'", desc: "按住哪個鍵才用滾輪縮放（'ctrl' 也接受 ⌘）" },
  { name: 'maxZoomScale', type: 'number', def: '50', desc: '最大放大倍率' },
  { name: 'highlightKey', type: 'string | number | null', def: 'null', desc: '在圖上標出這個鍵的點（例如表格選取的那一列）' },
  { name: 'customRenderers', type: '{ point?, tooltip? }', def: '{}', desc: 'point(ctx, x, y, r, color, datum) 自訂點形狀；tooltip(datum, info) 回傳每行文字' },
  { name: 'width / height / autoResize / margin / title', type: '…', def: '640 / 560 / false / … / ""', desc: '尺寸與標題；autoResize 時容器需有高度' },
]

const eventRows = [
  { name: 'point-hover / point-click', type: '{ datum, key, status, x, y }', desc: '滑過／點擊資料點' },
  { name: 'tooltip-show / tooltip-hide', type: '{ …, position } / —', desc: '提示框顯示與隱藏' },
  { name: 'zoom-change / zoom-reset', type: '{ xDomain, yDomain, scale } / —', desc: '縮放或平移後、回到全覽時' },
  { name: 'legend-toggle', type: '{ status, hidden }', desc: '點圖例切換狀態' },
  { name: 'update:hiddenStatuses', type: 'string[]', desc: 'v-model:hidden-statuses' },
  { name: 'chart-ready / chart-resize', type: '{ width, height }', desc: '掛載完成、autoResize 尺寸改變' },
]

const slotRows = [
  { name: 'tooltip', type: '{ tooltipData, tooltipVisible }', desc: '完全自訂提示框；tooltipData 含 datum、key、status、x、y、color、position' },
]
</script>
