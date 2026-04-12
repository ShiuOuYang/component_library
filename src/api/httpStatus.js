// HTTP 狀態碼常數
export const HTTP_STATUS = {
  // 成功狀態碼
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  // 重定向狀態碼
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  // 客戶端錯誤狀態碼
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  // 服務器錯誤狀態碼
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
}

// 狀態碼分類函數
export const isSuccessStatus = (status) => status >= 200 && status < 300
export const isRedirectStatus = (status) => status >= 300 && status < 400
export const isClientErrorStatus = (status) => status >= 400 && status < 500
export const isServerErrorStatus = (status) => status >= 500 && status < 600

// 狀態碼訊息映射
export const getStatusMessage = (status) => {
  const messages = {
    200: '請求成功',
    201: '資源創建成功',
    202: '請求已接受，正在處理',
    204: '操作成功，無內容返回',
    400: '請求參數錯誤',
    401: '身分驗證失敗，請重新登入',
    403: '權限不足，無法存取此資源',
    404: '請求的資源不存在',
    405: '不支援的請求方法',
    409: '資源衝突，請重新整理後再試',
    422: '請求數據格式錯誤',
    429: '請求過於頻繁，請稍後再試',
    500: '伺服器內部錯誤',
    502: '伺服器閘道錯誤',
    503: '服務暫時不可用',
    504: '伺服器響應超時'
  }
  return messages[status] || `未知狀態碼: ${status}`
}
