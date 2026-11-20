import { describe, expect, it, vi } from 'vitest'
import {
  createWidthTracker,
  drawSegment,
  drawStroke,
  exportRect,
  signatureBounds,
  signatureToSVG,
  strokeSegment,
  type SignatureStroke,
} from '@/components/library/shared/signature'

const opts = { minWidth: 1, maxWidth: 3 }

describe('createWidthTracker', () => {
  it('第一點為中間粗細；寫得快變細、慢變粗；不會小於 minWidth', () => {
    const w = createWidthTracker(opts)
    expect(w({ x: 0, y: 0, t: 0 })).toBe(2)
    const fast = w({ x: 200, y: 0, t: 10 }) // 20 px/ms
    expect(fast).toBeLessThan(2)
    let slow = fast
    for (let i = 1; i <= 20; i++) slow = w({ x: 200 + i * 0.5, y: 0, t: 10 + i * 50 }) // 0.01 px/ms
    expect(slow).toBeGreaterThan(2.8)
    const v = createWidthTracker({ ...opts, velocityFilter: 1 })
    v({ x: 0, y: 0, t: 0 })
    let thin = 0
    for (let i = 1; i < 30; i++) thin = v({ x: i * 1000, y: 0, t: i })
    expect(thin).toBeGreaterThanOrEqual(1)
    expect(thin).toBeLessThan(1.01)
  })

  it('筆有壓力值時照壓力；同一個時間戳不會除以 0', () => {
    const w = createWidthTracker(opts)
    expect(w({ x: 0, y: 0, t: 0, pointerType: 'pen', pressure: 0.5 })).toBe(2)
    expect(w({ x: 1, y: 0, t: 0, pointerType: 'pen', pressure: 1.4 })).toBe(3)
    // 筆但沒有壓力值（0）時照速度
    expect(Number.isFinite(w({ x: 2, y: 0, t: 0, pointerType: 'pen', pressure: 0 }))).toBe(true)
  })
})

const P = (x: number, y: number, w = 2) => ({ x, y, w })

describe('strokeSegment', () => {
  const pts = [P(0, 0, 1), P(10, 0, 3), P(20, 10, 1)]
  it('第一段從第一點開始；中間段從中點到中點；最後一段畫到最後一點', () => {
    expect(strokeSegment(pts, 1)).toEqual({ start: P(0, 0, 1), control: P(0, 0, 1), end: { x: 5, y: 0 }, width: 2 })
    expect(strokeSegment(pts, 2)).toEqual({ start: { x: 5, y: 0 }, control: P(10, 0, 3), end: P(20, 10, 1), width: 2 })
    expect(strokeSegment(pts, 2, false).end).toEqual({ x: 15, y: 5 })
  })
})

function fakeCtx() {
  return {
    calls: [] as string[],
    lineCap: '' as CanvasLineCap,
    lineJoin: '' as CanvasLineJoin,
    lineWidth: 0,
    strokeStyle: '' as string,
    fillStyle: '' as string,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  }
}

describe('drawStroke / drawSegment', () => {
  it('一個點畫圓點；多個點每段一條曲線；沒有點不畫', () => {
    const ctx = fakeCtx()
    drawStroke(ctx as unknown as CanvasRenderingContext2D, { color: '#123', points: [P(5, 5, 4)] })
    expect(ctx.arc).toHaveBeenCalledWith(5, 5, 2, 0, Math.PI * 2)
    expect(ctx.fillStyle).toBe('#123')
    drawStroke(ctx as unknown as CanvasRenderingContext2D, { color: '#456', points: [P(0, 0), P(10, 0), P(20, 0)] })
    expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(2)
    expect(ctx.strokeStyle).toBe('#456')
    expect(ctx.lineCap).toBe('round')
    drawStroke(ctx as unknown as CanvasRenderingContext2D, { color: '#000', points: [] })
    expect(ctx.stroke).toHaveBeenCalledTimes(2)
    drawSegment(ctx as unknown as CanvasRenderingContext2D, { color: '#000', points: [P(0, 0), P(4, 4)] }, 1, false)
    expect(ctx.quadraticCurveTo).toHaveBeenLastCalledWith(0, 0, 2, 2)
  })
})

const strokes: SignatureStroke[] = [
  { color: '#111827', points: [P(10, 20, 2), P(50, 30, 4)] },
  { color: '#111827', points: [P(80, 15, 2)] },
]

describe('signatureBounds / exportRect', () => {
  it('含線寬的範圍；沒有筆跡為 null', () => {
    expect(signatureBounds(strokes)).toEqual({ minX: 9, minY: 14, maxX: 81, maxY: 32 })
    expect(signatureBounds([])).toBeNull()
  })
  it('trim 時裁到範圍 + padding；否則（或沒有筆跡）整個區域', () => {
    const size = { width: 300, height: 150 }
    expect(exportRect(strokes, size)).toEqual({ x: 0, y: 0, width: 300, height: 150 })
    expect(exportRect(strokes, size, true, 4)).toEqual({ x: 5, y: 10, width: 80, height: 26 })
    expect(exportRect([], size, true)).toEqual({ x: 0, y: 0, width: 300, height: 150 })
  })
})

describe('signatureToSVG', () => {
  it('每段一條 path、單點為 circle；有背景時加 rect；trim 改 viewBox', () => {
    const svg = signatureToSVG(strokes, { width: 300, height: 150 })
    expect(svg).toContain('viewBox="0 0 300 150"')
    expect(svg.match(/<path /g)).toHaveLength(1)
    expect(svg).toContain('<circle cx="80" cy="15" r="1" fill="#111827"/>')
    expect(svg).not.toContain('<rect')
    const bg = signatureToSVG(strokes, { width: 300, height: 150, background: '#fff', trim: true, padding: 4 })
    expect(bg).toContain('viewBox="5 10 80 26"')
    expect(bg).toContain('<rect x="5" y="10" width="80" height="26" fill="#fff"/>')
  })
  it('顏色裡的特殊字元會被跳脫', () => {
    const svg = signatureToSVG([{ color: '"><script>&', points: [P(1, 1)] }], { width: 10, height: 10 })
    expect(svg).toContain('fill="&quot;>&lt;script>&amp;"')
    expect(svg).not.toContain('<script>')
  })
})
