import { describe, expect, it } from 'vitest'
import {
  buildParetoData,
  sortParetoData,
} from '@/components/library/charts/composables/useParetoData'
import type { ChartDatum } from '@/components/library/charts/types/chart.types'

const ROWS: ChartDatum[] = [
  { category: 'B', value: 30 },
  { category: 'A', value: 50 },
  { category: 'D', value: 5 },
  { category: 'C', value: 15 },
]

/** 不做門檻過濾的完整累積，方便驗算 */
const OPTS = {
  categoryField: 'category',
  valueField: 'value',
  enableThresholdFilter: false,
}

describe('sortParetoData', () => {
  it('降序：數值大的在前', () => {
    expect(sortParetoData(ROWS, 'value', 'desc').map((d) => d.category)).toEqual([
      'A',
      'B',
      'C',
      'D',
    ])
  })

  it('升序：數值小的在前', () => {
    expect(sortParetoData(ROWS, 'value', 'asc').map((d) => d.category)).toEqual([
      'D',
      'C',
      'B',
      'A',
    ])
  })

  it('none：照傳入順序', () => {
    expect(sortParetoData(ROWS, 'value', 'none').map((d) => d.category)).toEqual([
      'B',
      'A',
      'D',
      'C',
    ])
  })

  it('不動原陣列', () => {
    const input = [...ROWS]
    sortParetoData(input, 'value', 'desc')
    expect(input.map((d) => d.category)).toEqual(['B', 'A', 'D', 'C'])
  })

  it('數值是字串也排得對（不是字典序）', () => {
    const rows: ChartDatum[] = [{ v: '9' }, { v: '100' }, { v: '20' }]
    expect(sortParetoData(rows, 'v', 'desc').map((d) => d.v)).toEqual(['100', '20', '9'])
  })
})

describe('buildParetoData', () => {
  describe('累積計算', () => {
    it('累積值與累積百分比逐筆遞增到 100', () => {
      const result = buildParetoData(ROWS, OPTS)

      // 總和 100，降序後 A50 B30 C15 D5
      expect(result.map((d) => d.value)).toEqual([50, 30, 15, 5])
      expect(result.map((d) => d.cumulative)).toEqual([50, 80, 95, 100])
      expect(result.map((d) => d.cumulativePercent)).toEqual([50, 80, 95, 100])
    })

    it('總和不是 100 時百分比照比例換算', () => {
      const result = buildParetoData([{ c: 'a', v: 3 }, { c: 'b', v: 1 }], {
        categoryField: 'c',
        valueField: 'v',
        enableThresholdFilter: false,
      })
      expect(result[0].cumulativePercent).toBe(75)
      expect(result[1].cumulativePercent).toBe(100)
    })

    it('保留原資料的其他欄位', () => {
      const result = buildParetoData([{ category: 'A', value: 10, metadata: { owner: '甲' } }], {
        ...OPTS,
      })
      expect(result[0].metadata).toEqual({ owner: '甲' })
    })

    it('不修改傳入的資料', () => {
      const rows: ChartDatum[] = [{ category: 'A', value: 10 }]
      buildParetoData(rows, OPTS)
      expect(rows[0]).toEqual({ category: 'A', value: 10 })
    })
  })

  describe('門檻過濾（歸為「其他」）', () => {
    it('累積達到門檻之後的項目合併成一筆', () => {
      const result = buildParetoData(ROWS, {
        categoryField: 'category',
        valueField: 'value',
        enableThresholdFilter: true,
        thresholdPercent: 80,
        otherLabel: '其他',
      })

      // A(50) B(80 → 達標) 之後的 C、D 併成一筆
      expect(result.map((d) => d.category)).toEqual(['A', 'B', '其他'])
      expect(result[2].value).toBe(20)
      expect(result[2].isOther).toBe(true)
    })

    it('「其他」的累積百分比仍然是 100', () => {
      const result = buildParetoData(ROWS, {
        categoryField: 'category',
        valueField: 'value',
        enableThresholdFilter: true,
        thresholdPercent: 80,
      })
      expect(result[result.length - 1].cumulativePercent).toBe(100)
    })

    it('「其他」保留被合併的原始項目，供 tooltip 展開', () => {
      const result = buildParetoData(ROWS, {
        categoryField: 'category',
        valueField: 'value',
        enableThresholdFilter: true,
        thresholdPercent: 80,
      })
      expect(result[2].originalItems?.map((d) => d.category)).toEqual(['C', 'D'])
    })

    it('第一筆就達標時只留它與「其他」', () => {
      const result = buildParetoData(
        [{ category: 'A', value: 95 }, { category: 'B', value: 3 }, { category: 'C', value: 2 }],
        { categoryField: 'category', valueField: 'value', enableThresholdFilter: true, thresholdPercent: 80 }
      )
      expect(result.map((d) => d.category)).toEqual(['A', 'Other'])
    })

    it('全部項目都在門檻內時不產生「其他」', () => {
      const result = buildParetoData(
        [{ category: 'A', value: 50 }, { category: 'B', value: 50 }],
        { categoryField: 'category', valueField: 'value', enableThresholdFilter: true, thresholdPercent: 100 }
      )
      expect(result).toHaveLength(2)
      expect(result.some((d) => d.isOther)).toBe(false)
    })

    it('門檻 0 時第一筆就達標', () => {
      const result = buildParetoData(ROWS, {
        categoryField: 'category',
        valueField: 'value',
        enableThresholdFilter: true,
        thresholdPercent: 0,
      })
      expect(result.map((d) => d.category)).toEqual(['A', 'Other'])
      expect(result[1].value).toBe(50)
    })

    it('沒指定 otherLabel 時用預設的 Other', () => {
      const result = buildParetoData(ROWS, {
        categoryField: 'category',
        valueField: 'value',
        enableThresholdFilter: true,
        thresholdPercent: 80,
      })
      expect(result[2].category).toBe('Other')
    })
  })

  describe('防禦', () => {
    it('沒有資料時回傳空陣列', () => {
      expect(buildParetoData([], OPTS)).toEqual([])
      expect(buildParetoData(null, OPTS)).toEqual([])
      expect(buildParetoData(undefined, OPTS)).toEqual([])
    })

    it('總和為 0 時回傳空陣列（百分比算不出來）', () => {
      expect(buildParetoData([{ category: 'A', value: 0 }], OPTS)).toEqual([])
    })

    it('數值欄位缺漏或非數字時視為 0', () => {
      const result = buildParetoData(
        [{ category: 'A', value: 10 }, { category: 'B' }, { category: 'C', value: 'x' }],
        OPTS
      )
      expect(result.map((d) => d.cumulative)).toEqual([10, 10, 10])
    })

    it('數值是數字字串時照樣累積', () => {
      const result = buildParetoData([{ c: 'a', v: '30' }, { c: 'b', v: '70' }], {
        categoryField: 'c',
        valueField: 'v',
        enableThresholdFilter: false,
      })
      expect(result.map((d) => d.cumulativePercent)).toEqual([70, 100])
    })

    it('單一項目時累積百分比為 100', () => {
      const result = buildParetoData([{ category: 'A', value: 42 }], OPTS)
      expect(result[0].cumulativePercent).toBe(100)
    })
  })
})
