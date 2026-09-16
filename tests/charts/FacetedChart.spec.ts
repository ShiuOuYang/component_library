import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import FacetedChart from '@/components/library/charts/FacetedChart.vue'
import type { VerticalFacet } from '@/components/library/charts/FacetedChart.vue'
import type { ChartDatum } from '@/components/library/charts/types/chart.types'

interface Row extends ChartDatum {
  t: number
  v: number
}

const ROWS: Row[] = [
  { t: 1, v: 10 },
  { t: 2, v: 30 },
  { t: 3, v: 20 },
]

function makeFacet(id: string, overrides: Partial<VerticalFacet> = {}): VerticalFacet {
  return {
    id,
    title: id.toUpperCase(),
    layers: [
      {
        type: 'line',
        yAxis: 'left',
        data: ROWS,
        xValue: (d) => (d as Row).t,
        yValue: (d) => (d as Row).v,
      },
    ],
    ...overrides,
  }
}

async function mountFaceted(props: Record<string, unknown> = {}) {
  const wrapper = mount(FacetedChart, {
    props: {
      facets: [makeFacet('a'), makeFacet('b')],
      width: 600,
      totalHeight: 500,
      xScaleType: 'linear',
      autoResize: false,
      ...props,
    },
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

describe('FacetedChart', () => {
  describe('版面', () => {
    it('每個分面一個容器，並標上標題', async () => {
      const wrapper = await mountFaceted()

      const items = wrapper.findAll('.facet-item')
      expect(items).toHaveLength(2)
      expect(wrapper.findAll('.facet-label').map((l) => l.text())).toEqual(['A', 'B'])
      wrapper.unmount()
    })

    it('分面由上往下堆疊，偏移從 margin.top 起算', async () => {
      const wrapper = await mountFaceted({
        margin: { top: 40, right: 20, bottom: 60, left: 20 },
        facetSpacing: 10,
        lastFacetExtraHeight: 0,
      })

      const items = wrapper.findAll('.facet-item')
      // 可用高度 = 500 - 40 - 60 - 10 = 390，兩個均分 → 195
      expect(items[0].element.style.top).toBe('40px')
      expect(items[0].element.style.height).toBe('195px')
      expect(items[1].element.style.top).toBe('245px') // 40 + 195 + 10
      wrapper.unmount()
    })

    it('最後一個分面多留空間給 X 軸刻度', async () => {
      const wrapper = await mountFaceted({
        margin: { top: 40, right: 20, bottom: 60, left: 20 },
        facetSpacing: 10,
        lastFacetExtraHeight: 50,
      })

      const items = wrapper.findAll('.facet-item')
      expect(items[0].element.style.height).toBe('195px')
      expect(items[1].element.style.height).toBe('245px')
      wrapper.unmount()
    })

    it('最後一個分面帶上 is-last 類別', async () => {
      const wrapper = await mountFaceted()

      const items = wrapper.findAll('.facet-item')
      expect(items[0].classes()).not.toContain('is-last')
      expect(items[1].classes()).toContain('is-last')
      wrapper.unmount()
    })

    it('分面指定 height 時當權重按比例分配', async () => {
      const wrapper = await mountFaceted({
        facets: [makeFacet('a', { height: 1 }), makeFacet('b', { height: 3 })],
        margin: { top: 0, right: 20, bottom: 0, left: 20 },
        facetSpacing: 0,
        lastFacetExtraHeight: 0,
      })

      const items = wrapper.findAll('.facet-item')
      // 可用 500，權重 1:3 → 125 / 375
      expect(items[0].element.style.height).toBe('125px')
      expect(items[1].element.style.height).toBe('375px')
      wrapper.unmount()
    })

    it('autoResize=false 時容器用固定尺寸', async () => {
      const wrapper = await mountFaceted({ width: 640, totalHeight: 480 })

      expect(wrapper.element.style.width).toBe('640px')
      expect(wrapper.element.style.height).toBe('480px')
      wrapper.unmount()
    })

    it('autoResize=true 時不寫死尺寸，並加上 auto-resize 類別', async () => {
      const wrapper = await mountFaceted({ autoResize: true })

      expect(wrapper.element.style.width).toBe('')
      expect(wrapper.classes()).toContain('auto-resize')
      wrapper.unmount()
    })

    it('title 有值才顯示全域標題', async () => {
      const withTitle = await mountFaceted({ title: '製程趨勢' })
      expect(withTitle.find('.chart-title').text()).toBe('製程趨勢')

      const without = await mountFaceted()
      expect(without.find('.chart-title').exists()).toBe(false)

      withTitle.unmount()
      without.unmount()
    })
  })

  describe('子圖表', () => {
    it('每個分面都渲染出一張圖', async () => {
      const wrapper = await mountFaceted()

      expect(wrapper.findAll('.facet-item svg')).toHaveLength(2)
      expect(wrapper.findAll('path.line').length).toBeGreaterThanOrEqual(2)
      wrapper.unmount()
    })

    it('只有最後一個分面留下緣空間畫 X 軸刻度', async () => {
      const wrapper = await mountFaceted({ xAxisLabelRotate: -45 })

      const charts = wrapper.findAllComponents({ name: 'DualAxisComboChart' })
      // 非最後一個貼著底部；最後一個要容納旋轉後的刻度標籤
      expect(charts[0].props('margin')).toMatchObject({ bottom: 10 })
      expect(charts[1].props('margin')).toMatchObject({ bottom: 60 })
      wrapper.unmount()
    })

    it('X 軸標籤不旋轉時，最後一個分面的下緣可以少留一點', async () => {
      const wrapper = await mountFaceted({ xAxisLabelRotate: 0 })

      const charts = wrapper.findAllComponents({ name: 'DualAxisComboChart' })
      expect(charts[1].props('margin')).toMatchObject({ bottom: 50 })
      wrapper.unmount()
    })

    it('左右邊距沿用外層 margin', async () => {
      const wrapper = await mountFaceted({
        margin: { top: 40, right: 75, bottom: 60, left: 85 },
      })

      const charts = wrapper.findAllComponents({ name: 'DualAxisComboChart' })
      expect(charts[0].props('margin')).toMatchObject({ left: 85, right: 75, top: 10 })
      wrapper.unmount()
    })

    it('分面的 showGrid 可個別關閉', async () => {
      const wrapper = await mountFaceted({
        facets: [makeFacet('a', { showGrid: false }), makeFacet('b')],
      })
      await new Promise((r) => setTimeout(r, 30))

      const items = wrapper.findAll('.facet-item')
      expect(items[0].findAll('.grid-left line')).toHaveLength(0)
      expect(items[1].findAll('.grid-left line').length).toBeGreaterThan(0)
      wrapper.unmount()
    })
  })

  describe('框選同步', () => {
    it('syncBrush=true 時框選後所有分面共用同一個 X domain', async () => {
      const wrapper = await mountFaceted({ syncBrush: true })

      // 模擬子圖表回報框選結果
      const charts = wrapper.findAllComponents({ name: 'DualAxisComboChart' })
      charts[0].vm.$emit('selection-change', { xDomain: [1, 2] })
      await nextTick()

      // 兩張圖都收到同一個 domain
      for (const chart of wrapper.findAllComponents({ name: 'DualAxisComboChart' })) {
        expect(chart.props('xDomain')).toEqual([1, 2])
      }
      wrapper.unmount()
    })

    it('syncBrush=false 時各分面用自己的 xDomain', async () => {
      const wrapper = await mountFaceted({
        syncBrush: false,
        facets: [makeFacet('a', { xDomain: [1, 2] }), makeFacet('b', { xDomain: [2, 3] })],
      })

      const charts = wrapper.findAllComponents({ name: 'DualAxisComboChart' })
      expect(charts[0].props('xDomain')).toEqual([1, 2])
      expect(charts[1].props('xDomain')).toEqual([2, 3])
      wrapper.unmount()
    })

    it('框選後轉發 selection-change 並帶上 facetId', async () => {
      const wrapper = await mountFaceted()

      wrapper
        .findAllComponents({ name: 'DualAxisComboChart' })[1]
        .vm.$emit('selection-change', { xDomain: [1, 2] })
      await nextTick()

      const payload = wrapper.emitted('selection-change')![0][0] as {
        facetId: string
        xDomain: number[]
      }
      expect(payload.facetId).toBe('b')
      expect(payload.xDomain).toEqual([1, 2])
      wrapper.unmount()
    })

    it('X 軸拖曳也會同步，Y 軸不會', async () => {
      const wrapper = await mountFaceted({ syncBrush: true })
      const charts = wrapper.findAllComponents({ name: 'DualAxisComboChart' })

      charts[0].vm.$emit('axis-drag', { axis: 'y', domain: [0, 99] })
      await nextTick()
      expect(charts[1].props('xDomain')).toBeNull()

      charts[0].vm.$emit('axis-drag', { axis: 'x', domain: [1, 3] })
      await nextTick()
      expect(
        wrapper.findAllComponents({ name: 'DualAxisComboChart' })[1].props('xDomain')
      ).toEqual([1, 3])
      wrapper.unmount()
    })
  })

  describe('重置', () => {
    it('沒有縮放時不顯示重置按鈕', async () => {
      const wrapper = await mountFaceted({ showResetButton: true })
      expect(wrapper.find('.reset-button').exists()).toBe(false)
      wrapper.unmount()
    })

    it('框選後出現重置按鈕，按下還原並發出 zoom-reset', async () => {
      const wrapper = await mountFaceted({ showResetButton: true })

      wrapper
        .findAllComponents({ name: 'DualAxisComboChart' })[0]
        .vm.$emit('selection-change', { xDomain: [1, 2] })
      await nextTick()
      expect(wrapper.find('.reset-button').exists()).toBe(true)

      await wrapper.find('.reset-button').trigger('click')
      expect(wrapper.emitted('zoom-reset')).toBeTruthy()
      await nextTick()

      expect(wrapper.find('.reset-button').exists()).toBe(false)
      expect(
        wrapper.findAllComponents({ name: 'DualAxisComboChart' })[0].props('xDomain')
      ).toBeNull()
      wrapper.unmount()
    })

    it('showResetButton=false 時即使有縮放也不顯示', async () => {
      const wrapper = await mountFaceted({ showResetButton: false })

      wrapper
        .findAllComponents({ name: 'DualAxisComboChart' })[0]
        .vm.$emit('selection-change', { xDomain: [1, 2] })
      await nextTick()

      expect(wrapper.find('.reset-button').exists()).toBe(false)
      wrapper.unmount()
    })

    it('子圖表自己發 zoom-reset 也會還原', async () => {
      const wrapper = await mountFaceted()
      const charts = wrapper.findAllComponents({ name: 'DualAxisComboChart' })

      charts[0].vm.$emit('selection-change', { xDomain: [1, 2] })
      await nextTick()
      charts[0].vm.$emit('zoom-reset')
      await nextTick()

      expect(wrapper.find('.reset-button').exists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('Tooltip', () => {
    it('預設 tooltip 依游標位置擺放，並顯示分面標題', async () => {
      const wrapper = await mountFaceted()
      await new Promise((r) => setTimeout(r, 30))

      const dot = wrapper.find('.facet-item circle.line-dot')
      if (dot.exists()) {
        await dot.trigger('mouseenter', { clientX: 120, clientY: 80 })
        const tooltip = wrapper.find('.default-tooltip')
        expect(tooltip.exists()).toBe(true)
        expect(tooltip.element.style.left).toBe('130px')
        expect(tooltip.element.style.top).toBe('70px')
        expect(tooltip.text()).toContain('A')
      }
      wrapper.unmount()
    })
  })

  describe('防禦', () => {
    it('facets 為空陣列時不拋錯', async () => {
      const wrapper = await mountFaceted({ facets: [] })
      expect(wrapper.findAll('.facet-item')).toHaveLength(0)
      wrapper.unmount()
    })

    it('分面沒有 layers 時仍畫得出空圖', async () => {
      const wrapper = await mountFaceted({ facets: [{ id: 'empty', title: '空' }] })
      expect(wrapper.findAll('.facet-item svg')).toHaveLength(1)
      wrapper.unmount()
    })
  })
})
