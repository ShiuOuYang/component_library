import { describe, expect, it } from 'vitest'
import {
  adjustFormulaForChange,
  adjustIndex,
  hasRefError,
  mapRefs,
  shiftFormula,
  stripAbsolute,
} from '@/components/library/excel/formula/refRewrite'

/**
 * 每一個 expect 的期望值都是「在真的 Excel 裡做同樣操作會得到的公式」。
 */

describe('mapRefs：只認參照，不誤傷其他東西', () => {
  const collect = (f: string) => {
    const found: string[] = []
    mapRefs(f, (ref) => {
      found.push(`${ref.start.c},${ref.start.r}${ref.end ? `:${ref.end.c},${ref.end.r}` : ''}`)
      return null
    })
    return found
  }

  it('找得到單格、範圍、絕對與混合參照', () => {
    expect(collect('A1+$B$2+C$3+$D4+SUM(E1:F2)')).toEqual(['1,1', '2,2', '3,3', '4,4', '5,1:6,2'])
  })

  it('字串常值裡的 A1 不是參照', () => {
    expect(collect('"A1 是字"&B2')).toEqual(['2,2'])
    expect(collect('"含 ""A1"" 的字串"&C3')).toEqual(['3,3'])
  })

  it('LOG10( / ATAN2( 是函式名，不是參照', () => {
    expect(collect('LOG10(A1)+ATAN2(B1,C1)')).toEqual(['1,1', '2,1', '3,1'])
  })

  it('1E5 這種科學記號不會被當成 E5', () => {
    expect(collect('1E5+A1')).toEqual(['1,1'])
  })

  it('沒有改寫時原樣保留（大小寫、空白都不動）', () => {
    const f = 'sum( a1 : b2 ) + "x"'
    expect(mapRefs(f, () => null)).toBe(f)
  })
})

describe('shiftFormula：複製貼上 / 填充', () => {
  it('相對參照跟著位移', () => {
    expect(shiftFormula('A1*2', 1, 0)).toBe('A2*2')
    expect(shiftFormula('A1+B1', 0, 1)).toBe('B1+C1')
  })

  it('$A$1 完全不動', () => {
    expect(shiftFormula('$A$1*B1', 3, 2)).toBe('$A$1*D4')
  })

  it('混合參照只固定有 $ 的那一邊', () => {
    expect(shiftFormula('$A1', 2, 2)).toBe('$A3')
    expect(shiftFormula('A$1', 2, 2)).toBe('C$1')
  })

  it('範圍的兩端都位移', () => {
    expect(shiftFormula('SUM(A1:A3)', 0, 1)).toBe('SUM(B1:B3)')
    expect(shiftFormula('SUM($A$1:A3)', 1, 0)).toBe('SUM($A$1:A4)')
  })

  it('移出工作表邊界變成 #REF!', () => {
    expect(shiftFormula('A1', -1, 0)).toBe('#REF!')
    expect(shiftFormula('A1+B2', 0, -1)).toBe('#REF!+A2')
  })

  it('位移量為 0 時原樣回傳', () => {
    expect(shiftFormula('a1+B2', 0, 0)).toBe('a1+B2')
  })
})

describe('adjustIndex', () => {
  it('插入：插入點（含）之後往後推', () => {
    expect(adjustIndex(2, { axis: 'row', at: 3, count: 2 })).toBe(2)
    expect(adjustIndex(3, { axis: 'row', at: 3, count: 2 })).toBe(5)
  })

  it('刪除：被刪的回 null，之後的往前拉', () => {
    const del = { axis: 'row' as const, at: 3, count: -2 }
    expect(adjustIndex(2, del)).toBe(2)
    expect(adjustIndex(3, del)).toBeNull()
    expect(adjustIndex(4, del)).toBeNull()
    expect(adjustIndex(5, del)).toBe(3)
  })
})

describe('adjustFormulaForChange：插入列欄', () => {
  /**
   * ⚠️ 這就是在真實瀏覽器重現的那個 bug：
   *    A3 放 =A1+A2（顯示 30），在第 1 列上方插入一列，
   *    公式搬到 A4 卻還是 =A1+A2，結果默默變成 10。
   */
  it('在參照上方插入列，參照跟著往下', () => {
    expect(adjustFormulaForChange('A1+A2', { axis: 'row', at: 1, count: 1 })).toBe('A2+A3')
  })

  it('插入點之前的參照不動', () => {
    expect(adjustFormulaForChange('A1+A5', { axis: 'row', at: 3, count: 1 })).toBe('A1+A6')
  })

  it('絕對參照也要跟著動（它指的是「那一格」）', () => {
    expect(adjustFormulaForChange('$A$5', { axis: 'row', at: 2, count: 1 })).toBe('$A$6')
  })

  it('插入在範圍中間，範圍撐大', () => {
    expect(adjustFormulaForChange('SUM(A1:A10)', { axis: 'row', at: 5, count: 1 })).toBe('SUM(A1:A11)')
  })

  it('插入欄只影響欄座標', () => {
    expect(adjustFormulaForChange('A1+C1+C5', { axis: 'col', at: 2, count: 1 })).toBe('A1+D1+D5')
  })

  it('別張工作表的參照不受影響', () => {
    expect(adjustFormulaForChange('Sheet2!A5+A5', { axis: 'row', at: 1, count: 1 })).toBe('Sheet2!A5+A6')
  })
})

describe('adjustFormulaForChange：刪除列欄', () => {
  it('指向被刪除列的參照變成 #REF!', () => {
    expect(adjustFormulaForChange('A3*2', { axis: 'row', at: 3, count: -1 })).toBe('#REF!*2')
  })

  it('被刪除列之後的參照往前拉', () => {
    expect(adjustFormulaForChange('A5', { axis: 'row', at: 3, count: -1 })).toBe('A4')
  })

  it('刪掉範圍的一部分，範圍收縮', () => {
    expect(adjustFormulaForChange('SUM(A1:A10)', { axis: 'row', at: 3, count: -1 })).toBe('SUM(A1:A9)')
  })

  it('刪掉範圍的起點，起點變成刪除位置', () => {
    expect(adjustFormulaForChange('SUM(A3:A10)', { axis: 'row', at: 2, count: -2 })).toBe('SUM(A2:A8)')
  })

  it('整個範圍被刪掉變成 #REF!', () => {
    expect(adjustFormulaForChange('SUM(A3:A4)', { axis: 'row', at: 2, count: -5 })).toBe('SUM(#REF!)')
  })
})

describe('stripAbsolute / hasRefError', () => {
  it('去掉參照中的 $，但不動字串常值', () => {
    expect(stripAbsolute('$A$1+B$2&"$5"')).toBe('A1+B2&"$5"')
  })

  it('偵測字串常值以外的 #REF!', () => {
    expect(hasRefError('#REF!+A1')).toBe(true)
    expect(hasRefError('"#REF!"&A1')).toBe(false)
  })
})
