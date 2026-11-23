import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptTimeScrubber from '@/components/library/ui/ChptTimeScrubber.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import { useChartSync } from '@/components/library/charts/composables/useChartSync'
import type { TimelineEvent } from '@/components/library/shared/timeScrubber'

const START = new Date(2026, 10, 23, 8, 0).getTime()
const MIN = 60_000
const END = START + 100 * MIN // 100 分鐘：鍵盤步進 1 分鐘
const events: TimelineEvent[] = [
  { time: START + 20 * MIN, label: '溫度偏高', severity: 'major' },
  { time: START + 50 * MIN, label: '換線', color: 'purple', id: 'x' },
  { time: START + 80 * MIN, label: '停機', severity: 'critical' },
  { time: START + 500 * MIN, label: '範圍外' },
  { time: 'bad', label: '壞資料' },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function pointer(el: Element, type: string, clientX: number, extra: Record<string, unknown> = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    clientX: { value: clientX },
    pointerId: { value: 1 },
    button: { value: 0 },
    pointerType: { value: 'mouse' },
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])),
  })
  el.dispatchEvent(e)
}

/** 軌道寬 1000px：x = 10 × 分鐘 */
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 64, right: 1000, bottom: 64, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
  const at = ref<number | null>('modelValue' in props ? (props.modelValue as number | null) : START + 10 * MIN)
  const range = ref<[number, number] | null>((props.range as [number, number] | null) ?? null)
  const playing = ref(false)
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  const node = () =>
    h(ChptTimeScrubber, {
      start: START,
      end: END,
      events,
      ...props,
      modelValue: at.value,
      range: range.value,
      playing: playing.value,
      'onUpdate:modelValue': (v: number) => (rec('time')(v), (at.value = v)),
      'onUpdate:range': (v: [number, number] | null) => (rec('range')(v), (range.value = v)),
      'onUpdate:playing': (v: boolean) => (rec('playing')(v), (playing.value = v)),
      'onUpdate:speed': rec('speed'),
      onEventClick: rec('event'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const head = () => w.find('[role="slider"][aria-label="目前時間"]')
  const track = () => w.find('.relative.h-16')
  const btn = (label: string) => w.findAll('button').find((b) => b.attributes('aria-label') === label || b.text() === label)!
  const minutes = () => (Number(head().attributes('aria-valuenow')) - START) / MIN
  return { w, at, range, playing, emitted, head, track, btn, minutes }
}

describe('ChptTimeScrubber', () => {
  it('播放頭位置、時間文字、事件標記（範圍外與無效的略過）、刻度', () => {
    const { w, head } = mountIt()
    expect(head().attributes('aria-valuetext')).toBe('08:10:00')
    expect(head().attributes('style')).toContain('left: 10%')
    const markers = w.findAll('button[title]')
    expect(markers.map((m) => m.attributes('aria-label'))).toEqual(['08:20:00 溫度偏高', '08:50:00 換線', '09:20:00 停機'])
    expect(markers[1].find('span').attributes('style')).toContain('purple')
    expect(markers[0].find('span').attributes('style')).toContain('warning-solid')
    expect(w.text()).toContain('08:00')
  })

  it('點軌道跳過去並開始拖曳；放開後不再跟著', async () => {
    const { track, minutes, emitted } = mountIt()
    pointer(track().element, 'pointerdown', 300)
    await nextTick()
    expect(minutes()).toBe(30)
    pointer(track().element, 'pointermove', 450)
    await nextTick()
    expect(minutes()).toBe(45)
    pointer(track().element, 'pointerup', 450)
    pointer(track().element, 'pointermove', 900)
    await nextTick()
    expect(minutes()).toBe(45)
    expect(emitted.time).toHaveLength(2)
    // 右鍵不動
    pointer(track().element, 'pointerdown', 900, { button: 2 })
    expect(minutes()).toBe(45)
  })

  it('播放頭鍵盤：←→（Shift ×10）、Home / End、PageUp / PageDown 事件', async () => {
    const { head, minutes } = mountIt()
    const key = async (k: string, shiftKey = false) => {
      await head().trigger('keydown', { key: k, shiftKey })
    }
    await key('ArrowRight')
    expect(minutes()).toBe(11)
    await key('ArrowLeft', true)
    expect(minutes()).toBe(1)
    await key('ArrowUp')
    expect(minutes()).toBe(2)
    await key('ArrowDown')
    expect(minutes()).toBe(1)
    await key('PageDown')
    expect(minutes()).toBe(20)
    await key('PageDown')
    expect(minutes()).toBe(50)
    await key('PageUp')
    expect(minutes()).toBe(20)
    await key('End')
    expect(minutes()).toBe(100)
    await key('PageDown') // 沒有下一個：不動
    expect(minutes()).toBe(100)
    await key('Home')
    expect(minutes()).toBe(0)
    await key('x')
    expect(minutes()).toBe(0)
  })

  it('上一個 / 下一個事件按鈕；沒有時停用', async () => {
    const { btn, minutes } = mountIt({ modelValue: START })
    expect(btn('上一個事件').attributes('disabled')).toBeDefined()
    await btn('下一個事件').trigger('click')
    expect(minutes()).toBe(20)
    await btn('下一個事件').trigger('click')
    await btn('下一個事件').trigger('click')
    expect(minutes()).toBe(80)
    expect(btn('下一個事件').attributes('disabled')).toBeDefined()
    await btn('上一個事件').trigger('click')
    expect(minutes()).toBe(50)
  })

  it('點事件標記：跳過去、送出 event-click；在範圍外時先清掉範圍', async () => {
    const { w, minutes, emitted } = mountIt({ range: [START + 30 * MIN, START + 60 * MIN] })
    await w.findAll('button[title]')[2].trigger('click')
    expect(emitted.range).toEqual([null])
    expect(minutes()).toBe(80)
    expect((emitted.event[0] as TimelineEvent).label).toBe('停機')
    await w.findAll('button[title]')[1].trigger('click')
    expect(emitted.range).toHaveLength(1)
  })

  it('播放：依倍速前進、到結尾自動停止；在結尾按播放從頭開始；倍速切換', async () => {
    let now = 0
    const frames: Array<(t: number) => void> = []
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => (frames.push(cb), frames.length))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const step = async (ms: number) => {
      now += ms
      const cb = frames.shift()
      cb?.(now)
      await nextTick()
    }
    const { btn, minutes, emitted, w } = mountIt({ speed: 600 })
    await btn('播放').trigger('click')
    expect(emitted.playing).toEqual([true])
    await step(0) // 第一格只記時間
    await step(100) // 100ms × 600 = 60 秒
    expect(minutes()).toBe(11)
    await step(5000) // 一次最多算 250ms：150 秒
    expect(minutes()).toBe(13.5)
    // 切倍速
    await w.findAll('[role="radio"]').find((r) => r.text() === '3600×')!.trigger('click')
    expect(emitted.speed).toEqual([3600])
    for (let i = 0; i < 20; i++) await step(250)
    expect(minutes()).toBe(100)
    expect(emitted.playing).toEqual([true, false])
    // 在結尾按播放：從頭
    await btn('播放').trigger('click')
    expect(minutes()).toBe(0)
    await btn('暫停').trigger('click')
    expect(emitted.playing).toEqual([true, false, true, false])
  })

  it('loop：播到結尾從頭；空白鍵播放 / 暫停；外部 playing 控制', async () => {
    let now = 0
    const frames: Array<(t: number) => void> = []
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => (frames.push(cb), frames.length))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const { head, minutes, playing, emitted } = mountIt({ loop: true, speed: 3600, modelValue: START + 95 * MIN })
    await head().trigger('keydown', { key: ' ' })
    frames.shift()?.((now += 0))
    frames.shift()?.((now += 200)) // 12 分鐘 → 超過結尾，回到 7 分
    await nextTick()
    expect(minutes()).toBe(7)
    expect(emitted.playing).toEqual([true])
    playing.value = false
    await nextTick()
    expect(emitted.playing).toEqual([true, false])
    playing.value = true
    await nextTick()
    expect(emitted.playing).toEqual([true, false, true])
    await head().trigger('keydown', { key: ' ' })
    expect(emitted.playing).toEqual([true, false, true, false])
  })

  it('沒有 requestAnimationFrame 時用計時器', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', undefined)
    vi.stubGlobal('cancelAnimationFrame', undefined)
    const { btn, minutes } = mountIt({ speed: 60 })
    await btn('播放').trigger('click')
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(minutes()).toBeGreaterThan(10)
    await btn('暫停').trigger('click')
  })

  it('範圍：拖兩端把手、播放頭拉回範圍內、拉回全部時為 null；看全部按鈕；鍵盤移動把手', async () => {
    const { w, range, minutes, emitted } = mountIt({ modelValue: START + 10 * MIN })
    const handles = () => w.findAll('[role="slider"]').filter((s) => s.attributes('aria-label')?.startsWith('範圍'))
    const startHandle = handles()[0].element
    pointer(startHandle, 'pointerdown', 0)
    pointer(startHandle, 'pointermove', 300)
    pointer(startHandle, 'pointerup', 300)
    await nextTick()
    expect(range.value).toEqual([START + 30 * MIN, END])
    expect(minutes()).toBe(30)
    expect(w.text()).toContain('範圍 08:30:00 – 09:40:00')
    // 結束把手不能越過開始把手
    const endHandle = handles()[1].element
    pointer(endHandle, 'pointerdown', 1000)
    pointer(endHandle, 'pointermove', 100)
    pointer(endHandle, 'pointerup', 100)
    await nextTick()
    expect(range.value![1]).toBeGreaterThan(range.value![0])
    // 鍵盤
    await handles()[1].trigger('keydown', { key: 'End' })
    await handles()[0].trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
    expect(range.value).toEqual([START + 20 * MIN, END])
    await handles()[0].trigger('keydown', { key: 'Home' })
    expect(range.value).toBeNull()
    await handles()[0].trigger('keydown', { key: 'x' })
    // 看全部
    range.value = [START, START + 50 * MIN]
    await nextTick()
    await w.findAll('button').find((b) => b.text() === '看全部')!.trigger('click')
    expect(emitted.range!.at(-1)).toBeNull()
  })

  it('rangeSelectable=false：沒有把手', () => {
    const { w } = mountIt({ rangeSelectable: false })
    expect(w.findAll('[role="slider"]')).toHaveLength(1)
  })

  it('sync：播放頭 → 十字線、範圍 → X 軸', async () => {
    const sync = useChartSync()
    const { range, head } = mountIt({ sync })
    expect((sync.crosshairValue.value as Date).getTime()).toBe(START + 10 * MIN)
    await head().trigger('keydown', { key: 'ArrowRight' })
    expect((sync.crosshairValue.value as Date).getTime()).toBe(START + 11 * MIN)
    range.value = [START + 60 * MIN, START + 20 * MIN]
    await nextTick()
    expect((sync.xDomain.value as Date[]).map((d) => d.getTime())).toEqual([START + 20 * MIN, START + 60 * MIN])
    range.value = null
    await nextTick()
    expect(sync.xDomain.value).toBeNull()
  })

  it('外部 modelValue；跨日時顯示日期；自訂時間格式', async () => {
    const { at, head } = mountIt({ end: START + 3 * 86_400_000 })
    at.value = START + 86_400_000
    await nextTick()
    expect(head().attributes('aria-valuetext')).toContain('11/24')
    const custom = mountIt({ timeFormat: (ms: number) => `T${(ms - START) / MIN}` })
    expect(custom.head().attributes('aria-valuetext')).toBe('T10')
  })

  it('沒有給 modelValue 時從開頭；end 不合法時至少 1 毫秒', () => {
    const { minutes } = mountIt({ modelValue: null })
    expect(minutes()).toBe(0)
    const bad = mountIt({ end: 'bad', modelValue: START })
    expect(bad.head().attributes('aria-valuemax')).toBe(String(START + 1))
  })

  it('英文語系', () => {
    const { w } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.find('[role="slider"][aria-label="Current time"]').exists()).toBe(true)
    expect(w.findAll('button').some((b) => b.attributes('aria-label') === 'Play')).toBe(true)
  })
})
