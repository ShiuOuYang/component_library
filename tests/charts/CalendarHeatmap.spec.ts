import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import CalendarHeatmap from '@/components/library/charts/CalendarHeatmap.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown>, attrs: Record<string, unknown> = {}) {
  const w = mount(CalendarHeatmap, { props: props as never, attrs, attachTo: document.body })
  mounted.push(w)
  return w
}

// 2026-11-02（一）～ 2026-11-15（日），值 = 日期
const twoWeeks = Array.from({ length: 14 }, (_, i) => ({ date: `2026-11-${String(i + 2).padStart(2, '0')}`, value: i + 2 }))

describe('CalendarHeatmap', () => {
  it('每天一格；沒有資料的日子只畫外框；aria-label 摘要（值為 null 的日子也算在範圍內）', () => {
    const w = mountIt({ data: [...twoWeeks.slice(0, 13), { date: '2026-11-15', value: null }], title: '異常件數' })
    const rects = w.findAll('rect[data-date]')
    expect(rects).toHaveLength(14)
    expect(rects[13].attributes('style')).toContain('fill: transparent')
    expect(rects[0].attributes('style')).toContain('rgb(var(--t-chart-1) / 0.25)')
    expect(rects[12].attributes('style')).toContain('rgb(var(--t-chart-1) / 1.00)')
    expect(w.find('svg[role="application"]').attributes('aria-label')).toBe(
      '異常件數：2026 年 11 月 2 日 星期一 至 2026 年 11 月 15 日 星期日，13 天有資料。方向鍵逐日移動'
    )
  })

  it('星期標籤：週一開始標一三五；週日開始也是一三五', () => {
    const labels = (w: VueWrapper) => w.findAll('svg[aria-hidden="true"] text').map((t) => t.text())
    expect(labels(mountIt({ data: twoWeeks }))).toEqual(['一', '三', '五'])
    expect(labels(mountIt({ data: twoWeeks, weekStart: 0 }))).toEqual(['一', '三', '五'])
    expect(mountIt({ data: twoWeeks, showWeekdays: false, showMonths: false, showLegend: false }).findAll('text')).toHaveLength(0)
  })

  it('門檻與顏色：thresholds + colors；圖例範圍文字', () => {
    const w = mountIt({ data: twoWeeks, thresholds: [10, 5], colors: ['red', 'yellow', 'green'], unit: '%' })
    const style = (d: string) => w.find(`rect[data-date="${d}"]`).attributes('style')
    expect(style('2026-11-04')).toContain('fill: red')
    expect(style('2026-11-05')).toContain('fill: yellow')
    expect(style('2026-11-10')).toContain('fill: green')
    expect(w.findAll('[role="group"] [role="img"]').map((e) => e.attributes('aria-label'))).toEqual(['小於 5', '5 – 10', '10 以上'])
  })

  it('domain 固定分級範圍；colors 決定級數；valueFormat', async () => {
    const w = mountIt({ data: twoWeeks, domain: [0, 100], colors: ['red', 'blue'], valueFormat: (v: number) => `${v.toFixed(1)}!` })
    expect(w.findAll('[role="group"] [role="img"]').map((e) => e.attributes('aria-label'))).toEqual(['小於 50.0!', '50.0! 以上'])
    expect(w.find('rect[data-date="2026-11-15"]').attributes('style')).toContain('fill: red')
  })

  it('滑過顯示 tooltip；離開隱藏；點擊送出 cell-click', async () => {
    const clicks: unknown[] = []
    const w = mountIt({ data: twoWeeks, unit: '件' }, { onCellClick: (c: unknown) => clicks.push(c) })
    const r = w.find('rect[data-date="2026-11-06"]')
    expect(r.classes()).toContain('cursor-pointer')
    await r.trigger('mouseenter')
    expect(w.find('[data-export-ignore]').text()).toContain('2026 年 11 月 6 日 星期五')
    expect(w.find('[data-export-ignore]').text()).toContain('6 件')
    await r.trigger('click')
    expect(clicks).toEqual([{ date: '2026-11-06', value: 6 }])
    await w.find('svg[role="application"]').trigger('mouseleave')
    expect(w.find('[data-export-ignore]').exists()).toBe(false)
  })

  it('鍵盤：↑↓ 一天、←→ 一週、Home / End、Enter 點擊、Escape 離開；念出目前的格子', async () => {
    const clicks: unknown[] = []
    const w = mountIt({ data: twoWeeks }, { onCellClick: (c: unknown) => clicks.push(c) })
    const svg = w.find('svg[role="application"]')
    const live = () => w.find('[aria-live="polite"]').text()
    await svg.trigger('keydown', { key: 'Enter' }) // 還沒有游標
    expect(clicks).toHaveLength(0)
    await svg.trigger('keydown', { key: 'ArrowDown' })
    expect(live()).toBe('2026 年 11 月 2 日 星期一：2')
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toContain('11 月 9 日')
    await svg.trigger('keydown', { key: 'ArrowRight' }) // 超出範圍時停在最後
    expect(live()).toContain('11 月 15 日')
    await svg.trigger('keydown', { key: 'ArrowLeft' })
    await svg.trigger('keydown', { key: 'ArrowUp' })
    expect(live()).toContain('11 月 7 日')
    await svg.trigger('keydown', { key: 'Home' })
    expect(live()).toContain('11 月 2 日')
    await svg.trigger('keydown', { key: 'End' })
    await svg.trigger('keydown', { key: ' ' })
    expect(clicks).toEqual([{ date: '2026-11-15', value: 15 }])
    await svg.trigger('keydown', { key: 'x' })
    await svg.trigger('keydown', { key: 'Escape' })
    expect(live()).toBe('')
    for (const key of ['ArrowUp', 'ArrowLeft', 'ArrowRight']) {
      await svg.trigger('keydown', { key })
      expect(live()).toContain('11 月 2 日')
      await svg.trigger('blur')
    }
  })

  it('沒有綁 cell-click 時不是手形游標；空資料仍畫 12 週', () => {
    const w = mountIt({ data: [] })
    expect(w.findAll('rect[data-date]')).toHaveLength(84)
    expect(w.find('rect[data-date]').classes()).not.toContain('cursor-pointer')
    expect(w.findAll('[role="group"] [role="img"]')).toHaveLength(5)
  })

  it('今天加外框；markToday=false 時不加', () => {
    const now = new Date()
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const w = mountIt({ data: [{ date: key, value: 3 }, { date: '2000-01-01', value: null }], start: key, end: key })
    expect(w.find(`rect[data-date="${key}"]`).attributes('style')).toContain('stroke: rgb(var(--t-content-primary))')
    const w2 = mountIt({ data: [], start: key, end: key, markToday: false })
    expect(w2.find(`rect[data-date="${key}"]`).attributes('style')).toContain('stroke: rgb(var(--t-stroke-default))')
  })

  it('focusDate：移到某一天並聚焦；不在範圍內回傳 false', async () => {
    const w = mountIt({ data: twoWeeks })
    const api = w.vm as unknown as { focusDate: (d: string) => boolean }
    expect(api.focusDate('2026-11-08')).toBe(true)
    await nextTick()
    expect(document.activeElement).toBe(w.find('svg[role="application"]').element)
    expect(w.find('[aria-live="polite"]').text()).toContain('11 月 8 日')
    expect(api.focusDate('2027-01-01')).toBe(false)
  })

  it('範圍改變時捲到最右邊；鍵盤移動時讓游標保持可見', async () => {
    const w = mountIt({ data: twoWeeks })
    const scroller = w.find('.overflow-x-auto').element as HTMLDivElement
    Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 900 })
    Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 20 })
    await w.setProps({ end: '2026-12-31' })
    await nextTick()
    expect(scroller.scrollLeft).toBe(900)
    const svg = w.find('svg[role="application"]')
    await svg.trigger('keydown', { key: 'Home' })
    expect(scroller.scrollLeft).toBe(0)
    await svg.trigger('keydown', { key: 'ArrowRight' })
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(scroller.scrollLeft).toBe(2 * 17 + 14 - 20)
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(CalendarHeatmap, { data: twoWeeks, thresholds: [5] })) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.text()).toContain('Less')
    expect(w.text()).toContain('No data')
    expect(w.findAll('[role="group"] [role="img"]').map((e) => e.attributes('aria-label'))).toEqual(['Below 5', '5 and above'])
    expect(w.find('svg[role="application"]').attributes('aria-label')).toContain('Calendar heatmap: ')
    expect(w.find('svg[role="application"] text').text()).toBe('Nov')
    expect(w.find('svg[aria-hidden="true"] text').text()).toBe('Mo')
  })
})
