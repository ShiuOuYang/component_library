<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">📷</span>
        <h1 class="text-4xl font-bold text-content-primary">ChptScanInput 條碼掃描輸入</h1>
      </div>
      <p class="text-content-secondary text-lg max-w-4xl">
        產線掃描站用：掃描槍掃一下就送出、清空、繼續掃下一個，不用碰滑鼠。分辨掃描槍與手打、擋重複、驗證格式、
        偵測中文輸入法，並以文字（螢幕閱讀器會念）、嗶聲、震動回饋。
      </p>
      <p class="mt-2 text-sm text-content-secondary">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptScanInput } from '@/components/library'</code>
      </p>
    </div>

    <section id="station" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">掃描站</h2>
      <p class="text-sm text-content-secondary mb-4">
        掃描槍就是一個「打字很快、最後按 Enter」的鍵盤，所以用按鍵速度分辨：平均每個字 40ms 以內（<code>scan-speed</code>）是掃描槍。
        手邊沒有掃描槍時，按「模擬掃描」會用掃描槍的速度把條碼打進輸入框；自己用鍵盤打再按 Enter，紀錄會標成「手動」。
      </p>
      <div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <ChptSwitch v-model="allowManual" label="接受手動輸入" />
        <ChptSwitch v-model="sound" label="嗶聲" />
        <label class="flex items-center gap-2 text-content-secondary">
          重複條碼
          <ChptSegmented v-model="duplicate" :options="duplicateOptions" size="xs" aria-label="重複條碼的處理" />
        </label>
      </div>
      <div class="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <ChptScanInput
          ref="station"
          label="序號"
          pattern="SN-\d{6}"
          transform="upper"
          :allow-manual="allowManual"
          :duplicate="duplicate"
          :sound="sound"
          show-history
          :max-history="8"
          @scan="onScan"
          @reject="onReject"
        />
        <div class="flex flex-col gap-2">
          <p class="text-xs text-content-secondary">模擬掃描（格式 SN-000000）：</p>
          <ChptButton v-for="code in sampleCodes" :key="code" size="sm" is-outline @click="simulate(code)">
            <span class="font-mono">{{ code }}</span>
          </ChptButton>
          <p class="mt-2 text-xs text-content-tertiary">已接受 {{ okCount }} 筆、拒絕 {{ rejectCount }} 筆</p>
        </div>
      </div>
      <ChptCodeBlock class="mt-6" :code="stationCode" />
    </section>

    <section id="global" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">全頁接收</h2>
      <p class="text-sm text-content-secondary mb-4">
        <code>capture-global</code>：焦點不在任何輸入框時（操作員點了別的地方、或根本沒點輸入框就掃），掃描槍的輸入也收得到。
        只攔「掃描槍速度」的按鍵 —— 人在頁面上按鍵、或焦點在其他輸入框時都不受影響。
        <code>keep-focus</code> 則是點到空白處時自動聚焦回來。
      </p>
      <div class="flex flex-wrap items-start gap-4">
        <div class="w-80">
          <ChptScanInput label="棧板條碼" capture-global :autofocus="false" duplicate="allow" @scan="lastGlobal = $event.value" />
        </div>
        <div class="flex flex-col gap-2 pt-6">
          <ChptButton size="sm" is-outline @click="simulateGlobal('PLT-20261119-07')">模擬：焦點不在輸入框時掃描</ChptButton>
          <p class="text-xs text-content-secondary" aria-live="polite">最後收到：<span class="font-mono">{{ lastGlobal || '—' }}</span></p>
        </div>
      </div>
      <ChptCodeBlock class="mt-6" :code="globalCode" />
    </section>

    <section id="tips" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">掃描站常見問題</h2>
      <ul class="list-disc space-y-2 pl-5 text-sm text-content-secondary">
        <li><strong>掃不進去、或只進來一半</strong>：多半是中文輸入法開著，掃描槍打的字被輸入法吃掉。元件偵測到組字時會提示「請切換為英數輸入」並送出 <code>ime-detected</code>。</li>
        <li><strong>掃描槍帶前綴碼</strong>（例如 AIM 識別碼 <code>]C1</code>）：用 <code>transform</code> 去掉，例如 <code>(v) =&gt; v.replace(/^\]C1/, '')</code>。</li>
        <li><strong>掃描槍以 Tab 結尾</strong>：<code>:submit-keys="['Enter', 'Tab']"</code>。Tab 只在有內容時攔下，空白時照常移動焦點。</li>
        <li><strong>藍牙掃描槍比較慢</strong>：調高 <code>scan-speed</code>（例如 60）。</li>
        <li><strong>手持裝置</strong>：<code>hide-keyboard</code> 不跳出螢幕鍵盤、<code>vibrate</code> 震動回饋；相機掃碼或 RFID 讀到的值用 ref 的 <code>submit(value)</code> 送入，走同樣的驗證與重複判斷。</li>
      </ul>
    </section>

    <section id="api" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-4">API</h2>
      <ApiTable of="ChptScanInput" title="Props" :rows="props" />
      <ApiTable of="ChptScanInput" title="Events" :rows="events" />
      <ApiTable of="ChptScanInput" title="方法（ref）" :rows="methods" />
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptButton, ChptCodeBlock, ChptScanInput, ChptSegmented, ChptSwitch } from '@/components/library'
import ApiTable from './_ApiTable.vue'

const station = ref(null)
const allowManual = ref(true)
const sound = ref(false)
const duplicate = ref('reject')
const duplicateOptions = [
  { label: '拒絕', value: 'reject' },
  { label: '警告', value: 'warn' },
  { label: '允許', value: 'allow' },
]
const sampleCodes = ['SN-260001', 'SN-260002', 'SN-260001', 'sn-260003', 'SN-26X']
const okCount = ref(0)
const rejectCount = ref(0)
const lastGlobal = ref('')

function onScan() {
  okCount.value++
}
function onReject() {
  rejectCount.value++
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 用掃描槍的速度（每字約 5ms）把條碼打進目前聚焦的元素，最後按 Enter */
async function typeLikeScanner(target, code) {
  for (const ch of code) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }))
    if (target instanceof HTMLInputElement) {
      target.value += ch
      target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }))
    }
    await wait(5)
  }
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
}

async function simulate(code) {
  const input = station.value?.$el.querySelector('input')
  if (!input) return
  input.focus()
  input.value = ''
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContent' }))
  await typeLikeScanner(input, code)
}

async function simulateGlobal(code) {
  document.activeElement?.blur?.()
  await typeLikeScanner(document.body, code)
}

const stationCode = `<!--
  pattern：整串比對（也可以給 RegExp 或 validator）
  allow-manual=false：只接受掃描槍
  duplicate：'allow' | 'warn' | 'reject'；duplicate-window 為 0 時整個紀錄期間都算重複
-->
<ChptScanInput
  label="序號"
  pattern="SN-\\d{6}"
  transform="upper"
  :allow-manual="false"
  duplicate="reject"
  :duplicate-window="0"
  sound
  show-history
  @scan="({ value, source }) => save(value)"
  @reject="({ reason, message }) => log(reason, message)"
/>`

const globalCode = `<!-- 焦點不在輸入框時也收得到；點到空白處自動聚焦回來 -->
<ChptScanInput capture-global keep-focus @scan="receive" />

<!-- 相機掃碼、RFID：走同樣的驗證與重複判斷 -->
scanInput.value.submit(code)`

const props = [
  { name: 'label / placeholder', type: 'string', def: "'' / 語系（繁中「掃描或輸入條碼」）", desc: '標籤與提示文字' },
  { name: 'size / disabled / fullWidth', type: "ComponentSize / boolean / boolean", def: "'md' / false / true", desc: '尺寸（可由 ChptConfigProvider 統一）、停用、全寬' },
  { name: 'autofocus', type: 'boolean', def: 'true', desc: '掛載時聚焦（掃描站通常要）' },
  { name: 'keepFocus', type: 'boolean', def: 'false', desc: '點到空白處失去焦點時自動聚焦回來；焦點移到其他可操作元素時不搶' },
  { name: 'captureGlobal', type: 'boolean', def: 'false', desc: '焦點不在任何輸入框時也接收掃描槍的輸入（只攔掃描槍速度的按鍵）' },
  { name: 'allowManual', type: 'boolean', def: 'true', desc: '接受手動輸入；false 時手打的內容會被拒絕' },
  { name: 'submitKeys', type: 'string[]', def: "['Enter']", desc: "送出的按鍵（掃描槍設定的結尾字元）；含 'Tab' 時只在有內容時攔下" },
  { name: 'scanSpeed', type: 'number', def: '40', desc: '平均按鍵間隔不超過這個值（ms）才算掃描槍；藍牙槍可調高' },
  { name: 'minLength', type: 'number', def: '1', desc: '條碼最短長度' },
  { name: 'pattern', type: 'RegExp | string | null', def: 'null', desc: '格式；字串時整串比對（自動加 ^…$）' },
  { name: 'validator', type: '(value) => true | string', def: 'null', desc: '自訂驗證；回傳字串為拒絕訊息' },
  { name: 'trim / transform', type: "boolean / 'upper' | 'lower' | (value) => string", def: 'true / null', desc: '去掉前後空白；統一大小寫或自訂轉換（去前綴碼）' },
  { name: 'duplicate / duplicateWindow', type: "'allow' | 'warn' | 'reject' / number", def: "'warn' / 0", desc: '重複條碼的處理；多久之內算重複（ms，0 為整個紀錄期間）' },
  { name: 'showHistory / maxHistory', type: 'boolean / number', def: 'false / 10', desc: '顯示最近的掃描紀錄（狀態、掃描或手動、時間）' },
  { name: 'sound / vibrate', type: 'boolean', def: 'false', desc: '嗶聲（成功一聲高音、失敗兩聲低音）與震動回饋' },
  { name: 'hideKeyboard', type: 'boolean', def: 'false', desc: '不跳出螢幕鍵盤（手持掃描器、平板）' },
  { name: 'showSubmit', type: 'boolean', def: 'false', desc: '顯示「送出」鈕（觸控裝置手動輸入）' },
  { name: 'errorText', type: 'string', def: "''", desc: '錯誤訊息（放在 ChptFormItem 裡時自動取驗證結果）' },
]
const events = [
  { name: 'scan', params: '(result: ScanResult)', desc: "接受的條碼：{ value, raw, source: 'scanner' | 'manual', status: 'ok' | 'duplicate', message, at }" },
  { name: 'reject', params: '(result: ScanResult)', desc: "拒絕的輸入；reason 為 'manual' | 'tooShort' | 'invalid' | 'duplicate'" },
  { name: 'ime-detected', params: '—', desc: '偵測到中文輸入法組字（掃描槍的輸入會被吃掉）' },
]
const methods = [
  { name: 'focus()', type: '() => void', desc: '聚焦輸入框' },
  { name: 'submit(value, source?)', type: "(string, 'scanner' | 'manual') => ScanResult | null", desc: '以程式送入一筆（相機掃碼、RFID），走同樣的驗證、重複判斷與回饋' },
  { name: 'clearHistory()', type: '() => void', desc: '清除紀錄（也重置重複判斷）' },
  { name: 'history', type: 'Ref<ScanResult[]>', desc: '最近的紀錄（最新在前）' },
]
</script>
