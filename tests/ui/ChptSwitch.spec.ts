import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChptSwitch from '@/components/library/ui/ChptSwitch.vue'

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountSwitch(props: Record<string, unknown> = {}) {
  const w = mount(ChptSwitch, {
    props: { label: '啟用通知', ...props, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }) },
    attachTo: document.body,
  })
  wrapper = w
  return w
}

describe('ChptSwitch', () => {
  it('原生 checkbox + role=switch，由標籤命名', () => {
    const w = mountSwitch({ modelValue: true })
    const input = w.find('input')
    expect(input.attributes('role')).toBe('switch')
    expect(input.attributes('aria-checked')).toBe('true')
    expect(w.find('label').text()).toContain('啟用通知')
  })

  /**
   * 迴歸：原本軌道另外綁了 @click，checkbox 的 click 冒泡上去 → 一次操作切換兩次 = 沒反應。
   * 點標籤、點軌道、按 Space（瀏覽器會對 checkbox 觸發 click）都只能切換一次。
   */
  it('點標籤文字只切換一次', async () => {
    const w = mountSwitch({ modelValue: false })
    ;(w.find('label').element as HTMLLabelElement).click()
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')).toEqual([[true]])
  })

  it('點軌道只切換一次', async () => {
    const w = mountSwitch({ modelValue: true })
    ;(w.find('span[aria-hidden="true"]').element as HTMLElement).click()
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')).toEqual([[false]])
  })

  it('checkbox 本身被點（Space 鍵）只切換一次', async () => {
    const w = mountSwitch({ modelValue: false })
    ;(w.find('input').element as HTMLInputElement).click()
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')).toEqual([[true]])
    expect(w.emitted('change')).toEqual([[true]])
  })

  it('disabled 不切換', async () => {
    const w = mountSwitch({ modelValue: false, disabled: true })
    ;(w.find('label').element as HTMLLabelElement).click()
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(w.find('input').attributes('disabled')).toBeDefined()
  })

  it('沒有 label 時用 ariaLabel 命名', () => {
    const w = mountSwitch({ label: '', ariaLabel: '夜間模式' })
    expect(w.find('input').attributes('aria-label')).toBe('夜間模式')
  })
})
