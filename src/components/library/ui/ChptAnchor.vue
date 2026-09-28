<template>
  <nav :aria-label="props.ariaLabel" class="chpt-anchor text-sm">
    <p v-if="props.title" class="mb-2 text-xs font-semibold uppercase tracking-wide text-content-tertiary">{{ props.title }}</p>
    <ul class="flex flex-col border-l border-stroke-light">
      <template v-for="item in flat" :key="item.href">
        <li>
          <a
            :href="item.href"
            :aria-current="item.href === active ? 'location' : undefined"
            class="-ml-px block truncate border-l-2 py-1 pr-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
            :class="
              item.href === active
                ? 'border-accent font-medium text-accent'
                : 'border-transparent text-content-secondary hover:border-stroke-medium hover:text-content-primary'
            "
            :style="{ paddingLeft: `${12 + item.level * 12}px` }"
            @click="onClick($event, item.href)"
          >{{ item.title }}</a>
        </li>
      </template>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  focusWithoutScroll,
  onScrollOf,
  resolveScrollTarget,
  scrollToY,
  scrollTopOf,
  viewportTopOf,
  type ScrollTarget,
} from '@/components/library/shared/scroll'

/**
 * ChptAnchor（CHPT 主題） - 頁內目錄（錨點導覽）
 *
 * 長頁面旁邊的「本頁內容」：點了捲到該區塊，捲動時自動標示目前讀到哪一段。
 *
 * - 捲動容器自動偵測（第一個區塊實際在捲的祖先），不必手動指定；需要時用 container 覆寫
 * - offset：頂部固定列的高度，捲動定位與「目前區塊」判斷都會扣掉
 * - 點連結後焦點移到該區塊，鍵盤使用者接著 Tab 會從那裡繼續（不是回到目錄）
 * - 目前區塊以 aria-current="location" 標示；網址的 #hash 會同步更新（replaceState，不塞歷史紀錄）
 */

export interface AnchorItem {
  /** '#section-id' */
  href: string
  title: string
  children?: AnchorItem[]
}

interface ChptAnchorProps {
  items: AnchorItem[]
  /** 捲動容器（選擇器或元素）；不給時自動偵測 */
  container?: string | HTMLElement
  /** 頂部保留距離（px） */
  offset?: number
  /** 目錄上方的小標題 */
  title?: string
  ariaLabel?: string
  /** 點擊時更新網址的 hash */
  updateHash?: boolean
}

const props = withDefaults(defineProps<ChptAnchorProps>(), {
  container: undefined,
  offset: 16,
  title: '',
  ariaLabel: '本頁內容',
  updateHash: true,
})

const emit = defineEmits<{
  (e: 'change', href: string): void
  (e: 'click', href: string): void
}>()

const flat = computed(() => {
  const out: { href: string; title: string; level: number }[] = []
  const walk = (list: AnchorItem[], level: number) => {
    for (const item of list) {
      out.push({ href: item.href, title: item.title, level })
      if (item.children?.length) walk(item.children, level + 1)
    }
  }
  walk(props.items, 0)
  return out
})

const active = ref('')

const targetOf = (href: string): HTMLElement | null => {
  if (!href.startsWith('#') || href.length < 2) return null
  return document.getElementById(decodeURIComponent(href.slice(1)))
}

let scroller: ScrollTarget | null = null
/** 點擊造成的平滑捲動期間，不要讓捲動事件把作用中項目改來改去 */
let lockUntil = 0

function setActive(href: string): void {
  if (href === active.value) return
  active.value = href
  emit('change', href)
}

function update(): void {
  if (!scroller || Date.now() < lockUntil) return
  const top = viewportTopOf(scroller) + props.offset + 4
  let current = ''
  for (const item of flat.value) {
    const el = targetOf(item.href)
    if (el && el.getBoundingClientRect().top <= top) current = item.href
  }
  // 捲到底時最後幾段可能永遠碰不到上緣：直接算最後一個
  const atBottom =
    scroller === window
      ? window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      : (scroller as HTMLElement).scrollTop + (scroller as HTMLElement).clientHeight >= (scroller as HTMLElement).scrollHeight - 2
  if (atBottom && flat.value.length && scrollTopOf(scroller) > 0) current = flat.value[flat.value.length - 1].href
  setActive(current || flat.value[0]?.href || '')
}

let frame = 0
function onScroll(): void {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(update)
}

let off: (() => void) | null = null

function bind(): void {
  unbind()
  const first = flat.value.map((i) => targetOf(i.href)).find(Boolean) ?? null
  scroller = resolveScrollTarget(props.container, first)
  if (scroller) off = onScrollOf(scroller, onScroll)
  update()
}

function unbind(): void {
  off?.()
  off = null
  scroller = null
}

function onClick(event: MouseEvent, href: string): void {
  emit('click', href)
  const el = targetOf(href)
  if (!el || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  if (!scroller) bind()
  const s = scroller as ScrollTarget
  const top = el.getBoundingClientRect().top - viewportTopOf(s) + scrollTopOf(s) - props.offset
  lockUntil = Date.now() + 800
  setActive(href)
  scrollToY(s, Math.max(0, top))
  if (props.updateHash) history.replaceState(history.state, '', href)
  focusWithoutScroll(el)
}

onMounted(() => nextTick(bind))
watch(() => [props.items, props.container], () => nextTick(bind), { deep: true })
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  unbind()
})

defineExpose({ refresh: bind, active })
</script>
