<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-slate-600 to-indigo-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🧩</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">基礎表單元件</h1>
          <p class="text-lg text-gray-600 mt-1">ChptInput / ChptRadio / ChptSwitch / ChptSelect / ChptDatePicker</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Composition API</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
      </div>
    </div>

    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🎨</span>
        互動示例
      </h2>

      <div class="grid xl:grid-cols-2 gap-8">
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-200 space-y-5">
          <h3 class="text-lg font-semibold text-gray-900">ChptInput</h3>
          <ChptInput
            v-model="form.keyword"
            label="關鍵字"
            placeholder="請輸入料號或站點"
            prefix-icon="search"
            clearable
            full-width
          />
          <p class="text-sm text-gray-600">目前值：<span class="font-mono text-gray-900">{{ form.keyword || '(空)' }}</span></p>
        </div>

        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-200 space-y-5">
          <h3 class="text-lg font-semibold text-gray-900">ChptSelect</h3>
          <ChptSelect
            v-model="form.site"
            label="廠區"
            :options="siteOptions"
            placeholder="請選擇廠區"
            full-width
          />
          <p class="text-sm text-gray-600">目前值：<span class="font-mono text-gray-900">{{ form.site || '(未選擇)' }}</span></p>
        </div>

        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-200 space-y-5">
          <h3 class="text-lg font-semibold text-gray-900">ChptRadio</h3>
          <ChptRadio
            v-model="form.priority"
            :items="priorityOptions"
            color="primary"
          />
          <p class="text-sm text-gray-600">目前值：<span class="font-mono text-gray-900">{{ form.priority }}</span></p>
        </div>

        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-200 space-y-5">
          <h3 class="text-lg font-semibold text-gray-900">ChptSwitch</h3>
          <div class="flex items-center gap-4">
            <ChptSwitch v-model="form.notify" label="啟用通知" color="success" />
            <span class="text-sm text-gray-600">{{ form.notify ? 'On' : 'Off' }}</span>
          </div>
        </div>

        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-200 space-y-5 xl:col-span-2">
          <h3 class="text-lg font-semibold text-gray-900">ChptDatePicker</h3>
          <div class="grid md:grid-cols-2 gap-4">
            <ChptDatePicker
              v-model="form.date"
              label="單日"
              placeholder="選擇日期"
              full-width
            />
            <ChptDatePicker
              v-model="form.range"
              label="區間"
              :range="true"
              :enable-time-picker="true"
              format="yyyy-MM-dd HH:mm"
              full-width
            />
          </div>
          <p class="text-sm text-gray-600 break-all">
            單日：<span class="font-mono text-gray-900">{{ form.date ? String(form.date) : '(未選擇)' }}</span>
          </p>
        </div>
      </div>
    </section>

    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">⚙️</span>
        元件對照
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">元件</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">用途</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">v-model 型別</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">常用事件</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-indigo-600">ChptInput</td>
              <td class="px-4 py-3 text-gray-700">文字輸入、前綴圖示、清除</td>
              <td class="px-4 py-3 font-mono text-gray-600">String | Number</td>
              <td class="px-4 py-3 font-mono text-gray-600">update:modelValue, clear, blur, focus</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-indigo-600">ChptRadio</td>
              <td class="px-4 py-3 text-gray-700">單選群組</td>
              <td class="px-4 py-3 font-mono text-gray-600">String | Number | Boolean</td>
              <td class="px-4 py-3 font-mono text-gray-600">update:modelValue</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-indigo-600">ChptSwitch</td>
              <td class="px-4 py-3 text-gray-700">布林狀態切換</td>
              <td class="px-4 py-3 font-mono text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-gray-600">update:modelValue, change</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-indigo-600">ChptSelect</td>
              <td class="px-4 py-3 text-gray-700">單選下拉、選項映射</td>
              <td class="px-4 py-3 font-mono text-gray-600">String | Number</td>
              <td class="px-4 py-3 font-mono text-gray-600">update:modelValue</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-indigo-600">ChptDatePicker</td>
              <td class="px-4 py-3 text-gray-700">日期、日期區間、時間選擇</td>
              <td class="px-4 py-3 font-mono text-gray-600">Date | String | Array</td>
              <td class="px-4 py-3 font-mono text-gray-600">update:modelValue, clear</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💻</span>
        引入方式
      </h2>

      <div class="bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>import {
  ChptInput,
  ChptRadio,
  ChptSwitch,
  ChptSelect,
  ChptDatePicker
} from '@/components/common'</code></pre>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import {
  ChptInput,
  ChptRadio,
  ChptSwitch,
  ChptSelect,
  ChptDatePicker
} from '@/components/common'

const form = reactive({
  keyword: '',
  site: '',
  priority: 'high',
  notify: true,
  date: null,
  range: null
})

const siteOptions = ['FAB-A', 'FAB-B', 'FAB-C']

const priorityOptions = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' }
]
</script>
