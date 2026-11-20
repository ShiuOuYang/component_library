import { useUserStore } from '../stores/user.js'

/**
 * 路由守衛 Composable
 * 處理路由認證邏輯
 */
export function useRouteGuard() {
  /**
   * 檢查路由是否需要認證
   * @param {Route} to - 目標路由
   * @returns {Promise<Object>} { allowed: boolean, redirectTo: string|null, reason: string }
   */
  async function checkAuth(to) {
    const userStore = useUserStore()

    // 初始化認證狀態（如果還沒初始化）
    if (!userStore.isAuthenticated) {
      userStore.initAuth()
    }

    const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true' || import.meta.env.DEV
    if (skipAuth) {
      
      // 即使在開發模式，仍然檢查管理員權限
      if (to.meta?.requiresAdmin) {
        if (!userStore.isAdmin) {
          console.warn(`⚠️ 需要管理員權限才能訪問: ${to.path}`)
          alert('⚠️ 此頁面僅限管理員訪問')
          return { allowed: false, redirectTo: '/', reason: 'no_admin' }
        }
      }
      
      // 檢查特定權限
      if (to.meta?.requiresPermission) {
        const hasPermission = userStore.hasPermission(to.meta.requiresPermission)
        if (!hasPermission) {
          console.warn(`⚠️ 沒有權限訪問: ${to.path} (需要: ${to.meta.requiresPermission})`)
          alert('⚠️ 您沒有權限訪問此頁面，請聯絡管理員')
          return { allowed: false, redirectTo: '/', reason: 'no_permission' }
        }
      }
      
      return { allowed: true, redirectTo: null, reason: 'success' }
    }

    // 檢查是否已登入
    if (!userStore.isLoggedIn) {
      return { allowed: false, redirectTo: '/login', reason: 'not_logged_in' }
    }

    // 驗證 token 是否仍然有效
    try {
      const isValid = await userStore.verifyToken()
      if (isValid) {
        
        // 檢查是否需要管理員權限
        if (to.meta?.requiresAdmin) {
          if (!userStore.isAdmin) {
            console.warn(`⚠️ 需要管理員權限才能訪問: ${to.path}`)
            alert('⚠️ 此頁面僅限管理員訪問')
            return { allowed: false, redirectTo: '/', reason: 'no_admin' }
          }
        }
        
        // 檢查權限（如果路由需要特定權限）
        if (to.meta?.requiresPermission) {
          const hasPermission = userStore.hasPermission(to.meta.requiresPermission)
          if (!hasPermission) {
            console.warn(`⚠️ 沒有權限訪問: ${to.path} (需要: ${to.meta.requiresPermission})`)
            alert('⚠️ 您沒有權限訪問此頁面，請聯絡管理員')
            return { allowed: false, redirectTo: '/', reason: 'no_permission' }
          }
        }
        
        return { allowed: true, redirectTo: null, reason: 'success' }
      } else {
        return { allowed: false, redirectTo: '/login', reason: 'token_invalid' }
      }
    } catch (error) {
      console.error('🚨 Token 驗證錯誤:', error)
      return { allowed: false, redirectTo: '/login', reason: 'token_error' }
    }
  }

  /**
   * 檢查是否在登入頁但已登入
   * @returns {boolean} 是否需要重定向到首頁
   */
  function checkLoginPageRedirect() {
    const userStore = useUserStore()
    
    // 初始化認證狀態
    if (!userStore.isAuthenticated) {
      userStore.initAuth()
    }

    // 如果已登入，需要重定向到首頁
    if (userStore.isLoggedIn) {
      return true
    }
    
    return false
  }

  return {
    checkAuth,
    checkLoginPageRedirect
  }
}
