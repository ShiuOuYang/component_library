import { describe, expect, it } from 'vitest'
import { extendSeries } from '@/components/library/excel/autofill'

/**
 * 期望值都是「在 Excel 裡選取來源、拖曳填充控點」會得到的結果。
 */

describe('數字', () => {
  it('兩個數字延伸等差數列', () => {
    expect(extendSeries([1, 2], 3)).toEqual([3, 4, 5])
    expect(extendSeries(['10', '20'], 2)).toEqual([30, 40])
  })

  it('三個以上不等差時延伸線性趨勢（Excel 的最小平方法）', () => {
    // 1, 2, 4 的趨勢線斜率 1.5、截距 0.833…
    expect(extendSeries([1, 2, 4], 1)).toEqual([5.33333333333])
  })

  it('小數不會留下浮點誤差的尾巴', () => {
    expect(extendSeries([0.1, 0.2], 2)).toEqual([0.3, 0.4])
  })

  it('單一數字回傳 null（Excel 預設是複製，不是遞增）', () => {
    expect(extendSeries([5], 3)).toBeNull()
  })

  it('往上填：依「離來源由近到遠」遞減', () => {
    expect(extendSeries([3, 4], 2, -1)).toEqual([2, 1])
  })
})

describe('文字 + 尾數', () => {
  it('尾數遞增', () => {
    expect(extendSeries(['項目 1'], 3)).toEqual(['項目 2', '項目 3', '項目 4'])
  })

  it('多個來源時依步長', () => {
    expect(extendSeries(['Q1', 'Q3'], 2)).toEqual(['Q5', 'Q7'])
  })

  it('保留前導零', () => {
    expect(extendSeries(['單號 007'], 2)).toEqual(['單號 008', '單號 009'])
  })

  it('前綴不同就不是數列', () => {
    expect(extendSeries(['A1', 'B2'], 2)).toBeNull()
  })
})

describe('內建清單', () => {
  it('中文星期', () => {
    expect(extendSeries(['週一'], 3)).toEqual(['週二', '週三', '週四'])
    expect(extendSeries(['星期六'], 2)).toEqual(['星期日', '星期一'])
  })

  it('中文月份跨年循環', () => {
    expect(extendSeries(['十一月'], 3)).toEqual(['十二月', '一月', '二月'])
  })

  it('英文縮寫與全名', () => {
    expect(extendSeries(['Mon'], 2)).toEqual(['Tue', 'Wed'])
    expect(extendSeries(['December'], 1)).toEqual(['January'])
  })

  it('保留大小寫風格', () => {
    expect(extendSeries(['MON'], 1)).toEqual(['TUE'])
    expect(extendSeries(['jan'], 1)).toEqual(['feb'])
  })

  it('依來源的間隔跳著填', () => {
    expect(extendSeries(['週一', '週三'], 2)).toEqual(['週五', '週日'])
  })

  it('往上填沿清單倒退', () => {
    expect(extendSeries(['週一'], 2, -1)).toEqual(['週日', '週六'])
  })

  it('季度', () => {
    expect(extendSeries(['第三季'], 2)).toEqual(['第四季', '第一季'])
  })
})

describe('無法辨識 → 由呼叫端循環複製', () => {
  it('一般文字', () => {
    expect(extendSeries(['蘋果', '香蕉'], 2)).toBeNull()
  })

  it('數字與文字混合', () => {
    expect(extendSeries([1, '蘋果'], 2)).toBeNull()
  })

  it('公式（開頭是 =）不當成數列', () => {
    expect(extendSeries(['=A1+1'], 2)).toBeNull()
  })
})
