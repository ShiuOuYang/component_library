import { describe, expect, it } from 'vitest'
import { clamp01, countByType, markCenter, moveMark, nextMarkId, rectFromCorners } from '@/components/library/shared/defectMarks'

describe('defectMarks', () => {
  it('clamp01', () => {
    expect([clamp01(-1), clamp01(0.3), clamp01(2)]).toEqual([0, 0.3, 1])
  })

  it('rectFromCorners：任意方向拖曳、限制在圖片內', () => {
    expect(rectFromCorners(0.5, 0.6, 0.2, 0.1)).toEqual({ x: 0.2, y: 0.1, w: 0.3, h: 0.5 })
    expect(rectFromCorners(-0.2, 0.9, 0.3, 1.4)).toEqual({ x: 0, y: 0.9, w: 0.3, h: 0.09999999999999998 })
  })

  it('moveMark：點夾在 0–1；框整個留在圖片內、大小不變', () => {
    expect(moveMark({ id: 'a', x: 0.5, y: 0.5, type: 't' }, 0.7, -0.9)).toMatchObject({ x: 1, y: 0 })
    const box = moveMark({ id: 'b', x: 0.7, y: 0.1, w: 0.2, h: 0.3, type: 't' }, 0.5, -0.5)
    expect(box).toMatchObject({ x: 0.8, y: 0, w: 0.2, h: 0.3 })
  })

  it('nextMarkId：取最大編號 + 1，不重複使用、忽略自訂 id', () => {
    expect(nextMarkId([])).toBe('d1')
    expect(nextMarkId([{ id: 'd2', x: 0, y: 0, type: 't' }, { id: 'd7', x: 0, y: 0, type: 't' }, { id: 'custom', x: 0, y: 0, type: 't' }])).toBe('d8')
  })

  it('countByType：照類型順序，未知類型排最後', () => {
    const types = [
      { value: 'a', label: 'A', color: 'red' },
      { value: 'b', label: 'B', color: 'blue' },
    ]
    const marks = [
      { id: 'd1', x: 0, y: 0, type: 'b' },
      { id: 'd2', x: 0, y: 0, type: 'zzz' },
      { id: 'd3', x: 0, y: 0, type: 'b' },
    ]
    expect(countByType(marks, types)).toEqual([
      { type: 'a', label: 'A', color: 'red', count: 0 },
      { type: 'b', label: 'B', color: 'blue', count: 2 },
      { type: 'zzz', label: 'zzz', color: '', count: 1 },
    ])
  })

  it('markCenter：點為自己、框為中心', () => {
    expect(markCenter({ id: 'a', x: 0.2, y: 0.3, type: 't' })).toEqual({ x: 0.2, y: 0.3 })
    expect(markCenter({ id: 'a', x: 0.2, y: 0.3, w: 0.4, h: 0.2, type: 't' })).toEqual({ x: 0.4, y: 0.4 })
  })
})
