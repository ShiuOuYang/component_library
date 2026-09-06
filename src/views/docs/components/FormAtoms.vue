<template>
  <div class="w-full px-6 py-8 lg:px-10">
    <!-- 頁首 -->
    <div class="mb-8">
      <div class="flex items-center space-x-4">
        <div class="w-14 h-14 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🧩</span>
        </div>
        <div>
          <h1 class="text-3xl font-bold text-neutral-900">基礎表單元件</h1>
          <p class="text-neutral-600 mt-1">一個元件一個區塊：使用時機＋即時示範＋用法＋Props/Events。</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mt-5">
        <span class="px-3 py-1 bg-success-100 text-success-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">Vue 3 + TS</span>
        <span class="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium">設計 Token</span>
      </div>
    </div>

    <!-- 行動版：頂部錨點橫列 -->
    <div class="flex flex-wrap gap-2 mb-6 lg:hidden">
      <button
        v-for="c in comps"
        :key="c.id"
        class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="active === c.id ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'"
        @click="go(c.id)"
      >
        {{ c.label }}
      </button>
    </div>

    <!-- 內容：一元件一區塊（左側 DocLayout 側欄可展開子元件跳轉） -->
    <div class="space-y-10">
        <!-- ============ ChptInput ============ -->
        <section id="chpt-input" class="bg-white rounded-xl shadow-md p-6 lg:p-8 border border-neutral-200 scroll-mt-24">
          <h2 class="text-2xl font-bold text-neutral-900 mb-1">ChptInput 輸入框</h2>
          <p class="text-neutral-600 text-sm mb-4">
            <strong>使用時機：</strong>單行文字輸入（帳號／料號／搜尋）。支援前綴圖示、可清除、錯誤訊息與 v-model。
          </p>
          <div class="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg p-4 border border-neutral-200 mb-4">
            <ChptInput v-model="form.keyword" label="關鍵字" placeholder="請輸入料號或站點" prefix-icon="search" clearable full-width />
            <p class="text-sm text-neutral-600 mt-2">目前值：<span class="font-mono">{{ form.keyword || '(空)' }}</span></p>
            <ChptInput v-model="form.inputErr" label="必填欄位" placeholder="請輸入" error-text="此欄為必填" full-width />
          </div>
          <ChptCodeBlock :code="inputSample" />
          <ApiTable title="Props" :rows="inputProps" />
          <ApiTable title="Events" :rows="inputEvents" />
          <p class="text-sm text-neutral-600 mt-4"><strong>注意：</strong>有 errorText 時呈現 danger 樣式；clearable 需有值才出現 ✕。</p>
        </section>

        <!-- ============ ChptSelect ============ -->
        <section id="chpt-select" class="bg-white rounded-xl shadow-md p-6 lg:p-8 border border-neutral-200 scroll-mt-24">
          <h2 class="text-2xl font-bold text-neutral-900 mb-1">ChptSelect 下拉選單</h2>
          <p class="text-neutral-600 text-sm mb-4">
            <strong>使用時機：</strong>單選下拉；options 可為字串/數字陣列或 { label, value, disabled } 物件陣列。
          </p>
          <div class="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg p-4 border border-neutral-200 mb-4">
            <ChptSelect v-model="form.site" label="廠區" :options="siteOptions" placeholder="請選擇廠區" full-width />
            <p class="text-sm text-neutral-600 mt-2">目前值：<span class="font-mono">{{ form.site || '(未選擇)' }}</span></p>
          </div>
          <ChptCodeBlock :code="selectSample" />
          <ApiTable title="Props" :rows="selectProps" />
          <ApiTable title="Events" :rows="selectEvents" />
          <p class="text-sm text-neutral-600 mt-4"><strong>注意：</strong>物件選項可用 valueKey/labelKey 對映；numberValue 會把值轉數字。</p>
        </section>

        <!-- ============ ChptRadio ============ -->
        <section id="chpt-radio" class="bg-white rounded-xl shadow-md p-6 lg:p-8 border border-neutral-200 scroll-mt-24">
          <h2 class="text-2xl font-bold text-neutral-900 mb-1">ChptRadio 單選群組</h2>
          <p class="text-neutral-600 text-sm mb-4">
            <strong>使用時機：</strong>少量互斥選項（優先級／狀態）；值支援 String | Number | Boolean。
          </p>
          <div class="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg p-4 border border-neutral-200 mb-4">
            <ChptRadio v-model="form.priority" :items="priorityOptions" color="primary" />
            <p class="text-sm text-neutral-600 mt-2">目前值：<span class="font-mono">{{ form.priority }}</span></p>
          </div>
          <ChptCodeBlock :code="radioSample" />
          <ApiTable title="Props" :rows="radioProps" />
          <ApiTable title="Events" :rows="radioEvents" />
          <p class="text-sm text-neutral-600 mt-4"><strong>注意：</strong>欄位禁用由 item.disabled 控制；錯誤以 errors[] 顯示於下方。</p>
        </section>

        <!-- ============ ChptSwitch ============ -->
        <section id="chpt-switch" class="bg-white rounded-xl shadow-md p-6 lg:p-8 border border-neutral-200 scroll-mt-24">
          <h2 class="text-2xl font-bold text-neutral-900 mb-1">ChptSwitch 開關</h2>
          <p class="text-neutral-600 text-sm mb-4">
            <strong>使用時機：</strong>布林開關（啟用／停用、通知、權限）。
          </p>
          <div class="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg p-4 border border-neutral-200 mb-4">
            <div class="flex items-center gap-4">
              <ChptSwitch v-model="form.notify" label="啟用通知" color="success" />
              <span class="text-sm text-neutral-600">{{ form.notify ? 'On' : 'Off' }}</span>
            </div>
          </div>
          <ChptCodeBlock :code="switchSample" />
          <ApiTable title="Props" :rows="switchProps" />
          <ApiTable title="Events" :rows="switchEvents" />
          <p class="text-sm text-neutral-600 mt-4"><strong>注意：</strong>color 語意色；disabled 時不觸發 change。</p>
        </section>

        <!-- ============ ChptDatePicker ============ -->
        <section id="chpt-datepicker" class="bg-white rounded-xl shadow-md p-6 lg:p-8 border border-neutral-200 scroll-mt-24">
          <h2 class="text-2xl font-bold text-neutral-900 mb-1">ChptDatePicker 日期選擇</h2>
          <p class="text-neutral-600 text-sm mb-4">
            <strong>使用時機：</strong>單日／日期區間／時間選擇；封裝 @vuepic/vue-datepicker。
          </p>
          <div class="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg p-4 border border-neutral-200 mb-4">
            <div class="grid md:grid-cols-2 gap-4">
              <ChptDatePicker v-model="form.date" label="單日" placeholder="選擇日期" full-width />
              <ChptDatePicker v-model="form.range" label="區間" :range="true" :enable-time-picker="true" format="yyyy-MM-dd HH:mm" full-width />
            </div>
            <p class="text-sm text-neutral-600 mt-2 break-all">單日：<span class="font-mono">{{ form.date ? String(form.date) : '(未選擇)' }}</span></p>
          </div>
          <ChptCodeBlock :code="dateSample" />
          <ApiTable title="Props" :rows="dateProps" />
          <ApiTable title="Events" :rows="dateEvents" />
          <p class="text-sm text-neutral-600 mt-4"><strong>注意：</strong>range=true 回傳區間陣列；format 例：yyyy-MM-dd 或含時間 HH:mm。</p>
        </section>

        <!-- 引入方式 -->
        <section class="bg-white rounded-xl shadow-md p-6 lg:p-8 border border-neutral-200">
          <h2 class="text-2xl font-bold text-neutral-900 mb-2">引入方式</h2>
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
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

const comps = [
  { id: 'chpt-input', label: 'ChptInput' },
  { id: 'chpt-select', label: 'ChptSelect' },
  { id: 'chpt-radio', label: 'ChptRadio' },
  { id: 'chpt-switch', label: 'ChptSwitch' },
  { id: 'chpt-datepicker', label: 'ChptDatePicker' },
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
})

const siteOptions = ['FAB-A', 'FAB-B', 'FAB-C']
const priorityOptions = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
]

const importSample = `import {
  ChptInput, ChptSelect, ChptRadio, ChptSwitch, ChptDatePicker
} from '@/components/library'`

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
