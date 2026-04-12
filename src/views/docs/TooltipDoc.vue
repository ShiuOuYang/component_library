<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-8">
    <div class="w-full">
      
      <!-- 標題與簡介 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div class="border-l-4 border-indigo-600 pl-6">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            CommonTooltip
          </h1>
          <p class="text-lg text-gray-600 leading-relaxed">
            一個基於 <span class="font-semibold text-indigo-600">Vue 3</span> 的企業級 Tooltip 組件，
            支援<span class="font-semibold">智能邊界檢測</span>、
            <span class="font-semibold">多種主題配色</span>、
            <span class="font-semibold text-purple-600">自動/手動定位</span>、
            以及 <span class="font-semibold text-pink-600">ResizeObserver 自適應</span>尺寸調整。
            適用於圖表懸停提示、表單驗證提示、功能說明等場景。
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
            <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Composition API</span>
            <span class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">Teleport</span>
            <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
            <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✅ 已完成</span>
          </div>
        </div>
      </div>

      <!-- 核心特性 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-indigo-600 mr-3">✨</span>
          核心特性
        </h2>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <div class="text-3xl mb-3">🎯</div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">智能定位</h3>
            <p class="text-sm text-gray-700">
              自動檢測視窗邊界，確保 tooltip 始終在可見區域內顯示
            </p>
          </div>

          <div class="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <div class="text-3xl mb-3">🎨</div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">多種主題</h3>
            <p class="text-sm text-gray-700">
              內建 5 種主題配色（dark、light、info、warning、error）
            </p>
          </div>

          <div class="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <div class="text-3xl mb-3">📐</div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">靈活定位</h3>
            <p class="text-sm text-gray-700">
              支援自動/手動定位模式，fixed/absolute 雙重策略
            </p>
          </div>

          <div class="p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
            <div class="text-3xl mb-3">🔄</div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">自適應尺寸</h3>
            <p class="text-sm text-gray-700">
              ResizeObserver 監測內容變化，自動調整位置
            </p>
          </div>

          <div class="p-6 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl">
            <div class="text-3xl mb-3">📦</div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Teleport 渲染</h3>
            <p class="text-sm text-gray-700">
              渲染到 body，避免父容器 overflow 和 z-index 問題
            </p>
          </div>

          <div class="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl">
            <div class="text-3xl mb-3">⚡</div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">高性能</h3>
            <p class="text-sm text-gray-700">
              硬體加速、防抖優化、智能更新避免無限循環
            </p>
          </div>
        </div>
      </div>

      <!-- 互動操場 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-orange-600 mr-3">🎮</span>
          互動操場 (Interactive Playground)
        </h2>

        <div class="grid lg:grid-cols-3 gap-6">
          <!-- 預覽區域 -->
          <div class="lg:col-span-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border-2 border-dashed border-gray-300 relative" style="min-height: 400px;">
            <div class="text-center mb-4">
              <p class="text-gray-600 mb-4">將滑鼠移到下方的按鈕上查看 Tooltip</p>
            </div>

            <!-- 測試按鈕 -->
            <div class="flex flex-wrap gap-4 justify-center items-center h-64">
              <button
                @mouseenter="showTooltip($event, 'default')"
                @mouseleave="hideTooltip"
                class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition-colors"
              >
                預設主題
              </button>

              <button
                @mouseenter="showTooltip($event, 'warning')"
                @mouseleave="hideTooltip"
                class="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-md transition-colors"
              >
                警告提示
              </button>

              <button
                @mouseenter="showTooltip($event, 'error')"
                @mouseleave="hideTooltip"
                class="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition-colors"
              >
                錯誤提示
              </button>

              <button
                @mouseenter="showTooltip($event, 'custom')"
                @mouseleave="hideTooltip"
                class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg shadow-md transition-colors"
              >
                自定義內容
              </button>

              <button
                @mouseenter="showTooltip($event, 'light')"
                @mouseleave="hideTooltip"
                @click="togglePersistentTooltip($event, 'light')"
                class="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-colors"
              >
                {{ persistentTooltipVisible ? '已固定（點擊關閉）' : '點擊固定' }}
              </button>
            </div>

            <!-- Tooltip 組件 -->
            <CommonTooltip
              v-if="tooltipVisible"
              :visible="tooltipVisible"
              :position="tooltipPosition"
              :data="tooltipData"
              :theme="playgroundTheme"
              :show-arrow="playgroundShowArrow"
              :offset="playgroundOffset"
              :max-width="playgroundMaxWidth"
              :strategy="playgroundStrategy"
              :auto-adjust-position="playgroundAutoAdjust"
            />

            <!-- 固定模式 Tooltip -->
            <CommonTooltip
              v-if="persistentTooltipVisible"
              :visible="persistentTooltipVisible"
              :position="persistentTooltipPosition"
              :data="persistentTooltipData"
              :theme="playgroundTheme"
              :show-arrow="playgroundShowArrow"
              :offset="playgroundOffset"
              :max-width="playgroundMaxWidth"
              :strategy="playgroundStrategy"
              :auto-adjust-position="playgroundAutoAdjust"
              :persistent="true"
              :click-to-close="true"
              @close="persistentTooltipVisible = false"
            />
          </div>

          <!-- 控制面板 -->
          <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">⚙️</span>
              控制面板
            </h3>

            <div class="space-y-4">
              <!-- 主題選擇 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">主題</label>
                <select
                  v-model="playgroundTheme"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <!-- 最大寬度 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">最大寬度</label>
                <select
                  v-model="playgroundMaxWidth"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="xs">Extra Small (320px)</option>
                  <option value="sm">Small (384px)</option>
                  <option value="md">Medium (448px)</option>
                  <option value="lg">Large (512px)</option>
                  <option value="xl">Extra Large (576px)</option>
                </select>
              </div>

              <!-- 定位策略 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">定位策略</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    @click="playgroundStrategy = 'fixed'"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      playgroundStrategy === 'fixed'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    Fixed
                  </button>
                  <button
                    @click="playgroundStrategy = 'absolute'"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      playgroundStrategy === 'absolute'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    Absolute
                  </button>
                </div>
              </div>

              <!-- 顯示箭頭 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">顯示箭頭</label>
                <button
                  @click="playgroundShowArrow = !playgroundShowArrow"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundShowArrow ? 'bg-indigo-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundShowArrow ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- 自動調整位置 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">自動調整位置</label>
                <button
                  @click="playgroundAutoAdjust = !playgroundAutoAdjust"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundAutoAdjust ? 'bg-green-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundAutoAdjust ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- 偏移量 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  X 偏移: <span class="text-indigo-600 font-semibold">{{ playgroundOffset.x }}px</span>
                </label>
                <input
                  v-model.number="playgroundOffset.x"
                  type="range"
                  min="-50"
                  max="50"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Y 偏移: <span class="text-indigo-600 font-semibold">{{ playgroundOffset.y }}px</span>
                </label>
                <input
                  v-model.number="playgroundOffset.y"
                  type="range"
                  min="-50"
                  max="50"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用範例 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-green-600 mr-3">📝</span>
          使用範例
        </h2>

        <div class="space-y-6">
          <!-- 基礎用法 -->
          <div>
            <h3 class="text-xl font-semibold text-gray-800 mb-3">基礎用法</h3>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;button @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave"&gt;
    懸停顯示提示
  &lt;/button&gt;

  &lt;CommonTooltip
    :visible="tooltipVisible"
    :position="tooltipPosition"
    :data="tooltipData"
    theme="info"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import CommonTooltip from '@/components/common/CommonTooltip.vue';

const tooltipVisible = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const tooltipData = ref({
  title: '提示標題',
  items: [
    { label: '用戶名', value: 'John Doe' },
    { label: '郵箱', value: 'john@example.com' }
  ]
});

const handleMouseEnter = (event) => {
  tooltipPosition.value = { x: event.pageX, y: event.pageY };
  tooltipVisible.value = true;
};

const handleMouseLeave = () => {
  tooltipVisible.value = false;
};
&lt;/script&gt;</code></pre>
            </div>
          </div>

          <!-- 圖表整合 -->
          <div>
            <h3 class="text-xl font-semibold text-gray-800 mb-3">與 D3 圖表整合</h3>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>// 在 D3 圖表中使用
d3.select('.chart')
  .selectAll('circle')
  .on('mouseenter', function(event, d) {
    emit('tooltip-show', {
      data: d,
      position: { pageX: event.pageX, pageY: event.pageY }
    });
  })
  .on('mouseleave', () => {
    emit('tooltip-hide');
  });</code></pre>
            </div>
          </div>

          <!-- 自定義內容 -->
          <div>
            <h3 class="text-xl font-semibold text-gray-800 mb-3">自定義內容（使用插槽）</h3>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono" v-pre><code>&lt;CommonTooltip :visible="true" :position="{ x: 100, y: 100 }"&gt;
  &lt;template #default="{ data }"&gt;
    &lt;div class="custom-tooltip-content"&gt;
      &lt;img :src="data.avatar" class="w-12 h-12 rounded-full" /&gt;
      &lt;h4 class="font-bold"&gt;{{ data.name }}&lt;/h4&gt;
      &lt;p class="text-sm"&gt;{{ data.description }}&lt;/p&gt;
    &lt;/div&gt;
  &lt;/template&gt;
&lt;/CommonTooltip&gt;</code></pre>
            </div>
          </div>
        </div>
      </div>

      <!-- API 文檔 -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-purple-600 mr-3">📚</span>
          API 文檔
        </h2>

        <!-- Props -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Props</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">屬性名稱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">類型</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">預設值</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">說明</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">visible</td>
                  <td class="px-6 py-4 text-sm text-gray-500">Boolean</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">false</td>
                  <td class="px-6 py-4 text-sm text-gray-700">是否顯示 Tooltip</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">position</td>
                  <td class="px-6 py-4 text-sm text-gray-500">Object</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ x: 0, y: 0 }</td>
                  <td class="px-6 py-4 text-sm text-gray-700">Tooltip 顯示位置（相對於視窗）</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">data</td>
                  <td class="px-6 py-4 text-sm text-gray-500">Object</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ title, items, extra }</td>
                  <td class="px-6 py-4 text-sm text-gray-700">Tooltip 內容數據</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">theme</td>
                  <td class="px-6 py-4 text-sm text-gray-500">String</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">'info'</td>
                  <td class="px-6 py-4 text-sm text-gray-700">'dark' | 'light' | 'info' | 'warning' | 'error'</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">offset</td>
                  <td class="px-6 py-4 text-sm text-gray-500">Object</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ x: 15, y: -40 }</td>
                  <td class="px-6 py-4 text-sm text-gray-700">相對於滑鼠位置的偏移量</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">maxWidth</td>
                  <td class="px-6 py-4 text-sm text-gray-500">String</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">'sm'</td>
                  <td class="px-6 py-4 text-sm text-gray-700">'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none'</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">strategy</td>
                  <td class="px-6 py-4 text-sm text-gray-500">String</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">'absolute'</td>
                  <td class="px-6 py-4 text-sm text-gray-700">'fixed' | 'absolute' - CSS 定位策略</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">autoAdjustPosition</td>
                  <td class="px-6 py-4 text-sm text-gray-500">Boolean</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">true</td>
                  <td class="px-6 py-4 text-sm text-gray-700">啟用自動邊界檢測與位置修正</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">showArrow</td>
                  <td class="px-6 py-4 text-sm text-gray-500">Boolean</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">true</td>
                  <td class="px-6 py-4 text-sm text-gray-700">顯示箭頭指示器</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">interactive</td>
                  <td class="px-6 py-4 text-sm text-gray-500">Boolean</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">false</td>
                  <td class="px-6 py-4 text-sm text-gray-700">Tooltip 是否可互動（點擊、選取文字）</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">persistent</td>
                  <td class="px-6 py-4 text-sm text-gray-500">Boolean</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">false</td>
                  <td class="px-6 py-4 text-sm text-gray-700">點擊後固定顯示，不會因 mouseleave 而關閉</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-blue-600">clickToClose</td>
                  <td class="px-6 py-4 text-sm text-gray-500">Boolean</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">true</td>
                  <td class="px-6 py-4 text-sm text-gray-700">persistent 模式下，是否允許點擊關閉</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Data 結構 -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Data 結構</h3>
          <div class="bg-gray-900 rounded-lg p-4">
            <pre class="text-green-400 text-sm font-mono"><code>{
  title: String,           // 標題（可選）
  items: [                 // 內容項目陣列（可選）
    {
      label: String,       // 標籤
      value: String,       // 數值
      labelClass: String,  // 自定義標籤樣式（可選）
      valueClass: String   // 自定義數值樣式（可選）
    }
  ],
  extra: String            // 額外信息（可選）
}</code></pre>
          </div>
        </div>

        <!-- Slots -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Slots</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">插槽名稱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">作用域數據</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">說明</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-purple-600">default</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">{ data }</td>
                  <td class="px-6 py-4 text-sm text-gray-700">自定義 Tooltip 內容</td>
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
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">事件名稱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">參數</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">說明</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr>
                  <td class="px-6 py-4 text-sm font-mono text-purple-600">close</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">-</td>
                  <td class="px-6 py-4 text-sm text-gray-700">persistent 模式下點擊關閉時觸發</td>
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
import { ref } from 'vue';
import CommonTooltip from '../../components/common/CommonTooltip.vue';

// ========== Playground 狀態 ==========
const playgroundTheme = ref('info');
const playgroundMaxWidth = ref('sm');
const playgroundStrategy = ref('fixed');
const playgroundShowArrow = ref(true);
const playgroundAutoAdjust = ref(true);
const playgroundOffset = ref({ x: 15, y: -40 });

// ========== Tooltip 狀態 ==========
const tooltipVisible = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const tooltipData = ref({
  title: '示例提示',
  items: [
    { label: '用戶', value: 'John Doe' },
    { label: '時間', value: '2024-01-21' }
  ],
  extra: ''
});

// ========== 固定模式 Tooltip ==========
const persistentTooltipVisible = ref(false);
const persistentTooltipPosition = ref({ x: 0, y: 0 });
const persistentTooltipData = ref({
  title: '💡 固定提示',
  items: [
    { label: '模式', value: 'Persistent' },
    { label: '操作', value: '點擊任意處關閉' }
  ],
  extra: '這是一個固定顯示的 Tooltip'
});

// ========== 事件處理 ==========
const showTooltip = (event, type) => {
  // 如果固定 tooltip 已經顯示，不顯示懸停 tooltip
  if (persistentTooltipVisible.value) return;
  
  tooltipPosition.value = {
    x: event.pageX,
    y: event.pageY
  };

  switch (type) {
    case 'default':
      tooltipData.value = {
        title: '預設主題',
        items: [
          { label: '類型', value: 'Info' },
          { label: '狀態', value: '正常' }
        ],
        extra: ''
      };
      playgroundTheme.value = 'info';
      break;
    
    case 'warning':
      tooltipData.value = {
        title: '⚠️ 警告提示',
        items: [
          { label: '剩餘空間', value: '不足 10%' },
          { label: '建議', value: '請清理磁碟' }
        ],
        extra: ''
      };
      playgroundTheme.value = 'warning';
      break;
    
    case 'error':
      tooltipData.value = {
        title: '❌ 錯誤信息',
        items: [
          { label: '錯誤碼', value: 'ERR_404' },
          { label: '描述', value: '資源未找到' }
        ],
        extra: ''
      };
      playgroundTheme.value = 'error';
      break;
    
    case 'custom':
      tooltipData.value = {
        title: '🎨 自定義樣式',
        items: [
          { 
            label: '高亮', 
            value: '重要數據',
            valueClass: 'text-yellow-300 font-bold',
            labelClass: ''
          },
          { 
            label: '普通', 
            value: '一般數據',
            valueClass: '',
            labelClass: ''
          }
        ],
        extra: '這是額外的說明信息'
      };
      playgroundTheme.value = 'dark';
      break;
    
    case 'light':
      tooltipData.value = {
        title: '📌 固定模式',
        items: [
          { label: '主題', value: 'Light' },
          { label: '操作', value: '點擊固定顯示' }
        ],
        extra: '點擊按鈕固定 Tooltip'
      };
      playgroundTheme.value = 'light';
      break;
  }

  tooltipVisible.value = true;
};

const togglePersistentTooltip = (event, theme = 'light') => {
  // 點擊時立即隱藏懸停 tooltip
  tooltipVisible.value = false;
  
  // 設定固定 tooltip 的主題
  playgroundTheme.value = theme;
  
  persistentTooltipPosition.value = {
    x: event.pageX,
    y: event.pageY
  };
  persistentTooltipVisible.value = !persistentTooltipVisible.value;
};

const hideTooltip = () => {
  tooltipVisible.value = false;
};
</script>

<style scoped>
/* 滾動條樣式 */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: #1f2937;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
