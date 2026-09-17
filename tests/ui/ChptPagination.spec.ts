import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChptPagination from '@/components/library/ui/ChptPagination.vue'

/**
 * ChptPagination 的兩個 variant 之前都沒有直接測過。
 *
 * 這組測試的重點是 compact 模式的每頁筆數輸入框 —— 它是使用者可以打進
 * 任意數字的入口，而元件先前直接把值拿去做除數。
 */

function mountPagination(props: Record<string, unknown> = {}) {
  return mount(ChptPagination, {
    props: { variant: 'compact', totalItems: 100, itemsPerPage: 20, currentPage: 1, ...props },
  })
}

/** compact 模式的「每頁筆數」輸入框 */
function pageSizeInput(wrapper: ReturnType<typeof mountPagination>) {
  return wrapper.findAll('input[type="number"]')[0]
}

/** compact 模式的「目前頁碼 / 總頁數」顯示，回傳如 "/100" */
function pageIndicator(wrapper: ReturnType<typeof mountPagination>): string {
  const box = wrapper.find('input[aria-label="目前頁碼"]').element.parentElement
  return (box?.textContent ?? '').replace(/\s/g, '')
}

describe('ChptPagination', () => {
  describe('總頁數計算', () => {
    it('正常情況下為 ceil(totalItems / itemsPerPage)', () => {
      const wrapper = mountPagination({ totalItems: 95, itemsPerPage: 20 })
      expect(pageIndicator(wrapper)).toBe('/5')
    })

    it('沒有資料時總頁數為 0', () => {
      const wrapper = mountPagination({ totalItems: 0 })
      expect(pageIndicator(wrapper)).toBe('/0')
    })

    /**
     * ⚠️ 這是修掉的核心缺陷。
     *    itemsPerPage = 0 時 Math.ceil(n / 0) 是 Infinity，而原本的
     *    `|| 0` 擋不掉（Infinity 是 truthy），畫面上會直接顯示 "Infinity"。
     */
    it('itemsPerPage 為 0 時不會算出 Infinity', () => {
      const wrapper = mountPagination({ totalItems: 100, itemsPerPage: 0 })
      expect(wrapper.text()).not.toContain('Infinity')
      // 夾回下限 1 → 100 筆 = 100 頁
      expect(pageIndicator(wrapper)).toBe('/100')
    })

    it('itemsPerPage 為負數時不會算出負的總頁數', () => {
      const wrapper = mountPagination({ totalItems: 100, itemsPerPage: -5 })
      expect(pageIndicator(wrapper)).toBe('/100')
    })

    it('itemsPerPage 為 NaN 時夾回下限', () => {
      const wrapper = mountPagination({ totalItems: 100, itemsPerPage: Number.NaN })
      expect(wrapper.text()).not.toContain('NaN')
      expect(pageIndicator(wrapper)).toBe('/100')
    })

    it('itemsPerPage 超過上限時夾到 1000', () => {
      const wrapper = mountPagination({ totalItems: 100000, itemsPerPage: 99999 })
      expect(pageIndicator(wrapper)).toBe('/100')
    })
  })

  describe('顯示範圍（full 模式）', () => {
    /** full 模式的「顯示第 N 至 M 項結果，共 T 項」摘要，空白已正規化 */
    function summary(wrapper: ReturnType<typeof mount>): string {
      return wrapper.find('p').text().replace(/\s+/g, ' ').trim()
    }

    it('正常情況下的起訖筆數', () => {
      const wrapper = mount(ChptPagination, {
        props: { variant: 'full', totalItems: 95, itemsPerPage: 20, currentPage: 2 },
      })
      expect(summary(wrapper)).toBe('顯示第 21 至 40 項結果，共 95 項')
    })

    it('最後一頁的結束筆數不超過總數', () => {
      const wrapper = mount(ChptPagination, {
        props: { variant: 'full', totalItems: 95, itemsPerPage: 20, currentPage: 5 },
      })
      expect(summary(wrapper)).toBe('顯示第 81 至 95 項結果，共 95 項')
    })

    it('itemsPerPage 為 0 時起訖筆數不會變成 NaN', () => {
      const wrapper = mount(ChptPagination, {
        props: { variant: 'full', totalItems: 100, itemsPerPage: 0, currentPage: 2 },
      })
      // 夾成每頁 1 筆 → 第 2 頁就是第 2 至 2 項
      expect(summary(wrapper)).toBe('顯示第 2 至 2 項結果，共 100 項')
    })

    it('沒有資料時起訖筆數都是 0', () => {
      const wrapper = mount(ChptPagination, {
        props: { variant: 'full', totalItems: 0, itemsPerPage: 20, currentPage: 1 },
      })
      expect(summary(wrapper)).toBe('顯示第 0 至 0 項結果，共 0 項')
    })
  })

  describe('每頁筆數輸入（compact）', () => {
    it('輸入合法值會送出 update:itemsPerPage', async () => {
      const wrapper = mountPagination()
      const input = pageSizeInput(wrapper)
      ;(input.element as HTMLInputElement).value = '50'
      await input.trigger('change')

      expect(wrapper.emitted('update:itemsPerPage')![0]).toEqual([50])
    })

    it('輸入 0 時夾成 1 再送出，而不是把 0 丟給使用端', async () => {
      const wrapper = mountPagination()
      const input = pageSizeInput(wrapper)
      ;(input.element as HTMLInputElement).value = '0'
      await input.trigger('change')

      expect(wrapper.emitted('update:itemsPerPage')![0]).toEqual([1])
    })

    it('輸入負數時夾成 1', async () => {
      const wrapper = mountPagination()
      const input = pageSizeInput(wrapper)
      ;(input.element as HTMLInputElement).value = '-10'
      await input.trigger('change')

      expect(wrapper.emitted('update:itemsPerPage')![0]).toEqual([1])
    })

    it('輸入超過 1000 時夾成 1000', async () => {
      const wrapper = mountPagination()
      const input = pageSizeInput(wrapper)
      ;(input.element as HTMLInputElement).value = '5000'
      await input.trigger('change')

      expect(wrapper.emitted('update:itemsPerPage')![0]).toEqual([1000])
    })

    it('夾過之後輸入框顯示的值會同步回來', async () => {
      const wrapper = mountPagination()
      const input = pageSizeInput(wrapper)
      const el = input.element as HTMLInputElement
      el.value = '0'
      await input.trigger('change')

      expect(el.value).toBe('1')
    })

    it('清空輸入框不會送出 NaN，而是還原成目前的值', async () => {
      const wrapper = mountPagination({ itemsPerPage: 20 })
      const input = pageSizeInput(wrapper)
      const el = input.element as HTMLInputElement
      el.value = ''
      await input.trigger('change')

      expect(wrapper.emitted('update:itemsPerPage')).toBeFalsy()
      expect(el.value).toBe('20')
    })

    it('改每頁筆數時把頁碼歸零回第 1 頁', async () => {
      const wrapper = mountPagination({ currentPage: 5 })
      const input = pageSizeInput(wrapper)
      ;(input.element as HTMLInputElement).value = '50'
      await input.trigger('change')

      expect(wrapper.emitted('update:currentPage')![0]).toEqual([1])
      expect(wrapper.emitted('change')![0]).toEqual([1])
    })

    it('已經在第 1 頁時不重複送出頁碼', async () => {
      const wrapper = mountPagination({ currentPage: 1 })
      const input = pageSizeInput(wrapper)
      ;(input.element as HTMLInputElement).value = '50'
      await input.trigger('change')

      expect(wrapper.emitted('update:currentPage')).toBeFalsy()
    })

    it('輸入與目前相同的值時不送出事件', async () => {
      const wrapper = mountPagination({ itemsPerPage: 20 })
      const input = pageSizeInput(wrapper)
      ;(input.element as HTMLInputElement).value = '20'
      await input.trigger('change')

      expect(wrapper.emitted('update:itemsPerPage')).toBeFalsy()
    })
  })

  describe('可點擊目標尺寸（WCAG 2.5.8：最小 24×24）', () => {
    it('compact 的翻頁按鈕高度用 control token，不是寫死的 h-6', () => {
      const wrapper = mountPagination()
      const button = wrapper.find('button')

      expect(button.classes()).toContain('h-control-sm')
      expect(button.classes()).toContain('min-w-control-sm')
      expect(button.classes()).not.toContain('h-6')
    })

    it('compact 的數字輸入框不再是 18px 高的 h-4.5', () => {
      const wrapper = mountPagination()
      for (const input of wrapper.findAll('input[type="number"]')) {
        expect(input.classes()).not.toContain('h-4.5')
        expect(input.classes()).toContain('h-control-xs')
      }
    })
  })
})
