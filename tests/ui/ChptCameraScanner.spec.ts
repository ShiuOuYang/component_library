import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChptCameraScanner from '@/components/library/ui/ChptCameraScanner.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

/**
 * jsdom 沒有相機：假的 getUserMedia（回傳有 stop 的 track）與 BarcodeDetector（每次 detect 回傳 queue 裡的下一筆）。
 * video 的 readyState 固定為 4、play() 直接成功。
 */
let wrapper: VueWrapper | null = null
let detections: Array<Array<{ rawValue: string; format: string }>> = []
let trackStop: ReturnType<typeof vi.fn>
let getUserMedia: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers()
  detections = []
  trackStop = vi.fn()
  getUserMedia = vi.fn().mockImplementation(() =>
    Promise.resolve({ getTracks: () => [{ stop: trackStop }], getVideoTracks: () => [{ getSettings: () => ({ deviceId: 'cam-back' }) }] })
  )
  vi.stubGlobal('isSecureContext', true)
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia,
      enumerateDevices: () =>
        Promise.resolve([
          { kind: 'videoinput', deviceId: 'cam-back' },
          { kind: 'videoinput', deviceId: 'cam-front' },
          { kind: 'audioinput', deviceId: 'mic' },
        ]),
    },
  })
  const ctor = vi.fn().mockImplementation(() => ({ detect: () => Promise.resolve(detections.shift() ?? []) }))
  Object.assign(ctor, { getSupportedFormats: () => Promise.resolve(['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8']) })
  vi.stubGlobal('BarcodeDetector', ctor)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { configurable: true, get: () => 4 })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function mountScanner(props: Record<string, unknown> = {}) {
  const active = ref(props.active ?? true)
  wrapper = mount(
    {
      render: () =>
        h(ChptCameraScanner, {
          ...props,
          active: active.value,
          'onUpdate:active': (v: boolean) => (active.value = v),
          feedback: 'none',
          interval: 100,
        }),
    },
    { attachTo: document.body }
  )
  await flushPromises()
  return { w: wrapper, active, comp: () => wrapper!.findComponent(ChptCameraScanner) }
}

async function tick(ms = 100) {
  await vi.advanceTimersByTimeAsync(ms)
  await flushPromises()
}

describe('ChptCameraScanner', () => {
  it('開相機（後鏡頭）、送出 ready；有兩顆鏡頭時顯示切換鈕', async () => {
    const { w, comp } = await mountScanner()
    expect(getUserMedia).toHaveBeenCalledWith({ audio: false, video: { facingMode: { ideal: 'environment' } } })
    expect(comp().emitted('ready')![0][0]).toEqual({ native: true, formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8'] })
    expect(w.find('button[aria-label="切換鏡頭"]').exists()).toBe(true)
    expect(w.text()).toContain('把條碼或 QR Code 對準框內')
  })

  it('掃到時送出 scan、顯示內容並念出；同一個碼不重複', async () => {
    const { w, comp } = await mountScanner()
    detections.push([{ rawValue: 'WO-1', format: 'code_128' }], [{ rawValue: 'WO-1', format: 'code_128' }], [{ rawValue: 'WO-2', format: 'qr_code' }])
    await tick()
    await tick()
    await tick()
    expect(comp().emitted('scan')!.map((e) => (e[0] as { text: string }).text)).toEqual(['WO-1', 'WO-2'])
    expect(w.find('[aria-live="assertive"]').text()).toBe('已掃到 WO-2')
    expect(w.text()).toContain('WO-2')
  })

  it('continuous=false：掃到一次就關相機並送出 update:active false', async () => {
    const { active, comp } = await mountScanner({ continuous: false })
    detections.push([{ rawValue: 'BIN-3', format: 'qr_code' }])
    await tick()
    expect(comp().emitted('scan')).toHaveLength(1)
    expect(active.value).toBe(false)
    expect(trackStop).toHaveBeenCalled()
  })

  it('active 切換：關閉時停止 track；重開；畫面上的按鈕會同步 v-model:active', async () => {
    const { w, active } = await mountScanner({ active: false })
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(w.text()).toContain('相機已關閉')
    await w.findAll('button').find((b) => b.text() === '開啟相機')!.trigger('click')
    await flushPromises()
    expect(active.value).toBe(true)
    expect(getUserMedia).toHaveBeenCalledTimes(1) // 父層把 true 傳回來時不再開第二次
    await w.findAll('button').find((b) => b.text() === '關閉相機')!.trigger('click')
    expect(active.value).toBe(false)
    expect(trackStop).toHaveBeenCalled()
    active.value = true
    await flushPromises()
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('切換鏡頭：改用另一顆的 deviceId', async () => {
    const { w } = await mountScanner()
    await w.find('button[aria-label="切換鏡頭"]').trigger('click')
    await flushPromises()
    expect(getUserMedia).toHaveBeenLastCalledWith({ audio: false, video: { deviceId: { exact: 'cam-front' } } })
  })

  it('權限被拒：顯示說明與重試，送出 error', async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    const { w, comp } = await mountScanner()
    expect(comp().emitted('error')![0][0]).toBe('denied')
    expect(w.find('[role="alert"]').text()).toContain('沒有相機權限')
    await w.findAll('button').find((b) => b.text() === '重試')!.trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it('不是 HTTPS：不嘗試開相機，沒有重試鈕', async () => {
    vi.stubGlobal('isSecureContext', false)
    const { w } = await mountScanner()
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(w.find('[role="alert"]').text()).toContain('HTTPS')
    expect(w.findAll('button').some((b) => b.text() === '重試')).toBe(false)
  })

  it('沒有 BarcodeDetector：退回 jsQR，提示只能讀 QR；只要一維條碼時不支援', async () => {
    vi.stubGlobal('BarcodeDetector', undefined)
    const { w } = await mountScanner()
    await vi.waitFor(() => expect(w.text()).toContain('只能讀 QR Code')) // jsQR 是動態載入
    wrapper!.unmount()
    const r = await mountScanner({ formats: ['code_128'] })
    expect(r.w.find('[role="alert"]').text()).toContain('不支援')
  })

  it('載入解碼器時就被關掉：不再開相機', async () => {
    let resolveFormats!: (f: string[]) => void
    const ctor = vi.fn().mockImplementation(() => ({ detect: () => Promise.resolve([]) }))
    Object.assign(ctor, { getSupportedFormats: () => new Promise<string[]>((r) => (resolveFormats = r)) })
    vi.stubGlobal('BarcodeDetector', ctor)
    const { comp } = await mountScanner()
    ;(comp().vm as unknown as { stop: () => void }).stop()
    resolveFormats(['qr_code'])
    await flushPromises()
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('分頁切到背景時關相機、回來再開', async () => {
    await mountScanner()
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(trackStop).toHaveBeenCalled()
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('還在等權限時就關掉：回來的串流立刻停掉', async () => {
    let resolve!: (s: unknown) => void
    getUserMedia.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    const { comp } = await mountScanner()
    ;(comp().vm as unknown as { stop: () => void }).stop()
    const lateStop = vi.fn()
    resolve({ getTracks: () => [{ stop: lateStop }], getVideoTracks: () => [] })
    await flushPromises()
    expect(lateStop).toHaveBeenCalled()
  })

  it('卸載時停止 track', async () => {
    await mountScanner()
    wrapper!.unmount()
    wrapper = null
    expect(trackStop).toHaveBeenCalled()
    await nextTick()
  })

  it('語系：enUS', async () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptCameraScanner, { active: false })) }, { attachTo: document.body })
    await flushPromises()
    expect(wrapper.text()).toContain('Camera is off')
    expect(wrapper.find('[role="region"]').attributes('aria-label')).toBe('Camera scanner')
  })
})
