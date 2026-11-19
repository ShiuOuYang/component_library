import { describe, expect, it } from 'vitest'
import {
  cellAt,
  cellKey,
  centerCell,
  dieRect,
  farthestCorner,
  gridOf,
  layoutWafer,
  notchPath,
  ringYields,
  stepCell,
  summarizeBins,
} from '@/components/library/charts/utils/waferMap'

const grid5 = { minX: 0, maxX: 4, minY: 0, maxY: 4 }

describe('gridOf', () => {
  it('取行列範圍；略過非數字；沒有資料時為 null', () => {
    expect(gridOf([{ x: 2, y: -1 }, { x: -3, y: 5 }, { x: NaN, y: 100 }])).toEqual({ minX: -3, maxX: 2, minY: -1, maxY: 5 })
    expect(gridOf([])).toBeNull()
  })
})

describe('layoutWafer / dieRect / cellAt', () => {
  it('wafer：圓置中、直徑取短邊；格子置中且留一顆的邊', () => {
    const l = layoutWafer({ width: 200, height: 240, grid: grid5, padding: 8 })
    expect(l.cx).toBe(100)
    expect(l.cy).toBe(120)
    expect(l.radius).toBe(92)
    expect(l.pitchX).toBeCloseTo(184 / 6)
    expect(l.originX + (5 * l.pitchX) / 2).toBeCloseTo(100)
    // 最外圈晶粒的外緣在圓內
    const r = dieRect(l, 4, 2)
    expect(r.x + r.width - l.cx).toBeLessThan(l.radius)
  })

  it('panel：矩形貼齊格子，依 dieAspect 決定晶粒形狀', () => {
    const l = layoutWafer({ width: 300, height: 100, grid: { minX: 0, maxX: 9, minY: 0, maxY: 1 }, shape: 'panel', padding: 0, dieAspect: 2 })
    // 10 欄 × 2 列，晶粒寬是高的 2 倍 → 高 = min(100/2, 300/20) = 15
    expect(l.pitchY).toBe(15)
    expect(l.pitchX).toBe(30)
    expect(l.frame).toEqual({ x: 0, y: 35, width: 300, height: 30 })
  })

  it('cellAt 是 dieRect 的反函數；flipY 時第 0 列在最下面；格子外為 null', () => {
    for (const flipY of [false, true]) {
      const l = layoutWafer({ width: 200, height: 200, grid: grid5, flipY })
      const r = dieRect(l, 3, 1)
      expect(cellAt(l, r.x + r.width / 2, r.y + r.height / 2)).toEqual({ x: 3, y: 1 })
    }
    const flipped = layoutWafer({ width: 200, height: 200, grid: grid5, flipY: true })
    expect(dieRect(flipped, 0, 0).y).toBeGreaterThan(dieRect(flipped, 0, 4).y)
    const l = layoutWafer({ width: 200, height: 200, grid: grid5 })
    expect(cellAt(l, 1, 1)).toBeNull()
    expect(cellAt(l, 199, 100)).toBeNull()
    expect(cellAt({ ...l, pitchX: 0 }, 100, 100)).toBeNull()
  })
})

describe('notchPath', () => {
  const l = layoutWafer({ width: 200, height: 200, grid: grid5, padding: 0 })
  it('缺口的尖端朝圓心、兩個角在圓周上', () => {
    const [a, tip, b] = notchPath(l, 'bottom')!
    expect(tip[0]).toBe(100)
    expect(tip[1]).toBeLessThan(200)
    expect(a[1]).toBe(200)
    expect(b[1]).toBe(200)
    expect(notchPath(l, 'left')![1][0]).toBeGreaterThan(0)
    expect(notchPath(l, 'top')![1][1]).toBeGreaterThan(0)
    expect(notchPath(l, 'right')![1][0]).toBeLessThan(200)
  })
  it('none 或面板沒有缺口', () => {
    expect(notchPath(l, 'none')).toBeNull()
    expect(notchPath({ ...l, shape: 'panel' }, 'bottom')).toBeNull()
  })
})

describe('stepCell / centerCell', () => {
  // 十字形：中間一列 + 中間一行
  const cells = new Set(['0,2', '1,2', '2,2', '3,2', '4,2', '2,0', '2,1', '2,3', '2,4', '4,0'])
  const has = (x: number, y: number) => cells.has(cellKey(x, y))

  it('沿方向找下一顆有資料的晶粒，跳過空格；到邊界停在原地', () => {
    expect(stepCell(has, grid5, { x: 2, y: 2 }, 1, 0)).toEqual({ x: 3, y: 2 })
    expect(stepCell(has, grid5, { x: 2, y: 0 }, 1, 0)).toEqual({ x: 4, y: 0 }) // 跳過 (3,0)
    expect(stepCell(has, grid5, { x: 4, y: 2 }, 1, 0)).toEqual({ x: 4, y: 2 })
    expect(stepCell(has, grid5, { x: 2, y: 2 }, 0, 1)).toEqual({ x: 2, y: 3 })
  })

  it('flipY：畫面往下 = 資料 y 變小', () => {
    expect(stepCell(has, grid5, { x: 2, y: 2 }, 0, 1, true)).toEqual({ x: 2, y: 1 })
  })

  it('centerCell 取最靠近中心的晶粒；沒有資料時為 null', () => {
    expect(centerCell([{ x: 0, y: 0 }, { x: 2, y: 3 }, { x: 4, y: 4 }], grid5)).toEqual({ x: 2, y: 3 })
    expect(centerCell([], grid5)).toBeNull()
  })
})

describe('summarizeBins / ringYields', () => {
  it('各 bin 顆數與良率', () => {
    const s = summarizeBins(['1', '1', '3', '1', '7'], (b) => b === '1')
    expect(s).toEqual({ total: 5, pass: 3, yield: 0.6, counts: [{ bin: '1', count: 3 }, { bin: '3', count: 1 }, { bin: '7', count: 1 }] })
    expect(summarizeBins([], () => true).yield).toBeNull()
  })

  it('依到中心的距離分圈：外圈良率低', () => {
    const points: Array<{ x: number; y: number; pass: boolean }> = []
    for (let x = 0; x <= 4; x++) for (let y = 0; y <= 4; y++) points.push({ x, y, pass: Math.hypot(x - 2, y - 2) < 2 })
    const { maxRadius, rings } = ringYields(points, grid5, 2)
    expect(maxRadius).toBeCloseTo(Math.hypot(2, 2))
    expect(rings).toHaveLength(2)
    expect(rings[0].yield).toBe(1)
    expect(rings[1].yield!).toBeLessThan(0.5)
    expect(rings[0].total + rings[1].total).toBe(25)
    expect(rings.map((r) => [r.inner, r.outer])).toEqual([[0, 0.5], [0.5, 1]])
  })

  it('單一顆、空的圈', () => {
    const { rings } = ringYields([{ x: 2, y: 2, pass: true }], grid5, 3)
    expect(rings.map((r) => r.yield)).toEqual([1, null, null])
    expect(ringYields([], grid5, 0).rings).toHaveLength(1)
  })
})

describe('farthestCorner / reach', () => {
  it('最遠的角（晶粒高為單位）；給 reach 時晶粒剛好放進圓內', () => {
    const pts = [{ x: 0, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 0 }, { x: 2, y: 4 }, { x: 2, y: 2 }]
    expect(farthestCorner(pts, grid5)).toBeCloseTo(Math.hypot(2.5, 0.5))
    expect(farthestCorner(pts, grid5, 2)).toBeCloseTo(Math.hypot(5, 0.5))
    const l = layoutWafer({ width: 200, height: 200, grid: grid5, padding: 0, reach: farthestCorner(pts, grid5) })
    for (const p of pts) {
      const r = dieRect(l, p.x, p.y)
      for (const [cx, cy] of [[r.x, r.y], [r.x + r.width, r.y], [r.x, r.y + r.height], [r.x + r.width, r.y + r.height]])
        expect(Math.hypot(cx - l.cx, cy - l.cy)).toBeLessThanOrEqual(l.radius)
    }
    // 只有十字形的晶粒時，比只看行列數的排版大
    expect(l.pitchY).toBeGreaterThan(layoutWafer({ width: 200, height: 200, grid: grid5, padding: 0 }).pitchY)
  })
})
