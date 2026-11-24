/**
 * 週 / 日行事曆（ChptScheduler）的計算：日期、重疊事件並排、吸附、移動與調整長度。
 * 時間一律以本地時間計算。
 */

export interface SchedEvent {
  id: string
  title: string
  /** 開始（epoch ms、ISO 字串或 Date） */
  start: number | string | Date
  end: number | string | Date
  /** 資源 id（日檢視依資源分欄時使用） */
  resource?: string
  color?: string
  /** 不能拖曳 / 調整 */
  locked?: boolean
}

export interface SchedResource {
  id: string
  name: string
  color?: string
}

export const DAY_MS = 86_400_000
export const MIN_MS = 60_000

export function toMs(v: number | string | Date): number {
  return v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(v)
}

/** 當天 00:00（本地） */
export function startOfDay(t: number | Date): number {
  const d = new Date(typeof t === 'number' ? t : t.getTime())
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 加幾天（處理日光節約：用日期加，不用毫秒加） */
export function addDays(t: number, n: number): number {
  const d = new Date(t)
  d.setDate(d.getDate() + n)
  return d.getTime()
}

/** 某天所在那一週的 7 天（weekStartsOn：0 = 週日、1 = 週一） */
export function weekDays(t: number, weekStartsOn = 1): number[] {
  const day0 = startOfDay(t)
  const dow = new Date(day0).getDay()
  const back = (dow - weekStartsOn + 7) % 7
  const first = addDays(day0, -back)
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

export const sameDay = (a: number, b: number) => startOfDay(a) === startOfDay(b)

/** 吸附到 step 分鐘 */
export function snap(t: number, stepMin: number): number {
  const day0 = startOfDay(t)
  const min = (t - day0) / MIN_MS
  return day0 + Math.round(min / stepMin) * stepMin * MIN_MS
}

export interface PlacedEvent {
  event: SchedEvent
  start: number
  end: number
  /** 在可見時段中的位置（0–1） */
  top: number
  height: number
  /** 並排的第幾欄 / 共幾欄 */
  col: number
  cols: number
  /** 開始或結束超出可見時段 */
  clippedStart: boolean
  clippedEnd: boolean
}

/**
 * 一欄（一天或一個資源）裡的事件排版：重疊的事件並排。
 * from / to：這一欄可見的起訖（例如當天 07:00–20:00）。
 */
export function layoutColumn(events: readonly SchedEvent[], from: number, to: number): PlacedEvent[] {
  const span = to - from
  const items = events
    .map((event) => ({ event, start: toMs(event.start), end: toMs(event.end) }))
    .filter((e) => Number.isFinite(e.start) && Number.isFinite(e.end) && e.end > from && e.start < to)
    .map((e) => ({ ...e, end: Math.max(e.end, e.start + 15 * MIN_MS) }))
    .sort((a, b) => a.start - b.start || b.end - a.end)
  const out: PlacedEvent[] = []
  let cluster: { item: (typeof items)[number]; col: number }[] = []
  let clusterEnd = -Infinity
  let colEnds: number[] = []
  const flush = () => {
    const cols = colEnds.length
    for (const c of cluster) {
      const s = Math.max(c.item.start, from)
      const e = Math.min(c.item.end, to)
      out.push({
        event: c.item.event,
        start: c.item.start,
        end: c.item.end,
        top: (s - from) / span,
        height: (e - s) / span,
        col: c.col,
        cols,
        clippedStart: c.item.start < from,
        clippedEnd: c.item.end > to,
      })
    }
    cluster = []
    colEnds = []
  }
  for (const it of items) {
    // 與目前這群都不重疊 → 這群排完，開新的一群
    if (cluster.length && it.start >= clusterEnd) {
      flush()
      clusterEnd = -Infinity
    }
    let col = colEnds.findIndex((end) => end <= it.start)
    if (col < 0) {
      col = colEnds.length
      colEnds.push(it.end)
    } else colEnds[col] = it.end
    cluster.push({ item: it, col })
    clusterEnd = Math.max(clusterEnd, it.end)
  }
  if (cluster.length) flush()
  return out
}

/** 移動事件（保持長度） */
export function moveEvent(e: SchedEvent, start: number, resource?: string): SchedEvent {
  const len = toMs(e.end) - toMs(e.start)
  const next: SchedEvent = { ...e, start, end: start + len }
  if (resource !== undefined) next.resource = resource
  return next
}

/** 調整結束時間（至少 minMin 分鐘） */
export function resizeEvent(e: SchedEvent, end: number, minMin = 15): SchedEvent {
  return { ...e, end: Math.max(end, toMs(e.start) + minMin * MIN_MS) }
}

/** 兩個事件是否重疊（同資源時才算） */
export function overlaps(a: SchedEvent, b: SchedEvent): boolean {
  if ((a.resource ?? null) !== (b.resource ?? null)) return false
  return toMs(a.start) < toMs(b.end) && toMs(b.start) < toMs(a.end)
}

/** 某個事件與其他事件的衝突 */
export function conflictsOf(e: SchedEvent, all: readonly SchedEvent[]): SchedEvent[] {
  return all.filter((x) => x.id !== e.id && overlaps(e, x))
}
