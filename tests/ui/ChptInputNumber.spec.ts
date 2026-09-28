import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChptInputNumber from '@/components/library/ui/ChptInputNumber.vue'

type Wrapper = ReturnType<typeof mount>

/** 模擬 v-model：每次 update:modelValue 都寫回 prop */
function mountModel(props: Record<string, unknown> = {}) {
  const wrapper: Wrapper = mount(ChptInputNumber, {
    props: {
      modelValue: 5,
      ...props,
      'onUpdate:modelValue': (v: number | null) => wrapper.setProps({ modelValue: v }),
    },
  })
  return wrapper
}

const input = (w: Wrapper) => w.find('input')
const value = (w: Wrapper) => (input(w).element as HTMLInputElement).value
const emitted = (w: Wrapper) => (w.emitted('update:modelValue') ?? []).map((e) => e[0])

describe('ChptInputNumber', () => {
  it('+ / − 按鈕依 step 增減', async () => {
    const w = mountModel({ step: 2 })
    await w.find('button[aria-label="增加"]').trigger('click')
    expect(value(w)).toBe('7')
    await w.find('button[aria-label="減少"]').trigger('click')
    await w.find('button[aria-label="減少"]').trigger('click')
    expect(value(w)).toBe('3')
  })

  it('到達上下限時按鈕停用，值不會超出範圍', async () => {
    const w = mountModel({ modelValue: 9, max: 10 })
    await w.find('button[aria-label="增加"]').trigger('click')
    expect(value(w)).toBe('10')
    expect(w.find('button[aria-label="增加"]').attributes('disabled')).toBeDefined()
  })

  /** 打字途中不夾限：min=10 時要能打出 15（打第一個「1」不能被改成 10） */
  it('打字時不驗證，離開欄位才夾到範圍內', async () => {
    const w = mountModel({ modelValue: 12, min: 10, max: 20 })
    await input(w).setValue('1')
    expect(value(w)).toBe('1')
    expect(emitted(w)).toEqual([])
    await input(w).setValue('15')
    await input(w).trigger('blur')
    expect(emitted(w)).toEqual([15])

    await input(w).setValue('99')
    await input(w).trigger('keydown', { key: 'Enter' })
    expect(value(w)).toBe('20')
  })

  it('打錯字時還原成原本的值', async () => {
    const w = mountModel({ modelValue: 7 })
    await input(w).setValue('abc')
    await input(w).trigger('blur')
    expect(value(w)).toBe('7')
    expect(emitted(w)).toEqual([])
  })

  it('清空是 null；接受千分位逗號', async () => {
    const w = mountModel({ modelValue: 7 })
    await input(w).setValue('')
    await input(w).trigger('blur')
    expect(emitted(w)).toEqual([null])
    await input(w).setValue('1,234')
    await input(w).trigger('blur')
    expect(value(w)).toBe('1234')
  })

  it('小數步進沒有浮點誤差', async () => {
    const w = mountModel({ modelValue: 0.1, step: 0.2 })
    await w.find('button[aria-label="增加"]').trigger('click')
    expect(value(w)).toBe('0.3')
  })

  it('precision 固定小數位數並四捨五入', async () => {
    const w = mountModel({ modelValue: 1, precision: 2 })
    expect(value(w)).toBe('1.00')
    await input(w).setValue('1.005')
    await input(w).trigger('blur')
    expect(value(w)).toBe('1.01')
  })

  it('鍵盤：↑↓ 一步、PageUp 十步、Home / End 到上下限', async () => {
    const w = mountModel({ modelValue: 5, min: 0, max: 100 })
    await input(w).trigger('keydown', { key: 'ArrowUp' })
    expect(value(w)).toBe('6')
    await input(w).trigger('keydown', { key: 'PageUp' })
    expect(value(w)).toBe('16')
    await input(w).trigger('keydown', { key: 'ArrowDown' })
    expect(value(w)).toBe('15')
    await input(w).trigger('keydown', { key: 'End' })
    expect(value(w)).toBe('100')
    await input(w).trigger('keydown', { key: 'Home' })
    expect(value(w)).toBe('0')
  })

  it('打到一半按 ↑ 以輸入框裡的值為準', async () => {
    const w = mountModel({ modelValue: 5 })
    await input(w).setValue('40')
    await input(w).trigger('keydown', { key: 'ArrowUp' })
    expect(value(w)).toBe('41')
  })

  it('Escape 放棄編輯中的文字', async () => {
    const w = mountModel({ modelValue: 5 })
    await input(w).setValue('40')
    await input(w).trigger('keydown', { key: 'Escape' })
    expect(value(w)).toBe('5')
  })

  it('沒有值時按 + 從 0 開始（或最接近的界限）', async () => {
    const w = mountModel({ modelValue: null, min: 3 })
    await w.find('button[aria-label="增加"]').trigger('click')
    expect(value(w)).toBe('3')
  })

  it('change 事件帶新值與舊值', async () => {
    const w = mountModel({ modelValue: 5 })
    await w.find('button[aria-label="增加"]').trigger('click')
    expect(w.emitted('change')?.[0]).toEqual([6, 5])
  })

  it('無障礙：spinbutton 帶目前值與上下限；按鈕不佔 Tab 停駐點', () => {
    const w = mountModel({ modelValue: 5, min: 0, max: 10, label: '數量' })
    const el = input(w)
    expect(el.attributes('role')).toBe('spinbutton')
    expect(el.attributes('aria-valuenow')).toBe('5')
    expect(el.attributes('aria-valuemin')).toBe('0')
    expect(el.attributes('aria-valuemax')).toBe('10')
    expect(w.find('label').attributes('for')).toBe(el.attributes('id'))
    for (const b of w.findAll('button')) {
      expect(b.attributes('type')).toBe('button')
      expect(b.attributes('tabindex')).toBe('-1')
    }
  })

  it('禁用與唯讀時不能增減', async () => {
    const w = mountModel({ modelValue: 5, disabled: true })
    await input(w).trigger('keydown', { key: 'ArrowUp' })
    expect(emitted(w)).toEqual([])
    const r = mountModel({ modelValue: 5, readonly: true })
    expect(r.find('button[aria-label="增加"]').attributes('disabled')).toBeDefined()
  })

  it('錯誤訊息以 aria-describedby 連到輸入框', () => {
    const w = mountModel({ errorText: '超出範圍' })
    const id = input(w).attributes('aria-describedby')
    expect(w.find(`#${id}`).text()).toBe('超出範圍')
    expect(input(w).attributes('aria-invalid')).toBe('true')
  })

  it('單位與隱藏按鈕', () => {
    const w = mountModel({ unit: '%', controls: false })
    expect(w.text()).toContain('%')
    expect(w.findAll('button')).toHaveLength(0)
  })
})
