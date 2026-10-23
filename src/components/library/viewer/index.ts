/**
 * library/viewer — 領域檢視器（Gerber / PCB）
 */
export { default as GerberViewer } from './GerberViewer.vue'
export { default as PcbLayout } from './PcbLayout.vue'

// ===== 型別（props 的資料形狀與事件 payload） =====
export type { GerberLayerInput, GerberImageInfo } from './GerberViewer.vue'
export type { PcbBoardInfo, PcbElementEvent } from './PcbLayout.vue'
export type {
  PcbElementType, PcbPadShape, PcbPoint, PcbOutline, PcbRegion, PcbTrace, PcbPad, PcbVia,
  PcbSilk, PcbComponent, PcbElement, PcbLayerInput, PcbBoard, PcbData,
} from './pcb/pcb.types'
