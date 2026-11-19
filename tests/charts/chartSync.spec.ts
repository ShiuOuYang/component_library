import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue'
import { useChartSync, type ChartSync } from '@/components/library/charts/composables/useChartSync'
import type { ChartLayer } from '@/components/library/charts/types/chart.types'

/**
 * 圖表 600×400、預設 margin（上 60、左 80）→ 繪圖區 440×280。
 * jsdom 的 getBoundingClientRect 是 0：clientX = 80 + 繪圖區 x。
 * 數值軸 x-domain [0, 100] → 1 單位 = 4.4px。
 */
type Row = { x: number; y: number; id: string }
const ROWS: Row[] = [0, 25, 50, 75, 100].map((x) => ({ x, y: x / 2, id: `p${x}` }))
const numLine: ChartLayer<Row> = { type: 'line', data: ROWS, xValue: (d) => d.x, yValue: (d) => d.y, keyFn: (d) => d.id, showDots: true }
const catLine: ChartLayer<{ c: string; v: number }> = {
  type: 'line',
  data: [{ c: 'A', v: 1 }, { c: 'B', v: 2 }, { c: 'C', v: 3 }, { c: 'D', v: 4 }],
  xValue: (d) => d.c,
  yValue: (d) => d.v,
}

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

async function mountChart(props: Record<string, unknown> = {}) {
  wrapper = mount(DualAxisComboChart, {
    props: { width: 600, height: 400, animationDuration: 0, xScaleType: 'linear', xDomain: [0, 100], layers: [numLine], ...props },
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

const line = (w: VueWrapper) => w.find('.chart-crosshair')
const leftOf = (w: VueWrapper) => parseFloat((line(w).element as HTMLElement).style.left)

describe('DualAxisComboChart 十字線', () => {
  it('沒開 crosshair 時不畫、不送事件', async () => {
    const w = await mountChart()
    await w.trigger('mousemove', { clientX: 300, clientY: 200 })
    expect(line(w).exists()).toBe(false)
    expect(w.emitted('crosshair-move')).toBeUndefined()
  })

  it('滑鼠在繪圖區：畫線、顯示 X 讀數、送出 X 值；離開繪圖區或圖表時送 null', async () => {
    const w = await mountChart({ crosshair: true })
    await w.trigger('mousemove', { clientX: 80 + 220, clientY: 160 })
    expect(w.emitted('crosshair-move')![0][0]).toBeCloseTo(50)
    expect(leftOf(w)).toBeCloseTo(300)
    expect(line(w).text()).toBe('50')
    // 同一個值不重複送
    await w.trigger('mousemove', { clientX: 80 + 220, clientY: 170 })
    expect(w.emitted('crosshair-move')).toHaveLength(1)
    // 移到左邊的 Y 軸上（繪圖區外）
    await w.trigger('mousemove', { clientX: 40, clientY: 160 })
    expect(w.emitted('crosshair-move')!.at(-1)![0]).toBeNull()
    expect(line(w).exists()).toBe(false)
    await w.trigger('mousemove', { clientX: 80 + 44, clientY: 160 })
    await w.trigger('mouseleave')
    expect(w.emitted('crosshair-move')!.at(-1)![0]).toBeNull()
  })

  it('類別軸：取最近的類別，線畫在類別中央', async () => {
    const w = await mountChart({ crosshair: true, xScaleType: 'band', xDomain: null, layers: [catLine] })
    await w.trigger('mousemove', { clientX: 80 + 10, clientY: 160 })
    expect(w.emitted('crosshair-move')![0][0]).toBe('A')
    await w.trigger('mousemove', { clientX: 80 + 430, clientY: 160 })
    expect(w.emitted('crosshair-move')!.at(-1)![0]).toBe('D')
    expect(line(w).text()).toBe('D')
  })

  it('crosshairValue：外部指定的位置；超出範圍或對不到類別時不畫；滑鼠在本圖時以滑鼠為準', async () => {
    const w = await mountChart({ crosshairValue: 25 })
    expect(leftOf(w)).toBeCloseTo(80 + 110)
    await w.setProps({ crosshairValue: 150 })
    expect(line(w).exists()).toBe(false)
    await w.setProps({ crosshairValue: 25, crosshair: true })
    await w.trigger('mousemove', { clientX: 80 + 330, clientY: 160 })
    expect(leftOf(w)).toBeCloseTo(80 + 330)
    await w.trigger('mouseleave')
    expect(leftOf(w)).toBeCloseTo(80 + 110)
    await w.setProps({ xScaleType: 'band', xDomain: null, layers: [catLine], crosshairValue: 'Z' })
    expect(line(w).exists()).toBe(false)
  })

  it('時間軸：數字（毫秒）也能當 crosshairValue；讀數用 xAxisFormat', async () => {
    const t0 = new Date(2026, 10, 19, 8, 0).getTime()
    const rows = [0, 1, 2].map((i) => ({ t: new Date(t0 + i * 3600_000), v: i }))
    const w = await mountChart({
      xScaleType: 'time',
      xDomain: [new Date(t0), new Date(t0 + 2 * 3600_000)],
      layers: [{ type: 'line', data: rows, xValue: (d: { t: Date }) => d.t, yValue: (d: { v: number }) => d.v }],
      crosshairValue: t0 + 3600_000,
      xAxisFormat: (d: Date) => `${d.getHours()}:00`,
    })
    expect(leftOf(w)).toBeCloseTo(80 + 220)
    expect(line(w).text()).toBe('9:00')
  })
})

describe('useChartSync', () => {
  function mountPair(options: Parameters<typeof useChartSync>[0]) {
    let sync!: ChartSync
    const base = { width: 600, height: 400, animationDuration: 0, xScaleType: 'linear', layers: [numLine] }
    wrapper = mount(
      defineComponent({
        setup() {
          sync = useChartSync(options)
          return () =>
            h('div', [
              h(DualAxisComboChart, { ...base, class: 'chart-a', ...sync.bind() }),
              h(DualAxisComboChart, { ...base, class: 'chart-b', ...sync.bind() }),
            ])
        },
      }),
      { attachTo: document.body }
    )
    return { w: wrapper, sync: () => sync }
  }
  const chart = (w: VueWrapper, c: string) => w.findAllComponents(DualAxisComboChart).find((x) => x.classes(c))!

  it('十字線：滑鼠在 A，B 也在同一個 X 畫線', async () => {
    const { w, sync } = mountPair({ crosshair: true, zoom: false })
    await nextTick()
    await chart(w, 'chart-a').trigger('mousemove', { clientX: 80 + 220, clientY: 160 })
    await nextTick()
    expect(sync().crosshairValue.value).toBeCloseTo(50)
    const b = chart(w, 'chart-b')
    expect(b.find('.chart-crosshair').exists()).toBe(true)
    expect(parseFloat((b.find('.chart-crosshair').element as HTMLElement).style.left)).toBeCloseTo(300)
    await chart(w, 'chart-a').trigger('mouseleave')
    await nextTick()
    expect(b.find('.chart-crosshair').exists()).toBe(false)
  })

  it('縮放：任一張的 X 縮放（滾輪、框選、拖曳軸）寫進共同範圍並傳給每一張；各圖的重設鈕收起來，reset() 回到全覽', async () => {
    const { w, sync } = mountPair({ zoom: true, crosshair: false })
    await nextTick()
    const a = chart(w, 'chart-a')
    const b = chart(w, 'chart-b')
    expect(a.props('showResetButton')).toBe(false)
    a.vm.$emit('wheel-zoom', { axis: 'x', domain: [10, 40] })
    await nextTick()
    expect(sync().xDomain.value).toEqual([10, 40])
    expect(b.props('xDomain')).toEqual([10, 40])
    // Y 軸的縮放不同步
    a.vm.$emit('wheel-zoom', { axis: 'yLeft', domain: [0, 5] })
    expect(sync().xDomain.value).toEqual([10, 40])
    b.vm.$emit('selection-change', { xDomain: [20, 30], yLeftDomain: null, yRightDomain: null, mode: 'x' })
    expect(sync().xDomain.value).toEqual([20, 30])
    b.vm.$emit('axis-drag', { axis: 'x', domain: [25, 35] })
    expect(sync().xDomain.value).toEqual([25, 35])
    b.vm.$emit('axis-drag', { axis: 'yRight', domain: [1, 2] })
    a.vm.$emit('wheel-zoom', { axis: 'x', domain: null })
    expect(sync().xDomain.value).toBeNull()
    a.vm.$emit('selection-change', { xDomain: [1, 2], yLeftDomain: null, yRightDomain: null, mode: 'x' })
    a.vm.$emit('zoom-reset')
    expect(sync().xDomain.value).toBeNull()
    sync().xDomain.value = [5, 6]
    sync().reset()
    expect(sync().xDomain.value).toBeNull()
  })

  it('高亮：A 的提示框出現時，兩張圖的 highlightKey 都是那個 key；消失時清掉', async () => {
    const { w, sync } = mountPair({ highlight: true, zoom: false, crosshair: false })
    await nextTick()
    const a = chart(w, 'chart-a')
    a.vm.$emit('tooltip-show', { key: 'p50', data: ROWS[2], layer: numLine, position: { x: 0, y: 0 } })
    await nextTick()
    expect(sync().highlightKey.value).toBe('p50')
    expect(chart(w, 'chart-b').props('highlightKey')).toBe('p50')
    a.vm.$emit('tooltip-show', { data: ROWS[2], layer: numLine, position: { x: 0, y: 0 } })
    expect(sync().highlightKey.value).toBeNull()
    a.vm.$emit('tooltip-show', { key: 'p0', data: ROWS[0], layer: numLine, position: { x: 0, y: 0 } })
    a.vm.$emit('tooltip-hide')
    expect(sync().highlightKey.value).toBeNull()
  })

  it('預設：zoom + crosshair，不同步高亮；可給初始範圍', () => {
    const s = useChartSync({ xDomain: [1, 9] })
    const b = s.bind()
    expect(b.xDomain).toEqual([1, 9])
    expect(b.crosshair).toBe(true)
    expect('highlightKey' in b).toBe(false)
    expect(useChartSync().bind().xDomain).toBeNull()
  })
})
