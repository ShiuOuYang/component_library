import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { zhTW, enUS, mergeLocale, type ChptLocale } from '@/components/library/shared/locale'
import { checkRule } from '@/components/library/shared/formValidation'
import { formatDuration } from '@/components/library/charts/utils/gantt'
import { layerLabel } from '@/components/library/charts/composables/faceChart/facetHelpers'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import ChptPopconfirm from '@/components/library/ui/ChptPopconfirm.vue'
import ChptTransfer from '@/components/library/ui/ChptTransfer.vue'
import ChptCalendar from '@/components/library/ui/ChptCalendar.vue'
import ChptModal from '@/components/library/ui/ChptModal.vue'
import ChptUpload from '@/components/library/ui/ChptUpload.vue'
import PieChart from '@/components/library/charts/PieChart.vue'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})
function track<T extends VueWrapper>(w: T): T {
  wrapper = w
  return w
}

/** 攤平成「路徑 → 值的種類」：用來比對兩個語系的結構 */
function shape(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'function') out[path] = `fn/${v.length}`
    else if (Array.isArray(v)) out[path] = `array/${v.length}`
    else if (v && typeof v === 'object') Object.assign(out, shape(v, path))
    else out[path] = typeof v
  }
  return out
}

describe('語系檔', () => {
  it('zhTW 與 enUS 的欄位、函式參數個數、陣列長度完全一致', () => {
    // 型別只保證必填欄位存在；Record<string, string> 這類群組（函式說明、圖層名稱）要靠這裡比對
    expect(shape(enUS)).toEqual(shape(zhTW))
  })

  it('enUS 裡沒有中文', () => {
    const han = /\p{Script=Han}/u
    const leaks = Object.entries(shape(enUS)).filter(([path]) => {
      const v = path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], enUS)
      return typeof v === 'string' && han.test(v)
    })
    expect(leaks).toEqual([])
  })

  it.each([
    ['zhTW', zhTW],
    ['enUS', enUS],
  ])('%s 的每個句子函式都能產生完整的文字（沒有 undefined / NaN；英文不混中文）', (name, locale) => {
    // [3] 同時能當數字（運算、比較）、字串（插值）與陣列（join）用，一個參數就能餵給所有函式
    const arg = () => [3] as unknown as never
    const problems: string[] = []
    const visit = (obj: Record<string, unknown>, path: string) => {
      for (const [k, v] of Object.entries(obj)) {
        const p = `${path}.${k}`
        if (typeof v === 'function') {
          const out = (v as (...a: never[]) => unknown)(...Array.from({ length: v.length }, arg))
          if (typeof out !== 'string' || !out.trim() || /undefined|NaN/.test(out)) problems.push(`${p} → ${String(out)}`)
          else if (name === 'enUS' && /\p{Script=Han}/u.test(out)) problems.push(`${p} → ${out}`)
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
          visit(v as Record<string, unknown>, p)
        }
      }
    }
    visit(locale as unknown as Record<string, unknown>, name)
    expect(problems).toEqual([])
  })

  it('mergeLocale 逐層合併：只覆寫給的欄位，群組其他欄位保留', () => {
    const merged = mergeLocale(enUS, { modal: { close: 'Shut' } as Partial<ChptLocale['modal']>, empty: 'Nothing' })
    expect(merged.empty).toBe('Nothing')
    expect(merged.modal.label).toBe('Dialog')
    expect(merged.common.close).toBe('Close')
    // 原物件不被修改
    expect(enUS.empty).toBe('No data')
  })

  it('mergeLocale 不傳覆寫時回傳原物件；undefined 欄位不蓋掉', () => {
    expect(mergeLocale(zhTW, undefined)).toBe(zhTW)
    expect(mergeLocale(zhTW, { empty: undefined }).empty).toBe('暫無資料')
  })
})

describe('純函式的 locale 參數', () => {
  it('checkRule：預設繁中，傳入 enUS 時用英文訊息', async () => {
    expect(await checkRule({ required: true }, '', {}, '名稱')).toBe('請輸入名稱')
    expect(await checkRule({ required: true }, '', {}, undefined)).toBe('請輸入此欄位')
    expect(await checkRule({ required: true }, '', {}, 'Name', enUS.validation)).toBe('Name is required')
    expect(await checkRule({ type: 'email' }, 'x', {}, undefined, enUS.validation)).toBe('Invalid email address')
    expect(await checkRule({ min: 3 }, 'ab', {}, undefined, enUS.validation)).toBe('At least 3 characters')
  })

  it('formatDuration：預設繁中，傳入 enUS 時用英文單位', () => {
    const ms = (26 * 60 + 5) * 60_000
    expect(formatDuration(ms)).toBe('1 天 2 小時')
    expect(formatDuration(ms, enUS)).toBe('1d 2h')
    expect(formatDuration(0, enUS)).toBe('0m')
  })

  it('layerLabel：沒有名稱時用語系的圖層類型名稱', () => {
    expect(layerLabel({ type: 'line' } as never)).toBe('折線')
    expect(layerLabel({ type: 'line' } as never, enUS)).toBe('Line')
  })
})

describe('ChptConfigProvider 切成 enUS', () => {
  it('Popconfirm 的預設訊息與按鈕', async () => {
    const w = track(mount({
      render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptPopconfirm, null, () => h('button', { type: 'button', class: 'trigger' }, 'Delete'))),
    }, { attachTo: document.body }))
    await w.find('button.trigger').trigger('click')
    await w.vm.$nextTick()
    const text = document.body.textContent ?? ''
    expect(text).toContain('Are you sure?')
    expect(text).toContain('Cancel')
    expect(text).toContain('OK')
    expect(text).not.toContain('確定')
  })

  it('Transfer 的標題與按鈕；prop 有傳時仍以 prop 為準', () => {
    const data = [{ key: 'a', label: 'A' }]
    const w = track(mount({
      render: () =>
        h(ChptConfigProvider, { locale: enUS }, () => [
          h(ChptTransfer, { data, modelValue: [] }),
          h(ChptTransfer, { data, modelValue: [], titles: ['來源', '目標'] }),
        ]),
    }))
    const [first, second] = w.findAllComponents(ChptTransfer)
    expect(first.text()).toContain('Available')
    expect(first.text()).toContain('Selected')
    expect(first.text()).toContain('Add')
    expect(second.text()).toContain('來源')
  })

  it('Calendar 的年月標題、星期與切換按鈕', () => {
    const w = track(mount({
      render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptCalendar, { modelValue: '2026-11-11' })),
    }))
    expect(w.find('h2').text()).toBe('November 2026')
    expect(w.findAll('th').map((th) => th.text())).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'])
    expect(w.find('button[aria-label="Next month"]').exists()).toBe(true)
    expect(w.text()).toContain('Today')
  })

  it('Modal 的關閉按鈕與預設名稱', async () => {
    const w = track(mount({
      render: () =>
        h(ChptConfigProvider, { locale: enUS }, () => [
          h(ChptModal, { modelValue: true, title: 'Report' }),
          h(ChptModal, { modelValue: true }),
        ]),
    }, { attachTo: document.body }))
    await w.vm.$nextTick()
    expect(document.querySelector('button[aria-label="Close"]')).not.toBeNull()
    // 沒有標題時用語系的預設名稱
    expect(document.querySelector('[role="dialog"][aria-label="Dialog"]')).not.toBeNull()
  })

  it('Upload 的提示文字依語系組句', () => {
    const w = track(mount({
      render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptUpload, { modelValue: [], accept: '.csv,.xlsx', maxCount: 3 })),
    }))
    expect(w.text()).toContain('Formats: .csv, .xlsx; Up to 3 files')
    expect(w.text()).toContain('click to select')
  })

  it('圖表：沒有資料的文字與螢幕閱讀器摘要', () => {
    const w = track(mount({
      render: () => h(ChptConfigProvider, { locale: enUS }, () => h(PieChart, { data: [], width: 300, height: 200 })),
    }))
    expect(w.text()).toContain('No data')
    expect(w.html()).toContain('Pie chart: no data')
  })
})
