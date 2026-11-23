import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptPivotTable from '@/components/library/ui/ChptPivotTable.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { PivotConfig, PivotField, PivotRecord } from '@/components/library/shared/pivot'

const data: PivotRecord[] = [
  { plant: '一廠', line: 'L1', month: '08', qty: 5, cost: 100 },
  { plant: '一廠', line: 'L1', month: '09', qty: 3, cost: 60 },
  { plant: '一廠', line: 'L2', month: '08', qty: 2, cost: 40 },
  { plant: '二廠', line: 'L5', month: '09', qty: 10, cost: 200 },
]
const fields: PivotField[] = [
  { key: 'plant', label: '廠區', order: ['一廠', '二廠'] },
  { key: 'line', label: '產線' },
  { key: 'month', label: '月份' },
  { key: 'qty', label: '數量', kind: 'measure' },
  { key: 'cost', label: '金額', kind: 'measure', format: (v) => `$${v}` },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

function words(el: Element): string {
  const out: string[] = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const t = walker.currentNode.textContent!.replace(/\s+/g, ' ').trim()
    if (t) out.push(t)
  }
  return out.join(' ')
}

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const config = ref<PivotConfig>((props.config as PivotConfig) ?? { rows: ['plant', 'line'], cols: ['month'], values: [{ field: 'qty', agg: 'sum' }] })
  const node = () =>
    h(ChptPivotTable, {
      data,
      fields,
      ...props,
      config: config.value,
      'onUpdate:config': (v: PivotConfig) => (config.value = v),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const body = () => w.findAll('tbody tr, tfoot tr').map((r) => words(r.element))
  const head = () => w.findAll('thead tr').map((r) => words(r.element))
  const zone = (label: string) => w.find(`section[aria-label="${label}"]`)
  const btn = (label: string) => w.findAll('button').find((b) => b.attributes('aria-label') === label || b.text() === label || b.text().endsWith(label))!
  return { w, config, body, head, zone, btn, comp: () => w.findComponent(ChptPivotTable) }
}

describe('ChptPivotTable', () => {
  it('表頭、列（小計、展開）、總計欄與總計列', () => {
    const { head, body, w } = mountIt()
    expect(head()).toEqual(['廠區 / 產線 08 09 總計'])
    expect(body()).toEqual([
      'chevron_right 一廠 7 3 10',
      'L1 5 3 8',
      'L2 2 2',
      'chevron_right 二廠 10 10',
      'L5 10 10',
      '總計 7 13 20',
    ])
    expect(w.text()).toContain('4 筆資料 · 3 列 × 2 欄')
  })

  it('展開 / 收合單一列、全部收合 / 展開；defaultExpandDepth', async () => {
    const { w, body, btn } = mountIt()
    const toggle = w.find('tbody button[aria-expanded]')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(body()).toHaveLength(4)
    await btn('全部收合').trigger('click')
    expect(body()).toHaveLength(3)
    await btn('全部展開').trigger('click')
    expect(body()).toHaveLength(6)
    expect(mountIt({ defaultExpandDepth: 1 }).body()).toHaveLength(3)
  })

  it('多個值：值名稱表頭、格式；多層欄合併標題', () => {
    const { head, body } = mountIt({
      config: { rows: ['plant'], cols: ['month', 'line'], values: [{ field: 'qty', agg: 'sum' }, { field: 'cost', agg: 'avg' }] },
    })
    expect(head()).toEqual([
      '廠區 08 09 總計',
      'L1 L2 L1 L5',
      '數量（加總） 金額（平均） 數量（加總） 金額（平均） 數量（加總） 金額（平均） 數量（加總） 金額（平均） 數量（加總） 金額（平均）',
    ])
    expect(body()[0]).toBe('一廠 5 $100 2 $40 3 $60 10 $66.66666666666667')
  })

  it('沒有欄：只有值的欄；沒有列：一列總計', () => {
    expect(mountIt({ config: { rows: ['plant'], cols: [], values: [{ field: 'qty', agg: 'count' }] } }).body()).toEqual(['一廠 3', '二廠 1', '總計 4'])
    const noRows = mountIt({ config: { rows: [], cols: ['month'], values: [{ field: 'qty', agg: 'sum' }] } })
    expect(noRows.body()).toEqual(['總計 7 13 20'])
    expect(noRows.head()[0]).toContain('總計')
  })

  it('沒有值、沒有資料時的提示', () => {
    expect(mountIt({ config: { rows: ['plant'], cols: [], values: [] } }).w.text()).toContain('把欄位拖到「值」開始分析')
    expect(mountIt({ data: [] }).w.text()).toContain('沒有資料')
  })

  it('欄位設定：可用欄位按鈕加到列 / 欄 / 值；數值欄位只能加到值', async () => {
    const { zone, btn, config } = mountIt({ config: { rows: [], cols: [], values: [] } })
    expect(zone('可用欄位').text()).toContain('廠區')
    expect(btn('把「數量」加到列')).toBeUndefined()
    await btn('把「廠區」加到列').trigger('click')
    await btn('把「月份」加到欄').trigger('click')
    await btn('把「數量」加到值').trigger('click')
    await btn('把「產線」加到值').trigger('click')
    expect(config.value).toEqual({
      rows: ['plant'],
      cols: ['month'],
      values: [{ field: 'qty', agg: 'sum' }, { field: 'line', agg: 'count' }],
    })
  })

  it('區內排序、移除、彙總方式（分組欄位只能計數）', async () => {
    const { btn, config, w } = mountIt({ config: { rows: ['plant', 'line'], cols: [], values: [{ field: 'qty', agg: 'sum' }, { field: 'line', agg: 'count' }] } })
    expect(btn('「廠區」往前移').attributes('disabled')).toBeDefined()
    await btn('「廠區」往後移').trigger('click')
    expect(config.value.rows).toEqual(['line', 'plant'])
    await btn('移除「產線」').trigger('click')
    expect(config.value.rows).toEqual(['plant'])
    const selects = w.findAll('select')
    expect(selects[0].findAll('option')).toHaveLength(6)
    expect(selects[1].findAll('option').map((o) => o.text())).toEqual(['計數', '不重複計數'])
    await selects[0].setValue('max')
    expect(config.value.values[0].agg).toBe('max')
    // 值也能排序與移除
    await w.findAll('section[aria-label="值"] button').find((b) => b.attributes('aria-label') === '「數量」往後移')!.trigger('click')
    expect(config.value.values.map((v) => v.field)).toEqual(['line', 'qty'])
    await w.findAll('section[aria-label="值"] button').find((b) => b.attributes('aria-label') === '移除「數量」')!.trigger('click')
    expect(config.value.values).toEqual([{ field: 'line', agg: 'count' }])
  })

  it('拖曳：在區之間移動；數值欄位不能放到列；從值拖走就是移除', async () => {
    const { zone, config } = mountIt({ config: { rows: ['plant'], cols: [], values: [{ field: 'qty', agg: 'sum' }] } })
    const drag = async (fromZone: string, label: string, toZone: string) => {
      const chip = zone(fromZone).findAll('li').find((li) => li.text().includes(label))!
      const dt = { setData: vi.fn(), effectAllowed: '' }
      await chip.trigger('dragstart', { dataTransfer: dt })
      await zone(toZone).trigger('dragover')
      await zone(toZone).trigger('drop')
      await chip.trigger('dragend')
    }
    await drag('可用欄位', '月份', '欄')
    expect(config.value.cols).toEqual(['month'])
    await drag('列', '廠區', '欄')
    expect(config.value).toMatchObject({ rows: [], cols: ['month', 'plant'] })
    await drag('可用欄位', '金額', '列')
    expect(config.value.rows).toEqual([])
    await drag('可用欄位', '金額', '值')
    expect(config.value.values.map((v) => v.field)).toEqual(['qty', 'cost'])
    await drag('值', '數量', '可用欄位')
    expect(config.value.values.map((v) => v.field)).toEqual(['cost'])
    await drag('欄', '廠區', '可用欄位')
    expect(config.value.cols).toEqual(['month'])
    // 拖到同一區：不動
    await drag('欄', '月份', '欄')
    expect(config.value.cols).toEqual(['month'])
    // 從值拖到列（分組欄位的計數值）
    config.value = { rows: [], cols: [], values: [{ field: 'line', agg: 'count' }] }
    await nextTick()
    await drag('值', '產線', '列')
    expect(config.value).toEqual({ rows: ['line'], cols: [], values: [] })
    // 沒有 dragstart 的 drop 不做事
    await zone('列').trigger('drop')
    await zone('列').trigger('dragleave')
  })

  it('設定面板可收起', async () => {
    const { w, btn } = mountIt()
    const toggle = btn('欄位設定')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(w.find('section[aria-label="列"]').exists()).toBe(false)
    expect(mountIt({ configurable: false }).w.find('section').exists()).toBe(false)
  })

  it('熱度：只有最後一層的列、非總計欄上色', async () => {
    const { w } = mountIt({ heatmap: true })
    const cells = w.findAll('tbody td')
    const styled = cells.filter((c) => (c.element as HTMLElement).style.background.includes('color-mix'))
    expect(styled.length).toBe(4) // L1×2、L2×1、L5×1
    // 最大值是 L5 的 10；L1 / 08 = 5 → 5 / 10 × 45% ≈ 23%
    expect((cells[3].element as HTMLElement).style.background).toContain('23%')
  })

  it('點一格：送出 cell-click（總計列 rowPath 為 []、總計欄 colKey 為 null）', async () => {
    const { w, comp } = mountIt()
    await w.findAll('tbody td')[3].trigger('click')
    await w.findAll('tfoot td')[2].trigger('click')
    expect(comp().emitted('cell-click')).toEqual([
      [{ rowPath: ['一廠', 'L1'], colKey: ['08'], value: { field: 'qty', agg: 'sum' }, result: 5 }],
      [{ rowPath: [], colKey: null, value: { field: 'qty', agg: 'sum' }, result: 20 }],
    ])
  })

  it('匯出 CSV：最後一層的列與總計', async () => {
    const blobs: Blob[] = []
    // jsdom 沒有 createObjectURL
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (b: Blob) => (blobs.push(b), 'blob:x') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { btn } = mountIt()
    await btn('匯出 CSV').trigger('click')
    const text = await blobs[0].text()
    expect(text.replace(/^\uFEFF/, '').split('\r\n')).toEqual(['廠區,產線,08 / 數量（加總）,09 / 數量（加總）,總計 / 數量（加總）', '一廠,L1,5,3,8', '一廠,L2,2,,2', '二廠,L5,,10,10', '總計,,7,13,20'])
  })

  it('列很多時只畫看得到的部分', async () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ id: `R${i}`, qty: i }))
    const { w } = mountIt({ data: many, fields: [{ key: 'id', label: 'ID' }, { key: 'qty', label: 'Q', kind: 'measure' }], config: { rows: ['id'], cols: [], values: [{ field: 'qty', agg: 'sum' }] }, maxHeight: 320 })
    const rendered = () => w.findAll('tbody tr').filter((r) => !r.attributes('aria-hidden'))
    expect(rendered().length).toBeLessThan(100)
    const scroller = w.find('.overflow-auto').element as HTMLElement
    scroller.scrollTop = 32 * 300
    await w.find('.overflow-auto').trigger('scroll')
    expect(words(rendered()[0].element)).not.toContain('R0 ')
    // 不限高度時全部畫
    const all = mountIt({ data: many, fields: [{ key: 'id', label: 'ID' }, { key: 'qty', label: 'Q', kind: 'measure' }], config: { rows: ['id'], cols: [], values: [{ field: 'qty', agg: 'sum' }] }, maxHeight: 0 })
    expect(all.w.findAll('tbody tr')).toHaveLength(500)
  })

  it('外部改 config 時跟著變；空白分組顯示（空白）', async () => {
    const { config, body } = mountIt({ data: [...data, { plant: null, line: 'X', month: '08', qty: 1 }] })
    config.value = { rows: ['plant'], cols: [], values: [{ field: 'qty', agg: 'sum' }] }
    await nextTick()
    expect(body()).toEqual(['一廠 10', '二廠 10', '（空白） 1', '總計 21'])
  })

  it('英文語系', () => {
    const { head, w } = mountIt({ config: { rows: ['plant'], cols: [], values: [{ field: 'qty', agg: 'sum' }] } }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(head()[0]).toBe('廠區 Sum of 數量')
    expect(w.text()).toContain('Grand total')
  })
})
