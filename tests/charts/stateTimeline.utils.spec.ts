import { describe, expect, it } from 'vitest'
import {
  dominantSegment,
  firstEndingAfter,
  normalizeStates,
  rasterizeRow,
  segmentAt,
  summarizeRow,
  type StateSegment,
} from '@/components/library/charts/utils/stateTimeline'

const MIN = 60_000
const opts = { rowField: 'm', stateField: 's', startField: 'a', endField: 'b', openEnd: 100 * MIN }

const seg = (state: string, start: number, end: number): StateSegment => ({
  row: 0,
  state,
  start: start * MIN,
  end: end * MIN,
  datum: {},
  openEnded: false,
})

describe('normalizeStates', () => {
  it('依機台分列、依開始時間排序；沒有結束時間時用下一筆的開始，最後一筆畫到 openEnd', () => {
    const r = normalizeStates(
      [
        { m: 'B', s: 'run', a: 10 * MIN },
        { m: 'A', s: 'idle', a: 30 * MIN },
        { m: 'A', s: 'run', a: 0 },
      ],
      { ...opts, endField: null }
    )
    expect(r.rows).toEqual(['B', 'A'])
    expect(r.byRow[1].map((s) => [s.state, s.start / MIN, s.end / MIN, s.openEnded])).toEqual([
      ['run', 0, 30, true],
      ['idle', 30, 100, true],
    ])
    expect(r.byRow[0][0]).toMatchObject({ row: 0, start: 10 * MIN, end: 100 * MIN })
  })

  it('rows 決定順序，沒列到的接在後面', () => {
    const r = normalizeStates([{ m: 'X', s: 'run', a: 0 }, { m: 'Y', s: 'run', a: 0 }], { ...opts, rows: ['Y', 'Z', 'Y'] })
    expect(r.rows).toEqual(['Y', 'Z', 'X'])
    expect(r.byRow[1]).toEqual([])
  })

  it('有結束時間就用；重疊時前一筆在下一筆開始時結束', () => {
    const r = normalizeStates(
      [
        { m: 'A', s: 'run', a: 0, b: 50 * MIN },
        { m: 'A', s: 'down', a: 40 * MIN, b: 45 * MIN },
      ],
      opts
    )
    expect(r.byRow[0].map((s) => [s.state, s.start / MIN, s.end / MIN, s.openEnded])).toEqual([
      ['run', 0, 40, false],
      ['down', 40, 45, false],
    ])
  })

  it('略過不合法的紀錄：沒有機台、時間不合法、沒有結束時間也沒有 openEnd；同時開始的前一筆沒有長度', () => {
    const r = normalizeStates(
      [
        { m: '', s: 'run', a: 0 },
        { m: 'A', s: 'run', a: 'not a date' },
        { m: 'A', s: 'idle', a: 5 * MIN },
        { m: 'A', s: 'down', a: 5 * MIN },
        { m: 'A', s: 'run', a: 9 * MIN },
      ],
      { ...opts, endField: null, openEnd: NaN }
    )
    // 空機台、不合法時間、最後一筆沒有 openEnd
    expect(r.skipped).toBe(3)
    expect(r.byRow[0].map((s) => s.state)).toEqual(['down'])
  })

  it('狀態空白時是空字串；字串日期可以解析', () => {
    const r = normalizeStates([{ m: 1, a: '2026-10-23 08:00', b: '2026-10-23 09:00' }], opts)
    expect(r.rows).toEqual(['1'])
    expect(r.byRow[0][0].state).toBe('')
    expect(r.byRow[0][0].end - r.byRow[0][0].start).toBe(60 * MIN)
  })
})

describe('二分搜尋', () => {
  const list = [seg('run', 0, 10), seg('idle', 10, 20), seg('run', 30, 40)]

  it('firstEndingAfter：第一個結束時間晚於 t 的段落', () => {
    expect(firstEndingAfter(list, -1)).toBe(0)
    expect(firstEndingAfter(list, 10 * MIN)).toBe(1)
    expect(firstEndingAfter(list, 25 * MIN)).toBe(2)
    expect(firstEndingAfter(list, 40 * MIN)).toBe(3)
  })

  it('segmentAt：時間所在的段落；落在缺口時為 null', () => {
    expect(segmentAt(list, 15 * MIN)?.state).toBe('idle')
    expect(segmentAt(list, 25 * MIN)).toBeNull()
    expect(segmentAt(list, 50 * MIN)).toBeNull()
  })
})

describe('rasterizeRow', () => {
  const plain = () => 0

  it('一格一分鐘：每段剛好對齊像素，相鄰同狀態合併', () => {
    const runs = rasterizeRow([seg('run', 0, 3), seg('run', 3, 5), seg('down', 5, 10)], [0, 10 * MIN], 10, plain)
    expect(runs).toEqual([
      { x0: 0, x1: 5, state: 'run' },
      { x0: 5, x1: 10, state: 'down' },
    ])
  })

  it('一個像素裡有好幾種狀態：先比 priority，再比時間', () => {
    // 一格 10 分鐘：第一格 run 9 分、down 1 分
    const list = [seg('run', 0, 9), seg('down', 9, 10), seg('run', 10, 16), seg('idle', 16, 20)]
    expect(rasterizeRow(list, [0, 20 * MIN], 2, plain)).toEqual([{ x0: 0, x1: 2, state: 'run' }])
    const prio = (s: string) => (s === 'down' ? 3 : 0)
    expect(rasterizeRow(list, [0, 20 * MIN], 2, prio)).toEqual([
      { x0: 0, x1: 1, state: 'down' },
      { x0: 1, x1: 2, state: 'run' },
    ])
  })

  it('像素裡沒有紀錄超過一半時留白，但有優先狀態仍然畫出來', () => {
    const list = [seg('run', 0, 3), seg('down', 13, 14)]
    const prio = (s: string) => (s === 'down' ? 1 : 0)
    // 一格 10 分鐘：第一格只有 3 分鐘紀錄 → 留白；第二格只有 1 分鐘故障 → 畫故障
    expect(rasterizeRow(list, [0, 20 * MIN], 2, prio)).toEqual([{ x0: 1, x1: 2, state: 'down' }])
  })

  it('只看可見範圍；跨出範圍的段落裁掉', () => {
    const list = [seg('run', 0, 50), seg('down', 50, 100)]
    expect(rasterizeRow(list, [40 * MIN, 60 * MIN], 4, plain)).toEqual([
      { x0: 0, x1: 2, state: 'run' },
      { x0: 2, x1: 4, state: 'down' },
    ])
  })

  it('寬度為 0 或範圍不合法時沒有東西', () => {
    expect(rasterizeRow([seg('run', 0, 1)], [0, MIN], 0, plain)).toEqual([])
    expect(rasterizeRow([seg('run', 0, 1)], [MIN, MIN], 10, plain)).toEqual([])
  })

  it('大量資料：一列最多寬度個矩形', () => {
    const list = Array.from({ length: 10_000 }, (_, i) => seg(i % 2 ? 'down' : 'run', i, i + 1))
    const runs = rasterizeRow(list, [0, 10_000 * MIN], 500, (s) => (s === 'down' ? 1 : 0))
    expect(runs.length).toBeLessThanOrEqual(500)
    // 每格都有故障 → 全部是一段故障
    expect(runs).toEqual([{ x0: 0, x1: 500, state: 'down' }])
  })
})

describe('dominantSegment', () => {
  const list = [seg('run', 0, 9), seg('down', 9, 10), seg('idle', 10, 20)]

  it('範圍內 priority 最高的段落；同 priority 取佔最久的', () => {
    expect(dominantSegment(list, 0, 10 * MIN, (s) => (s === 'down' ? 1 : 0))?.state).toBe('down')
    expect(dominantSegment(list, 0, 10 * MIN, () => 0)?.state).toBe('run')
  })

  it('範圍內沒有段落時為 null', () => {
    expect(dominantSegment(list, 30 * MIN, 40 * MIN, () => 0)).toBeNull()
  })
})

describe('summarizeRow', () => {
  const o = { runStates: ['run'], downStates: ['down', 'wait'], excludeStates: ['pm'] }

  it('各狀態時間、稼動率（扣掉不計入的狀態）、停機次數與最長的一次', () => {
    const list = [
      seg('run', 0, 40),
      seg('down', 40, 50),
      seg('run', 50, 70),
      seg('pm', 70, 80),
      seg('run', 80, 90),
      seg('down', 90, 95),
      seg('idle', 95, 100),
    ]
    const s = summarizeRow('A', list, [0, 100 * MIN], o)
    expect(s.durations).toEqual({ run: 70 * MIN, down: 15 * MIN, pm: 10 * MIN, idle: 5 * MIN })
    expect(s.covered).toBe(100 * MIN)
    expect(s.planned).toBe(90 * MIN)
    expect(s.utilization).toBeCloseTo(70 / 90)
    expect(s.downTime).toBe(15 * MIN)
    expect(s.downCount).toBe(2)
    expect(s.longestDown).toEqual({ start: 40 * MIN, end: 50 * MIN, state: 'down' })
    expect(s.mttr).toBe(7.5 * MIN)
    expect(s.mtbf).toBe(35 * MIN)
  })

  it('相鄰的停機段算一次，以佔最久的狀態命名', () => {
    const list = [seg('run', 0, 10), seg('down', 10, 12), seg('wait', 12, 20), seg('run', 20, 30)]
    const s = summarizeRow('A', list, [0, 30 * MIN], o)
    expect(s.downCount).toBe(1)
    expect(s.longestDown).toEqual({ start: 10 * MIN, end: 20 * MIN, state: 'wait' })
  })

  it('只算統計區間內的部分；停機在區間結尾時也要收尾', () => {
    const list = [seg('run', 0, 50), seg('down', 50, 100)]
    const s = summarizeRow('A', list, [40 * MIN, 60 * MIN], o)
    expect(s.durations).toEqual({ run: 10 * MIN, down: 10 * MIN })
    expect(s.utilization).toBe(0.5)
    expect(s.longestDown).toEqual({ start: 50 * MIN, end: 60 * MIN, state: 'down' })
  })

  it('沒有資料時稼動率與 MTTR 為 null', () => {
    const s = summarizeRow('A', [], [0, MIN], o)
    expect(s).toMatchObject({ covered: 0, utilization: null, downCount: 0, longestDown: null, mttr: null, mtbf: null })
  })
})
