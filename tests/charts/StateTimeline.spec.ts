import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import StateTimeline from '@/components/library/charts/StateTimeline.vue'
import type { StateSummary, StateTimelineEvent } from '@/components/library'

const MIN = 60_000
const T0 = new Date(2026, 9, 23, 0, 0).getTime()

/**
 * 圖寬 600、margin 0、名稱欄 100、統計欄 100（+8 間距）→ 繪圖區 x 100～492，寬 392
 * 時間範圍 0～392 分鐘：一個像素剛好一分鐘
 */
const DATA = [
  { machine: 'M1', state: 'run', start: T0 },
  { machine: 'M1', state: 'down', start: T0 + 100 * MIN },
  { machine: 'M1', state: 'run', start: T0 + 150 * MIN },
  { machine: 'M2', state: 'idle', start: T0 },
  { machine: 'M2', state: 'run', start: T0 + 200 * MIN },
  { machine: 'M2', state: 'down', start: T0 + 300 * MIN, end: T0 + 300 * MIN + 20_000 },
  { machine: 'M2', state: 'run', start: T0 + 300 * MIN + 20_000 },
]

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
})

async function mountChart(props: Record<string, unknown> = {}) {
  wrapper = mount(StateTimeline, {
    props: {
      data: DATA,
      width: 600,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      labelWidth: 100,
      summaryWidth: 100,
      timeDomain: [T0, T0 + 392 * MIN],
      ...props,
    },
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

const svg = (w: VueWrapper) => w.find('svg')
/** 第 r 列（從 0）中間、第 minute 分鐘的位置；列從 y=34 開始，每列 28 */
function point(minute: number, r: number) {
  return { clientX: 100 + minute + 0.5, clientY: 34 + r * 28 + 14 }
}
async function hoverAt(w: VueWrapper, minute: number, r: number) {
  await svg(w).trigger('mousemove', point(minute, r))
}
/** 機台名稱（不含 <title>） */
const labels = (w: VueWrapper) =>
  w.findAll('.stl-label').map((l) => Array.from(l.element.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim())
const lastEvent = <T>(w: VueWrapper, name: string) => w.emitted(name)?.at(-1)?.[0] as T

describe('StateTimeline：畫面', () => {
  it('每台一列，依像素合併成矩形；顏色取自 states', async () => {
    const w = await mountChart()
    const rows = w.findAll('.stl-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].find('.stl-label').text()).toContain('M1')
    const runs = rows[0].findAll('.stl-run')
    expect(runs.map((r) => [r.attributes('x'), r.attributes('width')])).toEqual([
      ['0', '100'],
      ['100', '50'],
      ['150', '242'],
    ])
    expect(runs[1].attributes('style')).toContain('danger-solid')
  })

  it('20 秒的停機在全覽時也畫得出來（故障優先）', async () => {
    const w = await mountChart()
    const runs = w.findAll('.stl-row')[1].findAll('.stl-run')
    const down = runs.find((r) => r.attributes('style')?.includes('danger-solid'))
    expect(down?.attributes('x')).toBe('300')
    expect(down?.attributes('width')).toBe('1')
  })

  it('rows 給順序與名稱；沒有資料的機台也有一列', async () => {
    const w = await mountChart({ rows: [{ value: 'M2', label: '貼片機' }, 'M3'] })
    expect(labels(w)).toEqual(['貼片機', 'M3', 'M1'])
    // M3 沒有紀錄：稼動率是 —
    expect(w.findAll('.stl-util')[1].text()).toBe('—')
  })

  it('右側統計：稼動率 + 圖示 + 文字、停機時間與次數', async () => {
    const w = await mountChart()
    const util = w.findAll('.stl-util').map((t) => t.text())
    // M1：運轉 342 / 392
    expect(util[0]).toContain('87.2%')
    expect(util[0]).toContain('達標')
    expect(w.findAll('.stl-status')[0].classes()).toContain('is-good')
    expect(w.findAll('.stl-down')[0].text()).toBe('50 分（1 次）')
    // M2：待機 200 分 → 稼動率 (392-200-1/3)/392 ≈ 48.9%，偏低
    expect(util[1]).toContain('偏低')
    expect(w.findAll('.stl-status')[1].text()).toBe('✕')
  })

  it('停機超過一小時用小數的小時', async () => {
    const w = await mountChart({
      data: [
        { machine: 'M1', state: 'down', start: T0 },
        { machine: 'M1', state: 'run', start: T0 + 90 * MIN },
      ],
    })
    expect(w.find('.stl-down').text()).toBe('1.5 小時（1 次）')
    expect(w.find('.stl-util').text()).toContain('尚可')
  })

  it('圖例列出定義的狀態，加上資料裡不認得的狀態', async () => {
    const w = await mountChart({ data: [...DATA, { machine: 'M1', state: 'setup', start: T0 + 390 * MIN }] })
    const items = w.findAll('.stl-legend li').map((l) => l.text())
    expect(items).toEqual(['運轉', '待機', '保養', '故障', 'setup'])
  })

  it('沒有資料時顯示提示；showSummary、showLegend 可以關掉', async () => {
    const w = await mountChart({ data: [], showSummary: false, showLegend: false, timeDomain: null })
    expect(w.find('.stl-empty').text()).toBe('沒有資料')
    expect(w.find('.stl-summary-head').exists()).toBe(false)
    expect(w.find('.stl-legend').exists()).toBe(false)
    expect(svg(w).attributes('aria-label')).toContain('沒有資料')
  })

  it('sortRows：依稼動率由低到高、依停機時間由多到少', async () => {
    const w = await mountChart({ sortRows: 'utilization' })
    expect(labels(w)).toEqual(['M2', 'M1'])
    await w.setProps({ sortRows: 'downTime' })
    expect(labels(w)).toEqual(['M1', 'M2'])
  })

  it('showNow 畫出現在的線（在範圍內時）', async () => {
    const w = await mountChart({ showNow: true, now: T0 + 50 * MIN })
    expect(w.find('.stl-now').attributes('x1')).toBe('150')
    await w.setProps({ now: T0 + 1000 * MIN })
    expect(w.find('.stl-now').exists()).toBe(false)
  })

  it('沒有指定範圍時用資料範圍；最後一筆畫到 openEndTime', async () => {
    const w = await mountChart({ timeDomain: null, openEndTime: T0 + 400 * MIN })
    expect(svg(w).attributes('aria-label')).toContain('稼動率最低的是 M2')
    const runs = w.findAll('.stl-row')[0].findAll('.stl-run')
    expect(Number(runs.at(-1)!.attributes('x')) + Number(runs.at(-1)!.attributes('width'))).toBe(392)
  })
})

describe('StateTimeline：統計事件', () => {
  it('掛載時送出 summary-change；getSummary() 回傳同樣的內容', async () => {
    const w = await mountChart()
    const list = lastEvent<StateSummary[]>(w, 'summary-change')
    expect(list.map((s) => s.row)).toEqual(['M1', 'M2'])
    expect(list[0].longestDown).toEqual({ start: T0 + 100 * MIN, end: T0 + 150 * MIN, state: 'down' })
    const vm = w.vm as unknown as { getSummary: () => StateSummary[] }
    expect(vm.getSummary()).toEqual(list)
  })

  it('excludeStates 不計入稼動率分母', async () => {
    const w = await mountChart({ excludeStates: ['idle'] })
    const m2 = lastEvent<StateSummary[]>(w, 'summary-change')[1]
    expect(m2.planned).toBe(192 * MIN)
  })
})

describe('StateTimeline：提示框', () => {
  it('滑過色帶：顯示狀態、機台、時間與長度，送出 segment-hover 與 tooltip-show', async () => {
    const w = await mountChart()
    await hoverAt(w, 120, 0)
    const tip = w.find('[role="tooltip"]')
    expect(tip.text()).toContain('故障')
    expect(tip.text()).toContain('50 分')
    expect(tip.text()).toContain('M1')
    expect(tip.text()).toContain('01:40 ～ 02:30')
    const ev = lastEvent<StateTimelineEvent>(w, 'segment-hover')
    expect(ev).toMatchObject({ row: 'M1', state: 'down', stateLabel: '故障', duration: 50 * MIN, openEnded: true })
    expect(ev.datum).toBe(DATA[1])
    expect(w.emitted('tooltip-show')).toHaveLength(1)
    expect(w.find('.stl-hover-box').attributes('width')).toBe('50')
    expect(w.findAll('.stl-row')[0].classes()).toContain('is-hovered')
  })

  it('在同一段內移動不重送事件；移到不同段才送', async () => {
    const w = await mountChart()
    await hoverAt(w, 110, 0)
    await hoverAt(w, 130, 0)
    expect(w.emitted('segment-hover')).toHaveLength(1)
    await hoverAt(w, 200, 0)
    expect(w.emitted('segment-hover')).toHaveLength(2)
  })

  it('指到 20 秒停機所在的像素：說明的是那次停機（跟顏色一致）', async () => {
    const w = await mountChart()
    await hoverAt(w, 300, 1)
    expect(lastEvent<StateTimelineEvent>(w, 'segment-hover')).toMatchObject({ state: 'down', duration: 20_000, openEnded: false })
    // 不到一個像素的段落也框得到
    expect(w.find('.stl-hover-box').attributes('width')).toBe('2')
  })

  it('最後一段仍在進行中時註明；移出繪圖區或離開時隱藏', async () => {
    const w = await mountChart()
    await hoverAt(w, 380, 0)
    expect(w.find('[role="tooltip"]').text()).toContain('仍在進行中')
    await svg(w).trigger('mousemove', { clientX: 50, clientY: 48 })
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('tooltip-hide')).toHaveLength(1)
    await hoverAt(w, 10, 1)
    await svg(w).trigger('mouseleave')
    expect(w.emitted('tooltip-hide')).toHaveLength(2)
    // 已經隱藏時不重送
    await svg(w).trigger('mouseleave')
    expect(w.emitted('tooltip-hide')).toHaveLength(2)
  })

  it('指到列以外（時間軸、最後一列下方）沒有提示', async () => {
    const w = await mountChart()
    await svg(w).trigger('mousemove', { clientX: 150, clientY: 10 })
    await svg(w).trigger('mousemove', { clientX: 150, clientY: 34 + 2 * 28 + 5 })
    expect(w.emitted('segment-hover')).toBeUndefined()
  })

  it('customRenderers.tooltip 自訂內容；enableTooltip=false 時不顯示', async () => {
    const w = await mountChart({ customRenderers: { tooltip: (e: StateTimelineEvent) => [`工單 ${e.row}-01`] } })
    await hoverAt(w, 10, 0)
    expect(w.find('[role="tooltip"]').text()).toContain('工單 M1-01')
    await w.setProps({ enableTooltip: false })
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('點擊送出 segment-click', async () => {
    const w = await mountChart()
    await svg(w).trigger('click', point(320, 1))
    expect(lastEvent<StateTimelineEvent>(w, 'segment-click')).toMatchObject({ row: 'M2', state: 'run' })
    // 點在缺口（沒有段落）不送
    await svg(w).trigger('click', { clientX: 50, clientY: 48 })
    expect(w.emitted('segment-click')).toHaveLength(1)
  })
})

describe('StateTimeline：鍵盤', () => {
  async function key(w: VueWrapper, k: string) {
    await svg(w).trigger('keydown', { key: k })
  }
  const hovered = (w: VueWrapper) => lastEvent<StateTimelineEvent>(w, 'segment-hover')

  it('方向鍵：先選到畫面中間的段落，左右逐段、上下換機台；aria-live 唸出內容', async () => {
    const w = await mountChart()
    await key(w, 'ArrowRight')
    expect(hovered(w)).toMatchObject({ row: 'M1', state: 'run', start: new Date(T0 + 150 * MIN) })
    await key(w, 'ArrowLeft')
    expect(hovered(w)).toMatchObject({ row: 'M1', state: 'down' })
    await key(w, 'ArrowDown')
    // 故障段的中間（125 分）在 M2 是待機
    expect(hovered(w)).toMatchObject({ row: 'M2', state: 'idle' })
    await key(w, 'ArrowDown')
    expect(hovered(w).row).toBe('M2')
    await key(w, 'ArrowUp')
    expect(hovered(w).row).toBe('M1')
    expect(w.find('[aria-live]').text()).toContain('M1，')
  })

  it('Home／End 第一段與最後一段；Enter 等同點擊；Escape 關掉', async () => {
    const w = await mountChart()
    await key(w, 'ArrowDown')
    await key(w, 'End')
    expect(hovered(w)).toMatchObject({ row: 'M2', state: 'run', openEnded: true })
    await key(w, 'Home')
    expect(hovered(w)).toMatchObject({ row: 'M2', state: 'idle' })
    await key(w, 'Enter')
    expect(lastEvent<StateTimelineEvent>(w, 'segment-click').state).toBe('idle')
    await key(w, 'Escape')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    // 沒選到段落時 Enter 不做事；其他按鍵不攔截
    await key(w, 'Enter')
    expect(w.emitted('segment-click')).toHaveLength(1)
    await key(w, 'a')
    await svg(w).trigger('blur')
  })

  it('沒有資料時按鍵不做事', async () => {
    const w = await mountChart({ data: [] })
    await key(w, 'ArrowDown')
    expect(w.emitted('segment-hover')).toBeUndefined()
  })
})

describe('StateTimeline：縮放與平移', () => {
  function wheel(w: VueWrapper, init: WheelEventInit) {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
    svg(w).element.dispatchEvent(event)
    return event
  }
  const domainOf = (w: VueWrapper) => lastEvent<{ timeDomain: [Date, Date] }>(w, 'zoom-change').timeDomain.map((d) => (d.getTime() - T0) / MIN)

  it('Ctrl + 滾輪以游標為中心放大；統計跟著可見範圍', async () => {
    const w = await mountChart()
    const ev = wheel(w, { ...point(100, 0), deltaY: -500, ctrlKey: true })
    expect(ev.defaultPrevented).toBe(true)
    await nextTick()
    const [a, b] = domainOf(w)
    // 游標下的時間（100.5 分）縮放後還在同一個位置
    expect((100.5 - a) / (b - a)).toBeCloseTo(100.5 / 392, 5)
    expect(b - a).toBeCloseTo(392 * Math.exp(-1), 3)
    expect(w.find('button').text()).toBe('重設縮放')
    const list = lastEvent<StateSummary[]>(w, 'summary-change')
    expect(list[0].covered).toBeCloseTo((b - a) * MIN, -2)
  })

  it('沒按 Ctrl 不縮放；全覽時往外縮或左右滑都交還給頁面', async () => {
    const w = await mountChart()
    expect(wheel(w, { ...point(100, 0), deltaY: -100 }).defaultPrevented).toBe(false)
    expect(wheel(w, { ...point(100, 0), deltaY: 100, ctrlKey: true }).defaultPrevented).toBe(false)
    expect(wheel(w, { ...point(100, 0), deltaX: 100 }).defaultPrevented).toBe(false)
    // 不在繪圖區
    expect(wheel(w, { clientX: 20, clientY: 48, deltaY: -100, ctrlKey: true }).defaultPrevented).toBe(false)
    expect(w.emitted('zoom-change')).toBeUndefined()
  })

  it('wheelZoomModifier="none" 直接滾就縮放；alt 要按 Alt；enableZoom=false 不縮放', async () => {
    const w = await mountChart({ wheelZoomModifier: 'none' })
    expect(wheel(w, { ...point(100, 0), deltaY: -100, deltaMode: 1 }).defaultPrevented).toBe(true)
    await w.setProps({ wheelZoomModifier: 'alt' })
    expect(wheel(w, { ...point(100, 0), deltaY: -1, deltaMode: 2 }).defaultPrevented).toBe(false)
    expect(wheel(w, { ...point(100, 0), deltaY: -1, deltaMode: 2, altKey: true }).defaultPrevented).toBe(true)
    await w.setProps({ enableZoom: false })
    expect(wheel(w, { ...point(100, 0), deltaY: -100, altKey: true }).defaultPrevented).toBe(false)
  })

  it('縮放後左右滑（或 Shift + 滾輪）平移，不超出資料範圍；放大不超過 minVisibleSpan', async () => {
    const w = await mountChart({ minVisibleSpan: 30 * MIN })
    wheel(w, { ...point(196, 0), deltaY: -5000, ctrlKey: true })
    const [a0, b0] = domainOf(w)
    expect(b0 - a0).toBeCloseTo(30)
    // 往右滑半個繪圖區：範圍往後移半個寬度（15 分）
    wheel(w, { ...point(196, 0), deltaX: 196 })
    expect(domainOf(w)[0] - a0).toBeCloseTo(15)
    wheel(w, { ...point(196, 0), deltaY: 100000, shiftKey: true })
    const [a, b] = domainOf(w)
    expect(b).toBeCloseTo(392)
    expect(b - a).toBeCloseTo(30)
  })

  it('拖曳平移；拖完的那次 click 不算點擊段落', async () => {
    vi.useFakeTimers()
    const w = await mountChart()
    ;(w.vm as unknown as { zoomTo: (a: number, b: number) => void }).zoomTo(T0 + 100 * MIN, T0 + 200 * MIN)
    await nextTick()
    svg(w).element.dispatchEvent(new MouseEvent('mousedown', { ...point(100, 0), button: 0, bubbles: true, cancelable: true }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: point(100, 0).clientX + 1, clientY: 48 }))
    // 3px 以內不算拖曳
    expect(domainOf(w)).toEqual([100, 200])
    // 往左拖半個繪圖區 → 範圍往後移半個寬度（50 分）
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: point(100, 0).clientX - 196, clientY: 48 }))
    await nextTick()
    const [a, b] = domainOf(w)
    expect(a).toBeCloseTo(150)
    expect(b).toBeCloseTo(250)
    // 拖曳中不顯示提示
    await hoverAt(w, 10, 0)
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    window.dispatchEvent(new MouseEvent('mouseup'))
    await svg(w).trigger('click', point(10, 0))
    expect(w.emitted('segment-click')).toBeUndefined()
    vi.advanceTimersByTime(1)
    await svg(w).trigger('click', point(10, 0))
    expect(w.emitted('segment-click')).toHaveLength(1)
  })

  it('全覽、右鍵或不在繪圖區時不開始拖曳', async () => {
    const w = await mountChart()
    svg(w).element.dispatchEvent(new MouseEvent('mousedown', { ...point(100, 0), button: 0, bubbles: true }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, clientY: 48 }))
    expect(w.emitted('zoom-change')).toBeUndefined()
  })

  it('重設縮放按鈕回到全覽；zoomTo 不合法的範圍不做事；縮到全覽等於重設', async () => {
    const w = await mountChart()
    const vm = w.vm as unknown as { zoomTo: (a: unknown, b: unknown) => void; resetZoom: () => void }
    vm.zoomTo('x', T0)
    expect(w.emitted('zoom-change')).toBeUndefined()
    vm.zoomTo(T0 + 10 * MIN, T0 + 20 * MIN)
    await nextTick()
    await w.find('button').trigger('click')
    expect(w.emitted('zoom-reset')).toHaveLength(1)
    expect(w.find('button').exists()).toBe(false)
    vm.zoomTo(T0 - 100 * MIN, T0 + 1000 * MIN)
    expect(w.emitted('zoom-change')).toHaveLength(1)
    // 已經是全覽：重設不重送
    vm.resetZoom()
    expect(w.emitted('zoom-reset')).toHaveLength(1)
  })

  it('鍵盤選到畫面外的段落時，把畫面移過去', async () => {
    const w = await mountChart()
    ;(w.vm as unknown as { zoomTo: (a: number, b: number) => void }).zoomTo(T0, T0 + 50 * MIN)
    await nextTick()
    await svg(w).trigger('keydown', { key: 'End' })
    // 最後一段 150～392 分：畫面以它的中間（271）為中心，保持 50 分的寬度
    const [a, b] = domainOf(w)
    expect(a).toBeCloseTo(246)
    expect(b).toBeCloseTo(296)
  })

  it('資料範圍變小時，超出的縮放範圍拉回來', async () => {
    const w = await mountChart()
    ;(w.vm as unknown as { zoomTo: (a: number, b: number) => void }).zoomTo(T0 + 300 * MIN, T0 + 380 * MIN)
    await nextTick()
    await w.setProps({ timeDomain: [T0, T0 + 200 * MIN] })
    await nextTick()
    const [a, b] = domainOf(w)
    expect(b).toBeCloseTo(200)
    expect(b - a).toBeCloseTo(80)
  })
})

describe('StateTimeline：其他', () => {
  it('父層用行內陣列傳 timeDomain、rows，並在 summary-change 裡改自己的狀態：不會一直重繪', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const received = ref(0)
    const Parent = defineComponent({
      setup: () => () =>
        h('div', [
          h(StateTimeline, {
            data: DATA,
            width: 600,
            // 每次渲染都是新陣列
            timeDomain: [T0, T0 + 392 * MIN],
            rows: ['M1', 'M2'],
            onSummaryChange: () => {
              received.value++
            },
          }),
          h('span', received.value),
        ]),
    })
    const w = mount(Parent, { attachTo: document.body })
    await nextTick()
    await nextTick()
    expect(received.value).toBe(1)
    expect(warn.mock.calls.flat().join(' ')).not.toContain('Maximum recursive updates')
    w.unmount()
    warn.mockRestore()
  })

  it('沒有指定 now 時每分鐘更新現在的時間；卸載時清掉計時器', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0 + 10 * MIN)
    const w = await mountChart({ timeDomain: null, showNow: true })
    const before = w.findAll('.stl-run').length
    vi.setSystemTime(T0 + 500 * MIN)
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(w.findAll('.stl-run').length).toBeGreaterThanOrEqual(before)
    w.unmount()
    wrapper = null
    expect(vi.getTimerCount()).toBe(0)
  })

  it('掛載完成送出 chart-ready', async () => {
    const w = await mountChart()
    expect(w.emitted('chart-ready')?.[0][0]).toEqual({ width: 600, height: 34 + 2 * 28 + 0 })
  })
})
