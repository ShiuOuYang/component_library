import { computed, inject, type ComputedRef } from 'vue'
import { routeLocationKey, routerKey } from 'vue-router'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

/**
 * useOptionalRouter — 讓元件在「沒有安裝 vue-router」的環境下也能運作
 *
 * 組件庫裡的導覽類元件（TabNavigation / PageSwitcher）原本直接呼叫
 * useRouter() / useRoute()。那等於強制使用端一定要有 router 實例，
 * 而且在沒有 router 的情境（Storybook、單元測試、純表單頁）會拿到
 * undefined 後直接爆掉。
 *
 * 這裡改用 vue-router 的注入鍵搭配預設值 null：
 * - 有 router → 照常使用
 * - 沒有 router → router / route 為 null，元件改走 props + emit 的受控模式
 *
 * vue-router 是「可選的 peer dependency」（見 package.json 的
 * peerDependenciesMeta），只有用到導覽元件時才需要安裝。
 */
export function useOptionalRouter(): {
  router: Router | null
  route: RouteLocationNormalizedLoaded | null
  hasRouter: ComputedRef<boolean>
  currentPath: ComputedRef<string>
} {
  // inject 帶預設值 null，沒有提供者時不會噴 Vue 的 injection not found 警告
  const router = inject(routerKey, null)
  const route = inject(routeLocationKey, null)

  return {
    router,
    route,
    hasRouter: computed(() => router !== null),
    currentPath: computed(() => route?.path ?? ''),
  }
}

export default useOptionalRouter
