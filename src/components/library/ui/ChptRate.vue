<template>
  <span
    v-if="props.readonly"
    role="img"
    :aria-label="readonlyLabel"
    class="inline-flex items-center gap-0.5"
  >
    <ChptIcon
      v-for="n in props.count"
      :key="n"
      :size="iconSize"
      :fill="fillOf(n, props.modelValue)"
      weight="400"
      color="current"
      :class="fillOf(n, props.modelValue) ? filledClass : 'text-stroke-dark'"
    >{{ props.icon }}</ChptIcon>
    <span v-if="props.showText && currentText" class="ml-1.5 text-sm text-content-secondary" aria-hidden="true">{{ currentText }}</span>
  </span>

  <span v-else class="inline-flex items-center gap-1.5">
    <span
      :id="id"
      ref="group"
      role="radiogroup"
      :aria-label="labelledBy ? undefined : props.ariaLabel"
      :aria-labelledby="labelledBy"
      :aria-disabled="props.disabled || undefined"
      :aria-invalid="invalid ? 'true' : undefined"
      :aria-describedby="describedBy"
      :aria-required="required || undefined"
      class="inline-flex items-center"
      @mouseleave="hover = 0"
      @keydown="onKeydown"
    >
      <span
        v-for="n in props.count"
        :key="n"
        role="radio"
        :aria-checked="props.modelValue === n"
        :aria-label="labelOf(n)"
        :tabindex="props.disabled ? -1 : n === tabStop ? 0 : -1"
        class="inline-flex rounded p-0.5 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        :class="props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-110'"
        @click="choose(n)"
        @mouseenter="!props.disabled && (hover = n)"
      >
        <ChptIcon
          :size="iconSize"
          :fill="fillOf(n, shown)"
          weight="400"
          color="current"
          :class="fillOf(n, shown) ? filledClass : 'text-stroke-dark'"
        >{{ props.icon }}</ChptIcon>
      </span>
    </span>
    <span v-if="props.showText && shownText" class="min-w-[3em] text-sm text-content-secondary" aria-hidden="true">{{ shownText }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import ChptIcon from './ChptIcon.vue'
import { useFormField } from '@/components/library/shared/formContext'

/**
 * ChptRate（CHPT 主題） - 評分
 *
 * 1 ~ count 顆星，v-model 是整數（0 = 未評分）。
 *
 * 無障礙：可以操作時是 WAI-ARIA radiogroup ——
 *   - 整組只有一個 Tab 停駐點；← → ↑ ↓ 直接改分數（跟原生單選鈕一樣），Home / End 到 1 / 最高
 *   - 每顆星的名稱是 texts 裡的文字（「很差」…「很好」），沒給時是「3 星」
 *   - allowClear：再點一次目前的分數會清成 0（鍵盤按 Delete / Backspace）
 * 唯讀時改成 role="img"，一次唸出「評分 4 / 5」—— 不需要 5 個不能操作的單選鈕。

 */

interface ChptRateProps {
  /** v-model：分數（0 = 未評分） */
  modelValue?: number
  /** 星星數 */
  count?: number
  /** Material Symbols 圖示名稱 */
  icon?: string
  /** 各分數的文字（長度 = count）；作為每顆星的名稱，showText 時也顯示在旁邊 */
  texts?: string[]
  showText?: boolean
  /** 再點一次目前的分數可清除 */
  allowClear?: boolean
  readonly?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** 填滿時的顏色 */
  color?: 'warning' | 'danger' | 'accent'
  /** 無障礙名稱（放在有標籤的 ChptFormItem 裡時自動用標籤） */
  ariaLabel?: string
}

const props = withDefaults(defineProps<ChptRateProps>(), {
  modelValue: 0,
  count: 5,
  icon: 'star',
  texts: () => [],
  showText: false,
  allowClear: true,
  readonly: false,
  disabled: false,
  size: 'md',
  color: 'warning',
  ariaLabel: '評分',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

const { id, invalid, describedBy, required, labelledBy } = useFormField(() => undefined)
const group = useTemplateRef<HTMLElement>('group')

const hover = ref(0)
const shown = computed(() => hover.value || props.modelValue)

const iconSize = computed(() => ({ sm: 16, md: 20, lg: 28 })[props.size])
/**
 * 星星刻意鎖定黃色色階（帶數字 = 不隨主題變）：warning-solid 是給白字當底的深琥珀色，
 * 畫成星星會像咖啡色。分數靠「實心 vs 空心」的形狀區分，不只靠顏色；
 * 空心星用 stroke-dark，在淺深兩個主題對背景都有 3:1 以上（WCAG 1.4.11）。
 * danger / accent 給愛心、讚這類圖示。
 */
const filledClass = computed(() => ({ warning: 'text-warning-500', danger: 'text-danger-500', accent: 'text-accent-solid' })[props.color])

const fillOf = (n: number, value: number) => (n <= Math.round(value) ? 1 : 0)
const labelOf = (n: number) => props.texts[n - 1] || `${n} 星`

const currentText = computed(() => (props.modelValue ? labelOf(props.modelValue) : ''))
const shownText = computed(() => (shown.value ? labelOf(shown.value) : ''))
const readonlyLabel = computed(() => {
  const base = `${props.ariaLabel} ${props.modelValue} / ${props.count}`
  return props.texts[props.modelValue - 1] ? `${base}（${props.texts[props.modelValue - 1]}）` : base
})

/** 可 Tab 的那一顆：目前分數；未評分時是第一顆 */
const tabStop = computed(() => (props.modelValue >= 1 && props.modelValue <= props.count ? props.modelValue : 1))

function set(value: number): void {
  const next = Math.min(props.count, Math.max(0, value))
  if (next === props.modelValue) return
  emit('update:modelValue', next)
  emit('change', next)
}

function choose(n: number): void {
  if (props.disabled) return
  set(props.allowClear && n === props.modelValue ? 0 : n)
  hover.value = 0
}

async function focusStar(n: number): Promise<void> {
  await nextTick()
  const stars = group.value?.querySelectorAll<HTMLElement>('[role="radio"]')
  stars?.[n - 1]?.focus()
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const current = props.modelValue
  let next: number | null = null
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      next = Math.min(props.count, current + 1)
      break
    case 'ArrowLeft':
    case 'ArrowDown':
      next = Math.max(1, current - 1)
      break
    case 'Home':
      next = 1
      break
    case 'End':
      next = props.count
      break
    case ' ':
    case 'Enter': {
      // 未評分時第一顆雖然是停駐點但沒被選 —— Space 選它（與原生單選鈕相同）
      event.preventDefault()
      const target = (event.target as HTMLElement).closest('[role="radio"]')
      const stars = Array.from(group.value?.querySelectorAll('[role="radio"]') ?? [])
      const n = stars.indexOf(target as Element) + 1
      if (n > 0 && n !== current) set(n)
      return
    }
    case 'Delete':
    case 'Backspace':
      if (props.allowClear) {
        event.preventDefault()
        set(0)
        focusStar(1)
      }
      return
    default:
      return
  }
  event.preventDefault()
  set(next)
  focusStar(next)
}
</script>
