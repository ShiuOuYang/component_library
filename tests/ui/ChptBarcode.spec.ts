import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptBarcode from '@/components/library/ui/ChptBarcode.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import { encodeCode128 } from '@/components/library/shared/barcode'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

const mountBarcode = (props: Record<string, unknown>) => (wrapper = mount(ChptBarcode, { props: { value: 'WO-2611-0042', ...props } }))

describe('ChptBarcode', () => {
  it('畫出 SVG：寬度 = 模組數 × 模組寬 + 兩側靜區；一條 path 包含所有黑條；role=img 念出內容', () => {
    const w = mountBarcode({ moduleWidth: 2, quietZone: 10 })
    const svg = w.find('svg')
    const { modules, widths } = encodeCode128('WO-2611-0042')
    expect(Number(svg.attributes('width'))).toBe(modules * 2 + 40)
    expect(svg.attributes('role')).toBe('img')
    expect(svg.attributes('aria-label')).toBe('條碼：WO-2611-0042')
    const bars = (w.find('path').attributes('d').match(/M/g) ?? []).length
    expect(bars).toBe(Math.ceil(widths.length / 2))
    // 第一條黑條從靜區之後開始
    expect(w.find('path').attributes('d').startsWith('M20 0h')).toBe(true)
    expect(w.find('text').text()).toBe('WO-2611-0042')
  })

  it('模組寬取整數像素；高度含文字列；showText=false 時沒有文字', () => {
    const w = mountBarcode({ moduleWidth: 2.6, height: 50, fontSize: 12, textGap: 4 })
    expect(w.find('path').attributes('d')).toMatch(/^M30 0h/) // 3 px × 10 模組
    expect(Number(w.find('svg').attributes('height'))).toBe(50 + 4 + 12 + 2)
    wrapper!.unmount()
    const w2 = mountBarcode({ showText: false, height: 40 })
    expect(w2.find('text').exists()).toBe(false)
    expect(Number(w2.find('svg').attributes('height'))).toBe(40)
  })

  it('Code 39：檢查碼顯示在文字裡；自訂文字、顏色', () => {
    const w = mountBarcode({ value: 'code39', format: 'code39', checkDigit: true, color: '#123456', background: '#fefefe' })
    expect(w.find('text').text()).toBe('CODE39W')
    expect(w.find('path').attributes('fill')).toBe('#123456')
    expect(w.find('rect').attributes('fill')).toBe('#fefefe')
    wrapper!.unmount()
    expect(mountBarcode({ text: 'Lot 07' }).find('text').text()).toBe('Lot 07')
  })

  it('無法編碼時顯示錯誤（列出字元），不畫條碼；空字串', () => {
    const w = mountBarcode({ value: '批號A1' })
    expect(w.find('svg').exists()).toBe(false)
    expect(w.find('[role="alert"]').text()).toBe('含有無法編碼的字元：批 號')
    wrapper!.unmount()
    expect(mountBarcode({ value: '' }).find('[role="alert"]').text()).toBe('沒有內容')
    wrapper!.unmount()
    expect(mountBarcode({ value: 'a_b', format: 'code39' }).find('[role="alert"]').text()).toContain('_')
  })

  it('toSVG() 回傳 SVG 原始碼；無法編碼時為空字串', () => {
    const w = mountBarcode({})
    const vm = w.vm as unknown as { toSVG: () => string }
    expect(vm.toSVG()).toMatch(/^<svg[^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    wrapper!.unmount()
    const w2 = mountBarcode({ value: '中' })
    expect((w2.vm as unknown as { toSVG: () => string }).toSVG()).toBe('')
  })

  it('語系：enUS', () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => [h(ChptBarcode, { value: 'A1' }), h(ChptBarcode, { value: '' })]) })
    expect(wrapper.find('svg').attributes('aria-label')).toBe('Barcode: A1')
    expect(wrapper.find('[role="alert"]').text()).toBe('No value')
  })
})
