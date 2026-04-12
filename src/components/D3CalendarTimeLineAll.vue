<template>
  <div class="flex-1 relative">
    <div ref="chartContainer" class="w-full h-full"></div>
    
    <!-- 用於顯示重置按鈕的區域 -->
    <div 
      v-if="resetBtnShow"
      class="absolute z-50" 
      :style="buttonStyle"
    >
      <JxButton 
        :size="buttonSize" 
        color="primary"
        :is-outline="true"
        text="Reset"
        @click="reset"
      />
    </div>
    
    <!-- 提供給圖表的tooltip使用的參數 -->
    <slot
      name="tooltip"
      :show="tooltipShow"
      :data="tooltipData"
      :x="tooltipLoc.x"
      :y="tooltipLoc.y"
      :tooltipStatus="tooltipStatus"
      :is-fixed="isFixedTooltip"
      :set-tooltip-ref="setTooltipRef"
      :reset="resetTooltipPosition"
      :current-element="currentElement"
      :svg-width="svgWidth"
      :tooltip-width="tooltipWidth"
      :tooltip-is-reverse="tooltipIsReverse"
    >
      <!-- 用於堆疊圖顯示提示框的模板 -->
      <div
        ref="tooltip"
        class="absolute bg-white border border-gray-300 rounded p-2.5 text-sm z-40"
        :class="{ 'opacity-0': hiddenTooltip }"
        v-if="tooltipStatus === 'stack' && tooltipData && tooltipData.data"
        :style="{ left: `${tooltipLoc.x}px`, top: `${tooltipLoc.y}px` }"
      >
        {{ tooltipData.data?.[props.xKey] ?? "" }}<br />
        {{ tooltipData.key ?? "" }}:
        {{
          (tooltipData.value?.[1] - tooltipData.value?.[0])?.toFixed(0) ?? ""
        }}
        批
      </div>
      <!-- 用於點圖顯示提示框的模板 -->
      <div
        ref="tooltip"
        class="absolute bg-white border border-gray-300 rounded p-2.5 text-sm z-40"
        :class="{ 'opacity-0': hiddenTooltip }"
        v-if="tooltipStatus === 'point'"
        :style="{ left: `${tooltipLoc.x}px`, top: `${tooltipLoc.y}px` }"
      >
        {{ tooltipData[props.xKey] }}<br />
        <span v-if="extraData && tooltipData && tooltipData[extraData] != null">
          {{ extraData }} : {{ (tooltipData[extraData] * 100).toFixed(2) }}%
        </span>
      </div>
    </slot>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, useSlots, watch, nextTick } from "vue";
import * as d3 from "d3";
import JxButton from "@/components/common/JxButton.vue";
import { getColor } from "@/utils/chartUtils";

// default 是當父組件沒有傳遞資料時用的假資料
const props = defineProps({
  data: {
    type: [Array, Object],
    default: () => [
      {
        Time: "24Oct",
        A: Math.floor(Math.random() * 100) + 100,
        B: Math.floor(Math.random() * 90) + 90,
        C: Math.floor(Math.random() * 80) + 80,
        RateA: Math.random() * 0.5 + 0.5,
        RateB: Math.random() * 0.4 + 0.4,
        RateC: Math.random() * 0.3 + 0.3,
      },
      {
        Time: "24Nov",
        A: Math.floor(Math.random() * 100) + 100,
        B: Math.floor(Math.random() * 90) + 90,
        C: Math.floor(Math.random() * 80) + 80,
        RateA: Math.random() * 0.5 + 0.5,
        RateB: Math.random() * 0.4 + 0.4,
        RateC: Math.random() * 0.3 + 0.3,
      },
      {
        Time: "24Dec",
        A: Math.floor(Math.random() * 100) + 100,
        B: Math.floor(Math.random() * 90) + 90,
        C: Math.floor(Math.random() * 80) + 80,
        RateA: Math.random() * 0.5 + 0.5,
        RateB: Math.random() * 0.4 + 0.4,
        RateC: Math.random() * 0.3 + 0.3,
      },
      {
        Time: "25Jan",
        A: Math.floor(Math.random() * 100) + 100,
        B: Math.floor(Math.random() * 90) + 90,
        C: Math.floor(Math.random() * 80) + 80,
        RateA: Math.random() * 0.5 + 0.5,
        RateB: Math.random() * 0.4 + 0.4,
        RateC: Math.random() * 0.3 + 0.3,
      },
      {
        Time: "25Feb",
        A: Math.floor(Math.random() * 100) + 100,
        B: Math.floor(Math.random() * 90) + 90,
        C: Math.floor(Math.random() * 80) + 80,
        RateA: Math.random() * 0.5 + 0.5,
        RateB: Math.random() * 0.4 + 0.4,
        RateC: Math.random() * 0.3 + 0.3,
      },
      {
        Time: "25W1",
        A: Math.floor(Math.random() * 50) + 50,
        B: Math.floor(Math.random() * 45) + 45,
        C: Math.floor(Math.random() * 40) + 40,
        RateA: Math.random() * 0.25 + 0.25,
        RateB: Math.random() * 0.2 + 0.2,
        RateC: Math.random() * 0.15 + 0.15,
      },
      {
        Time: "25W2",
        A: Math.floor(Math.random() * 50) + 50,
        B: Math.floor(Math.random() * 45) + 45,
        C: Math.floor(Math.random() * 40) + 40,
        RateA: Math.random() * 0.25 + 0.25,
        RateB: Math.random() * 0.2 + 0.2,
        RateC: Math.random() * 0.15 + 0.15,
      },
      {
        Time: "25W3",
        A: Math.floor(Math.random() * 50) + 50,
        B: Math.floor(Math.random() * 45) + 45,
        C: Math.floor(Math.random() * 40) + 40,
        RateA: Math.random() * 0.25 + 0.25,
        RateB: Math.random() * 0.2 + 0.2,
        RateC: Math.random() * 0.15 + 0.15,
      },
      {
        Time: "25W4",
        A: Math.floor(Math.random() * 50) + 50,
        B: Math.floor(Math.random() * 45) + 45,
        C: Math.floor(Math.random() * 40) + 40,
        RateA: Math.random() * 0.25 + 0.25,
        RateB: Math.random() * 0.2 + 0.2,
        RateC: Math.random() * 0.15 + 0.15,
      },
      {
        Time: "25W5",
        A: Math.floor(Math.random() * 50) + 50,
        B: Math.floor(Math.random() * 45) + 45,
        C: Math.floor(Math.random() * 40) + 40,
        RateA: Math.random() * 0.25 + 0.25,
        RateB: Math.random() * 0.2 + 0.2,
        RateC: Math.random() * 0.15 + 0.15,
      },
      {
        Time: "250131",
        A: Math.floor(Math.random() * 20) + 20,
        B: Math.floor(Math.random() * 18) + 18,
        C: Math.floor(Math.random() * 16) + 16,
        RateA: Math.random() * 0.1 + 0.1,
        RateB: Math.random() * 0.08 + 0.08,
        RateC: Math.random() * 0.06 + 0.06,
      },
      {
        Time: "250201",
        A: Math.floor(Math.random() * 20) + 20,
        B: Math.floor(Math.random() * 18) + 18,
        C: Math.floor(Math.random() * 16) + 16,
        RateA: Math.random() * 0.1 + 0.1,
        RateB: Math.random() * 0.08 + 0.08,
        RateC: Math.random() * 0.06 + 0.06,
      },
      {
        Time: "250202",
        A: Math.floor(Math.random() * 20) + 20,
        B: Math.floor(Math.random() * 18) + 18,
        C: Math.floor(Math.random() * 16) + 16,
        RateA: Math.random() * 0.1 + 0.1,
        RateB: Math.random() * 0.08 + 0.08,
        RateC: Math.random() * 0.06 + 0.06,
      },
      {
        Time: "250203",
        A: Math.floor(Math.random() * 20) + 20,
        B: Math.floor(Math.random() * 18) + 18,
        C: Math.floor(Math.random() * 16) + 16,
        RateA: Math.random() * 0.1 + 0.1,
        RateB: Math.random() * 0.08 + 0.08,
        RateC: Math.random() * 0.06 + 0.06,
      },
      {
        Time: "250204",
        A: Math.floor(Math.random() * 20) + 20,
        B: Math.floor(Math.random() * 18) + 18,
        C: Math.floor(Math.random() * 16) + 16,
        RateA: Math.random() * 0.1 + 0.1,
        RateB: Math.random() * 0.08 + 0.08,
        RateC: Math.random() * 0.06 + 0.06,
      },
    ],
  },
  width: {
    type: Number,
    default: 800,
  },
  height: {
    type: Number,
    default: 342,
  },
  xKey: {
    type: String,
    default: "Time",
  },
  yKeyArray: {
    type: Array,
    default: () => ["RateA", "RateB", "RateC"],
  },
  margin: {
    type: Object,
    default: () => ({ top: 20, right: 100, bottom: 60, left: 100 }),
  },
  leftTickFormat: {
    type: Function,
    default: (d) => Math.round(d), // 異常批數，顯示為整數
  },
  rightTickFormat: {
    type: Function,
    default: (d) => (Number(d) * 100).toFixed(1) + "%", // 異常率，顯示為百分比，保留一位小數
  },
  xCountArray: {
    type: Array,
    default: () => [5, 5, 5],
  },
  seriesKeyArray: {
    type: Array,
    default: () => ["A", "B", "C"],
  },
  xType: {
    type: String,
    default: "band",
  },
  xAxisAFontSize: {
    type: String,
    default: "14px",
  },
  leftTickColor: {
    type: String,
    default: "#000",
  },
  leftTitleColor: {
    type: String,
    default: "#000",
  },
  leftTitleName: {
    type: String,
    default: "異常批數",
  },
  rightTickColor: {
    type: String,
    default: "#0080FF",
  },
  rightTitleColor: {
    type: String,
    default: "#0080FF",
  },
  rightTitleName: {
    type: String,
    default: "異常率(%)",
  },
  padding: {
    type: Number,
    default: 0.3,
    validator: (value) => value >= 0 && value <= 1,
  },
});
const normalizedData = computed(() => {
  const d = props.data;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
});

function sanitizeForClass(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
// 顏色工具
// const colorArray = [
//   "#CC3333",
//   "#00BB00",
//   "#663366",
//   "#CCCC99",
//   "#666666",
//   "#ff7f50",
//   "#FF6666",
//   "#0066CC",
//   "#333333",
//   "#336633",
//   "#990033",
//   "#CC9966",
//   "#d2691e",
//   "#FF0033",
//   "#408080",
//   "#003399",
//   "#99CC00",
//   "#999933",
//   "#333300",
//   "#CCFF99",
//   "#99CCFF",
//   "#FF9966",
//   "#336699",
//   "#CCCC33",
//   "#996600",
//   "#FFCC33",
//   "#336666",
//   "#0099CC",
//   "#FFCC00",
//   "#CC6699",
//   "#3366CC",
//   "#009966",
//   "#FF6600",
//   "#FFFF66",
//   "#99CC99",
//   "#FFFF99",
//   "#CC0033",
//   "#993333",
//   "#FFFF00",
//   "#FF9900",
//   "#FFFF00",
//   "#FF9933",
//   "#FFCC99",
// ];

const buttonStyle = computed(() => {
  // 按鈕應該在圖表的右上角，margin.right 外側
  return `right: ${props.margin.right - 80}px; top: ${props.margin.top}px;`;
});

// 根據圖表高度動態決定按鈕大小
const buttonSize = computed(() => {
  if (props.height <= 300) return "3xs"; // 最小尺寸
  if (props.height <= 350) return "2xs"; // 超小尺寸
  if (props.height <= 400) return "xs";  // 小尺寸
  return "sm"; // 正常小尺寸
});

// 組件級別的資源
const chartContainer = ref(null);
const slots = useSlots();
let brushContent;
// 交互相關的狀態
const tooltip = ref(null);
const tooltipShow = ref(false);
const tooltipLoc = ref({ x: 0, y: 0 });
const tooltipData = ref({});
const extraData = ref({});
const tooltipStatus = ref("");
const tooltipIsReverse = ref(false);
const tooltipWidth = ref(null);
const svgWidth = ref(0);
const svgHeight = ref(0);
const hiddenTooltip = ref(false);
const currentElement = ref(null);
const isFixedTooltip = ref(false);
// UCL 和 LCL 變數
const ucl = ref(0.8);
const lcl = ref(0.2);
const externalTooltipRef = ref(null);
const setTooltipRef = (el) => (externalTooltipRef.value = el);
function resetTooltipPosition() {
  tooltipShow.value = false;
  isFixedTooltip.value = false;
  tooltipLoc.value = { x: 0, y: 0 };
}
// 縮放相關的狀態
const resetBtnShow = ref(false);
function createBrush(width, brushEndCallback) {
  return d3
    .brush()
    .extent([
      [props.margin.left, props.margin.top], // 從margin.left開始
      [width - props.margin.right, props.height - props.margin.bottom], // 到margin.right結束
    ])
    .on("end", brushEndCallback);
}
function brushEnd(event, xScale, yScales, redrawCallback) {
  // 如果沒有選擇區域，提前返回
  if (!event.selection) return;
  
  const [[x0, y0], [x1, y1]] = event.selection;
  let selectedXDomain, selectedYDomains;
  if (props.xType === "band") {
    selectedXDomain = xScale.domain().filter((d) => {
      const bandStart = xScale(d);      
      const bandEnd = bandStart + xScale.bandwidth();
      return bandStart >= x0 && bandEnd <= x1;
    });
  } else {
    selectedXDomain = [xScale.invert(x0), xScale.invert(x1)];
  }
  
  // 確保有選取到資料
  if (selectedXDomain.length === 0) return;
  
  // 先顯示 reset button（在修改 domain 之前）
  resetBtnShow.value = true;
  
  selectedYDomains = Array.isArray(yScales)
    ? yScales.map((yScale) => [yScale.invert(y1), yScale.invert(y0)])
    : [[yScales.invert(y1), yScales.invert(y0)]];
  
  xScale.domain(selectedXDomain);
  if (Array.isArray(yScales)) {
    yScales.forEach((yScale, index) => yScale.domain(selectedYDomains[index]));
  } else {
    yScales.domain(selectedYDomains[0]);
  }
  
  redrawCallback();
}
function resetZoom(drawChart) {
  resetBtnShow.value = false;
  nextTick(() => {
    drawChart();
  });
}
// 用於繪圖的函數
// 交互處理函數
function stackBarMouseOver(layerKey) {
  return function (event, d) {
    console.log("stackBarMouseOver d:", d); // 檢查 d 的結構
    console.log("d.data:", d.data); // 檢查是否有 data 屬性
    console.log("layerKey:", layerKey);
    if (!d || !d.data) {
      console.warn("tooltipData missing data, skipping tooltip");
      return;
    }
    tooltipData.value = { data: d.data, value: d, key: layerKey };
    tooltipStatus.value = "stack";
    tooltipShow.value = true;
    const [x, y] = d3.pointer(event, chartContainer.value);
    tooltipLoc.value = { x, y };
  };
}
function stackBarMouseOut() {
  return function () {
    if (!isFixedTooltip.value) {
      tooltipShow.value = false;
      tooltipStatus.value = "";
    }
  };
  // 柱狀圖互動
}
// function stackLegendMouseOver(innerContent) {
//   return function (event, index) {
//     // 獲取當前hover的圖例項目
//     const target = event.currentTarget || this;
//     const legendItem = d3.select(target);
//     // 字體變粗
//     legendItem.select("text").style("font-weight", "bold");
//     // 處理柱狀圖的顯示效果
//     const targetColor = getColor(parseInt(index));
//     // 隱藏其他柱狀圖
//     innerContent.selectAll(".stack rect").each(function () {
//       const rect = d3.select(this);
//       const fillColor = rect.attr("fill");
//       if (fillColor !== targetColor) {
//         rect.transition().duration(200).style("opacity", 0.1);
//       } else {
//         rect.transition().duration(200).style("opacity", 1);
//       }
//     });
//   };
// }
// function stackLegendMouseOut(innerContent) {
//   return function (event) {
//     // 獲取當前mouseout的圖例項目
//     const target = event.currentTarget || this;
//     const legendItem = d3.select(target);
//     // 恢復字體
//     legendItem.select("text").style("font-weight", "normal");
//     // 恢復所有柱狀圖的顯示
//     innerContent.selectAll(".stack rect").each(function () {
//       d3.select(this).transition().duration(200).style("opacity", 1);
//     });
//   };
// }
function pointMouseOver(svg, innerContent, pointSize, type, index, yKey) {
  return function (event, d) {
    tooltipData.value = d;
    tooltipStatus.value = "point";
    extraData.value = yKey;
    tooltipShow.value = true;
    const [x, y] = d3.pointer(event, chartContainer.value);
    tooltipLoc.value = { x, y };
    // 放大點
    d3.select(event.target).attr("r", pointSize + 2);
  };
}
function pointMouseOut(innerContent, pointSize) {
  return function (event) {
    tooltipShow.value = false;
    tooltipStatus.value = "";
    // 還原點大小 - 使用 event.target 來引用當前的 DOM 元素
    d3.select(event.target).attr("r", pointSize);
  };
}
function pointClick() {
  return function (event) {
    // 點擊時固定 tooltip 位置
    const [x, y] = d3.pointer(event, chartContainer.value);
    tooltipLoc.value = { x, y };
    tooltipShow.value = true;
  };
}
function mouseOverHandler(innerContent, target) {
  d3.select(target).transition().duration(200).style("font-weight", "bold");
  const mouseOverColor = d3
    .select(target)
    .select(".point-legend-circle")
    .attr("fill");
  // 全部的點
  const filterPoints = innerContent.selectAll(".point").filter(function () {
    return d3.select(this).attr("fill") === mouseOverColor;
  });
  const filterLines = innerContent.selectAll(".line").filter(function () {
    return d3.select(this).attr("stroke") === mouseOverColor;
  });
  filterPoints.each((d, i, nodes) => {
    d3.select(nodes[i]).attr("r", Number(d3.select(nodes[i]).attr("r")) + 1);
  });
  filterLines.each((d, i, nodes) => {
    d3.select(nodes[i]).attr(
      "stroke-width",
      Number(d3.select(nodes[i]).attr("stroke-width")) + 1
    );
  });
  const othersPoints = innerContent.selectAll(".point").filter(function () {
    return d3.select(this).attr("fill") !== mouseOverColor;
  });
  const othersLines = innerContent.selectAll(".line").filter(function () {
    return d3.select(this).attr("stroke") !== mouseOverColor;
  });
  const othersTexts = innerContent
    .selectAll(".point-text text")
    .filter(function () {
      return d3.select(this).attr("fill") !== mouseOverColor;
    });
  othersPoints.each((d, i, nodes) => {
    const currentColor = d3.select(nodes[i]).attr("fill");
    const currentStroke = d3.select(nodes[i]).attr("stroke");
    if (currentColor) {
      const color = d3.color(currentColor);
      const colorHex = color.formatHex();
      d3.select(nodes[i]).attr("fill", colorHex);
      d3.select(nodes[i]).attr("opacity", 0.1);
    }
    if (currentStroke) {
      const stroke = d3.color(currentStroke);
      d3.select(nodes[i]).attr("stroke", stroke);
    }
  });
  othersLines.each((d, i, nodes) => {
    const currentColor = d3.select(nodes[i]).attr("stroke");
    if (currentColor) {
      const color = d3.color(currentColor);
      const colorHex = color.formatHex();
      d3.select(nodes[i]).attr("stroke", colorHex);
      d3.select(nodes[i]).attr("opacity", 0.1);
    }
  });
  othersTexts.each((d, i, nodes) => {
    d3.select(nodes[i]).attr("opacity", 0.1);
  });
}
function mouseOutHandler(innerContent, target) {
  d3.select(target).transition().duration(200).style("font-weight", "normal");
  const mouseOutColor = d3
    .select(target)
    .select(".point-legend-circle")
    .attr("fill");
  const filterPoints = innerContent.selectAll(".point").filter(function () {
    return d3.select(this).attr("fill") === mouseOutColor;
  });
  const filterLines = innerContent.selectAll(".line").filter(function () {
    return d3.select(this).attr("stroke") === mouseOutColor;
  });
  filterPoints.each((d, i, nodes) => {
    d3.select(nodes[i]).attr("r", Number(d3.select(nodes[i]).attr("r")) - 1);
  });
  filterLines.each((d, i, nodes) => {
    d3.select(nodes[i]).attr(
      "stroke-width",
      Number(d3.select(nodes[i]).attr("stroke-width")) - 1
    );
  });
  const othersPoints = innerContent.selectAll(".point").filter(function () {
    return d3.select(this).attr("fill") !== mouseOutColor;
  });
  const othersLines = innerContent.selectAll(".line").filter(function () {
    return d3.select(this).attr("stroke") !== mouseOutColor;
  });
  const othersTexts = innerContent
    .selectAll(".point-text text")
    .filter(function () {
      return d3.select(this).attr("fill") !== mouseOutColor;
    });
  othersPoints.each((d, i, nodes) => {
    const currentColor = d3.select(nodes[i]).attr("fill");
    const currentStroke = d3.select(nodes[i]).attr("stroke");
    if (currentColor) {
      const color = d3.color(currentColor);
      const colorHex = color.formatHex();
      d3.select(nodes[i]).attr("fill", colorHex.toUpperCase());
      d3.select(nodes[i]).attr("opacity", 1);
    }
    if (currentStroke) {
      const stroke = d3.color(currentStroke);
      d3.select(nodes[i]).attr("stroke", stroke);
    }
  });
  othersLines.each((d, i, nodes) => {
    const currentColor = d3.select(nodes[i]).attr("stroke");
    if (currentColor) {
      const color = d3.color(currentColor);
      const colorHex = color.formatHex();
      d3.select(nodes[i]).attr("stroke", colorHex.toUpperCase());
      d3.select(nodes[i]).attr("opacity", 1);
    }
  });
  othersTexts.each((d, i, nodes) => {
    d3.select(nodes[i]).attr("opacity", 1);
  });
}
function drawXAxis(svg, xScale, spacerArray, fontSize) {
  // 移除舊的 x 軸（如果存在）
  svg.selectAll(".x-axis").remove();
  const xAxis = d3.axisBottom(xScale);
  const xAxisGroup = svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${props.height - props.margin.bottom})`)
    .call(xAxis);
  // 處理分隔符文字
  xAxisGroup
    .selectAll("text")
    .filter((d) => spacerArray.includes(d))
    .style("opacity", 0);
  // 處理一般文字
  xAxisGroup
    .selectAll("text")
    .filter((d) => !spacerArray.includes(d))
    .style("font-size", `${fontSize}px`)
    .attr("transform", "rotate(-45)")
    .attr("text-anchor", "end");
  // 設置刻度線和軸線的樣式
  xAxisGroup.selectAll(".tick line").style("opacity", 0);
  xAxisGroup.selectAll(".domain").style("opacity", 0.1);
  return xAxisGroup;
}
function drawLeftYAxis(svg, yLeftScale, fontSize) {
  // 移除舊的左側y軸（如果存在）
  svg.selectAll(".y-left-axis").remove();
  const tickCount = 5;
  const [min, max] = yLeftScale.domain();
  // 向上取整到最接近的 100 倍數
  const roundedMax = max < 1 ? Math.ceil(max) : Math.ceil(max / 100) * 100;
  const roundedMin = min.toFixed(0);
  // 重要：更新 scale 的 domain 範圍
  yLeftScale.domain([roundedMin, roundedMax]);
  const step = ((roundedMax - roundedMin) / (tickCount - 1)).toFixed(0);
  const tickLeftValues = Array.from(
    { length: tickCount },
    (_, i) => Number(roundedMin) + i * step
  );
  const yAxisLeft = d3
    .axisLeft(yLeftScale)
    .tickValues(tickLeftValues)
    .tickFormat(props.leftTickFormat);
  const yAxisLeftGroup = svg
    .append("g")
    .attr("class", "y-left-axis")
    .attr("transform", `translate(${props.margin.left}, 0)`)
    .call(yAxisLeft);
  // 添加軸標題
  const titleGroup = svg
    .append("text")
    .style("fill", props.leftTitleColor)
    .attr("x", 25)
    .attr("y", props.height / 2)
    .style("font-size", `${fontSize + 4}px`)
    .style("font-weight", "bold")
    .attr("text-anchor", "middle");
  // .attr(
  //   "transform",
  //   `rotate(-90, ${-props.margin.left / 2}, ${props.height / 2})`
  // );
  const titleText = props.leftTitleName;
  for (let i = 0; i < titleText.length; i++) {
    titleGroup
      .append("tspan")
      .attr("x", 25)
      .attr("dy", i === 0 ? "0" : "1em") // 第一個字 dy=0，其他 dy=1em
      .text(titleText[i]);
  }

  // 設置刻度文字顏色
  yAxisLeftGroup
    .selectAll(".tick text")
    .style("fill", props.leftTickColor)
    .style("font-size", `${fontSize}px`);
  // 設置刻度線和軸線的樣式
  yAxisLeftGroup.selectAll(".tick line");
  yAxisLeftGroup.selectAll(".domain").style("opacity", 0);
  return yAxisLeftGroup;
}
function drawRightYAxis(svg, yRightScale, fontSize) {
  // 移除舊的右側y軸（如果存在）
  svg.selectAll(".y-right-axis").remove();
  const tickCount = 5;
  const [min, max] = yRightScale.domain();
  // 向上取整到最接近的小數點位數
  let roundedMax;
  if (max < 1) {
    roundedMax = max;
  } else {
    // 對於大於1的值，取整到100
    roundedMax = Math.ceil(max / 100) * 100;
  }
  yRightScale.domain([min, roundedMax]);
  const step = (roundedMax - min) / (tickCount - 1);
  // 生成刻度值數組
  const tickRightValues = Array.from({ length: tickCount }, (_, i) => {
    return min + i * step;
  });
  const yAxisRight = d3
    .axisRight(yRightScale)
    .tickValues(tickRightValues)
    .tickFormat(props.rightTickFormat);
  const yAxisRightGroup = svg
    .append("g")
    .attr("class", "y-right-axis")
    .attr("transform", `translate(${props.width - props.margin.right}, 0)`)
    .call(yAxisRight);
  // 添加軸標題（垂直排列，每個字一行，字形正向）
  const titleGroup = svg
    .append("text")
    .style("fill", props.rightTitleColor)
    .attr("x", props.width - props.margin.right + 130) // 讓標題更往右
    .attr("y", props.height / 2)
    .style("font-size", `${fontSize + 4}px`)
    .style("font-weight", "bold")
    .attr("text-anchor", "middle");

  // 將標題文字拆分成每個字，並使用 tspan 垂直排列
  const titleText = props.rightTitleName;
  for (let i = 0; i < titleText.length; i++) {
    titleGroup
      .append("tspan")
      .attr("x", props.width - props.margin.right + 130) // 讓標題更往右
      .attr("dy", i === 0 ? "0" : "1em") // 第一個字 dy=0，其他 dy=1em
      .text(titleText[i]);
  }
  // 設置刻度文字顏色
  yAxisRightGroup
    .selectAll(".tick text")
    .style("fill", props.rightTickColor)
    .style("font-size", `${fontSize}px`);
  // 設置刻度線和軸線的樣式
  yAxisRightGroup.selectAll(".tick line").style("opacity", 0);
  yAxisRightGroup.selectAll(".domain").style("opacity", 0);
  return yAxisRightGroup;
}
function drawStackBars(options = {}) {
  const { innerContent, xScale, getYValue, onMouseOver, onMouseOut, data } =
    options;
  // 移除舊的堆疊條
  innerContent.selectAll(".stack").remove();
  const stack = d3
    .stack()
    .keys(props.seriesKeyArray)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);
  const layers = stack(data);
  const stackGroup = innerContent.append("g").attr("class", "stack");
  layers.forEach((layer, layerIndex) => {
    const barGroup = stackGroup
      .selectAll(`.bar-group-${layerIndex}`)
      .data(layer)
      .enter()
      .append("g")
      .attr("class", `bar-group bar-group-${layerIndex}`);
    barGroup
      .append("rect")
      .attr("x", (d) => xScale(d.data[props.xKey]))
      .attr("y", (d) => getYValue(d[1]))
      .attr("height", (d) => getYValue(d[0]) - getYValue(d[1]))
      .attr("width", xScale.bandwidth())
      .attr("fill", getColor(layerIndex))
      .style("pointer-events", "visiblePainted")
      .on("mouseover", stackBarMouseOver(layer.key))
      .on("mouseout", stackBarMouseOut(innerContent));
  });
}
console.log("Drawing legend for seriesKeyArray:", props.seriesKeyArray);

function drawStackLegend(svg, innerContent) {
  // 檢查 seriesKeyArray 是否為有效陣列
  if (
    !props.seriesKeyArray ||
    !Array.isArray(props.seriesKeyArray) ||
    props.seriesKeyArray.length === 0
  ) {
    console.warn("drawStackLegend: seriesKeyArray 為空或無效");
    return;
  }

  console.log("繪製條狀圖圖例:", props.seriesKeyArray);

  // 移除舊的圖例
  svg.selectAll(".stack-legend").remove();

  // 創建圖例群組
  const legendGroup = svg
    .append("g")
    .attr("class", "stack-legend")
    .attr(
      "transform",
      `translate(${props.width - props.margin.right + 20}, ${props.margin.top})`
    );

  // 為每個系列創建圖例項目
  props.seriesKeyArray.forEach((key, index) => {
    const legendItem = legendGroup
      .append("g")
      .attr("class", `stack-legend-item-${index}`)
      .attr("transform", `translate(0, ${index * 25})`)
      .style("cursor", "pointer");

    // 圖例色塊
    legendItem
      .append("rect")
      .attr("class", `stack-legend-rect-${index}`)
      .attr("x", 0)
      .attr("y", -10)
      .attr("width", 15)
      .attr("height", 15)
      .attr("rx", 2)
      .attr("fill", getColor(index))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // 圖例文字
    legendItem
      .append("text")
      .attr("class", `stack-legend-text-${index}`)
      .attr("x", 20)
      .attr("y", 0)
      .text(key)
      .style("font-size", "14px")
      .style("font-weight", "normal")
      .style("user-select", "none")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#333");

    // 添加互動效果
    legendItem
      .on("mouseover", function () {
        // 字體變粗
        d3.select(this)
          .select("text")
          .transition()
          .duration(200)
          .style("font-weight", "bold");

        // 高亮對應的條狀圖
        const targetColor = getColor(index);
        innerContent.selectAll(".stack rect").each(function () {
          const rect = d3.select(this);
          const fillColor = rect.attr("fill");
          if (fillColor !== targetColor) {
            rect.transition().duration(200).style("opacity", 0.2);
          } else {
            rect.transition().duration(200).style("opacity", 1);
          }
        });
      })
      .on("mouseout", function () {
        // 恢復字體
        d3.select(this)
          .select("text")
          .transition()
          .duration(200)
          .style("font-weight", "normal");

        // 恢復所有條狀圖的顯示
        innerContent.selectAll(".stack rect").each(function () {
          d3.select(this).transition().duration(200).style("opacity", 1);
        });
      });
  });
}

function drawPoints(options = {}) {
  const {
    innerContent,
    xScale,
    getYValue,
    pointSize = 5,
    color,
    onMouseOver,
    onMouseOut,
    onClick,
    data,
    type,
    index,
  } = options;
  const safeType = sanitizeForClass(type);

  // 過濾出有有效 x 與 y 的資料
  const boundData = (data || []).filter((d) => {
    const xPos = xScale(d[props.xKey]);
    const yVal = getYValue ? getYValue(d) : null;
    return xPos != null && !isNaN(yVal);
  });

  // 移除舊的點和標籤
  if (type) {
    innerContent.selectAll(`.point-${safeType}-${index}`).remove();
    innerContent.selectAll(`.point-label-${safeType}-${index}`).remove();
  }

  // 繪製點
  const pointsGroup = innerContent
    .selectAll(`.point-${safeType}-${index}`)
    .data(boundData)
    .enter()
    .append("circle")
    .attr("class", `point point-${safeType}-${index}`)
    .attr("cx", (d) => {
      const x = xScale(d[props.xKey]);
      return x + (xScale.bandwidth ? xScale.bandwidth() / 2 : 0);
    })
    .attr("cy", (d) => getYValue(d))
    .attr("r", pointSize)
    .attr("fill", color)
    .style("cursor", "pointer");

  if (onMouseOver) pointsGroup.on("mouseover", onMouseOver);
  if (onMouseOut) pointsGroup.on("mouseout", onMouseOut);
  if (onClick) pointsGroup.on("click", onClick);

  // 新增: 在點上方顯示 NCN_RATE 百分比標籤
  if (type === "NCN_RATE" || (data[0] && data[0].NCN_RATE !== undefined)) {
    const labelsGroup = innerContent
      .selectAll(`.point-label-${safeType}-${index}`)
      .data(boundData)
      .enter()
      .append("g")
      .attr("class", `point-label-${safeType}-${index}`)
      .attr("transform", (d) => {
        const x =
          xScale(d[props.xKey]) +
          (xScale.bandwidth ? xScale.bandwidth() / 2 : 0);
        const y = getYValue(d);
        return `translate(${x}, ${y})`;
      });

    // 添加白色背景矩形
    labelsGroup
      .append("rect")
      .attr("x", -30)
      .attr("y", -30)
      .attr("width", 60)
      .attr("height", 20)
      .attr("fill", "white")
      .attr("stroke", color)
      .attr("stroke-width", 1.5)
      .attr("rx", 4)
      .attr("ry", 4)
      .style("opacity", 0.95);

    // 添加文字標籤
    labelsGroup
      .append("text")
      .attr("y", -16)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", color)
      .text((d) => {
        // 檢查是否有 NCN_RATE 欄位
        const rateValue = d.NCN_RATE || d[type];
        if (rateValue === undefined || rateValue === null) return "";

        const value = rateValue * 100; // 轉換為百分比
        return value >= 0.01 ? `${value.toFixed(2)}%` : "0%";
      });

    // 確保標籤在最上層
    labelsGroup.raise();
  }
}
function drawLine(options = {}) {
  const { innerContent, xScale, getYValue, data, color, type, index } = options;
  const safeType = sanitizeForClass(type);
  // 過濾出有有效 x 與 y 的資料（避免 path 中出現 NaN）
  const boundData = (data || []).filter((d) => {
    const xPos = xScale(d[props.xKey]);
    const yVal = getYValue ? getYValue(d) : null;
    return xPos != null && !isNaN(yVal);
  });
  // 移除舊的線（使用安全化的 class）
  if (type && index !== undefined) {
    innerContent.selectAll(`.line-${safeType}-${index}`).remove();
  }
  if (boundData.length === 0) return; // 無資料則不畫
  const line = d3
    .line()
    .x((d) => {
      const x = xScale(d[props.xKey]);
      return x + (xScale.bandwidth ? xScale.bandwidth() / 2 : 0);
    })
    .y((d) => getYValue(d))
    .curve(d3.curveLinear);
  innerContent
    .append("path")
    .datum(boundData)
    .attr("class", `line line-${safeType}-${index}`)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 2)
    .style("pointer-events", "none")
    .attr("d", line);
}
function drawLinesAndPoints(
  innerContent,
  svg,
  { xScale, yRightScale, xScaleGroup, filteredData, showLegend = true }
) {
  // 檢查 yKeyArray 是否為有效陣列
  if (
    !props.yKeyArray ||
    !Array.isArray(props.yKeyArray) ||
    props.yKeyArray.length === 0
  ) {
    console.log(
      "drawLinesAndPoints: yKeyArray is not a valid array",
      props.yKeyArray
    );
    return;
  }
  // 移除舊的線和點（如果存在）
  innerContent.selectAll(".line").remove();
  innerContent.selectAll(".point").remove();
  innerContent.selectAll(".point-label").remove();
  svg.selectAll('[class^="point-legend-"]').remove(); // 移除所有 point-legend 開頭的元素

  // 使用過濾後的數據，如果沒有提供則使用原始數據
  const dataToUse = filteredData || normalizedData.value;

  props.yKeyArray.forEach((yKey, index) => {
    // 繪製線段
    xScaleGroup.forEach((xGroup, innerIndex) => {
      // 過濾數據：同時滿足在 xGroup 中且在當前數據集中
      const lineData = dataToUse.filter((d) => xGroup.includes(d[props.xKey]));
      if (lineData.length > 0) {
        drawLine({
          innerContent,
          xScale,
          getYValue: (d) => yRightScale(d[yKey]),
          data: lineData,
          color: getColor(index),
          type: yKey,
          index: `${index}-${innerIndex}`,
        });
      }
    });
    // 繪製點
    drawPoints({
      innerContent,
      xScale,
      getYValue: (d) => yRightScale(d[yKey]),
      pointSize: 5,
      ucl,
      lcl,
      color: getColor(index),
      onMouseOver: pointMouseOver(
        svg,
        innerContent,
        7,
        undefined,
        undefined,
        yKey
      ),
      onMouseOut: pointMouseOut(innerContent, 5),
      onClick: slots.tooltip ? pointClick() : null,
      data: dataToUse,
      type: yKey,
      index,
    });
    // 圖例已移至外部統一繪製，不再在此處繪製
  });
}
// 繪製tick line
function drawTickLines(svg) {
  svg.selectAll(".y-left-axis").lower();
  svg
    .selectAll(".y-left-axis .tick line")
    .attr("x1", 0)
    .attr("x2", props.width - props.margin.right - props.margin.left)
    .attr("stroke", "#E5E5E5")
    .attr("stroke-width", 1)
    .attr("opacity", 0.5);
}
// 主要繪圖函數
function createChart() {
  if (!chartContainer.value) return;

  // 清除舊圖表
  d3.select(chartContainer.value).selectAll("*").remove();

  const fontSize = 30;

  const svg = d3
    .select(chartContainer.value)
    .append("svg")
    .attr("viewBox", `0 0 ${props.width} ${props.height}`)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("height", props.height)
    .classed("mx-auto block w-full h-auto", true)
    .style("width", "100%")
    .style("display", "block");

  const uniqueId = `id-${Math.random().toString(36).substring(2, 15)}`;
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", uniqueId)
    .append("rect")
    .attr("x", props.margin.left)
    .attr("y", 0)
    .attr("width", props.width - props.margin.right - props.margin.left)
    .attr("height", props.height - props.margin.bottom);

  const innerContent = svg.append("g").attr("clip-path", `url(#${uniqueId})`);

  // 建立 xScale (移到這裡，在 brush 之前)
  const xKeyData = normalizedData.value.map((d) => d[props.xKey]);
  const xScaleArray = [];
  const xScaleGroup = [];
  const spacerArray = [];
  let startIndex = 0;

  props.xCountArray.forEach((count, index) => {
    xScaleArray.push(...xKeyData.slice(startIndex, startIndex + count));
    xScaleGroup.push(xKeyData.slice(startIndex, startIndex + count));
    startIndex += count;
    if (index < props.xCountArray.length - 1) {
      xScaleArray.push(`${index + 1}`);
      spacerArray.push(`${index + 1}`);
    }
  });

  const xScale = d3
    .scaleBand()
    .domain(xScaleArray)
    .range([props.margin.left, props.width - props.margin.right])
    .padding(props.padding)
    .paddingInner(props.padding)
    .paddingOuter(props.padding);

  // 建立 yLeftScale
  const yLeftDomainArray = [];
  normalizedData.value.forEach((d) => {
    if (Array.isArray(props.seriesKeyArray)) {
      const sum = props.seriesKeyArray.reduce((acc, cur) => {
        acc += Number(d[cur]) || 0;
        return acc;
      }, 0);
      yLeftDomainArray.push(sum);
    }
  });

  const maxValue =
    yLeftDomainArray.length > 0 ? Math.max(...yLeftDomainArray) : 0;
  const safeMaxValue = isNaN(maxValue) || maxValue === -Infinity ? 0 : maxValue;
  const yLeftDomain = [0, safeMaxValue + safeMaxValue * 0.1];

  const yLeftScale = d3
    .scaleLinear()
    .domain(yLeftDomain)
    .range([props.height - props.margin.bottom, props.margin.top]);

  // 建立 yRightScale
  const yRightDomainArray = [];
  normalizedData.value.forEach((d) => {
    if (Array.isArray(props.yKeyArray)) {
      props.yKeyArray.forEach((yKey) => {
        const value = Number(d[yKey]) || 0;
        yRightDomainArray.push(value);
      });
    }
  });

  const maxRightValue =
    yRightDomainArray.length > 0 ? Math.max(...yRightDomainArray) : 0;
  const safeMaxRightValue =
    isNaN(maxRightValue) || maxRightValue === -Infinity ? 0 : maxRightValue;
  const yRightDomain = [0, safeMaxRightValue + safeMaxRightValue * 0.1];

  const yRightScale = d3
    .scaleLinear()
    .domain(yRightDomain)
    .range([props.height - props.margin.bottom, props.margin.top]);

  // 繪製圖表元素
  drawXAxis(svg, xScale, spacerArray, fontSize);
  drawLeftYAxis(svg, yLeftScale, fontSize);
  drawRightYAxis(svg, yRightScale, fontSize);

  drawStackBars({
    innerContent,
    xScale,
    getYValue: (d) => yLeftScale(d),
    onMouseOver: stackBarMouseOver(svg, innerContent),
    onMouseOut: stackBarMouseOut(innerContent),
    data: normalizedData.value,
  });

  drawLinesAndPoints(innerContent, svg, {
    xScale,
    yRightScale,
    xScaleGroup,
    filteredData: null,
  });

  drawTickLines(svg);

  // 圖例已移至 NcnDashboardView.vue 右側統一繪製，不再在此處繪製
  // drawStackLegend(svg, innerContent);

  // 在所有 scales 建立完成後，才建立 brush
  const brush = createBrush(props.width, (event) =>
  
    brushEnd(event, xScale, [yLeftScale, yRightScale], () => {
      const domainWithoutSpacers = xScale
        .domain()
        .filter((d) => !spacerArray.includes(d));
      const filteredData = normalizedData.value.filter((d) =>
        domainWithoutSpacers.includes(d[props.xKey])
      );

      const filteredXKeyData = filteredData.map((d) => d[props.xKey]);
      const filteredXScaleGroup = [];
      let filteredStartIndex = 0;
      props.xCountArray.forEach((count) => {
        const groupData = filteredXKeyData.slice(
          filteredStartIndex,
          filteredStartIndex + count
        );
        if (groupData.length > 0) {
          filteredXScaleGroup.push(groupData);
        }
        filteredStartIndex += count;
      });

      // 清除舊元素並重繪
      svg.selectAll(".x-axis").remove();
      svg.selectAll(".y-left-axis").remove();
      svg.selectAll(".y-right-axis").remove();
      innerContent.selectAll(".stack").remove();
      innerContent.selectAll(".line").remove();
      innerContent.selectAll(".point").remove();
      innerContent.selectAll(".point-label").remove();

      drawXAxis(svg, xScale, spacerArray, fontSize);
      drawLeftYAxis(svg, yLeftScale, fontSize);
      drawRightYAxis(svg, yRightScale, fontSize);

      drawStackBars({
        innerContent,
        xScale,
        getYValue: (d) => yLeftScale(d),
        onMouseOver: stackBarMouseOver(svg, innerContent),
        onMouseOut: stackBarMouseOut(innerContent),
        data: filteredData,
      });

      drawLinesAndPoints(innerContent, svg, {
        xScale,
        yRightScale,
        xScaleGroup: filteredXScaleGroup,
        filteredData,
      });

      drawTickLines(svg);
      
      // 清除 brush 選取框（移到重繪完成後）
      brushContent.call(brush.move, null);
    })
  );

  brushContent = innerContent.append("g").call(brush);

  svgWidth.value = props.width;
  svgHeight.value = props.height;
}
// Reset 功能
function reset() {
  resetBtnShow.value = false;
  resetZoom(createChart);
}
// 生命週期鉤子
onMounted(() => {
  createChart();
});
// 監聽數據變化
watch(
  () => props.data,
  () => {
    createChart();
  },
  { deep: true }
);
// 暴露方法給父組件
defineExpose({
  reset,
  createChart,
});
</script>

<style scoped>
/* 可以添加一些圖表專用的樣式 */
</style>
