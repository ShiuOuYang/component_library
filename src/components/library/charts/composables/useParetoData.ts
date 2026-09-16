/**
 * 柏拉圖（Pareto）資料計算
 *
 * 純函式：排序 → 累積 → 把尾巴歸為「其他」。EnterprisePareto 與
 * ParetoChart 原本各自實作同一套邏輯（連 thresholdIndex 的寫法都一樣），
 * 收斂到這裡共用，也才測得到。
 */
import * as d3 from 'd3'
import type { ChartDatum } from '../types/chart.types'

/** 排序方式；none 表示照傳入順序 */
export type ParetoSortOrder = 'desc' | 'asc' | 'none'

export interface ParetoOptions {
  /** 類別欄位名稱 */
  categoryField: string
  /** 數值欄位名稱 */
  valueField: string
  /** 排序方式 */
  sortOrder?: ParetoSortOrder
  /**
   * 是否把累積超過門檻的尾巴合併為一筆「其他」。
   * 柏拉圖的重點是前幾項，長尾攤開只會讓 X 軸塞不下。
   */
  enableThresholdFilter?: boolean
  /** 門檻百分比（通常是 80） */
  thresholdPercent?: number
  /** 「其他」那一筆的類別名稱 */
  otherLabel?: string
}

/** 計算後的一筆資料：原資料加上累積值 */
export interface ParetoDatum extends ChartDatum {
  /** 累積數值 */
  cumulative: number
  /** 累積百分比（0–100） */
  cumulativePercent: number
  /** 是否為合併出來的「其他」 */
  isOther?: boolean
  /** 被合併進「其他」的原始項目，供 tooltip 展開 */
  originalItems?: ChartDatum[]
}

/** 把欄位值讀成數值；空值與非數字都視為 0 */
function readValue(datum: ChartDatum, field: string): number {
  const raw = datum[field]
  if (raw === null || raw === undefined || raw === '') return 0
  const numeric = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(numeric) ? numeric : 0
}

/** 依 sortOrder 排序（不動原陣列） */
export function sortParetoData(
  data: ChartDatum[],
  valueField: string,
  sortOrder: ParetoSortOrder
): ChartDatum[] {
  if (sortOrder === 'none') return [...data]

  return [...data].sort((a, b) => {
    const valueA = readValue(a, valueField)
    const valueB = readValue(b, valueField)
    return sortOrder === 'desc' ? valueB - valueA : valueA - valueB
  })
}

/**
 * 算出柏拉圖要畫的資料。
 *
 * 總和為 0 時回傳空陣列 —— 百分比算不出來，畫出來也沒有意義，
 * 而且可以避免除以零產生 NaN 座標。
 */
export function buildParetoData(
  data: ChartDatum[] | null | undefined,
  options: ParetoOptions
): ParetoDatum[] {
  const {
    categoryField,
    valueField,
    sortOrder = 'desc',
    enableThresholdFilter = true,
    thresholdPercent = 80,
    otherLabel = 'Other',
  } = options

  if (!data || data.length === 0) return []

  const sorted = sortParetoData(data, valueField, sortOrder)
  const total = d3.sum(sorted, (d) => readValue(d, valueField))
  if (total === 0) return []

  /** 依序累積，把累積值與百分比掛回每一筆 */
  const accumulate = (items: ChartDatum[], startFrom = 0): ParetoDatum[] => {
    let cumulative = startFrom
    return items.map((d) => {
      cumulative += readValue(d, valueField)
      return { ...d, cumulative, cumulativePercent: (cumulative / total) * 100 }
    })
  }

  if (!enableThresholdFilter) return accumulate(sorted)

  // 找到累積百分比首次達到門檻的位置，之後的項目全部併成「其他」
  let cumulative = 0
  let thresholdIndex = sorted.length
  for (let i = 0; i < sorted.length; i++) {
    cumulative += readValue(sorted[i], valueField)
    if ((cumulative / total) * 100 >= thresholdPercent) {
      thresholdIndex = i + 1
      break
    }
  }

  const mainItems = sorted.slice(0, thresholdIndex)
  const otherItems = sorted.slice(thresholdIndex)
  const result = accumulate(mainItems)

  if (otherItems.length > 0) {
    const otherValue = d3.sum(otherItems, (d) => readValue(d, valueField))
    const lastCumulative = result.length > 0 ? result[result.length - 1].cumulative : 0
    const mergedCumulative = lastCumulative + otherValue

    result.push({
      [categoryField]: otherLabel,
      [valueField]: otherValue,
      cumulative: mergedCumulative,
      cumulativePercent: (mergedCumulative / total) * 100,
      isOther: true,
      originalItems: otherItems,
    })
  }

  return result
}
