import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptCalendar from '@/components/library/ui/ChptCalendar.vue'

let wrapper: ReturnType<typeof mount> | null = null
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 28, 10)) // 2026-09-28（星期一）
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
})

function mountCal(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  const w = mount(ChptCalendar, {
    props: {
      ...props,
      'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
    },
    slots,
    attachTo: document.body,
  })
  wrapper = w
  return w
}

type W = ReturnType<typeof mount>
const title = (w: W) => w.find('h2').text()
const cell = (w: W, date: string) => w.find(`td[data-date="${date}"]`)
const focusedDate = () => (document.activeElement as HTMLElement)?.dataset.date
const press = async (w: W, key: string, extra: Record<string, unknown> = {}) => {
  await w.find('[role="grid"]').trigger('keydown', { key, ...extra })
  await nextTick()
  await nextTick()
}

describe('ChptCalendar：結構', () => {
  it('grid 以年月標題命名；星期欄位有完整名稱；固定 6 週', () => {
    const w = mountCal()
    const grid = w.find('[role="grid"]')
    expect(w.find(`#${grid.attributes('aria-labelledby')}`).text()).toBe('2026 年 9 月')
    const ths = w.findAll('th')
    expect(ths.map((t) => t.text())).toEqual(['日', '一', '二', '三', '四', '五', '六'])
    expect(ths[0].attributes('abbr')).toBe('星期日')
    expect(w.findAll('tbody tr')).toHaveLength(6)
    // 2026-09-01 是星期二 → 第一格是 8/30
    expect(w.find('tbody td').attributes('data-date')).toBe('2026-08-30')
  })

  it('firstDayOfWeek=1 從星期一開始', () => {
    const w = mountCal({ firstDayOfWeek: 1 })
    expect(w.findAll('th').map((t) => t.text())[0]).toBe('一')
    expect(w.find('tbody td').attributes('data-date')).toBe('2026-08-31')
  })

  it('今天 aria-current=date；選取的 aria-selected；每格有完整日期', () => {
    const w = mountCal({ modelValue: '2026-09-15' })
    expect(cell(w, '2026-09-28').attributes('aria-current')).toBe('date')
    expect(cell(w, '2026-09-15').attributes('aria-selected')).toBe('true')
    expect(cell(w, '2026-09-16').attributes('aria-selected')).toBe('false')
    expect(cell(w, '2026-09-15').find('.sr-only').text()).toBe('2026 年 9 月 15 日 星期二')
  })

  it('只有一個 Tab 停駐點：選取的日期（沒選時是今天）', () => {
    const w = mountCal({ modelValue: '2026-09-15' })
    const stops = w.findAll('td[tabindex="0"]')
    expect(stops.map((s) => s.attributes('data-date'))).toEqual(['2026-09-15'])
    wrapper!.unmount()
    const w2 = mountCal()
    expect(w2.find('td[tabindex="0"]').attributes('data-date')).toBe('2026-09-28')
  })

  it('字串日期以本地時區解析（不會因 UTC 差一天）', () => {
    const w = mountCal({ modelValue: '2026-03-01' })
    expect(title(w)).toBe('2026 年 3 月')
    expect(cell(w, '2026-03-01').attributes('aria-selected')).toBe('true')
  })
})

describe('ChptCalendar：操作', () => {
  it('點日期選取（字串）並送出 select', async () => {
    const w = mountCal()
    await cell(w, '2026-09-10').trigger('click')
    expect(w.props('modelValue')).toBe('2026-09-10')
    const [date, key] = w.emitted('select')![0] as [Date, string]
    expect(key).toBe('2026-09-10')
    expect(date.getDate()).toBe(10)
  })

  it('valueType=date 送出 Date', async () => {
    const w = mountCal({ valueType: 'date' })
    await cell(w, '2026-09-10').trigger('click')
    expect(w.props('modelValue')).toBeInstanceOf(Date)
  })

  it('點上 / 下個月的日期會切換月份', async () => {
    const w = mountCal()
    await cell(w, '2026-10-02').trigger('click')
    expect(title(w)).toBe('2026 年 10 月')
    expect(w.emitted('update:month')?.at(-1)).toEqual(['2026-10'])
  })

  it('disabledDate：不能選', async () => {
    const w = mountCal({ disabledDate: (d: Date) => d.getDay() === 0 })
    await cell(w, '2026-09-13').trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(cell(w, '2026-09-13').attributes('aria-disabled')).toBe('true')
  })

  it('切換按鈕：上個月 / 下一年 / 今天（1/31 → 2 月收到月底）', async () => {
    const w = mountCal({ modelValue: '2026-01-31' })
    const btn = (label: string) => w.find(`button[aria-label="${label}"]`)
    await btn('下個月').trigger('click')
    expect(title(w)).toBe('2026 年 2 月')
    expect(w.find('td[tabindex="0"]').attributes('data-date')).toBe('2026-02-28')
    await btn('下一年').trigger('click')
    expect(title(w)).toBe('2027 年 2 月')
    await btn('上個月').trigger('click')
    await btn('上一年').trigger('click')
    expect(title(w)).toBe('2026 年 1 月')
    await w.findAll('button').find((b) => b.text() === '今天')!.trigger('click')
    expect(title(w)).toBe('2026 年 9 月')
  })

  it('受控的 month', async () => {
    const w = mountCal({ month: '2025-12' })
    expect(title(w)).toBe('2025 年 12 月')
    await w.setProps({ month: '2026-02' })
    expect(title(w)).toBe('2026 年 2 月')
  })

  it('外部把選取值改到別的月份時跟過去', async () => {
    const w = mountCal({ modelValue: '2026-09-01' })
    await w.setProps({ modelValue: '2027-05-05' })
    expect(title(w)).toBe('2027 年 5 月')
  })
})

describe('ChptCalendar：鍵盤（WAI-ARIA grid）', () => {
  it('方向鍵移動一天 / 一週，跨月時自動換月', async () => {
    const w = mountCal({ modelValue: '2026-09-28' })
    ;(cell(w, '2026-09-28').element as HTMLElement).focus()
    await press(w, 'ArrowRight')
    expect(focusedDate()).toBe('2026-09-29')
    await press(w, 'ArrowDown')
    expect(focusedDate()).toBe('2026-10-06')
    expect(title(w)).toBe('2026 年 10 月')
    await press(w, 'ArrowUp')
    await press(w, 'ArrowLeft')
    expect(focusedDate()).toBe('2026-09-28')
  })

  it('Home / End：本週頭尾', async () => {
    const w = mountCal({ modelValue: '2026-09-16' }) // 星期三
    ;(cell(w, '2026-09-16').element as HTMLElement).focus()
    await press(w, 'Home')
    expect(focusedDate()).toBe('2026-09-13')
    await press(w, 'End')
    expect(focusedDate()).toBe('2026-09-19')
  })

  it('PageUp / PageDown：月；Shift：年', async () => {
    const w = mountCal({ modelValue: '2026-03-31' })
    ;(cell(w, '2026-03-31').element as HTMLElement).focus()
    await press(w, 'PageUp')
    expect(focusedDate()).toBe('2026-02-28')
    await press(w, 'PageDown', { shiftKey: true })
    expect(focusedDate()).toBe('2027-02-28')
  })

  it('Enter / Space 選取聚焦的日期', async () => {
    const w = mountCal()
    ;(cell(w, '2026-09-28').element as HTMLElement).focus()
    await press(w, 'ArrowRight')
    await press(w, 'Enter')
    expect(w.props('modelValue')).toBe('2026-09-29')
    await press(w, 'ArrowRight')
    await press(w, ' ')
    expect(w.props('modelValue')).toBe('2026-09-30')
  })
})

describe('ChptCalendar：插槽與 compact', () => {
  it('#date-cell 插槽拿到日期資訊', () => {
    const w = mountCal({}, {
      'date-cell': `<template #date-cell="{ dateString, isToday, inMonth }"><span v-if="dateString === '2026-09-28'" class="evt">{{ isToday }}-{{ inMonth }}</span></template>`,
    })
    expect(cell(w, '2026-09-28').find('.evt').text()).toBe('true-true')
  })

  it('compact 不顯示插槽內容', () => {
    const w = mountCal({ compact: true }, { 'date-cell': '<span class="evt">x</span>' })
    expect(w.find('.evt').exists()).toBe(false)
    expect(cell(w, '2026-09-28').classes()).toContain('size-9')
  })
})
