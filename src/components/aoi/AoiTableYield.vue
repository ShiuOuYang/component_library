<template>
  <div class="aoi-table-yield">
    <div class="overflow-x-auto rounded-md border border-slate-200">
      <table class="w-full border-collapse text-sm text-center bg-white">
        <thead>
          <tr>
            <th v-show="(aoiData.infoData?.value || []).length > 1" class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap"></th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">廠別</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">料號</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">批號</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">層別</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">LotType</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">修前良率</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">修後良率</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">Trigger</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">Target</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">面次</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">Top1</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">Loss</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">Top2</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">Loss</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">Top3</th>
            <th class="px-2 py-3 text-gray-800 bg-slate-50 font-semibold border-b-2 border-slate-200 whitespace-nowrap">Loss</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="data in (aoiData.infoData?.value || [])" :key="data.Factory">
            <tr class="border-b border-slate-100 last:border-b-2 last:border-slate-300 even:bg-gray-50">
              <td class="w-8 p-0" rowspan="2" v-if="(aoiData.infoData?.value || []).length > 1 && leadtoData[0]?.LotNum !== data.LotNum">
                <div class="flex justify-center items-center h-full">
                  <span class="material-symbols-outlined text-blue-500 text-2xl">arrow_right</span>
                </div>
              </td>
              <td class="px-1.5 py-2 whitespace-nowrap" rowspan="2" v-else-if="(aoiData.infoData?.value || []).length > 1 && leadtoData[0]?.LotNum === data.LotNum"></td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-800" rowspan="2">{{ data.Factory }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-800" rowspan="2">{{ data.PartNo }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium" rowspan="2" v-if="(aoiData.infoData?.value || []).length > 1 && leadtoData[0]?.LotNum === data.LotNum">
                <a href="#" @click.prevent="handleGfaClick(leadtoData[0])" class="text-blue-600 no-underline font-semibold hover:underline hover:text-blue-700">
                  {{ data.LotNum }}
                </a>
              </td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-800" rowspan="2" v-else>{{ data.LotNum }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-800" rowspan="2">{{ data.Layer }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-800" rowspan="2">{{ data.LotType }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold text-emerald-600" rowspan="2">{{ formatPercent(data.Bef_Yield) }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold text-emerald-600" rowspan="2">{{ formatPercent(data.Yield) }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold text-red-600" rowspan="2">{{ formatPercent(data.Triger) }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold text-blue-600" rowspan="2">{{ formatPercent(data.Target) }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold bg-slate-200">C</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-700">{{ data.C_TOP_1 }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold text-red-600">{{ data.C_TOP1 }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-700">{{ data.C_TOP_2 }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold text-red-600">{{ data.C_TOP2 }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-700">{{ data.C_TOP_3 }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold text-red-600">{{ data.C_TOP3 }}</td>
            </tr>
            <tr class="border-b border-slate-100 last:border-b-2 last:border-slate-300 even:bg-gray-50">
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold bg-slate-200">S</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-700">{{ data.S_TOP_1 }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold text-red-600">{{ data.S_TOP1 }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-700">{{ data.S_TOP_2 }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold text-red-600">{{ data.S_TOP2 }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-medium text-gray-700">{{ data.S_TOP_3 }}</td>
              <td class="px-1.5 py-2 whitespace-nowrap font-semibold text-red-600">{{ data.S_TOP3 }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue'

/**
 * AOI Table Yield 組件
 * 使用 inject 接收來自上層的 aoiData
 */

// 從上層組件 inject 數據（提供默認值避免 undefined）
const aoiData = inject('aoiData', {
  infoData: ref([]),
  tempinfoData: ref(null),
  loadAoiLotData: async () => console.warn('loadAoiLotData not provided')
})

// 計算 leadtoData（引導到其他批次的資料）
const leadtoData = computed(() => {
  if (!aoiData.tempinfoData?.value || !aoiData.infoData?.value || aoiData.infoData.value.length === 0) return []
  
  const { OldLotNum, LotNum } = aoiData.tempinfoData.value
  return aoiData.infoData.value.filter((i) => {
    // 目前為 YM
    if (OldLotNum === LotNum) {
      // 返回 SN
      return i.OldLotNum !== i.LotNum
    } else { // SN
      // 返回 YM
      return i.OldLotNum === i.LotNum
    }
  })
})

/**
 * 格式化百分比
 */
const formatPercent = (value) => {
  if (value === null || value === undefined) return 'N/A'
  return `${(value * 100).toFixed(2)}%`
}

/**
 * 處理 GFA 點擊事件
 */
const handleGfaClick = async (data) => {
  try {
    console.log('🎯 切換到其他批次:', data)
    // 使用 aoiData 提供的方法或直接調用 loadAoiLotData
    if (aoiData.loadAoiLotData) {
      await aoiData.loadAoiLotData(data.LotNum, data.LayerName)
    }
  } catch (error) {
    console.error('❌ 切換批次失敗:', error)
  }
}
</script>