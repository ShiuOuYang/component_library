import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { readdirSync, rmSync } from 'node:fs'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import * as XLSX from 'xlsx-js-style'
import ChptExcelExporter from '@/components/library/excel/ChptExcelExporter.vue'

/**
 * 匯出流程會產生一個 Blob 並用 <a download> 觸發下載。
 * jsdom 沒有 URL.createObjectURL（元件的內層 try 會因此改走
 * XLSX.writeFile，那會真的往磁碟寫檔），所以測試要把這兩件事都接住 ——
 * 順便也讓我們能把產生出來的檔案讀回來驗證內容。
 */
let captured: Blob | null = null
let clickCount = 0
let lastDownloadName = ''

beforeEach(() => {
  // ChptModal 透過 Teleport 掛在 body 上，前一個測試的殘留會干擾查詢
  document.body.innerHTML = ''
  captured = null
  clickCount = 0
  lastDownloadName = ''

  const urlApi = URL as unknown as Record<string, unknown>
  urlApi.createObjectURL = vi.fn((blob: Blob) => {
    captured = blob
    return 'blob:mock'
  })
  urlApi.revokeObjectURL = vi.fn()

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    clickCount++
    lastDownloadName = this.download
  })
})

afterEach(() => {
  const urlApi = URL as unknown as Record<string, unknown>
  delete urlApi.createObjectURL
  delete urlApi.revokeObjectURL
  removeGeneratedFiles()
})

/**
 * 清掉測試留下的 .xlsx。
 *
 * 測「createObjectURL 不可用」那條後備路徑時，元件會呼叫 XLSX.writeFile，
 * 而它在 Node 環境是真的往工作目錄寫檔。ESM 命名空間是凍結的、沒辦法
 * spyOn 攔下來，所以改成事後清乾淨（.gitignore 另外也擋了一層）。
 */
function removeGeneratedFiles(): void {
  for (const name of readdirSync(process.cwd())) {
    if (/^(WIP_Report|MyReport)_\d{8}T\d{6}\.xlsx$/.test(name)) {
      rmSync(name, { force: true })
    }
  }
}

/** 把攔截到的 Blob 讀回成工作表資料 */
async function readExported(): Promise<{
  sheetNames: string[]
  rows: Record<string, unknown>[]
  sheet: XLSX.WorkSheet
}> {
  expect(captured, '沒有攔截到匯出的檔案').not.toBeNull()
  const buf = await captured!.arrayBuffer()
  // 帶 cellStyles 才讀得到欄寬（!cols）與儲存格樣式
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellStyles: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return {
    sheetNames: wb.SheetNames,
    rows: XLSX.utils.sheet_to_json(sheet),
    sheet,
  }
}

/**
 * ChptModal 是 <Teleport to="body">，對話框內容不在 wrapper 的 DOM 裡，
 * 因此要直接查 document.body。
 */
function modalText(): string {
  return document.body.textContent ?? ''
}

function modalButtons(): HTMLButtonElement[] {
  return Array.from(document.body.querySelectorAll('button'))
}

function modalButton(label: string): HTMLButtonElement {
  const found = modalButtons().find((b) => (b.textContent ?? '').includes(label))
  if (!found) throw new Error(`找不到按鈕：${label}（現有：${modalButtons().map((b) => b.textContent?.trim()).join(' | ')}）`)
  return found
}

/** 欄位勾選清單的標題文字 */
function columnTitles(): string[] {
  return Array.from(
    document.body.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
  ).map((box) => box.parentElement?.querySelector('span')?.textContent?.trim() ?? '')
}

function modalCheckbox(value: string): HTMLInputElement {
  const found = Array.from(
    document.body.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
  ).find((el) => el.value === value)
  if (!found) throw new Error(`找不到勾選框：${value}`)
  return found
}

/** 觸發原生事件（這些節點不在 wrapper 裡，用不了 VTU 的 trigger） */
async function fire(el: Element, type: string): Promise<void> {
  el.dispatchEvent(new Event(type, { bubbles: true }))
  await nextTick()
}

/** 勾選 / 取消勾選（v-model 依賴 change 事件） */
async function setChecked(el: HTMLInputElement, checked: boolean): Promise<void> {
  el.checked = checked
  el.dispatchEvent(new Event('change', { bubbles: true }))
  await nextTick()
}

const ROWS = [
  { part_number: 'P-1', unit_qty: 10, status: 'OK' },
  { part_number: 'P-2', unit_qty: 20, status: 'NG' },
]

async function mountExporter(props: Record<string, unknown> = {}) {
  const wrapper = mount(ChptExcelExporter, {
    props: { data: ROWS, ...props },
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

describe('ChptExcelExporter', () => {
  describe('按鈕狀態', () => {
    it('沒有資料時按鈕停用，並換掉 title', async () => {
      const wrapper = await mountExporter({ data: [] })
      const button = wrapper.find('button')

      expect(button.attributes('disabled')).toBeDefined()
      expect(button.attributes('title')).toBe('沒有資料可匯出')
      wrapper.unmount()
    })

    it('有資料時按鈕可用', async () => {
      const wrapper = await mountExporter()
      const button = wrapper.find('button')

      expect(button.attributes('disabled')).toBeUndefined()
      expect(button.attributes('title')).toBe('匯出 Excel 檔案')
      wrapper.unmount()
    })

    it('buttonLabel 與 size / variant 反映在按鈕上', async () => {
      const wrapper = await mountExporter({
        buttonLabel: '下載報表',
        size: 'lg',
        variant: 'blue',
        buttonClass: 'my-extra',
      })
      const button = wrapper.find('button')

      expect(button.text()).toContain('下載報表')
      expect(button.classes().join(' ')).toContain('text-base') // size=lg
      expect(button.classes().join(' ')).toContain('bg-blue-600') // variant=blue
      expect(button.classes()).toContain('my-extra')
      wrapper.unmount()
    })

    it('沒有資料時套用停用樣式，而不是 variant 樣式', async () => {
      const wrapper = await mountExporter({ data: [], variant: 'blue' })

      const classes = wrapper.find('button').classes().join(' ')
      expect(classes).toContain('bg-neutral-300')
      expect(classes).not.toContain('bg-blue-600')
      wrapper.unmount()
    })
  })

  describe('欄位推導', () => {
    it('沒給 columns 時從第一筆資料的鍵推導，並把底線轉成標題格式', async () => {
      const wrapper = await mountExporter({ showOptions: true })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const labels = columnTitles()
      expect(labels).toContain('Part Number')
      expect(labels).toContain('Unit Qty')
      expect(labels).toContain('Status')
      wrapper.unmount()
    })

    it('有給 columns 時採用它的順序與標題', async () => {
      const wrapper = await mountExporter({
        showOptions: true,
        columns: [
          { key: 'status', title: '狀態' },
          { key: 'part_number', title: '料號' },
        ],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(columnTitles()).toEqual(['狀態', '料號'])
      wrapper.unmount()
    })

    it('columns 裡沒有 key 的項目會被忽略', async () => {
      const wrapper = await mountExporter({
        showOptions: true,
        columns: [{ key: 'status', title: '狀態' }, { key: '', title: '空的' }],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(columnTitles()).toEqual(['狀態'])
      wrapper.unmount()
    })

    it('沒給 title 時以 key 當標題', async () => {
      const wrapper = await mountExporter({
        showOptions: true,
        columns: [{ key: 'status' }],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(columnTitles()).toEqual(['status'])
      wrapper.unmount()
    })
  })

  describe('匯出選項對話框', () => {
    it('showOptions=false 時直接匯出，不開對話框', async () => {
      const wrapper = await mountExporter({ showOptions: false })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(modalText()).not.toContain('Excel 匯出設定')
      expect(wrapper.emitted('export-complete')).toBeTruthy()
      wrapper.unmount()
    })

    it('showOptions=true 時先開對話框，不立刻匯出', async () => {
      const wrapper = await mountExporter({ showOptions: true })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(modalText()).toContain('Excel 匯出設定')
      expect(wrapper.emitted('export-complete')).toBeFalsy()
      wrapper.unmount()
    })

    it('預設全選所有欄位，計數顯示正確', async () => {
      const wrapper = await mountExporter({ showOptions: true })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(modalText()).toContain('已選 3 / 3')
      wrapper.unmount()
    })

    it('全選按鈕可以全取消再全選', async () => {
      const wrapper = await mountExporter({ showOptions: true })
      await wrapper.find('button').trigger('click')
      await nextTick()

      await fire(modalButton('取消全選'), 'click')
      expect(modalText()).toContain('已選 0 / 3')

      await fire(modalButton('全選'), 'click')
      expect(modalText()).toContain('已選 3 / 3')
      wrapper.unmount()
    })

    it('沒選任何欄位時「確認匯出」停用', async () => {
      const wrapper = await mountExporter({ showOptions: true })
      await wrapper.find('button').trigger('click')
      await nextTick()

      await fire(modalButton('取消全選'), 'click')
      expect(modalButton('確認匯出').disabled).toBe(true)
      wrapper.unmount()
    })

    it('確認匯出後關閉對話框並執行匯出', async () => {
      const wrapper = await mountExporter({ showOptions: true })
      await wrapper.find('button').trigger('click')
      await nextTick()

      await fire(modalButton('確認匯出'), 'click')

      expect(wrapper.emitted('export-complete')).toBeTruthy()
      wrapper.unmount()
    })

    it('取消按鈕只關對話框，不匯出', async () => {
      const wrapper = await mountExporter({ showOptions: true })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const cancel = modalButtons().find((b) => (b.textContent ?? '').trim() === '取消')!
      await fire(cancel, 'click')

      expect(wrapper.emitted('export-complete')).toBeFalsy()
      wrapper.unmount()
    })
  })

  describe('匯出內容', () => {
    it('產生的檔案含有所有資料列，標題使用欄位 title', async () => {
      const wrapper = await mountExporter({
        columns: [
          { key: 'part_number', title: '料號' },
          { key: 'unit_qty', title: '數量' },
        ],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const { rows } = await readExported()
      expect(rows).toEqual([
        { 料號: 'P-1', 數量: 10 },
        { 料號: 'P-2', 數量: 20 },
      ])
      wrapper.unmount()
    })

    it('只匯出被選取的欄位', async () => {
      const wrapper = await mountExporter({ showOptions: true })
      await wrapper.find('button').trigger('click')
      await nextTick()

      // 取消全選後只勾 status
      await fire(modalButton('取消全選'), 'click')
      await setChecked(modalCheckbox('status'), true)
      await fire(modalButton('確認匯出'), 'click')

      const { rows } = await readExported()
      expect(Object.keys(rows[0])).toEqual(['Status'])
      wrapper.unmount()
    })

    it('欄位順序依 columns 的順序，而非資料的鍵順序', async () => {
      const wrapper = await mountExporter({
        columns: [
          { key: 'status', title: 'S' },
          { key: 'part_number', title: 'P' },
        ],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const { sheet } = await readExported()
      // 標題列：A1 / B1
      expect(sheet.A1.v).toBe('S')
      expect(sheet.B1.v).toBe('P')
      wrapper.unmount()
    })

    it('工作表名稱與檔名沿用設定，檔名帶時間戳', async () => {
      const wrapper = await mountExporter({
        defaultFilename: 'MyReport',
        defaultSheetName: 'MySheet',
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const { sheetNames } = await readExported()
      expect(sheetNames).toEqual(['MySheet'])

      const payload = wrapper.emitted('export-complete')![0][0] as { filename: string }
      expect(payload.filename).toMatch(/^MyReport_\d{8}T\d{6}\.xlsx$/)
      // 下載只該觸發一次，且檔名與事件回報的一致
      expect(clickCount).toBe(1)
      expect(lastDownloadName).toBe(payload.filename)
      wrapper.unmount()
    })

    it('連按兩次會各自觸發一次下載', async () => {
      const wrapper = await mountExporter()

      await wrapper.find('button').trigger('click')
      await nextTick()
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(clickCount).toBe(2)
      expect(wrapper.emitted('export-complete')).toHaveLength(2)
      wrapper.unmount()
    })

    it('設定欄寬（已知欄位用對照表，其餘依標題長度）', async () => {
      const wrapper = await mountExporter({
        columns: [
          { key: 'part_number', title: 'P' },
          { key: 'unknown_col', title: 'A_Very_Long_Title' },
        ],
        data: [{ part_number: 'x', unknown_col: 'y' }],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const { sheet } = await readExported()
      const cols = sheet['!cols'] as { wch: number }[]
      expect(cols[0].wch).toBe(15) // part_number 在對照表裡
      expect(cols[1].wch).toBe('A_Very_Long_Title'.length + 2)
      wrapper.unmount()
    })

    it('欄寬不會低於 10', async () => {
      const wrapper = await mountExporter({
        columns: [{ key: 'zz', title: 'A' }],
        data: [{ zz: 1 }],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const { sheet } = await readExported()
      expect((sheet['!cols'] as { wch: number }[])[0].wch).toBe(10)
      wrapper.unmount()
    })

    /**
     * 原本寫成 `item[colKey] || ''`：0 與 false 都是 falsy，
     * 會被換成空字串。數量欄位（unit_qty / pnp_qty）填 0 是很正常的資料，
     * 匯出後卻變成空白格 —— 那是靜默的資料遺失。
     */
    it('數值 0 與 false 要照實匯出，不能變成空字串', async () => {
      const wrapper = await mountExporter({
        columns: [
          { key: 'unit_qty', title: '數量' },
          { key: 'flag', title: '旗標' },
        ],
        data: [{ unit_qty: 0, flag: false }],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const { sheet } = await readExported()
      expect(sheet.A2.v).toBe(0)
      expect(sheet.B2.v).toBe(false)
      wrapper.unmount()
    })

    it('null / undefined 匯出成空字串', async () => {
      const wrapper = await mountExporter({
        columns: [{ key: 'a', title: 'A' }, { key: 'b', title: 'B' }],
        data: [{ a: null, b: undefined }],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const { sheet } = await readExported()
      expect(sheet.A2.v).toBe('')
      expect(sheet.B2.v).toBe('')
      wrapper.unmount()
    })
  })

  describe('儲存格樣式', () => {
    it('cellStyles 套用到對應的儲存格', async () => {
      const style = { fill: { fgColor: { rgb: 'FFFF00' } } }
      const wrapper = await mountExporter({
        columns: [{ key: 'status', title: '狀態' }],
        data: [{ status: 'OK' }, { status: 'NG' }],
        // row 以資料列為基準（0 = 第一筆），元件會自己加上標題列的位移
        cellStyles: [{ row: 1, col: 'status', style }],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      const { sheet } = await readExported()
      // 第二筆資料 = A3
      expect(sheet.A3.s).toBeTruthy()
      expect(sheet.A2.s?.fill).toBeUndefined()
      wrapper.unmount()
    })

    it('指向不存在欄位的樣式會被忽略，不拋錯', async () => {
      const wrapper = await mountExporter({
        columns: [{ key: 'status', title: '狀態' }],
        cellStyles: [{ row: 0, col: 'no_such_col', style: { font: { bold: true } } }],
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.emitted('export-error')).toBeFalsy()
      expect(wrapper.emitted('export-complete')).toBeTruthy()
      wrapper.unmount()
    })
  })

  describe('事件', () => {
    it('匯出時依序發出 export-start 與 export-complete', async () => {
      const wrapper = await mountExporter()
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.emitted('export-start')).toHaveLength(1)
      const payload = wrapper.emitted('export-complete')![0][0] as {
        filename: string
        recordCount: number
      }
      expect(payload.recordCount).toBe(2)
      wrapper.unmount()
    })

    it('沒有資料時點擊不會發出任何事件', async () => {
      const wrapper = await mountExporter({ data: [] })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.emitted('export-start')).toBeFalsy()
      expect(wrapper.emitted('export-complete')).toBeFalsy()
      wrapper.unmount()
    })

    it('匯出過程出錯時發出 export-error，並且不會卡在匯出中', async () => {
      // 用「工作表名稱超過 31 字」讓 book_append_sheet 拋錯 ——
      // 只動公開 API，不去 mock XLSX（ESM 命名空間是凍結的，spyOn 會失敗）
      const wrapper = await mountExporter({
        defaultSheetName: 'S'.repeat(40),
      })
      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.emitted('export-error')).toBeTruthy()
      expect(wrapper.emitted('export-complete')).toBeFalsy()
      // 按鈕要恢復可用，不能永遠停在「匯出中...」
      expect(wrapper.find('button').text()).toContain('匯出 Excel')
      expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
      wrapper.unmount()
    })

    it('createObjectURL 不可用時走後備路徑，仍算匯出成功', async () => {
      const wrapper = await mountExporter()
      // jsdom 本來就沒有 createObjectURL，這裡還原成那個狀態
      const urlApi = URL as unknown as Record<string, unknown>
      delete urlApi.createObjectURL

      await wrapper.find('button').trigger('click')
      await nextTick()

      expect(wrapper.emitted('export-error')).toBeFalsy()
      expect(wrapper.emitted('export-complete')).toBeTruthy()
      wrapper.unmount()
    })
  })

  describe('對外方法', () => {
    it('exportExcel 可由父元件直接呼叫', async () => {
      const wrapper = await mountExporter()
      const vm = wrapper.vm as unknown as { exportExcel: () => Promise<void> }

      await vm.exportExcel()
      await nextTick()

      expect(wrapper.emitted('export-complete')).toBeTruthy()
      wrapper.unmount()
    })

    it('showExportOptions 可由父元件打開對話框', async () => {
      const wrapper = await mountExporter()
      const vm = wrapper.vm as unknown as { showExportOptions: () => void }

      vm.showExportOptions()
      await nextTick()

      expect(modalText()).toContain('Excel 匯出設定')
      wrapper.unmount()
    })
  })

  describe('資料變動', () => {
    it('資料換成不同欄位時，選取的欄位跟著更新', async () => {
      const wrapper = await mountExporter({ showOptions: true, data: [{ a: 1 }] })
      await wrapper.find('button').trigger('click')
      await nextTick()
      expect(modalText()).toContain('已選 1 / 1')

      await wrapper.setProps({ data: [{ a: 1, b: 2 }] })
      await nextTick()

      // 新欄位預設被納入
      expect(modalText()).toContain('已選 2 / 2')
      wrapper.unmount()
    })

    it('使用者取消勾選的欄位，在資料更新後仍保持未選', async () => {
      const wrapper = await mountExporter({ showOptions: true, data: [{ a: 1, b: 2 }] })
      await wrapper.find('button').trigger('click')
      await nextTick()

      await setChecked(modalCheckbox('a'), false)
      expect(modalText()).toContain('已選 1 / 2')

      await wrapper.setProps({ data: [{ a: 1, b: 2, c: 3 }] })
      await nextTick()

      // b 與新來的 c 被選，a 維持未選
      expect(modalText()).toContain('已選 2 / 3')
      wrapper.unmount()
    })
  })
})
