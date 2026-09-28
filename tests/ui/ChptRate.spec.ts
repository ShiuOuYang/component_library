import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptRate from '@/components/library/ui/ChptRate.vue'
import ChptForm from '@/components/library/ui/ChptForm.vue'
import ChptFormItem from '@/components/library/ui/ChptFormItem.vue'

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountRate(props: Record<string, unknown> = {}) {
  const w = mount(ChptRate, {
    props: { ...props, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }) },
    attachTo: document.body,
  })
  wrapper = w
  return w
}

const radios = (w: ReturnType<typeof mount>) => w.findAll('[role="radio"]')
const press = async (w: ReturnType<typeof mount>, key: string) => {
  await w.find('[role="radiogroup"]').trigger('keydown', { key })
  await nextTick()
}

describe('ChptRate', () => {
  it('radiogroup，每顆星是 radio；名稱預設「n 星」', () => {
    const w = mountRate({ modelValue: 3 })
    expect(w.find('[role="radiogroup"]').attributes('aria-label')).toBe('評分')
    expect(radios(w)).toHaveLength(5)
    expect(radios(w)[0].attributes('aria-label')).toBe('1 星')
    expect(radios(w).map((r) => r.attributes('aria-checked'))).toEqual(['false', 'false', 'true', 'false', 'false'])
  })

  it('只有一個 Tab 停駐點：目前分數；未評分時是第一顆', async () => {
    const w = mountRate({ modelValue: 0 })
    expect(radios(w).map((r) => r.attributes('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1'])
    await w.setProps({ modelValue: 4 })
    expect(radios(w)[3].attributes('tabindex')).toBe('0')
  })

  it('點星星設定分數；allowClear 時再點一次清成 0', async () => {
    const w = mountRate({ modelValue: 0 })
    await radios(w)[3].trigger('click')
    expect(w.props('modelValue')).toBe(4)
    await radios(w)[3].trigger('click')
    expect(w.props('modelValue')).toBe(0)
    expect(w.emitted('change')).toEqual([[4], [0]])
  })

  it('allowClear=false 時再點不會清除', async () => {
    const w = mountRate({ modelValue: 2, allowClear: false })
    await radios(w)[1].trigger('click')
    expect(w.props('modelValue')).toBe(2)
  })

  it('方向鍵直接改分數並移動焦點；Home / End；Delete 清除', async () => {
    const w = mountRate({ modelValue: 2 })
    ;(radios(w)[1].element as HTMLElement).focus()
    await press(w, 'ArrowRight')
    expect(w.props('modelValue')).toBe(3)
    await nextTick()
    expect(document.activeElement).toBe(radios(w)[2].element)
    await press(w, 'ArrowDown')
    expect(w.props('modelValue')).toBe(2)
    await press(w, 'End')
    expect(w.props('modelValue')).toBe(5)
    await press(w, 'ArrowRight')
    expect(w.props('modelValue')).toBe(5) // 不超過
    await press(w, 'Home')
    expect(w.props('modelValue')).toBe(1)
    await press(w, 'ArrowLeft')
    expect(w.props('modelValue')).toBe(1) // 不小於 1
    await press(w, 'Delete')
    expect(w.props('modelValue')).toBe(0)
  })

  it('未評分時 Space 選取聚焦的那顆', async () => {
    const w = mountRate({ modelValue: 0 })
    await radios(w)[0].trigger('keydown', { key: ' ' })
    expect(w.props('modelValue')).toBe(1)
  })

  it('texts 當每顆星的名稱；showText 顯示目前文字（滑過時預覽）', async () => {
    const texts = ['很差', '差', '普通', '好', '很好']
    const w = mountRate({ modelValue: 3, texts, showText: true })
    expect(radios(w)[4].attributes('aria-label')).toBe('很好')
    expect(w.text()).toContain('普通')
    await radios(w)[4].trigger('mouseenter')
    expect(w.text()).toContain('很好')
    await w.find('[role="radiogroup"]').trigger('mouseleave')
    expect(w.text()).toContain('普通')
  })

  it('readonly：role=img，一次唸出分數', () => {
    const w = mountRate({ modelValue: 4, readonly: true, texts: ['1', '2', '3', '良好', '5'] })
    expect(w.find('[role="radio"]').exists()).toBe(false)
    expect(w.attributes('role')).toBe('img')
    expect(w.attributes('aria-label')).toBe('評分 4 / 5（良好）')
  })

  it('disabled：不能操作、沒有 Tab 停駐點', async () => {
    const w = mountRate({ modelValue: 2, disabled: true })
    expect(radios(w).every((r) => r.attributes('tabindex') === '-1')).toBe(true)
    await radios(w)[4].trigger('click')
    await press(w, 'ArrowRight')
    expect(w.props('modelValue')).toBe(2)
  })

  it('count 與實心 / 空心', () => {
    const w = mountRate({ modelValue: 2, count: 10 })
    expect(radios(w)).toHaveLength(10)
    const icons = w.findAll('.material-symbols-outlined')
    expect(icons[1].attributes('style')).toContain("'FILL' 1")
    expect(icons[2].attributes('style')).toContain("'FILL' 0")
  })

  it('放在 ChptFormItem 裡時以標籤命名（aria-labelledby），驗證錯誤帶 aria-invalid', async () => {
    const model = { score: 0 }
    const w = mount({
      components: { ChptForm, ChptFormItem, ChptRate },
      data: () => ({ model, rules: { score: [{ validator: (v: number) => v > 0 || '請評分' }] } }),
      template: `<ChptForm ref="form" :model="model" :rules="rules"><ChptFormItem prop="score" label="滿意度"><ChptRate v-model="model.score" /></ChptFormItem></ChptForm>`,
    }, { attachTo: document.body })
    wrapper = w
    const group = w.find('[role="radiogroup"]')
    const labelId = group.attributes('aria-labelledby')!
    expect(w.find(`#${labelId}`).text()).toContain('滿意度')
    expect(group.attributes('aria-label')).toBeUndefined()
    await (w.vm.$refs.form as { validate: () => Promise<unknown> }).validate()
    await nextTick()
    expect(w.find('[role="radiogroup"]').attributes('aria-invalid')).toBe('true')
    expect(w.find(`#${w.find('[role="radiogroup"]').attributes('aria-describedby')}`).text()).toBe('請評分')
  })
})
