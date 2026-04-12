import { ref } from 'vue';

/**
 * Facet 圖表 Brush 同步邏輯
 * 支援多種同步模式：全部同步、按列同步、按欄同步、完全獨立
 */
export function useFacetBrush() {
  // ===== 全域 Domain（用於 'all' 模式） =====
  const currentXDomain = ref(null);
  const currentYLeftDomain = ref(null);
  const currentYRightDomain = ref(null);

  // ===== 分組 Domain（用於 'row' 和 'col' 模式） =====
  const rowYDomains = ref({}); // { rowIndex: { yLeft: [...], yRight: [...] } }
  const colXDomains = ref({}); // { colIndex: [...] }

  // ===== Reset Trigger（用於通知子圖表清除 brush selection） =====
  const resetTrigger = ref(0);

  /**
   * 處理選取範圍變化
   * @param {Object} event - 選取事件 { xDomain, yLeftDomain, yRightDomain }
   * @param {String} facetId - 分面 ID
   * @param {String} syncMode - 同步模式 'all' | 'row' | 'col' | 'none'
   * @param {Number} row - 當前圖表的列索引
   * @param {Number} col - 當前圖表的欄索引
   * @param {Function} emit - Vue emit 函數
   */
  const handleSelectionChange = (event, facetId, syncMode, row, col, emit) => {

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
        console.log(`  → [both 模式] 更新欄 ${col} 的 X domain`, colXDomains.value[col]);
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
        console.log(`  → [both 模式] 更新列 ${row} 的 Y domain`, rowYDomains.value[row]);
      }
    }
    
    console.log('  → 當前所有 domains 狀態:', {
      colXDomains: { ...colXDomains.value },
      rowYDomains: JSON.parse(JSON.stringify(rowYDomains.value))
    });
    
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
  const handleAxisDrag = (event, facetId, syncMode, row, col, emit) => {
    if (syncMode === 'all') {
      if (event.axis === 'x' && event.domain) {
        currentXDomain.value = event.domain;
      }
    } else if (syncMode === 'col' || syncMode === 'both') {
      if (event.axis === 'x' && event.domain) {
        colXDomains.value[col] = event.domain;
      }
    } else if (syncMode === 'row' || syncMode === 'both') {
      if ((event.axis === 'yLeft' || event.axis === 'yRight') && event.domain) {
        if (!rowYDomains.value[row]) {
          rowYDomains.value[row] = {};
        }
        if (event.axis === 'yLeft') {
          rowYDomains.value[row].yLeft = event.domain;
        } else {
          rowYDomains.value[row].yRight = event.domain;
        }
      }
    }
    
    emit('axis-drag', { ...event, facetId, row, col });
  };

  /**
   * 重置縮放
   * @param {Function} emit - Vue emit 函數
   */
  const handleResetZoom = (emit) => {
    console.log('🔴 [Reset] handleResetZoom 觸發');
    console.log('  → Reset 前 colXDomains:', JSON.parse(JSON.stringify(colXDomains.value)));
    console.log('  → Reset 前 rowYDomains:', JSON.parse(JSON.stringify(rowYDomains.value)));
    console.log('  → Reset 前 Object.keys(colXDomains):', Object.keys(colXDomains.value));
    console.log('  → Reset 前 Object.keys(rowYDomains):', Object.keys(rowYDomains.value));
    
    // 清空所有 domain
    currentXDomain.value = null;
    currentYLeftDomain.value = null;
    currentYRightDomain.value = null;
    rowYDomains.value = {};
    colXDomains.value = {};
    
    // 🔧 觸發 resetTrigger 通知所有子圖表清除 brush selection
    resetTrigger.value++;
    
    console.log('  → Reset 後 colXDomains:', JSON.parse(JSON.stringify(colXDomains.value)));
    console.log('  → Reset 後 rowYDomains:', JSON.parse(JSON.stringify(rowYDomains.value)));
    console.log('  → Reset 後 Object.keys(colXDomains):', Object.keys(colXDomains.value));
    console.log('  → Reset 後 Object.keys(rowYDomains):', Object.keys(rowYDomains.value));
    console.log('  → Reset Trigger:', resetTrigger.value);
    
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
  const getXDomain = (syncMode, col, fallback) => {
    let result;
    if (syncMode === 'all') {
      result = currentXDomain.value;
    } else if (syncMode === 'col' || syncMode === 'both') {
      result = colXDomains.value[col];
    } else {
      result = fallback;
    }
    
    console.log(`🟢 [Query] getXDomain(syncMode=${syncMode}, col=${col})`, {
      storedValue: colXDomains.value[col],
      result: result,
      willUseFallback: result === undefined,
      fallback: fallback
    });
    
    return result;
  };

  /**
   * 獲取指定位置的 Y Left Domain
   * @param {String} syncMode - 同步模式
   * @param {Number} row - 列索引
   * @param {*} fallback - 預設值
   */
  const getYLeftDomain = (syncMode, row, fallback) => {
    let result;
    if (syncMode === 'all') {
      result = currentYLeftDomain.value;
    } else if (syncMode === 'row' || syncMode === 'both') {
      result = rowYDomains.value[row]?.yLeft;
    } else {
      result = fallback;
    }
    
    console.log(`🟢 [Query] getYLeftDomain(syncMode=${syncMode}, row=${row})`, {
      storedValue: rowYDomains.value[row]?.yLeft,
      result: result,
      willUseFallback: result === undefined,
      fallback: fallback
    });
    
    return result;
  };

  /**
   * 獲取指定位置的 Y Right Domain
   * @param {String} syncMode - 同步模式
   * @param {Number} row - 列索引
   * @param {*} fallback - 預設值
   */
  const getYRightDomain = (syncMode, row, fallback) => {
    let result;
    if (syncMode === 'all') {
      result = currentYRightDomain.value;
    } else if (syncMode === 'row' || syncMode === 'both') {
      result = rowYDomains.value[row]?.yRight;
    } else {
      result = fallback;
    }
    
    console.log(`🟢 [Query] getYRightDomain(syncMode=${syncMode}, row=${row})`, {
      storedValue: rowYDomains.value[row]?.yRight,
      result: result,
      willUseFallback: result === undefined,
      fallback: fallback
    });
    
    return result;
  };

  /**
   * 檢查是否有任何縮放
   */
  const hasAnyZoom = () => {
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
