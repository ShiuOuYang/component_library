import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import jsQR from 'jsqr'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import ChptInputTag from '@/components/library/ui/ChptInputTag.vue'
import ChptList from '@/components/library/ui/ChptList.vue'
import ChptQRCode from '@/components/library/ui/ChptQRCode.vue'
import ChptSpace from '@/components/library/ui/ChptSpace.vue'
import ChptTour from '@/components/library/ui/ChptTour.vue'
import ChptInput from '@/components/library/ui/ChptInput.vue'
import ChptButton from '@/components/library/ui/ChptButton.vue'
import ChptTable from '@/components/library/ui/ChptTable.vue'
import ChptEmpty from '@/components/library/ui/ChptEmpty.vue'
import ChptPaginationForTest from '@/components/library/ui/ChptPagination.vue'
import { enUS } from '@/components/library/shared/config'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})
function track<T extends VueWrapper>(w: T): T {
  wrapper = w
  return w
}

// ---------------------------------------------------------------------------
describe('ChptConfigProvider', () => {
  it('沒有 Provider 時行為不變：Input 預設 sm、Button 預設 md、繁中文字', () => {
    const w = track(mount(({
      render: () => h('div', [h(ChptInput, { modelValue: '' }), h(ChptButton, { label: 'OK' }), h(ChptEmpty)]),
    })))
    expect(w.find('input').classes()).toContain('text-sm')
    expect(w.text()).toContain('暫無資料')
  })

  it('size 套到沒傳 size 的表單元件與按鈕；元件自己的 size 優先', () => {
    const w = track(mount(({
      render: () =>
        h(ChptConfigProvider, { size: 'lg' }, () => [
          h(ChptInput, { modelValue: '', class: 'a' }),
          h(ChptInput, { modelValue: '', size: 'xs', class: 'b' }),
        ]),
    })))
    const inputs = w.findAll('input')
    expect(inputs[0].classes()).toContain('text-lg')
    expect(inputs[1].classes()).toContain('text-xs')
  })

  it('locale：Table / Empty 的內建文字改成英文，並帶 lang 屬性', () => {
    const w = track(mount(({
      render: () =>
        h(ChptConfigProvider, { locale: enUS }, () => [
          h(ChptTable, { columns: [{ key: 'a', title: 'A' }], data: [] }),
          h(ChptEmpty),
        ]),
    })))
    expect(w.find('[lang="en-US"]').exists()).toBe(true)
    expect(w.text()).toContain('No data')
    expect(w.find('input[type="text"]').attributes('placeholder')).toBe('Search…')
    // 表格裡的分頁也一起換
    expect(w.text()).toContain('per page')
    expect(w.find('nav').attributes('aria-label')).toBe('Pagination')
    expect(w.find('button[aria-label="Next page"]').exists()).toBe(true)
  })

  it('巢狀：內層只覆寫它有給的欄位', () => {
    const w = track(mount(({
      render: () =>
        h(ChptConfigProvider, { size: 'lg', locale: enUS }, () =>
          h(ChptConfigProvider, { locale: { empty: '空的' } }, () => [h(ChptEmpty), h(ChptInput, { modelValue: '' })])
        ),
    })))
    expect(w.text()).toContain('空的')
    expect(w.find('input').classes()).toContain('text-lg')
  })

  it('元件自己傳的文字 prop 優先於 locale', () => {
    const w = track(mount(({
      render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptEmpty, { title: '沒有工單' })),
    })))
    expect(w.text()).toContain('沒有工單')
  })
})

// ---------------------------------------------------------------------------
describe('ChptInputTag', () => {
  function mountTag(props: Record<string, unknown> = {}) {
    const model = ref<string[]>((props.modelValue as string[]) ?? [])
    const w = track(mount(ChptInputTag, {
      props: { ...props, modelValue: model.value, 'onUpdate:modelValue': (v: string[]) => { model.value = v; w.setProps({ modelValue: v }) } },
      attachTo: document.body,
    }))
    return { w, model }
  }

  it('Enter 或逗號加入；前後空白去掉', async () => {
    const { w, model } = mountTag()
    const input = w.find('input')
    await input.setValue(' SN-001 ')
    await input.trigger('keydown', { key: 'Enter' })
    await input.setValue('SN-002')
    await input.trigger('keydown', { key: ',' })
    expect(model.value).toEqual(['SN-001', 'SN-002'])
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(w.findAll('li').map((l) => l.text().replace('close', '').trim())).toEqual(['SN-001', 'SN-002'])
  })

  it('中文輸入法選字時的 Enter 不送出', async () => {
    const { w, model } = mountTag()
    const input = w.find('input')
    await input.setValue('測試')
    input.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true }))
    await nextTick()
    expect(model.value).toEqual([])
  })

  it('貼上多個值一次拆開；重複與超過上限的不加入並報讀原因', async () => {
    const { w, model } = mountTag({ modelValue: ['A'], max: 3 })
    const input = w.find('input')
    const data = { getData: () => 'A, B; C\nD' }
    const ev = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
    Object.defineProperty(ev, 'clipboardData', { value: data })
    input.element.dispatchEvent(ev)
    await nextTick()
    expect(model.value).toEqual(['A', 'B', 'C'])
    const live = w.find('[aria-live="polite"]').text()
    expect(live).toContain('已加入 B、C')
    expect(live).toContain('A：已經有了')
    expect(live).toContain('D：最多 3 個')
    expect(w.emitted('reject')).toHaveLength(2)
    // 上限到了：輸入框唯讀
    expect(input.attributes('readonly')).toBeDefined()
  })

  it('validate 回傳字串時拒絕', async () => {
    const { w, model } = mountTag({ validate: (v: string) => (/^SN-\d+$/.test(v) ? true : '格式不對') })
    const input = w.find('input')
    await input.setValue('abc')
    await input.trigger('keydown', { key: 'Enter' })
    await input.setValue('SN-9')
    await input.trigger('keydown', { key: 'Enter' })
    expect(model.value).toEqual(['SN-9'])
    expect(w.emitted('reject')![0]).toEqual(['abc', '格式不對'])
  })

  it('Backspace：第一次標記最後一個、第二次才刪', async () => {
    const { w, model } = mountTag({ modelValue: ['A', 'B'] })
    const input = w.find('input')
    await input.trigger('keydown', { key: 'Backspace' })
    expect(model.value).toEqual(['A', 'B'])
    expect(w.findAll('li')[1].classes()).toContain('ring-2')
    await input.trigger('keydown', { key: 'Backspace' })
    expect(model.value).toEqual(['A'])
    expect(w.emitted('remove')![0]).toEqual(['B'])
  })

  it('移除鈕有名稱；失焦時加入打到一半的值', async () => {
    const { w, model } = mountTag({ modelValue: ['A'] })
    const btn = w.find('li button')
    expect(btn.attributes('aria-label')).toBe('移除 A')
    await btn.trigger('click')
    expect(model.value).toEqual([])
    await w.find('input').setValue('C')
    await w.find('input').trigger('blur')
    expect(model.value).toEqual(['C'])
  })

  it('disabled 時沒有移除鈕；label 綁定輸入框', () => {
    const { w } = mountTag({ modelValue: ['A'], disabled: true, label: '序號' })
    expect(w.find('li button').exists()).toBe(false)
    expect(w.find('label').attributes('for')).toBe(w.find('input').attributes('id'))
  })
})

// ---------------------------------------------------------------------------
describe('ChptQRCode', () => {
  /** 把元件算出來的模組矩陣畫成 RGBA，交給 jsQR 解碼（驗證「掃得出來」而且內容正確） */
  function decode(w: VueWrapper): string | null {
    const matrix = (w.vm as unknown as { matrix: boolean[][] | null }).matrix
    if (!matrix) return null
    const scale = 4
    const margin = 4
    const n = matrix.length + margin * 2
    const px = n * scale
    const data = new Uint8ClampedArray(px * px * 4).fill(255)
    matrix.forEach((row, r) =>
      row.forEach((dark, c) => {
        if (!dark) return
        for (let y = 0; y < scale; y++)
          for (let x = 0; x < scale; x++) {
            const i = (((r + margin) * scale + y) * px + (c + margin) * scale + x) * 4
            data[i] = data[i + 1] = data[i + 2] = 0
          }
      })
    )
    return jsQR(data, px, px)?.data ?? null
  }

  it('掃出來的內容與 value 相同', () => {
    const w = track(mount(ChptQRCode, { props: { value: 'https://example.com/wo/2609-101' } }))
    expect(decode(w)).toBe('https://example.com/wo/2609-101')
  })

  /** 回歸：qrcode-generator 預設只取字元的低 8 位元，中文會掃出亂碼 */
  it('中文內容以 UTF-8 編碼，掃出來是原文', () => {
    const w = track(mount(ChptQRCode, { props: { value: '工單 WO-2609-101 回焊爐' } }))
    expect(decode(w)).toBe('工單 WO-2609-101 回焊爐')
  })

  it('SVG role=img，名稱預設帶內容；title 可覆寫', async () => {
    const w = track(mount(ChptQRCode, { props: { value: 'ABC' } }))
    expect(w.find('svg').attributes('role')).toBe('img')
    expect(w.find('svg').attributes('aria-label')).toBe('QR Code：ABC')
    await w.setProps({ title: '登入連結' })
    expect(w.find('svg').attributes('aria-label')).toBe('登入連結')
  })

  it('有 icon 時用 H 容錯（模組數變多），中央墊底色', () => {
    const plain = track(mount(ChptQRCode, { props: { value: 'HELLO WORLD 123', level: 'L' } }))
    const plainCount = (plain.vm as unknown as { matrix: boolean[][] }).matrix.length
    plain.unmount()
    const withIcon = track(mount(ChptQRCode, { props: { value: 'HELLO WORLD 123', level: 'L', icon: '/logo.png' } }))
    expect((withIcon.vm as unknown as { matrix: boolean[][] }).matrix.length).toBeGreaterThan(plainCount)
    expect(withIcon.find('image').attributes('href')).toBe('/logo.png')
  })

  it('內容太長顯示錯誤而不是丟例外', () => {
    const w = track(mount(ChptQRCode, { props: { value: 'x'.repeat(5000) } }))
    expect(w.find('svg').exists()).toBe(false)
    expect(w.find('[role="alert"]').text()).toContain('太長')
  })

  it('loading：顯示產生中', () => {
    const w = track(mount(ChptQRCode, { props: { value: 'A', status: 'loading' } }))
    expect(w.find('[role="status"]').text()).toBe('產生中')
  })

  it('toDataURL / download：用 canvas 畫出 PNG（顏色與留白照 props）', () => {
    const rects: [number, number, number, number][] = []
    const ctx = { fillStyle: '', fillRect: (...a: [number, number, number, number]) => rects.push(a) }
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,xx')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const w = track(mount(ChptQRCode, { props: { value: 'ABC', margin: 2 } }))
    const api = w.vm as unknown as { toDataURL: (s?: number) => string | null; download: (f?: string) => boolean; matrix: boolean[][] }
    expect(api.toDataURL(4)).toBe('data:image/png;base64,xx')
    // 第一筆是整張底色，其餘是深色模組；第一個模組在留白之後
    const n = api.matrix.length + 4
    expect(rects[0]).toEqual([0, 0, n * 4, n * 4])
    expect(rects[1][0]).toBeGreaterThanOrEqual(2 * 4)
    expect(api.download('label.png')).toBe(true)
    expect(click).toHaveBeenCalled()
    getContext.mockRestore()
    toDataURL.mockRestore()
    click.mockRestore()
  })

  it('沒有 canvas 時 toDataURL 回傳 null；沒有內容時不畫', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const w = track(mount(ChptQRCode, { props: { value: 'A' } }))
    const api = w.vm as unknown as { toDataURL: () => string | null; download: () => boolean }
    expect(api.toDataURL()).toBeNull()
    expect(api.download()).toBe(false)
    getContext.mockRestore()
    wrapper!.unmount()
    const empty = track(mount(ChptQRCode, { props: { value: '' } }))
    expect(empty.find('[role="alert"]').text()).toBe('沒有內容')
  })

  it('expired：顯示遮罩與重新產生', async () => {
    const w = track(mount(ChptQRCode, { props: { value: 'A', status: 'expired' } }))
    expect(w.text()).toContain('QR Code 已過期')
    await w.find('button').trigger('click')
    expect(w.emitted('refresh')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
describe('ChptSpace', () => {
  it('子項目之間有 gap；尺寸對應間距', () => {
    const w = track(mount(ChptSpace, { props: { size: 'md' }, slots: { default: () => [h('span', 'a'), h('span', 'b')] } }))
    const el = w.element as HTMLElement
    expect(el.style.gap).toBe('1rem 1rem')
    expect(el.style.flexDirection).toBe('row')
    expect(el.style.alignItems).toBe('center')
  })

  it('split：項目之間插分隔（v-if 關掉的與空白不算）', () => {
    const show = false
    const w = track(mount(ChptSpace, {
      slots: {
        default: () => [h('a', '編輯'), show ? h('a', '隱藏') : null, ' ', h('a', '複製'), h('a', '刪除')],
        split: () => '|',
      },
    }))
    expect(w.findAll('.chpt-space-split')).toHaveLength(2)
    expect(w.text().replace(/\s/g, '')).toBe('編輯|複製|刪除')
    expect(w.find('.chpt-space-split').attributes('aria-hidden')).toBe('true')
  })

  it('vertical、wrap、數字與 [水平, 垂直] 尺寸、block', () => {
    const w = track(mount(ChptSpace, { props: { direction: 'vertical', size: 12, block: true }, slots: { default: () => [h('i'), h('i')] } }))
    const el = w.element as HTMLElement
    expect(el.style.flexDirection).toBe('column')
    expect(el.style.gap).toBe('12px 12px')
    expect(el.classList.contains('flex')).toBe(true)
    wrapper!.unmount()
    const w2 = track(mount(ChptSpace, { props: { wrap: true, size: ['sm', 'lg'] }, slots: { default: () => [h('i')] } }))
    expect((w2.element as HTMLElement).style.flexWrap).toBe('wrap')
    expect((w2.element as HTMLElement).style.gap).toBe('1.5rem 0.5rem')
  })
})

// ---------------------------------------------------------------------------
describe('ChptList', () => {
  const items = [
    { id: 1, title: 'SMT-01 換線完成', description: '08:30 由王小明確認', extra: '5 分鐘前' },
    { id: 2, title: 'AOI 誤判率上升', description: '超過 2% 門檻' },
  ]

  it('預設版面：標題、說明、右側補充；role=list', () => {
    const w = track(mount(ChptList, { props: { items, header: '最近活動' } }))
    expect(w.find('ul').attributes('role')).toBe('list')
    expect(w.findAll('li')).toHaveLength(2)
    expect(w.text()).toContain('最近活動')
    expect(w.findAll('li')[0].text()).toContain('5 分鐘前')
  })

  it('預設插槽自訂每一筆', () => {
    const w = track(mount(ChptList, { props: { items }, slots: { default: '<template #default="{ item, index }"><b>{{ index }}:{{ item.title }}</b></template>' } }))
    expect(w.find('li b').text()).toBe('0:SMT-01 換線完成')
  })

  it('沒資料 → 空狀態；載入中且沒資料 → 骨架（role=status）', async () => {
    const w = track(mount(ChptList, { props: { items: [] } }))
    expect(w.text()).toContain('暫無資料')
    await w.setProps({ loading: true })
    expect(w.find('[role="status"]').attributes('aria-label')).toBe('載入中')
    expect(w.attributes('aria-busy')).toBe('true')
  })

  it('hasMore：載入更多按鈕；已有資料時載入中不會把清單清掉', async () => {
    const w = track(mount(ChptList, { props: { items, hasMore: true } }))
    await w.find('button').trigger('click')
    expect(w.emitted('load-more')).toHaveLength(1)
    await w.setProps({ loading: true })
    expect(w.findAll('li')).toHaveLength(2)
    expect(w.text()).toContain('載入中')
  })

  it('infinite：哨兵進入畫面時送出 load-more（載入中不重複送）', async () => {
    let callback: ((entries: { isIntersecting: boolean }[]) => void) | null = null
    const observe = vi.fn()
    const original = window.IntersectionObserver
    window.IntersectionObserver = class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) { callback = cb }
      observe = observe
      disconnect() {}
    } as unknown as typeof IntersectionObserver
    const w = track(mount(ChptList, { props: { items, hasMore: true, infinite: true } }))
    await nextTick()
    expect(observe).toHaveBeenCalled()
    callback!([{ isIntersecting: true }])
    expect(w.emitted('load-more')).toHaveLength(1)
    window.IntersectionObserver = original
  })

  it('grid：格狀排列', () => {
    const w = track(mount(ChptList, { props: { items, grid: 240 } }))
    expect((w.find('ul').element as HTMLElement).style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(240px, 1fr))')
  })
})

// ---------------------------------------------------------------------------
describe('ChptTour', () => {
  const steps = [
    { target: '#t1', title: '篩選', description: '先選產線' },
    { target: '#t2', title: '匯出', description: '下載 Excel' },
    { title: '完成', description: '沒有目標的步驟置中' },
  ]

  function mountTour(props: Record<string, unknown> = {}) {
    document.body.innerHTML = '<button id="opener">開始</button><div id="t1">A</div><div id="t2">B</div>'
    ;(document.getElementById('opener') as HTMLElement).focus()
    return track(mount(ChptTour, { props: { steps, open: true, ...props }, attachTo: document.body }))
  }
  const dialog = () => document.querySelector('[role="dialog"]') as HTMLElement | null

  it('開啟：role=dialog、aria-modal、以標題命名，焦點在主要按鈕', async () => {
    mountTour()
    await nextTick()
    await nextTick()
    const d = dialog()!
    expect(d.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(d.getAttribute('aria-labelledby')!)!.textContent).toBe('篩選')
    expect(document.activeElement?.textContent?.trim()).toBe('下一步')
    expect(d.textContent).toContain('1 / 3')
  })

  it('下一步 / 上一步 / → ←；最後一步按完成送出 finish', async () => {
    const w = mountTour()
    await nextTick()
    ;(document.activeElement as HTMLElement).click()
    await nextTick()
    expect(w.emitted('update:current')!.at(-1)).toEqual([1])
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()
    expect(dialog()!.textContent).toContain('3 / 3')
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await nextTick()
    expect(dialog()!.textContent).toContain('2 / 3')
    await w.setProps({ current: 2 })
    const finish = [...dialog()!.querySelectorAll('button')].find((b) => b.textContent?.trim() === '完成')!
    finish.click()
    expect(w.emitted('finish')).toHaveLength(1)
    expect(w.emitted('close')!.at(-1)).toEqual(['finish'])
    expect(w.emitted('update:open')!.at(-1)).toEqual([false])
  })

  it('Esc 關閉；關閉後焦點回到開啟前的元素', async () => {
    const w = mountTour()
    await nextTick()
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(w.emitted('close')!.at(-1)).toEqual(['skip'])
    await w.setProps({ open: false })
    expect(document.activeElement?.id).toBe('opener')
  })

  it('Tab 鎖在面板內', async () => {
    mountTour({ current: 1 })
    await nextTick()
    const buttons = [...dialog()!.querySelectorAll('button')]
    const last = buttons[buttons.length - 1]
    last.focus()
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(buttons[0])
  })

  it('找不到目標時置中、不挖洞', async () => {
    mountTour({ current: 2 })
    await nextTick()
    expect(document.querySelector('.chpt-tour-hole')).toBeNull()
    expect(document.querySelector('.chpt-tour-backdrop')).not.toBeNull()
    expect(dialog()!.style.transform).toContain('translate(-50%, -50%)')
  })

  it('有目標時挖洞並把目標捲進畫面', async () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    mountTour()
    await nextTick()
    await nextTick()
    expect(scroll).toHaveBeenCalled()
    expect(document.querySelector('.chpt-tour-hole')).not.toBeNull()
  })
})

describe('內建語系', () => {
  it.each([
    ['zhTW', 'zh-TW'],
    ['enUS', 'en-US'],
  ] as const)('%s 每個欄位都有值、函式欄位回傳帶數字的字串', async (name, code) => {
    const mod = await import('@/components/library/shared/config')
    const locale = mod[name]
    expect(locale.code).toBe(code)
    expect(locale.selectedCount(3)).toContain('3')
    const p = locale.pagination
    for (const key of ['nav', 'prev', 'next', 'first', 'last', 'current', 'perPageBefore', 'perPageAfter', 'perPageLabel'] as const) {
      expect(p[key]).toBeTruthy()
    }
    expect(p.page(7)).toContain('7')
    expect(p.pageSizeOption(20)).toContain('20')
    expect(p.total(120)).toContain('120')
    expect(p.range(11, 20, 120)).toMatch(/11.*20.*120/)
  })

  it('完整分頁（full）也吃語系', () => {
    const w = track(mount(({
      render: () =>
        h(ChptConfigProvider, { locale: enUS }, () =>
          h(ChptPaginationForTest, { variant: 'full', currentPage: 2, itemsPerPage: 10, totalItems: 95, showSummary: true, showPageSize: true })
        ),
    })))
    expect(w.text()).toContain('Showing 11–20 of 95')
    expect(w.text()).toContain('10 / page')
    expect(w.find('button[aria-label="Page 3"]').exists()).toBe(true)
  })
})
