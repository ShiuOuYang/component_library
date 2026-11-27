import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import Chpt8DReport from '@/components/library/ui/Chpt8DReport.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { EightDReport } from '@/components/library/shared/eightD'

const BASE: EightDReport = {
  number: '8D-1',
  title: '空焊',
  steps: {
    d0: { done: true, completedAt: '2026-11-18', text: '啟動' },
    d1: { owner: '陳', due: '2026-11-20', members: [{ id: 'm1', name: '陳', role: '品保', leader: true }] },
  },
}

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
})

function mountIt(props: Record<string, unknown> = {}, data: EightDReport = BASE) {
  const report = ref<EightDReport>(structuredClone(data))
  wrapper = mount(
    {
      render: () =>
        h(Chpt8DReport, {
          modelValue: report.value,
          'onUpdate:modelValue': (v: EightDReport) => (report.value = v),
          today: '2026-11-27',
          ...props,
        }),
    },
    { attachTo: document.body },
  )
  const w = wrapper
  const comp = () => w.findComponent(Chpt8DReport)
  const stepBtn = (k: string) => w.find(`button[data-step="${k}"]`)
  const btn = (text: string) => w.findAll('button').find((b) => b.text().includes(text))
  return { w, report, comp, stepBtn, btn }
}

describe('Chpt8DReport', () => {
  it('從第一個未完成的步驟開始；步驟狀態、逾期、進度', () => {
    const { w, stepBtn } = mountIt()
    expect(stepBtn('d1').attributes('aria-current')).toBe('step')
    expect(w.find('h3').text()).toBe('D1 成立團隊')
    expect(stepBtn('d0').text()).toContain('已完成')
    expect(stepBtn('d1').text()).toContain('逾期') // 期限 11/20
    expect(stepBtn('d2').text()).toContain('未開始')
    expect(w.text()).toContain('1/9 步完成')
  })

  it('D1：新增成員、指定組長、移除；必填檢查後標記完成並跳到下一步', async () => {
    const { w, report, btn, stepBtn, comp } = mountIt()
    await btn('標記完成')!.trigger('click')
    expect(w.find('[role="alert"]').text()).toContain('至少要有 2 位成員')
    expect(report.value.steps.d1!.done).toBeFalsy()

    await btn('新增成員')!.trigger('click')
    await nextTick()
    const m = report.value.steps.d1!.members!
    expect(m).toHaveLength(2)
    expect(m[1].leader).toBe(false) // 已有組長
    const li = w.find(`[data-member="${m[1].id}"]`)
    expect(document.activeElement).toBe(li.find('input:not([type])').element)
    await li.find('input:not([type])').setValue('林')
    await li.find('input:not([type])').trigger('change')
    // 填好後錯誤訊息即時更新（已經沒有缺漏）
    expect(w.find('[role="alert"]').exists()).toBe(false)
    await li.find('input[aria-label="職務 / 部門"]').setValue('製程')
    await li.find('input[aria-label="職務 / 部門"]').trigger('change')
    await li.find('input[type="radio"]').setValue(true)
    expect(report.value.steps.d1!.members!.map((x) => x.leader)).toEqual([false, true])

    await btn('標記完成')!.trigger('click')
    await nextTick()
    expect(report.value.steps.d1).toMatchObject({ done: true, completedAt: '2026-11-27' })
    expect(comp().emitted('step-complete')![0]).toEqual(['d1'])
    expect(stepBtn('d2').attributes('aria-current')).toBe('step')
    expect(document.activeElement).toBe(w.find('h3').element)
    expect(w.find('[aria-live="polite"]').text()).toContain('D1 成立團隊 已完成')

    // 回到 D1 取消完成、移除成員
    await stepBtn('d1').trigger('click')
    await btn('取消完成')!.trigger('click')
    expect(report.value.steps.d1).toMatchObject({ done: false, completedAt: null })
    await w.find('button[aria-label^="移除成員「林」"]').trigger('click')
    expect(report.value.steps.d1!.members).toHaveLength(1)
  })

  it('D2 5W2H、負責人與期限、說明', async () => {
    const { w, report, stepBtn } = mountIt()
    await stepBtn('d2').trigger('click')
    const what = w.find('textarea[data-field="what"]')
    await what.setValue('BGA 空焊')
    await what.trigger('change')
    await w.find('textarea[data-field="howMany"]').setValue('12 片')
    await w.find('textarea[data-field="howMany"]').trigger('change')
    expect(report.value.steps.d2!.fiveW2H).toEqual({ what: 'BGA 空焊', howMany: '12 片' })
    const owner = w.findAll('label').find((l) => l.text().startsWith('負責人'))!.find('input')
    await owner.setValue('林')
    await owner.trigger('change')
    const due = w.find('input[type="date"]')
    await due.setValue('2026-12-01')
    await due.trigger('change')
    await due.setValue('')
    await due.trigger('change')
    const text = w.find('textarea[data-field="text"]')
    await text.setValue('補充')
    await text.trigger('change')
    expect(report.value.steps.d2).toMatchObject({ owner: '林', due: null, text: '補充' })
  })

  it('D4 5 Why、根本原因、驗證；D3 對策；D7 預防', async () => {
    const { w, report, stepBtn, btn } = mountIt()
    await stepBtn('d4').trigger('click')
    const why3 = w.find('input[data-why="occurrence-3"]')
    await why3.setValue('鋼板堵塞')
    await why3.trigger('change')
    expect(report.value.steps.d4!.whys!.occurrence).toEqual(['', '', '鋼板堵塞'])
    await w.find('input[data-why="occurrence-1"]').setValue('錫量不足')
    await w.find('input[data-why="occurrence-1"]').trigger('change')
    expect(report.value.steps.d4!.whys!.occurrence).toEqual(['錫量不足', '', '鋼板堵塞'])
    for (const side of ['occurrence', 'escape']) {
      await w.find(`input[data-root="${side}"]`).setValue(`${side}-root`)
      await w.find(`input[data-root="${side}"]`).trigger('change')
    }
    await btn('標記完成')!.trigger('click')
    expect(w.find('[role="alert"]').text()).toContain('根本原因尚未驗證')
    await w.findAll('input[type="checkbox"]').at(-1)!.setValue(true)
    expect(report.value.steps.d4!.rootCause).toEqual({ occurrence: 'occurrence-root', escape: 'escape-root', verified: true })

    await stepBtn('d3').trigger('click')
    await btn('新增對策')!.trigger('click')
    await nextTick()
    const a = report.value.steps.d3!.actions![0]
    const li = w.find(`[data-action="${a.id}"]`)
    await li.find('input:not([type])').setValue('X-ray 全檢')
    await li.find('input:not([type])').trigger('change')
    await li.find('input[aria-label="負責人"]').setValue('王')
    await li.find('input[aria-label="負責人"]').trigger('change')
    await li.find('input[type="date"]').setValue('2026-11-28')
    await li.find('input[type="date"]').trigger('change')
    await li.find('input[type="checkbox"]').setValue(true)
    expect(report.value.steps.d3!.actions![0]).toMatchObject({ text: 'X-ray 全檢', owner: '王', due: '2026-11-28', done: true })
    await li.find('button[aria-label^="刪除對策"]').trigger('click')
    expect(report.value.steps.d3!.actions).toHaveLength(0)

    await stepBtn('d7').trigger('click')
    await w.find('input[data-prevention="sop"]').setValue(true)
    expect(report.value.steps.d7!.prevention).toEqual({ sop: true })
  })

  it('上一步 / 下一步、唯讀、initialStep、step-change', async () => {
    const { w, btn, comp } = mountIt({ initialStep: 'd0' })
    expect(w.find('h3').text()).toBe('D0 準備')
    expect(btn('上一步')!.attributes('disabled')).toBeDefined()
    await btn('下一步')!.trigger('click')
    expect(w.find('h3').text()).toBe('D1 成立團隊')
    expect(comp().emitted('step-change')![0]).toEqual(['d1'])
    await btn('上一步')!.trigger('click')
    expect(w.find('h3').text()).toBe('D0 準備')
    wrapper!.unmount()

    const r = mountIt({ readonly: true, initialStep: 'd8' })
    expect(r.w.find('textarea').exists()).toBe(false)
    expect(r.btn('標記完成')).toBeUndefined()
    expect(r.btn('下一步')!.attributes('disabled')).toBeDefined()
    await r.stepBtn('d1').trigger('click')
    expect(r.w.text()).toContain('品保')
    expect(r.w.text()).toContain('組長')
  })

  it('匯出 Markdown、列印、對外方法', async () => {
    const blobs: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (b: Blob) => (blobs.push(b), 'blob:x') })
    let name = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      name = this.download
    })
    const { comp, btn } = mountIt({ filename: '8D-1' })
    await btn('匯出文字')!.trigger('click')
    expect(name).toBe('8D-1.md')
    const md = await blobs[0].text()
    expect(md).toContain('# 8D-1 空焊')
    expect(md).toContain('## D0 準備 [完成 2026-11-18]')

    vi.useFakeTimers()
    const printSpy = vi.fn()
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag)
      if (tag === 'iframe') queueMicrotask(() => Object.defineProperty((el as HTMLIFrameElement).contentWindow!, 'print', { configurable: true, value: printSpy }))
      return el
    })
    const vm = comp().vm as unknown as { print: () => void; toText: () => string; goTo: (k: string) => Promise<void>; complete: () => boolean }
    vm.print()
    expect(document.querySelector('iframe')).not.toBeNull()
    expect(document.querySelector('iframe')!.contentDocument!.body.innerHTML).toContain('<h1>8D-1 空焊</h1>')
    vi.advanceTimersByTime(1000)
    expect(document.querySelector('iframe')).toBeNull()
    vi.useRealTimers()

    expect(vm.toText()).toContain('陳')
    await vm.goTo('d8')
    expect(vm.complete()).toBe(false)
  })

  it('沒有資料時從 D0 開始；英文語系', () => {
    wrapper = mount(Chpt8DReport)
    expect(wrapper.find('h3').text()).toBe('D0 準備')
    expect(wrapper.text()).toContain('0/9 步完成')
    wrapper.unmount()
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(Chpt8DReport, { modelValue: BASE, today: '2026-11-27' })) })
    expect(wrapper.text()).toContain('D1 Team')
    expect(wrapper.text()).toContain('1/9 steps done')
    expect(wrapper.text()).toContain('Overdue')
  })
})
