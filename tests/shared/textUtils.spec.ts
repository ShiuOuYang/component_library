import { afterEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { clipText } from '@/components/library/shared/textClip'
import { downloadBlob } from '@/components/library/shared/download'
import { qrMatrix } from '@/components/library/shared/qrMatrix'
import { logGamma } from '@/components/library/charts/utils/gamma'
import { truncateText } from '@/components/library/charts/utils/chartText'
import { truncateText as truncateFromBar } from '@/components/library/charts/utils/horizontalBar'
import { downloadBlob as downloadFromChart } from '@/components/library/charts/utils/chartExport'
import { qrMatrix as qrFromLabel } from '@/components/library/shared/labelDesigner'
import ChptRadio from '@/components/library/ui/ChptRadio.vue'

/** 第三批優化：從各元件抽出來共用的小工具 */

describe('clipText', () => {
  it('英數算 1 單位、中文算 2，超出補「…」', () => {
    expect(clipText('abc', 100)).toBe('abc')
    expect(clipText('abcdefghij', 33)).toBe('abcde…') // 33 / 6.5 → 5 單位
    expect(clipText('一二三四五', 33)).toBe('一二…')
    expect(clipText('', 10)).toBe('')
  })

  it('預算下限、單位寬、窄字元範圍', () => {
    expect(clipText('abcdef', 0)).toBe('ab…') // 下限 2
    expect(clipText('abcdef', 0, { min: 3 })).toBe('abc…')
    expect(clipText('abcdef', 20, { unit: 10 })).toBe('ab…')
    // ā（U+0101）預設算寬字元；narrowMax 0x24f 時算窄字元
    expect(clipText('āāāā', 20)).toBe('ā…')
    expect(clipText('āāāā', 20, { narrowMax: 0x24f })).toBe('āāā…')
  })
})

describe('truncateText', () => {
  const measure = (s: string) => s.length * 10
  it('放得下的最長前綴 + …；放不下任何字元時回傳空字串', () => {
    expect(truncateText('abc', 30, measure)).toBe('abc')
    expect(truncateText('abcdef', 40, measure)).toBe('abc…')
    expect(truncateText('abcdef', 5, measure)).toBe('')
  })
  it('舊的匯入路徑仍可用', () => {
    expect(truncateFromBar).toBe(truncateText)
  })
})

describe('logGamma', () => {
  it('Γ(n) = (n−1)!；Γ(1/2) = √π；小於 1/2 用反射公式', () => {
    expect(logGamma(1)).toBeCloseTo(0, 12)
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 12)
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12)
    // Γ(1/4) ≈ 3.625609908221908
    expect(Math.exp(logGamma(0.25))).toBeCloseTo(3.625609908221908, 10)
    expect(logGamma(101)).toBeCloseTo(363.73937555556347, 8) // ln(100!)
  })
})

describe('downloadBlob', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  it('建立連結、點擊、移除，一秒後才釋放網址', () => {
    vi.useFakeTimers()
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
    const clicks: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this)
      expect(document.body.contains(this)).toBe(true) // Firefox 要求連結在文件裡
    })
    downloadBlob(new Blob(['x']), '報表.csv')
    expect(clicks).toHaveLength(1)
    expect(clicks[0].download).toBe('報表.csv')
    expect(clicks[0].href).toBe('blob:x')
    expect(document.body.contains(clicks[0])).toBe(false)
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(revoke).toHaveBeenCalledWith('blob:x')
  })
  it('chartExport 的匯出是同一個函式', () => {
    expect(downloadFromChart).toBe(downloadBlob)
  })
})

describe('qrMatrix', () => {
  it('中文內容、容錯等級、空字串與超量', () => {
    const m = qrMatrix('料號 A-001')!
    expect(m.length).toBe(m[0].length)
    expect(qrMatrix('hello', 'H')!.length).toBeGreaterThanOrEqual(qrMatrix('hello', 'L')!.length)
    expect(qrMatrix('')).toBeNull()
    expect(qrMatrix('x'.repeat(5000))).toBeNull()
    expect(qrFromLabel).toBe(qrMatrix)
  })
})

describe('ChptRadio 自動群組名稱', () => {
  it('沒給 name 時同一組共用一個名稱、不同組不同；有給就用給的', () => {
    const items = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ]
    const w = mount({ render: () => h('div', [h(ChptRadio, { items }), h(ChptRadio, { items }), h(ChptRadio, { items, name: 'shift' })]) })
    const names = w.findAll('input[type="radio"]').map((i) => i.attributes('name'))
    expect(names[0]).toBe(names[1])
    expect(names[0]).toMatch(/^chpt-radio-/)
    expect(names[2]).not.toBe(names[0])
    expect(names.slice(4)).toEqual(['shift', 'shift'])
    w.unmount()
  })
})
