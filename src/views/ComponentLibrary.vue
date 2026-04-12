<template>
  <div class="component-library">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="page-title">組件庫</h1>
      <p class="page-description">探索和測試所有可用的 Vue 組件</p>
    </div>

    <!-- 搜索和篩選區域 -->
    <div class="search-filter-section">
      <div class="search-box">
        <i class="fas fa-search search-icon"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索組件..."
          class="search-input"
        />
      </div>
      
      <div class="filter-section">
        <select v-model="selectedCategory" class="category-filter">
          <option value="">所有分類</option>
          <option value="chart">圖表組件</option>
          <option value="table">表格組件</option>
          <option value="form">表單組件</option>
          <option value="ui">UI 組件</option>
          <option value="layout">佈局組件</option>
          <option value="utility">工具組件</option>
        </select>
      </div>
    </div>

    <!-- 組件網格 -->
    <div class="components-grid">
      <div
        v-for="component in filteredComponents"
        :key="component.id"
        class="component-card"
        @click="selectComponent(component)"
      >
        <div class="card-header">
          <div class="component-icon">
            <i :class="component.icon"></i>
          </div>
          <div class="component-info">
            <h3 class="component-name">{{ component.name }}</h3>
            <p class="component-description">{{ component.description }}</p>
          </div>
        </div>
        
        <div class="card-tags">
          <span
            v-for="tag in component.tags"
            :key="tag"
            class="tag"
          >
            {{ tag }}
          </span>
        </div>
        
        <div class="card-footer">
          <span class="category-badge">{{ getCategoryLabel(component.category) }}</span>
          <button class="view-button">
            <i class="fas fa-eye"></i>
            查看詳情
          </button>
        </div>
      </div>
    </div>

    <!-- 組件詳情模態框 -->
    <ComponentDetailModal
      v-if="selectedComponent"
      :component="selectedComponent"
      @close="selectedComponent = null"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ComponentDetailModal from '../components/ComponentDetailModal.vue'

const searchQuery = ref('')
const selectedCategory = ref('')
const selectedComponent = ref(null)

const components = ref([
  {
    id: 'common-table',
    name: '通用表格',
    description: '功能完整的數據表格，支持搜索、分頁、排序',
    icon: 'fas fa-table',
    category: 'table',
    tags: ['表格', '數據展示', '搜索', '分頁'],
    component: 'CommonTable',
    props: [
      { name: 'data', type: 'Array', required: true, description: '表格數據' },
      { name: 'columns', type: 'Array', required: true, description: '列配置' },
      { name: 'searchable', type: 'Boolean', required: false, description: '是否可搜索' },
      { name: 'pageable', type: 'Boolean', required: false, description: '是否可分頁' }
    ],
    events: [
      { name: 'row-click', description: '點擊行時觸發' },
      { name: 'sort', description: '排序時觸發' },
      { name: 'page-change', description: '頁面變更時觸發' }
    ]
  },
  {
    id: 'gantt-chart',
    name: '甘特圖',
    description: '項目進度管理的甘特圖組件',
    icon: 'fas fa-chart-bar',
    category: 'chart',
    tags: ['甘特圖', '項目管理', '進度追蹤'],
    component: 'GanttChart',
    props: [
      { name: 'tasks', type: 'Array', required: true, description: '任務數據' },
      { name: 'startDate', type: 'Date', required: false, description: '開始日期' },
      { name: 'endDate', type: 'Date', required: false, description: '結束日期' }
    ],
    events: [
      { name: 'task-click', description: '點擊任務時觸發' },
      { name: 'task-update', description: '任務更新時觸發' }
    ]
  },
  {
    id: 'simple-gantt-chart',
    name: '簡化甘特圖',
    description: '輕量級的甘特圖組件',
    icon: 'fas fa-chart-line',
    category: 'chart',
    tags: ['甘特圖', '簡化版', '輕量級'],
    component: 'SimpleGantChart',
    props: [
      { name: 'data', type: 'Array', required: true, description: '甘特圖數據' },
      { name: 'height', type: 'Number', required: false, description: '圖表高度' }
    ],
    events: [
      { name: 'click', description: '點擊時觸發' }
    ]
  },
  {
    id: 'gantt-chart-2',
    name: '進階甘特圖',
    description: '功能豐富的進階甘特圖組件',
    icon: 'fas fa-project-diagram',
    category: 'chart',
    tags: ['甘特圖', '進階版', '多項目'],
    component: 'GanttChart2',
    props: [
      { name: 'projects', type: 'Array', required: true, description: '項目數據' },
      { name: 'options', type: 'Object', required: false, description: '配置選項' }
    ],
    events: [
      { name: 'project-click', description: '點擊項目時觸發' },
      { name: 'task-drag', description: '拖拽任務時觸發' }
    ]
  },
  {
    id: 'universal-stacked-chart',
    name: '通用堆疊圖表',
    description: '支持多種類型的堆疊圖表',
    icon: 'fas fa-chart-area',
    category: 'chart',
    tags: ['堆疊圖表', '多類型', '通用'],
    component: 'UniversalStackedChart',
    props: [
      { name: 'data', type: 'Array', required: true, description: '圖表數據' },
      { name: 'type', type: 'String', required: false, description: '圖表類型' },
      { name: 'config', type: 'Object', required: false, description: '圖表配置' }
    ],
    events: [
      { name: 'click', description: '點擊時觸發' },
      { name: 'hover', description: '懸停時觸發' }
    ]
  },
  {
    id: 'draggable-modal',
    name: '可拖拽模態框',
    description: '支持拖拽移動的模態框組件',
    icon: 'fas fa-window-maximize',
    category: 'ui',
    tags: ['模態框', '拖拽', '彈窗'],
    component: 'DraggableModal',
    props: [
      { name: 'visible', type: 'Boolean', required: true, description: '是否顯示' },
      { name: 'title', type: 'String', required: false, description: '標題' },
      { name: 'draggable', type: 'Boolean', required: false, description: '是否可拖拽' }
    ],
    events: [
      { name: 'close', description: '關閉時觸發' },
      { name: 'confirm', description: '確認時觸發' }
    ]
  },
  {
    id: 'filter-dropdown',
    name: '篩選下拉框',
    description: '多選篩選下拉框組件',
    icon: 'fas fa-filter',
    category: 'form',
    tags: ['篩選', '下拉框', '多選'],
    component: 'FilterDropdown',
    props: [
      { name: 'options', type: 'Array', required: true, description: '選項數據' },
      { name: 'multiple', type: 'Boolean', required: false, description: '是否多選' },
      { name: 'placeholder', type: 'String', required: false, description: '佔位符' }
    ],
    events: [
      { name: 'change', description: '選擇變更時觸發' },
      { name: 'clear', description: '清空時觸發' }
    ]
  },
  {
    id: 'tag-filter-dropdown',
    name: '標籤篩選下拉框',
    description: '支持標籤顯示的篩選下拉框',
    icon: 'fas fa-tags',
    category: 'form',
    tags: ['標籤', '篩選', '下拉框'],
    component: 'TagFilterDropdown',
    props: [
      { name: 'tags', type: 'Array', required: true, description: '標籤數據' },
      { name: 'selected', type: 'Array', required: false, description: '已選標籤' }
    ],
    events: [
      { name: 'tag-select', description: '選擇標籤時觸發' },
      { name: 'tag-remove', description: '移除標籤時觸發' }
    ]
  },
  {
    id: 'time-filter',
    name: '時間篩選器',
    description: '日期範圍選擇器',
    icon: 'fas fa-clock',
    category: 'form',
    tags: ['時間', '日期', '範圍選擇'],
    component: 'TimeFilter',
    props: [
      { name: 'startDate', type: 'Date', required: false, description: '開始日期' },
      { name: 'endDate', type: 'Date', required: false, description: '結束日期' },
      { name: 'format', type: 'String', required: false, description: '日期格式' }
    ],
    events: [
      { name: 'date-change', description: '日期變更時觸發' },
      { name: 'range-change', description: '範圍變更時觸發' }
    ]
  },
  {
    id: 'excel-exporter',
    name: 'Excel 導出器',
    description: '數據導出為 Excel 格式',
    icon: 'fas fa-file-excel',
    category: 'utility',
    tags: ['Excel', '導出', '數據處理'],
    component: 'ExcelExporter',
    props: [
      { name: 'data', type: 'Array', required: true, description: '導出數據' },
      { name: 'filename', type: 'String', required: false, description: '文件名' },
      { name: 'columns', type: 'Array', required: false, description: '導出列' }
    ],
    events: [
      { name: 'export-start', description: '開始導出時觸發' },
      { name: 'export-complete', description: '導出完成時觸發' },
      { name: 'export-error', description: '導出錯誤時觸發' }
    ]
  },
  {
    id: 'global-notifications',
    name: '全局通知',
    description: '全局通知系統組件',
    icon: 'fas fa-bell',
    category: 'ui',
    tags: ['通知', '全局', '消息'],
    component: 'GlobalNotifications',
    props: [
      { name: 'notifications', type: 'Array', required: false, description: '通知列表' },
      { name: 'position', type: 'String', required: false, description: '顯示位置' }
    ],
    events: [
      { name: 'notification-show', description: '顯示通知時觸發' },
      { name: 'notification-hide', description: '隱藏通知時觸發' }
    ]
  },
  {
    id: 'universal-selector',
    name: '通用選擇器',
    description: '支持多種數據類型的選擇器',
    icon: 'fas fa-list',
    category: 'form',
    tags: ['選擇器', '通用', '多類型'],
    component: 'UniversalSelector',
    props: [
      { name: 'options', type: 'Array', required: true, description: '選項數據' },
      { name: 'value', type: 'Any', required: false, description: '選中值' },
      { name: 'type', type: 'String', required: false, description: '選擇器類型' }
    ],
    events: [
      { name: 'change', description: '選擇變更時觸發' },
      { name: 'search', description: '搜索時觸發' }
    ]
  },
  {
    id: 'data-type-selector',
    name: '數據類型選擇器',
    description: '專門用於選擇數據類型的組件',
    icon: 'fas fa-database',
    category: 'form',
    tags: ['數據類型', '選擇器', '專業'],
    component: 'DataTypeSelector',
    props: [
      { name: 'types', type: 'Array', required: true, description: '數據類型列表' },
      { name: 'selected', type: 'String', required: false, description: '選中類型' }
    ],
    events: [
      { name: 'type-change', description: '類型變更時觸發' }
    ]
  },
  {
    id: 'chart-stack-selector',
    name: '圖表堆疊選擇器',
    description: '用於選擇圖表堆疊方式的組件',
    icon: 'fas fa-layer-group',
    category: 'form',
    tags: ['圖表', '堆疊', '選擇器'],
    component: 'ChartStackSelector',
    props: [
      { name: 'options', type: 'Array', required: true, description: '堆疊選項' },
      { name: 'value', type: 'String', required: false, description: '選中值' }
    ],
    events: [
      { name: 'stack-change', description: '堆疊方式變更時觸發' }
    ]
  },
  {
    id: 'stack-key-toggle',
    name: '堆疊鍵切換器',
    description: '切換圖表堆疊鍵的組件',
    icon: 'fas fa-toggle-on',
    category: 'form',
    tags: ['切換', '堆疊', '圖表'],
    component: 'StackKeyToggle',
    props: [
      { name: 'keys', type: 'Array', required: true, description: '堆疊鍵列表' },
      { name: 'active', type: 'String', required: false, description: '活動鍵' }
    ],
    events: [
      { name: 'key-change', description: '鍵變更時觸發' }
    ]
  },
  {
    id: 'quick-actions',
    name: '快速操作',
    description: '快速操作按鈕組件',
    icon: 'fas fa-bolt',
    category: 'ui',
    tags: ['快速操作', '按鈕', '工具'],
    component: 'QuickActions',
    props: [
      { name: 'actions', type: 'Array', required: true, description: '操作列表' },
      { name: 'position', type: 'String', required: false, description: '位置' }
    ],
    events: [
      { name: 'action-click', description: '點擊操作時觸發' }
    ]
  },
  {
    id: 'app-layout',
    name: '應用佈局',
    description: '應用程序的主要佈局組件',
    icon: 'fas fa-th-large',
    category: 'layout',
    tags: ['佈局', '應用', '框架'],
    component: 'AppLayout',
    props: [
      { name: 'sidebar', type: 'Boolean', required: false, description: '是否顯示側邊欄' },
      { name: 'header', type: 'Boolean', required: false, description: '是否顯示頭部' }
    ],
    events: [
      { name: 'sidebar-toggle', description: '側邊欄切換時觸發' }
    ]
  }
])

const filteredComponents = computed(() => {
  let filtered = components.value

  // 搜索篩選
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(component =>
      component.name.toLowerCase().includes(query) ||
      component.description.toLowerCase().includes(query) ||
      component.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  // 分類篩選
  if (selectedCategory.value) {
    filtered = filtered.filter(component => component.category === selectedCategory.value)
  }

  return filtered
})

const selectComponent = (component) => {
  selectedComponent.value = component
}

const getCategoryLabel = (category) => {
  const labels = {
    chart: '圖表組件',
    table: '表格組件',
    form: '表單組件',
    ui: 'UI 組件',
    layout: '佈局組件',
    utility: '工具組件'
  }
  return labels[category] || category
}
</script>

<style scoped>
.component-library {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.page-description {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
}

.search-filter-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  min-width: 300px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 10;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.category-filter {
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 150px;
}

.category-filter:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.component-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.component-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #3b82f6;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.component-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.component-info {
  flex: 1;
}

.component-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.component-description {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  background: #f3f4f6;
  color: #374151;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category-badge {
  background: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.view-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.view-button:hover {
  background: #2563eb;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .component-library {
    padding: 1rem;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .search-filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .components-grid {
    grid-template-columns: 1fr;
  }
  
  .component-card {
    padding: 1rem;
  }
}
</style>
