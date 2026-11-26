import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptFishbone from '@/components/library/ui/ChptFishbone.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import { findCause, type FishboneData, type FishCause } from '@/components/library/shared/fishbone'

const base = (): FishboneData => ({
  problem: '錫橋',
  categories: [
    { id: 'man', label: '人員', causes: [{ id: 'a', text: '未擦鋼板', verified: true, children: [{ id: 'a1', text: '新人', children: [{ id: 'a11', text: '教育訓練不足' }] }] }] },
    { id: 'machine', label: '機器', causes: [{ id: 'b', text: '刮刀磨損', primary: true, note: '缺口 0.3 mm' }, { id: 'c', text: '爐溫', ruledOut: true }] },
    { id: 'method', label: '方法', causes: [] },
  ],
})

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const model = ref<FishboneData | undefined>('modelValue' in props ? (props.modelValue as FishboneData | undefined) : base())
  const emitted: Record<string, unknown[]> = {}
  const node = () =>
    h(ChptFishbone, {
      editable: true,
      ...props,
      modelValue: model.value,
      'onUpdate:modelValue': (v: FishboneData) => ((emitted.model ??= []).push(v), (model.value = v)),
      onSelect: (id: string | null) => (emitted.select ??= []).push(id),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const cause = (id: string) => w.find(`[data-cause="${id}"]`)
  const cat = (id: string) => w.find(`[data-category="${id}"]`)
  const vm = () => w.findComponent(ChptFishbone).vm as unknown as {
    value: () => FishboneData
    outline: () => string
    addCause: (p: string, t: string) => string | null
    removeCause: (id: string) => void
    updateCause: (id: string, p: Partial<FishCause>) => void
    select: (id: string | null) => void
  }
  const get = (id: string) => findCause(model.value!, id)?.cause
  return { w, model, emitted, cause, cat, vm, get }
}
const active = () => document.activeElement?.getAttribute('data-cause') ?? document.activeElement?.getAttribute('data-category')

describe('ChptFishbone', () => {
  it('分類、原因、標記、樹狀屬性、摘要、魚頭', () => {
    const { w, cause, cat } = mountIt()
    expect(w.find('[data-summary]').text()).toBe('3 個分類、5 個原因，主要原因 1 個，已驗證 1 個')
    expect(w.findAll('[data-category]').map((c) => c.text())).toEqual(['人員', '機器', '方法'])
    expect(w.findAll('[data-cause]').map((c) => c.attributes('data-cause'))).toEqual(['a', 'a1', 'a11', 'b', 'c'])
    expect(cat('man').attributes()).toMatchObject({ role: 'treeitem', 'aria-level': '1', tabindex: '0', 'aria-label': '人員，3 個原因' })
    expect(cause('a11').attributes('aria-level')).toBe('4')
    expect(cause('b').attributes('aria-label')).toBe('刮刀磨損，主要原因，缺口 0.3 mm')
    expect(cause('b').find('[data-mark="primary"]').exists()).toBe(true)
    expect(cause('a').find('[data-mark="verified"]').exists()).toBe(true)
    expect(cause('c').find('.line-through').exists()).toBe(true)
    expect(cause('b').attributes('title')).toBe('刮刀磨損\n缺口 0.3 mm')
    expect(w.find('[data-head]').text()).toBe('錫橋')
    expect(w.find('[data-head]').attributes('aria-label')).toBe('問題：錫橋')
    // 第三層原因不能再加子原因
    expect(cause('a11').find('[data-add]').exists()).toBe(false)
    expect(cause('a1').find('[data-add]').exists()).toBe(true)
    expect(w.findAll('line').length).toBeGreaterThan(8)
  })

  it('沒給 v-model：5M1E 預設分類；英文語系', () => {
    const { w } = mountIt({ modelValue: undefined })
    expect(w.findAll('[data-category]').map((c) => c.text())).toEqual(['人員', '機器', '材料', '方法', '環境', '量測'])
    expect(w.find('[data-head]').text()).toBe('（點兩下輸入問題）')
    const en = mountIt({ modelValue: undefined }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.findAll('[data-category]').map((c) => c.text())).toEqual(['Man', 'Machine', 'Material', 'Method', 'Environment', 'Measurement'])
    expect(en.w.find('[data-summary]').text()).toBe('6 categories, 0 causes')
  })

  it('點選：工具列、select 事件；新增原因（+ 按鈕）→ 編輯 → Enter', async () => {
    const { w, cause, emitted, model } = mountIt()
    await cause('b').trigger('click')
    expect(emitted.select).toEqual(['b'])
    expect(w.find('[data-toolbar]').text()).toContain('選取：刮刀磨損')
    expect(w.find('[data-action="primary"]').attributes('aria-pressed')).toBe('true')
    await w.find('[data-add="method"]').trigger('click')
    await nextTick()
    const input = w.find('[data-editor]')
    expect(document.activeElement).toBe(input.element)
    await input.setValue('  鋼板開孔 1:1  ')
    await input.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(model.value!.categories[2].causes.map((c) => c.text)).toEqual(['鋼板開孔 1:1'])
    expect(w.find('[data-editor]').exists()).toBe(false)
    expect(w.find('[data-live]').text()).toBe('已新增「鋼板開孔 1:1」')
    const id = model.value!.categories[2].causes[0].id
    await nextTick()
    expect(active()).toBe(id)
    // 新增後空白就取消新增
    await w.find('[data-add="method"]').trigger('click')
    await nextTick()
    await w.find('[data-editor]').setValue('   ')
    await w.find('[data-editor]').trigger('keydown', { key: 'Enter' })
    expect(model.value!.categories[2].causes).toHaveLength(1)
    // Esc 取消新增
    await cause(id).find('[data-add]').trigger('click')
    await nextTick()
    await w.find('[data-editor]').trigger('keydown', { key: 'Escape' })
    expect(findCause(model.value!, id)!.cause.children).toEqual([])
  })

  it('編輯：雙擊原因、分類名稱、魚頭；空白不改原文字；blur 送出', async () => {
    const { w, cause, cat, get, model } = mountIt()
    await cause('a').trigger('dblclick')
    await nextTick()
    const input = w.find('[data-editor]')
    expect((input.element as HTMLInputElement).value).toBe('未擦鋼板')
    await input.setValue('未依 SOP 擦鋼板')
    await input.trigger('blur')
    expect(get('a')!.text).toBe('未依 SOP 擦鋼板')
    await cause('a').trigger('dblclick')
    await nextTick()
    await w.find('[data-editor]').setValue('')
    await w.find('[data-editor]').trigger('keydown', { key: 'Enter' })
    expect(get('a')!.text).toBe('未依 SOP 擦鋼板')
    await cause('a').trigger('dblclick')
    await nextTick()
    await w.find('[data-editor]').trigger('keydown', { key: 'Escape' })
    expect(get('a')!.text).toBe('未依 SOP 擦鋼板')
    await cat('man').trigger('dblclick')
    await nextTick()
    await w.find('[data-editor]').setValue('作業員')
    await w.find('[data-editor]').trigger('keydown', { key: 'Enter' })
    expect(model.value!.categories[0].label).toBe('作業員')
    await w.find('[data-head]').trigger('dblclick')
    await nextTick()
    expect(w.find('[data-editor]').attributes('aria-label')).toBe('問題')
    await w.find('[data-editor]').setValue('QFP 錫橋 1.8%')
    await w.find('[data-editor]').trigger('keydown', { key: 'Enter' })
    expect(model.value!.problem).toBe('QFP 錫橋 1.8%')
    await w.find('[data-head]').trigger('keydown', { key: 'Enter' })
    await nextTick()
    await w.find('[data-editor]').trigger('keydown', { key: 'Escape' })
    expect(model.value!.problem).toBe('QFP 錫橋 1.8%')
    // 工具列的編輯
    await cat('machine').trigger('click')
    expect(w.find('[data-action="edit"]').text()).toContain('編輯分類名稱')
    await w.find('[data-action="edit"]').trigger('click')
    await nextTick()
    await w.find('[data-editor]').trigger('keydown', { key: 'Enter' })
    expect(model.value!.categories[1].label).toBe('機器')
  })

  it('標記（工具列與 P / V / X）：主要原因與已排除互斥；刪除', async () => {
    const { w, cause, get, model } = mountIt()
    await cause('c').trigger('click')
    await w.find('[data-action="primary"]').trigger('click')
    expect(get('c')).toMatchObject({ primary: true, ruledOut: false })
    expect(w.find('[data-live]').text()).toBe('已標記為主要原因')
    await cause('c').trigger('keydown', { key: 'x' })
    expect(get('c')).toMatchObject({ primary: false, ruledOut: true })
    await cause('c').trigger('keydown', { key: 'v' })
    expect(get('c')!.verified).toBe(true)
    await cause('c').trigger('keydown', { key: 'v' })
    expect(w.find('[data-live]').text()).toBe('已取消已驗證')
    await cause('c').trigger('keydown', { key: 'p' })
    expect(get('c')!.primary).toBe(true)
    // 刪除：焦點移到前一個
    await w.find('[data-action="remove"]').trigger('click')
    await nextTick()
    expect(get('c')).toBeUndefined()
    expect(w.find('[data-live]').text()).toBe('已刪除「爐溫」')
    expect(active()).toBe('b')
    await cause('b').trigger('keydown', { key: 'Delete' })
    await nextTick()
    expect(model.value!.categories[1].causes).toEqual([])
    expect(active()).toBe('machine')
    // 分類不能刪；工具列沒有刪除鈕
    await w.find('[data-category="machine"]').trigger('keydown', { key: 'Delete' })
    expect(model.value!.categories).toHaveLength(3)
    expect(w.find('[data-action="remove"]').exists()).toBe(false)
  })

  it('鍵盤：↑↓ 依序、←→ 上下層、Home / End、Insert 新增次要原因、空白鍵選取', async () => {
    const { cause, cat, model, emitted, w } = mountIt()
    cat('man').element.focus()
    await cat('man').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(active()).toBe('a')
    await cause('a').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(active()).toBe('a1')
    await cause('a1').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(active()).toBe('a11')
    await cause('a11').trigger('keydown', { key: 'ArrowRight' }) // 沒有下層
    await cause('a11').trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(active()).toBe('a1')
    await cause('a1').trigger('keydown', { key: 'ArrowUp' })
    await cause('a').trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(active()).toBe('man')
    await cat('man').trigger('keydown', { key: 'End' })
    await nextTick()
    expect(active()).toBe('method')
    await cat('method').trigger('keydown', { key: 'ArrowRight' }) // 空分類
    await cat('method').trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(active()).toBe('man')
    await cat('man').trigger('keydown', { key: ' ' })
    expect(emitted.select).toEqual(['man'])
    await cause('a1').trigger('keydown', { key: 'Insert' })
    await nextTick()
    await w.find('[data-editor]').setValue('新進未訓練')
    // 編輯中按方向鍵不移動
    await cause('a1').trigger('keydown', { key: 'ArrowDown' })
    await w.find('[data-editor]').trigger('keydown', { key: 'Enter' })
    expect(findCause(model.value!, 'a1')!.cause.children!.map((c) => c.text)).toEqual(['教育訓練不足', '新進未訓練'])
    await cause('a11').trigger('keydown', { key: '+' }) // 第三層不能再加
    expect(w.find('[data-editor]').exists()).toBe(false)
    await cause('a11').trigger('keydown', { key: 'q' })
    // F2 編輯
    await cause('a').trigger('keydown', { key: 'F2' })
    await nextTick()
    expect(w.find('[data-editor]').exists()).toBe(true)
  })

  it('唯讀：沒有新增鈕與工具列，Enter 只選取，按鍵不改資料', async () => {
    const { w, cause, emitted } = mountIt({ editable: false })
    expect(w.find('[data-add]').exists()).toBe(false)
    await cause('a').trigger('click')
    expect(w.find('[data-toolbar]').exists()).toBe(false)
    await cause('a').trigger('keydown', { key: 'Enter' })
    await cause('a').trigger('keydown', { key: 'Delete' })
    await cause('a').trigger('keydown', { key: 'p' })
    await cause('a').trigger('dblclick')
    await w.find('[data-head]').trigger('dblclick')
    expect(w.find('[data-editor]').exists()).toBe(false)
    expect(emitted.model).toBeUndefined()
    expect(w.find('p.sr-only').text()).toContain('上下方向鍵依序瀏覽分類與原因')
  })

  it('ref 方法、外部改 v-model、選取的項目被刪掉時清掉', async () => {
    const { vm, model, w, cause } = mountIt()
    const id = vm().addCause('method', '外部新增')!
    expect(model.value!.categories[2].causes[0].text).toBe('外部新增')
    expect(vm().addCause('a11', 'x')).toBeNull()
    vm().updateCause(id, { verified: true })
    expect(findCause(model.value!, id)!.cause.verified).toBe(true)
    expect(vm().outline()).toContain('外部新增 ✓')
    vm().select('b')
    await nextTick()
    expect(cause('b').attributes('aria-selected')).toBe('true')
    vm().removeCause('b')
    await nextTick()
    expect(w.find('[data-toolbar]').exists()).toBe(false)
    vm().select(null)
    model.value = { problem: '換一個', categories: [{ id: 'x', label: 'X', causes: [] }] }
    await nextTick()
    expect(w.find('[data-head]').text()).toBe('換一個')
    expect(vm().value().categories).toHaveLength(1)
  })
})
