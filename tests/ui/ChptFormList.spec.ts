/* eslint-disable vue/one-component-per-file -- 測試裡就地定義包裝元件來綁 v-model */
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChptFormList from '@/components/library/ui/ChptFormList.vue'
import ChptForm from '@/components/library/ui/ChptForm.vue'
import ChptFormItem from '@/components/library/ui/ChptFormItem.vue'
import ChptInput from '@/components/library/ui/ChptInput.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

type Row = { value: number | string | null; note?: string }

/** 綁一個真的陣列（v-model），每一列放一個輸入框 */
function mountList(props: Record<string, unknown> = {}, initial: Row[] = [{ value: 1 }, { value: 2 }]) {
  const list = ref<Row[]>(initial)
  const Comp = defineComponent({
    setup: () => () =>
      h(
        ChptFormList<Row>,
        {
          modelValue: list.value,
          'onUpdate:modelValue': (v: Row[]) => (list.value = v),
          prop: 'measures',
          label: '量測值',
          createItem: () => ({ value: null }),
          ...props,
        },
        {
          default: ({ item, path }: { item: Row; path: (f?: string) => string }) =>
            h('input', { class: 'val', 'data-path': path('value'), value: item.value ?? '' }),
        }
      ),
  })
  wrapper = mount(Comp, { attachTo: document.body })
  return { w: wrapper, list }
}

const rowsOf = (w: VueWrapper) => w.findAll('li.chpt-form-list-item')
const btn = (w: VueWrapper, label: RegExp) => w.findAll('button').find((b) => label.test(b.attributes('aria-label') ?? b.text()))!

describe('ChptFormList', () => {
  it('每一列有名稱與 path()；新增用 createItem、聚焦到新的一列並念出來', async () => {
    const { w, list } = mountList()
    expect(rowsOf(w)).toHaveLength(2)
    expect(rowsOf(w)[1].attributes('aria-label')).toBe('量測值 第 2 筆')
    expect(w.findAll('input.val').map((i) => i.attributes('data-path'))).toEqual(['measures.0.value', 'measures.1.value'])
    await btn(w, /新增一列/).trigger('click')
    await nextTick()
    await nextTick()
    expect(list.value).toEqual([{ value: 1 }, { value: 2 }, { value: null }])
    expect(document.activeElement).toBe(w.findAll('input.val')[2].element)
    expect(w.find('[aria-live="polite"]').text()).toBe('已新增第 3 筆')
  })

  it('刪除：送出 remove；刪到 min 時刪除鈕停用', async () => {
    const { w, list } = mountList({ min: 1 })
    await btn(w, /刪除第 1 筆/).trigger('click')
    expect(list.value).toEqual([{ value: 2 }])
    expect(w.emitted('remove')).toBeUndefined() // 事件在內層元件上
    await nextTick()
    expect(btn(w, /刪除第 1 筆/).attributes('disabled')).toBeDefined()
  })

  it('max：到上限時新增鈕停用並顯示提示', async () => {
    const { w } = mountList({ max: 2 })
    expect(btn(w, /新增一列/).attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('最多 2 筆')
    expect(w.text()).toContain('2 / 2')
  })

  it('sortable：上移 / 下移；第一列不能上移、最後一列不能下移', async () => {
    const { w, list } = mountList({ sortable: true }, [{ value: 1 }, { value: 2 }, { value: 3 }])
    expect(btn(w, /第 1 筆上移/).attributes('disabled')).toBeDefined()
    expect(btn(w, /第 3 筆下移/).attributes('disabled')).toBeDefined()
    await btn(w, /第 3 筆上移/).trigger('click')
    expect(list.value.map((r) => r.value)).toEqual([1, 3, 2])
    expect(w.find('[aria-live="polite"]').text()).toBe('第 3 筆已移到第 2 筆')
  })

  it('刪除中間一列時，下面的列保留原本的 DOM（key 穩定，不會換人）', async () => {
    const { w } = mountList({}, [{ value: 1 }, { value: 2 }, { value: 3 }])
    const third = w.findAll('input.val')[2].element
    await btn(w, /刪除第 2 筆/).trigger('click')
    await nextTick()
    expect(w.findAll('input.val')[1].element).toBe(third)
  })

  it('沒有資料時顯示空狀態；disabled 時按鈕都停用', async () => {
    const { w } = mountList({ disabled: true }, [])
    expect(w.text()).toContain('尚無資料')
    expect(btn(w, /新增一列/).attributes('disabled')).toBeDefined()
  })

  it('ref add(item, at) / remove / move', async () => {
    const list = ref<Row[]>([{ value: 1 }])
    const listRef = ref<InstanceType<typeof ChptFormList> | null>(null)
    wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(ChptFormList<Row>, { ref: listRef, modelValue: list.value, 'onUpdate:modelValue': (v: Row[]) => (list.value = v) }, { default: () => h('span') }),
      }),
      { attachTo: document.body }
    )
    const api = listRef.value as unknown as { add: (i?: Row, at?: number) => Promise<number>; remove: (i: number) => void; move: (i: number, d: number) => void }
    expect(await api.add({ value: 0 }, 0)).toBe(0)
    expect(list.value.map((r) => r.value)).toEqual([0, 1])
    await nextTick()
    api.move(0, 1)
    expect(list.value.map((r) => r.value)).toEqual([1, 0])
    await nextTick()
    api.remove(1)
    expect(list.value.map((r) => r.value)).toEqual([1])
  })

  it('語系：enUS', async () => {
    wrapper = mount(
      { render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptFormList, { modelValue: [{}], itemLabel: 'Measure' }, { default: () => h('span') })) },
      { attachTo: document.body }
    )
    expect(wrapper.find('li').attributes('aria-label')).toBe('Measure row 1')
    expect(wrapper.text()).toContain('Add row')
  })
})

describe('ChptFormList + ChptForm 驗證', () => {
  it("規則寫一次 'measures.*.value' 就套用到每一列", async () => {
    const model = reactive({ measures: [{ value: '1.2' }, { value: '' }] as Row[] })
    const rules = { 'measures.*.value': [{ required: true, message: '請輸入量測值' }, { type: 'number' as const }] }
    const formRef = ref<{ validate: () => Promise<{ valid: boolean; errors: Record<string, string> }> } | null>(null)
    wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(ChptForm, { ref: formRef, model, rules }, () =>
            h(
              ChptFormList<Row>,
              { modelValue: model.measures, 'onUpdate:modelValue': (v: Row[]) => (model.measures = v), prop: 'measures', label: '量測值' },
              {
                default: ({ path }: { path: (f: string) => string }) =>
                  h(ChptFormItem, { prop: path('value'), label: '值' }, () =>
                    h(ChptInput, {
                      modelValue: model.measures[Number(path('value').split('.')[1])].value ?? '',
                      'onUpdate:modelValue': (v: string) => (model.measures[Number(path('value').split('.')[1])].value = v),
                    })
                  ),
              }
            )
          ),
      }),
      { attachTo: document.body }
    )
    await nextTick()
    const result = await formRef.value!.validate()
    await flushPromises()
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual({ 'measures.1.value': '請輸入量測值' })
    const errors = () => wrapper!.findAll('[role="alert"]').map((e) => e.text()).filter(Boolean)
    expect(errors()).toEqual(['請輸入量測值'])
    // 第二列有必填標記（規則來自萬用字元）
    expect(wrapper.findAll('input')[1].attributes('aria-required')).toBe('true')

    model.measures[1].value = 'abc'
    await nextTick()
    await formRef.value!.validate()
    await flushPromises()
    expect(errors()).toEqual(['請輸入數字'])
  })
})
