<template>
  <div class="relative flex-1">
    <!-- Reset 按鈕 -->
    <div v-if="resetBtnShow" :style="buttonStyle" class="absolute z-10">
      <JxButton
        label="Reset"
        color="blue"
        :size="buttonSize"
        @click="reset"
        class="shadow-md"
      />
    </div>
    
    <!-- 圖表容器 -->
    <div ref="chartContainer" class="w-full h-full"></div>
    
    <!-- Tooltip slot -->
    <slot name="tooltip" :data="tooltipData" :show="tooltipShow" :loc="tooltipLoc"></slot>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import * as d3 from "d3";
import JxButton from "@/components/common/JxButton.vue";
import { getColor } from "../utils/chartUtils";
import { useD3Brush } from "../composables/d3/useD3Brush";

const props = defineProps({
  data: {
    type: Array,
    required: true,
    default: () => []
  },
  width: {
    type: Number,
    default: 800
  },
  height: {
    type: Number,
    default: 400
  },
  margin: {
    type: Object,
    default: () => ({ top: 40, right: 100, bottom: 80, left: 100 })
  },
  xKey: {
    type: String,
    default: "category" // X 軸的數據鍵名（用於唯一識別）
  },
  xLabelKey: {
    type: String,
    default: "" // X 軸顯示標籤的鍵名（如果為空則使用 xKey）
  },
  yKey: {
    type: String,
    default: "value" // Y 軸的數據鍵名
  },
  seriesKey: {
    type: String,
    default: "series" // 系列分類的鍵名
  },
  // 堆疊條狀圖相關
  seriesKeyArray: {
    type: Array,
    default: () => [] // 堆疊系列的鍵名陣列，例如 ['LAB', 'EQP', 'PRD', 'CPV']
  },
  useStackedBar: {
    type: Boolean,
    default: false // 是否使用堆疊條狀圖
  },
  // 兩階層 X 軸相關
  xGroupKey: {
    type: String,
    default: "" // 上層分組標籤的鍵名（如果為空則不使用兩階層）
  },
  colors: {
    type: Array,
    default: () => ["#00BB00","#CC3333",  "#663366", "#FF6666", "#0066CC"]
  },
  xAxisLabel: {
    type: String,
    default: ""
  },
  yAxisLabel: {
    type: String,
    default: ""
  },
  showLegend: {
    type: Boolean,
    default: true
  },
  padding: {
    type: Number,
    default: 0.2,
    validator: (value) => value >= 0 && value <= 1
  }
});

const emit = defineEmits(['bar-click', 'bar-hover', 'selection-change']);

// 使用 Composable
const { 
  resetBtnShow, 
  createBrushInstance, 
  handleBrushEnd, 
  resetZoom 
} = useD3Brush(emit);

// 組件資源
const chartContainer = ref(null);
const tooltipShow = ref(false);
const tooltipLoc = ref({ x: 0, y: 0 });
const tooltipData = ref({});

// 按鈕樣式
const buttonStyle = computed(() => {
  return `right: ${props.margin.right - 80}px; top: ${props.margin.top}px;`;
});

const buttonSize = computed(() => {
  if (props.height <= 300) return "3xs";
  if (props.height <= 350) return "2xs";
  if (props.height <= 400) return "xs";
  return "sm";
});

// 數據處理
const normalizedData = computed(() => {
  const d = props.data;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
});

// 獲取所有唯一的系列名稱
const seriesNames = computed(() => {
  if (props.useStackedBar && props.seriesKeyArray.length > 0) {
    // 堆疊模式：使用 seriesKeyArray
    return props.seriesKeyArray;
  } else {
    // 普通模式：從數據中提取
    const series = new Set();
    normalizedData.value.forEach(d => {
      if (d[props.seriesKey]) {
        series.add(d[props.seriesKey]);
      }
    });
    return Array.from(series);
  }
});

// 繪製 X 軸
function drawXAxis(svg, xScale, spacerArray, xScaleGroup, fontSize = 12) {
  svg.selectAll(".x-axis").remove();
  svg.selectAll(".x-group-label").remove();
  
  const xAxis = d3.axisBottom(xScale);
  
  // 如果有指定 xLabelKey，使用它來顯示標籤
  if (props.xLabelKey) {
    xAxis.tickFormat((d) => {
      if (spacerArray.includes(d)) return "";
      const dataItem = normalizedData.value.find(item => item[props.xKey] === d);
      return dataItem ? (dataItem[props.xLabelKey] || d) : d;
    });
  }
  
  const xAxisGroup = svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${props.height - props.margin.bottom})`)
    .call(xAxis);
  
  // 處理分隔符文字（隱藏）
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
  
  xAxisGroup.selectAll(".tick line").style("opacity", 0.3);
  xAxisGroup.selectAll(".domain").style("opacity", 0.3);
  
  // 繪製上層分組標籤（如果啟用兩階層）
  if (props.xGroupKey && xScaleGroup.length > 0) {
    const groupLabelY = props.height - props.margin.bottom + 45;
    
    xScaleGroup.forEach((group, index) => {
      if (group.length === 0) return;
      
      // 計算分組的起始和結束位置
      const firstItem = group[0];
      const lastItem = group[group.length - 1];
      const startX = xScale(firstItem) + xScale.bandwidth() / 2;
      const endX = xScale(lastItem) + xScale.bandwidth() / 2;
      const centerX = (startX + endX) / 2;
      
      // 獲取分組標籤（從第一個數據項）
      const groupLabel = normalizedData.value.find(d => d[props.xKey] === firstItem)?.[props.xGroupKey] || `Group ${index + 1}`;
      
      // 繪製分組標籤
      svg.append("text")
        .attr("class", "x-group-label")
        .attr("x", centerX)
        .attr("y", groupLabelY)
        .attr("text-anchor", "middle")
        .style("font-size", `${fontSize + 2}px`)
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text(groupLabel);
      
      // 繪製分組底線
      if (index < xScaleGroup.length - 1) {
        const nextGroup = xScaleGroup[index + 1];
        const firstItemNext = nextGroup[0];
        
        if (xScale(lastItem) !== undefined && xScale(firstItemNext) !== undefined) {
          const rightEdgeCurrent = xScale(lastItem) + xScale.bandwidth();
          const leftEdgeNext = xScale(firstItemNext);
          const separatorX = (rightEdgeCurrent + leftEdgeNext) / 2;

          svg.append("line")
            .attr("class", "x-group-separator")
            .attr("x1", separatorX)
            .attr("y1", props.height - props.margin.bottom)
            .attr("x2", separatorX)
            .attr("y2", groupLabelY - 10)
            .style("stroke", "#ccc")
            .style("stroke-width", 1)
            .style("stroke-dasharray", "3,3");
        }
      }
    });
  }
  
  // X 軸標籤（底部總標題）
  if (props.xAxisLabel) {
    const labelY = props.xGroupKey && xScaleGroup.length > 0 
      ? props.height - 10 
      : props.height - 10;
      
    svg.append("text")
      .attr("class", "x-axis-label")
      .attr("x", (props.width - props.margin.left - props.margin.right) / 2 + props.margin.left)
      .attr("y", labelY)
      .attr("text-anchor", "middle")
      .style("font-size", `${fontSize + 2}px`)
      .style("font-weight", "bold")
      .text(props.xAxisLabel);
  }
  
  return xAxisGroup;
}

// 繪製 Y 軸
function drawYAxis(svg, yScale, fontSize = 12) {
  svg.selectAll(".y-axis").remove();
  
  const tickCount = 5;
  const [min, max] = yScale.domain();
  const roundedMax = Math.ceil(max);
  const roundedMin = Math.floor(min);
  
  yScale.domain([roundedMin, roundedMax]);
  
  const step = (roundedMax - roundedMin) / (tickCount - 1);
  const tickValues = Array.from({ length: tickCount }, (_, i) => 
    Math.round(roundedMin + i * step)
  );
  
  const yAxis = d3
    .axisLeft(yScale)
    .tickValues(tickValues)
    .tickFormat(d3.format("d"));
  
  const yAxisGroup = svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${props.margin.left}, 0)`)
    .call(yAxis);
  
  yAxisGroup
    .selectAll("text")
    .style("font-size", `${fontSize}px`);
  
  yAxisGroup.selectAll(".tick line")
    .attr("x2", props.width - props.margin.left - props.margin.right)
    .style("stroke", "#E5E5E5")
    .style("stroke-width", 1)
    .style("opacity", 0.5);
  
  yAxisGroup.selectAll(".domain").style("opacity", 0);
  
  // Y 軸標籤
  if (props.yAxisLabel) {
    const titleGroup = svg.append("g")
      .attr("class", "y-axis-label")
      .attr("transform", `translate(${props.margin.left / 3}, ${props.height / 2})`);
    
    const titleText = props.yAxisLabel;
    for (let i = 0; i < titleText.length; i++) {
      titleGroup.append("text")
        .attr("y", i * 20 - (titleText.length * 20) / 2)
        .attr("text-anchor", "middle")
        .style("font-size", `${fontSize + 2}px`)
        .style("font-weight", "bold")
        .text(titleText[i]);
    }
  }
  
  return yAxisGroup;
}

// 繪製條狀圖
function drawBars(innerContent, xScale, yScale, data, colorMap) {
  innerContent.selectAll(".bar-group").remove();
  
  const barGroup = innerContent
    .append("g")
    .attr("class", "bar-group");
  
  if (props.useStackedBar && props.seriesKeyArray.length > 0) {
    // 堆疊條狀圖模式
    const stack = d3
      .stack()
      .keys(props.seriesKeyArray)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);
    
    const layers = stack(data);
    
    layers.forEach((layer, layerIndex) => {
      const seriesName = layer.key;
      const color = colorMap[seriesName] || getColor(layerIndex);
      
      barGroup
        .selectAll(`.bar-layer-${layerIndex}`)
        .data(layer)
        .enter()
        .append("rect")
        .attr("class", `bar bar-layer-${layerIndex}`)
        .attr("x", (d) => xScale(d.data[props.xKey]))
        .attr("y", (d) => yScale(d[1]))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => yScale(d[0]) - yScale(d[1]))
        .attr("fill", color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.7);
          
          tooltipShow.value = true;
          tooltipData.value = {
            ...d.data,
            series: seriesName,
            value: d[1] - d[0]
          };
          tooltipLoc.value = {
            x: event.pageX,
            y: event.pageY
          };
          
          emit('bar-hover', { event, data: d.data, series: seriesName, element: this });
        })
        .on("mouseout", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1);
          
          tooltipShow.value = false;
        })
        .on("click", function(event, d) {
          emit('bar-click', { event, data: d.data, series: seriesName, element: this });
        });
    });
  } else {
    // 普通條狀圖模式
    data.forEach((d, index) => {
      const xValue = d[props.xKey];
      const yValue = d[props.yKey];
      const series = d[props.seriesKey] || "default";
      const color = colorMap[series] || props.colors[0];
      
      const bar = barGroup
        .append("rect")
        .attr("class", `bar bar-${index}`)
        .attr("x", xScale(xValue))
        .attr("y", yScale(yValue))
        .attr("width", xScale.bandwidth())
        .attr("height", props.height - props.margin.bottom - yScale(yValue))
        .attr("fill", color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer");
      
      // 滑鼠事件
      bar
        .on("mouseover", function(event) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.7);
          
          tooltipShow.value = true;
          tooltipData.value = d;
          tooltipLoc.value = {
            x: event.pageX,
            y: event.pageY
          };
          
          emit('bar-hover', { event, data: d, element: this });
        })
        .on("mouseout", function(event) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1);
          
          tooltipShow.value = false;
        })
        .on("click", function(event) {
          emit('bar-click', { event, data: d, element: this });
        });
    });
  }
}

// 繪製圖例
function drawLegend(svg, colorMap) {
  if (!props.showLegend || seriesNames.value.length === 0) return;
  
  svg.selectAll(".legend").remove();
  
  const legendGroup = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${props.margin.left}, ${props.height-props.margin.bottom + 60})`);
  
  seriesNames.value.forEach((series, index) => {
    const legendItem = legendGroup
      .append("g")
      .attr("class", `legend-item legend-item-${index}`)
      .attr("transform", `translate(${index * 100}, 0)`)
      .style("cursor", "pointer");
    
    // 圖例色塊
    legendItem
      .append("rect")
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", colorMap[series])
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);
    
    // 圖例文字
    legendItem
      .append("text")
      .attr("x", 20)
      .attr("y", 9)
      // .attr("dy", "0.35em")
      .style("font-size", "12px")
      .text(series);
    
    // 互動效果
    legendItem
      .on("mouseover", function() {
        d3.select(this).select("text")
          .transition()
          .duration(200)
          .style("font-weight", "bold");
      })
      .on("mouseout", function() {
        d3.select(this).select("text")
          .transition()
          .duration(200)
          .style("font-weight", "normal");
      });
  });
}

// 主要繪圖函數
let brushContent;

function createChart() {
  if (!chartContainer.value || normalizedData.value.length === 0) return;
  
  // 清除舊圖表
  d3.select(chartContainer.value).selectAll("*").remove();
  
  const fontSize = 12;
  
  const svg = d3
    .select(chartContainer.value)
    .append("svg")
    .attr("viewBox", `0 0 ${props.width} ${props.height}`)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("height", props.height)
    .classed("mx-auto block w-full h-auto", true)
    .style("width", "100%")
    .style("display", "block");
  
  // Clip path
  const uniqueId = `clip-${Math.random().toString(36).substring(2, 15)}`;
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", uniqueId)
    .append("rect")
    .attr("x", props.margin.left)
    .attr("y", props.margin.top)
    .attr("width", props.width - props.margin.left - props.margin.right)
    .attr("height", props.height - props.margin.top - props.margin.bottom);
  
  const innerContent = svg.append("g").attr("clip-path", `url(#${uniqueId})`);
  
  // 建立 X Scale（支援兩階層）
  let xDomain, xScaleArray, xScaleGroup, spacerArray;
  
  if (props.xGroupKey) {
    // 使用兩階層模式：根據 xGroupKey 動態分組
    const groupMap = new Map();
    
    // 將數據按 xGroupKey 分組，保持原始順序
    normalizedData.value.forEach(d => {
      const groupKey = d[props.xGroupKey];
      const xValue = d[props.xKey];
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      
      // 避免重複添加相同的 xKey
      if (!groupMap.get(groupKey).includes(xValue)) {
        groupMap.get(groupKey).push(xValue);
      }
    });
    
    // 建立 xScaleGroup
    xScaleGroup = Array.from(groupMap.values());
    xDomain = [...new Set(normalizedData.value.map(d => d[props.xKey]))];
  } else {
    // 使用單一階層模式
    xDomain = [...new Set(normalizedData.value.map(d => d[props.xKey]))];
    xScaleGroup = [];
  }
  
  // 創建 xScale - 簡單使用標準 scaleBand
  const xScale = d3
    .scaleBand()
    .domain(xDomain)
    .range([props.margin.left, props.width - props.margin.right])
    .padding(props.padding);
  
  // 建立 Y Scale
  const yMax = d3.max(normalizedData.value, d => d[props.yKey]) || 0;
  
  let yMaxValue;
  if (props.useStackedBar && props.seriesKeyArray.length > 0) {
    // 堆疊模式：計算每個 X 值的總和
    yMaxValue = d3.max(normalizedData.value, d => {
      return props.seriesKeyArray.reduce((sum, key) => sum + (Number(d[key]) || 0), 0);
    }) || 0;
  } else {
    // 普通模式
    yMaxValue = yMax;
  }
  
  const yScale = d3
    .scaleLinear()
    .domain([0, yMaxValue * 1.1])
    .range([props.height - props.margin.bottom, props.margin.top]);
  
  // 建立顏色映射
  const colorMap = {};
  seriesNames.value.forEach((series, index) => {
    // 優先使用 props.colors，超出範圍則使用 getColor
    colorMap[series] = props.colors[index] || getColor(index);
  });
  
  // 繪製圖表元素
  drawXAxis(svg, xScale, [], xScaleGroup, fontSize);
  drawYAxis(svg, yScale, fontSize);
  drawBars(innerContent, xScale, yScale, normalizedData.value, colorMap);
  drawLegend(svg, colorMap);
  
  // 建立 Brush
  const brush = createBrushInstance(
    { width: props.width, height: props.height, margin: props.margin },
    (event) => {
      handleBrushEnd(event, { x: xScale, y: yScale }, () => {
        // 過濾數據
        const validDomain = xScale.domain();
        const filteredData = normalizedData.value.filter(d => 
          validDomain.includes(d[props.xKey])
        );
        
        // 重新計算分組
        let filteredXScaleGroup = [];
        if (props.xGroupKey) {
          const filteredGroupMap = new Map();
          
          // 將過濾後的數據按 xGroupKey 重新分組
          filteredData.forEach(d => {
            const groupKey = d[props.xGroupKey];
            const xValue = d[props.xKey];
            
            if (!filteredGroupMap.has(groupKey)) {
              filteredGroupMap.set(groupKey, []);
            }
            
            if (!filteredGroupMap.get(groupKey).includes(xValue)) {
              filteredGroupMap.get(groupKey).push(xValue);
            }
          });
          
          // 建立 filteredXScaleGroup
          filteredXScaleGroup = Array.from(filteredGroupMap.values());
        }
        
        // 清除並重繪
        svg.selectAll(".x-axis").remove();
        svg.selectAll(".y-axis").remove();
        svg.selectAll(".x-axis-label").remove();
        svg.selectAll(".y-axis-label").remove();
        svg.selectAll(".x-group-label").remove();
        svg.selectAll(".x-group-separator").remove();
        innerContent.selectAll(".bar-group").remove();
        
        drawXAxis(svg, xScale, [], filteredXScaleGroup, fontSize);
        drawYAxis(svg, yScale, fontSize);
        drawBars(innerContent, xScale, yScale, filteredData, colorMap);
        
        // 清除 brush 選取框
        brushContent.call(brush.move, null);
      });
    }
  );
  
  brushContent = innerContent.append("g").call(brush);
}

// Reset 功能
function reset() {
  resetZoom(createChart);
}

// 生命週期
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

// 暴露方法
defineExpose({
  reset,
  createChart
});
</script>

<style scoped>
/* 圖表容器樣式 */
</style>
