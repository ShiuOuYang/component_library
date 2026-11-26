import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue'

/**
 * 框選縮放（useBrushZoom）與拖曳座標軸（useAxisDrag）。
 *
 * 圖表 600×400、預設 margin → 繪圖區 440×280；jsdom 裡 clientX / clientY 就是繪圖區座標
 * （d3.pointer 退回 getBoundingClientRect，jsdom 回傳全 0）。
 */

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

// x 0..100、y 0..100
const rows = Array.from({ length: 101 }, (_, i) => ({ x: i, y: i }))
const lineLayer = { type: 'line', showDots: true, data: rows, xValue: (d: { x: number }) => d.x, yValue: (d: { y: number }) => d.y }
const rightLayer = { ...lineLayer, yAxis: 'right' }

async function mountChart(props: Record<string, unknown> = {}) {
  wrapper = mount(DualAxisComboChart, {
    props: { width: 600, height: 400, animationDuration: 0, autoResize: false, layers: [lineLayer], xScaleType: 'linear', ...props },
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

/** d3 的 brush / drag 從 event.view 取 window 來監聽 move / up；jsdom 的建構子不收 vitest 的 window，事後補上 */
function mouse(target: EventTarget, type: string, x: number, y: number) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })
  Object.defineProperty(ev, 'view', { value: window })
  target.dispatchEvent(ev)
}

/** 在元素上按下、移到 (x1, y1)、放開（d3 的 brush / drag 在 window 上收 move / up） */
async function dragOn(el: Element, [x0, y0]: [number, number], [x1, y1]: [number, number]) {
  mouse(el, 'mousedown', x0, y0)
  mouse(window, 'mousemove', (x0 + x1) / 2, (y0 + y1) / 2)
  mouse(window, 'mousemove', x1, y1)
  mouse(window, 'mouseup', x1, y1)
  // d3 拖曳後會在 window 上吃掉緊接著的 click（0ms 計時器解除），等它解除
  await new Promise((r) => setTimeout(r, 0))
  await nextTick()
}

const overlay = (w: VueWrapper) => w.find('.brush-layer .overlay').element

describe('框選縮放', () => {
  it('x 模式：選取範圍換算成 X domain，送出 selection-change，出現重設鈕', async () => {
    const w = await mountChart({ brushMode: 'x' })
    expect(w.find('.brush-layer .overlay').exists()).toBe(true)
    await dragOn(overlay(w), [110, 100], [220, 100]) // 440px = 0..100 → 25..50
    const ev = w.emitted('selection-change')![0][0] as { xDomain: number[]; yLeftDomain: unknown; mode: string }
    expect(ev.mode).toBe('x')
    expect(ev.xDomain[0]).toBeCloseTo(25, 0)
    expect(ev.xDomain[1]).toBeCloseTo(50, 0)
    expect(ev.yLeftDomain).toBeNull()
    const reset = w.find('button[data-export-ignore]')
    expect(reset.exists()).toBe(true)

    // 重設：送出 zoom-reset、重設鈕消失
    await reset.trigger('click')
    expect(w.emitted('zoom-reset')).toHaveLength(1)
    expect(w.find('button[data-export-ignore]').exists()).toBe(false)
  })

  it('xy 模式：同時算出左右 Y 軸的 domain（像素往下 = 數值變小）', async () => {
    const w = await mountChart({ brushMode: 'xy', layers: [lineLayer, rightLayer] })
    await dragOn(overlay(w), [0, 70], [220, 140]) // Y 280px = 0..100（往上增加）
    const ev = w.emitted('selection-change')![0][0] as { xDomain: number[]; yLeftDomain: number[]; yRightDomain: number[] }
    expect(ev.xDomain[1]).toBeCloseTo(50, 0)
    const [lo, hi] = ev.yLeftDomain
    expect(lo).toBeLessThan(hi)
    expect(ev.yRightDomain).toHaveLength(2)
  })

  it('類別軸：與框選範圍重疊的類別都算選中；沒有重疊就不動作', async () => {
    const cats = ['A', 'B', 'C', 'D'].map((k, i) => ({ k, v: i + 1 }))
    const bar = { type: 'bar', data: cats, xValue: (d: { k: string }) => d.k, yValue: (d: { v: number }) => d.v }
    const w = await mountChart({ layers: [bar], xScaleType: 'band', brushMode: 'x' })
    await dragOn(overlay(w), [120, 100], [260, 100]) // 每類 110px（含間距）：B、C 與範圍重疊，A、D 沒有
    const ev = w.emitted('selection-change')![0][0] as { xDomain: string[] }
    expect(ev.xDomain).toEqual(['B', 'C'])
  })

  it('只點一下（沒有選取範圍）不縮放', async () => {
    const w = await mountChart({ brushMode: 'x' })
    await dragOn(overlay(w), [100, 100], [100, 100])
    expect(w.emitted('selection-change')).toBeUndefined()
  })

  it('滑鼠在 overlay 上：穿透找到底下的點並顯示提示；離開時隱藏', async () => {
    const w = await mountChart({ brushMode: 'x' })
    const dot = w.find('.line-dot')
    expect(dot.exists()).toBe(true)
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => dot.element })
    mouse(overlay(w), 'mousemove', 10, 10)
    await nextTick()
    expect(w.emitted('tooltip-show')).toBeTruthy()

    // 底下不是圖表元素：隱藏
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => document.body })
    mouse(overlay(w), 'mousemove', 300, 10)
    await nextTick()
    expect(w.emitted('tooltip-hide')).toBeTruthy()

    // 拖曳中不偵測
    const shows = w.emitted('tooltip-show')!.length
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => dot.element })
    mouse(overlay(w), 'mousedown', 10, 10)
    mouse(overlay(w), 'mousemove', 12, 10)
    expect(w.emitted('tooltip-show')!.length).toBe(shows)
    mouse(overlay(w), 'mouseup', 12, 10)
    mouse(window, 'mouseup', 12, 10)
    mouse(overlay(w), 'mouseleave', 12, 10)
    // @ts-expect-error 還原 jsdom 沒有的 API
    delete document.elementFromPoint
  })

  it('enableBrush = false 時沒有 brush 圖層', async () => {
    const w = await mountChart({ enableBrush: false })
    expect(w.find('.brush-layer').exists()).toBe(false)
  })
})

describe('拖曳座標軸', () => {
  const lastDrag = (w: VueWrapper) => w.emitted('axis-drag')!.at(-1)![0] as { axis: string; domain: number[] }
  const axisOverlay = (w: VueWrapper, cls: string) => w.find(`.${cls} rect.axis-drag-overlay`).element

  it('X 軸：左右拖平移、上下拖縮放', async () => {
    const w = await mountChart({ enableBrush: false })
    await dragOn(axisOverlay(w, 'x-axis'), [200, 290], [244, 290]) // 往右 44px = 10
    let ev = lastDrag(w)
    expect(ev.axis).toBe('x')
    expect(ev.domain[0]).toBeLessThan(0) // 往右拖：視窗往左移
    const width = ev.domain[1] - ev.domain[0]
    expect(width).toBeCloseTo(100, 5)

    await dragOn(axisOverlay(w, 'x-axis'), [200, 290], [200, 330]) // 往下拖：放大範圍
    ev = lastDrag(w)
    expect(ev.domain[1] - ev.domain[0]).toBeGreaterThan(width)
    expect(w.find('button[data-export-ignore]').exists()).toBe(true)
  })

  it('時間軸：拖曳後的 domain 仍是 Date', async () => {
    const t0 = Date.UTC(2026, 0, 1)
    const day = 86400000
    const timeLayer = { type: 'line', data: rows.slice(0, 10).map((r) => ({ ...r, t: new Date(t0 + r.x * day) })), xValue: (d: { t: Date }) => d.t, yValue: (d: { y: number }) => d.y }
    const w = await mountChart({ enableBrush: false, layers: [timeLayer], xScaleType: 'time' })
    await dragOn(axisOverlay(w, 'x-axis'), [200, 290], [150, 290])
    expect(lastDrag(w).domain[0]).toBeInstanceOf(Date)
    await dragOn(axisOverlay(w, 'x-axis'), [200, 290], [200, 250])
    expect(lastDrag(w).domain[1]).toBeInstanceOf(Date)
  })

  it('類別軸不能拖', async () => {
    const cats = ['A', 'B'].map((k, i) => ({ k, v: i + 1 }))
    const bar = { type: 'bar', data: cats, xValue: (d: { k: string }) => d.k, yValue: (d: { v: number }) => d.v }
    const w = await mountChart({ enableBrush: false, layers: [bar], xScaleType: 'band' })
    const ov = w.find('.x-axis rect.axis-drag-overlay')
    if (ov.exists()) await dragOn(ov.element, [100, 290], [160, 290])
    expect(w.emitted('axis-drag')).toBeUndefined()
  })

  it('左 / 右 Y 軸：上下拖平移、左右拖縮放，各自獨立', async () => {
    const w = await mountChart({ enableBrush: false, layers: [lineLayer, rightLayer] })
    await dragOn(axisOverlay(w, 'y-axis-left'), [-20, 100], [-20, 128]) // 往下 28px = 10
    let ev = lastDrag(w)
    expect(ev.axis).toBe('yLeft')
    const h = ev.domain[1] - ev.domain[0]
    expect(ev.domain[0]).toBeGreaterThan(0)

    await dragOn(axisOverlay(w, 'y-axis-left'), [-20, 100], [-64, 100]) // 往左：縮小範圍
    ev = lastDrag(w)
    expect(ev.domain[1] - ev.domain[0]).toBeLessThan(h)

    await dragOn(axisOverlay(w, 'y-axis-right'), [460, 100], [460, 60])
    ev = lastDrag(w)
    expect(ev.axis).toBe('yRight')
    await dragOn(axisOverlay(w, 'y-axis-right'), [460, 100], [500, 100])
    expect(lastDrag(w).axis).toBe('yRight')
  })

  it('斜向拖曳不到 1px 的移動忽略；enableAxisDrag = false 時沒有覆蓋層', async () => {
    const w = await mountChart({ enableBrush: false })
    const before = w.emitted('axis-drag')?.length ?? 0
    const ov = axisOverlay(w, 'x-axis')
    mouse(ov, 'mousedown', 200, 290)
    mouse(window, 'mousemove', 200.4, 290.4)
    mouse(window, 'mouseup', 200.4, 290.4)
    await nextTick()
    expect(w.emitted('axis-drag')?.length ?? 0).toBe(before)

    const off = await mountChart({ enableAxisDrag: false })
    expect(off.find('rect.axis-drag-overlay').exists()).toBe(false)
  })
})
