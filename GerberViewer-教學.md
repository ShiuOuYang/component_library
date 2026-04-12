# GerberViewer.vue 超詳盡教學

## 1. 組件總覽與用途說明

`GerberViewer.vue` 是一個專為 PCB 工程圖（Gerber 檔案）設計的可視化元件，支援直接載入 Gerber 檔案或原始文字，並以 SVG 方式渲染於網頁上。它結合 D3.js 與 tracespace 解析器，提供高效能的圖形渲染、互動式縮放、重置視角、資訊面板顯示等功能。

**適用場景：**
- PCB 工程圖預覽、審查
- 製程資料視覺化
- 任何需將 Gerber 檔案嵌入網頁的應用

**主要功能：**
- 支援 Gerber 檔案 URL 或原始文字載入
- 自動解析並渲染為 SVG 圖形
- 互動式縮放、重置、資訊面板
- 錯誤與載入狀態提示
- 高度自訂顏色、控制面板顯示

---

## 2. Props 詳細解釋

| Prop 名稱         | 型別      | 預設值         | 說明 |
|------------------|-----------|---------------|------|
| src              | String    | ''            | Gerber 檔案的 URL 路徑，優先於 gerberText |
| gerberText       | String    | ''            | 直接傳入 Gerber 原始文字，若有值則優先於 src |
| backgroundColor  | String    | '#1a1a2e'     | SVG 背景色，可自訂 |
| fillColor        | String    | '#00ff88'     | 圖形填充色，預設亮綠色 |
| strokeColor      | String    | 'none'        | 圖形描邊色，預設無描邊 |
| showInfo         | Boolean   | true          | 是否顯示左上資訊面板 |
| showControls     | Boolean   | true          | 是否顯示右下控制按鈕（縮放/重置） |
| autoResize       | Boolean   | true          | 是否自動偵測容器尺寸變化並重繪 |
| padding          | Number    | 20            | 圖形與容器邊界的留白（像素） |
| maxZoom          | Number    | 200           | 最大縮放倍率 |
| minZoom          | Number    | 0.1           | 最小縮放倍率 |

**注意事項：**
- `gerberText` 與 `src` 同時存在時，`gerberText` 優先。
- `backgroundColor`、`fillColor`、`strokeColor` 可動態調整，會自動重繪。
- `autoResize` 建議保持為 true，確保響應式體驗。

---

（後續章節將繼續補充：事件、核心邏輯、渲染流程、方法、UI 結構、用法範例、擴充建議、疑難排解等）

---

## 3. 事件（Emits）說明

| 事件名稱      | 說明                         | Payload 結構 |
|---------------|------------------------------|--------------|
| loaded        | 成功載入並渲染完成時觸發     | { info }     |
| error         | 載入或解析失敗時觸發         | { message }  |
| zoom-change   | 縮放比例變化時觸發           | { zoom }     |

**範例：**

```vue
<GerberViewer
	:src="url"
	@loaded="onLoaded"
	@error="onError"
	@zoom-change="onZoomChange"
/>
```

---

## 4. 組件核心邏輯與渲染流程

### 載入與解析流程
1. 優先使用 `gerberText`，否則以 `src` 進行 fetch 載入。
2. 先嘗試用 `@tracespace/parser` + `@tracespace/plotter` 解析（支援性佳、圖形豐富）。
3. 若 tracespace 解析失敗，回退內建手動 Gerber 解析器（相容性強，支援常見格式）。
4. 解析後自動計算圖形邊界、單位、圖形數量等資訊。
5. 使用 D3.js 進行 SVG 渲染，並根據 props 設定顏色、padding、縮放等。
6. 若啟用 autoResize，會自動監聽容器尺寸變化並重繪。

### 錯誤與載入狀態
- 載入中、解析中、渲染中皆有 loading 狀態提示。
- 任何錯誤（如 fetch 失敗、格式錯誤、無效座標等）會顯示錯誤面板，並可點擊「重試」。

### 縮放與重置
- 內建 D3 zoom 行為，支援滑鼠滾輪縮放、拖曳平移。
- 右下角控制按鈕可放大、縮小、重置視角。
- 透過 emit 事件回報 zoom 變化。

---

## 5. 主要方法與公開 API

組件透過 `defineExpose` 將下列方法公開給父組件呼叫：

- `zoomIn()`：放大視圖
- `zoomOut()`：縮小視圖
- `resetView()`：重置視角（回到初始縮放與位置）
- `reload()`：重新載入並解析/渲染

**範例：**

```vue
<template>
	<GerberViewer ref="viewerRef" ... />
</template>
<script setup>
import { ref } from 'vue'
const viewerRef = ref(null)
function zoomToMax() {
	viewerRef.value?.zoomIn()
}
</script>
```

---

## 6. UI 結構與 Tailwind CSS 應用

### Template 區塊結構
- `.gerber-viewer`：最外層容器，負責定位與 overflow 處理
- 載入狀態層（loading）
- 錯誤狀態層（error）
- `<svg>`：主圖形渲染區域
- 資訊面板（左上，顯示單位、圖形數、範圍、縮放）
- 控制按鈕（右下，放大/縮小/重置）

### Tailwind CSS 應用
- 使用大量 utility class 控制顏色、定位、圓角、字型、透明度、動畫等
- 響應式設計與互動狀態（hover, active, transition）
- 幾乎無自訂 CSS，僅極少數補充（如 svg 游標樣式）

---

## 7. 常見用法範例

### 1. 基本用法
```vue
<GerberViewer src="/pcb/board.gbr" />
```

### 2. 直接傳入 Gerber 原始文字
```vue
<GerberViewer :gerberText="rawGerberString" />
```

### 3. 監聽事件與自訂顏色
```vue
<GerberViewer
	src="/pcb/board.gbr"
	fillColor="#ff00cc"
	backgroundColor="#222"
	@loaded="info => console.log(info)"
	@error="err => alert(err.message)"
/>
```

### 4. 動態縮放與重置
```vue
<template>
	<GerberViewer ref="viewer" :src="url" />
	<button @click="viewer.value.zoomIn()">放大</button>
	<button @click="viewer.value.resetView()">重置</button>
</template>
<script setup>
import { ref } from 'vue'
const viewer = ref(null)
</script>
```

---

## 8. 擴充與客製化建議

- 若需支援更多 Gerber 特性，可擴充手動解析器或 tracespace 解析流程
- 可自訂控制按鈕樣式、資訊面板內容，或以 slot 擴充
- 若需顯示多層/多檔案，可外部包裝多個 GerberViewer 疊加
- 可結合 Pinia/Vuex 管理多檔案狀態

---

## 9. 疑難排解與最佳實踐

### 常見錯誤訊息
- `請提供 src 或 gerberText`：未指定任何資料來源
- `載入失敗: 404`：檔案路徑錯誤或伺服器無回應
- `容器尺寸為 0`：父容器未正確設定尺寸
- `無有效座標數據`：Gerber 檔案內容異常或格式不符

### 解決方式
- 確認 props 傳遞正確，且父容器有明確寬高
- 若遇解析異常，可先用外部工具驗證 Gerber 檔案格式
- 若需相容特殊格式，建議優先使用 tracespace，或擴充手動解析器

### 效能與相容性
- 建議僅在需要時載入大型檔案，避免一次渲染過多圖層
- tracespace 解析器需安裝對應 npm 套件，並注意瀏覽器支援性

---

如需更進階應用或遇到特殊需求，歡迎進一步詢問！

---

## 10. 程式碼逐段詳解

### 10.1 Template 區塊結構

```vue
<template>
	<div ref="containerRef" class="gerber-viewer relative w-full h-full">
		<!-- 載入狀態 -->
		<div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-4 border-green-400 border-t-transparent mx-auto mb-3"></div>
				<p class="text-green-400 text-sm font-mono">{{ loadingMessage }}</p>
			</div>
		</div>

		<!-- 錯誤狀態 -->
		<div v-if="error" class="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
			<div class="text-center p-6">
				<span class="text-4xl mb-3 block">⚠️</span>
				<p class="text-red-400 text-sm font-mono">{{ error }}</p>
				<button 
					@click="reload" 
					class="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
				>
					重試
				</button>
			</div>
		</div>

		<!-- SVG 容器 -->
		<svg ref="svgRef" class="w-full h-full" :style="{ background: backgroundColor }"></svg>

		<!-- 資訊面板 -->
		<div 
			v-if="showInfo && imageInfo" 
			class="absolute top-3 left-3 bg-black/70 text-green-400 text-xs font-mono rounded px-3 py-2 pointer-events-none select-none"
		>
			<div>{{ imageInfo.units === 'mm' ? '公厘' : '英寸' }} | {{ imageInfo.shapeCount }} 個圖形</div>
			<div>範圍: {{ imageInfo.sizeText }}</div>
			<div v-if="currentZoom !== 1">縮放: {{ (currentZoom * 100).toFixed(0) }}%</div>
		</div>

		<!-- 控制按鈕 -->
		<div v-if="showControls" class="absolute bottom-3 right-3 flex gap-1.5">
			<button
				@click="zoomIn"
				class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-lg transition-colors"
				title="放大"
			>+</button>
			<button
				@click="zoomOut"
				class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-lg transition-colors"
				title="縮小"
			>−</button>
			<button
				@click="resetView"
				class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-sm transition-colors"
				title="重置視角"
			>⟳</button>
		</div>
	</div>
</template>
```

#### 結構說明
- **最外層 `<div class="gerber-viewer">`**：負責定位、overflow、尺寸，並作為 ResizeObserver 監控對象。
- **載入狀態層**：`v-if="loading"`，顯示 loading spinner 與訊息，覆蓋整個 viewer。
- **錯誤狀態層**：`v-if="error"`，顯示錯誤訊息與重試按鈕，覆蓋整個 viewer。
- **SVG 容器**：`<svg ref="svgRef">`，所有圖形皆渲染於此，背景色由 props 控制。
- **資訊面板**：左上角顯示單位、圖形數、範圍、縮放等資訊，僅在 showInfo 為 true 且 imageInfo 有值時顯示。
- **控制按鈕**：右下角，放大、縮小、重置，僅在 showControls 為 true 時顯示。

---
