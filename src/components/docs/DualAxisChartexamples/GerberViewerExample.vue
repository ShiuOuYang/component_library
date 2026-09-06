<template>
  <div class="mb-8">
    <h3 class="text-2xl font-semibold text-gray-800 mb-4">蝭? H嚗erber PCB 瑼Ｚ???/h3>
    <p class="text-gray-600 mb-4">
      雿輻 <span class="font-semibold text-green-600">@tracespace/parser</span> 閫?? Gerber 瑼?嚗?
      ?剝? <span class="font-semibold text-blue-600">D3.js</span> 皜脫? PCB Bump Map??
      ?舀 <span class="font-semibold">皛曇憚蝮格</span>??span class="font-semibold">?撟喟宏</span>??
      <span class="font-semibold">???蔭</span>??
    </p>

    <div class="grid lg:grid-cols-2 gap-6">
      <!-- ?”???-->
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <!-- ?批??-->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div class="flex items-center gap-2">
            <span class="text-green-400 text-sm font-mono">? Gerber Viewer</span>
            <span class="text-gray-500 text-xs">|</span>
            <span class="text-gray-400 text-xs font-mono">{{ fileName }}</span>
          </div>
          <div class="flex items-center gap-2">
            <!-- 憿?豢? -->
            <label class="text-xs text-gray-400">?惜??</label>
            <div class="flex gap-1">
              <button
                v-for="c in colorOptions" :key="c.value"
                @click="selectedColor = c.value"
                :class="[
                  'w-5 h-5 rounded-full border-2 transition-all',
                  selectedColor === c.value 
                    ? 'border-white scale-110' 
                    : 'border-gray-600 hover:border-gray-400'
                ]"
                :style="{ backgroundColor: c.value }"
                :title="c.label"
              />
            </div>
          </div>
        </div>

        <!-- Gerber 憿舐內? -->
        <div style="height: 500px;">
          <GerberViewer
            ref="viewerRef"
            :src="gerberSrc"
            :fill-color="selectedColor"
            :show-info="true"
            :show-controls="true"
            :auto-resize="true"
            background-color="#0d1117"
            @loaded="onLoaded"
            @error="onError"
          />
        </div>

        <!-- ??? -->
        <div class="flex items-center justify-between px-4 py-1.5 bg-gray-800 border-t border-gray-700">
          <span class="text-xs text-gray-500 font-mono">
            {{ statusText }}
          </span>
          <span class="text-xs text-gray-500">
            皛曇憚蝮格 繚 ?撟喟宏 繚 ???蔭
          </span>
        </div>
      </div>

      <!-- 蝔?蝣潛?靘?-->
      <CodeBlock
        language="vue"
        :code="codeExample"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GerberViewer from '@/components/library/viewer/GerberViewer.vue'
import CodeBlock from '@/components/library/ui/CodeBlock.vue'

const viewerRef = ref(null)
const fileName = '3273053a01-cus-sesc-bump.gbr'
const gerberSrc = '/3273053a01-cus-sesc-bump.gbr'
const statusText = ref('頛銝?..')

const selectedColor = ref('#00ff88')
const colorOptions = [
  { value: '#00ff88', label: '?惜蝬? },
  { value: '#ff6b35', label: '璈' },
  { value: '#3b82f6', label: '?' },
  { value: '#eab308', label: '?' },
  { value: '#ef4444', label: '蝝' },
  { value: '#ffffff', label: '?質' },
]

const onLoaded = ({ info }) => {
  statusText.value = `??${info.shapeCount} ??敶?| ${info.sizeText}`
}

const onError = ({ message }) => {
  statusText.value = `??${message}`
}

const codeExample = `<template>
  <div style="height: 500px;">
    <GerberViewer
      src="/3273053a01-cus-sesc-bump.gbr"
      fill-color="#00ff88"
      background-color="#0d1117"
      :show-info="true"
      :show-controls="true"
      :auto-resize="true"
      @loaded="onLoaded"
      @error="onError"
    />
  </div>
</template>

<script setup>
import GerberViewer from '@/components/library/viewer/GerberViewer.vue'

const onLoaded = ({ info }) => {
  console.log('Gerber 頛摰?:', info)
  // { units: 'mm', shapeCount: 20243, sizeText: '...' }
}

// GerberViewer Props:
// - src: String        Gerber 瑼? URL
// - gerberText: String ?湔?喳 Gerber ????
// - fillColor: String  ?耦憛怠???(?身 #00ff88)
// - backgroundColor: String ???(?身 #1a1a2e)
// - showInfo: Boolean  憿舐內鞈??Ｘ
// - showControls: Boolean 憿舐內?批??
// - autoResize: Boolean ?芸??踵?摰孵憭批?
// - padding: Number    ?? (px)
// - maxZoom: Number    ?憭抒葬?曉?
// - minZoom: Number    ?撠葬?曉?

// Events:
// @loaded  - 頛摰? { info }
// @error   - 頛憭望? { message }
// @zoom-change - 蝮格霈? { zoom }

// Expose Methods:
// zoomIn() / zoomOut() / resetView() / reload()
<\/script>`
</script>
