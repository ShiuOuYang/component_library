import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import CorrelationMatrix from '@/components/library/charts/CorrelationMatrix.vue'
import ScatterChart from '@/components/library/charts/ScatterChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

/** a 與 b 完全正相關、c 與 a 負相關、d 是雜訊（不顯著） */
let seed = 7
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const data = Array.from({ length: 30 }, (_, i) => ({ a: i, b: i * 2 + 1, c: 100 - i * 3, d: noise() }))
const fields = [
  { key: 'a', label: 'A' },
  { key: 'd', label: 'D' },
  { key: 'b', label: 'B' },
  { key: 'c', label: 'C' },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
  const clustered = ref(false)
  const method = ref<'pearson' | 'spearman'>('pearson')
  const node = () =>
    h(CorrelationMatrix, {
      data,
      fields,
      ...props,
      clustered: clustered.value,
      method: method.value,
      'onUpdate:clustered': (v: boolean) => (clustered.value = v),
      'onUpdate:method': (v: 'pearson' | 'spearman') => (method.value = v),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const cells = () => w.findAll('td[role="gridcell"]')
  const cellAt = (i: number, j: number) => cells()[i * 4 + j]
  const rowLabels = () => w.findAll('tbody th').map((t) => t.text())
  return { w, cells, cellAt, rowLabels, clustered, method, comp: () => w.findComponent(CorrelationMatrix) }
}

describe('CorrelationMatrix', () => {
  it('格子：r 值、顏色（正 / 負）、對角線、不顯著淡化、aria-label', () => {
    const { cellAt, w } = mountIt({ title: '參數' })
    expect(cellAt(0, 2).text()).toBe('1.00')
    expect(cellAt(0, 2).attributes('style')).toContain('danger-solid')
    expect(cellAt(0, 3).text()).toBe('−1.00')
    expect(cellAt(0, 3).attributes('style')).toContain('chart-1')
    expect(cellAt(0, 0).text()).toBe('')
    expect(cellAt(0, 0).attributes('aria-label')).toBe('A（自己）')
    // 不顯著：不再整格透明（數字會看不清），改成底色只用四成濃度、數字用次要文字色
    expect(cellAt(0, 1).attributes('style')).not.toContain('opacity')
    expect(cellAt(0, 1).find('span').attributes('style')).toContain('content-secondary')
    expect(cellAt(0, 2).attributes('style')).toContain('60%') // |r| = 1 → 上限 60%
    expect(cellAt(0, 2).find('span').attributes('style')).toContain('content-primary')
    expect(cellAt(0, 1).attributes('aria-label')).toContain('（不顯著）')
    expect(cellAt(0, 2).attributes('aria-label')).toBe('A 與 B：r = 1.00，n = 30，p < 0.001')
    expect(w.find('table').attributes('aria-label')).toBe('參數')
    expect(w.text()).toContain('淡色：不顯著（p ≥ 0.05）')
  })

  it('依相關性排序：相關的排在一起，送出 update:clustered', async () => {
    const { w, rowLabels, comp } = mountIt()
    expect(rowLabels()).toEqual(['A', 'D', 'B', 'C'])
    await w.find('[role="switch"]').trigger('click')
    expect(comp().emitted('update:clustered')).toEqual([[true]])
    await nextTick()
    const order = rowLabels()
    expect(order.indexOf('D')).toBe(3)
  })

  it('Spearman 切換', async () => {
    const { w, comp } = mountIt()
    await w.findAll('[role="radio"]')[1].trigger('click')
    expect(comp().emitted('update:method')).toEqual([['spearman']])
  })

  it('點一格：送出 cell-click、下方畫散佈圖、可關閉；點對角線不畫', async () => {
    const { w, cellAt, comp } = mountIt()
    await cellAt(0, 0).trigger('click')
    expect(w.findComponent(ScatterChart).exists()).toBe(false)
    await cellAt(3, 0).trigger('click')
    expect(comp().emitted('cell-click')![1][0]).toMatchObject({ x: 'a', y: 'c', n: 30 })
    expect(w.findComponent(ScatterChart).exists()).toBe(true)
    expect(w.findComponent(ScatterChart).props('data')).toHaveLength(30)
    expect(w.text()).toContain('C 對 A')
    expect(cellAt(3, 0).attributes('aria-selected')).toBe('true')
    await w.findAll('button').find((b) => b.text() === '關閉')!.trigger('click')
    expect(w.findComponent(ScatterChart).exists()).toBe(false)
    // showScatter=false
    const no = mountIt({ showScatter: false })
    await no.cellAt(1, 0).trigger('click')
    expect(no.w.findComponent(ScatterChart).exists()).toBe(false)
  })

  it('鍵盤：方向鍵移動（roving tabindex）、Home / End、Enter 選取', async () => {
    const { w, cellAt } = mountIt()
    const table = w.find('table')
    expect(cellAt(0, 0).attributes('tabindex')).toBe('0')
    await table.trigger('keydown', { key: 'ArrowDown' })
    await table.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(cellAt(1, 1).element)
    await table.trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement).toBe(cellAt(1, 3).element)
    await table.trigger('keydown', { key: 'ArrowRight' }) // 已經在最右
    await table.trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(document.activeElement).toBe(cellAt(1, 0).element)
    await table.trigger('keydown', { key: 'ArrowUp' })
    await table.trigger('keydown', { key: 'ArrowUp' })
    await table.trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(document.activeElement).toBe(cellAt(0, 0).element)
    await table.trigger('keydown', { key: 'ArrowDown' })
    await table.trigger('keydown', { key: 'ArrowDown' })
    await table.trigger('keydown', { key: 'Enter' })
    expect(w.text()).toContain('B 對 A')
    await table.trigger('keydown', { key: 'x' })
    // 說明跟著目前的格子
    expect(w.find('[aria-live="polite"]').text()).toContain('B 與 A')
  })

  it('下三角：上半部沒有內容、不能聚焦；End 停在對角線', async () => {
    const { cellAt, w } = mountIt({ triangle: 'lower' })
    expect(cellAt(0, 2).attributes('tabindex')).toBeUndefined()
    expect(cellAt(0, 2).text()).toBe('')
    expect(cellAt(2, 0).attributes('tabindex')).toBe('-1')
    await w.find('table').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(cellAt(0, 0).element)
    await w.find('table').trigger('keydown', { key: 'ArrowDown' })
    await w.find('table').trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement).toBe(cellAt(1, 1).element)
  })

  it('滑過：說明顯示那一格；離開回到目前的格子', async () => {
    const { w, cellAt } = mountIt()
    await cellAt(2, 3).trigger('mouseenter')
    expect(w.find('[aria-live="polite"]').text()).toContain('B 與 C')
    await cellAt(2, 3).trigger('mouseleave')
    expect(w.find('[aria-live="polite"]').text()).toBe('A（自己）')
  })

  it('alpha=0 不淡化；showValues=false 不顯示數字；格子太小不顯示數字；自訂顏色', () => {
    expect(mountIt({ alpha: 0 }).cellAt(0, 1).attributes('style')).not.toContain('opacity')
    expect(mountIt({ showValues: false }).cellAt(0, 2).text()).toBe('')
    expect(mountIt({ maxCell: 24 }).cellAt(0, 2).text()).toBe('')
    expect(mountIt({ colors: { positive: 'green' } }).cellAt(0, 2).attributes('style')).toContain('green')
  })

  it('資料不足、沒有資料：提示', () => {
    expect(mountIt({ fields: [fields[0]] }).w.text()).toContain('沒有資料')
    expect(mountIt({ data: [], emptyText: '空' }).w.text()).toContain('空')
    const one = mountIt({ data: [{ a: 1, b: 2, c: 3, d: 4 }] })
    expect(one.cellAt(0, 2).attributes('aria-label')).toBe('A 與 B：資料不足（n = 1）')
  })

  it('換欄位時清掉選取；matrix 方法', async () => {
    const f = ref(fields)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
    const w = mount({ render: () => h(CorrelationMatrix, { data, fields: f.value }) }, { attachTo: document.body })
    mounted.push(w)
    await w.findAll('td[role="gridcell"]')[4].trigger('click')
    expect(w.findComponent(ScatterChart).exists()).toBe(true)
    f.value = fields.slice(0, 3)
    await nextTick()
    expect(w.findComponent(ScatterChart).exists()).toBe(false)
    const vm = w.findComponent(CorrelationMatrix).vm as unknown as { matrix: Array<Array<{ r: number | null }>> }
    expect(vm.matrix).toHaveLength(3)
  })

  it('英文語系；隱藏控制項', () => {
    const { cellAt, w } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(cellAt(0, 2).attributes('aria-label')).toBe('A and B: r = 1.00, n = 30, p < 0.001')
    expect(w.text()).toContain('Pearson (linear)')
    expect(mountIt({ showControls: false }).w.find('[role="radiogroup"]').exists()).toBe(false)
  })
})
