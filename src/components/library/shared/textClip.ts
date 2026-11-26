/**
 * 依可用寬度截斷文字（不量字型，給 SVG 標籤用）。
 *
 * 窄字元（拉丁字母、數字）算 1 個單位、其他（中日韓全形字）算 2 個單位，一個單位約 `unit` px；
 * 超出預算時保留放得下的前綴並補「…」。原本各圖表各寫一份一模一樣的迴圈（BumpChart、DumbbellChart、
 * RidgelineChart、HorizonChart、UpSetChart、SankeyChart、MultiVariChart、MarimekkoChart、GageRRChart、魚骨圖）。
 */
export interface ClipTextOptions {
  /** 一個單位的寬度（px），預設 6.5（12px 字的英數平均寬） */
  unit?: number
  /** 預算下限（單位），預設 2：再窄也至少留一個中文字或兩個英數 */
  min?: number
  /** 字碼小於等於此值算窄字元，預設 0xff（Latin-1）；魚骨圖用 0x24f（含擴充拉丁） */
  narrowMax?: number
}

export function clipText(text: string, px: number, options: ClipTextOptions = {}): string {
  const { unit = 6.5, min = 2, narrowMax = 0xff } = options
  const budget = Math.max(min, Math.floor(px / unit))
  let used = 0
  let out = ''
  for (const ch of text) {
    used += ch.charCodeAt(0) <= narrowMax ? 1 : 2
    if (used > budget) return `${out}…`
    out += ch
  }
  return out
}
