# 組件庫頁面（Docs）重構計畫

> 目標：讓「組件庫文檔站」（/docs）的佈局、落地頁、導覽與逐頁示範，對齊新組件庫結構
> `@/components/library/{ui,charts,viewer,excel}`，並把仍 demo legacy 的頁面改用 canonical；
> 同時把 docs 殼層/首頁/被改頁面的舊色同步 token 化，收斂到設計色。
> （屬先前 Phase 3 中「docs 改用 canonical」的落地，另納入佈局與落地頁整容。）

---

## 1. 頁面載體現況（2026-09-06）

- 路由：`/docs` 掛 `DocLayout`，子路由集中在 [`src/router/index.js`](src/router/index.js:56)（~30 項：元件/指南 + 未完成 placeholder）。
- 佈局：[`src/layouts/DocLayout.vue`](src/layouts/DocLayout.vue) — 資料驅動側欄 `navSections`（圖表/工具/開發指南），含 legacy 藍/紫/gray。
- 落地頁：[`src/views/docs/Home.vue`](src/views/docs/Home.vue) — 主打「D3.js 組件庫」，特性/卡片以圖表為主，未涵蓋 UI 群。
- 文件元件頁：
  - 頂層：`DualAxisChartDoc / ParetoDoc / HeatmapDoc / GerberViewerDoc / PcbLayoutDoc / TooltipDoc / CommonTableDoc / WhiteboardDoc / ComponentPlaceholder / Home`
  - 群組元件頁 `views/docs/components/`：`FormAtoms / FeedbackDocs / InteractiveDocs / OverlayDocs / LayoutNavDocs / DataFilterDocs / ThemeToolsDocs / ExcelEditorDocs / FilterBar / FilterDropdown / FilterSelect / TagFilterDropdown / DraggableModal`
- 已用 canonical 的群頁：FormAtoms、FeedbackDocs、InteractiveDocs、OverlayDocs、LayoutNavDocs、DataFilterDocs、ThemeToolsDocs、ExcelEditorDocs（多數）。
- 仍 demo legacy（需 canonical 化）：`CommonTableDoc`（→ ChptTable）、`TooltipDoc`（→ ChptTooltip）、`FilterBar/FilterDropdown/FilterSelect/TagFilterDropdown`（→ ChptFilter / ChptFilterBar）、`DraggableModal`（→ ChptModal + ChptModalDock）、`ExcelEditorDocs`（去掉 ExcelEditor alias 只留 ChptExcelEditor）、`DualAxis/Pareto/Heatmap/Gerber/Pcb`（charts/viewer 本體，直接改自 '@/components/library/…' 即可）。

---

## 2. 待確認決策（請使用者指定）

1. **色彩**：docs 殼層/首頁/被改頁面是否一律 token 化（移除殘留 blue/purple/orange/amber/slate/gray 舊色）？建議：是（與組件庫一致；charts 圖表內的 D3 情境色除外）。
2. **legacy 示範處理**：
   - A. 一律改成 canonical 示範（刪 legacy import/範例；建議）
   - B. canonical 為主 + 保留一節「Legacy（deprecated）」對照
3. **路由/命名**：是否調整 sidebar 分類與路由標題使其對齊 library 群別（ui / charts / viewer / excel），並把 placeholder 保留？（建議：只改分類與標題，不動路徑避免壞連結）
4. Home 落地頁定位改為「完整 Vue 3 組件庫」（表單/資料/反饋/浮層/圖表/檢視器/Excel）並更新 import 範例為 `@/components/library`。

---

## 3. 目標側欄分類（對齊 library 群）

```
📌 快速開始（首頁）
🧩 UI 組件       表單(FormAtoms) / 資料與表格(DataFilterDocs) / 反饋(FeedbackDocs)
                 / 互動(InteractiveDocs) / 浮層(OverlayDocs) / 佈局流程(LayoutNavDocs)
                 / Tooltip / 主題工具(ThemeToolsDocs) / Avatar(新增)
📊 圖表 charts   DualAxis / Pareto / Heatmap / Faceted / GridFacet(新增佔位→可先用 Placeholder)
🔬 檢視器 viewer  Gerber / PCB / Schematic
📑 Excel excel   ChptExcelEditor
🖼 展示/範例      Whiteboard（獨立領域，屬 demo）
📘 開發指南      getting-started / best-practices
```
> legacy 專屬頁（CommonTable/Tooltip/Filter*/DraggableModal）合併進對應 canonical 頁或改標題；路徑可保留轉址。

---

## 4. 逐頁行動清單

### 4.1 殼層與落地頁
- [ ] [`DocLayout.vue`](src/layouts/DocLayout.vue)：顏色 token 化（含 logo 漸層、active、scrollbar hex）；`navSections` 依 §3 重排（含 Avatar、Faceted/GridFacet、excel 分類）；收合快捷同步。
- [ ] [`docs/Home.vue`](src/views/docs/Home.vue)：改為「完整 Vue 3 組件庫」定位；特性/卡片納入 UI/資料/反饋/浮層/圖表/檢視器/Excel；import 範例更新為 `@/components/library`；顏色 token 化；移除 D3-only 文案。
- [ ] `router/index.js`（僅 docs 段）：標題/分類註解對齊；必要時新增 Avatar、Faceted/GridFacet 路由指向既有/Placeholder（不刪舊路徑，必要時加 redirect）。

### 4.2 元件群頁 canonical 化（改 import + 換示範）
- [ ] `FormAtoms / FeedbackDocs / InteractiveDocs / OverlayDocs / LayoutNavDocs / DataFilterDocs / ThemeToolsDocs / ExcelEditorDocs`：import 全部改 `@/components/library`（或群 index）；ExcelEditorDocs 移除 `ExcelEditor` alias 範例。
- [ ] `FilterBar/FilterDropdown/FilterSelect/TagFilterDropdown`（legacy 頁）→ 改為示範 `ChptFilter`（select/dropdown/tag 三型）與 `ChptFilterBar`；或以 redirect 合併至 DataFilterDocs。
- [ ] `DraggableModal` 頁 → 改示範 `ChptModal`（dialog/window 模式）+ `ChptModalDock` + `useModalManager`。
- [ ] `CommonTableDoc` → 改示範 `ChptTable` / `ChptFixedTable` / `ChptPagination`。
- [ ] `TooltipDoc` → 改示範 `ChptTooltip`。
- [ ] 新增 `FormAtoms` 或 `AvatarDoc` 小節展示新 `ChptAvatar`（可先在 Home/FormAtoms 帶入）。

### 4.3 圖表 / 檢視器頁（僅換 import 路徑與 token 化外框）
- [ ] `DualAxisChartDoc / ParetoDoc / HeatmapDoc` → import 自 `@/components/library/charts`（內容 D3 情境色不動）。
- [ ] `GerberViewerDoc / PcbLayoutDoc` → import 自 `@/components/library/viewer`。
- [ ] `TooltipDoc` 內之圖表頁(Heatmap/Pareto) 用到的 `CommonTooltip` → 可換 `ChptTooltip`（或保留為 legacy 節）。

### 4.4 其他
- [ ] 同步更新各頁「code 範例字串」中的舊 import（`@/components/common/X.vue`、legacy 名）→ `@/components/library`（字串亦改，保持一致）。
- [ ] 收尾 `search_files` 掃 views/docs 確認不再 import legacy 名稱（除刻意保留對照節）；`npm run dev` 驗證 + 逐頁抽查。

---

## 5. 執行順序（批次）

- B1 殼層與落地：DocLayout token+分組、Home 重寫（內容最多）。
- B2 legacy 專頁 canonical 化（Filter* / DraggableModal / CommonTable / Tooltip / Excel alias）。
- B3 群頁與圖表/檢視器 import 路徑更新 + 範例字串更新。
- B4 收尾掃描 + `npm run dev` 驗證（使用者終端）。

> 範圍預設：僅 `/docs` 系統（含 DocLayout/Home）；`/login`、`ChptTableGuide` 與業務示範頁不在此列（如需另案）。

---

## 6. 風險與防呆
- 不動既有路由路徑（只改顯示），避免壞連結；確需改名用 `redirect`。
- doc 頁量大，改一頁驗證一頁；先 B1 再 B2/B3。
- 色彩 token 化遵循 [`plans/design-color-migration-plan.md`](plans/design-color-migration-plan.md) §3 對應表（charts 圖表 D3 情境色除外）。
- 最後由使用者 `npm run dev` 驗證。

---

## 7. 執行結果註記（2026-09-06）

**已完成**
- B1：[`DocLayout.vue`](src/layouts/DocLayout.vue) token 化＋側欄依 library 群分組；[`Home.vue`](src/views/docs/Home.vue) 改為完整組件庫落地頁（含 Avatar/Excel/Viewer 卡片、`@/components/library` 範例）。
- B2 專頁 canonical 化（整檔重寫或改 import）：
  - `ChptTableGuide.vue`（修復 mojibake＋token＋`@/components/library`）
  - `docs/CommonTableDoc.vue` → ChptTable/ChptFixedTable/ChptPagination
  - `docs/TooltipDoc.vue` → ChptTooltip
  - `docs/components/DraggableModal.vue` → ChptModal/ChptModalDock（ChptModalDock）
  - `docs/components/{FilterSelect,FilterDropdown,TagFilterDropdown,FilterBar}.vue` → ChptFilter(select/dropdown/tag)/ChptFilterBar
  - `docs/components/ExcelEditorDocs.vue`：移除 ExcelEditor alias
  - `docs/components/{InteractiveDocs,OverlayDocs}.vue`：改用 `@/components/library`、`ModalDock`→`ChptModalDock`、InteractiveDocs 重寫（清 mojibake）
  - `views/Login.vue`：token 化（藍→primary、紫→secondary、紅→danger、slate/gray→neutral）

**待使用者**
1. Reload Window 後執行 `npm run dev` 驗證編譯並逐頁抽查（本環境無終端）。
2. 少數 doc 群頁仍 `from '@/components/common'`（facade 可用，僅 deprecated）；chart 文件頁因與 CommonTooltip 圖表整合深，暫保留（符合 charts D3 情境色除外）。
3. `router/index.js` 的 meta.title 仍為舊名（CommonTable/Filter*/DraggableModal 等），僅顯示文字，可下波再對齊。
4. 先前 `fix-consumer-imports.ps1` 以 PowerShell `Set-Content` 重寫的少數檔案（`PcbLayoutDoc.vue`、兩個 DualAxisChartexamples）中文可能被重新編碼；下波需以「UTF-8 讀→UTF-8 寫」重存或整檔重寫校驗。
