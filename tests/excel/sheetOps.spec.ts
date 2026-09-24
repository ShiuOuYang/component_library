import { describe, expect, it } from 'vitest'
import { applyStructuralChange, type StructuralSheet } from '@/components/library/excel/sheetOps'

type Cell = { raw?: string | number; style?: { bold?: boolean } }

function sheet(partial: Partial<StructuralSheet<Cell>> = {}): StructuralSheet<Cell> {
  return { cells: {}, colWidths: {}, rowHeights: {}, merges: {}, freezeRows: 0, freezeCols: 0, ...partial }
}

describe('applyStructuralChange：插入列', () => {
  /**
   * ⚠️ 在真實瀏覽器重現過的 bug：A3 的 =A1+A2 顯示 30，
   *    在第 1 列上方插入一列後變成 10 —— 公式跟著搬到 A4，參照卻沒改。
   */
  it('公式搬家時參照一起改寫', () => {
    const out = applyStructuralChange(
      sheet({ cells: { A1: { raw: 10 }, A2: { raw: 20 }, A3: { raw: '=A1+A2' } } }),
      { axis: 'row', at: 1, count: 1 }
    )
    expect(out.cells).toEqual({ A2: { raw: 10 }, A3: { raw: 20 }, A4: { raw: '=A2+A3' } })
  })

  it('一次插入多列', () => {
    const out = applyStructuralChange(sheet({ cells: { A2: { raw: 'x' } } }), { axis: 'row', at: 2, count: 3 })
    expect(Object.keys(out.cells)).toEqual(['A5'])
  })

  it('樣式跟著儲存格走', () => {
    const out = applyStructuralChange(
      sheet({ cells: { B2: { raw: 1, style: { bold: true } } } }),
      { axis: 'row', at: 1, count: 1 }
    )
    expect(out.cells.B3).toEqual({ raw: 1, style: { bold: true } })
  })

  it('列高跟著列走，欄寬不受插入列影響', () => {
    const out = applyStructuralChange(
      sheet({ rowHeights: { 3: 40 }, colWidths: { 3: 120 } }),
      { axis: 'row', at: 2, count: 1 }
    )
    expect(out.rowHeights).toEqual({ 4: 40 })
    expect(out.colWidths).toEqual({ 3: 120 })
  })

  it('插入在合併範圍中間，合併範圍撐大', () => {
    const out = applyStructuralChange(
      sheet({ merges: { A2: { r: 2, c: 1, rows: 3, cols: 2 } } }),
      { axis: 'row', at: 3, count: 1 }
    )
    expect(out.merges).toEqual({ A2: { r: 2, c: 1, rows: 4, cols: 2 } })
  })

  it('插入在合併範圍上方，合併範圍整塊下移（key 也要跟著換）', () => {
    const out = applyStructuralChange(
      sheet({ merges: { A2: { r: 2, c: 1, rows: 2, cols: 2 } } }),
      { axis: 'row', at: 1, count: 1 }
    )
    expect(out.merges).toEqual({ A3: { r: 3, c: 1, rows: 2, cols: 2 } })
  })

  it('在凍結區內插入，凍結列數跟著增加', () => {
    expect(applyStructuralChange(sheet({ freezeRows: 2 }), { axis: 'row', at: 1, count: 1 }).freezeRows).toBe(3)
    expect(applyStructuralChange(sheet({ freezeRows: 2 }), { axis: 'row', at: 5, count: 1 }).freezeRows).toBe(2)
  })
})

describe('applyStructuralChange：刪除列', () => {
  it('被刪除列的儲存格消失，下方往上移', () => {
    const out = applyStructuralChange(
      sheet({ cells: { A1: { raw: 1 }, A2: { raw: 2 }, A3: { raw: 3 } } }),
      { axis: 'row', at: 2, count: -1 }
    )
    expect(out.cells).toEqual({ A1: { raw: 1 }, A2: { raw: 3 } })
  })

  it('指向被刪除列的公式變成 #REF!', () => {
    const out = applyStructuralChange(
      sheet({ cells: { A2: { raw: 5 }, B5: { raw: '=A2*2' } } }),
      { axis: 'row', at: 2, count: -1 }
    )
    expect(out.cells.B4).toEqual({ raw: '=#REF!*2' })
  })

  it('SUM 範圍跟著收縮', () => {
    const out = applyStructuralChange(
      sheet({ cells: { A11: { raw: '=SUM(A1:A10)' } } }),
      { axis: 'row', at: 3, count: -1 }
    )
    expect(out.cells.A10).toEqual({ raw: '=SUM(A1:A9)' })
  })

  it('整塊合併範圍被刪掉就移除', () => {
    const out = applyStructuralChange(
      sheet({ merges: { A2: { r: 2, c: 1, rows: 2, cols: 2 } } }),
      { axis: 'row', at: 2, count: -2 }
    )
    expect(out.merges).toEqual({})
  })

  it('合併範圍收縮到只剩一格就不再是合併', () => {
    const out = applyStructuralChange(
      sheet({ merges: { A2: { r: 2, c: 1, rows: 2, cols: 1 } } }),
      { axis: 'row', at: 3, count: -1 }
    )
    expect(out.merges).toEqual({})
  })

  it('刪掉凍結區內的列，凍結列數減少', () => {
    expect(applyStructuralChange(sheet({ freezeRows: 3 }), { axis: 'row', at: 2, count: -1 }).freezeRows).toBe(2)
    expect(applyStructuralChange(sheet({ freezeRows: 3 }), { axis: 'row', at: 5, count: -1 }).freezeRows).toBe(3)
  })
})

describe('applyStructuralChange：欄', () => {
  it('插入欄改寫公式的欄座標並移動欄寬', () => {
    const out = applyStructuralChange(
      sheet({ cells: { A1: { raw: 1 }, B1: { raw: 2 }, C1: { raw: '=A1+B1' } }, colWidths: { 2: 150 } }),
      { axis: 'col', at: 2, count: 1 }
    )
    expect(out.cells).toEqual({ A1: { raw: 1 }, C1: { raw: 2 }, D1: { raw: '=A1+C1' } })
    expect(out.colWidths).toEqual({ 3: 150 })
  })

  it('刪除欄讓指向它的參照變成 #REF!', () => {
    const out = applyStructuralChange(
      sheet({ cells: { B1: { raw: 2 }, D1: { raw: '=B1+1' } } }),
      { axis: 'col', at: 2, count: -1 }
    )
    expect(out.cells).toEqual({ C1: { raw: '=#REF!+1' } })
  })
})

describe('applyStructuralChange：不改動輸入', () => {
  it('回傳新物件，原本的工作表保持不變（復原快照才不會被汙染）', () => {
    const original = sheet({ cells: { A1: { raw: '=A2' } } })
    const snapshot = JSON.stringify(original)
    applyStructuralChange(original, { axis: 'row', at: 1, count: 1 })
    expect(JSON.stringify(original)).toBe(snapshot)
  })
})
