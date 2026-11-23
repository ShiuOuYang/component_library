/**
 * 影像比對（ChptImageCompare）的縮放 / 平移計算
 *
 * 兩張影像共用同一個 view（k 倍、平移 tx / ty，單位是畫面 px），所以三種模式切換、
 * 並排的兩邊都會停在同一個位置 —— 放大看某個焊點時，兩張看到的永遠是同一塊。
 */

export interface ImageView {
  k: number
  tx: number
  ty: number
}

export type CompareMode = 'slider' | 'side' | 'overlay'

/** 整張影像剛好放進畫面（contain）、置中 */
export function fitImage(iw: number, ih: number, vw: number, vh: number): ImageView {
  const k = Math.max(1e-6, Math.min(vw / Math.max(1, iw), vh / Math.max(1, ih)))
  return { k, tx: (vw - iw * k) / 2, ty: (vh - ih * k) / 2 }
}

/**
 * 限制平移：影像比畫面小的方向置中；比畫面大的方向不能拖出空白
 * （放大看細節時邊緣不會露出底色，比對時不會不小心把影像拖走）
 */
export function clampImageView(v: ImageView, iw: number, ih: number, vw: number, vh: number): ImageView {
  const w = iw * v.k
  const h = ih * v.k
  return {
    k: v.k,
    tx: w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, v.tx)),
    ty: h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, v.ty)),
  }
}

/** 以畫面上的 (cx, cy) 為中心縮放到 k（限制在 [minK, maxK]） */
export function zoomImageTo(v: ImageView, k: number, cx: number, cy: number, minK: number, maxK: number): ImageView {
  const next = Math.min(maxK, Math.max(minK, k))
  const f = next / v.k
  return { k: next, tx: cx - (cx - v.tx) * f, ty: cy - (cy - v.ty) * f }
}

/**
 * 使用者的縮放以「相對於整張的倍數 rel + 畫面中心對到的影像座標 (cx, cy)」記錄，
 * 畫面大小改變（視窗縮放、切到並排時每邊只有一半寬）時看的仍是同一點、同樣的相對倍數
 */
export interface ImageZoom {
  rel: number
  cx: number
  cy: number
}

/** ImageZoom → 這個畫面大小的 view（已限制平移） */
export function viewOf(z: ImageZoom | null, iw: number, ih: number, vw: number, vh: number): ImageView {
  const fit = fitImage(iw, ih, vw, vh)
  if (!z) return fit
  const k = fit.k * z.rel
  return clampImageView({ k, tx: vw / 2 - z.cx * k, ty: vh / 2 - z.cy * k }, iw, ih, vw, vh)
}

/** view → ImageZoom（記住畫面中心對到的影像座標） */
export function zoomOf(v: ImageView, iw: number, ih: number, vw: number, vh: number): ImageZoom {
  return { rel: v.k / fitImage(iw, ih, vw, vh).k, cx: (vw / 2 - v.tx) / v.k, cy: (vh / 2 - v.ty) / v.k }
}

export const clampPercent = (n: number): number => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50)

/** 指標在寬度 width 的框內 x 位置 → 分隔線百分比 */
export const percentAt = (x: number, width: number): number => clampPercent((x / Math.max(1, width)) * 100)
