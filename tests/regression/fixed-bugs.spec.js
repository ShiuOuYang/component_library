import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ChptToast from '@/components/library/ui/ChptToast.vue'
import ChptTable from '@/components/library/ui/ChptTable.vue'
import ChptTabs from '@/components/library/ui/ChptTabs.vue'
import ChptProgress from '@/components/library/ui/ChptProgress.vue'
import ChptModal from '@/components/library/ui/ChptModal.vue'
import ChptDrawer from '@/components/library/ui/ChptDrawer.vue'
import ChptInput from '@/components/library/ui/ChptInput.vue'
import ChptSelect from '@/components/library/ui/ChptSelect.vue'
import ChptSpinner from '@/components/library/ui/ChptSpinner.vue'
import ChptEmpty from '@/components/library/ui/ChptEmpty.vue'
import { useToast } from '@/components/library/shared/useToast'

/**
 * 回歸測試 —— 每一個 case 對應一個實際存在過的 bug。
 *
 * 這些 bug 全都是「一個單元測試就能抓到」的類型，卻在沒有任何測試的情況下
 * 存活到程式碼審視才被發現。
 */

describe('ChptToast：訊息內容必須被渲染', () => {
  it('顯示 toast.content', async () => {
    // Bug：整個元件從未渲染 toast.content，提示只有一個圖示和關閉鈕，
    //      使用者看不到任何訊息文字。
    const toast = useToast()
    const wrapper = mount(ChptToast, { attachTo: document.body })

    toast.success('已儲存')
    await wrapper.vm.$nextTick()

    expect(document.body.textContent).toContain('已儲存')
    toast.toasts.splice(0)
    wrapper.unmount()
  })

  it('關閉鈕是真正的 button（原本是帶 @click 的 icon，鍵盤無法操作）', async () => {
    const toast = useToast()
    const wrapper = mount(ChptToast, { attachTo: document.body })

    toast.info('提示')
    await wrapper.vm.$nextTick()

    const closeButton = document.body.querySelector('button[aria-label="關閉提示"]')
    expect(closeButton).not.toBeNull()
    expect(closeButton.tagName).toBe('BUTTON')

    toast.toasts.splice(0)
    wrapper.unmount()
  })

  it('錯誤用 assertive live region，其餘用 polite', async () => {
    const toast = useToast()
    const wrapper = mount(ChptToast, { attachTo: document.body })

    toast.error('壞了')
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('[role="alert"][aria-live="assertive"]')).not.toBeNull()

    toast.toasts.splice(0)
    await wrapper.vm.$nextTick()

    toast.success('好了')
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('[role="status"][aria-live="polite"]')).not.toBeNull()

    toast.toasts.splice(0)
    wrapper.unmount()
  })
})

describe('ChptTable：排序必須能用鍵盤操作', () => {
  const columns = [
    { key: 'name', title: '名稱', sortable: true },
    { key: 'fixed', title: '不可排序', sortable: false },
  ]
  const data = [{ name: 'b' }, { name: 'a' }]

  it('可排序表頭可聚焦，不可排序的不行', () => {
    // Bug：表頭只有 @click，沒有 tabindex 也沒有鍵盤事件 ——
    //      排序功能對鍵盤使用者完全不存在。
    const wrapper = mount(ChptTable, { props: { columns, data } })
    const headers = wrapper.findAll('th')

    expect(headers[0].attributes('tabindex')).toBe('0')
    expect(headers[1].attributes('tabindex')).toBeUndefined()
  })

  it('Enter 與 Space 會觸發排序', async () => {
    const wrapper = mount(ChptTable, { props: { columns, data } })
    const header = wrapper.findAll('th')[0]

    expect(header.attributes('aria-sort')).toBe('none')

    await header.trigger('keydown.enter')
    expect(header.attributes('aria-sort')).toBe('ascending')

    await header.trigger('keydown.space')
    expect(header.attributes('aria-sort')).toBe('descending')
  })

  it('不可排序的欄位不應出現 aria-sort', () => {
    const wrapper = mount(ChptTable, { props: { columns, data } })
    expect(wrapper.findAll('th')[1].attributes('aria-sort')).toBeUndefined()
  })
})

describe('ChptTabs：disabledTab 與 panel slot', () => {
  const tabs = [
    { label: '第一頁', content: 'A' },
    { label: '第二頁', content: 'B' },
  ]

  it('disabledTab 回傳 true 的頁籤無法被選取', async () => {
    // Bug：模板用了 props.disabledTab，但 props 根本沒宣告 —— 停用功能形同不存在，
    //      點下去照樣會切換。
    const wrapper = mount(ChptTabs, {
      props: { tabs, modelValue: 0, disabledTab: (tab) => tab.label === '第二頁' },
    })
    const buttons = wrapper.findAll('button[role="tab"]')

    expect(buttons[1].attributes('disabled')).toBeDefined()

    await buttons[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('沒有 disabledTab 時可正常切換', async () => {
    const wrapper = mount(ChptTabs, { props: { tabs, modelValue: 0 } })
    await wrapper.findAll('button[role="tab"]')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1])
  })

  it('具名 panel slot 可用（原本 :name="panel" 綁到不存在的變數）', () => {
    // Bug：<slot :name="panel"> 的 panel 未定義，slot 名變成字串 "undefined"，
    //      使用端寫 #panel 永遠不會生效。
    const wrapper = mount(ChptTabs, {
      props: { tabs, modelValue: 0 },
      slots: { panel: '<span class="from-panel-slot">自訂內容</span>' },
    })
    expect(wrapper.find('.from-panel-slot').exists()).toBe(true)
  })
})

describe('ChptProgress：不再宣告永遠不會發生的事件', () => {
  it('有 progressbar 語意與數值', () => {
    // Bug：兩個空 div，螢幕閱讀器讀不到任何進度資訊。
    const wrapper = mount(ChptProgress, { props: { modelValue: 42 } })
    const bar = wrapper.find('[role="progressbar"]')

    expect(bar.exists()).toBe(true)
    expect(bar.attributes('aria-valuenow')).toBe('42')
    expect(bar.attributes('aria-valuemin')).toBe('0')
    expect(bar.attributes('aria-valuemax')).toBe('100')
  })

  it('數值會被夾限在 0~100', () => {
    expect(mount(ChptProgress, { props: { modelValue: 150 } })
      .find('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(mount(ChptProgress, { props: { modelValue: -20 } })
      .find('[role="progressbar"]').attributes('aria-valuenow')).toBe('0')
  })

  it('不再宣告 update:modelValue（純顯示元件不會回寫）', () => {
    const wrapper = mount(ChptProgress, { props: { modelValue: 10 } })
    expect(wrapper.vm.$options.emits ?? []).not.toContain('update:modelValue')
  })
})

describe('浮層：Escape 只關最上層', () => {
  it('同時開兩個 modal 時，Escape 只關掉最後開的那個', async () => {
    // Bug：每個 Modal 實例各自綁 document 的 keydown，開三個視窗按一次 Escape
    //      會三個一起關。
    const first = mount(ChptModal, {
      props: { modelValue: true, title: '第一個' },
      attachTo: document.body,
    })
    const second = mount(ChptModal, {
      props: { modelValue: true, title: '第二個' },
      attachTo: document.body,
    })
    await second.vm.$nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await second.vm.$nextTick()

    expect(second.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(first.emitted('update:modelValue')).toBeUndefined()

    first.unmount()
    second.unmount()
  })

  it('closable=false 時 Escape 不關閉', async () => {
    const wrapper = mount(ChptModal, {
      props: { modelValue: true, title: '不可關', closable: false },
      attachTo: document.body,
    })
    await wrapper.vm.$nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('ChptDrawer 也支援 Escape（原本連 Escape 都沒有）', async () => {
    const wrapper = mount(ChptDrawer, {
      props: { modelValue: true, title: '抽屜' },
      attachTo: document.body,
    })
    await wrapper.vm.$nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    wrapper.unmount()
  })
})

describe('浮層：dialog 語意與背景捲動鎖', () => {
  it('ChptModal 有 role="dialog" 並以 aria-labelledby 指向標題', async () => {
    const wrapper = mount(ChptModal, {
      props: { modelValue: true, title: '報表設定' },
      attachTo: document.body,
    })
    await wrapper.vm.$nextTick()

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog.getAttribute('aria-modal')).toBe('true')

    const titleId = dialog.getAttribute('aria-labelledby')
    expect(titleId).toBeTruthy()
    expect(document.getElementById(titleId)?.textContent).toContain('報表設定')

    wrapper.unmount()
  })

  it('無標題時以 ariaLabel 作為可及名稱', async () => {
    const wrapper = mount(ChptModal, {
      props: { modelValue: true, ariaLabel: '快速設定' },
      attachTo: document.body,
    })
    await wrapper.vm.$nextTick()

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog.getAttribute('aria-label')).toBe('快速設定')
    expect(dialog.getAttribute('aria-labelledby')).toBeNull()

    wrapper.unmount()
  })

  it('開啟時鎖住背景捲動，關閉後還原', async () => {
    expect(document.body.style.overflow).toBe('')

    const wrapper = mount(ChptModal, {
      props: { modelValue: true, title: '鎖捲動' },
      attachTo: document.body,
    })
    await wrapper.vm.$nextTick()
    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('巢狀浮層以引用計數處理，內層關閉時外層仍保持鎖定', async () => {
    const outer = mount(ChptModal, {
      props: { modelValue: true, title: '外層' },
      attachTo: document.body,
    })
    const inner = mount(ChptModal, {
      props: { modelValue: true, title: '內層' },
      attachTo: document.body,
    })
    await inner.vm.$nextTick()
    expect(document.body.style.overflow).toBe('hidden')

    inner.unmount()
    expect(document.body.style.overflow).toBe('hidden')

    outer.unmount()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('表單：錯誤訊息必須與輸入元素關聯', () => {
  it('ChptInput 的 errorText 透過 aria-describedby 關聯', () => {
    // Bug：錯誤訊息只是旁邊一行紅字，沒有 id、沒有 aria-invalid，
    //      螢幕閱讀器完全不會把它和輸入框連起來。
    const wrapper = mount(ChptInput, {
      props: { modelValue: '', label: '名稱', errorText: '必填' },
    })
    const input = wrapper.find('input')

    expect(input.attributes('aria-invalid')).toBe('true')
    const describedBy = input.attributes('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(wrapper.find(`#${describedBy}`).text()).toBe('必填')
    expect(wrapper.find(`#${describedBy}`).attributes('role')).toBe('alert')
  })

  it('沒有錯誤時不應出現 aria-invalid', () => {
    const wrapper = mount(ChptInput, { props: { modelValue: '', label: '名稱' } })
    expect(wrapper.find('input').attributes('aria-invalid')).toBeUndefined()
  })

  it('label 的 for 指向真正的輸入元素 id', () => {
    const wrapper = mount(ChptInput, { props: { modelValue: '', label: '名稱' } })
    expect(wrapper.find('label').attributes('for')).toBe(wrapper.find('input').attributes('id'))
  })

  it('ChptSelect 同樣關聯 errorText', () => {
    const wrapper = mount(ChptSelect, {
      props: { modelValue: '', label: '角色', options: [{ label: 'A', value: 'a' }], errorText: '請選擇' },
    })
    const select = wrapper.find('select')
    expect(select.attributes('aria-invalid')).toBe('true')
    expect(wrapper.find(`#${select.attributes('aria-describedby')}`).text()).toBe('請選擇')
  })
})

describe('size 型別為 number | string 時的數值比較', () => {
  it('ChptSpinner 接受字串 size 而不會誤判', () => {
    // Bug：size 宣告為 number | string，卻直接拿去做 >= 比較。
    const asNumber = mount(ChptSpinner, { props: { loading: true, size: 48 } })
    const asString = mount(ChptSpinner, { props: { loading: true, size: '48' } })
    expect(asString.html()).toBe(asNumber.html())
  })

  it('ChptEmpty 接受字串 iconSize', () => {
    const asNumber = mount(ChptEmpty, { props: { iconSize: 72 } })
    const asString = mount(ChptEmpty, { props: { iconSize: '72' } })
    expect(asString.html()).toBe(asNumber.html())
  })
})
