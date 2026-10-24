import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import SparklineChart from '@/components/library/charts/SparklineChart.vue'
import GaugeChart from '@/components/library/charts/GaugeChart.vue'
import type { SparklinePoint } from '@/components/library'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/**
 * 迷你圖 106×20 加 margin 0 → 繪圖區 = 整張；5 個點 x = 0, 26.5, 53, 79.5, 106
 */
async function mountSpark(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  wrapper = mount(SparklineChart, {
    props: { data: [3, 5, 4, 8, 6], width: 106, height: 20, margin: { top: 0, right: 0, bottom: 0, left: 0 }, ...props },
    slots,
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

function move(w: VueWrapper, x: number) {
  w.find('svg').element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: 5 }))
  return nextTick()
}

describe('SparklineChart', () => {
  it('畫出線，最新一點用強調色、線用淡化色', async () => {
    const w = await mountSpark()
    const line = w.find('.spark-line')
    expect(line.attributes('d')).toMatch(/^M0,/)
    expect((line.element as SVGElement).style.stroke).toContain('content-tertiary')
    const last = w.find('.spark-dot.is-last')
    expect(last.attributes('cx')).toBe('106')
    // 6 在 [3, 8] 之間：y = 20 − (6 − 3) / 5 × 20 = 8
    expect(last.attributes('cy')).toBe('8')
    expect((last.element as SVGElement).style.fill).toContain('chart-1')
  })

  it('color / accentColor 自訂；showLastPoint=false 不畫最新一點', async () => {
    const w = await mountSpark({ color: '#ff0000', accentColor: '#00ff00' })
    expect((w.find('.spark-line').element as SVGElement).style.stroke).toBe('rgb(255, 0, 0)')
    expect((w.find('.spark-dot.is-last').element as SVGElement).style.fill).toBe('rgb(0, 255, 0)')
    await w.setProps({ showLastPoint: false })
    expect(w.find('.spark-dot.is-last').exists()).toBe(false)
  })

  it('面積：同色的淡淡一層', async () => {
    const w = await mountSpark({ type: 'area' })
    expect(w.find('.spark-area').attributes('d')).toBeTruthy()
    expect(w.find('.spark-line').exists()).toBe(true)
  })

  it('長條從 0 長出來，最後一根用強調色', async () => {
    const w = await mountSpark({ type: 'bar' })
    const bars = w.findAll('.spark-bar')
    expect(bars).toHaveLength(5)
    // 範圍含 0：[0, 8]，數值 8 的長條從 y=0 到 y=20
    expect(bars[3].attributes('y')).toBe('0')
    expect(bars[3].attributes('height')).toBe('20')
    expect((bars[4].element as SVGElement).style.fill).toContain('chart-1')
    expect((bars[0].element as SVGElement).style.fill).toContain('content-tertiary')
  })

  it('null 斷開線段；最新一點是最後一個有值的點', async () => {
    const w = await mountSpark({ data: [3, 5, null, 8, null] })
    expect(w.find('.spark-line').attributes('d')!.match(/M/g)).toHaveLength(2)
    expect(w.find('.spark-dot.is-last').attributes('cx')).toBe('79.5')
  })

  it('最高最低點（最新一點不重複標）', async () => {
    const w = await mountSpark({ showMinMax: true })
    expect(w.findAll('.spark-dot.is-minmax').map((d) => d.attributes('cx'))).toEqual(['0', '79.5'])
    await w.setProps({ data: [3, 5, 9] })
    expect(w.findAll('.spark-dot.is-minmax').map((d) => d.attributes('cx'))).toEqual(['0'])
  })

  it('參考線：範圍會納入參考值', async () => {
    const w = await mountSpark({ referenceValue: 13 })
    // 範圍 [3, 13]：13 在最上面
    expect(w.find('.spark-reference').attributes('y1')).toBe('0')
  })

  it('全部同一個值：線在中間；yDomain 指定範圍', async () => {
    const w = await mountSpark({ data: [5, 5, 5] })
    expect(w.find('.spark-dot.is-last').attributes('cy')).toBe('10')
    await w.setProps({ data: [0, 0], yDomain: null })
    expect(w.find('.spark-dot.is-last').attributes('cy')).toBe('10')
    await w.setProps({ data: [5, 10], yDomain: [0, 20] })
    expect(w.find('.spark-dot.is-last').attributes('cy')).toBe('10')
  })

  it('物件資料：valueField / labelField；滑鼠對到最近的點並顯示標籤', async () => {
    const data = ['W1', 'W2', 'W3', 'W4', 'W5'].map((week, i) => ({ week, y: [3, 5, 4, 8, 6][i] }))
    const w = await mountSpark({ data, valueField: 'y', labelField: 'week', valueFormat: (v: number) => `${v}%` })
    await move(w, 30)
    const p = w.emitted('point-hover')![0][0] as SparklinePoint
    expect(p).toMatchObject({ index: 1, value: 5, label: 'W2' })
    expect(p.datum).toBe(data[1])
    expect(w.find('[role="tooltip"]').text()).toBe('5%W2')
    expect(w.find('.spark-hover line').attributes('x1')).toBe('26.5')
    // 同一點不重複送
    await move(w, 28)
    expect(w.emitted('point-hover')).toHaveLength(1)
    // 靠右緣時提示框往左翻
    await move(w, 105)
    expect((w.find('[role="tooltip"]').element as HTMLElement).style.right).not.toBe('')
    w.find('svg').element.dispatchEvent(new MouseEvent('mouseleave'))
    await nextTick()
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('tooltip-hide')).toHaveLength(1)
  })

  it('滑鼠略過沒有值的點；enableTooltip=false 不處理', async () => {
    const w = await mountSpark({ data: [3, null, 4] })
    await move(w, 53)
    expect((w.emitted('point-hover')![0][0] as SparklinePoint).value).not.toBeNull()
    await w.setProps({ enableTooltip: false, data: [1, 2, 3] })
    await move(w, 0)
    expect(w.emitted('point-hover')).toHaveLength(1)
  })

  it('長條模式的滑鼠也對到最近的一根', async () => {
    const w = await mountSpark({ type: 'bar' })
    await move(w, 100)
    expect((w.emitted('point-hover')![0][0] as SparklinePoint).index).toBe(4)
    expect(w.findAll('.spark-bar')[4].classes()).toContain('is-hovered')
  })

  it('讀螢幕摘要：筆數、首尾、最高最低', async () => {
    const w = await mountSpark({ title: '良率' })
    expect(w.find('svg').attributes('aria-label')).toBe('良率：5 筆，從 3 到 6，最高 8，最低 3')
    await w.setProps({ data: [] })
    expect(w.find('svg').attributes('aria-label')).toBe('良率：沒有資料')
    expect(w.find('.spark-line').exists()).toBe(false)
  })

  it('tooltip 插槽', async () => {
    const w = await mountSpark({}, { tooltip: '<template #tooltip="{ tooltipData, tooltipVisible }"><i v-if="tooltipVisible" class="tip">{{ tooltipData.valueText }}</i></template>' })
    await move(w, 0)
    expect(w.find('.tip').text()).toBe('3')
  })

  it('chart-ready；autoResize 跟著容器', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let callback: ResizeObserverCallback = () => {}
    vi.stubGlobal('ResizeObserver', vi.fn((cb: ResizeObserverCallback) => {
      callback = cb
      return { observe: vi.fn(), disconnect: vi.fn() }
    }))
    const w = await mountSpark({ autoResize: true })
    expect(w.emitted('chart-ready')).toEqual([[{ width: 106, height: 20 }]])
    callback([{ contentRect: { width: 200, height: 40 } } as ResizeObserverEntry], {} as ResizeObserver)
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(w.find('svg').attributes('width')).toBe('200')
    expect(w.emitted('chart-resize')).toEqual([[{ width: 200, height: 40 }]])
  })
})

describe('GaugeChart', () => {
  const BANDS = [
    { to: 95, status: 'critical', label: '未達標' },
    { to: 97, status: 'warning', label: '注意' },
    { to: 100, status: 'good', label: '達標' },
  ]

  async function mountGauge(props: Record<string, unknown> = {}) {
    wrapper = mount(GaugeChart, { props: { value: 96.4, min: 85, max: 100, bands: BANDS, ...props }, attachTo: document.body })
    await nextTick()
    return wrapper
  }

  it('role="meter" 與數值；狀態用圖示加文字', async () => {
    const w = await mountGauge({ title: '良率', unit: '%' })
    const svg = w.find('svg')
    expect(svg.attributes('role')).toBe('meter')
    expect(svg.attributes('aria-label')).toBe('良率')
    expect(svg.attributes('aria-valuenow')).toBe('96.4')
    expect(svg.attributes('aria-valuemin')).toBe('85')
    expect(svg.attributes('aria-valuetext')).toBe('96.4%，注意')
    expect(w.find('.gauge-value-text').text()).toBe('96.4%')
    expect(w.find('.gauge-status').text()).toBe('注意')
    // 警告用三角形圖示
    expect(w.find('.gauge-status path').attributes('d')).toContain('L12,5')
  })

  it('填色依目前落在的區間；軌道同色', async () => {
    const w = await mountGauge()
    const fill = (w.find('.gauge-value').element as SVGElement).style.fill
    expect(fill).toContain('warning-solid')
    expect((w.find('.gauge-track').element as SVGElement).style.fill).toBe(fill)
    await w.setProps({ value: 99 })
    expect((w.find('.gauge-value').element as SVGElement).style.fill).toContain('success-solid')
    expect(w.find('.gauge-status circle').exists()).toBe(true)
    await w.setProps({ value: 90 })
    expect((w.find('.gauge-value').element as SVGElement).style.fill).toContain('danger-solid')
    // 超過最後一個區間：算最後一個
    await w.setProps({ value: 120 })
    expect(w.find('.gauge-status').text()).toBe('達標')
    expect(w.find('.gauge-value-text').text()).toBe('120')
  })

  it('外圈畫出各區間；showBands=false 不畫', async () => {
    const w = await mountGauge()
    expect(w.findAll('.gauge-bands path')).toHaveLength(3)
    await w.setProps({ showBands: false })
    expect(w.find('.gauge-bands').exists()).toBe(false)
  })

  it('區間自訂顏色；沒有 status 也沒有顏色時用類別色 1 號', async () => {
    const w = await mountGauge({ bands: [{ to: 90, color: '#ff0000' }, { to: 100 }], min: 0, value: 80 })
    expect((w.find('.gauge-value').element as SVGElement).style.fill).toBe('rgb(255, 0, 0)')
    expect(w.find('.gauge-status').exists()).toBe(false)
    await w.setProps({ value: 95 })
    expect((w.find('.gauge-value').element as SVGElement).style.fill).toContain('chart-1')
  })

  it('沒有區間：單一顏色、沒有狀態列', async () => {
    const w = await mountGauge({ bands: null })
    expect((w.find('.gauge-value').element as SVGElement).style.fill).toContain('chart-1')
    expect(w.find('.gauge-status').exists()).toBe(false)
    expect(w.find('svg').attributes('aria-valuetext')).toBe('96.4')
  })

  it('目標刻度與文字', async () => {
    const w = await mountGauge({ target: 97, valueFormat: (v: number) => v.toFixed(1) })
    expect(w.find('.gauge-target line').exists()).toBe(true)
    expect(w.find('.gauge-target text').text()).toBe('目標 97.0')
  })

  it('沒有數值：顯示「—」，不畫填色', async () => {
    const w = await mountGauge({ value: null, unit: '%' })
    expect(w.find('.gauge-value-text').text()).toBe('—')
    expect(w.find('.gauge-value').exists()).toBe(false)
    expect(w.find('svg').attributes('aria-valuenow')).toBeUndefined()
    expect(w.find('svg').attributes('aria-valuetext')).toBe('沒有資料')
    // 數值在最小值：沒有填色
    await w.setProps({ value: 85 })
    expect(w.find('.gauge-value').exists()).toBe(false)
  })

  it('兩端的最小最大值；showMinMax=false 不顯示', async () => {
    const w = await mountGauge()
    expect(w.findAll('.gauge-minmax').map((t) => t.text())).toEqual(['85', '100'])
    await w.setProps({ showMinMax: false })
    expect(w.findAll('.gauge-minmax')).toHaveLength(0)
  })

  it('半圓（sweep 180）比 240 矮', async () => {
    const w = await mountGauge({ sweep: 240 })
    const tall = Number(w.find('svg').attributes('height'))
    await w.setProps({ sweep: 180 })
    expect(Number(w.find('svg').attributes('height'))).toBeLessThan(tall)
  })

  it('min 等於 max 不會出錯；autoResize 寬度跟著容器', async () => {
    const w = await mountGauge({ min: 5, max: 5, value: 5, bands: null, autoResize: true })
    expect(w.find('svg').attributes('width')).toBe('100%')
    expect((w.element as HTMLElement).style.width).toBe('100%')
  })

  it('掛載時送出 chart-ready', async () => {
    const w = await mountGauge({ width: 300 })
    const [payload] = w.emitted('chart-ready')![0] as [{ width: number; height: number }]
    expect(payload.width).toBe(300)
    expect(payload.height).toBeGreaterThan(150)
  })
})
