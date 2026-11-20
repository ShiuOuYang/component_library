import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptSignaturePad from '@/components/library/ui/ChptSignaturePad.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

/**
 * jsdom 沒有 canvas：假的 2D context 記下畫了什麼；toDataURL 回傳「畫了幾筆、大小多少」的字串，方便斷言。
 * 簽名區固定 300×200、左上角在 (0, 0)。
 */
let strokesDrawn = 0
let images: Array<{ src: string; w?: number }> = []
let fills: string[] = []

beforeEach(() => {
  strokesDrawn = 0
  images = []
  fills = []
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    const { dataset } = this
    const ctx = {
      lineCap: '',
      lineJoin: '',
      lineWidth: 0,
      strokeStyle: '',
      fillStyle: '',
      setTransform: vi.fn(),
      clearRect: () => {
        dataset.drawn = '0'
      },
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      stroke: () => {
        strokesDrawn++
        dataset.drawn = String(Number(dataset.drawn ?? 0) + 1)
      },
      arc: vi.fn(),
      fill: vi.fn(),
      fillRect: () => fills.push(ctx.fillStyle),
      drawImage: (img: HTMLImageElement, _x: number, _y: number, w: number) => images.push({ src: img.src, w }),
    }
    return ctx as unknown as CanvasRenderingContext2D
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement, type?: string) {
    return `data:${type ?? 'image/png'};${this.width}x${this.height};segments=${this.dataset.drawn ?? 0}`
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 300,
    height: 200,
    right: 300,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  // 載入圖片：設定 src 後下一個 microtask 觸發 onload
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null
      private _src = ''
      get src() {
        return this._src
      }
      set src(v: string) {
        this._src = v
        queueMicrotask(() => this.onload?.())
      }
    }
  )
})

/** jsdom 沒有 PointerEvent：用一般 Event 加上需要的欄位 */
async function fire(el: Element, type: string, init: Record<string, unknown>) {
  const ev = new Event(type, { bubbles: true, cancelable: true })
  for (const [k, v] of Object.entries({ timeStamp: performance.now(), button: 0, pressure: 0.5, ...init }))
    Object.defineProperty(ev, k, { value: v })
  el.dispatchEvent(ev)
  await nextTick()
}

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mountPad(props: Record<string, unknown> = {}) {
  const model = ref<string | null>((props.modelValue as string | null | undefined) ?? null)
  const w = mount(
    {
      render: () =>
        h(ChptSignaturePad, {
          ...props,
          modelValue: model.value,
          'onUpdate:modelValue': (v: string | null) => (model.value = v),
        }),
    },
    { attachTo: document.body }
  )
  mounted.push(w)
  const pad = () => w.findComponent(ChptSignaturePad)
  const canvas = () => w.find('canvas')
  const api = () => pad().vm as unknown as {
    clear: () => void
    undo: () => void
    isEmpty: () => boolean
    toDataURL: (o?: Record<string, unknown>) => string
    toSVG: (o?: Record<string, unknown>) => string
    getStrokes: () => Array<{ color: string; points: Array<{ x: number; y: number; w: number }> }>
    setStrokes: (s: unknown[]) => void
  }
  /** 從 from 畫到 to（中間補幾個點） */
  async function sign(from: [number, number], to: [number, number], opts: { pointerId?: number; pointerType?: string; steps?: number } = {}) {
    const { pointerId = 1, pointerType = 'mouse', steps = 4 } = opts
    await fire(canvas().element, 'pointerdown', { pointerId, pointerType, button: 0, clientX: from[0], clientY: from[1] })
    for (let i = 1; i <= steps; i++) {
      const x = from[0] + ((to[0] - from[0]) * i) / steps
      const y = from[1] + ((to[1] - from[1]) * i) / steps
      await fire(canvas().element, 'pointermove', { pointerId, pointerType, clientX: x, clientY: y })
    }
    await fire(canvas().element, 'pointerup', { pointerId, pointerType })
  }
  return { w, model, pad, canvas, api, sign }
}

describe('ChptSignaturePad', () => {
  it('空白時顯示提示、按鈕停用、aria-label 為尚未簽名', () => {
    const { w, canvas } = mountPad()
    expect(w.text()).toContain('請在此簽名')
    expect(canvas().attributes('aria-label')).toBe('簽名：尚未簽名')
    expect(w.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })

  it('簽一筆：邊寫邊畫、送出 begin / end 與 v-model（PNG data URL）', async () => {
    const { w, model, pad, canvas, sign } = mountPad()
    await sign([20, 100], [200, 120])
    expect(pad().emitted('begin')).toHaveLength(1)
    expect(pad().emitted('end')![0]).toEqual([1])
    expect(model.value).toMatch(/^data:image\/png;/)
    expect(canvas().attributes('aria-label')).toBe('簽名：已簽名')
    expect(w.text()).not.toContain('請在此簽名')
    expect(strokesDrawn).toBeGreaterThan(0)
  })

  it('復原上一筆、清除；全部復原後 v-model 為 null', async () => {
    const { w, model, pad, api, sign } = mountPad()
    await sign([20, 100], [200, 120])
    await sign([30, 50], [60, 150])
    expect(api().getStrokes()).toHaveLength(2)
    await w.findAll('button').find((b) => b.text().includes('復原上一筆'))!.trigger('click')
    expect(api().getStrokes()).toHaveLength(1)
    expect(model.value).not.toBeNull()
    api().undo()
    await nextTick()
    expect(model.value).toBeNull()
    expect(api().isEmpty()).toBe(true)
    api().undo() // 沒有筆跡時不做事
    await sign([20, 100], [200, 120])
    await w.findAll('button').find((b) => b.text().includes('清除'))!.trigger('click')
    expect(model.value).toBeNull()
    expect(pad().emitted('clear')).toHaveLength(1)
  })

  it('多指觸控只取第一根手指；滑鼠右鍵不畫；太近的點略過', async () => {
    const { canvas, api } = mountPad()
    await fire(canvas().element, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10 })
    await fire(canvas().element, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 100 })
    await fire(canvas().element, 'pointermove', { pointerId: 2, pointerType: 'touch', clientX: 150, clientY: 150 })
    await fire(canvas().element, 'pointermove', { pointerId: 1, pointerType: 'touch', clientX: 10.5, clientY: 10 })
    await fire(canvas().element, 'pointermove', { pointerId: 1, pointerType: 'touch', clientX: 40, clientY: 10 })
    await fire(canvas().element, 'pointerup', { pointerId: 2, pointerType: 'touch' })
    expect(api().getStrokes()).toHaveLength(0)
    await fire(canvas().element, 'pointerup', { pointerId: 1, pointerType: 'touch' })
    const strokes = api().getStrokes()
    expect(strokes).toHaveLength(1)
    expect(strokes[0].points.map((p) => p.x)).toEqual([10, 40])
    await fire(canvas().element, 'pointerdown', { pointerId: 3, pointerType: 'mouse', button: 2, clientX: 10, clientY: 10 })
    await fire(canvas().element, 'pointerup', { pointerId: 3, pointerType: 'mouse' })
    expect(api().getStrokes()).toHaveLength(1)
  })

  it('disabled / readonly：不能畫，按鈕停用', async () => {
    const r = mountPad({ disabled: true })
    await r.sign([20, 100], [200, 120])
    expect(r.api().getStrokes()).toHaveLength(0)
    expect(r.canvas().classes()).toContain('cursor-not-allowed')
    const r2 = mountPad({ readonly: true })
    await r2.sign([20, 100], [200, 120])
    expect(r2.api().isEmpty()).toBe(true)
  })

  it('toDataURL：trim 只取有筆跡的範圍、背景色、格式；空白為空字串', async () => {
    const { api, sign } = mountPad({ exportBackground: '#ffffff', exportType: 'image/jpeg' })
    expect(api().toDataURL()).toBe('')
    await sign([20, 100], [200, 120])
    expect(api().toDataURL()).toMatch(/^data:image\/jpeg;300x200;/)
    expect(fills).toContain('#ffffff')
    const trimmed = api().toDataURL({ trim: true, type: 'image/png', background: null })
    const [, wh] = trimmed.match(/;(\d+x\d+);/)!
    const [tw, th] = wh.split('x').map(Number)
    expect(tw).toBeGreaterThan(180)
    expect(tw).toBeLessThan(205)
    expect(th).toBeLessThan(45)
  })

  it('toSVG：向量輸出；trim prop 為預設；空白為空字串', async () => {
    const { api, sign } = mountPad({ trim: true, penColor: '#1e3a8a' })
    expect(api().toSVG()).toBe('')
    await sign([20, 100], [200, 120])
    const svg = api().toSVG()
    expect(svg).toMatch(/^<svg /)
    expect(svg).toContain('stroke="#1e3a8a"')
    expect(svg).not.toContain('viewBox="0 0 300 200"')
    expect(api().toSVG({ trim: false, background: '#fff' })).toContain('viewBox="0 0 300 200"')
  })

  it('setStrokes / getStrokes：存回後端再載入', async () => {
    const { api, model } = mountPad()
    api().setStrokes([{ color: '#000', points: [{ x: 1, y: 2, w: 2 }, { x: 30, y: 40, w: 2 }] }])
    await nextTick()
    expect(api().getStrokes()[0].points[1]).toEqual({ x: 30, y: 40, w: 2 })
    expect(model.value).not.toBeNull()
  })

  it('v-model 傳入既有簽名圖：載入後畫在底下、不是空白；清除會一併拿掉；父層清空時也清掉', async () => {
    const { model, api, sign } = mountPad({ modelValue: 'data:image/png;old' })
    await Promise.resolve()
    await nextTick()
    expect(api().isEmpty()).toBe(false)
    expect(images.some((i) => i.src === 'data:image/png;old' && i.w === 300)).toBe(true)
    expect(api().toSVG()).toBe('') // SVG 只含這次畫的筆跡
    await sign([20, 100], [200, 120])
    // 有底圖時 trim 無效（裁不出底圖的範圍）
    expect(api().toDataURL({ trim: true })).toMatch(/;300x200;/)
    model.value = null
    await nextTick()
    expect(api().isEmpty()).toBe(true)
    model.value = 'data:image/png;another'
    await nextTick()
    await Promise.resolve()
    expect(api().isEmpty()).toBe(false)
    api().clear()
    await nextTick()
    expect(api().isEmpty()).toBe(true)
    expect(model.value).toBeNull()
  })

  it('換了 v-model 但舊圖較晚載入完：不覆蓋成舊圖', async () => {
    const { model, api } = mountPad({ modelValue: 'data:image/png;first' })
    model.value = null
    await nextTick()
    await Promise.resolve()
    await nextTick()
    expect(api().isEmpty()).toBe(true)
  })

  it('有錯誤訊息時邊框變紅、以 alert 念出並接到 canvas', () => {
    const { w, canvas } = mountPad({ errorText: '請簽名' })
    const alert = w.find('[role="alert"]')
    expect(alert.text()).toBe('請簽名')
    expect(canvas().attributes('aria-describedby')).toBe(alert.attributes('id'))
  })

  it('showToolbar=false：沒有按鈕', () => {
    const { w } = mountPad({ showToolbar: false })
    expect(w.findAll('button')).toHaveLength(0)
  })

  it('筆的壓力與 coalesced 事件', async () => {
    const { canvas, api } = mountPad()
    await fire(canvas().element, 'pointerdown', { pointerId: 9, pointerType: 'pen', pressure: 1, clientX: 0, clientY: 0 })
    await fire(canvas().element, 'pointermove', {
      pointerId: 9,
      getCoalescedEvents: () => [
        { clientX: 10, clientY: 0, pointerType: 'pen', pressure: 0.5, timeStamp: 1 },
        { clientX: 20, clientY: 0, pointerType: 'pen', pressure: 0.5, timeStamp: 2 },
      ],
    })
    await fire(canvas().element, 'pointerup', { pointerId: 9 })
    const pts = api().getStrokes()[0].points
    expect(pts.map((p) => p.x)).toEqual([0, 10, 20])
    expect(pts[0].w).toBeCloseTo(2.8)
    expect(pts[1].w).toBeCloseTo(1.8)
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptSignaturePad, { label: 'Inspector' })) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.find('canvas').attributes('aria-label')).toBe('Inspector: Not signed')
    expect(w.text()).toContain('Sign here')
  })
})
