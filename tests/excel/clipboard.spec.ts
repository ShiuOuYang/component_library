import { describe, expect, it } from 'vitest'
import { parseTSV, toTSV } from '@/components/library/excel/clipboard'

describe('parseTSV：從 Excel 複製過來的文字', () => {
  it('Windows 的 \\r\\n 不會殘留在儲存格裡', () => {
    // ⚠️ 原本 split('\n') 會把 B1 存成 "B\r"（真實瀏覽器實測）
    expect(parseTSV('A\tB\r\nC\tD\r\n')).toEqual([['A', 'B'], ['C', 'D']])
  })

  it('結尾的換行不會多出一個空列', () => {
    // ⚠️ 原本多切出的空列會被當成「清空」，貼 2 列就清掉第 3 列的資料
    expect(parseTSV('X1\r\nX2\r\n')).toEqual([['X1'], ['X2']])
  })

  it('macOS 的 \\n 也支援', () => {
    expect(parseTSV('A\tB\nC\tD\n')).toEqual([['A', 'B'], ['C', 'D']])
  })

  it('沒有結尾換行也能正確收最後一列', () => {
    expect(parseTSV('A\tB')).toEqual([['A', 'B']])
  })

  it('區塊中間的空白格保留（Excel 貼上時會清空對應的目標格）', () => {
    expect(parseTSV('A\t\tC\r\n')).toEqual([['A', '', 'C']])
  })

  it('儲存格內的換行用引號包住時不會被當成分列', () => {
    expect(parseTSV('"第一行\n第二行"\tB\r\n')).toEqual([['第一行\n第二行', 'B']])
  })

  it('引號欄位內的 "" 是一個雙引號', () => {
    expect(parseTSV('"他說 ""好"""\tB\r\n')).toEqual([['他說 "好"', 'B']])
  })

  it('欄位中間的引號是普通字元（不是引號欄位）', () => {
    expect(parseTSV('5"\tB\r\n')).toEqual([['5"', 'B']])
  })

  it('空字串不產生任何列', () => {
    expect(parseTSV('')).toEqual([])
  })
})

describe('toTSV：複製到 Excel', () => {
  it('用 \\r\\n 分列並在結尾補換行（與 Excel 輸出一致）', () => {
    expect(toTSV([['A', 'B'], [1, 2]])).toBe('A\tB\r\n1\t2\r\n')
  })

  it('含換行、tab、引號的儲存格用引號包住', () => {
    expect(toTSV([['a\nb', 'c\td', 'e"f']])).toBe('"a\nb"\t"c\td"\t"e""f"\r\n')
  })

  it('來回轉換不失真', () => {
    const rows = [['普通', '含\n換行', '含"引號"', ''], ['1', '2', '3', '4']]
    expect(parseTSV(toTSV(rows))).toEqual(rows)
  })
})
