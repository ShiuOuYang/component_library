import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ScatterChart from '@/components/library/charts/ScatterChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { ScatterPoint } from '@/components/library/charts/utils/scatter'

/** A：y = x；B：y = 10 − x（各 6 點）；加一個無效點 */
const data: ScatterPoint[] = [
  ...[0, 2, 4, 6, 8, 10].map((x) => ({ x, y: x, category: 'A', label: `a${x}` })),
  ...[0, 2, 4, 6, 8, 10].map((x) => ({ x, y: 10 - x, category: 'B', label: `b${x}` })),
  { x: Number.NaN, y: 1, category: 'A' },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

/** 版面：寬 640、高 400，沒有軸名稱 → 繪圖區 left 48、top 12、576 × 360；domain 固定 0–10 */
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const node = () => h(ScatterChart, { data, xDomain: [0, 10], yDomain: [0, 10], ...props })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const chart = () => w.findComponent(ScatterChart)
  const overlay = () => w.find('rect[fill="transparent"]')
  return { w, chart, overlay }
}

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
/** 資料座標 → 繪圖區像素 */
const at = (x: number, y: number) => [x * 57.6, 360 - y * 36] as const

describe('ScatterChart', () => {
  it('點、刻度、分類圖例、每組迴歸（預設全部一條虛線）、aria-label', () => {
    const { w } = mountIt({ title: '測試' })
    expect(w.findAll('circle')).toHaveLength(12)
    const first = w.findAll('circle')[0]
    expect(Number(first.attributes('cx'))).toBeCloseTo(0)
    expect(Number(first.attributes('cy'))).toBeCloseTo(360)
    expect(w.findAll('[role="group"] button').map((b) => b.text())).toEqual(['A', 'B'])
    // 全部一條：A 與 B 對稱 → 斜率 0、截距 5
    expect(w.findAll('ul li').map((l) => l.text())).toEqual(['y = 0x + 5，R² = 0.000，n = 12'])
    // 圖上一條、圖例一條
    expect(w.findAll('line[stroke-dasharray="6 4"]')).toHaveLength(2)
    expect(w.find('svg[role="img"]').attributes('aria-label')).toBe('測試：12 個點，X 軸 X、Y 軸 Y；R² 0.00')
    expect(w.findAll('table tbody tr').map((r) => r.text())).toEqual(['全部12y = 0x + 50.000'])
  })

  it('regression="category"：每個分類一條；none 不畫', async () => {
    const { w } = mountIt({ regression: 'category' })
    expect(w.findAll('ul li').map((l) => l.text())).toEqual(['A：y = 1x + 0，R² = 1.000，n = 6', 'B：y = −1x + 10，R² = 1.000，n = 6'])
    // 完全線性：信賴帶寬度 0，但仍有路徑
    expect(w.findAll('path')).toHaveLength(2)
    await w.setProps({})
    const none = mountIt({ regression: 'none' })
    expect(none.w.find('ul').exists()).toBe(false)
    expect(none.w.find('table').exists()).toBe(false)
  })

  it('沒有分類時：沒有圖例；category 模式退回全部一條', () => {
    const { w } = mountIt({ data: [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 7 }], regression: 'category', showBand: false })
    expect(w.find('[role="group"]').exists()).toBe(false)
    expect(w.findAll('ul li')).toHaveLength(1)
    expect((w.find('path').element as SVGElement).style.display).toBe('none')
  })

  it('圖例：隱藏分類時點與迴歸都重算，送出 visibility-change', async () => {
    const { w, chart } = mountIt({ regression: 'category' })
    await w.findAll('[role="group"] button')[0].trigger('click')
    expect(w.findAll('[role="group"] button')[0].attributes('aria-pressed')).toBe('false')
    expect(w.findAll('circle')).toHaveLength(6)
    expect(w.findAll('ul li').map((l) => l.text())).toEqual(['B：y = −1x + 10，R² = 1.000，n = 6'])
    expect(chart().emitted('visibility-change')).toEqual([[['B']]])
    await w.findAll('[role="group"] button')[0].trigger('click')
    expect(chart().emitted('visibility-change')![1]).toEqual([['A', 'B']])
  })

  it('滑過：最近的點顯示提示與外圈；離開消失', async () => {
    const { w, overlay } = mountIt({ xLabel: '溫度', xUnit: '°C', yLabel: '比率', yUnit: '%' })
    // 有軸名稱時邊界變大：繪圖區 560 × 342
    const [x, y] = [4 * 56, 342 - 4 * 34.2]
    pointer(overlay().element, 'pointermove', x + 2, y + 1)
    await nextTick()
    expect(w.find('[data-export-ignore]').text()).toBe('a4 · A溫度：4 °C比率：4 %')
    pointer(overlay().element, 'pointermove', 300, 10) // 附近沒有點
    await nextTick()
    expect(w.find('[data-export-ignore]').exists()).toBe(false)
    pointer(overlay().element, 'pointermove', x, y)
    pointer(overlay().element, 'pointerleave', x, y)
    await nextTick()
    expect(w.find('[data-export-ignore]').exists()).toBe(false)
  })

  it('框選：選到的點、select 事件、沒選到的變淡、摘要；點空白處取消', async () => {
    const { w, chart, overlay } = mountIt({ title: 'T' })
    const el = overlay().element
    const [x0, y0] = at(5, 10)
    const [x1, y1] = at(10, 5)
    pointer(el, 'pointerdown', x0, y0)
    pointer(el, 'pointermove', x1, y1)
    await nextTick()
    expect(w.find('rect[stroke-dasharray="4 3"]').exists()).toBe(true)
    pointer(el, 'pointerup', x1, y1)
    await nextTick()
    // A 的 (6,6)、(8,8)、(10,10)
    const sel = chart().emitted('select')![0][0] as ScatterPoint[]
    expect(sel.map((p) => p.label)).toEqual(['a6', 'a8', 'a10'])
    expect(w.text()).toContain('已選取 3 點（平均 8，8）')
    const opac = w.findAll('circle').map((c) => (c.element as SVGElement).style.fillOpacity)
    expect(opac.filter((o) => o === '0.75')).toHaveLength(3)
    expect((chart().vm as unknown as { selected: ScatterPoint[] }).selected).toHaveLength(3)
    // 點空白處
    pointer(el, 'pointerdown', 300, 10)
    pointer(el, 'pointerup', 300, 10)
    await nextTick()
    expect(chart().emitted('select')![1]).toEqual([[]])
    expect(w.text()).not.toContain('已選取')
  })

  it('點擊一個點：point-click；取消選取按鈕；右鍵與 brushable=false 不框選', async () => {
    const { w, chart, overlay } = mountIt()
    const el = overlay().element
    const [x, y] = at(2, 8)
    pointer(el, 'pointerdown', x, y)
    pointer(el, 'pointerup', x + 1, y)
    expect((chart().emitted('point-click')![0][0] as ScatterPoint).label).toBe('b2')
    // 框選後用按鈕取消
    pointer(el, 'pointerdown', 0, 0)
    pointer(el, 'pointermove', 576, 360)
    pointer(el, 'pointerup', 576, 360)
    await nextTick()
    expect((chart().emitted('select')![0][0] as ScatterPoint[]).length).toBe(12)
    await w.findAll('button').find((b) => b.text() === '取消選取')!.trigger('click')
    expect(chart().emitted('select')![1]).toEqual([[]])
    // 已經沒有選取時再取消不送事件
    ;(chart().vm as unknown as { clearSelection: () => void }).clearSelection()
    expect(chart().emitted('select')).toHaveLength(2)
    // 右鍵
    pointer(el, 'pointerdown', 0, 0, { button: 2 })
    pointer(el, 'pointermove', 576, 360)
    await nextTick()
    expect(w.find('rect[stroke-dasharray="4 3"]').exists()).toBe(false)
    // pointercancel 清掉框
    pointer(el, 'pointerdown', 0, 0)
    pointer(el, 'pointermove', 100, 100)
    pointer(el, 'pointercancel', 100, 100)
    await nextTick()
    expect(w.find('rect[stroke-dasharray="4 3"]').exists()).toBe(false)
    const off = mountIt({ brushable: false })
    pointer(off.overlay().element, 'pointerdown', 0, 0)
    pointer(off.overlay().element, 'pointermove', 576, 360)
    await nextTick()
    expect(off.w.find('rect[stroke-dasharray="4 3"]').exists()).toBe(false)
  })

  it('資料改變時清掉選取', async () => {
    const src = ref<ScatterPoint[]>(data)
    const { w, overlay } = mountIt({ get data() { return src.value } })
    pointer(overlay().element, 'pointerdown', 0, 0)
    pointer(overlay().element, 'pointermove', 576, 360)
    pointer(overlay().element, 'pointerup', 576, 360)
    await nextTick()
    expect(w.text()).toContain('已選取')
    src.value = data.slice(0, 4)
    await nextTick()
    expect(w.text()).not.toContain('已選取')
  })

  it('軸名稱與單位、自訂數字格式、自訂分類顏色、自動範圍', () => {
    const { w } = mountIt({ xLabel: '溫度', xUnit: '°C', yUnit: '%', valueFormat: (v: number) => `#${v}`, categoryColors: { B: 'purple' }, xDomain: null, yDomain: null })
    const texts = w.findAll('svg[role="img"] text').map((t) => t.text())
    expect(texts).toContain('溫度（°C）')
    expect(texts).toContain('%')
    expect(texts.some((t) => t.startsWith('#'))).toBe(true)
    expect(w.findAll('circle')[6].attributes('style')).toContain('purple')
  })

  it('沒有資料：顯示提示', () => {
    expect(mountIt({ data: [] }).w.text()).toContain('沒有資料')
    expect(mountIt({ data: [{ x: Number.NaN, y: 1 }], emptyText: '空的' }).w.text()).toContain('空的')
  })

  it('只有一個 x 值：自動範圍不會是 0 寬；只有一點時不畫迴歸', () => {
    const { w } = mountIt({ data: [{ x: 5, y: 5 }], xDomain: null, yDomain: null })
    expect(w.findAll('circle')).toHaveLength(1)
    expect(w.find('ul').exists()).toBe(false)
    expect(Number.isFinite(Number(w.find('circle').attributes('cx')))).toBe(true)
  })

  it('大量資料改用 Canvas；滑過仍可命中；框選後畫外框；主題改變時重畫', async () => {
    const calls: string[] = []
    const ctx = {
      setTransform: () => {},
      clearRect: () => calls.push('clear'),
      beginPath: () => {},
      moveTo: () => {},
      arc: () => calls.push('arc'),
      fill: () => {},
      fillStyle: '',
      globalAlpha: 1,
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
    const { w, overlay } = mountIt({ canvasThreshold: 5 })
    await nextTick()
    await nextTick()
    expect(w.find('canvas').exists()).toBe(true)
    expect(w.findAll('circle')).toHaveLength(0)
    expect(calls.filter((c) => c === 'arc')).toHaveLength(12)
    const [x, y] = at(6, 6)
    pointer(overlay().element, 'pointermove', x, y)
    await nextTick()
    expect(w.find('[data-export-ignore]').text()).toContain('a6')
    pointer(overlay().element, 'pointerdown', 0, 0)
    pointer(overlay().element, 'pointermove', 288, 180)
    pointer(overlay().element, 'pointerup', 288, 180)
    await nextTick()
    // 選取外框 + 滑過外圈
    expect(w.findAll('circle').length).toBeGreaterThan(0)
    calls.length = 0
    document.documentElement.classList.add('dark')
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()
    await nextTick()
    expect(calls).toContain('clear')
    document.documentElement.classList.remove('dark')
  })

  it('Canvas 拿不到 context 時不出錯', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { w } = mountIt({ canvasThreshold: 1 })
    await nextTick()
    expect(w.find('canvas').exists()).toBe(true)
  })

  it('regressions 方法', () => {
    const { chart } = mountIt({ regression: 'category' })
    const regs = (chart().vm as unknown as { regressions: Array<{ group: string | null; slope: number }> }).regressions
    expect(regs.map((r) => [r.group, Math.round(r.slope)])).toEqual([
      ['A', 1],
      ['B', -1],
    ])
    const all = mountIt().chart().vm as unknown as { regressions: Array<{ group: string | null }> }
    expect(all.regressions[0].group).toBeNull()
  })

  it('英文語系', () => {
    const { w } = mountIt({ regression: 'category' }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.findAll('ul li')[0].text()).toBe('A: y = 1x + 0, R² = 1.000, n = 6')
    expect(w.find('svg[role="img"]').attributes('aria-label')).toBe('Scatter plot: 12 points, X axis X, Y axis Y; A R² 1.00, B R² 1.00')
  })
})
