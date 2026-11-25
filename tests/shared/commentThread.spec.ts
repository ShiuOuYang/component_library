import { describe, expect, it, vi } from 'vitest'
import {
  addComment,
  commentId,
  countComments,
  findComment,
  formatBytes,
  relativeTime,
  removeComment,
  sortComments,
  toMs,
  updateComment,
  type CommentItem,
} from '@/components/library/shared/commentThread'

const A = { id: 'a', name: 'A' }
const items = (): CommentItem[] => [
  { id: 'c1', author: A, body: 'one', createdAt: 100, replies: [{ id: 'r1', author: A, body: 'r', createdAt: 300 }, { id: 'r2', author: A, body: 'r', createdAt: 200 }] },
  { id: 'c2', author: A, body: 'two', createdAt: 50 },
]

describe('commentThread', () => {
  it('relativeTime', () => {
    const now = 10 * 86_400_000
    expect(relativeTime(now - 30_000, now)).toEqual({ unit: 'now', n: 0 })
    expect(relativeTime(now - 5 * 60_000, now)).toEqual({ unit: 'minute', n: 5 })
    expect(relativeTime(now - 3 * 3_600_000, now)).toEqual({ unit: 'hour', n: 3 })
    expect(relativeTime(now - 2 * 86_400_000, now)).toEqual({ unit: 'day', n: 2 })
    expect(relativeTime(now - 9 * 86_400_000, now)).toEqual({ unit: 'date', n: 0 })
    expect(relativeTime(now + 60_000, now)).toEqual({ unit: 'now', n: 0 })
  })

  it('toMs / countComments / findComment', () => {
    expect(toMs(new Date(5))).toBe(5)
    expect(toMs('1970-01-01T00:00:00.007Z')).toBe(7)
    expect(countComments(items())).toBe(4)
    expect(countComments([{ ...items()[0], deleted: true }])).toBe(2)
    expect(findComment(items(), 'r2')).toMatchObject({ parentId: 'c1', comment: { id: 'r2' } })
    expect(findComment(items(), 'c2')).toMatchObject({ parentId: null })
    expect(findComment(items(), 'x')).toBeNull()
  })

  it('addComment / updateComment', () => {
    const n = { id: 'n', author: A, body: 'n', createdAt: 1 }
    expect(addComment(items(), n, null).map((c) => c.id)).toEqual(['c1', 'c2', 'n'])
    expect(addComment(items(), n, 'c2')[1].replies!.map((c) => c.id)).toEqual(['n'])
    expect(addComment(items(), n, 'c1')[0].replies!.map((c) => c.id)).toEqual(['r1', 'r2', 'n'])
    expect(updateComment(items(), 'c2', { body: 'x' })[1].body).toBe('x')
    expect(updateComment(items(), 'r1', { body: 'y' })[0].replies![0].body).toBe('y')
    const orig = items()
    updateComment(orig, 'c1', { body: 'z' })
    expect(orig[0].body).toBe('one')
  })

  it('removeComment：沒有回覆直接刪、有回覆留佔位、刪掉最後的回覆時佔位也移除', () => {
    expect(removeComment(items(), 'c2').map((c) => c.id)).toEqual(['c1'])
    const placeholder = removeComment(items(), 'c1')
    expect(placeholder[0]).toMatchObject({ id: 'c1', deleted: true, body: '' })
    expect(placeholder[0].replies).toHaveLength(2)
    const one = removeComment(placeholder, 'r1')
    expect(one[0].replies!.map((r) => r.id)).toEqual(['r2'])
    expect(removeComment(one, 'r2').map((c) => c.id)).toEqual(['c2'])
    expect(removeComment(items(), 'r1')[0].replies!.map((r) => r.id)).toEqual(['r2'])
  })

  it('sortComments', () => {
    expect(sortComments(items(), 'oldest').map((c) => c.id)).toEqual(['c2', 'c1'])
    const newest = sortComments(items(), 'newest')
    expect(newest.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(newest[0].replies!.map((r) => r.id)).toEqual(['r2', 'r1'])
  })

  it('formatBytes / commentId', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(1_320_000)).toBe('1.3 MB')
    expect(formatBytes(50 * 1024 * 1024)).toBe('50 MB')
    expect(formatBytes(-1)).toBe('')
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(commentId()).toMatch(/^c-[0-9a-z]+-i+$/)
    vi.restoreAllMocks()
  })
})
