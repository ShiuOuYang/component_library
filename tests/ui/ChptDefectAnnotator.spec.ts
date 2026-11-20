import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptDefectAnnotator from '@/components/library/ui/ChptDefectAnnotator.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { DefectMark } from '@/components/library/shared/defectMarks'

/** 標註區固定 400×200、左上角在 (0, 0)：比例 (0.5, 0.5) = 像素 (200, 100) */
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0, toJSON: () => ({}),
  })
})

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

/** jsdom 沒有 PointerEvent：用一般 Event 加上需要的欄位 */
async function fire(el: Element, type: string, init: Record<string, unknown>) {
  const ev = new Event(type, { bubbles: true, cancelable: true })
  for (const [k, v] of Object.entries({ pointerId: 1, pointerType: 'mouse', button: 0, ...init })) Object.defineProperty(ev, k, { value: v })
  el.dispatchEvent(ev)
  await nextTick()
}

const types = [
  { value: 'short', label: '短路', color: '#ef4444' },
  { value: 'open', label: '空焊', color: '#f59e0b' },
]

function mountIt(props: Record<string, unknown> = {}) {
  const model = ref<DefectMark[]>((props.modelValue as DefectMark[]) ?? [])
  const w = mount(
    {
      render: () =>
        h(ChptDefectAnnotator, {
          src: 'pcb.png',
          alt: 'PCB',
          defectTypes: types,
          ...props,
          modelValue: model.value,
          'onUpdate:modelValue': (v: DefectMark[]) => (model.value = v),
        }),
    },
    { attachTo: document.body }
  )
  mounted.push(w)
  const comp = () => w.findComponent(ChptDefectAnnotator)
  const layer = () => w.find('[role="group"][aria-label^="缺陷標註區"]')
  const markBtn = (n: number) => layer().findAll('button')[n - 1]
  const typeChips = () => w.find('[role="radiogroup"][aria-label="缺陷類型"]').findAll('[role="radio"]')
  const toolBtn = (label: string) => w.findAll('[role="radio"]').find((r) => r.text().endsWith(label))!
  return { w, model, comp, layer, markBtn, typeChips, toolBtn }
}

const seed = (): DefectMark[] => [
  { id: 'd1', x: 0.5, y: 0.5, type: 'short', note: '錫橋' },
  { id: 'd2', x: 0.1, y: 0.1, w: 0.2, h: 0.4, type: 'open' },
]

describe('ChptDefectAnnotator', () => {
  it('畫出編號圓點（框在中心）與框、清單與各類型數量', () => {
    const { w, layer, markBtn, typeChips } = mountIt({ modelValue: seed() })
    expect(layer().attributes('aria-label')).toBe('缺陷標註區：PCB')
    expect(markBtn(1).attributes('aria-label')).toBe('第 1 處：短路，錫橋')
    expect(markBtn(2).attributes('style')).toContain('left: 20%')
    expect(markBtn(2).attributes('style')).toContain('top: 30%')
    expect(typeChips().map((r) => r.text().replace(/\s+/g, ' '))).toEqual(['短路 1', '空焊 1'])
    expect(w.findAll('ol li')).toHaveLength(2)
    expect(w.text()).toContain('共 2 處')
  })

  it('點一下新增點（目前類型）、選取並念出', async () => {
    const { w, model, comp, layer, typeChips } = mountIt()
    expect(w.text()).toContain('尚未標記')
    await typeChips()[1].trigger('click')
    await fire(layer().element, 'pointerdown', { clientX: 100, clientY: 50 })
    await fire(layer().element, 'pointerup', { clientX: 100, clientY: 50 })
    expect(model.value).toEqual([{ id: 'd1', type: 'open', x: 0.25, y: 0.25 }])
    expect(comp().emitted('add')![0][0]).toMatchObject({ id: 'd1' })
    expect(comp().emitted('select')!.at(-1)).toEqual(['d1'])
    expect(w.find('[aria-live="polite"]').text()).toBe('已新增第 1 處：空焊')
  })

  it('框：拖曳新增；太小的框不算', async () => {
    const { w, model, layer } = mountIt({ defaultTool: 'rect' })
    expect(w.text()).toContain('拖曳拉出範圍新增框')
    await fire(layer().element, 'pointerdown', { clientX: 200, clientY: 100 })
    await fire(layer().element, 'pointermove', { clientX: 100, clientY: 40 })
    expect(layer().findAll('div.border-dashed')).toHaveLength(1)
    await fire(layer().element, 'pointerup', { clientX: 100, clientY: 40 })
    expect(model.value[0]).toMatchObject({ x: 0.25, y: 0.2, w: 0.25, h: 0.3, type: 'short' })
    await fire(layer().element, 'pointerdown', { clientX: 10, clientY: 10 })
    await fire(layer().element, 'pointerup', { clientX: 11, clientY: 10 })
    expect(model.value).toHaveLength(1)
  })

  it('滑鼠右鍵、第二根手指不新增；pointercancel 取消', async () => {
    const { model, layer } = mountIt()
    await fire(layer().element, 'pointerdown', { button: 2, clientX: 10, clientY: 10 })
    await fire(layer().element, 'pointerup', { clientX: 10, clientY: 10 })
    await fire(layer().element, 'pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 10, clientY: 10 })
    await fire(layer().element, 'pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 50, clientY: 50 })
    await fire(layer().element, 'pointerup', { pointerId: 2 })
    expect(model.value).toHaveLength(0)
    await fire(layer().element, 'pointercancel', { pointerId: 1 })
    await fire(layer().element, 'pointerup', { pointerId: 1 })
    expect(model.value).toHaveLength(0)
  })

  it('拖曳標記移動（小於門檻不動）；拖曳時不會新增', async () => {
    const { model, markBtn } = mountIt({ modelValue: seed() })
    await fire(markBtn(1).element, 'pointerdown', { clientX: 200, clientY: 100 })
    await fire(markBtn(1).element, 'pointermove', { clientX: 200.5, clientY: 100 })
    expect(model.value[0].x).toBe(0.5)
    await fire(markBtn(1).element, 'pointermove', { clientX: 240, clientY: 120 })
    await fire(markBtn(1).element, 'pointerup', { clientX: 240, clientY: 120 })
    expect(model.value[0]).toMatchObject({ x: 0.6, y: 0.6 })
    expect(model.value).toHaveLength(2)
    await fire(markBtn(1).element, 'pointermove', { clientX: 0, clientY: 0 }) // 放開後不再移動
    expect(model.value[0]).toMatchObject({ x: 0.6, y: 0.6 })
  })

  it('鍵盤：方向鍵微調（Shift 加大）、Delete 刪除後焦點移到下一個、Escape 取消選取', async () => {
    const { w, model, comp, markBtn, layer } = mountIt({ modelValue: seed() })
    await markBtn(1).trigger('focus')
    await markBtn(1).trigger('keydown', { key: 'ArrowRight' })
    expect(model.value[0].x).toBeCloseTo(0.51)
    await markBtn(1).trigger('keydown', { key: 'ArrowUp', shiftKey: true })
    expect(model.value[0].y).toBeCloseTo(0.45)
    await markBtn(1).trigger('keydown', { key: 'a' })
    ;(markBtn(1).element as HTMLElement).focus()
    await markBtn(1).trigger('keydown', { key: 'Delete' })
    await nextTick()
    expect(model.value.map((m) => m.id)).toEqual(['d2'])
    expect(comp().emitted('remove')![0][0]).toMatchObject({ id: 'd1' })
    expect(document.activeElement).toBe(markBtn(1).element)
    expect(w.find('[aria-live="polite"]').text()).toBe('已刪除第 1 處')
    await markBtn(1).trigger('keydown', { key: 'Escape' })
    expect(comp().emitted('select')!.at(-1)).toEqual([null])
    expect(document.activeElement).toBe(layer().element)
    ;(markBtn(1).element as HTMLElement).focus()
    await markBtn(1).trigger('keydown', { key: 'Backspace' })
    await nextTick()
    expect(model.value).toHaveLength(0)
    expect(document.activeElement).toBe(layer().element)
  })

  it('標註區按 Enter 在中央新增並聚焦；框模式新增中央的框；Escape 取消選取', async () => {
    const { model, layer, markBtn, comp, toolBtn } = mountIt()
    await layer().trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(model.value[0]).toMatchObject({ x: 0.5, y: 0.5 })
    expect(document.activeElement).toBe(markBtn(1).element)
    await layer().trigger('keydown', { key: 'Escape' })
    expect(comp().emitted('select')!.at(-1)).toEqual([null])
    await toolBtn('框').trigger('click')
    await layer().trigger('keydown', { key: ' ' })
    expect(model.value[1]).toMatchObject({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 })
  })

  it('選類型會套用到選取中的標記；清單改備註（空白清掉）、刪除、點編號聚焦', async () => {
    const { w, model, markBtn, typeChips } = mountIt({ modelValue: seed() })
    await markBtn(1).trigger('focus')
    await typeChips()[1].trigger('click')
    expect(model.value[0].type).toBe('open')
    const input = w.find('ol li input')
    await input.setValue('  ')
    await input.trigger('change')
    expect(model.value[0].note).toBeUndefined()
    await input.setValue('已修補')
    await input.trigger('change')
    expect(model.value[0].note).toBe('已修補')
    await w.findAll('ol li')[1].findAll('button')[0].trigger('click')
    expect(document.activeElement).toBe(markBtn(2).element)
    await w.find('button[aria-label="刪除第 2 處"]').trigger('click')
    expect(model.value).toHaveLength(1)
    // 工具列的刪除（刪除選取中的）
    await markBtn(1).trigger('focus')
    await w.findAll('button').find((b) => b.text().includes('刪除') && !b.attributes('aria-label'))!.trigger('click')
    expect(model.value).toHaveLength(0)
  })

  it('hover 清單或標記時框會加底色', async () => {
    const { w, layer } = mountIt({ modelValue: seed() })
    const box = () => layer().find('div[aria-hidden="true"]')
    expect(box().attributes('style')).not.toContain('color-mix')
    await w.findAll('ol li')[1].trigger('mouseenter')
    expect(box().attributes('style')).toContain('color-mix')
    await w.findAll('ol li')[1].trigger('mouseleave')
    await layer().findAll('button')[1].trigger('mouseenter')
    expect(box().attributes('style')).toContain('color-mix')
    await layer().findAll('button')[1].trigger('mouseleave')
    expect(box().attributes('style')).not.toContain('color-mix')
  })

  it('readonly：沒有工具列與刪除，不能新增、移動、改備註，但可以選取', async () => {
    const { w, model, layer, markBtn, comp } = mountIt({ modelValue: seed(), readonly: true })
    expect(w.find('[role="radiogroup"]').exists()).toBe(false)
    expect(layer().attributes('tabindex')).toBe('-1')
    await fire(layer().element, 'pointerdown', { clientX: 10, clientY: 10 })
    await fire(layer().element, 'pointerup', { clientX: 10, clientY: 10 })
    await fire(markBtn(1).element, 'pointerdown', { clientX: 200, clientY: 100 })
    await fire(markBtn(1).element, 'pointermove', { clientX: 300, clientY: 150 })
    await markBtn(1).trigger('keydown', { key: 'Delete' })
    expect(model.value).toEqual(seed())
    expect(comp().emitted('select')![0]).toEqual(['d1'])
    expect(w.find('ol li input').attributes('readonly')).toBeDefined()
    await w.find('ol li input').trigger('change')
    expect(comp().emitted('update:modelValue')).toBeUndefined()
    expect(w.findAll('button[aria-label^="刪除第"]')).toHaveLength(0)
  })

  it('沒有 defectTypes 時只有一種「缺陷」；showList=false', async () => {
    const { w, model, layer, typeChips } = mountIt({ defectTypes: undefined, showList: false })
    expect(typeChips().map((r) => r.text().replace(/\s+/g, ' '))).toEqual(['缺陷 0'])
    expect(w.find('ol').exists()).toBe(false)
    await fire(layer().element, 'pointerdown', { clientX: 10, clientY: 10 })
    await fire(layer().element, 'pointerup', { clientX: 10, clientY: 10 })
    expect(model.value[0].type).toBe('defect')
  })

  it('外部拿掉選取中的標記時取消選取；ref.select()', async () => {
    const { model, comp, markBtn } = mountIt({ modelValue: seed() })
    const api = comp().vm as unknown as { select: (id: string | null) => void }
    api.select('d2')
    expect(document.activeElement).toBe(markBtn(2).element)
    model.value = [seed()[0]]
    await nextTick()
    expect(comp().emitted('select')!.at(-1)).toEqual([null])
    api.select('d1')
    api.select(null)
    expect(comp().emitted('select')!.at(-1)).toEqual([null])
  })

  it('未知類型顯示灰色並排在最後', () => {
    const { markBtn, typeChips } = mountIt({ modelValue: [{ id: 'x', x: 0.1, y: 0.1, type: 'other' }] })
    expect(markBtn(1).attributes('style')).toContain('background: rgb(107, 114, 128)')
    expect(typeChips().at(-1)!.text()).toContain('other')
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptDefectAnnotator, { src: 'a.png', modelValue: seed(), defectTypes: types })) }, { attachTo: document.body })
    mounted.push(w)
    expect(w.find('[role="group"]').attributes('aria-label')).toBe('Defect annotation area')
    expect(w.text()).toContain('2 total')
    expect(w.find('[role="group"] button').attributes('aria-label')).toBe('#1: 短路, 錫橋')
  })
})
