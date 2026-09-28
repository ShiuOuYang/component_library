<template>
  <div
    class="relative inline-flex items-center justify-center rounded-lg"
    :class="props.bordered ? 'border border-stroke-light p-2' : ''"
    :style="{ width: boxSize, height: boxSize, backgroundColor: props.bgColor }"
  >
    <svg
      v-if="matrix"
      :viewBox="`0 0 ${viewSize} ${viewSize}`"
      :width="props.size"
      :height="props.size"
      shape-rendering="crispEdges"
      role="img"
      :aria-label="accessibleName"
    >
      <rect :width="viewSize" :height="viewSize" :fill="props.bgColor" />
      <path :d="path" :fill="props.color" />
      <!-- 中央 Logo：底下墊一塊背景色，Logo 周圍的模組不會跟圖案混在一起 -->
      <template v-if="props.icon">
        <rect
          :x="iconBox.x - 0.5"
          :y="iconBox.y - 0.5"
          :width="iconBox.size + 1"
          :height="iconBox.size + 1"
          rx="1"
          :fill="props.bgColor"
        />
        <image :href="props.icon" :x="iconBox.x" :y="iconBox.y" :width="iconBox.size" :height="iconBox.size" />
      </template>
    </svg>

    <p v-else class="px-3 text-center text-xs text-danger" role="alert">
      {{ errorText }}
    </p>

    <!-- 過期 / 載入中：蓋一層半透明遮罩，碼本身仍保留（使用者知道「這裡曾經是一個碼」） -->
    <div
      v-if="props.status !== 'active'"
      class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-surface-primary/90"
    >
      <template v-if="props.status === 'loading'">
        <span class="h-6 w-6 animate-spin rounded-full border-2 border-stroke-default border-t-accent-solid" aria-hidden="true"></span>
        <span class="text-xs text-content-secondary" role="status">產生中</span>
      </template>
      <template v-else>
        <span class="text-sm font-medium text-content-primary" role="status">{{ props.expiredText }}</span>
        <button
          type="button"
          class="inline-flex h-control-xs items-center gap-1 rounded-md px-2 text-xs font-medium text-accent hover:bg-accent-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          @click="emit('refresh')"
        >
          <span class="material-symbols-outlined text-sm" aria-hidden="true">refresh</span>
          重新產生
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import qrcode from 'qrcode-generator'

/**
 * ChptQRCode —— 產生 QR Code（工單、序號標籤、登入連結）
 *
 * - SVG 繪製：任何尺寸都銳利，列印也清楚
 * - 中文等非 ASCII 內容先轉成 UTF-8 位元組
 *   （qrcode-generator 預設只取每個字元的低 8 位元，中文會變成亂碼、掃出來是錯的內容）
 * - 顏色預設永遠是「白底黑碼」：深色模式也不反轉 —— 很多掃描器讀不了反白的 QR Code
 * - 放 Logo 時自動用最高容錯等級 H（中間被蓋住約 7% 仍可掃）
 */
type Level = 'L' | 'M' | 'Q' | 'H'

interface ChptQRCodeProps {
  value: string
  /** 邊長（px） */
  size?: number
  /** 容錯等級：L 7% / M 15% / Q 25% / H 30%；有 icon 時強制 H */
  level?: Level
  /** 碼的顏色（深色） */
  color?: string
  /** 底色（淺色）；要與 color 有足夠對比才掃得出來 */
  bgColor?: string
  /** 四周留白（模組數）；規格建議 4，嵌在卡片裡 2 也夠 */
  margin?: number
  /** 中央 Logo 圖片網址 */
  icon?: string
  /** Logo 佔碼的比例（0.1–0.3） */
  iconRatio?: number
  bordered?: boolean
  /** active：正常；expired：過期（顯示重新產生）；loading：產生中 */
  status?: 'active' | 'expired' | 'loading'
  expiredText?: string
  /** 螢幕閱讀器唸的名稱；預設「QR Code：內容」 */
  title?: string
}

const props = withDefaults(defineProps<ChptQRCodeProps>(), {
  size: 160,
  level: 'M',
  color: '#000000', // theme-ok：QR Code 固定深色碼
  bgColor: '#ffffff', // theme-ok：QR Code 固定淺色底
  margin: 2,
  icon: '',
  iconRatio: 0.22,
  bordered: true,
  status: 'active',
  expiredText: 'QR Code 已過期',
  title: '',
})

const emit = defineEmits<{ refresh: [] }>()

/** UTF-8 位元組轉成「每個字元一個位元組」的字串，交給 qrcode-generator 的 Byte 模式 */
function toBinaryString(text: string): string {
  let out = ''
  for (const byte of new TextEncoder().encode(text)) out += String.fromCharCode(byte)
  return out
}

const errorText = computed(() => (props.value ? '內容太長，無法產生 QR Code' : '沒有內容'))

const matrix = computed<boolean[][] | null>(() => {
  if (!props.value) return null
  try {
    const qr = qrcode(0, props.icon ? 'H' : props.level)
    qr.addData(toBinaryString(props.value), 'Byte')
    qr.make()
    const n = qr.getModuleCount()
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)))
  } catch {
    // 超過 40 版的容量（約 2.9KB）
    return null
  }
})

const moduleCount = computed(() => matrix.value?.length ?? 0)
const viewSize = computed(() => moduleCount.value + props.margin * 2)
const boxSize = computed(() => `${props.size + (props.bordered ? 18 : 0)}px`)

/** 每個深色模組畫成一個 1×1 的方塊，整張碼只有一條 path */
const path = computed(() => {
  const m = matrix.value
  if (!m) return ''
  let d = ''
  m.forEach((row, r) => {
    row.forEach((dark, c) => {
      if (dark) d += `M${c + props.margin},${r + props.margin}h1v1h-1z`
    })
  })
  return d
})

const iconBox = computed(() => {
  const size = Math.max(3, Math.round(moduleCount.value * Math.min(0.3, Math.max(0.1, props.iconRatio))))
  const x = (viewSize.value - size) / 2
  return { x, y: x, size }
})

const accessibleName = computed(() => props.title || `QR Code：${props.value}`)

/**
 * 輸出 PNG（data URL）。scale = 每個模組幾個像素。
 * 沒有 canvas 的環境（SSR、測試）回傳 null。
 */
function toDataURL(scale = 8): string | null {
  const m = matrix.value
  if (!m || typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  const px = viewSize.value * scale
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext?.('2d')
  if (!ctx) return null
  ctx.fillStyle = props.bgColor
  ctx.fillRect(0, 0, px, px)
  ctx.fillStyle = props.color
  m.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) ctx.fillRect((c + props.margin) * scale, (r + props.margin) * scale, scale, scale)
    })
  )
  return canvas.toDataURL('image/png')
}

/** 下載成 PNG（Logo 不含在內，避免跨網域圖片讓 canvas 無法輸出） */
function download(filename = 'qrcode.png'): boolean {
  const url = toDataURL()
  if (!url) return false
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  return true
}

defineExpose({ toDataURL, download, matrix })
</script>
