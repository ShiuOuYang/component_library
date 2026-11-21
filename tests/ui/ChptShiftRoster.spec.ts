import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptShiftRoster from '@/components/library/ui/ChptShiftRoster.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { Roster, RosterShift } from '@/components/library/shared/shiftRoster'

const shifts: RosterShift[] = [
  { code: 'D', label: '早班', start: '06:00', end: '14:00' },
  { code: 'E', label: '中班', start: '14:00', end: '22:00', color: 'orange' },
  { code: 'N', label: '夜班', start: '22:00', end: '06:00', key: 'z' },
  { code: 'O', label: '休', off: true },
]
const people = [
  { id: 'a', name: '王小明', group: '領班' },
  { id: 'b', name: '陳怡君' },
  { id: 'c', name: '林志豪' },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

/** jsdom 沒有 PointerEvent：用一般 Event 加上需要的欄位 */
async function fire(el: Element, type: string, init: Record<string, unknown> = {}) {
  const ev = new Event(type, { bubbles: true, cancelable: true })
  for (const [k, v] of Object.entries({ pointerId: 1, pointerType: 'mouse', button: 0, shiftKey: false, ...init })) Object.defineProperty(ev, k, { value: v })
  el.dispatchEvent(ev)
  await nextTick()
}

function mountIt(props: Record<string, unknown> = {}) {
  const model = ref<Roster>((props.modelValue as Roster) ?? { a: { '2026-11-23': 'E', '2026-11-24': 'D' } })
  const w = mount(
    {
      render: () =>
        h(ChptShiftRoster, {
          people,
          shifts,
          start: '2026-11-23',
          days: 3,
          ...props,
          modelValue: model.value,
          'onUpdate:modelValue': (v: Roster) => (model.value = v),
        }),
    },
    { attachTo: document.body }
  )
  mounted.push(w)
  const comp = () => w.findComponent(ChptShiftRoster)
  const cell = (r: number, c: number) => w.findAll('tbody tr')[r].findAll('[role="gridcell"]')[c]
  const brush = (label: string) => w.find('[role="radiogroup"][aria-label="要填入的班別"]').findAll('[role="radio"]').find((b) => b.text().includes(label))!
  const modeBtn = (label: string) => w.findAll('[role="radio"]').find((r) => r.text().endsWith(label))!
  const live = () => w.find('.sr-only[aria-live="assertive"]').text()
  return { w, model, comp, cell, brush, modeBtn, live }
}

describe('ChptShiftRoster', () => {
  it('表頭日期與星期、週末底色、人員與組別、格子 aria-label、統計、人力列', () => {
    const { w, cell } = mountIt({ requirements: { D: 1, E: 1, N: 1 } })
    expect(w.findAll('thead th').map((t) => t.text().replace(/\s+/g, ''))).toEqual(['人員', '11/23一', '11/24二', '11/25三', '統計'])
    expect(w.find('tbody th').text()).toContain('領班')
    expect(cell(0, 0).attributes('aria-label')).toBe('王小明, 11/23 一, 中班')
    expect(cell(0, 1).attributes('aria-label')).toBe('王小明, 11/24 二, 早班, 王小明 11/24：與前一班只隔 8 小時')
    expect(cell(1, 0).attributes('aria-label')).toBe('陳怡君, 11/23 一, 未排班')
    expect(cell(0, 0).find('span').attributes('style')).toContain('orange')
    expect(w.findAll('tbody tr')[0].findAll('td').at(-1)!.text()).toContain('上班 2 天')
    const foot = w.findAll('tfoot tr').map((r) => r.text().replace(/\s+/g, ''))
    expect(foot[0]).toBe('早班▲0/11/1▲0/1')
    expect(w.text()).toContain('人力不足 7 格 · 規則提醒 1 項')
    expect(w.findAll('ul li')).toHaveLength(1)
  })

  it('週末底色；沒有問題時顯示「人力足夠」', () => {
    const { w } = mountIt({ start: '2026-11-28', days: 2, modelValue: {} })
    expect(w.findAll('thead th')[1].classes()).toContain('bg-surface-tertiary')
    expect(w.text()).toContain('人力足夠，沒有規則提醒')
  })

  it('填入：點格子用筆刷；拖曳填一整段（同一列）；Shift + 點；觸控拖曳不填；橡皮擦', async () => {
    const { model, cell, brush, comp, live } = mountIt()
    await brush('夜班').trigger('click')
    await fire(cell(1, 0).element, 'pointerdown')
    expect(model.value.b).toEqual({ '2026-11-23': 'N' })
    expect(live()).toBe('陳怡君 11/23：夜班')
    await fire(cell(1, 2).element, 'pointerenter')
    expect(model.value.b).toEqual({ '2026-11-23': 'N', '2026-11-24': 'N', '2026-11-25': 'N' })
    await fire(cell(2, 2).element, 'pointerenter') // 別的列不填
    await fire(cell(1, 2).element, 'pointerup')
    expect(model.value.c).toBeUndefined()
    // Shift + 點
    await brush('早班').trigger('click')
    await fire(cell(2, 0).element, 'pointerdown')
    await fire(cell(2, 0).element, 'pointerup')
    await fire(cell(2, 2).element, 'pointerdown', { shiftKey: true })
    await fire(cell(2, 2).element, 'pointerup')
    expect(model.value.c).toEqual({ '2026-11-23': 'D', '2026-11-24': 'D', '2026-11-25': 'D' })
    expect(live()).toBe('林志豪 11/23 到 11/25：早班')
    // 觸控
    await brush('清除').trigger('click')
    await fire(cell(2, 0).element, 'pointerdown', { pointerType: 'touch' })
    await fire(cell(2, 2).element, 'pointerenter')
    await fire(cell(2, 2).element, 'pointerleave')
    expect(model.value.c).toEqual({ '2026-11-24': 'D', '2026-11-25': 'D' })
    // 右鍵不做事；同樣的值不送出
    const before = comp().emitted('change')!.length
    await fire(cell(2, 1).element, 'pointerdown', { button: 2 })
    await brush('早班').trigger('click')
    await fire(cell(2, 1).element, 'pointerdown')
    expect(comp().emitted('change')!.length).toBe(before)
  })

  it('change 一次操作只送一次', async () => {
    const { cell, brush, comp } = mountIt()
    await brush('夜班').trigger('click')
    await fire(cell(1, 0).element, 'pointerdown')
    await fire(cell(1, 2).element, 'pointerenter')
    const changes = comp().emitted('change')!
    expect(changes[0][0]).toEqual([{ personId: 'b', date: '2026-11-23', code: 'N' }])
    expect((changes[1][0] as unknown[]).length).toBe(3)
  })

  it('鍵盤：一個 Tab 停駐點；方向鍵、Home / End；快捷鍵填入；空白鍵用筆刷；Delete 清除', async () => {
    const { w, model, cell } = mountIt()
    expect(w.findAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1)
    ;(cell(1, 0).element as HTMLElement).focus()
    await cell(1, 0).trigger('keydown', { key: 'd' })
    expect(model.value.b).toEqual({ '2026-11-23': 'D' })
    await cell(1, 0).trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(cell(1, 1).element)
    await cell(1, 1).trigger('keydown', { key: 'z' }) // 自訂快捷鍵
    expect(model.value.b['2026-11-24']).toBe('N')
    await cell(1, 1).trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement).toBe(cell(1, 2).element)
    await cell(1, 2).trigger('keydown', { key: ' ' }) // 筆刷預設第一個（早班）
    expect(model.value.b['2026-11-25']).toBe('D')
    await cell(1, 2).trigger('keydown', { key: 'Delete' })
    expect(model.value.b['2026-11-25']).toBeUndefined()
    await cell(1, 2).trigger('keydown', { key: 'Home' })
    await cell(1, 0).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(document.activeElement).toBe(cell(2, 0).element)
    await cell(2, 0).trigger('keydown', { key: 'ArrowUp' })
    await cell(2, 0).trigger('keydown', { key: 'ArrowLeft' }) // 邊界
    await cell(2, 0).trigger('keydown', { key: 'd', ctrlKey: true }) // 修飾鍵不填
    await cell(2, 0).trigger('keydown', { key: 'q' }) // 沒有這個快捷鍵
    expect(model.value.c).toBeUndefined()
  })

  it('交換：拖曳到同一天另一個人；不同天不換；鍵盤空白鍵拿起、移動、放下；Esc 取消', async () => {
    const { model, cell, modeBtn, live, w } = mountIt({ modelValue: { a: { '2026-11-23': 'D' }, b: { '2026-11-23': 'N', '2026-11-24': 'E' } } })
    await modeBtn('交換').trigger('click')
    expect(w.find('[role="radiogroup"][aria-label="要填入的班別"]').exists()).toBe(false)
    await fire(cell(0, 0).element, 'pointerdown')
    expect(cell(0, 0).attributes('aria-selected')).toBe('true')
    await fire(cell(1, 0).element, 'pointerup')
    expect(model.value.a['2026-11-23']).toBe('N')
    expect(model.value.b['2026-11-23']).toBe('D')
    expect(live()).toBe('11/23 王小明 與 陳怡君 已互換')
    await fire(cell(0, 0).element, 'pointerdown')
    await fire(cell(1, 1).element, 'pointerup') // 不同天
    expect(model.value.b['2026-11-24']).toBe('E')
    // 鍵盤
    ;(cell(1, 1).element as HTMLElement).focus()
    await cell(1, 1).trigger('keydown', { key: ' ' })
    expect(live()).toContain('已拿起 陳怡君 11/24')
    await cell(1, 1).trigger('keydown', { key: 'ArrowUp' })
    await cell(0, 1).trigger('keydown', { key: 'Enter' })
    expect(model.value.a['2026-11-24']).toBe('E')
    expect(model.value.b['2026-11-24']).toBeUndefined()
    await cell(0, 1).trigger('keydown', { key: ' ' })
    await cell(0, 1).trigger('keydown', { key: 'Escape' })
    expect(live()).toBe('已取消')
    await cell(0, 1).trigger('keydown', { key: 'Escape' }) // 沒有拿著時不做事
    // 拿起後放在同一格：不換
    await cell(0, 1).trigger('keydown', { key: ' ' })
    await cell(0, 1).trigger('keydown', { key: ' ' })
    expect(model.value.a['2026-11-24']).toBe('E')
    // 鍵盤拿起後移到別天放下：不換
    await cell(0, 1).trigger('keydown', { key: ' ' })
    await cell(0, 2).trigger('keydown', { key: ' ' })
    expect(model.value.a['2026-11-24']).toBe('E')
  })

  it('readonly：沒有工具列與提示、不能改；方向鍵仍可移動', async () => {
    const { w, model, cell } = mountIt({ readonly: true })
    expect(w.find('[role="grid"]').attributes('aria-readonly')).toBe('true')
    expect(w.find('[role="radiogroup"]').exists()).toBe(false)
    await fire(cell(1, 0).element, 'pointerdown')
    await cell(1, 0).trigger('keydown', { key: 'd' })
    await cell(1, 0).trigger('keydown', { key: ' ' })
    expect(model.value.b).toBeUndefined()
    ;(cell(1, 0).element as HTMLElement).focus()
    await cell(1, 0).trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(cell(1, 1).element)
  })

  it('連續上班與規則提醒超過 6 項時只列 6 項；showStats / showWarnings=false；ref 方法', () => {
    const days = 9
    const dates = Array.from({ length: days }, (_, i) => `2026-11-${String(23 + i > 30 ? 23 + i - 30 : 23 + i).padStart(2, '0')}`.replace('2026-11-0', '2026-12-0'))
    const full = Object.fromEntries(people.map((p) => [p.id, Object.fromEntries(dates.map((d) => [d, 'D']))]))
    const { w, comp } = mountIt({ days, modelValue: full, rules: { maxConsecutive: 6 } })
    expect(w.findAll('ul li').at(-1)!.text()).toBe('還有 3 項')
    const api = comp().vm as unknown as { warnings: () => unknown[]; shortages: () => unknown[] }
    expect(api.warnings()).toHaveLength(9)
    expect(api.shortages()).toEqual([])
    const r = mountIt({ showStats: false, showWarnings: false })
    expect(r.w.text()).not.toContain('統計')
    expect(r.w.find('ul').exists()).toBe(false)
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptShiftRoster, { people, shifts, start: '2026-11-23', days: 2, modelValue: {} })) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.find('[role="grid"]').attributes('aria-label')).toBe('Shift roster')
    expect(w.find('[role="gridcell"]').attributes('aria-label')).toBe('王小明, 11/23 Mo, Unassigned')
  })
})
