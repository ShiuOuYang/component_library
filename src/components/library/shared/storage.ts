/**
 * 儲位圖（ChptStorageMap）的資料模型：區 → 料架 → 層 → 格；庫存、使用率、效期、搜尋、移庫。
 * 純函式，元件只負責畫面與互動。
 */

/** 一個儲位（格） */
export interface StorageBin {
  /** 儲位代碼，例如 'A-01-3-2' */
  id: string
  /** 區（例如 'A 區 常溫'） */
  zone: string
  /** 料架（例如 'A-01'） */
  rack: string
  /** 層（1 = 最下層） */
  level: number
  /** 同一層的第幾格（1 起算，由左到右） */
  position: number
  /** 容量（與庫存 qty 同單位）；不給時不算使用率 */
  capacity?: number
  /** 停用（盤點、損壞）—— 不能移入 */
  blocked?: boolean
}

/** 一筆庫存（某儲位上的某料號 / 批號） */
export interface StorageStock {
  id: string
  /** 所在儲位 id */
  bin: string
  /** 料號 */
  item: string
  /** 品名 */
  name?: string
  qty: number
  unit?: string
  lot?: string
  /** 有效期限（epoch ms、ISO 字串或 Date） */
  expiry?: number | string | Date | null
}

export type StorageExpiry = 'none' | 'ok' | 'soon' | 'expired'

/** 時間值 → epoch ms；無法解析時為 null */
export function toTime(v: number | string | Date | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const t = v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(v)
  return Number.isFinite(t) ? t : null
}

const DAY = 86_400_000

/** 效期狀態：已過期、warnDays 天內到期、正常、沒有效期 */
export function expiryStatus(stock: Pick<StorageStock, 'expiry'>, now: number, warnDays: number): StorageExpiry {
  const t = toTime(stock.expiry)
  if (t === null) return 'none'
  if (t <= now) return 'expired'
  return t - now <= warnDays * DAY ? 'soon' : 'ok'
}

/** 還剩幾天到期（向上取整；已過期為負數或 0；沒有效期為 null） */
export function daysToExpiry(stock: Pick<StorageStock, 'expiry'>, now: number): number | null {
  const t = toTime(stock.expiry)
  return t === null ? null : Math.ceil((t - now) / DAY)
}

const EXPIRY_RANK: Record<StorageExpiry, number> = { none: 0, ok: 1, soon: 2, expired: 3 }

/** 依儲位整理庫存 */
export function stocksByBin(stocks: readonly StorageStock[]): Map<string, StorageStock[]> {
  const map = new Map<string, StorageStock[]>()
  for (const s of stocks) {
    if (!map.has(s.bin)) map.set(s.bin, [])
    map.get(s.bin)!.push(s)
  }
  return map
}

export interface BinState {
  qty: number
  /** 使用率（0–1+）；沒有容量時為 null */
  ratio: number | null
  /** 這格裡的料號（去重、依出現順序） */
  items: string[]
  /** 這格最嚴重的效期狀態 */
  expiry: StorageExpiry
}

export function binState(bin: StorageBin, stocks: readonly StorageStock[], now: number, warnDays: number): BinState {
  let qty = 0
  let expiry: StorageExpiry = 'none'
  const items: string[] = []
  for (const s of stocks) {
    qty += s.qty
    if (!items.includes(s.item)) items.push(s.item)
    const e = expiryStatus(s, now, warnDays)
    if (EXPIRY_RANK[e] > EXPIRY_RANK[expiry]) expiry = e
  }
  const ratio = bin.capacity && bin.capacity > 0 ? qty / bin.capacity : null
  return { qty, ratio, items, expiry }
}

export interface RackLayout {
  rack: string
  /** 由上到下（最高層在前） */
  levels: number[]
  /** 由左到右 */
  positions: number[]
  /** `${level}:${position}` → 儲位 */
  cells: Map<string, StorageBin>
}

export interface ZoneLayout {
  zone: string
  racks: RackLayout[]
}

export const cellKey = (level: number, position: number) => `${level}:${position}`

/** 儲位 → 區 / 料架 / 層 / 格的格狀配置（區、料架依出現順序；層由高到低；格由小到大，中間缺的格位補上空位） */
export function buildLayout(bins: readonly StorageBin[]): ZoneLayout[] {
  const zones = new Map<string, Map<string, StorageBin[]>>()
  for (const b of bins) {
    if (!zones.has(b.zone)) zones.set(b.zone, new Map())
    const racks = zones.get(b.zone)!
    if (!racks.has(b.rack)) racks.set(b.rack, [])
    racks.get(b.rack)!.push(b)
  }
  return [...zones].map(([zone, racks]) => ({
    zone,
    racks: [...racks].map(([rack, list]) => {
      const maxLevel = Math.max(...list.map((b) => b.level))
      const minLevel = Math.min(...list.map((b) => b.level))
      const maxPos = Math.max(...list.map((b) => b.position))
      const minPos = Math.min(...list.map((b) => b.position))
      return {
        rack,
        levels: Array.from({ length: maxLevel - minLevel + 1 }, (_, i) => maxLevel - i),
        positions: Array.from({ length: maxPos - minPos + 1 }, (_, i) => minPos + i),
        cells: new Map(list.map((b) => [cellKey(b.level, b.position), b])),
      }
    }),
  }))
}

/** 搜尋：儲位代碼、料號、品名、批號（不分大小寫，空白分隔的每個詞都要符合）→ 符合的儲位 id */
export function searchBins(bins: readonly StorageBin[], stocks: readonly StorageStock[], query: string): Set<string> {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const hits = new Set<string>()
  if (!words.length) return hits
  const byBin = stocksByBin(stocks)
  for (const b of bins) {
    const texts = [b.id, b.rack, ...(byBin.get(b.id) ?? []).flatMap((s) => [s.item, s.name ?? '', s.lot ?? ''])].map((x) => x.toLowerCase())
    if (words.every((w) => texts.some((x) => x.includes(w)))) hits.add(b.id)
  }
  return hits
}

export type MoveCheck = 'ok' | 'same' | 'blocked' | 'overCapacity' | 'unknown'

/** 能不能把這些庫存移到 target（容量以移入後的總量計算） */
export function checkMove(
  bins: readonly StorageBin[],
  stocks: readonly StorageStock[],
  stockIds: readonly string[],
  target: string,
  allowOverCapacity = false
): MoveCheck {
  const bin = bins.find((b) => b.id === target)
  if (!bin) return 'unknown'
  const moving = stocks.filter((s) => stockIds.includes(s.id))
  if (!moving.length) return 'unknown'
  if (moving.every((s) => s.bin === target)) return 'same'
  if (bin.blocked) return 'blocked'
  if (!allowOverCapacity && bin.capacity && bin.capacity > 0) {
    const after = stocks.filter((s) => s.bin === target || stockIds.includes(s.id)).reduce((sum, s) => sum + s.qty, 0)
    if (after > bin.capacity) return 'overCapacity'
  }
  return 'ok'
}

/** 移庫（不改原陣列） */
export function moveStocks(stocks: readonly StorageStock[], stockIds: readonly string[], target: string): StorageStock[] {
  return stocks.map((s) => (stockIds.includes(s.id) && s.bin !== target ? { ...s, bin: target } : s))
}

export interface StorageSummary {
  bins: number
  /** 有庫存的儲位 */
  used: number
  blocked: number
  /** 整體使用率（有容量的儲位：總量 / 總容量） */
  ratio: number | null
  /** 有已過期 / 快到期庫存的筆數 */
  expired: number
  soon: number
}

export function storageSummary(bins: readonly StorageBin[], stocks: readonly StorageStock[], now: number, warnDays: number): StorageSummary {
  const byBin = stocksByBin(stocks)
  let cap = 0
  let qty = 0
  let used = 0
  let blocked = 0
  for (const b of bins) {
    const list = byBin.get(b.id) ?? []
    if (list.length) used++
    if (b.blocked) blocked++
    if (b.capacity && b.capacity > 0) {
      cap += b.capacity
      qty += list.reduce((sum, s) => sum + s.qty, 0)
    }
  }
  let expired = 0
  let soon = 0
  for (const s of stocks) {
    const e = expiryStatus(s, now, warnDays)
    if (e === 'expired') expired++
    else if (e === 'soon') soon++
  }
  return { bins: bins.length, used, blocked, ratio: cap ? qty / cap : null, expired, soon }
}
