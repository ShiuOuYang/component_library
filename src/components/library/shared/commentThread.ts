/**
 * 留言串（ChptCommentThread）的資料操作與相對時間。所有函式都不改原陣列。
 */

export interface CommentAuthor {
  id: string
  name: string
  /** 頭像網址；沒有時顯示名字第一個字 */
  avatar?: string
}

export interface CommentAttachment {
  name: string
  url?: string
  /** 位元組 */
  size?: number
}

export interface CommentItem {
  id: string
  author: CommentAuthor
  /** 內容（提及標記字串，同 ChptMentionInput 的 v-model） */
  body: string
  createdAt: number | string | Date
  editedAt?: number | string | Date | null
  /** 已解決（只用在最上層的留言） */
  resolved?: boolean
  resolvedBy?: CommentAuthor | null
  /** 已刪除但還有回覆：保留位置、不顯示內容 */
  deleted?: boolean
  replies?: CommentItem[]
  attachments?: CommentAttachment[]
}

export const toMs = (t: number | string | Date): number => (t instanceof Date ? t.getTime() : typeof t === 'number' ? t : Date.parse(t))

export type RelativeUnit = 'now' | 'minute' | 'hour' | 'day' | 'date'

/** 相對時間：1 分鐘內為 now、1 小時內幾分鐘、1 天內幾小時、7 天內幾天，再久為 date（顯示日期） */
export function relativeTime(t: number, now: number): { unit: RelativeUnit; n: number } {
  const diff = Math.max(0, now - t)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return { unit: 'now', n: 0 }
  if (min < 60) return { unit: 'minute', n: min }
  const hr = Math.floor(min / 60)
  if (hr < 24) return { unit: 'hour', n: hr }
  const day = Math.floor(hr / 24)
  if (day < 7) return { unit: 'day', n: day }
  return { unit: 'date', n: 0 }
}

/** 留言總數（含回覆，不含已刪除的佔位） */
export function countComments(items: readonly CommentItem[]): number {
  return items.reduce((n, c) => n + (c.deleted ? 0 : 1) + countComments(c.replies ?? []), 0)
}

/** 找留言與它的父留言 id */
export function findComment(items: readonly CommentItem[], id: string): { comment: CommentItem; parentId: string | null } | null {
  for (const c of items) {
    if (c.id === id) return { comment: c, parentId: null }
    for (const r of c.replies ?? []) if (r.id === id) return { comment: r, parentId: c.id }
  }
  return null
}

/** 新增留言（parentId 為 null 時是最上層） */
export function addComment(items: readonly CommentItem[], comment: CommentItem, parentId: string | null): CommentItem[] {
  if (parentId === null) return [...items, comment]
  return items.map((c) => (c.id === parentId ? { ...c, replies: [...(c.replies ?? []), comment] } : c))
}

/** 修改某一則留言 */
export function updateComment(items: readonly CommentItem[], id: string, patch: Partial<CommentItem>): CommentItem[] {
  return items.map((c) => {
    if (c.id === id) return { ...c, ...patch }
    if (c.replies?.some((r) => r.id === id)) return { ...c, replies: c.replies.map((r) => (r.id === id ? { ...r, ...patch } : r)) }
    return c
  })
}

/**
 * 刪除留言：有回覆的最上層留言改成「已刪除」佔位（保留回覆）；
 * 刪掉最後一則回覆時，已刪除的佔位也一起移除。
 */
export function removeComment(items: readonly CommentItem[], id: string): CommentItem[] {
  const out: CommentItem[] = []
  for (const c of items) {
    if (c.id === id) {
      if (c.replies?.length) out.push({ ...c, deleted: true, body: '', attachments: [] })
      continue
    }
    if (c.replies?.some((r) => r.id === id)) {
      const replies = c.replies.filter((r) => r.id !== id)
      if (c.deleted && !replies.length) continue
      out.push({ ...c, replies })
      continue
    }
    out.push(c)
  }
  return out
}

/** 依建立時間排序最上層（回覆一律由舊到新） */
export function sortComments(items: readonly CommentItem[], order: 'oldest' | 'newest'): CommentItem[] {
  const by = (a: CommentItem, b: CommentItem) => toMs(a.createdAt) - toMs(b.createdAt)
  const top = [...items].sort((a, b) => (order === 'oldest' ? by(a, b) : by(b, a)))
  return top.map((c) => (c.replies?.length ? { ...c, replies: [...c.replies].sort(by) } : c))
}

/** 檔案大小：1.2 MB 這種寫法 */
export function formatBytes(n: number): string {
  if (!(n >= 0)) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${i === 0 ? v : v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`
}

/** 預設的 id 產生器 */
export function commentId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
