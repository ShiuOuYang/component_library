import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import * as d3 from 'd3'
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue'
import type { ChartLayer, TriggerLine } from '@/components/library/charts/types/chart.types'
import type { ChartDatum } from '@/components/library/charts/types/chart.types'

/**
 * jsdom 沒有排版引擎，D3 仍能建立 SVG 節點與屬性，因此結構層面的行為
 * （有沒有畫出元素、畫了幾個、屬性值對不對）都可以測。
 */

interface Row extends ChartDatum {
  category: string
  value: number
  rate: number
  a: number
  b: number
}

const ROWS: Row[] = [
  { category: 'Q1', value: 10, rate: 0.9, a: 3, b: 4 },
  { category: 'Q2', value: 30, rate: 0.95, a: 5, b: 5 },
  { category: 'Q3', value: 20, rate: 0.85, a: 1, b: 2 },
]

const barLayer: ChartLayer<Row> = {
  type: 'stacked-bar',
  yAxis: 'left',
  data: ROWS,
  xValue: (d) => d.category,
  stackKeys: ['a', 'b'],
}

const lineLayer: ChartLayer<Row> = {
  type: 'line',
  yAxis: 'right',
  data: ROWS,
  xValue: (d) => d.category,
  yValue: (d) => d.rate,
  lineColor: '#ef4444',
  showDots: true,
}

/**
 * 掛載並等待渲染完成。
 *
 * 圖表的繪製由 watchEffect 驅動，會排在掛載後的 microtask，
 * 因此測試必須先 flush 才看得到 D3 建立的節點。
 */
async function mountChart(props: Record<string, unknown> = {}) {
  const wrapper = mount(DualAxisComboChart, {
    props: {
      layers: [barLayer],
      width: 600,
      height: 400,
      animationDuration: 0,
      autoResize: false,
      ...props,
    },
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

/**
 * 等 D3 transition 跑完。
 *
 * 座標軸的刻度文字由 transition 套用，而 d3 的 transition 走 timer，
 * 不會在 nextTick 內完成 —— 即使 duration 設為 0 也要讓 timer 轉一次。
 *
 * （transform 插值需要 SVGGraphicsElement.transform，jsdom 沒有，
 *   由 tests/svg-polyfills.js 補上，否則 transition 會中斷。）
 */
async function flushTransitions() {
  await new Promise((resolve) => setTimeout(resolve, 30))
}

/** 取出某個座標軸所有刻度的文字 */
function tickTexts(wrapper: ReturnType<typeof mount>, axisClass: string): string[] {
  return wrapper.findAll(`${axisClass} .tick text`).map((t) => t.text())
}

describe('DualAxisComboChart', () => {
  describe('基本渲染', () => {
    it('掛載後產生 SVG 與各圖層 <g>', async () => {
      const wrapper = await mountChart()

      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('.grid-layer').exists()).toBe(true)
      expect(wrapper.find('.legend-layer').exists()).toBe(true)
      wrapper.unmount()
    })

    it('堆疊圖畫出的柱子數 = 資料筆數 × 堆疊層數', async () => {
      const wrapper = await mountChart()
      // 3 筆資料 × 2 個 stackKey
      expect(wrapper.findAll('rect.stacked-bar')).toHaveLength(6)
      wrapper.unmount()
    })

    it('折線圖畫出路徑，showDots 時另有圓點', async () => {
      const wrapper = await mountChart({ layers: [lineLayer] })

      expect(wrapper.findAll('path.line').length).toBeGreaterThan(0)
      expect(wrapper.findAll('circle.line-dot')).toHaveLength(3)
      wrapper.unmount()
    })

    it('散點圖畫出圓點', async () => {
      const wrapper = await mountChart({
        layers: [{ ...lineLayer, type: 'scatter', showDots: false }],
      })
      expect(wrapper.findAll('circle.scatter-dot')).toHaveLength(3)
      wrapper.unmount()
    })

    it('雙軸：柱狀掛左軸、折線掛右軸可同時渲染', async () => {
      const wrapper = await mountChart({ layers: [barLayer, lineLayer] })

      expect(wrapper.findAll('rect.stacked-bar')).toHaveLength(6)
      expect(wrapper.findAll('path.line').length).toBeGreaterThan(0)
      wrapper.unmount()
    })
  })

  describe('防禦：資料不足時不應拋錯', () => {
    it('layers 為空陣列', async () => {
      const wrapper = await mountChart({ layers: [] })
      expect(wrapper.find('svg').exists()).toBe(true)
      wrapper.unmount()
    })

    it('圖層沒有 data', async () => {
      const wrapper = await mountChart({
        layers: [{ type: 'stacked-bar', yAxis: 'left', stackKeys: ['a'] }],
      })
      expect(wrapper.findAll('rect.stacked-bar')).toHaveLength(0)
      wrapper.unmount()
    })

    it('圖層 data 為空陣列', async () => {
      const wrapper = await mountChart({ layers: [{ ...barLayer, data: [] }] })
      expect(wrapper.findAll('rect.stacked-bar')).toHaveLength(0)
      wrapper.unmount()
    })

    it('堆疊圖缺 xValue 時跳過該圖層而不是拋錯', async () => {
      // 收窄前這裡會直接呼叫 undefined
      const wrapper = await mountChart({
        layers: [{ type: 'stacked-bar', yAxis: 'left', data: ROWS, stackKeys: ['a', 'b'] }],
      })
      expect(wrapper.findAll('rect.stacked-bar')).toHaveLength(0)
      wrapper.unmount()
    })

    it('折線圖缺 yValue 時跳過該圖層', async () => {
      const wrapper = await mountChart({
        layers: [{ type: 'line', yAxis: 'left', data: ROWS, xValue: (d: Row) => d.category }],
      })
      expect(wrapper.findAll('path.line')).toHaveLength(0)
      wrapper.unmount()
    })

    it('資料含 null 值時不會產生 NaN 座標的元素', async () => {
      const withNulls = [
        { category: 'Q1', value: 10, rate: 0.9, a: 1, b: 1 },
        { category: 'Q2', value: 20, rate: null as unknown as number, a: 1, b: 1 },
      ]
      const wrapper = await mountChart({
        layers: [{ ...lineLayer, data: withNulls, yAxis: 'left' }],
      })

      // 圓點只畫出座標有效的那一筆
      const dots = wrapper.findAll('circle.line-dot')
      dots.forEach((dot) => {
        expect(dot.attributes('cy')).not.toBe('NaN')
      })
      wrapper.unmount()
    })
  })

  describe('多實例隔離', () => {
    it('每個實例有自己的 chartId（clip-path 不會互相覆蓋）', async () => {
      const a = await mountChart()
      const b = await mountChart()

      const clipA = a.find('clipPath').attributes('id')
      const clipB = b.find('clipPath').attributes('id')

      expect(clipA).toBeTruthy()
      expect(clipA).not.toBe(clipB)

      a.unmount()
      b.unmount()
    })
  })

  describe('參考線（trigger lines）', () => {
    const triggerLines: TriggerLine[] = [
      { value: 8, yAxis: 'left', label: '下限', color: '#dc2626' },
      { value: 12, yAxis: 'left', label: '上限', color: '#16a34a' },
    ]

    it('畫出對應數量的參考線', async () => {
      const wrapper = await mountChart({ triggerLines })
      expect(wrapper.findAll('line.trigger-line')).toHaveLength(2)
      wrapper.unmount()
    })

    it('沒有參考線時不畫任何線', async () => {
      const wrapper = await mountChart({ triggerLines: [] })
      expect(wrapper.findAll('line.trigger-line')).toHaveLength(0)
      wrapper.unmount()
    })

    it('interactive=false 時不綁互動樣式', async () => {
      const wrapper = await mountChart({
        triggerLines: [{ value: 10, yAxis: 'left', label: 'x', interactive: false }],
      })
      const line = wrapper.find('line.trigger-line')
      expect(line.attributes('style')).toContain('default')
      wrapper.unmount()
    })

    it('參考線列入圖例（showInLegend 未設為 false 時）', async () => {
      const wrapper = await mountChart({ triggerLines })
      expect(wrapper.findAll('g.legend-item').length).toBeGreaterThanOrEqual(2)
      wrapper.unmount()
    })

    it('showInLegend=false 的參考線不列入圖例', async () => {
      const withLegend = await mountChart({ triggerLines: [{ value: 10, label: 'A' }] })
      const withoutLegend = await mountChart({
        triggerLines: [{ value: 10, label: 'A', showInLegend: false }],
      })

      expect(withoutLegend.findAll('g.legend-item').length).toBeLessThan(
        withLegend.findAll('g.legend-item').length
      )

      withLegend.unmount()
      withoutLegend.unmount()
    })
  })

  describe('圖例', () => {
    it('堆疊圖每個 stackKey 各一個圖例項', async () => {
      const wrapper = await mountChart()
      expect(wrapper.findAll('g.legend-item')).toHaveLength(2)
      wrapper.unmount()
    })

    it('legend.show=false 的圖層不列入圖例', async () => {
      const wrapper = await mountChart({
        layers: [{ ...barLayer, legend: { show: false } }],
      })
      expect(wrapper.findAll('g.legend-item')).toHaveLength(0)
      wrapper.unmount()
    })

    it('折線圖使用 legend.label 作為圖例文字', async () => {
      const wrapper = await mountChart({
        layers: [{ ...lineLayer, yAxis: 'left', legend: { label: '良率' } }],
      })
      expect(wrapper.find('.legend-text').text()).toBe('良率')
      wrapper.unmount()
    })
  })

  describe('座標軸', () => {
    it('band scale 的 X 軸刻度數 = 類別數', async () => {
      const wrapper = await mountChart()
      const ticks = wrapper.findAll('.x-axis .tick')
      expect(ticks).toHaveLength(3)
      wrapper.unmount()
    })

    it('xAxisFormat 會套用到刻度文字', async () => {
      const wrapper = await mountChart({
        xAxisFormat: (v: string) => `<${v}>`,
      })
      await flushTransitions()

      expect(tickTexts(wrapper, '.x-axis')).toContain('<Q1>')
      wrapper.unmount()
    })

    it('yLeftAxisFormat 會套用到左軸刻度', async () => {
      const wrapper = await mountChart({
        yLeftDomain: [0, 100],
        yLeftAxisFormat: (v: number) => `${v}%`,
      })
      await flushTransitions()

      const texts = tickTexts(wrapper, '.y-axis-left').filter(Boolean)
      expect(texts.length).toBeGreaterThan(0)
      expect(texts.every((t) => t.endsWith('%'))).toBe(true)
      wrapper.unmount()
    })

    it('showGrid=false 時不畫格線', async () => {
      const on = await mountChart({ showGrid: true })
      const off = await mountChart({ showGrid: false })

      expect(on.findAll('.grid-left line').length).toBeGreaterThan(0)
      expect(off.findAll('.grid-left line')).toHaveLength(0)

      on.unmount()
      off.unmount()
    })
  })

  describe('事件', () => {
    it('掛載後發出 chart-ready', async () => {
      const wrapper = await mountChart()
      expect(wrapper.emitted('chart-ready')).toBeTruthy()
      wrapper.unmount()
    })

    it('點擊柱子發出 layer-click 並帶上原始資料', async () => {
      const wrapper = await mountChart()
      await wrapper.find('rect.stacked-bar').trigger('click')

      const events = wrapper.emitted('layer-click')
      expect(events).toBeTruthy()
      const payload = events![0][0] as { data: Row; series?: string }
      expect(payload.data.category).toBeDefined()
      wrapper.unmount()
    })

    it('hover 柱子發出 layer-hover 與 tooltip-show', async () => {
      const wrapper = await mountChart()
      await wrapper.find('rect.stacked-bar').trigger('mouseenter')

      expect(wrapper.emitted('layer-hover')).toBeTruthy()
      expect(wrapper.emitted('tooltip-show')).toBeTruthy()
      wrapper.unmount()
    })

    it('tooltip 插槽拿到的 payload 帶有 position', async () => {
      // 外層元件（GridFacetChart）要靠 position 把 tooltip 擺在游標旁，
      // 少了它 tooltip 會固定黏在容器左上角。
      const wrapper = mount(DualAxisComboChart, {
        props: {
          layers: [barLayer],
          width: 600,
          height: 400,
          animationDuration: 0,
          autoResize: false,
        },
        slots: {
          tooltip: `
            <template #tooltip="{ tooltipData, tooltipVisible }">
              <span v-if="tooltipVisible" class="probe">{{ tooltipData.position.pageX }}</span>
            </template>
          `,
        },
        attachTo: document.body,
      })
      await nextTick()
      await nextTick()

      await wrapper.find('rect.stacked-bar').trigger('mouseenter', { clientX: 123, clientY: 45 })

      expect(wrapper.find('.probe').text()).toBe('123')

      const shown = wrapper.emitted('tooltip-show')!
      const position = (shown[0][0] as { position: { pageX: number; pageY: number } }).position
      // 事件與插槽拿到的是同一組座標
      expect(position).toMatchObject({ pageX: 123, pageY: 45 })
      wrapper.unmount()
    })

    it('mouseleave 發出 tooltip-hide', async () => {
      const wrapper = await mountChart()
      await wrapper.find('rect.stacked-bar').trigger('mouseenter')
      await wrapper.find('rect.stacked-bar').trigger('mouseleave')

      expect(wrapper.emitted('tooltip-hide')).toBeTruthy()
      wrapper.unmount()
    })

    it('點擊參考線也發出 layer-click，layer.type 為 trigger-line', async () => {
      const wrapper = await mountChart({
        triggerLines: [{ value: 8, yAxis: 'left', label: '下限' }],
      })
      await wrapper.find('line.trigger-line').trigger('click')

      const events = wrapper.emitted('layer-click')
      expect(events).toBeTruthy()
      const payload = events![0][0] as { layer: ChartLayer }
      expect(payload.layer.type).toBe('trigger-line')
      wrapper.unmount()
    })
  })

  describe('生命週期清理', () => {
    it('卸載時斷開 ResizeObserver', async () => {
      const disconnect = vi.fn()
      const original = window.ResizeObserver
      window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect = disconnect
      } as unknown as typeof ResizeObserver

      const wrapper = await mountChart({ autoResize: true })
      wrapper.unmount()

      expect(disconnect).toHaveBeenCalled()
      window.ResizeObserver = original
    })

    it('autoResize=false 時不建立 ResizeObserver', async () => {
      const observe = vi.fn()
      const original = window.ResizeObserver
      window.ResizeObserver = class {
        observe = observe
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver

      const wrapper = await mountChart({ autoResize: false })
      expect(observe).not.toHaveBeenCalled()

      wrapper.unmount()
      window.ResizeObserver = original
    })
  })

  describe('色階', () => {
    it('colorScale 為函式時用它決定顏色', async () => {
      const scale = d3.scaleOrdinal<string, string>().domain(['a', 'b']).range(['#111111', '#222222'])
      const wrapper = await mountChart({ layers: [{ ...barLayer, colorScale: scale }] })

      const fills = wrapper.findAll('rect.stacked-bar').map((r) => r.attributes('fill'))
      expect(fills).toContain('#111111')
      expect(fills).toContain('#222222')
      wrapper.unmount()
    })

    it('沒有 colorScale 時退回 d3 內建色盤', async () => {
      const wrapper = await mountChart()
      const fill = wrapper.find('rect.stacked-bar').attributes('fill')
      expect(d3.schemeCategory10).toContain(fill)
      wrapper.unmount()
    })
  })
})
