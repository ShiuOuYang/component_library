import { shallowReactive } from 'vue'

/**
 * useNotification（CHPT 主題） - 角落通知
 *
 * 與 useToast 的分工：
 *   - toast：一句話的結果回饋（「已儲存」），幾秒後自己消失
 *   - notification：有標題、說明、可能還有動作按鈕的通知（「匯出完成 —— [下載]」「機台 SMT-02 停機 —— [查看]」）
 *
 * ```ts
 * const notify = useNotification()
 * notify.warning({ title: 'SMT-02 停機', message: '錫膏印刷機異常，已停線 5 分鐘。', actions: [{ label: '查看', onClick: open }] })
 * ```
 * 需在 App 掛載一次 <ChptNotificationHost />。
 *
 * 無障礙：
 *   - 滑鼠停在通知上、或焦點在通知裡的按鈕時，倒數暫停（WCAG 2.2.1：使用者要有足夠時間讀完、按到按鈕）
 *   - 有動作按鈕的通知預設不自動消失：按鈕只出現幾秒，鍵盤使用者常常還沒 Tab 到就不見了
 *   - danger / warning 以 role="alert" 立即報讀，其他用 role="status"
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'danger'

export interface NotificationAction {
  label: string
  onClick: () => void
  /** 按了之後不要自動關閉通知 */
  keepOpen?: boolean
}

export interface NotificationOptions {
  title: string
  message?: string
  type?: NotificationType
  /** 自動關閉的毫秒數；0 = 不自動關閉。預設 4500，有 actions 時預設 0 */
  duration?: number
  actions?: NotificationAction[]
  /** 可以按 × 關閉 */
  closable?: boolean
  onClose?: () => void
}

export interface NotificationItem extends Required<Pick<NotificationOptions, 'title' | 'type' | 'duration' | 'closable'>> {
  id: number
  message: string
  actions: NotificationAction[]
  onClose?: () => void
}

const items = shallowReactive<NotificationItem[]>([])
let seq = 0

function close(id: number): void {
  const index = items.findIndex((n) => n.id === id)
  if (index === -1) return
  const [item] = items.splice(index, 1)
  item.onClose?.()
}

function open(options: NotificationOptions): { id: number; close: () => void } {
  const id = ++seq
  const actions = options.actions ?? []
  items.push({
    id,
    title: options.title,
    message: options.message ?? '',
    type: options.type ?? 'info',
    duration: options.duration ?? (actions.length ? 0 : 4500),
    closable: options.closable ?? true,
    actions,
    onClose: options.onClose,
  })
  return { id, close: () => close(id) }
}

const withType = (type: NotificationType) => (options: Omit<NotificationOptions, 'type'>) => open({ ...options, type })

export function useNotification() {
  return {
    open,
    info: withType('info'),
    success: withType('success'),
    warning: withType('warning'),
    error: withType('danger'),
    close,
    closeAll: () => {
      while (items.length) close(items[0].id)
    },
    /** 給 ChptNotificationHost 讀取 */
    items,
  }
}
