/**
 * 框選縮放（d3.brush / brushX）、重設縮放，以及 brush overlay 底下元素的滑鼠提示穿透
 * @internal
 */
import * as d3 from 'd3'
import { isBandScale } from '../../types/chart.types'
import type { XDomain, YDomain } from '../../types/chart.types'
import { HOVERABLE_CLASSES, type BoundDatum, type BrushSelectionEvent } from './types'
import type { BrushDeps } from './context'
import type { DualAxisContext } from './context'

export function useBrushZoom(ctx: DualAxisContext, deps: BrushDeps) {
  const { props, emit, brushLayerRef, xScale, yLeftScale, yRightScale, originalXDomain, currentXDomain, currentYLeftDomain, currentYRightDomain, isLocalBrush, resetBtnShow, chartWidth, chartHeight } = ctx
  const { handleLayerHover, handleLayerLeave, hoverLargeAt, clearLargeHover } = deps

  /**
   * 設置 Brush overlay 的 Tooltip 穿透檢測
   * @param {d3.Selection} overlay - Brush overlay 元素
   */
  const setupTooltipDetection = (
    overlay: d3.Selection<SVGRectElement, unknown, null, undefined>
  ): void => {
    let isDragging = false;
  
    overlay
      .on('mousedown.tooltip', () => { isDragging = true; })
      .on('mouseup.tooltip', () => {
        isDragging = false;
        handleLayerLeave();
      })
      .on('mousemove.tooltip', function (this: SVGRectElement, event: MouseEvent) {
        if (isDragging) return;
      
        // 臨時穿透檢測底層元素
        d3.select(this).style('pointer-events', 'none');
        const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
        d3.select(this).style('pointer-events', 'all');
      
        // 檢查是否為圖表元素
        // 原本只認 stacked-bar 與 line-dot —— 散點在 brush 開啟時永遠沒有 tooltip
        if (elementBelow && HOVERABLE_CLASSES.some((cls) => elementBelow.classList.contains(cls))) {
          clearLargeHover(false);
          // ✅ 直接從 DOM 元素讀取已綁定的完整資料
          // 元素上綁的是 renderStackedBars / renderLines 在 .datum() 存進去的物件
          const boundData = d3.select(elementBelow).datum() as BoundDatum | undefined;
          if (boundData?.layer) {
            handleLayerHover(event, boundData.rawData, boundData.layer, boundData.seriesKey, boundData.key);
          }
        } else if (!hoverLargeAt(event)) {
          // 🔧 大量資料模式的點畫在 Canvas 上，elementFromPoint 找不到 —— 改用座標命中測試
          clearLargeHover(false);
          handleLayerLeave();
        }
      })
      .on('mouseleave.tooltip', () => {
        isDragging = false;
        clearLargeHover(false);
        handleLayerLeave();
      });
  };

  /**
   * 處理 Brush 選取完成事件
   * @param {Object} event - D3 brush 事件
   */
  const handleBrushSelection = (event: BrushSelectionEvent): void => {
    if (!event.selection) return;

    const xs = xScale.value;
    if (!xs) return;

    // 解析選取範圍。xy 模式是兩個角，x 模式只有一對 X 座標
    let x0: number, x1: number;
    let y0: number | undefined, y1: number | undefined;
    if (props.brushMode === 'xy') {
      const [[sx0, sy0], [sx1, sy1]] = event.selection as [[number, number], [number, number]];
      x0 = sx0; y0 = sy0; x1 = sx1; y1 = sy1;
    } else {
      const [sx0, sx1] = event.selection as [number, number];
      x0 = sx0; x1 = sx1;
    }

    // 計算 X 軸 domain
    let selectedXDomain: XDomain;
    if (isBandScale(xs)) {
      const allCategories = (originalXDomain.value as string[] | null) ?? xs.domain();
      const bandWidth = xs.bandwidth();
      selectedXDomain = allCategories.filter((d) => {
        // Band Scale 的長條結構：假設 bandWidth 為 50px
        // |----A----|----B----|----C----|
        //    50px      50px      50px
        // 與框選範圍有重疊就算選中（與 useD3Brush 的「必須完整落入」不同：
        // 這裡是圖表本身的框選，行為刻意較寬鬆）
        const bandStart = xs(d);
        if (bandStart === undefined) return false;
        return bandStart + bandWidth > x0 && bandStart < x1;
      });
    } else {
      const continuous = xs as d3.ScaleContinuousNumeric<number, number>;
      selectedXDomain = [continuous.invert(x0), continuous.invert(x1)];
    }

    if (selectedXDomain.length === 0) return;

    // 計算 Y 軸 domain（僅 xy 模式）
    let selectedYLeftDomain: YDomain | null = null;
    let selectedYRightDomain: YDomain | null = null;

    if (props.brushMode === 'xy') {
      if (yLeftScale.value && y0 !== undefined && y1 !== undefined) {
        selectedYLeftDomain = [yLeftScale.value.invert(y1), yLeftScale.value.invert(y0)];
      }
      if (yRightScale.value && y0 !== undefined && y1 !== undefined) {
        selectedYRightDomain = [yRightScale.value.invert(y1), yRightScale.value.invert(y0)];
      }
    }

    // 更新狀態
    isLocalBrush.value = true; // 標記為本地 Brush
    currentXDomain.value = selectedXDomain;
    currentYLeftDomain.value = selectedYLeftDomain;
    currentYRightDomain.value = selectedYRightDomain;
    resetBtnShow.value = true;

    // 發出事件
    emit('selection-change', {
      xDomain: selectedXDomain,
      yLeftDomain: selectedYLeftDomain,
      yRightDomain: selectedYRightDomain,
      mode: props.brushMode
    });

    // 清除選取框：move(selection, null) 會把 brush 的選取框收掉
    if (brushLayerRef.value) {
      const brushBehavior = props.brushMode === 'xy' ? d3.brush() : d3.brushX();
      brushBehavior.move(d3.select(brushLayerRef.value), null);
    }
  };

  /**
   * 渲染 Brush（框選縮放）功能 - 支援雙模式
   * 
   * @description 根據 brushMode 創建不同類型的選取框：
   *              - 'xy' 模式：使用 d3.brush()，可框選 X 和 Y 軸範圍，同時縮放兩軸
   *              - 'x' 模式：使用 d3.brushX()，只框選 X 軸範圍，Y 軸自動調整
   *              支援 Band Scale（離散數據）和連續型 Scale，自動計算選取範圍並更新座標軸 domain。
   *              選取完成後會顯示重置按鈕，並觸發 selection-change 事件。
   * 
   * @returns {void} 無回傳值，直接操作 SVG DOM 元素並更新響應式狀態
   * 
   * @fires selection-change - 當框選完成時觸發，傳遞新的 X、Y 軸 domain
   * 
   * @example
   * // 雙軸模式：框選會同時縮放 X 和 Y 軸
   * <DualAxisComboChart brush-mode="xy" :enable-brush="true" />
   * 
   * // 單軸模式：框選只縮放 X 軸，Y 軸自動調整以顯示選取範圍內的數據細節
   * <DualAxisComboChart brush-mode="x" :enable-brush="true" />
   */
  const renderBrush = () => {
    if (!props.enableBrush || !brushLayerRef.value || !xScale.value) return;

    const brushLayer = d3.select(brushLayerRef.value);
  
    // 🔧 清除舊的 brush（避免重複渲染造成的多個 overlay）
    brushLayer.selectAll('.brush').remove();

    const brush = props.brushMode === 'xy' ? d3.brush() : d3.brushX();
  
    brush
      .extent([[0, 0], [chartWidth.value, chartHeight.value]])
      .on("end", handleBrushSelection);

    brushLayer.call(brush);
    setupTooltipDetection(brushLayer.select('.overlay'));
  };


  /**
   * 重置圖表縮放狀態
   * 
   * @description 將所有座標軸的 domain 恢復到原始狀態，清除 Brush 選取效果。
   *              隱藏重置按鈕並觸發 zoom-reset 事件通知父元件。
   * 
   * @returns {void} 無回傳值，更新響應式狀態並觸發事件
   * 
   * @fires zoom-reset - 當重置縮放時觸發
   * 
   * @example
   * // 點擊「重設縮放」按鈕時調用
   * handleResetZoom();
   */
  const handleResetZoom = () => {
    isLocalBrush.value = false; // 重置標記
    currentXDomain.value = null;
    currentYLeftDomain.value = null;
    currentYRightDomain.value = null;
    resetBtnShow.value = false;
  
    // 🔧 清除 brush selection overlay
    if (brushLayerRef.value) {
      const brushLayer = d3.select(brushLayerRef.value);
      const brush = props.brushMode === 'xy' ? d3.brush() : d3.brushX();
      brushLayer.call(brush.move, null);
    }
  
    emit('zoom-reset');
  };

  return { renderBrush, handleResetZoom }
}
