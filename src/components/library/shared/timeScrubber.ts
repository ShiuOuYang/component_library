/**
 * 時間軸回放（ChptTimeScrubber）的時間計算
 *
 *   - 播放：每一格畫面依經過的真實時間 × 倍速往前推；到範圍結尾時停止（或從頭循環）
 *   - 事件標記：上一個 / 下一個事件
 *   - 鍵盤步進：依總長度挑一個好讀的單位（1 秒、10 秒、1 分、5 分…）
 */

export interface TimelineEvent {
  /** 發生時間 */
  time: string | number | Date
  label: string
  /** 顏色（任何 CSS 顏色）；不給時依 severity */
  color?: string
  severity?: 'critical' | 'major' | 'minor' | 'info'
  id?: string | number
}

export const toMs = (t: string | number | Date | null | undefined): number | null => {
  if (t === null || t === undefined || t === '') return null
  const v = t instanceof Date ? t.getTime() : typeof t === 'number' ? t : new Date(t).getTime()
  return Number.isFinite(v) ? v : null
}

export const clampTime = (t: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, t))

/**
 * 往前推 dtMs 真實時間 × speed 倍：
 *   - 到 hi 時：loop 回到 lo，否則停在 hi 並回傳 ended
 */
export function advance(t: number, dtMs: number, speed: number, lo: number, hi: number, loop = false): { t: number; ended: boolean } {
  const next = t + dtMs * speed
  if (next < hi) return { t: Math.max(lo, next), ended: false }
  if (loop && hi > lo) return { t: lo + ((next - lo) % (hi - lo)), ended: false }
  return { t: hi, ended: true }
}

/** 上一個（dir = −1）/ 下一個（dir = 1）事件的時間；沒有時為 null。差不到 eps 毫秒的算同一點 */
export function adjacentEvent(times: number[], t: number, dir: 1 | -1, eps = 500): number | null {
  let best: number | null = null
  for (const x of times) {
    if (dir > 0 ? x > t + eps && (best === null || x < best) : x < t - eps && (best === null || x > best)) best = x
  }
  return best
}

const UNITS = [1_000, 5_000, 10_000, 30_000, 60_000, 300_000, 600_000, 1_800_000, 3_600_000, 21_600_000, 86_400_000]

/** 鍵盤步進：總長度約 1/100、取一個好讀的單位 */
export function niceStep(spanMs: number): number {
  const target = spanMs / 100
  return UNITS.find((u) => u >= target) ?? UNITS[UNITS.length - 1]
}

/** 把時間對齊到 step 的倍數（從 origin 算起） */
export const snap = (t: number, step: number, origin = 0) => (step > 0 ? origin + Math.round((t - origin) / step) * step : t)
