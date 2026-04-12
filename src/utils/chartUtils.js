// filepath: c:\Users\U01782\Desktop\最新上船用\kanban-dashboard\src\utils\chartUtils.js
import * as d3 from "d3";

// 顏色陣列
const colorArray = [
  "#CC3333",
  "#00BB00",
  "#663366",
  "#CCCC99",
  "#666666",
  "#ff7f50",
  "#FF6666",
  "#0066CC",
  "#333333",
  "#336633",
  "#990033",
  "#CC9966",
  "#d2691e",
  "#FF0033",
  "#408080",
  "#003399",
  "#99CC00",
  "#999933",
  "#333300",
  "#CCFF99",
  "#99CCFF",
  "#FF9966",
  "#336699",
  "#CCCC33",
  "#996600",
  "#FFCC33",
  "#336666",
  "#0099CC",
  "#FFCC00",
  "#CC6699",
  "#3366CC",
  "#009966",
  "#FF6600",
  "#FFFF66",
  "#99CC99",
  "#FFFF99",
  "#CC0033",
  "#993333",
  "#FFFF00",
  "#FF9900",
  "#FFFF00",
  "#FF9933",
  "#FFCC99",
];

export function getColor(index) {
  return colorArray[index % colorArray.length];
}

export function drawTotalLegend(container, problemTypes, getColorFn) {
  if (!container || !problemTypes || problemTypes.length === 0) {
    console.warn("drawTotalLegend: 容器或問題類型為空", {
      container,
      problemTypes,
    });
    return;
  }

  console.log("drawTotalLegend 開始繪製，問題類型數量:", problemTypes.length);

  // 清空容器中的所有內容
  d3.select(container).selectAll("*").remove();

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", problemTypes.length * 30 + 20)
    .style("font-size", "12px")
    ;

  const legendGroup = svg.append("g").attr("class", "total-legend");

  problemTypes.forEach((key, index) => {
    const legendItem = legendGroup
      .append("g")
      .attr("transform", `translate(10, ${10 + index * 30})`)
      .attr("data-index", index)
      .style("cursor", "pointer")
      .on("mouseover", function () {
        const targetIndex = +d3.select(this).attr("data-index");
        const targetColor = getColorFn(targetIndex);

        // 高亮當前圖例項目
        d3.select(this).select("text").style("font-weight", "bold");

        // 高亮所有圖表中對應顏色的條狀圖
        d3.selectAll(".stack rect").style("opacity", function () {
          const fillColor = d3.select(this).attr("fill");
          return fillColor === targetColor ? 1 : 0.2;
        });
      })
      .on("mouseout", function () {
        // 恢復圖例文字
        d3.select(this).select("text").style("font-weight", "normal");

        // 恢復所有條狀圖
        d3.selectAll(".stack rect").style("opacity", 1);
      });

    // 色塊
    legendItem
      .append("rect")
      .attr("width", 16)
      .attr("height", 16)
      .attr("rx", 3)
      .attr("fill", getColorFn(index))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // 文字
    legendItem
      .append("text")
      .attr("x", 22)
      .attr("y", 8)
      .attr("dy", "0.35em")
      .text(key)
      .style("font-size", "14px")
      .style("fill", "#333");
  });

  console.log("drawTotalLegend 繪製完成");
}
