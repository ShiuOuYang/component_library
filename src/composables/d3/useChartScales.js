import { ref, computed } from 'vue';
import * as d3 from 'd3';

/**
 * 圖表比例尺與數據處理 Composable
 * 
 * @description 封裝圖表的比例尺 (Scales) 計算邏輯和數據處理邏輯，包括：
 *              - X/Y 軸比例尺的創建與更新
 *              - 根據 Brush 選取範圍過濾數據
 *              - 堆疊圖的數據預處理
 *              - 自動計算 Y 軸範圍（支援 BrushX 模式的智慧調整）
 * 
 * @param {Object} props - 圖表的 props 配置
 * @param {ComputedRef<number>} chartWidth - 圖表內容區域寬度（響應式）
 * @param {ComputedRef<number>} chartHeight - 圖表內容區域高度（響應式）
 * @param {Ref} currentXDomain - 當前 X 軸的 domain（Brush 縮放後的範圍）
 * @param {Ref} currentYLeftDomain - 當前左 Y 軸的 domain
 * @param {Ref} currentYRightDomain - 當前右 Y 軸的 domain
 * 
 * @returns {Object} 包含比例尺和輔助計算屬性的物件
 * @returns {ComputedRef} returns.xScale - X 軸比例尺
 * @returns {ComputedRef} returns.yLeftScale - 左 Y 軸比例尺
 * @returns {ComputedRef} returns.yRightScale - 右 Y 軸比例尺
 * @returns {ComputedRef} returns.leftLayers - 使用左 Y 軸的圖層
 * @returns {ComputedRef} returns.rightLayers - 使用右 Y 軸的圖層
 * @returns {Ref} returns.originalXDomain - 原始完整的 X 軸 domain
 * @returns {Ref} returns.originalYLeftDomain - 原始完整的左 Y 軸 domain
 * @returns {Ref} returns.originalYRightDomain - 原始完整的右 Y 軸 domain
 * 
 * @example
 * const {
 *   xScale,
 *   yLeftScale,
 *   yRightScale,
 *   leftLayers,
 *   rightLayers,
 *   originalXDomain
 * } = useChartScales(props, chartWidth, chartHeight, currentXDomain, currentYLeftDomain, currentYRightDomain);
 */
export function useChartScales(
  props,
  chartWidth,
  chartHeight,
  currentXDomain,
  currentYLeftDomain,
  currentYRightDomain
) {
  // 定義支援的 Scale 類型映射表
  const SCALE_CONSTRUCTORS = {
    'linear': d3.scaleLinear,
    'log': d3.scaleLog,
    'sqrt': d3.scaleSqrt,
    'time': d3.scaleTime,
    'symlog': d3.scaleSymlog
  };

  // 儲存原始 domain（用於 Brush 重置）
  const originalXDomain = ref(null);
  const originalYLeftDomain = ref(null);
  const originalYRightDomain = ref(null);

  /**
   * 按 yAxis 分組圖層
   * 
   * @description 將圖層配置按照使用的 Y 軸（left/right）分組，
   *              方便後續分別計算左右 Y 軸的範圍和渲染對應圖層。
   */
  const leftLayers = computed(() => props.layers.filter(l => l.yAxis === 'left'));
  const rightLayers = computed(() => props.layers.filter(l => l.yAxis === 'right'));

  /**
   * 根據 X 範圍過濾圖層數據
   * 
   * @description 當啟用 BrushX 模式且有選取範圍時，過濾出選取範圍內的數據。
   *              支援 Band Scale（離散類別）和連續型 Scale（數值/時間）。
   * 
   * @param {Array} data - 原始數據陣列
   * @param {Function} xValue - X 軸取值函式
   * @returns {Array} 過濾後的數據陣列
   */
  const filterDataByXDomain = (data, xValue) => {
    if (!currentXDomain.value || !xValue) return data;

    if (props.xScaleType === 'band') {
      // Band Scale：使用 Set 提升查詢效率
      const currentDomain = new Set(currentXDomain.value);
      return data.filter(d => currentDomain.has(xValue(d)));
    } else if (Array.isArray(currentXDomain.value)) {
      // 連續型 Scale：判斷數值是否在範圍內
      const [minX, maxX] = currentXDomain.value;
      return data.filter(d => {
        const x = xValue(d);
        return x >= minX && x <= maxX;
      });
    }

    return data;
  };

  /**
   * 計算圖層的最大 Y 值
   * 
   * @description 根據圖層類型計算 Y 軸的最大值：
   *              - 堆疊圖：計算每個類別的堆疊總和
   *              - 折線圖/其他：直接取 yValue 的最大值
   *              在 BrushX 模式下，只計算選取 X 範圍內的數據。
   * 
   * @param {Array} layers - 圖層配置陣列
   * @returns {number} 最大 Y 值
   */
  const calculateMaxYValue = (layers) => {
    let maxValue = 0;

    layers.forEach(layer => {
      let dataToCalculate = layer.data || [];

      // ✅ 在 BrushX 模式且有 X 範圍時，只計算選取範圍內的數據
      if (props.brushMode === 'x' && currentXDomain.value && layer.xValue) {
        dataToCalculate = filterDataByXDomain(dataToCalculate, layer.xValue);
      }

      if (layer.type === 'stacked-bar') {
        // 堆疊圖需要計算每個 category 的總和
        const stackKeys = layer.stackKeys || [];
        const sums = dataToCalculate.map(d =>
          stackKeys.reduce((sum, key) => sum + (d[key] || 0), 0)
        );
        maxValue = Math.max(maxValue, d3.max(sums) || 0);
      } else if (layer.yValue) {
        // 折線圖或其他類型
        maxValue = Math.max(maxValue, d3.max(dataToCalculate, layer.yValue) || 0);
      }
    });

    return maxValue;
  };

  /**
   * X 軸比例尺
   * 
   * @description 創建 X 軸的 D3 比例尺，支援：
   *              - Band Scale：離散類別數據（如：Q1, Q2, Q3）
   *              - Linear/Time/Log Scale：連續型數據
   *              自動儲存原始 domain 供 Brush 重置使用。
   *              響應 currentXDomain 的變化實現縮放效果。
   */
  const xScale = computed(() => {
    const allData = props.layers.flatMap(layer => layer.data || []);

    if (!allData.length) return null;

    const layer = props.layers[0];
    const xValue = layer.xValue || (d => d.category);

    // 計算初始 domain
    let baseDomain;
    if (props.xScaleType === 'band') {
      baseDomain = props.xDomain || allData.map(xValue);
    } else {
      baseDomain = props.xDomain || d3.extent(allData, xValue);
    }

    // 儲存原始 domain（首次計算時）
    if (!originalXDomain.value) {
      originalXDomain.value = baseDomain;
    }

    // 使用當前 domain 或基礎 domain
    const effectiveDomain = currentXDomain.value || baseDomain;

    // 1. Band Scale (離散數據)
    if (props.xScaleType === 'band') {
      return d3.scaleBand()
        .domain(effectiveDomain)
        .range([0, chartWidth.value])
        .padding(0.2);
    }

    // 2. 連續型 Scale (Linear, Time, Log, Sqrt...)
    const createScale = SCALE_CONSTRUCTORS[props.xScaleType] || d3.scaleLinear;

    return createScale()
      .domain(effectiveDomain)
      .range([0, chartWidth.value]);
  });

  /**
   * 左 Y 軸比例尺
   * 
   * @description 創建左 Y 軸的 D3 比例尺，智慧特性：
   *              - BrushX 模式：自動根據選取的 X 範圍計算 Y 軸最大值
   *              - Brush(XY) 模式：使用手動選取的 Y 範圍
   *              - 支援多種 Scale 類型（linear, log, sqrt 等）
   *              - 自動添加 10% 的上方留白空間
   */
  const yLeftScale = computed(() => {
    if (!leftLayers.value.length) return null;

    // ✅ 計算最大值（BrushX 模式下會自動過濾 X 範圍）
    const maxValue = calculateMaxYValue(leftLayers.value);
    const baseDomain = props.yLeftDomain || [0, maxValue * 1.1];

    // 儲存原始 domain（首次計算時）
    if (!originalYLeftDomain.value) {
      originalYLeftDomain.value = baseDomain;
    }

    // ✅ 如果有手動設定的 Y domain（Brush XY 模式），使用它；否則根據數據自動計算
    const effectiveDomain = currentYLeftDomain.value || baseDomain;

    const createScale = SCALE_CONSTRUCTORS[props.yLeftScaleType] || d3.scaleLinear;

    return createScale()
      .domain(effectiveDomain)
      .range([chartHeight.value, 0])
      .nice();
  });

  /**
   * 右 Y 軸比例尺
   * 
   * @description 創建右 Y 軸的 D3 比例尺，邏輯與左 Y 軸相同。
   *              通常用於折線圖等需要不同刻度的圖層。
   */
  const yRightScale = computed(() => {
    if (!rightLayers.value.length) return null;

    // ✅ 計算最大值（BrushX 模式下會自動過濾 X 範圍）
    const maxValue = calculateMaxYValue(rightLayers.value);
    const baseDomain = props.yRightDomain || [0, maxValue * 1.1];

    // 儲存原始 domain（首次計算時）
    if (!originalYRightDomain.value) {
      originalYRightDomain.value = baseDomain;
    }

    // ✅ 如果有手動設定的 Y domain（Brush XY 模式），使用它；否則根據數據自動計算
    const effectiveDomain = currentYRightDomain.value || baseDomain;

    const createScale = SCALE_CONSTRUCTORS[props.yRightScaleType] || d3.scaleLinear;

    return createScale()
      .domain(effectiveDomain)
      .range([chartHeight.value, 0])
      .nice();
  });

  /**
   * 處理後的左側圖層（已過濾數據）
   * 
   * @description 返回已經根據 Brush 選取範圍過濾好數據的圖層配置。
   *              避免在渲染函式中重複進行數據過濾，提升性能。
   */
  const processedLeftLayers = computed(() => {
    return leftLayers.value.map(layer => {
      // 如果沒有 Brush 選取範圍，直接返回原始圖層
      if (!currentXDomain.value || !layer.xValue) {
        return layer;
      }

      // 根據 X 範圍過濾數據
      const filteredData = filterDataByXDomain(layer.data || [], layer.xValue);

      // 返回新的圖層配置，只替換 data 屬性
      return {
        ...layer,
        data: filteredData,
        _isFiltered: true // 標記已過濾，方便調試
      };
    });
  });

  /**
   * 處理後的右側圖層（已過濾數據）
   * 
   * @description 返回已經根據 Brush 選取範圍過濾好數據的圖層配置。
   *              避免在渲染函式中重複進行數據過濾，提升性能。
   */
  const processedRightLayers = computed(() => {
    return rightLayers.value.map(layer => {
      // 如果沒有 Brush 選取範圍，直接返回原始圖層
      if (!currentXDomain.value || !layer.xValue) {
        return layer;
      }

      // 根據 X 範圍過濾數據
      const filteredData = filterDataByXDomain(layer.data || [], layer.xValue);

      // 返回新的圖層配置，只替換 data 屬性
      return {
        ...layer,
        data: filteredData,
        _isFiltered: true // 標記已過濾，方便調試
      };
    });
  });

  return {
    // 比例尺
    xScale,
    yLeftScale,
    yRightScale,

    // 圖層分組（原始）
    leftLayers,
    rightLayers,

    // ✅ 處理後的圖層（已過濾數據）
    processedLeftLayers,
    processedRightLayers,

    // 原始 domain（供重置使用）
    originalXDomain,
    originalYLeftDomain,
    originalYRightDomain,

    // 工具函式
    filterDataByXDomain,
    calculateMaxYValue
  };
}
