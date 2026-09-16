/**
 * PCB 圖形類型配色
 *
 * 依「圖形類型」上色：板框、走線、焊盤、過孔要能一眼分辨。
 */
import type { PcbElementType } from './pcb.types'

export const TYPE_COLORS: Record<PcbElementType, string> = {
  outline: '#16a34a',
  trace: '#4ecdc4',
  pad: '#ffe66d',
  via: '#ff6b6b',
  region: '#00ff88',
  silk: '#ffffff',
  component: '#c0a0ff',
}

export const TYPE_LABELS: Record<PcbElementType, string> = {
  outline: '板框 (Outline)',
  trace: '走線 (Trace)',
  pad: '焊盤 (Pad)',
  via: '過孔 (Via)',
  region: '銅箔區域 (Region)',
  silk: '絲印 (Silk)',
  component: '元件外框 (Component)',
}

/** 自動分層時的預設顏色（依索引輪替） */
const LAYER_PALETTE = [
  '#4ecdc4',
  '#ffe66d',
  '#ff6b6b',
  '#00ff88',
  '#c0a0ff',
  '#ffffff',
  '#ff9f40',
]

export function defaultLayerColor(index: number): string {
  return LAYER_PALETTE[index % LAYER_PALETTE.length]
}

/** 圖形類型的渲染順序：先鋪底、再疊細節，最後是文字 */
export const RENDER_ORDER: PcbElementType[] = [
  'outline',
  'region',
  'trace',
  'pad',
  'via',
  'component',
  'silk',
]

/** 是否為已知的圖形類型（圖例只列得出名字的） */
export function isKnownType(type: string): type is PcbElementType {
  return type in TYPE_LABELS
}
