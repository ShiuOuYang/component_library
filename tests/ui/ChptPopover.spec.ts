import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptPopover from '@/components/library/ui/ChptPopover.vue'

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
})

function mountPopover(props: Record<string, unknown> = {}, content = '<button type="button" class="inner">動作</button>') {
  const w = mount(ChptPopover, {
    props: { title: '說明', ...props },
    slots: {
      default: '<button type="button" class="trigger">開啟</button>',
      content: `<template #content="{ close }">${content}<button type="button" class="close" @click="close">關閉</button></template>`,
    },
    attachTo: document.body,
  })
  wrapper = w
  return w
}

const panel = (w: ReturnType<typeof mount>) => w.find('[role="dialog"]')

describe('ChptPopover：click', () => {
  it('點觸發鈕開關；觸發鈕自動帶 aria-haspopup / expanded / controls', async () => {
    const w = mountPopover()
    const trigger = w.find('.trigger')
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')
    await nextTick()
    expect(panel(w).exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(trigger.attributes('aria-controls')).toBe(panel(w).attributes('id'))
    await trigger.trigger('click')
    expect(panel(w).exists()).toBe(false)
  })

  it('卡片以標題命名；沒有標題時用 ariaLabel', async () => {
    const w = mountPopover()
    await w.find('.trigger').trigger('click')
    const titleId = panel(w).attributes('aria-labelledby')!
    expect(w.find(`#${titleId}`).text()).toBe('說明')

    const w2 = mount(ChptPopover, { props: { ariaLabel: '使用者資訊', open: true }, slots: { default: '<button type="button">x</button>' } })
    expect(w2.find('[role="dialog"]').attributes('aria-label')).toBe('使用者資訊')
    w2.unmount()
  })

  it('Escape 關閉並把焦點還給觸發鈕', async () => {
    const w = mountPopover()
    await w.find('.trigger').trigger('click')
    ;(w.find('.inner').element as HTMLElement).focus()
    await w.find('.inner').trigger('keydown', { key: 'Escape' })
    expect(panel(w).exists()).toBe(false)
    expect(document.activeElement).toBe(w.find('.trigger').element)
  })

  it('內容插槽的 close() 會關閉並歸還焦點', async () => {
    const w = mountPopover()
    await w.find('.trigger').trigger('click')
    await w.find('.close').trigger('click')
    expect(panel(w).exists()).toBe(false)
    expect(document.activeElement).toBe(w.find('.trigger').element)
  })

  it('焦點移出整個元件時關閉', async () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    const w = mountPopover()
    await w.find('.trigger').trigger('click')
    await w.find('.inner').trigger('focusout', { relatedTarget: outside })
    expect(panel(w).exists()).toBe(false)
    outside.remove()
  })

  it('焦點在元件內移動（觸發鈕 → 卡片）不關閉', async () => {
    const w = mountPopover()
    await w.find('.trigger').trigger('click')
    await w.find('.trigger').trigger('focusout', { relatedTarget: w.find('.inner').element })
    expect(panel(w).exists()).toBe(true)
  })

  it('點外面關閉', async () => {
    const w = mountPopover()
    await w.find('.trigger').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(panel(w).exists()).toBe(false)
  })

  it('disabled 時不開啟', async () => {
    const w = mountPopover({ disabled: true })
    await w.find('.trigger').trigger('click')
    expect(panel(w).exists()).toBe(false)
  })
})

describe('ChptPopover：v-model:open 與其他觸發方式', () => {
  it('受控：open prop 決定顯示，操作時送出 update:open', async () => {
    const w = mountPopover({ open: false })
    await w.find('.trigger').trigger('click')
    expect(w.emitted('update:open')?.[0]).toEqual([true])
    expect(panel(w).exists()).toBe(false) // 父層沒接回來就不變
    await w.setProps({ open: true })
    expect(panel(w).exists()).toBe(true)
  })

  it('hover：延遲開啟、離開後延遲關閉', async () => {
    vi.useFakeTimers()
    const w = mountPopover({ trigger: 'hover' })
    await w.trigger('mouseenter')
    expect(panel(w).exists()).toBe(false)
    vi.advanceTimersByTime(120)
    await nextTick()
    expect(panel(w).exists()).toBe(true)
    await w.trigger('mouseleave')
    vi.advanceTimersByTime(100)
    await w.trigger('mouseenter') // 移到卡片上：取消關閉
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(panel(w).exists()).toBe(true)
    await w.trigger('mouseleave')
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(panel(w).exists()).toBe(false)
  })

  it('hover 觸發也能用鍵盤聚焦打開（不然鍵盤使用者看不到）', async () => {
    const w = mountPopover({ trigger: 'hover' })
    await w.find('.trigger').trigger('focusin')
    expect(panel(w).exists()).toBe(true)
  })

  it('hover 觸發時點擊不會切換', async () => {
    const w = mountPopover({ trigger: 'hover' })
    await w.find('.trigger').trigger('click')
    expect(panel(w).exists()).toBe(false)
  })

  it('manual：只由 v-model 控制', async () => {
    const w = mountPopover({ trigger: 'manual', open: true })
    await w.find('.trigger').trigger('click')
    expect(w.emitted('update:open')).toBeUndefined()
    expect(panel(w).exists()).toBe(true)
  })

  it('插槽拿得到 attrs 可自行綁定', () => {
    const w = mount(ChptPopover, {
      slots: { default: `<template #default="{ attrs, open }"><a href="#" v-bind="attrs" class="link">{{ open ? '收' : '開' }}</a></template>` },
    })
    expect(w.find('.link').attributes('aria-haspopup')).toBe('dialog')
    expect(w.find('.link').text()).toBe('開')
    w.unmount()
  })

  it('placement 與 width', async () => {
    const w = mountPopover({ placement: 'right', width: '20rem', open: true })
    expect(panel(w).classes()).toContain('left-full')
    expect((panel(w).element as HTMLElement).style.width).toBe('20rem')
  })
})

describe('ChptPopover：碰撞處理', () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }) as DOMRect

  function stubRects(panelRect: DOMRect, anchorRect: DOMRect) {
    return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('role') === 'dialog') return panelRect
      return anchorRect
    })
  }

  it('卡片超出左緣時往右推', async () => {
    const spy = stubRects(rect(-100, 50, 300, 100), rect(20, 10, 80, 32))
    const w = mountPopover()
    await w.find('.trigger').trigger('click')
    await nextTick()
    await nextTick()
    expect((panel(w).element as HTMLElement).style.marginLeft).toBe('108px')
    spy.mockRestore()
  })

  it('卡片超出右緣時往左推', async () => {
    const spy = stubRects(rect(900, 50, 300, 100), rect(950, 10, 80, 32))
    const w = mountPopover()
    await w.find('.trigger').trigger('click')
    await nextTick()
    await nextTick()
    expect((panel(w).element as HTMLElement).style.marginLeft).toBe(`${window.innerWidth - 8 - 1200}px`)
    spy.mockRestore()
  })

  it('下方放不下、上方放得下時翻到上面', async () => {
    const h = window.innerHeight
    const spy = stubRects(rect(100, h - 50, 200, 150), rect(100, h - 100, 80, 32))
    const w = mountPopover()
    await w.find('.trigger').trigger('click')
    await nextTick()
    await nextTick()
    expect(panel(w).classes()).toContain('bottom-full')
    spy.mockRestore()
  })
})

