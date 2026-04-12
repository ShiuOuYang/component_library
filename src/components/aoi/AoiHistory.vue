<template>
  <div class="h-full flex flex-col">
    <div class="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-300 mb-2">
      <h6 class="m-0 font-bold flex items-center">
        <i class="bi bi-clock-history mr-2"></i>
        製程歷史
      </h6>
      <span class="px-2 py-1 bg-blue-500 text-white text-xs rounded">{{ historyData?.length || 0 }} 筆記錄</span>
    </div>

    <div class="flex-1 overflow-auto border border-gray-300 rounded bg-white">
      <table class="w-full text-sm text-center border-collapse">
        <thead class="sticky top-0 bg-white z-10 shadow-sm">
          <tr>
            <th class="px-2 py-2.5 text-gray-900 font-semibold border-b-2 border-gray-300 whitespace-nowrap">層別</th>
            <th class="px-2 py-2.5 text-gray-900 font-semibold border-b-2 border-gray-300 whitespace-nowrap">站點</th>
            <th class="px-2 py-2.5 text-gray-900 font-semibold border-b-2 border-gray-300 whitespace-nowrap">機台</th>
            <th class="px-2 py-2.5 text-gray-900 font-semibold border-b-2 border-gray-300 whitespace-nowrap">CheckIn</th>
          </tr>
        </thead>
        <tbody v-if="historyData && historyData.length > 0">
          <tr v-for="(data, index) in historyData" :key="index" class="even:bg-gray-50 hover:bg-gray-200 transition-colors">
            <td class="px-2 py-2 border-b border-gray-100 whitespace-nowrap">{{ data.LayerName || data.Layer || '-' }}</td>
            <td class="px-2 py-2 border-b border-gray-100 whitespace-nowrap">{{ data.ProcName2 || data.ProcName || '-' }}</td>
            <td class="px-2 py-2 border-b border-gray-100 whitespace-nowrap">{{ data.MachineName || data.Machine || '-' }}</td>
            <td class="px-2 py-2 border-b border-gray-100 whitespace-nowrap">{{ formatDateTime(data.ChangeTime || data.ChangeTime) }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td colspan="4" class="text-center text-gray-500 py-4">
              <i class="bi bi-inbox mr-2"></i>
              暫無製程歷史記錄
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue'

/**
 * AOI History 組件
 * 顯示批次的製程歷史記錄
 * 參照 FLI 的資料串接模式，使用 inject 獲取數據
 */

// Inject AOI 數據
const aoiData = inject('aoiData', {
  historyData: ref([])
})

const { historyData } = aoiData

/**
 * 格式化日期時間
 */
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  
  // 如果已經是格式化的字串
  if (typeof dateTime === 'string') {
    // 格式: "2024-01-15 14:30:25" -> "2024-01-15 14:30:25"
    if (dateTime.length >= 19) {
      return dateTime.substring(0, 10) + ' ' + dateTime.substring(11, 19)
    }
    return dateTime
  }
  
  // 如果是 Date 物件
  try {
    const date = new Date(dateTime)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    console.error('❌ [AoiHistory] 日期格式化失敗:', error)
    return '-'
  }
}
</script>
