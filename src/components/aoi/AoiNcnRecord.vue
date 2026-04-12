<template>
  <div class="h-full flex flex-col">
    <div class="flex justify-between items-center p-2 bg-yellow-50 rounded border border-yellow-400 mb-2">
      <h6 class="m-0 font-bold flex items-center">
        <i class="bi bi-exclamation-triangle mr-2"></i>
        NCN 記錄
      </h6>
      <span class="px-2 py-1 bg-red-500 text-white text-xs rounded">{{ ncnrecordData?.length || 0 }} 筆異常</span>
    </div>

    <div class="flex-1 overflow-auto border border-gray-300 rounded bg-white">
      <table class="w-full text-sm text-center border-collapse">
        <thead class="sticky top-0 bg-white z-10 shadow-sm">
          <tr class="font-bold">
            <th class="px-2 py-2.5 text-gray-900 font-semibold border-b-2 border-gray-300 whitespace-nowrap">NCN單號</th>
            <th class="px-2 py-2.5 text-gray-900 font-semibold border-b-2 border-gray-300 whitespace-nowrap">開單時間</th>
            <th class="px-2 py-2.5 text-gray-900 font-semibold border-b-2 border-gray-300 whitespace-nowrap">層別</th>
            <th class="px-2 py-2.5 text-gray-900 font-semibold border-b-2 border-gray-300 whitespace-nowrap">內容</th>
            <th class="px-2 py-2.5 text-gray-900 font-semibold border-b-2 border-gray-300 whitespace-nowrap">數量</th>
            <th class="px-2 py-2.5 text-gray-900 font-semibold border-b-2 border-gray-300 whitespace-nowrap">影響</th>
          </tr>
        </thead>
        <tbody v-if="ncnrecordData && ncnrecordData.length > 0">
          <tr v-for="(data, index) in ncnrecordData" :key="index" class="even:bg-gray-50 hover:bg-yellow-50 transition-colors">
            <td class="px-2 py-2 border-b border-gray-100">
              <a
                target="_blank"
                :href="getNcnLink(data.ncn_no)"
                class="text-blue-600 no-underline font-semibold transition-all hover:text-blue-800 hover:underline"
                :title="`開啟 NCN ${data.ncn_no}`"
              >
                {{ data.ncn_no }}
                <i class="bi bi-box-arrow-up-right ml-1"></i>
              </a>
            </td>
            <td class="px-2 py-2 border-b border-gray-100">{{ formatDateTime(data.open_datetime) }}</td>
            <td class="px-2 py-2 border-b border-gray-100">
              <span class="px-2 py-1 bg-blue-400 text-white text-xs rounded">{{ data.Layer || '-' }}</span>
            </td>
            <td class="px-2 py-2 border-b border-gray-100 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-left pl-3" :title="data.Problem_des">
              {{ data.Problem_des || '-' }}
            </td>
            <td class="px-2 py-2 border-b border-gray-100">
              <span class="inline-block px-2 py-0.5 bg-blue-50 text-blue-900 text-xs rounded">
                {{ data.Prd_qty }}{{ data.Prd_unit }}
              </span>
            </td>
            <td class="px-2 py-2 border-b border-gray-100">
              <span class="inline-block px-2 py-0.5 bg-red-100 text-red-900 text-xs font-bold rounded">
                {{ data.Defect_qty }}{{ data.Defect_unit }}
              </span>
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td colspan="6" class="text-center text-gray-500 py-4">
              <i class="bi bi-check-circle mr-2"></i>
              無 NCN 記錄
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
 * AOI NCN Record 組件
 * 顯示批次的 NCN（不良品）記錄
 * 參照 FLI 的資料串接模式，使用 inject 獲取數據
 */

// Inject AOI 數據
const aoiData = inject('aoiData', {
  ncnrecordData: ref([])
})

const { ncnrecordData } = aoiData

/**
 * 格式化日期時間
 */
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  
  if (typeof dateTime === 'string') {
    if (dateTime.length >= 19) {
      return dateTime.substring(0, 10) + ' ' + dateTime.substring(11, 19)
    }
    return dateTime
  }
  
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
    console.error('❌ [AoiNcnRecord] 日期格式化失敗:', error)
    return '-'
  }
}

/**
 * 取得 NCN 連結
 */
const getNcnLink = (ncnNo) => {
  return `https://utcymncn01.unimicron.com/Carrier_YMncn/MRB_ReportNCN.aspx?ncn_no=${ncnNo}&status=NCN`
}
</script>
