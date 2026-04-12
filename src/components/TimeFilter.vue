<template>
  <div class="bg-white shadow-sm rounded-lg border border-gray-200">
    <!-- 標題區塊 -->
    <div class="px-3 pt-2 pb-1">
      <label class="block text-xs font-medium text-gray-700">
        {{ label }}
      </label>
    </div>

    <div class="px-3 pb-2">
      <div class="flex flex-col gap-1">
        <!-- 時間模式切換按鈕 -->
        <div class="flex w-full relative bg-gray-100 rounded-lg p-0.5">
          <!-- 滑動背景動畫 -->
          <div
            class="absolute top-0.5 h-6 bg-blue-800 rounded-lg transition-all duration-300 ease-in-out"
            :style="{
              left: selectedTimeMode === 'current' ? '2px' : '50%',
              width: 'calc(50% - 2px)',
            }"
          ></div>

          <button
            type="button"
            class="relative flex-1 h-6 text-xs font-medium rounded-sm transition-colors duration-300 ease-in-out z-10 flex items-center justify-center border-0 hover:cursor-pointer"
            :class="[
              selectedTimeMode === 'current'
                ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 '
                : 'text-gray-700 hover:text-gray-900',
            ]"
            @click="handleTimeModeChange('current')"
          >
            當前
          </button>
          <button
            type="button"
            class="relative flex-1 h-6 text-xs font-medium rounded-sm transition-colors duration-300 ease-in-out z-10 flex items-center justify-center border-0 hover:cursor-pointer"
            :class="[
              selectedTimeMode === 'filter'
                ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 hover:cursor-pointer'
                : 'text-gray-700 hover:text-gray-900',
            ]"
            @click="handleTimeModeChange('filter')"
          >
            篩選
          </button>
        </div>

        <!-- VueDatePicker 時間選擇器 -->
        <div class="w-full">
          <VueDatePicker
            v-model="selectedDateTime"
            :disabled="selectedTimeMode === 'current'"
            :enable-time-picker="true"
            :minutes-increment="1"
            :format="'yyyy-MM-dd HH:mm'"
            :auto-apply="false"
            :clearable="false"
            placeholder="選擇日期時間"
            class="time-picker"
            @update:model-value="handleDateTimeChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import VueDatePicker from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      mode: "current",
      dateTime: null,
    }),
  },
  label: {
    type: String,
    default: "時間篩選",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

// 🔥 簡化事件定義：只發送必要的事件
const emit = defineEmits(["update:modelValue", "time-selected"]);

// 內部狀態
const selectedTimeMode = ref(props.modelValue.mode || "current");
const selectedDateTime = ref(null);

// 🔥 防重複更新標記
const isUpdating = ref(false);

// 初始化選中的時間
if (props.modelValue.dateTime) {
  selectedDateTime.value = new Date(props.modelValue.dateTime);
}

// 🔥 統一的事件發送函數
const emitChange = async (source = "unknown") => {
  // 防止重複更新
  if (isUpdating.value) {
    console.log("TimeFilter: 防止重複更新", source);
    return;
  }

  try {
    isUpdating.value = true;

    const dateTime =
      selectedTimeMode.value === "current" ? null : selectedDateTime.value;

    const newValue = {
      mode: selectedTimeMode.value,
      dateTime: dateTime,
    };

    console.log(`TimeFilter: [${source}] 發送事件`, newValue);

    // 🔥 只發送一個主要事件，避免重複
    emit("time-selected", newValue);

    // 等待下一個 tick 後發送 v-model 更新
    await nextTick();
    emit("update:modelValue", newValue);
  } catch (error) {
    console.error("TimeFilter: 事件發送失敗", error);
  } finally {
    // 延遲重置標記，確保所有相關更新完成
    setTimeout(() => {
      isUpdating.value = false;
    }, 100);
  }
};

// 🔥 簡化的時間模式切換處理
const handleTimeModeChange = (mode) => {
  if (selectedTimeMode.value === mode || isUpdating.value || props.disabled)
    return;

  console.log("TimeFilter: 模式切換至", mode);
  selectedTimeMode.value = mode;

  // 如果切換到 'current' 模式，清空時間選擇
  if (mode === "current") {
    selectedDateTime.value = null;
  }

  emitChange("modeChange");
};

// 🔥 簡化的日期時間變化處理
const handleDateTimeChange = (newDateTime) => {
  if (isUpdating.value || props.disabled) return;

  console.log("TimeFilter: 日期時間變更", newDateTime);
  selectedDateTime.value = newDateTime;

  // 只有在 filter 模式下才發送事件
  if (selectedTimeMode.value === "filter") {
    emitChange("dateTimeChange");
  }
};

// 🔥 簡化的 props 監聽 - 避免循環更新
watch(
  () => props.modelValue,
  (newValue, oldValue) => {
    // 防止循環更新
    if (isUpdating.value) return;

    // 檢查是否真的有變化
    const hasChanged =
      newValue.mode !== oldValue?.mode ||
      newValue.dateTime !== oldValue?.dateTime;

    if (!hasChanged) return;

    console.log("TimeFilter: 外部 props 變化", newValue);

    selectedTimeMode.value = newValue.mode || "current";
    selectedDateTime.value = newValue.dateTime
      ? new Date(newValue.dateTime)
      : null;
  },
  {
    deep: true,
    flush: "post", // 在 DOM 更新後執行
  }
);

// 🔥 移除多餘的 watch 監聽器，避免重複觸發
</script>

<style scoped>
/* 按鈕樣式 - 防止使用者選取 */
button {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 自定義 VueDatePicker 樣式 */
:deep(.dp__input) {
  height: 28px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

:deep(.dp__input:focus) {
  outline: none;
  box-shadow: 0 0 0 1px #3b82f6;
  border-color: #3b82f6;
}

:deep(.dp__input:disabled) {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

:deep(.dp__input_wrap) {
  width: 100%;
}

:deep(.dp__input::selection) {
  background-color: #3b82f6 !important;
  color: white !important;
}

:deep(.dp__input::-moz-selection) {
  background-color: #3b82f6 !important;
  color: white !important;
}

:deep(.dp__menu) {
  font-size: 12px;
  border: 1px solid #d1d5db;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

:deep(.dp__theme_light) {
  --dp-primary-color: #3b82f6;
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #f3f4f6;
  --dp-text-color: #374151;
  --dp-hover-color: #f9fafb;
  --dp-hover-text-color: #374151;
  --dp-border-color: #d1d5db;
}
</style>
