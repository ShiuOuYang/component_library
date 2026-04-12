<template>
  <div class="bg-white shadow-sm rounded-lg border border-gray-200">
    <label class="block text-xs font-medium text-gray-700 mb-1 px-3 pt-2">
      {{ label }}
    </label>
    <select
      v-model="selectedDataType"
      class="w-full px-3 py-1.5 text-xs bg-white border-0 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
      @change="handleChange"
    >
      <!-- <option value="">{{ placeholder }}</option> -->
      <option
        v-for="option in dataTypeOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "批數",
  },
  label: {
    type: String,
    default: "資料類型",
  },
  placeholder: {
    type: String,
    default: "選擇資料類型",
  },
});

const emit = defineEmits(["update:modelValue"]);

// 資料類型選項
const dataTypeOptions = [
  {
    label: "Lot",
    value: "批數",
  },
  {
    label: "Pnl",
    value: "片數",
  },
  {
    label: "Unit",
    value: "顆數",
  },
];

const selectedDataType = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const handleChange = () => {
  console.log("資料類型切換為:", selectedDataType.value);
};
</script>
