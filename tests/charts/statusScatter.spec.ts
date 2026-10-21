import { describe, expect, it } from 'vitest'
import {
  equalAspectRect,
  extentWithPadding,
  groupByStatus,
  makeDotStamp,
  nearestInDrawOrder,
  stampDots,
  ticksWithEnds,
} from '@/components/library/charts/utils/statusScatter'

describe('extentWithPadding', () => {
  it('[min, max] 兩端各外推 padRatio × 寬度，略過無效值', () => {
    expect(extentWithPadding([0, NaN, 100, Infinity], 0.1)).toEqual([-10, 110])
  })

  it('沒有有效值時回傳 [0, 1]', () => {
    expect(extentWithPadding([])).toEqual([0, 1])
    expect(extentWithPadding([NaN])).toEqual([0, 1])
  })

  it('所有值相同時外推，避免寬度為 0', () => {
    expect(extentWithPadding([50, 50])).toEqual([45, 55])
    expect(extentWithPadding([0, 0])).toEqual([-1, 1])
  })

  it('負的 padRatio 視為 0', () => {
    expect(extentWithPadding([0, 10], -1)).toEqual([0, 10])
  })
})

describe('equalAspectRect（X、Y 每單位像素相同）', () => {
  it('可用空間較寬：高度用滿、左右置中', () => {
    expect(equalAspectRect(400, 200, 100, 100)).toEqual({ left: 100, top: 0, width: 200, height: 200 })
  })

  it('可用空間較高：寬度用滿、上下置中', () => {
    expect(equalAspectRect(200, 400, 200, 100)).toEqual({ left: 0, top: 150, width: 200, height: 100 })
  })

  it('範圍寬度為 0 或負的可用空間時退回整塊區域', () => {
    expect(equalAspectRect(300, 200, 0, 10)).toEqual({ left: 0, top: 0, width: 300, height: 200 })
    expect(equalAspectRect(-5, 200, 10, 10).width).toBe(0)
  })
})

describe('ticksWithEnds（範圍端點一定標出）', () => {
  const toPx = (v: number) => v // 1 單位 = 1px

  it('加上兩端，並拿掉離端點太近的一般刻度', () => {
    const ticks = ticksWithEnds([-15000, -10000, 0, 10000, 15000], [-15718.5, 15643], (v) => v / 100, 20)
    expect(ticks.map((t) => t.value)).toEqual([-15718.5, -10000, 0, 10000, 15643])
    expect(ticks.filter((t) => t.isEnd).map((t) => t.value)).toEqual([-15718.5, 15643])
  })

  it('一般刻度剛好落在端點上時不重複', () => {
    const ticks = ticksWithEnds([0, 50, 100], [0, 100], toPx, 10)
    expect(ticks).toEqual([
      { value: 0, isEnd: true },
      { value: 50, isEnd: false },
      { value: 100, isEnd: true },
    ])
  })

  it('domain 反向也一樣', () => {
    expect(ticksWithEnds([50], [100, 0], toPx, 10).map((t) => t.value)).toEqual([0, 50, 100])
  })

  it('範圍只有一個值時只標一次', () => {
    expect(ticksWithEnds([], [5, 5], toPx, 10)).toEqual([{ value: 5, isEnd: true }])
  })
})

describe('groupByStatus', () => {
  it('依清單順序分組，未知狀態歸到 other', () => {
    const { groups, other } = groupByStatus(['PASS', 'FAIL', 'X', 'PASS', ''], ['PASS', 'NEARFAIL', 'FAIL'])
    expect(groups).toEqual([[0, 3], [], [1]])
    expect(other).toEqual([2, 4])
  })
})

describe('nearestInDrawOrder（依繪製順序的命中測試）', () => {
  it('半徑內最近的點', () => {
    expect(nearestInDrawOrder([0, 10, 30], [0, 0, 0], [[0, 1, 2]], 9, 0, 5)).toBe(1)
    expect(nearestInDrawOrder([0, 10, 30], [0, 0, 0], [[0, 1, 2]], 100, 0, 5)).toBe(-1)
  })

  it('同一位置重疊時取後畫的（例如 FAIL 疊在 PASS 上）', () => {
    expect(nearestInDrawOrder([5, 5], [5, 5], [[0], [1]], 5, 5, 4)).toBe(1)
    expect(nearestInDrawOrder([5, 5], [5, 5], [[1], [0]], 5, 5, 4)).toBe(0)
  })

  it('座標為 NaN（被隱藏）的點不會被選到', () => {
    expect(nearestInDrawOrder([NaN, 20], [NaN, 0], [[0, 1]], 0, 0, 5)).toBe(-1)
  })
})

describe('makeDotStamp', () => {
  it('中心完全覆蓋、角落為 0、邊緣部分覆蓋（反鋸齒）', () => {
    const { half, size, mask } = makeDotStamp(3)
    expect(size).toBe(half * 2 + 1)
    expect(mask[half * size + half]).toBe(1)
    expect(mask[0]).toBe(0)
    const edge = mask[half * size + half + 3] // 距中心 3：覆蓋率 0.5
    expect(edge).toBeCloseTo(0.5)
  })

  it('半徑 0 也至少有中心一格', () => {
    const { half, size, mask } = makeDotStamp(0)
    expect(mask[half * size + half]).toBeCloseTo(0.5)
    expect(makeDotStamp(-3).half).toBe(1)
  })
})

describe('stampDots（直接寫入像素）', () => {
  const W = 20
  const H = 20
  const pixel = (buf: Uint8ClampedArray, x: number, y: number) => Array.from(buf.slice((y * W + x) * 4, (y * W + x) * 4 + 4))
  const green = { r: 0, g: 200, b: 0 }
  const red = { r: 255, g: 0, b: 0 }

  it('在點的位置寫入顏色；遠處維持透明', () => {
    const buf = new Uint8ClampedArray(W * H * 4)
    stampDots(buf, W, H, [0], [10], [10], 1, makeDotStamp(2), green)
    expect(pixel(buf, 10, 10)).toEqual([0, 200, 0, 255])
    expect(pixel(buf, 0, 0)).toEqual([0, 0, 0, 0])
  })

  it('後蓋的顏色在上（FAIL 疊在 PASS 上看得到紅色）', () => {
    const buf = new Uint8ClampedArray(W * H * 4)
    const stamp = makeDotStamp(2)
    stampDots(buf, W, H, [0], [10], [10], 1, stamp, green)
    stampDots(buf, W, H, [0], [10], [10], 1, stamp, red)
    expect(pixel(buf, 10, 10)).toEqual([255, 0, 0, 255])
  })

  it('邊緣半透明：疊在透明底上顏色不變暗', () => {
    const buf = new Uint8ClampedArray(W * H * 4)
    stampDots(buf, W, H, [0], [10], [10], 1, makeDotStamp(2), green)
    const [, g, , a] = pixel(buf, 12, 10) // 距中心 2：覆蓋率 0.5
    expect(g).toBe(200)
    expect(a).toBeGreaterThan(100)
    expect(a).toBeLessThan(160)
  })

  it('opacity 與既有顏色合成（source-over）', () => {
    const buf = new Uint8ClampedArray(W * H * 4)
    const stamp = makeDotStamp(2)
    stampDots(buf, W, H, [0], [10], [10], 1, stamp, green)
    stampDots(buf, W, H, [0], [10], [10], 1, stamp, red, 0.5)
    const [r, g, , a] = pixel(buf, 10, 10)
    expect(r).toBeGreaterThan(120)
    expect(g).toBeGreaterThan(90)
    expect(a).toBe(255)
  })

  it('依 scale 換算裝置像素；畫面外、NaN 的點跳過；跨邊界的點只畫畫面內', () => {
    const buf = new Uint8ClampedArray(W * H * 4)
    const stamp = makeDotStamp(2)
    stampDots(buf, W, H, [0, 1, 2, 3], [5, NaN, 100, 0], [5, 5, 100, 0], 2, stamp, green)
    expect(pixel(buf, 10, 10)).toEqual([0, 200, 0, 255]) // (5, 5) × 2
    expect(pixel(buf, 0, 0)).toEqual([0, 200, 0, 255]) // 左上角的點只畫一部分
    expect(pixel(buf, 19, 19)).toEqual([0, 0, 0, 0])
  })
})
