<template>
  <div class="w-full px-8 py-12">
    <!-- 頁面標題 -->
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🎛️</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">FilterBar</h1>
          <p class="text-lg text-gray-600 mt-1">統一過濾器橫列組件</p>
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
          <code class="px-2 py-1 bg-gray-100 text-indigo-600 rounded">FilterBar</code> 
          是一個配置驅動的過濾器橫列組件，專為儀表板頂部統一過濾場景設計。支援多個下拉選單並排顯示，內建計數功能，簡化了過濾邏輯的實現。
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">核心特性</h3>
        <ul class="space-y-2 text-gray-700">
          <li class="flex items-start">
            <span class="text-indigo-500 mr-2">✓</span>
            <span><strong>配置驅動</strong>：通過簡單的配置陣列即可生成多個過濾器</span>
          </li>
          <li class="flex items-start">
            <span class="text-indigo-500 mr-2">✓</span>
            <span><strong>統一佈局</strong>：橫向排列設計，適合儀表板頂部區域</span>
          </li>
          <li class="flex items-start">
            <span class="text-indigo-500 mr-2">✓</span>
            <span><strong>內建計數</strong>：可選的結果計數顯示，提供即時反饋</span>
          </li>
          <li class="flex items-start">
            <span class="text-indigo-500 mr-2">✓</span>
            <span><strong>選項計數</strong>：支援每個選項顯示對應的數量</span>
          </li>
          <li class="flex items-start">
            <span class="text-indigo-500 mr-2">✓</span>
            <span><strong>v-model 綁定</strong>：使用物件格式的 v-model 進行雙向綁定</span>
          </li>
          <li class="flex items-start">
            <span class="text-indigo-500 mr-2">✓</span>
            <span><strong>原生 Select</strong>：使用原生 select 元素，性能優異</span>
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
        <FilterBar
          :filters="demoFilters"
          v-model="filterValues"
          :count="filteredCount"
          countLabel="產品"
        />

        <div class="mt-6 pt-6 border-t border-gray-300">
          <p class="text-sm font-semibold text-gray-700 mb-2">當前過濾值：</p>
          <div class="bg-white rounded-lg p-4 font-mono text-sm text-gray-800">
            {{ JSON.stringify(filterValues, null, 2) }}
          </div>
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
              <td class="px-4 py-3 font-mono text-indigo-600">filters</td>
              <td class="px-4 py-3 font-mono text-gray-600">Array</td>
              <td class="px-4 py-3 text-gray-500">-</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">是</span>
              </td>
              <td class="px-4 py-3 text-gray-700">過濾器配置陣列，每個元素定義一個下拉選單</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-indigo-600">modelValue</td>
              <td class="px-4 py-3 font-mono text-gray-600">Object</td>
              <td class="px-4 py-3 text-gray-500">-</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">是</span>
              </td>
              <td class="px-4 py-3 text-gray-700">當前過濾值物件，鍵為 filter.key，值為選中的選項值</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-indigo-600">showCount</td>
              <td class="px-4 py-3 font-mono text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-gray-500">true</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">否</span>
              </td>
              <td class="px-4 py-3 text-gray-700">是否顯示右側的結果計數</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-indigo-600">count</td>
              <td class="px-4 py-3 font-mono text-gray-600">Number</td>
              <td class="px-4 py-3 font-mono text-gray-500">0</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">否</span>
              </td>
              <td class="px-4 py-3 text-gray-700">過濾後的結果數量</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-indigo-600">countLabel</td>
              <td class="px-4 py-3 font-mono text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-gray-500">'項目'</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">否</span>
              </td>
              <td class="px-4 py-3 text-gray-700">計數的單位標籤（例如：「筆」、「項目」、「產品」）</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
        <h3 class="font-semibold text-blue-900 mb-2">filters 配置格式</h3>
        <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre class="text-green-400 text-sm font-mono"><code>[
  {
    key: 'partNumber',          // 必填：過濾器的唯一鍵，用於 modelValue
    label: '料號',              // 必填：顯示的標籤文字
    allLabel: '全部',           // 可選：「全部」選項的文字，預設為「全部」
    allCount: 150,              // 可選：「全部」選項的計數
    options: [                  // 必填：下拉選項陣列
      { 
        value: 'ABC123',        // 必填：選項值
        label: 'ABC123',        // 必填：顯示文字
        count: 25               // 可選：該選項的計數
      },
      { value: 'DEF456', label: 'DEF456', count: 30 }
    ]
  }
]</code></pre>
        </div>
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
              <td class="px-4 py-3 font-mono text-indigo-600">update:modelValue</td>
              <td class="px-4 py-3 font-mono text-gray-600">(value: Object)</td>
              <td class="px-4 py-3 text-gray-700">當任一過濾器的值改變時觸發，用於 v-model 雙向綁定</td>
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
  &lt;FilterBar
    :filters="filters"
    v-model="filterValues"
    :count="filteredData.length"
    countLabel="筆資料"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import FilterBar from '@/components/common/FilterBar.vue';

const filters = ref([
  {
    key: 'status',
    label: '狀態',
    options: [
      { value: 'active', label: '啟用中' },
      { value: 'inactive', label: '已停用' }
    ]
  },
  {
    key: 'category',
    label: '分類',
    options: [
      { value: 'A', label: '類別 A' },
      { value: 'B', label: '類別 B' }
    ]
  }
]);

const filterValues = ref({
  status: 'All',
  category: 'All'
});

const filteredData = ref([/* 過濾後的資料 */]);
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 帶計數的選項 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">帶計數的選項</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;FilterBar
    :filters="filtersWithCount"
    v-model="filterValues"
    :count="totalCount"
    countLabel="項產品"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, computed } from 'vue';
import FilterBar from '@/components/common/FilterBar.vue';

const rawData = ref([
  { product: 'Product A', status: 'active' },
  { product: 'Product B', status: 'active' },
  { product: 'Product C', status: 'inactive' }
]);

// 動態計算每個選項的計數
const filtersWithCount = computed(() => {
  const statusCounts = {};
  rawData.value.forEach(item => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
  });

  return [
    {
      key: 'status',
      label: '狀態',
      allLabel: '全部',
      allCount: rawData.value.length,
      options: [
        { 
          value: 'active', 
          label: '啟用中',
          count: statusCounts.active || 0
        },
        { 
          value: 'inactive', 
          label: '已停用',
          count: statusCounts.inactive || 0
        }
      ]
    }
  ];
});

const filterValues = ref({ status: 'All' });

const totalCount = computed(() => {
  if (filterValues.value.status === 'All') {
    return rawData.value.length;
  }
  return rawData.value.filter(item => 
    item.status === filterValues.value.status
  ).length;
});
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 多過濾器聯動 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">多過濾器聯動過濾</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;div&gt;
    &lt;FilterBar
      :filters="filters"
      v-model="filterValues"
      :count="filteredProducts.length"
      countLabel="項產品"
    /&gt;
    
    &lt;!-- 顯示過濾後的資料 --&gt;
    &lt;div class="mt-6"&gt;
      &lt;div v-for="product in filteredProducts" :key="product.id"&gt;
        &#123;&#123; product.name &#125;&#125;
      &lt;/div&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, computed } from 'vue';
import FilterBar from '@/components/common/FilterBar.vue';

const products = ref([
  { id: 1, name: 'Product A', category: 'Electronics', status: 'active' },
  { id: 2, name: 'Product B', category: 'Clothing', status: 'active' },
  { id: 3, name: 'Product C', category: 'Electronics', status: 'inactive' }
]);

const filters = ref([
  {
    key: 'category',
    label: '分類',
    options: [
      { value: 'Electronics', label: '電子產品' },
      { value: 'Clothing', label: '服飾' }
    ]
  },
  {
    key: 'status',
    label: '狀態',
    options: [
      { value: 'active', label: '啟用' },
      { value: 'inactive', label: '停用' }
    ]
  }
]);

const filterValues = ref({
  category: 'All',
  status: 'All'
});

// 根據多個過濾器聯動過濾
const filteredProducts = computed(() => {
  return products.value.filter(product => {
    const matchCategory = filterValues.value.category === 'All' || 
                         product.category === filterValues.value.category;
    const matchStatus = filterValues.value.status === 'All' || 
                       product.status === filterValues.value.status;
    return matchCategory && matchStatus;
  });
});
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 隱藏計數 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">隱藏計數顯示</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;FilterBar
    :filters="filters"
    v-model="filterValues"
    :show-count="false"
  /&gt;
&lt;/template&gt;</code></pre>
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
            <li>• 使用 <code class="px-1.5 py-0.5 bg-green-100 rounded">computed</code> 動態生成帶計數的過濾器配置</li>
            <li>• 為每個過濾器的 key 使用有意義的命名（例如：<code class="px-1.5 py-0.5 bg-green-100 rounded">partNumber</code>、<code class="px-1.5 py-0.5 bg-green-100 rounded">status</code>）</li>
            <li>• 初始化 filterValues 時，確保包含所有 filter.key，並設為 <code class="px-1.5 py-0.5 bg-green-100 rounded">'All'</code></li>
            <li>• 使用 <code class="px-1.5 py-0.5 bg-green-100 rounded">watch</code> 監聽 filterValues 變化，觸發資料過濾或 API 請求</li>
            <li>• 適當的 countLabel 能提升用戶體驗（例如：「筆」、「項產品」、「台機器」）</li>
          </ul>
        </div>

        <div class="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
          <h3 class="font-semibold text-yellow-900 mb-2 flex items-center">
            <span class="mr-2">⚠️</span>
            注意事項
          </h3>
          <ul class="space-y-2 text-yellow-800 text-sm ml-6">
            <li>• 過濾器數量建議不超過 5 個，避免橫向空間不足</li>
            <li>• 選項數量過多時（>20 項）考慮使用 <code class="px-1.5 py-0.5 bg-yellow-100 rounded">FilterDropdown</code> 組件</li>
            <li>• 確保 filterValues 物件的鍵與 filters 配置中的 key 一致</li>
            <li>• 使用原生 select 元素，不支援自定義樣式（如需高度自定義，考慮使用其他組件）</li>
            <li>• 在小螢幕裝置上測試佈局，必要時使用響應式設計調整</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 與 FilterDropdown 的區別 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔄</span>
        與 FilterDropdown 的區別
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">特性</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">FilterBar</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">FilterDropdown</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">使用場景</td>
              <td class="px-4 py-3 text-gray-600">多個過濾器橫向並排</td>
              <td class="px-4 py-3 text-gray-600">單個多選過濾器</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">選擇方式</td>
              <td class="px-4 py-3 text-gray-600">單選（每個過濾器）</td>
              <td class="px-4 py-3 text-gray-600">多選（可同時選多個）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">v-model 格式</td>
              <td class="px-4 py-3 text-gray-600">Object（多個鍵值對）</td>
              <td class="px-4 py-3 text-gray-600">Array（字串陣列）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">UI 元素</td>
              <td class="px-4 py-3 text-gray-600">原生 select</td>
              <td class="px-4 py-3 text-gray-600">自定義下拉 + checkbox</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">配置方式</td>
              <td class="px-4 py-3 text-gray-600">統一配置陣列</td>
              <td class="px-4 py-3 text-gray-600">單個組件 props</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">適合情境</td>
              <td class="px-4 py-3 text-gray-600">選項少、過濾器多</td>
              <td class="px-4 py-3 text-gray-600">需要同時選多個選項</td>
            </tr>
          </tbody>
        </table>
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
            <span class="font-semibold text-gray-900">如何動態更新過濾器選項？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-indigo-500 mt-2">
            <p class="text-gray-700 mb-2">
              使用 <code class="px-2 py-1 bg-gray-100 text-indigo-600 rounded">computed</code> 計算屬性動態生成過濾器配置：
            </p>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>const filters = computed(() => {
  // 根據原始資料動態生成選項
  const categories = [...new Set(rawData.value.map(item => item.category))];
  
  return [{
    key: 'category',
    label: '分類',
    options: categories.map(cat => ({ value: cat, label: cat }))
  }];
});</code></pre>
            </div>
          </div>
        </details>

        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span class="font-semibold text-gray-900">如何在過濾器變化時執行 API 請求？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-indigo-500 mt-2">
            <p class="text-gray-700 mb-2">使用 <code class="px-2 py-1 bg-gray-100 rounded">watch</code> 監聽 filterValues 變化：</p>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>watch(filterValues, async (newFilters) => {
  // 執行 API 請求
  const response = await fetchData(newFilters);
  data.value = response.data;
}, { deep: true });</code></pre>
            </div>
          </div>
        </details>

        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span class="font-semibold text-gray-900">如何重置所有過濾器？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-indigo-500 mt-2">
            <p class="text-gray-700 mb-2">創建一個重置函數，將所有值設為 <code class="px-2 py-1 bg-gray-100 rounded">'All'</code>：</p>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>const resetFilters = () => {
  filterValues.value = {
    category: 'All',
    status: 'All',
    region: 'All'
  };
};</code></pre>
            </div>
          </div>
        </details>

        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span class="font-semibold text-gray-900">過濾器太多導致橫向溢出怎麼辦？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-indigo-500 mt-2">
            <p class="text-gray-700">
              可以調整組件外層容器，加入 <code class="px-2 py-1 bg-gray-100 rounded">overflow-x-auto</code> 允許水平滾動，
              或將部分過濾器移至第二行，或考慮使用折疊/展開的進階過濾器設計。
            </p>
          </div>
        </details>
      </div>
    </section>

    <!-- 相關組件 -->
    <section class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-md p-8 border-2 border-indigo-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔗</span>
        相關組件
      </h2>

      <div class="grid md:grid-cols-2 gap-4">
        <router-link
          to="/docs/components/filter-dropdown"
          class="flex items-center p-4 bg-white hover:bg-gray-50 rounded-lg shadow-md transition-all duration-200 border-2 border-transparent hover:border-teal-500 group"
        >
          <span class="text-3xl mr-4">🔽</span>
          <div>
            <h3 class="font-semibold text-gray-900 group-hover:text-teal-600">FilterDropdown 過濾器</h3>
            <p class="text-sm text-gray-600">適合需要多選的單個過濾器</p>
          </div>
        </router-link>

        <router-link
          to="/docs/components/common-table"
          class="flex items-center p-4 bg-white hover:bg-gray-50 rounded-lg shadow-md transition-all duration-200 border-2 border-transparent hover:border-purple-500 group"
        >
          <span class="text-3xl mr-4">📋</span>
          <div>
            <h3 class="font-semibold text-gray-900 group-hover:text-purple-600">CommonTable 表格</h3>
            <p class="text-sm text-gray-600">常與 FilterBar 搭配顯示資料</p>
          </div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import FilterBar from '@/components/common/FilterBar.vue';

// 示例數據
const demoFilters = ref([
  {
    key: 'product',
    label: '產品',
    allLabel: '全部產品',
    allCount: 150,
    options: [
      { value: 'Product A', label: 'Product A', count: 50 },
      { value: 'Product B', label: 'Product B', count: 60 },
      { value: 'Product C', label: 'Product C', count: 40 }
    ]
  },
  {
    key: 'status',
    label: '狀態',
    options: [
      { value: 'active', label: '啟用中', count: 100 },
      { value: 'inactive', label: '已停用', count: 50 }
    ]
  },
  {
    key: 'region',
    label: '區域',
    options: [
      { value: 'north', label: '北區', count: 45 },
      { value: 'south', label: '南區', count: 55 },
      { value: 'east', label: '東區', count: 25 },
      { value: 'west', label: '西區', count: 25 }
    ]
  }
]);

const filterValues = ref({
  product: 'All',
  status: 'All',
  region: 'All'
});

const filteredCount = computed(() => {
  let count = 150;
  
  if (filterValues.value.product !== 'All') {
    const option = demoFilters.value[0].options.find(
      opt => opt.value === filterValues.value.product
    );
    count = option?.count || 0;
  }
  
  if (filterValues.value.status !== 'All') {
    count = Math.floor(count * 0.7); // 模擬過濾
  }
  
  if (filterValues.value.region !== 'All') {
    count = Math.floor(count * 0.3); // 模擬過濾
  }
  
  return count;
});
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
