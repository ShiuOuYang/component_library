import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import RadarChart from '@/components/library/charts/RadarChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

const axes = [
  { key: 'q', label: '品質', max: 100 },
  { key: 'otd', label: '準時交貨', max: 100, unit: '%' },
  { key: 'ppm', label: '不良率', max: 1000, unit: 'ppm', lowerIsBetter: true },
]
const series = [
  { name: '板廠 A', values: { q: 92, otd: 96, ppm: 320 } },
  { name: '板廠 B', values: { q: 78, otd: null, ppm: 900 }, color: 'purple' },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
function mountIt(props: Record<string, unknown> = {}) {
  const w = mount(RadarChart, { props: { axes, series, width: 480, height: 400, ...props } as never, attachTo: document.body })
  mounted.push(w)
  return w
}

describe('RadarChart', () => {
  it('網格、軸、系列多邊形與點（沒有值的不畫點）、越小越好標 ↓、aria-label 與資料表', () => {
    const w = mountIt({ title: '供應商' })
    expect(w.findAll('polygon')).toHaveLength(4)
    expect(w.findAll('line')).toHaveLength(3)
    expect(w.findAll('path')).toHaveLength(2)
    expect(w.findAll('circle')).toHaveLength(5)
    expect(w.findAll('text').map((t) => t.text())).toEqual(['品質', '準時交貨', '不良率 ↓'])
    expect(w.findAll('path')[1].attributes('style')).toContain('purple')
    expect(w.find('svg').attributes('aria-label')).toBe('供應商：比較 板廠 A、板廠 B 的 品質、準時交貨、不良率。數值見下方資料表')
    const rows = w.findAll('table tbody tr').map((r) => r.findAll('th, td').map((c) => c.text()))
    expect(rows).toEqual([
      ['品質', '92', '78'],
      ['準時交貨', '96 %', '—'],
      ['不良率（越小越好）', '320 ppm', '900 ppm'],
    ])
  })

  it('滑過點顯示 tooltip 並突顯該系列；滑過多邊形只突顯不顯示 tooltip；離開恢復', async () => {
    const w = mountIt()
    await w.findAll('circle')[3].trigger('mouseenter') // 板廠 B 的第一個點（品質）
    expect(w.find('[data-export-ignore]').text()).toContain('品質：78')
    const opacity = () => w.findAll('svg > g.transition-opacity').map((g) => g.attributes('style'))
    expect(opacity()[0]).toContain('opacity: 0.15')
    expect(opacity()[1]).toContain('opacity: 1')
    await w.findAll('path')[0].trigger('mouseenter')
    expect(w.find('[data-export-ignore]').exists()).toBe(false)
    expect(opacity()[1]).toContain('opacity: 0.15')
    await w.find('svg').trigger('mouseleave')
    expect(opacity()[0]).toContain('opacity: 1')
  })

  it('圖例：點了隱藏 / 顯示（aria-pressed）並送出 visibility-change；滑過與聚焦突顯', async () => {
    const w = mountIt()
    const btn = () => w.findAll('[role="group"] button')
    await btn()[0].trigger('click')
    expect(btn()[0].attributes('aria-pressed')).toBe('false')
    expect(w.findAll('path')).toHaveLength(1)
    expect(w.emitted('visibility-change')![0]).toEqual([['板廠 B']])
    await btn()[0].trigger('click')
    expect(w.emitted('visibility-change')![1]).toEqual([['板廠 A', '板廠 B']])
    await btn()[1].trigger('mouseenter')
    expect(w.findAll('svg > g.transition-opacity')[0].attributes('style')).toContain('opacity: 0.15')
    await btn()[1].trigger('mouseleave')
    await btn()[1].trigger('focus')
    expect(w.findAll('svg > g.transition-opacity')[0].attributes('style')).toContain('opacity: 0.15')
    await btn()[1].trigger('blur')
    expect(w.findAll('svg > g.transition-opacity')[0].attributes('style')).toContain('opacity: 1')
  })

  it('valueFormat、levels、showLegend=false、沒有資料', async () => {
    const w = mountIt({ valueFormat: (v: number) => `#${v}`, levels: 2, showLegend: false })
    expect(w.findAll('polygon')).toHaveLength(2)
    expect(w.find('[role="group"]').exists()).toBe(false)
    expect(w.find('table tbody tr').text()).toContain('#92')
    expect(mountIt({ series: [] }).text()).toContain('沒有資料')
    expect(mountIt({ axes: [], emptyText: '無' }).text()).toContain('無')
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(RadarChart, { axes, series, width: 480, height: 400 })) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.find('svg').attributes('aria-label')).toContain('Radar chart: comparing 板廠 A, 板廠 B')
    expect(w.findAll('table tbody tr')[2].text()).toContain('(lower is better)')
  })
})
