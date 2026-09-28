<script lang="ts">
import { Comment, Fragment, Text, computed, defineComponent, h, type PropType, type VNode } from 'vue'

/**
 * ChptSpace —— 一排（或一欄）元件之間留固定間距
 *
 * 取代到處手寫的 `flex gap-2`：間距用同一組尺度（xs 4 / sm 8 / md 16 / lg 24px），
 * 還可以在每個項目之間自動插分隔線（split 插槽），例如「編輯 | 複製 | 刪除」。
 *
 * v-if 關掉的項目、註解節點與空白文字不算一個項目，不會多出間距或分隔線。
 */
const GAP: Record<string, string> = { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem' }

type SpaceSize = 'xs' | 'sm' | 'md' | 'lg' | number

/** 攤平 Fragment（v-for 的結果）並略過註解與空白文字 */
function flatten(nodes: VNode[] | undefined): VNode[] {
  const out: VNode[] = []
  for (const node of nodes ?? []) {
    if (node.type === Comment) continue
    if (node.type === Fragment) {
      out.push(...flatten(node.children as VNode[]))
      continue
    }
    if (node.type === Text && typeof node.children === 'string' && !node.children.trim()) continue
    out.push(node)
  }
  return out
}

export default defineComponent({
  name: 'ChptSpace',
  props: {
    direction: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    /** 間距：xs / sm / md / lg 或 px 數字；陣列為 [水平, 垂直]（換行時的列距） */
    size: { type: [String, Number, Array] as PropType<SpaceSize | [SpaceSize, SpaceSize]>, default: 'sm' },
    /** 對齊（交錯軸） */
    align: { type: String as PropType<'start' | 'center' | 'end' | 'baseline' | 'stretch'>, default: undefined },
    /** 主軸分布 */
    justify: { type: String as PropType<'start' | 'center' | 'end' | 'between'>, default: undefined },
    /** 超出寬度時換行（只對水平有效） */
    wrap: { type: Boolean, default: false },
    /** 撐滿父層寬度 */
    block: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const toGap = (s: SpaceSize) => (typeof s === 'number' ? `${s}px` : GAP[s] ?? GAP.sm)
    const gap = computed(() => {
      const [x, y] = Array.isArray(props.size) ? props.size : [props.size, props.size]
      // CSS gap 是「列距 欄距」
      return `${toGap(y)} ${toGap(x)}`
    })

    const alignItems = computed(() => {
      if (props.align) return { start: 'flex-start', end: 'flex-end', center: 'center', baseline: 'baseline', stretch: 'stretch' }[props.align]
      // 水平排列預設置中（按鈕與文字高度不同時才對得齊）；垂直排列預設靠左
      return props.direction === 'horizontal' ? 'center' : 'flex-start'
    })

    return () => {
      const items = flatten(slots.default?.())
      const split = slots.split
      const children: VNode[] = []
      items.forEach((item, i) => {
        if (i > 0 && split) {
          children.push(h('span', { class: 'chpt-space-split', 'aria-hidden': 'true', key: `split-${i}` }, split()))
        }
        children.push(item)
      })
      return h(
        'div',
        {
          class: ['chpt-space', props.block ? 'flex' : 'inline-flex'],
          style: {
            flexDirection: props.direction === 'vertical' ? 'column' : 'row',
            flexWrap: props.wrap && props.direction === 'horizontal' ? 'wrap' : 'nowrap',
            gap: gap.value,
            alignItems: alignItems.value,
            justifyContent: props.justify
              ? { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' }[props.justify]
              : undefined,
          },
        },
        children
      )
    }
  },
})
</script>

<style scoped>
.chpt-space-split {
  display: inline-flex;
  align-items: center;
  color: rgb(var(--t-stroke-default));
}
</style>
