/**
 * OEE（設備綜合效率）與六大損失的計算。
 *
 * 時間的流向（都用同一個時間單位，例如分鐘）：
 *   計畫生產時間
 *   − 設備故障、換線調整（稼動損失）       = 稼動時間（run time）
 *   − 小停機、速度降低（性能損失）         = 淨稼動時間（net run time）
 *   − 啟動不良、製程不良（品質損失）       = 有效時間（valuable time）
 * 稼動率 A = 稼動時間 ÷ 計畫時間；性能稼動率 P = 淨稼動 ÷ 稼動；良率 Q = 有效 ÷ 淨稼動；OEE = A × P × Q = 有效 ÷ 計畫。
 *
 * 現場資料常常是「停機分鐘 + 理想週期時間 + 生產數 + 良品數」：用 oeeFromCounts 換算成六大損失的時間。
 */

export const OEE_LOSSES = ['breakdown', 'setup', 'minorStops', 'reducedSpeed', 'startupRejects', 'productionRejects'] as const
export type OeeLossKey = (typeof OEE_LOSSES)[number]
export type OeeLossGroup = 'availability' | 'performance' | 'quality'

export const OEE_LOSS_GROUP: Record<OeeLossKey, OeeLossGroup> = {
  breakdown: 'availability',
  setup: 'availability',
  minorStops: 'performance',
  reducedSpeed: 'performance',
  startupRejects: 'quality',
  productionRejects: 'quality',
}

export interface OeeInput {
  id: string
  name: string
  /** 計畫生產時間（已扣掉休息、計畫保養等計畫停機） */
  plannedTime: number
  /** 六大損失（時間；與 plannedTime 同單位） */
  losses: Partial<Record<OeeLossKey, number>>
}

export type OeeStepKind = 'total' | 'loss'
export type OeeTotalKey = 'planned' | 'runTime' | 'netRunTime' | 'valuable'

export interface OeeStep {
  kind: OeeStepKind
  key: OeeTotalKey | OeeLossKey
  /** 長條的起點與終點（時間） */
  from: number
  to: number
  /** 這一段的時間（損失為正數） */
  value: number
  group?: OeeLossGroup
}

export interface OeeResult {
  planned: number
  runTime: number
  netRunTime: number
  valuable: number
  availability: number
  performance: number
  quality: number
  oee: number
  /** 實際採用的損失（總和超過計畫時間時依序截掉） */
  losses: Record<OeeLossKey, number>
  /** 各類損失合計 */
  groupLoss: Record<OeeLossGroup, number>
  /** 瀑布圖的每一段 */
  steps: OeeStep[]
  /** 最大的單項損失 */
  biggestLoss: OeeLossKey | null
}

const nonNeg = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0)

export function computeOee(input: Pick<OeeInput, 'plannedTime' | 'losses'>): OeeResult {
  const planned = nonNeg(input.plannedTime)
  const losses = {} as Record<OeeLossKey, number>
  let remaining = planned
  // 損失總和不能超過計畫時間：依六大損失的順序扣，扣到 0 為止（資料錯誤時不讓圖畫出負的時間）
  for (const k of OEE_LOSSES) {
    const v = Math.min(nonNeg(input.losses?.[k]), remaining)
    losses[k] = v
    remaining -= v
  }
  const runTime = planned - losses.breakdown - losses.setup
  const netRunTime = runTime - losses.minorStops - losses.reducedSpeed
  const valuable = netRunTime - losses.startupRejects - losses.productionRejects

  const steps: OeeStep[] = []
  const total = (key: OeeTotalKey, v: number) => steps.push({ kind: 'total', key, from: 0, to: v, value: v })
  let level = planned
  const loss = (key: OeeLossKey) => {
    const v = losses[key]
    steps.push({ kind: 'loss', key, from: level - v, to: level, value: v, group: OEE_LOSS_GROUP[key] })
    level -= v
  }
  total('planned', planned)
  loss('breakdown')
  loss('setup')
  total('runTime', runTime)
  loss('minorStops')
  loss('reducedSpeed')
  total('netRunTime', netRunTime)
  loss('startupRejects')
  loss('productionRejects')
  total('valuable', valuable)

  let biggestLoss: OeeLossKey | null = null
  for (const k of OEE_LOSSES) if (losses[k] > 0 && (biggestLoss === null || losses[k] > losses[biggestLoss])) biggestLoss = k

  return {
    planned,
    runTime,
    netRunTime,
    valuable,
    availability: ratio(runTime, planned),
    performance: ratio(netRunTime, runTime),
    quality: ratio(valuable, netRunTime),
    oee: ratio(valuable, planned),
    losses,
    groupLoss: {
      availability: losses.breakdown + losses.setup,
      performance: losses.minorStops + losses.reducedSpeed,
      quality: losses.startupRejects + losses.productionRejects,
    },
    steps,
    biggestLoss,
  }
}

export interface OeeCountsInput {
  /** 計畫生產時間（分鐘） */
  plannedTime: number
  /** 設備故障（分鐘） */
  breakdown?: number
  /** 換線調整（分鐘） */
  setup?: number
  /** 記錄到的小停機（分鐘）；其餘的性能損失算成速度降低 */
  minorStops?: number
  /** 理想週期時間（秒 / 件） */
  idealCycleTime: number
  /** 總生產數 */
  totalCount: number
  /** 良品數 */
  goodCount: number
  /** 其中啟動（換線後調機）的不良數；其餘不良算製程不良 */
  startupRejects?: number
}

/**
 * 由停機時間與生產數量換算六大損失（分鐘）。
 * 淨稼動時間 = 理想週期時間 × 總數；有效時間 = 理想週期時間 × 良品數。
 */
export function oeeFromCounts(c: OeeCountsInput): Pick<OeeInput, 'plannedTime' | 'losses'> {
  const planned = nonNeg(c.plannedTime)
  const breakdown = nonNeg(c.breakdown)
  const setup = nonNeg(c.setup)
  const runTime = Math.max(0, planned - breakdown - setup)
  const ct = nonNeg(c.idealCycleTime) / 60
  const total = nonNeg(c.totalCount)
  const good = Math.min(nonNeg(c.goodCount), total)
  const netRun = Math.min(runTime, ct * total)
  const perfLoss = runTime - netRun
  const minorStops = Math.min(nonNeg(c.minorStops), perfLoss)
  const startupCount = Math.min(nonNeg(c.startupRejects), total - good)
  return {
    plannedTime: planned,
    losses: {
      breakdown,
      setup,
      minorStops,
      reducedSpeed: perfLoss - minorStops,
      startupRejects: ct * startupCount,
      productionRejects: ct * (total - good - startupCount),
    },
  }
}

/** 世界級水準（Nakajima）：OEE 85%，稼動率 90%、性能 95%、良率 99.9% */
export const OEE_WORLD_CLASS = { oee: 0.85, availability: 0.9, performance: 0.95, quality: 0.999 }
