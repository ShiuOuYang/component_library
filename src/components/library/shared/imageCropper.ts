/**
 * 圖片裁切（ChptImageCropper）的幾何計算。
 *
 * 座標一律是「旋轉 / 翻轉後的圖片」的像素座標（使用者看到的方向）：
 * 旋轉 90° 時寬高對調，裁切框跟著內容一起轉，不會跑到別的地方。
 */

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

/** 八個把手：邊（n s e w）與角（ne nw se sw） */
export type CropHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export const CROP_HANDLES: CropHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/** 旋轉角度（只支援 90° 的倍數） */
export type CropRotation = 0 | 90 | 180 | 270

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** 旋轉後的圖片大小 */
export function rotatedSize(natural: Size, rotation: CropRotation): Size {
  return rotation === 90 || rotation === 270 ? { width: natural.height, height: natural.width } : { ...natural }
}

export function normalizeRotation(deg: number): CropRotation {
  return ((((Math.round(deg / 90) * 90) % 360) + 360) % 360) as CropRotation
}

/** 置中的初始裁切框：佔圖片 coverage 比例，有比例時取放得下的最大框 */
export function initialRect(bounds: Size, aspect: number | null = null, coverage = 0.8): CropRect {
  let width = bounds.width * coverage
  let height = bounds.height * coverage
  if (aspect && aspect > 0) {
    if (width / height > aspect) width = height * aspect
    else height = width / aspect
  }
  return { x: (bounds.width - width) / 2, y: (bounds.height - height) / 2, width, height }
}

/** 把框推回圖片內（太大時縮到圖片大小） */
export function clampRect(r: CropRect, bounds: Size): CropRect {
  const width = clamp(r.width, 0, bounds.width)
  const height = clamp(r.height, 0, bounds.height)
  return { x: clamp(r.x, 0, bounds.width - width), y: clamp(r.y, 0, bounds.height - height), width, height }
}

/** 移動（不超出圖片） */
export function moveRect(r: CropRect, dx: number, dy: number, bounds: Size): CropRect {
  return clampRect({ ...r, x: r.x + dx, y: r.y + dy }, bounds)
}

export interface ResizeOptions {
  bounds: Size
  /** 寬 ÷ 高；null 為自由 */
  aspect?: number | null
  /** 最小邊長（圖片像素） */
  min?: number
}

/**
 * 拖曳把手調整大小：對邊（或對角）固定不動；只拉邊時另一個方向以中心對稱。
 * 有比例時保持比例，角把手依變化比較大的方向決定大小。結果不超出圖片、不小於 min。
 */
export function resizeRect(r: CropRect, handle: CropHandle, dx: number, dy: number, o: ResizeOptions): CropRect {
  const B = o.bounds
  const min = Math.max(0, o.min ?? 1)
  const aspect = o.aspect && o.aspect > 0 ? o.aspect : null
  const sx = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0
  const sy = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0
  // 固定點
  const ax = sx === 1 ? r.x : sx === -1 ? r.x + r.width : r.x + r.width / 2
  const ay = sy === 1 ? r.y : sy === -1 ? r.y + r.height : r.y + r.height / 2
  // 從固定點往拖曳方向最多能多大
  const maxW = sx === 1 ? B.width - ax : sx === -1 ? ax : 2 * Math.min(ax, B.width - ax)
  const maxH = sy === 1 ? B.height - ay : sy === -1 ? ay : 2 * Math.min(ay, B.height - ay)
  let w = sx ? r.width + sx * dx : r.width
  let h = sy ? r.height + sy * dy : r.height
  if (aspect) {
    if (sx && sy) {
      // 角：跟著相對變化比較大的那一邊
      const rw = r.width > 0 ? w / r.width : Math.abs(w)
      const rh = r.height > 0 ? h / r.height : Math.abs(h) * aspect
      if (rw >= rh) h = w / aspect
      else w = h * aspect
    } else if (sx) h = w / aspect
    else w = h * aspect
    const minW = Math.max(min, min * aspect)
    const capW = Math.min(maxW, maxH * aspect)
    w = Math.max(Math.min(minW, capW), Math.min(w, capW))
    h = w / aspect
  } else {
    w = Math.max(Math.min(min, maxW), Math.min(w, maxW))
    h = Math.max(Math.min(min, maxH), Math.min(h, maxH))
  }
  const x = sx === 1 ? ax : sx === -1 ? ax - w : ax - w / 2
  const y = sy === 1 ? ay : sy === -1 ? ay - h : ay - h / 2
  return clampRect({ x, y, width: w, height: h }, B)
}

/** 從 a 拖到 b 畫一個新框（有比例時保持比例） */
export function rectFromDrag(a: { x: number; y: number }, b: { x: number; y: number }, o: ResizeOptions): CropRect {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const handle = `${dy < 0 ? 'n' : 's'}${dx < 0 ? 'w' : 'e'}` as CropHandle
  return resizeRect({ x: a.x, y: a.y, width: 0, height: 0 }, handle, dx, dy, { ...o, min: o.min ?? 1 })
}

/** 改比例：保持中心與大致面積，放不下時縮小 */
export function applyAspect(r: CropRect, aspect: number | null, bounds: Size): CropRect {
  if (!aspect || aspect <= 0) return r
  const cx = r.x + r.width / 2
  const cy = r.y + r.height / 2
  const area = Math.max(1, r.width * r.height)
  let w = Math.sqrt(area * aspect)
  let h = w / aspect
  const capW = Math.min(bounds.width, bounds.height * aspect)
  if (w > capW) {
    w = capW
    h = w / aspect
  }
  return clampRect({ x: cx - w / 2, y: cy - h / 2, width: w, height: h }, bounds)
}

/** 以中心縮放框（鍵盤 + / −） */
export function scaleRect(r: CropRect, factor: number, o: ResizeOptions): CropRect {
  const aspect = o.aspect && o.aspect > 0 ? o.aspect : r.width / Math.max(1e-9, r.height)
  const min = o.min ?? 1
  let w = Math.max(min, r.width * factor)
  let h = w / aspect
  const capW = Math.min(o.bounds.width, o.bounds.height * aspect)
  if (w > capW) {
    w = capW
    h = w / aspect
  }
  return clampRect({ x: r.x + (r.width - w) / 2, y: r.y + (r.height - h) / 2, width: w, height: h }, o.bounds)
}

/** 圖片轉 90°（dir 1 = 順時針）後，框跟著內容移到新位置；bounds 是轉之前的大小 */
export function rotateRect(r: CropRect, bounds: Size, dir: 1 | -1): CropRect {
  return dir === 1
    ? { x: bounds.height - r.y - r.height, y: r.x, width: r.height, height: r.width }
    : { x: r.y, y: bounds.width - r.x - r.width, width: r.height, height: r.width }
}

/** 水平（x）或垂直（y）翻轉後的框 */
export function flipRect(r: CropRect, bounds: Size, axis: 'x' | 'y'): CropRect {
  return axis === 'x' ? { ...r, x: bounds.width - r.x - r.width } : { ...r, y: bounds.height - r.y - r.height }
}

export interface OutputSizeOptions {
  width?: number
  height?: number
  maxWidth?: number
  maxHeight?: number
}

/** 輸出尺寸：給寬或高時依框的比例算另一邊；max 只縮小不放大 */
export function outputSize(r: CropRect, o: OutputSizeOptions = {}): Size {
  const ratio = r.width / Math.max(1e-9, r.height)
  let w = r.width
  let h = r.height
  if (o.width && o.height) {
    w = o.width
    h = o.height
  } else if (o.width) {
    w = o.width
    h = w / ratio
  } else if (o.height) {
    h = o.height
    w = h * ratio
  }
  if (o.maxWidth && w > o.maxWidth) {
    h *= o.maxWidth / w
    w = o.maxWidth
  }
  if (o.maxHeight && h > o.maxHeight) {
    w *= o.maxHeight / h
    h = o.maxHeight
  }
  return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) }
}

/** 取整數像素（輸出、v-model 用） */
export const roundRect = (r: CropRect): CropRect => ({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) })

export function isValidRect(r: unknown, bounds: Size): r is CropRect {
  if (!r || typeof r !== 'object') return false
  const o = r as CropRect
  return [o.x, o.y, o.width, o.height].every(Number.isFinite) && o.width > 0 && o.height > 0 && o.x >= 0 && o.y >= 0 && o.x + o.width <= bounds.width + 0.5 && o.y + o.height <= bounds.height + 0.5
}

// ---- 視圖（縮放與平移） ----

export interface CropView {
  /** 縮放：圖片 1px = k 個畫面 px */
  k: number
  /** 圖片左上角在畫面上的位置 */
  x: number
  y: number
}

/** 讓整張圖放進舞台（留 padding）並置中 */
export function fitView(stage: Size, image: Size, padding = 16): CropView {
  const k = Math.max(1e-6, Math.min((stage.width - padding * 2) / Math.max(1, image.width), (stage.height - padding * 2) / Math.max(1, image.height)))
  return { k, x: (stage.width - image.width * k) / 2, y: (stage.height - image.height * k) / 2 }
}

/** 以畫面上某一點為中心縮放；k 限制在 [minK, maxK] */
export function zoomView(v: CropView, factor: number, px: number, py: number, minK: number, maxK: number): CropView {
  const k = clamp(v.k * factor, minK, maxK)
  const s = k / v.k
  return { k, x: px - (px - v.x) * s, y: py - (py - v.y) * s }
}
