import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptAlert from '@/components/library/ui/ChptAlert.vue'
import ChptAvatar from '@/components/library/ui/ChptAvatar.vue'
import ChptCard from '@/components/library/ui/ChptCard.vue'
import ChptCheckbox from '@/components/library/ui/ChptCheckbox.vue'
import ChptCollapse from '@/components/library/ui/ChptCollapse.vue'
import ChptDivider from '@/components/library/ui/ChptDivider.vue'
import ChptSkeleton from '@/components/library/ui/ChptSkeleton.vue'
import ChptSteps from '@/components/library/ui/ChptSteps.vue'
import ChptTag from '@/components/library/ui/ChptTag.vue'
import ChptTextarea from '@/components/library/ui/ChptTextarea.vue'
import ChptTooltip from '@/components/library/ui/ChptTooltip.vue'

/**
 * 基礎元件的行為測試。這 11 個元件原本完全沒有測試（覆蓋率 0%），
 * 補測試時一併抓到的 bug 各自標了「回歸」。
 */

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

// ---------------------------------------------------------------------------
describe('ChptAlert', () => {
  it('顯示標題與訊息；show=false 時不渲染', async () => {
    const w = track(mount(ChptAlert, { props: { title: '已儲存', message: '工單已更新' } }))
    expect(w.text()).toContain('已儲存')
    expect(w.text()).toContain('工單已更新')
    await w.setProps({ show: false })
    expect(w.find('[role]').exists()).toBe(false)
  })

  /** 回歸：原本一律 role=alert，靜態的說明提示一載入就打斷報讀 */
  it.each([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'alert'],
    ['danger', 'alert'],
  ] as const)('type=%s → role=%s', (type, role) => {
    const w = track(mount(ChptAlert, { props: { type, message: 'x' } }))
    expect(w.find('div').attributes('role')).toBe(role)
  })

  it('closable：關閉鈕有名稱並送出 close', async () => {
    const w = track(mount(ChptAlert, { props: { message: 'x', closable: true } }))
    const btn = w.find('button')
    expect(btn.attributes('aria-label')).toBe('關閉提示')
    await btn.trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('預設插槽取代 message', () => {
    const w = track(mount(ChptAlert, { props: { message: '不會出現' }, slots: { default: '<b>自訂內容</b>' } }))
    expect(w.html()).toContain('<b>自訂內容</b>')
    expect(w.text()).not.toContain('不會出現')
  })

  it('showIcon=false 不畫圖示', () => {
    const w = track(mount(ChptAlert, { props: { message: 'x', showIcon: false } }))
    expect(w.text()).not.toContain('info')
  })
})

// ---------------------------------------------------------------------------
describe('ChptAvatar', () => {
  it('英文名取首字母；單一個字取前兩個字母', () => {
    expect(track(mount(ChptAvatar, { props: { name: 'Kevin' } })).text()).toBe('KE')
    wrapper!.unmount()
    expect(track(mount(ChptAvatar, { props: { name: 'john doe' } })).text()).toBe('JD')
    wrapper!.unmount()
    expect(track(mount(ChptAvatar)).text()).toBe('?')
  })

  /** 回歸：中文姓名原本取前兩個字（「王小明」→「王小」），小尺寸還會溢出圓圈 */
  it('中文姓名：取名（後兩個字）；xs / sm 只放姓', () => {
    expect(track(mount(ChptAvatar, { props: { name: '王小明' } })).text()).toBe('小明')
    wrapper!.unmount()
    expect(track(mount(ChptAvatar, { props: { name: '林芳' } })).text()).toBe('林芳')
    wrapper!.unmount()
    expect(track(mount(ChptAvatar, { props: { name: '王小明', size: 'xs' } })).text()).toBe('王')
  })

  /** 回歸：文字頭像的縮寫是 aria-hidden、外層又沒有名稱，螢幕閱讀器什麼都唸不到 */
  it('文字頭像：外層 role=img，名稱為完整姓名', () => {
    const w = track(mount(ChptAvatar, { props: { name: '王小明' } }))
    expect(w.attributes('role')).toBe('img')
    expect(w.attributes('aria-label')).toBe('王小明')
  })

  it('圖片頭像：用 img 的 alt，外層不另設 role', () => {
    const w = track(mount(ChptAvatar, { props: { src: '/a.png', name: '王小明' } }))
    expect(w.find('img').attributes('alt')).toBe('王小明')
    expect(w.attributes('role')).toBeUndefined()
  })

  /** 回歸：圖片載入失敗時原本顯示瀏覽器的破圖 */
  it('圖片載入失敗時退回文字頭像；換 src 會再試一次', async () => {
    const w = track(mount(ChptAvatar, { props: { src: '/broken.png', name: 'Amy Lin' } }))
    await w.find('img').trigger('error')
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toBe('AL')
    await w.setProps({ src: '/ok.png' })
    expect(w.find('img').exists()).toBe(true)
  })

  it('size / shape / showStatus', () => {
    const w = track(mount(ChptAvatar, { props: { name: 'A', size: 'lg', shape: 'square', showStatus: true } }))
    expect(w.classes()).toContain('h-14')
    expect(w.html()).toContain('rounded-lg')
    expect(w.find('.bg-success-solid').exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
describe('ChptCard', () => {
  it('標題、extra、footer 插槽', () => {
    const w = track(mount(ChptCard, {
      props: { title: '本週良率' },
      slots: { default: '<p>98.2%</p>', extra: '<a href="#">更多</a>', footer: '更新於 08:00' },
    }))
    expect(w.find('h3').text()).toBe('本週良率')
    expect(w.text()).toContain('98.2%')
    expect(w.find('a').text()).toBe('更多')
    expect(w.text()).toContain('更新於 08:00')
  })

  it('沒有標題也沒有 extra 時不畫標題列', () => {
    const w = track(mount(ChptCard, { slots: { default: '內容' } }))
    expect(w.find('h3').exists()).toBe(false)
    expect(w.find('.border-b').exists()).toBe(false)
  })

  it('padding 與 hoverable', async () => {
    const w = track(mount(ChptCard, { props: { padding: 'lg', hoverable: true } }))
    expect(w.classes()).toContain('p-8')
    expect(w.classes()).toContain('hover:shadow-md')
    await w.trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
describe('ChptCheckbox', () => {
  const items = [
    { label: 'SMT', value: 'smt' },
    { label: 'DIP', value: 'dip' },
    { label: '測試', value: 'test', disabled: true },
  ]

  it('勾選送出新的陣列', async () => {
    const w = track(mount(ChptCheckbox, { props: { items, modelValue: ['smt'] } }))
    const inputs = w.findAll('input')
    expect((inputs[0].element as HTMLInputElement).checked).toBe(true)
    await inputs[1].setValue(true)
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([['smt', 'dip']])
  })

  it('停用項目的 input 是 disabled', () => {
    const w = track(mount(ChptCheckbox, { props: { items } }))
    expect(w.findAll('input')[2].attributes('disabled')).toBeDefined()
  })

  /** 回歸：停用但已勾選的項目原本畫成沒勾（底下的 input 其實是勾著的） */
  it('停用 + 已勾選：仍畫出勾勾', () => {
    const w = track(mount(ChptCheckbox, { props: { items, modelValue: ['test'] } }))
    const box = w.findAll('label')[2]
    expect(box.find('svg').exists()).toBe(true)
    expect((box.find('input').element as HTMLInputElement).checked).toBe(true)
  })

  /** 回歸：原生 input 是 opacity-0，原本完全沒有焦點框 */
  it('焦點框畫在外框上（has-[:focus-visible]）', () => {
    const w = track(mount(ChptCheckbox, { props: { items } }))
    expect(w.find('label > div').classes()).toContain('has-[:focus-visible]:ring-2')
  })

  it('每個 input 都有名稱；errors 顯示第一則', () => {
    const w = track(mount(ChptCheckbox, { props: { items, errors: ['至少選一項', '第二則'] } }))
    expect(w.findAll('input').map((i) => i.attributes('aria-label'))).toEqual(['SMT', 'DIP', '測試'])
    expect(w.text()).toContain('至少選一項')
    expect(w.text()).not.toContain('第二則')
  })

  it("direction='column' 改直排", () => {
    const w = track(mount(ChptCheckbox, { props: { items, direction: 'column' } }))
    expect(w.find('div').classes()).toContain('flex-col')
  })
})

// ---------------------------------------------------------------------------
describe('ChptCollapse', () => {
  const items = [
    { title: '停機原因', content: '回焊爐溫度異常' },
    { title: '處置', content: '更換熱電偶' },
    { title: '後續追蹤', content: '一週內每日點檢' },
  ]

  it('按鈕帶 aria-expanded / aria-controls，面板 role=region 以標題命名', async () => {
    const w = track(mount(ChptCollapse, { props: { items } }))
    const btn = w.findAll('button')[0]
    expect(btn.attributes('aria-expanded')).toBe('false')
    await btn.trigger('click')
    expect(btn.attributes('aria-expanded')).toBe('true')
    const panel = w.find('[role="region"]')
    expect(panel.attributes('id')).toBe(btn.attributes('aria-controls'))
    expect(panel.attributes('aria-labelledby')).toBe(btn.attributes('id'))
    expect(panel.text()).toBe('回焊爐溫度異常')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([[0]])
  })

  it('預設手風琴：打開另一個會關掉前一個', async () => {
    const w = track(mount(ChptCollapse, { props: { items, modelValue: [0] } }))
    await w.findAll('button')[1].trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([[1]])
  })

  it('multiple：可同時打開多個；再按一次收起', async () => {
    const w = track(mount(ChptCollapse, { props: { items, multiple: true, modelValue: [0] } }))
    await w.findAll('button')[2].trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([[0, 2]])
    await w.findAll('button')[0].trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([[2]])
  })

  it('modelValue 受控；具名插槽 content-N 取代內容', async () => {
    const w = track(mount(ChptCollapse, {
      props: { items, modelValue: [] },
      slots: { 'content-1': '<em>自訂處置</em>' },
    }))
    await w.setProps({ modelValue: [1] })
    expect(w.find('[role="region"]').html()).toContain('<em>自訂處置</em>')
  })
})

// ---------------------------------------------------------------------------
describe('ChptDivider', () => {
  it('純線：role=separator', () => {
    const w = track(mount(ChptDivider))
    expect(w.attributes('role')).toBe('separator')
    expect(w.attributes('aria-orientation')).toBeUndefined()
  })

  it('直向：aria-orientation=vertical', () => {
    const w = track(mount(ChptDivider, { props: { direction: 'vertical' } }))
    expect(w.attributes('aria-orientation')).toBe('vertical')
    expect(w.classes()).toContain('flex-col')
  })

  it('帶文字時不設 separator（文字要唸得到）', () => {
    const w = track(mount(ChptDivider, { props: { text: '或' } }))
    expect(w.attributes('role')).toBeUndefined()
    expect(w.text()).toBe('或')
  })

  /** 回歸：預設色原本是 neutral-200（動態拼的 class，深色模式下一條刺眼的淺灰線） */
  it('預設線色走主題（border-stroke-light），color 可覆寫', async () => {
    const w = track(mount(ChptDivider))
    expect(w.find('.border-stroke-light').exists()).toBe(true)
    expect(w.html()).not.toContain('neutral-200')
    await w.setProps({ color: 'stroke-default' })
    expect(w.find('.border-stroke-default').exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
describe('ChptSkeleton', () => {
  it('loading 時畫 rows 條，否則顯示內容', async () => {
    const w = track(mount(ChptSkeleton, { props: { loading: true, rows: 4 }, slots: { default: '<p class="real">資料</p>' } }))
    expect(w.findAll('.animate-pulse')).toHaveLength(4)
    expect(w.find('.real').exists()).toBe(false)
    await w.setProps({ loading: false })
    expect(w.find('.real').exists()).toBe(true)
  })

  /** 回歸：color 從沒套上去，每一條都是透明的 */
  it('每一條都有底色（color prop）', async () => {
    const w = track(mount(ChptSkeleton, { props: { loading: true } }))
    expect(w.findAll('.animate-pulse').every((r) => r.classes().includes('bg-surface-tertiary'))).toBe(true)
    await w.setProps({ color: 'bg-surface-muted' })
    expect(w.find('.animate-pulse').classes()).toContain('bg-surface-muted')
  })

  it('role=status 並有名稱，條紋本身 aria-hidden', () => {
    const w = track(mount(ChptSkeleton, { props: { loading: true } }))
    expect(w.attributes('role')).toBe('status')
    expect(w.attributes('aria-label')).toBe('載入中')
    expect(w.find('.animate-pulse').attributes('aria-hidden')).toBe('true')
  })

  it('rowWidth 陣列循環套用；數字轉百分比；rowHeight', () => {
    const w = track(mount(ChptSkeleton, { props: { loading: true, rows: 3, rowWidth: [100, '8rem'], rowHeight: 20 } }))
    const styles = w.findAll('.animate-pulse').map((r) => (r.element as HTMLElement).style)
    // rows 從 1 開始數：第 1 條取 index 1 → '8rem'
    expect(styles.map((s) => s.width)).toEqual(['8rem', '100%', '8rem'])
    expect(styles[0].height).toBe('20px')
  })
})

// ---------------------------------------------------------------------------
describe('ChptSteps', () => {
  const steps = [
    { title: '備料', status: 'done' as const },
    { title: '生產', status: 'process' as const },
    { title: '出貨', status: 'pending' as const },
  ]

  it('進行中的步驟 aria-current=step；完成的顯示勾勾', () => {
    const w = track(mount(ChptSteps, { props: { steps } }))
    const lis = w.findAll('li')
    expect(lis[1].attributes('aria-current')).toBe('step')
    expect(lis[0].attributes('aria-current')).toBeUndefined()
    expect(lis[0].text()).toContain('check')
    expect(lis[2].text()).toContain('3')
  })

  /** 回歸：StepStatus 是 'pending'，狀態對照表只寫了 'wait'，尚未開始的步驟什麼都不唸 */
  it('每個狀態都有給輔助技術的文字', () => {
    const w = track(mount(ChptSteps, { props: { steps } }))
    expect(w.findAll('.sr-only').map((s) => s.text())).toEqual(['已完成', '進行中', '尚未開始'])
  })

  /** 回歸：尺寸原本用動態拼的 w-[28px]，Tailwind 不會產生，圓圈縮成數字大小的橢圓 */
  it('節點尺寸用 inline style', () => {
    const w = track(mount(ChptSteps, { props: { steps } }))
    const node = w.find('li span.rounded-full').element as HTMLElement
    expect(node.style.width).toBe('28px')
    expect(node.style.height).toBe('28px')
    expect(w.html()).not.toContain('w-[28px]')
  })

  it('連接線：下一步完成時上色；showLabel=false 隱藏標題', async () => {
    const w = track(mount(ChptSteps, { props: { steps: [{ title: 'A', status: 'done' }, { title: 'B', status: 'done' }, { title: 'C' }] } }))
    const lines = w.findAll('[aria-hidden="true"].h-0\\.5')
    expect(lines[0].classes()).toContain('bg-accent-solid')
    expect(lines[1].classes()).toContain('bg-surface-muted')
    await w.setProps({ showLabel: false })
    expect(w.text()).not.toContain('A')
  })
})

// ---------------------------------------------------------------------------
describe('ChptTag', () => {
  it('label 與 color', () => {
    const w = track(mount(ChptTag, { props: { label: 'PASS', color: 'success' } }))
    expect(w.text()).toBe('PASS')
    expect(w.classes()).toContain('text-success')
  })

  it('isOutline 改外框樣式；未知 color 退回 primary', () => {
    const w = track(mount(ChptTag, { props: { label: 'x', isOutline: true, color: 'nope' as never } }))
    expect(w.classes()).toContain('bg-transparent')
    expect(w.classes()).toContain('text-accent')
  })

  it('closable：按鈕名稱帶標籤文字並送出 close', async () => {
    const w = track(mount(ChptTag, { props: { label: 'SMT-01', closable: true } }))
    expect(w.find('button').attributes('aria-label')).toBe('關閉 SMT-01')
    await w.find('button').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })

  /** 回歸：用插槽放文字時，關閉鈕原本叫「關閉 」（空白） */
  it('沒有 label 時關閉鈕仍有名稱', () => {
    const w = track(mount(ChptTag, { props: { closable: true }, slots: { default: '自訂' } }))
    expect(w.find('button').attributes('aria-label')).toBe('關閉標籤')
  })

  it('size 對應字級', () => {
    const w = track(mount(ChptTag, { props: { label: 'x', size: 'lg' } }))
    expect(w.classes()).toContain('text-base')
  })
})

// ---------------------------------------------------------------------------
describe('ChptTextarea', () => {
  it('label 以 for/id 綁定；輸入送出 update:modelValue', async () => {
    const w = track(mount(ChptTextarea, { props: { label: '備註' } }))
    const ta = w.find('textarea')
    expect(w.find('label').attributes('for')).toBe(ta.attributes('id'))
    await ta.setValue('換線')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['換線'])
  })

  it('showCount + maxlength 顯示「字數/上限」', () => {
    const w = track(mount(ChptTextarea, { props: { modelValue: 'abc', showCount: true, maxlength: 100 } }))
    expect(w.text()).toContain('3/100')
  })

  /** 回歸：沒設 maxlength 時原本顯示「3/」 */
  it('showCount 但沒有 maxlength 時只顯示字數', () => {
    const w = track(mount(ChptTextarea, { props: { modelValue: 'abc', showCount: true } }))
    expect(w.find('span').text()).toBe('3')
  })

  it('errorText：aria-invalid、aria-describedby 指向錯誤訊息', () => {
    const w = track(mount(ChptTextarea, { props: { errorText: '必填' } }))
    const ta = w.find('textarea')
    expect(ta.attributes('aria-invalid')).toBe('true')
    const err = w.find('p[role="alert"]')
    expect(err.text()).toBe('必填')
    expect(ta.attributes('aria-describedby')).toContain(err.attributes('id'))
  })

  it('disabled / readonly / rows', () => {
    const w = track(mount(ChptTextarea, { props: { disabled: true, readonly: true, rows: 6 } }))
    const ta = w.find('textarea')
    expect(ta.attributes('disabled')).toBeDefined()
    expect(ta.attributes('readonly')).toBeDefined()
    expect(ta.attributes('rows')).toBe('6')
  })

  it('autosize：輸入後高度設為 scrollHeight', async () => {
    const w = track(mount(ChptTextarea, { props: { autosize: true }, attachTo: document.body }))
    const el = w.find('textarea').element as HTMLTextAreaElement
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 120 })
    await w.find('textarea').setValue('a\nb\nc')
    expect(el.style.height).toBe('120px')
  })

  it('focus / blur 事件往外送', async () => {
    const w = track(mount(ChptTextarea))
    await w.find('textarea').trigger('focus')
    await w.find('textarea').trigger('blur')
    expect(w.emitted('focus')).toHaveLength(1)
    expect(w.emitted('blur')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
describe('ChptTooltip', () => {
  function mountTip(props: Record<string, unknown> = {}) {
    return track(mount(ChptTooltip, {
      props: { content: '重新整理資料', ...props },
      slots: { default: '<button type="button" aria-describedby="hint">重整</button>' },
      attachTo: document.body,
    }))
  }
  const tip = () => document.body.querySelector('[role="tooltip"]')

  it('聚焦時出現、失焦後關閉', async () => {
    vi.useFakeTimers()
    const w = mountTip()
    await w.find('button').trigger('focusin')
    expect(tip()?.textContent).toContain('重新整理資料')
    expect(w.emitted('show')).toHaveLength(1)
    await w.find('button').trigger('focusout')
    vi.advanceTimersByTime(150)
    await nextTick()
    expect(tip()).toBeNull()
    expect(w.emitted('hide')).toHaveLength(1)
    vi.useRealTimers()
  })

  /** 回歸：aria-describedby 原本掛在不可聚焦的外層 span，提示永遠不會被唸到 */
  it('aria-describedby 掛在觸發按鈕上，且保留按鈕原有的描述', async () => {
    const w = mountTip()
    const btn = w.find('button')
    await w.find('span').trigger('mouseenter')
    await nextTick()
    const id = tip()!.id
    expect(btn.attributes('aria-describedby')!.split(' ')).toEqual(['hint', id])
    expect(w.find('span').attributes('aria-describedby')).toBeUndefined()
  })

  it('關閉後拿掉自己的 id，原有描述保留', async () => {
    vi.useFakeTimers()
    const w = mountTip()
    const btn = w.find('button')
    await w.find('span').trigger('mouseenter')
    await nextTick()
    expect(btn.attributes('aria-describedby')).toContain(tip()!.id)
    await w.find('span').trigger('mouseleave')
    vi.advanceTimersByTime(150)
    await nextTick()
    expect(btn.attributes('aria-describedby')).toBe('hint')
    vi.useRealTimers()
  })

  /** 回歸（WCAG 1.4.13）：游標移到提示上時原本 100ms 後就關掉 */
  it('游標移到提示本身時不會關', async () => {
    vi.useFakeTimers()
    const w = mountTip()
    await w.find('span').trigger('mouseenter')
    await nextTick()
    await w.find('span').trigger('mouseleave')
    tip()!.dispatchEvent(new MouseEvent('mouseenter'))
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(tip()).not.toBeNull()
    vi.useRealTimers()
  })

  /** 回歸（WCAG 1.4.13）：Esc 原本只在焦點位於觸發元素內才有效 */
  it('Esc 在任何地方都能關', async () => {
    const w = mountTip()
    await w.find('span').trigger('mouseenter')
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(tip()).toBeNull()
    expect(w.emitted('hide')).toHaveLength(1)
  })

  /** 回歸：原本 z-50，放在 Modal（z-400）裡時提示被蓋住 */
  it('層級用 z-tooltip（高於 modal）', async () => {
    const w = mountTip()
    await w.find('span').trigger('mouseenter')
    await nextTick()
    expect(tip()!.className).toContain('z-tooltip')
    expect(tip()!.className).not.toContain('z-50')
  })

  it('disabled 時不出現', async () => {
    const w = mountTip({ disabled: true })
    await w.find('span').trigger('mouseenter')
    await nextTick()
    expect(tip()).toBeNull()
  })

  it('content 插槽', async () => {
    const w = track(mount(ChptTooltip, {
      props: { content: 'x' },
      slots: { default: '<button>b</button>', content: '<strong>粗體提示</strong>' },
      attachTo: document.body,
    }))
    await w.find('span').trigger('mouseenter')
    await nextTick()
    expect(tip()!.innerHTML).toContain('<strong>粗體提示</strong>')
  })
})
