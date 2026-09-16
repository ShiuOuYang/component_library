import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import EnterprisePareto from '@/components/library/charts/EnterprisePareto.vue'
import type { ChartDatum } from '@/components/library/charts/types/chart.types'

/**
 * jsdom 沒有排版引擎，但 D3 仍會建立 SVG 節點與屬性。
 * transform 插值需要 SVGGraphicsElement.transform，由
 * tests/svg-polyfills.js 補上，否則 transition 會中斷。
 */

const ROWS: ChartDatum[] = [
  { category: 'B類', value: 30 },
  { category: 'A類', value: 50 },
  { category: 'D類', value: 5 },
  { category: 'C類', value: 15 },
]

const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 }

async function mountPareto(props: Record<string, unknown> = {}) {
  const wrapper = mount(EnterprisePareto, {
    props: {
      data: ROWS,
      width: 420,
      height: 320,
      margin: MARGIN,
      animationDuration: 0,
      autoResize: false,
      enableThresholdFilter: false,
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
  await new Promise((resolve) => setTimeout(resolve, 40))
}

function tickTexts(wrapper: ReturnType<typeof mount>, axisClass: string): string[] {
  return wrapper.findAll(`${axisClass} .tick text`).map((t) => t.text())
}

describe('EnterprisePareto', () => {
  describe('基本渲染', () => {
    it('每個類別一根長條', async () => {
      const wrapper = await mountPareto()
      expect(wrapper.findAll('rect.pareto-bar')).toHaveLength(4)
      wrapper.unmount()
    })

    it('長條依數值降序排列（柏拉圖的前提）', async () => {
      const wrapper = await mountPareto()
      await flushTransitions()

      expect(tickTexts(wrapper, '.x-axis')).toEqual(['A類', 'B類', 'C類', 'D類'])
      wrapper.unmount()
    })

    it('sortOrder=asc 時改為升序', async () => {
      const wrapper = await mountPareto({ sortOrder: 'asc' })
      await flushTransitions()

      expect(tickTexts(wrapper, '.x-axis')).toEqual(['D類', 'C類', 'B類', 'A類'])
      wrapper.unmount()
    })

    it('autoSort=false 時照傳入順序', async () => {
      const wrapper = await mountPareto({ autoSort: false })
      await flushTransitions()

      expect(tickTexts(wrapper, '.x-axis')).toEqual(['B類', 'A類', 'D類', 'C類'])
      wrapper.unmount()
    })

    it('長條高度與數值成正比', async () => {
      const wrapper = await mountPareto()
      await flushTransitions()

      const heights = wrapper
        .findAll('rect.pareto-bar')
        .map((b) => Number(b.attributes('height')))
      // 降序排列，所以高度也遞減
      expect(heights[0]).toBeGreaterThan(heights[1])
      expect(heights[1]).toBeGreaterThan(heights[2])
      expect(heights[2]).toBeGreaterThan(heights[3])
      wrapper.unmount()
    })

    it('title 有值才畫標題', async () => {
      const withTitle = await mountPareto({ title: '缺陷分析' })
      await flushTransitions()
      expect(withTitle.find('.title-layer text').text()).toBe('缺陷分析')

      const without = await mountPareto()
      expect(without.find('.title-layer text').exists()).toBe(false)

      withTitle.unmount()
      without.unmount()
    })
  })

  describe('累積曲線', () => {
    it('畫出折線與每個點', async () => {
      const wrapper = await mountPareto()
      await flushTransitions()

      expect(wrapper.find('path.cumulative-line').exists()).toBe(true)
      expect(wrapper.findAll('circle.line-point')).toHaveLength(4)
      wrapper.unmount()
    })

    it('累積百分比標籤遞增到 100%', async () => {
      const wrapper = await mountPareto()
      await flushTransitions()

      const labels = wrapper.findAll('text.cumulative-label').map((t) => t.text())
      expect(labels).toEqual(['50.0%', '80.0%', '95.0%', '100.0%'])
      wrapper.unmount()
    })

    it('showCumulativeLine=false 時不畫折線與點', async () => {
      const wrapper = await mountPareto({ showCumulativeLine: false })
      await flushTransitions()

      expect(wrapper.find('path.cumulative-line').exists()).toBe(false)
      expect(wrapper.findAll('circle.line-point')).toHaveLength(0)
      wrapper.unmount()
    })

    it('showLinePoints=false 時只留折線', async () => {
      const wrapper = await mountPareto({ showLinePoints: false })
      await flushTransitions()

      expect(wrapper.find('path.cumulative-line').exists()).toBe(true)
      expect(wrapper.findAll('circle.line-point')).toHaveLength(0)
      expect(wrapper.findAll('text.cumulative-label')).toHaveLength(0)
      wrapper.unmount()
    })

    it('showCumulativePoints 作為別名優先於 showLinePoints', async () => {
      const wrapper = await mountPareto({ showLinePoints: true, showCumulativePoints: false })
      await flushTransitions()

      expect(wrapper.findAll('circle.line-point')).toHaveLength(0)
      wrapper.unmount()
    })
  })

  describe('參考線', () => {
    it('預設畫出 80% 參考線與標籤', async () => {
      const wrapper = await mountPareto()
      await flushTransitions()

      expect(wrapper.find('line.reference-line-path').exists()).toBe(true)
      expect(wrapper.find('text.reference-line-label').text()).toBe('80%')
      wrapper.unmount()
    })

    it('referenceLinePercent 決定高度與標籤', async () => {
      const wrapper = await mountPareto({ referenceLinePercent: 90 })
      await flushTransitions()

      expect(wrapper.find('text.reference-line-label').text()).toBe('90%')
      // chartHeight = 320 - 20 = 300，右軸 0–100 → 90% 落在 30
      expect(Number(wrapper.find('line.reference-line-path').attributes('y1'))).toBeCloseTo(30)
      wrapper.unmount()
    })

    it('showReferenceLine=false 時不畫', async () => {
      const wrapper = await mountPareto({ showReferenceLine: false })
      await flushTransitions()

      expect(wrapper.find('line.reference-line-path').exists()).toBe(false)
      wrapper.unmount()
    })

    it('referenceLineDash 套用到虛線樣式', async () => {
      const wrapper = await mountPareto({ referenceLineDash: [8, 3] })
      await flushTransitions()

      expect(wrapper.find('line.reference-line-path').element.style.strokeDasharray).toBe('8,3')
      wrapper.unmount()
    })
  })

  describe('門檻過濾', () => {
    it('啟用時把累積超過門檻的尾巴併成「其他」', async () => {
      const wrapper = await mountPareto({
        enableThresholdFilter: true,
        referenceLinePercent: 80,
        otherLabel: '其他',
      })
      await flushTransitions()

      // A(50) B(80 達標) 之後的 C、D 併成一筆
      expect(tickTexts(wrapper, '.x-axis')).toEqual(['A類', 'B類', '其他'])
      expect(wrapper.findAll('rect.pareto-bar')).toHaveLength(3)
      wrapper.unmount()
    })

    it('併出來的「其他」仍讓累積百分比收在 100%', async () => {
      const wrapper = await mountPareto({
        enableThresholdFilter: true,
        referenceLinePercent: 80,
      })
      await flushTransitions()

      const labels = wrapper.findAll('text.cumulative-label').map((t) => t.text())
      expect(labels[labels.length - 1]).toBe('100.0%')
      wrapper.unmount()
    })
  })

  describe('數值標籤', () => {
    it('showValuesOnBars 決定是否顯示', async () => {
      const off = await mountPareto()
      await flushTransitions()
      expect(off.findAll('text.bar-value')).toHaveLength(0)

      const on = await mountPareto({ showValuesOnBars: true })
      await flushTransitions()
      expect(on.findAll('text.bar-value')).toHaveLength(4)

      off.unmount()
      on.unmount()
    })

    it('valueFormat 決定數值呈現方式', async () => {
      const wrapper = await mountPareto({
        showValuesOnBars: true,
        valueFormat: (v: number) => `${v} 件`,
      })
      await flushTransitions()

      expect(wrapper.findAll('text.bar-value').map((t) => t.text())).toContain('50 件')
      wrapper.unmount()
    })
  })

  describe('座標軸', () => {
    it('左軸為數值、右軸為百分比', async () => {
      const wrapper = await mountPareto()
      await flushTransitions()

      // 右軸固定 0–100，預設格式加上 %
      const right = tickTexts(wrapper, '.y-axis-right')
      expect(right[0]).toBe('0%')
      expect(right[right.length - 1]).toBe('100%')
      // 左軸最大值約為 50 * 1.1 = 55，nice() 後為 60
      expect(tickTexts(wrapper, '.y-axis-left').length).toBeGreaterThan(0)
      wrapper.unmount()
    })

    it('xAxisFormat 套用到刻度文字', async () => {
      const wrapper = await mountPareto({ xAxisFormat: (v: string) => v.replace('類', '') })
      await flushTransitions()

      expect(tickTexts(wrapper, '.x-axis')).toEqual(['A', 'B', 'C', 'D'])
      wrapper.unmount()
    })

    it('yAxisLeftFormat 套用到左軸', async () => {
      const wrapper = await mountPareto({ yAxisLeftFormat: (v: number) => `${v}件` })
      await flushTransitions()

      const texts = tickTexts(wrapper, '.y-axis-left').filter(Boolean)
      expect(texts.length).toBeGreaterThan(0)
      expect(texts.every((t) => t.endsWith('件'))).toBe(true)
      wrapper.unmount()
    })

    it('yAxisRightFormat 套用到右軸', async () => {
      const wrapper = await mountPareto({ yAxisRightFormat: (v: number) => `${v / 100}` })
      await flushTransitions()

      expect(tickTexts(wrapper, '.y-axis-right')).toContain('1')
      wrapper.unmount()
    })

    it('valueDomain 可固定左軸範圍', async () => {
      const wrapper = await mountPareto({ valueDomain: [0, 200] })
      await flushTransitions()

      expect(tickTexts(wrapper, '.y-axis-left')).toContain('200')
      wrapper.unmount()
    })

    it('軸名稱有值才畫', async () => {
      const wrapper = await mountPareto({ xAxisLabel: '缺陷類型' })
      await flushTransitions()

      expect(wrapper.findAll('.axis-label').map((l) => l.text())).toContain('缺陷類型')
      wrapper.unmount()
    })

    it('xAxisAngle 旋轉 X 軸標籤', async () => {
      const wrapper = await mountPareto({ xAxisAngle: -30 })
      await flushTransitions()

      expect(wrapper.find('.x-axis .tick text').attributes('transform')).toBe('rotate(-30)')
      wrapper.unmount()
    })
  })

  describe('防禦：資料不足時不應拋錯', () => {
    it('data 為空陣列', async () => {
      const wrapper = await mountPareto({ data: [] })
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.findAll('rect.pareto-bar')).toHaveLength(0)
      wrapper.unmount()
    })

    it('數值全為 0 時不畫長條（百分比算不出來）', async () => {
      const wrapper = await mountPareto({ data: [{ category: 'A', value: 0 }] })
      expect(wrapper.findAll('rect.pareto-bar')).toHaveLength(0)
      wrapper.unmount()
    })

    it('單一類別也畫得出來', async () => {
      const wrapper = await mountPareto({ data: [{ category: 'A', value: 10 }] })
      await flushTransitions()

      expect(wrapper.findAll('rect.pareto-bar')).toHaveLength(1)
      expect(wrapper.find('text.cumulative-label').text()).toBe('100.0%')
      wrapper.unmount()
    })

    it('自訂欄位名稱', async () => {
      const wrapper = await mountPareto({
        data: [{ defect: '刮傷', count: 8 }, { defect: '污染', count: 2 }],
        categoryField: 'defect',
        valueField: 'count',
      })
      await flushTransitions()

      expect(tickTexts(wrapper, '.x-axis')).toEqual(['刮傷', '污染'])
      wrapper.unmount()
    })
  })

  describe('事件', () => {
    it('掛載後發出 chart-ready，且只發一次', async () => {
      const wrapper = await mountPareto()
      expect(wrapper.emitted('chart-ready')).toHaveLength(1)

      await wrapper.setProps({ title: '改個標題' })
      await nextTick()
      // 重繪不該再發一次
      expect(wrapper.emitted('chart-ready')).toHaveLength(1)
      wrapper.unmount()
    })

    it('點擊長條發出 bar-click 並帶上該筆資料', async () => {
      const wrapper = await mountPareto()
      await wrapper.find('rect.pareto-bar').trigger('click')

      const payload = wrapper.emitted('bar-click')![0][0] as {
        data: { category: string; cumulativePercent: number }
      }
      // 降序後第一根是 A類
      expect(payload.data.category).toBe('A類')
      expect(payload.data.cumulativePercent).toBe(50)
      wrapper.unmount()
    })

    it('hover 長條發出 bar-hover 與 tooltip-show', async () => {
      const wrapper = await mountPareto()
      await wrapper.find('rect.pareto-bar').trigger('mouseenter', { clientX: 12, clientY: 34 })

      expect(wrapper.emitted('bar-hover')).toBeTruthy()
      const payload = wrapper.emitted('tooltip-show')![0][0] as {
        position: { pageX: number; pageY: number }
      }
      expect(payload.position).toEqual({ pageX: 12, pageY: 34 })
      wrapper.unmount()
    })

    it('enableTooltip=false 時 hover 不發 tooltip-show', async () => {
      const wrapper = await mountPareto({ enableTooltip: false })
      await wrapper.find('rect.pareto-bar').trigger('mouseenter')

      expect(wrapper.emitted('tooltip-show')).toBeFalsy()
      wrapper.unmount()
    })

    it('mouseleave 發出 tooltip-hide', async () => {
      const wrapper = await mountPareto()
      await wrapper.find('rect.pareto-bar').trigger('mouseenter')
      await wrapper.find('rect.pareto-bar').trigger('mouseleave')

      expect(wrapper.emitted('tooltip-hide')).toBeTruthy()
      wrapper.unmount()
    })
  })

  describe('資料更新', () => {
    it('data 換掉後長條數量跟著變', async () => {
      const wrapper = await mountPareto()
      expect(wrapper.findAll('rect.pareto-bar')).toHaveLength(4)

      await wrapper.setProps({ data: [{ category: 'X', value: 1 }, { category: 'Y', value: 2 }] })
      await nextTick()
      await flushTransitions()

      expect(wrapper.findAll('rect.pareto-bar')).toHaveLength(2)
      expect(tickTexts(wrapper, '.x-axis')).toEqual(['Y', 'X'])
      wrapper.unmount()
    })

    it('barColor 換掉後長條顏色跟著變', async () => {
      const wrapper = await mountPareto({ barColor: 'rgb(1, 2, 3)' })
      await flushTransitions()
      expect(wrapper.find('rect.pareto-bar').element.style.fill).toBe('rgb(1, 2, 3)')

      await wrapper.setProps({ barColor: 'rgb(4, 5, 6)' })
      await nextTick()
      await flushTransitions()

      expect(wrapper.find('rect.pareto-bar').element.style.fill).toBe('rgb(4, 5, 6)')
      wrapper.unmount()
    })
  })

  describe('對外方法', () => {
    it('defineExpose 提供 render 與 forceRerender', async () => {
      const wrapper = await mountPareto()
      const vm = wrapper.vm as unknown as Record<string, unknown>

      expect(typeof vm.render).toBe('function')
      expect(typeof vm.forceRerender).toBe('function')
      wrapper.unmount()
    })
  })
})
