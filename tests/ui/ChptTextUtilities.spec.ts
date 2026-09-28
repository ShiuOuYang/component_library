import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptCopyButton from '@/components/library/ui/ChptCopyButton.vue'
import ChptEllipsis from '@/components/library/ui/ChptEllipsis.vue'
import ChptCountdown from '@/components/library/ui/ChptCountdown.vue'
import ChptWatermark from '@/components/library/ui/ChptWatermark.vue'

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ChptCopyButton', () => {
  function stubClipboard(impl: (t: string) => Promise<void>) {
    const writeText = vi.fn(impl)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    return writeText
  }

  it('只有圖示時以「複製：對象」命名；複製後變「已複製」並報讀', async () => {
    const writeText = stubClipboard(async () => {})
    const w = mount(ChptCopyButton, { props: { text: 'WO-2026-0917', subject: '工單號' } })
    wrapper = w
    const btn = w.find('button')
    expect(btn.attributes('aria-label')).toBe('複製：工單號')
    await btn.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('WO-2026-0917')
    expect(w.find('button').attributes('aria-label')).toBe('已複製：工單號')
    expect(w.find('[aria-live]').text()).toBe('已複製')
    expect(w.emitted('copy')?.[0]).toEqual(['WO-2026-0917'])
  })

  it('live region 在按鈕外面（不會變成按鈕名稱的一部分）', () => {
    const w = mount(ChptCopyButton, { props: { text: 'x', label: '複製' } })
    wrapper = w
    expect(w.find('button [aria-live]').exists()).toBe(false)
    expect(w.find('button').text()).toBe('content_copy複製')
  })

  it('2 秒後恢復原狀', async () => {
    vi.useFakeTimers()
    stubClipboard(async () => {})
    const w = mount(ChptCopyButton, { props: { text: 'x', label: '複製' } })
    wrapper = w
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.find('button').text()).toContain('已複製')
    vi.advanceTimersByTime(2100)
    await nextTick()
    expect(w.find('button').text()).toContain('複製')
    expect(w.find('button').text()).not.toContain('已複製')
  })

  it('clipboard 與 execCommand 都失敗時送出 error、報讀「複製失敗」', async () => {
    stubClipboard(async () => {
      throw new Error('denied')
    })
    document.execCommand = vi.fn(() => false) as unknown as typeof document.execCommand
    const w = mount(ChptCopyButton, { props: { text: 'x' } })
    wrapper = w
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.emitted('error')).toHaveLength(1)
    expect(w.find('[aria-live]').text()).toBe('複製失敗')
  })

  it('clipboard 被擋下時退回 execCommand', async () => {
    stubClipboard(async () => {
      throw new Error('denied')
    })
    document.execCommand = vi.fn(() => true) as unknown as typeof document.execCommand
    const w = mount(ChptCopyButton, { props: { text: 'x' } })
    wrapper = w
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.emitted('copy')).toHaveLength(1)
  })
})

describe('ChptEllipsis', () => {
  function mountEllipsis(props: Record<string, unknown>, scroll: number, client: number) {
    const w = mount(ChptEllipsis, { props: { text: '很長的異常描述 '.repeat(20), ...props }, attachTo: document.body })
    wrapper = w
    const el = w.find('span > span').element as HTMLElement
    Object.defineProperty(el, 'scrollWidth', { value: scroll, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: client, configurable: true })
    Object.defineProperty(el, 'scrollHeight', { value: scroll, configurable: true })
    Object.defineProperty(el, 'clientHeight', { value: client, configurable: true })
    ;(w.vm as unknown as { measure: () => void }).measure()
    return w
  }

  it('沒被截斷時沒有 title 與展開鈕', async () => {
    const w = mountEllipsis({ expandable: true }, 100, 100)
    await nextTick()
    expect(w.find('button').exists()).toBe(false)
    expect(w.find('span > span').attributes('title')).toBeUndefined()
  })

  it('被截斷時：title 顯示全文、展開鈕 aria-expanded / aria-controls', async () => {
    const w = mountEllipsis({ expandable: true }, 500, 100)
    await nextTick()
    const text = w.find('span > span')
    expect(text.attributes('title')).toContain('很長的異常描述')
    const btn = w.find('button')
    expect(btn.attributes('aria-expanded')).toBe('false')
    expect(btn.attributes('aria-controls')).toBe(text.attributes('id'))
    await btn.trigger('click')
    expect(w.find('button').attributes('aria-expanded')).toBe('true')
    expect(w.find('button').text()).toBe('收起')
    expect(w.find('span > span').classes()).toContain('whitespace-pre-line')
    expect(w.emitted('toggle')?.[0]).toEqual([true])
  })

  it('多行用 line-clamp', () => {
    const w = mountEllipsis({ lines: 3 }, 100, 100)
    expect((w.find('span > span').element as HTMLElement).style.webkitLineClamp).toBe('3')
  })

  it('全文一直在 DOM 裡（螢幕閱讀器讀得到）', () => {
    const w = mountEllipsis({}, 500, 100)
    expect(w.find('span > span').text()).toContain('很長的異常描述')
  })
})

describe('ChptCountdown', () => {
  it('以目標時間計算剩餘時間；role=timer 帶口語化名稱', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 28, 10, 0, 0))
    const w = mount(ChptCountdown, { props: { value: new Date(2026, 8, 28, 11, 5, 3), title: '距離保養' } })
    wrapper = w
    const timer = w.find('[role="timer"]')
    expect(timer.text()).toBe('01:05:03')
    expect(timer.attributes('aria-label')).toBe('距離保養：剩餘 1 小時 5 分 3 秒')
  })

  it('格式：天數；沒有 HH 時小時併進分鐘', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 28, 10, 0, 0))
    const target = new Date(2026, 8, 30, 11, 30, 0)
    const w = mount(ChptCountdown, { props: { value: target, format: 'D 天 HH:mm:ss' } })
    wrapper = w
    expect(w.find('[role="timer"]').text()).toBe('2 天 01:30:00')
    wrapper.unmount()
    wrapper = mount(ChptCountdown, { props: { value: Date.now() + 90 * 60_000, format: 'mm:ss' } })
    expect(wrapper.find('[role="timer"]').text()).toBe('90:00')
  })

  it('每秒更新；到期停止、送出 finish、報讀一次', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 28, 10, 0, 0))
    const w = mount(ChptCountdown, { props: { value: Date.now() + 3000, format: 'ss' } })
    wrapper = w
    expect(w.find('[role="timer"]').text()).toBe('03')
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(w.find('[role="timer"]').text()).toBe('02')
    vi.advanceTimersByTime(2500)
    await nextTick()
    expect(w.find('[role="timer"]').text()).toBe('00')
    expect(w.emitted('finish')).toHaveLength(1)
    expect(w.find('[aria-live]').text()).toBe('時間到')
  })

  it('剩餘時間低於門檻時變紅', () => {
    vi.useFakeTimers()
    const w = mount(ChptCountdown, { props: { value: Date.now() + 30_000, warningThreshold: 60_000 } })
    wrapper = w
    expect(w.find('[role="timer"]').classes()).toContain('text-danger')
  })
})

describe('ChptWatermark', () => {
  it('SVG 背景鋪滿；不擋點擊、螢幕閱讀器略過', () => {
    const w = mount(ChptWatermark, { props: { content: ['王小明', '2026-09-28'] }, slots: { default: '<p class="doc">內容</p>' } })
    wrapper = w
    expect(w.find('.doc').exists()).toBe(true)
    const layer = w.find('[data-chpt-watermark]')
    expect(layer.attributes('aria-hidden')).toBe('true')
    expect(layer.classes()).toContain('pointer-events-none')
    const bg = (layer.element as HTMLElement).style.backgroundImage
    expect(bg).toContain('data:image/svg+xml')
    expect(decodeURIComponent(bg)).toContain('王小明')
    expect(decodeURIComponent(bg)).toContain('2026-09-28')
  })

  it('內容會被跳脫（不能注入 SVG 標籤）', () => {
    const w = mount(ChptWatermark, { props: { content: '<script>x</script>' } })
    wrapper = w
    const bg = decodeURIComponent((w.find('[data-chpt-watermark]').element as HTMLElement).style.backgroundImage)
    expect(bg).not.toContain('<script>')
    expect(bg).toContain('&lt;script&gt;')
  })

  it('沒有內容時不畫', () => {
    const w = mount(ChptWatermark, { props: { content: '' } })
    wrapper = w
    expect(w.find('[data-chpt-watermark]').exists()).toBe(false)
  })
})
