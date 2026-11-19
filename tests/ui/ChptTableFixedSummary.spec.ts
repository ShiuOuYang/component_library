import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptTable from '@/components/library/ui/ChptTable.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const rows = [
  { id: 1, line: 'L01', part: 'PN-1', a: 10, b: '1,000', yield: 98.5, status: 'run' },
  { id: 2, line: 'L02', part: 'PN-2', a: 20, b: 2000, yield: 97.5, status: 'down' },
  { id: 3, line: 'L03', part: 'PN-3', a: null, b: 'x', yield: 99, status: '' },
]

/** jsdom 沒有版面：每個表頭格的寬度 = data-w（沒有時 100），前導欄 40 */
function stubWidths() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const w = this.hasAttribute('data-lead') ? 40 : this.hasAttribute('data-leaf') ? Number(this.dataset.leaf) * 10 + 100 : 0
    return { width: w, height: 30, left: 0, top: 0, right: w, bottom: 30, x: 0, y: 0, toJSON() {} } as DOMRect
  })
}

async function mountTable(props: Record<string, unknown>, slots: Record<string, unknown> = {}) {
  wrapper = mount(ChptTable, { props: { data: rows, defaultPageSize: 10, ...props }, slots, attachTo: document.body })
  await nextTick()
  await nextTick()
  return wrapper
}

const headerTitles = (w: VueWrapper) => w.findAll('thead th[data-leaf]').map((th) => th.text())

describe('ChptTable 固定欄', () => {
  it("固定在左的排到最前面、右的排到最後面；'left' / 'right' / true 也接受", async () => {
    const w = await mountTable({
      columns: [
        { key: 'a', title: 'A' },
        { key: 'status', title: '狀態', fixed: 'right' },
        { key: 'line', title: '產線', fixed: 'start' },
        { key: 'part', title: '料號', fixed: true },
        { key: 'b', title: 'B' },
      ],
    })
    expect(headerTitles(w)).toEqual(['產線', '料號', 'A', 'B', '狀態'])
    // 資料列的順序跟表頭一致
    expect(w.find('tbody tr.data-row').findAll('td').map((td) => td.text())).toEqual(['L01', 'PN-1', '10', '1,000', 'run'])
  })

  it('依量到的欄寬算出 left / right；勾選欄跟著固定在最左', async () => {
    stubWidths()
    const w = await mountTable({
      selectable: true,
      columns: [
        { key: 'line', title: '產線', fixed: 'start' }, // leaf 0 → 100px
        { key: 'part', title: '料號', fixed: 'start' }, // leaf 1 → 110px
        { key: 'a', title: 'A' },
        { key: 'b', title: 'B', fixed: 'end' }, // leaf 3 → 130px
        { key: 'status', title: '狀態', fixed: 'end' }, // leaf 4 → 140px
      ],
    })
    const cells = w.find('tbody tr.data-row').findAll('td')
    const style = (i: number) => (cells[i].element as HTMLElement).style
    expect(cells[0].classes()).toContain('is-fixed') // 勾選欄
    expect(style(0).left).toBe('0px')
    expect(style(1).left).toBe('40px') // 產線：勾選欄之後
    expect(style(2).left).toBe('140px') // 料號：40 + 100
    expect(cells[3].classes()).not.toContain('is-fixed')
    expect(style(4).right).toBe('140px') // B：狀態的寬度
    expect(style(5).right).toBe('0px')
    // 表頭也固定在同一個位置
    const th = w.findAll('thead th[data-leaf]')
    expect((th[1].element as HTMLElement).style.left).toBe('140px')
    expect(th[1].classes()).toContain('is-fixed')
  })

  it('沒有左側固定欄時前導欄不固定', async () => {
    const w = await mountTable({ selectable: true, columns: [{ key: 'line', title: '產線' }, { key: 'status', title: '狀態', fixed: 'end' }] })
    expect(w.find('tbody td.lead-col').classes()).not.toContain('is-fixed')
  })

  it('群組欄：設在群組上時底下全部固定，群組表頭也固定', async () => {
    stubWidths()
    const w = await mountTable({
      columns: [
        { key: 'a', title: 'A' },
        { title: '識別', fixed: 'start', children: [{ key: 'line', title: '產線' }, { key: 'part', title: '料號' }] },
      ],
    })
    // 多層表頭時表頭葉欄的 DOM 順序依「列」排；看資料列的順序
    expect(w.find('tbody tr.data-row').findAll('td').map((td) => td.text())).toEqual(['L01', 'PN-1', '10'])
    const group = w.find('thead th.group-cell')
    expect(group.classes()).toContain('is-fixed')
    expect((group.element as HTMLElement).style.left).toBe('0px')
  })

  it('捲動時邊緣陰影：左側在捲離起點後出現，右側在還沒捲到底時出現', async () => {
    const w = await mountTable({
      columns: [{ key: 'line', title: '產線', fixed: 'start' }, { key: 'a', title: 'A' }, { key: 'status', title: '狀態', fixed: 'end' }],
    })
    const scroller = w.find('table').element.parentElement as HTMLElement
    Object.defineProperty(scroller, 'scrollWidth', { value: 1000, configurable: true })
    Object.defineProperty(scroller, 'clientWidth', { value: 400, configurable: true })
    scroller.scrollLeft = 0
    await w.find('table').element.parentElement!.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(w.find('.is-fixed-start-last').exists()).toBe(false)
    expect(w.find('.is-fixed-end-first').exists()).toBe(true)
    scroller.scrollLeft = 600
    scroller.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(w.find('.is-fixed-start-last').exists()).toBe(true)
    expect(w.find('.is-fixed-end-first').exists()).toBe(false)
  })
})

describe('ChptTable 合計列', () => {
  const columns = [
    { key: 'line', title: '產線', summary: 'count' },
    { key: 'part', title: '料號' },
    { key: 'a', title: 'A', summary: 'sum' },
    { key: 'b', title: 'B', summary: 'sum' },
    { key: 'yield', title: '良率', summary: 'avg', summaryFormat: (v: unknown) => `${(v as number).toFixed(1)}%` },
    { key: 'status', title: '狀態', summary: (values: unknown[]) => values.filter((v) => v === 'down').length },
  ]
  const summaryCells = (w: VueWrapper) => w.findAll('tfoot tr.summary-row > *').map((c) => c.text())

  it('sum / avg / count / 自訂；數字字串（含千分位）也算，非數字略過；標籤在第一個沒有合計的欄位', async () => {
    const w = await mountTable({ columns })
    expect(summaryCells(w)).toEqual(['3', '合計', '30', '3,000', '98.3%', '1'])
    const label = w.find('tfoot tr.summary-row > th')
    expect(label.attributes('scope')).toBe('row')
    expect(label.text()).toBe('合計')
  })

  it('min / max；沒有數值時顯示 —', async () => {
    const w = await mountTable({
      columns: [
        { key: 'part', title: '料號' },
        { key: 'a', title: 'A', summary: 'min' },
        { key: 'yield', title: '良率', summary: 'max' },
        { key: 'status', title: '狀態', summary: 'sum' },
      ],
    })
    expect(summaryCells(w)).toEqual(['合計', '10', '99', '—'])
  })

  it("預設算篩選後的全部資料；summaryScope='page' 只算這一頁", async () => {
    const w = await mountTable({ columns, defaultPageSize: 2 })
    expect(summaryCells(w)[2]).toBe('30')
    await w.setProps({ summaryScope: 'page' })
    expect(summaryCells(w)[2]).toBe('30') // 第 1 頁：10 + 20
    await w.setProps({ data: [...rows, { id: 4, line: 'L04', part: 'PN-4', a: 5, b: 0, yield: 90, status: 'run' }], defaultPageSize: 2 })
    // 搜尋只留 L04：兩種範圍都只剩它
    await w.find('input[type="text"]').setValue('L04')
    await w.find('input[type="text"]').trigger('keyup.enter')
    await nextTick()
    expect(summaryCells(w)[0]).toBe('1')
    expect(summaryCells(w)[2]).toBe('5')
  })

  it('remote：以父層給的資料計算', async () => {
    const w = await mountTable({ columns, remote: true, total: 500 })
    expect(summaryCells(w)[2]).toBe('30')
  })

  it('沒有欄位設定 summary 時沒有合計列；沒有資料時不顯示', async () => {
    const w = await mountTable({ columns: [{ key: 'line', title: '產線' }] })
    expect(w.find('tfoot').exists()).toBe(false)
    await w.setProps({ columns, data: [] })
    expect(w.find('tr.summary-row').exists()).toBe(false)
  })

  it('全部欄位都有合計時，標籤放在勾選欄；summaryLabel 自訂', async () => {
    const w = await mountTable({ columns: [{ key: 'a', title: 'A', summary: 'sum' }], selectable: true, summaryLabel: '總計' })
    expect(w.find('tfoot tr.summary-row > th').text()).toBe('總計')
    expect(w.find('tfoot tr.summary-row > th').classes()).toContain('lead-col')
  })

  it('#summary-cell 插槽自訂某一格', async () => {
    const w = await mountTable(
      { columns: [{ key: 'part', title: '料號' }, { key: 'a', title: 'A', summary: 'sum' }] },
      { 'summary-cell': ({ value, rows: r }: { value: number; rows: unknown[] }) => h('b', `${value} / ${r.length} 筆`) }
    )
    expect(w.find('tfoot b').text()).toBe('30 / 3 筆')
  })

  it('固定欄的合計格也固定', async () => {
    const w = await mountTable({ columns: [{ key: 'line', title: '產線', fixed: 'start', summary: 'count' }, { key: 'a', title: 'A', summary: 'sum' }] })
    expect(w.find('tfoot tr.summary-row > td').classes()).toContain('is-fixed')
  })

  it('virtual：合計列固定在底部', async () => {
    const w = await mountTable({ columns, virtual: true })
    expect(w.find('tfoot').classes()).toContain('is-sticky-foot')
  })

  it('語系：enUS 的標籤與千分位', async () => {
    wrapper = mount({
      render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptTable, { data: rows, columns: [{ key: 'part', title: 'Part' }, { key: 'b', title: 'B', summary: 'sum' }] })),
    }, { attachTo: document.body })
    await nextTick()
    expect(wrapper.findAll('tfoot tr.summary-row > *').map((c) => c.text())).toEqual(['Total', '3,000'])
  })
})
