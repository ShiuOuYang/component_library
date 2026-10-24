import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import CapabilityHistogram from '@/components/library/charts/CapabilityHistogram.vue'
import type { CapabilityResult, HistogramBin, HistogramTooltip } from '@/components/library'
import { computeCapability } from '@/components/library/charts/utils/spc'

/** 40 筆，平均約 9.99 */
const VALUES = Array.from({ length: 40 }, (_, i) => 10 + ((i % 9) - 4) * 0.05 + (i % 2 ? 0.01 : -0.01))

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function mountChart(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  wrapper = mount(CapabilityHistogram, {
    props: { data: VALUES, width: 600, height: 300, lsl: 9.5, usl: 10.5, ...props },
    slots,
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

const stat = (w: VueWrapper, label: string) =>
  w.findAll('.ch-stat').find((r) => r.find('dt').text() === label)!.find('dd').text()
const bars = (w: VueWrapper) => w.findAll('.ch-bin')
const lastCap = (w: VueWrapper) => w.emitted('capability-change')!.at(-1)![0] as CapabilityResult

describe('CapabilityHistogram：指標', () => {
  it('統計面板與計算函式一致；掛載時送出 capability-change', async () => {
    const w = await mountChart()
    const c = computeCapability({ values: VALUES, lsl: 9.5, usl: 10.5, subgroupSize: 1 })
    expect(lastCap(w)).toEqual(c)
    expect(stat(w, '樣本數')).toBe('40')
    expect(stat(w, 'Cp')).toBe(c.cp!.toFixed(2))
    expect(stat(w, 'Pp')).toBe(c.pp!.toFixed(2))
    expect(stat(w, 'Cpk')).toContain(c.cpk!.toFixed(2))
  })

  it('Cpk 狀態：圖示 + 文字，依門檻判定', async () => {
    const w = await mountChart()
    // 規格很寬：達標
    expect(w.find('.ch-status').text()).toBe('✓達標')
    expect(w.find('.ch-status').classes()).toContain('is-good')
    await w.setProps({ lsl: 9.85, usl: 10.15 })
    expect(w.find('.ch-status').classes()).toContain('is-critical')
    expect(w.find('.ch-status').text()).toBe('✕不足')
    const cpk = lastCap(w).cpk!
    await w.setProps({ cpkThresholds: [cpk - 0.1, cpk + 0.1] })
    expect(w.find('.ch-status').text()).toBe('!尚可')
  })

  it('單邊規格：Cp、Pp 顯示「—」', async () => {
    const w = await mountChart({ lsl: null })
    expect(stat(w, 'Cp')).toBe('—')
    expect(stat(w, 'Pp')).toBe('—')
    expect(stat(w, 'Cpk')).not.toBe('—')
  })

  it('沒有規格：沒有狀態；沒有資料：顯示提示', async () => {
    const w = await mountChart({ lsl: null, usl: null })
    expect(w.find('.ch-status').exists()).toBe(false)
    await w.setProps({ data: [] })
    expect(w.text()).toContain('沒有資料')
    expect(stat(w, '平均')).toBe('—')
    expect(w.find('svg').attributes('aria-label')).toBe('製程能力直方圖：沒有資料')
  })

  it('物件資料用 valueField；非數字略過', async () => {
    const w = await mountChart({ data: [{ t: 10 }, { t: 10.2 }, { t: 'x' }, { t: 9.9 }], valueField: 't' })
    expect(stat(w, '樣本數')).toBe('3')
  })

  it('資料改變時重送；ref.getCapability()', async () => {
    const w = await mountChart()
    const n = w.emitted('capability-change')!.length
    await w.setProps({ data: VALUES.map((v) => v + 0.1) })
    await nextTick()
    expect(w.emitted('capability-change')!.length).toBe(n + 1)
    const api = w.vm as unknown as { getCapability: () => CapabilityResult }
    expect(api.getCapability().mean).toBeCloseTo(computeCapability({ values: VALUES, lsl: null, usl: null, subgroupSize: 1 }).mean + 0.1)
  })
})

describe('CapabilityHistogram：圖形', () => {
  it('binCount 指定組數；規格外的組用紅色', async () => {
    const data = [...VALUES, 10.8, 10.82]
    const w = await mountChart({ data, binCount: 10 })
    expect(bars(w)).toHaveLength(10)
    const out = bars(w).filter((b) => b.classes().includes('is-out'))
    expect(out.length).toBeGreaterThanOrEqual(1)
    expect((out[0].find('.ch-bar').element as SVGElement).style.fill).toContain('danger-solid')
    expect((bars(w)[0].find('.ch-bar').element as SVGElement).style.fill).toContain('chart-1')
  })

  it('自動組數在 5～60 之間；全部同值也能畫', async () => {
    const w = await mountChart()
    expect(bars(w).length).toBeGreaterThanOrEqual(5)
    expect(bars(w).length).toBeLessThanOrEqual(60)
    // 全部同值：四分位距為 0，改用 Sturges（20 筆 → 6 組）
    await w.setProps({ data: Array(20).fill(10) })
    expect(bars(w).length).toBe(6)
    expect(stat(w, 'Cp')).toBe('—')
  })

  it('常態曲線：整體（實線）與組內（虛線，選用）', async () => {
    const w = await mountChart()
    expect(w.find('.ch-curve:not(.is-within)').attributes('d')).toMatch(/^M/)
    expect(w.find('.ch-curve.is-within').exists()).toBe(false)
    await w.setProps({ showWithinCurve: true, showCurve: false })
    expect(w.find('.ch-curve.is-within').exists()).toBe(true)
    expect(w.findAll('.ch-curve')).toHaveLength(1)
  })

  it('規格、目標、平均的線與文字；太近時錯開成兩排', async () => {
    const w = await mountChart({ target: 10 })
    const texts = w.findAll('.ch-marker text').map((t) => t.text())
    expect(texts).toEqual(expect.arrayContaining(['LSL 9.5', 'USL 10.5', '目標 10']))
    expect(texts.some((t) => t.startsWith('平均 '))).toBe(true)
    // 目標與平均幾乎同一個位置：一個在上排、一個在下排
    const ys = w.findAll('.ch-marker').filter((m) => m.classes().includes('is-target') || m.classes().includes('is-mean')).map((m) => m.find('text').attributes('y'))
    expect(new Set(ys).size).toBe(2)
  })

  it('統計面板放下方、或關掉（圖寬跟著變）', async () => {
    const w = await mountChart()
    const narrow = Number(w.find('svg').attributes('width'))
    await w.setProps({ statsPosition: 'bottom' })
    expect(w.find('.ch-stats').classes()).toContain('is-bottom')
    expect(Number(w.find('svg').attributes('width'))).toBeGreaterThan(narrow)
    await w.setProps({ showStats: false })
    expect(w.find('.ch-stats').exists()).toBe(false)
  })

  it('aria-label 摘要 Cpk 與判定', async () => {
    const w = await mountChart({ title: '銅厚' })
    expect(w.find('svg').attributes('aria-label')).toMatch(/^銅厚：40 筆，平均 [\d.]+，Cpk \d\.\d\d（達標），Ppk \d\.\d\d。可用方向鍵逐組查看$/)
  })
})

describe('CapabilityHistogram：互動', () => {
  it('滑過組：提示框有筆數、比例與範圍；離開隱藏', async () => {
    const w = await mountChart({ binCount: 8 })
    await bars(w)[3].trigger('mouseenter', { clientX: 100, clientY: 80 })
    const b = w.emitted('bin-hover')![0][0] as HistogramBin
    expect(b.index).toBe(3)
    expect(b.values).toHaveLength(b.count)
    const tip = w.find('[role="tooltip"]')
    expect(tip.text()).toContain(`${b.count} 筆`)
    expect(tip.text()).toContain(`${(b.share * 100).toFixed(1)}%`)
    expect((w.emitted('tooltip-show')![0][0] as HistogramTooltip).position).toEqual({ containerX: 100, containerY: 80 })
    await bars(w)[3].trigger('mousemove', { clientX: 110, clientY: 80 })
    expect(w.emitted('bin-hover')).toHaveLength(1)
    await bars(w)[3].trigger('mouseleave')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('tooltip-hide')).toHaveLength(1)
  })

  it('規格外的組提示「超出規格」；點擊送出 bin-click', async () => {
    const w = await mountChart({ data: [...VALUES, 10.8, 10.82], binCount: 10 })
    const out = bars(w).findIndex((b) => b.classes().includes('is-out'))
    await bars(w)[out].trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('超出規格')
    await bars(w)[out].trigger('click')
    expect((w.emitted('bin-click')![0][0] as HistogramBin).outOfSpec).toBe(true)
  })

  it('鍵盤：方向鍵逐組、Home／End、Enter 點擊、Esc 收起', async () => {
    const w = await mountChart({ binCount: 6 })
    const svg = w.find('svg')
    await svg.trigger('keydown', { key: 'ArrowLeft' })
    expect((w.emitted('bin-hover')![0][0] as HistogramBin).index).toBe(5)
    await svg.trigger('keydown', { key: 'Home' })
    await svg.trigger('keydown', { key: 'ArrowLeft' })
    await svg.trigger('keydown', { key: 'ArrowRight' })
    await svg.trigger('keydown', { key: 'End' })
    await svg.trigger('keydown', { key: 'ArrowRight' })
    await svg.trigger('keydown', { key: 'Enter' })
    expect((w.emitted('bin-click')![0][0] as HistogramBin).index).toBe(5)
    expect(w.find('[aria-live="polite"]').text()).toMatch(/筆$/)
    await svg.trigger('keydown', { key: 'x' })
    await svg.trigger('keydown', { key: 'Escape' })
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    await svg.trigger('keydown', { key: 'ArrowRight' })
    await svg.trigger('blur')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('沒有資料時按鍵不處理', async () => {
    const w = await mountChart({ data: [] })
    await w.find('svg').trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('bin-hover')).toBeUndefined()
  })

  it('customRenderers：barColor、tooltip；enableTooltip=false', async () => {
    const w = await mountChart({
      binCount: 5,
      customRenderers: {
        barColor: (b: HistogramBin) => (b.index === 0 ? '#00ff00' : null),
        tooltip: (b: HistogramBin) => [`第 ${b.index + 1} 組`],
      },
    })
    expect((bars(w)[0].find('.ch-bar').element as SVGElement).style.fill).toBe('rgb(0, 255, 0)')
    await bars(w)[1].trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('第 2 組')
    await w.setProps({ enableTooltip: false })
    await bars(w)[2].trigger('mouseenter')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('tooltip 插槽', async () => {
    const w = await mountChart({ binCount: 5 }, { tooltip: '<template #tooltip="{ tooltipData, tooltipVisible }"><i v-if="tooltipVisible" class="tip">{{ tooltipData.count }}</i></template>' })
    await bars(w)[2].trigger('mouseenter')
    expect(w.find('.tip').text()).toMatch(/^\d+$/)
  })

  it('chart-ready；autoResize 跟著容器', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let callback: ResizeObserverCallback = () => {}
    vi.stubGlobal('ResizeObserver', vi.fn((cb: ResizeObserverCallback) => {
      callback = cb
      return { observe: vi.fn(), disconnect: vi.fn() }
    }))
    const w = await mountChart({ autoResize: true, showStats: false })
    expect(w.emitted('chart-ready')).toEqual([[{ width: 600, height: 300 }]])
    callback([{ contentRect: { width: 900, height: 400 } } as ResizeObserverEntry], {} as ResizeObserver)
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(w.find('svg').attributes('width')).toBe('900')
  })
})
