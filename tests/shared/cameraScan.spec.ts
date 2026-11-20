import { afterEach, describe, expect, it, vi } from 'vitest'
import { beep, cameraAvailability, classifyCameraError, createDeduper, createDetector } from '@/components/library/shared/cameraScan'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.doUnmock('jsqr')
})

describe('cameraAvailability', () => {
  it('非安全來源、沒有 getUserMedia、可以用', () => {
    vi.stubGlobal('isSecureContext', false)
    expect(cameraAvailability()).toBe('insecure')
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { mediaDevices: undefined })
    expect(cameraAvailability()).toBe('unsupported')
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => Promise.resolve() } })
    expect(cameraAvailability()).toBe('ok')
  })
})

describe('classifyCameraError', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['PermissionDeniedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'notFound'],
    ['OverconstrainedError', 'notFound'],
    ['NotReadableError', 'inUse'],
    ['AbortError', 'inUse'],
    ['TypeError', 'unsupported'],
    ['Whatever', 'unknown'],
  ])('%s → %s', (name, kind) => {
    expect(classifyCameraError({ name })).toBe(kind)
  })
  it('沒有 name', () => {
    expect(classifyCameraError(null)).toBe('unknown')
  })
})

describe('createDeduper', () => {
  it('同一個內容在時間內只算一次；一直看到就一直不算（離開超過時間才再算）', () => {
    let now = 0
    const isNew = createDeduper(1000, () => now)
    expect(isNew('A')).toBe(true)
    now = 500
    expect(isNew('A')).toBe(false)
    expect(isNew('B')).toBe(true)
    now = 1400 // 距離上次看到 A 900ms：仍算重複
    expect(isNew('A')).toBe(false)
    now = 2500 // 距離上次看到 A 1100ms：算新的
    expect(isNew('A')).toBe(true)
  })
})

describe('createDetector', () => {
  const frame = (data?: ImageData | null) => ({ source: {} as CanvasImageSource, getImageData: () => data ?? null })

  it('有 BarcodeDetector：用支援的格式交集', async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: 'WO-1', format: 'code_128' }])
    const ctor = vi.fn().mockImplementation(() => ({ detect }))
    Object.assign(ctor, { getSupportedFormats: () => Promise.resolve(['qr_code', 'code_128']) })
    vi.stubGlobal('BarcodeDetector', ctor)
    const d = (await createDetector(['qr_code', 'code_128', 'ean_13']))!
    expect(d.native).toBe(true)
    expect(d.formats).toEqual(['qr_code', 'code_128'])
    expect(ctor).toHaveBeenCalledWith({ formats: ['qr_code', 'code_128'] })
    expect(await d.detect(frame())).toEqual([{ text: 'WO-1', format: 'code_128' }])
  })

  it('BarcodeDetector 不支援想要的格式、或建立時丟錯：退回 jsQR；不要 QR 時為 null', async () => {
    const ctor = vi.fn()
    Object.assign(ctor, { getSupportedFormats: () => Promise.resolve(['aztec']) })
    vi.stubGlobal('BarcodeDetector', ctor)
    expect((await createDetector(['qr_code']))!.native).toBe(false)
    expect(await createDetector(['code_128'])).toBeNull()
    const throwing = vi.fn().mockImplementation(() => {
      throw new Error('unsupported platform')
    })
    vi.stubGlobal('BarcodeDetector', throwing)
    expect((await createDetector(['qr_code']))!.native).toBe(false)
  })

  it('沒有 BarcodeDetector：jsQR 讀影格的像素；沒有影格或讀不到時為空', async () => {
    vi.doMock('jsqr', () => ({ default: vi.fn((_d: Uint8ClampedArray, w: number) => (w === 2 ? { data: 'LOT-7' } : null)) }))
    const d = (await createDetector(['qr_code', 'code_128']))!
    expect(d.native).toBe(false)
    expect(d.formats).toEqual(['qr_code'])
    const img = (w: number) => ({ data: new Uint8ClampedArray(w * 4), width: w, height: 1 }) as ImageData
    expect(await d.detect(frame(img(2)))).toEqual([{ text: 'LOT-7', format: 'qr_code' }])
    expect(await d.detect(frame(img(3)))).toEqual([])
    expect(await d.detect(frame(null))).toEqual([])
  })
})

describe('beep', () => {
  it('用 Web Audio 嗶一聲；沒有 AudioContext 或丟錯時不丟錯', () => {
    const osc = { type: '', frequency: { value: 0 }, connect: vi.fn(() => ({ connect: vi.fn() })), start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) }
    const close = vi.fn()
    vi.stubGlobal(
      'AudioContext',
      vi.fn().mockImplementation(() => ({ currentTime: 0, destination: {}, createOscillator: () => osc, createGain: () => ({ gain: { value: 0 }, connect: vi.fn() }), close }))
    )
    beep()
    expect(osc.start).toHaveBeenCalled()
    osc.onended?.()
    expect(close).toHaveBeenCalled()
    vi.stubGlobal('AudioContext', undefined)
    expect(() => beep()).not.toThrow()
    vi.stubGlobal(
      'AudioContext',
      vi.fn().mockImplementation(() => {
        throw new Error('blocked')
      })
    )
    expect(() => beep()).not.toThrow()
  })
})
