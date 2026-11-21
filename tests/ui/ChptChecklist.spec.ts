import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChptChecklist from '@/components/library/ui/ChptChecklist.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { ChecklistItem, ChecklistResults, ChecklistSummary } from '@/components/library/shared/checklist'

const items: ChecklistItem[] = [
  { id: 'a1', section: '外觀', label: '安全門', description: '打開應停止' },
  { id: 'a2', section: '外觀', label: '清潔', allowNA: false },
  { id: 'm1', section: '量測', type: 'measure', label: '壓力', lsl: 4.5, usl: 6.5, target: 5.5, unit: 'kg', precision: 1 },
  { id: 'm2', section: '量測', type: 'measure', label: '溫度', lsl: 4 },
  { id: 'm3', section: '量測', type: 'measure', label: '振動', usl: 2 },
  { id: 'm4', section: '量測', type: 'measure', label: '轉速' },
  { id: 't1', type: 'text', label: '批號' },
  { id: 't2', type: 'text', label: '備註', required: false },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

function mountIt(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  const model = ref<ChecklistResults>((props.modelValue as ChecklistResults) ?? {})
  const w = mount(
    {
      render: () =>
        h(
          ChptChecklist,
          { items, ...props, modelValue: model.value, 'onUpdate:modelValue': (v: ChecklistResults) => (model.value = v) },
          slots
        ),
    },
    { attachTo: document.body }
  )
  mounted.push(w)
  const comp = () => w.findComponent(ChptChecklist)
  const li = (id: string) => w.findAll('ol > li').find((x) => x.attributes('id')?.endsWith(`-item-${id}`))!
  const radio = (id: string, label: string) => li(id).findAll('[role="radio"]').find((b) => b.text().endsWith(label))!
  const api = () => comp().vm as unknown as { validate: () => ChecklistSummary; focusItem: (id: string) => void; reset: () => void; summary: () => ChecklistSummary }
  return { w, model, comp, li, radio, api }
}

describe('ChptChecklist', () => {
  it('分組、編號、必填、說明、規格文字、進度', () => {
    const { w, li } = mountIt()
    expect(w.findAll('section h3').map((x) => x.text())).toEqual(['外觀', '量測'])
    expect(li('a1').text()).toContain('1.安全門')
    expect(li('a1').text()).toContain('（必填）')
    expect(li('t2').text()).not.toContain('（必填）')
    expect(li('m1').text()).toContain('規格 4.5 – 6.5 kg（目標 5.5 kg）')
    expect(li('m2').text()).toContain('規格 ≥ 4')
    expect(li('m3').text()).toContain('規格 ≤ 2')
    expect(li('m4').text()).not.toContain('規格')
    expect(w.find('[role="progressbar"]').attributes('aria-valuetext')).toBe('已完成 0 / 8')
    expect(li('a2').findAll('[role="radio"]')).toHaveLength(2)
  })

  it('選合格 / 不合格：送出 v-model 與 change；不合格出現原因欄（必填）；進度與不合格數', async () => {
    const { w, model, comp, radio, li } = mountIt()
    await radio('a1', '不合格').trigger('click')
    expect(model.value.a1).toMatchObject({ status: 'ng' })
    expect(model.value.a1!.at).toBeTruthy()
    expect(comp().emitted('change')![0][0]).toBe('a1')
    expect(radio('a1', '不合格').attributes('aria-checked')).toBe('true')
    const ta = li('a1').find('textarea')
    expect(ta.attributes('aria-required')).toBe('true')
    expect(w.text()).toContain('不合格 1')
    await ta.setValue('門鎖失效')
    await ta.trigger('change')
    expect(model.value.a1!.note).toBe('門鎖失效')
    await ta.setValue('  ')
    await ta.trigger('change')
    expect(model.value.a1!.note).toBeUndefined()
    await radio('a2', '合格').trigger('click')
    expect(w.text()).toContain('已完成 2 / 8')
  })

  it('不適用；合格時有備註才顯示備註欄', async () => {
    const { w, radio, li } = mountIt({ modelValue: { a1: { status: 'ok', note: '新換門鎖' } } })
    expect(li('a1').find('label').text()).toBe('備註')
    await radio('a2', '合格').trigger('click')
    expect(li('a2').find('textarea').exists()).toBe(false)
    const w2 = mountIt()
    await w2.radio('a1', '不適用').trigger('click')
    expect(w2.w.text()).toContain('不適用 1')
    void w
  })

  it('鍵盤：方向鍵在選項間移動並選取（循環）、Home / End；其他鍵不處理', async () => {
    const { model, li } = mountIt()
    const radios = () => li('a1').findAll('[role="radio"]')
    expect(radios().map((r) => r.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    await radios()[0].trigger('keydown', { key: 'ArrowRight' })
    expect(model.value.a1!.status).toBe('ng')
    await nextTick()
    expect(document.activeElement).toBe(radios()[1].element)
    await radios()[1].trigger('keydown', { key: 'End' })
    expect(model.value.a1!.status).toBe('na')
    await radios()[2].trigger('keydown', { key: 'ArrowDown' })
    expect(model.value.a1!.status).toBe('ok')
    await radios()[0].trigger('keydown', { key: 'ArrowLeft' })
    expect(model.value.a1!.status).toBe('na')
    await radios()[2].trigger('keydown', { key: 'Home' })
    expect(model.value.a1!.status).toBe('ok')
    await radios()[0].trigger('keydown', { key: 'ArrowUp' })
    expect(model.value.a1!.status).toBe('na')
    await radios()[2].trigger('keydown', { key: 'x' })
    expect(model.value.a1!.status).toBe('na')
  })

  it('量測：輸入數值自動判定（規格內 / 超出規格）', async () => {
    const { model, li } = mountIt()
    const input = li('m1').find('input')
    await input.setValue('7')
    await input.trigger('blur')
    expect(model.value.m1).toMatchObject({ value: 7, status: 'ng' })
    expect(li('m1').text()).toContain('超出規格')
    expect(li('m1').find('textarea').exists()).toBe(true)
    await input.setValue('5.2')
    await input.trigger('blur')
    expect(model.value.m1).toMatchObject({ value: 5.2, status: 'ok' })
    expect(li('m1').text()).toContain('規格內')
  })

  it('數字鍵盤：開啟、確定後寫入並關閉', async () => {
    const { model, li } = mountIt({ numpad: true })
    await li('m2').find('button[aria-label="用數字鍵盤輸入：溫度"]').trigger('click')
    await nextTick()
    const pad = li('m2').find('[role="group"][aria-label="溫度"]')
    expect(pad.exists()).toBe(true)
    for (const key of ['6', 'Enter']) await pad.trigger('keydown', { key })
    expect(model.value.m2).toMatchObject({ value: 6, status: 'ok' })
    await nextTick()
    expect(li('m2').find('[role="group"][aria-label="溫度"]').exists()).toBe(false)
  })

  it('文字：change 時寫入，填了就算完成', async () => {
    const { model, li } = mountIt()
    const input = li('t1').find('input')
    await input.setValue('LOT-7')
    await input.trigger('change')
    expect(model.value.t1).toMatchObject({ text: 'LOT-7', status: 'ok' })
  })

  it('照片：預設讀成 data URL；photoReader 可改；讀取失敗的略過；可移除；text 項目預設沒有', async () => {
    const reader = vi.fn((f: File) => (f.name === 'bad.jpg' ? Promise.reject(new Error('x')) : Promise.resolve(`https://cdn/${f.name}`)))
    const { model, li } = mountIt({ allowPhotos: true, photoReader: reader })
    expect(li('t1').find('input[type="file"]').exists()).toBe(false)
    const file = li('a1').find('input[type="file"]')
    Object.defineProperty(file.element, 'files', { configurable: true, value: [new File(['a'], 'a.jpg'), new File(['b'], 'bad.jpg')] })
    await file.trigger('change')
    await flushPromises()
    expect(model.value.a1!.photos).toEqual(['https://cdn/a.jpg'])
    expect(li('a1').find('img').attributes('alt')).toBe('安全門 的照片 1')
    await li('a1').find('button[aria-label="移除 安全門 的照片 1"]').trigger('click')
    expect(model.value.a1!.photos).toEqual([])
    // 沒有選檔案
    Object.defineProperty(file.element, 'files', { configurable: true, value: [] })
    await file.trigger('change')
    // 全部失敗：不寫入
    Object.defineProperty(file.element, 'files', { configurable: true, value: [new File(['b'], 'bad.jpg')] })
    await file.trigger('change')
    await flushPromises()
    expect(model.value.a1!.photos).toEqual([])
  })

  it('照片：預設的 FileReader；item.photos 覆寫', async () => {
    const itemsWithPhoto: ChecklistItem[] = [{ id: 'x', label: 'X', type: 'text', photos: true }, { id: 'y', label: 'Y', photos: false }]
    const r = mountIt({ items: itemsWithPhoto, allowPhotos: true })
    expect(r.li('y').find('input[type="file"]').exists()).toBe(false)
    const file = r.li('x').find('input[type="file"]')
    Object.defineProperty(file.element, 'files', { configurable: true, value: [new File(['hi'], 'x.png', { type: 'image/png' })] })
    await file.trigger('change')
    await vi.waitFor(() => expect(r.model.value.x?.photos?.[0]).toMatch(/^data:image\/png;base64,/))
  })

  it('篩選：待處理 / 不合格；沒有符合時顯示提示', async () => {
    const { w, radio } = mountIt()
    const filter = (label: string) => w.find('[role="radiogroup"][aria-label="顯示項目"]').findAll('[role="radio"]').find((b) => b.text() === label)!
    await radio('a1', '合格').trigger('click')
    await filter('待處理').trigger('click')
    expect(w.findAll('ol > li')).toHaveLength(6) // 8 - a1 - t2（非必填）
    await filter('不合格').trigger('click')
    expect(w.text()).toContain('沒有不合格的項目')
    await filter('全部').trigger('click')
    expect(w.findAll('ol > li')).toHaveLength(8)
  })

  it('validate：標出問題、捲到並聚焦第一個；缺原因時聚焦原因欄；完成時回報全部完成', async () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const { w, api, li, radio, model } = mountIt()
    expect(w.findAll('li.border-danger')).toHaveLength(0)
    let s = api().validate()
    await nextTick()
    expect(s.complete).toBe(false)
    expect(w.findAll('li.border-danger')).toHaveLength(7)
    expect(li('a1').text()).toContain('尚未填寫')
    expect(scroll).toHaveBeenCalled()
    expect(document.activeElement).toBe(li('a1').find('[role="radio"]').element)
    expect(w.find('[aria-live="polite"].sr-only').text()).toBe('還有 7 項需要處理')
    // 全部填好，只有 a1 不合格缺原因
    model.value = { a1: { status: 'ng' }, a2: { status: 'ok' }, m1: { value: 5 }, m2: { value: 5 }, m3: { value: 1 }, m4: { value: 1 }, t1: { text: 'L' } }
    await nextTick()
    s = api().validate()
    await nextTick()
    expect(s.noteRequired).toEqual(['a1'])
    expect(li('a1').text()).toContain('不合格需要填寫原因')
    expect(document.activeElement).toBe(li('a1').find('textarea').element)
    expect(li('a1').find('textarea').attributes('aria-invalid')).toBe('true')
    await li('a1').find('textarea').setValue('已修')
    await li('a1').find('textarea').trigger('change')
    await nextTick()
    s = api().validate()
    expect(s.complete).toBe(true)
    await nextTick()
    expect(w.find('[aria-live="polite"].sr-only').text()).toBe('全部完成')
    void radio
  })

  it('validate 時被篩選藏起來的項目會先顯示；focusItem 找不到時不做事；reset 清除', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    const { w, api, model } = mountIt({ modelValue: { a1: { status: 'ng', note: 'x' } } })
    await w.find('[role="radiogroup"][aria-label="顯示項目"]').findAll('[role="radio"]')[2].trigger('click')
    expect(w.findAll('ol > li')).toHaveLength(1)
    api().validate()
    await nextTick()
    expect(w.findAll('ol > li')).toHaveLength(8)
    api().focusItem('nope')
    api().reset()
    await nextTick()
    expect(model.value).toEqual({})
    expect(api().summary().done).toBe(0)
  })

  it('footer 插槽拿得到 summary 與 validate', () => {
    const { w } = mountIt({}, { footer: ({ summary }: { summary: ChecklistSummary }) => h('em', `${summary.done}/${summary.total}`) })
    expect(w.find('em').text()).toBe('0/8')
  })

  it('readonly：不能改、沒有照片按鈕；disabled：按鈕停用', async () => {
    const { model, radio, li, comp } = mountIt({ readonly: true, allowPhotos: true, modelValue: { a1: { status: 'ok', photos: ['p.png'] } } })
    await radio('a1', '不合格').trigger('click')
    expect(model.value.a1!.status).toBe('ok')
    expect(comp().emitted('update:modelValue')).toBeUndefined()
    expect(li('a1').find('input[type="file"]').exists()).toBe(false)
    expect(li('a1').find('button[aria-label^="移除"]').exists()).toBe(false)
    expect(li('a2').find('input[type="file"]').exists()).toBe(false)
    const r = mountIt({ disabled: true })
    expect(r.radio('a1', '合格').attributes('disabled')).toBeDefined()
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptChecklist, { items, modelValue: {} })) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.text()).toContain('0 / 8 done')
    expect(w.text()).toContain('Spec 4.5 – 6.5 kg (target 5.5 kg)')
    expect(w.findAll('ol [role="radio"]').map((r) => r.text().replace(/\s+/g, '')).slice(0, 3)).toEqual(['check_circleOK', 'cancelNG', 'remove_circleN/A'])
  })
})
