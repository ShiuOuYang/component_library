import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptDashboardGrid, { type DashboardItem } from '@/components/library/ui/ChptDashboardGrid.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

let wrapper: VueWrapper | null = null
beforeEach(() => localStorage.clear())
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  localStorage.clear()
})

const initial = (): DashboardItem[] => [
  { id: 'oee', title: 'OEE', x: 0, y: 0, w: 4, h: 2 },
  { id: 'output', title: '產量', x: 4, y: 0, w: 4, h: 2 },
  { id: 'alarm', title: '異常', x: 0, y: 2, w: 8, h: 2 },
  { id: 'logo', x: 8, y: 0, w: 4, h: 1, static: true },
]

/**
 * 4 欄、列高 50、間距 10；容器寬 430 → 每欄 (430 − 30) / 4 = 100px，每格移動 110px。
 */
function mountGrid(props: Record<string, unknown> = {}, layout = initial()) {
  const model = ref<DashboardItem[]>(layout)
  wrapper = mount(
    {
      render: () =>
        h(
          ChptDashboardGrid,
          { modelValue: model.value, 'onUpdate:modelValue': (v: DashboardItem[]) => (model.value = v), cols: 12, rowHeight: 50, gap: 10, editable: true, ...props },
          { default: ({ item }: { item: DashboardItem }) => h('p', { class: 'body' }, `內容 ${item.id}`) }
        ),
    },
    { attachTo: document.body }
  )
  vi.spyOn(wrapper.element as HTMLElement, 'getBoundingClientRect').mockReturnValue({ width: 1310, left: 0, top: 0 } as DOMRect)
  return { w: wrapper, model }
}

const item = (w: VueWrapper, id: string) => w.find(`[data-grid-id="${id}"]`)
const styleOf = (w: VueWrapper, id: string) => (item(w, id).element as HTMLElement).style
const pointer = (type: string, x: number, y: number) => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, button: 0, bubbles: true })
const get = (model: { value: DashboardItem[] }, id: string) => model.value.find((v) => v.id === id)!

// 12 欄、寬 1310、間距 10 → 每欄 100px，每格 110px；每列 60px
describe('ChptDashboardGrid', () => {
  it('依版面定位（calc 依容器寬度）；高度是最下緣；標題、內容插槽', () => {
    const { w } = mountGrid()
    const s = styleOf(w, 'output')
    // jsdom 會把 calc() 正規化，只檢查組成
    expect(s.left).toMatch(/^calc\(40px \+ 4 \* .*100% - 110px/)
    expect(s.width).toMatch(/^calc\(30px \+ 4 \* .*100% - 110px/)
    expect(s.top).toBe('0px')
    expect(s.height).toBe('110px')
    expect(styleOf(w, 'alarm').top).toBe('120px')
    expect((w.find('.chpt-dashboard-grid').element as HTMLElement).style.height).toBe('230px')
    expect(item(w, 'oee').find('h3').text()).toBe('OEE')
    expect(item(w, 'oee').attributes('aria-labelledby')).toBeTruthy()
    expect(item(w, 'oee').find('.body').text()).toBe('內容 oee')
  })

  it('editable 才有把手；static 的區塊沒有', () => {
    const { w } = mountGrid()
    expect(item(w, 'oee').find('.grid-drag-handle').exists()).toBe(true)
    expect(item(w, 'oee').find('.grid-resize-handle').exists()).toBe(true)
    expect(item(w, 'logo').find('.grid-drag-handle').exists()).toBe(false)
    wrapper!.unmount()
    const { w: w2 } = mountGrid({ editable: false })
    expect(w2.find('.grid-drag-handle').exists()).toBe(false)
  })

  it('拖曳移動：預覽框在目標位置、別人被推開；放開後送出新版面', async () => {
    const { w, model } = mountGrid()
    const handle = item(w, 'alarm').find('.grid-drag-handle').element
    handle.dispatchEvent(pointer('pointerdown', 0, 0))
    await nextTick()
    // 往上拖兩列（120px）
    window.dispatchEvent(pointer('pointermove', 0, -120))
    await nextTick()
    expect(w.find('.grid-placeholder').exists()).toBe(true)
    expect(styleOf(w, 'alarm').transform).toBe('translate(0px, -120px)')
    window.dispatchEvent(pointer('pointerup', 0, -120))
    await nextTick()
    expect(get(model, 'alarm')).toMatchObject({ x: 0, y: 0 })
    // oee 與 output 被推到 alarm 下面
    expect(get(model, 'oee').y).toBe(2)
    expect(get(model, 'output').y).toBe(2)
    expect(w.findComponent(ChptDashboardGrid).emitted('layout-change')).toHaveLength(1)
    expect(w.find('[aria-live="polite"]').text()).toBe('「異常」移到第 1 欄、第 1 列')
    expect(w.find('.grid-placeholder').exists()).toBe(false)
  })

  it('拖曳調整大小；Escape 取消', async () => {
    const { w, model } = mountGrid()
    item(w, 'oee').find('.grid-resize-handle').element.dispatchEvent(pointer('pointerdown', 0, 0))
    window.dispatchEvent(pointer('pointermove', 230, 60))
    await nextTick()
    expect(styleOf(w, 'oee').height).toBe('170px')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(get(model, 'oee')).toMatchObject({ w: 4, h: 2 })
    item(w, 'oee').find('.grid-resize-handle').element.dispatchEvent(pointer('pointerdown', 0, 0))
    window.dispatchEvent(pointer('pointermove', 230, 60))
    window.dispatchEvent(pointer('pointerup', 230, 60))
    await nextTick()
    expect(get(model, 'oee')).toMatchObject({ w: 6, h: 3 })
    expect(w.find('[aria-live="polite"]').text()).toBe('「OEE」大小 6 × 3')
  })

  it('鍵盤：方向鍵移動、Shift + 方向鍵調整大小', async () => {
    const { w, model } = mountGrid()
    const handle = item(w, 'oee').find('.grid-drag-handle')
    expect(handle.attributes('aria-label')).toContain('方向鍵移動')
    await handle.trigger('keydown', { key: 'ArrowDown' })
    expect(get(model, 'oee').y).toBeGreaterThan(0)
    await handle.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    expect(get(model, 'oee').w).toBe(5)
    await handle.trigger('keydown', { key: 'Enter' })
    expect(w.find('[aria-live="polite"]').text()).toBe('「OEE」大小 5 × 2')
  })

  it('沒有變化時不送出；非主要按鍵不開始拖曳', async () => {
    const { w } = mountGrid()
    const handle = item(w, 'oee').find('.grid-drag-handle').element
    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 2, pointerId: 1, bubbles: true }))
    window.dispatchEvent(pointer('pointermove', 300, 0))
    await nextTick()
    expect(w.find('.grid-placeholder').exists()).toBe(false)
    handle.dispatchEvent(pointer('pointerdown', 0, 0))
    window.dispatchEvent(pointer('pointermove', 20, 10))
    window.dispatchEvent(pointer('pointerup', 20, 10))
    await nextTick()
    expect(w.findComponent(ChptDashboardGrid).emitted('update:modelValue')).toBeUndefined()
  })

  it('persistKey：記住版面，重新掛載時套用；壞資料與 localStorage 丟錯不影響', async () => {
    let { w, model } = mountGrid({ persistKey: 'line-a' })
    await item(w, 'oee').find('.grid-drag-handle').trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    const saved = JSON.parse(localStorage.getItem('chpt-dashboard:line-a')!)
    expect(saved.find((s: DashboardItem) => s.id === 'oee').w).toBe(5)
    w.unmount()
    ;({ w, model } = mountGrid({ persistKey: 'line-a' }))
    await nextTick()
    expect(get(model, 'oee').w).toBe(5)
    w.unmount()
    localStorage.setItem('chpt-dashboard:bad', '{oops')
    ;({ w, model } = mountGrid({ persistKey: 'bad' }))
    await nextTick()
    expect(get(model, 'oee').w).toBe(4)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    await item(w, 'oee').find('.grid-drag-handle').trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    expect(get(model, 'oee').w).toBe(5)
    const vm = w.findComponent(ChptDashboardGrid).vm as unknown as { clearSaved: () => void; layout: () => DashboardItem[] }
    vm.clearSaved()
    expect(vm.layout().find((v) => v.id === 'oee')!.w).toBe(5)
  })

  it('窄螢幕：改成一欄依位置排列、不能編輯', async () => {
    let cb: ResizeObserverCallback | null = null
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(fn: ResizeObserverCallback) {
          cb = fn
        }
        observe() {}
        disconnect() {}
      }
    )
    const { w } = mountGrid({}, [initial()[2], initial()[1], initial()[0]])
    cb!([{ contentRect: { width: 400 } } as ResizeObserverEntry], {} as ResizeObserver)
    await nextTick()
    expect(w.find('.chpt-dashboard-grid').classes()).toContain('is-stacked')
    expect(w.findAll('[data-grid-id]').map((e) => e.attributes('data-grid-id'))).toEqual(['oee', 'output', 'alarm'])
    expect(w.find('.grid-drag-handle').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('欄數變少時把超出的區塊拉回來', async () => {
    const cols = ref(12)
    const model = ref<DashboardItem[]>(initial())
    wrapper = mount(
      { render: () => h(ChptDashboardGrid, { modelValue: model.value, 'onUpdate:modelValue': (v: DashboardItem[]) => (model.value = v), cols: cols.value }) },
      { attachTo: document.body }
    )
    cols.value = 6
    await nextTick()
    await nextTick()
    expect(model.value.every((v) => v.x + v.w <= 6)).toBe(true)
  })

  it('語系：enUS', () => {
    wrapper = mount(
      { render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptDashboardGrid, { modelValue: initial(), editable: true })) },
      { attachTo: document.body }
    )
    expect(wrapper.find('[role="region"]').attributes('aria-label')).toBe('Dashboard')
    expect(wrapper.find('.grid-drag-handle').attributes('aria-label')).toContain('arrow keys to move')
  })
})
