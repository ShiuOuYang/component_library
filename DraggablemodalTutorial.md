# DraggableModal 多視窗系統 — 完整教學

## 目錄

1. [這套系統在幹嘛？](#1-這套系統在幹嘛)
2. [三個檔案各自的角色](#2-三個檔案各自的角色)
3. [快速開始：最簡單的用法](#3-快速開始)
4. [Props 完整對照表](#4-props-完整對照表)
5. [Events 事件一覽](#5-events-事件一覽)
6. [Slots 插槽用法](#6-slots-插槽用法)
7. [defineExpose 暴露的方法](#7-defineexpose-暴露的方法)
8. [核心機制深入解析](#8-核心機制深入解析)
9. [多視窗實戰範例](#9-多視窗實戰範例)
10. [ModalDock 口袋列的運作方式](#10-modaldock-口袋列)
11. [useModalManager 狀態管理拆解](#11-useModalManager-狀態管理拆解)
12. [常見問題 FAQ](#12-常見問題-faq)

---

## 1. 這套系統在幹嘛？

這是一套仿桌面作業系統（Windows / macOS）的多視窗 Modal 系統，由三個檔案組成。它讓你的 Vue 3 應用程式擁有以下能力：

- **拖曳移動** — 按住標題欄就能拖著視窗跑
- **拖曳縮放** — 右下角有個控制點，可以自由調整大小
- **最大化 / 還原** — 一鍵撐滿整個畫面，再一鍵回來
- **最小化到口袋** — 縮小後不會消失，而是收到右下角的「口袋（Dock）」裡
- **多視窗共存** — 可以同時開好幾個 Modal，點誰誰就跑到最上層
- **z-index 自動管理** — 不用手動算 z-index，系統自動處理疊層順序

想像它就是瀏覽器裡的「迷你 Windows 桌面」。

---

## 2. 三個檔案各自的角色

```
┌──────────────────────────────────────────────────────────┐
│  useModalManager.ts （大腦）                              │
│  - 全域狀態：哪些視窗被最小化了？誰在最上層？               │
│  - 所有 DraggableModal 實例共用同一份資料                  │
└──────────────┬──────────────────────┬────────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│  DraggableModal.vue  │  │  ModalDock.vue               │
│  （視窗本體）         │  │  （口袋列 / 任務欄）          │
│  - 拖曳、縮放、最大化  │  │  - 顯示所有最小化的視窗       │
│  - 最小化、關閉        │  │  - 點擊可還原或關閉           │
│  - 標題欄 + 內容區     │  │  - 固定在右下角               │
└──────────────────────┘  └──────────────────────────────┘
```

**重點概念**：`useModalManager` 是一個 composable，內部使用了模組層級的 `reactive` 變數（定義在函式外面），所以不管哪個組件呼叫 `useModalManager()`，拿到的都是同一份資料。這就是「全域共享狀態」的實現方式，不需要 Pinia。

---

## 3. 快速開始

### 3.1 前置準備

確認你的專案有：
- Vue 3（Composition API）
- Tailwind CSS（組件大量使用 Tailwind class）

### 3.2 檔案放置建議

```
src/
├── components/
│   └── common/
│       ├── DraggableModal.vue
│       └── ModalDock.vue
└── composables/
    └── useModalManager.ts
```

注意 `.vue` 檔案裡的 import 路徑寫的是 `../../composables/useModalManager`，請根據你的實際目錄結構調整。

### 3.3 最小可運行範例

```vue
<template>
  <button @click="showModal = true">開啟視窗</button>

  <DraggableModal
    v-model="showModal"
    title="我的第一個視窗"
    :width="500"
    :height="350"
  >
    <p>這裡放你的內容！</p>
  </DraggableModal>

  <!-- 口袋列：放在 App.vue 裡一次就好 -->
  <ModalDock />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DraggableModal from '@/components/common/DraggableModal.vue'
import ModalDock from '@/components/common/ModalDock.vue'

const showModal = ref(false)
</script>
```

這就能跑了！你會看到一個可拖曳、可縮放、可最小化的視窗。

---

## 4. Props 完整對照表

| Prop | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `id` | `string` | 自動產生 | 視窗唯一 ID。通常不用手動設，系統會用 `generateModalId()` 自動產生 `modal-1`, `modal-2`... |
| `modelValue` | `boolean` | `false` | 控制視窗開關，支援 `v-model` |
| `title` | `string` | `'Modal'` | 標題欄顯示的文字 |
| `width` | `string \| number` | `600` | 初始寬度（px） |
| `height` | `string \| number` | `400` | 初始高度（px） |
| `minWidth` | `number` | `300` | 最小寬度限制 |
| `minHeight` | `number` | `200` | 最小高度限制 |
| `maxWidth` | `number` | `window.innerWidth - 40` | 最大寬度限制 |
| `maxHeight` | `number` | `window.innerHeight - 40` | 最大高度限制 |
| `x` | `number \| null` | `null` | 初始 X 座標。`null` = 自動置中 |
| `y` | `number \| null` | `null` | 初始 Y 座標。`null` = 自動置中 |
| `draggable` | `boolean` | `true` | 是否可拖曳 |
| `resizable` | `boolean` | `true` | 是否可調整大小 |
| `closable` | `boolean` | `true` | 是否顯示關閉按鈕（也影響 ESC 鍵行為） |
| `minimizable` | `boolean` | `true` | 是否顯示最小化按鈕 |
| `maximizable` | `boolean` | `true` | 是否顯示最大化按鈕 |
| `zIndex` | `number` | `30` | 基礎 z-index（實際值由 manager 動態管理） |
| `defaultMaximized` | `boolean` | `false` | 是否預設以最大化開啟 |
| `headerBgColor` | `string` | `'from-blue-50 to-indigo-50'` | 標題欄背景色（Tailwind gradient class） |
| `headerTextColor` | `string` | `'text-gray-800'` | 標題文字顏色 |
| `borderClass` | `string` | `'border border-gray-300'` | 邊框樣式 |
| `roundedClass` | `string` | `'rounded-lg'` | 圓角樣式 |
| `shadowClass` | `string` | `'shadow-2xl'` | 陰影樣式 |
| `backdropOpacity` | `number` | `0.5` | 背景遮罩透明度。`0` = 完全透明（不擋點擊） |
| `contentPadding` | `string` | `'p-4'` | 內容區域的 padding |
| `footerBgColor` | `string` | `'bg-gray-50'` | 底部按鈕區背景色 |

### backdropOpacity 特別說明

這個值有一個巧妙的設計：

- `backdropOpacity: 0.5` → 有半透明黑色遮罩，點背景「不會」關閉（`handleBackdropClick` 裡面的邏輯被註解掉了）
- `backdropOpacity: 0` → 遮罩完全透明，而且自動加上 `pointer-events-none`，讓你可以點到下面的內容

所以如果你要做「不擋住背景」的浮動視窗（像是工具面板），就設 `backdropOpacity: 0`。

---

## 5. Events 事件一覽

```vue
<DraggableModal
  v-model="show"
  @open="handleOpen"
  @close="handleClose"
  @minimize="handleMinimize"
  @maximize="handleMaximize"
  @restore="handleRestore"
>
```

| 事件 | 參數 | 觸發時機 |
|------|------|----------|
| `update:modelValue` | `boolean` | v-model 的標準事件，開/關時觸發 |
| `open` | 無 | 視窗打開並完成初始化後 |
| `close` | 無 | 視窗關閉時 |
| `minimize` | `boolean` | 最小化狀態切換。`true` = 縮小，`false` = 還原 |
| `maximize` | 無 | 最大化時 |
| `restore` | 無 | 從最大化還原時 |

---

## 6. Slots 插槽用法

### 6.1 預設插槽（內容區）

```vue
<DraggableModal v-model="show" title="報表">
  <!-- 這裡就是內容區 -->
  <div>隨便放什麼都可以</div>
</DraggableModal>
```

### 6.2 title 插槽（自訂標題）

如果你想在標題放圖示或更複雜的排版：

```vue
<DraggableModal v-model="show">
  <template #title>
    <span class="flex items-center gap-2">
      🔧 <strong>工具設定</strong>
    </span>
  </template>
  <p>內容...</p>
</DraggableModal>
```

### 6.3 footer 插槽（底部按鈕區）

有提供 `#footer` 插槽時，底部會自動出現一個帶分隔線的區域：

```vue
<DraggableModal v-model="show" title="確認">
  <p>你確定要刪除嗎？</p>

  <template #footer>
    <div class="flex justify-end gap-2">
      <button @click="show = false" class="px-4 py-2 bg-gray-200 rounded">取消</button>
      <button @click="doDelete" class="px-4 py-2 bg-red-500 text-white rounded">刪除</button>
    </div>
  </template>
</DraggableModal>
```

偵測方式是用 `useSlots()` + `computed(() => !!slots.footer)`，所以只有在你真的用了 `#footer` 時才會出現那個區域。

---

## 7. defineExpose 暴露的方法

透過 template ref 可以從外部程式化控制視窗：

```vue
<template>
  <DraggableModal ref="modalRef" v-model="show" title="可控視窗">
    <p>內容</p>
  </DraggableModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const modalRef = ref()

// 之後就能這樣呼叫：
modalRef.value?.open()                // 打開
modalRef.value?.close()               // 關閉
modalRef.value?.minimize()            // 最小化
modalRef.value?.maximize()            // 最大化
modalRef.value?.restore()             // 還原（最大化或最小化都能還原）
modalRef.value?.setPosition(100, 200) // 移動到指定座標
modalRef.value?.setSize(800, 600)     // 設定大小
modalRef.value?.center()              // 回到畫面正中央
modalRef.value?.modalId               // 取得這個視窗的 ID
```

---

## 8. 核心機制深入解析

### 8.1 拖曳的運作原理

拖曳不是用 HTML5 Drag API，而是手動用 `mousedown` → `mousemove` → `mouseup` 三步驟實現：

```
使用者按下標題欄 (mousedown)
      │
      ▼
startDrag() 記錄：
  - 滑鼠起始位置 (dragStartX, dragStartY)
  - Modal 起始位置 (dragStartModalX, dragStartModalY)
  - 在 document 上掛 mousemove + mouseup 監聽
  - 禁用文字選取 (userSelect = 'none')
  - 游標改成 move
      │
      ▼
使用者移動滑鼠 (mousemove)
      │
      ▼
handleDrag() 計算：
  deltaX = 現在滑鼠X - 起始滑鼠X
  deltaY = 現在滑鼠Y - 起始滑鼠Y
  modalX = 起始ModalX + deltaX
  modalY = 起始ModalY + deltaY
  → constrainToViewport() 確保不超出畫面
      │
      ▼
使用者放開滑鼠 (mouseup)
      │
      ▼
stopDrag() 清理：
  - 移除 document 上的監聽
  - 恢復文字選取和游標
```

為什麼監聽掛在 `document` 而不是元素上？因為拖曳時滑鼠可能移出 Modal 範圍，如果掛在元素上就收不到事件了。

### 8.2 調整大小的運作原理

跟拖曳幾乎一模一樣的模式，只是改成改變 `width` 和 `height`：

- 控制點在右下角（一個小小的 SVG 圖示）
- `startResize` → `handleResize` → `stopResize`
- 同樣受 `constrainToViewport()` 限制（`minWidth`, `minHeight`, `maxWidth`, `maxHeight`）
- 最大化時不顯示控制點

### 8.3 constrainToViewport() — 視窗邊界守門員

這個函式做兩件事：

1. **限制位置**：Modal 的左上角不能超出畫面
   ```ts
   modalX = Math.max(0, Math.min(modalX, window.innerWidth - modalWidth))
   modalY = Math.max(0, Math.min(modalY, window.innerHeight - modalHeight))
   ```
2. **限制大小**：寬高不能小於 min 或大於 max
   ```ts
   modalWidth = Math.max(minWidth, Math.min(modalWidth, maxWidth))
   modalHeight = Math.max(minHeight, Math.min(modalHeight, maxHeight))
   ```

另外，`window.addEventListener('resize', handleWindowResize)` 也會在瀏覽器大小改變時重新執行這個函式，確保視窗不會跑到看不見的地方。

### 8.4 最大化 / 還原的狀態管理

```
使用者按「最大化」
      │
      ▼
toggleMaximize()：
  1. 把當前位置和大小存進 beforeMaximize
     { x, y, width, height }
  2. isMaximized = true
  3. modalStyle computed 偵測到 isMaximized，回傳：
     { position: fixed, top: 0, left: 0, width: 100vw, height: 100vh }
      │
使用者按「還原」
      │
      ▼
toggleMaximize()：
  1. 從 beforeMaximize 讀回之前的值
  2. isMaximized = false
  3. modalStyle 回到正常的 px 定位
```

### 8.5 最小化流程（與 ModalDock 的互動）

```
使用者按「─」最小化按鈕
      │
      ▼
doMinimize()：
  1. isMinimized = true
  2. v-show="!isMinimized" 隱藏整個外層 div
  3. 呼叫 registerMinimized()，把自己的資訊註冊到全域 Map：
     { id, title, headerBgColor, restore回呼, close回呼 }
      │
      ▼
ModalDock 的 minimizedCount > 0
  → 口袋按鈕出現在右下角
  → 展開可看到這個 Modal 的標題
      │
使用者在 Dock 裡點「還原」
      │
      ▼
restoreModal(id)：
  → 呼叫存好的 restore 回呼
  → doRestore()：isMinimized = false + unregisterMinimized
  → 視窗重新出現
```

### 8.6 z-index 自動管理

這是多視窗最核心的問題：誰在上面？

```ts
// useModalManager.ts 裡的關鍵變數
const BASE_Z_INDEX = 100
let _topZIndex = BASE_Z_INDEX          // 目前最高的 z-index
const zIndexMap = reactive(new Map())  // 每個 Modal 的 z-index
```

流程：
1. Modal 打開時 → `registerZIndex(id)` → 分配 `++_topZIndex`
2. 使用者點擊某個 Modal → `handleBringToFront()` → `bringToFront(id)` → 再 `++_topZIndex` 給它
3. 已經是最上層就跳過（`if (current === _topZIndex) return`）
4. Modal 關閉時 → `unregisterZIndex(id)` → 從 Map 刪除

因為 `zIndexMap` 是 `reactive`，所以 `getZIndex()` 回傳的值會自動觸發 Vue 的響應式更新，畫面上的 `z-index` style 就會跟著變。

注意：`_topZIndex` 只會往上加不會回收，但 `number` 可以到 2^53，所以永遠不會溢位。

### 8.7 Teleport 與 Transition

```vue
<Teleport to="body">
  <Transition ...>
    <div v-if="modelValue" v-show="!isMinimized">
```

- **Teleport to="body"**：把 Modal 的 DOM 直接掛到 `<body>` 底下，避免被父元素的 `overflow: hidden` 或 `transform` 影響定位。
- **v-if vs v-show**：
  - `v-if="modelValue"` → 控制「是否存在 DOM 中」（開/關）
  - `v-show="!isMinimized"` → 控制「是否可見」（最小化時只是隱藏，DOM 還在）
- **Transition**：進出場的 opacity 淡入淡出動畫

---

## 9. 多視窗實戰範例

### 9.1 同時開三個不同顏色的視窗

```vue
<template>
  <div class="flex gap-4 p-4">
    <button @click="showA = true" class="px-4 py-2 bg-blue-500 text-white rounded">
      開啟 A（藍色）
    </button>
    <button @click="showB = true" class="px-4 py-2 bg-green-500 text-white rounded">
      開啟 B（綠色）
    </button>
    <button @click="showC = true" class="px-4 py-2 bg-purple-500 text-white rounded">
      開啟 C（紫色）
    </button>
  </div>

  <DraggableModal
    v-model="showA"
    title="視窗 A — 使用者資料"
    :width="500"
    :height="350"
    header-bg-color="from-blue-100 to-blue-50"
    :backdrop-opacity="0"
  >
    <p>使用者管理介面...</p>
  </DraggableModal>

  <DraggableModal
    v-model="showB"
    title="視窗 B — 系統紀錄"
    :width="600"
    :height="400"
    header-bg-color="from-green-100 to-emerald-50"
    :backdrop-opacity="0"
  >
    <p>Log viewer...</p>
  </DraggableModal>

  <DraggableModal
    v-model="showC"
    title="視窗 C — 設定"
    :width="400"
    :height="300"
    header-bg-color="from-purple-100 to-violet-50"
    :backdrop-opacity="0"
    :x="200"
    :y="150"
  >
    <p>偏好設定...</p>
  </DraggableModal>

  <!-- 口袋列（全域只需要一個） -->
  <ModalDock />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DraggableModal from '@/components/common/DraggableModal.vue'
import ModalDock from '@/components/common/ModalDock.vue'

const showA = ref(false)
const showB = ref(false)
const showC = ref(false)
</script>
```

幾個重點：

- `backdropOpacity: 0` 讓三個視窗可以同時操作，不會互相遮住背景
- 每個視窗可以獨立拖曳、縮放、最小化
- 點擊任一視窗就會自動跑到最上層
- 最小化的視窗會出現在右下角的 Dock 裡
- `ModalDock` 只需要放一次（通常放在 `App.vue`）

### 9.2 預設最大化的「全螢幕編輯器」

```vue
<DraggableModal
  v-model="showEditor"
  title="程式碼編輯器"
  :default-maximized="true"
  :minimizable="false"
  :resizable="false"
>
  <textarea class="w-full h-full font-mono text-sm p-2 border-0 outline-none resize-none">
    // 在這裡寫 code...
  </textarea>
</DraggableModal>
```

### 9.3 帶 Footer 的確認對話框

```vue
<DraggableModal
  v-model="showConfirm"
  title="確認操作"
  :width="420"
  :height="220"
  :draggable="true"
  :resizable="false"
  :minimizable="false"
  :maximizable="false"
>
  <p class="text-gray-600">你確定要刪除這 15 筆資料嗎？此操作無法復原。</p>

  <template #footer>
    <div class="flex justify-end gap-3">
      <button @click="showConfirm = false"
              class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
        取消
      </button>
      <button @click="confirmDelete"
              class="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600">
        確定刪除
      </button>
    </div>
  </template>
</DraggableModal>
```

---

## 10. ModalDock 口袋列

### 10.1 它是什麼？

`ModalDock` 是固定在畫面右下角的一個「任務欄」，功能類似 Windows 的工作列或 macOS 的 Dock。它的職責就是：

1. 顯示目前有多少視窗被最小化了（數字徽章）
2. 列出所有最小化的視窗標題
3. 提供「還原」和「關閉」按鈕

### 10.2 放置位置

**全域只放一次**，建議放在 `App.vue`：

```vue
<!-- App.vue -->
<template>
  <router-view />
  <ModalDock />
</template>
```

### 10.3 Props

| Prop | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `zIndex` | `number` | `9999` | Dock 的 z-index，預設極高以確保永遠在最上面 |

### 10.4 UI 結構

```
┌─────────────────────────┐
│ ┌─────────────────────┐ │  ← 展開的列表
│ │ ▌視窗 A — 使用者資料  [□][✕] │ │     每一項都有色彩指示條 + 標題 + 兩個按鈕
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ ▌視窗 B — 系統紀錄    [□][✕] │ │
│ └─────────────────────┘ │
│                         │
│        ┌──────────┐     │
│        │ 📦  2  ▲ │     │  ← 口袋按鈕（可展開/收合）
│        └──────────┘     │
└─────────────────────────┘
```

列表項目的色彩指示條 (`.w-1.5`) 會顯示該視窗的 `headerBgColor`，方便辨識是哪個視窗。

### 10.5 動畫

Dock 用了三層 Transition：

1. **整個 Dock** — 有最小化視窗時淡入，全部還原後淡出
2. **列表容器** — 展開/收合時有 scale + translate 動畫
3. **TransitionGroup** — 列表項目新增/移除時有 slide 動畫

---

## 11. useModalManager 狀態管理拆解

### 11.1 為什麼不用 Pinia？

因為這個 composable 用了一個巧妙的 pattern：**在函式外面定義 reactive 變數**。

```ts
// ← 這些在模組頂層，import 時就建立，全域唯一
const minimizedModals = reactive(new Map())
const zIndexMap = reactive(new Map())
let _topZIndex = BASE_Z_INDEX

// ← 這個函式每次呼叫都回傳操作同一份資料的方法
export function useModalManager() {
  return { getZIndex, bringToFront, ... }
}
```

不管是 `DraggableModal` 還是 `ModalDock`，import 時拿到的都是同一份 `minimizedModals` 和 `zIndexMap`。這對於這種「跨組件但不需要持久化」的狀態來說，比 Pinia 更簡潔。

### 11.2 完整 API

| 方法 | 說明 |
|------|------|
| `minimizedList` | computed — 所有最小化視窗的陣列 |
| `minimizedCount` | computed — 最小化視窗數量 |
| `registerMinimized(info)` | 註冊一個最小化視窗 |
| `unregisterMinimized(id)` | 取消註冊 |
| `restoreModal(id)` | 還原指定視窗（呼叫存好的回呼） |
| `closeModal(id)` | 關閉指定視窗（呼叫存好的回呼） |
| `restoreAll()` | 還原所有最小化視窗 |
| `closeAll()` | 關閉所有最小化視窗 |
| `getZIndex(id)` | 取得指定視窗的 z-index（響應式） |
| `bringToFront(id)` | 將指定視窗提升到最上層 |
| `registerZIndex(id)` | 首次打開時註冊 z-index |
| `unregisterZIndex(id)` | 關閉時移除 z-index 記錄 |
| `generateModalId()` | 產生唯一 ID（`modal-1`, `modal-2`...） |

### 11.3 MinimizedModalInfo 介面

```ts
interface MinimizedModalInfo {
  id: string           // 視窗 ID
  title: string        // 標題（顯示在 Dock 裡）
  headerBgColor: string // 標題欄顏色（Dock 的色彩指示條）
  restore: () => void  // 還原回呼
  close: () => void    // 關閉回呼
}
```

這個設計很聰明：最小化時把「怎麼還原」和「怎麼關閉」一起存進 Map，Dock 只需要呼叫回呼就好，完全不用知道 DraggableModal 內部是怎麼運作的。

---

## 12. 常見問題 FAQ

### Q1：多個 Modal 的 backdrop 會疊在一起變很暗？

是的，每個 Modal 都有自己的 backdrop。解法：多視窗場景下請把 `backdropOpacity` 設為 `0`，讓視窗像桌面應用一樣浮在畫面上。只有「需要聚焦」的單一 Modal（例如確認對話框）才用 `0.5`。

### Q2：我可以在 Modal 裡再開一個 Modal 嗎？

可以，因為每個 Modal 都 Teleport 到 body，而且 z-index 自動管理，所以巢狀使用完全沒問題。

### Q3：ESC 鍵會關掉哪個 Modal？

目前的寫法是：所有開啟且 `closable` 的 Modal 都會監聽 ESC，所以會同時關掉它們。如果你想只關最上層的那個，需要在 `handleKeydown` 裡加判斷：

```ts
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.modelValue && props.closable) {
    // 加上判斷：只有最上層的視窗才回應 ESC
    if (getZIndex(modalId) === _topZIndex) {
      handleClose()
    }
  }
}
```

（注意：這需要把 `_topZIndex` 從 `useModalManager` export 出來，或加一個 `isTopmost(id)` 方法。）

### Q4：handleBackdropClick 裡的邏輯被註解掉了？

對，目前點擊背景不會關閉 Modal。如果你想要「點背景關閉」的行為，把註解打開就好：

```ts
function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}
```

### Q5：內容區域的高度怎麼計算的？

`contentStyle` 裡固定扣掉了 60px（標題欄的大約高度）：

```ts
maxHeight: `${modalHeight.value - 60}px`
```

如果你改了標題欄的 padding 或字體大小，可能需要調整這個 60。更精確的做法是用 `headerRef` 去動態量測標題欄實際高度。

### Q6：我在 CHPT 的內網環境能用嗎？

完全可以。這套組件不需要任何外部 CDN 或 API 請求，只依賴 Vue 3 和 Tailwind CSS。唯一要注意的是 import 路徑要根據你的專案結構調整。

### Q7：如何從外部程式化控制所有 Modal？

直接在你的頁面裡呼叫 `useModalManager()`：

```ts
import { useModalManager } from '@/composables/useModalManager'

const { restoreAll, closeAll, minimizedList } = useModalManager()

// 一鍵還原所有
restoreAll()

// 一鍵關閉所有
closeAll()

// 看看目前有哪些被最小化
console.log(minimizedList.value)
```

---

## 附錄：完整資料流圖

```
使用者操作                   DraggableModal                    useModalManager              ModalDock
─────────                   ──────────────                    ───────────────              ─────────
點擊「開啟」           ──→   v-model=true
                            watch → registerZIndex()    ──→   zIndexMap.set(id, z++)
                            watch → bringToFront()      ──→   zIndexMap.set(id, z++)
                            watch → initializeModal()
                            emit('open')

拖曳標題欄             ──→   startDrag → handleDrag → stopDrag
                            (持續更新 modalX, modalY)

拖曳右下角             ──→   startResize → handleResize → stopResize
                            (持續更新 modalWidth, modalHeight)

點擊 Modal 任意處      ──→   handleBringToFront()        ──→   bringToFront(id)
                                                              zIndexMap.set(id, z++)

點擊「─」最小化        ──→   doMinimize()
                            isMinimized = true
                            registerMinimized(info)     ──→   minimizedModals.set(id, info)
                                                                                          ──→   minimizedCount > 0
                                                                                                顯示口袋按鈕

在 Dock 點「還原」                                                                        ──→   restoreModal(id)
                                                        ──→   info.restore()
                      ←──   doRestore()
                            isMinimized = false
                            unregisterMinimized(id)     ──→   minimizedModals.delete(id)

點擊「□」最大化        ──→   toggleMaximize()
                            beforeMaximize = { x, y, w, h }
                            isMaximized = true

點擊「✕」關閉          ──→   handleClose()
                            unregisterMinimized (if needed)
                            unregisterZIndex()          ──→   zIndexMap.delete(id)
                            emit('update:modelValue', false)
                            emit('close')
```

---

> **小結**：這套 Modal 系統的設計精髓在於「關注點分離」——DraggableModal 只管自己的拖曳、縮放和 UI；useModalManager 管全域的 z-index 和最小化列表；ModalDock 只負責顯示口袋裡有什麼。三者透過 reactive Map 連接，乾淨俐落。