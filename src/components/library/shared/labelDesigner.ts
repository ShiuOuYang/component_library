/**
 * 標籤設計器（ChptLabelDesigner）的資料、幾何、綁定與輸出
 *
 * 座標與尺寸都以 mm 為單位（左上角為原點）；文字大小用 pt。
 * 文字、條碼、QR code 的內容可以寫成 {{lotNo}} 這種欄位，列印 / 預覽時代入資料。
 * 輸出：SVG 字串（給 PNG 與列印）、ZPL（Zebra 等工業標籤機直接列印）。
 */
import qrcode from 'qrcode-generator'
import { BarcodeError, encodeBarcode, type BarcodeFormat, type BarcodeResult } from './barcode'

export type LabelElementType = 'text' | 'barcode' | 'qrcode' | 'line' | 'rect' | 'image'
export type LabelRotation = 0 | 90 | 180 | 270

interface LabelBase {
  id: string
  x: number
  y: number
  w: number
  h: number
  rotation?: LabelRotation
  locked?: boolean
}

export interface LabelText extends LabelBase {
  type: 'text'
  text: string
  /** 字級（pt） */
  fontSize: number
  bold?: boolean
  align?: 'left' | 'center' | 'right'
}
export interface LabelBarcode extends LabelBase {
  type: 'barcode'
  value: string
  format: BarcodeFormat
  /** 條碼下方顯示文字 */
  showText?: boolean
}
export interface LabelQr extends LabelBase {
  type: 'qrcode'
  value: string
  level?: 'L' | 'M' | 'Q' | 'H'
}
export interface LabelLine extends LabelBase {
  type: 'line'
  /** 線寬（mm）；w ≥ h 為水平線，否則為垂直線 */
  thickness: number
}
export interface LabelRect extends LabelBase {
  type: 'rect'
  thickness: number
  radius?: number
  fill?: boolean
}
export interface LabelImage extends LabelBase {
  type: 'image'
  src: string
}

export type LabelElement = LabelText | LabelBarcode | LabelQr | LabelLine | LabelRect | LabelImage

export interface LabelDoc {
  /** 標籤寬高（mm） */
  width: number
  height: number
  /** 標籤機解析度（203 / 300 / 600 dpi），ZPL 與 PNG 用 */
  dpi?: number
  elements: LabelElement[]
}

export interface LabelRectBox {
  x: number
  y: number
  w: number
  h: number
}

export const PT_TO_MM = 25.4 / 72
export const mmToDots = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi)
const round2 = (v: number) => Math.round(v * 100) / 100

let seq = 0
export function labelId(): string {
  seq = (seq + 1) % 1e9
  return `el${Date.now().toString(36)}${seq.toString(36)}`
}

/** 新元素的預設大小與屬性；text 為文字元素的預設內容 */
export function createElement(type: LabelElementType, at: { x: number; y: number }, o: { text?: string; id?: string } = {}): LabelElement {
  const base = { id: o.id ?? labelId(), x: round2(at.x), y: round2(at.y) }
  switch (type) {
    case 'text':
      return { ...base, type, w: 30, h: 6, text: o.text ?? 'Text', fontSize: 10, align: 'left' }
    case 'barcode':
      return { ...base, type, w: 40, h: 12, value: o.text ?? '123456', format: 'code128', showText: true }
    case 'qrcode':
      return { ...base, type, w: 16, h: 16, value: o.text ?? '123456', level: 'M' }
    case 'line':
      return { ...base, type, w: 30, h: 0.5, thickness: 0.3 }
    case 'rect':
      return { ...base, type, w: 30, h: 15, thickness: 0.3, radius: 0, fill: false }
    case 'image':
      return { ...base, type, w: 15, h: 15, src: o.text ?? '' }
  }
}

// ===== 欄位綁定 =====

const FIELD_RE = /\{\{\s*([\w.-]+)\s*\}\}/g

/** 代入欄位；keepMissing 時沒有的欄位保留原樣（設計時看得到），否則變成空字串 */
export function bindTemplate(tpl: string, data: Record<string, unknown> | null | undefined, keepMissing = true): string {
  return tpl.replace(FIELD_RE, (m, key: string) => {
    const v = data?.[key]
    return v === undefined || v === null ? (keepMissing ? m : '') : String(v)
  })
}

/** 標籤用到的欄位（依出現順序、不重複） */
export function templateFields(doc: LabelDoc): string[] {
  const out: string[] = []
  for (const el of doc.elements) {
    const src = el.type === 'text' ? el.text : el.type === 'barcode' || el.type === 'qrcode' ? el.value : ''
    for (const m of src.matchAll(FIELD_RE)) if (!out.includes(m[1])) out.push(m[1])
  }
  return out
}

// ===== 幾何 =====

export const snapTo = (v: number, grid: number) => (grid > 0 ? round2(Math.round(v / grid) * grid) : round2(v))

export function boundsOf(els: readonly LabelRectBox[]): LabelRectBox | null {
  if (!els.length) return null
  const x1 = Math.min(...els.map((e) => e.x))
  const y1 = Math.min(...els.map((e) => e.y))
  const x2 = Math.max(...els.map((e) => e.x + e.w))
  const y2 = Math.max(...els.map((e) => e.y + e.h))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export interface SnapResult {
  dx: number
  dy: number
  /** 對齊參考線（mm） */
  guides: { x: number[]; y: number[] }
}

/**
 * 移動時的對齊：移動框的左 / 中 / 右（上 / 中 / 下）碰到其他元素或標籤的左 / 中 / 右（上 / 中 / 下）時吸過去；
 * 沒有對齊對象時吸附格線。回傳要額外加上的位移與參考線。
 */
export function snapMove(box: LabelRectBox, others: readonly LabelRectBox[], label: { width: number; height: number }, o: { threshold: number; grid: number }): SnapResult {
  const targetsX = [0, label.width / 2, label.width, ...others.flatMap((e) => [e.x, e.x + e.w / 2, e.x + e.w])]
  const targetsY = [0, label.height / 2, label.height, ...others.flatMap((e) => [e.y, e.y + e.h / 2, e.y + e.h])]
  const pick = (edges: number[], targets: number[], start: number, grid: number) => {
    let best: { d: number; t: number } | null = null
    for (const e of edges) {
      for (const t of targets) {
        const d = t - e
        if (Math.abs(d) <= o.threshold && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t }
      }
    }
    if (best) {
      const d = best.d
      return { d, guides: [...new Set(targets.filter((t) => edges.some((e) => Math.abs(e + d - t) < 1e-6)))] }
    }
    return { d: snapTo(start, grid) - start, guides: [] }
  }
  const sx = pick([box.x, box.x + box.w / 2, box.x + box.w], targetsX, box.x, o.grid)
  const sy = pick([box.y, box.y + box.h / 2, box.y + box.h], targetsY, box.y, o.grid)
  return { dx: round2(sx.d), dy: round2(sy.d), guides: { x: sx.guides, y: sy.guides } }
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/** 拖曳控制點改大小；min 為最小寬高，keepRatio 時依寬度等比 */
export function resizeBox(b: LabelRectBox, handle: ResizeHandle, dx: number, dy: number, min = 1, keepRatio = false): LabelRectBox {
  let { x, y, w, h } = b
  if (handle.includes('e')) w = Math.max(min, b.w + dx)
  if (handle.includes('w')) {
    w = Math.max(min, b.w - dx)
    x = b.x + b.w - w
  }
  if (handle.includes('s')) h = Math.max(min, b.h + dy)
  if (handle.includes('n')) {
    h = Math.max(min, b.h - dy)
    y = b.y + b.h - h
  }
  if (keepRatio && b.w > 0) {
    const r = b.h / b.w
    if (handle === 'n' || handle === 's') w = h / r
    else h = w * r
    if (handle.includes('n')) y = b.y + b.h - h
    if (handle.includes('w')) x = b.x + b.w - w
  }
  return { x: round2(x), y: round2(y), w: round2(w), h: round2(h) }
}

/** 把元素限制在標籤內（超出時推回來；比標籤大時貼齊左上） */
export function clampInside(b: LabelRectBox, label: { width: number; height: number }): LabelRectBox {
  return { ...b, x: round2(Math.max(0, Math.min(b.x, label.width - b.w))), y: round2(Math.max(0, Math.min(b.y, label.height - b.h))) }
}

// ===== 文件操作（都回傳新的文件） =====

export function updateElement(doc: LabelDoc, id: string, patch: Partial<LabelElement>): LabelDoc {
  return { ...doc, elements: doc.elements.map((e) => (e.id === id ? ({ ...e, ...patch, id: e.id, type: e.type } as LabelElement) : e)) }
}

export function moveElements(doc: LabelDoc, ids: readonly string[], dx: number, dy: number, clamp = true): LabelDoc {
  return {
    ...doc,
    elements: doc.elements.map((e) => {
      if (!ids.includes(e.id) || e.locked) return e
      const moved = { ...e, x: round2(e.x + dx), y: round2(e.y + dy) }
      return clamp ? ({ ...moved, ...clampInside(moved, doc) } as LabelElement) : moved
    }),
  }
}

export function removeElements(doc: LabelDoc, ids: readonly string[]): LabelDoc {
  return { ...doc, elements: doc.elements.filter((e) => !ids.includes(e.id)) }
}

/** 複製（往右下偏移 offset mm），回傳新文件與新的 id */
export function duplicateElements(doc: LabelDoc, ids: readonly string[], offset = 2): { doc: LabelDoc; ids: string[] } {
  // 複製出來的一律不鎖定（clampInside 會帶回原本的屬性，所以 locked 要放在最後）
  const copies = doc.elements.filter((e) => ids.includes(e.id)).map((e) => ({ ...clampInside({ ...e, x: e.x + offset, y: e.y + offset }, doc), id: labelId(), locked: false }) as LabelElement)
  return { doc: { ...doc, elements: [...doc.elements, ...copies] }, ids: copies.map((c) => c.id) }
}

export type LabelAlign = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'

/** 對齊：選一個時對齊標籤，選多個時對齊選取範圍 */
export function alignElements(doc: LabelDoc, ids: readonly string[], mode: LabelAlign): LabelDoc {
  const sel = doc.elements.filter((e) => ids.includes(e.id) && !e.locked)
  if (!sel.length) return doc
  const ref = sel.length === 1 ? { x: 0, y: 0, w: doc.width, h: doc.height } : boundsOf(sel)!
  return {
    ...doc,
    elements: doc.elements.map((e) => {
      if (!sel.includes(e)) return e
      const x = mode === 'left' ? ref.x : mode === 'hcenter' ? ref.x + (ref.w - e.w) / 2 : mode === 'right' ? ref.x + ref.w - e.w : e.x
      const y = mode === 'top' ? ref.y : mode === 'vcenter' ? ref.y + (ref.h - e.h) / 2 : mode === 'bottom' ? ref.y + ref.h - e.h : e.y
      return { ...e, x: round2(x), y: round2(y) }
    }),
  }
}

/** 圖層順序：front / back 移到最上 / 最下，forward / backward 移一層 */
export function reorderElement(doc: LabelDoc, id: string, to: 'front' | 'back' | 'forward' | 'backward'): LabelDoc {
  const list = [...doc.elements]
  const i = list.findIndex((e) => e.id === id)
  if (i < 0) return doc
  const [el] = list.splice(i, 1)
  const j = to === 'front' ? list.length : to === 'back' ? 0 : to === 'forward' ? Math.min(list.length, i + 1) : Math.max(0, i - 1)
  list.splice(j, 0, el)
  return { ...doc, elements: list }
}

// ===== 條碼 / QR =====

export function barcodeOf(value: string, format: BarcodeFormat): BarcodeResult | null {
  try {
    return value ? encodeBarcode(value, format) : null
  } catch (e) {
    if (e instanceof BarcodeError) return null
    throw e
  }
}

function toBinaryString(text: string): string {
  let out = ''
  for (const byte of new TextEncoder().encode(text)) out += String.fromCharCode(byte)
  return out
}

export function qrMatrix(value: string, level: 'L' | 'M' | 'Q' | 'H' = 'M'): boolean[][] | null {
  if (!value) return null
  try {
    const qr = qrcode(0, level)
    qr.addData(toBinaryString(value), 'Byte')
    qr.make()
    const n = qr.getModuleCount()
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)))
  } catch {
    return null
  }
}

/** 條碼的長條（相對於 0～1 的寬度比例） */
export function barcodeBars(code: BarcodeResult): { x: number; w: number }[] {
  const bars: { x: number; w: number }[] = []
  let pos = 0
  code.widths.forEach((wd, k) => {
    if (k % 2 === 0) bars.push({ x: pos / code.modules, w: wd / code.modules })
    pos += wd
  })
  return bars
}

// ===== SVG 輸出 =====

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** 條碼文字高度（mm） */
export const BARCODE_TEXT_H = 3

/** 單一元素的 SVG 片段（座標為 mm） */
export function elementSvg(el: LabelElement, data: Record<string, unknown> | null, keepMissing: boolean): string {
  const rot = el.rotation ? ` transform="rotate(${el.rotation} ${round2(el.x + el.w / 2)} ${round2(el.y + el.h / 2)})"` : ''
  switch (el.type) {
    case 'text': {
      const size = el.fontSize * PT_TO_MM
      const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start'
      const tx = el.align === 'center' ? el.x + el.w / 2 : el.align === 'right' ? el.x + el.w : el.x
      const lines = bindTemplate(el.text, data, keepMissing).split('\n')
      const top = el.y + el.h / 2 - ((lines.length - 1) * size * 1.2) / 2
      const spans = lines.map((l, k) => `<tspan x="${round2(tx)}" y="${round2(top + k * size * 1.2)}">${esc(l)}</tspan>`).join('')
      return `<text font-family="Arial, Helvetica, sans-serif" font-size="${round2(size)}" font-weight="${el.bold ? 700 : 400}" text-anchor="${anchor}" dominant-baseline="central" fill="#000"${rot}>${spans}</text>`
    }
    case 'barcode': {
      const code = barcodeOf(bindTemplate(el.value, data, keepMissing), el.format)
      if (!code) return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="none" stroke="#c00" stroke-width="0.2" stroke-dasharray="1 0.6"${rot}/>`
      const barH = el.showText ? Math.max(1, el.h - BARCODE_TEXT_H) : el.h
      const bars = barcodeBars(code)
        .map((b) => `M${round2(el.x + b.x * el.w)},${round2(el.y)}h${round2(b.w * el.w)}v${round2(barH)}h${round2(-b.w * el.w)}z`)
        .join('')
      const txt = el.showText
        ? `<text x="${round2(el.x + el.w / 2)}" y="${round2(el.y + el.h - BARCODE_TEXT_H / 2)}" font-family="Arial, Helvetica, sans-serif" font-size="2.4" text-anchor="middle" dominant-baseline="central" fill="#000">${esc(code.text)}</text>`
        : ''
      return `<g${rot}><path d="${bars}" fill="#000"/>${txt}</g>`
    }
    case 'qrcode': {
      const m = qrMatrix(bindTemplate(el.value, data, keepMissing), el.level)
      if (!m) return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="none" stroke="#c00" stroke-width="0.2" stroke-dasharray="1 0.6"${rot}/>`
      const size = Math.min(el.w, el.h)
      const cell = size / m.length
      let d = ''
      m.forEach((row, r) => row.forEach((dark, c) => (d += dark ? `M${round2(el.x + c * cell)},${round2(el.y + r * cell)}h${round2(cell)}v${round2(cell)}h${round2(-cell)}z` : '')))
      return `<path d="${d}" fill="#000"${rot}/>`
    }
    case 'line': {
      const horizontal = el.w >= el.h
      const [x1, y1, x2, y2] = horizontal ? [el.x, el.y + el.h / 2, el.x + el.w, el.y + el.h / 2] : [el.x + el.w / 2, el.y, el.x + el.w / 2, el.y + el.h]
      return `<line x1="${round2(x1)}" y1="${round2(y1)}" x2="${round2(x2)}" y2="${round2(y2)}" stroke="#000" stroke-width="${el.thickness}"${rot}/>`
    }
    case 'rect': {
      const t = el.thickness
      return `<rect x="${round2(el.x + t / 2)}" y="${round2(el.y + t / 2)}" width="${round2(Math.max(0, el.w - t))}" height="${round2(Math.max(0, el.h - t))}" rx="${el.radius ?? 0}" fill="${el.fill ? '#000' : 'none'}" stroke="#000" stroke-width="${t}"${rot}/>`
    }
    case 'image':
      return el.src ? `<image href="${esc(el.src)}" x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" preserveAspectRatio="xMidYMid meet"${rot}/>` : ''
  }
}

/** 整張標籤的 SVG（寬高以 mm 表示，可直接列印）；keepMissing 時沒有資料的欄位保留 {{field}} */
export function labelSvg(doc: LabelDoc, data: Record<string, unknown> | null = null, keepMissing = false): string {
  const body = doc.elements.map((e) => elementSvg(e, data, keepMissing)).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}mm" height="${doc.height}mm" viewBox="0 0 ${doc.width} ${doc.height}"><rect width="${doc.width}" height="${doc.height}" fill="#fff"/>${body}</svg>`
}

// ===== ZPL 輸出 =====

const ZPL_ROT: Record<LabelRotation, string> = { 0: 'N', 90: 'R', 180: 'I', 270: 'B' }
/** ZPL 欄位資料：^ ~ _ 以 ^FH 十六進位跳脫 */
const zplText = (s: string) => s.replace(/_/g, '_5F').replace(/\^/g, '_5E').replace(/~/g, '_7E')

/**
 * 轉成 ZPL II（Zebra 標籤機）。文字用內建字型 0（^CI28 UTF-8；中文需要印表機裝有對應字型）、
 * 條碼 ^BC / ^B3、QR ^BQ、線與框 ^GB；圖片不支援（略過，留下註解）。
 */
export function toZpl(doc: LabelDoc, data: Record<string, unknown> | null = null): string {
  const dpi = doc.dpi ?? 203
  const d = (mm: number) => Math.max(0, mmToDots(mm, dpi))
  const out = ['^XA', '^CI28', `^PW${d(doc.width)}`, `^LL${d(doc.height)}`]
  for (const el of doc.elements) {
    const o = ZPL_ROT[el.rotation ?? 0]
    const fo = `^FO${d(el.x)},${d(el.y)}`
    switch (el.type) {
      case 'text': {
        const hDots = Math.max(10, Math.round((el.fontSize / 72) * dpi))
        const just = el.align === 'center' ? 'C' : el.align === 'right' ? 'R' : 'L'
        const lines = bindTemplate(el.text, data, false).split('\n')
        out.push(`${fo}^A0${o},${hDots},${hDots}^FB${d(el.w)},${lines.length},0,${just}^FH^FD${lines.map(zplText).join('\\&')}^FS`)
        break
      }
      case 'barcode': {
        const value = bindTemplate(el.value, data, false)
        const code = barcodeOf(value, el.format)
        const module = Math.max(1, Math.floor(d(el.w) / (code?.modules ?? 100)))
        const barH = d(el.showText ? Math.max(1, el.h - BARCODE_TEXT_H) : el.h)
        const yn = el.showText ? 'Y' : 'N'
        const cmd = el.format === 'code39' ? `^B3${o},N,${barH},${yn},N` : `^BC${o},${barH},${yn},N,N`
        out.push(`${fo}^BY${module}${cmd}^FH^FD${zplText(value)}^FS`)
        break
      }
      case 'qrcode': {
        const value = bindTemplate(el.value, data, false)
        const n = qrMatrix(value, el.level)?.length ?? 21
        const mag = Math.max(1, Math.min(10, Math.floor(d(Math.min(el.w, el.h)) / n)))
        out.push(`${fo}^BQ${o},2,${mag}^FH^FD${el.level ?? 'M'}A,${zplText(value)}^FS`)
        break
      }
      case 'line': {
        const t = Math.max(1, d(el.thickness))
        out.push(el.w >= el.h ? `^FO${d(el.x)},${d(el.y + el.h / 2 - el.thickness / 2)}^GB${d(el.w)},${t},${t}^FS` : `^FO${d(el.x + el.w / 2 - el.thickness / 2)},${d(el.y)}^GB${t},${d(el.h)},${t}^FS`)
        break
      }
      case 'rect': {
        const t = Math.max(1, d(el.thickness))
        const rounding = Math.min(8, Math.round(((el.radius ?? 0) / Math.max(0.1, Math.min(el.w, el.h) / 2)) * 8))
        out.push(`${fo}^GB${d(el.w)},${d(el.h)},${el.fill ? Math.min(d(el.w), d(el.h)) : t},B,${rounding}^FS`)
        break
      }
      case 'image':
        out.push(`^FX image ${el.id} not supported in ZPL export^FS`)
        break
    }
  }
  out.push('^XZ')
  return out.join('\n')
}
