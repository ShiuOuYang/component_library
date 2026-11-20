/**
 * localStorage 的安全讀寫
 *
 * 私密瀏覽、儲存空間停用、空間已滿時 localStorage 會丟錯；SSR / 測試環境可能根本沒有它。
 * 元件「記住設定」只是加分功能 —— 讀不到就當沒有、寫不進去就算了，不能讓元件跟著壞掉。
 * 原本 ChptTable、ChptCommandPalette、ChptDashboardGrid、useDarkMode 各寫一份 try/catch，收斂到這裡。
 */

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    // 有些瀏覽器在停用儲存空間時，連讀取 localStorage 這個屬性都會丟錯
    return null
  }
}

/** 讀字串；沒有或讀不到時為 null */
export function readStoredString(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** 寫字串；回傳是否成功 */
export function writeStoredString(key: string, value: string): boolean {
  try {
    const s = storage()
    if (!s) return false
    s.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * 讀 JSON；沒有、壞掉、或 accept 判斷不合格時回傳 fallback。
 * accept 用來擋掉格式不對的舊資料（例如以前存的是物件、現在要陣列）
 */
export function readStoredJSON<T>(key: string, fallback: T, accept: (value: unknown) => boolean = () => true): T {
  const raw = readStoredString(key)
  if (raw === null) return fallback
  try {
    const value: unknown = JSON.parse(raw)
    return accept(value) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

/** 寫 JSON；回傳是否成功 */
export function writeStoredJSON(key: string, value: unknown): boolean {
  let text: string
  try {
    text = JSON.stringify(value)
  } catch {
    return false
  }
  return writeStoredString(key, text)
}

/** 刪除；失敗時不丟錯 */
export function removeStored(key: string): void {
  try {
    storage()?.removeItem(key)
  } catch {
    /* 忽略 */
  }
}
