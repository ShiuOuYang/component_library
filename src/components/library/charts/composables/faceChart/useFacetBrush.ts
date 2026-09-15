import { ref, type Ref } from 'vue'
import type { XDomain, YDomain } from '@/components/library/charts/types/chart.types'

/** 分面之間的同步模式 */
export type FacetSyncMode =
  /** 全部分面共用同一組 domain */
  | 'all'
  /** 同一列共用 Y 軸 */
  | 'row'
  /** 同一欄共用 X 軸 */
  | 'col'
  /** 同列共用 Y、同欄共用 X */
  | 'both'
  /** 各分面獨立 */
  | 'none'

/** 某一列的 Y domain（左右軸各自一組） */
export interface RowYDomain {
  yLeft?: YDomain
  yRight?: YDomain
}

/** 分面 brush 事件的 payload */
export interface FacetBrushEvent {
  xDomain?: XDomain
  yLeftDomain?: YDomain
  yRightDomain?: YDomain
}

/** 座標軸拖曳事件 */
export interface FacetAxisDragEvent {
  axis: 'x' | 'yLeft' | 'yRight'
  domain?: XDomain | YDomain
}

/** 分面圖表對外發出的事件 */
export type FacetBrushEmit = (
  event: 'selection-change' | 'axis-drag' | 'zoom-reset',
  payload?: unknown
) => void

/**
 * Facet 圖表 Brush 同步邏輯
 * 支援多種同步模式：全部同步、按列同步、按欄同步、完全獨立
 */
export function useFacetBrush() {
  // ===== 全域 Domain（用於 'all' 模式） =====
  const currentXDomain = ref<XDomain | null>(null) as Ref<XDomain | null>
  const currentYLeftDomain = ref<YDomain | null>(null) as Ref<YDomain | null>
  const currentYRightDomain = ref<YDomain | null>(null) as Ref<YDomain | null>

  // ===== 分組 Domain（用於 'row' 和 'col' 模式） =====
  const rowYDomains = ref<Record<number, RowYDomain>>({})
  const colXDomains = ref<Record<number, XDomain>>({})

  // ===== Reset Trigger（用於通知子圖表清除 brush selection） =====
  const resetTrigger = ref(0)

  /**
   * 處理選取範圍變化
   * @param {Object} event - 選取事件 { xDomain, yLeftDomain, yRightDomain }
   * @param {String} facetId - 分面 ID
   * @param {String} syncMode - 同步模式 'all' | 'row' | 'col' | 'none'
   * @param {Number} row - 當前圖表的列索引
   * @param {Number} col - 當前圖表的欄索引
   * @param {Function} emit - Vue emit 函數
   */
  const handleSelectionChange = (
    event: FacetBrushEvent,
    facetId: string,
    syncMode: FacetSyncMode,
    row: number,
    col: number,
    emit: FacetBrushEmit
  ): void => {

    if (syncMode === 'all') {
      // ✅ 模式 1：全部同步
      if (event.xDomain) currentXDomain.value = event.xDomain;
      if (event.yLeftDomain) currentYLeftDomain.value = event.yLeftDomain;
      if (event.yRightDomain) currentYRightDomain.value = event.yRightDomain;
    } else if (syncMode === 'row') {
      // ✅ 模式 2：同列共享 Y 軸
      if (event.yLeftDomain || event.yRightDomain) {
        // 🔧 不可變更新：創建新物件觸發 Vue 響應式
        const newRowData = { ...(rowYDomains.value[row] || {}) };
        if (event.yLeftDomain) newRowData.yLeft = event.yLeftDomain;
        if (event.yRightDomain) newRowData.yRight = event.yRightDomain;
        
        rowYDomains.value = {
          ...rowYDomains.value,
          [row]: newRowData
        };
      }
    } else if (syncMode === 'col') {
      // ✅ 模式 3：同欄共享 X 軸
      if (event.xDomain) {
        // 🔧 不可變更新：創建新物件觸發 Vue 響應式
        colXDomains.value = {
          ...colXDomains.value,
          [col]: event.xDomain
        };
      }
    } else if (syncMode === 'both') {
      // ✅ 模式 4：同列共享 Y 軸 + 同欄共享 X 軸（最智慧模式）
      if (event.xDomain) {
        // 🔧 不可變更新：創建新物件觸發 Vue 響應式
        colXDomains.value = {
          ...colXDomains.value,
          [col]: event.xDomain
        };
      }
      if (event.yLeftDomain || event.yRightDomain) {
        // 🔧 不可變更新：創建新物件觸發 Vue 響應式
        const newRowData = { ...(rowYDomains.value[row] || {}) };
        if (event.yLeftDomain) newRowData.yLeft = event.yLeftDomain;
        if (event.yRightDomain) newRowData.yRight = event.yRightDomain;
        
        rowYDomains.value = {
          ...rowYDomains.value,
          [row]: newRowData
        };
      }
    }
    
    
    emit('selection-change', { ...event, facetId, row, col });
  };

  /**
   * 處理座標軸拖曳
   * @param {Object} event - 拖曳事件 { axis, domain }
   * @param {String} facetId - 分面 ID
   * @param {String} syncMode - 同步模式
   * @param {Number} row - 當前圖表的列索引
   * @param {Number} col - 當前圖表的欄索引
   * @param {Function} emit - Vue emit 函數
   */
  const handleAxisDrag = (
    event: FacetAxisDragEvent,
    facetId: string,
    syncMode: FacetSyncMode,
    row: number,
    col: number,
    emit: FacetBrushEmit
  ): void => {
    if (!event.domain) {
      emit('axis-drag', { ...event, facetId, row, col })
      return
    }

    if (syncMode === 'all') {
      if (event.axis === 'x') {
        currentXDomain.value = event.domain as XDomain
      }
    } else {
      /**
       * 🔧 原本寫成
       *      else if (syncMode === 'col' || syncMode === 'both') { …處理 x… }
       *      else if (syncMode === 'row' || syncMode === 'both') { …處理 y… }
       *    第二個 'both' 永遠不可達（已被前一個分支攔截），所以 both 模式下
       *    拖曳 Y 軸完全沒有作用 —— 由 TypeScript 的 TS2367 抓到。
       *    both 的語意是「同欄共用 X + 同列共用 Y」，兩者都要處理。
       */
      const syncsX = syncMode === 'col' || syncMode === 'both'
      const syncsY = syncMode === 'row' || syncMode === 'both'

      if (syncsX && event.axis === 'x') {
        colXDomains.value[col] = event.domain as XDomain
      }

      if (syncsY && (event.axis === 'yLeft' || event.axis === 'yRight')) {
        if (!rowYDomains.value[row]) {
          rowYDomains.value[row] = {}
        }
        if (event.axis === 'yLeft') {
          rowYDomains.value[row].yLeft = event.domain as YDomain
        } else {
          rowYDomains.value[row].yRight = event.domain as YDomain
        }
      }
    }

    emit('axis-drag', { ...event, facetId, row, col })
  };

  /**
   * 重置縮放
   * @param {Function} emit - Vue emit 函數
   */
  const handleResetZoom = (emit?: FacetBrushEmit): void => {
    
    // 清空所有 domain
    currentXDomain.value = null;
    currentYLeftDomain.value = null;
    currentYRightDomain.value = null;
    rowYDomains.value = {};
    colXDomains.value = {};
    
    // 🔧 觸發 resetTrigger 通知所有子圖表清除 brush selection
    resetTrigger.value++;
    
    
    if (emit) {
      emit('zoom-reset');
    }
  };

  /**
   * 獲取指定位置的 X Domain
   * @param {String} syncMode - 同步模式
   * @param {Number} col - 欄索引
   * @param {*} fallback - 預設值
   */
  const getXDomain = (
    syncMode: FacetSyncMode,
    col: number,
    fallback?: XDomain
  ): XDomain | undefined => {
    let result: XDomain | null | undefined
    if (syncMode === 'all') {
      result = currentXDomain.value
    } else if (syncMode === 'col' || syncMode === 'both') {
      result = colXDomains.value[col];
    } else {
      result = fallback;
    }
    
    
    return result ?? undefined
  }

  /**
   * 獲取指定位置的 Y Left Domain
   * @param {String} syncMode - 同步模式
   * @param {Number} row - 列索引
   * @param {*} fallback - 預設值
   */
  const getYLeftDomain = (
    syncMode: FacetSyncMode,
    row: number,
    fallback?: YDomain
  ): YDomain | undefined => {
    let result: YDomain | null | undefined
    if (syncMode === 'all') {
      result = currentYLeftDomain.value
    } else if (syncMode === 'row' || syncMode === 'both') {
      result = rowYDomains.value[row]?.yLeft;
    } else {
      result = fallback;
    }
    
    
    return result ?? undefined
  }

  /**
   * 獲取指定位置的 Y Right Domain
   * @param {String} syncMode - 同步模式
   * @param {Number} row - 列索引
   * @param {*} fallback - 預設值
   */
  const getYRightDomain = (
    syncMode: FacetSyncMode,
    row: number,
    fallback?: YDomain
  ): YDomain | undefined => {
    let result: YDomain | null | undefined
    if (syncMode === 'all') {
      result = currentYRightDomain.value
    } else if (syncMode === 'row' || syncMode === 'both') {
      result = rowYDomains.value[row]?.yRight;
    } else {
      result = fallback;
    }
    
    
    return result ?? undefined
  }

  /**
   * 檢查是否有任何縮放
   */
  const hasAnyZoom = (): boolean => {
    return !!(
      currentXDomain.value || 
      currentYLeftDomain.value || 
      currentYRightDomain.value ||
      Object.keys(rowYDomains.value).length > 0 ||
      Object.keys(colXDomains.value).length > 0
    );
  };

  return {
    // 全域 Domain（向後兼容）
    currentXDomain,
    currentYLeftDomain,
    currentYRightDomain,
    
    // 分組 Domain
    rowYDomains,
    colXDomains,

    /**
     * 🔧 原本 resetTrigger 宣告了、handleResetZoom 也會遞增它，但沒有被 return。
     *    GridFacetChart 的 :key 寫成 `…reset${resetTrigger}`，值卻是 undefined，
     *    key 永遠是常數字串 "resetundefined" —— 重置縮放時子圖表不會重新掛載，
     *    brush 的選取框因此永遠清不掉。
     */
    resetTrigger,
    
    // 方法
    handleSelectionChange,
    handleAxisDrag,
    handleResetZoom,
    getXDomain,
    getYLeftDomain,
    getYRightDomain,
    hasAnyZoom,
  };
}
