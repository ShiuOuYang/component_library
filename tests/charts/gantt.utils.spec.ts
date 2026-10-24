import { describe, expect, it } from 'vitest'
import {
  DAY,
  buildLinks,
  buildRows,
  estimateTextWidth,
  formatDuration,
  groupByRow,
  isDateOnly,
  linkPath,
  nonWorkingRanges,
  normalizeTasks,
  parseTime,
  readableTextColor,
  resolveSnap,
  snapDelta,
  snapEdge,
  timeExtent,
  timeTiers,
  upperSegments,
  type NormalizeOptions,
} from '@/components/library/charts/utils/gantt'

const local = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h).getTime()

const OPTS: NormalizeOptions = {
  keyField: 'id',
  keyFn: null,
  rowField: 'row',
  labelField: 'name',
  startField: 'start',
  endField: 'end',
  progressField: 'progress',
  statusField: 'status',
  milestoneField: 'milestone',
  inclusiveEndDate: true,
}

describe('parseTime', () => {
  /**
   * 回歸：Date.parse('2026-10-24') 是 UTC 午夜，在 UTC+8 會變成早上 8 點。
   * CI 跑在 UTC，兩者剛好相等、測不出來 —— 這個測試切到台北時區跑。
   */
  it('只有日期的字串當成本地時間的午夜（台北時區）', () => {
    const original = process.env.TZ
    process.env.TZ = 'Asia/Taipei'
    try {
      expect(new Date(2026, 9, 24).getTimezoneOffset()).toBe(-480)
      expect(parseTime('2026-10-24')).toBe(local(2026, 10, 24))
      expect(parseTime('2026-10-24')).not.toBe(Date.parse('2026-10-24'))
      expect(new Date(parseTime('2026-10-24')).getHours()).toBe(0)
      expect(parseTime('2026/10/24')).toBe(local(2026, 10, 24))
      expect(parseTime(' 2026-1-5 ')).toBe(local(2026, 1, 5))
    } finally {
      if (original === undefined) delete process.env.TZ
      else process.env.TZ = original
    }
  })

  it('Date、毫秒數、有時間的字串', () => {
    const d = new Date(2026, 9, 24, 13, 30)
    expect(parseTime(d)).toBe(d.getTime())
    expect(parseTime(d.getTime())).toBe(d.getTime())
    expect(parseTime('2026-10-24T13:30:00')).toBe(d.getTime())
  })

  it.each([null, undefined, '', 'abc', '2026-02-31', Infinity, {}])('不合法：%s → NaN', (v) => {
    expect(parseTime(v)).toBeNaN()
  })

  it('isDateOnly 只認純日期字串', () => {
    expect(isDateOnly('2026-10-24')).toBe(true)
    expect(isDateOnly('2026-10-24T00:00')).toBe(false)
    expect(isDateOnly(new Date())).toBe(false)
  })
})

describe('normalizeTasks', () => {
  it('只寫日期的結束時間算到那一天結束；給人看的結束日不變', () => {
    const { tasks } = normalizeTasks([{ id: 'a', start: '2026-10-01', end: '2026-10-03' }], OPTS)
    expect(tasks[0].start).toBe(local(2026, 10, 1))
    expect(tasks[0].end).toBe(local(2026, 10, 4))
    expect(tasks[0].displayEnd).toBe(local(2026, 10, 3))
  })

  it('inclusiveEndDate=false，或結束時間有時分：照原值', () => {
    const off = normalizeTasks([{ start: '2026-10-01', end: '2026-10-03' }], { ...OPTS, inclusiveEndDate: false })
    expect(off.tasks[0].end).toBe(local(2026, 10, 3))
    const timed = normalizeTasks([{ start: '2026-10-01', end: new Date(2026, 9, 3, 12) }], OPTS)
    expect(timed.tasks[0].end).toBe(local(2026, 10, 3, 12))
  })

  it('沒有結束時間或 milestone 為真 → 里程碑（結束 = 開始、沒有進度）', () => {
    const { tasks } = normalizeTasks(
      [
        { id: 'm1', start: '2026-10-01', progress: 50 },
        { id: 'm2', start: '2026-10-02', end: '2026-10-05', milestone: true },
      ],
      OPTS
    )
    expect(tasks.map((t) => t.milestone)).toEqual([true, true])
    expect(tasks[1].end).toBe(tasks[1].start)
    expect(tasks[0].progress).toBeNull()
  })

  it('開始時間不合法的略過並計數；結束早於開始時互換', () => {
    const { tasks, skipped } = normalizeTasks(
      [
        { id: 'bad', start: 'x' },
        { id: 'rev', start: new Date(2026, 9, 5), end: new Date(2026, 9, 2) },
      ],
      OPTS
    )
    expect(skipped).toBe(1)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].start).toBe(local(2026, 10, 2))
    expect(tasks[0].end).toBe(local(2026, 10, 5))
    expect(tasks[0].index).toBe(1)
  })

  it('鍵：keyFn > keyField > 索引；列：沒給時以名稱（再沒有就用鍵）自成一列', () => {
    const rows = [
      { id: 'a', name: '甲', start: 0, end: 1 },
      { name: '乙', start: 0, end: 1 },
      { start: 0, end: 1 },
      { id: 'd', row: 'R1', start: 0, end: 1 },
    ]
    const { tasks } = normalizeTasks(rows, OPTS)
    expect(tasks.map((t) => t.key)).toEqual(['a', '1', '2', 'd'])
    expect(tasks.map((t) => t.row)).toEqual(['甲', '乙', '2', 'R1'])
    const custom = normalizeTasks(rows, { ...OPTS, keyFn: (_, i) => `K${i}` })
    expect(custom.tasks.map((t) => t.key)).toEqual(['K0', 'K1', 'K2', 'K3'])
  })

  it('進度：0～100 換成 0～1 並夾在範圍內；不是數字時為 null', () => {
    const { tasks } = normalizeTasks(
      [
        { start: 0, end: 1, progress: 40 },
        { start: 0, end: 1, progress: 150 },
        { start: 0, end: 1, progress: -5 },
        { start: 0, end: 1, progress: 'n/a' },
        { start: 0, end: 1 },
      ],
      OPTS
    )
    expect(tasks.map((t) => t.progress)).toEqual([0.4, 1, 0, null, null])
  })
})

describe('buildRows / groupByRow', () => {
  const { tasks } = normalizeTasks(
    [
      { row: 'B', start: 2, end: 3 },
      { row: 'A', start: 0, end: 1 },
      { row: 'C', start: 0, end: 1 },
      { row: 'B', start: 0, end: 1 },
    ],
    OPTS
  )

  it('沒給 rows：照資料第一次出現的順序', () => {
    expect(buildRows(tasks, null).map((r) => r.value)).toEqual(['B', 'A', 'C'])
  })

  it('有給 rows：照給的順序與文字，重複的忽略，清單外的列接在後面', () => {
    const rows = buildRows(tasks, [{ value: 'C', label: '丙' }, 'A', 'A', 'Z'])
    expect(rows).toEqual([
      { value: 'C', label: '丙' },
      { value: 'A', label: 'A' },
      { value: 'Z', label: 'Z' },
      { value: 'B', label: 'B' },
    ])
  })

  it('依列分組任務索引', () => {
    expect(groupByRow(tasks, buildRows(tasks, null))).toEqual([[0, 3], [1], [2]])
  })
})

describe('timeExtent', () => {
  it('沒有任務：以今天為中心前後一週', () => {
    expect(timeExtent([], 0.1, 1000 * DAY)).toEqual([993 * DAY, 1007 * DAY])
  })

  it('範圍為 0（只有一個里程碑）：前後各一天', () => {
    const { tasks } = normalizeTasks([{ start: 10 * DAY }], OPTS)
    expect(timeExtent(tasks, 0.1, 0)).toEqual([9 * DAY, 11 * DAY])
  })

  it('兩端依比例外推', () => {
    const { tasks } = normalizeTasks([{ start: 0, end: 100 }], OPTS)
    expect(timeExtent(tasks, 0.1, 0)).toEqual([-10, 110])
  })
})

describe('時間軸分層', () => {
  const at = local(2026, 10, 24, 13)

  it.each([
    [30_000, '13:00:00', '2026/10/24'],
    [3_600_000, '13:00', '2026/10/24'],
    [DAY, '24', '2026 年 10 月'],
    [31 * DAY, '10 月', '2026 年'],
  ])('刻度間距 %d ms → 下層 %s、上層 %s', (step, lower, upper) => {
    const tiers = timeTiers(step)
    expect(tiers.lowerFormat(new Date(at))).toBe(lower)
    expect(tiers.upper!.format(new Date(at))).toBe(upper)
  })

  it('年刻度只有一層', () => {
    const tiers = timeTiers(400 * DAY)
    expect(tiers.upper).toBeNull()
    expect(tiers.lowerFormat(new Date(at))).toBe('2026')
  })

  it('上層區段截在畫面範圍內', () => {
    const segs = upperSegments([local(2026, 10, 20), local(2026, 11, 10)], timeTiers(DAY))
    expect(segs).toEqual([
      { start: local(2026, 10, 20), end: local(2026, 11, 1), label: '2026 年 10 月' },
      { start: local(2026, 11, 1), end: local(2026, 11, 10), label: '2026 年 11 月' },
    ])
    expect(upperSegments([0, DAY], timeTiers(400 * DAY))).toEqual([])
  })
})

describe('文字與顏色', () => {
  it('全形字約一個字高、半形約 0.6 個', () => {
    expect(estimateTextWidth('甘特', 12)).toBe(24)
    expect(estimateTextWidth('WO-1', 10)).toBe(24)
  })

  it.each([
    [0, '0 分'],
    [45 * 60_000, '45 分'],
    [2 * 3_600_000, '2 小時'],
    [2.5 * 3_600_000, '2 小時 30 分'],
    [DAY, '1 天'],
    [3 * DAY + 4 * 3_600_000, '3 天 4 小時'],
    [10_000, '1 分'],
  ])('工期 %d ms → %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text)
  })

  it('長條上的文字依底色選白字或深色字', () => {
    expect(readableTextColor('#2563eb')).toBe('#ffffff')
    expect(readableTextColor('#047857')).toBe('#ffffff')
    expect(readableTextColor('#fde68a')).toBe('#111827')
    expect(readableTextColor('#ffffff')).toBe('#111827')
    expect(readableTextColor('not-a-color')).toBe('#ffffff')
  })
})

describe('編輯：吸附', () => {
  it('auto：挑畫面上至少 8px 寬的最小單位', () => {
    expect(resolveSnap('auto', DAY / 80)).toBe(DAY) // 一天 80px：小時只有 3.3px
    expect(resolveSnap('auto', 3_600_000 / 70)).toBe(15 * 60_000) // 一小時 70px：15 分 17px
    expect(resolveSnap('auto', 60_000 / 20)).toBe(60_000)
    expect(resolveSnap('auto', DAY)).toBe(DAY) // 縮到很小也不會比天大
  })

  it('指定單位、毫秒數、不吸附', () => {
    expect(resolveSnap('hour', 1)).toBe(3_600_000)
    expect(resolveSnap('minute', 1)).toBe(60_000)
    expect(resolveSnap(900_000, 1)).toBe(900_000)
    expect(resolveSnap(null, 1)).toBe(0)
    expect(resolveSnap(-5, 1)).toBe(0)
  })

  it('位移量四捨五入到單位；單位 0 時不變', () => {
    expect(snapDelta(1.4 * DAY, DAY)).toBe(DAY)
    expect(snapDelta(-1.6 * DAY, DAY)).toBe(-2 * DAY)
    expect(snapDelta(123, 0)).toBe(123)
  })

  /** 回歸：Math.round(t / DAY) 會對齊 UTC 午夜，在台灣是早上 8 點 */
  it('時間點對齊本地的整天、整點（台北時區）', () => {
    const original = process.env.TZ
    process.env.TZ = 'Asia/Taipei'
    try {
      expect(snapEdge(local(2026, 10, 5, 13), DAY)).toBe(local(2026, 10, 6))
      expect(snapEdge(local(2026, 10, 5, 11), DAY)).toBe(local(2026, 10, 5))
      expect(snapEdge(new Date(2026, 9, 5, 10, 20).getTime(), 15 * 60_000)).toBe(new Date(2026, 9, 5, 10, 15).getTime())
      expect(snapEdge(new Date(2026, 9, 5, 10, 40).getTime(), 3_600_000)).toBe(local(2026, 10, 5, 11))
      expect(snapEdge(12345, 0)).toBe(12345)
    } finally {
      if (original === undefined) delete process.env.TZ
      else process.env.TZ = original
    }
  })
})

describe('相依關係', () => {
  const rows = [
    { id: 'a', start: 0, end: 1 },
    { id: 'b', start: 0, end: 1, dependsOn: 'a' },
    { id: 'c', start: 0, end: 1, dependsOn: ['a', 'b', 'zzz', null] },
    { id: 'd', start: 0, end: 1, dependsOn: 'a, c,,d' },
  ]
  const { tasks } = normalizeTasks(rows, OPTS)

  it('單一鍵、陣列、逗號分隔；找不到的鍵與自己指向自己略過', () => {
    expect(buildLinks(tasks, rows, 'dependsOn', null)).toEqual([
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 1, to: 2 },
      { from: 0, to: 3 },
      { from: 2, to: 3 },
    ])
  })

  it('另外給的清單合併進來，重複的只算一次', () => {
    const links = buildLinks(tasks, rows, 'none', [
      { from: 'a', to: 'b' },
      { from: 'a', to: 'b' },
      { from: 'b', to: 'missing' },
      { from: 'c', to: 'd' },
    ])
    expect(links).toEqual([
      { from: 0, to: 1 },
      { from: 2, to: 3 },
    ])
  })

  it('箭頭路徑：右邊夠遠只轉一次彎；太近時從兩列之間繞回來', () => {
    expect(linkPath(100, 18, 200, 54, 36)).toBe('M100,18 H192 V54 H200')
    expect(linkPath(100, 18, 90, 54, 36)).toBe('M100,18 H108 V36 H82 V54 H90')
    expect(linkPath(100, 54, 90, 18, 36)).toBe('M100,54 H108 V36 H82 V18 H90')
    expect(linkPath(100, 18, 90, 18, 36)).toBe('M100,18 H108 V36 H82 V18 H90')
  })
})

describe('非工作時段', () => {
  // 2026-10-03 是星期六
  const domain: [number, number] = [local(2026, 10, 1), local(2026, 10, 12)]

  it('連續的非工作日合併成一段；假日另外加', () => {
    const ranges = nonWorkingRanges(domain, new Set([0, 6]), new Set([local(2026, 10, 7)]))
    expect(ranges).toEqual([
      [local(2026, 10, 3), local(2026, 10, 5)],
      [local(2026, 10, 7), local(2026, 10, 8)],
      [local(2026, 10, 10), local(2026, 10, 12)],
    ])
  })

  it('沒有設定、或天數超過上限時不畫', () => {
    expect(nonWorkingRanges(domain, new Set(), new Set())).toEqual([])
    expect(nonWorkingRanges(domain, new Set([0]), new Set(), 5)).toEqual([])
  })
})
