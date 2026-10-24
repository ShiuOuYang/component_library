import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ControlChart from '@/components/library/charts/ControlChart.vue'
import type { ControlChartAnalysis, ControlChartPoint, ControlChartTooltip } from '@/components/library'
import { buildSamples, computeLimits } from '@/components/library/charts/utils/spc'

/**
 * 圖 600×400、預設 margin（上 20、右 84、下 28、左 56）→ 繪圖區寬 460。
 * jsdom 沒有排版：d3.pointer 就是 clientX / clientY；第 i 點的 x = 56 + step × (i + 0.5)。
 */
const PLOT_W = 460
// 第 6 點（索引 5）明顯超出界限
const VALUES = [10, 10.2, 9.9, 10.1, 9.8, 13, 10, 10.1, 9.9, 10.05]

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function mountChart(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  wrapper = mount(ControlChart, {
    props: { data: VALUES.map((value, i) => ({ value, label: `S${i + 1}` })), width: 600, height: 400, ...props },
    slots,
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

const svg = (w: VueWrapper) => w.find('svg.cc-svg')
const xOf = (i: number, n = VALUES.length) => 56 + (PLOT_W / n) * (i + 0.5)
function move(w: VueWrapper, x: number, y = 100) {
  svg(w).element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }))
  return nextTick()
}
const labels = (w: VueWrapper) => w.findAll('.cc-limit-label').map((t) => t.text())
const lastAnalysis = (w: VueWrapper) => w.emitted('analysis-change')!.at(-1)![0] as ControlChartAnalysis

describe('ControlChart：計算與繪製', () => {
  it('I-MR：主圖與副圖、界限數值、與計算函式一致', async () => {
    const w = await mountChart()
    expect(w.findAll('.cc-panel-label').map((t) => t.text())).toEqual(['個別值（I）', '移動全距（MR）'])
    const a = lastAnalysis(w)
    const expected = computeLimits('imr', buildSamples('imr', VALUES.map((value) => ({ value })), {
      valueField: 'value', labelField: 'label', subgroupField: 'subgroup', subgroupSize: 5, defectsField: 'defects', sizeField: 'size',
    }))
    expect(a.limits.ucl).toBeCloseTo(expected.main.ucl[0])
    expect(a.secondaryLimits!.ucl).toBeCloseTo(expected.secondary!.ucl[0])
    expect(a.sigma).toBeCloseTo(expected.sigmaHat!)
    expect(labels(w)).toContain(`UCL ${+a.limits.ucl.toFixed(4)}`)
    expect(labels(w).some((t) => t.startsWith('LCL 0'))).toBe(true)
  })

  it('異常點畫成菱形並標上規則編號；正常點畫圓點', async () => {
    const w = await mountChart()
    const v = w.findAll('.cc-violation')
    expect(v.length).toBeGreaterThanOrEqual(1)
    expect(v[0].find('text').text()).toBe('1')
    expect(lastAnalysis(w).violations[0]).toEqual({ index: 5, rules: [1] })
    // 移動全距的兩個大跳動在副圖也標出
    expect(lastAnalysis(w).secondaryViolations.map((x) => x.index)).toEqual([5, 6])
    // 異常點不再畫圓點
    expect(w.findAll('.cc-point').filter((c) => (c.element as SVGElement).style.display !== 'none').length).toBe(9 + 9 - 2)
  })

  it('也可以直接給數字陣列', async () => {
    const w = await mountChart({ data: VALUES })
    expect(w.findAll('.cc-x-axis text')[0].text()).toBe('1')
    expect(lastAnalysis(w).violations[0].index).toBe(5)
  })

  it('rules 指定要檢查的規則；[] 不檢查', async () => {
    const w = await mountChart({ rules: [] })
    expect(lastAnalysis(w).violations).toEqual([])
    expect(w.findAll('.cc-violation').length).toBe(2) // 副圖仍檢查規則 1
    await w.setProps({ rules: [1, 99] })
    expect(lastAnalysis(w).violations).toEqual([{ index: 5, rules: [1] }])
  })

  it('limits 指定已核定的界限；baselineCount 只用前 N 點', async () => {
    const w = await mountChart({ limits: { cl: 10, ucl: 14, lcl: 6 } })
    expect(lastAnalysis(w).limits).toEqual({ cl: 10, ucl: 14, lcl: 6 })
    expect(lastAnalysis(w).violations).toEqual([])
    await w.setProps({ limits: null, baselineCount: 5 })
    expect(lastAnalysis(w).limits.cl).toBeCloseTo((10 + 10.2 + 9.9 + 10.1 + 9.8) / 5)
  })

  it('X̄-R：依子組欄位分組，X 軸用標籤欄位', async () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ subgroup: Math.floor(i / 4), batch: `B${Math.floor(i / 4) + 1}`, value: 5 + (i % 4) * 0.1 }))
    const w = await mountChart({ data, type: 'xbar-r', labelField: 'batch' })
    expect(w.findAll('.cc-panel-label').map((t) => t.text())).toEqual(['平均（X̄）', '全距（R）'])
    expect(w.findAll('.cc-x-axis text').map((t) => t.text())[0]).toBe('B1')
    expect(w.findAll('.cc-point')).toHaveLength(10)
  })

  it('X̄-S 與 u 圖的標題', async () => {
    const w = await mountChart({ data: VALUES.map((value) => ({ value })), type: 'xbar-s', subgroupSize: 2 })
    expect(w.findAll('.cc-panel-label').map((t) => t.text())).toEqual(['平均（X̄）', '標準差（S）'])
    await w.setProps({ type: 'u', data: [{ defects: 3, size: 2 }, { defects: 1, size: 2 }] })
    expect(w.findAll('.cc-panel-label').map((t) => t.text())).toEqual(['單位缺點數（u）'])
  })

  it('p 圖：只有主圖、百分比格式；樣本數不同時界限是階梯', async () => {
    const data = [100, 200, 100, 400].map((size, i) => ({ defects: [3, 5, 2, 9][i], size }))
    const w = await mountChart({ data, type: 'p' })
    expect(w.findAll('.cc-panel-label').map((t) => t.text())).toEqual(['不良率（p）'])
    expect(labels(w).some((t) => /^CL \d+\.\d{2}%$/.test(t))).toBe(true)
    const ucl = w.find('.cc-limit.is-ucl').attributes('d')!
    expect(ucl.match(/H/g)!.length).toBe(4)
    expect(new Set(ucl.match(/,[\d.]+ H/g)).size).toBeGreaterThan(1)
  })

  it('規格線與標籤；界限數值太近時往外推開', async () => {
    const w = await mountChart({ specLimits: { usl: 10.3, lsl: 9.7, target: 10 } })
    expect(w.findAll('.cc-spec')).toHaveLength(3)
    expect(labels(w)).toEqual(expect.arrayContaining(['USL 10.3', 'LSL 9.7', '目標 10']))
    const ys = w.findAll('.cc-panel-label')[0].element.parentElement!.querySelectorAll('.cc-limit-label')
    const sorted = Array.from(ys).map((t) => Number(t.getAttribute('y'))).sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(12 - 1e-9)
  })

  it('showZones：±1σ、±2σ 區帶（主圖、副圖各 4 條）', async () => {
    const w = await mountChart({ showZones: true })
    expect(w.findAll('.cc-zones path')).toHaveLength(8)
  })

  it('showSecondary=false 只畫主圖；showPoints 控制圓點', async () => {
    const w = await mountChart({ showSecondary: false, showPoints: false })
    expect(w.findAll('.cc-panel-label')).toHaveLength(1)
    expect(w.findAll('.cc-point')).toHaveLength(0)
    await w.setProps({ showPoints: null, data: Array.from({ length: 100 }, (_, i) => 10 + Math.sin(i)) })
    expect(w.findAll('.cc-point')).toHaveLength(0)
  })

  it('valueFormat；沒有資料時顯示提示', async () => {
    const w = await mountChart({ valueFormat: (v: number) => v.toFixed(1) })
    expect(labels(w)).toContain('CL 10.3')
    await w.setProps({ data: [] })
    expect(w.text()).toContain('沒有資料')
    expect(svg(w).attributes('aria-label')).toMatch(/沒有資料$/)
  })

  it('aria-label 摘要界限與異常點數', async () => {
    const w = await mountChart({ title: '銅厚' })
    expect(svg(w).attributes('aria-label')).toMatch(/^銅厚：10 點，CL .+、UCL .+、LCL .+；3 點異常。可用方向鍵逐點查看$/)
    expect(w.find('.cc-title').text()).toBe('銅厚')
  })

  it('資料改變時重送 analysis-change；ref.getAnalysis()', async () => {
    const w = await mountChart()
    const before = w.emitted('analysis-change')!.length
    await w.setProps({ data: VALUES.slice(0, 5) })
    await nextTick()
    expect(w.emitted('analysis-change')!.length).toBe(before + 1)
    const api = w.vm as unknown as { getAnalysis: () => ControlChartAnalysis }
    expect(api.getAnalysis().violations).toEqual([])
  })
})

describe('ControlChart：互動', () => {
  it('滑鼠對到最近的點：提示框有數值、副圖值、界限與觸發的規則', async () => {
    const w = await mountChart()
    await move(w, xOf(5) + 3)
    const p = w.emitted('point-hover')![0][0] as ControlChartPoint
    expect(p).toMatchObject({ index: 5, label: 'S6', value: 13, violations: [1] })
    expect(p.rows).toEqual([{ value: 13, label: 'S6' }])
    const tip = w.find('[role="tooltip"]')
    expect(tip.text()).toContain('13')
    expect(tip.text()).toContain('S6')
    expect(tip.text()).toContain('移動全距（MR）：3.2')
    expect(tip.text()).toContain('規則 1：1 點超出管制界限')
    expect(w.findAll('.cc-hover')).toHaveLength(2)
    // 同一點不重複送
    await move(w, xOf(5) - 3)
    expect(w.emitted('point-hover')).toHaveLength(1)
    expect((w.emitted('tooltip-show')![0][0] as ControlChartTooltip).valueText).toBe('13')
  })

  it('離開繪圖區或滑鼠移出時隱藏', async () => {
    const w = await mountChart()
    await move(w, xOf(2))
    await move(w, 10)
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    await move(w, xOf(2))
    svg(w).element.dispatchEvent(new MouseEvent('mouseleave'))
    await nextTick()
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('tooltip-hide')).toHaveLength(2)
  })

  it('點擊送出 point-click', async () => {
    const w = await mountChart()
    await svg(w).trigger('click')
    expect(w.emitted('point-click')).toBeUndefined()
    await move(w, xOf(3))
    await svg(w).trigger('click')
    expect((w.emitted('point-click')![0][0] as ControlChartPoint).index).toBe(3)
  })

  it('鍵盤：方向鍵逐點、Home／End、Enter 點擊、Esc 收起；唸出目前的點', async () => {
    const w = await mountChart()
    await svg(w).trigger('keydown', { key: 'ArrowRight' })
    expect((w.emitted('point-hover')![0][0] as ControlChartPoint).index).toBe(0)
    await svg(w).trigger('keydown', { key: 'End' })
    await svg(w).trigger('keydown', { key: 'ArrowRight' })
    expect((w.emitted('point-hover')!.at(-1)![0] as ControlChartPoint).index).toBe(9)
    await svg(w).trigger('keydown', { key: 'Home' })
    await svg(w).trigger('keydown', { key: 'ArrowLeft' })
    await svg(w).trigger('keydown', { key: 'Enter' })
    expect((w.emitted('point-click')![0][0] as ControlChartPoint).index).toBe(0)
    await svg(w).trigger('keydown', { key: 'a' })
    await svg(w).trigger('keydown', { key: 'Escape' })
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    // 從頭按左鍵：跳到最後一點，唸出異常
    await svg(w).trigger('keydown', { key: 'ArrowLeft' })
    await svg(w).trigger('keydown', { key: 'ArrowLeft' })
    await svg(w).trigger('keydown', { key: 'ArrowLeft' })
    await svg(w).trigger('keydown', { key: 'ArrowLeft' })
    await svg(w).trigger('keydown', { key: 'ArrowLeft' })
    expect(w.find('[aria-live="polite"]').text()).toBe('S6：13，異常（規則 1）')
    await svg(w).trigger('blur')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('沒有資料時滑鼠與按鍵不處理', async () => {
    const w = await mountChart({ data: [] })
    await move(w, 200)
    await svg(w).trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('point-hover')).toBeUndefined()
  })

  it('enableTooltip=false 不顯示預設提示框（事件照送）；customRenderers.tooltip', async () => {
    const w = await mountChart({ enableTooltip: false })
    await move(w, xOf(1))
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('point-hover')).toHaveLength(1)
    await w.setProps({ enableTooltip: true, customRenderers: { tooltip: (p: ControlChartPoint) => [`第 ${p.index + 1} 點`] } })
    await move(w, xOf(2))
    expect(w.find('[role="tooltip"]').text()).toContain('第 3 點')
    expect(w.find('[role="tooltip"]').text()).not.toContain('UCL')
  })

  it('p 圖的提示框顯示樣本數；X̄ 圖顯示子組大小', async () => {
    const w = await mountChart({ type: 'p', data: [{ defects: 3, size: 120 }, { defects: 2, size: 100 }] })
    await move(w, xOf(0, 2))
    expect(w.find('[role="tooltip"]').text()).toContain('樣本數：120')
    await w.setProps({ type: 'xbar-r', data: VALUES.map((value) => ({ value })), subgroupSize: 5 })
    await move(w, xOf(1, 2))
    expect(w.find('[role="tooltip"]').text()).toContain('子組大小：5')
  })

  it('tooltip 插槽', async () => {
    const w = await mountChart({}, { tooltip: '<template #tooltip="{ tooltipData, tooltipVisible }"><i v-if="tooltipVisible" class="tip">{{ tooltipData.label }}</i></template>' })
    await move(w, xOf(4))
    expect(w.find('.tip').text()).toBe('S5')
  })
})

describe('ControlChart：生命週期', () => {
  it('chart-ready；autoResize 跟著容器', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let callback: ResizeObserverCallback = () => {}
    vi.stubGlobal('ResizeObserver', vi.fn((cb: ResizeObserverCallback) => {
      callback = cb
      return { observe: vi.fn(), disconnect: vi.fn() }
    }))
    const w = await mountChart({ autoResize: true })
    expect(w.emitted('chart-ready')).toEqual([[{ width: 600, height: 400 }]])
    callback([{ contentRect: { width: 900, height: 500 } } as ResizeObserverEntry], {} as ResizeObserver)
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(svg(w).attributes('width')).toBe('900')
    expect(w.emitted('chart-resize')).toEqual([[{ width: 900, height: 500 }]])
  })
})
