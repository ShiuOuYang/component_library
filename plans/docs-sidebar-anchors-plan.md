# DocLayout 側欄「可展開元件子項目（錨點跳轉）」設計

> 需求：在左側 DocLayout 側欄，點「群組頁」（如「基礎表單元件」）→ **展開下方元件按鈕** →
> 點元件 → 快速跳轉到該頁對應區塊（該元件「介紹+使用方式」一體區塊）。
> 取代「頁內左欄」方案（FormAtoms 現行的左側 rail 於套用後移除/改為簡潔）。

---

## 1. 目標行為

- 側欄群組項若為「元件索引頁」（如 form-atoms / feedback / interactive …）→ 顯示展開箭頭。
- 點擊群組項行為：**切換展開**並（若尚未在該頁）導向該頁；展開後列出子元件按鈕（縮排）。
- 點子元件：確保位於該頁（否則 `router.push(item.to)`）後，`nextTick` 以 `scrollIntoView` 捲動到 `#id`。
- 目前所在頁自動展開其群組；切換到其他頁時自動收合/展開對應群組。

## 2. 資料結構（DocLayout 內 `navSections`）

每個 nav item 增加可選欄位：

```js
{
  to: '/docs/components/form-atoms',
  icon: '🧩',
  label: '基礎表單元件',
  anchors: [                       // ← 新增：該頁區塊錨點（id 需與頁面 section id 一致）
    { label: 'ChptInput',     id: 'chpt-input' },
    { label: 'ChptSelect',    id: 'chpt-select' },
    { label: 'ChptRadio',     id: 'chpt-radio' },
    { label: 'ChptSwitch',    id: 'chpt-switch' },
    { label: 'ChptDatePicker', id: 'chpt-datepicker' },
  ],
}
```

- 有 `anchors` 的項視為「可展開群組」；無則維持一般連結（如「快速開始」單頁、chart 專頁也可放 anchors）。
- 以 `route.path` 判斷「目前所在頁」，展開對應群組；其他群組收合。

## 3. 側欄渲染與互動

- 一般項：現有 `router-link`。
- 可展開項：
  - 標題列 = `router-link`（導向該頁）+ 箭頭按鈕（toggle expanded）。
  - expanded 時在下方渲染子列表：每子項為 button（或 router-link 到 `to#id`），點擊執行：
    1. 若 `route.path !== item.to` → `router.push(item.to)`；
    2. `nextTick` → `document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' })`。
  - 子項縮排 + 依 `active` 高亮（用 IntersectionObserver 或 scroll 監聽回寫 activeAnchor，選擇簡單版：僅高亮最後點擊）。
- 收合狀態（窄側欄）維持快捷圖示，不加子項。

## 4. 頁面端契約（後續逐頁補上）

- 每個元件說明頁必須：每個元件一個 `<section :id="錨點" class="scroll-mt-24">`，id 與側欄 anchors 一致。
- 內容結構固定：「使用時機 → 即時示範 → 範例 code → ApiTable(Props/Events/Slots) → 注意」。
- 已符合：FormAtoms（chpt-*）、InteractiveDocs 待補 id（現無 section id）→ 補 id。
- 尚未重建：FeedbackDocs / OverlayDocs / LayoutNavDocs / DataFilterDocs / ThemeToolsDocs / TooltipDoc / CommonTableDoc / DraggableModal / Filter* / ExcelEditorDocs / charts / viewer / Whiteboard（逐頁做並加 id）。

## 5. 實作範圍

- A. [`DocLayout.vue`](src/layouts/DocLayout.vue)：資料 schema、展開狀態、渲染子項、跳轉邏輯（約 40–60 行內改動）。
- B. `navSections`/collapsedShortcuts 資料補 `anchors`（依各群組頁的元件）。
- C. 各說明頁補 `<section id>` 並提供 `scroll-mt`；移除 FormAtoms 頁內左欄（改靠側欄），保留行動版頂部 chips 供手機快速跳（或也由側欄？DocLayout 側欄在手機仍可開，但保留 chips 亦可）。
- D. 驗證：點側欄「基礎表單元件」展開→點 ChptInput 跳至對應區塊；切換群組自動展開/收合。

## 6. 風險
- 捲動容器是 `main`（overflow-auto），用 `scrollIntoView`（最近可捲動祖先）即可，不需自己算 offset；補 `scroll-mt` 避免被 sticky header 遮。
- 側欄 item 目前是平鋪；加「可展開」不能破壞 `isActiveRoute` 高亮邏輯。
- anchors 名稱與頁面 id 必須同步維護（命名慣例：`chpt-<camel>`）。
