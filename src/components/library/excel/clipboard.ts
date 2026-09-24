/**
 * 試算表剪貼簿格式（TSV）
 *
 * 從 Excel / Google 試算表 / LibreOffice 複製出來的文字長這樣：
 *
 *     A1<TAB>B1<CR><LF>A2<TAB>B2<CR><LF>
 *
 *   - 欄以 \t 分隔，列以 \r\n（Windows）或 \n（macOS）分隔
 *   - **最後一列後面也有換行**
 *   - 儲存格內含 \t、換行或 " 時，整格用 "..." 包起來，內部的 " 寫成 ""
 *
 * ⚠️ 原本的解析是 text.split('\n').map(line => line.split('\t'))，
 *    在真實瀏覽器實測出兩個問題：
 *      1. Windows 的 \r 留在每列最後一格裡（B5 存成 "CTRL_B\r"）
 *      2. 結尾的換行多切出一個空列，而空字串的處理是 delete ——
 *         貼 2 列會把第 3 列使用者原本的資料清掉
 */

/** 解析剪貼簿文字成二維陣列 */
export function parseTSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let i = 0
  let inQuotes = false
  // 只有在欄位開頭遇到 " 才算引號欄位；中間的 " 是普通字元
  let fieldStart = true

  const endField = () => {
    row.push(field)
    field = ''
    fieldStart = true
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"' && fieldStart) {
      inQuotes = true
      fieldStart = false
      i++
      continue
    }
    if (ch === '\t') {
      endField()
      i++
      continue
    }
    if (ch === '\r' && text[i + 1] === '\n') {
      endRow()
      i += 2
      continue
    }
    if (ch === '\n' || ch === '\r') {
      endRow()
      i++
      continue
    }
    field += ch
    fieldStart = false
    i++
  }

  // 最後一列若沒有結尾換行，要補收
  if (field !== '' || row.length > 0) endRow()
  return rows
}

/** 儲存格內容需要用引號包起來嗎（含 tab、換行或引號） */
function needsQuote(s: string): boolean {
  return /[\t\r\n"]/.test(s)
}

/**
 * 二維陣列轉成剪貼簿文字。
 * 用 \r\n 分列並在結尾補換行 —— 與 Excel 自己寫出的格式一致，
 * 貼到 Excel 時儲存格邊界才不會錯位。
 */
export function toTSV(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((v) => {
          const s = String(v)
          return needsQuote(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join('\t')
    )
    .join('\r\n')
    .concat(rows.length ? '\r\n' : '')
}
