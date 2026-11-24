/**
 * 線平衡（山積圖）的計算：各站工時、瓶頸、平衡率、理論最少人數；移動作業元素。
 */

/** 工站 */
export interface LbStation {
  id: string
  name: string
  /** 這站的人數（多人時週期 = 工時 / 人數）；預設 1 */
  operators?: number
}

/** 作業元素（一個動作） */
export interface LbElement {
  id: string
  name: string
  /** 所在工站 id */
  station: string
  /** 工時（秒或任何一致的單位） */
  time: number
  /** 分類（對應 kinds 的 key），例如加工 / 搬運 / 等待 */
  kind?: string
}

export interface LbStationLoad {
  station: LbStation
  /** 這站的作業元素（依陣列順序，下方先做） */
  elements: LbElement[]
  /** 工時合計 */
  load: number
  operators: number
  /** 週期 = 工時 / 人數 */
  cycle: number
}

export interface LbSummary {
  /** 全部工時 */
  totalWork: number
  /** 瓶頸站的週期（= 產線週期） */
  bottleneck: number
  /** 瓶頸站 id（同分取第一個）；沒有工站時為 null */
  bottleneckId: string | null
  /** 總人數 */
  operators: number
  /** 平衡率 = 總工時 / (總人數 × 瓶頸週期)；0–1 */
  balanceRate: number | null
  /** 週期超過節拍的工站 id */
  overTakt: string[]
  /** 依節拍算的理論最少人數 = ceil(總工時 / 節拍) */
  minOperators: number | null
  /** 平均週期（依人數加權） */
  average: number | null
}

const ops = (s: LbStation) => (s.operators && s.operators > 0 ? s.operators : 1)

/** 依工站整理作業元素（不在任何工站的元素略過） */
export function stationLoads(stations: readonly LbStation[], elements: readonly LbElement[]): LbStationLoad[] {
  return stations.map((station) => {
    const list = elements.filter((e) => e.station === station.id)
    const load = list.reduce((sum, e) => sum + Math.max(0, e.time), 0)
    const operators = ops(station)
    return { station, elements: list, load, operators, cycle: load / operators }
  })
}

export function lineBalanceSummary(loads: readonly LbStationLoad[], takt: number | null): LbSummary {
  const totalWork = loads.reduce((s, l) => s + l.load, 0)
  const operators = loads.reduce((s, l) => s + l.operators, 0)
  let bottleneck = 0
  let bottleneckId: string | null = null
  for (const l of loads) {
    if (bottleneckId === null || l.cycle > bottleneck) {
      bottleneck = l.cycle
      bottleneckId = l.station.id
    }
  }
  const hasTakt = takt !== null && takt > 0
  return {
    totalWork,
    bottleneck,
    bottleneckId,
    operators,
    balanceRate: operators > 0 && bottleneck > 0 ? totalWork / (operators * bottleneck) : null,
    overTakt: hasTakt ? loads.filter((l) => l.cycle > takt + 1e-9).map((l) => l.station.id) : [],
    minOperators: hasTakt ? Math.max(0, Math.ceil(totalWork / takt - 1e-9)) : null,
    average: operators > 0 ? totalWork / operators : null,
  }
}

/**
 * 把作業元素移到另一站（不改原陣列）。
 * index：放在目標站的第幾個（0 = 最下方）；不給時放在最上方（最後做）。
 */
export function moveElement(elements: readonly LbElement[], id: string, station: string, index?: number): LbElement[] {
  const moving = elements.find((e) => e.id === id)
  if (!moving) return [...elements]
  const rest = elements.filter((e) => e.id !== id)
  const moved = { ...moving, station }
  const inTarget = rest.filter((e) => e.station === station)
  const at = index === undefined ? inTarget.length : Math.max(0, Math.min(index, inTarget.length))
  if (!inTarget.length) {
    // 目標站沒有元素：放在原本的位置（保持其他站的順序）
    const pos = elements.findIndex((e) => e.id === id)
    return [...rest.slice(0, pos), moved, ...rest.slice(pos)]
  }
  const anchor = at < inTarget.length ? rest.indexOf(inTarget[at]) : rest.indexOf(inTarget[inTarget.length - 1]) + 1
  return [...rest.slice(0, anchor), moved, ...rest.slice(anchor)]
}

/** y 軸上限：涵蓋最大週期與節拍，留一點空間給標籤 */
export function lineBalanceMax(loads: readonly LbStationLoad[], takt: number | null): number {
  const m = Math.max(0, takt ?? 0, ...loads.map((l) => l.cycle))
  return m > 0 ? m * 1.15 : 1
}
