import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptModal from '@/components/library/ui/ChptModal.vue'
import { useModalManager } from '@/components/library/shared/useModalManager'

/**
 * ChptModal 的 dialog 與 window 兩種模式。
 * window 模式（拖曳、縮放、最大化、最小化到口袋、z-index）原本幾乎沒有測試 ——
 * 函式覆蓋率只有 24%，是浮層家族的核心卻最沒保護。
 *
 * jsdom 的視窗是 1024 × 768。
 */

const wrappers: VueWrapper[] = []
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

async function mountModal(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  const w = mount(ChptModal, {
    props: { modelValue: true, title: '視窗', ...props },
    slots: { default: '<p class="body">內容</p>', ...slots },
    attachTo: document.body,
  })
  wrappers.push(w)
  await nextTick()
  await nextTick()
  return w
}

const panel = () => document.querySelector('[role="dialog"]') as HTMLElement
const header = () => panel().querySelector('.cursor-move') as HTMLElement
const resizeHandle = () => panel().querySelector('.cursor-se-resize') as HTMLElement
const buttonTitled = (title: string) => panel().querySelector(`button[title="${title}"]`) as HTMLButtonElement
const px = (v: string) => Number.parseFloat(v)

/** 送出滑鼠事件並等畫面更新 */
async function mouse(target: EventTarget, type: string, x: number, y: number) {
  target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true }))
  await nextTick()
}

describe('ChptModal：dialog 模式', () => {
  it.each([
    ['sm', '400px'],
    ['md', '600px'],
    ['lg', '800px'],
    ['xl', '1000px'],
  ])('size=%s → 寬 %s', async (size, width) => {
    await mountModal({ size })
    expect(panel().style.width).toBe(width)
  })

  it('width 數字換成 px、fullWidth 撐滿；bodyHeight 限制內容高度', async () => {
    await mountModal({ width: 520, bodyHeight: 300 })
    expect(panel().style.width).toBe('520px')
    expect((panel().querySelector('.overflow-y-auto') as HTMLElement).style.maxHeight).toBe('300px')
    wrappers.splice(0).forEach((w) => w.unmount())

    await mountModal({ fullWidth: true })
    expect(panel().style.width).toBe('100%')
  })

  /** 遮罩：覆蓋全畫面、aria-hidden 的那一層（不是圖示） */
  const mask = () => document.querySelector('div.absolute.inset-0[aria-hidden="true"]') as HTMLElement

  it('點遮罩關閉（送出 update:modelValue false 與 close）', async () => {
    const w = await mountModal()
    mask().click()
    expect(w.emitted('update:modelValue')).toEqual([[false]])
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('maskClosable=false 時點遮罩不關', async () => {
    const w = await mountModal({ maskClosable: false })
    mask().click()
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('footer 插槽有給才出現', async () => {
    await mountModal({}, { footer: '<button type="button" class="ok">確定</button>' })
    expect(panel().querySelector('.ok')).not.toBeNull()
  })

  it('打開時送出 open', async () => {
    const w = await mountModal({ modelValue: false })
    await w.setProps({ modelValue: true })
    expect(w.emitted('open')).toHaveLength(1)
  })
})

describe('ChptModal：window 模式', () => {
  it('沒給 x / y 時置中；給了就照給的位置', async () => {
    await mountModal({ mode: 'window', width: 600, height: 400 })
    expect(px(panel().style.left)).toBe((1024 - 600) / 2)
    expect(px(panel().style.top)).toBe((768 - 400) / 2)
    wrappers.splice(0).forEach((w) => w.unmount())

    await mountModal({ mode: 'window', width: 600, height: 400, x: 30, y: 40 })
    expect(panel().style.left).toBe('30px')
    expect(panel().style.top).toBe('40px')
  })

  it('拖曳標題列移動視窗；放開後不再跟著滑鼠', async () => {
    await mountModal({ mode: 'window', width: 400, height: 300, x: 100, y: 100 })
    await mouse(header(), 'mousedown', 200, 120)
    await mouse(document, 'mousemove', 250, 150)
    expect(panel().style.left).toBe('150px')
    expect(panel().style.top).toBe('130px')

    await mouse(document, 'mouseup', 250, 150)
    await mouse(document, 'mousemove', 400, 400)
    expect(panel().style.left).toBe('150px')
    expect(document.body.style.cursor).toBe('')
  })

  it('拖到視窗外會被限制在視窗內', async () => {
    await mountModal({ mode: 'window', width: 400, height: 300, x: 100, y: 100 })
    await mouse(header(), 'mousedown', 200, 120)
    await mouse(document, 'mousemove', 5000, -5000)
    expect(panel().style.left).toBe(`${1024 - 400}px`)
    expect(panel().style.top).toBe('0px')
    await mouse(document, 'mouseup', 0, 0)
  })

  it('draggable=false 時拖曳無效', async () => {
    await mountModal({ mode: 'window', width: 400, height: 300, x: 100, y: 100, draggable: false })
    await mouse(header(), 'mousedown', 200, 120)
    await mouse(document, 'mousemove', 300, 300)
    expect(panel().style.left).toBe('100px')
  })

  it('拖曳右下角縮放；不會小於 minWidth / minHeight，也不會超過 maxWidth', async () => {
    await mountModal({ mode: 'window', width: 400, height: 300, x: 0, y: 0, minWidth: 350, minHeight: 250, maxWidth: 500 })
    await mouse(resizeHandle(), 'mousedown', 400, 300)
    await mouse(document, 'mousemove', 450, 340)
    expect(panel().style.width).toBe('450px')
    expect(panel().style.height).toBe('340px')

    await mouse(document, 'mousemove', 100, 100)
    expect(panel().style.width).toBe('350px')
    expect(panel().style.height).toBe('250px')

    await mouse(document, 'mousemove', 900, 340)
    expect(panel().style.width).toBe('500px')
    await mouse(document, 'mouseup', 0, 0)
  })

  it('最大化撐滿視窗，再按一次回到原本的位置與大小', async () => {
    const w = await mountModal({ mode: 'window', width: 400, height: 300, x: 50, y: 60 })
    buttonTitled('最大化').click()
    await nextTick()
    expect(panel().style.width).toBe('100vw')
    expect(w.emitted('maximize')).toHaveLength(1)
    // 最大化時不能拖曳、沒有縮放把手
    expect(resizeHandle()).toBeNull()

    buttonTitled('還原').click()
    await nextTick()
    expect(panel().style.left).toBe('50px')
    expect(panel().style.width).toBe('400px')
    expect(w.emitted('restore')).toHaveLength(1)
  })

  it('defaultMaximized 一打開就是最大化', async () => {
    await mountModal({ mode: 'window', defaultMaximized: true })
    expect(panel().style.width).toBe('100vw')
  })

  it('最小化到口袋：視窗隱藏、登記到 useModalManager，從口袋還原', async () => {
    const { minimizedList, restoreModal } = useModalManager()
    const w = await mountModal({ mode: 'window', title: '報表', id: 'win-report' })
    buttonTitled('縮小到口袋').click()
    await nextTick()
    expect(w.emitted('minimize')).toEqual([[true]])
    expect(minimizedList.value.map((m) => m.title)).toContain('報表')
    expect((panel().closest('.fixed') as HTMLElement).style.display).toBe('none')

    restoreModal('win-report')
    await nextTick()
    expect(w.emitted('minimize')!.at(-1)).toEqual([false])
    expect(minimizedList.value.map((m) => m.id)).not.toContain('win-report')
  })

  it('最小化時關閉會從口袋移除', async () => {
    const { minimizedList } = useModalManager()
    const w = await mountModal({ mode: 'window', id: 'win-close' })
    ;(w.vm as unknown as { minimize: () => void }).minimize()
    await nextTick()
    expect(minimizedList.value.map((m) => m.id)).toContain('win-close')

    ;(w.vm as unknown as { close: () => void }).close()
    expect(minimizedList.value.map((m) => m.id)).not.toContain('win-close')
    expect(w.emitted('update:modelValue')).toEqual([[false]])
  })

  it('ref 方法：maximize / restore / open', async () => {
    const w = await mountModal({ mode: 'window', width: 400, height: 300, x: 10, y: 10 })
    const api = w.vm as unknown as { maximize: () => void; restore: () => void; open: () => void }
    api.maximize()
    await nextTick()
    expect(panel().style.width).toBe('100vw')
    api.restore()
    await nextTick()
    expect(panel().style.width).toBe('400px')
    api.open()
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([true])
  })

  it('多個視窗：按到哪個，哪個就移到最上層', async () => {
    await mountModal({ mode: 'window', id: 'win-a', title: 'A' })
    await mountModal({ mode: 'window', id: 'win-b', title: 'B' })
    const [a, b] = Array.from(document.querySelectorAll('[role="dialog"]')) as HTMLElement[]
    const z = (el: HTMLElement) => Number((el.closest('.fixed') as HTMLElement).style.zIndex)
    expect(z(b)).toBeGreaterThan(z(a))

    await mouse(a, 'mousedown', 10, 10)
    await nextTick()
    expect(z(a)).toBeGreaterThan(z(b))
  })

  it('瀏覽器視窗縮小時，把視窗拉回可見範圍', async () => {
    await mountModal({ mode: 'window', width: 400, height: 300, x: 600, y: 400 })
    const original = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 700, configurable: true })
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(panel().style.left).toBe('300px')
    Object.defineProperty(window, 'innerWidth', { value: original, configurable: true })
  })

  /**
   * 回歸：拖曳（或縮放）到一半視窗被關掉（例如程式把 v-model 設成 false、路由切換），
   * 原本只移除 document 的監聽，body 的 cursor: move 與 user-select: none 留著 ——
   * 整頁游標卡在「移動」、文字也選不起來。
   */
  it.each([
    ['拖曳', () => header()],
    ['縮放', () => resizeHandle()],
  ])('%s中卸載：還原 body 的游標與文字選取，不再跟著滑鼠', async (_, handle) => {
    const w = await mountModal({ mode: 'window', width: 400, height: 300, x: 100, y: 100 })
    await mouse(handle(), 'mousedown', 200, 120)
    expect(document.body.style.userSelect).toBe('none')

    w.unmount()
    wrappers.splice(wrappers.indexOf(w), 1)
    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
  })
})
