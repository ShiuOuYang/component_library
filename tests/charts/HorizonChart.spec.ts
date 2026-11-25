import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import HorizonChart from '@/components/library/charts/HorizonChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { HorizonRow } from '@/components/library/charts/utils/horizon'

const T0 = new Date(2026, 10, 25, 8, 0).getTime()
const MIN = 60_000
const mk = (fn: (i: number) => number | null) => Array.from({ length: 11 }, (_, i) => ({ t: T0 + i * 10 * MIN, v: fn(i) }))
const series = [
  { name: '一區', data: mk((i) => 200 + i), baseline: 205, unit: '°C' },
  { name: '二區', data: mk((i) => (i === 5 ? null : 100 - i * 2)), baseline: 100 },
  { name: '空的', data: [] },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})
/** 寬 640：名稱欄約 50、數值欄 68 → 繪圖區從 x = plotLeft 開始 */
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  const node = () => h(HorizonChart, { series, width: 640, ...props, onCrosshairMove: rec('cross'), onRowClick: rec('click') })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const svg = () => w.find('svg[role="group"]')
  const row = (name: string) => w.find(`[data-row="${name}"]`)
  const vm = () => w.findComponent(HorizonChart).vm as unknown as { rows: () => HorizonRow[] }
  return { w, svg, row, emitted, vm }
}
const plotBounds = (w: VueWrapper) => {
  const r = w.find('rect[x]')
  return { left: Number(r.attributes('x')), width: Number(r.attributes('width')) }
}
function pointer(el: Element, type: string, x: number, y: number) {
  const e = new Event(type, { bubbles: true })
  Object.defineProperties(e, { clientX: { value: x }, clientY: { value: y } })
  el.dispatchEvent(e)
}

describe('HorizonChart', () => {
  it('每列兩邊各 bands 層、名稱、最新值、圖例、高度、aria、統計表', () => {
    const { w, svg, row } = mountIt({ title: '溫區' })
    expect(w.findAll('[data-row]')).toHaveLength(3)
    expect(row('一區').findAll('[data-band]')).toHaveLength(6)
    expect(row('一區').find('[data-band="p0"]').attributes('d')).toMatch(/^M/)
    // 二區有缺值：斷成兩段
    expect((row('二區').find('[data-band="n0"]').attributes('d')!.match(/M/g) ?? []).length).toBe(2)
    expect(row('一區').find('[data-readout]').text()).toBe('210 °C')
    expect(row('一區').find('[data-readout]').attributes('style')).toContain('danger')
    expect(row('二區').find('[data-readout]').attributes('style')).toContain('accent')
    expect(row('空的').find('[data-readout]').exists()).toBe(false)
    expect(svg().attributes('aria-label')).toBe('溫區：3 條序列')
    expect(svg().attributes('height')).toBe(String(4 + 3 * 30 - 2 + 22))
    expect(w.find('[data-legend="above"]').findAll('[aria-hidden] > span')).toHaveLength(3)
    expect(w.text()).toContain('每列各自比例')
    expect(w.findAll('tbody tr')[0].text()).toBe('一區205 °C200 °C210 °C205 °C210 °C')
    expect(w.findAll('tbody tr')[2].text()).toContain('沒有資料')
    // 時間刻度
    expect(w.findAll('svg > g[aria-hidden] text').map((t) => t.text())).toContain('09:00')
  })

  it('共用比例、層數、排序、平均基準、數值與時間格式、指定範圍', () => {
    const shared = mountIt({ scale: 'shared', bands: 2, sort: 'maxAbs', baseline: 'mean', valueFormat: (v: number) => v.toFixed(1), timeFormat: (d: Date) => `T${d.getHours()}` })
    expect(shared.w.text()).toContain('每層 10.0')
    expect(shared.row('一區').findAll('[data-band]')).toHaveLength(4)
    expect(shared.vm().rows().map((r) => r.name)).toEqual(['二區', '一區', '空的'])
    expect(shared.w.findAll('svg > g[aria-hidden] text').map((t) => t.text())).toContain('T9')
    const ranged = mountIt({ xDomain: [new Date(T0 + 30 * MIN), new Date(T0 + 60 * MIN)] })
    expect(ranged.w.findAll('svg > g[aria-hidden] text').map((t) => t.text())[0]).toBe('08:30')
    // 不合法的範圍：用資料範圍
    const bad = mountIt({ xDomain: ['a', 'b'] })
    expect(bad.w.findAll('svg > g[aria-hidden] text').map((t) => t.text())[0]).toBe('08:00')
    const one = mountIt({ series: [{ name: 'x', data: [{ t: T0, v: 1 }] }] })
    expect(one.w.find('[data-band]').exists()).toBe(true)
    const empty = mountIt({ series: [], emptyText: '空' })
    expect(empty.w.text()).toContain('空')
    // 多天：刻度只顯示日期
    const days = mountIt({ series: [{ name: 'd', data: [{ t: T0, v: 1 }, { t: T0 + 5 * 86_400_000, v: 2 }] }] })
    expect(days.w.findAll('svg > g[aria-hidden] text').map((t) => t.text())[0]).toMatch(/^\d\d\/\d\d$/)
  })

  it('滑過：十字線、tooltip、各列讀數、送出 crosshair-move；離開清掉；點列', async () => {
    const { w, svg, row, emitted } = mountIt()
    const { left, width } = plotBounds(w)
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 640, bottom: 200, width: 640, height: 200, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
    // 50 分（i = 5）、第二列
    pointer(svg().element, 'pointermove', left + width / 2, 4 + 30 + 10)
    await nextTick()
    expect(w.find('[data-crosshair]').exists()).toBe(true)
    expect((emitted.cross[0] as Date).getTime()).toBe(T0 + 50 * MIN)
    expect(w.find('.pointer-events-none.absolute').text()).toContain('二區')
    expect(w.find('.pointer-events-none.absolute').text()).toContain('沒有資料')
    expect(row('一區').find('[data-readout]').text()).toBe('205 °C')
    expect(row('一區').attributes('style')).toContain('opacity: 0.45')
    // 一區的 tooltip
    pointer(svg().element, 'pointermove', left + width * 0.2, 10)
    await nextTick()
    expect(w.find('.pointer-events-none.absolute').text()).toContain('偏離 −3 °C（基準 205 °C）')
    // 移到繪圖區外：清掉
    pointer(svg().element, 'pointermove', 5, 10)
    await nextTick()
    expect(w.find('[data-crosshair]').exists()).toBe(false)
    expect(emitted.cross.at(-1)).toBeNull()
    pointer(svg().element, 'pointermove', 5, 10) // 已清掉：不重複送
    await svg().trigger('pointerleave')
    await row('一區').trigger('click')
    expect((emitted.click[0] as HorizonRow).name).toBe('一區')
  })

  it('外部十字線（useChartSync）；關掉十字線', async () => {
    const { w, row } = mountIt({ crosshairValue: new Date(T0 + 20 * MIN) })
    expect(w.find('[data-crosshair]').exists()).toBe(true)
    expect(row('一區').find('[data-readout]').text()).toBe('202 °C')
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
    const iso = mountIt({ crosshairValue: new Date(T0 + 30 * MIN).toISOString() })
    expect(iso.row('一區').find('[data-readout]').text()).toBe('203 °C')
    const bad = mountIt({ crosshairValue: 'nope' })
    expect(bad.w.find('[data-crosshair]').exists()).toBe(false)
    const off = mountIt({ crosshair: false, crosshairValue: T0 })
    expect(off.w.find('[data-crosshair]').exists()).toBe(false)
    pointer(off.svg().element, 'pointermove', 300, 10)
    expect(off.emitted.cross).toBeUndefined()
    const noVals = mountIt({ showValues: false })
    expect(noVals.w.find('[data-readout]').exists()).toBe(false)
  })

  it('鍵盤：→ ← Home End 移動時間、↑↓ 換列、Esc 離開；念出讀數', async () => {
    const { w, svg, emitted } = mountIt()
    const live = () => w.find('[aria-live]').text()
    await svg().trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toBe('一區，11/25 08:00，200 °C，偏離 −5 °C（基準 205 °C）')
    await svg().trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toContain('08:10')
    await svg().trigger('keydown', { key: 'ArrowLeft' })
    expect(live()).toContain('08:00')
    await svg().trigger('keydown', { key: 'End' })
    expect(live()).toContain('09:40')
    await svg().trigger('keydown', { key: 'ArrowDown' })
    expect(live()).toContain('二區')
    await svg().trigger('keydown', { key: 'ArrowDown' })
    await svg().trigger('keydown', { key: 'ArrowDown' }) // 最後一列
    expect(live()).toContain('空的')
    await svg().trigger('keydown', { key: 'ArrowUp' })
    await svg().trigger('keydown', { key: 'Home' })
    expect(live()).toContain('08:00')
    expect(w.find('rect[stroke-width="2"]').exists()).toBe(true)
    await svg().trigger('keydown', { key: 'q' })
    await svg().trigger('keydown', { key: 'Escape' })
    expect(w.find('[data-crosshair]').exists()).toBe(false)
    expect(emitted.cross.at(-1)).toBeNull()
    await svg().trigger('keydown', { key: 'ArrowLeft' }) // 沒有十字線時 ← 從最後開始
    expect(live()).toContain('09:40')
    await svg().trigger('blur')
    // 沒有資料：不動
    const empty = mountIt({ series: [{ name: 'e', data: [] }] })
    await empty.svg().trigger('keydown', { key: 'ArrowRight' })
    expect(empty.w.find('[aria-live]').text()).toBe('')
  })

  it('長名稱截斷、英文語系', () => {
    const long = mountIt({ series: [{ name: '非常非常非常非常非常非常非常非常長的感測器名稱', data: mk((i) => i) }], width: 300 })
    expect(long.w.find('[data-row] text').text()).toMatch(/…$/)
    const en = mountIt({ scale: 'shared' }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.svg().attributes('aria-label')).toBe('Horizon chart: 3 series')
    expect(en.w.text()).toContain('Above baseline')
    expect(en.w.text()).toContain('per band')
  })
})
