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

describe('ChptTable：資料更新時的頁碼', () => {
  const goTo = async (w: VueWrapper, page: number) => {
    w.findComponent({ name: 'ChptPagination' }).vm.$emit('update:current-page', page)
    await nextTick()
  }

  it('資料內容更新（即時同步、改某一列）時保留頁碼', async () => {
    const w = mountTable()
    await goTo(w, 3)
    expect(bodyRows(w)[0].text()).toContain('WO-011')
    await w.setProps({ data: rows.map((r) => (r.id === 11 ? { ...r, qty: 99 } : { ...r })) })
    expect(w.vm.currentPage).toBe(3)
    expect(bodyRows(w)[0].text()).toContain('99')
  })

  it('原地修改列的值不會跳頁', async () => {
    const data = rows.map((r) => ({ ...r }))
    const w = mountTable({ data })
    await goTo(w, 2)
    data[5].qty = 42
    await w.setProps({ data: [...data] })
    expect(w.vm.currentPage).toBe(2)
  })

  it('資料變少、目前頁超出總頁數時拉回最後一頁', async () => {
    const w = mountTable()
    await goTo(w, 3)
    await w.setProps({ data: rows.slice(0, 7) })
    expect(w.vm.currentPage).toBe(2)
    expect(bodyRows(w)[0].text()).toContain('WO-006')
    await w.setProps({ data: [] })
    expect(w.vm.currentPage).toBe(1)
  })

  it('打字即時過濾讓頁數變少時，不會停在空白頁', async () => {
    const w = mountTable()
    await goTo(w, 3)
    await w.find('input[type="text"]').setValue('WO-00')
    expect(w.vm.totalPages).toBe(2)
    expect(w.vm.currentPage).toBe(2)
    expect(bodyRows(w).length).toBeGreaterThan(0)
  })

  it('搜尋與排序仍回到第 1 頁；resetPage() 讓父層換資料時從頭看', async () => {
    const w = mountTable()
    await goTo(w, 3)
    await w.findAll('th')[1].trigger('click')
    expect(w.vm.currentPage).toBe(1)

    await goTo(w, 2)
    const input = w.find('input[type="text"]')
    await input.setValue('WO')
    await input.trigger('keyup', { key: 'Enter' })
    expect(w.vm.currentPage).toBe(1)

    await goTo(w, 3)
    ;(w.vm as unknown as { resetPage: () => void }).resetPage()
    await nextTick()
    expect(w.vm.currentPage).toBe(1)
  })

  it('remote 模式頁碼由父層決定：總筆數變少也不自動改頁', async () => {
    const w = mountTable({ remote: true, data: rows.slice(0, 5), total: 120 })
    await goTo(w, 10)
    await w.setProps({ data: rows.slice(0, 5), total: 12 })
    expect(w.vm.currentPage).toBe(10)
  })
})

describe('ChptTable：跨頁勾選的列快取', () => {
  it('勾選中的列翻過好幾頁仍拿得到；沒勾的別頁列不留在快取', async () => {
    const pageOf = (n: number) => rows.slice((n - 1) * 4, n * 4)
    const w = mountTable({ remote: true, selectable: true, data: pageOf(1), total: 12, defaultPageSize: 4 })
    await rowChecks(w)[0].setValue(true) // WO-001
    await w.setProps({ data: pageOf(2) })
    await w.setProps({ data: pageOf(3) })
    await rowChecks(w)[0].setValue(true) // WO-009
    let [keys, selected] = w.emitted('selection-change')!.at(-1) as [number[], Row[]]
    expect(keys).toEqual([1, 9])
    expect(selected.map((r) => r.name)).toEqual(['WO-001', 'WO-009'])

    // 第 2 頁的列沒被勾過，離開後就不再快取：父層事後把它設成已選也查不到列資料
    await w.setProps({ selectedKeys: [1, 9, 5] })
    await rowChecks(w)[1].setValue(true) // WO-010
    ;[keys, selected] = w.emitted('selection-change')!.at(-1) as [number[], Row[]]
    expect(keys).toEqual([1, 9, 5, 10])
    expect(selected.map((r) => r.name)).toEqual(['WO-001', 'WO-009', 'WO-010'])
  })
})

describe('ChptTable：勾選列的資料跟著父層更新', () => {
  /**
   * 回歸：seenRows 原本是一般的 Map，selectedRows 只依賴勾選的鍵 ——
   * 父層更新了已勾選那列的內容（同一個鍵、新的資料），鍵沒變，
   * selection-actions 插槽與 ref 的 selectedRows 仍是舊資料。
   */
  it('同一個鍵、內容改變：插槽與 selectedRows 拿到新資料', async () => {
    const w = mountTable(
      { selectable: true },
      { 'selection-actions': '<template #selection-actions="{ rows }"><span class="acts">{{ rows.map((r) => r.name).join(",") }}</span></template>' }
    )
    await rowChecks(w)[0].setValue(true)
    expect(w.find('.acts').text()).toBe('WO-001')

    await w.setProps({ data: rows.map((r) => (r.id === 1 ? { ...r, name: 'WO-001-改' } : r)) })
    expect(w.find('.acts').text()).toBe('WO-001-改')
    const exposed = (w.vm as unknown as { selectedRows: Row[] }).selectedRows
    expect(exposed.map((r) => r.name)).toEqual(['WO-001-改'])
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

describe('ChptTable：多層表頭', () => {
  /** 序號 | DutInfo(Bump, Net) | 量測(電阻(Min, Max), 判定) —— 三層 */
  const grouped = [
    { key: 'seq', title: '序號', align: 'left' as const },
    { title: 'DutInfo', children: [{ key: 'bump', title: 'Die.Bump', align: 'right' as const }, { key: 'net', title: 'Die.NetName' }] },
    {
      title: '量測',
      children: [
        { title: '電阻', children: [{ key: 'min', title: 'Min', sortType: 'number' as const }, { key: 'max', title: 'Max' }] },
        { key: 'judge', title: '判定' },
      ],
    },
  ]
  const data = [
    { id: 1, seq: 1, bump: 'B2', net: 'VDD', min: 3, max: 5, judge: 'OK' },
    { id: 2, seq: 2, bump: 'B1', net: 'VSS', min: 1, max: 9, judge: 'NG' },
  ]
  const headerRows = (w: VueWrapper) => w.findAll('thead tr')
  const cellsOf = (w: VueWrapper, r: number) =>
    headerRows(w)[r].findAll('th').map((th) => ({
      text: th.text(),
      colspan: th.attributes('colspan'),
      rowspan: th.attributes('rowspan'),
      scope: th.attributes('scope'),
    }))

  it('依 children 排出多列表頭：群組欄 colspan 是葉欄數，葉欄 rowspan 延伸到最後一層', () => {
    const w = mountTable({ columns: grouped, data })
    expect(headerRows(w)).toHaveLength(3)
    expect(cellsOf(w, 0)).toEqual([
      { text: '序號', colspan: undefined, rowspan: '3', scope: 'col' },
      { text: 'DutInfo', colspan: '2', rowspan: undefined, scope: 'colgroup' },
      { text: '量測', colspan: '3', rowspan: undefined, scope: 'colgroup' },
    ])
    expect(cellsOf(w, 1)).toEqual([
      { text: 'Die.Bump', colspan: undefined, rowspan: '2', scope: 'col' },
      { text: 'Die.NetName', colspan: undefined, rowspan: '2', scope: 'col' },
      { text: '電阻', colspan: '2', rowspan: undefined, scope: 'colgroup' },
      { text: '判定', colspan: undefined, rowspan: '2', scope: 'col' },
    ])
    expect(cellsOf(w, 2).map((c) => c.text)).toEqual(['Min', 'Max'])
  })

  it('資料列只畫葉欄，順序由左到右', () => {
    const w = mountTable({ columns: grouped, data })
    expect(bodyRows(w)[0].findAll('td').map((td) => td.text())).toEqual(['1', 'B2', 'VDD', '3', '5', 'OK'])
  })

  it('群組欄不能排序；葉欄照常排序（不論在第幾層）', async () => {
    const w = mountTable({ columns: grouped, data })
    const group = headerRows(w)[0].findAll('th')[1]
    expect(group.attributes('tabindex')).toBeUndefined()
    expect(group.attributes('aria-sort')).toBeUndefined()
    await group.trigger('click')
    expect(w.emitted('sort')).toBeUndefined()
    const min = headerRows(w)[2].findAll('th')[0]
    await min.trigger('click')
    expect(min.attributes('aria-sort')).toBe('ascending')
    expect(bodyRows(w)[0].findAll('td')[0].text()).toBe('2')
    expect(min.find('.sort-indicator').classes()).toContain('is-asc')
  })

  it('align：表頭與儲存格一起對齊；沒指定的維持置中', () => {
    const w = mountTable({ columns: grouped, data })
    const seq = headerRows(w)[0].findAll('th')[0]
    expect(seq.find('div').classes()).toContain('justify-start')
    const bump = headerRows(w)[1].findAll('th')[0]
    expect(bump.find('div').classes()).toContain('justify-end')
    const tds = bodyRows(w)[0].findAll('td')
    expect(tds[0].attributes('style')).toContain('text-align: left')
    expect(tds[1].attributes('style')).toContain('text-align: right')
    expect(tds[2].attributes('style') ?? '').not.toContain('text-align')
    expect(headerRows(w)[1].findAll('th')[1].find('div').classes()).toContain('justify-center')
  })

  it('勾選、展開與填充欄在多層表頭時橫跨所有表頭列；空資料的 colspan 只算葉欄', () => {
    const w = mountTable({ columns: grouped, data: [], selectable: true, resizable: true }, { expand: '<p>明細</p>' })
    const first = headerRows(w)[0].findAll('th')
    expect(first[0].attributes('rowspan')).toBe('3') // 展開
    expect(first[1].attributes('rowspan')).toBe('3') // 勾選
    expect(first.at(-1)!.classes()).toContain('filler-col')
    expect(first.at(-1)!.attributes('rowspan')).toBe('3')
    // 6 個葉欄 + 展開 + 勾選 + 填充欄
    expect(w.find('tbody td').attributes('colspan')).toBe('9')
    // 欄寬把手只在葉欄上
    expect(w.findAll('thead [role="separator"]')).toHaveLength(6)
  })

  it('分隔線：表格最左邊那格不畫，其餘都畫（包含第二層最左邊、但不在表格左緣的格子）', () => {
    const w = mountTable({ columns: grouped, data })
    expect(headerRows(w)[0].findAll('th')[0].classes()).not.toContain('has-divider')
    expect(headerRows(w)[1].findAll('th')[0].classes()).toContain('has-divider')
    w.unmount()
    const leftGroup = mountTable({ columns: [{ title: 'G', children: [{ key: 'a', title: 'A' }, { key: 'b', title: 'B' }] }], data: [{ a: 1, b: 2 }] })
    expect(leftGroup.findAll('thead tr')[1].findAll('th').map((th) => th.classes().includes('has-divider'))).toEqual([false, true])
  })

  it('沒有 children 時與原本一樣只有一列表頭', () => {
    const w = mountTable()
    expect(headerRows(w)).toHaveLength(1)
    expect(headerRows(w)[0].findAll('th').every((th) => th.attributes('rowspan') === undefined)).toBe(true)
  })

  it('headerProps（同 Vuetify）：綁到 <th>；有顏色 class 時取代預設的表頭顏色，沒有就沿用', () => {
    const colored = [
      { title: 'DutInfo', children: [{ key: 'bump', title: 'Die.Bump', headerProps: { title: '凸塊編號', class: 'text-xs' } }] },
      {
        title: '量測',
        headerProps: { class: 'bg-success-subtle text-success-on-subtle', 'data-group': 'measure' },
        children: [
          { key: 'min', title: 'Min', headerProps: { class: ['text-danger'] } },
          { key: 'max', title: 'Max', headerProps: { style: { backgroundColor: 'pink', color: 'black' } } },
        ],
      },
    ]
    const w = mountTable({ columns: colored, data })
    const [dut, measure] = headerRows(w)[0].findAll('th')
    expect(dut.classes()).toEqual(expect.arrayContaining(['text-accent', 'bg-gradient-to-b', 'from-accent-subtle']))
    expect(measure.classes()).toEqual(expect.arrayContaining(['text-success-on-subtle', 'bg-success-subtle']))
    expect(measure.classes()).not.toContain('bg-gradient-to-b')
    expect(measure.classes()).not.toContain('text-accent')
    expect(measure.attributes('data-group')).toBe('measure')
    // 原本的 class 與屬性仍在（scope、分隔線）
    expect(measure.attributes('scope')).toBe('colgroup')
    expect(measure.classes()).toContain('has-divider')
    const [bump, min, max] = headerRows(w)[1].findAll('th')
    // text-xs 不是顏色：仍用預設的文字色與底色
    expect(bump.classes()).toEqual(expect.arrayContaining(['text-xs', 'text-content-primary', 'bg-gradient-to-b']))
    expect(bump.attributes('title')).toBe('凸塊編號')
    expect(min.classes()).toContain('text-danger')
    expect(min.classes()).not.toContain('text-content-primary')
    expect(max.classes()).not.toContain('bg-gradient-to-b')
    expect(max.classes()).not.toContain('text-content-primary')
    expect(max.attributes('style')).toContain('background-color: pink')
  })

  it('headerProps 的 style 字串、class 物件也認得；aria-sort、tabindex 不會被蓋掉', async () => {
    const cols = [
      { key: 'a', title: 'A', headerProps: { style: 'background: red', tabindex: -1, 'aria-sort': 'other' } },
      { key: 'b', title: 'B', headerProps: { class: { 'text-success': true, 'bg-danger': false } } },
    ]
    const w = mountTable({ columns: cols, data: [{ a: 1, b: 2 }] })
    const [a, b] = headerRows(w)[0].findAll('th')
    expect(a.classes()).not.toContain('bg-gradient-to-b')
    expect(a.attributes('tabindex')).toBe('0')
    expect(a.attributes('aria-sort')).toBe('none')
    expect(b.classes()).toContain('text-success')
    expect(b.classes()).toContain('bg-gradient-to-b')
    // 排序中一律用強調色
    await b.trigger('click')
    expect(b.classes()).toContain('text-accent')
  })

  it('cellProps（同 Vuetify）：物件或依列決定的函式', () => {
    const cols = [
      { key: 'seq', title: '序號', cellProps: { class: 'font-mono' } },
      { key: 'judge', title: '判定', cellProps: ({ value, index }: { value: unknown; index: number }) => ({ class: value === 'NG' ? 'text-danger' : '', 'data-i': index }) },
    ]
    const w = mountTable({ columns: cols, data })
    const rows = bodyRows(w)
    expect(rows[0].findAll('td')[0].classes()).toContain('font-mono')
    expect(rows[1].findAll('td')[1].classes()).toContain('text-danger')
    expect(rows[0].findAll('td')[1].classes()).not.toContain('text-danger')
    expect(rows[1].findAll('td')[1].attributes('data-i')).toBe('1')
  })

  it('color：整欄的表頭與儲存格一起變色；群組的顏色傳給底下的欄位，子欄位可以另外指定', () => {
    const cols = [
      { key: 'seq', title: '序號' },
      {
        title: '量測',
        color: 'success' as const,
        children: [
          { title: '電阻', children: [{ key: 'min', title: 'Min' }] },
          { key: 'judge', title: '判定', color: 'danger' as const },
        ],
      },
    ]
    const w = mountTable({ columns: cols, data })
    const [seq, measure] = headerRows(w)[0].findAll('th')
    expect(seq.classes()).toContain('bg-gradient-to-b')
    expect(measure.classes()).toEqual(expect.arrayContaining(['tone-bg-success', 'tone-text-success']))
    expect(measure.classes()).not.toContain('bg-gradient-to-b')
    expect(measure.classes()).not.toContain('text-accent')
    const [resist, judge] = headerRows(w)[1].findAll('th')
    expect(resist.classes()).toContain('tone-bg-success')
    expect(judge.classes()).toEqual(expect.arrayContaining(['tone-bg-danger', 'tone-text-danger']))
    expect(headerRows(w)[2].findAll('th')[0].classes()).toEqual(expect.arrayContaining(['tone-bg-success', 'tone-text-success']))
    const tds = bodyRows(w)[0].findAll('td')
    expect(tds[0].classes().some((c) => c.startsWith('tone-cell-'))).toBe(false)
    expect(tds[1].classes()).toContain('tone-cell-success')
    expect(tds[2].classes()).toContain('tone-cell-danger')
  })

  it('color 與 headerProps 同時有時，headerProps 的顏色優先；cellProps 的 class 與顏色並存', () => {
    const cols = [
      { key: 'min', title: 'Min', color: 'info' as const, headerProps: { class: 'bg-warning-subtle' }, cellProps: { class: 'font-mono' } },
    ]
    const w = mountTable({ columns: cols, data })
    const th = headerRows(w)[0].findAll('th')[0]
    expect(th.classes()).toContain('bg-warning-subtle')
    expect(th.classes()).not.toContain('tone-bg-info')
    // 文字色沒被 headerProps 指定：仍用 color 的
    expect(th.classes()).toContain('tone-text-info')
    expect(bodyRows(w)[0].find('td').classes()).toEqual(expect.arrayContaining(['font-mono', 'tone-cell-info']))
  })

  it("align 用 Vuetify 的 start / end，也接受 left / right", () => {
    const cols = [
      { key: 'seq', title: '序號', align: 'start' as const },
      { key: 'judge', title: '判定', align: 'end' as const },
      { key: 'net', title: 'Net', align: 'center' as const },
    ]
    const w = mountTable({ columns: cols, data })
    const ths = headerRows(w)[0].findAll('th')
    expect(ths.map((th) => th.find('div').classes().find((c) => c.startsWith('justify-')))).toEqual(['justify-start', 'justify-end', 'justify-center'])
    const tds = bodyRows(w)[0].findAll('td')
    expect(tds.map((td) => td.attributes('style'))).toEqual(['text-align: left;', 'text-align: right;', 'text-align: center;'])
  })

  it('多欄排序時標出優先順序', async () => {
    const w = mountTable({ columns: grouped, data })
    await headerRows(w)[1].findAll('th')[0].trigger('click')
    await headerRows(w)[2].findAll('th')[0].trigger('click')
    expect(headerRows(w)[2].findAll('th')[0].find('.sort-order').text()).toBe('2')
    expect(headerRows(w)[1].findAll('th')[0].find('.sort-order').text()).toBe('1')
  })
})
