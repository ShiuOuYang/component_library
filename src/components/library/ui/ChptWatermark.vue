<template>
  <div class="chpt-watermark relative">
    <slot></slot>
    <div
      v-if="backgroundImage"
      class="pointer-events-none absolute inset-0"
      :style="{ backgroundImage, backgroundRepeat: 'repeat', backgroundSize: `${tile.w}px ${tile.h}px`, zIndex: props.zIndex }"
      aria-hidden="true"
      data-chpt-watermark
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChptWatermark（CHPT 主題） - 浮水印
 *
 * 在內容上鋪一層斜排的文字（使用者帳號、時間、「機密」），截圖外流時追得到來源。
 *
 * - 用 SVG 產生背景圖（不需要 canvas），淺色 / 深色主題都用半透明，兩邊都看得到又不擋內容
 * - pointer-events: none：不影響點擊、選取文字
 * - aria-hidden：螢幕閱讀器不必唸浮水印
 *
 * ⚠️ 浮水印是嚇阻與追查用，不是防護：看得到畫面的人一定能移除它。真正的機密請做權限控管。
 */

interface ChptWatermarkProps {
  /** 文字；陣列時每個元素一行 */
  content: string | string[]
  /** 旋轉角度 */
  rotate?: number
  fontSize?: number
  /** 文字顏色（任何 CSS 色值）；預設是半透明的中性灰，兩個主題都適用 */
  color?: string
  /** 每一格之間的間距（px） */
  gap?: [number, number]
  zIndex?: number
}

const props = withDefaults(defineProps<ChptWatermarkProps>(), {
  rotate: -22,
  fontSize: 14,
  color: 'rgba(128, 128, 128, 0.18)',
  gap: () => [120, 90],
  zIndex: 10,
})

const lines = computed(() => (Array.isArray(props.content) ? props.content : [props.content]).filter(Boolean))

/** 一格的大小：依最長一行的字數估算（中文字寬約等於字級） */
const tile = computed(() => {
  const longest = Math.max(0, ...lines.value.map((l) => [...l].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 1 : 0.6), 0)))
  const textW = longest * props.fontSize
  const textH = lines.value.length * props.fontSize * 1.4
  return { w: Math.ceil(textW + props.gap[0]), h: Math.ceil(textH + props.gap[1]) }
})

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const backgroundImage = computed(() => {
  if (!lines.value.length) return ''
  const { w, h } = tile.value
  const lineH = props.fontSize * 1.4
  const startY = h / 2 - ((lines.value.length - 1) * lineH) / 2
  const tspans = lines.value
    .map((l, i) => `<tspan x="${w / 2}" y="${startY + i * lineH}">${escape(l)}</tspan>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text transform="rotate(${props.rotate} ${w / 2} ${h / 2})" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${props.fontSize}" fill="${escape(props.color)}">${tspans}</text></svg>`
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
})
</script>
