import { afterEach, describe, expect, it } from 'vitest'
import { h, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import OeeChart from '@/components/library/charts/OeeChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { OeeInput } from '@/components/library/charts/utils/oee'

const ITEMS: OeeInput[] = [
  { id: 'a', name: 'SMT-1', plannedTime: 480, losses: { breakdown: 30, setup: 18, minorStops: 20, reducedSpeed: 12.8, startupRejects: 2, productionRejects: 6 } },
  { id: 'b', name: 'SMT-2', plannedTime: 480, losses: { breakdown: 5, setup: 10, minorStops: 4, reducedSpeed: 4, startupRejects: 0.2, productionRejects: 0.2 } },
]

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})
const mountIt = (props: Record<string, unknown> = {}) => (wrapper = mount(OeeChart, { props: { items: ITEMS, width: 700, ...props }, attachTo: document.body }))

describe('OeeChart', () => {
  it('KPI、目標比較、最大損失、瀑布每一段與報讀表格', () => {
    const w = mountIt({ title: 'OEE' })
    expect(w.find('[data-current]').text()).toBe('SMT-1')
    const kpi = (k: string) => w.find(`[data-kpi="${k}"]`)
    expect(kpi('oee').text()).toContain('81.5%')
    expect(kpi('oee').text()).toContain('目標 85%')
    expect(kpi('oee').text()).toContain('（未達）')
    expect(kpi('availability').text()).toContain('90%')
    expect(kpi('availability').text()).not.toContain('（未達）') // 剛好 90%
    expect(w.find('[data-biggest]').text()).toBe('最大損失：設備故障 30 分（計畫時間的 6.3%）')
    expect(w.findAll('[data-step]')).toHaveLength(10)
    expect(w.find('[data-step="breakdown"]').text()).toContain('−30')
    expect(w.find('[data-step="valuable"]').text()).toContain('391')
    expect(w.find('svg').attributes('aria-label')).toBe('SMT-1 的 OEE 損失瀑布，OEE 81.5%')
    expect(w.findAll('table.sr-only tbody tr')).toHaveLength(10)
  })

  it('滑過一段顯示提示；多台設備比較與選取（非受控 / v-model）', async () => {
    const w = mountIt()
    await w.find('[data-step="setup"]').trigger('mouseenter')
    expect(w.find('[data-tip]').text()).toContain('換線調整')
    expect(w.find('[data-tip]').text()).toContain('稼動損失')
    await w.find('svg').trigger('mouseleave')
    expect(w.find('[data-tip]').exists()).toBe(false)

    const rowB = w.find('[data-item="b"]')
    expect(rowB.attributes('aria-label')).toMatch(/^SMT-2：OEE 95.1%，稼動率 96.9%/) // (480 − 23.4) ÷ 480
    await rowB.trigger('click')
    expect(w.find('[data-current]').text()).toBe('SMT-2')
    expect(rowB.attributes('aria-pressed')).toBe('true')
    expect(w.emitted('update:selected')![0]).toEqual(['b'])
    expect((w.emitted('select')![0][0] as OeeInput).id).toBe('b')
    wrapper!.unmount()

    const sel = ref<string | null>('b')
    wrapper = mount({ render: () => h(OeeChart, { items: ITEMS, selected: sel.value, 'onUpdate:selected': (v: string) => (sel.value = v) }) })
    expect(wrapper.find('[data-current]').text()).toBe('SMT-2')
    await wrapper.find('[data-item="a"]').trigger('click')
    expect(sel.value).toBe('a')
  })

  it('不比較目標、自訂單位與格式、只有一台不顯示比較、沒有資料、對外方法', () => {
    const w = mountIt({ items: [ITEMS[1]], benchmark: false, unit: 'h', valueFormat: (v: number) => v.toFixed(2) })
    expect(w.find('[data-kpi="oee"]').text()).not.toContain('目標')
    expect(w.find('[data-step="breakdown"]').text()).toContain('−5.00')
    expect(w.find('[aria-labelledby]').exists()).toBe(false)
    expect(w.text()).toContain('h')
    expect((w.vm as unknown as { result: () => { oee: number } }).result().oee).toBeGreaterThan(0.9)
    wrapper!.unmount()
    const e = mountIt({ items: [] })
    expect(e.text()).toContain('沒有資料')
    expect((e.vm as unknown as { result: () => unknown }).result()).toBeNull()
    wrapper!.unmount()
    // 沒有任何損失：沒有「最大損失」
    const perfect = mountIt({ items: [{ id: 'p', name: 'P', plannedTime: 100, losses: {} }], benchmark: { oee: 0.5 } })
    expect(perfect.find('[data-biggest]').exists()).toBe(false)
    expect(perfect.find('[data-kpi="availability"]').text()).not.toContain('目標')
  })

  it('英文語系', () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(OeeChart, { items: ITEMS })) })
    expect(wrapper.text()).toContain('Availability')
    expect(wrapper.text()).toContain('Biggest loss: Breakdowns 30 min')
  })
})
