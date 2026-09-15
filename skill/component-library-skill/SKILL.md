---
name: component-library
description: 在 component-library 這個 Vue 3 + Vite + Tailwind + D3 企業級組件庫專案中進行開發。當使用者要在此專案新增或修改共用組件（Chpt* 系列）、新增組件文檔頁面、調整 D3 圖表組件、串接 API / Pinia store、或詢問「這個專案有哪些組件可以用」「某個組件的 props 是什麼」時，務必使用此技能。即使使用者只說「幫我加一個 XXX 元件」「改一下表格」「加個 Modal」，只要工作目錄是這個組件庫專案，都要套用此技能的架構規範與註冊流程，避免漏掉 barrel export、路由、側邊欄三處註冊。
---

# 前端共用組件庫開發 Skill

專案：`component-library`（Vue 3 企業級共用組件庫）
技術棧：Vue 3 `<script setup>` + Vite 5 + Tailwind CSS 3 + TypeScript（部分）+ D3 v7 + Pinia + Vue Router 4 + axios

## 開始前必讀（30 秒版）

1. **組件本尊放在 `src/components/library/`**，依群別：`ui/`（Chpt* 通用 UI）、`charts/`、`viewer/`、`excel/`、`shared/`（types 與 useToast）。正式入口是 **`@/components/library`**。
2. **`@/components/common` 是相容 facade（@deprecated）**，只是 re-export library；新程式一律 `@/components/library`。
3. **新組件一律用 `Chpt` 前綴 + `<script setup lang="ts">` + `interface Props` + `withDefaults`**；共用型別自 `src/components/library/shared/types/ui.types.ts`。
4. **設計值單一來源 `src/design/tokens.js`** → `tokensPlugin.js`（CSS 變數）+ `tailwind.config.js`（utility class）。顏色用 token（`primary`/`success`/`danger`/`warning`/`info`/`neutral`），**不要硬寫色碼**；Tailwind class 必須是完整字串（`Record<string,string>` 對照表，不可字串拼接）。
5. **不要改 4 行的相容別名檔**（`library/ui/CommonTable.vue`、`library/excel/ExcelEditor.vue`…）；那些只是 `export { default } from './ChptXxx.vue'`。要改就改 `Chpt*` 本尊。
6. **新增文檔頁要註冊**：`src/router/index.js`、`DocLayout.vue` 的 `navSections`（必要）；多區塊頁要在 `navSections` 該 item 加 `anchors: [{label,id}]`，並在頁面放對應 `<section :id>`，否則側欄子項點下去沒反應。`collapsedShortcuts` 只在想放「收合快捷」時加。
7. **不要為已被 canonical 頁完整覆蓋的功能再開獨立文檔路由**（2026-09-06 已移除重複頁：`common-table`、`draggable-modal`、`filter-select/filter-dropdown/filter-bar/tag-filter-dropdown`）。

## 指令

```bash
npm install
npm run dev        # http://localhost:4000 → 自動導向 /docs
npm run build      # vite build → dist/
npm run preview
npx vue-tsc --noEmit   # 型別檢查（專案沒有設 script，但 devDeps 有 vue-tsc）
node server.js     # express 靜態伺服 dist（port 5000），SPA history fallback
```

專案**沒有測試框架、沒有 ESLint/Prettier 設定**。改完至少跑一次 `npm run dev` 確認能編譯；動到 `.ts`/`lang="ts"` 檔再跑 `vue-tsc --noEmit`（tsconfig 是 `strict` + `noUnusedLocals` + `noUnusedParameters`，別留沒用到的變數）。

Node 18（Dockerfile 與 CI 皆為 18）。

## 目錄地圖

```
src/
├── components/
│   ├── library/               ★ canonical 組件庫（新結構，2026-09 重整）
│   │   ├── ui/                通用 UI（Chpt*）            → ui/index.js
│   │   ├── charts/            D3 圖表（雙軸/柏拉圖/熱力/分面） → charts/index.js
│   │   ├── viewer/            領域檢視器（Gerber / PCB）    → viewer/index.js
│   │   ├── excel/             Excel 編輯/匯出/匯入          → excel/index.js
│   │   ├── shared/            types/ui.types.ts、useToast.ts
│   │   └── index.js           正式公開 API（@/components/library）
│   ├── common/index.js        @deprecated 相容 facade（re-export library）
│   ├── whiteboard/            白板子組件
│   └── D3Learning/            D3 教學用範例（非產品程式碼，不要拿來當規範）
├── views/docs/               文檔頁（components/ 內多為多組件合併頁）
├── layouts/DocLayout.vue      文檔外框：navSections（可展開 anchors）/ collapsedShortcuts
├── design/                    tokens.js / tokensPlugin.js / index.js（設計令牌）
├── styles/                    index.css / base.css / components.css（樣式進入點在 main.js）
├── router/index.js            路由 + beforeEach 認證守衛
├── composables/               useApi / useAuth / useWebSocket / useModalManager / d3 chart composables
├── stores/                    Pinia（user / navigation / yieldMonitor / vi / wpg ...）
├── api/                       axios 實例（index.js）+ 各領域 API（services.js）
├── utils/                     純函式：chartUtils / excelUtils / yieldUtils / spcDataUtils ...
└── config/                    colorPalette.js、excelFieldMapping.js
```

路徑別名：`@` → `src`（`vite.config.js` 與 `tsconfig.json` 都有設）。新程式碼一律用 `@/components/library`；既有檔案若仍用 `@/components/common`（facade）屬過渡，可逐步改。

## 工作流程 A：新增一個共用組件

1. 先查 `references/component-inventory.md` 確認**沒有既有組件可覆蓋需求**（Table/Modal/Filter/Pagination 等曾有重複版本，現已收斂到 Chpt*）。有的話優先擴充既有 props。
2. 依性質放到對應資料夾：通用 UI → `library/ui/ChptXxx.vue`；Excel → `library/excel/ChptXxx.vue`；圖表 → `library/charts/...`；檢視器 → `library/viewer/...`。骨架用 `assets/ChptComponent.template.vue`。
3. 在**該群別的 index.js**（如 `library/ui/index.js`）加 export；若要進正式公開 API 再在 `library/index.js` 對應區段補一行。
4. 若要相容舊命名，另建 4 行別名檔放在同資料夾：
   ```vue
   <script>
   /** XxxOld（相容別名） - re-export ChptXxx */
   export { default } from './ChptXxx.vue'
   </script>
   ```
5. 補文檔頁（見工作流程 B）。

## 工作流程 B：新增 / 更新文檔頁

文檔頁位置：
- 多組件合併頁 → `src/views/docs/components/XxxDocs.vue`（例如 FeedbackDocs / OverlayDocs / DataFilterDocs…）
- 單一大型組件 → `src/views/docs/XxxDoc.vue`（例如 TooltipDoc / ParetoDoc…）

註冊（至少前兩處）：

```js
// 1) src/router/index.js → /docs 的 children 內（lazy import）
{ path: "components/xxx", name: "XxxDoc",
  component: () => import("../views/docs/XxxDoc.vue"),
  meta: { title: "XXX" } },

// 2) src/layouts/DocLayout.vue → navSections 對應分類 items
//    有「區塊內子項跳轉」需求時加 anchors（id 要與頁面 <section :id> 一致）
{ to: '/docs/components/xxx', icon: '🧩', label: 'XXX',
  anchors: [ { label: '功能一', id: 'xxx-f1' }, { label: '功能二', id: 'xxx-f2' } ] },

// 3)（選擇性）collapsedShortcuts
{ to: '/docs/components/xxx', icon: '🧩', title: 'XXX' },
```

**詳實化頁面格式（每頁元件建議遵守）**：
- 每個元件一個 `<section :id>`（如 `chpt-xxx`）＋ `class="... scroll-mt-24"`，讓側欄 anchors 跳得準。
- 區塊內依序放：使用時機（`<strong>使用時機：</strong>`）、引入方式、互動示範、程式碼、API 表、`<strong>注意：</strong>`。
- API 表用共用元件 `_ApiTable`（`title` + `rows[{name,type|params,def?,desc}]`），放 `src/views/docs/components/_ApiTable.vue`：
  - 頁面在 `components/` 資料夾：`import ApiTable from './_ApiTable.vue'`
  - 頁面在 `views/docs/` 根（如 TooltipDoc）：`import ApiTable from './components/_ApiTable.vue'`
- 程式碼範例用 `<ChptCodeBlock :code="字串" />`（在 `<script>` 用 backtick 字串，**不要**把原始 `<ChptXxx>` 寫進 template 的 `<pre><code>`，會被當成真實標籤造成 parse error）；template 一般文字也**不要**出現裸 `<某>`（用 `{某}` 代替）。

路由守衛規則：`beforeEach` 判斷 `to.meta.requiresAuth !== false` 才擋。Vue Router 4 會把父層 meta 合併進 `to.meta`，`/docs` 父路由已是 `requiresAuth: false`，所以文檔子頁不用再寫。**非文檔的新頁面預設會需要登入**，若不需要請顯式加 `requiresAuth: false`。

## 撰寫規範（強制）

### SFC 結構
- 一律 `<script setup>`；**新的原子/UI 組件用 `lang="ts"`**。既有 JS 圖表組件（DualAxisComboChart 等）維持 JS，不要順手改寫成 TS。
- 註解一律**繁體中文**，組件開頭放一段 JSDoc 說明「用途 / 特性」。
- 樣式：Tailwind utility 為主寫在 template；SVG 樣式、`:deep()`、複雜選擇器才寫 `<style scoped>`。

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
- 尺寸沿用 `'xs' | 'sm' | 'md' | 'lg'`（按鈕另有 `3xs`/`2xs`）；顏色沿用 `primary | secondary | success | warning | danger | info`（**都是 token**）。共用型別（`ComponentSize`、`ColorVariant`、`SelectOption`、`Placement`、`RadiusSize`）從 `@/components/library/shared/types/ui.types` 匯入，缺什麼就往那檔補。
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
- 顏色用 `primary-500`、`success-600`…（token）；**不要**在元件或 Tailwind config 硬寫色碼。
- 改品牌色：只改 `src/design/tokens.js` 的 `colors.primary`（目前＝藍 `#2563EB`），CSS 變數與 utility class 自動同步（改完要重啟 dev server，Tailwind 啟動時才讀 tokens）。

### 深色模式
全域以淺色為主；需要深色時用 `ChptDarkModeToggle`（可把 `data-dark-mode`/`dark-mode` class 寫到 body）做局部控制，**不要假設全域 dark mode 可用**。

### 圖示
Material Symbols（`<ChptIcon>{{ 'settings' }}</ChptIcon>`）為主；FontAwesome（`<i class="fas fa-spinner fa-spin">`）僅用於既有 loading 等既成用法。兩者都在 `main.js` 全域引入。

## 資料與狀態層

- **API**：`src/api/index.js` 是 axios 實例（`VITE_API_BASE_URL`、request 攔截器帶 token 並記 `config.metadata.startTime`、response 攔截器處理 401）。新 API 加在 `src/api/services.js`，依領域分物件匯出。
- **狀態**：Pinia，新 store 放 `src/stores/xxx.js` 並在 `src/stores/index.js` 補 export。
- **認證**：`composables/useAuth.js` + `useRouteGuard.js`；token 存 localStorage。
- **Toast**：`import { useToast } from '@/components/library'`；需在 App 根層掛 `<ChptToast />` 一次才看得到。
- **Modal 疊層/最小化**：`composables/useModalManager.ts` 管 z-index 與最小化列表，搭配 `<ChptModalDock />`。新 modal 用 `generateModalId()` 取 id。
- **WebSocket**：`composables/useWebSocket.js`（另有 `start-websocket-server.bat`、`ws` 依賴）。

環境變數只認 `VITE_` 前綴，見 `.env.development` / `.env.production`。

## 需要更多細節時讀這些

| 檔案 | 什麼時候讀 |
|---|---|
| `references/component-inventory.md` | 要知道「有哪些組件、props/emits/slots 是什麼、哪些是別名」——動手寫任何 template 前先查 |
| `references/chart-patterns.md` | 新增或修改 D3 圖表組件（layers 結構、brush、autoResize、tooltip slot、facet） |
| `references/architecture.md` | API / store / 認證 / 路由守衛 / 部署（Docker、GitHub Actions）/ 設計令牌 |
| `assets/ChptComponent.template.vue` | 新增 TS 原子組件的起手式 |
| `assets/DocPage.template.vue` | 新增文檔頁的起手式 |
| `../docs/DESIGN_SYSTEM.md` | 設計令牌用法（Tailwind class / CSS 變數 / D3 色階） |

## 常見地雷

- 加了組件卻沒加該群別 `index.js`（及必要的 `library/index.js`）export → 別人 `import { X } from '@/components/library'` 是 undefined。
- 加了文檔路由卻沒加 `navSections` → 側邊欄看不到；有 anchors 卻沒在頁面放 `<section :id>` → 子項點了沒反應。
- 動態組 Tailwind class → build 後樣式消失。
- 改到 `CommonTable.vue` / `ExcelEditor.vue` 等 4 行別名檔 → 白改，實體在 `ChptTable.vue` / `ChptExcelEditor.vue`。
- 在 template 文字/`<pre>` 直接寫 `<ChptXxx>` 或裸 `<某>` → parse error（用 `ChptCodeBlock :code="字串"` 與 `{某}`）。
- 硬寫色碼（`#2563EB` 之外的六碼）或重啟 dev server 前改 token → 顏色不同步。
- 大型組件（`ChptExcelEditor.vue`、`DualAxisComboChart.vue`、`EnterpriseHeatmap.vue`、`EnterprisePareto.vue` 等逾千行）請用局部 str_replace，不要整檔重寫。
