import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * 圖表的 autoResize：用 ResizeObserver 跟著容器大小，防抖後更新尺寸並通知呼叫端。
 *
 * - autoResize 關閉時直接用 props 的 width / height
 * - 防抖期間元件被卸載：計時器裡先檢查容器還在不在
 * - 卸載時斷開 observer、清掉計時器
 */
export function useAutoResize(
  containerRef: Ref<HTMLElement | null>,
  props: { width: number; height: number; autoResize: boolean; debounceDelay: number },
  onResize: (size: { width: number; height: number }) => void
) {
  const observedWidth = ref(props.width)
  const observedHeight = ref(props.height)
  let observer: ResizeObserver | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const effectiveWidth = computed(() => (props.autoResize ? observedWidth.value : props.width))
  const effectiveHeight = computed(() => (props.autoResize ? observedHeight.value : props.height))

  onMounted(() => {
    if (!props.autoResize || !containerRef.value || typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver((entries) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        // 🔧 防抖期間元件可能已卸載
        if (!containerRef.value) return
        const rect = entries[entries.length - 1]?.contentRect
        if (!rect) return
        observedWidth.value = Math.floor(rect.width)
        observedHeight.value = Math.floor(rect.height)
        onResize({ width: observedWidth.value, height: observedHeight.value })
      }, props.debounceDelay)
    })
    observer.observe(containerRef.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  })

  return { effectiveWidth, effectiveHeight }
}
