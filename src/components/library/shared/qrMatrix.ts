/**
 * QR Code 模組矩陣（ChptQRCode 與標籤設計器共用；原本兩邊各一份）。
 */
import qrcode from 'qrcode-generator'

export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H'

/** UTF-8 位元組轉成「每個字元一個位元組」的字串，交給 qrcode-generator 的 Byte 模式（中文才不會變亂碼） */
function toBinaryString(text: string): string {
  let out = ''
  for (const byte of new TextEncoder().encode(text)) out += String.fromCharCode(byte)
  return out
}

/** 深色模組為 true 的方陣；空字串或超過 40 版的容量（約 2.9KB）回傳 null */
export function qrMatrix(value: string, level: QrErrorLevel = 'M'): boolean[][] | null {
  if (!value) return null
  try {
    const qr = qrcode(0, level)
    qr.addData(toBinaryString(value), 'Byte')
    qr.make()
    const n = qr.getModuleCount()
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)))
  } catch {
    return null
  }
}
