/**
 * 自動填入（填充控點）的數列判斷
 *
 * ⚠️ 原本的填充只做一件事：把來源範圍循環複製。
 *      1, 2       往下拉 → 1, 2, 1, 2     （Excel：3, 4）
 *      週一       往下拉 → 週一, 週一     （Excel：週二, 週三）
 *      =A1+B1     往下拉 → =A1+B1         （Excel：=A2+B2）← 最嚴重，結果全錯
 *
 * 這裡實作 Excel 的判斷順序（每一欄 / 每一列獨立判斷）：
 *   1. 兩個以上的數字 → 延伸線性趨勢（最小平方法，等差數列時就是公差）
 *      只有一個數字 → 複製（Excel 預設行為，按 Ctrl 才會遞增）
 *   2. 同前綴、尾巴是數字的文字（「項目 1」「Q1」）→ 尾數遞增
 *   3. 內建清單（星期、月份）→ 沿清單循環
 *   4. 其他 → 循環複製
 *
 * 公式的平移不在這裡處理（需要來源位置），由呼叫端用 shiftFormula 做。
 */

import { asNumber } from './values'

export type FillValue = string | number

/** Excel 內建的自訂清單（中英文），比對時不分大小寫 */
const BUILTIN_LISTS: string[][] = [
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  ['週日', '週一', '週二', '週三', '週四', '週五', '週六'],
  ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  ['第一季', '第二季', '第三季', '第四季'],
]


/** 避免 0.1+0.2 這種浮點尾巴出現在儲存格裡 */
function clean(n: number): number {
  return Number(n.toPrecision(12))
}

/** 最小平方法線性趨勢：回傳 [截距, 斜率]（x 為 0..n-1） */
function linearTrend(ys: number[]): [number, number] {
  const n = ys.length
  const meanX = (n - 1) / 2
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (ys[i] - meanY)
    den += (i - meanX) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  return [meanY - slope * meanX, slope]
}

/** 「前綴 + 數字」，例如「項目 12」→ { prefix: '項目 ', n: 12, width: 2 } */
function splitTrailingNumber(v: FillValue): { prefix: string; n: number; width: number } | null {
  if (typeof v !== 'string') return null
  const m = v.match(/^(.*?)(\d+)$/)
  if (!m || m[1] === '') return null // 純數字走數列規則，不走這裡
  return { prefix: m[1], n: parseInt(m[2], 10), width: m[2].length }
}

function findList(v: FillValue): { list: string[]; index: number } | null {
  if (typeof v !== 'string') return null
  const needle = v.trim().toLowerCase()
  for (const list of BUILTIN_LISTS) {
    const index = list.findIndex((item) => item.toLowerCase() === needle)
    if (index !== -1) return { list, index }
  }
  return null
}

/** 保留使用者輸入的大小寫風格（MON → TUE、mon → tue） */
function matchCase(template: string, word: string): string {
  if (template === template.toUpperCase()) return word.toUpperCase()
  if (template === template.toLowerCase()) return word.toLowerCase()
  return word
}

/**
 * 依來源值推算接下來的 count 個值。
 *
 * @param source    來源值，依填充方向排列（往下填就是由上到下）
 * @param count     要產生幾個
 * @param direction 1 = 接在最後一個之後；-1 = 接在第一個之前（往上 / 往左填）
 *                  回傳值依「離來源由近到遠」排列
 * @returns 無法辨識出數列時回傳 null，由呼叫端循環複製（公式也走那條路）
 */
export function extendSeries(source: FillValue[], count: number, direction: 1 | -1 = 1): FillValue[] | null {
  if (source.length === 0 || count <= 0) return null
  // 公式不是數列：=A1+1 看起來像「前綴 + 尾數」，但遞增尾數會把公式改壞。
  // 公式由呼叫端用 shiftFormula 平移參照。
  if (source.some((v) => typeof v === 'string' && v.startsWith('='))) return null
  const n = source.length
  // 第 k 個新值在趨勢線上的位置（x 軸 0..n-1 是來源）
  const xAt = (k: number) => (direction === 1 ? n - 1 + k : -k)

  // 1. 全部是數字
  const nums = source.map(asNumber)
  if (nums.every((x) => x !== null)) {
    if (n === 1) return null // 單一數字：Excel 預設是複製
    const [b, m] = linearTrend(nums as number[])
    return Array.from({ length: count }, (_, i) => clean(b + m * xAt(i + 1)))
  }

  // 2. 同前綴 + 尾數
  const parts = source.map(splitTrailingNumber)
  if (parts.every((p) => p !== null) && parts.every((p) => p!.prefix === parts[0]!.prefix)) {
    const ps = parts as { prefix: string; n: number; width: number }[]
    // 單一來源時步長是 1；多個時用趨勢
    const [b, m] = n === 1 ? [ps[0].n, 1] : linearTrend(ps.map((p) => p.n))
    const width = ps[ps.length - 1].width
    return Array.from({ length: count }, (_, i) => {
      const v = Math.round(b + m * xAt(i + 1))
      // 保留前導零：「項目 007」→「項目 008」
      const digits = v < 0 ? String(v) : String(v).padStart(width, '0')
      return ps[0].prefix + digits
    })
  }

  // 3. 內建清單
  const hits = source.map(findList)
  if (hits.every((h) => h !== null) && hits.every((h) => h!.list === hits[0]!.list)) {
    const hs = hits as { list: string[]; index: number }[]
    const list = hs[0].list
    const len = list.length
    // 步長：單一來源為 1；多個時取相鄰差（週一、週三 → 步長 2）
    const step = n === 1 ? 1 : (((hs[1].index - hs[0].index) % len) + len) % len || len
    const anchor = direction === 1 ? hs[n - 1].index : hs[0].index
    const template = String(direction === 1 ? source[n - 1] : source[0])
    return Array.from({ length: count }, (_, i) => {
      const idx = (((anchor + direction * step * (i + 1)) % len) + len) % len
      return matchCase(template, list[idx])
    })
  }

  return null
}
