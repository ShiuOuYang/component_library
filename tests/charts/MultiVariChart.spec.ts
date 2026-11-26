import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import MultiVariChart from '@/components/library/charts/MultiVariChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { MultiVariData, MVPosition } from '@/components/library/charts/utils/multiVari'

const rows: Record<string, unknown>[] = []
for (const day of ['D1', 'D2'])
  for (const machine of ['M1', 'M2'])
    for (const cavity of ['C1', 'C2'])
      for (const k of [0, 1]) rows.push({ day, machine, cavity, v: (day === 'D2' ? 1 : 0) + (machine === 'M2' ? 2 : 0) + (cavity === 'C2' ? 4 : 0) + k * 0.5 })

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const emitted: Record<string, unknown[]> = {}
  const node = () =>
    h(MultiVariChart, {
      data: rows,
      value: 'v',
      factors: ['day', 'machine', 'cavity'],
      factorLabels: { day: '日期', machine: '機台', cavity: '模穴' },
      width: 700,
      ...props,
      onPositionClick: (p: MVPosition) => (emitted.click ??= []).push(p),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  return { w, emitted, vm: () => w.findComponent(MultiVariChart).vm as unknown as { result: () => MultiVariData } }
}

describe('MultiVariChart', () => {
  it('主要變異來源、來源占比、圖例、位置與點、隱藏表', () => {
    const { w, vm } = mountIt({ title: '長度', unit: 'mm' })
    expect(w.find('h3').text()).toBe('長度')
    expect(w.find('[data-dominant]').text()).toBe('主要變異來源：模穴（75.3%）')
    expect(w.findAll('[data-source]').map((s) => s.attributes('data-source'))).toEqual(['day', 'machine', 'cavity', 'within'])
    expect(w.find('[data-source="cavity"]').classes()).toContain('border-accent')
    expect(w.find('[data-source="within"]').text()).toContain('組內（重複量測）')
    expect(w.findAll('[data-inner]').map((b) => b.text())).toEqual(['C1', 'C2'])
    expect(w.findAll('[data-pos]').map((p) => p.attributes('data-pos'))).toEqual(['D1/M1', 'D1/M2', 'D2/M1', 'D2/M2'])
    expect(w.findAll('[data-inner-mean]')).toHaveLength(8)
    expect(w.findAll('[data-pos-mean]')).toHaveLength(4)
    expect(w.findAll('[data-panel-mean]')).toHaveLength(2)
    expect(w.findAll('[data-pos] circle[r="2"]')).toHaveLength(16)
    expect(w.findAll('tbody tr')).toHaveLength(8)
    expect(w.find('tbody tr').text()).toBe('D1M1C120.250.5')
    expect(w.find('svg').attributes('aria-label')).toBe('長度：4 個位置，主要變異來源為模穴；← → 切換位置')
    expect(w.text()).toContain('mm')
    expect(vm().result().dominant).toBe('cavity')
  })

  it('規格線（右側留標籤空間）、不畫個別點、不顯示占比、兩層與一層', () => {
    const { w } = mountIt({ usl: 10, lsl: -1, target: 4, showPoints: false, showSummary: false })
    expect(w.findAll('[data-spec]').map((s) => s.attributes('data-spec'))).toEqual(['usl', 'target', 'lsl'])
    expect(w.text()).toContain('USL 10')
    expect(w.findAll('[data-pos] circle[r="2"]')).toHaveLength(0)
    expect(w.find('[data-sources]').exists()).toBe(false)
    const two = mountIt({ factors: ['machine', 'cavity'] })
    expect(two.w.findAll('[data-panel-mean]')).toHaveLength(0)
    expect(two.w.findAll('[data-pos]')).toHaveLength(2)
    const one = mountIt({ factors: ['cavity'] })
    expect(one.w.find('[data-legend]').exists()).toBe(false)
    expect(one.w.findAll('[data-inner-mean]')).toHaveLength(0)
    expect(one.w.findAll('[data-pos] circle[r="2"]')).toHaveLength(16)
    expect(one.w.findAll('thead th')).toHaveLength(4)
    // 全部相同的值
    const flat = mountIt({ data: [{ a: 'x', v: 2 }, { a: 'y', v: 2 }], factors: ['a'] })
    expect(flat.w.find('[data-dominant]').exists()).toBe(false)
    expect(flat.w.findAll('[data-pos]')).toHaveLength(2)
  })

  it('滑過位置：tooltip 與底色；點選送出；圖例標示淡化其他模穴', async () => {
    const { w, emitted } = mountIt()
    const pos = w.findAll('[data-pos]')[3]
    await pos.trigger('mouseenter')
    expect(w.find('[data-tip]').text()).toBe('D2 / M2n = 4，平均 5.25，全距 4.5C1：3.25（n = 2）C2：7.25（n = 2）')
    await pos.trigger('click')
    expect((emitted.click[0] as MVPosition).cell.path).toEqual(['D2', 'M2'])
    await w.find('svg').trigger('mouseleave')
    expect(w.find('[data-tip]').exists()).toBe(false)
    const c1 = w.find('[data-inner="C1"]')
    await c1.trigger('mouseenter')
    expect(w.find('[data-inner-mean="D1/M1/C2"]').attributes('style')).toContain('opacity: 0.2')
    await c1.trigger('mouseleave')
    await c1.trigger('click')
    expect(c1.attributes('aria-pressed')).toBe('true')
    expect(w.find('[data-inner-mean="D1/M1/C1"]').attributes('style')).toContain('opacity: 1')
    await c1.trigger('click')
    expect(c1.attributes('aria-pressed')).toBe('false')
  })

  it('鍵盤：←→ / Home / End 切換位置並念出、Enter 送出', async () => {
    const { w, emitted } = mountIt()
    const svg = w.find('svg')
    const live = () => w.find('[aria-live]').text()
    await svg.trigger('focus')
    expect(live()).toMatch(/^D1 \/ M1；n = 4/)
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toMatch(/^D1 \/ M2/)
    expect(svg.attributes('aria-valuenow')).toBe('2')
    await svg.trigger('keydown', { key: 'End' })
    expect(live()).toMatch(/^D2 \/ M2/)
    await svg.trigger('keydown', { key: 'ArrowRight' })
    await svg.trigger('keydown', { key: 'Home' })
    await svg.trigger('keydown', { key: 'ArrowLeft' })
    expect(live()).toMatch(/^D1 \/ M1/)
    await svg.trigger('keydown', { key: 'Enter' })
    expect((emitted.click[0] as MVPosition).level).toBe('M1')
    await svg.trigger('keydown', { key: 'x' })
    await svg.trigger('blur')
    expect(w.find('[data-tip]').exists()).toBe(false)
  })

  it('位置很多時變寬、換資料清掉已標示的水準、空資料、數值格式、英文語系', async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ m: `M${i}`, c: i % 2 ? 'A' : 'B', v: i }))
    const wide = mountIt({ data: many, factors: ['m', 'c'], width: 300 })
    expect(Number(wide.w.find('svg').attributes('width'))).toBeGreaterThan(300)
    const wrap = mount(MultiVariChart, { props: { data: rows, value: 'v', factors: ['machine', 'cavity'], width: 600 }, attachTo: document.body })
    mounted.push(wrap)
    await wrap.find('[data-inner="C2"]').trigger('click')
    await wrap.setProps({ data: rows.filter((r) => r.cavity === 'C1') })
    await nextTick()
    await wrap.setProps({ data: rows })
    expect(wrap.find('[data-inner="C2"]').attributes('aria-pressed')).toBe('false')
    expect(mountIt({ data: [] }).w.text()).toContain('沒有資料')
    expect(mountIt({ data: [], emptyText: '尚無量測' }).w.text()).toContain('尚無量測')
    const f = mountIt({ valueFormat: (v: number) => `${v.toFixed(1)}!` })
    expect(f.w.find('tbody tr').text()).toContain('0.3!')
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.find('[data-dominant]').text()).toBe('Largest source of variation: 模穴 (75.3%)')
    expect(en.w.find('svg').attributes('aria-label')).toBe('Multi-vari chart: 4 positions, largest source of variation is 模穴; use ← → to move')
  })
})
