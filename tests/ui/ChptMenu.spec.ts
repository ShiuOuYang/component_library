import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import ChptMenu from '@/components/library/ui/ChptMenu.vue'
import type { MenuItem } from '@/components/library/ui/chptMenuContext'

const items: MenuItem[] = [
  { key: 'home', label: '總覽', icon: 'dashboard', to: '/' },
  {
    key: 'prod',
    label: '生產',
    icon: 'factory',
    children: [
      { key: 'orders', label: '工單', to: '/orders', badge: 3 },
      { key: 'lines', label: '產線', children: [{ key: 'smt', label: 'SMT', to: '/lines/smt' }, { key: 'aoi', label: 'AOI', to: '/lines/aoi' }] },
    ],
  },
  { key: 'd1', type: 'divider' },
  {
    key: 'g-sys',
    type: 'group',
    label: '系統',
    children: [
      { key: 'users', label: '使用者', icon: 'group', to: '/users' },
      { key: 'locked', label: '稽核（無權限）', icon: 'lock', disabled: true },
      { key: 'docs', label: '說明文件', icon: 'help', href: 'https://example.com/docs', target: '_blank' },
    ],
  },
]

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountMenu(props: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
  const w = mount(ChptMenu, {
    props: {
      items,
      ...props,
      'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
    },
    attachTo: document.body,
    ...options,
  })
  wrapper = w
  return w
}

type W = ReturnType<typeof mount>
/** 依項目文字找連結 / 按鈕（圖示是 Material Symbols 連字，textContent 會含圖示名稱，所以比對的是文字那個 span） */
const byText = (w: W, text: string) =>
  w.findAll('a, button').find((el) => el.findAll('span').some((s) => s.text() === text && !s.classes('material-symbols-outlined')))!
const subOf = (w: W, text: string) => w.find(`#${byText(w, text).attributes('aria-controls')}`)

describe('ChptMenu：結構與無障礙', () => {
  it('<nav aria-label>，不是 role=menu', () => {
    const w = mountMenu()
    expect(w.element.tagName).toBe('NAV')
    expect(w.attributes('aria-label')).toBe('主選單')
    expect(w.find('[role="menu"]').exists()).toBe(false)
    expect(w.find('[role="menuitem"]').exists()).toBe(false)
  })

  it('子選單是 disclosure 按鈕：aria-expanded / aria-controls', async () => {
    const w = mountMenu()
    const prod = byText(w, '生產')
    expect(prod.element.tagName).toBe('BUTTON')
    expect(prod.attributes('aria-expanded')).toBe('false')
    expect((subOf(w, '生產').element as HTMLElement).style.display).toBe('none')
    await prod.trigger('click')
    expect(prod.attributes('aria-expanded')).toBe('true')
    expect((subOf(w, '生產').element as HTMLElement).style.display).toBe('')
    expect(w.emitted('update:openKeys')?.at(-1)).toEqual([['prod']])
  })

  it('有網址的項目是真正的 <a href>；外部連結帶 rel', () => {
    const w = mountMenu()
    const docs = byText(w, '說明文件')
    expect(docs.element.tagName).toBe('A')
    expect(docs.attributes('href')).toBe('https://example.com/docs')
    expect(docs.attributes('rel')).toBe('noopener noreferrer')
  })

  /**
   * 分隔線是裝飾：<ul> 的子元素只能是 listitem，原本的 <li role="separator"> 讓清單結構不合法（axe：list）。
   * 改成 aria-hidden 的 <li>，螢幕閱讀器的項目數也不會多算一個。
   */
  it('分組以標題命名；分隔線對輔助技術隱藏且不破壞清單結構', () => {
    const w = mountMenu()
    const groupList = w.findAll('ul').find((ul) => ul.attributes('aria-labelledby'))!
    expect(w.find(`#${groupList.attributes('aria-labelledby')}`).text()).toBe('系統')
    expect(w.find('[role="separator"]').exists()).toBe(false)
    const divider = w.find('li[aria-hidden="true"]')
    expect(divider.exists()).toBe(true)
    expect(divider.element.parentElement?.tagName).toBe('UL')
  })

  it('停用項目不可點', async () => {
    const w = mountMenu()
    const locked = byText(w, '稽核（無權限）')
    expect(locked.attributes('disabled')).toBeDefined()
    await locked.trigger('click')
    expect(w.emitted('select')).toBeUndefined()
  })

  it('徽章', async () => {
    const w = mountMenu({ openKeys: ['prod'] })
    expect(w.text()).toContain('工單')
    expect(w.findAll('span').some((s) => s.text() === '3')).toBe(true)
  })
})

describe('ChptMenu：作用中項目', () => {
  it('v-model：aria-current=page；祖先自動展開並標示', async () => {
    const w = mountMenu({ modelValue: 'smt' })
    await nextTick()
    const smt = byText(w, 'SMT')
    expect(smt.attributes('aria-current')).toBe('page')
    expect(byText(w, '生產').attributes('aria-expanded')).toBe('true')
    expect(byText(w, '產線').attributes('aria-expanded')).toBe('true')
    expect(byText(w, '生產').classes()).toContain('!text-accent')
  })

  it('點項目送出 update:modelValue 與 select', async () => {
    const w = mountMenu({ modelValue: 'home' })
    await byText(w, '使用者').trigger('click')
    expect(w.props('modelValue')).toBe('users')
    expect(w.emitted('select')?.[0][0]).toMatchObject({ key: 'users' })
  })

  it('沒有 v-model 時依路由比對（取最長前綴）', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div/>' } }] })
    router.push('/lines/aoi/detail/7')
    await router.isReady()
    const w = mount(ChptMenu, { props: { items }, global: { plugins: [router] }, attachTo: document.body })
    wrapper = w
    await nextTick()
    expect(byText(w, 'AOI').attributes('aria-current')).toBe('page')
    expect(byText(w, '總覽').attributes('aria-current')).toBeUndefined() // '/' 不是所有路徑的前綴
  })

  it('有 router 時點站內連結交給 router.push', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div/>' } }] })
    router.push('/')
    await router.isReady()
    const w = mount(ChptMenu, { props: { items, openKeys: ['prod'] }, global: { plugins: [router] }, attachTo: document.body })
    wrapper = w
    await byText(w, '工單').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(router.currentRoute.value.path).toBe('/orders')
    expect(byText(w, '工單').attributes('href')).toBe('/orders')
  })
})

describe('ChptMenu：內嵌展開', () => {
  it('accordion：同一層只開一個', async () => {
    const two: MenuItem[] = [
      { key: 'a', label: 'A', children: [{ key: 'a1', label: 'A1' }] },
      { key: 'b', label: 'B', children: [{ key: 'b1', label: 'B1' }] },
    ]
    const w = mountMenu({ items: two, accordion: true })
    await byText(w, 'A').trigger('click')
    await byText(w, 'B').trigger('click')
    expect(byText(w, 'A').attributes('aria-expanded')).toBe('false')
    expect(byText(w, 'B').attributes('aria-expanded')).toBe('true')
  })

  it('收起父層時連同子層一起收', async () => {
    const w = mountMenu({ modelValue: 'smt' })
    await nextTick()
    await byText(w, '生產').trigger('click')
    expect(w.emitted('update:openKeys')?.at(-1)).toEqual([[]])
  })
})

describe('ChptMenu：浮出模式（水平 / 收合）', () => {
  it('收合：頂層文字保留給螢幕閱讀器，並有 title', () => {
    const w = mountMenu({ collapsed: true })
    const home = byText(w, '總覽')
    expect(home.find('.sr-only').text()).toBe('總覽')
    expect(home.attributes('title')).toBe('總覽')
    expect(w.classes()).toContain('w-16')
  })

  it('水平：點開子選單是浮出面板；同時只開一條；選了就關', async () => {
    const w = mountMenu({ mode: 'horizontal' })
    await byText(w, '生產').trigger('click')
    const panel = subOf(w, '生產')
    expect(panel.classes()).toContain('absolute')
    expect(panel.isVisible()).toBe(true)
    await byText(w, '產線').trigger('click')
    expect(byText(w, '產線').attributes('aria-expanded')).toBe('true')
    await byText(w, 'SMT').trigger('click')
    expect(byText(w, '生產').attributes('aria-expanded')).toBe('false')
    expect(w.props('modelValue')).toBe('smt')
  })

  it('Escape 關掉最內層的子選單並把焦點還給它的按鈕', async () => {
    const w = mountMenu({ mode: 'horizontal' })
    await byText(w, '生產').trigger('click')
    await byText(w, '產線').trigger('click')
    ;(byText(w, 'SMT').element as HTMLElement).focus()
    await byText(w, 'SMT').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(byText(w, '產線').attributes('aria-expanded')).toBe('false')
    expect(byText(w, '生產').attributes('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(byText(w, '產線').element)
    await byText(w, '產線').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(byText(w, '生產').attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(byText(w, '生產').element)
  })

  it('焦點離開選單時關閉浮出面板', async () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    const w = mountMenu({ mode: 'horizontal' })
    await byText(w, '生產').trigger('click')
    await byText(w, '生產').trigger('focusout', { relatedTarget: outside })
    expect(byText(w, '生產').attributes('aria-expanded')).toBe('false')
    outside.remove()
  })

  it('從收合切回展開時，浮出的子選單會關掉', async () => {
    const w = mountMenu({ collapsed: true })
    await byText(w, '生產').trigger('click')
    expect(byText(w, '生產').attributes('aria-expanded')).toBe('true')
    await w.setProps({ collapsed: false })
    expect(byText(w, '生產').attributes('aria-expanded')).toBe('false')
  })
})
