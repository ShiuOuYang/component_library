---
name: component-library
description: 在 component_library 這個 Vue 3 + Vite + Tailwind + D3 企業級組件庫專案中進行開發。當使用者要在此專案新增或修改共用組件（Chpt* 系列）、新增組件文檔頁面、調整 D3 圖表組件、串接 API / Pinia store、或詢問「這個專案有哪些組件可以用」「某個組件的 props 是什麼」時，務必使用此技能。即使使用者只說「幫我加一個 XXX 元件」「改一下表格」「加個 Modal」，只要工作目錄是這個組件庫專案，都要套用此技能的架構規範與註冊流程，避免漏掉 barrel export、路由、側邊欄三處註冊。
---

# 前端共用組件庫開發 Skill

專案：`component_library`（Vue 3 企業級共用組件庫）
技術棧：Vue 3 `<script setup>` + Vite 5 + Tailwind CSS 3 + TypeScript（部分）+ D3 v7 + Pinia + Vue Router 4 + axios

## 開始前必讀（30 秒版）

1. **所有共用組件放 `src/components/common/`**，並在 `src/components/common/index.js` 加一行 export（含分類註解）。
2. **新組件一律用 `Chpt` 前綴 + `<script setup lang="ts">` + `interface Props` + `withDefaults`**，型別共用自 `src/components/common/types/ui.types.ts`。
3. **Tailwind class 必須是完整字串**，不可字串拼接（`bg-${color}-500` 會被 purge 掉）。一律用 `Record<string, string>` 對照表。
4. **不要改 4 行的相容別名檔**（如 `CommonTable.vue`）；那些只是 `export { default } from './ChptXxx.vue'`。要改就改 `Chpt*` 本尊。
5. **新增文檔頁要註冊 3 個地方**：`src/router/index.js`、`DocLayout.vue` 的 `navSections`、`collapsedShortcuts`。漏掉側邊欄就等於沒人看得到。
6. **README.md 部分過時**（提到的 `Jx*`、`GantChart`、`BoxPlotChart`、`UniversalStackedChart` 等在 repo 內並不存在）。**以 `index.js` 與實際檔案為準**，不要照 README 生成 import。

## 指令

```bash
npm install
npm run dev        # http://localhost:4000 → 自動導向 /docs
npm run build      # vite build → dist/
npm run preview
npx vue-tsc --noEmit   # 型別檢查（專案沒有設 script，但 devDeps 有 vue-tsc）
node server.js     # express 靜態伺服 dist（port 5000），SPA history fallback
```

專案**沒有測試框架、沒有 ESLint/Prettier 設定**。改完至少跑一次 `npm run build` 確認能編譯；動到 `.ts`/`lang="ts"` 檔再跑 `vue-tsc --noEmit`（tsconfig 是 `strict` + `noUnusedLocals` + `noUnusedParameters`，別留沒用到的變數）。

Node 18（Dockerfile 與 CI 皆為 18）。

## 目錄地圖

```
src/
├── components/common/       ★ 所有共用組件 + index.js barrel + types/ui.types.ts
├── components/whiteboard/   白板子組件
├── components/D3Learning/   D3 教學用範例（非產品程式碼，不要拿來當規範）
├── views/docs/              文檔頁（每個 = 一頁展示 + 程式碼片段）
├── layouts/DocLayout.vue    文檔外框：側邊欄 navSections / collapsedShortcuts
├── router/index.js          路由 + beforeEach 認證守衛
├── composables/             useApi / useAuth / useWebSocket / useModalManager / d3 圖表 composables
├── stores/                  Pinia（user / navigation / yieldMonitor / vi / wpg ...）
├── api/                     axios 實例（index.js）+ 各領域 API（services.js）
├── utils/                   純函式：chartUtils / excelUtils / yieldUtils / spcDataUtils ...
└── config/                  colorPalette.js、excelFieldMapping.js
```

> `src/utils/utils/` 是重複目錄（chartUtils / ostTimeFormatTest 各有兩份）。**新東西一律放 `src/utils/`**，不要再往 `utils/utils/` 加檔案。

路徑別名：`@` → `src`（`vite.config.js` 與 `tsconfig.json` 都有設）。新程式碼優先用 `@/components/common`，但既有檔案混用相對路徑，改既有檔案時沿用該檔原本風格即可。

## 工作流程 A：新增一個共用組件

1. 先查 `references/component-inventory.md` 確認**沒有既有組件可覆蓋需求**（常見重複：Table、Modal、Filter、Pagination 各有 2~3 個版本）。有的話優先擴充既有 props，而非再造一個。
2. 建立 `src/components/common/ChptXxx.vue`，以 `assets/ChptComponent.template.vue` 為骨架。
3. 在 `src/components/common/index.js` **對應分類區段**下加：
   ```js
   export { default as ChptXxx } from './ChptXxx.vue';
   ```
   分類區段（照原順序，不要自創新分類除非真的沒地方放）：基礎表單原子元件 / 資料呈現 / 基礎圖表 / 分面圖表 / 通用 Modal 浮窗 / 顯示反饋 / 佈局容器 / 過濾器搜尋 / 互動提示 / 導覽流程 / 匯出上傳工具 / 主題導覽。
   > `index.js` 開頭有 UTF-8 BOM，用編輯工具局部替換即可，**不要整檔重寫**以免破壞編碼。
4. 若要相容舊命名，另建 4 行別名檔：
   ```vue
   <script>
   /** XxxOld（相容別名） - re-export ChptXxx */
   export { default } from './ChptXxx.vue'
   </script>
   ```
5. 補文檔頁（見工作流程 B）。

## 工作流程 B：新增 / 更新文檔頁

文檔頁放 `src/views/docs/components/XxxDocs.vue`（多組件合併頁）或 `src/views/docs/XxxDoc.vue`（單一大型組件）。骨架見 `assets/DocPage.template.vue`。

三處註冊：

```js
// 1) src/router/index.js → /docs 的 children 內
{
  path: "components/xxx",
  name: "XxxDoc",
  component: () => import("../views/docs/components/XxxDocs.vue"), // 新頁一律 lazy import
  meta: { title: "XXX 元件" },
},

// 2) src/layouts/DocLayout.vue → navSections 對應分類的 items
{ to: '/docs/components/xxx', icon: '🧩', label: 'XXX 元件' },

// 3) src/layouts/DocLayout.vue → collapsedShortcuts
{ to: '/docs/components/xxx', icon: '🧩', title: 'XXX 元件' },
```

路由守衛規則：`beforeEach` 判斷 `to.meta.requiresAuth !== false` 才擋。Vue Router 4 會把父層 meta 合併進 `to.meta`，`/docs` 父路由已是 `requiresAuth: false`，所以文檔子頁不用再寫。**非文檔的新頁面預設會需要登入**，若不需要請顯式加 `requiresAuth: false`。

## 撰寫規範（強制）

### SFC 結構
- 一律 `<script setup>`；**新的原子/UI 組件用 `lang="ts"`**。既有 JS 圖表組件（DualAxisComboChart 等）維持 JS，不要順手改寫成 TS。
- 註解一律**繁體中文**，組件開頭放一段 JSDoc 說明「用途 / 特性」。
- 樣式：Tailwind utility 為主，寫在 template；SVG 樣式、`:deep()`、複雜選擇器才寫 `<style scoped>`。

### Props / Emits（TS 組件）
```ts
interface ChptXxxProps {
  /** 每個 prop 都要有繁中註解 */
  modelValue?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  disabled?: boolean
}
const props = withDefaults(defineProps<ChptXxxProps>(), {
  modelValue: '', size: 'md', disabled: false,
})
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()
```
- 尺寸沿用 `'xs' | 'sm' | 'md' | 'lg'`（按鈕另有 `3xs`/`2xs`）；顏色沿用 `primary | secondary | success | warning | danger | info`。共用型別（`ComponentSize`、`ColorVariant`、`SelectOption`、`Placement`、`RadiusSize`）從 `./types/ui.types` 匯入，缺什麼就往那檔補。
- 雙向綁定一律 `modelValue` + `update:modelValue`。

### 樣式對照表寫法（重要）
```ts
const sizeClass = computed(() => {
  const map: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs h-6',
    md: 'px-4 py-2 text-base h-10',
  }
  return map[props.size] ?? map.md   // 一律有 fallback
})
```
Tailwind 設定中 `theme.extend` **整段被註解掉**，所以沒有 `primary`、`2xs` 這類自訂 token，只能用原生調色盤（`blue-500`、`gray-700`…）。

### 深色模式
`src/style.css` 用 `color-scheme: light only` 並以 `!important` 鎖定淺色。**不要假設全域 dark mode 可用**（`tailwind.config.js` 也沒開 `darkMode: 'class'`）。深色需求走 `ChptDarkModeToggle` / `SimpleDarkModeToggle` 的區域性切換。

### 圖示
Material Symbols（`<ChptIcon>{{ 'settings' }}</ChptIcon>`）為主，FontAwesome（`<i class="fas fa-spinner fa-spin">`）僅用於既有 loading 等既成用法。兩者都在 `main.js` 全域引入。

## 資料與狀態層

- **API**：`src/api/index.js` 是 axios 實例（`VITE_API_BASE_URL`、120s timeout、request 攔截器自動帶 `localStorage.auth_token`、response 攔截器處理 401 清 token）。新 API 加在 `src/api/services.js`，依領域分物件（`authApi`、…）匯出。
- **狀態**：Pinia，新 store 放 `src/stores/xxx.js` 並在 `src/stores/index.js` 補 export。
- **認證**：`composables/useAuth.js` + `useRouteGuard.js`；token 存 localStorage。
- **Toast**：`import { useToast } from '@/components/common/useToast'`，需在全域掛 `<ChptToast />`。
- **Modal 疊層/最小化**：`composables/useModalManager.ts` 管 z-index 與最小化列表，搭配 `<ChptModalDock />`。新 modal 用 `generateModalId()` 取 id。
- **WebSocket**：`composables/useWebSocket.js`（另有 `start-websocket-server.bat`、`ws` 依賴）。

環境變數只認 `VITE_` 前綴，見 `.env.development` / `.env.production`。

## 需要更多細節時讀這些

| 檔案 | 什麼時候讀 |
|---|---|
| `references/component-inventory.md` | 要知道「有哪些組件、props/emits/slots 是什麼、哪些是別名」——**動手寫任何 template 前先查這份** |
| `references/chart-patterns.md` | 要新增或修改 D3 圖表組件（layers 結構、brush、autoResize、tooltip slot、facet） |
| `references/architecture.md` | 要動 API / store / 認證 / 路由守衛 / 部署（Docker、GitHub Actions） |
| `assets/ChptComponent.template.vue` | 新增 TS 原子組件的起手式 |
| `assets/DocPage.template.vue` | 新增文檔頁的起手式 |

若同時要「從零設計一個新的 D3 視覺化組件」，本專案的 `vue-viz-component` skill 規範（props 分區、欄位映射、響應式）與此處相容，兩者一起套用；本 skill 的註冊流程（barrel export + 文檔三處註冊）優先。

## 常見地雷

- 加了組件卻沒加 `index.js` export → 其他頁 `import { X } from '@/components/common'` 直接是 undefined。
- 加了文檔路由卻沒加 `navSections` → 側邊欄看不到。
- 動態組 Tailwind class → build 後樣式消失。
- 改到 `CommonTable.vue` / `ExcelEditor.vue` 等 4 行別名檔 → 白改，實體在 `ChptTable.vue` / `ChptExcelEditor.vue`。
- 依 README 的 `Jx*` 命名寫 import → 這些組件不存在，會直接編譯失敗。
- 大型組件（`ChptExcelEditor.vue` 2089 行、`DualAxisComboChart.vue` 1761 行）請用局部 str_replace 修改，不要整檔重寫。
