import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import {
  cloneSvgWithStyles,
  csvBlob,
  elementToSvg,
  exportChart,
  svgToPng,
  isTransparent,
  toCsv,
} from '@/components/library/charts/utils/chartExport'
import ChptChartFrame from '@/components/library/charts/ChptChartFrame.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

describe('isTransparent', () => {
  it.each([
    ['transparent', true],
    ['', true],
    ['rgba(0, 0, 0, 0)', true],
    ['rgb(10 20 30 / 0)', true],
    ['rgba(10, 20, 30, 0.5)', false],
    // ⚠️ 第一版把藍色分量為 0 的顏色當成透明，圓餅圖的黃色圖例色塊不見了
    ['rgb(234, 179, 0)', false],
    ['rgb(0, 0, 0)', false],
    ['rgb(10 20 30 / 0.4)', false],
  ])('%s → %s', (color, expected) => {
    expect(isTransparent(color)).toBe(expected)
  })
})

describe('toCsv / csvBlob', () => {
  it('依 columns 的順序與標題；含逗號、引號、換行的值加引號', () => {
    const csv = toCsv(
      [{ name: '錫橋, 短路', count: 3, note: '說"明"' }, { name: '空焊\n二', count: 0, note: null }],
      [{ key: 'name', title: '原因' }, { key: 'count', title: '數量' }, { key: 'note' }]
    )
    expect(csv).toBe('原因,數量,note\r\n"錫橋, 短路",3,"說""明"""\r\n"空焊\n二",0,')
  })

  it('不給 columns 時用第一列的欄位', () => {
    expect(toCsv([{ a: 1, b: 2 }])).toBe('a,b\r\n1,2')
    expect(toCsv([])).toBe('')
  })

  it('以 = + - @ 開頭的文字加上單引號（避免試算表當成公式）；負數不受影響', () => {
    const csv = toCsv([{ v: '=SUM(A1)' }, { v: '@cmd' }, { v: '-3.5' }, { v: -2 }, { v: '+1 加班' }])
    expect(csv.split('\r\n').slice(1)).toEqual(["'=SUM(A1)", "'@cmd", '-3.5', '-2', "'+1 加班"])
  })

  it('csvBlob 開頭有 UTF-8 BOM（Excel 才不會把中文讀成亂碼）', async () => {
    const blob = csvBlob([{ a: '中文' }])
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(blob.type).toContain('text/csv')
  })
})

describe('cloneSvgWithStyles', () => {
  it('計算後的樣式寫進 style；拿掉 class、事件、tabindex 與 data-v', () => {
    document.body.innerHTML = `
      <svg width="100" height="50" class="chart" data-v-123>
        <rect class="bar" x="0" y="0" width="10" height="10" tabindex="0" onclick="x()"></rect>
      </svg>`
    const svg = document.querySelector('svg')!
    const fakeStyle = (fill: string) =>
      ({ getPropertyValue: (p: string) => (p === 'fill' ? fill : p === 'stroke-width' ? '1px' : '') }) as unknown as CSSStyleDeclaration
    const clone = cloneSvgWithStyles(svg, (el) => fakeStyle(el.tagName === 'rect' ? 'rgb(37, 99, 235)' : 'none'))
    const rect = clone.querySelector('rect')!
    expect(rect.getAttribute('style')).toBe('fill:rgb(37, 99, 235);stroke-width:1px')
    expect(rect.hasAttribute('class')).toBe(false)
    expect(rect.hasAttribute('tabindex')).toBe(false)
    expect(rect.hasAttribute('onclick')).toBe(false)
    expect(clone.hasAttribute('data-v-123')).toBe(false)
    // 原本的節點不受影響
    expect(svg.querySelector('rect')!.getAttribute('class')).toBe('bar')
  })
})

describe('elementToSvg', () => {
  function stubRect(el: Element, x: number, y: number, width: number, height: number) {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON() {} } as DOMRect)
  }

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('畫出 SVG、底色方塊；略過 data-export-ignore 與 Material Symbols 圖示', () => {
    document.body.innerHTML = `
      <div id="root" style="background-color: rgb(255, 255, 255)">
        <div id="box" style="background-color: rgb(250, 0, 0)"></div>
        <svg id="chart" width="80" height="40"><circle r="5"></circle></svg>
        <div id="ignored" data-export-ignore style="background-color: rgb(0, 0, 255)"></div>
        <span id="icon" class="material-symbols-outlined" style="background-color: rgb(0, 255, 0)">download</span>
      </div>`
    const root = document.getElementById('root')!
    stubRect(root, 0, 0, 200, 100)
    stubRect(document.getElementById('box')!, 10, 10, 20, 20)
    stubRect(document.getElementById('chart')!, 50, 20, 80, 40)
    stubRect(document.getElementById('ignored')!, 0, 0, 50, 50)
    stubRect(document.getElementById('icon')!, 0, 0, 20, 20)

    const { svg, width, height } = elementToSvg(root, { padding: 10 })
    expect(width).toBe(220)
    expect(height).toBe(120)
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const out = doc.documentElement
    // 必須是合法的 XML（重複的 xmlns 屬性會讓嚴格的解析器整份拒絕）
    expect(out.tagName).toBe('svg')
    expect(svg.match(/xmlns="/g)).toHaveLength(1)
    expect(out.getAttribute('viewBox')).toBe('0 0 220 120')
    expect(svg).not.toContain('foreignObject')

    const fills = [...out.querySelectorAll(':scope > rect')].map((r) => r.getAttribute('fill'))
    expect(fills).toContain('rgb(255, 255, 255)') // 底色
    expect(fills).toContain('rgb(250, 0, 0)') // #box
    expect(fills).not.toContain('rgb(0, 0, 255)') // data-export-ignore
    expect(fills).not.toContain('rgb(0, 255, 0)') // 圖示

    const nested = out.querySelector(':scope > svg')!
    expect(nested.getAttribute('x')).toBe('60')
    expect(nested.getAttribute('y')).toBe('30')
    expect(nested.querySelector('circle')).not.toBeNull()
  })

  /** jsdom 沒有文字的版面：用 Range 的假座標（每個字 10px 寬，超過 maxWidth 就換行） */
  function stubTextLayout(maxWidth: number) {
    const proto = Range.prototype as unknown as Record<string, unknown>
    const rectsOf = (range: Range) => {
      const node = range.startContainer
      const parent = node.parentElement!.getBoundingClientRect()
      const from = range.startOffset
      const to = range.endContainer === node && range.endOffset ? range.endOffset : (node.textContent ?? '').length
      const perLine = Math.floor(maxWidth / 10)
      const out: DOMRect[] = []
      for (let i = from; i < to; i++) {
        const line = Math.floor(i / perLine)
        const col = i % perLine
        const prev = out[out.length - 1]
        if (prev && prev.top === parent.top + line * 20) {
          const r = prev as { width: number; right: number }
          r.width += 10
          r.right += 10
        } else {
          const left = parent.left + col * 10
          const top = parent.top + line * 20
          out.push({ left, top, width: 10, height: 20, right: left + 10, bottom: top + 20 } as DOMRect)
        }
      }
      return out
    }
    proto.getClientRects = function (this: Range) {
      return rectsOf(this)
    }
    proto.getBoundingClientRect = function (this: Range) {
      return rectsOf(this)[0] ?? ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect)
    }
    return () => {
      delete proto.getClientRects
      delete proto.getBoundingClientRect
    }
  }

  it('文字畫成 <text>（字型、顏色）；換行的文字拆成多行', () => {
    document.body.innerHTML = `
      <div id="root">
        <p id="title" style="color: rgb(20, 20, 20); font-size: 14px; font-weight: 600; font-style: italic">不良原因</p>
        <p id="long" style="color: rgb(90, 90, 90)">ABCDEFGH</p>
        <p id="blank">   </p>
      </div>`
    const root = document.getElementById('root')!
    stubRect(root, 0, 0, 300, 200)
    stubRect(document.getElementById('title')!, 10, 10, 200, 20)
    stubRect(document.getElementById('long')!, 10, 50, 50, 40)
    stubRect(document.getElementById('blank')!, 10, 100, 50, 20)
    const restore = stubTextLayout(50) // 一行 5 個字
    try {
      const out = new DOMParser().parseFromString(elementToSvg(root, { padding: 0 }).svg, 'image/svg+xml').documentElement
      const texts = [...out.querySelectorAll('text')]
      expect(texts.map((t) => t.textContent)).toEqual(['不良原因', 'ABCDE', 'FGH'])
      const title = texts[0]
      expect(title.getAttribute('fill')).toBe('rgb(20, 20, 20)')
      expect(title.getAttribute('font-size')).toBe('14px')
      expect(title.getAttribute('font-weight')).toBe('600')
      expect(title.getAttribute('font-style')).toBe('italic')
      expect(title.getAttribute('dominant-baseline')).toBe('central')
      // 第二行在第一行下面 20px
      expect(Number(texts[2].getAttribute('y')) - Number(texts[1].getAttribute('y'))).toBe(20)
    } finally {
      restore()
    }
  })

  it('框線畫成空心 <rect>；會裁切內容的區塊包進 clipPath', () => {
    document.body.innerHTML = `
      <div id="root">
        <div id="card" style="border: 2px solid rgb(200, 0, 0); border-top-left-radius: 6px; overflow: hidden">
          <div id="inner" style="background-color: rgb(0, 0, 200)"></div>
        </div>
      </div>`
    const root = document.getElementById('root')!
    stubRect(root, 0, 0, 100, 100)
    stubRect(document.getElementById('card')!, 10, 10, 50, 40)
    stubRect(document.getElementById('inner')!, 10, 10, 80, 80)
    const out = new DOMParser().parseFromString(elementToSvg(root, { padding: 0 }).svg, 'image/svg+xml').documentElement
    const border = [...out.querySelectorAll('rect')].find((r) => r.getAttribute('stroke') === 'rgb(200, 0, 0)')!
    expect(border.getAttribute('fill')).toBe('none')
    expect(border.getAttribute('stroke-width')).toBe('2')
    expect(border.getAttribute('rx')).toBe('6')
    expect(border.getAttribute('x')).toBe('11') // 線畫在邊框中間
    const clip = out.querySelector('clipPath')!
    expect(clip.querySelector('rect')!.getAttribute('width')).toBe('50')
    const group = out.querySelector(`g[clip-path="url(#${clip.id})"]`)!
    expect(group.querySelector('rect')!.getAttribute('fill')).toBe('rgb(0, 0, 200)')
  })

  it('canvas 嵌成 <image>；讀不出來的 canvas（跨來源）略過', () => {
    document.body.innerHTML = `<div id="root"><canvas id="ok"></canvas><canvas id="tainted"></canvas><canvas id="zero"></canvas></div>`
    const root = document.getElementById('root')!
    stubRect(root, 0, 0, 100, 100)
    const ok = document.getElementById('ok') as HTMLCanvasElement
    const tainted = document.getElementById('tainted') as HTMLCanvasElement
    stubRect(ok, 5, 5, 40, 30)
    stubRect(tainted, 50, 5, 40, 30)
    stubRect(document.getElementById('zero')!, 0, 0, 0, 0)
    ok.toDataURL = () => 'data:image/png;base64,AAAA'
    tainted.toDataURL = () => {
      throw new DOMException('Tainted canvases may not be exported.', 'SecurityError')
    }
    const out = new DOMParser().parseFromString(elementToSvg(root, { padding: 0 }).svg, 'image/svg+xml').documentElement
    const images = out.querySelectorAll('image')
    expect(images).toHaveLength(1)
    expect(images[0].getAttribute('href')).toBe('data:image/png;base64,AAAA')
    expect(images[0].getAttribute('x')).toBe('5')
    expect(images[0].getAttribute('width')).toBe('40')
  })

  it('隱藏的元素與螢幕閱讀器專用文字不畫', () => {
    document.body.innerHTML = `
      <div id="root">
        <div id="hidden" style="display: none; background-color: rgb(1, 1, 1)"></div>
        <div id="invisible" style="visibility: hidden; background-color: rgb(2, 2, 2)"></div>
        <div id="sr" style="overflow: hidden; background-color: rgb(3, 3, 3)"></div>
      </div>`
    const root = document.getElementById('root')!
    stubRect(root, 0, 0, 100, 100)
    stubRect(document.getElementById('hidden')!, 0, 0, 10, 10)
    stubRect(document.getElementById('invisible')!, 0, 0, 10, 10)
    stubRect(document.getElementById('sr')!, 0, 0, 1, 1)
    const { svg } = elementToSvg(root)
    expect(svg).not.toMatch(/rgb\(([123]), \1, \1\)/)
  })

  it("background: 'transparent' 時不畫底色", () => {
    document.body.innerHTML = `<div id="root" style="background-color: rgb(1, 2, 3)"></div>`
    const root = document.getElementById('root')!
    stubRect(root, 0, 0, 10, 10)
    const { svg } = elementToSvg(root, { background: 'transparent' })
    expect(svg).not.toContain('rgb(1, 2, 3)')
  })
})

describe('svgToPng / exportChart', () => {
  let onImage: ((img: { onload?: () => void; onerror?: () => void }) => void) | null = null
  const revoked: string[] = []

  function stubBrowser(toBlobResult: Blob | null = new Blob(['png'], { type: 'image/png' })) {
    Object.assign(URL, { createObjectURL: () => 'blob:svg', revokeObjectURL: (u: string) => revoked.push(u) })
    class FakeImage {
      onload?: () => void
      onerror?: () => void
      set src(_v: string) {
        queueMicrotask(() => onImage?.(this))
      }
    }
    vi.stubGlobal('Image', FakeImage)
    const ctx = { scale: vi.fn(), drawImage: vi.fn() }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: BlobCallback) {
      cb(toBlobResult)
    })
    return ctx
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    onImage = null
    revoked.length = 0
  })

  it('依倍率建立畫布、畫上 SVG，回傳 PNG Blob 並釋放 URL', async () => {
    const ctx = stubBrowser()
    onImage = (img) => img.onload?.()
    const blob = await svgToPng('<svg/>', 100, 50, 3)
    expect(blob.type).toBe('image/png')
    expect(ctx.scale).toHaveBeenCalledWith(3, 3)
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50)
    expect(revoked).toEqual(['blob:svg'])
  })

  it('SVG 畫不出來、toBlob 失敗時 reject', async () => {
    stubBrowser()
    onImage = (img) => img.onerror?.()
    await expect(svgToPng('<svg/>', 10, 10)).rejects.toThrow('failed to render SVG')

    stubBrowser(null)
    onImage = (img) => img.onload?.()
    await expect(svgToPng('<svg/>', 10, 10)).rejects.toThrow('toBlob')
  })

  it('exportChart：svg 直接回傳 SVG Blob、png 經過 svgToPng', async () => {
    stubBrowser()
    onImage = (img) => img.onload?.()
    document.body.innerHTML = '<div id="root"></div>'
    const root = document.getElementById('root')!
    expect((await exportChart(root, 'svg')).type).toContain('image/svg+xml')
    expect((await exportChart(root, 'png', { scale: 1 })).type).toBe('image/png')
  })
})

describe('ChptChartFrame', () => {
  let wrapper: VueWrapper | null = null
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  function mountFrame(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
    wrapper = mount(ChptChartFrame, {
      props: { title: '不良原因', ...props },
      slots: { default: () => h('svg', { class: 'the-chart', width: 100, height: 50 }), ...slots },
      attachTo: document.body,
    })
    return wrapper
  }

  it('標題、說明；區塊以標題命名', () => {
    const w = mountFrame({ description: '單位：件' })
    expect(w.find('h3').text()).toBe('不良原因')
    expect(w.text()).toContain('單位：件')
    expect(w.find('section').attributes('aria-labelledby')).toBe(w.find('h3').attributes('id'))
  })

  it('height 套在圖表區', () => {
    const w = mountFrame({ height: '18rem' })
    expect((w.find('.chpt-chart-frame-body').element as HTMLElement).style.height).toBe('18rem')
  })

  it('loading：圖保留、加上遮罩與 aria-busy', () => {
    const w = mountFrame({ loading: true })
    expect(w.find('.the-chart').exists()).toBe(true)
    expect(w.find('.chpt-chart-frame-body').attributes('aria-busy')).toBe('true')
    expect(w.find('[data-export-ignore] .chpt-spinner, [data-export-ignore]').exists()).toBe(true)
  })

  it('empty：以空狀態取代圖表；載入中時不顯示空狀態', async () => {
    const w = mountFrame({ empty: true })
    expect(w.find('.the-chart').exists()).toBe(false)
    expect(w.text()).toContain('沒有資料')
    await w.setProps({ loading: true })
    expect(w.text()).not.toContain('沒有資料')
  })

  it('error：顯示訊息與重試鈕，按下送出 retry', async () => {
    const w = mountFrame({ error: '連線逾時' })
    expect(w.find('[role="alert"]').text()).toContain('連線逾時')
    expect(w.find('.the-chart').exists()).toBe(false)
    await w.find('[role="alert"] button').trigger('click')
    expect(w.emitted('retry')).toHaveLength(1)
    await w.setProps({ error: true })
    expect(w.find('[role="alert"]').text()).toContain('圖表載入失敗')
  })

  it('匯出選單：exportable 為 true 時有 PNG / SVG；有 csvData 才有 CSV', async () => {
    const w = mountFrame({ exportable: true })
    await w.find('button[aria-haspopup]').trigger('click')
    expect(w.findAll('[role="menuitem"]').map((m) => m.text())).toEqual(['image下載 PNG 圖片', 'polyline下載 SVG 向量圖'])
    await w.setProps({ csvData: [{ a: 1 }] })
    expect(w.findAll('[role="menuitem"]').map((m) => m.text()).at(-1)).toContain('下載 CSV 資料')
  })

  it('沒有 exportable 時沒有匯出選單；指定格式時只列那些', async () => {
    expect(mountFrame().find('button[aria-haspopup]').exists()).toBe(false)
    wrapper!.unmount()
    const w = mountFrame({ exportable: ['csv'], csvData: [{ a: 1 }] })
    await w.find('button[aria-haspopup]').trigger('click')
    expect(w.findAll('[role="menuitem"]')).toHaveLength(1)
  })

  it('載入中、錯誤、沒有資料時圖片匯出停用（CSV 仍可用）', async () => {
    const w = mountFrame({ exportable: true, csvData: [{ a: 1 }], loading: true })
    await w.find('button[aria-haspopup]').trigger('click')
    const items = w.findAll('[role="menuitem"]')
    expect(items[0].attributes('aria-disabled') ?? items[0].attributes('disabled')).toBeDefined()
    expect(items[2].attributes('aria-disabled') ?? items[2].attributes('disabled')).toBeUndefined()
  })

  it('autoDownload=false：download() 只送 export 事件、不觸發下載；檔名去掉不允許的字元', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    const w = mountFrame({ exportable: true, csvData: [{ a: 1 }], autoDownload: false, filename: '週報: A/B' })
    const vm = w.vm as unknown as { download: (f: string) => Promise<Blob> }
    const blob = await vm.download('csv')
    expect(click).not.toHaveBeenCalled()
    const [payload] = w.emitted('export')![0] as [{ format: string; blob: Blob; filename: string }]
    expect(payload.format).toBe('csv')
    expect(payload.blob).toBe(blob)
    expect(payload.filename).toBe('週報_ A_B.csv')
  })

  it('預設自動下載', async () => {
    // jsdom 沒有 URL.createObjectURL
    Object.assign(URL, { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const w = mountFrame({ exportable: true, csvData: [{ a: 1 }] })
    await (w.vm as unknown as { download: (f: string) => Promise<Blob> }).download('csv')
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('exportAs("svg") 產生 SVG Blob，不含工具列', async () => {
    const w = mountFrame({ exportable: true })
    const blob = await (w.vm as unknown as { exportAs: (f: string) => Promise<Blob> }).exportAs('svg')
    expect(blob.type).toContain('image/svg+xml')
    const text = await blob.text()
    expect(text.startsWith('<svg')).toBe(true)
    expect(text).not.toContain('匯出')
  })

  it('匯出失敗：送 export-error、以 aria-live 告知，不丟出未處理的錯誤', async () => {
    const w = mountFrame({ exportable: true, autoDownload: false })
    vi.spyOn(XMLSerializer.prototype, 'serializeToString').mockImplementation(() => {
      throw new Error('boom')
    })
    await w.find('button[aria-haspopup]').trigger('click')
    await w.findAll('[role="menuitem"]')[1].trigger('click')
    await nextTick()
    await nextTick()
    expect(w.emitted('export-error')).toHaveLength(1)
    expect(w.find('[aria-live="polite"].sr-only').text()).toBe('匯出失敗，請再試一次')
  })

  it('語系：切成 enUS', async () => {
    wrapper = mount({
      render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptChartFrame, { title: 'Defects', exportable: true, error: true })),
    }, { attachTo: document.body })
    expect(wrapper.text()).toContain('Failed to load the chart')
    expect(wrapper.text()).toContain('Retry')
    expect(wrapper.text()).toContain('Export')
  })
})
