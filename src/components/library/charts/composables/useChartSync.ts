import { ref, type Ref } from 'vue'
import type { ChartAxisDomainEvent, ChartSelectionEvent, TooltipPayload, XDomain } from '../types/chart.types'

/**
 * 多張 DualAxisComboChart 同步：縮放、十字線、高亮
 *
 * 同一個時間軸的好幾張圖（溫度、壓力、良率…）上下排在一起時，
 * 在任一張縮放（框選、滾輪、拖曳軸），其他張跟著縮到同一段；滑鼠移到任一張，
 * 每一張都在同一個 X 畫十字線；滑到某個點，其他張的同一筆資料（同一個 key）一起標出來。
 *
 * ```vue
 * const sync = useChartSync({ zoom: true, crosshair: true, highlight: true })
 *
 * <DualAxisComboChart v-bind="sync.bind()" :layers="tempLayers" x-scale-type="time" />
 * <DualAxisComboChart v-bind="sync.bind()" :layers="pressureLayers" x-scale-type="time" />
 * ```
 *
 * bind() 回傳要套到圖表上的 props 與事件（xDomain、crosshair、crosshairValue、highlightKey 與對應的監聽）。
 * 在模板裡呼叫，才會跟著同步狀態更新。你自己另外綁的同名事件照樣會觸發（Vue 會合併監聽）。
 *
 * 整組的「重設縮放」：各圖自己的重設鈕會收起來，請放一個按鈕呼叫 sync.reset()（sync.xDomain.value 不是 null 時顯示）。
 *
 * ⚠️ 上下對齊：每張圖的左右 margin 要一樣，X 軸才會對齊（Y 軸刻度寬度不同時特別明顯）。
 */

export interface ChartSyncOptions {
  /** 同步 X 軸縮放（框選、滾輪、拖曳 X 軸、重設） */
  zoom?: boolean
  /** 同步十字線 */
  crosshair?: boolean
  /** 同步高亮：滑到一個點時，其他圖標出同一個 key 的資料 */
  highlight?: boolean
  /** 一開始的 X 範圍（null 為全覽） */
  xDomain?: XDomain | null
}

export type CrosshairValue = number | string | Date

export interface ChartSync {
  /** 目前同步的 X 範圍（null 為全覽）；可以自己改，例如外部的時間區間選擇器 */
  xDomain: Ref<XDomain | null>
  /** 目前十字線的 X 值 */
  crosshairValue: Ref<CrosshairValue | null>
  /** 目前高亮的資料鍵 */
  highlightKey: Ref<string | null>
  /** 要套到每張圖上的 props 與事件：v-bind="sync.bind()" */
  bind: () => Record<string, unknown>
  /** 回到全覽並清掉十字線與高亮 */
  reset: () => void
}

export function useChartSync(options: ChartSyncOptions = {}): ChartSync {
  const { zoom = true, crosshair = true, highlight = false } = options
  const xDomain = ref<XDomain | null>(options.xDomain ?? null) as Ref<XDomain | null>
  const crosshairValue = ref<CrosshairValue | null>(null) as Ref<CrosshairValue | null>
  const highlightKey = ref<string | null>(null)

  // 監聽函式只建一次：每次 render 都回傳同一個函式，子元件不會因為監聽換了而多做事
  const onSelectionChange = (e: ChartSelectionEvent) => {
    if (e.xDomain) xDomain.value = e.xDomain
  }
  const onWheelZoom = (e: ChartAxisDomainEvent) => {
    if (e.axis === 'x') xDomain.value = (e.domain as XDomain | null) ?? null
  }
  const onAxisDrag = (e: ChartAxisDomainEvent) => {
    if (e.axis === 'x' && e.domain) xDomain.value = e.domain as XDomain
  }
  const onZoomReset = () => {
    xDomain.value = null
  }
  const onCrosshairMove = (v: CrosshairValue | null) => {
    crosshairValue.value = v
  }
  const onTooltipShow = (p: TooltipPayload) => {
    highlightKey.value = p.key ?? null
  }
  const onTooltipHide = () => {
    highlightKey.value = null
  }

  function bind(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    // 各圖自己的「重設縮放」鈕只會清自己的狀態，同步後其他圖仍停在縮放範圍 —— 收起來，改用一個整組的重設（sync.reset()）
    if (zoom) Object.assign(out, { xDomain: xDomain.value, showResetButton: false, onSelectionChange, onWheelZoom, onAxisDrag, onZoomReset })
    if (crosshair) Object.assign(out, { crosshair: true, crosshairValue: crosshairValue.value, onCrosshairMove })
    if (highlight) Object.assign(out, { highlightKey: highlightKey.value, onTooltipShow, onTooltipHide })
    return out
  }

  function reset(): void {
    xDomain.value = null
    crosshairValue.value = null
    highlightKey.value = null
  }

  return { xDomain, crosshairValue, highlightKey, bind, reset }
}
