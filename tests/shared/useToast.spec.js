import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@/components/library/shared/useToast'

describe('useToast', () => {
  beforeEach(() => {
    useToast().toasts.splice(0)
    vi.useRealTimers()
  })

  it('所有呼叫端共用同一個佇列', () => {
    const a = useToast()
    const b = useToast()

    a.success('來自 a')
    expect(b.toasts).toHaveLength(1)
  })

  it('四種類型各自對應正確的 type', () => {
    const toast = useToast()
    toast.success('s')
    toast.info('i')
    toast.warning('w')
    toast.error('e')

    expect(toast.toasts.map((t) => t.type)).toEqual(['success', 'info', 'warning', 'danger'])
  })

  it('error 對應 danger（不是 error）', () => {
    const toast = useToast()
    toast.error('壞了')
    expect(toast.toasts[0].type).toBe('danger')
  })

  it('保留原始訊息內容', () => {
    const toast = useToast()
    toast.success('已儲存 3 筆')
    expect(toast.toasts[0].content).toBe('已儲存 3 筆')
  })

  it('每則提示有唯一 id', () => {
    const toast = useToast()
    toast.info('a')
    toast.info('b')
    expect(toast.toasts[0].id).not.toBe(toast.toasts[1].id)
  })

  it('duration 到期後自動移除', () => {
    vi.useFakeTimers()
    const toast = useToast()

    toast.show('info', '暫時的', 1000)
    expect(toast.toasts).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(toast.toasts).toHaveLength(0)
  })

  it('duration 為 0 時不自動移除', () => {
    vi.useFakeTimers()
    const toast = useToast()

    toast.show('info', '常駐', 0)
    vi.advanceTimersByTime(60_000)
    expect(toast.toasts).toHaveLength(1)
  })

  it('remove 只移除指定的那一則', () => {
    const toast = useToast()
    toast.show('info', 'a', 0)
    toast.show('info', 'b', 0)

    const targetId = toast.toasts[0].id
    toast.remove(targetId)

    expect(toast.toasts).toHaveLength(1)
    expect(toast.toasts[0].content).toBe('b')
  })

  it('remove 不存在的 id 不會出錯', () => {
    const toast = useToast()
    expect(() => toast.remove(99999)).not.toThrow()
  })
})
