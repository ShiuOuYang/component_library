<template>
  <ChptModal
    ref="inner"
    mode="window"
    :id="modalId"
    :model-value="props.modelValue"
    :title="props.title"
    :width="props.width"
    :height="props.height"
    :min-width="props.minWidth"
    :min-height="props.minHeight"
    :max-width="props.maxWidth"
    :max-height="props.maxHeight"
    :x="props.x"
    :y="props.y"
    :draggable="props.draggable"
    :resizable="props.resizable"
    :closable="props.closable"
    :minimizable="props.minimizable"
    :maximizable="props.maximizable"
    :default-maximized="props.defaultMaximized"
    :header-bg-color="props.headerBgColor"
    :header-text-color="props.headerTextColor"
    :border-class="props.borderClass"
    :rounded-class="props.roundedClass"
    :shadow-class="props.shadowClass"
    :backdrop-opacity="props.backdropOpacity"
    :content-padding="props.contentPadding"
    :footer-bg-color="props.footerBgColor"
    @update:model-value="emit('update:modelValue', $event)"
    @open="emit('open')"
    @close="emit('close')"
    @minimize="emit('minimize', $event)"
    @maximize="emit('maximize')"
    @restore="emit('restore')"
  >
    <template #title>
      <slot name="title">{{ props.title }}</slot>
    </template>

    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </ChptModal>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import ChptModal from './ChptModal.vue'
import { generateModalId } from '@/components/library/shared/useModalManager'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * DraggableModal（@deprecated）—— 請改用 <ChptModal mode="window" />
 *
 * ChptModal 的 window 模式就是從這支元件演化出來的，兩者曾是各自維護的
 * 兩份實作（698 行 vs 568 行），拖曳、縮放、最小化到口袋、z-index 管理
 * 全部重複。此檔改為薄包裝，實作只留 ChptModal 一份。
 *
 * props / emits / slots / expose 全部一對一對應，唯一例外：
 * - zIndex：此 prop 在原本的實作裡就是死的（唯一用處在一段被註解掉的
 *   scoped CSS 裡），實際層級一律由 useModalManager 自動管理。
 *   保留以免既有呼叫端噴 prop 警告，但不會有任何效果。
 */
interface Props {
  id?: string
  modelValue?: boolean
  title?: string
  width?: string | number
  height?: string | number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  x?: number | null
  y?: number | null
  draggable?: boolean
  resizable?: boolean
  closable?: boolean
  minimizable?: boolean
  maximizable?: boolean
  /** @deprecated 無作用；z-index 由 useModalManager 自動管理 */
  zIndex?: number
  defaultMaximized?: boolean
  headerBgColor?: string
  headerTextColor?: string
  borderClass?: string
  roundedClass?: string
  shadowClass?: string
  backdropOpacity?: number
  contentPadding?: string
  footerBgColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  modelValue: false,
  title: '',
  width: undefined,
  height: undefined,
  minWidth: 300,
  minHeight: 200,
  maxWidth: undefined,
  maxHeight: undefined,
  x: null,
  y: null,
  draggable: true,
  resizable: true,
  closable: true,
  minimizable: true,
  maximizable: true,
  zIndex: 30,
  defaultMaximized: false,
  headerBgColor: 'from-primary-50 to-primary-100',
  headerTextColor: 'text-content-primary',
  borderClass: 'border border-stroke-default',
  roundedClass: 'rounded-lg',
  shadowClass: 'shadow-2xl',
  backdropOpacity: 0.5,
  contentPadding: 'p-4',
  footerBgColor: 'bg-surface-secondary',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  open: []
  minimize: [value: boolean]
  maximize: []
  restore: []
}>()

/**
 * id 在包裝層產生後往下傳，這樣對外 expose 的 modalId 仍是一個字串
 * （與原本的行為一致），而不是需要再解一層的 ref。
 */
const modalId = props.id ?? generateModalId()

const inner = useTemplateRef<InstanceType<typeof ChptModal>>('inner')

defineExpose({
  modalId,
  open: () => inner.value?.open(),
  close: () => inner.value?.close(),
  minimize: () => inner.value?.minimize(),
  maximize: () => inner.value?.maximize(),
  restore: () => inner.value?.restore(),
  setPosition: (x: number, y: number) => inner.value?.setPosition(x, y),
  setSize: (width: number, height: number) => inner.value?.setSize(width, height),
  center: () => inner.value?.center(),
})

warnDeprecated('DraggableModal', 'ChptModal（mode="window"）', 'zIndex prop 無作用，層級由 useModalManager 管理')
</script>
