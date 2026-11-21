/**
 * 廠區配置圖（ChptFloorPlan）的座標與縮放
 *
 * 平面圖用自己的單位（公尺、格子都可以）：planWidth × planHeight。
 * 畫面座標 = 平面座標 × k + (tx, ty)。
 */

import type { EquipmentItem } from './equipment'

/** 機台在平面圖上的位置（左上角）與大小 */
export interface FloorPlanItem extends EquipmentItem {
  x: number
  y: number
  /** 寬、高；預設 4 × 3 */
  w?: number
  h?: number
}

/** 區域（產線、倉庫、走道…） */
export interface FloorZone {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  /** 底色（任何 CSS 顏色）；不給時是淡灰 */
  color?: string
}

export interface ViewTransform {
  k: number
  tx: number
  ty: number
}

export const DEFAULT_ITEM_SIZE = { w: 4, h: 3 }

/** 整張平面圖剛好放進畫面（四周留 padding px），置中 */
export function fitTransform(planW: number, planH: number, viewW: number, viewH: number, padding = 16): ViewTransform {
  const w = Math.max(1, viewW - padding * 2)
  const h = Math.max(1, viewH - padding * 2)
  const k = Math.max(1e-6, Math.min(w / Math.max(1e-6, planW), h / Math.max(1e-6, planH)))
  return { k, tx: (viewW - planW * k) / 2, ty: (viewH - planH * k) / 2 }
}

/** 以畫面上的 (cx, cy) 為中心縮放 factor 倍；k 限制在 [minK, maxK] */
export function zoomAt(t: ViewTransform, factor: number, cx: number, cy: number, minK: number, maxK: number): ViewTransform {
  const k = Math.min(maxK, Math.max(minK, t.k * factor))
  const f = k / t.k
  return { k, tx: cx - (cx - t.tx) * f, ty: cy - (cy - t.ty) * f }
}

/** 平移後至少留 margin px 的平面圖在畫面裡（不會整張拖出畫面找不回來） */
export function clampPan(t: ViewTransform, planW: number, planH: number, viewW: number, viewH: number, margin = 48): ViewTransform {
  const w = planW * t.k
  const h = planH * t.k
  return {
    k: t.k,
    tx: Math.min(viewW - margin, Math.max(margin - w, t.tx)),
    ty: Math.min(viewH - margin, Math.max(margin - h, t.ty)),
  }
}

/** 平面座標 → 畫面座標 */
export const toScreen = (t: ViewTransform, x: number, y: number) => ({ x: x * t.k + t.tx, y: y * t.k + t.ty })

/** 把某一台移到畫面中央（鍵盤移動到畫面外的機台時用），不改變縮放 */
export function centerOn(t: ViewTransform, item: FloorPlanItem, viewW: number, viewH: number): ViewTransform {
  const w = item.w ?? DEFAULT_ITEM_SIZE.w
  const h = item.h ?? DEFAULT_ITEM_SIZE.h
  const cx = (item.x + w / 2) * t.k
  const cy = (item.y + h / 2) * t.k
  return { k: t.k, tx: viewW / 2 - cx, ty: viewH / 2 - cy }
}

/** 這一台是否（至少有一部分）在畫面裡 */
export function isVisible(t: ViewTransform, item: FloorPlanItem, viewW: number, viewH: number): boolean {
  const a = toScreen(t, item.x, item.y)
  const b = toScreen(t, item.x + (item.w ?? DEFAULT_ITEM_SIZE.w), item.y + (item.h ?? DEFAULT_ITEM_SIZE.h))
  return b.x > 0 && b.y > 0 && a.x < viewW && a.y < viewH
}
