import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import ChptCodeBlock from '@/components/library/ui/ChptCodeBlock.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

describe('ChptCodeBlock', () => {
  it('移除開頭結尾空行與共同縮排（空白行不算縮排）', () => {
    const code = '\n\n    const a = 1\n\n      if (a) {\n        go()\n      }\n  \n'
    const w = mount(ChptCodeBlock, { props: { code } })
    expect(w.find('code').text()).toBe('const a = 1\n\n  if (a) {\n    go()\n  }')
  })

  it('trimIndent = false 原樣顯示；全是空白時為空', () => {
    const raw = '  x\n    y'
    expect(mount(ChptCodeBlock, { props: { code: raw, trimIndent: false } }).find('code').element.textContent).toBe(raw)
    expect(mount(ChptCodeBlock, { props: { code: '\n   \n' } }).find('code').text()).toBe('')
    expect(mount(ChptCodeBlock).find('code').text()).toBe('')
  })

  it('可用鍵盤捲動：tabindex 與名稱（含語言）', () => {
    const w = mount(ChptCodeBlock, { props: { code: 'x', language: 'ts' } })
    const root = w.find('[role="group"]')
    expect(root.attributes('tabindex')).toBe('0')
    expect(root.attributes('aria-label')).toContain('ts')
    const noLang = mount(ChptCodeBlock, { props: { code: 'x', language: '' } })
    expect(noLang.find('[role="group"]').attributes('aria-label')).toBeTruthy()
    expect(noLang.find('[role="group"]').attributes('aria-label')).not.toBe(root.attributes('aria-label'))
  })

  it('提示：四種類型各有樣式、自訂標題、可含標記；沒有提示時不顯示', () => {
    expect(mount(ChptCodeBlock, { props: { code: 'x' } }).find('.mt-4').exists()).toBe(false)
    const classes = (['info', 'warning', 'success', 'error'] as const).map((tipType) => {
      const w = mount(ChptCodeBlock, { props: { code: 'x', tip: '用 <code>npm i</code> 安裝', tipType } })
      expect(w.find('.mt-4 code').text()).toBe('npm i')
      return w.find('.mt-4').classes().join(' ') + w.find('.mt-4 p').classes().join(' ')
    })
    expect(new Set(classes).size).toBe(4)
    // 不認得的類型退回 info
    const odd = mount(ChptCodeBlock, { props: { code: 'x', tip: 't', tipType: 'nope' as never } })
    const info = mount(ChptCodeBlock, { props: { code: 'x', tip: 't', tipType: 'info' } })
    expect(odd.find('.mt-4').classes()).toEqual(info.find('.mt-4').classes())
    expect(odd.find('.mt-4 p').classes()).toEqual(info.find('.mt-4 p').classes())
    const titled = mount(ChptCodeBlock, { props: { code: 'x', tip: 't', tipTitle: '注意' } })
    expect(titled.find('strong').text()).toContain('注意')
  })

  it('tip 插槽與英文語系', () => {
    const w = mount({
      render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptCodeBlock, { code: 'x', tip: 'hint' })),
    })
    expect(w.find('strong').text()).toMatch(/^[A-Za-z]/)
    const slotted = mount(ChptCodeBlock, { props: { code: 'x' }, slots: { tip: '<p class="custom">自訂</p>' } })
    expect(slotted.find('.custom').text()).toBe('自訂')
  })
})
