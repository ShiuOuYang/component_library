/**
 * 把編輯器的工作表轉成 SheetJS 的 WorkSheet（純函式，不碰 DOM）。
 *
 * ⚠️ 原本的匯出有三個問題（都在真實 Excel 檔案上驗證過）：
 *
 *   1. 公式全部遺失 —— 寫出的是計算後的值。=SUM(A1:A3) 在 Excel 裡
 *      打開變成寫死的 6，改了 A1 也不會重算。
 *        原本： { t: 'n', v: 84 }
 *        現在： { t: 'n', v: 84, f: 'A1*2' }
 *
 *   2. 使用者輸入的數字被寫成文字 —— 編輯器把輸入存成字串 "42"，
 *      原封不動寫出就是 { t: 's', v: '42' }。在 Excel 裡是
 *      「以文字形式儲存的數字」（左上角綠色三角形），SUM 會略過它。
 *
 *   3. 整個網格都寫出去 —— 只填了 A1:A4，!ref 卻是 A1:Z25，
 *      每個空格都是一個空字串儲存格。在 Excel 裡 Ctrl+End 跳到 Z25、
 *      COUNTA 會把它們算進去。
 */
import * as XLSX from 'xlsx-js-style'
import { cellRef, parseRef } from './formula/cellRef'
import { evaluateFormula } from './formula/formulaEngine'

export interface ExportCellStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
  bg?: string
  align?: 'left' | 'center' | 'right'
  numFmt?: string
}

export interface ExportSheet {
  name: string
  cells: Record<string, { raw?: string | number; style?: ExportCellStyle }>
  colWidths: Record<number, number>
  rowHeights: Record<number, number>
  merges: Record<string, { r: number; c: number; rows: number; cols: number }>
}

/**
 * Excel 內部的錯誤碼（SheetJS 用同一組數字）。
 * 寫成 t:'e' 才會在 Excel 裡顯示成真正的錯誤值，而不是一段文字。
 */
const ERROR_CODES: Record<string, number> = {
  '#NULL!': 0x00,
  '#DIV/0!': 0x07,
  '#VALUE!': 0x0f,
  '#REF!': 0x17,
  '#NAME?': 0x1d,
  '#NUM!': 0x24,
  '#N/A': 0x2a,
}

/**
 * 看起來像數字的字串。
 * 與 Excel 輸入時的判斷一致：前後不能有空白、允許正負號、小數與科學記號。
 */
const NUMERIC = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

/**
 * 引擎接受但 Excel 不認得的函式名。
 * AVG 是這個編輯器的別名，Excel 只有 AVERAGE —— 原樣寫出去會變成 #NAME?。
 */
const FUNCTION_ALIASES: Record<string, string> = { AVG: 'AVERAGE' }

/** 把公式轉成 Excel 認得的寫法（目前只有函式別名需要處理） */
export function toExcelFormula(body: string): string {
  let out = ''
  let last = 0
  const re = /\b([A-Za-z]+)\s*\(/g
  let m: RegExpExecArray | null
  // 先把字串常值遮成等長空白，避免改到 "AVG(" 這種字串內容；
  // 長度不變，所以在 masked 上找到的索引可以直接拿回 body 切
  const masked = body.replace(/"(?:[^"]|"")*"/g, (s) => ' '.repeat(s.length))
  while ((m = re.exec(masked))) {
    const alias = FUNCTION_ALIASES[m[1].toUpperCase()]
    if (!alias) continue
    out += body.slice(last, m.index) + alias
    last = m.index + m[1].length
  }
  return out + body.slice(last)
}

/** 單一儲存格 → SheetJS 的 CellObject */
export function toCellObject(
  raw: string | number | undefined,
  sheet: Pick<ExportSheet, 'cells'>,
  enableFormula: boolean
): XLSX.CellObject | null {
  if (raw === undefined || raw === '') return null

  if (typeof raw === 'number') return { t: 'n', v: raw }

  if (raw.startsWith('=') && enableFormula) {
    const body = raw.slice(1)
    const value = evaluateFormula(body, sheet)
    const f = toExcelFormula(body)
    if (value === null) {
      // 引擎算不出來（例如還不支援的函式）：仍然寫出公式，讓 Excel 自己算
      return { t: 's', v: '', f }
    }
    if (typeof value === 'number') return { t: 'n', v: value, f }
    if (value in ERROR_CODES) return { t: 'e', v: ERROR_CODES[value], w: value, f }
    return { t: 's', v: value, f }
  }

  if (raw in ERROR_CODES) return { t: 'e', v: ERROR_CODES[raw], w: raw }
  if (NUMERIC.test(raw)) return { t: 'n', v: Number(raw) }
  return { t: 's', v: raw }
}

function toStyle(st: ExportCellStyle): Record<string, unknown> {
  const s: Record<string, unknown> = {
    font: {
      bold: st.bold || false,
      italic: st.italic || false,
      underline: st.underline ? true : undefined,
      color: st.color ? { rgb: st.color.replace('#', '') } : undefined,
    },
  }
  if (st.bg) s.fill = { patternType: 'solid', fgColor: { rgb: st.bg.replace('#', '') } }
  if (st.align) s.alignment = { horizontal: st.align }
  if (st.numFmt) s.numFmt = st.numFmt
  return s
}

/**
 * 工作表 → SheetJS WorkSheet。
 * 只寫有內容或有格式的儲存格；!ref 依實際使用範圍計算。
 */
export function sheetToWorksheet(sheet: ExportSheet, enableFormula = true): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  let maxR = 0
  let maxC = 0
  const extend = (r: number, c: number) => {
    if (r > maxR) maxR = r
    if (c > maxC) maxC = c
  }

  for (const key in sheet.cells) {
    const cell = sheet.cells[key]
    const obj = toCellObject(cell.raw, sheet, enableFormula)
    const style = cell.style && Object.keys(cell.style).length ? toStyle(cell.style) : null
    if (!obj && !style) continue

    const { r, c } = parseRef(key)
    const out: XLSX.CellObject = obj ?? { t: 'z' }
    if (style) out.s = style as XLSX.CellStyle
    ws[cellRef(r, c)] = out
    extend(r, c)
  }

  const merges = Object.values(sheet.merges)
  for (const m of merges) extend(m.r + m.rows - 1, m.c + m.cols - 1)
  if (merges.length) {
    ws['!merges'] = merges.map((m) => ({
      s: { r: m.r - 1, c: m.c - 1 },
      e: { r: m.r + m.rows - 2, c: m.c + m.cols - 2 },
    }))
  }

  ws['!ref'] = maxR && maxC ? `A1:${cellRef(maxR, maxC)}` : 'A1'

  // 欄寬：像素 → 字元寬（Excel 預設字型下約 7px 一個字元）
  const widthCols = Object.keys(sheet.colWidths).map(Number)
  if (widthCols.length) {
    const cols: XLSX.ColInfo[] = []
    for (const c of widthCols) cols[c - 1] = { wpx: sheet.colWidths[c] }
    ws['!cols'] = cols
  }

  // 列高：原本完全沒有匯出
  const heightRows = Object.keys(sheet.rowHeights).map(Number)
  if (heightRows.length) {
    const rows: XLSX.RowInfo[] = []
    for (const r of heightRows) rows[r - 1] = { hpx: sheet.rowHeights[r] }
    ws['!rows'] = rows
  }

  return ws
}

/** 多張工作表 → WorkBook */
export function buildWorkbook(sheets: ExportSheet[], enableFormula = true): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(wb, sheetToWorksheet(sheet, enableFormula), sheet.name)
  }
  return wb
}
