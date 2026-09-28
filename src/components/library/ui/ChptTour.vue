<template>
  <Teleport to="body">
    <template v-if="props.open && step">
      <!-- 遮罩：用超大的 box-shadow 在目標周圍挖一個洞（洞本身不擋點擊，但遮罩擋住其餘地方） -->
      <div
        v-if="props.mask"
        class="fixed inset-0 z-modal"
        aria-hidden="true"
        @click="onMaskClick"
      ></div>
      <div
        v-if="props.mask && hole"
        class="chpt-tour-hole pointer-events-none fixed z-modal rounded-lg"
        :style="{ left: `${hole.left}px`, top: `${hole.top}px`, width: `${hole.width}px`, height: `${hole.height}px` }"
        aria-hidden="true"
      ></div>
      <div
        v-else-if="props.mask"
        class="chpt-tour-backdrop pointer-events-none fixed inset-0 z-modal"
        aria-hidden="true"
      ></div>

      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="step.description ? descId : undefined"
        class="fixed z-modal w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-stroke-light bg-surface-primary p-4 shadow-xl focus:outline-none"
        :style="panelStyle"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <div class="mb-1 flex items-start justify-between gap-3">
          <h2 :id="titleId" class="text-base font-semibold text-content-primary">{{ step.title }}</h2>
          <button
            type="button"
            class="-mr-1 -mt-1 inline-flex h-control-xs min-w-control-xs items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            aria-label="關閉導覽"
            @click="close('skip')"
          >
            <span class="material-symbols-outlined text-lg" aria-hidden="true">close</span>
          </button>
        </div>
        <p v-if="step.description" :id="descId" class="text-sm text-content-secondary">{{ step.description }}</p>
        <slot name="content" :step="step" :index="current" />

        <div class="mt-4 flex items-center justify-between gap-2">
          <span class="text-xs text-content-tertiary">{{ current + 1 }} / {{ props.steps.length }}</span>
          <div class="flex gap-2">
            <button
              v-if="current > 0"
              type="button"
              class="inline-flex h-control-sm items-center rounded-md border border-stroke-default px-3 text-sm text-content-primary hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
              @click="go(current - 1)"
            >
              上一步
            </button>
            <button
              ref="primaryRef"
              type="button"
              class="inline-flex h-control-sm items-center rounded-md bg-accent-solid px-3 text-sm font-medium text-white hover:bg-accent-solid-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-2"
              @click="isLast ? close('finish') : go(current + 1)"
            >
              {{ isLast ? props.finishText : '下一步' }}
            </button>
          </div>
        </div>
      </div>
      <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    </template>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch, type CSSProperties } from 'vue'
import { prefersReducedMotion } from '@/components/library/shared/scroll'

/**
 * ChptTour —— 新功能導覽（一步一步指出畫面上的元素）
 *
 * WAI-ARIA 對話框：開啟時焦點移到面板裡的主要按鈕、Tab 只在面板內循環、
 * Esc 關閉、← → 切換步驟，關閉後焦點回到開啟前的位置。
 * 目標找不到（還沒渲染、被 v-if 掉）時該步驟改成置中顯示，不會卡住整個導覽。
 */
export interface TourStep {
  /** 要指出的元素：CSS 選擇器、元素本身，或回傳元素的函式；不給則置中 */
  target?: string | HTMLElement | (() => HTMLElement | null | undefined)
  title: string
  description?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

interface ChptTourProps {
  open?: boolean
  current?: number
  steps: TourStep[]
  /** 顯示遮罩並挖出目標 */
  mask?: boolean
  /** 點遮罩關閉 */
  closeOnMaskClick?: boolean
  finishText?: string
  /** 目標四周留白（px） */
  gap?: number
}

const props = withDefaults(defineProps<ChptTourProps>(), {
  open: false,
  current: 0,
  mask: true,
  closeOnMaskClick: false,
  finishText: '完成',
  gap: 6,
})

const emit = defineEmits<{
  'update:open': [open: boolean]
  'update:current': [index: number]
  change: [index: number]
  /** reason：finish（最後一步按完成）、skip（按 × / Esc / 遮罩） */
  close: [reason: 'finish' | 'skip']
  finish: []
}>()

const uid = useId()
const titleId = `${uid}-title`
const descId = `${uid}-desc`
const panelRef = ref<HTMLElement | null>(null)
const primaryRef = ref<HTMLButtonElement | null>(null)
const current = ref(props.current)
const announcement = ref('')
let returnFocus: HTMLElement | null = null

watch(() => props.current, (v) => { current.value = v })

const step = computed(() => props.steps[current.value])
const isLast = computed(() => current.value >= props.steps.length - 1)

function resolveTarget(s: TourStep | undefined): HTMLElement | null {
  if (!s?.target || s.placement === 'center') return null
  if (typeof s.target === 'string') return document.querySelector<HTMLElement>(s.target)
  if (typeof s.target === 'function') return s.target() ?? null
  return s.target
}

// ----- 位置 -----
interface Box { left: number; top: number; width: number; height: number }
const hole = ref<Box | null>(null)
const panelPos = ref<{ left: number; top: number } | null>(null)

const panelStyle = computed<CSSProperties>(() =>
  panelPos.value
    ? { left: `${panelPos.value.left}px`, top: `${panelPos.value.top}px` }
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
)

function measure() {
  const target = resolveTarget(step.value)
  if (!target) {
    hole.value = null
    panelPos.value = null
    return
  }
  const r = target.getBoundingClientRect()
  const g = props.gap
  hole.value = { left: r.left - g, top: r.top - g, width: r.width + g * 2, height: r.height + g * 2 }

  const panel = panelRef.value
  const pw = panel?.offsetWidth || 320
  const ph = panel?.offsetHeight || 160
  const vw = window.innerWidth
  const vh = window.innerHeight
  const space = 12
  const fits = {
    bottom: r.bottom + g + space + ph <= vh,
    top: r.top - g - space - ph >= 0,
    right: r.right + g + space + pw <= vw,
    left: r.left - g - space - pw >= 0,
  }
  // 指定的位置放不下時依序換：下 → 上 → 右 → 左
  const wanted = step.value?.placement ?? 'bottom'
  const order = [wanted, 'bottom', 'top', 'right', 'left'] as const
  const placement = order.find((p) => p !== 'center' && fits[p as keyof typeof fits]) ?? 'bottom'

  let left: number
  let top: number
  if (placement === 'bottom' || placement === 'top') {
    left = r.left + r.width / 2 - pw / 2
    top = placement === 'bottom' ? r.bottom + g + space : r.top - g - space - ph
  } else {
    top = r.top + r.height / 2 - ph / 2
    left = placement === 'right' ? r.right + g + space : r.left - g - space - pw
  }
  panelPos.value = {
    left: Math.max(8, Math.min(left, vw - pw - 8)),
    top: Math.max(8, Math.min(top, vh - ph - 8)),
  }
}

async function showStep() {
  const target = resolveTarget(step.value)
  if (target) {
    target.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }
  await nextTick()
  measure()
  // 平滑捲動結束後再量一次
  window.setTimeout(measure, prefersReducedMotion() ? 0 : 350)
  announcement.value = `第 ${current.value + 1} 步，共 ${props.steps.length} 步：${step.value?.title ?? ''}`
  primaryRef.value?.focus()
}

function go(index: number) {
  if (index < 0 || index >= props.steps.length) return
  current.value = index
  emit('update:current', index)
  emit('change', index)
  showStep()
}

function close(reason: 'finish' | 'skip') {
  emit('update:open', false)
  emit('close', reason)
  if (reason === 'finish') emit('finish')
}

function onMaskClick() {
  if (props.closeOnMaskClick) close('skip')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close('skip')
  } else if (event.key === 'ArrowRight' && !(event.target instanceof HTMLInputElement)) {
    event.preventDefault()
    if (!isLast.value) go(current.value + 1)
  } else if (event.key === 'ArrowLeft' && !(event.target instanceof HTMLInputElement)) {
    event.preventDefault()
    if (current.value > 0) go(current.value - 1)
  } else if (event.key === 'Tab') {
    // 焦點鎖在面板內
    const focusables = [...(panelRef.value?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])]
    if (!focusables.length) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

const onViewportChange = () => measure()

watch(
  () => props.open,
  (open) => {
    if (open) {
      returnFocus = document.activeElement as HTMLElement | null
      window.addEventListener('resize', onViewportChange)
      window.addEventListener('scroll', onViewportChange, true)
      showStep()
    } else {
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
      returnFocus?.focus?.()
      returnFocus = null
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})

defineExpose({ go, refresh: measure })
</script>

<style scoped>
/* 洞以外的地方變暗：遮罩色與 Modal 相同（兩個主題都是黑色半透明） */
.chpt-tour-hole {
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 0 2px rgb(var(--t-accent-solid));
  transition: left 0.2s, top 0.2s, width 0.2s, height 0.2s;
}

.chpt-tour-backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

@media (prefers-reduced-motion: reduce) {
  .chpt-tour-hole {
    transition: none;
  }
}
</style>
