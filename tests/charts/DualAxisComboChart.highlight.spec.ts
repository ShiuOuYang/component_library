import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue'
import type { ChartLayer } from '@/components/library/charts/types/chart.types'

/**
 * 連動高亮（highlightKey + keyFn）。
 *
 * 圖表 600×400、預設 margin → 繪圖區 440×280；jsdom 裡 clientX / clientY 就是繪圖區座標。
 */

interface Row extends Record<string, unknown> {
  id: string
  category: string
  a: number
  b: number
  rate: number
}

const ROWS: Row[] = [
  { id: 'wo-1', category: 'Q1', a: 3, b: 4, rate: 10 },
  { id: 'wo-2', category: 'Q2', a: 5, b: 5, rate: 20 },
  { id: 'wo-3', category: 'Q3', a: 1, b: 2, rate: 15 },
]

const stacked: ChartLayer<Row> = {
  type: 'stacked-bar',
  data: ROWS,
  xValue: (d) => d.category,
  stackKeys: ['a', 'b'],
}

const line: ChartLayer<Row> = {
  type: 'line',
  yAxis: 'right',
  data: ROWS,
  xValue: (d) => d.category,
  yValue: (d) => d.rate,
  showDots: true,
}

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

async function mountChart(props: Record<string, unknown>) {
  wrapper = mount(DualAxisComboChart, {
    props: { width: 600, height: 400, animationDuration: 0, layers: [stacked, line], ...props },
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

const marks = (w: VueWrapper) => ({
  rects: w.findAll('.highlight-layer rect.highlight-rect'),
  points: w.findAll('.highlight-layer circle.highlight-point'),
})
const dimmed = (w: VueWrapper, selector: string) => w.findAll(`${selector}.is-dimmed`).length

describe('DualAxisComboChart：連動高亮', () => {
  it('沒有 highlightKey 時不畫標記、不淡化', async () => {
    const w = await mountChart({})
    expect(marks(w).rects).toHaveLength(0)
    expect(marks(w).points).toHaveLength(0)
    expect(w.findAll('.is-dimmed')).toHaveLength(0)
  })

  it('沒有 keyFn 時用 X 值對映：堆疊每一段與折線上的點都畫標記，其餘淡化', async () => {
    const w = await mountChart({ highlightKey: 'Q2' })
    expect(marks(w).rects).toHaveLength(2) // Q2 的 a、b 兩段
    expect(marks(w).points).toHaveLength(1) // 折線上 Q2 的點
    expect(dimmed(w, 'rect.stacked-bar')).toBe(4) // 3 列 × 2 段 − 2
    expect(dimmed(w, 'circle.line-dot')).toBe(2)
    expect(w.findAll('rect.stacked-bar.is-highlighted')).toHaveLength(2)
  })

  it('標記位置與對到的元素一致', async () => {
    const w = await mountChart({ highlightKey: 'Q2' })
    const target = w.findAll('rect.stacked-bar.is-highlighted')[0]
    const mark = marks(w).rects.find((r) => r.attributes('y') === target.attributes('y'))!
    expect(mark.attributes('x')).toBe(target.attributes('x'))
    expect(mark.attributes('width')).toBe(target.attributes('width'))
    expect(mark.attributes('height')).toBe(target.attributes('height'))

    // 圓點的 cx 由 D3 transition 套用（走 timer，duration 0 也要等一輪）
    await new Promise((r) => setTimeout(r, 30))
    const dot = w.find('circle.line-dot.is-highlighted')
    expect(marks(w).points[0].attributes('cx')).toBe(dot.attributes('cx'))
  })

  it('有 keyFn 時用 keyFn 的結果對映（X 值不再算數）', async () => {
    const keyFn = (d: Row) => d.id
    const w = await mountChart({
      layers: [{ ...stacked, keyFn }, { ...line, keyFn }],
      highlightKey: 'wo-3',
    })
    expect(marks(w).rects).toHaveLength(2)
    expect(marks(w).points).toHaveLength(1)

    await w.setProps({ highlightKey: 'Q3' })
    expect(marks(w).rects).toHaveLength(0)
    expect(marks(w).points).toHaveLength(0)
  })

  it('數字鍵與資料的數值 X 相符即可（一律以字串比對）', async () => {
    const pts = Array.from({ length: 5 }, (_, i) => ({ x: i * 10, y: i }))
    const w = await mountChart({
      layers: [{ type: 'scatter', data: pts, xValue: (d: { x: number }) => d.x, yValue: (d: { y: number }) => d.y }],
      xScaleType: 'linear',
      highlightKey: 20,
    })
    expect(marks(w).points).toHaveLength(1)
    expect(dimmed(w, 'circle.scatter-dot')).toBe(4)
  })

  it('時間軸：傳入同一時刻的另一個 Date 也對得到', async () => {
    const t0 = new Date('2026-10-01T08:00:00Z').getTime()
    const pts = Array.from({ length: 5 }, (_, i) => ({ t: new Date(t0 + i * 60_000), y: i }))
    const w = await mountChart({
      layers: [{ type: 'line', data: pts, xValue: (d: { t: Date }) => d.t, yValue: (d: { y: number }) => d.y }],
      xScaleType: 'time',
      highlightKey: new Date(t0 + 2 * 60_000),
    })
    expect(marks(w).points).toHaveLength(1)
  })

  it('一般長條：對到的那根畫外框', async () => {
    const w = await mountChart({
      layers: [{ type: 'bar', data: ROWS, xValue: (d: Row) => d.category, yValue: (d: Row) => d.a }],
      highlightKey: 'Q1',
    })
    const bar = w.find('rect.bar.is-highlighted')
    const mark = marks(w).rects[0]
    expect(marks(w).rects).toHaveLength(1)
    expect(mark.attributes('x')).toBe(bar.attributes('x'))
    expect(mark.attributes('y')).toBe(bar.attributes('y'))
    expect(dimmed(w, 'rect.bar')).toBe(2)
  })

  it('取消高亮（null）時移除標記與淡化', async () => {
    const w = await mountChart({ highlightKey: 'Q2' })
    await w.setProps({ highlightKey: null })
    expect(marks(w).rects).toHaveLength(0)
    expect(marks(w).points).toHaveLength(0)
    expect(w.findAll('.is-dimmed')).toHaveLength(0)
  })

  /**
   * 回歸：高亮常由表格滑過驅動，會頻繁切換。
   * 換 highlightKey 不能讓整張圖重繪 —— 長條會被移除重建，帶動畫時每次都從 0 長一次。
   */
  it('換 highlightKey 只更新標記，資料元素不重建', async () => {
    const w = await mountChart({ highlightKey: 'Q1', animationDuration: 750 })
    const before = w.findAll('rect.stacked-bar').map((r) => r.element)
    await w.setProps({ highlightKey: 'Q3' })
    await w.setProps({ highlightKey: 'Q2' })
    const after = w.findAll('rect.stacked-bar').map((r) => r.element)
    expect(after).toHaveLength(before.length)
    after.forEach((el, i) => expect(el).toBe(before[i]))
    expect(w.findAll('rect.stacked-bar.is-highlighted')).toHaveLength(2)
  })

  it('大量資料模式（Canvas）也畫標記', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      setTransform: () => {}, clearRect: () => {}, beginPath: () => {}, moveTo: () => {},
      rect: () => {}, arc: () => {}, fill: () => {}, globalAlpha: 1, fillStyle: '',
    } as unknown as CanvasRenderingContext2D)
    const pts = Array.from({ length: 3000 }, (_, i) => ({ x: i, y: 50 }))
    const w = await mountChart({
      layers: [{ type: 'scatter', data: pts, xValue: (d: { x: number }) => d.x, yValue: (d: { y: number }) => d.y }],
      xScaleType: 'linear',
      yLeftDomain: [0, 100],
      highlightKey: 1500,
    })
    expect(w.findAll('circle.scatter-dot')).toHaveLength(0)
    const [point] = marks(w).points
    expect(Number(point.attributes('cx'))).toBeCloseTo((1500 / 2999) * 440, 1)
    expect(Number(point.attributes('cy'))).toBeCloseTo(140, 1)
  })

  describe('事件帶出 key（雙向連動）', () => {
    it('hover / click 長條：layer-hover、tooltip-show、layer-click 都帶 key', async () => {
      const w = await mountChart({})
      const bar = w.findAll('rect.stacked-bar')[1] // Q2 的 a 段
      await bar.trigger('mouseenter')
      await bar.trigger('click')
      expect((w.emitted('layer-hover')![0][0] as { key: string }).key).toBe('Q2')
      expect((w.emitted('tooltip-show')![0][0] as { key: string }).key).toBe('Q2')
      expect((w.emitted('layer-click')![0][0] as { key: string }).key).toBe('Q2')
    })

    it('有 keyFn 時事件裡的 key 是 keyFn 的結果，可直接回填 highlightKey', async () => {
      const keyFn = (d: Row) => d.id
      const w = await mountChart({ layers: [stacked, { ...line, keyFn }] })
      await w.findAll('circle.line-dot')[2].trigger('click')
      const key = (w.emitted('layer-click')![0][0] as { key: string }).key
      expect(key).toBe('wo-3')
      await w.setProps({ highlightKey: key })
      expect(w.find('circle.line-dot.is-highlighted').exists()).toBe(true)
    })

    it('大量資料模式的 hover 也帶 key', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        setTransform: () => {}, clearRect: () => {}, beginPath: () => {}, moveTo: () => {},
        rect: () => {}, arc: () => {}, fill: () => {}, globalAlpha: 1, fillStyle: '',
      } as unknown as CanvasRenderingContext2D)
      const pts = Array.from({ length: 3000 }, (_, i) => ({ id: `p${i}`, x: i, y: 50 }))
      const w = await mountChart({
        layers: [{
          type: 'scatter', data: pts, keyFn: (d: { id: string }) => d.id,
          xValue: (d: { x: number }) => d.x, yValue: (d: { y: number }) => d.y,
        }],
        xScaleType: 'linear',
        yLeftDomain: [0, 100],
        enableBrush: false,
      })
      w.find('svg').element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 220, clientY: 140 }))
      const payload = w.emitted('tooltip-show')![0][0] as { key: string; data: { id: string } }
      expect(payload.key).toBe(payload.data.id)
    })
  })
})
