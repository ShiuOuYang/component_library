import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptDropdown from '@/components/library/ui/ChptDropdown.vue'
import ChptResult from '@/components/library/ui/ChptResult.vue'

const items = [
  { key: 'edit', label: '編輯', icon: 'edit' },
  { key: 'copy', label: '複製' },
  { key: 'archive', label: '封存', disabled: true },
  { key: 'delete', label: '刪除', danger: true, divided: true },
]

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

async function mountDropdown(props: Record<string, unknown> = {}) {
  wrapper = mount(ChptDropdown, { props: { items, label: '更多', ...props }, attachTo: document.body })
  await nextTick()
  return wrapper
}

const trigger = (w: ReturnType<typeof mount>) => w.find('button[aria-haspopup="menu"]')
const active = () => document.activeElement?.textContent?.trim()

describe('ChptDropdown', () => {
  it('觸發鈕的 aria：haspopup、expanded、controls', async () => {
    const w = await mountDropdown()
    expect(trigger(w).attributes('aria-expanded')).toBe('false')
    await trigger(w).trigger('click')
    expect(trigger(w).attributes('aria-expanded')).toBe('true')
    const menu = w.find('[role="menu"]')
    expect(trigger(w).attributes('aria-controls')).toBe(menu.attributes('id'))
    expect(menu.attributes('aria-labelledby')).toBe(trigger(w).attributes('id'))
    expect(w.findAll('[role="menuitem"]')).toHaveLength(4)
    expect(w.findAll('[role="separator"]')).toHaveLength(1)
  })

  it('↓ 開啟並聚焦第一項；↑ 開啟並聚焦最後一項', async () => {
    const w = await mountDropdown()
    await trigger(w).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(active()).toContain('編輯')
    await w.find('[role="menu"]').trigger('keydown', { key: 'Escape' })
    await trigger(w).trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(active()).toContain('刪除')
  })

  it('↑ ↓ 移動會略過停用項並循環', async () => {
    const w = await mountDropdown()
    await trigger(w).trigger('keydown', { key: 'Enter' })
    await nextTick()
    const menu = w.find('[role="menu"]')
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(active()).toContain('複製')
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(active()).toContain('刪除') // 略過停用的「封存」
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(active()).toContain('編輯') // 循環
    await menu.trigger('keydown', { key: 'End' })
    expect(active()).toContain('刪除')
  })

  it('Enter 執行並關閉，焦點回到觸發鈕', async () => {
    const w = await mountDropdown()
    await trigger(w).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    await w.find('[role="menu"]').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('select')?.[0][0]).toMatchObject({ key: 'edit' })
    expect(w.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger(w).element)
  })

  it('Escape 關閉並把焦點還給觸發鈕', async () => {
    const w = await mountDropdown()
    await trigger(w).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    await w.find('[role="menu"]').trigger('keydown', { key: 'Escape' })
    expect(w.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger(w).element)
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('點停用項不會觸發 select', async () => {
    const w = await mountDropdown()
    await trigger(w).trigger('click')
    await w.findAll('[role="menuitem"]')[2].trigger('click')
    expect(w.emitted('select')).toBeUndefined()
    expect(w.findAll('[role="menuitem"]')[2].attributes('aria-disabled')).toBe('true')
  })

  it('打字跳到該字開頭的項目', async () => {
    const w = await mountDropdown({ items: [{ label: 'Apple' }, { label: 'Banana' }, { label: 'Cherry' }] })
    await trigger(w).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    await w.find('[role="menu"]').trigger('keydown', { key: 'c' })
    expect(active()).toBe('Cherry')
  })

  it('點外面關閉', async () => {
    const w = await mountDropdown()
    await trigger(w).trigger('click')
    // onClickOutside 會忽略同一個 macrotask 裡的第二次 click（真人不會點這麼快）
    await new Promise((r) => setTimeout(r, 0))
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(w.find('[role="menu"]').exists()).toBe(false)
  })

  it('Tab 關閉選單（焦點照常往下一個元素走）', async () => {
    const w = await mountDropdown()
    await trigger(w).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    await w.find('[role="menu"]').trigger('keydown', { key: 'Tab' })
    expect(w.find('[role="menu"]').exists()).toBe(false)
  })

  it('禁用時不會開啟', async () => {
    const w = await mountDropdown({ disabled: true })
    await trigger(w).trigger('keydown', { key: 'ArrowDown' })
    expect(w.find('[role="menu"]').exists()).toBe(false)
  })

  it('自訂觸發元素：插槽拿到 toggle 與 aria 屬性', async () => {
    wrapper = mount(ChptDropdown, {
      props: { items },
      slots: {
        trigger: `<template #trigger="{ toggle, attrs }"><button type="button" class="custom" v-bind="attrs" @click="toggle">⋯</button></template>`,
      },
      attachTo: document.body,
    })
    await wrapper.find('button.custom').trigger('click')
    expect(wrapper.find('button.custom').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
  })

  it('每顆按鈕都有 type="button"', async () => {
    const w = await mountDropdown()
    await trigger(w).trigger('click')
    for (const b of w.findAll('button')) expect(b.attributes('type')).toBe('button')
  })
})

describe('ChptResult', () => {
  it('狀態決定預設標題與 role', () => {
    const ok = mount(ChptResult, { props: { status: 'success' } })
    expect(ok.text()).toContain('操作成功')
    expect(ok.attributes('role')).toBe('status')
    const bad = mount(ChptResult, { props: { status: 'error', title: '匯入失敗', subTitle: '第 3 列格式錯誤' } })
    expect(bad.text()).toContain('匯入失敗')
    expect(bad.text()).toContain('第 3 列格式錯誤')
    expect(bad.attributes('role')).toBe('alert')
  })

  it('403 / 404 / 500 顯示代碼', () => {
    for (const code of ['403', '404', '500'] as const) {
      const w = mount(ChptResult, { props: { status: code } })
      expect(w.text()).toContain(code)
    }
  })

  it('extra 與預設插槽', () => {
    const w = mount(ChptResult, {
      props: { status: 'warning' },
      slots: { extra: '<button type="button">重試</button>', default: '<ul><li>原因一</li></ul>' },
    })
    expect(w.find('button').text()).toBe('重試')
    expect(w.find('li').text()).toBe('原因一')
  })

  /** 真實瀏覽器看到的：成功狀態下方多一個空的淡底方塊（插槽內容是 v-if 為假的 <ul>） */
  it('預設插槽的內容被 v-if 掉時，不畫出空的補充方塊', () => {
    const w = mount({
      components: { ChptResult },
      data: () => ({ failed: false }),
      template: `<ChptResult status="success"><ul v-if="failed"><li>原因</li></ul></ChptResult>`,
    })
    expect(w.find('.bg-surface-secondary').exists()).toBe(false)
  })

  it('圖示對螢幕閱讀器隱藏（語意由標題表達）', () => {
    const w = mount(ChptResult, { props: { status: 'success' } })
    expect(w.find('[aria-hidden="true"]').exists()).toBe(true)
  })
})
