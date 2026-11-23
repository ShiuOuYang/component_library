import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ParallelCoordinatesChart from '@/components/library/charts/ParallelCoordinatesChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { ParallelAxis, ParallelRow } from '@/components/library/charts/utils/parallel'

const axes: ParallelAxis[] = [
  { key: 'a', label: 'A', domain: [0, 100] },
  { key: 'b', label: 'B', domain: [0, 10], unit: 'mm' },
  { key: 'c', label: 'C', domain: [0, 1], reverse: true },
]
const data: ParallelRow[] = [
  { id: 'r1', a: 90, b: 1, c: 0.1, line: 'L1' },
  { id: 'r2', a: 60, b: 5, c: 0.5, line: 'L2' },
  { id: 'r3', a: 10, b: 9, c: null, line: 'L1' },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** 寬 720、高 380：繪圖區 left 44、top 34、652 × 322；三條軸 x = 0、326、652 */
const TOP = 34
const LEFT = 44
const PH = 322
const yAt = (ratio: number) => TOP + PH * (1 - ratio)

function pointer(el: Element, type: string, x: number, y: number, extra: Record<string, unknown> = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    clientX: { value: x },
    clientY: { value: y },
    pointerId: { value: 1 },
    button: { value: 0 },
    pointerType: { value: 'mouse' },
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])),
  })
  el.dispatchEvent(e)
}

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const brushes = ref<Record<string, [number, number]>>((props.brushes as Record<string, [number, number]>) ?? {})
  const order = ref<string[] | null>(null)
  const node = () =>
    h(ParallelCoordinatesChart, {
      data,
      axes,
      labelKey: 'id',
      ...props,
      brushes: brushes.value,
      order: order.value,
      'onUpdate:brushes': (v: Record<string, [number, number]>) => (brushes.value = v),
      'onUpdate:order': (v: string[]) => (order.value = v),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const chart = () => w.findComponent(ParallelCoordinatesChart)
  const hit = (i: number) => w.findAll('rect[fill="transparent"]')[i].element
  const titles = () => w.findAll('g[role="button"]')
  const lines = () => w.findAll('svg g[fill="none"] path')
  return { w, chart, hit, titles, lines, brushes, order }
}

describe('ParallelCoordinatesChart', () => {
  it('每筆一條線（缺值的軸斷開）、軸名稱、刻度、reverse 標 ↓、aria-label', () => {
    const { w, lines, titles } = mountIt({ title: '製程' })
    expect(lines()).toHaveLength(3)
    // r3 的 c 是 null：只畫到 B
    expect(lines()[2].attributes('d')!.split('L')).toHaveLength(2)
    expect(titles().map((t) => t.attributes('aria-label'))).toEqual(['A，範圍 0 到 100', 'B，範圍 0 到 10', 'C，範圍 0 到 1'])
    expect(titles()[2].text()).toContain('↓')
    expect(w.text()).toContain('mm')
    expect(w.find('svg').attributes('aria-label')).toBe('製程：A、B、C，3 筆資料')
    expect(w.text()).toContain('共 3 筆')
  })

  it('在軸上拖曳框選：篩選、送出 update:brushes 與 select；點一下清除', async () => {
    const { w, chart, hit, brushes, lines } = mountIt()
    pointer(hit(0), 'pointerdown', LEFT, yAt(1))
    pointer(hit(0), 'pointermove', LEFT, yAt(0.5))
    pointer(hit(0), 'pointerup', LEFT, yAt(0.5))
    await nextTick()
    expect(brushes.value.a[0]).toBeCloseTo(50)
    expect(brushes.value.a[1]).toBeCloseTo(100)
    expect((chart().emitted('select')![0][0] as ParallelRow[]).map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(w.text()).toContain('選到 2 / 3 筆')
    // 沒選到的線畫在下面、變淡
    expect(lines()[0].attributes('style')).toContain('surface-muted')
    expect(w.findAll('g[role="button"]')[0].attributes('aria-label')).toContain('已框選 50 到 100')
    // 點一下（不拖）：清除
    pointer(hit(0), 'pointerdown', LEFT, yAt(0.2))
    pointer(hit(0), 'pointerup', LEFT, yAt(0.2))
    await nextTick()
    expect(brushes.value).toEqual({})
    // 沒有框選時點一下：不做事
    pointer(hit(0), 'pointerdown', LEFT, yAt(0.2))
    pointer(hit(0), 'pointerup', LEFT, yAt(0.2))
    expect(chart().emitted('update:brushes')).toHaveLength(2)
  })

  it('拖動已框選的範圍平移，不會超出軸', async () => {
    const { hit, brushes } = mountIt({ brushes: { b: [4, 6] } })
    pointer(hit(1), 'pointerdown', LEFT + 326, yAt(0.5))
    pointer(hit(1), 'pointermove', LEFT + 326, yAt(0.7))
    pointer(hit(1), 'pointerup', LEFT + 326, yAt(0.7))
    await nextTick()
    expect(brushes.value.b[0]).toBeCloseTo(6)
    expect(brushes.value.b[1]).toBeCloseTo(8)
    pointer(hit(1), 'pointerdown', LEFT + 326, yAt(0.7))
    pointer(hit(1), 'pointermove', LEFT + 326, yAt(1.5))
    pointer(hit(1), 'pointerup', LEFT + 326, yAt(1.5))
    await nextTick()
    expect(brushes.value.b[1]).toBeCloseTo(10)
  })

  it('pointercancel 還原；右鍵不框選；外部改 brushes 時跟著變', async () => {
    const { w, hit, brushes } = mountIt()
    pointer(hit(0), 'pointerdown', LEFT, yAt(1))
    pointer(hit(0), 'pointermove', LEFT, yAt(0.5))
    pointer(hit(0), 'pointercancel', LEFT, yAt(0.5))
    await nextTick()
    expect(w.find('rect[rx="2"]').exists()).toBe(false)
    pointer(hit(0), 'pointerdown', LEFT, yAt(1), { button: 2 })
    pointer(hit(0), 'pointermove', LEFT, yAt(0.5))
    expect(brushes.value).toEqual({})
    brushes.value = { c: [0, 0.3] }
    await nextTick()
    expect(w.text()).toContain('選到 1 / 3 筆') // c 是 null 的不算
  })

  it('拖曳軸名稱換位置；鍵盤 ←→ 換位置、Delete 清除框選', async () => {
    const { titles, order, brushes, chart } = mountIt({ brushes: { b: [0, 6] } })
    const t0 = titles()[0].element
    pointer(t0, 'pointerdown', LEFT, 10)
    pointer(t0, 'pointermove', LEFT + 500, 10)
    await nextTick()
    pointer(t0, 'pointerup', LEFT + 500, 10)
    await nextTick()
    expect(order.value).toEqual(['b', 'a', 'c'])
    await titles()[1].trigger('keydown', { key: 'ArrowRight' })
    expect(order.value).toEqual(['b', 'c', 'a'])
    await titles()[0].trigger('keydown', { key: 'ArrowLeft' }) // 已經在最左
    expect(order.value).toEqual(['b', 'c', 'a'])
    await titles()[0].trigger('keydown', { key: 'Delete' })
    expect(brushes.value).toEqual({})
    await titles()[0].trigger('keydown', { key: 'Backspace' }) // 沒有框選：不做事
    expect(chart().emitted('update:brushes')).toHaveLength(1)
    // 沒拖動：不換位置
    pointer(titles()[0].element, 'pointerdown', LEFT, 10)
    pointer(titles()[0].element, 'pointerup', LEFT + 1, 10)
    expect(chart().emitted('update:order')).toHaveLength(2)
  })

  it('滑過線：提示（名稱、各軸數值與單位、缺值）；點擊送出 line-click', async () => {
    const { w, lines, chart } = mountIt()
    await lines()[2].trigger('pointerenter')
    expect(w.find('[data-export-ignore]').text()).toBe('r3A：10B：9 mmC：—')
    await lines()[2].trigger('click')
    expect(chart().emitted('line-click')![0][0]).toBe(data[2])
    await w.find('svg g[fill="none"]').trigger('pointerleave')
    expect(w.find('[data-export-ignore]').exists()).toBe(false)
    // 沒有 labelKey：第幾筆
    const n = mountIt({ labelKey: '' })
    await n.lines()[0].trigger('pointerenter')
    expect(n.w.find('[data-export-ignore]').text()).toContain('第 1 筆')
  })

  it('依數值上色（色階說明）與依文字上色（類別）', () => {
    const num = mountIt({ colorBy: 'a', colorLabel: '良率' })
    expect(num.w.text()).toContain('良率')
    expect(num.w.text()).toContain('10')
    expect(num.w.text()).toContain('90')
    const cat = mountIt({ colorBy: 'line' })
    expect(cat.w.text()).toContain('L1')
    expect(cat.w.text()).toContain('L2')
    expect(cat.lines()[0].attributes('style')).toContain('chart-1')
    expect(cat.lines()[1].attributes('style')).toContain('chart-2')
  })

  it('沒有資料或軸不夠：提示', () => {
    expect(mountIt({ data: [] }).w.text()).toContain('沒有資料')
    expect(mountIt({ axes: [axes[0]], emptyText: '空' }).w.text()).toContain('空')
  })

  it('大量資料改用 Canvas；主題改變時重畫', async () => {
    const strokes: unknown[] = []
    const ctx = { setTransform: () => {}, clearRect: () => {}, stroke: (p: unknown) => strokes.push(p), strokeStyle: '', globalAlpha: 1, lineWidth: 1 }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
    vi.stubGlobal('Path2D', class { constructor(public d: string) {} })
    const { w } = mountIt({ canvasThreshold: 2 })
    await nextTick()
    await nextTick()
    expect(w.find('canvas').exists()).toBe(true)
    // 每次重畫畫 3 條（掛載後容器出現時會再畫一次）
    expect(strokes.length % 3).toBe(0)
    expect(strokes.length).toBeGreaterThan(0)
    strokes.length = 0
    document.documentElement.classList.add('dark')
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()
    await nextTick()
    expect(strokes.length).toBeGreaterThan(0)
    document.documentElement.classList.remove('dark')
  })

  it('方法：setBrush、clearBrushes、selected', async () => {
    const { chart } = mountIt()
    const vm = chart().vm as unknown as { setBrush: (k: string, r: [number, number] | null) => void; clearBrushes: () => void; selected: ParallelRow[] }
    vm.setBrush('a', [50, 100])
    await nextTick()
    expect(vm.selected.map((r) => r.id)).toEqual(['r1', 'r2'])
    vm.setBrush('a', null)
    await nextTick()
    expect(vm.selected).toHaveLength(3)
    vm.setBrush('b', [0, 2])
    vm.clearBrushes()
    await nextTick()
    expect(vm.selected).toHaveLength(3)
  })

  it('窄的時候軸名稱上下交錯', () => {
    const { titles } = mountIt({ width: 200, axes: [{ key: 'a', label: '很長的參數名稱一' }, { key: 'b', label: '很長的參數名稱二' }, { key: 'c', label: '很長的參數名稱三' }] })
    expect(titles()[0].attributes('transform')).toBe('translate(0,-22)')
    expect(titles()[1].attributes('transform')).toBe('translate(0,-40)')
  })

  it('英文語系', () => {
    const { w } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.text()).toContain('3 rows')
    expect(w.findAll('g[role="button"]')[0].attributes('aria-label')).toBe('A, range 0 to 100')
  })
})
