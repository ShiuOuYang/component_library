import { describe, expect, it } from 'vitest'
import {
  PT_TO_MM,
  alignElements,
  barcodeBars,
  barcodeOf,
  bindTemplate,
  boundsOf,
  clampInside,
  createElement,
  duplicateElements,
  elementSvg,
  labelId,
  labelSvg,
  mmToDots,
  moveElements,
  qrMatrix,
  removeElements,
  reorderElement,
  resizeBox,
  snapMove,
  snapTo,
  templateFields,
  toZpl,
  updateElement,
  type LabelDoc,
  type LabelElement,
  type LabelElementType,
} from '@/components/library/shared/labelDesigner'

const doc = (): LabelDoc => ({
  width: 100,
  height: 50,
  dpi: 203,
  elements: [
    { id: 't', type: 'text', x: 5, y: 5, w: 40, h: 6, text: 'LOT {{lotNo}}', fontSize: 12, bold: true, align: 'left' },
    { id: 'b', type: 'barcode', x: 5, y: 15, w: 50, h: 12, value: '{{partNo}}', format: 'code128', showText: true },
    { id: 'q', type: 'qrcode', x: 70, y: 10, w: 20, h: 20, value: '{{lotNo}}', level: 'M' },
    { id: 'l', type: 'line', x: 5, y: 40, w: 90, h: 0.5, thickness: 0.3 },
    { id: 'r', type: 'rect', x: 0, y: 0, w: 100, h: 50, thickness: 0.4, radius: 2, locked: true },
  ],
})
const data = { lotNo: 'L-001', partNo: 'PCB-1024' }

describe('labelDesigner', () => {
  it('createElement：各類型的預設、id、單位換算', () => {
    const types: LabelElementType[] = ['text', 'barcode', 'qrcode', 'line', 'rect', 'image']
    const els = types.map((t) => createElement(t, { x: 1.234, y: 2 }))
    expect(els.map((e) => [e.type, e.w, e.h])).toEqual([['text', 30, 6], ['barcode', 40, 12], ['qrcode', 16, 16], ['line', 30, 0.5], ['rect', 30, 15], ['image', 15, 15]])
    expect(els[0]).toMatchObject({ x: 1.23, text: 'Text', fontSize: 10 })
    expect(createElement('text', { x: 0, y: 0 }, { text: '品名', id: 'x' })).toMatchObject({ id: 'x', text: '品名' })
    expect(createElement('image', { x: 0, y: 0 }, { text: 'a.png' })).toMatchObject({ src: 'a.png' })
    expect(new Set(Array.from({ length: 30 }, labelId)).size).toBe(30)
    expect(mmToDots(25.4, 203)).toBe(203)
    expect(PT_TO_MM).toBeCloseTo(0.3528, 4)
  })

  it('bindTemplate / templateFields', () => {
    expect(bindTemplate('LOT {{ lotNo }} / {{qty}}', { lotNo: 'A1', qty: 0 })).toBe('LOT A1 / 0')
    expect(bindTemplate('{{x}}-{{y}}', { x: 1 })).toBe('1-{{y}}')
    expect(bindTemplate('{{x}}-{{y}}', { x: 1, y: null }, false)).toBe('1-')
    expect(bindTemplate('{{a.b}}', null)).toBe('{{a.b}}')
    expect(templateFields(doc())).toEqual(['lotNo', 'partNo'])
  })

  it('snapTo / boundsOf / clampInside / resizeBox', () => {
    expect(snapTo(3.26, 0.5)).toBe(3.5)
    expect(snapTo(3.267, 0)).toBe(3.27)
    expect(boundsOf([])).toBeNull()
    expect(boundsOf([{ x: 1, y: 2, w: 3, h: 4 }, { x: 5, y: 0, w: 1, h: 1 }])).toEqual({ x: 1, y: 0, w: 5, h: 6 })
    expect(clampInside({ x: 95, y: -2, w: 10, h: 5 }, { width: 100, height: 50 })).toMatchObject({ x: 90, y: 0 })
    const b = { x: 10, y: 10, w: 20, h: 10 }
    expect(resizeBox(b, 'se', 5, 2)).toEqual({ x: 10, y: 10, w: 25, h: 12 })
    expect(resizeBox(b, 'nw', 5, 2)).toEqual({ x: 15, y: 12, w: 15, h: 8 })
    expect(resizeBox(b, 'w', 30, 0, 1)).toEqual({ x: 29, y: 10, w: 1, h: 10 })
    expect(resizeBox(b, 'n', 0, 20, 2)).toEqual({ x: 10, y: 18, w: 20, h: 2 })
    // 等比
    expect(resizeBox(b, 'e', 10, 0, 1, true)).toEqual({ x: 10, y: 10, w: 30, h: 15 })
    expect(resizeBox(b, 's', 0, 10, 1, true)).toEqual({ x: 10, y: 10, w: 40, h: 20 })
    expect(resizeBox(b, 'nw', -10, 0, 1, true)).toEqual({ x: 0, y: 5, w: 30, h: 15 })
    expect(resizeBox({ x: 0, y: 0, w: 0, h: 5 }, 'e', 3, 0, 1, true)).toEqual({ x: 0, y: 0, w: 3, h: 5 })
  })

  it('snapMove：貼齊其他元素的邊 / 中線、標籤中線，沒有時吸附格線', () => {
    const label = { width: 100, height: 50 }
    const others = [{ x: 40, y: 20, w: 10, h: 10 }]
    // 左邊 39.6 → 貼齊 40
    const s1 = snapMove({ x: 39.6, y: 3.3, w: 5, h: 5 }, others, label, { threshold: 1, grid: 1 })
    expect(s1.dx).toBeCloseTo(0.4)
    expect(s1.guides.x).toEqual([40, 45]) // 左邊對齊 40，同時右邊對齊 others 的中線 45
    // y 沒有對象：吸附格線 3.3 → 3
    expect(s1.dy).toBeCloseTo(-0.3)
    expect(s1.guides.y).toEqual([])
    // 中線貼齊標籤中線 50（同時右邊對齊 others 的右邊 50）
    const s2 = snapMove({ x: 47.7, y: 0, w: 4, h: 4 }, others, label, { threshold: 1, grid: 0 })
    expect(s2.dx).toBeCloseTo(0.3)
    expect(s2.guides.x).toEqual(expect.arrayContaining([50]))
    expect(s2.dy).toBe(0)
  })

  it('文件操作：更新、移動（鎖定不動、限制在標籤內）、刪除、複製、對齊、圖層順序', () => {
    const d = doc()
    expect((updateElement(d, 't', { text: 'X', id: 'nope' } as Partial<LabelElement>).elements[0] as { text: string; id: string })).toMatchObject({ text: 'X', id: 't' })
    const m = moveElements(d, ['t', 'r'], 100, -3)
    expect(m.elements[0]).toMatchObject({ x: 60, y: 2 })
    expect(m.elements[4]).toMatchObject({ x: 0, y: 0 })
    expect(moveElements(d, ['t'], -10, 0, false).elements[0].x).toBe(-5)
    expect(removeElements(d, ['t', 'b']).elements.map((e) => e.id)).toEqual(['q', 'l', 'r'])
    const dup = duplicateElements(d, ['r', 'q'], 2)
    expect(dup.ids).toHaveLength(2)
    const copies = dup.doc.elements.slice(5)
    expect(copies.map((e) => [e.type, e.x, e.y, e.locked])).toEqual([['qrcode', 72, 12, false], ['rect', 0, 0, false]])
    // 對齊：一個時對齊標籤、多個時對齊選取範圍；鎖定的不動
    expect(alignElements(d, ['q'], 'right').elements[2].x).toBe(80)
    expect(alignElements(d, ['q'], 'vcenter').elements[2].y).toBe(15)
    expect(alignElements(d, ['q'], 'hcenter').elements[2].x).toBe(40)
    expect(alignElements(d, ['q'], 'bottom').elements[2].y).toBe(30)
    const multi = alignElements(d, ['t', 'q'], 'top')
    expect([multi.elements[0].y, multi.elements[2].y]).toEqual([5, 5])
    expect(alignElements(d, ['t', 'q'], 'left').elements[2].x).toBe(5)
    expect(alignElements(d, ['r'], 'left')).toBe(d)
    expect(reorderElement(d, 't', 'front').elements.map((e) => e.id)).toEqual(['b', 'q', 'l', 'r', 't'])
    expect(reorderElement(d, 'r', 'back').elements[0].id).toBe('r')
    expect(reorderElement(d, 'b', 'forward').elements.map((e) => e.id)).toEqual(['t', 'q', 'b', 'l', 'r'])
    expect(reorderElement(d, 'b', 'backward').elements[0].id).toBe('b')
    expect(reorderElement(d, 'zz', 'front')).toBe(d)
  })

  it('條碼與 QR：編碼、長條位置、無法編碼時為 null', () => {
    const code = barcodeOf('ABC', 'code39')!
    expect(code.text).toBe('ABC')
    const bars = barcodeBars(code)
    expect(bars[0].x).toBe(0)
    expect(bars.reduce((s, b) => s + b.w, 0)).toBeLessThan(1)
    expect(barcodeOf('abc!', 'code39')).toBeNull()
    expect(barcodeOf('', 'code128')).toBeNull()
    expect(qrMatrix('hello')!.length).toBe(21)
    expect(qrMatrix('')).toBeNull()
    expect(qrMatrix('x'.repeat(5000))).toBeNull()
  })

  it('SVG：代入資料、旋轉、各元素、無法編碼的條碼畫紅框、空圖片', () => {
    const d = doc()
    const svg = labelSvg(d, data)
    expect(svg).toContain('width="100mm" height="50mm" viewBox="0 0 100 50"')
    expect(svg).toContain('LOT L-001')
    expect(svg).toContain('PCB-1024')
    expect(svg).toContain('font-weight="700"')
    expect(labelSvg(d, {}, true)).toContain('{{lotNo}}')
    expect(labelSvg(d, {}, false)).toContain('stroke="#c00"') // 空的條碼值
    const el = (e: Partial<LabelElement> & { type: LabelElementType }) => elementSvg({ ...createElement(e.type, { x: 0, y: 0 }), ...e } as LabelElement, null, true)
    expect(el({ type: 'text', text: 'a\nb<c>', align: 'center', rotation: 90 })).toMatch(/rotate\(90 15 3\).*<tspan x="15"[^>]*>a<\/tspan><tspan x="15"[^>]*>b&lt;c&gt;/)
    expect(el({ type: 'text', align: 'right' })).toContain('text-anchor="end"')
    expect(el({ type: 'barcode', value: '123', showText: false })).not.toContain('<text')
    expect(el({ type: 'qrcode', value: 'x'.repeat(5000) })).toContain('stroke="#c00"')
    expect(el({ type: 'line', w: 1, h: 20 })).toContain('x1="0.5" y1="0" x2="0.5" y2="20"')
    expect(el({ type: 'rect', fill: true })).toContain('fill="#000"')
    expect(el({ type: 'image', src: '' })).toBe('')
    expect(el({ type: 'image', src: 'a"b.png' })).toContain('href="a&quot;b.png"')
  })

  it('ZPL：尺寸、文字、條碼、QR、線、框、圖片、跳脫、旋轉', () => {
    const d = doc()
    d.elements.push({ id: 'i', type: 'image', x: 0, y: 0, w: 5, h: 5, src: 'a.png' })
    d.elements.push({ id: 't2', type: 'text', x: 0, y: 0, w: 20, h: 5, text: 'a^b~c_d\nline2', fontSize: 8, align: 'right', rotation: 90 })
    d.elements.push({ id: 'b2', type: 'barcode', x: 0, y: 0, w: 30, h: 10, value: 'ABC', format: 'code39', showText: false, rotation: 180 })
    d.elements.push({ id: 'v', type: 'line', x: 10, y: 0, w: 0.5, h: 20, thickness: 0.5 })
    d.elements.push({ id: 'f', type: 'rect', x: 0, y: 0, w: 10, h: 10, thickness: 0.3, fill: true })
    d.elements.push({ id: 'c', type: 'text', x: 0, y: 0, w: 20, h: 5, text: 'C', fontSize: 8, align: 'center' })
    const z = toZpl(d, data).split('\n')
    expect(z.slice(0, 4)).toEqual(['^XA', '^CI28', '^PW799', '^LL400'])
    expect(z.at(-1)).toBe('^XZ')
    expect(z[4]).toBe('^FO40,40^A0N,34,34^FB320,1,0,L^FH^FDLOT L-001^FS')
    expect(z[5]).toMatch(/^\^FO40,120\^BY\d\^BCN,72,Y,N,N\^FH\^FDPCB-1024\^FS$/)
    expect(z[6]).toMatch(/^\^FO559,80\^BQN,2,\d+\^FH\^FDMA,L-001\^FS$/)
    expect(z[7]).toBe('^FO40,320^GB719,2,2^FS')
    expect(z[8]).toBe('^FO0,0^GB799,400,3,B,1^FS')
    expect(z[9]).toBe('^FX image i not supported in ZPL export^FS')
    expect(z[10]).toBe('^FO0,0^A0R,23,23^FB160,2,0,R^FH^FDa_5Eb_7Ec_5Fd\\&line2^FS')
    expect(z[11]).toMatch(/\^B3I,N,80,N,N\^FH\^FDABC\^FS$/)
    expect(z[12]).toBe('^FO80,0^GB4,160,4^FS')
    expect(z[13]).toBe('^FO0,0^GB80,80,80,B,0^FS')
    expect(z[14]).toContain('^FB160,1,0,C^')
    // 沒有 dpi 時用 203；無法編碼的條碼仍輸出（交給印表機）
    expect(toZpl({ width: 10, height: 10, elements: [{ id: 'x', type: 'barcode', x: 0, y: 0, w: 5, h: 5, value: 'ab!', format: 'code39' }] })).toContain('^BY1^B3N,N,40,N,N')
  })
})
