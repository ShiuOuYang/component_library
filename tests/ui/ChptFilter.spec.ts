import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChptFilter from '@/components/library/ui/ChptFilter.vue'

/**
 * ChptFilter 有三種 type（select / dropdown / tag），先前沒有直接測過。
 *
 * 這組測試盯的是兩件事：
 *   1. dropdown 的觸發鈕要真的吃 size prop（原本寫死 px-3 py-1.5）
 *   2. 小型操作鈕的點擊目標不得小於 24×24（WCAG 2.5.8）
 */

const OPTIONS = [
  { label: '甲', value: 'a' },
  { label: '乙', value: 'b' },
  { label: '丙', value: 'c' },
]

describe('ChptFilter', () => {
  describe('dropdown 的 size prop', () => {
    it.each([
      ['xs', 'h-control-xs'],
      ['sm', 'h-control-sm'],
      ['md', 'h-control-md'],
      ['lg', 'h-control-lg'],
    ])('size=%s 的觸發鈕高度為 %s', (size, expected) => {
      const wrapper = mount(ChptFilter, {
        props: { type: 'dropdown', options: OPTIONS, modelValue: [], size },
      })
      expect(wrapper.find('button').classes()).toContain(expected)
    })

    /**
     * ⚠️ 原本觸發鈕寫死 px-3 py-1.5 且完全沒套用 sizeClass，
     *    也就是 <ChptFilter type="dropdown" size="md" /> 的 size 一直是無效的，
     *    不管給什麼都固定 28px。這個測試就是為了擋它長回來。
     */
    it('不同 size 會產生不同的 class（size 不再是無效 prop）', () => {
      const classesFor = (size: string) =>
        mount(ChptFilter, {
          props: { type: 'dropdown', options: OPTIONS, modelValue: [], size },
        })
          .find('button')
          .classes()
          .join(' ')

      expect(classesFor('xs')).not.toBe(classesFor('lg'))
    })

    it('高度不再用 py-* 撐', () => {
      const wrapper = mount(ChptFilter, {
        props: { type: 'dropdown', options: OPTIONS, modelValue: [], size: 'md' },
      })
      const classes = wrapper.find('button').classes()
      expect(classes.some((c) => /^py-/.test(c))).toBe(false)
    })
  })

  describe('可點擊目標尺寸（WCAG 2.5.8：最小 24×24）', () => {
    /** tag 型態才有清空鈕與全選 / 清空 */
    function mountTag(props: Record<string, unknown> = {}) {
      return mount(ChptFilter, {
        props: { type: 'tag', options: OPTIONS, modelValue: ['a'], showClearAll: true, ...props },
      })
    }

    /**
     * ⚠️ 清空鈕原本是 w-4 h-4（16×16），低於 24×24 的最小點擊目標，
     *    而且字級只有 text-[9px]，實際上很難看見也很難點中。
     */
    it('清空鈕是 24×24 的正方形', () => {
      const clear = mountTag().find('button[aria-label="清空篩選"]')
      expect(clear.exists()).toBe(true)

      const classes = clear.classes()
      expect(classes).toContain('h-control-xs')
      expect(classes).toContain('min-w-control-xs')
      expect(classes).not.toContain('w-4')
      expect(classes).not.toContain('h-4')
    })

    it('清空鈕的字級不再是 9px', () => {
      const classes = mountTag().find('button[aria-label="清空篩選"]').classes()
      expect(classes).toContain('text-xs')
      expect(classes.some((c) => c.startsWith('text-['))).toBe(false)
    })

    it('沒有選取任何項目時不顯示清空鈕', () => {
      expect(mountTag({ modelValue: [] }).find('button[aria-label="清空篩選"]').exists()).toBe(false)
    })

    it('全選 / 清空鈕高度不低於 control-xs', () => {
      const wrapper = mountTag()
      const mini = wrapper
        .findAll('button')
        .filter((b) => ['全選', '清空'].includes(b.text()))

      expect(mini).toHaveLength(2)
      for (const button of mini) {
        expect(button.classes()).toContain('h-control-xs')
      }
    })
  })

  describe('所有 button 都標註 type', () => {
    /**
     * <button> 不寫 type 時 HTML 預設是 submit，放進使用端的 <form>
     * 會誤觸表單送出。
     *
     * select 型態只渲染一個 <select>、沒有任何按鈕，所以只檢查
     * 真的有按鈕的 dropdown 與 tag。
     */
    it.each([
      ['dropdown', [] as unknown],
      ['tag', ['a'] as unknown],
    ])('type=%s 的按鈕都是 type="button"', async (type, modelValue) => {
      const wrapper = mount(ChptFilter, {
        props: { type, options: OPTIONS, modelValue, showClearAll: true },
      })
      // dropdown 要展開才會渲染選項區
      const first = wrapper.find('button')
      if (first.exists()) await first.trigger('click')

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
      for (const button of buttons) {
        expect(button.attributes('type')).toBe('button')
      }
    })

    it('select 型態不渲染任何 button（只有 <select>）', () => {
      const wrapper = mount(ChptFilter, {
        props: { type: 'select', options: OPTIONS, modelValue: 'a' },
      })
      expect(wrapper.findAll('button')).toHaveLength(0)
      expect(wrapper.find('select').exists()).toBe(true)
    })
  })
})
