import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptFmeaTable from '@/components/library/ui/ChptFmeaTable.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { FmeaRow } from '@/components/library/shared/fmea'

const ROWS: FmeaRow[] = [
  {
    id: 'p1', item: '錫膏印刷', failureMode: '錫膏量不足', effect: '空焊', special: 'SC', severity: 8,
    cause: '鋼板堵塞', prevention: '自動擦拭', occurrence: 6, detectionControl: 'SPI', detection: 3,
    actions: [{ id: 'a1', text: '每 3 片擦拭', owner: '林', due: '2026-12-05', done: false }],
  },
  {
    id: 'p2', item: '錫膏印刷', failureMode: '印刷偏移', effect: '短路', severity: 7,
    cause: '定位銷磨損', occurrence: 4, detectionControl: 'SPI', detection: 3,
    actions: [{ id: 'a2', text: '每週點檢', owner: '陳', due: '2026-11-20', done: false }],
  },
  {
    id: 'p3', item: '置件', failureMode: '極性反向', effect: '燒毀', special: 'CC', severity: 10,
    cause: '料捲方向', occurrence: 3, detectionControl: 'AOI', detection: 4,
    actions: [{ id: 'a3', text: 'AOI 極性', done: true }],
    revised: { severity: 10, occurrence: 2, detection: 2 },
  },
  { id: 'p4', item: '清潔', failureMode: '殘留', severity: 3, occurrence: 4, detection: 5 },
]

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

function mountIt(props: Record<string, unknown> = {}) {
  const rows = ref<FmeaRow[]>(structuredClone(ROWS))
  wrapper = mount(
    {
      render: () =>
        h(ChptFmeaTable, {
          modelValue: rows.value,
          'onUpdate:modelValue': (v: FmeaRow[]) => (rows.value = v),
          today: '2026-11-27',
          ...props,
        }),
    },
    { attachTo: document.body },
  )
  const w = wrapper
  const bodyRows = () => w.findAll('tbody[data-row]')
  const ids = () => bodyRows().map((b) => b.attributes('data-row'))
  const rowOf = (id: string) => w.find(`tbody[data-row="${id}"]`)
  return { w, rows, bodyRows, ids, rowOf }
}

describe('ChptFmeaTable', () => {
  it('RPN、AP、改善前後、特殊特性與對策狀態', () => {
    const { rowOf, w } = mountIt()
    const p1 = rowOf('p1').findAll('tr')[0].findAll('td')
    expect(p1[10].text()).toContain('144') // 8 × 6 × 3，超過門檻 100
    expect(p1[10].attributes('style')).toContain('--t-danger')
    expect(p1[11].text()).toContain('H')
    expect(p1[2].text()).toContain('SC')
    expect(p1[12].text()).toContain('0/1')

    const p3 = rowOf('p3').findAll('tr')[0].findAll('td')
    expect(p3[4].find('span').attributes('style')).toContain('--t-danger') // 嚴重度 10
    expect(p3[13].text()).toContain('120 → 40')
    expect(p3[12].text()).toContain('1/1')

    // 同一步驟的第二列只留報讀用的「同上」
    expect(rowOf('p2').findAll('td')[1].find('.sr-only').text()).toContain('錫膏印刷')

    // 沒有對策：p4 為 L 不標紅
    expect(rowOf('p4').findAll('td')[12].text()).toContain('尚無對策')

    // 摘要
    const summary = w.text()
    // p1 H；p2（S7 O4 D3）M；p3（S10 O3 D4）與 p4 為 L —— p3 的 RPN 120 比 p2 高，AP 卻較低
    expect(summary).toContain('AP H：1')
    expect(summary).toContain('AP L：2')
    expect(summary).toContain('逾期 1') // p2 的對策 11/20 到期
    expect(summary).toContain('120 → 40')
  })

  it('篩選 AP、搜尋、排序', async () => {
    const { w, ids } = mountIt()
    const apBtn = (label: string) => w.findAll('button[aria-pressed]').find((b) => b.text() === label)!
    await apBtn('AP L').trigger('click')
    expect(ids()).toEqual(['p3', 'p4'])
    expect(apBtn('AP L').attributes('aria-pressed')).toBe('true')
    await apBtn('全部').trigger('click')
    expect(ids()).toHaveLength(4)

    await w.find('input[type="search"]').setValue('定位銷')
    expect(ids()).toEqual(['p2'])
    await w.find('input[type="search"]').setValue('不存在')
    expect(w.text()).toContain('沒有符合的項目')
    await w.find('input[type="search"]').setValue('')

    const sort = w.findAll('select').find((s) => s.findAll('option').some((o) => o.text() === '依 RPN'))!
    await sort.setValue('rpn')
    expect(ids()).toEqual(['p1', 'p3', 'p2', 'p4']) // 144、120、84、60
    await sort.setValue('ap')
    expect(ids()).toEqual(['p1', 'p2', 'p3', 'p4']) // H、M、L（S10）、L（S3）
  })

  it('唯讀：評分是數字、沒有新增；展開顯示詳細內容與對策', async () => {
    const { w, rowOf } = mountIt()
    expect(w.find('select[aria-label*="嚴重度"]').exists()).toBe(false)
    expect(w.findAll('button').some((b) => b.text().includes('新增項目'))).toBe(false)

    const toggle = rowOf('p2').find('button[aria-expanded]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    const detail = w.find(`#${toggle.attributes('aria-controls')}`)
    expect(detail.exists()).toBe(true)
    expect(detail.text()).toContain('定位銷磨損')
    expect(detail.text()).toContain('負責人：陳')
    expect(detail.text()).toContain('（有逾期）')
    expect(detail.text()).toContain('尚未重新評分')
    await toggle.trigger('click')
    expect(w.find(`#${toggle.attributes('aria-controls')}`).exists()).toBe(false)
  })

  it('編輯：評分下拉、文字、特殊特性', async () => {
    const { w, rows, rowOf } = mountIt({ editable: true })
    const sel = rowOf('p4').find('select[aria-label="殘留：嚴重度"]')
    await sel.setValue('9')
    expect(rows.value.find((r) => r.id === 'p4')!.severity).toBe(9)
    expect(w.find('[aria-live="polite"]').text()).toContain('殘留：嚴重度改為 9')

    await rowOf('p4').find('button[aria-expanded]').trigger('click')
    const cause = rowOf('p4').find('textarea[data-field="cause"]')
    await cause.setValue('清洗時間不足')
    await cause.trigger('change')
    expect(rows.value.find((r) => r.id === 'p4')!.cause).toBe('清洗時間不足')

    const special = rowOf('p4').findAll('select').find((s) => s.findAll('option').some((o) => o.attributes('value') === 'CC'))!
    await special.setValue('CC')
    expect(rows.value.find((r) => r.id === 'p4')!.special).toBe('CC')
    await special.setValue('')
    expect(rows.value.find((r) => r.id === 'p4')!.special).toBeNull()
  })

  it('編輯：新增、修改、完成與刪除對策', async () => {
    const { rows, rowOf } = mountIt({ editable: true })
    await rowOf('p4').find('button[aria-expanded]').trigger('click')
    const addBtn = rowOf('p4').findAll('button').find((b) => b.text().includes('新增對策'))!
    await addBtn.trigger('click')
    await nextTick()
    const act = () => rows.value.find((r) => r.id === 'p4')!.actions!
    expect(act()).toHaveLength(1)
    const li = rowOf('p4').find(`[data-action="${act()[0].id}"]`)
    expect(document.activeElement).toBe(li.find('input:not([type])').element)
    await li.find('input:not([type])').setValue('延長清洗')
    await li.find('input:not([type])').trigger('change')
    await li.find('input[aria-label="負責人"]').setValue('王')
    await li.find('input[aria-label="負責人"]').trigger('change')
    await li.find('input[type="date"]').setValue('2026-12-01')
    await li.find('input[type="date"]').trigger('change')
    await li.find('input[type="checkbox"]').setValue(true)
    expect(act()[0]).toMatchObject({ text: '延長清洗', owner: '王', due: '2026-12-01', done: true })
    // 清掉期限
    await li.find('input[type="date"]').setValue('')
    await li.find('input[type="date"]').trigger('change')
    expect(act()[0].due).toBeNull()
    await li.find('button[aria-label^="刪除對策"]').trigger('click')
    expect(act()).toHaveLength(0)
  })

  it('編輯：重新評分、清除、刪除項目、新增項目', async () => {
    const { w, rows, rowOf, ids } = mountIt({ editable: true })
    await rowOf('p1').find('button[aria-expanded]').trigger('click')
    const btn = (text: string) => rowOf('p1').findAll('button').find((b) => b.text().includes(text))!
    await btn('重新評分').trigger('click')
    expect(rows.value[0].revised).toEqual({ severity: 8, occurrence: 6, detection: 3 })
    await rowOf('p1').find('select[aria-label="改善後重新評分：發生度"]').setValue('2')
    expect(rows.value[0].revised!.occurrence).toBe(2)
    expect(rowOf('p1').text()).toContain('144 → 48')
    await btn('清除重新評分').trigger('click')
    expect(rows.value[0].revised).toBeNull()

    await btn('刪除此項目').trigger('click')
    expect(ids()).not.toContain('p1')
    expect(w.find('[aria-live="polite"]').text()).toContain('已刪除')

    // 新增：清掉篩選、展開、聚焦步驟欄位
    await w.find('input[type="search"]').setValue('置件')
    await w.findAll('button').find((b) => b.text().includes('新增項目'))!.trigger('click')
    await nextTick()
    await nextTick()
    expect(rows.value).toHaveLength(4)
    const added = rows.value[3]
    expect(ids()).toContain(added.id)
    expect((document.activeElement as HTMLElement).dataset.field).toBe('item')
  })

  it('匯出 CSV（目前篩選後的列）與對外方法', async () => {
    const blobs: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (b: Blob) => (blobs.push(b), 'blob:x') })
    let name = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      name = this.download
    })
    const { w } = mountIt({ filename: 'pfmea' })
    await w.findAll('button[aria-pressed]').find((b) => b.text() === 'AP H')!.trigger('click')
    await w.findAll('button').find((b) => b.text().includes('匯出 CSV'))!.trigger('click')
    expect(name).toBe('pfmea.csv')
    const csv = await blobs[0].text()
    expect(csv).toContain('製程步驟')
    expect(csv).toContain('錫膏量不足')
    expect(csv).not.toContain('殘留')
    expect(csv).toContain('2026-12-05')

    const vm = w.findComponent(ChptFmeaTable).vm as unknown as { expandAll: () => void; collapseAll: () => void; exportCsv: (f?: string) => void }
    vm.expandAll()
    await nextTick()
    expect(w.findAll('[aria-expanded="true"]').length).toBe(1) // 篩選後只看得到 p1
    vm.collapseAll()
    await nextTick()
    expect(w.findAll('[aria-expanded="true"]').length).toBe(0)
    vm.exportCsv('x')
    expect(name).toBe('x.csv')
  })

  it('英文語系、門檻設 Infinity 不標紅', () => {
    wrapper = mount({
      render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptFmeaTable, { modelValue: ROWS, threshold: Infinity, today: '2026-11-27' })),
    })
    expect(wrapper.text()).toContain('Failure mode')
    expect(wrapper.text()).toContain('1 overdue')
    expect(wrapper.text()).not.toContain('RPN ≥')
    const rpnCell = wrapper.find('tbody[data-row="p1"] tr').findAll('td')[10]
    expect(rpnCell.attributes('style')).toBeUndefined()
  })
})
