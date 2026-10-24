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

/** 只取某一軸的 wheel-zoom 事件（繪圖區的滾輪會同時送 X 與 Y） */
function axisEvents(w: VueWrapper, axis: string) {
  return (w.emitted('wheel-zoom') ?? []).map((e) => e[0] as { axis: string; domain: unknown }).filter((e) => e.axis === axis)
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
    const events = axisEvents(w, 'x')
    expect(events).toHaveLength(1)
    const [a, b] = events[0].domain as [number, number]
    expect(b - a).toBeCloseTo(990 / Math.exp(0.2), 0)
  })

  it('縮放後左右滑動（deltaX）平移 X 軸，寬度不變', async () => {
    const w = await mountChart(base)
    const svg = w.find('svg').element
    wheel(svg, { deltaY: -300, clientX: 220, clientY: 100 })
    await flushFrame()
    const [a0, b0] = axisEvents(w, 'x')[0].domain as [number, number]
    wheel(svg, { deltaX: 44, clientX: 220, clientY: 100 })
    await flushFrame()
    const [a1, b1] = axisEvents(w, 'x')[1].domain as [number, number]
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

/**
 * 像 Allegro 的縮放：在繪圖區滾輪，X 與 Y 以游標那一點為中心同時縮放；中鍵拖曳平移。
 * 繪圖區 440 × 280（預設 margin 上 60、右 80、下 60、左 80）；jsdom 下 clientX / clientY 就是繪圖區座標。
 */
describe('DualAxisComboChart：XY 同時縮放與中鍵平移', () => {
  const PLOT_H = 280
  const data = Array.from({ length: 100 }, (_, i) => ({ x: i * 10, y: (i % 10) * 10 }))
  const base = { layers: [line(data)], xScaleType: 'linear', yLeftDomain: [0, 100] }
  /** 游標在 clientY 時對應的 Y 值（範圍 0～100） */
  const yAt = (clientY: number, [a, b]: [number, number] = [0, 100]) => b - (clientY / PLOT_H) * (b - a)

  it('繪圖區滾輪：X 與 Y 同時放大，游標底下的點留在原地', async () => {
    const w = await mountChart(base)
    wheel(w.find('svg').element, { deltaY: -100, clientX: 330, clientY: 100 })
    await flushFrame()
    const [x0, x1] = axisEvents(w, 'x')[0].domain as [number, number]
    const [y0, y1] = axisEvents(w, 'yLeft')[0].domain as [number, number]
    expect(x1 - x0).toBeCloseTo(990 / Math.exp(0.2), 0)
    expect(y1 - y0).toBeCloseTo(100 / Math.exp(0.2), 3)
    // 游標的資料點（742.5, 64.29）縮放前後都在游標底下
    expect((742.5 - x0) / (x1 - x0)).toBeCloseTo(0.75, 2)
    const v = yAt(100)
    expect((y1 - v) / (y1 - y0)).toBeCloseTo(100 / PLOT_H, 3)
    // X 先、Y 後（分面圖依 X 事件同步）
    expect((w.emitted('wheel-zoom')![0][0] as { axis: string }).axis).toBe('x')
  })

  it('雙 Y 軸：左右兩軸用同一個倍率、各自以游標那一列為中心', async () => {
    const right = data.map((d) => ({ x: d.x, y: d.y * 10 }))
    const w = await mountChart({ ...base, layers: [line(data), line(right, { yAxis: 'right' })], yRightDomain: [0, 1000] })
    wheel(w.find('svg').element, { deltaY: -200, clientX: 100, clientY: 70 })
    await flushFrame()
    const [l0, l1] = axisEvents(w, 'yLeft')[0].domain as [number, number]
    const [r0, r1] = axisEvents(w, 'yRight')[0].domain as [number, number]
    expect((l1 - l0) / 100).toBeCloseTo((r1 - r0) / 1000, 6)
    expect((l1 - yAt(70)) / (l1 - l0)).toBeCloseTo(70 / PLOT_H, 3)
    expect((r1 - yAt(70, [0, 1000])) / (r1 - r0)).toBeCloseTo(70 / PLOT_H, 3)
  })

  it("wheelZoomAxes='x'：繪圖區只縮放 X（原本的行為）", async () => {
    const w = await mountChart({ ...base, wheelZoomAxes: 'x' })
    wheel(w.find('svg').element, { deltaY: -100, clientX: 330, clientY: 100 })
    await flushFrame()
    expect(axisEvents(w, 'x')).toHaveLength(1)
    expect(axisEvents(w, 'yLeft')).toHaveLength(0)
  })

  it('在 X 軸刻度上滾：只縮放 X', async () => {
    const w = await mountChart(base)
    const event = wheel(w.find('svg').element, { deltaY: -100, clientX: 220, clientY: PLOT_H + 20 })
    expect(event.defaultPrevented).toBe(true)
    await flushFrame()
    expect(axisEvents(w, 'x')).toHaveLength(1)
    expect(axisEvents(w, 'yLeft')).toHaveLength(0)
  })

  it('往外縮：已經全覽的軸跳過；全部全覽後不攔截', async () => {
    const w = await mountChart(base)
    const svg = w.find('svg').element
    // 只放大 X（在 X 軸刻度上滾）
    wheel(svg, { deltaY: -300, clientX: 220, clientY: PLOT_H + 20 })
    await flushFrame()
    // 在繪圖區往外縮：Y 本來就是全覽，不送 Y 的事件
    expect(wheel(svg, { deltaY: 1000, clientX: 220, clientY: 100 }).defaultPrevented).toBe(true)
    await flushFrame()
    expect(axisEvents(w, 'yLeft')).toHaveLength(0)
    expect(axisEvents(w, 'x').at(-1)!.domain).toBeNull()
    // 都回到全覽：交還給頁面捲動
    expect(wheel(svg, { deltaY: 100, clientX: 220, clientY: 100 }).defaultPrevented).toBe(false)
  })

  it('繪圖區左右滑動只平移 X', async () => {
    const w = await mountChart(base)
    const svg = w.find('svg').element
    wheel(svg, { deltaY: -300, clientX: 220, clientY: 140 })
    await flushFrame()
    const yCount = axisEvents(w, 'yLeft').length
    wheel(svg, { deltaX: 44, clientX: 220, clientY: 140 })
    await flushFrame()
    expect(axisEvents(w, 'x')).toHaveLength(2)
    expect(axisEvents(w, 'yLeft')).toHaveLength(yCount)
  })

  /** d3 的 mousemove 監聽掛在 window；這裡的平移也是 */
  function mouse(target: EventTarget, type: string, x: number, y: number, button = 1) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button })
    target.dispatchEvent(event)
    return event
  }
  const drags = (w: VueWrapper, axis: string) =>
    (w.emitted('axis-drag') ?? []).map((e) => e[0] as { axis: string; domain: [number, number] }).filter((e) => e.axis === axis)

  it('中鍵拖曳：X 與 Y 一起平移（畫面跟著游標走），不超出邊界', async () => {
    const w = await mountChart(base)
    const svg = w.find('svg').element
    wheel(svg, { deltaY: -300, clientX: 220, clientY: 140 })
    await flushFrame()
    const [x0, x1] = axisEvents(w, 'x')[0].domain as [number, number]
    const [y0, y1] = axisEvents(w, 'yLeft')[0].domain as [number, number]

    const down = mouse(svg, 'mousedown', 220, 140)
    expect(down.defaultPrevented).toBe(true)
    await nextTick()
    expect(svg.classList.contains('is-panning')).toBe(true)
    // 往右 44px（10%）、往下 28px（10%）
    mouse(window, 'mousemove', 264, 168)
    await nextTick()
    const [a, b] = drags(w, 'x').at(-1)!.domain
    const [c, d] = drags(w, 'yLeft').at(-1)!.domain
    expect(a - x0).toBeCloseTo(-0.1 * (x1 - x0))
    expect(b - a).toBeCloseTo(x1 - x0)
    expect(c - y0).toBeCloseTo(0.1 * (y1 - y0))
    expect(d - c).toBeCloseTo(y1 - y0)

    // 拖很遠：停在邊界
    mouse(window, 'mousemove', 264 + 5000, 168 - 5000)
    await nextTick()
    expect(drags(w, 'x').at(-1)!.domain[0]).toBeCloseTo(0)
    expect(drags(w, 'yLeft').at(-1)!.domain[0]).toBeGreaterThanOrEqual(-1e-9)

    mouse(window, 'mouseup', 0, 0)
    await nextTick()
    expect(svg.classList.contains('is-panning')).toBe(false)
    const count = (w.emitted('axis-drag') ?? []).length
    mouse(window, 'mousemove', 100, 100)
    expect((w.emitted('axis-drag') ?? []).length).toBe(count)
  })

  it('沒有縮放時中鍵拖曳不動；左鍵、繪圖區外、關掉滾輪縮放都不平移', async () => {
    const w = await mountChart(base)
    const svg = w.find('svg').element
    mouse(svg, 'mousedown', 220, 140)
    mouse(window, 'mousemove', 300, 200)
    mouse(window, 'mouseup', 300, 200)
    expect(w.emitted('axis-drag')).toBeUndefined()

    wheel(svg, { deltaY: -300, clientX: 220, clientY: 140 })
    await flushFrame()
    expect(mouse(svg, 'mousedown', 220, 140, 0).defaultPrevented).toBe(false)
    expect(mouse(svg, 'mousedown', 220, -30).defaultPrevented).toBe(false)
    await w.setProps({ enableWheelZoom: false })
    expect(mouse(svg, 'mousedown', 220, 140).defaultPrevented).toBe(false)
  })

  it('band 軸：中鍵拖曳以類別為單位平移', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ c: `C${i}`, v: i }))
    const w = await mountChart({
      layers: [{ type: 'bar', data: rows, xValue: (d: { c: string }) => d.c, yValue: (d: { v: number }) => d.v }],
      wheelZoomAxes: 'x',
    })
    const svg = w.find('svg').element
    wheel(svg, { deltaY: -300, clientX: 220, clientY: 100 })
    await flushFrame()
    const before = axisEvents(w, 'x')[0].domain as string[]
    mouse(svg, 'mousedown', 220, 140)
    mouse(window, 'mousemove', 0, 140)
    await nextTick()
    const after = drags(w, 'x').at(-1)!.domain as unknown as string[]
    expect(after).toHaveLength(before.length)
    expect(Number(after[0].slice(1))).toBeGreaterThan(Number(before[0].slice(1)))
    // 停在同一格不重複送
    const n = drags(w, 'x').length
    mouse(window, 'mousemove', 1, 140)
    expect(drags(w, 'x').length).toBe(n)
    mouse(window, 'mouseup', 0, 0)
  })

  it('平移中卸載：移除 window 上的監聽', async () => {
    const w = await mountChart(base)
    const svg = w.find('svg').element
    wheel(svg, { deltaY: -300, clientX: 220, clientY: 140 })
    await flushFrame()
    mouse(svg, 'mousedown', 220, 140)
    const remove = vi.spyOn(window, 'removeEventListener')
    w.unmount()
    wrapper = null
    expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })
})
