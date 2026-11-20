/**
 * 資料圖層：長條、堆疊長條、折線 / 面積、散點、參考線（trigger line）
 * @internal
 */
import * as d3 from 'd3'
import { chartTheme } from '../../chartTheme'
import { isBandScale } from '../../types/chart.types'
import type { ChartDatum, ChartLayer } from '../../types/chart.types'
import type { TriggerLine } from '../faceChart/useFacetLayout'
import { layerLabel as layerLabelOf } from '../faceChart/facetHelpers'
import { minMaxDownsample } from '../../utils/largeData'
import { continuousBarWidth, datumKey, makeAccessors, makeKeyFn, resolveSeriesColor } from './helpers'
import type { BoundDatum, HighlightMark } from './types'
import type { LayerRendererDeps } from './context'
import type { DualAxisContext } from './context'

export function useLayerRenderers(ctx: DualAxisContext, deps: LayerRendererDeps) {
  const { props, emit, i18n, stackedBarLayerRef, lineLayerRef, triggerLineLayerRef, xScale, yLeftScale, yRightScale, processedLeftLayers, processedRightLayers, chartWidth, chartHeight, effectiveAnimationDuration, animate } = ctx
  const { handleLayerHover, handleLayerLeave, addHighlightSource, registerPointHighlights, isLargeLayer, projectPoints, drawPointsOnCanvas, createRectBatch, drawRectsOnCanvas, registerLargeHits } = deps

  /**
   * 渲染一般長條圖圖層（type: 'bar'）
   *
   * @description ChartLayerType 一直宣告了 'bar'，但原本沒有任何渲染程式 ——
   *              設定 type:'bar' 的圖層（例如分面圖的「產量」）整層不見，也不會報錯。
   *              - band X 軸：同一類別有多個 bar 圖層時並排（dodge）
   *              - 連續 X 軸（time / linear）：以資料點為中心，寬度依點距自動計算
   *              - 可掛左軸或右軸；負值往基準線下方畫
   */
  const renderSimpleBars = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    layers: ChartLayer[]
  ) => {
    const xs = xScale.value;
    if (!xs) return;
    const band = isBandScale(xs);

    // 連續 X 軸：所有 bar 圖層共用一個寬度，避免不同圖層粗細不一
    const allPositions = band ? [] : layers.flatMap((layer) =>
      (layer.data ?? []).map((d) => (xs as d3.ScaleContinuousNumeric<number, number>)(Number(layer.xValue?.(d))))
    );
    const fullWidth = band ? (xs as d3.ScaleBand<string>).bandwidth() : continuousBarWidth(allPositions);
    const slotWidth = fullWidth / layers.length;

    layers.forEach((layer, layerIndex) => {
      const { data, xValue, yValue, yAxis } = layer;
      const ys = yAxis === 'right' ? yRightScale.value : yLeftScale.value;
      if (!data || !data.length || !xValue || !yValue || !ys) return;

      const [d0, d1] = ys.domain() as [number, number];
      const baseValue = Math.min(Math.max(0, Math.min(d0, d1)), Math.max(d0, d1));
      const baseY = ys(baseValue);
      const color = layer.color || resolveSeriesColor(layer.colorScale, layerLabelOf(layer, i18n.value), layerIndex);
      const barX = (d: ChartDatum): number | undefined => {
        const raw = xValue(d);
        const start = band
          ? (xs as d3.ScaleBand<string>)(String(raw))
          : (xs as d3.ScaleContinuousNumeric<number, number>)(Number(raw)) - fullWidth / 2;
        return start === undefined || !Number.isFinite(start) ? undefined : start + slotWidth * layerIndex;
      };
      const barW = Math.max(1, slotWidth - (layers.length > 1 ? 1 : 0));

      addHighlightSource((target) => {
        const marks: HighlightMark[] = [];
        data.forEach((d, i) => {
          if (datumKey(layer, d, i) !== target) return;
          const x = barX(d);
          const v = Number(yValue(d));
          if (x === undefined || !Number.isFinite(v)) return;
          const y = ys(v);
          marks.push({ kind: 'rect', x, y: Math.min(y, baseY), w: barW, h: Math.abs(baseY - y) });
        });
        return marks;
      });

      // ✅ 大量資料：畫在 Canvas 上
      if (isLargeLayer(data.length)) {
        const batch = createRectBatch(data.length, [color], false);
        let count = 0;
        data.forEach((d) => {
          const x = barX(d);
          const v = Number(yValue(d));
          if (x === undefined || !Number.isFinite(v)) return;
          const y = ys(v);
          batch.data[count] = d;
          batch.x0[count] = x;
          batch.x1[count] = x + barW;
          batch.y0[count] = Math.min(y, baseY);
          batch.y1[count] = Math.max(y, baseY);
          count++;
        });
        drawRectsOnCanvas(layer, batch, count);
        return;
      }

      const layerGroup = g.append('g').attr('class', `bar-layer bar-layer-${layerIndex}`);

      data.forEach((d, i) => {
        const x = barX(d);
        const v = Number(yValue(d));
        if (x === undefined || !Number.isFinite(v)) return;

        const y = ys(v);
        const top = Math.min(y, baseY);
        const height = Math.abs(baseY - y);
        const key = datumKey(layer, d, i);
        const bar = layerGroup.append('rect')
          .attr('class', 'bar')
          .attr('x', x)
          .attr('width', barW)
          .attr('fill', color)
          .style('cursor', 'pointer')
          .datum({ rawData: d, layer, key })
          .on('mouseenter', (event: MouseEvent) => handleLayerHover(event, d, layer, undefined, key))
          .on('mouseleave', () => handleLayerLeave())
          .on('click', () => emit('layer-click', { data: d, layer, key }));

        if (effectiveAnimationDuration.value > 0) {
          bar.attr('y', baseY).attr('height', 0)
            .transition()
            .duration(effectiveAnimationDuration.value)
            .ease(d3.easeCubicOut)
            .attr('y', top)
            .attr('height', height);
        } else {
          bar.attr('y', top).attr('height', height);
        }
      });
    });
  };

  /**
   * 渲染堆疊長條圖圖層（支援 Brush 縮放）
   * 
   * @description 處理所有類型為 'stacked-bar' 的圖層，使用 D3 的 stack 佈局生成器
   *              將多個數據系列堆疊顯示。支援動畫過渡、滑鼠互動事件、自定義顏色配置。
   *              使用 composable 預處理好的數據，避免重複過濾。
   * 
   * @returns {void} 無回傳值，直接操作 SVG DOM 元素
   * 
   * @fires layer-hover - 當滑鼠懸停在長條上時觸發
   * @fires layer-click - 當點擊長條時觸發
   * 
   * @example
   * // 自動從 processedLeftLayers 中篩選出堆疊圖層並渲染
   * // 數據已經根據 Brush 範圍過濾好
   * renderStackedBars();
   */
  const renderStackedBars = () => {
    if (!stackedBarLayerRef.value) return;

    const g = d3.select(stackedBarLayerRef.value);
    // ✅ 使用預處理好的圖層（數據已過濾）
    const stackedLayers = processedLeftLayers.value.filter(l => l.type === 'stacked-bar');
    const barLayers = [...processedLeftLayers.value, ...processedRightLayers.value].filter(l => l.type === 'bar');

    // ✅ 完全清除所有內容，從頭開始渲染
    g.selectAll('*').remove();

    if (barLayers.length) renderSimpleBars(g, barLayers);
    if (!stackedLayers.length) return;

    stackedLayers.forEach((layer, layerIndex) => {
      const { data, stackKeys, xValue, colorScale } = layer;
      const xs = xScale.value;
      const yScale = yLeftScale.value;

      // 堆疊柱狀圖必須是 band scale（每根柱子佔一個類別的寬度）；
      // 缺少 xValue、stackKeys 或比例尺時無法定位，靜默跳過
      if (!data || !data.length || !stackKeys || !xValue || !yScale || !isBandScale(xs)) return;

      // D3 stack 生成器
      const stack = d3
        .stack<ChartDatum>()
        .keys(stackKeys)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

      const series = stack(data);
      const bandwidth = xs.bandwidth();

      addHighlightSource((target) => {
        const marks: HighlightMark[] = [];
        for (const seriesData of series) {
          // stack 的每個系列與原始資料同順序，dataIndex 就是資料列的位置
          seriesData.forEach((d, dataIndex) => {
            if (datumKey(layer, d.data, dataIndex) !== target) return;
            const x = xs(String(xValue(d.data)));
            const y0 = yScale(d[0]);
            const y1 = yScale(d[1]);
            if (x === undefined || !Number.isFinite(y0) || !Number.isFinite(y1) || y0 - y1 < 0) return;
            marks.push({ kind: 'rect', x, y: y1, w: Math.max(bandwidth, 0.5), h: y0 - y1 });
          });
        }
        return marks;
      });

      // ✅ 大量資料：所有段落畫在 Canvas 上，同色的一次填完
      if (isLargeLayer(data.length * stackKeys.length)) {
        const colors = series.map((sd, si) => resolveSeriesColor(colorScale, sd.key, si));
        const batch = createRectBatch(data.length * series.length, colors, true);
        let count = 0;
        series.forEach((seriesData, seriesIndex) => {
          seriesData.forEach((d) => {
            const x = xs(String(xValue(d.data)));
            const y0 = yScale(d[0]);
            const y1 = yScale(d[1]);
            if (x === undefined || !Number.isFinite(y0) || !Number.isFinite(y1) || y0 - y1 < 0) return;
            batch.data[count] = d.data;
            batch.seriesKeys![count] = seriesData.key;
            batch.colorIndex[count] = seriesIndex;
            batch.x0[count] = x;
            batch.x1[count] = x + Math.max(bandwidth, 0.5);
            batch.y0[count] = y1;
            batch.y1[count] = y0;
            count++;
          });
        });
        drawRectsOnCanvas(layer, batch, count);
        return;
      }

      // 為每個 layer 創建獨立的 group
      const layerGroup = g.append('g')
        .attr('class', `layer-${layerIndex}`);

      // 渲染每個系列
      series.forEach((seriesData, seriesIndex) => {
        const seriesKey = seriesData.key;
        // colorScale 可以是 d3 的 ordinal scale（函式）或一張查表；
        // 兩者都支援，最後退回 d3 內建色盤
        const color = resolveSeriesColor(colorScale, seriesKey, seriesIndex);

        // ✅ 直接使用 append 建立元素，完全避免 data join
        seriesData.forEach((d, dataIndex) => {
          const x = xs(String(xValue(d.data)));
          const y0 = yScale(d[0]);
          const y1 = yScale(d[1]);
          const height = y0 - y1;

          // 跳過無效數據
          if (x === undefined || !Number.isFinite(height) || height < 0) return;

          const key = datumKey(layer, d.data, dataIndex);

          const bar = layerGroup.append('rect')
            .attr('class', `layer-${layerIndex}-series-${seriesIndex} stacked-bar`)
            .attr('x', x)
            .attr('width', bandwidth)
            .attr('fill', color)
            .style('cursor', 'pointer')
            .datum({ rawData: d.data, layer, seriesKey, key })
            .on('mouseenter', function (this: SVGRectElement, event: MouseEvent) {
              const barData = d3.select(this).datum() as BoundDatum;
              handleLayerHover(event, barData.rawData, barData.layer, barData.seriesKey, barData.key);
            })
            .on('mouseleave', () => {
              handleLayerLeave();
            })
            .on('click', function (this: SVGRectElement) {
              const barData = d3.select(this).datum() as BoundDatum;
              emit('layer-click', {
                data: barData.rawData,
                layer: barData.layer,
                seriesKey: barData.seriesKey,
                // 舊版長條圖用 series 這個名稱，保留給既有的監聽端
                series: barData.seriesKey,
                key: barData.key,
              });
            });

          // ✅ 動畫處理
          if (effectiveAnimationDuration.value > 0) {
            bar.attr('y', chartHeight.value)
              .attr('height', 0)
              .transition()
              .duration(effectiveAnimationDuration.value)
              .ease(d3.easeCubicOut)
              .attr('y', y1)
              .attr('height', height);
          } else {
            bar.attr('y', y1)
              .attr('height', height);
          }
        });
      });
    });
  };

  /**
   * 渲染折線圖圖層（支援 Brush 縮放）
   * 
   * @description 處理所有類型為 'line' 的圖層，使用 D3 的 line 生成器繪製平滑曲線。
   *              支援自定義曲線類型、線條顏色、粗細，以及可選的數據點圓圈顯示。
   *              支援左右兩側 Y 軸。使用 composable 預處理好的數據，避免重複過濾。
   * 
   * @returns {void} 無回傳值，直接操作 SVG DOM 元素
   * 
   * @fires layer-hover - 當滑鼠懸停在數據點上時觸發
   * @fires layer-click - 當點擊數據點時觸發
   * 
   * @example
   * // 自動從 processedLeftLayers 和 processedRightLayers 中篩選出折線圖層並渲染
   * // 數據已經根據 Brush 範圍過濾好
   * renderLines();
   */
  const renderLines = () => {
    if (!lineLayerRef.value) return;

    const g = d3.select(lineLayerRef.value);
    // ✅ 使用預處理好的圖層（數據已過濾）- 支援左右兩側 Y 軸
    // 'area' 也走這裡：先畫半透明填色，再畫同一條線（型別一直有宣告，原本沒有渲染）
    const leftLineLayers = processedLeftLayers.value.filter(l => l.type === 'line' || l.type === 'area');
    const rightLineLayers = processedRightLayers.value.filter(l => l.type === 'line' || l.type === 'area');
    const lineLayers = [...leftLineLayers, ...rightLineLayers];

    if (!lineLayers.length) {
      g.selectAll('*').remove();
      return;
    }

    lineLayers.forEach((layer, layerIndex) => {
      const { data, xValue, yValue, lineColor, strokeWidth, showDots, curve, yAxis } = layer;

      // ✅ 根據 yAxis 選擇對應的 scale
      const ys = yAxis === 'right' ? yRightScale.value : yLeftScale.value;
      const xs = xScale.value;

      // 缺少任一必要條件就畫不出這個圖層；靜默跳過而不是產生 NaN 座標
      if (!data || !xValue || !yValue || !xs || !ys) return;

      const { xPos, yPos, isDefined } = makeAccessors(xs, ys, xValue, yValue);
      const color = lineColor || layer.color || '#ef4444';

      // ✅ 大量資料：依像素欄降採樣（每欄保留首、尾、最小、最大），畫出來與原始資料逐像素相同；
      //    原始座標留給滑鼠提示做命中測試。10 萬點的 path 從上百萬字元降到數千點
      const large = isLargeLayer(data.length);
      let drawData = data;
      if (large) {
        const { px, py } = projectPoints(data, xPos, yPos);
        drawData = minMaxDownsample(px, py).map((i) => data[i]);
        registerLargeHits({ kind: 'point', layer, data, px, py, color, radius: 5 });
      }
      // 大量資料不做 path 動畫：d3 對 path 的 d 是逐字串插值，幾千個點也很吃力
      const pathDuration = large ? 0 : effectiveAnimationDuration.value;

      // 連動高亮：不論有沒有畫圓點、是不是大量資料模式，對到的點都畫標記
      registerPointHighlights(layer, data, xPos, yPos, color, 4);

      // 面積：從基準線（0，或 domain 下緣）填到資料線
      const [yd0, yd1] = ys.domain() as [number, number];
      const areaBase = ys(Math.min(Math.max(0, Math.min(yd0, yd1)), Math.max(yd0, yd1)));
      const areaGenerator = d3
        .area<ChartDatum>()
        .defined(isDefined)
        .x((d) => xPos(d) ?? 0)
        .y0(areaBase)
        .y1(yPos)
        .curve(curve || d3.curveMonotoneX);
      animate(g.selectAll(`path.area-${layerIndex}`)
        .data(layer.type === 'area' ? [drawData] : [])
        .join(
          enter => enter.append('path')
            .attr('class', `area-${layerIndex} area`)
            .attr('stroke', 'none')
            .attr('fill-opacity', 0.18)
            .attr('d', areaGenerator),
          update => update,
          exit => exit.remove()
        )
        .attr('fill', color), pathDuration)
        .attr('d', areaGenerator);

      // 線條生成器
      const lineGenerator = d3
        .line<ChartDatum>()
        .defined(isDefined)
        .x((d) => xPos(d) ?? 0)
        .y(yPos)
        .curve(curve || d3.curveMonotoneX);
      /**       
        * 常見曲線類型：
          d3.curveLinear：直線連接（折線圖）
          d3.curveMonotoneX：平滑曲線，保證單調性（不會上下震盪）
          d3.curveStep：階梯狀（適合離散事件）
          d3.curveBasis：貝塞爾曲線（非常平滑） */

      // 渲染線條
      animate(g.selectAll(`path.line-${layerIndex}`)
        .data([drawData]) // ✅ 已過濾（大量資料時再降採樣）的 data
        .join(
          enter => enter.append('path')
            .attr('class', `line-${layerIndex} line`)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', strokeWidth || 2)
            .attr('d', lineGenerator),
          update => update,
          exit => exit.remove()
        ), pathDuration)
        .attr('d', lineGenerator)
        .attr('stroke', color)
        .attr('stroke-width', strokeWidth || 2);

      // 渲染數據點（大量資料模式不畫：數萬個圓點疊在一起只是一條粗線，hover 改用命中測試）
      if (!showDots || large) {
        g.selectAll(`circle.dot-${layerIndex}`).remove();
      } else {
        // ✅ 過濾掉會產生 NaN 的數據點
        // key 要用資料在圖層中的原始位置算，所以先配 key 再濾掉無效點
        const validData: BoundDatum[] = data
          .map((d, i) => ({ rawData: d, layer, key: datumKey(layer, d, i) }))
          .filter((b) => isDefined(b.rawData));

        animate(g.selectAll<SVGCircleElement, BoundDatum>(`circle.dot-${layerIndex}`)
          .data(validData, makeKeyFn(layer))
          .join(
            enter => enter.append('circle')
              .attr('class', `dot-${layerIndex} line-dot`)
              .attr('r', 0)
              .attr('fill', color)
              .style('stroke', chartTheme.surface)
              .attr('stroke-width', 2)
              .style('cursor', 'pointer')
              .on('mouseenter', (event: MouseEvent, d) => {
                d3.select(event.target as SVGCircleElement).attr('r', 6);
                handleLayerHover(event, d.rawData, d.layer, undefined, d.key);
              })
              .on('mouseleave', (event: MouseEvent) => {
                d3.select(event.target as SVGCircleElement).attr('r', 4);
                handleLayerLeave();
              })
              .on('click', (_event: MouseEvent, d) => {
                emit('layer-click', { data: d.rawData, layer: d.layer, key: d.key });
              }),
            update => update,
            exit => animate(exit, effectiveAnimationDuration.value / 2)
              .attr('r', 0)
              .remove()
          ))
          .attr('cx', (d) => xPos(d.rawData) ?? 0)
          .attr('cy', (d) => yPos(d.rawData))
          .attr('r', 4);
      }
    });
  };

  /**
   * 渲染散點圖圖層（支援 Brush 縮放）
   * 
   * @description 處理所有類型為 'scatter' 的圖層，繪製散點圖（僅顯示數據點，無連接線）。
   *              支援自定義點的大小、顏色、形狀等。可用於相關性分析、分佈圖等場景。
   *              支援左右兩側 Y 軸。使用 composable 預處理好的數據，避免重複過濾。
   * 
   * @returns {void} 無回傳值，直接操作 SVG DOM 元素
   * 
   * @fires layer-hover - 當滑鼠懸停在數據點上時觸發
   * @fires layer-click - 當點擊數據點時觸發
   * 
   * @example
   * // 自動從 processedLeftLayers 和 processedRightLayers 中篩選出散點圖層並渲染
   * // 數據已經根據 Brush 範圍過濾好
   * renderScatter();
   */
  const renderScatter = () => {
    if (!lineLayerRef.value) return;

    const g = d3.select(lineLayerRef.value);
    // ✅ 使用預處理好的圖層（數據已過濾）- 支援左右兩側 Y 軸
    const leftScatterLayers = processedLeftLayers.value.filter(l => l.type === 'scatter');
    const rightScatterLayers = processedRightLayers.value.filter(l => l.type === 'scatter');
    const scatterLayers = [...leftScatterLayers, ...rightScatterLayers];

    if (!scatterLayers.length) {
      // 不移除所有元素，因為可能有折線圖
      return;
    }

    scatterLayers.forEach((layer, layerIndex) => {
      const { 
        data, 
        xValue, 
        yValue, 
        dotColor, 
        dotSize,
        dotOpacity,
        yAxis 
      } = layer;
      // ✅ 根據 yAxis 選擇對應的 scale
      const ys = yAxis === 'right' ? yRightScale.value : yLeftScale.value;
      const xs = xScale.value;

      // 缺少任一必要條件就畫不出這個圖層
      if (!data || !xValue || !yValue || !xs || !ys) return;

      const { xPos, yPos } = makeAccessors(xs, ys, xValue, yValue);
      const color = dotColor || '#3b82f6';
      const size = dotSize || 4;
      const opacity = dotOpacity ?? 0.7;

      // ✅ 大量資料：改畫在 Canvas 上（10 萬個 <circle> 光排版就要好幾秒）
      if (isLargeLayer(data.length)) {
        g.selectAll(`circle.scatter-dot-${layerIndex}`).remove();
        const { px, py } = projectPoints(data, xPos, yPos);
        drawPointsOnCanvas(layer, data, px, py, { color, radius: size, opacity });
        registerPointHighlights(layer, data, xPos, yPos, color, Math.max(4, size + 1));
        return;
      }

      registerPointHighlights(layer, data, xPos, yPos, color, Math.max(4, size + 1));

      // 渲染散點
      animate(g.selectAll<SVGCircleElement, BoundDatum>(`circle.scatter-dot-${layerIndex}`)
        .data(
          data.map((d, i) => ({ rawData: d, layer, key: datumKey(layer, d, i) })),
          makeKeyFn(layer)
        )
        .join(
          enter => enter.append('circle')
            .attr('class', `scatter-dot-${layerIndex} scatter-dot`)
            .attr('r', 0)
            .attr('fill', color)
            .attr('fill-opacity', opacity)
            .style('stroke', chartTheme.surface)
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseenter', (event: MouseEvent, d) => {
              d3.select(event.target as SVGCircleElement)
                .attr('r', size * 1.5)
                .attr('fill-opacity', 1)
                .attr('stroke-width', 2);
              handleLayerHover(event, d.rawData, d.layer, undefined, d.key);
            })
            .on('mouseleave', (event: MouseEvent) => {
              d3.select(event.target as SVGCircleElement)
                .attr('r', size)
                .attr('fill-opacity', opacity)
                .attr('stroke-width', 1);
              handleLayerLeave();
            })
            .on('click', (_event: MouseEvent, d) => {
              emit('layer-click', { data: d.rawData, layer: d.layer, key: d.key });
            }),
          update => update,
          exit => animate(exit, effectiveAnimationDuration.value / 2)
            .attr('r', 0)
            .remove()
        ))
        .attr('cx', (d) => xPos(d.rawData) ?? 0)
        .attr('cy', (d) => yPos(d.rawData))
        .attr('r', size)
        .attr('fill', color)
        .attr('fill-opacity', opacity);
    });
  };

  /**
   * 渲染 Trigger 線（管制圖參考線）
   * 
   * @description 繪製水平或垂直的參考線，常用於管制圖的 UCL/LCL/CL 線，
   *              或良率分析圖的目標線、警告線等。支援虛線樣式、自定義顏色、
   *              標籤顯示、滑鼠互動等功能。
   * 
   * @returns {void} 無回傳值，直接操作 SVG DOM 元素
   * 
   * @fires layer-hover - 當滑鼠懸停在 trigger 線上時觸發（需 interactive: true）
   * @fires layer-click - 當點擊 trigger 線時觸發（需 interactive: true）
   * 
   * @example
   * // 繪製上控制限線（UCL）
   * triggerLines: [
   *   {
   *     type: 'horizontal',
   *     value: 100,
   *     yAxis: 'left',
   *     label: 'UCL',
   *     color: '#ef4444',
   *     strokeDasharray: '5,5',
   *     showInLegend: true
   *   }
   * ]
   */
  const renderTriggerLines = () => {
    if (!triggerLineLayerRef.value || !props.triggerLines.length) {
      if (triggerLineLayerRef.value) {
        d3.select(triggerLineLayerRef.value).selectAll('*').remove();
      }
      return;
    }

    const g = d3.select(triggerLineLayerRef.value);

    // 為每條 trigger 線創建一個 group
    const lineGroups = g
      .selectAll<SVGGElement, TriggerLine>('g.trigger-line-group')
      .data(props.triggerLines, (d, i) => d.id ?? String(i))
      .join(
        enter => enter.append('g').attr('class', 'trigger-line-group'),
        update => update,
        exit => exit.remove()
      );

    lineGroups.each(function (this: SVGGElement, triggerLine) {
      const lineGroup = d3.select(this);
      const {
        type = 'horizontal',
        value,
        yAxis = 'left',
        label,
        color = '#9ca3af',
        strokeWidth = 2,
        strokeDasharray = null,
        interactive = true,
        labelPosition = 'end'
      } = triggerLine;

      /**
       * 參考線的 hover / click payload。
       * 參考線不是資料圖層，但沿用 layer-hover / layer-click 讓使用端
       * 能用同一組事件處理 —— 這是既有的對外行為。
       */
      const triggerLineDatum: ChartDatum = { value, label, type, yAxis };
      const triggerLinePseudoLayer: ChartLayer = { ...triggerLine, type: 'trigger-line' };

      // 選擇對應的 scale
      const yScale = yAxis === 'left' ? yLeftScale.value : yRightScale.value;

      if (!yScale) return;

      let x1, y1, x2, y2;

      if (type === 'horizontal') {
        // 水平線
        const yPos = yScale(value);
        x1 = 0;
        y1 = yPos;
        x2 = chartWidth.value;
        y2 = yPos;
      } else {
        // 垂直線（未來擴展）
        const xs = xScale.value;
        if (!xs) return;
        const xPos = isBandScale(xs)
          ? (xs(String(value)) ?? 0) + xs.bandwidth() / 2
          : (xs as d3.ScaleContinuousNumeric<number, number>)(value);
        x1 = xPos;
        y1 = 0;
        x2 = xPos;
        y2 = chartHeight.value;
      }

      // 渲染線條
      animate(lineGroup
        .selectAll<SVGLineElement, TriggerLine>('line.trigger-line')
        .data([triggerLine])
        .join(
          (enter) => {
            const line = enter
              .append('line')
              .attr('class', 'trigger-line')
              .attr('stroke', color)
              .attr('stroke-width', strokeWidth)
              .attr('stroke-dasharray', strokeDasharray)
              .style('cursor', interactive ? 'pointer' : 'default');

            // 只在需要互動時才綁事件。
            // 原本寫 `.on('mouseenter', interactive ? fn : null)` —— 傳入
            // 「函式 | null」的聯集會讓 d3 的 .on() 多載無法解析，而且即使
            // interactive 為 false 也白走一次綁定。
            if (interactive) {
              line
                .on('mouseenter', function (this: SVGLineElement, event: MouseEvent) {
                  d3.select(this).attr('stroke-width', strokeWidth + 1);
                  handleLayerHover(event, triggerLineDatum, triggerLinePseudoLayer);
                })
                .on('mouseleave', function (this: SVGLineElement) {
                  d3.select(this).attr('stroke-width', strokeWidth);
                  handleLayerLeave();
                })
                .on('click', () => {
                  emit('layer-click', {
                    data: triggerLineDatum,
                    layer: triggerLinePseudoLayer,
                  });
                });
            }

            return line;
          },
          update => update,
          exit => exit.remove()
        ), effectiveAnimationDuration.value, d3.easeCubic)
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', color)
        .attr('stroke-width', strokeWidth)
        .attr('stroke-dasharray', strokeDasharray);

      // 渲染標籤
      if (label) {
        let labelX, labelY, textAnchor;

        if (type === 'horizontal') {
          labelY = y1;
          if (labelPosition === 'start') {
            labelX = 5;
            textAnchor = 'start';
          } else if (labelPosition === 'middle') {
            labelX = chartWidth.value / 2;
            textAnchor = 'middle';
          } else {
            labelX = chartWidth.value - 5;
            textAnchor = 'end';
          }
        } else {
          labelX = x1;
          if (labelPosition === 'start') {
            labelY = chartHeight.value - 5;
            textAnchor = 'middle';
          } else if (labelPosition === 'middle') {
            labelY = chartHeight.value / 2;
            textAnchor = 'middle';
          } else {
            labelY = 10;
            textAnchor = 'middle';
          }
        }

        animate(lineGroup.selectAll('text.trigger-label')
          .data([label])
          .join(
            enter => enter.append('text')
              .attr('class', 'trigger-label')
              .attr('fill', color)
              .attr('font-size', '11px')
              .attr('font-weight', 'bold')
              .style('pointer-events', 'none'),
            update => update,
            exit => exit.remove()
          ), effectiveAnimationDuration.value, d3.easeCubic)
          .attr('x', labelX)
          .attr('y', labelY - 3)
          .attr('text-anchor', textAnchor)
          .attr('fill', color)
          .text(label);
      }
    });
  };

  return { renderStackedBars, renderLines, renderScatter, renderTriggerLines }
}
