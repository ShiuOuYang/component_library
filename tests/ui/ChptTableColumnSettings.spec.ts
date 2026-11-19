import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptTable from '@/components/library/ui/ChptTable.vue'

let wrapper: VueWrapper | null = null
beforeEach(() => localStorage.clear())
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  localStorage.clear()
})

const columns = [
  { key: 'wo', title: '工單' },
  { title: '數量', children: [{ key: 'plan', title: '計畫' }, { key: 'done', title: '完成' }] },
  { key: 'note', title: '備註' },
]
const data = [{ id: 1, wo: 'WO-1', plan: 10, done: 8, note: '急' }]

async function mountTable(props: Record<string, unknown> = {}) {
  wrapper = mount(ChptTable, { props: { columns, data, columnSettings: true, ...props }, attachTo: document.body })
  await nextTick()
  return wrapper
}

const leafTitles = (w: VueWrapper) =>
  [...w.findAll('thead th[data-leaf]')].sort((a, b) => Number(a.attributes('data-leaf')) - Number(b.attributes('data-leaf'))).map((th) => th.text())

async function openSettings(w: VueWrapper) {
  await w.find('button[aria-haspopup="dialog"]').trigger('click')
  await nextTick()
}
const settingBoxes = () => [...document.querySelectorAll<HTMLInputElement>('[role="list"] input[type="checkbox"]')]
const settingLabels = () => [...document.querySelectorAll('[role="list"] label')].map((l) => l.textContent?.trim())

describe('ChptTable 欄位設定', () => {
  it('「欄位」按鈕列出所有葉欄（多層表頭標上群組）', async () => {
    const w = await mountTable()
    await openSettings(w)
    expect(settingLabels()).toEqual(['工單', '數量 / 計畫', '數量 / 完成', '備註'])
    expect(settingBoxes().every((b) => b.checked)).toBe(true)
  })

  it('取消勾選就隱藏該欄；群組底下全部隱藏時群組表頭也拿掉；送出 update:hiddenColumns', async () => {
    const w = await mountTable()
    await openSettings(w)
    settingBoxes()[3].click() // 備註
    await nextTick()
    expect(leafTitles(w)).toEqual(['工單', '計畫', '完成'])
    expect(w.emitted('update:hiddenColumns')!.at(-1)![0]).toEqual(['note'])
    settingBoxes()[1].click()
    settingBoxes()[2].click()
    await nextTick()
    expect(w.find('thead th.group-cell').exists()).toBe(false)
    expect(w.find('tbody tr.data-row').findAll('td').map((td) => td.text())).toEqual(['WO-1'])
    // 按鈕上顯示「顯示中 / 全部」
    expect(w.find('button[aria-haspopup="dialog"]').text()).toContain('1/4')
  })

  it('至少留一欄：最後一個勾選框停用', async () => {
    const w = await mountTable({ hiddenColumns: ['plan', 'done', 'note'] })
    await openSettings(w)
    expect(settingBoxes()[0].disabled).toBe(true)
    expect(settingBoxes()[1].disabled).toBe(false)
  })

  it('受控的 hiddenColumns', async () => {
    const w = await mountTable({ hiddenColumns: ['wo'] })
    expect(leafTitles(w)).toEqual(['計畫', '完成', '備註'])
    await w.setProps({ hiddenColumns: [] })
    expect(leafTitles(w)).toEqual(['工單', '計畫', '完成', '備註'])
  })

  it('重設：全部顯示', async () => {
    const w = await mountTable({ hiddenColumns: ['note'] })
    await openSettings(w)
    ;[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === '重設')!.click()
    await nextTick()
    expect(leafTitles(w)).toHaveLength(4)
  })

  it('沒開 columnSettings 時沒有按鈕', async () => {
    const w = await mountTable({ columnSettings: false })
    expect(w.find('button[aria-haspopup="dialog"]').exists()).toBe(false)
  })
})

describe('ChptTable persistKey', () => {
  it('隱藏的欄位與欄寬存進 localStorage，重新掛載後還原', async () => {
    let w = await mountTable({ persistKey: 'wo-list', resizable: true })
    await openSettings(w)
    settingBoxes()[3].click()
    await nextTick()
    // 用鍵盤調整第一欄的欄寬
    await w.find('thead .col-resizer').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    const saved = JSON.parse(localStorage.getItem('chpt-table:wo-list')!)
    expect(saved.hidden).toEqual(['note'])
    expect(saved.widths.wo).toBeGreaterThan(0)
    w.unmount()

    w = await mountTable({ persistKey: 'wo-list', resizable: true })
    expect(leafTitles(w)).toEqual(['工單', '計畫', '完成'])
    expect((w.find('thead th[data-leaf="0"]').element as HTMLElement).style.width).toBe(`${saved.widths.wo}px`)
  })

  it('不同 persistKey 互不影響；沒有 persistKey 時不寫入', async () => {
    localStorage.setItem('chpt-table:other', JSON.stringify({ hidden: ['wo'] }))
    const w = await mountTable({ persistKey: 'mine' })
    expect(leafTitles(w)).toHaveLength(4)
    w.unmount()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const w2 = await mountTable()
    await openSettings(w2)
    settingBoxes()[0].click()
    await nextTick()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('壞掉的資料或 localStorage 丟錯時不影響表格', async () => {
    localStorage.setItem('chpt-table:broken', '{not json')
    let w = await mountTable({ persistKey: 'broken' })
    expect(leafTitles(w)).toHaveLength(4)
    w.unmount()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    w = await mountTable({ persistKey: 'full' })
    await openSettings(w)
    settingBoxes()[0].click()
    await nextTick()
    expect(leafTitles(w)).toEqual(['計畫', '完成', '備註'])
  })

  it('props.hiddenColumns 優先於記住的設定', async () => {
    localStorage.setItem('chpt-table:k', JSON.stringify({ hidden: ['wo'] }))
    const w = await mountTable({ persistKey: 'k', hiddenColumns: ['note'] })
    expect(leafTitles(w)).toEqual(['工單', '計畫', '完成'])
  })
})
