/**
 * DualAxisComboChart 的純函式（不碰元件狀態）
 * @internal
 */
import * as d3 from 'd3'
import { isBandScale } from '../../types/chart.types'
import type { ChartDatum, ChartLayer, XAccessor, XDomain, XScale, YAccessor, YScale } from '../../types/chart.types'
import type { BoundDatum } from './types'

/**
 * 把 X domain 的兩個端點轉成可做算術的數值。
 *
 * X 軸的 domain 依比例尺種類可能是數值、日期或類別字串；
 * 拖曳平移／縮放一律在數值域上計算，時間軸換成時間戳後再轉回 Date。
 */
export function toNumericDomain(domain: XDomain, isTimeScale: boolean): [number, number] {
  const [a, b] = domain as [string | number | Date, string | number | Date];
  if (isTimeScale) {
    return [new Date(a).getTime(), new Date(b).getTime()];
  }
  return [Number(a), Number(b)];
}

/**
 * enter-update-exit 的 key 函式。
 * 圖層有自訂 keyFn 就用它（避免重繪時元素錯位），否則退回索引。
 */
export function makeKeyFn(layer: ChartLayer): (d: BoundDatum, i: number) => string {
  const custom = layer.keyFn;
  if (custom) return (d, i) => custom(d.rawData, i);
  return (_d, i) => String(i);
}

/**
 * 取得堆疊系列的顏色。
 * colorScale 可以是 d3 的 ordinal scale（以 key 呼叫）或一張 key → 色碼的查表。
 */
export function resolveSeriesColor(
  colorScale: ChartLayer['colorScale'] | Record<string, string> | undefined,
  seriesKey: string,
  seriesIndex: number
): string {
  if (typeof colorScale === 'function') return colorScale(seriesKey);
  if (colorScale && typeof colorScale === 'object') {
    const table = colorScale as Record<string, string>;
    const hit = table[seriesKey] ?? table[String(seriesIndex)];
    if (hit) return hit;
  }
  return d3.schemeCategory10[seriesIndex % 10];
}

/**
 * 建立一組把資料列換算成像素座標的函式。
 *
 * band scale 與連續型 scale 的呼叫方式不同（前者吃類別字串、後者吃數值），
 * 原本這段 band 判斷在 renderLines / renderScatter 裡各自重複了四次，
 * 其中 .defined() 的三元運算兩個分支還完全相同（copy-paste 殘留），
 * 導致 band scale 下 defined 檢查用的是 band 起點、而 .x() 用的是 band 中心。
 */
export function makeAccessors(
  xs: XScale,
  ys: YScale,
  xValue: XAccessor,
  yValue: YAccessor
) {
  /** X 像素座標；band scale 取 band 中心。無法定位時回傳 undefined */
  const xPos = (d: ChartDatum): number | undefined => {
    const raw = xValue(d);
    if (isBandScale(xs)) {
      const start = xs(String(raw));
      return start === undefined ? undefined : start + xs.bandwidth() / 2;
    }
    return (xs as d3.ScaleContinuousNumeric<number, number>)(Number(raw));
  };

  /** Y 像素座標 */
  const yPos = (d: ChartDatum): number => ys(yValue(d));

  /** 這個資料點是否能畫出來（座標皆為有效數值） */
  const isDefined = (d: ChartDatum): boolean => {
    const x = xPos(d);
    const y = yPos(d);
    return x !== undefined && Number.isFinite(x) && Number.isFinite(y);
  };

  return { xPos, yPos, isDefined };
}

/** 鍵一律比對字串；Date 用 ISO 字串（同一時刻的兩個 Date 物件才會相等） */
export function normalizeKey(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return String(value);
}

/**
 * 一筆資料的鍵：圖層有 keyFn 用 keyFn（與 enter-update-exit 的 key 同一個來源），
 * 否則用 X 值 —— 不寫 keyFn 也能「高亮某個月份／某個時間點」。
 * ⚠️ index 是目前顯示資料中的位置（縮放後會變），keyFn 應由資料欄位組出鍵。
 */
export function datumKey(layer: ChartLayer, d: ChartDatum, index: number): string {
  if (layer.keyFn) return String(layer.keyFn(d, index));
  return normalizeKey(layer.xValue?.(d)) ?? String(index);
}

/**
 * 連續型 X 軸上長條的寬度：取相鄰資料點最小間距的 70%，限制在 2~48px。
 * （band scale 直接用 bandwidth，不走這裡）
 */
export function continuousBarWidth(positions: number[]): number {
  const gap = minPositiveGap(positions);
  if (!Number.isFinite(gap)) return 24;
  return Math.max(2, Math.min(48, gap * 0.7));
}

/**
 * 相鄰資料點的最小間距。
 * ✅ 資料已依 X 排序（時間序列幾乎都是）時一次掃過即可；否則才去重排序 —— 10 萬筆省下約 30ms／次重繪。
 */
export function minPositiveGap(positions: number[]): number {
  let gap = Infinity;
  let prev = NaN;
  let sorted = true;
  for (const p of positions) {
    if (!Number.isFinite(p)) continue;
    if (Number.isFinite(prev)) {
      if (p < prev) { sorted = false; break; }
      if (p > prev) gap = Math.min(gap, p - prev);
    }
    prev = p;
  }
  if (sorted) return gap;
  const xs = [...new Set(positions.filter(Number.isFinite))].sort((a, b) => a - b);
  gap = Infinity;
  for (let i = 1; i < xs.length; i++) gap = Math.min(gap, xs[i] - xs[i - 1]);
  return gap;
}
