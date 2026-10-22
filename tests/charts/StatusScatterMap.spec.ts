import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import StatusScatterMap from '@/components/library/charts/StatusScatterMap.vue'

/**
 * 圖表 400×400、預設 margin（上 40、右 32、下 40、左 72），範圍 [0, 100] × [0, 100]：
 * 可用 296×320 → 等比例繪圖區 296×296，左 72、上 40（貼齊上方）。
 * 資料座標 (50, 50) → 繪圖區像素 (148, 148)。
 * jsdom 沒有排版：d3.pointer 退回 clientX − getBoundingClientRect().left（0），clientX 就是繪圖區座標。
 */
const PLOT = 296
const toPx = (v: number) => (v / 100) * PLOT
const toPy = (v: number) => PLOT - (v / 100) * PLOT

interface Pt extends Record<string, unknown> {
  id: string
  x: number
  y: number
  status: string
}

const POINTS: Pt[] = [
  { id: 'A', x: 50, y: 50, status: 'PASS' },
  { id: 'B', x: 50, y: 50, status: 'FAIL' }, // 與 A 重疊
  { id: 'C', x: 20, y: 80, status: 'PASS' },
  { id: 'D', x: 80, y: 20, status: 'NEARFAIL' },
]

/** 有真實像素緩衝區的假 2D context：可以檢查畫出來的顏色 */
let putCalls = 0
let lastImage: ImageData | null = null
function fakeContext() {
  return {
    setTransform: () => {},
    clearRect: () => {},
    beginPath: () => {},
    rect: vi.fn(),
    fill: () => {},
    globalAlpha: 1,
    fillStyle: '',
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }) as ImageData,
    putImageData: (img: ImageData) => {
      putCalls++
      lastImage = img
    },
  }
}

beforeEach(() => {
  putCalls = 0
  lastImage = null
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => fakeContext() as unknown as CanvasRenderingContext2D
  )
})

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

async function mountMap(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  wrapper = mount(StatusScatterMap, {
    props: { data: POINTS, width: 400, height: 400, xDomain: [0, 100], yDomain: [0, 100], ...props },
    slots,
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

/** 畫布上某資料座標的像素 RGBA */
function pixelAt(x: number, y: number): number[] {
  const img = lastImage!
  const o = (Math.round(toPy(y)) * img.width + Math.round(toPx(x))) * 4
  return Array.from(img.data.slice(o, o + 4))
}

function move(w: VueWrapper, x: number, y: number) {
  w.find('.ssm-surface').element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: toPx(x), clientY: toPy(y) }))
}

describe('StatusScatterMap', () => {
  describe('渲染', () => {
    it('圖例：每個狀態一顆按鈕（可用鍵盤切換）', async () => {
      const w = await mountMap()
      const buttons = w.findAll('button[aria-pressed]')
      expect(buttons.map((b) => b.text())).toEqual(['PASS', 'NEARFAIL', 'FAIL'])
      expect(buttons.every((b) => b.attributes('aria-pressed') === 'true')).toBe(true)
    })

    it('showCounts 顯示筆數；未知狀態另列「其他」', async () => {
      const w = await mountMap({ showCounts: true, data: [...POINTS, { id: 'E', x: 1, y: 1, status: 'SKIP' }] })
      expect(w.findAll('button[aria-pressed]').map((b) => b.text())).toEqual(['其他 (1)', 'PASS (2)', 'NEARFAIL (1)', 'FAIL (1)'])
    })

    it('軸的兩端標出範圍端點值（一位小數）', async () => {
      const w = await mountMap({ xDomain: [-15718.5, 15643], yDomain: [-15718.5, 15643] })
      const xs = w.findAll('.ssm-x-axis .tick text').map((t) => t.text())
      expect(xs[0]).toBe('−15,718.5')
      expect(xs.at(-1)).toBe('15,643.0')
      expect(xs).toContain('0')
    })

    it('點畫在 Canvas 上：重疊時後畫的狀態（FAIL）在上層', async () => {
      await mountMap()
      expect(putCalls).toBeGreaterThan(0)
      expect(pixelAt(50, 50)).toEqual([239, 69, 101, 255]) // #ef4565
      expect(pixelAt(20, 80)).toEqual([15, 157, 117, 255]) // #0f9d75
    })

    it('自訂 statuses 的顏色與繪製順序', async () => {
      await mountMap({
        statuses: [
          { value: 'FAIL', color: '#000000' },
          { value: 'PASS', color: '#ffffff' },
        ],
      })
      // PASS 在清單後面 → 畫在 FAIL 上面
      expect(pixelAt(50, 50)).toEqual([255, 255, 255, 255])
    })

    it('沒有指定範圍時依資料（含 padding）', async () => {
      const w = await mountMap({ xDomain: null, yDomain: null, domainPadding: 0 })
      const xs = w.findAll('.ssm-x-axis .tick text').map((t) => t.text())
      expect(xs[0]).toBe('20.0')
      expect(xs.at(-1)).toBe('80.0')
    })

    it('欄位映射：資料欄位名稱不同也能畫', async () => {
      const rows = [{ pin: 'P1', posX: 50, posY: 50, result: 'FAIL' }]
      const w = await mountMap({ data: rows, xField: 'posX', yField: 'posY', statusField: 'result', keyField: 'pin', showCounts: true })
      expect(w.findAll('button[aria-pressed]')[2].text()).toBe('FAIL (1)')
      expect(pixelAt(50, 50)).toEqual([239, 69, 101, 255])
    })

    it('座標缺值的資料不畫、也不會拋錯；空資料也一樣', async () => {
      const w = await mountMap({ data: [{ id: 'N', x: null, y: 10, status: 'PASS' }] })
      expect(w.find('svg').exists()).toBe(true)
      await w.setProps({ data: [] })
      expect(w.find('svg').exists()).toBe(true)
    })

    it('螢幕報讀摘要包含各狀態筆數', async () => {
      const w = await mountMap({ title: '探針點' })
      expect(w.find('svg[role="img"]').attributes('aria-label')).toBe('探針點：PASS 2 筆、NEARFAIL 1 筆、FAIL 1 筆')
    })

    it('customRenderers.point 改用呼叫端的畫法（不寫像素緩衝區）', async () => {
      const point = vi.fn()
      await mountMap({ customRenderers: { point } })
      expect(point).toHaveBeenCalledTimes(4)
      expect(putCalls).toBe(0)
    })
  })

  describe('圖例切換', () => {
    it('點圖例隱藏該狀態：送出事件、不再畫、也不能 hover', async () => {
      const w = await mountMap()
      await w.findAll('button[aria-pressed]')[2].trigger('click') // FAIL
      expect(w.emitted('legend-toggle')![0]).toEqual([{ status: 'FAIL', hidden: true }])
      expect(w.emitted('update:hiddenStatuses')![0]).toEqual([['FAIL']])
      expect(w.findAll('button[aria-pressed]')[2].attributes('aria-pressed')).toBe('false')
      expect(pixelAt(50, 50)).toEqual([15, 157, 117, 255]) // 只剩底下的 PASS

      move(w, 50, 50)
      expect((w.emitted('point-hover')![0][0] as { key: string }).key).toBe('A')
    })

    it('受控的 hiddenStatuses', async () => {
      const w = await mountMap({ hiddenStatuses: ['PASS'] })
      expect(pixelAt(20, 80)).toEqual([0, 0, 0, 0])
      await w.setProps({ hiddenStatuses: [] })
      expect(pixelAt(20, 80)).toEqual([15, 157, 117, 255])
    })
  })

  describe('滑鼠提示與點擊', () => {
    it('指到點時顯示提示（狀態、鍵、座標），重疊時取上層的 FAIL', async () => {
      const w = await mountMap()
      move(w, 50, 50)
      await nextTick()
      const tip = w.find('[role="tooltip"]')
      expect(tip.text()).toContain('FAIL')
      expect(tip.text()).toContain('B')
      expect(tip.text()).toContain('X：50')
      expect(w.emitted('point-hover')![0][0]).toMatchObject({ key: 'B', status: 'FAIL', x: 50, y: 50 })
      expect(w.emitted('tooltip-show')).toHaveLength(1)
      expect(w.findAll('.ssm-hover circle')).toHaveLength(1)
    })

    it('移開或離開時隱藏', async () => {
      const w = await mountMap()
      move(w, 50, 50)
      move(w, 5, 5)
      await nextTick()
      expect(w.find('[role="tooltip"]').exists()).toBe(false)
      expect(w.emitted('tooltip-hide')).toHaveLength(1)
      move(w, 50, 50)
      w.find('.ssm-surface').element.dispatchEvent(new MouseEvent('mouseleave'))
      expect(w.emitted('tooltip-hide')).toHaveLength(2)
    })

    it('點擊送出 point-click', async () => {
      const w = await mountMap()
      w.find('.ssm-surface').element.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: toPx(80), clientY: toPy(20) }))
      expect(w.emitted('point-click')![0][0]).toMatchObject({ key: 'D', status: 'NEARFAIL' })
    })

    it('customRenderers.tooltip 自訂內容；keyFn 自訂資料鍵', async () => {
      const w = await mountMap({
        keyFn: (d: Pt) => `pin-${d.id}`,
        customRenderers: { tooltip: (d: Pt, info: { key: string }) => [`點號 ${info.key}`, `批號 ${d.id}`] },
      })
      move(w, 20, 80)
      await nextTick()
      expect(w.find('[role="tooltip"]').text()).toContain('點號 pin-C')
      expect(w.find('[role="tooltip"]').text()).toContain('批號 C')
    })

    it('tooltip 插槽可完全取代預設樣式', async () => {
      const w = await mountMap({}, {
        tooltip: '<template #tooltip="{ tooltipData, tooltipVisible }"><b v-if="tooltipVisible" class="mine">{{ tooltipData.key }}</b></template>',
      })
      move(w, 20, 80)
      await nextTick()
      expect(w.find('.mine').text()).toBe('C')
      expect(w.find('[role="tooltip"]').exists()).toBe(false)
    })
  })

  describe('連動高亮', () => {
    it('highlightKey 對到的點畫上光圈', async () => {
      const w = await mountMap({ highlightKey: 'D' })
      const ring = w.find('.ssm-highlight-ring')
      expect(Number(ring.attributes('cx'))).toBeCloseTo(toPx(80))
      expect(Number(ring.attributes('cy'))).toBeCloseTo(toPy(20))
      await w.setProps({ highlightKey: null })
      expect(w.findAll('.ssm-highlight-ring')).toHaveLength(0)
    })

    /**
     * 回歸：呼叫端常把 point-hover 的 key 回填成 highlightKey。
     * 若換高亮會整張重繪，重繪又清掉 hover，提示框就會一直閃。
     */
    it('換 highlightKey 不重繪資料點、不清掉目前的提示', async () => {
      const w = await mountMap()
      move(w, 20, 80)
      const before = putCalls
      await w.setProps({ highlightKey: 'C' })
      expect(putCalls).toBe(before)
      expect(w.emitted('tooltip-hide')).toBeUndefined()
      expect(w.findAll('.ssm-highlight-ring')).toHaveLength(1)
    })
  })

  describe('縮放', () => {
    function wheel(w: VueWrapper, init: WheelEventInit) {
      const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 148, clientY: 148, ...init })
      w.find('.ssm-surface').element.dispatchEvent(event)
      return event
    }

    it('滾輪放大：送出 zoom-change、出現重設按鈕；雙擊回到全覽', async () => {
      const w = await mountMap()
      const event = wheel(w, { deltaY: -200 })
      await nextTick()
      expect(event.defaultPrevented).toBe(true)
      const zoom = w.emitted('zoom-change')!.at(-1)![0] as { scale: number; xDomain: [number, number] }
      expect(zoom.scale).toBeGreaterThan(1)
      expect(zoom.xDomain[1] - zoom.xDomain[0]).toBeLessThan(100)
      expect(w.find('button:not([aria-pressed])').text()).toBe('重設縮放')

      w.find('.ssm-surface').element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      await nextTick()
      expect(w.emitted('zoom-reset')).toHaveLength(1)
      expect(w.find('button:not([aria-pressed])').exists()).toBe(false)
    })

    it('全覽時往外滾不攔截（交還給頁面捲動）', async () => {
      const w = await mountMap()
      expect(wheel(w, { deltaY: 200 }).defaultPrevented).toBe(false)
    })

    it("wheelZoomModifier='ctrl'：沒按 Ctrl 不縮放", async () => {
      const w = await mountMap({ wheelZoomModifier: 'ctrl' })
      expect(wheel(w, { deltaY: -200 }).defaultPrevented).toBe(false)
      expect(wheel(w, { deltaY: -200, ctrlKey: true }).defaultPrevented).toBe(true)
    })

    it('enableZoom=false 時完全不處理滾輪', async () => {
      const w = await mountMap({ enableZoom: false })
      expect(wheel(w, { deltaY: -200 }).defaultPrevented).toBe(false)
      expect(w.emitted('zoom-change')).toBeUndefined()
    })

    it('重設按鈕回到全覽', async () => {
      const w = await mountMap()
      wheel(w, { deltaY: -200 })
      await nextTick()
      await w.find('button:not([aria-pressed])').trigger('click')
      expect(w.emitted('zoom-reset')).toHaveLength(1)
    })
  })

  describe('生命週期', () => {
    it('卸載時移除滑鼠監聽（卸載時 template ref 已是 null，要從記下的元素移除）', async () => {
      const w = await mountMap()
      const surface = w.find('.ssm-surface').element
      const remove = vi.spyOn(surface, 'removeEventListener')
      w.unmount()
      wrapper = null
      expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(remove).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('autoResize：建立並在卸載時斷開 ResizeObserver', async () => {
      const disconnect = vi.fn()
      const observe = vi.fn()
      vi.stubGlobal('ResizeObserver', vi.fn(() => ({ observe, disconnect })))
      const w = await mountMap({ autoResize: true })
      expect(observe).toHaveBeenCalled()
      w.unmount()
      wrapper = null
      expect(disconnect).toHaveBeenCalled()
      vi.unstubAllGlobals()
    })
  })
})

/**
 * 回歸：設定了 Y（或 X）軸範圍後，滾輪縮放被限縮在那個範圍裡 ——
 * 資料超出範圍時往外縮看不到超出的部分。範圍是預設視窗，不是資料的邊界。
 */
describe('StatusScatterMap：設定範圍後仍能縮放到範圍外的資料', () => {
  // 資料 y 從 0 到 100；範圍設 [40, 60]
  const SPREAD: Pt[] = Array.from({ length: 11 }, (_, i) => ({ id: `S${i}`, x: 50, y: i * 10, status: 'PASS' }))

  function wheelAt(w: VueWrapper, deltaY: number) {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 148, clientY: 148, deltaY })
    w.find('.ssm-surface').element.dispatchEvent(event)
    return event
  }

  it('在設定範圍上往外滾會縮小，看得到範圍外的點', async () => {
    const w = await mountMap({ data: SPREAD, xDomain: [40, 60], yDomain: [40, 60] })
    const event = wheelAt(w, 300)
    await nextTick()
    expect(event.defaultPrevented).toBe(true)
    const { yDomain, scale } = w.emitted('zoom-change')!.at(-1)![0] as { yDomain: [number, number]; scale: number }
    expect(scale).toBeLessThan(1)
    expect(yDomain[0]).toBeLessThan(40)
    expect(yDomain[1]).toBeGreaterThan(60)
    // 縮小後也顯示「重設縮放」
    expect(w.find('button:not([aria-pressed])').text()).toBe('重設縮放')
  })

  it('一直往外縮：停在涵蓋全部資料的範圍，之後的滾動交還給頁面', async () => {
    const w = await mountMap({ data: SPREAD, xDomain: [40, 60], yDomain: [40, 60] })
    for (let i = 0; i < 10; i++) wheelAt(w, 600)
    await nextTick()
    const { yDomain } = w.emitted('zoom-change')!.at(-1)![0] as { yDomain: [number, number] }
    expect(yDomain[0]).toBeLessThanOrEqual(0)
    expect(yDomain[1]).toBeGreaterThanOrEqual(100)
    // d3.zoom 把 150ms 內連續的滾輪視為同一個手勢（手勢中持續攔截）；下一次滾動才交還頁面
    await new Promise((r) => setTimeout(r, 200))
    expect(wheelAt(w, 300).defaultPrevented).toBe(false)
  })

  it('重設回到設定的範圍', async () => {
    const w = await mountMap({ data: SPREAD, xDomain: [40, 60], yDomain: [40, 60] })
    wheelAt(w, 300)
    await nextTick()
    await w.find('button:not([aria-pressed])').trigger('click')
    const ys = w.findAll('.ssm-y-axis .tick text').map((t) => t.text())
    expect(ys[0]).toBe('40.0')
    expect(ys.at(-1)).toBe('60.0')
  })
})
