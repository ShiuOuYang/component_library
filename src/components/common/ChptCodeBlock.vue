<template>
  <div class="bg-gray-900 rounded-xl p-4 overflow-x-auto">
    <pre class="text-green-400 text-sm"><code>{{ formattedCode }}</code></pre>

    <!-- 可選的提示信息區塊 -->
    <div
      v-if="$slots.tip || props.tip"
      :class="[
        'mt-4 p-3 rounded border',
        tipTypeClass
      ]"
    >
      <slot name="tip">
        <p :class="['text-xs', tipTextClass]">
          <strong>{{ props.tipTitle }}：</strong><br />
          <span v-html="props.tip" />
        </p>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChptCodeBlock（CHPT 主題） - 程式碼展示區塊
 *
 * 設計模式：
 * - 完整 Props 型別定義（interface + withDefaults）
 * - 支援程式語言標籤、縮排整理、提示信息
 * - 一致性寫法（interface + withDefaults + computed）
 */

type CodeTipType = 'info' | 'warning' | 'success' | 'error'

interface ChptCodeBlockProps {
  /** 程式碼內容 */
  code?: string
  /** 程式語言類型（裝飾用） */
  language?: string
  /** 是否移除多餘的縮排 */
  trimIndent?: boolean
  /** 提示信息 */
  tip?: string
  /** 提示類型 */
  tipType?: CodeTipType
  /** 提示標題 */
  tipTitle?: string
}

const props = withDefaults(defineProps<ChptCodeBlockProps>(), {
  code: '',
  language: 'javascript',
  trimIndent: true,
  tip: '',
  tipType: 'info',
  tipTitle: '重要提示',
})

/** 格式化程式碼（移除多餘縮排） */
const formattedCode = computed(() => {
  if (!props.trimIndent) return props.code

  const lines = props.code.split('\n')

  // 移除開頭和結尾的空行
  while (lines.length > 0 && lines[0].trim() === '') lines.shift()
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()

  if (lines.length === 0) return ''

  // 計算最小縮排
  const nonEmptyLines = lines.filter((line) => line.trim() !== '')
  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^(\s*)/)
      return match ? match[1].length : 0
    })
  )

  return lines.map((line) => line.slice(minIndent)).join('\n')
})

/** 提示類型對應的容器 class */
const tipTypeClass = computed(() => {
  const map: Record<CodeTipType, string> = {
    warning: 'bg-yellow-900/30 border-yellow-600',
    info: 'bg-indigo-900/30 border-indigo-600',
    success: 'bg-green-900/30 border-green-600',
    error: 'bg-red-900/30 border-red-600',
  }
  return map[props.tipType] ?? map.info
})

/** 提示類型對應的文字 class */
const tipTextClass = computed(() => {
  const map: Record<CodeTipType, string> = {
    warning: 'text-yellow-200',
    info: 'text-indigo-200',
    success: 'text-green-200',
    error: 'text-red-200',
  }
  return map[props.tipType] ?? map.info
})
</script>

<style scoped>
pre {
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937;
}
pre::-webkit-scrollbar {
  height: 8px;
}
pre::-webkit-scrollbar-track {
  background: #1f2937;
}
pre::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}
pre::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
pre code {
  font-family: 'Fira Code', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace;
  line-height: 1.5;
}
</style>
