import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptSlider from '@/components/library/ui/ChptSlider.vue'
import ChptSegmented from '@/components/library/ui/ChptSegmented.vue'

describe('ChptSlider', () => {
  it('原生 range：拖曳時送 update:modelValue，放開時送 change', async () => {
    const w = mount(ChptSlider, { props: { modelValue: 20, min: 0, max: 50, step: 5 } })
    const input = w.find('input[type="range"]')
    expect(input.attributes('min')).toBe('0')
    expect(input.attributes('max')).toBe('50')
    expect(input.attributes('step')).toBe('5')
    await input.setValue('35')
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([35])
    await input.trigger('change')
    expect(w.emitted('change')?.at(-1)).toEqual([35])
  })

  it('已填滿的比例反映在 --fill', () => {
    const w = mount(ChptSlider, { props: { modelValue: 25, min: 0, max: 200 } })
    expect(w.find('input').attributes('style')).toContain('--fill: 12.5%')
  })

  it('值超出範圍時夾到範圍內顯示', () => {
    const w = mount(ChptSlider, { props: { modelValue: 999, max: 100, showValue: true } })
    expect((w.find('input').element as HTMLInputElement).value).toBe('100')
    expect(w.text()).toContain('100')
  })

  it('formatter 同時用於顯示與 aria-valuetext', () => {
    const w = mount(ChptSlider, {
      props: { modelValue: 80, showValue: true, formatter: (v: number) => `${v}%`, label: '良率門檻' },
    })
    expect(w.text()).toContain('80%')
    expect(w.find('input').attributes('aria-valuetext')).toBe('80%')
    expect(w.find('label').attributes('for')).toBe(w.find('input').attributes('id'))
  })

  it('刻度：物件或陣列都可以，依百分比定位', () => {
    const w = mount(ChptSlider, { props: { modelValue: 50, marks: { 0: '低', 50: '中', 100: '高' } } })
    const marks = w.findAll('span.absolute')
    expect(marks.map((m) => m.text())).toEqual(['低', '中', '高'])
    expect(marks[1].attributes('style')).toContain('left: 50%')
  })

  it('禁用', () => {
    const w = mount(ChptSlider, { props: { disabled: true } })
    expect(w.find('input').attributes('disabled')).toBeDefined()
  })
})

describe('ChptSegmented', () => {
  const options = ['日', '週', '月']

  function mountModel(props: Record<string, unknown> = {}) {
    const w = mount(ChptSegmented, {
      props: {
        options,
        modelValue: '週',
        ...props,
        'onUpdate:modelValue': (v: string) => w.setProps({ modelValue: v }),
      },
      attachTo: document.body,
    })
    return w
  }

  it('radiogroup / radio 語意，選取中的 aria-checked', () => {
    const w = mountModel({ ariaLabel: '期間' })
    expect(w.attributes('role')).toBe('radiogroup')
    expect(w.attributes('aria-label')).toBe('期間')
    const radios = w.findAll('[role="radio"]')
    expect(radios.map((r) => r.attributes('aria-checked'))).toEqual(['false', 'true', 'false'])
    w.unmount()
  })

  it('整組只有一個 Tab 停駐點（選取中的那一個）', () => {
    const w = mountModel()
    expect(w.findAll('[role="radio"]').map((r) => r.attributes('tabindex'))).toEqual(['-1', '0', '-1'])
    w.unmount()
  })

  it('點擊選取並送出 change；再點同一個不重複送', async () => {
    const w = mountModel()
    await w.findAll('button')[2].trigger('click')
    expect(w.emitted('change')).toEqual([['月']])
    await w.findAll('button')[2].trigger('click')
    expect(w.emitted('change')).toHaveLength(1)
    w.unmount()
  })

  it('方向鍵移動並選取、頭尾循環、略過停用項', async () => {
    const w = mountModel({
      options: [{ label: '日', value: 'd' }, { label: '週', value: 'w', disabled: true }, { label: '月', value: 'm' }],
      modelValue: 'd',
    })
    const buttons = () => w.findAll('button')
    await buttons()[0].trigger('keydown', { key: 'ArrowRight' })
    expect(w.props('modelValue')).toBe('m') // 略過停用的「週」
    await buttons()[2].trigger('keydown', { key: 'ArrowRight' })
    expect(w.props('modelValue')).toBe('d') // 循環
    await buttons()[0].trigger('keydown', { key: 'End' })
    expect(w.props('modelValue')).toBe('m')
    await nextTick()
    expect(document.activeElement).toBe(buttons()[2].element)
    w.unmount()
  })

  it('沒有選取值時第一個可用的選項可以 Tab 進來', () => {
    const w = mountModel({ modelValue: undefined })
    expect(w.findAll('[role="radio"]')[0].attributes('tabindex')).toBe('0')
    w.unmount()
  })

  it('停用的整組不能選', async () => {
    const w = mountModel({ disabled: true })
    await w.findAll('button')[0].trigger('click')
    expect(w.emitted('change')).toBeUndefined()
    w.unmount()
  })

  it('每顆按鈕都有 type="button"', () => {
    const w = mountModel()
    for (const b of w.findAll('button')) expect(b.attributes('type')).toBe('button')
    w.unmount()
  })
})
