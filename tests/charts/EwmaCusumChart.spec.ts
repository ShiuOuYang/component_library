import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import EwmaCusumChart from '@/components/library/charts/EwmaCusumChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

// μ0 = 10、σ = 1：前 10 點在 10 附近，之後往上偏 2σ
const VALUES = [10, 9.8, 10.2, 10.1, 9.9, 10, 10.3, 9.7, 10, 10.1, 12, 12.2, 11.8, 12.1, 12, 11.9, 12.3, 12]
const rows = VALUES.map((v, i) => ({ t: `S${i + 1}`, v }))

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})
const mountIt = (props: Record<string, unknown> = {}) =>
  (wrapper = mount(EwmaCusumChart, { props: { data: rows, value: 'v', label: 't', target: 10, sigma: 1, width: 600, height: 400, ...props }, attachTo: document.body }))

describe('EwmaCusumChart', () => {
  it('兩張圖、基準與參數、訊號摘要（含偏移開始與新平均）', () => {
    const w = mountIt({ k: 0.5, h: 4 })
    expect(w.find('[data-panel="ewma"]').exists()).toBe(true)
    expect(w.find('[data-panel="cusum"]').exists()).toBe(true)
    expect(w.find('[data-baseline]').text()).toBe('目標 μ0 = 10.00，σ = 1.000')
    expect(w.text()).toContain('EWMA：λ = 0.2，L = 3')
    expect(w.text()).toContain('CUSUM：k = 0.5，h = 4')
    expect(w.find('[data-ewma-summary]').text()).toMatch(/^EWMA 在第 S1\d 點超出管制界限$/)
    const cs = w.find('[data-cusum-summary]').text()
    expect(cs).toContain('約從第 S11 點開始向上偏移')
    expect(w.findAll('[data-ewma-signal]').length).toBeGreaterThan(0)
    expect(w.findAll('[data-cusum-signal]').length).toBeGreaterThan(0)
    expect(w.find('[data-onset]').exists()).toBe(true)
    expect(w.findAll('[data-raw]')).toHaveLength(VALUES.length)
    expect(w.find('[data-ucl]').attributes('d')).toMatch(/^M/)
    // 報讀用表格
    expect(w.findAll('table.sr-only tbody tr')).toHaveLength(VALUES.length)
    expect(w.find('table.sr-only').text()).toContain('（超出界限）')
  })

  it('只顯示 EWMA / 只顯示 CUSUM、不畫原始值；沒有訊號時的摘要', () => {
    const w = mountIt({ mode: 'ewma', showData: false, data: VALUES.slice(0, 10) })
    expect(w.find('[data-panel="cusum"]').exists()).toBe(false)
    expect(w.find('[data-cusum-summary]').exists()).toBe(false)
    expect(w.findAll('[data-raw]')).toHaveLength(0)
    expect(w.find('[data-ewma-summary]').text()).toBe('EWMA 沒有超出管制界限')
    w.unmount()
    const c = mountIt({ mode: 'cusum', data: VALUES.slice(0, 10) })
    expect(c.find('[data-panel="ewma"]').exists()).toBe(false)
    expect(c.find('[data-cusum-summary]').text()).toBe('CUSUM 沒有偏移訊號')
    expect(c.find('[data-onset]').exists()).toBe(false)
  })

  it('鍵盤：方向鍵、Home / End、PageUp、Enter 送出 point-click；滑鼠移動與點擊', async () => {
    const w = mountIt()
    const svg = w.find('svg')
    expect(svg.attributes('role')).toBe('slider')
    expect(svg.attributes('aria-label')).toContain('18 點')
    await svg.trigger('focus')
    await svg.trigger('keydown', { key: 'End' })
    expect(svg.attributes('aria-valuenow')).toBe(String(VALUES.length))
    expect(w.find('[data-tip]').text()).toContain('樣本 S18')
    await svg.trigger('keydown', { key: 'Home' })
    await svg.trigger('keydown', { key: 'ArrowRight' })
    await svg.trigger('keydown', { key: 'PageUp' })
    expect(svg.attributes('aria-valuenow')).toBe('12')
    expect(w.find('[aria-live="polite"]').text()).toContain('樣本 S12')
    await svg.trigger('keydown', { key: 'x' }) // 其他鍵不動
    expect(svg.attributes('aria-valuenow')).toBe('12')
    await svg.trigger('keydown', { key: 'Enter' })
    const ev = w.emitted('point-click')![0][0] as { index: number; label: string; value: number; ewma: { z: number }; cusum: { cPlus: number } }
    expect(ev).toMatchObject({ index: 11, label: 'S12', value: 12.2 })
    expect(ev.ewma.z).toBeGreaterThan(10)
    await svg.trigger('blur')
    expect(w.find('[data-tip]').exists()).toBe(false)

    // 滑鼠：jsdom 的 getBoundingClientRect 是 0，clientX 就是 svg 座標
    await svg.trigger('mousemove', { clientX: 52 })
    expect(w.find('[data-cursor]').exists()).toBe(true)
    expect(w.find('[data-tip]').text()).toContain('樣本 S1')
    await svg.trigger('click', { clientX: 600 })
    expect((w.emitted('point-click')![1][0] as { label: string }).label).toBe('S18')
    await svg.trigger('mouseleave')
    expect(w.find('[data-cursor]').exists()).toBe(false)
  })

  it('數字陣列、自訂格式、沒有資料、只有一點、對外方法', async () => {
    const w = mountIt({ data: [1, 2, 3, 2, 1], target: null, sigma: null, value: 'value', label: undefined, valueFormat: (v: number) => `${v.toFixed(1)}!` })
    expect(w.find('[data-baseline]').text()).toContain('1.8!')
    const vm = w.vm as unknown as { ewma: () => { points: unknown[] }; cusum: () => { shift: unknown } }
    expect(vm.ewma().points).toHaveLength(5)
    expect(vm.cusum().shift).toBeNull()
    w.unmount()
    const e = mountIt({ data: [] })
    expect(e.text()).toContain('沒有資料')
    expect(e.find('svg').exists()).toBe(false)
    e.unmount()
    const one = mountIt({ data: [5], target: null, sigma: null })
    expect(one.find('svg').exists()).toBe(true)
    await one.find('svg').trigger('mousemove', { clientX: 300 })
    expect(one.find('[data-tip]').text()).toContain('樣本 1')
    const big = mountIt({ data: [12345, 12000, 11800], target: 12000, sigma: 100 })
    expect(big.find('[data-baseline]').text()).toContain('12,000')
  })

  it('英文語系', () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(EwmaCusumChart, { data: VALUES, target: 10, sigma: 1, width: 500, height: 360 })) })
    expect(wrapper.text()).toContain('Target μ0 = 10.00, σ = 1.000')
    expect(wrapper.text()).toMatch(/CUSUM signal at sample \d+: upward shift starting around sample 11/)
  })

  it('很多點時加寬並可捲動', async () => {
    const many = Array.from({ length: 200 }, (_, i) => 10 + Math.sin(i))
    const w = mountIt({ data: many, width: 400 })
    await nextTick()
    expect(Number(w.find('svg').attributes('width'))).toBeGreaterThan(400)
  })
})
