import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ChptCommandPalette, { type CommandItem } from '@/components/library/ui/ChptCommandPalette.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

let wrapper: VueWrapper | null = null
beforeEach(() => {
  localStorage.clear()
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32')
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  localStorage.clear()
})

const performed: string[] = []
const commands = (): CommandItem[] => [
  { id: 'wo', label: '工單查詢', group: '生產', keywords: ['gongdan'], icon: 'search', to: '/wo' },
  { id: 'spc', label: 'SPC 管制圖', group: '品質', description: '各站管制圖', to: '/spc' },
  { id: 'off', label: '停用的指令', group: '品質', disabled: true },
  { id: 'dark', label: '切換深色模式', group: '偏好', shortcut: 'mod+shift+d', perform: () => void performed.push('dark') },
]

async function mountPalette(props: Record<string, unknown> = {}, router?: ReturnType<typeof createRouter>) {
  const open = ref(true)
  wrapper = mount(
    {
      render: () =>
        h(ChptCommandPalette, {
          modelValue: open.value,
          'onUpdate:modelValue': (v: boolean) => (open.value = v),
          commands: commands(),
          ...props,
        }),
    },
    { attachTo: document.body, global: router ? { plugins: [router] } : {} }
  )
  await nextTick()
  await nextTick()
  return { w: wrapper, open }
}

const input = () => document.querySelector<HTMLInputElement>('input[role="combobox"]')!
const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')]
const labels = () => options().map((o) => o.querySelector('span span')!.textContent!.trim())
const headers = () => [...document.querySelectorAll('[role="listbox"] > li[role="presentation"]')].map((l) => l.textContent!.trim())
const activeLabel = () => document.getElementById(input().getAttribute('aria-activedescendant')!)?.querySelector('span span')?.textContent?.trim()
const key = async (k: string) => {
  input().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
  await nextTick()
}
async function type(text: string) {
  input().value = text
  input().dispatchEvent(new Event('input'))
  await nextTick()
}

describe('ChptCommandPalette', () => {
  it('開啟時聚焦搜尋框；沒輸入時依群組列出；第一個可用的指令是目前項目', async () => {
    await mountPalette()
    expect(document.querySelector('[role="dialog"]')!.getAttribute('aria-label')).toBe('指令面板')
    expect(document.activeElement).toBe(input())
    expect(headers()).toEqual(['生產', '品質', '偏好'])
    expect(labels()).toEqual(['工單查詢', 'SPC 管制圖', '停用的指令', '切換深色模式'])
    expect(activeLabel()).toBe('工單查詢')
    expect(options()[0].getAttribute('aria-selected')).toBe('true')
    // 快捷鍵顯示
    expect(options()[3].textContent).toContain('Ctrl')
  })

  it('搜尋：依分數排序、標出符合的字、右側顯示群組、念出結果數', async () => {
    await mountPalette()
    await type('gd')
    expect(labels()).toEqual(['工單查詢'])
    await type('管制')
    expect(labels()).toEqual(['SPC 管制圖'])
    expect(options()[0].querySelector('mark')!.textContent).toBe('管制')
    expect(options()[0].textContent).toContain('品質')
    expect(document.querySelector('[aria-live="polite"]')!.textContent).toBe('1 個結果')
    await type('zzz')
    expect(options()).toHaveLength(0)
    expect(document.body.textContent).toContain('找不到符合的指令')
  })

  it('方向鍵移動（跳過停用的、頭尾循環）、Enter 執行 perform 並關閉、送出 select', async () => {
    performed.length = 0
    const { w, open } = await mountPalette()
    await key('ArrowDown')
    expect(activeLabel()).toBe('SPC 管制圖')
    await key('ArrowDown') // 跳過停用的
    expect(activeLabel()).toBe('切換深色模式')
    await key('ArrowDown') // 循環到第一個
    expect(activeLabel()).toBe('工單查詢')
    await key('ArrowUp')
    expect(activeLabel()).toBe('切換深色模式')
    await key('Home')
    expect(activeLabel()).toBe('工單查詢')
    await key('End')
    expect(activeLabel()).toBe('切換深色模式')
    await key('Enter')
    await flushPromises()
    expect(open.value).toBe(false)
    expect(performed).toEqual(['dark'])
    expect(w.findComponent(ChptCommandPalette).emitted('select')![0][0]).toMatchObject({ id: 'dark' })
  })

  it('滑鼠移過設為目前項目、點擊執行；停用的點了沒反應', async () => {
    const { w, open } = await mountPalette()
    options()[1].dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
    await nextTick()
    expect(activeLabel()).toBe('SPC 管制圖')
    options()[2].click()
    await nextTick()
    expect(open.value).toBe(true)
    expect(w.findComponent(ChptCommandPalette).emitted('select')).toBeUndefined()
  })

  it('to：有 vue-router 時切換頁面', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { render: () => null } }, { path: '/spc', component: { render: () => null } }] })
    await router.push('/')
    await mountPalette({}, router)
    await type('spc')
    await key('Enter')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/spc')
  })

  it('recentKey：記住最近使用的指令，下次開啟時列在最上面', async () => {
    const { open } = await mountPalette({ recentKey: 'mes' })
    await type('spc')
    await key('Enter')
    await flushPromises()
    expect(JSON.parse(localStorage.getItem('chpt-command:mes')!)).toEqual(['spc'])
    open.value = true
    await nextTick()
    await nextTick()
    expect(headers()[0]).toBe('最近使用')
    expect(labels()[0]).toBe('SPC 管制圖')
  })

  it('recentKey：壞掉的資料或 localStorage 丟錯時照常使用', async () => {
    localStorage.setItem('chpt-command:bad', '{oops')
    const { open } = await mountPalette({ recentKey: 'bad' })
    expect(headers()).not.toContain('最近使用')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    await key('Enter')
    await flushPromises()
    expect(open.value).toBe(false)
  })

  it('全域快捷鍵 mod+k 開關；hotkey=false 不綁；Escape 與點背景關閉', async () => {
    const { open } = await mountPalette()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    await nextTick()
    expect(open.value).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    await nextTick()
    expect(open.value).toBe(true)
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(open.value).toBe(false)
    open.value = true
    await nextTick()
    document.querySelector<HTMLElement>('.bg-black\\/40')!.click()
    await nextTick()
    expect(open.value).toBe(false)
    wrapper!.unmount()
    wrapper = null
    const second = await mountPalette({ hotkey: false })
    second.open.value = false
    await nextTick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    await nextTick()
    expect(second.open.value).toBe(false)
  })

  it('maxResults、IME 組字中不處理按鍵', async () => {
    await mountPalette({ maxResults: 1 })
    await type('品質')
    expect(options()).toHaveLength(1)
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', isComposing: true, bubbles: true }))
    await nextTick()
    expect(activeLabel()).toBe('SPC 管制圖')
  })

  it('ref open / close / toggle', async () => {
    const r = ref<{ open: () => void; close: () => void; toggle: () => void } | null>(null)
    const open = ref(false)
    wrapper = mount(
      { render: () => h(ChptCommandPalette, { ref: r, modelValue: open.value, 'onUpdate:modelValue': (v: boolean) => (open.value = v), commands: commands(), hotkey: false }) },
      { attachTo: document.body }
    )
    r.value!.open()
    expect(open.value).toBe(true)
    await nextTick()
    r.value!.toggle()
    expect(open.value).toBe(false)
    r.value!.open()
    await nextTick()
    r.value!.close()
    expect(open.value).toBe(false)
  })

  it('語系：enUS', async () => {
    wrapper = mount(
      { render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptCommandPalette, { modelValue: true, commands: commands() })) },
      { attachTo: document.body }
    )
    await nextTick()
    expect(input().placeholder).toBe('Search commands or pages…')
    await type('spc')
    expect(document.querySelector('[aria-live="polite"]')!.textContent).toBe('1 result')
  })
})
