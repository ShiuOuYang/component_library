import { describe, expect, it } from 'vitest'
import { asNumber, formatValue, generalAlign, sortCompare } from '@/components/library/excel/values'

describe('asNumber', () => {
  it('數字與數字字串', () => {
    expect(asNumber(42)).toBe(42)
    expect(asNumber('42')).toBe(42)
    expect(asNumber('-3.5')).toBe(-3.5)
    expect(asNumber('1e3')).toBe(1000)
  })

  it('夾雜文字、前後空白、空字串都不是數字', () => {
    expect(asNumber('42 件')).toBeNull()
    expect(asNumber(' 42')).toBeNull()
    expect(asNumber('')).toBeNull()
  })

  it('NaN / Infinity 不算數字', () => {
    expect(asNumber(Number.NaN)).toBeNull()
    expect(asNumber(Infinity)).toBeNull()
  })
})

describe('formatValue', () => {
  /** ⚠️ 原本格式只套在 number 上，手打的 "42" 套 0.00 還是 42 */
  it('手打的數字字串也套用格式', () => {
    expect(formatValue('42', '0.00')).toBe('42.00')
    expect(formatValue(42, '0.00')).toBe('42.00')
  })

  it('各種格式', () => {
    expect(formatValue('1234.5', '#,##0')).toBe('1,235')
    expect(formatValue('1234.5', '#,##0.00')).toBe('1,234.50')
    expect(formatValue('0.256', '0%')).toBe('26%')
    expect(formatValue('0.256', '0.00%')).toBe('25.60%')
    expect(formatValue('2.5', '0.0')).toBe('2.5')
  })

  it('文字不受數字格式影響', () => {
    expect(formatValue('蘋果', '0.00')).toBe('蘋果')
  })

  it('沒有格式時原樣回傳', () => {
    expect(formatValue('42', undefined)).toBe('42')
  })
})

describe('generalAlign（Excel 通用格式）', () => {
  it('數字靠右（包含手打的數字字串）', () => {
    expect(generalAlign(42)).toBe('right')
    expect(generalAlign('42')).toBe('right')
  })

  it('文字靠左', () => {
    expect(generalAlign('蘋果')).toBe('left')
    expect(generalAlign('42 件')).toBe('left')
  })

  it('錯誤值與布林值置中', () => {
    expect(generalAlign('#REF!')).toBe('center')
    expect(generalAlign('#DIV/0!')).toBe('center')
    expect(generalAlign('TRUE')).toBe('center')
  })
})


describe('sortCompare（Excel 排序規則）', () => {
  const sort = (vals: (string | number)[], dir: 'asc' | 'desc' = 'asc') =>
    [...vals].sort((a, b) => sortCompare(a, b, dir))

  /** ⚠️ 原本 Number('') 是 0，空白被排在負數與正數之間 */
  it('空白永遠排最後（升冪）', () => {
    expect(sort([3, '', -1, '2'])).toEqual([-1, '2', 3, ''])
  })

  it('空白永遠排最後（降冪也一樣）', () => {
    expect(sort([3, '', -1, '2'], 'desc')).toEqual([3, '2', -1, ''])
  })

  it('型別順序：數字 < 文字 < 布林 < 錯誤值', () => {
    expect(sort(['#N/A', 'TRUE', 'apple', 5, 'FALSE'])).toEqual([5, 'apple', 'FALSE', 'TRUE', '#N/A'])
  })

  it('降冪時型別順序整個反過來', () => {
    expect(sort(['apple', 5, '#N/A'], 'desc')).toEqual(['#N/A', 'apple', 5])
  })

  it('文字不分大小寫', () => {
    expect(sort(['banana', 'Apple', 'cherry'])).toEqual(['Apple', 'banana', 'cherry'])
  })

  it('數字字串以數值比較（10 排在 9 後面，不是字典序）', () => {
    expect(sort(['10', '9', '100'])).toEqual(['9', '10', '100'])
  })
})
