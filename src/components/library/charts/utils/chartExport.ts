/**
 * 圖表匯出：把畫面上的一塊區域（圖表 + 圖例 + 標題）轉成獨立的 SVG / PNG，或把資料轉成 CSV。
 *
 * 為什麼自己轉、不用 <foreignObject> 把 HTML 整包塞進 SVG：
 *   foreignObject 的 SVG 在 PowerPoint、Illustrator、Inkscape 裡都畫不出來 —— 匯出 SVG 多半就是要貼進簡報。
 *   這裡改成「看到什麼畫什麼」的純 SVG：
 *     - <svg>：整份複製，並把計算後的樣式（fill、stroke、字型…）寫進每個元素。圖表的顏色多半來自
 *       CSS 變數與 scoped class，離開頁面就失效，不寫進去的話匯出來全是黑色
 *     - <canvas>（大量資料模式的散點、長條）：嵌成 <image>
 *     - HTML（圖例、標題、統計面板）：有底色或框線的元素畫成 <rect>，文字畫成 <text>
 *   PNG 由同一份 SVG 畫到 canvas 產生，兩種格式內容一致。
 *
 * 不會出現在匯出結果裡的：
 *   - display:none、visibility:hidden、opacity:0 的元素
 *   - 螢幕閱讀器專用（1×1 px 裁切）的元素
 *   - 標了 data-export-ignore 的元素（例如重設縮放鈕、外框自己的工具列）
 *   - Material Symbols 圖示（圖示字型在 SVG 圖片裡載不到，畫出來會變成「zoom_out_map」這種字）
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

/** 複製 SVG 時寫進 style 的屬性：圖表外觀用得到的都在這裡 */
const SVG_STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'alignment-baseline',
  'letter-spacing',
  'text-decoration',
  'paint-order',
  'shape-rendering',
  'visibility',
  'display',
  'mix-blend-mode',
] as const

export type ChartExportFormat = 'png' | 'svg'

export interface ChartExportOptions {
  /** 底色（CSS 顏色）。不給時取區域本身（或最近有底色的祖先）的底色；'transparent' 為透明 */
  background?: string
  /** PNG 的倍率（預設 2，簡報投影也清楚） */
  scale?: number
  /** 四周留白（px，預設 12） */
  padding?: number
}

interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 完全透明的顏色（不用畫）。只看 alpha：rgba(r, g, b, 0)、rgb(r g b / 0)。
 * ⚠️ 第一版用「最後一個數字是 0」判斷，把 rgb(234, 179, 0) 這種藍色分量為 0 的黃色也當成透明，圖例色塊不見了
 */
export function isTransparent(color: string): boolean {
  if (!color || color === 'transparent') return true
  const legacy = /^rgba\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([\d.]+%?)\s*\)$/.exec(color)
  if (legacy) return parseFloat(legacy[1]) === 0
  const modern = /\/\s*([\d.]+%?)\s*\)$/.exec(color)
  if (modern) return parseFloat(modern[1]) === 0
  return false
}

/** 會裁切子內容（捲動容器、overflow:hidden）。也看簡寫 overflow：不是每個環境都會展開成 overflowX / overflowY */
function clipsContent(style: CSSStyleDeclaration): boolean {
  return [style.overflow, style.overflowX, style.overflowY].some((v) => !!v && v.split(/\s+/).some((part) => part !== 'visible'))
}

/** 這個元素（含子孫）要不要畫 */
function isSkipped(el: Element, style: CSSStyleDeclaration): boolean {
  if (el.closest('[data-export-ignore]')) return true
  if (el.classList.contains('material-symbols-outlined') || el.classList.contains('material-symbols-rounded')) return true
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true
  // sr-only：1×1 px、overflow hidden（Tailwind 的 .sr-only）
  const rect = el.getBoundingClientRect()
  if (rect.width <= 1 && rect.height <= 1 && style.overflow === 'hidden') return true
  return false
}

/** 複製一個 <svg>，把計算後的樣式寫進每個元素 */
export function cloneSvgWithStyles(source: SVGSVGElement, getStyle: (el: Element) => CSSStyleDeclaration = getComputedStyle): SVGSVGElement {
  const clone = source.cloneNode(true) as SVGSVGElement
  const from = [source, ...source.querySelectorAll('*')]
  const to = [clone, ...clone.querySelectorAll('*')]
  for (let i = 0; i < from.length; i++) {
    const target = to[i] as SVGElement
    const style = getStyle(from[i])
    const decl: string[] = []
    for (const prop of SVG_STYLE_PROPS) {
      const v = style.getPropertyValue(prop)
      if (v) decl.push(`${prop}:${v}`)
    }
    // 原本的 class 在匯出檔裡沒有對應的樣式，留著只會干擾（貼進其他工具時可能撞到它們的 class）
    target.removeAttribute('class')
    target.setAttribute('style', decl.join(';'))
  }
  // 互動用的屬性沒有意義
  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on') || attr.name === 'tabindex' || attr.name.startsWith('data-v-')) el.removeAttribute(attr.name)
    }
  }
  return clone
}

/** HTML 文字節點 → 一行或多行（換行時依每個字元所在的行分組） */
function textLines(node: Text): { text: string; box: DOMRect }[] {
  const text = node.textContent ?? ''
  if (!text.trim()) return []
  const range = document.createRange()
  // 沒有版面資訊的環境（jsdom、SSR）量不到文字位置
  if (typeof range.getClientRects !== 'function') return []
  range.selectNodeContents(node)
  const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
  if (rects.length <= 1) {
    const box = rects[0] ?? range.getBoundingClientRect()
    return box.width > 0 ? [{ text: text.trim(), box }] : []
  }
  // 換了行：逐字找它落在哪一行
  const lines: { text: string; box: DOMRect }[] = rects.map((box) => ({ text: '', box }))
  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i)
    range.setEnd(node, i + 1)
    const r = range.getBoundingClientRect()
    const line = lines.find((l) => r.top >= l.box.top - 1 && r.bottom <= l.box.bottom + 1) ?? lines[lines.length - 1]
    line.text += text[i]
  }
  return lines.filter((l) => l.text.trim()).map((l) => ({ ...l, text: l.text.trim() }))
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v))
  return node
}

/** 往上找第一個有底色的元素的底色（找不到時白色） */
function backgroundOf(root: Element): string {
  for (let node: Element | null = root; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor
    if (!isTransparent(bg)) return bg
  }
  return '#ffffff'
}

/**
 * 把一塊 HTML 區域轉成獨立的 SVG 字串（純 SVG，不含 foreignObject）。
 * 回傳的 width / height 是 CSS px（不含倍率）。
 */
export function elementToSvg(root: HTMLElement, options: ChartExportOptions = {}): { svg: string; width: number; height: number } {
  const padding = options.padding ?? 12
  const origin = root.getBoundingClientRect()
  const width = Math.ceil(origin.width + padding * 2)
  const height = Math.ceil(origin.height + padding * 2)
  const at = (r: DOMRect): Box => ({ x: r.left - origin.left + padding, y: r.top - origin.top + padding, width: r.width, height: r.height })

  // xmlns 不要自己設：元素是 createElementNS 建的，序列化時會自動加上；再設一次在 jsdom（與部分瀏覽器）會變成重複屬性、不是合法的 XML
  const out = el('svg', { width, height, viewBox: `0 0 ${width} ${height}` })
  out.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', XLINK_NS)
  const background = options.background ?? backgroundOf(root)
  if (background !== 'transparent') out.appendChild(el('rect', { x: 0, y: 0, width, height, fill: background }))

  const defs = el('defs', {})
  out.appendChild(defs)
  let clipSeq = 0

  const walk = (node: Element, parent: SVGElement) => {
    const style = getComputedStyle(node)
    if (isSkipped(node, style)) return
    const box = at(node.getBoundingClientRect())

    if (node instanceof SVGSVGElement) {
      if (box.width <= 0 || box.height <= 0) return
      const clone = cloneSvgWithStyles(node)
      clone.setAttribute('x', String(box.x))
      clone.setAttribute('y', String(box.y))
      clone.setAttribute('width', String(box.width))
      clone.setAttribute('height', String(box.height))
      if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`)
      parent.appendChild(clone)
      return
    }

    if (node instanceof HTMLCanvasElement) {
      if (box.width <= 0 || box.height <= 0) return
      try {
        const image = el('image', { x: box.x, y: box.y, width: box.width, height: box.height, preserveAspectRatio: 'none' })
        image.setAttributeNS(XLINK_NS, 'xlink:href', node.toDataURL('image/png'))
        image.setAttribute('href', node.toDataURL('image/png'))
        parent.appendChild(image)
      } catch {
        /* 跨來源圖片畫過的 canvas 讀不出來：略過這一層 */
      }
      return
    }

    // HTML：底色、框線
    const bg = style.backgroundColor
    const radius = parseFloat(style.borderTopLeftRadius) || 0
    if (box.width > 0 && box.height > 0 && !isTransparent(bg)) {
      parent.appendChild(el('rect', { ...box, rx: radius, fill: bg, ...(style.opacity !== '1' ? { opacity: style.opacity } : {}) }))
    }
    const bw = parseFloat(style.borderTopWidth) || 0
    if (box.width > 0 && box.height > 0 && bw > 0 && style.borderTopStyle !== 'none' && !isTransparent(style.borderTopColor)) {
      parent.appendChild(el('rect', {
        x: box.x + bw / 2,
        y: box.y + bw / 2,
        width: Math.max(0, box.width - bw),
        height: Math.max(0, box.height - bw),
        rx: radius,
        fill: 'none',
        stroke: style.borderTopColor,
        'stroke-width': bw,
      }))
    }

    // 會裁切內容的區塊（捲動容器、overflow:hidden）：捲出範圍的子內容不能畫出來
    let into: SVGElement = parent
    if (clipsContent(style)) {
      const id = `chpt-export-clip-${++clipSeq}`
      const clip = el('clipPath', { id })
      clip.appendChild(el('rect', { ...box }))
      defs.appendChild(clip)
      into = el('g', { 'clip-path': `url(#${id})` })
      parent.appendChild(into)
    }

    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        for (const line of textLines(child as Text)) {
          const b = at(line.box)
          const t = el('text', {
            x: b.x,
            y: b.y + b.height / 2,
            'dominant-baseline': 'central',
            fill: style.color,
            'font-family': style.fontFamily,
            'font-size': style.fontSize,
            'font-weight': style.fontWeight,
            ...(style.fontStyle !== 'normal' ? { 'font-style': style.fontStyle } : {}),
            ...(style.opacity !== '1' ? { opacity: style.opacity } : {}),
          })
          t.textContent = line.text
          into.appendChild(t)
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child as Element, into)
      }
    }
  }

  for (const child of root.children) walk(child, out)
  return { svg: new XMLSerializer().serializeToString(out), width, height }
}

/** SVG 字串 → PNG Blob（瀏覽器專用） */
export function svgToPng(svg: string, width: number, height: number, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(width * scale)
        canvas.height = Math.round(height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas 2d context unavailable')
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))), 'image/png')
      } catch (e) {
        reject(e)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('failed to render SVG'))
    }
    img.src = url
  })
}

/** 把一塊區域匯出成 PNG 或 SVG 的 Blob */
export async function exportChart(root: HTMLElement, format: ChartExportFormat, options: ChartExportOptions = {}): Promise<Blob> {
  const { svg, width, height } = elementToSvg(root, options)
  if (format === 'svg') return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  return svgToPng(svg, width, height, options.scale ?? 2)
}

export interface CsvColumn {
  key: string
  title?: string
}

/** 一格的 CSV 寫法：含逗號、引號、換行時加引號；避免被試算表當成公式（CSV injection） */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = value instanceof Date ? value.toISOString() : String(value)
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** 資料列 → CSV 字串（不含 BOM）。不給 columns 時用第一列的欄位 */
export function toCsv(rows: Record<string, unknown>[], columns?: CsvColumn[]): string {
  const cols: CsvColumn[] = columns ?? Object.keys(rows[0] ?? {}).map((key) => ({ key }))
  const head = cols.map((c) => csvCell(c.title ?? c.key)).join(',')
  const body = rows.map((r) => cols.map((c) => csvCell(r[c.key])).join(','))
  return [head, ...body].join('\r\n')
}

/** CSV Blob：加上 UTF-8 BOM，Excel 才不會把中文讀成亂碼 */
export function csvBlob(rows: Record<string, unknown>[], columns?: CsvColumn[]): Blob {
  return new Blob(['﻿', toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' })
}

/** 觸發瀏覽器下載（實作在 shared/download，這裡保留匯出相容） */
export { downloadBlob } from '../../shared/download'
