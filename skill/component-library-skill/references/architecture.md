# 架構參考（API / 狀態 / 路由 / 建置部署）

## 應用進入點

`src/main.js`：
- 建立 app → `createPinia()` → `app.use(router)` → `app.use(pinia)`
- 全域 CSS：`./style.css`、FontAwesome（`@fortawesome/fontawesome-free`）、Material Symbols（`material-symbols/outlined.css`）
- 註冊全域指令 `v-click-outside`（點擊外部觸發回呼，下拉選單常用）

新增全域指令 / plugin 都在這裡註冊。

## API 層

### `src/api/index.js`
axios 實例：
- `baseURL = import.meta.env.VITE_API_BASE_URL || 'http://10.22.94.69:3007/router'`
- `timeout: 120000`
- **request 攔截器**：自動從 `localStorage.auth_token` 帶 `Authorization: Bearer`，並記錄 `config.metadata.startTime`
- **response 攔截器**：印出耗時；`401` 時清除 token（未來導向登入頁）；狀態碼訊息來自 `./httpStatus.js`（`HTTP_STATUS`、`getStatusMessage`）

### `src/api/services.js`
依領域匯出 API 物件，例：`authApi.login()`、`authApi.verify()`。
新增 API 時：加在對應領域物件內，回傳統一形狀 `{ status, message, data }`，錯誤用 try/catch 回傳 `error.response.data` 或自訂網路錯誤訊息，**不要讓錯誤直接 throw 到 UI**。

### `src/composables/useApi.js`
- `useApiState()`：loading / error / data 狀態管理
- `useApiCall()`：包裝呼叫流程

## 狀態管理（Pinia）

`src/stores/`：`user.js`、`navigation.js`、`yieldMonitor.js`、`predictYield.js`、`redisual.js`、`vi.js`、`wpg.js`。
`src/stores/index.js` 只匯出其中三個（`useNavigationStore`、`useYieldMonitorStore`、`useUserStore`）——**新增 store 時記得補上 export**，否則只能用完整路徑匯入。

`src/composables/useStores.js` 提供 `useNavigation()`、`useApp()`、`useApiOnly()` 等組合封裝。

## 認證與路由守衛

- `composables/useAuth.js`：`useAuth()`（登入 / 登出 / 驗證）、`useUser()`
- `composables/useRouteGuard.js`：`checkAuth(to)`、`checkLoginPageRedirect()`
- `src/router/index.js` 的 `beforeEach`：
  - `/login` → 已登入則導回 `/`
  - 其餘：`to.meta.requiresAuth !== false` 就呼叫 `checkAuth`，失敗依 `result.redirectTo` 導向或 `next(false)`
- Vue Router 4 會把父路由 meta 合併到 `to.meta`，`/docs` 已設 `requiresAuth: false`，子路由不需重複設定
- 首頁 `/` → redirect `/docs`
- token 存 `localStorage.auth_token`（另有 `auth_time`）

## 環境變數

只有 `VITE_` 前綴會被注入。

| 變數 | development | production |
|---|---|---|
| `VITE_API_BASE_URL` | `http://10.22.41.134:3005/router` | `http://10.22.94.69:3007/router` |
| `VITE_API_TIMEOUT` | 10000 | 15000 |
| `VITE_ENABLE_MOCK_DATA` | false | false |
| `VITE_ENABLE_AUTO_REFRESH` / `VITE_REFRESH_INTERVAL` | true / 30000 | true / 60000 |
| `VITE_DEBUG_API` / `VITE_LOG_LEVEL` | true / info | false / error |

## 建置與部署

- `vite.config.js`：alias `@` → `src`；dev server `host 0.0.0.0`、`port 4000`；build `outDir: dist`，`manualChunks` 分出 `vue-vendor`（vue/vue-router/pinia）與 `ui-vendor`（@vueuse/core）
- `server.js`：Express 靜態服務 `dist/`（預設 port 5000），`app.get('*')` 做 SPA history fallback
- `Dockerfile`：多階段（node:18 builder → 靜態伺服），`docker-compose.yml` 一併提供
- `.github/workflows/deploy.yml`：self-hosted runner（PowerShell），觸發條件是 **PR merge 到 `dev`**，流程 `npm ci` → `npm run build`
- Windows 開發輔助：`start-dev.bat`、`start-websocket-server.bat`

## TypeScript 狀態

- `tsconfig.json`：`strict: true`、`noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch`、`allowJs: true`、paths `@/* → src/*`
- 專案是 **TS / JS 混合**：`Chpt*` 原子組件多為 `lang="ts"`，圖表與部分舊組件是 JS
- 沒有 `typecheck` script，需要時手動 `npx vue-tsc --noEmit`（既有程式碼可能本來就有錯誤，只需確認你改的檔案沒新增錯誤）

## 沒有的東西（不要假設存在）

- 沒有測試框架（無 vitest / jest / playwright）
- 沒有 ESLint / Prettier 設定檔
- 沒有 Storybook（文檔系統就是 `/docs` 自建頁面）
- 沒有 `mock-server/` 目錄（`start-dev.bat` 有引用但 repo 內不存在）
- Tailwind `theme.extend` 全被註解掉，沒有自訂 design token
