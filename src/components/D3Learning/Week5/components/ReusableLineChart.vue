<template>
  <div ref="containerRef" class="line-chart">
    <svg ref="svgRef" :width="width" :height="height">
      <defs>
        <!-- 漸層定義（可選） -->
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
        </linearGradient>
      </defs>

      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- ✅ 企業級：template 只保留 scaffold + layers。
             grid/area/line/dots 交給 D3 data-join 渲染（enter/update/exit），擴充性最好。 -->
        <g ref="gridLayerRef" class="grid"></g>
        <g ref="areaLayerRef"></g>
        <g ref="lineLayerRef"></g>
        <g ref="dotsLayerRef"></g>
        <g ref="xAxisRef" :transform="`translate(0, ${chartHeight})`"></g>
        <g ref="yAxisRef"></g>
      </g>
    </svg>

    <!-- ✅ 企業級建議：Tooltip 用外部 Teleport 統一呈現。
         圖表元件只 emit tooltip-show/move/hide（包含 position 多座標系）。 -->
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
    default: () => ({ top: 20, right: 20, bottom: 60, left: 60 })
  },
  xValue: { type: Function, required: true },
  yValue: { type: Function, required: true },
  lineColor: { type: String, default: '#3b82f6' },
  lineWidth: { type: Number, default: 2 },
  showDots: { type: Boolean, default: true },
  dotRadius: { type: Number, default: 4 },
  showArea: { type: Boolean, default: false },
  showGrid: { type: Boolean, default: true },
  formatX: { type: Function, default: v => v },
  formatY: { type: Function, default: v => v },

  // ✅ 延展點：可注入 scale / axis / generator
  xScaleFactory: { type: Function, default: null },
  yScaleFactory: { type: Function, default: null },
  xAxisFactory: { type: Function, default: null },
  yAxisFactory: { type: Function, default: null },
  lineGeneratorFactory: { type: Function, default: null },
  areaGeneratorFactory: { type: Function, default: null },
  keyFn: { type: Function, default: (_d, i) => i }
});

const emit = defineEmits([
  'point-hover',
  'point-click',
  'tooltip-show',
  'tooltip-move',
  'tooltip-hide'
]);

const containerRef = ref(null);
const svgRef = ref(null);
const gridLayerRef = ref(null);
const areaLayerRef = ref(null);
const lineLayerRef = ref(null);
const dotsLayerRef = ref(null);
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

  return d3.scaleTime()
    .domain(d3.extent(props.data, props.xValue))
    .range([0, chartWidth.value]);
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
    .nice();
});

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

const renderGrid = () => {
  if (!gridLayerRef.value) return;
  const g = d3.select(gridLayerRef.value);

  const ticks = props.showGrid ? yScale.value.ticks(5) : [];

  g.selectAll('line.grid-line')
    .data(ticks, (d) => d)
    .join(
      (enter) => enter.append('line').attr('class', 'grid-line'),
      (update) => update,
      (exit) => exit.remove()
    )
    .attr('x1', 0)
    .attr('x2', chartWidth.value)
    .attr('y1', (d) => yScale.value(d))
    .attr('y2', (d) => yScale.value(d))
    .attr('stroke', '#e5e7eb')
    .attr('stroke-dasharray', '2,2');
};

const renderArea = () => {
  if (!areaLayerRef.value) return;
  const g = d3.select(areaLayerRef.value);

  const areaData = props.showArea ? [props.data] : [];
  const areaGen = typeof props.areaGeneratorFactory === 'function'
    ? props.areaGeneratorFactory({ d3, xScale: xScale.value, yScale: yScale.value, chartHeight: chartHeight.value, xValue: props.xValue, yValue: props.yValue })
    : d3.area()
      .x((d) => xScale.value(props.xValue(d)))
      .y0(chartHeight.value)
      .y1((d) => yScale.value(props.yValue(d)))
      .curve(d3.curveMonotoneX);

  g.selectAll('path.area')
    .data(areaData)
    .join(
      (enter) => enter.append('path').attr('class', 'area'),
      (update) => update,
      (exit) => exit.remove()
    )
    .attr('d', (d) => areaGen(d))
    .attr('fill', 'url(#lineGradient)');
};

const renderLine = () => {
  if (!lineLayerRef.value) return;
  const g = d3.select(lineLayerRef.value);

  const lineGen = typeof props.lineGeneratorFactory === 'function'
    ? props.lineGeneratorFactory({ d3, xScale: xScale.value, yScale: yScale.value, xValue: props.xValue, yValue: props.yValue })
    : d3.line()
      .x((d) => xScale.value(props.xValue(d)))
      .y((d) => yScale.value(props.yValue(d)))
      .curve(d3.curveMonotoneX);

  g.selectAll('path.line')
    .data([props.data])
    .join(
      (enter) => enter.append('path').attr('class', 'line'),
      (update) => update,
      (exit) => exit.remove()
    )
    .attr('d', (d) => lineGen(d))
    .attr('fill', 'none')
    .attr('stroke', props.lineColor)
    .attr('stroke-width', props.lineWidth);
};

const renderDots = () => {
  if (!dotsLayerRef.value) return;
  const g = d3.select(dotsLayerRef.value);
  const dotData = props.showDots ? props.data : [];

  const dots = g.selectAll('circle.dot').data(dotData, props.keyFn);
  const enter = dots.enter().append('circle').attr('class', 'dot');

  enter
    .on('mouseenter', (event, d) => {
      emit('point-hover', d);
      emit('tooltip-show', { position: buildTooltipPosition(event), data: d });
    })
    .on('mousemove', (event, d) => {
      emit('tooltip-move', { position: buildTooltipPosition(event), data: d });
    })
    .on('mouseleave', () => {
      emit('tooltip-hide');
    })
    .on('click', (_event, d) => {
      emit('point-click', d);
    });

  dots
    .merge(enter)
    .attr('cx', (d) => xScale.value(props.xValue(d)))
    .attr('cy', (d) => yScale.value(props.yValue(d)))
    .attr('r', props.dotRadius)
    .attr('fill', props.lineColor);

  dots.exit().remove();
};

const renderAxes = () => {
  if (xAxisRef.value) {
    const axis = typeof props.xAxisFactory === 'function'
      ? props.xAxisFactory({ d3, xScale: xScale.value })
      : d3.axisBottom(xScale.value).ticks(6);

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
  renderGrid();
  renderArea();
  renderLine();
  renderDots();
});
</script>

<style scoped>
.line-chart {
  position: relative;
}

.line {
  transition: stroke-width 0.3s;
}

.line:hover {
  stroke-width: 4;
}

.dot {
  cursor: pointer;
  transition: r 0.2s;
}

.dot:hover {
  r: 6;
}
</style>
