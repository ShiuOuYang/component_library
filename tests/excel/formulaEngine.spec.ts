import { describe, expect, it } from 'vitest'
import {
  evaluateFormula,
  splitArgs,
  toNumber,
  truthy,
} from '@/components/library/excel/formula/formulaEngine'
import type { FormulaSheet } from '@/components/library/excel/formula/formulaEngine'

/** 用 { A1: 10, B2: '=A1*2' } 這種簡寫組出工作表 */
function sheet(cells: Record<string, string | number>): FormulaSheet {
  const out: FormulaSheet['cells'] = {}
  for (const [key, raw] of Object.entries(cells)) out[key] = { raw }
  return { cells: out }
}

const NUMBERS = sheet({ A1: 1, A2: 2, A3: 3, B1: 10, B2: 20, B3: 30 })

describe('toNumber', () => {
  it('數字原樣回傳', () => {
    expect(toNumber(42)).toBe(42)
    expect(toNumber(0)).toBe(0)
  })

  it('數字字串轉成數字', () => {
    expect(toNumber('3.5')).toBe(3.5)
    expect(toNumber(' 7 ')).toBe(7)
  })

  it('非數字回 NaN', () => {
    expect(toNumber('abc')).toBeNaN()
    expect(toNumber('')).toBeNaN()
    expect(toNumber(null)).toBeNaN()
    expect(toNumber(undefined)).toBeNaN()
  })
})

describe('truthy', () => {
  it('0 為假、其他數字為真', () => {
    expect(truthy(0)).toBe(false)
    expect(truthy(1)).toBe(true)
    expect(truthy(-1)).toBe(true)
  })

  it('FALSE 字串視為假（不分大小寫）', () => {
    expect(truthy('FALSE')).toBe(false)
    expect(truthy('false')).toBe(false)
    expect(truthy('TRUE')).toBe(true)
  })

  it('空字串為假', () => {
    expect(truthy('')).toBe(false)
  })
})

describe('splitArgs', () => {
  it('依頂層逗號分割', () => {
    expect(splitArgs('A1,B2,3')).toEqual(['A1', 'B2', '3'])
  })

  it('括號內的逗號不分割', () => {
    expect(splitArgs('A1>1,SUM(B1,B2),0')).toEqual(['A1>1', 'SUM(B1,B2)', '0'])
  })

  it('單一引數', () => {
    expect(splitArgs('A1:A3')).toEqual(['A1:A3'])
  })

  it('空字串回傳空陣列', () => {
    expect(splitArgs('')).toEqual([])
  })
})

describe('evaluateFormula：彙總函式', () => {
  it('SUM 範圍與多引數', () => {
    expect(evaluateFormula('SUM(A1:A3)', NUMBERS)).toBe(6)
    expect(evaluateFormula('SUM(A1,A2,A3)', NUMBERS)).toBe(6)
    expect(evaluateFormula('SUM(A1:A3,B1)', NUMBERS)).toBe(16)
  })

  it('AVERAGE 與別名 AVG', () => {
    expect(evaluateFormula('AVERAGE(A1:A3)', NUMBERS)).toBe(2)
    expect(evaluateFormula('AVG(A1:A3)', NUMBERS)).toBe(2)
  })

  it('MIN / MAX', () => {
    expect(evaluateFormula('MIN(A1:B3)', NUMBERS)).toBe(1)
    expect(evaluateFormula('MAX(A1:B3)', NUMBERS)).toBe(30)
  })

  it('COUNT 只算得出數字的格', () => {
    const s = sheet({ A1: 1, A2: 'text', A3: 3 })
    expect(evaluateFormula('COUNT(A1:A3)', s)).toBe(2)
  })

  it('函式名稱不分大小寫', () => {
    expect(evaluateFormula('sum(A1:A3)', NUMBERS)).toBe(6)
    expect(evaluateFormula('Sum(A1:A3)', NUMBERS)).toBe(6)
  })

  it('空範圍的彙總結果為 0', () => {
    expect(evaluateFormula('SUM(Z1:Z3)', NUMBERS)).toBe(0)
    expect(evaluateFormula('AVERAGE(Z1:Z3)', NUMBERS)).toBe(0)
    expect(evaluateFormula('MIN(Z1:Z3)', NUMBERS)).toBe(0)
  })

  it('空白儲存格視為 0', () => {
    expect(evaluateFormula('SUM(A1:A3,Z9)', NUMBERS)).toBe(6)
  })
})

describe('evaluateFormula：IF', () => {
  it('依條件取值', () => {
    expect(evaluateFormula('IF(A1>0,100,200)', NUMBERS)).toBe(100)
    expect(evaluateFormula('IF(A1>5,100,200)', NUMBERS)).toBe(200)
  })

  it('分支可以是函式', () => {
    expect(evaluateFormula('IF(A1>0,SUM(A1:A3),0)', NUMBERS)).toBe(6)
  })

  it('條件可以是函式', () => {
    expect(evaluateFormula('IF(SUM(A1:A3)>5,1,0)', NUMBERS)).toBe(1)
  })

  it('引數不足時回傳 null', () => {
    expect(evaluateFormula('IF(A1>0,1)', NUMBERS)).toBeNull()
  })
})

describe('evaluateFormula：參照與運算', () => {
  it('單格參照參與四則運算', () => {
    expect(evaluateFormula('A1+B1', NUMBERS)).toBe(11)
    expect(evaluateFormula('B2/A2', NUMBERS)).toBe(10)
    expect(evaluateFormula('A1+A2*A3', NUMBERS)).toBe(7)
  })

  it('範圍參照在運算式中取總和', () => {
    expect(evaluateFormula('A1:A3+0', NUMBERS)).toBe(6)
  })

  it('參照到公式格時會先算出它的值', () => {
    const s = sheet({ A1: 5, A2: '=A1*2', A3: '=A2+1' })
    expect(evaluateFormula('A3', s)).toBe(11)
    expect(evaluateFormula('SUM(A1:A3)', s)).toBe(26)
  })

  it('比較運算回傳 TRUE / FALSE', () => {
    expect(evaluateFormula('A1<B1', NUMBERS)).toBe('TRUE')
    expect(evaluateFormula('A1>B1', NUMBERS)).toBe('FALSE')
  })

  it('小寫參照也認得', () => {
    expect(evaluateFormula('a1+b1', NUMBERS)).toBe(11)
  })

  it('文字儲存格在運算中視為 0', () => {
    const s = sheet({ A1: 'hello', A2: 5 })
    expect(evaluateFormula('A1+A2', s)).toBe(5)
  })
})

describe('evaluateFormula：多個與巢狀函式', () => {
  /**
   * 這是原本的缺陷：`^(SUM|…)\((.*)\)$` 的貪婪比對會把
   * SUM(A1:A3)+SUM(B1:B3) 整條當成一個 SUM 呼叫，
   * 引數變成 "A1:A3)+SUM(B1:B3"，再被硬解成 A1，靜默算出錯誤答案。
   */
  it('同一條式子裡有兩個函式', () => {
    expect(evaluateFormula('SUM(A1:A3)+SUM(B1:B3)', NUMBERS)).toBe(66)
    expect(evaluateFormula('MAX(A1:A3)*MIN(B1:B3)', NUMBERS)).toBe(30)
  })

  it('函式與參照混用', () => {
    expect(evaluateFormula('SUM(A1:A3)+B1', NUMBERS)).toBe(16)
    expect(evaluateFormula('B1-SUM(A1:A2)', NUMBERS)).toBe(7)
  })

  it('巢狀函式', () => {
    expect(evaluateFormula('SUM(MAX(A1:A3),MIN(A1:A3))', NUMBERS)).toBe(4)
    expect(evaluateFormula('SUM(SUM(A1:A3),SUM(B1:B3))', NUMBERS)).toBe(66)
  })

  it('函式結果參與比較', () => {
    expect(evaluateFormula('SUM(A1:A3)>5', NUMBERS)).toBe('TRUE')
  })
})

describe('evaluateFormula：迴圈參照', () => {
  /**
   * 原本沒有任何保護：兩格互相參照會讓求值無限遞迴，
   * 堆疊爆掉、整個分頁卡死。
   */
  it('兩格互相參照不會無限遞迴', () => {
    const s = sheet({ A1: '=B1', B1: '=A1' })
    expect(() => evaluateFormula('A1', s)).not.toThrow()
    expect(evaluateFormula('A1', s)).not.toBeUndefined()
  })

  it('自我參照不會無限遞迴', () => {
    const s = sheet({ A1: '=A1+1' })
    expect(() => evaluateFormula('A1', s)).not.toThrow()
  })

  it('三格構成的循環不會無限遞迴', () => {
    const s = sheet({ A1: '=B1', B1: '=C1', C1: '=A1' })
    expect(() => evaluateFormula('SUM(A1:C1)', s)).not.toThrow()
  })

  it('長鏈參照（非循環）仍算得出來', () => {
    const cells: Record<string, string | number> = { A1: 1 }
    for (let i = 2; i <= 20; i++) cells[`A${i}`] = `=A${i - 1}+1`
    expect(evaluateFormula('A20', sheet(cells))).toBe(20)
  })
})

describe('evaluateFormula：錯誤與安全', () => {
  it('空公式回傳 null', () => {
    expect(evaluateFormula('', NUMBERS)).toBeNull()
    expect(evaluateFormula('   ', NUMBERS)).toBeNull()
  })

  it('未知函式回傳 null', () => {
    expect(evaluateFormula('VLOOKUP(A1,B1:B3,1)', NUMBERS)).toBeNull()
  })

  it('語法錯誤回傳 null', () => {
    expect(evaluateFormula('A1+', NUMBERS)).toBeNull()
    expect(evaluateFormula('SUM(', NUMBERS)).toBeNull()
  })

  it('不執行任何 JavaScript', () => {
    for (const attack of [
      'constructor.constructor("return 1")()',
      'globalThis',
      'fetch("http://example.test")',
      'alert(1)',
    ]) {
      expect(evaluateFormula(attack, NUMBERS)).toBeNull()
    }
  })

  it('儲存格內容是攻擊字串時也不會被執行', () => {
    const s = sheet({ A1: '=constructor.constructor("return 1")()' })
    // 該格自己算不出值 → null；被別處參照時比照空格視為 0。
    // 關鍵是兩者都不會執行那段程式碼（不會得到 1）。
    expect(evaluateFormula('constructor.constructor("return 1")()', s)).toBeNull()
    expect(evaluateFormula('A1', s)).toBe(0)
    expect(evaluateFormula('A1+0', s)).toBe(0)
  })

  it('除以零回傳 null', () => {
    expect(evaluateFormula('A1/0', NUMBERS)).toBeNull()
    const s = sheet({ A1: 1, A2: 0 })
    expect(evaluateFormula('A1/A2', s)).toBeNull()
  })
})
