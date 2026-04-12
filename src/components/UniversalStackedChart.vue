<template>
  <div class="w-full">
    <div v-if="title" class="mb-4">
      <h3 class="text-lg font-semibold text-gray-800">{{ title }}</h3>
    </div>
    <div
      v-show="!loading"
      class="flex h-full justify-center items-center w-full overflow-x-auto"
      ref="chartContainer"
      :style="{ height: chartHeight + 'px' }"
    ></div>
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="text-gray-500">載入中...</div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import * as d3 from "d3";
import { DEFAULT_COLOR_PALETTE } from "../config/colorPalette.js";

const props = defineProps({
  // 圖表資料 - 支援兩種格式
  data: {
    type: Array,
    required: true,
    default: () => [],
  },
  // 原始資料（來自 store，類似 DistributionChart）
  rawData: {
    type: Array,
    default: () => [],
  },
  // 路由資料（分組信息）
  routeData: {
    type: Object,
    default: () => ({}),
  },
  // 當前顏色分組字段
  colorGroupField: {
    type: String,
    default: "lot_type",
  },
  // 圖表標題
  title: {
    type: String,
    default: "",
  },
  // X軸資料鍵名
  xKey: {
    type: String,
    default: "category",
  },
  // 堆疊資料的鍵名陣列
  stackKeys: {
    type: Array,
    required: true,
  },
  // 圖表高度
  chartHeight: {
    type: Number,
    default: 400,
  },
  // 載入狀態
  loading: {
    type: Boolean,
    default: false,
  },
  // 顏色配置
  colorPalette: {
    type: Array,
    default: () => DEFAULT_COLOR_PALETTE,
  },
  // Y軸標題
  yAxisLabel: {
    type: String,
    default: "數量",
  },
  // 是否顯示數值標籤
  showValueLabels: {
    type: Boolean,
    default: true,
  },
  // 新增：數值標籤模式
  valueLabelMode: {
    type: String,
    default: "total", // 'total', 'segment', 'both'
    validator: (value) => ["total", "segment", "both"].includes(value),
  },
  // 新增：最小分段高度（低於此高度不顯示分段標籤）
  minSegmentHeight: {
    type: Number,
    default: 20,
  },
  // 是否顯示分組標籤（兩層X軸）
  showGroupLabels: {
    type: Boolean,
    default: false,
  },
  // 分組鍵名
  groupKey: {
    type: String,
    default: "group",
  },
  // 站點代碼鍵名
  stationKey: {
    type: String,
    default: "stationCode",
  },
  // 新增：X軸標籤顯示模式
  xAxisLabelMode: {
    type: String,
    default: "auto", // 'auto', 'rotate', 'skip', 'wrap'
    validator: (value) => ["auto", "rotate", "skip", "wrap"].includes(value),
  },
  // 新增：標籤跳過間隔（skip 模式下）
  xAxisLabelSkip: {
    type: Number,
    default: 1, // 每 N 個顯示一個
  },
  // 新增：控制是否隱藏空白欄位
  hideEmptyCategories: {
    type: Boolean,
    default: false,
  },
  // 新增：控制是否隱藏空白群組
  hideEmptyGroups: {
    type: Boolean,
    default: false,
  },
});
console.log(
  "Categories:",
  props.data.map((item) => item.category)
);

const emit = defineEmits(["bar-click"]);
const chartContainer = ref(null);
const margin = ref({
  top: 20,
  right: 125,
  bottom: props.showGroupLabels ? 80 : 60,
  left: 60,
});
const svgWidth = ref(800);

// 🔄 統一資料處理邏輯 - 兼容兩種輸入格式 + 篩選功能
const processedData = computed(() => {
  // Step 1: 資料來源處理
  let data = [];
  if (props.rawData && props.rawData.length > 0) {
    data = processRawData();
  } else {
    data = props.data || [];
  }

  // Step 2: 篩選空白欄位
  if (props.hideEmptyCategories) {
    data = data.filter((item) => {
      const hasData = Object.keys(item).some((key) => {
        return (
          key !== "category" &&
          key !== "group" &&
          key !== "stationCode" &&
          item[key] &&
          !isNaN(item[key]) &&
          Number(item[key]) > 0
        );
      });
      return hasData;
    });
  }

  // Step 3: 篩選空白群組
  if (props.hideEmptyGroups) {
    // 先找出有資料的群組
    const groupsWithData = new Set();
    data.forEach((item) => {
      const hasData = Object.keys(item).some((key) => {
        return (
          key !== "category" &&
          key !== "group" &&
          key !== "stationCode" &&
          item[key] &&
          !isNaN(item[key]) &&
          Number(item[key]) > 0
        );
      });
      if (hasData && item[props.groupKey]) {
        groupsWithData.add(item[props.groupKey]);
      }
    });

    // 只保留有資料的群組的項目
    data = data.filter((item) => {
      return groupsWithData.has(item[props.groupKey]);
    });
  }

  return data;
});

// 🎯 處理原始資料（類似 DistributionChart）
function processRawData() {
  // 生成 X 軸資料組合
  const xScaleData = Object.keys(props.routeData)
    .map((key) => props.routeData[key].map((item) => `${key}_${item}`))
    .flatMap((item) => item);

  // 為每個組合生成統計資料
  return xScaleData.map((group) => {
    const [section, groupCode] = group.split("_");

    // 篩選符合條件的資料
    const groupData = props.rawData.filter(
      (item) => item.section === section && item.group_code === groupCode
    );

    // 根據 colorGroupField 進行分組統計
    const result = groupData.reduce(
      (acc, cur) => {
        const colorGroup = cur[props.colorGroupField];
        acc[colorGroup] = (acc[colorGroup] || 0) + 1;
        return acc;
      },
      {
        [props.xKey]: group,
        [props.groupKey]: section,
        [props.stationKey]: groupCode,
      }
    );

    return result;
  });
}

// 🎨 動態計算顏色分組鍵值
const dynamicStackKeys = computed(() => {
  if (props.rawData && props.rawData.length > 0) {
    // 從原始資料中提取唯一的顏色分組值
    return [
      ...new Set(props.rawData.map((item) => item[props.colorGroupField])),
    ].filter(Boolean);
  }

  // 使用傳入的 stackKeys，確保返回數組
  return props.stackKeys || [];
});

// 計算最大值
const maxValue = computed(() => {
  if (
    !processedData.value ||
    processedData.value.length === 0 ||
    !dynamicStackKeys.value ||
    dynamicStackKeys.value.length === 0
  )
    return 0;

  return Math.max(
    ...processedData.value.map((item) => {
      return dynamicStackKeys.value.reduce(
        (sum, key) => sum + (item[key] || 0),
        0
      );
    })
  );
});

// 🏷️ 計算X軸分組標籤資料
const xGroupData = computed(() => {
  if (!props.showGroupLabels || !processedData.value) return {};

  const groups = {};
  processedData.value.forEach((item, index) => {
    const groupName = item[props.groupKey];
    if (!groups[groupName]) {
      groups[groupName] = { start: index, end: index };
    } else {
      groups[groupName].end = index;
    }
  });
  return groups;
});

// 監聽資料變化重繪圖表
watch(
  () => [processedData.value, dynamicStackKeys.value],
  ([newData, newKeys]) => {
    if (newData && newData.length > 0 && newKeys && newKeys.length > 0) {
      margin.value.bottom = props.showGroupLabels ? 80 : 60;
      nextTick(() => {
        drawChart();
      });
    }
  },
  { deep: true }
);

function calculateSvgWidth() {
  if (!chartContainer.value) return 800;
  const containerWidth = chartContainer.value.clientWidth;

  // ✅ 根據新的 margin.right 調整計算
  const chartMinWidth = 600; // 圖表最小寬度
  const legendWidth = 150; // 圖例寬度
  const scrollbarWidth = 15; // 滾動條寬度
  const spacing = 30; // 間距（margin.right 中預留的空間）

  // SVG 寬度 = 圖表最小寬度 + legend 寬度 + 滾動條 + 間距
  const totalWidth = chartMinWidth + legendWidth + scrollbarWidth + spacing;

  // 如果容器很大，增加圖表寬度但保留圖例空間
  if (containerWidth > totalWidth) {
    // ✅ 只增加圖表部分，保持右側空間不變
    return containerWidth;
  }

  return totalWidth;
}

function drawChart() {
  if (
    !chartContainer.value ||
    !processedData.value ||
    processedData.value.length === 0
  )
    return;

  const width = svgWidth.value;
  const height = props.chartHeight;

  // 定義視覺風格
  const axisColor = "#555";
  const gridColor = "#e0e0e0";
  const labelFont = "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";

  // 清除之前的內容
  d3.select(chartContainer.value).selectAll("*").remove();

  const svg = d3
    .select(chartContainer.value)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("font-family", labelFont);

  // 添加背景網格
  const yScale = d3
    .scaleLinear()
    .domain([0, maxValue.value])
    .nice()
    .range([height - margin.value.bottom, margin.value.top]);

  svg
    .append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.value.left},0)`)
    .call(
      d3
        .axisLeft(yScale)
        .tickSize(-(width - margin.value.left - margin.value.right))
        .tickFormat("")
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll(".tick line")
        .attr("stroke", gridColor)
        .attr("stroke-dasharray", "2,2")
    );

  // X軸比例尺
  const xScale = d3
    .scaleBand()
    .domain(processedData.value.map((d) => d[props.xKey]))
    .range([margin.value.left, width - margin.value.right])
    .padding(0.2);

  // // X軸標籤處理
  // if (!props.showGroupLabels) {
  //   const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);

  //   svg
  //     .append("g")
  //     .attr("transform", `translate(0,${height - margin.value.bottom})`)
  //     .call(xAxis)
  //     .selectAll("text")
  //     .attr("font-size", "10px")
  //     .attr("fill", axisColor)
  //     .attr("transform", "rotate(-45)")
  //     .attr("text-anchor", "end")
  //     .attr("dx", "-0.5em")
  //     .attr("dy", "0.15em");
  // } else {
  //   // 繪製詳細標籤（站點代碼）
  //   drawDetailLabels(svg, xScale, height, margin.value);

  //   // 繪製分組標籤
  //   drawGroupLabels(svg, xScale, height, margin.value);
  // }

  // X軸標籤處理
  if (!props.showGroupLabels) {
    const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);

    // 根據資料數量調整標籤顯示策略
    const dataCount = processedData.value.length;
    let tickValues = xScale.domain();

    if (props.xAxisLabelMode === "auto") {
      // 自動模式：根據資料量決定顯示密度
      if (dataCount > 20) {
        tickValues = tickValues.filter(
          (_, i) => i % Math.ceil(dataCount / 10) === 0
        );
      } else if (dataCount > 15) {
        tickValues = tickValues.filter((_, i) => i % 2 === 0);
      }
    } else if (props.xAxisLabelMode === "skip") {
      // 跳過模式：每 N 個顯示一個
      tickValues = tickValues.filter((_, i) => i % props.xAxisLabelSkip === 0);
    }

    xAxis.tickValues(tickValues);

    const xAxisGroup = svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.value.bottom})`)
      .call(xAxis);

    xAxisGroup
      .selectAll("text")
      .attr("font-size", "10px")
      .attr("fill", axisColor);

    // 根據模式應用不同的標籤樣式
    if (props.xAxisLabelMode === "rotate" || props.xAxisLabelMode === "auto") {
      xAxisGroup
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .attr("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.15em");
    }
  } else {
    // drawDetailLabels 和 drawGroupLabels 部分保持不變
    drawDetailLabels(svg, xScale, height, margin.value);
    drawGroupLabels(svg, xScale, height, margin.value);
  }

  // Y軸
  const yAxis = d3.axisLeft(yScale).ticks(5);

  svg
    .append("g")
    .attr("transform", `translate(${margin.value.left},0)`)
    .call(yAxis)
    .selectAll("text")
    .attr("font-size", "10px")
    .attr("fill", axisColor);

  // Y軸標題
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", margin.value.left / 3)
    .attr(
      "x",
      -(height - margin.value.top - margin.value.bottom) / 2 -
        margin.value.bottom
    )
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", axisColor)
    .text(props.yAxisLabel);

  // 堆疊資料
  const stack = d3
    .stack()
    .keys(dynamicStackKeys.value)
    .value((d, key) => d[key] || 0);

  const stackedData = stack(processedData.value);

  // 顏色比例尺
  const colorScale = d3
    .scaleOrdinal()
    .domain(dynamicStackKeys.value)
    .range(props.colorPalette);

  // 工具提示
  const tooltip = d3
    .select(chartContainer.value)
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "rgba(255, 255, 255, 0.95)")
    .style("border", "1px solid #ddd")
    .style("border-radius", "6px")
    .style("padding", "8px 12px")
    .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("z-index", "1000");

  // 繪製堆疊條形圖
  const groups = svg
    .selectAll(".group")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("class", "group")
    .attr("fill", (d) => colorScale(d.key));

  groups
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("rx", 2)
    .attr("ry", 2)
    .attr("x", (d) => xScale(d.data[props.xKey]))
    .attr("y", (d) => yScale(d[1]))
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => Math.max(0, yScale(d[0]) - yScale(d[1])))
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .style("opacity", 0.9)
    .on("mouseover", function (event, d) {
      const key = d3.select(this.parentNode).datum().key;
      const value = d[1] - d[0];
      const category = d.data[props.xKey];
      const station = d.data[props.stationKey] || category.split("_")[1];
      const group = d.data[props.groupKey] || category.split("_")[0];

      d3.select(this).style("opacity", 1).attr("stroke-width", 1.5);

      tooltip.style("visibility", "visible").html(`
          <div style="font-weight: bold; margin-bottom: 4px; color: ${colorScale(
            key
          )};">${key}</div>
          <div><strong>類別:</strong> ${category}</div>
          <div><strong>站點:</strong> ${station}</div>
          <div><strong>群組:</strong> ${group}</div>
          <div><strong>數量:</strong> ${value}</div>
        `);

      // 計算tooltip位置
      const [mouseX, mouseY] = d3.pointer(event, document.body);
      const tooltipNode = tooltip.node();
      const tooltipRect = tooltipNode.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let left = mouseX + 10;
      let top = mouseY - 10;

      // 防止超出右邊界
      if (left + tooltipRect.width > windowWidth) {
        left = mouseX - tooltipRect.width - 10;
      }

      // 防止超出上邊界
      if (top < 0) {
        top = mouseY + 10;
      }

      // 防止超出下邊界
      if (top + tooltipRect.height > windowHeight) {
        top = mouseY - tooltipRect.height - 10;
      }

      tooltip.style("left", left + "px").style("top", top + "px");
    })
    .on("mouseout", function () {
      d3.select(this).style("opacity", 0.9).attr("stroke-width", 0.5);
      tooltip.style("visibility", "hidden");
    })
    .on("click", function (event, d) {
      // console.log('d3 click event:', d)
      // console.log('d3 click event this:', this)
      // console.log('d3 click event event:', event)
      // 獲取點擊的數據
      const key = d3.select(this.parentNode).datum().key;
      const value = d[1] - d[0];
      const category = d.data[props.xKey];
      const station = d.data[props.stationKey] || category.split("_")[1];
      const group = d.data[props.groupKey] || category.split("_")[0];

      // 觸發自定義事件
      emit("bar-click", { key, value, category, station, group });
    });

  // ✅ 靈活的數值標籤系統
  if (props.showValueLabels) {
    // 計算每個 category 的總和
    const categoryTotals = new Map();

    if (
      processedData.value &&
      dynamicStackKeys.value &&
      dynamicStackKeys.value.length > 0
    ) {
      processedData.value.forEach((item) => {
        const categoryKey = item[props.xKey];
        const total = dynamicStackKeys.value.reduce(
          (sum, key) => sum + (item[key] || 0),
          0
        );
        categoryTotals.set(categoryKey, total);
      });
    }

    // 📊 顯示總和標籤（使用格式化）
    if (props.valueLabelMode === "total" || props.valueLabelMode === "both") {
      processedData.value.forEach((item) => {
        const categoryKey = item[props.xKey];
        const total = categoryTotals.get(categoryKey);

        if (total > 0) {
          svg
            .append("text")
            .attr("class", "total-label")
            .attr("x", xScale(categoryKey) + xScale.bandwidth() / 2)
            .attr("y", yScale(total) - 8)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#1f2937")
            .attr("stroke", "white")
            .attr("stroke-width", "0.8")
            .style("paint-order", "stroke fill")
            .text(formatNumber(total)); // ✨ 使用格式化函數
        }
      });
    }

    // 🔢 顯示分段標籤（使用格式化）
    if (props.valueLabelMode === "segment" || props.valueLabelMode === "both") {
      groups
        .selectAll("text.segment-label")
        .data((d) => d)
        .enter()
        .append("text")
        .attr("class", "segment-label")
        .attr("x", (d) => xScale(d.data[props.xKey]) + xScale.bandwidth() / 2)
        .attr("y", (d) => {
          const segmentHeight = yScale(d[0]) - yScale(d[1]);
          const value = d[1] - d[0];
          return segmentHeight >= props.minSegmentHeight && value > 0
            ? yScale(d[0]) - segmentHeight / 2 + 4
            : -1000;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("font-weight", "500")
        .attr("fill", "white")
        .attr("stroke", "rgba(0,0,0,0.4)")
        .attr("stroke-width", "0.4")
        .style("paint-order", "stroke fill")
        .text((d) => {
          const value = d[1] - d[0];
          const segmentHeight = yScale(d[0]) - yScale(d[1]);
          return segmentHeight >= props.minSegmentHeight && value > 0
            ? formatNumber(value) // ✨ 使用格式化函數
            : "";
        });
    }
  }

  // 🔢 數值格式化函數(k)
  function formatNumber(value) {
    if (value >= 1000) {
      return (value / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return value.toString();
  }

  // ✅ 繪製圖例 - 單欄垂直排列，超出高度時可滾動
  const legendItemHeight = 20;
  const legendWidth = 100;
  const legendHeight = height - margin.value.top - margin.value.bottom;
  const legendY = margin.value.top;
  const legendX = width - margin.value.right + 10;
  const legendMarginLeft = 25;

  // 創建圖例容器（帶剪裁路徑，實現滾動效果）
  const legendContainer = svg
    .append("g")
    .attr("class", "legend-container")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  // 添加剪裁路徑（限制圖例在指定高度內）
  legendContainer
    .append("defs")
    .append("clipPath")
    .attr("id", "legend-clip")
    .append("rect")
    .attr("width", legendWidth) // ✅ 這裡設定滑動區塊的寬度
    .attr("height", legendHeight) // ✅ 這裡設定滑動區塊的高度
    .attr("x", 0)
    .attr("y", 0);

  // 計算是否需要滾動
  const totalLegendHeight = dynamicStackKeys.value.length * legendItemHeight;
  const needsScroll = totalLegendHeight > legendHeight;

  // 圖例內容群組（應用剪裁）
  // ✅ 使用包裝層處理滾動，這樣 clip-path 才能正確工作
  const legendContentWrapper = legendContainer
    .append("g")
    .attr("class", "legend-wrapper")
    .attr("clip-path", "url(#legend-clip)")
    .attr("transform", `translate(${legendMarginLeft}, 0)`);

  const legendGroup = legendContentWrapper.append("g").attr("class", "legend");

  // 創建圖例項目 - 單欄垂直排列
  const legendItems = legendGroup
    .selectAll(".legend-item")
    .data(dynamicStackKeys.value)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * legendItemHeight})`);

  legendItems
    .append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("rx", 2)
    .attr("fill", (d) => colorScale(d));

  legendItems
    .append("text")
    .attr("x", 20)
    .attr("y", 10)
    .attr("font-size", "11px")
    .attr("fill", axisColor)
    .text((d) => d);

  // 添加垂直滾動條
  if (needsScroll) {
    const scrollbarWidth = 10;
    const scrollTrackHeight = legendHeight;
    const scrollThumbHeight =
      (legendHeight / totalLegendHeight) * scrollTrackHeight;

    // 滾動軌道
    legendContainer
      .append("rect")
      .attr("x", legendWidth + 2)
      .attr("y", 0)
      .attr("width", scrollbarWidth)
      .attr("height", scrollTrackHeight)
      .attr("fill", "#f0f0f0")
      .attr("rx", 2);

    // 滾動拇指（可拖動）
    const scrollThumb = legendContainer
      .append("rect")
      .attr("class", "scroll-thumb")
      .attr("x", legendWidth + 2)
      .attr("y", 0)
      .attr("width", scrollbarWidth)
      .attr("height", scrollThumbHeight)
      .attr("fill", "#4f46e5")
      .attr("rx", 2);

    // 滾動功能
    let scrollOffset = 0;
    const maxScroll = totalLegendHeight - legendHeight;

    function updateLegendScroll(offset) {
      scrollOffset = Math.max(0, Math.min(offset, maxScroll));
      // ✅ 在 legendGroup 上應用 transform，配合 clip-path 實現正確的滾動
      legendGroup.attr("transform", `translate(0, ${-scrollOffset})`);

      // 更新滾動拇指位置
      const thumbY =
        (scrollOffset / maxScroll) * (scrollTrackHeight - scrollThumbHeight);
      scrollThumb.attr("y", thumbY);
    }

    // 滑鼠滾輪事件
    d3.select(chartContainer.value).on(
      "wheel",
      function (event) {
        const target = event.target;
        const svgElement = target.closest("svg");

        // 檢查滑鼠是否在圖例區域（使用座標判斷）
        const svg = svgElement;
        const rect = svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;

        // ✅ 如果滑鼠在圖例右側區域（legendX 之後），就觸發滾動
        const legendX = svgWidth.value - margin.value.right + 10;
        if (mouseX > legendX) {
          event.preventDefault();
          const delta = event.deltaY > 0 ? 20 : -20;
          updateLegendScroll(scrollOffset + delta);
        }
      },
      true
    );

    // 拖動滾動拇指
    let dragStart = 0;
    let scrollStartOffset = 0;

    scrollThumb.call(
      d3
        .drag()
        .on("start", function (event) {
          dragStart = event.y;
          scrollStartOffset = scrollOffset;
          d3.select(this).attr("fill", "#3730a3").style("cursor", "grabbing");
        })
        .on("drag", (event) => {
          // ✅ 使用拖動差值計算偏移
          const dragDelta = event.y - dragStart;
          const ratio = dragDelta / (scrollTrackHeight - scrollThumbHeight);
          updateLegendScroll(scrollStartOffset + ratio * maxScroll);
        })
        .on("end", function () {
          d3.select(this).attr("fill", "#4f46e5").style("cursor", "grab");
        })
    );
  }
}

let resizeObserver = null;

function handleResize() {
  svgWidth.value = calculateSvgWidth();
  drawChart();
}

onMounted(() => {
  nextTick(() => {
    svgWidth.value = calculateSvgWidth();

    // 使用 ResizeObserver 監控容器尺寸變化
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          svgWidth.value = Math.max(width - margin.value.right, 600);
          drawChart();
        }
      }
    });

    if (chartContainer.value) {
      resizeObserver.observe(chartContainer.value);
    }

    window.addEventListener("resize", handleResize);

    if (processedData.value && processedData.value.length > 0) {
      drawChart();
    }
  });
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  window.removeEventListener("resize", handleResize);
});

// 繪製詳細標籤（上層 X 軸）
function drawDetailLabels(svg, xScale, height, margin) {
  const xAxisGTag = svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom + 10})`);

  const xAxis = d3
    .axisBottom(xScale)
    .tickFormat((d) => {
      // 從處理後的資料中提取站點代碼
      const item = processedData.value.find((item) => item[props.xKey] === d);
      return item ? item[props.stationKey] || d.split("_")[1] : d;
    })
    .tickSizeOuter(0)
    .tickSizeInner(0);

  xAxisGTag
    .call(xAxis)
    .selectAll("text")
    .attr("font-size", "9px")
    .attr("fill", "#333")
    .attr("transform", "rotate(-45)")
    .attr("text-anchor", "end")
    .attr("dx", "-0.3em")
    .attr("dy", "0.15em");

  xAxisGTag.select(".domain").attr("opacity", 0);
}

// 繪製分組標籤（下層 X 軸）
function drawGroupLabels(svg, xScale, height, margin) {
  const labelY = height - 15;
  const lineY = labelY - 20;

  // 創建分組標籤組
  const labelsGroup = svg.append("g").attr("class", "group-labels");

  // 為每個分組繪製標籤和線
  Object.entries(xGroupData.value).forEach(([groupName, range]) => {
    // 計算分組的 X 位置範圍
    const startX = xScale(processedData.value[range.start][props.xKey]);
    const endX =
      xScale(processedData.value[range.end][props.xKey]) + xScale.bandwidth();
    const centerX = (startX + endX) / 2;

    // 繪製橫線
    labelsGroup
      .append("line")
      .attr("x1", startX)
      .attr("x2", endX)
      .attr("y1", lineY)
      .attr("y2", lineY)
      .attr("stroke", "#333")
      .attr("stroke-width", 1.5);

    // 繪製起始豎線
    labelsGroup
      .append("line")
      .attr("x1", startX)
      .attr("x2", startX)
      .attr("y1", lineY - 3)
      .attr("y2", lineY + 3)
      .attr("stroke", "#333")
      .attr("stroke-width", 1);

    // 繪製結束豎線
    labelsGroup
      .append("line")
      .attr("x1", endX)
      .attr("x2", endX)
      .attr("y1", lineY - 3)
      .attr("y2", lineY + 3)
      .attr("stroke", "#333")
      .attr("stroke-width", 1);

    // 繪製分組標籤
    labelsGroup
      .append("text")
      .attr("x", centerX)
      .attr("y", lineY - 8)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text(groupName);
  });
}
</script>
