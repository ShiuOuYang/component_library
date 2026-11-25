import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptImageCropper from '@/components/library/ui/ChptImageCropper.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { CropRect } from '@/components/library/shared/imageCropper'

/**
 * 舞台在 jsdom 量不到大小 → 600 × 360；圖片 1136 × 656 → 全覽 k = 0.5、左上角在 (16, 16)。
 * 畫面座標 = 16 + 0.5 × 圖片座標。
 */
const SRC = 'data:image/png;base64,AAAA'
const sx = (x: number) => 16 + 0.5 * x

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

function pointer(target: EventTarget, type: string, x: number, y: number, extra: Record<string, unknown> = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    clientX: { value: x },
    clientY: { value: y },
    pointerId: { value: extra.pointerId ?? 1 },
    button: { value: 0 },
    pointerType: { value: 'mouse' },
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])),
  })
  target.dispatchEvent(e)
}

function fakeCanvas() {
  const calls: string[] = []
  const ctx = new Proxy({}, { get: (_t, k) => (...args: unknown[]) => calls.push(`${String(k)}:${args.length}`), set: () => true })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement, type?: string) {
    return `data:${type ?? 'image/png'};${this.width}x${this.height}`
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback, type?: string) {
    cb(new Blob(['x'], { type: type ?? 'image/png' }))
  })
  return calls
}

async function mountIt(props: Record<string, unknown> = {}, opts: { load?: boolean; wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h> } = {}) {
  const rect = ref<CropRect | null>((props.modelValue as CropRect) ?? null)
  const aspect = ref<number | null>((props.aspect as number | null) ?? null)
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v?: unknown) => (emitted[n] ??= []).push(v)
  const node = () =>
    h(ChptImageCropper, {
      src: SRC,
      ...props,
      modelValue: rect.value,
      aspect: aspect.value,
      'onUpdate:modelValue': (v: CropRect) => (rec('rect')(v), (rect.value = v)),
      'onUpdate:aspect': (v: number | null) => (rec('aspect')(v), (aspect.value = v)),
      onChange: rec('change'),
      onLoad: rec('load'),
      onError: rec('error'),
    })
  const w = mount({ render: () => (opts.wrap ? opts.wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const img = () => w.find('img').element as HTMLImageElement
  if (opts.load !== false && w.find('img').exists()) {
    Object.defineProperty(img(), 'naturalWidth', { value: 1136, configurable: true })
    Object.defineProperty(img(), 'naturalHeight', { value: 656, configurable: true })
    await w.find('img').trigger('load')
  }
  const box = () => w.find('[data-box]')
  const stage = () => w.find('.image-cropper .relative.flex-1')
  const btn = (label: string) => w.findAll('button').find((b) => b.attributes('aria-label') === label || b.text() === label)!
  const vm = () => w.findComponent(ChptImageCropper).vm as unknown as {
    getCanvas: (o?: object) => HTMLCanvasElement | null
    getDataURL: (o?: object) => string | null
    getBlob: (o?: object) => Promise<Blob | null>
    rotate: (d: 1 | -1) => void
    flip: (a: 'x' | 'y') => void
    zoom: (f: number) => void
    reset: () => void
    state: { rect: CropRect; rotation: number; flipX: boolean; flipY: boolean } | null
  }
  return { w, rect, aspect, emitted, box, stage, btn, vm, img }
}

describe('ChptImageCropper', () => {
  it('載入後：全覽、預設框（80%）、v-model、尺寸文字、aria', async () => {
    const { w, rect, emitted, box } = await mountIt()
    expect(emitted.load).toEqual([{ width: 1136, height: 656 }])
    expect(rect.value).toEqual({ x: 114, y: 66, width: 909, height: 525 })
    expect(emitted.change).toHaveLength(1)
    expect(parseFloat(/left: ([\d.]+)px/.exec(box().attributes('style')!)![1])).toBeCloseTo(sx(113.6))
    expect(parseFloat(/width: ([\d.]+)px/.exec(box().attributes('style')!)![1])).toBeCloseTo(454.4)
    expect(w.find('[data-size]').text()).toBe('909 × 525 px')
    expect(box().attributes('aria-valuetext')).toBe('左上角 114, 66，909 × 525 像素')
    expect(w.findAll('[data-handle]')).toHaveLength(8)
    expect(w.find('img').attributes('style')).toContain('translate(300px, 180px)')
  })

  it('沒有圖、載入中、載入失敗；外部給的框、換圖', async () => {
    const none = await mountIt({ src: null })
    expect(none.w.text()).toContain('請先選擇圖片')
    expect(none.box().exists()).toBe(false)
    const loading = await mountIt({}, { load: false })
    expect(loading.w.text()).toContain('載入圖片中')
    const err = await mountIt({}, { load: false })
    await err.w.find('img').trigger('error')
    expect(err.w.text()).toContain('圖片載入失敗')
    expect(err.emitted.error).toHaveLength(1)
    // 有效的 v-model 直接用；無效的忽略
    const given = await mountIt({ modelValue: { x: 10, y: 20, width: 100, height: 50 } })
    expect(given.rect.value).toEqual({ x: 10, y: 20, width: 100, height: 50 })
    given.rect.value = { x: 30, y: 40, width: 200, height: 100 }
    await nextTick()
    expect(given.w.find('[data-size]').text()).toBe('200 × 100 px')
    given.rect.value = { x: 9999, y: 0, width: 10, height: 10 }
    await nextTick()
    expect(given.w.find('[data-size]').text()).toBe('200 × 100 px')
    const bad = await mountIt({ modelValue: { x: 0, y: 0, width: 0, height: 0 } })
    expect(bad.rect.value).toEqual({ x: 114, y: 66, width: 909, height: 525 })
    await bad.w.setProps({})
  })

  it('拖曳框移動、拉把手調整、框外拖曳畫新框；太小不算、右鍵不動', async () => {
    const { rect, emitted, box, stage, w } = await mountIt()
    // 移動：畫面 +50, +20 → 圖片 +100, +40
    pointer(box().element, 'pointerdown', 300, 200)
    pointer(window, 'pointermove', 350, 220)
    expect(rect.value).toEqual({ x: 214, y: 106, width: 909, height: 525 })
    pointer(window, 'pointerup', 350, 220)
    expect(emitted.change).toHaveLength(2)
    // 把手：右下往左上拉 100, 50 畫面 px
    pointer(w.find('[data-handle="se"]').element, 'pointerdown', 500, 300)
    pointer(window, 'pointermove', 400, 250)
    pointer(window, 'pointerup', 400, 250)
    expect(rect.value).toEqual({ x: 214, y: 106, width: 709, height: 425 })
    // 框外畫新框：(20,20) → (120,80) 畫面 = 圖片 (8,8) → (208,128)
    pointer(stage().element, 'pointerdown', 20, 20)
    pointer(window, 'pointermove', 21, 21) // 太小不算
    pointer(window, 'pointermove', 120, 80)
    pointer(window, 'pointerup', 120, 80)
    expect(rect.value).toEqual({ x: 8, y: 8, width: 200, height: 120 })
    // 只點一下：不改
    pointer(stage().element, 'pointerdown', 500, 300)
    pointer(window, 'pointerup', 500, 300)
    expect(rect.value).toEqual({ x: 8, y: 8, width: 200, height: 120 })
    // 從圖片左上角往外拉：畫不出框，保留原本的
    pointer(stage().element, 'pointerdown', 16, 16)
    pointer(window, 'pointermove', 0, 0)
    pointer(window, 'pointerup', 0, 0)
    expect(rect.value).toEqual({ x: 8, y: 8, width: 200, height: 120 })
    // 右鍵
    pointer(box().element, 'pointerdown', 50, 50, { button: 2 })
    pointer(window, 'pointermove', 200, 200)
    pointer(window, 'pointerup', 200, 200)
    expect(rect.value).toEqual({ x: 8, y: 8, width: 200, height: 120 })
  })

  it('中鍵平移、雙指縮放、滾輪縮放', async () => {
    const { box, stage } = await mountIt()
    const left = () => parseFloat(/left: ([\d.-]+)px/.exec(box().attributes('style')!)![1])
    const width = () => parseFloat(/width: ([\d.-]+)px/.exec(box().attributes('style')!)![1])
    const l0 = left()
    pointer(stage().element, 'pointerdown', 100, 100, { button: 1 })
    pointer(window, 'pointermove', 140, 100)
    pointer(window, 'pointerup', 140, 100)
    await nextTick()
    expect(left()).toBeCloseTo(l0 + 40)
    // 雙指：距離 100 → 200，放大兩倍
    const w0 = width()
    pointer(stage().element, 'pointerdown', 200, 150, { pointerId: 1, pointerType: 'touch' })
    pointer(stage().element, 'pointerdown', 300, 150, { pointerId: 2, pointerType: 'touch' })
    pointer(window, 'pointermove', 350, 150, { pointerId: 2, pointerType: 'touch' })
    pointer(window, 'pointermove', 150, 150, { pointerId: 1, pointerType: 'touch' })
    await nextTick()
    expect(width()).toBeCloseTo(w0 * 2)
    pointer(window, 'pointerup', 350, 150, { pointerId: 2, pointerType: 'touch' })
    pointer(window, 'pointerup', 150, 150, { pointerId: 1, pointerType: 'touch' })
    // 滾輪
    const w1 = width()
    stage().element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 300, clientY: 180, cancelable: true }))
    await nextTick()
    expect(width()).toBeCloseTo(w1 * Math.exp(0.15))
  })

  it('工具列：比例、旋轉、翻轉、縮放、重設', async () => {
    const opts = [
      { label: '自由', value: null },
      { label: '1:1', value: 1 },
    ]
    const { btn, rect, aspect, emitted, w, vm } = await mountIt({ aspectOptions: opts })
    expect(btn('自由').attributes('aria-pressed')).toBe('true')
    await btn('1:1').trigger('click')
    expect(aspect.value).toBe(1)
    expect(rect.value!.width).toBe(rect.value!.height)
    expect(btn('1:1').attributes('aria-pressed')).toBe('true')
    await btn('自由').trigger('click')
    expect(emitted.aspect).toEqual([1, null])
    const before = { ...rect.value! }
    await btn('向右轉 90°').trigger('click')
    expect(vm().state!.rotation).toBe(90)
    expect(rect.value).toEqual({ x: 656 - before.y - before.height, y: before.x, width: before.height, height: before.width })
    expect(w.find('img').attributes('style')).toContain('rotate(90deg)')
    await btn('水平翻轉').trigger('click')
    expect(vm().state).toMatchObject({ flipX: true, flipY: false })
    // 有翻轉時旋轉：水平 / 垂直對調
    await btn('向左轉 90°').trigger('click')
    expect(vm().state).toMatchObject({ rotation: 0, flipX: false, flipY: true })
    await btn('垂直翻轉').trigger('click')
    expect(vm().state).toMatchObject({ flipX: false, flipY: false })
    const style = () => w.find('[data-box]').attributes('style')!
    const before2 = style()
    await btn('放大').trigger('click')
    expect(style()).not.toBe(before2)
    await btn('縮小').trigger('click')
    await btn('重設').trigger('click')
    expect(rect.value).toEqual({ x: 114, y: 66, width: 909, height: 525 })
    expect((emitted.change.at(-1) as { rotation: number }).rotation).toBe(0)
  })

  it('外部改 aspect；鍵盤移動與縮放', async () => {
    const { rect, aspect, box } = await mountIt()
    aspect.value = 2
    await nextTick()
    expect(rect.value!.width / rect.value!.height).toBeCloseTo(2, 1)
    const r = { ...rect.value! }
    await box().trigger('keydown', { key: 'ArrowRight' })
    expect(rect.value!.x).toBe(r.x + 2)
    await box().trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    expect(rect.value!.y).toBe(r.y + 20)
    await box().trigger('keydown', { key: 'ArrowLeft' })
    await box().trigger('keydown', { key: 'ArrowUp' })
    await box().trigger('keydown', { key: '+' })
    expect(rect.value!.width).toBeGreaterThan(r.width)
    const big = rect.value!.width
    await box().trigger('keydown', { key: '-' })
    expect(rect.value!.width).toBeLessThan(big)
    await box().trigger('keydown', { key: 'Enter' })
    aspect.value = null
    await nextTick()
  })

  it('輸出：canvas / DataURL / Blob、指定大小、圓形、JPEG 底色；預覽', async () => {
    const calls = fakeCanvas()
    const { vm, w } = await mountIt({ shape: 'circle', preview: true, previewSize: 100 })
    await nextTick()
    expect(w.find('canvas').attributes('width')).toBe('100')
    expect(calls.some((c) => c.startsWith('drawImage'))).toBe(true)
    calls.length = 0
    const c = vm().getCanvas({ width: 256, height: 256 })!
    expect([c.width, c.height]).toEqual([256, 256])
    expect(calls).toContain('clip:0')
    expect(calls.some((x) => x.startsWith('ellipse'))).toBe(true)
    expect(calls.some((x) => x.startsWith('fillRect'))).toBe(false)
    calls.length = 0
    expect(vm().getDataURL({ maxWidth: 300, type: 'image/jpeg' })).toBe('data:image/jpeg;300x173')
    expect(calls.some((x) => x.startsWith('fillRect'))).toBe(true)
    const blob = await vm().getBlob()
    expect(blob?.type).toBe('image/png')
    vm().zoom(2)
    vm().rotate(1)
    vm().flip('y')
    expect(vm().state).toMatchObject({ rotation: 90, flipY: true })
    vm().reset()
  })

  it('還沒載入時輸出為 null；停用；英文語系', async () => {
    fakeCanvas()
    const pending = await mountIt({}, { load: false })
    expect(pending.vm().getCanvas()).toBeNull()
    expect(pending.vm().getDataURL()).toBeNull()
    expect(await pending.vm().getBlob()).toBeNull()
    expect(pending.vm().state).toBeNull()
    pending.vm().rotate(1)
    pending.vm().flip('x')
    pending.vm().reset()
    // getContext 失敗
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const noCtx = await mountIt()
    expect(noCtx.vm().getCanvas()).toBeNull()
    vi.restoreAllMocks()
    const off = await mountIt({ disabled: true })
    expect(off.w.findAll('[data-handle]')).toHaveLength(0)
    pointer(off.box().element, 'pointerdown', 300, 200)
    pointer(window, 'pointermove', 400, 300)
    pointer(window, 'pointerup', 400, 300)
    await off.box().trigger('keydown', { key: 'ArrowRight' })
    off.stage().element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }))
    expect(off.rect.value).toEqual({ x: 114, y: 66, width: 909, height: 525 })
    expect(off.btn('重設').attributes('disabled')).toBeDefined()
    const en = await mountIt({}, { wrap: (n) => h(ChptConfigProvider, { locale: enUS }, () => n) })
    expect(en.box().attributes('aria-valuetext')).toBe('Top-left 114, 66, 909 × 525 pixels')
    expect(en.btn('Rotate right 90°').exists()).toBe(true)
  })
})
