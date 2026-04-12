import { computed } from 'vue'
import {  useNavigationStore } from '../stores'
// import { useWipApi } from './useWipApi'
import { useApiState } from './useApi'


// 導航相關的組合式函數
export function useNavigation() {
  const navigationStore = useNavigationStore()
  
  return {
    // 狀態
    menuItems: computed(() => navigationStore.menuItems),
    activeMenu: computed(() => navigationStore.activeMenu),
    sidebarCollapsed: computed(() => navigationStore.sidebarCollapsed),
    currentRoute: computed(() => navigationStore.currentRoute),
    
    // 操作
    setActiveMenuItem: navigationStore.setActiveMenuItem,
    toggleSidebar: navigationStore.toggleSidebar,
    addMenuItem: navigationStore.addMenuItem,
    removeMenuItem: navigationStore.removeMenuItem,
    updateRoute: navigationStore.updateRoute
  }
}

// 組合多個store的通用函數
export function useApp() {
  const wip = useWip()
  const navigation = useNavigation()
  const apiState = useApiState()
  
  return {
    ...wip,
    ...navigation,
    // 全域 API 狀態
    globalLoading: apiState.isLoading,
    globalError: apiState.hasError,
    globalSuccess: apiState.success
  }
}

// 僅使用 API 功能
export function useApiOnly() {
  return useWipApi()
}
