<template>
  <div
    role="radiogroup"
    :aria-label="props.ariaLabel || undefined"
    class="inline-flex items-stretch gap-0.5 p-0.5 rounded-lg bg-surface-tertiary"
    :class="[props.block ? 'flex w-full' : '', props.disabled ? 'opacity-60' : '']"
  >
    <button
      v-for="(option, index) in normalized"
      :key="String(option.value)"
      ref="buttons"
      type="button"
      role="radio"
      :aria-checked="option.value === props.modelValue"
      :tabindex="index === focusIndex ? 0 : -1"
      :disabled="props.disabled || option.disabled"
      class="inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-not-allowed"
      :class="[
        sizeClass,
        props.block ? 'flex-1' : '',
        option.value === props.modelValue
          ? 'bg-surface-primary text-content-primary shadow-sm'
          : 'text-content-secondary hover:text-content-primary disabled:hover:text-content-secondary',
        option.disabled ? 'opacity-50' : '',
      ]"
      @click="select(option, index)"
      @keydown="onKeydown($event, index)"
    >
      <ChptIcon v-if="option.icon" :size="iconSize" color="current">{{ option.icon }}</ChptIcon>
      <span v-if="option.label">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptSegmented（CHPT 主題） - 分段控制器
 *
 * 用途：在 2~5 個互斥選項之間切換「檢視方式」—— 日 / 週 / 月、清單 / 卡片、
 * 良率 / 不良數。選項少、而且想讓所有選項一直看得到時，比下拉選單直覺。
 * 要切換的是「頁面內容區塊」時請用 ChptTabs。
 *
 * 鍵盤行為照 WAI-ARIA 的 radiogroup：整組只佔一個 Tab 停駐點，
 * ← → ↑ ↓ 在選項間移動並直接選取，Home / End 跳到頭尾；停用的選項會被略過。
 */

type SegmentValue = string | number

export interface SegmentOption {
  label?: string
  value: SegmentValue
  /** Material Symbols 圖示名稱 */
  icon?: string
  disabled?: boolean
}

interface ChptSegmentedProps {
  /** v-model：目前選取的值 */
  modelValue?: SegmentValue
  /** 選項；字串陣列時 label 與 value 相同 */
  options: (SegmentOption | SegmentValue)[]
  /** 尺寸（高度與按鈕同一套 control token） */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** 撐滿容器寬度，選項平均分配 */
  block?: boolean
  /** 整組禁用 */
  disabled?: boolean
  /** 給螢幕閱讀器的群組名稱（畫面上沒有標籤時務必提供） */
  ariaLabel?: string
}

const props = withDefaults(defineProps<ChptSegmentedProps>(), {
  modelValue: undefined,
  size: 'sm',
  block: false,
  disabled: false,
  ariaLabel: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: SegmentValue): void
  (e: 'change', value: SegmentValue): void
}>()

const buttons = useTemplateRef<HTMLButtonElement[]>('buttons')

const normalized = computed<SegmentOption[]>(() =>
  props.options.map((o) => (typeof o === 'object' ? o : { label: String(o), value: o }))
)

/**
 * 可以 Tab 進來的那一個選項：目前選取的；沒有選取時是第一個可用的
 * （radiogroup 的規則：整組只有一個 tabindex=0）
 */
const focusIndex = computed(() => {
  const selected = normalized.value.findIndex((o) => o.value === props.modelValue && !o.disabled)
  if (selected !== -1) return selected
  return Math.max(0, normalized.value.findIndex((o) => !o.disabled))
})

/**
 * 按鈕高度扣掉外框的 2px 內距（p-0.5 × 2 = 4px），整組外高才會等於同尺寸的按鈕：
 * 整組放在工具列上時與旁邊的 ChptButton 對齊。
 */
const sizeClass = computed(() => {
  const map: Record<string, string> = {
    xs: 'h-5 px-2 text-xs',
    sm: 'h-7 px-3 text-sm',
    md: 'h-9 px-4 text-base',
    lg: 'h-11 px-5 text-lg',
  }
  return map[props.size] ?? map.sm
})

const iconSize = computed(() => ({ xs: 14, sm: 16, md: 18, lg: 20 })[props.size] ?? 16)

function select(option: SegmentOption, index: number): void {
  if (props.disabled || option.disabled) return
  if (option.value !== props.modelValue) {
    emit('update:modelValue', option.value)
    emit('change', option.value)
  }
  nextTick(() => buttons.value?.[index]?.focus())
}

/** 從 index 往 dir 方向找下一個可用選項（循環） */
function nextEnabled(index: number, dir: 1 | -1): number {
  const n = normalized.value.length
  for (let step = 1; step <= n; step++) {
    const i = (((index + dir * step) % n) + n) % n
    if (!normalized.value[i].disabled) return i
  }
  return index
}

function onKeydown(event: KeyboardEvent, index: number): void {
  let target: number | null = null
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      target = nextEnabled(index, 1)
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      target = nextEnabled(index, -1)
      break
    case 'Home':
      target = nextEnabled(-1, 1)
      break
    case 'End':
      target = nextEnabled(normalized.value.length, -1)
      break
    default:
      return
  }
  event.preventDefault()
  select(normalized.value[target], target)
}
</script>
