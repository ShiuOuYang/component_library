/**
 * 十字線：滑鼠所在的 X（送出 crosshair-move），或外部指定的 crosshairValue
 * @internal
 */
import { computed, ref } from 'vue'
import type * as d3 from 'd3'
import { isBandScale } from '../../types/chart.types'
import { formatXValue } from '../faceChart/facetHelpers'
import type { DualAxisContext } from './context'

export function useCrosshair(ctx: DualAxisContext) {
  const { props, emit, i18n, containerRef, xScale, chartWidth, chartHeight } = ctx

  type CrosshairX = number | string | Date
  const hoverCrosshair = ref<CrosshairX | null>(null);

  /** 繪圖區內的像素 → X 值；類別軸取最近的類別 */
  function xValueAt(px: number): CrosshairX | null {
    const xs = xScale.value;
    if (!xs) return null;
    if (isBandScale(xs)) {
      let best: string | null = null;
      let bestD = Infinity;
      const half = xs.bandwidth() / 2;
      for (const c of xs.domain()) {
        const d = Math.abs((xs(c) ?? 0) + half - px);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      return best;
    }
    const v = (xs as d3.ScaleContinuousNumeric<number, number>).invert(px) as number | Date;
    return v instanceof Date ? v : Number(v);
  }

  /** X 值 → 繪圖區內的像素（對不到時為 null） */
  function xPixelOf(value: CrosshairX): number | null {
    const xs = xScale.value;
    if (!xs) return null;
    if (isBandScale(xs)) {
      const p = xs(String(value));
      return p === undefined ? null : p + xs.bandwidth() / 2;
    }
    const p = (xs as unknown as (x: unknown) => number)(value);
    return Number.isFinite(p) ? p : null;
  }

  const sameX = (a: CrosshairX | null, b: CrosshairX | null) =>
    a === b || (a instanceof Date && b instanceof Date && +a === +b);

  function onCrosshairMove(event: MouseEvent): void {
    if (!props.crosshair || !containerRef.value) return;
    const rect = containerRef.value.getBoundingClientRect();
    const x = event.clientX - rect.left - props.margin.left;
    const y = event.clientY - rect.top - props.margin.top;
    const inside = x >= 0 && x <= chartWidth.value && y >= 0 && y <= chartHeight.value;
    const value = inside ? xValueAt(x) : null;
    if (sameX(value, hoverCrosshair.value)) return;
    hoverCrosshair.value = value;
    emit('crosshair-move', value);
  }

  function onCrosshairLeave(): void {
    if (hoverCrosshair.value === null) return;
    hoverCrosshair.value = null;
    emit('crosshair-move', null);
  }

  const crosshairView = computed(() => {
    let value = hoverCrosshair.value ?? props.crosshairValue;
    if (value === null || value === undefined) return null;
    // 時間軸收到數字（毫秒）時轉成 Date：位置與讀數格式（xAxisFormat 吃 Date）都一致
    if (props.xScaleType === 'time' && !(value instanceof Date)) value = new Date(value as number);
    const x = xPixelOf(value);
    if (x === null || x < 0 || x > chartWidth.value) return null;
    return { x, label: formatXValue(value, props.xAxisFormat, i18n.value) };
  });

  return { onCrosshairMove, onCrosshairLeave, crosshairView }
}
