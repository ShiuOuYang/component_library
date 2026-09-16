import { describe, expect, it } from 'vitest'
import { parseTransformAttribute } from './svg-transform-polyfill.js'

/**
 * 這個 polyfill 是所有圖表測試的地基：d3-transition 對 transform 插值時
 * 會讀 SVGGraphicsElement.transform，解析錯了會讓 transition 靜默走偏。
 */
describe('parseTransformAttribute', () => {
  it('沒有 transform 時回傳 null（d3 會退回 identity）', () => {
    expect(parseTransformAttribute(null)).toBeNull()
    expect(parseTransformAttribute('')).toBeNull()
    expect(parseTransformAttribute('nonsense(1)')).toBeNull()
  })

  it('translate 寫進 e/f', () => {
    expect(parseTransformAttribute('translate(10, 20)')).toEqual({
      a: 1, b: 0, c: 0, d: 1, e: 10, f: 20,
    })
  })

  it('translate 省略 y 時視為 0，並接受空白分隔', () => {
    expect(parseTransformAttribute('translate(10)')).toEqual({
      a: 1, b: 0, c: 0, d: 1, e: 10, f: 0,
    })
    expect(parseTransformAttribute('translate(10 20)').e).toBe(10)
  })

  it('scale 省略 sy 時沿用 sx', () => {
    expect(parseTransformAttribute('scale(2)')).toEqual({
      a: 2, b: 0, c: 0, d: 2, e: 0, f: 0,
    })
    expect(parseTransformAttribute('scale(2, 3)').d).toBe(3)
  })

  it('rotate(90) 轉出正確的旋轉矩陣', () => {
    const m = parseTransformAttribute('rotate(90)')
    expect(m.a).toBeCloseTo(0)
    expect(m.b).toBeCloseTo(1)
    expect(m.c).toBeCloseTo(-1)
    expect(m.d).toBeCloseTo(0)
  })

  it('rotate(角度, cx, cy) 等價於 translate/rotate/translate 複合', () => {
    const around = parseTransformAttribute('rotate(90, 10, 0)')
    const expanded = parseTransformAttribute('translate(10, 0) rotate(90) translate(-10, 0)')
    for (const key of ['a', 'b', 'c', 'd', 'e', 'f']) {
      expect(around[key]).toBeCloseTo(expanded[key])
    }
  })

  it('matrix 直接採用六個參數', () => {
    expect(parseTransformAttribute('matrix(1,2,3,4,5,6)')).toEqual({
      a: 1, b: 2, c: 3, d: 4, e: 5, f: 6,
    })
  })

  it('多個函式依序相乘（後者作用在前者的座標系上）', () => {
    // translate 後再 scale：平移量不被縮放，但縮放會疊上去
    expect(parseTransformAttribute('translate(10, 20) scale(2)')).toEqual({
      a: 2, b: 0, c: 0, d: 2, e: 10, f: 20,
    })
    // 反序：平移量被前面的 scale 放大
    expect(parseTransformAttribute('scale(2) translate(10, 20)')).toEqual({
      a: 2, b: 0, c: 0, d: 2, e: 20, f: 40,
    })
  })

  it('skewX / skewY 分別寫進 c / b', () => {
    expect(parseTransformAttribute('skewX(45)').c).toBeCloseTo(1)
    expect(parseTransformAttribute('skewY(45)').b).toBeCloseTo(1)
  })
})

describe('installSvgTransformPolyfill', () => {
  it('掛在 SVGElement 上，consolidate() 讀得到屬性', () => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    expect(node.transform.baseVal.consolidate()).toBeNull()

    node.setAttribute('transform', 'translate(5, 7)')
    expect(node.transform.baseVal.consolidate().matrix).toMatchObject({ e: 5, f: 7 })
    expect(node.transform.baseVal.numberOfItems).toBe(1)
  })
})
