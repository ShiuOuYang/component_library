import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ChptExcelEditor from '@/components/library/excel/ChptExcelEditor.vue'

/**
 * 編輯器層級的跨工作表行為（第七批）：插入 / 刪除列欄、改名、刪表時，別張表的公式要跟著改，
 * 復原也要一起還原。另外涵蓋日期函式在格子裡的顯示。
 */

type Wrapper = ReturnType<typeof mount>

function cellText(wrapper: Wrapper, r: number, c: number): string {
  const cell = wrapper.find(`[data-rc="${r},${c}"] .cell-display`)
  return cell.exists() ? cell.text() : ''
}

async function typeInCell(wrapper: Wrapper, r: number, c: number, value: string) {
  await wrapper.find(`[data-rc="${r},${c}"]`).trigger('dblclick')
  await nextTick()
  const input = wrapper.find('input.cell-editor')
  await input.setValue(value)
  await input.trigger('blur')
  await nextTick()
}

async function select(wrapper: Wrapper, r: number, c: number) {
  await wrapper.find(`[data-rc="${r},${c}"]`).trigger('mousedown')
  document.dispatchEvent(new MouseEvent('mouseup'))
  await nextTick()
}

function api(wrapper: Wrapper) {
  return wrapper.vm as unknown as {
    undo: () => void
    redo: () => void
    addSheet: () => void
    switchSheet: (i: number) => void
    removeSheet: (i: number) => void
  }
}

async function mountEditor(props: Record<string, unknown> = {}) {
  const wrapper = mount(ChptExcelEditor, {
    props: { rowCount: 8, colCount: 5, ...props },
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

const tabNames = (w: Wrapper) => w.findAll('.sheet-tab span').map((s) => s.text())

async function renameTab(w: Wrapper, idx: number, name: string) {
  await w.findAll('.sheet-tab')[idx].trigger('dblclick')
  await nextTick()
  const input = w.find('input.sheet-rename-input')
  await input.setValue(name)
  await input.trigger('keydown', { key: 'Enter' })
  await nextTick()
}

/** Sheet1 的 A1、A2 = 10、20；Sheet2 的 A1 = =SUM(Sheet1!A1:A2)、B1 = =Sheet1!A2 */
async function twoSheets() {
  const w = await mountEditor()
  await typeInCell(w, 1, 1, '10')
  await typeInCell(w, 2, 1, '20')
  api(w).addSheet()
  await nextTick()
  await typeInCell(w, 1, 1, '=SUM(Sheet1!A1:A2)')
  await typeInCell(w, 1, 2, '=Sheet1!A2')
  return w
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.useRealTimers()
})

describe('工作表命名', () => {
  /** 回歸：原本在 Sheet1 後面直接接數字，第二張叫「Sheet12」 */
  it('新增的工作表依序叫 Sheet2、Sheet3', async () => {
    const w = await mountEditor()
    api(w).addSheet()
    api(w).addSheet()
    await nextTick()
    expect(tabNames(w)).toEqual(['Sheet1', 'Sheet2', 'Sheet3'])
    w.unmount()
  })

  it('改名的重名檢查不分大小寫（公式找工作表不分大小寫）', async () => {
    const w = await mountEditor()
    api(w).addSheet()
    await nextTick()
    await renameTab(w, 1, 'sheet1')
    expect(tabNames(w)).toEqual(['Sheet1', 'sheet1_2'])
    w.unmount()
  })
})

describe('插入 / 刪除列：別張表的參照跟著動', () => {
  /** 回歸：原本 Sheet2 的公式留在原地，插入一列後 SUM 少算、B1 指到錯的格子 */
  it('在 Sheet1 上方插入列，Sheet2 的 SUM 與單格參照都跟著往下', async () => {
    const w = await twoSheets()
    expect(cellText(w, 1, 1)).toBe('30')
    expect(cellText(w, 1, 2)).toBe('20')

    api(w).switchSheet(0)
    await nextTick()
    await select(w, 1, 1)
    await w.find('button[title="上方插入列"]').trigger('mousedown')
    await nextTick()
    await typeInCell(w, 1, 1, '999') // 新插入的空列放個值：Sheet2 不該把它算進去

    api(w).switchSheet(1)
    await nextTick()
    expect(cellText(w, 1, 1)).toBe('30')
    expect(cellText(w, 1, 2)).toBe('20')
    w.unmount()
  })

  it('刪掉 Sheet1 被參照的列：Sheet2 顯示 #REF!', async () => {
    const w = await twoSheets()
    api(w).switchSheet(0)
    await nextTick()
    await select(w, 2, 1)
    await w.find('button[title="刪除列"]').trigger('mousedown')
    await nextTick()

    api(w).switchSheet(1)
    await nextTick()
    expect(cellText(w, 1, 1)).toBe('10') // SUM(Sheet1!A1:A1)
    expect(cellText(w, 1, 2)).toBe('#REF!')
    w.unmount()
  })

  /** 復原要把 Sheet2 被改寫的公式一起還原，否則 Sheet2 停在「已位移」的狀態 */
  it('復原插入列：兩張表一起還原；重做再一起套用', async () => {
    const w = await twoSheets()
    api(w).switchSheet(0)
    await nextTick()
    await select(w, 1, 1)
    await w.find('button[title="上方插入列"]').trigger('mousedown')
    await nextTick()

    api(w).undo()
    await nextTick()
    expect(cellText(w, 1, 1)).toBe('10') // Sheet1 回到原狀
    api(w).switchSheet(1)
    await nextTick()
    expect(cellText(w, 1, 2)).toBe('20') // 仍然指向 Sheet1!A2（= 20）

    api(w).redo()
    await nextTick()
    api(w).switchSheet(1)
    await nextTick()
    expect(cellText(w, 1, 2)).toBe('20') // 指向往下搬的 Sheet1!A3（= 20）
    w.unmount()
  })
})

describe('改名 / 刪除工作表', () => {
  /** 回歸：改名後原本所有 =Sheet1!… 都找不到工作表 */
  it('改名後別張表的公式跟著改名，結果不變', async () => {
    const w = await twoSheets()
    await renameTab(w, 0, '產量 Q1')
    expect(tabNames(w)[0]).toBe('產量 Q1')
    expect(cellText(w, 1, 1)).toBe('30')
    // 公式本身也改成新名稱（帶引號）
    await w.find('[data-rc="1,1"]').trigger('mousedown')
    document.dispatchEvent(new MouseEvent('mouseup'))
    await nextTick()
    expect((w.find('input.formula-input').element as HTMLInputElement).value).toBe("=SUM('產量 Q1'!A1:A2)")
    w.unmount()
  })

  it('刪除被參照的工作表：參照變成 #REF!', async () => {
    const w = await twoSheets()
    api(w).removeSheet(0)
    await nextTick()
    expect(tabNames(w)).toEqual(['Sheet2'])
    expect(cellText(w, 1, 1)).toBe('#REF!')
    w.unmount()
  })
})

describe('日期', () => {
  it('=TODAY() 自動顯示成日期；=DATE 也是', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 28, 9, 0, 0))
    const w = await mountEditor()
    await typeInCell(w, 1, 1, '=TODAY()')
    await typeInCell(w, 2, 1, '=DATE(2026,12,25)-A1')
    await typeInCell(w, 3, 1, '=EDATE(A1,1)')
    expect(cellText(w, 1, 1)).toBe('2026-09-28')
    expect(cellText(w, 2, 1)).toBe('88') // 相差天數是數字，不是日期
    expect(cellText(w, 3, 1)).toBe('2026-10-28')
    w.unmount()
  })

  it('手打日期可以直接相減', async () => {
    const w = await mountEditor()
    await typeInCell(w, 1, 1, '2026-09-01')
    await typeInCell(w, 2, 1, '2026-09-28')
    await typeInCell(w, 3, 1, '=A2-A1')
    expect(cellText(w, 3, 1)).toBe('27')
    w.unmount()
  })
})
