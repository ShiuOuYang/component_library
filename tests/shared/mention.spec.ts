import { describe, expect, it } from 'vitest'
import {
  applyPlainEdit,
  diffMentions,
  filterMentionOptions,
  findMentionQuery,
  insertMention,
  mentionMarkup,
  parseMentions,
} from '@/components/library/shared/mention'

const T = ['@', '#']
const V = '請 @[王小明](u01) 看 #[WO-1](wo-1) 謝謝'

describe('mention', () => {
  it('mentionMarkup / parseMentions：位置、跳脫、沒有觸發字元', () => {
    expect(mentionMarkup('@', 'A]B', 'x)y')).toBe('@[A\\]B](x\\)y)')
    const p = parseMentions(V, T)
    expect(p.plain).toBe('請 @王小明 看 #WO-1 謝謝')
    expect(p.mentions).toEqual([
      { trigger: '@', id: 'u01', label: '王小明', start: 2, end: 6, mStart: 2, mEnd: 13 },
      { trigger: '#', id: 'wo-1', label: 'WO-1', start: 9, end: 14, mStart: 16, mEnd: 29 },
    ])
    const esc = parseMentions(`hi ${mentionMarkup('@', 'A]B\\', 'x)y')}!`, T)
    expect(esc.plain).toBe('hi @A]B\\!')
    expect(esc.mentions[0].id).toBe('x)y')
    expect(parseMentions(V, [])).toEqual({ plain: V, mentions: [] })
    // 沒列在 triggers 的不算
    expect(parseMentions('x &[a](b)', T).mentions).toEqual([])
  })

  it('applyPlainEdit：一般打字、刪除碰到提及整個刪、在提及中打字變回一般文字、取代', () => {
    // 在最後加字
    expect(applyPlainEdit(V, '請 @王小明 看 #WO-1 謝謝！', T)).toBe(`${V}！`)
    // 在兩個提及之間加字
    expect(applyPlainEdit(V, '請 @王小明 再看 #WO-1 謝謝', T)).toBe('請 @[王小明](u01) 再看 #[WO-1](wo-1) 謝謝')
    // Backspace 刪到提及最後一個字：整個提及刪掉
    expect(applyPlainEdit(V, '請 @王小 看 #WO-1 謝謝', T)).toBe('請  看 #[WO-1](wo-1) 謝謝')
    // 選取一段跨過提及刪掉
    expect(applyPlainEdit(V, '請 #WO-1 謝謝', T)).toBe('請 #[WO-1](wo-1) 謝謝')
    // 在提及中間打字：變回一般文字
    expect(applyPlainEdit(V, '請 @王小x明 看 #WO-1 謝謝', T)).toBe('請 @王小x明 看 #[WO-1](wo-1) 謝謝')
    // 取代提及的一部分（有新文字）：變回一般文字再套用
    expect(applyPlainEdit(V, '請 @王大 看 #WO-1 謝謝', T)).toBe('請 @王大 看 #[WO-1](wo-1) 謝謝')
    // 沒變
    expect(applyPlainEdit(V, '請 @王小明 看 #WO-1 謝謝', T)).toBe(V)
    // 緊貼在提及前後打字不影響提及
    expect(applyPlainEdit(V, '請 @王小明。 看 #WO-1 謝謝', T)).toBe('請 @[王小明](u01)。 看 #[WO-1](wo-1) 謝謝')
    expect(applyPlainEdit(V, '請 x@王小明 看 #WO-1 謝謝', T)).toBe('請 x@[王小明](u01) 看 #[WO-1](wo-1) 謝謝')
  })

  it('findMentionQuery：開頭 / 空白 / 標點後、不跨空白與換行、不在提及裡、長度上限', () => {
    expect(findMentionQuery('@王', 2, T)).toEqual({ trigger: '@', query: '王', start: 0 })
    expect(findMentionQuery('請 #WO', 5, T)).toEqual({ trigger: '#', query: 'WO', start: 2 })
    expect(findMentionQuery('請，@', 3, T)).toEqual({ trigger: '@', query: '', start: 2 })
    expect(findMentionQuery('（@a', 3, T)).toEqual({ trigger: '@', query: 'a', start: 1 })
    expect(findMentionQuery('a@b.com', 7, T)).toBeNull()
    expect(findMentionQuery('@王 小', 4, T)).toBeNull()
    expect(findMentionQuery('@Alex W', 7, T, [], { allowSpaces: true })).toEqual({ trigger: '@', query: 'Alex W', start: 0 })
    expect(findMentionQuery('@a\nb', 4, T, [], { allowSpaces: true })).toBeNull()
    expect(findMentionQuery('no trigger', 5, T)).toBeNull()
    expect(findMentionQuery('@abcdef', 7, T, [], { maxLength: 3 })).toBeNull()
    const { plain, mentions } = parseMentions(V, T)
    // 游標在提及裡：不開
    expect(findMentionQuery(plain, 4, T, mentions)).toBeNull()
    // 剛好在提及後：也不開
    expect(findMentionQuery(plain, 6, T, mentions)).toBeNull()
    // 觸發字元屬於前面的提及（例如名字裡有 @）
    const odd = parseMentions(`${mentionMarkup('@', 'a @b', 'x')}`, T)
    expect(findMentionQuery(odd.plain + 'c', odd.plain.length + 1, T, odd.mentions)).toBeNull()
  })

  it('insertMention：取代查詢字、後面補空白、回傳游標', () => {
    const v = '請 @王 看'
    expect(insertMention(v, 2, 4, '@', { id: 'u01', label: '王小明' }, T)).toEqual({ value: '請 @[王小明](u01) 看', caret: 7 })
    expect(insertMention('@王', 0, 2, '@', { id: 'u01', label: '王小明' }, T)).toEqual({ value: '@[王小明](u01) ', caret: 5 })
    // 前面已有提及：位置要換算
    const r = insertMention(`${V} #W`, 18, 20, '#', { id: 'wo-2', label: 'WO-2' }, T)
    expect(r.value).toBe(`${V} #[WO-2](wo-2) `)
    expect(parseMentions(r.value, T).plain.slice(0, r.caret)).toBe('請 @王小明 看 #WO-1 謝謝 #WO-2 ')
  })

  it('filterMentionOptions：名稱開頭優先、包含、id 與說明、上限', () => {
    const opts = [
      { id: 'u1', label: '林志豪', description: '設備課' },
      { id: 'u2', label: '王小林' },
      { id: 'u3', label: 'Alex', description: '製程' },
      { id: 'lin', label: '陳' },
    ]
    expect(filterMentionOptions(opts, '林').map((o) => o.id)).toEqual(['u1', 'u2'])
    expect(filterMentionOptions(opts, 'LIN').map((o) => o.id)).toEqual(['lin'])
    expect(filterMentionOptions(opts, '製程').map((o) => o.id)).toEqual(['u3'])
    expect(filterMentionOptions(opts, '', 2)).toHaveLength(2)
    expect(filterMentionOptions(opts, 'zzz')).toEqual([])
  })

  it('diffMentions：新增、移除、同一人兩次', () => {
    const a = parseMentions(V, T).mentions
    const b = parseMentions(`${V} @[王小明](u01) @[陳](u02)`, T).mentions
    const d = diffMentions(a, b)
    expect(d.added.map((m) => m.id)).toEqual(['u01', 'u02'])
    expect(d.removed).toEqual([])
    expect(diffMentions(b, a).removed.map((m) => m.id)).toEqual(['u01', 'u02'])
  })
})
