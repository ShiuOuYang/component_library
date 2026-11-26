import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import MarimekkoChart from '@/components/library/charts/MarimekkoChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { MekkoCell, MekkoData } from '@/components/library/charts/utils/marimekko'

const rows = [
  { x: 'L1', y: '錫橋', value: 30 },
  { x: 'L1', y: '空焊', value: 10 },
  { x: 'L2', y: '錫橋', value: 10 },
  { x: 'L2', y: '空焊', value: 50 },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const selected = ref<string | null>((props.selected as string) ?? null)
  const emitted: Record<string, unknown[]> = {}
  const node = () =>
    h(MarimekkoChart, {
      data: rows,
      width: 500,
      unit: '件',
      ...props,
      selected: selected.value,
      'onUpdate:selected': (v: string | null) => ((emitted.selected ??= []).push(v), (selected.value = v)),
      onCellClick: (c: MekkoCell) => (emitted.click ??= []).push(c),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  return { w, emitted, selected, vm: () => w.findComponent(MarimekkoChart).vm as unknown as { result: () => MekkoData } }
}
const cell = (w: VueWrapper, k: string) => w.find(`[data-cell="${k}"]`)

describe('MarimekkoChart', () => {
  it('欄寬依總量、格高依比例、標籤、圖例、合計、隱藏表', () => {
    const { w, vm } = mountIt({ title: '不良' })
    expect(w.find('h3').text()).toBe('不良')
    expect(w.find('[data-total]').text()).toBe('合計 100 件，2 欄')
    expect(w.findAll('[data-seg]').map((b) => b.text())).toEqual(['錫橋', '空焊'])
    const r1 = cell(w, 'L1|錫橋').find('rect')
    const r2 = cell(w, 'L2|錫橋').find('rect')
    // 可用寬 500 − 40 − 8 − 2 = 450：L1 40%、L2 60%
    expect(Number(r1.attributes('width'))).toBeCloseTo(180)
    expect(Number(r2.attributes('width'))).toBeCloseTo(270)
    expect(Number(r2.attributes('x'))).toBeCloseTo(182)
    expect(cell(w, 'L1|錫橋').find('text').text()).toBe('75.0%')
    expect(w.text()).toContain('40.0%')
    expect(w.find('svg').attributes('aria-label')).toBe('不良：2 欄、2 類')
    expect(w.findAll('tbody tr')[1].text()).toBe('L210 件（16.7%）50 件（83.3%）60 件')
    expect(vm().result().total).toBe(100)
  })

  it('滑過：tooltip 與外框；點格子送出；圖例標示淡化其他類別、v-model:selected', async () => {
    const { w, emitted, selected } = mountIt()
    await cell(w, 'L2|空焊').trigger('mouseenter')
    expect(w.find('[data-tip]').text()).toBe('L2 · 空焊50 件占 L2 的 83.3%，占全部的 50.0%')
    expect(w.find('[data-active]').exists()).toBe(true)
    await cell(w, 'L2|空焊').trigger('click')
    expect((emitted.click[0] as MekkoCell).value).toBe(50)
    await w.find('svg').trigger('mouseleave')
    expect(w.find('[data-tip]').exists()).toBe(false)
    await w.find('[data-seg="空焊"]').trigger('mouseenter')
    expect(cell(w, 'L1|錫橋').attributes('style')).toContain('opacity: 0.25')
    await w.find('[data-seg="空焊"]').trigger('mouseleave')
    await w.find('[data-seg="空焊"]').trigger('click')
    expect(selected.value).toBe('空焊')
    expect(w.find('[data-seg="空焊"]').attributes('aria-pressed')).toBe('true')
    expect(cell(w, 'L1|空焊').attributes('style')).toContain('opacity: 1')
    await w.find('[data-seg="空焊"]').trigger('click')
    expect(emitted.selected).toEqual(['空焊', null])
    selected.value = '錫橋'
    await nextTick()
    expect(cell(w, 'L1|空焊').attributes('style')).toContain('opacity: 0.25')
  })

  it('殘差模式：色階圖例、tooltip 含殘差、不淡化', async () => {
    const { w } = mountIt({ mode: 'residual', selected: '錫橋' })
    expect(w.find('[data-seg]').exists()).toBe(false)
    expect(w.find('[data-legend]').text()).toContain('比預期少')
    expect(w.find('[data-mode]').text()).toContain('Pearson')
    expect(cell(w, 'L1|空焊').attributes('style')).toContain('opacity: 1')
    // L1 錫橋：期望 40 × 40 / 100 = 16、殘差 (30 − 16) / 4 = 3.5 → 紅
    expect(cell(w, 'L1|錫橋').find('rect').attributes('style')).toContain('--t-danger-solid')
    expect(cell(w, 'L2|錫橋').find('rect').attributes('style')).toContain('--t-accent')
    await cell(w, 'L1|錫橋').trigger('mouseenter')
    expect(w.find('[data-tip]').text()).toContain('殘差 +3.50（預期 16 件）')
  })

  it('鍵盤：←→ 欄、↑↓ 類別、Home / End、Enter 送出、Esc 取消標示', async () => {
    const { w, emitted, selected } = mountIt({ selected: '錫橋' })
    const svg = w.find('svg')
    const live = () => w.find('[data-live]').text()
    await svg.trigger('focus')
    expect(live()).toBe('L1 · 錫橋；30 件；占 L1 的 75.0%，占全部的 30.0%')
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toMatch(/^L2 · 錫橋/)
    await svg.trigger('keydown', { key: 'ArrowUp' })
    expect(live()).toMatch(/^L2 · 空焊/)
    await svg.trigger('keydown', { key: 'ArrowUp' })
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toMatch(/^L2 · 空焊/)
    await svg.trigger('keydown', { key: 'Home' })
    await svg.trigger('keydown', { key: 'ArrowDown' })
    expect(live()).toMatch(/^L1 · 錫橋/)
    await svg.trigger('keydown', { key: 'End' })
    await svg.trigger('keydown', { key: 'ArrowLeft' })
    expect(live()).toMatch(/^L1 · 錫橋/)
    await svg.trigger('keydown', { key: 'Enter' })
    expect((emitted.click[0] as MekkoCell).x).toBe('L1')
    await svg.trigger('keydown', { key: 'Escape' })
    expect(selected.value).toBeNull()
    await svg.trigger('keydown', { key: 'Escape' })
    await svg.trigger('keydown', { key: 'x' })
    // 鍵盤操作中滑鼠離開不清掉
    await svg.trigger('mouseleave')
    expect(w.find('[data-tip]').exists()).toBe(true)
    await svg.trigger('blur')
    expect(w.find('[data-tip]').exists()).toBe(false)
  })

  it('併成其他（灰色）、自訂顏色、窄欄不畫標籤、換資料清掉標示、空資料、數值格式、英文語系', async () => {
    const many = ['a', 'b', 'c', 'd'].map((y, i) => ({ x: 'X', y, value: 10 - i }))
    const f = mountIt({ data: [...many, { x: 'Y', y: 'a', value: 1 }], maxSegments: 3 })
    expect(f.w.findAll('[data-seg]').map((b) => b.text())).toEqual(['a', 'b', '其他'])
    expect(f.w.find('[data-seg="其他"] span').attributes('style')).toContain('stroke-dark')
    expect(f.w.findAll('text').some((t) => t.text() === 'Y')).toBe(false) // Y 欄太窄
    const c = mountIt({ colors: ['red', 'blue'] })
    expect(c.w.find('[data-seg="空焊"] span').attributes('style')).toContain('blue')
    const wrap = mount(MarimekkoChart, { props: { data: rows, width: 400 }, attachTo: document.body })
    mounted.push(wrap)
    await wrap.find('[data-seg="空焊"]').trigger('click')
    await wrap.setProps({ data: rows.filter((r) => r.y === '錫橋') })
    await wrap.setProps({ data: rows })
    expect(wrap.find('[data-seg="空焊"]').attributes('aria-pressed')).toBe('false')
    expect(mountIt({ data: [] }).w.text()).toContain('沒有資料')
    expect(mountIt({ data: [], emptyText: '無' }).w.text()).toContain('無')
    expect(mountIt({ valueFormat: (v: number) => `${v}!`, unit: '' }).w.find('[data-total]').text()).toBe('合計 100!，2 欄')
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.find('[data-total]').text()).toBe('Total 100 件, 2 columns')
    expect(en.w.find('svg').attributes('aria-label')).toBe('Marimekko chart: 2 columns, 2 categories')
  })
})
