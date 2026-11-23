import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import TreemapChart from '@/components/library/charts/TreemapChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { TreemapNode } from '@/components/library/charts/utils/treemap'

const data: TreemapNode = {
  name: '全部',
  children: [
    {
      name: '一廠',
      children: [
        { name: 'L1', children: [{ name: '空焊', value: 300, metric: 900 }, { name: '短路', value: 100, metric: 300 }] },
        { name: 'L2', value: 200, metric: 400 },
      ],
    },
    { name: '二廠', children: [{ name: 'L5', value: 250, metric: 200 }] },
    { name: '三廠', value: 150, metric: 700, color: 'purple' },
  ],
}

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const path = ref<string[] | undefined>(props.path as string[] | undefined)
  const paths: string[][] = []
  const node = () =>
    h(TreemapChart, {
      data,
      width: 600,
      height: 300,
      unit: '片',
      ...props,
      path: path.value,
      'onUpdate:path': (p: string[]) => (paths.push(p), (path.value = p)),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const chart = () => w.findComponent(TreemapChart)
  const buttons = () => w.findAll('svg g[role="button"]')
  const labels = () => buttons().map((b) => b.attributes('aria-label'))
  const tile = (name: string) => buttons().find((b) => b.attributes('aria-label')!.startsWith(`${name},`))!
  return { w, chart, buttons, labels, tile, path, paths }
}

describe('TreemapChart', () => {
  it('第一層的方塊：依數量排序、aria-label（數量、佔比、可往下）、資料表', () => {
    const { w, labels } = mountIt({ title: '不良' })
    expect(labels()).toEqual(['一廠, 600 片, 60.0%, 有 2 項，可往下看', '二廠, 250 片, 25.0%, 有 1 項，可往下看', '三廠, 150 片, 15.0%'])
    expect(w.find('svg').attributes('aria-label')).toBe('不良：全部，3 項，合計 1,000 片。數值見下方資料表')
    expect(w.findAll('table tbody tr').map((r) => r.findAll('th, td').map((c) => c.text()))).toEqual([
      ['一廠', '600 片', '60.0%'],
      ['二廠', '250 片', '25.0%'],
      ['三廠', '150 片', '15.0%'],
    ])
    // 只有一層時沒有麵包屑
    expect(w.find('nav').exists()).toBe(false)
    // 指定顏色
    expect(w.findAll('rect')[2].attributes('style')).toContain('purple')
  })

  it('點有子節點的方塊往下鑽；麵包屑回上層；最底層送出 node-click', async () => {
    const { w, chart, labels, tile, paths } = mountIt()
    await tile('一廠').trigger('click')
    expect(paths).toEqual([['一廠']])
    expect(labels()).toEqual(['L1, 400 片, 66.7%, 有 2 項，可往下看', 'L2, 200 片, 33.3%'])
    expect(w.find('nav').text().replace(/\s+/g, '')).toBe('全部chevron_right一廠')
    expect(w.find('[aria-current="location"]').text()).toBe('一廠')
    await tile('L2').trigger('click')
    expect(chart().emitted('node-click')).toEqual([[{ name: 'L2', value: 200, metric: 400 }, ['一廠', 'L2']]])
    await w.find('nav button').trigger('click')
    expect(paths[1]).toEqual([])
    expect(labels()).toHaveLength(3)
  })

  it('v-model:path：外部帶入；找不到的路徑停在最深一層', async () => {
    const { labels, path } = mountIt({ path: ['一廠', 'L1'] })
    expect(labels()).toEqual(['空焊, 300 片, 75.0%', '短路, 100 片, 25.0%'])
    path.value = ['二廠', '不存在']
    await nextTick()
    expect(labels()).toEqual(['L5, 250 片, 100.0%'])
    path.value = undefined
    await nextTick()
    expect(labels()).toHaveLength(3)
  })

  it('兩層：第一層有標題列（可點進去），第二層是裡面的方塊（點了直接鑽到它）', async () => {
    const { w, buttons, paths } = mountIt({ levels: 2 })
    expect(buttons()).toHaveLength(3)
    // 第一層 3 + 第二層（L1、L2、L5）3
    expect(w.findAll('svg g')).toHaveLength(6)
    const second = w.findAll('svg g').filter((g) => g.attributes('role') === undefined)
    await second.find((g) => g.text().includes('L1'))!.trigger('click')
    expect(paths).toEqual([['一廠', 'L1']])
  })

  it('滑過：提示（路徑、數量與佔比、可往下）；離開消失', async () => {
    const { w, tile } = mountIt({ path: ['一廠'] })
    await tile('L1').trigger('mouseenter')
    expect(w.find('[data-export-ignore]').text()).toBe('一廠 / L1400 片（66.7%）有 2 項，可往下看')
    await w.find('svg').trigger('mouseleave')
    expect(w.find('[data-export-ignore]').exists()).toBe(false)
  })

  it('依指標上色：色階、發散中心、群組加權平均、資料表多一欄', async () => {
    const { w, tile } = mountIt({ colorBy: 'metric', metricLabel: 'ppm', metricCenter: 500 })
    const fill = (name: string) => tile(name).find('rect').attributes('style')
    // 一廠 = (300·900 + 100·300 + 200·400) / 600 = 633.3 → 高於中心：偏 high（危險色）
    expect(fill('一廠')).toContain('danger-solid')
    // 二廠 200 → 低於中心：偏 low
    expect(fill('二廠')).toContain('chart-1')
    expect(w.text()).toContain('中心 500')
    expect(w.findAll('table thead th').map((t) => t.text())).toEqual(['名稱', '數量', '佔比', 'ppm'])
    expect(w.findAll('table tbody tr')[0].text()).toContain('633.3')
    await tile('一廠').trigger('mouseenter')
    expect(w.find('[data-export-ignore]').text()).toContain('ppm：633.3')
  })

  it('依指標上色（連續）：沒有指標的方塊用淡色；自訂範圍與格式', () => {
    const noMetric: TreemapNode = { name: 'r', children: [{ name: 'a', value: 1 }, { name: 'b', value: 2, metric: 5 }] }
    const { w, tile } = mountIt({ data: noMetric, colorBy: 'metric', metricDomain: [0, 10], metricFormat: (v: number) => `${v}%` })
    expect(tile('a').find('rect').attributes('style')).toContain('surface-muted')
    expect(tile('b').find('rect').attributes('style')).toContain('56%')
    expect(w.text()).toContain('0%')
    expect(w.text()).toContain('10%')
    // 沒有任何指標：不顯示色階
    expect(mountIt({ data: { name: 'r', children: [{ name: 'a', value: 1 }] }, colorBy: 'metric' }).w.text()).not.toContain('中心')
  })

  it('鍵盤：方向鍵依位置移動、Enter 往下、Esc / Backspace 回上層並把焦點放回原本那塊', async () => {
    const { w, tile, paths, chart } = mountIt()
    const svg = w.find('svg')
    tile('一廠').element.focus()
    await tile('一廠').trigger('focus')
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^(二廠|三廠),/)
    await svg.trigger('keydown', { key: 'ArrowLeft' })
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^一廠,/)
    await svg.trigger('keydown', { key: 'ArrowUp' }) // 上面沒有：不動
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^一廠,/)
    await svg.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(paths).toEqual([['一廠']])
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^L1,/)
    await svg.trigger('keydown', { key: 'Escape' })
    await nextTick()
    await nextTick()
    expect(paths[1]).toEqual([])
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^一廠,/)
    // 最上層按 Esc 不動
    await svg.trigger('keydown', { key: 'Backspace' })
    expect(paths).toHaveLength(2)
    // 葉節點 Enter → node-click；其他鍵不處理
    tile('三廠').element.focus()
    await tile('三廠').trigger('focus')
    await svg.trigger('keydown', { key: ' ' })
    expect(chart().emitted('node-click')![0][1]).toEqual(['三廠'])
    await svg.trigger('keydown', { key: 'x' })
    await tile('三廠').trigger('blur')
  })

  it('方法：drillTo、up、reset', async () => {
    const { chart, labels } = mountIt()
    const vm = chart().vm as unknown as { drillTo: (p: string[]) => void; up: () => void; reset: () => void }
    vm.drillTo(['一廠', 'L1'])
    await nextTick()
    expect(labels()[0]).toMatch(/^空焊/)
    vm.up()
    await nextTick()
    expect(labels()[0]).toMatch(/^L1/)
    vm.reset()
    await nextTick()
    expect(labels()).toHaveLength(3)
    vm.up() // 最上層：不動
  })

  it('沒有資料：提示', () => {
    expect(mountIt({ data: { name: 'r', children: [] } }).w.text()).toContain('沒有資料')
    expect(mountIt({ data: { name: 'r' }, emptyText: '空' }).w.text()).toContain('空')
  })

  it('自訂數量格式；放不下的方塊沒有文字', () => {
    const { w } = mountIt({ valueFormat: (v: number) => `#${v}`, width: 120, height: 60 })
    expect(w.find('table').text()).toContain('#600 片')
    const texts = w.findAll('svg text')
    expect(texts.length).toBeLessThan(6)
  })

  it('英文語系', () => {
    const { labels } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(labels()[0]).toBe('一廠, 600 片, 60.0%, 2 items inside, can drill down')
  })
})
