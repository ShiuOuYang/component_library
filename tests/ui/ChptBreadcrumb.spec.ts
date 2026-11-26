import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ChptBreadcrumb from '@/components/library/ui/ChptBreadcrumb.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
const items = [{ label: '首頁', to: '/' }, { label: '產線' }, { label: 'SMT 1' }]

describe('ChptBreadcrumb', () => {
  it('連結、沒有連結的項目是按鈕（鍵盤可以按）、最後一項標示目前位置、名稱依語系', async () => {
    const w = mount(ChptBreadcrumb, { props: { items }, global: { plugins: [router] } })
    expect(w.find('nav').attributes('aria-label')).toBe('麵包屑導覽')
    expect(w.find('a').text()).toBe('首頁')
    const btn = w.find('button')
    expect(btn.attributes('type')).toBe('button')
    expect(btn.text()).toBe('產線')
    await btn.trigger('click')
    expect(w.emitted('select')![0]).toEqual([{ label: '產線' }])
    expect(w.find('[aria-current="page"]').text()).toBe('SMT 1')
    const en = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptBreadcrumb, { items })) }, { global: { plugins: [router] } })
    expect(en.find('nav').attributes('aria-label')).toBe('Breadcrumb')
  })
})
