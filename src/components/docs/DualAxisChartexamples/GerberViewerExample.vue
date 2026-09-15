<template>
  <div class="mb-8">
    <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 H：Gerber PCB 檔案檢視</h3>
    <p class="text-gray-600 mb-4">
      使用 <span class="font-semibold text-green-600">@tracespace/parser</span> 解析 Gerber 檔案，
      再以 <span class="font-semibold text-blue-600">D3.js</span> 繪製 PCB Bump Map，
      支援 <span class="font-semibold">滾輪縮放</span>、<span class="font-semibold">拖曳平移</span>、
      <span class="font-semibold">重設視圖</span>。
    </p>

    <div class="grid lg:grid-cols-2 gap-6">
      <!-- 檢視器 -->
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <!-- 工具列 -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div class="flex items-center gap-2">
            <span class="text-green-400 text-sm font-mono">Gerber Viewer</span>
            <span class="text-gray-500 text-xs">|</span>
            <span class="text-gray-400 text-xs font-mono">{{ fileName }}</span>
          </div>
          <div class="flex items-center gap-2">
            <!-- 顏色選擇 -->
            <span id="gerber-color-label" class="text-xs text-gray-400">線路顏色</span>
            <div class="flex gap-1" role="group" aria-labelledby="gerber-color-label">
              <button
                v-for="c in colorOptions"
                :key="c.value"
                type="button"
                :aria-label="c.label"
                :aria-pressed="(selectedColor === c.value).toString()"
                @click="selectedColor = c.value"
                :class="[
                  'w-5 h-5 rounded-full border-2 transition-all',
                  selectedColor === c.value
                    ? 'border-white scale-110'
                    : 'border-gray-600 hover:border-gray-400'
                ]"
                :style="{ backgroundColor: c.value }"
                :title="c.label"
              />
            </div>
          </div>
        </div>

        <!-- Gerber 顯示區 -->
        <div style="height: 500px;">
          <GerberViewer
            ref="viewerRef"
            :src="gerberSrc"
            :fill-color="selectedColor"
            :show-info="true"
            :show-controls="true"
            :auto-resize="true"
            background-color="#0d1117"
            @loaded="onLoaded"
            @error="onError"
          />
        </div>

        <!-- 狀態列 -->
        <div class="flex items-center justify-between px-4 py-1.5 bg-gray-800 border-t border-gray-700">
          <span class="text-xs text-gray-500 font-mono">
            {{ statusText }}
          </span>
          <span class="text-xs text-gray-500">
            滾輪縮放 · 拖曳平移 · 重設視圖
          </span>
        </div>
      </div>

      <!-- 程式碼範例 -->
      <CodeBlock
        language="vue"
        :code="codeExample"
      />
    </div>
  </div>
</template>

<script setup>
/* eslint-disable no-useless-escape -- codeExample 裡的結束標籤必須跳脫，否則 SFC 解析器會把 script 區塊提前收尾；ESLint 的 JS parser 看不到 SFC 這一層，故誤判 */
import { ref } from 'vue'
import GerberViewer from '@/components/library/viewer/GerberViewer.vue'
import CodeBlock from '@/components/library/ui/CodeBlock.vue'

const viewerRef = ref(null)
const fileName = '3273053a01-cus-sesc-bump.gbr'
const gerberSrc = '/3273053a01-cus-sesc-bump.gbr'
const statusText = ref('載入中…')

const selectedColor = ref('#00ff88')
const colorOptions = [
  { value: '#00ff88', label: '螢光綠' },
  { value: '#ff6b35', label: '橘色' },
  { value: '#3b82f6', label: '藍色' },
  { value: '#eab308', label: '黃色' },
  { value: '#ef4444', label: '紅色' },
  { value: '#ffffff', label: '白色' },
]

const onLoaded = ({ info }) => {
  statusText.value = `已載入 ${info.shapeCount} 個圖元 | ${info.sizeText}`
}

const onError = ({ message }) => {
  statusText.value = `載入失敗：${message}`
}

const codeExample = `<template>
  <div style="height: 500px;">
    <GerberViewer
      src="/3273053a01-cus-sesc-bump.gbr"
      fill-color="#00ff88"
      background-color="#0d1117"
      :show-info="true"
      :show-controls="true"
      :auto-resize="true"
      @loaded="onLoaded"
      @error="onError"
    />
  </div>
</template>

<script setup>
import GerberViewer from '@/components/library/viewer/GerberViewer.vue'

const onLoaded = ({ info }) => {
  console.log('Gerber 載入完成:', info)
  // { units: 'mm', shapeCount: 20243, sizeText: '...' }
}

// GerberViewer Props:
// - src: String              Gerber 檔案 URL
// - gerberText: String       直接傳入 Gerber 原始內容
// - fillColor: String        線路填色（預設 #00ff88）
// - backgroundColor: String  背景色（預設 #1a1a2e）
// - layers: Array            多層圖層設定（預設 []）
// - showInfo: Boolean        顯示資訊面板（預設 true）
// - showControls: Boolean    顯示工具列（預設 true）
// - showLayerPanel: Boolean  顯示圖層面板（預設 true）
// - autoResize: Boolean      自動隨容器調整大小（預設 true）
// - padding: Number          內距 px（預設 20）
// - maxZoom: Number          最大縮放倍率（預設 200）
// - minZoom: Number          最小縮放倍率（預設 0.1）
// - showMovePath: Boolean    顯示移動路徑（預設 false）

// Events:
// @loaded      - 載入完成 { info }
// @error       - 載入失敗 { message }
// @zoom-change - 縮放變更 { zoom }

// Expose Methods:
// zoomIn() / zoomOut() / resetView() / reload() / toggleLayer()
<\/script>`
</script>
