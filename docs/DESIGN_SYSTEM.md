# 設計系統

本元件庫的顏色、間距、動效等所有設計值，統一由 `src/design/tokens.js` 定義。

> **品牌色（2026-09-06）**：`primary`＝藍（600 `#2563EB`）；語意 `success`＝綠
> （`#16A34A`）、`danger`＝紅、`warning`＝黃、`info`＝青；`neutral` 沿用 Tailwind 內建。
> 改品牌色只需調整 `tokens.js` 的 `colors.primary`，所有 `primary-*` 元件／CSS 變數自動同步。

## 架構

```
src/design/tokens.js        ← 唯一手動維護的檔案
        │
        ├─→ tokensPlugin.js ─→ 注入 :root { --color-* } → scoped CSS / D3 用
        └─→ tailwind.config.js theme  → bg-primary-600 等 utility class 用
```

改任何設計值 **只改 `tokens.js`**，CSS 變數與 Tailwind class 會自動同步。

## 檔案清單

| 檔案 | 用途 |
|---|---|
| `src/design/tokens.js` | 設計令牌定義（唯一真實來源） |
| `src/design/tokensPlugin.js` | 把 tokens 轉成 CSS 變數注入 `:root` |
| `src/design/index.js` | 對外入口 + D3 色階輔助函式 |
| `src/styles/index.css` | 樣式進入點（在 `main.js` 引入） |
| `src/styles/base.css` | 全域 reset / 捲軸 / 連結 / focus |
| `src/styles/components.css` | `.card` `.panel` 等全域 class（過渡期） |
| `tailwind.config.js` | Tailwind theme |
| `postcss.config.js` | 需含 `postcss-import` |
| `src/styles/_app-shell.css.example` | **不屬於元件庫**，請搬到應用專案 |

## 組件目錄與匯入（2026-09-06 重整）

元件已分群搬到 **`@/components/library`**，正式入口依群別：

```
@/components/library
  ui/       通用 UI（Chpt*：表單/資料/反饋/浮層/導覽）   → ui/index.js
  charts/   D3 圖表（雙軸/柏拉圖/熱力/分面）              → charts/index.js
  viewer/   領域檢視器（Gerber / PCB）                    → viewer/index.js
  excel/    Excel 編輯/匯出/匯入                          → excel/index.js
  shared/   types/ui.types.ts、useToast.ts（跨群共用）
  index.js  正式公開 API
```

- 新程式一律由 `@/components/library` 匯入（`ChptButton`、`ChptTable`、
  `DualAxisComboChart`、`GerberViewer`、`ChptExcelEditor`…）。
- `@/components/common` 保留為**相容 facade（@deprecated）**：舊匯出名不變，
  供既有程式碼／舊文件零改動遷移；legacy／alias stub（CommonTable、ExcelEditor、
  ModalDock、FilterBar/FilterDropdown/FilterSelect/TagFilterDropdown、CommonTooltip、
  DraggableModal 等）建議改用對應 canonical `Chpt*`。

## 安裝

```bash
npm i -D postcss-import
```

`src/main.js`：

```js
import '@/styles/index.css'
```

`index.html` 加上字型（目前 repo 缺這段，`Noto Sans TC` 與 `IBM Plex Mono` 實際上都沒載到）：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

> 內網或離線環境改用 `npm i @fontsource/noto-sans-tc @fontsource/ibm-plex-mono`，在 `main.js` import 對應的 CSS。

## 三種用法

**1. Template — 用 Tailwind class**

```html
<div class="bg-surface-primary border border-stroke-light rounded-xl shadow-primary">
  <span class="text-content-secondary text-sm">良率</span>
</div>
```

**2. Scoped CSS / `:deep()` SVG — 用 CSS 變數**

```css
:deep(.x-axis) text {
  font-size: var(--font-size-xs);
  fill: var(--viz-axis-text);
}
:deep(.x-axis) path {
  stroke: var(--viz-axis-line);
}
```

**3. D3 — 從 `@/design` import 真實色碼**

```js
import * as d3 from 'd3'
import { viz, duration, categoricalRange, sequentialRange } from '@/design'

// 類別色
const colorScale = d3.scaleOrdinal()
  .domain(categories)
  .range(categoricalRange(categories))

// 連續色階（heatmap）
const [from, to] = sequentialRange('primary')
const heatScale = d3.scaleSequential(d3.interpolateRgb(from, to)).domain(valueDomain)

// 動畫時長必須是 Number
selection.transition().duration(duration.chartUpdate)

// 缺失值
.attr('fill', d => d.value == null ? viz.missing : colorScale(d.value))
```

## 重要規則

- **不要**在元件裡硬寫色碼（`#6b7280`、`#d1d5db`）。軸線、格線、文字色一律走 `viz.axis.*`。
- **不要**在 Tailwind config 重複宣告與預設值相同的東西（`neutral`、`emerald`、`green`、`borderRadius`）。
- **不要**用 `@layer utilities` 定義與 Tailwind 內建同名的 class。
- SVG 元素不能用 Tailwind class（JIT 掃不到動態產生的元素），一律寫在 `<style scoped>` 搭配 `:deep()`。
- **按鈕與輸入框的高度不要用 `py-*` 撐**，一律用 `h-control-*`（見下節）。
- **每個 `<button>` 都要明確寫 `type`**。HTML 的預設值是 `type="submit"`，
  使用端把元件放進 `<form>` 時點下去會誤觸表單送出、整頁重新載入。
  由 `npm run check:buttons` 在 CI 擋住（用 Vue 的 template compiler 檢查，不是正規式）。
- **純圖示按鈕要做成正方形**：`h-control-xs min-w-control-xs`。
  WCAG 2.5.8 的 24×24 是兩個方向都要算，只給高度的話 `h-control-xs px-1` 還是只有 24×18。
- **元件裡不要寫死淺色**（`bg-white`、`text-neutral-700`）。一律用主題化角色，
  否則深色模式下那一塊不會跟著翻轉。由 `npm run check:theme` 在 CI 擋住。
- **不要用 `display: none`(`class="hidden"`) 藏可聚焦元素**（例如 file input）。
  `display: none` 的元素不在可聚焦序列裡，鍵盤使用者完全無法操作（WCAG 2.1.1）。
  要視覺上隱藏但保留可聚焦性請用 `sr-only`。

## 控制項高度（按鈕 / 輸入框 / 下拉）

所有可點擊控制項共用一組高度，定義在 `src/design/tokens.js` 的 `control`：

| 尺寸 | 高度 | 左右內距 | 字級 | 用途 |
|---|---|---|---|---|
| `xs` | 24px | 8px | `text-xs` | 密集表格內的行內操作 |
| `sm` | 32px | 12px | `text-sm` | 工具列預設 |
| `md` | 40px | 16px | `text-base` | 表單與對話框預設 |
| `lg` | 48px | 24px | `text-lg` | 主要行動鈕 |
| `xl` | 56px | 20px | `text-xl` | 僅輸入類控制項 |

每階差 8px，全部 ≥ 24px（WCAG 2.5.8 最小點擊目標）。

**寫法**：

```html
<!-- ✅ 高度用 h-control-*，文字靠 flex 置中 -->
<button class="inline-flex items-center h-control-sm px-3 text-sm rounded-md">
  匯出
</button>

<!-- ❌ 不要用 py-* 自己算高度：全庫曾因此長出 20 種不同組合，
     並排時高度差 2~8px，畫面看起來參差 -->
<button class="px-3 py-1.5 text-xs rounded-md">匯出</button>
```

手寫 CSS 時用對應的變數：`var(--control-height-sm)`、
`var(--control-padding-x-sm)`、`var(--control-font-size-sm)`。

純圖示按鈕（`×` / `‹` / `›`）要補 `min-w-control-*` 做成正方形：

```html
<!-- ✅ 24×24 -->
<button type="button" aria-label="清空" class="inline-flex items-center justify-center h-control-xs min-w-control-xs text-xs">×</button>

<!-- ❌ 24×18，寬度不足；也不要用 w-4 h-4（16×16） -->
<button type="button" aria-label="清空" class="h-control-xs px-1 text-[9px]">×</button>
```

過渡期的全域 class 也已對齊：`.btn`（= sm）、`.btn-xs` / `.btn-md` / `.btn-lg`、
`.input`（= sm）。

> 為什麼要有這組 token：原本沒有「一顆按鈕該多高」的基準，每個元件各自寫
> padding，`ChptButton` 的 `sm` 只有 24px（全庫 47 處在用），還有 8px / 10px
> 這種點不到的尺寸。沒有基準可對齊時，新寫的（含 AI 生成的）按鈕只能自己猜。

## 深色模式

`darkMode: 'class'` —— 由 `useDarkMode()` 在 `<html>` 掛 `.dark`。

### 命名規則：有數字 = 固定，無數字 = 跟主題

```html
<div class="bg-primary-600">   <!-- 永遠 #2563EB -->
<div class="text-accent">      <!-- 淺色 primary-700 / 深色 primary-400 -->
```

帶數字的色階是「我就是要這個顏色」的逃生門；主題化角色才會隨 `.dark` 翻轉。

### 角色對照

| 用途 | 角色 | 說明 |
|---|---|---|
| 文字 | `content-primary` / `-secondary` / `-tertiary` / `-disabled` | 主要到次要 |
| 實心底上的文字 | `content-on-solid` | **兩個主題都是白色**（見下方） |
| 背景 | `surface-primary` / `-secondary` / `-tertiary` / `-highlighted` | |
| 軌道 / 停用填色 | `surface-muted` | 開關軌道、步驟連接線、停用按鈕 |
| 邊框 | `stroke-light` / `-default` / `-medium` / `-focus` | `-focus` 是焦點框 |
| 品牌前景 | `accent` / `accent-strong` | 文字、邊框、icon |
| 品牌實心底 | `accent-solid` / `accent-solid-hover` | 配 `text-white` |
| 品牌淡底 | `accent-subtle` / `-subtle-hover` / `-subtle-border` / `-on-subtle` | |
| 語意色 | `success` / `warning` / `danger` / `info` + 同樣的 `-solid` / `-subtle` / `-on-subtle` | |

### 三種用途不能混用

深色模式最容易做錯的地方：

```html
<!-- ✅ 前景：深色底要往較亮的階移，所以用 accent -->
<span class="text-accent">連結</span>

<!-- ✅ 實心底：底色兩個主題都維持深色階，所以白字一直成立 -->
<button class="bg-accent-solid text-white">送出</button>

<!-- ❌ 錯：accent 在深色下是 primary-400（亮藍），白字對比只有 2.1:1 -->
<button class="bg-accent text-white">送出</button>

<!-- ✅ 淡底：配 on-subtle，不要配 -800 這種寫死的深色 -->
<div class="bg-danger-subtle text-danger-on-subtle border border-danger-subtle-border">

<!-- ❌ 錯：深色下 bg-danger-subtle 是 #7F1D1D，text-danger-800 是 #991B1B，看不見 -->
<div class="bg-danger-subtle text-danger-800">
```

### 常見對照

| 舊寫法 | 換成 |
|---|---|
| `bg-white` | `bg-surface-primary` |
| `bg-neutral-50` | `bg-surface-secondary` |
| `bg-neutral-100` | `bg-surface-tertiary` |
| `bg-neutral-300` | `bg-surface-muted` |
| `text-neutral-900` / `-800` / `-700` | `text-content-primary` |
| `text-neutral-600` | `text-content-secondary` |
| `text-neutral-500` | `text-content-tertiary` |
| `text-neutral-400` | `text-content-disabled` |
| `border-neutral-200` | `border-stroke-light` |
| `border-neutral-300` | `border-stroke-default` |
| `focus:border-primary-500` | `focus:border-stroke-focus` |
| `bg-primary-50` | `bg-accent-subtle` |
| `bg-primary-100`（hover） | `bg-accent-subtle-hover` |
| `text-primary-600` | `text-accent` |

### 可以保留原樣的

- `text-white` / `text-black` —— 實心底上的文字，實心底不隨主題變亮
- `bg-black/60` —— modal 遮罩、canvas 疊層，兩個主題都該是黑的
- 元件自己的皮膚變體 —— `<ChptTooltip theme="light">`、`<ChptTag color="dark">`
  是呼叫端指定的外觀，不是 app 主題。接上主題化角色反而會毀掉 prop 的意義

### 兩道 CI 關卡

- `npm run check:theme` —— 元件庫不得出現寫死的淺色 class
- `npm run check:contrast` —— 每個「前景 × 背景」在兩個主題都要達 WCAG AA
  （目前 58 組，最緊的是淺色警告前景 4.92:1）

新增或修改主題化角色時，對比度檢查會直接告訴你哪一組不合格。

### 坑

**`@apply` 找不到 class 會讓 build 失敗，template 裡卻不會。** 所以寫錯的
主題化 class（例如色彩 key 用了 camelCase，產出 `text-accent-onSubtle`）
在模板中只會靜靜沒有顏色。改完務必確認 build 產物真的含
`.text-accent-on-subtle{...}`，不要只看原始碼有寫。

**Tailwind 預設的 opacity 階沒有 98。** `bg-surface-primary/98` 不會產出任何
規則。可用的階是 0/5/10/20/25/30/40/50/60/70/75/80/90/95/100。

## z-index 層級（已修正衝突）

舊版 `tailwind.config.js` 與 `designTokens.js` 兩份 z-index 順序互相矛盾（前者 `dropdown(90) > tooltip(60)`，後者相反）。統一為：

| 語意 | 值 | 對應元件 |
|---|---|---|
| `sticky` | 100 | JxFixedTable 固定表頭 / 固定欄 |
| `dropdown` | 200 | FilterDropdown / TagFilterDropdown / JxSelect |
| `backdrop` | 300 | Modal 遮罩 |
| `modal` | 400 | DraggableModal |
| `popover` | 500 | — |
| `tooltip` | 600 | CommonTooltip（**必須高於 modal**） |
| `toast` | 700 | — |

用法：`class="z-modal"`、`z-index: var(--z-tooltip)`。

## 從舊寫法遷移

以下 class 已移除，請改用右欄：

| 舊 | 新 | 原因 |
|---|---|---|
| `.transition-all` | Tailwind 內建 `transition-all` | 舊版覆蓋內建，會全域改掉動畫時間 |
| `.transition-colors` | Tailwind 內建 `transition-colors` | 同上 |
| `.shadow-primary`（手寫） | `shadow-primary`（theme 產生） | 撞名重複定義 |
| `.spacing-xs / sm / md / lg` | `gap-2 / gap-4 / gap-6 / gap-8` | 純粹重造輪子 |
| `.truncate-2 / -3` | `line-clamp-2 / line-clamp-3` | Tailwind 3.3+ 已內建 |
| `.yield-low / normal / high` | 直接刪除 | 業務規則不屬於元件庫 |
| `#app { height: 100vh }` | 搬到應用專案（見 `_app-shell.css.example`） | 元件庫不該規定宿主版面 |

CSS 變數名稱**全數保持不變**，既有元件的 scoped CSS 不需修改。新增的變數：

- `--viz-axis-line` / `--viz-axis-text` / `--viz-axis-grid` / `--viz-axis-label` / `--viz-axis-tick`
- `--viz-cat-1` ~ `--viz-cat-10`
- `--viz-missing` / `--viz-reference` / `--viz-selection` / `--viz-highlight`
- `--color-success-hover` / `-danger-hover` / `-warning-hover` / `-info-hover`
- `--font-size-*` / `--font-weight-*` / `--line-height-*` / `--spacing-*`
- `--duration-*`（附 ms 單位，供 CSS 用；D3 請 import `duration`）

---

## 深色模式（Dark Mode）

採 **class 策略**，四個環節缺一不可：

| 環節 | 檔案 | 作用 |
|---|---|---|
| 1. Tailwind 設定 | `tailwind.config.js` → `darkMode: 'class'` | 讓 `dark:` 前綴聽 `.dark` 而不是作業系統偏好 |
| 2. 狀態來源 | `library/shared/useDarkMode.ts` | 在 `<html>` 掛 / 卸 `.dark`，並存進 `localStorage` |
| 3. 令牌覆寫 | `src/design/tokens.js` → `darkColors` / `darkViz` | 提供深色的文字 / 背景 / 邊框 / 軸線值 |
| 4. 變數注入 | `src/design/tokensPlugin.js` | 把 3. 產出到 `.dark { … }`，變數名稱與亮色相同 |

> ⚠️ 少了第 1 步，Tailwind 會落回 `darkMode: 'media'`，切換鈕按了完全沒反應——
> 這正是先前的狀況（切換鈕只改 `<body class="dark-mode">`，而沒有元件在聽它）。

### 元件怎麼寫

**優先用 CSS 變數**，它們會自動翻轉，不需要寫任何 `dark:`：

```css
/* scoped CSS — 亮色深色都正確 */
.panel {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
}
```

只有在**需要換色階**時才用 `dark:`（品牌色與語意色階不翻轉，深色底下要改用較淺的階）：

```html
<span class="text-primary-600 dark:text-primary-400">連結</span>
<div class="bg-neutral-100 dark:bg-neutral-800">卡片</div>
```

會自動翻轉的變數：`--color-text-*`、`--color-bg-*`、`--color-border-*`、
`--viz-axis-*`、`--viz-missing`、`--viz-selection`、`--viz-highlight`。
**不會**翻轉的：`--color-primary-*`、`--color-neutral-*`、語意色階、`--viz-cat-*`。

### API

```ts
import { useDarkMode } from '@/components/library'

const { isDark, mode, setMode, toggle } = useDarkMode()

toggle()             // light ⇄ dark
setMode('system')    // 跟隨作業系統，並持續監聽變化
mode.value           // 'light' | 'dark' | 'system'
```

狀態是 module-scoped 單例，頁面上放幾顆 `<ChptDarkModeToggle />` 都會同步。
應用程式進入點需呼叫一次 `initDarkMode()`（`src/main.js` 已接），
`index.html` 另有一段前置腳本在首次繪製前套用主題，避免畫面閃爍。

## 待辦

- [ ] 確認 `src/assets/animations.css` 的 keyframes 是否與 `tailwind.config.js` 的 `keyframes` 重複，重複的刪掉一邊
- [ ] 把既有圖表元件 scoped CSS 裡硬寫的軸線色改成 `var(--viz-axis-*)`
- [ ] `.btn` / `.input` / `.tag` 待頁面遷移到 ChptButton / ChptInput 後移除
- [ ] `primary` 色階 400→500→600 明度落差偏大，若要做平滑漸層需重新校準
