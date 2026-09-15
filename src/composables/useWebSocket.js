import { ref } from 'vue'

export function useWebSocket(url, options = {}) {
  // 解構 options 物件，並設定預設值
  const {
    autoReconnect = true,           // 如果沒有傳入，預設為 true
    reconnectInterval = 5000,       // 如果沒有傳入，預設為 5000ms
    maxReconnectAttempts = 5,       // 如果沒有傳入，預設為 5 次
    onMessage = null,               // 回調函數，預設為 null
    onOpen = null,
    onClose = null,
    onError = null
  } = options

  const ws = ref(null)                    // WebSocket 實例
  const isConnected = ref(false)          // 連線狀態
  const connectionStatus = ref('disconnected') // 連線狀態文字
  const lastMessage = ref(null)           // 最後收到的訊息
  const reconnectAttempts = ref(0)        // 重連次數

  let reconnectTimer = null

  const connect = () => {
    // 1. 檢查是否已經連線
    if (ws.value?.readyState === WebSocket.OPEN) {
      return  // 如果已連線，直接返回
    }

    // 2. 設定連線狀態
    connectionStatus.value = 'connecting'
    
    try {
      // 3. 建立 WebSocket 連線
      ws.value = new WebSocket(url)

      // 4. 設定事件監聽器
      ws.value.onopen = (event) => {
        // 連線成功時執行
        isConnected.value = true
        connectionStatus.value = 'connected'
        reconnectAttempts.value = 0
        
        // 如果有傳入 onOpen 回調函數，就執行它
        if (onOpen) {
          
          onOpen(event)
        }
      }

      ws.value.onmessage = (event) => {
        try {
          // 解析 JSON 資料
          const data = JSON.parse(event.data)
          lastMessage.value = data
          // console.log('📩 收到 WebSocket 訊息:', data)
          // 如果有傳入 onMessage 回調函數，就執行它
          if (onMessage) onMessage(data)
        } catch (error) {
          console.error('WebSocket 訊息解析錯誤:', error)
        }
      }

      ws.value.onclose = (event) => {
        isConnected.value = false
        connectionStatus.value = 'disconnected'
        console.log('WebSocket 連線關閉:', event.code, event.reason)
        
        if (onClose) onClose(event)
        
        // 自動重連
        if (autoReconnect && reconnectAttempts.value < maxReconnectAttempts) {
          scheduleReconnect()
        }
      }

      ws.value.onerror = (event) => {
        connectionStatus.value = 'error'
        console.error('WebSocket 錯誤:', event)
        
        if (onError) onError(event)
      }

    } catch (error) {
      connectionStatus.value = 'error'
      console.error('WebSocket 連線失敗:', error)
    }
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    
    if (ws.value) {
      ws.value.close(1000, '手動關閉連線')
    }
  }

  const send = (data) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data)
        ws.value.send(message)
        return true
      } catch (error) {
        console.error('發送訊息失敗:', error)
        return false
      }
    } else {
      console.warn('WebSocket 未連線，無法發送訊息')
      return false
    }
  }

  const scheduleReconnect = () => {
    if (reconnectTimer) return
    
    reconnectAttempts.value++
    console.log(`嘗試重連 (${reconnectAttempts.value}/${maxReconnectAttempts})...`)
    
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, reconnectInterval)
  }

  const forceReconnect = () => {
    disconnect()
    reconnectAttempts.value = 0
    setTimeout(connect, 1000)
  }

  // 生命週期管理
  // onMounted(() => {
  //   connect()
  // })

  // onUnmounted(() => {
  //   disconnect()
  // })

  return {
    // 狀態
    isConnected,
    connectionStatus,
    lastMessage,
    reconnectAttempts,
    
    // 方法
    connect,
    disconnect,
    send,
    forceReconnect
  }
}

// 使用方式：
// console.log(isConnected.value)          // 讀取值需要 .value
// isConnected.value = true                // 設定值需要 .value
