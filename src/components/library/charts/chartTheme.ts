/**
 * 圖表的「外框」顏色（軸線、格線、文字、tooltip、資料點外圈）
 *
 * 一律指向主題化角色的 CSS 變數，切深色模式時跟著變。
 * ⚠️ 原本寫死 #374151 的字、#e5e7eb 的格線、#fff 的點外圈：深色模式下軸標籤幾乎看不見，
 *    折線上的點外面還有一圈白邊。
 *
 * 注意 D3 要用 .style() 設定這些值，**不能用 .attr()**：
 * SVG 的呈現屬性（fill="…"）不解析 var()，寫了等於沒寫（會變成黑色）。
 *
 * 資料系列的顏色（長條、折線）不在這裡：那是呼叫端傳入的資料色，兩個主題都用同一組。
 */

const role = (name: string) => `rgb(var(--t-${name}))`

export const chartTheme = {
  /** 主要文字（數值標籤、標題） */
  text: role('content-primary'),
  /** 次要文字（軸刻度） */
  textMuted: role('content-secondary'),
  /** 軸線 */
  axis: role('stroke-medium'),
  /** 格線 */
  grid: role('stroke-light'),
  /** 圖表底色：資料點外圈用它，才會跟背景融在一起而不是一圈白邊 */
  surface: role('surface-primary'),
  surfaceMuted: role('surface-secondary'),
  border: role('stroke-default'),
  /** 參考線、門檻（例如柏拉圖的 80% 線） */
  danger: role('danger'),
  warning: role('warning'),
  accent: role('accent'),
} as const

/**
 * 資料色（給元件的預設值；呼叫端仍可自己傳色）
 *
 * categorical 是 8 個依序取用的類別色（tokens.js 的 chart-1～8，兩個主題各自驗過）。
 * 超過 8 類不要循環：把尾巴併成「其他」用 other。
 */
export const chartPalette = {
  categorical: Array.from({ length: 8 }, (_, i) => role(`chart-${i + 1}`)),
  /** 「其他」與被淡化的項目 */
  other: role('stroke-dark'),
  /** 強調模式下沒被強調的項目（同色系的淡色，不是另一個顏色） */
  muted: role('surface-muted'),
  /** 單一系列的預設色（= 類別色第 1 號） */
  primary: role('chart-1'),
  /** 迷你趨勢線這類「背景資訊」用的淡化色 */
  deemphasis: role('content-tertiary'),
  /** 狀態色：只在顏色「代表好壞」時使用，而且要配圖示與文字，不能只靠顏色 */
  good: role('success-solid'),
  warning: role('warning-solid'),
  critical: role('danger-solid'),
} as const
