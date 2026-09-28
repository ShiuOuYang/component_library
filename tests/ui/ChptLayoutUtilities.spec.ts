import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptCarousel from '@/components/library/ui/ChptCarousel.vue'
import ChptSplitter from '@/components/library/ui/ChptSplitter.vue'
import ChptVirtualList from '@/components/library/ui/ChptVirtualList.vue'
import ChptAffix from '@/components/library/ui/ChptAffix.vue'

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Carousel
// ---------------------------------------------------------------------------

describe('ChptCarousel', () => {
  const slides = ['A', 'B', 'C']
  function mountCarousel(props: Record<string, unknown> = {}) {
    const w = mount(ChptCarousel, {
      props: { items: slides, ariaLabel: '公告', ...props, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }) },
      slots: { default: `<template #default="{ item }"><p class="slide">{{ item }}</p></template>` },
      attachTo: document.body,
    })
    wrapper = w
    return w
  }

  it('WAI-ARIA carousel：region + slide 群組；看不到的張 inert / aria-hidden', () => {
    const w = mountCarousel()
    expect(w.attributes('aria-roledescription')).toBe('carousel')
    expect(w.attributes('aria-label')).toBe('公告')
    const groups = w.findAll('[aria-roledescription="slide"]')
    expect(groups.map((g) => g.attributes('aria-label'))).toEqual(['1 / 3', '2 / 3', '3 / 3'])
    expect(groups[0].attributes('aria-hidden')).toBeUndefined()
    expect(groups[1].attributes('aria-hidden')).toBe('true')
    expect(groups[1].attributes('inert')).toBeDefined()
  })

  it('上一張 / 下一張 / 指示點；loop 循環', async () => {
    const w = mountCarousel()
    await w.find('button[aria-label="下一張"]').trigger('click')
    expect(w.props('modelValue')).toBe(1)
    await w.find('button[aria-label="第 3 張"]').trigger('click')
    expect(w.props('modelValue')).toBe(2)
    expect(w.find('button[aria-label="第 3 張"]').attributes('aria-current')).toBe('true')
    await w.find('button[aria-label="下一張"]').trigger('click')
    expect(w.props('modelValue')).toBe(0)
    expect(w.emitted('change')?.at(-1)).toEqual([0, 2])
  })

  it('loop=false：頭尾的箭頭停用', () => {
    const w = mountCarousel({ loop: false })
    expect(w.find('button[aria-label="上一張"]').attributes('disabled')).toBeDefined()
  })

  it('焦點在輪播裡時 ← → 切換', async () => {
    const w = mountCarousel()
    await w.trigger('keydown', { key: 'ArrowRight' })
    expect(w.props('modelValue')).toBe(1)
    await w.trigger('keydown', { key: 'ArrowLeft' })
    expect(w.props('modelValue')).toBe(0)
  })

  it('autoplay：暫停鈕是第一個按鈕；滑鼠停留或聚焦時不前進；自動輪播時 aria-live=off', async () => {
    vi.useFakeTimers()
    const w = mountCarousel({ autoplay: true, interval: 1000 })
    const first = w.find('button')
    expect(first.attributes('aria-label')).toBe('暫停自動播放')
    expect(w.find('[aria-live]').attributes('aria-live')).toBe('off')
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(w.props('modelValue')).toBe(1)

    await w.trigger('mouseenter')
    vi.advanceTimersByTime(3000)
    expect(w.props('modelValue')).toBe(1)
    expect(w.find('[aria-live]').attributes('aria-live')).toBe('polite')
    await w.trigger('mouseleave')

    await first.trigger('click')
    expect(w.find('button').attributes('aria-label')).toBe('開始自動播放')
    vi.advanceTimersByTime(5000)
    expect(w.props('modelValue')).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Splitter
// ---------------------------------------------------------------------------

describe('ChptSplitter', () => {
  function mountSplitter(props: Record<string, unknown> = {}) {
    const w = mount(ChptSplitter, {
      props: { modelValue: 40, ariaLabel: '清單與明細', ...props, 'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }) },
      slots: { start: '<p>list</p>', end: '<p>detail</p>' },
      attachTo: document.body,
    })
    wrapper = w
    return w
  }
  const sep = (w: ReturnType<typeof mount>) => w.find('[role="separator"]')

  it('WAI-ARIA window splitter：可聚焦、值、範圍、控制第一個面板', () => {
    const w = mountSplitter()
    const s = sep(w)
    expect(s.attributes()).toMatchObject({
      tabindex: '0',
      'aria-valuenow': '40',
      'aria-valuemin': '10',
      'aria-valuemax': '90',
      'aria-orientation': 'vertical',
      'aria-label': '清單與明細',
    })
    const pane = w.find(`#${s.attributes('aria-controls')}`)
    expect(pane.text()).toBe('list')
    expect((pane.element as HTMLElement).style.flexBasis).toBe('40%')
  })

  it('← → 調整（Shift 十倍）、Home / End、送出 resize-end', async () => {
    const w = mountSplitter()
    await sep(w).trigger('keydown', { key: 'ArrowRight' })
    expect(w.props('modelValue')).toBe(42)
    await sep(w).trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
    expect(w.props('modelValue')).toBe(22)
    await sep(w).trigger('keydown', { key: 'Home' })
    expect(w.props('modelValue')).toBe(10)
    await sep(w).trigger('keydown', { key: 'End' })
    expect(w.props('modelValue')).toBe(90)
    expect(w.emitted('resize-end')?.length).toBe(4)
  })

  it('上下排列時用 ↑ ↓', async () => {
    const w = mountSplitter({ direction: 'vertical' })
    expect(sep(w).attributes('aria-orientation')).toBe('horizontal')
    await sep(w).trigger('keydown', { key: 'ArrowDown' })
    expect(w.props('modelValue')).toBe(42)
    await sep(w).trigger('keydown', { key: 'ArrowRight' })
    expect(w.props('modelValue')).toBe(42)
  })

  it('Enter 收合到最小、再按還原', async () => {
    const w = mountSplitter({ modelValue: 55 })
    await sep(w).trigger('keydown', { key: 'Enter' })
    expect(w.props('modelValue')).toBe(10)
    await sep(w).trigger('keydown', { key: 'Enter' })
    expect(w.props('modelValue')).toBe(55)
  })

  it('拖曳依滑鼠位置換算百分比，夾在 min / max 內', async () => {
    const w = mountSplitter()
    ;(w.element as HTMLElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 400, right: 1000, bottom: 400, x: 0, y: 0, toJSON() {} }) as DOMRect
    // jsdom 的 PointerEvent 不完整：用同名的 MouseEvent（監聽的是事件名稱）
    sep(w).element.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 400, bubbles: true, cancelable: true }))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 700 }))
    await nextTick()
    expect(w.props('modelValue')).toBe(70)
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 990 }))
    await nextTick()
    expect(w.props('modelValue')).toBe(90)
    window.dispatchEvent(new MouseEvent('pointerup'))
    expect(w.emitted('resize-end')?.at(-1)).toEqual([90])
  })

  it('disabled：不可聚焦、不回應', async () => {
    const w = mountSplitter({ disabled: true })
    expect(sep(w).attributes('tabindex')).toBe('-1')
    await sep(w).trigger('keydown', { key: 'ArrowRight' })
    expect(w.props('modelValue')).toBe(40)
  })
})

// ---------------------------------------------------------------------------
// VirtualList
// ---------------------------------------------------------------------------

describe('ChptVirtualList', () => {
  const items = Array.from({ length: 10_000 }, (_, i) => ({ id: `SN-${i}`, name: `序號 ${i}` }))

  function mountList(props: Record<string, unknown> = {}) {
    const w = mount(ChptVirtualList, {
      props: { items, itemHeight: 30, keyField: 'id', ariaLabel: '序號', ...props },
      slots: { default: `<template #default="{ item }"><span class="row">{{ item.name }}</span></template>` },
      attachTo: document.body,
    })
    wrapper = w
    const el = w.element as HTMLElement
    Object.defineProperty(el, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(el, 'scrollHeight', { value: 300_000, configurable: true })
    return w
  }

  it('只畫看得到的列（加 overscan），但總高度是完整的', async () => {
    const w = mountList()
    w.element.dispatchEvent(new Event('scroll'))
    await nextTick()
    const rows = w.findAll('[role="listitem"]')
    expect(rows.length).toBeLessThan(30)
    expect(rows.length).toBeGreaterThan(5)
    expect((w.element.firstElementChild as HTMLElement).style.height).toBe('300000px')
  })

  it('每列帶 aria-setsize / aria-posinset（報讀「第 1,234 項，共 10,000 項」）', async () => {
    const w = mountList()
    const el = w.element as HTMLElement
    el.scrollTop = 30 * 1234
    el.dispatchEvent(new Event('scroll'))
    await nextTick()
    const first = w.find('[role="listitem"]')
    expect(first.attributes('aria-setsize')).toBe('10000')
    const posinsets = w.findAll('[role="listitem"]').map((r) => Number(r.attributes('aria-posinset')))
    expect(posinsets).toContain(1235)
    expect(w.findAll('.row').map((r) => r.text())).toContain('序號 1234')
  })

  it('捲到底部送出一次 reach-bottom；loading 中不送；新資料進來後可再觸發', async () => {
    const w = mountList()
    const el = w.element as HTMLElement
    el.scrollTop = 300_000 - 300
    el.dispatchEvent(new Event('scroll'))
    el.dispatchEvent(new Event('scroll'))
    expect(w.emitted('reach-bottom')).toHaveLength(1)
    await w.setProps({ loading: true })
    expect(w.find('[role="status"]').text()).toBe('載入中…')
    await w.setProps({ loading: false, items: [...items, { id: 'x', name: 'x' }] })
    el.dispatchEvent(new Event('scroll'))
    expect(w.emitted('reach-bottom')).toHaveLength(2)
  })

  it('scrollToIndex', async () => {
    const w = mountList()
    ;(w.vm as unknown as { scrollToIndex: (i: number) => void }).scrollToIndex(500)
    expect((w.element as HTMLElement).scrollTop).toBe(15_000)
  })

  it('空清單顯示 emptyText', () => {
    const w = mountList({ items: [] })
    expect(w.text()).toContain('沒有資料')
  })
})

// ---------------------------------------------------------------------------
// Affix
// ---------------------------------------------------------------------------

describe('ChptAffix', () => {
  let callback: IntersectionObserverCallback | null = null
  beforeEach(() => {
    callback = null
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb
        }
        observe() {}
        disconnect() {}
      }
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('position: sticky + offsetTop；哨兵捲出上緣時 affixed=true 並送出 change', async () => {
    const w = mount(ChptAffix, {
      props: { offsetTop: 64, affixedClass: 'shadow-md' },
      slots: { default: `<template #default="{ affixed }"><div class="bar">{{ affixed ? '貼住' : '一般' }}</div></template>` },
      attachTo: document.body,
    })
    wrapper = w
    const sticky = w.find('.chpt-affix')
    expect(sticky.classes()).toContain('sticky')
    expect((sticky.element as HTMLElement).style.top).toBe('64px')
    expect(w.find('.bar').text()).toBe('一般')

    callback!([{ isIntersecting: false, boundingClientRect: { top: 10 }, rootBounds: { top: 0 } } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)
    await nextTick()
    expect(w.find('.bar').text()).toBe('貼住')
    expect(sticky.classes()).toContain('shadow-md')
    expect(w.emitted('change')?.[0]).toEqual([true])

    callback!([{ isIntersecting: true, boundingClientRect: { top: 200 }, rootBounds: { top: 0 } } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)
    await nextTick()
    expect(w.find('.bar').text()).toBe('一般')
  })
})
