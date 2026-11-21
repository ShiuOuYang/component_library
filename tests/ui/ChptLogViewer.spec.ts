import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChptLogViewer from '@/components/library/ui/ChptLogViewer.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { LogEntry, LogLevel } from '@/components/library/shared/logViewer'

/**
 * jsdom 沒有版面：清單的 scrollHeight / clientHeight 依「列數 × 列高」與 height prop 模擬，scrollTop 可以設定。
 */
const ROW = 24
const HEIGHT = 240 // 10 列
function fakeScroller(el: HTMLElement) {
  let top = 0
  Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => HEIGHT })
  Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => el.querySelectorAll('[role="option"]').length && Number((el.firstElementChild as HTMLElement)?.style.height.replace('px', '') || 0) })
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (v: number) => {
      top = Math.max(0, Math.min(v, Math.max(0, el.scrollHeight - HEIGHT)))
    },
  })
}

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
const make = (n: number, start = 0): LogEntry[] =>
  Array.from({ length: n }, (_, i) => ({ id: start + i, time: Date.UTC(2026, 10, 21, 0, 0, start + i), level: LEVELS[(start + i) % 5], message: `msg ${start + i}`, source: i % 2 ? 'SMT-02' : undefined }))

const mounted: VueWrapper[] = []
beforeEach(() => {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function mountIt(props: Record<string, unknown> = {}) {
  const entries = ref<LogEntry[]>((props.entries as LogEntry[]) ?? make(100))
  const w = mount({ render: () => h(ChptLogViewer, { height: HEIGHT, rowHeight: ROW, ...props, entries: entries.value }) }, { attachTo: document.body })
  mounted.push(w)
  const list = () => w.find('[role="listbox"]')
  fakeScroller(list().element as HTMLElement)
  ;(w.findComponent(ChptLogViewer).vm as unknown as { scrollToEnd: () => void }).scrollToEnd()
  await nextTick()
  const comp = () => w.findComponent(ChptLogViewer)
  const levelBtn = (label: string) => w.find('[role="group"]').findAll('button').find((b) => b.text().includes(label))!
  const status = () => w.findAll('span').find((s) => s.text().startsWith('顯示'))!.text()
  return { w, entries, list, comp, levelBtn, status }
}

describe('ChptLogViewer', () => {
  it('只畫看得到的列；預設隱藏 debug；各等級筆數；跟隨時在最下面', async () => {
    const { w, list, status, levelBtn } = await mountIt()
    expect(status()).toBe('顯示 80 / 共 100 筆')
    expect(levelBtn('除錯').attributes('aria-pressed')).toBe('false')
    expect(levelBtn('錯誤').text()).toContain('20')
    const rows = list().findAll('[role="option"]')
    expect(rows.length).toBeLessThan(40)
    expect(rows.at(-1)!.text()).toContain('msg 99')
    expect(w.find('[role="option"]').attributes('style')).toContain('height: 24px')
  })

  it('等級切換、搜尋標示、正規式錯誤提示、沒有符合', async () => {
    const { w, list, status, levelBtn } = await mountIt()
    await levelBtn('除錯').trigger('click')
    expect(status()).toBe('顯示 100 / 共 100 筆')
    await levelBtn('資訊').trigger('click')
    expect(status()).toBe('顯示 80 / 共 100 筆')
    const search = w.find('input[type="search"]')
    await search.setValue('msg 4')
    expect(list().findAll('mark').map((m) => m.text())).toContain('msg 4')
    await search.setValue('/msg [/')
    expect(search.attributes('aria-invalid')).toBe('true')
    expect(w.text()).toContain('正規式有誤')
    await search.setValue('nothing-matches')
    expect(list().text()).toContain('沒有符合條件的紀錄')
    await search.setValue('smt-02')
    expect(status()).toMatch(/顯示 \d+ \/ 共 100 筆/)
  })

  it('新紀錄：在最下面時跟著捲；往上捲就暫停並顯示 N 筆新紀錄，點了回到最下面；只保留 N 筆（筆數不變）也偵測得到', async () => {
    const { w, entries, list } = await mountIt({ entries: make(100) })
    const el = list().element as HTMLElement
    entries.value.push(...make(3, 100))
    await nextTick()
    await nextTick()
    expect(el.scrollTop + HEIGHT).toBeGreaterThanOrEqual(el.scrollHeight - ROW)
    // 往上捲
    el.scrollTop = 0
    await list().trigger('scroll')
    expect(w.text()).toContain('已暫停跟隨')
    // ring buffer：push 一筆、前面 splice 一筆
    entries.value.push(...make(1, 103))
    entries.value.splice(0, 1)
    await nextTick()
    entries.value.push(...make(1, 104))
    entries.value.splice(0, 1)
    await nextTick()
    const btn = w.findAll('button').find((b) => b.text().includes('筆新紀錄'))!
    expect(btn.text()).toMatch(/^[12] 筆新紀錄/)
    await btn.trigger('click')
    expect(el.scrollTop + HEIGHT).toBeGreaterThanOrEqual(el.scrollHeight - ROW)
    expect(w.findAll('button').some((b) => b.text().includes('筆新紀錄'))).toBe(false)
  })

  it('新的 error / fatal 以 aria-live 念出；整份換掉時不算新的', async () => {
    const { w, entries } = await mountIt({ entries: make(5) })
    const live = () => w.find('.sr-only[aria-live]').text()
    entries.value.push({ id: 'e1', time: 1, level: 'error', message: '卡料' })
    await nextTick()
    expect(live()).toBe('新的錯誤：卡料')
    entries.value.push({ id: 'e2', time: 2, level: 'fatal', message: '急停' }, { id: 'e3', time: 3, level: 'error', message: '逾時' })
    await nextTick()
    expect(live()).toBe('2 筆新的錯誤，最新：逾時')
    entries.value = [{ id: 'x', time: 4, level: 'error', message: '換掉' }]
    await nextTick()
    expect(live()).toBe('2 筆新的錯誤，最新：逾時')
  })

  it('關閉跟隨：新紀錄不捲動、不顯示新紀錄按鈕；重新開啟時捲到最下面', async () => {
    const { w, entries, list } = await mountIt({ defaultFollow: false })
    const el = list().element as HTMLElement
    el.scrollTop = 0
    await list().trigger('scroll')
    entries.value.push(...make(5, 100))
    await nextTick()
    expect(el.scrollTop).toBe(0)
    expect(w.findAll('button').some((b) => b.text().includes('筆新紀錄'))).toBe(false)
    await w.find('input[role="switch"]').setValue(true)
    await nextTick()
    expect(el.scrollTop + HEIGHT).toBeGreaterThanOrEqual(el.scrollHeight - ROW)
  })

  it('鍵盤：↑↓ PageUp PageDown Home End 移動（aria-activedescendant）、Enter 看完整內容、Esc 關閉', async () => {
    const { w, list, comp } = await mountIt()
    const active = () => document.getElementById(list().attributes('aria-activedescendant')!)?.textContent ?? ''
    await list().trigger('keydown', { key: 'ArrowUp' }) // 沒有游標時 ↑ 從最後一筆開始
    expect(active()).toContain('msg 99')
    await list().trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(active()).toContain('msg 1')
    await list().trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(active()).toContain('msg 2')
    await list().trigger('keydown', { key: 'PageDown' })
    await nextTick()
    await list().trigger('keydown', { key: 'PageUp' })
    await nextTick()
    expect(active()).toContain('msg 2')
    await list().trigger('keydown', { key: 'Enter' })
    expect(w.find('pre').text()).toBe('msg 2')
    expect(comp().emitted('select')![0][0]).toMatchObject({ message: 'msg 2' })
    expect(list().find('[aria-selected="true"]').text()).toContain('msg 2')
    await list().trigger('keydown', { key: 'Escape' })
    expect(w.find('pre').exists()).toBe(false)
    await list().trigger('keydown', { key: 'End' })
    await nextTick()
    expect(active()).toContain('msg 99')
    await list().trigger('keydown', { key: 'x' })
    await list().trigger('keydown', { key: 'Escape' }) // 沒有選取時不做事
  })

  it('點一列看完整內容、再點一次關閉；篩選後游標回到範圍內', async () => {
    const { w, list, levelBtn } = await mountIt({ entries: make(10) })
    const row = () => list().findAll('[role="option"]').at(-1)!
    await row().trigger('click')
    expect(w.find('pre').text()).toBe('msg 9')
    await row().trigger('click')
    expect(w.find('pre').exists()).toBe(false)
    await list().trigger('keydown', { key: 'End' })
    await levelBtn('嚴重').trigger('click')
    await nextTick()
    expect(list().attributes('aria-activedescendant')).toBeDefined()
    for (const l of ['資訊', '警告', '錯誤']) await levelBtn(l).trigger('click')
    await nextTick()
    expect(list().attributes('aria-activedescendant')).toBeUndefined()
    await list().trigger('keydown', { key: 'ArrowDown' }) // 沒有資料
  })

  it('複製篩選後的紀錄 / 單筆；剪貼簿被拒時提示；下載 .log', async () => {
    const { w } = await mountIt({ entries: make(3), fileName: 'line1' })
    const btn = (label: string) => w.findAll('button').find((b) => b.text().includes(label))!
    await btn('複製').trigger('click')
    await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('2026-11-21T00:00:01.000Z [INFO] (SMT-02) msg 1\n2026-11-21T00:00:02.000Z [WARN] msg 2')
    expect(w.find('.sr-only[aria-live]').text()).toBe('已複製 2 筆')
    await w.findAll('[role="option"]')[0].trigger('click')
    ;(navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('denied'))
    await btn('複製這筆').trigger('click')
    await flushPromises()
    expect(w.find('.sr-only[aria-live]').text()).toContain('無法複製')
    await btn('複製這筆').trigger('click')
    await flushPromises()
    expect(w.find('.sr-only[aria-live]').text()).toBe('已複製 1 筆')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    await btn('下載').trigger('click')
    expect(click).toHaveBeenCalled()
    expect((click.mock.instances[0] as unknown as HTMLAnchorElement).download).toBe('line1.log')
  })

  it('沒有紀錄；timeFormat；沒有來源時不畫來源欄', async () => {
    const empty = await mountIt({ entries: [] })
    expect(empty.list().text()).toContain('還沒有紀錄')
    const tf = await mountIt({ entries: [{ time: 0, level: 'info', message: 'a' }], timeFormat: () => 'T!' })
    expect(tf.list().find('[role="option"]').text()).toContain('T!')
    expect(tf.list().find('[role="option"]').findAll('span')).toHaveLength(3)
    const dl = await mountIt({ entries: make(2) })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    await dl.w.findAll('button').find((b) => b.text().includes('下載'))!.trigger('click')
    expect((click.mock.instances[0] as unknown as HTMLAnchorElement).download).toMatch(/^log-\d{8}-\d{6}\.log$/)
  })

  it('完整內容：無效時間原樣顯示', async () => {
    const { w, list } = await mountIt({ entries: [{ time: 'bad', level: 'warn', message: 'x' }] })
    await list().find('[role="option"]').trigger('click')
    expect(w.text()).toContain('bad')
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptLogViewer, { entries: make(5) })) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.text()).toContain('Showing 4 of 5')
    expect(w.find('[role="listbox"]').attributes('aria-label')).toBe('Log')
  })
})
