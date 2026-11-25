import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import BumpChart from '@/components/library/charts/BumpChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { BumpRow } from '@/components/library/charts/utils/bump'

const periods = ['1 月', '2 月', '3 月']
const series = [
  { name: '一線', values: [98.1, 98.5, 99.0] },
  { name: '二線', values: [99.2, 98.9, 98.2] },
  { name: '三線', values: [98.5, 98.5, 98.6], color: 'teal' },
  { name: '四線', values: [null, 97.0, 97.5] },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const selected = ref<string | null>((props.selected as string | null) ?? null)
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  const node = () =>
    h(BumpChart, {
      series,
      periods,
      width: 640,
      unit: '%',
      ...props,
      selected: selected.value,
      'onUpdate:selected': (v: string | null) => (rec('selected')(v), (selected.value = v)),
      onSeriesClick: rec('click'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const s = (name: string) => w.find(`[data-series="${name}"]`)
  const vm = () => w.findComponent(BumpChart).vm as unknown as { rows: () => BumpRow[] }
  return { w, s, emitted, selected, vm }
}

describe('BumpChart', () => {
  it('每條線、點裡的名次、兩端標籤與變化、缺期、aria、名次表、自動高度', () => {
    const { w, s, vm } = mountIt({ title: '良率' })
    expect(w.findAll('[data-series]')).toHaveLength(4)
    expect(s('一線').findAll('[data-point]').map((p) => p.text())).toEqual(['3', '2', '1'])
    expect(s('四線').findAll('[data-point]').map((p) => p.attributes('data-point'))).toEqual(['1', '2'])
    expect(s('一線').find('[data-label="end"]').text().replace(/\s+/g, ' ')).toBe('一線 ▲2')
    expect(s('二線').find('[data-label="end"]').text()).toContain('▼2')
    expect(s('四線').find('[data-label="end"]').text()).toContain('=')
    expect(s('三線').find('[data-line]').attributes('style')).toContain('teal')
    expect(s('一線').attributes('aria-label')).toBe('一線，1 月 第 3 名 → 3 月 第 1 名，進步 2 名，最佳第 1 名')
    expect(w.find('svg').attributes('aria-label')).toBe('良率：4 個項目、3 期')
    expect(w.findAll('tbody tr')[0].text()).toBe('一線第 3 名（98.1 %）第 2 名（98.5 %）第 1 名（99 %）進步 2 名')
    expect(w.findAll('tbody tr').at(-1)!.text()).toContain('無資料')
    // 二線、三線第 2 期都是 98.5 / 98.9…：同名次標籤錯開
    expect(Number(w.find('svg').attributes('height'))).toBe(28 + 3 * 30 + 14 + 24)
    expect(vm().rows()[0].change).toBe(2)
  })

  it('實際值模式、越小越好、直接給名次、直線、指定高度、名次相同錯開標籤', () => {
    const val = mountIt({ display: 'value' })
    expect(val.s('一線').find('[data-point] text').exists()).toBe(false)
    expect(val.w.findAll('[data-tick]').length).toBeGreaterThan(1)
    const asc = mountIt({ order: 'asc' })
    expect(asc.s('一線').findAll('[data-point]').map((p) => p.text())).toEqual(['1', '2', '4'])
    const given = mountIt({ series: [{ name: 'X', values: [2, 1] }, { name: 'Y', values: [1, 2] }], periods: ['Q1', 'Q2'], valueType: 'rank', curve: 'linear', height: 200 })
    expect(given.s('X').find('[data-label="end"]').text()).toContain('▲1')
    expect(given.w.find('svg').attributes('height')).toBe('200')
    expect(given.w.findAll('tbody tr')[0].text()).toBe('X第 2 名第 1 名進步 1 名') // 依最後一期名次排
    // 名次相同：起點標籤上下錯開
    const tie = mountIt({ series: [{ name: 'P', values: [5, 1] }, { name: 'Q', values: [5, 2] }], periods: ['a', 'b'] })
    const ys = ['P', 'Q'].map((n) => Number(tie.s(n).find('[data-label="start"]').attributes('y')))
    expect(Math.abs(ys[0] - ys[1])).toBe(13)
    // 數值全部相同
    const flat = mountIt({ series: [{ name: 'F', values: [5, 5] }], periods: ['a', 'b'], display: 'value' })
    expect(flat.s('F').findAll('[data-point]')).toHaveLength(2)
    const empty = mountIt({ series: [], emptyText: '空' })
    expect(empty.w.text()).toContain('空')
    const noPeriods = mountIt({ periods: [] })
    expect(noPeriods.w.find('svg').exists()).toBe(false)
  })

  it('滑過高亮（其他淡化）、tooltip、點選 / 取消、外部改 selected', async () => {
    const { w, s, emitted, selected } = mountIt()
    await s('二線').trigger('mouseenter')
    expect(s('一線').find('[data-line]').attributes('style')).toContain('opacity: 0.35')
    expect(w.find('[data-overlay]').exists()).toBe(true)
    await s('二線').findAll('[data-point]')[1].trigger('mouseenter')
    expect(w.find('.pointer-events-none.absolute').text()).toBe('二線2 月第 1 名98.9 %')
    await w.find('svg').trigger('mouseleave')
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
    expect(w.find('[data-overlay]').exists()).toBe(false)
    await s('三線').trigger('click')
    expect(selected.value).toBe('三線')
    expect((emitted.click[0] as BumpRow).name).toBe('三線')
    expect(s('三線').attributes('aria-pressed')).toBe('true')
    expect(s('一線').find('[data-line]').attributes('style')).toContain('opacity: 0.35')
    await s('三線').trigger('click')
    expect(selected.value).toBeNull()
    selected.value = '四線'
    await nextTick()
    expect(s('四線').attributes('aria-pressed')).toBe('true')
  })

  it('鍵盤：↑↓ 換序列（依最後名次）、←→ 換期並念出、Enter 高亮、Esc 取消', async () => {
    const { w, s, emitted } = mountIt()
    const live = () => w.find('[aria-live]').text()
    // 最後一期第 1 名是一線：Tab 停在它
    expect(s('一線').attributes('tabindex')).toBe('0')
    await s('一線').trigger('focus')
    expect(live()).toContain('一線，1 月 第 3 名')
    await s('一線').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    // 最後一期：一線第 1、三線第 2
    expect(document.activeElement?.getAttribute('data-series')).toBe('三線')
    await s('三線').trigger('keydown', { key: 'ArrowUp' })
    await s('一線').trigger('keydown', { key: 'ArrowUp' }) // 已在最上面
    await s('一線').trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toBe('一線，1 月，第 3 名，98.1 %')
    await s('一線').trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toContain('2 月')
    await s('一線').trigger('keydown', { key: 'ArrowLeft' })
    expect(live()).toContain('1 月')
    await s('一線').trigger('keydown', { key: 'ArrowLeft' }) // 已在第一期
    expect(live()).toContain('1 月')
    await s('四線').trigger('keydown', { key: 'ArrowLeft' }) // 從最後一期開始
    expect(live()).toBe('四線，3 月，第 4 名，97.5 %')
    await s('四線').trigger('keydown', { key: 'Home' })
    await s('一線').trigger('keydown', { key: 'Enter' })
    expect(emitted.selected).toEqual(['一線'])
    await s('一線').trigger('keydown', { key: 'Escape' })
    expect(emitted.selected).toEqual(['一線', null])
    await s('一線').trigger('keydown', { key: 'Escape' })
    expect(emitted.selected).toHaveLength(2)
    await s('一線').trigger('blur')
    // 缺期的點
    await s('四線').trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toBe('四線，1 月，無資料')
  })

  it('期數多時變寬（可捲動）、長名稱截斷、數值格式、英文語系', () => {
    const many = mountIt({ periods: Array.from({ length: 24 }, (_, i) => `${i + 1}`), series: [{ name: 'A', values: Array.from({ length: 24 }, (_, i) => i) }], width: 300 })
    expect(Number(many.w.find('svg').attributes('width'))).toBeGreaterThan(300)
    const long = mountIt({ series: [{ name: '非常非常非常非常非常非常長的產線名稱', values: [1, 2, 3] }], width: 300 })
    expect(long.w.find('[data-label="start"]').text()).toMatch(/…$/)
    const f = mountIt({ valueFormat: (v: number) => `${v.toFixed(0)}!` })
    expect(f.w.findAll('tbody tr')[0].text()).toContain('98!')
    const en = mountIt({ unit: '' }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.find('svg').attributes('aria-label')).toBe('Bump chart: 4 items, 3 periods')
    expect(en.s('一線').attributes('aria-label')).toBe('一線, #3 in 1 月 → #1 in 3 月, up 2, best #1')
  })
})
