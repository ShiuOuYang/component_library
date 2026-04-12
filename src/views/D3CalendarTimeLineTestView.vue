<template>
  <div class="d3-calendar-timeline-test-view">
    <h1 class="text-3xl font-bold mb-6">D3 Calendar Timeline 測試頁面</h1>

    <div class="grid gap-6">
      <!-- 基本圖表 -->
      <div class="chart-container">
        <h2 class="text-xl font-semibold mb-4">基本 Calendar Timeline 圖表</h2>
        <div class="bg-white p-4 rounded-lg shadow">
          <D3CalendarTimeLineAll
            :data="chartData"
            :width="900"
            :height="342"
            x-key="Time"
            :y-key-array="['RateA', 'RateB', 'RateC']"
            :series-key-array="['A', 'B', 'C']"
            :x-count-array="[5, 5, 5]"
            left-title="異常批數"
            right-title="異常率(%)"
            :left-tick-color="'#333'"
            :right-tick-color="'#0080FF'"
          >
            <!-- Tooltip slot -->
            <template #tooltip="{ data, status, extraData }">
              <div class="bg-gray-800 text-white p-3 rounded-lg shadow-lg">
                <div v-if="status === 'stack'">
                  <div class="font-semibold">{{ data.Time }}</div>
                  <div class="mt-1">
                    <div>A: {{ data.A }}</div>
                    <div>B: {{ data.B }}</div>
                    <div>C: {{ data.C }}</div>
                  </div>
                </div>
                <div v-else-if="status === 'point'">
                  <div class="font-semibold">{{ data.Time }}</div>
                  <div class="mt-1">
                    <div>{{ extraData }}: {{ (data[extraData] * 100).toFixed(1) }}%</div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Threshold slots (如果需要的話) -->
            <template #thresholds>
              <!-- 可以在這裡添加閾值線 -->
            </template>
          </D3CalendarTimeLineAll>
        </div>
      </div>

      <!-- 自定義參數的圖表 -->
      <!-- customChartData 是一個包含數據點的陣列，每個物件代表一個時間點的數據 -->
      <!-- x-key="Date" 指定 X 軸（橫軸）使用的數據欄位名稱 -->
      <!-- :y-key-array="['Rate1', 'Rate2']" 指定 Y 軸（縱軸）使用的數據欄位名稱 -->
      <!-- :series-key-array="['Series1', 'Series2']" 指定系列（線條）使用的數據欄位名稱 -->
      <div class="chart-container">
        <h2 class="text-xl font-semibold mb-4">自定義參數圖表</h2>
        <div class="bg-white p-4 rounded-lg shadow">
          <D3CalendarTimeLineAll
            :data="customChartData"
            :width="800"
            :height="342"
            x-key="Date"
            :y-key-array="['Rate1', 'Rate2']"
            :series-key-array="['Series1', 'Series2']"
            :x-count-array="[4, 4]"
            left-title="數量"
            right-title="比率"
            :left-tick-color="'#e74c3c'"
            :right-tick-color="'#3498db'"
            x-axis-a-font-size="12px"
          >
            <template #tooltip="{ data, status, extraData }">
              <div class="bg-blue-900 text-white p-2 rounded">
                <div class="text-sm font-bold">{{ data.Date }}</div>
                <div v-if="status === 'stack'" class="text-xs mt-1">
                  <div>Series1: {{ data.Series1 }}</div>
                  <div>Series2: {{ data.Series2 }}</div>
                </div>
                <div v-else-if="status === 'point'" class="text-xs mt-1">
                  <div>{{ extraData }}: {{ (data[extraData] * 100).toFixed(2) }}%</div>
                </div>
              </div>
            </template>
          </D3CalendarTimeLineAll>
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="controls bg-gray-100 p-4 rounded-lg">
        <h3 class="text-lg font-semibold mb-3">控制面板</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">圖表寬度</label>
            <input
              v-model.number="chartWidth"
              type="number"
              min="400"
              max="1200"
              class="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">圖表高度</label>
            <input
              v-model.number="chartHeight"
              type="number"
              min="200"
              max="600"
              class="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">點大小</label>
            <input
              v-model.number="pointSize"
              type="number"
              min="2"
              max="10"
              step="0.5"
              class="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div class="mt-4">
          <button
            @click="generateRandomData"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            生成隨機數據
          </button>
          <button
            @click="resetData"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 ml-2"
          >
            重置數據
          </button>
        </div>
      </div>

      <!-- 動態參數圖表 -->
      <div class="chart-container">
        <h2 class="text-xl font-semibold mb-4">動態參數圖表</h2>
        <div class="bg-white p-4 rounded-lg shadow">
          <D3CalendarTimeLineAll
            :data="chartData"
            :width="chartWidth"
            :height="chartHeight"
            x-key="Time"
            :y-key-array="['RateA', 'RateB', 'RateC']"
            :series-key-array="['A', 'B', 'C']"
            :x-count-array="[5, 5, 5]"
            left-title="動態批數"
            right-title="動態比率(%)"
            :point-size="pointSize"
          >
            <template #tooltip="{ data, status, extraData }">
              <div class="bg-green-800 text-white p-3 rounded-lg">
                <div class="font-bold">{{ data.Time }}</div>
                <div v-if="status === 'stack'" class="mt-1 text-sm">
                  <div>A: {{ data.A }} ({{ (data.RateA * 100).toFixed(1) }}%)</div>
                  <div>B: {{ data.B }} ({{ (data.RateB * 100).toFixed(1) }}%)</div>
                  <div>C: {{ data.C }} ({{ (data.RateC * 100).toFixed(1) }}%)</div>
                </div>
                <div v-else-if="status === 'point'" class="mt-1 text-sm">
                  <div>{{ extraData }}: {{ (data[extraData] * 100).toFixed(1) }}%</div>
                </div>
              </div>
            </template>
          </D3CalendarTimeLineAll>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import D3CalendarTimeLineAll from '@/components/D3CalendarTimeLineAll.vue'

// 響應式數據
const chartWidth = ref(900)
const chartHeight = ref(342)
const pointSize = ref(3)

// 基本圖表數據
const chartData = ref([
  {
    Time: '24Oct',
    A: 120,
    B: 95,
    C: 85,
    RateA: 0.35,
    RateB: 0.28,
    RateC: 0.22
  },
  {
    Time: '24Nov',
    A: 110,
    B: 88,
    C: 78,
    RateA: 0.32,
    RateB: 0.25,
    RateC: 0.19
  },
  {
    Time: '24Dec',
    A: 135,
    B: 102,
    C: 92,
    RateA: 0.38,
    RateB: 0.31,
    RateC: 0.25
  },
  {
    Time: '25W1',
    A: 98,
    B: 76,
    C: 68,
    RateA: 0.29,
    RateB: 0.22,
    RateC: 0.17
  },
  {
    Time: '25W2',
    A: 115,
    B: 91,
    C: 82,
    RateA: 0.33,
    RateB: 0.26,
    RateC: 0.2
  },
  {
    Time: '25W3',
    A: 88,
    B: 69,
    C: 61,
    RateA: 0.26,
    RateB: 0.19,
    RateC: 0.15
  },
  {
    Time: '25W4',
    A: 105,
    B: 83,
    C: 74,
    RateA: 0.31,
    RateB: 0.24,
    RateC: 0.18
  },
  {
    Time: '25W5',
    A: 142,
    B: 112,
    C: 98,
    RateA: 0.41,
    RateB: 0.34,
    RateC: 0.28
  },
  {
    Time: '250131',
    A: 67,
    B: 52,
    C: 45,
    RateA: 0.19,
    RateB: 0.15,
    RateC: 0.12
  },
  {
    Time: '250201',
    A: 72,
    B: 56,
    C: 49,
    RateA: 0.21,
    RateB: 0.16,
    RateC: 0.13
  },
  {
    Time: '250202',
    A: 69,
    B: 54,
    C: 47,
    RateA: 0.2,
    RateB: 0.15,
    RateC: 0.12
  },
  {
    Time: '250203',
    A: 75,
    B: 59,
    C: 51,
    RateA: 0.22,
    RateB: 0.17,
    RateC: 0.14
  },
  {
    Time: '250204',
    A: 81,
    B: 63,
    C: 55,
    RateA: 0.24,
    RateB: 0.18,
    RateC: 0.15
  },
  {
    Time: '250205',
    A: 77,
    B: 60,
    C: 52,
    RateA: 0.23,
    RateB: 0.17,
    RateC: 0.14
  },
  {
    Time: '250206',
    A: 84,
    B: 66,
    C: 57,
    RateA: 0.25,
    RateB: 0.19,
    RateC: 0.16
  }
])

// 自定義圖表數據
const customChartData = ref([
  {
    Date: '2024-01',
    Series1: 45,
    Series2: 38,
    Rate1: 0.15,
    Rate2: 0.12
  },
  {
    Date: '2024-02',
    Series1: 52,
    Series2: 41,
    Rate1: 0.18,
    Rate2: 0.14
  },
  {
    Date: '2024-03',
    Series1: 48,
    Series2: 39,
    Rate1: 0.16,
    Rate2: 0.13
  },
  {
    Date: '2024-04',
    Series1: 55,
    Series2: 44,
    Rate1: 0.19,
    Rate2: 0.15
  },
  {
    Date: '2024-05',
    Series1: 61,
    Series2: 48,
    Rate1: 0.21,
    Rate2: 0.16
  },
  {
    Date: '2024-06',
    Series1: 58,
    Series2: 46,
    Rate1: 0.2,
    Rate2: 0.15
  },
  {
    Date: '2024-07',
    Series1: 63,
    Series2: 50,
    Rate1: 0.22,
    Rate2: 0.17
  },
  {
    Date: '2024-08',
    Series1: 59,
    Series2: 47,
    Rate1: 0.2,
    Rate2: 0.16
  }
])

// 初始數據備份
const initialChartData = JSON.parse(JSON.stringify(chartData.value))

// 生成隨機數據
function generateRandomData() {
  chartData.value = chartData.value.map((item) => ({
    ...item,
    A: Math.floor(Math.random() * 80) + 40,
    B: Math.floor(Math.random() * 70) + 35,
    C: Math.floor(Math.random() * 60) + 30,
    RateA: Math.random() * 0.3 + 0.1,
    RateB: Math.random() * 0.25 + 0.08,
    RateC: Math.random() * 0.2 + 0.05
  }))
}

// 重置數據
function resetData() {
  chartData.value = JSON.parse(JSON.stringify(initialChartData))
  chartWidth.value = 900
  chartHeight.value = 342
  pointSize.value = 3
}

onMounted(() => {
  console.log('D3CalendarTimeLineTestView mounted')
})
</script>

<style scoped>
.d3-calendar-timeline-test-view {
  padding: 1.5rem;
  min-height: 100vh;
  background-color: #f9fafb;
}

.chart-container {
  margin-bottom: 2rem;
}

.controls {
  position: sticky;
  top: 1rem;
  z-index: 10;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .d3-calendar-timeline-test-view {
    padding: 1rem;
  }

  .grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}
</style>