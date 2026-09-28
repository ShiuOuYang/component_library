import { describe, expect, it } from 'vitest'
import {
  adjustFormulaForChange,
  mapRefs,
  quoteSheetName,
  removeSheetFromFormula,
  renameSheetInFormula,
} from '@/components/library/excel/formula/refRewrite'
import {
  adjustOtherSheetFormulas,
  applyStructuralChange,
  removeSheetFormulas,
  renameSheetFormulas,
} from '@/components/library/excel/sheetOps'

/**
 * 跨工作表參照（第七批）。
 * 原本只改寫「發生變動的那張表」：別張表的 =SUM(Sheet1!B2:B10) 在 Sheet1 插入列後沒撐大、
 * 工作表改名後所有 =舊名!A1 變成找不到工作表。
 */

const insertRow1 = { axis: 'row' as const, at: 1, count: 1 }

describe('mapRefs：認得工作表前綴', () => {
  it('無引號、帶引號（含 \'\' 跳脫）、中文名稱', () => {
    const seen: (string | null)[] = []
    mapRefs("Sheet2!A1+'My Sheet'!B2+'O''Brien'!C3+銷售!D4+E5", (ref) => {
      seen.push(ref.sheet)
      return null
    })
    expect(seen).toEqual(['Sheet2', 'My Sheet', "O'Brien", '銷售', null])
  })

  it('沒有改動時原樣輸出（含引號與大小寫）', () => {
    const f = "SUM('Q1 Data'!A1:B3)+sheet2!$C$1"
    expect(mapRefs(f, () => null)).toBe(f)
  })

  it('字串裡的 Sheet2!A1 不是參照', () => {
    expect(renameSheetInFormula('"Sheet2!A1"&Sheet2!A1', 'Sheet2', 'Data')).toBe('"Sheet2!A1"&Data!A1')
  })
})

describe('adjustFormulaForChange：跨工作表', () => {
  const inSheet1 = { changedSheet: 'Sheet1', formulaSheet: 'Sheet1' }
  const inSheet2 = { changedSheet: 'Sheet1', formulaSheet: 'Sheet2' }

  it('Sheet1 插入列：Sheet2 裡指向 Sheet1 的參照往下，Sheet2 自己的不動', () => {
    expect(adjustFormulaForChange('Sheet1!A5+A5', insertRow1, inSheet2)).toBe('Sheet1!A6+A5')
  })

  it('本表的公式：沒有前綴的動、指向本表自己的前綴也動、指向別表的不動', () => {
    expect(adjustFormulaForChange('A5+Sheet1!A5+Sheet2!A5', insertRow1, inSheet1)).toBe('A6+Sheet1!A6+Sheet2!A5')
  })

  it('工作表名稱不分大小寫', () => {
    expect(adjustFormulaForChange('sheet1!A5', insertRow1, inSheet2)).toBe('sheet1!A6')
  })

  it('範圍撐大：Sheet2 的 =SUM(Sheet1!B2:B10) 在 Sheet1 第 5 列插入 → B2:B11', () => {
    expect(adjustFormulaForChange('SUM(Sheet1!B2:B10)', { axis: 'row', at: 5, count: 1 }, inSheet2)).toBe('SUM(Sheet1!B2:B11)')
  })

  it('刪掉被參照的格：連同工作表前綴變成 #REF!', () => {
    expect(adjustFormulaForChange('Sheet1!A1*2', { axis: 'row', at: 1, count: -1 }, inSheet2)).toBe('#REF!*2')
  })

  it('帶引號的名稱', () => {
    const scope = { changedSheet: 'Q1 Data', formulaSheet: 'Summary' }
    expect(adjustFormulaForChange("'Q1 Data'!C3", { axis: 'col', at: 1, count: 2 }, scope)).toBe("'Q1 Data'!E3")
  })

  it('不給 scope 時維持原本行為（只動沒有前綴的）', () => {
    expect(adjustFormulaForChange('Sheet2!A5+A5', insertRow1)).toBe('Sheet2!A5+A6')
  })
})

describe('工作表改名 / 刪除', () => {
  it('改名：所有前綴換成新名稱，不分大小寫', () => {
    expect(renameSheetInFormula('Sheet1!A1+SHEET1!B2+Other!C3', 'Sheet1', 'Data')).toBe('Data!A1+Data!B2+Other!C3')
  })

  it('新名稱需要引號時自動加上', () => {
    expect(renameSheetInFormula('Sheet1!A1', 'Sheet1', 'Q1 Data')).toBe("'Q1 Data'!A1")
    expect(renameSheetInFormula('Sheet1!A1', 'Sheet1', "O'Brien")).toBe("'O''Brien'!A1")
    // 看起來像儲存格位址的名稱不加引號會被當成參照
    expect(renameSheetInFormula('Sheet1!A1', 'Sheet1', 'AB12')).toBe("'AB12'!A1")
  })

  it('刪除：指向它的參照變成 #REF!，其他不動', () => {
    expect(removeSheetFromFormula('SUM(Gone!A1:A3)+Kept!A1+A1', 'gone')).toBe('SUM(#REF!)+Kept!A1+A1')
  })

  it('quoteSheetName', () => {
    expect(quoteSheetName('Sheet2')).toBe('Sheet2')
    expect(quoteSheetName('銷售')).toBe('銷售')
    expect(quoteSheetName('2026 Q1')).toBe("'2026 Q1'")
  })
})

describe('sheetOps：跨工作表', () => {
  const cell = (raw: string | number) => ({ raw })

  it('applyStructuralChange 帶 scope：本表裡 =Sheet1!A5 也跟著動', () => {
    const sheet = {
      cells: { B1: cell('=Sheet1!A5+Other!A5') },
      colWidths: {}, rowHeights: {}, merges: {}, freezeRows: 0, freezeCols: 0,
    }
    const next = applyStructuralChange(sheet, insertRow1, { changedSheet: 'Sheet1', formulaSheet: 'Sheet1' })
    expect(next.cells.B2.raw).toBe('=Sheet1!A6+Other!A5')
  })

  it('adjustOtherSheetFormulas：只改寫有變動的格；完全沒變時回傳同一個物件', () => {
    const cells = { A1: cell('=Sheet1!A5'), A2: cell('=B1'), A3: cell(42) }
    const next = adjustOtherSheetFormulas(cells, insertRow1, { changedSheet: 'Sheet1', formulaSheet: 'Sheet2' })
    expect(next.A1.raw).toBe('=Sheet1!A6')
    expect(next.A2).toBe(cells.A2)
    expect(next.A3).toBe(cells.A3)
    const untouched = { A1: cell('=B1') }
    expect(adjustOtherSheetFormulas(untouched, insertRow1, { changedSheet: 'Sheet1', formulaSheet: 'Sheet2' })).toBe(untouched)
  })

  it('renameSheetFormulas / removeSheetFormulas', () => {
    const cells = { A1: cell('=Sheet1!A1*2'), A2: cell('text') }
    expect(renameSheetFormulas(cells, 'Sheet1', '產量').A1.raw).toBe('=產量!A1*2')
    expect(removeSheetFormulas(cells, 'Sheet1').A1.raw).toBe('=#REF!*2')
  })
})
