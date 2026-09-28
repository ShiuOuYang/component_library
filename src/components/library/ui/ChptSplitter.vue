<template>
  <div
    ref="root"
    class="chpt-splitter flex min-h-0 min-w-0 overflow-hidden"
    :class="[horizontal ? 'flex-row' : 'flex-col', dragging ? 'select-none' : '']"
  >
    <div :id="startId" class="min-h-0 min-w-0 overflow-auto" :style="startStyle">
      <slot name="start"></slot>
    </div>

    <!-- WAI-ARIA window splitter：可聚焦的 separator，值是第一個面板佔的百分比 -->
    <div
      role="separator"
      :tabindex="props.disabled ? -1 : 0"
      :aria-orientation="horizontal ? 'vertical' : 'horizontal'"
      :aria-valuenow="Math.round(size)"
      :aria-valuemin="props.min"
      :aria-valuemax="props.max"
      :aria-controls="startId"
      :aria-label="props.ariaLabel"
      :aria-disabled="props.disabled || undefined"
      class="group relative flex shrink-0 items-center justify-center bg-stroke-light transition-colors focus:outline-none focus-visible:bg-stroke-focus"
      :class="[
        horizontal ? 'w-px' : 'h-px',
        props.disabled ? '' : horizontal ? 'cursor-col-resize hover:bg-stroke-focus' : 'cursor-row-resize hover:bg-stroke-focus',
        dragging ? '!bg-stroke-focus' : '',
      ]"
      @pointerdown="onPointerDown"
      @keydown="onKeydown"
      @dblclick="toggleCollapse"
    >
      <!-- 實際可以抓的範圍比 1px 線寬大（至少 8px），手柄點點只是提示 -->
      <span class="absolute" :class="horizontal ? '-inset-x-1 inset-y-0' : '-inset-y-1 inset-x-0'" aria-hidden="true"></span>
      <span
        v-if="!props.disabled"
        class="relative z-10 flex gap-0.5 rounded-full border border-stroke-light bg-surface-primary p-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        :class="[horizontal ? 'flex-col' : 'flex-row', dragging ? 'opacity-100' : '']"
        aria-hidden="true"
      >
        <span v-for="n in 3" :key="n" class="size-1 rounded-full bg-content-tertiary"></span>
      </span>
    </div>

    <div class="min-h-0 min-w-0 flex-1 overflow-auto">
      <slot name="end"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, useTemplateRef } from 'vue'

/**
 * ChptSplitter（CHPT 主題） - 可拖曳調整的分割面板
 *
 * 左右（或上下）兩個區塊，中間的分隔線可以拖、也可以用鍵盤調：
 * 左邊清單 / 右邊明細、上面圖表 / 下面資料表。
 * v-model 是第一個面板佔的百分比。
 *
 * 照 WAI-ARIA window splitter：
 *   - 分隔線是可聚焦的 role="separator"，aria-valuenow = 百分比、aria-controls 指向第一個面板
 *   - ← → （上下排列時 ↑ ↓）每次調整 step，Shift 加大到 10 倍；Home / End 到最小 / 最大
 *   - Enter 或雙擊：收合第一個面板 / 還原到收合前的大小
 *   - 名稱請用 ariaLabel 說明它分開的是什麼（「清單與明細」）
 */

interface ChptSplitterProps {
  /** v-model：第一個面板的百分比 */
  modelValue?: number
  direction?: 'horizontal' | 'vertical'
  min?: number
  max?: number
  /** 鍵盤每次調整的百分比 */
  step?: number
  disabled?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<ChptSplitterProps>(), {
  modelValue: undefined,
  direction: 'horizontal',
  min: 10,
  max: 90,
  step: 2,
  disabled: false,
  ariaLabel: '調整面板大小',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  /** 拖曳結束（放開）時送出一次，適合存到使用者偏好 */
  (e: 'resize-end', value: number): void
}>()

const startId = `${useId()}-start`
const root = useTemplateRef<HTMLElement>('root')
const horizontal = computed(() => props.direction === 'horizontal')

const inner = ref(props.modelValue ?? 50)
const size = computed(() => props.modelValue ?? inner.value)
const clamp = (v: number) => Math.min(props.max, Math.max(props.min, v))

const startStyle = computed(() => ({ flexBasis: `${size.value}%`, flexGrow: 0, flexShrink: 0 }))

function set(value: number): void {
  const next = +clamp(value).toFixed(2)
  if (next === size.value) return
  inner.value = next
  emit('update:modelValue', next)
}

// ---- 收合 / 還原 ----

let beforeCollapse: number | null = null
function toggleCollapse(): void {
  if (props.disabled) return
  if (size.value <= props.min && beforeCollapse !== null) {
    set(beforeCollapse)
    beforeCollapse = null
  } else {
    beforeCollapse = size.value
    set(props.min)
  }
  emit('resize-end', size.value)
}

// ---- 鍵盤 ----

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const step = props.step * (event.shiftKey ? 10 : 1)
  const dec = horizontal.value ? 'ArrowLeft' : 'ArrowUp'
  const inc = horizontal.value ? 'ArrowRight' : 'ArrowDown'
  switch (event.key) {
    case dec:
      set(size.value - step)
      break
    case inc:
      set(size.value + step)
      break
    case 'Home':
      set(props.min)
      break
    case 'End':
      set(props.max)
      break
    case 'Enter':
      toggleCollapse()
      return
    default:
      return
  }
  event.preventDefault()
  emit('resize-end', size.value)
}

// ---- 拖曳 ----

const dragging = ref(false)
let cleanup: (() => void) | null = null

function onPointerDown(event: PointerEvent): void {
  if (props.disabled || event.button !== 0 || !root.value) return
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).focus()
  dragging.value = true
  const rect = root.value.getBoundingClientRect()
  const move = (e: PointerEvent) => {
    const ratio = horizontal.value ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height
    set(ratio * 100)
  }
  const up = () => {
    dragging.value = false
    cleanup?.()
    emit('resize-end', size.value)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up, { once: true })
  cleanup = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    cleanup = null
  }
}

onBeforeUnmount(() => cleanup?.())
</script>
