/**
 * 二水準因子實驗（2^k 全因子或部分因子）的效果分析。
 *
 * - 每個因子編碼成 −1（低水準）/ +1（高水準）
 * - 效果 = 該項為 +1 那一半的平均 − 為 −1 那一半的平均；交互作用項的符號是各因子符號相乘
 * - 顯著性：
 *   · 有重複（同一組合做了不只一次）：用組內變異（pure error）估 σ，SE = 2σ / √N，t = 效果 / SE，
 *     自由度 = N − 組合數，與 t(0.975, df) 比較
 *   · 沒有重複：Lenth 法——s0 = 1.5 × median|效果|，PSE = 1.5 × median(|效果| < 2.5·s0)，
 *     自由度 = 效果數 / 3（Minitab 的作法）；效果 / PSE 與 t(0.975, df) 比較
 * - 主效果圖：每個因子低 / 高水準的平均；交互作用圖：兩因子四個組合的平均
 */
import { tQuantile975 } from './scatter'

export interface DoeRun {
  /** 各因子的編碼（−1 / +1） */
  x: number[]
  y: number
}

export interface DoeDesign {
  runs: DoeRun[]
  /** 各因子實際的低 / 高水準 */
  levels: [unknown, unknown][]
  /** 因子不是兩個水準、或量測值不是數字而略過的列數 */
  dropped: number
  /** 有因子不是剛好兩個水準（無法分析） */
  invalidFactors: number[]
}

export interface DoeTerm {
  /** 'A'、'B'、'AB'… */
  key: string
  /** 因子的索引 */
  factors: number[]
}

export interface DoeEffect {
  term: DoeTerm
  effect: number
  /** 迴歸係數 = 效果 / 2 */
  coef: number
  /** 標準化效果（t 值）；無法估計時為 NaN */
  t: number
  significant: boolean
}

export interface DoeAnalysis {
  effects: DoeEffect[]
  mean: number
  n: number
  method: 'replicates' | 'lenth' | 'none'
  df: number
  /** 顯著的門檻（標準化效果） */
  tCrit: number
  /** 效果的標準誤（重複法）或 PSE（Lenth 法） */
  se: number
}

const LETTERS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
export const factorLetter = (i: number) => LETTERS[i] ?? `F${i + 1}`

function compareLevel(a: unknown, b: unknown): number {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

/**
 * 把資料列編碼成 −1 / +1。levels 可指定每個因子的 [低, 高]；不給時用出現的兩個值（數字由小到大）。
 * 已經是 −1 / +1 的資料照樣適用（−1 為低）。
 */
export function codeDesign(
  data: Record<string, unknown>[],
  factors: string[],
  response: string,
  levels: Record<string, [unknown, unknown]> = {},
): DoeDesign {
  const lv: [unknown, unknown][] = []
  const invalidFactors: number[] = []
  factors.forEach((f, i) => {
    if (levels[f]) {
      lv.push(levels[f])
      return
    }
    const seen: unknown[] = []
    for (const row of data) {
      const v = row[f]
      if (v === null || v === undefined || v === '') continue
      if (!seen.some((s) => String(s) === String(v))) seen.push(v)
    }
    seen.sort(compareLevel)
    if (seen.length !== 2) invalidFactors.push(i)
    lv.push([seen[0], seen[seen.length - 1]])
  })
  const runs: DoeRun[] = []
  let dropped = 0
  for (const row of data) {
    const y = Number(row[response])
    const x = factors.map((f, i) => {
      const v = String(row[f])
      return v === String(lv[i][0]) ? -1 : v === String(lv[i][1]) ? 1 : 0
    })
    if (!Number.isFinite(y) || row[response] === null || row[response] === '' || x.includes(0)) {
      dropped++
      continue
    }
    runs.push({ x, y })
  }
  return { runs: invalidFactors.length ? [] : runs, levels: lv, dropped, invalidFactors }
}

/** 所有到 maxOrder 階的項：A、B、C、AB、AC、BC、ABC… */
export function doeTerms(k: number, maxOrder = 2): DoeTerm[] {
  const out: DoeTerm[] = []
  const rec = (start: number, acc: number[]) => {
    if (acc.length) out.push({ key: acc.map(factorLetter).join(''), factors: [...acc] })
    if (acc.length >= maxOrder) return
    for (let i = start; i < k; i++) rec(i + 1, [...acc, i])
  }
  rec(0, [])
  return out.sort((a, b) => a.factors.length - b.factors.length || a.key.localeCompare(b.key))
}

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN)
function median(a: number[]): number {
  if (!a.length) return NaN
  const s = [...a].sort((p, q) => p - q)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
/** 小數自由度：在相鄰兩個整數之間線性內插 */
export function tCrit975(df: number): number {
  if (!(df >= 1)) return NaN
  const lo = Math.floor(df)
  const frac = df - lo
  return frac ? tQuantile975(lo) * (1 - frac) + tQuantile975(lo + 1) * frac : tQuantile975(lo)
}

const sign = (run: DoeRun, term: DoeTerm) => term.factors.reduce((s, f) => s * run.x[f], 1)

export function analyzeDoe(runs: DoeRun[], k: number, maxOrder = 2): DoeAnalysis {
  const n = runs.length
  const terms = doeTerms(k, maxOrder)
  const raw = terms
    .map((term) => {
      const hi = runs.filter((r) => sign(r, term) > 0).map((r) => r.y)
      const lo = runs.filter((r) => sign(r, term) < 0).map((r) => r.y)
      return { term, effect: hi.length && lo.length ? mean(hi) - mean(lo) : NaN }
    })
    .filter((e) => Number.isFinite(e.effect))

  // 組內變異（同一組合的重複）
  const cells = new Map<string, number[]>()
  for (const r of runs) {
    const key = r.x.join(',')
    if (!cells.has(key)) cells.set(key, [])
    cells.get(key)!.push(r.y)
  }
  let ss = 0
  for (const ys of cells.values()) {
    const m = mean(ys)
    for (const y of ys) ss += (y - m) ** 2
  }
  const dfPure = n - cells.size

  let method: DoeAnalysis['method'] = 'none'
  let se = NaN
  let df = 0
  if (dfPure > 0 && ss > 0) {
    method = 'replicates'
    df = dfPure
    se = (2 * Math.sqrt(ss / dfPure)) / Math.sqrt(n)
  } else if (raw.length >= 3) {
    const abs = raw.map((e) => Math.abs(e.effect))
    const s0 = 1.5 * median(abs)
    const trimmed = abs.filter((a) => a < 2.5 * s0)
    const pse = 1.5 * median(trimmed.length ? trimmed : abs)
    if (pse > 0) {
      method = 'lenth'
      df = raw.length / 3
      se = pse
    }
  }
  const tCrit = method === 'none' ? NaN : tCrit975(df)
  return {
    effects: raw.map((e) => {
      const t = se > 0 ? e.effect / se : NaN
      return { term: e.term, effect: e.effect, coef: e.effect / 2, t, significant: Number.isFinite(t) && Math.abs(t) > tCrit }
    }),
    mean: mean(runs.map((r) => r.y)),
    n,
    method,
    df,
    tCrit,
    se,
  }
}

/** 主效果：每個因子低 / 高水準的平均 */
export function mainEffectMeans(runs: DoeRun[], k: number): { low: number; high: number }[] {
  return Array.from({ length: k }, (_, f) => ({
    low: mean(runs.filter((r) => r.x[f] < 0).map((r) => r.y)),
    high: mean(runs.filter((r) => r.x[f] > 0).map((r) => r.y)),
  }))
}

/** 交互作用：因子 a 在 x 軸、因子 b 分兩條線；回傳 [b 低, b 高] × [a 低, a 高] 的平均 */
export function interactionMeans(runs: DoeRun[], a: number, b: number): [[number, number], [number, number]] {
  const cell = (sa: number, sb: number) => mean(runs.filter((r) => r.x[a] === sa && r.x[b] === sb).map((r) => r.y))
  return [
    [cell(-1, -1), cell(1, -1)],
    [cell(-1, 1), cell(1, 1)],
  ]
}
