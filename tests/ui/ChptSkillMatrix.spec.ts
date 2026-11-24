import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptSkillMatrix from '@/components/library/ui/ChptSkillMatrix.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { SkillDef, SkillMatrixData, SkillPerson } from '@/components/library/shared/skillMatrix'

const DAY = 86_400_000
const NOW = new Date(2026, 5, 1).getTime()
const persons: SkillPerson[] = [
  { id: 'a', name: '陳小明', team: '早班' },
  { id: 'b', name: '林美華', team: '早班' },
  { id: 'c', name: '王大偉', team: '夜班' },
]
const skills: SkillDef[] = [
  { id: 's1', name: '印刷', group: 'SMT', required: 2 },
  { id: 's2', name: '貼片', group: 'SMT', required: 1 },
  { id: 's3', name: '包裝', group: '後段' },
]
const base = (): SkillMatrixData => ({
  a: { s1: { level: 4 }, s2: { level: 3, expiresAt: NOW + 10 * DAY } },
  b: { s1: { level: 3, expiresAt: NOW - DAY }, s3: { level: 2 } },
  c: { s1: { level: 3 } },
})

const mounted: VueWrapper[] = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const matrix = ref<SkillMatrixData>((props.matrix as SkillMatrixData) ?? base())
  const changes: { person: SkillPerson; skill: SkillDef; from: number; to: number }[] = []
  const node = () =>
    h(ChptSkillMatrix, {
      persons,
      skills,
      now: NOW,
      ...props,
      matrix: matrix.value,
      'onUpdate:matrix': (m: SkillMatrixData) => (matrix.value = m),
      onChange: (c: (typeof changes)[number]) => changes.push(c),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const cell = (r: number, c: number) => w.find(`td[data-cell="${r}:${c}"]`)
  return { w, matrix, changes, cell }
}

describe('ChptSkillMatrix', () => {
  it('表頭分組、儲存格標籤（等級與證照）、合格數、合格人數、摘要', () => {
    const { w, cell } = mountIt({ title: '技能' })
    expect(w.findAll('thead tr')[0].text()).toContain('SMT')
    expect(w.findAll('thead tr')[0].text()).toContain('後段')
    expect(cell(0, 0).attributes('aria-label')).toBe('陳小明，印刷：4 可教導他人')
    expect(cell(0, 1).attributes('aria-label')).toBe(`陳小明，貼片：3 可獨立作業 · 證照 ${new Date(NOW + 10 * DAY).toISOString().slice(0, 10)} 到期`)
    expect(cell(1, 0).attributes('aria-label')).toContain('證照已於')
    expect(cell(2, 2).attributes('aria-label')).toBe('王大偉，包裝：0 未訓練')
    // 每人合格數：陳 2、林 0（印刷過期、包裝 2 級）、王 1
    expect(w.findAll('tbody tr').map((r) => r.findAll('td').at(-1)!.text())).toEqual(['2', '0', '1'])
    // 合格人數：印刷 2/2、貼片 1/1、包裝 0
    const foot = w.findAll('tfoot td').map((td) => td.text())
    expect(foot.slice(0, 3)).toEqual(['2/2', '1/1', '0'])
    const text = w.text()
    expect(text).toContain('人力足夠的技能 2 / 2')
    expect(text).toContain('多能工 1 / 3 人')
    expect(text).toContain('1 張證照即將到期')
    expect(text).toContain('1 張證照已過期')
    expect(w.find('table').attributes('aria-label')).toBe('技能')
  })

  it('缺人的技能標紅', () => {
    const { w } = mountIt({ matrix: { a: { s1: { level: 4 } } } })
    expect(w.findAll('tfoot td')[0].attributes('style')).toContain('danger-solid')
    expect(w.text()).toContain('人力足夠的技能 0 / 2')
  })

  it('點格子：依序循環、Shift 往回；選定等級後點了設成那一級', async () => {
    const { w, cell, matrix, changes } = mountIt()
    await cell(2, 2).trigger('click')
    expect(matrix.value.c.s3).toEqual({ level: 1 })
    await cell(2, 2).trigger('click', { shiftKey: true })
    expect(matrix.value.c.s3).toBeUndefined()
    await cell(0, 0).trigger('click')
    expect(matrix.value.a.s1).toBeUndefined() // 4 → 0
    const brush = w.findAll('[role="group"] button').find((b) => b.attributes('aria-label') === '可獨立作業')!
    await brush.trigger('click')
    expect(brush.attributes('aria-pressed')).toBe('true')
    await cell(1, 2).trigger('click')
    expect(matrix.value.b.s3).toEqual({ level: 3 })
    await cell(1, 2).trigger('click') // 已經是 3：不變
    expect(changes.map((c) => [c.person.id, c.skill.id, c.from, c.to])).toEqual([
      ['c', 's3', 0, 1],
      ['c', 's3', 1, 0],
      ['a', 's1', 4, 0],
      ['b', 's3', 2, 3],
    ])
    expect(w.find('[aria-live="polite"]').text()).toBe('林美華 的 包裝 改為 3 可獨立作業')
  })

  it('鍵盤：方向鍵、Home / End 移動；數字鍵設定', async () => {
    const { cell, matrix } = mountIt()
    const focused = () => (document.activeElement as HTMLElement).dataset.cell
    expect(cell(0, 0).attributes('tabindex')).toBe('0')
    ;(cell(0, 0).element as HTMLElement).focus()
    await cell(0, 0).trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(focused()).toBe('0:1')
    await cell(0, 1).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(focused()).toBe('1:1')
    await cell(1, 1).trigger('keydown', { key: 'End' })
    await nextTick()
    expect(focused()).toBe('1:2')
    await cell(1, 2).trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(focused()).toBe('1:0')
    await cell(1, 0).trigger('keydown', { key: 'ArrowUp' })
    await cell(0, 0).trigger('keydown', { key: 'ArrowUp' })
    await cell(0, 0).trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(focused()).toBe('0:0')
    await cell(2, 2).trigger('keydown', { key: 'ArrowDown' })
    await cell(2, 2).trigger('keydown', { key: 'ArrowRight' })
    await cell(2, 2).trigger('keydown', { key: '2' })
    expect(matrix.value.c.s3).toEqual({ level: 2 })
    await cell(2, 2).trigger('keydown', { key: 'x' })
  })

  it('篩選班別、搜尋人員；沒有符合時顯示提示', async () => {
    const { w } = mountIt()
    await w.find('select').setValue('夜班')
    expect(w.findAll('tbody tr')).toHaveLength(1)
    // 合格人數只算篩選後的人
    expect(w.findAll('tfoot td')[0].text()).toBe('1/2')
    await w.find('select').setValue('')
    await w.find('input[type="search"]').setValue('林')
    expect(w.findAll('tbody tr').map((r) => r.find('th').text())).toEqual(['林美華早班'])
    await w.find('input[type="search"]').setValue('zzz')
    expect(w.text()).toContain('沒有符合的人員或技能')
  })

  it('readonly：不能改、沒有設定工具；沒有班別時不顯示篩選；maxHeight；沒有分組時只有一列表頭', async () => {
    const { w, cell, matrix } = mountIt({ readonly: true, maxHeight: 200 })
    await cell(0, 0).trigger('click')
    await cell(0, 0).trigger('keydown', { key: '1' })
    expect(matrix.value.a.s1).toEqual({ level: 4 })
    expect(w.find('[role="group"]').exists()).toBe(false)
    expect(w.find('table').attributes('aria-readonly')).toBe('true')
    expect(w.find('.overflow-auto').attributes('style')).toContain('max-height: 200px')
    const plain = mountIt({ persons: [{ id: 'a', name: 'A' }], skills: [{ id: 's1', name: 'S' }] })
    expect(plain.w.find('select').exists()).toBe(false)
    expect(plain.w.findAll('thead tr')).toHaveLength(1)
  })

  it('now 為 null / Date；英文語系', () => {
    expect(mountIt({ now: null }).w.text()).toContain('多能工')
    expect(mountIt({ now: new Date(NOW) }).w.text()).toContain('1 張證照已過期')
    const { w, cell } = mountIt({}, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(w.text()).toContain('Multi-skilled 1 / 3')
    expect(cell(0, 0).attributes('aria-label')).toBe('陳小明, 印刷: 4 Can train others')
  })
})
