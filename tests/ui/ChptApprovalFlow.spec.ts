import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptApprovalFlow from '@/components/library/ui/ChptApprovalFlow.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { ApprovalFlowData } from '@/components/library/shared/approval'

const H = 3_600_000
const T0 = new Date(2026, 10, 23, 8, 0).getTime()
const NOW = T0 + 30 * H

const seed = (): ApprovalFlowData => ({
  submittedAt: T0,
  submitter: '張工程師',
  steps: [
    { id: 's1', name: '申請單位主管', approvers: [{ id: 'lee', name: '李組長', title: '組長', status: 'approved', actedAt: T0 + 3 * H, comment: '同意' }], slaHours: 8 },
    {
      id: 's2',
      name: '製程 / 品保會簽',
      mode: 'all',
      slaHours: 24,
      approvers: [
        { id: 'chen', name: '陳工程師', status: 'approved', actedAt: T0 + 10 * H },
        { id: 'wu', name: '吳課長', delegatedTo: { id: 'lin', name: '林副課長' } },
        { id: 'huang', name: '黃工程師' },
      ],
    },
    { id: 's3', name: '廠長核准', mode: 'any', approvers: [{ id: 'ho', name: '何廠長' }, { id: 'tsai', name: 'Tsai' }] },
  ],
})

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
})

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const model = ref<ApprovalFlowData>((props.modelValue as ApprovalFlowData) ?? seed())
  const events: Record<string, unknown[]> = {}
  const rec = (n: string) => (p: unknown) => (events[n] ??= []).push(p)
  const node = () =>
    h(ChptApprovalFlow, {
      now: NOW,
      delegates: [{ id: 'kao', name: '高工程師', title: '設備' }, { id: 'lin', name: '林副課長' }, { id: 'huang', name: '黃工程師' }],
      ...props,
      modelValue: model.value,
      'onUpdate:modelValue': (v: ApprovalFlowData) => (model.value = v),
      onApprove: rec('approve'),
      onReject: rec('reject'),
      onDelegate: rec('delegate'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const steps = () => w.findAll('ol > li')
  const btn = (label: string) => w.findAll('button').find((b) => b.text().includes(label))
  return { w, model, events, steps, btn }
}

describe('ChptApprovalFlow', () => {
  it('摘要與每一關：狀態、方式、花了 / 已等多久、逾時、簽核人狀態與意見、委託', () => {
    const { w, steps } = mountIt()
    expect(w.text()).toContain('簽核中')
    expect(w.text()).toContain('張工程師 送出於')
    expect(w.text()).toContain('已進行 1 天 6 小時')
    const s1 = steps()[0].text()
    expect(s1).toContain('已通過')
    expect(s1).toContain('花了 3 小時 0 分')
    expect(s1).toContain('同意')
    const s2 = steps()[1]
    expect(s2.attributes('aria-current')).toBe('step')
    expect(s2.text()).toContain('會簽（全部同意）')
    expect(s2.text()).toContain('已等 1 天 3 小時')
    expect(s2.text()).toContain('逾時（時限 24 小時）')
    expect(s2.text()).toContain('林副課長（代理）')
    expect(s2.text()).toContain('待簽')
    const s3 = steps()[2].text()
    expect(s3).toContain('未開始')
    expect(s3).toContain('或簽（一人同意即可）')
    expect(s3).toContain('尚未輪到')
    // 沒有 operator：沒有簽核區
    expect(w.find('textarea').exists()).toBe(false)
  })

  it('輪到自己：同意 → 更新資料、送出 approve、念出', async () => {
    const { w, model, events, btn } = mountIt({ operator: 'huang' })
    expect(w.text()).toContain('輪到你簽核')
    await w.find('textarea').setValue(' 確認 ')
    await btn('同意')!.trigger('click')
    expect(events.approve).toEqual([{ stepId: 's2', approverId: 'huang', comment: '確認' }])
    expect(model.value.steps[1].approvers[2]).toMatchObject({ status: 'approved', actedAt: NOW, comment: '確認' })
    await nextTick()
    expect(w.find('[aria-live="polite"]').text()).toBe('已同意')
    expect(w.find('textarea').exists()).toBe(false)
  })

  it('退回要寫原因；寫了之後可退回，後面的關卡變成不需簽核', async () => {
    const { w, model, events, btn, steps } = mountIt({ operator: 'huang' })
    await btn('退回')!.trigger('click')
    expect(w.find('[role="alert"]').text()).toBe('退回請寫原因')
    expect(w.find('textarea').attributes('aria-invalid')).toBe('true')
    expect(events.reject).toBeUndefined()
    await w.find('textarea').setValue('回焊曲線未附')
    expect(w.find('[role="alert"]').exists()).toBe(false)
    await btn('退回')!.trigger('click')
    expect(events.reject).toEqual([{ stepId: 's2', approverId: 'huang', comment: '回焊曲線未附' }])
    await nextTick()
    expect(w.text()).toContain('已退回')
    expect(steps()[2].text()).toContain('不需簽核')
    expect(steps()[2].text()).toContain('不需簽')
    expect(model.value.steps[1].approvers[2].status).toBe('rejected')
  })

  it('requireRejectComment=false：不用寫原因', async () => {
    const { events, btn } = mountIt({ operator: 'huang', requireRejectComment: false })
    await btn('退回')!.trigger('click')
    expect(events.reject).toHaveLength(1)
  })

  it('代理人簽核：顯示代理誰；委託出去的本人看不到簽核區', async () => {
    const lin = mountIt({ operator: 'lin' })
    expect(lin.w.text()).toContain('代理 吳課長 簽核')
    // 代理人不能再委託
    expect(lin.btn('委託')).toBeUndefined()
    await lin.btn('同意')!.trigger('click')
    expect(lin.events.approve).toEqual([{ stepId: 's2', approverId: 'wu', comment: '' }])
    expect(mountIt({ operator: 'wu' }).w.find('textarea').exists()).toBe(false)
  })

  it('委託：選人（排除自己與同一關的人）→ 送出 delegate；之後由代理人簽', async () => {
    const { w, model, events, btn } = mountIt({ operator: 'huang' })
    const toggle = btn('委託')!
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    const group = w.find('[role="group"]')
    expect(group.findAll('button').map((b) => b.text())).toEqual(['高工程師 · 設備'])
    await group.find('button').trigger('click')
    expect(events.delegate).toEqual([{ stepId: 's2', approverId: 'huang', to: { id: 'kao', name: '高工程師', title: '設備' } }])
    expect(model.value.steps[1].approvers[2].delegatedTo?.id).toBe('kao')
    await nextTick()
    expect(w.find('[aria-live="polite"]').text()).toBe('已委託給 高工程師')
    expect(w.find('textarea').exists()).toBe(false)
  })

  it('沒有可委託的人時不顯示委託', () => {
    expect(mountIt({ operator: 'huang', delegates: [] }).btn('委託')).toBeUndefined()
  })

  it('readonly：不顯示簽核區', () => {
    expect(mountIt({ operator: 'huang', readonly: true }).w.find('textarea').exists()).toBe(false)
  })

  it('全部完成：已核准、共花了多久；或簽沒簽的人不需簽', () => {
    const f = seed()
    f.steps[1].approvers[1].status = 'approved'
    f.steps[1].approvers[1].actedAt = T0 + 12 * H
    f.steps[1].approvers[2].status = 'approved'
    f.steps[1].approvers[2].actedAt = T0 + 14 * H
    f.steps[2].approvers[0].status = 'approved'
    f.steps[2].approvers[0].actedAt = T0 + 20 * H
    const { w, steps } = mountIt({ modelValue: f })
    expect(w.text()).toContain('已核准')
    expect(w.text()).toContain('共花了 20 小時 0 分')
    expect(steps()[1].text()).toContain('花了 11 小時 0 分') // 3h（上一關完成）→ 14h（最後一人同意）
    expect(steps()[2].text()).toContain('不需簽')
  })

  it('沒有 now 時每分鐘更新等待時間', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0 + 3 * H + 30 * 60_000)
    const { steps } = mountIt({ now: null })
    expect(steps()[1].text()).toContain('已等 30 分')
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(steps()[1].text()).toContain('已等 31 分')
  })

  it('acting 方法', () => {
    const { w } = mountIt({ operator: 'lin' })
    const vm = w.findComponent(ChptApprovalFlow).vm as unknown as { acting: { stepIndex: number; approver: { id: string } } | null }
    expect(vm.acting?.stepIndex).toBe(1)
    expect(vm.acting?.approver.id).toBe('wu')
  })

  it('英文語系', () => {
    const { w } = mountIt({ operator: 'huang' }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.text()).toContain('In progress')
    expect(w.text()).toContain('All must approve')
    expect(w.text()).toContain('Your approval is needed')
    expect(w.text()).toContain('Overdue (24 h SLA)')
  })
})
