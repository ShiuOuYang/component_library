/**
 * 行為類型配色
 *
 * 檢視器依「指令行為」上色，而不是依檔案上色：同一個 Gerber 檔裡
 * 填充區域、走線、焊盤要能一眼分辨，這對 EDA 除錯比「每檔一色」有用。
 */
import type { GerberBehavior } from './gerber.types'

export const BEHAVIOR_COLORS: Record<GerberBehavior, string> = {
  region: '#00ff88', // G36/G37 填充區域（絲印字元、銅箔多邊形）
  draw: '#4ecdc4', // D01 線條走線
  flash: '#ffe66d', // D03 焊盤/覆蓋
  drill: '#ff6b6b', // Excellon 鑽孔點
  slot: '#c0a0ff', // Excellon 槽孔 (G85)
  move: '#ff4444', // D02 移動軌跡（EDA 工具路徑分析）
}

export const BEHAVIOR_LABELS: Record<GerberBehavior, string> = {
  region: 'Region (G36/G37)',
  draw: '線條 (D01)',
  flash: '焊盤 (D03)',
  drill: '鑽孔',
  slot: '槽孔 (G85)',
  move: '移動軌跡 (D02)',
}

/** 圖例用的扁平陣列；型別比在樣板裡遍歷物件好處理 */
export const BEHAVIOR_LEGEND: Array<{
  type: GerberBehavior
  color: string
  label: string
}> = (Object.keys(BEHAVIOR_COLORS) as GerberBehavior[]).map((type) => ({
  type,
  color: BEHAVIOR_COLORS[type],
  label: BEHAVIOR_LABELS[type],
}))

/** 多圖層時的預設顏色（tracespace 圖層用，依索引輪替） */
const LAYER_PALETTE = [
  '#00ff88',
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
  '#a8e6cf',
  '#c0a0ff',
  '#ff9f40',
]

export function defaultLayerColor(index: number): string {
  return LAYER_PALETTE[index % LAYER_PALETTE.length]
}
