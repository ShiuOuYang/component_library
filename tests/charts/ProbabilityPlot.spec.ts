import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ProbabilityPlot from '@/components/library/charts/ProbabilityPlot.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

const data = [4.4, 2.1, 5.9, 3.3, 7.5, 2.9, 4.7, 3.6, 5.2, 4.0]
const skewed = [1, 1.1, 1.2, 1.1, 1, 1.3, 1.2, 9, 12, 30, 1, 1.1, 1.05, 1.2, 50]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const dist = ref((props.distribution as string) ?? 'normal')
  const events: { name: string; args: unknown[] }[] = []
  const node = () =>
    h(ProbabilityPlot, {
      values: data,
      width: 500,
      height: 360,
      ...props,
      distribution: dist.value,
      'onUpdate:distribution': (d: string) => (dist.value = d),
      onPointClick: (p: unknown) => events.push({ name: 'point-click', args: [p] }),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  return { w, dist, events }
}

describe('ProbabilityPlot', () => {
  it('畫點、配適線、信賴帶、機率刻度；統計表與判定', () => {
    const { w } = mountIt({ title: '扭力', unit: 'N·m' })
    expect(w.findAll('circle')).toHaveLength(10)
    expect(w.findAll('path')).toHaveLength(2)
    const texts = w.findAll('svg text').map((t) => t.text())
    expect(texts).toContain('50')
    expect(texts).toContain('%')
    expect(texts).toContain('N·m')
    const row = w.find('tbody tr').text()
    expect(row).toContain('10')
    expect(row).toContain('4.36')
    expect(row).toContain('1.568')
    expect(row).toContain('0.165')
    expect(row).toContain('符合')
    // 只有一組時沒有名稱欄
    expect(w.findAll('thead th')).toHaveLength(6)
    expect(w.find('svg').attributes('aria-label')).toMatch(/^扭力（常態）：扭力：N 10，p 0\.\d{3}，符合$/)
    expect(w.text()).toContain('p < 0.05 判定不符合')
  })

  it('切換分配：按鈕、v-model；Weibull 顯示形狀 / 尺度與 > 0.250；對數常態排除 ≤ 0', async () => {
    const { w, dist } = mountIt({ values: [...data, 0, -2] })
    const btn = (label: string) => w.findAll('[role="group"] button').find((b) => b.text() === label)!
    expect(btn('常態').attributes('aria-pressed')).toBe('true')
    await btn('Weibull').trigger('click')
    expect(dist.value).toBe('weibull')
    expect(w.find('thead').text()).toContain('形狀')
    expect(w.find('tbody').text()).toContain('> 0.250')
    expect(w.find('tbody').text()).toContain('3.068')
    expect(w.find('tbody').text()).toContain('（排除 2）')
    dist.value = 'lognormal'
    await nextTick()
    expect(btn('對數常態').attributes('aria-pressed')).toBe('true')
    expect(w.findAll('circle')).toHaveLength(10)
    expect(w.find('tbody').text()).toContain('0.096')
  })

  it('不符合：帶外的點標紅、判定標紅；p < 0.005', () => {
    const { w } = mountIt({ values: skewed })
    expect(w.find('tbody').text()).toContain('< 0.005')
    expect(w.find('tbody').text()).toContain('不符合')
    expect(w.findAll('circle').some((c) => c.attributes('style')!.includes('danger-solid'))).toBe(true)
  })

  it('多組：圖例色、名稱欄；提示含組名與信賴帶外', async () => {
    const { w } = mountIt({ series: [{ name: 'A 線', values: data }, { name: 'B 線', values: skewed, color: 'rgb(9, 9, 9)' }, { name: '太少', values: [1, 2] }] })
    expect(w.findAll('tbody tr')).toHaveLength(2)
    expect(w.findAll('thead th')).toHaveLength(7)
    expect(w.find('tbody').text()).toContain('A 線')
    expect(w.findAll('path').some((p) => p.attributes('style')!.includes('rgb(9, 9, 9)'))).toBe(true)
    const red = w.findAll('circle').find((c) => c.attributes('style')!.includes('danger-solid'))!
    await red.trigger('mouseenter')
    const tip = w.find('.pointer-events-none.absolute').text()
    expect(tip).toContain('B 線')
    expect(tip).toContain('在信賴帶外')
    expect(tip).toMatch(/第 \d+ \/ 15 小，累積/)
    await w.find('svg').trigger('mouseleave')
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
  })

  it('點擊點送出 point-click（原始索引、秩、機率）', async () => {
    const { w, events } = mountIt()
    await w.findAll('circle')[0].trigger('click')
    expect(events[0].args[0]).toMatchObject({ value: 2.1, index: 1, rank: 1 })
  })

  it('關掉信賴帶、統計表、分配切換；全部相同（退化）不畫線', () => {
    const { w } = mountIt({ showBand: false, showStats: false, showPicker: false })
    expect(w.findAll('path')).toHaveLength(1)
    expect(w.find('table').exists()).toBe(false)
    expect(w.find('[role="group"]').exists()).toBe(false)
    expect(w.findAll('circle').every((c) => !c.attributes('style')!.includes('danger-solid'))).toBe(true)
    const same = mountIt({ values: [3, 3, 3, 3] })
    expect(same.w.findAll('path')).toHaveLength(0)
    expect(same.w.find('tbody').text()).toContain('—')
    const sameW = mountIt({ values: [3, 3, 3, 3], distribution: 'weibull' })
    expect(sameW.w.find('tbody').text()).toContain('—')
  })

  it('資料不足顯示提示；矮的圖用精簡刻度；valueFormat；對數軸刻度', () => {
    expect(mountIt({ values: [1, 2] }).w.text()).toContain('資料不足')
    expect(mountIt({ values: [], emptyText: '沒資料' }).w.text()).toContain('沒資料')
    const short = mountIt({ height: 200, values: Array.from({ length: 30 }, (_, i) => i + 1) })
    const ys = short.w.findAll('svg text').map((t) => t.text())
    expect(ys).not.toContain('40')
    const f = mountIt({ valueFormat: (v: number) => `${v.toFixed(1)}!` })
    expect(f.w.findAll('svg text').some((t) => t.text().endsWith('!'))).toBe(true)
    const wide = mountIt({ width: 900, distribution: 'lognormal', values: [0.5, 1, 3, 8, 20, 60, 150, 400, 900, 2000] })
    expect(wide.w.findAll('svg text').length).toBeGreaterThan(10)
  })

  it('英文語系', () => {
    const { w } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.find('thead').text()).toContain('StDev')
    expect(w.find('tbody').text()).toContain('Fits')
    expect(w.find('svg').attributes('aria-label')).toMatch(/^Probability plot \(Normal\): Data: N 10/)
  })
})
