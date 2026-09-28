import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addMonths,
  dateToSerial,
  endOfMonth,
  formatSerial,
  isDateFormat,
  parseDateText,
  serialToParts,
} from '@/components/library/excel/formula/dates'
import { evaluateFormula, type FormulaSheet } from '@/components/library/excel/formula/formulaEngine'
import { formatValue, generalAlign, impliedFormat } from '@/components/library/excel/values'

/**
 * 日期函式（第七批）。原本完全沒有日期：=TODAY() 是 #NAME?、TEXT 不認日期格式。
 * 數值以 Excel 1900 日期系統的序號為準（與 Excel / .xlsx 檔案互通）。
 */

function sheet(cells: Record<string, string | number>): FormulaSheet {
  const out: FormulaSheet = { cells: {} }
  for (const k in cells) out.cells[k] = { raw: cells[k] }
  return out
}
const EMPTY = sheet({})
const ev = (f: string, s: FormulaSheet = EMPTY) => evaluateFormula(f, s)

afterEach(() => {
  vi.useRealTimers()
})

describe('序號換算（與 Excel 相同）', () => {
  it.each([
    [1900, 1, 1, 1],
    [1900, 2, 28, 59],
    [1900, 3, 1, 61], // 60 是 Lotus 相容的假日期 1900-02-29
    [2000, 1, 1, 36526],
    [2026, 9, 28, 46293],
    [9999, 12, 31, 2958465],
  ])('%i-%i-%i → %i', (y, m, d, serial) => {
    expect(dateToSerial(y, m, d)).toBe(serial)
    const p = serialToParts(serial)
    expect([p.year, p.month, p.day]).toEqual([y, m, d])
  })

  it('月、日溢位會滾動；0~1899 年加 1900；超出範圍為 null', () => {
    expect(dateToSerial(2026, 13, 1)).toBe(dateToSerial(2027, 1, 1))
    expect(dateToSerial(2026, 3, 0)).toBe(dateToSerial(2026, 2, 28))
    expect(dateToSerial(26, 1, 1)).toBe(dateToSerial(1926, 1, 1))
    expect(dateToSerial(10000, 1, 1)).toBeNull()
  })

  it('序號 60 是 1900-02-29（Excel 的閏年 bug）', () => {
    expect(serialToParts(60)).toMatchObject({ year: 1900, month: 2, day: 29 })
  })

  it('時間是小數部分', () => {
    expect(serialToParts(46293.75)).toMatchObject({ hour: 18, minute: 0, second: 0 })
  })

  it('星期（0 = 週日）', () => {
    expect(serialToParts(46293).weekday).toBe(1) // 2026-09-28 是週一
  })
})

describe('parseDateText', () => {
  it('支援 - / . 分隔、可帶時間、單純時間', () => {
    expect(parseDateText('2026-09-28')).toBe(46293)
    expect(parseDateText('2026/9/28')).toBe(46293)
    expect(parseDateText('2026.9.28')).toBe(46293)
    expect(parseDateText('2026-09-28 12:00')).toBe(46293.5)
    expect(parseDateText('06:00')).toBe(0.25)
  })

  it('不存在的日期不滾動，回傳 null', () => {
    expect(parseDateText('2026-02-30')).toBeNull()
    expect(parseDateText('2026-13-01')).toBeNull()
    expect(parseDateText('25:00')).toBeNull()
    expect(parseDateText('hello')).toBeNull()
  })

  it('addMonths / endOfMonth 貼齊月底', () => {
    const jan31 = dateToSerial(2026, 1, 31)!
    expect(serialToParts(addMonths(jan31, 1)!)).toMatchObject({ month: 2, day: 28 })
    expect(serialToParts(endOfMonth(jan31, 1)!)).toMatchObject({ month: 2, day: 28 })
    expect(serialToParts(endOfMonth(jan31, -2)!)).toMatchObject({ year: 2025, month: 11, day: 30 })
  })
})

describe('日期格式', () => {
  it('isDateFormat', () => {
    expect(isDateFormat('yyyy-mm-dd')).toBe(true)
    expect(isDateFormat('hh:mm')).toBe(true)
    expect(isDateFormat('mm')).toBe(true)
    expect(isDateFormat('0.00')).toBe(false)
    expect(isDateFormat('#,##0')).toBe(false)
    expect(isDateFormat('"days"0')).toBe(false)
  })

  it('m 在 h 之後或 s 之前是分鐘，否則是月份', () => {
    expect(formatSerial(46293.5 + 5 / 1440, 'yyyy/m/d hh:mm')).toBe('2026/9/28 12:05')
    expect(formatSerial(46293.5 + 5 / 1440 + 7 / 86400, 'mm:ss')).toBe('05:07')
    expect(formatSerial(46293, 'mm')).toBe('09')
  })

  it('yy、d、引號字面文字', () => {
    expect(formatSerial(46293, 'yy"年"m"月"d"日"')).toBe('26年9月28日')
  })
})

describe('日期函式', () => {
  it('DATE / YEAR / MONTH / DAY', () => {
    expect(ev('DATE(2026,9,28)')).toBe(46293)
    expect(ev('YEAR(46293)&"-"&MONTH(46293)&"-"&DAY(46293)')).toBe('2026-9-28')
    expect(ev('DATE(2026,14,1)')).toBe(ev('DATE(2027,2,1)'))
    expect(ev('DATE(10000,1,1)')).toBe('#NUM!')
  })

  it('日期文字可以直接當引數，也能參與運算', () => {
    expect(ev('YEAR("2026-09-28")')).toBe(2026)
    expect(ev('"2026-09-28"+7')).toBe(46300)
    expect(ev('A2-A1', sheet({ A1: '2026-09-01', A2: '2026-09-28' }))).toBe(27)
  })

  it('TIME / HOUR / MINUTE / SECOND / TIMEVALUE', () => {
    expect(ev('TIME(18,30,0)')).toBeCloseTo(0.7708333, 6)
    expect(ev('HOUR(TIME(18,30,15))&":"&MINUTE(TIME(18,30,15))&":"&SECOND(TIME(18,30,15))')).toBe('18:30:15')
    expect(ev('TIMEVALUE("06:00")')).toBe(0.25)
    expect(ev('TIME(-1,0,0)')).toBe('#NUM!')
  })

  it('DATEVALUE：只取日期部分；不合法是 #VALUE!', () => {
    expect(ev('DATEVALUE("2026-09-28 18:00")')).toBe(46293)
    expect(ev('DATEVALUE("2026-02-30")')).toBe('#VALUE!')
  })

  it('TODAY / NOW 用當地時間', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 28, 18, 0, 0))
    expect(ev('TODAY()')).toBe(46293)
    expect(ev('NOW()')).toBe(46293.75)
  })

  it('WEEKDAY 三種類型', () => {
    // 2026-09-28 是週一
    expect(ev('WEEKDAY(46293)')).toBe(2)
    expect(ev('WEEKDAY(46293,2)')).toBe(1)
    expect(ev('WEEKDAY(46293,3)')).toBe(0)
    expect(ev('WEEKDAY(46293,9)')).toBe('#NUM!')
  })

  it('WEEKNUM', () => {
    expect(ev('WEEKNUM(DATE(2026,1,1))')).toBe(1)
    // 2026-01-04 是週日：週日起算時是第 2 週，週一起算時還在第 1 週
    expect(ev('WEEKNUM(DATE(2026,1,4))')).toBe(2)
    expect(ev('WEEKNUM(DATE(2026,1,4),2)')).toBe(1)
  })

  it('EDATE / EOMONTH', () => {
    expect(ev('EDATE(DATE(2026,1,31),1)')).toBe(ev('DATE(2026,2,28)'))
    expect(ev('EDATE(DATE(2024,1,31),1)')).toBe(ev('DATE(2024,2,29)'))
    expect(ev('EOMONTH(DATE(2026,9,15),0)')).toBe(ev('DATE(2026,9,30)'))
    expect(ev('EOMONTH(DATE(2026,9,15),-1)')).toBe(ev('DATE(2026,8,31)'))
  })

  it('DAYS', () => {
    expect(ev('DAYS("2026-12-25","2026-09-28")')).toBe(88)
  })

  it('DATEDIF 各單位', () => {
    const f = (u: string) => ev(`DATEDIF(DATE(2020,5,20),DATE(2026,9,28),"${u}")`)
    expect(f('Y')).toBe(6)
    expect(f('M')).toBe(76)
    expect(f('D')).toBe(ev('DATE(2026,9,28)-DATE(2020,5,20)'))
    expect(f('YM')).toBe(4)
    expect(f('MD')).toBe(8)
    expect(f('YD')).toBe(131)
    // 日還沒到不算一個月
    expect(ev('DATEDIF(DATE(2026,1,31),DATE(2026,2,28),"M")')).toBe(0)
    expect(ev('DATEDIF(DATE(2026,3,31),DATE(2026,3,1),"D")')).toBe('#NUM!')
    expect(ev('DATEDIF(1,2,"X")')).toBe('#NUM!')
  })

  it('NETWORKDAYS / WORKDAY：跳過週末與假日清單', () => {
    // 2026-09-28（一）到 2026-10-09（五）：兩週 10 個工作天
    expect(ev('NETWORKDAYS(DATE(2026,9,28),DATE(2026,10,9))')).toBe(10)
    // 國慶日 10/9 放假
    expect(ev('NETWORKDAYS(DATE(2026,9,28),DATE(2026,10,9),A1:A2)', sheet({ A1: '2026-10-09' }))).toBe(9)
    // 反過來算是負數
    expect(ev('NETWORKDAYS(DATE(2026,10,9),DATE(2026,9,28))')).toBe(-10)
    // 週五 + 1 個工作天 = 下週一
    expect(ev('WORKDAY(DATE(2026,10,2),1)')).toBe(ev('DATE(2026,10,5)'))
    expect(ev('WORKDAY(DATE(2026,10,5),-1)')).toBe(ev('DATE(2026,10,2)'))
    expect(ev('WORKDAY(DATE(2026,10,8),1,A1)', sheet({ A1: '2026-10-09' }))).toBe(ev('DATE(2026,10,12)'))
  })

  it('TEXT 支援日期格式', () => {
    expect(ev('TEXT(DATE(2026,9,28),"yyyy/mm/dd")')).toBe('2026/09/28')
    expect(ev('TEXT(TIME(8,5,0),"hh:mm")')).toBe('08:05')
    expect(ev('TEXT(-1,"yyyy")')).toBe('#VALUE!')
    // 數字格式照舊
    expect(ev('TEXT(1234.5,"#,##0.00")')).toBe('1,234.50')
  })
})

describe('儲存格顯示', () => {
  it('formatValue：日期格式套在序號或手打的日期文字上', () => {
    expect(formatValue(46293, 'yyyy-mm-dd')).toBe('2026-09-28')
    expect(formatValue('2026/9/28', 'yyyy-mm-dd')).toBe('2026-09-28')
    expect(formatValue('abc', 'yyyy-mm-dd')).toBe('abc')
    expect(formatValue(46293.5, 'yyyy-mm-dd hh:mm')).toBe('2026-09-28 12:00')
  })

  /** 否則 =TODAY() 顯示成 46293，看起來像壞掉 */
  it('impliedFormat：最外層是日期函式的公式自動用日期格式', () => {
    expect(impliedFormat('=TODAY()')).toBe('yyyy-mm-dd')
    expect(impliedFormat('= date(2026,1,1)')).toBe('yyyy-mm-dd')
    expect(impliedFormat('=NOW()')).toBe('yyyy-mm-dd hh:mm')
    expect(impliedFormat('=TIME(8,0,0)')).toBe('hh:mm')
    expect(impliedFormat('=YEAR(TODAY())')).toBeUndefined()
    expect(impliedFormat('=A1+1')).toBeUndefined()
    // 日期相減是天數，不是日期
    expect(impliedFormat('=DATE(2026,12,25)-A1')).toBeUndefined()
    expect(impliedFormat('=EDATE(A1,1)')).toBe('yyyy-mm-dd')
    expect(impliedFormat('=DATE(2026,1,1)&")"')).toBeUndefined()
    expect(impliedFormat(42)).toBeUndefined()
  })

  it('手打的日期靠右（與 Excel 一樣是日期值）', () => {
    expect(generalAlign('2026-09-28')).toBe('right')
    expect(generalAlign('2026-02-30')).toBe('left')
  })
})
