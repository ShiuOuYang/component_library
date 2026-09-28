<template>
  <div class="w-full px-6 py-8 lg:px-10">
    <!-- 頁首 -->
    <div class="mb-8">
      <div class="flex items-center space-x-4">
        <div class="w-14 h-14 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🎯</span>
        </div>
        <div>
          <h1 class="text-3xl font-bold text-content-primary">進階選擇元件</h1>
          <p class="text-content-secondary mt-1">自動完成、級聯、穿梭框、顏色、評分與月曆 —— 都能放進 ChptFormItem 自動接上標籤與驗證。</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mt-5">
        <span class="px-3 py-1 bg-success-subtle text-success-on-subtle rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-accent-subtle text-accent-on-subtle rounded-full text-sm font-medium">WAI-ARIA</span>
        <span class="px-3 py-1 bg-surface-tertiary text-content-secondary rounded-full text-sm font-medium">淺色 / 深色主題</span>
      </div>
    </div>

    <div class="space-y-10">
      <!-- ============ ChptAutocomplete ============ -->
      <section id="chpt-autocomplete" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
        <h2 class="text-2xl font-bold text-content-primary mb-1">ChptAutocomplete 自動完成</h2>
        <p class="text-content-secondary text-sm mb-4">
          <strong>使用時機：</strong>可以自由輸入、但希望邊打邊給建議的文字欄位（料號、客戶、最近搜尋）。
          值就是文字本身，選建議只是幫忙填字。只能從清單裡選時用 ChptSelect。
        </p>
        <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4 pb-24">
          <div class="grid md:grid-cols-2 gap-4">
            <ChptAutocomplete v-model="state.station" label="站點（固定清單）" :options="stations" placeholder="輸入 SMT、AOI…" clearable full-width />
            <ChptAutocomplete
              v-model="state.part"
              label="料號（非同步查詢）"
              :fetch-suggestions="searchParts"
              placeholder="輸入 PN 開頭…"
              prefix-icon="search"
              full-width
            />
          </div>
          <p class="text-sm text-content-secondary mt-3">目前值：<span class="font-mono">{{ state.station || '(空)' }} / {{ state.part || '(空)' }}</span></p>
        </div>
        <ChptCodeBlock :code="autocompleteSample" />
        <ApiTable title="Props" :rows="autocompleteProps" />
        <ApiTable title="Events" :rows="autocompleteEvents" />
        <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>WAI-ARIA combobox：焦點一直留在輸入框，↑↓ 以 aria-activedescendant 移動、Enter 選取、
          Escape 關閉（清單已關且 clearable 時清空）、Alt+↓ 只打開不移動。fetchSuggestions 會 debounce，且只採用最後一次查詢的結果。</p>
      </section>

      <!-- ============ ChptCascader ============ -->
      <section id="chpt-cascader" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
        <h2 class="text-2xl font-bold text-content-primary mb-1">ChptCascader 級聯選擇</h2>
        <p class="text-content-secondary text-sm mb-4">
          <strong>使用時機：</strong>有層級的選項，一欄一欄往右選（廠區 → 產線 → 機台）。v-model 是整條路徑的值陣列。
          層級很深或需要同時勾多個時改用 ChptTree。
        </p>
        <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4 pb-72">
          <div class="flex flex-wrap items-start gap-4">
            <ChptCascader v-model="state.line" label="機台" :options="factoryTree" clearable />
            <ChptCascader v-model="state.area" label="區域（中間層可選、滑過展開）" :options="factoryTree" change-on-select expand-trigger="hover" />
            <ChptCascader v-model="state.lazy" label="延遲載入" :options="lazyRoots" :load="loadChildren" />
          </div>
          <p class="text-sm text-content-secondary mt-3">目前值：<span class="font-mono">{{ JSON.stringify(state.line) }} / {{ JSON.stringify(state.area) }} / {{ JSON.stringify(state.lazy) }}</span></p>
        </div>
        <ChptCodeBlock :code="cascaderSample" />
        <ApiTable title="Props" :rows="cascaderProps" />
        <ApiTable title="Events" :rows="cascaderEvents" />
        <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>每一欄是一個 listbox（第 2 欄起以上一層命名）。↑↓ 在同一欄移動、→ 或 Enter 進入下一層、← 回上一層、
          Escape 關閉並把焦點還給觸發鈕。使用 load 時，沒有 children 且沒標 <code>leaf: true</code> 的節點都視為還有下一層。</p>
      </section>

      <!-- ============ ChptTransfer ============ -->
      <section id="chpt-transfer" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
        <h2 class="text-2xl font-bold text-content-primary mb-1">ChptTransfer 穿梭框</h2>
        <p class="text-content-secondary text-sm mb-4">
          <strong>使用時機：</strong>從一份清單挑一批出來（通知對象、報表欄位、權限）。v-model 是右邊（已選）的 key 陣列。
          選項少於十個時直接用 checkbox 群組更簡單。
        </p>
        <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4">
          <ChptTransfer v-model="state.members" :data="people" :titles="['全部人員', '通知對象']" filterable aria-label="通知對象" />
          <p class="text-sm text-content-secondary mt-3">已選：<span class="font-mono">{{ state.members.join(', ') || '(無)' }}</span></p>
        </div>
        <ChptCodeBlock :code="transferSample" />
        <ApiTable title="Props" :rows="transferProps" />
        <ApiTable title="Events" :rows="transferEvents" />
        <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>刻意用原生 checkbox 與按鈕組成，鍵盤與螢幕閱讀器不需要學新的操作方式；
          全選只作用在「搜尋結果中未停用」的項目，移動後以 live region 報讀移了幾項。窄螢幕時左右清單改為上下排列。</p>
      </section>

      <!-- ============ ChptColorPicker ============ -->
      <section id="chpt-colorpicker" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
        <h2 class="text-2xl font-bold text-content-primary mb-1">ChptColorPicker 顏色選擇</h2>
        <p class="text-content-secondary text-sm mb-4">
          <strong>使用時機：</strong>讓使用者設定標記色、圖表系列色。v-model 是小寫六碼 #rrggbb 或 null。
        </p>
        <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4 pb-80">
          <div class="flex flex-wrap items-start gap-6">
            <ChptColorPicker v-model="state.color" label="標記色" />
            <ChptColorPicker v-model="state.seriesColor" label="系列色（只顯示色塊）" :show-text="false" :presets="['#2563eb', '#16a34a', '#dc2626', '#ca8a04']" />
          </div>
          <p class="text-sm text-content-secondary mt-3">目前值：<span class="font-mono">{{ state.color ?? 'null' }} / {{ state.seriesColor ?? 'null' }}</span></p>
        </div>
        <ChptCodeBlock :code="colorSample" />
        <ApiTable title="Props" :rows="colorProps" />
        <ApiTable title="Events" :rows="colorEvents" />
        <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>取色交給原生 <code>&lt;input type="color"&gt;</code>（含滴管、鍵盤可操作）；
          色碼欄接受 #abc／abc／#AABBCC 並正規化。預設色按鈕以色碼命名並帶 aria-pressed。</p>
      </section>

      <!-- ============ ChptRate ============ -->
      <section id="chpt-rate" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
        <h2 class="text-2xl font-bold text-content-primary mb-1">ChptRate 評分</h2>
        <p class="text-content-secondary text-sm mb-4">
          <strong>使用時機：</strong>滿意度、嚴重度這類 1~N 的等級。v-model 是整數，0 表示未評分。
        </p>
        <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4 space-y-3">
          <div class="flex flex-wrap items-center gap-6">
            <ChptRate v-model="state.score" aria-label="滿意度" :texts="rateTexts" show-text />
            <ChptRate v-model="state.severity" aria-label="嚴重度" icon="local_fire_department" color="danger" :count="3" size="lg" />
          </div>
          <div class="flex items-center gap-2 text-sm text-content-secondary">
            唯讀：<ChptRate :model-value="4" readonly aria-label="平均評分" size="sm" />
          </div>
        </div>
        <ChptCodeBlock :code="rateSample" />
        <ApiTable title="Props" :rows="rateProps" />
        <ApiTable title="Events" :rows="rateEvents" />
        <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>WAI-ARIA radiogroup：整組一個 Tab 停駐點，方向鍵直接改分數、Home／End、Delete 清除。
          分數靠實心／空心形狀區分，不只靠顏色。唯讀時改為 role="img" 一次唸出「評分 4 / 5」。</p>
      </section>

      <!-- ============ ChptCalendar ============ -->
      <section id="chpt-calendar" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
        <h2 class="text-2xl font-bold text-content-primary mb-1">ChptCalendar 月曆</h2>
        <p class="text-content-secondary text-sm mb-4">
          <strong>使用時機：</strong>以月為單位檢視排程、值班、每日產量（#date-cell 插槽放內容）；compact 模式當作常駐的小月曆。
          只是要填一個日期欄位時用 ChptDatePicker。
        </p>
        <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4">
          <div class="flex flex-col items-start gap-4 2xl:flex-row">
            <ChptCalendar v-model="state.day" :first-day-of-week="1" class="min-w-0 flex-1">
              <template #date-cell="{ dateString }">
                <ul v-if="events[dateString]" class="space-y-0.5">
                  <li
                    v-for="e in events[dateString]"
                    :key="e.text"
                    class="truncate rounded px-1"
                    :class="e.tone === 'danger' ? 'bg-danger-subtle text-danger-on-subtle' : 'bg-accent-subtle text-accent-on-subtle'"
                  >{{ e.text }}</li>
                </ul>
              </template>
            </ChptCalendar>
            <ChptCalendar v-model="state.day" compact :disabled-date="isWeekend" />
          </div>
          <p class="text-sm text-content-secondary mt-3">選取：<span class="font-mono">{{ state.day || '(未選擇)' }}</span>（小月曆停用週末）</p>
        </div>
        <ChptCodeBlock :code="calendarSample" />
        <ApiTable title="Props" :rows="calendarProps" />
        <ApiTable title="Events" :rows="calendarEvents" />
        <ApiTable title="Slots" :rows="calendarSlots" />
        <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>WAI-ARIA grid：整個月曆一個 Tab 停駐點，←→ 一天、↑↓ 一週、Home／End 本週頭尾、
          PageUp／PageDown 換月（加 Shift 換年）。日期一律以本地時區計算，'2026-03-01' 不會因為 UTC 解析而變成 2 月 28 日。</p>
      </section>

      <!-- 引入方式 -->
      <section class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light">
        <h2 class="text-2xl font-bold text-content-primary mb-2">引入方式</h2>
        <ChptCodeBlock :code="importSample" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import {
  ChptAutocomplete,
  ChptCascader,
  ChptTransfer,
  ChptColorPicker,
  ChptRate,
  ChptCalendar,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

const state = reactive({
  station: '',
  part: '',
  line: ['fab-a', 'smt', 'smt-1'],
  area: null,
  lazy: null,
  members: ['u2', 'u5'],
  color: '#3b82f6',
  seriesColor: null,
  score: 3,
  severity: 1,
  day: null,
})

// ---- Autocomplete ----
const stations = ['SMT', 'AOI', 'DIP', 'ICT', 'FCT', 'Packing', { value: 'Rework', description: '重工站' }]
const parts = Array.from({ length: 60 }, (_, i) => `PN-${String(1000 + i * 7)}`)
function searchParts(query) {
  // 模擬 API：300ms 後回傳
  return new Promise((resolve) =>
    setTimeout(() => resolve(parts.filter((p) => p.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)), 300)
  )
}
const autocompleteSample = `<ChptAutocomplete v-model="station" label="站點" :options="['SMT', 'AOI', 'DIP']" clearable />

<!-- 非同步：回傳陣列或 Promise；元件負責 debounce 與丟棄過期結果 -->
<ChptAutocomplete v-model="part" label="料號" :fetch-suggestions="q => api.searchParts(q)" />`
const autocompleteProps = [
  { name: 'modelValue', type: 'string', def: "''", desc: '輸入框文字（v-model）' },
  { name: 'options', type: 'AutocompleteSuggestion[]', def: '[]', desc: "字串或 { value, label?, description?, disabled? }" },
  { name: 'fetchSuggestions', type: '(query) => Suggestion[] | Promise', def: '—', desc: '自訂查詢；設定後不使用 options' },
  { name: 'filter', type: '(item, query) => boolean', def: '包含（不分大小寫）', desc: 'options 的過濾方式' },
  { name: 'debounce', type: 'number', def: '200', desc: 'fetchSuggestions 的延遲（ms）' },
  { name: 'openOnFocus / autoHighlight', type: 'boolean', def: 'true / false', desc: '聚焦就列出建議／第一筆自動成為目前項目' },
  { name: 'maxItems', type: 'number', def: '50', desc: '最多列幾筆' },
  { name: 'label / placeholder / prefixIcon / errorText', type: 'string', def: "''", desc: '標籤／佔位符／前綴圖示／錯誤訊息' },
  { name: 'size / clearable / disabled / fullWidth', type: '…', def: "'sm' / false…", desc: '尺寸與狀態' },
  { name: 'emptyText / loadingText', type: 'string', def: "'沒有符合的建議' / '載入中…'", desc: '提示文字' },
]
const autocompleteEvents = [
  { name: 'update:modelValue', params: '(value: string)', desc: '打字或選取建議' },
  { name: 'select', params: '(item)', desc: '選了某個建議（原始物件）' },
  { name: 'focus / blur', params: '(FocusEvent)', desc: '焦點進出' },
]

// ---- Cascader ----
const factoryTree = [
  {
    value: 'fab-a',
    label: 'FAB-A',
    children: [
      { value: 'smt', label: 'SMT', children: [{ value: 'smt-1', label: 'SMT-01' }, { value: 'smt-2', label: 'SMT-02' }, { value: 'smt-3', label: 'SMT-03（保養中）', disabled: true }] },
      { value: 'aoi', label: 'AOI', children: [{ value: 'aoi-1', label: 'AOI-01' }] },
    ],
  },
  {
    value: 'fab-b',
    label: 'FAB-B',
    children: [{ value: 'bond', label: 'Bonding', children: [{ value: 'bond-1', label: 'BD-01' }, { value: 'bond-2', label: 'BD-02' }] }],
  },
  { value: 'office', label: '辦公區' },
]
const lazyRoots = [
  { value: 'north', label: '北區' },
  { value: 'south', label: '南區' },
]
function loadChildren(node, path) {
  return new Promise((resolve) =>
    setTimeout(() => {
      if (path.length >= 2) return resolve([])
      resolve(
        [1, 2, 3].map((n) => ({ value: `${node.value}-${n}`, label: `${node.label} ${n} 號`, leaf: path.length === 1 }))
      )
    }, 400)
  )
}
const cascaderSample = `<ChptCascader v-model="path" label="機台" :options="factoryTree" clearable />
<!-- path = ['fab-a', 'smt', 'smt-1']，畫面顯示「FAB-A / SMT / SMT-01」 -->

<ChptCascader v-model="area" :options="factoryTree" change-on-select expand-trigger="hover" />

<!-- 延遲載入：回傳子節點；葉節點標 leaf: true -->
<ChptCascader v-model="v" :options="roots" :load="(node, path) => api.children(node.value)" />`
const cascaderProps = [
  { name: 'modelValue', type: '(string | number)[] | null', def: 'null', desc: '路徑值陣列（v-model）' },
  { name: 'options', type: 'CascaderOption[]', def: '[]', desc: '{ value, label, children?, disabled?, leaf? }' },
  { name: 'separator / showAllLevels', type: 'string / boolean', def: "' / ' / true", desc: '顯示的分隔與是否顯示整條路徑' },
  { name: 'changeOnSelect', type: 'boolean', def: 'false', desc: '中間層也可當成答案' },
  { name: 'expandTrigger', type: "'click' | 'hover'", def: "'click'", desc: '展開下一層的方式' },
  { name: 'load', type: '(node, path) => Promise<CascaderOption[]>', def: '—', desc: '延遲載入子層' },
  { name: 'label / placeholder / errorText / emptyText', type: 'string', def: "'' / '請選擇'…", desc: '文字' },
  { name: 'size / clearable / disabled / fullWidth', type: '…', def: "'sm' / false…", desc: '尺寸與狀態' },
]
const cascaderEvents = [
  { name: 'update:modelValue', params: '(path | null)', desc: '選取變更' },
  { name: 'change', params: '(path | null, nodes: CascaderOption[])', desc: '同上，帶路徑上的節點' },
]

// ---- Transfer ----
const people = [
  { key: 'u1', label: '王小明', description: 'SMT 製程' },
  { key: 'u2', label: '林美華', description: 'AOI 品保' },
  { key: 'u3', label: '陳建宏', description: '設備' },
  { key: 'u4', label: '張雅婷', description: '生管', disabled: true },
  { key: 'u5', label: '李志強', description: '廠長' },
  { key: 'u6', label: '黃怡君', description: 'IE' },
  { key: 'u7', label: '吳宗翰', description: '採購' },
]
const transferSample = `<ChptTransfer
  v-model="members"
  :data="people"
  :titles="['全部人員', '通知對象']"
  filterable
  @change="(keys, direction, moved) => log(direction, moved)"
/>`
const transferProps = [
  { name: 'modelValue', type: '(string | number)[]', def: '[]', desc: '右邊（已選）的 key（v-model）' },
  { name: 'data', type: 'TransferItem[]', def: '[]', desc: '{ key, label, description?, disabled? }' },
  { name: 'titles / buttonTexts', type: '[string, string]', def: "['可選項目','已選項目'] / ['加入','移除']", desc: '左右標題與按鈕文字' },
  { name: 'filterable / filterPlaceholder / filterMethod', type: '…', def: 'false', desc: '搜尋' },
  { name: 'targetOrder', type: "'original' | 'push'", def: "'original'", desc: '右邊照資料原本順序／新加入的排最後' },
  { name: 'listHeight', type: 'string', def: "'16rem'", desc: '清單高度' },
  { name: 'emptyText / ariaLabel', type: 'string', def: "'沒有資料' / ''", desc: '空清單文字／整個元件的名稱' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '禁用' },
]
const transferEvents = [
  { name: 'update:modelValue', params: '(keys)', desc: '已選變更' },
  { name: 'change', params: "(keys, 'left' | 'right', movedKeys)", desc: '移動方向與移動的 key' },
]

// ---- ColorPicker ----
const colorSample = `<ChptColorPicker v-model="color" label="標記色" />
<ChptColorPicker v-model="series" :show-text="false" :presets="['#2563eb', '#16a34a', '#dc2626']" />`
const colorProps = [
  { name: 'modelValue', type: 'string | null', def: 'null', desc: '#rrggbb（v-model）' },
  { name: 'presets', type: 'string[]', def: '16 色', desc: '預設色（任何 #hex，會正規化並去重）' },
  { name: 'showText', type: 'boolean', def: 'true', desc: '按鈕上顯示色碼' },
  { name: 'clearable', type: 'boolean', def: 'true', desc: '可清除成 null' },
  { name: 'label / errorText', type: 'string', def: "''", desc: '標籤／錯誤訊息' },
  { name: 'size / disabled / fullWidth', type: '…', def: "'sm' / false", desc: '尺寸與狀態' },
]
const colorEvents = [
  { name: 'update:modelValue', params: '(value: string | null)', desc: '顏色變更' },
  { name: 'change', params: '(value: string | null)', desc: '同上' },
]

// ---- Rate ----
const rateTexts = ['很差', '差', '普通', '好', '很好']
const rateSample = `<ChptRate v-model="score" aria-label="滿意度" :texts="['很差', '差', '普通', '好', '很好']" show-text />
<ChptRate v-model="severity" icon="local_fire_department" color="danger" :count="3" />
<ChptRate :model-value="4" readonly />`
const rateProps = [
  { name: 'modelValue', type: 'number', def: '0', desc: '分數（v-model；0 = 未評分）' },
  { name: 'count', type: 'number', def: '5', desc: '總數' },
  { name: 'icon', type: 'string', def: "'star'", desc: 'Material Symbols 圖示' },
  { name: 'texts / showText', type: 'string[] / boolean', def: '[] / false', desc: '每個分數的文字（也是每顆星的名稱）／顯示在旁邊' },
  { name: 'allowClear', type: 'boolean', def: 'true', desc: '再點一次目前分數清成 0' },
  { name: 'readonly / disabled', type: 'boolean', def: 'false', desc: '唯讀（role=img）／禁用' },
  { name: 'size', type: "'sm' | 'md' | 'lg'", def: "'md'", desc: '16 / 20 / 28px' },
  { name: 'color', type: "'warning' | 'danger' | 'accent'", def: "'warning'", desc: '填滿色' },
  { name: 'ariaLabel', type: 'string', def: "'評分'", desc: '群組名稱（在有標籤的 ChptFormItem 裡自動用標籤）' },
]
const rateEvents = [
  { name: 'update:modelValue', params: '(value: number)', desc: '分數變更' },
  { name: 'change', params: '(value: number)', desc: '同上' },
]

// ---- Calendar ----
const pad = (n) => String(n).padStart(2, '0')
const now = new Date()
const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
const events = {
  [`${ym}-03`]: [{ text: 'SMT-02 保養' }],
  [`${ym}-10`]: [{ text: '客戶稽核', tone: 'danger' }, { text: '週會' }],
  [`${ym}-17`]: [{ text: '週會' }],
  [`${ym}-21`]: [{ text: '新機台進廠' }],
  [`${ym}-24`]: [{ text: '週會' }, { text: '盤點', tone: 'danger' }],
}
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6
const calendarSample = `<ChptCalendar v-model="day" :first-day-of-week="1">
  <template #date-cell="{ dateString }">
    <span v-for="e in events[dateString]" :key="e">{{ e }}</span>
  </template>
</ChptCalendar>

<ChptCalendar v-model="day" compact :disabled-date="d => d.getDay() === 0" />`
const calendarProps = [
  { name: 'modelValue', type: 'string | Date | null', def: 'null', desc: "選取的日期（v-model；'YYYY-MM-DD'）" },
  { name: 'month', type: 'string', def: '—', desc: "顯示的月份 'YYYY-MM'（v-model:month）" },
  { name: 'firstDayOfWeek', type: '0 ~ 6', def: '0', desc: '一週從星期幾開始' },
  { name: 'disabledDate', type: '(date: Date) => boolean', def: '—', desc: '不能選的日期' },
  { name: 'compact', type: 'boolean', def: 'false', desc: '小月曆（不顯示 date-cell 插槽）' },
  { name: 'showToday', type: 'boolean', def: 'true', desc: '顯示「今天」按鈕' },
  { name: 'valueType', type: "'string' | 'date'", def: "'string'", desc: 'v-model 送出的型別' },
]
const calendarEvents = [
  { name: 'update:modelValue', params: '(value: string | Date)', desc: '選取日期' },
  { name: 'update:month', params: "(month: 'YYYY-MM')", desc: '切換月份' },
  { name: 'select', params: '(date: Date, dateString: string)', desc: '選取日期' },
]
const calendarSlots = [
  { name: 'date-cell', params: '{ date, dateString, day, isToday, isSelected, inMonth }', desc: '每一天的內容（大格子模式）' },
  { name: 'header', params: '{ year, month }', desc: '自訂年月標題' },
]

const importSample = `import {
  ChptAutocomplete, ChptCascader, ChptTransfer, ChptColorPicker, ChptRate, ChptCalendar
} from '@/components/library'`
</script>
