import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptTree, { type TreeNode } from '@/components/library/ui/ChptTree.vue'

const data: TreeNode[] = [
  {
    key: 'fab-a',
    label: 'FAB-A',
    children: [
      { key: 'smt', label: 'SMT', children: [{ key: 'l1', label: 'Line 1' }, { key: 'l2', label: 'Line 2' }] },
      { key: 'aoi', label: 'AOI' },
      { key: 'lock', label: 'Locked', disabled: true },
    ],
  },
  { key: 'fab-b', label: 'FAB-B', children: [{ key: 'b1', label: 'Bonding' }] },
  { key: 'office', label: 'Office' },
]

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountTree(props: Record<string, unknown> = {}) {
  const w = mount(ChptTree, {
    props: {
      data,
      ariaLabel: '廠區',
      ...props,
      'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
      'onUpdate:checked': (v: unknown) => w.setProps({ checked: v }),
    },
    attachTo: document.body,
  })
  wrapper = w
  return w
}

/** 節點的標籤文字（圖示是 Material Symbols 的連字，textContent 會含圖示名稱，但對報讀器是 aria-hidden） */
const labelOf = (el: Element) => el.querySelector('.truncate')?.textContent?.trim()
const labels = (w: ReturnType<typeof mount>) => w.findAll('[role="treeitem"]').map((r) => labelOf(r.element))
const item = (w: ReturnType<typeof mount>, label: string) =>
  w.findAll('[role="treeitem"]').find((r) => labelOf(r.element) === label)!
const press = async (w: ReturnType<typeof mount>, key: string) => {
  await w.find('[role="tree"]').trigger('keydown', { key })
  await nextTick()
}
const focused = () => (document.activeElement ? labelOf(document.activeElement) : undefined)

describe('ChptTree：結構與 ARIA', () => {
  it('role tree / treeitem，level、setsize、posinset、expanded', () => {
    const w = mountTree()
    expect(w.attributes('role')).toBe('tree')
    expect(w.attributes('aria-label')).toBe('廠區')
    expect(labels(w)).toEqual(['FAB-A', 'FAB-B', 'Office'])
    const a = item(w, 'FAB-A')
    expect(a.attributes()).toMatchObject({ 'aria-level': '1', 'aria-setsize': '3', 'aria-posinset': '1', 'aria-expanded': 'false' })
    expect(item(w, 'Office').attributes('aria-expanded')).toBeUndefined()
  })

  it('整棵樹只有一個 Tab 停駐點', () => {
    const w = mountTree()
    expect(w.findAll('[role="treeitem"]').map((r) => r.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
  })

  it('defaultExpandAll', () => {
    const w = mountTree({ defaultExpandAll: true })
    expect(labels(w)).toEqual(['FAB-A', 'SMT', 'Line 1', 'Line 2', 'AOI', 'Locked', 'FAB-B', 'Bonding', 'Office'])
    expect(item(w, 'Line 1').attributes('aria-level')).toBe('3')
  })

  it('點箭頭展開 / 收合，並送出 update:expanded', async () => {
    const w = mountTree()
    await item(w, 'FAB-A').find('span[aria-hidden="true"]').trigger('click')
    expect(labels(w)).toContain('SMT')
    expect(w.emitted('update:expanded')?.at(-1)).toEqual([['fab-a']])
  })

  it('受控的 expanded', () => {
    const w = mountTree({ expanded: ['fab-b'] })
    expect(labels(w)).toEqual(['FAB-A', 'FAB-B', 'Bonding', 'Office'])
  })
})

describe('ChptTree：鍵盤（WAI-ARIA tree）', () => {
  it('↓ ↑ Home End 在看得到的節點間移動', async () => {
    const w = mountTree()
    item(w, 'FAB-A').element.focus()
    await press(w, 'ArrowDown')
    expect(focused()).toBe('FAB-B')
    await press(w, 'End')
    expect(focused()).toBe('Office')
    await press(w, 'Home')
    expect(focused()).toBe('FAB-A')
    await press(w, 'ArrowUp')
    expect(focused()).toBe('FAB-A')
  })

  it('→ 展開、再按移到第一個子節點；← 收合、再按回到父節點', async () => {
    const w = mountTree()
    item(w, 'FAB-A').element.focus()
    await press(w, 'ArrowRight')
    expect(item(w, 'FAB-A').attributes('aria-expanded')).toBe('true')
    await press(w, 'ArrowRight')
    expect(focused()).toBe('SMT')
    await press(w, 'ArrowLeft') // SMT 已收合 → 回到父節點
    expect(focused()).toBe('FAB-A')
    await press(w, 'ArrowLeft') // 收合
    expect(item(w, 'FAB-A').attributes('aria-expanded')).toBe('false')
  })

  it('Enter 選取（aria-selected）', async () => {
    const w = mountTree()
    item(w, 'FAB-B').element.focus()
    await press(w, 'Enter')
    expect(w.props('modelValue')).toBe('fab-b')
    expect(item(w, 'FAB-B').attributes('aria-selected')).toBe('true')
    expect(w.emitted('select')?.[0][0]).toMatchObject({ key: 'fab-b' })
  })

  it('停用節點不能選取', async () => {
    const w = mountTree({ defaultExpandAll: true })
    await item(w, 'Locked').trigger('click')
    expect(w.emitted('select')).toBeUndefined()
    expect(item(w, 'Locked').attributes('aria-disabled')).toBe('true')
  })

  it('* 展開同層所有節點', async () => {
    const w = mountTree()
    item(w, 'FAB-A').element.focus()
    await press(w, '*')
    expect(labels(w)).toContain('SMT')
    expect(labels(w)).toContain('Bonding')
  })

  it('打字跳到該字開頭的節點', async () => {
    const w = mountTree()
    item(w, 'FAB-A').element.focus()
    await press(w, 'o')
    expect(focused()).toBe('Office')
  })

  it('焦點所在節點被收合隱藏時，停駐點移到可見的節點', async () => {
    const w = mountTree({ defaultExpandAll: true })
    item(w, 'Line 2').element.focus()
    await item(w, 'Line 2').trigger('focus')
    await item(w, 'FAB-A').find('span[aria-hidden="true"]').trigger('click')
    await nextTick()
    const stops = w.findAll('[role="treeitem"]').filter((r) => r.attributes('tabindex') === '0')
    expect(stops).toHaveLength(1)
  })
})

describe('ChptTree：勾選（三態）', () => {
  it('勾父節點 = 勾所有未停用的子孫（停用的不受影響）', async () => {
    const w = mountTree({ checkable: true, defaultExpandAll: true })
    await item(w, 'FAB-A').trigger('click')
    const keys = (w.props('checked') as string[]).sort()
    expect(keys).toEqual(['aoi', 'fab-a', 'l1', 'l2', 'smt'].sort())
    expect(item(w, 'Locked').attributes('aria-checked')).toBe('false')
    expect(item(w, 'FAB-A').attributes('aria-checked')).toBe('true')
  })

  it('子節點部分勾選時父節點是 mixed；全部勾選時父節點自動勾選', async () => {
    const w = mountTree({ checkable: true, defaultExpandAll: true })
    await item(w, 'Line 1').trigger('click')
    expect(item(w, 'SMT').attributes('aria-checked')).toBe('mixed')
    expect(item(w, 'FAB-A').attributes('aria-checked')).toBe('mixed')
    await item(w, 'Line 2').trigger('click')
    expect(item(w, 'SMT').attributes('aria-checked')).toBe('true')
    expect(w.props('checked')).toContain('smt')
    expect(item(w, 'FAB-A').attributes('aria-checked')).toBe('mixed') // AOI 還沒勾
  })

  it('取消勾選子節點時，祖先也取消', async () => {
    const w = mountTree({ checkable: true, defaultExpandAll: true, checked: ['fab-b', 'b1'] })
    await item(w, 'Bonding').trigger('click')
    expect(w.props('checked')).toEqual([])
  })

  it('Space 勾選；aria-multiselectable', async () => {
    const w = mountTree({ checkable: true })
    expect(w.attributes('aria-multiselectable')).toBe('true')
    item(w, 'Office').element.focus()
    await item(w, 'Office').trigger('focus')
    await press(w, ' ')
    expect(w.props('checked')).toEqual(['office'])
    expect(w.emitted('check')?.[0][1]).toBe(true)
  })

  it('getHalfCheckedKeys 回傳部分勾選的父節點', async () => {
    const w = mountTree({ checkable: true, checked: ['l1'] })
    const half = (w.vm as unknown as { getHalfCheckedKeys: () => string[] }).getHalfCheckedKeys()
    expect(half.sort()).toEqual(['fab-a', 'smt'])
  })
})

describe('ChptTree：篩選', () => {
  it('只顯示符合的節點與其祖先，自動展開並高亮', () => {
    const w = mountTree({ filterText: 'line 2' })
    expect(labels(w)).toEqual(['FAB-A', 'SMT', 'Line 2'])
    expect(w.find('mark').text()).toBe('Line 2')
  })

  it('篩選中也能收合；換篩選文字後重設', async () => {
    const w = mountTree({ filterText: 'line' })
    await item(w, 'SMT').find('span[aria-hidden="true"]').trigger('click')
    expect(labels(w)).toEqual(['FAB-A', 'SMT'])
    await w.setProps({ filterText: 'line 1' })
    expect(labels(w)).toEqual(['FAB-A', 'SMT', 'Line 1'])
  })

  it('清掉篩選後還原原本的展開狀態', async () => {
    const w = mountTree({ filterText: 'bond' })
    expect(labels(w)).toEqual(['FAB-B', 'Bonding'])
    await w.setProps({ filterText: '' })
    expect(labels(w)).toEqual(['FAB-A', 'FAB-B', 'Office'])
  })

  it('沒有符合時顯示提示', () => {
    const w = mountTree({ filterText: 'zzz' })
    expect(w.text()).toContain('找不到符合的項目')
  })
})

describe('ChptTree：插槽', () => {
  it('label 與 extra 插槽', () => {
    const w = mount(ChptTree, {
      props: { data: [{ key: 1, label: 'A', count: 3 }] },
      slots: {
        label: `<template #label="{ node }"><b>{{ node.label }}</b></template>`,
        extra: `<template #extra="{ node }"><span class="cnt">{{ node.count }}</span></template>`,
      },
    })
    expect(w.find('b').text()).toBe('A')
    expect(w.find('.cnt').text()).toBe('3')
    w.unmount()
  })
})
