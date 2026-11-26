import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptMaskedInput from '@/components/library/ui/ChptMaskedInput.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import ChptForm from '@/components/library/ui/ChptForm.vue'
import ChptFormItem from '@/components/library/ui/ChptFormItem.vue'
import { enUS } from '@/components/library/shared/locale'
import { MASK_PRESETS, validIPv4 } from '@/components/library/shared/inputMask'

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const model = ref<string>((props.modelValue as string) ?? '')
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  const node = () =>
    h(ChptMaskedInput, {
      mask: 'SN-####-AAAA',
      ...props,
      modelValue: model.value,
      'onUpdate:modelValue': (v: string) => (rec('model')(v), (model.value = v)),
      onAccept: rec('accept'),
      onComplete: rec('complete'),
      onReject: rec('reject'),
      onEnter: rec('enter'),
      onClear: rec('clear'),
      onFocus: rec('focus'),
      onBlur: rec('blur'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const input = () => w.find('input').element as HTMLInputElement
  /** 模擬在游標處打字 / 貼上：改輸入框內容、放好游標、送 input 事件 */
  async function type(text: string, at?: number) {
    const el = input()
    el.focus()
    const pos = at ?? el.selectionStart ?? el.value.length
    const end = at ?? el.selectionEnd ?? pos
    el.value = el.value.slice(0, pos) + text + el.value.slice(end)
    el.setSelectionRange(pos + text.length, pos + text.length)
    await w.find('input').trigger('input')
  }
  async function key(k: string, opts: Record<string, unknown> = {}) {
    input().focus()
    await w.find('input').trigger('keydown', { key: k, ...opts })
  }
  return { w, model, emitted, input, type, key }
}

describe('ChptMaskedInput', () => {
  it('打字時自動補分隔符號、游標放對、填完送 complete', async () => {
    const { w, model, emitted, input, type } = mountIt({ uppercase: true, label: '序號' })
    expect(input().getAttribute('placeholder')).toBe('SN-____-____')
    expect(w.find('label').text()).toBe('序號')
    await type('12')
    expect(input().value).toBe('SN-12')
    expect(input().selectionStart).toBe(5)
    expect(model.value).toBe('SN-12')
    // 聚焦時顯示還沒填的位置
    expect(w.find('[data-ghost]').text()).toBe('SN-12__-____')
    expect(input().getAttribute('placeholder')).toBe('')
    await type('34ab')
    expect(input().value).toBe('SN-1234-AB')
    expect(input().selectionStart).toBe(10)
    await type('cd')
    expect(model.value).toBe('SN-1234-ABCD')
    expect(emitted.complete).toEqual([{ masked: 'SN-1234-ABCD', raw: '1234ABCD', complete: true }])
    expect(w.find('[data-live]').text()).toBe('已填完')
    expect((emitted.accept as unknown[]).length).toBe(3)
    // 已滿：再打也不變、也不送 update
    await type('9')
    expect(input().value).toBe('SN-1234-ABCD')
    expect((emitted.model as unknown[]).length).toBe(3)
  })

  it('擋掉不合格式的字元：reject、提示、短暫變色；分隔符號不算', async () => {
    vi.useFakeTimers()
    try {
      const { w, emitted, input, type } = mountIt()
      await type('1x')
      expect(input().value).toBe('SN-1')
      expect(emitted.reject).toEqual([{ char: 'x', kind: 'digit' }])
      expect(w.find('[data-live]').text()).toBe('這裡只能輸入數字')
      expect(input().className).toContain('border-warning')
      vi.advanceTimersByTime(700)
      await nextTick()
      expect(input().className).not.toContain('border-warning')
      await type('-')
      expect((emitted.reject as unknown[]).length).toBe(1)
      // 自訂字元的 kind
      const c = mountIt({ mask: 'QQ', tokens: { Q: { pattern: /[qr]/, kind: 'q 或 r' } } })
      await c.type('z')
      expect(c.w.find('[data-live]').text()).toBe('這裡只能輸入q 或 r')
      const d = mountIt({ mask: 'QQ', tokens: { Q: { pattern: /[qr]/ } } })
      await d.type('z')
      expect(d.w.find('[data-live]').text()).toBe('這裡只能輸入非空白字元')
    } finally {
      vi.useRealTimers()
    }
  })

  it('在中間插入、貼上整串（清掉多餘符號）', async () => {
    const { input, model, type, emitted } = mountIt({ uppercase: true })
    await type('sn 1234 / abcd')
    expect(model.value).toBe('SN-1234-ABCD')
    // 在 3 之前插入 9：後面往後擠，4 被擠到字母的位置、丟掉（不算使用者打錯）
    input().setSelectionRange(5, 5)
    await type('9', 5)
    expect(input().value).toBe('SN-1293-ABCD')
    expect(input().selectionStart).toBe(6)
    expect(emitted.reject).toEqual([{ char: '/', kind: 'letter' }]) // 只有貼上時的 /
  })

  it('Backspace / Delete 跳過分隔符號；選取範圍刪除；到頭了不動', async () => {
    const { input, model, key, type } = mountIt({ modelValue: 'SN-1234-AB' })
    expect(input().value).toBe('SN-1234-AB')
    input().focus()
    input().setSelectionRange(8, 8) // - 後面
    await key('Backspace')
    expect(input().value).toBe('SN-123')
    expect(model.value).toBe('SN-123')
    expect(input().selectionStart).toBe(6)
    await type('4-AB')
    input().setSelectionRange(7, 7) // - 前面
    await key('Delete')
    expect(input().value).toBe('SN-1234-B')
    expect(input().selectionStart).toBe(7)
    input().setSelectionRange(3, 5)
    await key('Backspace')
    expect(input().value).toBe('SN-34')
    expect(input().selectionStart).toBe(3)
    input().setSelectionRange(3, 3)
    await key('Backspace')
    expect(input().value).toBe('SN-34')
    // Ctrl + Backspace 交給瀏覽器
    const ev = new KeyboardEvent('keydown', { key: 'Backspace', ctrlKey: true, cancelable: true })
    input().dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
    // 刪光
    input().setSelectionRange(0, 5)
    await key('Delete')
    expect(model.value).toBe('')
  })

  it('unmask：v-model 只有填入字元；外部改值；多個格式自動選', async () => {
    const { input, model, type, emitted } = mountIt({ mask: ['####-####', '(##) ####-####'], unmask: true, modelValue: '0212345678' })
    expect(input().value).toBe('(02) 1234-5678')
    expect(input().getAttribute('inputmode')).toBe('numeric')
    // 有值時不顯示 placeholder（改由提示層顯示）；空的時候用最長的格式當樣板
    expect(input().getAttribute('placeholder')).toBe('')
    expect(mountIt({ mask: ['####-####', '(##) ####-####'] }).input().getAttribute('placeholder')).toBe('(__) ____-____')
    model.value = '1234'
    await nextTick()
    expect(input().value).toBe('1234')
    await type('5678')
    expect(input().value).toBe('1234-5678')
    expect(model.value).toBe('12345678')
    expect(emitted.complete).toEqual([{ masked: '1234-5678', raw: '12345678', complete: true }])
    await type('90')
    expect(input().value).toBe('(12) 3456-7890')
    expect(model.value).toBe('1234567890')
    // 換格式
    const tw = mountIt({ mask: MASK_PRESETS.twMobile, unmask: true, modelValue: '12345678' })
    expect(tw.input().value).toBe('0912-345-678')
  })

  it('validate：IP 填完但數值不對時標紅、不送 complete', async () => {
    const { input, type, emitted, w } = mountIt({ mask: MASK_PRESETS.ipv4, validate: validIPv4, showMask: false })
    expect(input().getAttribute('placeholder')).toBe('')
    await type('192.168.1.300')
    expect(input().value).toBe('192.168.1.300')
    expect(input().getAttribute('aria-invalid')).toBe('true')
    expect(emitted.complete).toBeUndefined()
    expect(w.find('[data-ghost]').exists()).toBe(false)
    input().setSelectionRange(13, 13)
    await w.find('input').trigger('keydown', { key: 'Backspace' })
    await w.find('input').trigger('keydown', { key: 'Backspace' })
    await type('0')
    expect(input().value).toBe('192.168.1.30')
    expect(input().getAttribute('aria-invalid')).toBeNull()
    expect((emitted.complete as { masked: string }[])[0].masked).toBe('192.168.1.30')
  })

  it('逐字輸入：自己打的分隔符號後游標放在後面；跨格式時游標不錯位', async () => {
    const ip = mountIt({ mask: MASK_PRESETS.ipv4 })
    for (const c of '10.0.30.1') await ip.type(c)
    expect(ip.input().value).toBe('10.0.30.1')
    expect(ip.input().selectionStart).toBe(9)
    // 填完：可省略的位置不再顯示底線
    expect(ip.w.find('[data-ghost]').text()).toBe('10.0.30.1')
    const ph = mountIt({ mask: ['####-####', '(##) ####-####'] })
    for (const c of '0223456789') await ph.type(c)
    expect(ph.input().value).toBe('(02) 2345-6789')
    expect(ph.input().selectionStart).toBe(14)
  })

  it('Enter、清除、focus / blur、停用與唯讀、輸入法組字中不處理', async () => {
    const { w, input, type, key, emitted, model } = mountIt({ clearable: true, prefixIcon: 'qr_code' })
    await type('12')
    await key('Enter')
    expect(emitted.enter).toEqual([{ masked: 'SN-12', raw: '12', complete: false }])
    expect(input().className).toContain('pl-8')
    expect(input().className).toContain('pr-8')
    await w.find('button').trigger('click')
    expect(model.value).toBe('')
    expect(emitted.clear).toHaveLength(1)
    expect(input().value).toBe('')
    expect(document.activeElement).toBe(input())
    await w.find('input').trigger('blur')
    expect(emitted.blur).toHaveLength(1)
    expect(emitted.focus!.length).toBeGreaterThan(0)
    // 組字中：不改輸入框
    await w.find('input').trigger('compositionstart')
    input().value = '1'
    await w.find('input').trigger('input')
    expect(model.value).toBe('')
    await key('Backspace', { isComposing: true })
    input().setSelectionRange(1, 1)
    await w.find('input').trigger('compositionend')
    expect(model.value).toBe('SN-1')
    // 唯讀：Backspace 不攔
    const ro = mountIt({ readonly: true, modelValue: 'SN-12' })
    const ev = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true })
    ro.input().dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
    expect(ro.w.find('button').exists()).toBe(false)
    const dis = mountIt({ disabled: true, modelValue: 'SN-12', clearable: true })
    expect(dis.input().disabled).toBe(true)
    expect(dis.w.find('[data-ghost]').exists()).toBe(false)
    // 其他按鍵不處理
    const other = new KeyboardEvent('keydown', { key: 'a', cancelable: true })
    input().dispatchEvent(other)
    expect(other.defaultPrevented).toBe(false)
  })

  it('ref 方法、尺寸、非等寬、空格式、英文語系、表單驗證', async () => {
    const { w } = mountIt({ size: 'lg', mono: false, mask: [] as string[], placeholder: '自訂' })
    const input = w.find('input')
    expect(input.classes()).toContain('h-control-lg')
    expect(input.classes()).not.toContain('font-mono')
    expect(input.attributes('placeholder')).toBe('自訂')
    const r = mountIt({ modelValue: 'SN-12', size: 'xs' })
    const vm = r.w.findComponent(ChptMaskedInput).vm as unknown as {
      focus: () => void
      clear: () => void
      value: () => { masked: string; raw: string; complete: boolean }
      maskIndex: () => number
    }
    expect(vm.value()).toEqual({ masked: 'SN-12', raw: '12', complete: false })
    expect(vm.maskIndex()).toBe(0)
    vm.focus()
    expect(document.activeElement).toBe(r.input())
    vm.clear()
    await nextTick()
    expect(r.model.value).toBe('')
    for (const s of ['sm', 'md', 'xl']) expect(mountIt({ size: s }).w.find('input').classes()).toContain(`h-control-${s}`)
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.find('.sr-only').text()).toBe('Format: SN-____-____')
    await en.type('x')
    expect(en.w.find('[data-live]').text()).toBe('Only digits allowed here')
    // 放在表單裡：label 的 for 與錯誤提示
    const form = mount(
      {
        render: () =>
          h(ChptForm, { model: { sn: '' }, rules: { sn: [{ required: true, message: '必填' }] } }, () =>
            h(ChptFormItem, { label: '序號', prop: 'sn' }, () => h(ChptMaskedInput, { mask: '##' }))
          ),
      },
      { attachTo: document.body }
    )
    mounted.push(form)
    const id = form.find('input').attributes('id')
    expect(form.find(`label[for="${id}"]`).exists()).toBe(true)
  })

  it('輸入框捲動時提示層跟著捲', async () => {
    const { w, input, type } = mountIt({ mask: '#'.repeat(40) })
    await type('1')
    input().scrollLeft = 30
    await w.find('input').trigger('scroll')
    expect((w.find('[data-ghost]').element as HTMLElement).scrollLeft).toBe(input().scrollLeft)
  })
})
