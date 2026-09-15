import { describe, expect, it } from 'vitest'
import { computed } from 'vue'
import {
  useGridFacetLayout,
  useVerticalFacetLayout,
  type GridFacetDatum,
} from '@/components/library/charts/composables/faceChart/useFacetLayout'

describe('useVerticalFacetLayout', () => {
  const W = computed(() => 1000)

  it('全部沒指定高度時平均分配', () => {
    const { facetHeights } = useVerticalFacetLayout(
      { facets: [{}, {}], margin: { top: 0, bottom: 0 }, facetSpacing: 0, lastFacetExtraHeight: 0 },
      computed(() => 600)
    )
    expect(facetHeights.value).toEqual([300, 300])
  })

  it('全部指定高度時當作權重比例分配', () => {
    const { facetHeights } = useVerticalFacetLayout(
      {
        facets: [{ height: 1 }, { height: 3 }],
        margin: { top: 0, bottom: 0 },
        facetSpacing: 0,
        lastFacetExtraHeight: 0,
      },
      computed(() => 800)
    )
    expect(facetHeights.value).toEqual([200, 600])
  })

  it('部分指定高度時：固定值優先，其餘均分剩下的空間', () => {
    const { facetHeights } = useVerticalFacetLayout(
      {
        facets: [{ height: 400 }, {}, {}],
        margin: { top: 0, bottom: 0 },
        facetSpacing: 0,
        lastFacetExtraHeight: 0,
      },
      computed(() => 1000)
    )
    expect(facetHeights.value).toEqual([400, 300, 300])
  })

  it('最後一個分面多留高度給 X 軸標籤', () => {
    const { facetHeights } = useVerticalFacetLayout(
      { facets: [{}, {}], margin: { top: 0, bottom: 0 }, facetSpacing: 0, lastFacetExtraHeight: 50 },
      computed(() => 600)
    )
    expect(facetHeights.value[1] - facetHeights.value[0]).toBe(50)
  })

  it('空間不足時仍保留最小高度，不會變成負值', () => {
    const { facetHeights } = useVerticalFacetLayout(
      { facets: [{}, {}, {}], margin: { top: 40, bottom: 60 }, facetSpacing: 10 },
      computed(() => 50)
    )
    expect(facetHeights.value.every((h) => h >= 100)).toBe(true)
  })

  it('分面為空時回傳空陣列而不是拋錯', () => {
    const { facetHeights, facetOffsets } = useVerticalFacetLayout(
      { facets: [] },
      computed(() => 600)
    )
    expect(facetHeights.value).toEqual([])
    expect(facetOffsets.value).toEqual([])
  })

  it('偏移由上往下累加，含間距', () => {
    const { facetOffsets } = useVerticalFacetLayout(
      { facets: [{}, {}], margin: { top: 20, bottom: 0 }, facetSpacing: 10, lastFacetExtraHeight: 0 },
      computed(() => 420)
    )
    // availableHeight = 420 - 20 - 0 - 10 = 390 → 每個 195
    expect(facetOffsets.value).toEqual([20, 20 + 195 + 10])
  })

  it('chartWidth 使用 props.width', () => {
    const { chartWidth } = useVerticalFacetLayout({ facets: [], width: 777 }, W)
    expect(chartWidth.value).toBe(777)
  })
})

describe('useGridFacetLayout', () => {
  const W = computed(() => 680)
  const H = computed(() => 440)

  function gridSetup(data: GridFacetDatum[], extra = {}) {
    return useGridFacetLayout(
      { data, xFacetVar: 'site', yFacetVar: 'line', headerWidth: 80, headerHeight: 40, ...extra },
      W,
      H
    )
  }

  describe('分面座標排序（回歸）', () => {
    it('數值分面按數值排序，不是字典序', () => {
      // Bug：原本直接用 Array.prototype.sort()，數值會排成 1, 10, 2…
      const { uniqueXValues } = gridSetup([
        { site: 2, line: 'A' },
        { site: 10, line: 'A' },
        { site: 1, line: 'A' },
      ])
      expect(uniqueXValues.value).toEqual([1, 2, 10])
    })

    it('數字字串同樣按數值排序', () => {
      const { uniqueXValues } = gridSetup([
        { site: '2', line: 'A' },
        { site: '10', line: 'A' },
        { site: '1', line: 'A' },
      ])
      expect(uniqueXValues.value).toEqual(['1', '2', '10'])
    })

    it('文字分面按字典序排序', () => {
      const { uniqueYValues } = gridSetup([
        { site: 'S1', line: 'C' },
        { site: 'S1', line: 'A' },
        { site: 'S1', line: 'B' },
      ])
      expect(uniqueYValues.value).toEqual(['A', 'B', 'C'])
    })
  })

  describe('網格維度', () => {
    it('依唯一值算出列數與欄數', () => {
      const { cols, rows } = gridSetup([
        { site: 'S1', line: 'A' },
        { site: 'S2', line: 'A' },
        { site: 'S1', line: 'B' },
      ])
      expect(cols.value).toBe(2)
      expect(rows.value).toBe(2)
    })

    it('沒有資料時列數欄數為 1，避免除以 0', () => {
      const { cols, rows, cellWidth } = gridSetup([])
      expect(cols.value).toBe(1)
      expect(rows.value).toBe(1)
      expect(Number.isFinite(cellWidth.value)).toBe(true)
    })

    it('單元格尺寸扣掉表頭', () => {
      const { cellWidth, cellHeight } = gridSetup([
        { site: 'S1', line: 'A' },
        { site: 'S2', line: 'A' },
      ])
      // 1 列 2 欄
      expect(cellWidth.value).toBe((680 - 80) / 2)
      expect(cellHeight.value).toBe((440 - 40) / 1)
    })

    it('未設定 xFacetVar 時不產生任何分面', () => {
      const api = useGridFacetLayout({ data: [{ site: 'S1', line: 'A' }] }, W, H)
      expect(api.gridFacets.value).toEqual([])
    })
  })

  describe('gridFacets', () => {
    it('組出 id、row、col 與座標值', () => {
      const { gridFacets } = gridSetup([
        { site: 'S1', line: 'A' },
        { site: 'S2', line: 'B' },
      ])

      const ids = gridFacets.value.map((f) => f.id)
      expect(ids).toContain('S1-A')
      expect(ids).toContain('S2-B')

      const s2b = gridFacets.value.find((f) => f.id === 'S2-B')!
      expect(s2b.row).toBe(1)
      expect(s2b.col).toBe(1)
    })

    it('沒有對應資料的格子會被跳過', () => {
      // 2x2 的座標組合，但只提供 3 筆資料
      const { gridFacets } = gridSetup([
        { site: 'S1', line: 'A' },
        { site: 'S2', line: 'A' },
        { site: 'S1', line: 'B' },
      ])
      expect(gridFacets.value).toHaveLength(3)
    })

    it('明確傳入的 domain 優先於推算值', () => {
      const { gridFacets } = gridSetup([
        {
          site: 'S1',
          line: 'A',
          yLeftDomain: [0, 999],
          layers: [
            { type: 'bar', yAxis: 'left', data: [{ x: 1, y: 5 }], xValue: (d) => d.x as number, yValue: (d) => d.y as number },
          ],
        },
      ])
      expect(gridFacets.value[0].yLeftDomain).toEqual([0, 999])
    })

    it('左 Y domain 由資料推算，從 0 起算並上留 10%', () => {
      const { gridFacets } = gridSetup([
        {
          site: 'S1',
          line: 'A',
          layers: [
            {
              type: 'bar',
              yAxis: 'left',
              data: [{ x: 1, y: 10 }, { x: 2, y: 50 }],
              xValue: (d) => d.x as number,
              yValue: (d) => d.y as number,
            },
          ],
        },
      ])
      const [min, max] = gridFacets.value[0].yLeftDomain!
      expect(min).toBe(0)
      expect(max).toBeCloseTo(55)
    })

    it('堆疊圖的左 Y domain 以同一 X 的各段總和計算', () => {
      const { gridFacets } = gridSetup([
        {
          site: 'S1',
          line: 'A',
          layers: [
            {
              type: 'stacked-bar',
              yAxis: 'left',
              data: [
                { x: 'Q1', a: 3, b: 4 },
                { x: 'Q2', a: 10, b: 10 },
              ],
              xValue: (d) => d.x as string,
              stackKeys: ['a', 'b'],
            },
          ],
        },
      ])
      // Q1=7、Q2=20 → 上界 22
      expect(gridFacets.value[0].yLeftDomain).toEqual([0, 22])
    })

    it('右 Y domain 兩端各留白，負值不會被裁掉（回歸）', () => {
      // Bug：原本寫 [min * 0.9, max * 1.1]。min 為負時 min * 0.9 往零靠，
      //      domain 反而變窄，最低的資料點會被裁掉。
      const { gridFacets } = gridSetup([
        {
          site: 'S1',
          line: 'A',
          layers: [
            {
              type: 'line',
              yAxis: 'right',
              data: [{ x: 1, y: -100 }, { x: 2, y: 100 }],
              xValue: (d) => d.x as number,
              yValue: (d) => d.y as number,
            },
          ],
        },
      ])

      const [min, max] = gridFacets.value[0].yRightDomain!
      expect(min).toBeLessThan(-100)
      expect(max).toBeGreaterThan(100)
    })

    it('右 Y 軸所有值相同時 domain 不會退化成零寬度', () => {
      const { gridFacets } = gridSetup([
        {
          site: 'S1',
          line: 'A',
          layers: [
            {
              type: 'line',
              yAxis: 'right',
              data: [{ x: 1, y: 50 }, { x: 2, y: 50 }],
              xValue: (d) => d.x as number,
              yValue: (d) => d.y as number,
            },
          ],
        },
      ])

      const [min, max] = gridFacets.value[0].yRightDomain!
      expect(max).toBeGreaterThan(min)
    })

    it('沒有圖層時 domain 為 undefined 而不是 NaN', () => {
      const { gridFacets } = gridSetup([{ site: 'S1', line: 'A' }])
      const facet = gridFacets.value[0]

      expect(facet.yLeftDomain).toBeUndefined()
      expect(facet.yRightDomain).toBeUndefined()
    })
  })

  describe('樣式計算', () => {
    it('格子定位含表頭偏移', () => {
      const { getGridCellStyle } = gridSetup([
        { site: 'S1', line: 'A' },
        { site: 'S2', line: 'B' },
      ])
      // 2 列 2 欄：cellWidth = (680-80)/2 = 300、cellHeight = (440-40)/2 = 200
      const style = getGridCellStyle(1, 1)

      expect(style.top).toBe(`${40 + 1 * 200}px`)
      expect(style.left).toBe(`${80 + 1 * 300}px`)
    })

    it('顏色走設計令牌的 CSS 變數，不是寫死色碼', () => {
      const { getGridCellStyle, getColHeaderStyle } = gridSetup([{ site: 'S1', line: 'A' }])

      expect(String(getGridCellStyle(0, 0).border)).toContain('var(--color-border')
      expect(String(getColHeaderStyle(0).backgroundColor)).toContain('var(--color-bg')
    })

    it('只有最外圈的格子留空間給座標軸標籤', () => {
      const { getCellMargin } = gridSetup([
        { site: 'S1', line: 'A' },
        { site: 'S2', line: 'B' },
      ])

      expect(getCellMargin(0, 0).left).toBe(40)
      expect(getCellMargin(0, 1).left).toBe(5)
      expect(getCellMargin(1, 1).right).toBe(40)
      expect(getCellMargin(1, 0).bottom).toBe(40)
      expect(getCellMargin(0, 0).bottom).toBe(5)
    })
  })
})
