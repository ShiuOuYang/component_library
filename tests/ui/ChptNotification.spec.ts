import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptNotificationHost from '@/components/library/ui/ChptNotificationHost.vue'
import { useNotification } from '@/components/library/shared/useNotification'

let wrapper: ReturnType<typeof mount> | null = null
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  useNotification().closeAll()
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
})

function mountHost(props: Record<string, unknown> = {}) {
  wrapper = mount(ChptNotificationHost, { props, attachTo: document.body })
  return wrapper
}

/** 每則通知（VTU 會把 TransitionGroup 換成 stub 元素，所以不用 > 直接子層） */
const items = () => Array.from(document.body.querySelectorAll<HTMLElement>('section[aria-label="通知"] div[role="status"], section[aria-label="通知"] div[role="alert"]'))
const tick = async () => {
  await nextTick()
  await nextTick()
}

describe('useNotification + ChptNotificationHost', () => {
  it('顯示標題與說明；區域有名稱', async () => {
    mountHost()
    useNotification().success({ title: '匯出完成', message: '已寄到信箱' })
    await tick()
    expect(items()).toHaveLength(1)
    expect(items()[0].textContent).toContain('匯出完成')
    expect(items()[0].textContent).toContain('已寄到信箱')
    expect(items()[0].getAttribute('role')).toBe('status')
  })

  it('warning / danger 用 role=alert 立即報讀', async () => {
    mountHost()
    const n = useNotification()
    n.warning({ title: '停機' })
    n.error({ title: '錯誤' })
    await tick()
    expect(items().map((i) => i.getAttribute('role'))).toEqual(['alert', 'alert'])
  })

  it('預設 4.5 秒後自動關閉，並呼叫 onClose', async () => {
    mountHost()
    const onClose = vi.fn()
    useNotification().info({ title: 'A', onClose })
    await tick()
    vi.advanceTimersByTime(4400)
    expect(useNotification().items).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(useNotification().items).toHaveLength(0)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('滑鼠停在上面時暫停倒數（WCAG 2.2.1），離開後至少再留 1.5 秒', async () => {
    mountHost()
    useNotification().info({ title: 'A', duration: 3000 })
    await tick()
    vi.advanceTimersByTime(2500)
    items()[0].dispatchEvent(new MouseEvent('mouseenter'))
    vi.advanceTimersByTime(10_000)
    expect(useNotification().items).toHaveLength(1)
    items()[0].dispatchEvent(new MouseEvent('mouseleave'))
    vi.advanceTimersByTime(1400)
    expect(useNotification().items).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(useNotification().items).toHaveLength(0)
  })

  it('焦點在通知裡時也暫停', async () => {
    mountHost()
    useNotification().info({ title: 'A', duration: 1000 })
    await tick()
    items()[0].dispatchEvent(new FocusEvent('focusin'))
    vi.advanceTimersByTime(5000)
    expect(useNotification().items).toHaveLength(1)
  })

  it('有動作按鈕時預設不自動關閉；按了執行並關閉（keepOpen 例外）', async () => {
    mountHost()
    const onView = vi.fn()
    const onSnooze = vi.fn()
    useNotification().warning({
      title: 'SMT-02 停機',
      actions: [{ label: '查看', onClick: onView }, { label: '稍後提醒', onClick: onSnooze, keepOpen: true }],
    })
    await tick()
    vi.advanceTimersByTime(60_000)
    expect(useNotification().items).toHaveLength(1)
    const buttons = Array.from(items()[0].querySelectorAll('button'))
    buttons.find((b) => b.textContent?.trim() === '稍後提醒')!.click()
    expect(onSnooze).toHaveBeenCalled()
    expect(useNotification().items).toHaveLength(1)
    buttons.find((b) => b.textContent?.trim() === '查看')!.click()
    expect(onView).toHaveBeenCalled()
    expect(useNotification().items).toHaveLength(0)
  })

  it('關閉鈕的名稱帶標題；closable=false 時沒有', async () => {
    mountHost()
    const n = useNotification()
    n.info({ title: 'A', duration: 0 })
    n.info({ title: 'B', duration: 0, closable: false })
    await tick()
    const close = document.body.querySelector<HTMLButtonElement>('button[aria-label="關閉通知：A"]')!
    expect(document.body.querySelector('button[aria-label="關閉通知：B"]')).toBeNull()
    close.click()
    expect(n.items.map((i) => i.title)).toEqual(['B'])
  })

  it('超過 max 時收掉最舊的', async () => {
    mountHost({ max: 2 })
    const n = useNotification()
    n.info({ title: '1', duration: 0 })
    n.info({ title: '2', duration: 0 })
    n.info({ title: '3', duration: 0 })
    await tick()
    expect(n.items.map((i) => i.title)).toEqual(['2', '3'])
  })

  it('open() 回傳 close；closeAll', async () => {
    mountHost()
    const n = useNotification()
    const handle = n.open({ title: 'X', duration: 0 })
    n.open({ title: 'Y', duration: 0 })
    handle.close()
    expect(n.items.map((i) => i.title)).toEqual(['Y'])
    n.closeAll()
    expect(n.items).toHaveLength(0)
  })
})
