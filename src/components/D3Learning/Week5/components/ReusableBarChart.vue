<template>
  <div ref="containerRef" class="bar-chart" :style="{ width: width + 'px', height: height + 'px' }">
    <svg ref="svgRef" :width="width" :height="height">
      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- ✅ 企業級建議：不要在 template 直接 v-for rect/text。
             marks 交由 D3 data-join 渲染（enter/update/exit），才好擴充/換 renderer。 -->
        <g ref="gridLayerRef"></g>
        <g ref="barsLayerRef"></g>
        <g ref="labelsLayerRef"></g>
        <g ref="xAxisRef" :transform="`translate(0, ${chartHeight})`"></g>
        <g ref="yAxisRef"></g>
        <g ref="titleLayerRef"></g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  data: { type: Array, required: true },
  width: { type: Number, default: 600 },
  height: { type: Number, default: 400 },
  margin: { 
    type: Object, 
    default: () => ({ top: 40, right: 20, bottom: 60, left: 60 })
  },
  xValue: { type: Function, default: d => d.name },
  yValue: { type: Function, default: d => d.value },
  keyFn: { type: Function, default: d => d.name },
  colorScale: { type: [String, Function], default: 'steelblue' },
  title: { type: String, default: '' },
  showLabels: { type: Boolean, default: false },
  formatValue: { type: Function, default: v => v },

  // ✅ 企業級延展點：允許注入 scale / axis factory
  xScaleFactory: { type: Function, default: null },
  yScaleFactory: { type: Function, default: null },
  xAxisFactory: { type: Function, default: null },
  yAxisFactory: { type: Function, default: null }
});

const emit = defineEmits([
  'bar-click',
  'bar-hover',
  'tooltip-show',
  'tooltip-move',
  'tooltip-hide'
]);

const containerRef = ref(null);
const svgRef = ref(null);
const gridLayerRef = ref(null);
const barsLayerRef = ref(null);
const labelsLayerRef = ref(null);
const titleLayerRef = ref(null);
const xAxisRef = ref(null);
const yAxisRef = ref(null);

const chartWidth = computed(() => props.width - props.margin.left - props.margin.right);
const chartHeight = computed(() => props.height - props.margin.top - props.margin.bottom);

const xScale = computed(() => {
  if (typeof props.xScaleFactory === 'function') {
    return props.xScaleFactory({
      d3,
      data: props.data,
      xValue: props.xValue,
      width: chartWidth.value
    });
  }

  return d3.scaleBand()
    .domain(props.data.map(props.xValue))
    .range([0, chartWidth.value])
    .padding(0.2)
});

const yScale = computed(() => {
  if (typeof props.yScaleFactory === 'function') {
    return props.yScaleFactory({
      d3,
      data: props.data,
      yValue: props.yValue,
      height: chartHeight.value
    });
  }

  return d3.scaleLinear()
    .domain([0, d3.max(props.data, props.yValue) || 100])
    .range([chartHeight.value, 0])
    .nice()
});

const getBarColor = (d) => {
  if (typeof props.colorScale === 'function') {
    return props.colorScale(d);
  }
  return props.colorScale;
};

const buildTooltipPosition = (event) => {
  const rect = containerRef.value?.getBoundingClientRect?.();

  const pageX = event.clientX;
  const pageY = event.clientY;
  const containerX = rect ? pageX - rect.left : null;
  const containerY = rect ? pageY - rect.top : null;
  const plotX = containerX !== null ? containerX - props.margin.left : null;
  const plotY = containerY !== null ? containerY - props.margin.top : null;

  return { pageX, pageY, containerX, containerY, plotX, plotY };
};

const renderTitle = () => {
  if (!titleLayerRef.value) return;

  const g = d3.select(titleLayerRef.value);
  const titleData = props.title ? [props.title] : [];

  g.selectAll('text.chart-title')
    .data(titleData)
    .join(
      (enter) => enter.append('text').attr('class', 'chart-title'),
      (update) => update,
      (exit) => exit.remove()
    )
    .attr('x', chartWidth.value / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .attr('fill', 'currentColor')
    .attr('class', 'chart-title text-gray-800')
    .text((d) => d);
};

const renderBars = () => {
  if (!barsLayerRef.value) return;

  const g = d3.select(barsLayerRef.value);

  g.selectAll('rect.bar')
    .data(props.data, props.keyFn)
    .join(
      // 1. Enter: 設定初始狀態 (從底部長出來)
      (enter) => enter.append('rect')
        .attr('class', 'bar')
        .attr('y', chartHeight.value)
        .attr('height', 0)
        .on('mouseenter', (event, d) => {
          emit('bar-hover', d);
          emit('tooltip-show', { position: buildTooltipPosition(event), data: d });
        })
        .on('mousemove', (event, d) => {
          emit('tooltip-move', { position: buildTooltipPosition(event), data: d });
        })
        .on('mouseleave', () => emit('tooltip-hide'))
        .on('click', (_event, d) => emit('bar-click', d)),
      
      // 2. Update: 直接回傳即可，動畫統一在 Merge 階段處理
      (update) => update,

      // 3. Exit: 離場動畫 (縮回底部後消失)
      (exit) => exit
        .remove() 
    )
    // 4. Merge (Enter + Update): 關鍵在這裡！
    // 在這裡呼叫 .transition()，會同時套用到「剛進場的新元素」和「需要更新的舊元素」
    .transition()
    .duration(500)
    .ease(d3.easeCubicOut) // 加入緩動效果，讓動畫更自然
    .attr('x', (d) => xScale.value(props.xValue(d)))
    .attr('width', xScale.value.bandwidth())
    .attr('y', (d) => yScale.value(props.yValue(d)))
    .attr('height', (d) => chartHeight.value - yScale.value(props.yValue(d)))
    .attr('fill', (d) => getBarColor(d));
};

const renderLabels = () => {
  if (!labelsLayerRef.value) return;

  const g = d3.select(labelsLayerRef.value);
  const labelData = props.showLabels ? props.data : [];

  g.selectAll('text.value-label')
    .data(labelData, props.keyFn)
    .join(
      (enter) => enter.append('text').attr('class', 'value-label'),
      (update) => update,
      (exit) => exit.remove()
    )
    .transition()
    .duration(500)
    .ease(d3.easeCubicOut) // 加入緩動效果，讓動畫更自然
    .attr('x', (d) => xScale.value(props.xValue(d)) + xScale.value.bandwidth() / 2)
    .attr('y', (d) => yScale.value(props.yValue(d)) - 5)
    .attr('text-anchor', 'middle')
    .attr('fill', 'currentColor')
    .attr('class', 'value-label text-gray-700')
    .attr('font-size', 12)
    .text((d) => props.formatValue(props.yValue(d)));
};

const renderAxes = () => {
  if (xAxisRef.value) {
    const axis = typeof props.xAxisFactory === 'function'
      ? props.xAxisFactory({ d3, xScale: xScale.value })
      : d3.axisBottom(xScale.value);

    d3.select(xAxisRef.value).call(axis);
  }

  if (yAxisRef.value) {
    const axis = typeof props.yAxisFactory === 'function'
      ? props.yAxisFactory({ d3, yScale: yScale.value })
      : d3.axisLeft(yScale.value).ticks(5);

    d3.select(yAxisRef.value).call(axis);
  }
};

watchEffect(() => {
  renderAxes();
  renderBars();
  renderLabels();
  renderTitle();
});
</script>

<style scoped>
.bar-chart {
  position: relative;
}

.bar {
  cursor: pointer;
}

.bar:hover {
  opacity: 0.8;
}

</style>
