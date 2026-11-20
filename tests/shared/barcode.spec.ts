import { describe, expect, it } from 'vitest'
import {
  BarcodeError,
  CODE128_PATTERNS,
  CODE39_PATTERNS,
  code128Values,
  code39CheckChar,
  encodeBarcode,
  encodeCode128,
  encodeCode39,
} from '@/components/library/shared/barcode'

const sum = (s: string) => [...s].reduce((a, c) => a + Number(c), 0)

describe('Code 128 圖樣表', () => {
  it('0～105 每個 6 段、11 模組，黑條總寬是偶數；結束碼 13 模組', () => {
    expect(CODE128_PATTERNS).toHaveLength(107)
    CODE128_PATTERNS.slice(0, 106).forEach((p) => {
      expect(p).toHaveLength(6)
      expect(sum(p)).toBe(11)
      expect((+p[0] + +p[2] + +p[4]) % 2).toBe(0)
    })
    expect(sum(CODE128_PATTERNS[106])).toBe(13)
    // 沒有重複的圖樣
    expect(new Set(CODE128_PATTERNS).size).toBe(107)
  })
})

describe('code128Values（字集切換與檢查碼）', () => {
  it('一般文字用 B；檢查碼 = (開始碼 + Σ值×位置) mod 103', () => {
    // A = 33：(104 + 33) % 103 = 34
    expect(code128Values('A')).toEqual([104, 33, 34, 106])
  })

  it('整串數字（偶數位）用 C、兩位一組', () => {
    expect(code128Values('1234')).toEqual([105, 12, 34, (105 + 12 + 34 * 2) % 103, 106])
    expect(code128Values('00').slice(0, 2)).toEqual([105, 0])
  })

  it('開頭 4 位以上數字用 C，之後切 B；奇數位數字串先用 B 編一位再切 C', () => {
    const v = code128Values('1234AB')
    expect(v.slice(0, 5)).toEqual([105, 12, 34, 100, 33])
    const w = code128Values('A12345')
    // A、1（B 集）、切 C、23、45
    expect(w.slice(0, 6)).toEqual([104, 33, 17, 99, 23, 45])
  })

  it('奇數位的純數字：開頭用 C 編成對，剩一位切 B', () => {
    const v = code128Values('12345')
    expect(v.slice(0, 5)).toEqual([105, 12, 34, 100, 21])
  })

  it('控制字元用 A；小寫用 B；之間會切換', () => {
    const tab = code128Values('\tx')
    expect(tab[0]).toBe(103) // 先遇到控制字元 → 開始碼 A
    expect(tab[1]).toBe(9 + 64)
    expect(tab[2]).toBe(100) // 切 B
    const lower = code128Values('x\t')
    expect(lower[0]).toBe(104)
    expect(lower[2]).toBe(101) // 切 A
  })

  it('C 集裡遇到控制字元切 A', () => {
    const v = code128Values('1234\t')
    expect(v.slice(0, 5)).toEqual([105, 12, 34, 101, 73])
  })

  it('非 ASCII 與空字串丟 BarcodeError，帶出無法編碼的字元', () => {
    try {
      code128Values('工單A')
      throw new Error('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(BarcodeError)
      expect((e as BarcodeError).invalidChars).toEqual(['工', '單'])
    }
    expect(() => code128Values('')).toThrow(BarcodeError)
  })
})

describe('encodeCode128', () => {
  it('寬度序列從黑條開始、模組數 = 11 × 符號數 + 2', () => {
    const r = encodeCode128('WO-2611-0042')
    const symbols = code128Values('WO-2611-0042').length
    expect(r.modules).toBe(11 * symbols + 2)
    expect(r.widths.length % 2).toBe(1) // 最後一段也是黑條
    expect(r.text).toBe('WO-2611-0042')
  })
})

describe('Code 39', () => {
  it('圖樣表：每個字元 9 段、剛好 3 段寬', () => {
    for (const p of Object.values(CODE39_PATTERNS)) {
      expect(p).toHaveLength(9)
      expect([...p].filter((b) => b === '1')).toHaveLength(3)
    }
    expect(Object.keys(CODE39_PATTERNS)).toHaveLength(44)
  })

  it('檢查碼 mod 43：CODE39 → W', () => {
    expect(code39CheckChar('CODE39')).toBe('W')
    expect(code39CheckChar('0')).toBe('0')
  })

  it('小寫轉大寫、前後加 *、字元間有窄間隔；檢查碼附加在文字後面', () => {
    const r = encodeCode39('ab')
    expect(r.text).toBe('AB')
    // 4 個字元（* A B *）× 9 段 + 3 個間隔
    expect(r.widths).toHaveLength(4 * 9 + 3)
    // 每個字元 6 窄 + 3 寬（寬 3）= 15 模組，間隔各 1
    expect(r.modules).toBe(4 * 15 + 3)
    const c = encodeCode39('CODE39', { checkDigit: true })
    expect(c.text).toBe('CODE39W')
    expect(encodeCode39('A', { ratio: 2 }).modules).toBe(3 * 12 + 2)
  })

  it('不支援的字元與空字串丟錯', () => {
    try {
      encodeCode39('A_B#')
      throw new Error('should throw')
    } catch (e) {
      expect((e as BarcodeError).invalidChars).toEqual(['_', '#'])
    }
    expect(() => encodeCode39('')).toThrow(BarcodeError)
  })
})

describe('encodeBarcode', () => {
  it('依 format 分派', () => {
    expect(encodeBarcode('AB', 'code128').text).toBe('AB')
    expect(encodeBarcode('ab', 'code39', { checkDigit: true }).text).toBe('AB' + code39CheckChar('AB'))
  })
})
