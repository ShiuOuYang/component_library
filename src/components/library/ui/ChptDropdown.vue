<template>
  <div ref="root" class="relative inline-block text-left">
    <!-- 觸發元素：預設是一顆按鈕，也可用 #trigger 插槽自訂（插槽會拿到 toggle 與 aria 屬性） -->
    <slot name="trigger" :open="isOpen" :toggle="toggle" :attrs="triggerAttrs">
      <button
        ref="triggerButton"
        type="button"
        v-bind="triggerAttrs"
        :disabled="props.disabled"
        class="inline-flex items-center gap-1.5 rounded-md border border-stroke-default bg-surface-primary font-medium text-content-primary shadow-sm transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-not-allowed disabled:text-content-disabled disabled:hover:bg-surface-primary"
        :class="sizeClass"
        @click="toggle"
        @keydown="onTriggerKeydown"
      >
        <ChptIcon v-if="props.icon" :size="16" color="current">{{ props.icon }}</ChptIcon>
        <span v-if="props.label">{{ props.label }}</span>
        <ChptIcon
          :size="16"
          color="current"
          class="transition-transform"
          :class="isOpen ? 'rotate-180' : ''"
        >expand_more</ChptIcon>
      </button>
    </slot>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        :id="menuId"
        ref="menu"
        role="menu"
        :aria-labelledby="triggerId"
        tabindex="-1"
        class="absolute z-dropdown min-w-[10rem] max-h-72 overflow-auto rounded-lg border border-stroke-light bg-surface-primary py-1 shadow-lg focus:outline-none"
        :class="placementClass"
        @keydown="onMenuKeydown"
      >
        <template v-for="(item, index) in props.items" :key="itemKey(item, index)">
          <div v-if="item.divided && index > 0" role="separator" class="my-1 h-px bg-stroke-light"></div>
          <button
            ref="itemButtons"
            type="button"
            role="menuitem"
            tabindex="-1"
            :aria-disabled="item.disabled ? 'true' : undefined"
            class="flex w-full items-center gap-2 px-3 text-left text-sm transition-colors focus:outline-none"
            :class="[
              itemSizeClass,
              item.disabled
                ? 'cursor-not-allowed text-content-disabled'
                : item.danger
                  ? 'text-danger hover:bg-danger-subtle focus:bg-danger-subtle'
                  : 'text-content-primary hover:bg-surface-tertiary focus:bg-surface-tertiary',
            ]"
            @click="choose(item)"
            @mouseenter="focusItem(index)"
          >
            <ChptIcon v-if="item.icon" :size="16" color="current">{{ item.icon }}</ChptIcon>
            <span class="flex-1 truncate">{{ item.label }}</span>
            <kbd v-if="item.shortcut" class="text-xs text-content-tertiary font-sans">{{ item.shortcut }}</kbd>
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptDropdown（CHPT 主題） - 動作選單（下拉選單按鈕）
 *
 * 用途：把一組「動作」收進一顆按鈕（表格列的「更多」、工具列的「匯出 ▾」）。
 * 要選一個「值」請用 ChptSelect；要篩選請用 ChptFilter。
 *
 * 行為照 WAI-ARIA 的 menu button：
 *   - 觸發鈕：Enter / Space / ↓ 開啟並聚焦第一項，↑ 開啟並聚焦最後一項
 *   - 選單內：↑ ↓ 移動（略過停用項、頭尾循環），Home / End 跳到頭尾，
 *     打字跳到該字開頭的項目，Enter / Space 執行
 *   - Escape 關閉並把焦點還給觸發鈕；Tab 或點外面關閉
 */

export interface DropdownItem {
  /** 識別值（select 事件會帶回整個 item） */
  key?: string | number
  label: string
  /** Material Symbols 圖示名稱 */
  icon?: string
  disabled?: boolean
  /** 危險動作（刪除等），以紅色顯示 */
  danger?: boolean
  /** 在這一項上方畫分隔線 */
  divided?: boolean
  /** 右側顯示的快捷鍵提示（僅顯示用） */
  shortcut?: string
}

interface ChptDropdownProps {
  /** 選單項目 */
  items: DropdownItem[]
  /** 觸發鈕文字 */
  label?: string
  /** 觸發鈕圖示 */
  icon?: string
  /** 選單位置 */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  /** 觸發鈕尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** 禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<ChptDropdownProps>(), {
  label: '',
  icon: '',
  placement: 'bottom-start',
  size: 'sm',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'select', item: DropdownItem): void
  (e: 'open'): void
  (e: 'close'): void
}>()

const id = useId()
const triggerId = `${id}-trigger`
const menuId = `${id}-menu`

const root = useTemplateRef<HTMLElement>('root')
const menu = useTemplateRef<HTMLElement>('menu')
const itemButtons = useTemplateRef<HTMLButtonElement[]>('itemButtons')
const triggerButton = useTemplateRef<HTMLButtonElement>('triggerButton')

const isOpen = ref(false)
const activeIndex = ref(-1)

const triggerAttrs = computed(() => ({
  id: triggerId,
  'aria-haspopup': 'menu' as const,
  'aria-expanded': isOpen.value,
  'aria-controls': isOpen.value ? menuId : undefined,
}))

const sizeClass = computed(() => {
  const map: Record<string, string> = {
    xs: 'h-control-xs px-2 text-xs',
    sm: 'h-control-sm px-3 text-sm',
    md: 'h-control-md px-4 text-base',
    lg: 'h-control-lg px-6 text-lg',
  }
  return map[props.size] ?? map.sm
})

/** 選單項目高度跟著觸發鈕尺寸，但不小於 32px（觸控與 WCAG 2.5.8） */
const itemSizeClass = computed(() => (props.size === 'md' || props.size === 'lg' ? 'h-control-md' : 'h-control-sm'))

const placementClass = computed(() => {
  const map: Record<string, string> = {
    'bottom-start': 'left-0 top-full mt-1 origin-top-left',
    'bottom-end': 'right-0 top-full mt-1 origin-top-right',
    'top-start': 'left-0 bottom-full mb-1 origin-bottom-left',
    'top-end': 'right-0 bottom-full mb-1 origin-bottom-right',
  }
  return map[props.placement] ?? map['bottom-start']
})

function itemKey(item: DropdownItem, index: number): string | number {
  return item.key ?? `${index}-${item.label}`
}

function enabledIndexes(): number[] {
  return props.items.flatMap((item, i) => (item.disabled ? [] : [i]))
}

function focusItem(index: number): void {
  if (index < 0 || props.items[index]?.disabled) return
  activeIndex.value = index
  itemButtons.value?.[index]?.focus()
}

async function open(focus: 'first' | 'last' | 'none' = 'none'): Promise<void> {
  if (props.disabled || isOpen.value) return
  isOpen.value = true
  emit('open')
  await nextTick()
  const enabled = enabledIndexes()
  if (focus === 'first' && enabled.length) focusItem(enabled[0])
  else if (focus === 'last' && enabled.length) focusItem(enabled[enabled.length - 1])
  else menu.value?.focus()
}

function close(returnFocus = false): void {
  if (!isOpen.value) return
  isOpen.value = false
  activeIndex.value = -1
  emit('close')
  if (returnFocus) {
    const trigger = triggerButton.value ?? (root.value?.querySelector(`#${CSS.escape(triggerId)}`) as HTMLElement | null)
    trigger?.focus()
  }
}

function toggle(): void {
  if (isOpen.value) close()
  else open('none')
}

function choose(item: DropdownItem): void {
  if (item.disabled) return
  emit('select', item)
  close(true)
}

function onTriggerKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    open('first')
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    open('last')
  }
}

function move(dir: 1 | -1): void {
  const enabled = enabledIndexes()
  if (!enabled.length) return
  const pos = enabled.indexOf(activeIndex.value)
  const next = pos === -1 ? (dir === 1 ? 0 : enabled.length - 1) : (pos + dir + enabled.length) % enabled.length
  focusItem(enabled[next])
}

function onMenuKeydown(event: KeyboardEvent): void {
  const enabled = enabledIndexes()
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(-1)
      break
    case 'Home':
      event.preventDefault()
      if (enabled.length) focusItem(enabled[0])
      break
    case 'End':
      event.preventDefault()
      if (enabled.length) focusItem(enabled[enabled.length - 1])
      break
    case 'Escape':
      event.preventDefault()
      close(true)
      break
    case 'Tab':
      close()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (activeIndex.value !== -1) choose(props.items[activeIndex.value])
      break
    default:
      // 打字跳到該字開頭的項目（從目前位置往後找、循環）
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const ch = event.key.toLowerCase()
        const start = enabled.indexOf(activeIndex.value)
        for (let step = 1; step <= enabled.length; step++) {
          const i = enabled[(start + step) % enabled.length]
          if (props.items[i].label.toLowerCase().startsWith(ch)) {
            focusItem(i)
            break
          }
        }
      }
  }
}

onClickOutside(root, () => close())

defineExpose({ open: () => open('first'), close: () => close() })
</script>
