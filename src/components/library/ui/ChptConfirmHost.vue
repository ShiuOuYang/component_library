<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-100"
      leave-to-class="opacity-0"
    >
      <div v-if="current" class="fixed inset-0 z-modal flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" aria-hidden="true" @click="cancel"></div>

        <div
          :key="current.id"
          ref="panel"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="current.message ? messageId : undefined"
          tabindex="-1"
          class="relative flex w-full max-w-md flex-col gap-4 rounded-xl bg-surface-primary p-5 shadow-2xl focus:outline-none"
        >
          <div class="flex gap-3">
            <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-full" :class="tone.bg" aria-hidden="true">
              <ChptIcon :size="22" :fill="1" color="current" :class="tone.text">{{ tone.icon }}</ChptIcon>
            </span>
            <div class="min-w-0 flex-1 pt-1.5">
              <h2 :id="titleId" class="text-base font-semibold text-content-primary">{{ current.title }}</h2>
              <p v-if="current.message" :id="messageId" class="mt-1.5 whitespace-pre-line text-sm text-content-secondary">{{ current.message }}</p>
            </div>
          </div>

          <label v-if="current.requireText" class="flex flex-col gap-1.5 text-sm text-content-secondary">
            <span>請輸入 <strong class="font-mono text-content-primary">{{ current.requireText }}</strong> 以確認</span>
            <input
              ref="typed"
              v-model="typedText"
              type="text"
              autocomplete="off"
              spellcheck="false"
              class="h-control-sm rounded-md border border-stroke-default bg-surface-primary px-3 font-mono text-content-primary focus:border-stroke-focus focus:outline-none focus:ring-1 focus:ring-stroke-focus"
              @keydown.enter.prevent="canConfirm && confirm()"
            />
          </label>

          <div class="flex justify-end gap-2">
            <ChptButton v-if="current.kind === 'confirm'" ref="cancelButton" size="sm" color="primary" is-outline @click="cancel">
              {{ current.cancelText }}
            </ChptButton>
            <ChptButton
              ref="confirmButton"
              size="sm"
              :color="current.type === 'danger' ? 'danger' : 'primary'"
              :disabled="!canConfirm"
              @click="confirm"
            >
              {{ current.confirmText }}
            </ChptButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import ChptButton from './ChptButton.vue'
import { settleConfirm, useConfirm } from '@/components/library/shared/useConfirm'
import { useOverlay } from '@/components/library/shared/useOverlay'

/**
 * ChptConfirmHost（CHPT 主題） - useConfirm() 的顯示端
 *
 * 在 App 最外層放一次即可（與 ChptToast 相同）：
 * ```vue
 * <RouterView />
 * <ChptToast />
 * <ChptConfirmHost />
 * ```
 *
 * 無障礙：role="alertdialog"（會打斷使用者、需要回應的對話框），標題與說明分別以
 * aria-labelledby / aria-describedby 關聯；焦點困在對話框內、Escape 等於取消、
 * 關閉後焦點回到原本的按鈕。危險操作的預設焦點在「取消」。
 */

const { queue } = useConfirm()
const current = computed(() => queue[0] ?? null)

const uid = useId()
const titleId = `${uid}-title`
const messageId = `${uid}-message`

const panel = useTemplateRef<HTMLElement>('panel')
const typed = useTemplateRef<HTMLInputElement>('typed')
const cancelButton = useTemplateRef<{ $el?: HTMLElement }>('cancelButton')
const confirmButton = useTemplateRef<{ $el?: HTMLElement }>('confirmButton')

const typedText = ref('')
const canConfirm = computed(() => !current.value?.requireText || typedText.value.trim() === current.value.requireText)

const TONES = {
  info: { icon: 'info', bg: 'bg-info-subtle', text: 'text-info' },
  success: { icon: 'check_circle', bg: 'bg-success-subtle', text: 'text-success' },
  warning: { icon: 'warning', bg: 'bg-warning-subtle', text: 'text-warning' },
  danger: { icon: 'error', bg: 'bg-danger-subtle', text: 'text-danger' },
} as const
const tone = computed(() => TONES[current.value?.type ?? 'info'])

function initialFocus(): HTMLElement | null {
  const req = current.value
  if (!req) return null
  if (req.requireText) return typed.value
  if (req.focus === 'cancel' && req.kind === 'confirm') return cancelButton.value?.$el ?? null
  return confirmButton.value?.$el ?? panel.value
}

function confirm(): void {
  const req = current.value
  if (!req || !canConfirm.value) return
  settleConfirm(req.id, true)
}

function cancel(): void {
  const req = current.value
  if (!req) return
  // alert 只有一個答案：怎麼關都是「知道了」
  settleConfirm(req.id, req.kind === 'alert')
}

useOverlay(() => !!current.value, panel, {
  onEscape: cancel,
  initialFocus,
})

// 排隊中的下一個對話框接著出現時，useOverlay 不會再觸發一次開啟 —— 自己把焦點放好
watch(
  () => current.value?.id,
  async (id, old) => {
    typedText.value = ''
    if (id === undefined || old === undefined) return
    await nextTick()
    initialFocus()?.focus()
  }
)
</script>
