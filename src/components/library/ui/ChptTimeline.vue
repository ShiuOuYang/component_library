<template>
  <ol class="relative">
    <li
      v-for="(item, index) in ordered"
      :key="item.key ?? index"
      class="relative flex gap-3"
      :class="index === ordered.length - 1 ? '' : 'pb-5'"
      :aria-current="item.current ? 'step' : undefined"
    >
      <!-- 連接線：最後一個節點不畫；通往「進行中」節點的那一段畫虛線 -->
      <span
        v-if="index < ordered.length - 1"
        class="absolute top-2.5 -bottom-2.5 w-px"
        :class="ordered[index + 1]?.pending ? 'border-l border-dashed border-stroke-default' : 'bg-stroke-default'"
        :style="{ left: `${dotSize / 2 - 0.5}px` }"
        aria-hidden="true"
      ></span>

      <!-- 節點 -->
      <!-- 節點容器固定一行文字高（h-5 = text-sm 的行高），圓點才會對齊標題，而不是對齊整個項目的垂直中央 -->
      <span class="relative z-[1] flex h-5 flex-shrink-0 items-center justify-center" :style="{ width: `${dotSize}px` }" aria-hidden="true">
        <slot name="dot" :item="item" :index="index">
          <span
            v-if="item.icon"
            class="inline-flex items-center justify-center rounded-full bg-surface-primary"
            :class="textColor(item)"
          >
            <ChptIcon :size="dotSize" :fill="1" :weight="400" color="current">{{ item.icon }}</ChptIcon>
          </span>
          <span
            v-else-if="item.pending"
            class="inline-block h-3 w-3 rounded-full border-2 border-stroke-medium border-t-transparent animate-spin"
          ></span>
          <span
            v-else
            class="inline-block h-3 w-3 rounded-full"
            :class="item.hollow ? ['border-2 bg-surface-primary', borderColor(item)] : dotColor(item)"
          ></span>
        </slot>
      </span>

      <!-- 內容 -->
      <div class="min-w-0 flex-1">
        <div class="flex min-h-5 flex-wrap items-baseline gap-x-2">
          <span v-if="item.title" class="text-sm font-medium" :class="item.pending ? 'text-content-tertiary' : 'text-content-primary'">
            {{ item.title }}
          </span>
          <time v-if="item.time" class="text-xs tabular-nums text-content-tertiary" :datetime="item.datetime">{{ item.time }}</time>
        </div>
        <div v-if="item.content || $slots.content" class="mt-0.5 text-sm text-content-secondary">
          <slot name="content" :item="item" :index="index">{{ item.content }}</slot>
        </div>
      </div>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptTimeline（CHPT 主題） - 時間軸
 *
 * 用途：依時間排列的事件 —— 工單流程紀錄、設備異常歷程、審核軌跡。
 * 與 ChptSteps 的分工：Steps 是「接下來要做的步驟」（有目前位置），
 * Timeline 是「已經發生的事」（可以一直往下長）。
 *
 * 語意上是有序清單 <ol>；時間用 <time>，可帶機器可讀的 datetime。
 */

type TimelineColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface TimelineItem {
  key?: string | number
  title?: string
  content?: string
  /** 顯示用的時間文字 */
  time?: string
  /** 機器可讀的時間（ISO 8601），給 <time datetime> */
  datetime?: string
  /** 節點顏色 */
  color?: TimelineColor
  /** 空心節點 */
  hollow?: boolean
  /** 以 Material Symbols 圖示取代圓點 */
  icon?: string
  /** 進行中（旋轉的節點、虛線、淡色標題） */
  pending?: boolean
  /** 目前所在的節點（aria-current） */
  current?: boolean
}

interface ChptTimelineProps {
  items: TimelineItem[]
  /** 反轉順序（最新的在最上面） */
  reverse?: boolean
}

const props = withDefaults(defineProps<ChptTimelineProps>(), {
  reverse: false,
})

const dotSize = 16

const ordered = computed(() => (props.reverse ? [...props.items].reverse() : props.items))

/** 完整 class 名稱的對照表（Tailwind 只認得完整字串，不能動態拼接） */
const DOT: Record<TimelineColor, string> = {
  primary: 'bg-accent-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
  info: 'bg-info-solid',
  neutral: 'bg-surface-muted',
}
const BORDER: Record<TimelineColor, string> = {
  primary: 'border-accent',
  success: 'border-success',
  warning: 'border-warning',
  danger: 'border-danger',
  info: 'border-info',
  neutral: 'border-stroke-medium',
}
const TEXT: Record<TimelineColor, string> = {
  primary: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  neutral: 'text-content-tertiary',
}

const dotColor = (item: TimelineItem) => DOT[item.color ?? 'primary'] ?? DOT.primary
const borderColor = (item: TimelineItem) => BORDER[item.color ?? 'primary'] ?? BORDER.primary
const textColor = (item: TimelineItem) => TEXT[item.color ?? 'primary'] ?? TEXT.primary
</script>
