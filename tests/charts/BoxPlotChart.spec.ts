import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import BoxPlotChart from '@/components/library/charts/BoxPlotChart.vue'
import type { BoxPlotGroupEvent, BoxPlotPointEvent } from '@/components/library'

/** A：1～8 + 離群值 30；B：10～17；C 沒有資料（只在 groups 裡） */
const DATA = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 30].map((v, i) => ({ g: 'A', v, id: `a${i}` })),
  ...[10, 11, 12, 13, 14, 15, 16, 17].map((v, i) => ({ g: 'B', v, id: `b${i}` })),
]

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

async function mountChart(props: Record<string, unknown> = {}) {
  wrapper = mount(BoxPlotChart, {
    props: { data: DATA, groupField: 'g', valueField: 'v', width: 400, height: 300, ...props },
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

const groupsOf = (w: VueWrapper) => w.findAll('.bpc-group')
const lastEvent = <T>(w: VueWrapper, name: string) => w.emitted(name)?.at(-1)?.[0] as T

describe('BoxPlotChart：畫面', () => {
  it('每組一個箱子、鬚、中位數、平均；離群值畫成空心圓', async () => {
    const w = await mountChart()
    const groups = groupsOf(w)
    expect(groups).toHaveLength(2)
    expect(groups[0].find('.bpc-box').exists()).toBe(true)
    expect(groups[0].findAll('.bpc-whisker line')).toHaveLength(4)
    expect(groups[0].find('.bpc-median').exists()).toBe(true)
    expect(groups[0].find('.bpc-mean').exists()).toBe(true)
    const points = groups[0].findAll('.bpc-point')
    expect(points).toHaveLength(1)
    expect(points[0].classes()).toContain('is-outlier')
    expect(points[0].attributes('style')).toContain('fill: none')
    expect(groups[1].findAll('.bpc-point')).toHaveLength(0)
    expect(groups[0].find('.bpc-count').text()).toBe('n = 9')
  })

  it('箱子的上下緣對應 Q3、Q1，中位數在中間', async () => {
    const w = await mountChart()
    const g = groupsOf(w)[1]
    const box = g.find('.bpc-box')
    const top = Number(box.attributes('y'))
    const bottom = top + Number(box.attributes('height'))
    const median = Number(g.find('.bpc-median').attributes('y1'))
    // B：Q1 11.75、中位數 13.5、Q3 15.25 —— 中位數剛好在正中間
    expect(median - top).toBeCloseTo(bottom - median, 5)
  })

  it('groups 決定順序與名稱，沒有資料的組也佔一格；sort 依中位數', async () => {
    const w = await mountChart({ groups: [{ value: 'C', label: 'C 線' }, 'B'] })
    const keys = () => groupsOf(w).map((g) => g.attributes('data-key'))
    expect(keys()).toEqual(['C', 'B', 'A'])
    expect(groupsOf(w)[0].find('.bpc-box').exists()).toBe(false)
    expect(groupsOf(w)[0].find('.bpc-count').text()).toBe('n = 0')
    await w.setProps({ sort: 'median-asc' })
    expect(keys()).toEqual(['A', 'B', 'C'])
    await w.setProps({ sort: 'median-desc' })
    expect(keys()).toEqual(['B', 'A', 'C'])
  })

  it("showPoints='all' 畫出每一筆（左右散開）、'none' 都不畫；showMean、showCount 可以關掉", async () => {
    const w = await mountChart({ showPoints: 'all' })
    const pts = groupsOf(w)[1].findAll('.bpc-point')
    expect(pts).toHaveLength(8)
    expect(new Set(pts.map((p) => p.attributes('cx'))).size).toBeGreaterThan(1)
    await w.setProps({ showPoints: 'none', showMean: false, showCount: false })
    expect(w.findAll('.bpc-point')).toHaveLength(0)
    expect(w.find('.bpc-mean').exists()).toBe(false)
    expect(w.find('.bpc-count').exists()).toBe(false)
  })

  it("mode='violin' 畫出密度形狀；全部相同的組沒有形狀但有箱子", async () => {
    const w = await mountChart({ mode: 'violin', data: [...DATA, { g: 'D', v: 5 }, { g: 'D', v: 5 }] })
    const groups = groupsOf(w)
    expect(groups[0].find('.bpc-violin').attributes('d')).toMatch(/^M.+Z$/)
    expect(groups[2].find('.bpc-violin').exists()).toBe(false)
    expect(groups[2].find('.bpc-box').exists()).toBe(true)
  })

  it('參考線、Y 軸名稱、highlightKey 讓其他組轉灰', async () => {
    const w = await mountChart({ referenceLines: [{ value: 20, label: 'USL' }, { value: NaN }], yLabel: '厚度', highlightKey: 'B' })
    expect(w.findAll('.bpc-reference')).toHaveLength(1)
    expect(w.find('.bpc-reference text').text()).toBe('USL')
    expect(w.find('.bpc-ylabel').text()).toBe('厚度')
    expect(groupsOf(w)[0].classes()).toContain('is-dimmed')
    expect(groupsOf(w)[1].classes()).not.toContain('is-dimmed')
  })

  it('valueDomain 指定範圍；沒有資料時顯示提示', async () => {
    const w = await mountChart({ valueDomain: [0, 100] })
    expect(w.findAll('.bpc-tick').at(-1)!.text()).toBe('100')
    await w.setProps({ data: [] })
    expect(w.text()).toContain('沒有資料')
    expect(w.find('svg').attributes('aria-label')).toContain('沒有資料')
  })

  it('aria-label 說明四分位距最大的組', async () => {
    const w = await mountChart({ title: '厚度' })
    expect(w.find('svg').attributes('aria-label')).toContain('四分位距最大的是')
    expect(w.find('.bpc-title').text()).toBe('厚度')
  })

  it('全部相同的值也有範圍（不會除以 0）', async () => {
    const w = await mountChart({ data: [{ g: 'A', v: 3 }, { g: 'A', v: 3 }] })
    expect(w.findAll('.bpc-tick').length).toBeGreaterThan(1)
  })
})

describe('BoxPlotChart：事件與提示框', () => {
  it('掛載時送出 stats-change；getStats() 相同', async () => {
    const w = await mountChart()
    const list = lastEvent<BoxPlotGroupEvent[]>(w, 'stats-change')
    expect(list.map((g) => [g.key, g.stats?.median])).toEqual([
      ['A', 5],
      ['B', 13.5],
    ])
    expect(list[0].stats?.outliers).toEqual([30])
    expect((w.vm as unknown as { getStats: () => BoxPlotGroupEvent[] }).getStats()).toEqual(list)
  })

  it('quartileMethod="exclusive" 改用 Minitab 的算法', async () => {
    const w = await mountChart({ quartileMethod: 'exclusive' })
    expect(lastEvent<BoxPlotGroupEvent[]>(w, 'stats-change')[1].stats).toMatchObject({ q1: 11.25, q3: 15.75 })
  })

  it('滑過一組：統計列表、group-hover、tooltip-show；在同一組內移動不重送', async () => {
    const w = await mountChart()
    const g = groupsOf(w)[0]
    await g.trigger('mouseenter', { clientX: 50, clientY: 50 })
    await g.trigger('mousemove', { clientX: 60, clientY: 60 })
    const tip = w.find('[role="tooltip"]')
    expect(tip.text()).toContain('中位數')
    expect(tip.text()).toContain('離群值1 個')
    expect(w.emitted('group-hover')).toHaveLength(1)
    expect(lastEvent<BoxPlotGroupEvent>(w, 'group-hover').rows[0]).toBe(DATA[0])
    expect(g.classes()).toContain('is-hovered')
    await g.trigger('mouseleave')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('tooltip-hide')).toHaveLength(1)
  })

  it('滑過離群值：顯示數值與 nameField；point-hover、point-click', async () => {
    const w = await mountChart({ nameField: 'id' })
    const pt = groupsOf(w)[0].find('.bpc-point')
    await pt.trigger('mouseenter', { clientX: 10, clientY: 10 })
    expect(w.find('[role="tooltip"]').text()).toContain('30')
    expect(w.find('[role="tooltip"]').text()).toContain('離群值')
    expect(w.find('[role="tooltip"]').text()).toContain('a8')
    expect(lastEvent<BoxPlotPointEvent>(w, 'point-hover')).toMatchObject({ group: 'A', value: 30, outlier: true })
    // 指在點上時，同一組的 mousemove 不把提示框換回組的統計
    await groupsOf(w)[0].trigger('mousemove')
    expect(w.find('[role="tooltip"]').text()).toContain('a8')
    await pt.trigger('click')
    expect(lastEvent<BoxPlotPointEvent>(w, 'point-click').datum).toBe(DATA[8])
    expect(w.emitted('group-click')).toBeUndefined()
    await pt.trigger('mouseleave')
    await groupsOf(w)[0].trigger('mousemove')
    expect(w.find('[role="tooltip"]').text()).toContain('中位數')
  })

  it('沒有資料的組：提示框只有筆數 0；點擊送出 group-click', async () => {
    const w = await mountChart({ groups: ['C'] })
    await groupsOf(w)[0].trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('筆數0')
    await groupsOf(w)[0].trigger('click')
    expect(lastEvent<BoxPlotGroupEvent>(w, 'group-click')).toMatchObject({ key: 'C', stats: null })
  })

  it('customRenderers.tooltip；enableTooltip=false 不顯示', async () => {
    const w = await mountChart({ customRenderers: { tooltip: (e: BoxPlotGroupEvent) => [['Cpk', e.key === 'A' ? '1.2' : '—']] } })
    await groupsOf(w)[0].trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('Cpk1.2')
    await w.setProps({ enableTooltip: false })
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('鍵盤：左右逐組、Home／End、Enter 點擊、Escape 關掉；aria-live 唸出統計', async () => {
    const w = await mountChart({ groups: ['A', 'B', 'C'] })
    const svg = w.find('svg')
    const key = (k: string) => svg.trigger('keydown', { key: k })
    await key('ArrowRight')
    expect(lastEvent<BoxPlotGroupEvent>(w, 'group-hover').key).toBe('A')
    expect(w.find('[aria-live]').text()).toContain('A：9 筆，中位數 5')
    expect(w.find('[aria-live]').text()).toContain('離群值 1 個')
    await key('ArrowRight')
    expect(lastEvent<BoxPlotGroupEvent>(w, 'group-hover').key).toBe('B')
    await key('ArrowLeft')
    expect(lastEvent<BoxPlotGroupEvent>(w, 'group-hover').key).toBe('A')
    await key('End')
    expect(w.find('[aria-live]').text()).toBe('C：沒有資料')
    await key('ArrowDown')
    await key('Home')
    await key('ArrowUp')
    expect(lastEvent<BoxPlotGroupEvent>(w, 'group-hover').key).toBe('A')
    await key('Enter')
    expect(lastEvent<BoxPlotGroupEvent>(w, 'group-click').key).toBe('A')
    await key('Escape')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    await key('Enter')
    expect(w.emitted('group-click')).toHaveLength(1)
    await key('x')
    await svg.trigger('blur')
    // 第一次按左鍵也是從第一組開始
    await key('ArrowLeft')
    expect(lastEvent<BoxPlotGroupEvent>(w, 'group-hover').key).toBe('A')
  })

  it('沒有資料時按鍵不做事；掛載送出 chart-ready', async () => {
    const w = await mountChart({ data: [] })
    await w.find('svg').trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('group-hover')).toBeUndefined()
    expect(w.emitted('chart-ready')?.[0][0]).toEqual({ width: 400, height: 300 })
  })
})
