import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptAlarmCenter from '@/components/library/ui/ChptAlarmCenter.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { AlarmItem } from '@/components/library/shared/alarm'

const NOW = Date.UTC(2026, 10, 23, 8, 0)
const ago = (min: number) => NOW - min * 60_000

const seed = (): AlarmItem[] => [
  { id: 'a', title: '吸嘴真空異常', severity: 'critical', code: 'E-1023', source: 'SMT-02', raisedAt: ago(25), count: 3, detail: '檢查吸嘴' },
  { id: 'b', title: '溫度偏高', severity: 'major', source: 'Oven', raisedAt: ago(9), cleared: true },
  { id: 'c', title: '即將缺料', severity: 'minor', source: 'SMT-07', raisedAt: ago(6) },
  { id: 'd', title: '通訊中斷', severity: 'major', source: 'AOI-02', raisedAt: ago(8), acked: true, ackedBy: '陳', ackedAt: ago(5) },
  { id: 'e', title: '保養到期', severity: 'info', raisedAt: ago(95), acked: true, cleared: true },
  { id: 'f', title: '誤判率高', severity: 'minor', raisedAt: ago(40), shelvedUntil: NOW + 50 * 60_000 },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function mountIt(props: Record<string, unknown> = {}, wrap?: (node: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const model = ref<AlarmItem[]>((props.modelValue as AlarmItem[]) ?? seed())
  const events: Record<string, unknown[][]> = {}
  const rec = (name: string) => (...args: unknown[]) => (events[name] ??= []).push(args)
  const node = () =>
    h(ChptAlarmCenter, {
      now: NOW,
      operator: '王',
      ...props,
      modelValue: model.value,
      'onUpdate:modelValue': (v: AlarmItem[]) => (model.value = v),
      onAck: rec('ack'),
      onShelve: rec('shelve'),
      onUnshelve: rec('unshelve'),
      onEscalate: rec('escalate'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const rows = () => w.findAll('li[aria-expanded]')
  const row = (title: string) => rows().find((r) => r.text().includes(title))!
  const btn = (scope: { findAll: VueWrapper['findAll'] }, text: string) => scope.findAll('button').find((b) => b.text().includes(text))
  return { w, model, events, rows, row, btn }
}

describe('ChptAlarmCenter', () => {
  it('預設只顯示未處理：未確認在前、依嚴重度；已結束與暫停不顯示', () => {
    const { rows } = mountIt()
    expect(rows().map((r) => r.text().split('·')[0])).toHaveLength(4)
    const titles = rows().map((r) => r.attributes('aria-label'))
    expect(titles[0]).toContain('吸嘴真空異常')
    expect(titles[1]).toContain('溫度偏高')
    expect(titles[2]).toContain('即將缺料')
    expect(titles[3]).toContain('通訊中斷')
    expect(titles[0]).toBe('嚴重, 吸嘴真空異常, SMT-02, 未確認, 25 分前')
    expect(titles[1]).toContain('已恢復')
  })

  it('列內容：重複次數、代碼、來源、經過時間、狀態；已恢復標籤', () => {
    const { row } = mountIt()
    expect(row('吸嘴真空異常').text()).toContain('×3')
    expect(row('吸嘴真空異常').text()).toContain('E-1023')
    expect(row('吸嘴真空異常').text()).toContain('25 分前')
    expect(row('溫度偏高').text()).toContain('已恢復')
    expect(row('通訊中斷').text()).toContain('已確認')
  })

  it('摘要：各嚴重度未確認數量，點了篩選', async () => {
    const { w, rows } = mountIt()
    const group = w.find('[role="group"][aria-label="依嚴重度篩選"]')
    const chips = group.findAll('button')
    expect(chips.map((c) => c.text().replace(/\s+/g, ''))).toEqual(['error嚴重1', 'warning重要1', 'info次要1', 'notifications提示0'])
    await chips[1].trigger('click')
    expect(chips[1].attributes('aria-pressed')).toBe('true')
    expect(rows()).toHaveLength(2)
    await chips[1].trigger('click')
    expect(rows()).toHaveLength(4)
  })

  it('檢視切換：未確認、暫停、全部（含數量）', async () => {
    const { w, rows } = mountIt()
    const radios = w.findAll('[role="radio"]')
    expect(radios.map((r) => r.text())).toEqual(['未處理 4', '未確認 3', '暫停 1', '全部 6'])
    await radios[1].trigger('click')
    expect(rows()).toHaveLength(3)
    await radios[2].trigger('click')
    expect(rows()).toHaveLength(1)
    expect(rows()[0].text()).toContain('暫停中')
    await radios[3].trigger('click')
    expect(rows()).toHaveLength(6)
    expect(rows()[5].text()).toContain('已結束')
  })

  it('搜尋：比對訊息、代碼、來源；沒有結果時顯示提示', async () => {
    const { w, rows } = mountIt()
    await w.find('input[type="search"]').setValue('e-1023')
    expect(rows()).toHaveLength(1)
    await w.find('input[type="search"]').setValue('zzz')
    expect(rows()).toHaveLength(0)
    expect(w.text()).toContain('沒有符合條件的警報')
  })

  it('空清單', () => {
    const { w } = mountIt({ modelValue: [] })
    expect(w.text()).toContain('目前沒有警報')
  })

  it('確認：記下確認人與時間，送出 ack；已恢復的確認後結束', async () => {
    const { row, btn, model, events, rows, w } = mountIt()
    await btn(row('溫度偏高'), '確認')!.trigger('click')
    expect(events.ack).toEqual([[['b']]])
    expect(model.value[1]).toMatchObject({ acked: true, ackedBy: '王', ackedAt: NOW })
    await nextTick()
    expect(rows()).toHaveLength(3)
    expect(w.find('[aria-live="assertive"]').text()).toBe('已確認 1 筆警報')
  })

  it('全部確認：畫面上所有未確認的', async () => {
    const { w, btn, events, model } = mountIt()
    const all = btn(w, '全部確認')!
    expect(all.text()).toContain('3')
    await all.trigger('click')
    expect(events.ack[0][0]).toEqual(['a', 'b', 'c'])
    expect(model.value.filter((a) => a.acked)).toHaveLength(5)
    await nextTick()
    expect(btn(w, '全部確認')!.attributes('disabled')).toBeDefined()
  })

  it('暫停：選時間後移到暫停，送出 shelve；恢復提醒', async () => {
    const { w, row, btn, events, model, rows } = mountIt()
    const shelveBtn = btn(row('即將缺料'), '暫停')!
    expect(shelveBtn.attributes('aria-expanded')).toBe('false')
    // 取消：關閉選項、焦點回到列
    await shelveBtn.trigger('click')
    await nextTick()
    expect(document.activeElement?.textContent).toContain('15 分鐘')
    await btn(row('即將缺料').find('[role="group"]'), '取消')!.trigger('click')
    await nextTick()
    expect(row('即將缺料').find('[role="group"]').exists()).toBe(false)
    expect(document.activeElement).toBe(row('即將缺料').element)
    // Esc 也關閉；再按一次按鈕也關閉
    await shelveBtn.trigger('click')
    await row('即將缺料').find('[role="group"]').trigger('keydown', { key: 'Escape' })
    expect(row('即將缺料').find('[role="group"]').exists()).toBe(false)
    await shelveBtn.trigger('click')
    await shelveBtn.trigger('click')
    expect(row('即將缺料').find('[role="group"]').exists()).toBe(false)
    await shelveBtn.trigger('click')
    await nextTick()
    const panel = row('即將缺料').find('[role="group"][aria-label="暫停"]')
    expect(shelveBtn.attributes('aria-expanded')).toBe('true')
    await btn(panel, '1 小時')!.trigger('click')
    expect(events.shelve).toEqual([[['c'], 60]])
    expect(model.value[2].shelvedUntil).toBe(NOW + 3_600_000)
    await nextTick()
    expect(rows()).toHaveLength(3)
    await w.findAll('[role="radio"]')[2].trigger('click')
    expect(rows()).toHaveLength(2)
    await btn(row('即將缺料'), '恢復提醒')!.trigger('click')
    expect(events.unshelve).toEqual([[['c']]])
    expect(model.value[2].shelvedUntil).toBeNull()
  })

  it('升級：次數累加，顯示已升級', async () => {
    const { row, btn, events, model } = mountIt()
    await btn(row('吸嘴真空異常'), '升級')!.trigger('click')
    expect(events.escalate).toEqual([[['a']]])
    expect(model.value[0].escalated).toBe(1)
    await nextTick()
    expect(row('吸嘴真空異常').text()).toContain('已升級')
    await btn(row('吸嘴真空異常'), '升級')!.trigger('click')
    await nextTick()
    expect(row('吸嘴真空異常').text()).toContain('已升級 2 次')
  })

  it('展開：說明與歷程（發生、確認、恢復）；detail 插槽', async () => {
    const { row, rows } = mountIt({}, undefined)
    await row('吸嘴真空異常').find('button').trigger('click')
    expect(row('吸嘴真空異常').attributes('aria-expanded')).toBe('true')
    expect(row('吸嘴真空異常').text()).toContain('檢查吸嘴')
    expect(row('吸嘴真空異常').text()).toContain('發生：')
    await row('通訊中斷').find('button').trigger('click')
    expect(row('吸嘴真空異常').attributes('aria-expanded')).toBe('false')
    expect(row('通訊中斷').text()).toContain('確認：陳，')
    await row('通訊中斷').find('button').trigger('click')
    expect(rows().every((r) => r.attributes('aria-expanded') === 'false')).toBe(true)
  })

  it('detail 插槽與恢復時間', async () => {
    const w = mount(ChptAlarmCenter, {
      props: { modelValue: seed(), now: NOW, defaultView: 'all' },
      slots: { detail: (p: { alarm: AlarmItem }) => h('i', { class: 'slot' }, p.alarm.id) },
      attachTo: document.body,
    })
    mounted.push(w)
    const r = w.findAll('li[aria-expanded]').find((x) => x.text().includes('保養到期'))!
    await r.trigger('keydown', { key: 'Enter' })
    expect(r.find('.slot').text()).toBe('e')
    expect(r.text()).toContain('恢復：')
  })

  it('鍵盤：roving tabindex、↑↓ Home End 移動，A 確認、S 暫停 / 恢復、E 升級', async () => {
    const { rows, events, model } = mountIt()
    expect(rows().map((r) => r.attributes('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
    await rows()[0].trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(rows()[1].attributes('tabindex')).toBe('0')
    expect(document.activeElement).toBe(rows()[1].element)
    await rows()[1].trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement).toBe(rows()[3].element)
    await rows()[3].trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(document.activeElement).toBe(rows()[0].element)
    await rows()[0].trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(rows()[0].element)
    await rows()[0].trigger('keydown', { key: 'x' })
    await rows()[1].trigger('keydown', { key: 'A' })
    expect(events.ack).toEqual([[['b']]])
    await nextTick()
    await nextTick()
    // 已恢復 + 確認 = 結束、離開清單：焦點留在同一個位置
    expect(rows()).toHaveLength(3)
    expect(document.activeElement).toBe(rows()[1].element)
    await rows()[0].trigger('keydown', { key: 'A' })
    await nextTick()
    await rows()[0].trigger('keydown', { key: 'e' })
    expect(events.escalate).toHaveLength(1)
    await rows()[0].trigger('keydown', { key: 's' })
    // 確認後 a 排到未確認的 c 之後
    expect(events.shelve).toEqual([[['c'], 15]])
    expect(model.value[2].shelvedUntil).toBe(NOW + 15 * 60_000)
  })

  it('鍵盤：S 在暫停的警報上是恢復提醒；按鈕上的按鍵不處理', async () => {
    const { rows, events, w } = mountIt({ defaultView: 'shelved' })
    await rows()[0].trigger('keydown', { key: 's' })
    expect(events.unshelve).toEqual([[['f']]])
    await nextTick()
    await w.findAll('[role="radio"]')[0].trigger('click')
    await rows()[0].findAll('button')[1].trigger('keydown', { key: 'a' })
    expect(events.ack).toBeUndefined()
  })

  it('readonly：沒有操作按鈕，快捷鍵無效', async () => {
    const { w, rows, events } = mountIt({ readonly: true })
    expect(w.text()).not.toContain('全部確認')
    expect(w.findAll('li button').some((b) => /check|snooze|campaign/.test(b.text()))).toBe(false)
    await rows()[0].trigger('keydown', { key: 'a' })
    await rows()[0].trigger('keydown', { key: 'e' })
    expect(events.ack).toBeUndefined()
    expect(events.escalate).toBeUndefined()
    ;(w.findComponent(ChptAlarmCenter).vm as unknown as { ack: () => void }).ack()
    expect(events.ack).toBeUndefined()
  })

  it('新警報：aria-live 念出最嚴重的一筆；sound 時響', async () => {
    const oscs: unknown[] = []
    class FakeCtx {
      state = 'running'
      currentTime = 0
      destination = {}
      createOscillator() {
        const o = { frequency: { value: 0 }, connect: (g: unknown) => g, start: () => {}, stop: () => {} }
        oscs.push(o)
        return o
      }
      createGain() {
        return { gain: { value: 0 }, connect: () => {} }
      }
      close() {
        return Promise.resolve()
      }
    }
    vi.stubGlobal('AudioContext', FakeCtx)
    const { model, w } = mountIt({ sound: true })
    model.value = [
      { id: 'n1', title: '缺料', severity: 'minor', source: 'X', raisedAt: NOW },
      { id: 'n2', title: '急停', severity: 'critical', source: 'SMT-04', raisedAt: NOW },
      ...model.value,
    ]
    await nextTick()
    await nextTick()
    expect(w.find('[aria-live="assertive"]').text()).toBe('新嚴重警報：SMT-04 急停，另有 1 筆')
    expect(oscs).toHaveLength(2)
    // 已確認的新警報不念
    model.value = [{ id: 'n3', title: 'x', severity: 'critical', raisedAt: NOW, acked: true }, ...model.value]
    await nextTick()
    expect(w.find('[aria-live="assertive"]').text()).toBe('新嚴重警報：SMT-04 急停，另有 1 筆')
    vi.unstubAllGlobals()
  })

  it('sound：有未確認的嚴重 / 重要警報時定時響；靜音後不響', async () => {
    vi.useFakeTimers()
    let plays = 0
    class FakeCtx {
      state = 'running'
      currentTime = 0
      destination = {}
      createOscillator() {
        plays++
        return { frequency: { value: 0 }, connect: (g: unknown) => g, start: () => {}, stop: () => {} }
      }
      createGain() {
        return { gain: { value: 0 }, connect: () => {} }
      }
    }
    vi.stubGlobal('AudioContext', FakeCtx)
    const { w, btn } = mountIt({ sound: true, soundInterval: 1000 })
    vi.advanceTimersByTime(1000)
    expect(plays).toBe(2) // 嚴重：兩聲
    const mute = btn(w, '靜音')!
    expect(mute.attributes('aria-pressed')).toBe('false')
    await mute.trigger('click')
    expect(btn(w, '取消靜音')).toBeTruthy()
    vi.advanceTimersByTime(3000)
    expect(plays).toBe(2)
    vi.unstubAllGlobals()
  })

  it('沒有 now 時每 15 秒更新經過時間；清單更新時也更新（新警報不會是負的）', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const { row, model } = mountIt({ now: null })
    expect(row('即將缺料').text()).toContain('6 分前')
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(row('即將缺料').text()).toContain('7 分前')
    vi.setSystemTime(NOW + 70_000)
    model.value = [{ id: 'n', title: '新的', severity: 'minor', raisedAt: NOW + 70_000 }, ...model.value]
    await nextTick()
    await nextTick()
    expect(row('新的').text()).toContain('不到 1 分前')
  })

  it('ack() 方法：確認畫面上未確認的', async () => {
    const { w, events } = mountIt()
    ;(w.findComponent(ChptAlarmCenter).vm as unknown as { ack: (ids?: string[]) => void }).ack()
    expect(events.ack[0][0]).toEqual(['a', 'b', 'c'])
  })

  it('英文語系', () => {
    const { w, rows } = mountIt({}, (node) => h(ChptConfigProvider, { locale: enUS }, () => node))
    expect(rows()[0].attributes('aria-label')).toBe('Critical, 吸嘴真空異常, SMT-02, Unacked, 25 min ago')
    expect(w.text()).toContain('Ack all (3)')
    expect(w.findAll('[role="radio"]')[0].text()).toBe('Open 4')
  })
})
