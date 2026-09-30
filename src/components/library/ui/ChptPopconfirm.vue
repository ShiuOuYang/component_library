<template>
  <span ref="root" class="relative inline-block">
    <!-- 觸發內容：aria 屬性補到插槽裡的按鈕上（見 syncTriggerAria） -->
    <span ref="triggerWrap" @click="toggle">
      <slot />
    </span>

    <!-- 彈出層 -->
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        :id="panelId"
        ref="panel"
        role="dialog"
        :aria-labelledby="messageId"
        tabindex="-1"
        class="absolute z-popover mt-2 left-1/2 -translate-x-1/2 bg-surface-primary rounded-lg shadow-2xl border border-stroke-light p-4 w-60 focus:outline-none"
      >
        <p :id="messageId" class="text-sm text-content-primary mb-3">
          <slot name="message">{{ props.message }}</slot>
        </p>
        <div class="flex justify-end gap-2">
          <ChptButton
            size="sm"
            is-outline
            @click="handleCancel"
          >
            {{ props.cancelText }}
          </ChptButton>
          <ChptButton
            ref="confirmButton"
            size="sm"
            :color="props.color"
            @click="handleConfirm"
          >
            {{ props.confirmText }}
          </ChptButton>
        </div>
      </div>
    </Transition>
  </span>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ChptButton from './ChptButton.vue'
import { useOverlay } from '@/components/library/shared/useOverlay'

/**
 * ChptPopconfirm（CHPT 主題） - 彈出式確認元件
 *
 * 特性：
 * - 點擊觸發顯示確認彈窗
 * - 確認 / 取消按鈕
 * - 完整 Props / Emits 型別定義
 * - 無障礙：role="dialog" 與訊息關聯、開啟時焦點移入、關閉後歸還觸發元素、
 *   Escape 與點擊外部關閉（原本這些都沒有，彈窗開了之後鍵盤完全無法操作）
 */

interface ChptPopconfirmProps {
  /** 確認訊息 */
  message?: string
  /** 確認按鈕文字 */
  confirmText?: string
  /** 取消按鈕文字 */
  cancelText?: string
  /** 確認按鈕顏色（ChptButton color） */
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning'
}

const props = withDefaults(defineProps<ChptPopconfirmProps>(), {
  message: '確定要執行此操作嗎？',
  confirmText: '確定',
  cancelText: '取消',
  color: 'danger',
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const visible = ref(false)

const uid = useId()
const panelId = `${uid}-panel`
const messageId = `${uid}-message`

const rootRef = useTemplateRef<HTMLElement>('root')
const panelRef = useTemplateRef<HTMLElement>('panel')
const confirmButtonRef = useTemplateRef<{ $el?: HTMLElement }>('confirmButton')

function toggle(): void {
  visible.value = !visible.value
}

function handleConfirm(): void {
  visible.value = false
  emit('confirm')
}

function handleCancel(): void {
  visible.value = false
  emit('cancel')
}

/**
 * aria-haspopup / aria-expanded / aria-controls 要放在「會拿到焦點的那顆按鈕」上。
 * ⚠️ 原本放在包住插槽的 <span>：span 不可聚焦，且 aria-expanded 不允許用在沒有角色的元素上
 *    （axe：aria-allowed-attr，critical）—— 螢幕閱讀器聚焦按鈕時聽不到「已展開 / 已收合」。
 */
const triggerWrapRef = useTemplateRef<HTMLElement>('triggerWrap')
function syncTriggerAria(): void {
  const wrap = triggerWrapRef.value
  const el =
    wrap?.querySelector<HTMLElement>('button, a[href], [role="button"], [tabindex]:not([tabindex="-1"])') ??
    (wrap?.firstElementChild as HTMLElement | null) ??
    null
  if (!el) return
  el.setAttribute('aria-haspopup', 'dialog')
  el.setAttribute('aria-expanded', String(visible.value))
  if (visible.value) el.setAttribute('aria-controls', panelId)
  else el.removeAttribute('aria-controls')
}
onMounted(syncTriggerAria)
watch(visible, () => nextTick(syncTriggerAria))

// 點擊元件外部視同取消
onClickOutside(rootRef, () => {
  if (visible.value) handleCancel()
})

/**
 * 彈窗雖然不是模態（背景仍可捲動與操作），但仍需要焦點管理：
 * 開啟時把焦點移到確認鈕、關閉後還給觸發元素，Escape 等同取消。
 */
useOverlay(() => visible.value, panelRef, {
  onEscape: () => handleCancel(),
  lockScroll: false,
  initialFocus: () => confirmButtonRef.value?.$el ?? panelRef.value,
})
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>

