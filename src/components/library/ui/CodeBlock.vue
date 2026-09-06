<template>
  <div class="bg-gray-900 rounded-xl p-4 overflow-x-auto">
    <pre class="text-green-400 text-sm"><code>{{ formattedCode }}</code></pre>
    
    <!-- 可選的提示信息區塊 -->
    <div 
      v-if="$slots.tip || tip"
      :class="[
        'mt-4 p-3 rounded border',
        tipType === 'warning' ? 'bg-yellow-900/30 border-yellow-600' : 
        tipType === 'info' ? 'bg-indigo-900/30 border-indigo-600' :
        tipType === 'success' ? 'bg-green-900/30 border-green-600' :
        'bg-blue-900/30 border-blue-600'
      ]"
    >
      <slot name="tip">
        <p :class="[
          'text-xs',
          tipType === 'warning' ? 'text-yellow-200' :
          tipType === 'info' ? 'text-indigo-200' :
          tipType === 'success' ? 'text-green-200' :
          'text-blue-200'
        ]">
          <strong>{{ tipTitle }}：</strong><br>
          <span v-html="tip" />
        </p>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 程式碼內容
  code: {
    type: String,
    required: true
  },
  // 程式語言類型（可用於語法高亮，目前只是裝飾用）
  language: {
    type: String,
    default: 'javascript'
  },
  // 是否移除多餘的縮排
  trimIndent: {
    type: Boolean,
    default: true
  },
  // 提示信息
  tip: {
    type: String,
    default: ''
  },
  // 提示類型
  tipType: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'warning', 'success', 'error'].includes(value)
  },
  // 提示標題
  tipTitle: {
    type: String,
    default: '重要提示'
  }
});

// 格式化程式碼（移除多餘縮排）
const formattedCode = computed(() => {
  if (!props.trimIndent) return props.code;
  
  const lines = props.code.split('\n');
  
  // 移除開頭和結尾的空行
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  
  if (lines.length === 0) return '';
  
  // 計算最小縮排
  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  const minIndent = Math.min(
    ...nonEmptyLines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    })
  );
  
  // 移除最小縮排
  return lines
    .map(line => line.slice(minIndent))
    .join('\n');
});
</script>

<style scoped>
/* 程式碼區塊滾動條樣式 */
pre {
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937;
}

pre::-webkit-scrollbar {
  height: 8px;
}

pre::-webkit-scrollbar-track {
  background: #1f2937;
}

pre::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* 程式碼字體 */
pre code {
  font-family: 'Fira Code', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace;
  line-height: 1.5;
}
</style>