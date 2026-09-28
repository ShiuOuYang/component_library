<template>
  <span class="chpt-ellipsis inline-flex max-w-full min-w-0 flex-col items-start" :class="props.block ? 'w-full' : ''">
    <span
      :id="textId"
      ref="textEl"
      class="min-w-0 max-w-full"
      :class="expanded ? 'whitespace-pre-line break-words' : props.lines === 1 ? 'block truncate' : 'block overflow-hidden'"
      :style="!expanded && props.lines > 1 ? clampStyle : undefined"
      :title="overflowing && !expanded && props.tooltip ? props.text : undefined"
    >
      <slot>{{ props.text }}</slot>
    </span>
    <button
      v-if="props.expandable && (overflowing || expanded)"
      type="button"
      :aria-expanded="expanded"
      :aria-controls="textId"
      class="mt-0.5 rounded text-xs text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
      @click="toggle"
    >{{ expanded ? props.collapseText : props.expandText }}</button>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch } from 'vue'

/**
 * ChptEllipsis（CHPT 主題） - 文字過長時截斷
 *
 * 料號說明、異常描述、備註這類長度不定的文字：超過 lines 行就截斷。
 *   - 只有真的被截斷時，才出現 title 提示與「展開」按鈕（用實際量測判斷，不是看字數）
 *   - 「展開 / 收起」是 aria-expanded 的按鈕
 *   - 螢幕閱讀器永遠讀得到全文（截斷只是視覺上的 CSS，文字都還在 DOM 裡）
 */

interface ChptEllipsisProps {
  text?: string
  /** 顯示幾行 */
  lines?: number
  /** 被截斷時顯示「展開」按鈕 */
  expandable?: boolean
  /** 被截斷時滑鼠停留顯示全文（title） */
  tooltip?: boolean
  expandText?: string
  collapseText?: string
  /** 撐滿父元素寬度 */
  block?: boolean
}

const props = withDefaults(defineProps<ChptEllipsisProps>(), {
  text: '',
  lines: 1,
  expandable: false,
  tooltip: true,
  expandText: '展開',
  collapseText: '收起',
  block: false,
})

const emit = defineEmits<{ (e: 'toggle', expanded: boolean): void }>()

const textId = `${useId()}-text`
const textEl = useTemplateRef<HTMLElement>('textEl')
const expanded = ref(false)
const overflowing = ref(false)

const clampStyle = computed(() => ({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical' as const,
  WebkitLineClamp: String(props.lines),
}))

function measure(): void {
  const el = textEl.value
  if (!el || expanded.value) return
  overflowing.value = props.lines === 1 ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1
}

function toggle(): void {
  expanded.value = !expanded.value
  emit('toggle', expanded.value)
  if (!expanded.value) nextTick(measure)
}

let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && textEl.value) {
    observer = new ResizeObserver(measure)
    observer.observe(textEl.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
watch(() => [props.text, props.lines], () => nextTick(measure))

defineExpose({ measure, expanded, overflowing })
</script>
