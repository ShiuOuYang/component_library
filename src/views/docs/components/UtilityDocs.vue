<template>
  <div class="w-full px-8 py-12">
    <div class="mb-10">
      <h1 class="text-4xl font-bold text-content-primary mb-3">版面與實用元件</h1>
      <p class="text-lg text-content-secondary">
        Splitter、VirtualList、Affix、Carousel，以及複製、截斷文字、倒數、浮水印這類小工具。
      </p>
    </div>

    <!-- ============ ChptSplitter ============ -->
    <section id="chpt-splitter" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptSplitter 分割面板</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>左邊清單 / 右邊明細、上面圖表 / 下面資料表，讓使用者自己決定比例。
        分隔線可以拖，也可以 Tab 到之後用方向鍵調整（每次 step%，按住 Shift 為 10 倍）、Enter 收合 / 還原。
      </p>
      <div class="h-64 overflow-hidden rounded-lg border border-stroke-light">
        <ChptSplitter v-model="split" aria-label="工單清單與明細" :min="20" :max="80">
          <template #start>
            <ul class="divide-y divide-stroke-light text-sm">
              <li v-for="o in orders" :key="o" class="px-3 py-2 text-content-primary">{{ o }}</li>
            </ul>
          </template>
          <template #end>
            <div class="p-4 text-sm text-content-secondary">左側佔 <span class="font-mono text-content-primary">{{ split }}%</span>。這裡放工單明細。</div>
          </template>
        </ChptSplitter>
      </div>
      <ChptCodeBlock class="mt-6" :code="splitterSample" />
      <ApiTable title="Props / Events" :rows="splitterProps" />
    </section>

    <!-- ============ ChptVirtualList ============ -->
    <section id="chpt-virtuallist" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptVirtualList 虛擬捲動清單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>上萬筆的清單（序號、Log）。只畫看得到的幾十列，捲起來一樣順；
        捲到底送出 reach-bottom，可以接「載入下一頁」。
      </p>
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <span class="text-sm text-content-secondary">共 <span class="font-mono">{{ serials.length.toLocaleString() }}</span> 筆</span>
        <ChptButton size="sm" is-outline @click="list?.scrollToIndex(5000, 'center')">跳到第 5,001 筆</ChptButton>
      </div>
      <div class="rounded-lg border border-stroke-light">
        <ChptVirtualList ref="list" :items="serials" :item-height="36" height="18rem" key-field="sn" aria-label="序號" :loading="loadingMore" @reach-bottom="loadMore">
          <template #default="{ item, index }">
            <div class="flex h-full items-center gap-3 border-b border-stroke-light px-3 text-sm">
              <span class="w-16 text-right font-mono text-content-tertiary">{{ index + 1 }}</span>
              <span class="font-mono text-content-primary">{{ item.sn }}</span>
              <ChptTag :label="item.ok ? 'PASS' : 'NG'" :color="item.ok ? 'success' : 'danger'" size="xs" class="ml-auto" />
            </div>
          </template>
        </ChptVirtualList>
      </div>
      <ChptCodeBlock class="mt-6" :code="virtualSample" />
      <ApiTable title="Props / Events" :rows="virtualProps" />
      <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>每列必須同高（itemHeight）。只有畫出來的列在 DOM 裡，所以每列帶
        aria-setsize / aria-posinset，螢幕閱讀器會唸「第 1,234 項，共 10,000 項」。</p>
    </section>

    <!-- ============ ChptAffix ============ -->
    <section id="chpt-affix" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptAffix 捲動時固定</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>工具列、篩選列在捲下去時貼在頂端。用 CSS sticky 實作，不會讓下面的內容跳動；
        貼住時可以加陰影（affixedClass）。
      </p>
      <div class="h-64 overflow-y-auto rounded-lg border border-stroke-light">
        <p class="p-4 text-sm text-content-tertiary">往下捲 ↓</p>
        <ChptAffix affixed-class="shadow-md" @change="affixed = $event">
          <div class="flex items-center gap-2 border-y border-stroke-light bg-surface-primary px-4 py-2 text-sm">
            <span class="font-medium text-content-primary">篩選列</span>
            <ChptTag :label="affixed ? '已貼住' : '一般'" :color="affixed ? 'primary' : 'secondary'" size="xs" />
          </div>
        </ChptAffix>
        <p v-for="n in 20" :key="n" class="px-4 py-2 text-sm text-content-secondary">第 {{ n }} 筆資料</p>
      </div>
      <ChptCodeBlock class="mt-6" :code="affixSample" />
      <ApiTable title="Props / Events" :rows="affixProps" />
    </section>

    <!-- ============ ChptCarousel ============ -->
    <section id="chpt-carousel" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptCarousel 輪播</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>看板首頁的公告、產線畫面輪播。自動播放時左上角有暫停鈕，滑鼠停留或焦點在裡面時自動暫停。
      </p>
      <ChptCarousel :items="notices" aria-label="廠區公告" autoplay :interval="4000" height="12rem">
        <template #default="{ item }">
          <div class="flex h-full flex-col justify-center gap-2 px-16" :class="item.tone">
            <p class="text-xs font-medium uppercase tracking-wide opacity-80">{{ item.tag }}</p>
            <p class="text-xl font-semibold">{{ item.title }}</p>
            <p class="text-sm opacity-90">{{ item.body }}</p>
          </div>
        </template>
      </ChptCarousel>
      <ChptCodeBlock class="mt-6" :code="carouselSample" />
      <ApiTable title="Props" :rows="carouselProps" />
      <p class="text-sm text-content-secondary mt-4"><strong>注意：</strong>照 WAI-ARIA carousel：自動輪播時 aria-live="off"（不會每幾秒打斷報讀），
        看不到的那幾張設為 inert（Tab 不會跑進去）。使用者設定「減少動態效果」時不自動播放。</p>
    </section>

    <!-- ============ 小工具 ============ -->
    <section id="chpt-small-utils" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-4">小工具：CopyButton / Ellipsis / Countdown / Watermark</h2>

      <div class="grid gap-6 lg:grid-cols-2">
        <div id="chpt-copybutton" class="rounded-lg border border-stroke-light p-4 scroll-mt-24">
          <h3 class="mb-2 font-semibold text-content-primary">ChptCopyButton 複製</h3>
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-mono text-content-primary">WO-2026-0917</span>
            <ChptCopyButton text="WO-2026-0917" subject="工單號" />
            <ChptCopyButton text="SN-8837-2201" label="複製序號" />
          </div>
          <p class="mt-2 text-xs text-content-tertiary">按下後變勾勾 2 秒並報讀「已複製」；clipboard API 被擋時退回舊方法。</p>
        </div>

        <div id="chpt-ellipsis" class="rounded-lg border border-stroke-light p-4 scroll-mt-24">
          <h3 class="mb-2 font-semibold text-content-primary">ChptEllipsis 截斷文字</h3>
          <ChptEllipsis :text="longText" :lines="2" expandable block class="text-sm text-content-secondary" />
          <p class="mt-2 text-xs text-content-tertiary">只有真的被截斷時才出現「展開」與 title 提示（量測判斷，不是看字數）。</p>
        </div>

        <div id="chpt-countdown" class="rounded-lg border border-stroke-light p-4 scroll-mt-24">
          <h3 class="mb-2 font-semibold text-content-primary">ChptCountdown 倒數</h3>
          <div class="flex flex-wrap gap-8">
            <ChptCountdown :value="maintenanceAt" title="距離定期保養" format="D 天 HH:mm:ss" />
            <ChptCountdown :value="changeoverAt" title="換線倒數" format="mm:ss" :warning-threshold="60_000" />
          </div>
          <p class="mt-2 text-xs text-content-tertiary">以目標時間計算：分頁在背景或電腦休眠後回來，時間仍然正確。</p>
        </div>

        <div id="chpt-watermark" class="rounded-lg border border-stroke-light p-4 scroll-mt-24">
          <h3 class="mb-2 font-semibold text-content-primary">ChptWatermark 浮水印</h3>
          <ChptWatermark :content="['王小明 (A12345)', '2026-09-28 機密']">
            <div class="h-32 rounded bg-surface-secondary p-3 text-sm text-content-secondary">
              內部良率報表：本週綜合良率 98.26%，較上週 +0.35%。浮水印不會擋住點擊與選取文字。
            </div>
          </ChptWatermark>
        </div>
      </div>

      <ChptCodeBlock class="mt-6" :code="smallUtilsSample" />
      <ApiTable title="Props" :rows="smallUtilsProps" />
    </section>

    <!-- ============ ChptSpace ============ -->
    <section id="chpt-space" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptSpace 間距</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>一排按鈕、一組標籤、表單下方的動作列。間距用同一組尺度（xs 4 / sm 8 / md 16 / lg 24px），
        取代到處手寫的 <code>flex gap-*</code>；<code>#split</code> 插槽在項目之間自動插分隔。
      </p>
      <div class="space-y-4 rounded-lg border border-stroke-light p-4">
        <ChptSpace>
          <ChptButton size="sm">儲存</ChptButton>
          <ChptButton size="sm" is-outline>取消</ChptButton>
          <ChptButton v-if="false" size="sm">不會出現（也不會多一個間距）</ChptButton>
        </ChptSpace>
        <ChptSpace size="xs">
          <template #split><span class="text-content-disabled">|</span></template>
          <a href="#chpt-space" class="text-sm text-accent hover:underline">編輯</a>
          <a href="#chpt-space" class="text-sm text-accent hover:underline">複製</a>
          <a href="#chpt-space" class="text-sm text-danger hover:underline">刪除</a>
        </ChptSpace>
        <ChptSpace wrap :size="['sm', 'xs']">
          <ChptTag v-for="t in spaceTags" :key="t" :label="t" size="sm" />
        </ChptSpace>
      </div>
      <ChptCodeBlock class="mt-6" :code="spaceSample" />
      <ApiTable title="Props / Slots" :rows="spaceProps" />
    </section>

  </div>
</template>

<script setup>
import { ref, useTemplateRef } from 'vue'
import {
  ChptSplitter,
  ChptVirtualList,
  ChptAffix,
  ChptCarousel,
  ChptCopyButton,
  ChptEllipsis,
  ChptCountdown,
  ChptWatermark,
  ChptButton,
  ChptTag,
  ChptCodeBlock,
  ChptSpace,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- Splitter ----
const split = ref(35)
const orders = Array.from({ length: 12 }, (_, i) => `WO-2026-${String(900 + i).padStart(4, '0')}`)
const splitterSample = `<ChptSplitter v-model="size" aria-label="工單清單與明細" :min="20" :max="80">
  <template #start><OrderList /></template>
  <template #end><OrderDetail /></template>
</ChptSplitter>`
const splitterProps = [
  { name: 'modelValue', type: 'number', def: '50', desc: '第一個面板的百分比（v-model）' },
  { name: 'direction', type: "'horizontal' | 'vertical'", def: "'horizontal'", desc: '左右 / 上下' },
  { name: 'min / max / step', type: 'number', def: '10 / 90 / 2', desc: '範圍與鍵盤每次調整量' },
  { name: 'ariaLabel', type: 'string', def: "'調整面板大小'", desc: '分隔線的名稱（說明它分開什麼）' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '停用' },
  { name: 'resize-end', type: 'event (value)', def: '—', desc: '拖曳放開 / 鍵盤調整後送出（適合存偏好）' },
]

// ---- VirtualList ----
const list = useTemplateRef('list')
function makeSerials(from, n) {
  return Array.from({ length: n }, (_, i) => ({ sn: `SN-${String(from + i).padStart(6, '0')}`, ok: (from + i) % 37 !== 0 }))
}
const serials = ref(makeSerials(0, 10_000))
const loadingMore = ref(false)
function loadMore() {
  loadingMore.value = true
  setTimeout(() => {
    serials.value = [...serials.value, ...makeSerials(serials.value.length, 1000)]
    loadingMore.value = false
  }, 600)
}
const virtualSample = `<ChptVirtualList :items="rows" :item-height="36" height="18rem" key-field="sn" @reach-bottom="loadMore">
  <template #default="{ item, index }">…</template>
</ChptVirtualList>

listRef.value.scrollToIndex(5000, 'center')`
const virtualProps = [
  { name: 'items / itemHeight', type: 'T[] / number', def: '—', desc: '資料與每列高度（px，必須固定）' },
  { name: 'height', type: 'string', def: "'24rem'", desc: '清單高度' },
  { name: 'overscan', type: 'number', def: '6', desc: '可視範圍外多畫幾列' },
  { name: 'keyField', type: 'string', def: '索引', desc: '每列的 key' },
  { name: 'threshold / loading', type: 'number / boolean', def: '120 / false', desc: '距底多少 px 送出 reach-bottom／載入中' },
  { name: 'reach-bottom', type: 'event', def: '—', desc: '到底送一次；新資料進來後可再觸發' },
  { name: 'scrollToIndex(i, align?)', type: 'ref 方法', def: '—', desc: "align: 'start' | 'center' | 'end'" },
]

// ---- Affix ----
const affixed = ref(false)
const affixSample = `<ChptAffix :offset-top="64" affixed-class="shadow-md" @change="v => stuck = v">
  <FilterBar />
</ChptAffix>`
const affixProps = [
  { name: 'offsetTop', type: 'number', def: '0', desc: '距離捲動容器頂端（px）' },
  { name: 'affixedClass', type: 'string', def: "''", desc: '貼住時額外加上的 class' },
  { name: 'zIndex', type: 'string', def: "'z-20'", desc: '疊層' },
  { name: 'change / #default', type: 'event (affixed) / slot { affixed }', def: '—', desc: '貼住狀態' },
]

// ---- Carousel ----
const notices = [
  { tag: '安全宣導', title: '本週無工安事故 · 連續 128 天', body: '進入產線請配戴靜電手環與護目鏡。', tone: 'bg-accent-subtle text-accent-on-subtle' },
  { tag: '產線公告', title: 'SMT-02 將於 9/30 08:00 停機保養', body: '預計 4 小時，相關工單已調整至 SMT-03。', tone: 'bg-warning-subtle text-warning-on-subtle' },
  { tag: '品質', title: '9 月綜合良率 98.26%', body: '較 8 月提升 0.35%，感謝各線同仁。', tone: 'bg-success-subtle text-success-on-subtle' },
]
const carouselSample = `<ChptCarousel :items="notices" aria-label="廠區公告" autoplay :interval="4000">
  <template #default="{ item }">…</template>
</ChptCarousel>`
const carouselProps = [
  { name: 'items / ariaLabel', type: 'unknown[] / string', def: '—', desc: '每張的資料／輪播的名稱（必填）' },
  { name: 'modelValue', type: 'number', def: '0', desc: '目前第幾張（v-model）' },
  { name: 'autoplay / interval', type: 'boolean / number', def: 'false / 5000', desc: '自動播放與間隔' },
  { name: 'loop / arrows / indicators', type: 'boolean', def: 'true', desc: '循環／左右箭頭／指示點' },
  { name: 'height', type: 'string', def: "'16rem'", desc: '高度' },
]

// ---- 小工具 ----
const longText = 'SMT-02 回焊爐第 3 溫區溫度異常偏低（量測 228°C，規格 235±5°C），已暫停投料並通知設備課檢修；影響工單 WO-2026-0917、0918，已改由 SMT-03 生產，預計 14:00 恢復。'
const maintenanceAt = new Date(Date.now() + 2 * 86_400_000 + 3 * 3_600_000 + 25 * 60_000)
const changeoverAt = new Date(Date.now() + 3 * 60_000)
const smallUtilsSample = `<ChptCopyButton text="WO-2026-0917" subject="工單號" />
<ChptEllipsis :text="description" :lines="2" expandable />
<ChptCountdown :value="nextMaintenance" title="距離定期保養" format="D 天 HH:mm:ss" @finish="notify" />
<ChptWatermark :content="[user.name, today]"><Report /></ChptWatermark>`
const smallUtilsProps = [
  { name: 'CopyButton', type: 'text, label?, subject?, copiedText?, resetAfter?', def: '—', desc: 'events: copy(text) / error(e)' },
  { name: 'Ellipsis', type: 'text, lines?, expandable?, tooltip?, block?', def: 'lines 1', desc: 'event: toggle(expanded)' },
  { name: 'Countdown', type: 'value, title?, format?, warningThreshold?, size?', def: "format 'HH:mm:ss'", desc: 'events: finish / change(remaining)；role=timer' },
  { name: 'Watermark', type: 'content (string | string[]), rotate?, fontSize?, color?, gap?', def: 'rotate -22', desc: 'SVG 背景鋪滿、不擋點擊；嚇阻用，不是防護' },
]

// ===== ChptSpace =====
const spaceTags = ['SMT', 'DIP', '組裝', '測試', '包裝', '出貨', '品保', '倉儲', '工程', '生管']
const spaceSample = `<ChptSpace>
  <ChptButton>儲存</ChptButton>
  <ChptButton is-outline>取消</ChptButton>
</ChptSpace>

<ChptSpace size="xs">
  <template #split>|</template>
  <a>編輯</a><a>複製</a><a>刪除</a>
</ChptSpace>`
const spaceProps = [
  { name: 'size', type: "'xs'|'sm'|'md'|'lg'|number|[水平, 垂直]", def: "'sm'", desc: '間距；陣列時第二個值是換行時的列距' },
  { name: 'direction', type: "'horizontal'|'vertical'", def: "'horizontal'", desc: '方向' },
  { name: 'align / justify', type: 'start|center|end|baseline|stretch / start|center|end|between', def: '水平置中 / —', desc: '對齊與分布' },
  { name: 'wrap / block', type: 'boolean', def: 'false', desc: '換行；撐滿父層寬度' },
  { name: '#split', type: 'slot', def: '—', desc: '項目之間的分隔（v-if 關掉的項目不算）' },
]
</script>
