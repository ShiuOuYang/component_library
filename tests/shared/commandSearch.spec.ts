import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatHotkey, fuzzyMatch, highlightParts, isMac, matchHotkey, parseHotkey, scoreCommand } from '@/components/library/shared/commandSearch'

afterEach(() => vi.restoreAllMocks())

describe('fuzzyMatch', () => {
  it('整段 > 開頭 > 詞首 > 中間的連續子字串；不分大小寫', () => {
    const exact = fuzzyMatch('spc', 'SPC').score
    const prefix = fuzzyMatch('spc', 'SPC 管制圖').score
    const word = fuzzyMatch('spc', 'Open SPC').score
    const middle = fuzzyMatch('pc', 'SPC').score
    expect(exact).toBeGreaterThan(prefix)
    expect(prefix).toBeGreaterThan(word)
    expect(word).toBeGreaterThan(middle)
    expect(fuzzyMatch('spc', 'SPC 管制圖').indices).toEqual([0, 1, 2])
  })

  it('中文：連續子字串與子序列', () => {
    expect(fuzzyMatch('工單', '工單查詢').indices).toEqual([0, 1])
    const m = fuzzyMatch('工查', '工單查詢')
    expect(m.score).toBeGreaterThan(0)
    expect(m.indices).toEqual([0, 2])
  })

  it('子序列優先跳到詞首（camelCase、空白、中英交界）', () => {
    expect(fuzzyMatch('dm', 'toggle dark mode').indices).toEqual([7, 12])
    expect(fuzzyMatch('dm', 'darkMode').indices).toEqual([0, 4])
    expect(fuzzyMatch('m管', 'SPC管制圖 m管').score).toBeGreaterThan(0)
    // 詞首的分數比分散的子序列高
    expect(fuzzyMatch('dm', 'dark mode').score).toBeGreaterThan(fuzzyMatch('dm', 'admin').score)
  })

  it('找不到、空查詢、空文字', () => {
    expect(fuzzyMatch('xyz', 'SPC').score).toBe(0)
    expect(fuzzyMatch('  ', 'SPC')).toEqual({ score: 1, indices: [] })
    expect(fuzzyMatch('a', '').score).toBe(0)
    // 查詢中的空白略過
    expect(fuzzyMatch('d m', 'dark mode').score).toBeGreaterThan(0)
  })
})

describe('scoreCommand', () => {
  const cmd = { label: '工單查詢', keywords: ['gongdan', 'work order'], group: '生產', description: '依工單號查詢進度' }

  it('標籤、關鍵字、群組、說明都可以搜到；標籤分數最高', () => {
    expect(scoreCommand('工單', cmd).indices).toEqual([0, 1])
    expect(scoreCommand('gd', cmd).score).toBeGreaterThan(0)
    expect(scoreCommand('生產', cmd).score).toBeGreaterThan(0)
    expect(scoreCommand('進度', cmd).score).toBeGreaterThan(0)
    expect(scoreCommand('工單', cmd).score).toBeGreaterThan(scoreCommand('生產', cmd).score)
  })

  it('多個詞要全部找到（AND）；空查詢全部符合', () => {
    expect(scoreCommand('生產 工單', cmd).score).toBeGreaterThan(0)
    expect(scoreCommand('生產 品質', cmd).score).toBe(0)
    expect(scoreCommand('', cmd)).toEqual({ score: 1, indices: [] })
    expect(scoreCommand('x', { label: 'a' }).score).toBe(0)
  })
})

describe('highlightParts', () => {
  it('依符合位置切段', () => {
    expect(highlightParts('工單查詢', [0, 2])).toEqual([
      { text: '工', match: true },
      { text: '單', match: false },
      { text: '查', match: true },
      { text: '詢', match: false },
    ])
    expect(highlightParts('SPC', [0, 1, 2])).toEqual([{ text: 'SPC', match: true }])
    expect(highlightParts('SPC', [])).toEqual([{ text: 'SPC', match: false }])
  })
})

describe('快捷鍵', () => {
  const ev = (key: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...mods,
  })

  it('parseHotkey', () => {
    expect(parseHotkey('mod+shift+P')).toEqual({ mod: true, ctrl: false, meta: false, alt: false, shift: true, key: 'p' })
    expect(parseHotkey('cmd+option+/')).toMatchObject({ meta: true, alt: true, key: '/' })
  })

  it('mod 在 Mac 是 ⌘、其他平台是 Ctrl；多按其他修飾鍵不算', () => {
    expect(matchHotkey(ev('k', { ctrlKey: true }), 'mod+k', false)).toBe(true)
    expect(matchHotkey(ev('k', { metaKey: true }), 'mod+k', false)).toBe(false)
    expect(matchHotkey(ev('K', { metaKey: true }), 'mod+k', true)).toBe(true)
    expect(matchHotkey(ev('k', { ctrlKey: true, shiftKey: true }), 'mod+k', false)).toBe(false)
    expect(matchHotkey(ev('p', { ctrlKey: true, shiftKey: true }), 'ctrl+shift+p', true)).toBe(true)
    expect(matchHotkey(ev('/', { altKey: true }), 'alt+/', false)).toBe(true)
  })

  it('formatHotkey：Mac 用符號，其他平台用文字', () => {
    expect(formatHotkey('mod+k', true)).toEqual(['⌘', 'K'])
    expect(formatHotkey('mod+k', false)).toEqual(['Ctrl', 'K'])
    expect(formatHotkey('ctrl+alt+shift+enter', true)).toEqual(['⌃', '⌥', '⇧', '↵'])
    expect(formatHotkey('meta+escape', false)).toEqual(['Win', 'Esc'])
    expect(formatHotkey('meta+f5', true)).toEqual(['⌘', 'F5'])
    expect(formatHotkey('alt+space', false)).toEqual(['Alt', 'Space'])
  })

  it('isMac 看 navigator.platform', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
    expect(isMac()).toBe(true)
    expect(formatHotkey('mod+k')).toEqual(['⌘', 'K'])
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32')
    expect(isMac()).toBe(false)
    expect(matchHotkey(ev('k', { ctrlKey: true }), 'mod+k')).toBe(true)
  })
})
