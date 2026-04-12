<template>
  <div class="w-full px-8 py-12">
    <!-- 頁面標題 -->
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🔽</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">FilterDropdown</h1>
          <p class="text-lg text-gray-600 mt-1">多選下拉過濾器組件</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          ✓ 完成
        </span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          Vue 3
        </span>
        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
          Composition API
        </span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
          Tailwind CSS
        </span>
      </div>
    </div>

    <!-- 組件描述 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        <span class="mr-3">📖</span>
        組件簡介
      </h2>
      <div class="prose prose-blue max-w-none">
        <p class="text-gray-700 leading-relaxed mb-4">
          <code class="px-2 py-1 bg-gray-100 text-teal-600 rounded">FilterDropdown</code> 
          是一個輕量級的多選下拉過濾器組件，專為儀表板過濾場景設計。提供簡潔的 UI、全選功能、以及點擊外部自動關閉等實用特性。
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">核心特性</h3>
        <ul class="space-y-2 text-gray-700">
          <li class="flex items-start">
            <span class="text-teal-500 mr-2">✓</span>
            <span><strong>多選支援</strong>：支援同時選擇多個選項，並顯示已選數量</span>
          </li>
          <li class="flex items-start">
            <span class="text-teal-500 mr-2">✓</span>
            <span><strong>全選功能</strong>：一鍵全選/取消全選所有選項</span>
          </li>
          <li class="flex items-start">
            <span class="text-teal-500 mr-2">✓</span>
            <span><strong>緊湊設計</strong>：適合儀表板頂部過濾欄的緊湊 UI</span>
          </li>
          <li class="flex items-start">
            <span class="text-teal-500 mr-2">✓</span>
            <span><strong>自動關閉</strong>：點擊外部區域自動關閉下拉選單</span>
          </li>
          <li class="flex items-start">
            <span class="text-teal-500 mr-2">✓</span>
            <span><strong>v-model 綁定</strong>：使用 Vue 3 的 v-model 進行雙向綁定</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- 互動示例 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🎨</span>
        互動示例
      </h2>

      <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-gray-200">
        <div class="max-w-sm">
          <FilterDropdown
            label="選擇產品"
            :options="demoOptions"
            v-model="selectedValues"
            placeholder="請選擇產品..."
          />
        </div>

        <div class="mt-6 pt-6 border-t border-gray-300">
          <p class="text-sm font-semibold text-gray-700 mb-2">已選擇的值：</p>
          <div v-if="selectedValues.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="value in selectedValues"
              :key="value"
              class="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium"
            >
              {{ value }}
            </span>
          </div>
          <p v-else class="text-sm text-gray-500 italic">尚未選擇任何項目</p>
        </div>
      </div>
    </section>

    <!-- Props API -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">⚙️</span>
        Props API
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">屬性名稱</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">類型</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">預設值</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">必填</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-teal-600">label</td>
              <td class="px-4 py-3 font-mono text-gray-600">String</td>
              <td class="px-4 py-3 text-gray-500">-</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">是</span>
              </td>
              <td class="px-4 py-3 text-gray-700">下拉選單的標籤文字（目前未顯示在 UI，保留供未來擴展）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-teal-600">options</td>
              <td class="px-4 py-3 font-mono text-gray-600">Array</td>
              <td class="px-4 py-3 text-gray-500">-</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">是</span>
              </td>
              <td class="px-4 py-3 text-gray-700">下拉選項列表（字串陣列）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-teal-600">modelValue</td>
              <td class="px-4 py-3 font-mono text-gray-600">Array</td>
              <td class="px-4 py-3 font-mono text-gray-500">[]</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">否</span>
              </td>
              <td class="px-4 py-3 text-gray-700">已選擇的值（使用 v-model 綁定）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-teal-600">placeholder</td>
              <td class="px-4 py-3 font-mono text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-gray-500">'請選擇...'</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">否</span>
              </td>
              <td class="px-4 py-3 text-gray-700">未選擇任何項目時的提示文字</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Events -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📡</span>
        Events
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">事件名稱</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">參數</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-teal-600">update:modelValue</td>
              <td class="px-4 py-3 font-mono text-gray-600">(value: Array)</td>
              <td class="px-4 py-3 text-gray-700">當選擇的值改變時觸發，用於 v-model 雙向綁定</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 使用範例 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💻</span>
        使用範例
      </h2>

      <div class="space-y-6">
        <!-- 基礎用法 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">基礎用法</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;FilterDropdown
    label="選擇類別"
    :options="['類別A', '類別B', '類別C']"
    v-model="selectedCategories"
    placeholder="請選擇類別..."
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import FilterDropdown from '@/components/common/FilterDropdown.vue';

const selectedCategories = ref([]);
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 動態選項 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">動態選項</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;FilterDropdown
    label="選擇機台"
    :options="machineOptions"
    v-model="selectedMachines"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, computed } from 'vue';
import FilterDropdown from '@/components/common/FilterDropdown.vue';

const rawData = ref([
  { machine: 'M001', status: 'running' },
  { machine: 'M002', status: 'idle' },
  { machine: 'M003', status: 'running' }
]);

// 從數據中提取唯一的機台選項
const machineOptions = computed(() => {
  return [...new Set(rawData.value.map(item => item.machine))];
});

const selectedMachines = ref([]);
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 多個過濾器 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">多個過濾器組合使用</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;div class="flex gap-4"&gt;
    &lt;FilterDropdown
      label="產品線"
      :options="productLines"
      v-model="selectedProducts"
      placeholder="選擇產品線..."
    /&gt;
    
    &lt;FilterDropdown
      label="區域"
      :options="regions"
      v-model="selectedRegions"
      placeholder="選擇區域..."
    /&gt;
    
    &lt;FilterDropdown
      label="狀態"
      :options="statuses"
      v-model="selectedStatuses"
      placeholder="選擇狀態..."
    /&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import FilterDropdown from '@/components/common/FilterDropdown.vue';

const productLines = ref(['Product A', 'Product B', 'Product C']);
const regions = ref(['North', 'South', 'East', 'West']);
const statuses = ref(['Active', 'Inactive', 'Pending']);

const selectedProducts = ref([]);
const selectedRegions = ref([]);
const selectedStatuses = ref([]);
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 監聽變化 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">監聽選擇變化</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;FilterDropdown
    label="選擇標籤"
    :options="tags"
    v-model="selectedTags"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, watch } from 'vue';
import FilterDropdown from '@/components/common/FilterDropdown.vue';

const tags = ref(['標籤1', '標籤2', '標籤3', '標籤4']);
const selectedTags = ref([]);

// 監聽選擇變化
watch(selectedTags, (newValue, oldValue) => {
  console.log('選擇已更新:', newValue);
  // 執行資料過濾或 API 請求
  fetchFilteredData(newValue);
});

function fetchFilteredData(filters) {
  // 根據過濾條件請求資料
  console.log('使用過濾條件:', filters);
}
&lt;/script&gt;</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- 最佳實踐 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💡</span>
        最佳實踐
      </h2>

      <div class="space-y-6">
        <div class="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
          <h3 class="font-semibold text-green-900 mb-2 flex items-center">
            <span class="mr-2">✓</span>
            建議做法
          </h3>
          <ul class="space-y-2 text-green-800 text-sm ml-6">
            <li>• 為選項數量較多（>20 項）的下拉選單考慮加入搜尋功能</li>
            <li>• 使用 <code class="px-1.5 py-0.5 bg-green-100 rounded">computed</code> 從數據中動態生成選項，保持選項唯一性</li>
            <li>• 在多個過濾器場景中，使用 <code class="px-1.5 py-0.5 bg-green-100 rounded">watch</code> 統一管理過濾邏輯</li>
            <li>• 為 placeholder 提供清晰的提示文字，說明過濾器的作用</li>
            <li>• 考慮在組件外部顯示已選擇的標籤（Tag），提供移除功能</li>
          </ul>
        </div>

        <div class="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
          <h3 class="font-semibold text-yellow-900 mb-2 flex items-center">
            <span class="mr-2">⚠️</span>
            注意事項
          </h3>
          <ul class="space-y-2 text-yellow-800 text-sm ml-6">
            <li>• 目前不支援物件類型的選項，僅支援字串陣列</li>
            <li>• 下拉選單高度限制為 <code class="px-1.5 py-0.5 bg-yellow-100 rounded">max-h-32</code>，選項過多時會出現滾動條</li>
            <li>• 需要手動引入 <code class="px-1.5 py-0.5 bg-yellow-100 rounded">v-click-outside</code> 指令（如果專案尚未全局註冊）</li>
            <li>• 在移動裝置上測試觸控體驗，確保下拉選單易於操作</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 樣式自定義 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🎨</span>
        樣式自定義
      </h2>

      <div class="prose prose-blue max-w-none">
        <p class="text-gray-700 mb-4">
          組件使用 Tailwind CSS 構建，可以通過修改組件內的 class 來調整樣式。以下是一些常見的自定義需求：
        </p>

        <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">調整下拉選單高度</h3>
        <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-4">
          <pre class="text-green-400 text-sm font-mono"><code>/* 在組件內修改此行 */
class="... max-h-32 ..."  /* 改為 max-h-48 或其他值 */</code></pre>
        </div>

        <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">更改主題顏色</h3>
        <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-4">
          <pre class="text-green-400 text-sm font-mono"><code>/* 將藍色主題改為綠色 */
focus:ring-blue-500 → focus:ring-green-500
focus:border-blue-500 → focus:border-green-500
text-blue-600 → text-green-600</code></pre>
        </div>

        <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">調整字體大小</h3>
        <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre class="text-green-400 text-sm font-mono"><code>/* 按鈕文字 */
class="text-xs ..."  /* 改為 text-sm 或 text-base */

/* 選項文字 */
class="text-xs ..."  /* 改為 text-sm */</code></pre>
        </div>
      </div>
    </section>

    <!-- 常見問題 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">❓</span>
        常見問題
      </h2>

      <div class="space-y-4">
        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span class="font-semibold text-gray-900">如何實現點擊外部關閉下拉選單？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-teal-500 mt-2">
            <p class="text-gray-700 mb-2">
              組件使用了 <code class="px-2 py-1 bg-gray-100 text-teal-600 rounded">v-click-outside</code> 自定義指令。
              你需要確保專案中已註冊此指令：
            </p>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>// main.js
app.directive('click-outside', {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value();
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent);
  }
});</code></pre>
            </div>
          </div>
        </details>

        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span class="font-semibold text-gray-900">能否支援物件類型的選項？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-teal-500 mt-2">
            <p class="text-gray-700">
              目前組件僅支援字串陣列。如果需要使用物件（例如 <code class="px-2 py-1 bg-gray-100 rounded">&#123; id: 1, name: 'Option A' &#125;</code>），
              需要修改組件以支援 <code class="px-2 py-1 bg-gray-100 rounded">valueKey</code> 和 <code class="px-2 py-1 bg-gray-100 rounded">labelKey</code> 屬性。
            </p>
          </div>
        </details>

        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span class="font-semibold text-gray-900">如何設定初始選中的值？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-teal-500 mt-2">
            <p class="text-gray-700 mb-2">
              直接為 <code class="px-2 py-1 bg-gray-100 rounded">v-model</code> 綁定的響應式變數設定初始值：
            </p>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>const selectedItems = ref(['Option A', 'Option B']);</code></pre>
            </div>
          </div>
        </details>

        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span class="font-semibold text-gray-900">下拉選單被父容器裁切怎麼辦？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-teal-500 mt-2">
            <p class="text-gray-700 mb-2">
              確保父容器沒有 <code class="px-2 py-1 bg-gray-100 rounded">overflow-hidden</code> 樣式，
              或將組件容器設為 <code class="px-2 py-1 bg-gray-100 rounded">position: relative</code> 並使用足夠的 <code class="px-2 py-1 bg-gray-100 rounded">z-index</code>。
              組件已設定 <code class="px-2 py-1 bg-gray-100 rounded">z-50</code>，通常足以避免層級問題。
            </p>
          </div>
        </details>
      </div>
    </section>

    <!-- 相關組件 -->
    <section class="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl shadow-md p-8 border-2 border-teal-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔗</span>
        相關組件
      </h2>

      <div class="grid md:grid-cols-2 gap-4">
        <router-link
          to="/docs/components/common-table"
          class="flex items-center p-4 bg-white hover:bg-gray-50 rounded-lg shadow-md transition-all duration-200 border-2 border-transparent hover:border-purple-500 group"
        >
          <span class="text-3xl mr-4">📋</span>
          <div>
            <h3 class="font-semibold text-gray-900 group-hover:text-purple-600">CommonTable 表格</h3>
            <p class="text-sm text-gray-600">常與 FilterDropdown 搭配使用</p>
          </div>
        </router-link>

        <router-link
          to="/docs/components/dual-axis-chart"
          class="flex items-center p-4 bg-white hover:bg-gray-50 rounded-lg shadow-md transition-all duration-200 border-2 border-transparent hover:border-blue-500 group"
        >
          <span class="text-3xl mr-4">📊</span>
          <div>
            <h3 class="font-semibold text-gray-900 group-hover:text-blue-600">雙軸組合圖</h3>
            <p class="text-sm text-gray-600">過濾後的資料視覺化</p>
          </div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import FilterDropdown from '@/components/common/FilterDropdown.vue';

// 示例數據
const demoOptions = ref(['Product A', 'Product B', 'Product C', 'Product D', 'Product E']);
const selectedValues = ref([]);
</script>

<style scoped>
/* 程式碼區塊樣式 */
pre {
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937;
}

pre::-webkit-scrollbar {
  height: 6px;
}

pre::-webkit-scrollbar-track {
  background: #1f2937;
}

pre::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* Details 元素樣式 */
details summary::-webkit-details-marker {
  display: none;
}
</style>
