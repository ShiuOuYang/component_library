import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ChptExcelEditor from '@/components/library/excel/ChptExcelEditor.vue'

/**
 * v-model（modelValue）的雙向同步契約：
 *   - 父層真的換了資料（API 重新查詢、清空）→ 編輯器跟著換，復原紀錄清空
 *   - 父層只是把編輯器剛送出的值傳回來（v-model 的正常往返，或複製一份同內容）→ 什麼都不動，
 *     否則公式會被換成計算結果、復原紀錄也會不見
 */

type Wrapper = ReturnType<typeof mount>
type Rows = Record<string, unknown>[]

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

const lastEmitted = (wrapper: Wrapper) => wrapper.emitted('update:modelValue')!.at(-1)![0] as Rows

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

describe('ChptExcelEditor v-model 同步', () => {
  it('初始 modelValue 會載入', async () => {
    const wrapper = await mountEditor({ modelValue: [{ A: '料號', B: 3 }] })
    expect(cellText(wrapper, 1, 1)).toBe('料號')
    expect(cellText(wrapper, 1, 2)).toBe('3')
    wrapper.unmount()
  })

  it('已有內容時，父層換了新資料 → 編輯器顯示新資料', async () => {
    const wrapper = await mountEditor({ modelValue: [{ A: '舊資料' }] })
    await wrapper.setProps({ modelValue: [{ A: '新資料', B: 42 }, { A: '第二列' }] })
    expect(cellText(wrapper, 1, 1)).toBe('新資料')
    expect(cellText(wrapper, 1, 2)).toBe('42')
    expect(cellText(wrapper, 2, 1)).toBe('第二列')
    wrapper.unmount()
  })

  it('父層傳入空陣列 → 清空', async () => {
    const wrapper = await mountEditor({ modelValue: [{ A: 'x', B: 'y' }] })
    await wrapper.setProps({ modelValue: [] })
    expect(cellText(wrapper, 1, 1)).toBe('')
    expect(cellText(wrapper, 1, 2)).toBe('')
    wrapper.unmount()
  })

  it('外部換資料後清空復原紀錄：Ctrl+Z 不會把舊內容翻回來', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '使用者輸入')
    await wrapper.setProps({ modelValue: [{ A: '伺服器資料' }] })

    ;(wrapper.vm as unknown as { undo: () => void }).undo()
    await nextTick()
    expect(cellText(wrapper, 1, 1)).toBe('伺服器資料')
    wrapper.unmount()
  })

  it('v-model 原樣傳回編輯器送出的值：不重載，公式與復原紀錄都還在', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '2')
    await typeInCell(wrapper, 1, 2, '=A1*10')
    expect(cellText(wrapper, 1, 2)).toBe('20')

    await wrapper.setProps({ modelValue: lastEmitted(wrapper) })
    // 公式還在：改 A1，B1 跟著重算（被換成計算結果的話會停在 20）
    await typeInCell(wrapper, 1, 1, '3')
    expect(cellText(wrapper, 1, 2)).toBe('30')

    // 復原紀錄也還在：退兩步回到只有 A1 = 2
    const { undo } = wrapper.vm as unknown as { undo: () => void }
    undo()
    undo()
    await nextTick()
    expect(cellText(wrapper, 1, 1)).toBe('2')
    expect(cellText(wrapper, 1, 2)).toBe('')
    wrapper.unmount()
  })

  it('父層複製一份同內容的資料傳回（例如 rows.map(r => ({ ...r }))）：一樣不重載', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '5')
    await typeInCell(wrapper, 2, 1, '=A1+1')

    await wrapper.setProps({ modelValue: lastEmitted(wrapper).map((r) => ({ ...r })) })
    await typeInCell(wrapper, 1, 1, '9')
    expect(cellText(wrapper, 2, 1)).toBe('10')
    wrapper.unmount()
  })

  /**
   * 回歸：toModelValue 原本跳過空白列，loadModelValue 卻依陣列位置放回 ——
   * 第 3 列的 ABC123 重新載入後跑到第 2 列。
   */
  it('空白列保留位置：modelValue[i] 一定是第 i+1 列，往返後位置不變', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '料號')
    await typeInCell(wrapper, 3, 1, 'ABC123')
    const rows = lastEmitted(wrapper)
    // 中間的空白列是 {}；最後一列有內容之後的空白列不輸出
    expect(rows).toEqual([{ A: '料號' }, {}, { A: 'ABC123' }])

    const reloaded = await mountEditor({ modelValue: rows })
    expect(cellText(reloaded, 1, 1)).toBe('料號')
    expect(cellText(reloaded, 2, 1)).toBe('')
    expect(cellText(reloaded, 3, 1)).toBe('ABC123')
    wrapper.unmount()
    reloaded.unmount()
  })

  it('開頭的空白列也保留', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 2, 2, 'x')
    expect(lastEmitted(wrapper)).toEqual([{}, { B: 'x' }])
    wrapper.unmount()
  })

  it('換資料時正在編輯的儲存格會結束編輯，不會把舊的輸入寫進新資料', async () => {
    const wrapper = await mountEditor({ modelValue: [{ A: 'a' }] })
    await wrapper.find('[data-rc="1,1"]').trigger('dblclick')
    await nextTick()
    await wrapper.find('input.cell-editor').setValue('打到一半')

    await wrapper.setProps({ modelValue: [{ A: '新資料' }] })
    expect(wrapper.find('input.cell-editor').exists()).toBe(false)
    expect(cellText(wrapper, 1, 1)).toBe('新資料')
    wrapper.unmount()
  })
})
