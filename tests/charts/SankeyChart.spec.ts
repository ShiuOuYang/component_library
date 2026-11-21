import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import SankeyChart from '@/components/library/charts/SankeyChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

const nodes = [
  { id: 'smt', label: 'SMT 爐後 AOI' },
  { id: 'mrb', label: 'MRB' },
  { id: 'rework', label: '重工' },
  { id: 'scrap', label: '報廢', color: 'red' },
  { id: 'ok', label: '良品' },
]
const links = [
  { source: 'smt', target: 'mrb', value: 300 },
  { source: 'mrb', target: 'rework', value: 200 },
  { source: 'mrb', target: 'scrap', value: 100 },
  { source: 'rework', target: 'ok', value: 180 },
  { source: 'rework', target: 'scrap', value: 20 },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
function mountIt(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
  const w = mount(SankeyChart, { props: { nodes, links, width: 800, height: 300, unit: '片', ...props } as never, attrs, attachTo: document.body })
  mounted.push(w)
  const node = (label: string) => w.findAll('g[role="button"]').find((g) => g.attributes('aria-label')!.startsWith(label))!
  const opacity = () => w.findAll('path.sankey-link').map((p) => p.attributes('style')!.match(/stroke-opacity: ([\d.]+)/)![1])
  return { w, node, opacity }
}

describe('SankeyChart', () => {
  it('節點、連線、名稱與數量、aria-label、資料表', () => {
    const { w, node } = mountIt({ title: '去向' })
    expect(w.findAll('g[role="button"]')).toHaveLength(5)
    expect(w.findAll('path.sankey-link')).toHaveLength(5)
    expect(node('MRB').attributes('aria-label')).toBe('MRB, 流入 300 片, 流出 300 片')
    expect(node('SMT').text()).toContain('300 片')
    expect(w.find('svg').attributes('aria-label')).toBe('去向')
    expect(w.findAll('table tbody tr').map((r) => r.text())).toContain('MRB重工200 片')
    expect(w.find('table caption').text()).toBe('去向')
  })

  it('滑過節點：高亮經過它的所有上下游流向並顯示 tooltip；離開恢復', async () => {
    const { w, node, opacity } = mountIt()
    expect(new Set(opacity())).toEqual(new Set(['0.38']))
    await node('重工').trigger('mouseenter')
    // 重工 的上游：smt→mrb、mrb→rework；下游：rework→ok、rework→scrap；不在路徑上的：mrb→scrap
    expect(opacity()).toEqual(['0.65', '0.65', '0.08', '0.65', '0.65'])
    expect(w.find('[data-export-ignore]').text()).toContain('流入 200 片')
    expect(node('SMT').find('rect').attributes('style')).toContain('opacity: 1')
    await w.find('svg').trigger('mouseleave')
    expect(w.find('[data-export-ignore]').exists()).toBe(false)
  })

  it('滑過連線：它與它的上下游；tooltip 顯示佔來源流出的比例', async () => {
    const { w, opacity } = mountIt()
    await w.findAll('path.sankey-link')[2].trigger('mouseenter') // mrb → scrap
    expect(opacity()).toEqual(['0.65', '0.08', '0.65', '0.08', '0.08'])
    expect(w.find('[data-export-ignore]').text()).toContain('佔 MRB 流出的 33.3%')
  })

  it('點擊節點 / 連線送出事件；有綁事件時是手形游標', async () => {
    const nodeClicks: unknown[] = []
    const linkClicks: unknown[] = []
    const { w, node } = mountIt({}, { onNodeClick: (n: unknown) => nodeClicks.push(n), onLinkClick: (l: unknown) => linkClicks.push(l) })
    expect(node('MRB').classes()).toContain('cursor-pointer')
    await node('MRB').trigger('click')
    await w.findAll('path.sankey-link')[0].trigger('click')
    expect(nodeClicks).toEqual([{ id: 'mrb', label: 'MRB', value: 300 }])
    expect(linkClicks).toEqual([{ source: 'smt', target: 'mrb', value: 300 }])
    expect(mountIt().node('MRB').classes()).not.toContain('cursor-pointer')
  })

  it('鍵盤：一個 Tab 停駐點；←→ 沿最大流量、↑↓ 同一欄、Enter 點擊、Escape 收起；焦點離開收起 tooltip', async () => {
    const clicks: unknown[] = []
    const { w, node } = mountIt({}, { onNodeClick: (n: unknown) => clicks.push(n) })
    const tabbable = () => w.findAll('g[role="button"]').filter((g) => g.attributes('tabindex') === '0')
    expect(tabbable().map((g) => g.attributes('aria-label')!.split(',')[0])).toEqual(['SMT 爐後 AOI'])
    const focusedLabel = () => document.activeElement?.getAttribute('aria-label')?.split(',')[0]
    ;(node('SMT').element as unknown as HTMLElement).focus()
    await nextTick()
    expect(w.find('[aria-live="polite"]').text()).toContain('SMT 爐後 AOI')
    await node('SMT').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(focusedLabel()).toBe('MRB')
    await node('MRB').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(focusedLabel()).toBe('重工')
    await node('重工').trigger('keydown', { key: 'ArrowDown' }) // 這一欄只有重工：不動
    await nextTick()
    expect(focusedLabel()).toBe('重工')
    await node('重工').trigger('keydown', { key: 'ArrowRight' }) // 最大流量 → 良品
    await nextTick()
    expect(focusedLabel()).toBe('良品')
    // 最後一欄有良品與報廢：依實際位置決定上下
    const lay = (w.vm as unknown as { layout: () => { nodes: Array<{ label: string; y0: number }> } }).layout()
    const [upper, lower] = lay.nodes.filter((n) => n.label === '良品' || n.label === '報廢').sort((a, b) => a.y0 - b.y0).map((n) => n.label)
    ;(node(upper).element as unknown as HTMLElement).focus()
    await node(upper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(focusedLabel()).toBe(lower)
    await node(lower).trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(focusedLabel()).toBe(upper)
    ;(node('重工').element as unknown as HTMLElement).focus()
    await node('重工').trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(focusedLabel()).toBe('MRB')
    await node('MRB').trigger('keydown', { key: 'Enter' })
    expect(clicks).toEqual([{ id: 'mrb', label: 'MRB', value: 300 }])
    await node('MRB').trigger('keydown', { key: 'Escape' })
    expect(w.find('[data-export-ignore]').exists()).toBe(false)
    await node('MRB').trigger('keydown', { key: 'ArrowUp' }) // 同欄只有一個：不動
    await node('MRB').trigger('keydown', { key: 'x' })
    ;(node('SMT').element as unknown as HTMLElement).focus()
    await nextTick()
    await node('SMT').trigger('keydown', { key: 'ArrowLeft' }) // 沒有上游
    await node('SMT').trigger('blur')
    expect(w.find('[data-export-ignore]').exists()).toBe(false)
  })

  it('顏色：節點指定色、連線跟來源 / 目標 / 中性', () => {
    const src = mountIt()
    expect(src.node('報廢').find('rect').attributes('style')).toContain('red')
    expect(src.w.findAll('path.sankey-link')[2].attributes('style')).not.toContain('red')
    const tgt = mountIt({ linkColor: 'target' })
    expect(tgt.w.findAll('path.sankey-link')[2].attributes('style')).toContain('red')
    const neu = mountIt({ linkColor: 'neutral' })
    expect(neu.w.findAll('path.sankey-link')[0].attributes('style')).toContain('--t-stroke-dark')
  })

  it('窄的時候截斷名稱、不顯示數量；valueFormat；showValues=false', () => {
    const narrow = mountIt({ width: 260 })
    expect(narrow.node('SMT').text()).toMatch(/…$/)
    expect(narrow.node('SMT').text()).not.toContain('片')
    const f = mountIt({ valueFormat: (v: number) => `#${v}` })
    expect(f.node('MRB').text()).toContain('#300 片')
    expect(mountIt({ showValues: false }).node('MRB').text()).toBe('MRB')
  })

  it('循環送出 cycle 事件；沒有連線時顯示空狀態', async () => {
    const cycles: unknown[] = []
    mountIt({ links: [...links, { source: 'ok', target: 'smt', value: 5 }] }, { onCycle: (c: unknown) => cycles.push(c) })
    await nextTick()
    expect(cycles).toEqual([[{ source: 'ok', target: 'smt', value: 5 }]])
    const empty = mountIt({ links: [] })
    expect(empty.w.text()).toContain('沒有資料')
    expect(mountIt({ links: [], emptyText: '無' }).w.text()).toContain('無')
  })

  it('layout() 方法；一欄時名稱在右側', () => {
    const { w } = mountIt()
    expect((w.vm as unknown as { layout: () => { columns: number } }).layout().columns).toBe(4)
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(SankeyChart, { nodes, links, width: 800, height: 300 })) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.find('svg').attributes('aria-label')).toBe('Flow chart')
    expect(w.find('g[role="button"]').attributes('aria-label')).toContain('Out 300')
  })
})
