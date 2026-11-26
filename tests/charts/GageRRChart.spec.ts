import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import GageRRChart from '@/components/library/charts/GageRRChart.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { GageResult } from '@/components/library/charts/utils/gageRR'
import { gageInteraction, gageNoInteraction } from './fixtures/gageData'

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const node = () => h(GageRRChart, { data: gageNoInteraction, width: 900, ...props })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const vm = () => w.findComponent(GageRRChart).vm as unknown as { result: () => GageResult | null; error: () => string | null }
  return { w, vm }
}
const panel = (w: VueWrapper, k: string) => w.find(`[data-panel="${k}"]`)

describe('GageRRChart', () => {
  it('結論、六張圖、數值表（有公差）', () => {
    const { w, vm } = mountIt({ tolerance: 0.5, title: '外徑量測' })
    expect(w.find('h3').text()).toBe('外徑量測')
    expect(w.find('[data-verdict]').attributes('data-value')).toBe('marginal')
    expect(w.find('[data-verdict]').text()).toContain('有條件接受')
    expect(w.find('[data-summary]').text().replace(/\s+/g, '')).toBe('%GRR（對公差）29.20%·可分辨類別數ndc10（≥5為佳）')
    expect(w.text()).toContain('10 個零件 × 3 位作業員 × 3 次')
    expect(w.find('[data-notes]').text()).toBe('作業員 × 零件交互作用 p = 0.662，不顯著，已併入重複性')
    expect(w.findAll('[data-panel]').map((p) => p.attributes('data-panel'))).toEqual(['components', 'range', 'mean', 'byPart', 'byOperator', 'interaction'])
    // 變異成分：4 組 × 3 系列（含 % 公差）
    expect(panel(w, 'components').findAll('[data-comp] rect')).toHaveLength(12)
    expect(panel(w, 'components').find('figcaption').text()).toContain('% 公差')
    // R / X̄ 圖：30 格
    expect(panel(w, 'range').findAll('[data-cell]')).toHaveLength(30)
    expect(panel(w, 'mean').find('figcaption').text()).toMatch(/% 的點在界限外/)
    expect(panel(w, 'byPart').findAll('[data-part]')).toHaveLength(10)
    expect(panel(w, 'byOperator').findAll('[data-op-box]')).toHaveLength(3)
    expect(panel(w, 'interaction').findAll('[data-op-line]')).toHaveLength(3)
    // 表
    const comp = w.find('[data-table="components"]')
    expect(comp.findAll('tbody tr').map((r) => r.find('th').text())).toEqual(['量測系統（Gage R&R）', '重複性（設備）', '再現性（人員）', '作業員', '零件間', '總變異'])
    expect(comp.findAll('tbody tr')[0].findAll('td').map((c) => c.text())).toEqual(['1.96%', '0.02433', '0.146', '14.00%', '29.20%'])
    expect(comp.find('thead').text()).toContain('研究變異（6 × SD）')
    const anova = w.find('[data-table="anova"]')
    expect(anova.find('caption').text()).toBe('ANOVA（交互作用已併入）')
    expect(anova.findAll('tbody tr')).toHaveLength(4)
    expect(anova.findAll('tbody tr')[1].findAll('td').map((c) => c.text())).toEqual(['2', '0.01896', '0.009478', '33.18', '< 0.001'])
    expect(vm().result()!.ndc).toBe(10)
    expect(vm().error()).toBeNull()
    expect(w.find('[data-panel="components"] svg').attributes('aria-label')).toContain('量測系統')
  })

  it('交互作用顯著、沒有公差、只顯示部分圖、不顯示表、窄版一欄', () => {
    const { w } = mountIt({ data: gageInteraction, panels: ['interaction', 'components', 'nope'], showTables: false, width: 500, multiplier: 5.15 })
    expect(w.find('[data-notes]').text()).toContain('顯著，保留在模型中')
    expect(w.findAll('[data-panel]').map((p) => p.attributes('data-panel'))).toEqual(['interaction', 'components'])
    expect(panel(w, 'components').findAll('[data-comp] rect')).toHaveLength(8)
    expect(w.find('[data-table]').exists()).toBe(false)
    expect(w.find('.grid').attributes('style')).toContain('repeat(1,')
    expect(w.find('[data-summary]').text()).toContain('%GRR（對研究變異） 19.53%')
    const t = mountIt({ data: gageInteraction, multiplier: 5.15 })
    expect(t.w.find('[data-table="anova"] caption').text()).toBe('ANOVA（含交互作用）')
    expect(t.w.findAll('[data-table="components"] tbody tr')).toHaveLength(7)
    expect(t.w.find('[data-table="components"] thead').text()).toContain('5.15 × SD')
    expect(t.w.find('[data-table="components"] thead').text()).not.toContain('% 公差')
  })

  it('滑過：tooltip、同一零件跨圖高亮；作業員圖例標示', async () => {
    const { w } = mountIt()
    const c = panel(w, 'range').find('[data-cell="P3|B"]')
    await c.trigger('mouseenter')
    const tip = panel(w, 'range').find('[data-tip]')
    expect(tip.text()).toContain('零件 P3 · 作業員 B')
    expect(tip.text()).toMatch(/平均 [\d.]+，全距 [\d.]+/)
    // 其他零件淡化、同零件放大
    expect(panel(w, 'mean').find('[data-cell="P1|A"]').attributes('style')).toContain('opacity: 0.35')
    expect(panel(w, 'mean').find('[data-cell="P3|A"]').attributes('r')).toBe('4.5')
    await panel(w, 'range').find('svg').trigger('mouseleave')
    expect(w.find('[data-tip]').exists()).toBe(false)
    // 變異成分長條
    await panel(w, 'components').find('[data-comp="part"] rect').trigger('mouseenter')
    expect(panel(w, 'components').find('[data-tip]').text()).toBe('零件間% 貢獻度：98.04%')
    // 依零件 / 依作業員 / 交互作用
    await panel(w, 'byPart').find('[data-part="P2"]').trigger('mouseenter')
    expect(panel(w, 'byPart').find('[data-tip]').text()).toMatch(/^零件 P2平均 [\d.]+[\d.]+ ～ [\d.]+$/)
    await panel(w, 'byOperator').find('[data-op-box="C"]').trigger('mouseenter')
    expect(panel(w, 'byOperator').find('[data-tip]').text()).toContain('作業員 C')
    expect(panel(w, 'byOperator').find('[data-tip]').text()).toContain('中位數')
    await panel(w, 'interaction').find('[data-op-line="A"] circle').trigger('mouseenter')
    expect(panel(w, 'interaction').find('[data-tip]').text()).toContain('零件 P1 · 作業員 A')
    // 圖例：滑過與點選
    const btn = w.find('[data-op="B"]')
    await btn.trigger('mouseenter')
    expect(panel(w, 'interaction').find('[data-op-line="A"]').attributes('style')).toContain('opacity: 0.2')
    await btn.trigger('mouseleave')
    expect(panel(w, 'interaction').find('[data-op-line="A"]').attributes('style')).toContain('opacity: 1')
    await btn.trigger('click')
    expect(btn.attributes('aria-pressed')).toBe('true')
    expect(panel(w, 'byOperator').find('[data-op-box="A"]').attributes('style')).toContain('opacity: 0.3')
    await btn.trigger('click')
    expect(btn.attributes('aria-pressed')).toBe('false')
  })

  it('鍵盤：依零件圖 ←→ / Home / End 切換並念出', async () => {
    const { w } = mountIt()
    const svg = panel(w, 'byPart').find('svg')
    expect(svg.attributes('tabindex')).toBe('0')
    expect(svg.attributes('role')).toBe('slider')
    await svg.trigger('focus')
    const live = () => w.find('[aria-live]').text()
    expect(live()).toMatch(/^零件 P1，平均/)
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toMatch(/^零件 P2，/)
    expect(svg.attributes('aria-valuenow')).toBe('2')
    await svg.trigger('keydown', { key: 'End' })
    expect(live()).toMatch(/^零件 P10，/)
    await svg.trigger('keydown', { key: 'ArrowRight' })
    expect(live()).toMatch(/^零件 P10，/)
    await svg.trigger('keydown', { key: 'Home' })
    await svg.trigger('keydown', { key: 'ArrowLeft' })
    expect(live()).toMatch(/^零件 P1，/)
    await svg.trigger('keydown', { key: 'a' })
    await svg.trigger('blur')
    expect(w.find('[data-tip]').exists()).toBe(false)
  })

  it('資料問題的提示、自訂空白文字、更換資料時清掉已選作業員', async () => {
    expect(mountIt({ data: [] }).w.find('[data-error]').text()).toBe('沒有量測資料')
    expect(mountIt({ data: [], emptyText: '尚未量測' }).w.find('[data-error]').text()).toBe('尚未量測')
    const missing = mountIt({ data: gageNoInteraction.filter((r) => !(r.part === 'P1' && r.operator === 'C')) })
    expect(missing.w.find('[data-error]').text()).toContain('完整的交叉設計')
    expect(missing.vm().result()).toBeNull()
    expect(missing.vm().error()).toBe('missing')
    // 不平衡：捨去多的並提示
    const extra = mountIt({ data: [...gageNoInteraction, { part: 'P1', operator: 'A', value: 9 }] })
    expect(extra.w.find('[data-trimmed]').text()).toBe('各格量測次數不一，每格只取前 3 次')
    // 換資料：原本標示的作業員不在了就清掉
    const wrap = mount(GageRRChart, { props: { data: gageNoInteraction, width: 900 }, attachTo: document.body })
    mounted.push(wrap)
    await wrap.find('[data-op="C"]').trigger('click')
    await wrap.setProps({ data: gageNoInteraction.filter((r) => r.operator !== 'C') })
    await nextTick()
    expect(wrap.find('[data-op="C"]').exists()).toBe(false)
    await wrap.setProps({ data: gageNoInteraction })
    expect(wrap.find('[data-op="C"]').attributes('aria-pressed')).toBe('false')
  })

  it('一位作業員、R 超出 UCL、判定顏色、數值格式、英文語系', () => {
    const one = mountIt({ data: gageNoInteraction.filter((r) => r.operator === 'A'), valueFormat: (v: number) => v.toFixed(3) })
    expect(one.w.find('[data-notes]').text()).toBe('')
    expect(one.w.find('[data-panel="interaction"] svg').attributes('aria-label')).toBe('作業員 × 零件交互作用：')
    expect(one.w.find('[data-table="anova"] tbody tr').findAll('td')[1].text()).toMatch(/^\d+\.\d{3}$/)
    // 一格的重複量測差很多 → R 超出 UCL、標紅
    const noisy = gageNoInteraction.map((r, i) => (i === 0 ? { ...r, value: r.value + 0.3 } : r))
    const n = mountIt({ data: noisy })
    expect(n.w.find('[data-panel="range"] svg').attributes('aria-label')).toContain('1 個點超出 UCL')
    const bad = mountIt({ tolerance: 0.1 })
    expect(bad.w.find('[data-verdict]').attributes('data-value')).toBe('unacceptable')
    expect(bad.w.find('[data-verdict]').classes()).toContain('bg-danger-subtle')
    const good = mountIt({ tolerance: 3 })
    expect(good.w.find('[data-verdict]').attributes('data-value')).toBe('acceptable')
    expect(good.w.find('[data-verdict]').classes()).toContain('bg-success-subtle')
    expect(mountIt().w.find('[data-panel="range"] svg').attributes('aria-label')).toContain('沒有點超出 UCL')
    const en = mountIt({ tolerance: 0.5 }, (node) => h(ChptConfigProvider, { locale: enUS }, () => node))
    expect(en.w.find('[data-verdict]').text()).toContain('Marginal')
    expect(en.w.text()).toContain('10 parts × 3 operators × 3 trials')
    expect(en.w.find('[data-table="anova"] caption').text()).toBe('ANOVA (interaction pooled)')
    expect(en.w.find('[data-panel="byOperator"] svg').attributes('aria-label')).toMatch(/^By operator: A [\d.]+, B /)
  })
})
