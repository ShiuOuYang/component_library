import { describe, expect, it } from 'vitest'
import { fitToViewport } from '@/components/library/viewer/shared/viewportFit'

// GerberViewer 與 PcbLayout 共用這段算式
describe('fitToViewport', () => {
  const bounds = { x1: 0, y1: 0, x2: 10, y2: 10 }

  it('等比縮放到扣掉邊距後的畫布', () => {
    // 200x200 畫布、邊距 20 → 可用 160，幾何 10 → scale 16
    const fit = fitToViewport(bounds, 200, 200, 20)
    expect(fit.scale).toBe(16)
    expect(fit.geoWidth).toBe(10)
    expect(fit.geoHeight).toBe(10)
  })

  it('取較小的軸當縮放比，避免超出畫布', () => {
    const fit = fitToViewport(bounds, 200, 100, 20)
    expect(fit.scale).toBe(6)
  })

  it('置中：剩餘空間均分', () => {
    const fit = fitToViewport(bounds, 200, 100, 20)
    expect(fit.offsetX).toBe((200 - 10 * 6) / 2)
    expect(fit.offsetY).toBe(20)
  })

  it('transform 含 Y 軸翻轉（scale 的 y 為負）', () => {
    const fit = fitToViewport(bounds, 200, 200, 20)
    expect(fit.transform).toContain('scale(16,-16)')
    expect(fit.transform).toContain(`translate(20,${20 + 160})`)
  })

  it('把原點平移到 bounds 的左下角', () => {
    const fit = fitToViewport({ x1: 5, y1: 3, x2: 15, y2: 13 }, 200, 200, 20)
    expect(fit.transform).toContain('translate(-5,-3)')
  })

  it('單點（寬高為 0）不會算出 Infinity', () => {
    const fit = fitToViewport({ x1: 5, y1: 5, x2: 5, y2: 5 }, 200, 200, 20)
    expect(fit.geoWidth).toBe(1)
    expect(fit.geoHeight).toBe(1)
    expect(Number.isFinite(fit.scale)).toBe(true)
  })
})
