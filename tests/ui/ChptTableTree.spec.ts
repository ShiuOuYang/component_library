import { afterEach, describe, expect, it } from 'vitest'
import { nextTick, toRaw } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptTable from '@/components/library/ui/ChptTable.vue'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

/** BOM：成品 → 半成品 → 零件 */
const bom = () => [
  {
    id: 'A',
    part: 'A-主機板組',
    qty: 1,
    children: [
      { id: 'A1', part: 'A1-PCB', qty: 1 },
      {
        id: 'A2',
        part: 'A2-電源模組',
        qty: 2,
        children: [
          { id: 'A2a', part: 'A2a-電容', qty: 8 },
          { id: 'A2b', part: 'A2b-電感', qty: 3 },
        ],
      },
    ],
  },
  { id: 'B', part: 'B-機殼', qty: 1, children: [{ id: 'B1', part: 'B1-螺絲', qty: 12 }] },
  { id: 'C', part: 'C-說明書', qty: 1 },
]

const columns = [
  { key: 'part', title: '料號', sortable: true },
  { key: 'qty', title: '用量', sortable: true, sortType: 'number' },
]

async function mountTree(props: Record<string, unknown> = {}) {
  wrapper = mount(ChptTable, { props: { tree: true, data: bom(), columns, defaultPageSize: 10, ...props }, attachTo: document.body })
  await nextTick()
  return wrapper
}

/** 第一欄的文字（去掉展開鈕的圖示字） */
const visibleParts = (w: VueWrapper) => w.findAll('tbody tr.data-row').map((tr) => tr.findAll('td')[0].text().replace('chevron_right', '').trim())
const toggleOf = (w: VueWrapper, part: string) => w.findAll('tbody tr.data-row').find((tr) => tr.text().includes(part))!.find('button.tree-toggle')

describe('ChptTable 樹狀資料', () => {
  it('預設只顯示最上層；有子列的有展開鈕，沒有的保留同寬空白對齊', async () => {
    const w = await mountTree()
    expect(visibleParts(w)).toEqual(['A-主機板組', 'B-機殼', 'C-說明書'])
    expect(toggleOf(w, 'A-主機板組').exists()).toBe(true)
    expect(toggleOf(w, 'A-主機板組').attributes('aria-expanded')).toBe('false')
    const c = w.findAll('tbody tr.data-row')[2]
    expect(c.find('button.tree-toggle').exists()).toBe(false)
    expect(c.find('.tree-toggle-spacer').exists()).toBe(true)
  })

  it('展開 / 收合；子列依層級縮排並帶 aria-level；送出 update:treeExpandedKeys', async () => {
    const w = await mountTree()
    await toggleOf(w, 'A-主機板組').trigger('click')
    expect(visibleParts(w)).toEqual(['A-主機板組', 'A1-PCB', 'A2-電源模組', 'B-機殼', 'C-說明書'])
    await toggleOf(w, 'A2-電源模組').trigger('click')
    expect(visibleParts(w)).toEqual(['A-主機板組', 'A1-PCB', 'A2-電源模組', 'A2a-電容', 'A2b-電感', 'B-機殼', 'C-說明書'])
    const capRow = w.findAll('tbody tr.data-row')[3]
    expect(capRow.attributes('aria-level')).toBe('3')
    // 樹狀表格用 treegrid 角色；有子列的列標出展開狀態
    expect(w.find('table').attributes('role')).toBe('treegrid')
    const rowOf = (part: string) => w.findAll('tbody tr.data-row').find((tr) => tr.text().includes(part))!
    expect(rowOf('A2-電源模組').attributes('aria-expanded')).toBe('true')
    expect(rowOf('B-機殼').attributes('aria-expanded')).toBe('false') // 有子項目、收合
    expect(rowOf('C-說明書').attributes('aria-expanded')).toBeUndefined() // 葉節點沒有 aria-expanded
    expect((capRow.find('.tree-cell').element as HTMLElement).style.paddingLeft).toBe('32px')
    expect(w.emitted('update:treeExpandedKeys')!.at(-1)![0]).toEqual(['A', 'A2'])
    // 收合父層：孫層也一起收起來（展開狀態保留，再展開時恢復）
    await toggleOf(w, 'A-主機板組').trigger('click')
    expect(visibleParts(w)).toEqual(['A-主機板組', 'B-機殼', 'C-說明書'])
    await toggleOf(w, 'A-主機板組').trigger('click')
    expect(visibleParts(w)).toContain('A2a-電容')
  })

  it('defaultExpandAll 與受控的 treeExpandedKeys', async () => {
    const w = await mountTree({ defaultExpandAll: true })
    expect(visibleParts(w)).toHaveLength(8)
    await w.setProps({ treeExpandedKeys: ['B'] })
    expect(visibleParts(w)).toEqual(['A-主機板組', 'B-機殼', 'B1-螺絲', 'C-說明書'])
  })

  it('排序在同一層的兄弟之間，不打亂父子關係', async () => {
    const w = await mountTree({ defaultExpandAll: true })
    await w.findAll('thead th[data-leaf]')[1].trigger('click') // 用量 升冪
    await w.findAll('thead th[data-leaf]')[1].trigger('click') // 降冪
    const parts = visibleParts(w)
    // 最上層：A、B、C 用量都是 1（維持原順序）；A 的子層依用量降冪：A2(2) 在 A1(1) 前；A2 的子層：電容(8) 在 電感(3) 前
    expect(parts.indexOf('A2-電源模組')).toBeLessThan(parts.indexOf('A1-PCB'))
    expect(parts.indexOf('A2a-電容')).toBeLessThan(parts.indexOf('A2b-電感'))
    expect(parts.indexOf('A2a-電容')).toBeGreaterThan(parts.indexOf('A2-電源模組'))
    expect(parts.indexOf('A1-PCB')).toBeLessThan(parts.indexOf('B-機殼'))
  })

  it('搜尋：保留符合的列與它的上層，並自動展開；清除後恢復原本的展開狀態', async () => {
    const w = await mountTree()
    const input = w.find('input[type="text"]')
    await input.setValue('電感')
    await input.trigger('keyup.enter')
    expect(visibleParts(w)).toEqual(['A-主機板組', 'A2-電源模組', 'A2b-電感'])
    await input.setValue('')
    await nextTick()
    expect(visibleParts(w)).toEqual(['A-主機板組', 'B-機殼', 'C-說明書'])
  })

  it('分頁以最上層計算，子列跟著父列', async () => {
    const w = await mountTree({ defaultPageSize: 2, defaultExpandAll: true })
    expect(visibleParts(w)).toEqual(['A-主機板組', 'A1-PCB', 'A2-電源模組', 'A2a-電容', 'A2b-電感', 'B-機殼', 'B1-螺絲'])
    expect(w.text()).toContain('共 3 筆')
  })

  it('勾選：子列也可以勾，全選本頁包含展開的子列；selectedRows 是原本的物件', async () => {
    const data = bom()
    const w = await mountTree({ data, selectable: true, defaultExpandAll: true })
    await w.find('thead input[type="checkbox"]').setValue(true)
    const keys = w.emitted('update:selectedKeys')!.at(-1)![0] as string[]
    expect(keys).toEqual(['A', 'A1', 'A2', 'A2a', 'A2b', 'B', 'B1', 'C'])
    // 同一個物件（測試工具把 props 包成 reactive，比對原始物件）
    const rows = (w.vm as unknown as { selectedRows: object[] }).selectedRows.map((r) => toRaw(r))
    expect(rows).toContain(data[0].children![1])
  })

  it('expandAllTree / collapseAllTree', async () => {
    const w = await mountTree()
    const vm = w.vm as unknown as { expandAllTree: () => void; collapseAllTree: () => void }
    vm.expandAllTree()
    await nextTick()
    expect(visibleParts(w)).toHaveLength(8)
    vm.collapseAllTree()
    await nextTick()
    expect(visibleParts(w)).toHaveLength(3)
  })

  it('搭配虛擬捲動：攤平後的列都算在捲動範圍裡', async () => {
    const big = Array.from({ length: 50 }, (_, i) => ({ id: `P${i}`, part: `P${i}`, qty: 1, children: [{ id: `P${i}-c`, part: `P${i}-c`, qty: 2 }] }))
    const w = await mountTree({ data: big, virtual: true, defaultExpandAll: true, rowHeight: 32 })
    const spacer = w.findAll('tbody tr.virtual-spacer').at(-1)!.find('td').element as HTMLElement
    const rendered = w.findAll('tbody tr.data-row').length
    expect(parseFloat(spacer.style.height) / 32 + rendered).toBe(100)
  })

  it('沒開 tree 時 children 欄位照一般資料處理', async () => {
    const w = await mountTree({ tree: false })
    expect(w.find('.tree-cell').exists()).toBe(false)
    expect(visibleParts(w)).toEqual(['A-主機板組', 'B-機殼', 'C-說明書'])
  })
})
