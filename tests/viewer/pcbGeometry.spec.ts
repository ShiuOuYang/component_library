import { describe, expect, it } from 'vitest'
import {
  collectElements,
  computeBounds,
  pathToD,
} from '@/components/library/viewer/pcb/pcbGeometry'
import type { PcbData } from '@/components/library/viewer/pcb/pcb.types'

describe('pathToD', () => {
  it('沒有點時回傳空字串', () => {
    expect(pathToD([], false)).toBe('')
    expect(pathToD(null, false)).toBe('')
    expect(pathToD(undefined, true)).toBe('')
  })

  it('串成 M...L...', () => {
    expect(pathToD([{ x: 0, y: 0 }, { x: 1, y: 2 }], false)).toBe('M0,0L1,2')
  })

  it('closed 為 true 時補上 Z', () => {
    expect(pathToD([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], true)).toBe(
      'M0,0L1,0L1,1Z'
    )
  })

  it('只有一個點時不會多出 L', () => {
    expect(pathToD([{ x: 3, y: 4 }], false)).toBe('M3,4')
  })
})

describe('collectElements', () => {
  it('有 layers 時把各層攤平', () => {
    const data: PcbData = {
      layers: [
        { name: 'top', elements: [{ type: 'via', x: 0, y: 0 }] },
        { name: 'bottom', elements: [{ type: 'via', x: 1, y: 1 }, { type: 'via', x: 2, y: 2 }] },
      ],
    }
    expect(collectElements(data)).toHaveLength(3)
  })

  it('沒有 layers 時用頂層 elements', () => {
    expect(collectElements({ elements: [{ type: 'via', x: 0, y: 0 }] })).toHaveLength(1)
  })

  it('layers 存在但為空陣列時退回 elements', () => {
    const data: PcbData = { layers: [], elements: [{ type: 'via', x: 0, y: 0 }] }
    expect(collectElements(data)).toHaveLength(1)
  })

  it('沒有資料時回傳空陣列', () => {
    expect(collectElements(null)).toEqual([])
    expect(collectElements({})).toEqual([])
  })

  it('圖層沒有 elements 欄位時不拋錯', () => {
    expect(collectElements({ layers: [{ name: 'empty' }] })).toEqual([])
  })
})

describe('computeBounds', () => {
  it('有 board 尺寸時直接採用', () => {
    const data: PcbData = {
      board: { width: 100, height: 50 },
      // 元素超出板框也不影響（board 才是板子的實際輪廓）
      elements: [{ type: 'via', x: 999, y: 999 }],
    }
    expect(computeBounds(data)).toEqual({ x1: 0, y1: 0, x2: 100, y2: 50 })
  })

  it('board 只給一邊時不算，改掃元素', () => {
    const data: PcbData = {
      board: { width: 100 },
      elements: [{ type: 'trace', x1: 1, y1: 2, x2: 3, y2: 4 }],
    }
    expect(computeBounds(data)).toEqual({ x1: 1, y1: 2, x2: 3, y2: 4 })
  })

  it('沒有元素時回傳 null（而不是 Infinity）', () => {
    expect(computeBounds(null)).toBeNull()
    expect(computeBounds({})).toBeNull()
    expect(computeBounds({ elements: [] })).toBeNull()
  })

  it('板框與銅箔區域掃過所有頂點', () => {
    const data: PcbData = {
      elements: [
        { type: 'outline', path: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }] },
        { type: 'region', path: [{ x: -2, y: 3 }] },
      ],
    }
    expect(computeBounds(data)).toEqual({ x1: -2, y1: 0, x2: 10, y2: 8 })
  })

  it('走線取兩端點', () => {
    const data: PcbData = { elements: [{ type: 'trace', x1: 5, y1: 1, x2: 2, y2: 9 }] }
    expect(computeBounds(data)).toEqual({ x1: 2, y1: 1, x2: 5, y2: 9 })
  })

  it('焊盤以外緣為界，沒給尺寸時用預設值', () => {
    // 預設焊盤 0.6 → 半徑 0.3
    expect(computeBounds({ elements: [{ type: 'pad', x: 10, y: 10 }] })).toEqual({
      x1: 9.7,
      y1: 9.7,
      x2: 10.3,
      y2: 10.3,
    })
    // 可以覆寫預設值
    expect(
      computeBounds({ elements: [{ type: 'pad', x: 10, y: 10 }] }, { defaultPadSize: 2 })
    ).toEqual({ x1: 9, y1: 9, x2: 11, y2: 11 })
  })

  it('過孔以外徑為界', () => {
    expect(computeBounds({ elements: [{ type: 'via', x: 5, y: 5, outerDia: 2 }] })).toEqual({
      x1: 4,
      y1: 4,
      x2: 6,
      y2: 6,
    })
  })

  it('元件以外框為界（而非當成點）', () => {
    const data: PcbData = {
      elements: [{ type: 'component', x: 10, y: 10, width: 4, height: 2 }],
    }
    expect(computeBounds(data)).toEqual({ x1: 8, y1: 9, x2: 12, y2: 11 })
  })

  it('絲印線條看路徑，絲印文字看座標', () => {
    expect(
      computeBounds({ elements: [{ type: 'silk', path: [{ x: 1, y: 1 }, { x: 7, y: 3 }] }] })
    ).toEqual({ x1: 1, y1: 1, x2: 7, y2: 3 })

    expect(
      computeBounds({ elements: [{ type: 'silk', text: 'U1', x: 4, y: 6 }] })
    ).toEqual({ x1: 4, y1: 6, x2: 4, y2: 6 })
  })

  it('多種元素取聯集', () => {
    const data: PcbData = {
      elements: [
        { type: 'trace', x1: 0, y1: 0, x2: 5, y2: 0 },
        { type: 'via', x: 20, y: 10, outerDia: 2 },
        { type: 'component', x: -5, y: -5, width: 2, height: 2 },
      ],
    }
    expect(computeBounds(data)).toEqual({ x1: -6, y1: -6, x2: 21, y2: 11 })
  })

  it('有 layers 時也掃得到各層元素', () => {
    const data: PcbData = {
      layers: [
        { name: 'a', elements: [{ type: 'trace', x1: 0, y1: 0, x2: 1, y2: 1 }] },
        { name: 'b', elements: [{ type: 'trace', x1: 8, y1: 9, x2: 9, y2: 9 }] },
      ],
    }
    expect(computeBounds(data)).toEqual({ x1: 0, y1: 0, x2: 9, y2: 9 })
  })

  it('沒有路徑的板框不會讓邊界變成 Infinity', () => {
    expect(computeBounds({ elements: [{ type: 'outline', path: [] }] })).toBeNull()
  })
})
