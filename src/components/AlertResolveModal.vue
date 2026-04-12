<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
    <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
      <h2 class="text-lg font-bold mb-4">警報處理結果填寫</h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-3">
          <label class="block text-sm font-medium mb-1">標題 <span class="text-red-500">*</span></label>
          <input v-model="form.title" type="text" class="w-full border rounded px-2 py-1" required />
        </div>
        <div class="mb-3">
          <label class="block text-sm font-medium mb-1">處理描述 <span class="text-red-500">*</span></label>
          <textarea v-model="form.description" class="w-full border rounded px-2 py-1" rows="3" required></textarea>
        </div>
        <div class="mb-3">
          <label class="block text-sm font-medium mb-1">成效評分</label>
          <select v-model="form.effectivenessRating" class="w-full border rounded px-2 py-1">
            <option value="">請選擇</option>
            <option value="excellent">優秀</option>
            <option value="good">良好</option>
            <option value="fair">普通</option>
            <option value="poor">待改善</option>
          </select>
        </div>
        <div class="mb-3 flex items-center">
          <input v-model="form.followUpRequired" type="checkbox" id="followUp" class="mr-2" />
          <label for="followUp" class="text-sm">需後續追蹤</label>
        </div>
        <div v-if="error" class="text-red-500 text-sm mb-2">{{ error }}</div>
        <div class="flex justify-end gap-2 mt-4">
          <button type="button" @click="close" class="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300">取消</button>
          <button type="submit" class="px-4 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">送出</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'

const props = defineProps({
  visible: Boolean,
  alertId: String,
})
const emits = defineEmits(['submit', 'close'])

const form = ref({
  title: '',
  description: '',
  effectivenessRating: '',
  followUpRequired: false,
})
const error = ref('')

watch(() => props.visible, (val) => {
  if (val) {
    form.value = {
      title: '',
      description: '',
      effectivenessRating: '',
      followUpRequired: false,
    }
    error.value = ''
  }
})

function handleSubmit() {
  if (!form.value.title || !form.value.description) {
    error.value = '標題和描述為必填項目'
    return
  }
  emits('submit', { ...form.value })
}

function close() {
  emits('close')
}
</script>
