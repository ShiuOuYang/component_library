import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptKanban, { type KanbanColumn } from '@/components/library/ui/ChptKanban.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

type Card = { id: string; title: string; status: string; locked?: boolean }

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const columns: KanbanColumn[] = [
  { id: 'todo', title: '待處理', color: '#999' },
  { id: 'doing', title: '處理中', limit: 1 },
  { id: 'qa', title: '品檢' },
  { id: 'done', title: '結案' },
]
const initial = (): Card[] => [
  { id: 'A', title: '更換吸嘴', status: 'todo' },
  { id: 'B', title: '校正 AOI', status: 'todo' },
  { id: 'C', title: '回焊爐保養', status: 'doing' },
  { id: 'D', title: '鋼板清潔', status: 'qa', locked: true },
]

function mountBoard(props: Record<string, unknown> = {}) {
  const model = ref<Card[]>(initial())
  wrapper = mount(
    {
      render: () =>
        h(ChptKanban<Card>, {
          modelValue: model.value,
          'onUpdate:modelValue': (v: Card[]) => (model.value = v),
          columns,
          ...props,
        }),
    },
    { attachTo: document.body }
  )
  return { w: wrapper, model, board: () => wrapper!.findComponent(ChptKanban) }
}

const colTitles = (w: VueWrapper, id: string) => w.findAll(`[data-column="${id}"] [data-card-key]`).map((c) => c.text())
const card = (w: VueWrapper, key: string) => w.find(`[data-card-key="${key}"]`)
const live = (w: VueWrapper) => w.find('[aria-live="assertive"]').text()
const statusOf = (model: { value: Card[] }, id: string) => model.value.find((c) => c.id === id)!.status

/** jsdom 沒有排版：給每一欄、每張卡片假的位置（欄寬 200、卡片高 40） */
function fakeLayout(w: VueWrapper) {
  const cols = w.findAll('[data-column]').map((c) => c.element as HTMLElement)
  cols.forEach((el, i) => {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: i * 210, right: i * 210 + 200, top: 0, bottom: 600, width: 200, height: 600 } as DOMRect)
    ;[...el.querySelectorAll<HTMLElement>('[data-card-key]')].forEach((cardEl, j) => {
      vi.spyOn(cardEl, 'getBoundingClientRect').mockReturnValue({ left: i * 210 + 8, right: i * 210 + 192, top: 50 + j * 50, bottom: 90 + j * 50, width: 184, height: 40 } as DOMRect)
    })
  })
}
const pointer = (type: string, x: number, y: number) => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, button: 0, bubbles: true })

describe('ChptKanban', () => {
  it('依欄列出卡片；欄的數量與在製上限；超過上限時標示', () => {
    const { w } = mountBoard()
    expect(colTitles(w, 'todo')).toEqual(['更換吸嘴', '校正 AOI'])
    expect(w.find('[data-column="doing"] .kanban-count').text()).toContain('1 / 1')
    expect(w.find('[data-column="done"]').text()).toContain('沒有卡片')
    expect(w.find('[data-column="todo"] h3').text()).toBe('待處理')
    expect(w.find('[data-column="todo"]').attributes('aria-labelledby')).toBeTruthy()
  })

  it('滑鼠拖曳到另一欄的指定位置：預覽、放開後送出 update 與 move', async () => {
    const { w, model, board } = mountBoard()
    fakeLayout(w)
    card(w, 'B').element.dispatchEvent(pointer('pointerdown', 20, 110))
    window.dispatchEvent(pointer('pointermove', 30, 115)) // 還不到 5px 以外？剛好超過
    window.dispatchEvent(pointer('pointermove', 640, 20)) // 移到「結案」欄的最上面
    await nextTick()
    expect(w.find('.kanban-ghost').exists()).toBe(true)
    expect(colTitles(w, 'done')).toEqual(['校正 AOI'])
    window.dispatchEvent(pointer('pointerup', 640, 20))
    await nextTick()
    expect(statusOf(model, 'B')).toBe('done')
    expect(board().emitted('move')![0][0]).toMatchObject({ from: 'todo', to: 'done', index: 0 })
    expect(live(w)).toBe('「校正 AOI」已放到「結案」第 1 張')
    expect(w.find('.kanban-ghost').exists()).toBe(false)
  })

  it('同一欄調整順序', async () => {
    const { w, model } = mountBoard()
    fakeLayout(w)
    card(w, 'B').element.dispatchEvent(pointer('pointerdown', 20, 110))
    window.dispatchEvent(pointer('pointermove', 20, 40))
    window.dispatchEvent(pointer('pointerup', 20, 40))
    await nextTick()
    expect(model.value.filter((c) => c.status === 'todo').map((c) => c.id)).toEqual(['B', 'A'])
  })

  it('沒有拖曳（移動不到 5px）就是點擊；Escape 取消拖曳', async () => {
    const { w, model, board } = mountBoard()
    fakeLayout(w)
    card(w, 'A').element.dispatchEvent(pointer('pointerdown', 20, 60))
    window.dispatchEvent(pointer('pointermove', 22, 61))
    window.dispatchEvent(pointer('pointerup', 22, 61))
    expect(board().emitted('card-click')![0][0]).toMatchObject({ id: 'A' })
    card(w, 'A').element.dispatchEvent(pointer('pointerdown', 20, 60))
    window.dispatchEvent(pointer('pointermove', 640, 20))
    await nextTick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(statusOf(model, 'A')).toBe('todo')
    expect(live(w)).toBe('取消移動「更換吸嘴」')
  })

  it('canMove：不允許的欄拖過去時標示禁止、放開也不移動', async () => {
    const canMove = (_c: Card, from: string, to: string) => !(from === 'todo' && to === 'done')
    const { w, model } = mountBoard({ canMove })
    fakeLayout(w)
    card(w, 'A').element.dispatchEvent(pointer('pointerdown', 20, 60))
    window.dispatchEvent(pointer('pointermove', 220, 20)) // 先經過允許的「處理中」
    await nextTick()
    expect(colTitles(w, 'doing')).toContain('更換吸嘴')
    window.dispatchEvent(pointer('pointermove', 640, 20))
    await nextTick()
    expect(w.find('[data-column="done"]').classes()).toContain('is-blocked')
    // 預覽回到原位
    expect(colTitles(w, 'todo')).toEqual(['更換吸嘴', '校正 AOI'])
    expect(colTitles(w, 'doing')).not.toContain('更換吸嘴')
    window.dispatchEvent(pointer('pointerup', 640, 20))
    await nextTick()
    expect(statusOf(model, 'A')).toBe('todo')
    expect(live(w)).toBe('「更換吸嘴」不能移到「結案」')
  })

  it('enforceLimit：不能放進已滿的欄；沒開時可以放、超過時欄標紅', async () => {
    let m = mountBoard({ enforceLimit: true })
    fakeLayout(m.w)
    card(m.w, 'A').element.dispatchEvent(pointer('pointerdown', 20, 60))
    window.dispatchEvent(pointer('pointermove', 220, 20))
    window.dispatchEvent(pointer('pointerup', 220, 20))
    await nextTick()
    expect(statusOf(m.model, 'A')).toBe('todo')
    m.w.unmount()
    m = mountBoard()
    fakeLayout(m.w)
    card(m.w, 'A').element.dispatchEvent(pointer('pointerdown', 20, 60))
    window.dispatchEvent(pointer('pointermove', 220, 20))
    window.dispatchEvent(pointer('pointerup', 220, 20))
    await nextTick()
    expect(statusOf(m.model, 'A')).toBe('doing')
    expect(m.w.find('[data-column="doing"] .kanban-count').text()).toContain('超過在製上限 1')
  })

  it('鍵盤：空白鍵拿起 → 方向鍵移動（左右換欄、上下換位置）→ 空白鍵放下；每一步念出', async () => {
    const { w, model, board } = mountBoard()
    await card(w, 'A').trigger('keydown', { key: ' ' })
    expect(live(w)).toBe('已拿起「更換吸嘴」：「待處理」第 1 張，共 2 張')
    await card(w, 'A').trigger('keydown', { key: 'ArrowDown' })
    expect(colTitles(w, 'todo')).toEqual(['校正 AOI', '更換吸嘴'])
    await card(w, 'A').trigger('keydown', { key: 'ArrowRight' })
    expect(live(w)).toBe('「更換吸嘴」：「處理中」第 2 張，共 2 張')
    await card(w, 'A').trigger('keydown', { key: 'ArrowUp' })
    await card(w, 'A').trigger('keydown', { key: 'ArrowUp' }) // 已在最上面
    expect(colTitles(w, 'doing')).toEqual(['更換吸嘴', '回焊爐保養'])
    await nextTick()
    expect(document.activeElement).toBe(card(w, 'A').element)
    await card(w, 'A').trigger('keydown', { key: ' ' })
    expect(statusOf(model, 'A')).toBe('doing')
    expect(board().emitted('move')![0][0]).toMatchObject({ from: 'todo', to: 'doing', index: 0 })
    expect(live(w)).toBe('「更換吸嘴」已放到「處理中」第 1 張')
  })

  it('鍵盤：Escape 取消；左右跳過不允許的欄、到邊界念出不能移動；Enter 開啟', async () => {
    const canMove = (_c: Card, _from: string, to: string) => to !== 'doing'
    const { w, model, board } = mountBoard({ canMove })
    await card(w, 'A').trigger('keydown', { key: ' ' })
    await card(w, 'A').trigger('keydown', { key: 'ArrowRight' }) // 跳過「處理中」
    expect(live(w)).toContain('「品檢」')
    await card(w, 'A').trigger('keydown', { key: 'ArrowRight' })
    await card(w, 'A').trigger('keydown', { key: 'ArrowRight' }) // 已在最後一欄
    expect(live(w)).toContain('「結案」')
    await card(w, 'A').trigger('keydown', { key: 'Escape' })
    expect(live(w)).toBe('取消移動「更換吸嘴」')
    expect(statusOf(model, 'A')).toBe('todo')
    await card(w, 'A').trigger('keydown', { key: ' ' })
    await card(w, 'A').trigger('keydown', { key: 'ArrowLeft' }) // 已在最左邊：留在原地
    expect(live(w)).toBe('已拿起「更換吸嘴」：「待處理」第 1 張，共 2 張')
    await card(w, 'A').trigger('keydown', { key: 'Escape' })
    // 從「品檢」往左：「處理中」不允許、再往左是「待處理」
    await card(w, 'D').trigger('keydown', { key: ' ' })
    await card(w, 'D').trigger('keydown', { key: 'ArrowLeft' })
    expect(live(w)).toBe('「鋼板清潔」：「待處理」第 1 張，共 3 張') // 換欄時保留原本的上下位置
    await card(w, 'A').trigger('keydown', { key: 'Tab' }) // 其他鍵不處理
    await card(w, 'A').trigger('keydown', { key: 'Escape' })
    await card(w, 'B').trigger('keydown', { key: 'Enter' })
    expect(board().emitted('card-click')![0][0]).toMatchObject({ id: 'B' })
  })

  it('isLocked / disabled：不能拖、不能用鍵盤拿起；放回原位不送事件', async () => {
    const { w, board } = mountBoard({ isLocked: (c: Card) => !!c.locked })
    fakeLayout(w)
    expect(card(w, 'D').attributes('aria-describedby')).toBeUndefined()
    await card(w, 'D').trigger('keydown', { key: ' ' })
    expect(live(w)).toBe('')
    card(w, 'D').element.dispatchEvent(pointer('pointerdown', 440, 60))
    window.dispatchEvent(pointer('pointermove', 640, 20))
    window.dispatchEvent(pointer('pointerup', 640, 20))
    await nextTick()
    expect(board().emitted('move')).toBeUndefined()
    // 拿起又放回原位
    await card(w, 'A').trigger('keydown', { key: ' ' })
    await card(w, 'A').trigger('keydown', { key: ' ' })
    expect(board().emitted('update:modelValue')).toBeUndefined()
  })

  it('插槽：card、column-header、column-footer、empty', () => {
    wrapper = mount(ChptKanban<Card>, {
      props: { modelValue: initial(), columns },
      slots: {
        card: ({ card: c }: { card: Card }) => h('strong', { class: 'my-card' }, `#${c.id}`),
        'column-header': ({ column, cards }: { column: KanbanColumn; cards: Card[] }) => `${column.title}（${cards.length}）`,
        'column-footer': ({ column }: { column: KanbanColumn }) => h('button', { type: 'button', class: 'add' }, `新增到${column.title}`),
        empty: () => '空',
      },
      attachTo: document.body,
    })
    expect(wrapper.findAll('.my-card').map((e) => e.text())).toEqual(['#A', '#B', '#C', '#D'])
    expect(wrapper.find('[data-column="todo"] h3').text()).toBe('待處理（2）')
    expect(wrapper.findAll('.add')).toHaveLength(4)
    expect(wrapper.find('[data-column="done"]').text()).toContain('空')
  })

  it('語系：enUS', async () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptKanban, { modelValue: initial(), columns })) }, { attachTo: document.body })
    expect(wrapper.find('[role="region"]').attributes('aria-label')).toBe('Board')
    await wrapper.find('[data-card-key="A"]').trigger('keydown', { key: ' ' })
    expect(wrapper.find('[aria-live="assertive"]').text()).toBe('Picked up 更換吸嘴: 待處理, position 1 of 2')
  })
})
