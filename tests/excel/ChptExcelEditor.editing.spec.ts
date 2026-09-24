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
