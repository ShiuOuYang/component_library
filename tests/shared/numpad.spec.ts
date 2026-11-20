import { describe, expect, it } from 'vitest'
import {
  applyNumpadKey,
  isDigitKey,
  numpadKeyFromKeyboard,
  numpadRangeError,
  numpadText,
  parseNumpad,
  type NumpadKey,
  type NumpadBufferOptions,
} from '@/components/library/shared/numpad'

/** 從空白開始依序按鍵 */
const type = (keys: NumpadKey[], options?: NumpadBufferOptions, start = '') => keys.reduce((t, k) => applyNumpadKey(t, k, options), start)

describe('applyNumpadKey', () => {
  it('數字依序接上；開頭的 0 被取代', () => {
    expect(type(['1', '2', '3'])).toBe('123')
    expect(type(['0', '0', '5'])).toBe('5')
    expect(type(['0'])).toBe('0')
  })

  it('小數點：空白時補 0、只能一個、precision 限制小數位數、precision 0 時無效', () => {
    expect(type(['.', '5'])).toBe('0.5')
    expect(type(['1', '.', '.', '2'])).toBe('1.2')
    expect(type(['1', '.', '2', '3', '4'], { precision: 2 })).toBe('1.23')
    expect(type(['1', '.', '2'], { precision: 0 })).toBe('12')
    expect(type(['0', '.', '0', '5'])).toBe('0.05')
  })

  it('負號：allowNegative 時切換開頭的 -；可以先按負號；-0 再按數字為 -數字', () => {
    expect(type(['negate', '5'], { allowNegative: true })).toBe('-5')
    expect(type(['5', 'negate', 'negate'], { allowNegative: true })).toBe('5')
    expect(type(['5', 'negate'])).toBe('5')
    expect(type(['negate', '0', '7'], { allowNegative: true })).toBe('-7')
    expect(type(['negate', '.', '5'], { allowNegative: true })).toBe('-0.5')
  })

  it('刪除一位與清除', () => {
    expect(type(['1', '2', 'backspace'])).toBe('1')
    expect(type(['backspace'])).toBe('')
    expect(type(['1', '2', 'clear'])).toBe('')
  })

  it('maxDigits：不含負號與小數點；只有一個 0 時仍可取代', () => {
    expect(type(['1', '2', '3', '4'], { maxDigits: 3 })).toBe('123')
    expect(type(['1', '.', '2', '3'], { maxDigits: 3 })).toBe('1.23')
    expect(type(['1', '.', '2', '3', '4'], { maxDigits: 3 })).toBe('1.23')
    expect(type(['negate', '1', '2', '3'], { maxDigits: 2, allowNegative: true })).toBe('-12')
    expect(type(['0', '9'], { maxDigits: 1 })).toBe('9')
  })

  it('不認得的鍵：原文字', () => {
    expect(applyNumpadKey('12', 'x' as NumpadKey)).toBe('12')
  })
})

describe('parseNumpad', () => {
  it.each([
    ['', null],
    ['-', null],
    ['0.', 0],
    ['12.', 12],
    ['-0', 0],
    ['-3.5', -3.5],
    ['007', 7],
  ])('%j → %j', (text, value) => {
    expect(parseNumpad(text)).toBe(value)
  })
  it('-0 為 0（不是 -0）', () => {
    expect(Object.is(parseNumpad('-0'), 0)).toBe(true)
  })
  it('非有限數為 null', () => {
    expect(parseNumpad('9'.repeat(400))).toBeNull()
  })
})

describe('numpadText', () => {
  it('不補零；null / NaN 為空白；科學記號轉一般小數', () => {
    expect(numpadText(5)).toBe('5')
    expect(numpadText(-2.5)).toBe('-2.5')
    expect(numpadText(null)).toBe('')
    expect(numpadText(undefined)).toBe('')
    expect(numpadText(Number.NaN)).toBe('')
    expect(numpadText(1e-7)).toBe('0.0000001')
  })
})

describe('numpadRangeError', () => {
  it('小於 min、大於 max、範圍內；沒給界限為不限', () => {
    expect(numpadRangeError(-1, 0, 10)).toBe('below')
    expect(numpadRangeError(11, 0, 10)).toBe('above')
    expect(numpadRangeError(10, 0, 10)).toBeNull()
    expect(numpadRangeError(1e9)).toBeNull()
  })
})

describe('numpadKeyFromKeyboard', () => {
  it.each([
    ['7', '7'],
    ['.', '.'],
    [',', '.'],
    ['Decimal', '.'],
    ['-', 'negate'],
    ['Subtract', 'negate'],
    ['Backspace', 'backspace'],
    ['Delete', 'clear'],
    ['a', null],
    ['Enter', null],
  ])('%s → %s', (key, mapped) => {
    expect(numpadKeyFromKeyboard(key)).toBe(mapped)
  })
  it('isDigitKey', () => {
    expect(isDigitKey('0')).toBe(true)
    expect(isDigitKey('10')).toBe(false)
  })
})
