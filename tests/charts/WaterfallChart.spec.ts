import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import WaterfallChart from '@/components/library/charts/WaterfallChart.vue'
import type { WaterfallEvent } from '@/components/library'

const DATA = [
  { label: '投入', value: 1000 },
  { label: 'AOI', value: -60 },
  { label: '重工回收', value: 10 },
  { label: '電測', value: -50 },
]

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

async function mountChart(props: Record<string, unknown> = {}) {
  wrapper = mount(WaterfallChart, {
    props: { data: DATA, width: 500, height: 320, totalLabel: '良品', ...props },
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

const bars = (w: VueWrapper) => w.findAll('.wfc-bar-group')
const lastEvent = <T>(w: VueWrapper, name: string) => w.emitted(name)?.at(-1)?.[0] as T

describe('WaterfallChart：畫面', () => {
  it('每項一根長條，總計自動補上；增減的數值帶正負號，總計粗體', async () => {
    const w = await mountChart()
    expect(bars(w)).toHaveLength(5)
    expect(bars(w).map((b) => b.find('.wfc-value').text())).toEqual(['1,000', '−60', '+10', '−50', '900'])
    expect(bars(w)[4].find('.wfc-value').classes()).toContain('is-total')
    expect(bars(w)[4].find('.wfc-label').text()).toContain('良品')
  })

  it('顏色：減少紅、增加綠、起點與合計用類別色；increaseIsGood=false 時對調', async () => {
    const w = await mountChart()
    const fill = (i: number) => bars(w)[i].find('.wfc-bar').attributes('style')
    expect(fill(1)).toContain('danger-solid')
    expect(fill(2)).toContain('success-solid')
    expect(fill(0)).toContain('chart-1')
    await w.setProps({ increaseIsGood: false })
    expect(fill(1)).toContain('success-solid')
    expect(fill(2)).toContain('danger-solid')
  })

  it('圖例只列出有用到的種類，並有 ▲▼ 與文字', async () => {
    const w = await mountChart({ data: [{ label: 's', value: 10 }, { label: 'd', value: -1 }], totalLabel: null })
    expect(w.findAll('.wfc-legend li').map((l) => l.text())).toEqual(['▼ 減少', '■ 起點／合計'])
    await w.setProps({ showLegend: false })
    expect(w.find('.wfc-legend').exists()).toBe(false)
  })

  it('長條從前一根的結束開始；連接線接在累計值的高度', async () => {
    const w = await mountChart()
    const rect = (i: number) => bars(w)[i].find('.wfc-bar')
    const top = (i: number) => Number(rect(i).attributes('y'))
    const bottom = (i: number) => top(i) + Number(rect(i).attributes('height'))
    // 第 2 根（−60）的頂端 = 第 1 根的頂端（1000）
    expect(top(1)).toBeCloseTo(top(0), 5)
    // 第 3 根（+10）的底部 = 第 2 根的底部（940）
    expect(bottom(2)).toBeCloseTo(bottom(1), 5)
    const lines = w.findAll('.wfc-connectors line')
    expect(lines).toHaveLength(4)
    expect(Number(lines[0].attributes('y1'))).toBeCloseTo(top(0), 5)
    await w.setProps({ showConnectors: false, showValues: false })
    expect(w.find('.wfc-connectors').exists()).toBe(false)
    expect(w.find('.wfc-value').exists()).toBe(false)
  })

  it('showPercent 在增減後面加上佔起點的比例', async () => {
    const w = await mountChart({ showPercent: true })
    expect(bars(w)[1].find('.wfc-value').text()).toBe('−60（6.0%）')
    expect(bars(w)[0].find('.wfc-value').text()).toBe('1,000')
  })

  it('zeroBaseline=false：軸從資料附近開始，起點與合計畫截斷記號', async () => {
    const w = await mountChart()
    expect(w.findAll('.wfc-break')).toHaveLength(0)
    await w.setProps({ zeroBaseline: false })
    expect(w.findAll('.wfc-break')).toHaveLength(2)
    expect(Number(w.findAll('.wfc-tick')[0].text().replace(/,/g, ''))).toBeGreaterThan(0)
  })

  it('刻度上萬時整個軸都用精簡格式', async () => {
    const w = await mountChart({ data: [{ label: 's', value: 12000 }, { label: 'd', value: -500 }] })
    const ticks = w.findAll('.wfc-tick').map((t) => t.text())
    expect(ticks.some((t) => t.endsWith('k'))).toBe(true)
    expect(ticks.filter((t) => t !== '0').every((t) => t.endsWith('k'))).toBe(true)
  })

  it('總計在 0 以下時數值放在長條下方', async () => {
    const w = await mountChart({ data: [{ label: 's', value: 10 }, { label: 'd', value: -30 }] })
    expect(bars(w)[2].find('.wfc-value').attributes('dominant-baseline')).toBe('hanging')
  })

  it('長名稱斷成兩行，第二行太長時加省略號', async () => {
    const w = await mountChart({ width: 300, data: [{ label: '非常非常非常非常非常非常非常非常非常非常長的站別名稱', value: 10 }, { label: 'b', value: 1 }], totalLabel: null })
    const lines = bars(w)[0].findAll('tspan').map((t) => t.text())
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    expect(bars(w)[1].findAll('tspan')).toHaveLength(1)
  })

  it('customRenderers.barColor；沒有資料時顯示提示', async () => {
    const w = await mountChart({ customRenderers: { barColor: (e: WaterfallEvent) => (e.label === 'AOI' ? 'purple' : null) } })
    expect(bars(w)[1].find('.wfc-bar').attributes('style')).toContain('purple')
    expect(bars(w)[3].find('.wfc-bar').attributes('style')).toContain('danger-solid')
    await w.setProps({ data: [] })
    expect(w.text()).toContain('沒有資料')
    expect(w.find('svg').attributes('aria-label')).toContain('沒有資料')
  })

  it('aria-label 說明起訖與變化最大的項目', async () => {
    const w = await mountChart({ title: '良率' })
    expect(w.find('svg').attributes('aria-label')).toBe('良率：從 1,000 到 900，變化最大的是 AOI（−60）。可用左右鍵逐項查看')
    await w.setProps({ data: [{ label: 'x', value: 5, type: 'delta' }], firstIsStart: false, totalLabel: null, title: '' })
    expect(w.find('svg').attributes('aria-label')).toContain('瀑布圖：從 0 到 5')
  })
})

describe('WaterfallChart：事件與提示框', () => {
  it('滑過增減：數值、名稱、起訖、佔起點；bar-hover 只送一次', async () => {
    const w = await mountChart()
    await bars(w)[1].trigger('mouseenter', { clientX: 10, clientY: 10 })
    await bars(w)[1].trigger('mousemove', { clientX: 12, clientY: 12 })
    const tip = w.find('[role="tooltip"]').text()
    expect(tip).toContain('−60')
    expect(tip).toContain('AOI')
    expect(tip).toContain('1,000 → 940')
    expect(tip).toContain('佔起點 6.0%')
    expect(w.emitted('bar-hover')).toHaveLength(1)
    expect(lastEvent<WaterfallEvent>(w, 'bar-hover')).toMatchObject({ kind: 'delta', value: -60, from: 1000, to: 940 })
    expect(lastEvent<WaterfallEvent>(w, 'bar-hover').datum).toBe(DATA[1])
    await bars(w)[1].trigger('mouseleave')
    expect(w.emitted('tooltip-hide')).toHaveLength(1)
  })

  it('滑過總計：顯示「總計」與良率；小計顯示「小計」；起點沒有額外說明', async () => {
    const w = await mountChart({
      data: [
        { label: 's', value: 100, type: 'start' },
        { label: 'd', value: -10, type: 'delta' },
        { label: 'sub', type: 'subtotal' },
      ],
    })
    await bars(w)[3].trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('總計')
    expect(w.find('[role="tooltip"]').text()).toContain('佔起點 90.0%')
    expect(lastEvent<WaterfallEvent>(w, 'bar-hover').datum).toBeNull()
    await bars(w)[2].trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('小計')
    await bars(w)[0].trigger('mouseenter')
    expect(w.find('[role="tooltip"]').findAll('.text-content-tertiary')).toHaveLength(0)
  })

  it('點擊送出 bar-click；customRenderers.tooltip；enableTooltip=false 不顯示', async () => {
    const w = await mountChart({ customRenderers: { tooltip: (e: WaterfallEvent) => [`站別代碼 ${e.key}`] } })
    await bars(w)[2].trigger('click')
    expect(lastEvent<WaterfallEvent>(w, 'bar-click').label).toBe('重工回收')
    await bars(w)[2].trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('站別代碼 重工回收')
    await w.setProps({ enableTooltip: false })
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('鍵盤：左右逐項、Home／End、Enter 點擊、Escape 關掉；aria-live 唸出內容', async () => {
    const w = await mountChart()
    const svg = w.find('svg')
    const key = (k: string) => svg.trigger('keydown', { key: k })
    await key('ArrowRight')
    expect(lastEvent<WaterfallEvent>(w, 'bar-hover').label).toBe('投入')
    await key('ArrowDown')
    expect(w.find('[aria-live]').text()).toBe('AOI：−60，1,000 到 940')
    await key('ArrowLeft')
    await key('ArrowUp')
    expect(lastEvent<WaterfallEvent>(w, 'bar-hover').label).toBe('投入')
    await key('End')
    expect(w.find('[aria-live]').text()).toBe('良品：900')
    await key('Home')
    await key('Enter')
    expect(lastEvent<WaterfallEvent>(w, 'bar-click').label).toBe('投入')
    await key('Escape')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    await key(' ')
    expect(w.emitted('bar-click')).toHaveLength(1)
    await key('q')
    await svg.trigger('blur')
    await key('ArrowLeft')
    expect(lastEvent<WaterfallEvent>(w, 'bar-hover').label).toBe('投入')
  })

  it('沒有資料時按鍵不做事；掛載送出 chart-ready', async () => {
    const w = await mountChart({ data: [] })
    await w.find('svg').trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('bar-hover')).toBeUndefined()
    expect(w.emitted('chart-ready')?.[0][0]).toEqual({ width: 500, height: 320 })
  })
})
