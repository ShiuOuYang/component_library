/**
 * 滑鼠提示：記錄目前指到的資料、送出 layer-hover / tooltip-show / tooltip-hide
 * @internal
 */
import { ref } from 'vue'
import type { ChartDatum, ChartLayer, TooltipPayload, TooltipPosition } from '../../types/chart.types'
import type { DualAxisContext } from './context'

export function useTooltip(ctx: DualAxisContext) {
  const { emit, containerRef } = ctx

  const tooltipData = ref<TooltipPayload | null>(null);
  const tooltipVisible = ref(false);

  /**
   * 處理圖層元素的滑鼠懸停事件
   * 
   * @description 當用戶將滑鼠懸停在圖表元素（長條、數據點等）上時觸發。
   *              更新 tooltip 的資料和可見性，並發出相關事件供父元件監聽。
   * 
   * @param {MouseEvent} event - 原生滑鼠事件物件，用於計算 tooltip 位置
   * @param {Object} data - 被懸停元素所對應的資料物件
   * @param {Object} layer - 圖層配置物件，包含圖層類型、樣式等資訊
   * @param {string} [seriesKey] - 堆疊圖的系列鍵值（僅堆疊圖使用）
   * 
   * @returns {void} 無回傳值，透過 emit 發出事件
   * 
   * @fires layer-hover - 發出圖層懸停事件，傳遞資料和圖層資訊
   * @fires tooltip-show - 發出顯示 tooltip 事件，傳遞位置和內容資訊
   * 
   * @example
   * // D3 事件監聽器中使用
   * .on('mouseenter', (event, d) => {
   *   handleLayerHover(event, d, layer, 'series1');
   * })
   */
  const handleLayerHover = (
    event: MouseEvent,
    data: ChartDatum,
    layer: ChartLayer,
    seriesKey?: string,
    key?: string
  ): void => {
    const position = buildTooltipPosition(event);
    tooltipData.value = { data, layer, seriesKey, key, position };
    tooltipVisible.value = true;
    // key：這筆資料的鍵（與 highlightKey 同一套），呼叫端可直接拿來做雙向連動
    emit('layer-hover', { data, layer, seriesKey, key });
    emit('tooltip-show', { position, data, layer, seriesKey, key });
  };

  /**
   * 處理圖層元素的滑鼠離開事件
   * 
   * @description 當用戶將滑鼠移出圖表元素時觸發，隱藏 tooltip 並發出事件。
   * 
   * @returns {void} 無回傳值，透過 emit 發出事件
   * 
   * @fires tooltip-hide - 發出隱藏 tooltip 事件
   * 
   * @example
   * // D3 事件監聽器中使用
   * .on('mouseleave', () => {
   *   handleLayerLeave();
   * })
   */
  const handleLayerLeave = (): void => {
    tooltipVisible.value = false;
    emit('tooltip-hide');
  };

  /**
   * 建立 tooltip 的位置資訊物件
   * 
   * @description 根據滑鼠事件計算 tooltip 應該顯示的位置，包含頁面座標和相對於容器的座標。
   *              提供兩種座標系統供 tooltip 元件選擇使用。
   * 
   * @param {MouseEvent} event - 滑鼠事件物件，包含 clientX 和 clientY 屬性
   * 
   * @returns {Object} 位置資訊物件
   * @returns {number} returns.pageX - 相對於整個頁面的 X 座標
   * @returns {number} returns.pageY - 相對於整個頁面的 Y 座標
   * @returns {number|null} returns.containerX - 相對於圖表容器的 X 座標（容器不存在時為 null）
   * @returns {number|null} returns.containerY - 相對於圖表容器的 Y 座標（容器不存在時為 null）
   * 
   * @example
   * const position = buildTooltipPosition(mouseEvent);
   * // { pageX: 450, pageY: 300, containerX: 120, containerY: 80 }
   */
  const buildTooltipPosition = (event: MouseEvent): TooltipPosition => {
    const rect = containerRef.value?.getBoundingClientRect?.();
    return {
      pageX: event.clientX,
      pageY: event.clientY,
      containerX: rect ? event.clientX - rect.left : null,
      containerY: rect ? event.clientY - rect.top : null
    };
  };

  return { tooltipData, tooltipVisible, handleLayerHover, handleLayerLeave, buildTooltipPosition }
}
