import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptCascader, { type CascaderOption } from '@/components/library/ui/ChptCascader.vue'

const options: CascaderOption[] = [
  {
    value: 'fab-a',
    label: 'FAB-A',
    children: [
      { value: 'smt', label: 'SMT', children: [{ value: 'l1', label: 'Line 1' }, { value: 'l2', label: 'Line 2' }] },
      { value: 'aoi', label: 'AOI' },
      { value: 'lock', label: 'Locked', disabled: true },
    ],
  },
  { value: 'fab-b', label: 'FAB-B', children: [{ value: 'b1', label: 'Bonding' }] },
  { value: 'office', label: 'Office' },
]

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountCascader(props: Record<string, unknown> = {}) {
  const w = mount(ChptCascader, {
    props: {
      label: '產線',
      options,
      ...props,
      'onUpdate:modelValue': (v: unknown) => w.setProps({ modelValue: v }),
    },
    attachTo: document.body,
  })
  wrapper = w
  return w
}

const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await nextTick()
    await Promise.resolve()
  }
}
const trigger = (w: ReturnType<typeof mount>) => w.find(`#${w.find('label').attributes('for')}`)
const columns = (w: ReturnType<typeof mount>) =>
  w.findAll('[role="listbox"]').map((col) => col.findAll('[role="option"]').map((o) => o.find('.truncate').text()))
const option = (w: ReturnType<typeof mount>, label: string) =>
  w.findAll('[role="option"]').find((o) => o.find('.truncate').text() === label)!
const focusedLabel = () => (document.activeElement as HTMLElement)?.querySelector('.truncate')?.textContent?.trim()
const press = async (w: ReturnType<typeof mount>, key: string) => {
  await w.find('[role="dialog"]').trigger('keydown', { key })
  await flush()
}

describe('ChptCascader：顯示與滑鼠', () => {
  it('觸發鈕：標籤指得到、aria-haspopup / expanded、顯示 placeholder', async () => {
    const w = mountCascader()
    expect(trigger(w).element.tagName).toBe('BUTTON')
    expect(trigger(w).attributes('aria-haspopup')).toBe('dialog')
    expect(trigger(w).attributes('aria-expanded')).toBe('false')
    expect(trigger(w).text()).toContain('請選擇')
  })

  it('一欄一欄展開，選到葉節點時送出整條路徑並關閉', async () => {
    const w = mountCascader()
    await trigger(w).trigger('click')
    await flush()
    expect(columns(w)).toEqual([['FAB-A', 'FAB-B', 'Office']])
    await option(w, 'FAB-A').trigger('click')
    await flush()
    expect(columns(w)[1]).toEqual(['SMT', 'AOI', 'Locked'])
    await option(w, 'SMT').trigger('click')
    await flush()
    expect(columns(w)[2]).toEqual(['Line 1', 'Line 2'])
    expect(w.emitted('update:modelValue')).toBeUndefined() // 中間層不算答案
    await option(w, 'Line 2').trigger('click')
    await flush()
    expect(w.props('modelValue')).toEqual(['fab-a', 'smt', 'l2'])
    expect(w.emitted('change')?.[0][1].map((n: CascaderOption) => n.label)).toEqual(['FAB-A', 'SMT', 'Line 2'])
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    expect(trigger(w).text()).toContain('FAB-A / SMT / Line 2')
    expect(document.activeElement).toBe(trigger(w).element)
  })

  it('第 2 欄起以上一層命名；有下一層的選項附帶說明', async () => {
    const w = mountCascader()
    await trigger(w).trigger('click')
    await option(w, 'FAB-A').trigger('click')
    await flush()
    const lists = w.findAll('[role="listbox"]')
    expect(lists[0].attributes('aria-label')).toBe('產線')
    expect(lists[1].attributes('aria-label')).toBe('FAB-A')
    expect(option(w, 'FAB-A').text()).toContain('有下一層')
    expect(option(w, 'FAB-A').attributes('aria-selected')).toBe('true')
    expect(option(w, 'AOI').text()).not.toContain('有下一層')
  })

  it('停用的選項點不下去', async () => {
    const w = mountCascader()
    await trigger(w).trigger('click')
    await option(w, 'FAB-A').trigger('click')
    await flush()
    await option(w, 'Locked').trigger('click')
    await flush()
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(option(w, 'Locked').attributes('aria-disabled')).toBe('true')
  })

  it('showAllLevels=false 只顯示最後一層；自訂分隔', () => {
    expect(mountCascader({ modelValue: ['fab-b', 'b1'], showAllLevels: false }).find('button').text()).toContain('Bonding')
    wrapper!.unmount()
    expect(mountCascader({ modelValue: ['fab-b', 'b1'], separator: ' > ' }).find('button').text()).toContain('FAB-B > Bonding')
  })

  it('changeOnSelect：點中間層就送出', async () => {
    const w = mountCascader({ changeOnSelect: true })
    await trigger(w).trigger('click')
    await option(w, 'FAB-B').trigger('click')
    await flush()
    expect(w.props('modelValue')).toEqual(['fab-b'])
    expect(w.find('[role="dialog"]').exists()).toBe(true)
  })

  it('expandTrigger=hover：滑過就展開', async () => {
    const w = mountCascader({ expandTrigger: 'hover' })
    await trigger(w).trigger('click')
    await option(w, 'FAB-B').trigger('mouseenter')
    await flush()
    expect(columns(w)[1]).toEqual(['Bonding'])
  })

  it('clearable：清除鈕有名稱，清成 null', async () => {
    const w = mountCascader({ modelValue: ['office'], clearable: true })
    await w.find('button[aria-label="清除"]').trigger('click')
    expect(w.props('modelValue')).toBeNull()
  })

  it('開啟時展開到目前的值，焦點在已選的那一項', async () => {
    const w = mountCascader({ modelValue: ['fab-a', 'smt', 'l2'] })
    await trigger(w).trigger('click')
    await flush()
    expect(columns(w)).toHaveLength(3)
    expect(focusedLabel()).toBe('Line 2')
  })
})

describe('ChptCascader：無障礙名稱', () => {
  /** 只靠 <label for> 時按鈕名稱會被標籤蓋掉，螢幕閱讀器聽不到選了什麼 */
  it('觸發鈕的名稱 = 標籤 + 目前的值', () => {
    const w = mountCascader({ modelValue: ['fab-b', 'b1'] })
    const ids = trigger(w).attributes('aria-labelledby')!.split(' ')
    expect(ids.map((i) => w.find(`#${i}`).text())).toEqual(['產線', 'FAB-B / Bonding'])
  })

  it('沒有標籤時名稱就是值（或 placeholder）', () => {
    const w = mountCascader({ label: '' })
    const ids = w.find('button').attributes('aria-labelledby')!.split(' ')
    expect(ids).toHaveLength(1)
    expect(w.find(`#${ids[0]}`).text()).toBe('請選擇')
  })
})

describe('ChptCascader：鍵盤', () => {
  it('↓ 開啟並聚焦第一欄；↑↓ 移動、→ 進入下一層、← 回上一層、Enter 選取', async () => {
    const w = mountCascader()
    await trigger(w).trigger('keydown', { key: 'ArrowDown' })
    await flush()
    expect(focusedLabel()).toBe('FAB-A')
    await press(w, 'ArrowDown')
    expect(focusedLabel()).toBe('FAB-B')
    await press(w, 'ArrowUp')
    await press(w, 'ArrowRight')
    expect(focusedLabel()).toBe('SMT')
    await press(w, 'ArrowRight')
    expect(focusedLabel()).toBe('Line 1')
    await press(w, 'ArrowLeft')
    expect(focusedLabel()).toBe('SMT')
    await press(w, 'End')
    expect(focusedLabel()).toBe('AOI') // 最後一個未停用的
    await press(w, 'Enter')
    expect(w.props('modelValue')).toEqual(['fab-a', 'aoi'])
  })

  it('Escape 關閉並歸還焦點', async () => {
    const w = mountCascader()
    await trigger(w).trigger('click')
    await flush()
    await press(w, 'Escape')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger(w).element)
  })

  it('每一欄只有一個 tabindex=0', async () => {
    const w = mountCascader({ modelValue: ['fab-a', 'aoi'] })
    await trigger(w).trigger('click')
    await flush()
    const stops = w.findAll('[role="option"]').filter((o) => o.attributes('tabindex') === '0')
    expect(stops).toHaveLength(1)
  })
})

describe('ChptCascader：延遲載入', () => {
  it('展開沒有 children 的節點時呼叫 load，載入後顯示下一層', async () => {
    const load = vi.fn(async (node: CascaderOption) =>
      node.value === 'root' ? [{ value: 'c1', label: 'Child', leaf: true }] : []
    )
    const w = mountCascader({ options: [{ value: 'root', label: 'Root' }], load })
    await trigger(w).trigger('click')
    await flush()
    expect(option(w, 'Root').text()).toContain('有下一層')
    await option(w, 'Root').trigger('click')
    await flush()
    expect(load).toHaveBeenCalledTimes(1)
    expect(columns(w)[1]).toEqual(['Child'])
    await option(w, 'Child').trigger('click')
    await flush()
    expect(w.props('modelValue')).toEqual(['root', 'c1'])
    expect(trigger(w).text()).toContain('Root / Child')
  })

  it('load 回傳空陣列時該節點變成葉節點（直接選取）', async () => {
    const w = mountCascader({ options: [{ value: 'r', label: 'R' }], load: async () => [] })
    await trigger(w).trigger('click')
    await option(w, 'R').trigger('click')
    await flush()
    expect(w.props('modelValue')).toEqual(['r'])
  })
})

describe('ChptCascader：表單', () => {
  it('errorText → aria-invalid 與紅框', () => {
    const w = mountCascader({ errorText: '請選擇產線' })
    expect(trigger(w).attributes('aria-invalid')).toBe('true')
    expect(trigger(w).classes()).toContain('border-danger')
  })
})
