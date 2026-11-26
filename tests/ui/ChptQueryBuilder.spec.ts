import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptQueryBuilder from '@/components/library/ui/ChptQueryBuilder.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { QbField, QbGroup, QbRule } from '@/components/library/shared/queryBuilder'

const fields: QbField[] = [
  { key: 'name', label: '名稱', type: 'text' },
  { key: 'qty', label: '數量', type: 'number' },
  { key: 'due', label: '交期', type: 'date' },
  { key: 'line', label: '線別', type: 'select', options: [{ label: 'A 線', value: 'A' }, { label: 'B 線', value: 'B' }] },
  { key: 'urgent', label: '急單', type: 'boolean' },
]
const base = (): QbGroup => ({
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'r1', field: 'qty', op: 'gt', value: 10 },
    {
      id: 'g1',
      combinator: 'or',
      rules: [
        { id: 'r2', field: 'line', op: 'eq', value: 'A' },
        { id: 'r3', field: 'urgent', op: 'eq', value: true },
      ],
    },
  ],
})

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const query = ref<QbGroup | null>('modelValue' in props ? (props.modelValue as QbGroup | null) : base())
  const node = () =>
    h(ChptQueryBuilder, {
      fields,
      ...props,
      modelValue: query.value,
      'onUpdate:modelValue': (v: QbGroup) => (query.value = v),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const items = () => w.findAll('li[aria-level]')
  const ruleRow = (i: number) => items().filter((li) => li.find('select[aria-label="欄位"]').exists())[i]
  const btn = (label: string, n = 0) => w.findAll('button').filter((b) => b.attributes('aria-label') === label || (!b.attributes('aria-label') && b.text().trim().endsWith(label)))[n]
  const rule = (id: string) => {
    const find = (g: QbGroup): QbRule | undefined => {
      for (const n of g.rules) {
        if ('rules' in n) {
          const r = find(n)
          if (r) return r
        } else if (n.id === id) return n
      }
    }
    return find(query.value!)
  }
  return { w, query, items, ruleRow, btn, rule }
}

const drag = (type: string) => {
  const data: Record<string, string> = {}
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'dataTransfer', { value: { setData: (k: string, v: string) => (data[k] = v), getData: (k: string) => data[k], effectAllowed: '' } })
  return e
}

describe('ChptQueryBuilder', () => {
  it('畫出群組與規則、層級、條件文字', () => {
    const { w, items } = mountIt({ title: '篩選' })
    expect(items()).toHaveLength(5)
    expect(items().map((i) => i.attributes('aria-level'))).toEqual(['1', '2', '2', '3', '3'])
    expect(w.find('ul').attributes('aria-label')).toBe('篩選')
    expect(w.find('p').text()).toBe('條件： 數量 大於 10 且 (線別 等於 A 線 或 急單 等於 是)')
    expect(items()[2].text()).toContain('以下任一符合')
    // 根群組不能刪除、不能拖曳
    expect(items()[0].attributes('draggable')).toBe('false')
    expect(items()[0].find('button[aria-label="刪除群組"]').exists()).toBe(false)
    expect(items()[2].find('button[aria-label="刪除群組"]').exists()).toBe(true)
  })

  it('切換 AND / OR、NOT', async () => {
    const { w, query, items } = mountIt({ allowNot: true })
    await items()[0].findAll('button').find((b) => b.text() === '或')!.trigger('click')
    expect(query.value!.combinator).toBe('or')
    await items()[2].find('input[type="checkbox"]').setValue(true)
    expect((query.value!.rules[1] as QbGroup).not).toBe(true)
    expect(w.find('p').text()).toContain('不符合(線別')
  })

  it('新增條件與群組、刪除；最大深度', async () => {
    const { w, query, btn } = mountIt({ maxDepth: 2 })
    // 第一個「條件」是 g1 結尾，第二個是根結尾
    await btn('條件', 1).trigger('click')
    expect(query.value!.rules).toHaveLength(3)
    expect(query.value!.rules[2]).toMatchObject({ field: 'name', op: 'eq', value: null })
    // maxDepth = 2：g1 裡不能再加群組，根可以
    expect(w.findAll('button').filter((b) => !b.attributes('aria-label') && b.text().trim().endsWith('群組'))).toHaveLength(1)
    await btn('群組').trigger('click')
    expect((query.value!.rules[3] as QbGroup).rules).toHaveLength(1)
    expect(w.find('[aria-live="polite"]').text()).toBe('已新增')
    await btn('刪除群組', 1).trigger('click')
    expect(query.value!.rules).toHaveLength(3)
    await btn('刪除條件').trigger('click')
    expect(query.value!.rules[0].id).toBe('g1')
    expect(w.find('[aria-live="polite"]').text()).toBe('已刪除')
  })

  it('改欄位：型別相同時保留運算子與值，不同時重設；改運算子調整值', async () => {
    const { ruleRow, rule } = mountIt()
    // 數量 → 名稱（型別不同）：運算子重設為第一個，值清空
    await ruleRow(0).find('select[aria-label="欄位"]').setValue('name')
    expect(rule('r1')).toMatchObject({ field: 'name', op: 'eq', value: null })
    await ruleRow(0).find('select[aria-label="欄位"]').setValue('qty')
    await ruleRow(0).find('select[aria-label="運算子"]').setValue('between')
    expect(rule('r1')!.value).toEqual([null, null])
    const ins = ruleRow(0).findAll('input')
    await ins[0].setValue('3')
    await ruleRow(0).findAll('input')[1].setValue('9')
    expect(rule('r1')!.value).toEqual([3, 9])
    await ruleRow(0).findAll('input')[1].setValue('')
    expect(rule('r1')!.value).toEqual([3, null])
    await ruleRow(0).findAll('input')[1].setValue('abc')
    expect(rule('r1')!.value).toEqual([3, null])
    // 運算子：值的個數一樣時保留
    await ruleRow(0).find('select[aria-label="運算子"]').setValue('empty')
    expect(rule('r1')!.value).toBeUndefined()
    expect(ruleRow(0).find('input').exists()).toBe(false)
    await ruleRow(0).find('select[aria-label="運算子"]').setValue('gt')
    await ruleRow(0).find('select[aria-label="運算子"]').setValue('lt')
    await ruleRow(0).find('input').setValue('5')
    await ruleRow(0).find('select[aria-label="運算子"]').setValue('gte')
    expect(rule('r1')).toMatchObject({ op: 'gte', value: 5 })
  })

  it('選項、是 / 否、屬於（複選）、日期、文字', async () => {
    const { ruleRow, rule } = mountIt()
    await ruleRow(1).find('select[aria-label="值"]').setValue('B')
    expect(rule('r2')!.value).toBe('B')
    await ruleRow(2).find('select[aria-label="值"]').setValue('false')
    expect(rule('r3')!.value).toBe(false)
    await ruleRow(1).find('select[aria-label="運算子"]').setValue('in')
    const chips = () => ruleRow(1).findAll('[role="group"] button')
    expect(chips().map((c) => c.text())).toEqual(['A 線', 'B 線'])
    await chips()[0].trigger('click')
    await chips()[1].trigger('click')
    expect(rule('r2')!.value).toEqual(['A', 'B'])
    expect(chips()[0].attributes('aria-pressed')).toBe('true')
    await chips()[0].trigger('click')
    expect(rule('r2')!.value).toEqual(['B'])
    await ruleRow(0).find('select[aria-label="欄位"]').setValue('due')
    expect(ruleRow(0).find('input').attributes('type')).toBe('date')
    await ruleRow(0).find('input').setValue('2026-01-02')
    expect(rule('r1')!.value).toBe('2026-01-02')
    await ruleRow(0).find('select[aria-label="欄位"]').setValue('name')
    expect(ruleRow(0).find('input').attributes('type')).toBe('text')
  })

  it('驗證：呼叫 validate() 後才顯示；showErrors 一直顯示', async () => {
    const empty: QbGroup = { id: 'root', combinator: 'and', rules: [{ id: 'a', field: 'name', op: 'eq', value: '' }, { id: 'g', combinator: 'or', rules: [] }] }
    const { w } = mountIt({ modelValue: empty })
    expect(w.find('[role="alert"]').exists()).toBe(false)
    const vm = w.findComponent(ChptQueryBuilder).vm as unknown as { validate: () => boolean; errors: Map<string, string>; text: string }
    expect(vm.validate()).toBe(false)
    await nextTick()
    expect(w.find('[role="alert"]').text()).toBe('請輸入值')
    expect(w.text()).toContain('群組裡沒有條件')
    expect(vm.errors.size).toBe(2)
    expect(vm.text).toBe('名稱 等於 ?')
    const always = mountIt({ modelValue: empty, showErrors: true })
    expect(always.w.find('[role="alert"]').exists()).toBe(true)
    const ok = mountIt()
    expect((ok.w.findComponent(ChptQueryBuilder).vm as unknown as { validate: () => boolean }).validate()).toBe(true)
  })

  it('未知欄位的規則：保留原值並標錯', () => {
    const { w } = mountIt({ modelValue: { id: 'root', combinator: 'and', rules: [{ id: 'x', field: 'gone', op: 'eq', value: 1 }] }, showErrors: true })
    expect(w.find('select[aria-label="欄位"] option[disabled]').text()).toBe('gone')
    expect(w.find('select[aria-label="運算子"]').exists()).toBe(false)
    expect(w.find('[role="alert"]').text()).toBe('欄位或運算子無效')
  })

  it('拖曳：移到別的群組、群組內往後、拖到群組標題；超過深度不移', async () => {
    const { w, query, items } = mountIt({ maxDepth: 2 })
    const at = (i: number) => items()[i].element
    // r1 拖到 g1 結尾
    at(1).dispatchEvent(drag('dragstart'))
    const over = drag('dragover')
    const endRows = w.findAll('li[data-row="end"]')
    endRows[0].element.dispatchEvent(over)
    expect(over.defaultPrevented).toBe(true)
    endRows[0].element.dispatchEvent(drag('drop'))
    await nextTick()
    expect((query.value!.rules[0] as QbGroup).rules.map((n) => n.id)).toEqual(['r2', 'r3', 'r1'])
    expect(w.find('[aria-live="polite"]').text()).toBe('已移動')
    // 群組內往後：r2 放到 r1 前面 → r3, r2, r1
    items()[2].element.dispatchEvent(drag('dragstart'))
    items()[4].element.dispatchEvent(drag('drop'))
    await nextTick()
    expect((query.value!.rules[0] as QbGroup).rules.map((n) => n.id)).toEqual(['r3', 'r2', 'r1'])
    // 拖到群組標題：放到最前面
    items()[4].element.dispatchEvent(drag('dragstart'))
    items()[1].element.dispatchEvent(drag('drop'))
    await nextTick()
    expect((query.value!.rules[0] as QbGroup).rules.map((n) => n.id)).toEqual(['r1', 'r3', 'r2'])
    // 拖到自己、沒有在拖曳時 dragover 不處理
    const idle = drag('dragover')
    items()[1].element.dispatchEvent(idle)
    expect(idle.defaultPrevented).toBe(false)
    items()[2].element.dispatchEvent(drag('dragstart'))
    items()[2].element.dispatchEvent(drag('drop'))
    items()[2].element.dispatchEvent(drag('dragend'))
    // 根與結尾列不能拖
    items()[0].element.dispatchEvent(drag('dragstart'))
    endRows[0].element.dispatchEvent(drag('drop'))
    expect(query.value!.rules).toHaveLength(1)
  })

  it('群組拖進群組超過最大深度時不移', async () => {
    const two: QbGroup = {
      id: 'root',
      combinator: 'and',
      rules: [
        { id: 'g1', combinator: 'or', rules: [{ id: 'a', field: 'qty', op: 'gt', value: 1 }] },
        { id: 'g2', combinator: 'or', rules: [{ id: 'b', field: 'qty', op: 'lt', value: 9 }] },
      ],
    }
    const { query, items } = mountIt({ modelValue: two, maxDepth: 2 })
    items()[3].element.dispatchEvent(drag('dragstart')) // g2
    items()[1].element.dispatchEvent(drag('drop')) // g1 標題
    await nextTick()
    expect(query.value!.rules.map((n) => n.id)).toEqual(['g1', 'g2'])
  })

  it('沒有 v-model 時從空群組開始；readonly；不顯示文字；英文語系', async () => {
    const { w, query } = mountIt({ modelValue: null })
    expect(w.text()).toContain('（沒有條件，全部符合）')
    await w.findAll('button').find((b) => b.text().trim().endsWith('條件'))!.trigger('click')
    expect(query.value!.rules).toHaveLength(1)
    const ro = mountIt({ readonly: true, showText: false })
    expect(ro.w.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
    expect(ro.w.find('p').exists()).toBe(false)
    expect(ro.w.findAll('select').every((s) => s.attributes('disabled') !== undefined)).toBe(true)
    await ro.w.findAll('button')[1].trigger('click')
    expect(ro.query.value!.combinator).toBe('and')
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.find('p').text()).toBe('Query: 數量 > 10 AND (線別 is A 線 OR 急單 is Yes)')
  })
})
