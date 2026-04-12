import { ref, computed, readonly } from 'vue'
import { HTTP_STATUS, isSuccessStatus, isRedirectStatus, isClientErrorStatus, isServerErrorStatus, getStatusMessage } from '../api/httpStatus.js'

// 🎯 創建全局 API 狀態單例
let apiStateInstance = null

// API 狀態管理
export function useApiState() {
  // 🎯 如果已經有實例，直接返回
  if (apiStateInstance) {
    console.log('🎯 使用現有的 apiState 實例')
    return apiStateInstance
  }

  console.log('🎯 創建新的 apiState 實例')
  
  // 載入狀態
  const loading = ref(false)              // 全局載入狀態
  const loadingStates = ref(new Map())    // 多個載入狀態管理 Map<key, boolean>
  
  // 錯誤狀態  
  const error = ref(null)                 // 全局錯誤
  const errors = ref(new Map())           // 多個錯誤狀態管理 Map<key, errorData>
  
  // 成功狀態
  const success = ref(false)              // 成功標記
  const successMessage = ref('')          // 成功訊息
  
  // 響應追蹤
  const lastResponse = ref(null)          // 最後一次響應
  const responseHistory = ref([])         // 響應歷史記錄 (最多50筆)
  
  // 網路狀態
  const isOnline = ref(navigator.onLine)  // 網路連線狀態
  
  // 監聽網路狀態變化
  window.addEventListener('online', () => {
    isOnline.value = true
  })
  
  window.addEventListener('offline', () => {
    isOnline.value = false
  })
  
  // 設定載入狀態
  const setLoading = (key, state = true) => {
    console.log('🎯 setLoading 呼叫:', { key, state, 
      currentGlobalLoading: loading.value,
      currentStatesSize: loadingStates.value.size 
    })
    
    if (key) {
      // 特定操作的載入狀態
      if (state) {
        loadingStates.value.set(key, true)  // 設定載入中
        console.log('🎯 設定特定載入狀態:', key, '現在 loadingStates 大小:', loadingStates.value.size)
      } else {
        loadingStates.value.delete(key)     // 移除載入狀態
        console.log('🎯 移除特定載入狀態:', key, '現在 loadingStates 大小:', loadingStates.value.size)
      }
    } else {
      // 全局載入狀態
      loading.value = state
      console.log('🎯 設定全局載入狀態:', state)
    }
    
    // 觸發 isLoading 計算屬性更新
    const newIsLoading = loading.value || loadingStates.value.size > 0
    console.log('🎯 新的 isLoading 值:', newIsLoading)
  }
  
  // 設定錯誤狀態
  const setError = (errorData, key = null) => {
    if (key) {
      if (errorData) {
        errors.value.set(key, errorData)
      } else {
        errors.value.delete(key)
      }
    } else {
      error.value = errorData
    }
  }
    // 設定成功狀態
  const setSuccess = (message = '操作成功', statusCode = null) => {
    success.value = true
    successMessage.value = message
    
    // 記錄成功響應
    if (statusCode) {
      setResponse({
        status: statusCode,
        message,
        type: 'success',
        timestamp: new Date().toISOString()
      })
    }
    
    // 自動清除成功狀態（3秒後）
    setTimeout(() => {
      success.value = false
      successMessage.value = ''
    }, 3000)
  }
  
  // 設定響應狀態
  const setResponse = (responseData) => {
    lastResponse.value = responseData
    
    // 添加到歷史記錄（保留最近50筆）
    responseHistory.value.unshift(responseData)
    if (responseHistory.value.length > 50) {
      responseHistory.value = responseHistory.value.slice(0, 50)
    }
  }
    // 清除所有狀態
  const clearStates = () => {
    loading.value = false
    loadingStates.value.clear()
    error.value = null
    errors.value.clear()
    success.value = false
    successMessage.value = ''
    lastResponse.value = null
  }
  
  // 清除響應歷史
  const clearResponseHistory = () => {
    responseHistory.value = []
  }
  
  // 計算屬性
  const isLoading = computed(() => {
    console.log('Checking loading state...', loading.value, loadingStates.value.size)
    return loading.value || loadingStates.value.size > 0
  })
  
  const hasError = computed(() => {
    return error.value !== null || errors.value.size > 0
  })
  
  const currentError = computed(() => {
    if (error.value) return error.value
    if (errors.value.size > 0) {
      return Array.from(errors.value.values())[0]
    }
    return null
  })
  
  // 檢查特定操作的載入狀態
  const isLoadingKey = (key) => {
    return loadingStates.value.has(key)
  }
  
  // 檢查特定操作的錯誤狀態
  const getError = (key) => {
    return errors.value.get(key) || null
  }
  
  // 檢查最後響應的狀態碼
  const getLastStatus = () => {
    return lastResponse.value?.status || null
  }
  
  // 檢查是否為特定狀態碼
  const isStatus = (statusCode) => {
    return lastResponse.value?.status === statusCode
  }
  
  // 檢查是否為成功響應
  const isSuccessResponse = () => {
    const status = lastResponse.value?.status
    return status ? isSuccessStatus(status) : false
  }
  
  // 獲取響應歷史中的特定狀態碼
  const getResponsesByStatus = (statusCode) => {
    return responseHistory.value.filter(response => response.status === statusCode)
  }
  
  // 獲取最近的錯誤響應
  const getRecentErrors = (limit = 10) => {
    return responseHistory.value
      .filter(response => response.type === 'error')
      .slice(0, limit)
  }
  
  // 🎯 創建並快取 apiState 實例
  apiStateInstance = {
    // 狀態
    loading: readonly(loading),
    error: readonly(error),
    success: readonly(success),
    successMessage: readonly(successMessage),
    isOnline: readonly(isOnline),
    lastResponse: readonly(lastResponse),
    responseHistory: readonly(responseHistory),
    
    // 計算屬性
    isLoading,
    hasError,
    currentError,
    
    // 方法
    setLoading,
    setError,
    setSuccess,
    setResponse,
    clearStates,
    clearResponseHistory,
    isLoadingKey,
    getError,
    getLastStatus,
    isStatus,
    isSuccessResponse,
    getResponsesByStatus,
    getRecentErrors
  }
  
  return apiStateInstance
}

// API 請求包裝器
export function useApiCall() {
  const { setLoading, setError, setSuccess, setResponse } = useApiState()
  
  // 處理響應狀態碼
  const handleResponse = (response, options = {}) => {
    const { successMessage } = options
    const status = response.status
    const statusMessage = getStatusMessage(status)
    
    // 記錄響應
    const responseData = {
      status,
      message: statusMessage,
      type: isSuccessStatus(status) ? 'success' : 'info',
      timestamp: new Date().toISOString(),
      data: response.data
    }
    
    setResponse(responseData)
    
    // 處理不同的成功狀態碼
    if (isSuccessStatus(status)) {
      const message = successMessage || statusMessage
      setSuccess(message, status)
      
      // 根據狀態碼執行特定邏輯
      switch (status) {
        case HTTP_STATUS.CREATED:
          console.log('✅ 資源創建成功')
          break
        case HTTP_STATUS.NO_CONTENT:
          console.log('✅ 操作成功完成')
          break
        case HTTP_STATUS.ACCEPTED:
          console.log('⏳ 請求已接受，正在處理中...')
          break
        default:
          console.log(`✅ 請求成功 (${status})`)
      }
    }
    
    return response
  }
  
  // 處理錯誤狀態碼
  const handleError = (error, options = {}) => {
    const { errorHandler, loadingKey } = options
    const response = error.response
    const status = response?.status
    
    if (status) {
      const statusMessage = getStatusMessage(status)
      
      // 詳細的錯誤數據
      const errorData = {
        message: response.data?.message || statusMessage,
        status,
        statusText: response.statusText,
        code: response.data?.code,
        details: response.data?.details || null,
        timestamp: new Date().toISOString(),
        url: response.config?.url,
        method: response.config?.method?.toUpperCase()
      }
      
      // 記錄響應
      setResponse({
        ...errorData,
        type: 'error'
      })
      
      // 根據狀態碼執行特定處理
      switch (status) {
        case HTTP_STATUS.UNAUTHORIZED:
          console.error('🔒 身分驗證失敗')
          // 可以在這裡添加登出邏輯
          localStorage.removeItem('auth_token')
          // window.location.href = '/login'
          break
          
        case HTTP_STATUS.FORBIDDEN:
          console.error('🚫 權限不足')
          break
          
        case HTTP_STATUS.NOT_FOUND:
          console.error('🔍 資源不存在')
          break
          
        case HTTP_STATUS.CONFLICT:
          console.error('⚠️ 資源衝突')
          break
          
        case HTTP_STATUS.UNPROCESSABLE_ENTITY:
          console.error('📝 數據格式錯誤')
          break
          
        case HTTP_STATUS.TOO_MANY_REQUESTS:
          console.error('🚀 請求過於頻繁')
          break
          
        case HTTP_STATUS.INTERNAL_SERVER_ERROR:
          console.error('🔥 伺服器內部錯誤')
          break
          
        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          console.error('🔧 服務暫時不可用')
          break
          
        case HTTP_STATUS.GATEWAY_TIMEOUT:
          console.error('⏰ 伺服器響應超時')
          break
          
        default:
          if (isClientErrorStatus(status)) {
            console.error(`💥 客戶端錯誤 (${status}): ${statusMessage}`)
          } else if (isServerErrorStatus(status)) {
            console.error(`🔥 伺服器錯誤 (${status}): ${statusMessage}`)
          } else {
            console.error(`❌ 未知錯誤 (${status}): ${statusMessage}`)
          }
      }
      
      // 使用自定義錯誤處理器或默認處理
      if (errorHandler) {
        errorHandler(errorData)
      } else {
        setError(errorData, loadingKey)
      }
    } else {
      // 網路錯誤或其他非 HTTP 錯誤
      const errorData = {
        message: error.message || '網路連接錯誤',
        status: null,
        code: error.code,
        timestamp: new Date().toISOString(),
        type: 'network'
      }
      
      setResponse({
        ...errorData,
        type: 'error'
      })
      
      console.error('🌐 網路錯誤:', error.message)
      
      if (errorHandler) {
        errorHandler(errorData)
      } else {
        setError(errorData, loadingKey)
      }
    }
    
    return error
  }
    // 執行 API 請求
  const execute = async (apiCall, options = {}) => {
    const {
      loadingKey = null,
      successMessage = null,
      errorHandler = null,
      retryCount = 0,
      retryDelay = 1000,
      validateStatus = null
    } = options
    
    let attempt = 0
    
    while (attempt <= retryCount) {
      try {
        setLoading(loadingKey, true)
        setError(null, loadingKey)
        
        const response = await apiCall()
        
        // 檢查自定義狀態驗證
        if (validateStatus && !validateStatus(response.status)) {
          throw new Error(`狀態碼 ${response.status} 不符合預期`)
        }
        
        // 處理響應
        return handleResponse(response, { successMessage })
      } catch (error) {
        attempt++
        
        // 檢查是否需要重試
        const shouldRetry = attempt <= retryCount && shouldRetryOnError(error)
        
        if (shouldRetry) {
          console.log(`重試第 ${attempt} 次，${retryDelay}ms 後執行...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt)) // 指數退避
          continue
        }
        
        // 處理錯誤
        handleError(error, { errorHandler, loadingKey })
        throw error
      } finally {
        setLoading(loadingKey, false)
      }
    }
  }
  
  // 判斷是否應該重試
  const shouldRetryOnError = (error) => {
    const status = error.response?.status
    
    // 不重試的狀態碼
    const noRetryStatuses = [
      HTTP_STATUS.BAD_REQUEST,
      HTTP_STATUS.UNAUTHORIZED,
      HTTP_STATUS.FORBIDDEN,
      HTTP_STATUS.NOT_FOUND,
      HTTP_STATUS.METHOD_NOT_ALLOWED,
      HTTP_STATUS.CONFLICT,
      HTTP_STATUS.UNPROCESSABLE_ENTITY
    ]
    
    if (status && noRetryStatuses.includes(status)) {
      return false
    }
    
    // 重試網路錯誤和伺服器錯誤
    return !status || isServerErrorStatus(status) || status === HTTP_STATUS.TOO_MANY_REQUESTS
  }
  
  // 批量執行 API 請求
  const executeBatch = async (apiCalls, options = {}) => {
    const {
      concurrency = 3,
      stopOnError = false,
      loadingKey = 'batch'
    } = options
    
    setLoading(loadingKey, true)
    
    try {
      const results = []
      const errors = []
      
      // 分批執行，控制並發數
      for (let i = 0; i < apiCalls.length; i += concurrency) {
        const batch = apiCalls.slice(i, i + concurrency)
        
        const batchPromises = batch.map(async (apiCall, index) => {
          try {
            const result = await execute(apiCall, { 
              loadingKey: `${loadingKey}_${i + index}`,
              retryCount: 1 
            })
            return { success: true, result, index: i + index }
          } catch (error) {
            const errorResult = { success: false, error, index: i + index }
            if (stopOnError) {
              throw errorResult
            }
            return errorResult
          }
        })
        
        const batchResults = await Promise.allSettled(batchPromises)
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              results.push(result.value)
            } else {
              errors.push(result.value)
            }
          } else {
            errors.push({
              success: false,
              error: result.reason,
              index: -1
            })
          }
        })
        
        if (stopOnError && errors.length > 0) {
          break
        }
      }
      
      return {
        results,
        errors,
        totalSuccess: results.length,
        totalErrors: errors.length,
        totalRequests: apiCalls.length
      }
    } finally {
      setLoading(loadingKey, false)
    }
  }
    return { 
    execute, 
    executeBatch, 
    handleResponse, 
    handleError,
    shouldRetryOnError
  }
}
