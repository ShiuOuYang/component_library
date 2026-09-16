import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ParetoChart from '@/components/library/charts/ParetoChart.vue'
import type { ParetoInputItem } from '@/components/library/charts/ParetoChart.vue'

/**
 * 這個元件用一連串 setTimeout 延遲繪製（為了等 Modal 裡的容器定尺寸），
 * 因此測試要自己推進時間；容器尺寸在 jsdom 一律為 0，也必須先 stub，
 * 否則 drawParetoChart 會一直重試而畫不出東西。
 */
const VIEWPORT = { width: 600, height: 400 }

function stubContainerSize(): void {
  Element.prototype.getBoundingClientRect = function (): DOMRect {
    return {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      top: 0,
      left: 0,
      right: VIEWPORT.width,
      bottom: VIEWPORT.height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect
  }
}

const ROWS: ParetoInputItem[] = [
  { name: 'B類', count: 30 },
  { name: 'A類', count: 50 },
  { name: 'D類', count: 5 },
  { name: 'C類', count: 15 },
]

/**
 * 掛載並推進所有延遲繪製。
 *
 * 掛載後的流程是 setTimeout(300) → updateParetoData
 * → setTimeout(150) → drawParetoChart，所以要多推幾輪。
 */
async function mountPareto(props: Record<string, unknown> = {}) {
  const wrapper = mount(ParetoChart, {
    props: { paretoInputData: ROWS, ...props },
    attachTo: document.body,
  })
  await settle()
  return wrapper
}

/** 把所有待處理的 timer 與 microtask 跑完 */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await vi.advanceTimersByTimeAsync(400)
    await nextTick()
  }
}

beforeEach(() => {
  stubContainerSize()
  vi.useFakeTimers()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ParetoChart', () => {
  describe('資料處理', () => {
    it('依數量降序排列，並把尾巴歸為 Other', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 80 })

      const data = wrapper.emitted('update:paretoData')!.at(-1)![0] as Array<{
        name: string
        cumulative: number
      }>
      // A(50) B(累積 80 達標) 之後的 C、D 併成 Other
      expect(data.map((d) => d.name)).toEqual(['A類', 'B類', 'Other'])
      expect(data.map((d) => d.cumulative)).toEqual([50, 80, 100])
      wrapper.unmount()
    })

    it('percentage 是個別佔比，cumulative 是累積百分比', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100 })

      const data = wrapper.emitted('update:paretoData')!.at(-1)![0] as Array<{
        name: string
        percentage: number
        cumulative: number
      }>
      expect(data.map((d) => d.percentage)).toEqual([50, 30, 15, 5])
      expect(data.map((d) => d.cumulative)).toEqual([50, 80, 95, 100])
      wrapper.unmount()
    })

    it('閾值改變後重新分組', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100 })
      expect(wrapper.findAll('rect.bar')).toHaveLength(4)

      await wrapper.setProps({ cumulativeThreshold: 50 })
      await settle()

      // A 一項就達到 50%，其餘併成 Other
      expect(wrapper.findAll('rect.bar')).toHaveLength(2)
      wrapper.unmount()
    })

    it('過濾掉沒有名稱或數量不合法的資料', async () => {
      const wrapper = await mountPareto({
        cumulativeThreshold: 100,
        paretoInputData: [
          { name: 'ok', count: 10 },
          { name: '', count: 5 },
          { name: 'negative', count: -3 },
          { name: 'notNumber', count: 'x' },
        ] as unknown as ParetoInputItem[],
      })

      const data = wrapper.emitted('update:paretoData')!.at(-1)![0] as Array<{ name: string }>
      expect(data.map((d) => d.name)).toEqual(['ok'])
      wrapper.unmount()
    })

    it('名稱是數字時會轉成字串（否則算標籤空間會得到 NaN）', async () => {
      const wrapper = await mountPareto({
        cumulativeThreshold: 100,
        paretoInputData: [{ name: 12, count: 10 }] as unknown as ParetoInputItem[],
      })

      const data = wrapper.emitted('update:paretoData')!.at(-1)![0] as Array<{ name: string }>
      expect(data[0].name).toBe('12')
      // margin 沒有變成 NaN，圖表照樣畫出來
      expect(wrapper.findAll('rect.bar')).toHaveLength(1)
      wrapper.unmount()
    })
  })

  describe('渲染', () => {
    it('每筆資料一根長條，並標上數量', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100 })

      expect(wrapper.findAll('rect.bar')).toHaveLength(4)
      expect(wrapper.findAll('text.bar-label').map((t) => t.text())).toEqual([
        '50',
        '30',
        '15',
        '5',
      ])
      wrapper.unmount()
    })

    it('畫出累積折線、點與百分比標籤', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100 })

      expect(wrapper.find('path.cumulative-line').exists()).toBe(true)
      expect(wrapper.findAll('circle.cumulative-dot')).toHaveLength(4)
      expect(wrapper.findAll('text.cumulative-label').map((t) => t.text())).toEqual([
        '50.0%',
        '80.0%',
        '95.0%',
        '100.0%',
      ])
      wrapper.unmount()
    })

    it('畫出閾值參考線與標籤', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 75, thresholdLabel: '門檻' })

      expect(wrapper.find('line.threshold-line').exists()).toBe(true)
      expect(wrapper.find('text.threshold-label').text()).toBe('75% 門檻')
      wrapper.unmount()
    })

    it('X 軸刻度為類別名稱，右軸為百分比', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100 })

      expect(wrapper.findAll('.x-axis .tick text').map((t) => t.text())).toEqual([
        'A類',
        'B類',
        'C類',
        'D類',
      ])
      const right = wrapper.findAll('.y-axis-right .tick text').map((t) => t.text())
      expect(right).toContain('100%')
      wrapper.unmount()
    })

    it('chartWidth 為 0 時採用容器寬度', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100 })
      expect(wrapper.find('svg').attributes('width')).toBe(String(VIEWPORT.width))

      const fixed = await mountPareto({ cumulativeThreshold: 100, chartWidth: 300 })
      expect(fixed.find('svg').attributes('width')).toBe('300')

      wrapper.unmount()
      fixed.unmount()
    })

    it('colorScheme 決定長條顏色，依序輪替', async () => {
      const wrapper = await mountPareto({
        cumulativeThreshold: 100,
        colorScheme: ['#111111', '#222222'],
      })

      const fills = wrapper.findAll('rect.bar').map((b) => b.attributes('fill'))
      expect(fills[0]).toBe('#111111')
      expect(fills[1]).toBe('#222222')
      // 顏色用完會從頭再來
      expect(fills[2]).toBe('#111111')
      wrapper.unmount()
    })

    it('hover 長條會改變不透明度', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100 })
      const bar = wrapper.find('rect.bar')

      expect(bar.attributes('opacity')).toBe('0.8')
      await bar.trigger('mouseover')
      expect(bar.attributes('opacity')).toBe('1')
      await bar.trigger('mouseout')
      expect(bar.attributes('opacity')).toBe('0.8')
      wrapper.unmount()
    })
  })

  describe('空狀態', () => {
    it('沒有資料時顯示 emptyText，不畫圖', async () => {
      const wrapper = await mountPareto({ paretoInputData: [], emptyText: '沒有資料' })

      expect(wrapper.text()).toContain('沒有資料')
      expect(wrapper.find('svg.bar').exists()).toBe(false)
      expect(wrapper.findAll('rect.bar')).toHaveLength(0)
      wrapper.unmount()
    })

    it('數量全為 0 時視為空資料', async () => {
      const wrapper = await mountPareto({ paretoInputData: [{ name: 'A', count: 0 }] })

      expect(wrapper.findAll('rect.bar')).toHaveLength(0)
      wrapper.unmount()
    })
  })

  describe('統計資訊', () => {
    it('顯示總量、類型數、閾值與 Top3 佔比', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100, showStatistics: true })

      const text = wrapper.text()
      expect(text).toContain('100') // 總數量
      expect(text).toContain('A類') // 最大項
      // Top3 = 50 + 30 + 15 = 95
      expect(text).toContain('95.0%')
      wrapper.unmount()
    })

    it('showStatistics=false 時不顯示', async () => {
      const wrapper = await mountPareto({ showStatistics: false, statisticsTitle: '統計區' })
      expect(wrapper.text()).not.toContain('統計區')
      wrapper.unmount()
    })

    it('標籤文字可自訂', async () => {
      const wrapper = await mountPareto({
        countLabel: '缺陷總數',
        typeLabel: '缺陷種類',
        maxLabel: '最嚴重',
      })

      const text = wrapper.text()
      expect(text).toContain('缺陷總數')
      expect(text).toContain('缺陷種類')
      expect(text).toContain('最嚴重')
      wrapper.unmount()
    })
  })

  describe('事件', () => {
    it('繪製完成後發出 chartRendered，帶上處理後的資料', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100 })

      const rendered = wrapper.emitted('chartRendered')!
      expect(rendered).toBeTruthy()
      const data = rendered.at(-1)![0] as Array<{ name: string }>
      expect(data).toHaveLength(4)
      wrapper.unmount()
    })

    it('資料換掉後重新發出 update:paretoData', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100 })
      const before = wrapper.emitted('update:paretoData')!.length

      await wrapper.setProps({ paretoInputData: [{ name: 'X', count: 1 }] })
      await settle()

      expect(wrapper.emitted('update:paretoData')!.length).toBeGreaterThan(before)
      expect(wrapper.findAll('rect.bar')).toHaveLength(1)
      wrapper.unmount()
    })
  })

  describe('生命週期', () => {
    it('卸載後不再有待處理的延遲繪製', async () => {
      const wrapper = await mountPareto()
      wrapper.unmount()

      // 卸載時所有 timer 都該被取消
      expect(vi.getTimerCount()).toBe(0)
    })

    it('容器一直沒有尺寸時，重試不會在卸載後繼續', async () => {
      // 讓容器永遠是 0 尺寸，逼 drawParetoChart 走重試分支
      Element.prototype.getBoundingClientRect = function (): DOMRect {
        return { width: 0, height: 0, toJSON: () => ({}) } as DOMRect
      }

      const wrapper = mount(ParetoChart, {
        props: { paretoInputData: ROWS },
        attachTo: document.body,
      })
      await settle()

      // 重試迴圈確實在跑
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      wrapper.unmount()
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe('對外方法', () => {
    it('defineExpose 提供 forceRerender / updateParetoData / paretoData', async () => {
      const wrapper = await mountPareto({ cumulativeThreshold: 100 })
      const vm = wrapper.vm as unknown as Record<string, unknown>

      expect(typeof vm.forceRerender).toBe('function')
      expect(typeof vm.updateParetoData).toBe('function')
      expect(Array.isArray(vm.paretoData)).toBe(true)
      expect((vm.paretoData as unknown[]).length).toBe(4)
      wrapper.unmount()
    })
  })
})
