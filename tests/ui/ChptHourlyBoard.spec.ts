import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptHourlyBoard from '@/components/library/ui/ChptHourlyBoard.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { HourlySlot } from '@/components/library/shared/hourlyBoard'

const at = (h: number, m = 0) => new Date(2026, 0, 5, h, m).getTime()
const base = (): HourlySlot[] => [
  { id: '1', start: '08:00', end: '09:00', plan: 100, actual: 90 },
  { id: '2', start: '09:00', end: '10:00', plan: 100, actual: 105 },
  { id: '3', start: '10:00', end: '11:00', plan: 80, actual: 60, breakMinutes: 12, reason: 'M', note: '缺料' },
  { id: '4', start: '11:00', end: '12:00', plan: 100, actual: null },
  { id: '5', start: '12:00', end: '13:00', plan: 100, actual: null },
]
const reasons = [
  { code: 'C', label: '換線' },
  { code: 'M', label: '缺料' },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
})

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const slots = ref<HourlySlot[]>((props.slots as HourlySlot[]) ?? base())
  const changes: unknown[] = []
  const node = () =>
    h(ChptHourlyBoard, {
      reasons,
      now: at(11, 30),
      ...props,
      slots: slots.value,
      'onUpdate:slots': (v: HourlySlot[]) => (slots.value = v),
      onChange: (c: unknown) => changes.push(c),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const rows = () => w.findAll('tbody tr')
  return { w, slots, changes, rows }
}

describe('ChptHourlyBoard', () => {
  it('摘要：目前應做（目前時段依比例）、實際、差異、達成率、班別預估；待填原因', () => {
    const { w } = mountIt({ title: '早班' })
    const kpi = w.find('dl').text()
    // 應做 100 + 100 + 80 + 50 = 330；實際 255
    expect(kpi).toContain('目前應做330')
    expect(kpi).toContain('整班計畫 480')
    expect(kpi).toContain('目前實際255')
    expect(kpi).toContain('差異-75')
    expect(kpi).toContain('達成率77%')
    expect(kpi).toContain(`班別預估${Math.round(255 + 150 * (255 / 330))}`)
    expect(w.text()).toContain('早班')
    expect(w.text()).toContain('11:30')
    expect(w.text()).toContain('1 個時段待填原因')
  })

  it('逐列：差異、累計差異、達成條、目前時段、未來時段、休息、合計', () => {
    const { w, rows } = mountIt()
    const r = rows()
    expect(r[0].text()).toContain('-10')
    expect(r[0].text()).toContain('90%')
    expect(r[1].text()).toContain('+5')
    expect(r[1].text()).toContain('-5')
    expect(r[2].text()).toContain('含休息 12 分')
    expect(r[3].attributes('aria-current')).toBe('time')
    expect(r[3].text()).toContain('現在')
    expect(r[4].classes()).toContain('text-content-tertiary')
    // 未來時段沒有輸入框
    expect(r[4].find('input').exists()).toBe(false)
    expect(w.find('tfoot').text()).toContain('480')
    expect(w.find('tfoot').text()).toContain('255')
  })

  it('落後原因：只有落後的時段有、沒填的標出來；選了更新', async () => {
    const { rows, slots, changes } = mountIt()
    const sel = rows()[0].find('select')
    expect(sel.attributes('aria-invalid')).toBe('true')
    expect(sel.find('option').text()).toBe('請選原因')
    expect(rows()[1].find('select').exists()).toBe(false)
    expect(rows()[2].find('select').attributes('aria-invalid')).toBeUndefined()
    await sel.setValue('C')
    expect(slots.value[0].reason).toBe('C')
    expect(changes.at(-1)).toMatchObject({ field: 'reason', slot: { id: '1', reason: 'C' } })
    await rows()[0].find('select').setValue('')
    expect(slots.value[0].reason).toBeNull()
  })

  it('填實際與備註：空白為 null、負數算 0、四捨五入', async () => {
    const { rows, slots, changes } = mountIt()
    const input = rows()[3].find('input[type="number"]')
    expect(input.attributes('aria-label')).toBe('11:00–12:00 實際數量')
    await input.setValue('42.6')
    expect(slots.value[3].actual).toBe(43)
    await rows()[3].find('input[type="number"]').setValue('-5')
    expect(slots.value[3].actual).toBe(0)
    await rows()[3].find('input[type="number"]').setValue('')
    expect(slots.value[3].actual).toBeNull()
    const note = rows()[0].find('input[type="text"]')
    await note.setValue('換吸嘴')
    expect(slots.value[0].note).toBe('換吸嘴')
    expect(changes.map((c) => (c as { field: string }).field)).toEqual(['actual', 'actual', 'actual', 'note'])
  })

  it('readonly：沒有輸入框、原因不能改；不顯示備註欄', () => {
    const { w } = mountIt({ readonly: true, showNote: false })
    expect(w.find('input').exists()).toBe(false)
    expect(w.find('select').attributes('disabled')).toBeDefined()
    expect(w.findAll('thead th')).toHaveLength(7)
    // 沒有 reasons 時沒有原因欄
    const nr = mountIt({ reasons: [] })
    expect(nr.w.find('select').exists()).toBe(false)
    expect(nr.w.findAll('thead th')).toHaveLength(7)
  })

  it('now=null：不判斷目前時段、不預估；沒有時段', () => {
    const { w } = mountIt({ now: null })
    expect(w.find('[aria-current]').exists()).toBe(false)
    expect(w.find('dl').text()).toContain('班別預估—')
    expect(mountIt({ slots: [] }).w.text()).toContain('沒有時段')
  })

  it('不給 now 時用電腦時間、每 30 秒更新；Date', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(at(9, 59))
    const { w } = mountIt({ now: undefined })
    expect(w.find('[aria-current]').text()).toContain('09:00')
    vi.setSystemTime(at(10, 0))
    vi.advanceTimersByTime(30_000)
    await nextTick()
    expect(w.find('[aria-current]').text()).toContain('10:00')
    const d = mountIt({ now: new Date(at(8, 10)) })
    expect(d.w.find('[aria-current]').text()).toContain('08:00')
  })

  it('匯出 CSV（原因顯示名稱）', async () => {
    const created: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (b: Blob) => (created.push(b), 'blob:x') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const { w } = mountIt({ slots: [...base().slice(0, 3), { id: 'x', start: '11:00', end: '12:00', plan: 10, actual: 1, reason: 'ZZ' }] })
    await w.findAll('button').find((b) => b.text().includes('匯出'))!.trigger('click')
    const lines = (await created[0].text()).replace(/^\uFEFF/, '').split('\r\n')
    expect(lines[0]).toBe('時段,計畫,實際,差異,累計計畫,累計實際,累計差異,落後原因,備註')
    expect(lines[1]).toBe('08:00–09:00,100,90,-10,100,90,-10,,')
    expect(lines[3]).toBe('10:00–11:00,80,60,-20,280,255,-25,缺料,缺料')
    expect(lines[4]).toContain(',ZZ,')
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })

  it('電視模式、英文語系', () => {
    const tv = mountIt({ tv: true })
    expect(tv.w.find('.hourly-board').classes()).toContain('text-lg')
    const { w } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.find('dl').text()).toContain('Plan to now')
    expect(w.text()).toContain('1 slot need a reason')
  })
})
