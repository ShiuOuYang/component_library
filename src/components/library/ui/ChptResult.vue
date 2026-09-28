<template>
  <section
    class="flex flex-col items-center text-center px-6"
    :class="props.compact ? 'py-6 gap-2' : 'py-12 gap-3'"
    :role="isProblem ? 'alert' : 'status'"
  >
    <div class="flex items-center justify-center" :class="props.compact ? 'mb-1' : 'mb-2'">
      <slot name="icon">
        <span
          v-if="config.code"
          class="font-extrabold tracking-tight tabular-nums text-content-disabled"
          :class="props.compact ? 'text-5xl' : 'text-7xl'"
          aria-hidden="true"
        >{{ config.code }}</span>
        <span
          v-else
          class="inline-flex items-center justify-center rounded-full"
          :class="[config.tint, props.compact ? 'w-12 h-12' : 'w-16 h-16']"
          aria-hidden="true"
        >
          <ChptIcon :size="props.compact ? 28 : 40" :fill="1" :weight="400" color="current">{{ config.icon }}</ChptIcon>
        </span>
      </slot>
    </div>

    <h2 class="font-semibold text-content-primary" :class="props.compact ? 'text-base' : 'text-xl'">
      <slot name="title">{{ props.title || config.title }}</slot>
    </h2>

    <p
      v-if="props.subTitle || $slots.subTitle"
      class="max-w-prose text-content-secondary"
      :class="props.compact ? 'text-xs' : 'text-sm'"
    >
      <slot name="subTitle">{{ props.subTitle }}</slot>
    </p>

    <div v-if="$slots.extra" class="mt-2 flex flex-wrap items-center justify-center gap-2">
      <slot name="extra"></slot>
    </div>

    <!-- 補充內容（例如失敗原因清單） -->
    <div
      v-if="hasDefault()"
      class="mt-4 w-full max-w-xl rounded-lg border border-stroke-light bg-surface-secondary p-4 text-left text-sm text-content-secondary"
    >
      <slot></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Comment, Fragment, Text, computed, useSlots, type VNode } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptResult（CHPT 主題） - 結果頁
 *
 * 用途：一個流程或一整頁的「結果」—— 送出成功、匯入失敗、沒有權限、找不到頁面。
 * 與其他反饋元件的分工：
 *   - ChptToast：短暫提示，不打斷操作
 *   - ChptAlert：頁面中的一條訊息
 *   - ChptEmpty：「還沒有資料」
 *   - ChptResult：整塊區域就是這個結果，通常附上下一步的按鈕（#extra）
 *
 * 失敗類（error / warning / 403 / 404 / 500）用 role="alert"，會被螢幕閱讀器立即唸出；
 * 其他用 role="status"。
 */

type ResultStatus = 'success' | 'error' | 'warning' | 'info' | '403' | '404' | '500'

interface ChptResultProps {
  /** 狀態：決定圖示、顏色與預設標題 */
  status?: ResultStatus
  /** 標題；不給時用狀態的預設標題 */
  title?: string
  /** 副標題（說明發生了什麼、接下來可以怎麼做） */
  subTitle?: string
  /** 精簡版（放在卡片或對話框裡） */
  compact?: boolean
}

const props = withDefaults(defineProps<ChptResultProps>(), {
  status: 'info',
  title: '',
  subTitle: '',
  compact: false,
})

const STATUS: Record<ResultStatus, { icon: string; tint: string; title: string; code?: string }> = {
  success: { icon: 'check_circle', tint: 'bg-success-subtle text-success', title: '操作成功' },
  error: { icon: 'cancel', tint: 'bg-danger-subtle text-danger', title: '操作失敗' },
  warning: { icon: 'warning', tint: 'bg-warning-subtle text-warning', title: '請注意' },
  info: { icon: 'info', tint: 'bg-info-subtle text-info', title: '提示' },
  '403': { icon: 'lock', tint: '', title: '沒有存取權限', code: '403' },
  '404': { icon: 'search_off', tint: '', title: '找不到這個頁面', code: '404' },
  '500': { icon: 'error', tint: '', title: '伺服器發生錯誤', code: '500' },
}

const config = computed(() => STATUS[props.status] ?? STATUS.info)

const isProblem = computed(() => props.status !== 'success' && props.status !== 'info')

const slots = useSlots()

/** 節點裡有沒有真的要畫的東西（v-if 為假時插槽仍存在，只是回傳註解節點） */
function hasRenderable(nodes: VNode[] | undefined): boolean {
  return (nodes ?? []).some((n) => {
    if (n.type === Comment) return false
    if (n.type === Fragment) return hasRenderable(n.children as VNode[])
    if (n.type === Text) return String(n.children ?? '').trim() !== ''
    return true
  })
}

/**
 * ⚠️ 只看 $slots.default 是否存在不夠：<ul v-if="失敗時"> 在成功時渲染成註解節點，
 *    插槽照樣存在，結果下方出現一個空的淡底方塊。
 */
const hasDefault = () => hasRenderable(slots.default?.())
</script>
