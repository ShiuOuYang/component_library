import { describe, expect, it } from 'vitest'
import { colors, darkColors, darkViz, designTokens, darkTokens, viz } from '@/design/tokens'
import { buildCssVariables, buildDarkCssVariables } from '@/design/tokensPlugin'

describe('設計令牌', () => {
  it('品牌主色是藍（600 = #2563EB）', () => {
    // 曾經有兩份 tokens.js：根目錄 style/ 的副本還停在舊的品牌綠 #006644
    expect(colors.primary[600]).toBe('#2563EB')
    expect(colors.primary.DEFAULT).toBe(colors.primary[600])
  })

  it('語意色 success 仍是綠（品牌改藍不影響狀態色）', () => {
    expect(colors.semantic.success[600]).toBe('#16A34A')
  })

  it('沒有任何舊品牌綠殘留', () => {
    expect(JSON.stringify(designTokens)).not.toContain('#006644')
  })

  it('z-index 的語意順序：tooltip 必須高於 modal', () => {
    // 否則彈窗內的 tooltip 會被 modal 吃掉
    expect(Number(designTokens.zIndex.tooltip)).toBeGreaterThan(Number(designTokens.zIndex.modal))
    expect(Number(designTokens.zIndex.toast)).toBeGreaterThan(Number(designTokens.zIndex.tooltip))
    expect(Number(designTokens.zIndex.modal)).toBeGreaterThan(Number(designTokens.zIndex.backdrop))
  })

  it('類別色階有 10 色且不重複', () => {
    expect(viz.categorical).toHaveLength(10)
    expect(new Set(viz.categorical).size).toBe(10)
  })
})

describe('深色主題令牌', () => {
  it('提供文字 / 背景 / 邊框 / 軸線的覆寫', () => {
    expect(darkColors.text.primary).toBeTruthy()
    expect(darkColors.background.primary).toBeTruthy()
    expect(darkColors.border.default).toBeTruthy()
    expect(darkViz.axis.line).toBeTruthy()
  })

  it('深色的文字與背景相對亮色是反過來的', () => {
    // 亮色：深字淺底；深色：淺字深底
    expect(colors.text.primary).toBe('#171717')
    expect(colors.background.primary).toBe('#FFFFFF')
    expect(darkColors.text.primary).toBe('#F5F5F5')
    expect(darkColors.background.primary).toBe('#171717')
  })

  it('深色的 focus 邊框改用較淺的階（600 在深色底下對比不足）', () => {
    expect(colors.border.focus).toBe(colors.primary[600])
    expect(darkColors.border.focus).toBe(colors.primary[400])
  })

  it('darkTokens 只含需要覆寫的鍵', () => {
    expect(Object.keys(darkTokens)).toEqual(['colors', 'viz'])
    expect(Object.keys(darkTokens.colors).sort()).toEqual(['background', 'border', 'text'])
  })
})

describe('tokensPlugin 產出的 CSS 變數', () => {
  const light = buildCssVariables()
  const dark = buildDarkCssVariables()

  it('亮色含品牌色階、語意色與 viz 變數', () => {
    expect(light['--color-primary-600']).toBe('#2563EB')
    expect(light['--color-success']).toBe('#16A34A')
    expect(light['--viz-cat-1']).toBe(viz.categorical[0])
    expect(light['--z-tooltip']).toBe(designTokens.zIndex.tooltip)
  })

  it('動畫時長帶上 ms 單位（CSS 需要）', () => {
    expect(light['--duration-normal']).toMatch(/^\d+ms$/)
  })

  it('深色覆寫的變數名稱與亮色完全相同', () => {
    // 這是 scoped CSS 不需要任何修改就能跟著翻轉的前提
    for (const key of Object.keys(dark)) {
      if (key === 'color-scheme') continue
      expect(light, `亮色缺少 ${key}`).toHaveProperty(key)
    }
  })

  it('深色只覆寫該翻轉的那些，不動品牌色階', () => {
    expect(dark).not.toHaveProperty('--color-primary-600')
    expect(dark).not.toHaveProperty('--color-success')
    expect(dark).not.toHaveProperty('--viz-cat-1')

    expect(dark).toHaveProperty('--color-text-primary')
    expect(dark).toHaveProperty('--color-bg-primary')
    expect(dark).toHaveProperty('--color-border-default')
    expect(dark).toHaveProperty('--viz-axis-line')
  })

  it('兩邊都設定 color-scheme，瀏覽器原生控制項才會跟著變', () => {
    expect(light['color-scheme']).toBeUndefined() // 由 plugin 在 :root 另外加上
    expect(dark['color-scheme']).toBe('dark')
  })

  it('DEFAULT 不會蓋掉數字色階', () => {
    // flatten() 的註解提到過：JS 物件把類數字鍵排在字串鍵之前，
    // DEFAULT 若對應成某個數字階會反過來蓋掉它
    expect(light['--color-primary-500']).toBe(colors.primary[500])
    expect(light['--color-primary']).toBe(colors.primary.DEFAULT)
  })
})
