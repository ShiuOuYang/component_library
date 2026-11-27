import { afterEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptAuditTrail from '@/components/library/ui/ChptAuditTrail.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { AuditEntry } from '@/components/library/shared/auditTrail'

const E: AuditEntry[] = [
  { id: 'e1', at: '2026-11-20T09:12:00', user: '林工程師', action: 'create', target: 'R-102', changes: [{ field: 'peak', to: 245 }, { field: 'soak', to: 90 }, { field: 'n2', to: false }] },
  { id: 'e2', at: '2026-11-26T14:30:00', user: '林工程師', action: 'update', target: 'R-102', changes: [{ field: 'peak', from: 245, to: 250 }], note: '改善空焊' },
  { id: 'e3', at: '2026-11-27T08:05:00', user: 'Chen Wei', action: 'update', changes: [{ field: 'n2', from: false, to: true }, { field: 'cfg', label: '設定', from: null, to: { a: 1 } }] },
  { id: 'e4', at: '2026-11-27T09:00:00', user: '王組長', action: 'archive', changes: [{ field: 'when', from: new Date(2026, 0, 2, 3, 4), to: '' }] },
]
const labels = { peak: '峰值溫度', soak: '恆溫時間', n2: '氮氣', when: '時間' }

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})
const mountIt = (props: Record<string, unknown> = {}) =>
  (wrapper = mount(ChptAuditTrail, { props: { entries: E, fieldLabels: labels, now: '2026-11-27T12:00:00', ...props }, attachTo: document.body }))
const ids = (w: VueWrapper) => w.findAll('[data-entry]').map((x) => x.attributes('data-entry'))

describe('ChptAuditTrail', () => {
  it('依日期分組（今天 / 昨天）、新到舊；動作、對象、原值 → 新值、備註', () => {
    const w = mountIt()
    expect(ids(w)).toEqual(['e4', 'e3', 'e2', 'e1'])
    const heads = w.findAll('h4').map((x) => x.text())
    expect(heads).toEqual(['2026-11-27 · 今天', '2026-11-26 · 昨天', '2026-11-20'])

    const e2 = w.find('[data-entry="e2"]')
    expect(e2.find('time').text()).toBe('14:30')
    expect(e2.text()).toContain('修改')
    expect(e2.find('del').text()).toBe('245')
    expect(e2.find('ins').text()).toBe('250')
    expect(e2.find('.sr-only').text()).toBe('峰值溫度：245 改為 250')
    expect(e2.text()).toContain('改善空焊')

    // 新增只顯示新值；預設格式：布林、空值、物件、日期、自訂動作
    const e1 = w.find('[data-entry="e1"]')
    expect(e1.findAll('del')).toHaveLength(0)
    expect(e1.text()).toContain('否')
    const e3 = w.find('[data-entry="e3"]')
    expect(e3.text()).toContain('（空）')
    expect(e3.text()).toContain('{"a":1}')
    expect(e3.text()).toContain('設定')
    expect(e3.find('span[aria-hidden="true"]').text()).toBe('CW') // 英文名縮寫
    const e4 = w.find('[data-entry="e4"]')
    expect(e4.text()).toContain('2026-01-02 03:04')
    expect(e4.text()).toContain('archive')
    expect(w.find('[data-entry="e1"] span[aria-hidden="true"]').text()).toBe('林') // 中文取第一個字（姓）
    expect(w.text()).toContain('顯示 4 / 4 筆')
  })

  it('篩選：人員、欄位、關鍵字、日期區間；顯示更多', async () => {
    const w = mountIt({ pageSize: 2 })
    expect(ids(w)).toEqual(['e4', 'e3'])
    await w.findAll('button').find((b) => b.text().includes('顯示更多'))!.trigger('click')
    expect(ids(w)).toHaveLength(4)

    const [userSel, fieldSel] = w.findAll('select')
    await userSel.setValue('林工程師')
    expect(ids(w)).toEqual(['e2', 'e1'])
    await userSel.setValue('')
    await fieldSel.setValue('n2')
    expect(ids(w)).toEqual(['e3', 'e1'])
    expect(fieldSel.findAll('option').map((o) => o.text())).toContain('設定')
    await fieldSel.setValue('')
    await w.find('input[type="search"]').setValue('峰值')
    expect(ids(w)).toEqual(['e2', 'e1'])
    await w.find('input[type="search"]').setValue('')
    const [from, to] = w.findAll('input[type="date"]')
    await from.setValue('2026-11-26')
    await to.setValue('2026-11-26')
    expect(ids(w)).toEqual(['e2'])
    await from.setValue('2030-01-01')
    expect(w.text()).toContain('沒有符合的紀錄')
  })

  it('版本比較：勾兩筆、舊的當 A；最多兩筆；還原版本與單一欄位', async () => {
    const w = mountIt({ revertable: true })
    const box = (id: string) => w.find(`[data-entry="${id}"] input[type="checkbox"]`)
    await box('e3').setValue(true)
    expect(w.text()).toContain('勾選兩筆紀錄')
    await box('e1').setValue(true)
    expect(box('e2').attributes('disabled')).toBeDefined()
    const cmp = w.find('section[aria-labelledby$="-cmp"]')
    expect(cmp.text()).toContain('版本比較')
    const rows = cmp.findAll('tbody tr').map((r) => r.findAll('th, td').map((c) => c.text()))
    expect(rows).toContainEqual(['峰值溫度', '245', '250'])
    expect(rows).toContainEqual(['氮氣', '否', '是'])
    expect(rows).toContainEqual(['恆溫時間', '90', '90'])
    expect(cmp.text()).toContain('3 個欄位不同')
    expect(cmp.find('thead').text()).toContain('2026-11-20 09:12')

    await cmp.findAll('button').find((b) => b.text().includes('還原到版本 A'))!.trigger('click')
    const ev = wrapper!.emitted('revert-version')![0][0] as { entry: AuditEntry; snapshot: Record<string, unknown> }
    expect(ev.entry.id).toBe('e1')
    expect(ev.snapshot).toMatchObject({ peak: 245, n2: false })

    await w.find('[data-entry="e2"] button[aria-label^="把 峰值溫度 還原為 245"]').trigger('click')
    expect(wrapper!.emitted('revert')![0][0]).toMatchObject({ entry: { id: 'e2' }, change: { field: 'peak', from: 245 } })
    expect(w.find('[data-entry="e1"] button[aria-label^="把"]').exists()).toBe(false) // 新增不能還原

    // 取消勾選、清除比較
    await box('e3').setValue(false)
    expect(w.find('section[aria-labelledby$="-cmp"]').exists()).toBe(false)
    ;(wrapper!.vm as unknown as { compareWith: (a: string, b: string) => void }).compareWith('e2', 'e2b')
    await w.vm.$nextTick()
    await w.setProps({ entries: [...E, { id: 'e2b', at: '2026-11-26T15:00:00', user: 'x', changes: [{ field: 'peak', from: 250, to: 250 }] }] })
    expect(w.find('section[aria-labelledby$="-cmp"]').text()).toContain('兩個版本內容相同')
    await w.findAll('button').find((b) => b.text().includes('清除比較'))!.trigger('click')
    expect(w.find('section[aria-labelledby$="-cmp"]').exists()).toBe(false)
    // 被比較的紀錄消失時自動取消
    ;(wrapper!.vm as unknown as { compareWith: (a: string, b: string) => void }).compareWith('e1', 'e2')
    await w.setProps({ entries: E.filter((e) => e.id !== 'e2') })
    expect(w.find('section[aria-labelledby$="-cmp"]').exists()).toBe(false)
  })

  it('自訂格式、關閉比較、捲動區、匯出 CSV、快照', async () => {
    const blobs: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (b: Blob) => (blobs.push(b), 'blob:x') })
    let name = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      name = this.download
    })
    const w = mountIt({ formatValue: (v: unknown, f: string) => (f === 'peak' ? `${v} °C` : String(v)), compare: false, maxHeight: 300, filename: 'r102' })
    expect(w.find('[data-entry="e2"] ins').text()).toBe('250 °C')
    expect(w.find('input[type="checkbox"]').exists()).toBe(false)
    expect(w.find('[role="region"]').attributes('tabindex')).toBe('0')
    await w.findAll('button').find((b) => b.text().includes('匯出 CSV'))!.trigger('click')
    expect(name).toBe('r102.csv')
    const csv = await blobs[0].text()
    expect(csv).toContain('時間,人員,動作,對象,欄位,原值,新值,備註')
    expect(csv).toContain('2026-11-26 14:30,林工程師,修改,R-102,峰值溫度,245 °C,250 °C,改善空焊')
    const vm = w.vm as unknown as { snapshot: (id: string | null) => Record<string, unknown> }
    expect(vm.snapshot('e2')).toMatchObject({ peak: 250, n2: false })

    // 沒有變更的紀錄也匯出一列
    wrapper!.unmount()
    blobs.length = 0
    const w2 = mountIt({ entries: [{ id: 'x', at: 1, user: 'u', action: 'delete', target: 'R-9' }] })
    expect(w2.text()).toContain('刪除')
    ;(w2.vm as unknown as { exportCsv: () => void }).exportCsv()
    expect((await blobs[0].text()).split('\r\n')).toHaveLength(2)
  })

  it('英文語系、沒有紀錄', () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptAuditTrail, { entries: E, now: '2026-11-27T12:00:00' })) })
    expect(wrapper.text()).toContain('Today')
    expect(wrapper.text()).toContain('Updated')
    expect(wrapper.text()).toContain('Showing 4 of 4')
    wrapper.unmount()
    wrapper = mount(ChptAuditTrail, { props: { entries: [] } })
    expect(wrapper.text()).toContain('沒有符合的紀錄')
  })
})
