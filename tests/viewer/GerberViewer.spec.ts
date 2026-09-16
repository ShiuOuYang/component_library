import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import GerberViewer from '@/components/library/viewer/GerberViewer.vue'

/**
 * jsdom 的 getBoundingClientRect 永遠回 0，而元件會據此判定「容器尺寸為 0」
 * 並直接報錯，因此測試前要先給容器一個尺寸。
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

const GERBER = [
  '%FSLAX36Y36*%',
  '%MOMM*%',
  '%ADD10C,0.5*%',
  '%ADD11R,1.0X2.0*%',
  'G01*',
  'D10*',
  'X1000000Y1000000D03*',
  'X5000000Y1000000D03*',
  'D11*',
  'X3000000Y4000000D03*',
  'X1000000Y1000000D02*',
  'X5000000Y5000000D01*',
  'M02*',
].join('\n')

const DRILL = ['M48', 'METRIC', 'T01C0.8', '%', 'T01', 'X2.0Y2.0', 'X4.0Y2.0', 'M30'].join('\n')

type Wrapper = ReturnType<typeof mount>

/**
 * 等到載入流程結束。
 *
 * Gerber 走 tracespace 時會 await 兩個動態 import，那不只是 microtask，
 * 光靠 nextTick 等不到 —— 必須讓 event loop 真的轉幾圈，因此輪詢
 * 「還在載入中」的畫面是否消失。
 */
async function waitUntilLoaded(wrapper: Wrapper): Promise<void> {
  for (let i = 0; i < 100; i++) {
    await nextTick()
    // 看 spinner 而不是文字：錯誤訊息裡也有「載入」兩個字
    if (!wrapper.find('.animate-spin').exists()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`載入未在預期時間內完成，畫面停在：${wrapper.text().slice(0, 80)}`)
}

/** 掛載並等到載入流程跑完 */
async function mountViewer(props: Record<string, unknown> = {}) {
  const wrapper = mount(GerberViewer, {
    props: { autoResize: false, ...props },
    attachTo: document.body,
  })
  await waitUntilLoaded(wrapper)
  return wrapper
}

beforeEach(() => {
  stubContainerSize()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GerberViewer', () => {
  describe('載入與渲染', () => {
    it('用 gerberText 渲染出圖形，並發出 loaded', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER })

      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.find('.gerber-world').exists()).toBe(true)
      expect(wrapper.findAll('.gerber-world *').length).toBeGreaterThan(0)

      const loaded = wrapper.emitted('loaded')!
      expect(loaded).toBeTruthy()
      const payload = loaded[0][0] as { successCount: number; layerCount: number }
      expect(payload.successCount).toBe(1)
      expect(payload.layerCount).toBe(1)
      wrapper.unmount()
    })

    it('沒有任何來源時報錯並發出 error', async () => {
      const wrapper = await mountViewer()

      expect(wrapper.emitted('error')).toBeTruthy()
      expect(wrapper.text()).toContain('請提供 src、gerberText 或 layers 屬性')
      wrapper.unmount()
    })

    it('資訊面板顯示單位與圖形數', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER, showInfo: true })

      const info = wrapper.text()
      expect(info).toContain('公厘')
      expect(info).toContain('個圖形')
      wrapper.unmount()
    })

    it('showInfo=false 時不顯示資訊面板', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER, showInfo: false })
      expect(wrapper.text()).not.toContain('個圖形')
      wrapper.unmount()
    })

    it('showControls 決定是否顯示縮放按鈕', async () => {
      const on = await mountViewer({ gerberText: GERBER, showControls: true })
      expect(on.findAll('button').length).toBeGreaterThan(0)

      const off = await mountViewer({ gerberText: GERBER, showControls: false })
      expect(off.findAll('button')).toHaveLength(0)

      on.unmount()
      off.unmount()
    })

    it('backgroundColor 套用到 SVG', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER, backgroundColor: 'rgb(9, 9, 9)' })
      expect(wrapper.find('svg').attributes('style')).toContain('rgb(9, 9, 9)')
      wrapper.unmount()
    })
  })

  describe('Excellon 鑽孔檔', () => {
    it('鑽孔檔畫成圓形，數量等於孔數', async () => {
      const wrapper = await mountViewer({ gerberText: DRILL })

      expect(wrapper.findAll('.gerber-world circle')).toHaveLength(2)
      wrapper.unmount()
    })

    it('鑽孔半徑取自鑽頭直徑的一半', async () => {
      const wrapper = await mountViewer({ gerberText: DRILL })

      // T01C0.8 → 半徑 0.4
      expect(Number(wrapper.find('.gerber-world circle').attributes('r'))).toBeCloseTo(0.4)
      wrapper.unmount()
    })

    it('槽孔畫成圓角矩形', async () => {
      const slotFile = ['M48', 'METRIC', 'T01C1.0', '%', 'T01', 'X2.0Y2.0G85X6.0Y2.0', 'M30'].join('\n')
      const wrapper = await mountViewer({ gerberText: slotFile })

      const rect = wrapper.find('.gerber-world rect')
      expect(rect.exists()).toBe(true)
      // 寬 = 孔距 4 + 直徑 1
      expect(Number(rect.attributes('width'))).toBeCloseTo(5)
      expect(Number(rect.attributes('height'))).toBeCloseTo(1)
      wrapper.unmount()
    })
  })

  describe('多圖層', () => {
    it('每個圖層各自一個 <g>', async () => {
      const wrapper = await mountViewer({
        layers: [
          { gerberText: GERBER, name: '銅箔' },
          { gerberText: DRILL, name: '鑽孔' },
        ],
      })

      expect(wrapper.find('#gerber-layer-0').exists()).toBe(true)
      expect(wrapper.find('#gerber-layer-1').exists()).toBe(true)
      wrapper.unmount()
    })

    it('多圖層時顯示圖層面板，列出每個圖層名稱', async () => {
      const wrapper = await mountViewer({
        layers: [
          { gerberText: GERBER, name: '銅箔' },
          { gerberText: DRILL, name: '鑽孔' },
        ],
      })

      expect(wrapper.text()).toContain('銅箔')
      expect(wrapper.text()).toContain('鑽孔')
      expect(wrapper.text()).toContain('圖層 (2)')
      wrapper.unmount()
    })

    it('單一圖層時不顯示圖層面板', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER })
      expect(wrapper.text()).not.toContain('圖層 (1)')
      wrapper.unmount()
    })

    it('visible=false 的圖層渲染時就是隱藏的', async () => {
      const wrapper = await mountViewer({
        layers: [
          { gerberText: GERBER, name: 'A' },
          { gerberText: DRILL, name: 'B', visible: false },
        ],
      })

      expect(wrapper.find('#gerber-layer-1').attributes('display')).toBe('none')
      wrapper.unmount()
    })

    it('點擊圖層列切換顯示狀態', async () => {
      const wrapper = await mountViewer({
        layers: [
          { gerberText: GERBER, name: 'A' },
          { gerberText: DRILL, name: 'B' },
        ],
      })

      expect(wrapper.find('#gerber-layer-1').attributes('display')).toBeUndefined()

      // 圖層面板的第二列
      const rows = wrapper.findAll('[title="B"]')
      await rows[0].trigger('click')

      expect(wrapper.find('#gerber-layer-1').attributes('display')).toBe('none')
      wrapper.unmount()
    })

    it('沒給名稱時用序號當預設名稱', async () => {
      const wrapper = await mountViewer({
        layers: [{ gerberText: GERBER }, { gerberText: DRILL }],
      })

      expect(wrapper.text()).toContain('圖層 1')
      expect(wrapper.text()).toContain('圖層 2')
      wrapper.unmount()
    })

    it('部分圖層失敗時仍渲染成功的那些', async () => {
      const wrapper = await mountViewer({
        layers: [
          { gerberText: GERBER, name: 'ok' },
          { name: '沒有內容' }, // 既沒有 src 也沒有 gerberText
        ],
      })

      const payload = wrapper.emitted('loaded')![0][0] as { successCount: number }
      expect(payload.successCount).toBe(1)
      wrapper.unmount()
    })

    it('全部圖層失敗時報錯', async () => {
      const wrapper = await mountViewer({ layers: [{ name: 'a' }, { name: 'b' }] })

      expect(wrapper.emitted('error')).toBeTruthy()
      expect(wrapper.text()).toContain('所有圖層均載入失敗')
      wrapper.unmount()
    })
  })

  describe('D02 移動軌跡', () => {
    it('預設不畫移動軌跡', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER })

      const dashed = wrapper
        .findAll('.gerber-world line')
        .filter((l) => l.attributes('stroke-dasharray'))
      expect(dashed).toHaveLength(0)
      wrapper.unmount()
    })

    it('showMovePath=true 時畫出虛線軌跡', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER, showMovePath: true })

      const dashed = wrapper
        .findAll('.gerber-world line')
        .filter((l) => l.attributes('stroke-dasharray'))
      expect(dashed.length).toBeGreaterThan(0)
      wrapper.unmount()
    })

    it('按 D02 按鈕可即時切換，不需重新載入', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER })

      const d02Button = wrapper.findAll('button').find((b) => b.text() === 'D02')!
      expect(d02Button).toBeTruthy()

      await d02Button.trigger('click')
      await nextTick()

      const dashed = wrapper
        .findAll('.gerber-world line')
        .filter((l) => l.attributes('stroke-dasharray'))
      expect(dashed.length).toBeGreaterThan(0)
      // 沒有重新發出 loaded（代表沒有重跑載入流程）
      expect(wrapper.emitted('loaded')).toHaveLength(1)
      wrapper.unmount()
    })
  })

  describe('解析路徑', () => {
    it('有效的 Gerber 走 tracespace（不是回退的手動解析）', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER })

      // tracespace 的圖層不會有行為色階圖例（那是手動解析才有的）
      expect(wrapper.text()).not.toContain('Region (G36/G37)')
      // 但圖形照樣畫出來了
      expect(wrapper.findAll('.gerber-world *').length).toBeGreaterThan(0)
      wrapper.unmount()
    })

    it('沒自帶座標格式的檔案一律走手動解析，並顯示行為圖例', async () => {
      // 沒有 %FS 參數塊 —— 這種檔案交給 tracespace 會吃到前一次解析的殘留狀態
      const unplottable = ['D10*', 'X1000000Y1000000D03*', 'X3000000Y3000000D01*'].join('\n')
      const wrapper = await mountViewer({ gerberText: unplottable })

      // 行為色階圖例只有手動解析的圖層才有
      expect(wrapper.text()).toContain('Region (G36/G37)')
      expect(wrapper.findAll('.gerber-world line').length).toBeGreaterThan(0)
      wrapper.unmount()
    })

    it('D02 軌跡在 tracespace 路徑下也畫得出來', async () => {
      // tracespace 的 ImageTree 不含提筆移動，必須另外掃原始檔才有軌跡
      const wrapper = await mountViewer({ gerberText: GERBER, showMovePath: true })

      const dashed = wrapper
        .findAll('.gerber-world line')
        .filter((l) => l.attributes('stroke-dasharray'))
      expect(dashed.length).toBeGreaterThan(0)
      wrapper.unmount()
    })

    it('Excellon 圖層不提供 D02 切換（沒有提筆移動的概念）', async () => {
      const wrapper = await mountViewer({ gerberText: DRILL })

      expect(wrapper.findAll('button').find((b) => b.text() === 'D02')).toBeUndefined()
      wrapper.unmount()
    })
  })

  describe('對外方法', () => {
    it('defineExpose 提供縮放與重載方法', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER })
      const vm = wrapper.vm as unknown as Record<string, unknown>

      for (const method of ['zoomIn', 'zoomOut', 'resetView', 'reload', 'toggleLayer']) {
        expect(typeof vm[method]).toBe('function')
      }
      wrapper.unmount()
    })

    it('reload 會重新跑一次載入流程', async () => {
      const wrapper = await mountViewer({ gerberText: GERBER })
      expect(wrapper.emitted('loaded')).toHaveLength(1)

      ;(wrapper.vm as unknown as { reload: () => void }).reload()
      await waitUntilLoaded(wrapper)

      expect(wrapper.emitted('loaded')).toHaveLength(2)
      wrapper.unmount()
    })
  })

  describe('錯誤狀態', () => {
    it('錯誤時顯示重試按鈕，按下會重新載入', async () => {
      const wrapper = await mountViewer()
      expect(wrapper.text()).toContain('重試')

      const retry = wrapper.findAll('button').find((b) => b.text() === '重試')!
      await retry.trigger('click')
      await waitUntilLoaded(wrapper)

      // 仍然沒有來源，所以再錯一次
      expect(wrapper.emitted('error')).toHaveLength(2)
      wrapper.unmount()
    })
  })
})
