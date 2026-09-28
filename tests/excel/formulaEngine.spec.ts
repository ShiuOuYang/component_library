import { describe, expect, it } from 'vitest'
import { evaluateFormula, type FormulaSheet } from '@/components/library/excel/formula/formulaEngine'
import { parseFormula, FormulaSyntaxError } from '@/components/library/excel/formula/parser'

/**
 * 期望值都是在 Office Excel 輸入同一條公式會得到的結果。
 * 布林顯示成 'TRUE' / 'FALSE'，錯誤值顯示成 '#DIV/0!' 這類字串。
 */

/** 用 { A1: 10, B2: '=A1*2' } 這種簡寫組出工作表 */
function sheet(cells: Record<string, string | number>): FormulaSheet {
  const out: FormulaSheet['cells'] = {}
  for (const [key, raw] of Object.entries(cells)) out[key] = { raw }
  return { cells: out }
}

const NUMBERS = sheet({ A1: 1, A2: 2, A3: 3, B1: 10, B2: 20, B3: 30 })
const EMPTY = sheet({})
const ev = (f: string, s: FormulaSheet = EMPTY) => evaluateFormula(f, s)

describe('運算子', () => {
  it('四則運算與優先序', () => {
    expect(ev('1+2*3')).toBe(7)
    expect(ev('(1+2)*3')).toBe(9)
    expect(ev('10-3-2')).toBe(5)
    expect(ev('100/5/2')).toBe(10)
    expect(ev('2*(3+(4-1))')).toBe(12)
  })

  it('小數與科學記號', () => {
    expect(ev('1.5+2.25')).toBe(3.75)
    expect(ev('1e3')).toBe(1000)
    expect(ev('.5*2')).toBe(1)
  })

  /** Excel 顯示 15 位有效數字：0.1+0.2 是 0.3，不是 0.30000000000000004 */
  it('浮點誤差不會出現在結果裡', () => {
    expect(ev('0.1+0.2')).toBe(0.3)
    expect(ev('1.1*3')).toBe(3.3)
  })

  /** ⚠️ 與一般程式語言不同：Excel 的負號比次方優先，次方是左結合 */
  it('-2^2 = 4、2^3^2 = 64（Excel 的優先序）', () => {
    expect(ev('-2^2')).toBe(4)
    expect(ev('2^3^2')).toBe(64)
    expect(ev('2^-1')).toBe(0.5)
    expect(ev('2*3^2')).toBe(18)
  })

  /** ⚠️ 原本 % 是取餘數：10%3 = 1。Excel 的 % 是百分比 */
  it('% 是百分比', () => {
    expect(ev('50%')).toBe(0.5)
    expect(ev('200*10%')).toBe(20)
    expect(ev('-5%')).toBe(-0.05)
  })

  it('一元正負號', () => {
    expect(ev('--5')).toBe(5)
    expect(ev('3*-2')).toBe(-6)
  })

  it('& 串接文字，數字轉成一般格式', () => {
    expect(ev('"A"&1&TRUE')).toBe('A1TRUE')
    // + 比 & 優先：先算 0.1+0.2，再串接；數字以 15 位有效數字轉成文字
    expect(ev('"x"&0.1+0.2')).toBe('x0.3')
    expect(ev('("x"&1)+1')).toBe('#VALUE!')
    expect(ev('A1&"-"&B1', NUMBERS)).toBe('1-10')
  })

  it('字串裡的 "" 是一個引號', () => {
    expect(ev('"說""好"""')).toBe('說"好"')
  })

  it('比較回傳布林', () => {
    expect(ev('2>1')).toBe('TRUE')
    expect(ev('3<>3')).toBe('FALSE')
    expect(ev('1+1>=2')).toBe('TRUE')
  })

  /** Excel 比較不同型別時不轉換：數字 < 文字 < 布林 */
  it('比較的型別規則', () => {
    expect(ev('"10">9')).toBe('TRUE')
    expect(ev('TRUE>100')).toBe('TRUE')
    expect(ev('"abc"="ABC"')).toBe('TRUE')
    expect(ev('"a"<"b"')).toBe('TRUE')
  })

  it('空白格：與數字比較當 0、與文字比較當 ""', () => {
    expect(ev('Z1=0')).toBe('TRUE')
    expect(ev('Z1=""')).toBe('TRUE')
    expect(ev('Z1+1')).toBe(1)
  })
})

describe('型別轉換', () => {
  it('數字文字參與運算時轉成數字', () => {
    expect(ev('"3"+1')).toBe(4)
    expect(ev('A1+1', sheet({ A1: '41' }))).toBe(42)
  })

  /** ⚠️ 原本文字格在運算中被當成 0，錯誤被默默吞掉。Excel 是 #VALUE! */
  it('非數字文字參與運算是 #VALUE!', () => {
    expect(ev('"abc"+1')).toBe('#VALUE!')
    expect(ev('A1+A2', sheet({ A1: 'hello', A2: 5 }))).toBe('#VALUE!')
  })

  it('TRUE / FALSE 在運算中是 1 / 0', () => {
    expect(ev('TRUE+TRUE')).toBe(2)
    expect(ev('A1*10', sheet({ A1: 'TRUE' }))).toBe(10)
  })

  it('=A1 而 A1 是空的 → 0', () => {
    expect(ev('A1')).toBe(0)
  })
})

describe('錯誤值', () => {
  /** ⚠️ 原本除以零顯示公式原文 */
  it('除以零是 #DIV/0!', () => {
    expect(ev('1/0')).toBe('#DIV/0!')
    expect(ev('A1/A2', sheet({ A1: 1, A2: 0 }))).toBe('#DIV/0!')
  })

  it('錯誤會往外傳', () => {
    expect(ev('1/0+1')).toBe('#DIV/0!')
    expect(ev('SUM(A1:A2)', sheet({ A1: 1, A2: '=1/0' }))).toBe('#DIV/0!')
    expect(ev('#N/A&"x"')).toBe('#N/A')
  })

  it('溢位是 #NUM!', () => {
    expect(ev('10^1000')).toBe('#NUM!')
    expect(ev('SQRT(-1)')).toBe('#NUM!')
  })

  it('不認得的函式與名稱是 #NAME?', () => {
    expect(ev('NOSUCH(1)')).toBe('#NAME?')
    expect(ev('abc')).toBe('#NAME?')
  })

  /** ⚠️ 原本範圍在運算式裡被默默換成總和：=A1:A3*2 算成 12 */
  it('範圍用在需要單一值的地方是 #VALUE!', () => {
    expect(ev('A1:A3*2', NUMBERS)).toBe('#VALUE!')
    expect(ev('A1:A1*2', NUMBERS)).toBe(2)
  })

  it('刪除列欄後的 #REF! 參照', () => {
    expect(ev('#REF!+A1')).toBe('#REF!')
    expect(ev('IFERROR(#REF!,0)')).toBe(0)
  })

  it('字串常值裡的 #REF! 只是文字', () => {
    expect(ev('"#REF!"&"了"')).toBe('#REF!了')
  })

  it('輸入的錯誤值文字被當成錯誤', () => {
    expect(ev('ISNA(A1)', sheet({ A1: '#N/A' }))).toBe('TRUE')
  })
})

describe('參照', () => {
  it('單格、範圍、小寫、$ 絕對參照', () => {
    expect(ev('A1+B1', NUMBERS)).toBe(11)
    expect(ev('a1+b1', NUMBERS)).toBe(11)
    expect(ev('$A$1+B$1+$A2', NUMBERS)).toBe(13)
    expect(ev('SUM($A$1:$A$3)', NUMBERS)).toBe(6)
  })

  it('反向的範圍 B3:A1 也可以', () => {
    expect(ev('SUM(B3:A1)', NUMBERS)).toBe(66)
  })

  it('整欄 A:A 與整列 1:1', () => {
    expect(ev('SUM(A:A)', NUMBERS)).toBe(6)
    expect(ev('SUM(B:B)', NUMBERS)).toBe(60)
    expect(ev('SUM(1:1)', NUMBERS)).toBe(11)
  })

  it('參照到公式格時先算出它的值', () => {
    const s = sheet({ A1: 5, A2: '=A1*2', A3: '=A2+1' })
    expect(ev('A3', s)).toBe(11)
    expect(ev('SUM(A1:A3)', s)).toBe(26)
  })

  it('LOG10、A1B 這種不是參照', () => {
    expect(ev('A1B', NUMBERS)).toBe('#NAME?')
  })
})

describe('跨工作表參照', () => {
  const other = sheet({ A1: 100, B2: '=A1*2' })
  const spaced = sheet({ A1: 7 })
  const resolveSheet = (name: string) =>
    ({ sheet2: other, 'my sheet': spaced, 銷售: other })[name.toLowerCase()]

  it('Sheet2!A1、帶引號的名稱、中文名稱', () => {
    expect(evaluateFormula('Sheet2!A1+1', NUMBERS, { resolveSheet })).toBe(101)
    expect(evaluateFormula("'My Sheet'!A1*2", NUMBERS, { resolveSheet })).toBe(14)
    expect(evaluateFormula('SUM(銷售!A1:B2)', NUMBERS, { resolveSheet })).toBe(300)
  })

  it('另一張表的公式在那張表的範圍內求值', () => {
    // B2 = A1*2 指的是 Sheet2 的 A1（100），不是目前工作表的 A1（1）
    expect(evaluateFormula('Sheet2!B2', NUMBERS, { resolveSheet })).toBe(200)
  })

  it('不存在的工作表是 #REF!', () => {
    expect(evaluateFormula('Nope!A1', NUMBERS, { resolveSheet })).toBe('#REF!')
  })
})

describe('迴圈參照', () => {
  /** 原本沒有任何保護：兩格互相參照會讓求值無限遞迴，整個分頁卡死 */
  it('互相參照、自我參照、三格循環都不會無限遞迴', () => {
    expect(() => ev('A1', sheet({ A1: '=B1', B1: '=A1' }))).not.toThrow()
    expect(() => ev('A1', sheet({ A1: '=A1+1' }))).not.toThrow()
    expect(() => ev('SUM(A1:C1)', sheet({ A1: '=B1', B1: '=C1', C1: '=A1' }))).not.toThrow()
  })

  it('長鏈參照（非循環）仍算得出來', () => {
    const cells: Record<string, string | number> = { A1: 1 }
    for (let i = 2; i <= 200; i++) cells[`A${i}`] = `=A${i - 1}+1`
    expect(ev('A200', sheet(cells))).toBe(200)
  })

  it('同一格被多次參照只算一次（菱形相依不會指數爆炸）', () => {
    // 每一格都參照上一格兩次；沒有快取時是 2^40 次求值
    const cells: Record<string, string | number> = { A1: 1 }
    for (let i = 2; i <= 40; i++) cells[`A${i}`] = `=A${i - 1}+A${i - 1}`
    expect(ev('A40', sheet(cells))).toBe(2 ** 39)
  })
})

describe('語法錯誤與安全', () => {
  it('空公式與語法錯誤回傳 null（編輯器顯示原式）', () => {
    for (const f of ['', '   ', 'A1+', 'SUM(', '(1+2', '1+2)', '*2', '"abc', 'SUM(1,2']) {
      expect(ev(f), f).toBeNull()
    }
  })

  it('引數個數不對是語法錯誤', () => {
    expect(ev('IF()')).toBeNull()
    expect(ev('ROUND(1,2,3)')).toBeNull()
  })

  it('解析器丟出的是 FormulaSyntaxError', () => {
    expect(() => parseFormula('1+')).toThrow(FormulaSyntaxError)
  })

  /**
   * 關鍵安全測試：這些字串在最早的實作下會被 new Function 執行。
   * 現在它們要嘛是語法錯誤（null），要嘛是不認得的名稱（#NAME?）——
   * 絕不會得到 JavaScript 執行後的結果。
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
      const v = ev(attack)
      expect(v === null || v === '#NAME?', attack).toBe(true)
    }
  })

  it('儲存格內容是攻擊字串時，被參照也不會執行', () => {
    const s = sheet({ A1: '=constructor.constructor("return 1")()' })
    expect(ev('A1', s)).toBe('#NAME?')
  })
})

describe('彙總函式', () => {
  it('SUM / AVERAGE / AVG / MIN / MAX', () => {
    expect(ev('SUM(A1:A3,B1)', NUMBERS)).toBe(16)
    expect(ev('AVERAGE(A1:A3)', NUMBERS)).toBe(2)
    expect(ev('AVG(A1:A3)', NUMBERS)).toBe(2)
    expect(ev('MIN(A1:B3)', NUMBERS)).toBe(1)
    expect(ev('MAX(A1:B3)', NUMBERS)).toBe(30)
    expect(ev('sum(A1:A3)', NUMBERS)).toBe(6)
  })

  it('範圍裡的文字、布林、空白略過；直接寫的值則轉型', () => {
    const s = sheet({ A1: 1, A2: 'x', A3: 'TRUE', A4: 4 })
    expect(ev('SUM(A1:A5)', s)).toBe(5)
    expect(ev('SUM("3",TRUE,1)', s)).toBe(5)
    expect(ev('SUM("x")', s)).toBe('#VALUE!')
  })

  /** ⚠️ 原本空範圍的平均是 0。Excel 是 #DIV/0! */
  it('空範圍：SUM / MIN 是 0，AVERAGE 是 #DIV/0!', () => {
    expect(ev('SUM(Z1:Z3)')).toBe(0)
    expect(ev('MIN(Z1:Z3)')).toBe(0)
    expect(ev('AVERAGE(Z1:Z3)')).toBe('#DIV/0!')
  })

  it('COUNT / COUNTA / COUNTBLANK', () => {
    const s = sheet({ A1: 1, A2: 'x', A3: 3, A5: '=""' })
    expect(ev('COUNT(A1:A5)', s)).toBe(2)
    expect(ev('COUNTA(A1:A5)', s)).toBe(4)
    expect(ev('COUNTBLANK(A1:A5)', s)).toBe(2)
  })

  it('PRODUCT / MEDIAN / LARGE / SMALL / RANK', () => {
    expect(ev('PRODUCT(A1:A3)', NUMBERS)).toBe(6)
    expect(ev('MEDIAN(A1:B3)', NUMBERS)).toBe(6.5)
    expect(ev('LARGE(A1:B3,2)', NUMBERS)).toBe(20)
    expect(ev('SMALL(A1:B3,2)', NUMBERS)).toBe(2)
    expect(ev('RANK(B2,B1:B3)', NUMBERS)).toBe(2)
    expect(ev('RANK(B2,B1:B3,1)', NUMBERS)).toBe(2)
    expect(ev('LARGE(A1:A3,9)', NUMBERS)).toBe('#NUM!')
  })

  it('STDEV / VAR', () => {
    const s = sheet({ A1: 2, A2: 4, A3: 4, A4: 4, A5: 5, A6: 5, A7: 7, A8: 9 })
    expect(ev('STDEV.P(A1:A8)', s)).toBe(2)
    expect(ev('VAR.P(A1:A8)', s)).toBe(4)
    expect(ev('ROUND(STDEV(A1:A8),4)', s)).toBe(2.1381)
  })

  it('SUMPRODUCT', () => {
    expect(ev('SUMPRODUCT(A1:A3,B1:B3)', NUMBERS)).toBe(140)
    expect(ev('SUMPRODUCT(A1:A3,B1:B2)', NUMBERS)).toBe('#VALUE!')
  })
})

describe('條件彙總', () => {
  const s = sheet({
    A1: '蘋果', B1: 10, C1: '北',
    A2: '香蕉', B2: 20, C2: '南',
    A3: '蘋果汁', B3: 30, C3: '北',
    A4: '蘋果', B4: 40, C4: '南',
    A5: '', B5: 50, C5: '北',
  })

  it('COUNTIF：文字（不分大小寫）、數字、比較運算', () => {
    expect(ev('COUNTIF(A1:A5,"蘋果")', s)).toBe(2)
    expect(ev('COUNTIF(B1:B5,">=30")', s)).toBe(3)
    expect(ev('COUNTIF(B1:B5,20)', s)).toBe(1)
    expect(ev('COUNTIF(B1:B5,"<>20")', s)).toBe(4)
    expect(ev('COUNTIF(A1:A5,"<>蘋果")', s)).toBe(3)
    expect(ev('COUNTIF(C1:C5,"北")', s)).toBe(3)
  })

  it('萬用字元 * ? 與 ~ 跳脫', () => {
    expect(ev('COUNTIF(A1:A5,"蘋果*")', s)).toBe(3)
    expect(ev('COUNTIF(A1:A5,"?蕉")', s)).toBe(1)
    expect(ev('COUNTIF(A1:A1,"~*")', sheet({ A1: '*' }))).toBe(1)
    expect(ev('COUNTIF(A1:A2,"~*")', sheet({ A1: 'x', A2: 'y' }))).toBe(0)
  })

  it('空白條件：""（空白）與 "<>"（非空白）', () => {
    expect(ev('COUNTIF(A1:A5,"")', s)).toBe(1)
    expect(ev('COUNTIF(A1:A5,"<>")', s)).toBe(4)
  })

  it('條件可以用儲存格與 & 組出來', () => {
    const t = sheet({ A1: 5, A2: 15, A3: 25, D1: 10 })
    expect(ev('COUNTIF(A1:A3,">"&D1)', t)).toBe(2)
  })

  it('SUMIF / AVERAGEIF（第三個引數是要加總的範圍）', () => {
    expect(ev('SUMIF(A1:A5,"蘋果",B1:B5)', s)).toBe(50)
    expect(ev('SUMIF(B1:B5,">25")', s)).toBe(120)
    expect(ev('AVERAGEIF(C1:C5,"北",B1:B5)', s)).toBe(30)
    expect(ev('AVERAGEIF(C1:C5,"西",B1:B5)', s)).toBe('#DIV/0!')
  })

  it('SUMIFS / COUNTIFS / AVERAGEIFS / MAXIFS / MINIFS', () => {
    expect(ev('SUMIFS(B1:B5,A1:A5,"蘋果*",C1:C5,"北")', s)).toBe(40)
    expect(ev('COUNTIFS(C1:C5,"南",B1:B5,">25")', s)).toBe(1)
    expect(ev('AVERAGEIFS(B1:B5,C1:C5,"北")', s)).toBe(30)
    expect(ev('MAXIFS(B1:B5,C1:C5,"南")', s)).toBe(40)
    expect(ev('MINIFS(B1:B5,C1:C5,"北")', s)).toBe(10)
  })

  it('條件範圍大小不一致是 #VALUE!', () => {
    expect(ev('SUMIFS(B1:B5,A1:A4,"蘋果")', s)).toBe('#VALUE!')
  })
})

describe('邏輯', () => {
  it('IF 回傳文字（原本做不到）', () => {
    expect(ev('IF(A1>0,"正","負")', NUMBERS)).toBe('正')
  })

  it('IF 只算走到的那一支', () => {
    expect(ev('IF(TRUE,1,1/0)')).toBe(1)
  })

  it('IF 省略引數：沒有 false 分支時是 FALSE，空的分支是 0', () => {
    expect(ev('IF(FALSE,1)')).toBe('FALSE')
    expect(ev('IF(TRUE,,1)')).toBe(0)
  })

  it('IF 的條件是文字時是 #VALUE!', () => {
    expect(ev('IF("abc",1,2)')).toBe('#VALUE!')
  })

  it('巢狀 IF 與函式當條件', () => {
    expect(ev('IF(SUM(A1:A3)>5,IF(B1>5,"兩者","一個"),"都不")', NUMBERS)).toBe('兩者')
  })

  it('IFS / SWITCH / CHOOSE', () => {
    expect(ev('IFS(A3>5,"大",A3>2,"中",TRUE,"小")', NUMBERS)).toBe('中')
    expect(ev('IFS(FALSE,1)')).toBe('#N/A')
    expect(ev('SWITCH(A2,1,"一",2,"二","其他")', NUMBERS)).toBe('二')
    expect(ev('SWITCH(9,1,"一","其他")')).toBe('其他')
    expect(ev('CHOOSE(2,"a","b","c")')).toBe('b')
    expect(ev('CHOOSE(4,"a","b","c")')).toBe('#VALUE!')
  })

  it('AND / OR / NOT / XOR', () => {
    expect(ev('AND(A1>0,B1>5)', NUMBERS)).toBe('TRUE')
    expect(ev('AND(A1>0,B1>50)', NUMBERS)).toBe('FALSE')
    expect(ev('OR(A1>5,B1>5)', NUMBERS)).toBe('TRUE')
    expect(ev('NOT(A1>5)', NUMBERS)).toBe('TRUE')
    expect(ev('XOR(TRUE,TRUE)')).toBe('FALSE')
    // 範圍裡的文字略過
    expect(ev('AND(A1:A2)', sheet({ A1: 'TRUE', A2: 'x' }))).toBe('TRUE')
  })

  it('IFERROR / IFNA', () => {
    expect(ev('IFERROR(1/0,"除以零")')).toBe('除以零')
    expect(ev('IFERROR(5,0)')).toBe(5)
    expect(ev('IFNA(NA(),"找不到")')).toBe('找不到')
    expect(ev('IFNA(1/0,"找不到")')).toBe('#DIV/0!')
  })
})

describe('查閱', () => {
  const table = sheet({
    A1: 'P001', B1: '滑鼠', C1: 350,
    A2: 'P002', B2: '鍵盤', C2: 890,
    A3: 'P003', B3: '螢幕', C3: 5200,
    E1: 0, F1: 'F',
    E2: 60, F2: 'D',
    E3: 70, F3: 'C',
    E4: 80, F4: 'B',
    E5: 90, F5: 'A',
  })

  it('VLOOKUP 精確比對（不分大小寫）', () => {
    expect(ev('VLOOKUP("P002",A1:C3,2,FALSE)', table)).toBe('鍵盤')
    expect(ev('VLOOKUP("p003",A1:C3,3,0)', table)).toBe(5200)
  })

  it('VLOOKUP 找不到是 #N/A、欄號超出是 #REF!', () => {
    expect(ev('VLOOKUP("P999",A1:C3,2,FALSE)', table)).toBe('#N/A')
    expect(ev('VLOOKUP("P001",A1:C3,4,FALSE)', table)).toBe('#REF!')
    expect(ev('VLOOKUP("P001",A1:C3,0,FALSE)', table)).toBe('#VALUE!')
  })

  it('VLOOKUP 近似比對（成績對等第）', () => {
    expect(ev('VLOOKUP(75,E1:F5,2)', table)).toBe('C')
    expect(ev('VLOOKUP(90,E1:F5,2,TRUE)', table)).toBe('A')
    expect(ev('VLOOKUP(-1,E1:F5,2)', table)).toBe('#N/A')
  })

  it('VLOOKUP 萬用字元', () => {
    expect(ev('VLOOKUP("*3",A1:C3,2,FALSE)', table)).toBe('螢幕')
  })

  it('數字與文字不互相比對（5 不等於 "5"）', () => {
    const s = sheet({ A1: '=TEXT(5,"0")', B1: 'x' })
    expect(ev('VLOOKUP(5,A1:B1,2,FALSE)', s)).toBe('#N/A')
  })

  it('HLOOKUP', () => {
    const s = sheet({ A1: 'Q1', B1: 'Q2', A2: 100, B2: 200 })
    expect(ev('HLOOKUP("Q2",A1:B2,2,FALSE)', s)).toBe(200)
  })

  it('INDEX / MATCH', () => {
    expect(ev('INDEX(A1:C3,2,3)', table)).toBe(890)
    expect(ev('INDEX(B1:B3,3)', table)).toBe('螢幕')
    expect(ev('INDEX(A1:C1,2)', table)).toBe('滑鼠') // 單列範圍的索引是欄號
    expect(ev('MATCH("P003",A1:A3,0)', table)).toBe(3)
    expect(ev('MATCH(75,E1:E5)', table)).toBe(3)
    expect(ev('INDEX(B1:B3,MATCH("P002",A1:A3,0))', table)).toBe('鍵盤')
    expect(ev('SUM(INDEX(A1:C3,0,3))', table)).toBe(6440)
    expect(ev('INDEX(A1:C3,5,1)', table)).toBe('#REF!')
  })

  it('XLOOKUP：精確、找不到時的預設值、由後往前找、近似', () => {
    expect(ev('XLOOKUP("P002",A1:A3,C1:C3)', table)).toBe(890)
    expect(ev('XLOOKUP("P9",A1:A3,C1:C3,"無此品項")', table)).toBe('無此品項')
    expect(ev('XLOOKUP("P9",A1:A3,C1:C3)', table)).toBe('#N/A')
    const dup = sheet({ A1: 'x', B1: 1, A2: 'x', B2: 2 })
    expect(ev('XLOOKUP("x",A1:A2,B1:B2,,0,-1)', dup)).toBe(2)
    expect(ev('XLOOKUP(75,E1:E5,F1:F5,,-1)', table)).toBe('C')
    expect(ev('XLOOKUP(75,E1:E5,F1:F5,,1)', table)).toBe('B')
  })

  it('ROWS / COLUMNS / ROW / COLUMN', () => {
    expect(ev('ROWS(A1:C3)')).toBe(3)
    expect(ev('COLUMNS(A1:C3)')).toBe(3)
    expect(ev('ROW(B7)')).toBe(7)
    expect(ev('COLUMN(D2)')).toBe(4)
  })
})

describe('數學', () => {
  /** Excel 的四捨五入是「遠離零」，而且 1.005 會進位（JavaScript 的 toFixed 不會） */
  it('ROUND / ROUNDUP / ROUNDDOWN', () => {
    expect(ev('ROUND(2.5,0)')).toBe(3)
    expect(ev('ROUND(-2.5,0)')).toBe(-3)
    expect(ev('ROUND(1.005,2)')).toBe(1.01)
    expect(ev('ROUND(1234.5,-2)')).toBe(1200)
    expect(ev('ROUNDUP(1.21,1)')).toBe(1.3)
    expect(ev('ROUNDDOWN(-1.29,1)')).toBe(-1.2)
    expect(ev('ROUND(3.14159)')).toBe(3)
  })

  it('INT 往下取整、TRUNC 往零截斷', () => {
    expect(ev('INT(-2.5)')).toBe(-3)
    expect(ev('TRUNC(-2.5)')).toBe(-2)
  })

  /** Excel 的 MOD 與除數同號；JavaScript 的 % 與被除數同號 */
  it('MOD', () => {
    expect(ev('MOD(10,3)')).toBe(1)
    expect(ev('MOD(-3,2)')).toBe(1)
    expect(ev('MOD(3,-2)')).toBe(-1)
    expect(ev('MOD(1,0)')).toBe('#DIV/0!')
  })

  it('ABS / SIGN / SQRT / POWER / PI / CEILING / FLOOR', () => {
    expect(ev('ABS(-3)')).toBe(3)
    expect(ev('SIGN(-3)')).toBe(-1)
    expect(ev('SQRT(16)')).toBe(4)
    expect(ev('POWER(2,10)')).toBe(1024)
    expect(ev('ROUND(PI(),4)')).toBe(3.1416)
    expect(ev('CEILING(4.2,0.5)')).toBe(4.5)
    expect(ev('FLOOR(4.7,0.5)')).toBe(4.5)
  })
})

describe('文字', () => {
  it('LEN / LEFT / RIGHT / MID（以字元計，中文不會被切半）', () => {
    expect(ev('LEN("臺北市")')).toBe(3)
    expect(ev('LEFT("臺北市大安區",3)')).toBe('臺北市')
    expect(ev('LEFT("abc")')).toBe('a')
    expect(ev('RIGHT("abc",2)')).toBe('bc')
    expect(ev('MID("abcdef",2,3)')).toBe('bcd')
    expect(ev('MID("abc",0,1)')).toBe('#VALUE!')
  })

  it('UPPER / LOWER / PROPER / TRIM / REPT', () => {
    expect(ev('UPPER("abc")')).toBe('ABC')
    expect(ev('LOWER("ABC")')).toBe('abc')
    expect(ev('PROPER("hello wORLD")')).toBe('Hello World')
    expect(ev('TRIM("  a   b  ")')).toBe('a b')
    expect(ev('REPT("-",3)')).toBe('---')
  })

  it('CONCATENATE / CONCAT / TEXTJOIN', () => {
    const s = sheet({ A1: 'a', A3: 'c' })
    expect(ev('CONCATENATE("a",1,TRUE)')).toBe('a1TRUE')
    expect(ev('CONCAT(A1:A3)', s)).toBe('ac')
    expect(ev('TEXTJOIN(", ",TRUE,A1:A3)', s)).toBe('a, c')
    expect(ev('TEXTJOIN("-",FALSE,A1:A3)', s)).toBe('a--c')
  })

  it('SUBSTITUTE / REPLACE', () => {
    expect(ev('SUBSTITUTE("a-b-c","-","+")')).toBe('a+b+c')
    expect(ev('SUBSTITUTE("a-b-c","-","+",2)')).toBe('a-b+c')
    expect(ev('REPLACE("abcdef",2,3,"X")')).toBe('aXef')
  })

  it('FIND 分大小寫、SEARCH 不分且支援萬用字元', () => {
    expect(ev('FIND("b","abcb")')).toBe(2)
    expect(ev('FIND("B","abc")')).toBe('#VALUE!')
    expect(ev('SEARCH("B","abc")')).toBe(2)
    expect(ev('SEARCH("c?","abcd")')).toBe(3)
    expect(ev('FIND("b","abcb",3)')).toBe(4)
  })

  it('VALUE / EXACT', () => {
    expect(ev('VALUE("12.5")')).toBe(12.5)
    expect(ev('VALUE("50%")')).toBe(0.5)
    expect(ev('VALUE("abc")')).toBe('#VALUE!')
    expect(ev('EXACT("a","A")')).toBe('FALSE')
  })

  it('TEXT 數字格式', () => {
    expect(ev('TEXT(1234.5,"#,##0.00")')).toBe('1,234.50')
    expect(ev('TEXT(0.256,"0.0%")')).toBe('25.6%')
    expect(ev('TEXT(7,"000")')).toBe('007')
    expect(ev('TEXT(2.5,"0")')).toBe('3')
    expect(ev('TEXT(-1234,"#,##0")')).toBe('-1,234')
    expect(ev('TEXT(12,"$#,##0")')).toBe('$12')
  })
})

describe('資訊', () => {
  const s = sheet({ A1: 1, A2: 'x', A3: 'TRUE', A5: '=1/0', A6: '=NA()' })
  it('IS 系列', () => {
    expect(ev('ISNUMBER(A1)', s)).toBe('TRUE')
    expect(ev('ISTEXT(A2)', s)).toBe('TRUE')
    expect(ev('ISLOGICAL(A3)', s)).toBe('TRUE')
    expect(ev('ISBLANK(A4)', s)).toBe('TRUE')
    expect(ev('ISBLANK(A1)', s)).toBe('FALSE')
    expect(ev('ISERROR(A5)', s)).toBe('TRUE')
    expect(ev('ISERR(A6)', s)).toBe('FALSE')
    expect(ev('ISNA(A6)', s)).toBe('TRUE')
    expect(ev('ISNONTEXT(A1)', s)).toBe('TRUE')
  })
})

/**
 * 錯誤值往外傳：任何一個引數是錯誤，結果就是那個錯誤（與 Excel 相同）。
 * 逐一把每個引數換成 1/0，確認每個函式的每個引數都有處理。
 */
describe('每個函式的每個引數都會把錯誤往外傳', () => {
  const s = sheet({ A1: 1, A2: 2, B1: 'x', B2: 'y' })
  const cases: [string, string[]][] = [
    ['ROUND', ['1.5', '0']],
    ['ROUNDUP', ['1.5', '0']],
    ['MOD', ['5', '2']],
    ['POWER', ['2', '3']],
    ['CEILING', ['4.2', '1']],
    ['FLOOR', ['4.2', '1']],
    ['SQRT', ['4']],
    ['ABS', ['-1']],
    ['LARGE', ['A1:A2', '1']],
    ['RANK', ['1', 'A1:A2', '0']],
    ['CHOOSE', ['1', '"a"']],
    ['NOT', ['TRUE']],
    ['VLOOKUP', ['"x"', 'B1:B2', '1', 'FALSE']],
    ['INDEX', ['A1:A2', '1', '1']],
    ['MATCH', ['1', 'A1:A2', '0']],
    ['XLOOKUP', ['1', 'A1:A2', 'B1:B2', '"-"', '0', '1']],
    ['LEN', ['"abc"']],
    ['LEFT', ['"abc"', '1']],
    ['MID', ['"abc"', '1', '1']],
    ['REPT', ['"a"', '2']],
    ['CONCATENATE', ['"a"', '"b"']],
    ['CONCAT', ['"a"', '"b"']],
    ['TEXTJOIN', ['","', 'TRUE', '"a"']],
    ['SUBSTITUTE', ['"a-b"', '"-"', '"+"', '1']],
    ['REPLACE', ['"abc"', '1', '1', '"x"']],
    ['FIND', ['"b"', '"abc"', '1']],
    ['SEARCH', ['"b"', '"abc"', '1']],
    ['EXACT', ['"a"', '"a"']],
    ['TEXT', ['1', '"0"']],
    ['VALUE', ['"1"']],
    ['SUM', ['1', '2']],
    ['AVERAGE', ['1', '2']],
    ['COUNTIF', ['A1:A2', '1']],
    ['SUMIF', ['A1:A2', '1', 'A1:A2']],
    ['SUMIFS', ['A1:A2', 'A1:A2', '1']],
    ['AND', ['TRUE', 'TRUE']],
    ['OR', ['FALSE', 'FALSE']],
    ['IF', ['TRUE', '1', '2']],
    ['IFS', ['TRUE', '1']],
    ['SWITCH', ['1', '1', '"a"']],
  ]
  // 這些位置本來就不會被求值或不會傳出錯誤
  const skip: Record<string, number[]> = {
    IF: [2], // 條件為真時不算 false 分支
    CHOOSE: [],
    IFS: [],
    XLOOKUP: [3], // 找到時不用預設值
    RANK: [1],
    LARGE: [0],
    SWITCH: [1],
  }
  for (const [name, args] of cases) {
    args.forEach((_, i) => {
      if (skip[name]?.includes(i)) return
      const replaced = args.map((a, j) => (j === i ? '1/0' : a))
      const formula = `${name}(${replaced.join(',')})`
      it(formula, () => {
        expect(ev(formula, s)).toBe('#DIV/0!')
      })
    })
  }
})

describe('範圍裡的錯誤值', () => {
  const s = sheet({ A1: 1, A2: '=1/0', B1: 'x', B2: '=NA()' })
  it('彙總函式與條件彙總傳出範圍裡的錯誤', () => {
    expect(ev('LARGE(A1:A2,1)', s)).toBe('#DIV/0!')
    expect(ev('SUMIF(B1:B2,"x",A1:A2)', s)).toBe(1)
    expect(ev('SUMIF(A1:A2,">0",A1:A2)', s)).toBe(1)
    expect(ev('SUMIFS(A1:A2,B1:B2,"<>x")', s)).toBe('#DIV/0!')
    expect(ev('SUMPRODUCT(A1:A2,A1:A2)', s)).toBe('#DIV/0!')
    expect(ev('AND(A1:A2)', s)).toBe('#DIV/0!')
    expect(ev('CONCAT(A1:A2)', s)).toBe('#DIV/0!')
    expect(ev('TEXTJOIN(",",TRUE,B1:B2)', s)).toBe('#N/A')
  })

  it('COUNT 不數錯誤、COUNTA 會數', () => {
    expect(ev('COUNT(A1:A2,1/0)', s)).toBe(1)
    expect(ev('COUNTA(A1:A2,1/0,)', s)).toBe(3)
  })
})

describe('比較與條件的其他情況', () => {
  const s = sheet({ A1: 'apple', A2: 'banana', A3: 'cherry', A4: 'TRUE', A5: 'FALSE', A6: 10 })

  it('文字條件的大小比較', () => {
    expect(ev('COUNTIF(A1:A3,"<banana")', s)).toBe(1)
    expect(ev('COUNTIF(A1:A3,">banana")', s)).toBe(1)
    expect(ev('COUNTIF(A1:A3,"<=banana")', s)).toBe(2)
    expect(ev('COUNTIF(A1:A3,">=banana")', s)).toBe(2)
    expect(ev('COUNTIF(A6:A6,"<b")', s)).toBe(0)
  })

  it('數字條件的比較運算', () => {
    expect(ev('COUNTIF(A6:A6,"<11")', s)).toBe(1)
    expect(ev('COUNTIF(A6:A6,"<=10")', s)).toBe(1)
    expect(ev('COUNTIF(A6:A6,"=10")', s)).toBe(1)
  })

  it('布林條件', () => {
    expect(ev('COUNTIF(A4:A5,TRUE)', s)).toBe(1)
    expect(ev('COUNTIF(A4:A5,"TRUE")', s)).toBe(1)
    expect(ev('COUNTIF(A4:A5,"<>TRUE")', s)).toBe(1)
  })

  it('"=" 只比對真正的空白格', () => {
    const t = sheet({ A1: 'a', A2: '=""' })
    expect(ev('COUNTIF(A1:A3,"=")', t)).toBe(1)
  })

  it('條件是空白格', () => {
    const t = sheet({ A1: 'a' })
    expect(ev('COUNTIF(A1:A2,C1)', t)).toBe(1)
  })

  it('COUNTIFS 的條件要成對', () => {
    expect(ev('COUNTIFS(A1:A3,"a*",A1:A3)', s)).toBe('#VALUE!')
    expect(ev('SUMIFS(A6:A6,A6:A6)', s)).toBeNull()
  })

  it('布林之間的比較、錯誤值的比較', () => {
    expect(ev('TRUE>FALSE')).toBe('TRUE')
    expect(ev('FALSE=Z1')).toBe('TRUE')
    expect(ev('"b">"a"')).toBe('TRUE')
    expect(ev('#N/A=1')).toBe('#N/A')
    expect(ev('1=#N/A')).toBe('#N/A')
  })
})

describe('查閱的其他情況', () => {
  const s = sheet({
    A1: 90, A2: 70, A3: 50,
    B1: 'A', B2: 'B', B3: 'C',
    D1: 'Q1', E1: 'Q2', F1: 'Q3',
    D2: 1, E2: 2, F2: 3,
    D3: 10, E3: 20, F3: 30,
  })

  it('MATCH -1：遞減序列裡大於等於的最小值', () => {
    expect(ev('MATCH(60,A1:A3,-1)', s)).toBe(2)
    expect(ev('MATCH(95,A1:A3,-1)', s)).toBe('#N/A')
  })

  it('MATCH 的查閱範圍必須是一欄或一列', () => {
    expect(ev('MATCH(1,D2:F3,0)', s)).toBe('#N/A')
  })

  it('HLOOKUP 近似比對與超出範圍', () => {
    expect(ev('HLOOKUP(2.5,D2:F3,2)', s)).toBe(20)
    expect(ev('HLOOKUP("Q9",D1:F2,2,FALSE)', s)).toBe('#N/A')
    expect(ev('HLOOKUP("Q1",D1:F2,5,FALSE)', s)).toBe('#REF!')
  })

  it('XLOOKUP 橫向查閱，傳回範圍多列時回傳一整欄', () => {
    expect(ev('XLOOKUP("Q2",D1:F1,D2:F2)', s)).toBe(2)
    expect(ev('SUM(XLOOKUP("Q3",D1:F1,D2:F3))', s)).toBe(33)
    expect(ev('SUM(XLOOKUP(70,A1:A3,A1:B3))', s)).toBe(70)
    expect(ev('XLOOKUP(1,D2:F3,D1:F1)', s)).toBe('#VALUE!')
    expect(ev('XLOOKUP("Q3",D1:F1,D2:E2)', s)).toBe('#VALUE!')
    expect(ev('XLOOKUP(50,A1:A3,B1:B2)', s)).toBe('#VALUE!')
    expect(ev('XLOOKUP("q*",D1:F1,D2:F2,,2)', s)).toBe(1)
  })

  it('INDEX 的整列與整個範圍', () => {
    expect(ev('SUM(INDEX(D2:F3,2,0))', s)).toBe(60)
    expect(ev('SUM(INDEX(D2:F3,0,0))', s)).toBe(66)
    expect(ev('INDEX(A1:A3,-1)', s)).toBe('#REF!')
    // 多欄多列只給列號：傳回整列（一格放不下是 #VALUE!，加總則可以）
    expect(ev('INDEX(D2:F3,2)', s)).toBe('#VALUE!')
    expect(ev('SUM(INDEX(D2:F3,2))', s)).toBe(60)
  })

  it('ROW / COLUMN 的引數不是參照時是 #VALUE!', () => {
    expect(ev('ROW(1)')).toBe('#VALUE!')
    expect(ev('COLUMN("A")')).toBe('#VALUE!')
    expect(ev('SUM(ROW(A:A))')).toBe('#VALUE!')
  })

  it('SWITCH 沒有預設值時是 #N/A', () => {
    expect(ev('SWITCH(9,1,"a")')).toBe('#N/A')
  })

  it('CHOOSE 的索引小於 1', () => {
    expect(ev('CHOOSE(0,"a")')).toBe('#VALUE!')
  })

  it('IFS 條件是文字', () => {
    expect(ev('IFS("x",1)')).toBe('#VALUE!')
    expect(ev('IFS(TRUE,1,FALSE)')).toBe('#N/A')
  })
})

describe('其他函式的邊界', () => {
  it('統計函式在資料不足時', () => {
    expect(ev('MEDIAN(Z1:Z2)')).toBe('#NUM!')
    expect(ev('MEDIAN(1,2,3)')).toBe(2)
    expect(ev('STDEV(1)')).toBe('#DIV/0!')
    expect(ev('VAR.S(1,2,3)')).toBe(1)
    expect(ev('PRODUCT(Z1:Z2)')).toBe(0)
    expect(ev('MAX(Z1:Z2)')).toBe(0)
    expect(ev('RANK(99,A1:A2)', sheet({ A1: 1 }))).toBe('#N/A')
    expect(ev('MAXIFS(A1:A2,A1:A2,">5")', sheet({ A1: 1 }))).toBe(0)
    expect(ev('MINIFS(A1:A2,A1:A2,">5")', sheet({ A1: 1 }))).toBe(0)
  })

  it('CEILING / FLOOR 的倍數為 0', () => {
    expect(ev('CEILING(4.2,0)')).toBe(0)
    expect(ev('FLOOR(4.2,0)')).toBe('#DIV/0!')
    expect(ev('CEILING(4.2)')).toBe(5)
  })

  it('POWER 溢位', () => {
    expect(ev('POWER(10,1000)')).toBe('#NUM!')
    expect(ev('0^0')).toBe('#NUM!')
    expect(ev('0^-1')).toBe('#DIV/0!')
  })

  it('文字函式的負數引數', () => {
    expect(ev('LEFT("abc",-1)')).toBe('#VALUE!')
    expect(ev('RIGHT("abc",0)')).toBe('')
    expect(ev('REPT("a",-1)')).toBe('#VALUE!')
    expect(ev('REPLACE("abc",0,1,"x")')).toBe('#VALUE!')
    expect(ev('SUBSTITUTE("abc","","x")')).toBe('abc')
    expect(ev('SUBSTITUTE("abc","b","x",0)')).toBe('#VALUE!')
    expect(ev('SUBSTITUTE("abc","b","x",3)')).toBe('abc')
    expect(ev('FIND("a","abc",9)')).toBe('#VALUE!')
    expect(ev('SEARCH("z","abc")')).toBe('#VALUE!')
    expect(ev('SEARCH("a.c","a.c")')).toBe(1)
  })

  it('VALUE 與 TEXT 對布林', () => {
    expect(ev('VALUE(TRUE)')).toBe('#VALUE!')
    expect(ev('TEXT(TRUE,"0")')).toBe('TRUE')
    expect(ev('TEXT("abc","0")')).toBe('abc')
    expect(ev('TEXT(0.5,"#.##")')).toBe('.5')
    expect(ev('TEXT(0,"#")')).toBe('')
    expect(ev('TEXT(3,"yyyy")')).toBe('3')
  })

  it('邏輯函式沒有可判斷的值時是 #VALUE!', () => {
    expect(ev('AND(A1:A2)', sheet({ A1: 'x' }))).toBe('#VALUE!')
    expect(ev('OR(,TRUE)')).toBe('TRUE')
    expect(ev('AND("x")')).toBe('#VALUE!')
    expect(ev('OR(A1:A1)', sheet({ A1: 1 }))).toBe('TRUE')
  })

  it('TRUE() / FALSE() / PI() 與 CONCAT 的單一值', () => {
    expect(ev('TRUE()')).toBe('TRUE')
    expect(ev('FALSE()')).toBe('FALSE')
    expect(ev('CONCAT("a",1)')).toBe('a1')
    expect(ev('TEXTJOIN("-",TRUE,"a","","b")')).toBe('a-b')
  })

  it('COUNTBLANK 與 COUNT 的直接引數', () => {
    expect(ev('COUNT(1,"2","x",TRUE,)')).toBe(3)
  })

  it('SUMPRODUCT 範圍裡的文字當 0', () => {
    expect(ev('SUMPRODUCT(A1:A2,B1:B2)', sheet({ A1: 2, A2: 'x', B1: 3, B2: 4 }))).toBe(6)
  })

  it('AVG、STDEV.S、VAR 與 RANK.EQ 別名', () => {
    expect(ev('RANK.EQ(2,A1:A2)', sheet({ A1: 1, A2: 2 }))).toBe(1)
    expect(ev('VAR(1,2,3)')).toBe(1)
    expect(ev('STDEV.S(1,3)')).toBe(ev('SQRT(2)'))
  })
})

describe('值的轉換與顯示', () => {
  it('布林在範圍外直接比較、百分比文字', () => {
    expect(ev('"50%"*2')).toBe(1)
    expect(ev('" 3 "+1')).toBe(4)
    expect(ev('-"x"')).toBe('#VALUE!')
    expect(ev('"x"%')).toBe('#VALUE!')
    expect(ev('IF("TRUE",1,2)')).toBe(1)
    expect(ev('IF("false",1,2)')).toBe(2)
    expect(ev('IF(Z1,1,2)')).toBe(2)
    expect(ev('IF(1/0,1,2)')).toBe('#DIV/0!')
    expect(ev('"a"&#N/A')).toBe('#N/A')
    expect(ev('1&"a"')).toBe('1a')
    expect(ev('1+#N/A')).toBe('#N/A')
  })

  it('範圍直接當結果：1×1 取值，其他 #VALUE!', () => {
    expect(ev('A1:A1', sheet({ A1: 7 }))).toBe(7)
    expect(ev('A1:A2', sheet({ A1: 7 }))).toBe('#VALUE!')
    expect(ev('Z1:Z1')).toBe(0)
  })

  it('公式格的結果是文字、布林、錯誤時被參照', () => {
    const s = sheet({ A1: '="x"', A2: '=1>0', A3: '=#N/A', A4: '=Z9' })
    expect(ev('A1&A2', s)).toBe('xTRUE')
    expect(ev('ISNA(A3)', s)).toBe('TRUE')
    expect(ev('A4', s)).toBe(0)
  })

  it('被參照的格子公式語法錯誤或引數個數錯誤 → #NAME?', () => {
    const s = sheet({ A1: '=SUM(', A2: '=ROUND(1,2,3)' })
    expect(ev('A1', s)).toBe('#NAME?')
    expect(ev('A2', s)).toBe('#NAME?')
    expect(ev('IFERROR(A2,"壞")', s)).toBe('壞')
  })

  it('整欄範圍在空工作表上', () => {
    expect(ev('SUM(A:A)')).toBe(0)
    expect(ev('COUNTA(1:1)')).toBe(0)
  })

  it('非預期的鍵不影響整欄範圍的計算', () => {
    const s: FormulaSheet = { cells: { A1: { raw: 1 }, bogus: { raw: 5 } } }
    expect(ev('SUM(A:A)', s)).toBe(1)
  })
})

describe('解析器的其他語法', () => {
  it('帶引號的工作表名稱裡的 \'\'', () => {
    const other = sheet({ A1: 3 })
    expect(evaluateFormula("'Bob''s'!A1", EMPTY, { resolveSheet: (n) => (n === "Bob's" ? other : undefined) })).toBe(3)
  })

  it('沒有 resolveSheet 時跨表參照是 #REF!', () => {
    expect(ev('Sheet2!A1')).toBe('#REF!')
  })

  it('語法錯誤：引號、錯誤值、工作表名稱不完整', () => {
    for (const f of ["'abc", "'abc'A1", "'abc'!", 'Sheet2!', '#BAD', 'A1:', '1,2', ')', 'SUM(1 2']) {
      expect(ev(f), f).toBeNull()
    }
  })

  it('整欄 $A:$B、整列 $1:$2 與反向的整欄', () => {
    expect(ev('SUM($A:$B)', NUMBERS)).toBe(66)
    expect(ev('SUM($1:$2)', NUMBERS)).toBe(33)
    expect(ev('SUM(B:A)', NUMBERS)).toBe(66)
  })

  it('超出 Excel 範圍的「參照」其實是名稱', () => {
    expect(ev('XFE1')).toBe('#NAME?')
    expect(ev('A0')).toBe('#NAME?')
  })

  it('函式名稱可以含點與數字', () => {
    expect(ev('STDEV.P(1,3)')).toBe(1)
  })
})
