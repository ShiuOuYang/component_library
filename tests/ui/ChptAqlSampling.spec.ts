import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptAqlSampling, { type AqlRecord } from '@/components/library/ui/ChptAqlSampling.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const record = ref<AqlRecord>((props.modelValue as AqlRecord) ?? { lotSize: 1000, level: 'II', inspected: 0, defects: {} })
  const verdicts: string[] = []
  const node = () =>
    h(ChptAqlSampling, {
      ...props,
      modelValue: record.value,
      'onUpdate:modelValue': (v: AqlRecord) => (record.value = v),
      onVerdict: (v: string) => verdicts.push(v),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const rows = () => w.findAll('tbody tr')
  const btn = (label: string) => w.findAll('button').find((b) => b.attributes('aria-label') === label || b.text() === label)!
  return { w, record, verdicts, rows, btn }
}

describe('ChptAqlSampling', () => {
  it('預設：主要 1.0、次要 2.5；代字、樣本數、Ac / Re', () => {
    const { w, rows } = mountIt({ title: 'IQC' })
    expect(w.text()).toContain('IQC')
    expect(w.text()).toContain('樣本代字 J')
    expect(rows()[0].text()).toContain('主要')
    expect(rows()[0].findAll('td').map((td) => td.text().replace(/\s+/g, ' ').trim()).slice(1, 4)).toEqual(['80', '2', '3'])
    expect(rows()[1].findAll('td').map((td) => td.text().trim()).slice(1, 4)).toEqual(['80', '5', '6'])
    expect(w.text()).toContain('/ 80')
    expect(w.text()).toContain('還要檢 80 個')
    expect(w.text()).toContain('檢驗 正常')
  })

  it('箭頭與全檢提示；自訂名稱與 critical', () => {
    const { rows } = mountIt({
      modelValue: { lotSize: 60, level: 'II', inspected: 0, defects: {} },
      classes: [{ key: 'critical', aql: 0.065 }, { key: 'x', label: '外觀', aql: 2.5 }],
    })
    expect(rows()[0].text()).toContain('嚴重')
    expect(rows()[0].text()).toContain('依箭頭往下用代字 L')
    expect(rows()[0].text()).toContain('全數檢驗')
    expect(rows()[1].text()).toContain('外觀')
    expect(rows()[1].text()).toContain('依箭頭往下用代字 F')
  })

  it('記錄：已檢數、不良數；達 Re 立刻拒收、檢完允收；verdict 事件', async () => {
    const { w, record, verdicts, btn, rows } = mountIt()
    await btn('+10').trigger('click')
    expect(record.value.inspected).toBe(10)
    await btn('已檢數量加一').trigger('click')
    await btn('已檢數量減一').trigger('click')
    expect(record.value.inspected).toBe(10)
    await btn('主要 不良數加一').trigger('click')
    await btn('主要 不良數加一').trigger('click')
    await btn('主要 不良數減一').trigger('click')
    expect(record.value.defects.major).toBe(1)
    const inspected = w.findAll('input[type="number"]').at(-1)!
    await inspected.setValue('80')
    expect(record.value.inspected).toBe(80)
    await nextTick()
    expect(w.text()).toContain('整批允收')
    expect(w.text()).toContain('已檢 80 個')
    expect(verdicts).toEqual(['accept'])
    await btn('次要 不良數加一').trigger('click')
    for (let i = 0; i < 2; i++) await btn('主要 不良數加一').trigger('click')
    await nextTick()
    expect(rows()[0].text()).toContain('拒收')
    expect(w.text()).toContain('整批拒收')
    expect(w.text()).toContain('主要 已達拒收數')
    expect(verdicts).toEqual(['accept', 'reject'])
    // 不良數 0 時減號停用；負數不會出現
    expect(btn('次要 不良數減一').attributes('disabled')).toBeUndefined()
    await inspected.setValue('-5')
    expect(record.value.inspected).toBe(0)
    await w.findAll('button').find((b) => b.text().includes('重新開始'))!.trigger('click')
    expect(record.value).toMatchObject({ inspected: 0, defects: {} })
  })

  it('改批量、水準、AQL；批量不合法時顯示提示', async () => {
    const { w, record, rows } = mountIt()
    const lot = w.findAll('input[type="number"]')[0]
    await lot.setValue('500')
    expect(record.value.lotSize).toBe(500)
    expect(w.text()).toContain('樣本代字 H')
    await w.findAll('select')[0].setValue('III')
    expect(record.value.level).toBe('III')
    expect(w.text()).toContain('樣本代字 J')
    await rows()[0].find('select').setValue('0.4')
    expect(record.value.aqls).toEqual({ major: 0.4 })
    await lot.setValue('1')
    expect(record.value.lotSize).toBeNull()
    expect(w.text()).toContain('輸入批量')
    await w.findAll('input[type="number"]')[0].setValue('')
    expect(record.value.lotSize).toBeNull()
  })

  it('轉換建議：加嚴（紅）、減量、停止', () => {
    expect(mountIt({ history: [true, false, true, false] }).w.find('p[role="status"]').text()).toContain('改為加嚴檢驗')
    expect(mountIt({ history: Array(10).fill(true) }).w.find('p[role="status"]').text()).toContain('減量檢驗')
    const stop = mountIt({ severity: 'tightened', history: [false, false, false, false, false] })
    expect(stop.w.find('p[role="status"]').text()).toContain('停止檢驗')
    expect(stop.w.text()).toContain('檢驗 加嚴')
    expect(mountIt({ history: [true] }).w.find('p[role="status"]').exists()).toBe(false)
  })

  it('readonly：不能改；沒有按鈕', async () => {
    const { w, record } = mountIt({ readonly: true, modelValue: { lotSize: 1000, level: 'II', inspected: 30, defects: { major: 1 } } })
    expect(w.findAll('button')).toHaveLength(0)
    expect(w.findAll('select').every((s) => s.attributes('disabled') !== undefined)).toBe(true)
    expect(w.text()).toContain('30')
    await w.findAll('input[type="number"]')[0].setValue('5')
    expect(record.value.lotSize).toBe(1000)
  })

  it('預設的 modelValue、英文語系', () => {
    const plain = mount(ChptAqlSampling)
    mounted.push(plain)
    expect(plain.text()).toContain('輸入批量')
    const { w } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.text()).toContain('Code letter J')
    expect(w.text()).toContain('Major')
    expect(w.text()).toContain('80 more to inspect')
  })
})
