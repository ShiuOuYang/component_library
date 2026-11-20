/**
 * 圖表外框：網格、座標軸、標題、圖例
 * @internal
 */
import * as d3 from 'd3'
import { chartTheme } from '../../chartTheme'
import { isBandScale } from '../../types/chart.types'
import { layerLabel as layerLabelOf } from '../faceChart/facetHelpers'
import { resolveSeriesColor } from './helpers'
import type { LegendItem } from './types'
import type { DualAxisContext } from './context'

export function useFrameRenderers(ctx: DualAxisContext) {
  const { props, i18n, gridLayerRef, xAxisRef, yAxisLeftRef, yAxisRightRef, titleLayerRef, legendLayerRef, xScale, yLeftScale, yRightScale, xTickCount, yTickCount, chartWidth, chartHeight, effectiveAnimationDuration, animate } = ctx

  /**
   * 渲染圖表背景網格線
   * 
   * @description 根據左側 Y 軸的刻度繪製水平網格線，提供視覺參考輔助線。
   *              網格線會橫跨整個圖表寬度，並在 showGrid 為 false 時不顯示。
   * 
   * @returns {void} 無回傳值，直接操作 DOM 元素
   * 
   * @example
   * // 當 props.showGrid 為 true 且存在左 Y 軸時，會自動渲染網格線
   * renderGrid();
   */
  const renderGrid = () => {
    if (!gridLayerRef.value) return;

    const g = d3.select(gridLayerRef.value);

    // ✅ 如果不顯示網格，移除所有網格線
    if (!props.showGrid) {
      g.selectAll('*').remove();
      return;
    }

    // Y 軸網格線
    if (yLeftScale.value) {
      // tickFormat 要傳函式；原本傳字串 '' 只是碰巧被 d3 忽略
      const gridLeft = d3
        .axisLeft<number>(yLeftScale.value)
        .ticks(yTickCount.value)
        .tickSize(-chartWidth.value)
        .tickFormat(() => '');

      g.selectAll<SVGGElement, null>('.grid-left')
        .data([null])
        .join('g')
        .attr('class', 'grid-left')
        .call(gridLeft)
        .selectAll('line')
        .style('stroke', chartTheme.grid)
        .attr('stroke-opacity', 0.5);
    }

    // 移除 domain 線
    g.selectAll('.domain').remove();
  };

  /**
   * 渲染圖表的三個座標軸
   * 
   * @description 繪製 X 軸、左 Y 軸和右 Y 軸，並應用自定義的刻度格式化函式。
   *              使用 D3 的過渡動畫平滑更新座標軸變化（Brush 縮放時會禁用動畫以提升性能）。
   * 
   * @returns {void} 無回傳值，直接操作 SVG DOM 元素
   * 
   * @example
   * // 根據當前的 xScale, yLeftScale, yRightScale 自動渲染座標軸
   * renderAxes();
   */
  const renderAxes = () => {
    // X 軸
    if (xAxisRef.value && xScale.value) {
      // XScale 是 band / 連續型的聯集，d3.axisBottom 需要一個具體的 AxisScale；
      // 兩者在座標軸的用法相同，這裡統一視為 AxisScale<d3.AxisDomain>
      const xAxis = d3.axisBottom(xScale.value as d3.AxisScale<d3.AxisDomain>);
      if (!isBandScale(xScale.value)) {
        xAxis.ticks(xTickCount.value);
      } else {
        // 🔧 類別很多時（例如 10 萬個）只標一部分：原本每個類別一個刻度，10 萬個 <text> 直接卡死頁面
        const categories = xScale.value.domain();
        const maxTicks = Math.max(xTickCount.value, Math.floor(chartWidth.value / 20));
        if (categories.length > maxTicks) {
          const step = Math.ceil(categories.length / maxTicks);
          xAxis.tickValues(categories.filter((_c, i) => i % step === 0));
        }
      }
      if (props.xAxisFormat) {
        const format = props.xAxisFormat as unknown as (value: d3.AxisDomain) => string;
        xAxis.tickFormat((value) => format(value));
      }

      animate(d3.select(xAxisRef.value), effectiveAnimationDuration.value, d3.easeCubic)
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', props.xAxisLabelRotate !== 0 ? 'end' : 'middle')
        .attr('dx', props.xAxisLabelRotate !== 0 ? '-.8em' : '0')
        .attr('dy', props.xAxisLabelRotate !== 0 ? '.15em' : '.71em')
        .attr('transform', `rotate(${props.xAxisLabelRotate})`);
    }

    // 左 Y 軸
    if (yAxisLeftRef.value && yLeftScale.value) {
      const yAxis = d3.axisLeft<number>(yLeftScale.value).ticks(yTickCount.value);
      if (props.yLeftAxisFormat) {
        const format = props.yLeftAxisFormat;
        yAxis.tickFormat((value) => format(Number(value)));
      }

      animate(d3.select(yAxisLeftRef.value), effectiveAnimationDuration.value, d3.easeCubic)
        .call(yAxis);
    }

    // 右 Y 軸
    if (yAxisRightRef.value && yRightScale.value) {
      const yAxis = d3.axisRight<number>(yRightScale.value).ticks(yTickCount.value);
      if (props.yRightAxisFormat) {
        const format = props.yRightAxisFormat;
        yAxis.tickFormat((value) => format(Number(value)));
      }

      animate(d3.select(yAxisRightRef.value), effectiveAnimationDuration.value, d3.easeCubic)
        .call(yAxis);
    }
  };

  /**
   * 渲染圖表標題
   * 
   * @description 在圖表頂部中央顯示標題文字。標題樣式使用 Tailwind CSS 類別。
   *              當 props.title 為空時不顯示標題。
   * 
   * @returns {void} 無回傳值，直接操作 SVG DOM 元素
   * 
   * @example
   * // 當 props.title = '銷售趨勢分析' 時，會在圖表上方顯示標題
   * renderTitle();
   */
  const renderTitle = () => {
    if (!titleLayerRef.value) return;

    const g = d3.select(titleLayerRef.value);
    const titleData = props.title ? [props.title] : [];

    g.selectAll('text.chart-title')
      .data(titleData)
      .join(
        enter => enter.append('text').attr('class', 'chart-title'),
        update => update,
        exit => exit.remove()
      )
      .attr('x', chartWidth.value / 2)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('class', 'chart-title text-xl font-semibold text-content-primary')
      .text(d => d);
  };

  /**
   * 渲染圖表圖例
   * 
   * @description 在圖表右上角顯示所有圖層的圖例項目。
   *              堆疊圖會顯示每個堆疊系列的顏色方塊，折線圖會顯示線條樣式。
   *              支援通過 layer.legend.show 控制是否顯示特定圖層的圖例。
   * 
   * @returns {void} 無回傳值，直接操作 SVG DOM 元素
   * 
   * @example
   * // 自動收集所有圖層的圖例配置並渲染
   * renderLegend();
   */
  const renderLegend = () => {
    if (!legendLayerRef.value) return;

    const g = d3.select(legendLayerRef.value);
    const legendItems: LegendItem[] = [];

    // 收集所有需要圖例的項目
    props.layers.forEach(layer => {
      if (layer.legend?.show !== false) {
        if (layer.type === 'stacked-bar' && layer.stackKeys) {
          layer.stackKeys.forEach((key, i) => {
            const color = resolveSeriesColor(layer.colorScale, key, i);
            legendItems.push({ label: key, color, type: 'rect' });
          });
        } else if (layer.type === 'bar') {
          legendItems.push({ label: layerLabelOf(layer, i18n.value), color: layer.color || '#3b82f6', type: 'rect' });
        } else if (layer.type === 'line' || layer.type === 'area') {
          legendItems.push({
            label: layer.legend?.label || layer.name || 'Line',
            color: layer.lineColor || layer.color || '#ef4444',
            type: 'line'
          });
        } else if (layer.type === 'scatter') {
          legendItems.push({
            label: layer.legend?.label || 'Scatter',
            color: layer.dotColor || '#3b82f6',
            type: 'scatter',
            dotSize: layer.dotSize || 4
          });
        }
      }
    });

    // ✅ 收集 Trigger 線圖例
    props.triggerLines.forEach(triggerLine => {
      if (triggerLine.showInLegend !== false && triggerLine.label) {
        legendItems.push({
          label: triggerLine.label,
          color: triggerLine.color || '#9ca3af',
          type: 'trigger-line',
          strokeDasharray: triggerLine.strokeDasharray
        });
      }
    });

    const itemWidth = 100;
    // ✅ 圖例放置在圖表下方，水平居中
    const totalWidth = legendItems.length * itemWidth;
    const startX = (chartWidth.value - totalWidth) / 2;
    const startY = chartHeight.value + 30; // 圖表底部下方 30px

    g.selectAll<SVGGElement, LegendItem>('g.legend-item')
      .data(legendItems)
      .join(
        enter => {
          const item = enter.append('g').attr('class', 'legend-item');
          item.append('rect').attr('class', 'legend-symbol');
          item.append('line').attr('class', 'legend-line');
          item.append('text').attr('class', 'legend-text');
          return item;
        },
        update => update,
        exit => exit.remove()
      )
      .attr('transform', (_d, i) => `translate(${startX + i * itemWidth}, ${startY})`)
      .each(function (this: SVGGElement, d) {
        const item = d3.select(this);
      
        if (d.type === 'rect') {
          item.select('.legend-symbol')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d.color);
          item.select('.legend-line').remove();
        } else if (d.type === 'trigger-line') {
          // ✅ Trigger 線樣式（支援虛線）
          item.select('.legend-line')
            .attr('x1', 0)
            .attr('x2', 15)
            .attr('y1', 7)
            .attr('y2', 7)
            .attr('stroke', d.color)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', d.strokeDasharray || null);
          item.select('.legend-symbol').remove();
        } else if (d.type === 'scatter') {
          // ✅ 散點圖樣式
          item.select('.legend-symbol')
            .attr('cx', 7.5)
            .attr('cy', 7.5)
            .attr('r', d.dotSize || 4)
            .attr('fill', d.color)
            .attr('fill-opacity', 0.7)
            .style('stroke', chartTheme.surface)
            .attr('stroke-width', 1);
          // 將 rect 改為 circle
          const symbol = item.select('.legend-symbol');
          if ((symbol.node() as Element | null)?.tagName === 'rect') {
            symbol.remove();
            item.insert('circle', '.legend-text')
              .attr('class', 'legend-symbol')
              .attr('cx', 7.5)
              .attr('cy', 7.5)
              .attr('r', d.dotSize || 4)
              .attr('fill', d.color)
              .attr('fill-opacity', 0.7)
              .style('stroke', chartTheme.surface)
              .attr('stroke-width', 1);
          }
          item.select('.legend-line').remove();
        } else {
          item.select('.legend-line')
            .attr('x1', 0)
            .attr('x2', 15)
            .attr('y1', 7)
            .attr('y2', 7)
            .attr('stroke', d.color)
            .attr('stroke-width', 2);
          item.select('.legend-symbol').remove();
        }

        item.select('.legend-text')
          .attr('x', 20)
          .attr('y', 12)
          .attr('class', 'legend-text text-sm text-content-primary')
          .text(d.label);
      });
  };

  return { renderGrid, renderAxes, renderTitle, renderLegend }
}
