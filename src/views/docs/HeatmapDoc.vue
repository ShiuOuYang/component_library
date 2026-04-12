<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-8">
    <div class="w-full">
      
      <!-- 標題與簡介 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div class="border-l-4 border-orange-600 pl-6">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            EnterpriseHeatmap
          </h1>
          <p class="text-lg text-gray-600 leading-relaxed">
            一個基於 <span class="font-semibold text-blue-600">D3.js</span> 的企業級熱力圖組件，
            支援<span class="font-semibold">自訂色階</span>、
            <span class="font-semibold">Brush 框選縮放</span>、
            <span class="font-semibold text-purple-600">多種高亮模式</span>（單元格、行、列、交叉），
            以及 <span class="font-semibold text-pink-600">ResizeObserver 自動響應式</span>尺寸調整。
            適用於展示二維矩陣數據、相關性分析、時間序列熱圖等場景。
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
          <span class="text-orange-600 mr-3">🎮</span>
          互動操場 (Interactive Playground)
        </h2>
        
        <div class="grid lg:grid-cols-3 gap-6">
          <!-- 圖表區域 (左側 2/3) -->
          <div class="lg:col-span-2 bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
            <div style="width: 100%; height: 500px;">
              <EnterpriseHeatmap
                :data="heatmapData"
                :auto-resize="true"
                :x-field="playgroundXField"
                :y-field="playgroundYField"
                :value-field="playgroundValueField"
                :title="playgroundTitle"
                :color-scheme="playgroundColorScheme"
                :reverse-color-scale="playgroundReverseColor"
                :show-cell-values="playgroundShowCellValues"
                :cell-padding="playgroundCellPadding"
                :cell-border-radius="playgroundCellBorderRadius"
                :enable-brush="playgroundEnableBrush"
                :highlight-mode="playgroundHighlightMode"
                :show-color-legend="playgroundShowColorLegend"
                :color-legend-position="playgroundColorLegendPosition"
                :color-legend-title="playgroundColorLegendTitle"
                x-axis-label="產品類別"
                y-axis-label="月份"
                :animation-duration="playgroundAnimationDuration"
                @cell-click="handleCellClick"
                @cell-hover="handleCellHover"
                @tooltip-show="handleTooltipShow"
                @tooltip-hide="handleTooltipHide"
                @selection-change="handleSelectionChange"
              >
                <template #tooltip="{ tooltipData }">
                  <CommonTooltip
                    v-if="shouldShowTooltip && tooltipData"
                    :visible="true"
                    :position="tooltipPosition"
                    :data="formatTooltipData(tooltipData)"
                    theme="light"
                    :auto-adjust-position="false"
                    :show-arrow="false"
                    :offset="{ x: 15, y: -10 }"
                    max-width="sm"
                    strategy="fixed"
                  />
                </template>
              </EnterpriseHeatmap>
            </div>
          </div>

          <!-- 控制面板 (右側 1/3) -->
          <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="輸入標題..."
                />
              </div>

              <!-- 色階方案 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">色階方案</label>
                <select
                  v-model="playgroundColorScheme"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="interpolateRdYlGn">紅-黃-綠</option>
                  <option value="interpolateViridis">Viridis</option>
                  <option value="interpolateRdBu">紅-藍</option>
                  <option value="interpolateBlues">藍色系</option>
                  <option value="interpolateReds">紅色系</option>
                  <option value="interpolateGreens">綠色系</option>
                  <option value="interpolatePurples">紫色系</option>
                  <option value="interpolateOranges">橙色系</option>
                  <option value="interpolateYlGnBu">黃-綠-藍</option>
                  <option value="interpolateYlOrRd">黃-橙-紅</option>
                  <option value="interpolateTurbo">Turbo</option>
                  <option value="interpolatePlasma">Plasma</option>
                  <option value="interpolateInferno">Inferno</option>
                </select>
              </div>

              <!-- 反轉色階 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">反轉色階</label>
                <button
                  @click="playgroundReverseColor = !playgroundReverseColor"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundReverseColor ? 'bg-orange-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundReverseColor ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- 顯示數值 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">顯示數值</label>
                <button
                  @click="playgroundShowCellValues = !playgroundShowCellValues"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundShowCellValues ? 'bg-blue-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundShowCellValues ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- 單元格間距 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  單元格間距: <span class="text-orange-600 font-semibold">{{ playgroundCellPadding }}px</span>
                </label>
                <input
                  v-model.number="playgroundCellPadding"
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <!-- 單元格圓角 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  單元格圓角: <span class="text-orange-600 font-semibold">{{ playgroundCellBorderRadius }}px</span>
                </label>
                <input
                  v-model.number="playgroundCellBorderRadius"
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <!-- Brush 縮放 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">Brush 縮放</label>
                <button
                  @click="playgroundEnableBrush = !playgroundEnableBrush"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundEnableBrush ? 'bg-green-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundEnableBrush ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- 高亮模式 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">高亮模式</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    @click="playgroundHighlightMode = 'cell'"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      playgroundHighlightMode === 'cell'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    🔲 單元格
                  </button>
                  <button
                    @click="playgroundHighlightMode = 'row'"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      playgroundHighlightMode === 'row'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    📊 行
                  </button>
                  <button
                    @click="playgroundHighlightMode = 'column'"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      playgroundHighlightMode === 'column'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    📈 列
                  </button>
                  <button
                    @click="playgroundHighlightMode = 'both'"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      playgroundHighlightMode === 'both'
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    ✨ 交叉
                  </button>
                </div>
              </div>

              <!-- 顯示色階圖例 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">顯示色階圖例</label>
                <button
                  @click="playgroundShowColorLegend = !playgroundShowColorLegend"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundShowColorLegend ? 'bg-purple-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundShowColorLegend ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- 色階圖例位置 -->
              <div v-if="playgroundShowColorLegend">
                <label class="block text-sm font-medium text-gray-700 mb-2">圖例位置</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    @click="playgroundColorLegendPosition = 'right'"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      playgroundColorLegendPosition === 'right'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    ➡️ 右側
                  </button>
                  <button
                    @click="playgroundColorLegendPosition = 'bottom'"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      playgroundColorLegendPosition === 'bottom'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    ⬇️ 底部
                  </button>
                </div>
              </div>

              <!-- 動畫時長 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  動畫時長: <span class="text-orange-600 font-semibold">{{ playgroundAnimationDuration }}ms</span>
                </label>
                <input
                  v-model.number="playgroundAnimationDuration"
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <!-- 隨機數據 -->
              <button
                @click="generateRandomData"
                class="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
              >
                🎲 隨機生成數據
              </button>

              <!-- 事件日誌 -->
              <div class="mt-6 pt-4 border-t border-orange-200">
                <h4 class="text-sm font-semibold text-gray-700 mb-2">事件日誌</h4>
                <div class="bg-white rounded p-3 max-h-32 overflow-y-auto text-xs font-mono text-gray-600">
                  <div v-if="eventLog.length === 0" class="text-gray-400">無事件</div>
                  <div v-for="(event, i) in eventLog" :key="i" class="mb-1">
                    {{ event }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 場景範例 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-green-600 mr-3">📊</span>
          場景範例 (Use Cases)
        </h2>

        <div class="grid md:grid-cols-2 gap-6">
          <!-- 範例 1: 產品銷售熱力圖 -->
          <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200">
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-xl font-bold text-gray-800">📈 產品銷售熱力圖</h3>
              <span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">銷售分析</span>
            </div>
            <p class="text-gray-600 mb-4">
              分析不同產品在各月份的銷售表現，快速識別熱門產品與淡季時段。
            </p>
            <div class="bg-white rounded-lg p-4" style="height: 300px;">
              <EnterpriseHeatmap
                :data="salesData"
                :auto-resize="true"
                x-field="product"
                y-field="month"
                value-field="sales"
                title="產品月銷售熱力圖"
                color-scheme="interpolateYlOrRd"
                :show-cell-values="true"
                :cell-padding="3"
                :enable-brush="true"
                highlight-mode="both"
                x-axis-label="產品"
                y-axis-label="月份"
                color-legend-title="銷售額 (萬)"
                :show-color-legend="true"
                color-legend-position="right"
              />
            </div>
          </div>

          <!-- 範例 2: 相關性矩陣 -->
          <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-xl font-bold text-gray-800">🔗 參數相關性矩陣</h3>
              <span class="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">數據分析</span>
            </div>
            <p class="text-gray-600 mb-4">
              展示製程參數之間的相關性，快速發現強相關與弱相關關係。
            </p>
            <div class="bg-white rounded-lg p-4" style="height: 300px;">
              <EnterpriseHeatmap
                :data="correlationData"
                :auto-resize="true"
                x-field="param1"
                y-field="param2"
                value-field="correlation"
                title="製程參數相關性矩陣"
                color-scheme="interpolateRdBu"
                :reverse-color-scale="true"
                :show-cell-values="true"
                :cell-padding="2"
                :cell-border-radius="0"
                :enable-brush="false"
                highlight-mode="both"
                :value-domain="[-1, 1]"
                :show-color-legend="true"
                color-legend-position="bottom"
                color-legend-title="相關係數"
              />
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
            <table class="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    屬性名稱
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    類型
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    預設值
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    說明
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <!-- 基礎配置 -->
                <tr class="bg-blue-50">
                  <td colspan="4" class="px-6 py-2 text-sm font-semibold text-gray-700">
                    基礎配置
                  </td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">data</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Array</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">required</td>
                  <td class="px-6 py-4 text-sm text-gray-700">熱力圖數據陣列</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">width</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Number</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">800</td>
                  <td class="px-6 py-4 text-sm text-gray-700">圖表寬度（像素）</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">height</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Number</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">600</td>
                  <td class="px-6 py-4 text-sm text-gray-700">圖表高度（像素）</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">autoResize</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Boolean</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">false</td>
                  <td class="px-6 py-4 text-sm text-gray-700">啟用自動響應容器大小</td>
                </tr>
                
                <!-- 欄位映射 -->
                <tr class="bg-green-50">
                  <td colspan="4" class="px-6 py-2 text-sm font-semibold text-gray-700">
                    欄位映射
                  </td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">xField</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">String</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">'x'</td>
                  <td class="px-6 py-4 text-sm text-gray-700">X 軸欄位名稱</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">yField</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">String</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">'y'</td>
                  <td class="px-6 py-4 text-sm text-gray-700">Y 軸欄位名稱</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">valueField</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">String</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">'value'</td>
                  <td class="px-6 py-4 text-sm text-gray-700">數值欄位名稱</td>
                </tr>

                <!-- 色階配置 -->
                <tr class="bg-purple-50">
                  <td colspan="4" class="px-6 py-2 text-sm font-semibold text-gray-700">
                    色階配置
                  </td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">colorScheme</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">String</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">'interpolateRdYlGn'</td>
                  <td class="px-6 py-4 text-sm text-gray-700">D3 內建色階名稱</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">colorRange</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Array</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">['#d73027', '#fee08b', '#1a9850']</td>
                  <td class="px-6 py-4 text-sm text-gray-700">自訂色階範圍（優先於 colorScheme）</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">reverseColorScale</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Boolean</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">false</td>
                  <td class="px-6 py-4 text-sm text-gray-700">反轉色階</td>
                </tr>

                <!-- 單元格配置 -->
                <tr class="bg-orange-50">
                  <td colspan="4" class="px-6 py-2 text-sm font-semibold text-gray-700">
                    單元格配置
                  </td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">cellPadding</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Number</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">2</td>
                  <td class="px-6 py-4 text-sm text-gray-700">單元格間距（像素）</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">cellBorderRadius</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Number</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">2</td>
                  <td class="px-6 py-4 text-sm text-gray-700">單元格圓角</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">showCellValues</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Boolean</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">false</td>
                  <td class="px-6 py-4 text-sm text-gray-700">在單元格內顯示數值</td>
                </tr>

                <!-- 互動配置 -->
                <tr class="bg-pink-50">
                  <td colspan="4" class="px-6 py-2 text-sm font-semibold text-gray-700">
                    互動配置
                  </td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">enableBrush</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Boolean</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">true</td>
                  <td class="px-6 py-4 text-sm text-gray-700">啟用框選縮放功能</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">highlightMode</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">String</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">'cell'</td>
                  <td class="px-6 py-4 text-sm text-gray-700">'cell' | 'row' | 'column' | 'both'</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Events -->
        <div>
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Events</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    事件名稱
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    參數
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    說明
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">cell-click</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ event, data }</td>
                  <td class="px-6 py-4 text-sm text-gray-700">單元格點擊事件</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">cell-hover</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ event, data }</td>
                  <td class="px-6 py-4 text-sm text-gray-700">單元格懸停事件</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">selection-change</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ xDomain, yDomain }</td>
                  <td class="px-6 py-4 text-sm text-gray-700">Brush 選取範圍改變</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">zoom-reset</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">-</td>
                  <td class="px-6 py-4 text-sm text-gray-700">重置縮放</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import EnterpriseHeatmap from '../../components/common/EnterpriseHeatmap.vue';
import CommonTooltip from '../../components/common/CommonTooltip.vue';

// ========== 互動操場狀態 ==========
const playgroundTitle = ref('企業級熱力圖範例');
const playgroundXField = ref('product');
const playgroundYField = ref('month');
const playgroundValueField = ref('value');
const playgroundColorScheme = ref('interpolateRdYlGn');
const playgroundReverseColor = ref(false);
const playgroundShowCellValues = ref(false);
const playgroundCellPadding = ref(2);
const playgroundCellBorderRadius = ref(2);
const playgroundEnableBrush = ref(true);
const playgroundHighlightMode = ref('both');
const playgroundShowColorLegend = ref(true);
const playgroundColorLegendPosition = ref('right');
const playgroundColorLegendTitle = ref('數值');
const playgroundAnimationDuration = ref(500);

// ========== 數據 ==========
const heatmapData = ref([]);
const salesData = ref([]);
const correlationData = ref([]);

// ========== Tooltip ==========
const tooltipVisible = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const tooltipData = ref(null);
const isTooltipPositionValid = ref(false);

// 只有在位置有效時才實際顯示 tooltip
const shouldShowTooltip = computed(() => {
  return tooltipVisible.value && isTooltipPositionValid.value;
});

// ========== 事件日誌 ==========
const eventLog = ref([]);

// ========== 生成隨機數據 ==========
const generateRandomData = () => {
  const products = ['產品A', '產品B', '產品C', '產品D', '產品E', '產品F'];
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  
  heatmapData.value = [];
  products.forEach(product => {
    months.forEach(month => {
      heatmapData.value.push({
        product,
        month,
        value: Math.random() * 100 + 20
      });
    });
  });

  logEvent('🎲 數據已更新');
};

// ========== 生成銷售數據 ==========
const generateSalesData = () => {
  const products = ['筆電', '手機', '平板', '耳機', '鍵盤'];
  const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
  
  salesData.value = [];
  products.forEach(product => {
    months.forEach(month => {
      salesData.value.push({
        product,
        month,
        sales: Math.random() * 50 + 10
      });
    });
  });
};

// ========== 生成相關性數據 ==========
const generateCorrelationData = () => {
  const params = ['溫度', '壓力', '濕度', '速度', 'pH值'];
  
  correlationData.value = [];
  params.forEach(param1 => {
    params.forEach(param2 => {
      correlationData.value.push({
        param1,
        param2,
        correlation: param1 === param2 ? 1 : (Math.random() * 2 - 1)
      });
    });
  });
};

// ========== 事件處理 ==========
const handleCellClick = ({ data }) => {
  logEvent(`🖱️ 點擊: ${data[playgroundXField.value]}, ${data[playgroundYField.value]}`);
};

const handleCellHover = ({ data, clientX, clientY }) => {
  // cell-hover 事件主要用於日誌記錄
  // 實際的 tooltip 顯示由 tooltip-show 事件處理
};

const handleTooltipShow = (payload) => {
  const { data, position } = payload;
  
  // 設定 tooltip 位置
  tooltipPosition.value = {
    x: position.pageX,
    y: position.pageY
  };
  
  // 設定數據並顯示
  tooltipData.value = data;
  isTooltipPositionValid.value = true;
  tooltipVisible.value = true;
};

const handleTooltipHide = () => {
  tooltipVisible.value = false;
  isTooltipPositionValid.value = false;
  tooltipData.value = null;
};

const handleSelectionChange = ({ xDomain, yDomain }) => {
  logEvent(`🔍 選取範圍: X[${xDomain.length}], Y[${yDomain.length}]`);
};

const formatTooltipData = (data) => {
  if (!data) return null;
  return {
    title: `${data[playgroundXField.value]} - ${data[playgroundYField.value]}`,
    items: [
      { label: '數值', value: data[playgroundValueField.value]?.toFixed(2) || 'N/A' }
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
  generateSalesData();
  generateCorrelationData();
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
  background: #fb923c;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #f97316;
}
</style>
