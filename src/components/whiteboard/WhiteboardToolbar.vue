<template>
  <header class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="item in tools"
          :key="item.id"
          class="px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
          :class="tool === item.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'"
          @click="$emit('change-tool', item.id)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="w-px h-8 bg-gray-200" />

      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">顏色</span>
        <button
          v-for="swatch in swatches"
          :key="swatch"
          class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
          :class="color === swatch ? 'border-gray-900' : 'border-white'"
          :style="{ backgroundColor: swatch }"
          @click="$emit('change-color', swatch)"
        />
      </div>

      <div class="w-px h-8 bg-gray-200" />

      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">粗細</span>
        <input
          type="range"
          min="1"
          max="44"
          :value="size"
          class="w-28"
          @input="$emit('change-size', Number($event.target.value))"
        >
        <span class="w-10 text-right text-sm font-mono text-gray-700">{{ size }}px</span>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button class="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100" @click="$emit('paste-image')">
          貼上圖片
        </button>
        <button class="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100" @click="$emit('upload-image')">
          上傳圖片
        </button>
        <button class="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100" @click="$emit('undo')">
          復原
        </button>
        <button class="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100" @click="$emit('clear')">
          清空
        </button>
        <button class="px-3 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700" @click="$emit('export-png')">
          匯出本頁 PNG
        </button>
        <button class="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700" @click="$emit('export-all-png')">
          匯出全部 PNG
        </button>
        <button class="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700" @click="$emit('export-svg')">
          匯出本頁 SVG
        </button>
      </div>

      <div class="w-full text-xs text-gray-500">
        操作提示：可用 Ctrl+V 或按鈕貼圖，亦可拖曳圖片到畫布；滑鼠滾輪縮放、空白鍵拖曳平移。
      </div>
    </div>
  </header>
</template>

<script setup>
const tools = [
  { id: 'select', label: '選取' },
  { id: 'pen', label: '畫筆' },
  { id: 'line', label: '直線' },
  { id: 'rect', label: '矩形' },
  { id: 'ellipse', label: '橢圓' },
  { id: 'text', label: '文字' },
  { id: 'eraser', label: '橡皮擦' },
];

defineProps({
  tool: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  swatches: {
    type: Array,
    required: true,
  },
});

defineEmits([
  'change-tool',
  'change-color',
  'change-size',
  'paste-image',
  'upload-image',
  'undo',
  'clear',
  'export-png',
  'export-all-png',
  'export-svg',
]);
</script>
