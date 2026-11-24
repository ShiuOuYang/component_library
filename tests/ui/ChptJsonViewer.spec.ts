import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptJsonViewer from '@/components/library/ui/ChptJsonViewer.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

const data = {
  name: 'SMT-3',
  count: 12,
  ok: true,
  none: null,
  long: 'x'.repeat(30),
  list: [1, 2, 3, 4, 5],
  nested: { deep: { value: 'hello' } },
}

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.unstubAllGlobals()
})

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const events: { name: string; payload: Record<string, unknown> }[] = []
  const node = () =>
    h(ChptJsonViewer, {
      data,
      ...props,
      onSelect: (p: Record<string, unknown>) => events.push({ name: 'select', payload: p }),
      onCopy: (p: Record<string, unknown>) => events.push({ name: 'copy', payload: p }),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const items = () => w.findAll('li[role="treeitem"]')
  const row = (name: string) => items().find((li) => li.text().startsWith(`"${name}"`) || li.text().includes(`"${name}" :`) || li.text().includes(`"${name}":`))!
  const of = (name: string) => events.filter((e) => e.name === name).map((e) => e.payload)
  return { w, items, row, of }
}

describe('ChptJsonViewer', () => {
  it('預設展開一層、依型別顯示、長字串截斷可展開', async () => {
    const { w, items, row } = mountIt({ maxStringLength: 10 })
    expect(items()).toHaveLength(8)
    expect(items()[0].attributes('aria-expanded')).toBe('true')
    expect(row('list').text()).toContain('5 項')
    expect(row('nested').text()).toContain('1 個鍵')
    expect(row('nested').attributes('aria-expanded')).toBe('false')
    expect(row('ok').text()).toContain('true')
    expect(row('none').text()).toContain('null')
    expect(row('long').text()).toContain('"xxxxxxxxxx…"')
    await row('long').findAll('button').find((b) => b.text() === '顯示全部')!.trigger('click')
    expect(row('long').text()).toContain('x'.repeat(30))
    expect(w.find('ul').attributes('aria-label')).toBe('JSON')
  })

  it('點容器展開 / 收合並送出 select；全部展開 / 收合；expandDepth', async () => {
    const { w, row, items, of } = mountIt({ rootName: 'res' })
    await row('nested').trigger('click')
    expect(row('nested').attributes('aria-expanded')).toBe('true')
    expect(of('select')[0]).toMatchObject({ pathText: 'res.nested' })
    await w.findAll('button').find((b) => b.text().includes('全部展開'))!.trigger('click')
    expect(items().length).toBe(15)
    await w.findAll('button').find((b) => b.text().includes('全部收合'))!.trigger('click')
    expect(items()).toHaveLength(1)
    expect(mountIt({ expandDepth: 0 }).items()).toHaveLength(1)
    expect(mountIt({ expandDepth: 3 }).items()).toHaveLength(15)
  })

  it('長陣列分段：還有 N 項、顯示更多', async () => {
    const { w, row, items } = mountIt({ data: { list: [1, 2, 3, 4, 5] }, pageSize: 2, expandDepth: 2 })
    expect(row('list').attributes('aria-expanded')).toBe('true')
    const more = () => w.findAll('button').find((b) => b.text().startsWith('還有'))
    expect(more()!.text()).toBe('還有 3 項，顯示更多')
    await more()!.trigger('click')
    expect(more()!.text()).toBe('還有 1 項，顯示更多')
    await more()!.trigger('click')
    expect(more()).toBeUndefined()
    expect(items().filter((i) => i.attributes('aria-level') === '3')).toHaveLength(5)
  })

  it('搜尋：展開到符合的位置、上一個 / 下一個、找不到', async () => {
    const { w, row } = mountIt()
    await w.find('input[type="search"]').setValue('hello')
    await nextTick()
    expect(row('value').attributes('aria-selected')).toBe('true')
    expect(w.find('form [aria-live]').text()).toBe('1 / 1')
    await w.find('input[type="search"]').setValue('e')
    await nextTick()
    const counter = () => w.find('form [aria-live]').text()
    const total = counter().split(' / ')[1]
    const [prev, next] = w.findAll('form button')
    await next.trigger('click')
    expect(counter()).toBe(`2 / ${total}`)
    await prev.trigger('click')
    await prev.trigger('click')
    expect(counter()).toBe(`${total} / ${total}`)
    await w.find('form').trigger('submit')
    expect(counter()).toBe(`1 / ${total}`)
    await w.find('input[type="search"]').setValue('zzz')
    expect(counter()).toBe('找不到')
  })

  it('複製值、路徑、全部；剪貼簿失敗', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    const { w, row, of } = mountIt({ rootName: 'r' })
    await row('name').findAll('button').find((b) => b.text() === '複製值')!.trigger('click')
    await row('name').findAll('button').find((b) => b.text() === '複製路徑')!.trigger('click')
    await w.findAll('button').find((b) => b.text().includes('複製全部'))!.trigger('click')
    await nextTick()
    expect(writeText.mock.calls.map((c) => c[0])).toEqual(['SMT-3', 'r.name', JSON.stringify(data, null, 2)])
    expect(of('copy').map((c) => c.kind)).toEqual(['value', 'path', 'all'])
    expect(w.find('.sr-only[aria-live]').text()).toBe('已複製全部')
    // 物件的值複製成 JSON；鍵盤 C
    await row('nested').trigger('keydown', { key: 'c' })
    await nextTick()
    expect(writeText.mock.calls.at(-1)![0]).toBe(JSON.stringify({ deep: { value: 'hello' } }, null, 2))
    writeText.mockRejectedValueOnce(new Error('no'))
    await row('count').findAll('button').find((b) => b.text() === '複製值')!.trigger('click')
    await nextTick()
    await nextTick()
    expect(w.find('.sr-only[aria-live]').text()).toContain('無法複製')
  })

  it('鍵盤：上下移動、右展開 / 進入、左收合 / 回上層、Enter', async () => {
    const { items, row } = mountIt()
    const focused = () => document.activeElement?.getAttribute('data-row')
    ;(items()[0].element as HTMLElement).focus()
    await items()[0].trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(focused()).toBe('1')
    await items()[1].trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(focused()).toBe('0')
    await row('nested').trigger('keydown', { key: 'ArrowRight' })
    expect(row('nested').attributes('aria-expanded')).toBe('true')
    await row('nested').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement?.textContent).toContain('"deep"')
    await row('deep').trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(document.activeElement?.textContent).toContain('"nested"')
    await row('nested').trigger('keydown', { key: 'ArrowLeft' })
    expect(row('nested').attributes('aria-expanded')).toBe('false')
    await row('nested').trigger('keydown', { key: 'Enter' })
    expect(row('nested').attributes('aria-expanded')).toBe('true')
    await row('name').trigger('keydown', { key: 'ArrowRight' })
    await row('name').trigger('keydown', { key: 'x' })
  })

  it('差異：統計、標記新增 / 變更、刪除的項目列在容器最後', () => {
    const { w, row, items } = mountIt({ compare: { name: 'SMT-2', count: 12, gone: 1, list: [1, 2], nested: { deep: { value: 'hello' } } } })
    expect(w.text()).toContain('新增 6')
    expect(w.text()).toContain('刪除 1')
    expect(w.text()).toContain('變更 1')
    expect(row('name').text()).toContain('變更')
    expect(row('ok').text()).toContain('新增')
    const last = items().at(-1)!
    expect(last.text()).toContain('"gone"')
    expect(last.classes()).toContain('line-through')
    expect(last.text()).toContain('刪除')
  })

  it('資料換掉時重設展開；不顯示工具列；英文語系', async () => {
    const d = ref<unknown>({ a: { b: 1 } })
    const w = mount({ render: () => h(ChptJsonViewer, { data: d.value, toolbar: false, maxHeight: 200 }) })
    mounted.push(w)
    expect(w.find('form').exists()).toBe(false)
    expect(w.find('ul').attributes('style')).toContain('max-height: 200px')
    d.value = [1, [2, 3]]
    await nextTick()
    expect(w.findAll('li[role="treeitem"]')).toHaveLength(3)
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.text()).toContain('5 items')
    expect(en.w.text()).toContain('1 key')
    // 基本型別也能顯示
    expect(mountIt({ data: 'just text' }).items()[0].text()).toContain('"just text"')
  })
})
