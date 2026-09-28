<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">📝</span>
        <h1 class="text-4xl font-bold text-content-primary">表單驗證與上傳</h1>
      </div>
      <p class="text-content-secondary text-lg max-w-4xl">
        ChptForm / ChptFormItem（表單與驗證）、ChptUpload（檔案上傳）。
        欄位元件本身（ChptInput、ChptSelect…）見「基礎表單元件」。
      </p>
    </div>

    <!-- ============ ChptForm ============ -->
    <section id="chpt-form" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptForm / ChptFormItem 表單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>需要驗證的表單。Form 管資料與規則，FormItem 管單一欄位的標籤、錯誤訊息與驗證時機。
        放進 FormItem 的 ChptInput / ChptSelect / ChptTextarea / ChptInputNumber 會自動連線：點標籤聚焦輸入框、錯誤時變紅框並以
        aria-describedby 指向錯誤訊息。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptForm, ChptFormItem } from '@/components/library'</code>
      </p>

      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="text-sm text-content-secondary">標籤位置</span>
        <ChptSegmented v-model="labelPosition" :options="[{ label: '上方', value: 'top' }, { label: '左側', value: 'left' }]" aria-label="標籤位置" size="xs" />
      </div>

      <div class="rounded-lg border border-stroke-light bg-surface-secondary p-6">
        <ChptForm ref="formRef" :model="order" :rules="rules" :label-position="labelPosition" label-width="7rem" @submit="onSubmit" @invalid="onInvalid">
          <div class="grid gap-4 md:grid-cols-2">
            <ChptFormItem prop="orderNo" label="工單號" hint="格式 WO-年份-四碼；WO-2026-0001 已存在（模擬非同步檢查）">
              <ChptInput v-model="order.orderNo" placeholder="WO-2026-0917" full-width />
            </ChptFormItem>
            <ChptFormItem prop="part" label="料號">
              <ChptSelect v-model="order.part" :options="partOptions" placeholder="請選擇料號" full-width />
            </ChptFormItem>
            <ChptFormItem prop="qty" label="投入數量">
              <ChptInputNumber v-model="order.qty" :min="0" :max="10000" :step="10" unit="pcs" full-width />
            </ChptFormItem>
            <ChptFormItem prop="contact" label="聯絡信箱">
              <ChptInput v-model="order.contact" type="email" placeholder="name@company.com" full-width />
            </ChptFormItem>
            <ChptFormItem prop="priority" label="優先級">
              <ChptRadio v-model="order.priority" :items="priorityItems" direction="row" />
            </ChptFormItem>
            <ChptFormItem prop="due" label="交期">
              <ChptDatePicker v-model="order.due" placeholder="選擇日期" full-width />
            </ChptFormItem>
          </div>
          <ChptFormItem prop="note" label="備註">
            <ChptTextarea v-model="order.note" :rows="3" :maxlength="200" show-count full-width />
          </ChptFormItem>
          <ChptFormItem prop="files" label="附件" hint="至少一個檔案（BOM 或圖面）">
            <ChptUpload v-model="order.files" multiple accept=".pdf,.xlsx,.dwg" :max-count="3" />
          </ChptFormItem>
          <div class="flex gap-2" :class="labelPosition === 'left' ? 'sm:pl-32' : ''">
            <ChptButton type="submit" label="送出工單" color="primary" size="md" />
            <ChptButton type="reset" label="重設" color="primary" size="md" is-outline />
          </div>
        </ChptForm>
      </div>

      <p v-if="submitResult" class="mt-3 text-sm" :class="submitResult.ok ? 'text-success' : 'text-danger'" role="status">
        {{ submitResult.text }}
      </p>

      <div class="mt-6">
        <ChptCodeBlock :code="formSample" />
      </div>
      <ApiTable title="ChptForm Props" :rows="formProps" />
      <ApiTable title="ChptForm Events" :rows="formEvents" />
      <ApiTable title="ChptForm 方法（ref）" :rows="formMethods" />
      <ApiTable title="ChptFormItem Props" :rows="formItemProps" />
      <ApiTable title="驗證規則 FormRule" :rows="ruleRows" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>送出失敗時焦點會移到畫面上第一個錯誤欄位並捲到可見 —— 只顯示紅字而焦點留在送出鈕，
        鍵盤與螢幕閱讀器使用者不知道哪裡錯了。欄位離開時驗證；已顯示錯誤的欄位一改對就消失。
        非同步驗證只採用最後一次的結果。
      </p>
    </section>

    <!-- ============ ChptUpload ============ -->
    <section id="chpt-upload" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptUpload 檔案上傳</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>附件、圖片、報表等一般檔案上傳（要把 Excel 讀成資料請用 ChptExcelUploader）。
        上傳方式由你的 <code>request</code> 函式決定，元件負責格式／大小／數量檢查、進度、取消與重試。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptUpload } from '@/components/library'</code>
      </p>

      <div class="grid gap-6 md:grid-cols-2">
        <div>
          <h3 class="text-sm font-semibold text-content-secondary mb-2">拖放 + 自動上傳（檔名含 fail 會模擬失敗）</h3>
          <ChptUpload
            v-model="uploadFiles"
            multiple
            accept=".pdf,.xlsx,.csv,image/*"
            :max-size="20 * 1024 * 1024"
            :max-count="5"
            :request="fakeRequest"
          />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-content-secondary mb-2">按鈕樣式、只收集檔案（隨表單一起送出）</h3>
          <ChptUpload v-model="plainFiles" :drag="false" accept=".xlsx" button-text="選擇 Excel" />
          <p class="mt-2 text-xs text-content-tertiary">目前：{{ plainFiles.map((f) => f.name).join('、') || '（無）' }}</p>
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="uploadSample" />
      </div>
      <ApiTable title="Props" :rows="uploadProps" />
      <ApiTable title="Events" :rows="uploadEvents" />
      <ApiTable title="方法（ref）" :rows="uploadMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong><code>accept</code> 只是檔案對話框的建議（使用者可以選「所有檔案」，拖放更完全不受限），
        所以元件會再檢查一次並說明拒絕原因。上傳中按 ✕ 會透過 <code>AbortSignal</code> 真的中止請求。
        檔案選擇框以 sr-only 隱藏，仍可用 Tab 聚焦、Enter 開啟。
      </p>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import {
  ChptForm,
  ChptFormItem,
  ChptInput,
  ChptSelect,
  ChptInputNumber,
  ChptRadio,
  ChptDatePicker,
  ChptTextarea,
  ChptUpload,
  ChptButton,
  ChptSegmented,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- ChptForm ----
const formRef = ref(null)
const labelPosition = ref('top')
const order = reactive({
  orderNo: '',
  part: '',
  qty: null,
  contact: '',
  priority: 'normal',
  due: null,
  note: '',
  files: [],
})
const partOptions = ['PCB-A12-R3', 'PCB-B07-R1', 'FPC-C33-R2']
const priorityItems = [
  { label: '急件', value: 'urgent' },
  { label: '一般', value: 'normal' },
  { label: '低', value: 'low' },
]
const rules = {
  orderNo: [
    { required: true },
    { pattern: /^WO-\d{4}-\d{4}$/, message: '格式應為 WO-年份-四碼，例如 WO-2026-0917' },
    {
      // 模擬到伺服器查重複
      validator: (v) => new Promise((resolve) => setTimeout(() => resolve(v === 'WO-2026-0001' ? '此工單號已存在' : true), 400)),
    },
  ],
  part: { required: true, message: '請選擇料號' },
  qty: [{ required: true }, { min: 1, message: '投入數量至少 1 片' }],
  contact: { type: 'email' },
  due: { required: true, message: '請選擇交期' },
  note: { max: 200 },
  files: { required: true, message: '請上傳至少一個附件' },
}
const submitResult = ref(null)
function onSubmit(model) {
  submitResult.value = { ok: true, text: `已送出：${model.orderNo}（${model.part}，${model.qty} pcs）` }
}
function onInvalid(errors) {
  submitResult.value = { ok: false, text: `有 ${Object.keys(errors).length} 個欄位需要修正` }
}

const formSample = `<ChptForm :model="order" :rules="rules" @submit="save">
  <ChptFormItem prop="orderNo" label="工單號" hint="WO-年份-四碼">
    <ChptInput v-model="order.orderNo" />
  </ChptFormItem>
  <ChptFormItem prop="qty" label="投入數量">
    <ChptInputNumber v-model="order.qty" :min="0" unit="pcs" />
  </ChptFormItem>
  <ChptButton type="submit" label="送出" color="primary" />
</ChptForm>

const rules = {
  orderNo: [
    { required: true },
    { pattern: /^WO-\\d{4}-\\d{4}$/, message: '格式應為 WO-年份-四碼' },
    { validator: async (v) => (await api.exists(v)) ? '此工單號已存在' : true },
  ],
  qty: [{ required: true }, { min: 1 }],
  confirm: { validator: (v, model) => v === model.password || '兩次密碼不一致' },
}`

const formProps = [
  { name: 'model', type: 'Record<string, unknown>', def: '—', desc: '表單資料（reactive）；欄位路徑可用 a.b.c' },
  { name: 'rules', type: 'Record<string, FormRule | FormRule[]>', def: '{}', desc: '驗證規則，鍵是欄位路徑' },
  { name: 'labelPosition', type: "'top' | 'left'", def: "'top'", desc: '標籤位置（窄螢幕一律在上方）' },
  { name: 'labelWidth', type: 'string', def: "'8rem'", desc: '標籤在左側時的寬度' },
  { name: 'gap', type: "'sm' | 'md' | 'lg'", def: "'md'", desc: '欄位間距' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '停用整個表單（fieldset disabled）' },
]
const formEvents = [
  { name: 'submit', params: '(model)', desc: '驗證通過後送出' },
  { name: 'invalid', params: '(errors: Record<string, string>)', desc: '驗證失敗（焦點已移到第一個錯誤欄位）' },
]
const formMethods = [
  { name: 'validate', params: '(fields?) => Promise<{ valid, errors }>', desc: '驗證全部或指定欄位' },
  { name: 'validateField', params: '(field) => Promise', desc: '驗證單一欄位（不移動焦點）' },
  { name: 'resetFields', params: '(fields?)', desc: '還原成初始值並清除錯誤' },
  { name: 'clearValidate', params: '(fields?)', desc: '只清除錯誤訊息' },
  { name: 'submit', params: '()', desc: '以程式送出（等同按送出鈕）' },
]
const formItemProps = [
  { name: 'prop', type: 'string', def: '—', desc: '欄位路徑（對應 model 與 rules）' },
  { name: 'label', type: 'string', def: "''", desc: '標籤' },
  { name: 'required', type: 'boolean', def: '—', desc: '必填（不設定時看規則裡有沒有 required）' },
  { name: 'rules', type: 'FormRule | FormRule[]', def: '—', desc: '額外規則（與 Form 的 rules 合併）' },
  { name: 'hint', type: 'string', def: "''", desc: '說明文字（沒有錯誤時顯示，並連到輸入框的 aria-describedby）' },
  { name: 'labelWidth', type: 'string', def: '—', desc: '覆寫 Form 的標籤寬度' },
  { name: 'showMessage', type: 'boolean', def: 'true', desc: '是否顯示錯誤訊息文字' },
]
const ruleRows = [
  { name: 'required', type: 'boolean', def: '—', desc: '必填（空白字串、null、空陣列算沒填；0 與 false 算有填）' },
  { name: 'type', type: "'email' | 'url' | 'number' | 'integer'", def: '—', desc: '內建格式' },
  { name: 'min / max', type: 'number', def: '—', desc: '字串與陣列看長度，數字看大小' },
  { name: 'pattern', type: 'RegExp', def: '—', desc: '正規式' },
  { name: 'validator', type: '(value, model) => true | string | Promise', def: '—', desc: '自訂（可 async、可跨欄位）' },
  { name: 'message', type: 'string', def: '—', desc: '錯誤訊息（不給時用預設訊息）' },
  { name: 'trigger', type: "'blur' | 'change'", def: "'blur'", desc: 'change：值一改變就檢查' },
]

// ---- ChptUpload ----
const uploadFiles = ref([])
const plainFiles = ref([])

/** 模擬上傳：每 150ms 前進一段；檔名含 fail 時在一半失敗 */
function fakeRequest(file, { onProgress, signal }) {
  return new Promise((resolve, reject) => {
    let p = 0
    const timer = setInterval(() => {
      p += 10 + Math.random() * 15
      onProgress(Math.min(p, 100))
      if (file.name.toLowerCase().includes('fail') && p >= 50) {
        clearInterval(timer)
        reject(new Error('伺服器回應 500'))
      } else if (p >= 100) {
        clearInterval(timer)
        resolve({ id: Date.now() })
      }
    }, 150)
    signal.addEventListener('abort', () => {
      clearInterval(timer)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })
}

const uploadSample = `<ChptUpload
  v-model="files"
  multiple
  accept=".pdf,.xlsx,image/*"
  :max-size="20 * 1024 * 1024"
  :max-count="5"
  :request="upload"
/>

// 用 fetch 或 axios 都可以；記得把 signal 傳下去，按取消才會真的中止
async function upload(file, { onProgress, signal }) {
  const body = new FormData()
  body.append('file', file)
  const res = await axios.post('/api/files', body, {
    signal,
    onUploadProgress: (e) => onProgress((e.loaded / (e.total ?? file.size)) * 100),
  })
  return res.data
}`

const uploadProps = [
  { name: 'modelValue', type: 'UploadFile[]', def: '[]', desc: '檔案清單：{ uid, name, size, status, percent?, error?, response?, raw? }' },
  { name: 'accept', type: 'string', def: "''", desc: '允許的類型（.xlsx、image/*、完整 MIME）' },
  { name: 'multiple', type: 'boolean', def: 'false', desc: '可多選；單選時新檔案取代舊的' },
  { name: 'maxSize / maxCount', type: 'number', def: '—', desc: '單檔大小上限（bytes）／清單上限' },
  { name: 'request', type: '(file, { onProgress, signal }) => Promise', def: '—', desc: '上傳函式；不給就只收集檔案' },
  { name: 'autoUpload', type: 'boolean', def: 'true', desc: '選好檔案立即上傳（false 時呼叫 submit()）' },
  { name: 'drag', type: 'boolean', def: 'true', desc: '拖放區；false 時只有一顆按鈕' },
  { name: 'label / buttonText / hint', type: 'string', def: '—', desc: '標籤／按鈕文字／說明（不給時依限制自動產生）' },
  { name: 'disabled / fullWidth', type: 'boolean', def: 'false / true', desc: '停用／全寬' },
]
const uploadEvents = [
  { name: 'update:modelValue', params: '(files)', desc: '清單變更（含進度更新）' },
  { name: 'add / remove', params: '(files) / (file)', desc: '加入通過檢查的檔案／移除' },
  { name: 'reject', params: '(file: File, reason)', desc: '被拒絕的檔案與原因' },
  { name: 'success / error', params: '(file, response | error)', desc: '上傳完成／失敗' },
]
const uploadMethods = [
  { name: 'submit', params: '() => Promise<boolean>', desc: '上傳所有還沒上傳（或失敗）的檔案' },
  { name: 'open', params: '()', desc: '開啟檔案選擇' },
  { name: 'addFiles', params: '(files: File[])', desc: '以程式加入（例如從剪貼簿貼上）' },
]
</script>
