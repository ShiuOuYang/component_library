import { describe, expect, it } from 'vitest'
import {
  applyAspect,
  clampRect,
  fitView,
  flipRect,
  initialRect,
  isValidRect,
  moveRect,
  normalizeRotation,
  outputSize,
  rectFromDrag,
  resizeRect,
  rotateRect,
  rotatedSize,
  roundRect,
  scaleRect,
  zoomView,
} from '@/components/library/shared/imageCropper'

const B = { width: 1000, height: 600 }
const r0 = { x: 100, y: 100, width: 400, height: 200 }

describe('imageCropper', () => {
  it('rotatedSize / normalizeRotation', () => {
    expect(rotatedSize(B, 0)).toEqual(B)
    expect(rotatedSize(B, 90)).toEqual({ width: 600, height: 1000 })
    expect(rotatedSize(B, 270)).toEqual({ width: 600, height: 1000 })
    expect(rotatedSize(B, 180)).toEqual(B)
    expect([450, -90, 360, 185, -360].map(normalizeRotation)).toEqual([90, 270, 0, 180, 0])
  })

  it('initialRect：置中、覆蓋比例、固定比例取放得下的最大', () => {
    expect(initialRect(B)).toEqual({ x: 100, y: 60, width: 800, height: 480 })
    expect(initialRect(B, 1)).toEqual({ x: 260, y: 60, width: 480, height: 480 })
    expect(initialRect({ width: 600, height: 1000 }, 16 / 9, 1)).toEqual({ x: 0, y: 500 - 600 / (16 / 9) / 2, width: 600, height: 600 / (16 / 9) })
  })

  it('clampRect / moveRect', () => {
    expect(clampRect({ x: -10, y: 550, width: 200, height: 100 }, B)).toEqual({ x: 0, y: 500, width: 200, height: 100 })
    expect(clampRect({ x: 0, y: 0, width: 2000, height: 900 }, B)).toEqual({ x: 0, y: 0, width: 1000, height: 600 })
    expect(moveRect(r0, 50, -20, B)).toEqual({ ...r0, x: 150, y: 80 })
    expect(moveRect(r0, 9999, -9999, B)).toEqual({ ...r0, x: 600, y: 0 })
  })

  it('resizeRect：角、邊（另一方向以中心對稱）、最小、邊界', () => {
    expect(resizeRect(r0, 'se', 50, 30, { bounds: B })).toEqual({ x: 100, y: 100, width: 450, height: 230 })
    expect(resizeRect(r0, 'nw', 50, 30, { bounds: B })).toEqual({ x: 150, y: 130, width: 350, height: 170 })
    expect(resizeRect(r0, 'e', 50, 999, { bounds: B })).toEqual({ x: 100, y: 100, width: 450, height: 200 })
    expect(resizeRect(r0, 'n', 0, -40, { bounds: B })).toEqual({ x: 100, y: 60, width: 400, height: 240 })
    // 最小
    expect(resizeRect(r0, 'se', -999, -999, { bounds: B, min: 20 })).toEqual({ x: 100, y: 100, width: 20, height: 20 })
    // 邊界
    expect(resizeRect(r0, 'se', 9999, 9999, { bounds: B })).toEqual({ x: 100, y: 100, width: 900, height: 500 })
    expect(resizeRect(r0, 'w', -9999, 0, { bounds: B })).toEqual({ x: 0, y: 100, width: 500, height: 200 })
  })

  it('resizeRect：固定比例', () => {
    const sq = { x: 100, y: 100, width: 200, height: 200 }
    // 角：跟著變化比較大的方向
    expect(resizeRect(sq, 'se', 100, 20, { bounds: B, aspect: 1 })).toEqual({ x: 100, y: 100, width: 300, height: 300 })
    expect(resizeRect(sq, 'se', 10, 60, { bounds: B, aspect: 1 })).toEqual({ x: 100, y: 100, width: 260, height: 260 })
    // 邊：另一方向以中心對稱
    expect(resizeRect(sq, 'e', 100, 0, { bounds: B, aspect: 1 })).toEqual({ x: 100, y: 50, width: 300, height: 300 })
    expect(resizeRect({ ...sq, x: 400 }, 's', 0, 40, { bounds: B, aspect: 2 })).toEqual({ x: 260, y: 100, width: 480, height: 240 })
    // 靠左時以中心對稱往左只能長到 400 寬
    expect(resizeRect(sq, 's', 0, 40, { bounds: B, aspect: 2 })).toEqual({ x: 0, y: 100, width: 400, height: 200 })
    // 放不下：受另一邊限制
    expect(resizeRect(sq, 'se', 9999, 0, { bounds: B, aspect: 1 })).toEqual({ x: 100, y: 100, width: 500, height: 500 })
    // 最小
    expect(resizeRect(sq, 'nw', 999, 999, { bounds: B, aspect: 2, min: 10 })).toEqual({ x: 280, y: 290, width: 20, height: 10 })
  })

  it('rectFromDrag：四個方向、固定比例', () => {
    expect(rectFromDrag({ x: 100, y: 100 }, { x: 300, y: 250 }, { bounds: B })).toEqual({ x: 100, y: 100, width: 200, height: 150 })
    expect(rectFromDrag({ x: 300, y: 250 }, { x: 100, y: 100 }, { bounds: B })).toEqual({ x: 100, y: 100, width: 200, height: 150 })
    expect(rectFromDrag({ x: 100, y: 300 }, { x: 200, y: 100 }, { bounds: B, aspect: 1 })).toEqual({ x: 100, y: 100, width: 200, height: 200 })
    // 往圖片外拉：最多到邊
    expect(rectFromDrag({ x: 0, y: 0 }, { x: -50, y: -50 }, { bounds: B })).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('applyAspect / scaleRect', () => {
    const a = applyAspect(r0, 1, B)
    expect(a.width).toBeCloseTo(Math.sqrt(80000))
    expect(a.x + a.width / 2).toBeCloseTo(300)
    expect(applyAspect(r0, null, B)).toBe(r0)
    // 放不下時縮
    const big = applyAspect({ x: 0, y: 0, width: 1000, height: 600 }, 1 / 3, B)
    expect([big.width, big.height]).toEqual([200, 600])
    expect(scaleRect(r0, 1.5, { bounds: B })).toEqual({ x: 0, y: 50, width: 600, height: 300 })
    expect(scaleRect(r0, 0.01, { bounds: B, min: 40 })).toEqual({ x: 280, y: 190, width: 40, height: 20 })
    expect(scaleRect(r0, 10, { bounds: B, aspect: 2 })).toEqual({ x: 0, y: 0, width: 1000, height: 500 })
  })

  it('rotateRect / flipRect：框跟著內容', () => {
    // 順時針：(x, y) → (H − y − h, x)
    const cw = rotateRect(r0, B, 1)
    expect(cw).toEqual({ x: 300, y: 100, width: 200, height: 400 })
    // 再逆時針轉回來
    expect(rotateRect(cw, { width: 600, height: 1000 }, -1)).toEqual(r0)
    expect(flipRect(r0, B, 'x')).toEqual({ ...r0, x: 500 })
    expect(flipRect(r0, B, 'y')).toEqual({ ...r0, y: 300 })
  })

  it('outputSize / roundRect / isValidRect', () => {
    expect(outputSize(r0)).toEqual({ width: 400, height: 200 })
    expect(outputSize(r0, { width: 100 })).toEqual({ width: 100, height: 50 })
    expect(outputSize(r0, { height: 100 })).toEqual({ width: 200, height: 100 })
    expect(outputSize(r0, { width: 64, height: 64 })).toEqual({ width: 64, height: 64 })
    expect(outputSize(r0, { maxWidth: 200 })).toEqual({ width: 200, height: 100 })
    expect(outputSize(r0, { maxHeight: 50 })).toEqual({ width: 100, height: 50 })
    expect(outputSize({ x: 0, y: 0, width: 0.2, height: 0.1 })).toEqual({ width: 1, height: 1 })
    expect(roundRect({ x: 1.4, y: 1.6, width: 9.5, height: 2.2 })).toEqual({ x: 1, y: 2, width: 10, height: 2 })
    expect(isValidRect(r0, B)).toBe(true)
    expect(isValidRect({ ...r0, x: 900 }, B)).toBe(false)
    expect(isValidRect({ ...r0, width: 0 }, B)).toBe(false)
    expect(isValidRect({ x: 'a' }, B)).toBe(false)
    expect(isValidRect(null, B)).toBe(false)
  })

  it('fitView / zoomView', () => {
    const v = fitView({ width: 600, height: 360 }, B, 0)
    expect(v).toEqual({ k: 0.6, x: 0, y: 0 })
    const v2 = fitView({ width: 600, height: 400 }, { width: 100, height: 100 }, 20)
    expect(v2).toEqual({ k: 3.6, x: 120, y: 20 })
    // 以 (300, 180) 為中心放大兩倍：該點不動
    const z = zoomView(v, 2, 300, 180, 0.1, 10)
    expect(z.k).toBe(1.2)
    expect((300 - z.x) / z.k).toBeCloseTo((300 - v.x) / v.k)
    expect(zoomView(v, 100, 0, 0, 0.1, 2).k).toBe(2)
    expect(zoomView(v, 0.001, 0, 0, 0.3, 2).k).toBe(0.3)
  })
})
