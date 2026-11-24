import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import SunburstChart from '@/components/library/charts/SunburstChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { TreemapNode } from '@/components/library/charts/utils/treemap'

const data: TreemapNode = {
  name: '全部',
  children: [
    { name: '焊接', children: [{ name: '空焊', children: [{ name: '回焊', value: 200 }, { name: '波焊', value: 100 }] }, { name: '短路', value: 100 }] },
    { name: '零件', children: [{ name: '偏移', value: 150 }, { name: '缺件', value: 50 }] },
    { name: '外觀', value: 100, color: 'purple' },
  ],
}

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const path = ref<string[] | undefined>(props.path as string[] | undefined)
  const paths: string[][] = []
  const clicks: [TreemapNode, string[]][] = []
  const node = () =>
    h(SunburstChart, {
      data,
      width: 500,
      height: 500,
      unit: '片',
      ...props,
      path: path.value,
      'onUpdate:path': (p: string[]) => (paths.push(p), (path.value = p)),
      onNodeClick: (n: TreemapNode, p: string[]) => clicks.push([n, p]),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const arc = (label: string) => w.findAll('g[role="button"]').find((g) => g.attributes('aria-label')!.startsWith(`${label},`))!
  const focused = () => document.activeElement?.getAttribute('aria-label')?.split(',')[0]
  return { w, path, paths, clicks, arc, focused }
}

describe('SunburstChart', () => {
  it('畫三圈、中央是目前節點與合計、可放下的弧有文字、隱藏資料表', () => {
    const { w, arc } = mountIt({ title: '不良' })
    expect(w.findAll('g[role="button"]')).toHaveLength(9)
    expect(w.text()).toContain('全部')
    expect(w.text()).toContain('700 片')
    expect(arc('焊接').attributes('aria-label')).toBe('焊接, 400 片, 57.1%, 有 2 個子項，點了往下')
    expect(arc('焊接 / 空焊 / 回焊').attributes('aria-label')).toBe('焊接 / 空焊 / 回焊, 200 片, 28.6%')
    expect(arc('焊接').find('text').text()).toBe('焊接')
    expect(arc('外觀').find('path').attributes('style')).toContain('purple')
    // 外圈比內圈淡
    expect(arc('焊接 / 空焊').find('path').attributes('style')).toContain('color-mix')
    expect(w.findAll('tbody tr').map((r) => r.text())).toEqual(['焊接400 片57.1%', '零件200 片28.6%', '外觀100 片14.3%'])
    expect(w.find('svg').attributes('aria-label')).toBe('不良：全部，3 項，合計 700 片')
    // 最上層時中央不是按鈕
    expect(w.findAll('g[role="button"]').some((g) => g.attributes('aria-label')!.startsWith('回到'))).toBe(false)
  })

  it('levels：只畫兩圈', () => {
    const { w } = mountIt({ levels: 2 })
    expect(w.findAll('g[role="button"]')).toHaveLength(7)
  })

  it('滑過：路徑以外淡化、提示佔比與佔上一層', async () => {
    const { w, arc } = mountIt()
    await arc('焊接 / 空焊').trigger('mouseenter')
    expect(arc('零件').find('path').attributes('style')).toContain('opacity: 0.4')
    expect(arc('焊接').find('path').attributes('style')).toContain('opacity: 1')
    const tip = w.find('.pointer-events-none.absolute').text()
    expect(tip).toContain('焊接 / 空焊')
    expect(tip).toContain('300 片（佔 42.9%）')
    expect(tip).toContain('佔 焊接 的 75.0%')
    expect(tip).toContain('有 2 個子項')
    await w.find('svg').trigger('mouseleave')
    expect(w.find('.pointer-events-none.absolute').exists()).toBe(false)
  })

  it('點弧往下鑽；最外圈送出 node-click；中央與麵包屑回上層', async () => {
    const { w, arc, paths, clicks } = mountIt()
    await arc('焊接').trigger('click')
    expect(paths).toEqual([['焊接']])
    expect(w.find('nav').text()).toContain('全部')
    expect(arc('空焊').exists()).toBe(true)
    await arc('空焊 / 回焊').trigger('click')
    expect(clicks[0][1]).toEqual(['焊接', '空焊', '回焊'])
    const center = w.findAll('g[role="button"]').find((g) => g.attributes('aria-label') === '回到 全部')!
    await center.trigger('click')
    expect(paths.at(-1)).toEqual([])
    await arc('零件').trigger('click')
    await w.find('nav button').trigger('click')
    expect(paths.at(-1)).toEqual([])
    // 最上層按中央沒有作用
    const before = paths.length
    await w.find('svg circle').trigger('click')
    expect(paths.length).toBe(before)
  })

  it('外部 v-model:path 與方法', async () => {
    const { w, path, arc } = mountIt({ path: ['零件'] })
    expect(w.text()).toContain('200 片')
    expect(arc('偏移').exists()).toBe(true)
    path.value = ['焊接', '空焊']
    await nextTick()
    expect(arc('回焊').exists()).toBe(true)
    const vm = w.findComponent(SunburstChart).vm as unknown as { up: () => void; reset: () => void; drillTo: (p: string[]) => void }
    vm.up()
    await nextTick()
    expect(arc('空焊').exists()).toBe(true)
    vm.drillTo(['零件'])
    await nextTick()
    expect(arc('缺件').exists()).toBe(true)
    vm.reset()
    await nextTick()
    expect(arc('焊接').exists()).toBe(true)
  })

  it('鍵盤：← → 同一圈、↑ 往外、↓ 往內、Enter 往下、Esc 回上層並回到原本那一塊', async () => {
    const { arc, focused, paths, w } = mountIt()
    expect(arc('焊接').attributes('tabindex')).toBe('0')
    ;(arc('焊接').element as SVGGElement).focus()
    await arc('焊接').trigger('focus')
    await arc('焊接').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(focused()).toBe('零件')
    await arc('零件').trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(focused()).toBe('焊接')
    await arc('焊接').trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(focused()).toBe('焊接 / 空焊')
    await arc('焊接 / 空焊').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(focused()).toBe('焊接')
    await arc('外觀').trigger('keydown', { key: 'ArrowUp' }) // 沒有子節點：不動
    await arc('焊接').trigger('keydown', { key: 'x' })
    await arc('焊接').trigger('keydown', { key: 'Escape' }) // 最上層：不處理
    expect(paths).toEqual([])
    await arc('焊接').trigger('keydown', { key: 'Enter' })
    await nextTick()
    await nextTick()
    expect(paths).toEqual([['焊接']])
    expect(focused()).toBe('空焊')
    await arc('空焊').trigger('keydown', { key: 'Backspace' })
    await nextTick()
    await nextTick()
    expect(paths.at(-1)).toEqual([])
    expect(focused()).toBe('焊接')
    // 中央按鈕：Enter / 空白鍵
    await arc('焊接').trigger('keydown', { key: ' ' })
    await nextTick()
    const center = w.findAll('g[role="button"]').find((g) => g.attributes('aria-label') === '回到 全部')!
    await center.trigger('keydown', { key: 'Enter' })
    expect(paths.at(-1)).toEqual([])
    await arc('焊接').trigger('click')
    await w.findAll('g[role="button"]').find((g) => g.attributes('aria-label') === '回到 全部')!.trigger('keydown', { key: ' ' })
    expect(paths.at(-1)).toEqual([])
  })

  it('沒有資料、valueFormat、英文語系', () => {
    expect(mountIt({ data: { name: 'x' } }).w.text()).toContain('沒有資料')
    expect(mountIt({ data: { name: 'x' }, emptyText: '空的' }).w.text()).toContain('空的')
    const f = mountIt({ valueFormat: (v: number) => `$${v}`, unit: '' })
    expect(f.w.text()).toContain('$700')
    const { w } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.find('svg').attributes('aria-label')).toBe('Sunburst chart: 全部, 3 items, total 700 片')
  })
})
