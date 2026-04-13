<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-8">
    <div class="w-full">

      <!-- 標題與簡介 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div class="border-l-4 border-teal-600 pl-6">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">PcbLayout</h1>
          <p class="text-lg text-gray-600 leading-relaxed">
            基於 <span class="font-semibold text-blue-600">D3.js</span> 的 Vue 3 PCB 佈局渲染元件，
            接受 <span class="font-semibold text-teal-600">結構化 JSON 資料</span>，
            渲染真實 PCB 圖形：
            <span class="font-semibold text-amber-600">板框、走線、焊盤、過孔、銅箔區域、元件外框、絲印</span>。
            支援
            <span class="font-semibold text-amber-600">多圖層管理</span>、
            <span class="font-semibold text-amber-600">滾輪縮放</span>、
            <span class="font-semibold text-amber-600">拖曳平移</span>、
            <span class="font-semibold text-amber-600">雙擊重置</span>。
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
            <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">D3.js</span>
            <span class="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">JSON Data</span>
            <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">多圖層 Multi-Layer</span>
            <span class="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">PCB Layout</span>
          </div>
        </div>
      </div>

      <!-- 互動展示區 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <span class="text-teal-600 mr-3">🖥️</span>
          互動展示
        </h2>
        <p class="text-gray-500 text-sm mb-6">
          左側圖層面板可點擊切換各層顯示。支援滾輪縮放、拖曳平移、雙擊重置視角。
        </p>

        <div class="grid lg:grid-cols-4 gap-6">
          <!-- PCB 視圖 (左側 3/4) -->
          <div class="lg:col-span-3 rounded-xl border border-gray-300 overflow-hidden flex flex-col">
            <!-- 頂部工具列 -->
            <div class="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-300 flex-shrink-0">
              <div class="flex items-center gap-3">
                <span class="text-teal-700 text-sm font-mono font-semibold">⚡ PCB Layout</span>
                <span class="text-gray-400">|</span>
                <span class="text-gray-500 text-xs font-mono">{{ statusText }}</span>
              </div>
              <span class="text-xs text-gray-500 font-mono">{{ zoomText }}</span>
            </div>

            <!-- 主體 -->
            <div class="flex-1" style="height: 560px;">
              <PcbLayout
                ref="viewerRef"
                :data="currentExample"
                :show-info="showInfo"
                :show-controls="true"
                :show-layer-panel="true"
                :auto-resize="true"
                :show-ref-des="showRefDes"
                :background-color="selectedBg"
                @loaded="onLoaded"
                @zoom-change="onZoomChange"
                @element-click="onElementClick"
                @element-hover="onElementHover"
              />
            </div>

            <!-- 底部狀態列 -->
            <div class="flex items-center justify-between px-4 py-1.5 bg-gray-100 border-t border-gray-300 flex-shrink-0">
              <span class="text-xs text-gray-500 font-mono">{{ hoverInfo || '—' }}</span>
              <span class="text-xs text-gray-400">滾輪縮放 · 拖曳平移 · 雙擊重置 · 點擊圖層切換顯示</span>
            </div>
          </div>

          <!-- 控制面板 (右側 1/4) -->
          <div class="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-200 space-y-5 flex flex-col">
            <h3 class="text-lg font-bold text-gray-800 flex items-center">
              <span class="mr-2">⚙️</span> 控制面板
            </h3>

            <!-- 切換範例 -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">範例選取</label>
              <div class="space-y-1.5">
                <button
                  v-for="(ex, key) in examples"
                  :key="key"
                  @click="currentKey = key"
                  class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border"
                  :class="currentKey === key
                    ? 'bg-teal-600 text-white border-teal-700'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-teal-50'"
                >
                  {{ ex.label }}
                </button>
              </div>
            </div>

            <!-- 背景色 -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">背景色</label>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="bg in bgOptions"
                  :key="bg.value"
                  @click="selectedBg = bg.value"
                  class="w-full aspect-square rounded-lg border-2 transition-all"
                  :class="selectedBg === bg.value ? 'border-teal-500 ring-2 ring-teal-300' : 'border-gray-300'"
                  :style="{ backgroundColor: bg.value }"
                  :title="bg.label"
                ></button>
              </div>
            </div>

            <!-- 選項 -->
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="showInfo" class="rounded border-gray-300 text-teal-600 focus:ring-teal-500">
                <span class="text-sm text-gray-700">顯示資訊面板</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="showRefDes" class="rounded border-gray-300 text-teal-600 focus:ring-teal-500">
                <span class="text-sm text-gray-700">顯示元件 RefDes</span>
              </label>
            </div>

            <!-- 點擊反饋 -->
            <div v-if="clickedElement" class="bg-white rounded-lg p-3 border border-teal-200">
              <div class="text-xs font-semibold text-teal-700 mb-1">已點擊元素</div>
              <pre class="text-xs text-gray-600 overflow-auto max-h-36 font-mono">{{ JSON.stringify(clickedElement, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- JSON 資料格式說明 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-orange-500 mr-3">📦</span>
          JSON 資料格式
        </h2>

        <div class="grid lg:grid-cols-2 gap-8">
          <!-- 簡易模式 -->
          <div>
            <h3 class="text-lg font-bold text-gray-800 mb-3">簡易模式（自動分層）</h3>
            <p class="text-sm text-gray-500 mb-3">不提供 <code class="text-teal-700">layers</code>，直接提供 <code class="text-teal-700">elements</code>，組件自動依 type 分組為圖層。</p>
            <pre class="bg-gray-900 text-green-400 rounded-xl p-5 text-sm font-mono overflow-auto max-h-72 leading-relaxed">{{ simpleFormat }}</pre>
          </div>

          <!-- 多圖層模式 -->
          <div>
            <h3 class="text-lg font-bold text-gray-800 mb-3">多圖層模式</h3>
            <p class="text-sm text-gray-500 mb-3">手動定義圖層名稱、顏色與元素，適合複雜 PCB。</p>
            <pre class="bg-gray-900 text-green-400 rounded-xl p-5 text-sm font-mono overflow-auto max-h-72 leading-relaxed">{{ layerFormat }}</pre>
          </div>
        </div>
      </div>

      <!-- 元素類型參考 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-purple-500 mr-3">📐</span>
          元素類型參考
        </h2>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-100 text-left">
                <th class="px-4 py-3 font-semibold text-gray-700 rounded-tl-lg">type</th>
                <th class="px-4 py-3 font-semibold text-gray-700">說明</th>
                <th class="px-4 py-3 font-semibold text-gray-700">必要欄位</th>
                <th class="px-4 py-3 font-semibold text-gray-700 rounded-tr-lg">可選欄位</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(row, i) in typeRef" :key="i" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-2.5 font-mono text-teal-700 font-semibold">{{ row.type }}</td>
                <td class="px-4 py-2.5 text-gray-600">{{ row.desc }}</td>
                <td class="px-4 py-2.5 font-mono text-xs text-gray-700">{{ row.required }}</td>
                <td class="px-4 py-2.5 font-mono text-xs text-gray-500">{{ row.optional }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Props API -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-blue-500 mr-3">🔧</span>
          Props
        </h2>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-100 text-left">
                <th class="px-4 py-3 font-semibold text-gray-700 rounded-tl-lg">Prop</th>
                <th class="px-4 py-3 font-semibold text-gray-700">型別</th>
                <th class="px-4 py-3 font-semibold text-gray-700">預設</th>
                <th class="px-4 py-3 font-semibold text-gray-700 rounded-tr-lg">說明</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(p, i) in propsRef" :key="i" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-2.5 font-mono text-blue-700 font-semibold">{{ p.name }}</td>
                <td class="px-4 py-2.5 font-mono text-xs text-purple-600">{{ p.type }}</td>
                <td class="px-4 py-2.5 font-mono text-xs text-gray-500">{{ p.default }}</td>
                <td class="px-4 py-2.5 text-gray-600">{{ p.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Events -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-rose-500 mr-3">⚡</span>
          Events
        </h2>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-100 text-left">
                <th class="px-4 py-3 font-semibold text-gray-700 rounded-tl-lg">事件名稱</th>
                <th class="px-4 py-3 font-semibold text-gray-700">Payload</th>
                <th class="px-4 py-3 font-semibold text-gray-700 rounded-tr-lg">說明</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(e, i) in eventsRef" :key="i" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-2.5 font-mono text-rose-600 font-semibold">{{ e.name }}</td>
                <td class="px-4 py-2.5 font-mono text-xs text-gray-600">{{ e.payload }}</td>
                <td class="px-4 py-2.5 text-gray-600">{{ e.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import PcbLayout from '../../components/common/PcbLayout.vue'

// ===== 狀態 =====
const viewerRef = ref(null)
const currentKey = ref('basic')
const selectedBg = ref('#1a1a2e')
const showInfo = ref(true)
const showRefDes = ref(true)
const clickedElement = ref(null)
const hoverInfo = ref('')
const statusText = ref('就緒')
const zoomText = ref('')

const bgOptions = [
  { label: '深藍', value: '#1a1a2e' },
  { label: '深黑', value: '#0d0d0d' },
  { label: '深綠', value: '#0a1a0a' },
  { label: '白色', value: '#f0f0f0' },
]

// ===== 範例資料 =====

// 基礎範例
const basicData = {
  board: { width: 50, height: 40, units: 'mm' },
  elements: [
    // 板框
    { type: 'outline', path: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 40 }, { x: 0, y: 40 }] },
    // 焊盤
    { type: 'pad', x: 10, y: 10, shape: 'circle', width: 1.6, drill: 0.8 },
    { type: 'pad', x: 10, y: 15, shape: 'circle', width: 1.6, drill: 0.8 },
    { type: 'pad', x: 10, y: 20, shape: 'rect', width: 1.8, height: 1.0 },
    { type: 'pad', x: 10, y: 25, shape: 'rect', width: 1.8, height: 1.0 },
    { type: 'pad', x: 40, y: 10, shape: 'oblong', width: 2.5, height: 1.2 },
    { type: 'pad', x: 40, y: 15, shape: 'oblong', width: 2.5, height: 1.2 },
    { type: 'pad', x: 40, y: 20, shape: 'circle', width: 1.6, drill: 0.8 },
    { type: 'pad', x: 40, y: 25, shape: 'circle', width: 1.6, drill: 0.8 },
    // 走線
    { type: 'trace', x1: 10, y1: 10, x2: 25, y2: 10, width: 0.25 },
    { type: 'trace', x1: 25, y1: 10, x2: 25, y2: 20, width: 0.25 },
    { type: 'trace', x1: 25, y1: 20, x2: 40, y2: 20, width: 0.25 },
    { type: 'trace', x1: 10, y1: 15, x2: 20, y2: 15, width: 0.2 },
    { type: 'trace', x1: 20, y1: 15, x2: 20, y2: 25, width: 0.2 },
    { type: 'trace', x1: 20, y1: 25, x2: 40, y2: 25, width: 0.2 },
    { type: 'trace', x1: 10, y1: 20, x2: 30, y2: 20, width: 0.3 },
    { type: 'trace', x1: 30, y1: 20, x2: 30, y2: 10, width: 0.3 },
    { type: 'trace', x1: 30, y1: 10, x2: 40, y2: 10, width: 0.3 },
    { type: 'trace', x1: 10, y1: 25, x2: 15, y2: 25, width: 0.2 },
    { type: 'trace', x1: 15, y1: 25, x2: 15, y2: 15, width: 0.2 },
    { type: 'trace', x1: 15, y1: 15, x2: 40, y2: 15, width: 0.2 },
    // 過孔
    { type: 'via', x: 25, y: 20, outerDia: 0.8, innerDia: 0.4 },
    { type: 'via', x: 30, y: 10, outerDia: 0.8, innerDia: 0.4 },
    // 元件
    { type: 'component', refDes: 'U1', x: 10, y: 17.5, width: 5, height: 18, rotation: 0 },
    { type: 'component', refDes: 'U2', x: 40, y: 17.5, width: 5, height: 18, rotation: 0 },
  ],
}

// 複雜範例（多圖層）
const complexData = {
  board: { width: 80, height: 60, units: 'mm' },
  layers: [
    {
      name: 'Board Outline',
      color: '#16a34a',
      elements: [
        { type: 'outline', path: [
          { x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 60 },
          { x: 0, y: 60 },
        ]},
        // 鎖孔
        { type: 'via', x: 4, y: 4, outerDia: 3.5, innerDia: 3.2 },
        { type: 'via', x: 76, y: 4, outerDia: 3.5, innerDia: 3.2 },
        { type: 'via', x: 4, y: 56, outerDia: 3.5, innerDia: 3.2 },
        { type: 'via', x: 76, y: 56, outerDia: 3.5, innerDia: 3.2 },
      ],
    },
    {
      name: 'Top Copper',
      color: '#ff4444',
      elements: [
        // IC 焊盤群 (QFP)
        ...generateQfpPads(25, 30, 10, 10, 0.5, 0.3, 2.0),
        // 電阻焊盤
        { type: 'pad', x: 50, y: 15, shape: 'rect', width: 1.0, height: 0.5 },
        { type: 'pad', x: 53, y: 15, shape: 'rect', width: 1.0, height: 0.5 },
        { type: 'pad', x: 50, y: 18, shape: 'rect', width: 1.0, height: 0.5 },
        { type: 'pad', x: 53, y: 18, shape: 'rect', width: 1.0, height: 0.5 },
        { type: 'pad', x: 50, y: 21, shape: 'rect', width: 1.0, height: 0.5 },
        { type: 'pad', x: 53, y: 21, shape: 'rect', width: 1.0, height: 0.5 },
        // 電容焊盤
        { type: 'pad', x: 60, y: 30, shape: 'rect', width: 1.2, height: 0.6 },
        { type: 'pad', x: 63, y: 30, shape: 'rect', width: 1.2, height: 0.6 },
        { type: 'pad', x: 60, y: 34, shape: 'rect', width: 1.2, height: 0.6 },
        { type: 'pad', x: 63, y: 34, shape: 'rect', width: 1.2, height: 0.6 },
        // 連接器
        { type: 'pad', x: 70, y: 20, shape: 'circle', width: 1.8, drill: 1.0 },
        { type: 'pad', x: 70, y: 22.54, shape: 'circle', width: 1.8, drill: 1.0 },
        { type: 'pad', x: 70, y: 25.08, shape: 'circle', width: 1.8, drill: 1.0 },
        { type: 'pad', x: 70, y: 27.62, shape: 'circle', width: 1.8, drill: 1.0 },
        { type: 'pad', x: 70, y: 30.16, shape: 'circle', width: 1.8, drill: 1.0 },
        { type: 'pad', x: 70, y: 32.70, shape: 'circle', width: 1.8, drill: 1.0 },
      ],
    },
    {
      name: 'Top Traces',
      color: '#4ecdc4',
      elements: [
        // IC → 電阻走線
        { type: 'trace', x1: 30, y1: 25, x2: 40, y2: 25, width: 0.2 },
        { type: 'trace', x1: 40, y1: 25, x2: 40, y2: 15, width: 0.2 },
        { type: 'trace', x1: 40, y1: 15, x2: 50, y2: 15, width: 0.2 },
        { type: 'trace', x1: 30, y1: 27, x2: 42, y2: 27, width: 0.2 },
        { type: 'trace', x1: 42, y1: 27, x2: 42, y2: 18, width: 0.2 },
        { type: 'trace', x1: 42, y1: 18, x2: 50, y2: 18, width: 0.2 },
        // 電阻 → 連接器
        { type: 'trace', x1: 53, y1: 15, x2: 65, y2: 15, width: 0.2 },
        { type: 'trace', x1: 65, y1: 15, x2: 65, y2: 20, width: 0.2 },
        { type: 'trace', x1: 65, y1: 20, x2: 70, y2: 20, width: 0.2 },
        { type: 'trace', x1: 53, y1: 18, x2: 66, y2: 18, width: 0.2 },
        { type: 'trace', x1: 66, y1: 18, x2: 66, y2: 22.54, width: 0.2 },
        { type: 'trace', x1: 66, y1: 22.54, x2: 70, y2: 22.54, width: 0.2 },
        // IC → 電容
        { type: 'trace', x1: 30, y1: 30, x2: 45, y2: 30, width: 0.25 },
        { type: 'trace', x1: 45, y1: 30, x2: 60, y2: 30, width: 0.25 },
        { type: 'trace', x1: 30, y1: 34, x2: 45, y2: 34, width: 0.25 },
        { type: 'trace', x1: 45, y1: 34, x2: 60, y2: 34, width: 0.25 },
        // 電容 → 連接器
        { type: 'trace', x1: 63, y1: 30, x2: 70, y2: 30.16, width: 0.2 },
        { type: 'trace', x1: 63, y1: 34, x2: 67, y2: 34, width: 0.2 },
        { type: 'trace', x1: 67, y1: 34, x2: 67, y2: 32.70, width: 0.2 },
        { type: 'trace', x1: 67, y1: 32.70, x2: 70, y2: 32.70, width: 0.2 },
        // 電源走線（較粗）
        { type: 'trace', x1: 10, y1: 50, x2: 25, y2: 50, width: 0.5 },
        { type: 'trace', x1: 25, y1: 50, x2: 25, y2: 35, width: 0.5 },
        { type: 'trace', x1: 10, y1: 48, x2: 20, y2: 48, width: 0.5 },
        { type: 'trace', x1: 20, y1: 48, x2: 20, y2: 35, width: 0.5 },
      ],
    },
    {
      name: 'Ground Plane',
      color: '#00ff88',
      visible: true,
      elements: [
        { type: 'region', path: [
          { x: 8, y: 42 }, { x: 35, y: 42 }, { x: 35, y: 55 },
          { x: 8, y: 55 },
        ]},
        { type: 'region', path: [
          { x: 55, y: 40 }, { x: 75, y: 40 }, { x: 75, y: 55 },
          { x: 55, y: 55 },
        ]},
      ],
    },
    {
      name: 'Vias',
      color: '#ff6b6b',
      elements: [
        { type: 'via', x: 40, y: 25, outerDia: 0.8, innerDia: 0.4 },
        { type: 'via', x: 42, y: 27, outerDia: 0.8, innerDia: 0.4 },
        { type: 'via', x: 45, y: 30, outerDia: 0.8, innerDia: 0.4 },
        { type: 'via', x: 45, y: 34, outerDia: 0.8, innerDia: 0.4 },
        { type: 'via', x: 25, y: 42, outerDia: 0.6, innerDia: 0.3 },
        { type: 'via', x: 30, y: 42, outerDia: 0.6, innerDia: 0.3 },
        { type: 'via', x: 60, y: 40, outerDia: 0.6, innerDia: 0.3 },
        { type: 'via', x: 65, y: 40, outerDia: 0.6, innerDia: 0.3 },
      ],
    },
    {
      name: 'Silkscreen',
      color: '#ffffff',
      elements: [
        { type: 'component', refDes: 'U1', x: 25, y: 30, width: 12, height: 12, rotation: 0 },
        { type: 'component', refDes: 'R1', x: 51.5, y: 15, width: 4, height: 2, rotation: 0 },
        { type: 'component', refDes: 'R2', x: 51.5, y: 18, width: 4, height: 2, rotation: 0 },
        { type: 'component', refDes: 'R3', x: 51.5, y: 21, width: 4, height: 2, rotation: 0 },
        { type: 'component', refDes: 'C1', x: 61.5, y: 30, width: 4, height: 2.5, rotation: 0 },
        { type: 'component', refDes: 'C2', x: 61.5, y: 34, width: 4, height: 2.5, rotation: 0 },
        { type: 'component', refDes: 'J1', x: 70, y: 26, width: 4, height: 16, rotation: 0 },
        { type: 'silk', text: 'PWR', x: 12, y: 50, fontSize: 1.5 },
        { type: 'silk', text: 'GND', x: 12, y: 48, fontSize: 1.5 },
      ],
    },
  ],
}

// LED 閃燈板範例
const ledBoardData = {
  board: { width: 30, height: 20, units: 'mm' },
  elements: [
    { type: 'outline', path: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 0, y: 20 }] },
    // LED 焊盤
    { type: 'pad', x: 8, y: 10, shape: 'rect', width: 1.2, height: 0.8 },
    { type: 'pad', x: 11, y: 10, shape: 'rect', width: 1.2, height: 0.8 },
    { type: 'pad', x: 15, y: 10, shape: 'rect', width: 1.2, height: 0.8 },
    { type: 'pad', x: 18, y: 10, shape: 'rect', width: 1.2, height: 0.8 },
    { type: 'pad', x: 22, y: 10, shape: 'rect', width: 1.2, height: 0.8 },
    { type: 'pad', x: 25, y: 10, shape: 'rect', width: 1.2, height: 0.8 },
    // 電阻焊盤
    { type: 'pad', x: 8, y: 5, shape: 'rect', width: 0.8, height: 0.5 },
    { type: 'pad', x: 10.5, y: 5, shape: 'rect', width: 0.8, height: 0.5 },
    { type: 'pad', x: 15, y: 5, shape: 'rect', width: 0.8, height: 0.5 },
    { type: 'pad', x: 17.5, y: 5, shape: 'rect', width: 0.8, height: 0.5 },
    { type: 'pad', x: 22, y: 5, shape: 'rect', width: 0.8, height: 0.5 },
    { type: 'pad', x: 24.5, y: 5, shape: 'rect', width: 0.8, height: 0.5 },
    // 走線
    { type: 'trace', x1: 11, y1: 10, x2: 11, y2: 7, width: 0.2 },
    { type: 'trace', x1: 11, y1: 7, x2: 10.5, y2: 7, width: 0.2 },
    { type: 'trace', x1: 10.5, y1: 7, x2: 10.5, y2: 5, width: 0.2 },
    { type: 'trace', x1: 18, y1: 10, x2: 18, y2: 7, width: 0.2 },
    { type: 'trace', x1: 18, y1: 7, x2: 17.5, y2: 7, width: 0.2 },
    { type: 'trace', x1: 17.5, y1: 7, x2: 17.5, y2: 5, width: 0.2 },
    { type: 'trace', x1: 25, y1: 10, x2: 25, y2: 7, width: 0.2 },
    { type: 'trace', x1: 25, y1: 7, x2: 24.5, y2: 7, width: 0.2 },
    { type: 'trace', x1: 24.5, y1: 7, x2: 24.5, y2: 5, width: 0.2 },
    // 電源匯流
    { type: 'trace', x1: 3, y1: 15, x2: 8, y2: 15, width: 0.4 },
    { type: 'trace', x1: 8, y1: 15, x2: 8, y2: 10, width: 0.4 },
    { type: 'trace', x1: 8, y1: 15, x2: 15, y2: 15, width: 0.4 },
    { type: 'trace', x1: 15, y1: 15, x2: 15, y2: 10, width: 0.4 },
    { type: 'trace', x1: 15, y1: 15, x2: 22, y2: 15, width: 0.4 },
    { type: 'trace', x1: 22, y1: 15, x2: 22, y2: 10, width: 0.4 },
    // GND
    { type: 'trace', x1: 3, y1: 3, x2: 8, y2: 3, width: 0.4 },
    { type: 'trace', x1: 8, y1: 3, x2: 8, y2: 5, width: 0.4 },
    { type: 'trace', x1: 8, y1: 3, x2: 15, y2: 3, width: 0.4 },
    { type: 'trace', x1: 15, y1: 3, x2: 15, y2: 5, width: 0.4 },
    { type: 'trace', x1: 15, y1: 3, x2: 22, y2: 3, width: 0.4 },
    { type: 'trace', x1: 22, y1: 3, x2: 22, y2: 5, width: 0.4 },
    // 電源連接器
    { type: 'pad', x: 3, y: 15, shape: 'circle', width: 2.0, drill: 1.0 },
    { type: 'pad', x: 3, y: 3, shape: 'circle', width: 2.0, drill: 1.0 },
    // 元件標籤
    { type: 'component', refDes: 'LED1', x: 9.5, y: 10, width: 4, height: 2, rotation: 0 },
    { type: 'component', refDes: 'LED2', x: 16.5, y: 10, width: 4, height: 2, rotation: 0 },
    { type: 'component', refDes: 'LED3', x: 23.5, y: 10, width: 4, height: 2, rotation: 0 },
    { type: 'component', refDes: 'R1', x: 9.25, y: 5, width: 3.5, height: 1.5, rotation: 0 },
    { type: 'component', refDes: 'R2', x: 16.25, y: 5, width: 3.5, height: 1.5, rotation: 0 },
    { type: 'component', refDes: 'R3', x: 23.25, y: 5, width: 3.5, height: 1.5, rotation: 0 },
    // 絲印
    { type: 'silk', text: 'VCC', x: 3, y: 17, fontSize: 1.0 },
    { type: 'silk', text: 'GND', x: 3, y: 1, fontSize: 1.0 },
  ],
}

const examples = {
  basic: { label: '基礎範例', data: basicData },
  complex: { label: '複雜多圖層', data: complexData },
  led: { label: 'LED 閃燈板', data: ledBoardData },
}

const currentExample = computed(() => examples[currentKey.value].data)

// ===== QFP pad 生成器 =====
function generateQfpPads(cx, cy, w, h, pitch, padW, padH) {
  const pads = []
  const halfW = w / 2, halfH = h / 2
  const count = Math.floor(w / pitch)

  // 上排
  for (let i = 0; i < count; i++) {
    pads.push({ type: 'pad', x: cx - halfW + i * pitch + pitch / 2, y: cy + halfH + padH / 2, shape: 'rect', width: padW, height: padH })
  }
  // 下排
  for (let i = 0; i < count; i++) {
    pads.push({ type: 'pad', x: cx - halfW + i * pitch + pitch / 2, y: cy - halfH - padH / 2, shape: 'rect', width: padW, height: padH })
  }
  // 左排
  const countV = Math.floor(h / pitch)
  for (let i = 0; i < countV; i++) {
    pads.push({ type: 'pad', x: cx - halfW - padH / 2, y: cy - halfH + i * pitch + pitch / 2, shape: 'rect', width: padH, height: padW })
  }
  // 右排
  for (let i = 0; i < countV; i++) {
    pads.push({ type: 'pad', x: cx + halfW + padH / 2, y: cy - halfH + i * pitch + pitch / 2, shape: 'rect', width: padH, height: padW })
  }
  return pads
}

// ===== 事件處理 =====
function onLoaded(info) {
  statusText.value = `已載入 ${info.info?.elementCount || 0} 個圖形`
}

function onZoomChange({ zoom }) {
  zoomText.value = `${(zoom * 100).toFixed(0)}%`
}

function onElementClick({ data }) {
  clickedElement.value = data
}

function onElementHover(info) {
  if (!info) {
    hoverInfo.value = ''
    return
  }
  const d = info.data
  if (d.refDes) hoverInfo.value = `${d.type}: ${d.refDes}`
  else if (d.type === 'trace') hoverInfo.value = `trace: (${d.x1},${d.y1})→(${d.x2},${d.y2}) w=${d.width || '?'}`
  else if (d.type === 'pad') hoverInfo.value = `pad: ${d.shape} @ (${d.x},${d.y}) ${d.width}×${d.height || d.width}`
  else hoverInfo.value = `${d.type}`
}

// ===== 文件資料 =====

const simpleFormat = `{
  board: { width: 50, height: 40, units: 'mm' },
  elements: [
    { type: 'outline', path: [{x:0,y:0}, {x:50,y:0}, ...] },
    { type: 'pad', x:10, y:10, shape:'circle', width:1.6, drill:0.8 },
    { type: 'trace', x1:10, y1:10, x2:40, y2:10, width:0.25 },
    { type: 'via', x:25, y:20, outerDia:0.8, innerDia:0.4 },
    { type: 'region', path: [{x:5,y:5}, {x:45,y:5}, ...] },
    { type: 'component', refDes:'U1', x:25, y:20, width:10, height:10 },
    { type: 'silk', text:'VCC', x:10, y:35, fontSize:1.0 },
  ]
}`

const layerFormat = `{
  board: { width: 80, height: 60, units: 'mm' },
  layers: [
    {
      name: 'Board Outline',
      color: '#16a34a',
      elements: [
        { type: 'outline', path: [...] },
      ]
    },
    {
      name: 'Top Copper',
      color: '#ff4444',
      visible: true,
      elements: [
        { type: 'pad', ... },
        { type: 'trace', ... },
      ]
    },
    ...
  ]
}`

const typeRef = [
  { type: 'outline', desc: '板框線條', required: 'path: [{x, y}, ...]', optional: 'width' },
  { type: 'trace', desc: '走線', required: 'x1, y1, x2, y2', optional: 'width (預設 0.2)' },
  { type: 'pad', desc: '焊盤', required: 'x, y, shape, width', optional: 'height, drill' },
  { type: 'via', desc: '過孔', required: 'x, y, outerDia, innerDia', optional: '—' },
  { type: 'region', desc: '銅箔/填充區域', required: 'path: [{x, y}, ...]', optional: '—' },
  { type: 'component', desc: '元件外框', required: 'refDes, x, y, width, height', optional: 'rotation' },
  { type: 'silk', desc: '絲印（線條或文字）', required: 'path 或 (text + x + y)', optional: 'width, fontSize' },
]

const propsRef = [
  { name: 'data', type: 'Object', default: '(required)', desc: 'PCB 結構化 JSON 資料' },
  { name: 'backgroundColor', type: 'String', default: '#1a1a2e', desc: '背景色' },
  { name: 'colorMap', type: 'Object', default: '{}', desc: '自訂顏色映射 { type: color }' },
  { name: 'showInfo', type: 'Boolean', default: 'true', desc: '顯示左上角資訊面板' },
  { name: 'showControls', type: 'Boolean', default: 'true', desc: '顯示縮放按鈕' },
  { name: 'showLayerPanel', type: 'Boolean', default: 'true', desc: '顯示左側圖層面板' },
  { name: 'autoResize', type: 'Boolean', default: 'true', desc: '自動響應容器 resize' },
  { name: 'padding', type: 'Number', default: '20', desc: '邊距 (px)' },
  { name: 'maxZoom', type: 'Number', default: '200', desc: '最大縮放倍率' },
  { name: 'minZoom', type: 'Number', default: '0.1', desc: '最小縮放倍率' },
  { name: 'defaultTraceWidth', type: 'Number', default: '0.2', desc: '預設走線寬度 (mm)' },
  { name: 'defaultPadSize', type: 'Number', default: '0.6', desc: '預設焊盤大小 (mm)' },
  { name: 'showRefDes', type: 'Boolean', default: 'true', desc: '顯示元件 RefDes 標籤' },
]

const eventsRef = [
  { name: 'loaded', payload: '{ info, layerCount }', desc: '資料載入完成' },
  { name: 'error', payload: '{ message }', desc: '載入或渲染發生錯誤' },
  { name: 'zoom-change', payload: '{ zoom }', desc: '縮放比例變化' },
  { name: 'element-click', payload: '{ event, data }', desc: '點擊元素' },
  { name: 'element-hover', payload: '{ event, data } | null', desc: '滑鼠 hover 元素或離開' },
]
</script>
