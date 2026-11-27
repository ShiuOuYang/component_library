import { afterEach, describe, expect, it } from 'vitest'
import { h, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptValueStreamMap from '@/components/library/ui/ChptValueStreamMap.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { VsmProcess } from '@/components/library/shared/valueStream'

const PROCS: VsmProcess[] = [
  { id: 'smt', name: 'SMT', cycleTime: 38, changeover: 45, uptime: 85, operators: 2, scrap: 0.8, inventoryBefore: { qty: 1200 } },
  { id: 'dip', name: 'DIP', cycleTime: 52, operators: 1, inventoryBefore: { qty: 300 }, flowIn: 'fifo' },
  { id: 'test', name: 'Test', cycleTime: 30, inventoryBefore: { days: 0.5 }, flowIn: 'pull' },
]
const customer = { name: '組裝廠', demand: 600, availableTime: 27000 }

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('ChptValueStreamMap', () => {
  it('工站資料、庫存三角、物流方式、時間梯與合計', () => {
    wrapper = mount(ChptValueStreamMap, { props: { processes: PROCS, customer, supplier: 'PCB 廠', control: 'MRP', finishedGoods: { qty: 600 }, title: '現況' } })
    const w = wrapper
    expect(w.text()).toContain('PCB 廠')
    expect(w.text()).toContain('MRP')
    expect(w.text()).toContain('需求 600 件/天')
    expect(w.text()).toContain('節拍時間：45 秒')

    const smt = w.find('[data-process="smt"]')
    expect(smt.text()).toContain('2 人')
    expect(smt.find('dl').text()).toContain('38 秒')
    expect(smt.find('dl').text()).toContain('45 分')
    expect(smt.find('dl').text()).toContain('85%')
    expect(smt.find('dl').text()).toContain('0.8%')
    expect(smt.text()).toContain('負荷 84%')

    // DIP 52 秒 > 節拍 45：標紅、瓶頸、超過節拍
    const dip = w.find('[data-process="dip"]')
    expect(dip.text()).toContain('瓶頸')
    expect(dip.find('dl dd').attributes('style')).toContain('--t-danger')
    expect(dip.find('dl .sr-only').text()).toContain('超過節拍')
    expect(dip.text()).toContain('負荷 116%')
    expect(w.text()).toContain('1 站超過節拍')

    // 庫存：數量 → 天數；物流方式
    expect(w.find('[data-inv="inv-smt"]').text()).toContain('原料')
    expect(w.find('[data-inv="inv-smt"]').text()).toContain('1200 件')
    expect(w.find('[data-inv="inv-smt"]').text()).toContain('2 天')
    expect(w.find('[data-inv="inv-dip"]').text()).toContain('先進先出')
    expect(w.find('[data-inv="inv-test"]').text()).toContain('拉式')
    expect(w.find('[data-inv="inv-test"]').text()).toContain('0.5 天')
    expect(w.find('[data-inv="inv-finished"]').text()).toContain('成品')

    // 合計：庫存 2 + 0.5 + 0.5 + 1 = 4 天；加值 120 秒；PCE 120 / (4 × 27000 + 120) ≈ 0.11%
    const sum = w.find('.vsm-summary').text()
    expect(sum).toContain('4 天')
    expect(sum).toContain('120 秒')
    expect(sum).toContain('0.11%')
    // 捲動區可用鍵盤進入
    const region = w.find('[role="region"]')
    expect(region.attributes('tabindex')).toBe('0')
    expect(region.attributes('aria-label')).toBe('現況')
  })

  it('選取工站：非受控與 v-model:selected', async () => {
    wrapper = mount(ChptValueStreamMap, { props: { processes: PROCS, customer } })
    const btn = () => wrapper!.find('[data-process="dip"] button')
    await btn().trigger('click')
    expect(btn().attributes('aria-pressed')).toBe('true')
    expect(wrapper.emitted('update:selected')![0]).toEqual(['dip'])
    expect((wrapper.emitted('select')![0][0] as VsmProcess).id).toBe('dip')
    expect(wrapper.find('[aria-live="polite"]').text()).toContain('DIP')
    await btn().trigger('click')
    expect(btn().attributes('aria-pressed')).toBe('false')
    expect(wrapper.emitted('select')![1]).toEqual([null])
    wrapper.unmount()

    const sel = ref<string | null>('smt')
    wrapper = mount({ render: () => h(ChptValueStreamMap, { processes: PROCS, customer, selected: sel.value, 'onUpdate:selected': (v: string | null) => (sel.value = v) }) })
    expect(wrapper.find('[data-process="smt"] button').attributes('aria-pressed')).toBe('true')
    await wrapper.find('[data-process="test"] button').trigger('click')
    expect(sel.value).toBe('test')
    expect(wrapper.find('[data-process="smt"] button').attributes('aria-pressed')).toBe('false')
  })

  it('沒有工站、沒有需求、對外方法', () => {
    wrapper = mount(ChptValueStreamMap, { props: { processes: [], customer } })
    expect(wrapper.text()).toContain('沒有工站')
    wrapper.unmount()
    wrapper = mount(ChptValueStreamMap, { props: { processes: [{ id: 'x', name: 'X', cycleTime: 10 }], customer: { name: 'c', demand: 0 } } })
    expect(wrapper.text()).not.toContain('節拍時間')
    expect(wrapper.text()).not.toContain('瓶頸') // 只有一站不標瓶頸
    expect(wrapper.text()).not.toContain('負荷')
    const vm = wrapper.vm as unknown as { metrics: () => { valueAddedSeconds: number } }
    expect(vm.metrics().valueAddedSeconds).toBe(10)
  })

  it('英文語系', () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptValueStreamMap, { processes: PROCS, customer })) })
    expect(wrapper.text()).toContain('Takt time: 45 s')
    expect(wrapper.text()).toContain('1 process is over takt')
    expect(wrapper.text()).toContain('FIFO')
    expect(wrapper.text()).toContain('2 operators')
  })
})
