<template>
  <aside class="w-36 md:w-40 bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Pages</h2>
      <span class="text-xs text-gray-500">{{ pages.length }}</span>
    </div>

    <div class="flex-1 overflow-y-auto space-y-2 pr-1">
      <button
        v-for="(page, index) in pages"
        :key="page.id"
        class="w-full text-left rounded-lg border p-1 transition-shadow hover:shadow"
        :class="index === currentIndex ? 'border-teal-500 ring-1 ring-teal-500' : 'border-gray-200'"
        @click="$emit('switch-page', index)"
      >
        <div class="aspect-[4/3] rounded-md border border-gray-200 overflow-hidden bg-gray-50">
          <img
            v-if="page.thumbnail"
            :src="page.thumbnail"
            alt="page thumbnail"
            class="w-full h-full object-cover"
          >
          <div v-else class="w-full h-full grid place-items-center text-[10px] text-gray-400">空白</div>
        </div>
        <div class="mt-1 flex items-center justify-between px-1">
          <span class="text-xs text-gray-600">第 {{ index + 1 }} 頁</span>
          <button
            class="text-xs text-red-500 hover:text-red-600"
            @click.stop="$emit('delete-page', index)"
          >
            刪除
          </button>
        </div>
      </button>
    </div>

    <button
      class="w-full py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
      @click="$emit('add-page')"
    >
      新增頁面
    </button>
  </aside>
</template>

<script setup>
defineProps({
  pages: {
    type: Array,
    required: true,
  },
  currentIndex: {
    type: Number,
    required: true,
  },
});

defineEmits(['switch-page', 'add-page', 'delete-page']);
</script>
