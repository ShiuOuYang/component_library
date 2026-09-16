/**
 * jsdom 沒有實作 SVGGraphicsElement.transform（SVGAnimatedTransformList），
 * 而 d3-interpolate 對 transform 屬性做插值時一定會讀它：
 *
 *   svgNode.setAttribute('transform', value)
 *   svgNode.transform.baseVal.consolidate()   // ← jsdom 回 undefined，於此拋錯
 *
 * 這個錯誤發生在 d3-timer 的 timerFlush 迴圈裡，一拋就會中斷「整批」
 * 待處理的 transition，導致座標軸只畫出第一個刻度就停住 —— 元件本身沒問題，
 * 但測試看到的 DOM 是殘缺的。因此在這裡補上最小可用的實作：
 * 把 transform 字串解析成矩陣，讓 consolidate() 回傳 d3 需要的 { matrix }。
 */

const FUNCTION_RE = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g

const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

/** SVG 矩陣相乘：[a c e / b d f / 0 0 1] */
function multiply(m1, m2) {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  }
}

function toRadians(deg) {
  return (deg * Math.PI) / 180
}

/** 單一 transform 函式 → 矩陣 */
function functionToMatrix(name, args) {
  const n = (index, fallback = 0) => (Number.isFinite(args[index]) ? args[index] : fallback)

  switch (name) {
    case 'matrix':
      return { a: n(0, 1), b: n(1), c: n(2), d: n(3, 1), e: n(4), f: n(5) }
    case 'translate':
      return { ...IDENTITY, e: n(0), f: n(1) }
    case 'scale': {
      const sx = n(0, 1)
      return { ...IDENTITY, a: sx, d: Number.isFinite(args[1]) ? args[1] : sx }
    }
    case 'rotate': {
      const rad = toRadians(n(0))
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const rotation = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }
      // rotate(a cx cy) === translate(cx cy) rotate(a) translate(-cx -cy)
      if (args.length < 3) return rotation
      const cx = n(1)
      const cy = n(2)
      return multiply(
        multiply({ ...IDENTITY, e: cx, f: cy }, rotation),
        { ...IDENTITY, e: -cx, f: -cy },
      )
    }
    case 'skewX':
      return { ...IDENTITY, c: Math.tan(toRadians(n(0))) }
    case 'skewY':
      return { ...IDENTITY, b: Math.tan(toRadians(n(0))) }
    default:
      return null
  }
}

/**
 * 解析 transform 屬性字串。
 * 沒有任何可辨識的函式時回傳 null —— 對應 consolidate() 的 null，
 * d3 收到 null 會退回 identity transform。
 */
function parseTransformAttribute(value) {
  if (!value) return null

  let matrix = null
  let match
  FUNCTION_RE.lastIndex = 0
  while ((match = FUNCTION_RE.exec(value)) !== null) {
    const args = match[2]
      .split(/[\s,]+/)
      .filter((part) => part !== '')
      .map(Number)
    const next = functionToMatrix(match[1], args)
    if (!next) continue
    matrix = matrix === null ? next : multiply(matrix, next)
  }
  return matrix
}

/** 最小的 SVGAnimatedTransformList：只有 d3 會用到的兩個成員 */
function animatedTransformList(element) {
  return {
    baseVal: {
      get numberOfItems() {
        return parseTransformAttribute(element.getAttribute('transform')) ? 1 : 0
      },
      consolidate() {
        const matrix = parseTransformAttribute(element.getAttribute('transform'))
        return matrix === null ? null : { matrix }
      },
    },
  }
}

export function installSvgTransformPolyfill() {
  if (typeof SVGElement === 'undefined') return
  if (Object.getOwnPropertyDescriptor(SVGElement.prototype, 'transform')) return

  Object.defineProperty(SVGElement.prototype, 'transform', {
    configurable: true,
    get() {
      return animatedTransformList(this)
    },
  })
}

export { parseTransformAttribute }
