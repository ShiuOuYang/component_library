<template>
  <div class="chpt-slider flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : 'w-64'">
    <div v-if="props.label || props.showValue" class="flex items-center justify-between gap-2">
      <label v-if="props.label" :for="id" class="text-sm text-content-secondary whitespace-nowrap">
        {{ props.label }}
      </label>
      <span v-if="props.showValue" class="text-sm font-medium tabular-nums text-content-primary">
        {{ displayValue }}
      </span>
    </div>

    <div class="relative flex items-center" :class="hasMarks ? 'pb-5' : ''">
      <input
        :id="id"
        type="range"
        class="chpt-slider__input w-full"
        :min="props.min"
        :max="props.max"
        :step="props.step"
        :value="clamped"
        :disabled="props.disabled"
        :aria-valuetext="displayValue"
        :style="{ '--fill': fillPercent + '%' }"
        @input="onInput"
        @change="onChange"
      />

      <!-- 刻度：放在軌道下方，依百分比定位 -->
      <div v-if="hasMarks" class="absolute inset-x-0 bottom-0 h-4" aria-hidden="true">
        <span
          v-for="mark in normalizedMarks"
          :key="mark.value"
          class="absolute -translate-x-1/2 text-xs whitespace-nowrap"
          :class="mark.value <= clamped ? 'text-content-secondary' : 'text-content-tertiary'"
          :style="{ left: percentOf(mark.value) + '%' }"
        >{{ mark.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * ChptSlider（CHPT 主題） - 滑桿
 *
 * 用途：在一個範圍內挑一個數值（門檻、透明度、音量這類「大概位置」比精確數字重要的值）。
 * 需要精確輸入時請用 ChptInputNumber，或兩者並用。
 *
 * 以原生 <input type="range"> 為基礎：方向鍵、PageUp/PageDown、Home/End、
 * 觸控拖曳與螢幕閱讀器都由瀏覽器處理，不需要自己重做一遍（自己畫的滑桿最常漏掉這些）。
 * 外觀全部走主題變數，深色模式自動翻轉。
 */

export interface SliderMark {
  value: number
  label: string
}

interface ChptSliderProps {
  /** v-model 值 */
  modelValue?: number
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 步長 */
  step?: number
  /** 標籤 */
  label?: string
  /** 是否在右上角顯示目前的值 */
  showValue?: boolean
  /** 顯示值的格式（例如 v => `${v}%`）；也用於螢幕閱讀器的 aria-valuetext */
  formatter?: (value: number) => string
  /** 刻度：陣列或 { 值: 標籤 } */
  marks?: SliderMark[] | Record<number, string>
  /** 是否禁用 */
  disabled?: boolean
  /** 是否全寬（預設 16rem） */
  fullWidth?: boolean
}

const props = withDefaults(defineProps<ChptSliderProps>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  step: 1,
  label: '',
  showValue: false,
  formatter: undefined,
  marks: undefined,
  disabled: false,
  fullWidth: false,
})

const emit = defineEmits<{
  /** 拖曳過程中持續觸發 */
  (e: 'update:modelValue', value: number): void
  /** 放開（或鍵盤操作完成）時觸發一次 */
  (e: 'change', value: number): void
}>()

const id = useId()

const clamped = computed(() => Math.min(props.max, Math.max(props.min, props.modelValue)))

function percentOf(v: number): number {
  const span = props.max - props.min
  return span === 0 ? 0 : ((v - props.min) / span) * 100
}

const fillPercent = computed(() => percentOf(clamped.value))

const displayValue = computed(() =>
  props.formatter ? props.formatter(clamped.value) : String(clamped.value)
)

const normalizedMarks = computed<SliderMark[]>(() => {
  if (!props.marks) return []
  if (Array.isArray(props.marks)) return props.marks
  return Object.entries(props.marks).map(([value, label]) => ({ value: Number(value), label }))
})

const hasMarks = computed(() => normalizedMarks.value.length > 0)

function onInput(event: Event): void {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value))
}

function onChange(event: Event): void {
  emit('change', Number((event.target as HTMLInputElement).value))
}
</script>

<style scoped>
/*
 * 軌道：已填滿的部分用品牌實心色，其餘用軌道色。
 * 用 --fill（百分比）畫漸層，而不是另外疊一個 div —— 這樣點擊軌道任何位置都是原生行為。
 */
.chpt-slider__input {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 9999px;
  background: linear-gradient(
    to right,
    rgb(var(--t-accent-solid)) 0 var(--fill),
    rgb(var(--t-surface-muted)) var(--fill) 100%
  );
  cursor: pointer;
  /* 點擊目標至少 24px（WCAG 2.5.8），軌道本身只有 6px，靠上下外距撐開 */
  margin: 9px 0;
}

.chpt-slider__input:disabled {
  cursor: not-allowed;
  background: rgb(var(--t-surface-muted));
}

.chpt-slider__input:focus {
  outline: none;
}

.chpt-slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: rgb(var(--t-surface-primary));
  border: 2px solid rgb(var(--t-accent-solid));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s;
}

.chpt-slider__input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: rgb(var(--t-surface-primary));
  border: 2px solid rgb(var(--t-accent-solid));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.chpt-slider__input::-moz-range-track {
  background: transparent;
}

.chpt-slider__input:hover:not(:disabled)::-webkit-slider-thumb {
  transform: scale(1.1);
}

/* 鍵盤焦點：焦點框畫在把手上 */
.chpt-slider__input:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgb(var(--t-stroke-focus) / 0.5);
}

.chpt-slider__input:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 3px rgb(var(--t-stroke-focus) / 0.5);
}

.chpt-slider__input:disabled::-webkit-slider-thumb {
  border-color: rgb(var(--t-stroke-medium));
}

.chpt-slider__input:disabled::-moz-range-thumb {
  border-color: rgb(var(--t-stroke-medium));
}
</style>
