import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptUpload, { type UploadFile, type UploadRequest } from '@/components/library/ui/ChptUpload.vue'

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function file(name: string, size = 10, type = ''): File {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

/** 掛載並模擬 v-model */
function mountUpload(props: Record<string, unknown> = {}) {
  const w = mount(ChptUpload, {
    props: {
      modelValue: [] as UploadFile[],
      ...props,
      'onUpdate:modelValue': (v: UploadFile[]) => w.setProps({ modelValue: v }),
    },
    attachTo: document.body,
  })
  wrapper = w
  return w
}

async function pick(w: ReturnType<typeof mount>, files: File[]) {
  const input = w.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
  await nextTick()
}

const model = (w: ReturnType<typeof mount>) => w.props('modelValue') as UploadFile[]

describe('ChptUpload', () => {
  it('file input 用 sr-only 保留在 Tab 順序裡，拖放區是它的 label', () => {
    const w = mountUpload()
    const input = w.find('input[type="file"]')
    expect(input.classes()).toContain('sr-only')
    expect(input.classes()).not.toContain('hidden')
    expect(w.find('label').attributes('for')).toBe(input.attributes('id'))
  })

  it('選檔加入清單（沒有 request 時狀態是 ready）', async () => {
    const w = mountUpload({ multiple: true })
    await pick(w, [file('a.xlsx'), file('b.csv')])
    expect(model(w).map((f) => [f.name, f.status])).toEqual([['a.xlsx', 'ready'], ['b.csv', 'ready']])
    expect(w.findAll('li').map((l) => l.text())).toEqual([expect.stringContaining('a.xlsx'), expect.stringContaining('b.csv')])
  })

  /** accept 只是對話框的建議：選「所有檔案」或拖放都能繞過，要自己擋 */
  it('擋下格式、大小不符的檔案並說明原因', async () => {
    const w = mountUpload({ multiple: true, accept: '.xlsx,image/*', maxSize: 1024 })
    await pick(w, [file('ok.xlsx', 100), file('pic.png', 100, 'image/png'), file('bad.exe', 100), file('big.xlsx', 5000)])
    expect(model(w).map((f) => f.name)).toEqual(['ok.xlsx', 'pic.png'])
    const alert = w.find('[role="alert"]')
    expect(alert.text()).toContain('bad.exe：格式不符')
    expect(alert.text()).toContain('big.xlsx：超過大小上限 1.0 KB')
    expect(w.emitted('reject')).toHaveLength(2)
  })

  it('maxCount：超過的檔案被拒絕，到上限時停用選檔', async () => {
    const w = mountUpload({ multiple: true, maxCount: 2 })
    await pick(w, [file('1.txt'), file('2.txt'), file('3.txt')])
    expect(model(w)).toHaveLength(2)
    expect(w.find('[role="alert"]').text()).toContain('3.txt：超過 2 個檔案上限')
    expect(w.find('input[type="file"]').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('已達 2 個檔案上限')
  })

  it('單檔模式：新檔案取代舊的', async () => {
    const w = mountUpload()
    await pick(w, [file('a.txt')])
    await pick(w, [file('b.txt')])
    expect(model(w).map((f) => f.name)).toEqual(['b.txt'])
  })

  it('拖放加入檔案；拖曳經過子元素不會閃爍', async () => {
    const w = mountUpload({ multiple: true })
    const zone = w.find('label')
    await zone.trigger('dragenter')
    await zone.trigger('dragenter') // 進入子元素
    await zone.trigger('dragleave') // 離開子元素
    expect(zone.text()).toContain('放開以加入檔案')
    await zone.trigger('drop', { dataTransfer: { files: [file('d.csv')] } })
    expect(zone.text()).not.toContain('放開以加入檔案')
    expect(model(w).map((f) => f.name)).toEqual(['d.csv'])
  })

  it('request：顯示進度，成功後狀態 success', async () => {
    let progress: (p: number) => void = () => {}
    let resolve: (v: unknown) => void = () => {}
    const request: UploadRequest = (_f, { onProgress }) => {
      progress = onProgress
      return new Promise((r) => (resolve = r))
    }
    const w = mountUpload({ request })
    await pick(w, [file('a.pdf')])
    progress(40)
    await nextTick()
    const bar = w.find('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('40')
    resolve({ id: 7 })
    await flushPromises()
    expect(model(w)[0]).toMatchObject({ status: 'success', percent: 100, response: { id: 7 } })
    expect(w.emitted('success')).toHaveLength(1)
  })

  it('多個檔案同時上傳，進度互不覆蓋', async () => {
    const progress: Record<string, (p: number) => void> = {}
    const request: UploadRequest = (f, { onProgress }) => {
      progress[f.name] = onProgress
      return new Promise(() => {})
    }
    const w = mountUpload({ request, multiple: true })
    await pick(w, [file('a'), file('b')])
    progress.a(30)
    progress.b(70)
    await nextTick()
    expect(model(w).map((f) => f.percent)).toEqual([30, 70])
  })

  it('失敗顯示訊息並可重試', async () => {
    let attempt = 0
    const request: UploadRequest = async () => {
      attempt++
      if (attempt === 1) throw new Error('網路中斷')
      return 'ok'
    }
    const w = mountUpload({ request })
    await pick(w, [file('a.txt')])
    await flushPromises()
    expect(model(w)[0]).toMatchObject({ status: 'error', error: '網路中斷' })
    expect(w.text()).toContain('網路中斷')
    await w.find('button[aria-label="重試上傳 a.txt"]').trigger('click')
    await flushPromises()
    expect(model(w)[0].status).toBe('success')
  })

  /** 上傳中按移除：要真的中止請求，不是只從清單拿掉 */
  it('上傳中移除會中止請求', async () => {
    let signal: AbortSignal | null = null
    const request: UploadRequest = (_f, o) => {
      signal = o.signal
      return new Promise(() => {})
    }
    const w = mountUpload({ request })
    await pick(w, [file('big.zip')])
    await w.find('button[aria-label="取消上傳 big.zip"]').trigger('click')
    expect(signal!.aborted).toBe(true)
    expect(model(w)).toHaveLength(0)
    expect(w.emitted('remove')).toHaveLength(1)
  })

  it('autoUpload=false 時由 submit() 一次上傳', async () => {
    const request = vi.fn(async () => 'ok')
    const w = mountUpload({ request, autoUpload: false, multiple: true })
    await pick(w, [file('a'), file('b')])
    expect(request).not.toHaveBeenCalled()
    const ok = await (w.vm as unknown as { submit: () => Promise<boolean> }).submit()
    expect(ok).toBe(true)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('父元件清空清單時同步', async () => {
    const w = mountUpload({ multiple: true })
    await pick(w, [file('a')])
    await w.setProps({ modelValue: [] })
    expect(w.findAll('li')).toHaveLength(0)
  })

  it('禁用時不接受拖放', async () => {
    const w = mountUpload({ disabled: true })
    await w.find('label').trigger('drop', { dataTransfer: { files: [file('x')] } })
    expect(model(w)).toHaveLength(0)
  })

  it('提示文字依 accept / maxSize 產生並以 aria-describedby 連到 input', () => {
    const w = mountUpload({ accept: '.xlsx,.csv', maxSize: 5 * 1024 * 1024 })
    const input = w.find('input[type="file"]')
    expect(w.find(`#${input.attributes('aria-describedby')}`).text()).toBe('格式：.xlsx、.csv，單檔上限 5.0 MB')
  })

  it('每顆按鈕都有 type="button" 與說明用的 aria-label', async () => {
    const w = mountUpload({ request: async () => { throw new Error('x') } })
    await pick(w, [file('a')])
    await flushPromises()
    for (const b of w.findAll('button')) {
      expect(b.attributes('type')).toBe('button')
      expect(b.attributes('aria-label')).toMatch(/a$/)
    }
  })
})
