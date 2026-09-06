<template>
  <div class="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
    <!-- 超緊湊標題區塊 -->
    <div class="px-2 py-1 border-b border-gray-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <div
            class="w-4 h-4 bg-blue-100 rounded flex items-center justify-center"
          >
            <svg
              class="w-2 h-2 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
              />
            </svg>
          </div>
          <h3 class="text-xs font-medium text-gray-800">
            {{ label || "篩選" }}
          </h3>
        </div>

        <div class="flex items-center gap-1">
          <span
            v-if="modelValue.length > 0"
            class="px-1 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded"
          >
            {{ modelValue.length }}
          </span>
          <button
            v-if="modelValue.length > 0 && isUnselectAll"
            @click="clearAll"
            class="w-4 h-4 flex items-center justify-center p-0 text-[9px] text-red-600 hover:bg-red-50 rounded leading-none"
            style="min-width: 0; min-height: 0"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- 超緊湊搜尋框 -->
    <div class="px-2 py-1 border-b border-gray-100">
      <input
        v-model="searchText"
        type="text"
        :placeholder="placeholder"
        class="block w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    <!-- 超緊湊選項列表 -->
    <div class="px-2 py-1">
      <div class="space-y-0.5 max-h-18 overflow-y-auto">
        <div
          v-for="option in filteredOptions"
          :key="option"
          @click="toggleOption(option)"
          class="flex items-center px-1 py-0.5 border border-gray-200 rounded text-xs cursor-pointer hover:border-blue-300"
          :class="{
            'border-blue-500 bg-blue-50 text-blue-900':
              modelValue.includes(option),
            'hover:bg-gray-50 text-gray-700': !modelValue.includes(option),
          }"
        >
          <div
            class="w-2 h-2 rounded border mr-1 flex-shrink-0"
            :class="{
              'bg-blue-500 border-blue-500': modelValue.includes(option),
              'border-gray-300': !modelValue.includes(option),
            }"
          ></div>
          <span class="truncate">{{ option }}</span>
        </div>

        <div v-if="filteredOptions.length === 0" class="text-center py-1">
          <p class="text-xs text-gray-500">無選項</p>
        </div>
      </div>

      <!-- 超緊湊操作區 -->
      <div
        v-if="filteredOptions.length > 0"
        class="flex justify-between items-center mt-1 pt-1 border-t border-gray-200"
      >
        <span class="text-xs text-gray-500">{{ filteredOptions.length }}</span>
        <div class="flex gap-1">
          <button
            @click="selectAll"
            class="px-1 py-0.5 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
          >
            全選
          </button>
          <button
            @click="unselectAll"
            v-if="isUnselectAll"
            class="px-1 py-0.5 text-xs text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
          >
            清空
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  label: {
    type: String,
    default: "",
  },
  options: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: "搜尋...",
  },
  isUnselectAll: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:modelValue"]);

const searchText = ref("");

// 搜尋後的選項
const filteredOptions = computed(() => {
  if (!searchText.value) return props.options;
  return props.options.filter((opt) =>
    String(opt).toLowerCase().includes(searchText.value.toLowerCase())
  );
});

// 切換選項
function toggleOption(option) {
  const newValue = [...props.modelValue];
  const index = newValue.indexOf(option);

  if (index > -1) {
    newValue.splice(index, 1);
  } else {
    newValue.push(option);
  }

  emit("update:modelValue", newValue);
}

// 清除所有
function clearAll() {
  emit("update:modelValue", []);
}

// 全選過濾後的選項
function selectAll() {
  const newValue = [
    ...new Set([...props.modelValue, ...filteredOptions.value]),
  ];
  emit("update:modelValue", newValue);
}

// 取消全選過濾後的選項
function unselectAll() {
  const newValue = props.modelValue.filter(
    (v) => !filteredOptions.value.includes(v)
  );
  emit("update:modelValue", newValue);
}
</script>

<style scoped>
/* 自定義捲軸樣式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 3px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f8fafc;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 1px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
