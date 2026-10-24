/**
 * StateTimeline（機台狀態時間軸）的純函式：整理狀態紀錄、依像素合併、統計稼動率
 *
 * 狀態紀錄是「實際發生過的事」：同一台機台在同一時間只會有一個狀態，
 * 紀錄常常只有開始時間（下一筆開始就是這一筆結束），而且量很大（一台一天幾百筆）。
 */

import { parseTime } from './gantt'

/** 狀態的定義 */
export interface StateDef {
  /** 資料中的狀態值 */
  value: string
  /** 圖例與提示框顯示的文字（預設同 value） */
  label?: string
  color: string
  /**
   * 同一個像素裡有好幾種狀態時，優先畫哪一種（數字大的優先）。
   * 預設故障最高 —— 一天的畫面裡 30 秒的停機只佔不到一個像素，用「時間最長」來決定顏色會被運轉蓋掉
   */
  priority?: number
}

/** 一段狀態 */
export interface StateSegment {
  /** 第幾列（機台） */
  row: number
  state: string
  start: number
  end: number
  /** 原始資料 */
  datum: Record<string, unknown>
  /** 結束時間是推算的（下一筆的開始，或「現在」） */
  openEnded: boolean
}

export interface NormalizeStateOptions {
  rowField: string
  stateField: string
  startField: string
  /** 沒有結束欄位、或某一筆沒有結束時間：用同一台的下一筆開始時間 */
  endField?: string | null
  /** 每台最後一筆沒有結束時間時，畫到這裡（通常是現在）；NaN 時丟掉這一筆 */
  openEnd: number
  /** 列的順序（機台代號）；沒列到的機台依出現順序接在後面 */
  rows?: string[]
}

export interface NormalizedStates {
  rows: string[]
  /** 每列的狀態段，依開始時間排序、互不重疊 */
  byRow: StateSegment[][]
  /** 時間不合法而略過的筆數 */
  skipped: number
}

interface RawRecord {
  state: string
  start: number
  end: number
  datum: Record<string, unknown>
}

/**
 * 整理狀態紀錄：依機台分列、依開始時間排序、補上結束時間、切掉重疊的部分。
 * 重疊時以後開始的那筆為準（前一筆在它開始時結束）—— 狀態紀錄重疊通常是前一筆沒有正確關閉。
 */
export function normalizeStates(data: Record<string, unknown>[], o: NormalizeStateOptions): NormalizedStates {
  const rowIndex = new Map<string, number>()
  const rows: string[] = []
  for (const r of o.rows ?? []) {
    const k = String(r)
    if (!rowIndex.has(k)) {
      rowIndex.set(k, rows.length)
      rows.push(k)
    }
  }
  const grouped: RawRecord[][] = []
  let skipped = 0
  for (const d of data) {
    const key = d?.[o.rowField]
    const start = parseTime(d?.[o.startField])
    if (key === null || key === undefined || key === '' || !Number.isFinite(start)) {
      skipped++
      continue
    }
    const k = String(key)
    let row = rowIndex.get(k)
    if (row === undefined) {
      row = rows.length
      rowIndex.set(k, row)
      rows.push(k)
    }
    const end = o.endField ? parseTime(d[o.endField]) : NaN
    ;(grouped[row] ??= []).push({ state: String(d[o.stateField] ?? ''), start, end, datum: d })
  }

  const byRow: StateSegment[][] = rows.map((_, ri) => {
    const list = (grouped[ri] ?? []).sort((a, b) => a.start - b.start)
    const out: StateSegment[] = []
    for (let i = 0; i < list.length; i++) {
      const cur = list[i]
      const next = list[i + 1]
      let end = cur.end
      let openEnded = false
      if (!Number.isFinite(end)) {
        end = next ? next.start : o.openEnd
        openEnded = true
      }
      // 下一筆比較早開始：這一筆在那時結束
      if (next && next.start < end) end = next.start
      if (!Number.isFinite(end)) {
        // 最後一筆沒有結束時間、也沒有 openEnd
        skipped++
        continue
      }
      // 同一時間開始的兩筆：前一筆沒有長度
      if (end <= cur.start) continue
      out.push({ row: ri, state: cur.state, start: cur.start, end, datum: cur.datum, openEnded })
    }
    return out
  })
  return { rows, byRow, skipped }
}

/** 第一個 end > t 的段落索引（段落依時間排序且不重疊） */
export function firstEndingAfter(segments: StateSegment[], t: number): number {
  let lo = 0
  let hi = segments.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (segments[mid].end <= t) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** 時間 t 所在的段落；沒有時回傳 null */
export function segmentAt(segments: StateSegment[], t: number): StateSegment | null {
  const i = firstEndingAfter(segments, t)
  const s = segments[i]
  return s && s.start <= t ? s : null
}

/** 依像素合併後的一段（同一種狀態連續的像素） */
export interface PixelRun {
  x0: number
  x1: number
  state: string
}

/**
 * 把一列的狀態段依像素合併：每個像素只畫一種狀態，相鄰同狀態的像素併成一段。
 * 不論資料有幾萬筆，一列最多畫「寬度」個矩形。
 *
 * 一個像素裡有好幾種狀態時，先比 priority、再比佔的時間；
 * 像素裡沒有紀錄的時間超過一半時留白（資料缺口要看得出來）。
 *
 * @param domain 可見的時間範圍
 * @param width 繪圖區寬度（px）
 */
export function rasterizeRow(
  segments: StateSegment[],
  domain: [number, number],
  width: number,
  priorityOf: (state: string) => number
): PixelRun[] {
  const cols = Math.max(0, Math.floor(width))
  const [t0, t1] = domain
  const span = t1 - t0
  if (cols === 0 || !(span > 0)) return []
  const colMs = span / cols
  /** 整格都是同一段的狀態 */
  const full: (string | null)[] = new Array(cols).fill(null)
  /** 只佔部分的格子：狀態 → 毫秒 */
  const partial: (Map<string, number> | null)[] = new Array(cols).fill(null)
  const add = (i: number, state: string, ms: number) => {
    if (i < 0 || i >= cols || ms <= 0) return
    const m = partial[i] ?? (partial[i] = new Map())
    m.set(state, (m.get(state) ?? 0) + ms)
  }

  for (let si = firstEndingAfter(segments, t0); si < segments.length; si++) {
    const s = segments[si]
    if (s.start >= t1) break
    const a = (Math.max(s.start, t0) - t0) / colMs
    const b = (Math.min(s.end, t1) - t0) / colMs
    const ia = Math.floor(a)
    const ib = Math.min(cols - 1, Math.ceil(b) - 1)
    if (ia >= ib) {
      add(ia, s.state, (b - a) * colMs)
      continue
    }
    add(ia, s.state, (ia + 1 - a) * colMs)
    add(ib, s.state, (b - ib) * colMs)
    for (let i = ia + 1; i < ib; i++) full[i] = s.state
  }

  const runs: PixelRun[] = []
  for (let i = 0; i < cols; i++) {
    let state = full[i]
    if (state === null && partial[i]) {
      let best: string | null = null
      let bestP = -Infinity
      let bestMs = 0
      let covered = 0
      for (const [st, ms] of partial[i]!) {
        covered += ms
        const p = priorityOf(st)
        if (p > bestP || (p === bestP && ms > bestMs)) {
          best = st
          bestP = p
          bestMs = ms
        }
      }
      // 有優先的狀態（例如故障）出現就要畫出來；一般狀態只佔一點點時留白
      state = covered >= colMs / 2 || bestP > 0 ? best : null
    }
    if (state === null) continue
    const last = runs[runs.length - 1]
    if (last && last.state === state && last.x1 === i) last.x1 = i + 1
    else runs.push({ x0: i, x1: i + 1, state })
  }
  return runs
}

/**
 * 某個像素範圍 [ta, tb) 裡，決定這個像素顏色的那一段（提示框要說明「這一格紅色是哪一次停機」）：
 * 先比 priority，再比在這個範圍裡佔的時間。
 */
export function dominantSegment(
  segments: StateSegment[],
  ta: number,
  tb: number,
  priorityOf: (state: string) => number
): StateSegment | null {
  let best: StateSegment | null = null
  let bestP = -Infinity
  let bestMs = 0
  for (let i = firstEndingAfter(segments, ta); i < segments.length; i++) {
    const s = segments[i]
    if (s.start >= tb) break
    const ms = Math.min(s.end, tb) - Math.max(s.start, ta)
    const p = priorityOf(s.state)
    if (p > bestP || (p === bestP && ms > bestMs)) {
      best = s
      bestP = p
      bestMs = ms
    }
  }
  return best
}

/** 一台機台在統計區間內的統計 */
export interface StateSummary {
  row: string
  /** 各狀態的累計時間（毫秒，只算統計區間內的部分） */
  durations: Record<string, number>
  /** 有紀錄的時間 */
  covered: number
  /** 稼動率的分母：有紀錄的時間扣掉不計入的狀態（例如計畫保養）；為 0 時稼動率是 null */
  planned: number
  /** 稼動率 = 運轉時間 ÷ 分母（0～1） */
  utilization: number | null
  /** 停機（downStates）的累計時間 */
  downTime: number
  /** 停機次數（連續的停機段算一次） */
  downCount: number
  /** 最長的一次停機 */
  longestDown: { start: number; end: number; state: string } | null
  /** 平均修復時間 = 停機時間 ÷ 次數 */
  mttr: number | null
  /** 平均故障間隔 = 運轉時間 ÷ 停機次數 */
  mtbf: number | null
}

export interface SummaryOptions {
  /** 算「運轉」的狀態 */
  runStates: string[]
  /** 算「停機」的狀態 */
  downStates: string[]
  /** 不列入稼動率分母的狀態（例如計畫保養、休息時間） */
  excludeStates: string[]
}

/** 統計一台機台在 [t0, t1] 內的狀態時間、稼動率與停機 */
export function summarizeRow(
  row: string,
  segments: StateSegment[],
  window: [number, number],
  o: SummaryOptions
): StateSummary {
  const [t0, t1] = window
  const run = new Set(o.runStates)
  const down = new Set(o.downStates)
  const exclude = new Set(o.excludeStates)
  const durations: Record<string, number> = {}
  let covered = 0
  let excluded = 0
  let runTime = 0
  let downTime = 0
  let downCount = 0
  let longestDown: StateSummary['longestDown'] = null
  /** 目前這一次停機（相鄰的停機段合併，例如故障接著等料） */
  let currentDown: { start: number; end: number; state: string; longest: number } | null = null
  const closeDown = () => {
    if (!currentDown) return
    const len = currentDown.end - currentDown.start
    if (!longestDown || len > longestDown.end - longestDown.start) {
      longestDown = { start: currentDown.start, end: currentDown.end, state: currentDown.state }
    }
    currentDown = null
  }

  for (let i = firstEndingAfter(segments, t0); i < segments.length; i++) {
    const s = segments[i]
    if (s.start >= t1) break
    const a = Math.max(s.start, t0)
    const b = Math.min(s.end, t1)
    const ms = b - a
    if (ms <= 0) continue
    durations[s.state] = (durations[s.state] ?? 0) + ms
    covered += ms
    if (exclude.has(s.state)) excluded += ms
    if (run.has(s.state)) runTime += ms
    if (down.has(s.state)) {
      downTime += ms
      if (currentDown && currentDown.end === a) {
        currentDown.end = b
        // 合併後的停機以佔最久的狀態命名
        if (ms > currentDown.longest) {
          currentDown.state = s.state
          currentDown.longest = ms
        }
      } else {
        closeDown()
        downCount++
        currentDown = { start: a, end: b, state: s.state, longest: ms }
      }
    } else {
      closeDown()
    }
  }
  closeDown()

  const planned = covered - excluded
  return {
    row,
    durations,
    covered,
    planned,
    utilization: planned > 0 ? runTime / planned : null,
    downTime,
    downCount,
    longestDown,
    mttr: downCount > 0 ? downTime / downCount : null,
    mtbf: downCount > 0 ? runTime / downCount : null,
  }
}
