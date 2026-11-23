import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptAndonBoard from '@/components/library/ui/ChptAndonBoard.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { AndonCall } from '@/components/library/shared/andon'

const MIN = 60_000
const NOW = new Date(2026, 10, 23, 9, 0, 0).getTime()
const stations = [
  { id: 's1', name: '印刷', group: 'L1' },
  { id: 's2', name: '貼片', group: 'L1' },
  { id: 's3', name: '回焊' },
]
const seed = (): AndonCall[] => [
  { id: 'c1', station: 's2', type: 'maintenance', raisedAt: NOW - 12 * MIN, by: '林', note: '真空異常' },
  { id: 'c2', station: 's3', type: 'material', raisedAt: NOW - 8 * MIN, respondedAt: NOW - 5 * MIN, responder: '李' },
  { id: 'c3', station: 's1', type: 'quality', raisedAt: NOW - 60 * MIN, resolvedAt: NOW - 40 * MIN },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const calls = ref<AndonCall[]>((props.modelValue as AndonCall[]) ?? seed())
  const events: Record<string, AndonCall[]> = {}
  const rec = (n: string) => (c: AndonCall) => (events[n] ??= []).push(c)
  const node = () =>
    h(ChptAndonBoard, {
      stations,
      now: NOW,
      operator: '陳',
      ...props,
      modelValue: calls.value,
      'onUpdate:modelValue': (v: AndonCall[]) => (calls.value = v),
      onRaise: rec('raise'),
      onRespond: rec('respond'),
      onResolve: rec('resolve'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const cards = () => w.findAll('ul.grid > li')
  const card = (name: string) => cards().find((c) => c.attributes('aria-label')!.startsWith(name))!
  const btn = (scope: { findAll: VueWrapper['findAll'] }, label: string) => scope.findAll('button').find((b) => b.text().includes(label) || b.attributes('aria-label') === label)
  return { w, calls, events, cards, card, btn }
}

describe('ChptAndonBoard', () => {
  it('每站一張卡片：正常 / 呼叫中 / 處理中、計時、說明；已完成的不顯示', () => {
    const { cards, card } = mountIt()
    expect(cards().map((c) => c.attributes('aria-label'))).toEqual(['印刷：正常', '貼片：維修呼叫中 12:00', '回焊：缺料處理中 05:00'])
    expect(card('貼片').text()).toContain('等待回應（林 呼叫）')
    expect(card('貼片').text()).toContain('真空異常')
    expect(card('回焊').text()).toContain('李處理中')
    expect(card('印刷').text()).toContain('正常')
  })

  it('顏色：等太久轉紅（標題底色、閃動）；處理中未超時為中性色；正常為綠', () => {
    const { card } = mountIt()
    expect(card('貼片').attributes('style')).toContain('danger-solid')
    expect(card('貼片').find('.motion-safe\\:animate-pulse').exists()).toBe(true)
    expect(card('回焊').attributes('style')).toContain('stroke-dark')
    expect(card('印刷').attributes('style')).toContain('success-solid')
  })

  it('上方摘要：各原因進行中的數量', () => {
    const { w } = mountIt()
    const chips = w.findAll('div.flex-wrap').at(0)!.findAll('span.rounded-full').map((s) => s.text().replace(/\s+/g, ''))
    expect(chips).toEqual(['build維修1', 'inventory_2缺料1', 'fact_check品質0', 'support_agent主管0'])
  })

  it('呼叫：新增、送出 raise、念出；同一站同一原因進行中時按鈕停用', async () => {
    const { card, btn, calls, events, w } = mountIt()
    expect(btn(card('貼片'), '貼片：呼叫維修')!.attributes('disabled')).toBeDefined()
    await btn(card('印刷'), '印刷：呼叫主管')!.trigger('click')
    expect(events.raise[0]).toMatchObject({ station: 's1', type: 'supervisor', raisedAt: NOW, by: '陳' })
    expect(calls.value).toHaveLength(4)
    await nextTick()
    expect(w.find('[aria-live="assertive"]').text()).toBe('印刷 呼叫主管')
    expect(card('印刷').attributes('aria-label')).toBe('印刷：主管呼叫中 00:00')
  })

  it('回應、完成', async () => {
    const { card, btn, events, calls } = mountIt()
    await btn(card('貼片'), '回應')!.trigger('click')
    expect(events.respond[0]).toMatchObject({ id: 'c1', respondedAt: NOW, responder: '陳' })
    await nextTick()
    expect(btn(card('貼片'), '回應')).toBeUndefined()
    await btn(card('回焊'), '完成')!.trigger('click')
    expect(events.resolve[0]).toMatchObject({ id: 'c2', resolvedAt: NOW })
    await nextTick()
    expect(card('回焊').attributes('aria-label')).toBe('回焊：正常')
    expect(calls.value.find((c) => c.id === 'c2')!.resolvedAt).toBe(NOW)
  })

  it('readonly：沒有操作按鈕；canRaise=false：沒有呼叫按鈕', () => {
    const ro = mountIt({ readonly: true })
    expect(ro.w.findAll('button').filter((b) => /回應|完成|呼叫/.test(b.text() + (b.attributes('aria-label') ?? '')))).toHaveLength(0)
    const nr = mountIt({ canRaise: false })
    expect(nr.w.findAll('[role="group"]')).toHaveLength(0)
    expect(nr.btn(nr.card('貼片'), '回應')).toBeDefined()
  })

  it('activeFirst：越嚴重越前面', () => {
    const { cards } = mountIt({ activeFirst: true })
    expect(cards().map((c) => c.attributes('aria-label')!.split('：')[0])).toEqual(['貼片', '回焊', '印刷'])
  })

  it('自訂原因；沒有 label 的預設原因用語系名稱', () => {
    const { w } = mountIt({ types: [{ key: 'maintenance', label: '' }, { key: 'safety', label: '安全', icon: 'health_and_safety' }] })
    expect(w.text()).toContain('維修')
    expect(w.text()).toContain('安全')
  })

  it('不認得的原因：用 key 當名稱', () => {
    const { card } = mountIt({ modelValue: [{ id: 'x', station: 's1', type: 'mystery', raisedAt: NOW }] })
    expect(card('印刷').attributes('aria-label')).toBe('印刷：mystery呼叫中 00:00')
  })

  it('轉紅時念出；sound 時響、可靜音', async () => {
    let plays = 0
    class FakeCtx {
      state = 'running'
      currentTime = 0
      destination = {}
      createOscillator() {
        plays++
        return { frequency: { value: 0 }, connect: (g: unknown) => g, start: () => {}, stop: () => {} }
      }
      createGain() {
        return { gain: { value: 0 }, connect: () => {} }
      }
    }
    vi.stubGlobal('AudioContext', FakeCtx)
    const now = ref(NOW - 6 * MIN)
    const calls = ref<AndonCall[]>([{ id: 'c1', station: 's1', type: 'material', raisedAt: NOW - 10 * MIN }])
    const w = mount({ render: () => h(ChptAndonBoard, { stations, modelValue: calls.value, now: now.value, sound: true }) }, { attachTo: document.body })
    mounted.push(w)
    expect(plays).toBe(0)
    now.value = NOW // 等了 10 分鐘 → 紅
    await nextTick()
    await nextTick()
    expect(w.find('[aria-live="assertive"]').text()).toBe('印刷 的缺料呼叫等太久了')
    expect(plays).toBe(2)
    const mute = w.findAll('button').find((b) => b.text().includes('靜音'))!
    await mute.trigger('click')
    expect(mute.attributes('aria-pressed')).toBe('true')
    calls.value = [...calls.value, { id: 'n', station: 's2', type: 'quality', raisedAt: NOW }]
    await nextTick()
    expect(w.find('[aria-live="assertive"]').text()).toBe('貼片 呼叫品質')
    expect(plays).toBe(2)
  })

  it('沒有 now 時每秒更新計時', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const { card } = mountIt({ now: null, modelValue: [{ id: 'x', station: 's1', type: 'quality', raisedAt: NOW }] })
    expect(card('印刷').text()).toContain('00:00')
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(card('印刷').text()).toContain('00:03')
  })

  it('電視模式：字更大', () => {
    const { w } = mountIt({ tv: true, title: '二廠' })
    expect(w.find('h3').classes()).toContain('text-2xl')
    expect(w.find('ul.grid').attributes('style')).toContain('300px')
  })

  it('全螢幕：瀏覽器支援時顯示按鈕', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    const request = vi.fn(() => Promise.resolve())
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: request })
    const { w } = mountIt()
    const fs = w.findAll('button').find((b) => b.text().includes('全螢幕'))!
    await fs.trigger('click')
    expect(request).toHaveBeenCalled()
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: w.find('.andon-board').element })
    document.dispatchEvent(new Event('fullscreenchange'))
    await nextTick()
    expect(w.text()).toContain('離開全螢幕')
    const exit = vi.fn(() => Promise.resolve())
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit })
    await w.findAll('button').find((b) => b.text().includes('離開全螢幕'))!.trigger('click')
    expect(exit).toHaveBeenCalled()
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false })
  })

  it('raise 方法；英文語系', async () => {
    const { w, events } = mountIt()
    ;(w.findComponent(ChptAndonBoard).vm as unknown as { raise: (s: string, t: string) => void }).raise('s1', 'material')
    expect(events.raise).toHaveLength(1)
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.card('貼片').attributes('aria-label')).toBe('貼片: Maintenance calling 12:00')
  })
})
