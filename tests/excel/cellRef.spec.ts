import { describe, expect, it } from 'vitest'
import {
  cellRef,
  colName,
  isCellRef,
  isRangeRef,
  parseRef,
  resolveRange,
} from '@/components/library/excel/formula/cellRef'

describe('colName', () => {
  it('前 26 欄是 A–Z', () => {
    expect(colName(1)).toBe('A')
    expect(colName(26)).toBe('Z')
  })

  it('第 27 欄進位成 AA', () => {
    expect(colName(27)).toBe('AA')
    expect(colName(28)).toBe('AB')
    expect(colName(52)).toBe('AZ')
    expect(colName(53)).toBe('BA')
  })

  it('三位數欄名', () => {
    expect(colName(703)).toBe('AAA')
  })

  it('0 或負數回傳空字串', () => {
    expect(colName(0)).toBe('')
  })
})

describe('cellRef', () => {
  it('組出 A1 形式的鍵', () => {
    expect(cellRef(1, 1)).toBe('A1')
    expect(cellRef(10, 27)).toBe('AA10')
  })
})

describe('parseRef', () => {
  it('A1 解析成列 1 欄 1', () => {
    expect(parseRef('A1')).toEqual({ r: 1, c: 1 })
  })

  it('AA10 的欄要正確進位', () => {
    expect(parseRef('AA10')).toEqual({ r: 10, c: 27 })
  })

  it('小寫也接受', () => {
    expect(parseRef('b3')).toEqual({ r: 3, c: 2 })
  })

  it('與 cellRef 互為反函式', () => {
    for (const [r, c] of [[1, 1], [5, 26], [12, 27], [99, 703]]) {
      expect(parseRef(cellRef(r, c))).toEqual({ r, c })
    }
  })

  it('格式不合法時回傳左上角', () => {
    expect(parseRef('not-a-ref')).toEqual({ r: 1, c: 1 })
    expect(parseRef('')).toEqual({ r: 1, c: 1 })
  })
})

describe('isCellRef / isRangeRef', () => {
  it('分辨合法的單格參照', () => {
    expect(isCellRef('A1')).toBe(true)
    expect(isCellRef('AA100')).toBe(true)
    expect(isCellRef('A')).toBe(false)
    expect(isCellRef('1')).toBe(false)
    expect(isCellRef('A1:B2')).toBe(false)
  })

  it('分辨合法的範圍', () => {
    expect(isRangeRef('A1:B3')).toBe(true)
    expect(isRangeRef('A1')).toBe(true)
    expect(isRangeRef('A1:')).toBe(false)
    expect(isRangeRef('A1:B2:C3')).toBe(false)
    // 這是原本會被硬解成 A1 的破碎字串
    expect(isRangeRef('A3)+SUM(B1')).toBe(false)
  })
})

describe('resolveRange', () => {
  it('單格回傳一個座標', () => {
    expect(resolveRange('B2')).toEqual([{ r: 2, c: 2 }])
  })

  it('矩形範圍展開成所有座標', () => {
    expect(resolveRange('A1:B2')).toEqual([
      { r: 1, c: 1 },
      { r: 1, c: 2 },
      { r: 2, c: 1 },
      { r: 2, c: 2 },
    ])
  })

  it('端點順序顛倒也能展開', () => {
    expect(resolveRange('B2:A1')).toEqual(resolveRange('A1:B2'))
  })

  it('單列與單欄範圍', () => {
    expect(resolveRange('A1:C1')).toHaveLength(3)
    expect(resolveRange('A1:A3')).toHaveLength(3)
  })

  /**
   * 這是原本的缺陷：破碎的字串會被 parseRef 硬解成 A1，
   * 於是公式靜默算出錯誤的結果而不是顯示原式。
   */
  it('格式不合法時回傳空陣列，而不是硬解成 A1', () => {
    expect(resolveRange('A3)+SUM(B1')).toEqual([])
    expect(resolveRange('garbage')).toEqual([])
    expect(resolveRange('')).toEqual([])
  })
})
