import { describe, expect, it } from 'vitest'

/**
 * AUTH_BASE_URL 的推導邏輯
 *
 * 後端有兩個路徑前綴：/router（資料）與 /user（認證），而 VITE_API_BASE_URL
 * 帶的是前者。services.js 原本為此直接寫死一台主機的絕對網址，導致登入與
 * token 驗證完全無視 VITE_API_BASE_URL 的設定。
 *
 * 這裡直接測試那條轉換規則本身 —— src/api/index.js 會建立 axios 實例與
 * 攔截器，在單元測試裡匯入它並不划算。
 */
const deriveAuthBaseUrl = (base) => base.replace(/\/router\/?$/, '')

describe('AUTH_BASE_URL 推導', () => {
  it('去掉結尾的 /router', () => {
    expect(deriveAuthBaseUrl('http://example.test:3007/router')).toBe(
      'http://example.test:3007'
    )
  })

  it('結尾有斜線也處理得掉', () => {
    expect(deriveAuthBaseUrl('http://example.test:3007/router/')).toBe(
      'http://example.test:3007'
    )
  })

  it('本機預設值', () => {
    expect(deriveAuthBaseUrl('http://localhost:3007/router')).toBe('http://localhost:3007')
  })

  it('只去掉結尾的 /router，不動路徑中間同名的段', () => {
    expect(deriveAuthBaseUrl('http://example.test/router/v2')).toBe(
      'http://example.test/router/v2'
    )
  })

  it('沒有 /router 後綴時原樣保留', () => {
    expect(deriveAuthBaseUrl('http://example.test:3007')).toBe('http://example.test:3007')
  })

  it('推導出來的位址接上 /user/login 是預期的形狀', () => {
    const authBase = deriveAuthBaseUrl('http://example.test:3007/router')
    expect(`${authBase}/user/login`).toBe('http://example.test:3007/user/login')
  })
})
