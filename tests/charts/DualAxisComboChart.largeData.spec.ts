import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import * as d3 from 'd3'
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue'
import FacetedChart from '@/components/library/charts/FacetedChart.vue'
import type { ChartLayer } from '@/components/library/charts/types/chart.types'

/**
 * 大量資料模式與滾輪縮放。
 *
 * 圖表 600×400、預設 margin（上 60、右 80、下 60、左 80）→ 繪圖區 440×280（PLOT_W × 280）。
 * jsdom 沒有排版，d3.pointer 退回 clientX - getBoundingClientRect().left（皆為 0），
 * 所以事件的 clientX / clientY 直接就是繪圖區座標。
 */

interface Pt extends Record<string, unknown> {
  x: number
  y: number
}

const PLOT_W = 440

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

/** 假的 2D context：記錄畫了幾個點 / 矩形 */
function mockCanvas() {
  const calls = { rect: 0, arc: 0, fill: 0 }
  const ctx = {
    setTransform: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    rect: () => { calls.rect++ },
    arc: () => { calls.arc++ },
    fill: () => { calls.fill++ },
    globalAlpha: 1,
    fillStyle: '',
  }
  const spy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  return { calls, spy }
}

async function mountChart(props: Record<string, unknown>) {
  wrapper = mount(DualAxisComboChart, {
    props: { width: 600, height: 400, animationDuration: 0, ...props },
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

/** 等 requestAnimationFrame（滾輪合併到下一幀才套用）與重繪 */
async function flushFrame() {
  await new Promise((r) => setTimeout(r, 40))
  await nextTick()
  await nextTick()
}

function points(n: number, y: (i: number) => number = () => 50): Pt[] {
  return Array.from({ length: n }, (_, i) => ({ x: i, y: y(i) }))
}

function scatter(data: Pt[], extra: Partial<ChartLayer<Pt>> = {}): ChartLayer<Pt> {
  return { type: 'scatter', data, xValue: (d) => d.x, yValue: (d) => d.y, ...extra }
}

function line(data: Pt[], extra: Partial<ChartLayer<Pt>> = {}): ChartLayer<Pt> {
  return { type: 'line', data, xValue: (d) => d.x, yValue: (d) => d.y, showDots: true, ...extra }
}

function wheel(target: Element, init: WheelEventInit) {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

describe('DualAxisComboChart：大量資料模式', () => {
  it('散點超過門檻：不建立 SVG 圓點，改畫在 Canvas 上', async () => {
    const { calls } = mockCanvas()
    const w = await mountChart({ layers: [scatter(points(5000))], xScaleType: 'linear' })
    expect(w.findAll('circle.scatter-dot')).toHaveLength(0)
    expect(calls.arc).toBe(5000)
  })

  it('未超過門檻時維持原本的 SVG 渲染，不取用 Canvas', async () => {
    const { spy } = mockCanvas()
    const w = await mountChart({ layers: [scatter(points(100))], xScaleType: 'linear' })
    expect(w.findAll('circle.scatter-dot')).toHaveLength(100)
    expect(spy).not.toHaveBeenCalled()
  })

  it('門檻可調整（largeDataThreshold）', async () => {
    mockCanvas()
    const w = await mountChart({ layers: [scatter(points(100))], xScaleType: 'linear', largeDataThreshold: 50 })
    expect(w.findAll('circle.scatter-dot')).toHaveLength(0)
  })

  it('折線超過門檻：path 的點數降到每像素欄最多 4 點，且不畫圓點', async () => {
    const data = points(50_000, (i) => 50 + Math.sin(i / 100) * 20)
    const w = await mountChart({ layers: [line(data, { curve: d3.curveLinear })], xScaleType: 'linear' })
    const d = w.find('path.line').attributes('d') ?? ''
    const commands = d.split(/[ML]/).length - 1
    expect(commands).toBeGreaterThan(100)
    expect(commands).toBeLessThanOrEqual(PLOT_W * 4 + 8)
    expect(w.findAll('circle.line-dot')).toHaveLength(0)
  })

  it('堆疊長條超過門檻：畫在 Canvas 上（每段一個矩形）', async () => {
    const { calls } = mockCanvas()
    const rows = Array.from({ length: 1500 }, (_, i) => ({ c: `C${i}`, a: 1, b: 2 }))
    const w = await mountChart({
      layers: [{ type: 'stacked-bar', data: rows, xValue: (d: { c: string }) => d.c, stackKeys: ['a', 'b'] }],
    })
    expect(w.findAll('rect.stacked-bar')).toHaveLength(0)
    expect(calls.rect).toBe(3000)
  })

  it('band 軸類別很多時刻度抽樣（原本每個類別一個 <text>，數萬個直接卡死）', async () => {
    mockCanvas()
    const rows = Array.from({ length: 5000 }, (_, i) => ({ c: `C${i}`, v: i }))
    const w = await mountChart({
      layers: [{ type: 'bar', data: rows, xValue: (d: { c: string }) => d.c, yValue: (d: { v: number }) => d.v }],
    })
    await new Promise((r) => setTimeout(r, 30))
    const ticks = w.findAll('.x-axis .tick').length
    expect(ticks).toBeGreaterThan(5)
    expect(ticks).toBeLessThanOrEqual(30)
  })

  describe('hover（Canvas 上沒有 DOM 元素，改用座標命中測試）', () => {
    // x 0..2999 對應 0..440px；y 固定 50，Y 軸 [0, 100] → 140px
    const data = points(3000)
    const props = { layers: [scatter(data)], xScaleType: 'linear', yLeftDomain: [0, 100], enableBrush: false }

    it('指到點時發出 tooltip-show，帶原始資料並畫出 hover 標記', async () => {
      mockCanvas()
      const w = await mountChart(props)
      w.find('svg').element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 220, clientY: 140 }))
      await nextTick()
      const shown = w.emitted('tooltip-show')!
      expect(shown).toHaveLength(1)
      const payload = shown[0][0] as { data: Pt }
      expect(payload.data.x).toBeGreaterThanOrEqual(1498)
      expect(payload.data.x).toBeLessThanOrEqual(1501)
      expect(w.findAll('.hover-layer circle')).toHaveLength(1)
    })

    it('在同一點上移動不重複發事件；離開點或離開圖表就隱藏', async () => {
      mockCanvas()
      const w = await mountChart(props)
      const svg = w.find('svg').element
      svg.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 220, clientY: 140 }))
      svg.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 220, clientY: 141 }))
      expect(w.emitted('tooltip-show')).toHaveLength(1)

      // 遠離資料（Y 軸 90 的位置）
      svg.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 220, clientY: 28 }))
      expect(w.emitted('tooltip-hide')).toHaveLength(1)
      expect(w.findAll('.hover-layer circle')).toHaveLength(0)

      svg.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 220, clientY: 140 }))
      svg.dispatchEvent(new MouseEvent('mouseleave'))
      expect(w.emitted('tooltip-hide')).toHaveLength(2)
    })

    it('長條：指到哪一段就帶哪個 seriesKey', async () => {
      mockCanvas()
      const rows = Array.from({ length: 1500 }, (_, i) => ({ c: `C${i}`, a: 10, b: 10 }))
      const w = await mountChart({
        layers: [{ type: 'stacked-bar', data: rows, xValue: (d: { c: string }) => d.c, stackKeys: ['a', 'b'] }],
        yLeftDomain: [0, 40],
        enableBrush: false,
      })
      // a 段在 0~10（y 210~280px）、b 段在 10~20（140~210px）
      w.find('svg').element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 220, clientY: 170 }))
      const payload = w.emitted('tooltip-show')![0][0] as { seriesKey: string }
      expect(payload.seriesKey).toBe('b')
      expect(w.findAll('.hover-layer rect')).toHaveLength(1)
    })
  })
})

describe('DualAxisComboChart：滾輪縮放', () => {
  // x 0..990（100 點）→ 0..440px
  const data = Array.from({ length: 100 }, (_, i) => ({ x: i * 10, y: (i % 10) * 10 }))
  const base = { layers: [line(data)], xScaleType: 'linear' }

  it('在繪圖區往內滾：以游標為中心放大 X 軸，攔下頁面捲動並送出 wheel-zoom', async () => {
    const w = await mountChart(base)
    const event = wheel(w.find('svg').element, { deltaY: -100, clientX: 330, clientY: 100 })
    expect(event.defaultPrevented).toBe(true)
    await flushFrame()

    const [payload] = w.emitted('wheel-zoom')![0] as [{ axis: string; domain: [number, number] }]
    expect(payload.axis).toBe('x')
    const [a, b] = payload.domain
    // 一格約放大 1.22 倍
    expect(b - a).toBeCloseTo(990 / Math.exp(0.2), 0)
    // 游標（75% 處、值 742.5）的位置不變
    expect((742.5 - a) / (b - a)).toBeCloseTo(0.75, 2)
    // 縮放後出現重設縮放按鈕（文字與 StatusScatterMap、分面圖一致）
    expect(w.find('button').text()).toBe('重設縮放')
  })

  it('已在全覽時往外滾：不攔截（交還給頁面捲動）也不送事件', async () => {
    const w = await mountChart(base)
    const event = wheel(w.find('svg').element, { deltaY: 100, clientX: 200, clientY: 100 })
    expect(event.defaultPrevented).toBe(false)
    await flushFrame()
    expect(w.emitted('wheel-zoom')).toBeUndefined()
  })

  it('縮回全覽時 domain 回到 null、重置按鈕消失', async () => {
    const w = await mountChart(base)
    const svg = w.find('svg').element
    wheel(svg, { deltaY: -100, clientX: 200, clientY: 100 })
    await flushFrame()
    wheel(svg, { deltaY: 400, clientX: 200, clientY: 100 })
    await flushFrame()
    const events = w.emitted('wheel-zoom')!
    expect((events.at(-1)![0] as { domain: unknown }).domain).toBeNull()
    expect(w.find('button').exists()).toBe(false)
  })

  it('同一幀內的多個滾輪事件合併成一次縮放', async () => {
    const w = await mountChart(base)
    const svg = w.find('svg').element
    for (let i = 0; i < 5; i++) wheel(svg, { deltaY: -20, clientX: 220, clientY: 100 })
    await flushFrame()
    const events = w.emitted('wheel-zoom')!
    expect(events).toHaveLength(1)
    const [a, b] = (events[0][0] as { domain: [number, number] }).domain
    expect(b - a).toBeCloseTo(990 / Math.exp(0.2), 0)
  })

  it('縮放後左右滑動（deltaX）平移 X 軸，寬度不變', async () => {
    const w = await mountChart(base)
    const svg = w.find('svg').element
    wheel(svg, { deltaY: -300, clientX: 220, clientY: 100 })
    await flushFrame()
    const [a0, b0] = (w.emitted('wheel-zoom')![0][0] as { domain: [number, number] }).domain
    wheel(svg, { deltaX: 44, clientX: 220, clientY: 100 })
    await flushFrame()
    const [a1, b1] = (w.emitted('wheel-zoom')![1][0] as { domain: [number, number] }).domain
    expect(b1 - a1).toBeCloseTo(b0 - a0)
    // 往右滑 44px（繪圖區 10%）→ 往右移 10% 的寬度
    expect(a1 - a0).toBeCloseTo((b0 - a0) * 0.1)
  })

  it('在左 Y 軸上滾動：縮放左 Y 軸', async () => {
    const w = await mountChart({ ...base, yLeftDomain: [0, 100] })
    const event = wheel(w.find('svg').element, { deltaY: -100, clientX: -30, clientY: 140 })
    expect(event.defaultPrevented).toBe(true)
    await flushFrame()
    const [payload] = w.emitted('wheel-zoom')![0] as [{ axis: string; domain: [number, number] }]
    expect(payload.axis).toBe('yLeft')
    // 游標在 50 的位置，縮放後 50 仍在正中央
    expect((payload.domain[0] + payload.domain[1]) / 2).toBeCloseTo(50)
    expect(payload.domain[1] - payload.domain[0]).toBeLessThan(100)
  })

  it("wheelZoomModifier='ctrl'：沒按 Ctrl 時照常捲動頁面，按住才縮放", async () => {
    const w = await mountChart({ ...base, wheelZoomModifier: 'ctrl' })
    const svg = w.find('svg').element
    expect(wheel(svg, { deltaY: -100, clientX: 200, clientY: 100 }).defaultPrevented).toBe(false)
    expect(wheel(svg, { deltaY: -100, clientX: 200, clientY: 100, ctrlKey: true }).defaultPrevented).toBe(true)
  })

  it('enableWheelZoom=false 時完全不處理滾輪', async () => {
    const w = await mountChart({ ...base, enableWheelZoom: false })
    expect(wheel(w.find('svg').element, { deltaY: -100, clientX: 200, clientY: 100 }).defaultPrevented).toBe(false)
    await flushFrame()
    expect(w.emitted('wheel-zoom')).toBeUndefined()
  })

  it('繪圖區外（標題列）的滾動不攔截', async () => {
    const w = await mountChart(base)
    expect(wheel(w.find('svg').element, { deltaY: -100, clientX: 200, clientY: -40 }).defaultPrevented).toBe(false)
  })

  it('band 軸：縮成連續的類別子集', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ c: `C${i}`, v: i }))
    const w = await mountChart({
      layers: [{ type: 'bar', data: rows, xValue: (d: { c: string }) => d.c, yValue: (d: { v: number }) => d.v }],
    })
    wheel(w.find('svg').element, { deltaY: -300, clientX: 220, clientY: 100 })
    await flushFrame()
    const domain = (w.emitted('wheel-zoom')![0][0] as { domain: string[] }).domain
    expect(domain.length).toBeLessThan(20)
    expect(domain.length).toBeGreaterThanOrEqual(2)
    const start = Number(domain[0].slice(1))
    expect(domain).toEqual(Array.from({ length: domain.length }, (_, i) => `C${start + i}`))
    expect(w.findAll('rect.bar')).toHaveLength(domain.length)
  })

  it('大量資料：放大到可見筆數低於門檻時自動切回 SVG（有圓點可以 hover）', async () => {
    mockCanvas()
    const w = await mountChart({ layers: [scatter(points(3000))], xScaleType: 'linear' })
    expect(w.findAll('circle.scatter-dot')).toHaveLength(0)
    const svg = w.find('svg').element
    for (let i = 0; i < 4; i++) {
      wheel(svg, { deltaY: -300, clientX: 220, clientY: 100 })
      await flushFrame()
    }
    const visible = w.findAll('circle.scatter-dot').length
    expect(visible).toBeGreaterThan(0)
    expect(visible).toBeLessThan(2000)
  })

  it('滾輪縮放後，父層再改 xDomain 仍會生效（不會被當成自己的縮放而忽略）', async () => {
    const w = await mountChart(base)
    wheel(w.find('svg').element, { deltaY: -300, clientX: 220, clientY: 100 })
    await flushFrame()
    await w.setProps({ xDomain: [100, 200] })
    await nextTick()
    const ticks = w.findAll('.x-axis .tick text').map((t) => Number(t.text().replace(/,/g, '')))
    await new Promise((r) => setTimeout(r, 30))
    const after = w.findAll('.x-axis .tick text').map((t) => Number(t.text().replace(/,/g, '')))
    const all = after.length ? after : ticks
    expect(Math.min(...all)).toBeGreaterThanOrEqual(100)
    expect(Math.max(...all)).toBeLessThanOrEqual(200)
    expect(w.find('button').exists()).toBe(false)
  })

  it('卸載時移除滾輪監聽', async () => {
    const w = await mountChart(base)
    const svg = w.find('svg').element
    const remove = vi.spyOn(svg, 'removeEventListener')
    // 卸載時 template ref 已經是 null；監聽必須從掛載時記下的元素移除
    w.unmount()
    wrapper = null
    expect(remove).toHaveBeenCalledWith('wheel', expect.any(Function))
  })
})

describe('FacetedChart：滾輪縮放預設關閉', () => {
  let facetWrapper: VueWrapper | null = null
  beforeEach(() => {
    facetWrapper = null
  })
  afterEach(() => facetWrapper?.unmount())

  const facets = [
    { id: 'a', title: 'A', layers: [line(points(20))] },
    { id: 'b', title: 'B', layers: [line(points(20))] },
  ]

  it('預設不攔截滾輪（分面圖通常很高，滾輪應捲動頁面）', async () => {
    facetWrapper = mount(FacetedChart, { props: { facets, xScaleType: 'linear', width: 600, totalHeight: 500 } })
    await nextTick()
    for (const child of facetWrapper.findAllComponents(DualAxisComboChart)) {
      expect(child.props('enableWheelZoom')).toBe(false)
    }
  })

  it('開啟後 X 軸縮放同步到所有分面', async () => {
    facetWrapper = mount(FacetedChart, {
      props: { facets, xScaleType: 'linear', width: 600, totalHeight: 500, enableWheelZoom: true },
      attachTo: document.body,
    })
    await nextTick()
    await nextTick()
    const [first, second] = facetWrapper.findAllComponents(DualAxisComboChart)
    wheel(first.find('svg').element, { deltaY: -300, clientX: 100, clientY: 50 })
    await flushFrame()
    const emitted = facetWrapper.emitted('wheel-zoom')!
    expect((emitted[0][0] as { facetId: string }).facetId).toBe('a')
    const domain = (emitted[0][0] as { domain: [number, number] }).domain
    expect(second.props('xDomain')).toEqual(domain)
  })
})
