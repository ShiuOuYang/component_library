import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptScanInput, { type ScanResult } from '@/components/library/ui/ChptScanInput.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import { classifyKeystrokes, isCharacterKey, isEditableTarget, ScanBuffer } from '@/components/library/shared/scanDetector'

describe('scanDetector', () => {
  it('平均間隔夠短 → 掃描槍；太慢 → 手打', () => {
    expect(classifyKeystrokes([0, 10, 20, 30, 40])).toBe('scanner')
    expect(classifyKeystrokes([0, 120, 260, 380])).toBe('manual')
    expect(classifyKeystrokes([0, 30, 60, 90], { maxInterval: 20 })).toBe('manual')
  })

  it('容許一次停頓（前綴碼與內容之間）', () => {
    expect(classifyKeystrokes([0, 8, 16, 300, 308, 316, 324])).toBe('scanner')
    // 停頓兩次就不是掃描槍
    expect(classifyKeystrokes([0, 8, 300, 308, 600, 608])).toBe('manual')
  })

  it('字數太少無法判斷 → 手打', () => {
    expect(classifyKeystrokes([0, 5])).toBe('manual')
    expect(classifyKeystrokes([0, 5], { minLength: 2 })).toBe('scanner')
    expect(classifyKeystrokes([])).toBe('manual')
  })

  it('isCharacterKey：只有一般字元，不含組合鍵', () => {
    expect(isCharacterKey({ key: 'A', ctrlKey: false, metaKey: false, altKey: false })).toBe(true)
    expect(isCharacterKey({ key: 'Shift', ctrlKey: false, metaKey: false, altKey: false })).toBe(false)
    expect(isCharacterKey({ key: 'c', ctrlKey: true, metaKey: false, altKey: false })).toBe(false)
  })

  it('isEditableTarget', () => {
    const make = (html: string) => {
      document.body.innerHTML = html
      return document.body.firstElementChild
    }
    expect(isEditableTarget(make('<input type="text">'))).toBe(true)
    expect(isEditableTarget(make('<input type="checkbox">'))).toBe(false)
    expect(isEditableTarget(make('<textarea></textarea>'))).toBe(true)
    expect(isEditableTarget(make('<button></button>'))).toBe(false)
    const div = make('<div></div>') as HTMLElement
    Object.defineProperty(div, 'isContentEditable', { value: true })
    expect(isEditableTarget(div)).toBe(true)
    expect(isEditableTarget(null)).toBe(false)
  })

  it('ScanBuffer：間隔太久從頭收集', () => {
    const b = new ScanBuffer(500)
    b.push('A', 0)
    b.push('B', 10)
    expect(b.value).toBe('AB')
    b.push('C', 1000)
    expect(b.value).toBe('C')
    expect(b.idleSince(1100)).toBe(100)
    b.clear()
    expect(b.idleSince(0)).toBe(Infinity)
  })
})

describe('ChptScanInput', () => {
  let clock = 0
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    clock = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  function mountScan(props: Record<string, unknown> = {}) {
    wrapper = mount(ChptScanInput, { props, attachTo: document.body })
    return wrapper
  }

  /** 逐字輸入：每個字間隔 interval ms，最後按 Enter */
  async function type(w: VueWrapper, value: string, interval: number, submit = 'Enter') {
    const input = w.find('input')
    for (const ch of value) {
      clock += interval
      await input.trigger('keydown', { key: ch })
      ;(input.element as HTMLInputElement).value += ch
      await input.trigger('input')
    }
    clock += interval
    await input.trigger('keydown', { key: submit })
  }

  const scans = (w: VueWrapper) => (w.emitted('scan') ?? []).map((e) => e[0] as ScanResult)
  const rejects = (w: VueWrapper) => (w.emitted('reject') ?? []).map((e) => e[0] as ScanResult)

  it('掃描槍：Enter 送出、標記 scanner、清空並保持焦點', async () => {
    const w = mountScan()
    await type(w, 'SN-000123', 8)
    expect(scans(w)).toHaveLength(1)
    expect(scans(w)[0]).toMatchObject({ value: 'SN-000123', source: 'scanner', status: 'ok' })
    expect((w.find('input').element as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(w.find('input').element)
    expect(w.text()).toContain('已掃描 SN-000123')
  })

  it('autofocus：掛載時聚焦', () => {
    const w = mountScan()
    expect(document.activeElement).toBe(w.find('input').element)
  })

  it('手打：標記 manual；allowManual=false 時拒絕', async () => {
    const w = mountScan()
    await type(w, 'ABC123', 150)
    expect(scans(w)[0].source).toBe('manual')
    await w.setProps({ allowManual: false })
    await type(w, 'ABC124', 150)
    expect(rejects(w)[0]).toMatchObject({ reason: 'manual', status: 'rejected' })
    expect(w.find('[role="alert"]').text()).toContain('請使用掃描器')
  })

  it('用了刪除鍵就算手打（即使很快）', async () => {
    const w = mountScan({ allowManual: false })
    const input = w.find('input')
    await input.trigger('keydown', { key: 'Backspace' })
    await type(w, 'SN-1', 5)
    expect(rejects(w)[0].reason).toBe('manual')
  })

  it('trim 與 transform', async () => {
    const w = mountScan({ transform: 'upper' })
    await type(w, ' sn-9 ', 5)
    expect(scans(w)[0].value).toBe('SN-9')
    await w.setProps({ transform: (v: string) => v.replace(/^\]C1/, '') })
    await type(w, ']C1ABC', 5)
    expect(scans(w)[1].value).toBe('ABC')
  })

  it('空白輸入不送出', async () => {
    const w = mountScan()
    await type(w, '   ', 5)
    expect(w.emitted('scan')).toBeUndefined()
    expect(w.emitted('reject')).toBeUndefined()
  })

  it('pattern / minLength / validator', async () => {
    const w = mountScan({ pattern: 'WO-\\d{4}', minLength: 4 })
    await type(w, 'WO', 5)
    expect(rejects(w)[0].reason).toBe('tooShort')
    await type(w, 'WO-12', 5)
    expect(rejects(w)[1]).toMatchObject({ reason: 'invalid', message: '格式不符：WO-12' })
    await type(w, 'WO-1234', 5)
    expect(scans(w)[0].value).toBe('WO-1234')

    await w.setProps({ pattern: null, validator: (v: string) => (v.endsWith('X') ? '已報廢的序號' : true) })
    await type(w, 'SN-1X', 5)
    expect(rejects(w)[2].message).toBe('已報廢的序號')
  })

  it("重複：預設 warn（接受但提示）；'reject' 拒絕；'allow' 照常", async () => {
    const w = mountScan()
    await type(w, 'A001', 5)
    await type(w, 'A001', 5)
    expect(scans(w)[1].status).toBe('duplicate')
    expect(w.text()).toContain('A001 已經掃過（仍已加入）')

    await w.setProps({ duplicate: 'reject' })
    await type(w, 'A001', 5)
    expect(rejects(w)[0].reason).toBe('duplicate')

    await w.setProps({ duplicate: 'allow' })
    await type(w, 'A001', 5)
    expect(scans(w)[2].status).toBe('ok')
  })

  it('duplicateWindow：超過時間就不算重複；被拒絕的不列入', async () => {
    const now = vi.spyOn(Date.prototype, 'getTime')
    let wall = 0
    now.mockImplementation(() => wall)
    const w = mountScan({ duplicate: 'reject', duplicateWindow: 60_000, pattern: 'A\\d+' })
    await type(w, 'BAD', 5) // 格式不符，被拒絕
    await type(w, 'A1', 5)
    wall += 30_000
    await type(w, 'A1', 5)
    expect(rejects(w).at(-1)!.reason).toBe('duplicate')
    wall += 61_000
    await type(w, 'A1', 5)
    expect(scans(w)).toHaveLength(2)
  })

  it('submitKeys 包含 Tab：有內容時攔下送出，沒內容時照常移動焦點', async () => {
    const w = mountScan({ submitKeys: ['Enter', 'Tab'] })
    await type(w, 'T-1', 5, 'Tab')
    expect(scans(w)[0].value).toBe('T-1')
    const ev = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    w.find('input').element.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
  })

  it('中文輸入法：送出 ime-detected 並提示切換；組字送出的內容算手打', async () => {
    const w = mountScan({ allowManual: false })
    const input = w.find('input')
    await input.trigger('compositionstart')
    expect(w.emitted('ime-detected')).toHaveLength(1)
    expect(w.text()).toContain('偵測到中文輸入法')
    // 實際順序：組字中字進到輸入框 → compositionend（v-model 此時才同步）→ Enter
    ;(input.element as HTMLInputElement).value = 'SN-1'
    await input.trigger('compositionend')
    await input.trigger('keydown', { key: 'Enter' })
    expect(rejects(w)[0].reason).toBe('manual')
    // 組字中按的 Enter（選字）不送出
    await input.trigger('compositionstart')
    await input.trigger('keydown', { key: 'Enter', isComposing: true })
    expect(rejects(w)).toHaveLength(1)
  })

  it('紀錄：最新在前、上限 maxHistory、清除後重複判斷也重置', async () => {
    const w = mountScan({ showHistory: true, maxHistory: 2, duplicate: 'reject' })
    await type(w, 'A1', 5)
    await type(w, 'A2', 5)
    await type(w, 'A3', 5)
    const items = w.findAll('ol li')
    expect(items.map((li) => li.find('.font-mono').text())).toEqual(['A3', 'A2'])
    expect(w.text()).toContain('掃描紀錄（2）')
    await w.find('ol').element.parentElement!.querySelector('button')!.click()
    await nextTick()
    expect(w.find('ol').exists()).toBe(false)
    await type(w, 'A1', 5)
    expect(rejects(w)).toHaveLength(0)
  })

  it('全頁接收：焦點不在輸入框時收集快速按鍵，Enter 送出；慢速按鍵不算', async () => {
    const w = mountScan({ captureGlobal: true, autofocus: false })
    const press = (key: string) => {
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      document.body.dispatchEvent(ev)
      return ev
    }
    for (const ch of 'G-77') {
      clock += 6
      press(ch)
    }
    clock += 6
    const enter = press('Enter')
    expect(enter.defaultPrevented).toBe(true)
    expect(scans(w)[0]).toMatchObject({ value: 'G-77', source: 'scanner' })

    // 人在頁面上按鍵（慢）：不攔截、不送出
    for (const ch of 'abc') {
      clock += 200
      press(ch)
    }
    expect(press('Enter').defaultPrevented).toBe(false)
    expect(scans(w)).toHaveLength(1)
  })

  it('全頁接收：焦點在別的輸入框時不攔截', async () => {
    const w = mountScan({ captureGlobal: true, autofocus: false })
    const other = document.createElement('input')
    document.body.appendChild(other)
    for (const ch of 'X-1') {
      clock += 5
      other.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }))
    }
    other.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(w.emitted('scan')).toBeUndefined()
  })

  it('captureGlobal 關閉或卸載後移除監聽', async () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const w = mountScan({ captureGlobal: true })
    await w.setProps({ captureGlobal: false })
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function), true)
  })

  it('keepFocus：點到空白處（焦點回到 body）時聚焦回來', async () => {
    vi.useFakeTimers()
    try {
      const w = mountScan({ keepFocus: true })
      const input = w.find('input').element as HTMLInputElement
      input.blur()
      await w.find('input').trigger('blur')
      vi.runAllTimers()
      expect(document.activeElement).toBe(input)
    } finally {
      vi.useRealTimers()
    }
  })

  it('submit()：程式送入（相機掃碼、RFID）走同樣的驗證', async () => {
    const w = mountScan({ pattern: 'P\\d+' })
    const vm = w.vm as unknown as { submit: (v: string) => ScanResult | null }
    expect(vm.submit('P12')!.status).toBe('ok')
    expect(vm.submit('Q1')!.status).toBe('rejected')
    expect(vm.submit('  ')).toBeNull()
  })

  it('sound / vibrate：成功與失敗的回饋不同', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const osc = { frequency: { value: 0 }, connect: vi.fn(() => ({ connect: vi.fn() })), start: vi.fn(), stop: vi.fn() }
    const freqs: number[] = []
    class FakeAudio {
      currentTime = 0
      destination = {}
      createOscillator() {
        const o = { ...osc, frequency: { value: 0 } }
        queueMicrotask(() => freqs.push(o.frequency.value))
        return o
      }
      createGain() {
        return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }
      }
      close() {
        return Promise.resolve()
      }
    }
    vi.stubGlobal('AudioContext', FakeAudio)
    try {
      const w = mountScan({ sound: true, vibrate: true, pattern: 'OK' })
      await type(w, 'OK', 5)
      await type(w, 'NG', 5)
      await Promise.resolve()
      expect(vibrate).toHaveBeenNthCalledWith(1, 40)
      expect(vibrate).toHaveBeenNthCalledWith(2, [120, 80, 120])
      expect(freqs).toEqual([1320, 220, 220])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('hideKeyboard、showSubmit', async () => {
    const w = mountScan({ hideKeyboard: true, showSubmit: true })
    expect(w.find('input').attributes('inputmode')).toBe('none')
    const btn = w.find('button')
    expect(btn.attributes('disabled')).toBeDefined()
    await w.find('input').setValue('M-1')
    await btn.trigger('click')
    expect(scans(w)[0]).toMatchObject({ value: 'M-1' })
  })

  it('語系：enUS', async () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptScanInput, { allowManual: false })) }, { attachTo: document.body })
    expect(wrapper.find('input').attributes('placeholder')).toBe('Scan or type a barcode')
    const input = wrapper.find('input')
    await input.setValue('abc')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('[role="alert"]').text()).toContain('manual entry is not accepted')
  })
})
