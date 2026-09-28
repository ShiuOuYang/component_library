import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptColorPicker from '@/components/library/ui/ChptColorPicker.vue'

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountPicker(props: Record<string, unknown> = {}) {
  const w = mount(ChptColorPicker, {
    props: { label: '標記色', ...props, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }) },
    attachTo: document.body,
  })
  wrapper = w
  return w
}

type W = ReturnType<typeof mount>
const trigger = (w: W) => w.find(`#${w.find('label').attributes('for')}`)
const open = async (w: W) => {
  await trigger(w).trigger('click')
  await nextTick()
}
const hexInput = (w: W) => w.find('input[type="text"]')

describe('ChptColorPicker', () => {
  it('觸發鈕：標籤指得到、名稱是色碼、開啟 dialog', async () => {
    const w = mountPicker({ modelValue: '#3b82f6' })
    expect(trigger(w).element.tagName).toBe('BUTTON')
    expect(trigger(w).text()).toContain('#3b82f6')
    expect(trigger(w).attributes('aria-haspopup')).toBe('dialog')
    await open(w)
    expect(w.find('[role="dialog"]').attributes('aria-label')).toBe('選擇標記色')
  })

  it('按鈕名稱 = 標籤 + 色碼', () => {
    const w = mountPicker({ modelValue: '#3b82f6' })
    const ids = trigger(w).attributes('aria-labelledby')!.split(' ')
    expect(ids.map((i) => w.find(`#${i}`).text())).toEqual(['標記色', '#3b82f6'])
  })

  it('未設定時按鈕名稱是「未設定」', () => {
    const w = mountPicker({ showText: false })
    expect(trigger(w).find('.sr-only').text()).toBe('未設定')
  })

  it('點預設色：送出、關閉、焦點回到觸發鈕；目前的色帶 aria-pressed', async () => {
    const w = mountPicker({ presets: ['#ff0000', '#00F', 'nope'] })
    await open(w)
    const swatches = w.findAll('[role="group"] button')
    expect(swatches.map((b) => b.attributes('aria-label'))).toEqual(['#ff0000', '#0000ff']) // 正規化、丟掉不合法的
    await swatches[1].trigger('click')
    expect(w.props('modelValue')).toBe('#0000ff')
    expect(w.emitted('change')?.[0]).toEqual(['#0000ff'])
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger(w).element)
    await open(w)
    expect(w.findAll('[role="group"] button')[1].attributes('aria-pressed')).toBe('true')
  })

  it('色碼輸入：#abc / ABCDEF 正規化成小寫六碼', async () => {
    const w = mountPicker()
    await open(w)
    await hexInput(w).setValue('#AbC')
    await hexInput(w).trigger('keydown', { key: 'Enter' })
    expect(w.props('modelValue')).toBe('#aabbcc')
    await hexInput(w).setValue('123456')
    await hexInput(w).trigger('blur')
    expect(w.props('modelValue')).toBe('#123456')
  })

  it('色碼不合法時顯示錯誤、不送出', async () => {
    const w = mountPicker({ modelValue: '#111111' })
    await open(w)
    await hexInput(w).setValue('#12')
    await hexInput(w).trigger('keydown', { key: 'Enter' })
    expect(w.props('modelValue')).toBe('#111111')
    expect(hexInput(w).attributes('aria-invalid')).toBe('true')
    expect(w.find(`#${hexInput(w).attributes('aria-describedby')}`).text()).toContain('#RRGGBB')
    await hexInput(w).setValue('#123')
    expect(hexInput(w).attributes('aria-invalid')).toBeUndefined()
  })

  it('原生取色器', async () => {
    const w = mountPicker()
    await open(w)
    await w.find('input[type="color"]').setValue('#00ff00')
    expect(w.props('modelValue')).toBe('#00ff00')
  })

  it('清除顏色 / 清空色碼 → null；clearable=false 時清空色碼會還原', async () => {
    const w = mountPicker({ modelValue: '#123456' })
    await open(w)
    await w.findAll('button').find((b) => b.text() === '清除顏色')!.trigger('click')
    expect(w.props('modelValue')).toBeNull()
    wrapper!.unmount()

    const w2 = mountPicker({ modelValue: '#123456', clearable: false })
    await open(w2)
    expect(w2.findAll('button').some((b) => b.text() === '清除顏色')).toBe(false)
    await hexInput(w2).setValue('')
    await hexInput(w2).trigger('blur')
    expect(w2.props('modelValue')).toBe('#123456')
    expect((hexInput(w2).element as HTMLInputElement).value).toBe('#123456')
  })

  it('disabled 時不開啟', async () => {
    const w = mountPicker({ disabled: true })
    await open(w)
    expect(w.find('[role="dialog"]').exists()).toBe(false)
  })

  it('errorText → aria-invalid', () => {
    const w = mountPicker({ errorText: '請選擇顏色' })
    expect(trigger(w).attributes('aria-invalid')).toBe('true')
    expect(w.find(`#${trigger(w).attributes('aria-describedby')}`).text()).toBe('請選擇顏色')
  })
})
