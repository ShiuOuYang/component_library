import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptTreeSelect from '@/components/library/ui/ChptTreeSelect.vue'
import type { TreeNode } from '@/components/library/ui/ChptTree.vue'

const data: TreeNode[] = [
  {
    key: 'fab-a',
    label: 'FAB-A',
    children: [
      { key: 'smt', label: 'SMT', children: [{ key: 'l1', label: 'Line 1' }, { key: 'l2', label: 'Line 2' }] },
      { key: 'aoi', label: 'AOI' },
    ],
  },
  { key: 'office', label: 'Office' },
]

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountTs(props: Record<string, unknown> = {}) {
  const w = mount(ChptTreeSelect, {
    props: { data, label: '產線', ...props, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }) },
    attachTo: document.body,
  })
  wrapper = w
  return w
}

type W = ReturnType<typeof mount>
const trigger = (w: W) => w.find(`#${w.find('label').attributes('for')}`)
const nameOf = (w: W) =>
  trigger(w)
    .attributes('aria-labelledby')!
    .split(' ')
    .map((id) => w.find(`#${id}`).text())
    .join(' ')
const item = (w: W, label: string) =>
  w.findAll('[role="treeitem"]').find((r) => r.find('.truncate').text() === label)!
const flush = async () => {
  await nextTick()
  await nextTick()
}

describe('ChptTreeSelect：單選', () => {
  it('觸發鈕名稱 = 標籤 + 值；開啟 dialog 內含 tree', async () => {
    const w = mountTs({ modelValue: 'l2' })
    expect(nameOf(w)).toBe('產線 Line 2')
    expect(trigger(w).attributes('aria-haspopup')).toBe('dialog')
    await trigger(w).trigger('click')
    await flush()
    expect(w.find('[role="dialog"] [role="tree"]').exists()).toBe(true)
    // 第一次打開展開到已選節點
    expect(item(w, 'Line 2').attributes('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(item(w, 'Line 2').element)
  })

  it('showPath 顯示整條路徑', () => {
    const w = mountTs({ modelValue: 'l2', showPath: true })
    expect(nameOf(w)).toBe('產線 FAB-A / SMT / Line 2')
  })

  it('選了就關閉、焦點回觸發鈕', async () => {
    const w = mountTs()
    await trigger(w).trigger('click')
    await flush()
    await item(w, 'Office').trigger('click')
    await flush()
    expect(w.props('modelValue')).toBe('office')
    expect(w.emitted('change')?.[0]).toEqual(['office'])
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger(w).element)
  })

  it('搜尋：只列出符合的節點；搜尋框 ↓ 進到樹', async () => {
    const w = mountTs({ filterable: true })
    await trigger(w).trigger('click')
    await flush()
    const search = w.find('input[type="search"]')
    expect(document.activeElement).toBe(search.element)
    await search.setValue('line 1')
    const labels = w.findAll('[role="treeitem"]').map((r) => r.find('.truncate').text())
    expect(labels).toEqual(['FAB-A', 'SMT', 'Line 1'])
    await search.trigger('keydown', { key: 'ArrowDown' })
    await flush()
    expect(document.activeElement?.getAttribute('role')).toBe('treeitem')
  })

  it('Escape 關閉並歸還焦點；↓ 在觸發鈕上開啟', async () => {
    const w = mountTs()
    await trigger(w).trigger('keydown', { key: 'ArrowDown' })
    await flush()
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    await w.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await flush()
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger(w).element)
  })

  it('clearable', async () => {
    const w = mountTs({ modelValue: 'aoi', clearable: true })
    await w.find('button[aria-label="清除"]').trigger('click')
    expect(w.props('modelValue')).toBeNull()
    expect(nameOf(w)).toBe('產線 請選擇')
  })
})

describe('ChptTreeSelect：多選', () => {
  it('勾選送出 key 陣列；displayStrategy=parent 整組勾了只顯示父節點', async () => {
    const w = mountTs({ multiple: true, modelValue: [] })
    await trigger(w).trigger('click')
    await flush()
    await item(w, 'FAB-A').trigger('click') // 展開箭頭以外點整列 = 勾選
    await flush()
    const keys = (w.props('modelValue') as string[]).slice().sort()
    expect(keys).toEqual(['aoi', 'fab-a', 'l1', 'l2', 'smt'])
    expect(nameOf(w)).toBe('產線 FAB-A')
  })

  it('displayStrategy=child 只顯示葉節點；超過 maxTagCount 顯示 +N', () => {
    const w = mountTs({ multiple: true, modelValue: ['fab-a', 'smt', 'l1', 'l2', 'aoi'], displayStrategy: 'child', maxTagCount: 2 })
    expect(nameOf(w)).toBe('產線 Line 1Line 2+1')
  })

  it('多選時選取不會關閉面板', async () => {
    const w = mountTs({ multiple: true, modelValue: [] })
    await trigger(w).trigger('click')
    await flush()
    await item(w, 'Office').trigger('click')
    await flush()
    expect(w.props('modelValue')).toEqual(['office'])
    expect(w.find('[role="dialog"]').exists()).toBe(true)
  })

  it('clearable 多選清成空陣列', async () => {
    const w = mountTs({ multiple: true, modelValue: ['office'], clearable: true })
    await w.find('button[aria-label="清除"]').trigger('click')
    expect(w.props('modelValue')).toEqual([])
  })
})
