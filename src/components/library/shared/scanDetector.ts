/**
 * 條碼掃描槍偵測（純函式，ChptScanInput 用）
 *
 * 掃描槍對電腦來說就是一個鍵盤：把條碼一個字一個字「打」進來，最後送出 Enter（或 Tab）。
 * 跟人手打的差別只有速度 —— 掃描槍每個字間隔約 5～30ms（藍牙槍可能到 40ms），
 * 人再快也要 80ms 以上。所以用「平均按鍵間隔」判斷，另外容許一次較長的停頓
 * （部分掃描槍在前綴碼與內容之間會頓一下）。
 */

export type ScanSource = 'scanner' | 'manual'

export interface ScanTimingOptions {
  /** 平均按鍵間隔不超過這個值（ms）才算掃描槍 */
  maxInterval: number
  /** 少於這麼多字無法判斷（一兩個字的間隔不具代表性），一律算手動 */
  minLength: number
}

export const DEFAULT_SCAN_TIMING: ScanTimingOptions = { maxInterval: 40, minLength: 3 }

/**
 * 依按鍵時間判斷這次輸入是掃描槍還是手打。
 * @param timestamps 每個字元按下的時間（ms，遞增）
 */
export function classifyKeystrokes(timestamps: readonly number[], options: Partial<ScanTimingOptions> = {}): ScanSource {
  const { maxInterval, minLength } = { ...DEFAULT_SCAN_TIMING, ...options }
  const n = timestamps.length
  if (n < Math.max(2, minLength)) return 'manual'
  const gaps: number[] = []
  for (let i = 1; i < n; i++) gaps.push(Math.max(0, timestamps[i] - timestamps[i - 1]))
  // 容許一次停頓：去掉最長的那一個間隔再算平均（只有一個間隔時不去）
  const sorted = [...gaps].sort((a, b) => a - b)
  const used = sorted.length > 2 ? sorted.slice(0, -1) : sorted
  const avg = used.reduce((s, g) => s + g, 0) / used.length
  return avg <= maxInterval ? 'scanner' : 'manual'
}

/** 這個按鍵事件是不是「打出一個字」（排除 Shift、方向鍵、組合鍵…） */
export function isCharacterKey(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
}

/** 焦點所在的元素可以輸入文字嗎（全頁接收模式下，這些元素收到的按鍵不攔截） */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false
  const type = (target as HTMLInputElement).type
  return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file', 'image'].includes(type)
}

/**
 * 全頁接收的緩衝區：焦點不在輸入框時，把快速連續的按鍵收集起來，Enter 時判斷是不是掃描。
 * 兩個字之間隔太久（人在按快捷鍵）就從頭開始收集。
 */
export class ScanBuffer {
  private chars: string[] = []
  private times: number[] = []

  constructor(private readonly resetAfter: number) {}

  push(char: string, time: number): void {
    const last = this.times[this.times.length - 1]
    if (last !== undefined && time - last > this.resetAfter) this.clear()
    this.chars.push(char)
    this.times.push(time)
  }

  get value(): string {
    return this.chars.join('')
  }

  get timestamps(): readonly number[] {
    return this.times
  }

  /** 最後一個字之後過了多久（沒有字時為 Infinity） */
  idleSince(time: number): number {
    const last = this.times[this.times.length - 1]
    return last === undefined ? Infinity : time - last
  }

  clear(): void {
    this.chars = []
    this.times = []
  }
}
