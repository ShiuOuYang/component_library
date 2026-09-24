/**
 * 工作表的結構性操作（插入 / 刪除列欄）
 *
 * 純函式：吃一份工作表、回傳新的工作表，不碰 Vue 也不碰 DOM。
 *
 * ⚠️ 原本 ChptExcelEditor 的 insertRow / deleteRow 只做了一件事 ——
 *    把儲存格的 key 往後或往前搬。其他所有東西都留在原地：
 *
 *      - 公式字串：A3 的 =A1+A2 搬到 A4 還是 =A1+A2 → 結果從 30 變 10
 *        （已在真實瀏覽器重現）
 *      - 合併範圍：還蓋在舊座標上，合併的格子跟內容錯開
 *      - 列高 / 欄寬：留在舊的列號，調過高度的那一列「換人」了
 *      - 凍結窗格：凍結 3 列後在第 1 列插入，凍結線沒跟著下移
 *
 *    這裡把五樣東西一起處理，並且支援一次插入 / 刪除多列（Excel 選取幾列就插幾列）。
 */
import { cellRef, parseRef } from './formula/cellRef'
import { adjustFormulaForChange, adjustIndex, type StructuralChange } from './formula/refRewrite'

export interface MergeRange {
  r: number
  c: number
  rows: number
  cols: number
}

/** 結構操作需要的工作表形狀 */
export interface StructuralSheet<Cell extends { raw?: string | number }> {
  cells: Record<string, Cell>
  colWidths: Record<number, number>
  rowHeights: Record<number, number>
  merges: Record<string, MergeRange>
  freezeRows: number
  freezeCols: number
}

/** 以 1-based 索引為鍵的尺寸表（列高 / 欄寬）跟著位移；被刪的直接丟掉 */
function remapSizes(sizes: Record<number, number>, change: StructuralChange): Record<number, number> {
  const out: Record<number, number> = {}
  for (const key in sizes) {
    const moved = adjustIndex(Number(key), change)
    if (moved !== null) out[moved] = sizes[key]
  }
  return out
}

/**
 * 合併範圍跟著位移。
 * 插入在合併範圍中間 → 範圍撐大；刪除一部分 → 收縮；整塊被刪 → 移除。
 */
function remapMerges(
  merges: Record<string, MergeRange>,
  change: StructuralChange
): Record<string, MergeRange> {
  const out: Record<string, MergeRange> = {}
  const startKey = change.axis === 'row' ? 'r' : 'c'
  const spanKey = change.axis === 'row' ? 'rows' : 'cols'

  for (const key in merges) {
    const m = merges[key]
    const lo = m[startKey]
    const hi = m[startKey] + m[spanKey] - 1
    let newLo: number
    let newHi: number

    if (change.count > 0) {
      newLo = adjustIndex(lo, change)!
      newHi = adjustIndex(hi, change)!
    } else {
      const n = -change.count
      const first = change.at
      const last = change.at + n - 1
      if (lo >= first && hi <= last) continue // 整塊被刪
      newLo = lo < first ? lo : lo > last ? lo - n : first
      newHi = hi > last ? hi - n : hi < first ? hi : first - 1
    }

    const next: MergeRange = { ...m, [startKey]: newLo, [spanKey]: newHi - newLo + 1 }
    // 收縮到只剩一格就不算合併了
    if (next.rows * next.cols <= 1) continue
    out[cellRef(next.r, next.c)] = next
  }
  return out
}

/** 凍結的列數 / 欄數：凍結區內插入就變多，刪掉凍結區內的列就變少 */
function remapFreeze(frozen: number, change: StructuralChange): number {
  if (frozen === 0) return 0
  if (change.count > 0) return change.at <= frozen ? frozen + change.count : frozen
  const n = -change.count
  const first = change.at
  const last = change.at + n - 1
  // 凍結區是 1..frozen，算出被刪掉的交集大小
  const overlap = Math.max(0, Math.min(last, frozen) - Math.max(first, 1) + 1)
  return frozen - overlap
}

/**
 * 對工作表套用一次插入 / 刪除。
 * 回傳新物件；呼叫端負責把它寫回響應式狀態。
 */
export function applyStructuralChange<Cell extends { raw?: string | number }>(
  sheet: StructuralSheet<Cell>,
  change: StructuralChange
): StructuralSheet<Cell> {
  const key = change.axis === 'row' ? 'r' : 'c'
  const cells: Record<string, Cell> = {}

  for (const ref in sheet.cells) {
    const pos = parseRef(ref)
    const moved = adjustIndex(pos[key], change)
    if (moved === null) continue // 這格所在的列（欄）被刪掉了

    const cell = sheet.cells[ref]
    const raw = cell.raw
    const rewritten =
      typeof raw === 'string' && raw.startsWith('=')
        ? '=' + adjustFormulaForChange(raw.slice(1), change)
        : raw

    const next = { ...pos, [key]: moved }
    cells[cellRef(next.r, next.c)] = rewritten === raw ? cell : { ...cell, raw: rewritten }
  }

  return {
    ...sheet,
    cells,
    rowHeights: change.axis === 'row' ? remapSizes(sheet.rowHeights, change) : sheet.rowHeights,
    colWidths: change.axis === 'col' ? remapSizes(sheet.colWidths, change) : sheet.colWidths,
    merges: remapMerges(sheet.merges, change),
    freezeRows: change.axis === 'row' ? remapFreeze(sheet.freezeRows, change) : sheet.freezeRows,
    freezeCols: change.axis === 'col' ? remapFreeze(sheet.freezeCols, change) : sheet.freezeCols,
  }
}
