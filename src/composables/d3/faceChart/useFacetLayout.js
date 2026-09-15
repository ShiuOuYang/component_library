import { ref, computed, onMounted, onUnmounted } from 'vue';
import * as d3 from 'd3';

/**
 * Facet 圖表佈局邏輯
 * 支援 ResizeObserver 和響應式尺寸管理
 */
export function useFacetLayout(props, emit) {
  const containerRef = ref(null);
  const observedWidth = ref(props.width);
  const observedHeight = ref(props.totalHeight || props.height);
  const chartVersion = ref(0);

  let resizeObserver = null;
  let resizeDebounceTimer = null;

  // ===== 計算有效尺寸 =====
  const effectiveWidth = computed(() => 
    props.autoResize ? observedWidth.value : (props.width || 1200)
  );

  const effectiveHeight = computed(() => 
    props.autoResize ? observedHeight.value : (props.totalHeight || props.height || 800)
  );

  // ===== 容器樣式 =====
  const containerStyle = computed(() => {
    if (props.autoResize) {
      return {};
    }
    return {
      width: `${props.width}px`,
      height: `${props.totalHeight || props.height}px`,
    };
  });

  // ===== 設置 ResizeObserver =====
  const setupResizeObserver = (debounceDelay = 150) => {
    if (!props.autoResize || !containerRef.value) return;

    resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        if (entries[0]) {
          const { width, height } = entries[0].contentRect;
          const newWidth = Math.max(width, 400);
          const newHeight = Math.max(height, 300);
          
          if (Math.abs(observedWidth.value - newWidth) > 5 || 
              Math.abs(observedHeight.value - newHeight) > 5) {
            observedWidth.value = newWidth;
            observedHeight.value = newHeight;
            chartVersion.value += 1;
            
            if (emit) {
              emit('chart-resize', { width: newWidth, height: newHeight });
            }
          }
        }
      }, debounceDelay);
    });
    
    resizeObserver.observe(containerRef.value);
  };

  // ===== 清理 ResizeObserver =====
  const cleanupResizeObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    
    if (resizeDebounceTimer) {
      clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = null;
    }
  };

  // ===== 生命週期 =====
  onMounted(() => {
    setupResizeObserver();
  });

  onUnmounted(() => {
    cleanupResizeObserver();
  });

  return {
    containerRef,
    observedWidth,
    observedHeight,
    effectiveWidth,
    effectiveHeight,
    containerStyle,
    chartVersion,
    setupResizeObserver,
    cleanupResizeObserver,
  };
}

/**
 * 垂直分面佈局計算
 */
export function useVerticalFacetLayout(props, effectiveHeight) {
  const chartWidth = computed(() => props.width || 1200);
  
  const availableHeight = computed(() => 
    effectiveHeight.value - (props.margin?.top || 40) - (props.margin?.bottom || 60) - 
    (props.facets.length - 1) * (props.facetSpacing || 10)
  );

  // 計算每個分面的高度
  const facetHeights = computed(() => {
    const allHaveHeight = props.facets.every(f => f.height);
    const someHaveHeight = props.facets.some(f => f.height);
    
    if (allHaveHeight) {
      // 所有 facet 都有 height，當作權重分配
      const totalWeight = props.facets.reduce((sum, f) => sum + (f.height || 1), 0);
      return props.facets.map((facet, index) => {
        const weight = facet.height || 1;
        const baseHeight = Math.floor(availableHeight.value * (weight / totalWeight));
        const isLast = index === props.facets.length - 1;
        const extraHeight = isLast ? (props.lastFacetExtraHeight || 50) : 0;
        return Math.max(baseHeight + extraHeight, 100);
      });
    } else if (someHaveHeight) {
      // 部分有 height，固定高度 + 均分剩餘
      const totalCustomHeight = props.facets.reduce((sum, f) => sum + (f.height || 0), 0);
      const remainingCount = props.facets.filter(f => !f.height).length;
      const remainingHeight = availableHeight.value - totalCustomHeight;
      const defaultHeight = remainingCount > 0 ? remainingHeight / remainingCount : 0;
      
      return props.facets.map((f, index) => {
        const baseHeight = f.height || defaultHeight;
        const isLast = index === props.facets.length - 1;
        const extraHeight = isLast ? (props.lastFacetExtraHeight || 50) : 0;
        return Math.max(baseHeight + extraHeight, 100);
      });
    } else {
      // 全部均分
      const baseHeight = Math.floor(availableHeight.value / props.facets.length);
      return props.facets.map((_, index) => {
        const isLast = index === props.facets.length - 1;
        const extraHeight = isLast ? (props.lastFacetExtraHeight || 50) : 0;
        return Math.max(baseHeight + extraHeight, 100);
      });
    }
  });

  // 計算每個分面的垂直偏移
  const facetOffsets = computed(() => {
    const offsets = [];
    let currentY = props.margin?.top || 40;
    
    facetHeights.value.forEach((height, _i) => {
      offsets.push(currentY);
      currentY += height + (props.facetSpacing || 10);
    });
    
    return offsets;
  });

  return {
    chartWidth,
    availableHeight,
    facetHeights,
    facetOffsets,
  };
}

/**
 * 網格分面佈局計算
 */
export function useGridFacetLayout(props, effectiveWidth, effectiveHeight) {
  // 計算網格維度
  const uniqueXValues = computed(() => {
    if (!props.xFacetVar || !props.data) return [];
    return [...new Set(props.data.map(d => d[props.xFacetVar]))].sort();
  });

  const uniqueYValues = computed(() => {
    if (!props.yFacetVar || !props.data) return [];
    return [...new Set(props.data.map(d => d[props.yFacetVar]))].sort();
  });

  const cols = computed(() => uniqueXValues.value.length || 1);
  const rows = computed(() => uniqueYValues.value.length || 1);

  // 計算單元格尺寸
  const headerWidth = computed(() => props.headerWidth || 80);
  const headerHeight = computed(() => props.headerHeight || 40);

  const cellWidth = computed(() => 
    (effectiveWidth.value - headerWidth.value) / cols.value
  );

  const cellHeight = computed(() => 
    (effectiveHeight.value - headerHeight.value) / rows.value
  );

  // 構建網格數據
  const gridFacets = computed(() => {
    if (!props.data || !props.xFacetVar || !props.yFacetVar) return [];
    
    const facets = [];
    
    uniqueYValues.value.forEach((yVal, rowIndex) => {
      uniqueXValues.value.forEach((xVal, colIndex) => {
        const facetData = props.data.find(
          d => d[props.xFacetVar] === xVal && d[props.yFacetVar] === yVal
        );
        
        if (facetData) {
          // 🔧 自動計算缺失的 domain（用於 Brush Reset）
          let xDomain = facetData.xDomain;
          let yLeftDomain = facetData.yLeftDomain;
          let yRightDomain = facetData.yRightDomain;

          // 如果沒有提供 xDomain，從 layers 的數據計算
          if (!xDomain && facetData.layers?.length > 0) {
            const firstLayer = facetData.layers[0];
            if (firstLayer.data && firstLayer.xValue) {
              const xValues = firstLayer.data.map(firstLayer.xValue);
              if (props.xScaleType === 'band') {
                xDomain = xValues; // band scale 使用所有值
              } else {
                xDomain = d3.extent(xValues); // continuous scale 使用 min/max
              }
            }
          }

          // 如果沒有提供 yLeftDomain，從 yAxis='left' 的 layers 計算
          if (!yLeftDomain) {
            const leftLayers = facetData.layers?.filter(l => l.yAxis === 'left' || !l.yAxis);
            if (leftLayers?.length > 0) {
              const allYValues = [];
              leftLayers.forEach(layer => {
                if (layer.data) {
                  if (layer.type === 'stacked-bar' && layer.stackKeys) {
                    // 堆疊長條圖：計算每個 x 點的總和
                    const groupedData = d3.group(layer.data, layer.xValue);
                    groupedData.forEach(items => {
                      const total = layer.stackKeys.reduce((sum, key) => {
                        return sum + d3.sum(items, d => d[key] || 0);
                      }, 0);
                      allYValues.push(total);
                    });
                  } else if (layer.yValue) {
                    // 一般圖層
                    layer.data.forEach(d => allYValues.push(layer.yValue(d)));
                  }
                }
              });
              if (allYValues.length > 0) {
                yLeftDomain = [0, d3.max(allYValues) * 1.1]; // 上方留 10% 空間
              }
            }
          }

          // 如果沒有提供 yRightDomain，從 yAxis='right' 的 layers 計算
          if (!yRightDomain) {
            const rightLayers = facetData.layers?.filter(l => l.yAxis === 'right');
            if (rightLayers?.length > 0) {
              const allYValues = [];
              rightLayers.forEach(layer => {
                if (layer.data && layer.yValue) {
                  layer.data.forEach(d => allYValues.push(layer.yValue(d)));
                }
              });
              if (allYValues.length > 0) {
                yRightDomain = [
                  d3.min(allYValues) * 0.9,
                  d3.max(allYValues) * 1.1
                ];
              }
            }
          }

          facets.push({
            id: `${xVal}-${yVal}`,
            row: rowIndex,
            col: colIndex,
            xValue: xVal,
            yValue: yVal,
            ...facetData,
            // 確保所有 domain 都有值（優先使用原始值，其次使用計算值）
            xDomain: facetData.xDomain || xDomain,
            yLeftDomain: facetData.yLeftDomain || yLeftDomain,
            yRightDomain: facetData.yRightDomain || yRightDomain,
          });
        }
      });
    });
    
    return facets;
  });

  // 樣式計算函數
  const getGridCellStyle = (row, col) => ({
    position: 'absolute',
    top: `${headerHeight.value + row * cellHeight.value}px`,
    left: `${headerWidth.value + col * cellWidth.value}px`,
    width: `${cellWidth.value}px`,
    height: `${cellHeight.value}px`,
    border: '1px solid #e5e7eb'
  });

  const getColHeaderStyle = (colIndex) => ({
    position: 'absolute',
    top: '0px',
    left: `${headerWidth.value + colIndex * cellWidth.value}px`,
    width: `${cellWidth.value}px`,
    height: `${headerHeight.value}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    borderBottom: '2px solid #4b5563',
    backgroundColor: '#f9fafb'
  });

  const getRowHeaderStyle = (rowIndex) => ({
    position: 'absolute',
    top: `${headerHeight.value + rowIndex * cellHeight.value}px`,
    left: '0px',
    width: `${headerWidth.value}px`,
    height: `${cellHeight.value}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    writingMode: 'vertical-rl',
    textOrientation: 'mixed',
    borderRight: '2px solid #4b5563',
    backgroundColor: '#f9fafb'
  });

  const getCellMargin = (row, col) => ({
    top: 5,
    right: col === cols.value - 1 ? 40 : 5,
    bottom: row === rows.value - 1 ? 40 : 5,
    left: col === 0 ? 40 : 5
  });

  return {
    uniqueXValues,
    uniqueYValues,
    cols,
    rows,
    cellWidth,
    cellHeight,
    headerWidth,
    headerHeight,
    gridFacets,
    getGridCellStyle,
    getColHeaderStyle,
    getRowHeaderStyle,
    getCellMargin,
  };
}
