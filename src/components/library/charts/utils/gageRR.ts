/**
 * 量測系統分析（Gage R&R，交叉設計、ANOVA 法）
 *
 * 每個零件由每位作業員各量 r 次。用二因子 ANOVA（零件 × 作業員，含交互作用）拆出：
 * - 重複性（Repeatability，同一人同一件重量的差異，設備變異 EV）
 * - 再現性（Reproducibility，不同人之間的差異 AV，含作業員 × 零件交互作用）
 * - 零件間變異（Part-to-Part）
 * 交互作用不顯著（p > interactionAlpha）時併入誤差項重算（與 Minitab 相同）。
 */
import { incompleteBeta } from './correlation'
import { controlConstants } from './spc'

export interface GageRow {
  part: string | number
  operator: string
  value: number
}

export interface AnovaRow {
  source: 'part' | 'operator' | 'interaction' | 'repeatability' | 'total'
  df: number
  ss: number
  ms: number | null
  f: number | null
  p: number | null
}

export interface GageComponent {
  source: 'grr' | 'repeatability' | 'reproducibility' | 'operator' | 'interaction' | 'part' | 'total'
  variance: number
  sd: number
  /** 研究變異 = k × σ */
  studyVar: number
  /** 變異數占總變異數的百分比 */
  contribution: number
  /** σ 占總 σ 的百分比 */
  pctStudyVar: number
  /** k × σ 占公差的百分比（沒給公差時為 null） */
  pctTolerance: number | null
}

export type GageVerdict = 'acceptable' | 'marginal' | 'unacceptable'

export interface GageCell {
  part: string
  operator: string
  values: number[]
  mean: number
  range: number
}

export interface GageResult {
  parts: string[]
  operators: string[]
  /** 每格（零件 × 作業員）的次數；不平衡時取最少的次數，多的捨去 */
  trials: number
  /** 有格子的次數不一樣（多的已捨去） */
  trimmed: boolean
  grandMean: number
  cells: GageCell[]
  /** 含交互作用的 ANOVA 表 */
  anova: AnovaRow[]
  /** 交互作用併入誤差後的 ANOVA 表（交互作用顯著時為 null） */
  anovaReduced: AnovaRow[] | null
  interactionP: number | null
  interactionPooled: boolean
  components: GageComponent[]
  /** 可分辨的類別數（≥ 5 為佳） */
  ndc: number
  /** 判定用的百分比（%Tolerance 或 %StudyVar） */
  grrPercent: number
  basis: 'studyVar' | 'tolerance'
  verdict: GageVerdict
  /** R 管制圖（每格的全距） */
  rBar: number
  rLimits: { ucl: number; lcl: number }
  /** X̄ 管制圖（每格的平均） */
  xLimits: { ucl: number; lcl: number }
  partMeans: Map<string, number>
  operatorMeans: Map<string, number>
}

export interface GageOptions {
  /** 公差（USL − LSL），給了才算 %Tolerance */
  tolerance?: number | null
  /** 研究變異倍數（6 或 5.15） */
  multiplier?: number
  /** 交互作用 p 值大於它就併入誤差 */
  interactionAlpha?: number
  /** 判定依據：auto = 有公差用 %Tolerance，否則 %StudyVar */
  basis?: 'auto' | 'studyVar' | 'tolerance'
}

export type GageError = 'empty' | 'parts' | 'operators' | 'trials' | 'missing'

/** F 分配右尾機率 P(F > f) */
export function fPValue(f: number, df1: number, df2: number): number | null {
  if (!(df1 > 0) || !(df2 > 0) || !Number.isFinite(f)) return f === Infinity ? 0 : null
  if (f <= 0) return 1
  return incompleteBeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2)
}

/** 判定：< 10% 可接受、10～30% 視用途而定、> 30% 不可接受 */
export function gageVerdict(pct: number): GageVerdict {
  return pct < 10 ? 'acceptable' : pct <= 30 ? 'marginal' : 'unacceptable'
}

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0)

function order<T>(values: T[]): string[] {
  const seen = new Set<string>()
  for (const v of values) seen.add(String(v))
  return [...seen]
}

export function analyzeGage(rows: readonly GageRow[], o: GageOptions = {}): { result: GageResult | null; error: GageError | null } {
  const clean = rows.filter((r) => r && Number.isFinite(r.value) && r.operator !== undefined && r.part !== undefined)
  if (!clean.length) return { result: null, error: 'empty' }
  const parts = order(clean.map((r) => r.part))
  const operators = order(clean.map((r) => r.operator))
  if (parts.length < 2) return { result: null, error: 'parts' }
  if (operators.length < 1) return { result: null, error: 'operators' }

  const byCell = new Map<string, number[]>()
  const key = (p: string, op: string) => `${p}\u0000${op}`
  for (const r of clean) {
    const k = key(String(r.part), String(r.operator))
    const list = byCell.get(k)
    if (list) list.push(r.value)
    else byCell.set(k, [r.value])
  }
  let trials = Infinity
  let maxTrials = 0
  for (const p of parts) {
    for (const op of operators) {
      const v = byCell.get(key(p, op))
      if (!v) return { result: null, error: 'missing' }
      trials = Math.min(trials, v.length)
      maxTrials = Math.max(maxTrials, v.length)
    }
  }
  if (trials < 2) return { result: null, error: 'trials' }

  const p = parts.length
  const oN = operators.length
  const r = trials
  const cells: GageCell[] = []
  for (const pt of parts) {
    for (const op of operators) {
      const values = byCell.get(key(pt, op))!.slice(0, r)
      cells.push({ part: pt, operator: op, values, mean: avg(values), range: Math.max(...values) - Math.min(...values) })
    }
  }
  const all = cells.flatMap((c) => c.values)
  const grand = avg(all)
  const partMeans = new Map(parts.map((pt) => [pt, avg(cells.filter((c) => c.part === pt).flatMap((c) => c.values))]))
  const operatorMeans = new Map(operators.map((op) => [op, avg(cells.filter((c) => c.operator === op).flatMap((c) => c.values))]))

  const ssP = oN * r * sum(parts.map((pt) => (partMeans.get(pt)! - grand) ** 2))
  const ssO = p * r * sum(operators.map((op) => (operatorMeans.get(op)! - grand) ** 2))
  const ssPO = r * sum(cells.map((c) => (c.mean - partMeans.get(c.part)! - operatorMeans.get(c.operator)! + grand) ** 2))
  const ssE = sum(cells.flatMap((c) => c.values.map((v) => (v - c.mean) ** 2)))
  const ssT = sum(all.map((v) => (v - grand) ** 2))
  const dfP = p - 1
  const dfO = oN - 1
  const dfPO = dfP * dfO
  const dfE = p * oN * (r - 1)
  const ms = (ss: number, df: number) => (df > 0 ? ss / df : null)
  const msP = ms(ssP, dfP)!
  const msO = ms(ssO, dfO)
  const msPO = ms(ssPO, dfPO)
  const msE = ms(ssE, dfE)!
  const ratio = (a: number | null, b: number | null) => (a === null || b === null ? null : b > 0 ? a / b : a > 0 ? Infinity : null)

  // 只有一位作業員時沒有再現性與交互作用：零件直接對誤差檢定
  const denom = msPO ?? msE
  const dfDen = msPO !== null ? dfPO : dfE
  const fP = ratio(msP, denom)
  const fO = ratio(msO, denom)
  const fPO = ratio(msPO, msE)
  const pPO = fPO === null ? null : fPValue(fPO, dfPO, dfE)
  const anova: AnovaRow[] = [
    { source: 'part', df: dfP, ss: ssP, ms: msP, f: fP, p: fP === null ? null : fPValue(fP, dfP, dfDen) },
    { source: 'operator', df: dfO, ss: ssO, ms: msO, f: fO, p: fO === null ? null : fPValue(fO, dfO, dfDen) },
    { source: 'interaction', df: dfPO, ss: ssPO, ms: msPO, f: fPO, p: pPO },
    { source: 'repeatability', df: dfE, ss: ssE, ms: msE, f: null, p: null },
    { source: 'total', df: p * oN * r - 1, ss: ssT, ms: null, f: null, p: null },
  ]

  const alpha = o.interactionAlpha ?? 0.05
  const pooled = pPO !== null && pPO > alpha
  let anovaReduced: AnovaRow[] | null = null
  let vRepeat: number
  let vOp: number
  let vPO: number
  let vPart: number
  if (pooled) {
    const dfR = dfPO + dfE
    const msR = (ssPO + ssE) / dfR
    const fP2 = ratio(msP, msR)
    const fO2 = ratio(msO, msR)
    anovaReduced = [
      { source: 'part', df: dfP, ss: ssP, ms: msP, f: fP2, p: fP2 === null ? null : fPValue(fP2, dfP, dfR) },
      { source: 'operator', df: dfO, ss: ssO, ms: msO, f: fO2, p: fO2 === null ? null : fPValue(fO2, dfO, dfR) },
      { source: 'repeatability', df: dfR, ss: ssPO + ssE, ms: msR, f: null, p: null },
      { source: 'total', df: p * oN * r - 1, ss: ssT, ms: null, f: null, p: null },
    ]
    vRepeat = msR
    vOp = Math.max(0, ((msO ?? 0) - msR) / (p * r))
    vPO = 0
    vPart = Math.max(0, (msP - msR) / (oN * r))
  } else {
    vRepeat = msE
    vPO = msPO === null ? 0 : Math.max(0, (msPO - msE) / r)
    vOp = msO === null ? 0 : Math.max(0, (msO - (msPO ?? msE)) / (p * r))
    vPart = Math.max(0, (msP - (msPO ?? msE)) / (oN * r))
  }

  const k = o.multiplier ?? 6
  const tol = o.tolerance && o.tolerance > 0 ? o.tolerance : null
  const vReprod = vOp + vPO
  const vGrr = vRepeat + vReprod
  const vTotal = vGrr + vPart
  const sdTotal = Math.sqrt(vTotal)
  const comp = (source: GageComponent['source'], variance: number): GageComponent => {
    const sd = Math.sqrt(variance)
    return {
      source,
      variance,
      sd,
      studyVar: k * sd,
      contribution: vTotal > 0 ? (variance / vTotal) * 100 : 0,
      pctStudyVar: sdTotal > 0 ? (sd / sdTotal) * 100 : 0,
      pctTolerance: tol ? ((k * sd) / tol) * 100 : null,
    }
  }
  const components: GageComponent[] = [
    comp('grr', vGrr),
    comp('repeatability', vRepeat),
    comp('reproducibility', vReprod),
    comp('operator', vOp),
    ...(pooled || oN < 2 ? [] : [comp('interaction', vPO)]),
    comp('part', vPart),
    comp('total', vTotal),
  ]
  const grr = components[0]
  const basis: 'studyVar' | 'tolerance' = o.basis === 'tolerance' && tol ? 'tolerance' : o.basis === 'studyVar' || !tol ? 'studyVar' : 'tolerance'
  const grrPercent = basis === 'tolerance' ? grr.pctTolerance! : grr.pctStudyVar
  const ndc = grr.sd > 0 ? Math.max(1, Math.floor((Math.SQRT2 * Math.sqrt(vPart)) / grr.sd)) : Infinity

  const rBar = avg(cells.map((c) => c.range))
  const cc = controlConstants(r)
  return {
    error: null,
    result: {
      parts,
      operators,
      trials: r,
      trimmed: maxTrials > r,
      grandMean: grand,
      cells,
      anova,
      anovaReduced,
      interactionP: pPO,
      interactionPooled: pooled,
      components,
      ndc,
      grrPercent,
      basis,
      verdict: gageVerdict(grrPercent),
      rBar,
      rLimits: { ucl: cc.D4 * rBar, lcl: cc.D3 * rBar },
      xLimits: { ucl: grand + cc.A2 * rBar, lcl: grand - cc.A2 * rBar },
      partMeans,
      operatorMeans,
    },
  }
}

/** 落在 X̄ 管制界限外的比例（Gage R&R 的 X̄ 圖要大多數點在界限外，代表量測能分辨零件） */
export function outsideFraction(res: GageResult): number {
  const out = res.cells.filter((c) => c.mean > res.xLimits.ucl || c.mean < res.xLimits.lcl).length
  return res.cells.length ? out / res.cells.length : 0
}
