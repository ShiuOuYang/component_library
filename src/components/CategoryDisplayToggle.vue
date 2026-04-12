<template>
  <div class="bg-white shadow-sm rounded-lg border border-gray-200 flex-1">
    <button
      @click="toggleDisplay"
      class="flex justify-center items-center w-full h-full px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm space-x-2 hover:cursor-pointer"
      :class="[
        modelValue
          ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 '
          : 'bg-white text-black hover:bg-transparent hover:cursor-pointer',
      ]"
    >
      <span class="text-center">{{
        modelValue ? "顯示有資料站點" : "顯示全部站點"
      }}</span>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const toggleDisplay = () => {
  emit("update:modelValue", !props.modelValue);
};
</script>
