import { afterEach, describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptConfirmHost from '@/components/library/ui/ChptConfirmHost.vue'
import { useConfirm } from '@/components/library/shared/useConfirm'

let wrapper: ReturnType<typeof mount> | null = null
afterEach(async () => {
  // 清掉沒被回答的對話框，避免影響下一個測試
  const { queue } = useConfirm()
  while (queue.length) {
    queue[0].resolve(false)
    queue.splice(0, 1)
  }
  wrapper?.unmount()
  wrapper = null
  await nextTick()
})

function mountHost() {
  wrapper = mount(ChptConfirmHost, { attachTo: document.body })
  return wrapper
}

const dialog = () => document.body.querySelector<HTMLElement>('[role="alertdialog"]')
const buttonByText = (text: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')).find((b) => b.textContent?.trim() === text)!
const settle = async () => {
  await nextTick()
  await nextTick()
  await flushPromises()
}

describe('useConfirm + ChptConfirmHost', () => {
  it('confirm：alertdialog 以標題命名、以說明描述；按確定 resolve(true)', async () => {
    mountHost()
    const { confirm } = useConfirm()
    const result = confirm({ title: '刪除工單', message: 'WO-0917 將無法復原。', confirmText: '刪除' })
    await settle()
    const d = dialog()!
    expect(d.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(d.getAttribute('aria-labelledby')!)!.textContent).toBe('刪除工單')
    expect(document.getElementById(d.getAttribute('aria-describedby')!)!.textContent).toContain('無法復原')
    buttonByText('刪除').click()
    expect(await result).toBe(true)
    await settle()
    expect(dialog()).toBeNull()
  })

  it('取消 → false；Escape → false', async () => {
    mountHost()
    const { confirm } = useConfirm()
    const r1 = confirm({ title: 'A' })
    await settle()
    buttonByText('取消').click()
    expect(await r1).toBe(false)

    const r2 = confirm({ title: 'B' })
    await settle()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(await r2).toBe(false)
  })

  it('danger 預設焦點在「取消」（誤按 Enter 不會直接刪掉）；其他在「確定」', async () => {
    mountHost()
    const { confirm } = useConfirm()
    const r = confirm({ title: '刪除', type: 'danger', confirmText: '刪除' })
    await settle()
    expect(document.activeElement?.textContent?.trim()).toBe('取消')
    buttonByText('取消').click()
    await r
    await settle()

    const r2 = confirm({ title: '送出', confirmText: '送出' })
    await settle()
    expect(document.activeElement?.textContent?.trim()).toBe('送出')
    buttonByText('送出').click()
    await r2
  })

  it('requireText：照打正確才能按確定', async () => {
    mountHost()
    const { confirm } = useConfirm()
    const r = confirm({ title: '刪除產線', type: 'danger', requireText: 'SMT-02', confirmText: '刪除' })
    await settle()
    const input = document.body.querySelector<HTMLInputElement>('[role="alertdialog"] input')!
    expect(document.activeElement).toBe(input)
    expect(buttonByText('刪除').disabled).toBe(true)
    input.value = 'SMT-0'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    expect(buttonByText('刪除').disabled).toBe(true)
    input.value = 'SMT-02'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    expect(buttonByText('刪除').disabled).toBe(false)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(await r).toBe(true)
  })

  it('alert：只有一顆按鈕，怎麼關都是 true', async () => {
    mountHost()
    const { alert } = useConfirm()
    const r = alert({ title: '匯出完成', message: '已寄到信箱' })
    await settle()
    expect(document.body.querySelectorAll('[role="alertdialog"] button')).toHaveLength(1)
    expect(buttonByText('知道了')).toBeTruthy()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(await r).toBe(true)
  })

  it('同時呼叫多次時依序排隊', async () => {
    mountHost()
    const { confirm } = useConfirm()
    const r1 = confirm({ title: '第一個' })
    const r2 = confirm({ title: '第二個' })
    await settle()
    expect(dialog()!.textContent).toContain('第一個')
    buttonByText('確定').click()
    expect(await r1).toBe(true)
    await settle()
    expect(dialog()!.textContent).toContain('第二個')
    expect(document.activeElement?.textContent?.trim()).toBe('確定') // 第二個也有放好焦點
    buttonByText('取消').click()
    expect(await r2).toBe(false)
  })

  it('關閉後焦點回到原本的按鈕', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    mountHost()
    const { confirm } = useConfirm()
    const r = confirm({ title: 'X' })
    await settle()
    expect(document.activeElement).not.toBe(opener)
    buttonByText('取消').click()
    await r
    await settle()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })
})
