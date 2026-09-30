<template>
  <section
    aria-roledescription="carousel"
    :aria-label="props.ariaLabel"
    class="chpt-carousel relative overflow-hidden rounded-lg bg-surface-tertiary"
    :style="{ height: props.height }"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="focusWithin = true"
    @focusout="onFocusOut"
    @keydown.left.prevent="prev"
    @keydown.right.prevent="next"
  >
    <!-- 自動播放時的暫停鈕要是第一個可聚焦元素（WAI-ARIA carousel） -->
    <button
      v-if="props.autoplay"
      type="button"
      :aria-label="playing ? '暫停自動播放' : '開始自動播放'"
      class="absolute left-3 top-3 z-10 inline-flex h-control-sm min-w-control-sm items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      @click="userPaused = !userPaused"
    >
      <ChptIcon :size="18" color="current">{{ playing ? 'pause' : 'play_arrow' }}</ChptIcon>
    </button>

    <!-- 自動輪播中不要報讀每一次換頁（live off）；手動切換時才報讀 -->
    <div
      class="flex h-full"
      :class="reduceMotion ? '' : 'transition-transform duration-500 ease-out'"
      :style="{ transform: `translateX(-${current * 100}%)` }"
      :aria-live="playing ? 'off' : 'polite'"
    >
      <div
        v-for="(item, i) in props.items"
        :key="i"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} / ${props.items.length}`"
        :aria-hidden="i !== current || undefined"
        :inert="i !== current || undefined"
        class="h-full w-full shrink-0"
      >
        <slot :item="item" :index="i" :active="i === current"></slot>
      </div>
    </div>

    <template v-if="props.items.length > 1">
      <button
        v-if="props.arrows"
        type="button"
        aria-label="上一張"
        :disabled="!props.loop && current === 0"
        class="absolute left-3 top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
        @click="prev"
      >
        <ChptIcon :size="24" color="current">chevron_left</ChptIcon>
      </button>
      <button
        v-if="props.arrows"
        type="button"
        aria-label="下一張"
        :disabled="!props.loop && current === props.items.length - 1"
        class="absolute right-3 top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
        @click="next"
      >
        <ChptIcon :size="24" color="current">chevron_right</ChptIcon>
      </button>

      <div v-if="props.indicators" class="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2 py-1.5">
        <button
          v-for="(_, i) in props.items"
          :key="i"
          type="button"
          :aria-label="`第 ${i + 1} 張`"
          :aria-current="i === current ? 'true' : undefined"
          class="h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-black"
          :class="i === current ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'"
          @click="goTo(i)"
        ></button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import { prefersReducedMotion } from '@/components/library/shared/scroll'

/**
 * ChptCarousel（CHPT 主題） - 輪播
 *
 * 看板首頁的公告、產線即時畫面輪播、產品圖。內容用預設插槽畫：
 * ```vue
 * <ChptCarousel :items="banners" aria-label="公告" autoplay>
 *   <template #default="{ item }"><img :src="item.src" :alt="item.alt" /></template>
 * </ChptCarousel>
 * ```
 *
 * 照 WAI-ARIA carousel：
 *   - 自動播放時第一個可聚焦元素是暫停鈕；滑鼠停留或焦點在輪播裡時自動暫停
 *   - 自動輪播時 aria-live="off"（不要每幾秒打斷報讀一次），手動切換時 polite
 *   - 每一張是 role="group" aria-roledescription="slide"，看不到的那幾張 inert（不會被 Tab 到）
 *   - 指示點是一般按鈕，目前那張 aria-current；焦點在輪播裡時 ← → 也能切換
 * 使用者設定「減少動態效果」時不做滑動動畫、也不自動播放。
 */

interface ChptCarouselProps {
  items: unknown[]
  /** v-model：目前第幾張 */
  modelValue?: number
  ariaLabel: string
  autoplay?: boolean
  /** 自動播放間隔（ms） */
  interval?: number
  loop?: boolean
  arrows?: boolean
  indicators?: boolean
  height?: string
}

const props = withDefaults(defineProps<ChptCarouselProps>(), {
  modelValue: undefined,
  autoplay: false,
  interval: 5000,
  loop: true,
  arrows: true,
  indicators: true,
  height: '16rem',
})

const emit = defineEmits<{
  (e: 'update:modelValue', index: number): void
  (e: 'change', index: number, previous: number): void
}>()

const inner = ref(props.modelValue ?? 0)
const current = computed(() => Math.min(Math.max(0, props.modelValue ?? inner.value), Math.max(0, props.items.length - 1)))

const hovering = ref(false)
const focusWithin = ref(false)
const userPaused = ref(false)
const reduceMotion = ref(false)
onMounted(() => (reduceMotion.value = prefersReducedMotion()))

const playing = computed(
  () => props.autoplay && !reduceMotion.value && !userPaused.value && !hovering.value && !focusWithin.value && props.items.length > 1
)

function goTo(index: number): void {
  const n = props.items.length
  if (!n) return
  const next = props.loop ? (index + n) % n : Math.min(n - 1, Math.max(0, index))
  if (next === current.value) return
  const previous = current.value
  inner.value = next
  emit('update:modelValue', next)
  emit('change', next, previous)
}

const next = () => goTo(current.value + 1)
const prev = () => goTo(current.value - 1)

function onFocusOut(event: FocusEvent): void {
  const to = event.relatedTarget as Node | null
  if (to && (event.currentTarget as HTMLElement).contains(to)) return
  focusWithin.value = false
}

let timer: ReturnType<typeof setInterval> | null = null
function stopTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
}
watch(
  [playing, () => props.interval],
  ([on]) => {
    stopTimer()
    if (on) timer = setInterval(() => goTo(current.value + 1), props.interval)
  },
  { immediate: true }
)
onBeforeUnmount(stopTimer)

defineExpose({ next, prev, goTo })
</script>
