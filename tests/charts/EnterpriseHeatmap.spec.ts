import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import EnterpriseHeatmap from '@/components/library/charts/EnterpriseHeatmap.vue'
import type { HeatmapDatum } from '@/components/library/charts/EnterpriseHeatmap.vue'

/**
 * jsdom 沒有排版引擎，但 D3 仍會建立 SVG 節點與屬性，
 * 因此結構層面（畫了幾格、屬性值、事件）都測得到。
 *
 * transform 插值需要 SVGGraphicsElement.transform，由
 * tests/svg-polyfills.js 補上，否則 transition 會中斷。
 */

const ROWS: HeatmapDatum[] = [
  { x: 'A', y: 'P1', value: 10 },
  { x: 'B', y: 'P1', value: 20 },
  { x: 'A', y: 'P2', value: 30 },
  { x: 'B', y: 'P2', value: 40 },
]

const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 }

async function mountHeatmap(props: Record<string, unknown> = {}) {
  const wrapper = mount(EnterpriseHeatmap, {
    props: {
      data: ROWS,
      width: 400,
      height: 300,
      margin: MARGIN,
      animationDuration: 0,
      autoResize: false,
      enableBrush: false,
      ...props,
    },
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

/** 等 D3 transition 跑完（timer 至少要轉一次，即使 duration 為 0） */
async function flushTransitions() {
  await new Promise((resolve) => setTimeout(resolve, 30))
}

function tickTexts(wrapper: ReturnType<typeof mount>, axisClass: string): string[] {
  return wrapper.findAll(`${axisClass} .tick text`).map((t) => t.text())
}

describe('EnterpriseHeatmap', () => {
  describe('基本渲染', () => {
    it('畫出的單元格數 = X 類別數 × Y 類別數', async () => {
      const wrapper = await mountHeatmap()
      expect(wrapper.findAll('rect.heatmap-cell')).toHaveLength(4)
      wrapper.unmount()
    })

    it('showMissingValues=false 時不畫沒有資料的格子', async () => {
      // 少給一筆，3 筆資料但 domain 仍是 2×2
      const wrapper = await mountHeatmap({ data: ROWS.slice(0, 3), showMissingValues: false })
      expect(wrapper.findAll('rect.heatmap-cell')).toHaveLength(3)
      wrapper.unmount()
    })

    it('showMissingValues=true 時補上空格，並塗成 missingValueColor', async () => {
      const wrapper = await mountHeatmap({
        data: ROWS.slice(0, 3),
        showMissingValues: true,
        missingValueColor: 'rgb(1, 2, 3)',
      })
      await flushTransitions()

      const cells = wrapper.findAll('rect.heatmap-cell')
      expect(cells).toHaveLength(4)
      const missing = cells.filter((c) => c.element.style.fill === 'rgb(1, 2, 3)')
      expect(missing).toHaveLength(1)
      wrapper.unmount()
    })

    it('單元格尺寸 = bandwidth 扣掉 cellPadding', async () => {
      const wrapper = await mountHeatmap({ cellPadding: 4 })
      await flushTransitions()

      // chartWidth = 400 - 10 - 10 = 380，2 個類別 → bandwidth 190
      const cell = wrapper.find('rect.heatmap-cell')
      expect(Number(cell.attributes('width'))).toBeCloseTo(190 - 4)
      // chartHeight = 300 - 10 - 10 = 280，2 個類別 → bandwidth 140
      expect(Number(cell.attributes('height'))).toBeCloseTo(140 - 4)
      wrapper.unmount()
    })

    it('title 有值才畫標題', async () => {
      const withTitle = await mountHeatmap({ title: '良率分佈' })
      await flushTransitions()
      expect(withTitle.find('.title-layer text').text()).toBe('良率分佈')

      const without = await mountHeatmap()
      expect(without.find('.title-layer text').exists()).toBe(false)

      withTitle.unmount()
      without.unmount()
    })
  })

  describe('防禦：資料不足時不應拋錯', () => {
    it('data 為空陣列', async () => {
      const wrapper = await mountHeatmap({ data: [] })
      expect(wrapper.find('svg').exists()).toBe(true)
      wrapper.unmount()
    })

    it('數值欄位全為 null 時仍畫得出來', async () => {
      const wrapper = await mountHeatmap({
        data: [{ x: 'A', y: 'P1', value: null }],
      })
      expect(wrapper.findAll('rect.heatmap-cell')).toHaveLength(1)
      wrapper.unmount()
    })

    it('所有數值相同時色階 domain 不會退化', async () => {
      const wrapper = await mountHeatmap({
        data: [
          { x: 'A', y: 'P1', value: 5 },
          { x: 'B', y: 'P1', value: 5 },
        ],
      })
      await flushTransitions()

      const fills = wrapper.findAll('rect.heatmap-cell').map((c) => c.element.style.fill)
      expect(fills.every((f) => f !== '')).toBe(true)
      wrapper.unmount()
    })

    it('colorRange 只給一個顏色時退回 colorScheme，不會拋錯', async () => {
      const wrapper = await mountHeatmap({ colorRange: ['#ff0000'] })
      await flushTransitions()
      expect(wrapper.find('rect.heatmap-cell').element.style.fill).not.toBe('')
      wrapper.unmount()
    })

    it('colorScheme 名稱不存在時退回預設色階', async () => {
      const wrapper = await mountHeatmap({ colorScheme: 'interpolateNotARealScheme' })
      await flushTransitions()
      expect(wrapper.find('rect.heatmap-cell').element.style.fill).not.toBe('')
      wrapper.unmount()
    })
  })

  describe('欄位映射', () => {
    it('xField / yField / valueField 可指向任意欄位名稱', async () => {
      const wrapper = await mountHeatmap({
        data: [
          { station: 'S1', lot: 'L1', yield: 90 },
          { station: 'S2', lot: 'L1', yield: 80 },
        ],
        xField: 'station',
        yField: 'lot',
        valueField: 'yield',
      })
      await flushTransitions()

      expect(wrapper.findAll('rect.heatmap-cell')).toHaveLength(2)
      expect(tickTexts(wrapper, '.x-axis')).toEqual(['S1', 'S2'])
      expect(tickTexts(wrapper, '.y-axis')).toEqual(['L1'])
      wrapper.unmount()
    })

    it('數值是字串時仍能上色（會轉成數字）', async () => {
      const wrapper = await mountHeatmap({
        data: [
          { x: 'A', y: 'P1', value: '10' },
          { x: 'B', y: 'P1', value: '20' },
        ],
      })
      await flushTransitions()

      const fills = wrapper.findAll('rect.heatmap-cell').map((c) => c.element.style.fill)
      expect(fills[0]).not.toBe('')
      // 兩格數值不同，顏色也應該不同
      expect(fills[0]).not.toBe(fills[1])
      wrapper.unmount()
    })
  })

  describe('座標軸', () => {
    it('類別是數字時依數值排序，而非字典序', async () => {
      // 字典序會排成 1, 10, 2；正確的是 1, 2, 10
      const wrapper = await mountHeatmap({
        data: [
          { x: 10, y: 'P1', value: 1 },
          { x: 2, y: 'P1', value: 2 },
          { x: 1, y: 'P1', value: 3 },
        ],
      })
      await flushTransitions()

      expect(tickTexts(wrapper, '.x-axis')).toEqual(['1', '2', '10'])
      wrapper.unmount()
    })

    it('xDomain / yDomain 可指定順序，數字也吃得下', async () => {
      const wrapper = await mountHeatmap({ xDomain: ['B', 'A'] })
      await flushTransitions()
      expect(tickTexts(wrapper, '.x-axis')).toEqual(['B', 'A'])

      const numeric = await mountHeatmap({
        data: [{ x: 1, y: 'P1', value: 1 }],
        xDomain: [1],
      })
      await flushTransitions()
      // domain 給數字、資料也是數字，兩邊都轉成字串才比對得到
      expect(numeric.findAll('rect.heatmap-cell')).toHaveLength(1)

      wrapper.unmount()
      numeric.unmount()
    })

    it('xAxisFormat / yAxisFormat 會套用到刻度文字', async () => {
      const wrapper = await mountHeatmap({
        xAxisFormat: (v: string) => `站${v}`,
        yAxisFormat: (v: string) => `批${v}`,
      })
      await flushTransitions()

      expect(tickTexts(wrapper, '.x-axis')).toEqual(['站A', '站B'])
      expect(tickTexts(wrapper, '.y-axis')).toEqual(['批P1', '批P2'])
      wrapper.unmount()
    })

    it('xAxisLabel / yAxisLabel 有值才畫軸名稱', async () => {
      const wrapper = await mountHeatmap({ xAxisLabel: '站別', yAxisLabel: '批號' })
      await flushTransitions()

      const labels = wrapper.findAll('.axis-label').map((l) => l.text())
      expect(labels).toContain('站別')
      expect(labels).toContain('批號')
      wrapper.unmount()
    })

    it('xAxisAngle 會旋轉 X 軸標籤', async () => {
      const wrapper = await mountHeatmap({ xAxisAngle: -45 })
      await flushTransitions()

      const text = wrapper.find('.x-axis .tick text')
      expect(text.attributes('transform')).toBe('rotate(-45)')
      expect(text.element.style.textAnchor).toBe('end')
      wrapper.unmount()
    })
  })

  describe('單元格數值', () => {
    it('showCellValues 決定是否畫數值文字', async () => {
      const off = await mountHeatmap()
      await flushTransitions()
      expect(off.findAll('text.cell-value')).toHaveLength(0)

      const on = await mountHeatmap({ showCellValues: true })
      await flushTransitions()
      expect(on.findAll('text.cell-value')).toHaveLength(4)

      off.unmount()
      on.unmount()
    })

    it('cellValueFormat 決定數值的呈現方式', async () => {
      const wrapper = await mountHeatmap({
        showCellValues: true,
        cellValueFormat: (v: number) => `${v.toFixed(0)}%`,
      })
      await flushTransitions()

      const texts = wrapper.findAll('text.cell-value').map((t) => t.text())
      expect(texts).toContain('10%')
      expect(texts).toContain('40%')
      wrapper.unmount()
    })

    it('沒有資料的格子不畫數值文字', async () => {
      const wrapper = await mountHeatmap({
        data: ROWS.slice(0, 3),
        showCellValues: true,
        showMissingValues: true,
      })
      await flushTransitions()

      expect(wrapper.findAll('rect.heatmap-cell')).toHaveLength(4)
      expect(wrapper.findAll('text.cell-value')).toHaveLength(3)
      wrapper.unmount()
    })
  })

  describe('色階圖例', () => {
    it('showColorLegend 決定是否畫圖例與 gradient', async () => {
      const on = await mountHeatmap({ showColorLegend: true })
      await flushTransitions()
      expect(on.find('.color-legend').exists()).toBe(true)
      expect(on.findAll('linearGradient stop').length).toBeGreaterThan(1)

      const off = await mountHeatmap({ showColorLegend: false })
      expect(off.find('.color-legend').exists()).toBe(false)
      expect(off.findAll('linearGradient')).toHaveLength(0)

      on.unmount()
      off.unmount()
    })

    it('colorRange 決定 gradient 的停點數', async () => {
      const wrapper = await mountHeatmap({
        colorRange: ['#000000', '#888888', '#ffffff'],
      })
      await flushTransitions()
      expect(wrapper.findAll('linearGradient stop')).toHaveLength(3)
      wrapper.unmount()
    })

    it('圖例在底部時 SVG 高度會增加', async () => {
      const right = await mountHeatmap({ colorLegendPosition: 'right' })
      const bottom = await mountHeatmap({ colorLegendPosition: 'bottom' })

      expect(right.find('svg').attributes('height')).toBe('300')
      expect(bottom.find('svg').attributes('height')).toBe('340')

      right.unmount()
      bottom.unmount()
    })
  })

  describe('事件', () => {
    it('掛載後發出 chart-ready', async () => {
      const wrapper = await mountHeatmap()
      expect(wrapper.emitted('chart-ready')).toBeTruthy()
      wrapper.unmount()
    })

    it('點擊單元格發出 cell-click 並帶上原始資料', async () => {
      const wrapper = await mountHeatmap()
      await wrapper.find('rect.heatmap-cell').trigger('click')

      const events = wrapper.emitted('cell-click')!
      expect(events).toBeTruthy()
      const payload = events[0][0] as { data: HeatmapDatum }
      expect(payload.data.x).toBeDefined()
      expect(payload.data.value).toBeDefined()
      wrapper.unmount()
    })

    it('hover 單元格發出 cell-hover 與 tooltip-show', async () => {
      const wrapper = await mountHeatmap()
      await wrapper.find('rect.heatmap-cell').trigger('mouseenter', {
        clientX: 50,
        clientY: 60,
      })

      expect(wrapper.emitted('cell-hover')).toBeTruthy()
      const shown = wrapper.emitted('tooltip-show')!
      const payload = shown[0][0] as { data: HeatmapDatum; position: { pageX: number } }
      expect(payload.data.value).toBe(10)
      expect(payload.position).toHaveProperty('pageX')
      wrapper.unmount()
    })

    it('enableTooltip=false 時 hover 不發 tooltip-show', async () => {
      const wrapper = await mountHeatmap({ enableTooltip: false })
      await wrapper.find('rect.heatmap-cell').trigger('mouseenter')

      expect(wrapper.emitted('tooltip-show')).toBeFalsy()
      wrapper.unmount()
    })

    it('mouseleave 發出 tooltip-hide', async () => {
      const wrapper = await mountHeatmap()
      await wrapper.find('rect.heatmap-cell').trigger('mouseenter')
      await wrapper.find('rect.heatmap-cell').trigger('mouseleave')

      expect(wrapper.emitted('tooltip-hide')).toBeTruthy()
      wrapper.unmount()
    })

    it('沒有資料的格子 hover 時，tooltip 內容由 x/y/value 組出來', async () => {
      const wrapper = await mountHeatmap({
        data: ROWS.slice(0, 3),
        showMissingValues: true,
      })
      await flushTransitions()

      const missing = wrapper
        .findAll('rect.heatmap-cell')
        .find((c) => c.element.style.fill === 'rgb(224, 224, 224)')!
      await missing.trigger('mouseenter')

      const payload = wrapper.emitted('tooltip-show')![0][0] as { data: HeatmapDatum }
      expect(payload.data).toEqual({ x: 'B', y: 'P2', value: null })
      wrapper.unmount()
    })
  })

  describe('高亮模式', () => {
    it('highlightMode=cell 時只有被 hover 的格子改變邊框', async () => {
      const wrapper = await mountHeatmap({ highlightMode: 'cell' })
      await flushTransitions()

      const cells = wrapper.findAll('rect.heatmap-cell')
      await cells[0].trigger('mouseenter')

      expect(cells[0].element.style.strokeWidth).toBe('2')
      // 其他格子維持不透明
      expect(cells.slice(1).every((c) => c.element.style.opacity === '1')).toBe(true)
      wrapper.unmount()
    })

    it('highlightMode=row 時同列（同 y）的其他格子變半透明', async () => {
      const wrapper = await mountHeatmap({ highlightMode: 'row' })
      await flushTransitions()

      // renderData 依 x 外圈、y 內圈產生：A/P1, A/P2, B/P1, B/P2
      const cells = wrapper.findAll('rect.heatmap-cell')
      await cells[0].trigger('mouseenter') // A/P1

      // B/P1 同列 → 半透明；A/P2 與 B/P2 不同列 → 不變
      expect(cells[2].element.style.opacity).toBe('0.5')
      expect(cells[1].element.style.opacity).toBe('1')
      expect(cells[3].element.style.opacity).toBe('1')
      wrapper.unmount()
    })

    it('highlightMode=column 時同欄（同 x）的其他格子變半透明', async () => {
      const wrapper = await mountHeatmap({ highlightMode: 'column' })
      await flushTransitions()

      const cells = wrapper.findAll('rect.heatmap-cell')
      await cells[0].trigger('mouseenter') // A/P1

      expect(cells[1].element.style.opacity).toBe('0.5') // A/P2 同欄
      expect(cells[2].element.style.opacity).toBe('1')
      wrapper.unmount()
    })

    it('highlightMode=both 時同列與同欄都變半透明', async () => {
      const wrapper = await mountHeatmap({ highlightMode: 'both' })
      await flushTransitions()

      const cells = wrapper.findAll('rect.heatmap-cell')
      await cells[0].trigger('mouseenter')

      expect(cells[1].element.style.opacity).toBe('0.5')
      expect(cells[2].element.style.opacity).toBe('0.5')
      expect(cells[3].element.style.opacity).toBe('1') // 對角，不同列也不同欄
      wrapper.unmount()
    })

    it('mouseleave 後高亮全部復原', async () => {
      const wrapper = await mountHeatmap({ highlightMode: 'both' })
      await flushTransitions()

      const cells = wrapper.findAll('rect.heatmap-cell')
      await cells[0].trigger('mouseenter')
      await cells[0].trigger('mouseleave')

      expect(cells.every((c) => c.element.style.opacity === '1')).toBe(true)
      wrapper.unmount()
    })
  })

  describe('Brush 框選縮放', () => {
    /**
     * 用真實滑鼠事件驅動 d3-brush。
     *
     * d3.pointer 在 jsdom 會走 getBoundingClientRect 那條路（沒有
     * createSVGPoint），而 jsdom 的 rect 全是 0，因此 clientX/clientY
     * 就等於圖表內座標，可以直接當像素值用。
     */
    function dragBrush(
      overlay: Element,
      from: [number, number],
      to: [number, number]
    ): void {
      // d3-brush 在 mousedown 後把 mousemove / mouseup 掛到 event.view 上，
      // 所以事件一定要帶 view。但 vitest 的 jsdom 把 window 併進 Node 的
      // global，過不了 jsdom 內部的 instanceof Window 檢查，無法用建構子
      // 參數傳入 —— 只能建好之後在實例上覆寫這個 getter。
      const view = window
      const fire = (target: EventTarget, type: string, [x, y]: [number, number]) => {
        const event = new MouseEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          button: 0,
        })
        Object.defineProperty(event, 'view', { value: view })
        target.dispatchEvent(event)
      }
      fire(overlay, 'mousedown', from)
      fire(view, 'mousemove', to)
      fire(view, 'mouseup', to)
    }

    it('enableBrush 決定是否建立 brush 圖層', async () => {
      const off = await mountHeatmap({ enableBrush: false })
      expect(off.find('.brush-layer').exists()).toBe(false)

      const on = await mountHeatmap({ enableBrush: true })
      expect(on.find('.brush-layer').exists()).toBe(true)
      // d3.brush() 會建立 overlay 來接收拖曳
      expect(on.find('.brush-layer .overlay').exists()).toBe(true)

      off.unmount()
      on.unmount()
    })

    it('框選後發出 selection-change，只留下框到的類別', async () => {
      const wrapper = await mountHeatmap({ enableBrush: true })
      await flushTransitions()

      // chartWidth 380 / 2 類別 → bandwidth 190；chartHeight 280 / 2 → 140
      // 框 (0,0)-(100,100) 只會碰到左上角那一格 A/P1
      dragBrush(wrapper.find('.brush-layer .overlay').element, [0, 0], [100, 100])
      await nextTick()

      const events = wrapper.emitted('selection-change')!
      expect(events).toBeTruthy()
      expect(events[0][0]).toEqual({ xDomain: ['A'], yDomain: ['P1'] })
      wrapper.unmount()
    })

    it('框選後只重繪框到的格子，並出現重置按鈕', async () => {
      const wrapper = await mountHeatmap({ enableBrush: true })
      await flushTransitions()
      expect(wrapper.find('button').exists()).toBe(false)

      dragBrush(wrapper.find('.brush-layer .overlay').element, [0, 0], [100, 100])
      await nextTick()
      await flushTransitions()

      expect(wrapper.findAll('rect.heatmap-cell')).toHaveLength(1)
      expect(wrapper.find('button').exists()).toBe(true)
      wrapper.unmount()
    })

    it('按下重置按鈕還原 domain 並發出 zoom-reset', async () => {
      const wrapper = await mountHeatmap({ enableBrush: true })
      await flushTransitions()

      dragBrush(wrapper.find('.brush-layer .overlay').element, [0, 0], [100, 100])
      await nextTick()
      // d3 拖曳結束後會攔掉「下一個」click（避免拖曳被當成點擊），
      // 這個攔截器在一個 macrotask 後才解除，因此要先等過去再按按鈕。
      await flushTransitions()

      await wrapper.find('button').trigger('click')
      await flushTransitions()

      expect(wrapper.emitted('zoom-reset')).toBeTruthy()
      expect(wrapper.findAll('rect.heatmap-cell')).toHaveLength(4)
      expect(wrapper.find('button').exists()).toBe(false)
      wrapper.unmount()
    })

    it('空框選（點一下沒拖）不改變 domain', async () => {
      const wrapper = await mountHeatmap({ enableBrush: true })
      await flushTransitions()

      dragBrush(wrapper.find('.brush-layer .overlay').element, [50, 50], [50, 50])
      await nextTick()

      expect(wrapper.emitted('selection-change')).toBeFalsy()
      expect(wrapper.findAll('rect.heatmap-cell')).toHaveLength(4)
      wrapper.unmount()
    })
  })

  describe('自訂渲染器', () => {
    it('customRenderers.cell 接手繪製時，不套用預設單元格', async () => {
      const seen: { count: number } = { count: 0 }
      const wrapper = await mountHeatmap({
        customRenderers: {
          cell: (
            _selection: unknown,
            data: unknown[],
          ) => {
            seen.count = data.length
          },
        },
      })
      await flushTransitions()

      expect(seen.count).toBe(4)
      // 預設渲染被跳過
      expect(wrapper.findAll('rect.heatmap-cell')).toHaveLength(0)
      wrapper.unmount()
    })
  })
})
