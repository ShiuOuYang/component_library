import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptFeederMap from '@/components/library/ui/ChptFeederMap.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { FeederLoads, FeederLogEntry, FeederSlot } from '@/components/library/shared/feeder'

const T0 = 1_700_000_000_000
const slots: FeederSlot[] = [
  { id: 'F-01', group: '前側', partNo: 'P-10K', description: '10K', perBoard: 10 },
  { id: 'F-02', group: '前側', partNo: 'P-100N', alternates: ['ALT-100N'], perBoard: 5 },
  { id: 'R-01', group: '後側', partNo: 'P-LDO' },
]

const mounted: VueWrapper[] = []
const oscillators: number[] = []
beforeEach(() => {
  oscillators.length = 0
  class FakeCtx {
    state = 'running'
    currentTime = 0
    destination = {}
    createOscillator() {
      const o = { type: '', frequency: { value: 0 }, connect: () => ({ connect: () => undefined }), start: () => oscillators.push(o.frequency.value), stop: () => undefined, onended: null }
      return o
    }
    createGain() {
      return { gain: { value: 0 }, connect: () => ({}) }
    }
    resume() {
      return Promise.resolve()
    }
    close() {
      return Promise.resolve()
    }
  }
  vi.stubGlobal('AudioContext', FakeCtx)
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const loads = ref<FeederLoads>((props.loads as FeederLoads) ?? { 'F-01': { reelId: 'R-A', partNo: 'P-10K', qty: 1000, loadedAt: T0 } })
  const log = ref<FeederLogEntry[]>((props.log as FeederLogEntry[]) ?? [])
  const events: { name: string; payload: unknown }[] = []
  const on = (name: string) => (payload: unknown) => events.push({ name, payload })
  const node = () =>
    h(ChptFeederMap, {
      ref: 'map',
      slots,
      now: T0 + 5000,
      operator: '王',
      ...props,
      loads: loads.value,
      log: log.value,
      'onUpdate:loads': (v: FeederLoads) => (loads.value = v),
      'onUpdate:log': (v: FeederLogEntry[]) => (log.value = v),
      onLoad: on('load'),
      onMismatch: on('mismatch'),
      onSelect: on('select'),
      onReject: on('reject'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const map = () => w.findComponent(ChptFeederMap).vm as unknown as {
    scan: (c: string) => void
    selectSlot: (id: string | null) => void
    acknowledge: () => void
    exportCsv: () => void
  }
  const scan = async (code: string) => {
    map().scan(code)
    await nextTick()
    await nextTick()
  }
  const tile = (id: string) => w.findAll('ul.grid button').find((b) => b.attributes('aria-label')!.includes(id))!
  const of = (name: string) => events.filter((e) => e.name === name).map((e) => e.payload)
  return { w, loads, log, events, of, map, scan, tile }
}

describe('ChptFeederMap', () => {
  it('站位圖：分區、狀態、剩餘數量、估計片數；摘要', () => {
    const { w, tile } = mountIt({
      loads: {
        'F-01': { reelId: 'R-A', partNo: 'P-10K', qty: 1000, loadedAt: T0 },
        'F-02': { reelId: 'R-B', partNo: 'P-100N', qty: 50, loadedAt: T0 },
      },
    })
    expect(w.findAll('h4').map((x) => x.text())).toEqual(['前側', '後側'])
    expect(tile('F-01').attributes('aria-label')).toBe('站位 F-01，P-10K，正常，剩 1,000，約 100 片')
    expect(tile('F-02').attributes('aria-label')).toBe('站位 F-02，P-100N，低料，剩 50，約 10 片')
    expect(tile('R-01').attributes('aria-label')).toBe('站位 R-01，P-LDO，未上料')
    expect(tile('R-01').classes()).toContain('border-dashed')
    expect(w.text()).toContain('尚未備齊')
    expect(w.text()).toContain('已上料 2 / 3')
    expect(w.text()).toContain('低料 1')
    expect(w.text()).toContain('最少可生產 10 片')
  })

  it('用完、錯料（例如 BOM 改了）與全部備齊', () => {
    const { w, tile, loads } = mountIt({
      loads: {
        'F-01': { reelId: 'R-A', partNo: 'P-10K', qty: 0, loadedAt: T0 },
        'F-02': { reelId: 'R-B', partNo: 'WRONG', qty: 500, loadedAt: T0 },
        'R-01': { reelId: 'R-C', partNo: 'P-LDO', qty: 500, loadedAt: T0 },
      },
    })
    expect(tile('F-01').attributes('aria-label')).toContain('用完')
    expect(tile('F-02').attributes('aria-label')).toContain('錯料')
    expect(w.text()).toContain('錯料 1')
    expect(w.text()).toContain('用完 1')
    loads.value = {
      'F-01': { reelId: 'R-A', partNo: 'P-10K', qty: 500, loadedAt: T0 },
      'F-02': { reelId: 'R-B', partNo: 'ALT-100N', qty: 500, loadedAt: T0 },
      'R-01': { reelId: 'R-C', partNo: 'P-LDO', qty: 500, loadedAt: T0 },
    }
    return nextTick().then(() => expect(w.text()).toContain('可以生產'))
  })

  it('正確上料：掃站位 → 掃料盤；更新 loads / log、嗶一聲、回到第一步', async () => {
    const { w, scan, of, loads, log, tile } = mountIt()
    await scan('f-02')
    expect(of('select')).toEqual(['F-02'])
    expect(tile('F-02').attributes('aria-pressed')).toBe('true')
    expect(w.find('label').text()).toBe('請掃描要裝在 F-02 的料盤')
    expect(w.findAll('[aria-live="polite"]').at(-1)!.text()).toBe('已選站位 F-02，需要 P-100N，請掃描料盤')
    await scan('ALT-100N|3000|R-NEW|L9')
    expect(loads.value['F-02']).toEqual({ reelId: 'R-NEW', partNo: 'ALT-100N', qty: 3000, lot: 'L9', loadedAt: T0 + 5000, operator: '王' })
    expect(log.value).toEqual([
      { at: T0 + 5000, slot: 'F-02', expected: 'P-100N', reelId: 'R-NEW', partNo: 'ALT-100N', qty: 3000, lot: 'L9', result: 'ok', operator: '王' },
    ])
    expect(of('load')).toHaveLength(1)
    expect(of('select')).toEqual(['F-02', null])
    expect(w.text()).toContain('上料正確')
    expect(w.text()).toContain('F-02 已裝上 ALT-100N × 3,000')
    expect(oscillators).toEqual([1800])
    expect(tile('F-02').attributes('aria-pressed')).toBe('false')
  })

  it('錯料：紅色警示、警報、鎖住直到確認；不上料但寫紀錄', async () => {
    const { w, scan, of, loads, log } = mountIt()
    await scan('R-01')
    await scan('P-10K|100|R-X')
    const alert = w.find('div[role="alert"]')
    expect(alert.text()).toContain('料號錯誤，不可上料！')
    expect(alert.text()).toContain('R-01 需要 P-LDO，掃到的是 P-10K')
    expect(document.activeElement?.textContent?.trim()).toBe('已確認，取下錯料')
    expect(loads.value['R-01']).toBeUndefined()
    expect(log.value[0]).toMatchObject({ slot: 'R-01', result: 'mismatch', partNo: 'P-10K' })
    expect(of('mismatch')).toHaveLength(1)
    expect(oscillators).toEqual([880, 660])
    expect(w.find('input').attributes('disabled')).toBeDefined()
    await scan('P-LDO|100|R-Y')
    expect(of('reject')).toEqual([{ reason: 'locked', code: 'P-LDO|100|R-Y' }])
    // 點站位也不行
    await w.findAll('ul.grid button')[0].trigger('click')
    expect(of('select')).toEqual(['R-01'])
    await alert.find('button').trigger('click')
    expect(w.find('div[role="alert"]').exists()).toBe(false)
    await scan('P-LDO|100|R-Y')
    expect(loads.value['R-01'].reelId).toBe('R-Y')
    expect(log.value.map((e) => e.result)).toEqual(['mismatch', 'ok'])
    // 紀錄表：最新的在上面、錯料標紅
    const rows = w.findAll('tbody tr')
    expect(rows[0].text()).toContain('正確')
    expect(rows[1].classes()).toContain('bg-danger-subtle')
  })

  it('拒絕：沒選站位、無法辨識、格式不符、同一盤已在別的站位', async () => {
    const { w, scan, of } = mountIt()
    await scan('P-10K|1|R-Z')
    await scan('???')
    await scan('F-02')
    await scan('not a reel')
    await scan('P-100N|10|R-A')
    await scan('   ')
    expect(of('reject')).toEqual([
      { reason: 'needSlot', code: 'P-10K|1|R-Z' },
      { reason: 'unknownCode', code: '???' },
      { reason: 'badReel', code: 'not a reel' },
      { reason: 'reelInUse', code: 'P-100N|10|R-A' },
    ])
    expect(w.text()).toContain('料盤 R-A 已裝在 F-01')
  })

  it('點選站位、再點取消；取消鈕', async () => {
    const { w, tile, of } = mountIt()
    await tile('F-02').trigger('click')
    await tile('F-02').trigger('click')
    await tile('R-01').trigger('click')
    await w.findAll('button').find((b) => b.text().includes('取消'))!.trigger('click')
    expect(of('select')).toEqual(['F-02', null, 'R-01', null])
  })

  it('掃描框輸入（ChptScanInput）送出', async () => {
    const { w, of } = mountIt()
    const input = w.find('input')
    await input.setValue('R-01')
    await input.trigger('keydown', { key: 'Enter' })
    expect(of('select')).toEqual(['R-01'])
  })

  it('靜音：不出聲；sound=false 不顯示靜音鈕', async () => {
    const { w, scan } = mountIt()
    await w.findAll('button').find((b) => b.text().includes('靜音'))!.trigger('click')
    expect(w.text()).toContain('開啟聲音')
    await scan('R-01')
    await scan('P-10K|100|R-X')
    expect(oscillators).toEqual([])
    const b = mountIt({ sound: false })
    expect(b.w.text()).not.toContain('靜音')
    await b.scan('R-01')
    await b.scan('P-LDO|100|R-Q')
    expect(oscillators).toEqual([])
  })

  it('沒有 AudioContext 時錯料照常顯示', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const { w, scan } = mountIt()
    await scan('R-01')
    await scan('X|1|Y')
    expect(w.find('div[role="alert"]').exists()).toBe(true)
  })

  it('只看需要處理的；全部正常時顯示提示', async () => {
    const { w, loads } = mountIt()
    await w.find('input[type="checkbox"]').setValue(true)
    expect(w.findAll('ul.grid button')).toHaveLength(2)
    loads.value = {
      'F-01': { reelId: '1', partNo: 'P-10K', qty: 500, loadedAt: T0 },
      'F-02': { reelId: '2', partNo: 'P-100N', qty: 500, loadedAt: T0 },
      'R-01': { reelId: '3', partNo: 'P-LDO', qty: 500, loadedAt: T0 },
    }
    await nextTick()
    expect(w.text()).toContain('所有站位都正常')
  })

  it('maxLog：只保留最近的紀錄', async () => {
    const { scan, log } = mountIt({ maxLog: 2, log: [{ at: 1, slot: 'x', expected: 'a', reelId: 'r', partNo: 'a', qty: 1, result: 'ok' }, { at: 2, slot: 'x', expected: 'a', reelId: 'r', partNo: 'a', qty: 1, result: 'ok' }] })
    await scan('R-01')
    await scan('P-LDO|1|R-9')
    expect(log.value.map((e) => e.at)).toEqual([2, T0 + 5000])
  })

  it('匯出 CSV', async () => {
    const created: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (b: Blob) => (created.push(b), 'blob:x') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const { w, scan } = mountIt({ operator: '' })
    expect(w.findAll('button').find((b) => b.text().includes('匯出紀錄'))!.attributes('disabled')).toBeDefined()
    await scan('R-01')
    await scan('P-10K|100|R-X')
    w.findComponent(ChptFeederMap).vm.acknowledge()
    await scan('P-LDO|100|R-Y')
    await w.findAll('button').find((b) => b.text().includes('匯出紀錄'))!.trigger('click')
    const text = await created[0].text()
    const lines = text.replace(/^\uFEFF/, '').split('\r\n')
    expect(lines[0]).toBe('時間,站位,結果,BOM 料號,掃到料號,料盤,數量,批號,操作員')
    expect(lines[1]).toBe(`${new Date(T0 + 5000).toISOString()},R-01,錯料,P-LDO,P-10K,R-X,100,,`)
    expect(lines[2]).toContain(',R-01,正確,P-LDO,P-LDO,R-Y,100,,')
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })

  it('readonly：沒有掃描區、站位不能點', async () => {
    const { w, map, of, tile } = mountIt({ readonly: true })
    expect(w.find('input:not([type="checkbox"])').exists()).toBe(false)
    expect(tile('F-01').attributes('disabled')).toBeDefined()
    map().scan('R-01')
    map().selectSlot('R-01')
    expect(of('select')).toEqual([])
  })

  it('沒有站位；now 為 Date 或 null', async () => {
    const empty = mountIt({ slots: [] })
    expect(empty.w.text()).toContain('沒有站位')
    const d = mountIt({ now: new Date(T0) })
    await d.scan('R-01')
    await d.scan('P-LDO|1|R-9')
    expect(d.log.value[0].at).toBe(T0)
    vi.useFakeTimers()
    vi.setSystemTime(T0 + 99)
    const n = mountIt({ now: null })
    await n.scan('R-01')
    await n.scan('P-LDO|1|R-9')
    expect(n.log.value[0].at).toBe(T0 + 99)
    vi.advanceTimersByTime(2000)
  })

  it('自訂 parseReel', async () => {
    const { scan, loads } = mountIt({ parseReel: (c: string) => (c.startsWith('[)>') ? { partNo: 'P-LDO', qty: 7, reelId: c.slice(3) } : null) })
    await scan('R-01')
    await scan('[)>ABC')
    expect(loads.value['R-01']).toMatchObject({ reelId: 'ABC', qty: 7 })
  })

  it('英文語系', () => {
    const { w, tile } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.text()).toContain('Loaded 1 / 3')
    expect(tile('F-01').attributes('aria-label')).toBe('Slot F-01, P-10K, OK, 1,000 left, about 100 boards')
  })
})
