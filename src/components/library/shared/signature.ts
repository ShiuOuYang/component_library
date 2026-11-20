/**
 * 簽名板（ChptSignaturePad）的筆跡資料、粗細計算與輸出
 *
 * 筆跡存成點（CSS px，相對於簽名區左上角）＋每一點的線寬，而不是只存畫好的像素：
 *   - 可以復原上一筆、改變大小時重畫不會糊
 *   - 可以輸出 SVG（向量，列印、放大都清楚），也可以只裁出有簽名的範圍
 *
 * 線條平滑：相鄰兩點的中點當端點、點本身當控制點畫二次貝茲曲線，轉彎處不會有折角。
 * 線條粗細：筆（有壓力值）照壓力；滑鼠與手指照速度 —— 寫得快的地方細、慢的地方粗，像真的簽名。
 */

export interface SignaturePoint {
  x: number
  y: number
  /** 這一點的線寬（px） */
  w: number
}

export interface SignatureStroke {
  color: string
  points: SignaturePoint[]
}

export interface SignatureWidthOptions {
  /** 最細（px） */
  minWidth: number
  /** 最粗（px） */
  maxWidth: number
  /** 速度平滑係數 0–1：越大越跟著瞬間速度變（預設 0.7） */
  velocityFilter?: number
}

/** 一個輸入點：座標、時間（ms）、壓力（0–1）、輸入裝置 */
export interface SignatureInput {
  x: number
  y: number
  t: number
  pressure?: number
  pointerType?: string
}

/**
 * 建立一筆的線寬計算器（每一筆重新建立）。
 * 筆且有壓力值時照壓力；否則照速度：w = max(minWidth, maxWidth / (速度 + 1))，速度單位 px/ms。
 */
export function createWidthTracker(options: SignatureWidthOptions): (input: SignatureInput) => number {
  const { minWidth, maxWidth } = options
  const filter = options.velocityFilter ?? 0.7
  let last: SignatureInput | null = null
  let velocity = 0
  let width = (minWidth + maxWidth) / 2
  return (input) => {
    if (input.pointerType === 'pen' && input.pressure && input.pressure > 0) {
      last = input
      width = minWidth + (maxWidth - minWidth) * Math.min(1, input.pressure)
      return width
    }
    if (last) {
      const dt = Math.max(1, input.t - last.t)
      const v = Math.hypot(input.x - last.x, input.y - last.y) / dt
      velocity = filter * v + (1 - filter) * velocity
      const target = Math.max(minWidth, maxWidth / (velocity + 1))
      // 粗細也平滑一點，避免一格一格跳
      width = width * 0.4 + target * 0.6
    }
    last = input
    return width
  }
}

const mid = (a: SignaturePoint, b: SignaturePoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/**
 * 第 i 段（i ≥ 1）：起點、控制點、終點、線寬。
 * final = true 時最後一段畫到最後一點；畫到一半（還在寫）時只畫到中點，下一點來了再接上。
 */
export function strokeSegment(points: SignaturePoint[], i: number, final = true) {
  const n = points.length
  const start = i === 1 ? points[0] : mid(points[i - 2], points[i - 1])
  const control = points[i - 1]
  const end = final && i === n - 1 ? points[n - 1] : mid(points[i - 1], points[i])
  return { start, control, end, width: (points[i - 1].w + points[i].w) / 2 }
}

/** 最小的 2D context 介面：畫面上的 canvas 與輸出用的離屏 canvas 共用 */
type Ctx = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'quadraticCurveTo' | 'stroke' | 'arc' | 'fill' | 'lineCap' | 'lineJoin' | 'lineWidth' | 'strokeStyle' | 'fillStyle'
>

/** 畫一段（畫面上邊寫邊畫用） */
export function drawSegment(ctx: Ctx, stroke: SignatureStroke, i: number, final = true): void {
  const { start, control, end, width } = strokeSegment(stroke.points, i, final)
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.quadraticCurveTo(control.x, control.y, end.x, end.y)
  ctx.stroke()
}

/** 畫一整筆；只有一個點時畫一個圓點 */
export function drawStroke(ctx: Ctx, stroke: SignatureStroke): void {
  const pts = stroke.points
  if (!pts.length) return
  if (pts.length === 1) {
    ctx.fillStyle = stroke.color
    ctx.beginPath()
    ctx.arc(pts[0].x, pts[0].y, pts[0].w / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  for (let i = 1; i < pts.length; i++) drawSegment(ctx, stroke, i)
}

export interface SignatureBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** 所有筆跡的範圍（含線寬）；沒有筆跡時為 null */
export function signatureBounds(strokes: SignatureStroke[]): SignatureBounds | null {
  let b: SignatureBounds | null = null
  for (const s of strokes)
    for (const p of s.points) {
      const r = p.w / 2
      if (!b) b = { minX: p.x - r, minY: p.y - r, maxX: p.x + r, maxY: p.y + r }
      else {
        b.minX = Math.min(b.minX, p.x - r)
        b.minY = Math.min(b.minY, p.y - r)
        b.maxX = Math.max(b.maxX, p.x + r)
        b.maxY = Math.max(b.maxY, p.y + r)
      }
    }
  return b
}

/** 輸出範圍：trim 時只取有筆跡的範圍（四周留 padding），否則整個簽名區 */
export function exportRect(
  strokes: SignatureStroke[],
  size: { width: number; height: number },
  trim = false,
  padding = 8
): { x: number; y: number; width: number; height: number } {
  const b = trim ? signatureBounds(strokes) : null
  if (!b) return { x: 0, y: 0, width: size.width, height: size.height }
  const x = Math.floor(b.minX - padding)
  const y = Math.floor(b.minY - padding)
  return { x, y, width: Math.ceil(b.maxX + padding) - x, height: Math.ceil(b.maxY + padding) - y }
}

const r2 = (n: number) => Math.round(n * 100) / 100

export interface SignatureSvgOptions {
  width: number
  height: number
  /** 只取有筆跡的範圍 */
  trim?: boolean
  /** trim 時四周留白（px） */
  padding?: number
  /** 背景色；不給為透明 */
  background?: string | null
}

/** 筆跡 → SVG 原始碼（向量，列印與放大都清楚） */
export function signatureToSVG(strokes: SignatureStroke[], options: SignatureSvgOptions): string {
  const rect = exportRect(strokes, options, options.trim, options.padding)
  const body: string[] = []
  if (options.background)
    body.push(`<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${escapeAttr(options.background)}"/>`)
  for (const s of strokes) {
    const color = escapeAttr(s.color)
    const pts = s.points
    if (pts.length === 1) {
      body.push(`<circle cx="${r2(pts[0].x)}" cy="${r2(pts[0].y)}" r="${r2(pts[0].w / 2)}" fill="${color}"/>`)
      continue
    }
    for (let i = 1; i < pts.length; i++) {
      const { start, control, end, width } = strokeSegment(pts, i)
      body.push(
        `<path d="M${r2(start.x)} ${r2(start.y)}Q${r2(control.x)} ${r2(control.y)} ${r2(end.x)} ${r2(end.y)}" stroke="${color}" stroke-width="${r2(width)}"/>`
      )
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}" viewBox="${rect.x} ${rect.y} ${rect.width} ${rect.height}">` +
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${body.join('')}</g></svg>`
  )
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
