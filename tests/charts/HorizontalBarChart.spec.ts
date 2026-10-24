import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import HorizontalBarChart from '@/components/library/charts/HorizontalBarChart.vue'
import type { HorizontalBarEvent, HorizontalBarTooltip } from '@/components/library'

/** 圖 500×300、margin 0、名稱欄 100 → 5 列每列 60px */
const DATA = [
  { id: 'b', label: '空焊', value: 98 },
  { id: 'a', label: '錫橋', value: 132 },
  { id: 'c', label: '零件偏移', value: 76 },
  { id: 'd', label: '立碑', value: 41 },
  { id: 'e', label: '錫珠', value: 35 },
]

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function mountChart(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  wrapper = mount(HorizontalBarChart, {
    props: { data: DATA, width: 500, height: 300, margin: { top: 0, right: 0, bottom: 0, left: 0 }, labelWidth: 100, ...props },
    slots,
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

const rows = (w: VueWrapper) => w.findAll('.hbc-row')
const row = (w: VueWrapper, key: string) => w.find(`.hbc-row[data-key="${key}"]`)
/** 名稱文字（不含 <title>） */
const labelOf = (w: VueWrapper, key: string) => {
  const el = row(w, key).find('.hbc-label').element
  return Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
}
const fillOf = (w: VueWrapper, key: string) => (row(w, key).find('.hbc-bar').element as SVGElement).style.fill

describe('HorizontalBarChart：排行', () => {
  it('由大到小，數值標在長條末端', async () => {
    const w = await mountChart()
    expect(rows(w).map((r) => r.attributes('data-key'))).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(row(w, 'a').find('.hbc-value').text()).toBe('132')
    // 每列 60px，第一列中心 y = 30
    expect(row(w, 'a').find('.hbc-label').attributes('y')).toBe('30')
  })

  it('最長的長條加上末端數值，不會超出圖寬', async () => {
    const w = await mountChart({ showPercent: true })
    const value = row(w, 'a').find('.hbc-value')
    const x = Number(value.attributes('x'))
    // 「132（29.9%）」約 8 個半形 + 2 個全形字寬
    expect(x + 0.6 * 12 * 8 + 12 * 2).toBeLessThanOrEqual(500)
    expect(value.text()).toBe('132（34.6%）')
  })

  it('長條粗細最多 24px，資料端圓角', async () => {
    const w = await mountChart({ barThickness: 40 })
    const d = row(w, 'a').find('.hbc-bar').attributes('d')!
    expect(d).toMatch(/^M100,18 H/)
    expect(d).toContain('A4,4')
    expect(d).toMatch(/H100 Z$/)
  })

  it('topN + showOthers：其餘併成灰色的「其他」', async () => {
    const w = await mountChart({ topN: 3, showOthers: true, showRank: true })
    expect(rows(w)).toHaveLength(4)
    expect(labelOf(w, '__others__')).toBe('其他（2 項）')
    expect(row(w, '__others__').find('.hbc-value').text()).toBe('76')
    expect(fillOf(w, '__others__')).toContain('stroke-dark')
    expect(labelOf(w, 'a')).toBe('1. 錫橋')
  })

  it("sort='asc' / 'none'", async () => {
    const w = await mountChart({ sort: 'asc' })
    expect(rows(w)[0].attributes('data-key')).toBe('e')
    await w.setProps({ sort: 'none' })
    expect(rows(w)[0].attributes('data-key')).toBe('b')
  })

  it('autoHeight：高度依列數撐開', async () => {
    const w = await mountChart({ autoHeight: true, rowHeight: 30 })
    expect(w.find('svg').attributes('height')).toBe(String(5 * 30))
    expect((w.element as HTMLElement).style.height).toBe('auto')
  })

  it('名稱太長：截斷加「…」，完整名稱在 <title>', async () => {
    const w = await mountChart({ data: [{ id: 'x', label: '一個非常非常非常非常長的不良原因名稱', value: 1 }], labelWidth: 80 })
    expect(labelOf(w, 'x').endsWith('…')).toBe(true)
    expect(row(w, 'x').find('title').text()).toBe('一個非常非常非常非常長的不良原因名稱')
  })

  it('名稱欄寬自動：依最長的名稱，最多圖寬的 40%', async () => {
    const w = await mountChart({ labelWidth: null })
    // 最長「零件偏移」4 字 × 12 + 12 = 60
    expect(row(w, 'a').find('.hbc-label').attributes('x')).toBe(String(60 - 8))
  })

  it('負值從基線往左長，數值標在左邊', async () => {
    const w = await mountChart({ data: [{ id: 'p', label: 'P', value: 2 }, { id: 'n', label: 'N', value: -1 }] })
    const neg = row(w, 'n')
    expect(neg.find('.hbc-value').attributes('text-anchor')).toBe('end')
    // d3 用真正的減號（−），不是連字號
    expect(neg.find('.hbc-value').text()).toBe('−1')
    const d = neg.find('.hbc-bar').attributes('d')!
    expect(d).toContain('A4,4 0 0 0')
    // 有負值時佔比沒有意義
    await neg.trigger('mouseenter')
    expect((w.emitted('bar-hover')![0][0] as HorizontalBarEvent).share).toBeNull()
  })

  it('全部是 0 或沒有資料：不會出錯', async () => {
    const w = await mountChart({ data: [{ id: 'z', label: 'Z', value: 0 }] })
    expect(row(w, 'z').find('.hbc-bar').attributes('d')).toBe('')
    await w.setProps({ data: [] })
    expect(w.text()).toContain('沒有資料')
    expect(w.find('svg').attributes('aria-label')).toBe('水平長條圖：沒有資料')
  })

  it('valueDomain 指定範圍；超出的長條畫到邊界', async () => {
    const w = await mountChart({ valueDomain: [0, 100], showValues: false })
    const d = row(w, 'a').find('.hbc-bar').attributes('d')!
    expect(d).toContain('A4,4 0 0 1 500,')
  })
})

describe('HorizontalBarChart：強調、參考線、數值軸', () => {
  it('highlightKey：強調那一列，其餘轉灰', async () => {
    const w = await mountChart({ highlightKey: 'c' })
    expect(fillOf(w, 'c')).toContain('chart-1')
    expect(fillOf(w, 'a')).toContain('surface-muted')
    expect(row(w, 'a').classes()).toContain('is-dimmed')
    await w.setProps({ highlightKey: 'nope' })
    expect(fillOf(w, 'a')).toContain('chart-1')
  })

  it('color 指定長條顏色', async () => {
    const w = await mountChart({ color: '#ff0000' })
    expect(fillOf(w, 'a')).toBe('rgb(255, 0, 0)')
  })

  it('參考線：畫在長條底下，有文字', async () => {
    const w = await mountChart({ referenceLines: [{ value: 100, label: '目標' }, { value: 50 }, { value: NaN }] })
    const refs = w.findAll('.hbc-reference')
    expect(refs).toHaveLength(2)
    expect(refs[0].text()).toBe('目標')
    expect(refs[1].text()).toBe('50')
    // 參考線在第一列之前（DOM 順序 = 繪製順序）
    const svg = w.find('svg').element
    expect(Array.from(svg.children).indexOf(refs[0].element) < Array.from(svg.children).indexOf(rows(w)[0].element)).toBe(true)
  })

  it('showAxis：底部刻度，1,000 以上簡寫', async () => {
    const w = await mountChart({ data: [{ id: 'a', label: 'A', value: 4000 }], showAxis: true })
    const ticks = w.findAll('.hbc-tick').map((t) => t.text())
    expect(ticks).toContain('0')
    expect(ticks).toContain('2k')
    expect(w.findAll('.hbc-grid').length).toBe(ticks.length)
    await w.setProps({ showGrid: false })
    expect(w.findAll('.hbc-grid')).toHaveLength(0)
  })

  it('有標題時列往下移', async () => {
    const w = await mountChart({ title: '不良 Top 5' })
    expect(w.find('.hbc-title').text()).toBe('不良 Top 5')
    expect(w.find('svg').attributes('aria-label')).toBe('不良 Top 5：共 5 項，第一名 錫橋 132')
  })
})

describe('HorizontalBarChart：互動', () => {
  it('滑過：提示框數值在前、名稱在後，有名次與佔比；離開隱藏', async () => {
    const w = await mountChart()
    await row(w, 'b').trigger('mouseenter', { clientX: 200, clientY: 80 })
    const ev = w.emitted('bar-hover')![0][0] as HorizontalBarEvent
    expect(ev).toMatchObject({ key: 'b', label: '空焊', value: 98, rank: 2, isOthers: false })
    expect(ev.share).toBeCloseTo(98 / 382)
    const tip = w.find('[role="tooltip"]')
    expect(tip.text()).toContain('98')
    expect(tip.text()).toContain('空焊')
    expect(tip.text()).toContain('第 2 名')
    expect(tip.text()).toContain('佔總數 25.7%')
    expect((w.emitted('tooltip-show')![0][0] as HorizontalBarTooltip).position).toEqual({ containerX: 200, containerY: 80 })

    await row(w, 'b').trigger('mousemove', { clientX: 210, clientY: 80 })
    expect(w.emitted('bar-hover')).toHaveLength(1)
    await row(w, 'c').trigger('mousemove', { clientX: 210, clientY: 140 })
    expect(w.emitted('bar-hover')).toHaveLength(2)

    await row(w, 'c').trigger('mouseleave')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('tooltip-hide')).toHaveLength(1)
  })

  it('鍵盤聚焦也顯示提示框（與滑鼠相同）', async () => {
    const w = await mountChart()
    expect(row(w, 'a').attributes('tabindex')).toBe('0')
    expect(row(w, 'a').attributes('aria-label')).toBe('錫橋：132')
    await row(w, 'a').trigger('focus')
    expect(w.find('[role="tooltip"]').text()).toContain('第 1 名')
    await row(w, 'a').trigger('blur')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('「其他」的提示框顯示合計幾項', async () => {
    const w = await mountChart({ topN: 2, showOthers: true })
    await row(w, '__others__').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('合計 3 項')
    expect(w.find('[role="tooltip"]').text()).not.toContain('名')
  })

  it('點擊送出 bar-click（含原始資料）', async () => {
    const w = await mountChart()
    await row(w, 'c').trigger('click')
    expect((w.emitted('bar-click')![0][0] as HorizontalBarEvent).datum).toBe(DATA[2])
  })

  it('enableTooltip=false：不顯示提示框、不能聚焦', async () => {
    const w = await mountChart({ enableTooltip: false })
    await row(w, 'a').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(row(w, 'a').attributes('tabindex')).toBeUndefined()
  })

  it('customRenderers：barColor、valueLabel、tooltip', async () => {
    const w = await mountChart({
      customRenderers: {
        barColor: (d: Record<string, unknown> | null) => (d?.id === 'a' ? '#00ff00' : null),
        valueLabel: (_: unknown, item: HorizontalBarEvent) => `${item.value} 件`,
        tooltip: (d: Record<string, unknown> | null) => [`代碼 ${d?.id}`],
      },
    })
    expect(fillOf(w, 'a')).toBe('rgb(0, 255, 0)')
    expect(fillOf(w, 'b')).toContain('chart-1')
    expect(row(w, 'a').find('.hbc-value').text()).toBe('132 件')
    await row(w, 'a').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('代碼 a')
    expect(w.find('[role="tooltip"]').text()).not.toContain('第 1 名')
  })

  it('valueFormat', async () => {
    const w = await mountChart({ valueFormat: (v: number) => `${v} pcs` })
    expect(row(w, 'a').find('.hbc-value').text()).toBe('132 pcs')
  })

  it('tooltip 插槽', async () => {
    const w = await mountChart(
      {},
      { tooltip: '<template #tooltip="{ tooltipData, tooltipVisible }"><i v-if="tooltipVisible" class="tip">{{ tooltipData.label }}</i></template>' }
    )
    await row(w, 'd').trigger('mouseenter')
    expect(w.find('.tip').text()).toBe('立碑')
  })
})

describe('HorizontalBarChart：生命週期', () => {
  it('掛載時送出 chart-ready', async () => {
    const w = await mountChart()
    expect(w.emitted('chart-ready')).toEqual([[{ width: 500, height: 300 }]])
  })

  it('autoResize：跟著容器寬度重算，卸載時斷開', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const disconnect = vi.fn()
    let callback: ResizeObserverCallback = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn((cb: ResizeObserverCallback) => {
        callback = cb
        return { observe: vi.fn(), disconnect }
      })
    )
    const w = await mountChart({ autoResize: true })
    callback([{ contentRect: { width: 800, height: 240 } } as ResizeObserverEntry], {} as ResizeObserver)
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(w.emitted('chart-resize')).toEqual([[{ width: 800, height: 240 }]])
    expect(w.find('svg').attributes('width')).toBe('800')
    w.unmount()
    wrapper = null
    expect(disconnect).toHaveBeenCalled()
  })
})
