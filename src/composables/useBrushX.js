// src/composables/useBrushX.js
import * as d3 from 'd3'

/**
 * 建立一個 brushX 行為，回傳控制 API
 *
 * @param {Object} config
 * @param {number} config.width  - brush 可用寬度（內層寬度, 不含 margin）
 * @param {number} config.height - brush 可用高度
 * @param {d3.ScaleTime} config.xScaleForBrush - domain: Date, range: [0, innerWidth]
 * @param {Function} [config.onBrush] - brush 進行中 callback: (event, { pixelRange, dateRange }) => {}
 * @param {Function} [config.onEnd]   - brush 結束 callback: (event, { pixelRange, dateRange }) => {}
 */
export function createBrushX({ width, height, xScaleForBrush, onBrush, onEnd }) {
  const brush = d3.brushX()
    .extent([[0, 0], [width, height]])
    .on('brush', (event) => {
      if (!event.selection) return

      const [x0, x1] = event.selection
      const dateRange = [
        xScaleForBrush.invert(x0),
        xScaleForBrush.invert(x1)
      ]

      if (onBrush) {
        onBrush(event, {
          pixelRange: event.selection,
          dateRange
        })
      }
    })
    .on('end', (event) => {
      if (!onEnd) return

      if (!event.selection) {
        onEnd(event, {
          pixelRange: null,
          dateRange: null
        })
        return
      }

      const [x0, x1] = event.selection
      const dateRange = [
        xScaleForBrush.invert(x0),
        xScaleForBrush.invert(x1)
      ]

      onEnd(event, {
        pixelRange: event.selection,
        dateRange
      })
    })

  function render(selection) {
    selection.call(brush)
  }

  function move(selection, range) {
    selection.call(brush.move, range)
  }

  function clear(selection) {
    selection.call(brush.move, null)
  }

  return {
    brush,
    render,
    move,
    clear,
  }
}
