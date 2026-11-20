import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptEquipmentWall from '@/components/library/ui/ChptEquipmentWall.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { EquipmentItem } from '@/components/library/shared/equipment'

const NOW = Date.UTC(2026, 10, 20, 8, 0)
const ago = (min: number) => NOW - min * 60_000

const seed = (): EquipmentItem[] => [
  { id: 'm1', name: 'SMT-01', group: 'L1', status: 'run', since: ago(184), utilization: 92, workOrder: 'WO-1', product: 'PCB-A', metrics: [{ label: '產出', value: 1260, unit: 'pcs' }] },
  { id: 'm2', name: 'SMT-02', group: 'L1', status: 'down', since: ago(25), alarm: '吸嘴異常', utilization: 71 },
  { id: 'm3', name: 'AOI-01', group: 'L2', status: 'idle', since: ago(0.5) },
  { id: 'm4', name: 'AOI-02', group: 'L2', status: 'offline', since: ago(60 * 26) },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function mountIt(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
  const items = ref<EquipmentItem[]>((props.items as EquipmentItem[]) ?? seed())
  const w = mount({ render: () => h(ChptEquipmentWall, { now: NOW, ...props, items: items.value, ...attrs }) }, { attachTo: document.body })
  mounted.push(w)
  const cards = () => w.findAll('.equipment-card')
  const comp = () => w.findComponent(ChptEquipmentWall)
  const statusBtn = (label: string) => w.find('[role="group"][aria-label="依狀態篩選"]').findAll('button').find((b) => b.text().includes(label))!
  return { w, items, cards, comp, statusBtn }
}

describe('ChptEquipmentWall', () => {
  it('卡片：名稱、狀態、持續時間、警報、工單、稼動率、數值；aria-label 摘要', () => {
    const { w, cards } = mountIt()
    expect(cards()).toHaveLength(4)
    expect(cards()[0].text()).toContain('已運轉 3 小時 4 分')
    expect(cards()[0].text()).toContain('WO-1 · PCB-A')
    expect(cards()[0].text()).toContain('1260pcs')
    expect(cards()[1].attributes('aria-label')).toBe('SMT-02, 停機, 已停機 25 分, 吸嘴異常, 稼動率 71%')
    expect(cards()[1].attributes('style')).toContain('color-mix')
    expect(cards()[1].find('.text-danger').text()).toContain('吸嘴異常')
    expect(cards()[2].text()).toContain('已待機 不到 1 分')
    expect(cards()[3].text()).toContain('已離線 1 天 2 小時')
    expect(w.findAll('section h3').map((x) => x.text().replace(/\s+/g, ' '))).toEqual(['L1 運轉 1 · 停機 1', 'L2 待機 1 · 離線 1'])
    expect(w.text()).toContain('平均稼動率 82%')
  })

  it('狀態數量是篩選（可多選、再按取消）；搜尋；沒有結果時顯示空狀態', async () => {
    const { w, cards, statusBtn } = mountIt()
    expect(statusBtn('停機').text().replace(/\s+/g, ' ')).toContain('停機 1')
    await statusBtn('停機').trigger('click')
    expect(statusBtn('停機').attributes('aria-pressed')).toBe('true')
    expect(cards().map((c) => c.attributes('data-status'))).toEqual(['down'])
    await statusBtn('待機').trigger('click')
    expect(cards()).toHaveLength(2)
    await statusBtn('停機').trigger('click')
    await statusBtn('待機').trigger('click')
    await w.find('input[type="search"]').setValue('pcb-a')
    expect(cards()).toHaveLength(1)
    await w.find('input[type="search"]').setValue('zzz')
    expect(w.text()).toContain('沒有符合條件的機台')
  })

  it('sortBy=status；不分組時不顯示標題；compact 不顯示工單與稼動率', () => {
    const { w, cards } = mountIt({ sortBy: 'status', groupBy: false, density: 'compact' })
    expect(cards().map((c) => c.attributes('data-status'))).toEqual(['down', 'idle', 'offline', 'run'])
    expect(w.find('section h3').exists()).toBe(false)
    expect(w.text()).not.toContain('WO-1')
    expect(w.text()).not.toContain('92%')
  })

  it('沒有 group 時不分組；有 group 的與沒有的混在一起時放「未分組」', () => {
    const r = mountIt({ items: [{ id: 'a', name: 'A', status: 'run' }] })
    expect(r.w.find('section h3').exists()).toBe(false)
    const r2 = mountIt({ items: [{ id: 'a', name: 'A', status: 'run', group: 'L1' }, { id: 'b', name: 'B', status: 'run' }] })
    expect(r2.w.findAll('section h3').at(-1)!.text()).toContain('未分組')
  })

  it('showToolbar=false、searchable=false', () => {
    expect(mountIt({ showToolbar: false }).w.find('[aria-label="依狀態篩選"]').exists()).toBe(false)
    const r = mountIt({ searchable: false })
    expect(r.w.find('input').exists()).toBe(false)
    expect(r.w.text()).toContain('平均稼動率')
  })

  it('有綁 item-click 時卡片是按鈕；點擊與 Enter 送出', async () => {
    const clicks: string[] = []
    const { cards } = mountIt({}, { onItemClick: (it: EquipmentItem) => clicks.push(it.id) })
    expect(cards()[0].element.tagName).toBe('BUTTON')
    await cards()[1].trigger('click')
    expect(clicks).toEqual(['m2'])
    const r = mountIt()
    expect(r.cards()[0].element.tagName).toBe('DIV')
    expect(r.cards()[0].attributes('role')).toBe('group')
  })

  it('鍵盤：一個 Tab 停駐點、方向鍵移動、Home / End；篩掉目前的卡片時停駐點換到第一張', async () => {
    const { cards, statusBtn } = mountIt()
    const tabbable = () => cards().filter((c) => c.attributes('tabindex') === '0').map((c) => c.attributes('data-status'))
    expect(tabbable()).toEqual(['run'])
    // jsdom 沒有版面：給每張卡片一個位置（兩欄）
    const pos = [
      [0, 0],
      [110, 0],
      [0, 120],
      [110, 120],
    ]
    cards().forEach((c, i) =>
      vi.spyOn(c.element, 'getBoundingClientRect').mockReturnValue({ left: pos[i][0], top: pos[i][1], width: 100, height: 100 } as DOMRect)
    )
    ;(cards()[0].element as HTMLElement).focus()
    await cards()[0].trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(document.activeElement).toBe(cards()[2].element)
    expect(tabbable()).toEqual(['idle'])
    await cards()[2].trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(cards()[3].element)
    await cards()[3].trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(document.activeElement).toBe(cards()[0].element)
    await cards()[0].trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement).toBe(cards()[3].element)
    await cards()[3].trigger('keydown', { key: 'a' })
    await statusBtn('停機').trigger('click')
    expect(tabbable()).toEqual(['down'])
  })

  it('狀態改變：閃外框 2.5 秒；變成停機時念出（可多台）', async () => {
    vi.useFakeTimers()
    const { w, items, cards } = mountIt()
    items.value = items.value.map((it) => (it.id === 'm1' ? { ...it, status: 'down', alarm: '卡料' } : it.id === 'm3' ? { ...it, status: 'run' } : it))
    await nextTick()
    expect(cards()[0].attributes('style')).toContain('box-shadow')
    expect(cards()[2].attributes('style')).toContain('box-shadow')
    expect(w.find('.sr-only[aria-live]').text()).toBe('SMT-01 停機：卡料')
    // 直接改物件也會偵測到；再次改變時重新計時
    items.value[1].status = 'run'
    await nextTick()
    items.value[1].status = 'idle'
    await nextTick()
    items.value[3].status = 'down'
    items.value[2].status = 'down'
    await nextTick()
    expect(w.find('.sr-only[aria-live]').text()).toBe('AOI-01 停機；AOI-02 停機')
    vi.advanceTimersByTime(2600)
    await nextTick()
    expect(cards().filter((c) => (c.attributes('style') ?? '').includes('box-shadow'))).toHaveLength(0)
  })

  it('沒有給 now 時每 30 秒更新持續時間；since 無效時不顯示', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const { cards } = mountIt({ now: null, items: [{ id: 'a', name: 'A', status: 'run', since: ago(1) }, { id: 'b', name: 'B', status: 'run', since: 'bad' }, { id: 'c', name: 'C', status: 'run', since: NOW + 60_000 }] })
    expect(cards()[0].text()).toContain('已運轉 1 分')
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(cards()[0].text()).toContain('已運轉 2 分')
    expect(cards()[1].text()).not.toContain('已運轉')
    expect(cards()[2].text()).toContain('已運轉')
    const r = mountIt({ now: new Date(NOW), items: [{ id: 'a', name: 'A', status: 'run', since: new Date(ago(5)) }] })
    expect(r.cards()[0].text()).toContain('已運轉 5 分')
  })

  it('ref：setStatusFilter / setQuery', async () => {
    const { comp, cards } = mountIt()
    const api = comp().vm as unknown as { setStatusFilter: (s: string[]) => void; setQuery: (q: string) => void }
    api.setStatusFilter(['run', 'idle'])
    await nextTick()
    expect(cards()).toHaveLength(2)
    api.setStatusFilter([])
    api.setQuery('aoi')
    await nextTick()
    expect(cards()).toHaveLength(2)
  })

  it('extra 插槽', () => {
    const w = mount({ render: () => h(ChptEquipmentWall, { items: seed(), now: NOW }, { extra: ({ item }: { item: EquipmentItem }) => h('em', item.id) }) })
    mounted.push(w)
    expect(w.findAll('em').map((e) => e.text())).toEqual(['m1', 'm2', 'm3', 'm4'])
  })

  it('語系：enUS', () => {
    const w = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptEquipmentWall, { items: seed(), now: NOW })) })
    mounted.push(w)
    expect(w.text()).toContain('Running for 3h 4m')
    expect(w.text()).toContain('Offline for 1d 2h')
    expect(w.text()).toContain('Idle for under 1 min')
    expect(w.find('input').attributes('placeholder')).toBe('Search machine, work order, part')
  })
})
