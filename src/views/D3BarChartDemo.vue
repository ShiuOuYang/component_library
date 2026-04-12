<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto">
      <!-- 標題 -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">
          D3 條狀圖範圍選取組件示範
        </h1>
        <p class="text-gray-600">
          使用滑鼠拖曳選取範圍進行縮放，點擊 Reset 按鈕恢復原始視圖
        </p>
      </div>

      <!-- 圖表容器 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          產品銷售數據
        </h2>
        <D3BarChartWithBrush
          :data="salesData"
          :width="1200"
          :height="500"
          :margin="{ top: 40, right: 120, bottom: 100, left: 100 }"
          x-key="product"
          y-key="sales"
          series-key="category"
          x-axis-label="產品類別"
          y-axis-label="銷售數量"
          :show-legend="true"
          :padding="0.2"
          @bar-click="handleBarClick"
          @bar-hover="handleBarHover"
          @selection-change="handleSelectionChange"
        >
          <template #tooltip="{ data, show, loc }">
            <div
              v-if="show"
              class="fixed bg-gray-800 text-white px-3 py-2 rounded shadow-lg text-sm pointer-events-none z-50"
              :style="{ left: `${loc.x + 10}px`, top: `${loc.y - 10}px` }"
            >
              <div class="font-bold">{{ data.product }}</div>
              <div>類別: {{ data.category }}</div>
              <div>銷售: {{ data.sales }}</div>
            </div>
          </template>
        </D3BarChartWithBrush>
      </div>

      <!-- 另一個範例 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          月度異常批數統計
        </h2>
        <D3BarChartWithBrush
          :data="monthlyData"
          :width="1200"
          :height="400"
          :margin="{ top: 40, right: 120, bottom: 80, left: 100 }"
          x-key="month"
          y-key="count"
          series-key="type"
          x-axis-label="月份"
          y-axis-label="批數"
          :show-legend="true"
          :padding="0.15"
          :animate="true"
        />
      </div>

      <!-- 兩階層 X 軸範例 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">
          檢測階段異常統計（兩階層 X 軸 + 堆疊條狀圖）
        </h2>
        <div class="text-sm text-gray-600 mb-4 bg-blue-50 p-4 rounded-lg">
          <p class="font-semibold text-blue-800 mb-2">📊 圖表說明：</p>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>下層 X 軸</strong>：OQC / OQS 檢測點</li>
            <li><strong>上層 X 軸</strong>：LAB / EQP / PRD / CPV 階段分組</li>
            <li><strong>堆疊顯示</strong>：每個條狀圖堆疊顯示 4 個階段的異常批數</li>
            <li><strong>圖例</strong>：右側顯示 LAB（紅）、EQP（綠）、PRD（紫）、CPV（黃）</li>
            <li><strong>互動</strong>：可拖曳選取範圍進行縮放，點擊 Reset 恢復</li>
          </ul>
        </div>
        <D3BarChartWithBrush
          :data="hierarchicalData"
          :width="1200"
          :height="450"
          :margin="{ top: 40, right: 120, bottom: 120, left: 100 }"
          x-key="checkpoint"
          x-label-key="checkpointLabel"
          x-group-key="stage"
          :series-key-array="['已回覆OCAP','未回覆OCAP']"
          :colors="['#00BB00', '#CC3333']"
          :use-stacked-bar="true"
          x-axis-label="檢測階段與檢測點"
          y-axis-label="異常批數"
          :show-legend="true"
          :padding="0.2"
          :animate="true"
        />
      </div>

      <!-- 事件日誌 -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">事件日誌</h2>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          <div
            v-for="(log, index) in eventLogs"
            :key="index"
            class="text-sm p-2 bg-gray-50 rounded"
          >
            <span class="text-gray-500">{{ log.time }}</span>
            <span class="ml-2 font-medium">{{ log.type }}</span>
            <span class="ml-2 text-gray-600">{{ log.message }}</span>
          </div>
          <div v-if="eventLogs.length === 0" class="text-gray-400 text-center py-4">
            尚無事件記錄
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import D3BarChartWithBrush from '../components/D3BarChartWithBrush.vue'

// 產品銷售數據
const salesData = ref([
  { product: 'A產品', sales: 120, category: '電子產品' },
  { product: 'B產品', sales: 85, category: '電子產品' },
  { product: 'C產品', sales: 150, category: '家電' },
  { product: 'D產品', sales: 95, category: '家電' },
  { product: 'E產品', sales: 110, category: '電子產品' },
  { product: 'F產品', sales: 75, category: '配件' },
  { product: 'G產品', sales: 130, category: '配件' },
  { product: 'H產品', sales: 90, category: '家電' },
  { product: 'I產品', sales: 105, category: '電子產品' },
  { product: 'J產品', sales: 140, category: '家電' },
  { product: 'K產品', sales: 88, category: '配件' },
  { product: 'L產品', sales: 125, category: '電子產品' },
])

// 月度數據
const monthlyData = ref([
  { month: 'OQC', count: 45, type: 'LAB' },
  { month: 'OQS', count: 32, type: 'LAB' },
  { month: 'OQC', count: 28, type: 'EQP' },
  { month: 'OQS', count: 38, type: 'EQP' },
  { month: 'OQC', count: 42, type: 'PRD' },
  { month: 'OQS', count: 35, type: 'PRD' },
  { month: 'OQC', count: 50, type: 'CPV' },
  { month: 'OQS', count: 44, type: 'CPV' },
])

// 兩階層 X 軸數據（堆疊條狀圖格式）
// 重要：每個檢測點一行，包含所有階段的數據（LAB, EQP, PRD, CPV）
// checkpoint 必須是唯一值（用於識別），checkpointLabel 用於顯示
const hierarchicalData = ref([
  // LAB 階段的兩個檢測點
  { checkpoint: 'OOC-LAB', checkpointLabel: 'OOC', 已回覆OCAP: 15,未回覆OCAP:2,  stage: 'LAB' },
  { checkpoint: 'OOS-LAB', checkpointLabel: 'OOS', 已回覆OCAP: 8,未回覆OCAP: 0,  stage: 'LAB' },
  
  // EQP 階段的兩個檢測點
  { checkpoint: 'OOC-EQP', checkpointLabel: 'OOC', 已回覆OCAP: 12,未回覆OCAP: 2, stage: 'EQP' },
  { checkpoint: 'OOS-EQP', checkpointLabel: 'OOS', 已回覆OCAP: 10,未回覆OCAP: 0, stage: 'EQP' },
  
  // PRD 階段的兩個檢測點
  { checkpoint: 'OOC-PRD', checkpointLabel: 'OOC', 已回覆OCAP: 18,未回覆OCAP: 3, stage: 'PRD' },
  { checkpoint: 'OOS-PRD', checkpointLabel: 'OOS', 已回覆OCAP: 14,未回覆OCAP: 0, stage: 'PRD' },
  
  // CPV 階段的兩個檢測點
  { checkpoint: 'OOC-CPV', checkpointLabel: 'OOC', 已回覆OCAP: 22,未回覆OCAP: 3, stage: 'CPV' },
  { checkpoint: 'OOS-CPV', checkpointLabel: 'OOS', 已回覆OCAP: 16,未回覆OCAP: 3, stage: 'CPV' },
])

// 事件日誌
const eventLogs = ref([])

function addLog(type, message) {
  const time = new Date().toLocaleTimeString('zh-TW')
  eventLogs.value.unshift({ time, type, message })
  if (eventLogs.value.length > 10) {
    eventLogs.value.pop()
  }
}

function handleBarClick({ data }) {
  addLog('點擊', `點擊了 ${data.product || data.month}: ${data.sales || data.count}`)
}

function handleBarHover({ data }) {
  addLog('Hover', `滑過 ${data.product || data.month}`)
}

function handleSelectionChange({ xDomain, yDomain }) {
  addLog('選取', `X軸範圍: ${xDomain.length} 項, Y軸範圍: ${yDomain[0].toFixed(0)} - ${yDomain[1].toFixed(0)}`)
}
</script>

<style scoped>
/* 額外的樣式 */
</style>
