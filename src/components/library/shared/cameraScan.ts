/**
 * 相機掃碼（ChptCameraScanner）用的工具：錯誤分類、解碼器、重複掃描過濾
 *
 * 解碼優先用瀏覽器內建的 BarcodeDetector（Chrome / Edge / Android、Safari 17+ 的部分平台：
 * QR 與各種一維條碼都支援，而且在原生程式碼裡跑，很快）；沒有時退回 jsQR（純 JS，只能讀 QR Code）。
 * jsQR 用動態 import 載入：沒用到相機掃碼的頁面不必下載它。
 */

/** 條碼格式（BarcodeDetector 的命名） */
export type ScanFormat =
  | 'qr_code'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'ean_13'
  | 'ean_8'
  | 'upc_a'
  | 'upc_e'
  | 'itf'
  | 'data_matrix'
  | 'pdf417'
  | 'aztec'

export interface DetectedCode {
  text: string
  format: ScanFormat | string
}

/** 相機開不起來的原因 */
export type CameraErrorKind = 'denied' | 'notFound' | 'inUse' | 'insecure' | 'unsupported' | 'unknown'

/** 這個環境能不能用相機（有 getUserMedia，而且是安全的來源：HTTPS 或 localhost） */
export function cameraAvailability(): 'ok' | 'insecure' | 'unsupported' {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported'
  if (window.isSecureContext === false) return 'insecure'
  return typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'ok' : 'unsupported'
}

/** getUserMedia 丟出來的錯誤 → 給使用者看的原因 */
export function classifyCameraError(error: unknown): CameraErrorKind {
  const name = (error as { name?: string } | null)?.name ?? ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'notFound'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'inUse'
    case 'TypeError':
      return 'unsupported'
    default:
      return 'unknown'
  }
}

/** 一個影格：原生解碼器直接讀 video；jsQR 需要像素資料 */
export interface ScanFrame {
  source: CanvasImageSource
  getImageData: () => ImageData | null
}

export interface CodeDetector {
  /** 用的是瀏覽器內建的 BarcodeDetector（false 為 jsQR） */
  native: boolean
  /** 這個解碼器實際能讀的格式 */
  formats: string[]
  detect: (frame: ScanFrame) => Promise<DetectedCode[]>
}

interface NativeBarcodeDetector {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string; format: string }>>
}
interface NativeBarcodeDetectorCtor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector
  getSupportedFormats?: () => Promise<string[]>
}

/**
 * 建立解碼器：有 BarcodeDetector 且支援想要的格式就用它，否則（想要的格式包含 QR 時）退回 jsQR。
 * 兩者都不行時回傳 null。
 */
export async function createDetector(formats: ScanFormat[]): Promise<CodeDetector | null> {
  const Native = (globalThis as { BarcodeDetector?: NativeBarcodeDetectorCtor }).BarcodeDetector
  if (Native) {
    try {
      const supported = (await Native.getSupportedFormats?.()) ?? formats
      const usable = formats.filter((f) => supported.includes(f))
      if (usable.length) {
        const detector = new Native({ formats: usable })
        return {
          native: true,
          formats: usable,
          detect: async (frame) => (await detector.detect(frame.source)).map((c) => ({ text: c.rawValue, format: c.format })),
        }
      }
    } catch {
      // 有些瀏覽器有這個建構式但平台不支援（會丟錯）：退回 jsQR
    }
  }
  if (!formats.includes('qr_code')) return null
  const { default: jsQR } = await import('jsqr')
  return {
    native: false,
    formats: ['qr_code'],
    detect: async (frame) => {
      const img = frame.getImageData()
      if (!img) return []
      const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
      return hit?.data ? [{ text: hit.data, format: 'qr_code' }] : []
    },
  }
}

/**
 * 重複掃描過濾：鏡頭對著同一個碼時每一格都會讀到，同一個內容在 windowMs 內只算一次。
 * 回傳的函式：這次的內容要不要算（true = 新的）。
 */
export function createDeduper(windowMs: number, now: () => number = Date.now): (text: string) => boolean {
  const seen = new Map<string, number>()
  return (text) => {
    const t = now()
    for (const [k, at] of seen) if (t - at > windowMs) seen.delete(k)
    const last = seen.get(text)
    seen.set(text, t)
    return last === undefined || t - last > windowMs
  }
}

/** 掃到時的提示音（短促的嗶一聲）；不支援 Web Audio 時什麼都不做 */
export function beep(): void {
  try {
    const Ctx = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 1800
    gain.gain.value = 0.08
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.08)
    osc.onended = () => void ctx.close()
  } catch {
    /* 沒有聲音不影響掃碼 */
  }
}
