import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptFloorPlan from '@/components/library/ui/ChptFloorPlan.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { FloorPlanItem } from '@/components/library/shared/floorPlan'

const NOW = Date.UTC(2026, 10, 21, 8, 0)
const items = (): FloorPlanItem[] => [
  { id: 'a', name: 'SMT-01 印刷機', status: 'run', x: 2, y: 2, w: 5, h: 3, since: NOW - 30 * 60_000 },
  { id: 'b', name: 'SMT-02 貼片機', status: 'down', x: 10, y: 2, alarm: '吸嘴異常', workOrder: 'WO-1', product: 'PCB-A', utilization: 71 },
  { id: 'c', name: 'AOI-01', status: 'idle', x: 2, y: 10 },
  { id: 'd', name: 'AOI-02', status: 'offline', x: 40, y: 10 },
]

/** jsdom 沒有版面：框固定 400 × 300、左上角在 (0, 0) */
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) })
})
const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

async function fire(el: Element, type: string, init: Record<string, unknown>) {
  const ev = new Event(type, { bubbles: true, cancelable: true })
  for (const [k, v] of Object.entries({ pointerId: 1, pointerType: 'mouse', button: 0, ...init })) Object.defineProperty(ev, k, { value: v })
  el.dispatchEvent(ev)
  await nextTick()
  return ev
}

function mountIt(props: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  const list = ref(items())
  const w = mount(
    { render: () => h(ChptFloorPlan, { planWidth: 50, planHeight: 20, now: NOW, height: 420, ...props, items: list.value }, extra) },
    { attachTo: document.body }
  )
  mounted.push(w)
  const comp = () => w.findComponent(ChptFloorPlan)
  const item = (name: string) => w.findAll('g[role="button"]').find((g) => g.attributes('aria-label')!.startsWith(name))!
  const tf = () => w.find('svg > g').attributes('transform')!
  return { w, list, comp, item, tf }
}

describe('ChptFloorPlan', () => {
  it('畫出機台與狀態；aria-label；停機有外圈；名稱放不下時縮短；圖例數量', async () => {
    const { w, item } = mountIt({ zones: [{ id: 'z', label: 'SMT 一線', x: 1, y: 1, w: 30, h: 8 }] })
    await nextTick()
    expect(w.findAll('g[role="button"]')).toHaveLength(4)
    expect(item('SMT-01').attributes('aria-label')).toBe('SMT-01 印刷機, 運轉, 已運轉 30 分')
    expect(item('SMT-02').attributes('aria-label')).toBe('SMT-02 貼片機, 停機, 吸嘴異常')
    expect(item('SMT-02').find('rect.motion-safe\\:animate-pulse').exists()).toBe(true)
    // 400 寬、50 單位 → k ≈ 7.36；5 單位寬 ≈ 37px：全名放不下，第一段也放不下 → 截斷
    expect(item('SMT-01').find('text').text()).toMatch(/…$|^$/)
    expect(w.text()).toContain('SMT 一線')
    expect(w.find('[role="group"][aria-label="依狀態篩選"]').text().replace(/\s+/g, ' ')).toContain('停機 1')
  })

  it('框的高度不超過平面圖照寬度縮放後的高度', async () => {
    const { w } = mountIt()
    await nextTick()
    // 400 × 20 / 50 + 32 = 192
    expect(w.find('div.relative').attributes('style')).toContain('height: 192px')
  })

  it('點機台：明細卡（狀態、警報、工單、稼動率）與 item-click；關閉後焦點回到機台', async () => {
    const clicks: string[] = []
    const { w, item } = mountIt({}, {})
    const r2 = mount({ render: () => h(ChptFloorPlan, { planWidth: 50, planHeight: 20, now: NOW, items: items(), onItemClick: (i: FloorPlanItem) => clicks.push(i.id) }) }, { attachTo: document.body })
    mounted.push(r2)
    await r2.findAll('g[role="button"]')[1].trigger('click')
    expect(clicks).toEqual(['b'])
    await item('SMT-02').trigger('click')
    const card = w.find('[role="dialog"]')
    expect(card.attributes('aria-label')).toBe('SMT-02 貼片機')
    expect(card.text()).toContain('吸嘴異常')
    expect(card.text()).toContain('WO-1 · PCB-A')
    expect(card.text()).toContain('稼動率 71%')
    expect(item('SMT-02').attributes('aria-pressed')).toBe('true')
    await card.find('button').trigger('click')
    await nextTick()
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(item('SMT-02').element)
  })

  it('detail 插槽；被選的機台消失時關閉', async () => {
    const { w, list, item } = mountIt({}, { detail: ({ item }: { item: FloorPlanItem }) => h('em', item.id) })
    await item('AOI-01').trigger('click')
    expect(w.find('[role="dialog"] em').text()).toBe('c')
    list.value = list.value.filter((i) => i.id !== 'c')
    await nextTick()
    await nextTick()
    expect(w.find('[role="dialog"]').exists()).toBe(false)
  })

  it('縮放按鈕、重設；Ctrl + 滾輪縮放、一般滾輪不攔截', async () => {
    const { w, tf } = mountIt()
    await nextTick()
    const fitTf = tf()
    const btn = (label: string) => w.find(`button[aria-label="${label}"]`)
    await btn('放大').trigger('click')
    expect(tf()).not.toBe(fitTf)
    await btn('縮小').trigger('click')
    await btn('顯示整張').trigger('click')
    expect(tf()).toBe(fitTf)
    const plain = await fire(w.find('svg').element, 'wheel', { deltaY: -100, clientX: 200, clientY: 100 })
    expect(plain.defaultPrevented).toBe(false)
    expect(tf()).toBe(fitTf)
    const ctrl = await fire(w.find('svg').element, 'wheel', { deltaY: -100, ctrlKey: true, clientX: 200, clientY: 100 })
    expect(ctrl.defaultPrevented).toBe(true)
    expect(tf()).not.toBe(fitTf)
    await fire(w.find('svg').element, 'wheel', { deltaY: 100, metaKey: true, clientX: 200, clientY: 100 })
  })

  it('拖曳平移；兩指縮放；右鍵不拖；點機台不會開始拖曳', async () => {
    const { w, tf, item } = mountIt()
    await nextTick()
    const svg = w.find('svg').element
    const start = tf()
    await fire(svg, 'pointerdown', { button: 2, clientX: 100, clientY: 100 })
    await fire(svg, 'pointermove', { clientX: 150, clientY: 100 })
    expect(tf()).toBe(start)
    await fire(svg, 'pointerdown', { clientX: 100, clientY: 100 })
    expect(w.find('svg').classes()).toContain('cursor-grabbing')
    await fire(svg, 'pointermove', { clientX: 130, clientY: 110 })
    expect(tf()).not.toBe(start)
    await fire(svg, 'pointerup', {})
    expect(w.find('svg').classes()).toContain('cursor-grab')
    const panned = tf()
    // 兩指
    await fire(svg, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 })
    await fire(svg, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 100 })
    await fire(svg, 'pointermove', { pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 100 })
    expect(Number(tf().match(/scale\(([\d.]+)\)/)![1])).toBeGreaterThan(Number(panned.match(/scale\(([\d.]+)\)/)![1]))
    await fire(svg, 'pointerup', { pointerId: 2 })
    await fire(svg, 'pointerup', { pointerId: 1 })
    await fire(svg, 'pointermove', { pointerId: 1, clientX: 0, clientY: 0 }) // 放開後不動
    await fire(item('AOI-01').element, 'pointerdown', { clientX: 10, clientY: 10 })
    expect(w.find('svg').classes()).toContain('cursor-grab')
  })

  it('圖例：只突顯某個狀態，其他變淡；再點取消', async () => {
    const { w, item } = mountIt()
    const legend = (label: string) => w.find('[role="group"][aria-label="依狀態篩選"]').findAll('button').find((b) => b.text().includes(label))!
    await legend('停機').trigger('click')
    expect(legend('停機').attributes('aria-pressed')).toBe('true')
    expect(item('SMT-01').attributes('style')).toContain('opacity: 0.25')
    expect(item('SMT-02').attributes('style')).toContain('opacity: 1')
    await legend('停機').trigger('click')
    expect(item('SMT-01').attributes('style')).toContain('opacity: 1')
  })

  it('鍵盤：一個 Tab 停駐點；左右同一列、上下依位置；移到畫面外時平移；Enter / Esc；+ − 0 縮放', async () => {
    const { w, item, tf } = mountIt()
    await nextTick()
    const tabbable = () => w.findAll('g[role="button"]').filter((g) => g.attributes('tabindex') === '0')
    expect(tabbable()).toHaveLength(1)
    const focused = () => document.activeElement?.getAttribute('aria-label')?.split(',')[0]
    ;(item('SMT-01').element as unknown as HTMLElement).focus()
    await item('SMT-01').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(focused()).toBe('SMT-02 貼片機')
    await item('SMT-02').trigger('keydown', { key: 'ArrowRight' }) // 這一列最右邊
    await nextTick()
    expect(focused()).toBe('SMT-02 貼片機')
    await item('SMT-02').trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    await item('SMT-01').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(focused()).toBe('AOI-01')
    expect(w.find('.sr-only[aria-live]').text()).toContain('AOI-01')
    // 放大後往右移到畫面外的 AOI-02：自動平移
    for (let i = 0; i < 4; i++) await item('AOI-01').trigger('keydown', { key: '+' })
    const before = tf()
    await item('AOI-01').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(focused()).toBe('AOI-02')
    expect(tf()).not.toBe(before)
    await item('AOI-02').trigger('keydown', { key: 'Enter' })
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    await item('AOI-02').trigger('keydown', { key: 'Escape' })
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    await item('AOI-02').trigger('keydown', { key: '-' })
    await item('AOI-02').trigger('keydown', { key: '=' })
    await item('AOI-02').trigger('keydown', { key: '0' })
    await item('AOI-02').trigger('keydown', { key: 'x' })
    await item('AOI-02').trigger('keydown', { key: 'Escape' }) // 沒有明細時不做事
  })

  it('ref：select / fit；背景圖片；showLegend=false', async () => {
    const { w, comp } = mountIt({ backgroundSrc: 'plan.png', showLegend: false })
    expect(w.find('image').attributes('href')).toBe('plan.png')
    expect(w.find('[aria-label="依狀態篩選"]').exists()).toBe(false)
    const api = comp().vm as unknown as { select: (id: string | null) => void; fit: () => void }
    api.select('c')
    await nextTick()
    expect(w.find('[role="dialog"]').attributes('aria-label')).toBe('AOI-01')
    api.select(null)
    await nextTick()
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    api.fit()
  })

  it('沒有給 now 時每 30 秒更新', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const w = mount({ render: () => h(ChptFloorPlan, { planWidth: 50, planHeight: 20, items: [{ id: 'a', name: 'A', status: 'run', x: 0, y: 0, since: NOW - 60_000 }] }) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.find('g[role="button"]').attributes('aria-label')).toContain('已運轉 1 分')
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(w.find('g[role="button"]').attributes('aria-label')).toContain('已運轉 2 分')
    vi.useRealTimers()
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptFloorPlan, { planWidth: 50, planHeight: 20, items: items(), now: NOW })) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.find('svg').attributes('aria-label')).toBe('Floor plan')
    expect(w.find('button[aria-label="Fit to view"]').exists()).toBe(true)
  })
})
