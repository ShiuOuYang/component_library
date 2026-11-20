/**
 * 拖曳座標軸：沿軸方向平移、垂直於軸的方向縮放
 * @internal
 */
import * as d3 from 'd3'
import type { ChartAxisSide, XDomain, YDomain } from '../../types/chart.types'
import { toNumericDomain } from './helpers'
import type { DualAxisContext } from './context'

export function useAxisDrag(ctx: DualAxisContext) {
  const { props, emit, xAxisRef, yAxisLeftRef, yAxisRightRef, xScale, yLeftScale, yRightScale, originalXDomain, originalYLeftDomain, originalYRightDomain, currentXDomain, currentYLeftDomain, currentYRightDomain, resetBtnShow, chartWidth, chartHeight } = ctx

  /**
   * 渲染座標軸拖曳功能（平移）
   * 
   * @description 在 X/Y 軸上添加拖曳事件，允許用戶通過拖曳座標軸來平移視圖範圍。
   *              - X 軸：左右拖曳平移 X 軸範圍
   *              - Y 軸：上下拖曳平移 Y 軸範圍（左右 Y 軸獨立）
   *              拖曳時會顯示對應的游標樣式（ew-resize/ns-resize）。
   * 
   * @returns {void} 無回傳值，直接操作 DOM 元素並更新響應式狀態
   * 
   * @fires axis-drag - 當拖曳座標軸時觸發，傳遞新的 domain
   * 
   * @example
   * // 啟用座標軸拖曳功能
   * <DualAxisComboChart :enable-axis-drag="true" />
   */
  const renderAxisDrag = () => {
    if (!props.enableAxisDrag) return;

    // X 軸拖曳
    if (xAxisRef.value && xScale.value && chartWidth.value > 0) {
      const xAxisGroup = d3.select(xAxisRef.value);
    
      // 創建一個透明覆蓋層來捕獲拖曳事件
      const overlay = xAxisGroup.selectAll('rect.axis-drag-overlay').data([null])
        .join('rect')
        .attr('class', 'axis-drag-overlay')
        .attr('x', 0)
        .attr('y', -10)
        .attr('width', chartWidth.value)
        .attr('height', 40)
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all')
        .style('cursor', 'ew-resize');
    
      // 移除舊的拖曳事件並重新綁定
      overlay.on('.drag', null);
      // 收窄成 SVGRectElement，drag behavior 的 selection 型別才對得上
      (overlay as d3.Selection<SVGRectElement, unknown, SVGGElement, unknown>).call(
        d3.drag<SVGRectElement, unknown>()
        .on('start', function (this: SVGRectElement) {
          d3.select(this).style('cursor', 'grabbing');
        })
        .on('drag', function (this: SVGRectElement, event: d3.D3DragEvent<SVGRectElement, unknown, unknown>) {
          handleXAxisDrag(event.dx, event.dy);
        })
        .on('end', function() {
          d3.select(this).style('cursor', 'ew-resize');
        })
      );
    }

    // 左 Y 軸拖曳
    if (yAxisLeftRef.value && yLeftScale.value && chartHeight.value > 0) {
      const yAxisGroup = d3.select(yAxisLeftRef.value);
    
      const overlay = yAxisGroup.selectAll('rect.axis-drag-overlay').data([null])
        .join('rect')
        .attr('class', 'axis-drag-overlay')
        .attr('x', -40)
        .attr('y', 0)
        .attr('width', 40)
        .attr('height', chartHeight.value)
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all')
        .style('cursor', 'ns-resize');
    
      overlay.on('.drag', null);
      // 收窄成 SVGRectElement，drag behavior 的 selection 型別才對得上
      (overlay as d3.Selection<SVGRectElement, unknown, SVGGElement, unknown>).call(
        d3.drag<SVGRectElement, unknown>()
        .on('start', function (this: SVGRectElement) {
          d3.select(this).style('cursor', 'grabbing');
        })
        .on('drag', function (this: SVGRectElement, event: d3.D3DragEvent<SVGRectElement, unknown, unknown>) {
          handleYAxisDrag(event.dx, event.dy, 'left');
        })
        .on('end', function() {
          d3.select(this).style('cursor', 'ns-resize');
        })
      );
    }

    // 右 Y 軸拖曳
    if (yAxisRightRef.value && yRightScale.value && chartHeight.value > 0) {
      const yAxisGroup = d3.select(yAxisRightRef.value);
    
      const overlay = yAxisGroup.selectAll('rect.axis-drag-overlay').data([null])
        .join('rect')
        .attr('class', 'axis-drag-overlay')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 40)
        .attr('height', chartHeight.value)
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all')
        .style('cursor', 'ns-resize');
    
      overlay.on('.drag', null);
      // 收窄成 SVGRectElement，drag behavior 的 selection 型別才對得上
      (overlay as d3.Selection<SVGRectElement, unknown, SVGGElement, unknown>).call(
        d3.drag<SVGRectElement, unknown>()
        .on('start', function (this: SVGRectElement) {
          d3.select(this).style('cursor', 'grabbing');
        })
        .on('drag', function (this: SVGRectElement, event: d3.D3DragEvent<SVGRectElement, unknown, unknown>) {
          handleYAxisDrag(event.dx, event.dy, 'right');
        })
        .on('end', function() {
          d3.select(this).style('cursor', 'ns-resize');
        })
      );
    }
  };

  /**
   * 處理 X 軸拖曳事件
   * @param {number} dx - X 方向的拖曳距離（像素）
   * @param {number} dy - Y 方向的拖曳距離（像素）
   */
  const handleXAxisDrag = (dx: number, dy: number): void => {
    if (!xScale.value || !originalXDomain.value) return;
  
    // ✅ Band Scale（類別型）預設不支援拖曳
    if (props.xScaleType === 'band') return;
  
    const currentDomain = currentXDomain.value || originalXDomain.value;
    if (currentDomain.length < 2) return;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let newDomain: XDomain;
  
    // ✅ 時間軸需要轉換為數字（時間戳）進行計算
    const isTimeScale = props.xScaleType === 'time';
    const [domainMin, domainMax] = toNumericDomain(currentDomain, isTimeScale);
  
    // 判斷主要拖曳方向（參照 Y 軸邏輯）
    if (absDx > absDy && absDx >= 1) {
      // 水平拖曳 => 平移
      const range = domainMax - domainMin;
      const pixelToValue = range / chartWidth.value;
      const shift = -dx * pixelToValue;
    
      const newMin = domainMin + shift;
      const newMax = domainMax + shift;
    
      // ✅ 時間軸轉回 Date 對象
      newDomain = isTimeScale 
        ? [new Date(newMin), new Date(newMax)]
        : [newMin, newMax];
    } else if (absDy > absDx && absDy >= 1) {
      // 垂直拖曳 => 縮放
      const range = domainMax - domainMin;
      const center = (domainMin + domainMax) / 2;
    
      const zoomFactor = 1 + (dy / chartHeight.value) * 2;
      const newRange = Math.max(range * 0.01, range * zoomFactor);
    
      const newMin = center - newRange / 2;
      const newMax = center + newRange / 2;
    
      // ✅ 時間軸轉回 Date 對象
      newDomain = isTimeScale
        ? [new Date(newMin), new Date(newMax)]
        : [newMin, newMax];
    } else {
      return;
    }

    currentXDomain.value = newDomain;
    resetBtnShow.value = true;
  
    emit('axis-drag', {
      axis: 'x',
      domain: currentXDomain.value
    });
  };

  /**
   * 處理 Y 軸拖曳事件
   * @param {number} dx - X 方向的拖曳距離（像素）
   * @param {number} dy - Y 方向的拖曳距離（像素）
   * @param {string} side - 'left' | 'right' - 哪一側的 Y 軸
   */
  const handleYAxisDrag = (dx: number, dy: number, side: ChartAxisSide): void => {
    const yScale = side === 'left' ? yLeftScale.value : yRightScale.value;
    const originalDomain = side === 'left' ? originalYLeftDomain.value : originalYRightDomain.value;
  
    if (!yScale || !originalDomain) return;

    const currentDomain = (side === 'left' ? currentYLeftDomain.value : currentYRightDomain.value) || originalDomain;
  
    if (currentDomain.length < 2) return;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let newDomain: YDomain;
  
    // 判斷主要拖曳方向
    if (absDy > absDx && absDy >= 1) {
      // 垂直拖曳 => 平移
      const range = currentDomain[1] - currentDomain[0];
      const pixelToValue = range / chartHeight.value;
      const shift = dy * pixelToValue;
    
      const newMin = currentDomain[0] + shift;
      const newMax = currentDomain[1] + shift;
      newDomain = [newMin, newMax];
    } else if (absDx > absDy && absDx >= 1) {
      // 水平拖曳 => 縮放
      const range = currentDomain[1] - currentDomain[0];
      const center = (currentDomain[0] + currentDomain[1]) / 2;
    
      // 向右拖（dx > 0）=> 縮小（放大範圍），向左拖（dx < 0）=> 放大（縮小範圍）
      const zoomFactor = 1 + (dx / chartWidth.value) * 2;
      const newRange = Math.max(range * 0.01, range * zoomFactor);
    
      const newMin = center - newRange / 2;
      const newMax = center + newRange / 2;
      newDomain = [newMin, newMax];
    } else {
      return;
    }
  
    if (side === 'left') {
      currentYLeftDomain.value = [newDomain[0], newDomain[1]];
    } else {
      currentYRightDomain.value = [newDomain[0], newDomain[1]];
    }

    resetBtnShow.value = true;
  
    emit('axis-drag', {
      axis: side === 'left' ? 'yLeft' : 'yRight',
      domain: newDomain
    });
  };

  return { renderAxisDrag }
}
