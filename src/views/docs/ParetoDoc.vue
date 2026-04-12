<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-8">
    <div class="w-full">
      
      <!-- 標題與簡介 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div class="border-l-4 border-blue-600 pl-6">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            EnterprisePareto
          </h1>
          <p class="text-lg text-gray-600 leading-relaxed">
            一個基於 <span class="font-semibold text-blue-600">D3.js</span> 的企業級柏拉圖組件，
            結合<span class="font-semibold">長條圖</span>與
            <span class="font-semibold text-purple-600">累積百分比曲線</span>，
            支援 <span class="font-semibold text-pink-600">雙 Y 軸刻度</span>、
            <span class="font-semibold text-orange-600">可配置參考線</span>，
            以及 <span class="font-semibold text-green-600">ResizeObserver 自動響應式</span>尺寸調整。
            適用於品質分析、缺陷分析、ABC 分類等場景，遵循 80/20 法則進行數據洞察。
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
            <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">D3.js</span>
            <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Composition API</span>
            <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
            <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✅ 已完成</span>
          </div>
        </div>
      </div>

      <!-- 互動操場 (Interactive Playground) -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-blue-600 mr-3">🎮</span>
          互動操場 (Interactive Playground)
        </h2>
        
        <div class="grid lg:grid-cols-3 gap-6">
          <!-- 圖表區域 (左側 2/3) -->
          <div class="lg:col-span-2 bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
            <div style="width: 100%; height: 500px;">
              <EnterprisePareto
                :data="paretoData"
                :auto-resize="true"
                :category-field="playgroundCategoryField"
                :value-field="playgroundValueField"
                :title="playgroundTitle"
                :show-values-on-bars="playgroundShowValuesOnBars"
                :show-cumulative-line="playgroundShowCumulativeLine"
                :show-cumulative-points="playgroundShowCumulativePoints"
                :show-reference-line="playgroundShowReferenceLine"
                :reference-line-percent="playgroundReferenceLinePercent"
                :enable-threshold-filter="playgroundEnableThresholdFilter"
                :bar-color="playgroundBarColor"
                :line-color="playgroundLineColor"
                :point-fill-color="playgroundLineColor"
                :bar-padding="playgroundBarPadding"
                :bar-corner-radius="playgroundBarCornerRadius"
                :animation-duration="playgroundAnimationDuration"
                @bar-click="handleBarClick"
                @bar-hover="handleBarHover"
                @tooltip-hide="handleTooltipHide"
              >
                <template #tooltip="{ tooltipData }">
                  <CommonTooltip
                    v-if="shouldShowTooltip && tooltipData"
                    :visible="true"
                    :position="tooltipPosition"
                    :data="formatTooltipData(tooltipData)"
                    theme="light"
                    :show-arrow="false"
                    :offset="{ x: 15, y: -10 }"
                    max-width="sm"
                    strategy="fixed"
                  />
                </template>
              </EnterprisePareto>
            </div>
          </div>

          <!-- 控制面板 (右側 1/3) -->
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">⚙️</span>
              控制面板
            </h3>
            
            <div class="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              <!-- 標題 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">圖表標題</label>
                <input
                  v-model="playgroundTitle"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="輸入標題..."
                />
              </div>

              <!-- 顯示數值 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">顯示長條數值</label>
                <button
                  @click="playgroundShowValuesOnBars = !playgroundShowValuesOnBars"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundShowValuesOnBars ? 'bg-blue-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundShowValuesOnBars ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- 顯示累積曲線 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">顯示累積曲線</label>
                <button
                  @click="playgroundShowCumulativeLine = !playgroundShowCumulativeLine"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundShowCumulativeLine ? 'bg-purple-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundShowCumulativeLine ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- 顯示累積點 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">顯示累積點</label>
                <button
                  @click="playgroundShowCumulativePoints = !playgroundShowCumulativePoints"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundShowCumulativePoints ? 'bg-green-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundShowCumulativePoints ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- 顯示參考線 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">顯示參考線</label>
                <button
                  @click="playgroundShowReferenceLine = !playgroundShowReferenceLine"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundShowReferenceLine ? 'bg-orange-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundShowReferenceLine ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- 啟用閾值過濾 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">啟用閾值過濾 (Other)</label>
                <button
                  @click="playgroundEnableThresholdFilter = !playgroundEnableThresholdFilter"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundEnableThresholdFilter ? 'bg-pink-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundEnableThresholdFilter ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>
              <p v-if="playgroundEnableThresholdFilter" class="text-xs text-gray-500 -mt-2">
                ℹ️ 累積百分比超過參考線的項目將歸類為 "Other"
              </p>

              <!-- 參考線百分比 -->
              <div v-if="playgroundShowReferenceLine">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  參考線百分比: <span class="text-orange-600 font-semibold">{{ playgroundReferenceLinePercent }}%</span>
                </label>
                <input
                  v-model.number="playgroundReferenceLinePercent"
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <!-- 長條顏色 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">長條顏色</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model="playgroundBarColor"
                    type="color"
                    class="h-10 w-20 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    v-model="playgroundBarColor"
                    type="text"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              </div>

              <!-- 曲線顏色 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">曲線顏色</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model="playgroundLineColor"
                    type="color"
                    class="h-10 w-20 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    v-model="playgroundLineColor"
                    type="text"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              </div>

              <!-- 長條間距 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  長條間距: <span class="text-blue-600 font-semibold">{{ playgroundBarPadding.toFixed(2) }}</span>
                </label>
                <input
                  v-model.number="playgroundBarPadding"
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <!-- 長條圓角 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  長條圓角: <span class="text-blue-600 font-semibold">{{ playgroundBarCornerRadius }}px</span>
                </label>
                <input
                  v-model.number="playgroundBarCornerRadius"
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <!-- 動畫時長 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  動畫時長: <span class="text-blue-600 font-semibold">{{ playgroundAnimationDuration }}ms</span>
                </label>
                <input
                  v-model.number="playgroundAnimationDuration"
                  type="range"
                  min="0"
                  max="2000"
                  step="100"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <!-- 生成新數據按鈕 -->
              <button
                @click="generateRandomData"
                class="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105"
              >
                🎲 生成新數據
              </button>
            </div>
          </div>
        </div>

        <!-- 事件日誌 -->
        <div class="mt-6 bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span class="mr-2">📋</span>
            事件日誌
          </h3>
          <div class="bg-white rounded-lg p-4 font-mono text-sm max-h-40 overflow-y-auto">
            <div v-if="eventLog.length === 0" class="text-gray-400 text-center py-2">
              暫無事件...
            </div>
            <div v-for="(log, index) in eventLog" :key="index" class="text-gray-700 py-1 border-b border-gray-100 last:border-0">
              {{ log }}
            </div>
          </div>
        </div>
      </div>

      <!-- 使用範例 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-green-600 mr-3">💡</span>
          使用範例
        </h2>

        <!-- 基礎用法 -->
        <div class="mb-8">
          <h3 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span class="text-blue-500 mr-2">▸</span>
            基礎用法
          </h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm leading-relaxed"><code>&lt;template&gt;
  &lt;div style="width: 100%; height: 400px;"&gt;
    &lt;EnterprisePareto
      :data="paretoData"
      category-field="category"
      value-field="count"
      title="產品缺陷柏拉圖"
    /&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import EnterprisePareto from '@/components/common/EnterprisePareto.vue';

const paretoData = ref([
  { category: '刮傷', count: 45 },
  { category: '氣泡', count: 32 },
  { category: '變色', count: 28 },
  { category: '破損', count: 15 },
  { category: '其他', count: 8 }
]);
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 自定義樣式 -->
        <div class="mb-8">
          <h3 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span class="text-purple-500 mr-2">▸</span>
            自定義樣式與參考線
          </h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm leading-relaxed"><code>&lt;EnterprisePareto
  :data="salesData"
  category-field="product"
  value-field="sales"
  title="產品銷售分析"
  :show-reference-line="true"
  :reference-line-percent="80"
  bar-color="#3b82f6"
  line-color="#8b5cf6"
  :bar-padding="0.3"
  :bar-corner-radius="6"
  :show-values-on-bars="true"
  :animation-duration="800"
/&gt;</code></pre>
          </div>
        </div>

        <!-- 事件處理 -->
        <div>
          <h3 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span class="text-orange-500 mr-2">▸</span>
            事件處理
          </h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm leading-relaxed"><code>&lt;EnterprisePareto
  :data="paretoData"
  category-field="category"
  value-field="count"
  @bar-click="handleBarClick"
  @bar-hover="handleBarHover"
  @point-click="handlePointClick"
&gt;
  &lt;template #tooltip="{ tooltipData }"&gt;
    &lt;div v-if="tooltipData" class="custom-tooltip"&gt;
      &lt;h4&gt;&#123;&#123; tooltipData.category &#125;&#125;&lt;/h4&gt;
      &lt;p&gt;數量: &#123;&#123; tooltipData.count &#125;&#125;&lt;/p&gt;
      &lt;p&gt;累積: &#123;&#123; tooltipData.cumulative &#125;&#125;%&lt;/p&gt;
    &lt;/div&gt;
  &lt;/template&gt;
&lt;/EnterprisePareto&gt;

&lt;script setup&gt;
const handleBarClick = ({ data }) => {
  console.log('點擊長條:', data);
};

const handleBarHover = ({ data, event }) => {
  console.log('懸停長條:', data);
};
&lt;/script&gt;</code></pre>
          </div>
        </div>
      </div>

      <!-- Props API -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-blue-600 mr-3">⚙️</span>
          Props API
        </h2>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">屬性名稱</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類型</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">預設值</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">說明</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">data</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">Array</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">[]</td>
                <td class="px-6 py-4 text-sm text-gray-700">數據陣列</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">category-field</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">String</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">'category'</td>
                <td class="px-6 py-4 text-sm text-gray-700">分類欄位名稱</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">value-field</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">String</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">'value'</td>
                <td class="px-6 py-4 text-sm text-gray-700">數值欄位名稱</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">title</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">String</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">''</td>
                <td class="px-6 py-4 text-sm text-gray-700">圖表標題</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">show-values-on-bars</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">Boolean</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">false</td>
                <td class="px-6 py-4 text-sm text-gray-700">是否在長條上顯示數值</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">show-cumulative-line</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">Boolean</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">true</td>
                <td class="px-6 py-4 text-sm text-gray-700">是否顯示累積百分比曲線</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">show-cumulative-points</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">Boolean</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">true</td>
                <td class="px-6 py-4 text-sm text-gray-700">是否顯示累積曲線上的點</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">show-reference-line</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">Boolean</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">true</td>
                <td class="px-6 py-4 text-sm text-gray-700">是否顯示參考線（如 80% 線）</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">reference-line-percent</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">Number</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">80</td>
                <td class="px-6 py-4 text-sm text-gray-700">參考線百分比 (0-100)</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">bar-color</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">String</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">'#3b82f6'</td>
                <td class="px-6 py-4 text-sm text-gray-700">長條顏色</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">line-color</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">String</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">'#ef4444'</td>
                <td class="px-6 py-4 text-sm text-gray-700">累積曲線顏色</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">bar-padding</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">Number</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">0.2</td>
                <td class="px-6 py-4 text-sm text-gray-700">長條間距 (0-1)</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">bar-corner-radius</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">Number</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">4</td>
                <td class="px-6 py-4 text-sm text-gray-700">長條圓角半徑</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">animation-duration</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">Number</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">500</td>
                <td class="px-6 py-4 text-sm text-gray-700">動畫持續時間 (ms)</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">auto-resize</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">Boolean</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">true</td>
                <td class="px-6 py-4 text-sm text-gray-700">自動響應式調整大小</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Events API -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-purple-600 mr-3">📡</span>
          Events API
        </h2>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">事件名稱</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">參數</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">說明</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">bar-click</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ event, data }</td>
                <td class="px-6 py-4 text-sm text-gray-700">長條點擊事件</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">bar-hover</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ event, data }</td>
                <td class="px-6 py-4 text-sm text-gray-700">長條懸停事件</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">point-click</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ event, data }</td>
                <td class="px-6 py-4 text-sm text-gray-700">累積點點擊事件</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">point-hover</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ event, data }</td>
                <td class="px-6 py-4 text-sm text-gray-700">累積點懸停事件</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">chart-ready</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-mono">-</td>
                <td class="px-6 py-4 text-sm text-gray-700">圖表渲染完成</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 最佳實踐 -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-green-600 mr-3">✨</span>
          最佳實踐
        </h2>
        
        <div class="space-y-6">
          <div class="border-l-4 border-blue-500 pl-6 py-2">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">📊 數據準備</h3>
            <p class="text-gray-600 leading-relaxed">
              確保數據已按數值降序排列，柏拉圖的核心概念是將項目從最重要到最不重要排序。
              組件會自動處理排序，但預先排序可以提高性能。
            </p>
          </div>

          <div class="border-l-4 border-purple-500 pl-6 py-2">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">🎨 色彩選擇</h3>
            <p class="text-gray-600 leading-relaxed">
              長條與曲線使用對比色可以更清楚地區分數值與累積百分比。
              建議長條使用冷色調（藍色），曲線使用暖色調（紅色、橙色）。
            </p>
          </div>

          <div class="border-l-4 border-orange-500 pl-6 py-2">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">📏 容器尺寸</h3>
            <p class="text-gray-600 leading-relaxed">
              建議容器最小高度為 300px，寬度至少 400px 以確保圖表可讀性。
              啟用 auto-resize 可自動適應容器大小變化。
            </p>
          </div>

          <div class="border-l-4 border-green-500 pl-6 py-2">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">🎯 80/20 法則</h3>
            <p class="text-gray-600 leading-relaxed">
              使用參考線標示 80% 累積百分比，快速識別造成 80% 問題的主要因素（通常是前 20% 的項目）。
              可根據需求調整參考線百分比（如 70%、90%）。
            </p>
          </div>

          <div class="border-l-4 border-red-500 pl-6 py-2">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">⚡ 性能優化</h3>
            <p class="text-gray-600 leading-relaxed">
              對於大量數據（超過 20 個類別），考慮只顯示 Top N 項目並將其餘歸類為「其他」，
              以保持圖表清晰且性能良好。
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import EnterprisePareto from '../../components/common/EnterprisePareto.vue';
import CommonTooltip from '../../components/common/CommonTooltip.vue';

// ========== 互動操場狀態 ==========
const playgroundTitle = ref('產品缺陷柏拉圖');
const playgroundCategoryField = ref('category');
const playgroundValueField = ref('count');
const playgroundShowValuesOnBars = ref(true);
const playgroundShowCumulativeLine = ref(true);
const playgroundShowCumulativePoints = ref(true);
const playgroundShowReferenceLine = ref(true);
const playgroundReferenceLinePercent = ref(80);
const playgroundEnableThresholdFilter = ref(true);
const playgroundBarColor = ref('#3b82f6');
const playgroundLineColor = ref('#ef4444');
const playgroundBarPadding = ref(0.2);
const playgroundBarCornerRadius = ref(4);
const playgroundAnimationDuration = ref(500);

// ========== 數據 ==========
const paretoData = ref([]);

// ========== Tooltip ==========
const tooltipVisible = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const tooltipData = ref(null);
const isTooltipPositionValid = ref(false);

const shouldShowTooltip = computed(() => {
  return tooltipVisible.value && isTooltipPositionValid.value;
});

// ========== 事件日誌 ==========
const eventLog = ref([]);

// ========== 生成隨機數據 ==========
const generateRandomData = () => {
  const defects = [
    '劃傷', '氣泡', '變色', '破損', '尺寸偏差',
    '污渍', '凹陷', '毛邊', '裂紋', '汙印',
    '顏色不均', '表面粗糙', '缺角', '標籤不清',
    '組裝不良', '尺寸過大', '包裝破損', '雜質'
  ];
  
  // 生成數據，前幾個項目數值較大，後面項目數值較小
  const data = defects.map((defect, index) => {
    let count;
    if (index === 0) {
      count = Math.floor(Math.random() * 50) + 100; // 100-150
    } else if (index === 1) {
      count = Math.floor(Math.random() * 40) + 60; // 60-100
    } else if (index === 2) {
      count = Math.floor(Math.random() * 30) + 40; // 40-70
    } else {
      count = Math.floor(Math.random() * 20) + 5; // 5-25
    }
    
    return {
      category: defect,
      count
    };
  });
  
  // 按數值降序排序
  paretoData.value = data.sort((a, b) => b.count - a.count);
  logEvent('🎲 數據已更新 (' + data.length + ' 個項目)');
};

// ========== 事件處理 ==========
const handleBarClick = ({ data }) => {
  if (!data) return;
  logEvent(`🖱️ 點擊長條: ${data[playgroundCategoryField.value]} (${data[playgroundValueField.value]})`);
};

const handleBarHover = ({ data, event }) => {
  if (!data || !event) return;
  tooltipPosition.value = {
    x: event.pageX,
    y: event.pageY
  };
  tooltipData.value = data;
  tooltipVisible.value = true;
  isTooltipPositionValid.value = true;
};

const handlePointClick = ({ data }) => {
  if (!data) return;
  logEvent(`🔵 點擊累積點: ${data.category} (累積 ${data.cumulativePercent?.toFixed(1)}%)`);
};

const handlePointHover = ({ data, event }) => {
  if (!data || !event) return;
  tooltipPosition.value = {
    x: event.pageX,
    y: event.pageY
  };
  tooltipData.value = data;
  tooltipVisible.value = true;
  isTooltipPositionValid.value = true;
};

const handleTooltipHide = () => {
  tooltipVisible.value = false;
  isTooltipPositionValid.value = false;
  tooltipData.value = null;
};

const formatTooltipData = (data) => {
  if (!data) return null;
  const categoryValue = data[playgroundCategoryField.value];
  const valueValue = data[playgroundValueField.value];
  
  if (categoryValue === undefined || valueValue === undefined) return null;
  
  return {
    title: categoryValue,
    items: [
      { label: '數量', value: valueValue },
      { label: '累積百分比', value: data.cumulativePercent ? `${data.cumulativePercent.toFixed(1)}%` : 'N/A' }
    ]
  };
};

// ========== 日誌工具 ==========
const logEvent = (message) => {
  const timestamp = new Date().toLocaleTimeString('zh-TW');
  eventLog.value.unshift(`[${timestamp}] ${message}`);
  if (eventLog.value.length > 10) {
    eventLog.value.pop();
  }
};

// ========== 初始化 ==========
onMounted(() => {
  generateRandomData();
});
</script>

<style scoped>
/* 自訂滾動條樣式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #3b82f6;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #2563eb;
}
</style>
