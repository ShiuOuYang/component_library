import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import GanttChart from '@/components/library/charts/GanttChart.vue'
import type { GanttTaskEvent, GanttTooltip } from '@/components/library'

/**
 * 圖表 1000 寬、margin 0、列名欄 200 → 時間繪圖區 800px。
 * timeDomain 是 10/1～10/11（本地時間）共 10 天 → 一天 80px；10/6 在 x = 400。
 * jsdom 沒有排版：捲軸寬度量到 0，d3.pointer 退回 clientX − 0。
 */
const DAY_PX = 80
const local = (m: number, d: number, h = 0) => new Date(2026, m - 1, d, h)
const xAt = (date: Date) => ((date.getTime() - local(10, 1).getTime()) / 86_400_000) * DAY_PX

const TASKS = [
  { id: 'a', row: 'M1', name: 'A', start: local(10, 2), end: local(10, 4), status: 'done', progress: 100 },
  { id: 'b', row: 'M1', name: 'B', start: local(10, 5), end: local(10, 8), status: 'running', progress: 40 },
  { id: 'c', row: 'M2', name: 'C', start: '2026-10-03', end: '2026-10-03', status: 'planned' },
  { id: 'm', row: 'M2', name: '驗收', start: local(10, 9) },
  { id: 'x', row: 'M3', name: 'X', start: local(10, 1, 12), end: local(10, 2), status: 'mystery' },
]

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function mountGantt(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  wrapper = mount(GanttChart, {
    props: {
      data: TASKS,
      width: 1000,
      height: 400,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      labelWidth: 200,
      timeDomain: [local(10, 1), local(10, 11)],
      today: local(10, 6),
      ...props,
    },
    slots,
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

const taskEl = (w: VueWrapper, key: string) => w.find(`.gantt-task[data-key="${key}"]`)
const num = (el: { attributes: (n: string) => string | undefined }, name: string) => Number(el.attributes(name))
const rowLabels = (w: VueWrapper) => w.findAll('.gantt-row-label').map((r) => r.text())
const legendButtons = (w: VueWrapper) => w.findAll('button[aria-pressed]')

describe('GanttChart：版面', () => {
  it('列照資料出現的順序；任務畫在對應的列與時間', async () => {
    const w = await mountGantt()
    expect(rowLabels(w)).toEqual(['M1', 'M2', 'M3'])
    const bar = taskEl(w, 'b').find('rect.gantt-bar')
    expect(num(bar, 'x')).toBeCloseTo(xAt(local(10, 5)))
    expect(num(bar, 'width')).toBeCloseTo(3 * DAY_PX)
    // 第 1 列（索引 0）：(36 − 22) / 2 = 7
    expect(num(bar, 'y')).toBe(7)
    expect(num(taskEl(w, 'c').find('rect.gantt-bar'), 'y')).toBe(36 + 7)
  })

  it('rows 指定順序與文字；清單外的列接在後面', async () => {
    const w = await mountGantt({ rows: [{ value: 'M3', label: '三號機' }, 'M1'] })
    expect(rowLabels(w)).toEqual(['三號機', 'M1', 'M2'])
  })

  it('結束時間只寫日期：算到那一天結束；inclusiveEndDate=false 時是當天 00:00（寬度 0 → 最小 2px）', async () => {
    const w = await mountGantt()
    expect(num(taskEl(w, 'c').find('rect.gantt-bar'), 'width')).toBeCloseTo(DAY_PX)
    await w.setProps({ inclusiveEndDate: false })
    expect(num(taskEl(w, 'c').find('rect.gantt-bar'), 'width')).toBe(2)
  })

  it('沒有結束時間 → 里程碑（菱形）', async () => {
    const w = await mountGantt()
    const m = taskEl(w, 'm')
    expect(m.find('rect.gantt-bar').exists()).toBe(false)
    expect(m.find('path.gantt-milestone').attributes('d')).toContain(`M${xAt(local(10, 9))},`)
  })

  it('autoHeight：高度依列數撐開', async () => {
    const w = await mountGantt({ autoHeight: true })
    expect((w.find('.gantt-body').element as HTMLElement).style.height).toBe(`${3 * 36}px`)
    expect((w.element as HTMLElement).style.height).toBe('auto')
  })

  it('沒有任務：顯示提示，不會出錯', async () => {
    const w = await mountGantt({ data: [], emptyText: '尚未排程' })
    expect(w.text()).toContain('尚未排程')
    expect(w.findAll('.gantt-task')).toHaveLength(0)
  })

  it('開始時間不合法的任務不畫，開發模式警告', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const w = await mountGantt({ data: [...TASKS, { id: 'bad', row: 'M1', start: 'not a date' }] })
    expect(taskEl(w, 'bad').exists()).toBe(false)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('1 筆任務'))
  })

  it('aria-label 摘要列數與任務數', async () => {
    const w = await mountGantt({ title: '排程' })
    expect(w.find('svg.gantt-plot').attributes('aria-label')).toBe('排程：3 列、5 筆任務')
  })
})

describe('GanttChart：時間軸與今天', () => {
  it('兩層時間軸：上層是月，下層是日', async () => {
    const w = await mountGantt()
    const upper = w.findAll('.gantt-upper-label').map((t) => t.text())
    expect(upper).toEqual(['2026 年 10 月'])
    const lower = w.findAll('.gantt-lower-label').map((t) => t.text())
    expect(lower).toContain('5')
  })

  it('timeFormat 自訂下層刻度', async () => {
    const w = await mountGantt({ timeFormat: (d: Date) => `D${d.getDate()}` })
    expect(w.findAll('.gantt-lower-label').map((t) => t.text())).toContain('D5')
  })

  it('今天線畫在對應位置；超出範圍或 showToday=false 時不畫', async () => {
    const w = await mountGantt()
    expect(num(w.find('line.gantt-today'), 'x1')).toBeCloseTo(400)
    expect(w.find('.gantt-today-marker').text()).toBe('今天')
    await w.setProps({ today: '2026-12-01' })
    expect(w.find('line.gantt-today').exists()).toBe(false)
    await w.setProps({ today: local(10, 6), showToday: false })
    expect(w.find('line.gantt-today').exists()).toBe(false)
  })

  it('沒給 today 時用現在時間，每分鐘更新', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(local(10, 6))
    const w = await mountGantt({ today: null })
    expect(num(w.find('line.gantt-today'), 'x1')).toBeCloseTo(400)
    vi.setSystemTime(local(10, 7))
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(num(w.find('line.gantt-today'), 'x1')).toBeCloseTo(480, 0)
  })

  it('沒給 timeDomain：依任務範圍', async () => {
    const w = await mountGantt({ timeDomain: null, domainPadding: 0 })
    // 最早 10/1 12:00，最晚 10/9（里程碑）
    expect(num(taskEl(w, 'x').find('rect.gantt-bar'), 'x')).toBeCloseTo(0)
    const m = taskEl(w, 'm').find('path.gantt-milestone').attributes('d')!
    expect(m.startsWith('M800,')).toBe(true)
  })
})

describe('GanttChart：狀態與圖例', () => {
  it('依狀態著色；不在清單裡的狀態用 otherColor，圖例多一個「其他」', async () => {
    const w = await mountGantt({ showCounts: true })
    expect((taskEl(w, 'b').find('rect.gantt-bar').element as SVGElement).style.fill).toBe('rgb(37, 99, 235)')
    expect((taskEl(w, 'x').find('rect.gantt-bar').element as SVGElement).style.fill).toBe('rgb(107, 114, 128)')
    expect(legendButtons(w).map((b) => b.text())).toEqual(['計畫 (1)', '進行中 (1)', '完成 (1)', '延遲 (0)', '其他 (2)'])
  })

  it('點圖例隱藏該狀態的任務（列仍保留），並送出事件', async () => {
    const w = await mountGantt()
    await legendButtons(w)[1].trigger('click')
    expect(taskEl(w, 'b').exists()).toBe(false)
    expect(rowLabels(w)).toEqual(['M1', 'M2', 'M3'])
    expect(w.emitted('legend-toggle')).toEqual([[{ status: 'running', hidden: true }]])
    expect(w.emitted('update:hiddenStatuses')).toEqual([[['running']]])
    await legendButtons(w)[1].trigger('click')
    expect(taskEl(w, 'b').exists()).toBe(true)
  })

  it('hiddenStatuses 受控', async () => {
    const w = await mountGantt({ hiddenStatuses: ['done'] })
    expect(taskEl(w, 'a').exists()).toBe(false)
    await w.setProps({ hiddenStatuses: [] })
    expect(taskEl(w, 'a').exists()).toBe(true)
  })

  it('showLegend=false 不顯示圖例', async () => {
    const w = await mountGantt({ showLegend: false })
    expect(legendButtons(w)).toHaveLength(0)
  })
})

describe('GanttChart：長條文字與進度', () => {
  const label = (w: VueWrapper, key: string) => taskEl(w, key).find('text.gantt-bar-label')

  it('放得下就放在長條裡（白字）', async () => {
    const w = await mountGantt()
    const t = label(w, 'b')
    expect(num(t, 'x')).toBeCloseTo(xAt(local(10, 5)) + 6)
    expect((t.element as SVGElement).style.fill).toBe('rgb(255, 255, 255)')
  })

  it('放不下時放右邊；右邊會壓到同一列的下一個任務時不顯示', async () => {
    const data = [
      { id: 'p', row: 'R', name: '很長很長的工單名稱', start: local(10, 2), end: local(10, 2, 6) },
      { id: 'q', row: 'R', name: '很長很長的工單名稱', start: local(10, 2, 8), end: local(10, 2, 12) },
    ]
    const w = await mountGantt({ data })
    expect(label(w, 'p').exists()).toBe(false)
    const q = label(w, 'q')
    expect(num(q, 'x')).toBeCloseTo(xAt(local(10, 2, 12)) + 6)
  })

  it('showBarLabels=false 不顯示文字', async () => {
    const w = await mountGantt({ showBarLabels: false })
    expect(w.findAll('text.gantt-bar-label')).toHaveLength(0)
  })

  it('進度只在 0% 與 100% 之間畫；showProgress=false 不畫', async () => {
    const w = await mountGantt()
    expect(num(taskEl(w, 'b').find('rect.gantt-progress'), 'width')).toBeCloseTo((3 * DAY_PX - 6) * 0.4)
    expect(taskEl(w, 'a').find('rect.gantt-progress').exists()).toBe(false)
    await w.setProps({ showProgress: false })
    expect(w.findAll('rect.gantt-progress')).toHaveLength(0)
  })

  it('淺色長條配深色字', async () => {
    const w = await mountGantt({ statuses: [{ value: 'running', color: '#fde68a' }] })
    expect((label(w, 'b').element as SVGElement).style.fill).toBe('rgb(17, 24, 39)')
  })
})

describe('GanttChart：互動', () => {
  it('滑過任務：送出 task-hover 與 tooltip-show，顯示起訖、工期、進度；離開時隱藏', async () => {
    const w = await mountGantt()
    await taskEl(w, 'b').trigger('mouseenter', { clientX: 300, clientY: 20 })
    const hover = w.emitted('task-hover')![0][0] as GanttTaskEvent
    expect(hover).toMatchObject({ key: 'b', row: 'M1', status: 'running', progress: 0.4, milestone: false })
    expect(hover.start).toEqual(local(10, 5))
    const tip = w.find('[role="tooltip"]')
    expect(tip.text()).toContain('B')
    expect(tip.text()).toContain('列：M1')
    expect(tip.text()).toContain('開始：2026/10/05')
    expect(tip.text()).toContain('結束：2026/10/08')
    expect(tip.text()).toContain('工期：3 天')
    expect(tip.text()).toContain('進度：40%')
    expect((w.emitted('tooltip-show')![0][0] as GanttTooltip).position.containerX).toBe(300)

    await taskEl(w, 'b').trigger('mouseleave')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('tooltip-hide')).toHaveLength(1)
  })

  it('只寫日期的任務：提示框顯示原本的結束日，不是隔天', async () => {
    const w = await mountGantt()
    await taskEl(w, 'c').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('結束：2026/10/03')
    expect(w.find('[role="tooltip"]').text()).toContain('工期：1 天')
  })

  it('里程碑的提示框只有一個時間；有時分的時間顯示到分', async () => {
    const w = await mountGantt()
    await taskEl(w, 'm').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('時間：2026/10/09')
    await taskEl(w, 'x').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('開始：2026/10/01 12:00')
    expect(w.find('[role="tooltip"]').text()).toContain('狀態：mystery')
  })

  it('滑鼠移到另一個任務時接著顯示', async () => {
    const w = await mountGantt()
    await taskEl(w, 'a').trigger('mousemove')
    expect(w.find('[role="tooltip"]').text()).toContain('A')
    await taskEl(w, 'a').trigger('mousemove', { clientX: 50 })
    expect(w.emitted('task-hover')).toHaveLength(1)
  })

  it('enableTooltip=false 不顯示預設提示框（事件照送）', async () => {
    const w = await mountGantt({ enableTooltip: false })
    await taskEl(w, 'b').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('task-hover')).toHaveLength(1)
  })

  it('點任務送出 task-click（含原始資料）', async () => {
    const w = await mountGantt()
    await taskEl(w, 'a').trigger('click')
    const e = w.emitted('task-click')![0][0] as GanttTaskEvent
    expect(e.datum).toBe(TASKS[0])
    expect(e.end).toEqual(local(10, 4))
  })

  it('點列名送出 row-click（含這一列的任務）', async () => {
    const w = await mountGantt()
    await w.findAll('.gantt-row-label')[1].trigger('click')
    expect(w.emitted('row-click')).toEqual([[{ row: 'M2', label: 'M2', tasks: [TASKS[2], TASKS[3]] }]])
  })

  it('highlightKey 框出任務', async () => {
    const w = await mountGantt({ highlightKey: 'c' })
    expect(taskEl(w, 'c').classes()).toContain('is-highlighted')
    expect(taskEl(w, 'a').classes()).not.toContain('is-highlighted')
    await w.setProps({ highlightKey: '' })
    expect(w.findAll('.is-highlighted')).toHaveLength(0)
  })
})

describe('GanttChart：縮放與平移', () => {
  function wheel(w: VueWrapper, init: WheelEventInit) {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 400, clientY: 20, ...init })
    w.find('svg.gantt-plot').element.dispatchEvent(event)
    return event
  }
  const resetButton = (w: VueWrapper) => w.findAll('button').find((b) => b.text() === '重設縮放')

  it('一般滾輪不縮放（留給列的捲動）；Ctrl + 滾輪縮放時間軸', async () => {
    const w = await mountGantt()
    expect(wheel(w, { deltaY: -100 }).defaultPrevented).toBe(false)
    expect(w.emitted('zoom-change')).toBeUndefined()

    expect(wheel(w, { deltaY: -100, ctrlKey: true }).defaultPrevented).toBe(true)
    await nextTick()
    const zoom = w.emitted('zoom-change')!.at(-1)![0] as { timeDomain: [Date, Date]; scale: number }
    expect(zoom.scale).toBeGreaterThan(1)
    expect(zoom.timeDomain[1].getTime() - zoom.timeDomain[0].getTime()).toBeLessThan(10 * 86_400_000)
    expect(resetButton(w)).toBeDefined()
  })

  /** 回歸：d3 預設按 Ctrl 時滾輪量 ×10，一般滑鼠滾一格就放大 4 倍 */
  it('Ctrl + 滑鼠滾一格放大約 1.2 倍；觸控板捏合（小增量）照常', async () => {
    const w = await mountGantt()
    wheel(w, { deltaY: -100, ctrlKey: true })
    const scale = () => (w.emitted('zoom-change')!.at(-1)![0] as { scale: number }).scale
    expect(scale()).toBeCloseTo(2 ** 0.2, 5)
    wheel(w, { deltaY: -5, ctrlKey: true })
    expect(scale()).toBeCloseTo(2 ** 0.2 * 2 ** 0.1, 5)
  })

  it("wheelZoomModifier='none' 一般滾輪就縮放；'alt' 要按 Alt", async () => {
    const w = await mountGantt({ wheelZoomModifier: 'none' })
    expect(wheel(w, { deltaY: -100 }).defaultPrevented).toBe(true)
    await w.setProps({ wheelZoomModifier: 'alt' })
    expect(wheel(w, { deltaY: -100, ctrlKey: true }).defaultPrevented).toBe(false)
    expect(wheel(w, { deltaY: -100, altKey: true }).defaultPrevented).toBe(true)
  })

  it('雙擊與重設按鈕回到預設範圍', async () => {
    const w = await mountGantt()
    wheel(w, { deltaY: -100, ctrlKey: true })
    await nextTick()
    w.find('svg.gantt-plot').element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await nextTick()
    expect(w.emitted('zoom-reset')).toHaveLength(1)
    expect(resetButton(w)).toBeUndefined()

    wheel(w, { deltaY: -100, ctrlKey: true })
    await nextTick()
    await resetButton(w)!.trigger('click')
    expect(w.emitted('zoom-reset')).toHaveLength(2)
    expect(num(taskEl(w, 'b').find('rect.gantt-bar'), 'x')).toBeCloseTo(xAt(local(10, 5)))
  })

  it('左右滑動（或 Shift + 滾輪）平移；已經到底時不攔截', async () => {
    const w = await mountGantt()
    // 全覽時平移不動：交還給頁面
    expect(wheel(w, { deltaX: 50 }).defaultPrevented).toBe(false)
    wheel(w, { deltaY: -300, ctrlKey: true })
    await nextTick()
    const before = num(taskEl(w, 'b').find('rect.gantt-bar'), 'x')
    expect(wheel(w, { deltaX: 40 }).defaultPrevented).toBe(true)
    await nextTick()
    expect(num(taskEl(w, 'b').find('rect.gantt-bar'), 'x')).toBeCloseTo(before - 40)
    expect(wheel(w, { deltaY: -40, shiftKey: true }).defaultPrevented).toBe(true)
    await nextTick()
    expect(num(taskEl(w, 'b').find('rect.gantt-bar'), 'x')).toBeCloseTo(before)
  })

  it('任務超出 timeDomain 時可以往外縮看到', async () => {
    const data = [...TASKS, { id: 'late', row: 'M1', name: 'L', start: local(10, 20), end: local(10, 21) }]
    const w = await mountGantt({ data, wheelZoomModifier: 'none' })
    expect(taskEl(w, 'late').exists()).toBe(false)
    for (let i = 0; i < 10; i++) wheel(w, { deltaY: 300 })
    await nextTick()
    expect(taskEl(w, 'late').exists()).toBe(true)
  })

  it('enableZoom=false 完全不處理滾輪', async () => {
    const w = await mountGantt({ enableZoom: false })
    expect(wheel(w, { deltaY: -100, ctrlKey: true }).defaultPrevented).toBe(false)
    expect(wheel(w, { deltaX: 40 }).defaultPrevented).toBe(false)
    expect(w.emitted('zoom-change')).toBeUndefined()
  })

  it('拖曳平移時不顯示提示框；放開後滑過任務照常顯示', async () => {
    const w = await mountGantt()
    wheel(w, { deltaY: -300, ctrlKey: true })
    await nextTick()
    await taskEl(w, 'b').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').exists()).toBe(true)

    // d3.zoom 在 mousedown 後把 mousemove / mouseup 掛到 event.view 上；
    // vitest 的 window 過不了 jsdom 建構子的型別檢查，只能建好之後覆寫（同 EnterpriseHeatmap 的測試）
    const fire = (target: EventTarget, type: string, x: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 20, button: 0 })
      Object.defineProperty(event, 'view', { value: window })
      target.dispatchEvent(event)
    }
    fire(w.find('svg.gantt-plot').element, 'mousedown', 400)
    fire(window, 'mousemove', 360)
    await nextTick()
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
    expect(w.emitted('tooltip-hide')).toHaveLength(1)
    await taskEl(w, 'b').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').exists()).toBe(false)

    fire(window, 'mouseup', 360)
    await taskEl(w, 'b').trigger('mousemove')
    expect(w.find('[role="tooltip"]').exists()).toBe(true)
  })
})

describe('GanttChart：大量列', () => {
  const many = Array.from({ length: 1000 }, (_, i) => ({
    id: `t${i}`,
    row: `R${i}`,
    name: `T${i}`,
    start: local(10, 2),
    end: local(10, 3),
  }))

  it('只畫看得到的列；捲動後換成那一段', async () => {
    const w = await mountGantt({ data: many, height: 360 })
    const labels = rowLabels(w)
    expect(labels.length).toBeLessThan(30)
    expect(labels[0]).toBe('R0')
    // 內容高度仍是全部的列
    expect((w.find('.gantt-body > div').element as HTMLElement).style.height).toBe(`${1000 * 36}px`)

    const body = w.find('.gantt-body').element as HTMLElement
    body.scrollTop = 500 * 36
    await w.find('.gantt-body').trigger('scroll')
    expect(rowLabels(w)).toContain('R500')
    expect(rowLabels(w)).not.toContain('R0')
    expect(taskEl(w, 't500').exists()).toBe(true)
  })

  it('scrollToRow / scrollToTask：捲到該列；找不到回傳 false', async () => {
    const w = await mountGantt({ data: many, height: 360 })
    const api = w.vm as unknown as { scrollToRow: (r: string) => boolean; scrollToTask: (k: string) => boolean }
    const body = w.find('.gantt-body').element as HTMLElement
    expect(api.scrollToRow('R700')).toBe(true)
    expect(body.scrollTop).toBe(700 * 36)
    await nextTick()
    expect(rowLabels(w)).toContain('R700')
    expect(api.scrollToRow('nope')).toBe(false)

    expect(api.scrollToTask('t10')).toBe(true)
    expect(body.scrollTop).toBeLessThan(10 * 36)
    expect(api.scrollToTask('nope')).toBe(false)
  })

  it('scrollToTask：任務在目前的時間範圍外時移到中間', async () => {
    const w = await mountGantt()
    const api = w.vm as unknown as { scrollToTask: (k: string) => boolean }
    // 放大到 10/1 附近，10/9 的里程碑在畫面外
    const plot = w.find('svg.gantt-plot').element
    plot.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 0, clientY: 20, deltaY: -1000, ctrlKey: true }))
    await nextTick()
    expect(taskEl(w, 'm').exists()).toBe(false)
    expect(api.scrollToTask('m')).toBe(true)
    await nextTick()
    const d = taskEl(w, 'm').find('path.gantt-milestone').attributes('d')!
    expect(Number(d.slice(1, d.indexOf(',')))).toBeCloseTo(400, 0)
  })
})

describe('GanttChart：擴展點', () => {
  it('customRenderers：barColor、barLabel、tooltip', async () => {
    const w = await mountGantt({
      customRenderers: {
        barColor: (d: Record<string, unknown>) => (d.id === 'a' ? '#ff00ff' : null),
        barLabel: (d: Record<string, unknown>, t: GanttTaskEvent) => `${d.name}·${t.status}`,
        tooltip: (d: Record<string, unknown>) => [`自訂 ${d.id}`],
      },
    })
    expect((taskEl(w, 'a').find('rect.gantt-bar').element as SVGElement).style.fill).toBe('rgb(255, 0, 255)')
    expect((taskEl(w, 'b').find('rect.gantt-bar').element as SVGElement).style.fill).toBe('rgb(37, 99, 235)')
    expect(taskEl(w, 'b').find('text.gantt-bar-label').text()).toBe('B·running')
    await taskEl(w, 'a').trigger('mouseenter')
    const tip = w.find('[role="tooltip"]')
    expect(tip.text()).toContain('自訂 a')
    expect(tip.text()).not.toContain('開始')
    expect((tip.find('span').element as HTMLElement).style.background).toBe('rgb(255, 0, 255)')
  })

  it('CSS 變數的顏色也能選文字色', async () => {
    const w = await mountGantt({ statuses: [{ value: 'running', color: 'var(--bar-color)' }] })
    expect(taskEl(w, 'b').find('text.gantt-bar-label').exists()).toBe(true)
  })

  it('row-label 與 tooltip 插槽', async () => {
    const w = await mountGantt(
      {},
      {
        'row-label': '<template #row-label="{ row, tasks }"><b class="lbl">{{ row.value }}:{{ tasks.length }}</b></template>',
        tooltip: '<template #tooltip="{ tooltipData, tooltipVisible }"><i v-if="tooltipVisible" class="tip">{{ tooltipData.key }}</i></template>',
      }
    )
    expect(w.findAll('.lbl').map((b) => b.text())).toEqual(['M1:2', 'M2:2', 'M3:1'])
    await taskEl(w, 'c').trigger('mouseenter')
    expect(w.find('.tip').text()).toBe('c')
  })
})

describe('GanttChart：生命週期', () => {
  it('掛載時送出 chart-ready', async () => {
    const w = await mountGantt()
    expect(w.emitted('chart-ready')).toEqual([[{ width: 1000, height: 400 }]])
  })

  it('autoResize：依容器大小（加回 margin）重算，卸載時斷開', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const observe = vi.fn()
    const disconnect = vi.fn()
    let callback: ResizeObserverCallback = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn((cb: ResizeObserverCallback) => {
        callback = cb
        return { observe, disconnect }
      })
    )
    const w = await mountGantt({ autoResize: true, margin: { top: 0, right: 10, bottom: 0, left: 10 } })
    expect(observe).toHaveBeenCalled()
    callback([{ contentRect: { width: 780, height: 300 } } as ResizeObserverEntry], {} as ResizeObserver)
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(w.emitted('chart-resize')).toEqual([[{ width: 800, height: 300 }]])
    expect(Number(w.find('svg.gantt-plot').attributes('width'))).toBe(800 - 20 - 200)
    expect((w.element as HTMLElement).style.width).toBe('100%')

    wrapper!.unmount()
    wrapper = null
    expect(disconnect).toHaveBeenCalled()
  })
})
