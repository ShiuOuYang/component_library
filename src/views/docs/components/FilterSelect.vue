<template>
  <div class="w-full px-8 py-12">
    <!-- 頁面標題 -->
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">📝</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">FilterSelect</h1>
          <p class="text-lg text-gray-600 mt-1">靈活可配置的單選下拉組件</p>
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
          <code class="px-2 py-1 bg-gray-100 text-cyan-600 rounded">FilterSelect</code> 
          是一個高度可配置的單選下拉組件，提供比原生 select 更豐富的功能。支援多種尺寸、物件陣列選項、自定義鍵值映射，是構建過濾器、表單的理想選擇。
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">核心特性</h3>
        <ul class="space-y-2 text-gray-700">
          <li class="flex items-start">
            <span class="text-cyan-500 mr-2">✓</span>
            <span><strong>多種尺寸</strong>：支援 xs、sm、md、lg 四種尺寸選擇</span>
          </li>
          <li class="flex items-start">
            <span class="text-cyan-500 mr-2">✓</span>
            <span><strong>物件陣列支援</strong>：可處理物件陣列，自定義 valueKey 和 labelKey</span>
          </li>
          <li class="flex items-start">
            <span class="text-cyan-500 mr-2">✓</span>
            <span><strong>靈活的標籤</strong>：可選的標籤顯示，支援自定義樣式</span>
          </li>
          <li class="flex items-start">
            <span class="text-cyan-500 mr-2">✓</span>
            <span><strong>全寬模式</strong>：支援全寬或固定寬度佈局</span>
          </li>
          <li class="flex items-start">
            <span class="text-cyan-500 mr-2">✓</span>
            <span><strong>數字值轉換</strong>：可自動將選中值轉為數字型別</span>
          </li>
          <li class="flex items-start">
            <span class="text-cyan-500 mr-2">✓</span>
            <span><strong>Slot 自定義</strong>：支援自定義選項渲染</span>
          </li>
          <li class="flex items-start">
            <span class="text-cyan-500 mr-2">✓</span>
            <span><strong>可選「全部」選項</strong>：可控制是否顯示預設選項</span>
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

      <div class="space-y-8">
        <!-- 基礎示例 -->
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">基礎用法</h3>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div>
              <FilterSelect
                v-model="basicValue"
                label="選擇產品"
                :options="['Product A', 'Product B', 'Product C']"
                placeholder="所有產品"
              />
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-700 mb-2">選中值：</p>
              <code class="px-3 py-2 bg-white rounded border border-gray-300 text-sm">{{ basicValue || '未選擇' }}</code>
            </div>
          </div>
        </div>

        <!-- 物件陣列示例 -->
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">物件陣列 + 自定義鍵值</h3>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div>
              <FilterSelect
                v-model="objectValue"
                label="選擇分類"
                :options="categoryOptions"
                valueKey="id"
                labelKey="name"
                placeholder="所有分類"
              />
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-700 mb-2">選中值：</p>
              <code class="px-3 py-2 bg-white rounded border border-gray-300 text-sm">{{ objectValue || '未選擇' }}</code>
            </div>
          </div>
        </div>

        <!-- 尺寸示例 -->
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">不同尺寸</h3>
          
          <div class="space-y-4">
            <FilterSelect
              v-model="sizeValue"
              label="Extra Small (xs)"
              :options="sizeOptions"
              size="xs"
            />
            <FilterSelect
              v-model="sizeValue"
              label="Small (sm)"
              :options="sizeOptions"
              size="sm"
            />
            <FilterSelect
              v-model="sizeValue"
              label="Medium (md)"
              :options="sizeOptions"
              size="md"
            />
            <FilterSelect
              v-model="sizeValue"
              label="Large (lg)"
              :options="sizeOptions"
              size="lg"
            />
          </div>
        </div>

        <!-- 全寬模式 -->
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">全寬模式</h3>
          
          <FilterSelect
            v-model="fullWidthValue"
            label="選擇區域"
            :options="regionOptions"
            placeholder="所有區域"
            full-width
          />
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
              <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">modelValue</td>
              <td class="px-4 py-3 font-mono text-gray-600">String | Number</td>
              <td class="px-4 py-3 font-mono text-gray-500">''</td>
              <td class="px-4 py-3 text-gray-700">選中的值（v-model）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">options</td>
              <td class="px-4 py-3 font-mono text-gray-600">Array</td>
              <td class="px-4 py-3 text-gray-500">-</td>
              <td class="px-4 py-3 text-gray-700">選項陣列（可為字串陣列或物件陣列）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">label</td>
              <td class="px-4 py-3 font-mono text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-gray-500">''</td>
              <td class="px-4 py-3 text-gray-700">標籤文字</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">placeholder</td>
              <td class="px-4 py-3 font-mono text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-gray-500">'全部'</td>
              <td class="px-4 py-3 text-gray-700">「全部」選項的文字</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">allValue</td>
              <td class="px-4 py-3 font-mono text-gray-600">String | Number</td>
              <td class="px-4 py-3 font-mono text-gray-500">''</td>
              <td class="px-4 py-3 text-gray-700">「全部」選項的值</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">disabled</td>
              <td class="px-4 py-3 font-mono text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-gray-500">false</td>
              <td class="px-4 py-3 text-gray-700">是否禁用</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">size</td>
              <td class="px-4 py-3 font-mono text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-gray-500">'sm'</td>
              <td class="px-4 py-3 text-gray-700">尺寸（'xs' | 'sm' | 'md' | 'lg'）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">fullWidth</td>
              <td class="px-4 py-3 font-mono text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-gray-500">false</td>
              <td class="px-4 py-3 text-gray-700">是否佔滿容器寬度</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">valueKey</td>
              <td class="px-4 py-3 font-mono text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-gray-500">null</td>
              <td class="px-4 py-3 text-gray-700">物件陣列的值鍵名（如 'id'）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">labelKey</td>
              <td class="px-4 py-3 font-mono text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-gray-500">null</td>
              <td class="px-4 py-3 text-gray-700">物件陣列的標籤鍵名（如 'name'）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">labelClass</td>
              <td class="px-4 py-3 font-mono text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-gray-500">''</td>
              <td class="px-4 py-3 text-gray-700">標籤的額外 CSS class</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">selectClass</td>
              <td class="px-4 py-3 font-mono text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-gray-500">''</td>
              <td class="px-4 py-3 text-gray-700">select 元素的額外 CSS class</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">showAllOption</td>
              <td class="px-4 py-3 font-mono text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-gray-500">true</td>
              <td class="px-4 py-3 text-gray-700">是否顯示「全部」選項</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-cyan-600">numberValue</td>
              <td class="px-4 py-3 font-mono text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-gray-500">false</td>
              <td class="px-4 py-3 text-gray-700">是否將值轉為數字</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Events & Slots -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📡</span>
        Events & Slots
      </h2>

      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Events</h3>
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
                  <td class="px-4 py-3 font-mono text-cyan-600">update:modelValue</td>
                  <td class="px-4 py-3 font-mono text-gray-600">(value: String | Number)</td>
                  <td class="px-4 py-3 text-gray-700">當選擇的值改變時觸發</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Slots</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b-2 border-gray-200">
                  <th class="px-4 py-3 text-left font-semibold text-gray-900">Slot 名稱</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-900">Scoped 屬性</th>
                  <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-mono text-cyan-600">default</td>
                  <td class="px-4 py-3 font-mono text-gray-600">{ option }</td>
                  <td class="px-4 py-3 text-gray-700">自定義選項內容渲染</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
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
          <h3 class="text-lg font-semibold text-gray-900 mb-3">基礎用法（字串陣列）</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;FilterSelect
    v-model="selectedStatus"
    label="狀態"
    :options="['啟用', '停用', '待審核']"
    placeholder="所有狀態"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import FilterSelect from '@/components/common/FilterSelect.vue';

const selectedStatus = ref('');
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 物件陣列 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">物件陣列 + 自定義鍵值</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;FilterSelect
    v-model="selectedCategory"
    label="產品分類"
    :options="categories"
    valueKey="id"
    labelKey="name"
    placeholder="所有分類"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import FilterSelect from '@/components/common/FilterSelect.vue';

const categories = ref([
  { id: 1, name: '電子產品', count: 150 },
  { id: 2, name: '服飾', count: 200 },
  { id: 3, name: '食品', count: 80 }
]);

const selectedCategory = ref('');
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 自定義選項渲染 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">使用 Slot 自定義選項</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;FilterSelect
    v-model="selectedProduct"
    label="產品"
    :options="products"
    valueKey="id"
    labelKey="name"
  &gt;
    &lt;template #default="{ option }"&gt;
      &#123;&#123; option.name &#125;&#125; (庫存: &#123;&#123; option.stock &#125;&#125;)
    &lt;/template&gt;
  &lt;/FilterSelect&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import FilterSelect from '@/components/common/FilterSelect.vue';

const products = ref([
  { id: 1, name: 'Product A', stock: 50 },
  { id: 2, name: 'Product B', stock: 30 },
  { id: 3, name: 'Product C', stock: 0 }
]);

const selectedProduct = ref('');
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 數字值 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">數字值轉換</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;FilterSelect
    v-model="selectedYear"
    label="年份"
    :options="[2020, 2021, 2022, 2023, 2024]"
    placeholder="所有年份"
    number-value
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import FilterSelect from '@/components/common/FilterSelect.vue';

const selectedYear = ref(2024); // 數字型別
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 不顯示全部選項 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">隱藏「全部」選項</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;FilterSelect
    v-model="selectedLanguage"
    label="語言"
    :options="['繁體中文', 'English', '日本語']"
    :show-all-option="false"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import FilterSelect from '@/components/common/FilterSelect.vue';

const selectedLanguage = ref('繁體中文');
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 多個組合 -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-3">多個 FilterSelect 組合</h3>
          <div class="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre class="text-green-400 text-sm font-mono"><code>&lt;template&gt;
  &lt;div class="flex gap-4"&gt;
    &lt;FilterSelect
      v-model="filters.category"
      label="分類"
      :options="categoryOptions"
      size="sm"
    /&gt;
    
    &lt;FilterSelect
      v-model="filters.status"
      label="狀態"
      :options="statusOptions"
      size="sm"
    /&gt;
    
    &lt;FilterSelect
      v-model="filters.region"
      label="區域"
      :options="regionOptions"
      size="sm"
    /&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue';
import FilterSelect from '@/components/common/FilterSelect.vue';

const filters = ref({
  category: '',
  status: '',
  region: ''
});

const categoryOptions = ref(['3C', '家電', '服飾']);
const statusOptions = ref(['上架', '下架']);
const regionOptions = ref(['北區', '中區', '南區']);
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
            <li>• 使用物件陣列時，務必設定 <code class="px-1.5 py-0.5 bg-green-100 rounded">valueKey</code> 和 <code class="px-1.5 py-0.5 bg-green-100 rounded">labelKey</code></li>
            <li>• 根據使用場景選擇合適的尺寸（儀表板過濾器通常使用 sm）</li>
            <li>• 為標籤提供清晰的描述文字，幫助用戶理解過濾器的作用</li>
            <li>• 在需要數字型別的場景（如年份、數量）使用 <code class="px-1.5 py-0.5 bg-green-100 rounded">numberValue</code></li>
            <li>• 使用 Slot 可以實現更複雜的選項顯示（如帶圖示、計數等）</li>
            <li>• 使用 <code class="px-1.5 py-0.5 bg-green-100 rounded">fullWidth</code> 讓組件在表單佈局中更靈活</li>
          </ul>
        </div>

        <div class="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
          <h3 class="font-semibold text-yellow-900 mb-2 flex items-center">
            <span class="mr-2">⚠️</span>
            注意事項
          </h3>
          <ul class="space-y-2 text-yellow-800 text-sm ml-6">
            <li>• 字串陣列與物件陣列不可混用，需統一格式</li>
            <li>• 使用 <code class="px-1.5 py-0.5 bg-yellow-100 rounded">numberValue</code> 時，options 中的值也應為數字</li>
            <li>• <code class="px-1.5 py-0.5 bg-yellow-100 rounded">allValue</code> 的型別應與選項值的型別一致</li>
            <li>• Slot 自定義會覆蓋預設的選項顯示，需確保渲染邏輯完整</li>
            <li>• 在響應式設計中，考慮使用 <code class="px-1.5 py-0.5 bg-yellow-100 rounded">fullWidth</code> 適應不同螢幕尺寸</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 與其他組件的對比 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔄</span>
        組件選擇指南
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">特性</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">FilterSelect</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">FilterBar</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">FilterDropdown</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">選擇方式</td>
              <td class="px-4 py-3 text-gray-600">單選</td>
              <td class="px-4 py-3 text-gray-600">單選（多個過濾器）</td>
              <td class="px-4 py-3 text-gray-600">多選</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">使用場景</td>
              <td class="px-4 py-3 text-gray-600">單一過濾器</td>
              <td class="px-4 py-3 text-gray-600">多過濾器橫向排列</td>
              <td class="px-4 py-3 text-gray-600">需同時選多個選項</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">配置方式</td>
              <td class="px-4 py-3 text-gray-600">單個組件 props</td>
              <td class="px-4 py-3 text-gray-600">統一配置陣列</td>
              <td class="px-4 py-3 text-gray-600">單個組件 props</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">v-model 類型</td>
              <td class="px-4 py-3 text-gray-600">String | Number</td>
              <td class="px-4 py-3 text-gray-600">Object</td>
              <td class="px-4 py-3 text-gray-600">Array</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">靈活性</td>
              <td class="px-4 py-3 text-gray-600">⭐⭐⭐⭐⭐</td>
              <td class="px-4 py-3 text-gray-600">⭐⭐⭐</td>
              <td class="px-4 py-3 text-gray-600">⭐⭐⭐⭐</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-gray-700">適合情境</td>
              <td class="px-4 py-3 text-gray-600">表單、單一過濾</td>
              <td class="px-4 py-3 text-gray-600">儀表板頂部過濾欄</td>
              <td class="px-4 py-3 text-gray-600">多選標籤過濾</td>
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
            <span class="font-semibold text-gray-900">如何處理物件陣列選項？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-cyan-500 mt-2">
            <p class="text-gray-700 mb-2">
              使用 <code class="px-2 py-1 bg-gray-100 text-cyan-600 rounded">valueKey</code> 和 <code class="px-2 py-1 bg-gray-100 text-cyan-600 rounded">labelKey</code> 指定物件的鍵名：
            </p>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>const options = [
  { id: 1, name: 'Option 1' },
  { id: 2, name: 'Option 2' }
];

// 在模板中
&lt;FilterSelect
  :options="options"
  valueKey="id"
  labelKey="name"
/&gt;</code></pre>
            </div>
          </div>
        </details>

        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span class="font-semibold text-gray-900">如何在選項中顯示額外資訊？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-cyan-500 mt-2">
            <p class="text-gray-700 mb-2">使用 default slot 自定義選項渲染：</p>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>&lt;FilterSelect :options="products"&gt;
  &lt;template #default="{ option }"&gt;
    &#123;&#123; option.name &#125;&#125; - $&#123;&#123; option.price &#125;&#125;
  &lt;/template&gt;
&lt;/FilterSelect&gt;</code></pre>
            </div>
          </div>
        </details>

        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span class="font-semibold text-gray-900">numberValue 什麼時候使用？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-cyan-500 mt-2">
            <p class="text-gray-700">
              當 v-model 綁定的變數需要是數字型別時使用。例如年份、數量等。開啟後，組件會自動將選中值轉為 Number 型別。
              注意：options 中的值也應該是數字，否則會出現型別不匹配的問題。
            </p>
          </div>
        </details>

        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span class="font-semibold text-gray-900">如何自定義樣式？</span>
            <i class="fas fa-chevron-down group-open:rotate-180 transition-transform text-gray-500"></i>
          </summary>
          <div class="p-4 bg-white border-l-4 border-cyan-500 mt-2">
            <p class="text-gray-700 mb-2">
              使用 <code class="px-2 py-1 bg-gray-100 rounded">labelClass</code> 和 <code class="px-2 py-1 bg-gray-100 rounded">selectClass</code> props：
            </p>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>&lt;FilterSelect
  label-class="font-bold text-blue-600"
  select-class="border-2 border-blue-500"
/&gt;</code></pre>
            </div>
          </div>
        </details>
      </div>
    </section>

    <!-- 相關組件 -->
    <section class="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl shadow-md p-8 border-2 border-cyan-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔗</span>
        相關組件
      </h2>

      <div class="grid md:grid-cols-2 gap-4">
        <router-link
          to="/docs/components/filter-bar"
          class="flex items-center p-4 bg-white hover:bg-gray-50 rounded-lg shadow-md transition-all duration-200 border-2 border-transparent hover:border-indigo-500 group"
        >
          <span class="text-3xl mr-4">🎛️</span>
          <div>
            <h3 class="font-semibold text-gray-900 group-hover:text-indigo-600">FilterBar 過濾橫列</h3>
            <p class="text-sm text-gray-600">多過濾器統一管理</p>
          </div>
        </router-link>

        <router-link
          to="/docs/components/filter-dropdown"
          class="flex items-center p-4 bg-white hover:bg-gray-50 rounded-lg shadow-md transition-all duration-200 border-2 border-transparent hover:border-teal-500 group"
        >
          <span class="text-3xl mr-4">🔽</span>
          <div>
            <h3 class="font-semibold text-gray-900 group-hover:text-teal-600">FilterDropdown 過濾器</h3>
            <p class="text-sm text-gray-600">多選下拉過濾器</p>
          </div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import FilterSelect from '@/components/common/FilterSelect.vue';

// 基礎示例
const basicValue = ref('');

// 物件陣列示例
const categoryOptions = ref([
  { id: 1, name: '電子產品' },
  { id: 2, name: '服飾配件' },
  { id: 3, name: '食品飲料' }
]);
const objectValue = ref('');

// 尺寸示例
const sizeOptions = ref(['Option 1', 'Option 2', 'Option 3']);
const sizeValue = ref('');

// 全寬示例
const regionOptions = ref(['北區', '中區', '南區', '東區']);
const fullWidthValue = ref('');
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
