<template>
  <div class="chpt-barcode inline-block" :style="{ backgroundColor: props.background, padding: `${props.padding}px` }">
    <svg
      v-if="result"
      ref="svgEl"
      xmlns="http://www.w3.org/2000/svg"
      :width="svgWidth"
      :height="svgHeight"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      shape-rendering="crispEdges"
      role="img"
      :aria-label="t.barcode.label(result.text)"
    >
      <rect :width="svgWidth" :height="svgHeight" :fill="props.background" />
      <path :d="barsPath" :fill="props.color" />
      <text
        v-if="props.showText"
        :x="svgWidth / 2"
        :y="props.height + props.textGap + props.fontSize"
        text-anchor="middle"
        :font-size="props.fontSize"
        font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        :fill="props.color"
        shape-rendering="auto"
      >
        {{ displayText }}
      </text>
    </svg>
    <p v-else class="px-2 py-3 text-xs text-danger" role="alert">{{ errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { BarcodeError, encodeBarcode, type BarcodeFormat, type BarcodeResult } from '../shared/barcode'
import { useLocale } from '../shared/config'

/**
 * ChptBarcode（CHPT 主題） - 一維條碼（Code 128 / Code 39）
 *
 * 工單、批號、箱號、儲位標籤 —— 大部分掃描槍都讀得到一維條碼，不一定支援 QR Code。
 *
 * - Code 128（預設）：完整 ASCII，自動切換字集（連續數字兩位一組，條碼短很多）
 * - Code 39：只有大寫英數與 - . 空白 $ / + %，舊系統與部分標籤機只吃這種；可加 mod 43 檢查碼
 * - SVG 繪製、模組寬度取整數像素（crispEdges）：列印不糊、掃描槍讀得到
 * - 預設白底黑條、左右各留 10 個模組的靜區 —— 深色模式也不反轉（掃描槍讀不了反白的條碼）
 * - 內容含無法編碼的字元時顯示錯誤，而不是畫出一個掃不出來的條碼
 */

interface ChptBarcodeProps {
  value: string
  format?: BarcodeFormat
  /** 一個窄模組的寬度（px）；標籤列印建議 2 以上 */
  moduleWidth?: number
  /** 條的高度（px） */
  height?: number
  /** 左右靜區（模組數）；太窄掃描槍會找不到起點 */
  quietZone?: number
  /** 在條碼下方顯示文字 */
  showText?: boolean
  /** 下方文字（預設為編碼的內容） */
  text?: string
  fontSize?: number
  /** 條與文字的間距（px） */
  textGap?: number
  color?: string
  background?: string
  /** 外框留白（px） */
  padding?: number
  /** Code 39 加上 mod 43 檢查碼 */
  checkDigit?: boolean
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptBarcodeProps>(), {
  format: 'code128',
  moduleWidth: 2,
  height: 60,
  quietZone: 10,
  showText: true,
  text: undefined,
  fontSize: 14,
  textGap: 4,
  color: '#000000',
  background: '#ffffff',
  padding: 0,
  checkDigit: false,
})

const svgEl = useTemplateRef<SVGSVGElement>('svgEl')

const encoded = computed<{ result: BarcodeResult | null; error: BarcodeError | null }>(() => {
  try {
    return { result: encodeBarcode(props.value ?? '', props.format, { checkDigit: props.checkDigit }), error: null }
  } catch (e) {
    return { result: null, error: e instanceof BarcodeError ? e : new BarcodeError(String(e)) }
  }
})
const result = computed(() => encoded.value.result)

const errorText = computed(() => {
  const err = encoded.value.error
  if (!err) return ''
  return err.invalidChars.length ? t.value.barcode.invalid(err.invalidChars.join(' ')) : t.value.barcode.empty
})

/** 模組寬度取整數像素：小數寬度在螢幕與印表機上會被抗鋸齒成灰邊，窄條變粗、寬條變細 */
const mw = computed(() => Math.max(1, Math.round(props.moduleWidth)))
const quiet = computed(() => Math.max(0, props.quietZone) * mw.value)

const svgWidth = computed(() => (result.value ? result.value.modules * mw.value + quiet.value * 2 : 0))
const svgHeight = computed(() => props.height + (props.showText ? props.textGap + props.fontSize + 2 : 0))

/** 黑條合成一條 path（數百個 <rect> 換成一個元素） */
const barsPath = computed(() => {
  const r = result.value
  if (!r) return ''
  let x = quiet.value
  let d = ''
  r.widths.forEach((w, i) => {
    const px = w * mw.value
    if (i % 2 === 0) d += `M${x} 0h${px}v${props.height}h${-px}z`
    x += px
  })
  return d
})

const displayText = computed(() => props.text ?? result.value?.text ?? '')

defineExpose({
  /** 目前條碼的 SVG 原始碼（給列印或下載用）；無法編碼時為空字串 */
  toSVG: (): string => (svgEl.value ? new XMLSerializer().serializeToString(svgEl.value) : ''),
})
</script>
