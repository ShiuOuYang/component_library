import { describe, expect, it } from 'vitest'
import { allBomKeys, ancestorKeys, bomKeyOf, diffBom, explodeBom, flattenBom, searchBom, whereUsed, type BomItem } from '@/components/library/shared/bom'

const bom: BomItem = {
  partNo: 'FG',
  name: '成品',
  qty: 1,
  children: [
    {
      partNo: 'SUB',
      name: '半成品',
      qty: 2,
      children: [
        { partNo: 'R1', name: '電阻', qty: 10, ref: 'R1-R10' },
        { partNo: 'IC', name: 'MCU', qty: 1, critical: true },
      ],
    },
    { partNo: 'R1', name: '電阻', qty: 4 },
    { id: 'case-b', partNo: 'CASE', name: '外殼', qty: 1 },
  ],
}

describe('bom', () => {
  it('flattenBom / allBomKeys：展開狀態、每台用量連乘、key 路徑', () => {
    expect(flattenBom(bom, new Set()).map((r) => r.key)).toEqual(['FG'])
    const all = new Set(allBomKeys(bom))
    expect([...all]).toEqual(['FG', 'FG/SUB'])
    const rows = flattenBom(bom, all)
    expect(rows.map((r) => [r.key, r.level, r.perUnit, r.hasChildren])).toEqual([
      ['FG', 0, 1, true],
      ['FG/SUB', 1, 2, true],
      ['FG/SUB/R1', 2, 20, false],
      ['FG/SUB/IC', 2, 2, false],
      ['FG/R1', 1, 4, false],
      ['FG/case-b', 1, 1, false],
    ])
    expect(rows[2].parentKey).toBe('FG/SUB')
    expect(allBomKeys(bom, 1)).toEqual(['FG'])
    expect(bomKeyOf({ partNo: 'X', qty: 1 })).toBe('X')
  })

  it('explodeBom：扣抵半成品庫存、同料號共用庫存、缺料', () => {
    const { needs, parts } = explodeBom(bom, 10, { SUB: 5, R1: 100, IC: 3, CASE: 20 })
    expect(needs.get('FG')).toEqual({ gross: 10, fromStock: 0, net: 10 })
    expect(needs.get('FG/SUB')).toEqual({ gross: 20, fromStock: 5, net: 15 })
    // R1：半成品下 15 × 10 = 150，先用 100 → 缺 50；成品下 40，庫存已用完 → 缺 40
    expect(needs.get('FG/SUB/R1')).toEqual({ gross: 150, fromStock: 100, net: 50 })
    expect(needs.get('FG/R1')).toEqual({ gross: 40, fromStock: 0, net: 40 })
    const byPart = Object.fromEntries(parts.map((p) => [p.partNo, p]))
    expect(byPart.R1).toMatchObject({ required: 190, stock: 100, shortage: 90 })
    expect(byPart.IC).toMatchObject({ required: 15, stock: 3, shortage: 12, critical: true })
    expect(byPart.CASE).toMatchObject({ required: 10, shortage: 0 })
    expect(byPart.SUB).toBeUndefined()
  })

  it('explodeBom：不扣抵時為毛需求 − 庫存；負的生產數量與庫存當 0', () => {
    const { needs, parts } = explodeBom(bom, 10, { SUB: 5, R1: 100 }, false)
    expect(needs.get('FG/SUB')).toEqual({ gross: 20, fromStock: 0, net: 20 })
    expect(parts.find((p) => p.partNo === 'R1')).toMatchObject({ required: 240, shortage: 140 })
    expect(parts.find((p) => p.partNo === 'IC')).toMatchObject({ required: 20, shortage: 20 })
    const zero = explodeBom(bom, -5, { R1: -10 })
    expect(zero.needs.get('FG')!.gross).toBe(0)
    expect(zero.parts.find((p) => p.partNo === 'R1')!.stock).toBe(0)
  })

  it('whereUsed / searchBom / ancestorKeys', () => {
    expect(whereUsed(bom, ' r1 ').map((u) => [u.key, u.path.map((p) => p.partNo).join('>'), u.perUnit])).toEqual([
      ['FG/SUB/R1', 'FG>SUB>R1', 20],
      ['FG/R1', 'FG>R1', 4],
    ])
    expect(whereUsed(bom, 'FG')).toEqual([])
    expect(whereUsed(bom, '')).toEqual([])
    expect([...searchBom(bom, 'mcu')]).toEqual(['FG/SUB/IC'])
    expect([...searchBom(bom, 'r1-r10')]).toEqual(['FG/SUB/R1'])
    expect([...searchBom(bom, '電阻')]).toEqual(['FG/SUB/R1', 'FG/R1'])
    expect(searchBom(bom, '  ').size).toBe(0)
    expect(ancestorKeys('FG/SUB/R1')).toEqual(['FG', 'FG/SUB'])
    expect(ancestorKeys('FG')).toEqual([])
  })

  it('diffBom：新增、刪除（只列最上面那一個）、用量變更；根料號不同也能比', () => {
    const old: BomItem = {
      partNo: 'FG-A',
      qty: 1,
      children: [
        { partNo: 'SUB', qty: 2, children: [{ partNo: 'R1', qty: 8 }, { partNo: 'OLD', qty: 1 }] },
        { partNo: 'GONE', qty: 1, children: [{ partNo: 'GONE-CHILD', qty: 1 }] },
        { id: 'case-b', partNo: 'CASE', qty: 1 },
      ],
    }
    const d = diffBom(old, bom)
    expect(d.changes.get('FG')).toEqual({ status: 'same' })
    expect(d.changes.get('FG/SUB/R1')).toEqual({ status: 'qty', oldQty: 8 })
    expect(d.changes.get('FG/SUB/IC')).toEqual({ status: 'added' })
    expect(d.changes.get('FG/R1')).toEqual({ status: 'added' })
    expect(d.changes.get('FG/case-b')).toEqual({ status: 'same' })
    expect(d.removed.map((r) => [r.parentKey, r.key])).toEqual([
      ['FG/SUB', 'FG/SUB/OLD'],
      ['FG', 'FG/GONE'],
    ])
  })
})
