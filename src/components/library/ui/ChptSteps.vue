<template>
  <ol class="flex items-center">
    <template v-for="(step, index) in props.steps" :key="index">
      <li
        class="flex items-center shrink-0"
        :class="stepClass(step)"
        :aria-current="step.status === 'process' ? 'step' : undefined"
      >
        <!-- 節點 -->
        <div class="flex flex-col items-center">
          <span
            class="flex items-center justify-center rounded-full border-2 font-semibold"
            :class="nodeClass(step)"
          >
            <ChptIcon v-if="step.status === 'done'" :size="nodeSize - 4" aria-hidden="true">check</ChptIcon>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span
            v-if="props.showLabel"
            class="mt-1 text-xs whitespace-nowrap"
            :class="labelClass(step)"
          >
            {{ step.title }}
          </span>
          <!-- 狀態只靠顏色與打勾圖示表達，補一段只給輔助技術讀的文字 -->
          <span class="sr-only">{{ statusText(step) }}</span>
        </div>

        <!-- 連接線（純視覺） -->
        <div
          v-if="index < props.steps.length - 1"
          aria-hidden="true"
          class="mx-2 h-0.5 rounded-full flex-1 min-w-[24px]"
          :class="props.steps[index + 1]?.status === 'done' ? 'bg-primary-500' : 'bg-neutral-300'"
        />
      </li>
    </template>
  </ol>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptSteps（CHPT 主題） - 步驟條元件
 *
 * 特性：
 * - 以 steps 陣列定義步驟與狀態
 * - 支援 pending / process / done 三種狀態
 * - 完整 Props / Emits 型別定義
 */

type StepStatus = 'pending' | 'process' | 'done'

interface StepItem {
  title: string
  status?: StepStatus
}

interface ChptStepsProps {
  /** 步驟定義 */
  steps?: StepItem[]
  /** 是否顯示標題 */
  showLabel?: boolean
}

const props = withDefaults(defineProps<ChptStepsProps>(), {
  steps: () => [],
  showLabel: true,
})

const nodeSize = computed(() => 28)

/** 步驟 node 樣式 */
function nodeClass(step: StepItem): string {
  const size = `${nodeSize.value}px`
  const base = `w-[${size}] h-[${size}] text-sm`
  if (step.status === 'done') return `${base} bg-primary-500 border-primary-500 text-white`
  if (step.status === 'process') return `${base} border-primary-500 text-primary-500 bg-primary-50`
  return `${base} border-neutral-300 text-neutral-400 bg-white`
}

/** 外部容器樣式 */
/** 步驟狀態的文字說明（僅供螢幕閱讀器） */
function statusText(step: StepItem): string {
  const map: Record<string, string> = {
    done: '已完成',
    process: '進行中',
    wait: '尚未開始',
    error: '發生錯誤',
  }
  return map[step.status ?? 'wait'] ?? ''
}

function stepClass(step: StepItem): string {
  return step.status === 'process' ? 'opacity-100' : ''
}

/** 標籤樣式 */
function labelClass(step: StepItem): string {
  if (step.status === 'done') return 'text-primary-600'
  if (step.status === 'process') return 'text-primary-600 font-medium'
  return 'text-neutral-400'
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
