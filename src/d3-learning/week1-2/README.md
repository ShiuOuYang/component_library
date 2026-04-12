# 階段一：基石與原理 (第 1-2 週)

## 🎯 學習目標
在不依賠 D3 的情況下，深刻理解網頁如何繪圖。掌握 SVG 和 DOM 操作的核心原理。

## 📚 核心主題

### 1. SVG 深度解析
- 基本形狀：`<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polyline>`, `<polygon>`
- 路徑 (Path)：`<path>` 的 `d` 屬性指令
  - M (moveto): 移動到某個點
  - L (lineto): 畫直線到某個點
  - C (curveto): 畫曲線
  - Z (closepath): 關閉路徑
- 群組 (Group)：`<g>` 用於組織和變換
- 文字：`<text>` 的屬性設定

### 2. DOM 座標系統
- SVG 座標系統 (0,0 在左上角)
- `transform` 屬性：`translate(x,y)`, `rotate()`, `scale()`
- `viewBox` 的應用

### 3. ES6+ JavaScript 基礎
- Array methods: `map`, `filter`, `reduce`, `forEach`
- 解構賦值、箭頭函數
- Template literals

## 📝 練習檔案

### 01-svg-basics.html
**練習重點**：熟悉 SVG 基本形狀和屬性
- 繪製基本圖形 (矩形、圓形、直線、多邊形)
- 了解 fill, stroke, stroke-width 等屬性
- 使用 opacity, fill-opacity, stroke-opacity

### 02-svg-coordinates.html
**練習重點**：理解 SVG 座標系統和變換
- 使用 `transform="translate(x,y)"` 移動元素
- 使用 `transform="rotate(angle)"` 旋轉元素
- 結合多個變換
- 理解 `viewBox` 的作用

### 03-manual-bar-chart.html
**練習重點**：手寫靜態長條圖 (不使用任何 JavaScript 函式庫)
- 使用 `<rect>` 繪製長條
- 使用 `<text>` 添加標籤
- 使用 `<line>` 繪製座標軸
- 計算長條的位置和高度

### 04-vanilla-js-svg.html
**練習重點**：用原生 JavaScript 操作 SVG DOM
- 使用 `document.createElementNS()` 創建 SVG 元素
- 使用 `setAttribute()` 設定屬性
- 動態生成長條圖
- 添加互動效果 (hover, click)

## 🎓 學習成果檢核

完成這個階段後，你應該能夠：
- ✅ 不看文檔就能手寫基本的 SVG 圖形
- ✅ 理解 SVG 座標系統和 transform 的運作原理
- ✅ 用原生 JS 動態創建和操作 SVG 元素
- ✅ 計算資料到像素的映射關係 (為學習 D3 Scales 打基礎)

## 🚀 進階挑戰

1. **手寫折線圖**：使用 `<path>` 和 `d` 屬性繪製折線
2. **添加動畫**：使用 CSS transitions 或 Web Animations API
3. **響應式設計**：讓圖表隨視窗大小調整

## 📖 推薦資源

- [MDN SVG Tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial)
- [SVG Path Commands](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d)
- [JavaScript Array Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)

## ⏭️ 下一步

完成所有練習後，你就準備好進入**階段二：D3 核心邏輯**！
