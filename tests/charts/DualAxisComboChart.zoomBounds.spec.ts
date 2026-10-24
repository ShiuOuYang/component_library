import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue'

/**
 * 回歸：設定了 Y（或 X）軸範圍後，滾輪縮放被限縮在那個範圍裡。
 *
 * 範圍是「預設要看的視窗」，不是資料的邊界 —— 資料超出範圍時，往外縮要能看到超出的部分；
 * 縮到底也不能跳回比較窄的設定範圍。
 *
 * 圖表 600×400、預設 margin → 繪圖區 440×280；jsdom 裡 clientX / clientY 就是繪圖區座標。
 *
 * 這組測的是 limitZoomToData（縮小與平移限制在資料範圍內）時的邊界；預設不設限，見 largeData 的測試。
 */

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

// x 0..99；y 在 0..100 之間起伏，最高 100
const rows = Array.from({ length: 100 }, (_, i) => ({ x: i, y: 50 + 50 * Math.sin(i / 5) }))
const layers = [{ type: 'line', data: rows, xValue: (d: { x: number }) => d.x, yValue: (d: { y: number }) => d.y }]

async function mountChart(props: Record<string, unknown>) {
  wrapper = mount(DualAxisComboChart, {
    props: { width: 600, height: 400, animationDuration: 0, layers, xScaleType: 'linear', limitZoomToData: true, ...props },
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

async function wheel(w: VueWrapper, init: WheelEventInit) {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
  w.find('svg').element.dispatchEvent(event)
  await new Promise((r) => setTimeout(r, 40))
  await nextTick()
  return event
}

const lastDomain = (w: VueWrapper) => (w.emitted('wheel-zoom')!.at(-1)![0] as { domain: [number, number] | null }).domain

describe('DualAxisComboChart：設定範圍後滾輪縮放仍能看到範圍外的資料', () => {
  it('Y 軸設 [40, 60]，資料到 0~100：在 Y 軸上往外縮可以超出設定範圍', async () => {
    const w = await mountChart({ yLeftDomain: [40, 60] })
    const event = await wheel(w, { deltaY: 300, clientX: -30, clientY: 140 })
    expect(event.defaultPrevented).toBe(true)
    const [lo, hi] = lastDomain(w)!
    expect(hi - lo).toBeGreaterThan(20)
    expect(lo).toBeLessThan(40)
    expect(hi).toBeGreaterThan(60)
  })

  it('Y 軸一直往外縮：停在涵蓋全部資料的範圍，不會跳回設定的 [40, 60]', async () => {
    const w = await mountChart({ yLeftDomain: [40, 60] })
    for (let i = 0; i < 6; i++) await wheel(w, { deltaY: 600, clientX: -30, clientY: 140 })
    const [lo, hi] = lastDomain(w)!
    expect(lo).toBeLessThanOrEqual(0)
    expect(hi).toBeGreaterThanOrEqual(100)
    // 已在全覽：再往外滾交還給頁面
    const again = await wheel(w, { deltaY: 300, clientX: -30, clientY: 140 })
    expect(again.defaultPrevented).toBe(false)
  })

  it('重設按鈕回到設定的範圍', async () => {
    const w = await mountChart({ yLeftDomain: [40, 60] })
    await wheel(w, { deltaY: 300, clientX: -30, clientY: 140 })
    await w.find('button').trigger('click')
    // 刻度由 D3 transition 套用（走 timer）
    await new Promise((r) => setTimeout(r, 40))
    const ticks = w.findAll('.y-axis-left .tick text').map((t) => Number(t.text()))
    expect(Math.min(...ticks)).toBeGreaterThanOrEqual(40)
    expect(Math.max(...ticks)).toBeLessThanOrEqual(60)
  })

  it('資料都在設定範圍內時，往外縮到設定範圍就是全覽（不攔截頁面捲動）', async () => {
    const w = await mountChart({ yLeftDomain: [-50, 150] })
    const event = await wheel(w, { deltaY: 300, clientX: -30, clientY: 140 })
    expect(event.defaultPrevented).toBe(false)
  })

  it('沒有設定範圍時行為不變：往外縮到全覽就清掉縮放', async () => {
    const w = await mountChart({})
    await wheel(w, { deltaY: -300, clientX: -30, clientY: 140 })
    await wheel(w, { deltaY: 2000, clientX: -30, clientY: 140 })
    expect(lastDomain(w)).toBeNull()
  })

  it('X 軸設 [40, 60]（資料 0~99）：一直往外縮停在資料全覽，不會跳回 [40, 60]', async () => {
    const w = await mountChart({ xDomain: [40, 60] })
    for (let i = 0; i < 6; i++) await wheel(w, { deltaY: 600, clientX: 220, clientY: 140 })
    const [lo, hi] = lastDomain(w)!
    expect(lo).toBeLessThanOrEqual(0)
    expect(hi).toBeGreaterThanOrEqual(99)
  })
})
