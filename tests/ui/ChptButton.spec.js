import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChptButton from '@/components/library/ui/ChptButton.vue'
import ChptSpinner from '@/components/library/ui/ChptSpinner.vue'

describe('ChptButton', () => {
  it('預設 type 是 button（避免在表單裡意外送出）', () => {
    expect(mount(ChptButton).find('button').attributes('type')).toBe('button')
  })

  it('有可見的 focus 樣式，不只是 outline-none', () => {
    // Bug：原本只寫 focus:outline-none，蓋掉 base.css 的全域 :focus-visible
    //      外框卻沒有替代樣式，鍵盤使用者完全看不到焦點。
    const classes = mount(ChptButton).find('button').classes()
    expect(classes).toContain('focus:outline-none')
    expect(classes.some((c) => c.startsWith('focus-visible:ring-'))).toBe(true)
  })

  it('圖示與文字之間只有一層間距', () => {
    // Bug：icon 加 mr-2、text 再加 ml-2，間距變成兩倍。
    const wrapper = mount(ChptButton, { props: { icon: 'save', label: '儲存' } })
    const html = wrapper.html()

    expect(wrapper.find('button').classes()).toContain('gap-2')
    expect(html).not.toContain('mr-2')
    expect(html).not.toContain('ml-2')
  })

  it('只有圖示或只有文字時不加間距', () => {
    expect(mount(ChptButton, { props: { icon: 'save' } }).find('button').classes()).not.toContain('gap-2')
    expect(mount(ChptButton, { props: { label: '儲存' } }).find('button').classes()).not.toContain('gap-2')
  })

  it('loading 時用 ChptSpinner，不是 FontAwesome', () => {
    // Bug：庫裡已有 ChptSpinner，圖示又走 Material Symbols，
    //      loading 卻用 FontAwesome 的 fa-spinner —— 三套圖示來源。
    const wrapper = mount(ChptButton, { props: { loading: true, label: '儲存' } })

    expect(wrapper.findComponent(ChptSpinner).exists()).toBe(true)
    expect(wrapper.html()).not.toContain('fa-spinner')
  })

  it('loading 時設定 aria-busy 並停用', () => {
    const button = mount(ChptButton, { props: { loading: true } }).find('button')
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('停用或 loading 時不發出 click', async () => {
    const disabled = mount(ChptButton, { props: { disabled: true } })
    await disabled.find('button').trigger('click')
    expect(disabled.emitted('click')).toBeUndefined()

    const loading = mount(ChptButton, { props: { loading: true } })
    await loading.find('button').trigger('click')
    expect(loading.emitted('click')).toBeUndefined()
  })

  it('正常狀態會發出 click', async () => {
    const wrapper = mount(ChptButton, { props: { label: '按我' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('不認識的 color / size 退回預設而不是壞掉', () => {
    const wrapper = mount(ChptButton, { props: { color: 'nope', size: 'huge' } })
    const classes = wrapper.find('button').classes()

    // 品牌色現在走主題化角色 accent（淺色 primary-600 / 深色 primary-400），
    // 不再是寫死的 primary-600 —— 見 tokens.js 的 themed
    expect(classes.some((c) => c.includes('accent'))).toBe(true)
    expect(classes).toContain('h-control-md') // md 的高度
  })

  /**
   * 尺寸階梯來自 design tokens 的 control（24 / 32 / 40 / 48px）。
   *
   * 這組測試是為了擋住舊狀況再回來：原本 sm 只有 24px（全庫 47 處在用，
   * 畫面因此顯得很矮），另外還有 3xs=8px、2xs=10px 這種點不到、
   * 也不符合 WCAG 2.5.8 最小點擊目標（24×24）的尺寸。
   */
  describe('尺寸階梯', () => {
    it('每個尺寸都對映到 control 高度，不自己寫 h-*', () => {
      const expected = {
        xs: 'h-control-xs',
        sm: 'h-control-sm',
        md: 'h-control-md',
        lg: 'h-control-lg',
      }
      for (const [size, heightClass] of Object.entries(expected)) {
        const wrapper = mount(ChptButton, { props: { size, label: 'x' } })
        expect(wrapper.find('button').classes()).toContain(heightClass)
        wrapper.unmount()
      }
    })

    it('過時的 3xs / 2xs 對映到 xs，不再產生 8px / 10px 的按鈕', () => {
      for (const size of ['3xs', '2xs']) {
        const wrapper = mount(ChptButton, { props: { size, label: 'x' } })
        const classes = wrapper.find('button').classes()

        expect(classes).toContain('h-control-xs')
        // 舊實作留下的寫死高度不該再出現
        expect(classes.some((c) => /^h-\[\d+px\]$/.test(c))).toBe(false)
        wrapper.unmount()
      }
    })

    it('高度由 h-control-* 決定，不再靠 py-* 撐開', () => {
      for (const size of ['xs', 'sm', 'md', 'lg']) {
        const wrapper = mount(ChptButton, { props: { size, label: 'x' } })
        const classes = wrapper.find('button').classes()

        expect(classes.some((c) => c.startsWith('py-'))).toBe(false)
        wrapper.unmount()
      }
    })
  })

  it('badge 的計時器在卸載時被清除', () => {
    // Bug：watch 裡的 setTimeout 沒有在 onUnmounted 清除。
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')

    const wrapper = mount(ChptButton, {
      props: { hasBadge: true, badgeText: 1, label: '通知' },
    })
    wrapper.setProps({ badgeText: 2 })
    wrapper.unmount()

    expect(clearSpy).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('badge 連續變更不會堆積計時器', async () => {
    vi.useFakeTimers()
    const wrapper = mount(ChptButton, {
      props: { hasBadge: true, badgeText: 0, label: '通知' },
    })

    await wrapper.setProps({ badgeText: 1 })
    await wrapper.setProps({ badgeText: 2 })
    await wrapper.setProps({ badgeText: 3 })

    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    // 只應顯示最後一個值
    expect(wrapper.text()).toContain('3')
    vi.useRealTimers()
  })

  it('badgeText 為 0 時仍會顯示（不該被當成 falsy 而隱藏）', () => {
    const wrapper = mount(ChptButton, {
      props: { hasBadge: true, badgeText: 0, label: '通知' },
    })
    expect(wrapper.text()).toContain('0')
  })

  it('已移除未使用的 textColor prop', () => {
    // Bug：宣告了 textColor 卻完全沒有用到。
    const declared = Object.keys(mount(ChptButton).vm.$options.props ?? {})
    expect(declared).not.toContain('textColor')
  })
})
