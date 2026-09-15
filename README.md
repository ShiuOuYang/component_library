# Vue 3 企業級組件庫（CHPT Theme）

一套以**設計 token 單一真實來源**驅動的 Vue 3 + TypeScript 組件庫，
涵蓋表單、資料表格、反饋、浮層、導覽、圖表（D3）、領域檢視器與 Excel 元件。

- 品牌主色：`primary` ＝ 藍（600 `#2563EB`）
- 語意色：`success`＝綠、`danger`＝紅、`warning`＝黃、`info`＝青
- 中性：`neutral`（等同 Tailwind 內建 neutral）
- 本倉庫同時是**組件庫＋展示文檔站**（`npm run dev` → `/docs`）

---

## 快速開始

```bash
npm ci             # 使用 lockfile 安裝（不要用 npm install，會改寫 lockfile）
npm run dev        # 開發 / 文件站
```

品質檢查：

```bash
npm run typecheck        # vue-tsc，型別必須零錯誤
npm run check:boundary   # 組件庫邊界檢查（見下方「組件庫邊界」）
npm run check:legacy     # legacy 相容層必須維持薄包裝
npm run check:docs       # 文件站路由不得有佔位頁或斷掉的引用
npm run test             # Vitest 單元測試
npm run test:watch       # 監看模式
npm run test:coverage    # 覆蓋率報告（含門檻檢查）
npm run lint             # ESLint，errors 必須為 0
npm run format           # Prettier 排版
npm run verify           # 以上全部 + build，CI 跑的就是這串
```

元件正式入口為 **`@/components/library`**：

```vue
<script setup>
import { ChptButton, ChptInput, ChptTable } from '@/components/library'
import { useToast } from '@/components/library/shared/useToast'
</script>

<template>
  <ChptButton color="primary" label="儲存" />
  <ChptInput v-model="name" label="名稱" />
  <ChptTable :columns="columns" :data="rows" />
</template>
```

圖表／檢視器／Excel 可依群別引入：

```ts
import { DualAxisComboChart, EnterprisePareto } from '@/components/library/charts'
import { GerberViewer, PcbLayout } from '@/components/library/viewer'
import { ChptExcelEditor } from '@/components/library/excel'
```

---

## 目錄結構

```
src/components/library/          正式組件庫入口
  ui/index.js        通用 UI（Chpt*：表單/資料/反饋/浮層/導覽）
  charts/index.js    D3 圖表（雙軸/柏拉圖/熱力/分面…）
  charts/composables/  圖表專用的 D3 composable（scales / brush / facet layout）
  viewer/index.js    領域檢視器（Gerber / PCB）
  excel/index.js     Excel 編輯/匯出/匯入
  shared/            跨群共用：types/ui.types.ts、useToast、useDarkMode、
                     useModalManager、useOptionalRouter
  index.js           正式公開 API（canonical 元件 + composables）

src/components/common/index.js   相容 facade（@deprecated）
                                 保留舊匯出名，供既有程式碼/舊文件零改動遷移
src/design/          設計系統（tokens.js 唯一手動來源 → tokensPlugin / Tailwind）
src/styles/          全域樣式（base / components / index）
src/views/docs/      組件文檔站（/docs 子頁）
```

---

## 尚未實作的元件

以下元件曾經在 router 裡掛著指向「開發中」佔位頁的路由，其中四個連側欄入口
都沒有，是只能手打 URL 才到得了的孤兒路由。已全部移除 ——
**元件真的做出來之後再把路由加回來**（`npm run check:docs` 會擋下佔位頁復活）。

| 元件 | 群別 | 備註 |
|---|---|---|
| 圓餅圖 / 環圈圖 | charts | |
| 儀表板（Gauge） | charts | |
| 甘特圖 | charts | 與 app 端的 `/gantt` 路由無關 |
| Legend 圖例 | charts | 目前各圖表各自畫圖例，尚未抽成共用元件 |

新增時請一併補上：`library/charts/` 的實作、`charts/index.js` 的匯出、
`views/docs/` 的文件頁、`router/index.js` 的路由、`DocLayout.vue` 的側欄項目。

### 不屬於組件庫的整頁應用

`SchematicViewer`、`whiteboard/*`、`GlobalNotifications` 位於
`src/components/` 而非 `src/components/library/`，它們是自帶版面的整頁應用
或 app 專屬元件，刻意**不**列入 `@/components/library` 的公開 API。
文件站保留展示頁，但不代表它們可以被當成組件庫元件引用。

---

## 無障礙（Accessibility）

### 浮層

`ChptModal` / `ChptDrawer` / `ChptPopconfirm` / `DraggableModal` 共用
`library/shared/useOverlay.ts`，統一處理四件事：

| 行為 | 說明 |
|---|---|
| Escape 只關最上層 | 全域一個監聽器 + 一個堆疊。原本每個實例各綁 `document` keydown，開三個視窗按一次 Escape 會三個一起關 |
| 焦點陷阱 | Tab / Shift+Tab 只在浮層內循環 |
| 焦點歸還 | 關閉後把焦點還給開啟前的元素 |
| 背景捲動鎖 | 以引用計數處理巢狀浮層，並補上捲軸寬度避免版面跳動 |

`mode="window"` 的多視窗與 `ChptPopconfirm` 屬於非模態（背景仍可操作），
因此只套用 Escape 堆疊，不鎖捲動也不困住焦點。

沒有 `title` 時務必給 `aria-label` —— `role="dialog"` 一定要有可及名稱，
否則螢幕閱讀器只會念「對話方塊」。

### 表單

`ChptInput` / `ChptTextarea` / `ChptSelect` 的 `errorText` 會自動以
`aria-describedby` 關聯到輸入元素，並加上 `aria-invalid` 與 `role="alert"`。
元件 id 一律由 Vue 3.5 的 `useId()` 產生（SSR 安全）。

### 資料與狀態

- `ChptTable` 可排序的表頭有 `aria-sort`，並支援 Enter / Space 鍵排序
  （原本只有 `@click`，鍵盤完全無法排序）
- `ChptProgress` 有 `role="progressbar"` 與 `aria-valuenow/min/max`
- `ChptToast` 是 live region；`danger` 用 `assertive`，其餘用 `polite`
- `ChptCollapse` 有 `aria-expanded` / `aria-controls`，內容區為 `role="region"`
- `ChptSteps` 以 `aria-current="step"` 標示目前步驟，並補上僅供輔助技術的狀態文字

### 焦點可見性

元件不得只寫 `focus:outline-none` —— 那會蓋掉 `base.css` 的全域
`:focus-visible` 外框。必須同時提供 `focus-visible:ring-*` 之類的替代樣式。

---

## 測試

```bash
npm run test            # 一次跑完
npm run test:watch      # 開發時監看
npm run test:coverage   # 覆蓋率 + 門檻檢查
```

Vitest + @vue/test-utils + jsdom。測試檔在 `tests/`：

| 目錄 | 內容 |
|---|---|
| `tests/regression/` | **每個 case 對應一個實際存在過的 bug** |
| `tests/shared/` | composables：useDarkMode / useOverlay / useToast / useModalManager / useOptionalRouter / warnDeprecated |
| `tests/ui/` | 元件與 legacy 相容層的轉發 |
| `tests/design/` | 設計令牌與 tokensPlugin 產出的 CSS 變數 |

> ⚠️ 本專案的 Vite 是 5.x，所以 Vitest 必須留在 **2.x**
> （Vitest 3+ 起 peer 要求 Vite 6+）。升 Vitest 前要先升 Vite。

### 覆蓋率現況

整體 **約 21%** —— 這個數字偏低是因為 40 多個元件還沒有測試把平均拉下來，
不是已測部分測得淺。已測的部分：

| 範圍 | 覆蓋率 |
|---|---|
| `library/shared/**`（composables） | 98% |
| `src/design/**`（設計令牌） | 93% |
| `ChptButton` / `ChptToast` | 100% |
| `ChptDrawer` | 95% |
| `ChptTable` | 76% |
| `ChptModal` | 65% |

`vitest.config.js` 的門檻設在**目前水準**而不是理想值，目的是讓覆蓋率只能往上，
而不是掛一個現在就過不了的數字讓 CI 永遠紅燈。`shared/` 與 `design/` 的門檻
另外拉高（90%），避免已經測透的部分退步。

### 為什麼優先寫回歸測試

這輪審視修掉的 bug，幾乎每一個都是「一個單元測試就能抓到」的類型，卻在
沒有任何測試的情況下存活到人工審視才被發現：

- `ChptToast` 從未渲染 `toast.content` —— 提示只有圖示和關閉鈕，沒有訊息文字
- `ChptTable` 的排序表頭沒有 `tabindex` 也沒有鍵盤事件 —— 鍵盤完全無法排序
- 每個 Modal 各自綁 `document` keydown —— 按一次 Escape 關掉所有開啟的浮層
- `ChptTabs` 的 `disabledTab` prop 根本沒宣告 —— 停用功能形同不存在
- `ChptProgress` 宣告 `update:modelValue` 卻從未 emit

`tests/regression/fixed-bugs.spec.js` 把它們全部鎖住了。

---

## 組件庫邊界

`src/components/library/` 必須能**整包複製到另一個專案**而不需要修改。
因此它只允許相依：

- npm 套件（`vue` / `d3` / `@vueuse/core` / `xlsx` …）
- library 內部（`@/components/library/…` 或相對路徑）
- `@/design`（設計令牌本身就是組件庫的一部分）

**不得**出現 `@/composables`、`@/stores`、`@/api`、`@/utils`、`@/router`、`@/views`。
`npm run check:boundary` 會擋下違規，CI 也會跑。

### 使用端要提供什麼

| 項目 | 必要性 | 說明 |
|---|---|---|
| `vue` ^3.5 | 必要 | peer dependency |
| `vue-router` ^4 | **選用** | 只有 `ChptTabNavigation` / `ChptPageSwitcher` 會用；沒有時它們退回受控模式 |
| Material Symbols CSS | 必要（用到 `ChptIcon` 時） | `import 'material-symbols/outlined.css'` |
| `<ChptToast />` | 用到 `useToast()` 時 | 需在應用根部掛一次 |
| `<ChptModalDock />` | 用到 modal 最小化時 | 需在應用根部掛一次 |
| `initDarkMode()` | 建議 | 在進入點呼叫一次，套用使用者上次選擇的主題 |

### 需要應用邏輯的元件

這類元件一律以 props / emit 注入，組件庫不直接 import 應用程式的模組：

```vue
<script setup>
import { useAuth } from '@/composables/useAuth'
const { logout } = useAuth()
</script>

<template>
  <!-- 登出流程由使用端注入，元件只負責確認 → loading → 回報 -->
  <ChptHeaderLogoutButton :on-logout="logout" @error="toast.error('登出失敗')" />

  <!-- 沒有 router 時傳 active-path + 監聽 select 即可 -->
  <ChptTabNavigation :tabs="tabs" :active-path="current" @select="current = $event.path" />
</template>
```

---

---

## Legacy 對照表

所有 legacy 元件都已收斂為**薄包裝** —— 只把 props / emits / slots 轉發給
canonical，不再有第二份實作。收斂前這些檔案合計 1830 行的重複邏輯，
現在剩 455 行的轉發層。

開發模式下使用它們會在 console 印一次 deprecation 警告；
`npm run check:legacy` 會確保它們不會又長回成獨立實作。

| legacy | canonical | 備註 |
|---|---|---|
| `CodeBlock` | `ChptCodeBlock` | props 完全相同 |
| `CommonTable` | `ChptTable` | |
| `CommonTooltip` | `ChptDataTooltip` | **改名，非重複實作**，見下方說明 |
| `DraggableModal` | `ChptModal mode="window"` | `zIndex` prop 原本就無作用 |
| `FilterBar` | `ChptFilterBar` | |
| `FilterDropdown` | `ChptFilter type="dropdown"` | |
| `FilterSelect` | `ChptFilter type="select"` | |
| `TagFilterDropdown` | `ChptFilter type="tag"` | `isUnselectAll` → `show-clear-all` |
| `HeaderLogoutButton` | `ChptHeaderLogoutButton` | |
| `ModalDock` | `ChptModalDock` | |
| `PageSwitcher` | `ChptPageSwitcher` | |
| `Pagination` | `ChptPagination variant="full"` | |
| `PaginationControls` | `ChptPagination variant="compact"` | `pageSize` → `items-per-page`、`total` → `total-items`；`totalPages` 改為自動推算 |
| `SimpleDarkModeToggle` | `ChptDarkModeToggle variant="simple"` | |
| `TabNavigation` | `ChptTabNavigation` | |

legacy 版除了重複之外還有一個共通問題：它們寫死 `gray-*` / `blue-*` 色碼，
不走設計令牌，所以改品牌色時不會跟著變。

### `ChptTooltip` 與 `ChptDataTooltip` 的分工

`CommonTooltip` 原本被列在 legacy 區，但它**不是** `ChptTooltip` 的舊版，
兩者用途不同 —— `ChptFixedTable` 正在使用它，設計令牌也把它當成正式的
z-index 層級。因此改名為 `ChptDataTooltip` 並移出 legacy 分類。

| | `ChptTooltip` | `ChptDataTooltip` |
|---|---|---|
| 觸發 | 包住 slot，hover / focus 自動顯示 | 由外部 `visible` 控制 |
| 定位 | 相對觸發元素自動計算 | 由外部給游標座標 `position` |
| 內容 | 一段文字 | 結構化的 `{ title, items[], extra }` |
| 用途 | 一般 UI 提示 | D3 圖表、資料表格的游標跟隨提示 |

---

**遷移指引**：舊程式若使用 `@/components/common` 仍可運作（facade）；
新程式請改用 `@/components/library`。

---

## 深色模式

採 **class 策略**：`useDarkMode()` 在 `<html>` 掛 `.dark`，Tailwind 的 `dark:`
與 `tokensPlugin` 注入的 `.dark` CSS 變數同時生效。

```vue
<script setup>
import { useDarkMode, ChptDarkModeToggle } from '@/components/library'

const { isDark, mode, setMode, toggle } = useDarkMode()
</script>

<template>
  <ChptDarkModeToggle variant="simple" />
</template>
```

- 使用者選擇存在 `localStorage['chpt-theme']`，可為 `light` / `dark` / `system`
- 應用進入點需呼叫一次 `initDarkMode()`（`src/main.js` 已接）
- `index.html` 有一段前置腳本在首次繪製前套用主題，避免畫面閃爍
- 元件優先使用會自動翻轉的 CSS 變數（`--color-text-*` / `--color-bg-*` /
  `--color-border-*` / `--viz-axis-*`），只有需要換色階時才寫 `dark:`

細節見 [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md#深色模式dark-mode)。

---

## 設計系統（Theme）

所有顏色／尺寸／圓角／動效皆由 **`src/design/tokens.js`** 定義，
改任何設計值只需改它，CSS 變數（`:root`）與 Tailwind utility 自動同步：

- Tailwind class：`bg-primary-500`、`text-success-600`、`border-neutral-300`…
- Scoped CSS / SVG：`var(--color-primary-500)`、`var(--viz-axis-line)`…
- D3：`import { viz, categoricalRange } from '@/design'`

| token | 用途 | 主值 |
|---|---|---|
| `primary` | 品牌／主操作（CTA、啟用、focus） | 600 = `#2563EB`（藍） |
| `secondary` | 次要色（深青，深色面板等） | 500 = `#1F4E5C` |
| `success` | 成功狀態 | 600 = `#16A34A`（綠） |
| `danger` / `warning` / `info` | 錯誤 / 警示 / 資訊 | Tailwind red/yellow/sky 系 |
| `neutral` | 文字、邊框、底色 | Tailwind 內建 neutral |

詳細規則見 [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)。

---

## 常用範例

```vue
<!-- 反饋 -->
<script setup>
import { useToast } from '@/components/library'
const toast = useToast()
</script>
<template>
  <ChptButton color="success" @click="toast.success('已儲存')">儲存</ChptButton>
</template>

<!-- 浮層（多視窗 + 口袋） -->
<template>
  <ChptModal v-model="open" mode="window" title="報表" :width="520" :height="360" />
  <ChptModalDock />
</template>
```

## 備註

- 需在 `index.html` 載入字型（Noto Sans TC / IBM Plex Mono），或改用 `@fontsource/*`。
- Tailwind 需啟用 `postcss-import`（見 `postcss.config.js`）。
- 文件站 `/docs` 各元件頁亦為最完整的「活文件」範例。
