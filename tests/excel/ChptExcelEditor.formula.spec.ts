import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ChptExcelEditor from '@/components/library/excel/ChptExcelEditor.vue'

/**
 * 公式引擎已抽成 formula/ 之下的獨立模組並各自有測試，
 * 這裡只驗證「透過元件」的那條線還是通的 —— 也就是編輯儲存格、
 * 讀回顯示值這段接線。
 */

/** 讀出某一格顯示出來的文字 */
function cellText(wrapper: ReturnType<typeof mount>, r: number, c: number): string {
  const cell = wrapper.find(`[data-rc="${r},${c}"] .cell-display`)
  return cell.exists() ? cell.text() : ''
}

/** 在某一格輸入內容（雙擊進入編輯、填值、blur 提交） */
async function typeInCell(
  wrapper: ReturnType<typeof mount>,
  r: number,
  c: number,
  value: string
): Promise<void> {
  await wrapper.find(`[data-rc="${r},${c}"]`).trigger('dblclick')
  await nextTick()
  const input = wrapper.find('input.cell-editor')
  await input.setValue(value)
  await input.trigger('blur')
  await nextTick()
}

async function mountEditor(props: Record<string, unknown> = {}) {
  const wrapper = mount(ChptExcelEditor, {
    props: { rowCount: 5, colCount: 4, ...props },
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('ChptExcelEditor：公式接線', () => {
  it('純數值原樣顯示', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '42')

    expect(cellText(wrapper, 1, 1)).toBe('42')
    wrapper.unmount()
  })

  it('公式會算出結果，而不是顯示原式', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '10')
    await typeInCell(wrapper, 2, 1, '20')
    await typeInCell(wrapper, 3, 1, '=SUM(A1:A2)')

    expect(cellText(wrapper, 3, 1)).toBe('30')
    wrapper.unmount()
  })

  it('四則運算與參照', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '6')
    await typeInCell(wrapper, 1, 2, '7')
    await typeInCell(wrapper, 1, 3, '=A1*B1')

    expect(cellText(wrapper, 1, 3)).toBe('42')
    wrapper.unmount()
  })

  it('同一條式子裡的兩個函式都算得對', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '1')
    await typeInCell(wrapper, 2, 1, '2')
    await typeInCell(wrapper, 1, 2, '10')
    await typeInCell(wrapper, 2, 2, '20')
    await typeInCell(wrapper, 3, 1, '=SUM(A1:A2)+SUM(B1:B2)')

    expect(cellText(wrapper, 3, 1)).toBe('33')
    wrapper.unmount()
  })

  it('參照到公式格時會連鎖算出來', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '5')
    await typeInCell(wrapper, 2, 1, '=A1*2')
    await typeInCell(wrapper, 3, 1, '=A2+1')

    expect(cellText(wrapper, 3, 1)).toBe('11')
    wrapper.unmount()
  })

  it('迴圈參照不會讓元件卡死', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '=A2')
    await typeInCell(wrapper, 2, 1, '=A1')

    // 重點是渲染得出來、沒有爆堆疊
    expect(wrapper.find('[data-rc="1,1"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('算不出來的公式顯示原始字串', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '=NOSUCHFN(1)')

    expect(cellText(wrapper, 1, 1)).toBe('=NOSUCHFN(1)')
    wrapper.unmount()
  })

  /**
   * 舊實作用 new Function('"use strict";return (' + s + ');') 求值，
   * 也就是把儲存格內容當 JavaScript 跑。實測過那條路真的會執行副作用：
   * `__sideEffect = 99` 既會賦值、也會把 99 當成數字顯示出來。
   *
   * 這對「使用者在自己的表格裡打公式」還算可控，但這個元件庫另有
   * ChptExcelUploader —— 一份惡意的 .xlsx 只要被打開就會在瀏覽器裡
   * 執行任意程式碼。
   */
  it('公式內容不會被當成 JavaScript 執行（不會產生副作用）', async () => {
    const probe = vi.fn(() => 1)
    const g = globalThis as unknown as Record<string, unknown>
    g.__formulaProbe = probe
    g.__formulaFlag = 0

    try {
      const wrapper = await mountEditor()
      await typeInCell(wrapper, 1, 1, '=__formulaProbe()')
      await typeInCell(wrapper, 2, 1, '=__formulaFlag = 99')

      // 舊實作會呼叫 probe，並讓賦值真的生效（還會顯示 99）
      expect(probe).not.toHaveBeenCalled()
      expect(g.__formulaFlag).toBe(0)

      // 算不出來就顯示原式
      expect(cellText(wrapper, 1, 1)).toBe('=__formulaProbe()')
      expect(cellText(wrapper, 2, 1)).toBe('=__formulaFlag = 99')
      wrapper.unmount()
    } finally {
      delete g.__formulaProbe
      delete g.__formulaFlag
    }
  })

  it('enableFormula=false 時不解析公式，直接顯示原式', async () => {
    const wrapper = await mountEditor({ enableFormula: false })
    await typeInCell(wrapper, 1, 1, '10')
    await typeInCell(wrapper, 2, 1, '=A1*2')

    expect(cellText(wrapper, 2, 1)).toBe('=A1*2')
    wrapper.unmount()
  })

  it('改動被參照的格子時，公式格跟著更新', async () => {
    const wrapper = await mountEditor()
    await typeInCell(wrapper, 1, 1, '3')
    await typeInCell(wrapper, 2, 1, '=A1*10')
    expect(cellText(wrapper, 2, 1)).toBe('30')

    await typeInCell(wrapper, 1, 1, '4')
    expect(cellText(wrapper, 2, 1)).toBe('40')
    wrapper.unmount()
  })
})
