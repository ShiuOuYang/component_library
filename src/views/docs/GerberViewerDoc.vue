<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-8">
    <div class="w-full">

      <!-- 標題與簡介 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div class="border-l-4 border-green-600 pl-6">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">GerberViewer</h1>
          <p class="text-lg text-gray-600 leading-relaxed">
            基於 <span class="font-semibold text-blue-600">D3.js</span> 與
            <span class="font-semibold text-green-600">@tracespace/parser</span> 的 Vue 3 Gerber 檢視元件，
            支援 <span class="font-semibold text-amber-600">多圖層同時渲染</span>（如同 KiCad / Altium），
            圖層可個別切換顯示/隱藏，並支援
            <span class="font-semibold text-amber-600">滾輪縮放</span>、
            <span class="font-semibold text-amber-600">拖曳平移</span>、
            <span class="font-semibold text-amber-600">雙擊重置</span>。
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
            <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">D3.js</span>
            <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">@tracespace/parser</span>
            <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">多圖層 Multi-Layer</span>
            <span class="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">Gerber RS-274X</span>
          </div>
        </div>
      </div>

      <!-- 互動展示區 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <span class="text-green-600 mr-3">🔬</span>
          多圖層互動展示
        </h2>
        <p class="text-gray-500 text-sm mb-6">
          左側圖層面板可點擊切換各層顯示，模擬 EDA 工具的多層 PCB 疊圖檢視。
          可上傳多個 Gerber 檔案（.gtl、.gbl、.gko、.drl…），所有圖層共用同一座標空間對齊。
        </p>

        <div class="grid lg:grid-cols-4 gap-6">
          <!-- Gerber 檢視區 (左側 3/4) -->
          <div class="lg:col-span-3 rounded-xl border border-gray-300 overflow-hidden flex flex-col">
            <!-- 頂部工具列 -->
            <div class="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-300 flex-shrink-0">
              <div class="flex items-center gap-3">
                <span class="text-green-700 text-sm font-mono font-semibold">⚡ Gerber Viewer</span>
                <span class="text-gray-400">|</span>
                <span class="text-gray-500 text-xs font-mono">{{ layerCount }} 圖層</span>
              </div>
              <span class="text-xs text-gray-500">{{ statusText }}</span>
            </div>

            <!-- 主體：GerberViewer（內建圖層面板） -->
            <div class="flex-1" style="height: 560px;">
              <GerberViewer
                ref="viewerRef"
                :layers="activeLayers"
                :show-info="showInfo"
                :show-controls="true"
                :show-layer-panel="true"
                :auto-resize="true"
                :background-color="selectedBg"
                @loaded="onLoaded"
                @error="onError"
                @zoom-change="onZoomChange"
              />
            </div>

            <!-- 底部狀態列 -->
            <div class="flex items-center justify-between px-4 py-1.5 bg-gray-100 border-t border-gray-300 flex-shrink-0">
              <span class="text-xs text-gray-500 font-mono">{{ statusDetail }}</span>
              <span class="text-xs text-gray-400">滾輪縮放 · 拖曳平移 · 雙擊重置 · 點擊圖層切換顯示</span>
            </div>
          </div>

          <!-- 控制面板 (右側 1/4) -->
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 space-y-5 flex flex-col">
            <h3 class="text-lg font-bold text-gray-800 flex items-center">
              <span class="mr-2">⚙️</span> 控制面板
            </h3>

            <!-- 上傳多個 Gerber 檔案 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                新增圖層
                <span class="text-xs text-gray-400 font-normal ml-1">(可多選)</span>
              </label>
              <label class="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white text-sm font-semibold rounded-lg shadow-md cursor-pointer transition-all duration-200 hover:scale-105">
                📁 選擇 Gerber 檔案
                <input
                  type="file"
                  multiple
                  accept=".gbr,.ger,.gtl,.gbl,.gto,.gbo,.gts,.gbs,.gtp,.gbp,.gm1,.gm2,.drl"
                  class="hidden"
                  @change="handleFileUpload"
                />
              </label>
              <p class="mt-1.5 text-xs text-gray-500">支援 .gtl .gbl .gko .gto .gbo .drl 等</p>
            </div>

            <!-- 目前圖層列表 -->
            <div v-if="activeLayers.length > 0">
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-gray-700">目前圖層 ({{ activeLayers.length }})</label>
                <button
                  @click="clearLayers"
                  class="text-xs text-red-500 hover:text-red-700 transition-colors"
                >清除全部</button>
              </div>
              <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <div
                  v-for="(layer, i) in activeLayers"
                  :key="layer.name + i"
                  class="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-gray-200"
                >
                  <!-- 顏色選擇器 -->
                  <input
                    type="color"
                    :value="layer.color"
                    @input="updateLayerColor(i, $event.target.value)"
                    class="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    title="更改顏色"
                  />
                  <span class="text-xs font-mono text-gray-700 flex-1 truncate" :title="layer.name">
                    {{ layer.name }}
                  </span>
                  <button
                    @click="removeLayer(i)"
                    class="text-gray-400 hover:text-red-500 transition-colors text-xs leading-none"
                    title="移除此圖層"
                  >✕</button>
                </div>
              </div>
            </div>

            <!-- 背景色 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">背景色</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="bg in bgOptions" :key="bg.value"
                  @click="selectedBg = bg.value"
                  :class="[
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all',
                    selectedBg === bg.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-300'
                      : 'border-gray-200 hover:border-gray-400 text-gray-600 bg-white'
                  ]"
                >
                  <div class="w-4 h-4 rounded border border-gray-300" :style="{ backgroundColor: bg.value }" />
                  {{ bg.label }}
                </button>
              </div>
            </div>

            <!-- 顯示資訊 toggle -->
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-700">顯示資訊面板</label>
              <button
                @click="showInfo = !showInfo"
                :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors', showInfo ? 'bg-green-600' : 'bg-gray-300']"
              >
                <span :class="['inline-block h-4 w-4 transform rounded-full bg-white transition-transform', showInfo ? 'translate-x-6' : 'translate-x-1']" />
              </button>
            </div>

            <!-- 視角操作 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">視角操作</label>
              <div class="grid grid-cols-3 gap-2">
                <button @click="viewerRef?.zoomIn()" class="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm rounded-lg border border-gray-300 transition-colors">🔍+</button>
                <button @click="viewerRef?.zoomOut()" class="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm rounded-lg border border-gray-300 transition-colors">🔍−</button>
                <button @click="viewerRef?.resetView()" class="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm rounded-lg border border-gray-300 transition-colors">⟳</button>
              </div>
            </div>

            <!-- 縮放資訊 -->
            <div class="pt-3 border-t border-blue-200 mt-auto">
              <div class="text-xs text-gray-500 font-mono space-y-1">
                <div>縮放: <span class="text-blue-600 font-semibold">{{ (currentZoom * 100).toFixed(0) }}%</span></div>
                <div>圖層: <span class="text-blue-600 font-semibold">{{ layerCount }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- API 文件 -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-purple-600 mr-3">📚</span>
          API 文件
        </h2>

        <!-- Props -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Props</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">屬性名稱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">型別</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">預設值</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">說明</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="prop in propsDoc" :key="prop.name" :class="prop.highlight ? 'bg-green-50' : ''">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono" :class="prop.highlight ? 'text-green-700 font-bold' : 'text-blue-600'">
                    {{ prop.name }}
                    <span v-if="prop.highlight" class="ml-1 text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full font-normal">推薦</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{{ prop.type }}</td>
                  <td class="px-6 py-4 text-sm font-mono text-gray-500">{{ prop.default }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ prop.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- layers 型別說明 -->
        <div class="mb-8 bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h4 class="text-base font-semibold text-gray-800 mb-3">
            <code class="text-green-700">layers</code> 陣列每項結構
          </h4>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead><tr class="border-b border-gray-300">
                <th class="text-left py-2 pr-6 font-medium text-gray-600">欄位</th>
                <th class="text-left py-2 pr-6 font-medium text-gray-600">型別</th>
                <th class="text-left py-2 font-medium text-gray-600">說明</th>
              </tr></thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="f in layerFieldsDoc" :key="f.field">
                  <td class="py-2 pr-6 font-mono text-blue-600">{{ f.field }}</td>
                  <td class="py-2 pr-6 font-mono text-gray-700">{{ f.type }}</td>
                  <td class="py-2 text-gray-600">{{ f.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Events -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Events</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">事件名稱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">參數</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">說明</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="event in eventsDoc" :key="event.name">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">@{{ event.name }}</td>
                  <td class="px-6 py-4 text-sm font-mono text-gray-900">{{ event.params }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ event.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Expose Methods -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Expose Methods</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">方法名稱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">說明</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="method in methodsDoc" :key="method.name">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-600">{{ method.name }}()</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ method.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 使用範例 -->
        <div>
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">使用範例</h3>
          <CodeBlock language="vue" :code="usageExample" />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import GerberViewer from '../../components/common/GerberViewer.vue'
import CodeBlock from '../../components/common/CodeBlock.vue'

// === 預設圖層顏色序列 ===
const LAYER_COLORS = ['#00ff88', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#c0a0ff', '#ff9f40', '#f8bbd0']

// === 互動展示狀態 ===
const viewerRef = ref(null)
const statusText = ref('請上傳 Gerber 檔案')
const statusDetail = ref('')
const currentZoom = ref(1)
const showInfo = ref(true)
const selectedBg = ref('#0d1117')

/** 傳給 GerberViewer 的圖層陣列 */
const activeLayers = ref([
  // 預設載入示範檔案（若存在）
  {
    src: '/Gerber_TopSilkscreenLayer.GTO',
    name: 'Gerber_TopSilkscreenLayer.GTO',
    color: '#00ff88',
    visible: true,
  },
])

const layerCount = computed(() => activeLayers.value.length)

const bgOptions = [
  { value: '#0d1117', label: '深黑' },
  { value: '#1a1a2e', label: '深藍' },
  { value: '#1e293b', label: '石板' },
  { value: '#ffffff', label: '白色' },
]

// === 事件處理 ===
const onLoaded = ({ info, layerCount: lc, successCount }) => {
  statusText.value = `✅ ${lc} 個圖層，${successCount} 個載入成功`
  statusDetail.value = `總計 ${info.shapeCount} 個圖形 | ${info.sizeText}`
}

const onError = ({ message }) => {
  statusText.value = `❌ ${message}`
  statusDetail.value = ''
}

const onZoomChange = ({ zoom }) => {
  currentZoom.value = zoom
}

// === 多檔案上傳 ===
function handleFileUpload(event) {
  const files = Array.from(event.target.files)
  if (!files.length) return

  const newLayers = files.map((file, i) => {
    const colorIdx = (activeLayers.value.length + i) % LAYER_COLORS.length
    return {
      src: URL.createObjectURL(file),
      name: file.name,
      color: LAYER_COLORS[colorIdx],
      visible: true,
    }
  })

  // 追加到現有圖層（而非取代）
  activeLayers.value = [...activeLayers.value, ...newLayers]
  statusText.value = `載入 ${newLayers.length} 個新圖層...`

  // 重置 input 讓同一批檔案可再次選取
  event.target.value = ''
}

// === 圖層管理 ===
function updateLayerColor(index, color) {
  const updated = [...activeLayers.value]
  updated[index] = { ...updated[index], color }
  activeLayers.value = updated
}

function removeLayer(index) {
  activeLayers.value = activeLayers.value.filter((_, i) => i !== index)
}

function clearLayers() {
  activeLayers.value = []
}

// === API 文件資料 ===
const propsDoc = [
  { name: 'layers', type: 'Array', default: '[]', description: '多圖層定義陣列（優先於 src/gerberText），各層可獨立指定來源、顏色與名稱', highlight: true },
  { name: 'src', type: 'String', default: "''", description: '單一 Gerber URL（向下相容，建議改用 layers）' },
  { name: 'gerberText', type: 'String', default: "''", description: '單一 Gerber 原始文字（向下相容）' },
  { name: 'fillColor', type: 'String', default: "'#00ff88'", description: '單一模式填充色（向下相容）' },
  { name: 'backgroundColor', type: 'String', default: "'#1a1a2e'", description: 'SVG 背景色' },
  { name: 'showLayerPanel', type: 'Boolean', default: 'true', description: '顯示左側圖層面板（多圖層時自動顯示，可點擊切換顯示/隱藏）' },
  { name: 'showInfo', type: 'Boolean', default: 'true', description: '顯示左上角資訊面板（單位、圖形數、範圍）' },
  { name: 'showControls', type: 'Boolean', default: 'true', description: '顯示右下角縮放控制按鈕' },
  { name: 'autoResize', type: 'Boolean', default: 'true', description: '啟用 ResizeObserver 自動響應容器大小（resize 時不重新 fetch）' },
  { name: 'padding', type: 'Number', default: '20', description: '圖形與容器邊界的間距 (px)' },
  { name: 'maxZoom', type: 'Number', default: '200', description: '最大縮放倍率' },
  { name: 'minZoom', type: 'Number', default: '0.1', description: '最小縮放倍率' },
]

const layerFieldsDoc = [
  { field: 'src', type: 'string?', desc: 'Gerber 檔案 URL（與 gerberText 二擇一）' },
  { field: 'gerberText', type: 'string?', desc: '直接傳入 Gerber 原始文字' },
  { field: 'name', type: 'string', desc: '圖層顯示名稱（圖層面板中顯示）' },
  { field: 'color', type: 'string', desc: '圖層顏色（CSS 色碼，各層獨立）' },
  { field: 'visible', type: 'boolean?', desc: '初始是否顯示，預設 true' },
]

const eventsDoc = [
  { name: 'loaded', params: '{ info, layerCount, successCount }', description: '全部圖層渲染完成，info 含 units/shapeCount/sizeText，layerCount 為圖層總數，successCount 為成功載入數' },
  { name: 'error', params: '{ message }', description: '致命錯誤（所有圖層均失敗）時觸發' },
  { name: 'zoom-change', params: '{ zoom }', description: '縮放比例變化時觸發' },
]

const methodsDoc = [
  { name: 'zoomIn', description: '放大 1.5 倍' },
  { name: 'zoomOut', description: '縮小至 0.67 倍' },
  { name: 'resetView', description: '重置視角至初始狀態' },
  { name: 'reload', description: '重新載入並渲染所有圖層' },
  { name: 'toggleLayer', description: '切換指定圖層的顯示/隱藏（傳入圖層物件）' },
]

const usageExample = `<template>
  <!-- 多圖層模式（推薦）：模擬 EDA 工具的多層疊圖 -->
  <div style="width: 100%; height: 600px;">
    <GerberViewer
      :layers="pcbLayers"
      background-color="#0d1117"
      :show-layer-panel="true"
      @loaded="onLoaded"
    />
  </div>
</template>

<script setup>
import GerberViewer from '@/components/common/GerberViewer.vue'

const pcbLayers = [
  { src: '/board.gtl', name: '頂層銅箔 (Top Cu)',  color: '#00ff88', visible: true  },
  { src: '/board.gbl', name: '底層銅箔 (Bot Cu)',  color: '#4ecdc4', visible: true  },
  { src: '/board.gto', name: '頂層絲印 (Top Silk)',color: '#ffe66d', visible: true  },
  { src: '/board.gko', name: '板框 (Edge Cuts)',   color: '#ff6b6b', visible: true  },
  { src: '/board.drl', name: '鑽孔 (Drill)',       color: '#c0a0ff', visible: false },
]

const onLoaded = ({ info, layerCount, successCount }) => {
  console.log(\`\${layerCount} 個圖層，\${successCount} 成功 | \${info.shapeCount} 個圖形 | \${info.sizeText}\`)
}
<\/script>

<!-- ─── 向下相容：單一圖層仍可用舊寫法 ─── -->
<GerberViewer
  src="/board.gtl"
  fill-color="#00ff88"
  background-color="#0d1117"
/>`
</script>
