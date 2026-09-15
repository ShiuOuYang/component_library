import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useOptionalRouter } from '@/components/library/shared/useOptionalRouter'

const Probe = defineComponent({
  setup(_, { expose }) {
    expose(useOptionalRouter())
    return () => h('div')
  },
})

describe('useOptionalRouter', () => {
  it('沒有安裝 router 時不拋錯，回傳 null', () => {
    // 這是重點：導覽元件原本直接呼叫 useRoute()，
    // 在沒有 router 的環境（Storybook / 單元測試 / 非路由頁面）會拿到 undefined 後崩潰。
    const wrapper = mount(Probe)

    expect(wrapper.vm.router).toBeNull()
    expect(wrapper.vm.route).toBeNull()
    expect(wrapper.vm.hasRouter).toBe(false)
    expect(wrapper.vm.currentPath).toBe('')
  })

  it('有 router 時正確取得實例與當前路徑', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/reports', component: { template: '<div />' } },
      ],
    })
    await router.push('/reports')
    await router.isReady()

    const wrapper = mount(Probe, { global: { plugins: [router] } })

    expect(wrapper.vm.hasRouter).toBe(true)
    expect(wrapper.vm.router).not.toBeNull()
    expect(wrapper.vm.currentPath).toBe('/reports')
  })

  it('currentPath 隨路由變化更新', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/settings', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(Probe, { global: { plugins: [router] } })
    expect(wrapper.vm.currentPath).toBe('/')

    await router.push('/settings')
    expect(wrapper.vm.currentPath).toBe('/settings')
  })
})
