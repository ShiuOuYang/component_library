/* eslint-disable vue/one-component-per-file -- 測試裡就地定義自訂欄位元件 */
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChptSchemaForm, { type SchemaFormField } from '@/components/library/ui/ChptSchemaForm.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

type Api = {
  validate: () => Promise<{ valid: boolean; errors: Record<string, string> }>
  validateField: (f: string) => Promise<{ valid: boolean; errors: Record<string, string> }>
  resetFields: () => void
  clearValidate: () => void
  submit: () => Promise<void>
}

const inspectionFields = (): SchemaFormField[] => [
  { type: 'section', label: '基本資料', hint: '工單與檢驗站' },
  { prop: 'wo', label: '工單', required: true, props: { placeholder: 'WO-' } },
  { prop: 'qty', label: '抽樣數', type: 'number', defaultValue: 5, props: { min: 1 } },
  { prop: 'result', label: '判定', type: 'radio', options: [{ label: 'OK', value: 'OK' }, { label: 'NG', value: 'NG' }], defaultValue: 'OK' },
  {
    prop: 'defect.reason',
    label: '不良原因',
    type: 'select',
    required: true,
    options: [{ label: '刮傷', value: 'scratch' }, { label: '異物', value: 'particle' }],
    visible: (m) => m.result === 'NG',
  },
  { prop: 'flags', label: '標記', type: 'checkbox', options: [{ label: '急件', value: 'rush' }, { label: '重工', value: 'rework' }] },
  { prop: 'recheck', label: '需複驗', type: 'switch' },
  { prop: 'note', label: '備註', type: 'textarea', span: 'full' },
]

function mountForm(props: Record<string, unknown> = {}, model: Record<string, unknown> = reactive({}), slots: Record<string, unknown> = {}) {
  const formRef = ref<Api | null>(null)
  wrapper = mount(
    defineComponent({
      setup: () => () => h(ChptSchemaForm, { ref: formRef, model, fields: inspectionFields(), ...props }, slots),
    }),
    { attachTo: document.body }
  )
  return { w: wrapper, model, api: () => formRef.value! }
}

const labels = (w: VueWrapper) => w.findAll('.chpt-form-item > label, .chpt-form-item > span[id]').map((l) => l.text().replace('*', '').trim())

describe('ChptSchemaForm', () => {
  it('依設定產生欄位：區段標題、各種輸入元件、標籤與必填標記', async () => {
    const { w } = mountForm()
    await nextTick()
    expect(w.find('h3').text()).toBe('基本資料')
    expect(w.text()).toContain('工單與檢驗站')
    // 不良原因預設隱藏（判定 = OK）
    expect(labels(w)).toEqual(['工單', '抽樣數', '判定', '標記', '需複驗', '備註'])
    expect(w.find('input[placeholder="WO-"]').attributes('aria-required')).toBe('true')
    expect(w.find('textarea').exists()).toBe(true)
    expect(w.findAll('input[type="radio"]')).toHaveLength(2)
    expect(w.findAll('input[type="checkbox"]:not([role="switch"])')).toHaveLength(2)
    expect(w.find('[role="switch"]').exists()).toBe(true)
    expect(w.find('button[type="submit"]').text()).toBe('送出')
    expect(w.find('button[type="reset"]').text()).toBe('重設')
  })

  it('model 裡沒有的欄位補上初始值（defaultValue / 依種類的空值）；巢狀路徑自動建立', async () => {
    const { model } = mountForm()
    expect(model).toMatchObject({ wo: '', qty: 5, result: 'OK', flags: [], recheck: false, note: '' })
    expect(model.defect).toBeUndefined() // select 沒有 defaultValue 時保持 undefined
    // 已有的值不覆蓋
    const kept = reactive<Record<string, unknown>>({ qty: 20 })
    wrapper!.unmount()
    mountForm({}, kept)
    expect(kept.qty).toBe(20)
  })

  it('輸入寫回 model 並送出 change；條件顯示的欄位跟著出現', async () => {
    const { w, model } = mountForm()
    await w.find('input[placeholder="WO-"]').setValue('WO-001')
    expect(model.wo).toBe('WO-001')
    expect(w.findComponent(ChptSchemaForm).emitted('change')![0]).toEqual(['wo', 'WO-001'])
    await w.findAll('input[type="radio"]')[1].setValue(true)
    expect(model.result).toBe('NG')
    await nextTick()
    expect(labels(w)).toContain('不良原因')
  })

  it('驗證：欄位 required 與 rules；隱藏的欄位不驗證；通過時送出 submit', async () => {
    const { w, model, api } = mountForm({ rules: { qty: [{ type: 'number', min: 3, message: '至少抽 3 件' }] } })
    await nextTick()
    let r = await api().validate()
    await flushPromises()
    expect(r.errors).toEqual({ wo: '請輸入工單' })

    model.wo = 'WO-1'
    model.qty = 1
    model.result = 'NG'
    await nextTick()
    r = await api().validate()
    await flushPromises()
    expect(Object.keys(r.errors).sort()).toEqual(['defect.reason', 'qty'])
    expect(r.errors.qty).toBe('至少抽 3 件')
    expect(r.errors['defect.reason']).toBe('請選擇不良原因')

    model.qty = 3
    model.defect = { reason: 'scratch' }
    await nextTick()
    await api().submit()
    await flushPromises()
    expect(w.findComponent(ChptSchemaForm).emitted('submit')).toHaveLength(1)
  })

  it('clearHidden：欄位被隱藏時清掉它的值', async () => {
    const model = reactive<Record<string, unknown>>({ result: 'NG', defect: { reason: 'scratch' } })
    mountForm({ clearHidden: true }, model)
    await nextTick()
    model.result = 'OK'
    await nextTick()
    expect((model.defect as Record<string, unknown>).reason).toBeUndefined()
  })

  it('不開 clearHidden 時隱藏的欄位保留值', async () => {
    const model = reactive<Record<string, unknown>>({ result: 'NG', defect: { reason: 'scratch' } })
    mountForm({}, model)
    model.result = 'OK'
    await nextTick()
    expect((model.defect as Record<string, unknown>).reason).toBe('scratch')
  })

  it('disabled（布林或依資料決定）；整張表單 disabled', async () => {
    const fields: SchemaFormField[] = [
      { prop: 'a', label: 'A', disabled: (m) => m.lock === true },
      { prop: 'r', label: 'R', type: 'radio', disabled: true, options: [{ label: 'x', value: 'x' }] },
    ]
    const model = reactive<Record<string, unknown>>({ lock: true })
    const { w } = mountForm({ fields }, model)
    await nextTick()
    expect(w.find('input[type="text"]').attributes('disabled')).toBeDefined()
    expect(w.find('input[type="radio"]').attributes('disabled')).toBeDefined()
    model.lock = false
    await nextTick()
    expect(w.find('input[type="text"]').attributes('disabled')).toBeUndefined()
  })

  it('options 可依目前的資料決定（依線別列出機台）', async () => {
    const machines: Record<string, string[]> = { L1: ['M-101', 'M-102'], L2: ['M-201'] }
    const fields: SchemaFormField[] = [
      { prop: 'line', label: '線別', type: 'select', options: [{ label: 'L1', value: 'L1' }, { label: 'L2', value: 'L2' }] },
      { prop: 'machine', label: '機台', type: 'select', options: (m) => (machines[m.line as string] ?? []).map((v) => ({ label: v, value: v })) },
    ]
    const model = reactive<Record<string, unknown>>({ line: 'L1' })
    const { w } = mountForm({ fields }, model)
    await nextTick()
    const selectOf = () => w.findAll('.chpt-schema-cell')[1]
    expect(selectOf().html()).toContain('M-101')
    model.line = 'L2'
    await nextTick()
    expect(selectOf().html()).toContain('M-201')
    expect(selectOf().html()).not.toContain('M-101')
  })

  it('#field-{prop} 插槽自己畫欄位；component 給自訂元件', async () => {
    const Stars = defineComponent({
      props: { modelValue: { type: Number, default: 0 } },
      emits: ['update:modelValue'],
      setup: (p, { emit }) => () => h('button', { type: 'button', class: 'stars', onClick: () => emit('update:modelValue', p.modelValue + 1) }, String(p.modelValue)),
    })
    const fields: SchemaFormField[] = [
      { prop: 'lot', label: '批號' },
      { prop: 'score', label: '評分', component: Stars, defaultValue: 0 },
    ]
    const model = reactive<Record<string, unknown>>({})
    const { w } = mountForm({ fields }, model, {
      'field-lot': ({ value, setValue }: { value: string; setValue: (v: unknown) => void }) =>
        h('input', { class: 'lot', value, onInput: (e: Event) => setValue((e.target as HTMLInputElement).value.toUpperCase()) }),
    })
    await w.find('input.lot').setValue('ab12')
    expect(model.lot).toBe('AB12')
    await w.find('button.stars').trigger('click')
    expect(model.score).toBe(1)
  })

  it('columns 與 span：寫成 CSS 變數；span 不超過欄數', async () => {
    const fields: SchemaFormField[] = [
      { prop: 'a', label: 'A' },
      { prop: 'b', label: 'B', span: 5 },
      { prop: 'c', label: 'C', span: 'full' },
    ]
    const { w } = mountForm({ fields, columns: 3 })
    expect((w.find('.chpt-schema-form').element as HTMLElement).style.getPropertyValue('--chpt-schema-cols')).toBe('3')
    const spans = w.findAll('.chpt-schema-cell').map((c) => (c.element as HTMLElement).style.getPropertyValue('--chpt-schema-span'))
    expect(spans).toEqual(['1', '3', '3'])
  })

  it('#actions 插槽與 showActions=false；重設還原初始值', async () => {
    const { w, model, api } = mountForm({ showActions: false })
    expect(w.find('button[type="submit"]').exists()).toBe(false)
    await nextTick()
    model.wo = 'WO-9'
    api().resetFields()
    expect(model.wo).toBe('')
    wrapper!.unmount()
    const { w: w2 } = mountForm({}, reactive({}), { actions: () => h('button', { class: 'mine' }, 'go') })
    expect(w2.find('button.mine').exists()).toBe(true)
  })

  it('語系：enUS', async () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptSchemaForm, { model: reactive({}), fields: [] })) }, { attachTo: document.body })
    expect(wrapper.find('button[type="submit"]').text()).toBe('Submit')
    expect(wrapper.find('button[type="reset"]').text()).toBe('Reset')
  })
})
