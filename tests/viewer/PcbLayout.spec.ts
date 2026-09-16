import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import PcbLayout from '@/components/library/viewer/PcbLayout.vue'
import type { PcbData } from '@/components/library/viewer/pcb/pcb.types'

/**
 * jsdom 的 getBoundingClientRect 永遠回 0，而元件會據此放棄渲染，
 * 因此測試前要先給容器一個尺寸。
 */
const VIEWPORT = { width: 800, height: 600 }

function stubContainerSize(): void {
  Element.prototype.getBoundingClientRect = function (): DOMRect {
    return {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      top: 0,
      left: 0,
      right: VIEWPORT.width,
      bottom: VIEWPORT.height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect
  }
}

const BOARD: PcbData = {
  board: { width: 20, height: 10, units: 'mm' },
  elements: [
    { type: 'outline', path: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 10 }] },
    { type: 'trace', x1: 2, y1: 2, x2: 8, y2: 2, width: 0.3 },
    { type: 'trace', x1: 8, y1: 2, x2: 8, y2: 6 },
    { type: 'pad', x: 2, y: 2, shape: 'circle', width: 1, drill: 0.5 },
    { type: 'pad', x: 12, y: 4, shape: 'rect', width: 2, height: 1 },
    { type: 'pad', x: 15, y: 4, shape: 'oblong', width: 2, height: 1 },
    { type: 'via', x: 8, y: 6, outerDia: 0.8, innerDia: 0.4 },
    { type: 'region', path: [{ x: 14, y: 7 }, { x: 18, y: 7 }, { x: 18, y: 9 }] },
    { type: 'component', x: 5, y: 7, width: 3, height: 2, refDes: 'U1', rotation: 90 },
    { type: 'silk', path: [{ x: 1, y: 9 }, { x: 4, y: 9 }] },
    { type: 'silk', text: 'REV-A', x: 18, y: 1, fontSize: 0.5 },
  ],
}

async function mountPcb(props: Record<string, unknown> = {}) {
  const wrapper = mount(PcbLayout, {
    props: { data: BOARD, autoResize: false, ...props },
    attachTo: document.body,
  })
  for (let i = 0; i < 4; i++) await nextTick()
  return wrapper
}

beforeEach(() => {
  stubContainerSize()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('PcbLayout', () => {
  describe('渲染', () => {
    it('建立世界群組並發出 loaded', async () => {
      const wrapper = await mountPcb()

      expect(wrapper.find('.pcb-world').exists()).toBe(true)
      const payload = wrapper.emitted('loaded')![0][0] as {
        info: { elementCount: number; units: string; sizeText: string }
      }
      expect(payload.info.elementCount).toBe(BOARD.elements!.length)
      expect(payload.info.units).toBe('mm')
      expect(payload.info.sizeText).toBe('20.00 × 10.00 mm')
      wrapper.unmount()
    })

    it('世界群組帶著 Y 軸翻轉的 transform', async () => {
      const wrapper = await mountPcb({ padding: 20 })

      // 板子 20×10，畫布 800×600 扣掉邊距 → 寬向 38、高向 56，取 38
      const transform = wrapper.find('.pcb-world').attributes('transform')!
      expect(transform).toContain('scale(38,-38)')
      wrapper.unmount()
    })

    it('走線畫成 line，線寬取自資料或預設值', async () => {
      const wrapper = await mountPcb({ defaultTraceWidth: 0.25 })

      const lines = wrapper.findAll('.pcb-world line')
      const widths = lines.map((l) => l.attributes('stroke-width'))
      expect(widths).toContain('0.3') // 資料給的
      expect(widths).toContain('0.25') // 沒給，用預設
      wrapper.unmount()
    })

    it('圓形焊盤畫成 circle，半徑為寬的一半', async () => {
      const wrapper = await mountPcb()

      const circles = wrapper.findAll('.pcb-world circle')
      const radii = circles.map((c) => Number(c.attributes('r')))
      expect(radii).toContain(0.5) // 焊盤 width 1
      wrapper.unmount()
    })

    it('矩形焊盤沒有圓角，長圓形焊盤有', async () => {
      const wrapper = await mountPcb()

      const rects = wrapper.findAll('.pcb-world rect')
      const radii = rects.map((r) => r.attributes('rx'))
      expect(radii).toContain('0') // rect
      expect(radii).toContain('0.5') // oblong：短邊 1 的一半
      wrapper.unmount()
    })

    it('鑽孔用背景色蓋出孔洞', async () => {
      const wrapper = await mountPcb({ backgroundColor: 'rgb(9, 9, 9)' })

      const holes = wrapper
        .findAll('.pcb-world circle')
        .filter((c) => c.attributes('fill') === 'rgb(9, 9, 9)')
      // 焊盤鑽孔 1 個 + 過孔內孔 1 個
      expect(holes).toHaveLength(2)
      wrapper.unmount()
    })

    it('板框與銅箔區域畫成 path，並封閉成 Z', async () => {
      const wrapper = await mountPcb()

      const paths = wrapper.findAll('.pcb-world path').map((p) => p.attributes('d'))
      expect(paths.some((d) => d?.startsWith('M0,0L20,0') && d?.endsWith('Z'))).toBe(true)
      expect(paths.some((d) => d?.startsWith('M14,7'))).toBe(true)
      wrapper.unmount()
    })

    it('絲印線條不封閉（不補 Z）', async () => {
      const wrapper = await mountPcb()

      const paths = wrapper.findAll('.pcb-world path').map((p) => p.attributes('d'))
      expect(paths).toContain('M1,9L4,9')
      wrapper.unmount()
    })

    it('元件外框帶著旋轉，並標上 refDes', async () => {
      const wrapper = await mountPcb({ showRefDes: true })

      const texts = wrapper.findAll('.pcb-world text').map((t) => t.text())
      expect(texts).toContain('U1')
      expect(texts).toContain('REV-A')
      // rotation 90 套用在元件群組上
      const transforms = wrapper.findAll('.pcb-world g').map((g) => g.attributes('transform'))
      expect(transforms).toContain('translate(5,7) rotate(90)')
      wrapper.unmount()
    })

    it('showRefDes=false 時不標元件編號（絲印文字仍在）', async () => {
      const wrapper = await mountPcb({ showRefDes: false })

      const texts = wrapper.findAll('.pcb-world text').map((t) => t.text())
      expect(texts).not.toContain('U1')
      expect(texts).toContain('REV-A')
      wrapper.unmount()
    })

    it('同一圖層內依 RENDER_ORDER 繪製：先鋪底、再疊細節', async () => {
      // 一個圖層裡混放多種類型，資料順序刻意與 RENDER_ORDER 相反
      const wrapper = await mountPcb({
        data: {
          board: { width: 10, height: 10 },
          layers: [
            {
              name: 'mixed',
              elements: [
                { type: 'silk', text: 'X', x: 5, y: 5 },
                { type: 'trace', x1: 0, y1: 0, x2: 5, y2: 0 },
                { type: 'outline', path: [{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 9 }] },
              ],
            },
          ],
        },
      })

      const tags = Array.from(
        wrapper.find('#pcb-layer-0').element.querySelectorAll('path, line, text')
      ).map((el) => el.tagName)
      // 板框（path）在走線（line）之前，文字（text）最後
      expect(tags).toEqual(['path', 'line', 'text'])
      wrapper.unmount()
    })
  })

  describe('顏色', () => {
    it('各類型有自己的預設顏色', async () => {
      const wrapper = await mountPcb()

      // 走線的預設色
      expect(wrapper.find('.pcb-world line').attributes('stroke')).toBe('#4ecdc4')
      wrapper.unmount()
    })

    it('colorMap 可覆寫單一類型的顏色', async () => {
      const wrapper = await mountPcb({ colorMap: { trace: '#123456' } })

      expect(wrapper.find('.pcb-world line').attributes('stroke')).toBe('#123456')
      wrapper.unmount()
    })

    it('backgroundColor 套用到 SVG', async () => {
      const wrapper = await mountPcb({ backgroundColor: 'rgb(1, 2, 3)' })
      expect(wrapper.find('svg').attributes('style')).toContain('rgb(1, 2, 3)')
      wrapper.unmount()
    })
  })

  describe('圖層', () => {
    it('沒有 layers 時依 type 自動分層', async () => {
      const wrapper = await mountPcb()

      // 資料含 outline / trace / pad / via / region / component / silk 七種
      expect(wrapper.find('#pcb-layer-trace').exists()).toBe(true)
      expect(wrapper.find('#pcb-layer-via').exists()).toBe(true)
      expect(wrapper.text()).toContain('圖層 (7)')
      wrapper.unmount()
    })

    it('有 layers 時依圖層分組並用圖層名稱', async () => {
      const wrapper = await mountPcb({
        data: {
          board: { width: 10, height: 10 },
          layers: [
            { name: '頂層', elements: [{ type: 'trace', x1: 0, y1: 0, x2: 5, y2: 0 }] },
            { name: '底層', elements: [{ type: 'via', x: 3, y: 3 }] },
          ],
        },
      })

      expect(wrapper.find('#pcb-layer-0').exists()).toBe(true)
      expect(wrapper.find('#pcb-layer-1').exists()).toBe(true)
      expect(wrapper.text()).toContain('頂層')
      expect(wrapper.text()).toContain('底層')
      wrapper.unmount()
    })

    it('visible=false 的圖層渲染時就是隱藏的', async () => {
      const wrapper = await mountPcb({
        data: {
          board: { width: 10, height: 10 },
          layers: [
            { name: 'a', elements: [{ type: 'via', x: 1, y: 1 }] },
            { name: 'b', visible: false, elements: [{ type: 'via', x: 2, y: 2 }] },
          ],
        },
      })

      expect(wrapper.find('#pcb-layer-1').attributes('display')).toBe('none')
      wrapper.unmount()
    })

    it('點擊圖層列切換顯示狀態', async () => {
      const wrapper = await mountPcb({
        data: {
          board: { width: 10, height: 10 },
          layers: [
            { name: 'a', elements: [{ type: 'via', x: 1, y: 1 }] },
            { name: 'b', elements: [{ type: 'via', x: 2, y: 2 }] },
          ],
        },
      })

      expect(wrapper.find('#pcb-layer-1').attributes('display')).toBeUndefined()
      await wrapper.findAll('[title="b"]')[0].trigger('click')
      expect(wrapper.find('#pcb-layer-1').attributes('display')).toBe('none')
      wrapper.unmount()
    })

    it('單一圖層時不顯示圖層面板', async () => {
      const wrapper = await mountPcb({
        data: {
          board: { width: 10, height: 10 },
          elements: [{ type: 'via', x: 1, y: 1 }],
        },
      })

      expect(wrapper.text()).not.toContain('圖層 (1)')
      wrapper.unmount()
    })
  })

  describe('資訊面板與圖例', () => {
    it('showInfo 決定是否顯示資訊面板', async () => {
      const on = await mountPcb({ showInfo: true })
      expect(on.text()).toContain('個圖形')

      const off = await mountPcb({ showInfo: false })
      expect(off.text()).not.toContain('個圖形')

      on.unmount()
      off.unmount()
    })

    it('圖例只列出資料裡實際出現的類型', async () => {
      const wrapper = await mountPcb({
        data: {
          board: { width: 10, height: 10 },
          elements: [{ type: 'trace', x1: 0, y1: 0, x2: 1, y2: 1 }],
        },
      })

      expect(wrapper.text()).toContain('走線 (Trace)')
      expect(wrapper.text()).not.toContain('過孔 (Via)')
      wrapper.unmount()
    })

    it('showControls 決定是否顯示縮放按鈕', async () => {
      const on = await mountPcb({ showControls: true })
      expect(on.findAll('button').length).toBe(3)

      const off = await mountPcb({ showControls: false })
      expect(off.findAll('button')).toHaveLength(0)

      on.unmount()
      off.unmount()
    })
  })

  describe('互動事件', () => {
    it('點擊元素發出 element-click 並帶上原始資料', async () => {
      const wrapper = await mountPcb()
      await wrapper.find('.pcb-world line').trigger('click')

      const payload = wrapper.emitted('element-click')![0][0] as {
        data: { type: string }
      }
      expect(payload.data.type).toBe('trace')
      wrapper.unmount()
    })

    it('hover 元素發出 element-hover，離開時發出 null', async () => {
      const wrapper = await mountPcb()
      const line = wrapper.find('.pcb-world line')

      await line.trigger('mouseenter')
      expect(wrapper.emitted('element-hover')![0][0]).toMatchObject({
        data: { type: 'trace' },
      })

      await line.trigger('mouseleave')
      expect(wrapper.emitted('element-hover')![1][0]).toBeNull()
      wrapper.unmount()
    })

    it('hover 會改變元素的不透明度', async () => {
      const wrapper = await mountPcb()
      const line = wrapper.find('.pcb-world line')

      await line.trigger('mouseenter')
      expect(line.element.style.opacity).toBe('0.7')
      await line.trigger('mouseleave')
      expect(line.element.style.opacity).toBe('')
      wrapper.unmount()
    })
  })

  describe('防禦', () => {
    it('沒有元素也沒有 board 時不拋錯，只是畫不出東西', async () => {
      const wrapper = await mountPcb({ data: {} })

      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('.pcb-world').exists()).toBe(false)
      wrapper.unmount()
    })

    it('元素缺少尺寸時用預設值，不會變成 NaN', async () => {
      const wrapper = await mountPcb({
        data: {
          elements: [
            { type: 'pad', x: 5, y: 5 },
            { type: 'via', x: 6, y: 6 },
            { type: 'component', x: 7, y: 7 },
          ],
        },
      })

      const radii = wrapper.findAll('.pcb-world circle').map((c) => c.attributes('r'))
      expect(radii.every((r) => r && !Number.isNaN(Number(r)))).toBe(true)
      wrapper.unmount()
    })

    it('渲染中途出錯會發出 error，而不是讓例外逸出', async () => {
      // path 不是陣列 → pathToD 內部取 points[0].x 會拋錯
      const wrapper = await mountPcb({
        data: {
          board: { width: 10, height: 10 },
          elements: [{ type: 'outline', path: { length: 1 } }],
        } as unknown as PcbData,
      })

      expect(wrapper.emitted('error')).toBeTruthy()
      const payload = wrapper.emitted('error')![0][0] as { message: string }
      expect(typeof payload.message).toBe('string')
      wrapper.unmount()
    })
  })

  describe('對外方法', () => {
    it('defineExpose 提供縮放與重繪方法', async () => {
      const wrapper = await mountPcb()
      const vm = wrapper.vm as unknown as Record<string, unknown>

      for (const method of ['zoomIn', 'zoomOut', 'resetView', 'toggleLayer', 'forceRender']) {
        expect(typeof vm[method]).toBe('function')
      }
      wrapper.unmount()
    })

    it('forceRender 會重跑一次渲染', async () => {
      const wrapper = await mountPcb()
      expect(wrapper.emitted('loaded')).toHaveLength(1)

      await (wrapper.vm as unknown as { forceRender: () => Promise<void> }).forceRender()
      await nextTick()

      expect(wrapper.emitted('loaded')).toHaveLength(2)
      wrapper.unmount()
    })
  })
})
