import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import GanttChart from '@/components/library/charts/GanttChart.vue'
import type { GanttTaskChange } from '@/components/library'

/**
 * 第二版：拖曳編輯、鍵盤微調、相依箭頭、非工作時段。
 * 版面同 GanttChart.spec.ts：繪圖區 800px、10/1～10/11 → 一天 80px，auto 吸附以天為單位。
 * jsdom 沒有排版：clientX 就是繪圖區座標。
 */
const DAY_PX = 80
const local = (m: number, d: number, h = 0) => new Date(2026, m - 1, d, h)
const xAt = (date: Date) => ((date.getTime() - local(10, 1).getTime()) / 86_400_000) * DAY_PX

const TASKS = [
  { id: 'a', row: 'M1', name: 'A', start: local(10, 2), end: local(10, 4), status: 'done' },
  { id: 'b', row: 'M1', name: 'B', start: local(10, 5), end: local(10, 8), status: 'running', dependsOn: 'a' },
  { id: 'c', row: 'M2', name: 'C', start: '2026-10-03', end: '2026-10-03', status: 'planned' },
  { id: 'm', row: 'M2', name: '驗收', start: local(10, 9), dependsOn: ['b', 'c'] },
]

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

async function mountGantt(props: Record<string, unknown> = {}) {
  wrapper = mount(GanttChart, {
    props: {
      data: TASKS,
      width: 1000,
      height: 400,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      labelWidth: 200,
      timeDomain: [local(10, 1), local(10, 11)],
      today: local(10, 6),
      editable: true,
      ...props,
    },
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

const taskEl = (w: VueWrapper, key: string) => w.find(`.gantt-task[data-key="${key}"]`)
const barX = (w: VueWrapper, key: string) => Number(taskEl(w, key).find('rect.gantt-bar').attributes('x'))
const barW = (w: VueWrapper, key: string) => Number(taskEl(w, key).find('rect.gantt-bar').attributes('width'))
const changes = (w: VueWrapper) => (w.emitted('task-change') ?? []).map((e) => e[0] as GanttTaskChange)

function pointer(target: EventTarget, type: string, x: number, y = 20, init: PointerEventInit = {}) {
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, ...init })
  target.dispatchEvent(event)
  return event
}

/** 從 (x, y) 按下、拖到 (x + dx, y + dy)；release=false 時停在拖曳中 */
async function dragFrom(target: Element, x: number, dx: number, { dy = 0, y = 20, release = true } = {}) {
  pointer(target, 'pointerdown', x, y)
  pointer(window, 'pointermove', x + dx / 2, y + dy / 2)
  pointer(window, 'pointermove', x + dx, y + dy)
  await nextTick()
  if (release) {
    pointer(window, 'pointerup', x + dx, y + dy)
    await nextTick()
  }
}

describe('GanttChart 編輯：拖曳移動', () => {
  it('拖曳中預覽新位置；放開送出 task-change（資料沒更新時彈回原位）', async () => {
    const w = await mountGantt()
    await dragFrom(taskEl(w, 'b').element, 500, 2 * DAY_PX, { release: false })
    expect(barX(w, 'b')).toBeCloseTo(xAt(local(10, 7)))
    expect(taskEl(w, 'b').classes()).toContain('is-dragging')
    expect(w.emitted('task-change')).toBeUndefined()

    pointer(window, 'pointerup', 660, 20)
    await nextTick()
    expect(changes(w)).toHaveLength(1)
    expect(changes(w)[0]).toMatchObject({ key: 'b', type: 'move', row: 'M1', start: local(10, 7), end: local(10, 10) })
    expect(changes(w)[0].previous).toEqual({ start: local(10, 5), end: local(10, 8), displayEnd: local(10, 8), row: 'M1' })
    expect(changes(w)[0].datum).toBe(TASKS[1])
    expect(barX(w, 'b')).toBeCloseTo(xAt(local(10, 5)))
  })

  it('父層更新資料後畫在新位置', async () => {
    const w = await mountGantt()
    await dragFrom(taskEl(w, 'b').element, 500, DAY_PX)
    const c = changes(w)[0]
    await w.setProps({ data: TASKS.map((t) => (t.id === c.key ? { ...t, start: c.start, end: c.end } : t)) })
    expect(barX(w, 'b')).toBeCloseTo(xAt(local(10, 6)))
  })

  it('auto 吸附：看日時以天為單位（拖 1.4 天 → 1 天）；snap=null 不吸附', async () => {
    const w = await mountGantt()
    await dragFrom(taskEl(w, 'b').element, 500, 1.4 * DAY_PX)
    expect(changes(w)[0].start).toEqual(local(10, 6))
    await w.setProps({ snap: null })
    await dragFrom(taskEl(w, 'b').element, 500, 1.5 * DAY_PX)
    expect(changes(w)[1].start).toEqual(local(10, 6, 12))
    await w.setProps({ snap: 'hour' })
    await dragFrom(taskEl(w, 'b').element, 500, DAY_PX / 3)
    expect(changes(w)[2].start).toEqual(local(10, 5, 8))
  })

  it('移動不到門檻是點擊：照常送 task-click、不送 task-change', async () => {
    const w = await mountGantt()
    await dragFrom(taskEl(w, 'b').element, 500, 2)
    await taskEl(w, 'b').trigger('click')
    expect(w.emitted('task-change')).toBeUndefined()
    expect(w.emitted('task-click')).toHaveLength(1)
  })

  it('拖曳放開後的 click 不算點擊；拖回原位不送 task-change', async () => {
    const w = await mountGantt()
    await dragFrom(taskEl(w, 'b').element, 500, 20)
    await taskEl(w, 'b').trigger('click')
    expect(w.emitted('task-click')).toBeUndefined()
    expect(w.emitted('task-change')).toBeUndefined()
    // 下一次點擊恢復正常
    await taskEl(w, 'b').trigger('click')
    expect(w.emitted('task-click')).toHaveLength(1)
  })

  it('Esc 或 pointercancel 取消：回到原位，不送事件', async () => {
    const w = await mountGantt()
    await dragFrom(taskEl(w, 'b').element, 500, 2 * DAY_PX, { release: false })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(taskEl(w, 'b').classes()).toContain('is-dragging')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(barX(w, 'b')).toBeCloseTo(xAt(local(10, 5)))
    pointer(window, 'pointerup', 660)
    expect(w.emitted('task-change')).toBeUndefined()

    await dragFrom(taskEl(w, 'b').element, 500, 2 * DAY_PX, { release: false })
    pointer(window, 'pointercancel', 660)
    await nextTick()
    pointer(window, 'pointerup', 660)
    expect(w.emitted('task-change')).toBeUndefined()
  })

  it('拖曳中的提示框顯示預覽時間；放開後收起', async () => {
    const w = await mountGantt()
    await dragFrom(taskEl(w, 'b').element, 500, 2 * DAY_PX, { release: false })
    const tip = w.find('[role="tooltip"]')
    expect(tip.text()).toContain('開始：2026/10/07')
    expect(tip.text()).toContain('結束：2026/10/10')
    // 拖過別的任務不會切換提示
    await taskEl(w, 'a').trigger('mouseenter')
    expect(w.find('[role="tooltip"]').text()).toContain('B')
    pointer(window, 'pointerup', 660)
    await nextTick()
    expect(w.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('只寫日期的任務：displayEnd 是那一天（可直接存回日期字串）', async () => {
    const w = await mountGantt()
    await dragFrom(taskEl(w, 'c').element, 200, DAY_PX, { y: 56 })
    expect(changes(w)[0]).toMatchObject({ start: local(10, 4), end: local(10, 5), displayEnd: local(10, 4) })
    expect(changes(w)[0].previous.displayEnd).toEqual(local(10, 3))
  })

  it('allowRowChange：往下拖一列換到 M2；沒開時列不變', async () => {
    const w = await mountGantt({ allowRowChange: true })
    await dragFrom(taskEl(w, 'b').element, 500, 0, { dy: 40 })
    expect(changes(w)[0]).toMatchObject({ row: 'M2', start: local(10, 5) })
    // 拖到最上面之外：停在第一列 → 沒有改變，不送事件
    await dragFrom(taskEl(w, 'b').element, 500, 0, { dy: -200 })
    expect(changes(w)).toHaveLength(1)

    await w.setProps({ allowRowChange: false })
    await dragFrom(taskEl(w, 'b').element, 500, DAY_PX, { dy: 40 })
    expect(changes(w)[1].row).toBe('M1')
  })

  it('拖曳中換列：預覽畫在新的列', async () => {
    const w = await mountGantt({ allowRowChange: true })
    await dragFrom(taskEl(w, 'b').element, 500, 0, { dy: 40, release: false })
    expect(Number(taskEl(w, 'b').find('rect.gantt-bar').attributes('y'))).toBe(36 + 7)
    pointer(window, 'pointerup', 500, 60)
  })

  it('里程碑只能移動', async () => {
    const w = await mountGantt()
    await dragFrom(taskEl(w, 'm').element, xAt(local(10, 9)), -DAY_PX, { y: 56 })
    expect(changes(w)[0]).toMatchObject({ type: 'move', start: local(10, 8), end: local(10, 8) })
  })

  it('沒開 editable：不能拖曳、沒有把手、不能聚焦', async () => {
    const w = await mountGantt({ editable: false })
    await dragFrom(taskEl(w, 'b').element, 500, 2 * DAY_PX)
    expect(w.emitted('task-change')).toBeUndefined()
    expect(w.findAll('.gantt-handle')).toHaveLength(0)
    expect(taskEl(w, 'b').attributes('tabindex')).toBeUndefined()
    expect(w.find('svg.gantt-plot').attributes('role')).toBe('img')
  })

  it('只接受滑鼠左鍵', async () => {
    const w = await mountGantt()
    pointer(taskEl(w, 'b').element, 'pointerdown', 500, 20, { button: 2 })
    pointer(window, 'pointermove', 660)
    pointer(window, 'pointerup', 660)
    expect(w.emitted('task-change')).toBeUndefined()
  })

  it('在任務上按下不會平移時間軸', async () => {
    const w = await mountGantt()
    w.find('svg.gantt-plot').element.dispatchEvent(
      new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 400, clientY: 20, deltaY: -300, ctrlKey: true })
    )
    await nextTick()
    const zooms = w.emitted('zoom-change')!.length
    // d3.zoom 在 mousedown 後把 mousemove 掛到 event.view 上（同 GanttChart.spec 的寫法）
    const fire = (target: EventTarget, type: string, x: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 20, button: 0 })
      Object.defineProperty(event, 'view', { value: window })
      target.dispatchEvent(event)
    }
    fire(taskEl(w, 'b').find('rect.gantt-bar').element, 'mousedown', 400)
    fire(window, 'mousemove', 300)
    fire(window, 'mouseup', 300)
    expect(w.emitted('zoom-change')!.length).toBe(zooms)
  })

  it('拖曳中卸載：移除掛在 window 上的監聽', async () => {
    const w = await mountGantt()
    const remove = vi.spyOn(window, 'removeEventListener')
    await dragFrom(taskEl(w, 'b').element, 500, DAY_PX, { release: false })
    w.unmount()
    wrapper = null
    const removed = remove.mock.calls.map((c) => c[0])
    expect(removed).toEqual(expect.arrayContaining(['pointermove', 'pointerup', 'pointercancel', 'keydown']))
  })
})

describe('GanttChart 編輯：拉長縮短', () => {
  const handles = (w: VueWrapper, key: string) => taskEl(w, key).findAll('rect.gantt-handle')

  it('拖右端調整結束；拖左端調整開始', async () => {
    const w = await mountGantt()
    await dragFrom(handles(w, 'b')[1].element, 720, DAY_PX)
    expect(changes(w)[0]).toMatchObject({ type: 'resize-end', start: local(10, 5), end: local(10, 9) })
    await dragFrom(handles(w, 'b')[0].element, 400, -DAY_PX)
    expect(changes(w)[1]).toMatchObject({ type: 'resize-start', start: local(10, 4), end: local(10, 8) })
  })

  it('至少保留一個吸附單位，不會縮成負的', async () => {
    const w = await mountGantt()
    await dragFrom(handles(w, 'b')[1].element, 720, -10 * DAY_PX)
    expect(changes(w)[0].end).toEqual(local(10, 6))
    await dragFrom(handles(w, 'b')[0].element, 400, 10 * DAY_PX)
    expect(changes(w)[1].start).toEqual(local(10, 7))
  })

  it('預覽時長條寬度跟著變', async () => {
    const w = await mountGantt()
    await dragFrom(handles(w, 'b')[1].element, 720, 2 * DAY_PX, { release: false })
    expect(barW(w, 'b')).toBeCloseTo(5 * DAY_PX)
    pointer(window, 'pointerup', 880)
  })

  it('拉不到半個單位：維持原值', async () => {
    const w = await mountGantt()
    await dragFrom(handles(w, 'b')[1].element, 720, 0.3 * DAY_PX)
    expect(w.emitted('task-change')).toBeUndefined()
  })

  it('太窄的長條沒有把手', async () => {
    const w = await mountGantt({ data: [{ id: 'n', row: 'R', start: local(10, 2), end: local(10, 2, 3) }] })
    expect(handles(w, 'n')).toHaveLength(0)
  })
})

describe('GanttChart 編輯：鍵盤', () => {
  const key = async (w: VueWrapper, k: string, init: KeyboardEventInit = {}) => {
    await taskEl(w, 'b').trigger('keydown', { key: k, ...init })
  }

  it('任務可以 Tab 到，有說明', async () => {
    const w = await mountGantt()
    const b = taskEl(w, 'b')
    expect(b.attributes('tabindex')).toBe('0')
    expect(b.attributes('role')).toBe('button')
    expect(b.attributes('aria-label')).toBe('B：2026/10/05 至 2026/10/08')
    expect(taskEl(w, 'm').attributes('aria-label')).toBe('驗收：2026/10/09')
    expect(document.getElementById(b.attributes('aria-describedby')!)!.textContent).toContain('方向鍵')
  })

  it('←→ 移動、Shift 調整結束、Alt 調整開始（一步一個吸附單位）', async () => {
    const w = await mountGantt()
    await key(w, 'ArrowRight')
    await key(w, 'ArrowLeft', { shiftKey: true })
    await key(w, 'ArrowLeft', { altKey: true })
    expect(changes(w).map((c) => [c.type, c.start, c.end])).toEqual([
      ['move', local(10, 6), local(10, 9)],
      ['resize-end', local(10, 5), local(10, 7)],
      ['resize-start', local(10, 4), local(10, 8)],
    ])
  })

  it('縮到只剩一步時不再縮；其他按鍵不處理', async () => {
    const w = await mountGantt({ data: [{ id: 'b', row: 'M1', name: 'B', start: local(10, 5), end: local(10, 6) }] })
    await key(w, 'ArrowLeft', { shiftKey: true })
    await key(w, 'Enter')
    await key(w, 'ArrowDown')
    expect(w.emitted('task-change')).toBeUndefined()
  })

  it('allowRowChange：↑↓ 換列，焦點留在任務上', async () => {
    const w = await mountGantt({ allowRowChange: true })
    ;(taskEl(w, 'b').element as SVGGElement).focus()
    await key(w, 'ArrowDown')
    const c = changes(w)[0]
    expect(c).toMatchObject({ type: 'move', row: 'M2', start: local(10, 5) })
    await w.setProps({ data: TASKS.map((t) => (t.id === 'b' ? { ...t, row: c.row } : t)) })
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.key).toBe('b')
  })

  it('沒開 editable 時按鍵不處理', async () => {
    const w = await mountGantt({ editable: false })
    await key(w, 'ArrowRight')
    expect(w.emitted('task-change')).toBeUndefined()
  })
})

describe('GanttChart：相依箭頭', () => {
  const links = (w: VueWrapper) => w.findAll('path.gantt-link')

  it('依 dependsOn 畫出箭頭：前置任務右端 → 後續任務左端', async () => {
    const w = await mountGantt()
    expect(links(w)).toHaveLength(3)
    // a（10/4 結束、第 1 列）→ b（10/5 開始、第 1 列）
    expect(links(w)[0].attributes('d')).toBe(`M${xAt(local(10, 4))},18 H${xAt(local(10, 5)) - 8} V18 H${xAt(local(10, 5))}`)
    expect(links(w)[0].attributes('marker-end')).toMatch(/^url\(#gantt-arrow-/)
  })

  it('後續任務開始得比前置任務結束早：標紅', async () => {
    const w = await mountGantt({
      data: [TASKS[0], { ...TASKS[1], start: local(10, 3) }],
    })
    expect(links(w)[0].classes()).toContain('is-violated')
    expect(links(w)[0].attributes('marker-end')).toMatch(/^url\(#gantt-arrow-bad-/)
  })

  it('里程碑的箭頭停在菱形左尖端', async () => {
    const w = await mountGantt()
    // b → m：m 在 10/9，菱形半寬 11
    expect(links(w)[1].attributes('d')!.endsWith(`H${xAt(local(10, 9)) - 11}`)).toBe(true)
  })

  it('dependencies 另外給；showDependencies=false 不畫', async () => {
    const w = await mountGantt({ dependencyField: 'none', dependencies: [{ from: 'a', to: 'c' }] })
    expect(links(w)).toHaveLength(1)
    await w.setProps({ showDependencies: false })
    expect(links(w)).toHaveLength(0)
  })

  it('任何一端被圖例隱藏時不畫', async () => {
    const w = await mountGantt()
    await w.findAll('button[aria-pressed]')[2].trigger('click') // 完成（a）
    expect(links(w)).toHaveLength(2)
  })

  it('滑過任務時它的箭頭加深；拖曳時箭頭跟著預覽', async () => {
    const w = await mountGantt()
    await taskEl(w, 'a').trigger('mouseenter')
    expect(links(w)[0].classes()).toContain('is-active')
    expect(links(w)[1].classes()).not.toContain('is-active')
    await taskEl(w, 'a').trigger('mouseleave')

    await dragFrom(taskEl(w, 'b').element, 500, -2 * DAY_PX, { release: false })
    expect(links(w)[0].classes()).toContain('is-violated')
    expect(links(w)[0].classes()).toContain('is-active')
    pointer(window, 'pointerup', 340)
  })

  it('兩端都在畫面外同一側時不畫', async () => {
    const w = await mountGantt({ timeDomain: [local(10, 20), local(10, 30)] })
    expect(links(w)).toHaveLength(0)
  })
})

describe('GanttChart：非工作時段', () => {
  const rects = (w: VueWrapper) =>
    w.findAll('.gantt-nonworking rect').map((r) => [Number(r.attributes('x')), Number(r.attributes('width'))])

  it('週末與假日畫上底色（2026-10-03 是星期六）', async () => {
    const w = await mountGantt({ nonWorkingDays: [0, 6], holidays: ['2026-10-07', 'not a date'] })
    expect(rects(w)).toEqual([
      [2 * DAY_PX, 2 * DAY_PX],
      [6 * DAY_PX, DAY_PX],
      [9 * DAY_PX, DAY_PX],
    ])
  })

  it('沒有設定時不畫；縮到一天不到 2px 時不畫', async () => {
    const w = await mountGantt()
    expect(w.find('.gantt-nonworking').exists()).toBe(false)
    await w.setProps({ nonWorkingDays: [0, 6], timeDomain: [local(1, 1), new Date(2027, 11, 31)] })
    expect(w.find('.gantt-nonworking').exists()).toBe(false)
  })
})

describe('GanttChart：資料改變時保留縮放', () => {
  function zoomIn(w: VueWrapper) {
    w.find('svg.gantt-plot').element.dispatchEvent(
      new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 400, clientY: 20, deltaY: -500, ctrlKey: true })
    )
  }
  const visible = (w: VueWrapper) => {
    const z = w.emitted('zoom-change')!.at(-1)![0] as { timeDomain: [Date, Date] }
    return z.timeDomain.map((d) => d.getTime())
  }

  /** 回歸：拖曳改排程讓資料範圍變大，原本會跳回全覽 */
  it('縮放中資料範圍改變：看到的時間範圍不變', async () => {
    const w = await mountGantt({ timeDomain: null })
    zoomIn(w)
    await nextTick()
    const before = visible(w)
    await w.setProps({ data: [...TASKS, { id: 'z', row: 'M1', start: local(10, 25), end: local(10, 26) }] })
    await nextTick()
    const after = visible(w)
    expect(after[0]).toBeCloseTo(before[0], -3)
    expect(after[1]).toBeCloseTo(before[1], -3)
    expect(w.findAll('button').some((b) => b.text() === '重設縮放')).toBe(true)
  })

  it('沒縮放時跟著資料範圍', async () => {
    const w = await mountGantt({ timeDomain: null, domainPadding: 0 })
    await w.setProps({ data: [...TASKS, { id: 'z', row: 'M1', start: local(10, 25), end: local(10, 26) }] })
    expect(barX(w, 'a')).toBeCloseTo(0)
    expect(w.findAll('button').some((b) => b.text() === '重設縮放')).toBe(false)
  })
})
