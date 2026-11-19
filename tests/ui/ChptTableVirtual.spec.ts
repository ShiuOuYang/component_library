import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptTable from '@/components/library/ui/ChptTable.vue'

/**
 * jsdom 不做版面：clientHeight 一律是 0。
 * 把虛擬捲動的捲動容器（overflow-y-auto）當成 320px 高，其餘維持 0。
 */
const VIEWPORT = 320
let original: PropertyDescriptor | undefined
beforeAll(() => {
  original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('overflow-y-auto') ? VIEWPORT : 0
    },
  })
})
afterAll(() => {
  if (original) Object.defineProperty(HTMLElement.prototype, 'clientHeight', original)
})

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

const columns = [
  { key: 'id', title: 'ID' },
  { key: 'name', title: '名稱' },
]
const makeRows = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ id: from + i, name: `料號-${from + i}` }))

function mountTable(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  wrapper = mount(ChptTable, {
    props: { columns, data: makeRows(10_000), virtual: true, rowHeight: 32, overscan: 4, ...props },
    slots,
    attachTo: document.body,
  })
  return wrapper
}

const scroller = (w: VueWrapper) => w.find('.overflow-y-auto').element as HTMLElement
const dataRows = (w: VueWrapper) => w.findAll('tbody tr.data-row')
const spacers = (w: VueWrapper) => w.findAll('tbody tr.virtual-spacer')

async function scrollTo(w: VueWrapper, top: number) {
  scroller(w).scrollTop = top
  await w.find('.overflow-y-auto').trigger('scroll')
  await nextTick()
}

describe('ChptTable 虛擬捲動', () => {
  it('只畫可視範圍加上 overscan 的列；上下空白列撐出完整高度', async () => {
    const w = mountTable()
    await nextTick() // 掛載後才量得到捲動容器的高度
    // 320px / 32px = 10 列可見，+1 列跨界、+4 overscan
    expect(dataRows(w).length).toBe(15)
    expect(dataRows(w)[0].text()).toContain('料號-0')
    const bottom = spacers(w).at(-1)!.find('td').element as HTMLElement
    expect(bottom.style.height).toBe(`${(10_000 - 15) * 32}px`)
    // 每列固定高度
    expect((dataRows(w)[0].element as HTMLElement).style.height).toBe('32px')
  })

  it('捲動後換成新的範圍；上方空白列高度等於前面跳過的列', async () => {
    const w = mountTable()
    await scrollTo(w, 3_200) // 第 100 列在最上面
    const rows = dataRows(w)
    expect(rows[0].text()).toContain('料號-96') // 100 - overscan 4
    expect(rows.at(-1)!.text()).toContain('料號-114')
    const top = spacers(w)[0].find('td').element as HTMLElement
    expect(top.style.height).toBe(`${96 * 32}px`)
  })

  it('斑馬紋依絕對列序：資料列在 DOM 裡的奇偶不隨捲動改變', async () => {
    const w = mountTable()
    const parityOk = () =>
      dataRows(w).every((row) => {
        const abs = Number(row.find('td').text())
        const pos = [...row.element.parentElement!.children].indexOf(row.element) + 1
        return (pos % 2 === 0) === (abs % 2 === 1) // 非虛擬時第 2、4… 列（索引 1、3…）是偶數列
      })
    expect(parityOk()).toBe(true)
    await scrollTo(w, 32 * 37) // 起點變成奇數列
    expect(parityOk()).toBe(true)
    await scrollTo(w, 32 * 38)
    expect(parityOk()).toBe(true)
  })

  it('不分頁：沒有分頁導航，改顯示總筆數', () => {
    const w = mountTable()
    expect(w.find('nav').exists()).toBe(false)
    expect(w.text()).toContain('共 10000 筆')
  })

  it('aria-rowcount / aria-rowindex 讓螢幕閱讀器知道總列數與位置', async () => {
    const w = mountTable()
    expect(w.find('table').attributes('aria-rowcount')).toBe('10001')
    await scrollTo(w, 32 * 500)
    const first = dataRows(w)[0]
    const abs = Number(first.find('td').text())
    expect(first.attributes('aria-rowindex')).toBe(String(abs + 2)) // 1 列表頭 + 1-based
  })

  it('全選是全部資料（不是只有畫出來的列）', async () => {
    const w = mountTable({ selectable: true })
    const all = w.find('thead input[type="checkbox"]')
    expect(all.attributes('aria-label')).toBe('全選')
    await all.setValue(true)
    const emitted = w.emitted('update:selectedKeys')!.at(-1)![0] as unknown[]
    expect(emitted.length).toBe(10_000)
  })

  it('scrollToIndex / scrollToKey', async () => {
    const w = mountTable()
    const vm = w.vm as unknown as { scrollToIndex: (i: number) => void; scrollToKey: (k: number) => boolean }
    vm.scrollToIndex(2_000)
    await nextTick()
    expect(scroller(w).scrollTop).toBe(2_000 * 32)
    expect(dataRows(w).map((r) => r.text()).some((t) => t.includes('料號-2000'))).toBe(true)

    expect(vm.scrollToKey(42)).toBe(true)
    expect(scroller(w).scrollTop).toBe(42 * 32)
    expect(vm.scrollToKey(-1)).toBe(false)

    vm.scrollToIndex(1e9) // 超出範圍夾到最後一列
    expect(scroller(w).scrollTop).toBe(9_999 * 32)
  })

  it('搜尋後回到最上面，並只捲動篩選後的資料', async () => {
    const w = mountTable()
    await scrollTo(w, 32 * 3_000)
    await w.find('input[type="text"]').setValue('料號-99')
    await nextTick()
    expect(scroller(w).scrollTop).toBe(0)
    // 料號-99、990～999、9900～9999 共 111 筆
    expect(w.text()).toContain('共 111 筆')
    expect(dataRows(w)[0].text()).toContain('料號-99')
  })

  it('資料變少時把捲動位置夾回範圍內，不會整片空白', async () => {
    const w = mountTable()
    await scrollTo(w, 32 * 8_000)
    await w.setProps({ data: makeRows(20) })
    await nextTick()
    expect(scroller(w).scrollTop).toBeLessThanOrEqual(20 * 32)
    expect(dataRows(w).length).toBeGreaterThan(0)
  })

  it('reach-bottom：到底只送一次，資料變多後才能再送；loading 時不送', async () => {
    const w = mountTable({ data: makeRows(30) })
    // jsdom 的 scrollHeight 是 0，任何捲動都算「接近底部」
    await scrollTo(w, 100)
    await scrollTo(w, 120)
    expect(w.emitted('reach-bottom')).toHaveLength(1)

    await w.setProps({ data: makeRows(60) })
    await scrollTo(w, 140)
    expect(w.emitted('reach-bottom')).toHaveLength(2)

    await w.setProps({ data: makeRows(90), loading: true })
    await scrollTo(w, 160)
    expect(w.emitted('reach-bottom')).toHaveLength(2)
  })

  it('remote + virtual：畫父層給的資料，總筆數用 total', async () => {
    const w = mountTable({ remote: true, data: makeRows(200), total: 50_000 })
    await nextTick()
    expect(w.text()).toContain('共 50000 筆')
    expect(dataRows(w).length).toBe(15)
  })

  it('展開明細列：高度算進位置（量到之前用估計值），不宣告 aria-rowcount', async () => {
    const w = mountTable({ expandedKeys: [0] }, { expand: ({ item }: { item: { id: number } }) => h('p', `明細 ${item.id}`) })
    expect(w.find('table').attributes('aria-rowcount')).toBeUndefined()
    expect(w.find('tr.expand-row').text()).toContain('明細 0')
    // 第 0 列展開（估計 120px）：總高度 = 10,000 × 32 + 120
    const pads = spacers(w).map((s) => parseFloat((s.find('td').element as HTMLElement).style.height || '0'))
    const rendered = dataRows(w).length * 32 + 120
    expect(pads.reduce((a, b) => a + b, 0) + rendered).toBe(10_000 * 32 + 120)
  })

  it('未開啟 virtual 時維持分頁、不畫空白列', () => {
    const w = mountTable({ virtual: false, defaultPageSize: 10 })
    expect(dataRows(w).length).toBe(10)
    expect(spacers(w).length).toBe(0)
    expect(w.find('nav').exists()).toBe(true)
    expect(w.find('.overflow-y-auto').exists()).toBe(false)
  })
})
