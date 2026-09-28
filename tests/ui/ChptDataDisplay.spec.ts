import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChptDescriptions from '@/components/library/ui/ChptDescriptions.vue'
import ChptStatistic from '@/components/library/ui/ChptStatistic.vue'
import ChptTimeline from '@/components/library/ui/ChptTimeline.vue'

describe('ChptDescriptions', () => {
  const items = [
    { label: '工單', value: 'WO-2026-0917' },
    { label: '料號', value: 'PCB-A12' },
    { label: '數量', value: 1200 },
    { label: '備註', value: null, span: 3 },
  ]

  it('以 dl / dt / dd 呈現，欄位名與值配對', () => {
    const w = mount(ChptDescriptions, { props: { items } })
    expect(w.findAll('dt').map((d) => d.text())).toEqual(['工單：', '料號：', '數量：', '備註：'])
    expect(w.findAll('dd').map((d) => d.text())).toEqual(['WO-2026-0917', 'PCB-A12', '1200', '—'])
  })

  it('column 與 span 透過 CSS 變數設定 grid；span 不超過 column', () => {
    const w = mount(ChptDescriptions, { props: { items: [...items, { label: 'x', value: 1, span: 9 }], column: 3 } })
    expect(w.find('dl').attributes('style')).toContain('--chpt-desc-cols: 3')
    const cells = w.findAll('.chpt-descriptions__item')
    expect(cells[3].attributes('style')).toContain('--chpt-desc-span: 3')
    expect(cells[4].attributes('style')).toContain('--chpt-desc-span: 3')
  })

  it('bordered 時標籤不加冒號，外框只畫上、左（避免外緣兩條線）', () => {
    const w = mount(ChptDescriptions, { props: { items, bordered: true } })
    expect(w.find('dt').text()).toBe('工單')
    expect(w.find('dl').classes()).toEqual(expect.arrayContaining(['border-t', 'border-l']))
    expect(w.find('dl').classes()).not.toContain('border')
  })

  it('標題、extra 與 value 插槽', () => {
    const w = mount(ChptDescriptions, {
      props: { items, title: '工單資訊' },
      slots: {
        extra: '<button type="button">編輯</button>',
        value: `<template #value="{ item }"><b>{{ item.label }}={{ item.value }}</b></template>`,
      },
    })
    expect(w.find('h3').text()).toBe('工單資訊')
    expect(w.find('button').text()).toBe('編輯')
    expect(w.find('dd b').text()).toBe('工單=WO-2026-0917')
  })

  it('emptyText 與上下排列', () => {
    const w = mount(ChptDescriptions, { props: { items, emptyText: '未填', layout: 'vertical' } })
    expect(w.findAll('dd')[3].text()).toBe('未填')
    expect(w.find('dt').text()).toBe('工單')
  })
})

describe('ChptStatistic', () => {
  const text = (w: ReturnType<typeof mount>) => w.text().replace(/\s+/g, ' ')

  it('千分位、精度（遠離零的四捨五入）、前後綴', () => {
    const w = mount(ChptStatistic, { props: { title: '產出', value: 1234567.005, precision: 2, prefix: '$', suffix: 'pcs' } })
    expect(text(w)).toContain('$1,234,567.01pcs')
  })

  it('沒有值顯示 —；字串原樣顯示', () => {
    expect(mount(ChptStatistic, { props: { value: null } }).text()).toContain('—')
    expect(mount(ChptStatistic, { props: { value: 'N/A' } }).text()).toContain('N/A')
    expect(mount(ChptStatistic, { props: { value: 1234, groupSeparator: false } }).text()).toContain('1234')
  })

  it('上升且越高越好 → 綠色、向上箭頭、文字說明「上升」與「較佳」', () => {
    const w = mount(ChptStatistic, { props: { value: 98.2, delta: 1.25, suffix: '%' } })
    const trend = w.find('.text-success')
    expect(trend.exists()).toBe(true)
    expect(trend.text()).toContain('arrow_upward')
    expect(trend.text()).toContain('+1.3%')
    expect(w.find('.sr-only').text()).toBe('上升 1.3%（表現較佳）')
  })

  /**
   * 不良率上升是壞事 —— 只看箭頭方向配色的 KPI 卡片會把它畫成綠色。
   */
  it('higherIsBetter=false：上升顯示紅色、下降顯示綠色', () => {
    const up = mount(ChptStatistic, { props: { value: 3.2, delta: 0.8, higherIsBetter: false } })
    expect(up.find('.text-danger').exists()).toBe(true)
    expect(up.find('.sr-only').text()).toContain('表現較差')
    const down = mount(ChptStatistic, { props: { value: 2.1, delta: -0.4, higherIsBetter: false } })
    expect(down.find('.text-success').exists()).toBe(true)
    expect(down.text()).toContain('−0.4%')
  })

  it('變化在精度內四捨五入為 0 時是持平', () => {
    const w = mount(ChptStatistic, { props: { value: 10, delta: 0.04, deltaPrecision: 1 } })
    expect(w.find('.text-content-tertiary').exists()).toBe(true)
    expect(w.find('.sr-only').text()).toBe('持平')
  })

  it('沒有 delta 就不顯示趨勢', () => {
    const w = mount(ChptStatistic, { props: { value: 10 } })
    expect(w.text()).not.toContain('arrow_')
  })

  it('載入中顯示骨架與 aria-busy', () => {
    const w = mount(ChptStatistic, { props: { value: 10, loading: true } })
    expect(w.find('[aria-busy="true"]').exists()).toBe(true)
    expect(w.text()).not.toContain('10')
  })
})

describe('ChptTimeline', () => {
  const items = [
    { title: '建立工單', time: '09:00', datetime: '2026-09-28T09:00', color: 'primary' as const },
    { title: 'SMT 完成', time: '11:20', color: 'success' as const, content: '良率 99.2%' },
    { title: '品檢', pending: true },
  ]

  it('有序清單，時間用 <time datetime>', () => {
    const w = mount(ChptTimeline, { props: { items } })
    expect(w.element.tagName).toBe('OL')
    expect(w.findAll('li')).toHaveLength(3)
    expect(w.find('time').attributes('datetime')).toBe('2026-09-28T09:00')
    expect(w.text()).toContain('良率 99.2%')
  })

  it('節點顏色用主題角色的完整 class', () => {
    const w = mount(ChptTimeline, { props: { items } })
    const dots = w.findAll('li > span[aria-hidden] span.rounded-full')
    expect(dots[0].classes()).toContain('bg-accent-solid')
    expect(dots[1].classes()).toContain('bg-success-solid')
  })

  it('通往進行中節點的連接線是虛線；最後一個節點沒有連接線', () => {
    const w = mount(ChptTimeline, { props: { items } })
    const lines = w.findAll('li > span.absolute')
    expect(lines).toHaveLength(2)
    expect(lines[0].classes()).toContain('bg-stroke-default')
    expect(lines[1].classes()).toContain('border-dashed')
  })

  /**
   * 真實瀏覽器看到的：有內容的項目，圓點落在「標題 + 內容」的垂直中央，比標題低一截。
   * 節點容器要固定一行文字高，圓點才會對齊標題。
   */
  it('節點容器固定一行高，圓點對齊標題', () => {
    const w = mount(ChptTimeline, { props: { items } })
    const dotBox = w.findAll('li > span[aria-hidden="true"]').find((s) => s.classes().includes('z-[1]'))!
    expect(dotBox.classes()).toContain('h-5')
  })

  it('reverse 反轉順序', () => {
    const w = mount(ChptTimeline, { props: { items, reverse: true } })
    expect(w.findAll('li')[0].text()).toContain('品檢')
  })

  it('空心與圖示節點、aria-current', () => {
    const w = mount(ChptTimeline, {
      props: { items: [{ title: 'A', hollow: true, color: 'danger' }, { title: 'B', icon: 'build', current: true }] },
    })
    expect(w.find('.border-danger').exists()).toBe(true)
    expect(w.text()).toContain('build')
    expect(w.findAll('li')[1].attributes('aria-current')).toBe('step')
  })

  it('content 插槽', () => {
    const w = mount(ChptTimeline, {
      props: { items: [{ title: 'A', content: 'x' }] },
      slots: { content: `<template #content="{ item }"><em>{{ item.title }}!</em></template>` },
    })
    expect(w.find('em').text()).toBe('A!')
  })
})
