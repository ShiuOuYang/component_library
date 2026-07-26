<template>
  <div class="min-h-screen bg-gray-50 p-6 md:p-8">
    <div class="max-w-[1400px] mx-auto space-y-6">
      <header class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Whiteboard 白板</h1>
        <p class="mt-2 text-gray-600">
          Vue 元件化第一階段：拆分為 Toolbar、Canvas、PageRail，先完成多頁塗鴉流程。
        </p>
        <div class="mt-4 flex flex-wrap gap-3">
          <a
            href="/whiteboard.html"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors"
          >
            另開白板
          </a>
          <a
            href="/whiteboard.html"
            download
            class="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium transition-colors"
          >
            下載原始 whiteboard.html
          </a>
        </div>
      </header>

      <WhiteboardToolbar
        :tool="tool"
        :color="color"
        :size="size"
        :swatches="swatches"
        @change-tool="tool = $event"
        @change-color="color = $event"
        @change-size="size = $event"
        @paste-image="handlePasteImage"
        @upload-image="handleUploadImage"
        @undo="handleUndo"
        @clear="handleClear"
        @export-png="handleExport"
        @export-all-png="handleExportAll"
        @export-svg="handleExportSvg"
      />

      <section class="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-start">
        <WhiteboardPageRail
          :pages="pages"
          :current-index="currentIndex"
          @switch-page="switchPage"
          @add-page="addPage"
          @delete-page="deletePage"
        />

        <WhiteboardCanvas
          ref="canvasRef"
          :objects="currentPage.objects"
          :tool="tool"
          :color="color"
          :size="size"
          @objects-change="updateCurrentPageObjects"
          @thumbnail-change="updateCurrentPageThumbnail"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import WhiteboardToolbar from '../../components/whiteboard/WhiteboardToolbar.vue';
import WhiteboardPageRail from '../../components/whiteboard/WhiteboardPageRail.vue';
import WhiteboardCanvas from '../../components/whiteboard/WhiteboardCanvas.vue';

const swatches = ['#1B1B19', '#C24235', '#2F6BDD', '#208A5A', '#E2A22B', '#7A4FE0'];

let pageSeq = 1;

const tool = ref('pen');
const color = ref(swatches[0]);
const size = ref(4);
const canvasRef = ref(null);

const pages = ref([
  {
    id: pageSeq,
    objects: [],
    thumbnail: '',
  },
]);

const currentIndex = ref(0);

const currentPage = computed(() => pages.value[currentIndex.value]);

function switchPage(index) {
  if (index < 0 || index >= pages.value.length) return;
  currentIndex.value = index;
}

function addPage() {
  pageSeq += 1;
  pages.value.push({
    id: pageSeq,
    objects: [],
    thumbnail: '',
  });
  currentIndex.value = pages.value.length - 1;
}

function deletePage(index) {
  if (pages.value.length === 1) return;
  pages.value.splice(index, 1);
  if (currentIndex.value >= pages.value.length) {
    currentIndex.value = pages.value.length - 1;
  }
}

function updateCurrentPageObjects(objects) {
  currentPage.value.objects = objects;
}

function updateCurrentPageThumbnail(thumbnail) {
  currentPage.value.thumbnail = thumbnail;
}

function handleUndo() {
  canvasRef.value?.undo();
}

async function handlePasteImage() {
  await canvasRef.value?.pasteImageFromClipboard();
}

function handleUploadImage() {
  canvasRef.value?.openImagePicker();
}

function handleClear() {
  canvasRef.value?.clear();
}

function handleExport() {
  canvasRef.value?.exportPNG('whiteboard-page-' + (currentIndex.value + 1) + '.png');
}

async function handleExportAll() {
  await canvasRef.value?.exportAllPagesPNG(pages.value);
}

function handleExportSvg() {
  canvasRef.value?.exportCurrentPageSVG(
    currentPage.value,
    'whiteboard-page-' + (currentIndex.value + 1) + '.svg'
  );
}
</script>
