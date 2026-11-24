/**
 * AQL 抽樣檢驗（ANSI/ASQ Z1.4 / ISO 2859-1，單次抽樣、正常檢驗）。
 *
 * - 表 I：批量 × 檢驗水準 → 樣本代字
 * - 表 II-A（正常檢驗）：樣本代字 × AQL → 樣本數、允收數 Ac、拒收數 Re；箭頭依標準往下 / 往上找最近的方案（樣本數跟著變）
 *
 * 表 II-A 的規律：同一條斜線（代字序號 + AQL 序號相同）上的 Ac / Re 一樣，
 * 依序為 0/1、↑、↓、1/2、2/3、3/4、5/6、7/8、10/11、14/15、21/22，以及只有 A–E 才有的 30/31、44/45。
 */

/** 檢驗水準 */
export type AqlLevel = 'S-1' | 'S-2' | 'S-3' | 'S-4' | 'I' | 'II' | 'III'
export const AQL_LEVELS: AqlLevel[] = ['S-1', 'S-2', 'S-3', 'S-4', 'I', 'II', 'III']

/** 標準 AQL 值（%，10 以上為每百單位缺點數） */
export const AQL_VALUES = [0.01, 0.015, 0.025, 0.04, 0.065, 0.1, 0.15, 0.25, 0.4, 0.65, 1, 1.5, 2.5, 4, 6.5, 10, 15, 25, 40, 65, 100, 150, 250, 400, 650, 1000] as const

/** 樣本代字（依序） */
export const CODE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R'] as const
export type CodeLetter = (typeof CODE_LETTERS)[number]
const SAMPLE_SIZES = [2, 3, 5, 8, 13, 20, 32, 50, 80, 125, 200, 315, 500, 800, 1250, 2000]

/** 表 I 的批量上限（含） */
const LOT_LIMITS = [8, 15, 25, 50, 90, 150, 280, 500, 1200, 3200, 10000, 35000, 150000, 500000, Infinity]
const TABLE_I: Record<AqlLevel, string> = {
  'S-1': 'AAAABBBBCCCCDDD',
  'S-2': 'AAABBBCCCDDDEEE',
  'S-3': 'AABBCCDDEEFFGGH',
  'S-4': 'AABCCDEEFGGHJJK',
  I: 'AABCCDEFGHJKLMN',
  II: 'ABCDEFGHJKLMNPQ',
  III: 'BCDEFGHJKLMNPQR',
}

/** 批量與檢驗水準 → 樣本代字；批量 < 2 時回傳 null */
export function codeLetter(lotSize: number, level: AqlLevel): CodeLetter | null {
  if (!(lotSize >= 2)) return null
  const i = LOT_LIMITS.findIndex((l) => lotSize <= l)
  return TABLE_I[level][i] as CodeLetter
}

export const sampleSizeOf = (letter: CodeLetter) => SAMPLE_SIZES[CODE_LETTERS.indexOf(letter)]

/** 斜線上的方案；'up' / 'down' 是箭頭 */
function diagonal(d: number, row: number): [number, number] | 'up' | 'down' {
  if (d < 14) return 'down'
  if (d === 14) return [0, 1]
  if (d === 15) return row === 0 ? 'down' : 'up'
  if (d === 16) return 'down'
  const seq: [number, number][] = [
    [1, 2],
    [2, 3],
    [3, 4],
    [5, 6],
    [7, 8],
    [10, 11],
    [14, 15],
    [21, 22],
  ]
  if (d <= 24) return seq[d - 17]
  if (row <= 4 && d === 25) return [30, 31]
  if (row <= 4 && d === 26) return [44, 45]
  return 'up'
}

export interface AqlPlan {
  /** 表 I 查到的代字 */
  letter: CodeLetter
  /** 依箭頭實際使用的代字（樣本數跟著變） */
  planLetter: CodeLetter
  /** 樣本數（已依批量上限；樣本數 ≥ 批量時全檢） */
  sampleSize: number
  ac: number
  re: number
  /** 樣本數 ≥ 批量，改為全數檢驗 */
  fullInspection: boolean
  /** 有沒有依箭頭換到別的代字 */
  arrow: 'up' | 'down' | null
}

/**
 * 正常檢驗的單次抽樣方案。AQL 要是標準值之一，否則回傳 null。
 * 箭頭往下（或往上）找到第一個方案；超出表格時往反方向找。
 */
export function normalPlan(lotSize: number, level: AqlLevel, aql: number): AqlPlan | null {
  const letter = codeLetter(lotSize, level)
  const col = AQL_VALUES.findIndex((v) => Math.abs(v - aql) < 1e-9)
  if (!letter || col < 0) return null
  const start = CODE_LETTERS.indexOf(letter)
  let row = start
  let dir: 'up' | 'down' | null = null
  for (let guard = 0; guard < 40; guard++) {
    const cell = diagonal(row + col, row)
    if (Array.isArray(cell)) {
      const n = SAMPLE_SIZES[row]
      const full = n >= lotSize
      return { letter, planLetter: CODE_LETTERS[row], sampleSize: full ? lotSize : n, ac: cell[0], re: cell[1], fullInspection: full, arrow: dir }
    }
    dir ??= cell
    const step = cell === 'down' ? 1 : -1
    // 超出表格：往反方向
    row = row + step < 0 || row + step >= CODE_LETTERS.length ? row - step : row + step
  }
  return null
}

export type AqlVerdict = 'pending' | 'accept' | 'reject'

/** 判定：缺點數 ≥ Re 立刻拒收；檢完樣本且 ≤ Ac 允收；其他為檢驗中 */
export function aqlVerdict(plan: Pick<AqlPlan, 'sampleSize' | 'ac' | 're'>, inspected: number, defects: number): AqlVerdict {
  if (defects >= plan.re) return 'reject'
  if (inspected >= plan.sampleSize && defects <= plan.ac) return 'accept'
  return 'pending'
}

export type AqlSeverity = 'normal' | 'tightened' | 'reduced'
export type AqlAdvice = 'toTightened' | 'toNormal' | 'toReduced' | 'discontinue' | null

/**
 * 轉換規則（Z1.4）：依最近各批的結果（舊 → 新，true = 允收）給建議。
 * - 正常 → 加嚴：連續 5 批內有 2 批拒收
 * - 加嚴 → 正常：連續 5 批允收
 * - 加嚴累計 5 批拒收：停止檢驗（暫停允收，等供應商改善）
 * - 正常 → 減量：連續 10 批允收（另需生產穩定且主管同意）
 * - 減量 → 正常：有一批拒收
 */
export function switchingAdvice(history: readonly boolean[], severity: AqlSeverity): AqlAdvice {
  const last = (k: number) => history.slice(-k)
  if (severity === 'normal') {
    if (last(5).filter((ok) => !ok).length >= 2) return 'toTightened'
    if (history.length >= 10 && last(10).every(Boolean)) return 'toReduced'
    return null
  }
  if (severity === 'tightened') {
    if (history.filter((ok) => !ok).length >= 5) return 'discontinue'
    if (history.length >= 5 && last(5).every(Boolean)) return 'toNormal'
    return null
  }
  return history.length && !history[history.length - 1] ? 'toNormal' : null
}
