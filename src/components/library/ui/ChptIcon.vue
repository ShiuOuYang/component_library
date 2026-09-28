<template>
  <span
    class="material-symbols-outlined inline-flex transition-all duration-300"
    :style="iconStyle"
    :class="iconColorClass"
    aria-hidden="true"
  >
    <slot></slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChptIcon（CHPT 主題） - 通用圖示元件
 *
 * 基於 Material Symbols 字型，透過 CSS 變數控制
 * FILL / WGHT / GRAD 等字型變量屬性。
 *
 * 特性：
 * - 完整 Props 型別定義
 * - 支援 fill / weight / grade 字型變量
 * - 支援尺寸、顏色、hover 顏色、透明度
 * - 一致性寫法（interface + withDefaults + computed）
 */

interface ChptIconProps {
  /** 填滿程度 0~1 */
  fill?: number | string
  /** 字重 100~700 */
  weight?: number | string
  /** 字級 -25~200 */
  grade?: number | string
  /** 尺寸（px 數字或字級字串） */
  size?: number | string
  /** 顏色 class 後綴（如 content-secondary / accent / danger；會組成 text-{color}） */
  color?: string
  /** hover 顏色 class */
  hoverColor?: string
  /** 透明度（0~1 字串） */
  opacity?: string
  // 自訂 class 直接寫 class="…" 即可（會落到根節點）。
  // ⚠️ 原本把 class 宣告成 prop 卻沒有使用 —— 宣告成 prop 的屬性不會 fallthrough，
  //    於是傳進來的 class 全被吃掉：ChptInput 的前綴圖示 class="absolute left-2" 失效，
  //    放大鏡跑到輸入框外面。
}

const props = withDefaults(defineProps<ChptIconProps>(), {
  fill: 0,
  weight: 200,
  grade: 0,
  size: 24,
  // 主題化角色：淺色時與原本的 neutral-500 同色（#737373），深色時換成較亮的階
  color: 'content-tertiary',
  hoverColor: '',
  opacity: '1',
})

/** 顏色類別計算 */
const iconColorClass = computed(() => {
  const classes = [`text-${props.color}`]
  if (props.hoverColor) classes.push(`hover:text-${props.hoverColor}`)
  return classes
})

/** 字型變數與尺寸樣式 */
const iconStyle = computed(() => ({
  'font-size': `${props.size}px`,
  'font-variation-settings': `'FILL' ${String(props.fill)}, 'wght' ${String(
    props.weight
  )}, 'GRAD' ${String(props.grade)}, 'opsz' 48`,
  '--tw-text-opacity': props.opacity,
}))
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
