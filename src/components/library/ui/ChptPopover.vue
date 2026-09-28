<template>
  <span
    ref="root"
    class="relative inline-block"
    @mouseenter="onPointerEnter"
    @mouseleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown.esc="onEscape"
  >
    <!-- 觸發元素：插槽拿得到 open / toggle 與 aria 屬性；沒綁 attrs 時自動補在第一個元素上 -->
    <span ref="triggerWrap" class="inline-flex" @click="onTriggerClick">
      <slot :open="isOpen" :toggle="toggle" :attrs="triggerAttrs"></slot>
    </span>

    <Transition
      enter-active-class="transition-opacity duration-100 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-75 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        :id="panelId"
        ref="panel"
        role="dialog"
        :aria-labelledby="hasTitle ? titleId : undefined"
        :aria-label="!hasTitle && props.ariaLabel ? props.ariaLabel : undefined"
        tabindex="-1"
        class="absolute z-dropdown rounded-lg border border-stroke-light bg-surface-primary text-left text-sm text-content-primary shadow-lg focus:outline-none"
        :class="[placementClass, props.padded ? 'p-3' : '', props.width ? '' : 'w-max max-w-xs']"
        :style="{ width: props.width || undefined, marginLeft: shift ? `${shift}px` : undefined }"
      >
        <p v-if="hasTitle" :id="titleId" class="mb-1.5 font-semibold text-content-primary">
          <slot name="title">{{ props.title }}</slot>
        </p>
        <slot name="content" :close="closeFromContent">
          <p class="text-content-secondary">{{ props.content }}</p>
        </slot>
      </div>
    </Transition>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useSlots, useTemplateRef, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'

/**
 * ChptPopover（CHPT 主題） - 氣泡卡片
 *
 * 點（或滑過）觸發元素時，在旁邊彈出一張可放任意內容的卡片：
 * 說明文字、小表單、操作按鈕、使用者資訊卡……
 *
 * 與相近元件的分工：
 *   - ChptTooltip：只有一行文字、純提示、不能互動
 *   - ChptPopconfirm：固定的「確定 / 取消」確認
 *   - ChptDropdown：一組動作選單
 *   - ChptPopover：以上都不是的時候
 *
 * 無障礙（非模態 dialog，照 WAI-ARIA disclosure 的精神）：
 *   - 觸發元素自動帶 aria-haspopup="dialog" / aria-expanded / aria-controls
 *   - 卡片緊接在觸發元素後面（不 Teleport），Tab 從觸發鈕往下就會進到卡片裡的按鈕
 *   - Escape 關閉並把焦點還給觸發元素；焦點離開整個元件、或點外面也會關閉
 *   - hover 觸發同時支援鍵盤聚焦開啟 —— 只能滑鼠打開的內容，鍵盤使用者永遠看不到
 */

type PopoverPlacement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right'

interface ChptPopoverProps {
  /** 是否開啟（v-model:open；不綁時由元件自己管理） */
  open?: boolean
  /** 觸發方式：click 點擊 / hover 滑過（也含鍵盤聚焦）/ focus 聚焦 / manual 只由 v-model 控制 */
  trigger?: 'click' | 'hover' | 'focus' | 'manual'
  /** 位置 */
  placement?: PopoverPlacement
  /** 標題（也可用 #title 插槽）；有標題時卡片以它命名 */
  title?: string
  /** 內容文字（複雜內容用 #content 插槽） */
  content?: string
  /**
   * 卡片寬度（CSS 值，例如 '18rem'）。
   * 不設定時依內容寬度、最寬 20rem —— 卡片是 absolute，不給寬度的話會被擠成觸發鈕那麼窄
   */
  width?: string
  /** 沒有標題時卡片的無障礙名稱 */
  ariaLabel?: string
  /** 卡片內距（放自訂清單等需要貼齊邊緣的內容時關掉） */
  padded?: boolean
  /** hover 觸發的開啟 / 關閉延遲（ms） */
  openDelay?: number
  closeDelay?: number
  /** 禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<ChptPopoverProps>(), {
  open: undefined,
  trigger: 'click',
  placement: 'bottom',
  title: '',
  content: '',
  width: '',
  ariaLabel: '',
  padded: true,
  openDelay: 100,
  closeDelay: 150,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const slots = useSlots()
const id = useId()
const panelId = `${id}-panel`
const titleId = `${id}-title`

const root = useTemplateRef<HTMLElement>('root')
const triggerWrap = useTemplateRef<HTMLElement>('triggerWrap')
const panel = useTemplateRef<HTMLElement>('panel')

const inner = ref(false)
const isOpen = computed(() => (props.open ?? inner.value) && !props.disabled)
const hasTitle = computed(() => !!(props.title || slots.title))

function setOpen(value: boolean): void {
  if (props.disabled && value) return
  if (value === isOpen.value) return
  inner.value = value
  emit('update:open', value)
}

function show(): void {
  setOpen(true)
}
function close(returnFocus = false): void {
  if (!isOpen.value) return
  setOpen(false)
  if (returnFocus) triggerElement()?.focus()
}
/** 卡片裡的按鈕關閉卡片時，焦點原本在卡片裡 —— 要還給觸發元素，不能掉回 <body> */
function closeFromContent(): void {
  close(true)
}
function toggle(): void {
  setOpen(!isOpen.value)
}

const triggerAttrs = computed(() => ({
  'aria-haspopup': 'dialog' as const,
  'aria-expanded': isOpen.value,
  'aria-controls': isOpen.value ? panelId : undefined,
}))

/** 觸發元素：插槽裡第一個可聚焦的元素（通常就是那顆按鈕） */
function triggerElement(): HTMLElement | null {
  const wrap = triggerWrap.value
  if (!wrap) return null
  return (
    wrap.querySelector<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ??
    (wrap.firstElementChild as HTMLElement | null)
  )
}

/** 呼叫端沒有把 attrs 綁上去時，替觸發元素補上 aria（最常見的寫法是直接包一顆 ChptButton） */
function syncTriggerAria(): void {
  const el = triggerElement()
  if (!el) return
  el.setAttribute('aria-haspopup', 'dialog')
  el.setAttribute('aria-expanded', String(isOpen.value))
  if (isOpen.value) el.setAttribute('aria-controls', panelId)
  else el.removeAttribute('aria-controls')
}
onMounted(syncTriggerAria)
watch(isOpen, () => nextTick(syncTriggerAria), { flush: 'post' })

// ---- 各種觸發方式 ----

let timer: ReturnType<typeof setTimeout> | undefined
function schedule(fn: () => void, delay: number): void {
  clearTimeout(timer)
  timer = setTimeout(fn, delay)
}
onBeforeUnmount(() => clearTimeout(timer))

function onTriggerClick(): void {
  if (props.trigger === 'click') toggle()
}

function onPointerEnter(): void {
  if (props.trigger !== 'hover') return
  schedule(show, props.openDelay)
}
function onPointerLeave(): void {
  if (props.trigger !== 'hover') return
  // 焦點還在裡面（鍵盤使用者正在操作卡片內容）時不要因為滑鼠移走就關掉
  if (root.value?.contains(document.activeElement)) {
    clearTimeout(timer)
    return
  }
  schedule(() => setOpen(false), props.closeDelay)
}

function onFocusIn(): void {
  if (props.trigger === 'hover' || props.trigger === 'focus') {
    clearTimeout(timer)
    show()
  }
}
function onFocusOut(event: FocusEvent): void {
  if (props.trigger === 'manual') return
  const next = event.relatedTarget as Node | null
  // relatedTarget 為 null：焦點回到 body（例如點在空白處）—— 交給 click outside 處理
  if (!next || root.value?.contains(next)) return
  clearTimeout(timer)
  setOpen(false)
}

function onEscape(event: KeyboardEvent): void {
  if (!isOpen.value) return
  event.stopPropagation()
  close(true)
}

onClickOutside(root, () => {
  if (props.trigger !== 'manual') close()
})

const placementClass = computed(() => {
  const map: Record<PopoverPlacement, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    'top-start': 'bottom-full left-0 mb-2',
    'top-end': 'bottom-full right-0 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    'bottom-start': 'top-full left-0 mt-2',
    'bottom-end': 'top-full right-0 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }
  return map[placement.value] ?? map.bottom
})

// ---- 碰撞處理：卡片超出可見範圍時往內推 / 上下翻轉 ----

/** 上下翻轉後的實際位置 */
const flipped = ref(false)
/** 水平方向往內推的距離（px，套在 margin-left） */
const shift = ref(0)
const placement = computed<PopoverPlacement>(() => {
  if (!flipped.value) return props.placement
  const p = props.placement
  return (p.startsWith('top') ? p.replace('top', 'bottom') : p.startsWith('bottom') ? p.replace('bottom', 'top') : p) as PopoverPlacement
})

/**
 * 可見範圍 = 視窗 ∩ 每一層會裁切內容的祖先（overflow 不是 visible）。
 * ⚠️ 只看視窗不夠：文檔站的內容區是 overflow-y: auto 的 <main>，卡片超出它的左緣時
 *    不會超出視窗，但會被 <main> 裁掉一半。
 */
function visibleBounds(from: HTMLElement): { left: number; right: number; top: number; bottom: number } {
  const b = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
  for (let el = from.parentElement; el && el !== document.body; el = el.parentElement) {
    const style = getComputedStyle(el)
    if (style.overflowX === 'visible' && style.overflowY === 'visible') continue
    const r = el.getBoundingClientRect()
    b.left = Math.max(b.left, r.left)
    b.right = Math.min(b.right, r.right)
    b.top = Math.max(b.top, r.top)
    b.bottom = Math.min(b.bottom, r.bottom)
  }
  return b
}

const EDGE = 8

async function reposition(): Promise<void> {
  flipped.value = false
  shift.value = 0
  await nextTick()
  const el = panel.value
  const anchor = root.value
  if (!el || !anchor) return
  let rect = el.getBoundingClientRect()
  if (!rect.width) return // 沒有排版（SSR / 測試環境）
  const bounds = visibleBounds(anchor)

  // 上下：放不下而另一邊放得下時翻轉
  const isBottom = props.placement.startsWith('bottom')
  const isTop = props.placement.startsWith('top')
  const anchorRect = anchor.getBoundingClientRect()
  if (isBottom && rect.bottom > bounds.bottom - EDGE && anchorRect.top - rect.height - EDGE >= bounds.top) flipped.value = true
  if (isTop && rect.top < bounds.top + EDGE && anchorRect.bottom + rect.height + EDGE <= bounds.bottom) flipped.value = true
  if (flipped.value) {
    await nextTick()
    rect = el.getBoundingClientRect()
  }

  // 水平：往內推到可見範圍裡（卡片比範圍還寬時對齊左緣）
  if (rect.left < bounds.left + EDGE) shift.value = bounds.left + EDGE - rect.left
  else if (rect.right > bounds.right - EDGE) shift.value = Math.max(bounds.left + EDGE - rect.left, bounds.right - EDGE - rect.right)
}

watch(isOpen, (open) => {
  if (open) reposition()
})

defineExpose({ open: show, close: () => close(), toggle })
</script>
