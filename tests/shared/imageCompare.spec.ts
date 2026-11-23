import { describe, expect, it } from 'vitest'
import { clampImageView, clampPercent, fitImage, percentAt, viewOf, zoomImageTo, zoomOf } from '@/components/library/shared/imageCompare'

describe('imageCompare', () => {
  it('fitImage：contain 並置中', () => {
    expect(fitImage(800, 400, 400, 400)).toEqual({ k: 0.5, tx: 0, ty: 100 })
    expect(fitImage(400, 800, 400, 400)).toEqual({ k: 0.5, tx: 100, ty: 0 })
    // 大小為 0 不會除以 0
    expect(Number.isFinite(fitImage(0, 0, 400, 300).k)).toBe(true)
  })

  it('clampImageView：比畫面小的方向置中、比畫面大的方向不能拖出空白', () => {
    // 影像 800×400 放大到 k=1，畫面 400×400：水平可拖（-400..0），垂直比畫面… 等於 400 → 置中
    expect(clampImageView({ k: 1, tx: 50, ty: 30 }, 800, 400, 400, 400)).toEqual({ k: 1, tx: 0, ty: 0 })
    expect(clampImageView({ k: 1, tx: -900, ty: 0 }, 800, 400, 400, 400)).toEqual({ k: 1, tx: -400, ty: 0 })
    expect(clampImageView({ k: 1, tx: -120, ty: 0 }, 800, 400, 400, 400).tx).toBe(-120)
    expect(clampImageView({ k: 0.25, tx: -50, ty: -50 }, 800, 400, 400, 400)).toEqual({ k: 0.25, tx: 100, ty: 150 })
  })

  it('zoomImageTo：以指定點為中心，限制倍數', () => {
    const v = { k: 1, tx: 0, ty: 0 }
    const z = zoomImageTo(v, 2, 100, 50, 1, 4)
    expect(z).toEqual({ k: 2, tx: -100, ty: -50 })
    // (100, 50) 對到的影像座標不變
    expect((100 - z.tx) / z.k).toBe(100)
    expect(zoomImageTo(v, 10, 0, 0, 1, 4).k).toBe(4)
    expect(zoomImageTo(v, 0.1, 0, 0, 1, 4).k).toBe(1)
  })

  it('viewOf / zoomOf：互為反函式；畫面大小改變時看的仍是同一點', () => {
    expect(viewOf(null, 800, 600, 400, 300)).toEqual(fitImage(800, 600, 400, 300))
    const v = viewOf({ rel: 2, cx: 300, cy: 200 }, 800, 600, 400, 300)
    expect(v.k).toBe(1)
    expect(v.tx).toBe(-100)
    expect(v.ty).toBe(-50)
    expect(zoomOf(v, 800, 600, 400, 300)).toEqual({ rel: 2, cx: 300, cy: 200 })
    // 換成一半寬（並排）：相對倍數相同、中心仍是 (300, 200)
    const half = viewOf({ rel: 2, cx: 300, cy: 200 }, 800, 600, 200, 300)
    const z = zoomOf(half, 800, 600, 200, 300)
    expect(z.rel).toBeCloseTo(2)
    expect(z.cx).toBeCloseTo(300)
    // 中心太靠邊時被限制
    const edge = viewOf({ rel: 2, cx: 0, cy: 0 }, 800, 600, 400, 300)
    expect(edge.tx).toBe(0)
    expect(edge.ty).toBe(0)
  })

  it('clampPercent / percentAt', () => {
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(120)).toBe(100)
    expect(clampPercent(Number.NaN)).toBe(50)
    expect(percentAt(50, 200)).toBe(25)
    expect(percentAt(300, 200)).toBe(100)
    expect(percentAt(10, 0)).toBe(100)
  })
})
