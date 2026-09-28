import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ChptExcelEditor from '@/components/library/excel/ChptExcelEditor.vue'

/**
 * 編輯器的資料完整性 —— 每一條都對應一個在真實瀏覽器（Chromium）重現過、
 * 會讓使用者遺失資料或得到錯誤結果的 bug。
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

/** 選取單一儲存格（模擬滑鼠按下再放開） */
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

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('跨工作表復原', () => {
  /**
   * ⚠️ 真實瀏覽器重現：在第二張表輸入、切回第一張表按一次 Ctrl+Z，
   *    第一張表被第二張表的「空白快照」整張覆蓋 —— 非空儲存格 2 → 0。
   */
  it('在第一張表復原，不會被第二張表的快照覆蓋', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'KEEP_ME')
    await typeInCell(wrapper, 1, 2, 'S1_EDIT')

    api(wrapper).addSheet()
    await nextTick()
    await typeInCell(wrapper, 3, 3, 'SHEET2_ONLY')

    api(wrapper).switchSheet(0)
    await nextTick()
    api(wrapper).undo()
    await nextTick()

    // 最近一次動作是在第二張表，所以復原的是第二張表，並且切過去
    expect(cellText(wrapper, 3, 3)).toBe('')
    api(wrapper).switchSheet(0)
    await nextTick()
    // 第一張表完好無缺
    expect(cellText(wrapper, 1, 1)).toBe('KEEP_ME')
    expect(cellText(wrapper, 1, 2)).toBe('S1_EDIT')
    wrapper.unmount()
  })

  it('復原後切到被復原的那張表（與 Excel 相同）', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'A')
    api(wrapper).addSheet()
    await nextTick()

    api(wrapper).undo() // 還原第一張表的輸入
    await nextTick()
    const tabs = wrapper.findAll('.sheet-tab')
    expect(tabs[0].classes()).toContain('active')
    wrapper.unmount()
  })

  it('重做存的是被復原那張表的狀態', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'ONE')
    api(wrapper).addSheet()
    await nextTick()
    await typeInCell(wrapper, 1, 1, 'TWO')

    api(wrapper).switchSheet(0)
    await nextTick()
    api(wrapper).undo() // 撤銷第二張的 TWO
    await nextTick()
    api(wrapper).redo()
    await nextTick()

    expect(cellText(wrapper, 1, 1)).toBe('TWO')
    api(wrapper).switchSheet(0)
    await nextTick()
    expect(cellText(wrapper, 1, 1)).toBe('ONE')
    wrapper.unmount()
  })

  it('刪除工作表後，其他表的復原紀錄仍寫回正確的表', async () => {
    const wrapper = await mountEditor()
    api(wrapper).addSheet() // 第二張
    await nextTick()
    api(wrapper).addSheet() // 第三張
    await nextTick()
    await typeInCell(wrapper, 1, 1, 'ON_THIRD')

    api(wrapper).removeSheet(1) // 刪掉中間那張，第三張變成索引 1
    await nextTick()
    api(wrapper).switchSheet(0)
    await nextTick()
    await typeInCell(wrapper, 2, 2, 'ON_FIRST')

    api(wrapper).undo() // 撤銷 ON_FIRST
    await nextTick()
    api(wrapper).undo() // 撤銷原本第三張的 ON_THIRD
    await nextTick()

    api(wrapper).switchSheet(0)
    await nextTick()
    expect(cellText(wrapper, 2, 2)).toBe('')
    api(wrapper).switchSheet(1)
    await nextTick()
    expect(cellText(wrapper, 1, 1)).toBe('')
    wrapper.unmount()
  })
})

describe('插入 / 刪除列欄', () => {
  /**
   * ⚠️ 真實瀏覽器重現：A3 的 =A1+A2 顯示 30，在第 1 列上方插入一列後
   *    公式搬到 A4 卻沒改參照，結果默默變成 10。
   */
  it('插入列後公式結果不變', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '10')
    await typeInCell(wrapper, 2, 1, '20')
    await typeInCell(wrapper, 3, 1, '=A1+A2')
    expect(cellText(wrapper, 3, 1)).toBe('30')

    await select(wrapper, 1, 1)
    await wrapper.find('button[title="上方插入列"]').trigger('mousedown')
    await nextTick()

    expect(cellText(wrapper, 4, 1)).toBe('30')
    wrapper.unmount()
  })

  it('刪除被參照的列，公式顯示 #REF!', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 2, 1, '5')
    await typeInCell(wrapper, 4, 1, '=A2*2')

    await select(wrapper, 2, 1)
    await wrapper.find('button[title="刪除列"]').trigger('mousedown')
    await nextTick()

    expect(cellText(wrapper, 3, 1)).toBe('#REF!')
    wrapper.unmount()
  })

  it('插入列可以復原', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'X')
    await select(wrapper, 1, 1)
    await wrapper.find('button[title="上方插入列"]').trigger('mousedown')
    await nextTick()
    expect(cellText(wrapper, 2, 1)).toBe('X')

    api(wrapper).undo()
    await nextTick()
    expect(cellText(wrapper, 1, 1)).toBe('X')
    wrapper.unmount()
  })
})

// ---------------------------------------------------------------------------
// 剪貼簿
// ---------------------------------------------------------------------------

/** jsdom 沒有 DataTransfer，用一個最小的替身模擬 clipboardData */
function fakeClipboard(initial = '') {
  const store: Record<string, string> = { 'text/plain': initial }
  return {
    getData: (t: string) => store[t] ?? '',
    setData: (t: string, v: string) => { store[t] = v },
    store,
  }
}

function fireClipboard(target: Element, type: 'copy' | 'cut' | 'paste', data: ReturnType<typeof fakeClipboard>) {
  const ev = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'clipboardData', { value: data })
  target.dispatchEvent(ev)
  return ev
}

function root(wrapper: Wrapper): Element {
  return wrapper.find('[data-rc="1,1"]').element.closest('[tabindex]')!
}

describe('剪貼簿', () => {
  /**
   * ⚠️ 真實 Chromium 實測：原本 Ctrl+V 的 keydown 被 preventDefault，
   *    瀏覽器觸發的 paste 事件 0 次 —— 從 Excel 複製過來按 Ctrl+V 完全沒反應。
   */
  it('Ctrl+C / X / V 的 keydown 不被攔截，瀏覽器才會觸發原生剪貼簿事件', async () => {
    const wrapper = await mountEditor()
    for (const key of ['c', 'x', 'v']) {
      const ev = new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true })
      root(wrapper).dispatchEvent(ev)
      expect(ev.defaultPrevented, `Ctrl+${key.toUpperCase()}`).toBe(false)
    }
    wrapper.unmount()
  })

  it('從 Excel（Windows）貼上：\\r 不會殘留在儲存格裡', async () => {
    const wrapper = await mountEditor()
    await select(wrapper, 1, 1)
    fireClipboard(root(wrapper), 'paste', fakeClipboard('A\tB\r\nC\tD\r\n'))
    await nextTick()

    // ⚠️ 不能用 cellText()：VTU 的 .text() 會 trim，\r 被吃掉就測不出來了
    //    （這個測試第一版就是這樣，在舊程式碼上照樣通過 —— 等於沒測）
    const raw = (r: number, c: number) =>
      wrapper.find(`[data-rc="${r},${c}"] .cell-display`).element.textContent
    expect(raw(1, 2)).toBe('B')
    expect(raw(2, 2)).toBe('D')
    wrapper.unmount()
  })

  /**
   * ⚠️ 真實瀏覽器重現：貼上 2 列，第 3 列使用者原本的資料被清掉。
   *    原因是結尾換行多切出一個空列，而空字串被當成「清空」。
   */
  it('貼上 N 列不會清掉第 N+1 列的既有資料', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 3, 1, 'IMPORTANT')
    await select(wrapper, 1, 1)
    fireClipboard(root(wrapper), 'paste', fakeClipboard('X1\r\nX2\r\n'))
    await nextTick()

    expect(cellText(wrapper, 1, 1)).toBe('X1')
    expect(cellText(wrapper, 2, 1)).toBe('X2')
    expect(cellText(wrapper, 3, 1)).toBe('IMPORTANT')
    wrapper.unmount()
  })

  it('複製後貼到別處，公式的相對參照跟著平移', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '3')
    await typeInCell(wrapper, 2, 1, '4')
    await typeInCell(wrapper, 1, 2, '=A1*2')
    expect(cellText(wrapper, 1, 2)).toBe('6')

    await select(wrapper, 1, 2)
    const data = fakeClipboard()
    fireClipboard(root(wrapper), 'copy', data)

    await select(wrapper, 2, 2)
    fireClipboard(root(wrapper), 'paste', data)
    await nextTick()

    // B2 應為 =A2*2 → 8；若沒平移會是 =A1*2 → 6
    expect(cellText(wrapper, 2, 2)).toBe('8')
    wrapper.unmount()
  })

  it('複製到系統剪貼簿的是畫面上的值（與 Excel 相同），格式為 CRLF 結尾的 TSV', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '2')
    await typeInCell(wrapper, 1, 2, '=A1*5')
    await wrapper.find('[data-rc="1,1"]').trigger('mousedown')
    await wrapper.find('[data-rc="1,2"]').trigger('mousedown', { shiftKey: true })
    document.dispatchEvent(new MouseEvent('mouseup'))
    await nextTick()

    const data = fakeClipboard()
    const ev = fireClipboard(root(wrapper), 'copy', data)
    expect(ev.defaultPrevented).toBe(true)
    expect(data.store['text/plain']).toBe('2\t10\r\n')
    wrapper.unmount()
  })

  it('貼進公式列時不會順便貼進網格', async () => {
    const wrapper = await mountEditor()
    await select(wrapper, 1, 1)
    const formulaInput = wrapper.find('input.formula-input').element
    const ev = fireClipboard(formulaInput, 'paste', fakeClipboard('HELLO'))
    await nextTick()

    expect(ev.defaultPrevented).toBe(false) // 交給瀏覽器貼進輸入框
    expect(cellText(wrapper, 1, 1)).toBe('')
    wrapper.unmount()
  })
})

describe('清除內容', () => {
  it('Delete 鍵清掉內容但保留格式（Excel 的「清除內容」）', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'Title')
    await select(wrapper, 1, 1)
    await wrapper.find('button[title="粗體 (Ctrl+B)"]').trigger('mousedown')
    await nextTick()

    root(wrapper).dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    await nextTick()
    expect(cellText(wrapper, 1, 1)).toBe('')

    await typeInCell(wrapper, 1, 1, 'New')
    // 字型樣式綁在儲存格 <td> 上
    const style = wrapper.find('[data-rc="1,1"]').attributes('style') ?? ''
    expect(style).toContain('font-weight: bold')
    wrapper.unmount()
  })
})

// ---------------------------------------------------------------------------
// 填充控點
// ---------------------------------------------------------------------------

/**
 * 從 (r1,c1)~(r2,c2) 的選取範圍拖曳填充控點到 (tr,tc)。
 * jsdom 沒有排版，elementFromPoint 永遠回 null —— 這裡直接指定「滑鼠底下」是哪一格。
 */
async function dragFill(wrapper: Wrapper, from: [number, number, number, number], to: [number, number]) {
  const [r1, c1, r2, c2] = from
  await wrapper.find(`[data-rc="${r1},${c1}"]`).trigger('mousedown')
  await wrapper.find(`[data-rc="${r2},${c2}"]`).trigger('mousedown', { shiftKey: true })
  document.dispatchEvent(new MouseEvent('mouseup'))
  await nextTick()

  const target = wrapper.find(`[data-rc="${to[0]},${to[1]}"]`).element
  const original = document.elementFromPoint
  document.elementFromPoint = () => target
  try {
    await wrapper.find('.fill-handle').trigger('mousedown')
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }))
    document.dispatchEvent(new MouseEvent('mouseup'))
    await nextTick()
  } finally {
    document.elementFromPoint = original
  }
}

describe('填充控點', () => {
  /** ⚠️ 原本 =A1*10 往下拉還是 =A1*10，每一格結果都一樣 */
  it('公式往下拉，相對參照跟著平移', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '1')
    await typeInCell(wrapper, 2, 1, '2')
    await typeInCell(wrapper, 3, 1, '3')
    await typeInCell(wrapper, 1, 2, '=A1*10')

    await dragFill(wrapper, [1, 2, 1, 2], [3, 2])

    expect(cellText(wrapper, 2, 2)).toBe('20')
    expect(cellText(wrapper, 3, 2)).toBe('30')
    wrapper.unmount()
  })

  it('絕對參照填充時不動', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '5')
    await typeInCell(wrapper, 1, 2, '=$A$1*2')
    await dragFill(wrapper, [1, 2, 1, 2], [3, 2])

    expect(cellText(wrapper, 2, 2)).toBe('10')
    expect(cellText(wrapper, 3, 2)).toBe('10')
    wrapper.unmount()
  })

  /** ⚠️ 原本 1、2 往下拉是 1、2、1、2 */
  it('兩個數字延伸成數列', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '1')
    await typeInCell(wrapper, 2, 1, '2')
    await dragFill(wrapper, [1, 1, 2, 1], [5, 1])

    expect([3, 4, 5].map((r) => cellText(wrapper, r, 1))).toEqual(['3', '4', '5'])
    wrapper.unmount()
  })

  it('星期延伸', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '週五')
    await dragFill(wrapper, [1, 1, 1, 1], [1, 4])

    expect([2, 3, 4].map((c) => cellText(wrapper, 1, c))).toEqual(['週六', '週日', '週一'])
    wrapper.unmount()
  })

  it('往上拉（原本只能往下 / 往右）', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 4, 1, '10')
    await typeInCell(wrapper, 5, 1, '20')
    await dragFill(wrapper, [4, 1, 5, 1], [2, 1])

    expect(cellText(wrapper, 3, 1)).toBe('0')
    expect(cellText(wrapper, 2, 1)).toBe('-10')
    wrapper.unmount()
  })

  it('單一數字是複製，不是遞增（Excel 預設）', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '7')
    await dragFill(wrapper, [1, 1, 1, 1], [3, 1])

    expect([2, 3].map((r) => cellText(wrapper, r, 1))).toEqual(['7', '7'])
    wrapper.unmount()
  })

  it('填充可以復原', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '1')
    await typeInCell(wrapper, 2, 1, '2')
    await dragFill(wrapper, [1, 1, 2, 1], [4, 1])
    expect(cellText(wrapper, 4, 1)).toBe('4')

    api(wrapper).undo()
    await nextTick()
    expect(cellText(wrapper, 3, 1)).toBe('')
    expect(cellText(wrapper, 4, 1)).toBe('')
    wrapper.unmount()
  })
})

// ---------------------------------------------------------------------------
// 顯示
// ---------------------------------------------------------------------------

describe('數字格式與對齊', () => {
  async function applyFormat(wrapper: Wrapper, r: number, c: number, fmt: string) {
    await select(wrapper, r, c)
    const sel = wrapper.findAll('select').find((s) => s.html().includes('0.00'))!
    await sel.setValue(fmt)
    await nextTick()
  }

  const align = (wrapper: Wrapper, r: number, c: number) =>
    wrapper.find(`[data-rc="${r},${c}"] .cell-display`).attributes('style') ?? ''

  /** ⚠️ 已證實：手打 42 套 0.00 仍顯示 42，只有公式結果吃格式 */
  it('手打的數字套用數字格式', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '42')
    await applyFormat(wrapper, 1, 1, '0.00')
    expect(cellText(wrapper, 1, 1)).toBe('42.00')
    wrapper.unmount()
  })

  it('數字預設靠右、文字預設靠左（Excel 通用格式）', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '42')
    await typeInCell(wrapper, 1, 2, '蘋果')
    await typeInCell(wrapper, 1, 3, '=A1*2')
    expect(align(wrapper, 1, 1)).toContain('right')
    expect(align(wrapper, 1, 2)).toContain('left')
    expect(align(wrapper, 1, 3)).toContain('right')
    wrapper.unmount()
  })

  it('明確指定的對齊優先於通用規則', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '42')
    await select(wrapper, 1, 1)
    await wrapper.find('button[title="置中"]').trigger('mousedown')
    await nextTick()
    expect(align(wrapper, 1, 1)).toContain('center')
    wrapper.unmount()
  })
})

describe('切換工作表', () => {
  /**
   * 用滑鼠點頁籤時輸入框會先 blur 而自動提交（真實瀏覽器確認過沒問題），
   * 但透過公開 API switchSheet() 切換沒有 blur —— 原本內容會直接消失。
   */
  it('透過 API 切換時，編輯中的內容先提交到原本那張表', async () => {
    const wrapper = await mountEditor()
    api(wrapper).addSheet()
    await nextTick()
    api(wrapper).switchSheet(0)
    await nextTick()

    await wrapper.find('[data-rc="3,3"]').trigger('dblclick')
    await nextTick()
    await wrapper.find('input.cell-editor').setValue('IN_PROGRESS')
    // 不 blur、不按 Enter，直接切換
    api(wrapper).switchSheet(1)
    await nextTick()
    expect(cellText(wrapper, 3, 3)).toBe('') // 第二張表是空的

    api(wrapper).switchSheet(0)
    await nextTick()
    expect(cellText(wrapper, 3, 3)).toBe('IN_PROGRESS')
    wrapper.unmount()
  })
})

// ---------------------------------------------------------------------------
// 合併儲存格
// ---------------------------------------------------------------------------

async function selectRange(wrapper: Wrapper, r1: number, c1: number, r2: number, c2: number) {
  await wrapper.find(`[data-rc="${r1},${c1}"]`).trigger('mousedown')
  await wrapper.find(`[data-rc="${r2},${c2}"]`).trigger('mousedown', { shiftKey: true })
  document.dispatchEvent(new MouseEvent('mouseup'))
  await nextTick()
}

async function clickMerge(wrapper: Wrapper) {
  await wrapper.find('button[title="合併儲存格"]').trigger('mousedown')
  await nextTick()
}

describe('合併儲存格', () => {
  /**
   * ⚠️ 真實瀏覽器重現：合併 A1:C1 後，D1 從 D 欄底下跑到 B 欄底下（x 651 → 491），
   *    D2 還在 D 欄 —— 主格沒有 colspan，被蓋住的格子只是 display:none。
   */
  it('主格用 colspan / rowspan 撐開，被蓋住的格子不算繪', async () => {
    const wrapper = await mountEditor()
    await selectRange(wrapper, 2, 2, 3, 4)
    await clickMerge(wrapper)

    const origin = wrapper.find('[data-rc="2,2"]')
    expect(origin.attributes('colspan')).toBe('3')
    expect(origin.attributes('rowspan')).toBe('2')
    expect(wrapper.find('[data-rc="2,3"]').exists()).toBe(false)
    expect(wrapper.find('[data-rc="3,4"]').exists()).toBe(false)
    // 每一列的「格子數 + colspan」加起來都等於欄數，右邊的格子才不會移位
    for (const tr of wrapper.findAll('tbody tr').slice(0, 4)) {
      const covered = tr.findAll('td').reduce((n, td) => n + Number(td.attributes('colspan') ?? 1), 0)
      const rowIdx = Number(tr.find('th').text())
      expect(covered + (rowIdx === 3 ? 3 : 0)).toBe(5)
    }
    wrapper.unmount()
  })

  /**
   * ⚠️ 原本其他格子的值原封不動留著：畫面上只看到左上角，
   *    但 SUM 照樣算進去、匯出也照樣寫出。
   */
  it('只保留左上角的值，其他格子的值不再參與計算', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '1')
    await typeInCell(wrapper, 1, 2, '2')
    await typeInCell(wrapper, 1, 3, '3')
    await typeInCell(wrapper, 2, 4, '=SUM(A1:C1)')
    expect(cellText(wrapper, 2, 4)).toBe('6')

    await selectRange(wrapper, 1, 1, 1, 3)
    await clickMerge(wrapper)
    expect(cellText(wrapper, 1, 1)).toBe('1')
    expect(cellText(wrapper, 2, 4)).toBe('1')
    wrapper.unmount()
  })

  it('左上角是空的，保留第一個有值的格子', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 2, 'B1')
    await typeInCell(wrapper, 2, 1, 'A2')
    await selectRange(wrapper, 1, 1, 2, 2)
    await clickMerge(wrapper)
    expect(cellText(wrapper, 1, 1)).toBe('B1')
    wrapper.unmount()
  })

  it('選取合併格再按一次是取消合併，值留在左上角', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'X')
    await selectRange(wrapper, 1, 1, 1, 3)
    await clickMerge(wrapper)
    await select(wrapper, 1, 1)
    await clickMerge(wrapper)

    expect(wrapper.find('[data-rc="1,1"]').attributes('colspan')).toBeUndefined()
    expect(wrapper.find('[data-rc="1,2"]').exists()).toBe(true)
    expect(cellText(wrapper, 1, 1)).toBe('X')
    wrapper.unmount()
  })

  it('新的合併範圍吸收範圍內原有的合併', async () => {
    const wrapper = await mountEditor()
    await selectRange(wrapper, 2, 2, 2, 3)
    await clickMerge(wrapper)
    // A1:D3 包住 B2:C2 → 合併成一個 A1:D3
    await selectRange(wrapper, 1, 1, 3, 4)
    await clickMerge(wrapper)

    const origin = wrapper.find('[data-rc="1,1"]')
    expect(origin.attributes('colspan')).toBe('4')
    expect(origin.attributes('rowspan')).toBe('3')
    expect(wrapper.find('[data-rc="2,2"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('選取範圍只蓋到合併格的一部分時，擴大到整個合併格', async () => {
    const wrapper = await mountEditor()
    await selectRange(wrapper, 2, 2, 3, 3)
    await clickMerge(wrapper)
    // A1:B2 只蓋到 B2:C3 的左上角 → 合併 A1:C3
    await selectRange(wrapper, 1, 1, 2, 2)
    await clickMerge(wrapper)

    const origin = wrapper.find('[data-rc="1,1"]')
    expect(origin.attributes('colspan')).toBe('3')
    expect(origin.attributes('rowspan')).toBe('3')
    wrapper.unmount()
  })

  it('單一格子按合併不做任何事', async () => {
    const wrapper = await mountEditor()
    await select(wrapper, 2, 2)
    await clickMerge(wrapper)
    expect(wrapper.find('[data-rc="2,2"]').attributes('colspan')).toBeUndefined()
    wrapper.unmount()
  })

  it('合併可以復原，被清掉的值回來', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'A')
    await typeInCell(wrapper, 1, 2, 'B')
    await selectRange(wrapper, 1, 1, 1, 2)
    await clickMerge(wrapper)
    api(wrapper).undo()
    await nextTick()
    expect(cellText(wrapper, 1, 2)).toBe('B')
    expect(wrapper.find('[data-rc="1,1"]').attributes('colspan')).toBeUndefined()
    wrapper.unmount()
  })
})

// ---------------------------------------------------------------------------
// 鍵盤操作
// ---------------------------------------------------------------------------

async function press(wrapper: Wrapper, key: string, mods: { shift?: boolean; ctrl?: boolean } = {}) {
  root(wrapper).dispatchEvent(
    new KeyboardEvent('keydown', { key, shiftKey: !!mods.shift, ctrlKey: !!mods.ctrl, bubbles: true, cancelable: true })
  )
  await nextTick()
}

async function pressInEditor(wrapper: Wrapper, key: string, mods: { shift?: boolean; ctrl?: boolean } = {}) {
  const input = wrapper.find('input.cell-editor')
  await input.trigger('keydown', { key, shiftKey: !!mods.shift, ctrlKey: !!mods.ctrl })
  await nextTick()
}

/** 作用中儲存格的 data-rc */
function active(wrapper: Wrapper): string {
  return wrapper.find('.cell-active').attributes('data-rc') ?? ''
}

/** 最後一次 selection-change 的範圍 */
function lastRange(wrapper: Wrapper): string {
  const events = wrapper.emitted('selection-change') as { range: string }[][] | undefined
  return events?.at(-1)?.[0].range ?? ''
}

function formulaBar(wrapper: Wrapper) {
  return wrapper.find('input.formula-input')
}

describe('鍵盤：選取範圍', () => {
  /**
   * ⚠️ 原本沒有 Shift+方向鍵；Shift+點擊與拖曳則把作用中儲存格移到終點
   *    （Excel 的作用中儲存格固定在起點，之後打字、Ctrl+D、合併都以它為準）。
   */
  it('Shift+方向鍵延伸選取範圍，作用中儲存格不動', async () => {
    const wrapper = await mountEditor()
    await select(wrapper, 2, 2)
    await press(wrapper, 'ArrowDown', { shift: true })
    await press(wrapper, 'ArrowRight', { shift: true })
    expect(lastRange(wrapper)).toBe('B2:C3')
    expect(active(wrapper)).toBe('2,2')
    await press(wrapper, 'ArrowUp', { shift: true })
    expect(lastRange(wrapper)).toBe('B2:C2')
    wrapper.unmount()
  })

  it('往反方向延伸時以作用中儲存格為錨點', async () => {
    const wrapper = await mountEditor()
    await select(wrapper, 3, 3)
    await press(wrapper, 'ArrowUp', { shift: true })
    await press(wrapper, 'ArrowLeft', { shift: true })
    expect(lastRange(wrapper)).toBe('B2:C3')
    expect(active(wrapper)).toBe('3,3')
    wrapper.unmount()
  })

  it('Shift+點擊：作用中儲存格留在起點', async () => {
    const wrapper = await mountEditor()
    await selectRange(wrapper, 1, 1, 3, 2)
    expect(active(wrapper)).toBe('1,1')
    expect(lastRange(wrapper)).toBe('A1:B3')
    wrapper.unmount()
  })

  it('填充控點在選取範圍的右下角', async () => {
    const wrapper = await mountEditor()
    await selectRange(wrapper, 1, 1, 3, 2)
    expect(wrapper.find('.fill-handle').element.closest('[data-rc]')?.getAttribute('data-rc')).toBe('3,2')
    wrapper.unmount()
  })

  it('Ctrl+A 全選', async () => {
    const wrapper = await mountEditor()
    await select(wrapper, 2, 2)
    await press(wrapper, 'a', { ctrl: true })
    expect(lastRange(wrapper)).toBe('A1:E8')
    wrapper.unmount()
  })

  it('Shift+空白鍵選取整列、Ctrl+空白鍵選取整欄', async () => {
    const wrapper = await mountEditor()
    await select(wrapper, 3, 2)
    await press(wrapper, ' ', { shift: true })
    expect(lastRange(wrapper)).toBe('A3:E3')
    await select(wrapper, 3, 2)
    await press(wrapper, ' ', { ctrl: true })
    expect(lastRange(wrapper)).toBe('B1:B8')
    expect(wrapper.find('input.cell-editor').exists()).toBe(false)
    wrapper.unmount()
  })

  it('Shift+方向鍵碰到合併格時一次跨過整個合併格', async () => {
    const wrapper = await mountEditor()
    await selectRange(wrapper, 2, 2, 3, 3)
    await clickMerge(wrapper)
    await select(wrapper, 2, 1)
    await press(wrapper, 'ArrowRight', { shift: true })
    expect(lastRange(wrapper)).toBe('A2:C3')
    wrapper.unmount()
  })
})

describe('鍵盤：移動', () => {
  async function column(wrapper: Wrapper) {
    // A1:A3 有資料、A4:A5 空、A6 有資料
    for (const r of [1, 2, 3, 6]) await typeInCell(wrapper, r, 1, 'x' + r)
  }

  it('Ctrl+方向鍵跳到資料區的邊緣', async () => {
    const wrapper = await mountEditor()
    await column(wrapper)
    await select(wrapper, 1, 1)
    await press(wrapper, 'ArrowDown', { ctrl: true })
    expect(active(wrapper)).toBe('3,1') // 連續資料的最後一格
    await press(wrapper, 'ArrowDown', { ctrl: true })
    expect(active(wrapper)).toBe('6,1') // 下一個有資料的格子
    await press(wrapper, 'ArrowDown', { ctrl: true })
    expect(active(wrapper)).toBe('8,1') // 沒有了 → 工作表邊界
    await press(wrapper, 'ArrowUp', { ctrl: true })
    expect(active(wrapper)).toBe('6,1')
    wrapper.unmount()
  })

  it('Ctrl+Shift+方向鍵延伸到資料區的邊緣', async () => {
    const wrapper = await mountEditor()
    await column(wrapper)
    await select(wrapper, 1, 1)
    await press(wrapper, 'ArrowDown', { ctrl: true, shift: true })
    expect(lastRange(wrapper)).toBe('A1:A3')
    expect(active(wrapper)).toBe('1,1')
    wrapper.unmount()
  })

  it('Home / Ctrl+Home / Ctrl+End', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 5, 4, 'last')
    await select(wrapper, 3, 3)
    await press(wrapper, 'Home')
    expect(active(wrapper)).toBe('3,1')
    await press(wrapper, 'End', { ctrl: true })
    expect(active(wrapper)).toBe('5,4')
    await press(wrapper, 'Home', { ctrl: true })
    expect(active(wrapper)).toBe('1,1')
    wrapper.unmount()
  })

  it('方向鍵跳過合併格', async () => {
    const wrapper = await mountEditor()
    await selectRange(wrapper, 1, 1, 2, 2)
    await clickMerge(wrapper)
    await select(wrapper, 1, 1)
    await press(wrapper, 'ArrowDown')
    expect(active(wrapper)).toBe('3,1')
    await press(wrapper, 'ArrowUp')
    expect(active(wrapper)).toBe('1,1')
    await press(wrapper, 'ArrowRight')
    expect(active(wrapper)).toBe('1,3')
    wrapper.unmount()
  })

  it('Shift+Enter 往上、Shift+Tab 往左', async () => {
    const wrapper = await mountEditor()
    await select(wrapper, 3, 3)
    await press(wrapper, 'Enter', { shift: true })
    expect(active(wrapper)).toBe('2,3')
    await press(wrapper, 'Tab', { shift: true })
    expect(active(wrapper)).toBe('2,2')
    wrapper.unmount()
  })

  it('多格選取時 Enter / Tab 在範圍內循環，選取範圍不變', async () => {
    const wrapper = await mountEditor()
    await selectRange(wrapper, 1, 1, 2, 2)
    await press(wrapper, 'Enter')
    expect(active(wrapper)).toBe('2,1')
    await press(wrapper, 'Enter')
    expect(active(wrapper)).toBe('1,2') // 到底換下一欄
    await press(wrapper, 'Tab')
    expect(active(wrapper)).toBe('2,1') // 到邊換下一列
    await press(wrapper, 'Tab')
    await press(wrapper, 'Tab')
    expect(active(wrapper)).toBe('1,1') // 回到開頭
    expect(wrapper.findAll('.cell-selected')).toHaveLength(3)
    wrapper.unmount()
  })

  it('Tab 之後 Enter 回到開始 Tab 的那一欄', async () => {
    const wrapper = await mountEditor()
    await select(wrapper, 1, 2)
    await wrapper.find('[data-rc="1,2"]').trigger('dblclick')
    await nextTick()
    await pressInEditor(wrapper, 'Tab')
    await wrapper.find('[data-rc="1,3"]').trigger('dblclick')
    await nextTick()
    await pressInEditor(wrapper, 'Tab')
    await press(wrapper, 'Enter')
    expect(active(wrapper)).toBe('2,2')
    wrapper.unmount()
  })
})

describe('鍵盤：編輯', () => {
  it('打字開始的「輸入模式」：方向鍵提交並移動', async () => {
    const wrapper = await mountEditor()
    await select(wrapper, 1, 1)
    await press(wrapper, '7')
    await wrapper.find('input.cell-editor').setValue('72')
    await pressInEditor(wrapper, 'ArrowRight')
    expect(wrapper.find('input.cell-editor').exists()).toBe(false)
    expect(cellText(wrapper, 1, 1)).toBe('72')
    expect(active(wrapper)).toBe('1,2')
    wrapper.unmount()
  })

  it('F2 的「編輯模式」：方向鍵留在輸入框裡移動游標', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'abc')
    await select(wrapper, 1, 1)
    await press(wrapper, 'F2')
    await pressInEditor(wrapper, 'ArrowLeft')
    expect(wrapper.find('input.cell-editor').exists()).toBe(true)
    wrapper.unmount()
  })

  it('F2 進入編輯時游標在最後，不是全選（原本一按鍵就蓋掉整格）', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'abc')
    await select(wrapper, 1, 1)
    await press(wrapper, 'F2')
    await nextTick()
    const input = wrapper.find('input.cell-editor').element as HTMLInputElement
    expect([input.selectionStart, input.selectionEnd]).toEqual([3, 3])
    wrapper.unmount()
  })

  it('F4 切換參照的 $：A1 → $A$1 → A$1 → $A1 → A1', async () => {
    const wrapper = await mountEditor()
    await wrapper.find('[data-rc="2,2"]').trigger('dblclick')
    await nextTick()
    const input = wrapper.find('input.cell-editor')
    await input.setValue('=SUM(A1)+B2')
    const el = input.element as HTMLInputElement
    const seen: string[] = []
    for (let i = 0; i < 4; i++) {
      el.setSelectionRange(6, 6) // 游標在 A1 裡
      await pressInEditor(wrapper, 'F4')
      seen.push(el.value)
    }
    expect(seen).toEqual(['=SUM($A$1)+B2', '=SUM(A$1)+B2', '=SUM($A1)+B2', '=SUM(A1)+B2'])
    wrapper.unmount()
  })

  it('Ctrl+Enter 把內容寫進選取範圍的每一格，公式逐格平移', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '1')
    await typeInCell(wrapper, 2, 1, '2')
    await selectRange(wrapper, 1, 2, 2, 2)
    await press(wrapper, '=')
    await wrapper.find('input.cell-editor').setValue('=A1*10')
    await pressInEditor(wrapper, 'Enter', { ctrl: true })
    expect(cellText(wrapper, 1, 2)).toBe('10')
    expect(cellText(wrapper, 2, 2)).toBe('20')
    wrapper.unmount()
  })

  it('Backspace 只清作用中那一格並進入編輯；Delete 清整個選取範圍', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'a')
    await typeInCell(wrapper, 2, 1, 'b')
    await selectRange(wrapper, 1, 1, 2, 1)
    await press(wrapper, 'Backspace')
    const input = wrapper.find('input.cell-editor')
    expect((input.element as HTMLInputElement).value).toBe('')
    await pressInEditor(wrapper, 'Escape')
    expect(cellText(wrapper, 2, 1)).toBe('b')

    await press(wrapper, 'Delete')
    expect(cellText(wrapper, 1, 1)).toBe('')
    expect(cellText(wrapper, 2, 1)).toBe('')
    wrapper.unmount()
  })

  it('Ctrl+D 向下填滿：複製第一列，公式相對參照平移', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '5')
    await typeInCell(wrapper, 2, 1, '6')
    await typeInCell(wrapper, 3, 1, '7')
    await typeInCell(wrapper, 1, 2, '=A1*2')
    await selectRange(wrapper, 1, 2, 3, 2)
    await press(wrapper, 'd', { ctrl: true })
    expect(cellText(wrapper, 2, 2)).toBe('12')
    expect(cellText(wrapper, 3, 2)).toBe('14')
    wrapper.unmount()
  })

  it('Ctrl+D 只選一格時從上一格複製；Ctrl+R 從左邊複製', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, 'top')
    await select(wrapper, 2, 1)
    await press(wrapper, 'd', { ctrl: true })
    expect(cellText(wrapper, 2, 1)).toBe('top')
    await select(wrapper, 1, 2)
    await press(wrapper, 'r', { ctrl: true })
    expect(cellText(wrapper, 1, 2)).toBe('top')
    wrapper.unmount()
  })

  it('多格選取時公式列仍可編輯作用中儲存格（原本整個停用）', async () => {
    const wrapper = await mountEditor()
    await selectRange(wrapper, 1, 1, 2, 2)
    const bar = formulaBar(wrapper)
    expect(bar.attributes('disabled')).toBeUndefined()
    await bar.setValue('hello')
    await bar.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(cellText(wrapper, 1, 1)).toBe('hello')
    wrapper.unmount()
  })
})

// ---------------------------------------------------------------------------
// 排序
// ---------------------------------------------------------------------------

async function sortBy(wrapper: Wrapper, direction: 'asc' | 'desc') {
  const title = direction === 'asc' ? '依選取範圍升冪排序' : '依選取範圍降冪排序'
  await wrapper.find(`button[title="${title}"]`).trigger('mousedown')
  await nextTick()
}

function columnText(wrapper: Wrapper, c: number, rows: number): string[] {
  return Array.from({ length: rows }, (_, i) => cellText(wrapper, i + 1, c))
}

describe('排序', () => {
  /** ⚠️ 原本用 Number(a) - Number(b)：空白格被當成 0，排在正數與負數之間 */
  it('空白不論升降冪都排在最後', async () => {
    const wrapper = await mountEditor()
    for (const [r, v] of [[1, '3'], [3, '-1'], [4, '2']] as const) await typeInCell(wrapper, r, 1, v)
    await selectRange(wrapper, 1, 1, 4, 1)
    await sortBy(wrapper, 'asc')
    expect(columnText(wrapper, 1, 4)).toEqual(['-1', '2', '3', ''])
    await sortBy(wrapper, 'desc')
    expect(columnText(wrapper, 1, 4)).toEqual(['3', '2', '-1', ''])
    wrapper.unmount()
  })

  it('數字排在文字前面，文字不分大小寫', async () => {
    const wrapper = await mountEditor()
    for (const [r, v] of [[1, 'banana'], [2, '10'], [3, 'Apple'], [4, '9']] as const) await typeInCell(wrapper, r, 1, v)
    await selectRange(wrapper, 1, 1, 4, 1)
    await sortBy(wrapper, 'asc')
    expect(columnText(wrapper, 1, 4)).toEqual(['9', '10', 'Apple', 'banana'])
    wrapper.unmount()
  })

  it('依作用中儲存格所在的欄排序，整列一起移動', async () => {
    const wrapper = await mountEditor()
    for (const [r, a, b] of [[1, 'x', '3'], [2, 'y', '1'], [3, 'z', '2']] as const) {
      await typeInCell(wrapper, r, 1, a)
      await typeInCell(wrapper, r, 2, b)
    }
    // 從 B1 拖到 A3：作用中儲存格在 B 欄
    await selectRange(wrapper, 1, 2, 3, 1)
    await sortBy(wrapper, 'asc')
    expect(columnText(wrapper, 2, 3)).toEqual(['1', '2', '3'])
    expect(columnText(wrapper, 1, 3)).toEqual(['y', 'z', 'x'])
    wrapper.unmount()
  })

  /** ⚠️ 原本公式原封不動搬到別列：=A1*10 搬到第 3 列還是參照 A1，結果錯位 */
  it('公式跟著整列移動，相對參照指向同一列', async () => {
    const wrapper = await mountEditor()
    for (const [r, v] of [[1, '3'], [2, '1'], [3, '2']] as const) {
      await typeInCell(wrapper, r, 1, v)
      await typeInCell(wrapper, r, 2, `=A${r}*10`)
    }
    await selectRange(wrapper, 1, 1, 3, 2)
    await sortBy(wrapper, 'asc')
    expect(columnText(wrapper, 1, 3)).toEqual(['1', '2', '3'])
    expect(columnText(wrapper, 2, 3)).toEqual(['10', '20', '30'])
    wrapper.unmount()
  })

  it('範圍內有合併格時不排序（Excel 會拒絕）', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '2')
    await typeInCell(wrapper, 3, 1, '1')
    await selectRange(wrapper, 1, 2, 2, 3)
    await clickMerge(wrapper)
    await selectRange(wrapper, 1, 1, 3, 3)
    await sortBy(wrapper, 'asc')
    expect(columnText(wrapper, 1, 3)).toEqual(['2', '', '1'])
    wrapper.unmount()
  })
})
