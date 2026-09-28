import { shallowReactive } from 'vue'

/**
 * useConfirm（CHPT 主題） - 以程式呼叫的確認對話框
 *
 * 「確定要刪除嗎？」這種一次性的問題，不必在每個頁面各放一個 ChptModal 再管 v-model：
 *
 * ```ts
 * const { confirm, alert } = useConfirm()
 *
 * if (await confirm({ title: '刪除工單', message: 'WO-0917 將無法復原。', type: 'danger', confirmText: '刪除' })) {
 *   await api.remove(id)
 * }
 * await alert({ title: '匯出完成', message: '檔案已寄到信箱。' })
 * ```
 *
 * 需在 App 掛載一次 <ChptConfirmHost />（與 ChptToast 相同）。
 * 同時呼叫多次時依序排隊，一次只顯示一個。
 */

export interface ConfirmOptions {
  title: string
  /** 說明文字（可多行，\n 會換行） */
  message?: string
  type?: 'info' | 'warning' | 'danger' | 'success'
  confirmText?: string
  /** alert 沒有取消鈕 */
  cancelText?: string
  /**
   * 要使用者照打一段文字才能按確定（例如工單號），用在不可復原又影響重大的操作。
   * 只在 confirm 有效。
   */
  requireText?: string
  /**
   * 開啟時的焦點：預設 danger 放在「取消」（誤按 Enter 不會直接刪掉），其他放在「確定」
   */
  focus?: 'confirm' | 'cancel'
}

export interface ConfirmRequest extends Required<Pick<ConfirmOptions, 'title' | 'type' | 'confirmText'>> {
  id: number
  kind: 'confirm' | 'alert'
  message: string
  cancelText: string
  requireText: string
  focus: 'confirm' | 'cancel'
  resolve: (ok: boolean) => void
}

/** 全域佇列（第一個就是正在顯示的那一個） */
const queue = shallowReactive<ConfirmRequest[]>([])
let seq = 0

function enqueue(kind: ConfirmRequest['kind'], options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const type = options.type ?? (kind === 'alert' ? 'info' : 'warning')
    queue.push({
      id: ++seq,
      kind,
      title: options.title,
      message: options.message ?? '',
      type,
      confirmText: options.confirmText ?? (kind === 'alert' ? '知道了' : '確定'),
      cancelText: options.cancelText ?? '取消',
      requireText: kind === 'confirm' ? options.requireText ?? '' : '',
      focus: options.focus ?? (type === 'danger' && kind === 'confirm' ? 'cancel' : 'confirm'),
      resolve,
    })
  })
}

/** Host 用：結束目前的對話框 */
export function settleConfirm(id: number, ok: boolean): void {
  const index = queue.findIndex((r) => r.id === id)
  if (index === -1) return
  const [req] = queue.splice(index, 1)
  req.resolve(ok)
}

export function useConfirm() {
  return {
    /** 使用者按確定 → true；取消、Escape、點遮罩 → false */
    confirm: (options: ConfirmOptions) => enqueue('confirm', options),
    /** 只有一顆按鈕；關閉後 resolve(true) */
    alert: (options: Omit<ConfirmOptions, 'requireText' | 'cancelText' | 'focus'>) => enqueue('alert', options),
    /** 給 ChptConfirmHost 讀取 */
    queue,
  }
}
