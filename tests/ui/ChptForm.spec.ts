import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick, reactive, ref } from 'vue'
import ChptForm from '@/components/library/ui/ChptForm.vue'
import ChptFormItem from '@/components/library/ui/ChptFormItem.vue'
import ChptInput from '@/components/library/ui/ChptInput.vue'
import ChptSelect from '@/components/library/ui/ChptSelect.vue'
import ChptInputNumber from '@/components/library/ui/ChptInputNumber.vue'
import ChptRadio from '@/components/library/ui/ChptRadio.vue'
import ChptDatePicker from '@/components/library/ui/ChptDatePicker.vue'
import {
  checkRule,
  getByPath,
  isEmptyValue,
  setByPath,
  validateValue,
} from '@/components/library/shared/formValidation'

// ---------------------------------------------------------------------------
// 規則（純函式）
// ---------------------------------------------------------------------------

describe('formValidation', () => {
  const m = {}

  it('空值判斷：空白字串、null、空陣列算沒填；0 與 false 算有填', () => {
    expect(isEmptyValue('  ')).toBe(true)
    expect(isEmptyValue(null)).toBe(true)
    expect(isEmptyValue([])).toBe(true)
    expect(isEmptyValue(0)).toBe(false)
    expect(isEmptyValue(false)).toBe(false)
  })

  it('required 用欄位名稱組出預設訊息，也可自訂', async () => {
    expect(await checkRule({ required: true }, '', m, '料號')).toBe('請輸入料號')
    expect(await checkRule({ required: true, message: '必填' }, null, m)).toBe('必填')
    expect(await checkRule({ required: true }, 'x', m)).toBe('')
  })

  /** 選填欄位留白不該出現「格式錯誤」 */
  it('選填欄位留白時不檢查格式與長度', async () => {
    expect(await checkRule({ type: 'email' }, '', m)).toBe('')
    expect(await checkRule({ min: 3 }, '', m)).toBe('')
  })

  it('type：email / url / number / integer', async () => {
    expect(await checkRule({ type: 'email' }, 'a@b', m)).toBe('電子郵件格式不正確')
    expect(await checkRule({ type: 'email' }, 'a@b.co', m)).toBe('')
    expect(await checkRule({ type: 'url' }, 'www.x.com', m)).toContain('網址')
    expect(await checkRule({ type: 'url' }, 'https://x.com', m)).toBe('')
    expect(await checkRule({ type: 'number' }, '1.5', m)).toBe('')
    expect(await checkRule({ type: 'number' }, 'abc', m)).toBe('請輸入數字')
    expect(await checkRule({ type: 'integer' }, 2.5, m)).toBe('請輸入整數')
  })

  it('min / max：字串與陣列看長度，數字看大小', async () => {
    expect(await checkRule({ min: 3 }, 'ab', m)).toBe('至少 3 個字')
    expect(await checkRule({ max: 2 }, ['a', 'b', 'c'], m)).toBe('最多選擇 2 項')
    expect(await checkRule({ min: 1 }, 0, m)).toBe('不能小於 1')
    expect(await checkRule({ max: 10 }, 11, m)).toBe('不能大於 10')
  })

  it('pattern 與 validator（含 async、跨欄位）', async () => {
    expect(await checkRule({ pattern: /^PCB-/ }, 'X1', m)).toBe('格式不正確')
    const model = { password: 'abc' }
    const confirm = { validator: (v: unknown, mm: Record<string, unknown>) => v === mm.password || '兩次密碼不一致' }
    expect(await checkRule(confirm, 'abd', model)).toBe('兩次密碼不一致')
    expect(await checkRule(confirm, 'abc', model)).toBe('')
    expect(await checkRule({ validator: async () => '已被使用' }, 'x', m)).toBe('已被使用')
  })

  it('多條規則回傳第一個錯誤；trigger 篩選', async () => {
    const rules = [{ required: true }, { min: 3, trigger: 'change' as const }]
    expect(await validateValue(rules, 'ab', m)).toBe('至少 3 個字')
    expect(await validateValue(rules, '', m, { trigger: 'change' })).toBe('')
    expect(await validateValue(rules, 'ab', m, { trigger: 'change' })).toBe('至少 3 個字')
  })

  it('巢狀路徑讀寫', () => {
    const o = { a: { b: 1 } }
    expect(getByPath(o, 'a.b')).toBe(1)
    expect(getByPath(o, 'a.x.y')).toBeUndefined()
    setByPath(o, 'a.b', 2)
    expect(o.a.b).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 元件
// ---------------------------------------------------------------------------

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountForm(template: string, setup: () => Record<string, unknown>) {
  const Comp = defineComponent({
    components: { ChptForm, ChptFormItem, ChptInput, ChptSelect, ChptInputNumber, ChptRadio, ChptDatePicker },
    setup,
    template,
  })
  wrapper = mount(Comp, { attachTo: document.body })
  return wrapper
}

const basic = () => {
  const model = reactive({ name: '', qty: null as number | null, site: '' })
  const rules = {
    name: { required: true },
    qty: [{ required: true }, { min: 1, message: '至少 1 片' }],
    site: { required: true, message: '請選擇廠區' },
  }
  const submitted = ref<unknown>(null)
  const invalid = ref<unknown>(null)
  return { model, rules, submitted, invalid }
}

const BASIC = `
<ChptForm :model="model" :rules="rules" @submit="submitted = { ...$event }" @invalid="invalid = $event">
  <ChptFormItem prop="name" label="料號" hint="例如 PCB-A12"><ChptInput v-model="model.name" /></ChptFormItem>
  <ChptFormItem prop="qty" label="數量"><ChptInputNumber v-model="model.qty" /></ChptFormItem>
  <ChptFormItem prop="site" label="廠區"><ChptSelect v-model="model.site" :options="['FAB-A','FAB-B']" placeholder="選擇" /></ChptFormItem>
  <button type="submit">送出</button>
</ChptForm>`

describe('ChptForm / ChptFormItem', () => {
  it('標籤的 for 指向裡面的輸入元件（點標籤會聚焦）', () => {
    const w = mountForm(BASIC, basic)
    for (const label of w.findAll('label')) {
      const target = w.find(`#${CSS.escape(label.attributes('for')!)}`)
      expect(target.exists(), label.text()).toBe(true)
      expect(['INPUT', 'SELECT']).toContain(target.element.tagName)
    }
  })

  it('必填欄位：標籤有 *（對報讀器隱藏）、輸入框 aria-required', () => {
    const w = mountForm(BASIC, basic)
    expect(w.find('label span[aria-hidden="true"]').text()).toBe('*')
    expect(w.find('input').attributes('aria-required')).toBe('true')
  })

  it('說明文字以 aria-describedby 連到輸入框', () => {
    const w = mountForm(BASIC, basic)
    const input = w.find('input')
    expect(w.find(`#${input.attributes('aria-describedby')}`).text()).toBe('例如 PCB-A12')
  })

  it('送出時驗證全部欄位：失敗不送出、顯示錯誤、焦點移到第一個錯誤欄位', async () => {
    const w = mountForm(BASIC, basic)
    await w.find('form').trigger('submit')
    await flushPromises()
    await nextTick()
    const vm = w.vm as unknown as { submitted: unknown; invalid: Record<string, string> }
    expect(vm.submitted).toBeNull()
    expect(vm.invalid).toEqual({ name: '請輸入料號', qty: '請輸入數量', site: '請選擇廠區' })
    const alerts = w.findAll('[role="alert"]').map((a) => a.text())
    expect(alerts).toEqual(['請輸入料號', '請輸入數量', '請選擇廠區'])
    // 焦點在第一個錯誤欄位，而不是留在送出鈕
    expect(document.activeElement).toBe(w.find('input').element)
  })

  it('錯誤時輸入框變紅並以 aria-invalid / aria-describedby 指向錯誤訊息', async () => {
    const w = mountForm(BASIC, basic)
    await w.find('form').trigger('submit')
    await flushPromises()
    const input = w.find('input')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.classes()).toContain('border-danger')
    expect(w.find(`#${input.attributes('aria-describedby')}`).text()).toBe('請輸入料號')
  })

  it('已顯示錯誤的欄位，改對了錯誤立刻消失（不用再離開欄位）', async () => {
    const w = mountForm(BASIC, basic)
    await w.find('form').trigger('submit')
    await flushPromises()
    await w.find('input').setValue('PCB-1')
    await flushPromises()
    expect(w.find('input').attributes('aria-invalid')).toBeUndefined()
    expect(w.findAll('[role="alert"]').map((a) => a.text())).not.toContain('請輸入料號')
  })

  it('離開欄位時驗證（還沒送出也會）', async () => {
    const w = mountForm(BASIC, basic)
    const input = w.find('input')
    await input.trigger('focusout')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe('請輸入料號')
  })

  it('全部正確時送出資料', async () => {
    const w = mountForm(BASIC, basic)
    await w.find('input').setValue('PCB-1')
    await w.find('input[role="spinbutton"]').setValue('5')
    await w.find('input[role="spinbutton"]').trigger('blur')
    await w.find('select').setValue('FAB-B')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect((w.vm as unknown as { submitted: unknown }).submitted).toEqual({ name: 'PCB-1', qty: 5, site: 'FAB-B' })
  })

  it('reset 還原初始值並清除錯誤，而且不會馬上又冒出錯誤', async () => {
    const w = mountForm(BASIC, basic)
    await w.find('input').setValue('X')
    await w.find('form').trigger('submit')
    await flushPromises()
    await w.find('form').trigger('reset')
    await flushPromises()
    await nextTick()
    expect((w.find('input').element as HTMLInputElement).value).toBe('')
    expect(w.findAll('[role="alert"]')).toHaveLength(0)
  })

  it('async 驗證只採用最後一次的結果', async () => {
    const resolvers: ((v: true | string) => void)[] = []
    const w = mountForm(
      `<ChptForm ref="f" :model="model" :rules="rules"><ChptFormItem prop="user" label="帳號"><ChptInput v-model="model.user" /></ChptFormItem></ChptForm>`,
      () => ({
        model: reactive({ user: 'a' }),
        rules: { user: { validator: () => new Promise<true | string>((r) => resolvers.push(r)) } },
      })
    )
    const form = (w.vm.$refs as { f: { validateField: (p: string) => Promise<unknown> } }).f
    const first = form.validateField('user')
    const second = form.validateField('user')
    resolvers[1](true) // 後發的先回來：通過
    resolvers[0]('已被使用') // 先發的晚回來：不能蓋掉
    await Promise.all([first, second])
    await nextTick()
    expect(w.findAll('[role="alert"]')).toHaveLength(0)
  })

  it('巢狀路徑欄位', async () => {
    const w = mountForm(
      `<ChptForm :model="model" :rules="rules" @invalid="errors = $event"><ChptFormItem prop="addr.city" label="城市"><ChptInput v-model="model.addr.city" /></ChptFormItem><button type="submit">s</button></ChptForm>`,
      () => ({ model: reactive({ addr: { city: '' } }), rules: { 'addr.city': { required: true } }, errors: ref(null) })
    )
    await w.find('form').trigger('submit')
    await flushPromises()
    expect((w.vm as unknown as { errors: unknown }).errors).toEqual({ 'addr.city': '請輸入城市' })
  })

  it('原生 <input>：自動補上 id 與 aria 屬性', async () => {
    const w = mountForm(
      `<ChptForm :model="model"><ChptFormItem prop="code" label="代碼" required><input v-model="model.code" /></ChptFormItem><button type="submit">s</button></ChptForm>`,
      () => ({ model: reactive({ code: '' }) })
    )
    await nextTick()
    const input = w.find('input')
    expect(w.find('label').attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('aria-required')).toBe('true')
    await w.find('form').trigger('submit')
    await flushPromises()
    await nextTick()
    expect(input.attributes('aria-invalid')).toBe('true')
  })

  it('多個控制項（單選群組）：整欄是 role="group"，由標籤命名', async () => {
    const w = mountForm(
      `<ChptForm :model="model"><ChptFormItem prop="p" label="優先級"><ChptRadio v-model="model.p" :items="[{label:'高',value:'h'},{label:'低',value:'l'}]" /></ChptFormItem></ChptForm>`,
      () => ({ model: reactive({ p: 'h' }) })
    )
    await nextTick()
    const group = w.find('[role="group"]')
    expect(group.exists()).toBe(true)
    expect(w.find(`#${group.attributes('aria-labelledby')}`).text()).toContain('優先級')
    expect(w.find('label[for]').exists()).toBe(false)
  })

  it('同一個欄位裡的第二個輸入框不會拿到重複的 id', () => {
    const w = mountForm(
      `<ChptForm :model="model"><ChptFormItem prop="a" label="區間"><ChptInput v-model="model.a" /><ChptInput v-model="model.b" /></ChptFormItem></ChptForm>`,
      () => ({ model: reactive({ a: '', b: '' }) })
    )
    const ids = w.findAll('input').map((i) => i.attributes('id'))
    expect(new Set(ids).size).toBe(2)
  })

  it('disabled 停用整個表單（fieldset disabled）', () => {
    const w = mountForm(
      `<ChptForm :model="model" disabled><ChptFormItem label="x"><input /></ChptFormItem></ChptForm>`,
      () => ({ model: reactive({}) })
    )
    expect(w.find('fieldset').attributes('disabled')).toBeDefined()
  })

  it('標籤在左側時用 grid 並套用 labelWidth', () => {
    const w = mountForm(
      `<ChptForm :model="model" label-position="left" label-width="6rem"><ChptFormItem label="x"><input /></ChptFormItem></ChptForm>`,
      () => ({ model: reactive({}) })
    )
    expect(w.find('.chpt-form-item').attributes('style')).toContain('--chpt-label-width: 6rem')
  })

  it('不在 ChptForm 裡也能單獨當版面用', () => {
    const w = mount(ChptFormItem, { props: { label: '備註', hint: '選填' }, slots: { default: '<textarea></textarea>' } })
    expect(w.text()).toContain('備註')
    expect(w.text()).toContain('選填')
    w.unmount()
  })

  /** 原本 FormItem 裡的日期欄位驗證失敗時，錯誤訊息出現了、輸入框卻沒有變紅 */
  /** 回歸：非同步渲染的輸入框（例如延遲載入的日期套件）掛載時還不存在，標籤原本永遠接不上 */
  it('掛載後才出現的原生輸入框也會被接上標籤', async () => {
    const show = ref(false)
    const w = mountForm(
      `<ChptForm :model="model"><ChptFormItem prop="note" label="備註"><input v-if="show" v-model="model.note" /></ChptFormItem></ChptForm>`,
      () => ({ model: reactive({ note: '' }), show })
    )
    await nextTick()
    const labelFor = w.find('label').attributes('for')
    show.value = true
    await nextTick()
    await flushPromises()
    expect(w.find('input').attributes('id')).toBe(labelFor)
  })

  it('ChptDatePicker：FormItem 驗證失敗時輸入框變紅，並補上 aria-invalid', async () => {
    const w = mountForm(
      `<ChptForm ref="form" :model="model"><ChptFormItem prop="due" label="交期" required><ChptDatePicker v-model="model.due" /></ChptFormItem></ChptForm>`,
      () => ({ model: reactive({ due: null }) })
    )
    // 日期套件是第一次渲染時才非同步載入（見 ChptDatePicker）
    await vi.dynamicImportSettled()
    await flushPromises()
    await nextTick()
    const input = () => w.find('input.dp__input')
    expect(input().classes()).not.toContain('dp__input_invalid')
    expect(w.find('label').attributes('for')).toBe(input().attributes('id'))
    await (w.vm.$refs.form as { validate: () => Promise<unknown> }).validate()
    await flushPromises()
    await nextTick()
    expect(input().classes()).toContain('dp__input_invalid')
    expect(input().attributes('aria-invalid')).toBe('true')
  })
})
