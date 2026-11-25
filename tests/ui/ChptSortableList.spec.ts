import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptSortableList from '@/components/library/ui/ChptSortableList.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { SortItem } from '@/components/library/shared/sortableList'

// ---- 版面：每一列高 36、間距 4（第 i 列在 y = 40i），清單寬 300 ----
const rects = new Map<Element, DOMRect>()
const R = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect
beforeEach(() => {
  rects.clear()
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return rects.get(this) ?? R(0, 0, 0, 0)
  })
})
const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})
function layout(w: VueWrapper, left = 0) {
  const root = w.find('.sortable-list').element
  const lis = w.findAll('li')
  rects.set(root, R(left, 0, 300, Math.max(40, lis.length * 40)))
  lis.forEach((li, i) => rects.set(li.element, R(left, i * 40, 300, 36)))
}

/** 等畫面更新與 TransitionGroup 的離開動畫（兩個影格） */
const settle = () => new Promise((r) => setTimeout(r, 50))

function pointer(target: EventTarget, type: string, x: number, y: number, extra: Record<string, unknown> = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    clientX: { value: x },
    clientY: { value: y },
    pointerId: { value: 1 },
    button: { value: 0 },
    pointerType: { value: 'mouse' },
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])),
  })
  target.dispatchEvent(e)
}

const flat = (): SortItem[] => [
  { id: 'a', label: '投料', locked: true },
  { id: 'b', label: '印刷', description: '錫膏' },
  { id: 'c', label: '貼片' },
  { id: 'd', label: '迴焊' },
]
const nested = (): SortItem[] => [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B', children: [{ id: 'b1', label: 'B1', leaf: true }] },
  { id: 'c', label: 'C' },
]

function mountIt(props: Record<string, unknown> = {}, opts: { items?: SortItem[]; wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>; slots?: Record<string, unknown> } = {}) {
  const items = ref<SortItem[]>(opts.items ?? flat())
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  const node = () =>
    h(
      ChptSortableList,
      {
        ...props,
        modelValue: items.value,
        'onUpdate:modelValue': (v: SortItem[]) => (rec('items')(v), (items.value = v)),
        onChange: rec('change'),
        onAdd: rec('add'),
        onRemove: rec('remove'),
      },
      opts.slots
    )
  const w = mount({ render: () => (opts.wrap ? opts.wrap(node()) : node()) }, { attachTo: document.body, global: { stubs: { 'transition-group': false, TransitionGroup: false } } })
  mounted.push(w)
  const ids = () => w.findAll('li').map((li) => li.attributes('data-id'))
  const grip = (id: string) => w.find(`[data-grip="${id}"]`)
  const live = () => w.find('[aria-live="assertive"]').text()
  return { w, items, emitted, ids, grip, live }
}

describe('ChptSortableList', () => {
  it('平面清單：項目、說明、鎖定、把手的 aria、空清單', () => {
    const { w, grip } = mountIt()
    expect(w.find('ul').attributes('role')).toBe('list')
    expect(w.findAll('li')).toHaveLength(4)
    expect(w.find('li[data-id="b"]').text()).toContain('錫膏')
    expect(w.find('li[data-id="a"] [role="img"]').attributes('aria-label')).toBe('固定，不能移動')
    expect(grip('b').attributes('aria-label')).toBe('拖曳 印刷（第 2 / 4 項）')
    expect(grip('a').attributes('aria-disabled')).toBe('true')
    expect(grip('a').attributes('tabindex')).toBe('0')
    expect(grip('b').attributes('tabindex')).toBe('-1')
    const empty = mountIt({ emptyText: '空的' }, { items: [] })
    expect(empty.w.text()).toContain('空的')
  })

  it('指標拖曳：超過 4px 才開始、指示線與幽靈、放下後送出；放回原位不送', async () => {
    const { w, ids, emitted, grip, live } = mountIt()
    layout(w)
    pointer(grip('b').element, 'pointerdown', 10, 50)
    pointer(window, 'pointermove', 11, 51)
    await nextTick()
    expect(document.querySelector('[data-ghost]')).toBeNull()
    pointer(window, 'pointermove', 10, 100)
    await nextTick()
    expect(document.querySelector('[data-ghost]')!.textContent).toContain('印刷')
    expect(w.find('[data-indicator]').attributes('style')).toContain('top: 117px')
    expect(w.find('li[data-id="b"] > div').classes()).toContain('opacity-40')
    pointer(window, 'pointerup', 10, 100)
    await nextTick()
    expect(ids()).toEqual(['a', 'c', 'b', 'd'])
    expect(emitted.change).toEqual([{ item: flat()[1], from: { parentId: null, index: 1 }, to: { parentId: null, index: 2 } }])
    expect(live()).toBe('已放下 印刷，第 3 / 4 項')
    expect(w.find('[data-indicator]').exists()).toBe(false)
    // 放回原位：不送出
    layout(w)
    pointer(grip('b').element, 'pointerdown', 10, 90)
    pointer(window, 'pointermove', 10, 95)
    pointer(window, 'pointerup', 10, 95)
    expect(emitted.change).toHaveLength(1)
    // 拖到清單外：不送出
    pointer(grip('b').element, 'pointerdown', 10, 90)
    pointer(window, 'pointermove', 999, 999)
    pointer(window, 'pointerup', 999, 999)
    expect(emitted.change).toHaveLength(1)
    // 沒有移動就放開
    pointer(grip('b').element, 'pointerdown', 10, 90)
    pointer(window, 'pointerup', 10, 90)
    expect(emitted.change).toHaveLength(1)
  })

  it('Esc 取消拖曳；鎖定、右鍵、停用不能拖', async () => {
    const { w, emitted, grip, live } = mountIt()
    layout(w)
    pointer(grip('d').element, 'pointerdown', 10, 130)
    pointer(window, 'pointermove', 10, 10)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(live()).toBe('已取消移動')
    pointer(window, 'pointerup', 10, 10)
    pointer(grip('a').element, 'pointerdown', 10, 10)
    pointer(window, 'pointermove', 10, 150)
    pointer(window, 'pointerup', 10, 150)
    pointer(grip('c').element, 'pointerdown', 10, 90, { button: 2 })
    pointer(window, 'pointermove', 10, 10)
    pointer(window, 'pointerup', 10, 10)
    expect(emitted.items).toBeUndefined()
    const off = mountIt({ disabled: true })
    layout(off.w)
    pointer(off.grip('c').element, 'pointerdown', 10, 90)
    pointer(window, 'pointermove', 10, 10)
    pointer(window, 'pointerup', 10, 10)
    expect(off.emitted.items).toBeUndefined()
  })

  it('巢狀：往右拖成為子項、canDrop 規則、收合與數量', async () => {
    const { w, items, emitted, grip } = mountIt({ maxDepth: 2 }, { items: nested() })
    expect(w.find('ul').attributes('role')).toBe('tree')
    expect(w.find('li[data-id="b1"]').attributes('aria-level')).toBe('2')
    expect(w.find('li[data-id="b"]').attributes('aria-expanded')).toBe('true')
    layout(w)
    // C（第 4 列）往右 30px：成為 B 的子項
    pointer(grip('c').element, 'pointerdown', 10, 130)
    pointer(window, 'pointermove', 40, 132)
    pointer(window, 'pointerup', 40, 132)
    expect(items.value.map((x) => x.id)).toEqual(['a', 'b'])
    expect(items.value[1].children!.map((x) => x.id)).toEqual(['b1', 'c'])
    expect((emitted.change[0] as { to: unknown }).to).toEqual({ parentId: 'b', index: 1 })
    await nextTick()
    // 收合
    await w.find('li[data-id="b"] button[aria-label="收合 B"]').trigger('click')
    await settle()
    expect(w.findAll('li')).toHaveLength(2)
    expect(w.find('li[data-id="b"]').text()).toContain('2')
    expect(w.find('li[data-id="b"]').attributes('aria-expanded')).toBe('false')
    await w.find('button[aria-label="展開 B"]').trigger('click')
    // canDrop：不准放到別人底下
    const rule = mountIt({ maxDepth: 2, canDrop: (_i: SortItem, parent: SortItem | null) => parent === null }, { items: nested() })
    layout(rule.w)
    pointer(rule.grip('c').element, 'pointerdown', 10, 130)
    pointer(window, 'pointermove', 40, 132)
    await nextTick()
    expect(rule.w.find('[data-indicator]').exists()).toBe(false)
    pointer(window, 'pointerup', 40, 132)
    expect(rule.emitted.items).toBeUndefined()
  })

  it('跨清單：同一個 group 才能互拖、put=false 不收', async () => {
    const left = mountIt({ group: 'g' })
    const right = mountIt({ group: 'g', emptyText: '拖到這裡' }, { items: [] })
    const other = mountIt({ group: 'x' }, { items: [] })
    layout(left.w, 0)
    layout(right.w, 400)
    layout(other.w, 800)
    pointer(left.grip('c').element, 'pointerdown', 10, 90)
    pointer(window, 'pointermove', 410, 10)
    await nextTick()
    expect(right.w.find('[data-indicator]').exists()).toBe(true)
    expect(right.w.find('ul').classes().join(' ')).toContain('outline')
    pointer(window, 'pointermove', 810, 10) // 不同 group
    await nextTick()
    expect(right.w.find('[data-indicator]').exists()).toBe(false)
    expect(other.w.find('[data-indicator]').exists()).toBe(false)
    pointer(window, 'pointermove', 410, 10)
    pointer(window, 'pointerup', 410, 10)
    await settle()
    expect(left.ids()).toEqual(['a', 'b', 'd'])
    expect(right.items.value.map((x) => x.id)).toEqual(['c'])
    expect(left.emitted.remove).toHaveLength(1)
    expect(right.emitted.add).toEqual([{ item: flat()[2], from: { parentId: null, index: -1 }, to: { parentId: null, index: 0 } }])
    expect(right.live()).toBe('已放下 貼片，第 1 / 1 項')
    // put=false
    const closed = mountIt({ group: 'g', put: false }, { items: [] })
    layout(closed.w, 1200)
    layout(left.w, 0)
    pointer(left.grip('b').element, 'pointerdown', 10, 50)
    pointer(window, 'pointermove', 1210, 10)
    pointer(window, 'pointerup', 1210, 10)
    expect(closed.emitted.add).toBeUndefined()
  })

  it('鍵盤：空白鍵拿起、方向鍵移動（先預覽）、空白鍵放下、Esc 取消、Tab 放下、鎖定不能拿', async () => {
    const { ids, emitted, grip, live } = mountIt()
    await grip('b').trigger('keydown', { key: ' ' })
    expect(grip('b').attributes('aria-pressed')).toBe('true')
    expect(live()).toBe('已拿起 印刷，目前第 2 / 4 項')
    await grip('b').trigger('keydown', { key: 'ArrowDown' })
    expect(ids()).toEqual(['a', 'c', 'b', 'd'])
    expect(emitted.items).toBeUndefined()
    expect(live()).toBe('移到第 3 / 4 項')
    await grip('b').trigger('keydown', { key: 'ArrowRight' }) // 平面清單不能縮排
    await grip('b').trigger('keydown', { key: 'Enter' })
    expect(emitted.items).toHaveLength(1)
    expect(emitted.change).toHaveLength(1)
    // Esc 取消
    await grip('b').trigger('keydown', { key: ' ' })
    await grip('b').trigger('keydown', { key: 'ArrowUp' })
    await grip('b').trigger('keydown', { key: 'ArrowUp' })
    await grip('b').trigger('keydown', { key: 'ArrowUp' }) // 已在最上面
    await grip('b').trigger('keydown', { key: 'Escape' })
    expect(ids()).toEqual(['a', 'c', 'b', 'd'])
    expect(live()).toBe('已取消移動')
    // 拿起又放回原位：不送出
    await grip('b').trigger('keydown', { key: ' ' })
    await grip('b').trigger('keydown', { key: 'x' })
    await grip('b').trigger('keydown', { key: ' ' })
    expect(emitted.items).toHaveLength(1)
    // Tab 也會放下
    await grip('d').trigger('keydown', { key: ' ' })
    await grip('d').trigger('keydown', { key: 'ArrowUp' })
    await grip('d').trigger('keydown', { key: 'Tab' })
    expect(ids()).toEqual(['a', 'c', 'd', 'b'])
    // 鎖定
    await grip('a').trigger('keydown', { key: ' ' })
    expect(live()).toBe('投料 是固定的，不能移動')
    // 沒拿起時：方向鍵移動焦點
    await grip('a').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(document.activeElement?.getAttribute('data-grip')).toBe('c')
    await grip('c').trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement?.getAttribute('data-grip')).toBe('b')
    await grip('b').trigger('keydown', { key: 'Home' })
    await grip('a').trigger('keydown', { key: 'ArrowUp' })
    await grip('a').trigger('keydown', { key: 'ArrowRight' })
    await grip('a').trigger('keydown', { key: 'q' })
  })

  it('鍵盤（巢狀）：縮排 / 取消縮排、移進收合的父項會展開、canDrop、左右收合展開', async () => {
    const { w, items, grip } = mountIt({ maxDepth: 3 }, { items: nested() })
    await grip('b').trigger('keydown', { key: 'ArrowLeft' })
    await settle()
    expect(w.findAll('li')).toHaveLength(3)
    await grip('b').trigger('keydown', { key: 'ArrowLeft' }) // 已收合
    await grip('c').trigger('keydown', { key: ' ' })
    await grip('c').trigger('keydown', { key: 'ArrowRight' })
    expect(w.findAll('li').map((li) => li.attributes('data-id'))).toEqual(['a', 'b', 'b1', 'c'])
    expect(w.find('li[data-id="c"]').attributes('aria-level')).toBe('2')
    await grip('c').trigger('keydown', { key: 'ArrowLeft' })
    await grip('c').trigger('keydown', { key: 'ArrowRight' })
    await grip('c').trigger('keydown', { key: ' ' })
    expect(items.value[1].children!.map((x) => x.id)).toEqual(['b1', 'c'])
    await grip('b').trigger('keydown', { key: 'ArrowRight' })
    // canDrop 擋住
    const rule = mountIt({ maxDepth: 3, canDrop: (_i: SortItem, p: SortItem | null) => p === null }, { items: nested() })
    await rule.grip('c').trigger('keydown', { key: ' ' })
    await rule.grip('c').trigger('keydown', { key: 'ArrowRight' })
    await rule.grip('c').trigger('keydown', { key: ' ' })
    expect(rule.emitted.items).toBeUndefined()
  })

  it('整列可拖（handle=false）、自訂內容、方法、英文語系', async () => {
    const whole = mountIt({ handle: false }, { slots: { item: ({ item, depth }: { item: SortItem; depth: number }) => h('b', `${item.label}@${depth}`) } })
    expect(whole.w.find('button[data-grip]').exists()).toBe(false)
    expect(whole.grip('b').element.tagName).toBe('DIV')
    expect(whole.w.find('li[data-id="b"]').text()).toBe('印刷@0')
    layout(whole.w)
    pointer(whole.grip('d').element, 'pointerdown', 10, 130)
    pointer(window, 'pointermove', 10, 5)
    pointer(window, 'pointerup', 10, 5)
    await settle()
    expect(whole.ids()).toEqual(['d', 'a', 'b', 'c'])
    await whole.grip('b').trigger('focus')
    await whole.grip('b').trigger('keydown', { key: ' ' })
    expect(whole.grip('b').attributes('class')).toContain('border-accent')
    await whole.grip('b').trigger('keydown', { key: 'Escape' })
    const { w } = mountIt({ maxDepth: 2 }, { items: nested() })
    const vm = w.findComponent(ChptSortableList).vm as unknown as { toggle: (id: string) => void; expandAll: () => void; collapseAll: () => void; isDescendant: (a: string, b: string) => boolean }
    vm.collapseAll()
    await settle()
    expect(w.findAll('li')).toHaveLength(3)
    vm.expandAll()
    await nextTick()
    expect(w.findAll('li')).toHaveLength(4)
    vm.toggle('b')
    await settle()
    expect(w.findAll('li')).toHaveLength(3)
    expect(vm.isDescendant('b', 'b1')).toBe(true)
    const en = mountIt({ maxDepth: 2 }, { items: nested(), wrap: (n) => h(ChptConfigProvider, { locale: enUS }, () => n) })
    expect(en.grip('b1').attributes('aria-label')).toBe('Drag B1 (item 1 of 1)')
    await en.grip('b1').trigger('keydown', { key: ' ' })
    expect(en.live()).toBe('Picked up B1, item 1 of 1 under B')
  })
})
