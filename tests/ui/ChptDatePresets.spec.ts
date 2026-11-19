import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChptDatePicker from '@/components/library/ui/ChptDatePicker.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import { resolveDatePreset, resolvePresetValue, shiftRange, type DatePresetKey } from '@/components/library/shared/datePresets'

/** 本地時間的 'YYYY-MM-DD HH:mm:ss.SSS' */
function fmt(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}
const range = (key: DatePresetKey, now: Date, opts = {}) => resolveDatePreset(key, now, opts).map(fmt)

// 2026-11-19 是星期四
const THU = new Date(2026, 10, 19, 14, 30)

describe('resolveDatePreset', () => {
  it('今天 / 昨天：整天（含結束當天 23:59:59.999）', () => {
    expect(range('today', THU)).toEqual(['2026-11-19 00:00:00.000', '2026-11-19 23:59:59.999'])
    expect(range('yesterday', THU)).toEqual(['2026-11-18 00:00:00.000', '2026-11-18 23:59:59.999'])
  })

  it('本週 / 上週：預設週一開始；weekStart=0 時週日開始', () => {
    expect(range('thisWeek', THU)).toEqual(['2026-11-16 00:00:00.000', '2026-11-22 23:59:59.999'])
    expect(range('lastWeek', THU)).toEqual(['2026-11-09 00:00:00.000', '2026-11-15 23:59:59.999'])
    expect(range('thisWeek', THU, { weekStart: 0 })).toEqual(['2026-11-15 00:00:00.000', '2026-11-21 23:59:59.999'])
    // 週日本身：週一開始時屬於前一週
    expect(range('thisWeek', new Date(2026, 10, 22))[0]).toBe('2026-11-16 00:00:00.000')
  })

  it('近 7 天 / 近 30 天：含今天', () => {
    expect(range('last7Days', THU)).toEqual(['2026-11-13 00:00:00.000', '2026-11-19 23:59:59.999'])
    expect(range('last30Days', THU)[0]).toBe('2026-10-21 00:00:00.000')
  })

  it('本月 / 上月：跨年、閏年', () => {
    expect(range('thisMonth', THU)).toEqual(['2026-11-01 00:00:00.000', '2026-11-30 23:59:59.999'])
    expect(range('lastMonth', new Date(2027, 0, 5))).toEqual(['2026-12-01 00:00:00.000', '2026-12-31 23:59:59.999'])
    expect(range('thisMonth', new Date(2028, 1, 10))[1]).toBe('2028-02-29 23:59:59.999')
    expect(range('lastMonth', new Date(2026, 2, 31))).toEqual(['2026-02-01 00:00:00.000', '2026-02-28 23:59:59.999'])
  })

  it('本季 / 今年', () => {
    expect(range('thisQuarter', THU)).toEqual(['2026-10-01 00:00:00.000', '2026-12-31 23:59:59.999'])
    expect(range('thisQuarter', new Date(2026, 1, 3))).toEqual(['2026-01-01 00:00:00.000', '2026-03-31 23:59:59.999'])
    expect(range('thisYear', THU)).toEqual(['2026-01-01 00:00:00.000', '2026-12-31 23:59:59.999'])
  })
})

describe('shiftRange（班別）', () => {
  const two = [
    { name: '早班', start: '08:00' },
    { name: '晚班', start: '20:00' },
  ]

  it('白天在早班；上一班是前一天的晚班', () => {
    const cur = shiftRange(THU, two, 0)
    expect(cur.shift.name).toBe('早班')
    expect(cur.range.map(fmt)).toEqual(['2026-11-19 08:00:00.000', '2026-11-19 19:59:59.999'])
    const prev = shiftRange(THU, two, -1)
    expect(prev.shift.name).toBe('晚班')
    expect(prev.range.map(fmt)).toEqual(['2026-11-18 20:00:00.000', '2026-11-19 07:59:59.999'])
  })

  it('凌晨仍屬於前一天開始的晚班（跨午夜）', () => {
    const cur = shiftRange(new Date(2026, 10, 19, 2, 15), two, 0)
    expect(cur.shift.name).toBe('晚班')
    expect(cur.range.map(fmt)).toEqual(['2026-11-18 20:00:00.000', '2026-11-19 07:59:59.999'])
    expect(shiftRange(new Date(2026, 10, 19, 2, 15), two, -1).range.map(fmt)).toEqual(['2026-11-18 08:00:00.000', '2026-11-18 19:59:59.999'])
  })

  it('剛好在換班時刻屬於新的一班；三班制、順序不拘', () => {
    expect(shiftRange(new Date(2026, 10, 19, 20, 0), two, 0).shift.name).toBe('晚班')
    const three = [
      { name: 'C', start: '22:00' },
      { name: 'A', start: '06:00' },
      { name: 'B', start: '14:00' },
    ]
    expect(shiftRange(THU, three, 0).shift.name).toBe('B')
    expect(shiftRange(THU, three, 0).range.map(fmt)).toEqual(['2026-11-19 14:00:00.000', '2026-11-19 21:59:59.999'])
    expect(shiftRange(new Date(2026, 10, 19, 23, 0), three, 0).range.map(fmt)).toEqual(['2026-11-19 22:00:00.000', '2026-11-20 05:59:59.999'])
  })

  it('格式錯誤或沒有班別時丟出錯誤', () => {
    expect(() => shiftRange(THU, [])).toThrow()
    expect(() => shiftRange(THU, [{ name: 'X', start: '8點' }])).toThrow('HH:mm')
    expect(() => shiftRange(THU, [{ name: 'X', start: '25:00' }])).toThrow()
  })

  it('resolveDatePreset 的班別 key；不給 shifts 時用兩班制 08:00 / 20:00', () => {
    expect(range('currentShift', THU)).toEqual(['2026-11-19 08:00:00.000', '2026-11-19 19:59:59.999'])
    expect(range('previousShift', THU)[0]).toBe('2026-11-18 20:00:00.000')
  })
})

describe('resolvePresetValue（自訂快捷）', () => {
  it('固定區間或函式', () => {
    const fixed: [Date, Date] = [new Date(2026, 0, 1), new Date(2026, 0, 31)]
    expect(resolvePresetValue({ label: '一月', value: fixed }, THU)).toBe(fixed)
    const fn = vi.fn((now: Date) => [now, now] as [Date, Date])
    resolvePresetValue({ label: '現在', value: fn }, THU)
    expect(fn).toHaveBeenCalledWith(THU)
    expect(resolvePresetValue('today', THU).map(fmt)[0]).toBe('2026-11-19 00:00:00.000')
  })
})

describe('ChptDatePicker 快捷選項', () => {
  let wrapper: VueWrapper | null = null
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  async function mountPicker(props: Record<string, unknown>, locale?: typeof enUS) {
    const picker = () => h(ChptDatePicker, props)
    wrapper = mount({ render: () => (locale ? h(ChptConfigProvider, { locale }, picker) : picker()) }, { attachTo: document.body })
    await vi.dynamicImportSettled()
    await flushPromises()
    await nextTick()
    return wrapper.findComponent({ name: 'VueDatePicker' })
  }

  type Preset = { label: string; value: () => Date | Date[] }

  it('presets=true：預設六個快捷，值在點的時候才計算', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(THU)
    const dp = await mountPicker({ range: true, presets: true })
    const presets = dp.props('presetDates') as Preset[]
    expect(presets.map((p) => p.label)).toEqual(['今天', '昨天', '本週', '近 7 天', '本月', '上月'])
    expect((presets[2].value() as Date[]).map(fmt)).toEqual(['2026-11-16 00:00:00.000', '2026-11-22 23:59:59.999'])
    vi.setSystemTime(new Date(2026, 10, 20, 9))
    expect(fmt((presets[0].value() as Date[])[0])).toBe('2026-11-20 00:00:00.000')
  })

  it('沒有 presets 時不傳快捷；語系、週起始日、按鈕文字傳給日曆', async () => {
    const dp = await mountPicker({ range: true })
    expect(dp.props('presetDates')).toEqual([])
    expect(dp.props('locale')).toBe('zh-TW')
    expect(dp.props('weekStart')).toBe(1)
    expect(dp.props('selectText')).toBe('確定')
    expect(dp.props('cancelText')).toBe('取消')
  })

  it('單日模式取區間的開始日', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(THU)
    const dp = await mountPicker({ presets: ['yesterday'] })
    const [p] = dp.props('presetDates') as Preset[]
    expect(fmt(p.value() as Date)).toBe('2026-11-18 00:00:00.000')
  })

  it('班別與自訂快捷；班別名稱依目前時刻', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(THU)
    const custom = { label: '會計月', value: () => [new Date(2026, 9, 26), new Date(2026, 10, 25)] as [Date, Date] }
    const dp = await mountPicker({
      range: true,
      enableTimePicker: true,
      presets: ['currentShift', 'previousShift', custom],
      shifts: [
        { name: 'A 班', start: '07:30' },
        { name: 'B 班', start: '19:30' },
      ],
    })
    const presets = dp.props('presetDates') as Preset[]
    expect(presets.map((p) => p.label)).toEqual(['本班（A 班）', '上一班（B 班）', '會計月'])
    expect((presets[0].value() as Date[]).map(fmt)).toEqual(['2026-11-19 07:30:00.000', '2026-11-19 19:29:59.999'])
    expect(fmt((presets[2].value() as Date[])[0])).toBe('2026-10-26 00:00:00.000')
  })

  it('語系：enUS', async () => {
    const dp = await mountPicker({ range: true, presets: ['today', 'currentShift'] }, enUS)
    expect((dp.props('presetDates') as Preset[])[0].label).toBe('Today')
    expect((dp.props('presetDates') as Preset[])[1].label).toMatch(/^Current shift \((Day|Night)\)$/)
    expect(dp.props('locale')).toBe('en-US')
    expect(dp.props('selectText')).toBe('OK')
  })
})
