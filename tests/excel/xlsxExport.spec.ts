import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx-js-style'
import {
  buildWorkbook,
  sheetToWorksheet,
  toCellObject,
  toExcelFormula,
  type ExportSheet,
} from '@/components/library/excel/xlsxExport'

function sheet(cells: ExportSheet['cells'], extra: Partial<ExportSheet> = {}): ExportSheet {
  return { name: 'S', cells, colWidths: {}, rowHeights: {}, merges: {}, ...extra }
}

/** 寫成真正的 .xlsx 位元組再讀回來 —— 驗證的是 Excel 會看到的東西 */
function roundTrip(s: ExportSheet): XLSX.WorkSheet {
  const bytes = XLSX.write(buildWorkbook([s]), { bookType: 'xlsx', type: 'array', cellStyles: true })
  const wb = XLSX.read(bytes, { type: 'array', cellFormula: true, cellStyles: true })
  return wb.Sheets[wb.SheetNames[0]]
}

describe('匯出：公式', () => {
  /**
   * ⚠️ 原本寫出的是計算後的值 { t:'n', v:84 }，沒有 f。
   *    在 Excel 打開後公式不見了，改 A1 也不會重算（真實瀏覽器下載的檔案驗證過）。
   */
  it('保留公式，同時寫入快取值', () => {
    const ws = roundTrip(sheet({ A1: { raw: 42 }, A2: { raw: '=A1*2' } }))
    expect(ws.A2.f).toBe('A1*2')
    expect(ws.A2.v).toBe(84)
  })

  it('絕對參照原樣寫出', () => {
    const ws = roundTrip(sheet({ A1: { raw: 1 }, B1: { raw: '=$A$1+1' } }))
    expect(ws.B1.f).toBe('$A$1+1')
  })

  it('AVG 別名轉成 Excel 認得的 AVERAGE（否則在 Excel 裡是 #NAME?）', () => {
    expect(toExcelFormula('AVG(A1:A3)+avg(B1)')).toBe('AVERAGE(A1:A3)+AVERAGE(B1)')
  })

  it('字串常值裡的 AVG( 不改', () => {
    expect(toExcelFormula('"AVG(" & A1')).toBe('"AVG(" & A1')
  })

  it('#REF! 寫成真正的錯誤值，不是一段文字', () => {
    const obj = toCellObject('=#REF!+1', { cells: {} }, true)
    expect(obj?.t).toBe('e')
    expect(obj?.w).toBe('#REF!')
  })

  it('引擎還不支援的函式仍寫出公式，讓 Excel 自己算', () => {
    const obj = toCellObject('=VLOOKUP(A1,B1:C3,2,FALSE)', { cells: {} }, true)
    expect(obj?.f).toBe('VLOOKUP(A1,B1:C3,2,FALSE)')
  })

  it('enableFormula=false 時公式當成文字', () => {
    expect(toCellObject('=A1', { cells: {} }, false)).toEqual({ t: 's', v: '=A1' })
  })
})

describe('匯出：數字', () => {
  /**
   * ⚠️ 編輯器把輸入存成字串 "42"，原本原封不動寫出 → { t:'s', v:'42' }，
   *    在 Excel 裡是「以文字形式儲存的數字」，SUM 會略過它。
   */
  it('使用者輸入的數字寫成數值，不是文字', () => {
    const ws = roundTrip(sheet({ A1: { raw: '42' }, A2: { raw: '3.14' }, A3: { raw: '-7' } }))
    expect(ws.A1).toMatchObject({ t: 'n', v: 42 })
    expect(ws.A2).toMatchObject({ t: 'n', v: 3.14 })
    expect(ws.A3).toMatchObject({ t: 'n', v: -7 })
  })

  it('科學記號也是數字', () => {
    expect(toCellObject('1e3', { cells: {} }, true)).toEqual({ t: 'n', v: 1000 })
  })

  it('夾雜文字或前後空白的不轉', () => {
    expect(toCellObject('42 件', { cells: {} }, true)).toEqual({ t: 's', v: '42 件' })
    expect(toCellObject(' 42', { cells: {} }, true)).toEqual({ t: 's', v: ' 42' })
  })
})

describe('匯出：範圍', () => {
  /**
   * ⚠️ 原本不論用了多少格，!ref 都是整個網格（A1:Z25），
   *    每個空格都寫成空字串儲存格 —— Excel 裡 Ctrl+End 跳到 Z25。
   */
  it('!ref 只涵蓋實際使用的範圍', () => {
    const ws = sheetToWorksheet(sheet({ A1: { raw: 1 }, C4: { raw: 2 } }))
    expect(ws['!ref']).toBe('A1:C4')
  })

  it('空格不寫出', () => {
    const ws = sheetToWorksheet(sheet({ A1: { raw: 1 }, C4: { raw: 2 } }))
    expect(ws.B2).toBeUndefined()
  })

  it('空工作表的 !ref 是 A1', () => {
    expect(sheetToWorksheet(sheet({}))['!ref']).toBe('A1')
  })

  it('只有格式、沒有內容的儲存格也要寫出（例如先設好的表頭底色）', () => {
    const ws = sheetToWorksheet(sheet({ B2: { style: { bg: '#FFFF00' } } }))
    expect(ws.B2).toBeDefined()
    expect(ws['!ref']).toBe('A1:B2')
  })

  it('合併範圍納入 !ref', () => {
    const ws = sheetToWorksheet(sheet({ A1: { raw: 'x' } }, { merges: { A1: { r: 1, c: 1, rows: 2, cols: 3 } } }))
    expect(ws['!ref']).toBe('A1:C2')
    expect(ws['!merges']).toEqual([{ s: { r: 0, c: 0 }, e: { r: 1, c: 2 } }])
  })
})

describe('匯出：欄寬與列高', () => {
  it('列高有匯出（原本完全沒有）', () => {
    const ws = sheetToWorksheet(sheet({ A1: { raw: 1 } }, { rowHeights: { 3: 40 } }))
    expect(ws['!rows']?.[2]).toEqual({ hpx: 40 })
  })

  it('欄寬以像素寫出', () => {
    const ws = sheetToWorksheet(sheet({ A1: { raw: 1 } }, { colWidths: { 2: 150 } }))
    expect(ws['!cols']?.[1]).toEqual({ wpx: 150 })
  })
})

describe('匯出：多張工作表', () => {
  it('每張表各自保留公式', () => {
    const wb = buildWorkbook([
      sheet({ A1: { raw: 1 }, A2: { raw: '=A1+1' } }),
      { ...sheet({ B1: { raw: '=2*3' } }), name: 'Second' },
    ])
    expect(wb.SheetNames).toEqual(['S', 'Second'])
    expect(wb.Sheets.S.A2.f).toBe('A1+1')
    expect(wb.Sheets.Second.B1).toMatchObject({ t: 'n', v: 6, f: '2*3' })
  })
})
