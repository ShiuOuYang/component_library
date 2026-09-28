import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptTimePicker from '@/components/library/ui/ChptTimePicker.vue'

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountTp(props: Record<string, unknown> = {}) {
  const w = mount(ChptTimePicker, {
    props: { label: '開線時間', ...props, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }) },
    attachTo: document.body,
  })
  wrapper = w
  return w
}

type W = ReturnType<typeof mount>
const input = (w: W) => w.find('input')
const typeAndBlur = async (w: W, text: string) => {
  await input(w).setValue(text)
  await input(w).trigger('blur')
}
const openPanel = async (w: W) => {
  await w.find('button[aria-haspopup="dialog"]').trigger('click')
  await nextTick()
}
const column = (w: W, label: string) => w.find(`[role="listbox"][aria-label="${label}"]`)
const option = (w: W, label: string, value: number) => column(w, label).find(`[data-value="${value}"]`)
const pressOn = async (el: ReturnType<W['find']>, key: string) => {
  await el.trigger('keydown', { key })
  await nextTick()
  await nextTick()
}

describe('ChptTimePicker：打字', () => {
  it.each([
    ['930', '09:30'],
    ['0930', '09:30'],
    ['9:5', '09:05'],
    ['21', '21:00'],
    ['2130', '21:30'],
    ['21：45', '21:45'],
  ])('%s → %s', async (text, expected) => {
    const w = mountTp()
    await typeAndBlur(w, text)
    expect(w.props('modelValue')).toBe(expected)
    expect((input(w).element as HTMLInputElement).value).toBe(expected)
  })

  it('打錯（25:00 / abc）還原成原本的值', async () => {
    const w = mountTp({ modelValue: '08:00' })
    await typeAndBlur(w, '25:00')
    expect(w.props('modelValue')).toBe('08:00')
    expect((input(w).element as HTMLInputElement).value).toBe('08:00')
    await typeAndBlur(w, 'abc')
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('超出 min / max 還原', async () => {
    const w = mountTp({ modelValue: '09:00', min: '08:00', max: '18:00' })
    await typeAndBlur(w, '19:00')
    expect(w.props('modelValue')).toBe('09:00')
  })

  it('清空 → null；Enter 也會提交', async () => {
    const w = mountTp({ modelValue: '09:00' })
    await typeAndBlur(w, '')
    expect(w.props('modelValue')).toBeNull()
    await input(w).setValue('1015')
    await input(w).trigger('keydown', { key: 'Enter' })
    expect(w.props('modelValue')).toBe('10:15')
  })

  it('showSeconds', async () => {
    const w = mountTp({ showSeconds: true })
    await typeAndBlur(w, '93015')
    expect(w.props('modelValue')).toBe('09:30:15')
  })

  it('清除鈕有名稱', async () => {
    const w = mountTp({ modelValue: '09:00' })
    await w.find('button[aria-label="清除"]').trigger('click')
    expect(w.props('modelValue')).toBeNull()
  })
})

describe('ChptTimePicker：面板', () => {
  it('時 / 分兩個 listbox；已選的 aria-selected', async () => {
    const w = mountTp({ modelValue: '09:30' })
    await openPanel(w)
    expect(w.find('[role="dialog"]').attributes('aria-label')).toBe('選擇開線時間')
    expect(column(w, '時').findAll('[role="option"]')).toHaveLength(24)
    expect(column(w, '分').findAll('[role="option"]')).toHaveLength(60)
    expect(column(w, '秒').exists()).toBe(false)
    expect(option(w, '時', 9).attributes('aria-selected')).toBe('true')
    expect(option(w, '分', 30).attributes('aria-selected')).toBe('true')
  })

  it('點選立刻生效；沒有值時其他欄從 0 開始', async () => {
    const w = mountTp()
    await openPanel(w)
    await option(w, '分', 45).trigger('click')
    expect(w.props('modelValue')).toBe('00:45')
    await option(w, '時', 14).trigger('click')
    expect(w.props('modelValue')).toBe('14:45')
  })

  it('minuteStep', async () => {
    const w = mountTp({ minuteStep: 15 })
    await openPanel(w)
    expect(column(w, '分').findAll('[role="option"]').map((o) => o.text())).toEqual(['00', '15', '30', '45'])
  })

  it('min / max：範圍外的選項停用', async () => {
    const w = mountTp({ modelValue: '08:30', min: '08:15', max: '17:00' })
    await openPanel(w)
    expect(option(w, '時', 7).attributes('aria-disabled')).toBe('true')
    expect(option(w, '時', 8).attributes('aria-disabled')).toBeUndefined()
    expect(option(w, '時', 18).attributes('aria-disabled')).toBe('true')
    expect(option(w, '分', 10).attributes('aria-disabled')).toBe('true')
    expect(option(w, '分', 15).attributes('aria-disabled')).toBeUndefined()
  })

  it('鍵盤：↓ 從輸入框進到面板；↑↓ 改值、← → 換欄、Enter 關閉並回到輸入框', async () => {
    const w = mountTp({ modelValue: '09:30' })
    ;(input(w).element as HTMLInputElement).focus()
    await input(w).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(option(w, '時', 9).element)
    await pressOn(option(w, '時', 9), 'ArrowDown')
    expect(w.props('modelValue')).toBe('10:30')
    expect(document.activeElement).toBe(option(w, '時', 10).element)
    await pressOn(option(w, '時', 10), 'ArrowRight')
    expect(document.activeElement).toBe(option(w, '分', 30).element)
    await pressOn(option(w, '分', 30), 'ArrowUp')
    expect(w.props('modelValue')).toBe('10:29')
    await pressOn(option(w, '分', 29), 'End')
    expect(w.props('modelValue')).toBe('10:59')
    await pressOn(option(w, '分', 59), 'Enter')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(input(w).element)
  })

  it('↑ 在第一個時循環到最後一個（略過停用）', async () => {
    const w = mountTp({ modelValue: '08:00', max: '20:59' })
    await openPanel(w)
    ;(option(w, '時', 8).element as HTMLElement).focus()
    await pressOn(option(w, '時', 8), 'Home')
    expect(w.props('modelValue')).toBe('00:00')
    await pressOn(option(w, '時', 0), 'ArrowUp')
    expect(w.props('modelValue')).toBe('20:00')
  })

  it('Escape 關閉並歸還焦點', async () => {
    const w = mountTp({ modelValue: '09:30' })
    await openPanel(w)
    await pressOn(option(w, '時', 9), 'Escape')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(input(w).element)
  })

  it('「現在」按鈕', async () => {
    const w = mountTp()
    await openPanel(w)
    await w.findAll('button').find((b) => b.text() === '現在')!.trigger('click')
    expect(w.props('modelValue')).toMatch(/^\d{2}:\d{2}$/)
  })

  it('errorText → aria-invalid', () => {
    const w = mountTp({ errorText: '必填' })
    expect(input(w).attributes('aria-invalid')).toBe('true')
    expect(w.find(`#${input(w).attributes('aria-describedby')}`).text()).toBe('必填')
  })
})
