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
 * 舊的非 Chpt 元件移除之後，四個子入口匯出的東西正式入口都要有。
 */
const missingFrom = (entry) => Object.keys(entry).filter((name) => library[name] !== entry[name])

describe('正式入口涵蓋子入口的元件', () => {
  it('charts：全部', () => {
    expect(missingFrom(charts)).toEqual([])
  })

  it('viewer：全部', () => {
    expect(missingFrom(viewer)).toEqual([])
  })

  it('ui：全部', () => {
    expect(missingFrom(ui)).toEqual([])
  })

  it('excel：全部', () => {
    expect(missingFrom(excel)).toEqual([])
  })

  it('舊的非 Chpt 元件已移除（正式入口與子入口都沒有）', () => {
    const removed = [
      'CodeBlock', 'CommonTable', 'CommonTooltip', 'DraggableModal', 'FilterBar', 'FilterDropdown', 'FilterSelect',
      'TagFilterDropdown', 'Pagination', 'PaginationControls', 'SimpleDarkModeToggle', 'ModalDock', 'PageSwitcher',
      'TabNavigation', 'HeaderLogoutButton', 'FixedTable', 'ExcelEditor', 'ExcelExporter', 'ExcelUploader',
    ]
    for (const entry of [library, ui, excel]) {
      expect(removed.filter((name) => name in entry)).toEqual([])
    }
  })
})
