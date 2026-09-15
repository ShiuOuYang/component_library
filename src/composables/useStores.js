import { computed } from 'vue'
import { useNavigationStore } from '../stores'

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

// 註：原本此處還有 useApp() 與 useApiOnly()，兩者分別呼叫 useWip() 與 useWipApi()。
// 這兩個函式隨 wip store 一併移除（見 stores/index.js 被註解掉的匯出）後未補上，
// 呼叫必定 ReferenceError；且全專案沒有任何地方使用，故直接刪除。
// 需要組合多個 store 時請直接在使用端各自呼叫對應的 use*Store()。
