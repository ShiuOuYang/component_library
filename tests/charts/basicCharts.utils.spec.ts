import { describe, expect, it } from 'vitest'
import { barPath, prepareRanking, truncateText, type RankOptions } from '@/components/library/charts/utils/horizontalBar'
import { preparePie, type PieOptions } from '@/components/library/charts/utils/pie'
import { estimateTextWidth, readableTextColor } from '@/components/library/charts/utils/chartText'
import { tooltipPlacement } from '@/components/library/charts/utils/tooltipPlacement'
import * as ganttUtils from '@/components/library/charts/utils/gantt'

const RANK: RankOptions = {
  labelField: 'label',
  valueField: 'value',
  keyField: 'id',
  keyFn: null,
  sort: 'desc',
  topN: null,
  showOthers: false,
  othersLabel: '其他',
}

describe('prepareRanking', () => {
  const rows = [
    { label: 'B', value: 20 },
    { label: 'A', value: 50 },
    { label: 'C', value: '5' },
    { label: 'D', value: 'n/a' },
    { label: 'E', value: 12 },
  ]

  it('排序、數值不是數字的略過；鍵沒有時用名稱', () => {
    const { items, skipped } = prepareRanking(rows, RANK)
    expect(items.map((i) => [i.label, i.value])).toEqual([['A', 50], ['B', 20], ['E', 12], ['C', 5]])
    expect(items[0].key).toBe('A')
    expect(skipped).toBe(1)
    expect(prepareRanking(rows, { ...RANK, sort: 'asc' }).items[0].label).toBe('C')
    expect(prepareRanking(rows, { ...RANK, sort: 'none' }).items.map((i) => i.label)).toEqual(['B', 'A', 'C', 'E'])
  })

  it('topN 只取前幾名；showOthers 把其餘加總成最後一列', () => {
    expect(prepareRanking(rows, { ...RANK, topN: 2 }).items.map((i) => i.label)).toEqual(['A', 'B'])
    const { items } = prepareRanking(rows, { ...RANK, topN: 2, showOthers: true })
    expect(items[2]).toMatchObject({ key: '__others__', label: '其他（2 項）', value: 17, isOthers: true, datum: null })
    expect(items[2].members.map((m) => m.label)).toEqual(['E', 'C'])
    // 筆數沒超過 topN：不會多出「其他」
    expect(prepareRanking(rows, { ...RANK, topN: 10, showOthers: true }).items).toHaveLength(4)
  })

  it('keyField 與 keyFn', () => {
    const data = [{ id: 'x1', label: 'A', value: 1 }, { label: '', value: 2 }]
    expect(prepareRanking(data, { ...RANK, sort: 'none' }).items.map((i) => i.key)).toEqual(['x1', '1'])
    expect(prepareRanking(data, { ...RANK, sort: 'none', keyFn: (_, i) => `k${i}` }).items.map((i) => i.key)).toEqual(['k0', 'k1'])
  })
})

describe('barPath', () => {
  it('資料端圓角、基線端方角；負值圓角在左', () => {
    expect(barPath(0, 100, 10, 20)).toBe('M0,10 H96 A4,4 0 0 1 100,14 V26 A4,4 0 0 1 96,30 H0 Z')
    expect(barPath(100, 0, 10, 20)).toBe('M100,10 H4 A4,4 0 0 0 0,14 V26 A4,4 0 0 0 4,30 H100 Z')
  })

  it('很短的長條圓角不超過長度；長度 0 不畫', () => {
    expect(barPath(0, 2, 0, 20)).toContain('A2,2')
    expect(barPath(5, 5, 0, 20)).toBe('')
  })
})

describe('truncateText', () => {
  const measure = (s: string) => estimateTextWidth(s, 12)

  it('放得下照原樣；放不下截斷並加「…」', () => {
    expect(truncateText('短', 100, measure)).toBe('短')
    const t = truncateText('很長很長很長的名稱', 50, measure)
    expect(t.endsWith('…')).toBe(true)
    expect(measure(t)).toBeLessThanOrEqual(50)
    expect(truncateText('很長', 5, measure)).toBe('')
  })
})

const PIE: PieOptions = { labelField: 'label', valueField: 'value', keyField: 'id', keyFn: null, maxSlices: 6, othersLabel: '其他', sort: 'desc' }

describe('preparePie', () => {
  it('由大到小；0、負數、非數字略過', () => {
    const { slices, skipped } = preparePie(
      [{ label: 'A', value: 1 }, { label: 'B', value: 3 }, { label: 'Z', value: 0 }, { label: 'N', value: -2 }, { label: 'X', value: 'x' }],
      PIE
    )
    expect(slices.map((s) => s.label)).toEqual(['B', 'A'])
    expect(skipped).toBe(3)
  })

  /** 顏色跟著項目走：排名換了，同一個項目還是同一個顏色 */
  it('顏色序號依資料順序，不依大小', () => {
    const before = preparePie([{ label: 'A', value: 1 }, { label: 'B', value: 3 }], PIE).slices
    const after = preparePie([{ label: 'A', value: 5 }, { label: 'B', value: 3 }], PIE).slices
    const color = (list: typeof before, label: string) => list.find((s) => s.label === label)!.colorIndex
    expect(color(before, 'A')).toBe(0)
    expect(color(after, 'A')).toBe(0)
    expect(color(before, 'B')).toBe(1)
    expect(color(after, 'B')).toBe(1)
  })

  it('超過 maxSlices：最小的併成「其他」（放最後、colorIndex −1）', () => {
    const rows = [5, 1, 9, 2, 7, 3, 8].map((v, i) => ({ label: `L${i}`, value: v }))
    const { slices } = preparePie(rows, { ...PIE, maxSlices: 4 })
    expect(slices.map((s) => s.label)).toEqual(['L2', 'L6', 'L4', '其他'])
    expect(slices[3]).toMatchObject({ isOthers: true, value: 5 + 1 + 2 + 3, colorIndex: -1, datum: null })
    expect(slices[3].members).toHaveLength(4)
    // 留下來的照資料順序編色號：L2、L4、L6 → 0、1、2
    expect(Object.fromEntries(slices.slice(0, 3).map((s) => [s.label, s.colorIndex]))).toEqual({ L2: 0, L4: 1, L6: 2 })
  })

  it("sort='none' 照資料順序", () => {
    const { slices } = preparePie([{ label: 'A', value: 1 }, { label: 'B', value: 3 }], { ...PIE, sort: 'none' })
    expect(slices.map((s) => s.label)).toEqual(['A', 'B'])
  })
})

describe('共用工具', () => {
  it('gantt 仍匯出文字工具（舊的 import 不會壞）', () => {
    expect(ganttUtils.estimateTextWidth).toBe(estimateTextWidth)
    expect(ganttUtils.readableTextColor).toBe(readableTextColor)
  })

  it('提示框靠近右緣、下緣時翻到另一側', () => {
    expect(tooltipPlacement(10, 10, 400, 300)).toEqual({ left: '22px', right: undefined, top: '22px', bottom: undefined })
    expect(tooltipPlacement(390, 290, 400, 300)).toEqual({ left: undefined, right: '22px', top: undefined, bottom: '22px' })
  })

  it('類別色 4 號（黃）上用深色字，1 號（藍）上用白字', () => {
    expect(readableTextColor('#EDA100')).toBe('#111827')
    expect(readableTextColor('#2A78D6')).toBe('#ffffff')
  })
})
