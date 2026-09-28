import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptImage from '@/components/library/ui/ChptImage.vue'
import ChptImageViewer from '@/components/library/ui/ChptImageViewer.vue'

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.style.overflow = ''
})

const viewer = () => document.body.querySelector<HTMLElement>('[role="dialog"]')
const btn = (label: string) => document.body.querySelector<HTMLButtonElement>(`[role="dialog"] button[aria-label="${label}"]`)!
const imgTransform = () => document.body.querySelector<HTMLImageElement>('[role="dialog"] img')!.style.transform
const key = async (k: string) => {
  viewer()!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
  await nextTick()
}

describe('ChptImage', () => {
  it('載入中骨架 → 載入完成；外框大小固定', async () => {
    const w = mount(ChptImage, { props: { src: 'a.png', alt: '焊點橋接', width: 120, height: '80px' } })
    wrapper = w
    expect(w.find('.animate-pulse').exists()).toBe(true)
    expect(w.attributes('style')).toContain('width: 120px')
    expect(w.attributes('style')).toContain('height: 80px')
    await w.find('img').trigger('load')
    expect(w.find('.animate-pulse').exists()).toBe(false)
    expect(w.emitted('load')).toHaveLength(1)
  })

  it('載入失敗：顯示圖示與替代文字（role=img）', async () => {
    const w = mount(ChptImage, { props: { src: 'bad.png', alt: '焊點橋接' } })
    wrapper = w
    await w.find('img').trigger('error')
    const fallback = w.find('[role="img"]')
    expect(fallback.attributes('aria-label')).toBe('焊點橋接（圖片無法載入）')
    expect(w.find('img').exists()).toBe(false)
    expect(w.emitted('error')).toHaveLength(1)
  })

  it('fit 與 lazy', () => {
    const w = mount(ChptImage, { props: { src: 'a.png', alt: '', fit: 'contain' } })
    wrapper = w
    expect(w.find('img').classes()).toContain('object-contain')
    expect(w.find('img').attributes('loading')).toBe('lazy')
  })

  it('preview：圖片包在有名稱的按鈕裡，點了開啟全螢幕檢視', async () => {
    const w = mount(ChptImage, { props: { src: 'a.png', alt: '焊點橋接', preview: true }, attachTo: document.body })
    wrapper = w
    const button = w.find('button')
    expect(button.attributes('aria-label')).toBe('放大檢視：焊點橋接')
    await button.trigger('click')
    await nextTick()
    expect(viewer()!.getAttribute('aria-modal')).toBe('true')
    expect(viewer()!.getAttribute('aria-label')).toBe('圖片檢視：焊點橋接')
    expect(w.emitted('preview')?.[0]).toEqual([0])
  })

  it('previewSrcList：從自己的位置開始', async () => {
    const w = mount(ChptImage, {
      props: { src: 'b.png', alt: 'B', preview: true, previewSrcList: ['a.png', 'b.png', 'c.png'] },
      attachTo: document.body,
    })
    wrapper = w
    await w.find('button').trigger('click')
    await nextTick()
    expect(viewer()!.textContent).toContain('2 / 3')
  })
})

describe('ChptImageViewer', () => {
  function mountViewer(props: Record<string, unknown> = {}) {
    const w = mount(ChptImageViewer, {
      props: {
        open: true,
        images: [{ src: '1.png', alt: '第一張' }, { src: '2.png', alt: '第二張' }, '3.png'],
        ...props,
        'onUpdate:open': (v: unknown) => w.setProps({ open: v }),
        'onUpdate:index': (v: unknown) => w.setProps({ index: v }),
      },
      attachTo: document.body,
    })
    wrapper = w
    return w
  }

  it('開啟時焦點在關閉鈕、背景不捲動；Escape 關閉', async () => {
    const w = mountViewer()
    await nextTick()
    await nextTick()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('關閉')
    expect(document.body.style.overflow).toBe('hidden')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(w.props('open')).toBe(false)
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('← → 切換（循環）並報讀第幾張', async () => {
    const w = mountViewer()
    await nextTick()
    expect(viewer()!.querySelector('[aria-live]')!.textContent).toContain('1 / 3')
    await key('ArrowLeft')
    expect(w.props('index')).toBe(2)
    await key('ArrowRight')
    expect(w.props('index')).toBe(0)
    btn('下一張').click()
    await nextTick()
    expect(w.props('index')).toBe(1)
    expect(viewer()!.querySelector('[aria-live]')!.textContent).toContain('第二張')
  })

  it('loop=false 時停在頭尾', async () => {
    const w = mountViewer({ loop: false })
    await nextTick()
    await key('ArrowLeft')
    expect(w.emitted('update:index')).toBeUndefined()
  })

  it('+ / − / 0 / R：縮放、重設、旋轉；切換時重設', async () => {
    mountViewer()
    await nextTick()
    await key('+')
    expect(imgTransform()).toContain('scale(1.25)')
    await key('-')
    await key('-')
    expect(imgTransform()).toContain('scale(0.8)')
    await key('0')
    expect(imgTransform()).toContain('scale(1)')
    await key('r')
    expect(imgTransform()).toContain('rotate(90deg)')
    await key('ArrowRight')
    expect(imgTransform()).toContain('rotate(0deg)')
  })

  it('縮放有上下限，到頂時按鈕停用', async () => {
    mountViewer({ maxScale: 1.5 })
    await nextTick()
    await key('+')
    await key('+')
    expect(imgTransform()).toContain('scale(1.5)')
    expect(btn('放大').disabled).toBe(true)
  })

  it('縮圖列：目前那張 aria-current，點了切換', async () => {
    const w = mountViewer()
    await nextTick()
    const thumbs = Array.from(viewer()!.querySelectorAll<HTMLButtonElement>('[aria-label="縮圖"] button'))
    expect(thumbs).toHaveLength(3)
    expect(thumbs[0].getAttribute('aria-current')).toBe('true')
    expect(thumbs[1].getAttribute('aria-label')).toBe('第 2 張：第二張')
    thumbs[2].click()
    await nextTick()
    expect(w.props('index')).toBe(2)
  })
})
