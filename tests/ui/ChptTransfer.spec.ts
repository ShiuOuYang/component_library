import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChptTransfer, { type TransferItem } from '@/components/library/ui/ChptTransfer.vue'

const data: TransferItem[] = [
  { key: 'a', label: 'Alice' },
  { key: 'b', label: 'Bob' },
  { key: 'c', label: 'Carol', disabled: true },
  { key: 'd', label: 'Dave' },
  { key: 'e', label: 'Eve' },
]

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountTransfer(props: Record<string, unknown> = {}) {
  const w = mount(ChptTransfer, {
    props: {
      data,
      ...props,
      'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
    },
  })
  wrapper = w
  return w
}

type W = ReturnType<typeof mount>
const panels = (w: W) => w.findAll('section')
const labelsIn = (w: W, side: 0 | 1) => panels(w)[side].findAll('li label').map((l) => l.text())
const check = (w: W, side: 0 | 1, label: string) =>
  panels(w)[side].findAll('li label').find((l) => l.text() === label)!.find('input').setValue(true)
const buttons = (w: W) => w.findAll('button')

describe('ChptTransfer', () => {
  it('左右各一個以標題命名的區塊；數量顯示', () => {
    const w = mountTransfer({ modelValue: ['b'] })
    const [left, right] = panels(w)
    const leftTitle = w.find(`#${left.attributes('aria-labelledby')}`)
    expect(leftTitle.text()).toBe('可選項目')
    expect(w.find(`#${right.attributes('aria-labelledby')}`).text()).toBe('已選項目')
    expect(labelsIn(w, 0)).toEqual(['Alice', 'Carol', 'Dave', 'Eve'])
    expect(labelsIn(w, 1)).toEqual(['Bob'])
    expect(left.find('header').text()).toContain('4')
  })

  it('勾選後「加入」鈕顯示數量；移動後送出新的 v-model 與 change', async () => {
    const w = mountTransfer()
    expect(buttons(w)[0].attributes('disabled')).toBeDefined()
    await check(w, 0, 'Dave')
    await check(w, 0, 'Alice')
    expect(buttons(w)[0].text()).toContain('(2)')
    await buttons(w)[0].trigger('click')
    expect(w.props('modelValue')).toEqual(['a', 'd']) // 照原本資料順序
    expect(w.emitted('change')?.[0]).toEqual([['a', 'd'], 'right', ['d', 'a']])
    expect(labelsIn(w, 1)).toEqual(['Alice', 'Dave'])
    expect(w.find('[aria-live="polite"]').text()).toBe('已將 2 項移到已選項目')
    // 移動後勾選清掉
    expect(buttons(w)[0].attributes('disabled')).toBeDefined()
  })

  it('移回左邊', async () => {
    const w = mountTransfer({ modelValue: ['a', 'b'] })
    await check(w, 1, 'Alice')
    await buttons(w)[1].trigger('click')
    expect(w.props('modelValue')).toEqual(['b'])
    expect(w.emitted('change')?.[0][1]).toBe('left')
  })

  it('targetOrder=push：新加入的排最後', async () => {
    const w = mountTransfer({ modelValue: ['e'], targetOrder: 'push' })
    await check(w, 0, 'Alice')
    await buttons(w)[0].trigger('click')
    expect(w.props('modelValue')).toEqual(['e', 'a'])
    expect(labelsIn(w, 1)).toEqual(['Eve', 'Alice'])
  })

  it('全選只選未停用的；部分勾選時是 indeterminate', async () => {
    const w = mountTransfer()
    const all = panels(w)[0].find('header input')
    expect(all.attributes('aria-label')).toBe('全選可選項目')
    await check(w, 0, 'Alice')
    expect((all.element as HTMLInputElement).indeterminate).toBe(true)
    await all.trigger('change')
    expect(buttons(w)[0].text()).toContain('(4)') // Carol 停用
    expect((all.element as HTMLInputElement).checked).toBe(true)
    await all.trigger('change')
    expect(buttons(w)[0].attributes('disabled')).toBeDefined()
  })

  it('搜尋只影響看得到的；全選只選搜尋結果', async () => {
    const w = mountTransfer({ filterable: true })
    const search = panels(w)[0].find('input[type="search"]')
    expect(search.attributes('aria-label')).toBe('搜尋可選項目')
    await search.setValue('e')
    expect(labelsIn(w, 0)).toEqual(['Alice', 'Dave', 'Eve'])
    await panels(w)[0].find('header input').trigger('change')
    await buttons(w)[0].trigger('click')
    expect(w.props('modelValue')).toEqual(['a', 'd', 'e'])
    await search.setValue('zzz')
    expect(panels(w)[0].text()).toContain('找不到符合的項目')
  })

  it('外部改掉 v-model 時，已不在該側的勾選會被清掉', async () => {
    const w = mountTransfer()
    await check(w, 0, 'Bob')
    await w.setProps({ modelValue: ['b'] })
    expect(buttons(w)[0].attributes('disabled')).toBeDefined()
  })

  it('自訂 item 插槽與標題、按鈕文字', () => {
    const w = mount(ChptTransfer, {
      props: { data, titles: ['全部人員', '通知對象'], buttonTexts: ['→', '←'] },
      slots: { item: `<template #item="{ item }"><i class="custom">{{ item.label.toUpperCase() }}</i></template>` },
    })
    expect(w.find('.custom').text()).toBe('ALICE')
    expect(w.text()).toContain('通知對象')
    expect(buttons(w)[0].text()).toContain('→')
    w.unmount()
  })

  it('disabled：所有勾選與按鈕都停用', () => {
    const w = mountTransfer({ disabled: true })
    expect(w.findAll('input').every((i) => i.attributes('disabled') !== undefined)).toBe(true)
  })
})
