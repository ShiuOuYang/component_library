import { afterEach, describe, expect, it } from 'vitest'
import { h, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import DoeEffectsChart from '@/components/library/charts/DoeEffectsChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

// 2³、重複 2 次：temp 與 time 有效果、有交互作用，speed 沒有
const rows: Record<string, unknown>[] = []
const d = [0.12, -0.08, 0.05, -0.1, 0.07, -0.03, 0.09, -0.11, 0.04, -0.06, 0.1, -0.02, 0.08, -0.09, 0.03, -0.05]
let i = 0
for (const temp of [240, 250]) for (const time of [60, 90]) for (const speed of [70, 80]) {
  const T = temp === 250 ? 1 : -1
  const t = time === 90 ? 1 : -1
  for (let r = 0; r < 2; r++) rows.push({ temp, time, speed, voids: 12 - 2.4 * T - 1.2 * t - 0.9 * T * t + d[i++] })
}
const labels = { temp: '溫度', time: '時間', speed: '速度' }

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})
const mountIt = (props: Record<string, unknown> = {}) =>
  (wrapper = mount(DoeEffectsChart, { props: { data: rows, factors: ['temp', 'time', 'speed'], response: 'voids', factorLabels: labels, width: 640, ...props }, attachTo: document.body }))

describe('DoeEffectsChart', () => {
  it('柏拉圖：依標準化效果排序、t 臨界線、顯著項目、方法說明與因子對照', () => {
    const w = mountIt({ title: '空洞率' })
    expect(w.find('[data-chart="pareto"]').exists()).toBe(true)
    const terms = w.findAll('[data-term]').map((g) => g.attributes('data-term'))
    expect(terms.slice(0, 3)).toEqual(['A', 'B', 'AB'])
    expect(terms).toHaveLength(6)
    expect(w.findAll('[data-significant]').map((g) => g.attributes('data-term'))).toEqual(['A', 'B', 'AB'])
    expect(w.find('[data-tcrit]').exists()).toBe(true)
    expect(w.find('[data-method]').text()).toContain('16 次實驗，有重複')
    expect(w.find('[data-method]').text()).toContain('顯著：A 溫度、B 時間、AB')
    expect(w.find('[data-legend]').text()).toContain('A = 溫度（240 → 250）')
    expect(w.find('[data-term="A"]').text()).toContain('−4.8') // 效果 = 2 × (−2.4)；d3.format 用 U+2212 減號
    expect(w.find('[data-chart="pareto"]').attributes('aria-label')).toContain('空洞率')
    expect(w.findAll('table.sr-only tbody tr')).toHaveLength(6)
  })

  it('切換主效果與交互作用（非受控 / v-model）', async () => {
    const w = mountIt()
    await w.find('button[data-view="main"]').trigger('click')
    expect(w.emitted('update:view')![0]).toEqual(['main'])
    expect(w.find('[data-chart="main"]').exists()).toBe(true)
    expect(w.findAll('[data-factor]')).toHaveLength(3)
    expect(w.find('[data-chart="main"]').attributes('aria-label')).toContain('A 溫度 低水準平均')
    await w.find('button[data-view="interaction"]').trigger('click')
    expect(w.findAll('[data-pair]').map((g) => g.attributes('data-pair'))).toEqual(['AB', 'AC', 'BC'])
    expect(w.find('[data-pair="AB"]').text()).toContain('AB *')
    expect(w.find('[data-pair="AC"]').text()).not.toContain('*')
    expect(w.text()).toContain('兩條線越不平行')
    wrapper!.unmount()

    const view = ref<'pareto' | 'main' | 'interaction'>('main')
    wrapper = mount({ render: () => h(DoeEffectsChart, { data: rows, factors: ['temp', 'time'], response: 'voids', view: view.value, 'onUpdate:view': (v: 'pareto') => (view.value = v) }) })
    expect(wrapper.find('[data-chart="main"]').exists()).toBe(true)
    await wrapper.find('button[data-view="pareto"]').trigger('click')
    expect(view.value).toBe('pareto')
    expect(wrapper.find('[data-chart="pareto"]').exists()).toBe(true)
  })

  it('沒有重複用 Lenth 法；無法估計誤差時不畫臨界線', () => {
    const single = rows.filter((_, k) => k % 2 === 0)
    const w = mountIt({ data: single })
    expect(w.find('[data-method]').text()).toContain('Lenth')
    wrapper!.unmount()
    const tiny = mountIt({ data: [{ a: 1, y: 2 }, { a: 2, y: 3 }], factors: ['a'], response: 'y' })
    expect(tiny.find('[data-method]').text()).toContain('無法估計誤差')
    expect(tiny.find('[data-tcrit]').exists()).toBe(false)
    expect(tiny.text()).toContain('效果（絕對值）')
  })

  it('因子水準不對、沒有資料、自訂格式、三階交互作用、對外方法', () => {
    const w = mountIt({ data: [...rows, { temp: 245, time: 60, speed: 70, voids: 1 }] })
    // 有中心點：自動判斷時溫度有三個水準 → 提示
    expect(w.find('[data-invalid]').text()).toContain('溫度')
    expect(w.text()).toContain('沒有可分析的資料')
    wrapper!.unmount()
    const ok = mountIt({ data: [...rows, { temp: 245, time: 60, speed: 70, voids: 1 }], levels: { temp: [240, 250] }, maxOrder: 3, valueFormat: (v: number) => v.toFixed(1), unit: '%' })
    expect(ok.find('[data-invalid]').exists()).toBe(false)
    expect(ok.findAll('[data-term]')).toHaveLength(7)
    expect(ok.find('[data-term="A"]').text()).toContain('-4.8')
    expect((ok.vm as unknown as { analysis: () => { n: number } }).analysis().n).toBe(16)
    wrapper!.unmount()
    expect(mountIt({ data: [] }).text()).toContain('沒有可分析的資料')
  })

  it('英文語系', () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(DoeEffectsChart, { data: rows, factors: ['temp', 'time', 'speed'], response: 'voids' })) })
    expect(wrapper.text()).toContain('Standardized effects')
    expect(wrapper.text()).toContain('Significant: A temp, B time, AB')
    expect(wrapper.text()).toContain('= temp (240 → 250)')
  })
})
