import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import * as XLSX from 'xlsx'
import ChptExcelUploader from '@/components/library/excel/ChptExcelUploader.vue'

/**
 * 上傳流程走 FileReader.readAsArrayBuffer，而 jsdom 的 FileReader 是非同步的，
 * 因此測試要等 onload 真的跑完。
 */

/** 用真的 xlsx 位元組組出一個 File，讓解析走的是產品路徑而非假資料 */
function makeXlsxFile(
  rows: Record<string, unknown>[],
  name = 'data.xlsx',
  sheetName = 'Sheet1'
): File {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new File([out], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** 內容不是有效 xlsx 的檔案 */
function makeBrokenFile(name = 'broken.xlsx'): File {
  return new File([new Uint8Array([1, 2, 3, 4, 5])], name)
}

/**
 * 把檔案塞進 input 並觸發 change。
 *
 * jsdom 的 input.files 是唯讀的，要用 DataTransfer 或 defineProperty；
 * 這裡用後者，並保留 value 可寫，因為元件會在成功後把它清空。
 */
async function uploadFile(
  wrapper: ReturnType<typeof mount>,
  file: File | null
): Promise<void> {
  const input = wrapper.find('input[type="file"]').element as HTMLInputElement
  Object.defineProperty(input, 'files', {
    value: file ? [file] : [],
    writable: true,
    configurable: true,
  })
  await wrapper.find('input[type="file"]').trigger('change')
  // 等 FileReader 的 onload / onerror
  await flushFileReader()
  await nextTick()
}

/** FileReader 在 jsdom 走 macrotask，多轉幾圈確保回呼跑完 */
async function flushFileReader(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

async function mountUploader(props: Record<string, unknown> = {}) {
  const wrapper = mount(ChptExcelUploader, { props, attachTo: document.body })
  await nextTick()
  return wrapper
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ChptExcelUploader', () => {
  describe('外觀', () => {
    it('預設文字與 accept 設定', async () => {
      const wrapper = await mountUploader()

      expect(wrapper.text()).toContain('匯入 Excel')
      expect(wrapper.find('input[type="file"]').attributes('accept')).toBe('.xlsx,.xls')
      wrapper.unmount()
    })

    it('label 可自訂', async () => {
      const wrapper = await mountUploader({ label: '選擇檔案' })
      expect(wrapper.text()).toContain('選擇檔案')
      wrapper.unmount()
    })

    it('inputId 同時套用在 label 的 for 與 input 的 id 上', async () => {
      const wrapper = await mountUploader({ inputId: 'my-upload' })

      expect(wrapper.find('input').attributes('id')).toBe('my-upload')
      expect(wrapper.find('label').attributes('for')).toBe('my-upload')
      wrapper.unmount()
    })

    it('size 與 variant 反映在 label 的 class 上', async () => {
      const wrapper = await mountUploader({ size: 'md', variant: 'solid-blue' })

      const classes = wrapper.find('label').classes().join(' ')
      // 高度取自 control token（md = 40px），與 ChptButton 同一套
      expect(classes).toContain('h-control-md')
      expect(classes).toContain('text-base') // size=md
      expect(classes).toContain('bg-blue-600') // variant=solid-blue
      wrapper.unmount()
    })

    it('customClass 會被加上', async () => {
      const wrapper = await mountUploader({ customClass: 'my-extra' })
      expect(wrapper.find('label').classes()).toContain('my-extra')
      wrapper.unmount()
    })

    it('未上傳時顯示上傳圖標，不是載入動畫', async () => {
      const wrapper = await mountUploader()
      expect(wrapper.find('.animate-spin').exists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('解析檔案', () => {
    it('解析第一個工作表並發出 data-loaded', async () => {
      const wrapper = await mountUploader()
      await uploadFile(wrapper, makeXlsxFile([{ 料號: 'P-1', 數量: 10 }]))

      const payload = wrapper.emitted('data-loaded')![0][0] as Record<string, unknown>[]
      expect(payload).toEqual([{ 料號: 'P-1', 數量: 10 }])
      wrapper.unmount()
    })

    it('多列資料全部解析出來', async () => {
      const wrapper = await mountUploader()
      await uploadFile(
        wrapper,
        makeXlsxFile([
          { a: 1, b: 2 },
          { a: 3, b: 4 },
          { a: 5, b: 6 },
        ])
      )

      const payload = wrapper.emitted('data-loaded')![0][0] as unknown[]
      expect(payload).toHaveLength(3)
      wrapper.unmount()
    })

    it('多個工作表時只取第一個', async () => {
      const ws1 = XLSX.utils.json_to_sheet([{ from: 'first' }])
      const ws2 = XLSX.utils.json_to_sheet([{ from: 'second' }])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, 'First')
      XLSX.utils.book_append_sheet(wb, ws2, 'Second')
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
      const file = new File([out], 'two.xlsx')

      const wrapper = await mountUploader()
      await uploadFile(wrapper, file)

      const payload = wrapper.emitted('data-loaded')![0][0] as Record<string, unknown>[]
      expect(payload).toEqual([{ from: 'first' }])
      wrapper.unmount()
    })

    it('空白工作表解析成空陣列（仍算成功）', async () => {
      const wrapper = await mountUploader()
      await uploadFile(wrapper, makeXlsxFile([]))

      expect(wrapper.emitted('data-loaded')![0][0]).toEqual([])
      expect(wrapper.emitted('upload-success')).toBeTruthy()
      wrapper.unmount()
    })
  })

  describe('事件順序與狀態', () => {
    it('成功時依序發出 upload-start → data-loaded → upload-success', async () => {
      const wrapper = await mountUploader()
      await uploadFile(wrapper, makeXlsxFile([{ a: 1 }]))

      expect(wrapper.emitted('upload-start')).toHaveLength(1)
      expect(wrapper.emitted('data-loaded')).toHaveLength(1)
      expect(wrapper.emitted('upload-success')).toHaveLength(1)
      expect(wrapper.emitted('error')).toBeFalsy()
      wrapper.unmount()
    })

    it('沒有選檔案時什麼都不做', async () => {
      const wrapper = await mountUploader()
      await uploadFile(wrapper, null)

      expect(wrapper.emitted('upload-start')).toBeFalsy()
      expect(wrapper.emitted('data-loaded')).toBeFalsy()
      wrapper.unmount()
    })

    it('完成後 input 被清空，同一個檔案可以再選一次', async () => {
      const wrapper = await mountUploader()
      const file = makeXlsxFile([{ a: 1 }])

      await uploadFile(wrapper, file)
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')

      await uploadFile(wrapper, file)
      expect(wrapper.emitted('data-loaded')).toHaveLength(2)
      wrapper.unmount()
    })

    it('結束後不再顯示載入狀態，input 也恢復可用', async () => {
      const wrapper = await mountUploader()
      await uploadFile(wrapper, makeXlsxFile([{ a: 1 }]))

      expect(wrapper.find('.animate-spin').exists()).toBe(false)
      expect(wrapper.find('input').attributes('disabled')).toBeUndefined()
      expect(wrapper.text()).toContain('匯入 Excel')
      wrapper.unmount()
    })
  })

  describe('非 Excel 內容', () => {
    /**
     * 改動前：XLSX.read 對任意位元組都很寬容 —— 不拋錯，而是回傳一份只有
     * 空白 Sheet1 的 workbook。於是 .txt 改名成 .xlsx 丟進來，使用端收到的是
     * upload-success 加一個空陣列，看起來像「這個 Excel 是空的」，
     * 而不是「這根本不是 Excel」。兩者該採取的行動完全不同。
     *
     * 改動後：解析前先檢查檔案簽章（xlsx 是 ZIP 的 PK\x03\x04；xls 是 OLE2），
     * 不符就走 error 路徑。
     */
    it('內容不是 Excel 時發出 error 而非 upload-success', async () => {
      const wrapper = await mountUploader()
      await uploadFile(wrapper, makeBrokenFile())

      expect(wrapper.emitted('data-loaded')).toBeFalsy()
      expect(wrapper.emitted('upload-success')).toBeFalsy()
      expect(wrapper.emitted('upload-error')).toBeTruthy()
      expect(wrapper.emitted('error')![0][0]).toContain('不是 Excel')
      wrapper.unmount()
    })

    it('把 .txt 改名成 .xlsx 也擋得住', async () => {
      const wrapper = await mountUploader()
      const renamed = new File([new TextEncoder().encode('a,b\n1,2')], 'fake.xlsx')
      await uploadFile(wrapper, renamed)

      expect(wrapper.emitted('upload-success')).toBeFalsy()
      expect(wrapper.emitted('error')![0][0]).toContain('不是 Excel')
      wrapper.unmount()
    })

    it('比簽章短的檔案不會誤判為合法', async () => {
      const wrapper = await mountUploader()
      // 只有 PK\x03 兩個字元，不足 4 bytes
      await uploadFile(wrapper, new File([new Uint8Array([0x50, 0x4b])], 'tiny.xlsx'))

      expect(wrapper.emitted('upload-success')).toBeFalsy()
      expect(wrapper.emitted('upload-error')).toBeTruthy()
      wrapper.unmount()
    })

    it('OLE2 簽章（舊版 .xls）不會被簽章檢查擋掉', async () => {
      const wrapper = await mountUploader()
      // 簽章合法但後面不是完整的 BIFF 內容：應該通過簽章檢查、
      // 由 XLSX.read 自己去判斷，而不是被我們的白名單擋在門外。
      const ole = new Uint8Array(512)
      ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
      await uploadFile(wrapper, new File([ole], 'legacy.xls'))

      expect(wrapper.emitted('error')?.[0]?.[0] ?? '').not.toContain('不是 Excel')
      wrapper.unmount()
    })

    it('解析不會讓元件卡在載入狀態', async () => {
      const wrapper = await mountUploader()
      await uploadFile(wrapper, makeBrokenFile())

      expect(wrapper.find('.animate-spin').exists()).toBe(false)
      expect(wrapper.text()).toContain('匯入 Excel')
      wrapper.unmount()
    })

    it('之後仍可正常上傳有效檔案', async () => {
      const wrapper = await mountUploader()
      await uploadFile(wrapper, makeBrokenFile())
      await uploadFile(wrapper, makeXlsxFile([{ a: 1 }]))

      expect(wrapper.emitted('data-loaded')).toHaveLength(1)
      expect(wrapper.emitted('data-loaded')![0][0]).toEqual([{ a: 1 }])
      wrapper.unmount()
    })
  })

  describe('鍵盤可達性', () => {
    /**
     * 整個元件的觸發點是 file input 的 <label>。原本 input 是 class="hidden"
     * （display: none），而 display: none 的元素不可聚焦 —— 鍵盤使用者
     * 根本無法選檔，違反 WCAG 2.1.1。
     */
    it('file input 不使用 display:none 隱藏', async () => {
      const wrapper = await mountUploader()
      const input = wrapper.find('input[type="file"]')

      expect(input.classes()).not.toContain('hidden')
      expect(input.classes()).toContain('sr-only')
      wrapper.unmount()
    })

    it('file input 可以取得焦點', async () => {
      const wrapper = await mountUploader()
      const input = wrapper.find('input[type="file"]').element as HTMLInputElement
      input.focus()

      expect(document.activeElement).toBe(input)
      wrapper.unmount()
    })

    it('label 排在 input 之後，peer-focus-visible 才有作用', async () => {
      const wrapper = await mountUploader()
      // Tailwind 的 peer-* 只對「peer 之後」的兄弟節點生效
      const children = Array.from(wrapper.element.children).map((el) =>
        el.tagName.toLowerCase()
      )

      expect(children.indexOf('input')).toBeLessThan(children.indexOf('label'))
      expect(wrapper.find('label').classes()).toContain('peer-focus-visible:ring-2')
      wrapper.unmount()
    })
  })

  describe('讀檔失敗', () => {
    it('FileReader 失敗時發出 error 與 upload-error，且不卡在載入狀態', async () => {
      const wrapper = await mountUploader()

      // 讓 readAsArrayBuffer 直接走 onerror
      const original = FileReader.prototype.readAsArrayBuffer
      FileReader.prototype.readAsArrayBuffer = function (this: FileReader) {
        setTimeout(() => this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>), 0)
      }

      try {
        await uploadFile(wrapper, makeXlsxFile([{ a: 1 }]))

        expect(wrapper.emitted('error')![0][0]).toBe('讀取檔案失敗')
        expect(wrapper.emitted('upload-error')).toBeTruthy()
        expect(wrapper.emitted('data-loaded')).toBeFalsy()
        expect(wrapper.find('.animate-spin').exists()).toBe(false)
      } finally {
        FileReader.prototype.readAsArrayBuffer = original
      }
      wrapper.unmount()
    })

    it('讀檔失敗時不顯示檔名', async () => {
      const wrapper = await mountUploader({ showFileName: true })
      const original = FileReader.prototype.readAsArrayBuffer
      FileReader.prototype.readAsArrayBuffer = function (this: FileReader) {
        setTimeout(() => this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>), 0)
      }

      try {
        await uploadFile(wrapper, makeXlsxFile([{ a: 1 }], 'bad.xlsx'))
        expect(wrapper.text()).not.toContain('bad.xlsx')
      } finally {
        FileReader.prototype.readAsArrayBuffer = original
      }
      wrapper.unmount()
    })
  })

  describe('檔案名稱顯示', () => {
    it('showFileName=true 時上傳完成後顯示檔名', async () => {
      const wrapper = await mountUploader({ showFileName: true })
      await uploadFile(wrapper, makeXlsxFile([{ a: 1 }], 'my-report.xlsx'))

      expect(wrapper.text()).toContain('my-report.xlsx')
      wrapper.unmount()
    })

    it('showFileName=false 時不顯示檔名', async () => {
      const wrapper = await mountUploader({ showFileName: false })
      await uploadFile(wrapper, makeXlsxFile([{ a: 1 }], 'my-report.xlsx'))

      expect(wrapper.text()).not.toContain('my-report.xlsx')
      wrapper.unmount()
    })

    it('換一個檔案後顯示的是新檔名', async () => {
      const wrapper = await mountUploader({ showFileName: true })
      await uploadFile(wrapper, makeXlsxFile([{ a: 1 }], 'first.xlsx'))
      expect(wrapper.text()).toContain('first.xlsx')

      await uploadFile(wrapper, makeXlsxFile([{ a: 2 }], 'second.xlsx'))

      expect(wrapper.text()).toContain('second.xlsx')
      expect(wrapper.text()).not.toContain('first.xlsx')
      wrapper.unmount()
    })
  })
})
