import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptCronInput from '@/components/library/ui/ChptCronInput.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

const NOW = new Date(2026, 10, 24, 8, 0) // 週二

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
})

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const expr = ref((props.modelValue as string) ?? '30 8 * * 1-5')
  const node = () => h(ChptCronInput, { now: NOW, ...props, modelValue: expr.value, 'onUpdate:modelValue': (v: string) => (expr.value = v) })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const modeBtn = (label: string) => w.find('[role="group"]').findAll('button').find((b) => b.text() === label)!
  const desc = () => w.find('[aria-live="polite"]').text().replace(/\s+/g, ' ')
  const input = () => w.find('input[type="text"]')
  return { w, expr, modeBtn, desc, input }
}

describe('ChptCronInput', () => {
  it('從表達式推出模式；說明與下次執行時間', () => {
    const { w, modeBtn, desc, input } = mountIt()
    expect(modeBtn('每週').attributes('aria-pressed')).toBe('true')
    expect((input().element as HTMLInputElement).value).toBe('30 8 * * 1-5')
    expect(desc()).toContain('每週一–五，08:30')
    expect(w.findAll('ol li').map((li) => li.text())).toEqual([
      '2026-11-24（二）08:30',
      '2026-11-25（三）08:30',
      '2026-11-26（四）08:30',
      '2026-11-27（五）08:30',
      '2026-11-30（一）08:30',
    ])
    const vm = w.findComponent(ChptCronInput).vm as unknown as { valid: boolean; description: string }
    expect(vm.valid).toBe(true)
    expect(vm.description).toBe('每週一–五，08:30')
  })

  it('切換模式產生對應的表達式；自訂保留表達式', async () => {
    const { expr, modeBtn, input } = mountIt()
    await modeBtn('每 N 分鐘').trigger('click')
    expect(expr.value).toBe('*/15 * * * *')
    await modeBtn('每小時').trigger('click')
    expect(expr.value).toBe('0 * * * *')
    await modeBtn('每天').trigger('click')
    expect(expr.value).toBe('0 8 * * *')
    await modeBtn('每月').trigger('click')
    expect(expr.value).toBe('0 8 1 * *')
    await modeBtn('自訂').trigger('click')
    expect(expr.value).toBe('0 8 1 * *')
    expect(modeBtn('自訂').attributes('aria-pressed')).toBe('true')
    // 自訂模式下改表達式成簡單的，仍停在自訂直到選別的模式
    await input().setValue('0 9 * * *')
    await input().trigger('change')
    expect(expr.value).toBe('0 9 * * *')
    expect(modeBtn('自訂').attributes('aria-pressed')).toBe('true')
    await modeBtn('每天').trigger('click')
    expect(modeBtn('每天').attributes('aria-pressed')).toBe('true')
  })

  it('簡易設定：每 N 分鐘、每小時、時間、星期、日期（至少留一個）', async () => {
    const { w, expr, modeBtn } = mountIt({ modelValue: '*/5 * * * *' })
    await w.find('select[aria-label="每幾分鐘"]').setValue('30')
    expect(expr.value).toBe('*/30 * * * *')
    await modeBtn('每小時').trigger('click')
    await w.find('select[aria-label="分"]').setValue('45')
    expect(expr.value).toBe('45 * * * *')
    await modeBtn('每週').trigger('click')
    expect(expr.value).toBe('45 8 * * 1,2,3,4,5')
    await w.find('select[aria-label="時"]').setValue('17')
    expect(expr.value).toBe('45 17 * * 1,2,3,4,5')
    const day = (label: string) => w.find('[aria-label="星期"]').findAll('button').find((b) => b.text() === label)!
    await day('六').trigger('click')
    await day('一').trigger('click')
    expect(expr.value).toBe('45 17 * * 2,3,4,5,6')
    expect(day('六').attributes('aria-pressed')).toBe('true')
    await modeBtn('每月').trigger('click')
    const date = (n: number) => w.find('[aria-label="日期"]').findAll('button')[n - 1]
    await date(15).trigger('click')
    expect(expr.value).toBe('45 17 1,15 * *')
    await date(1).trigger('click')
    await date(15).trigger('click') // 最後一個不能取消
    expect(expr.value).toBe('45 17 15 * *')
  })

  it('直接改表達式：輸入時即時說明錯誤；Enter / change 才送出，並整理空白', async () => {
    const { expr, input, desc, modeBtn } = mountIt()
    await input().setValue('61 * * * *')
    expect(desc()).toContain('「分」欄的 61 無效')
    expect(input().attributes('aria-invalid')).toBe('true')
    await input().trigger('change')
    expect(expr.value).toBe('30 8 * * 1-5')
    await input().setValue('0 12 * *')
    expect(desc()).toContain('需要 5 欄（分 時 日 月 週），目前 4 欄')
    await input().setValue('  */10   9-17 * * 1-5 ')
    await input().trigger('keydown', { key: 'Enter' })
    expect(expr.value).toBe('*/10 9-17 * * 1-5')
    expect(modeBtn('自訂').attributes('aria-pressed')).toBe('true')
    expect(desc()).toContain('每週一–五，9–17 時每 10 分鐘')
    // 外部改 v-model
    expr.value = '0 0 1 1 *'
    await nextTick()
    expect((input().element as HTMLInputElement).value).toBe('0 0 1 1 *')
    expect(desc()).toContain('限 1 月')
  })

  it('找不到執行時間、不列下次執行、readonly', async () => {
    expect(mountIt({ modelValue: '0 0 30 2 *' }).desc()).toContain('找不到符合的時間')
    const none = mountIt({ showNext: 0 })
    expect(none.w.find('ol').exists()).toBe(false)
    const ro = mountIt({ readonly: true })
    expect(ro.w.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
    expect(ro.input().attributes('disabled')).toBeDefined()
    await ro.modeBtn('每天').trigger('click')
    expect(ro.expr.value).toBe('30 8 * * 1-5')
  })

  it('不給 now 時用現在並每分鐘更新；Date 以外的 now；英文語系', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 8, 59))
    const { w } = mountIt({ now: null, modelValue: '0 9 * * *', showNext: 1 })
    expect(w.find('ol li').text()).toBe('2026-01-05（一）09:00')
    vi.setSystemTime(new Date(2026, 0, 5, 9, 1))
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(w.find('ol li').text()).toBe('2026-01-06（二）09:00')
    vi.useRealTimers()
    expect(mountIt({ now: NOW.getTime(), showNext: 1 }).w.find('ol li').text()).toBe('2026-11-24（二）08:30')
    const en = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.desc()).toContain('At 08:30, on Mon–Fri')
    expect(en.w.find('ol li').text()).toBe('2026-11-24 (Tue) 08:30')
  })
})
