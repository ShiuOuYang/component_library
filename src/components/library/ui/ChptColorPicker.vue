<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : 'w-fit'">
    <label v-if="props.label" :id="labelId" :for="id" class="text-sm text-content-secondary whitespace-nowrap">
      {{ props.label }}
    </label>

    <ChptPopover
      v-model:open="isOpen"
      placement="bottom-start"
      width="15rem"
      :aria-label="props.label ? `選擇${props.label}` : '選擇顏色'"
      :disabled="props.disabled"
    >
      <button
        :id="id"
        type="button"
        :disabled="props.disabled"
        :aria-labelledby="buttonLabelledBy"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        :aria-required="required || undefined"
        class="inline-flex items-center gap-2 rounded-md border shadow-sm transition-colors focus:outline-none focus:ring-1"
        :class="[
          sizeClass,
          props.fullWidth ? 'w-full' : '',
          invalid
            ? 'border-danger focus:border-danger focus:ring-danger'
            : 'border-stroke-default focus:border-stroke-focus focus:ring-stroke-focus',
          props.disabled ? 'cursor-not-allowed bg-surface-tertiary text-content-disabled' : 'bg-surface-primary text-content-primary hover:bg-surface-secondary',
        ]"
      >
        <span
          class="inline-flex size-5 shrink-0 items-center justify-center rounded ring-1 ring-inset ring-black/15"
          :style="props.modelValue ? { backgroundColor: props.modelValue } : undefined"
          aria-hidden="true"
        >
          <ChptIcon v-if="!props.modelValue" :size="16">format_color_reset</ChptIcon>
        </span>
        <!-- 按鈕名稱：色碼（或「未設定」）；只顯示色塊時放在 sr-only -->
        <span :id="valueId" :class="props.showText ? 'font-mono uppercase' : 'sr-only'">{{ props.modelValue || '未設定' }}</span>
        <ChptIcon :size="16" color="current" class="text-content-tertiary">expand_more</ChptIcon>
      </button>

      <template #content="{ close }">
        <div class="flex flex-col gap-3">
          <label class="flex flex-col gap-1 text-xs text-content-secondary">
            自訂顏色
            <input
              type="color"
              :value="props.modelValue || '#000000'"
              class="h-9 w-full cursor-pointer rounded border border-stroke-default bg-surface-primary p-0.5"
              @input="onNativeInput"
              @change="onNativeInput"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs text-content-secondary">
            色碼
            <input
              :value="hexDraft"
              type="text"
              inputmode="text"
              spellcheck="false"
              maxlength="7"
              placeholder="#RRGGBB"
              :aria-invalid="hexError ? 'true' : undefined"
              :aria-describedby="hexError ? hexErrorId : undefined"
              class="h-control-sm rounded-md border bg-surface-primary px-2 font-mono text-sm uppercase text-content-primary focus:outline-none focus:ring-1"
              :class="hexError ? 'border-danger focus:ring-danger' : 'border-stroke-default focus:border-stroke-focus focus:ring-stroke-focus'"
              @input="onHexInput"
              @keydown.enter.prevent="commitHex"
              @blur="commitHex"
            />
            <span v-if="hexError" :id="hexErrorId" class="text-danger">{{ hexError }}</span>
          </label>

          <div v-if="props.presets.length" role="group" aria-label="預設顏色" class="grid grid-cols-8 gap-1.5">
            <button
              v-for="color in normalizedPresets"
              :key="color"
              type="button"
              :aria-label="color"
              :aria-pressed="color === props.modelValue"
              :title="color"
              class="relative size-6 rounded ring-1 ring-inset ring-black/15 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stroke-focus"
              :style="{ backgroundColor: color }"
              @click="pick(color, close)"
            >
              <span
                v-if="color === props.modelValue"
                class="absolute inset-0 m-auto size-2 rounded-full ring-2 ring-surface-primary"
                :style="{ backgroundColor: readableOn(color) }"
                aria-hidden="true"
              ></span>
            </button>
          </div>

          <div v-if="props.clearable" class="flex justify-end">
            <button
              type="button"
              class="h-control-xs rounded px-2 text-xs text-content-secondary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
              @click="pick(null, close)"
            >
              清除顏色
            </button>
          </div>
        </div>
      </template>
    </ChptPopover>

    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import ChptPopover from './ChptPopover.vue'
import { useFormField } from '@/components/library/shared/formContext'
import type { ComponentSize } from '@/components/library/shared/types/ui.types'

/**
 * ChptColorPicker（CHPT 主題） - 顏色選擇
 *
 * v-model 是 #rrggbb（小寫六碼）或 null。
 * 面板裡三種選法：瀏覽器原生的調色盤、直接打色碼、點預設色。
 *
 * 取色本身交給原生 <input type="color">：各瀏覽器 / 作業系統都有完整的取色器
 * （含滴管），而且鍵盤與螢幕閱讀器都能用 —— 自己畫一個 HSV 面板很難做到同樣程度。
 *
 * 色碼輸入接受 #abc、abc、#AABBCC，一律正規化成 #aabbcc。
 */

interface ChptColorPickerProps {
  modelValue?: string | null
  /** 預設色（任何可解析的 #hex） */
  presets?: string[]
  label?: string
  /** 按鈕上顯示色碼文字 */
  showText?: boolean
  clearable?: boolean
  disabled?: boolean
  size?: ComponentSize
  fullWidth?: boolean
  errorText?: string
}

const props = withDefaults(defineProps<ChptColorPickerProps>(), {
  modelValue: null,
  // defineProps 會被提到 setup 外面，預設值不能引用元件內宣告的常數
  presets: () => [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#78716c', '#525252', '#171717',
  ],
  label: '',
  showText: true,
  clearable: true,
  disabled: false,
  size: 'sm',
  fullWidth: false,
  errorText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
  (e: 'change', value: string | null): void
}>()

const { id, errorId, invalid, describedBy, required, labelledBy } = useFormField(() => props.errorText)
const uid = useId()
const hexErrorId = `${uid}-hex-error`
const labelId = `${uid}-label`
const valueId = `${uid}-value`
/** 按鈕名稱 = 標籤 + 色碼；只靠 <label for> 時名稱會被標籤蓋掉，聽不到目前的顏色 */
const buttonLabelledBy = computed(() =>
  [labelledBy.value ?? (props.label ? labelId : undefined), valueId].filter(Boolean).join(' ')
)

const isOpen = ref(false)
const hexDraft = ref(props.modelValue ?? '')
const hexError = ref('')

watch(
  () => props.modelValue,
  (v) => {
    hexDraft.value = v ?? ''
    hexError.value = ''
  }
)

/** '#abc' / 'abc' / '#AABBCC' → '#aabbcc'；不合法回傳 null */
function normalizeHex(input: string): string | null {
  const s = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(s)) return `#${s.split('').map((c) => c + c).join('')}`
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`
  return null
}

const normalizedPresets = computed(() => [...new Set(props.presets.map(normalizeHex).filter((c): c is string => !!c))])

function update(value: string | null): void {
  if (value === props.modelValue) return
  emit('update:modelValue', value)
  emit('change', value)
}

function onNativeInput(event: Event): void {
  update(normalizeHex((event.target as HTMLInputElement).value))
}

function onHexInput(event: Event): void {
  hexDraft.value = (event.target as HTMLInputElement).value
  hexError.value = ''
}

function commitHex(): void {
  if (!hexDraft.value.trim()) {
    if (props.clearable) update(null)
    else hexDraft.value = props.modelValue ?? ''
    return
  }
  const hex = normalizeHex(hexDraft.value)
  if (!hex) {
    hexError.value = '請輸入 #RGB 或 #RRGGBB'
    return
  }
  hexDraft.value = hex
  update(hex)
}

function pick(color: string | null, close: () => void): void {
  update(color)
  close()
}

/** 選中標記的顏色：在淺色預設色上用黑點、深色上用白點（YIQ 亮度） */
function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? 'black' : 'white'
}

const sizeClass = computed(() => {
  const map: Record<ComponentSize, string> = {
    xs: 'text-xs h-control-xs px-1.5',
    sm: 'text-sm h-control-sm px-2',
    md: 'text-base h-control-md px-3',
    lg: 'text-lg h-control-lg px-4',
    xl: 'text-xl h-control-xl px-4',
  }
  return map[props.size]
})
</script>
