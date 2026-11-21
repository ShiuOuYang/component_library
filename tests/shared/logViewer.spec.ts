import { describe, expect, it } from 'vitest'
import { compileSearch, countLevels, filterLogs, formatLogLine, formatLogTime, parseLogLine, toDate, type LogEntry } from '@/components/library/shared/logViewer'

describe('parseLogLine', () => {
  it.each([
    ['2026-11-21 08:30:01.123 [WARN] (SMT-02) 吸嘴真空低', { time: '2026-11-21 08:30:01.123', level: 'warn', source: 'SMT-02', message: '吸嘴真空低' }],
    ['2026-11-21T08:30:01Z ERROR SMT-02: 卡料', { time: '2026-11-21T08:30:01Z', level: 'error', source: 'SMT-02', message: '卡料' }],
    ['2026-11-21 08:30:01,5 <crit> [mes] down', { time: '2026-11-21 08:30:01.5', level: 'fatal', source: 'mes', message: 'down' }],
    ['DBG: tick', { time: null, level: 'debug', source: undefined, message: 'tick' }],
    ['just a message', { time: null, level: 'info', source: undefined, message: 'just a message' }],
    ['2026-11-21 08:30:01+08:00 Hello world', { time: '2026-11-21 08:30:01+08:00', level: 'info', source: undefined, message: 'Hello world' }],
  ])('%s', (line, expected) => {
    expect(parseLogLine(line)).toEqual(expected)
  })
})

describe('compileSearch', () => {
  it('沒有條件：全部符合、不標示', () => {
    const m = compileSearch('  ')
    expect(m.active).toBe(false)
    expect(m.test('x')).toBe(true)
    expect(m.segments('abc')).toEqual([{ text: 'abc', match: false }])
  })
  it('一般文字不分大小寫、特殊字元照字面；可重複使用（lastIndex 不影響）', () => {
    const m = compileSearch('a.b')
    expect(m.test('XA.BX')).toBe(true)
    expect(m.test('XA.BX')).toBe(true)
    expect(m.test('aXb')).toBe(false)
    expect(m.segments('1 a.b 2 A.B')).toEqual([
      { text: '1 ', match: false },
      { text: 'a.b', match: true },
      { text: ' 2 ', match: false },
      { text: 'A.B', match: true },
    ])
  })
  it('/正規式/：flags 有 i 才不分大小寫；寫錯時回報並退回斜線裡的文字', () => {
    expect(compileSearch('/N[1-3]\\d/').test('吸嘴 N16')).toBe(true)
    expect(compileSearch('/abc/').test('ABC')).toBe(false)
    expect(compileSearch('/abc/i').test('ABC')).toBe(true)
    const bad = compileSearch('/a[/')
    expect(bad.error).toMatch(/Invalid regular expression/)
    expect(bad.test('xa[y')).toBe(true)
  })
  it('空字串的符合不標示；沒有符合時整段不標示', () => {
    expect(compileSearch('/x*/').segments('ab')).toEqual([{ text: 'ab', match: false }])
    expect(compileSearch('zz').segments('ab')).toEqual([{ text: 'ab', match: false }])
    expect(compileSearch('b').segments('ab')).toEqual([
      { text: 'a', match: false },
      { text: 'b', match: true },
    ])
  })
})

const entries: LogEntry[] = [
  { time: 0, level: 'info', message: 'start', source: 'MES' },
  { time: 1, level: 'warn', message: 'vacuum low', source: 'SMT-02' },
  { time: 2, level: 'error', message: 'jam' },
  { time: 3, level: 'error', message: 'timeout', source: 'SMT-02' },
]

describe('filterLogs / countLevels', () => {
  it('等級與搜尋（訊息或來源）', () => {
    expect(filterLogs(entries, ['error'], compileSearch('')).map((e) => e.message)).toEqual(['jam', 'timeout'])
    expect(filterLogs(entries, null, compileSearch('smt-02')).map((e) => e.message)).toEqual(['vacuum low', 'timeout'])
    expect(filterLogs(entries, ['error'], compileSearch('smt')).map((e) => e.message)).toEqual(['timeout'])
    expect(countLevels(entries)).toEqual({ debug: 0, info: 1, warn: 1, error: 2, fatal: 0 })
  })
})

describe('時間與輸出', () => {
  it('formatLogTime：HH:mm:ss.SSS；無效為空', () => {
    expect(formatLogTime(new Date(2026, 10, 21, 8, 5, 3, 7))).toBe('08:05:03.007')
    expect(formatLogTime('nope')).toBe('')
    expect(toDate(5).getTime()).toBe(5)
  })
  it('formatLogLine：ISO 時間、等級、來源；無效時間原樣', () => {
    expect(formatLogLine({ time: Date.UTC(2026, 10, 21, 0, 0, 1), level: 'warn', source: 'A', message: 'm' })).toBe('2026-11-21T00:00:01.000Z [WARN] (A) m')
    expect(formatLogLine({ time: 'bad', level: 'info', message: 'x' })).toBe('bad [INFO] x')
  })
})
