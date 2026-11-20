/**
 * 大量資料模式：散點與長條畫在 Canvas 上，滑鼠提示改用座標命中測試
 * @internal
 */
import * as d3 from 'd3'
import { chartTheme } from '../../chartTheme'
import { nearestPointIndex, rectIndexAt, resolveCanvasColor } from '../../utils/largeData'
import type { ChartDatum, ChartLayer } from '../../types/chart.types'
import { datumKey } from './helpers'
import { HOVERABLE_CLASSES, type LargeHitStore, type RectBatch } from './types'
import type { HoverHandlers } from './context'
import type { DualAxisContext } from './context'

export function useLargeData(ctx: DualAxisContext, deps: HoverHandlers) {
  const { props, canvasRef, containerRef, hoverLayerRef, plotRef, chartWidth, chartHeight } = ctx
  const { handleLayerHover, handleLayerLeave } = deps

  /** 這一輪渲染登記的命中測試資料；每次重繪重建 */
  let largeHits: LargeHitStore[] = [];
  /** 目前 tooltip 是否由大量資料模式的命中測試顯示 */
  let largeHoverKey: string | null = null;

  let ctx2d: CanvasRenderingContext2D | null = null;
  let ctx2dCanvas: HTMLCanvasElement | null = null;
  let canvasHasContent = false;
  let canvasDpr = 1;

  /**
   * 每一輪渲染開始時呼叫：依繪圖區與裝置像素比設定 Canvas 尺寸並清空，重置命中測試資料。
   * 沒有圖層進入大量資料模式時不會取用 2D context（Canvas 維持空白）。
   */
  function beginCanvasFrame(): void {
    largeHits = [];
    clearLargeHover();
    const canvas = canvasRef.value;
    if (!canvas) return;
    const w = Math.max(0, chartWidth.value);
    const h = Math.max(0, chartHeight.value);
    canvasDpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const pw = Math.round(w * canvasDpr);
    const ph = Math.round(h * canvasDpr);
    // 改寬高本身就會清空畫布；尺寸沒變才需要手動清
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    } else if (canvasHasContent && ctx2d && ctx2dCanvas === canvas) {
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.clearRect(0, 0, pw, ph);
    }
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvasHasContent = false;
  }

  /** 取得已套用裝置像素比的 2D context；環境不支援 Canvas 時回傳 null */
  function getCanvasContext(): CanvasRenderingContext2D | null {
    const canvas = canvasRef.value;
    if (!canvas) return null;
    if (ctx2dCanvas !== canvas) {
      ctx2d = canvas.getContext?.('2d') ?? null;
      ctx2dCanvas = canvas;
    }
    if (!ctx2d) return null;
    ctx2d.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
    canvasHasContent = true;
    return ctx2d;
  }

  /** 圖層顏色交給 Canvas 前先解析（CSS 變數 Canvas 看不懂） */
  function canvasColor(color: string): string {
    return resolveCanvasColor(color, containerRef.value);
  }

  /** 圖層目前可見的筆數是否超過門檻 */
  function isLargeLayer(count: number): boolean {
    return props.largeDataThreshold > 0 && count > props.largeDataThreshold;
  }

  /**
   * 計算一批資料的像素座標（無法定位的點為 NaN）。
   * 降採樣、Canvas 繪製與命中測試共用，只算一次。
   */
  function projectPoints(
    data: ChartDatum[],
    xPos: (d: ChartDatum) => number | undefined,
    yPos: (d: ChartDatum) => number
  ): { px: Float32Array; py: Float32Array } {
    const n = data.length;
    const px = new Float32Array(n);
    const py = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = data[i];
      px[i] = xPos(d) ?? NaN;
      py[i] = yPos(d);
    }
    return { px, py };
  }

  /**
   * 預先畫好一顆圓點，之後每個資料點只要貼圖（drawImage）。
   * ✅ 10 萬個 arc() 路徑約要 250ms；貼圖約 20ms。環境不支援時回傳 null，改畫路徑。
   */
  function makeDotSprite(color: string, radius: number): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const size = Math.ceil((radius * 2 + 2) * canvasDpr);
    const sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const sctx = sprite.getContext?.('2d');
    if (!sctx || typeof sctx.arc !== 'function') return null;
    sctx.fillStyle = color;
    sctx.beginPath();
    sctx.arc(size / 2, size / 2, radius * canvasDpr, 0, Math.PI * 2);
    sctx.fill();
    return sprite;
  }

  /**
   * 在 Canvas 上畫一批點，並登記命中測試資料。
   * 半徑小的點用正方形代替圓形（看起來一樣）；較大的點用預畫好的圓點貼圖。
   */
  function drawPointsOnCanvas(
    layer: ChartLayer,
    data: ChartDatum[],
    px: Float32Array,
    py: Float32Array,
    options: { color: string; radius: number; opacity: number }
  ): void {
    const { color, radius, opacity } = options;
    const ctx = getCanvasContext();
    if (ctx) {
      const fill = canvasColor(color);
      ctx.globalAlpha = opacity;
      const sprite = radius > 1.5 && typeof ctx.drawImage === 'function' ? makeDotSprite(fill, radius) : null;
      if (sprite) {
        const d = sprite.width / canvasDpr;
        const offset = d / 2;
        for (let i = 0; i < px.length; i++) {
          const x = px[i];
          const y = py[i];
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          ctx.drawImage(sprite, x - offset, y - offset, d, d);
        }
      } else {
        ctx.fillStyle = fill;
        ctx.beginPath();
        const square = radius <= 1.5;
        for (let i = 0; i < px.length; i++) {
          const x = px[i];
          const y = py[i];
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          if (square) {
            ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
          } else {
            ctx.moveTo(x + radius, y);
            ctx.arc(x, y, radius, 0, Math.PI * 2);
          }
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    largeHits.push({ kind: 'point', layer, data, px, py, color, radius: Math.max(4, radius + 2) });
  }

  /** 配置一批矩形的儲存空間 */
  function createRectBatch(n: number, colors: string[], withSeries: boolean): RectBatch {
    return {
      data: new Array<ChartDatum>(n),
      seriesKeys: withSeries ? new Array<string>(n) : null,
      x0: new Float32Array(n),
      y0: new Float32Array(n),
      x1: new Float32Array(n),
      y1: new Float32Array(n),
      colorIndex: new Uint16Array(n),
      colors,
    };
  }

  /** 在 Canvas 上畫一批矩形，同色的一次填完；並登記命中測試資料 */
  function drawRectsOnCanvas(layer: ChartLayer, batch: RectBatch, count: number): void {
    const ctx = getCanvasContext();
    if (ctx) {
      batch.colors.forEach((color, ci) => {
        ctx.fillStyle = canvasColor(color);
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          if (batch.colorIndex[i] !== ci) continue;
          ctx.rect(batch.x0[i], batch.y0[i], batch.x1[i] - batch.x0[i], batch.y1[i] - batch.y0[i]);
        }
        ctx.fill();
      });
    }
    largeHits.push({
      kind: 'rect',
      layer,
      data: batch.data.slice(0, count),
      seriesKeys: batch.seriesKeys ? batch.seriesKeys.slice(0, count) : null,
      x0: batch.x0.subarray(0, count),
      y0: batch.y0.subarray(0, count),
      x1: batch.x1.subarray(0, count),
      y1: batch.y1.subarray(0, count),
    });
  }

  /**
   * 找出游標指到的大量資料項目：點（折線、散點）優先，取最近的；其次是包含游標的長條。
   */
  function findLargeHit(mx: number, my: number): { store: LargeHitStore; index: number } | null {
    const HIT_RADIUS = 8;
    let best: { store: LargeHitStore; index: number } | null = null;
    let bestDist = Infinity;
    for (const store of largeHits) {
      if (store.kind !== 'point') continue;
      const i = nearestPointIndex(store.px, store.py, mx, my, HIT_RADIUS);
      if (i < 0) continue;
      const dist = (store.px[i] - mx) ** 2 + (store.py[i] - my) ** 2;
      if (dist <= bestDist) {
        bestDist = dist;
        best = { store, index: i };
      }
    }
    if (best) return best;
    for (let s = largeHits.length - 1; s >= 0; s--) {
      const store = largeHits[s];
      if (store.kind !== 'rect') continue;
      const i = rectIndexAt(store.x0, store.y0, store.x1, store.y1, mx, my);
      if (i >= 0) return { store, index: i };
    }
    return null;
  }

  /** 畫出（或移除）大量資料模式的 hover 標記 */
  function drawHoverMarker(hit: { store: LargeHitStore; index: number } | null): void {
    if (!hoverLayerRef.value) return;
    const g = d3.select(hoverLayerRef.value);
    const point = hit?.store.kind === 'point' ? hit : null;
    const rect = hit?.store.kind === 'rect' ? hit : null;

    g.selectAll('circle.hover-point')
      .data(point ? [point] : [])
      .join('circle')
      .attr('class', 'hover-point')
      .attr('cx', (h) => (h.store as Extract<LargeHitStore, { kind: 'point' }>).px[h.index])
      .attr('cy', (h) => (h.store as Extract<LargeHitStore, { kind: 'point' }>).py[h.index])
      .attr('r', (h) => (h.store as Extract<LargeHitStore, { kind: 'point' }>).radius)
      .attr('fill', (h) => (h.store as Extract<LargeHitStore, { kind: 'point' }>).color)
      .style('stroke', chartTheme.surface)
      .attr('stroke-width', 2);

    g.selectAll('rect.hover-rect')
      .data(rect ? [rect] : [])
      .join('rect')
      .attr('class', 'hover-rect')
      .attr('x', (h) => (h.store as Extract<LargeHitStore, { kind: 'rect' }>).x0[h.index])
      .attr('y', (h) => (h.store as Extract<LargeHitStore, { kind: 'rect' }>).y0[h.index])
      .attr('width', (h) => {
        const st = h.store as Extract<LargeHitStore, { kind: 'rect' }>;
        return Math.max(1, st.x1[h.index] - st.x0[h.index]);
      })
      .attr('height', (h) => {
        const st = h.store as Extract<LargeHitStore, { kind: 'rect' }>;
        return Math.max(1, st.y1[h.index] - st.y0[h.index]);
      })
      .attr('fill', 'none')
      .style('stroke', chartTheme.text)
      .attr('stroke-width', 1.5);
  }

  /**
   * 依游標位置對大量資料做命中測試，命中就顯示 tooltip。
   * @returns 是否命中
   */
  function hoverLargeAt(event: MouseEvent): boolean {
    if (!largeHits.length || !plotRef.value) return false;
    const [mx, my] = d3.pointer(event, plotRef.value);
    if (mx < 0 || my < 0 || mx > chartWidth.value || my > chartHeight.value) return false;
    const hit = findLargeHit(mx, my);
    if (!hit) return false;

    const key = `${largeHits.indexOf(hit.store)}:${hit.index}`;
    drawHoverMarker(hit);
    // 同一筆資料不重複發事件（滑鼠在同一點上移動時）
    if (key !== largeHoverKey) {
      largeHoverKey = key;
      const seriesKey = hit.store.kind === 'rect' ? hit.store.seriesKeys?.[hit.index] : undefined;
      const datum = hit.store.data[hit.index];
      // 點的命中索引就是資料位置；長條的矩形會跳過無效列（堆疊圖一列多段），回頭找資料位置
      const dataIndex = hit.store.kind === 'point' ? hit.index : (hit.store.layer.data ?? []).indexOf(datum);
      handleLayerHover(event, datum, hit.store.layer, seriesKey, datumKey(hit.store.layer, datum, dataIndex));
    }
    return true;
  }

  /** 移除大量資料模式的 hover 標記；emitLeave 時一併隱藏 tooltip */
  function clearLargeHover(emitLeave = true): void {
    if (largeHoverKey === null) return;
    largeHoverKey = null;
    drawHoverMarker(null);
    if (emitLeave) handleLayerLeave();
  }

  /** brush 關閉時沒有 overlay，大量資料的 hover 改由 SVG 本身的 mousemove 處理 */
  function onSvgMouseMove(event: MouseEvent): void {
    if (props.enableBrush) return; // brush overlay 的穿透檢測會處理
    const target = event.target as Element | null;
    if (target?.classList && HOVERABLE_CLASSES.some((cls) => target.classList.contains(cls))) {
      clearLargeHover(false);
      return;
    }
    if (!hoverLargeAt(event)) clearLargeHover();
  }

  function onSvgMouseLeave(): void {
    clearLargeHover();
  }

  /** 圖層自己畫（SVG 折線）但要讓滑鼠提示用命中測試找資料時，登記座標 */
  function registerLargeHits(store: LargeHitStore): void {
    largeHits.push(store);
  }

  /** 卸載時釋放 */
  function disposeLargeData(): void {
    largeHits = [];
    ctx2d = null;
    ctx2dCanvas = null;
  }

  return { beginCanvasFrame, isLargeLayer, projectPoints, drawPointsOnCanvas, createRectBatch, drawRectsOnCanvas, registerLargeHits, hoverLargeAt, clearLargeHover, onSvgMouseMove, onSvgMouseLeave, disposeLargeData }
}
