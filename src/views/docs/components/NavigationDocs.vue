<template>
  <div class="w-full px-8 py-12">
    <div class="mb-10">
      <h1 class="text-4xl font-bold text-content-primary mb-3">導覽元件</h1>
      <p class="text-lg text-content-secondary">
        ChptMenu（側欄 / 頂部選單）、ChptAnchor（頁內目錄）、ChptBackTop（回到頂端）。
      </p>
    </div>

    <!-- ============ ChptMenu ============ -->
    <section id="chpt-menu" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptMenu 導覽選單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>整個系統的側欄（可收合成只剩圖示）或頂部選單。一組「動作」請用 ChptDropdown；頁內切換請用 ChptTabs。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptMenu } from '@/components/library'</code>
      </p>

      <div class="bg-surface-secondary rounded-lg p-4 flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <ChptSwitch v-model="collapsed" label="收合側欄" />
          <span class="text-sm text-content-secondary">作用中：<span class="font-mono">{{ active }}</span></span>
        </div>
        <div class="flex flex-col gap-4 md:flex-row">
          <div class="h-[26rem] self-start overflow-visible rounded-lg border border-stroke-light">
            <ChptMenu v-model="active" :items="sideItems" :collapsed="collapsed" aria-label="示範側欄" class="h-full rounded-lg" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="rounded-lg border border-stroke-light">
              <ChptMenu v-model="active" :items="topItems" mode="horizontal" aria-label="示範頂部選單" class="rounded-lg" />
            </div>
            <p class="mt-3 text-sm text-content-tertiary">
              水平選單與收合側欄的子選單是浮出面板：Escape 關閉並回到按鈕、焦點離開或點外面也會關。
            </p>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="menuSample" />
      </div>
      <ApiTable of="ChptMenu" title="Props" :rows="menuProps" />
      <ApiTable of="-" title="MenuItem" :rows="menuItemProps" />
      <ApiTable of="ChptMenu" title="Events" :rows="menuEvents" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>照 WAI-ARIA 的 disclosure navigation，<strong>不是</strong> role="menu" —— 網站導覽用清單 + 連結，
        螢幕閱讀器才會用平常的方式瀏覽、每個連結都能 Tab 到。有 <code>to</code> / <code>href</code> 的項目是真正的 &lt;a&gt;（可中鍵開新分頁），
        作用中的頁面帶 aria-current="page"；沒有 v-model 時依目前路由自動比對。
      </p>
    </section>

    <!-- ============ ChptAnchor ============ -->
    <section id="chpt-anchor" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptAnchor 頁內目錄</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>長頁面旁的「本頁內容」—— 規格書、SOP、報表說明。點了捲到該段，捲動時自動標示讀到哪裡。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptAnchor } from '@/components/library'</code>
      </p>

      <div class="bg-surface-secondary rounded-lg p-4 flex gap-6">
        <div id="anchor-demo" tabindex="0" class="focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus h-72 flex-1 overflow-y-auto rounded-lg border border-stroke-light bg-surface-primary px-5">
          <section v-for="s in sopSections" :id="s.id" :key="s.id" class="py-5">
            <h3 class="mb-2 font-semibold text-content-primary">{{ s.title }}</h3>
            <p v-for="n in s.paragraphs" :key="n" class="mb-2 text-sm leading-relaxed text-content-secondary">
              {{ s.title }}的說明內容第 {{ n }} 段。作業前確認治具、鋼板版次與錫膏批號，並於系統中完成首件檢驗紀錄。
            </p>
          </section>
        </div>
        <ChptAnchor :items="anchorItems" container="#anchor-demo" title="SOP 目錄" :update-hash="false" class="w-44 shrink-0" />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="anchorSample" />
      </div>
      <ApiTable of="ChptAnchor" title="Props" :rows="anchorProps" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>捲動容器會自動偵測（第一個區塊實際在捲的祖先）—— 內容區是 overflow: auto 的後台版面也能用。
        點連結後焦點移到該區塊，鍵盤使用者接著 Tab 會從那裡繼續；目前區塊以 aria-current="location" 標示。
      </p>
    </section>

    <!-- ============ ChptBackTop ============ -->
    <section id="chpt-backtop" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptBackTop 回到頂端</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>很長的清單或報表頁。捲超過一定距離才出現在右下角 —— 這一頁往下捲就看得到。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptBackTop } from '@/components/library'</code>
      </p>
      <ChptCodeBlock :code="backTopSample" />
      <ApiTable of="ChptBackTop" title="Props" :rows="backTopProps" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>回到頂端後焦點移到容器最上面的標題 —— 否則按鈕消失、焦點掉回 &lt;body&gt;。
        使用者設定「減少動態效果」時直接跳到頂端、不做平滑捲動。
      </p>
    </section>

    <section id="chpt-command-palette" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptCommandPalette 指令面板</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>系統頁面一多，選單要點好幾層才找得到。按 <kbd class="rounded border border-stroke-default px-1 text-xs">Ctrl</kbd> /
        <kbd class="rounded border border-stroke-default px-1 text-xs">⌘</kbd> + <kbd class="rounded border border-stroke-default px-1 text-xs">K</kbd>
        打幾個字就跳到頁面或執行動作。這個文件站本身就有一個 —— 現在按按看，側欄的每一頁、每個元件都搜得到。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptCommandPalette } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light flex flex-wrap items-center gap-3">
        <ChptButton @click="mesPaletteOpen = true">開啟 MES 指令面板</ChptButton>
        <span class="text-sm text-content-secondary" aria-live="polite">{{ mesPaletteResult || '試著搜尋「gd」「spc」「停機」或「急件」' }}</span>
        <ChptCommandPalette v-model="mesPaletteOpen" :commands="mesCommands" :hotkey="false" recent-key="docs-mes" @select="(c) => (mesPaletteResult = `已執行：${c.label}`)" />
      </div>
      <div class="mt-6">
        <ChptCodeBlock :code="paletteSample" />
      </div>
      <ApiTable of="ChptCommandPalette" title="Props" :rows="paletteProps" />
      <ApiTable of="-" title="CommandItem（commands 的每一筆）" :rows="commandItemRows" />
      <ApiTable of="ChptCommandPalette" title="Events" :rows="paletteEvents" />
      <ApiTable of="ChptCommandPalette" title="Slots" :rows="paletteSlots" />
      <ApiTable of="ChptCommandPalette" title="方法（ref）" :rows="paletteMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>搜尋規則：</strong>不分大小寫的模糊比對；整段相符 &gt; 開頭相符 &gt; 從詞首開始相符 &gt; 縮寫（dm → dark mode）&gt; 中間相符。
        標籤最重要，其次是 keywords（放英文代號、拼音、舊名稱）、群組與說明；以空白分開的多個詞要全部找到。
        <strong>無障礙：</strong>搜尋框是 combobox，結果以 aria-activedescendant 指向，結果數以 aria-live 念出；關閉後焦點回到開啟前的位置。
      </p>
    </section>

    <ChptBackTop :visibility-height="300" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptMenu, ChptAnchor, ChptBackTop, ChptSwitch, ChptCodeBlock, ChptButton, ChptCommandPalette } from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- CommandPalette ----
const mesPaletteOpen = ref(false)
const mesPaletteResult = ref('')
const mesCommands = [
  { id: 'wo', label: '工單查詢', group: '生產', icon: 'assignment', keywords: ['gongdan', 'work order', 'WO'] },
  { id: 'report', label: '報工', group: '生產', icon: 'edit_note', keywords: ['baogong'], shortcut: 'mod+r' },
  { id: 'downtime', label: '停機登錄', group: '生產', icon: 'pause_circle', keywords: ['tingji', 'downtime'] },
  { id: 'rush', label: '急件看板', group: '生產', icon: 'priority_high', description: '交期 3 天內的工單' },
  { id: 'spc', label: 'SPC 管制圖', group: '品質', icon: 'monitoring', keywords: ['control chart'] },
  { id: 'iqc', label: '進料檢驗', group: '品質', icon: 'inventory', keywords: ['IQC'] },
  { id: 'yield', label: '良率分析', group: '品質', icon: 'analytics', keywords: ['yield', 'liangly'] },
  { id: 'export', label: '匯出今日報表', group: '動作', icon: 'download', shortcut: 'mod+shift+e' },
  { id: 'logout', label: '登出', group: '動作', icon: 'logout', disabled: true, description: '示範：停用的指令' },
]
const paletteSample = `<ChptCommandPalette v-model="open" :commands="commands" recent-key="mes" />

const commands = [
  // to：有 vue-router 時切換頁面
  { id: 'wo', label: '工單查詢', group: '生產', icon: 'assignment', to: '/wo', keywords: ['gongdan', 'WO'] },
  { id: 'spc', label: 'SPC 管制圖', group: '品質', icon: 'monitoring', to: '/spc' },
  // perform：執行動作；shortcut 只是顯示（要自己綁）
  { id: 'export', label: '匯出今日報表', group: '動作', shortcut: 'mod+shift+e', perform: exportToday },
]
// 預設綁 Ctrl / ⌘ + K；hotkey="ctrl+shift+p" 換鍵、:hotkey="false" 不綁`
const paletteProps = [
  { name: 'modelValue', type: 'boolean', def: 'false', desc: '是否開啟（v-model）' },
  { name: 'commands', type: 'CommandItem[]', def: '—', desc: '指令清單（見下表）' },
  { name: 'hotkey', type: 'string | false', def: "'mod+k'", desc: '全域快捷鍵（mod = Mac 的 ⌘、其他平台的 Ctrl）；false 為不綁' },
  { name: 'placeholder / emptyText / title', type: 'string', def: '語系', desc: '搜尋框提示、沒有結果時的文字、對話框名稱' },
  { name: 'recentKey', type: 'string', def: '—', desc: '記住最近使用的指令（localStorage 鍵 chpt-command:{recentKey}），沒輸入時列在最上面' },
  { name: 'maxRecent / maxResults', type: 'number', def: '5 / 50', desc: '最近使用、搜尋結果最多列幾個' },
]
const commandItemRows = [
  { name: 'id / label', type: 'string', def: '—', desc: '唯一鍵；顯示的名稱（搜尋最重要的欄位）' },
  { name: 'group / description', type: 'string', def: '—', desc: '分組（沒輸入時依此分組，搜尋時顯示在右側）；第二行說明' },
  { name: 'keywords', type: 'string[]', def: '—', desc: '額外的搜尋字：英文代號、拼音、舊名稱…' },
  { name: 'icon / shortcut', type: 'string', def: '—', desc: 'Material Symbols 圖示；顯示用的快捷鍵（例如 mod+s，只顯示不綁定）' },
  { name: 'to / perform', type: 'string / () => void | Promise', def: '—', desc: '切換到路由（需要 vue-router）；執行的動作' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '停用（方向鍵跳過、點了沒反應）' },
]
const paletteEvents = [
  { name: 'update:modelValue', params: '(open: boolean)', desc: '開關' },
  { name: 'select', params: '(item: CommandItem)', desc: '執行了一個指令（在 perform / 切換頁面之前送出）' },
]
const paletteSlots = [{ name: 'empty', params: '{ query }', desc: '沒有結果時的內容' }]
const paletteMethods = [{ name: 'open() / close() / toggle()', type: '() => void', desc: '以程式開關' }]

// ---- Menu ----
const active = ref('orders')
const collapsed = ref(false)
const sideItems = [
  { key: 'dashboard', label: '總覽', icon: 'dashboard' },
  {
    key: 'production',
    label: '生產管理',
    icon: 'factory',
    children: [
      { key: 'orders', label: '工單', badge: 12 },
      { key: 'report', label: '報工' },
      { key: 'lines', label: '產線', children: [{ key: 'smt', label: 'SMT' }, { key: 'aoi', label: 'AOI' }] },
    ],
  },
  { key: 'quality', label: '品質', icon: 'verified', children: [{ key: 'iqc', label: '進料檢驗' }, { key: 'spc', label: 'SPC 管制圖' }] },
  { key: 'd1', type: 'divider' },
  {
    key: 'g-system',
    type: 'group',
    label: '系統',
    children: [
      { key: 'users', label: '使用者', icon: 'group' },
      { key: 'audit', label: '稽核紀錄', icon: 'lock', disabled: true },
      { key: 'help', label: '說明文件', icon: 'help', href: '#chpt-menu' },
    ],
  },
]
const topItems = [
  { key: 'dashboard', label: '總覽' },
  {
    key: 'production',
    label: '生產管理',
    children: [
      { key: 'orders', label: '工單' },
      { key: 'report', label: '報工' },
      { key: 'lines', label: '產線', children: [{ key: 'smt', label: 'SMT' }, { key: 'aoi', label: 'AOI' }] },
    ],
  },
  { key: 'quality', label: '品質', children: [{ key: 'iqc', label: '進料檢驗' }, { key: 'spc', label: 'SPC 管制圖' }] },
  { key: 'users', label: '使用者' },
]
const menuSample = `<!-- 側欄：有 vue-router 時依目前路由自動標示作用中項目 -->
<ChptMenu :items="items" :collapsed="collapsed" aria-label="主選單" />

<!-- 頂部選單 -->
<ChptMenu v-model="active" :items="items" mode="horizontal" />

const items = [
  { key: 'dashboard', label: '總覽', icon: 'dashboard', to: '/' },
  { key: 'prod', label: '生產管理', icon: 'factory', children: [
    { key: 'orders', label: '工單', to: '/orders', badge: 12 },
  ] },
  { key: 'd1', type: 'divider' },
  { key: 'g', type: 'group', label: '系統', children: [
    { key: 'users', label: '使用者', icon: 'group', to: '/users' },
  ] },
]`
const menuProps = [
  { name: 'items', type: 'MenuItem[]', def: '—', desc: '選單項目（見下表）' },
  { name: 'modelValue', type: 'Key | null', def: '—', desc: '作用中的項目（v-model）；不綁時依路由比對 item.to（取最長前綴）' },
  { name: 'openKeys', type: 'Key[]', def: '—', desc: '內嵌模式展開中的子選單（v-model:openKeys）' },
  { name: 'mode', type: "'vertical' | 'horizontal'", def: "'vertical'", desc: '側欄或頂部列' },
  { name: 'collapsed', type: 'boolean', def: 'false', desc: '側欄收合成只剩圖示（子選單改為浮出）' },
  { name: 'accordion', type: 'boolean', def: 'false', desc: '同一層只展開一個子選單' },
  { name: 'indent / width', type: 'number / string', def: "16 / '15rem'", desc: '每層縮排（px）／側欄寬度' },
  { name: 'ariaLabel', type: 'string', def: "'主選單'", desc: '<nav> 的名稱（同頁有多個導覽區時要能區分）' },
]
const menuItemProps = [
  { name: 'key / label / icon', type: 'Key / string / string', def: '—', desc: '識別值、文字、Material Symbols 圖示' },
  { name: 'to / href / target', type: 'string', def: '—', desc: '站內路徑（有 router 時用 router.push）或一般連結' },
  { name: 'children', type: 'MenuItem[]', def: '—', desc: '子選單' },
  { name: 'type', type: "'group' | 'divider'", def: '—', desc: '分組標題（children 列在下面）／分隔線' },
  { name: 'badge / disabled', type: 'string | number / boolean', def: '—', desc: '徽章／停用' },
]
const menuEvents = [
  { name: 'update:modelValue / select', params: '(key) / (item)', desc: '點了葉節點' },
  { name: 'update:openKeys', params: '(keys)', desc: '內嵌模式的展開變更' },
  { name: 'ref: open(key) / close(key) / closeAll()', params: '—', desc: '程式控制展開' },
]

// ---- Anchor ----
const sopSections = [
  { id: 'sop-prepare', title: '一、作業準備', paragraphs: 3 },
  { id: 'sop-print', title: '二、錫膏印刷', paragraphs: 4 },
  { id: 'sop-print-check', title: '　2.1 印刷檢查', paragraphs: 2 },
  { id: 'sop-place', title: '三、零件置放', paragraphs: 4 },
  { id: 'sop-reflow', title: '四、迴焊', paragraphs: 3 },
  { id: 'sop-inspect', title: '五、AOI 檢驗', paragraphs: 2 },
]
const anchorItems = [
  { href: '#sop-prepare', title: '作業準備' },
  { href: '#sop-print', title: '錫膏印刷', children: [{ href: '#sop-print-check', title: '印刷檢查' }] },
  { href: '#sop-place', title: '零件置放' },
  { href: '#sop-reflow', title: '迴焊' },
  { href: '#sop-inspect', title: 'AOI 檢驗' },
]
const anchorSample = `<ChptAnchor :items="toc" :offset="64" title="本頁內容" />

const toc = [
  { href: '#prepare', title: '作業準備' },
  { href: '#print', title: '錫膏印刷', children: [{ href: '#print-check', title: '印刷檢查' }] },
]`
const anchorProps = [
  { name: 'items', type: '{ href, title, children? }[]', def: '—', desc: "href 是 '#區塊id'" },
  { name: 'container', type: 'string | HTMLElement', def: '自動偵測', desc: '捲動容器' },
  { name: 'offset', type: 'number', def: '16', desc: '頂部固定列的高度（px）' },
  { name: 'title / ariaLabel', type: 'string', def: "'' / '本頁內容'", desc: '小標題／<nav> 名稱' },
  { name: 'updateHash', type: 'boolean', def: 'true', desc: '點擊時更新網址 #hash（replaceState）' },
  { name: 'Events', type: 'change(href) / click(href)', def: '—', desc: '目前區塊改變／點擊' },
]

// ---- BackTop ----
const backTopSample = `<ChptBackTop />
<ChptBackTop target="#report-body" :visibility-height="600" :right="32" />`
const backTopProps = [
  { name: 'target', type: 'string | HTMLElement', def: '自動偵測', desc: '捲動容器' },
  { name: 'visibilityHeight', type: 'number', def: '400', desc: '捲超過多少 px 才出現' },
  { name: 'right / bottom', type: 'number', def: '24 / 24', desc: '距離右下角（px）' },
  { name: 'label', type: 'string', def: "'回到頂端'", desc: '按鈕名稱' },
  { name: '#default', type: 'slot', def: '—', desc: '自訂按鈕內容' },
  { name: '@click', type: 'event', def: '—', desc: '按下回到頂端時' },
]
</script>
