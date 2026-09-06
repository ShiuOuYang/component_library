# 架構參考（進入點 / 設計令牌 / API / 狀態 / 路由 / 建置部署）

## 應用進入點

`src/main.js`：
- 全域 CSS：`@/styles/index.css`（設計令牌與 Tailwind 入口）
- 圖示：FontAwesome（`@fortawesome/fontawesome-free/css/all.min.css`）+ Material Symbols（`material-symbols/outlined.css`）
- 建立 app → `app.use(router)` → `createPinia()`
- 註冊全域指令 `v-click-outside`（點擊外部觸發回呼，下拉選單常用）

新增全域指令 / plugin 都在這裡註冊。

## 設計令牌（設計值單一來源）

```
src/design/tokens.js        ← 唯一手動維護（品牌色/語意色/間距/圓角/陰影/字級/z-index/duration/viz）
        │
        ├─→ tokensPlugin.js ─→ :root { --color-* / --viz-* / --z-* … }（scoped CSS / D3 用）
        └─→ tailwind.config.js theme.extend.colors  → bg-primary-600 等 utility class 用
```

- **品牌色**：`primary`＝藍（600 `#2563EB`）；`success`＝綠、`danger`＝紅、`warning`＝黃、`info`＝青；`neutral` 沿用 Tailwind 內建。
- Tailwind 另有語意化別名：`content`（文字）、`surface`（背景）、`stroke`（邊框）→ `text-content-*`、`bg-surface-*`、`border-stroke-*`。
- **改任何設計值只改 `tokens.js`**（CSS 變數 + utility class 自動同步）；改品牌色後要**重啟 dev server**（Tailwind 啟動時才讀 tokens）+ 硬刷新。
- 三種用法：
  1. template：`class="bg-primary-600 text-success-700 border-stroke-light"`（token utility）
  2. scoped CSS / `:deep()` SVG：`var(--viz-axis-line)`、`var(--color-primary-600)`、`var(--z-modal)`
  3. D3：`import { viz, duration, categoricalRange, sequentialRange } from '@/design'`
- 規範細節與遷移對照見 `style/DESIGN_SYSTEM.md`（與 `src/design` 同步維護）。

## API 層

### `src/api/index.js`
axios 實例：
- `baseURL = import.meta.env.VITE_API_BASE_URL || 'http://10.22.94.69:3007/router'`
- `timeout: 120000`
- **request 攔截器**：自動帶 `Authorization: Bearer`（`localStorage.auth_token`），並記錄 `config.metadata.startTime`
- **response 攔截器**：印出耗時；`401` 清 token（未來導向登入頁）；狀態碼訊息來自 `./httpStatus.js`

### `src/api/services.js`
依領域匯出 API 物件，例：`authApi.login()`、`authApi.verify()`。
新增 API 加在對應領域物件內，回傳統一形狀 `{ status, message, data }`，錯誤用 try/catch 回傳，**不要讓錯誤直接 throw 到 UI**。

### `src/composables/useApi.js`
- `useApiState()`：loading / error / data 狀態管理
- `useApiCall()`：包裝呼叫流程

## 狀態管理（Pinia）

`src/stores/`：`user.js`、`navigation.js`、`yieldMonitor.js`、`predictYield.js`、`redisual.js`、`vi.js`、`wpg.js`。
`src/stores/index.js` 只匯出其中三個（`useNavigationStore`、`useYieldMonitorStore`、`useUserStore`）——**新增 store 記得補 export**。

`src/composables/useStores.js` 提供 `useNavigation()`、`useApp()`、`useApiOnly()` 等組合封裝。

## 認證與路由守衛

- `composables/useAuth.js`：`useAuth()`（登入 / 登出 / 驗證）、`useUser()`
- `composables/useRouteGuard.js`：`checkAuth(to)`、`checkLoginPageRedirect()`
- `src/router/index.js` 的 `beforeEach`：
  - `/login` → 已登入則導回 `/`
  - 其餘：`to.meta.requiresAuth !== false` 就呼叫 `checkAuth`，失敗依 `result.redirectTo` 導向或 `next(false)`
- Vue Router 4 會把父路由 meta 合併到 `to.meta`，`/docs` 已設 `requiresAuth: false`，子路由不需重複設定
- 首頁 `/` → redirect `/docs`；token 存 `localStorage.auth_token`（另有 `auth_time`）

## 文檔系統與側欄

- 外框 `src/layouts/DocLayout.vue`：`main` 是捲動容器；側欄由 `navSections`（資料驅動）與 `collapsedShortcuts` 構成。
- `navSections` item 可帶 `anchors: [{ label, id }]` → 側欄顯示可展開子項，點擊後跳轉到頁面對應的 `<section :id>`（頁面要自行放 `id`，建議 `scroll-mt-24`）；切頁時該群組會自動展開（`watch(route.path,{immediate:true})` 置於 navSections 宣告之後，勿搬回前方以免 TDZ 空白頁）。
- **不要為已被 canonical 頁完整覆蓋的功能另開文檔路由**（已移除 common-table／draggable-modal／filter-* 等重複頁）。
- 詳實化文件頁格式（使用時機/引入/示範/`ChptCodeBlock :code`/`_ApiTable`/注意）見 `SKILL.md` 的「工作流程 B」；共用 API 表元件 `src/views/docs/components/_ApiTable.vue`。

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
- `tailwind.config.js`：content 掃 `./src/**/*.{vue,js,ts,jsx,tsx}`；`theme.extend` 目前**有** token 色（primary/secondary/success/warning/danger/info + content/surface/stroke 別名）、品牌陰影、`zIndex`（z-modal/z-tooltip/z-dropdown）、keyframes/animation
- `server.js`：Express 靜態服務 `dist/`（預設 port 5000），`app.get('*')` 做 SPA history fallback
- `Dockerfile`：多階段（node:18 builder → 靜態伺服），`docker-compose.yml` 一併提供
- `.github/workflows/deploy.yml`：self-hosted runner（PowerShell），觸發條件 PR merge 到 `dev`，流程 `npm ci` → `npm run build`
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
