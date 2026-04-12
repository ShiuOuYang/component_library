<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Vue.js + Vite + Tailwind CSS + Vue Router 專案指導

這個專案使用以下技術棧：
- Vue.js 3 with Composition API
- Vue Router 4 
- Vite.js 作為建置工具
- Tailwind CSS 作為 CSS 框架

## 開發指導原則

### Vue.js Composition API
- 優先使用 `<script setup>` 語法
- 使用 `ref()` 和 `reactive()` 管理響應式狀態
- 使用 `computed()` 創建計算屬性
- 使用 `watch()` 和 `watchEffect()` 監聽變化

### Vue Router
- 路由配置放在 `src/router/index.js`
- 頁面元件放在 `src/views/` 目錄
- 使用 `<router-view />` 顯示路由內容
- 使用 `<router-link>` 進行導航

### Tailwind CSS
- 優先使用 Tailwind 的 utility 類別
- 避免編寫自定義 CSS，除非 Tailwind 無法滿足需求
- 使用響應式設計類別 (sm:, md:, lg:, xl:)
- 使用 hover:, focus: 等狀態變體

### 程式碼組織
- 頁面元件放在 `src/views/` 目錄
- 可重用元件放在 `src/components/` 目錄
- 使用 TypeScript 類型（如果需要的話）
- 保持元件小而專注於單一職責

### 專案結構
- Dashboard 是主要的 WIP 儀表板頁面
- FilterDropdown 是可重用的過濾器元件
- DataChart 是圖表顯示元件
