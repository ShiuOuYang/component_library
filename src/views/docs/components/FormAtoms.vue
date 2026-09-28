<template>
  <div class="w-full px-6 py-8 lg:px-10">
    <!-- 頁首 -->
    <div class="mb-8">
      <div class="flex items-center space-x-4">
        <div class="w-14 h-14 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🧩</span>
        </div>
        <div>
          <h1 class="text-3xl font-bold text-content-primary">基礎表單元件</h1>
          <p class="text-content-secondary mt-1">一個元件一個區塊：使用時機＋即時示範＋用法＋Props/Events。</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mt-5">
        <span class="px-3 py-1 bg-success-subtle text-success-on-subtle rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-accent-subtle text-accent-on-subtle rounded-full text-sm font-medium">Vue 3 + TS</span>
        <span class="px-3 py-1 bg-surface-tertiary text-content-secondary rounded-full text-sm font-medium">設計 Token</span>
      </div>
    </div>

    <!-- 行動版：頂部錨點橫列 -->
    <div class="flex flex-wrap gap-2 mb-6 lg:hidden">
      <button type="button"
        v-for="c in comps"
        :key="c.id"
        class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="active === c.id ? 'bg-primary-600 text-white' : 'bg-surface-tertiary text-content-secondary hover:bg-surface-muted'"
        @click="go(c.id)"
      >
        {{ c.label }}
      </button>
    </div>

    <!-- 內容：一元件一區塊（左側 DocLayout 側欄可展開子元件跳轉） -->
    <div class="space-y-10">
        <!-- ============ ChptInput ============ -->
        <section id="chpt-input" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
          <h2 class="text-2xl font-bold text-content-primary mb-1">ChptInput 輸入框</h2>
          <p class="text-content-secondary text-sm mb-4">
            <strong>使用時機：</strong>單行文字輸入（帳號／料號／搜尋）。支援前綴圖示、可清除、錯誤訊息與 v-model。
          </p>
          <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4">
            <ChptInput v-model="form.keyword" label="關鍵字" placeholder="請輸入料號或站點" prefix-icon="search" clearable full-width />
            <p class="text-sm text-content-secondary mt-2">目前值：<span class="font-mono">{{ form.keyword || '(空)' }}</span></p>
            <ChptInput v-model="form.inputErr" label="必填欄位" placeholder="請輸入" error-text="此欄為必填" full-width />
          </div>
          <ChptCodeBlock :code="inputSample" />
          <ApiTable title="Props" :rows="inputProps" />
          <ApiTable title="Events" :rows="inputEvents" />
          <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>有 errorText 時呈現 danger 樣式；clearable 需有值才出現 ✕。</p>
        </section>

        <!-- ============ ChptSelect ============ -->
        <section id="chpt-select" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
          <h2 class="text-2xl font-bold text-content-primary mb-1">ChptSelect 下拉選單</h2>
          <p class="text-content-secondary text-sm mb-4">
            <strong>使用時機：</strong>單選下拉；options 可為字串/數字陣列或 { label, value, disabled } 物件陣列。
          </p>
          <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4">
            <ChptSelect v-model="form.site" label="廠區" :options="siteOptions" placeholder="請選擇廠區" full-width />
            <p class="text-sm text-content-secondary mt-2">目前值：<span class="font-mono">{{ form.site || '(未選擇)' }}</span></p>
          </div>
          <ChptCodeBlock :code="selectSample" />
          <ApiTable title="Props" :rows="selectProps" />
          <ApiTable title="Events" :rows="selectEvents" />
          <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>物件選項可用 valueKey/labelKey 對映；numberValue 會把值轉數字。</p>
        </section>

        <!-- ============ ChptRadio ============ -->
        <section id="chpt-radio" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
          <h2 class="text-2xl font-bold text-content-primary mb-1">ChptRadio 單選群組</h2>
          <p class="text-content-secondary text-sm mb-4">
            <strong>使用時機：</strong>少量互斥選項（優先級／狀態）；值支援 String | Number | Boolean。
          </p>
          <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4">
            <ChptRadio v-model="form.priority" :items="priorityOptions" color="primary" />
            <p class="text-sm text-content-secondary mt-2">目前值：<span class="font-mono">{{ form.priority }}</span></p>
          </div>
          <ChptCodeBlock :code="radioSample" />
          <ApiTable title="Props" :rows="radioProps" />
          <ApiTable title="Events" :rows="radioEvents" />
          <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>欄位禁用由 item.disabled 控制；錯誤以 errors[] 顯示於下方。</p>
        </section>

        <!-- ============ ChptSwitch ============ -->
        <section id="chpt-switch" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
          <h2 class="text-2xl font-bold text-content-primary mb-1">ChptSwitch 開關</h2>
          <p class="text-content-secondary text-sm mb-4">
            <strong>使用時機：</strong>布林開關（啟用／停用、通知、權限）。
          </p>
          <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4">
            <div class="flex items-center gap-4">
              <ChptSwitch v-model="form.notify" label="啟用通知" color="success" />
              <span class="text-sm text-content-secondary">{{ form.notify ? 'On' : 'Off' }}</span>
            </div>
          </div>
          <ChptCodeBlock :code="switchSample" />
          <ApiTable title="Props" :rows="switchProps" />
          <ApiTable title="Events" :rows="switchEvents" />
          <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>color 語意色；disabled 時不觸發 change。</p>
        </section>

        <!-- ============ ChptDatePicker ============ -->
        <section id="chpt-datepicker" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
          <h2 class="text-2xl font-bold text-content-primary mb-1">ChptDatePicker 日期選擇</h2>
          <p class="text-content-secondary text-sm mb-4">
            <strong>使用時機：</strong>單日／日期區間／時間選擇；封裝 @vuepic/vue-datepicker。
          </p>
          <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4">
            <div class="grid md:grid-cols-2 gap-4">
              <ChptDatePicker v-model="form.date" label="單日" placeholder="選擇日期" full-width />
              <ChptDatePicker v-model="form.range" label="區間" :range="true" :enable-time-picker="true" format="yyyy-MM-dd HH:mm" full-width />
            </div>
            <p class="text-sm text-content-secondary mt-2 break-all">單日：<span class="font-mono">{{ form.date ? String(form.date) : '(未選擇)' }}</span></p>
          </div>
          <ChptCodeBlock :code="dateSample" />
          <ApiTable title="Props" :rows="dateProps" />
          <ApiTable title="Events" :rows="dateEvents" />
          <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>range=true 回傳區間陣列；format 例：yyyy-MM-dd 或含時間 HH:mm。</p>
        </section>

        <!-- ============ ChptInputNumber ============ -->
        <section id="chpt-inputnumber" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
          <h2 class="text-2xl font-bold text-content-primary mb-1">ChptInputNumber 數字輸入框</h2>
          <p class="text-content-secondary text-sm mb-4">
            <strong>使用時機：</strong>數量、門檻值、百分比這類有上下限的數字欄位。打字途中不夾限（離開欄位才驗證），
            ↑↓ 加減一步、PageUp／PageDown 十步、Home／End 到上下限；小數步進沒有浮點誤差。
          </p>
          <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4">
            <div class="flex flex-wrap items-end gap-4">
              <ChptInputNumber v-model="form.qty" label="投入數量" :min="0" :max="5000" :step="10" unit="pcs" />
              <ChptInputNumber v-model="form.threshold" label="良率門檻" :min="0" :max="100" :step="0.5" :precision="1" unit="%" />
              <ChptInputNumber v-model="form.lot" label="批號（無按鈕）" :controls="false" placeholder="選填" />
            </div>
            <p class="text-sm text-content-secondary mt-3">目前值：<span class="font-mono">{{ form.qty }} / {{ form.threshold }} / {{ form.lot ?? 'null' }}</span></p>
          </div>
          <ChptCodeBlock :code="inputNumberSample" />
          <ApiTable title="Props" :rows="inputNumberProps" />
          <ApiTable title="Events" :rows="inputNumberEvents" />
          <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>清空欄位時值是 null（不是 0）；打錯字會還原成原本的值。
            − / + 按鈕不佔 Tab 停駐點，鍵盤使用者用方向鍵。</p>
        </section>

        <!-- ============ ChptSlider ============ -->
        <section id="chpt-slider" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
          <h2 class="text-2xl font-bold text-content-primary mb-1">ChptSlider 滑桿</h2>
          <p class="text-content-secondary text-sm mb-4">
            <strong>使用時機：</strong>在範圍內挑一個「大概位置」比精確數字重要的值（透明度、靈敏度）。需要精確輸入時搭配 ChptInputNumber。
            以原生 range 為基礎，鍵盤、觸控與螢幕閱讀器都由瀏覽器處理。
          </p>
          <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4">
            <div class="grid md:grid-cols-2 gap-6">
              <ChptSlider v-model="form.opacity" label="透明度" show-value :formatter="(v) => v + '%'" full-width />
              <ChptSlider v-model="form.level" label="靈敏度" :min="1" :max="5" :marks="{ 1: '低', 3: '中', 5: '高' }" full-width />
            </div>
          </div>
          <ChptCodeBlock :code="sliderSample" />
          <ApiTable title="Props" :rows="sliderProps" />
          <ApiTable title="Events" :rows="sliderEvents" />
          <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>update:modelValue 在拖曳中持續觸發，要打 API 請聽 change（放開時一次）。
            formatter 也會成為螢幕閱讀器唸出的 aria-valuetext。</p>
        </section>

        <!-- ============ ChptSegmented ============ -->
        <section id="chpt-segmented" class="bg-surface-primary rounded-xl shadow-md p-6 lg:p-8 border border-stroke-light scroll-mt-24">
          <h2 class="text-2xl font-bold text-content-primary mb-1">ChptSegmented 分段控制器</h2>
          <p class="text-content-secondary text-sm mb-4">
            <strong>使用時機：</strong>2~5 個互斥的「檢視方式」（日／週／月、清單／卡片）。選項少、希望一直看得到時比下拉直覺；
            要切換整塊內容請用 ChptTabs。
          </p>
          <div class="bg-gradient-to-br from-surface-secondary to-surface-tertiary rounded-lg p-4 border border-stroke-light mb-4">
            <div class="flex flex-wrap items-center gap-4">
              <ChptSegmented v-model="form.period" :options="['日', '週', '月', '季']" aria-label="統計期間" />
              <ChptSegmented v-model="form.view" :options="viewOptions" aria-label="檢視方式" size="xs" />
            </div>
            <p class="text-sm text-content-secondary mt-3">目前值：<span class="font-mono">{{ form.period }} / {{ form.view }}</span></p>
          </div>
          <ChptCodeBlock :code="segmentedSample" />
          <ApiTable title="Props" :rows="segmentedProps" />
          <ApiTable title="Events" :rows="segmentedEvents" />
          <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>整組只佔一個 Tab 停駐點，←→ 直接切換並略過停用項（WAI-ARIA radiogroup）。
            畫面上沒有標籤時務必給 aria-label。</p>
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
import { reactive, ref } from 'vue'
import {
  ChptInput,
  ChptRadio,
  ChptSwitch,
  ChptSelect,
  ChptDatePicker,
  ChptInputNumber,
  ChptSlider,
  ChptSegmented,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

const comps = [
  { id: 'chpt-input', label: 'ChptInput' },
  { id: 'chpt-select', label: 'ChptSelect' },
  { id: 'chpt-radio', label: 'ChptRadio' },
  { id: 'chpt-switch', label: 'ChptSwitch' },
  { id: 'chpt-datepicker', label: 'ChptDatePicker' },
  { id: 'chpt-inputnumber', label: 'ChptInputNumber' },
  { id: 'chpt-slider', label: 'ChptSlider' },
  { id: 'chpt-segmented', label: 'ChptSegmented' },
]

const active = ref('chpt-input')
function go(id) {
  active.value = id
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const form = reactive({
  keyword: '',
  inputErr: '',
  site: '',
  priority: 'high',
  notify: true,
  date: null,
  range: null,
  qty: 1200,
  threshold: 98.5,
  lot: null,
  opacity: 80,
  level: 3,
  period: '週',
  view: 'list',
})

const viewOptions = [
  { label: '清單', value: 'list', icon: 'list' },
  { label: '卡片', value: 'grid', icon: 'grid_view' },
  { label: '圖表', value: 'chart', icon: 'bar_chart', disabled: true },
]

const siteOptions = ['FAB-A', 'FAB-B', 'FAB-C']
const priorityOptions = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
]

const importSample = `import {
  ChptInput, ChptSelect, ChptRadio, ChptSwitch, ChptDatePicker,
  ChptInputNumber, ChptSlider, ChptSegmented
} from '@/components/library'`

const inputNumberSample = `<ChptInputNumber v-model="qty" label="投入數量" :min="0" :max="5000" :step="10" unit="pcs" />
<ChptInputNumber v-model="rate" :step="0.5" :precision="1" unit="%" @change="(v, old) => save(v)" />`

const inputNumberProps = [
  { name: 'modelValue', type: 'number | null', def: 'null', desc: '值（v-model）；清空時為 null' },
  { name: 'min / max', type: 'number', def: '-Infinity / Infinity', desc: '上下限（離開欄位或按 Enter 時夾到範圍內）' },
  { name: 'step', type: 'number', def: '1', desc: '每一步的增減量（PageUp／PageDown 是十步）' },
  { name: 'precision', type: 'number', def: '—', desc: '固定小數位數（四捨五入，遠離零）' },
  { name: 'unit', type: 'string', def: "''", desc: '顯示在數字右側的單位' },
  { name: 'controls', type: 'boolean', def: 'true', desc: '是否顯示 − / + 按鈕' },
  { name: 'size', type: "'xs'…'xl'", def: "'sm'", desc: '尺寸（control token）' },
  { name: 'label / placeholder / errorText', type: 'string', def: "''", desc: '標籤／佔位符／錯誤訊息' },
  { name: 'disabled / readonly / fullWidth', type: 'boolean', def: 'false', desc: '禁用／唯讀／全寬' },
]
const inputNumberEvents = [
  { name: 'update:modelValue', params: '(value: number | null)', desc: '值確定改變時（不是每打一個字）' },
  { name: 'change', params: '(value, oldValue)', desc: '同上，帶舊值' },
  { name: 'focus / blur', params: '(event: FocusEvent)', desc: '焦點進出' },
]

const sliderSample = `<ChptSlider v-model="opacity" label="透明度" show-value :formatter="v => v + '%'" />
<ChptSlider v-model="level" :min="1" :max="5" :marks="{ 1: '低', 3: '中', 5: '高' }" @change="save" />`

const sliderProps = [
  { name: 'modelValue', type: 'number', def: '0', desc: '值（v-model）' },
  { name: 'min / max / step', type: 'number', def: '0 / 100 / 1', desc: '範圍與步長' },
  { name: 'label', type: 'string', def: "''", desc: '標籤' },
  { name: 'showValue', type: 'boolean', def: 'false', desc: '在右上角顯示目前值' },
  { name: 'formatter', type: '(v: number) => string', def: '—', desc: '顯示格式；同時作為 aria-valuetext' },
  { name: 'marks', type: 'SliderMark[] | Record<number, string>', def: '—', desc: '刻度' },
  { name: 'disabled / fullWidth', type: 'boolean', def: 'false', desc: '禁用／全寬（預設寬 16rem）' },
]
const sliderEvents = [
  { name: 'update:modelValue', params: '(value: number)', desc: '拖曳中持續觸發' },
  { name: 'change', params: '(value: number)', desc: '放開或鍵盤操作完成時觸發一次' },
]

const segmentedSample = `<ChptSegmented v-model="period" :options="['日', '週', '月']" aria-label="統計期間" />
<ChptSegmented
  v-model="view"
  :options="[{ label: '清單', value: 'list', icon: 'list' }, { label: '卡片', value: 'grid', icon: 'grid_view' }]"
/>`

const segmentedProps = [
  { name: 'modelValue', type: 'string | number', def: '—', desc: '目前選取的值（v-model）' },
  { name: 'options', type: '(SegmentOption | string | number)[]', def: '—', desc: '選項：{ label, value, icon?, disabled? } 或字串' },
  { name: 'size', type: "'xs' | 'sm' | 'md' | 'lg'", def: "'sm'", desc: '尺寸；整組外高與同尺寸按鈕一致' },
  { name: 'block', type: 'boolean', def: 'false', desc: '撐滿寬度、選項平均分配' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '整組禁用' },
  { name: 'ariaLabel', type: 'string', def: "''", desc: '群組名稱（沒有可見標籤時必填）' },
]
const segmentedEvents = [
  { name: 'update:modelValue', params: '(value)', desc: '選取變更' },
  { name: 'change', params: '(value)', desc: '同上（值真的改變時才觸發）' },
]

const inputSample = `<ChptInput v-model="v" label="料號" prefix-icon="search" clearable />
<ChptInput v-model="v" error-text="此欄必填" />`
const selectSample = `<ChptSelect v-model="v" :options="['A','B','C']" label="廠區" />`
const radioSample = `<ChptRadio v-model="v" :items="[{label:'高',value:'high'}]" color="primary" />`
const switchSample = `<ChptSwitch v-model="on" label="啟用通知" color="success" />`
const dateSample = `<ChptDatePicker v-model="d" label="單日" />
<ChptDatePicker v-model="r" label="區間" range enable-time-picker format="yyyy-MM-dd HH:mm" />`

const inputProps = [
  { name: 'modelValue', type: 'string | number', def: "''", desc: '值（v-model）' },
  { name: 'label / placeholder', type: 'string', def: "''", desc: '標籤／佔位符' },
  { name: 'type', type: 'InputNativeType', def: "'text'", desc: '原生 type' },
  { name: 'size', type: "'xs'…'xl'", def: "'sm'", desc: '尺寸' },
  { name: 'disabled / readonly', type: 'boolean', def: 'false', desc: '禁用／唯讀' },
  { name: 'clearable', type: 'boolean', def: 'false', desc: '可清除' },
  { name: 'prefixIcon', type: 'string', def: "''", desc: '前綴 Material Symbols 圖示' },
  { name: 'maxlength', type: 'number', def: 'undefined', desc: '最大長度' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '全寬' },
  { name: 'errorText', type: 'string', def: "''", desc: '錯誤訊息' },
]
const inputEvents = [
  { name: 'update:modelValue', params: '(value)', desc: '輸入變更' },
  { name: 'clear', params: '—', desc: '點清除' },
  { name: 'blur / focus', params: '(FocusEvent)', desc: '失焦／聚焦' },
]

const selectProps = [
  { name: 'modelValue', type: 'string | number', def: "''", desc: '值（v-model）' },
  { name: 'options', type: 'Array', def: '[]', desc: '字串/數字 或 { label, value, disabled }' },
  { name: 'label / placeholder', type: 'string', def: "''", desc: '標籤／佔位符' },
  { name: 'size', type: "'xs'…'xl'", def: "'sm'", desc: '尺寸' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '禁用' },
  { name: 'valueKey / labelKey / disabledKey', type: 'string', def: "''", desc: '物件選項對映鍵' },
  { name: 'numberValue', type: 'boolean', def: 'false', desc: '值轉數字' },
  { name: 'errorText', type: 'string', def: "''", desc: '錯誤訊息' },
]
const selectEvents = [{ name: 'update:modelValue', params: '(value)', desc: '選項變更' }]

const radioProps = [
  { name: 'modelValue', type: '…', def: 'null', desc: '目前選中值（v-model）' },
  { name: 'items', type: 'ChptRadioItem[]', def: '[]', desc: '{ label, value, disabled? }' },
  { name: 'color', type: 'ColorVariant', def: "'primary'", desc: '語意色' },
  { name: 'size', type: "'3'|'4'|'5'|'6'", def: "'4'", desc: '圓點大小(px)' },
  { name: 'direction', type: "'row'|'col'", def: "'row'", desc: '排列' },
  { name: 'errors', type: 'string[]', def: '[]', desc: '錯誤訊息' },
]
const radioEvents = [{ name: 'update:modelValue', params: '(value)', desc: '選擇變更' }]

const switchProps = [
  { name: 'modelValue', type: 'boolean', def: 'false', desc: '開關狀態（v-model）' },
  { name: 'label', type: 'string', def: "''", desc: '右側文字' },
  { name: 'size', type: "'sm'|'md'|'lg'", def: "'md'", desc: '尺寸' },
  { name: 'color', type: 'ColorVariant', def: "'primary'", desc: '開啟語意色' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '禁用' },
]
const switchEvents = [
  { name: 'update:modelValue', params: '(value)', desc: '狀態變更' },
  { name: 'change', params: '(value)', desc: '切換（非禁用）' },
]

const dateProps = [
  { name: 'modelValue', type: 'ChptDatePickerValue', def: 'null', desc: '值（v-model）' },
  { name: 'label / placeholder', type: 'string', def: "''", desc: '標籤／佔位符' },
  { name: 'range', type: 'boolean', def: 'false', desc: '日期區間' },
  { name: 'enableTimePicker', type: 'boolean', def: 'false', desc: '時間選擇' },
  { name: 'format', type: 'string', def: "'yyyy-MM-dd'", desc: '顯示格式' },
  { name: 'minDate / maxDate', type: '…', def: 'undefined', desc: '範圍限制' },
  { name: 'size', type: "'xs'…'xl'", def: "'sm'", desc: '尺寸' },
  { name: 'disabled / clearable / autoApply', type: 'boolean', def: '…', desc: '禁用／可清／自動套用' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '全寬' },
  { name: 'errorText', type: 'string', def: "''", desc: '錯誤訊息' },
]
const dateEvents = [
  { name: 'update:modelValue', params: '(value)', desc: '日期變更' },
  { name: 'clear', params: '—', desc: '清除' },
]
</script>
