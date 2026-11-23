import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptImageCompare from '@/components/library/ui/ChptImageCompare.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { CompareMode } from '@/components/library/shared/imageCompare'

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

/** jsdom 沒有版面：框寬 800、每一格的位置從 (0, 0) 開始 */
function layout(width = 800) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: width, bottom: 400, width, height: 400, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
}

function pointer(el: Element, type: string, init: { x: number; y?: number; id?: number; button?: number; pointerType?: string }) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    clientX: { value: init.x },
    clientY: { value: init.y ?? 100 },
    pointerId: { value: init.id ?? 1 },
    button: { value: init.button ?? 0 },
    pointerType: { value: init.pointerType ?? 'mouse' },
  })
  el.dispatchEvent(e)
}

async function loadImages(w: VueWrapper, size = { w: 1600, h: 800 }) {
  for (const img of w.findAll('img')) {
    Object.defineProperty(img.element, 'naturalWidth', { value: size.w, configurable: true })
    Object.defineProperty(img.element, 'naturalHeight', { value: size.h, configurable: true })
    await img.trigger('load')
  }
  await nextTick()
}

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  layout()
  const mode = ref<CompareMode>((props.mode as CompareMode) ?? 'slider')
  const events: Record<string, unknown[]> = {}
  const node = () =>
    h(ChptImageCompare, {
      before: 'a.png',
      after: 'b.png',
      ...props,
      mode: mode.value,
      'onUpdate:mode': (v: CompareMode) => ((mode.value = v), (events.mode ??= []).push(v)),
      'onUpdate:position': (v: number) => (events.position ??= []).push(v),
      'onUpdate:opacity': (v: number) => (events.opacity ??= []).push(v),
      'onUpdate:difference': (v: boolean) => (events.difference ??= []).push(v),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const panes = () => w.findAll('[role="group"][aria-describedby]')
  const zoomText = () => w.find('[aria-live="polite"]').text()
  const imgTransform = () => (w.find('img').element as HTMLElement).style.transform
  const button = (label: string) => w.findAll('button').find((b) => b.attributes('aria-label') === label || b.text() === label)!
  return { w, mode, events, panes, zoomText, imgTransform, button }
}

describe('ChptImageCompare', () => {
  it('滑桿：兩層影像，上層依分隔線裁切；標籤與替代文字', async () => {
    const { w, panes } = mountIt({ beforeLabel: '標準', afterLabel: '待測' })
    await loadImages(w)
    expect(panes()).toHaveLength(1)
    const imgs = w.findAll('img')
    expect(imgs.map((i) => i.attributes('alt'))).toEqual(['標準', '待測'])
    expect((imgs[1].element.parentElement as HTMLElement).style.clipPath).toBe('inset(0 0 0 50%)')
    expect(w.text()).toContain('標準')
    expect(w.text()).toContain('待測')
    // 影像 2:1、框寬 800 → 高 400；整張放進畫面 k = 0.5
    expect((w.find('[style*="height"]').element as HTMLElement).style.height).toBe('400px')
    expect((imgs[0].element as HTMLElement).style.transform).toBe('translate(0px, 0px) scale(0.5)')
  })

  it('預設標籤用語系', () => {
    const { w } = mountIt()
    expect(w.findAll('img').map((i) => i.attributes('alt'))).toEqual(['基準', '比對'])
  })

  it('分隔線：拖曳把手、鍵盤（方向鍵、Shift、Page、Home / End）', async () => {
    const { w, events } = mountIt()
    const slider = w.find('[role="slider"]')
    expect(slider.attributes('aria-valuenow')).toBe('50')
    const handle = slider.element.parentElement!
    pointer(handle, 'pointerdown', { x: 400 })
    pointer(handle, 'pointermove', { x: 600 })
    pointer(handle, 'pointerup', { x: 600 })
    pointer(handle, 'pointermove', { x: 100 }) // 放開後不再移動
    await nextTick()
    expect(events.position).toEqual([75])
    expect(slider.attributes('aria-valuenow')).toBe('75')
    await slider.trigger('keydown', { key: 'ArrowLeft' })
    await slider.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    await slider.trigger('keydown', { key: 'PageDown' })
    await slider.trigger('keydown', { key: 'End' })
    await slider.trigger('keydown', { key: 'ArrowUp' })
    await slider.trigger('keydown', { key: 'Home' })
    await slider.trigger('keydown', { key: 'ArrowDown' })
    await slider.trigger('keydown', { key: 'x' })
    expect(events.position).toEqual([75, 74, 84, 74, 100, 100, 0, 0])
    // 右鍵不拖
    pointer(handle, 'pointerdown', { x: 400, button: 2 })
    pointer(handle, 'pointermove', { x: 600, button: 2 })
    expect(events.position).toHaveLength(8)
  })

  it('沒放大時在滑桿模式拖曳任何地方移動分隔線', async () => {
    const { panes, events } = mountIt()
    pointer(panes()[0].element, 'pointerdown', { x: 100 })
    pointer(panes()[0].element, 'pointermove', { x: 200 })
    pointer(panes()[0].element, 'pointerup', { x: 200 })
    expect(events.position).toEqual([25])
  })

  it('外部 position / mode / opacity / difference 改變時同步', async () => {
    const p = ref<Record<string, unknown>>({ position: 30, mode: 'slider', opacity: 40, difference: false })
    layout()
    const w = mount({ render: () => h(ChptImageCompare, { before: 'a', after: 'b', ...p.value }) })
    mounted.push(w)
    expect(w.find('[role="slider"]').attributes('aria-valuenow')).toBe('30')
    p.value = { ...p.value, position: 140 }
    await nextTick()
    expect(w.find('[role="slider"]').attributes('aria-valuenow')).toBe('100')
    p.value = { ...p.value, mode: 'overlay', opacity: 120 }
    await nextTick()
    expect(w.find('[role="slider"]').exists()).toBe(false)
    expect((w.findAll('img')[1].element.parentElement as HTMLElement).style.opacity).toBe('1')
    p.value = { ...p.value, difference: true }
    await nextTick()
    expect((w.findAll('img')[1].element.parentElement as HTMLElement).style.mixBlendMode).toBe('difference')
  })

  it('縮放：按鈕、百分比、上下限；雙擊放大 / 還原', async () => {
    const { w, panes, zoomText, imgTransform, button } = mountIt({ maxZoom: 3 })
    await loadImages(w)
    expect(zoomText()).toBe('100%')
    expect(button('縮小').attributes('disabled')).toBeDefined()
    expect(button('顯示整張').attributes('disabled')).toBeDefined()
    await button('放大').trigger('click')
    expect(zoomText()).toBe('150%')
    expect(imgTransform()).toContain('scale(0.75)')
    await button('放大').trigger('click')
    await button('放大').trigger('click')
    expect(zoomText()).toBe('300%')
    expect(button('放大').attributes('disabled')).toBeDefined()
    await button('縮小').trigger('click')
    expect(zoomText()).toBe('200%')
    await button('顯示整張').trigger('click')
    expect(zoomText()).toBe('100%')
    // 雙擊 (200, 100)：以該點放大 2 倍
    await panes()[0].trigger('dblclick', { clientX: 200, clientY: 100 })
    expect(zoomText()).toBe('200%')
    expect(imgTransform()).toBe('translate(-200px, -100px) scale(1)')
    await panes()[0].trigger('dblclick', { clientX: 200, clientY: 100 })
    expect(zoomText()).toBe('100%')
  })

  it('放大後拖曳平移（不能拖出空白）；Ctrl + 滾輪縮放、一般滾輪不攔截', async () => {
    const { w, panes, imgTransform, zoomText, events } = mountIt()
    await loadImages(w)
    const pane = panes()[0]
    await pane.trigger('dblclick', { clientX: 400, clientY: 200 })
    expect(imgTransform()).toBe('translate(-400px, -200px) scale(1)')
    pointer(pane.element, 'pointerdown', { x: 300, y: 200 })
    pointer(pane.element, 'pointermove', { x: 350, y: 220 })
    await nextTick()
    expect(imgTransform()).toBe('translate(-350px, -180px) scale(1)')
    pointer(pane.element, 'pointermove', { x: 2000, y: 2000 })
    pointer(pane.element, 'pointerup', { x: 2000, y: 2000 })
    await nextTick()
    expect(imgTransform()).toBe('translate(0px, 0px) scale(1)')
    expect(events.position).toBeUndefined()
    // 一般滾輪：不攔截
    const plain = new WheelEvent('wheel', { deltaY: -100, cancelable: true })
    pane.element.dispatchEvent(plain)
    expect(plain.defaultPrevented).toBe(false)
    const ctrl = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, cancelable: true, clientX: 400, clientY: 200 })
    pane.element.dispatchEvent(ctrl)
    await nextTick()
    expect(ctrl.defaultPrevented).toBe(true)
    expect(zoomText()).toBe('167%')
    pane.element.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, metaKey: true, cancelable: true }))
    await nextTick()
    expect(zoomText()).toBe('200%')
  })

  it('兩指縮放', async () => {
    const { w, panes, zoomText } = mountIt()
    await loadImages(w)
    const el = panes()[0].element
    pointer(el, 'pointerdown', { x: 300, y: 200, id: 1, pointerType: 'touch' })
    pointer(el, 'pointerdown', { x: 500, y: 200, id: 2, pointerType: 'touch' })
    pointer(el, 'pointermove', { x: 600, y: 200, id: 2, pointerType: 'touch' })
    await nextTick()
    expect(zoomText()).toBe('150%')
    pointer(el, 'pointerup', { x: 600, y: 200, id: 2, pointerType: 'touch' })
    pointer(el, 'pointercancel', { x: 300, y: 200, id: 1, pointerType: 'touch' })
    pointer(el, 'pointermove', { x: 0, y: 0, id: 1 })
    await nextTick()
    expect(zoomText()).toBe('150%')
  })

  it('鍵盤：+ / − / 0 縮放、放大後方向鍵平移；子元素上的按鍵不處理', async () => {
    const { w, panes, zoomText, imgTransform } = mountIt()
    await loadImages(w)
    const pane = panes()[0]
    await pane.trigger('keydown', { key: 'ArrowLeft' }) // 沒放大：不處理
    await pane.trigger('keydown', { key: '+' })
    await pane.trigger('keydown', { key: '=' })
    expect(zoomText()).toBe('225%')
    await pane.trigger('keydown', { key: '-' })
    expect(zoomText()).toBe('150%')
    const before = imgTransform()
    await pane.trigger('keydown', { key: 'ArrowRight' })
    await pane.trigger('keydown', { key: 'ArrowDown' })
    expect(imgTransform()).not.toBe(before)
    await pane.trigger('keydown', { key: 'ArrowLeft' })
    await pane.trigger('keydown', { key: 'ArrowUp' })
    expect(imgTransform()).toBe(before)
    await w.find('[role="slider"]').trigger('keydown', { key: '0' })
    expect(zoomText()).toBe('150%')
    await pane.trigger('keydown', { key: '_' })
    await pane.trigger('keydown', { key: 'q' })
    expect(zoomText()).toBe('100%')
    await pane.trigger('keydown', { key: '+' })
    await pane.trigger('keydown', { key: '0' })
    expect(zoomText()).toBe('100%')
  })

  it('並排：兩格、各一張；共用縮放，切換方式時相對倍數不變', async () => {
    const { w, panes, zoomText, events, button } = mountIt()
    await loadImages(w)
    await button('放大').trigger('click')
    await w.findAll('[role="radio"]')[1].trigger('click')
    await nextTick()
    expect(events.mode).toEqual(['side'])
    expect(panes()).toHaveLength(2)
    expect(panes().map((p) => p.attributes('aria-label'))).toEqual(['影像比對: 基準', '影像比對: 比對'])
    expect(w.find('[role="slider"]').exists()).toBe(false)
    expect(zoomText()).toBe('150%')
    await loadImages(w)
    // 每格寬 (800 − 4) / 2 = 398，高度跟著變矮
    const imgs = w.findAll('img')
    expect(imgs).toHaveLength(2)
    expect((imgs[0].element as HTMLElement).style.transform).toBe((imgs[1].element as HTMLElement).style.transform)
    expect((w.find('[style*="height"]').element as HTMLElement).style.height).toBe('199px')
  })

  it('疊圖：透明度、差異混合', async () => {
    const { w, events, button } = mountIt({ mode: 'overlay', opacity: 30 })
    const top = () => w.findAll('img')[1].element.parentElement as HTMLElement
    expect(top().style.opacity).toBe('0.3')
    expect(w.text()).toContain('基準 + 比對 30%')
    const range = w.find('input[type="range"]')
    await range.setValue('70')
    expect(events.opacity).toEqual([70])
    expect(top().style.opacity).toBe('0.7')
    const diff = button('difference差異')
    expect(diff.attributes('aria-pressed')).toBe('false')
    await diff.trigger('click')
    expect(events.difference).toEqual([true])
    expect(top().style.mixBlendMode).toBe('difference')
    expect(range.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('基準與比對的差異')
  })

  it('載入失敗時顯示訊息；換圖後清除', async () => {
    const { w } = mountIt()
    await w.findAll('img')[1].trigger('error')
    expect(w.find('[role="alert"]').text()).toBe('比對影像載入失敗')
    // 重新載入成功時清除
    await loadImages(w)
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it('換圖：清除失敗狀態', async () => {
    const src = ref('b.png')
    layout()
    const w = mount({ render: () => h(ChptImageCompare, { before: 'a.png', after: src.value }) })
    mounted.push(w)
    await w.findAll('img')[1].trigger('error')
    expect(w.find('[role="alert"]').exists()).toBe(true)
    src.value = 'c.png'
    await nextTick()
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it('showToolbar=false；方法 fit / zoomTo', async () => {
    const { w, imgTransform } = mountIt({ showToolbar: false })
    await loadImages(w)
    expect(w.find('[role="radiogroup"]').exists()).toBe(false)
    const vm = w.findComponent(ChptImageCompare).vm as unknown as { fit: () => void; zoomTo: (r: number) => void }
    vm.zoomTo(2)
    await nextTick()
    expect(imgTransform()).toContain('scale(1)')
    vm.zoomTo(100)
    await nextTick()
    expect(imgTransform()).toContain('scale(4)')
    vm.fit()
    await nextTick()
    expect(imgTransform()).toContain('scale(0.5)')
  })

  it('英文語系', () => {
    const { w } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.findAll('[role="radio"]').map((r) => r.text())).toEqual(['Slider', 'Side by side', 'Overlay'])
    expect(w.findAll('img').map((i) => i.attributes('alt'))).toEqual(['Reference', 'Sample'])
  })
})
