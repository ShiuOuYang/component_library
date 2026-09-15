import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, useTemplateRef } from 'vue'
import { mount } from '@vue/test-utils'
import { useOverlay } from '@/components/library/shared/useOverlay'

/** 最小的測試用浮層：一個容器 + 兩顆可聚焦按鈕 */
function makeOverlay(options = {}) {
  const onEscape = vi.fn()
  const open = ref(true)

  const Component = defineComponent({
    setup() {
      const panel = useTemplateRef('panel')
      useOverlay(() => open.value, panel, { onEscape, ...options })
      return () =>
        open.value
          ? h('div', { ref: 'panel', tabindex: '-1' }, [
              h('button', { class: 'first' }, '第一顆'),
              h('button', { class: 'last' }, '最後一顆'),
            ])
          : null
    },
  })

  const wrapper = mount(Component, { attachTo: document.body })
  return { wrapper, onEscape, open }
}

function pressKey(key, init = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
}

describe('useOverlay', () => {
  describe('Escape 堆疊', () => {
    it('只有最上層會收到 Escape', async () => {
      const a = makeOverlay()
      const b = makeOverlay()
      await nextTick()

      pressKey('Escape')
      expect(b.onEscape).toHaveBeenCalledTimes(1)
      expect(a.onEscape).not.toHaveBeenCalled()

      a.wrapper.unmount()
      b.wrapper.unmount()
    })

    it('最上層關閉後，Escape 換由下一層接手', async () => {
      const a = makeOverlay()
      const b = makeOverlay()
      await nextTick()

      b.wrapper.unmount()
      pressKey('Escape')
      expect(a.onEscape).toHaveBeenCalledTimes(1)

      a.wrapper.unmount()
    })

    it('closeOnEscape 回傳 false 時不呼叫 onEscape', async () => {
      const { wrapper, onEscape } = makeOverlay({ closeOnEscape: () => false })
      await nextTick()

      pressKey('Escape')
      expect(onEscape).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('closeOnEscape 每次按鍵即時求值', async () => {
      const allow = ref(false)
      const { wrapper, onEscape } = makeOverlay({ closeOnEscape: () => allow.value })
      await nextTick()

      pressKey('Escape')
      expect(onEscape).not.toHaveBeenCalled()

      allow.value = true
      pressKey('Escape')
      expect(onEscape).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })
  })

  describe('背景捲動鎖', () => {
    it('開啟時鎖定，關閉後還原原本的值', async () => {
      document.body.style.overflow = 'scroll'

      const { wrapper } = makeOverlay()
      await nextTick()
      expect(document.body.style.overflow).toBe('hidden')

      wrapper.unmount()
      expect(document.body.style.overflow).toBe('scroll')

      document.body.style.overflow = ''
    })

    it('以引用計數處理巢狀浮層', async () => {
      const a = makeOverlay()
      const b = makeOverlay()
      await nextTick()

      b.wrapper.unmount()
      expect(document.body.style.overflow).toBe('hidden')

      a.wrapper.unmount()
      expect(document.body.style.overflow).toBe('')
    })

    it('lockScroll=false 時不動 body', async () => {
      const { wrapper } = makeOverlay({ lockScroll: false })
      await nextTick()
      expect(document.body.style.overflow).toBe('')
      wrapper.unmount()
    })
  })

  describe('焦點管理', () => {
    it('開啟時把焦點移入浮層第一個可聚焦元素', async () => {
      const { wrapper } = makeOverlay()
      await nextTick()
      await nextTick()

      expect(document.activeElement).toBe(document.querySelector('button.first'))
      wrapper.unmount()
    })

    it('關閉後焦點歸還給開啟前的元素', async () => {
      const trigger = document.createElement('button')
      document.body.appendChild(trigger)
      trigger.focus()
      expect(document.activeElement).toBe(trigger)

      const { wrapper } = makeOverlay()
      await nextTick()
      await nextTick()
      expect(document.activeElement).not.toBe(trigger)

      wrapper.unmount()
      expect(document.activeElement).toBe(trigger)

      trigger.remove()
    })

    it('initialFocus 可指定聚焦目標', async () => {
      const { wrapper } = makeOverlay({
        initialFocus: () => document.querySelector('button.last'),
      })
      await nextTick()
      await nextTick()

      expect(document.activeElement).toBe(document.querySelector('button.last'))
      wrapper.unmount()
    })

    it('Tab 在最後一個元素上會繞回第一個', async () => {
      const { wrapper } = makeOverlay()
      await nextTick()
      await nextTick()

      const last = document.querySelector('button.last')
      last.focus()
      pressKey('Tab')

      expect(document.activeElement).toBe(document.querySelector('button.first'))
      wrapper.unmount()
    })

    it('Shift+Tab 在第一個元素上會繞到最後一個', async () => {
      const { wrapper } = makeOverlay()
      await nextTick()
      await nextTick()

      document.querySelector('button.first').focus()
      pressKey('Tab', { shiftKey: true })

      expect(document.activeElement).toBe(document.querySelector('button.last'))
      wrapper.unmount()
    })

    it('隱藏與停用的元素不列入焦點循環', async () => {
      // 證明改用「檢查隱藏原因」不是單純放寬條件：
      // hidden / display:none / aria-hidden / disabled 都必須被排除。
      const onEscape = vi.fn()
      const Component = defineComponent({
        setup() {
          const panel = useTemplateRef('panel')
          useOverlay(() => true, panel, { onEscape })
          return () =>
            h('div', { ref: 'panel', tabindex: '-1' }, [
              h('button', { class: 'visible-a' }, 'A'),
              h('button', { class: 'is-hidden', hidden: true }, '被 hidden 隱藏'),
              h('button', { class: 'is-none', style: 'display:none' }, '被 display:none 隱藏'),
              h('button', { class: 'is-aria', 'aria-hidden': 'true' }, '被 aria-hidden 隱藏'),
              h('button', { class: 'is-disabled', disabled: true }, '停用'),
              h('div', { style: 'display:none' }, [
                h('button', { class: 'in-hidden-parent' }, '祖先被隱藏'),
              ]),
              h('button', { class: 'visible-b' }, 'B'),
            ])
        },
      })

      const wrapper = mount(Component, { attachTo: document.body })
      await nextTick()
      await nextTick()

      // 第一個可聚焦的應該是 visible-a
      expect(document.activeElement).toBe(document.querySelector('button.visible-a'))

      // 從 visible-b（最後一個可見的）按 Tab 應繞回 visible-a，
      // 中間所有隱藏 / 停用的都被跳過
      document.querySelector('button.visible-b').focus()
      pressKey('Tab')
      expect(document.activeElement).toBe(document.querySelector('button.visible-a'))

      wrapper.unmount()
    })

    it('trapFocus=false 時不介入 Tab', async () => {
      const { wrapper } = makeOverlay({ trapFocus: false })
      await nextTick()
      await nextTick()

      const last = document.querySelector('button.last')
      last.focus()
      pressKey('Tab')

      // 沒有被攔截，焦點留在原處交給瀏覽器預設行為
      expect(document.activeElement).toBe(last)
      wrapper.unmount()
    })
  })

  it('元件卸載時會離開堆疊，不留下殘存的監聽', async () => {
    const { wrapper, onEscape } = makeOverlay()
    await nextTick()

    wrapper.unmount()
    pressKey('Escape')
    expect(onEscape).not.toHaveBeenCalled()
  })
})
