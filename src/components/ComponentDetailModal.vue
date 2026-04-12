<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <!-- 模態框頭部 -->
      <div class="modal-header">
        <div class="header-left">
          <div class="component-icon">
            <i :class="component.icon"></i>
          </div>
          <div>
            <h2 class="modal-title">{{ component.name }}</h2>
            <p class="modal-subtitle">{{ component.description }}</p>
          </div>
        </div>
        <button class="close-button" @click="closeModal">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 模態框內容 -->
      <div class="modal-body">
        <!-- 標籤頁導航 -->
        <div class="tab-navigation">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab-button', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            <i :class="tab.icon"></i>
            {{ tab.label }}
          </button>
        </div>

        <!-- 標籤頁內容 -->
        <div class="tab-content">
          <!-- 預覽標籤頁 -->
          <div v-if="activeTab === 'preview'" class="preview-tab">
            <div class="preview-container">
              <h3 class="section-title">組件預覽</h3>
              <div class="preview-area">
                <ComponentPreview :component="component" />
              </div>
            </div>
          </div>

          <!-- 文檔標籤頁 -->
          <div v-if="activeTab === 'docs'" class="docs-tab">
            <div class="docs-container">
              <h3 class="section-title">組件文檔</h3>
              
              <!-- Props 文檔 -->
              <div class="docs-section">
                <h4 class="subsection-title">Props</h4>
                <div class="props-table">
                  <div class="table-header">
                    <div class="header-cell">屬性名</div>
                    <div class="header-cell">類型</div>
                    <div class="header-cell">必需</div>
                    <div class="header-cell">描述</div>
                  </div>
                  <div
                    v-for="prop in component.props"
                    :key="prop.name"
                    class="table-row"
                  >
                    <div class="cell prop-name">{{ prop.name }}</div>
                    <div class="cell prop-type">
                      <code>{{ prop.type }}</code>
                    </div>
                    <div class="cell prop-required">
                      <span v-if="prop.required" class="required-badge">必需</span>
                      <span v-else class="optional-badge">可選</span>
                    </div>
                    <div class="cell prop-description">{{ prop.description }}</div>
                  </div>
                </div>
              </div>

              <!-- Events 文檔 -->
              <div class="docs-section">
                <h4 class="subsection-title">Events</h4>
                <div class="events-table">
                  <div class="table-header">
                    <div class="header-cell">事件名</div>
                    <div class="header-cell">描述</div>
                  </div>
                  <div
                    v-for="event in component.events"
                    :key="event.name"
                    class="table-row"
                  >
                    <div class="cell event-name">
                      <code>@{{ event.name }}</code>
                    </div>
                    <div class="cell event-description">{{ event.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 代碼標籤頁 -->
          <div v-if="activeTab === 'code'" class="code-tab">
            <div class="code-container">
              <h3 class="section-title">使用示例</h3>
              
              <!-- 基本用法 -->
              <div class="code-section">
                <h4 class="subsection-title">基本用法</h4>
                <div class="code-block">
                  <div class="code-header">
                    <span>Vue 模板</span>
                    <button class="copy-button" @click="copyCode(basicUsageCode)">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                  <pre class="code-content"><code>{{ basicUsageCode }}</code></pre>
                </div>
              </div>

              <!-- 進階用法 -->
              <div class="code-section">
                <h4 class="subsection-title">進階用法</h4>
                <div class="code-block">
                  <div class="code-header">
                    <span>完整示例</span>
                    <button class="copy-button" @click="copyCode(advancedUsageCode)">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                  <pre class="code-content"><code>{{ advancedUsageCode }}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ComponentPreview from './ComponentPreview.vue'

// Props
const props = defineProps({
  component: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['close'])

// 響應式數據
const activeTab = ref('preview')

// 標籤頁配置
const tabs = [
  { id: 'preview', label: '預覽', icon: 'fas fa-eye' },
  { id: 'docs', label: '文檔', icon: 'fas fa-book' },
  { id: 'code', label: '代碼', icon: 'fas fa-code' }
]

// 計算屬性
const basicUsageCode = computed(() => {
  const comp = props.component
  return `<template>
  <${comp.component}
    ${comp.props.map(prop => prop.required ? `:${prop.name}="${prop.name}"` : '').filter(Boolean).join('\n    ')}
  />
</template>

<script setup>
${comp.props.filter(prop => prop.required).map(prop => `const ${prop.name} = ref(${getDefaultValue(prop.type)})`).join('\n')}
<\/script>`
})

const advancedUsageCode = computed(() => {
  const comp = props.component
  return `<template>
  <${comp.component}
    ${comp.props.map(prop => `:${prop.name}="${prop.name}"`).join('\n    ')}
    ${comp.events.map(event => `@${event.name}="handle${event.name.charAt(0).toUpperCase() + event.name.slice(1)}"`).join('\n    ')}
  />
</template>

<script setup>
import { ref } from 'vue'
import ${comp.component} from './components/${comp.component}.vue'

${comp.props.map(prop => `const ${prop.name} = ref(${getDefaultValue(prop.type)})`).join('\n')}

${comp.events.map(event => `const handle${event.name.charAt(0).toUpperCase() + event.name.slice(1)} = (data) => {
  console.log('${event.name} event:', data)
}`).join('\n\n')}
<\/script>`
})

// 方法
const closeModal = () => {
  emit('close')
}

const copyCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code)
    // 這裡可以添加複製成功的提示
  } catch (err) {
    console.error('複製失敗:', err)
  }
}

const getDefaultValue = (type) => {
  switch (type) {
    case 'String':
      return "''"
    case 'Number':
      return '0'
    case 'Boolean':
      return 'false'
    case 'Array':
      return '[]'
    case 'Object':
      return '{}'
    case 'Date':
      return 'new Date()'
    default:
      return 'null'
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
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
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-subtitle {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  height: calc(90vh - 120px);
  overflow: hidden;
}

.tab-navigation {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.tab-button {
  flex: 1;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.tab-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.tab-button.active {
  background: white;
  color: #3b82f6;
  border-bottom: 2px solid #3b82f6;
}

.tab-content {
  height: calc(100% - 60px);
  overflow-y: auto;
  padding: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1.5rem;
}

.subsection-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.docs-section {
  margin-bottom: 2rem;
}

.props-table,
.events-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 0.5fr 2fr;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.events-table .table-header {
  grid-template-columns: 1fr 2fr;
}

.header-cell {
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 0.5fr 2fr;
  border-bottom: 1px solid #f3f4f6;
}

.events-table .table-row {
  grid-template-columns: 1fr 2fr;
}

.table-row:last-child {
  border-bottom: none;
}

.cell {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
}

.prop-name {
  font-weight: 600;
  color: #1f2937;
}

.prop-type code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
}

.required-badge {
  background: #ef4444;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.optional-badge {
  background: #6b7280;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.event-name code {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
}

.preview-area {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 2rem;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.code-section {
  margin-bottom: 2rem;
}

.code-block {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 500;
  color: #374151;
}

.copy-button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.copy-button:hover {
  background: #e5e7eb;
  color: #374151;
}

.code-content {
  margin: 0;
  padding: 1rem;
  background: #1f2937;
  color: #f9fafb;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
}

.code-content code {
  background: none;
  color: inherit;
  padding: 0;
}
</style>
