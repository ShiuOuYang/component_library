/**
 * 連動高亮（highlightKey）：標出對到的點與長條、淡化其餘的 SVG 元素
 * 換高亮時只重畫標記，不整張圖重繪
 * @internal
 */
import { computed, watch } from 'vue'
import * as d3 from 'd3'
import { chartTheme } from '../../chartTheme'
import type { ChartDatum, ChartLayer } from '../../types/chart.types'
import { datumKey, normalizeKey } from './helpers'
import type { BoundDatum, HighlightMark } from './types'
import type { DualAxisContext } from './context'

export function useHighlight(ctx: DualAxisContext) {
  const { props, stackedBarLayerRef, lineLayerRef, highlightLayerRef } = ctx

  /** 正規化後的 highlightKey；null 代表沒有高亮 */
  const activeHighlightKey = computed(() => normalizeKey(props.highlightKey));

  /**
   * 目前的高亮鍵（一般變數，不是響應式）。
   * ✅ 主渲染迴圈讀它不會建立依賴：換高亮只重畫標記與淡化，
   *    不會整張圖重繪（長條會從 0 重新長一次動畫，表格滑過時一直閃）
   */
  let highlightTarget: string | null = null;

  /**
   * 各圖層渲染時登記的「找出某個鍵的標記位置」函式。
   * 閉包裡握著當輪的比例尺與資料，換高亮時不必重跑渲染就能算出位置；每次重繪重建。
   */
  let highlightSources: Array<(target: string) => HighlightMark[]> = [];

  /** 每一輪渲染開始時清空（各圖層渲染時重新登記） */
  function resetHighlightSources(): void {
    highlightSources = [];
  }

  /** 圖層登記「找出某個鍵的標記位置」的函式 */
  function addHighlightSource(find: (target: string) => HighlightMark[]): void {
    highlightSources.push(find);
  }

  /**
   * 畫出高亮標記，並淡化其餘的 SVG 資料元素（Canvas 上的資料不淡化，只畫標記）。
   * 在所有圖層渲染完之後、以及 highlightKey 改變時呼叫。
   */
  const renderHighlight = () => {
    const target = highlightTarget;

    // SVG 元素：依綁定的 key 切換 class
    for (const layerEl of [stackedBarLayerRef.value, lineLayerRef.value]) {
      if (!layerEl) continue;
      d3.select(layerEl)
        .selectAll<SVGElement, BoundDatum | undefined>('.bar, .stacked-bar, .line-dot, .scatter-dot')
        .classed('is-highlighted', (d) => target !== null && d?.key === target)
        .classed('is-dimmed', (d) => target !== null && d?.key !== target);
    }

    if (!highlightLayerRef.value) return;
    const g = d3.select(highlightLayerRef.value);
    const marks = target === null ? [] : highlightSources.flatMap((find) => find(target));
    const points = marks.filter((m): m is Extract<HighlightMark, { kind: 'point' }> => m.kind === 'point');
    const rects = marks.filter((m): m is Extract<HighlightMark, { kind: 'rect' }> => m.kind === 'rect');

    // 點：外圈光暈 + 實心點（與 hover 標記區隔）
    g.selectAll('circle.highlight-ring')
      .data(points)
      .join('circle')
      .attr('class', 'highlight-ring')
      .attr('cx', (m) => m.x)
      .attr('cy', (m) => m.y)
      .attr('r', (m) => m.r + 4)
      .attr('fill', 'none')
      .attr('stroke', (m) => m.color)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.45);
    g.selectAll('circle.highlight-point')
      .data(points)
      .join('circle')
      .attr('class', 'highlight-point')
      .attr('cx', (m) => m.x)
      .attr('cy', (m) => m.y)
      .attr('r', (m) => m.r)
      .attr('fill', (m) => m.color)
      .style('stroke', chartTheme.surface)
      .attr('stroke-width', 2);

    g.selectAll('rect.highlight-rect')
      .data(rects)
      .join('rect')
      .attr('class', 'highlight-rect')
      .attr('x', (m) => m.x)
      .attr('y', (m) => m.y)
      .attr('width', (m) => Math.max(1, m.w))
      .attr('height', (m) => Math.max(1, m.h))
      .attr('fill', 'none')
      .style('stroke', chartTheme.text)
      .attr('stroke-width', 2);
  };

  /** 登記一批點（折線、散點）的高亮來源 */
  function registerPointHighlights(
    layer: ChartLayer,
    data: ChartDatum[],
    xPos: (d: ChartDatum) => number | undefined,
    yPos: (d: ChartDatum) => number,
    color: string,
    radius: number
  ): void {
    highlightSources.push((target) => {
      const marks: HighlightMark[] = [];
      data.forEach((d, i) => {
        if (datumKey(layer, d, i) !== target) return;
        const x = xPos(d);
        const y = yPos(d);
        if (x === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return;
        marks.push({ kind: 'point', x, y, r: radius, color });
      });
      return marks;
    });
  }

  // highlightKey 改變時只重畫高亮（見 highlightTarget 的說明）
  watch(
    activeHighlightKey,
    (key) => {
      highlightTarget = key;
      renderHighlight();
    },
    { immediate: true }
  );

  return { renderHighlight, registerPointHighlights, addHighlightSource, resetHighlightSources }
}
