<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-8">
    <div class="w-full">
      
      <!-- 標題與簡介 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div class="border-l-4 border-blue-600 pl-6">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            ChptTable
          </h1>
          <p class="text-lg text-gray-600 leading-relaxed">
            一個功能完整的 <span class="font-semibold text-blue-600">Vue 3 表格組件</span>，
            支援<span class="font-semibold">搜尋</span>、
            <span class="font-semibold">排序</span>、
            <span class="font-semibold">分頁</span>、
            以及<span class="font-semibold">自定義樣式</span>。
            內建自動排序類型檢測、響應式設計、以及多種自定義插槽，
            適用於各種數據展示場景。
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
            <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Composition API</span>
            <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Tailwind CSS</span>
            <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">自動排序</span>
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
          <!-- 表格區域 (左側 2/3) -->
          <div class="lg:col-span-2">
            <ChptTable
              :data="playgroundData"
              :columns="playgroundColumns"
              :searchPlaceholder="searchPlaceholder"
              :defaultPageSize="pageSize"
              :paginationPosition="paginationPosition"
              :noDataText="noDataText"
              ref="tableRef"
            >
              <!-- 自定義表格行 -->
              <template #table-row="{ item }">
                <tr>
                  <td v-for="column in playgroundColumns" :key="column.key">
                    <!-- 狀態欄位 -->
                    <template v-if="column.key === 'status'">
                      <span :class="[
                        'px-2 py-1 rounded-full text-xs font-medium',
                        item.status === '正常' ? 'bg-green-100 text-green-700' : 
                        item.status === '警告' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                      ]">
                        {{ item.status }}
                      </span>
                    </template>
                    
                    <!-- 一般欄位 -->
                    <template v-else>
                      {{ item[column.key] }}
                    </template>
                  </td>
                </tr>
              </template>
            </ChptTable>
          </div>

          <!-- 控制面板 (右側 1/3) -->
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">⚙️</span>
              控制面板
            </h3>
            
            <div class="space-y-4">
              
              <!-- 分頁位置 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">分頁位置</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    @click="paginationPosition = 'top'"
                    :class="[
                      'px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                      paginationPosition === 'top' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    ]"
                  >
                    頂部
                  </button>
                  <button
                    @click="paginationPosition = 'bottom'"
                    :class="[
                      'px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                      paginationPosition === 'bottom' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    ]"
                  >
                    底部
                  </button>
                  <button
                    @click="paginationPosition = 'both'"
                    :class="[
                      'px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                      paginationPosition === 'both' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    ]"
                  >
                    兩側
                  </button>
                </div>
              </div>

              <!-- 隨機數據 -->
              <button
                @click="generateRandomData"
                class="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
              >
                🎲 隨機生成數據
              </button>

              <!-- 清空數據 -->
              <button
                @click="clearData"
                class="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md transition-all duration-200"
              >
                🗑️ 清空數據
              </button>

              <!-- 事件日誌 -->
              <div class="mt-6 pt-4 border-t border-blue-200">
                <h4 class="text-sm font-semibold text-gray-700 mb-2">事件日誌</h4>
                <div class="space-y-1 text-xs text-gray-600 max-h-32 overflow-y-auto">
                  <div v-for="(log, index) in eventLog" :key="index" class="p-2 bg-white rounded">
                    {{ log }}
                  </div>
                  <div v-if="eventLog.length === 0" class="text-gray-400 italic">
                    尚無事件
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用範例 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-green-600 mr-3">📊</span>
          使用範例
        </h2>

        <!-- 基礎用法 -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">基礎用法</h3>
          <div class="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <pre class="text-sm text-gray-800 overflow-x-auto"><code>&lt;template&gt;
  &lt;ChptTable
    :data="tableData"
    :columns="tableColumns"
    :defaultPageSize="10"
    searchPlaceholder="搜尋資料..."
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue'
import ChptTable from '@/components/common/ChptTable.vue'

const tableData = ref([
  { id: 1, name: '張三', age: 25, department: '工程部' },
  { id: 2, name: '李四', age: 30, department: '業務部' },
  { id: 3, name: '王五', age: 28, department: '人資部' }
])

const tableColumns = [
  { key: 'id', label: 'ID', title: 'ID', width: '80px' },
  { key: 'name', label: '姓名', title: '姓名', width: '120px' },
  { key: 'age', label: '年齡', title: '年齡', width: '100px' },
  { key: 'department', label: '部門', title: '部門', width: '150px' }
]
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 自定義欄位 -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">自定義欄位內容</h3>
          <div class="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <pre class="text-sm text-gray-800 overflow-x-auto"><code>&lt;template&gt;
  &lt;ChptTable :data="data" :columns="columns"&gt;
    &lt;!-- 自定義表格行 --&gt;
    &lt;template #table-row="{ item }"&gt;
      &lt;tr&gt;
        &lt;td v-for="column in columns" :key="column.key"&gt;
          &lt;!-- 狀態欄位 --&gt;
          &lt;template v-if="column.key === 'status'"&gt;
            &lt;span :class="getStatusClass(item.status)"&gt;
              &#123;&#123; item.status &#125;&#125;
            &lt;/span&gt;
          &lt;/template&gt;
          
          &lt;!-- 一般欄位 --&gt;
          &lt;template v-else&gt;
            &#123;&#123; item[column.key] &#125;&#125;
          &lt;/template&gt;
        &lt;/td&gt;
      &lt;/tr&gt;
    &lt;/template&gt;
  &lt;/ChptTable&gt;
&lt;/template&gt;

&lt;script setup&gt;
const columns = [
  { key: 'name', label: '名稱', title: '名稱' },
  { key: 'status', label: '狀態', title: '狀態' }
]

function getStatusClass(status) {
  return status === '正常' ? 'text-green-600' : 'text-red-600'
}
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 自定義過濾器 -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">自定義過濾邏輯</h3>
          <div class="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <pre class="text-sm text-gray-800 overflow-x-auto"><code>&lt;template&gt;
  &lt;ChptTable
    :data="data"
    :columns="columns"
    :customFilter="customSearchFilter"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
// 自定義過濾函數：只在特定欄位搜尋
const customSearchFilter = (data, query) => {
  if (!query) return data
  
  const lowerQuery = query.toLowerCase()
  return data.filter(item => {
    return item.name?.toLowerCase().includes(lowerQuery) ||
           item.department?.toLowerCase().includes(lowerQuery)
  })
}
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- 排序功能 -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">排序功能</h3>
          <div class="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <p class="text-sm text-gray-700 mb-4">
              ChptTable 支援自動排序類型檢測，會根據數據類型自動選擇適當的排序方式：
            </p>
            <ul class="list-disc list-inside text-sm text-gray-700 mb-4 space-y-1">
              <li><strong>數字排序</strong>：自動檢測數字欄位並進行數值排序</li>
              <li><strong>日期排序</strong>：自動檢測日期格式並進行時間排序</li>
              <li><strong>字串排序</strong>：預設使用不分大小寫的字串排序</li>
            </ul>
            <pre class="text-sm text-gray-800 overflow-x-auto"><code>&lt;template&gt;
  &lt;ChptTable
    :data="data"
    :columns="columns"
    :defaultSort="{ column: 'age', direction: 'desc' }"
    @sort="handleSort"
  /&gt;
&lt;/template&gt;

&lt;script setup&gt;
const columns = [
  { key: 'name', label: '姓名' },
  { key: 'age', label: '年齡', sortType: 'number' },  // 可選：明確指定排序類型
  { key: 'date', label: '日期', sortType: 'date' },
  { key: 'status', label: '狀態', sortable: false }  // 禁用排序
]

const handleSort = ({ column, direction }) => {
  console.log(`按 ${column} 欄位進行 ${direction} 排序`)
}
&lt;/script&gt;</code></pre>
          </div>
        </div>
      </div>

      <!-- API 文件 (Props, Slots & Events) -->
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
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類型</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">預設值</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">說明</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="prop in propsDoc" :key="prop.name">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">{{ prop.name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" v-html="prop.type"></td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{{ prop.default }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ prop.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Columns 配置 -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Columns 配置</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">屬性名稱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類型</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">說明</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="col in columnsDoc" :key="col.name">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">{{ col.name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ col.type }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ col.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Slots -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Slots</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">插槽名稱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">參數</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">說明</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="slot in slotsDoc" :key="slot.name">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">{{ slot.name }}</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">{{ slot.params }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ slot.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Events -->
        <div>
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
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-green-600">{{ event.name }}</td>
                  <td class="px-6 py-4 text-sm text-gray-500 font-mono">{{ event.params }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ event.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 暴露的方法 -->
        <div class="mt-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">暴露的方法 (Exposed Methods)</h3>
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
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-orange-600">{{ method.name }}</td>
                  <td class="px-6 py-4 text-sm text-gray-700">{{ method.description }}</td>
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
import { ref } from 'vue'
import ChptTable from '../../components/common/ChptTable.vue'

// ========== 互動操場狀態 ==========
const searchPlaceholder = ref('搜尋資料...')
const noDataText = ref('無資料')
const pageSize = ref(5)
const paginationPosition = ref('top')
const tableRef = ref(null)
const eventLog = ref([])

const playgroundColumns = [
  { key: 'id', label: 'ID', title: 'ID', width: '80px' },
  { key: 'name', label: '姓名', title: '姓名', width: '120px' },
  { key: 'age', label: '年齡', title: '年齡', width: '100px' },
  { key: 'department', label: '部門', title: '部門', width: '150px' },
  { key: 'salary', label: '薪資', title: '薪資', width: '120px' },
  { key: 'hireDate', label: '到職日期', title: '到職日期', width: '130px' },
  { key: 'status', label: '狀態', title: '狀態', width: '100px' }
]

const initialData = [
  { id: 1, name: '張三', age: 25, department: '工程部', salary: 50000, hireDate: '2023-01-15', status: '正常' },
  { id: 2, name: '李四', age: 30, department: '業務部', salary: 60000, hireDate: '2022-05-20', status: '正常' },
  { id: 3, name: '王五', age: 28, department: '人資部', salary: 55000, hireDate: '2023-03-10', status: '警告' },
  { id: 4, name: '趙六', age: 35, department: '財務部', salary: 70000, hireDate: '2021-11-05', status: '正常' },
  { id: 5, name: '錢七', age: 27, department: '工程部', salary: 52000, hireDate: '2023-07-01', status: '異常' },
  { id: 6, name: '孫八', age: 32, department: '業務部', salary: 65000, hireDate: '2022-09-15', status: '正常' },
  { id: 7, name: '周九', age: 29, department: '工程部', salary: 58000, hireDate: '2023-02-20', status: '警告' },
  { id: 8, name: '吳十', age: 31, department: '人資部', salary: 56000, hireDate: '2022-12-01', status: '正常' }
]

const playgroundData = ref([...initialData])

const addEventLog = (message) => {
  eventLog.value.unshift(`[${new Date().toLocaleTimeString()}] ${message}`)
  if (eventLog.value.length > 5) eventLog.value.pop()
}

const handleEdit = (row) => {
  addEventLog(`編輯: ${row.name}`)
}

const handleDelete = (row) => {
  addEventLog(`刪除: ${row.name}`)
  playgroundData.value = playgroundData.value.filter(item => item.id !== row.id)
}

const generateRandomData = () => {
  const names = ['張三', '李四', '王五', '趙六', '錢七', '孫八', '周九', '吳十', '鄭十一', '馮十二']
  const departments = ['工程部', '業務部', '人資部', '財務部', '行政部']
  const statuses = ['正常', '警告', '異常']
  
  playgroundData.value = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: names[Math.floor(Math.random() * names.length)],
    age: Math.floor(Math.random() * 20) + 25,
    department: departments[Math.floor(Math.random() * departments.length)],
    salary: Math.floor(Math.random() * 40000) + 40000,
    hireDate: `202${Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    status: statuses[Math.floor(Math.random() * statuses.length)]
  }))
  
  addEventLog('已生成隨機數據')
}

const clearData = () => {
  playgroundData.value = []
  addEventLog('已清空數據')
}

// ========== API 文件數據 ==========
const propsDoc = [
  { name: 'data', type: 'Array', default: '[]', description: '表格數據陣列' },
  { name: 'columns', type: 'Array&lt;Column&gt;', default: '[]', description: '表格欄位配置陣列' },
  { name: 'searchPlaceholder', type: 'String', default: '\'輸入關鍵字搜尋...\'', description: '搜尋框提示文字' },
  { name: 'noDataText', type: 'String', default: '\'無資料\'', description: '無數據時顯示的文字' },
  { name: 'defaultPageSize', type: 'Number', default: '5', description: '預設每頁顯示筆數' },
  { name: 'customFilter', type: 'Function', default: 'null', description: '自定義過濾函數，接收 (data, query) 參數' },
  { name: 'defaultSort', type: 'Object', default: '{ column: null, direction: \'asc\' }', description: '預設排序配置' },
  { name: 'paginationPosition', type: 'String', default: '\'top\'', description: '分頁控制項位置：\'top\' | \'bottom\' | \'both\'' },
  { name: 'containerBgColor', type: 'String', default: '\'bg-white\'', description: '表格容器背景色 (Tailwind class)' },
  { name: 'containerRounded', type: 'String', default: '\'rounded-lg\'', description: '表格容器圓角 (Tailwind class)' },
  { name: 'containerShadow', type: 'String', default: '\'shadow-sm\'', description: '表格容器陰影 (Tailwind class)' },
  { name: 'headerBgGradient', type: 'String', default: '\'from-gray-50 to-gray-100\'', description: '表頭背景漸層 (Tailwind class)' },
  { name: 'headerTextColor', type: 'String', default: '\'text-gray-600\'', description: '表頭文字顏色 (Tailwind class)' },
  { name: 'evenRowBgColor', type: 'String', default: '\'rgb(249 250 251)\'', description: '偶數行背景色' },
  { name: 'hoverRowBgColor', type: 'String', default: '\'rgb(239 246 255)\'', description: 'Hover 行背景色' },
  { name: 'controlBgColor', type: 'String', default: '\'bg-white\'', description: '控制列背景色 (Tailwind class)' },
  { name: 'bottomControlBgColor', type: 'String', default: '\'bg-gray-50\'', description: '底部控制列背景色 (Tailwind class)' },
  { name: 'fontSize', type: 'String', default: '\'text-xs\'', description: '字體大小 (Tailwind class)' }
]

const columnsDoc = [
  { name: 'key', type: 'String', description: '欄位鍵值，對應數據物件的屬性名稱' },
  { name: 'label', type: 'String', description: '欄位標籤（用於內部識別）' },
  { name: 'title', type: 'String', description: '欄位顯示標題（顯示在表頭）' },
  { name: 'width', type: 'String', description: '欄位寬度（可選），例如：\'100px\'' },
  { name: 'style', type: 'Object', description: '自定義欄位樣式（可選）' },
  { name: 'sortable', type: 'Boolean', description: '是否可排序（預設為 true，有 key 的欄位都可排序）' },
  { name: 'sortType', type: 'String', description: '排序類型：\'string\' | \'number\' | \'date\'（可選，會自動檢測）' }
]

const slotsDoc = [
  { name: 'table-row', params: '{ item, index }', description: '自定義表格行內容，需要渲染完整的 <tr> 和 <td> 元素' },
  { name: 'left-controls', params: '-', description: '頂部搜尋區域左側的自定義控制項' },
  { name: 'right-controls', params: '-', description: '頂部搜尋區域右側的自定義控制項' },
  { name: 'bottom-left-controls', params: '-', description: '底部分頁區域左側的自定義控制項' },
  { name: 'bottom-right-controls', params: '-', description: '底部分頁區域右側的自定義控制項' },
  { name: 'footer', params: '-', description: '表格底部區域（tfoot）的自定義內容' },
  { name: 'modals', params: '-', description: '表格外部的模態框或彈出內容' }
]

const eventsDoc = [
  { name: 'update:page', params: 'currentPage: Number', description: '當前頁碼變化時觸發' },
  { name: 'update:pageSize', params: 'pageSize: Number', description: '每頁筆數變化時觸發' },
  { name: 'search', params: 'query: String', description: '執行搜尋時觸發' },
  { name: 'sort', params: '{ column, direction, columnConfig, enabledColumns }', description: '排序變化時觸發' }
]

const methodsDoc = [
  { name: 'refresh()', description: '重新執行搜尋' },
  { name: 'resetPage()', description: '重置到第一頁' },
  { name: 'resetSort()', description: '重置排序狀態' },
  { name: 'clearEnabledSort()', description: '清除所有已啟用的排序欄位' },
  { name: 'enableColumnSort(columnKey)', description: '啟用指定欄位的排序功能' },
  { name: 'setSorting(column, direction)', description: '設定排序欄位和方向' }
]
</script>

<style scoped>
/* 自定義 Range Slider 樣式 */
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  cursor: pointer;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  cursor: pointer;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: none;
}
</style>
