import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptPopconfirm from '@/components/library/ui/ChptPopconfirm.vue'
import ChptCodeBlock from '@/components/library/ui/ChptCodeBlock.vue'
import ChptVirtualList from '@/components/library/ui/ChptVirtualList.vue'

/**
 * axe-core 掃過全部文檔頁後修掉的問題（第八批），各自一個回歸測試。
 */

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

describe('ChptPopconfirm：觸發鈕的 ARIA', () => {
  /**
   * 回歸（axe aria-allowed-attr，critical）：aria-expanded 原本放在包住插槽的 <span>，
   * span 沒有角色也不可聚焦 —— 聚焦按鈕時聽不到「已展開 / 已收合」。
   */
  it('aria-haspopup / aria-expanded 放在插槽裡的按鈕上，並跟著開關更新', async () => {
    wrapper = mount(ChptPopconfirm, {
      slots: { default: '<button type="button" class="trigger">刪除</button>' },
      attachTo: document.body,
    })
    await nextTick()
    const btn = wrapper.find('button.trigger')
    expect(btn.attributes('aria-haspopup')).toBe('dialog')
    expect(btn.attributes('aria-expanded')).toBe('false')
    expect(btn.attributes('aria-controls')).toBeUndefined()

    await btn.trigger('click')
    await nextTick()
    const panel = wrapper.find('[role="dialog"]')
    expect(btn.attributes('aria-expanded')).toBe('true')
    expect(btn.attributes('aria-controls')).toBe(panel.attributes('id'))

    // 包住插槽的 span 不再帶 aria 屬性
    const wrap = btn.element.parentElement!
    expect(wrap.hasAttribute('aria-expanded')).toBe(false)
    expect(wrap.hasAttribute('aria-haspopup')).toBe(false)
  })
})

describe('ChptCodeBlock：可捲動區塊能用鍵盤操作', () => {
  /** 回歸（axe scrollable-region-focusable）：長程式碼要左右捲，原本鍵盤到不了 */
  it('外框可聚焦、有名稱（role=group：一頁很多個程式碼區塊，用 region 會變成一堆同名地標）', () => {
    wrapper = mount(ChptCodeBlock, { props: { code: 'const a = 1', language: 'typescript' } })
    const region = wrapper.find('[role="group"]')
    expect(region.attributes('tabindex')).toBe('0')
    expect(region.attributes('aria-label')).toBe('typescript 程式碼')
  })
})

describe('ChptVirtualList：捲動區可以用鍵盤捲', () => {
  /** 回歸（axe scrollable-region-focusable）：列表項目本身不可聚焦，鍵盤使用者捲不動 */
  it('捲動容器可聚焦', () => {
    wrapper = mount(ChptVirtualList, { props: { items: [1, 2, 3], itemHeight: 32, height: '200px' } })
    expect(wrapper.find('.chpt-virtual-list').attributes('tabindex')).toBe('0')
  })
})
