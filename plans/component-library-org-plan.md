# 組件庫編排重構計畫（Phase 1 + Phase 2）

> 目標：解決 [`src/components/common`](src/components/common)「單一資料夾塞入 UI/圖表/檢視器/Excel」的編排問題，
> 並同步做 content↔filename 稽核（Phase 1）與分群搬移 + re-export 相容（Phase 2）。
> 以 alias `@/* → src/*`（見 [`tsconfig.json`](tsconfig.json:21)）作為跨群 import 的統一方式。

---

## 1. 現況事實（2026-09-06 盤點）

- [`src/components`](src/components) 頂層：`common/`、`docs/`、`whiteboard/`、`D3Learning/` + 散檔 `GlobalNotifications.vue`、`SchematicViewer.vue`。
- [`src/components/common`](src/components/common)：約 80 個檔，結構為
  - **41 canonical `Chpt*`**（主題化、本次色碼已全部轉 token）
  - **8 個「相容 alias stub」**（僅 `export { default } from './ChptX.vue'`）：`CommonTable`、`ExcelEditor`、`ExcelExporter`、`ExcelUploader`、`HeaderLogoutButton`、`ModalDock`、`PageSwitcher`、`TabNavigation`
  - **實作型 legacy UI**：`CodeBlock`、`CommonTooltip`、`DraggableModal`、`Pagination`、`PaginationControls`、`SimpleDarkModeToggle`、`FilterBar`、`FilterDropdown`、`FilterSelect`、`TagFilterDropdown`
  - **圖表**：`DualAxisComboChart`、`EnterpriseHeatmap`、`EnterprisePareto`、`ParetoChart`、`FacetedChart`、`GridFacetChart`(+`.example`)
  - **領域檢視器**：`GerberViewer`、`PcbLayout`
  - **Excel 領域**：`ChptExcelEditor`、`ChptExcelExporter`、`ChptExcelUploader`（+ alias）
  - **共用**：`useToast.ts`、`types/ui.types.ts`
- 唯一對外入口：`common/index.js`（barrel，全部 export 皆有對應檔，無壞連結）。
- 已知內容錯置：[`ChptAvatar.vue`](src/components/common/ChptAvatar.vue:1) 內容是 Popconfirm（與 `ChptPopconfirm.vue` 重複）→ 需處置。

---

## 2. 決策（使用者確認）

1. Phase 1 + Phase 2 都做：先出詳細移檔計畫再執行。
2. 分群採「正交通域分離」：**UI（表單/資料/浮層）** 留一組、另外抽離 **charts / viewer / excel**。
3. 相容性：保留 `@/components/common` barrel（改為**轉發 facade**）→ 原本用 barrel 的消費端**零修改**。
4. legacy 檔不刪除（仍有 docs 使用），僅加 `@deprecated` JSDoc + 註明對應 canonical（Phase 3 才刪）。
5. 新正式入口 `@/components/library` 匯出 canonical 公開 API（長期目標）；`@/components/common` 過渡期保相容。

---

## 3. 目標架構

```
src/components/library/                ← 新增正式組件庫
  ui/             通用 UI（canonical + 需共置的 legacy）＋ alias stub
  charts/         資料視覺化圖表
  viewer/         領域檢視器（Gerber/PCB）
  excel/          Excel 領域（Chpt + alias）
  shared/         types/ui.types.ts、useToast.ts（跨群共用）
  index.js        ├ 正式公開 API（canonical + useToast）
src/components/common/
  index.js        └ 改成轉發 facade（re-export 上述群），保 @/components/common 相容
  （檔案搬走；此資料夾僅留 index.js，或搬完刪除改由 common→library alias）

說明：useToast/types 放 shared；其餘檔按下列歸組搬移。
```

### 3.1 各群成員（搬移清單）

**library/shared/**
| 來源 | 說明 |
|---|---|
| `common/types/ui.types.ts` | 移到 `shared/types/ui.types.ts` |
| `common/useToast.ts` | 移到 `shared/useToast.ts` |

**library/ui/**（canonical + 需共置 legacy + UI alias stub）
- canonical：`ChptIcon` `ChptButton` `ChptInput` `ChptTextarea` `ChptSelect` `ChptRadio` `ChptCheckbox` `ChptSwitch` `ChptDatePicker` `ChptTable` `ChptFixedTable` `ChptPagination` `ChptCodeBlock` `ChptTabNavigation` `ChptPageSwitcher` `ChptTabs` `ChptTag` `ChptAlert` `ChptSpinner` `ChptEmpty` `ChptSkeleton` `ChptProgress` `ChptBadge` `ChptAvatar`（待處置）`ChptCard` `ChptDivider` `ChptFilter` `ChptFilterBar` `ChptTooltip` `ChptToast` `ChptSteps` `ChptBreadcrumb` `ChptCollapse` `ChptDrawer` `ChptModal` `ChptPopconfirm` `ChptModalDock` `ChptDarkModeToggle` `ChptHeaderLogoutButton`
- 共置 legacy（相依或被 docs 直接使用，暫不搬離同層以免改相對路徑）：`CommonTooltip`（被 `ChptFixedTable` 用）、`PaginationControls`（被 `ChptTable` 用）、`Pagination` `CodeBlock` `DraggableModal` `SimpleDarkModeToggle` `FilterBar` `FilterDropdown` `FilterSelect` `TagFilterDropdown`
- UI alias stub（指到 ui 內 canonical）：`CommonTable`（→ChptTable）`ModalDock`（→ChptModalDock）`PageSwitcher`（→ChptPageSwitcher）`TabNavigation`（→ChptTabNavigation）`HeaderLogoutButton`（→ChptHeaderLogoutButton）

**library/charts/**：`DualAxisComboChart` `EnterpriseHeatmap` `EnterprisePareto` `ParetoChart` `FacetedChart` `GridFacetChart` `GridFacetChart.example.vue`
**library/viewer/**：`GerberViewer` `PcbLayout`
**library/excel/**：`ChptExcelEditor` `ChptExcelExporter` `ChptExcelUploader` + alias `ExcelEditor` `ExcelExporter` `ExcelUploader`

> 其餘頂層 `components/docs/`、`whiteboard/`、`D3Learning/`、`GlobalNotifications.vue`、`SchematicViewer.vue` **本次不動**（屬展示/範例/領域，另案決定）。

---

## 4. import 重寫規則（搬移後對每個被搬檔案）

1. 檔內「兄弟相對 import」一律改 alias，統一且抗搬移：
   - `from './ChptIcon.vue'` → `from '@/components/library/ui/ChptIcon.vue'`（同群也統一改，降低心智負擔）
   - `from './types/ui.types'` → `from '@/components/library/shared/types/ui.types'`
   - `from './useToast'` → `from '@/components/library/shared/useToast'`
2. 跨資料夾的既有相對 import（`../../composables/...`）→ `@/composables/...`。
3. CSS import（`@vuepic/vue-datepicker` 等）不動。
4. alias stub 檔案：`export { default } from './ChptX.vue'` → `from '@/components/library/ui/ChptX.vue'`（excel 群指向 `../excel/…`，用 alias 統一）。
5. 群內保持的例外：若某檔 import 的目標與自己同群且不想動，可保留相對（建議仍改 alias 以求一致）。

**消費端（direct-path import，須改路徑；barrel 用戶免改）**
以 `@/components/common/<File>.vue` 或 `../../components/common/<File>.vue` 直接引用的檔案：
`src/views/ChptTableGuide.vue`、`src/views/docs/DualAxisChartDoc.vue`、`CommonTableDoc.vue`、`Home.vue`、`PcbLayoutDoc.vue`、`ParetoDoc.vue`、`HeatmapDoc.vue`、`TooltipDoc.vue`、`GerberViewerDoc.vue`、`components/{FilterBar,FilterDropdown,FilterSelect,TagFilterDropdown,DraggableModal}.vue`、`src/components/docs/DualAxisChartexamples/{FacetedChartExample,GerberViewerExample}.vue` 等。
改法：`components/common/X.vue` → `components/library/{ui|charts|viewer|excel}/X.vue`（依第 3 節表）。

---

## 5. index（barrel）設計

- 新增 `library/{ui,charts,viewer,excel}/index.js`：各自匯出該群 canonical（或全部）。
- 新增 `library/index.js`：匯出正式公開 API：
  ```js
  // ui / charts / viewer / excel 的 canonical + shared
  export * from './ui/index.js'  // 或列舉
  export { useToast } from './shared/useToast'
  ```
- `common/index.js` **改為 facade**，維持現有全部匯出名（含 legacy）不變：
  把現有 `export { default as X } from './X.vue'` 改為指向新群，例如：
  `export { default as ChptButton } from '@/components/library/ui/ChptButton.vue'`
  或直接 `export * from '@/components/library/…`（注意名稱衝突需逐群列舉）。→ 保證 docs 現有 `import { … } from '@/components/common'` 零改動。
- 完成後於 barrel 與 `common/index.js` 補「命名/群別」對照註解。

---

## 6. 執行批次（依序）

### Phase 1 — 稽核與處置（已完成）
- [x] 逐檔 content↔filename 稽核：以本次色碼逐檔 read 為基礎 + 額外 spot check；確認唯一錯置為 `ChptAvatar`（內容=Popconfirm），已處置。
- [x] `ChptAvatar` 處置：使用者選 **A** → 於 `library/ui/ChptAvatar.vue` 重寫成真正的 Avatar 元件（img / 文字縮寫 / 狀態圓點，token 配色）。
- [x] 對 legacy / alias stub 加 `@deprecated` 標記：於 `library/ui/index.js`、`library/excel/index.js`、`common/index.js` 集中標註（legacy 與 alias 段），並在 `library/index.js`（正式入口）不匯出 legacy。
- [x] 整理對外入口：`common/index.js` 已改為 facade（見 Phase 2）。

### Phase 2 — 分群搬移與重寫（已完成，待使用者編譯驗證）
- [x] 建 `library/{ui,charts,viewer,excel,shared}`（shared 含 `types/`）；`common/` 僅剩 `index.js`（+空 `docs/`）。
- [x] 依 3.1 表搬移（PowerShell Move-Item）；失效 import 改 alias：`./types/ui.types`→`@/components/library/shared/types/ui.types`、`./useToast`→`@/components/library/shared/useToast`、`../../composables/...`→`@/composables/...`、excel→ui 的 `ChptModal` 跨群 alias。
- [x] 消費端 direct-path import 改指新群（`fix-consumer-imports.ps1`：更新 5 個真實 import 檔；其餘殘留為文件字串或 barrel）。
- [x] 建各群 `index.js`（ui 含 legacy/alias 段）與 `library/index.js`（正式 canonical API）。
- [x] 重寫 `common/index.js` 為 facade（`export *` 自 library 群 + `useToast`），維持全部公開名（barrel 用戶零改動）。
- [x] 驗證掃描歸零：`components/common/<檔>.vue|ts` 全 src = 0；`library/` 內 `components/common/`、`../`、`./types/ui.types`、`./useToast` = 0。
- [ ] 使用者執行 `npm run dev` 驗證編譯 + 抽查 docs 頁渲染（**待辦**）。

### Phase 3（本次不做，留待）
- [ ] docs 全部改用 canonical；移除實作型 legacy 與 alias stub；刪 `@/components/common` facade（若外部無引用）；處置 `components/docs`、`whiteboard/`、`D3Learning/`、`SchematicViewer` 歸位。

---

## 7. 風險與防呆

- 搬移是「同一 commit 內」；因 `@/*` alias 可用，改路徑不需擔心相對層數。
- 不並行多檔編輯（沿用色碼任務教訓）；每檔搬移後即用 `search_files` 驗證該檔舊相對路徑清零。
- docs 頁較多，最後以 `npm run dev` 與逐頁抽查收斂；barrel 用戶應「零改動」作為回歸判準。

---

## 8. 執行結果註記（2026-09-06）

1. **已完成**：分群搬移、失效 import 改 alias、各群/根 index、`common/index.js` facade、消費端 direct-path 更新、`ChptAvatar` 重寫為真 Avatar、deprecated 集中標註、掃描歸零。
2. **注意（編譯前）**：VSCode 語言伺服器可能仍顯示針對「已搬移的 `src/components/common/Chpt*.vue`」的殘留錯誤——那是舊路徑的暫存診斷，**請 Reload Window（或重啟 TS Server）**後再跑 `npm run dev`。
3. **待辦**：使用者 `npm run dev` 驗證；Phase 3（移除 legacy/alias、docs 改用 canonical、`components/docs`/`whiteboard/`/`D3Learning/`/`SchematicViewer` 歸位）另開。
