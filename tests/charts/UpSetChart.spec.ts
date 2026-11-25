import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import UpSetChart from '@/components/library/charts/UpSetChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { UpsetCombo, UpsetSet } from '@/components/library/charts/utils/upset'

const items = [
  { id: 'p1', sets: ['錫橋', '錫珠'] },
  { id: 'p2', sets: ['錫橋', '錫珠'] },
  { id: 'p3', sets: ['錫橋'] },
  { id: 'p4', sets: ['偏移', '立碑'] },
  { id: 'p5', sets: ['偏移', '立碑'] },
  { id: 'p6', sets: ['偏移', '立碑'] },
  { id: 'p7', sets: [] },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const selected = ref<string | null>((props.selected as string | null) ?? null)
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  const node = () =>
    h(UpSetChart, {
      items,
      width: 640,
      unit: '片',
      ...props,
      selected: selected.value,
      'onUpdate:selected': (v: string | null) => (rec('selected')(v), (selected.value = v)),
      onComboClick: rec('combo'),
      onSetClick: rec('set'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const cols = () => w.findAll('[data-combo]')
  const col = (k: string) => w.find(`[data-combo="${k}"]`)
  const vm = () => w.findComponent(UpSetChart).vm as unknown as { combos: () => UpsetCombo[]; sets: () => UpsetSet[]; selectedItems: () => string[] }
  return { w, cols, col, emitted, selected, vm }
}

describe('UpSetChart', () => {
  it('欄、矩陣的點與連線、集合長條、數量、aria、資料表', () => {
    const { w, cols, col, vm } = mountIt({ title: '缺陷' })
    expect(cols().map((c) => c.attributes('data-combo'))).toEqual(['偏移+立碑', '錫橋+錫珠', '錫橋'])
    expect(col('偏移+立碑').findAll('[data-dot="on"]')).toHaveLength(2)
    expect(col('偏移+立碑').findAll('[data-dot="off"]')).toHaveLength(2)
    expect(col('偏移+立碑').find('line').exists()).toBe(true)
    expect(col('錫橋').find('line').exists()).toBe(false)
    expect(col('偏移+立碑').attributes('aria-label')).toBe('偏移 + 立碑（只有這幾項）：3 片，佔 42.9%')
    expect(col('偏移+立碑').text()).toContain('3')
    expect(w.findAll('[data-set]').map((s) => s.attributes('data-set'))).toEqual(['錫橋', '偏移', '立碑', '錫珠'])
    expect(w.findAll('[data-setbar]')).toHaveLength(4)
    expect(w.find('svg').attributes('aria-label')).toBe('缺陷：4 個集合、3 種組合')
    expect(w.findAll('tbody tr').map((r) => r.text())).toEqual(['偏移 + 立碑23 片', '錫橋 + 錫珠22 片', '錫橋11 片'])
    expect(w.text()).toContain('每一欄：剛好是這幾項')
    expect(w.find('[data-hidden]').text()).toBe('另有 1 個組合未顯示')
    expect(vm().sets()[0]).toEqual({ name: '錫橋', size: 3, index: 0 })
  })

  it('inclusive、依組合大小、含空組合、篩選與上限、照輸入順序、用 sets 輸入', () => {
    const inc = mountIt({ mode: 'inclusive', includeEmpty: true, sort: 'degree' })
    expect(inc.w.text()).toContain('至少有這幾項')
    expect(inc.cols().map((c) => c.attributes('data-combo'))).toEqual(['∅', '錫橋', '偏移+立碑', '錫橋+錫珠'])
    expect(inc.col('錫橋').attributes('aria-label')).toContain('3 片')
    expect(inc.col('∅').attributes('aria-label')).toContain('（都沒有）')
    const lim = mountIt({ limit: 1, minCount: 2 })
    expect(lim.cols()).toHaveLength(1)
    expect(lim.w.find('[data-hidden]').text()).toBe('另有 3 個組合未顯示')
    const deg = mountIt({ minDegree: 2, maxDegree: 2 })
    expect(deg.cols()).toHaveLength(2)
    const sets = mountIt({ items: [], sets: [{ name: 'B', items: ['x'] }, { name: 'A', items: ['x', 'y', 'z'] }], setOrder: 'input', sort: 'sets' })
    expect(sets.w.findAll('[data-set]').map((s) => s.attributes('data-set'))).toEqual(['B', 'A'])
    expect(sets.cols().map((c) => c.attributes('data-combo'))).toEqual(['B+A', 'A'])
    const empty = mountIt({ items: [], emptyText: '空' })
    expect(empty.w.text()).toContain('空')
    expect(empty.w.find('svg').exists()).toBe(false)
  })

  it('滑過欄：tooltip、其他欄淡化；滑過集合：標出包含它的欄；離開清掉', async () => {
    const { w, col } = mountIt()
    await col('錫橋+錫珠').trigger('mouseenter')
    expect(w.find('.pointer-events-none.absolute').text()).toContain('錫橋 + 錫珠只有這幾項2 片（28.6%）')
    expect(col('錫橋').attributes('style')).toContain('opacity: 0.3')
    expect(w.find('[data-set="偏移"] [data-setbar]').attributes('style')).toContain('opacity: 0.35')
    await w.find('[data-set="偏移"]').trigger('mouseenter')
    expect(w.find('.pointer-events-none.absolute').text()).toContain('偏移這一項的總數3 片（42.9%）')
    expect(col('偏移+立碑').attributes('style')).toContain('opacity: 1')
    expect(col('錫橋').attributes('style')).toContain('opacity: 0.3')
    await w.find('svg').trigger('mouseleave')
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
  })

  it('點欄選取 / 取消、外部改 selected、點集合、selectedItems', async () => {
    const { w, col, emitted, selected, vm } = mountIt()
    await col('錫橋+錫珠').trigger('click')
    expect(selected.value).toBe('錫橋\u0000錫珠')
    expect((emitted.combo[0] as UpsetCombo).items).toEqual(['p1', 'p2'])
    expect(col('錫橋+錫珠').attributes('aria-pressed')).toBe('true')
    expect(vm().selectedItems()).toEqual(['p1', 'p2'])
    await col('錫橋+錫珠').trigger('click')
    expect(selected.value).toBeNull()
    expect(vm().selectedItems()).toEqual([])
    selected.value = '錫橋'
    await nextTick()
    expect(col('錫橋').attributes('aria-pressed')).toBe('true')
    await w.find('[data-set="立碑"]').trigger('click')
    expect((emitted.set[0] as UpsetSet).name).toBe('立碑')
  })

  it('鍵盤：←→ Home End 移動、Enter 選取、Esc 取消', async () => {
    const { w, cols, emitted } = mountIt()
    const first = cols()[0]
    expect(first.attributes('tabindex')).toBe('0')
    await first.trigger('focus')
    expect(w.find('[aria-live]').text()).toBe('偏移 + 立碑（只有這幾項）：3 片，佔 42.9%')
    await first.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement?.getAttribute('data-combo')).toBe('錫橋+錫珠')
    await cols()[1].trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement?.getAttribute('data-combo')).toBe('錫橋')
    await cols()[2].trigger('keydown', { key: 'ArrowRight' })
    await cols()[2].trigger('keydown', { key: 'Home' })
    await cols()[0].trigger('keydown', { key: 'ArrowLeft' })
    await cols()[0].trigger('keydown', { key: 'Enter' })
    expect(emitted.selected).toEqual(['偏移\u0000立碑'])
    await cols()[0].trigger('keydown', { key: 'x' })
    await cols()[0].trigger('keydown', { key: 'Escape' })
    expect(emitted.selected).toEqual(['偏移\u0000立碑', null])
    await cols()[0].trigger('keydown', { key: 'Escape' }) // 沒選取時不再送
    expect(emitted.selected).toHaveLength(2)
    await cols()[0].trigger('blur')
  })

  it('窄的寬度可以捲動、長名稱截斷、數值格式、英文語系', () => {
    // 6 個集合的所有組合：63 欄
    const many = Array.from({ length: 63 }, (_, i) => ({ id: `x${i}`, sets: [0, 1, 2, 3, 4, 5].filter((k) => ((i + 1) >> k) & 1).map((k) => `S${k}`) }))
    const narrow = mountIt({ items: many, width: 300, limit: 100 })
    expect(narrow.cols()).toHaveLength(63)
    expect(Number(narrow.w.find('svg').attributes('width'))).toBeGreaterThan(300)
    const long = mountIt({ items: [{ id: 'a', sets: ['非常非常非常非常非常非常非常非常長的缺陷名稱'] }] })
    expect(long.w.find('[data-set] text:last-of-type').text()).toMatch(/…$/)
    const f = mountIt({ valueFormat: (v: number) => `#${v}`, color: 'hotpink' })
    expect(f.w.find('[data-bar]').attributes('style')).toContain('hotpink')
    expect(f.col('錫橋').text()).toContain('#1')
    const en = mountIt({ unit: '' }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.find('svg').attributes('aria-label')).toBe('UpSet chart: 4 sets, 3 combinations')
    expect(en.col('錫橋').attributes('aria-label')).toBe('錫橋 (exactly these): 1, 14.3%')
    expect(en.w.find('[data-hidden]').text()).toBe('1 more combination not shown')
  })
})
