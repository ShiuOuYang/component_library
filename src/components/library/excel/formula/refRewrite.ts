/**
 * 公式參照改寫
 *
 * Excel 在三種情況下會改寫公式裡的參照，而原本的編輯器一種都沒做：
 *
 *   1. 複製貼上 / 填充控點 —— 相對參照跟著位移
 *        B1 的 =A1*2 往下拉到 B2 → =A2*2
 *        $A$1 是絕對參照，不動；$A1 / A$1 只固定有 $ 的那一邊
 *
 *   2. 插入列欄 —— 插入點之後的參照（含絕對參照）往後推
 *        在第 1 列上方插入一列，A3 的 =A1+A2 → A4 的 =A2+A3
 *        ⚠️ 原本只搬動儲存格的 key、公式字串原封不動，於是
 *           =A1+A2 從 30 默默變成 10（已在真實瀏覽器重現）
 *
 *   3. 刪除列欄 —— 指向被刪除位置的參照變成 #REF!，之後的往前拉，
 *      範圍則是收縮：刪掉 SUM(A1:A10) 中間的第 3 列 → SUM(A1:A9)
 *
 * 實作採「掃描器」而不是一條大正規式直接 replace：
 *   - 字串常值裡的 "A1" 不能被改寫
 *   - LOG10( / ATAN2( 這種「字母+數字+左括號」是函式名，不是參照
 *   - Sheet2!A1 是別張表的參照，插入本表的列不該動到它
 *
 * 跨工作表（第七批補上）：
 *   - 在 Sheet1 插入 / 刪除列欄時，**別張表**裡指向 Sheet1 的參照（=Sheet1!A5）也要跟著動
 *     —— 原本只改寫本表，別張表的彙總公式默默指到錯的格子
 *   - 工作表改名：所有 =舊名!A1 改成 =新名!A1（原本改名後全部變成找不到工作表）
 *   - 刪除工作表：指向它的參照變成 #REF!
 */
import { colName } from './cellRef'

/** 參照的一個端點 */
export interface RefPoint {
  r: number
  c: number
  /** 欄是否為絕對（$A） */
  cAbs: boolean
  /** 列是否為絕對（A$1） */
  rAbs: boolean
}

/** 一個參照：單格或範圍 */
export interface ParsedRef {
  start: RefPoint
  end?: RefPoint
  /** 前面有 `Sheet!`，指向別張工作表 */
  external: boolean
  /** 工作表前綴的名稱（去掉引號）；沒有前綴時為 null */
  sheet: string | null
}

/**
 * 回傳字串 = 取代成該字串（只取代參照本身，工作表前綴另外處理）；回傳 null = 維持原樣。
 * 回傳 '#REF!' 時連同工作表前綴一起換掉（Sheet2!#REF! 不是合法的公式）。
 */
type RefMapper = (ref: ParsedRef) => string | null

/** 工作表前綴改名：回傳新名稱（不含引號）；null = 不改 */
type SheetMapper = (sheet: string) => string | null

/** Excel 的欄數上限（XFD）與列數上限 */
const MAX_COL = 16384
const MAX_ROW = 1048576

const REF_AT = /(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?::(\$?)([A-Za-z]{1,3})(\$?)(\d+))?/y

function colIndex(letters: string): number {
  let n = 0
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

function point(cAbs: string, col: string, rAbs: string, row: string): RefPoint {
  return { c: colIndex(col), r: parseInt(row, 10), cAbs: cAbs === '$', rAbs: rAbs === '$' }
}

/** 無引號的工作表前綴（與 parser 的 UNQUOTED_SHEET 相同） */
const UNQUOTED_SHEET_AT = /([A-Za-z_\u00C0-\uFFFF][A-Za-z0-9_.\u00C0-\uFFFF]*)!/y
const PLAIN_SHEET_NAME = /^[A-Za-z_\u00C0-\uFFFF][A-Za-z0-9_.\u00C0-\uFFFF]*$/
/** 看起來像儲存格位址的名稱（AB12）不加引號會被當成參照 */
const LOOKS_LIKE_CELL = /^[A-Za-z]{1,3}\d+$/

/** 工作表名稱寫進公式時的樣子：需要時加引號，單引號寫成兩個 */
export function quoteSheetName(name: string): string {
  if (PLAIN_SHEET_NAME.test(name) && !LOOKS_LIKE_CELL.test(name)) return name
  return `'${name.replace(/'/g, "''")}'`
}

/** Excel 的工作表名稱不分大小寫 */
export function sameSheet(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/** 參照前一個字元若是這些，代表它屬於別的識別字（例如 X_A1、1E5） */
const IDENT_BEFORE = /[A-Za-z0-9_.$]/
/** 參照後一個字元若是這些，代表它其實是函式名或更長的識別字（LOG10(、A1B） */
const IDENT_AFTER = /[A-Za-z0-9_(]/

/** 把一個端點寫回文字；座標超出範圍時回傳 null */
export function formatPoint(p: RefPoint): string | null {
  if (p.r < 1 || p.c < 1 || p.r > MAX_ROW || p.c > MAX_COL) return null
  return `${p.cAbs ? '$' : ''}${colName(p.c)}${p.rAbs ? '$' : ''}${p.r}`
}

/** 把一個參照寫回文字；任一端點無效時回傳 '#REF!' */
export function formatRef(ref: ParsedRef): string {
  const a = formatPoint(ref.start)
  if (a === null) return '#REF!'
  if (!ref.end) return a
  const b = formatPoint(ref.end)
  if (b === null) return '#REF!'
  return `${a}:${b}`
}

/** 從 i 讀一個工作表前綴（'My Sheet'! 或 Sheet2!）；讀不到回傳 null */
function readSheetPrefix(formula: string, i: number): { name: string; length: number } | null {
  if (formula[i] === "'") {
    let j = i + 1
    let name = ''
    while (j < formula.length) {
      if (formula[j] === "'") {
        if (formula[j + 1] === "'") { name += "'"; j += 2; continue }
        break
      }
      name += formula[j++]
    }
    if (formula[j] !== "'" || formula[j + 1] !== '!') return null
    return { name, length: j + 2 - i }
  }
  UNQUOTED_SHEET_AT.lastIndex = i
  const m = UNQUOTED_SHEET_AT.exec(formula)
  return m ? { name: m[1], length: m[0].length } : null
}

/**
 * 掃描公式中的每一個參照，交給 mapper 決定要不要改寫。
 * 字串常值（"..."，含 "" 跳脫）原樣保留。
 * sheetMapper 可以改寫工作表前綴（工作表改名用）。
 */
export function mapRefs(formula: string, mapper: RefMapper, sheetMapper?: SheetMapper): string {
  let out = ''
  let i = 0
  while (i < formula.length) {
    const ch = formula[i]

    // 字串常值：整段照抄
    if (ch === '"') {
      let j = i + 1
      while (j < formula.length) {
        if (formula[j] === '"') {
          if (formula[j + 1] === '"') { j += 2; continue }
          break
        }
        j++
      }
      out += formula.slice(i, j + 1)
      i = j + 1
      continue
    }

    const prev = i > 0 ? formula[i - 1] : ''
    if (!IDENT_BEFORE.test(prev)) {
      // 先看是不是「工作表前綴 + 參照」：Sheet2!A1、'My Sheet'!A1:B3
      const prefix = readSheetPrefix(formula, i)
      if (prefix) {
        const at = i + prefix.length
        REF_AT.lastIndex = at
        const m = REF_AT.exec(formula)
        if (m && !IDENT_AFTER.test(formula[at + m[0].length] ?? '')) {
          const ref: ParsedRef = {
            start: point(m[1], m[2], m[3], m[4]),
            end: m[6] ? point(m[5], m[6], m[7], m[8]) : undefined,
            external: true,
            sheet: prefix.name,
          }
          const replaced = mapper(ref)
          if (replaced === '#REF!') {
            out += '#REF!'
          } else {
            const renamed = sheetMapper?.(prefix.name) ?? null
            out += renamed === null ? formula.slice(i, at) : `${quoteSheetName(renamed)}!`
            out += replaced ?? m[0]
          }
          i = at + m[0].length
          continue
        }
      }

      REF_AT.lastIndex = i
      const m = REF_AT.exec(formula)
      if (m) {
        const next = formula[i + m[0].length] ?? ''
        if (!IDENT_AFTER.test(next)) {
          const ref: ParsedRef = {
            start: point(m[1], m[2], m[3], m[4]),
            end: m[6] ? point(m[5], m[6], m[7], m[8]) : undefined,
            external: false,
            sheet: null,
          }
          const replaced = mapper(ref)
          out += replaced ?? m[0]
          i += m[0].length
          continue
        }
      }
    }

    out += ch
    i++
  }
  return out
}

/**
 * 複製貼上 / 填充：相對參照依位移量平移，絕對參照不動。
 * 平移後超出工作表（例如 A1 往上移）的參照變成 #REF!，與 Excel 相同。
 */
export function shiftFormula(formula: string, dr: number, dc: number): string {
  if (dr === 0 && dc === 0) return formula
  const move = (p: RefPoint): RefPoint => ({
    ...p,
    r: p.rAbs ? p.r : p.r + dr,
    c: p.cAbs ? p.c : p.c + dc,
  })
  return mapRefs(formula, (ref) =>
    formatRef({ ...ref, start: move(ref.start), end: ref.end && move(ref.end) })
  )
}

/** 插入 / 刪除列欄的描述 */
export interface StructuralChange {
  axis: 'row' | 'col'
  /** 1-based 起點 */
  at: number
  /** 正數 = 在 at 之前插入幾列（欄）；負數 = 從 at 開始刪除幾列（欄） */
  count: number
}

/** 單一座標在結構變動後的新位置；被刪掉時回傳 null */
export function adjustIndex(idx: number, change: StructuralChange): number | null {
  const { at, count } = change
  if (count > 0) return idx >= at ? idx + count : idx
  const n = -count
  const last = at + n - 1
  if (idx < at) return idx
  if (idx > last) return idx - n
  return null
}

/**
 * 插入 / 刪除列欄後改寫公式。
 *
 * 與複製貼上不同，這裡**絕對參照也要跟著動** —— $A$5 指的是「那一格」，
 * 那一格被推到第 6 列，參照就該變 $A$6（Excel 行為）。
 *
 * 範圍的處理：
 *   - 插入在範圍中間 → 範圍撐大（A1:A10 在第 5 列插入 → A1:A11）
 *   - 刪除範圍的一部分 → 範圍收縮（A1:A10 刪第 3 列 → A1:A9）
 *   - 刪除整個範圍 → #REF!
 */
/**
 * 公式所在的表與發生插入 / 刪除的表。
 * 不給時視為「同一張表」：沒有前綴的參照受影響、有前綴的不受影響（原本的行為）。
 */
export interface ChangeScope {
  /** 發生插入 / 刪除的工作表名稱 */
  changedSheet: string
  /** 這條公式所在的工作表名稱 */
  formulaSheet: string
}

export function adjustFormulaForChange(formula: string, change: StructuralChange, scope?: ChangeScope): string {
  const key = change.axis === 'row' ? 'r' : 'c'

  /** 這個參照指到的表是不是發生變動的那張 */
  const affected = (ref: ParsedRef): boolean => {
    if (!scope) return ref.sheet === null
    return sameSheet(ref.sheet ?? scope.formulaSheet, scope.changedSheet)
  }

  return mapRefs(formula, (ref) => {
    // 別張工作表的參照不受那張表的插入刪除影響
    if (!affected(ref)) return null

    if (!ref.end) {
      const moved = adjustIndex(ref.start[key], change)
      if (moved === null) return '#REF!'
      if (moved === ref.start[key]) return null
      return formatRef({ ...ref, start: { ...ref.start, [key]: moved } })
    }

    // 範圍：先把兩端排成小到大
    const lo = Math.min(ref.start[key], ref.end[key])
    const hi = Math.max(ref.start[key], ref.end[key])
    let newLo: number
    let newHi: number

    if (change.count > 0) {
      newLo = adjustIndex(lo, change)!
      newHi = adjustIndex(hi, change)!
    } else {
      const n = -change.count
      const first = change.at
      const last = change.at + n - 1
      // 整個範圍都被刪掉
      if (lo >= first && hi <= last) return '#REF!'
      newLo = lo < first ? lo : lo > last ? lo - n : first
      newHi = hi > last ? hi - n : hi < first ? hi : first - 1
    }

    if (newLo === lo && newHi === hi) return null
    const startIsLo = ref.start[key] <= ref.end[key]
    return formatRef({
      ...ref,
      start: { ...ref.start, [key]: startIsLo ? newLo : newHi },
      end: { ...ref.end, [key]: startIsLo ? newHi : newLo },
    })
  })
}

/** 工作表改名：把指向 oldName 的前綴改成 newName（不分大小寫；必要時加引號） */
export function renameSheetInFormula(formula: string, oldName: string, newName: string): string {
  return mapRefs(formula, () => null, (sheet) => (sameSheet(sheet, oldName) ? newName : null))
}

/** 刪除工作表：指向它的參照變成 #REF!（與 Excel 相同） */
export function removeSheetFromFormula(formula: string, removedName: string): string {
  return mapRefs(formula, (ref) => (ref.sheet !== null && sameSheet(ref.sheet, removedName) ? '#REF!' : null))
}
