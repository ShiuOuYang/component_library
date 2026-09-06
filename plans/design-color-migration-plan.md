# 設計色替換專案 — 權威進度與執行計畫（Chpt 元件）

> 本文件是唯一狀態依據。所有「已完成/未完成」一律**以實際磁碟內容為準**，
> 不採信先前任何手寫清單。每個檔案處理前 `read_file` 驗證、處理後 `search_files` 驗證。

---

## 1. 目標與範圍

- 目標：將 [`src/components/common`](src/components/common) 下**所有 `Chpt*` 元件**改用一致設計色（primary / secondary / success / warning / danger / info / neutral）。
- 範圍：**A — 僅 `Chpt*` 元件**（含重新核對先前標示「已完成」者）。
- 排除（本次不處理）：非 Chpt common 元件、[`GlobalNotifications.vue`](src/components/GlobalNotifications.vue)、[`src/views/Login.vue`](src/views/Login.vue)、`src/views/docs/*`、whiteboard / D3Learning 等。
- 唯一來源：設計系統（[`src/design/tokens.js`](src/design/tokens.js) → [`tailwind.config.js`](tailwind.config.js)）。可用 Tailwind class：`primary-*`、`secondary-*`、`success-*`、`warning-*`、`danger-*`、`info-*`、`neutral-*`（Tailwind 內建），另含 `content/surface/stroke` 別名（本專案少用，不強制導入）。

---

## 2. 已確認決策（使用者確認）

1. **以磁碟為準**：先前標示「已完成」的元件須逐一重新核對並補齊，不信任舊清單。
2. **範圍 A**：只處理 `Chpt*`。
3. **擴充對應規則照收**（見 §3），但例外：
   - [`ChptCodeBlock.vue`](src/components/common/ChptCodeBlock.vue) 與 [`ChptExcelEditor.vue`](src/components/common/ChptExcelEditor.vue) / [`ChptExcelExporter.vue`](src/components/common/ChptExcelExporter.vue) / [`ChptExcelUploader.vue`](src/components/common/ChptExcelUploader.vue)：**深色程式碼底、Excel 情境綠（綠=Excel/終端）與函式提示藍等情境色保留原樣**，僅轉灰階 `gray-* → neutral-*`。
4. **variant key 對應同名 token**（新增假設，待確認）：元件內「色系 variant map」的 key（`primary/secondary/success/danger/warning/info/dark/light`）對應同名 token；key 命名為色名的獨立 `gray-*` class 才走 `neutral-*`。
   - 視覺變化提醒：`secondary` variant 由「灰」改為「深青 secondary token」；`dark/light` 對應 `neutral-800~900 / neutral-50~200`。

---

## 3. 對應規則（替換基準）

### 3.1 色碼 token 對應（不區分前綴，同階替換）

所有 utility 前綴（`text-` / `bg-` / `border-` / `ring-` / `focus:*` / `hover:*` / `active:*` / `from-` / `to-` / `via-` / `divide-` / `fill-` / `stroke-`）**保留前綴、只換色名+階數**：

| 舊色 | 新色 | 視覺 |
|---|---|---|
| `blue-*` | `primary-*` | 品牌轉換（藍→品牌綠，**最大變化**） |
| `green-*` | `success-*` | 像素相同，零風險 |
| `red-*` | `danger-*` | 像素相同 |
| `yellow-*` | `warning-*` | 像素相同 |
| `sky-*` | `info-*` | 像素相同 |
| `cyan-*` | `info-*` | 小幅色偏（cyan→sky），可接受 |
| `gray-*` | `neutral-*` | 極小幅色偏（intended） |
| `slate-*` | `neutral-*` | 冷灰→中性灰 |
| `indigo-*` | `primary-*` | 藍紫→品牌綠（搭配 blue 同組情境） |
| `amber-*` | `warning-*` | 暖黃→黃 |

階數一律**同階對應**（`blue-600 → primary-600`、`gray-100 → neutral-100`…）。

### 3.2 variant key 對應（出現於 `Record<...>` map / theme 字串）

| variant key | 舊 class | 新 class |
|---|---|---|
| `primary` | `blue-*` | `primary-*` |
| `secondary` | `gray-500/600/700`（solid/outline） | `secondary-*` |
| `success` | `green-*` | `success-*` |
| `danger` / `error` / `red` | `red-*` | `danger-*` |
| `warning` | `yellow-*`（或 `amber-*`） | `warning-*` |
| `info` | `sky-*` / `cyan-*` | `info-*` |
| `dark` | `gray-700/800/900` / `slate-800` | `neutral-700/800/900` |
| `light` | `gray-50/100` | `neutral-50/100` |

> `ChptExcel*` / `ChptCodeBlock` 內即使出現上述 key，依 §2-3 例外**不轉情境色**。

### 3.3 動態 class 注意

- [`ChptIcon.vue`](src/components/common/ChptIcon.vue:58) 用 `` `text-${props.color}` `` 組 class，**預設 `color: 'gray-500'` → `'neutral-500'`**。
- 呼叫端若傳字串色名（如 [`ChptTabs.vue`](src/components/common/ChptTabs.vue:22) `color="blue-600"`、`ChptToast` `color="gray-400"`、`ChptCheckbox` `color="red-400"`、`ChptCard` `color="gray-500"`）一律依 §3.1 改字串內容。
- 動態組 class（`bg-${props.bgColor}` 等）Tailwind JIT 需能在原始碼看到完整 class 字串才產出；此為**既有行為**，本次只換色名字串，不另做 safelist（除非驗證發現缺樣式）。

---

## 4. 實際磁碟現況盤點（grep + read 交叉驗證）

### 4.1 乾淨、不需改
| 檔案 | 備註 |
|---|---|
| [`ChptInput.vue`](src/components/common/ChptInput.vue) | 對照基準 |
| [`ChptSteps.vue`](src/components/common/ChptSteps.vue) | 已確認 |
| [`ChptTextarea.vue`](src/components/common/ChptTextarea.vue) | 重建正確；僅 `</template>` 縮排（第 38 行）可順手修 |
| [`ChptPopconfirm.vue`](src/components/common/ChptPopconfirm.vue) | 已修 |

### 4.2 需轉換（含「先前標示已完成」者 — 實際仍含舊色）
| 批次 | 檔案 | 主要舊色 / 特殊點 |
|---|---|---|
| B1 原子控制項 | [`ChptButton.vue`](src/components/common/ChptButton.vue) | `colorClass` map 全舊色（badge 已轉）；**注意空行雜訊** |
| B1 | [`ChptAlert.vue`](src/components/common/ChptAlert.vue) | `map`：success/info/warning/danger 全舊 |
| B1 | [`ChptBadge.vue`](src/components/common/ChptBadge.vue) | `map`：primary→blue、success→green… |
| B1 | [`ChptTag.vue`](src/components/common/ChptTag.vue) | `solidMap` 全舊 |
| B1 | [`ChptRadio.vue`](src/components/common/ChptRadio.vue) | theme map（含 `cyan-500`→info）、`labelColor` 預設 |
| B1 | [`ChptSwitch.vue`](src/components/common/ChptSwitch.vue) | `onColorMap` 全舊（含 `cyan-500`） |
| B1 | [`ChptCheckbox.vue`](src/components/common/ChptCheckbox.vue) | `color="red-400"`、`text-red-400`、`text-gray-500`、動態 `bgColor` 預設 |
| B1 | [`ChptSelect.vue`](src/components/common/ChptSelect.vue) | label 已轉，select 主體仍舊（`border-red-400`、`focus:border-blue-500`、`text-red-500`…） |
| B1 | [`ChptIcon.vue`](src/components/common/ChptIcon.vue) | 僅預設 `color:'gray-500'` |
| B2 中性灰收尾 | [`ChptAvatar.vue`](src/components/common/ChptAvatar.vue) | `text-gray-700` |
| B2 | [`ChptProgress.vue`](src/components/common/ChptProgress.vue) | label `text-gray-600`、track 預設 `bg-gray-100` |
| B2 | [`ChptSpinner.vue`](src/components/common/ChptSpinner.vue) | `text-gray-500` |
| B2 | [`ChptToast.vue`](src/components/common/ChptToast.vue) | icon `color="gray-400"`、`hover:text-gray-600` |
| B2 | [`ChptSkeleton.vue`](src/components/common/ChptSkeleton.vue) | 預設 `color:'bg-gray-200'` |
| B2 | [`ChptDivider.vue`](src/components/common/ChptDivider.vue) | `text-gray-400` |
| B2 | [`ChptEmpty.vue`](src/components/common/ChptEmpty.vue) | `text-gray-500/400` |
| B3 容器/表面 | [`ChptCard.vue`](src/components/common/ChptCard.vue) | border-gray、icon `gray-500`、footer `bg-gray-50` |
| B3 | [`ChptCollapse.vue`](src/components/common/ChptCollapse.vue) | divide/border/hover-gray |
| B3 | [`ChptDrawer.vue`](src/components/common/ChptDrawer.vue) | border-gray、`text-gray-800`、placement map |
| B3 | [`ChptModal.vue`](src/components/common/ChptModal.vue) | 含 `slate-*`、`amber-*`、`red-50`；**預設 header 漸層 `from-blue-50 to-indigo-50`**、`borderClass`/`footerBgColor` |
| B3 | [`ChptModalDock.vue`](src/components/common/ChptModalDock.vue) | blue-50/500/600、red-50/500、gray |
| B4 導覽/主題 | [`ChptTabs.vue`](src/components/common/ChptTabs.vue) | 已知清單（見 §4.3） |
| B4 | [`ChptBreadcrumb.vue`](src/components/common/ChptBreadcrumb.vue) | `text-gray-800`、`hover:text-blue-600` |
| B4 | [`ChptTabNavigation.vue`](src/components/common/ChptTabNavigation.vue) | `slate-*` |
| B4 | [`ChptPageSwitcher.vue`](src/components/common/ChptPageSwitcher.vue) | `indigo-*` 啟用色、gray |
| B4 | [`ChptDarkModeToggle.vue`](src/components/common/ChptDarkModeToggle.vue) | gray-50~700 色票區塊 |
| B4 | [`ChptHeaderLogoutButton.vue`](src/components/common/ChptHeaderLogoutButton.vue) | variantClasses（red/gray/blue→danger/neutral/primary） |
| B5 浮層 | [`ChptTooltip.vue`](src/components/common/ChptTooltip.vue) | themes：slate/blue/amber/red → neutral/info/warning/danger |
| B6 資料/表格 | [`ChptTable.vue`](src/components/common/ChptTable.vue) | 搜尋框 `focus:border-blue-500`、sort `blue-*`、header gradient、`evenRowBgColor:'rgb(249 250 251)'`（可留或改）、bottom 分頁 |
| B6 | [`ChptFixedTable.vue`](src/components/common/ChptFixedTable.vue) | fixed 欄 `blue-*`、搜尋 `blue-*`、gray |
| B6 | [`ChptPagination.vue`](src/components/common/ChptPagination.vue) | `bg-blue-600` 現頁、`focus:ring-blue-600`、hover blue、gray |
| B6 | [`ChptFilter.vue`](src/components/common/ChptFilter.vue) | select/多選大量 blue、`text-red-600` 清除、gray |
| B6 | [`ChptFilterBar.vue`](src/components/common/ChptFilterBar.vue) | select `blue-*`、計數 `text-blue-600` |
| B6 | [`ChptDatePicker.vue`](src/components/common/ChptDatePicker.vue) | label `text-gray-600`、`text-red-500` 錯誤 |
| B7 例外 | [`ChptCodeBlock.vue`](src/components/common/ChptCodeBlock.vue) | **只轉 gray→neutral**；保留深底/終端綠/提示色 |
| B7 | [`ChptExcelEditor.vue`](src/components/common/ChptExcelEditor.vue) | **只轉 gray→neutral**（含 scoped `@apply` 灰階）；保留 Excel 綠、函式提示藍 |
| B7 | [`ChptExcelExporter.vue`](src/components/common/ChptExcelExporter.vue) | **只轉 gray→neutral**；保留 Excel 綠 |
| B7 | [`ChptExcelUploader.vue`](src/components/common/ChptExcelUploader.vue) | **只轉 gray→neutral**；保留 variant 色 |

### 4.3 ChptTabs 已知舊色（範例明細）
| 舊 | 新 |
|---|---|
| `border-gray-200`（[`ChptTabs.vue`](src/components/common/ChptTabs.vue:5)） | `border-neutral-200` |
| `text-blue-600`（active） | `text-primary-600` |
| `text-gray-500 hover:text-gray-700` | `text-neutral-500 hover:text-neutral-700` |
| `color="blue-600"` / `"gray-500"` | `color="primary-600"` / `"neutral-500"` |
| `bg-blue-600`（indicator） | `bg-primary-600` |

---

## 5. 執行守則（對應本工作區工具）

1. **一次只改一個檔案**，改完立即驗證再進行下一個。**嚴禁並行多檔編輯**（先前曾造成檔案互相污染）。
2. 每檔流程：`read_file` 讀現況 → `apply_diff`（精準多段替換，優選）→ `search_files` 以舊色 regex 驗證「該檔無殘留」（例外檔只查 gray）。
3. 若檔案有明顯污染/殘缺（大量空行、內容錯置），用 `write_to_file` **整檔重寫**（如先前 ChptTextarea 案例），勿用碎裂的局部編輯。
4. 驗證舊色 regex（對非例外檔）：
   `(text|bg|border|ring|fill|stroke|from|to|via|divide)-(blue|green|red|yellow|gray|sky|cyan|slate|indigo|amber)-\d{2,3}`
5. 替換時注意「variant key map」與「動態 class 字串」兩種形式都要顧到。
6. 例外檔（B7）只替換 `gray-\d{2,3} → neutral-\d{2,3}`（含 `gray-950` → `neutral-950` 如有），驗證 regex 只查 gray。

---

## 6. 執行批次（Todo 對應）

- [x] **B0 基線**：建立本計畫檔即為狀態依據（`npm run dev` 由使用者於終端驗證）。
- [x] **B1 原子控制項**：ChptButton / ChptAlert / ChptBadge / ChptTag / ChptRadio / ChptSwitch / ChptCheckbox / ChptSelect / ChptIcon（重新核對 + 補齊完成）
- [x] **B2 中性灰收尾**：ChptAvatar / ChptProgress / ChptSpinner / ChptToast / ChptSkeleton / ChptDivider / ChptEmpty
- [x] **B3 容器/表面**：ChptCard / ChptCollapse / ChptDrawer / ChptModal / ChptModalDock
- [x] **B4 導覽/頁籤/主題**：ChptTabs / ChptBreadcrumb / ChptTabNavigation / ChptPageSwitcher / ChptDarkModeToggle / ChptHeaderLogoutButton
- [x] **B5 浮層**：ChptTooltip
- [x] **B6 資料/表格/分頁/篩選**：ChptTable / ChptFixedTable / ChptPagination / ChptFilter / ChptFilterBar / ChptDatePicker
- [x] **B7 例外（只轉灰階）**：ChptCodeBlock / ChptExcelEditor / ChptExcelExporter / ChptExcelUploader
- [x] **順手修正**：ChptTextarea `</template>` 縮排（[`ChptTextarea.vue`](src/components/common/ChptTextarea.vue:38)）
- [x] **收尾掃描**：`gray-*` 全域 0 殘留；舊色僅存於 B7 例外檔之保留情境色（見 §8）；`npm run dev` 由使用者執行確認
- [x] **更新本計畫檔**勾選完成、記錄遺留（非 Chpt / Login / docs）供後續排程

---

## 7. 執行後遺留（本次不處理，另開）
非 Chpt common（FilterBar / FilterDropdown / FilterSelect / TagFilterDropdown / CommonTooltip / DraggableModal / DualAxisComboChart / CodeBlock / CommonTable / Pagination / PaginationControls / ParetoChart / GerberViewer / PcbLayout / Enterprise* / HeaderLogoutButton / ModalDock / TabNavigation / Excel* / JxDatePicker 等）、[`GlobalNotifications.vue`](src/components/GlobalNotifications.vue)、[`src/views/Login.vue`](src/views/Login.vue)、`src/views/docs/*`。

## 8. 執行結果註記（2026-09-06 批次完成）

1. **掃描結果**：
   - `(…)-(gray)-N` → **0 殘留**（含例外檔灰階已全轉 `neutral`）。
   - 非例外檔舊色 → **0 殘留**。
   - 舊色僅剩 B7 例外檔「保留情境色」：ChptExcel*（Excel 綠 / 函式提示藍 / Exporter variant green/blue/indigo）、ChptCodeBlock（neutral-900 深底、終端綠、tip 色）——依決策保留。
2. **先前「已完成」表不可靠**：B1 的 Button/Alert/Badge/Tag/Radio/Switch/Checkbox/Select/Icon 與 B2 的 Avatar/Progress/Spinner/Toast/Skeleton/Divider/Empty 均依磁碟補齊。`ChptAvatar.vue` 內容實為 Popconfirm（既有命名汙染，未改結構，僅轉色）。
3. **既有（與本次無關）型別錯誤**（ts-plugin，不阻斷 Vite 編譯）：ChptRadio `modelValue:null`、ChptEmpty `iconSize`、ChptSpinner `size`、ChptSelect/ChptFilter `Record` 轉型、ChptTabs `disabledTab/panel`、ChptToast aria、ChptDarkModeToggle `aria-pressed`、ChptFixedTable 尾部型別——建議另開工作修。
4. **待辦**：使用者執行 `npm run dev` 驗證編譯；遺留（非 Chpt / Login / docs）見本節 §7。
