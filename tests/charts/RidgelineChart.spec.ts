import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import RidgelineChart from '@/components/library/charts/RidgelineChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { RidgelineGroup } from '@/components/library/charts/utils/ridgeline'

const series = [
  { name: '機台 A', values: [128, 130, 131, 129, 132, 130, 127, 133] },
  { name: '機台 B', values: [150, 152, 158, 161, 149, 155, 163, 151], color: 'teal' },
  { name: '機台 C', values: [95, 105, 110, 98, 120, 102, 99, 108] },
  { name: '空的', values: [null, Number.NaN] },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const clicks: RidgelineGroup[] = []
  const node = () => h(RidgelineChart, { series, width: 640, unit: 'μm', ...props, onGroupClick: (g: RidgelineGroup) => clicks.push(g) })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const grp = (name: string) => w.find(`[data-group="${name}"]`)
  const order = () => w.findAll('[data-group]').map((g) => g.attributes('data-group'))
  const svg = () => w.find('svg[role="group"]')
  const vm = () => w.findComponent(RidgelineChart).vm as unknown as { groups: () => RidgelineGroup[]; grid: () => number[] }
  return { w, grp, order, svg, clicks, vm }
}

describe('RidgelineChart', () => {
  it('每組一條曲線、中位數與四分位、沒有資料的組、aria、資料表、自動高度', () => {
    const { w, grp, svg, vm } = mountIt({ title: '厚度' })
    expect(w.findAll('[data-group]')).toHaveLength(4)
    expect(grp('機台 A').find('[data-ridge]').attributes('d')).toMatch(/^M/)
    expect(grp('機台 A').findAll('[data-q]').map((q) => q.attributes('data-q'))).toEqual(['q1', 'median', 'q3'])
    expect(grp('機台 B').find('[data-ridge]').attributes('style')).toContain('teal')
    expect(grp('空的').find('[data-ridge]').exists()).toBe(false)
    expect(grp('空的').text()).toContain('沒有資料')
    expect(svg().attributes('aria-label')).toBe('厚度：4 組分佈')
    expect(grp('機台 A').attributes('aria-label')).toBe('機台 A，n = 8，平均 130 μm（標準差 2），中位數 130 μm，Q1–Q3：128.75 – 131.25，範圍：127 – 133')
    expect(grp('空的').attributes('aria-label')).toBe('空的，沒有資料')
    expect(w.findAll('thead th').map((t) => t.text())).toEqual(['組別', '筆數', '平均', '標準差', '中位數', 'Q1', 'Q3', '最小', '最大'])
    expect(w.findAll('tbody tr')[3].text()).toBe('空的' + '沒有資料'.repeat(8))
    // 自動高度：上方留重疊空間 + 每組 36
    expect(svg().attributes('height')).toBe(String(36 + 22 + 22 + 4 * 36))
    expect(vm().grid()).toHaveLength(120)
    expect(vm().groups().map((g) => g.name)).toEqual(['機台 A', '機台 B', '機台 C', '空的'])
  })

  it('規格線與規格外比例、只有單側規格', () => {
    const { w, grp } = mountIt({ spec: { lsl: 100, usl: 160, target: 130 } })
    expect(w.findAll('[data-spec]').map((s) => s.attributes('data-spec'))).toEqual(['lsl', 'target', 'usl'])
    expect(w.find('[data-spec="lsl"]').text()).toBe('LSL 100')
    expect(w.find('[data-spec="target"]').text()).toBe('目標 130')
    expect(grp('機台 A').find('[data-out]').exists()).toBe(false)
    expect(grp('機台 B').find('[data-out]').text()).toBe('25.0%')
    expect(grp('機台 C').find('[data-out]').text()).toBe('37.5%')
    expect(grp('機台 B').attributes('aria-label')).toContain('規格外 25.0%、高於 USL 25.0%')
    expect(grp('機台 C').attributes('aria-label')).toContain('規格外 37.5%、低於 LSL 37.5%')
    expect(grp('機台 A').attributes('aria-label')).toMatch(/規格外 0\.0%$/)
    expect(w.findAll('thead th').at(-1)!.text()).toBe('規格外')
    const one = mountIt({ spec: { usl: 155 } })
    expect(one.w.findAll('[data-spec]')).toHaveLength(1)
    expect(one.grp('機台 B').find('[data-out]').text()).toBe('37.5%')
    // 只有目標：沒有規格外欄
    const target = mountIt({ spec: { target: 130 } })
    expect(target.w.find('[data-out]').exists()).toBe(false)
    expect(target.w.findAll('thead th').at(-1)!.text()).toBe('最大')
  })

  it('排序、共用比例、不重疊、不畫四分位、單一顏色、指定範圍與高度', () => {
    const a = mountIt({ sort: 'median' })
    expect(a.order()).toEqual(['機台 B', '機台 A', '機台 C', '空的'])
    const b = mountIt({ sort: 'name', sortDescending: false })
    expect(b.order()).toEqual(['空的', '機台 C', '機台 B', '機台 A'])
    // 共用比例：變異大的 C 比較矮
    const top = (w: VueWrapper, name: string) => {
      const nums = w.find(`[data-group="${name}"] [data-ridge]`).attributes('d')!.match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number)
      // 路徑數字是 x,y 成對：取 y 的最小值
      return Math.min(...nums.filter((_, k) => k % 2 === 1))
    }
    const each = mountIt()
    const shared = mountIt({ normalize: 'shared' })
    const baseA = 36 + 22 + 36
    const baseC = 36 + 22 + 3 * 36
    // 各自同高：兩組的最高點都接近 ridgeH（72px；B 樣條會把尖峰削低一點）
    expect(Math.abs(baseA - top(each.w, '機台 A') - (baseC - top(each.w, '機台 C')))).toBeLessThan(6)
    expect(baseC - top(shared.w, '機台 C')).toBeLessThan(baseA - top(shared.w, '機台 A'))
    const c = mountIt({ overlap: 0, showQuartiles: false, color: 'gold', domain: [80, 180], height: 300 })
    expect(c.svg().attributes('height')).toBe('300')
    expect(c.w.find('[data-q]').exists()).toBe(false)
    expect(c.grp('機台 B').find('[data-ridge]').attributes('style')).toContain('gold')
    expect(c.w.findAll('svg[role="group"] > g[aria-hidden] text').map((t) => t.text())).toContain('180')
    expect(c.svg().attributes('height')).toBe('300')
  })

  it('滑過 tooltip 並淡化其他組；鍵盤 ↑↓ Home End Enter Escape；點擊', async () => {
    const { w, grp, svg, clicks } = mountIt()
    await grp('機台 C').trigger('mouseenter')
    expect(w.find('.pointer-events-none.absolute').text()).toContain('機台 C')
    expect(grp('機台 A').attributes('style')).toContain('opacity: 0.3')
    await grp('空的').trigger('mouseenter')
    expect(w.find('.pointer-events-none.absolute').text()).toContain('沒有資料')
    await svg().trigger('mouseleave')
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
    await grp('機台 B').trigger('click')
    expect(clicks.map((c) => c.name)).toEqual(['機台 B'])
    const first = w.find('[data-group][tabindex="0"]')
    await first.trigger('focus')
    expect(w.find('[aria-live="polite"]').text()).toContain('機台 A')
    await first.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(document.activeElement?.getAttribute('data-group')).toBe('機台 B')
    await grp('機台 B').trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement?.getAttribute('data-group')).toBe('空的')
    await grp('空的').trigger('keydown', { key: 'ArrowDown' })
    await grp('空的').trigger('keydown', { key: 'Home' })
    await nextTick()
    await grp('機台 A').trigger('keydown', { key: 'ArrowUp' })
    await grp('機台 A').trigger('keydown', { key: ' ' })
    await grp('機台 A').trigger('keydown', { key: 'x' })
    expect(clicks).toHaveLength(2)
    await grp('機台 A').trigger('focus')
    await grp('機台 A').trigger('keydown', { key: 'Escape' })
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
    await grp('機台 A').trigger('blur')
  })

  it('空資料、長名稱截斷、數值格式、英文語系', () => {
    const empty = mountIt({ series: [], emptyText: '空' })
    expect(empty.w.text()).toContain('空')
    expect(empty.w.find('svg[role="group"]').exists()).toBe(false)
    const long = mountIt({ series: [{ name: '非常非常非常非常非常非常非常非常非常非常長的名稱', values: [1, 2, 3] }], width: 300 })
    expect(long.w.find('[data-group] text').text()).toMatch(/…$/)
    const f = mountIt({ valueFormat: (v: number) => v.toFixed(1), spec: { lsl: 100 } })
    expect(f.w.find('[data-spec="lsl"]').text()).toBe('LSL 100.0')
    const en = mountIt({ spec: { usl: 160 } }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.svg().attributes('aria-label')).toBe('Ridgeline chart: 4 distributions')
    expect(en.grp('機台 B').attributes('aria-label')).toBe(
      '機台 B, n = 8, Mean 154.88 μm (SD 5.2763), Median 153.5 μm, Q1–Q3: 150.75 – 158.75, Range: 149 – 163, Out of spec 25.0%, above USL 25.0%'
    )
    const one = mountIt({ series: [series[0]] }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(one.svg().attributes('aria-label')).toBe('Ridgeline chart: 1 distribution')
  })
})
