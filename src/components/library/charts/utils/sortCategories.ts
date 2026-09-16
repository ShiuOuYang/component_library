/**
 * 類別值排序
 *
 * 圖表的離散軸（band scale）需要一個穩定的類別順序。JS 的預設 sort 會先把
 * 元素轉成字串，因此數字類別會排成 1, 10, 11, 2 —— 對「第 1~12 站」這類
 * 欄位來說是錯的。這裡先判斷整組值是否都能當數字看，是就走數值比較。
 */
export function sortCategories(values: unknown[]): unknown[] {
  const allNumeric = values.every(
    (v) => typeof v === 'number' || (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v)))
  )
  if (allNumeric) {
    return [...values].sort((a, b) => Number(a) - Number(b))
  }
  return [...values].sort((a, b) => String(a).localeCompare(String(b)))
}

/** sortCategories 的字串版：band scale 的 domain 一定是字串 */
export function sortCategoryLabels(values: string[]): string[] {
  return sortCategories(values) as string[]
}
