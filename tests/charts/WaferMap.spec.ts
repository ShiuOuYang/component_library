import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import WaferMap from '@/components/library/charts/WaferMap.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import { dieRect, farthestCorner, layoutWafer } from '@/components/library/charts/utils/waferMap'

/**
 * 5 × 5 的晶圓，四個角沒有晶粒（21 顆）。
 * bin 1 良品；中心 (2,2) 是 bin 3、(4,2) 是 bin 7。
 * 圖 200 × 200：jsdom 的 getBoundingClientRect 是 0，clientX / clientY 就是畫布座標。
 */
type Die = { id: string; x: number; y: number; bin: number; v: number }
const DIES: Die[] = []
for (let y = 0; y <= 4; y++)
  for (let x = 0; x <= 4; x++) {
    if ((x === 0 || x === 4) && (y === 0 || y === 4)) continue
    DIES.push({ id: `D${x}${y}`, x, y, bin: x === 2 && y === 2 ? 3 : x === 4 && y === 2 ? 7 : 1, v: x + y })
  }
const GRID = { minX: 0, maxX: 4, minY: 0, maxY: 4 }
const LAYOUT = layoutWafer({ width: 200, height: 200, grid: GRID, reach: farthestCorner(DIES, GRID) })
const centerOf = (x: number, y: number) => {
  const r = dieRect(LAYOUT, x, y)
  return { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }
}

let fills: Array<{ color: string; x: number; y: number }> = []
beforeEach(() => {
  fills = []
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    const ctx = {
      fillStyle: '',
      setTransform: () => {},
      clearRect: () => {},
      fillRect: (x: number, y: number) => fills.push({ color: ctx.fillStyle, x, y }),
    }
    return ctx as unknown as CanvasRenderingContext2D
  })
})

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

async function mountMap(props: Record<string, unknown> = {}) {
  wrapper = mount(WaferMap, { props: { data: DIES, width: 200, height: 200, keyField: 'id', ...props }, attachTo: document.body })
  await nextTick()
  await nextTick()
  return wrapper
}

const hit = (w: VueWrapper) => w.find('.wafer-hit')
/** 畫在某顆晶粒位置的顏色 */
const colorAt = (x: number, y: number) => {
  const r = dieRect(LAYOUT, x, y)
  return fills.filter((f) => Math.abs(f.x - r.x) < 1 && Math.abs(f.y - r.y) < 1).at(-1)?.color
}

describe('WaferMap', () => {
  it('每顆晶粒畫一次；良率與各 bin 顆數；外框與缺口', async () => {
    const w = await mountMap()
    expect(fills).toHaveLength(21)
    expect(w.find('.wafer-yield').text()).toContain('90.5%')
    expect(w.find('.wafer-yield').text()).toContain('19 / 21')
    const legend = w.findAll('.wafer-legend-item').map((b) => b.findAll('span').slice(1).map((s) => s.text()).join(' '))
    expect(legend).toEqual(['1 · 良品 19', '3 1', '7 1'])
    expect(w.find('circle.wafer-frame').exists()).toBe(true)
    expect(w.find('polygon.wafer-notch').exists()).toBe(true)
    expect(hit(w).attributes('aria-label')).toBe('晶圓圖，21 顆晶粒，良率 90.5%。方向鍵逐顆移動，Enter 選取')
  })

  it('bins 設定的顏色、標籤與 pass；沒設定的 bin 自動配色', async () => {
    const w = await mountMap({
      bins: [
        { value: 1, label: 'Good', color: '#00aa00' },
        { value: 3, label: '短路', color: '#ff0000' },
      ],
    })
    expect(colorAt(2, 2)).toBe('#ff0000')
    expect(colorAt(1, 1)).toBe('#00aa00')
    expect(colorAt(4, 2)).toMatch(/var\(--t-chart-2\)|rgb/)
    expect(w.findAll('.wafer-legend-item').map((b) => b.findAll('span')[1].text())).toEqual(['Good', '短路', '7'])
    // 設定裡沒寫 pass 的 bin 1 依 passBins 算良品
    expect(w.findAll('.wafer-legend-item')[0].text()).toContain('良品')
  })

  it('圖例點一下淡化該 bin（不移除）並送出 update:hiddenBins', async () => {
    const w = await mountMap({ bins: [{ value: 3, color: '#ff0000' }] })
    const item = w.findAll('.wafer-legend-item')[0]
    expect(item.attributes('aria-pressed')).toBe('true')
    fills = []
    await item.trigger('click')
    await nextTick()
    expect(w.emitted('update:hiddenBins')![0][0]).toEqual(['3'])
    expect(item.attributes('aria-pressed')).toBe('false')
    expect(colorAt(2, 2)).not.toBe('#ff0000')
    expect(fills.filter((f) => f.color === '#ff0000')).toHaveLength(0)
  })

  it('滑鼠移到晶粒上顯示提示框並送出 die-hover；點擊送出 die-click', async () => {
    const w = await mountMap()
    await hit(w).trigger('mousemove', centerOf(4, 2))
    expect(w.find('.wafer-tooltip').text()).toContain('座標 (4, 2)')
    expect(w.find('.wafer-tooltip').text()).toContain('Bin 7')
    const hover = w.emitted('die-hover')![0][0] as { x: number; y: number; bin: string; pass: boolean; datum: Die }
    expect(hover).toMatchObject({ x: 4, y: 2, bin: '7', pass: false })
    expect(hover.datum.id).toBe('D42')
    await hit(w).trigger('click', centerOf(1, 3))
    expect(w.emitted('die-click')![0][0]).toMatchObject({ x: 1, y: 3, pass: true })
    // 角落沒有晶粒
    await hit(w).trigger('mousemove', centerOf(0, 0))
    expect(w.find('.wafer-tooltip').exists()).toBe(false)
    expect(w.emitted('die-hover')!.at(-1)![0]).toBeNull()
    await hit(w).trigger('click', centerOf(0, 0))
    expect(w.emitted('die-click')).toHaveLength(1)
  })

  it('鍵盤：第一次按方向鍵到中心，之後逐顆移動並念出；Enter 選取、Escape 離開', async () => {
    const w = await mountMap()
    const live = () => w.find('[aria-live="polite"]').text()
    await hit(w).trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toBe('座標 (2, 2), Bin 3')
    expect(w.find('rect.wafer-cursor').exists()).toBe(true)
    await hit(w).trigger('keydown', { key: 'ArrowRight' })
    await hit(w).trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toBe('座標 (4, 2), Bin 7')
    await hit(w).trigger('keydown', { key: 'ArrowDown' }) // (4,3)
    await hit(w).trigger('keydown', { key: 'ArrowDown' }) // (4,4) 是空的角落 → 停在原地
    expect(live()).toBe('座標 (4, 3), Bin 1 · 良品')
    await hit(w).trigger('keydown', { key: 'Enter' })
    expect(w.emitted('die-click')![0][0]).toMatchObject({ x: 4, y: 3 })
    await hit(w).trigger('keydown', { key: 'Escape' })
    expect(w.find('rect.wafer-cursor').exists()).toBe(false)
    await hit(w).trigger('keydown', { key: 'a' })
    expect(w.emitted('die-click')).toHaveLength(1)
  })

  it('數值模式：依數值上色、顯示色階；沒有良率與 bin 圖例', async () => {
    const w = await mountMap({ valueField: 'v', valueColors: ['#000000', '#ffffff'], valueFormat: (v: number) => v.toFixed(1) })
    // 角落沒有晶粒：v 的範圍是 1..7
    expect(colorAt(0, 1)).toBe('rgb(0, 0, 0)')
    expect(colorAt(2, 2)).toBe('rgb(128, 128, 128)')
    expect(colorAt(4, 3)).toBe('rgb(255, 255, 255)')
    expect(w.find('.wafer-yield').exists()).toBe(false)
    expect(w.find('.wafer-legend-item').exists()).toBe(false)
    expect(w.findAll('.wafer-scale > span').map((s) => s.text())).toEqual(['1.0', '', '7.0'])
    await hit(w).trigger('mousemove', centerOf(3, 3))
    expect(w.find('.wafer-tooltip').text()).toContain('數值: 6.0')
  })

  it('數值模式預設 viridis；缺值畫成淡色；所有值相同時不會除以零', async () => {
    const data = DIES.map((d) => ({ ...d, v: d.x === 2 && d.y === 2 ? null : 5 }))
    await mountMap({ data, valueField: 'v' })
    const colors = new Set(fills.map((f) => f.color))
    expect(colors.size).toBe(2)
  })

  it('rings：分區良率與同心圓分界', async () => {
    const w = await mountMap({ rings: 2 })
    const zones = w.findAll('.wafer-ring-yield > div').map((d) => d.text())
    expect(zones).toHaveLength(2)
    expect(zones[0]).toMatch(/^中心/)
    expect(zones[1]).toMatch(/^外圈/)
    // 分區良率清單由 dl 外的 sr-only 標題命名（dl 裡只能放 dt / dd）
    const dl = w.find('dl')
    const title = w.find(`#${dl.attributes('aria-labelledby')}`)
    expect(title.exists()).toBe(true)
    expect(title.text()).not.toBe('')
    expect(w.findAll('.wafer-rings circle')).toHaveLength(1)
  })

  it('panel 外形、flipY、highlightKey、title', async () => {
    const w = await mountMap({ shape: 'panel', flipY: true, highlightKey: 'D13', title: 'Lot A / #07' })
    expect(w.find('rect.wafer-frame').exists()).toBe(true)
    expect(w.find('polygon.wafer-notch').exists()).toBe(false)
    expect(w.find('h3').text()).toBe('Lot A / #07')
    expect(hit(w).attributes('aria-label')).toMatch(/^Lot A \/ #07：晶圓圖/)
    const l = layoutWafer({ width: 200, height: 200, grid: { minX: 0, maxX: 4, minY: 0, maxY: 4 }, shape: 'panel', flipY: true })
    expect(Number(w.find('rect.wafer-highlight').attributes('y'))).toBeCloseTo(dieRect(l, 1, 3).y - 1)
  })

  it('grid 固定範圍；tooltipFormatter；enableTooltip=false', async () => {
    const w = await mountMap({ grid: { minX: -2, maxX: 6, minY: -2, maxY: 6 }, tooltipFormatter: (i: { x: number; datum: Die }) => [`#${i.datum.id}`] })
    const l = layoutWafer({ width: 200, height: 200, grid: { minX: -2, maxX: 6, minY: -2, maxY: 6 } })
    const r = dieRect(l, 2, 2)
    await hit(w).trigger('mousemove', { clientX: r.x + 1, clientY: r.y + 1 })
    expect(w.find('.wafer-tooltip').text()).toBe('#D22')
    await w.setProps({ enableTooltip: false })
    await hit(w).trigger('mousemove', centerOf(1, 1))
    expect(w.find('.wafer-tooltip').exists()).toBe(false)
  })

  it('沒有資料時顯示空狀態', async () => {
    const w = await mountMap({ data: [] })
    expect(w.text()).toContain('沒有晶粒資料')
    expect(w.find('canvas').exists()).toBe(false)
  })

  it('語系：enUS', async () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(WaferMap, { data: DIES, width: 200, height: 200, rings: 3 })) }, { attachTo: document.body })
    await nextTick()
    expect(wrapper.find('.wafer-yield').text()).toContain('Yield')
    expect(wrapper.find('.wafer-yield').text()).toContain('(19 / 21 dies)')
    expect(wrapper.find('.wafer-hit').attributes('aria-label')).toMatch(/^Wafer map, 21 dies, yield 90.5%/)
    expect(wrapper.findAll('.wafer-ring-yield > div').map((d) => d.text().split(/\d/)[0])).toEqual(['Center', 'Ring ', 'Edge'])
  })

  it('ref summary() / redraw()', async () => {
    const w = await mountMap()
    const vm = w.vm as unknown as { summary: () => { pass: number; total: number }; redraw: () => void }
    expect(vm.summary()).toMatchObject({ pass: 19, total: 21 })
    fills = []
    vm.redraw()
    expect(fills).toHaveLength(21)
  })
})
