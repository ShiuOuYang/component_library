<template>
  <span
    class="chpt-image relative inline-flex overflow-hidden bg-surface-tertiary align-middle"
    :class="roundedClass"
    :style="boxStyle"
  >
    <!-- 載入中 -->
    <span v-if="status === 'loading'" class="absolute inset-0 animate-pulse bg-surface-muted" aria-hidden="true"></span>

    <!-- 載入失敗：顯示圖示與替代文字（alt 本來就是給「看不到圖」的人的） -->
    <span
      v-if="status === 'error'"
      class="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-content-tertiary"
      role="img"
      :aria-label="props.alt ? `${props.alt}（圖片無法載入）` : '圖片無法載入'"
    >
      <slot name="error">
        <ChptIcon :size="28" color="current">broken_image</ChptIcon>
        <span v-if="props.alt" class="line-clamp-2" aria-hidden="true">{{ props.alt }}</span>
      </slot>
    </span>

    <template v-else>
      <button
        v-if="canPreview"
        type="button"
        class="group relative block size-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
        :class="roundedClass"
        :aria-label="props.alt ? `放大檢視：${props.alt}` : '放大檢視圖片'"
        @click="openPreview"
      >
        <img
          :src="props.src"
          :alt="props.alt"
          :loading="props.lazy ? 'lazy' : undefined"
          class="block size-full transition-opacity"
          :class="[fitClass, status === 'loaded' ? 'opacity-100' : 'opacity-0']"
          @load="status = 'loaded'"
          @error="status = 'error'"
        />
        <span
          class="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        >
          <ChptIcon :size="24" color="current">zoom_in</ChptIcon>
        </span>
      </button>
      <img
        v-else
        :src="props.src"
        :alt="props.alt"
        :loading="props.lazy ? 'lazy' : undefined"
        class="block size-full transition-opacity"
        :class="[fitClass, status === 'loaded' ? 'opacity-100' : 'opacity-0']"
        @load="status = 'loaded'"
        @error="status = 'error'"
      />
    </template>

    <ChptImageViewer
      v-if="canPreview"
      v-model:open="previewOpen"
      :images="previewImages"
      :index="previewIndex"
      :thumbnails="previewImages.length > 1"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import ChptImageViewer, { type ViewerImage } from './ChptImageViewer.vue'

/**
 * ChptImage（CHPT 主題） - 圖片
 *
 * 一般的 <img> 加上三件常被漏掉的事：
 *   - 載入中顯示骨架、載入失敗顯示圖示與替代文字（而不是瀏覽器的破圖）
 *   - 固定外框大小 + object-fit，版面不會因為圖片晚到而跳動
 *   - preview：點了用 ChptImageViewer 全螢幕看，可放大、旋轉、切換同一組的其他圖
 *
 * alt 是必填：描述圖片內容（「SMT-02 第 3 片 PCB 的焊點橋接」）；
 * 純裝飾的圖請傳 alt=""，螢幕閱讀器會略過。
 */

interface ChptImageProps {
  src: string
  alt: string
  /** 外框寬高（數字 = px，或任何 CSS 長度） */
  width?: number | string
  height?: number | string
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  lazy?: boolean
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  /** 點擊放大預覽 */
  preview?: boolean
  /** 預覽時可以左右切換的整組圖（不給時只有自己） */
  previewSrcList?: (string | ViewerImage)[]
}

const props = withDefaults(defineProps<ChptImageProps>(), {
  width: undefined,
  height: undefined,
  fit: 'cover',
  lazy: true,
  rounded: 'md',
  preview: false,
  previewSrcList: () => [],
})

const emit = defineEmits<{
  (e: 'load'): void
  (e: 'error'): void
  (e: 'preview', index: number): void
}>()

const status = ref<'loading' | 'loaded' | 'error'>('loading')
watch(
  () => props.src,
  () => (status.value = 'loading')
)
watch(status, (s) => {
  if (s === 'loaded') emit('load')
  else if (s === 'error') emit('error')
})

const toCss = (v: number | string | undefined) => (v === undefined ? undefined : typeof v === 'number' ? `${v}px` : v)
const boxStyle = computed(() => ({ width: toCss(props.width), height: toCss(props.height) }))

const fitClass = computed(
  () => ({ cover: 'object-cover', contain: 'object-contain', fill: 'object-fill', none: 'object-none', 'scale-down': 'object-scale-down' })[props.fit]
)
const roundedClass = computed(
  () => ({ none: '', sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', full: 'rounded-full' })[props.rounded]
)

const canPreview = computed(() => props.preview && status.value !== 'error')
const previewOpen = ref(false)

const previewImages = computed<ViewerImage[]>(() => {
  const list = props.previewSrcList.map((img) => (typeof img === 'string' ? { src: img } : img))
  if (!list.length) return [{ src: props.src, alt: props.alt }]
  // 自己不在清單裡時放在最前面
  return list.some((img) => img.src === props.src) ? list : [{ src: props.src, alt: props.alt }, ...list]
})
const previewIndex = computed(() => Math.max(0, previewImages.value.findIndex((img) => img.src === props.src)))

function openPreview(): void {
  previewOpen.value = true
  emit('preview', previewIndex.value)
}
</script>
