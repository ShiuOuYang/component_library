import { describe, expect, it } from 'vitest'
import {
  cellOf,
  groupSkills,
  isQualified,
  personQualified,
  setSkillLevel,
  skillCoverage,
  skillExpiry,
  skillMatrixSummary,
  type SkillDef,
  type SkillMatrixData,
  type SkillPerson,
} from '@/components/library/shared/skillMatrix'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 5, 1)
const persons: SkillPerson[] = [
  { id: 'a', name: 'A', team: '早' },
  { id: 'b', name: 'B', team: '早' },
  { id: 'c', name: 'C', team: '晚' },
]
const skills: SkillDef[] = [
  { id: 's1', name: 'S1', group: 'G1', required: 2 },
  { id: 's2', name: 'S2', group: 'G2', required: 3 },
  { id: 's3', name: 'S3', group: 'G1' },
]
const matrix: SkillMatrixData = {
  a: { s1: { level: 4 }, s2: { level: 3, expiresAt: NOW + 10 * DAY }, s3: { level: 1 } },
  b: { s1: { level: 3, expiresAt: NOW - DAY }, s2: { level: 3 }, s3: { level: 3, expiresAt: '2030-01-01' } },
  c: { s1: { level: 2 } },
}

describe('skillMatrix', () => {
  it('cellOf：沒有資料時為 0 級', () => {
    expect(cellOf(matrix, 'a', 's1')).toEqual({ level: 4 })
    expect(cellOf(matrix, 'c', 's2')).toEqual({ level: 0 })
    expect(cellOf(matrix, 'zz', 's1')).toEqual({ level: 0 })
  })

  it('skillExpiry 與 isQualified：過期不算合格', () => {
    expect(skillExpiry({ level: 3 }, NOW, 30)).toBe('none')
    expect(skillExpiry({ level: 3, expiresAt: NOW + 10 * DAY }, NOW, 30)).toBe('soon')
    expect(skillExpiry({ level: 3, expiresAt: NOW + 40 * DAY }, NOW, 30)).toBe('ok')
    expect(skillExpiry({ level: 3, expiresAt: NOW }, NOW, 30)).toBe('expired')
    expect(isQualified({ level: 3 }, NOW, 3)).toBe(true)
    expect(isQualified({ level: 2 }, NOW, 3)).toBe(false)
    expect(isQualified({ level: 4, expiresAt: NOW - 1 }, NOW, 3)).toBe(false)
    expect(isQualified({ level: 4, expiresAt: NOW + 1 }, NOW, 3)).toBe(true)
  })

  it('skillCoverage / personQualified', () => {
    expect(skillCoverage(persons, skills, matrix, NOW, 3).map((c) => [c.skill.id, c.qualified, c.short])).toEqual([
      ['s1', 1, 1],
      ['s2', 2, 1],
      ['s3', 1, 0],
    ])
    expect(persons.map((p) => personQualified(p, skills, matrix, NOW, 3))).toEqual([2, 2, 0])
    expect(personQualified(persons[2], skills, matrix, NOW, 2)).toBe(1)
  })

  it('skillMatrixSummary', () => {
    expect(skillMatrixSummary(persons, skills, matrix, NOW, 3, 30)).toEqual({
      coveredSkills: 0,
      requiredSkills: 2,
      multiSkilled: 2,
      persons: 3,
      soon: 1,
      expired: 1,
    })
    // 0 級的格子不算證照
    expect(skillMatrixSummary(persons, skills, { a: { s1: { level: 0, expiresAt: NOW - DAY } } }, NOW, 3, 30).expired).toBe(0)
  })

  it('setSkillLevel：不改原物件；0 級且沒有期限時移除', () => {
    const next = setSkillLevel(matrix, 'c', 's2', 2)
    expect(next.c).toEqual({ s1: { level: 2 }, s2: { level: 2 } })
    expect(matrix.c).toEqual({ s1: { level: 2 } })
    expect(setSkillLevel(matrix, 'c', 's1', 0).c).toEqual({})
    expect(setSkillLevel(matrix, 'a', 's2', 0).a.s2).toEqual({ level: 0, expiresAt: NOW + 10 * DAY })
    expect(setSkillLevel({}, 'new', 's1', 3)).toEqual({ new: { s1: { level: 3 } } })
    expect(setSkillLevel({}, 'new', 's1', 0)).toEqual({ new: {} })
  })

  it('groupSkills', () => {
    expect(groupSkills([...skills, { id: 'x', name: 'X' }]).map((g) => [g.group, g.skills.map((s) => s.id)])).toEqual([
      ['G1', ['s1', 's3']],
      ['G2', ['s2']],
      ['', ['x']],
    ])
  })
})
