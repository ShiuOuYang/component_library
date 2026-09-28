<template>
  <div class="chpt-affix-wrapper contents">
    <!-- 哨兵：捲過它就代表內容已經貼住 -->
    <div ref="sentinel" class="pointer-events-none h-px w-full" :style="{ marginBottom: '-1px' }" aria-hidden="true"></div>
    <div
      class="chpt-affix sticky"
      :class="[props.zIndex, affixed && props.affixedClass ? props.affixedClass : '']"
      :style="{ top: `${props.offsetTop}px` }"
      :data-affixed="affixed || undefined"
    >
      <slot :affixed="affixed"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { scrollParentOf } from '@/components/library/shared/scroll'

/**
 * ChptAffix（CHPT 主題） - 捲動時固定
 *
 * 工具列、表格的篩選列、頁內目錄：捲下去時貼在容器頂端。
 *
 * 用 CSS position: sticky 實作 —— 不是監聽捲動再改成 fixed：
 *   - 不脫離版面，下面的內容不會跳
 *   - 自動跟著最近的捲動容器（後台常見的 overflow-y: auto 內容區也能用）
 * 另外用 IntersectionObserver 看一個哨兵元素，判斷「現在是否貼住」，
 * 讓呼叫端在貼住時加陰影、縮小高度（slot 的 affixed / affixedClass / change 事件）。
 *
 * ⚠️ sticky 只在父元素內有效：父元素比內容矮時不會貼。通常把 ChptAffix 放在長內容的同一層。
 */

interface ChptAffixProps {
  /** 距離捲動容器頂端（px） */
  offsetTop?: number
  /** 貼住時額外加上的 class（例如 'shadow-md'） */
  affixedClass?: string
  zIndex?: string
}

const props = withDefaults(defineProps<ChptAffixProps>(), {
  offsetTop: 0,
  affixedClass: '',
  zIndex: 'z-20',
})

const emit = defineEmits<{ (e: 'change', affixed: boolean): void }>()

const sentinel = useTemplateRef<HTMLElement>('sentinel')
const affixed = ref(false)
let observer: IntersectionObserver | null = null

function observe(): void {
  observer?.disconnect()
  const el = sentinel.value
  if (!el || typeof IntersectionObserver === 'undefined') return
  const scroller = scrollParentOf(el)
  observer = new IntersectionObserver(
    ([entry]) => {
      // 哨兵捲出（容器頂端 + offsetTop）以上 = 內容已經貼住
      const rootTop = entry.rootBounds?.top ?? 0
      affixed.value = !entry.isIntersecting && entry.boundingClientRect.top < rootTop + props.offsetTop + 1
    },
    {
      root: scroller === window ? null : (scroller as HTMLElement),
      rootMargin: `-${props.offsetTop}px 0px 0px 0px`,
      threshold: [0, 1],
    }
  )
  observer.observe(el)
}

watch(affixed, (v) => emit('change', v))
watch(() => props.offsetTop, observe)
onMounted(observe)
onBeforeUnmount(() => observer?.disconnect())
</script>
