import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptKpiCard from '@/components/library/charts/ChptKpiCard.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

function mountCard(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  wrapper = mount(ChptKpiCard, { props: { title: '良率', value: 98.6, precision: 1, suffix: '%', ...props }, slots, attachTo: document.body })
  return wrapper
}
const exposed = (w: VueWrapper) => w.vm as unknown as { status: string | null; delta: number | null }

describe('ChptKpiCard', () => {
  describe('與前期比較', () => {
    it('previous：預設算相對變化（%）', () => {
      const w = mountCard({ value: 110, previous: 100, precision: 0, suffix: 'pcs', comparisonLabel: '較上週' })
      expect(exposed(w).delta).toBeCloseTo(10)
      expect(w.text()).toContain('+10.0%')
      expect(w.text()).toContain('較上週')
    })

    it("deltaMode='absolute'：差值，單位預設同數值", () => {
      const w = mountCard({ value: 38, previous: 41, suffix: '人', deltaMode: 'absolute' })
      expect(exposed(w).delta).toBe(-3)
      expect(w.text()).toContain('−3.0人')
    })

    it('前期為 0 時不顯示百分比，比較說明也不顯示', () => {
      const w = mountCard({ value: 5, previous: 0, comparisonLabel: '較上週' })
      expect(exposed(w).delta).toBeNull()
      expect(w.text()).not.toContain('較上週')
    })

    it('delta 有給時以 delta 為準', () => {
      const w = mountCard({ previous: 50, delta: 0.4 })
      expect(exposed(w).delta).toBe(0.4)
    })

    it('higherIsBetter=false：下降是好事（綠色）', () => {
      const w = mountCard({ title: '不良率', value: 1.4, previous: 1.8, higherIsBetter: false, deltaMode: 'absolute' })
      const trend = w.find('.inline-flex.items-center.gap-0\\.5.font-medium')
      expect(trend.classes().join(' ')).toMatch(/success/)
    })
  })

  describe('目標與狀態', () => {
    it('只有 target：達到為達標，否則未達標；顯示「目標 …」', async () => {
      const w = mountCard({ target: 98.5 })
      expect(exposed(w).status).toBe('good')
      expect(w.text()).toContain('達標')
      expect(w.text()).toContain('目標 98.5%')
      await w.setProps({ value: 97 })
      expect(exposed(w).status).toBe('critical')
      expect(w.text()).toContain('未達標')
    })

    it('thresholds [接近, 達標]', async () => {
      const w = mountCard({ thresholds: [97.5, 98.5], value: 98 })
      expect(exposed(w).status).toBe('warning')
      expect(w.text()).toContain('接近目標')
      await w.setProps({ value: 99 })
      expect(exposed(w).status).toBe('good')
      await w.setProps({ value: 90 })
      expect(exposed(w).status).toBe('critical')
    })

    it('higherIsBetter=false 時門檻反過來（數值越小越好）', async () => {
      const w = mountCard({ title: '停機時數', value: 6.5, higherIsBetter: false, thresholds: [6, 5] })
      expect(exposed(w).status).toBe('critical')
      await w.setProps({ value: 5.5 })
      expect(exposed(w).status).toBe('warning')
      await w.setProps({ value: 4 })
      expect(exposed(w).status).toBe('good')
      await w.setProps({ thresholds: null, target: 5, value: 5 })
      expect(exposed(w).status).toBe('good')
    })

    it('status 直接指定優先；null 不顯示狀態；沒有 target 也沒有狀態', async () => {
      const w = mountCard({ target: 98.5, status: 'warning' })
      expect(exposed(w).status).toBe('warning')
      await w.setProps({ status: null })
      expect(exposed(w).status).toBeNull()
      expect(w.find('.absolute.inset-y-0').exists()).toBe(false)
      wrapper!.unmount()
      expect(exposed(mountCard()).status).toBeNull()
    })

    it('狀態不只靠顏色：色條之外有圖示與文字', () => {
      const w = mountCard({ target: 99 })
      expect(w.find('.absolute.inset-y-0').classes()).toContain('bg-danger-solid')
      const badge = w.findAll('span').find((s) => s.text().endsWith('未達標'))!
      expect(badge.text()).toContain('cancel') // 圖示
    })

    it('目標格式：targetFormat 優先；千分位依語系', async () => {
      const w = mountCard({ value: 52840, precision: 0, suffix: 'pcs', target: 55000 })
      expect(w.text()).toContain('目標 55,000 pcs')
      await w.setProps({ targetFormat: (v: number) => `${v / 1000}k` })
      expect(w.text()).toContain('目標 55k')
    })
  })

  describe('趨勢', () => {
    it('有 trend 才畫趨勢線；目標畫成參考線', () => {
      expect(mountCard().findComponent({ name: 'SparklineChart' }).exists()).toBe(false)
      wrapper!.unmount()
      const w = mountCard({ trend: [97, 98, 98.6], target: 98.5, trendLabel: '近 3 週' })
      const spark = w.findComponent({ name: 'SparklineChart' })
      expect(spark.props('referenceValue')).toBe(98.5)
      expect(spark.props('title')).toBe('良率趨勢（近 3 週）')
    })

    it('showTargetLine=false 時不畫參考線', () => {
      const w = mountCard({ trend: [1, 2], target: 2, showTargetLine: false })
      expect(w.findComponent({ name: 'SparklineChart' }).props('referenceValue')).toBeNull()
    })

    it('loading：不畫趨勢、狀態與目標', () => {
      const w = mountCard({ loading: true, trend: [1, 2], target: 1 })
      expect(w.findComponent({ name: 'SparklineChart' }).exists()).toBe(false)
      expect(w.text()).not.toContain('目標')
      expect(w.text()).not.toContain('達標')
    })
  })

  describe('可點', () => {
    it('clickable：一顆填滿卡片的按鈕，名稱含數值、狀態與目標；點了送出 click', async () => {
      const w = mountCard({ clickable: true, target: 98.5 })
      const btn = w.find('button')
      expect(btn.attributes('type')).toBe('button')
      expect(btn.attributes('aria-label')).toBe('良率，98.6%，達標，目標 98.5%')
      await btn.trigger('click')
      expect(w.emitted('click')).toHaveLength(1)
    })

    it('不可點時沒有按鈕', () => {
      expect(mountCard().find('button').exists()).toBe(false)
    })

    it('actions 插槽的按鈕在覆蓋按鈕之上，不是巢狀按鈕', () => {
      const w = mountCard({ clickable: true }, { actions: () => h('button', { type: 'button', class: 'act' }, '重新整理') })
      const act = w.find('button.act')
      expect(act.element.closest('button:not(.act)')).toBeNull()
      expect(act.element.parentElement!.className).toContain('z-[2]')
    })
  })

  it('語系：enUS', () => {
    wrapper = mount({
      render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptKpiCard, { title: 'Yield', value: 97, target: 98, suffix: '%', trend: [1, 2] })),
    }, { attachTo: document.body })
    expect(wrapper.text()).toContain('Off target')
    expect(wrapper.text()).toContain('Target 98%')
    expect(wrapper.findComponent({ name: 'SparklineChart' }).props('title')).toBe('Yield trend')
  })
})
