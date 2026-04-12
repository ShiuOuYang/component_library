import { ref, nextTick } from 'vue';
import * as d3 from 'd3';

/**
 * D3 Brush 功能的 Composable
 * @param {Function} emit - Vue defineEmits 返回的 emit 函數
 * @returns {Object} Brush 相關狀態與方法
 */
export function useD3Brush(emit) {
  const resetBtnShow = ref(false);

  /**
   * 創建 Brush 實例
   * @param {Object} dimensions - { width, height, margin }
   * @param {Function} onBrushEnd - Brush 結束時的回調函數
   * @returns {Object} d3 brush 實例
   */
  function createBrushInstance(dimensions, onBrushEnd) {
    const { width, height, margin } = dimensions;
    return d3.brush()
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom]
      ])
      .on("end", onBrushEnd);
  }

  /**
   * 處理 Brush 結束事件通用邏輯
   * @param {Object} event - d3 event
   * @param {Object} scales - { x: xScale, y: yScale }
   * @param {Function} redrawCallback - 重繪圖表的回調函數
   */
  function handleBrushEnd(event, scales, redrawCallback) {
    if (!event.selection) return;

    const [[x0, y0], [x1, y1]] = event.selection;
    const { x: xScale, y: yScale } = scales;

    // 選取 X 軸範圍
    const selectedXDomain = xScale.domain().filter((d) => {
      const bandStart = xScale(d);
      const bandEnd = bandStart + xScale.bandwidth();
      return bandStart >= x0 && bandEnd <= x1;
    });

    if (selectedXDomain.length === 0) return;

    // 顯示 reset 按鈕
    resetBtnShow.value = true;

    // 選取 Y 軸範圍
    const selectedYDomain = [yScale.invert(y1), yScale.invert(y0)];

    // 更新 scale domains
    xScale.domain(selectedXDomain);
    yScale.domain(selectedYDomain);

    // 觸發事件
    if (emit) {
      emit('selection-change', {
        xDomain: selectedXDomain,
        yDomain: selectedYDomain
      });
    }

    redrawCallback();
  }

  /**
   * 重置縮放
   * @param {Function} drawChart - 重繪圖表的函數
   */
  function resetZoom(drawChart) {
    resetBtnShow.value = false;
    nextTick(() => {
      drawChart();
    });
  }

  return {
    resetBtnShow,
    createBrushInstance,
    handleBrushEnd,
    resetZoom
  };
}
