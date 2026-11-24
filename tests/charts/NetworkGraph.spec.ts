import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import NetworkGraph from '@/components/library/charts/NetworkGraph.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { NetworkGraphData, NetworkLinkInput, NetworkNodeInput } from '@/components/library/charts/utils/network'

const nodes: NetworkNodeInput[] = [
  { id: 'air', label: '空壓機', group: '公用', value: 8 },
  { id: 'n2', label: '氮氣', group: '公用', value: 3 },
  { id: 'pp', label: '貼片機', group: 'SMT', value: 5 },
  { id: 'reflow', label: '迴焊爐', group: 'SMT', value: 4 },
  { id: 'mes', label: 'MES', group: '資訊', value: 6 },
  { id: 'lonely', label: '孤兒', value: 1 },
]
const links: NetworkLinkInput[] = [
  { source: 'pp', target: 'air', value: 3 },
  { source: 'reflow', target: 'n2' },
  { source: 'n2', target: 'air' },
  { source: 'pp', target: 'mes', value: 2 },
  { source: 'mes', target: 'air' },
  { source: 'pp', target: 'ghost' },
]

type Exposed = {
  fit: () => void
  zoomBy: (f: number) => void
  showPath: (a: string, b: string) => string[] | null
  relayout: () => void
  graph: () => NetworkGraphData
  view: () => { k: number; x: number; y: number }
}

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

function pointer(target: EventTarget, type: string, x: number, y: number, extra: Record<string, unknown> = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    clientX: { value: x },
    clientY: { value: y },
    pointerId: { value: 1 },
    button: { value: 0 },
    pointerType: { value: 'mouse' },
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])),
  })
  target.dispatchEvent(e)
}

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const selected = ref<string | null>((props.selected as string | null) ?? null)
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  const chart = ref<Exposed | null>(null)
  const node = () =>
    h(NetworkGraph, {
      ref: chart,
      nodes,
      links,
      width: 602,
      height: 402,
      ...props,
      selected: selected.value,
      'onUpdate:selected': (v: string | null) => (rec('selected')(v), (selected.value = v)),
      onNodeClick: rec('click'),
      onPath: rec('path'),
      onDroppedLinks: rec('dropped'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const g = (id: string) => w.find(`[data-node="${id}"]`)
  const opacity = (id: string) => Number(/opacity: ([\d.]+)/.exec(g(id).attributes('style') ?? '')![1])
  const vm = () => chart.value!
  /** 節點在畫面上的座標 */
  const screen = (id: string) => {
    const n = vm().graph().byId.get(id)!
    const v = vm().view()
    return [v.x + n.x * v.k, v.y + n.y * v.k] as const
  }
  return { w, g, opacity, vm, emitted, selected, screen }
}

describe('NetworkGraph', () => {
  it('節點、連線、群組圖例、aria、資料表；略過的連線回報', async () => {
    const { w, g, emitted, vm } = mountIt({ title: '相依' })
    await nextTick()
    expect(w.findAll('[data-node]')).toHaveLength(6)
    expect(w.findAll('[data-link]')).toHaveLength(5)
    expect(w.find('svg').attributes('aria-label')).toBe('相依：6 個節點、5 條連線')
    expect(g('pp').attributes('aria-label')).toBe('貼片機，群組：SMT，連線 2 條，數值 5')
    expect(g('lonely').attributes('aria-label')).toBe('孤兒，連線 0 條，數值 1')
    expect(w.findAll('[role="group"] button').map((b) => b.text())).toEqual(['公用', 'SMT', '資訊'])
    expect(w.findAll('tbody tr')).toHaveLength(5)
    expect(w.find('tbody tr').text()).toBe('貼片機空壓機3')
    expect(emitted.dropped).toEqual([[links[5]]])
    // 版面已全覽：所有節點都在畫面裡
    for (const n of vm().graph().nodes) {
      const v = vm().view()
      const x = v.x + n.x * v.k
      const y = v.y + n.y * v.k
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(600)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(400)
    }
    // 大小：value 越大越大
    const r = (id: string) => Number(g(id).findAll('circle').at(-1)!.attributes('r'))
    expect(r('air')).toBeGreaterThan(r('n2'))
  })

  it('滑過高亮鄰居；點選 / 再點取消；Shift + 點找最短路徑；沒有路徑', async () => {
    const { w, g, opacity, emitted, selected } = mountIt()
    await g('pp').trigger('mouseenter')
    expect(opacity('air')).toBe(1)
    expect(opacity('mes')).toBe(1)
    expect(opacity('n2')).toBe(0.2)
    expect(w.find('.pointer-events-none.absolute').text()).toContain('貼片機')
    await g('pp').trigger('mouseleave')
    expect(opacity('n2')).toBe(1)
    await g('reflow').trigger('click')
    expect(selected.value).toBe('reflow')
    expect(emitted.click).toEqual([{ id: 'reflow', label: '迴焊爐', group: 'SMT', value: 4, degree: 1 }])
    expect(g('reflow').attributes('aria-pressed')).toBe('true')
    expect(opacity('pp')).toBe(0.2)
    await g('mes').trigger('click', { shiftKey: true })
    expect(emitted.path).toEqual([['reflow', 'n2', 'air', 'mes']])
    expect(w.find('[data-path]').text()).toBe('最短路徑（3 步）：迴焊爐 → 氮氣 → 空壓機 → MES')
    expect(opacity('lonely')).toBe(0.2)
    expect(opacity('air')).toBe(1)
    await g('lonely').trigger('click', { shiftKey: true })
    expect(emitted.path[1]).toBeNull()
    expect(w.find('[aria-live="polite"]').text()).toBe('兩者之間沒有路徑')
    await g('reflow').trigger('click')
    expect(selected.value).toBeNull()
    // Shift + 點但還沒選取：當成一般點選
    await g('mes').trigger('click', { shiftKey: true })
    expect(selected.value).toBe('mes')
  })

  it('圖例隱藏群組；縮放按鈕、全覽、Ctrl + 滾輪、平移', async () => {
    const { w, vm } = mountIt()
    const legend = () => w.findAll('[role="group"] button')
    await legend()[0].trigger('click')
    expect(w.findAll('[data-node]').map((x) => x.attributes('data-node')).sort()).toEqual(['lonely', 'mes', 'pp', 'reflow'])
    expect(w.findAll('[data-link]')).toHaveLength(1)
    expect(legend()[0].attributes('aria-pressed')).toBe('false')
    await legend()[0].trigger('click')
    expect(w.findAll('[data-node]')).toHaveLength(6)
    const k0 = vm().view().k
    await w.find('button[aria-label="放大"]').trigger('click')
    expect(vm().view().k).toBeCloseTo(k0 * 1.3)
    await w.find('button[aria-label="縮小"]').trigger('click')
    await w.find('button[aria-label="縮小"]').trigger('click')
    expect(vm().view().k).toBeCloseTo(k0 / 1.3)
    await w.find('button[aria-label="全覽"]').trigger('click')
    expect(vm().view().k).toBeCloseTo(k0)
    // 沒按 Ctrl 的滾輪不縮放（讓頁面捲動）
    const svg = w.find('svg')
    const wheel = (init: WheelEventInit) => svg.element.dispatchEvent(new WheelEvent('wheel', { cancelable: true, ...init }))
    wheel({ deltaY: -100 })
    expect(vm().view().k).toBeCloseTo(k0)
    wheel({ deltaY: -100, ctrlKey: true, clientX: 300, clientY: 200 })
    expect(vm().view().k).toBeCloseTo(k0 * Math.exp(0.2))
    // 平移
    const v0 = { ...vm().view() }
    pointer(svg.element, 'pointerdown', 10, 10)
    pointer(window, 'pointermove', 11, 10) // 太小不算
    pointer(window, 'pointermove', 60, 40)
    pointer(window, 'pointerup', 60, 40)
    expect(vm().view().x).toBeCloseTo(v0.x + 50)
    expect(vm().view().y).toBeCloseTo(v0.y + 30)
    // 右鍵不平移
    pointer(svg.element, 'pointerdown', 10, 10, { button: 2 })
    pointer(window, 'pointermove', 100, 100)
    expect(vm().view().x).toBeCloseTo(v0.x + 50)
    vm().zoomBy(100)
    expect(vm().view().k).toBe(8)
  })

  it('拖曳節點釘住並抑制點擊；雙擊放開；relayout', async () => {
    const { g, vm, screen, selected } = mountIt()
    const [sx, sy] = screen('lonely')
    pointer(g('lonely').element, 'pointerdown', sx, sy)
    pointer(window, 'pointermove', sx + 40, sy + 20)
    pointer(window, 'pointerup', sx + 40, sy + 20)
    await nextTick()
    const n = vm().graph().byId.get('lonely')!
    const v = vm().view()
    expect(n.fx).toBeCloseTo((sx + 40 - v.x) / v.k)
    expect(n.fy).toBeCloseTo((sy + 20 - v.y) / v.k)
    expect(g('lonely').find('[data-pin]').exists()).toBe(true)
    expect(g('lonely').attributes('aria-label')).toContain('已釘住')
    await g('lonely').trigger('click')
    expect(selected.value).toBeNull()
    await new Promise((r) => setTimeout(r))
    await g('lonely').trigger('dblclick')
    expect(n.fx).toBeNull()
    expect(g('lonely').find('[data-pin]').exists()).toBe(false)
    // 再拖一次後 relayout 清掉釘住
    pointer(g('air').element, 'pointerdown', 0, 0)
    pointer(window, 'pointermove', 30, 30)
    pointer(window, 'pointercancel', 30, 30)
    expect(vm().graph().byId.get('air')!.fx).not.toBeNull()
    vm().relayout()
    await nextTick()
    expect(vm().graph().byId.get('air')!.fx).toBeUndefined()
    // 右鍵不拖曳
    pointer(g('mes').element, 'pointerdown', 0, 0, { button: 2 })
    pointer(window, 'pointermove', 50, 50)
    expect(vm().graph().byId.get('mes')!.fx).toBeUndefined()
  })

  it('鍵盤：方向鍵依連線數順序、Home / End、Enter 選取、Escape 取消', async () => {
    const { w, selected, emitted } = mountIt()
    const stop = () => w.find('[data-node][tabindex="0"]')
    // 連線數最多的是空壓機（3 條）
    expect(stop().attributes('data-node')).toBe('air')
    ;(stop().element as SVGGElement).focus()
    await stop().trigger('focus')
    expect(w.find('[aria-live="polite"]').text()).toBe('空壓機，群組：公用，連線 3 條，數值 8，相鄰：貼片機、氮氣、MES')
    await stop().trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const second = stop().attributes('data-node')
    expect(['pp', 'n2', 'mes']).toContain(second)
    expect(document.activeElement?.getAttribute('data-node')).toBe(second)
    await stop().trigger('keydown', { key: 'End' })
    await nextTick()
    expect(stop().attributes('data-node')).toBe('lonely')
    await stop().trigger('focus')
    expect(w.find('[aria-live="polite"]').text()).toContain('沒有相鄰節點')
    await stop().trigger('keydown', { key: 'ArrowRight' }) // 已是最後
    await stop().trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(stop().attributes('data-node')).toBe('air')
    await stop().trigger('keydown', { key: 'ArrowUp' }) // 已是第一個
    await stop().trigger('keydown', { key: 'ArrowLeft' })
    await stop().trigger('keydown', { key: 'Enter' })
    expect(selected.value).toBe('air')
    await stop().trigger('keydown', { key: 'x' })
    await stop().trigger('keydown', { key: 'Escape' })
    expect(selected.value).toBeNull()
    expect(emitted.selected).toEqual(['air', null])
    await stop().trigger('blur')
  })

  it('有方向：箭頭與縮短的線段；外部改 selected；大小與名稱選項；空資料', async () => {
    const { w } = mountIt({ directed: true, labels: 'always', sizeBy: 'none' })
    expect(w.find('marker').exists()).toBe(true)
    expect(w.find('[data-link]').attributes('marker-end')).toMatch(/^url\(#.+-arrow\)$/)
    expect(w.findAll('[data-node] text')).toHaveLength(6)
    const rs = new Set(w.findAll('[data-node]').map((x) => x.findAll('circle').at(-1)!.attributes('r')))
    expect(rs.size).toBe(1)
    const never = mountIt({ labels: 'never', sizeBy: 'degree', selected: 'air' })
    expect(never.w.findAll('[data-node] text')).toHaveLength(0)
    expect(never.g('air').attributes('aria-pressed')).toBe('true')
    never.selected.value = 'mes'
    await nextTick()
    expect(never.g('mes').attributes('aria-pressed')).toBe('true')
    expect(never.g('mes').attributes('aria-label')).not.toContain('數值')
    // 沒有 value 時 auto 用連線數
    const auto = mountIt({ nodes: nodes.map(({ value: _v, ...n }) => n) })
    expect(auto.g('pp').attributes('aria-label')).not.toContain('數值')
    const empty = mountIt({ nodes: [], links: [], emptyText: '沒東西' })
    expect(empty.w.text()).toContain('沒東西')
    expect(empty.w.find('svg').exists()).toBe(false)
  })

  it('資料小改保留位置；showPath；連線一樣粗時用中間值；群組顏色與數值格式；英文', async () => {
    const data = ref({ nodes, links })
    const chart = ref<Exposed | null>(null)
    const w = mount(
      () => h(NetworkGraph, { ref: chart, nodes: data.value.nodes, links: data.value.links, width: 600, height: 400, groupColors: { SMT: 'hotpink' }, valueFormat: (v: number) => `${v}台` }),
      { attachTo: document.body }
    )
    mounted.push(w)
    const before = chart.value!.graph().byId.get('air')!
    const bx = before.x
    data.value = { nodes: [...nodes, { id: 'new', label: '新', group: 'SMT' }], links: [...links, { source: 'new', target: 'pp' }] }
    await nextTick()
    const after = chart.value!.graph().byId.get('air')!
    expect(Math.abs(after.x - bx)).toBeLessThan(60)
    expect(w.find('[data-node="pp"]').findAll('circle').at(-1)!.attributes('style')).toContain('hotpink')
    expect(w.find('[data-node="pp"]').attributes('aria-label')).toContain('5台')
    expect(chart.value!.showPath('reflow', 'pp')).toEqual(['reflow', 'n2', 'air', 'pp'])
    await nextTick()
    expect(w.find('[data-path]').exists()).toBe(true)
    const same = mountIt({ links: [{ source: 'air', target: 'pp' }, { source: 'pp', target: 'mes' }] })
    const sw = same.w.findAll('[data-link]').map((l) => l.attributes('style'))
    expect(sw[0]).toBe(sw[1])
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.g('pp').attributes('aria-label')).toBe('貼片機, Group: SMT, 2 links, Value 5')
    expect(en.g('lonely').attributes('aria-label')).toBe('孤兒, 0 links, Value 1')
    await en.g('n2').trigger('click')
    await en.g('mes').trigger('click', { shiftKey: true })
    expect(en.w.find('[data-path]').text()).toBe('Shortest path (2 steps): 氮氣 → 空壓機 → MES')
    await en.g('reflow').trigger('click')
    await en.g('n2').trigger('click', { shiftKey: true })
    expect(en.w.find('[data-path]').text()).toBe('Shortest path (1 step): 迴焊爐 → 氮氣')
    expect(en.g('lonely').attributes('aria-label')).toBe('孤兒, 0 links, Value 1')
    expect(en.g('reflow').attributes('aria-label')).toBe('迴焊爐, Group: SMT, 1 link, Value 4')
  })

  it('節點多時改用 Canvas：繪製、滑過、點選、拖曳空白處、雙擊放開', async () => {
    const calls: string[] = []
    const ctx = new Proxy(
      {},
      {
        get: (_t, k) => (typeof k === 'string' && ['canvas'].includes(k) ? undefined : (...args: unknown[]) => calls.push(`${String(k)}:${args.length}`)),
        set: () => true,
      }
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    const { w, vm, screen, selected, emitted } = mountIt({ canvasThreshold: 3, labels: 'always' })
    await nextTick()
    await nextTick()
    const canvas = w.find('canvas')
    expect(canvas.exists()).toBe(true)
    expect(w.find('svg').exists()).toBe(false)
    expect(canvas.attributes('aria-label')).toBe('關係圖：6 個節點、5 條連線')
    expect(calls.filter((c) => c.startsWith('arc')).length).toBeGreaterThanOrEqual(6)
    expect(calls.filter((c) => c.startsWith('fillText')).length % 6).toBe(0)
    const [x, y] = screen('mes')
    pointer(canvas.element, 'pointermove', x, y)
    await nextTick()
    expect(w.find('.pointer-events-none.absolute').text()).toContain('MES')
    pointer(canvas.element, 'pointermove', -500, -500)
    await nextTick()
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
    // 點節點（沒移動）＝選取
    pointer(canvas.element, 'pointerdown', x, y)
    pointer(window, 'pointerup', x, y)
    expect(selected.value).toBe('mes')
    expect(emitted.click).toHaveLength(1)
    calls.length = 0
    await nextTick()
    await nextTick()
    expect(calls.some((c) => c.startsWith('stroke'))).toBe(true)
    // 點空白處＝取消選取
    pointer(canvas.element, 'pointerdown', -500, -500)
    pointer(window, 'pointerup', -500, -500)
    expect(selected.value).toBeNull()
    // 拖節點 → 釘住，雙擊放開
    const [ax, ay] = screen('air')
    pointer(canvas.element, 'pointerdown', ax, ay)
    pointer(window, 'pointermove', ax + 30, ay)
    pointer(window, 'pointerup', ax + 30, ay)
    expect(vm().graph().byId.get('air')!.fx).not.toBeNull()
    const [bx, by] = screen('air')
    await canvas.trigger('dblclick', { clientX: bx, clientY: by })
    expect(vm().graph().byId.get('air')!.fx).toBeNull()
    await canvas.trigger('dblclick', { clientX: -500, clientY: -500 })
    pointer(canvas.element, 'pointerleave', 0, 0)
    // 切深色模式會重畫
    calls.length = 0
    document.documentElement.classList.add('dark')
    await new Promise((r) => setTimeout(r))
    await nextTick()
    document.documentElement.classList.remove('dark')
    expect(calls.some((c) => c.startsWith('clearRect'))).toBe(true)
  })
})
