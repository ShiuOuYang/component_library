import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptMentionInput from '@/components/library/ui/ChptMentionInput.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { MentionOption } from '@/components/library/shared/mention'

const people: MentionOption[] = [
  { id: 'u01', label: '王小明', description: '領班' },
  { id: 'u02', label: '王大同' },
  { id: 'u03', label: '林志豪', description: '設備課' },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
})

function mountIt(props: Record<string, unknown> = {}, opts: { value?: string; wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>; slots?: Record<string, unknown> } = {}) {
  const value = ref(opts.value ?? '')
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  const node = () =>
    h(
      ChptMentionInput,
      {
        triggers: [{ char: '@', options: people, label: '人員' }],
        ...props,
        modelValue: value.value,
        'onUpdate:modelValue': (v: string) => (rec('value')(v), (value.value = v)),
        onChange: rec('change'),
        onSelect: rec('select'),
        onMentionAdd: rec('add'),
        onMentionRemove: rec('remove'),
        onSubmit: rec('submit'),
      },
      opts.slots
    )
  const w = mount({ render: () => (opts.wrap ? opts.wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const ta = () => w.find('textarea')
  const el = () => ta().element as HTMLTextAreaElement
  /** 把輸入框改成 text，游標放在 caret（預設最後） */
  const type = async (text: string, caret = text.length) => {
    el().value = text
    el().setSelectionRange(caret, caret)
    await ta().trigger('input')
  }
  const listbox = () => w.find('[role="listbox"]')
  const isOpen = () => (listbox().element as HTMLElement).style.display !== 'none'
  const opts2 = () => w.findAll('[role="option"]').map((o) => o.text().replace(/\s+/g, ' ').trim())
  const key = (k: string, extra: Record<string, unknown> = {}) => ta().trigger('keydown', { key: k, ...extra })
  return { w, value, emitted, ta, el, type, listbox, isOpen, opts: opts2, key }
}

describe('ChptMentionInput', () => {
  it('顯示純文字、標記層的提及、計數與提示', () => {
    const { w, el } = mountIt({ maxLength: 50, triggers: [{ char: '@', options: people }, { char: '#', options: [], color: 'warning' }] }, { value: '請 @[王小明](u01) 看 #[WO-1](wo-1)' })
    expect(el().value).toBe('請 @王小明 看 #WO-1')
    const chips = w.findAll('[data-mention]')
    expect(chips.map((c) => c.text())).toEqual(['@王小明', '#WO-1'])
    expect(chips[0].attributes('style')).toContain('accent-subtle')
    expect(chips[1].attributes('style')).toContain('warning-subtle')
    expect(w.find('[data-counter]').text()).toBe('14 / 50')
    expect(w.text()).toContain('輸入 @ # 提及')
    expect(w.find('textarea').attributes('role')).toBe('combobox')
    expect(w.find('textarea').attributes('aria-expanded')).toBe('false')
  })

  it('輸入 @ 列出候選、過濾、↑↓ 循環、Enter 選取：插入提及並補空白', async () => {
    const { w, value, emitted, el, type, isOpen, opts, key, ta } = mountIt()
    await type('請 @')
    expect(isOpen()).toBe(true)
    expect(opts()).toEqual(['王王小明領班', '王王大同', '林林志豪設備課'])
    expect(ta().attributes('aria-activedescendant')).toMatch(/-opt-0$/)
    await type('請 @王')
    expect(opts()).toHaveLength(2)
    expect(w.find('[aria-live="polite"]').text()).toBe('2 個建議，上下方向鍵選擇，Enter 確定')
    await key('ArrowDown')
    expect(w.findAll('[role="option"]')[1].attributes('aria-selected')).toBe('true')
    await key('ArrowDown')
    expect(w.findAll('[role="option"]')[0].attributes('aria-selected')).toBe('true')
    await key('ArrowUp')
    await key('Enter')
    await nextTick()
    expect(value.value).toBe('請 @[王大同](u02) ')
    expect(emitted.select).toEqual([{ trigger: '@', option: people[1] }])
    expect((emitted.add[0] as { id: string }[])[0].id).toBe('u02')
    expect(el().value).toBe('請 @王大同 ')
    expect(el().selectionStart).toBe(7)
    expect(isOpen()).toBe(false)
    expect(w.find('[aria-live="polite"]').text()).toBe('已加入 王大同')
    expect((emitted.change.at(-1) as { text: string; mentions: unknown[] }).mentions).toHaveLength(1)
  })

  it('Tab 選取、點選候選、Esc 關閉後同一個位置不再打開、找不到', async () => {
    const { w, value, type, isOpen, key, opts } = mountIt()
    await type('@林')
    await key('Tab')
    expect(value.value).toBe('@[林志豪](u03) ')
    await type('@林志豪 @')
    await w.findAll('[role="option"]')[2].trigger('mouseenter')
    await w.findAll('[role="option"]')[2].trigger('mousedown')
    expect(value.value).toBe('@[林志豪](u03) @[林志豪](u03) ')
    await type('@林志豪 @林志豪 @x')
    expect(opts()).toEqual([])
    expect(w.find('[role="listbox"]').text()).toBe('找不到「x」')
    await key('Enter') // 沒有候選：不做事
    await key('Escape')
    expect(isOpen()).toBe(false)
    await type('@林志豪 @林志豪 @xy')
    expect(isOpen()).toBe(false)
    // 換個位置就會再打開
    await type('@林志豪 @林志豪 @xy @')
    expect(isOpen()).toBe(true)
    // 失焦收起
    await w.find('textarea').trigger('blur')
    expect(isOpen()).toBe(false)
  })

  it('非同步搜尋：載入中、過期結果丟掉、錯誤時沒有結果', async () => {
    vi.useFakeTimers()
    const search = vi.fn((q: string) => new Promise<MentionOption[]>((resolve, reject) => (q === 'err' ? reject(new Error('x')) : resolve([{ id: q, label: `WO-${q}` }]))))
    const { w, type, opts } = mountIt({ triggers: [{ char: '#', search }] })
    await type('#1')
    expect(w.find('[role="listbox"]').text()).toBe('搜尋中…')
    await type('#12')
    await vi.advanceTimersByTimeAsync(150)
    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenLastCalledWith('12')
    expect(opts()).toEqual(['WWO-12'])
    await type('#err')
    await vi.advanceTimersByTimeAsync(150)
    expect(opts()).toEqual([])
    expect(w.find('[role="listbox"]').text()).toContain('找不到')
    // 舊的請求晚回來：丟掉
    let resolveOld: (v: MentionOption[]) => void = () => {}
    search.mockImplementationOnce(() => new Promise((r) => (resolveOld = r)))
    await type('#a')
    await vi.advanceTimersByTimeAsync(150)
    await type('#ab')
    await vi.advanceTimersByTimeAsync(150)
    resolveOld([{ id: 'old', label: 'OLD' }])
    await vi.advanceTimersByTimeAsync(0)
    expect(opts()).toEqual(['WWO-ab'])
  })

  it('刪到提及時整個刪除、游標放在刪除處；在提及中間打字變回文字', async () => {
    const { value, emitted, el, type } = mountIt({}, { value: '找 @[王小明](u01) 幫忙' })
    // Backspace 刪掉「明」
    await type('找 @王小 幫忙', 6)
    expect(value.value).toBe('找  幫忙')
    expect(el().value).toBe('找  幫忙')
    expect(el().selectionStart).toBe(2)
    expect((emitted.remove[0] as { id: string }[])[0].id).toBe('u01')
    value.value = '找 @[王小明](u01) 幫忙'
    await nextTick()
    expect(el().value).toBe('找 @王小明 幫忙')
    await type('找 @王x小明 幫忙', 5)
    expect(value.value).toBe('找 @王x小明 幫忙')
  })

  it('輸入法組字中不送出、不開候選；組字結束才處理', async () => {
    const { value, el, ta, isOpen } = mountIt()
    await ta().trigger('compositionstart')
    el().value = '@王'
    el().setSelectionRange(2, 2)
    await ta().trigger('input')
    expect(value.value).toBe('')
    expect(el().value).toBe('@王')
    expect(isOpen()).toBe(false)
    await ta().trigger('compositionend')
    expect(value.value).toBe('@王')
    expect(isOpen()).toBe(true)
    // 組字中刪到提及：結束後整個提及刪掉
    const b = mountIt({}, { value: '@[王小明](u01)' })
    await b.ta().trigger('compositionstart')
    b.el().value = '@王小'
    b.el().setSelectionRange(3, 3)
    await b.ta().trigger('input')
    expect(b.el().value).toBe('@王小')
    expect(b.value.value).toBe('@[王小明](u01)')
    await b.ta().trigger('compositionend')
    expect(b.value.value).toBe('')
    expect(b.el().value).toBe('')
  })

  it('Ctrl / ⌘ + Enter 送出；超過字數不送、標紅', async () => {
    const { emitted, key, type, ta, w } = mountIt({ maxLength: 5 }, { value: '@[王小明](u01)' })
    await key('Enter', { ctrlKey: true })
    expect(emitted.submit).toEqual([{ value: '@[王小明](u01)', text: '@王小明', mentions: [expect.objectContaining({ id: 'u01' })] }])
    await type('@王小明 很好啊')
    expect(ta().attributes('aria-invalid')).toBe('true')
    expect(w.find('[data-counter]').classes()).toContain('text-danger')
    await key('Enter', { metaKey: true })
    expect(emitted.submit).toHaveLength(1)
    await key('Enter') // 一般 Enter 換行
    expect(emitted.submit).toHaveLength(1)
  })

  it('游標移動才偵測、選取範圍時不開、停用與唯讀不開；方法', async () => {
    const { w, el, ta, isOpen, value } = mountIt({}, { value: '@[王小明](u01) @王' })
    el().setSelectionRange(9, 9)
    await ta().trigger('click')
    expect(isOpen()).toBe(true)
    await ta().trigger('keyup', { key: 'ArrowDown' }) // 開著時方向鍵不重算
    el().setSelectionRange(0, 3)
    await ta().trigger('keyup', { key: 'ArrowLeft' })
    expect(isOpen()).toBe(false)
    const vm = w.findComponent(ChptMentionInput).vm as unknown as { focus: () => void; clear: () => void; insertTrigger: (c?: string) => void; text: string; mentions: unknown[] }
    expect(vm.text).toBe('@王小明 @王')
    expect(vm.mentions).toHaveLength(1)
    vm.focus()
    expect(document.activeElement).toBe(el())
    vm.clear()
    await nextTick()
    expect(value.value).toBe('')
    el().setSelectionRange(0, 0)
    vm.insertTrigger()
    await nextTick()
    await nextTick()
    expect(value.value).toBe('@')
    expect(isOpen()).toBe(true)
    value.value = 'abc'
    await nextTick()
    el().setSelectionRange(3, 3)
    vm.insertTrigger('@')
    await nextTick()
    expect(value.value).toBe('abc @')
    const off = mountIt({ disabled: true })
    await off.type('@')
    expect(off.isOpen()).toBe(false)
    ;(off.w.findComponent(ChptMentionInput).vm as unknown as { insertTrigger: () => void }).insertTrigger()
    await off.key('Enter', { ctrlKey: true })
    expect(off.emitted.submit).toBeUndefined()
    const ro = mountIt({ readonly: true })
    await ro.type('@')
    expect(ro.isOpen()).toBe(false)
  })

  it('自訂候選、英文語系', async () => {
    const { w, type } = mountIt({}, { slots: { option: ({ option, active }: { option: MentionOption; active: boolean }) => h('b', `${option.label}${active ? '*' : ''}`) } })
    await type('@')
    expect(w.findAll('[role="option"] b').map((b) => b.text())).toEqual(['王小明*', '王大同', '林志豪'])
    const en = mountIt({}, { wrap: (n) => h(ChptConfigProvider, { locale: enUS }, () => n) })
    await en.type('@z')
    expect(en.listbox().text()).toBe('No match for "z"')
    await en.type('@王')
    expect(en.w.find('[aria-live="polite"]').text()).toBe('2 suggestions, use Up / Down to choose and Enter to confirm')
  })
})
