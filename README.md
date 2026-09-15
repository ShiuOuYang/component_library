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
npm run typecheck  # vue-tsc，型別必須零錯誤
npm run lint       # ESLint，errors 必須為 0
npm run format     # Prettier 排版
npm run verify     # typecheck → lint → build，CI 跑的就是這串
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
  viewer/index.js    領域檢視器（Gerber / PCB）
  excel/index.js     Excel 編輯/匯出/匯入
  shared/            types/ui.types.ts、useToast.ts（跨群共用）
  index.js           正式公開 API（canonical 元件 + useToast）

src/components/common/index.js   相容 facade（@deprecated）
                                 保留舊匯出名，供既有程式碼/舊文件零改動遷移
src/design/          設計系統（tokens.js 唯一手動來源 → tokensPlugin / Tailwind）
src/styles/          全域樣式（base / components / index）
src/views/docs/      組件文檔站（/docs 子頁）
```

**遷移指引**：舊程式若使用 `@/components/common` 仍可運作（facade）；
新程式請改用 `@/components/library`。legacy／alias stub（CommonTable、ExcelEditor、ModalDock、
FilterBar/FilterDropdown/FilterSelect/TagFilterDropdown、CommonTooltip、DraggableModal 等）
已標 `@deprecated`，建議改用對應 canonical `Chpt*`。

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
