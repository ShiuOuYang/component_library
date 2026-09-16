/**
 * Gerber / Excellon 的資料型別
 *
 * 這些型別描述「解析結果」，與畫布、Vue 都無關，因此與解析器一起獨立出來，
 * 讓解析邏輯可以單獨測試（原本整包埋在 GerberViewer.vue 裡，測不到）。
 */

/** 長度單位 */
export type GerberUnits = 'mm' | 'in'

/** 影像極性：dark 畫上、clear 挖掉 */
export type GerberPolarity = 'dark' | 'clear'

/** 插值模式：直線 / 順時針弧 / 逆時針弧 */
export type GerberInterpolation = 'linear' | 'cw' | 'ccw'

/**
 * 指令的行為類型。
 * 檢視器依「行為」上色（而非依檔案上色），因此這個分類同時是配色的鍵。
 */
export type GerberBehavior = 'region' | 'draw' | 'flash' | 'drill' | 'slot' | 'move'

/** 座標格式規格（%FSLAX36Y36*% 的 3 與 6） */
export interface CoordinateFormat {
  int: number
  dec: number
}

/** Aperture（光圈）定義：形狀代碼 + 參數 */
export interface Aperture {
  /** C=圓、R=矩形、O=圓角矩形、P=正多邊形，或巨集名稱 */
  shape: string
  params: number[]
}

/** G36/G37 填充區域的一個頂點；move=true 代表新子輪廓的起點（D02） */
export interface RegionPoint {
  x: number
  y: number
  move: boolean
}

/** G36/G37 填充區域 */
export interface RegionCommand {
  type: 'region'
  points: RegionPoint[]
  polarity: GerberPolarity
}

/** D01：從 fromX/fromY 畫線到 x/y */
export interface DrawCommand {
  type: 'draw'
  fromX: number
  fromY: number
  x: number
  y: number
  /** 弧的圓心偏移量 */
  i: number
  j: number
  aperture: string | null
  interpolation: GerberInterpolation
  polarity: GerberPolarity
}

/** D02：提筆移動（EDA 工具路徑分析用） */
export interface MoveCommand {
  type: 'move'
  fromX: number
  fromY: number
  x: number
  y: number
  polarity: GerberPolarity
}

/** D03：在 x/y 蓋印目前的 aperture */
export interface FlashCommand {
  type: 'flash'
  x: number
  y: number
  aperture: string | null
  polarity: GerberPolarity
}

export type GerberCommand = RegionCommand | DrawCommand | MoveCommand | FlashCommand

/** parseGerber 的結果 */
export interface ParsedGerber {
  apertures: Record<string, Aperture>
  commands: GerberCommand[]
  units: GerberUnits
  formatX: CoordinateFormat
  formatY: CoordinateFormat
  /** 用來與 ParsedExcellon 區分 */
  fileType?: undefined
}

/** Excellon 的鑽頭定義 */
export interface DrillTool {
  diameter: number
}

/** 鑽孔點 */
export interface DrillCommand {
  type: 'drill'
  x: number
  y: number
  tool: string | null
}

/** G85 槽孔：從 (x1,y1) 銑到 (x2,y2) */
export interface SlotCommand {
  type: 'slot'
  x1: number
  y1: number
  x2: number
  y2: number
  tool: string | null
}

export type ExcellonCommand = DrillCommand | SlotCommand

/** parseExcellon 的結果 */
export interface ParsedExcellon {
  tools: Record<string, DrillTool>
  commands: ExcellonCommand[]
  units: GerberUnits
  fileType: 'excellon'
}

/** 兩種解析結果的聯集 */
export type ParsedLayer = ParsedGerber | ParsedExcellon

/** 型別守衛：是否為 Excellon 鑽孔檔的解析結果 */
export function isParsedExcellon(parsed: ParsedLayer): parsed is ParsedExcellon {
  return parsed.fileType === 'excellon'
}
