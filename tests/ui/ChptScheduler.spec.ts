import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptScheduler from '@/components/library/ui/ChptScheduler.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { SchedEvent } from '@/components/library/shared/scheduler'

/** 2026-11-24（二）10:30 */
const NOW = new Date(2026, 10, 24, 10, 30).getTime()
const at = (d: number, hh: number, m = 0) => new Date(2026, 10, d, hh, m).getTime()
/** 欄寬 100、時間格 08:00–18:00 高 600 → 1 小時 60px、1 分鐘 1px */
const yOf = (hh: number, m = 0) => (hh - 8) * 60 + m

const base: SchedEvent[] = [
  { id: 'a', title: '鋼板更換', start: at(23, 8, 30), end: at(23, 9, 30), resource: 'm1' },
  { id: 'b', title: '試產', start: at(23, 9), end: at(23, 11), resource: 'm1' },
  { id: 'c', title: 'AOI 調整', start: at(24, 13), end: at(24, 14), resource: 'm2', color: 'red' },
  { id: 'd', title: '月保養', start: new Date(at(25, 8)), end: new Date(at(25, 10)).toISOString(), resource: 'm2', locked: true },
  { id: 'e', title: '夜班試跑', start: at(27, 16), end: at(28, 9) },
]
const resources = [
  { id: 'm1', name: 'SMT 一線', color: 'blue' },
  { id: 'm2', name: 'AOI' },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function pointer(target: EventTarget, type: string, x: number, y: number, extra: Record<string, unknown> = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    clientX: { value: x },
    clientY: { value: y },
    pointerId: { value: 1 },
    button: { value: 0 },
    pointerType: { value: 'mouse' },
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])),
  })
  target.dispatchEvent(e)
}

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 600, right: 100, bottom: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
  const events = ref<SchedEvent[]>((props.events as SchedEvent[]) ?? base)
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  const node = () =>
    h(ChptScheduler, {
      now: NOW,
      dayStart: 8,
      dayEnd: 18,
      hourHeight: 60,
      ...props,
      events: events.value,
      'onUpdate:events': (v: SchedEvent[]) => (rec('events')(v), (events.value = v)),
      'onUpdate:view': rec('view'),
      'onUpdate:date': rec('date'),
      onCreate: rec('create'),
      onSelect: rec('select'),
      onChange: rec('change'),
      onDelete: rec('delete'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const cols = () => w.findAll('[data-col]')
  const evEl = (id: string) => w.find(`[data-id="${id}"]`)
  const title = () => w.find('h3').text()
  const btn = (label: string) => w.findAll('button').find((b) => b.text() === label || b.attributes('aria-label') === label)!
  return { w, events, emitted, cols, evEl, title, btn }
}

describe('ChptScheduler', () => {
  it('週檢視：7 欄、標題、並排、裁切、現在時間線、衝突與鎖定', () => {
    const { w, cols, evEl, title } = mountIt()
    expect(title()).toBe('2026/11/23 – 11/29')
    expect(cols()).toHaveLength(7)
    const headers = w.findAll('.sticky.top-0').slice(1).map((x) => x.text())
    expect(headers[0]).toBe('11/23（一）')
    expect(w.findAll('.sticky.top-0')[2].classes()).toContain('font-semibold') // 今天
    // a、b 重疊並排
    expect(evEl('a').attributes('style')).toContain('top: 5%')
    expect(evEl('a').attributes('style')).toContain('width: calc(50% - 4px)')
    expect(evEl('b').attributes('style')).toContain('left: calc(50% + 2px)')
    expect(evEl('a').attributes('aria-label')).toBe('鋼板更換，11/23（一） 08:30–09:30，m1，時間衝突')
    expect(evEl('a').text()).toContain('鋼板更換')
    expect(evEl('b').text()).toContain('09:00–11:00')
    // 衝突：同一資源重疊才算；沒資源的 e 不算
    expect(w.findAll('.sched-event').filter((x) => x.text().includes('warning')).map((x) => x.attributes('data-id'))).toEqual(['a', 'b'])
    // 鎖定：鎖頭、沒有調整把手
    expect(evEl('d').text()).toContain('lock')
    expect(evEl('d').attributes('aria-label')).toContain('已鎖定')
    expect(evEl('d').find('[data-resize]').exists()).toBe(false)
    expect(evEl('c').attributes('style')).toContain('border-left-color: red')
    // 跨夜：週五、週六各一段（週五被裁切沒有把手）
    expect(w.findAll('[data-id="e"]')).toHaveLength(2)
    expect(cols()[4].find('[data-id="e"] [data-resize]').exists()).toBe(false)
    // 現在時間線在週二 10:30
    expect(w.findAll('[data-now]')).toHaveLength(1)
    expect(cols()[1].find('[data-now]').attributes('style')).toContain('top: 25%')
    expect((w.findComponent(ChptScheduler).vm as unknown as { conflicts: string[] }).conflicts).toEqual(['a', 'b'])
  })

  it('上一段 / 下一段 / 今天、切換檢視、點日期看日檢視；受控的 date / view', async () => {
    const { emitted, title, btn, cols } = mountIt()
    await btn('下一段').trigger('click')
    expect(title()).toBe('2026/11/30 – 12/6')
    await btn('上一段').trigger('click')
    await btn('上一段').trigger('click')
    expect(title()).toBe('2026/11/16 – 11/22')
    await btn('今天').trigger('click')
    expect(title()).toBe('2026/11/23 – 11/29')
    expect(emitted.date).toEqual([at(31, 0), at(24, 0), at(17, 0), at(24, 0)]) // 目前那天 ± 7 天
    await btn('看 11/25（三） 的日檢視').trigger('click')
    expect(emitted.view).toEqual(['day'])
    expect(title()).toBe('2026/11/25（三）')
    expect(cols()).toHaveLength(1)
    await btn('下一段').trigger('click')
    expect(title()).toBe('2026/11/26（四）')
    await btn('週').trigger('click')
    expect(emitted.view).toEqual(['day', 'week'])
    expect(btn('週').attributes('aria-pressed')).toBe('true')
    // 受控
    const c = mountIt({ date: '2026-12-30T12:00:00', view: 'week' })
    expect(c.title()).toBe('2026/12/28 – 2027/1/3')
    expect(c.w.findAll('[data-now]')).toHaveLength(0)
  })

  it('日檢視依資源分欄；外部改 date / view', async () => {
    const date = ref<number | null>(at(23, 12))
    const view = ref<'week' | 'day'>('day')
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 600 } as DOMRect)
    const w = mount(() => h(ChptScheduler, { now: NOW, dayStart: 8, dayEnd: 18, events: base, resources, date: date.value, view: view.value }), { attachTo: document.body })
    mounted.push(w)
    expect(w.findAll('[data-col]')).toHaveLength(2)
    expect(w.findAll('.sticky.top-0').slice(1).map((x) => x.text())).toEqual(['SMT 一線', 'AOI'])
    expect(w.findAll('[data-col]')[0].findAll('.sched-event').map((x) => x.attributes('data-id'))).toEqual(['a', 'b'])
    // 沒指定顏色用資源顏色
    expect(w.find('[data-id="a"]').attributes('style')).toContain('border-left-color: blue')
    date.value = at(25, 0)
    await nextTick()
    expect(w.find('h3').text()).toBe('2026/11/25（三）')
    expect(w.findAll('[data-col]')[1].findAll('.sched-event').map((x) => x.attributes('data-id'))).toEqual(['d'])
    expect(w.find('[data-id="d"]').attributes('style')).toContain('border-left-color: rgb(var(--t-accent-solid))')
    date.value = null // null 不改
    view.value = 'week'
    await nextTick()
    expect(w.find('h3').text()).toBe('2026/11/23 – 11/29')
  })

  it('空白處拖曳建立；只點一下用預設長度；右鍵、唯讀不建立', async () => {
    const { w, emitted, cols } = mountIt()
    pointer(cols()[1].element, 'pointerdown', 150, yOf(10))
    pointer(window, 'pointermove', 150, yOf(11, 50))
    await nextTick()
    expect(w.find('[data-ghost]').text()).toBe('新增 10:00–11:45')
    pointer(window, 'pointermove', 150, yOf(12, 2))
    pointer(window, 'pointerup', 150, yOf(12, 2))
    await nextTick()
    expect(w.find('[data-ghost]').exists()).toBe(false)
    // 往上拖也可以
    pointer(cols()[2].element, 'pointerdown', 250, yOf(15))
    pointer(window, 'pointermove', 250, yOf(13, 30))
    pointer(window, 'pointerup', 250, yOf(13, 30))
    // 只點一下
    pointer(cols()[3].element, 'pointerdown', 350, yOf(9, 7))
    pointer(window, 'pointerup', 350, yOf(9, 7))
    // 拖太短：當作點一下
    pointer(cols()[3].element, 'pointerdown', 350, yOf(16))
    pointer(window, 'pointermove', 350, yOf(16, 6))
    pointer(window, 'pointerup', 350, yOf(16, 6))
    expect(emitted.create).toEqual([
      { start: at(24, 10), end: at(24, 12) },
      { start: at(25, 13, 30), end: at(25, 15) },
      { start: at(26, 9, 0), end: at(26, 10) },
      { start: at(26, 16), end: at(26, 17) },
    ])
    pointer(cols()[1].element, 'pointerdown', 150, yOf(10), { button: 2 })
    pointer(window, 'pointerup', 150, yOf(10))
    expect(emitted.create).toHaveLength(4)
    const ro = mountIt({ readonly: true })
    pointer(ro.cols()[1].element, 'pointerdown', 150, yOf(10))
    pointer(window, 'pointerup', 150, yOf(10))
    expect(ro.emitted.create).toBeUndefined()
    expect(ro.w.text()).toContain('唯讀')
    expect(ro.w.find('[data-resize]').exists()).toBe(false)
  })

  it('資源分欄時建立帶 resource', () => {
    const { emitted, cols } = mountIt({ view: 'day', date: at(24, 0), resources })
    pointer(cols()[1].element, 'pointerdown', 150, yOf(9))
    pointer(window, 'pointerup', 150, yOf(9))
    expect(emitted.create).toEqual([{ start: at(24, 9), end: at(24, 10), resource: 'm2' }])
  })

  it('拖曳移動：換天、吸附；拖完不觸發點選；沒移動就是點選', async () => {
    const { evEl, emitted, events } = mountIt()
    // a：週一 08:30–09:30，在 09:00 處按下（偏移 30 分）
    pointer(evEl('a').element, 'pointerdown', 50, yOf(9))
    pointer(window, 'pointermove', 51, yOf(9, 1)) // 小於 4px 不算
    pointer(window, 'pointermove', 250, yOf(10, 37))
    await nextTick()
    // 預覽：已移到週三
    expect(evEl('a').element.closest('[data-col]')!.getAttribute('data-col')).toBe('2')
    pointer(window, 'pointerup', 250, yOf(10, 37))
    await nextTick()
    const moved = events.value.find((e) => e.id === 'a')!
    expect([moved.start, moved.end]).toEqual([at(25, 10), at(25, 11)]) // 10:07 吸附到 10:00
    expect(emitted.change).toEqual([{ event: moved, previous: base[0], kind: 'move' }])
    await evEl('a').trigger('click')
    expect(emitted.select).toBeUndefined()
    await new Promise((r) => setTimeout(r))
    // 沒移動 → 點選
    pointer(evEl('c').element, 'pointerdown', 150, yOf(13, 10))
    pointer(window, 'pointerup', 150, yOf(13, 10))
    await evEl('c').trigger('click')
    expect(emitted.select).toEqual([base[2]])
    expect(evEl('c').attributes('aria-pressed')).toBe('true')
    expect(emitted.change).toHaveLength(1)
    // 移回原位：不送出
    pointer(evEl('c').element, 'pointerdown', 150, yOf(13, 10))
    pointer(window, 'pointermove', 150, yOf(13, 30))
    pointer(window, 'pointermove', 150, yOf(13, 12))
    pointer(window, 'pointerup', 150, yOf(13, 12))
    expect(emitted.change).toHaveLength(1)
  })

  it('資源分欄時拖到另一欄換資源；鎖定、右鍵、取消不動', async () => {
    const { evEl, emitted, events } = mountIt({ view: 'day', date: at(23, 0), resources })
    pointer(evEl('b').element, 'pointerdown', 50, yOf(10))
    pointer(window, 'pointermove', 150, yOf(11))
    pointer(window, 'pointerup', 150, yOf(11))
    expect(events.value.find((e) => e.id === 'b')).toMatchObject({ resource: 'm2', start: at(23, 10), end: at(23, 12) })
    // 鎖定
    const locked = mountIt({ view: 'day', date: at(25, 0), resources })
    pointer(locked.evEl('d').element, 'pointerdown', 150, yOf(8, 30))
    pointer(window, 'pointermove', 150, yOf(12))
    pointer(window, 'pointerup', 150, yOf(12))
    expect(locked.emitted.change).toBeUndefined()
    // 右鍵
    pointer(evEl('a').element, 'pointerdown', 50, yOf(9), { button: 2 })
    pointer(window, 'pointermove', 50, yOf(12))
    pointer(window, 'pointerup', 50, yOf(12))
    // 取消
    pointer(evEl('a').element, 'pointerdown', 50, yOf(9))
    pointer(window, 'pointermove', 50, yOf(12))
    await nextTick()
    pointer(window, 'pointercancel', 50, yOf(12))
    pointer(window, 'pointerup', 50, yOf(12))
    expect(emitted.change).toHaveLength(1)
  })

  it('拉下緣調整長度（至少一格吸附）', () => {
    const { evEl, emitted, events } = mountIt()
    pointer(evEl('c').find('[data-resize]').element, 'pointerdown', 150, yOf(14))
    pointer(window, 'pointermove', 150, yOf(15, 20))
    pointer(window, 'pointerup', 150, yOf(15, 20))
    expect(events.value.find((e) => e.id === 'c')!.end).toBe(at(24, 15, 15))
    expect((emitted.change[0] as { kind: string }).kind).toBe('resize')
    pointer(evEl('c').find('[data-resize]').element, 'pointerdown', 150, yOf(15, 15))
    pointer(window, 'pointermove', 150, yOf(9))
    pointer(window, 'pointerup', 150, yOf(9))
    expect(events.value.find((e) => e.id === 'c')!.end).toBe(at(24, 13, 15))
    pointer(evEl('c').find('[data-resize]').element, 'pointerdown', 150, yOf(14), { button: 1 })
    pointer(window, 'pointerup', 150, yOf(16))
    expect(emitted.change).toHaveLength(2)
  })

  it('鍵盤：上下移動、Shift + 上下調整、左右換天 / 換資源、Delete；鎖定不動', async () => {
    const { evEl, emitted, events } = mountIt()
    await evEl('c').trigger('keydown', { key: 'ArrowDown' })
    expect(events.value.find((e) => e.id === 'c')).toMatchObject({ start: at(24, 13, 15), end: at(24, 14, 15) })
    await evEl('c').trigger('keydown', { key: 'ArrowUp', shiftKey: true })
    expect(events.value.find((e) => e.id === 'c')!.end).toBe(at(24, 14))
    await evEl('c').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(events.value.find((e) => e.id === 'c')!.start).toBe(at(25, 13, 15))
    expect(document.activeElement?.getAttribute('data-id')).toBe('c')
    await evEl('a').trigger('keydown', { key: 'ArrowLeft' }) // 已在第一欄
    await evEl('a').trigger('keydown', { key: 'Enter' }) // 其他鍵不處理
    await evEl('d').trigger('keydown', { key: 'ArrowDown' })
    await evEl('d').trigger('keydown', { key: 'Delete' })
    expect(emitted.change.map((c) => (c as { kind: string }).kind)).toEqual(['move', 'resize', 'move'])
    await evEl('a').trigger('keydown', { key: 'Backspace' })
    expect(emitted.delete).toEqual([base[0]])
    // 資源分欄
    const r = mountIt({ view: 'day', date: at(24, 0), resources })
    await r.evEl('c').trigger('keydown', { key: 'ArrowLeft' })
    expect(r.events.value.find((e) => e.id === 'c')).toMatchObject({ resource: 'm1', start: at(24, 13) })
  })

  it('scrollToHour / goTo；不給 now 時每分鐘更新；英文語系', async () => {
    const { w, title } = mountIt({ dayStart: 0, dayEnd: 24, initialHour: 7 })
    const scroller = w.find('.overflow-auto').element as HTMLElement
    expect(scroller.scrollTop).toBe(420)
    const vm = w.findComponent(ChptScheduler).vm as unknown as { scrollToHour: (h: number) => void; goTo: (t: number) => void }
    vm.scrollToHour(2)
    expect(scroller.scrollTop).toBe(120)
    vm.goTo(at(10, 9))
    await nextTick()
    expect(title()).toBe('2026/11/9 – 11/15')

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 24, 23, 59))
    const live = mountIt({ now: null, dayStart: 0, dayEnd: 24 })
    expect(live.cols()[1].find('[data-now]').exists()).toBe(true)
    vi.setSystemTime(new Date(2026, 10, 25, 0, 30))
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(live.cols()[1].find('[data-now]').exists()).toBe(false)
    expect(live.cols()[2].find('[data-now]').exists()).toBe(true)
    vi.useRealTimers()

    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.findAll('.sticky.top-0')[1].text()).toBe('Mon 11/23')
    expect(en.btn('Today').exists()).toBe(true)
    await en.btn('Open day view for Tue 11/24').trigger('click')
    expect(en.title()).toBe('Tue, 2026/11/24')
    expect(en.evEl('c').attributes('aria-label')).toBe('AOI 調整, Tue 11/24 13:00–14:00, m2')
  })
})
