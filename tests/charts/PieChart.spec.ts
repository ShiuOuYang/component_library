import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import PieChart from '@/components/library/charts/PieChart.vue'
import type { PieSliceEvent, PieTooltip } from '@/components/library'

/** 圖 400×200、margin 0、右側圖例 200（+16 間距）→ 直徑 min(184, 200) = 184 */
const DATA = [
  { id: 'run', label: '生產中', value: 40 },
  { id: 'wait', label: '待料', value: 10 },
  { id: 'done', label: '已完工', value: 50 },
]

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

async function mountPie(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  wrapper = mount(PieChart, {
    props: { data: DATA, width: 400, height: 200, margin: { top: 0, right: 0, bottom: 0, left: 0 }, ...props },
    slots,
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

const slices = (w: VueWrapper) => w.findAll('.pie-slice')
const slice = (w: VueWrapper, key: string) => w.find(`.pie-slice[data-key="${key}"]`)
const fillOf = (w: VueWrapper, key: string) => (slice(w, key).find('.pie-arc').element as SVGElement).style.fill
const legend = (w: VueWrapper) => w.findAll('.pie-legend-item')

describe('PieChart：扇形與顏色', () => {
  it('由大到小，直徑扣掉右側圖例', async () => {
    const w = await mountPie()
    expect(slices(w).map((s) => s.attributes('data-key'))).toEqual(['done', 'run', 'wait'])
    expect(w.find('svg').attributes('width')).toBe('184')
  })

  /** 顏色跟著項目走（依資料順序），不跟大小排名 */
  it('顏色依資料順序：第 1 筆 chart-1、第 2 筆 chart-2…', async () => {
    const w = await mountPie()
    expect(fillOf(w, 'run')).toContain('chart-1')
    expect(fillOf(w, 'wait')).toContain('chart-2')
    expect(fillOf(w, 'done')).toContain('chart-3')
  })

  it('隱藏一塊時，其他塊不換色', async () => {
    const w = await mountPie({ hiddenKeys: ['run'] })
    expect(slice(w, 'run').exists()).toBe(false)
    expect(fillOf(w, 'wait')).toContain('chart-2')
    expect(fillOf(w, 'done')).toContain('chart-3')
  })

  it('colorMap > customRenderers.sliceColor > colors', async () => {
    const w = await mountPie({
      colors: ['#111111', '#222222', '#333333'],
      colorMap: { done: '#00ff00' },
      customRenderers: { sliceColor: (d: Record<string, unknown> | null) => (d?.id === 'wait' ? '#0000ff' : null) },
    })
    expect(fillOf(w, 'done')).toBe('rgb(0, 255, 0)')
    expect(fillOf(w, 'wait')).toBe('rgb(0, 0, 255)')
    expect(fillOf(w, 'run')).toBe('rgb(17, 17, 17)')
  })

  it('超過 maxSlices：最小的併成灰色的「其他」', async () => {
    const data = [5, 1, 9, 2, 7].map((v, i) => ({ id: `k${i}`, label: `L${i}`, value: v }))
    const w = await mountPie({ data, maxSlices: 3 })
    expect(slices(w).map((s) => s.attributes('data-key'))).toEqual(['k2', 'k4', '__others__'])
    expect(fillOf(w, '__others__')).toContain('stroke-dark')
    expect(legend(w).at(-1)!.text()).toContain('其他')
    expect(legend(w).at(-1)!.text()).toContain('8 · 33.3%')
  })

  it('扇形之間留縫；只有一塊時是完整的環', async () => {
    const w = await mountPie()
    const many = slice(w, 'done').find('.pie-arc').attributes('d')!
    await w.setProps({ data: [DATA[0]] })
    const single = slice(w, 'run').find('.pie-arc').attributes('d')!
    expect(many).not.toBe(single)
    expect(single.startsWith('M0,-')).toBe(true)
  })
})

describe('PieChart：文字', () => {
  it('扇形上標百分比；太小的扇形不標', async () => {
    const w = await mountPie({ data: [...DATA, { id: 'tiny', label: '暫停', value: 0.5 }] })
    expect(slice(w, 'done').find('.pie-slice-label').text()).toBe('49.8%')
    expect(slice(w, 'tiny').find('.pie-slice-label').exists()).toBe(false)
  })

  it("sliceLabel='value' / 'none'", async () => {
    const w = await mountPie({ sliceLabel: 'value' })
    expect(slice(w, 'done').find('.pie-slice-label').text()).toBe('50')
    await w.setProps({ sliceLabel: 'none' })
    expect(w.findAll('.pie-slice-label')).toHaveLength(0)
  })

  it('圖例一定有名稱、數值與百分比', async () => {
    const w = await mountPie()
    const items = legend(w).map((b) => [b.find('.pie-legend-label').text(), b.find('.pie-legend-value').text()])
    expect(items).toEqual([['已完工', '50 · 50.0%'], ['生產中', '40 · 40.0%'], ['待料', '10 · 10.0%']])
    await w.setProps({ showLegendValues: false })
    expect(legend(w)[0].find('.pie-legend-value').exists()).toBe(false)
  })

  it('環圈中央：總數；滑過時換成那一塊', async () => {
    const w = await mountPie({ centerLabel: '張工單' })
    expect(w.find('.pie-center').text()).toBe('100張工單')
    await slice(w, 'run').trigger('mouseenter')
    expect(w.find('.pie-center-value').text()).toBe('40')
    expect(w.find('.pie-center-label').text()).toBe('生產中 · 40.0%')
  })

  it('aria 摘要列出各塊佔比；扇形有 aria-label', async () => {
    const w = await mountPie({ title: '工單狀態' })
    expect(w.find('svg').attributes('aria-label')).toBe('工單狀態：已完工 50.0%、生產中 40.0%、待料 10.0%')
    expect(slice(w, 'wait').attributes('aria-label')).toBe('待料：10（10.0%）')
    expect(w.find('.pie-title').text()).toBe('工單狀態')
  })

  it('center 插槽', async () => {
    const w = await mountPie({}, { center: '<template #center="{ total, active }"><b class="c">{{ active ? active.label : total }}</b></template>' })
    expect(w.find('.c').text()).toBe('100')
    await slice(w, 'wait').trigger('mouseenter')
    expect(w.find('.c').text()).toBe('待料')
  })

  it('沒有資料、全部隱藏：顯示提示', async () => {
    const w = await mountPie({ data: [{ label: 'x', value: 0 }] })
    expect(w.text()).toContain('沒有資料')
    expect(w.find('svg').attributes('aria-label')).toBe('圓餅圖：沒有資料')
    await w.setProps({ data: DATA, hiddenKeys: ['run', 'wait', 'done'] })
    expect(w.findAll('.pie-slice')).toHaveLength(0)
    expect(w.find('.pie-center').exists()).toBe(false)
  })
})

describe('PieChart：圖例與互動', () => {
  it('點圖例隱藏：百分比依剩下的重算，送出事件；再點顯示', async () => {
    const w = await mountPie()
    await legend(w)[0].trigger('click') // 已完工
    expect(slice(w, 'done').exists()).toBe(false)
    expect(w.emitted('legend-toggle')).toEqual([[{ key: 'done', hidden: true }]])
    expect(w.emitted('update:hiddenKeys')).toEqual([[['done']]])
    expect(legend(w)[0].attributes('aria-pressed')).toBe('false')
    expect(legend(w)[1].text()).toContain('80.0%')
    await legend(w)[0].trigger('click')
    expect(slice(w, 'done').exists()).toBe(true)
  })

  it('hiddenKeys 受控', async () => {
    const w = await mountPie({ hiddenKeys: ['wait'] })
    expect(slice(w, 'wait').exists()).toBe(false)
    await w.setProps({ hiddenKeys: [] })
    expect(slice(w, 'wait').exists()).toBe(true)
  })

  it('滑過圖例：對應扇形突出，其他變淡', async () => {
    const w = await mountPie()
    await legend(w)[2].trigger('mouseenter')
    expect(slice(w, 'wait').classes()).toContain('is-active')
    expect(slice(w, 'wait').attributes('transform')).toMatch(/^translate\(/)
    expect(slice(w, 'done').classes()).toContain('is-dimmed')
    await legend(w)[2].trigger('mouseleave')
    expect(slice(w, 'done').classes()).not.toContain('is-dimmed')
  })

  it('highlightKey 強調某一塊', async () => {
    const w = await mountPie({ highlightKey: 'run' })
    expect(slice(w, 'run').classes()).toContain('is-active')
    expect(slice(w, 'wait').classes()).toContain('is-dimmed')
  })

  it('環圈：滑過只換中央、不另外跳提示框（事件照送）', async () => {
    const w = await mountPie()
    await slice(w, 'run').trigger('mouseenter', { clientX: 50, clientY: 60 })
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect((w.emitted('slice-hover')![0][0] as PieSliceEvent)).toMatchObject({ key: 'run', share: 0.4, value: 40 })
    expect((w.emitted('tooltip-show')![0][0] as PieTooltip).position).toEqual({ containerX: 50, containerY: 60 })
  })

  it('圓餅（沒有中央）：顯示提示框；移到別塊、離開', async () => {
    const w = await mountPie({ innerRadiusRatio: 0 })
    expect(w.find('.pie-center').exists()).toBe(false)
    await slice(w, 'run').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('40')
    expect(w.find('[role="tooltip"]').text()).toContain('40.0%')
    await slice(w, 'run').trigger('mousemove')
    await slice(w, 'wait').trigger('mousemove')
    expect(w.emitted('slice-hover')).toHaveLength(2)
    await slice(w, 'wait').trigger('mouseleave')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('tooltip-hide')).toHaveLength(1)
  })

  it('「其他」的提示框顯示合計幾項；customRenderers.tooltip', async () => {
    const data = [5, 1, 9, 2].map((v, i) => ({ id: `k${i}`, label: `L${i}`, value: v }))
    const w = await mountPie({ data, maxSlices: 3, innerRadiusRatio: 0 })
    await slice(w, '__others__').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('合計 2 項')
    await w.setProps({ customRenderers: { tooltip: (_: unknown, s: PieSliceEvent) => [`鍵 ${s.key}`] } })
    await slice(w, 'k2').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('鍵 k2')
  })

  it('鍵盤聚焦等同滑過；點擊送出 slice-click（原始資料）', async () => {
    const w = await mountPie()
    await slice(w, 'wait').trigger('focus')
    expect(w.find('.pie-center-value').text()).toBe('10')
    await slice(w, 'wait').trigger('blur')
    expect(w.find('.pie-center-value').text()).toBe('100')
    await slice(w, 'wait').trigger('click')
    expect((w.emitted('slice-click')![0][0] as PieSliceEvent).datum).toBe(DATA[1])
  })

  it('enableTooltip=false 時扇形不能聚焦', async () => {
    const w = await mountPie({ enableTooltip: false })
    expect(slice(w, 'run').attributes('tabindex')).toBeUndefined()
  })

  it("legendPosition='bottom'：直徑扣掉下方圖例；'none'：沒有圖例", async () => {
    const w = await mountPie({ legendPosition: 'bottom' })
    // 寬 400 一行放 2 項，3 項 → 2 行 × 24 + 8 = 56；直徑 min(400, 200 − 56) = 144
    expect(w.find('svg').attributes('width')).toBe('144')
    expect(w.find('.pie-legend').classes()).toContain('is-bottom')
    await w.setProps({ legendPosition: 'none' })
    expect(w.find('.pie-legend').exists()).toBe(false)
  })

  it('tooltip 插槽', async () => {
    const w = await mountPie(
      { innerRadiusRatio: 0 },
      { tooltip: '<template #tooltip="{ tooltipData, tooltipVisible }"><i v-if="tooltipVisible" class="tip">{{ tooltipData.label }}</i></template>' }
    )
    await slice(w, 'done').trigger('mouseenter')
    expect(w.find('.tip').text()).toBe('已完工')
  })

  it('掛載時送出 chart-ready', async () => {
    const w = await mountPie()
    expect(w.emitted('chart-ready')).toEqual([[{ width: 400, height: 200 }]])
  })
})
