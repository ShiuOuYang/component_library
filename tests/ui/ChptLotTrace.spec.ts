import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptLotTrace from '@/components/library/ui/ChptLotTrace.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { TraceLink, TraceNode } from '@/components/library/shared/lotTrace'

const nodes: TraceNode[] = [
  { id: 'M1', label: 'M1', kind: 'material', sublabel: '板' },
  { id: 'M2', label: 'M2', kind: 'material', status: 'suspect' },
  { id: 'W1', label: 'W1-LONG-LABEL-THAT-IS-CLIPPED', kind: 'wip' },
  { id: 'F1', label: 'F1', kind: 'product' },
  { id: 'F2', label: 'F2', kind: 'product', status: 'hold' },
  { id: 'S1', label: 'S1' },
]
const links: TraceLink[] = [
  { from: 'M1', to: 'W1', qty: 1200, unit: 'pcs' },
  { from: 'M2', to: 'W1', qty: 1.5, unit: 'kg' },
  { from: 'W1', to: 'F1' },
  { from: 'W1', to: 'F2' },
  { from: 'F1', to: 'S1' },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}) {
  const selected = ref<string | null>((props.selected as string | null) ?? null)
  const w = mount(
    {
      render: () =>
        h(ChptLotTrace, {
          nodes,
          links,
          rootId: 'W1',
          kinds: { material: { label: '原料', color: 'red' }, wip: { label: '半成品' } },
          ...props,
          selected: selected.value,
          'onUpdate:selected': (v: string | null) => (selected.value = v),
        }),
    },
    { attachTo: document.body }
  )
  mounted.push(w)
  const comp = () => w.findComponent(ChptLotTrace)
  const node = (id: string) => w.findAll('g[role="button"]').find((g) => g.attributes('aria-label')!.startsWith(id))!
  const seg = (label: string) => w.findAll('[role="radio"]').find((r) => r.text().endsWith(label))!
  return { w, selected, comp, node, seg }
}

describe('ChptLotTrace', () => {
  it('圖形：範圍內的批號、摘要、用量、種類圖例、狀態標記與 aria-label', () => {
    const { w, node } = mountIt()
    expect(w.findAll('g[role="button"]')).toHaveLength(6)
    expect(w.text()).toContain('上游 2 個、下游 3 個批號，隔離 1 個')
    expect(w.text()).toContain('1,200 pcs')
    expect(w.text()).toContain('1.5 kg')
    expect(w.text()).toContain('W1-LONG-LABEL-TH…')
    expect(node('M2').attributes('aria-label')).toBe('M2, 原料, 可疑, 上游第 1 層')
    expect(node('W1').attributes('aria-label')).toContain('查詢的批號')
    expect(node('F2').attributes('aria-label')).toBe('F2, product, 隔離, 下游第 1 層')
    expect(node('F2').text()).toContain('HOLD')
    expect(node('M2').find('rect').attributes('style')).toContain('stroke-dasharray')
    expect(w.find('[role="group"][aria-label="種類"]').text()).toContain('原料')
    expect(w.find('[role="group"][aria-label="種類"] span span').attributes('style')).toContain('red')
  })

  it('點選：送出 v-model 與 node-click；不在路徑上的變淡；路徑連線加粗', async () => {
    const { w, selected, comp, node } = mountIt()
    await node('M1').trigger('click')
    expect(selected.value).toBe('M1')
    expect(comp().emitted('node-click')![0][0]).toMatchObject({ id: 'M1' })
    expect(node('M2').attributes('style')).toContain('opacity: 0.35')
    expect(node('M1').attributes('style')).toContain('opacity: 1')
    expect(w.findAll('path').filter((p) => p.attributes('style')!.includes('stroke-width: 2.5'))).toHaveLength(1)
  })

  it('選取的批號不在目前的圖裡時不變淡', async () => {
    const { node, seg } = mountIt({ selected: 'M1' })
    await seg('下游').trigger('click')
    expect(node('F1').attributes('style')).toContain('opacity: 1')
  })

  it('方向：上游 / 下游；搜尋讓不符合的變淡', async () => {
    const { w, seg, node } = mountIt()
    await seg('上游').trigger('click')
    expect(w.findAll('g[role="button"]')).toHaveLength(3)
    await seg('下游').trigger('click')
    expect(w.findAll('g[role="button"]')).toHaveLength(4)
    await w.find('input[type="search"]').setValue('f')
    expect(node('F1').attributes('style')).toContain('opacity: 1')
    expect(node('S1').attributes('style')).toContain('opacity: 0.35')
  })

  it('鍵盤：←→ 沿著連線、↑↓ 同一欄、Home 回查詢批號、Enter 選取；邊界不動；其他鍵不處理', async () => {
    const { node, selected } = mountIt()
    const focused = () => document.activeElement?.getAttribute('aria-label')?.split(',')[0]
    ;(node('W1').element as unknown as HTMLElement).focus()
    await node('W1').trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(['M1', 'M2']).toContain(focused())
    const first = focused()!
    await node(first).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const second = focused()!
    expect(second).not.toBe(first)
    await node(second).trigger('keydown', { key: 'ArrowDown' }) // 已經是最後一個
    await node(second).trigger('keydown', { key: 'ArrowLeft' }) // 沒有更上游
    await nextTick()
    expect(focused()).toBe(second)
    await node(second).trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(focused()).toBe(first)
    await node(first).trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(focused()).toBe('W1-LONG-LABEL-THAT-IS-CLIPPED')
    await node('W1').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(['F1', 'F2']).toContain(focused())
    await node(focused()!).trigger('keydown', { key: 'Enter' })
    expect(['F1', 'F2']).toContain(selected.value)
    await node('W1').trigger('keydown', { key: 'x' })
  })

  it('清單：上游、下游兩棵樹；點選同步選取並標出；循環資料只展開一次', async () => {
    const { w, seg, selected } = mountIt({ defaultView: 'list' })
    expect(w.findAll('[role="tree"]')).toHaveLength(2)
    const items = () => w.findAll('[role="treeitem"]')
    expect(items().map((i) => i.text())).toContain('M11,200 pcs')
    await items().find((i) => i.text().startsWith('M2'))!.trigger('click')
    expect(selected.value).toBe('M2')
    await nextTick()
    expect(items().find((i) => i.text().startsWith('M2'))!.attributes('aria-selected')).toBe('true')
    await seg('上游').trigger('click')
    expect(w.findAll('[role="tree"]')).toHaveLength(1)
    await seg('下游').trigger('click')
    expect(w.find('h4').text()).toBe('下游（做成了什麼）')

    const cyc = mountIt({ defaultView: 'list', links: [{ from: 'M1', to: 'W1' }, { from: 'W1', to: 'M1' }], rootId: 'M1' })
    expect(cyc.w.text()).toContain('（循環，已在上層出現）')
  })

  it('ref.select；selected prop 改變時同步', async () => {
    const { comp, selected, node } = mountIt()
    const api = comp().vm as unknown as { select: (id: string | null) => void }
    api.select('F1')
    expect(selected.value).toBe('F1')
    await nextTick()
    expect(node('F1').attributes('aria-pressed')).toBe('true')
    api.select(null)
    expect(selected.value).toBeNull()
    selected.value = 'M2'
    await nextTick()
    expect(node('M2').attributes('aria-pressed')).toBe('true')
  })

  it('maxDepth、showQty=false', () => {
    const { w } = mountIt({ maxDepth: 1, showQty: false })
    expect(w.findAll('g[role="button"]')).toHaveLength(5)
    expect(w.text()).not.toContain('pcs')
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptLotTrace, { nodes, links, rootId: 'W1' })) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.text()).toContain('2 upstream, 3 downstream lots, 1 on hold')
    expect(w.find('svg').attributes('aria-label')).toBe('Trace graph of W1-LONG-LABEL-THAT-IS-CLIPPED')
  })
})
