/**
 * 機台狀態牆（ChptEquipmentWall）的資料處理：篩選、排序、分組、持續時間、方向鍵找鄰居
 *
 * 狀態名稱與 StateTimeline 相同（run / idle / maintenance / down），多一個 offline（沒有連線、拿不到狀態）：
 * 同一份 MES 狀態資料可以同時餵給狀態牆（現在）與狀態時間軸（今天的歷程）。
 */

export type EquipmentStatus = 'run' | 'idle' | 'maintenance' | 'down' | 'offline'

export interface EquipmentMetric {
  label: string
  value: string | number
  unit?: string
}

export interface EquipmentItem {
  id: string
  name: string
  /** 分組（產線、區域） */
  group?: string
  status: EquipmentStatus
  /** 進入目前狀態的時間（顯示「已停機 25 分」） */
  since?: string | number | Date | null
  /** 稼動率（0–100） */
  utilization?: number | null
  /** 目前工單 */
  workOrder?: string
  /** 目前料號 / 產品 */
  product?: string
  /** 警報或停機原因（停機時特別顯示） */
  alarm?: string
  /** 其他數值（產出、溫度…），最多顯示前三個 */
  metrics?: EquipmentMetric[]
}

/** 「需要人處理」的程度：停機 > 保養 > 待機 > 離線 > 運轉（排序用） */
export const STATUS_PRIORITY: Record<EquipmentStatus, number> = { down: 0, maintenance: 1, idle: 2, offline: 3, run: 4 }
export const EQUIPMENT_STATUSES: EquipmentStatus[] = ['run', 'idle', 'maintenance', 'down', 'offline']

/** 依狀態與關鍵字篩選（關鍵字比對名稱、id、工單、料號，不分大小寫） */
export function filterEquipment(items: EquipmentItem[], statuses: EquipmentStatus[] | null, query = ''): EquipmentItem[] {
  const q = query.trim().toLowerCase()
  return items.filter((it) => {
    if (statuses && statuses.length && !statuses.includes(it.status)) return false
    if (!q) return true
    return [it.name, it.id, it.workOrder, it.product].some((v) => v?.toLowerCase().includes(q))
  })
}

/** 排序：none 保持原順序；status 依需要處理的程度（同狀態保持原順序）；name 依名稱（數字自然排序） */
export function sortEquipment(items: EquipmentItem[], by: 'none' | 'status' | 'name'): EquipmentItem[] {
  if (by === 'none') return items
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) =>
      by === 'status'
        ? STATUS_PRIORITY[a.it.status] - STATUS_PRIORITY[b.it.status] || a.i - b.i
        : collator.compare(a.it.name, b.it.name) || a.i - b.i
    )
    .map((x) => x.it)
}

/** 分組（照第一次出現的順序）；沒有 group 的放在最後一組（key 為 null） */
export function groupEquipment(items: EquipmentItem[]): Array<{ key: string | null; items: EquipmentItem[] }> {
  const map = new Map<string | null, EquipmentItem[]>()
  for (const it of items) {
    const k = it.group ?? null
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(it)
  }
  const out = [...map.entries()].map(([key, list]) => ({ key, items: list }))
  return [...out.filter((g) => g.key !== null), ...out.filter((g) => g.key === null)]
}

/** 各狀態的數量 */
export function countEquipment(items: EquipmentItem[]): Record<EquipmentStatus, number> {
  const out: Record<EquipmentStatus, number> = { run: 0, idle: 0, maintenance: 0, down: 0, offline: 0 }
  for (const it of items) out[it.status] = (out[it.status] ?? 0) + 1
  return out
}

/** 平均稼動率（只算有值的機台）；都沒有時為 null */
export function averageUtilization(items: EquipmentItem[]): number | null {
  const vs = items.map((it) => it.utilization).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null
}

/** 持續時間（ms）→ 天、時、分；負數或無效時為 null */
export function durationParts(ms: number): { d: number; h: number; m: number } | null {
  if (!Number.isFinite(ms) || ms < 0) return null
  const totalMin = Math.floor(ms / 60_000)
  return { d: Math.floor(totalMin / 1440), h: Math.floor((totalMin % 1440) / 60), m: totalMin % 60 }
}

/** since → 毫秒時間戳；無效時為 null */
export function toTime(since: EquipmentItem['since']): number | null {
  if (since === null || since === undefined || since === '') return null
  const t = since instanceof Date ? since.getTime() : typeof since === 'number' ? since : new Date(since).getTime()
  return Number.isFinite(t) ? t : null
}

/**
 * 方向鍵找鄰居：rects 是每張卡片的位置（同一個順序）。
 * 左右：前一張 / 後一張；上下：上一列 / 下一列裡水平中心最接近的那張。找不到時回傳原 index。
 */
export function neighborIndex(
  rects: Array<{ left: number; top: number; width: number; height: number }>,
  index: number,
  dir: 'left' | 'right' | 'up' | 'down'
): number {
  if (dir === 'left') return Math.max(0, index - 1)
  if (dir === 'right') return Math.min(rects.length - 1, index + 1)
  const cur = rects[index]
  const cx = cur.left + cur.width / 2
  const cy = cur.top + cur.height / 2
  const below = dir === 'down'
  let best = index
  let bestRow = Infinity
  let bestDx = Infinity
  rects.forEach((r, i) => {
    const ry = r.top + r.height / 2
    const dy = below ? ry - cy : cy - ry
    if (dy <= cur.height / 2) return // 同一列或反方向
    const dx = Math.abs(r.left + r.width / 2 - cx)
    // 先找最近的一列，再找那一列裡水平最近的
    if (dy < bestRow - 1 || (Math.abs(dy - bestRow) <= 1 && dx < bestDx)) {
      best = i
      bestRow = dy
      bestDx = dx
    }
  })
  return best
}
