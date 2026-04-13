/**
 * Common Components Export
 * 通用圖表組件統一導出
 */

// ===== 基礎圖表 =====
export { default as DualAxisComboChart } from './DualAxisComboChart.vue';

// ===== 分面圖表 =====
export { default as FacetedChart } from './FacetedChart.vue';
export { default as GridFacetChart } from './GridFacetChart.vue';

// ===== 通用 Modal =====
export { default as DraggableModal } from './DraggableModal.vue';
export { default as ModalDock } from './ModalDock.vue';

/**
 * 使用指南：
 * 
 * 1. DualAxisComboChart - 單一雙軸組合圖
 *    適用場景：單個數據視圖，支援堆疊柱狀圖、折線圖、散點圖
 * 
 * 2. FacetedChart - 垂直/水平分面圖
 *    適用場景：
 *    - 時間序列對比（多產品線/多地區）
 *    - 管制圖（多機台/產線）
 *    - 共用 X 軸的垂直堆疊佈局
 * 
 * 3. GridFacetChart - 二維網格分面圖
 *    適用場景：
 *    - 雙維度交叉分析（地區 × 產品）
 *    - 矩陣式儀表板
 *    - 對照實驗（處理組 × 時間點）
 */
