<template>
  <div class="mb-8">
    <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 H：Gerber PCB 檢視器</h3>
    <p class="text-gray-600 mb-4">
      使用 <span class="font-semibold text-green-600">@tracespace/parser</span> 解析 Gerber 檔案，
      搭配 <span class="font-semibold text-blue-600">D3.js</span> 渲染 PCB Bump Map。
      支援 <span class="font-semibold">滾輪縮放</span>、<span class="font-semibold">拖曳平移</span>、
      <span class="font-semibold">雙擊重置</span>。
    </p>

    <div class="grid lg:grid-cols-2 gap-6">
      <!-- 圖表區域 -->
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <!-- 控制列 -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div class="flex items-center gap-2">
            <span class="text-green-400 text-sm font-mono">🔬 Gerber Viewer</span>
            <span class="text-gray-500 text-xs">|</span>
            <span class="text-gray-400 text-xs font-mono">{{ fileName }}</span>
          </div>
          <div class="flex items-center gap-2">
            <!-- 顏色選擇 -->
            <label class="text-xs text-gray-400">圖層色:</label>
            <div class="flex gap-1">
              <button
                v-for="c in colorOptions" :key="c.value"
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
            滾輪縮放 · 拖曳平移 · 雙擊重置
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
import { ref } from 'vue'
import GerberViewer from '../../common/GerberViewer.vue'
import CodeBlock from '../../common/CodeBlock.vue'

const viewerRef = ref(null)
const fileName = '3273053a01-cus-sesc-bump.gbr'
const gerberSrc = '/3273053a01-cus-sesc-bump.gbr'
const statusText = ref('載入中...')

const selectedColor = ref('#00ff88')
const colorOptions = [
  { value: '#00ff88', label: '銅層綠' },
  { value: '#ff6b35', label: '橘色' },
  { value: '#3b82f6', label: '藍色' },
  { value: '#eab308', label: '金色' },
  { value: '#ef4444', label: '紅色' },
  { value: '#ffffff', label: '白色' },
]

const onLoaded = ({ info }) => {
  statusText.value = `✅ ${info.shapeCount} 個圖形 | ${info.sizeText}`
}

const onError = ({ message }) => {
  statusText.value = `❌ ${message}`
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
import GerberViewer from '@/components/common/GerberViewer.vue'

const onLoaded = ({ info }) => {
  console.log('Gerber 載入完成:', info)
  // { units: 'mm', shapeCount: 20243, sizeText: '...' }
}

// GerberViewer Props:
// - src: String        Gerber 檔案 URL
// - gerberText: String 直接傳入 Gerber 原始文字
// - fillColor: String  圖形填充色 (預設 #00ff88)
// - backgroundColor: String 背景色 (預設 #1a1a2e)
// - showInfo: Boolean  顯示資訊面板
// - showControls: Boolean 顯示控制按鈕
// - autoResize: Boolean 自動響應容器大小
// - padding: Number    邊距 (px)
// - maxZoom: Number    最大縮放倍率
// - minZoom: Number    最小縮放倍率

// Events:
// @loaded  - 載入完成 { info }
// @error   - 載入失敗 { message }
// @zoom-change - 縮放變化 { zoom }

// Expose Methods:
// zoomIn() / zoomOut() / resetView() / reload()
<\/script>`
</script>
