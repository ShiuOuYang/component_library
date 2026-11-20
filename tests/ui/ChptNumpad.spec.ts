import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptNumpad from '@/components/library/ui/ChptNumpad.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

let wrapper: VueWrapper | null = null
const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  wrapper = null
  vi.useRealTimers()
})

function mountPad(props: Record<string, unknown> = {}) {
  const model = ref<number | null>((props.modelValue as number | null | undefined) ?? null)
  wrapper = mount(
    {
      render: () =>
        h(ChptNumpad, {
          ...props,
          modelValue: model.value,
          'onUpdate:modelValue': (v: number | null) => (model.value = v),
        }),
    },
    { attachTo: document.body }
  )
  mounted.push(wrapper)
  const pad = () => wrapper!.findComponent(ChptNumpad)
  const key = (label: string) => {
    const b = wrapper!.findAll('button').find((x) => x.text() === label || x.attributes('aria-label') === label)
    if (!b) throw new Error(`no key ${label}`)
    return b
  }
  const tap = async (...labels: string[]) => {
    for (const l of labels) await key(l).trigger('click')
  }
  const display = () => wrapper!.find('output').text()
  const root = () => wrapper!.find('[role="group"]')
  return { model, pad, key, tap, display, root }
}

describe('ChptNumpad', () => {
  it('按數字、確定後才更新 v-model 並送出 confirm', async () => {
    const { model, pad, tap, display } = mountPad()
    await tap('1', '2', '5')
    expect(display()).toBe('125')
    expect(model.value).toBeNull()
    expect(pad().emitted('input')!.map((e) => e[0])).toEqual([1, 12, 125])
    await tap('確定')
    expect(model.value).toBe(125)
    expect(pad().emitted('confirm')![0]).toEqual([125])
  })

  it('原本的值是選取狀態：按數字取代、按刪除修改', async () => {
    const { tap, display } = mountPad({ modelValue: 480 })
    expect(display()).toBe('480')
    expect(wrapper!.find('output span').classes()).toContain('bg-accent-subtle')
    await tap('7')
    expect(display()).toBe('7')
    const r = mountPad({ modelValue: 480 })
    await r.tap('刪除一位')
    expect(r.display()).toBe('48')
  })

  it('超出範圍：顯示原因、不送出、不夾限；再按鍵清掉錯誤', async () => {
    const { model, pad, tap, display } = mountPad({ min: 10, max: 500, unit: 'pcs' })
    expect(wrapper!.text()).toContain('範圍 10 pcs – 500 pcs')
    await tap('6', '0', '0', '確定')
    expect(model.value).toBeNull()
    expect(pad().emitted('confirm')).toBeUndefined()
    expect(wrapper!.find('[role="alert"]').text()).toBe('不能大於 500 pcs')
    expect(display()).toBe('600')
    await tap('刪除一位')
    expect(wrapper!.find('[role="alert"]').text()).toBe('')
    await tap('清除', '5', '確定')
    expect(wrapper!.find('[role="alert"]').text()).toBe('不能小於 10 pcs')
  })

  it('空白：預設不能確定；allowEmpty 時送出 null', async () => {
    const { pad, tap } = mountPad()
    await tap('確定')
    expect(wrapper!.find('[role="alert"]').text()).toBe('請輸入數值')
    expect(pad().emitted('confirm')).toBeUndefined()
    const r = mountPad({ modelValue: 3, allowEmpty: true })
    await r.tap('清除', '確定')
    expect(r.model.value).toBeNull()
    expect(r.pad().emitted('confirm')![0]).toEqual([null])
  })

  it('precision 0 沒有小數點鍵；min < 0 才有 ± 鍵；0 鍵填滿剩下的欄', () => {
    const r = mountPad({ precision: 0 })
    expect(wrapper!.find('button[aria-label="小數點"]').exists()).toBe(false)
    expect(wrapper!.find('button[aria-label="正負號"]').exists()).toBe(false)
    expect(r.key('0').attributes('style')).toContain('span 3')
    mountPad({ min: -40, max: 120, precision: 1 })
    expect(wrapper!.find('button[aria-label="正負號"]').exists()).toBe(true)
    expect(wrapper!.find('button[aria-label="小數點"]').exists()).toBe(true)
  })

  it('負數與小數', async () => {
    const { model, tap } = mountPad({ min: -40, max: 120, precision: 1 })
    await tap('正負號', '1', '2', '小數點', '5', '7', '確定')
    expect(model.value).toBe(-12.5)
  })

  it('選取狀態按 ±：直接確定 = 變號；接著打數字 = 新的負數；原本就是負數時打數字為正數', async () => {
    const r = mountPad({ modelValue: 185.5, min: -40, max: 250 })
    await r.tap('正負號')
    expect(r.display()).toBe('-185.5')
    await r.tap('2', '0', '確定')
    expect(r.model.value).toBe(-20)
    await r.tap('正負號', '正負號', '3')
    expect(r.display()).toBe('3')
    await r.tap('正負號', '確定')
    expect(r.model.value).toBe(-3)
    await r.tap('7')
    expect(r.display()).toBe('7')
    await r.tap('清除', '正負號', '5')
    expect(r.display()).toBe('-5')
  })

  it('autofocus：掛載時聚焦', () => {
    const r = mountPad({ autofocus: true })
    expect(document.activeElement).toBe(r.root().element)
  })

  it('數字排列：calculator 789 在上、phone 123 在上', () => {
    mountPad()
    expect(wrapper!.findAll('button')[0].text()).toBe('7')
    mountPad({ layout: 'phone' })
    expect(wrapper!.findAll('button')[0].text()).toBe('1')
  })

  it('常用值：填入但不確定，接著按數字取代', async () => {
    const { model, tap, display } = mountPad({ quickValues: [50, 100] })
    await tap('100')
    expect(display()).toBe('100')
    expect(model.value).toBeNull()
    await tap('確定')
    expect(model.value).toBe(100)
  })

  it('實體鍵盤：數字、逗號小數點、Backspace、Delete、Enter；按住修飾鍵不處理', async () => {
    vi.useFakeTimers()
    const { model, root, display } = mountPad()
    for (const key of ['3', ',', '2', '5', 'Backspace']) await root().trigger('keydown', { key })
    expect(display()).toBe('3.2')
    expect(wrapper!.find('button[aria-label="刪除一位"]').classes()).toContain('bg-surface-tertiary')
    vi.advanceTimersByTime(200)
    await root().trigger('keydown', { key: 'a' })
    await root().trigger('keydown', { key: '1', ctrlKey: true })
    expect(display()).toBe('3.2')
    await root().trigger('keydown', { key: 'Enter' })
    expect(model.value).toBe(3.2)
    await root().trigger('keydown', { key: '9' })
    await root().trigger('keydown', { key: 'Delete' })
    expect(display()).toBe('0')
  })

  it('Esc：有改過時還原並攔下；沒改過時不攔（讓外層 Modal 關閉）', async () => {
    const { pad, root, tap, display } = mountPad({ modelValue: 42 })
    const outer = vi.fn()
    document.body.addEventListener('keydown', outer)
    await root().trigger('keydown', { key: 'Escape' })
    expect(outer).toHaveBeenCalledTimes(1)
    expect(pad().emitted('cancel')).toBeUndefined()
    await tap('9')
    await root().trigger('keydown', { key: 'Escape' })
    expect(outer).toHaveBeenCalledTimes(1)
    expect(display()).toBe('42')
    expect(pad().emitted('cancel')).toHaveLength(1)
    document.body.removeEventListener('keydown', outer)
  })

  it('外部改值：顯示新值', async () => {
    const { model, display } = mountPad({ modelValue: 1 })
    model.value = 77
    await wrapper!.vm.$nextTick()
    expect(display()).toBe('77')
  })

  it('點按鍵時焦點留在整組上', async () => {
    const { key, root } = mountPad()
    await key('5').trigger('pointerdown')
    expect(document.activeElement).toBe(root().element)
  })

  it('disabled / readonly：按鍵無作用，disabled 時不在 Tab 順序', async () => {
    const { tap, root, display, pad } = mountPad({ modelValue: 5, disabled: true })
    expect(root().attributes('tabindex')).toBe('-1')
    expect(wrapper!.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
    await root().trigger('keydown', { key: '1' })
    expect(display()).toBe('5')
    const r = mountPad({ modelValue: 5, readonly: true })
    ;(r.pad().vm as unknown as { clear: () => void }).clear()
    expect((r.pad().vm as unknown as { confirm: () => boolean }).confirm()).toBe(false)
    expect(r.display()).toBe('5')
    expect(pad().emitted('confirm')).toBeUndefined()
    void tap
  })

  it('showConfirm=false：沒有確定鍵，用 ref 的 confirm()；size / fullWidth', async () => {
    const { pad, tap, model } = mountPad({ showConfirm: false, size: 'lg', fullWidth: true })
    expect(wrapper!.findAll('button').some((b) => b.text() === '確定')).toBe(false)
    expect(wrapper!.find('[role="group"]').classes()).toContain('w-full')
    await tap('8')
    expect((pad().vm as unknown as { confirm: () => boolean }).confirm()).toBe(true)
    expect(model.value).toBe(8)
    ;(pad().vm as unknown as { focus: () => void }).focus()
    expect(document.activeElement).toBe(wrapper!.find('[role="group"]').element)
  })

  it('沒有 min / max 時只顯示一邊或不顯示範圍', () => {
    mountPad({ min: 0 })
    expect(wrapper!.text()).toContain('最小 0')
    mountPad({ max: 9 })
    expect(wrapper!.text()).toContain('最大 9')
  })

  it('語系：enUS', async () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptNumpad, { min: 1, max: 5 })) }, { attachTo: document.body })
    mounted.push(wrapper)
    expect(wrapper.find('[role="group"]').attributes('aria-label')).toBe('Number pad')
    expect(wrapper.text()).toContain('Range 1 – 5')
    expect(wrapper.text()).toContain('OK')
  })
})
