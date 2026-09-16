import { describe, expect, it } from 'vitest'
import {
  computeBounds,
  fitToViewport,
  segmentsToPath,
} from '@/components/library/viewer/gerber/gerberGeometry'
import { parseGerber } from '@/components/library/viewer/gerber/parseGerber'
import { parseExcellon } from '@/components/library/viewer/gerber/parseExcellon'
import type { ImageTree, PathSegment } from '@tracespace/plotter'

const line = (from: [number, number], to: [number, number]): PathSegment => ({
  type: 'line',
  start: from,
  end: to,
})

describe('segmentsToPath', () => {
  it('沒有線段時回傳空字串', () => {
    expect(segmentsToPath([])).toBe('')
    expect(segmentsToPath(null)).toBe('')
    expect(segmentsToPath(undefined)).toBe('')
  })

  it('直線串成 M...L...', () => {
    expect(segmentsToPath([line([0, 0], [1, 1]), line([1, 1], [2, 0])])).toBe('M0,0L1,1L2,0')
  })

  it('弧轉成 A 指令，半圈以內是小弧', () => {
    const d = segmentsToPath([
      { type: 'arc', start: [1, 0, 0], end: [0, 1, Math.PI / 2], center: [0, 0], radius: 1 },
    ])
    // largeArc=0（角度差 < π）、sweep=1（終點角度較大）
    expect(d).toBe('M1,0A1,1 0 0 1 0,1')
  })

  it('超過半圈是大弧', () => {
    const d = segmentsToPath([
      { type: 'arc', start: [1, 0, 0], end: [0, -1, Math.PI * 1.5], center: [0, 0], radius: 1 },
    ])
    expect(d).toContain('A1,1 0 1 1')
  })

  it('反向掃掠時 sweep 為 0', () => {
    const d = segmentsToPath([
      { type: 'arc', start: [0, 1, Math.PI / 2], end: [1, 0, 0], center: [0, 0], radius: 1 },
    ])
    expect(d).toBe('M0,1A1,1 0 0 0 1,0')
  })
})

describe('computeBounds', () => {
  it('沒有任何圖層時回傳 null', () => {
    expect(computeBounds([])).toBeNull()
  })

  it('圖層沒有資料時回傳 null（而不是 Infinity）', () => {
    expect(computeBounds([{ imageTree: null, parsed: null }])).toBeNull()
  })

  it('tracespace 圖層直接採用它算好的 size', () => {
    const imageTree = { size: [1, 2, 10, 20] } as ImageTree
    expect(computeBounds([{ imageTree }])).toEqual({ x1: 1, y1: 2, x2: 10, y2: 20 })
  })

  it('tracespace 的 size 為空陣列時視為沒有內容', () => {
    const imageTree = { size: [] } as unknown as ImageTree
    expect(computeBounds([{ imageTree }])).toBeNull()
  })

  it('多個圖層取聯集', () => {
    const a = { size: [0, 0, 5, 5] } as ImageTree
    const b = { size: [-3, 2, 4, 9] } as ImageTree
    expect(computeBounds([{ imageTree: a }, { imageTree: b }])).toEqual({
      x1: -3,
      y1: 0,
      x2: 5,
      y2: 9,
    })
  })

  it('Gerber flash 與 draw 的座標都算進去，含 draw 的起點', () => {
    const parsed = parseGerber(
      [
        '%FSLAX36Y36*%',
        '%MOMM*%',
        '%ADD10C,0.1*%',
        'D10*',
        'X1000000Y1000000D02*',
        'X5000000Y3000000D01*',
        'M02*',
      ].join('\n')
    )
    // draw 的起點 (1,1) 與終點 (5,3) 都要在範圍內
    expect(computeBounds([{ parsed }])).toEqual({ x1: 1, y1: 1, x2: 5, y2: 3 })
  })

  it('預設不把 D02 移動軌跡算進邊界', () => {
    // 第一個 D02 從原點跳到 (1,1)：軌跡沒畫出來，邊界就不該被拉到含原點
    const parsed = parseGerber(
      [
        '%FSLAX36Y36*%',
        '%MOMM*%',
        '%ADD10C,0.1*%',
        'D10*',
        'X1000000Y1000000D02*',
        'X5000000Y3000000D01*',
        'M02*',
      ].join('\n')
    )
    expect(computeBounds([{ parsed }])?.x1).toBe(1)
    // 打開軌跡顯示後，跳刀的起點（原點）才納入
    expect(computeBounds([{ parsed }], { includeMovePaths: true })).toEqual({
      x1: 0,
      y1: 0,
      x2: 5,
      y2: 3,
    })
  })

  it('region 的每個頂點都算進邊界', () => {
    const parsed = parseGerber(
      [
        '%FSLAX36Y36*%',
        '%MOMM*%',
        'G36*',
        'X0Y0D02*',
        'X4000000Y0D01*',
        'X4000000Y7000000D01*',
        'G37*',
        'M02*',
      ].join('\n')
    )
    expect(computeBounds([{ parsed }])).toEqual({ x1: 0, y1: 0, x2: 4, y2: 7 })
  })

  it('Excellon 鑽孔以孔徑外緣為界', () => {
    const parsed = parseExcellon(
      ['M48', 'METRIC', 'T01C1.0', '%', 'T01', 'X10Y10', 'M30'].join('\n')
    )
    // 直徑 1 → 半徑 0.5
    expect(computeBounds([{ parsed }])).toEqual({ x1: 9.5, y1: 9.5, x2: 10.5, y2: 10.5 })
  })

  it('Excellon 槽孔以兩端外緣為界', () => {
    const parsed = parseExcellon(
      ['M48', 'METRIC', 'T01C1.0', '%', 'T01', 'X10Y5G85X20Y5', 'M30'].join('\n')
    )
    expect(computeBounds([{ parsed }])).toEqual({ x1: 9.5, y1: 4.5, x2: 20.5, y2: 5.5 })
  })

  it('沒有鑽頭定義時用預設孔徑 0.3', () => {
    const parsed = parseExcellon(['M48', 'METRIC', '%', 'X10Y10', 'M30'].join('\n'))
    expect(computeBounds([{ parsed }])).toEqual({ x1: 9.85, y1: 9.85, x2: 10.15, y2: 10.15 })
  })

  it('tracespace 圖層優先於手動解析結果', () => {
    const imageTree = { size: [0, 0, 1, 1] } as ImageTree
    const parsed = parseExcellon(
      ['M48', 'METRIC', 'T01C1.0', '%', 'T01', 'X100Y100', 'M30'].join('\n')
    )
    expect(computeBounds([{ imageTree, parsed }])).toEqual({ x1: 0, y1: 0, x2: 1, y2: 1 })
  })
})

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
    // 寬向可放大 16 倍、高向只能 6 倍 → 取 6
    const fit = fitToViewport(bounds, 200, 100, 20)
    expect(fit.scale).toBe(6)
  })

  it('置中：剩餘空間左右均分', () => {
    const fit = fitToViewport(bounds, 200, 100, 20)
    // 高向剛好塞滿（100 - 60）/2 = 20
    expect(fit.offsetY).toBe(20)
    expect(fit.offsetX).toBe((200 - 10 * 6) / 2)
  })

  it('transform 含 Y 軸翻轉（scale 的 y 為負）', () => {
    const fit = fitToViewport(bounds, 200, 200, 20)
    expect(fit.transform).toContain('scale(16,-16)')
    // 先平移到底部，翻轉後內容才落在畫面內
    expect(fit.transform).toContain(`translate(20,${20 + 160})`)
  })

  it('單點圖層（寬高為 0）不會算出 Infinity', () => {
    const fit = fitToViewport({ x1: 5, y1: 5, x2: 5, y2: 5 }, 200, 200, 20)
    expect(fit.geoWidth).toBe(1)
    expect(fit.geoHeight).toBe(1)
    expect(Number.isFinite(fit.scale)).toBe(true)
  })
})
