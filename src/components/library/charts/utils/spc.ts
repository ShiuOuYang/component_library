/**
 * SPC（統計製程管制）的純函式：管制常數、管制界限、Nelson 判異規則、製程能力
 *
 * 公式依一般教科書（Montgomery《Introduction to Statistical Quality Control》）：
 * - 計量值：先估計製程標準差 σ̂（移動全距、全距或標準差），界限 = 中心線 ± 3σ̂ / √n
 * - 計數值：p 圖 σ = √(p̄(1−p̄)/n)、u 圖 σ = √(ū/n)；樣本數不同時界限逐點不同
 */

// === 管制常數 ===

/** d2、d3（n = 2～10）：全距與標準差的換算 */
const D2_TABLE = [0, 0, 1.128, 1.693, 2.059, 2.326, 2.534, 2.704, 2.847, 2.97, 3.078]
const D3_TABLE = [0, 0, 0.853, 0.888, 0.88, 0.864, 0.848, 0.833, 0.82, 0.808, 0.797]

/** 全距管制圖支援的子組大小上限（更大的子組請用 X̄-S） */
export const MAX_RANGE_SUBGROUP = 10

export function d2(n: number): number {
  return D2_TABLE[n] ?? NaN
}

export function d3(n: number): number {
  return D3_TABLE[n] ?? NaN
}

/** log Γ(x)（Lanczos 近似），算 c4 用 */
function logGamma(x: number): number {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  x -= 1
  let a = c[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

/** c4：樣本標準差的不偏常數 */
export function c4(n: number): number {
  if (n < 2) return NaN
  return Math.sqrt(2 / (n - 1)) * Math.exp(logGamma(n / 2) - logGamma((n - 1) / 2))
}

/** 常見的表列常數（由 d2、d3、c4 推得；給文件與測試對照） */
export function controlConstants(n: number) {
  const c = c4(n)
  return {
    A2: 3 / (d2(n) * Math.sqrt(n)),
    D3: Math.max(0, 1 - (3 * d3(n)) / d2(n)),
    D4: 1 + (3 * d3(n)) / d2(n),
    A3: 3 / (c * Math.sqrt(n)),
    B3: Math.max(0, 1 - (3 * Math.sqrt(1 - c * c)) / c),
    B4: 1 + (3 * Math.sqrt(1 - c * c)) / c,
  }
}

// === 基本統計 ===

export function mean(values: number[]): number {
  if (!values.length) return NaN
  let s = 0
  for (const v of values) s += v
  return s / values.length
}

/** 樣本標準差（n − 1） */
export function stdev(values: number[]): number {
  const n = values.length
  if (n < 2) return NaN
  const m = mean(values)
  let s = 0
  for (const v of values) s += (v - m) ** 2
  return Math.sqrt(s / (n - 1))
}

/** 標準常態分配的累積機率 Φ(z)（Abramowitz–Stegun 7.1.26，誤差 < 1.5e-7） */
export function normalCdf(z: number): number {
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2))
  const y =
    1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2)
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y)
}

export function normalPdf(x: number, mu: number, sigma: number): number {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI))
}

// === 管制界限 ===

/** 管制圖種類 */
export type ControlChartType = 'imr' | 'xbar-r' | 'xbar-s' | 'p' | 'u'

/** 一個樣本點（I 圖是一筆量測；X̄ 圖是一個子組；p／u 圖是一批） */
export interface SpcSample {
  /** 畫在主圖上的值（量測值、子組平均、不良率、單位缺點數）；缺值為 null */
  value: number | null
  /** 畫在副圖上的值（移動全距、全距、標準差）；計數值圖沒有 */
  secondary: number | null
  /** 子組大小或樣本數 */
  n: number
  /** 原始資料（子組時為多筆） */
  rows: Record<string, unknown>[]
  label: string
}

/** 一條界限（逐點，樣本數不同時每點不同） */
export interface LimitSeries {
  cl: number[]
  ucl: number[]
  lcl: number[]
  /** 每點的 1σ（判異規則用） */
  sigma: number[]
}

/** 使用者指定的固定界限 */
export interface FixedLimits {
  cl: number
  ucl: number
  lcl: number
}

export interface ControlAnalysis {
  type: ControlChartType
  samples: SpcSample[]
  main: LimitSeries
  /** 副圖（移動全距／全距／標準差）；p、u 圖為 null */
  secondary: LimitSeries | null
  /** 估計的製程標準差（計量值圖） */
  sigmaHat: number | null
}

const repeat = (v: number, n: number) => new Array<number>(n).fill(v)

function fixedSeries(l: FixedLimits, n: number): LimitSeries {
  const sigma = Math.abs(l.ucl - l.cl) / 3
  return { cl: repeat(l.cl, n), ucl: repeat(l.ucl, n), lcl: repeat(l.lcl, n), sigma: repeat(sigma, n) }
}

const finite = (v: number | null): v is number => v !== null && Number.isFinite(v)

/**
 * 計算管制界限。
 * @param baseline 只用前 N 個樣本估計界限（第一階段建立界限、第二階段監控）；null 用全部
 * @param fixed 呼叫端指定的固定界限（主圖／副圖），優先於計算值
 */
export function computeLimits(
  type: ControlChartType,
  samples: SpcSample[],
  baseline: number | null = null,
  fixed: { main?: FixedLimits | null; secondary?: FixedLimits | null } = {}
): ControlAnalysis {
  const n = samples.length
  const base = baseline !== null && baseline > 0 ? samples.slice(0, Math.min(n, Math.floor(baseline))) : samples
  let main: LimitSeries
  let secondary: LimitSeries | null = null
  let sigmaHat: number | null = null

  if (type === 'p' || type === 'u') {
    // 計數值：中心線是總不良（缺點）數 / 總樣本數
    let num = 0
    let den = 0
    for (const s of base) {
      if (!finite(s.value) || s.n <= 0) continue
      num += s.value * s.n
      den += s.n
    }
    const center = den > 0 ? num / den : NaN
    const sig = samples.map((s) =>
      s.n > 0 ? (type === 'p' ? Math.sqrt((center * (1 - center)) / s.n) : Math.sqrt(center / s.n)) : NaN
    )
    main = {
      cl: repeat(center, n),
      ucl: sig.map((s) => (type === 'p' ? Math.min(1, center + 3 * s) : center + 3 * s)),
      lcl: sig.map((s) => Math.max(0, center - 3 * s)),
      sigma: sig,
    }
  } else {
    const xbar = mean(base.map((s) => s.value).filter(finite))
    if (type === 'imr') {
      // σ̂ = MR̄ / d2(2)；第一點沒有移動全距
      const mrBar = mean(base.slice(1).map((s) => s.secondary).filter(finite))
      sigmaHat = mrBar / d2(2)
      main = { cl: repeat(xbar, n), ucl: repeat(xbar + 3 * sigmaHat, n), lcl: repeat(xbar - 3 * sigmaHat, n), sigma: repeat(sigmaHat, n) }
      secondary = {
        cl: repeat(mrBar, n),
        ucl: repeat((d2(2) + 3 * d3(2)) * sigmaHat, n),
        lcl: repeat(0, n),
        sigma: repeat(d3(2) * sigmaHat, n),
      }
    } else {
      // 子組大小可以不同：σ̂ 取各子組（全距 / d2 或標準差 / c4）的平均，界限依各子組大小
      const est = base
        .filter((s) => finite(s.secondary) && s.n >= 2)
        .map((s) => (type === 'xbar-r' ? (s.secondary as number) / d2(s.n) : (s.secondary as number) / c4(s.n)))
      sigmaHat = mean(est.filter(Number.isFinite))
      const sh = sigmaHat
      main = {
        cl: repeat(xbar, n),
        ucl: samples.map((s) => xbar + (3 * sh) / Math.sqrt(s.n)),
        lcl: samples.map((s) => xbar - (3 * sh) / Math.sqrt(s.n)),
        sigma: samples.map((s) => sh / Math.sqrt(s.n)),
      }
      if (type === 'xbar-r') {
        secondary = {
          cl: samples.map((s) => d2(s.n) * sh),
          ucl: samples.map((s) => (d2(s.n) + 3 * d3(s.n)) * sh),
          lcl: samples.map((s) => Math.max(0, d2(s.n) - 3 * d3(s.n)) * sh),
          sigma: samples.map((s) => d3(s.n) * sh),
        }
      } else {
        secondary = {
          cl: samples.map((s) => c4(s.n) * sh),
          ucl: samples.map((s) => (c4(s.n) + 3 * Math.sqrt(1 - c4(s.n) ** 2)) * sh),
          lcl: samples.map((s) => Math.max(0, c4(s.n) - 3 * Math.sqrt(1 - c4(s.n) ** 2)) * sh),
          sigma: samples.map((s) => Math.sqrt(1 - c4(s.n) ** 2) * sh),
        }
      }
    }
  }

  if (fixed.main) main = fixedSeries(fixed.main, n)
  if (fixed.secondary && secondary) secondary = fixedSeries(fixed.secondary, n)
  return { type, samples, main, secondary, sigmaHat }
}

// === 樣本整理 ===

export interface SampleOptions {
  valueField: string
  labelField: string
  /** X̄ 圖：子組欄位（同值的列為一組，依第一次出現的順序）；沒有這個欄位時依 subgroupSize 依序切 */
  subgroupField: string
  subgroupSize: number
  /** p／u 圖：不良數（缺點數）與樣本數欄位 */
  defectsField: string
  sizeField: string
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** 把原始資料整理成樣本點 */
export function buildSamples(type: ControlChartType, rows: Record<string, unknown>[], o: SampleOptions): SpcSample[] {
  if (type === 'imr') {
    const out: SpcSample[] = rows.map((r, i) => ({
      value: num(r[o.valueField]),
      secondary: null,
      n: 1,
      rows: [r],
      label: String(r[o.labelField] ?? i + 1),
    }))
    // 移動全距：與前一個有值的點相減；缺值會斷開
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1].value
      const b = out[i].value
      out[i].secondary = a !== null && b !== null ? Math.abs(b - a) : null
    }
    return out
  }

  if (type === 'p' || type === 'u') {
    return rows.map((r, i) => {
      const d = num(r[o.defectsField])
      const size = num(r[o.sizeField]) ?? 0
      return {
        value: d !== null && size > 0 ? d / size : null,
        secondary: null,
        n: size,
        rows: [r],
        label: String(r[o.labelField] ?? i + 1),
      }
    })
  }

  // X̄ 圖：分組
  const groups: { key: string; rows: Record<string, unknown>[] }[] = []
  const hasField = rows.some((r) => r[o.subgroupField] !== undefined && r[o.subgroupField] !== null && r[o.subgroupField] !== '')
  if (hasField) {
    const index = new Map<string, number>()
    for (const r of rows) {
      const key = String(r[o.subgroupField] ?? '')
      let gi = index.get(key)
      if (gi === undefined) {
        gi = groups.length
        index.set(key, gi)
        groups.push({ key, rows: [] })
      }
      groups[gi].rows.push(r)
    }
  } else {
    const size = Math.max(2, Math.floor(o.subgroupSize))
    for (let i = 0; i + size <= rows.length; i += size) {
      groups.push({ key: String(groups.length + 1), rows: rows.slice(i, i + size) })
    }
  }
  return groups.map((g) => {
    const values = g.rows.map((r) => num(r[o.valueField])).filter((v): v is number => v !== null)
    const n = values.length
    const secondary = n < 2 ? null : type === 'xbar-r' ? Math.max(...values) - Math.min(...values) : stdev(values)
    const first = g.rows[0]
    return {
      value: n ? mean(values) : null,
      secondary,
      n,
      rows: g.rows,
      // 有標籤欄位就用（例如批號），沒有時用子組值或序號
      label: String(first?.[o.labelField] ?? g.key),
    }
  })
}

// === Nelson 判異規則 ===

/** 規則說明（編號依 Nelson） */
export const NELSON_RULES: Record<number, string> = {
  1: '1 點超出管制界限（±3σ）',
  2: '連續 9 點在中心線同一側',
  3: '連續 6 點持續上升或下降',
  4: '連續 14 點上下交錯',
  5: '連續 3 點中有 2 點在同一側的 2σ 之外',
  6: '連續 5 點中有 4 點在同一側的 1σ 之外',
  7: '連續 15 點都在 1σ 之內（變異太小、可能分層）',
  8: '連續 8 點都在 1σ 之外（兩側都有，可能混合）',
}

export interface Violation {
  index: number
  rules: number[]
}

/**
 * 檢查判異規則，回傳每個違規點觸發了哪些規則。
 * 標出的是「讓規則成立的那一點」（與 Minitab 相同）；缺值會中斷連續的計數。
 */
export function checkRules(values: (number | null)[], limits: LimitSeries, rules: number[]): Violation[] {
  const enabled = new Set(rules)
  const hits = new Map<number, Set<number>>()
  const flag = (i: number, rule: number) => {
    let s = hits.get(i)
    if (!s) hits.set(i, (s = new Set()))
    s.add(rule)
  }
  // z：與中心線相差幾個 σ；沒有值的點為 null
  const z = values.map((v, i) => {
    const s = limits.sigma[i]
    return v === null || !Number.isFinite(v) || !(s > 0) ? null : (v - limits.cl[i]) / s
  })

  /**
   * 往回看 len 個點（含 i），任何一點沒有值就回傳 null。
   * partial：開頭不滿 len 點時用現有的點（「3 點中 2 點」在最前面兩點就都超出時也算）
   */
  const window = (i: number, len: number, partial = false): number[] | null => {
    if (i - len + 1 < 0) {
      if (!partial) return null
      len = i + 1
    }
    const w: number[] = []
    for (let k = i - len + 1; k <= i; k++) {
      if (z[k] === null) return null
      w.push(z[k] as number)
    }
    return w
  }

  for (let i = 0; i < z.length; i++) {
    const zi = z[i]
    if (zi === null) continue
    const v = values[i] as number
    // 規則 1 直接比界限（p 圖的界限會被夾在 0～1，不能只看 z）
    if (enabled.has(1) && (v > limits.ucl[i] || v < limits.lcl[i])) flag(i, 1)
    if (enabled.has(2)) {
      const w = window(i, 9)
      if (w && (w.every((x) => x > 0) || w.every((x) => x < 0))) flag(i, 2)
    }
    if (enabled.has(3)) {
      const w = window(i, 6)
      if (w) {
        const vs = values.slice(i - 5, i + 1) as number[]
        let up = true
        let down = true
        for (let k = 1; k < 6; k++) {
          if (!(vs[k] > vs[k - 1])) up = false
          if (!(vs[k] < vs[k - 1])) down = false
        }
        if (up || down) flag(i, 3)
      }
    }
    if (enabled.has(4)) {
      const w = window(i, 14)
      if (w) {
        const vs = values.slice(i - 13, i + 1) as number[]
        let alt = true
        for (let k = 2; k < 14 && alt; k++) {
          const d1 = vs[k - 1] - vs[k - 2]
          const d2v = vs[k] - vs[k - 1]
          if (!(d1 * d2v < 0)) alt = false
        }
        if (alt) flag(i, 4)
      }
    }
    if (enabled.has(5)) {
      const w = window(i, 3, true)
      if (w && (w.filter((x) => x > 2).length >= 2 || w.filter((x) => x < -2).length >= 2) && Math.abs(zi) > 2) flag(i, 5)
    }
    if (enabled.has(6)) {
      const w = window(i, 5, true)
      if (w && (w.filter((x) => x > 1).length >= 4 || w.filter((x) => x < -1).length >= 4) && Math.abs(zi) > 1) flag(i, 6)
    }
    if (enabled.has(7)) {
      const w = window(i, 15)
      if (w && w.every((x) => Math.abs(x) < 1)) flag(i, 7)
    }
    if (enabled.has(8)) {
      const w = window(i, 8)
      if (w && w.every((x) => Math.abs(x) > 1) && w.some((x) => x > 1) && w.some((x) => x < -1)) flag(i, 8)
    }
  }
  return [...hits.entries()].sort((a, b) => a[0] - b[0]).map(([index, s]) => ({ index, rules: [...s].sort((a, b) => a - b) }))
}

// === 製程能力 ===

export interface CapabilityInput {
  values: number[]
  lsl: number | null
  usl: number | null
  /** 組內標準差的子組大小：1 用移動全距、2～10 用全距、更大用標準差 */
  subgroupSize: number
}

export interface CapabilityResult {
  n: number
  mean: number
  /** 整體標準差（Pp、Ppk 用） */
  sigmaOverall: number
  /** 組內標準差（Cp、Cpk 用） */
  sigmaWithin: number
  cp: number | null
  cpk: number | null
  cpl: number | null
  cpu: number | null
  pp: number | null
  ppk: number | null
  /** 實際落在規格外的比例換算 PPM */
  ppmObserved: { below: number; above: number; total: number }
  /** 依整體常態分配預估的規格外 PPM */
  ppmExpected: { below: number; above: number; total: number }
}

/** 組內標準差 */
export function withinSigma(values: number[], subgroupSize: number): number {
  const k = Math.max(1, Math.floor(subgroupSize))
  if (k === 1) {
    const mr: number[] = []
    for (let i = 1; i < values.length; i++) mr.push(Math.abs(values[i] - values[i - 1]))
    return mean(mr) / d2(2)
  }
  const groups: number[][] = []
  for (let i = 0; i + k <= values.length; i += k) groups.push(values.slice(i, i + k))
  if (k <= MAX_RANGE_SUBGROUP) return mean(groups.map((g) => Math.max(...g) - Math.min(...g))) / d2(k)
  return mean(groups.map((g) => stdev(g))) / c4(k)
}

/**
 * 製程能力指標。
 * 只有單邊規格時，Cp／Pp 沒有定義（null），Cpk／Ppk 取有規格的那一邊。
 */
export function computeCapability(input: CapabilityInput): CapabilityResult {
  const values = input.values.filter((v) => Number.isFinite(v))
  const n = values.length
  const mu = mean(values)
  const so = stdev(values)
  const sw = withinSigma(values, input.subgroupSize)
  const { lsl, usl } = input
  const ok = (v: number) => (Number.isFinite(v) ? v : null)
  const hasL = lsl !== null && Number.isFinite(lsl)
  const hasU = usl !== null && Number.isFinite(usl)
  const index = (sigma: number) => {
    const lower = hasL ? ok((mu - (lsl as number)) / (3 * sigma)) : null
    const upper = hasU ? ok(((usl as number) - mu) / (3 * sigma)) : null
    const both = hasL && hasU ? ok(((usl as number) - (lsl as number)) / (6 * sigma)) : null
    const k = lower !== null && upper !== null ? Math.min(lower, upper) : (lower ?? upper)
    return { both, k, lower, upper }
  }
  const within = index(sw)
  const overall = index(so)

  const below = hasL ? values.filter((v) => v < (lsl as number)).length : 0
  const above = hasU ? values.filter((v) => v > (usl as number)).length : 0
  const ppm = (count: number) => (n ? (count / n) * 1e6 : 0)
  const expBelow = hasL && so > 0 ? normalCdf(((lsl as number) - mu) / so) * 1e6 : 0
  const expAbove = hasU && so > 0 ? (1 - normalCdf(((usl as number) - mu) / so)) * 1e6 : 0

  return {
    n,
    mean: mu,
    sigmaOverall: so,
    sigmaWithin: sw,
    cp: within.both,
    cpk: within.k,
    cpl: within.lower,
    cpu: within.upper,
    pp: overall.both,
    ppk: overall.k,
    ppmObserved: { below: ppm(below), above: ppm(above), total: ppm(below + above) },
    ppmExpected: { below: expBelow, above: expAbove, total: expBelow + expAbove },
  }
}
