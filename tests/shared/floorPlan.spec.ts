import { describe, expect, it } from 'vitest'
import { centerOn, clampPan, fitTransform, isVisible, toScreen, zoomAt } from '@/components/library/shared/floorPlan'

describe('floorPlan', () => {
  it('fitTransform：整張放進畫面並置中（四周留白）', () => {
    expect(fitTransform(100, 50, 232, 232, 16)).toEqual({ k: 2, tx: 16, ty: 66 })
    expect(fitTransform(0, 0, 100, 100).k).toBeGreaterThan(0)
    expect(fitTransform(10, 10, 0, 0).k).toBeGreaterThan(0)
  })

  it('zoomAt：以 (cx, cy) 為中心縮放（該點在平面上的位置不變）；限制倍率', () => {
    const t = { k: 2, tx: 10, ty: 20 }
    const z = zoomAt(t, 2, 110, 120, 0.5, 10)
    expect(z.k).toBe(4)
    // 縮放前後 (110, 120) 對應同一個平面座標 (50, 50)
    expect(toScreen(z, 50, 50)).toEqual({ x: 110, y: 120 })
    expect(zoomAt(t, 100, 0, 0, 0.5, 10).k).toBe(10)
    expect(zoomAt(t, 0.01, 0, 0, 0.5, 10).k).toBe(0.5)
  })

  it('clampPan：至少留 margin 在畫面裡', () => {
    expect(clampPan({ k: 1, tx: -1000, ty: 5000 }, 100, 100, 400, 300, 48)).toEqual({ k: 1, tx: -52, ty: 252 })
    expect(clampPan({ k: 1, tx: 10, ty: 10 }, 100, 100, 400, 300)).toEqual({ k: 1, tx: 10, ty: 10 })
  })

  it('centerOn / isVisible：預設大小 4 × 3', () => {
    const t = { k: 10, tx: 0, ty: 0 }
    const item = { id: 'a', name: 'A', status: 'run' as const, x: 100, y: 100 }
    expect(isVisible(t, item, 400, 300)).toBe(false)
    const c = centerOn(t, item, 400, 300)
    expect(c).toEqual({ k: 10, tx: 200 - 1020, ty: 150 - 1015 })
    expect(isVisible(c, item, 400, 300)).toBe(true)
    expect(isVisible(t, { ...item, x: 1, y: 1, w: 2, h: 2 }, 400, 300)).toBe(true)
  })
})
