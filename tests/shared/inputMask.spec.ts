import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MASK_TOKENS,
  MASK_PRESETS,
  applyMask,
  caretForRaw,
  deleteRange,
  formatMask,
  isNumericMask,
  maskTemplate,
  parseMask,
  pickMask,
  rawIndexAt,
  validIPv4,
} from '@/components/library/shared/inputMask'

const sn = parseMask('SN-####-AAAA')

describe('inputMask', () => {
  it('parseMask：格式字元、可省略、跳脫、固定字元、自訂字元', () => {
    expect(parseMask('#A\\#-H?').map((it) => (it.type === 'slot' ? `${it.token}${it.optional ? '?' : ''}` : `'${it.char}'`))).toEqual(['#', 'A', "'#'", "'-'", 'H?'])
    // 結尾的反斜線就是一般字元
    expect(parseMask('#\\')).toMatchObject([{ type: 'slot' }, { type: 'literal', char: '\\' }])
    const custom = parseMask('LL', { L: { pattern: /[a-c]/, transform: 'upper' } })
    expect(applyMask('abz', custom).value).toBe('AB')
    expect(DEFAULT_MASK_TOKENS['#'].kind).toBe('digit')
  })

  it('applyMask：分隔符號自動補、延遲出現、自己打也接受、大小寫不拘、轉大寫', () => {
    expect(applyMask('1234abcd', sn, { uppercase: true })).toMatchObject({ value: 'SN-1234-ABCD', raw: '1234ABCD', complete: true })
    expect(applyMask('12', sn)).toMatchObject({ value: 'SN-12', raw: '12', complete: false, next: 5 })
    expect(applyMask('1234', sn).value).toBe('SN-1234') // 後面的 - 等下一個字才出現
    expect(applyMask('1234-', sn).value).toBe('SN-1234-') // 自己打了 - 就直接出現
    expect(applyMask('sn-12', sn).value).toBe('SN-12')
    expect(applyMask('', sn)).toMatchObject({ value: '', raw: '', complete: false, slots: [] })
    expect(applyMask('12', sn).slots).toEqual([false, false, false, true, true])
    // 超過長度的丟掉
    expect(applyMask('1234ABCDE', sn).value).toBe('SN-1234-ABCD')
  })

  it('applyMask：擋掉不合格式的字元（分隔符號與空白不算拒絕）', () => {
    const r = applyMask('1x2 3-', parseMask('##-##'))
    expect(r.value).toBe('12-3')
    expect(r.rejected).toEqual([{ char: 'x', kind: 'digit' }])
    // 貼上帶空白與符號的 MAC
    const mac = applyMask('aa bb:cc-dd ee ff', parseMask(MASK_PRESETS.mac), { uppercase: true })
    expect(mac.value).toBe('AA:BB:CC:DD:EE:FF')
    expect(mac.rejected).toEqual([{ char: '-', kind: 'hex' }])
    // 轉換函式
    expect(applyMask('ab', parseMask('LL', { L: { pattern: /[a-z]/, transform: (c) => `${c}!`.slice(0, 1).toUpperCase() } })).value).toBe('AB')
    expect(applyMask('AB', parseMask('LL', { L: { pattern: /[a-z]/i, transform: 'lower' } })).value).toBe('ab')
    // 有 g 旗標的規則也不受 lastIndex 影響
    expect(applyMask('111', parseMask('GGG', { G: { pattern: /\d/g } })).value).toBe('111')
  })

  it('applyMask：結尾的固定字元在填完時補上', () => {
    expect(applyMask('125', parseMask('##.#%')).value).toBe('12.5%')
    expect(applyMask('12', parseMask('##.#%')).value).toBe('12')
  })

  it('可省略的位置：IP', () => {
    const ip = parseMask(MASK_PRESETS.ipv4)
    expect(applyMask('192.168.1.10', ip)).toMatchObject({ value: '192.168.1.10', raw: '192168110', complete: true })
    expect(applyMask('1921', ip).value).toBe('192.1')
    expect(applyMask('1.2.3', ip)).toMatchObject({ value: '1.2.3', complete: false })
    expect(applyMask('1.2.3.4', ip).complete).toBe(true)
    // 可省略位置遇到不能用的字元：丟掉字元而不是跳過位置
    expect(applyMask('1x2', ip).value).toBe('12')
    // 後面接的是位置（不是固定字元）
    const opt = parseMask('A?#')
    expect(applyMask('5', opt).value).toBe('5')
    expect(applyMask('b5', opt).value).toBe('b5')
    // 可省略位置在最後
    expect(applyMask('1', parseMask('##?')).complete).toBe(true)
  })

  it('fromRaw：v-model 只有填入字元時不拿來比對固定字元', () => {
    const tel = parseMask('+886 ###')
    expect(applyMask('886', tel, { fromRaw: true }).value).toBe('+886 886')
    expect(applyMask('886', tel).value).toBe('+886') // 一般模式會當成自己打了固定字元
    expect(applyMask('886', parseMask('##?.#'), { fromRaw: true }).value).toBe('88.6')
    expect(applyMask('.6', parseMask('#?.#'), { fromRaw: true }).value).toBe('6') // 可省略位置後面的固定字元不比對：. 被丟掉
  })

  it('pickMask / formatMask：多個格式選放得下最多的', () => {
    const masks = ['####-####', '(##) ####-####'].map((m) => parseMask(m))
    expect(pickMask('12345678', masks).index).toBe(0)
    expect(pickMask('0212345678', masks)).toMatchObject({ index: 1, result: { value: '(02) 1234-5678' } })
    // 一樣多時選已完成的
    const two = [parseMask('###?#?'), parseMask('###')]
    expect(pickMask('123', two).index).toBe(0)
    expect(pickMask('12', [parseMask('###'), parseMask('##')]).index).toBe(1)
    expect(pickMask('', []).result.value).toBe('')
    expect(formatMask('0912345678', MASK_PRESETS.twMobile)).toMatchObject({ value: '0912-345-678', maskIndex: 0 })
    expect(formatMask('12345678', MASK_PRESETS.twMobile, { fromRaw: true }).value).toBe('0912-345-678')
    expect(formatMask('x12', ['XX#'], { tokens: { X: { pattern: /x/ } } }).value).toBe('x')
  })

  it('游標換算與刪除', () => {
    const r = applyMask('1234AB', sn)
    expect(r.value).toBe('SN-1234-AB')
    expect(rawIndexAt(r.slots, 8)).toBe(4)
    expect(rawIndexAt(r.slots, 99)).toBe(6)
    expect(caretForRaw(r.slots, 0)).toBe(3)
    expect(caretForRaw(r.slots, 4)).toBe(7)
    expect(caretForRaw(r.slots, 5)).toBe(9)
    expect(caretForRaw(r.slots, 99)).toBe(10)
    expect(caretForRaw([], 0)).toBe(0)
    // Backspace 在 - 後面：跳過 - 刪掉 4
    expect(deleteRange(r.value, r.slots, 8, 8, 'back')).toEqual({ text: 'SN-123-AB', caretRaw: 3 })
    // Delete 在 - 前面：跳過 - 刪掉 A
    expect(deleteRange(r.value, r.slots, 7, 7, 'forward')).toEqual({ text: 'SN-1234-B', caretRaw: 4 })
    // 選取範圍
    expect(deleteRange(r.value, r.slots, 3, 5, 'back')).toEqual({ text: 'SN-34-AB', caretRaw: 0 })
    // 沒東西可刪
    expect(deleteRange(r.value, r.slots, 3, 3, 'back')).toBeNull()
    expect(deleteRange(r.value, r.slots, 10, 10, 'forward')).toBeNull()
  })

  it('樣板、數字鍵盤判斷、IP 檢查', () => {
    expect(maskTemplate(sn)).toBe('SN-____-____')
    expect(maskTemplate(parseMask('##:##'), '0')).toBe('00:00')
    expect(isNumericMask(parseMask('09##-###-###'))).toBe(true)
    expect(isNumericMask(sn)).toBe(false)
    expect(isNumericMask(parseMask('---'))).toBe(false)
    expect(validIPv4('192.168.1.10')).toBe(true)
    expect(validIPv4('0.0.0.0')).toBe(true)
    expect(validIPv4('256.1.1.1')).toBe(false)
    expect(validIPv4('01.1.1.1')).toBe(false)
    expect(validIPv4('1.1.1')).toBe(false)
  })
})
