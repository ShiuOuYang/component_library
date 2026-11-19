import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import BulletChart from '@/components/library/charts/BulletChart.vue'
import YieldFunnel from '@/components/library/charts/YieldFunnel.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import { bandOf, bandSegments, computeFunnel, niceMax, ratioOf } from '@/components/library/charts/utils/bullet'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

const bands = [
  { to: 60, label: '未達標', status: 'critical' as const },
  { to: 85, label: '注意', status: 'warning' as const },
  { to: 100, label: '達標', status: 'good' as const },
]

describe('bullet utils', () => {
  it('ratioOf 夾在 0～1；min ≥ max 或非數字時為 0', () => {
    expect(ratioOf(50, 0, 200)).toBe(0.25)
    expect(ratioOf(-5, 0, 10)).toBe(0)
    expect(ratioOf(15, 0, 10)).toBe(1)
    expect(ratioOf(5, 10, 10)).toBe(0)
    expect(ratioOf(NaN, 0, 10)).toBe(0)
  })

  it('bandSegments：依 to 排序、從 min 開始、截掉超出範圍的部分', () => {
    const segs = bandSegments([bands[2], bands[0], bands[1]], 0, 100)
    expect(segs.map((s) => [s.from, s.to])).toEqual([[0, 0.6], [0.6, 0.85], [0.85, 1]])
    expect(bandSegments([{ to: 150 }, { to: 200 }], 0, 100).map((s) => [s.from, s.to])).toEqual([[0, 1]])
    expect(bandSegments(null, 0, 1)).toEqual([])
  })

  it('bandOf：落在哪個區間；超過最後一個算最後一個', () => {
    expect(bandOf(bands, 60)?.label).toBe('未達標')
    expect(bandOf(bands, 61)?.label).toBe('注意')
    expect(bandOf(bands, 130)?.label).toBe('達標')
    expect(bandOf(bands, null)).toBeNull()
    expect(bandOf([], 5)).toBeNull()
  })

  it('niceMax 取好看的上限', () => {
    expect(niceMax([87, 95])).toBe(100)
    expect(niceMax([1180])).toBe(1200)
    expect(niceMax([0.42])).toBe(0.5)
    expect(niceMax([null, undefined, -3])).toBe(1)
    expect(niceMax([9.5])).toBe(10)
  })

  it('computeFunnel：站良率、累計、損失、直通率、最大損失', () => {
    const r = computeFunnel([
      { label: '投入', count: 1000 },
      { label: 'SMT', count: 980 },
      { label: 'AOI', count: 930 },
      { label: 'ICT', count: 920 },
      { label: 'FCT', count: 870 },
    ])
    expect(r.rty).toBe(0.87)
    expect(r.totalLoss).toBe(130)
    expect(r.rows.map((x) => x.loss)).toEqual([0, 20, 50, 10, 50])
    expect(r.rows[1].stepYield).toBe(0.98)
    expect(r.rows[0].stepYield).toBeNull()
    expect(r.rows[2].cumulative).toBe(0.93)
    // AOI 與 FCT 都損失 50：取良率較低的 FCT（870/920 < 930/980）
    expect(r.worstIndex).toBe(4)
    expect(r.rows[2].lossShare).toBeCloseTo(50 / 130)
  })

  it('computeFunnel：沒有損失、空資料、數量增加（重工回流）、非數字', () => {
    expect(computeFunnel([{ label: 'a', count: 10 }, { label: 'b', count: 10 }]).worstIndex).toBe(-1)
    const empty = computeFunnel([])
    expect(empty).toEqual({ rows: [], rty: null, totalLoss: 0, worstIndex: -1 })
    const r = computeFunnel([{ label: 'a', count: 0 }, { label: 'b', count: 5 }, { label: 'c', count: NaN }])
    expect(r.rty).toBeNull()
    expect(r.rows[1].stepYield).toBeNull()
    expect(r.rows[1].loss).toBe(0)
    expect(r.rows[2].count).toBe(0)
  })
})

describe('BulletChart', () => {
  const items = [
    { key: 'L1', label: 'SMT-1', value: 92, target: 90, previous: 88, unit: '%' },
    { key: 'L2', label: 'SMT-2', sublabel: '夜班', value: 74, target: 90, unit: '%' },
    { key: 'L3', label: 'DIP', value: null, target: 85 },
  ]

  async function mountBullet(props: Record<string, unknown> = {}) {
    wrapper = mount(BulletChart, { props: { items, bands, max: 100, ...props }, attachTo: document.body })
    await nextTick()
    return wrapper
  }

  it('每一列：區間、實際值長條、目標線、前期值；meter 念出數值、目標與狀態', async () => {
    const w = await mountBullet()
    const rows = w.findAll('.bullet-row')
    expect(rows).toHaveLength(3)
    const first = rows[0]
    expect(first.findAll('.bullet-band')).toHaveLength(3)
    expect((first.find('.bullet-value').element as HTMLElement).style.width).toBe('92%')
    expect((first.find('.bullet-target').element as HTMLElement).style.left).toBe('calc(90% - 1.5px)')
    expect(first.find('.bullet-previous').exists()).toBe(true)
    const meter = first.find('[role="meter"]')
    expect(meter.attributes('aria-valuenow')).toBe('92')
    expect(meter.attributes('aria-valuemax')).toBe('100')
    expect(meter.attributes('aria-valuetext')).toBe('92%, 目標 90%, 達標')
    expect(first.find('.bullet-status').text()).toContain('達標')
    expect(rows[1].find('.bullet-status').text()).toContain('注意')
    expect(rows[1].text()).toContain('夜班')
  })

  it('狀態色：實際值長條依區間的 status 上色', async () => {
    const w = await mountBullet()
    const bg = (i: number) => (w.findAll('.bullet-value')[i].element as HTMLElement).style.background
    expect(bg(0)).toContain('success-solid')
    expect(bg(1)).toContain('warning-solid')
  })

  it('沒有數值時顯示 —、沒有長條；沒有區間標籤時右側顯示目標', async () => {
    const w = await mountBullet({ bands: null })
    const dip = w.findAll('.bullet-row')[2]
    expect(dip.find('.bullet-value').exists()).toBe(false)
    expect(dip.find('.bullet-value-text').text()).toBe('—')
    expect(dip.find('[role="meter"]').attributes('aria-valuenow')).toBeUndefined()
    expect(dip.text()).toContain('目標 85')
  })

  it('沒有 max 時各列自動取上限；各列的 bands / max 優先', async () => {
    const w = await mountBullet({ max: null, items: [{ label: 'A', value: 1180, target: 1000 }, { label: 'B', value: 3, max: 4, bands: [{ to: 2 }] }] })
    const meters = w.findAll('[role="meter"]')
    expect(meters[0].attributes('aria-valuemax')).toBe('1200')
    expect(meters[1].attributes('aria-valuemax')).toBe('4')
    expect(w.findAll('.bullet-row')[1].findAll('.bullet-band')).toHaveLength(1)
  })

  it('綁 @item-click 時每一列是按鈕', async () => {
    const clicked: unknown[] = []
    wrapper = mount(BulletChart, { props: { items, onItemClick: (i: unknown) => clicked.push(i) }, attachTo: document.body })
    await wrapper.findAll('button.bullet-track')[1].trigger('click')
    expect(clicked).toEqual([items[1]])
    wrapper.unmount()
    wrapper = mount(BulletChart, { props: { items }, attachTo: document.body })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('valueFormat、title、enUS', async () => {
    wrapper = mount(
      { render: () => h(ChptConfigProvider, { locale: enUS }, () => h(BulletChart, { items: [items[0]], title: 'OEE', valueFormat: (v: number) => v.toFixed(1) })) },
      { attachTo: document.body }
    )
    expect(wrapper.find('h3').text()).toBe('OEE')
    expect(wrapper.find('[role="meter"]').attributes('aria-valuetext')).toBe('92.0%, target 90.0%')
  })
})

describe('YieldFunnel', () => {
  const steps = [
    { label: '投入', count: 1000 },
    { label: 'SMT', count: 980 },
    { label: 'AOI', count: 930 },
    { label: 'FCT', count: 900 },
  ]

  it('直通率、各站數量與長條寬度、站良率與損失、最大損失', async () => {
    wrapper = mount(YieldFunnel, { props: { steps, unit: 'pcs', title: 'PCBA 良率' }, attachTo: document.body })
    expect(wrapper.find('.funnel-rty').text()).toContain('90.0%')
    expect(wrapper.find('h3').text()).toBe('PCBA 良率')
    const bars = wrapper.findAll('.funnel-bar').map((b) => (b.element as HTMLElement).style.width)
    expect(bars).toEqual(['100%', '98%', '93%', '90%'])
    const links = wrapper.findAll('.funnel-link').map((l) => l.text().replace(/\s+/g, ' '))
    expect(links[0]).toContain('站良率 98.0%')
    expect(links[0]).toContain('損失 20')
    expect(links[1]).toContain('最大損失')
    expect(wrapper.findAll('.funnel-worst')).toHaveLength(1)
    expect(wrapper.findAll('.funnel-row')[2].attributes('aria-label')).toBe('AOI, 930pcs, 站良率 94.9%, 損失 50, 累計 93.0%, 最大損失')
    expect(wrapper.findAll('.funnel-row')[0].attributes('aria-label')).toBe('投入, 1,000pcs')
  })

  it('highlightWorst=false、align=center、percentDigits、color', async () => {
    wrapper = mount(YieldFunnel, { props: { steps, highlightWorst: false, align: 'center', percentDigits: 2, color: '#123456' }, attachTo: document.body })
    expect(wrapper.find('.funnel-worst').exists()).toBe(false)
    expect(wrapper.find('.funnel-rty').text()).toContain('90.00%')
    expect((wrapper.find('.funnel-link').element as HTMLElement).style.justifyContent).toBe('center')
    expect((wrapper.find('.funnel-bar').element as HTMLElement).style.background).toBe('rgb(18, 52, 86)')
  })

  it('綁 @step-click 時每一站是按鈕；空資料', async () => {
    const got: unknown[] = []
    wrapper = mount(YieldFunnel, { props: { steps, onStepClick: (s: unknown, r: { loss: number }) => got.push([s, r.loss]) }, attachTo: document.body })
    await wrapper.findAll('button.funnel-row')[2].trigger('click')
    expect(got).toEqual([[steps[2], 50]])
    wrapper.unmount()
    wrapper = mount(YieldFunnel, { props: { steps: [] }, attachTo: document.body })
    expect(wrapper.text()).toContain('沒有資料')
    expect(wrapper.find('.funnel-rty').exists()).toBe(false)
  })

  it('enUS', async () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(YieldFunnel, { steps })) }, { attachTo: document.body })
    expect(wrapper.find('.funnel-rty').text()).toContain('Rolled throughput yield')
    expect(wrapper.text()).toContain('20 lost')
    expect(wrapper.text()).toContain('Largest loss')
  })
})
