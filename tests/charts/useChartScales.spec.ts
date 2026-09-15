import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { useChartScales } from '@/components/library/charts/composables/useChartScales'
import type {
  ChartScalesProps,
  XDomain,
  YDomain,
} from '@/components/library/charts/types/chart.types'

interface Row {
  category: string
  value: number
  a: number
  b: number
  [key: string]: unknown
}

const ROWS: Row[] = [
  { category: 'Q1', value: 10, a: 3, b: 4 },
  { category: 'Q2', value: 30, a: 5, b: 5 },
  { category: 'Q3', value: 20, a: 1, b: 2 },
]

function setup(overrides: Partial<ChartScalesProps<Row>> = {}) {
  const props: ChartScalesProps<Row> = {
    layers: [
      {
        type: 'bar',
        yAxis: 'left',
        data: ROWS,
        xValue: (d) => d.category,
        yValue: (d) => d.value,
      },
    ],
    xScaleType: 'band',
    yLeftScaleType: 'linear',
    brushMode: 'none',
    ...overrides,
  }

  const currentXDomain = ref<XDomain | null>(null)
  const currentYLeftDomain = ref<YDomain | null>(null)
  const currentYRightDomain = ref<YDomain | null>(null)

  const api = useChartScales(
    props,
    computed(() => 300),
    computed(() => 200),
    currentXDomain,
    currentYLeftDomain,
    currentYRightDomain
  )

  return { api, props, currentXDomain, currentYLeftDomain, currentYRightDomain }
}

describe('useChartScales', () => {
  describe('圖層分組', () => {
    it('依 yAxis 分成左右兩組', () => {
      const { api } = setup({
        layers: [
          { type: 'bar', yAxis: 'left', data: ROWS, xValue: (d) => d.category, yValue: (d) => d.value },
          { type: 'line', yAxis: 'right', data: ROWS, xValue: (d) => d.category, yValue: (d) => d.a },
        ],
      })

      expect(api.leftLayers.value).toHaveLength(1)
      expect(api.rightLayers.value).toHaveLength(1)
      expect(api.rightLayers.value[0].type).toBe('line')
    })

    it('沒有指定 yAxis 的圖層不會被分到任何一側', () => {
      const { api } = setup({
        layers: [{ type: 'bar', data: ROWS, xValue: (d) => d.category, yValue: (d) => d.value }],
      })

      expect(api.leftLayers.value).toHaveLength(0)
      expect(api.rightLayers.value).toHaveLength(0)
      expect(api.yLeftScale.value).toBeNull()
    })
  })

  describe('資料為空時的防禦', () => {
    it('沒有任何資料時 xScale 為 null 而不是拋錯', () => {
      const { api } = setup({ layers: [{ type: 'bar', yAxis: 'left', data: [] }] })
      expect(api.xScale.value).toBeNull()
    })

    it('圖層陣列為空時 xScale 為 null', () => {
      const { api } = setup({ layers: [] })
      expect(api.xScale.value).toBeNull()
    })
  })

  describe('X 軸比例尺', () => {
    it('band scale 的 domain 取自資料', () => {
      const { api } = setup()
      expect(api.xScale.value?.domain()).toEqual(['Q1', 'Q2', 'Q3'])
    })

    it('明確傳入的 xDomain 優先於資料推算', () => {
      const { api } = setup({ xDomain: ['Q3', 'Q1'] })
      expect(api.xScale.value?.domain()).toEqual(['Q3', 'Q1'])
    })

    it('連續型 X 軸以 extent 推算範圍', () => {
      const { api } = setup({
        xScaleType: 'linear',
        layers: [
          {
            type: 'scatter',
            yAxis: 'left',
            data: ROWS,
            xValue: (d) => d.value,
            yValue: (d) => d.a,
          },
        ],
      })

      expect(api.xScale.value?.domain()).toEqual([10, 30])
    })

    it('currentXDomain 會覆寫基礎 domain（brush 縮放）', () => {
      const { api, currentXDomain } = setup()
      expect(api.xScale.value?.domain()).toHaveLength(3)

      currentXDomain.value = ['Q1', 'Q2']
      expect(api.xScale.value?.domain()).toEqual(['Q1', 'Q2'])
    })

    it('未知的 xScaleType 退回 linear 而不是壞掉', () => {
      const { api } = setup({
        xScaleType: 'nope' as never,
        layers: [
          { type: 'scatter', yAxis: 'left', data: ROWS, xValue: (d) => d.value, yValue: (d) => d.a },
        ],
      })
      expect(api.xScale.value?.domain()).toEqual([10, 30])
    })
  })

  describe('Y 軸比例尺', () => {
    it('上方留 10% 空白', () => {
      const { api } = setup()
      // 最大值 30 → domain 上界 33，經 nice() 取整
      const [min, max] = api.yLeftScale.value!.domain()
      expect(min).toBe(0)
      expect(max).toBeGreaterThanOrEqual(33)
    })

    it('明確傳入的 yLeftDomain 優先', () => {
      const { api } = setup({ yLeftDomain: [0, 100] })
      expect(api.yLeftScale.value!.domain()).toEqual([0, 100])
    })

    it('range 是反轉的（SVG 座標往下遞增）', () => {
      const { api } = setup()
      expect(api.yLeftScale.value!.range()).toEqual([200, 0])
    })

    it('沒有右側圖層時 yRightScale 為 null', () => {
      const { api } = setup()
      expect(api.yRightScale.value).toBeNull()
    })
  })

  describe('calculateMaxYValue', () => {
    it('一般圖層取 yValue 的最大值', () => {
      const { api } = setup()
      expect(api.calculateMaxYValue(api.leftLayers.value)).toBe(30)
    })

    it('堆疊圖加總 stackKeys', () => {
      const { api } = setup({
        layers: [
          {
            type: 'stacked-bar',
            yAxis: 'left',
            data: ROWS,
            xValue: (d) => d.category,
            stackKeys: ['a', 'b'],
          },
        ],
      })
      // Q1=7、Q2=10、Q3=3 → 最大 10
      expect(api.calculateMaxYValue(api.leftLayers.value)).toBe(10)
    })

    it('堆疊欄位缺值時當成 0，不會變成 NaN', () => {
      const { api } = setup({
        layers: [
          {
            type: 'stacked-bar',
            yAxis: 'left',
            data: [{ category: 'Q1', value: 0, a: 5, b: 0 } as Row, { category: 'Q2' } as Row],
            xValue: (d) => d.category,
            stackKeys: ['a', 'b'],
          },
        ],
      })
      expect(api.calculateMaxYValue(api.leftLayers.value)).toBe(5)
    })

    it('沒有 stackKeys 的堆疊圖回傳 0 而不是 NaN', () => {
      const { api } = setup({
        layers: [
          { type: 'stacked-bar', yAxis: 'left', data: ROWS, xValue: (d) => d.category },
        ],
      })
      expect(api.calculateMaxYValue(api.leftLayers.value)).toBe(0)
    })

    it('brushMode=x 時只計算選取範圍內的資料', () => {
      const { api, currentXDomain } = setup({ brushMode: 'x' })
      expect(api.calculateMaxYValue(api.leftLayers.value)).toBe(30)

      // 只留 Q1（10）與 Q3（20）→ 最大值變 20
      currentXDomain.value = ['Q1', 'Q3']
      expect(api.calculateMaxYValue(api.leftLayers.value)).toBe(20)
    })

    it('brushMode 不是 x 時不因選取範圍改變最大值', () => {
      const { api, currentXDomain } = setup({ brushMode: 'xy' })
      currentXDomain.value = ['Q1']
      expect(api.calculateMaxYValue(api.leftLayers.value)).toBe(30)
    })
  })

  describe('filterDataByXDomain', () => {
    it('沒有選取範圍時原樣回傳', () => {
      const { api } = setup()
      expect(api.filterDataByXDomain(ROWS, (d) => d.category)).toBe(ROWS)
    })

    it('沒有 xValue 取值函式時原樣回傳', () => {
      const { api, currentXDomain } = setup()
      currentXDomain.value = ['Q1']
      expect(api.filterDataByXDomain(ROWS, undefined)).toBe(ROWS)
    })

    it('band scale 依類別過濾', () => {
      const { api, currentXDomain } = setup()
      currentXDomain.value = ['Q1', 'Q3']

      const result = api.filterDataByXDomain(ROWS, (d) => d.category)
      expect(result.map((r) => r.category)).toEqual(['Q1', 'Q3'])
    })

    it('連續型依數值區間過濾（含邊界）', () => {
      const { api, currentXDomain } = setup({ xScaleType: 'linear' })
      currentXDomain.value = [10, 20]

      const result = api.filterDataByXDomain(ROWS, (d) => d.value)
      expect(result.map((r) => r.value)).toEqual([10, 20])
    })
  })

  describe('processedLayers', () => {
    it('沒有選取範圍時回傳原始圖層物件（不必要的複製會讓渲染誤判變更）', () => {
      const { api, props } = setup()
      expect(api.processedLeftLayers.value[0]).toBe(props.layers[0])
    })

    it('有選取範圍時回傳過濾後的新圖層並標記 _isFiltered', () => {
      const { api, currentXDomain } = setup()
      currentXDomain.value = ['Q2']

      const [layer] = api.processedLeftLayers.value
      expect(layer._isFiltered).toBe(true)
      expect(layer.data).toHaveLength(1)
      expect(layer.data![0].category).toBe('Q2')
    })

    it('過濾不會改動原始資料', () => {
      const { api, props, currentXDomain } = setup()
      currentXDomain.value = ['Q2']

      const _touch = api.processedLeftLayers.value // 觸發計算
      expect(props.layers[0].data).toHaveLength(3)
    })
  })

  describe('原始 domain（供 brush 重置）', () => {
    it('首次計算後記下完整範圍', () => {
      const { api } = setup()
      const _touch = api.xScale.value // 觸發計算
      expect(api.originalXDomain.value).toEqual(['Q1', 'Q2', 'Q3'])
    })

    it('brush 縮放後原始 domain 不變', () => {
      const { api, currentXDomain } = setup()
      const _first = api.xScale.value
      currentXDomain.value = ['Q1']
      const _second = api.xScale.value

      expect(api.originalXDomain.value).toEqual(['Q1', 'Q2', 'Q3'])
      expect(api.xScale.value?.domain()).toEqual(['Q1'])
    })
  })
})
