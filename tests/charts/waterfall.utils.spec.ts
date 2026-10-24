import { describe, expect, it } from 'vitest'
import { buildWaterfall, shareOfStart, waterfallExtent } from '@/components/library/charts/utils/waterfall'

describe('buildWaterfall', () => {
  const opts = { labelField: 'label', valueField: 'value', kindField: 'type', keyField: 'id' }

  it('沒有種類時第一項是起點、其餘是增減；totalLabel 補上總計', () => {
    const items = buildWaterfall(
      [
        { label: '投入', value: 100 },
        { label: '報廢 A', value: -10 },
        { label: '重工回收', value: 3 },
      ],
      { ...opts, totalLabel: '良品' }
    )
    expect(items.map((i) => [i.label, i.kind, i.value, i.from, i.to])).toEqual([
      ['投入', 'start', 100, 0, 100],
      ['報廢 A', 'delta', -10, 100, 90],
      ['重工回收', 'delta', 3, 90, 93],
      ['良品', 'total', 93, 0, 93],
    ])
    expect(items[3].datum).toBeNull()
  })

  it('subtotal、total 畫到目前的累計值（忽略資料的數值）；最後已是 total 時不再補', () => {
    const items = buildWaterfall(
      [
        { label: '期初', value: 50, type: 'start' },
        { label: '+', value: 20, type: 'delta' },
        { label: '小計', value: 999, type: 'subtotal' },
        { label: '-', value: -5 },
        { label: '期末', type: 'total' },
      ],
      { ...opts, totalLabel: '合計' }
    )
    expect(items.map((i) => [i.kind, i.from, i.to])).toEqual([
      ['start', 0, 50],
      ['delta', 50, 70],
      ['subtotal', 0, 70],
      ['delta', 70, 65],
      ['total', 0, 65],
    ])
  })

  it('firstIsStart=false 時全部是增減，從 0 累計；不認得的種類當增減；不是數字當 0', () => {
    const items = buildWaterfall(
      [
        { label: 'a', value: 5, type: 'weird' },
        { label: 'b', value: 'x' },
        { label: 'c', value: -2 },
      ],
      { ...opts, firstIsStart: false }
    )
    expect(items.map((i) => [i.kind, i.from, i.to])).toEqual([
      ['delta', 0, 5],
      ['delta', 5, 5],
      ['delta', 5, 3],
    ])
  })

  it('key：用 keyField，沒有時用名稱，重複的加序號；總計撞名時也加後綴', () => {
    const items = buildWaterfall(
      [
        { id: 'k1', label: '投入', value: 10 },
        { label: '報廢', value: -1 },
        { label: '報廢', value: -1 },
        { label: '', value: -1 },
        { label: '良品', value: 1 },
      ],
      { ...opts, kindField: null, totalLabel: '良品' }
    )
    expect(items.map((i) => i.key)).toEqual(['k1', '報廢', '報廢#2', '3', '良品', '良品#total'])
  })

  it('沒有資料時沒有項目（也不補總計）', () => {
    expect(buildWaterfall([], { ...opts, totalLabel: '良品' })).toEqual([])
  })
})

describe('waterfallExtent / shareOfStart', () => {
  const opts = { labelField: 'label', valueField: 'value' }
  const items = buildWaterfall(
    [
      { label: '投入', value: 1000 },
      { label: 'a', value: -100 },
      { label: 'b', value: -50 },
    ],
    { ...opts, totalLabel: '良品' }
  )

  it('從 0 開始時包含 0；不從 0 開始時只看增減的兩端與合計的頂端，下方留 15%', () => {
    expect(waterfallExtent(items)).toEqual([0, 1000])
    const [lo, hi] = waterfallExtent(items, false)
    expect(hi).toBe(1000)
    expect(lo).toBeCloseTo(850 - 150 * 0.15)
  })

  it('有負值時包含負值；留白不跨過 0', () => {
    const neg = buildWaterfall([{ label: 's', value: -10 }, { label: 'd', value: -5 }], opts)
    expect(waterfallExtent(neg)).toEqual([-15, 0])
    const [, hi] = waterfallExtent(neg, false)
    expect(hi).toBeLessThanOrEqual(0)
    const small = buildWaterfall([{ label: 's', value: 1 }, { label: 'd', value: 9 }], opts)
    expect(waterfallExtent(small, false)[0]).toBe(0)
  })

  it('全部相同或沒有資料時給一個範圍', () => {
    expect(waterfallExtent([])).toEqual([0, 1])
    expect(waterfallExtent([], false)).toEqual([0, 1])
    const flat = buildWaterfall([{ label: 's', value: 0 }], opts)
    expect(waterfallExtent(flat)).toEqual([0, 1])
    const one = buildWaterfall([{ label: 's', value: 5 }], opts)
    expect(waterfallExtent(one, false)).toEqual([4, 6])
  })

  it('佔起點的比例；總計就是良率；沒有起點或起點為 0 時為 null', () => {
    expect(shareOfStart(items, 1)).toBeCloseTo(-0.1)
    expect(shareOfStart(items, 3)).toBeCloseTo(0.85)
    const noStart = buildWaterfall([{ label: 'a', value: 1 }], { ...opts, firstIsStart: false })
    expect(shareOfStart(noStart, 0)).toBeNull()
    const zero = buildWaterfall([{ label: 's', value: 0 }, { label: 'a', value: 1 }], opts)
    expect(shareOfStart(zero, 1)).toBeNull()
  })
})
