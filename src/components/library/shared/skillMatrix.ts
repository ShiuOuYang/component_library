/**
 * 技能矩陣（ChptSkillMatrix）的資料模型：人員 × 技能的等級（0–4）、證照效期、每個技能的合格人數、多能工。
 * 等級沿用 ILUO：0 未訓練、1 訓練中、2 可在指導下作業、3 可獨立作業、4 可教導他人。
 */
import { toTime } from './storage'

export type SkillLevel = 0 | 1 | 2 | 3 | 4

export interface SkillDef {
  id: string
  name: string
  /** 分組（工站、製程），表頭依此分區 */
  group?: string
  /** 至少要幾個合格的人（低於時警示）；不給時不檢查 */
  required?: number
}

export interface SkillPerson {
  id: string
  name: string
  /** 班別 / 組別（可篩選） */
  team?: string
}

export interface SkillCell {
  level: SkillLevel
  /** 證照有效期限（epoch ms、ISO 字串或 Date）；過期時不算合格 */
  expiresAt?: number | string | Date | null
}

/** 人員 id → 技能 id → 等級 */
export type SkillMatrixData = Record<string, Record<string, SkillCell>>

export type SkillExpiry = 'none' | 'ok' | 'soon' | 'expired'

const DAY = 86_400_000

export function cellOf(matrix: SkillMatrixData, personId: string, skillId: string): SkillCell {
  return matrix[personId]?.[skillId] ?? { level: 0 }
}

/** 證照效期：沒有期限、正常、warnDays 天內到期、已過期 */
export function skillExpiry(cell: SkillCell, now: number, warnDays: number): SkillExpiry {
  const t = toTime(cell.expiresAt)
  if (t === null) return 'none'
  if (t <= now) return 'expired'
  return t - now <= warnDays * DAY ? 'soon' : 'ok'
}

/** 合格：等級 ≥ qualifyLevel 且證照沒過期 */
export function isQualified(cell: SkillCell, now: number, qualifyLevel: number): boolean {
  return cell.level >= qualifyLevel && skillExpiry(cell, now, 0) !== 'expired'
}

export interface SkillCoverage {
  skill: SkillDef
  qualified: number
  /** 低於需求的人數（沒有需求時 0） */
  short: number
}

/** 每個技能的合格人數（只算給定的人員，例如篩選後的班別） */
export function skillCoverage(persons: readonly SkillPerson[], skills: readonly SkillDef[], matrix: SkillMatrixData, now: number, qualifyLevel: number): SkillCoverage[] {
  return skills.map((skill) => {
    const qualified = persons.filter((p) => isQualified(cellOf(matrix, p.id, skill.id), now, qualifyLevel)).length
    return { skill, qualified, short: skill.required ? Math.max(0, skill.required - qualified) : 0 }
  })
}

/** 每個人合格的技能數 */
export function personQualified(person: SkillPerson, skills: readonly SkillDef[], matrix: SkillMatrixData, now: number, qualifyLevel: number): number {
  return skills.filter((s) => isQualified(cellOf(matrix, person.id, s.id), now, qualifyLevel)).length
}

export interface SkillMatrixSummary {
  /** 有需求且達到的技能數 / 有需求的技能數 */
  coveredSkills: number
  requiredSkills: number
  /** 多能工：合格 ≥ 2 個技能的人 */
  multiSkilled: number
  persons: number
  soon: number
  expired: number
}

export function skillMatrixSummary(
  persons: readonly SkillPerson[],
  skills: readonly SkillDef[],
  matrix: SkillMatrixData,
  now: number,
  qualifyLevel: number,
  warnDays: number
): SkillMatrixSummary {
  const cov = skillCoverage(persons, skills, matrix, now, qualifyLevel)
  const req = cov.filter((c) => c.skill.required)
  let soon = 0
  let expired = 0
  for (const p of persons)
    for (const s of skills) {
      const cell = cellOf(matrix, p.id, s.id)
      if (cell.level === 0) continue
      const e = skillExpiry(cell, now, warnDays)
      if (e === 'soon') soon++
      else if (e === 'expired') expired++
    }
  return {
    coveredSkills: req.filter((c) => c.short === 0).length,
    requiredSkills: req.length,
    multiSkilled: persons.filter((p) => personQualified(p, skills, matrix, now, qualifyLevel) >= 2).length,
    persons: persons.length,
    soon,
    expired,
  }
}

/** 設定等級（不改原物件；等級 0 且沒有期限時移除該格） */
export function setSkillLevel(matrix: SkillMatrixData, personId: string, skillId: string, level: SkillLevel): SkillMatrixData {
  const row = { ...(matrix[personId] ?? {}) }
  const cur = row[skillId]
  if (level === 0 && (cur?.expiresAt === undefined || cur?.expiresAt === null)) delete row[skillId]
  else row[skillId] = { ...(cur ?? {}), level }
  return { ...matrix, [personId]: row }
}

/** 依分組整理技能（保持出現順序） */
export function groupSkills(skills: readonly SkillDef[]): { group: string; skills: SkillDef[] }[] {
  const map = new Map<string, SkillDef[]>()
  for (const s of skills) {
    const g = s.group ?? ''
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(s)
  }
  return [...map].map(([group, list]) => ({ group, skills: list }))
}
