import { describe, expect, it } from 'vitest'
import * as library from '@/components/library'
import * as ui from '@/components/library/ui'
import * as charts from '@/components/library/charts'
import * as viewer from '@/components/library/viewer'
import * as excel from '@/components/library/excel'

/**
 * 正式入口（@/components/library）要涵蓋各子入口的元件
 *
 * ⚠️ 子入口加了元件、卻忘了在 library/index.ts 補一行時，什麼都不會壞：
 *    從子入口 import 照常可用，只有照文件寫 `import { X } from '@/components/library'`
 *    的使用端拿到 undefined（StatusScatterMap 就這樣漏了一陣子）。
 *
 * charts / viewer 全部都要有；ui / excel 的 legacy 別名刻意不放進正式入口，
 * 所以只檢查 canonical 的 Chpt*。
 */
const missingFrom = (entry, { chptOnly = false } = {}) =>
  Object.keys(entry)
    .filter((name) => !chptOnly || name.startsWith('Chpt'))
    .filter((name) => library[name] !== entry[name])

describe('正式入口涵蓋子入口的元件', () => {
  it('charts：全部', () => {
    expect(missingFrom(charts)).toEqual([])
  })

  it('viewer：全部', () => {
    expect(missingFrom(viewer)).toEqual([])
  })

  it('ui：canonical Chpt*', () => {
    expect(missingFrom(ui, { chptOnly: true })).toEqual([])
  })

  it('excel：canonical Chpt*', () => {
    expect(missingFrom(excel, { chptOnly: true })).toEqual([])
  })

  it('legacy 別名不在正式入口', () => {
    expect(library.CommonTable).toBeUndefined()
    expect(library.ExcelEditor).toBeUndefined()
  })
})
