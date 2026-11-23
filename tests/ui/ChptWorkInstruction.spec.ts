import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptWorkInstruction from '@/components/library/ui/ChptWorkInstruction.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { WiRecord, WiStep, WiSummary } from '@/components/library/shared/workInstruction'

const T0 = 1_000_000
const steps: WiStep[] = [
  {
    id: 's1',
    title: '停機',
    body: '按停止',
    image: 'a.png',
    marks: [{ x: 0.5, y: 0.4, label: '停止鈕' }, { x: 0.2, y: 0.5 }],
    cautions: ['小心'],
    check: { kind: 'confirm', label: '已停機' },
  },
  { id: 's2', title: '量扭力', specs: [{ label: '扭力', value: '1.2', unit: 'N·m' }], check: { kind: 'measure', label: '扭力', unit: 'N·m', lsl: 1.1, usl: 1.3, precision: 2 } },
  { id: 's3', title: '看程式', minSeconds: 5 },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
})

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const record = ref<WiRecord>((props.record as WiRecord) ?? {})
  const current = ref((props.current as number) ?? 0)
  const now = ref<number | null>('now' in props ? (props.now as number | null) : T0)
  const completes: WiSummary[] = []
  const node = () =>
    h(ChptWorkInstruction, {
      steps,
      ...props,
      now: now.value,
      record: record.value,
      current: current.value,
      'onUpdate:record': (v: WiRecord) => (record.value = v),
      'onUpdate:current': (v: number) => (current.value = v),
      onComplete: (s: WiSummary) => completes.push(s),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const next = () => w.findAll('article button').at(-1)!
  const prev = () => w.findAll('article button')[0]
  const dots = () => w.findAll('ol[aria-label="步驟"] button')
  return { w, record, current, now, completes, next, prev, dots }
}

describe('ChptWorkInstruction', () => {
  it('第一步：標題、圖片與標記、說明、注意事項、確認；進入時記下開始時間', () => {
    const { w, record } = mountIt({ title: '換線' })
    expect(w.text()).toContain('步驟 1 / 3')
    expect(w.find('h4').text()).toContain('停機')
    expect(w.find('img').attributes('alt')).toBe('停機')
    expect(w.findAll('article span.absolute')).toHaveLength(2)
    expect(w.text()).toContain('停止鈕')
    expect(w.find('[role="note"]').text()).toContain('小心')
    expect(record.value.s1.startedAt).toBe(T0)
  })

  it('確認之前不能下一步（說明原因）；確認後前進，記下完成時間', async () => {
    const { w, next, record, current, now } = mountIt()
    expect(next().attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('請先勾選確認')
    await w.find('input[type="checkbox"]').setValue(true)
    expect(record.value.s1.confirmed).toBe(true)
    now.value = T0 + 3000
    await nextTick()
    await next().trigger('click')
    expect(record.value.s1.completedAt).toBe(T0 + 3000)
    expect(current.value).toBe(1)
    expect(record.value.s2.startedAt).toBe(T0 + 3000)
    expect(w.find('[aria-live="polite"]').text()).toBe('第 2 步：量扭力')
  })

  it('量測：超出規格不能下一步、合格標示、規格範圍', async () => {
    const { w, next, record } = mountIt({ current: 1, record: { s1: { startedAt: T0, completedAt: T0, confirmed: true } } })
    expect(w.text()).toContain('規格 1.1 ～ 1.3 N·m')
    expect(w.text()).toContain('請輸入量測值')
    const input = w.find('input[type="number"]')
    await input.setValue('1.45')
    expect(record.value.s2).toMatchObject({ value: 1.45, ok: false })
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(w.text()).toContain('超出規格')
    expect(next().attributes('disabled')).toBeDefined()
    await input.setValue('1.2')
    expect(w.text()).toContain('合格')
    expect(next().attributes('disabled')).toBeUndefined()
    await input.setValue('')
    expect(record.value.s2.value).toBeNull()
  })

  it('停留時間：到了才能下一步；最後一步完成時送出 complete 並顯示摘要', async () => {
    const rec: WiRecord = {
      s1: { startedAt: T0, completedAt: T0 + 1000, confirmed: true },
      s2: { startedAt: T0 + 1000, completedAt: T0 + 4000, value: 1.22, ok: true },
    }
    const { w, next, now, completes, dots } = mountIt({ current: 2, record: rec, now: T0 + 4000 })
    expect(w.text()).toContain('請再看 5 秒')
    expect(next().text()).toContain('完成')
    now.value = T0 + 9000
    await nextTick()
    expect(next().attributes('disabled')).toBeUndefined()
    await next().trigger('click')
    expect(completes[0]).toMatchObject({ startedAt: T0, completedAt: T0 + 9000, durationMs: 9000 })
    expect(completes[0].steps[1]).toMatchObject({ value: 1.22, ok: true })
    await nextTick()
    expect(w.text()).toContain('全部完成，共 00:09')
    expect(w.text()).toContain('1.22 N·m')
    expect(dots().every((d) => d.text() === 'check')).toBe(true)
    // 重新開始
    await w.findAll('button').find((b) => b.text().includes('重新開始'))!.trigger('click')
    expect(w.text()).toContain('步驟 1 / 3')
  })

  it('步驟列：只能跳到已完成或第一個未完成的；上一步', async () => {
    const { dots, current, prev } = mountIt({ current: 1, record: { s1: { startedAt: T0, completedAt: T0, confirmed: true } } })
    expect(dots()[2].attributes('disabled')).toBeDefined()
    expect(dots()[0].attributes('aria-label')).toBe('第 1 步：停機（已完成）')
    expect(dots()[1].attributes('aria-current')).toBe('step')
    await dots()[0].trigger('click')
    expect(current.value).toBe(0)
    // 已完成的步驟：可以直接下一步
    await prev().trigger('click') // 第一步：上一步停用，不動
    expect(current.value).toBe(0)
  })

  it('鍵盤：← → 與 PageUp / PageDown；輸入框裡不處理', async () => {
    const { w, current } = mountIt({ current: 1, record: { s1: { startedAt: T0, completedAt: T0, confirmed: true }, s2: { startedAt: T0, value: 1.2, ok: true } } })
    const article = w.find('article')
    await article.trigger('keydown', { key: 'ArrowLeft' })
    expect(current.value).toBe(0)
    await w.find('article').trigger('keydown', { key: 'PageDown' })
    expect(current.value).toBe(1)
    await w.find('input[type="number"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(current.value).toBe(1)
    await w.find('article').trigger('keydown', { key: 'ArrowRight' })
    expect(current.value).toBe(2)
    await w.find('article').trigger('keydown', { key: 'PageUp' })
    expect(current.value).toBe(1)
    await w.find('article').trigger('keydown', { key: 'x' })
  })

  it('左右滑動切換；垂直滑動或距離太短不切換；按鈕上不算', async () => {
    const { w, current } = mountIt({ current: 1, record: { s1: { startedAt: T0, completedAt: T0, confirmed: true }, s2: { startedAt: T0, value: 1.2, ok: true } } })
    const swipe = async (x0: number, x1: number, y1 = 100, target?: Element) => {
      const el = target ?? w.find('article').element
      const ev = (type: string, x: number, y: number) => {
        const e = new Event(type, { bubbles: true })
        Object.defineProperties(e, { clientX: { value: x }, clientY: { value: y }, pointerId: { value: 1 } })
        el.dispatchEvent(e)
      }
      ev('pointerdown', x0, 100)
      ev('pointerup', x1, y1)
      await nextTick()
    }
    await swipe(300, 100)
    expect(current.value).toBe(2)
    await swipe(100, 300)
    expect(current.value).toBe(1)
    await swipe(300, 270)
    await swipe(300, 150, 400)
    expect(current.value).toBe(1)
    await swipe(300, 100, 100, w.find('input[type="number"]').element)
    expect(current.value).toBe(1)
  })

  it('readonly：不能勾選、輸入、前進；不記開始時間', () => {
    const { w, record, next } = mountIt({ readonly: true })
    expect(w.find('input[type="checkbox"]').attributes('disabled')).toBeDefined()
    expect(next().attributes('disabled')).toBeDefined()
    expect(record.value).toEqual({})
  })

  it('沒有 now 時每秒更新計時', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const { w } = mountIt({ now: null })
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(w.text()).toContain('本步驟 00:03')
  })

  it('外部改 current 與 record', async () => {
    const { w, current, record } = mountIt()
    record.value = { s1: { startedAt: T0, completedAt: T0, confirmed: true } }
    current.value = 1
    await nextTick()
    expect(w.find('h4').text()).toContain('量扭力')
  })

  it('英文語系', () => {
    const { w } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.text()).toContain('Step 1 of 3')
    expect(w.text()).toContain('Please confirm first')
  })
})
