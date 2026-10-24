import { describe, expect, it } from 'vitest'
import {
  minMaxDownsample,
  nearestPointIndex,
  panContinuousDomain,
  rectIndexAt,
  resolveCanvasColor,
  zoomBandWindow,
  zoomContinuousDomain,
} from '@/components/library/charts/utils/largeData'

describe('minMaxDownsample（依像素欄降採樣）', () => {
  it('同一像素欄只留首、尾、最小、最大四點', () => {
    // 100 個點全落在 x = 0.x 這一欄
    const px = Array.from({ length: 100 }, (_, i) => i / 100)
    const py = Array.from({ length: 100 }, (_, i) => Math.sin(i))
    const keep = minMaxDownsample(px, py)
    expect(keep.length).toBeLessThanOrEqual(4)
    expect(keep[0]).toBe(0)
    expect(keep.at(-1)).toBe(99)
    const ys = keep.map((i) => py[i])
    expect(Math.min(...ys)).toBe(Math.min(...py))
    expect(Math.max(...ys)).toBe(Math.max(...py))
  })

  it('單一尖峰不會被抹掉（產線資料最在意的那一點）', () => {
    const n = 100_000
    const px = Array.from({ length: n }, (_, i) => (i / n) * 700)
    const py = Array.from({ length: n }, () => 200)
    py[54_321] = 5 // 一個尖峰（像素座標越小越高）
    const keep = minMaxDownsample(px, py)
    expect(keep.length).toBeLessThanOrEqual(700 * 4)
    expect(keep).toContain(54_321)
  })

  it('輸出索引遞增', () => {
    const px = Array.from({ length: 5000 }, (_, i) => i / 10)
    const py = Array.from({ length: 5000 }, (_, i) => (i * 7919) % 300)
    const keep = minMaxDownsample(px, py)
    for (let i = 1; i < keep.length; i++) expect(keep[i]).toBeGreaterThan(keep[i - 1])
  })

  it('無效座標保留為斷點（連續的只留一個），線才會斷開', () => {
    const px = [0, 0.5, NaN, NaN, NaN, 3, 3.5]
    const py = [1, 2, 3, 4, 5, 6, 7]
    expect(minMaxDownsample(px, py)).toEqual([0, 1, 2, 5, 6])
  })

  it('沒有按 X 排序的資料不會被合併成錯的線（原樣保留）', () => {
    const px = [0, 5, 0.2, 5.1, 0.4]
    const py = [1, 2, 3, 4, 5]
    expect(minMaxDownsample(px, py)).toEqual([0, 1, 2, 3, 4])
  })

  it('空陣列', () => {
    expect(minMaxDownsample([], [])).toEqual([])
  })
})

describe('命中測試', () => {
  it('nearestPointIndex：半徑內最近的點；範圍外回傳 -1', () => {
    const px = [10, 50, 52]
    const py = [10, 50, 50]
    expect(nearestPointIndex(px, py, 51.5, 50, 8)).toBe(2)
    expect(nearestPointIndex(px, py, 200, 200, 8)).toBe(-1)
  })

  it('nearestPointIndex：NaN 座標的點不會被選到', () => {
    expect(nearestPointIndex([NaN, 5], [NaN, 5], 0, 0, 10)).toBe(1)
  })

  it('rectIndexAt：重疊時取後畫的（上層）', () => {
    const x0 = [0, 5]
    const y0 = [0, 0]
    const x1 = [10, 15]
    const y1 = [10, 10]
    expect(rectIndexAt(x0, y0, x1, y1, 7, 5)).toBe(1)
    expect(rectIndexAt(x0, y0, x1, y1, 2, 5)).toBe(0)
    expect(rectIndexAt(x0, y0, x1, y1, 20, 5)).toBe(-1)
  })
})

describe('zoomContinuousDomain（滾輪縮放）', () => {
  it('游標所在的值在縮放前後位置不變', () => {
    const next = zoomContinuousDomain([0, 100], 75, 0.5)!
    expect(next[1] - next[0]).toBeCloseTo(50)
    // 75 原本在 75% 的位置，縮放後仍在 75%
    expect((75 - next[0]) / (next[1] - next[0])).toBeCloseTo(0.75)
  })

  it('不超出 bounds（推回範圍內並保持寬度）', () => {
    const next = zoomContinuousDomain([0, 100], 99, 0.5, { bounds: [0, 100] })!
    expect(next[1]).toBeLessThanOrEqual(100)
    expect(next[1] - next[0]).toBeCloseTo(50)
  })

  it('縮到比 bounds 寬時回傳 null（回到全覽）', () => {
    expect(zoomContinuousDomain([10, 90], 50, 1.5, { bounds: [0, 100] })).toBeNull()
  })

  it('沒有 bounds 時以 maxSpan 判斷回到全覽（Y 軸）', () => {
    expect(zoomContinuousDomain([20, 60], 40, 2, { maxSpan: 70 })).toBeNull()
    expect(zoomContinuousDomain([20, 60], 40, 1.2, { maxSpan: 70 })).not.toBeNull()
  })

  it('minSpan 限制放大倍率', () => {
    const next = zoomContinuousDomain([0, 100], 50, 0.0001, { minSpan: 1 })!
    expect(next[1] - next[0]).toBeCloseTo(1)
  })

  it('游標值無效時以中心縮放', () => {
    expect(zoomContinuousDomain([0, 100], NaN, 0.5)).toEqual([25, 75])
  })

  it('範圍為 0 或倍率無效時原樣回傳', () => {
    expect(zoomContinuousDomain([5, 5], 5, 0.5)).toEqual([5, 5])
    expect(zoomContinuousDomain([0, 10], 5, NaN)).toEqual([0, 10])
  })
})

describe('panContinuousDomain', () => {
  it('平移並保持在 bounds 內', () => {
    expect(panContinuousDomain([10, 20], 5, [0, 100])).toEqual([15, 25])
    expect(panContinuousDomain([90, 100], 50, [0, 100])).toEqual([90, 100])
    expect(panContinuousDomain([0, 10], -50, [0, 100])).toEqual([0, 10])
  })
})

describe('zoomBandWindow（類別軸縮放）', () => {
  it('以游標位置為中心縮小視窗', () => {
    const next = zoomBandWindow(0, 100, 100, 0.5, 0.5)!
    expect(next.length).toBe(50)
    expect(next.start).toBe(25)
  })

  it('最少保留 minLength 個類別', () => {
    expect(zoomBandWindow(0, 10, 10, 0.5, 0.01, 2)!.length).toBe(2)
  })

  it('倍率接近 1 也至少動一格（四捨五入不會卡住）', () => {
    expect(zoomBandWindow(0, 10, 100, 0.5, 0.99)!.length).toBe(9)
    expect(zoomBandWindow(0, 10, 100, 0.5, 1.01)!.length).toBe(11)
  })

  it('放大到涵蓋全部類別時回傳 null（回到全覽）', () => {
    expect(zoomBandWindow(10, 80, 100, 0.5, 2)).toBeNull()
  })

  it('空清單或空視窗回傳 null', () => {
    expect(zoomBandWindow(0, 0, 0, 0.5, 0.5)).toBeNull()
    expect(zoomBandWindow(0, 0, 10, 0.5, 0.5)).toBeNull()
  })

  it('倍率剛好為 1 時視窗不變', () => {
    expect(zoomBandWindow(10, 20, 100, 0.5, 1)).toEqual({ start: 10, length: 20 })
  })

  it('視窗不超出清單兩端', () => {
    const next = zoomBandWindow(90, 10, 100, 1, 1.5)!
    expect(next.start + next.length).toBeLessThanOrEqual(100)
  })
})

describe('resolveCanvasColor（Canvas 看不懂 CSS 變數）', () => {
  it('一般色碼原樣回傳', () => {
    expect(resolveCanvasColor('#3b82f6', document.body)).toBe('#3b82f6')
  })

  it('沒有宿主元素時原樣回傳', () => {
    expect(resolveCanvasColor('rgb(var(--t-accent))', null)).toBe('rgb(var(--t-accent))')
  })

  it('CSS 變數交給瀏覽器計算，探測元素用完即移除', () => {
    const host = document.createElement('div')
    host.style.setProperty('--t-accent', '37 99 235')
    document.body.appendChild(host)
    const result = resolveCanvasColor('rgb(var(--t-accent))', host)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(host.children).toHaveLength(0)
    host.remove()
  })
})

/**
 * 回歸：類別軸連續滾幾格放大，游標底下的類別被推出畫面
 * （6 個月份、游標指著 Apr，一格一格放大到剩 2 個月時變成 May–Jun）
 */
describe('zoomBandWindow：游標底下的類別留在畫面上', () => {
  it('一格一格放大，游標指的類別一直在視窗裡、而且就在游標底下', () => {
    const t = 0.6 // 游標在繪圖區 60% 處
    let win = { start: 0, length: 6 }
    const under = (w: { start: number; length: number }) => Math.floor(w.start + t * w.length)
    expect(under(win)).toBe(3) // Apr
    for (let i = 0; i < 6; i++) {
      const next = zoomBandWindow(win.start, win.length, 6, t, Math.exp(-120 * 0.002), 2)
      if (!next) break
      win = next
      expect(win.start).toBeLessThanOrEqual(3)
      expect(win.start + win.length - 1).toBeGreaterThanOrEqual(3)
      expect(under(win)).toBe(3)
    }
    expect(win.length).toBe(2)
  })
})
