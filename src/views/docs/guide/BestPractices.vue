<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">✨</span>
        <h1 class="text-4xl font-bold text-neutral-900">最佳實踐</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        這頁記錄的不是理論，而是這個倉庫實際踩過、並已由 CI 守住的準則。
      </p>
    </div>

    <!-- ============ 設計令牌 ============ -->
    <section id="tokens" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">設計令牌是唯一真實來源</h2>
      <p class="text-sm text-neutral-600 mb-4">
        所有顏色 / 尺寸 / 圓角 / 動效都由 <code class="bg-neutral-100 px-1 py-0.5 rounded">src/design/tokens.js</code>
        定義，CSS 變數與 Tailwind utility 都是從它衍生的。
      </p>

      <div class="grid md:grid-cols-2 gap-4">
        <div class="rounded-lg border border-success-200 bg-success-50 p-4">
          <p class="text-sm font-semibold text-success-800 mb-2">✅ 這樣寫</p>
          <ChptCodeBlock language="css" :code="tokenGood" />
        </div>
        <div class="rounded-lg border border-danger-200 bg-danger-50 p-4">
          <p class="text-sm font-semibold text-danger-800 mb-2">❌ 不要這樣寫</p>
          <ChptCodeBlock language="css" :code="tokenBad" />
        </div>
      </div>

      <ChptAlert type="warning" class="mt-4">
        寫死色碼的代價是真實的：收斂前的 legacy 元件（FilterBar、FilterSelect 等）
        全部寫死 <code>gray-*</code> / <code>blue-*</code>，品牌色從綠改成藍時它們完全沒跟著變。
      </ChptAlert>
    </section>

    <!-- ============ 深色模式 ============ -->
    <section id="dark-mode" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">深色模式：優先用會自動翻轉的變數</h2>
      <p class="text-sm text-neutral-600 mb-4">
        文字 / 背景 / 邊框 / 圖表軸線的 CSS 變數會在 <code class="bg-neutral-100 px-1 py-0.5 rounded">.dark</code>
        下自動換值，不需要寫任何 <code class="bg-neutral-100 px-1 py-0.5 rounded">dark:</code>。
      </p>

      <ChptCodeBlock language="css" :code="darkGood" />

      <p class="text-sm text-neutral-600 mt-4 mb-2">
        只有<strong>需要換色階</strong>時才用 <code class="bg-neutral-100 px-1 py-0.5 rounded">dark:</code>
        —— 品牌色與語意色階不會翻轉，深色底下要改用較淺的階：
      </p>
      <ChptCodeBlock language="html" :code="darkShade" />

      <ApiTable title="會不會自動翻轉" :rows="darkTokenRows" />
    </section>

    <!-- ============ 無障礙 ============ -->
    <section id="a11y" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">無障礙：三個最容易踩的坑</h2>

      <h3 class="text-base font-semibold text-neutral-800 mt-5 mb-2">1. 不要只寫 focus:outline-none</h3>
      <p class="text-sm text-neutral-600 mb-3">
        它會蓋掉 <code class="bg-neutral-100 px-1 py-0.5 rounded">base.css</code> 的全域
        <code class="bg-neutral-100 px-1 py-0.5 rounded">:focus-visible</code> 外框，
        鍵盤使用者就完全看不到焦點在哪。必須同時提供替代樣式。
      </p>
      <ChptCodeBlock language="html" :code="focusCode" />

      <h3 class="text-base font-semibold text-neutral-800 mt-6 mb-2">2. 可點擊的東西要能用鍵盤操作</h3>
      <p class="text-sm text-neutral-600 mb-3">
        只掛 <code class="bg-neutral-100 px-1 py-0.5 rounded">@click</code> 的
        <code class="bg-neutral-100 px-1 py-0.5 rounded">div</code> /
        <code class="bg-neutral-100 px-1 py-0.5 rounded">span</code> /
        <code class="bg-neutral-100 px-1 py-0.5 rounded">th</code> 對鍵盤使用者等於不存在。
        能用 <code class="bg-neutral-100 px-1 py-0.5 rounded">&lt;button&gt;</code> 就用它；
        不能換標籤時（例如表格的 <code class="bg-neutral-100 px-1 py-0.5 rounded">th</code>）補上
        <code class="bg-neutral-100 px-1 py-0.5 rounded">tabindex</code> 與 keydown。
      </p>
      <ChptCodeBlock language="html" :code="keyboardCode" />
      <p class="text-xs text-neutral-500 mt-2">
        注意不要覆寫 <code>th</code> 的 role（例如改成 <code>button</code>），那會破壞表格語意。
      </p>

      <h3 class="text-base font-semibold text-neutral-800 mt-6 mb-2">3. 浮層一律用 useOverlay</h3>
      <p class="text-sm text-neutral-600 mb-3">
        焦點陷阱、焦點歸還、背景捲動鎖、Escape 只關最上層 —— 這四件事不要各自重寫。
        自己綁 <code class="bg-neutral-100 px-1 py-0.5 rounded">document</code> 的 keydown 會導致
        按一次 Escape 把所有開啟的浮層一起關掉。
      </p>
      <ChptCodeBlock language="ts" :code="overlayCode" />
      <ChptAlert type="warning" class="mt-3">
        <code>useOverlay</code> 內部的 watch 是 immediate 的，會立刻求值傳入的 getter。
        呼叫點必須放在它依賴的 <code>const</code> 宣告之後，否則會撞上 TDZ。
      </ChptAlert>
    </section>

    <!-- ============ 組件庫邊界 ============ -->
    <section id="boundary" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">組件庫邊界</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <code class="bg-neutral-100 px-1 py-0.5 rounded">src/components/library/</code>
        必須能整包複製到另一個專案而不需修改。
        <code class="bg-neutral-100 px-1 py-0.5 rounded">npm run check:boundary</code> 會擋下違規，CI 也會跑。
      </p>

      <ApiTable title="允許的相依" :rows="boundaryRows" />

      <p class="text-sm text-neutral-600 mt-5 mb-2">
        需要應用邏輯的元件一律以 props / emit 注入，不要在組件庫裡 import 應用程式的模組：
      </p>
      <ChptCodeBlock language="vue" :code="injectCode" />
    </section>

    <!-- ============ 相容層 ============ -->
    <section id="legacy" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">相容層只能轉發，不能實作</h2>
      <p class="text-sm text-neutral-600 mb-4">
        legacy 元件全部是薄包裝，只把 props / emits / slots 轉發給 canonical。
        <code class="bg-neutral-100 px-1 py-0.5 rounded">npm run check:legacy</code>
        會檢查行數上限並確認每一個都有 import 對應的 canonical。
      </p>
      <ChptAlert type="info">
        收斂前這些檔案合計 1830 行的重複邏輯，修一個 bug 要記得修兩邊。
        收斂後剩 455 行的轉發層。
      </ChptAlert>
      <p class="text-sm text-neutral-600 mt-4">
        新程式請直接用 canonical（<code>Chpt*</code>）。對照表見
        <a
          href="https://github.com/ShiuOuYang/component_library#legacy-對照表"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-600 hover:text-primary-700 underline"
        >README 的 Legacy 對照表</a>。
      </p>
    </section>

    <!-- ============ 常見錯誤 ============ -->
    <section id="pitfalls" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">這個倉庫實際踩過的坑</h2>
      <p class="text-sm text-neutral-600 mb-4">
        以下每一項都曾經真的存在於程式碼中。
      </p>
      <ApiTable title="" :rows="pitfallRows" />
    </section>
  </div>
</template>

<script setup>
/* eslint-disable no-useless-escape -- 範例字串裡的結束標籤必須跳脫，否則 SFC 解析器會把 script 區塊提前收尾 */
import { ChptAlert, ChptCodeBlock } from '@/components/library'
import ApiTable from '../components/_ApiTable.vue'

const tokenGood = `.panel {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
}`

const tokenBad = `.panel {
  color: #171717;
  background: #fafafa;
  border: 1px solid #d4d4d4;
}`

const darkGood = `/* 亮色深色都正確，不需要寫 dark: */
.panel {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
}`

const darkShade = `<span class="text-primary-600 dark:text-primary-400">連結</span>
<div class="bg-neutral-100 dark:bg-neutral-800">卡片</div>`

const focusCode = `<!-- ❌ 焦點完全看不見 -->
<button type="button" class="focus:outline-none">送出</button>

<!-- ✅ 有替代的焦點樣式 -->
<button type="button" class="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
  送出
</button>`

const keyboardCode = `<!-- ❌ 鍵盤使用者無法排序 -->
<th @click="sort(col)">{{ col.title }}</th>

<!-- ✅ 可聚焦、可用 Enter / Space、狀態以 aria-sort 表達 -->
<th
  scope="col"
  :aria-sort="ariaSortFor(col)"
  :tabindex="col.sortable ? 0 : undefined"
  @click="sort(col)"
  @keydown.enter.prevent="sort(col)"
  @keydown.space.prevent="sort(col)"
>
  {{ col.title }}
</th>`

const overlayCode = `import { useTemplateRef } from 'vue'
import { useOverlay } from '@/components/library'

const panelRef = useTemplateRef('panel')

// 放在 handleClose 等相依的 const 宣告之後
useOverlay(() => props.modelValue, panelRef, {
  onEscape: () => handleClose(),
  closeOnEscape: () => props.closable,
})`

const injectCode = `<script setup>
import { useAuth } from '@/composables/useAuth'
const { logout } = useAuth()
<\/script>

<template>
  <!-- 登出流程由使用端注入，元件只負責確認 → loading → 回報 -->
  <ChptHeaderLogoutButton :on-logout="logout" @error="toast.error('登出失敗')" />
</template>`

const darkTokenRows = [
  { name: '會自動翻轉', type: '--color-text-* / --color-bg-* / --color-border-* / --viz-axis-*', desc: '直接用，不需要寫 dark:' },
  { name: '不會翻轉', type: '--color-primary-* / --color-neutral-* / 語意色階 / --viz-cat-*', desc: '深色下需要換色階時用 dark: 指定較淺的階' },
]

const boundaryRows = [
  { name: '✅ npm 套件', type: 'vue / d3 / @vueuse/core / xlsx …', desc: '可以' },
  { name: '✅ library 內部', type: '@/components/library/… 或相對路徑', desc: '可以' },
  { name: '✅ 設計令牌', type: '@/design', desc: '設計令牌本身就是組件庫的一部分' },
  { name: '❌ 應用程式模組', type: '@/composables / @/stores / @/api / @/utils / @/router / @/views', desc: '不可以；改由 props 或 emit 注入' },
]

const pitfallRows = [
  { name: 'darkMode 沒設定', desc: "tailwind.config.js 少了 darkMode: 'class' 會落回 media，切換鈕按了完全沒反應" },
  { name: '設計令牌有兩份', desc: '根目錄 style/ 是 src/design 的過期副本，tokens.js 還是舊的品牌綠，而 README 卻連向它' },
  { name: 'lockfile 混用 registry', desc: 'package-lock.json 有 219 筆鎖在鏡像站，沒有該鏡像存取權的環境安裝直接卡死' },
  { name: 'Transition 沒有 appear', desc: '內層 Transition 的子元素沒有自己的 toggle 時，初次渲染不會動畫 —— scale-in / slide-in 從未播放過' },
  { name: 'computed 產生隨機 id', desc: 'computed(() => Math.random()) 值雖穩定，但 SSR 時伺服器與用戶端不一致；用 useId()' },
  { name: '宣告了卻不 emit 的事件', desc: 'ChptProgress 宣告 update:modelValue 卻從未 emit，等於對外承諾一個不存在的雙向綁定' },
  { name: '裸表達式做依賴收集', desc: 'watchEffect 裡寫 foo.value; 靜態分析無法分辨是否為筆誤；集中成一個陣列' },
  { name: '把 Node 套件 import 進瀏覽器', desc: "useWebSocket.js 曾 import { on } from 'ws'" },
]
</script>
