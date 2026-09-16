/**
 * 把幾何座標等比置中塞進畫布
 *
 * GerberViewer 與 PcbLayout 都要做同一件事：拿到圖形的外接矩形後，算出
 * 縮放與位移，讓它剛好落在畫布中央（並處理 Y 軸方向相反的問題）。
 * 原本兩邊各寫一份一模一樣的算式，收斂到這裡。
 */

/** 圖形的外接矩形 */
export interface Bounds {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** 把幾何座標系映射到 SVG 像素的參數 */
export interface FitTransform {
  scale: number
  offsetX: number
  offsetY: number
  /** 幾何寬高（原始單位，例如 mm） */
  geoWidth: number
  geoHeight: number
  /** 套用在世界群組上的 transform 字串（含 Y 軸翻轉） */
  transform: string
}

/**
 * 算出「等比置中塞進畫布」的轉換。
 *
 * PCB / Gerber 的 Y 軸向上、SVG 向下，所以 scale 的 y 取負值，
 * 並先平移到底部。寬高為 0（單點圖層）時以 1 代替，
 * 避免 scale 變成 Infinity。
 */
export function fitToViewport(
  bounds: Bounds,
  width: number,
  height: number,
  padding: number
): FitTransform {
  const geoWidth = bounds.x2 - bounds.x1 || 1
  const geoHeight = bounds.y2 - bounds.y1 || 1

  const scale = Math.min(
    (width - padding * 2) / geoWidth,
    (height - padding * 2) / geoHeight
  )
  const offsetX = (width - geoWidth * scale) / 2
  const offsetY = (height - geoHeight * scale) / 2

  return {
    scale,
    offsetX,
    offsetY,
    geoWidth,
    geoHeight,
    transform:
      `translate(${offsetX},${offsetY + geoHeight * scale}) ` +
      `scale(${scale},${-scale}) ` +
      `translate(${-bounds.x1},${-bounds.y1})`,
  }
}
