import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import DumbbellChart from '@/components/library/charts/DumbbellChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { DumbbellRow } from '@/components/library/charts/utils/dumbbell'

const data = [
  { label: '印刷', before: 1850, after: 620 },
  { label: '手焊', before: 980, after: 1040 },
  { label: '包裝', before: 120, after: 120 },
  { label: '燒錄', before: 300, after: null },
  { label: '新站', before: undefined, after: 400, color: 'purple' },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const clicks: DumbbellRow[] = []
  const node = () => h(DumbbellChart, { data, width: 640, direction: 'lower', unit: 'ppm', ...props, onItemClick: (r: DumbbellRow) => clicks.push(r) })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const row = (label: string) => w.find(`[data-row="${label}"]`)
  const order = () => w.findAll('[data-row]').map((r) => r.attributes('data-row'))
  return { w, row, order, clicks, vm: () => w.findComponent(DumbbellChart).vm as unknown as { rows: () => DumbbellRow[]; summary: () => Record<string, unknown> } }
}

describe('DumbbellChart', () => {
  it('啞鈴圖：每列兩個點、變化欄、好壞顏色與符號、缺值、圖例摘要、aria、資料表', () => {
    const { w, row, vm } = mountIt({ title: '不良率' })
    expect(w.findAll('[data-row]')).toHaveLength(5)
    expect(row('印刷').find('[data-bar]').exists()).toBe(true)
    expect(row('印刷').find('[data-change]').text()).toBe('▲−1,230')
    expect(row('印刷').find('[data-change]').attributes('style')).toContain('success-solid')
    expect(row('手焊').find('[data-change]').text()).toBe('▼+60')
    expect(row('手焊').find('[data-change]').attributes('style')).toContain('danger-solid')
    expect(row('包裝').find('[data-change]').text()).toBe('0')
    // 缺值：只畫有的點、沒有線
    expect(row('燒錄').find('[data-bar]').exists()).toBe(false)
    expect(row('燒錄').find('[data-before]').exists()).toBe(true)
    expect(row('燒錄').find('[data-after]').exists()).toBe(false)
    expect(row('燒錄').find('[data-change]').text()).toBe('無資料')
    expect(row('新站').find('[data-after]').attributes('style')).toContain('purple')
    expect(w.find('[data-summary]').text()).toBe('▲改善 1▼變差 1=持平 1')
    expect(w.find('svg[role="group"]').attributes('aria-label')).toBe('不良率：5 個項目，改善 1、變差 1、持平 1')
    expect(row('手焊').attributes('aria-label')).toBe('手焊，前：980 ppm，後：1,040 ppm，變化：+60 ppm (+6.1%) 變差')
    expect(row('燒錄').attributes('aria-label')).toBe('燒錄，前：300 ppm，後：無資料')
    expect(w.findAll('tbody tr')[0].text()).toBe('印刷1,850 ppm620 ppm▲−1,230 改善')
    expect(vm().summary()).toMatchObject({ better: 1, worse: 1, same: 1, compared: 3 })
    // 高度依列數
    expect(w.find('svg[role="group"]').attributes('height')).toBe(String(22 + 22 + 5 * 28))
    // 數值：前值在遠離後值的一側
    const vals = row('印刷').findAll('[data-value]')
    expect(vals.map((v) => [v.text(), v.attributes('text-anchor')])).toEqual([
      ['1,850', 'start'],
      ['620', 'end'],
    ])
  })

  it('排序、百分比、不顯示變化欄與數值、參考線、指定範圍', async () => {
    const a = mountIt({ sort: 'change' })
    expect(a.order()).toEqual(['印刷', '包裝', '手焊', '燒錄', '新站'])
    expect(a.vm().rows().map((r) => r.label)).toEqual(a.order())
    const b = mountIt({ sort: 'after', sortDescending: false, showChange: 'percent', reference: 500, referenceLabel: '目標' })
    expect(b.order()).toEqual(['包裝', '新站', '印刷', '手焊', '燒錄'])
    expect(b.row('印刷').find('[data-change]').text()).toBe('▲−66.5%')
    expect(b.w.find('[data-reference]').exists()).toBe(true)
    expect(b.w.text()).toContain('目標')
    // before 為 0 時百分比改顯示數值
    const zero = mountIt({ data: [{ label: 'z', before: 0, after: 5 }], showChange: 'percent', direction: 'higher' })
    expect(zero.row('z').find('[data-change]').text()).toBe('▲+5')
    const c = mountIt({ showChange: 'none', showValues: false, domain: [0, 3000], reference: 700 })
    expect(c.w.find('[data-change]').exists()).toBe(false)
    expect(c.w.find('[data-value]').exists()).toBe(false)
    expect(c.w.find('[data-reference]').exists()).toBe(true)
    expect(c.w.text()).toContain('700')
    // 刻度依 domain
    expect(c.w.findAll('svg > g[aria-hidden] text').map((t) => t.text())).toContain('3,000')
  })

  it('direction none：不判斷好壞、沒有摘要；includeZero；valueFormat；空資料', () => {
    const { w, row } = mountIt({ direction: 'none', includeZero: true, valueFormat: (v: number) => `${v / 1000}k`, beforeLabel: '甲', afterLabel: '乙' })
    expect(w.find('[data-summary]').exists()).toBe(false)
    expect(row('手焊').find('[data-change]').text()).toBe('+0.06k')
    expect(row('手焊').find('[data-after]').attributes('style')).toContain('chart-1')
    expect(w.find('[data-legend="before"]').text()).toBe('甲')
    expect(w.find('svg[role="group"]').attributes('aria-label')).toBe('啞鈴圖：5 個項目')
    const empty = mountIt({ data: [], emptyText: '空' })
    expect(empty.w.text()).toContain('空')
    expect(empty.w.find('svg[role="group"]').exists()).toBe(false)
  })

  it('斜率圖：兩條軸、每項一條線、標籤避讓、缺值只畫一端、參考線', () => {
    const { w, row } = mountIt({ mode: 'slope', height: 300, beforeLabel: '10 月', afterLabel: '11 月', reference: 500 })
    expect(w.find('svg[role="group"]').attributes('height')).toBe('300')
    expect(w.text()).toContain('10 月')
    expect(row('印刷').findAll('[data-bar]')).toHaveLength(1)
    expect(row('燒錄').find('[data-bar]').exists()).toBe(false)
    expect(row('燒錄').find('[data-after]').exists()).toBe(false)
    expect(row('新站').find('[data-before]').exists()).toBe(false)
    expect(w.find('[data-reference]').exists()).toBe(true)
    // 左側標籤彼此至少 13px
    const ys = w.findAll('[data-row] text[text-anchor="end"]').map((t) => Number(t.attributes('y'))).sort((a, b) => a - b)
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(12.99)
    // 自動高度
    const auto = mountIt({ mode: 'slope' })
    expect(auto.w.find('svg[role="group"]').attributes('height')).toBe('220')
  })

  it('滑過：tooltip、其他列淡化；鍵盤 ↑↓ Home End Enter Escape；點擊', async () => {
    const { w, row, clicks } = mountIt()
    await row('手焊').trigger('mouseenter')
    expect(w.find('.pointer-events-none.absolute').text()).toContain('變化：+60 ppm (+6.1%) 變差')
    expect(row('印刷').attributes('style')).toContain('opacity: 0.35')
    await w.find('svg[role="group"]').trigger('mouseleave')
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
    await row('印刷').trigger('click')
    expect(clicks.map((c) => c.label)).toEqual(['印刷'])
    const first = w.find('[data-row][tabindex="0"]')
    expect(first.attributes('data-row')).toBe('印刷')
    await first.trigger('focus')
    expect(w.find('[aria-live="polite"]').text()).toContain('印刷')
    await first.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(document.activeElement?.getAttribute('data-row')).toBe('手焊')
    expect(w.find('[data-row][tabindex="0"]').attributes('data-row')).toBe('手焊')
    await row('手焊').trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement?.getAttribute('data-row')).toBe('新站')
    await row('新站').trigger('keydown', { key: 'ArrowDown' })
    await row('新站').trigger('keydown', { key: 'Home' })
    await nextTick()
    await row('印刷').trigger('keydown', { key: 'ArrowUp' })
    await row('印刷').trigger('keydown', { key: 'Enter' })
    await row('印刷').trigger('keydown', { key: 'q' })
    expect(clicks).toHaveLength(2)
    await row('印刷').trigger('focus')
    await row('印刷').trigger('keydown', { key: 'Escape' })
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
    await row('印刷').trigger('blur')
    // 斜率圖的 tooltip
    const s = mountIt({ mode: 'slope', height: 300 })
    await s.row('燒錄').trigger('mouseenter')
    expect(s.w.find('.pointer-events-none.absolute').text()).toContain('後：無資料')
    await s.row('新站').trigger('mouseenter')
    expect(s.w.find('.pointer-events-none.absolute').text()).toContain('前：無資料')
  })

  it('長名稱截斷；英文語系', () => {
    const long = mountIt({ data: [{ label: '非常非常非常非常非常非常非常非常非常長的工站名稱', before: 1, after: 2 }], width: 300 })
    expect(long.w.find('[data-row] text').text()).toMatch(/…$/)
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.find('svg[role="group"]').attributes('aria-label')).toBe('Dumbbell chart: 5 items, 1 better, 1 worse, 1 unchanged')
    expect(en.row('手焊').attributes('aria-label')).toBe('手焊, Before: 980 ppm, After: 1,040 ppm, Change: +60 ppm (+6.1%) Worse')
    const one = mountIt({ data: [{ label: 'x', before: 1, after: 2 }], direction: 'none' }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(one.w.find('svg[role="group"]').attributes('aria-label')).toBe('Dumbbell chart: 1 item')
  })
})
