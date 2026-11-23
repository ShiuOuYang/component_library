import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptStorageMap from '@/components/library/ui/ChptStorageMap.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { StorageBin, StorageStock } from '@/components/library/shared/storage'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 0, 10)
const bins: StorageBin[] = [
  { id: 'A-1-1', zone: 'A 區', rack: 'A-01', level: 1, position: 1, capacity: 100 },
  { id: 'A-1-2', zone: 'A 區', rack: 'A-01', level: 1, position: 2, capacity: 100 },
  { id: 'A-2-1', zone: 'A 區', rack: 'A-01', level: 2, position: 1, capacity: 100 },
  { id: 'A-2-2', zone: 'A 區', rack: 'A-01', level: 2, position: 2, capacity: 100, blocked: true },
  { id: 'B-1-1', zone: 'B 區', rack: 'B-01', level: 1, position: 1 },
  { id: 'B-1-3', zone: 'B 區', rack: 'B-01', level: 1, position: 3, capacity: 50 },
]
const baseStocks = (): StorageStock[] => [
  { id: 's1', bin: 'A-1-1', item: 'PCB', name: '主板', qty: 60, unit: 'pcs', lot: 'L1', expiry: NOW + 100 * DAY },
  { id: 's2', bin: 'A-1-1', item: 'IC', qty: 10, expiry: NOW + 5 * DAY },
  { id: 's3', bin: 'A-2-1', item: 'PCB', qty: 120, expiry: NOW - 2 * DAY },
  { id: 's4', bin: 'B-1-1', item: 'GLUE', qty: 7 },
]

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const stocks = ref<StorageStock[]>((props.stocks as StorageStock[]) ?? baseStocks())
  const mode = ref((props.mode as string) ?? 'utilization')
  const selected = ref<string | null>((props.selected as string | null) ?? null)
  const events: { name: string; payload: unknown }[] = []
  const on = (name: string) => (payload: unknown) => events.push({ name, payload })
  const node = () =>
    h(ChptStorageMap, {
      bins,
      now: NOW,
      ...props,
      stocks: stocks.value,
      mode: mode.value,
      selected: selected.value,
      'onUpdate:stocks': (v: StorageStock[]) => (stocks.value = v),
      'onUpdate:mode': (v: string) => (mode.value = v),
      'onUpdate:selected': (v: string | null) => (selected.value = v),
      onMove: on('move'),
      onMoveReject: on('move-reject'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const cell = (id: string) => w.find(`[data-bin="${id}"]`)
  const of = (name: string) => events.filter((e) => e.name === name).map((e) => e.payload)
  const vm = () => w.findComponent(ChptStorageMap).vm as unknown as {
    locate: (q: string) => string[]
    select: (id: string | null) => void
    startMove: (ids: string[]) => void
    cancelMove: () => void
  }
  const aside = () => w.find('aside')
  return { w, stocks, mode, selected, cell, of, vm, aside }
}

const dragEvent = (type: string) => {
  const data: Record<string, string> = {}
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'dataTransfer', { value: { setData: (k: string, v: string) => (data[k] = v), getData: (k: string) => data[k], effectAllowed: '', dropEffect: '' } })
  return e
}

describe('ChptStorageMap', () => {
  it('配置：區、料架、層由高到低、缺的格位留空；摘要', () => {
    const { w, cell } = mountIt()
    expect(w.findAll('section h4').map((x) => x.text())).toEqual(['A 區', 'B 區'])
    expect(w.findAll('figcaption').map((x) => x.text())).toEqual(['A-01', 'B-01'])
    const heads = w.findAll('figure')[0].findAll('[role="rowheader"]').map((x) => x.text())
    expect(heads).toEqual(['2F', '1F'])
    // B-01 只有第 1、3 格：中間補空位
    expect(w.findAll('figure')[1].findAll('[data-bin]')).toHaveLength(2)
    expect(w.findAll('figure')[1].findAll('span.h-10')).toHaveLength(1)
    expect(cell('A-1-1').text()).toBe('70%')
    expect(cell('A-2-1').attributes('style')).toContain('danger-solid')
    expect(cell('B-1-1').text()).toBe('7')
    expect(cell('A-2-2').text()).toBe('—')
    expect(cell('A-1-1').attributes('aria-label')).toBe('A-1-1，PCB / IC，使用率 70%，快到期')
    expect(cell('A-2-2').attributes('aria-label')).toBe('A-2-2，停用，空')
    expect(cell('A-1-1').find('.rounded-full').exists()).toBe(true)
    const text = w.text()
    expect(text).toContain('使用中 3 / 6 格')
    expect(text).toContain('使用率 42%')
    expect(text).toContain('已過期 1 筆')
    expect(text).toContain('30 天內到期 1 筆')
    expect(text).toContain('停用 1 格')
  })

  it('上色方式：料號、效期；切換時更新 v-model:mode', async () => {
    const { w, cell, mode } = mountIt()
    const btn = (label: string) => w.findAll('[role="group"] button').find((b) => b.text() === label)!
    await btn('料號').trigger('click')
    expect(mode.value).toBe('item')
    expect(btn('料號').attributes('aria-pressed')).toBe('true')
    expect(cell('A-1-1').text()).toBe('2 種')
    expect(cell('A-2-1').text()).toBe('PCB')
    expect(w.text()).toContain('PCB')
    await btn('效期').trigger('click')
    expect(cell('A-1-1').text()).toBe('5 天')
    expect(cell('A-2-1').text()).toBe('過期')
    expect(cell('A-2-1').attributes('style')).toContain('danger-solid')
    expect(cell('B-1-1').text()).toBe('')
    expect(w.text()).toContain('已過期')
    mode.value = 'utilization'
    await nextTick()
    expect(cell('A-1-1').text()).toBe('70%')
  })

  it('料號顏色：自訂、超過 8 種時其他', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, bin: 'B-1-1', item: `I${i}`, qty: 10 - i }))
    const { w } = mountIt({ mode: 'item', stocks: many, itemColors: { I9: 'rgb(1, 2, 3)' } })
    const legend = w.find('[aria-label="圖例"]').text()
    expect(legend).toContain('I9')
    expect(legend).toContain('其他')
    expect(legend).not.toContain('I8')
  })

  it('選取儲位：明細（位置、容量、庫存、批號、效期）；再點一次取消', async () => {
    const { cell, aside, selected } = mountIt()
    expect(aside().text()).toContain('點選儲位查看庫存')
    await cell('A-1-1').trigger('click')
    expect(selected.value).toBe('A-1-1')
    expect(cell('A-1-1').attributes('aria-selected')).toBe('true')
    const t = aside().text()
    expect(t).toContain('A 區 · A-01 · 第 1 層第 1 格')
    expect(t).toContain('70 / 100（70%）')
    expect(t).toContain('主板')
    expect(t).toContain('批號 L1')
    expect(t).toContain('100 天後到期')
    expect(t).toContain('5 天後到期')
    expect(t).toContain('pcs')
    await cell('A-2-1').trigger('click')
    expect(aside().text()).toContain('已過期 2 天')
    await cell('A-2-2').trigger('click')
    expect(aside().text()).toContain('停用')
    expect(aside().text()).toContain('空儲位')
    await cell('A-2-2').trigger('click')
    expect(selected.value).toBeNull()
  })

  it('搜尋：標出符合的儲位、其他淡化；上一個 / 下一個；locate()', async () => {
    const { w, cell, vm, selected } = mountIt()
    const input = w.find('input[type="search"]')
    await input.setValue('pcb')
    expect(w.find('form [aria-live]').text()).toBe('找到 2 個儲位')
    expect(cell('A-1-2').attributes('style')).toContain('opacity: 0.35')
    expect(cell('A-1-1').attributes('style')).not.toContain('opacity')
    await w.find('form').trigger('submit')
    expect(selected.value).toBe('A-1-1')
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.bin).toBe('A-1-1')
    const [prev, next] = w.findAll('form button')
    await next.trigger('click')
    expect(selected.value).toBe('A-2-1')
    await next.trigger('click')
    expect(selected.value).toBe('A-1-1')
    await prev.trigger('click')
    expect(selected.value).toBe('A-2-1')
    expect(vm().locate('主板 L1')).toEqual(['A-1-1'])
    await nextTick()
    expect(vm().locate('zzz')).toEqual([])
    await nextTick()
    expect(w.find('form [aria-live]').text()).toBe('找不到')
  })

  it('移庫：按「移動」→ 點目的儲位；拒絕停用與超過容量；Esc 與取消', async () => {
    const { w, cell, aside, stocks, of, selected } = mountIt()
    await cell('A-1-1').trigger('click')
    await aside().findAll('button').find((b) => b.text().includes('移動') && b.attributes('aria-label') === '移動 PCB')!.trigger('click')
    expect(w.find('[role="status"]').text()).toContain('移動 PCB')
    // 不能放的格子淡化
    expect(cell('A-2-2').attributes('style')).toContain('opacity: 0.35')
    expect(cell('A-1-2').attributes('style')).not.toContain('opacity')
    await cell('A-2-2').trigger('click')
    expect(w.find('p[role="alert"]').text()).toBe('A-2-2 已停用，不能移入')
    expect(of('move-reject')).toEqual([{ reason: 'blocked', to: 'A-2-2', stockIds: ['s1'] }])
    w.findComponent(ChptStorageMap).vm.startMove(['s1'])
    await nextTick()
    await cell('B-1-3').trigger('click')
    expect(of('move-reject')[1]).toMatchObject({ reason: 'overCapacity' })
    w.findComponent(ChptStorageMap).vm.startMove(['s1'])
    await nextTick()
    await cell('A-1-1').trigger('click') // 同一格：不動
    expect(stocks.value.find((s) => s.id === 's1')!.bin).toBe('A-1-1')
    w.findComponent(ChptStorageMap).vm.startMove(['s1'])
    await nextTick()
    await cell('A-1-2').trigger('click')
    expect(stocks.value.find((s) => s.id === 's1')!.bin).toBe('A-1-2')
    expect(of('move')).toEqual([{ stocks: [expect.objectContaining({ id: 's1', bin: 'A-1-2' })], from: ['A-1-1'], to: 'A-1-2' }])
    expect(selected.value).toBe('A-1-2')
    expect(w.find('p[role="alert"]').exists()).toBe(false)
    // Esc 取消
    w.findComponent(ChptStorageMap).vm.startMove(['s2'])
    await nextTick()
    await w.find('.storage-map').trigger('keydown', { key: 'Escape' })
    expect(w.find('[role="status"]').exists()).toBe(false)
    // 取消鈕
    w.findComponent(ChptStorageMap).vm.startMove(['s2'])
    await nextTick()
    await w.find('[role="status"] button').trigger('click')
    expect(w.find('[role="status"]').exists()).toBe(false)
  })

  it('整格移動與 allowOverCapacity', async () => {
    const { cell, aside, stocks } = mountIt({ allowOverCapacity: true })
    await cell('A-1-1').trigger('click')
    await aside().findAll('button').find((b) => b.text().includes('整格移動'))!.trigger('click')
    await cell('B-1-3').trigger('click')
    expect(stocks.value.filter((s) => s.bin === 'B-1-3').map((s) => s.id)).toEqual(['s1', 's2'])
    expect(cell('B-1-3').text()).toBe('140%')
    expect(cell('B-1-3').attributes('style')).toContain('danger-solid')
  })

  it('拖曳：庫存列或整格拖到別的儲位', async () => {
    const { w, cell, aside, stocks } = mountIt()
    // 整格拖曳
    expect(cell('A-1-1').attributes('draggable')).toBe('true')
    expect(cell('A-1-2').attributes('draggable')).toBe('false')
    cell('B-1-1').element.dispatchEvent(dragEvent('dragstart'))
    const over = dragEvent('dragover')
    cell('A-1-2').element.dispatchEvent(over)
    expect(over.defaultPrevented).toBe(true)
    await nextTick()
    expect(cell('A-1-2').attributes('style')).toContain('box-shadow')
    cell('A-1-2').element.dispatchEvent(dragEvent('dragleave'))
    cell('A-1-2').element.dispatchEvent(dragEvent('drop'))
    await nextTick()
    expect(stocks.value.find((s) => s.id === 's4')!.bin).toBe('A-1-2')
    // 庫存列拖曳
    await cell('A-1-1').trigger('click')
    const row = aside().find('li[draggable="true"]')
    row.element.dispatchEvent(dragEvent('dragstart'))
    cell('B-1-1').element.dispatchEvent(dragEvent('drop'))
    await nextTick()
    expect(stocks.value.find((s) => s.id === 's1')!.bin).toBe('B-1-1')
    // 沒有在拖曳時 dragover 不處理；空格不能拖
    const idle = dragEvent('dragover')
    cell('A-1-2').element.dispatchEvent(idle)
    expect(idle.defaultPrevented).toBe(false)
    cell('A-2-2').element.dispatchEvent(dragEvent('dragstart'))
    cell('A-1-2').element.dispatchEvent(dragEvent('drop'))
    row.element.dispatchEvent(dragEvent('dragstart'))
    row.element.dispatchEvent(dragEvent('dragend'))
    cell('A-1-2').element.dispatchEvent(dragEvent('drop'))
    await nextTick()
    expect(w.find('p[role="alert"]').exists()).toBe(false)
  })

  it('方向鍵在同一個料架裡移動焦點（跳過缺的格位）', async () => {
    const { cell } = mountIt()
    ;(cell('A-1-1').element as HTMLElement).focus()
    await cell('A-1-1').trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.bin).toBe('A-2-1')
    await cell('A-2-1').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.bin).toBe('A-2-2')
    await cell('A-2-2').trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.bin).toBe('A-2-2')
    await cell('B-1-1').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.bin).toBe('B-1-3')
    await cell('B-1-3').trigger('keydown', { key: 'Enter' })
  })

  it('readonly：沒有移動按鈕、不能拖曳、startMove 無效', async () => {
    const { w, cell, aside } = mountIt({ readonly: true, selected: 'A-1-1' })
    expect(aside().text()).not.toContain('移動')
    expect(cell('A-1-1').attributes('draggable')).toBe('false')
    w.findComponent(ChptStorageMap).vm.startMove(['s1'])
    await nextTick()
    expect(w.find('[role="status"]').exists()).toBe(false)
  })

  it('外部 v-model:selected；沒有儲位；now 為 Date / null', async () => {
    const { aside, selected } = mountIt()
    selected.value = 'B-1-1'
    await nextTick()
    expect(aside().text()).toContain('B-1-1')
    expect(mountIt({ bins: [] }).w.text()).toContain('沒有儲位')
    expect(mountIt({ now: new Date(NOW) }).w.text()).toContain('已過期 1 筆')
    expect(mountIt({ now: null }).w.text()).toContain('使用中')
  })

  it('英文語系', () => {
    const { w, cell } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.text()).toContain('3 / 6 bins in use')
    expect(cell('A-1-1').attributes('aria-label')).toBe('A-1-1, PCB / IC, 70% full, Expiring soon')
  })
})
