/**
 * 警報中心（ChptAlarmCenter）的狀態、排序與操作
 *
 * 參考 ISA-18.2 的警報生命週期，但只保留現場用得到的部分：
 *   - 未確認（unacked）：還沒有人確認 —— 包含「條件已恢復但沒人確認」（短暫異常也要讓人知道發生過）
 *   - 已確認（acked）：有人確認、條件還在（處理中）
 *   - 暫停（shelved）：暫時不提醒，時間到自動回來
 *   - 已結束（closed）：已確認而且條件已恢復 —— 預設不顯示
 */

export type AlarmSeverity = 'critical' | 'major' | 'minor' | 'info'
export const ALARM_SEVERITIES: AlarmSeverity[] = ['critical', 'major', 'minor', 'info']
const SEVERITY_RANK: Record<AlarmSeverity, number> = { critical: 0, major: 1, minor: 2, info: 3 }

export interface AlarmItem {
  id: string
  /** 警報訊息 */
  title: string
  severity: AlarmSeverity
  /** 發生時間 */
  raisedAt: string | number | Date
  /** 警報代碼（E-1023） */
  code?: string
  /** 來源（機台） */
  source?: string
  /** 分組（產線、區域） */
  group?: string
  /** 詳細說明、建議處置 */
  detail?: string
  /** 重複發生次數 */
  count?: number
  acked?: boolean
  ackedBy?: string
  ackedAt?: string | number | Date
  /** 條件已恢復（設備回報正常） */
  cleared?: boolean
  clearedAt?: string | number | Date
  /** 暫停提醒到這個時間 */
  shelvedUntil?: string | number | Date | null
  /** 已升級幾次（通知上一層） */
  escalated?: number
}

export type AlarmState = 'unacked' | 'acked' | 'shelved' | 'closed'

export const toMs = (t: string | number | Date | null | undefined): number | null => {
  if (t === null || t === undefined || t === '') return null
  const v = t instanceof Date ? t.getTime() : typeof t === 'number' ? t : new Date(t).getTime()
  return Number.isFinite(v) ? v : null
}

/** 目前的狀態（暫停時間到了就回到原本的狀態） */
export function alarmState(a: AlarmItem, now: number): AlarmState {
  const shelved = toMs(a.shelvedUntil)
  if (shelved !== null && shelved > now) return 'shelved'
  if (!a.acked) return 'unacked'
  return a.cleared ? 'closed' : 'acked'
}

/** 排序：未確認 → 已確認 → 暫停 → 已結束；同狀態依嚴重度、再依時間新到舊 */
export function sortAlarms(list: AlarmItem[], now: number): AlarmItem[] {
  const stateRank: Record<AlarmState, number> = { unacked: 0, acked: 1, shelved: 2, closed: 3 }
  return [...list].sort(
    (a, b) =>
      stateRank[alarmState(a, now)] - stateRank[alarmState(b, now)] ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (toMs(b.raisedAt) ?? 0) - (toMs(a.raisedAt) ?? 0)
  )
}

export type AlarmView = 'open' | 'unacked' | 'shelved' | 'all'

/** 篩選：open = 未結束且未暫停；搜尋比對訊息、代碼、來源 */
export function filterAlarms(list: AlarmItem[], now: number, view: AlarmView, severities: AlarmSeverity[] | null, query = ''): AlarmItem[] {
  const q = query.trim().toLowerCase()
  return list.filter((a) => {
    const s = alarmState(a, now)
    if (view === 'open' && (s === 'closed' || s === 'shelved')) return false
    if (view === 'unacked' && s !== 'unacked') return false
    if (view === 'shelved' && s !== 'shelved') return false
    if (severities && severities.length && !severities.includes(a.severity)) return false
    return !q || [a.title, a.code, a.source].some((v) => v?.toLowerCase().includes(q))
  })
}

/** 各嚴重度「未確認」的數量（上方摘要） */
export function countUnacked(list: AlarmItem[], now: number): Record<AlarmSeverity, number> {
  const out: Record<AlarmSeverity, number> = { critical: 0, major: 0, minor: 0, info: 0 }
  for (const a of list) if (alarmState(a, now) === 'unacked') out[a.severity]++
  return out
}

const patch = (list: AlarmItem[], ids: string[], fn: (a: AlarmItem) => AlarmItem) => {
  const set = new Set(ids)
  return list.map((a) => (set.has(a.id) ? fn(a) : a))
}

/** 確認（不改原陣列）；已確認的不覆蓋原本的確認人 */
export const ackAlarms = (list: AlarmItem[], ids: string[], by: string | undefined, now: number) =>
  patch(list, ids, (a) => (a.acked ? a : { ...a, acked: true, ackedBy: by, ackedAt: now }))

/** 暫停 minutes 分鐘 */
export const shelveAlarms = (list: AlarmItem[], ids: string[], minutes: number, now: number) =>
  patch(list, ids, (a) => ({ ...a, shelvedUntil: now + minutes * 60_000 }))

export const unshelveAlarms = (list: AlarmItem[], ids: string[]) => patch(list, ids, (a) => ({ ...a, shelvedUntil: null }))

/** 升級（升級次數 + 1） */
export const escalateAlarms = (list: AlarmItem[], ids: string[]) => patch(list, ids, (a) => ({ ...a, escalated: (a.escalated ?? 0) + 1 }))

/**
 * 警報音：兩聲高低音（比掃碼的嗶聲明顯，但不刺耳）。
 * 瀏覽器要使用者先互動過才允許出聲：AudioContext 被暫停時試著恢復，失敗就算了（畫面仍會閃）。
 */
export function playAlarmTone(ctx: AudioContext | null, severity: AlarmSeverity = 'critical'): void {
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') void ctx.resume()
    const tones = severity === 'critical' ? [880, 660] : [660]
    tones.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = f
      gain.gain.value = 0.12
      osc.connect(gain).connect(ctx.destination)
      const t = ctx.currentTime + i * 0.22
      osc.start(t)
      osc.stop(t + 0.18)
    })
  } catch {
    /* 沒有聲音不影響警報顯示 */
  }
}
