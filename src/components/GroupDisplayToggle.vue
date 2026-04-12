<template>
  <div class="bg-white shadow-sm rounded-lg border border-gray-200 flex-1">
    <button
      @click="toggleDisplay"
      :disabled="disabled"
      class="flex justify-center items-center w-full h-full px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm space-x-2"
      :class="[
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:cursor-pointer'
          : modelValue
          ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 '
          : 'bg-white text-black hover:bg-transparent hover:cursor-pointer',
      ]"
    >
      <span class="text-center">{{
        modelValue ? "隱藏空白群組" : "顯示全部群組"
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
  label: {
    type: String,
    default: "群組顯示",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const toggleDisplay = () => {
  if (!props.disabled) {
    emit("update:modelValue", !props.modelValue);
  }
};
</script>
