<template>
  <!-- 根節點只拿來找出捲動容器（display: contents，不佔版面）；外部傳入的 class 落到按鈕上 -->
  <span ref="probe" class="contents">
  <Transition
    enter-active-class="transition duration-150"
    enter-from-class="opacity-0 translate-y-2"
    leave-active-class="transition duration-100"
    leave-to-class="opacity-0 translate-y-2"
  >
    <button
      v-if="visible"
      v-bind="$attrs"
      type="button"
      :aria-label="props.label"
      :title="props.label"
      class="fixed z-40 inline-flex size-11 items-center justify-center rounded-full border border-stroke-light bg-surface-primary text-content-secondary shadow-lg transition-colors hover:bg-surface-secondary hover:text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
      :style="{ right: `${props.right}px`, bottom: `${props.bottom}px` }"
      @click="toTop"
    >
      <slot>
        <ChptIcon :size="22" color="current">vertical_align_top</ChptIcon>
      </slot>
    </button>
  </Transition>
  </span>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import {
  focusWithoutScroll,
  onScrollOf,
  resolveScrollTarget,
  scrollToY,
  scrollTopOf,
  type ScrollTarget,
} from '@/components/library/shared/scroll'

/**
 * ChptBackTop（CHPT 主題） - 回到頂端
 *
 * 捲超過 visibilityHeight 才出現的浮動按鈕。捲動容器預設是元件所在的那個（自動偵測），
 * 也可用 target 指定。
 *
 * 回到頂端後焦點移到容器最上面的標題（沒有標題就是容器本身）：
 * 否則按鈕消失、焦點掉回 <body>，鍵盤使用者得從頁首重新 Tab。
 * 使用者設定「減少動態效果」時直接跳到頂端，不做平滑捲動。
 */

interface ChptBackTopProps {
  /** 捲動容器（選擇器或元素）；不給時自動偵測 */
  target?: string | HTMLElement
  /** 捲超過多少 px 才出現 */
  visibilityHeight?: number
  right?: number
  bottom?: number
  label?: string
}

const props = withDefaults(defineProps<ChptBackTopProps>(), {
  target: undefined,
  visibilityHeight: 400,
  right: 24,
  bottom: 24,
  label: '回到頂端',
})

defineOptions({ inheritAttrs: false })

const emit = defineEmits<{ (e: 'click'): void }>()

const probe = useTemplateRef<HTMLElement>('probe')
const visible = ref(false)
let scroller: ScrollTarget | null = null

function update(): void {
  if (scroller) visible.value = scrollTopOf(scroller) > props.visibilityHeight
}

let off: (() => void) | null = null

function bind(): void {
  off?.()
  scroller = resolveScrollTarget(props.target, probe.value)
  off = scroller ? onScrollOf(scroller, update) : null
  update()
}

function toTop(): void {
  if (!scroller) return
  emit('click')
  scrollToY(scroller, 0)
  const container = scroller === window ? document.body : (scroller as HTMLElement)
  const heading = container.querySelector<HTMLElement>('h1, h2') ?? container
  focusWithoutScroll(heading)
}

onMounted(() => nextTick(bind))
watch(() => props.target, () => nextTick(bind))
onBeforeUnmount(() => off?.())

defineExpose({ scrollToTop: toTop })
</script>
