<template>
  <div class="w-full px-8 py-12">
    <div class="mb-10">
      <h1 class="text-4xl font-bold text-content-primary mb-3">導覽元件</h1>
      <p class="text-lg text-content-secondary">
        ChptMenu（側欄 / 頂部選單）、ChptAnchor（頁內目錄）、ChptBackTop（回到頂端）。
      </p>
    </div>

    <!-- ============ ChptMenu ============ -->
    <section id="chpt-menu" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
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
        <div class="flex gap-4">
          <div class="h-[26rem] overflow-visible rounded-lg border border-stroke-light">
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
      <ApiTable title="Props" :rows="menuProps" />
      <ApiTable title="MenuItem" :rows="menuItemProps" />
      <ApiTable title="Events" :rows="menuEvents" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>照 WAI-ARIA 的 disclosure navigation，<strong>不是</strong> role="menu" —— 網站導覽用清單 + 連結，
        螢幕閱讀器才會用平常的方式瀏覽、每個連結都能 Tab 到。有 <code>to</code> / <code>href</code> 的項目是真正的 &lt;a&gt;（可中鍵開新分頁），
        作用中的頁面帶 aria-current="page"；沒有 v-model 時依目前路由自動比對。
      </p>
    </section>

    <!-- ============ ChptAnchor ============ -->
    <section id="chpt-anchor" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
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
      <ApiTable title="Props" :rows="anchorProps" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>捲動容器會自動偵測（第一個區塊實際在捲的祖先）—— 內容區是 overflow: auto 的後台版面也能用。
        點連結後焦點移到該區塊，鍵盤使用者接著 Tab 會從那裡繼續；目前區塊以 aria-current="location" 標示。
      </p>
    </section>

    <!-- ============ ChptBackTop ============ -->
    <section id="chpt-backtop" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptBackTop 回到頂端</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>很長的清單或報表頁。捲超過一定距離才出現在右下角 —— 這一頁往下捲就看得到。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptBackTop } from '@/components/library'</code>
      </p>
      <ChptCodeBlock :code="backTopSample" />
      <ApiTable title="Props" :rows="backTopProps" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>回到頂端後焦點移到容器最上面的標題 —— 否則按鈕消失、焦點掉回 &lt;body&gt;。
        使用者設定「減少動態效果」時直接跳到頂端、不做平滑捲動。
      </p>
    </section>

    <ChptBackTop :visibility-height="300" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptMenu, ChptAnchor, ChptBackTop, ChptSwitch, ChptCodeBlock } from '@/components/library'
import ApiTable from './_ApiTable.vue'

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
]
</script>
