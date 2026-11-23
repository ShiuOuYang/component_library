import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptDiffViewer from '@/components/library/ui/ChptDiffViewer.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

const A = {
  revision: 3,
  oven: { profile: 'std', speed: 85, zones: [{ temp: 150 }, { temp: 175 }, { temp: 220 }] },
  printer: { pressure: 6.5, clean: 5 },
  nozzles: ['N1'],
}
const B = {
  revision: 4,
  oven: { profile: 'lowvoid', speed: 85, zones: [{ temp: 150 }, { temp: 176 }, { temp: 228 }] },
  printer: { pressure: 6.5 },
  nozzles: ['N1', 'N2'],
}

/** 列裡所有文字節點以空白連起來（儲存格之間沒有空白） */
function words(el: Element): string {
  const out: string[] = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const t = walker.currentNode.textContent!.replace(/\s+/g, ' ').trim()
    if (t) out.push(t)
  }
  return out.join(' ')
}

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

function mountIt(props: Record<string, unknown> = {}, opts: { width?: number; wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h> } = {}) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(opts.width ?? 900)
  const onlyDiff = ref(props.onlyDiff as boolean | undefined)
  const events: boolean[] = []
  const node = () =>
    h(ChptDiffViewer, {
      left: A,
      right: B,
      tolerances: { 'oven.zones[*].temp': 2 },
      units: { 'oven.zones[*].temp': '°C' },
      labels: { 'printer.pressure': '刮刀壓力' },
      ...props,
      ...(onlyDiff.value === undefined ? {} : { onlyDiff: onlyDiff.value }),
      'onUpdate:onlyDiff': (v: boolean) => (events.push(v), (onlyDiff.value = v)),
    })
  const w = mount({ render: () => (opts.wrap ? opts.wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const lines = () => w.findAll('tbody tr').map((r) => words(r.element))
  const chip = (label: string) => w.find('[role="group"]').findAll('button').find((b) => b.text().includes(label))!
  const group = (key: string) => w.findAll('tbody th button').find((b) => words(b.element).startsWith(`chevron_right ${key} `))!
  return { w, lines, chip, group, events, onlyDiff }
}

describe('ChptDiffViewer', () => {
  it('預設只顯示差異：樹狀、群組標出幾處不同、數值差值與百分比、單位、容許內', () => {
    const { lines } = mountIt()
    expect(lines()).toEqual([
      'change_circle revision 3 4 +1 (+33.3%)',
      'chevron_right oven 2 處不同',
      'change_circle profile "std" "lowvoid" 變更',
      'chevron_right zones 1 處不同',
      'check_circle [1].temp 175 °C 176 °C +1 °C (+0.6%) 容許內',
      'change_circle [2].temp 220 °C 228 °C +8 °C (+3.6%)',
      'chevron_right printer 1 處不同',
      'remove_circle clean 5 — 刪除',
      'chevron_right nozzles 1 處不同',
      'add_circle [1] — "N2" 新增',
    ])
  })

  it('摘要數量；點了只看該狀態（覆蓋「只顯示差異」）', async () => {
    const { w, chip, lines } = mountIt()
    expect(w.find('[role="group"]').findAll('button').map((b) => b.text().replace(/\s+/g, ''))).toEqual([
      'change_circle變更3',
      'add_circle新增1',
      'remove_circle刪除1',
      'check_circle容許內1',
      'radio_button_unchecked相同4',
    ])
    await chip('相同').trigger('click')
    expect(chip('相同').attributes('aria-pressed')).toBe('true')
    expect(lines().filter((l) => l.startsWith('radio_button_unchecked'))).toHaveLength(4)
    expect(lines().some((l) => l.startsWith('change_circle'))).toBe(false)
    // 狀態篩選時「只顯示差異」停用
    expect(w.find('[role="switch"]').attributes('aria-disabled') ?? w.find('[role="switch"]').attributes('disabled')).toBeDefined()
    await chip('相同').trigger('click')
    expect(lines()).toHaveLength(10)
  })

  it('只顯示差異：切換、送出 update:onlyDiff；外部改變時同步', async () => {
    const { w, events, lines, onlyDiff } = mountIt()
    await w.find('[role="switch"]').trigger('click')
    expect(events).toEqual([false])
    await nextTick()
    expect(lines()).toHaveLength(14)
    expect(lines()).toContain('radio_button_unchecked pressure 刮刀壓力 6.5 6.5')
    onlyDiff.value = true
    await nextTick()
    expect(lines()).toHaveLength(10)
  })

  it('摺疊 / 展開群組；全部摺疊、全部展開', async () => {
    const { w, group, lines } = mountIt()
    expect(group('oven').attributes('aria-expanded')).toBe('true')
    await group('oven').trigger('click')
    expect(group('oven').attributes('aria-expanded')).toBe('false')
    expect(lines()).toHaveLength(6)
    await group('oven').trigger('click')
    expect(lines()).toHaveLength(10)
    await w.findAll('button').find((b) => b.text().includes('全部摺疊'))!.trigger('click')
    expect(lines()).toEqual(['change_circle revision 3 4 +1 (+33.3%)', 'chevron_right oven 2 處不同', 'chevron_right printer 1 處不同', 'chevron_right nozzles 1 處不同'])
    await w.findAll('button').find((b) => b.text().includes('全部展開'))!.trigger('click')
    expect(lines()).toHaveLength(10)
  })

  it('defaultExpandDepth：預設只展開幾層', () => {
    const { lines } = mountIt({ defaultExpandDepth: 1 })
    expect(lines()).toContain('chevron_right zones 1 處不同')
    expect(lines().some((l) => l.includes('[1].temp'))).toBe(false)
  })

  it('搜尋：路徑、顯示名稱、值；搜尋時忽略摺疊；沒結果時顯示提示', async () => {
    const { w, group, lines } = mountIt({ onlyDiff: false })
    await group('oven').trigger('click')
    const input = w.find('input[type="search"]')
    await input.setValue('ZONES')
    expect(lines()).toEqual([
      'chevron_right oven 2 處不同',
      'chevron_right zones 1 處不同',
      'radio_button_unchecked [0].temp 150 °C 150 °C',
      'check_circle [1].temp 175 °C 176 °C +1 °C (+0.6%) 容許內',
      'change_circle [2].temp 220 °C 228 °C +8 °C (+3.6%)',
    ])
    await input.setValue('刮刀')
    expect(lines()).toHaveLength(2)
    await input.setValue('lowvoid')
    expect(lines()).toHaveLength(2)
    await input.setValue('zzz')
    expect(lines()).toEqual(['沒有符合條件的參數'])
  })

  it('兩邊相同、沒有參數時的提示', () => {
    expect(mountIt({ left: { a: 1 }, right: { a: 1 } }).lines()).toEqual(['兩邊完全相同'])
    expect(mountIt({ left: {}, right: {} }).lines()).toEqual(['沒有參數'])
  })

  it('列的樣式：變更 / 新增 / 刪除有色條；容許內、相同沒有', () => {
    const { w } = mountIt()
    const rows = w.findAll('tbody tr')
    expect((rows[0].element as HTMLElement).style.boxShadow).toContain('warning-solid')
    expect((rows[4].element as HTMLElement).style.boxShadow).toBe('')
    expect(rows[7].find('td').classes()).toContain('line-through')
    expect(rows[9].findAll('td')[1].classes()).toContain('font-semibold')
  })

  it('欄位標題：自訂或語系', () => {
    expect(mountIt({ leftLabel: 'v3', rightLabel: 'v4' }).w.findAll('thead th').map((t) => t.text())).toEqual(['參數', 'v3', 'v4', '差異'])
    expect(mountIt().w.findAll('thead th').map((t) => t.text())).toEqual(['參數', '基準', '比對', '差異'])
  })

  it('窄畫面：兩欄（基準 → 比對），差異在下方', async () => {
    const { w, lines } = mountIt({}, { width: 400 })
    await nextTick()
    expect(w.findAll('thead th').map((t) => t.text())).toEqual(['參數', '基準 → 比對'])
    expect(lines()[0]).toBe('change_circle revision 3 → 4 +1 (+33.3%)')
    expect(lines()[7]).toBe('remove_circle clean 5 → — 刪除')
    expect(w.findAll('tbody tr')[1].find('th').attributes('colspan')).toBe('2')
  })

  it('沒有百分比（左邊是 0）、負的差值', () => {
    const { lines } = mountIt({ left: { a: 0, b: 10 }, right: { a: 2, b: 7.5 } })
    expect(lines()).toEqual(['change_circle a 0 2 +2', 'change_circle b 10 7.5 −2.5 (−25%)'])
  })

  it('方法：rows、expandAll、collapseAll', async () => {
    const { w, lines } = mountIt()
    const vm = w.findComponent(ChptDiffViewer).vm as unknown as { rows: Array<{ path: string }>; collapseAll: () => void; expandAll: () => void }
    expect(vm.rows).toHaveLength(10)
    vm.collapseAll()
    await nextTick()
    expect(lines()).toHaveLength(4)
    vm.expandAll()
    await nextTick()
    expect(lines()).toHaveLength(10)
  })

  it('英文語系', () => {
    const { w, lines } = mountIt({}, { wrap: (n) => h(ChptConfigProvider, { locale: enUS }, () => n) })
    expect(w.findAll('thead th').map((t) => t.text())).toEqual(['Parameter', 'Reference', 'Compared', 'Difference'])
    expect(lines()[1]).toBe('chevron_right oven 2 differences')
    expect(lines()[4]).toContain('Within tolerance')
  })
})
