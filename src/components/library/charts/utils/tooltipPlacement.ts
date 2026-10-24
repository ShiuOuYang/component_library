/**
 * 提示框位置：放在游標（或標記）右下；靠近右緣或下緣時翻到另一側。
 * @param x, y 相對容器的座標
 * @param width, height 容器大小
 * @param boxW, boxH 提示框的估計大小（只用來判斷要不要翻邊）
 */
export function tooltipPlacement(
  x: number,
  y: number,
  width: number,
  height: number,
  boxW = 200,
  boxH = 90
): Record<string, string | undefined> {
  const flipX = x > width - boxW
  const flipY = y > height - boxH
  return {
    left: flipX ? undefined : `${x + 12}px`,
    right: flipX ? `${width - x + 12}px` : undefined,
    top: flipY ? undefined : `${y + 12}px`,
    bottom: flipY ? `${height - y + 12}px` : undefined,
  }
}
