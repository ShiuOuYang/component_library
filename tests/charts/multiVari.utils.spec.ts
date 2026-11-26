import { describe, expect, it } from 'vitest'
import { buildMultiVari, multiVariPositions } from '@/components/library/charts/utils/multiVari'

// 2 天 × 2 機台 × 2 模穴 × 2 件
const rows: Record<string, unknown>[] = []
for (const day of ['D1', 'D2'])
  for (const machine of ['M1', 'M2'])
    for (const cavity of ['C1', 'C2'])
      for (const k of [0, 1]) rows.push({ day, machine, cavity, v: (day === 'D2' ? 1 : 0) + (machine === 'M2' ? 2 : 0) + (cavity === 'C2' ? 4 : 0) + k * 0.5 })

describe('multiVari', () => {
  it('三層：區塊、位置、最內層、平均與範圍', () => {
    const d = buildMultiVari(rows, { value: 'v', factors: ['day', 'machine', 'cavity'] })
    expect(d.panels.map((p) => p.level)).toEqual(['D1', 'D2'])
    expect(d.panels[0].positions.map((p) => p.level)).toEqual(['M1', 'M2'])
    expect(d.innerLevels).toEqual(['C1', 'C2'])
    const pos = d.panels[1].positions[1]
    expect(pos.panel).toBe('D2')
    expect(pos.cell).toMatchObject({ path: ['D2', 'M2'], n: 4, min: 3, max: 7.5 })
    expect(pos.inner.map((c) => [c.path.join('/'), c.mean])).toEqual([['D2/M2/C1', 3.25], ['D2/M2/C2', 7.25]])
    expect(d.all.n).toBe(16)
    expect(multiVariPositions(d)).toHaveLength(4)
  })

  it('巢狀平方和：各層加總等於總平方和、主要來源', () => {
    const d = buildMultiVari(rows, { value: 'v', factors: ['day', 'machine', 'cavity'] })
    const ss = Object.fromEntries(d.sources.map((s) => [s.source, s.ss]))
    // 平衡的設計：每個因子的效果 e 貢獻 16 × (e / 2)²
    expect(ss.day).toBeCloseTo(4)
    expect(ss.machine).toBeCloseTo(16)
    expect(ss.cavity).toBeCloseTo(64)
    expect(ss.within).toBeCloseTo(1) // 每格 (±0.25)² × 2 × 8
    const total = rows.reduce((s, r) => s + ((r.v as number) - d.all.mean) ** 2, 0)
    expect(d.sources.reduce((s, x) => s + x.ss, 0)).toBeCloseTo(total)
    expect(d.sources.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(100)
    expect(d.dominant).toBe('cavity')
  })

  it('兩層、一層、超過三層只取前三個', () => {
    const two = buildMultiVari(rows, { value: 'v', factors: ['machine', 'cavity'] })
    expect(two.panels).toHaveLength(1)
    expect(two.panels[0].level).toBeNull()
    expect(two.panels[0].positions.map((p) => p.level)).toEqual(['M1', 'M2'])
    expect(two.panels[0].positions[0].panel).toBeNull()
    expect(two.panels[0].positions[0].inner).toHaveLength(2)
    const one = buildMultiVari(rows, { value: 'v', factors: ['cavity'] })
    expect(one.innerLevels).toEqual([])
    expect(one.panels[0].positions.map((p) => [p.level, p.cell.n, p.inner.length])).toEqual([['C1', 8, 0], ['C2', 8, 0]])
    expect(buildMultiVari(rows, { value: 'v', factors: ['day', 'machine', 'cavity', 'x'] }).factors).toEqual(['day', 'machine', 'cavity'])
  })

  it('水準順序：出現順序 / 自然排序；缺值、字串數字、空白因子', () => {
    const r = [
      { lot: '10', v: '1' },
      { lot: '2', v: 2 },
      { lot: '1', v: 'x' },
      { lot: '1', v: 3 },
      { lot: '', v: 4 },
      { lot: null, v: 5 },
      { lot: '2', v: '' },
      null as unknown as Record<string, unknown>,
    ]
    expect(buildMultiVari(r, { value: 'v', factors: ['lot'] }).panels[0].positions.map((p) => p.level)).toEqual(['10', '2', '1', '—'])
    const nat = buildMultiVari(r, { value: 'v', factors: ['lot'], levelOrder: 'natural' })
    expect(nat.panels[0].positions.map((p) => p.level)).toEqual(['—', '1', '2', '10'])
    expect(nat.all.n).toBe(5)
    expect(nat.panels[0].positions.find((p) => p.level === '—')!.cell.values).toEqual([4, 5])
  })

  it('沒有資料、全部相同', () => {
    const empty = buildMultiVari([], { value: 'v', factors: ['a', 'b'] })
    expect(empty.all.n).toBe(0)
    expect(Number.isNaN(empty.all.mean)).toBe(true)
    expect(multiVariPositions(empty)).toEqual([])
    expect(empty.dominant).toBeNull()
    const flat = buildMultiVari([{ a: 'x', v: 1 }, { a: 'y', v: 1 }], { value: 'v', factors: ['a'] })
    expect(flat.sources.every((s) => s.pct === 0)).toBe(true)
    expect(flat.dominant).toBeNull()
  })
})
