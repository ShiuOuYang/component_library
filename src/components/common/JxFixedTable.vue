<template>
  <div class="relative">
    <slot name="header">
      <div class="flex justify-end" v-if="showSearch">
        <input
          type="text"
          v-model="internalSearchText"
          placeholder="Search..."
          class="mb-4 text-sm p-2 border rounded outline-none"
        />
      </div>
    </slot>

    <div class="rounded shadow-sm overflow-hidden">
      <div ref="tableRef" :style="tableContainerStyle" @scroll="handleScroll">
        <table>
          <thead class="bg-gray-50 shadow-sm">
            <tr>
              <th
                class="py-[2px] px-[1px] bg-white border-b border-gray-200"
                v-for="column of innerColumns"
                :key="column.dataIndex"
                :class="[
                  currentScrollDirection === 'vertical'
                    ? `sticky top-0 bg-white z-${column.defaultFixed ? 20 : 10}`
                    : '',
                  currentScrollDirection === 'horizontal' && column.defaultFixed
                    ? 'sticky top-0 left-0 bg-white z-20'
                    : '',
                  currentScrollDirection === 'horizontal' && !column.defaultFixed
                    ? 'sticky top-0 bg-white z-10'
                    : ''
                ]"
                :style="{
                  width: `${column.width}px`,
                  left: `${getAccumulatedWidthByDataIndex(column)}px`
                }"
              >
                <!-- 垂直則全部 -->
                <div
                  class="relative flex items-center justify-center p-1 rounded transition-all duration-200"
                  :class="[column.defaultFixed ? 'bg-blue-50' : 'hover:bg-gray-100']"
                  :style="{ width: `${column.width}px` }"
                  @mouseover="mouseoverFixedIcon(column)"
                  @mouseleave="mouseleaveFixedIcon(column)"
                >
                  <!-- 標題區域 -->
                  <div class="flex items-center">
                    <span class="truncate font-normal" :class="[headerFontSizeClass, column.defaultFixed ? 'text-blue-600 font-semibold' : 'text-gray-700']">{{
                      column.title
                    }}</span>
                  </div>

                  <!-- 操作按鈕區 -->
                  <div
                    v-if="isKeep"
                    class="absolute right-0 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    :class="{ 'opacity-100': column.showUnfixedIcon }"
                  >
                    <!-- 固定按鈕 -->
                    <div
                      v-if="!column.defaultFixed"
                      class="absolute cursor-pointer hover:bg-gray-300/30 bg-white rounded-md border flex justify-center items-center right-0 top-0 w-3 h-3 z-50"
                      @click="fixedColumn(column)"
                    >
                      <JxIcon weight="500" color="gray-500" size="10">keep</JxIcon>
                    </div>
                    <!-- 取消固定按鈕 -->
                    <div
                      v-else
                      class="absolute cursor-pointer hover:bg-gray-300/30 bg-white rounded-md border flex justify-center items-center right-0 top-0 w-3 h-3 z-50"
                      @click="unFixedColumn(column)"
                    >
                      <JxIcon weight="500" color="gray-500" size="10">keep_off</JxIcon>
                    </div>
                  </div>

                  <!-- 篩選按鈕 -->
                  <!-- 根據 filterState 判斷是否有篩選 -->
                  <template v-if="isFilter && !hasActiveFilter(column.dataIndex)">
                    <div
                      class="absolute cursor-pointer hover:bg-gray-300/30 bg-white rounded-md border flex justify-center items-center right-0 bottom-0 w-3 h-3"
                      @click="clickHanlder($event, column)"
                    >
                      <JxIcon weight="500" color="gray-500" size="12">arrow_drop_down</JxIcon>
                    </div>
                  </template>
                  <template v-if="isFilter && hasActiveFilter(column.dataIndex)">
                    <div
                      class="absolute cursor-pointer hover:bg-gray-300/30 bg-white rounded-md border flex justify-center items-center right-0 bottom-0 w-3 h-3"
                      @click="clickHanlder($event, column)"
                    >
                      <JxIcon weight="300" color="gray-500" size="12">filter_alt</JxIcon>
                    </div>
                  </template>
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="sticky top-4" :class="divideClasses">
            <tr v-for="(row, rowIndex) in displayData" :key="rowIndex" class="hover:bg-gray-50">
              <td
                v-for="column in innerColumns"
                :key="column.dataIndex"
                class="p-0"
                :class="[column.defaultFixed ? 'sticky left-0 bg-white z-10' : '', cellFontSizeClass]"
                :style="{
                  width: `${column.width}px`,
                  left: `${getAccumulatedWidthByDataIndex(column)}px`
                }"
              >
                <slot
                  :name="`td-${column.dataIndex}`"
                  :column="column"
                  :row="row"
                  :rowIndex="rowIndex"
                >
                  <div class="text-center text-gray-700 whitespace-nowrap leading-tight py-0.5">
                    {{
                      column.format ? column.format(row[column.dataIndex]) : row[column.dataIndex]
                    }}
                  </div>
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <CommonTooltip
      :visible="tooltipInfo.opacity > 0"
      :position="{ x: tooltipInfo.x, y: tooltipInfo.y }"
      :data="{ items: [] }"
      theme="light"
      :show-arrow="false"
      :offset="{ x: 0, y: 0 }"
      max-width="none"
      :interactive="true"
      :auto-adjust-position="true"
      @close="clickHanlder($event)"
    >
      <template #default>
        <div class="p-0 text-sm text-gray-700 min-w-[200px]">
          <div class="flex items-center justify-end gap-1 mb-1.5">
            <input
              type="text"
              v-model="filterSearchText"
              placeholder="搜尋..."
              class="text-sm p-1 border rounded outline-none flex-1 min-w-0 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-all"
            />
            <button
              type="button"
              title="全選"
              class="p-1 cursor-pointer hover:bg-gray-100 rounded transition-all active:scale-90 active:bg-gray-200"
              @click="selectAllHandler"
            >
              <JxIcon
                weight="500"
                size="20"
                color="gray-400"
                >done_all</JxIcon
              >
            </button>
            <button
              type="button"
              title="關閉"
              class="p-1 cursor-pointer hover:bg-gray-100 rounded transition-all active:scale-90 active:bg-gray-200"
              @click="clickHanlder($event)"
            >
              <JxIcon
                weight="500"
                size="20"
                color="gray-400"
                >close</JxIcon
              >
            </button>
          </div>
          <div class="max-h-60 overflow-auto custom-scrollbar">
            <JxCheckBox
              direction="column"
              bg-color="success"
              v-model="filterColumnValueArray"
              :items="uniqueColumnValueArray"
            ></JxCheckBox>
          </div>
        </div>
      </template>
    </CommonTooltip>

    <!-- 分頁組件 -->
    <Pagination
      v-if="isPagination"
      v-model:current-page="currentPage"
      v-model:items-per-page="itemsPerPage"
      :total-items="finishedData.length"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

import JxIcon from './JxIcon.vue'
import JxCheckBox from './JxCheckBox.vue'
import Pagination from './Pagination.vue'
import CommonTooltip from './CommonTooltip.vue'

const props = defineProps({
  isKeep: {
    type: Boolean,
    default: true
  },
  isFilter: {
    type: Boolean,
    default: true
  },
  filterColumns: {
    type: Array,
    default: () => []
  },
  isFixed: {
    type: Boolean,
    default: true
  },
  columns: {
    type: Array,
    default: () => [
      {
        title: '員工編號',
        dataIndex: 'employeeId',
        width: 120,
        defaultFixed: true
      },
      {
        title: '姓名',
        dataIndex: 'name',
        width: 100,
        defaultFixed: true
      },
      {
        title: '部門',
        dataIndex: 'department',
        width: 120
      },
      {
        title: '職位',
        dataIndex: 'position',
        width: 120
      },
      {
        title: '入職日期',
        dataIndex: 'joinDate',
        width: 120
      },
      {
        title: '年資',
        dataIndex: 'seniority',
        width: 100
      },
      {
        title: '基本薪資',
        dataIndex: 'baseSalary',
        width: 120
      },
      {
        title: '績效獎金',
        dataIndex: 'bonus',
        width: 120
      },
      {
        title: '總薪資',
        dataIndex: 'totalSalary',
        width: 120
      },
      {
        title: '考核等級',
        dataIndex: 'performanceLevel',
        width: 150
      },
      {
        title: '專案數量',
        dataIndex: 'projectCount',
        width: 150
      },
      {
        title: '手機',
        dataIndex: 'phone',
        width: 150
      },
      {
        title: '分機',
        dataIndex: 'extension',
        width: 100
      },
      {
        title: '電子郵件',
        dataIndex: 'email',
        width: 200
      },
      {
        title: '緊急聯絡人',
        dataIndex: 'emergencyContact',
        width: 150
      },
      {
        title: '緊急聯絡電話',
        dataIndex: 'emergencyPhone',
        width: 150
      },
      {
        title: '戶籍地址',
        dataIndex: 'permanentAddress',
        width: 300
      },
      {
        title: '通訊地址',
        dataIndex: 'currentAddress',
        width: 300
      },
      {
        title: '學歷',
        dataIndex: 'education',
        width: 200
      },
      {
        title: '科系',
        dataIndex: 'major',
        width: 150
      },
      {
        title: '專長技能',
        dataIndex: 'skills',
        width: 200
      },
      {
        title: '語言能力',
        dataIndex: 'languages',
        width: 200
      },
      {
        title: '備註',
        dataIndex: 'notes',
        width: 200
      }
    ]
  },
  data: {
    type: Array,
    default: () => [
     
      {
        employeeId: 'E004',
        name: '陳志明',
        department: '人資部',
        position: '人資主管',
        joinDate: '2017-11-05',
        seniority: '6年',
        baseSalary: 95000,
        bonus: 28000,
        totalSalary: 123000,
        performanceLevel: 'A',
        projectCount: 4,
        phone: '0945-678-901',
        extension: '4001',
        email: 'chiming@example.com',
        emergencyContact: '陳小明',
        emergencyPhone: '0955-666-777',
        permanentAddress: '台北市內湖區內湖路一段100號',
        currentAddress: '台北市內湖區內湖路一段100號',
        education: '中興大學',
        major: '人力資源',
        skills: '人才招募, 績效管理',
        languages: '中文, 英文',
        notes: '負責公司年度教育訓練規劃'
      },
      {
        employeeId: 'E005',
        name: '林美美',
        department: '客服部',
        position: '客服專員',
        joinDate: '2021-02-20',
        seniority: '2年',
        baseSalary: 60000,
        bonus: 10000,
        totalSalary: 70000,
        performanceLevel: 'B',
        projectCount: 2,
        phone: '0956-789-012',
        extension: '5001',
        email: 'meimei@example.com',
        emergencyContact: '林大美',
        emergencyPhone: '0966-777-888',
        permanentAddress: '桃園市中壢區中央路100號',
        currentAddress: '台北市萬華區西寧南路50號',
        education: '世新大學',
        major: '傳播管理',
        skills: '顧客服務, 問題解決',
        languages: '中文, 英文, 客家話',
        notes: '客戶滿意度評分最高'
      },
      {
        employeeId: 'E006',
        name: '黃建國',
        department: '研發部',
        position: '後端工程師',
        joinDate: '2019-08-15',
        seniority: '4年',
        baseSalary: 78000,
        bonus: 18000,
        totalSalary: 96000,
        performanceLevel: 'A-',
        projectCount: 7,
        phone: '0967-890-123',
        extension: '1002',
        email: 'jianguo@example.com',
        emergencyContact: '黃小國',
        emergencyPhone: '0977-888-999',
        permanentAddress: '新竹市東區光復路100號',
        currentAddress: '新竹市東區光復路100號',
        education: '交通大學',
        major: '資訊工程',
        skills: 'Java, Spring Boot, SQL',
        languages: '中文, 英文',
        notes: 'AWS認證專家'
      },
      {
        employeeId: 'E007',
        name: '吳雅婷',
        department: '行銷部',
        position: '行銷專員',
        joinDate: '2020-05-10',
        seniority: '3年',
        baseSalary: 65000,
        bonus: 12000,
        totalSalary: 77000,
        performanceLevel: 'B+',
        projectCount: 4,
        phone: '0978-901-234',
        extension: '2002',
        email: 'yating@example.com',
        emergencyContact: '吳大婷',
        emergencyPhone: '0988-999-000',
        permanentAddress: '台中市西屯區河南路100號',
        currentAddress: '台北市大安區忠孝東路四段50號',
        education: '東海大學',
        major: '行銷管理',
        skills: '內容行銷, SEO優化',
        languages: '中文, 英文',
        notes: ''
      },
      {
        employeeId: 'E008',
        name: '趙志豪',
        department: '研發部',
        position: '前端工程師',
        joinDate: '2021-03-01',
        seniority: '2年',
        baseSalary: 72000,
        bonus: 15000,
        totalSalary: 87000,
        performanceLevel: 'B+',
        projectCount: 5,
        phone: '0989-012-345',
        extension: '1003',
        email: 'zhihao@example.com',
        emergencyContact: '趙大豪',
        emergencyPhone: '0999-000-111',
        permanentAddress: '新北市新莊區中正路100號',
        currentAddress: '新北市新莊區中正路100號',
        education: '輔仁大學',
        major: '資訊管理',
        skills: 'HTML, CSS, Vue.js',
        languages: '中文, 英文',
        notes: '前端開發負責人'
      },
      {
        employeeId: 'E009',
        name: '周雅琪',
        department: '財務部',
        position: '會計師',
        joinDate: '2018-09-20',
        seniority: '5年',
        baseSalary: 88000,
        bonus: 22000,
        totalSalary: 110000,
        performanceLevel: 'A',
        projectCount: 3,
        phone: '0990-123-456',
        extension: '3002',
        email: 'yaqi@example.com',
        emergencyContact: '周大琪',
        emergencyPhone: '0900-111-222',
        permanentAddress: '高雄市前鎮區中山二路100號',
        currentAddress: '台北市松山區南京東路五段50號',
        education: '台灣大學',
        major: '會計學',
        skills: '財務報表分析, 稅務規劃',
        languages: '中文, 英文, 上海話',
        notes: 'CPA證照'
      },
      {
        employeeId: 'E010',
        name: '楊光明',
        department: '業務部',
        position: '業務經理',
        joinDate: '2017-06-15',
        seniority: '6年',
        baseSalary: 90000,
        bonus: 35000,
        totalSalary: 125000,
        performanceLevel: 'A+',
        projectCount: 12,
        phone: '0901-234-567',
        extension: '6001',
        email: 'guangming@example.com',
        emergencyContact: '楊明明',
        emergencyPhone: '0911-222-333',
        permanentAddress: '台南市東區東門路100號',
        currentAddress: '台北市中山區北安路50號',
        education: '成功大學',
        major: '國際貿易',
        skills: '銷售談判, 客戶關係管理',
        languages: '中文, 英文, 台語',
        notes: '連續三年業績冠軍'
      },
      {
        employeeId: 'E011',
        name: '許家豪',
        department: '研發部',
        position: '測試工程師',
        joinDate: '2019-11-10',
        seniority: '4年',
        baseSalary: 76000,
        bonus: 16000,
        totalSalary: 92000,
        performanceLevel: 'B+',
        projectCount: 6,
        phone: '0912-345-678',
        extension: '1004',
        email: 'jiahao@example.com',
        emergencyContact: '許大豪',
        emergencyPhone: '0922-333-444',
        permanentAddress: '新北市三重區重新路100號',
        currentAddress: '新北市三重區重新路100號',
        education: '台北科技大學',
        major: '電子工程',
        skills: '自動化測試, CI/CD',
        languages: '中文, 英文',
        notes: 'ISTQB認證'
      },
      
    ]
  },
  viewportOffset: {
    type: [Number, String],
    default: 0
  },
  fixedColumns: {
    type: Array,
    default: () => []
  },
  showSearch: {
    type: Boolean,
    default: true
  },
  searchText: {
    type: String,
    default: ''
  },
  headerFontSize: {
    type: String,
    default: 'sm'
  },
  cellFontSize: {
    type: String,
    default: 'xs'
  },
  divideColor: {
    type: String,
    default: 'gray-200'
  },
  divideOpacity: {
    type: String,
    default: '100'
  },
  divideDirection: {
    type: String,
    default: 'y'
  },
  divideSize: {
    type: String,
    default: '1'
  },
  isPagination: {
    type: Boolean,
    default: false
  },
  defaultPageSize: {
    type: Number,
    default: 50
  }
})

const headerFontSizeClass = computed(() => {
  return props.headerFontSize.startsWith('text-') ? props.headerFontSize : `text-${props.headerFontSize}`
})

const cellFontSizeClass = computed(() => {
  return props.cellFontSize.startsWith('text-') ? props.cellFontSize : `text-${props.cellFontSize}`
})

const innerColumns = ref(props.columns)
const tempColumns = [...innerColumns.value]
const tempObj = {}
tempColumns.forEach((column, index) => {
  tempObj[column.dataIndex] = index
})
const columnLocStatus = ref(tempObj)

const emit = defineEmits(['update:fixedColumns', 'update:searchText', 'update:filterColumns'])

const fixedColumns = computed({
  get: () => props.fixedColumns,
  set: (value) => emit('update:fixedColumns', value)
})

// 這個方法必須依賴外部的v-model來觸發
// const searchText = computed({
//     get: () => props.searchText,
//     set: (value) => emit('update:searchText', value)
// })

// 內部狀態方法 可以是內部使用internalSearchText去觸發finishedData的變化
// 外部也可以用v-model來影響內部的internalSearchText
const internalSearchText = ref(props.searchText)

// 當內部搜尋文字變化時，嘗試通知父組件
watch(internalSearchText, (value) => {
  emit('update:searchText', value)
})

// 當 props 變化時，同步到內部狀態 (如果父組件使用了 v-model)
watch(
  () => props.searchText,
  (value) => {
    if (value !== internalSearchText.value) {
      internalSearchText.value = value
    }
  },
  { immediate: true }
)

const finishedData = computed(() => {
  let result = props.data

  // 1. 先套用欄位篩選
  if (props.isFilter && filterState.value.size > 0) {
    result = result.filter((item) => {
      // 檢查每個有設定篩選的欄位
      for (const [columnKey, selectedValues] of filterState.value.entries()) {
        if (selectedValues.length > 0) {
          // 如果該欄位的值不在選擇的值中，過濾掉
          if (!selectedValues.includes(item[columnKey])) {
            return false
          }
        }
      }
      return true
    })
  }

  // 2. 再套用搜尋過濾
  if (internalSearchText.value) {
    result = result.filter((item) => {
      return Object.values(item).some((value) => {
        const strValue = String(value).toLowerCase()
        const lowerSearchText = internalSearchText.value.toLowerCase()
        return strValue.includes(lowerSearchText)
      })
    })
  }

  return result
})

// 分頁相關狀態
const currentPage = ref(1)
const itemsPerPage = ref(props.defaultPageSize)

// 監聽搜尋文字變化，重置頁碼
watch(internalSearchText, () => {
  if (props.isPagination) {
    currentPage.value = 1
  }
})

// 最終顯示的資料（包含搜尋和分頁）
const displayData = computed(() => {
  // 如果沒有啟用分頁，直接返回搜尋後的結果
  if (!props.isPagination) {
    return finishedData.value
  }

  // 計算分頁
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return finishedData.value.slice(start, end)
})

const headerFontSize = computed(() => {
  return `text-${props.headerFontSize}`
})
const cellFontSize = computed(() => {
  return `text-${props.cellFontSize}`
})
// 分隔線相關的計算屬性
const divideClasses = computed(() => {
  const color = props.divideColor
  const opacity = props.divideOpacity
  const direction = props.divideDirection
  const size = props.divideSize

  // 構建分隔線類
  const classes = []

  // 方向類
  if (direction === 'x' || direction === 'xy') {
    classes.push('divide-x')
  }
  if (direction === 'y' || direction === 'xy') {
    classes.push('divide-y')
  }

  // 顏色類
  if (color) {
    classes.push(`divide-${color}`)
  }

  // 不透明度類
  if (opacity && opacity !== '100') {
    classes.push(`divide-opacity-${opacity}`)
  }

  // 大小類
  if (size && size !== '1') {
    classes.push(`divide-${size}`)
  }

  return classes
})

watch(
  () => fixedColumns.value,
  (newValue) => {
    // 1. 獲取新的或原本已固定的欄位

    const newFixedColumns = newValue.map((column) => {
      return innerColumns.value.find((innerColumn) => innerColumn.dataIndex === column)
    })

    // 2. 獲取所有未固定的欄位（不包括已固定的欄位）
    const otherUnfixedColumns = innerColumns.value.filter((column) => !column.defaultFixed)

    // 3. 組合新的欄位順序
    innerColumns.value = [
      ...newFixedColumns, // 原先已固定的欄位
      ...otherUnfixedColumns.filter((column) => newValue.includes(column.dataIndex)), // 新固定的欄位
      ...otherUnfixedColumns.filter((column) => !newValue.includes(column.dataIndex)) // 其他未固定的欄位
    ]
  }
)

function fixedColumn(clickedColumn) {
  // 1. 獲取所有已固定的欄位
  const currentFixedColumns = innerColumns.value.filter((column) => column.defaultFixed)

  // 2. 找到目標欄位
  const currentColumn = innerColumns.value.find(
    (column) => column.dataIndex === clickedColumn.dataIndex
  )
  currentColumn.showUnfixedIcon = false
  currentColumn.defaultFixed = true

  // 3. 獲取所有未固定的欄位（不包括目標欄位）
  const otherUnfixedColumns = innerColumns.value.filter(
    (column) => !column.defaultFixed && column.dataIndex !== clickedColumn.dataIndex
  )

  // 4. 組合新的欄位順序
  innerColumns.value = [
    ...currentFixedColumns, // 原先已固定的欄位
    currentColumn, // 新固定的欄位
    ...otherUnfixedColumns // 其他未固定的欄位
  ]

  // 5. 更新 fixedColumns
  fixedColumns.value = getFixedColumnIds()
}

function mouseoverFixedIcon(currentColumn) {
  innerColumns.value.forEach((innerColumn, index, self) => {
    if (innerColumn.dataIndex === currentColumn.dataIndex) {
      self[index].showUnfixedIcon = true
    }
  })
}

function mouseleaveFixedIcon(currentColumn) {
  innerColumns.value.forEach((innerColumn, index, self) => {
    if (innerColumn.dataIndex === currentColumn.dataIndex) {
      self[index].showUnfixedIcon = false
    }
  })
}

function unFixedColumn(currentColumn) {
  const tempColumns = []

  Object.entries(columnLocStatus.value).forEach(([dataIndex, index]) => {
    const column = innerColumns.value.find((column) => column.dataIndex === dataIndex)

    if (column.dataIndex === currentColumn.dataIndex) {
      column.showUnfixedIcon = false
      column.defaultFixed = false
    }

    if (!column.defaultFixed) {
      tempColumns.push(column)
    }
  })

  innerColumns.value = [
    ...innerColumns.value.filter((column) => column.defaultFixed),
    ...tempColumns
  ]

  fixedColumns.value = getFixedColumnIds()
}

function getFixedColumnIds() {
  // 獲取所有已固定的欄位
  return innerColumns.value
    .filter((innerColumn) => innerColumn.defaultFixed)
    .map((innerColumn) => innerColumn.dataIndex)
}

// 取得累積的寬度
function getAccumulatedWidth(column, padding = 0) {
  const currentIndex = innerColumns.value.findIndex(
    (innerColumn) => innerColumn.dataIndex === column.dataIndex
  )
  // 只累加前面的固定欄位寬度
  if (column.defaultFixed) {
    return innerColumns.value
      .slice(0, currentIndex)
      .filter((col) => col.defaultFixed) // 只計算固定欄位
      .map((innerColumn) => innerColumn.width)
      .reduce((acc, width) => acc + width + padding * 2, 0)
  }
  return 0
}

const accumlatedMap = ref(new Map())
watch(
  innerColumns,
  (newVal) => {
    newVal.forEach((column) => {
      accumlatedMap.value.set(column.dataIndex, getAccumulatedWidth(column, 1))
    })
  },
  { immediate: true }
)

function getAccumulatedWidthByDataIndex(column) {
  return accumlatedMap.value.get(column.dataIndex) || 0
}

const tableRef = ref(null)
const currentScrollDirection = ref('')
const refScrollLeft = ref(0)
const refScrollTop = ref(0)

function handleScroll(event) {
  const scrollLeft = event.target.scrollLeft
  const scrollTop = event.target.scrollTop

  if (refScrollLeft.value !== scrollLeft) {
    currentScrollDirection.value = 'horizontal'
  } else if (refScrollTop.value !== scrollTop) {
    currentScrollDirection.value = 'vertical'
  }
  refScrollLeft.value = scrollLeft
  refScrollTop.value = scrollTop
}

const tableContainerStyle = computed(() => {
  if (!props.isFixed) return {}

  return {
    maxHeight: `calc(100vh - ${props.viewportOffset}px)`,
    overflowY: 'auto'
  }
})

const tooltipInfo = ref({
  x: 0,
  y: 0,
  opacity: 0,
  column: null
})

const uniqueColumnValueArray = ref([])
const filterColumnValueArray = ref([])
const originalData = ref([])
const filterSearchText = ref('')

// 全局篩選狀態：Map<columnKey, selectedValues[]>
const filterState = ref(new Map())
watch(
  () => tooltipInfo.value.column,
  (newValue, oldValue) => {
    if (newValue) {
      uniqueColumnValueArray.value = [
        ...new Set(originalData.value.map((item) => item[newValue.dataIndex]))
      ].map((item) => ({ value: item, label: item }))
    }
  }
)
watch(filterSearchText, (newValue) => {
  if (tooltipInfo.value.column) {
    // 如果有搜索文字，過濾選項列表
    if (newValue) {
      const allUniqueValues = [
        ...new Set(originalData.value.map((item) => item[tooltipInfo.value.column.dataIndex]))
      ]

      uniqueColumnValueArray.value = allUniqueValues
        .filter((value) => String(value).toLowerCase().includes(newValue.toLowerCase()))
        .map((value) => ({ value, label: value }))
    } else {
      // 如果搜索框為空，顯示所有選項
      uniqueColumnValueArray.value = [
        ...new Set(originalData.value.map((item) => item[tooltipInfo.value.column.dataIndex]))
      ].map((item) => ({ value: item, label: item }))
    }
  }
})
watch(filterColumnValueArray, (newValue, oldValue) => {
  if (!tooltipInfo.value.column) return

  const columnKey = tooltipInfo.value.column.dataIndex
  
  // 更新全局篩選狀態
  if (newValue.length > 0) {
    filterState.value.set(columnKey, [...newValue])
  } else {
    filterState.value.delete(columnKey)
  }

  // emit 有篩選的欄位名稱陣列（符合 Array 類型）
  const activeFilterColumns = Array.from(filterState.value.keys())
  emit('update:filterColumns', activeFilterColumns)
})

function selectAllHandler() {
  const column = tooltipInfo.value.column
  if (column) {
    if (filterColumnValueArray.value.length !== uniqueColumnValueArray.value.length) {
      filterColumnValueArray.value = uniqueColumnValueArray.value.map((item) => item.value)
    } else {
      filterColumnValueArray.value = []
    }
  }
}

function clickHanlder(e, column) {
  if (column?.dataIndex === tooltipInfo.value?.column?.dataIndex || !column) {
    tooltipInfo.value.opacity = 0
    tooltipInfo.value.x = 0
    tooltipInfo.value.y = 0
    tooltipInfo.value.column = null
    filterSearchText.value = ''
    return
  }
  tooltipInfo.value.x = e.clientX
  tooltipInfo.value.y = e.clientY - props.viewportOffset
  tooltipInfo.value.opacity = 1
  tooltipInfo.value.column = column
  
  // 載入該欄位已有的篩選值
  if (filterState.value.has(column.dataIndex)) {
    filterColumnValueArray.value = [...filterState.value.get(column.dataIndex)]
  } else {
    filterColumnValueArray.value = []
  }
}

// 檢查欄位是否有篩選
function hasActiveFilter(columnKey) {
  return filterState.value.has(columnKey) && filterState.value.get(columnKey).length > 0
}

onMounted(() => {
  originalData.value = [...props.data]
  fixedColumns.value = getFixedColumnIds()
})
</script>

<style scoped>
/* 篩選選單淡入淡出動畫 */
.filter-fade-enter-active,
.filter-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.filter-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.filter-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.filter-fade-enter-to,
.filter-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* 自定義滾動條樣式 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.2s;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

.custom-scrollbar::-webkit-scrollbar-thumb:active {
  background: #888;
}
</style>
