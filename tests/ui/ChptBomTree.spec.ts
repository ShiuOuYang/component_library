import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptBomTree from '@/components/library/ui/ChptBomTree.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { BomItem } from '@/components/library/shared/bom'

const bom: BomItem = {
  partNo: 'FG',
  name: '成品',
  qty: 1,
  children: [
    {
      partNo: 'SUB',
      name: '半成品',
      qty: 2,
      children: [
        { partNo: 'R1', name: '電阻', qty: 10, unit: 'pcs', ref: 'R1-R10' },
        { partNo: 'IC', name: 'MCU', qty: 1, critical: true, children: [{ partNo: 'FW', name: '韌體', qty: 1 }] },
      ],
    },
    { partNo: 'R1', name: '電阻', qty: 4 },
  ],
}
const stock = { SUB: 5, R1: 100, IC: 3, FW: 100 }

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const qty = ref((props.buildQty as number) ?? 10)
  const clicks: [BomItem, string][] = []
  const node = () =>
    h(ChptBomTree, {
      data: bom,
      ...props,
      buildQty: qty.value,
      'onUpdate:buildQty': (v: number) => (qty.value = v),
      onRowClick: (item: BomItem, key: string) => clicks.push([item, key]),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const rows = () => w.findAll('tbody tr')
  const row = (partNo: string, n = 0) => rows().filter((r) => r.find('td').text().includes(partNo))[n]
  return { w, qty, clicks, rows, row }
}

describe('ChptBomTree', () => {
  it('預設展開兩階；每台用量、需求；沒有庫存時不顯示庫存欄', () => {
    const { w, rows, row } = mountIt({ title: 'BOM' })
    expect(rows().map((r) => r.find('td .font-mono').text())).toEqual(['FG', 'SUB', 'R1', 'IC', 'R1'])
    expect(row('IC').attributes('aria-expanded')).toBe('false')
    expect(row('SUB').attributes('aria-level')).toBe('2')
    const cells = row('R1').findAll('td').map((td) => td.text())
    expect(cells).toEqual(['R1', '電阻', 'R1-R10', '10 pcs', '20', '200'])
    expect(w.find('thead').text()).toContain('需求（10 台）')
    expect(w.find('thead').text()).not.toContain('庫存')
    expect(row('IC').find('[aria-label="關鍵料"]').exists()).toBe(true)
    expect(w.text()).toContain('採購件 2 種')
    expect(w.find('table').attributes('aria-label')).toBe('BOM')
  })

  it('庫存與缺料：扣抵半成品、葉節點缺料標紅、半成品顯示用庫存', () => {
    const { w, row } = mountIt({ stock, expandDepth: 5 })
    // SUB：20 台份，用庫存 5 → 15；R1 在 SUB 下 150、庫存 100 → 缺 50；成品下 40 → 缺 40
    expect(row('SUB').text()).toContain('用庫存 5')
    expect(row('R1', 0).findAll('td').at(-1)!.text()).toBe('50')
    expect(row('R1', 1).findAll('td').at(-1)!.text()).toBe('40')
    // FW：IC 15 − 3 = 12，FW 庫存 100 → 不缺
    expect(row('FW').findAll('td').at(-1)!.text()).toBe('')
    expect(w.text()).toContain('缺料 1 種')
    expect(w.text()).toContain('（已扣抵半成品庫存）')
    const none = mountIt({ stock: { R1: 10_000, FW: 10_000 } })
    expect(none.w.text()).toContain('不缺料')
    const crit = mountIt({ stock: {}, netting: false })
    expect(crit.w.text()).not.toContain('已扣抵')
  })

  it('只看缺料：留下缺料的葉節點與上階', async () => {
    const { w, rows } = mountIt({ stock: { R1: 100, FW: 1000, SUB: 0 }, expandDepth: 5 })
    await w.find('input[type="checkbox"]').setValue(true)
    expect(rows().map((r) => r.find('td .font-mono').text())).toEqual(['FG', 'SUB', 'R1', 'R1'])
  })

  it('展開 / 收合：按鈕、全部展開、全部收合', async () => {
    const { w, rows, row } = mountIt()
    await row('IC').find('button').trigger('click')
    expect(rows().map((r) => r.find('td .font-mono').text())).toContain('FW')
    expect(row('IC').find('button').attributes('aria-label')).toBe('收合 IC')
    await w.findAll('button').find((b) => b.text().includes('全部收合'))!.trigger('click')
    expect(rows()).toHaveLength(1)
    await w.findAll('button').find((b) => b.text().includes('全部展開'))!.trigger('click')
    expect(rows()).toHaveLength(6)
  })

  it('搜尋：展開到那一層、標出符合的列、反查用在哪裡', async () => {
    const { w, row } = mountIt({ expandDepth: 0 })
    await w.find('input[type="search"]').setValue('fw')
    await nextTick()
    expect(row('FW').attributes('aria-selected')).toBe('true')
    expect(w.text()).toContain('找到 1 筆')
    expect(w.text()).toContain('FG › SUB › IC')
    await w.find('input[type="search"]').setValue('R1')
    await nextTick()
    expect(w.findAll('[aria-live] li')).toHaveLength(2)
    expect(w.text()).toContain('（每台 4）')
    await w.find('input[type="search"]').setValue('zzz')
    expect(w.text()).toContain('找不到')
  })

  it('生產數量：v-model；負數與空白當 0', async () => {
    const { w, qty } = mountIt()
    const input = w.find('input[type="number"]')
    await input.setValue('3')
    expect(qty.value).toBe(3)
    expect(w.find('thead').text()).toContain('需求（3 台）')
    await input.setValue('-2')
    expect(qty.value).toBe(0)
    qty.value = 7
    await nextTick()
    expect((w.find('input[type="number"]').element as HTMLInputElement).value).toBe('7')
  })

  it('版次差異：新增、刪除列、用量變更', async () => {
    const old: BomItem = {
      partNo: 'FG',
      qty: 1,
      children: [
        { partNo: 'SUB', qty: 2, children: [{ partNo: 'R1', qty: 8 }, { partNo: 'OLD', name: '舊料', qty: 1 }] },
        { partNo: 'GONE', qty: 1 },
      ],
    }
    const { w, row } = mountIt({ compare: old })
    expect(w.text()).toContain('新增 3')
    expect(w.text()).toContain('刪除 2')
    expect(w.text()).toContain('用量變更 1')
    expect(row('R1', 0).text()).toContain('用量 8 → 10')
    expect(row('IC').text()).toContain('新增')
    const removed = row('OLD')
    expect(removed.classes()).toContain('line-through')
    expect(removed.text()).toContain('刪除')
    // OLD 排在 SUB 的子件最後
    const keys = w.findAll('tbody tr').map((r) => r.find('td .font-mono').text())
    expect(keys).toEqual(['FG', 'SUB', 'R1', 'IC', 'OLD', 'R1', 'GONE'])
    await removed.trigger('click')
    // 刪除的列不送 row-click
  })

  it('點列送出 row-click；鍵盤：上下、Home / End、左右展開收合、Enter', async () => {
    const { rows, clicks } = mountIt()
    await rows()[1].trigger('click')
    expect(clicks[0][1]).toBe('FG/SUB')
    const focused = () => document.activeElement?.querySelector('td .font-mono')?.textContent
    ;(rows()[0].element as HTMLElement).focus()
    await rows()[0].trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(focused()).toBe('SUB')
    await rows()[1].trigger('keydown', { key: 'End' })
    await nextTick()
    expect(focused()).toBe('R1')
    await rows()[4].trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(focused()).toBe('FG')
    await rows()[0].trigger('keydown', { key: 'ArrowUp' })
    // IC：→ 展開、→ 到第一個子件、← 到上階、← 收合
    await rows()[3].trigger('keydown', { key: 'ArrowRight' })
    expect(rows()).toHaveLength(6)
    await rows()[3].trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(focused()).toBe('FW')
    await rows()[4].trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(focused()).toBe('IC')
    await rows()[3].trigger('keydown', { key: 'ArrowLeft' })
    expect(rows()).toHaveLength(5)
    await rows()[3].trigger('keydown', { key: 'Enter' })
    expect(rows()).toHaveLength(6)
    await rows()[2].trigger('keydown', { key: 'Enter' })
    expect(clicks.at(-1)![1]).toBe('FG/SUB/R1')
    await rows()[2].trigger('keydown', { key: 'ArrowRight' })
    await rows()[0].trigger('keydown', { key: 'ArrowLeft' })
    await rows()[0].trigger('keydown', { key: 'x' })
  })

  it('匯出 CSV：全部展開的攤平表', async () => {
    const created: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (b: Blob) => (created.push(b), 'blob:x') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const { w } = mountIt({ stock })
    await w.findAll('button').find((b) => b.text().includes('匯出'))!.trigger('click')
    const lines = (await created[0].text()).replace(/^\uFEFF/, '').split('\r\n')
    expect(lines[0]).toBe('階,料號,品名,位置號,單位用量,單位,每台用量,需求（10 台）,庫存,缺料,關鍵料')
    expect(lines).toHaveLength(7)
    expect(lines[1]).toBe('0,FG,成品,,,,,10,,,')
    expect(lines[3]).toBe('2,R1,電阻,R1-R10,10,pcs,20,150,100,50,')
    expect(lines[4]).toContain(',Y')
    // 沒有庫存時庫存 / 缺料欄空白
    const plain = mountIt()
    await plain.w.findAll('button').find((b) => b.text().includes('匯出'))!.trigger('click')
    expect((await created[1].text()).split('\r\n')[3]).toBe('2,R1,電阻,R1-R10,10,pcs,20,200,,,')
    click.mockRestore()
  })

  it('不顯示位置號、maxHeight、資料換掉時重設展開、英文語系', async () => {
    const data = ref<BomItem>(bom)
    const w = mount({ render: () => h(ChptBomTree, { data: data.value, showRef: false, maxHeight: 300 }) })
    mounted.push(w)
    expect(w.find('thead').text()).not.toContain('位置號')
    expect(w.find('.overflow-auto').attributes('style')).toContain('max-height: 300px')
    data.value = { partNo: 'NEW', qty: 1, children: [{ partNo: 'A', qty: 1 }] }
    await nextTick()
    expect(w.findAll('tbody tr')).toHaveLength(2)
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.find('thead').text()).toContain('Required (10 units)')
    expect(en.w.text()).toContain('2 purchased parts')
  })
})
