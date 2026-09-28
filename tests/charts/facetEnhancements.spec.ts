import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import FacetedChart from '@/components/library/charts/FacetedChart.vue'
import type { VerticalFacet } from '@/components/library/charts/FacetedChart.vue'
import GridFacetChart from '@/components/library/charts/GridFacetChart.vue'
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue'
import { unionDomain, zeroBasedDomain } from '@/components/library/charts/composables/faceChart/useFacetLayout'
import {
  applySharedLegend,
  collectLegend,
  fixedTooltipStyle,
  formatXValue,
  layerLabel,
  tooltipRows,
} from '@/components/library/charts/composables/faceChart/facetHelpers'
import type { ChartDatum, ChartLayer, TooltipPayload } from '@/components/library/charts/types/chart.types'

interface Row extends ChartDatum {
  t: number
  v: number
  y: number
}

const ROWS: Row[] = [
  { t: 1, v: 10, y: 95 },
  { t: 2, v: 30, y: 97 },
  { t: 3, v: 20, y: 96 },
]

const bars = (rows: Row[] = ROWS): ChartLayer => ({
  type: 'bar',
  yAxis: 'left',
  name: '產量',
  color: '#3b82f6',
  data: rows,
  xValue: (d) => (d as Row).t,
  yValue: (d) => (d as Row).v,
})
const line = (): ChartLayer => ({
  type: 'line',
  yAxis: 'right',
  legend: { label: '良率' },
  lineColor: '#ef4444',
  data: ROWS,
  xValue: (d) => (d as Row).t,
  yValue: (d) => (d as Row).y,
})

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

// ---------------------------------------------------------------------------
// 純函式
// ---------------------------------------------------------------------------

describe('zeroBasedDomain（左軸 domain）', () => {
  it('全正值：0 起算、上方留 10%', () => {
    expect(zeroBasedDomain([10, 30, 20])).toEqual([0, 33])
  })

  /** 回歸：原本 [0, max * 1.1]，負的柱子整根被裁掉 */
  it('有負值：下方也要包含，且留白', () => {
    const [lo, hi] = zeroBasedDomain([-20, 10, 30])!
    expect(lo).toBeLessThan(-20)
    expect(hi).toBeGreaterThan(30)
  })

  /** 回歸：全負值時 max * 1.1 < 0，軸變成倒過來的 [0, -5.5] */
  it('全負值：domain 仍是遞增的 [負, 0]', () => {
    const [lo, hi] = zeroBasedDomain([-5, -20])!
    expect(lo).toBeLessThan(-20)
    expect(hi).toBe(0)
  })

  it('全為 0 → [0, 1]；沒有有效值 → undefined', () => {
    expect(zeroBasedDomain([0, 0])).toEqual([0, 1])
    expect(zeroBasedDomain([NaN])).toBeUndefined()
  })
})

describe('unionDomain（scales: fixed）', () => {
  it('連續值取最小與最大', () => {
    expect(unionDomain([[0, 10], [-5, 3], undefined, [2, 40]])).toEqual([-5, 40])
  })

  it('日期保留 Date 型別', () => {
    const d = unionDomain([[new Date(2026, 0, 5), new Date(2026, 0, 10)], [new Date(2026, 0, 1), new Date(2026, 0, 7)]]) as Date[]
    expect(d[0]).toBeInstanceOf(Date)
    expect(d[0].getDate()).toBe(1)
    expect(d[1].getDate()).toBe(10)
  })

  it('類別取聯集、保留出現順序', () => {
    expect(unionDomain([['A', 'B'], ['B', 'C', 'D']])).toEqual(['A', 'B', 'C', 'D'])
  })

  it('全部沒有 → undefined', () => {
    expect(unionDomain([undefined, null])).toBeUndefined()
  })
})

describe('共用圖例', () => {
  it('跨分面合併、同名只列一次；不列參考線與關掉圖例的圖層', () => {
    const entries = collectLegend([
      [bars(), line()],
      [bars(), { ...line(), legend: { label: '良率', show: false } }, { type: 'trigger-line' } as ChartLayer],
    ])
    expect(entries.map((e) => e.label)).toEqual(['產量', '良率'])
    expect(entries[1].color).toBe('#ef4444')
  })

  it('堆疊長條以各段為單位', () => {
    const scale = Object.assign((k: string) => (k === 'A' ? '#111111' : '#222222'), {}) as unknown as ChartLayer['colorScale']
    const entries = collectLegend([[{ type: 'stacked-bar', stackKeys: ['A', 'B'], colorScale: scale } as ChartLayer]])
    expect(entries).toEqual([
      { label: 'A', color: '#111111', type: 'stacked-bar' },
      { label: 'B', color: '#222222', type: 'stacked-bar' },
    ])
  })

  it('applySharedLegend：拿掉隱藏的系列、關掉各分面自己的圖例；參考線保留', () => {
    const layers = [bars(), line(), { type: 'trigger-line' } as ChartLayer]
    const out = applySharedLegend(layers, new Set(['良率']), true)
    expect(out.map((l) => l.type)).toEqual(['bar', 'trigger-line'])
    expect(out[0].legend?.show).toBe(false)
    // 沒開共用圖例時原樣回傳
    expect(applySharedLegend(layers, new Set(['良率']), false)).toBe(layers)
  })

  it('layerLabel：legend.label > name > 類型中文', () => {
    expect(layerLabel(line())).toBe('良率')
    expect(layerLabel(bars())).toBe('產量')
    expect(layerLabel({ type: 'scatter' })).toBe('散點')
  })
})

describe('預設 tooltip 內容', () => {
  const pos = { pageX: 0, pageY: 0, containerX: 0, containerY: 0 }

  /** 回歸：原本只取 layers[0] 的值 —— 滑到右軸的良率折線，顯示的卻是產量 */
  it('顯示被滑到的那個圖層的值，並用該側的格式化函式', () => {
    const payload = { data: ROWS[1], layer: line(), position: pos } as TooltipPayload
    const info = tooltipRows(payload, { yLeft: (v) => `${v} pcs`, yRight: (v) => `${v}%` })
    expect(info.rows).toEqual([{ label: '良率', value: '97%', color: '#ef4444' }])
    expect(info.xRaw).toBe(2)
  })

  /** 回歸：堆疊長條沒有 yValue，原本直接印出整筆 JSON */
  it('堆疊長條列出該段的值', () => {
    const layer = { type: 'stacked-bar', stackKeys: ['A', 'B'], color: '#333333', xValue: (d: ChartDatum) => d.t } as unknown as ChartLayer
    const payload = { data: { t: 1, A: 1200, B: 30.5 }, layer, seriesKey: 'A', position: pos } as TooltipPayload
    const info = tooltipRows(payload, {})
    expect(info.rows).toEqual([{ label: 'A', value: '1,200', color: '#333333' }])
  })

  it('formatXValue：formatter 優先；日期用本地格式；數字取兩位', () => {
    expect(formatXValue(5, (v: number) => `第 ${v} 週`)).toBe('第 5 週')
    expect(formatXValue(new Date(2026, 8, 28))).toBe('2026/09/28')
    expect(formatXValue(1.23456)).toBe('1.23')
    expect(formatXValue(null)).toBe('')
  })

  it('fixedTooltipStyle：position fixed；靠右邊時翻到游標左側', () => {
    const near = fixedTooltipStyle({ pageX: window.innerWidth - 20, pageY: 100 })
    expect(near.position).toBe('fixed')
    expect(parseInt(near.left)).toBeLessThan(window.innerWidth - 20)
    const normal = fixedTooltipStyle({ pageX: 100, pageY: 100 })
    expect(normal.left).toBe('114px')
  })
})

// ---------------------------------------------------------------------------
// FacetedChart
// ---------------------------------------------------------------------------

function facets(): VerticalFacet[] {
  return [
    { id: 'a', title: 'SMT 印刷良率（長標題）', layers: [bars(), line()] },
    { id: 'b', title: 'B', layers: [bars()] },
  ]
}

async function mountFaceted(props: Record<string, unknown> = {}) {
  const w = mount(FacetedChart, {
    props: { facets: facets(), width: 600, totalHeight: 500, xScaleType: 'linear', autoResize: false, ...props },
    attachTo: document.body,
  })
  wrapper = w
  await nextTick()
  await nextTick()
  return w
}

describe('FacetedChart：加強', () => {
  it('整張圖與每個分面都是有名稱的 group', async () => {
    const w = await mountFaceted({ title: '產線看板' })
    expect(w.attributes('role')).toBe('group')
    expect(w.attributes('aria-label')).toBe('產線看板')
    expect(w.findAll('.facet-item').map((f) => f.attributes('aria-label'))).toEqual(['SMT 印刷良率（長標題）', 'B'])
  })

  /** 回歸：原本 width 固定 50px，旋轉後長標題被擠成好幾行 */
  it('左側標題的寬度跟著分面高度，不是固定 50px', async () => {
    const w = await mountFaceted()
    const style = (w.find('.facet-label').element as HTMLElement).style
    expect(parseInt(style.width)).toBeGreaterThan(100)
    expect(w.find('.facet-label').attributes('title')).toBe('SMT 印刷良率（長標題）')
  })

  it('facetLabelPosition=top：標題在上方，圖表上緣留出空間', async () => {
    const w = await mountFaceted({ facetLabelPosition: 'top' })
    expect(w.find('.facet-label').classes()).toContain('is-top')
    const margin = w.findAllComponents(DualAxisComboChart)[0].props('margin') as { top: number }
    expect(margin.top).toBe(28)
  })

  it('sharedLegend：列出所有系列；點一下在每個分面都隱藏', async () => {
    const w = await mountFaceted({ sharedLegend: true })
    const chips = w.findAll('.legend-chip')
    expect(chips.map((c) => c.text())).toEqual(['產量', '良率'])
    expect(chips[0].attributes('aria-pressed')).toBe('true')
    // 各分面自己的圖例關掉
    const layersOf = (i: number) => w.findAllComponents(DualAxisComboChart)[i].props('layers') as ChartLayer[]
    expect(layersOf(0).every((l) => l.legend?.show === false)).toBe(true)

    await chips[0].trigger('click')
    expect(w.findAll('.legend-chip')[0].attributes('aria-pressed')).toBe('false')
    expect(layersOf(0).map((l) => layerLabel(l))).toEqual(['良率'])
    expect(layersOf(1)).toEqual([])
    await w.findAll('.legend-chip')[0].trigger('click')
    expect(layersOf(1).map((l) => layerLabel(l))).toEqual(['產量'])
  })

  it('同步十字線：滑鼠在繪圖區內才出現，並顯示 X 讀數', async () => {
    const w = await mountFaceted()
    const el = w.element as HTMLElement
    el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 600, bottom: 500, width: 600, height: 500, x: 0, y: 0, toJSON() {} }) as DOMRect
    // margin 預設 left 80 / right 80 → 繪圖區 80–520；X 範圍 1–3
    await w.trigger('mousemove', { clientX: 300, clientY: 100 })
    const cross = w.find('.crosshair')
    expect(cross.exists()).toBe(true)
    expect((cross.element as HTMLElement).style.left).toBe('300px')
    expect(w.find('.crosshair-label').text()).toBe('2')
    await w.trigger('mousemove', { clientX: 40, clientY: 100 }) // 軸標籤區
    expect(w.find('.crosshair').exists()).toBe(false)
    await w.trigger('mousemove', { clientX: 300, clientY: 100 })
    await w.trigger('mouseleave')
    expect(w.find('.crosshair').exists()).toBe(false)
  })

  it('crosshair=false 時不畫十字線', async () => {
    const w = await mountFaceted({ crosshair: false })
    await w.trigger('mousemove', { clientX: 300, clientY: 100 })
    expect(w.find('.crosshair').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// GridFacetChart
// ---------------------------------------------------------------------------

const gridData = [
  { site: 'FAB-A', line: 'L1', layers: [bars()] },
  { site: 'FAB-B', line: 'L1', layers: [bars([{ t: 1, v: 100, y: 0 }, { t: 5, v: 200, y: 0 }])] },
  { site: 'FAB-A', line: 'L2', layers: [bars([{ t: 1, v: -30, y: 0 }, { t: 2, v: 5, y: 0 }])] },
]

async function mountGrid(props: Record<string, unknown> = {}) {
  const w = mount(GridFacetChart, {
    props: { data: gridData, xFacetVar: 'site', yFacetVar: 'line', width: 800, height: 600, autoResize: false, xScaleType: 'linear', ...props },
    attachTo: document.body,
  })
  wrapper = w
  await nextTick()
  await nextTick()
  return w
}

describe('GridFacetChart：加強', () => {
  /** 回歸：標題的模板原本整段被註解掉，title prop 傳了也不顯示 */
  it('顯示標題，表頭與格子往下讓出標題列', async () => {
    const w = await mountGrid({ title: '各廠產量' })
    expect(w.find('.title-text').text()).toBe('各廠產量')
    expect((w.find('.col-header').element as HTMLElement).style.top).toBe('36px')
    expect((w.find('.grid-cell').element as HTMLElement).style.top).toBe('76px')
  })

  it('沒有 xFacetLabel 時表頭只顯示值（不再是「X Facet: FAB-A」）', async () => {
    const w = await mountGrid()
    expect(w.findAll('.col-header').map((h) => h.text())).toEqual(['FAB-A', 'FAB-B'])
    wrapper!.unmount()
    const w2 = await mountGrid({ xFacetLabel: '廠區' })
    expect(w2.find('.col-header').text()).toBe('廠區：FAB-A')
  })

  it('scales=free（預設）：每格自己的範圍', async () => {
    const w = await mountGrid()
    const charts = w.findAllComponents(DualAxisComboChart)
    // 長條圖層：兩端各外推半個點距，第一根與最後一根才不會一半畫在軸外
    expect(charts[0].props('xDomain')).toEqual([0.5, 3.5])
    expect(charts[1].props('xDomain')).toEqual([-1, 7])
  })

  it('scales=fixed：所有格共用 X 與 Y 範圍（含負值）', async () => {
    const w = await mountGrid({ scales: 'fixed' })
    const charts = w.findAllComponents(DualAxisComboChart)
    const xs = charts.map((c) => c.props('xDomain'))
    const ys = charts.map((c) => c.props('yLeftDomain') as number[])
    expect(new Set(xs.map((x) => JSON.stringify(x))).size).toBe(1)
    expect(xs[0]).toEqual([-1, 7])
    expect(new Set(ys.map((y) => JSON.stringify(y))).size).toBe(1)
    expect(ys[0][0]).toBeLessThan(-30)
    expect(ys[0][1]).toBeGreaterThan(200)
  })

  it('scales=free_y：只共用 X', async () => {
    const w = await mountGrid({ scales: 'free_y' })
    const charts = w.findAllComponents(DualAxisComboChart)
    expect(charts[0].props('xDomain')).toEqual([-1, 7])
    expect(charts[0].props('yLeftDomain')).not.toEqual(charts[1].props('yLeftDomain'))
  })

  it('sharedLegend：標題列出現圖例，各格不再各畫一份', async () => {
    const w = await mountGrid({ sharedLegend: true })
    expect(w.find('.title-bar').exists()).toBe(true)
    expect(w.findAll('.legend-chip').map((c) => c.text())).toEqual(['產量'])
    const layers = w.findAllComponents(DualAxisComboChart)[0].props('layers') as ChartLayer[]
    expect(layers[0].legend?.show).toBe(false)
    await w.find('.legend-chip').trigger('click')
    expect(w.findAllComponents(DualAxisComboChart)[0].props('layers')).toEqual([])
  })

  it('每一格是有名稱的 group', async () => {
    const w = await mountGrid({ xFacetLabel: '廠區', yFacetLabel: '產線' })
    expect(w.find('.grid-cell').attributes('aria-label')).toBe('廠區：FAB-A，產線：L1')
  })
})
