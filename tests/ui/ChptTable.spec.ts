import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptTable from '@/components/library/ui/ChptTable.vue'

type Row = { id: number; name: string; qty: number; closed?: boolean }

const columns = [
  { key: 'name', title: '工單' },
  { key: 'qty', title: '數量', sortType: 'number' as const },
]

const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `WO-${String(i + 1).padStart(3, '0')}`, qty: (i * 7) % 13 }))

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountTable(props: Record<string, unknown> = {}, slots: Record<string, string> = {}, attrs: Record<string, unknown> = {}) {
  wrapper = mount(ChptTable, {
    props: { columns, data: rows, defaultPageSize: 5, ...props },
    slots,
    attrs,
    attachTo: document.body,
  })
  return wrapper
}

const bodyRows = (w: VueWrapper) => w.findAll('tbody tr.data-row')
const rowChecks = (w: VueWrapper) => w.findAll('tbody input.table-check')
const headerCheck = (w: VueWrapper) => w.find('thead input[type="checkbox"]')

describe('ChptTable：勾選列', () => {
  it('selectable 時每列前面有核取方塊，名稱帶出列內容', () => {
    const w = mountTable({ selectable: true })
    expect(rowChecks(w)).toHaveLength(5)
    expect(rowChecks(w)[0].attributes('aria-label')).toBe('選取 WO-001')
    expect(headerCheck(w).attributes('aria-label')).toBe('全選本頁')
  })

  it('勾一列送出 update:selectedKeys 與 selection-change（含列資料）', async () => {
    const w = mountTable({ selectable: true })
    await rowChecks(w)[1].setValue(true)
    expect(w.emitted('update:selectedKeys')!.at(-1)).toEqual([[2]])
    const [keys, selected] = w.emitted('selection-change')!.at(-1) as [number[], Row[]]
    expect(keys).toEqual([2])
    expect(selected[0].name).toBe('WO-002')
    expect(bodyRows(w)[1].classes()).toContain('is-selected')
    expect(bodyRows(w)[1].attributes('aria-selected')).toBe('true')
  })

  it('表頭：部分勾選時為 indeterminate，全選本頁 / 再按取消本頁', async () => {
    const w = mountTable({ selectable: true })
    await rowChecks(w)[0].setValue(true)
    const el = headerCheck(w).element as HTMLInputElement
    expect(el.indeterminate).toBe(true)
    expect(el.checked).toBe(false)

    await headerCheck(w).trigger('change')
    expect(w.emitted('update:selectedKeys')!.at(-1)).toEqual([[1, 2, 3, 4, 5]])
    expect((headerCheck(w).element as HTMLInputElement).checked).toBe(true)

    await headerCheck(w).trigger('change')
    expect(w.emitted('update:selectedKeys')!.at(-1)).toEqual([[]])
  })

  it('換頁後勾選保留；全選只影響本頁', async () => {
    const w = mountTable({ selectable: true })
    await rowChecks(w)[0].setValue(true)
    w.vm.currentPage = 2
    await nextTick()
    expect(bodyRows(w)[0].text()).toContain('WO-006')
    await headerCheck(w).trigger('change')
    expect(w.emitted('update:selectedKeys')!.at(-1)).toEqual([[1, 6, 7, 8, 9, 10]])
    w.vm.currentPage = 1
    await nextTick()
    expect((rowChecks(w)[0].element as HTMLInputElement).checked).toBe(true)
    expect((rowChecks(w)[1].element as HTMLInputElement).checked).toBe(false)
  })

  it('isRowSelectable=false 的列不能勾，也不算進全選', async () => {
    const w = mountTable({ selectable: true, isRowSelectable: (r: Row) => r.id !== 2 })
    expect(rowChecks(w)[1].attributes('disabled')).toBeDefined()
    await headerCheck(w).trigger('change')
    expect(w.emitted('update:selectedKeys')!.at(-1)).toEqual([[1, 3, 4, 5]])
    expect((headerCheck(w).element as HTMLInputElement).checked).toBe(true)
  })

  it("selectable='single' 用 radio，勾新的會取代舊的", async () => {
    const w = mountTable({ selectable: 'single' })
    expect(headerCheck(w).exists()).toBe(false)
    expect(rowChecks(w)[0].attributes('type')).toBe('radio')
    await rowChecks(w)[0].trigger('change')
    await rowChecks(w)[2].trigger('change')
    expect(w.emitted('update:selectedKeys')!.at(-1)).toEqual([[3]])
  })

  it('已選筆數與「清除」；selection-actions 插槽拿得到鍵', async () => {
    const w = mountTable({ selectable: true }, { 'selection-actions': '<template #selection-actions="{ keys }"><span class="acts">{{ keys.join(",") }}</span></template>' })
    expect(w.text()).not.toContain('已選')
    await rowChecks(w)[0].setValue(true)
    await rowChecks(w)[2].setValue(true)
    expect(w.text()).toContain('已選 2 筆')
    expect(w.find('.acts').text()).toBe('1,3')
    await w.findAll('button').find((b) => b.text() === '清除')!.trigger('click')
    expect(w.emitted('update:selectedKeys')!.at(-1)).toEqual([[]])
  })

  it('selectedKeys prop 受控', async () => {
    const w = mountTable({ selectable: true, selectedKeys: [3] })
    expect((rowChecks(w)[2].element as HTMLInputElement).checked).toBe(true)
    await w.setProps({ selectedKeys: [1] })
    expect((rowChecks(w)[0].element as HTMLInputElement).checked).toBe(true)
    expect((rowChecks(w)[2].element as HTMLInputElement).checked).toBe(false)
  })

  it('rowKey 可以是函式', async () => {
    const w = mountTable({ selectable: true, rowKey: (r: Row) => r.name })
    await rowChecks(w)[0].setValue(true)
    expect(w.emitted('update:selectedKeys')!.at(-1)).toEqual([['WO-001']])
  })
})

describe('ChptTable：伺服器端模式', () => {
  const page1 = rows.slice(0, 5)

  it('不在前端分頁 / 排序；總筆數用 total', async () => {
    const w = mountTable({ remote: true, data: page1, total: 120 })
    expect(bodyRows(w)).toHaveLength(5)
    expect(w.vm.totalPages).toBe(24)
    // 點排序：資料順序不變（交給後端），但送出 change
    await w.findAll('th')[1].trigger('click')
    expect(bodyRows(w)[0].text()).toContain('WO-001')
    const change = w.emitted('change')!.at(-1)![0] as { reason: string; sortColumns: unknown[]; page: number }
    expect(change.reason).toBe('sort')
    expect(change.sortColumns).toEqual([{ key: 'qty', direction: 'asc' }])
    expect(change.page).toBe(1)
  })

  it('搜尋不在前端過濾，按 Enter 送出 change', async () => {
    const w = mountTable({ remote: true, data: page1, total: 120 })
    const input = w.find('input[type="text"]')
    await input.setValue('zzz')
    expect(bodyRows(w)).toHaveLength(5)
    await input.trigger('keyup', { key: 'Enter' })
    expect(w.emitted('change')!.at(-1)![0]).toMatchObject({ reason: 'search', query: 'zzz', page: 1 })
  })

  it('換頁送出 change；新資料進來時頁碼不會被打回第 1 頁', async () => {
    const w = mountTable({ remote: true, data: page1, total: 120 })
    w.vm.currentPage = 1
    // 直接呼叫分頁元件的事件
    const pager = w.findComponent({ name: 'ChptPagination' })
    pager.vm.$emit('update:current-page', 3)
    await nextTick()
    expect(w.emitted('change')!.at(-1)![0]).toMatchObject({ reason: 'page', page: 3 })
    await w.setProps({ data: rows.slice(5, 10) })
    expect(w.vm.currentPage).toBe(3)
  })

  it('跨頁勾選：selection-change 回傳別頁的列', async () => {
    const w = mountTable({ remote: true, selectable: true, data: page1, total: 12 })
    await rowChecks(w)[0].setValue(true)
    await w.setProps({ data: rows.slice(5, 10) })
    await rowChecks(w)[0].setValue(true)
    const [keys, selected] = w.emitted('selection-change')!.at(-1) as [number[], Row[]]
    expect(keys).toEqual([1, 6])
    expect(selected.map((r) => r.name)).toEqual(['WO-001', 'WO-006'])
  })
})

describe('ChptTable：載入中', () => {
  it('蓋上遮罩與 Spinner，table 設 aria-busy', () => {
    const w = mountTable({ loading: true })
    expect(w.find('table').attributes('aria-busy')).toBe('true')
    expect(w.find('[role="status"]').attributes('aria-label')).toBe('載入中')
  })

  it('沒資料又在載入時，不顯示「無資料」', () => {
    const w = mountTable({ loading: true, data: [] })
    expect(w.text()).not.toContain('無資料')
  })

  it('沒在載入時沒有 aria-busy', () => {
    const w = mountTable()
    expect(w.find('table').attributes('aria-busy')).toBeUndefined()
  })
})

describe('ChptTable：row-click', () => {
  it('有監聽時列可聚焦，點列與 Enter 都會送出', async () => {
    const clicks: Row[] = []
    const w = mountTable({}, {}, { onRowClick: (r: Row) => clicks.push(r) })
    const tr = bodyRows(w)[1]
    expect(tr.attributes('tabindex')).toBe('0')
    expect(tr.classes()).toContain('is-clickable')
    await tr.trigger('click')
    await tr.trigger('keydown', { key: 'Enter' })
    expect(clicks.map((r) => r.name)).toEqual(['WO-002', 'WO-002'])
  })

  it('點列裡的核取方塊或按鈕不算點整列', async () => {
    const clicks: Row[] = []
    const w = mountTable(
      { selectable: true },
      { cell: '<template #cell="{ value, column }"><button v-if="column.key === \'name\'" class="inner">{{ value }}</button><span v-else>{{ value }}</span></template>' },
      { onRowClick: (r: Row) => clicks.push(r) }
    )
    await rowChecks(w)[0].trigger('click')
    await w.find('button.inner').trigger('click')
    expect(clicks).toHaveLength(0)
  })

  it('沒監聽時列不可聚焦', () => {
    const w = mountTable()
    expect(bodyRows(w)[0].attributes('tabindex')).toBeUndefined()
    expect(bodyRows(w)[0].classes()).not.toContain('is-clickable')
  })
})

describe('ChptTable：展開列', () => {
  const expandSlot = { expand: '<template #expand="{ item }"><p class="detail">明細 {{ item.name }}</p></template>' }

  it('有 #expand 插槽才有展開欄；按鈕帶 aria-expanded / aria-controls', async () => {
    expect(mountTable().find('.expand-toggle').exists()).toBe(false)
    wrapper!.unmount()
    const w = mountTable({}, expandSlot)
    const btn = w.findAll('.expand-toggle')[0]
    expect(btn.attributes('aria-expanded')).toBe('false')
    expect(btn.attributes('aria-label')).toBe('展開明細')
    await btn.trigger('click')
    expect(btn.attributes('aria-expanded')).toBe('true')
    const detail = w.find('tr.expand-row')
    expect(detail.text()).toBe('明細 WO-001')
    expect(detail.attributes('id')).toBe(btn.attributes('aria-controls'))
    expect(detail.find('td').attributes('colspan')).toBe('3')
    expect(w.emitted('update:expandedKeys')!.at(-1)).toEqual([[1]])
    await btn.trigger('click')
    expect(w.find('tr.expand-row').exists()).toBe(false)
  })

  it('isRowExpandable=false 的列沒有展開鈕', () => {
    const w = mountTable({ isRowExpandable: (r: Row) => r.id % 2 === 1 }, expandSlot)
    const firstCells = bodyRows(w).map((tr) => tr.find('.expand-toggle').exists())
    expect(firstCells).toEqual([true, false, true, false, true])
  })

  it('勾選 + 展開同時開：colspan 算進兩個前導欄', async () => {
    const w = mountTable({ selectable: true, expandedKeys: [2] }, expandSlot)
    expect(w.find('tr.expand-row td').attributes('colspan')).toBe('4')
  })
})

describe('ChptTable：欄寬', () => {
  it('resizable 時每個表頭有 separator 把手；← → 調整並送出 column-resize', async () => {
    const w = mountTable({ resizable: true, columns: [{ key: 'name', title: '工單', width: 120 }, { key: 'qty', title: '數量', resizable: false }] })
    const handles = w.findAll('[role="separator"]')
    expect(handles).toHaveLength(1)
    expect(handles[0].attributes('aria-label')).toBe('調整「工單」欄寬')
    expect(handles[0].attributes('aria-valuenow')).toBe('120')
    await handles[0].trigger('keydown', { key: 'ArrowRight' })
    expect(handles[0].attributes('aria-valuenow')).toBe('130')
    expect(w.emitted('column-resize')!.at(-1)).toEqual([{ key: 'name', width: 130 }])
    expect((w.find('th:nth-child(1)').element as HTMLElement).style.width).toBe('130px')
    // 也套到儲存格上
    expect((bodyRows(w)[0].find('td').element as HTMLElement).style.maxWidth).toBe('130px')
  })

  it('不會小於 minWidth；雙擊還原', async () => {
    const w = mountTable({ resizable: true, columns: [{ key: 'name', title: '工單', width: 60, minWidth: 50 }, { key: 'qty', title: '數量' }] })
    const h = w.find('[role="separator"]')
    await h.trigger('keydown', { key: 'ArrowLeft' })
    await h.trigger('keydown', { key: 'ArrowLeft' })
    expect(h.attributes('aria-valuenow')).toBe('50')
    await h.trigger('dblclick')
    expect(h.attributes('aria-valuenow')).toBe('60')
  })

  it('拖曳：pointerdown → pointermove → pointerup', async () => {
    const w = mountTable({ resizable: true, columns: [{ key: 'name', title: '工單', width: 100 }, { key: 'qty', title: '數量' }] })
    const h = w.find('[role="separator"]')
    h.element.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 200, bubbles: true }))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 260 }))
    window.dispatchEvent(new MouseEvent('pointerup', {}))
    await nextTick()
    expect(h.attributes('aria-valuenow')).toBe('160')
    expect(w.emitted('column-resize')!.at(-1)).toEqual([{ key: 'name', width: 160 }])
  })

  it('點把手不會觸發排序', async () => {
    const w = mountTable({ resizable: true })
    await w.find('[role="separator"]').trigger('click')
    expect(w.emitted('sort')).toBeUndefined()
  })
})

describe('ChptTable：rowClass', () => {
  it('函式依列資料回傳 class', () => {
    const w = mountTable({ rowClass: (r: Row) => (r.qty === 0 ? 'warning-row' : '') })
    expect(bodyRows(w)[0].classes()).toContain('warning-row')
    expect(bodyRows(w)[1].classes()).not.toContain('warning-row')
  })
})

describe('ChptTable：上下都有分頁', () => {
  // 回歸（axe landmark-unique）：兩個 <nav> 同名，螢幕報讀器的地標清單分不出來
  it('兩個分頁導航的名稱不同', () => {
    const w = mountTable({ paginationPosition: 'both' })
    expect(w.findAll('nav').map((n) => n.attributes('aria-label'))).toEqual(['上方分頁導航', '下方分頁導航'])
  })

  it('只有一個分頁時沿用預設名稱', () => {
    const w = mountTable({ paginationPosition: 'bottom' })
    expect(w.findAll('nav').map((n) => n.attributes('aria-label'))).toEqual(['分頁導航'])
  })

  it('paginationLabel：同頁多個表格時各自命名', () => {
    expect(mountTable({ paginationLabel: '工單分頁' }).find('nav').attributes('aria-label')).toBe('工單分頁')
    const w = mountTable({ paginationLabel: '工單分頁', paginationPosition: 'both' })
    expect(w.findAll('nav').map((n) => n.attributes('aria-label'))).toEqual(['工單分頁（上方分頁導航）', '工單分頁（下方分頁導航）'])
  })
})
