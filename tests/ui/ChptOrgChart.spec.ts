import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptOrgChart from '@/components/library/ui/ChptOrgChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { OrgLayout, OrgNode } from '@/components/library/shared/orgChart'

const tree: OrgNode = {
  id: 'r',
  label: '張志明',
  title: '廠長',
  color: 'red',
  children: [
    { id: 'a', label: '李美玲', title: '製造部', children: [{ id: 'a1', label: '周子豪', title: 'SMT 一線' }, { id: 'a2', label: 'Amy Chen', title: 'SMT 二線', avatar: 'x.png' }] },
    { id: 'b', label: '王建國', title: '品保部', children: [{ id: 'b1', label: '高婉婷', title: 'IQC', children: [{ id: 'b11', label: '曾冠宇', title: 'IQC 檢驗員' }] }] },
    { id: 'c', label: '黃雅婷', title: '生管' },
  ],
}

// jsdom 沒有版面：給畫布一個固定大小
const desc = {
  w: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'),
  h: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight'),
}
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 400 })
})
afterAll(() => {
  if (desc.w) Object.defineProperty(HTMLElement.prototype, 'clientWidth', desc.w)
  if (desc.h) Object.defineProperty(HTMLElement.prototype, 'clientHeight', desc.h)
})

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.restoreAllMocks()
})

type Exposed = {
  expandAll: () => void
  collapseAll: () => void
  reveal: (id: string) => void
  expand: (id: string) => void
  collapse: (id: string) => void
  fit: () => void
  zoomIn: () => void
  zoomOut: () => void
  exportPng: (scale?: number) => Promise<Blob | null>
  layout: () => OrgLayout
  expandedKeys: () => string[]
}

function mountIt(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const selected = ref<string | number | null>((props.selected as string) ?? null)
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  const node = () =>
    h(
      ChptOrgChart,
      {
        data: tree,
        ...props,
        selected: selected.value,
        'onUpdate:selected': (v: string | number | null) => (rec('selected')(v), (selected.value = v)),
        onNodeClick: rec('click'),
        onExpand: rec('expand'),
        onCollapse: rec('collapse'),
      },
      slots
    )
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const n = (id: string) => w.find(`[data-node="${id}"]`)
  const vm = () => w.findComponent(ChptOrgChart).vm as unknown as Exposed
  const transform = () => {
    const m = /translate\(([-\d.e]+)px, ([-\d.e]+)px\) scale\(([-\d.e]+)\)/.exec(w.find('[data-canvas]').attributes('style')!)!
    return { tx: Number(m[1]), ty: Number(m[2]), k: Number(m[3]) }
  }
  return { w, n, vm, emitted, selected, transform }
}

function pointer(el: Element, type: string, x: number, y: number, id = 1) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, { clientX: { value: x }, clientY: { value: y }, pointerId: { value: id }, button: { value: 0 }, pointerType: { value: 'mouse' } })
  el.dispatchEvent(e)
}

describe('ChptOrgChart', () => {
  it('節點、tree / treeitem 屬性、預設展開層數、收合按鈕顯示底下幾個', () => {
    const { w, n } = mountIt({ defaultExpandDepth: 1 })
    expect(w.find('[role="tree"]').exists()).toBe(true)
    expect(w.findAll('[role="treeitem"]').map((x) => x.attributes('data-node'))).toEqual(['r', 'a', 'b', 'c'])
    expect(n('r').attributes()).toMatchObject({ 'aria-level': '1', 'aria-expanded': 'true', 'aria-setsize': '1', 'aria-posinset': '1', tabindex: '0' })
    expect(n('b').attributes()).toMatchObject({ 'aria-level': '2', 'aria-expanded': 'false', 'aria-posinset': '2', 'aria-setsize': '3', tabindex: '-1' })
    expect(n('c').attributes('aria-expanded')).toBeUndefined()
    expect(n('b').attributes('aria-label')).toBe('王建國，品保部，直屬 1 個')
    expect(w.find('[data-toggle="b"]').text()).toBe('2')
    expect(w.find('[data-toggle="b"]').attributes('aria-label')).toBe('展開（底下 2 個）')
    expect(w.find('[data-toggle="r"]').text()).toBe('−')
    expect(w.findAll('[data-link]')).toHaveLength(3)
    expect(n('r').text()).toContain('志明')
    expect(n('r').find('div').attributes('style')).toContain('red')
    // 頭像
    const all = mountIt()
    expect(all.n('a2').find('img').attributes('src')).toBe('x.png')
    expect(all.w.findAll('[role="treeitem"]')).toHaveLength(8)
  })

  it('展開 / 收合：事件、念出、被點的節點在畫面上不動', async () => {
    const { w, n, emitted, transform, vm } = mountIt({ defaultExpandDepth: 1 })
    await nextTick() // 掛載後量到畫布大小才會重算檢視
    const screen = (id: string) => {
      const t = transform()
      const p = vm().layout().byId.get(id)!
      return { x: p.x * t.k + t.tx, y: p.y * t.k + t.ty }
    }
    const before = screen('b')
    await w.find('[data-toggle="b"]').trigger('click')
    expect(emitted.expand).toHaveLength(1)
    expect((emitted.expand[0] as OrgNode).id).toBe('b')
    expect(n('b1').exists()).toBe(true)
    expect(screen('b')).toEqual(before)
    expect(w.find('[data-live]').text()).toBe('已展開 王建國，直屬 1 個')
    await w.find('[data-toggle="b"]').trigger('click')
    expect(emitted.collapse).toHaveLength(1)
    expect(n('b1').exists()).toBe(false)
    expect(w.find('[data-live]').text()).toBe('已收合 王建國')
    // 已經是這個狀態 / 葉節點：不動
    vm().collapse('b')
    vm().expand('c')
    expect(emitted.collapse).toHaveLength(1)
    expect(emitted.expand).toHaveLength(1)
  })

  it('選取：點節點、選取路徑的連線標色、外部改 selected 會展開上層', async () => {
    const { w, n, emitted, selected } = mountIt({ defaultExpandDepth: 1 })
    await nextTick()
    await n('a').trigger('click')
    expect(selected.value).toBe('a')
    expect((emitted.click[0] as OrgNode).label).toBe('李美玲')
    expect(n('a').attributes('aria-selected')).toBe('true')
    expect(w.find('[data-link="r-a"]').attributes('style')).toContain('--t-accent')
    expect(w.find('[data-link="r-b"]').attributes('style')).toContain('--t-stroke-dark')
    selected.value = 'b11'
    await nextTick()
    await nextTick()
    expect(n('b11').exists()).toBe(true)
    expect(n('b11').attributes('aria-selected')).toBe('true')
    selected.value = null
    await nextTick()
    expect(w.find('[aria-selected="true"]').exists()).toBe(false)
    // 一開始就有選取：展開上層
    const pre = mountIt({ defaultExpandDepth: 0, selected: 'a2' })
    await nextTick()
    expect(pre.n('a2').exists()).toBe(true)
    expect(pre.n('a2').attributes('tabindex')).toBe('0')
  })

  it('鍵盤（由上往下）：↑ 上層、↓ 下層（未展開先展開）、←→ 兄弟、Home / End、Enter 選取、空白鍵展開收合、* 展開兄弟', async () => {
    const { w, n, selected, vm } = mountIt({ defaultExpandDepth: 1 })
    const active = () => document.activeElement?.getAttribute('data-node')
    n('r').element.focus()
    await n('r').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(active()).toBe('a')
    await n('a').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(active()).toBe('b')
    await n('b').trigger('keydown', { key: 'ArrowDown' }) // b 收合：先展開
    await nextTick()
    expect(active()).toBe('b1')
    await n('b1').trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(active()).toBe('b')
    await n('b').trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(active()).toBe('a')
    await n('a').trigger('keydown', { key: 'ArrowLeft' }) // 已是第一個
    await n('a').trigger('keydown', { key: 'End' })
    await nextTick()
    expect(active()).toBe('c')
    await n('c').trigger('keydown', { key: 'ArrowDown' }) // 葉節點
    await n('c').trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(active()).toBe('r')
    await n('r').trigger('keydown', { key: 'Enter' })
    expect(selected.value).toBe('r')
    await n('r').trigger('keydown', { key: ' ' })
    expect(n('a').exists()).toBe(false)
    await n('r').trigger('keydown', { key: ' ' })
    await n('a').trigger('keydown', { key: '*' })
    expect(vm().expandedKeys().sort()).toEqual(['a', 'b', 'r'])
    await n('a').trigger('keydown', { key: 'x' })
    expect(w.find('[data-node]').exists()).toBe(true)
    // 由左往右：← 上層、→ 下層、↑↓ 兄弟
    const hz = mountIt({ orientation: 'horizontal' })
    hz.n('a').element.focus()
    await hz.n('a').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(active()).toBe('b')
    await hz.n('b').trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(active()).toBe('r')
    await hz.n('r').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(active()).toBe('a')
    expect(hz.w.find('[data-toggle="a"]').classes()).toContain('left-full')
  })

  it('搜尋：數量、目前結果標示、Enter / Shift+Enter / 按鈕切換、自動展開、找不到', async () => {
    const { w, n, vm } = mountIt({ defaultExpandDepth: 0 })
    const input = w.find('[data-search]')
    await input.setValue('iqc')
    await nextTick()
    expect(w.find('[data-match-count]').text()).toBe('1 / 2')
    expect(n('b1').exists()).toBe(true)
    expect(n('b1').find('div').classes()).toContain('ring-warning')
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.find('[data-match-count]').text()).toBe('2 / 2')
    expect(n('b11').find('div').classes()).toContain('ring-warning')
    expect(n('b1').find('div').classes()).toContain('border-warning')
    expect(w.find('[data-live]').text()).toBe('曾冠宇（第 2 個，共 2 個符合）')
    await input.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(w.find('[data-match-count]').text()).toBe('1 / 2')
    const [prev, next] = w.findAll('button').filter((b) => /符合/.test(b.attributes('aria-label') ?? ''))
    await next.trigger('click')
    await prev.trigger('click')
    expect(w.find('[data-match-count]').text()).toBe('1 / 2')
    await input.setValue('不存在')
    expect(w.find('[data-match-count]').text()).toBe('找不到')
    await input.trigger('keydown', { key: 'Enter' })
    expect(vm().expandedKeys()).toContain('b1')
    // 關掉搜尋
    const off = mountIt({ searchable: false, exportable: false })
    expect(off.w.find('[data-search]').exists()).toBe(false)
    expect(off.w.find('[data-action="export"]').exists()).toBe(false)
  })

  it('縮放、全部顯示、全部展開 / 收合、Ctrl + 滾輪、拖曳平移（拖過不算點擊）、雙指縮放', async () => {
    const { w, n, transform, selected, vm } = mountIt()
    await nextTick()
    const k0 = transform().k
    expect(w.find('[data-zoom]').text()).toBe(`${Math.round(k0 * 100)}%`)
    await w.find('[data-action="zoom-in"]').trigger('click')
    expect(transform().k).toBeCloseTo(Math.min(2, k0 * 1.25))
    await w.find('[data-action="zoom-out"]').trigger('click')
    expect(transform().k).toBeCloseTo(k0)
    vm().zoomIn()
    vm().zoomOut()
    await w.find('[data-action="fit"]').trigger('click')
    vm().fit()
    await nextTick()
    const L = vm().layout()
    expect(transform().k).toBeCloseTo(Math.min(1, Math.min((800 - 32) / L.width, (400 - 32) / L.height)))
    await w.find('[data-action="collapse-all"]').trigger('click')
    expect(w.findAll('[role="treeitem"]')).toHaveLength(1)
    await w.find('[data-action="expand-all"]').trigger('click')
    expect(w.findAll('[role="treeitem"]')).toHaveLength(8)
    // 滾輪：沒按 Ctrl 不攔
    const frame = w.find('[data-canvas]').element.parentElement!
    const plain = new WheelEvent('wheel', { deltaY: -100, cancelable: true })
    frame.dispatchEvent(plain)
    expect(plain.defaultPrevented).toBe(false)
    const k1 = transform().k
    const zoom = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, cancelable: true, clientX: 100, clientY: 100 })
    frame.dispatchEvent(zoom)
    await nextTick()
    expect(zoom.defaultPrevented).toBe(true)
    expect(transform().k).toBeGreaterThan(k1)
    frame.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, metaKey: true, cancelable: true }))
    await nextTick()
    expect(transform().k).toBeCloseTo(k1, 5)
    // 拖曳
    const t0 = transform()
    pointer(n('a').element, 'pointerdown', 10, 10)
    pointer(frame, 'pointermove', 40, 30)
    pointer(frame, 'pointermove', 60, 40)
    pointer(frame, 'pointerup', 60, 40)
    await nextTick()
    expect(transform().tx).toBeCloseTo(t0.tx + 50)
    expect(transform().ty).toBeCloseTo(t0.ty + 30)
    await n('a').trigger('click') // 拖曳後放開：不選取
    expect(selected.value).toBeNull()
    await n('a').trigger('click')
    expect(selected.value).toBe('a')
    // 小幅移動仍算點擊
    pointer(n('b').element, 'pointerdown', 10, 10)
    pointer(frame, 'pointermove', 11, 11)
    pointer(frame, 'pointerup', 11, 11)
    await n('b').trigger('click')
    expect(selected.value).toBe('b')
    // 右鍵、沒按下的移動：忽略
    const right = new Event('pointerdown', { bubbles: true })
    Object.defineProperties(right, { clientX: { value: 0 }, clientY: { value: 0 }, pointerId: { value: 9 }, button: { value: 2 }, pointerType: { value: 'mouse' } })
    frame.dispatchEvent(right)
    pointer(frame, 'pointermove', 300, 300, 9)
    // 雙指
    const k2 = transform().k
    pointer(frame, 'pointerdown', 100, 100, 1)
    pointer(frame, 'pointerdown', 200, 100, 2)
    pointer(frame, 'pointermove', 250, 100, 2)
    await nextTick()
    expect(transform().k).toBeGreaterThan(k2)
    pointer(frame, 'pointerup', 250, 100, 2)
    pointer(frame, 'pointerup', 100, 100, 1)
  })

  it('reveal / 焦點移到畫面外的節點時平移、collapseAll 時 Tab 停在根', async () => {
    const { n, vm, transform } = mountIt({ nodeWidth: 300, gapX: 200 })
    const t0 = transform()
    vm().reveal('c')
    await nextTick()
    const L = vm().layout()
    const c = L.byId.get('c')!
    const t = transform()
    expect(c.x * t.k + t.tx + (300 * t.k) / 2).toBeCloseTo(400, 0)
    expect(t.tx).not.toBe(t0.tx)
    vm().reveal('nope')
    // 焦點移到最左邊的 a1（畫面外）→ 平移讓它看得到
    n('a1').element.focus()
    await nextTick()
    const t2 = transform()
    const a1 = vm().layout().byId.get('a1')!
    expect(a1.x * t2.k + t2.tx).toBeGreaterThanOrEqual(15.9)
    vm().collapseAll()
    await nextTick()
    expect(n('r').attributes('tabindex')).toBe('0')
  })

  it('匯出 PNG：canvas 繪製、下載檔名、沒有資料時為 null', async () => {
    const calls: string[] = []
    const ctx = new Proxy({}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 500 }) : (...args: unknown[]) => calls.push(`${String(k)}:${String(args[0]).slice(0, 12)}`)), set: () => true })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: BlobCallback) {
      cb(new Blob(['png'], { type: 'image/png' }))
    })
    const { w, vm } = mountIt({ defaultExpandDepth: 1, exportName: 'plant' })
    const blob = await vm().exportPng()
    expect(blob?.type).toBe('image/png')
    expect(calls.some((c) => c.startsWith('fillText:'))).toBe(true)
    expect(calls.filter((c) => c.startsWith('moveTo:'))).toHaveLength(3)
    // 收合的節點畫出底下的數量
    expect(calls).toContain('fillText:2')
    // 下載
    const created: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (b: Blob) => (created.push(b), 'blob:x') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} })
    const clicks: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download)
    })
    await w.find('[data-action="export"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(clicks).toEqual(['plant.png'])
    expect(created).toHaveLength(1)
    // 沒有 2d context / 沒有資料
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(await vm().exportPng()).toBeNull()
    const empty = mountIt({ data: [] })
    expect(await empty.vm().exportPng()).toBeNull()
    await empty.w.find('[data-action="export"]').trigger('click')
    expect(clicks).toHaveLength(1)
  })

  it('自訂 slot、沒有資料、英文語系', () => {
    const custom = mountIt({ defaultExpandDepth: 1 }, { node: ({ node, depth, selected }: { node: OrgNode; depth: number; selected: boolean }) => h('b', { class: 'custom' }, `${node.label}-${depth}-${selected}`) })
    expect(custom.w.findAll('.custom').map((x) => x.text())).toEqual(['張志明-0-false', '李美玲-1-false', '王建國-1-false', '黃雅婷-1-false'])
    expect(mountIt({ data: [] }).w.text()).toContain('沒有資料')
    expect(mountIt({ data: [], emptyText: '尚未建立' }).w.text()).toContain('尚未建立')
    const en = mountIt({ defaultExpandDepth: 1 }, {}, (node) => h(ChptConfigProvider, { locale: enUS }, () => node))
    expect(en.n('b').attributes('aria-label')).toBe('王建國, 品保部, 1 direct report')
    expect(en.w.find('[data-search]').attributes('placeholder')).toBe('Search name or title')
    expect(en.w.find('[role="tree"]').attributes('aria-label')).toBe('Organization chart')
  })
})
