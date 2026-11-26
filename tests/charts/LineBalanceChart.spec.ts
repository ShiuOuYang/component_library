import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import LineBalanceChart from '@/components/library/charts/LineBalanceChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { LbElement, LbStation } from '@/components/library/charts/utils/lineBalance'

const stations: LbStation[] = [
  { id: 'a', name: '投板' },
  { id: 'b', name: '鎖螺絲' },
  { id: 'c', name: '測試', operators: 2 },
  { id: 'd', name: '空站' },
]
const base = (): LbElement[] => [
  { id: '1', name: '取板', station: 'a', time: 10, kind: 'move' },
  { id: '2', name: '放治具', station: 'a', time: 15, kind: 'work' },
  { id: '3', name: '鎖外殼', station: 'b', time: 40, kind: 'work' },
  { id: '4', name: '扭力確認', station: 'b', time: 12, kind: 'check' },
  { id: '5', name: '功能測試', station: 'c', time: 70, kind: 'check' },
  { id: '6', name: '未知分類', station: 'c', time: 10, kind: 'zzz' },
]
const kinds = [
  { key: 'work', label: '加工' },
  { key: 'move', label: '搬運', color: 'rgb(1, 2, 3)' },
  { key: 'check', label: '檢查' },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const elements = ref<LbElement[]>((props.elements as LbElement[]) ?? base())
  const events: { name: string; args: unknown[] }[] = []
  const on = (name: string) => (...args: unknown[]) => events.push({ name, args })
  const node = () =>
    h(LineBalanceChart, {
      stations,
      kinds,
      takt: 45,
      width: 600,
      height: 300,
      ...props,
      elements: elements.value,
      'onUpdate:elements': (v: LbElement[]) => (elements.value = v),
      onMove: on('move'),
      onElementClick: on('element-click'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const seg = (name: string) => w.findAll('g[role="button"]').find((g) => g.attributes('aria-label')!.startsWith(name))!
  const of = (name: string) => events.filter((e) => e.name === name).map((e) => e.args)
  return { w, elements, seg, of }
}

const pointer = (type: string, init: { x?: number; y?: number; button?: number } = {}) => {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    clientX: { value: init.x ?? 0 },
    clientY: { value: init.y ?? 0 },
    button: { value: init.button ?? 0 },
    pointerId: { value: 1 },
  })
  return e
}

describe('LineBalanceChart', () => {
  it('摘要：節拍、瓶頸、平衡率、總工時、人數、超過節拍', () => {
    const { w } = mountIt({ title: '組裝線' })
    const head = w.find('.line-balance-chart > div').text()
    expect(head).toContain('組裝線')
    expect(head).toContain('節拍 45')
    expect(head).toContain('瓶頸 鎖螺絲（52）')
    // 總工時 157、人數 5、瓶頸 52 → 157 / 260
    expect(head).toContain('平衡率 60.4%')
    expect(head).toContain('總工時 157')
    expect(head).toContain('人數 5（理論最少 4）')
    expect(head).toContain('1 站超過節拍')
    expect(w.find('svg').attributes('aria-label')).toBe('組裝線：4 站，瓶頸 鎖螺絲，平衡率 60.4%')
  })

  it('長條：每個作業元素一段、多人站高度除以人數、週期標籤、超過節拍標紅、站名與人數', () => {
    const { w, seg } = mountIt()
    expect(w.findAll('g[role="button"]')).toHaveLength(6)
    const h = (name: string) => Number(seg(name).find('rect').attributes('height'))
    // 功能測試 70 / 2 人 = 35；鎖外殼 40
    expect(h('功能測試') / h('鎖外殼')).toBeCloseTo(35 / 40)
    const texts = w.findAll('svg text').map((t) => t.text())
    expect(texts).toContain('52')
    expect(texts).toContain('40')
    expect(texts).toContain('2 人')
    expect(texts).toContain('節拍 45')
    const over = w.findAll('svg text').find((t) => t.text() === '52')!
    // 文字用文字色（深色模式會變亮），不用 danger-solid 填色
    expect(over.attributes('style')).toContain('--t-danger)')
    // 分類色：自訂顏色、未知分類用「其他」色
    expect(seg('取板').find('rect').attributes('style')).toContain('rgb(1, 2, 3)')
    expect(seg('未知分類').find('rect').attributes('style')).toContain('stroke-dark')
    expect(seg('鎖外殼').attributes('aria-label')).toBe('鎖外殼，40 s，鎖螺絲，加工')
    // 隱藏的資料表
    const rows = w.findAll('table tbody tr').map((r) => r.text())
    expect(rows[1]).toContain('超過節拍')
    expect(rows[0]).toContain('正常')
    // 圖例
    expect(w.text()).toContain('搬運')
  })

  it('沒有 kinds 時同色、沒有節拍時不畫節拍線與狀態欄；平均線', () => {
    const { w, seg } = mountIt({ kinds: [], takt: null, showAverage: true })
    expect(seg('取板').find('rect').attributes('style')).toContain('chart-1')
    expect(w.text()).not.toContain('節拍')
    expect(w.text()).toContain('人數 5')
    expect(w.text()).toContain('平均 31.4')
    expect(w.findAll('table thead th')).toHaveLength(4)
  })

  it('提示：滑過或聚焦作業元素', async () => {
    const { w, seg } = mountIt()
    await seg('鎖外殼').trigger('mouseenter')
    const tip = w.find('.pointer-events-none.absolute')
    expect(tip.text()).toContain('鎖外殼')
    expect(tip.text()).toContain('40 s')
    expect(tip.text()).toContain('加工')
    expect(tip.text()).toContain('鎖螺絲 週期 52 s')
    await w.find('svg').trigger('mouseleave')
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
    await seg('功能測試').trigger('focus')
    expect(w.find('.pointer-events-none.absolute').text()).toContain('測試 週期 40 s')
    await seg('功能測試').trigger('blur')
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
  })

  it('點擊與 Enter（不可拖曳時）送出 element-click', async () => {
    const { seg, of } = mountIt()
    await seg('取板').trigger('click')
    await seg('放治具').trigger('keydown', { key: 'Enter' })
    expect(of('element-click').map((a) => [(a[0] as LbElement).id, (a[1] as LbStation).id])).toEqual([
      ['1', 'a'],
      ['2', 'a'],
    ])
    // 不可拖曳時 pointerdown 不會開始拖曳
    seg('取板').element.dispatchEvent(pointer('pointerdown'))
    await seg('取板').trigger('click')
    expect(of('element-click')).toHaveLength(3)
  })

  it('拖曳到別站：預覽、放開後更新 elements 並送出 move；拖曳不算點擊', async () => {
    const { w, seg, elements, of } = mountIt({ draggable: true })
    const svg = w.find('svg').element as SVGSVGElement
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: 600, bottom: 300, width: 600, height: 300, x: 0, y: 0, toJSON: () => ({}) })
    // 「鎖外殼」拖到最後一站（右邊）
    seg('鎖外殼').element.dispatchEvent(pointer('pointerdown', { x: 200, y: 150 }))
    svg.dispatchEvent(pointer('pointermove', { x: 201, y: 150 })) // 還沒超過門檻
    await nextTick()
    expect(w.find('rect[data-export-ignore]').exists()).toBe(false)
    svg.dispatchEvent(pointer('pointermove', { x: 560, y: 150 }))
    await nextTick()
    expect(w.find('rect[data-export-ignore]').exists()).toBe(true)
    // 預覽：鎖螺絲只剩 12
    expect(w.findAll('svg text').map((t) => t.text())).toContain('12')
    svg.dispatchEvent(pointer('pointerup', { x: 560, y: 150 }))
    await nextTick()
    expect(elements.value.find((e) => e.id === '3')!.station).toBe('d')
    expect(of('move')[0][0]).toMatchObject({ element: { id: '3', station: 'd' }, from: 'b', to: 'd' })
    await seg('鎖外殼').trigger('click')
    expect(of('element-click')).toHaveLength(0)
    expect(w.find('[aria-live="polite"]').text()).toBe('鎖外殼 已移到 空站')
    // 之後的點擊照常
    await seg('鎖外殼').trigger('click')
    expect(of('element-click')).toHaveLength(1)
    // 拖回同一站、沒移動就放開、取消、右鍵
    seg('取板').element.dispatchEvent(pointer('pointerdown', { x: 90, y: 150 }))
    svg.dispatchEvent(pointer('pointermove', { x: 95, y: 170 }))
    svg.dispatchEvent(pointer('pointerup', { x: 95, y: 170 }))
    seg('取板').element.dispatchEvent(pointer('pointerdown', { x: 90, y: 150 }))
    svg.dispatchEvent(pointer('pointerup', { x: 90, y: 150 }))
    seg('取板').element.dispatchEvent(pointer('pointerdown', { x: 90, y: 150 }))
    svg.dispatchEvent(pointer('pointercancel'))
    seg('取板').element.dispatchEvent(pointer('pointerdown', { x: 90, y: 150, button: 2 }))
    svg.dispatchEvent(pointer('pointermove', { x: 500, y: 150 }))
    svg.dispatchEvent(pointer('pointerup', { x: 500, y: 150 }))
    await nextTick()
    expect(of('move')).toHaveLength(1)
  })

  it('鍵盤：方向鍵移動焦點；拿起、換站、放下、取消', async () => {
    const { w, seg, elements, of } = mountIt({ draggable: true })
    const focused = () => document.activeElement?.getAttribute('aria-label')?.split('，')[0]
    expect(seg('取板').attributes('tabindex')).toBe('0')
    ;(seg('取板').element as SVGGElement).focus()
    await seg('取板').trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(focused()).toBe('放治具')
    await seg('放治具').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(focused()).toBe('取板')
    await seg('取板').trigger('keydown', { key: 'ArrowDown' }) // 最下面：不動
    await seg('放治具').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(focused()).toBe('扭力確認')
    await seg('功能測試').trigger('keydown', { key: 'ArrowRight' }) // 右邊是空站：不動
    await seg('功能測試').trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(focused()).toBe('鎖外殼')
    await seg('功能測試').trigger('keydown', { key: 'x' })
    // 拿起「扭力確認」→ 右 → 右 → 放下
    await seg('扭力確認').trigger('keydown', { key: 'Enter' })
    expect(seg('扭力確認').attributes('aria-pressed')).toBe('true')
    expect(w.find('[aria-live="polite"]').text()).toContain('已拿起 扭力確認')
    await seg('扭力確認').trigger('keydown', { key: 'ArrowRight' })
    await seg('扭力確認').trigger('keydown', { key: 'ArrowRight' })
    await seg('扭力確認').trigger('keydown', { key: 'ArrowRight' }) // 已在最右：停在最後一站
    expect(w.find('[aria-live="polite"]').text()).toBe('扭力確認 → 空站')
    expect(elements.value.find((e) => e.id === '4')!.station).toBe('b') // 還沒放下
    await seg('扭力確認').trigger('keydown', { key: 'ArrowDown' }) // 拿起中其他鍵不處理
    await seg('扭力確認').trigger('keydown', { key: ' ' })
    expect(elements.value.find((e) => e.id === '4')!.station).toBe('d')
    expect(of('move')).toHaveLength(1)
    // 拿起後 Esc 取消
    await seg('取板').trigger('keydown', { key: ' ' })
    await seg('取板').trigger('keydown', { key: 'ArrowRight' })
    await seg('取板').trigger('keydown', { key: 'Escape' })
    expect(elements.value.find((e) => e.id === '1')!.station).toBe('a')
    expect(w.find('[aria-live="polite"]').text()).toBe('已取消')
    // 拿起後放回原站
    await seg('取板').trigger('keydown', { key: 'Enter' })
    await seg('取板').trigger('keydown', { key: 'Enter' })
    expect(of('move')).toHaveLength(1)
  })

  it('沒有工站；作業元素被換掉時焦點落到第一個', async () => {
    expect(mountIt({ stations: [] }).w.text()).toContain('沒有工站')
    const { seg, elements } = mountIt()
    elements.value = [{ id: 'n1', name: '新元素', station: 'b', time: 5 }]
    await nextTick()
    expect(seg('新元素').attributes('tabindex')).toBe('0')
  })

  it('valueFormat、unit 空白、英文語系', () => {
    const { w } = mountIt({ valueFormat: (v: number) => `${v.toFixed(1)}`, unit: '' }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    const head = w.find('.line-balance-chart > div').text()
    expect(head).toContain('Takt 45.0')
    expect(head).toContain('Bottleneck 鎖螺絲 (52.0)')
    expect(head).toContain('5 operators (min 4)')
    expect(w.findAll('svg text').map((t) => t.text())).toContain('×2')
  })
})
