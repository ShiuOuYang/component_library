<template>
  <Teleport to="body">
    <section
      :aria-label="props.ariaLabel"
      class="pointer-events-none fixed z-[9998] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      :class="placementClass"
    >
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        :enter-from-class="enterFrom"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-for="item in ordered"
          :key="item.id"
          :role="item.type === 'danger' || item.type === 'warning' ? 'alert' : 'status'"
          class="pointer-events-auto flex gap-3 rounded-lg border bg-surface-primary p-4 shadow-lg"
          :class="tone(item.type).border"
          @mouseenter="pause(item.id)"
          @mouseleave="resume(item)"
          @focusin="pause(item.id)"
          @focusout="onFocusOut($event, item)"
        >
          <ChptIcon :size="22" :fill="1" color="current" class="shrink-0" :class="tone(item.type).text">{{ tone(item.type).icon }}</ChptIcon>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-content-primary">{{ item.title }}</p>
            <p v-if="item.message" class="mt-1 whitespace-pre-line text-sm text-content-secondary">{{ item.message }}</p>
            <div v-if="item.actions.length" class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="(action, i) in item.actions"
                :key="action.label"
                type="button"
                class="h-control-xs rounded px-2.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :class="i === 0 ? 'bg-accent-solid text-content-on-solid hover:bg-accent-solid-hover' : 'border border-stroke-default text-content-primary hover:bg-surface-tertiary'"
                @click="runAction(item, action)"
              >{{ action.label }}</button>
            </div>
          </div>
          <button
            v-if="item.closable"
            type="button"
            :aria-label="`關閉通知：${item.title}`"
            class="-mr-1 -mt-1 inline-flex h-control-xs min-w-control-xs shrink-0 items-center justify-center rounded text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            @click="close(item.id)"
          >
            <ChptIcon :size="18" color="current">close</ChptIcon>
          </button>
        </div>
      </TransitionGroup>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import {
  useNotification,
  type NotificationAction,
  type NotificationItem,
  type NotificationType,
} from '@/components/library/shared/useNotification'

/**
 * ChptNotificationHost（CHPT 主題） - useNotification() 的顯示端
 *
 * 在 App 最外層放一次：
 * ```vue
 * <ChptNotificationHost placement="top-right" />
 * ```
 * 倒數由這裡管理：滑鼠停留或焦點在通知裡時暫停，離開後從剩餘時間繼續。
 */

interface ChptNotificationHostProps {
  placement?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** 同時最多顯示幾則（最舊的先收掉） */
  max?: number
  ariaLabel?: string
}

const props = withDefaults(defineProps<ChptNotificationHostProps>(), {
  placement: 'top-right',
  max: 5,
  ariaLabel: '通知',
})

const { items, close } = useNotification()

/** 底部的位置時，新的通知在最下面（離角落最近） */
const ordered = computed(() => (props.placement.startsWith('bottom') ? items : [...items].reverse()))

const placementClass = computed(
  () =>
    ({
      'top-right': 'right-4 top-4',
      'top-left': 'left-4 top-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
    })[props.placement]
)
const enterFrom = computed(() => (props.placement.endsWith('right') ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4'))

const TONES: Record<NotificationType, { icon: string; text: string; border: string }> = {
  info: { icon: 'info', text: 'text-info', border: 'border-stroke-light' },
  success: { icon: 'check_circle', text: 'text-success', border: 'border-stroke-light' },
  warning: { icon: 'warning', text: 'text-warning', border: 'border-warning-subtle-border' },
  danger: { icon: 'error', text: 'text-danger', border: 'border-danger-subtle-border' },
}
const tone = (type: NotificationType) => TONES[type]

// ---- 倒數（可暫停） ----

interface Timer {
  handle: ReturnType<typeof setTimeout> | null
  remaining: number
  startedAt: number
}
const timers = new Map<number, Timer>()

function start(item: NotificationItem, ms: number): void {
  const t: Timer = { handle: null, remaining: ms, startedAt: Date.now() }
  t.handle = setTimeout(() => close(item.id), ms)
  timers.set(item.id, t)
}

function pause(id: number): void {
  const t = timers.get(id)
  if (!t || !t.handle) return
  clearTimeout(t.handle)
  t.handle = null
  t.remaining = Math.max(0, t.remaining - (Date.now() - t.startedAt))
}

function resume(item: NotificationItem): void {
  const t = timers.get(item.id)
  if (!t || t.handle) return
  // 讀完離開後至少再留 1.5 秒，不要一移開滑鼠就消失
  start(item, Math.max(1500, t.remaining))
}

function onFocusOut(event: FocusEvent, item: NotificationItem): void {
  const next = event.relatedTarget as Node | null
  if (next && (event.currentTarget as HTMLElement).contains(next)) return
  resume(item)
}

function runAction(item: NotificationItem, action: NotificationAction): void {
  action.onClick()
  if (!action.keepOpen) close(item.id)
}

// 新加入的通知開始倒數；被關掉的清掉計時器；超過 max 收掉最舊的
watch(
  () => items.map((i) => i.id),
  () => {
    const alive = new Set(items.map((i) => i.id))
    for (const [id, t] of timers) {
      if (!alive.has(id)) {
        if (t.handle) clearTimeout(t.handle)
        timers.delete(id)
      }
    }
    for (const item of items) {
      if (!timers.has(item.id) && item.duration > 0) start(item, item.duration)
    }
    while (items.length > props.max) close(items[0].id)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  for (const t of timers.values()) if (t.handle) clearTimeout(t.handle)
  timers.clear()
})
</script>
