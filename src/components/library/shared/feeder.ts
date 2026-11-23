/**
 * 上料防錯（ChptFeederMap）的資料模型與判斷：站位、料盤條碼解析、比對 BOM、剩餘量等級、紀錄。
 * 純函式，元件只負責畫面與掃描流程。
 */

/** 一個站位（BOM 的一列） */
export interface FeederSlot {
  /** 站位代碼（站位條碼的內容），例如 'M1-F-03' */
  id: string
  /** 分組（機台 / 料架 / 前後側），畫面依這個分區 */
  group?: string
  /** BOM 要求的料號 */
  partNo: string
  /** 可代用的料號 */
  alternates?: string[]
  /** 料號說明（規格） */
  description?: string
  /** 每片板用量（估算還能生產幾片） */
  perBoard?: number
}

/** 料盤條碼解析結果 */
export interface FeederReel {
  reelId: string
  partNo: string
  qty: number
  lot?: string
}

/** 站位目前裝的料盤 */
export interface FeederLoad extends FeederReel {
  /** 上料時間（epoch ms） */
  loadedAt: number
  operator?: string
}

/** 站位 id → 目前裝的料盤 */
export type FeederLoads = Record<string, FeederLoad>

/** 一筆上料紀錄（含錯料） */
export interface FeederLogEntry {
  at: number
  slot: string
  /** BOM 要求的料號 */
  expected: string
  reelId: string
  partNo: string
  qty: number
  lot?: string
  result: 'ok' | 'mismatch'
  operator?: string
}

/** 站位狀態：未上料、正常、低料、用完 */
export type FeederStock = 'unloaded' | 'ok' | 'low' | 'empty'

/**
 * 預設的料盤條碼解析：`料號|數量|料盤號[|批號]`（分隔符也接受 `;`、`,`、Tab）。
 * 數量不是非負整數、或缺欄位時回傳 null。實際格式（例如 2D 條碼的 ANSI MH10.8.2）請用 `parseReel` prop 自訂。
 */
export function parseReelCode(code: string): FeederReel | null {
  const parts = code.trim().split(/[|;,\t]/).map((s) => s.trim())
  if (parts.length < 3) return null
  const [partNo, qtyText, reelId, lot] = parts
  if (!partNo || !reelId || !/^\d+$/.test(qtyText)) return null
  return lot ? { partNo, qty: Number(qtyText), reelId, lot } : { partNo, qty: Number(qtyText), reelId }
}

/** 料盤的料號是否符合站位（含代用料；不分大小寫） */
export function matchesSlot(slot: FeederSlot, partNo: string): boolean {
  const p = partNo.trim().toUpperCase()
  return [slot.partNo, ...(slot.alternates ?? [])].some((x) => x.trim().toUpperCase() === p)
}

/** 依代碼找站位（不分大小寫、忽略前後空白） */
export function findSlot(slots: readonly FeederSlot[], code: string): FeederSlot | undefined {
  const c = code.trim().toUpperCase()
  return slots.find((s) => s.id.toUpperCase() === c)
}

/** 站位狀態：數量 ≤ 0 為用完、≤ lowQty 為低料 */
export function feederStock(load: FeederLoad | undefined, lowQty: number): FeederStock {
  if (!load) return 'unloaded'
  if (load.qty <= 0) return 'empty'
  return load.qty <= lowQty ? 'low' : 'ok'
}

/** 還能生產幾片（沒有用量或沒上料時為 null） */
export function boardsLeft(slot: FeederSlot, load: FeederLoad | undefined): number | null {
  if (!load || !slot.perBoard || slot.perBoard <= 0) return null
  return Math.max(0, Math.floor(load.qty / slot.perBoard))
}

/** 找出其他站位已經裝了這個料盤（同一盤不會同時在兩個站位） */
export function reelInUse(loads: FeederLoads, reelId: string, exceptSlot: string): string | null {
  const hit = Object.entries(loads).find(([slot, l]) => slot !== exceptSlot && l.reelId === reelId)
  return hit ? hit[0] : null
}

export interface FeederSummary {
  total: number
  loaded: number
  unloaded: number
  low: number
  empty: number
  /** 裝錯料（目前裝的料號不符 BOM，例如換線後 BOM 改了） */
  wrong: number
  /** 全部上料、沒有用完、沒有錯料 */
  ready: boolean
  /** 全線最少還能生產幾片（有用量的站位才算） */
  minBoards: number | null
}

export function feederSummary(slots: readonly FeederSlot[], loads: FeederLoads, lowQty: number): FeederSummary {
  let loaded = 0
  let low = 0
  let empty = 0
  let wrong = 0
  let minBoards: number | null = null
  for (const s of slots) {
    const l = loads[s.id]
    const st = feederStock(l, lowQty)
    if (st === 'unloaded') continue
    loaded++
    if (st === 'low') low++
    if (st === 'empty') empty++
    if (!matchesSlot(s, l.partNo)) wrong++
    const b = boardsLeft(s, l)
    if (b !== null) minBoards = minBoards === null ? b : Math.min(minBoards, b)
  }
  const unloaded = slots.length - loaded
  return { total: slots.length, loaded, unloaded, low, empty, wrong, ready: slots.length > 0 && unloaded === 0 && empty === 0 && wrong === 0, minBoards }
}

/** 依 group 分區（保持出現順序） */
export function groupSlots(slots: readonly FeederSlot[]): { group: string; slots: FeederSlot[] }[] {
  const map = new Map<string, FeederSlot[]>()
  for (const s of slots) {
    const g = s.group ?? ''
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(s)
  }
  return [...map].map(([group, list]) => ({ group, slots: list }))
}
