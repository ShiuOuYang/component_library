<template>
  <div class="bg-white shadow-sm rounded-lg border border-gray-200">
    <label class="block text-xs font-medium text-gray-700 mb-1 px-3 pt-2">
      {{ label }}
    </label>
    <select
      v-model="selectedStackKey"
      class="w-full px-3 py-1.5 text-xs bg-white border-0 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
      @change="handleChange"
    >
      <!-- <option value="">{{ placeholder }}</option> -->
      <option
        v-for="option in stackOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
// import { useWipStore } from "../stores/wip.j;。

const props = defineProps({
  modelValue: {
    type: String,
    default: "partNumber",
  },
  label: {
    type: String,
    default: "圖表分類",
  },
  placeholder: {
    type: String,
    default: "選擇分類方式",
  },
});

const emit = defineEmits(["update:modelValue"]);
const wipStore = useWipStore();

// 根據不同的資料類型建立選項
const stackOptions = computed(() => [
  {
    label: `partNumber (${wipStore.wipPartNumberList?.length || 0} )`,
    value: "partNumber",
  },

  {
    label: `ABF (${wipStore.wipLaminationList?.length || 0} )`,
    value: "lamination",
  },
  {
    label: `lotType (${wipStore.wipLotTypeList?.length || 0} )`,
    value: "lotType",
  },
]);

const selectedStackKey = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const handleChange = () => {
  // 可以在這裡添加額外的處理邏輯
  console.log("圖表分類切換為:", selectedStackKey.value);
};

// 監聽資料變化，自動更新選項數量
watch(
  () => [
    wipStore.wipLaminationList?.length,
    wipStore.wipLotTypeList?.length,
    wipStore.wipPartNumberList?.length,
  ],
  () => {
    // 選項數量更新時的處理
  },
  { deep: true }
);
</script>
