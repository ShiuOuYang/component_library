import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptLabelDesigner from '@/components/library/ui/ChptLabelDesigner.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { LabelDoc, LabelElement } from '@/components/library/shared/labelDesigner'

const base = (): LabelDoc => ({
  width: 100,
  height: 50,
  dpi: 203,
  elements: [
    { id: 't', type: 'text', x: 10, y: 10, w: 30, h: 6, text: 'LOT {{lotNo}}', fontSize: 10 },
    { id: 'b', type: 'barcode', x: 10, y: 20, w: 40, h: 12, value: '{{partNo}}', format: 'code128', showText: true },
    { id: 'q', type: 'qrcode', x: 70, y: 10, w: 20, h: 20, value: 'QR', level: 'M' },
    { id: 'f', type: 'rect', x: 0, y: 0, w: 100, h: 50, thickness: 0.4, locked: true },
  ],
})

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

type Exposed = {
  value: () => LabelDoc
  toSvg: (d?: Record<string, unknown> | null) => string
  exportPng: (d?: Record<string, unknown> | null, dpi?: number) => Promise<Blob | null>
  toZpl: (d?: Record<string, unknown> | null) => string
  printHtml: (r?: (Record<string, unknown> | null)[]) => string
  print: (r?: (Record<string, unknown> | null)[]) => HTMLIFrameElement | null
  undo: () => void
  redo: () => void
  select: (ids: string[]) => void
  addElement: (type: string) => void
}

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const model = ref<LabelDoc | undefined>('modelValue' in props ? (props.modelValue as LabelDoc) : base())
  const preview = ref<boolean>((props.preview as boolean) ?? false)
  const emitted: Record<string, unknown[]> = {}
  const node = () =>
    h(ChptLabelDesigner, {
      data: { lotNo: 'L-001', partNo: 'PCB-1' },
      fields: ['lotNo', 'partNo', 'qty'],
      fieldLabels: { lotNo: '批號' },
      ...props,
      modelValue: model.value,
      preview: preview.value,
      'onUpdate:modelValue': (v: LabelDoc) => ((emitted.model ??= []).push(v), (model.value = v)),
      'onUpdate:preview': (v: boolean) => ((emitted.preview ??= []).push(v), (preview.value = v)),
      onSelect: (ids: string[]) => (emitted.select ??= []).push(ids),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const svg = () => w.find('[data-label-svg]')
  vi.spyOn(svg().element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) })
  const scale = () => Number(svg().attributes('width')) / model.value!.width
  const vm = () => w.findComponent(ChptLabelDesigner).vm as unknown as Exposed
  const el = (id: string) => model.value!.elements.find((e) => e.id === id) as LabelElement
  return { w, model, preview, emitted, svg, scale, vm, el }
}
function pointer(target: Element, type: string, x: number, y: number, extra: Record<string, unknown> = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    clientX: { value: x },
    clientY: { value: y },
    pointerId: { value: 1 },
    button: { value: 0 },
    pointerType: { value: 'mouse' },
    shiftKey: { value: !!extra.shiftKey },
    metaKey: { value: false },
    ctrlKey: { value: false },
  })
  target.dispatchEvent(e)
}
const key = async (w: VueWrapper, k: string, o: Record<string, unknown> = {}) => w.find('[data-canvas-wrap]').trigger('keydown', { key: k, ...o })

describe('ChptLabelDesigner', () => {
  it('畫布、元素、工具列、圖層、標籤設定、設計時顯示欄位資料', () => {
    const { w, svg } = mountIt()
    expect(svg().attributes('viewBox')).toBe('0 0 100 50')
    expect(w.findAll('[data-el]').map((x) => x.attributes('data-el'))).toEqual(['t', 'b', 'q', 'f'])
    expect(w.find('[data-el="t"]').html()).toContain('LOT L-001')
    expect(w.findAll('[data-add]').map((x) => x.attributes('data-add'))).toEqual(['text', 'barcode', 'qrcode', 'line', 'rect', 'image'])
    expect(w.findAll('[data-layer] .truncate').map((x) => x.text())).toEqual(['方框', 'QR code：QR', '條碼：{{partNo}}', '文字：LOT {{lotNo}}'])
    expect(w.find('[data-used-fields]').text()).toBe('使用的欄位：lotNo, partNo')
    expect((w.find('[data-doc="width"]').element as HTMLInputElement).value).toBe('100')
    expect(w.find('[data-grid]').exists()).toBe(true)
    expect(w.find('[data-align="left"]').attributes('disabled')).toBeDefined()
    // 沒給 v-model：60 × 40 空白
    const empty = mountIt({ modelValue: undefined, allowImages: false })
    expect(empty.svg().attributes('viewBox')).toBe('0 0 60 40')
    expect(empty.w.text()).toContain('還沒有元素')
    expect(empty.w.find('[data-add="image"]').exists()).toBe(false)
  })

  it('新增元素（置中、選取）、編輯屬性、插入欄位、無法編碼提示、標籤設定', async () => {
    const { w, model, el, emitted } = mountIt()
    await w.find('[data-add="text"]').trigger('click')
    const added = model.value!.elements.at(-1)!
    expect(added).toMatchObject({ type: 'text', text: '文字', x: 35, y: 22 })
    expect(emitted.select!.at(-1)).toEqual([added.id])
    expect(w.find('[data-live]').text()).toBe('已新增文字')
    const input = (p: string) => w.find(`[data-prop="${p}"]`)
    await input('x').setValue('12.345')
    await input('x').trigger('change')
    expect(el(added.id).x).toBe(12.35)
    await input('y').setValue('abc')
    await input('y').trigger('change')
    expect(el(added.id).y).toBe(22)
    await input('text').setValue('Q\'TY')
    await input('text').trigger('change')
    await input('fontSize').setValue('14')
    await input('fontSize').trigger('change')
    await input('align').setValue('center')
    await input('bold').setValue(true)
    await input('rotation').setValue('90')
    await input('locked').setValue(true)
    expect(el(added.id)).toMatchObject({ text: "Q'TY", fontSize: 14, align: 'center', bold: true, rotation: 90, locked: true })
    const sel = w.find('[data-insert-field]')
    expect(sel.findAll('option').map((o) => o.text())).toEqual(['選擇欄位…', '批號', 'partNo', 'qty'])
    await sel.setValue('qty')
    expect((el(added.id) as { text: string }).text).toBe("Q'TY{{qty}}")
    // 條碼：Code 39 不能編碼小寫以外的符號
    await w.find('[data-layer="b"]').trigger('click')
    await input('format').setValue('code39')
    await input('value').setValue('ab!')
    await input('value').trigger('change')
    expect(w.find('[data-invalid]').exists()).toBe(true)
    await input('showText').setValue(false)
    await w.find('[data-insert-field]').setValue('lotNo')
    expect((el('b') as { value: string }).value).toBe('ab!{{lotNo}}')
    // QR
    await w.find('[data-layer="q"]').trigger('click')
    await input('level').setValue('H')
    expect((el('q') as { level: string }).level).toBe('H')
    await w.find('[data-insert-field]').setValue('partNo')
    expect((el('q') as { value: string }).value).toBe('QR{{partNo}}')
    // 方框 / 線 / 圖片
    await w.find('[data-layer="f"]').trigger('click')
    await input('thickness').setValue('1')
    await input('thickness').trigger('change')
    await input('radius').setValue('2')
    await input('radius').trigger('change')
    await input('fill').setValue(true)
    expect(el('f')).toMatchObject({ thickness: 1, radius: 2, fill: true })
    await w.find('[data-add="line"]').trigger('click')
    expect(input('radius').exists()).toBe(false)
    await w.find('[data-add="image"]').trigger('click')
    await input('src').setValue('logo.png')
    await input('src').trigger('change')
    expect((model.value!.elements.at(-1) as { src: string }).src).toBe('logo.png')
    // 標籤設定
    await key(w, 'Escape')
    await w.find('[data-doc="width"]').setValue('80')
    await w.find('[data-doc="width"]').trigger('change')
    await w.find('[data-doc="height"]').setValue('2')
    await w.find('[data-doc="height"]').trigger('change')
    await w.find('[data-doc="dpi"]').setValue('300')
    expect(model.value).toMatchObject({ width: 80, height: 50, dpi: 300 })
  })

  it('拖曳移動（貼齊參考線、限制在標籤內、一次一筆歷史）、改大小、點空白取消選取、鎖定的不能拖', async () => {
    const { w, model, scale, el, vm } = mountIt()
    const k = scale()
    const t = w.find('[data-el="t"]').element
    pointer(t, 'pointerdown', 15 * k, 12 * k)
    const s = w.find('[data-label-svg]').element
    pointer(s, 'pointermove', 15.2 * k, 12 * k) // 太小，不算拖曳
    pointer(s, 'pointermove', 24.8 * k, 12.2 * k)
    await nextTick()
    expect(w.findAll('[data-guide]').length).toBeGreaterThan(0)
    pointer(s, 'pointerup', 24.8 * k, 12.2 * k)
    await nextTick()
    // 左邊 19.8 → 貼齊格線 20；文字中線 35 ≈ … 依貼齊結果
    expect(el('t').x).toBeCloseTo(20, 0)
    expect(w.findAll('[data-guide]')).toHaveLength(0)
    const n = (model.value!.elements as LabelElement[]).length
    vm().undo()
    await nextTick()
    expect(el('t').x).toBe(10)
    vm().redo()
    expect(model.value!.elements).toHaveLength(n)
    // 拖到外面：限制在標籤內
    pointer(t, 'pointerdown', 25 * k, 12 * k)
    pointer(s, 'pointermove', 200 * k, 200 * k)
    pointer(s, 'pointerup', 200 * k, 200 * k)
    expect(el('t')).toMatchObject({ x: 70, y: 44 })
    // 改大小（右下角）
    await nextTick()
    const se = w.find('[data-handle="se"]').element
    pointer(se, 'pointerdown', 100 * k, 50 * k)
    pointer(s, 'pointermove', 95 * k, 48 * k)
    pointer(s, 'pointerup', 95 * k, 48 * k)
    expect(el('t')).toMatchObject({ w: 25, h: 4 })
    // 左上角
    const nw = w.find('[data-handle="nw"]').element
    pointer(nw, 'pointerdown', 70 * k, 44 * k)
    pointer(s, 'pointermove', 72 * k, 45 * k)
    pointer(s, 'pointerup', 72 * k, 45 * k)
    expect(el('t')).toMatchObject({ x: 72, y: 45, w: 23, h: 3 })
    // QR 保持正方形
    w.findComponent(ChptLabelDesigner).vm.$.exposed!.select(['q'])
    await nextTick()
    pointer(w.find('[data-handle="e"]').element, 'pointerdown', 90 * k, 20 * k)
    pointer(s, 'pointermove', 93.4 * k, 20 * k)
    pointer(s, 'pointerup', 93.4 * k, 20 * k)
    expect(el('q').w).toBe(el('q').h)
    pointer(w.find('[data-handle="n"]').element, 'pointerdown', 80 * k, 10 * k)
    pointer(s, 'pointermove', 80 * k, 4 * k)
    pointer(s, 'pointerup', 80 * k, 4 * k)
    expect(el('q').w).toBe(el('q').h)
    // 點空白：取消選取
    pointer(s, 'pointerdown', 1, 1)
    await nextTick()
    expect(w.find('[data-selection]').exists()).toBe(false)
    // 鎖定的：可以選、不能拖
    pointer(w.find('[data-el="f"]').element, 'pointerdown', 50 * k, 1 * k)
    pointer(s, 'pointermove', 60 * k, 10 * k)
    pointer(s, 'pointerup', 60 * k, 10 * k)
    await nextTick()
    expect(el('f')).toMatchObject({ x: 0, y: 0 })
    expect(w.find('[data-handle]').exists()).toBe(false)
    // 不吸附時照拖曳距離
    const free = mountIt({ snap: false })
    const fk = free.scale()
    pointer(free.w.find('[data-el="t"]').element, 'pointerdown', 0, 0)
    pointer(free.w.find('[data-label-svg]').element, 'pointermove', 3.33 * fk, 0)
    pointer(free.w.find('[data-label-svg]').element, 'pointerup', 3.33 * fk, 0)
    expect(free.el('t').x).toBeCloseTo(13.33, 1)
    // 右鍵不動作；沒有拖曳時 pointerup 不動作
    const e = new Event('pointerdown', { bubbles: true })
    Object.defineProperties(e, { clientX: { value: 0 }, clientY: { value: 0 }, pointerId: { value: 1 }, button: { value: 2 }, pointerType: { value: 'mouse' }, shiftKey: { value: false }, metaKey: { value: false }, ctrlKey: { value: false } })
    free.w.find('[data-el="b"]').element.dispatchEvent(e)
    pointer(free.w.find('[data-label-svg]').element, 'pointerup', 0, 0)
  })

  it('多選（Shift）、對齊、圖層順序、複製、刪除、圖層清單鍵盤', async () => {
    const { w, model, el, scale } = mountIt()
    const k = scale()
    pointer(w.find('[data-el="t"]').element, 'pointerdown', 15 * k, 12 * k)
    pointer(w.find('[data-label-svg]').element, 'pointerup', 15 * k, 12 * k)
    pointer(w.find('[data-el="q"]').element, 'pointerdown', 75 * k, 12 * k, { shiftKey: true })
    pointer(w.find('[data-label-svg]').element, 'pointerup', 75 * k, 12 * k)
    await nextTick()
    expect(w.find('[data-multi]').text()).toBe('已選取 2 個元素')
    await w.find('[data-align="top"]').trigger('click')
    expect([el('t').y, el('q').y]).toEqual([10, 10])
    await w.find('[data-align="bottom"]').trigger('click')
    expect(el('t').y).toBe(24)
    expect(w.find('[data-live]').text()).toBe('靠下對齊')
    await w.find('[data-action="remove"]').trigger('click')
    expect(model.value!.elements.map((e) => e.id)).toEqual(['b', 'f'])
    expect(w.find('[data-live]').text()).toBe('已刪除 2 個元素')
    // 單選：圖層順序、複製
    await w.find('[data-layer="b"]').trigger('click')
    await w.find('[data-action="front"]').trigger('click')
    expect(model.value!.elements.map((e) => e.id)).toEqual(['f', 'b'])
    await w.find('[data-action="back"]').trigger('click')
    expect(model.value!.elements[0].id).toBe('b')
    await w.find('[data-action="duplicate"]').trigger('click')
    expect(model.value!.elements).toHaveLength(3)
    // 圖層清單：↑↓ 選取、Shift 加選、Delete 刪除
    const list = w.find('[data-layers]')
    await list.trigger('keydown', { key: 'Home' })
    expect(w.find('[data-layers] [aria-selected="true"]').attributes('data-layer')).toBe(model.value!.elements.at(-1)!.id)
    await list.trigger('keydown', { key: 'ArrowDown' })
    await list.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    expect(w.findAll('[data-layers] [aria-selected="true"]')).toHaveLength(2)
    await list.trigger('keydown', { key: 'ArrowUp' })
    await list.trigger('keydown', { key: 'End' })
    await list.trigger('keydown', { key: 'x' })
    await list.trigger('keydown', { key: 'Delete' })
    expect(model.value!.elements).toHaveLength(2)
    // Shift 點兩次取消
    await w.find('[data-layer="f"]').trigger('click', { shiftKey: true })
    await w.find('[data-layer="f"]').trigger('click', { shiftKey: true })
    expect(w.find('[data-layers] [aria-selected="true"]').exists()).toBe(false)
  })

  it('鍵盤：方向鍵（Shift 10 倍、Alt 0.1）、Delete、Ctrl + D / A / Z / Y、Esc', async () => {
    const { w, model, el, vm } = mountIt()
    vm().select(['t'])
    await key(w, 'ArrowRight')
    expect(el('t').x).toBe(11)
    await key(w, 'ArrowDown', { shiftKey: true })
    expect(el('t').y).toBe(20)
    await key(w, 'ArrowLeft', { altKey: true })
    expect(el('t').x).toBe(10.9)
    await key(w, 'ArrowUp')
    expect(w.find('[data-live]').text()).toBe('位置 10.9, 19 mm')
    await key(w, 'd', { ctrlKey: true })
    expect(model.value!.elements).toHaveLength(5)
    await key(w, 'z', { ctrlKey: true })
    expect(model.value!.elements).toHaveLength(4)
    expect(w.find('[data-live]').text()).toBe('已復原')
    await key(w, 'z', { ctrlKey: true, shiftKey: true })
    expect(model.value!.elements).toHaveLength(5)
    await key(w, 'z', { metaKey: true })
    await key(w, 'y', { ctrlKey: true })
    expect(w.find('[data-live]').text()).toBe('已重做')
    await key(w, 'a', { ctrlKey: true })
    expect(w.findAll('[data-selection]')).toHaveLength(5)
    await key(w, 'Escape')
    expect(w.findAll('[data-selection]')).toHaveLength(0)
    await key(w, 'ArrowLeft') // 沒選取
    await key(w, 'Delete')
    vm().select(['q'])
    await key(w, 'Backspace')
    expect(model.value!.elements.some((e) => e.id === 'q')).toBe(false)
    await key(w, 'x')
    // 沒有歷史可以復原 / 重做時
    const fresh = mountIt()
    fresh.vm().undo()
    fresh.vm().redo()
    expect(fresh.w.find('[data-action="undo"]').attributes('disabled')).toBeDefined()
    // grid = 0 時方向鍵一次 1 mm
    const g0 = mountIt({ grid: 0 })
    g0.vm().select(['t'])
    await key(g0.w, 'ArrowRight')
    expect(g0.el('t').x).toBe(11)
    expect(g0.w.find('[data-grid]').exists()).toBe(false)
  })

  it('預覽（v-model:preview）與唯讀：代入資料、不能選取或編輯', async () => {
    const { w, preview, emitted, vm, model } = mountIt()
    await w.find('[data-action="preview"]').trigger('click')
    expect(preview.value).toBe(true)
    expect(emitted.preview).toEqual([true])
    expect(w.find('[data-grid]').exists()).toBe(false)
    expect(w.find('[data-el="t"]').html()).toContain('LOT L-001')
    vm().select(['t'])
    await nextTick()
    expect(w.find('[data-selection]').exists()).toBe(false)
    pointer(w.find('[data-el="t"]').element, 'pointerdown', 0, 0)
    pointer(w.find('[data-label-svg]').element, 'pointerdown', 0, 0)
    await key(w, 'Delete')
    expect(model.value!.elements).toHaveLength(4)
    preview.value = false
    await nextTick()
    expect(w.find('[data-grid]').exists()).toBe(true)
    // 沒有資料的欄位：設計時顯示原樣、預覽時為空
    const nd = mountIt({ data: null })
    expect(nd.w.find('[data-el="t"]').html()).toContain('{{lotNo}}')
    // 唯讀
    const ro = mountIt({ readonly: true })
    expect(ro.w.find('[data-add]').exists()).toBe(false)
    expect(ro.w.find('[data-action="undo"]').exists()).toBe(false)
    pointer(ro.w.find('[data-el="t"]').element, 'pointerdown', 0, 0)
    await nextTick()
    expect(ro.w.find('[data-handle]').exists()).toBe(false)
    expect(ro.w.find('[data-prop="x"]').exists()).toBe(false)
    expect(ro.w.find('p.sr-only').text()).toBe('唯讀的標籤版面')
    // 外部改 v-model：清掉不存在的選取
    const ext = mountIt()
    ext.vm().select(['t', 'b'])
    ext.model.value = { width: 50, height: 30, elements: [base().elements[1]] }
    await nextTick()
    expect(ext.w.findAll('[data-selection]')).toHaveLength(1)
  })

  it('縮放與輸出：SVG、ZPL、列印 HTML、列印、PNG 與下載', async () => {
    const { w, vm } = mountIt({ exportName: 'carton' })
    const before = Number(w.find('[data-label-svg]').attributes('width'))
    await w.find('[data-action="zoom-in"]').trigger('click')
    expect(Number(w.find('[data-label-svg]').attributes('width'))).toBeCloseTo(before * 1.25)
    expect(w.find('[data-zoom]').text()).toBe('125%')
    await w.find('[data-action="zoom-out"]').trigger('click')
    await w.find('[data-action="zoom-out"]').trigger('click')
    await w.find('[data-action="fit"]').trigger('click')
    expect(w.find('[data-zoom]').text()).toBe('100%')
    expect(vm().toSvg()).toContain('LOT L-001')
    expect(vm().toSvg({ lotNo: 'X' })).toContain('LOT X')
    expect(vm().toZpl()).toContain('^FDLOT L-001^FS')
    const html = vm().printHtml([{ lotNo: 'A' }, { lotNo: 'B' }])
    expect(html).toContain('@page{size:100mm 50mm;margin:0}')
    expect(html.match(/class="p"/g)).toHaveLength(2)
    vi.useFakeTimers()
    try {
      const frame = vm().print()!
      expect(document.body.contains(frame)).toBe(true)
      const printSpy = vi.fn()
      Object.defineProperty(frame.contentWindow!, 'print', { value: printSpy, configurable: true })
      vi.advanceTimersByTime(150)
      expect(printSpy).toHaveBeenCalled()
      vi.advanceTimersByTime(1100)
      expect(document.body.contains(frame)).toBe(false)
      await w.find('[data-action="print"]').trigger('click')
    } finally {
      vi.useRealTimers()
    }
    // PNG：模擬圖片載入與 canvas
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    }
    vi.stubGlobal('Image', FakeImage)
    const drawn: number[][] = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: (_i: unknown, ...a: number[]) => drawn.push(a) } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: BlobCallback) {
      cb(new Blob(['png'], { type: 'image/png' }))
    })
    const blob = await vm().exportPng(null, 300)
    expect(blob?.type).toBe('image/png')
    expect(drawn[0]).toEqual([0, 0, 1181, 591])
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:x' })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} })
    const clicks: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download)
    })
    await w.find('[data-action="png"]').trigger('click')
    await new Promise((r) => setTimeout(r, 5))
    expect(clicks).toEqual(['carton.png'])
    // 沒有 2d context、圖片載入失敗
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(await vm().exportPng()).toBeNull()
    class BadImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        setTimeout(() => this.onerror?.(), 0)
      }
    }
    vi.stubGlobal('Image', BadImage)
    expect(await vm().exportPng()).toBeNull()
    await w.find('[data-action="png"]').trigger('click')
    await new Promise((r) => setTimeout(r, 5))
    expect(clicks).toHaveLength(1)
  })

  it('英文語系', () => {
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.find('[data-add="barcode"]').attributes('aria-label')).toBe('Add barcode')
    expect(en.w.find('[data-canvas-wrap]').attributes('aria-label')).toBe('Label designer')
    expect(en.w.find('[data-used-fields]').text()).toBe('Fields used: lotNo, partNo')
  })
})
