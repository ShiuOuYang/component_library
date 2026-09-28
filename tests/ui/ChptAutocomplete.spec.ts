import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptAutocomplete from '@/components/library/ui/ChptAutocomplete.vue'

const options = ['Apple', 'Banana', 'Cherry', { value: 'grape', label: 'Grape', description: '葡萄' }, { value: 'x', label: 'Xigua', disabled: true }]

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
})

function mountAc(props: Record<string, unknown> = {}) {
  const w = mount(ChptAutocomplete, {
    props: {
      label: '水果',
      options,
      ...props,
      'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
    },
    attachTo: document.body,
  })
  wrapper = w
  return w
}

const input = (w: ReturnType<typeof mount>) => w.find('input')
const optionLabels = (w: ReturnType<typeof mount>) => w.findAll('[role="option"]').map((o) => o.find('.truncate').text())
const key = async (w: ReturnType<typeof mount>, k: string, extra: Record<string, unknown> = {}) => {
  await input(w).trigger('keydown', { key: k, ...extra })
  await nextTick()
}
const type = async (w: ReturnType<typeof mount>, text: string) => {
  await input(w).setValue(text)
  await nextTick()
  await Promise.resolve()
}

describe('ChptAutocomplete：combobox ARIA', () => {
  it('input 是 combobox，指向 listbox；標籤點得到', () => {
    const w = mountAc()
    const el = input(w)
    expect(el.attributes('role')).toBe('combobox')
    expect(el.attributes('aria-autocomplete')).toBe('list')
    expect(el.attributes('aria-expanded')).toBe('false')
    const listId = el.attributes('aria-controls')!
    expect(w.find(`#${listId}`).attributes('role')).toBe('listbox')
    expect(w.find('label').attributes('for')).toBe(el.attributes('id'))
  })

  it('聚焦就列出建議（openOnFocus）', async () => {
    const w = mountAc()
    await input(w).trigger('focus')
    expect(input(w).attributes('aria-expanded')).toBe('true')
    expect(optionLabels(w)).toEqual(['Apple', 'Banana', 'Cherry', 'Grape', 'Xigua'])
  })

  it('打字過濾（不分大小寫、包含），並標出符合的字', async () => {
    const w = mountAc()
    await type(w, 'AN')
    expect(optionLabels(w)).toEqual(['Banana'])
    expect(w.find('mark').text()).toBe('an')
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['AN'])
  })

  it('↓ ↑ 以 aria-activedescendant 移動（略過停用、頭尾循環）', async () => {
    const w = mountAc({ modelValue: '' })
    await input(w).trigger('focus')
    await key(w, 'ArrowDown')
    const active = () => w.find(`#${input(w).attributes('aria-activedescendant')}`)
    expect(active().text()).toContain('Apple')
    expect(active().attributes('aria-selected')).toBe('true')
    await key(w, 'ArrowUp')
    expect(active().text()).toContain('Grape') // 從第一個往上：跳過停用的 Xigua
    await key(w, 'ArrowDown')
    expect(active().text()).toContain('Apple')
  })

  it('Enter 選取目前項目，值變成它的 value，並送出 select', async () => {
    const w = mountAc()
    await type(w, 'gr')
    await key(w, 'ArrowDown')
    await key(w, 'Enter')
    expect(w.props('modelValue')).toBe('grape')
    expect(w.emitted('select')?.[0][0]).toMatchObject({ value: 'grape' })
    expect(input(w).attributes('aria-expanded')).toBe('false')
  })

  it('沒有目前項目時 Enter 不攔截（表單照常送出）', async () => {
    const w = mountAc()
    await type(w, 'zz')
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    input(w).element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('點選項選取；停用的點不下去', async () => {
    const w = mountAc()
    await input(w).trigger('focus')
    await w.findAll('[role="option"]')[4].trigger('click')
    expect(w.emitted('select')).toBeUndefined()
    await w.findAll('[role="option"]')[1].trigger('click')
    expect(w.props('modelValue')).toBe('Banana')
  })

  it('Escape：開著時關閉；關著且 clearable 時清空', async () => {
    const w = mountAc({ clearable: true, modelValue: 'Ap' })
    await input(w).trigger('focus')
    await key(w, 'Escape')
    expect(input(w).attributes('aria-expanded')).toBe('false')
    expect(w.props('modelValue')).toBe('Ap')
    await key(w, 'Escape')
    expect(w.props('modelValue')).toBe('')
  })

  it('Alt+↓ 只打開不移動', async () => {
    const w = mountAc({ openOnFocus: false })
    await key(w, 'ArrowDown', { altKey: true })
    expect(input(w).attributes('aria-expanded')).toBe('true')
    expect(input(w).attributes('aria-activedescendant')).toBeUndefined()
  })

  it('沒有符合時顯示提示；live region 報讀數量', async () => {
    const w = mountAc()
    await type(w, 'zzz')
    expect(w.text()).toContain('沒有符合的建議')
    await type(w, 'a')
    expect(w.find('[aria-live="polite"]').text()).toMatch(/有 \d+ 個建議/)
  })

  it('清除鈕有名稱', async () => {
    const w = mountAc({ clearable: true, modelValue: 'x' })
    const btn = w.find('button[aria-label="清除"]')
    await btn.trigger('click')
    expect(w.props('modelValue')).toBe('')
  })

  it('autoHighlight：第一筆自動成為目前項目', async () => {
    const w = mountAc({ autoHighlight: true })
    await type(w, 'ch')
    await new Promise((r) => setTimeout(r, 0))
    await key(w, 'Enter')
    expect(w.props('modelValue')).toBe('Cherry')
  })
})

describe('ChptAutocomplete：非同步建議', () => {
  it('debounce 後查詢，只採用最後一次的結果', async () => {
    vi.useFakeTimers()
    const calls: string[] = []
    const fetchSuggestions = vi.fn((q: string) => {
      calls.push(q)
      const delay = q === 'a' ? 300 : 10 // 先打的比較慢回來
      return new Promise<string[]>((resolve) => setTimeout(() => resolve([`${q}-1`, `${q}-2`]), delay))
    })
    const w = mountAc({ fetchSuggestions, openOnFocus: false, debounce: 100 })
    await input(w).setValue('a')
    vi.advanceTimersByTime(100) // 'a' 送出
    await input(w).setValue('ab')
    vi.advanceTimersByTime(50)
    expect(calls).toEqual(['a'])
    vi.advanceTimersByTime(60) // 'ab' 送出
    expect(calls).toEqual(['a', 'ab'])
    await vi.advanceTimersByTimeAsync(400)
    await nextTick()
    expect(optionLabels(w)).toEqual(['ab-1', 'ab-2'])
  })

  it('載入中顯示提示並帶 aria-busy', async () => {
    let resolve!: (v: string[]) => void
    const w = mountAc({ fetchSuggestions: () => new Promise<string[]>((r) => (resolve = r)), debounce: 0 })
    await input(w).trigger('focus')
    expect(w.find('[role="listbox"]').attributes('aria-busy')).toBe('true')
    expect(w.text()).toContain('載入中')
    resolve(['one'])
    await new Promise((r) => setTimeout(r, 0))
    expect(optionLabels(w)).toEqual(['one'])
  })

  it('查詢失敗時清單為空，不會卡在載入中', async () => {
    const w = mountAc({ fetchSuggestions: () => Promise.reject(new Error('x')), debounce: 0, modelValue: 'q' })
    await input(w).trigger('focus')
    await new Promise((r) => setTimeout(r, 0))
    expect(w.text()).not.toContain('載入中')
    expect(w.text()).toContain('沒有符合的建議')
  })
})

describe('ChptAutocomplete：表單', () => {
  it('errorText → 紅框、aria-invalid、aria-describedby', () => {
    const w = mountAc({ errorText: '必填' })
    expect(input(w).attributes('aria-invalid')).toBe('true')
    expect(w.find(`#${input(w).attributes('aria-describedby')}`).text()).toBe('必填')
    expect(input(w).classes()).toContain('border-danger')
  })
})
