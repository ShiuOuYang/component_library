import { describe, expect, it } from 'vitest'
import { evaluateArithmetic } from '@/components/library/excel/formula/arithmetic'

/**
 * 這個解析器取代了原本的 new Function('"use strict";return (' + s + ');')。
 * 除了算對，更重要的是「算不出來的東西一律回 null」——
 * 不會把試算表內容當 JavaScript 執行。
 */
describe('evaluateArithmetic：四則運算', () => {
  it('加減乘除', () => {
    expect(evaluateArithmetic('1+2')).toBe(3)
    expect(evaluateArithmetic('10-4')).toBe(6)
    expect(evaluateArithmetic('3*4')).toBe(12)
    expect(evaluateArithmetic('10/4')).toBe(2.5)
  })

  it('乘除優先於加減', () => {
    expect(evaluateArithmetic('2+3*4')).toBe(14)
    expect(evaluateArithmetic('10-6/2')).toBe(7)
  })

  it('括號改變優先序', () => {
    expect(evaluateArithmetic('(2+3)*4')).toBe(20)
    expect(evaluateArithmetic('2*(3+(4-1))')).toBe(12)
  })

  it('左結合：連續減法與除法', () => {
    expect(evaluateArithmetic('10-3-2')).toBe(5)
    expect(evaluateArithmetic('100/5/2')).toBe(10)
  })

  it('一元正負號', () => {
    expect(evaluateArithmetic('-5')).toBe(-5)
    expect(evaluateArithmetic('-5+3')).toBe(-2)
    expect(evaluateArithmetic('3*-2')).toBe(-6)
    expect(evaluateArithmetic('--5')).toBe(5)
  })

  it('次方為右結合', () => {
    expect(evaluateArithmetic('2^3')).toBe(8)
    // 右結合：2^(3^2) = 2^9 = 512
    expect(evaluateArithmetic('2^3^2')).toBe(512)
    expect(evaluateArithmetic('2^-1')).toBe(0.5)
  })

  it('次方優先於乘法', () => {
    expect(evaluateArithmetic('2*3^2')).toBe(18)
  })

  it('餘數', () => {
    expect(evaluateArithmetic('10%3')).toBe(1)
  })

  it('小數與科學記號', () => {
    expect(evaluateArithmetic('1.5+2.25')).toBe(3.75)
    expect(evaluateArithmetic('1e3')).toBe(1000)
    expect(evaluateArithmetic('1.5e-2')).toBe(0.015)
  })

  it('空白不影響結果', () => {
    expect(evaluateArithmetic('  1 +  2 * 3 ')).toBe(7)
  })

  it('單一數字', () => {
    expect(evaluateArithmetic('42')).toBe(42)
  })
})

describe('evaluateArithmetic：比較運算', () => {
  it('回傳 Excel 的 TRUE / FALSE 字面值', () => {
    expect(evaluateArithmetic('2>1')).toBe('TRUE')
    expect(evaluateArithmetic('1>2')).toBe('FALSE')
    expect(evaluateArithmetic('1<2')).toBe('TRUE')
    expect(evaluateArithmetic('2>=2')).toBe('TRUE')
    expect(evaluateArithmetic('1<=0')).toBe('FALSE')
    expect(evaluateArithmetic('3=3')).toBe('TRUE')
    expect(evaluateArithmetic('3<>3')).toBe('FALSE')
    expect(evaluateArithmetic('3<>4')).toBe('TRUE')
  })

  it('比較的兩側可以是算式', () => {
    expect(evaluateArithmetic('1+1>1')).toBe('TRUE')
    expect(evaluateArithmetic('2*3>10-3')).toBe('FALSE')
  })
})

describe('evaluateArithmetic：錯誤與安全', () => {
  it('除以零回傳 null（而不是 Infinity）', () => {
    expect(evaluateArithmetic('1/0')).toBeNull()
    expect(evaluateArithmetic('5%0')).toBeNull()
  })

  it('語法錯誤回傳 null', () => {
    expect(evaluateArithmetic('1+')).toBeNull()
    expect(evaluateArithmetic('*2')).toBeNull()
    expect(evaluateArithmetic('(1+2')).toBeNull()
    expect(evaluateArithmetic('1+2)')).toBeNull()
    expect(evaluateArithmetic('')).toBeNull()
    expect(evaluateArithmetic('   ')).toBeNull()
  })

  /**
   * 關鍵安全測試：這些字串在舊實作下會被 new Function 執行。
   * 現在它們只是「不是算式」，一律回 null。
   */
  it('不執行任何 JavaScript', () => {
    const attacks = [
      'constructor.constructor("return 1")()',
      '(()=>1)()',
      'globalThis',
      'this',
      'window.location',
      'fetch("http://example.test")',
      '[].constructor',
      'alert(1)',
      '1;alert(1)',
      'process.exit(1)',
      '`${1}`',
      'eval("1+1")',
    ]
    for (const attack of attacks) {
      expect(evaluateArithmetic(attack)).toBeNull()
    }
  })

  it('字母與引號都不是合法 token', () => {
    expect(evaluateArithmetic('abc')).toBeNull()
    expect(evaluateArithmetic('"1"+"2"')).toBeNull()
    expect(evaluateArithmetic('1+a')).toBeNull()
  })

  it('溢位成 Infinity 時回傳 null', () => {
    expect(evaluateArithmetic('10^1000')).toBeNull()
  })

  it('括號內的比較結果不能再參與運算', () => {
    // (1>0) 是 TRUE，不是數字，因此整式無法求值
    expect(evaluateArithmetic('(1>0)+1')).toBeNull()
  })
})
