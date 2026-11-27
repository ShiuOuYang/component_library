/**
 * 價值流圖（ChptValueStreamMap）的資料模型與計算。
 *
 * 一條產品族的流程：供應商 → 原料庫存 → 工站 1 → 在製品 → 工站 2 → … → 成品庫存 → 客戶。
 * - 節拍時間（Takt）= 每日可用時間 ÷ 每日需求量
 * - 庫存天數 = 數量 ÷ 每日需求量（有給 days 時直接用）
 * - 前置時間（Lead time）= 所有庫存天數 + 所有工站的週期時間
 * - 加值時間（VA time）= 所有工站週期時間的總和
 * - 流程效率（PCE）= 加值時間 ÷ 前置時間（兩者換算成同單位：一天 = 每日可用秒數）
 * 週期時間超過節拍的工站跟不上需求；週期時間最長的是瓶頸。
 */

export type VsmFlow = 'push' | 'pull' | 'fifo'

export interface VsmInventory {
  /** 數量（件） */
  qty?: number
  /** 庫存天數；不給時用數量 ÷ 每日需求量 */
  days?: number
}

export interface VsmProcess {
  id: string
  name: string
  /** 週期時間 C/T（秒） */
  cycleTime: number
  /** 換線時間 C/O（分鐘） */
  changeover?: number
  /** 稼動率（%） */
  uptime?: number
  /** 作業人數 */
  operators?: number
  /** 不良率（%） */
  scrap?: number
  /** 這一站前面的庫存（第一站前面就是原料庫存） */
  inventoryBefore?: VsmInventory | null
  /** 從前一站到這一站的物流方式：推式（預設）、拉式（超市）、先進先出 */
  flowIn?: VsmFlow
}

export interface VsmCustomer {
  name: string
  /** 每日需求量（件 / 天） */
  demand: number
  /** 每日可用時間（秒），預設 8 小時扣休息：27000 秒（7.5 小時） */
  availableTime?: number
}

export interface VsmStep {
  kind: 'inventory' | 'process'
  /** 庫存：天數；工站：週期時間（秒） */
  value: number
  /** 庫存的數量 */
  qty?: number
  /** 工站 id；成品庫存為 'finished' */
  id: string
}

export interface VsmMetrics {
  /** 節拍時間（秒）；需求或可用時間不合理時為 null */
  takt: number | null
  /** 每日可用時間（秒） */
  availableTime: number
  /** 前置時間（天） */
  leadTimeDays: number
  /** 加值時間（秒） */
  valueAddedSeconds: number
  /** 流程效率 0–1 */
  pce: number
  /** 週期時間最長的工站 id */
  bottleneck: string | null
  /** 週期時間超過節拍的工站 id */
  overTakt: string[]
  /** 時間梯：依流程順序的庫存與工站 */
  steps: VsmStep[]
  /** 總庫存（件） */
  totalInventory: number
}

export const DEFAULT_AVAILABLE_TIME = 27_000

const positive = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** 節拍時間（秒）：每日可用時間 ÷ 每日需求量 */
export function taktTime(customer: VsmCustomer): number | null {
  const demand = positive(customer.demand)
  const avail = positive(customer.availableTime ?? DEFAULT_AVAILABLE_TIME)
  return demand && avail ? avail / demand : null
}

/** 庫存天數：有 days 用 days，否則數量 ÷ 每日需求量；都沒有時為 0 */
export function inventoryDays(inv: VsmInventory | null | undefined, dailyDemand: number): number {
  if (!inv) return 0
  if (inv.days !== undefined && inv.days !== null && Number.isFinite(Number(inv.days))) return Math.max(0, Number(inv.days))
  const demand = positive(dailyDemand)
  return demand ? positive(inv.qty) / demand : 0
}

export function vsmMetrics(processes: VsmProcess[], customer: VsmCustomer, finishedGoods?: VsmInventory | null): VsmMetrics {
  const takt = taktTime(customer)
  const availableTime = positive(customer.availableTime ?? DEFAULT_AVAILABLE_TIME) || DEFAULT_AVAILABLE_TIME
  const steps: VsmStep[] = []
  let invDays = 0
  let va = 0
  let totalInventory = 0
  let bottleneck: string | null = null
  let maxCt = -1
  const overTakt: string[] = []

  const pushInv = (inv: VsmInventory | null | undefined, id: string) => {
    if (!inv) return
    const days = inventoryDays(inv, customer.demand)
    invDays += days
    totalInventory += positive(inv.qty)
    steps.push({ kind: 'inventory', value: days, qty: inv.qty, id })
  }

  for (const p of processes) {
    pushInv(p.inventoryBefore, p.id)
    const ct = positive(p.cycleTime)
    va += ct
    steps.push({ kind: 'process', value: ct, id: p.id })
    if (ct > maxCt) {
      maxCt = ct
      bottleneck = p.id
    }
    if (takt !== null && ct > takt) overTakt.push(p.id)
  }
  pushInv(finishedGoods, 'finished')

  const leadSeconds = invDays * availableTime + va
  return {
    takt,
    availableTime,
    leadTimeDays: leadSeconds / availableTime,
    valueAddedSeconds: va,
    pce: leadSeconds > 0 ? va / leadSeconds : 0,
    bottleneck: processes.length ? bottleneck : null,
    overTakt,
    steps,
    totalInventory,
  }
}

/** 工站負荷：週期時間 ÷ 節拍（> 1 表示跟不上） */
export function processLoad(p: VsmProcess, takt: number | null): number | null {
  return takt ? positive(p.cycleTime) / takt : null
}
