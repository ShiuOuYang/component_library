/**
 * 滾輪縮放（以游標為中心；X、左右 Y 軸、或繪圖區同時縮放）與按住中鍵拖曳平移
 * @internal
 */
import { nextTick, ref } from 'vue'
import * as d3 from 'd3'
import { isBandScale } from '../../types/chart.types'
import type { XDomain } from '../../types/chart.types'
import { panContinuousDomain, wheelModifierPressed, zoomBandWindow, zoomContinuousDomain } from '../../utils/largeData'
import { toNumericDomain } from './helpers'
import { MAX_ZOOM_OUT, WHEEL_ZOOM_SPEED, type WheelTarget } from './types'
import type { DualAxisContext } from './context'

export function useWheelZoom(ctx: DualAxisContext) {
  const { props, emit, plotRef, xScale, yLeftScale, yRightScale, xZoomBounds, yLeftZoomBounds, yRightZoomBounds, yLeftBaseDomain, yRightBaseDomain, baseXDomain, currentXDomain, currentYLeftDomain, currentYRightDomain, isLocalBrush, resetBtnShow, chartWidth, chartHeight } = ctx

  let wheelZoomAcc = 0;
  let wheelPanAcc = 0;
  let wheelTarget: WheelTarget | null = null;
  let wheelAnchor: [number, number] = [0, 0];
  let wheelFrame: number | null = null;

  const requestFrame = (cb: () => void): number =>
    typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : (setTimeout(cb, 16) as unknown as number);
  const cancelFrame = (id: number): void => {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
    else clearTimeout(id);
  };


  /**
   * 游標位置對應哪一個軸：
   * 繪圖區 → X 與 Y 同時（wheelZoomAxes='x' 時只有 X）；X 軸刻度區 → 只有 X；左右 Y 軸的邊界區 → 該 Y 軸
   */
  function wheelTargetAt(mx: number, my: number): WheelTarget | null {
    const w = chartWidth.value;
    const h = chartHeight.value;
    if (w <= 0 || h <= 0) return null;
    if (mx >= 0 && mx <= w && my >= 0 && my <= h) {
      if (!xScale.value) return null;
      return props.wheelZoomAxes === 'xy' ? 'xy' : 'x';
    }
    if (mx >= 0 && mx <= w && my > h && my <= h + props.margin.bottom) return xScale.value ? 'x' : null;
    if (my >= 0 && my <= h) {
      if (mx < 0 && mx >= -props.margin.left && yLeftScale.value) return 'yLeft';
      if (mx > w && mx <= w + props.margin.right && yRightScale.value) return 'yRight';
    }
    return null;
  }

  /** X 軸目前是否顯示完整範圍 */
  function isXAtFullExtent(): boolean {
    const xs = xScale.value;
    const bounds = xZoomBounds.value;
    if (!xs || !bounds) return true;
    if (isBandScale(xs)) return xs.domain().length >= (bounds as string[]).length;
    const isTime = props.xScaleType === 'time';
    const [c0, c1] = toNumericDomain(xs.domain() as XDomain, isTime);
    const [b0, b1] = toNumericDomain(bounds, isTime);
    return c1 - c0 >= (b1 - b0) * (1 - 1e-9);
  }

  /** 某側 Y 軸目前是否已顯示完整的縮放邊界 */
  function isYAtFullExtent(target: 'yLeft' | 'yRight'): boolean {
    const ys = target === 'yLeft' ? yLeftScale.value : yRightScale.value;
    const bounds = target === 'yLeft' ? yLeftZoomBounds.value : yRightZoomBounds.value;
    if (!ys || !bounds) return true;
    const [c0, c1] = ys.domain() as [number, number];
    return Math.abs(c1 - c0) >= Math.abs(bounds[1] - bounds[0]) * (1 - 1e-9);
  }

  /**
   * 這一軸是否被限制在資料範圍內（不能再縮小、平移不能超出）：
   * limitZoomToData 時都是；不限制時只有類別軸（範圍外沒有類別）與對數軸（不能縮到 0 以下）
   */
  function xLimited(): boolean {
    const xs = xScale.value;
    return props.limitZoomToData || !xs || isBandScale(xs) || props.xScaleType === 'log';
  }

  function yLimited(side: 'yLeft' | 'yRight'): boolean {
    const type = side === 'yLeft' ? props.yLeftScaleType : props.yRightScaleType;
    return props.limitZoomToData || type === 'log';
  }

  /** 不能再往外縮（被限制且已經全覽；沒有這一軸也算） */
  function xAtZoomOutLimit(): boolean {
    return xLimited() ? isXAtFullExtent() : false;
  }

  function yAtZoomOutLimit(side: 'yLeft' | 'yRight'): boolean {
    const ys = side === 'yLeft' ? yLeftScale.value : yRightScale.value;
    if (!ys) return true;
    return yLimited(side) ? isYAtFullExtent(side) : false;
  }

  /**
   * 這次滾動會不會改變畫面。不會的就不攔截，交還給頁面捲動：
   * 已是全覽還往外縮、或全覽時左右平移。
   */
  function wheelWouldChange(target: WheelTarget, zoomDelta: number, panDelta: number): boolean {
    if (target === 'xy') {
      // 平移只動 X；往外縮時任何一軸還能再縮就有作用
      if (panDelta !== 0) return !xAtZoomOutLimit();
      if (zoomDelta > 0) return !xAtZoomOutLimit() || !yAtZoomOutLimit('yLeft') || !yAtZoomOutLimit('yRight');
      return zoomDelta < 0;
    }
    const zoomed = target === 'x' ? !xAtZoomOutLimit() : !yAtZoomOutLimit(target);
    if (panDelta !== 0) return zoomed;
    if (zoomDelta > 0) return zoomed;
    return zoomDelta < 0;
  }

  /**
   * 滾輪事件：累積到下一個 animation frame 再一次套用。
   * ✅ 觸控板一秒會送上百個 wheel 事件，逐一重繪會卡；合併後一個畫面最多重繪一次
   */
  function onWheel(event: WheelEvent): void {
    if (!props.enableWheelZoom || !plotRef.value || !wheelModifierPressed(event, props.wheelZoomModifier)) return;
    const [mx, my] = d3.pointer(event, plotRef.value);
    const target = wheelTargetAt(mx, my);
    if (!target) return;

    // deltaMode：0 像素、1 行、2 頁
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (chartHeight.value || 400) : 1;
    const dx = event.deltaX * unit;
    const dy = event.deltaY * unit;
    const isPan = Math.abs(dx) > Math.abs(dy);
    // Y 軸不做左右平移
    if (isPan && target !== 'x' && target !== 'xy') return;
    const zoomDelta = isPan ? 0 : dy;
    const panDelta = isPan ? dx : 0;
    if (!wheelWouldChange(target, zoomDelta, panDelta)) return;

    event.preventDefault();
    if (wheelTarget !== target) {
      wheelZoomAcc = 0;
      wheelPanAcc = 0;
    }
    wheelTarget = target;
    wheelAnchor = [mx, my];
    wheelZoomAcc += zoomDelta;
    wheelPanAcc += panDelta;
    if (wheelFrame === null) wheelFrame = requestFrame(applyWheel);
  }

  /** 套用累積的滾輪量 */
  function applyWheel(): void {
    wheelFrame = null;
    const target = wheelTarget;
    const k = Math.exp(wheelZoomAcc * WHEEL_ZOOM_SPEED);
    const pan = wheelPanAcc;
    wheelZoomAcc = 0;
    wheelPanAcc = 0;
    if (!target) return;
    if (target === 'x') applyXWheel(k, pan, wheelAnchor[0]);
    else if (target === 'xy') applyXYWheel(k, pan, wheelAnchor[0], wheelAnchor[1]);
    else applyYWheel(target, k, wheelAnchor[1]);
  }

  /**
   * 繪圖區的滾輪：X 與兩側 Y 用同一個倍率、都以游標所在的點為中心縮放 ——
   * 游標底下的資料點（兩條 Y 軸上的都是）縮放後還在游標底下，跟 Allegro 一樣。
   * 往外縮時，已經在全覽的軸跳過（不重複送 null 的 wheel-zoom）。
   */
  function applyXYWheel(k: number, pan: number, mx: number, my: number): void {
    const zoomingOut = k > 1;
    if (pan !== 0 || !(zoomingOut && xAtZoomOutLimit())) applyXWheel(k, pan, mx);
    if (k === 1) return;
    for (const side of ['yLeft', 'yRight'] as const) {
      const ys = side === 'yLeft' ? yLeftScale.value : yRightScale.value;
      if (ys && !(zoomingOut && yAtZoomOutLimit(side))) applyYWheel(side, k, my);
    }
  }

  // === 中鍵拖曳平移 ===

  /** 按下中鍵時的起點與各軸範圍；沒在平移時為 null */
  let panStart: {
    x: number
    y: number
    /** 連續 X 軸的數值範圍；band 軸為類別視窗；X 在全覽時為 null（不平移） */
    xWindow: [number, number] | null
    bandWindow: { start: number; length: number } | null
    yLeft: [number, number] | null
    yRight: [number, number] | null
  } | null = null;
  const isPanning = ref(false);

  /**
   * 按住滑鼠中鍵拖曳：X 與 Y 一起平移（畫面跟著游標走）。
   * 只有已經縮放的軸會動；平移不會超出縮放邊界。
   */
  function onPanMouseDown(event: MouseEvent): void {
    if (event.button !== 1 || !props.enableWheelZoom || !plotRef.value) return;
    const [mx, my] = d3.pointer(event, plotRef.value);
    if (mx < 0 || my < 0 || mx > chartWidth.value || my > chartHeight.value) return;
    // 取消瀏覽器中鍵的自動捲動
    event.preventDefault();

    const xs = xScale.value;
    let xWindow: [number, number] | null = null;
    let bandWindow: { start: number; length: number } | null = null;
    // 不限制時，沒縮放也能平移（像 Allegro）；類別軸與限制模式只有縮放後才能平移
    if (xs && !(xLimited() && isXAtFullExtent())) {
      if (isBandScale(xs)) {
        const all = xZoomBounds.value as string[];
        bandWindow = { start: Math.max(0, all.indexOf(xs.domain()[0])), length: xs.domain().length };
      } else {
        xWindow = toNumericDomain(xs.domain() as XDomain, props.xScaleType === 'time');
      }
    }
    const yWindow = (side: 'yLeft' | 'yRight'): [number, number] | null => {
      const ys = side === 'yLeft' ? yLeftScale.value : yRightScale.value;
      return ys && !(yLimited(side) && isYAtFullExtent(side)) ? (ys.domain() as [number, number]) : null;
    };
    panStart = { x: event.clientX, y: event.clientY, xWindow, bandWindow, yLeft: yWindow('yLeft'), yRight: yWindow('yRight') };
    isPanning.value = true;
    window.addEventListener('mousemove', onPanMouseMove);
    window.addEventListener('mouseup', onPanMouseUp);
  }

  function onPanMouseMove(event: MouseEvent): void {
    const start = panStart;
    const w = chartWidth.value;
    const h = chartHeight.value;
    if (!start || w <= 0 || h <= 0) return;
    // 從起點算總位移（不是逐次累加），拖久了也不會有誤差
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (start.xWindow && xZoomBounds.value) {
      const isTime = props.xScaleType === 'time';
      const span = start.xWindow[1] - start.xWindow[0];
      const win = panContinuousDomain(start.xWindow, (-dx / w) * span, xLimited() ? toNumericDomain(xZoomBounds.value, isTime) : null);
      setPannedX((isTime ? [new Date(win[0]), new Date(win[1])] : win) as XDomain);
    } else if (start.bandWindow && xZoomBounds.value) {
      const all = xZoomBounds.value as string[];
      const { start: s0, length } = start.bandWindow;
      const shift = Math.round((-dx / w) * length);
      const s = Math.min(Math.max(0, s0 + shift), all.length - length);
      setPannedX(all.slice(s, s + length));
    }
    for (const side of ['yLeft', 'yRight'] as const) {
      const from = start[side];
      const bounds = side === 'yLeft' ? yLeftZoomBounds.value : yRightZoomBounds.value;
      if (!from || !bounds) continue;
      // 往下拖 → 畫面往下 → 範圍往上移
      const win = panContinuousDomain(from, (dy / h) * (from[1] - from[0]), yLimited(side) ? bounds : null);
      const current = side === 'yLeft' ? currentYLeftDomain.value : currentYRightDomain.value;
      if (current && current[0] === win[0] && current[1] === win[1]) continue;
      if (side === 'yLeft') currentYLeftDomain.value = win;
      else currentYRightDomain.value = win;
      emit('axis-drag', { axis: side, domain: win });
    }
    // 🔧 從全覽直接平移時縮放狀態原本是空的：不同步的話每次移動都跑 750ms 過場動畫，
    //    畫面一路落後游標、放開後還在滑；重置按鈕也不會出現
    syncZoomedState();
  }

  /** 平移 X：標記為本地變更（分面圖同步回來時不會被當成外部變更清掉） */
  function setPannedX(next: XDomain): void {
    const current = currentXDomain.value as Array<string | number | Date> | null;
    const same = (a: string | number | Date, b: string | number | Date) => (typeof a === 'string' ? a === b : +a === +b);
    if (current && current.length === next.length && current.every((v, i) => same(v, (next as Array<string | number | Date>)[i]))) return;
    isLocalBrush.value = true;
    currentXDomain.value = next;
    emit('axis-drag', { axis: 'x', domain: next });
    nextTick(() => {
      isLocalBrush.value = false;
    });
  }

  function onPanMouseUp(): void {
    stopPan();
  }

  function stopPan(): void {
    window.removeEventListener('mousemove', onPanMouseMove);
    window.removeEventListener('mouseup', onPanMouseUp);
    panStart = null;
    isPanning.value = false;
  }

  /** 縮放／平移 X 軸；縮到全覽時清除縮放狀態 */
  function applyXWheel(k: number, pan: number, mx: number): void {
    const xs = xScale.value;
    const bounds = xZoomBounds.value;
    const w = chartWidth.value;
    if (!xs || !bounds || w <= 0) return;

    let next: XDomain | null;
    if (isBandScale(xs)) {
      const all = bounds as string[];
      const current = xs.domain();
      let win: { start: number; length: number } | null = {
        start: Math.max(0, all.indexOf(current[0])),
        length: current.length,
      };
      if (k !== 1) win = zoomBandWindow(win.start, win.length, all.length, mx / w, k, 2);
      if (win && pan !== 0) {
        const shift = Math.round((pan / w) * win.length) || Math.sign(pan);
        win.start = Math.min(Math.max(0, win.start + shift), all.length - win.length);
      }
      next = win ? all.slice(win.start, win.start + win.length) : fullXWindow(all);
    } else {
      const isTime = props.xScaleType === 'time';
      const full = toNumericDomain(bounds, isTime);
      const fullSpan = full[1] - full[0];
      const limited = xLimited();
      let win: [number, number] | null = toNumericDomain(xs.domain() as XDomain, isTime);
      if (k !== 1) {
        const anchor = +(xs as d3.ScaleContinuousNumeric<number, number>).invert(mx);
        const minSpan = fullSpan / Math.max(1, props.maxZoomScale);
        win = limited
          ? zoomContinuousDomain(win, anchor, k, { bounds: full, minSpan })
          : zoomOutUnbounded(win, anchor, k, minSpan, fullSpan);
      }
      if (win && pan !== 0) {
        win = panContinuousDomain(win, (pan / w) * (win[1] - win[0]), limited ? full : null);
      }
      next = win ? ((isTime ? [new Date(win[0]), new Date(win[1])] : win) as XDomain) : fullXWindow(bounds);
    }

    // 與 brush 相同：標記為本地縮放，分面圖把同步後的 xDomain 傳回來時不會被當成外部變更清掉
    isLocalBrush.value = true;
    currentXDomain.value = next;
    syncZoomedState();
    emit('wheel-zoom', { axis: 'x', domain: next });
    // 🔧 這一輪更新跑完就清掉標記：父層沒有把 domain 傳回來（單獨使用的圖表）時，
    //    標記一直留著會讓下一次真正的外部 xDomain 變更被忽略
    nextTick(() => {
      isLocalBrush.value = false;
    });
  }

  /**
   * 不限制在資料範圍內的縮放：以游標為中心，可以縮到比全覽還小。
   * 只在範圍大到 MAX_ZOOM_OUT 倍時停住（避免數值溢位），不會回傳 null（不會自動跳回全覽）
   */
  function zoomOutUnbounded(domain: [number, number], anchor: number, k: number, minSpan: number, fullSpan: number): [number, number] {
    const next = zoomContinuousDomain(domain, anchor, k, { minSpan }) ?? domain;
    return Math.abs(next[1] - next[0]) > Math.abs(fullSpan) * MAX_ZOOM_OUT ? domain : next;
  }

  /**
   * 縮到底（超過縮放邊界）時要顯示的 X 範圍。
   * 邊界就是沒縮放時的範圍 → null（清除縮放）；
   * 🔧 呼叫端設的 xDomain 比資料窄時邊界比它寬 —— 停在邊界，不能跳回比較窄的設定範圍
   */
  function fullXWindow(bounds: XDomain): XDomain | null {
    const base = baseXDomain.value;
    if (!base) return null;
    const same = isBandScale(xScale.value!)
      ? base.length === bounds.length && (base as string[]).every((c, i) => c === (bounds as string[])[i])
      : (base as Array<number | Date>).every((v, i) => +v === +(bounds as Array<number | Date>)[i]);
    return same ? null : bounds;
  }

  /**
   * 以游標所在的值為中心縮放一側 Y 軸。
   * 🔧 邊界是「設定的範圍」與「資料實際範圍」的聯集：原本只能縮到設定的範圍（yLeftDomain），
   *    資料超出時往外縮也看不到；縮到底就停在聯集，邊界與基準相同時才清除縮放狀態
   */
  function applyYWheel(target: 'yLeft' | 'yRight', k: number, my: number): void {
    const ys = target === 'yLeft' ? yLeftScale.value : yRightScale.value;
    const bounds = target === 'yLeft' ? yLeftZoomBounds.value : yRightZoomBounds.value;
    if (!ys || !bounds || k === 1) return;
    const boundsSpan = bounds[1] - bounds[0];
    const minSpan = boundsSpan / Math.max(1, props.maxZoomScale);
    let next = yLimited(target)
      ? zoomContinuousDomain(ys.domain() as [number, number], ys.invert(my), k, { bounds, minSpan })
      : zoomOutUnbounded(ys.domain() as [number, number], ys.invert(my), k, minSpan, boundsSpan);
    if (next === null) {
      // 基準範圍（取整後，也就是重設後看到的範圍）若與邊界相同，就直接清除縮放
      const [b0, b1] = ys.copy().domain((target === 'yLeft' ? yLeftBaseDomain.value : yRightBaseDomain.value) ?? bounds).nice().domain();
      next = Math.min(b0, b1) === bounds[0] && Math.max(b0, b1) === bounds[1] ? null : [bounds[0], bounds[1]];
    }
    if (target === 'yLeft') currentYLeftDomain.value = next;
    else currentYRightDomain.value = next;
    syncZoomedState();
    emit('wheel-zoom', { axis: target, domain: next });
  }

  /** 任一軸有縮放就顯示「重置」按鈕（同時關閉動畫，縮放時不拖泥帶水） */
  function syncZoomedState(): void {
    resetBtnShow.value =
      currentXDomain.value !== null || currentYLeftDomain.value !== null || currentYRightDomain.value !== null;
  }

  /** 卸載時取消還沒套用的滾輪量、結束中鍵平移 */
  function disposeWheelZoom(): void {
    if (wheelFrame !== null) {
      cancelFrame(wheelFrame);
      wheelFrame = null;
    }
    stopPan();
  }

  return { onWheel, onPanMouseDown, isPanning, disposeWheelZoom }
}
