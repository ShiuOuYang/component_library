<template>
  <div ref="containerRef" class="gerber-viewer w-full h-full flex overflow-hidden">

    <!-- 圖層面板（多圖層時顯示） -->
    <div
      v-if="showLayerPanel && activeLayers.length > 1"
      class="flex-shrink-0 w-40 bg-gray-950 border-r border-gray-700 flex flex-col select-none z-20"
    >
      <div class="px-2 py-1.5 text-xs text-gray-500 font-mono border-b border-gray-700 flex items-center gap-1.5">
        <span>⬛</span>
        <span>圖層 ({{ activeLayers.length }})</span>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="layer in activeLayers"
          :key="layer.id"
          class="flex items-center gap-2 px-2 py-2 cursor-pointer border-b border-gray-800/40 transition-colors"
          :class="layer.visible ? 'hover:bg-gray-800' : 'hover:bg-gray-900'"
          @click="toggleLayer(layer)"
          :title="layer.name"
        >
          <!-- 行為色塊（解析層）或圖層顏色（tracespace 層）-->
          <div class="flex gap-0.5 flex-shrink-0" :style="{ opacity: layer.visible ? 1 : 0.3 }">
            <template v-if="layer.parsed && layerBehaviorTypes(layer).length > 0">
              <div
                v-for="t in layerBehaviorTypes(layer)"
                :key="t"
                class="w-2 h-3 rounded-sm"
                :style="{ backgroundColor: BEHAVIOR_COLORS[t] }"
                :title="BEHAVIOR_LABELS[t]"
              ></div>
            </template>
            <template v-else>
              <div
                class="w-3 h-3 rounded-sm border-2"
                :style="{ backgroundColor: layer.visible ? layer.color : 'transparent', borderColor: layer.color }"
              ></div>
            </template>
          </div>
          <span
            class="text-xs font-mono truncate flex-1 leading-none transition-colors"
            :class="layer.visible ? 'text-gray-200' : 'text-gray-600'"
          >{{ layer.name }}</span>
          <span v-if="layer.loading" class="text-yellow-400 text-xs animate-pulse">⏳</span>
          <span
            v-else-if="layer.error"
            class="text-red-500 text-xs font-bold"
            :title="layer.error"
          >!</span>
        </div>
      </div>
    </div>

    <!-- 主視圖 -->
    <div class="relative flex-1 min-w-0 h-full">

      <!-- 全域載入中 -->
      <div v-if="globalLoading" class="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-400 border-t-transparent mx-auto mb-3"></div>
          <p class="text-green-400 text-sm font-mono">{{ loadingMessage }}</p>
        </div>
      </div>

      <!-- 致命錯誤 -->
      <div v-if="fatalError" class="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
        <div class="text-center p-6">
          <span class="text-4xl mb-3 block">⚠️</span>
          <p class="text-red-400 text-sm font-mono">{{ fatalError }}</p>
          <button
            @click="reload"
            class="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
          >重試</button>
        </div>
      </div>

      <!-- SVG 畫布 -->
      <svg ref="svgRef" class="w-full h-full" :style="{ background: backgroundColor }"></svg>

      <!-- 資訊面板 -->
      <div
        v-if="showInfo && imageInfo"
        class="absolute top-3 left-3 bg-black/70 text-green-400 text-xs font-mono rounded px-3 py-2 pointer-events-none select-none leading-relaxed"
      >
        <div>{{ imageInfo.units === 'mm' ? '公厘' : '英寸' }} | {{ imageInfo.shapeCount }} 個圖形</div>
        <div>{{ imageInfo.sizeText }}</div>
        <div v-if="currentZoom !== 1">縮放: {{ (currentZoom * 100).toFixed(0) }}%</div>
        <!-- 行為類型圖例 -->
        <template v-if="hasManualParsedLayers">
          <div class="mt-1.5 pt-1.5 border-t border-green-800/60 space-y-0.5">
            <div v-for="(bColor, bType) in BEHAVIOR_COLORS" :key="bType" class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: bColor }"></div>
              <span>{{ BEHAVIOR_LABELS[bType] }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- 縮放控制 -->
      <div v-if="showControls" class="absolute bottom-3 right-3 flex gap-1.5">
        <!-- D02 移動軌跡切換（hasManualParsedLayers 時才顯示）-->
        <button
          v-if="hasManualParsedLayers"
          @click="showMovePathState = !showMovePathState"
          class="h-8 px-2 text-xs font-mono rounded transition-colors"
          :class="showMovePathState
            ? 'bg-red-600/80 hover:bg-red-500 text-white'
            : 'bg-black/60 hover:bg-black/80 text-gray-400'"
          title="切換 D02 移動軌跡顯示"
        >D02</button>
        <button
          @click="zoomIn"
          class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-lg transition-colors"
          title="放大"
        >+</button>
        <button
          @click="zoomOut"
          class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-lg transition-colors"
          title="縮小"
        >−</button>
        <button
          @click="resetView"
          class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-sm transition-colors"
          title="重置視角"
        >⟳</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as d3 from 'd3'

// ===== 行為類型顏色映射（依指令行為分色，而非依檔案分色）=====
const BEHAVIOR_COLORS = {
  region: '#00ff88',  // G36/G37 填充區域（絲印字元、銅箔多邊形）
  draw:   '#4ecdc4',  // D01 線條走線
  flash:  '#ffe66d',  // D03 焊盤/覆蓋
  drill:  '#ff6b6b',  // Excellon 鑽孔點
  slot:   '#c0a0ff',  // Excellon 槽孔 (G85)
  move:   '#ff4444',  // D02 移動軌跡（EDA 工具路徑分析）
}
const BEHAVIOR_LABELS = {
  region: 'Region (G36/G37)',
  draw:   '線條 (D01)',
  flash:  '焊盤 (D03)',
  drill:  '鑽孔',
  slot:   '槽孔 (G85)',
  move:   '移動軌跡 (D02)',
}

// ===== Props =====
const props = defineProps({
  /** 單一 Gerber URL（向下相容） */
  src: { type: String, default: '' },
  /** 單一 Gerber 原始文字（向下相容） */
  gerberText: { type: String, default: '' },
  /** 單一模式填充色（向下相容） */
  fillColor: { type: String, default: '#00ff88' },
  /**
   * 多圖層定義（優先於 src/gerberText）
   * 每項: { src?, gerberText?, name, color, visible? }
   */
  layers: { type: Array, default: () => [] },
  /** 背景色 */
  backgroundColor: { type: String, default: '#1a1a2e' },
  /** 是否顯示資訊面板 */
  showInfo: { type: Boolean, default: true },
  /** 是否顯示縮放按鈕 */
  showControls: { type: Boolean, default: true },
  /** 是否顯示圖層面板（多圖層時自動啟用） */
  showLayerPanel: { type: Boolean, default: true },
  /** 是否自動響應容器 resize */
  autoResize: { type: Boolean, default: true },
  /** 邊距 (px) */
  padding: { type: Number, default: 20 },
  /** 最大縮放倍率 */
  maxZoom: { type: Number, default: 200 },
  /** 最小縮放倍率 */
  minZoom: { type: Number, default: 0.1 },
  /** 是否顯示 D02 移動軌跡（EDA 工具路徑分析用）*/
  showMovePath: { type: Boolean, default: false },
})

const emit = defineEmits(['loaded', 'error', 'zoom-change'])

// ===== DOM Refs =====
const containerRef = ref(null)
const svgRef = ref(null)

// ===== 狀態 =====
const globalLoading = ref(false)
const loadingMessage = ref('載入中...')
const fatalError = ref(null)
const currentZoom = ref(1)
const imageInfo = ref(null)
/** 內部圖層物件陣列（響應式） */
const activeLayers = ref([])

// D3 物件（非響應式）
let svgSelection = null
let mainGroup = null
let zoomBehavior = null
let resizeObserver = null
let resizeTimer = null
/** layer.id → D3 Selection 對映 */
const layerGroupMap = new Map()

/** D02 移動軌跡顯示開關（可由 UI 按鈕切換，初始值由 prop 決定）*/
const showMovePathState = ref(false)

/** 是否有手動解析（非 tracespace）的圖層，用於顯示行為圖例 */
const hasManualParsedLayers = computed(() => activeLayers.value.some(l => l.parsed))

/** 取得圖層實際包含的行為類型列表（供圖層面板色塊顯示） */
function layerBehaviorTypes(layer) {
  if (!layer.parsed) return []
  if (layer.parsed.fileType === 'excellon') {
    return [...new Set(layer.parsed.commands.map(c => c.type))].filter(t => BEHAVIOR_COLORS[t])
  }
  return [...new Set(layer.parsed.commands.filter(c => c.type !== 'move').map(c => c.type))]
    .filter(t => BEHAVIOR_COLORS[t])
}

// ===== 建立內部圖層陣列 =====
function buildActiveLayers() {
  if (props.layers && props.layers.length > 0) {
    activeLayers.value = props.layers.map((l, i) => ({
      id: `layer-${i}`,
      src: l.src || '',
      gerberText: l.gerberText || '',
      name: l.name || `圖層 ${i + 1}`,
      color: l.color || defaultLayerColor(i),
      visible: l.visible !== false,
      loading: false,
      error: null,
      imageTree: null,
      parsed: null,
    }))
  } else if (props.src || props.gerberText) {
    activeLayers.value = [{
      id: 'layer-0',
      src: props.src,
      gerberText: props.gerberText,
      name: props.src ? props.src.split('/').pop().split('?')[0] : 'Gerber',
      color: props.fillColor,
      visible: true,
      loading: false,
      error: null,
      imageTree: null,
      parsed: null,
    }]
  } else {
    activeLayers.value = []
  }
}

/** 預設多圖層顏色 */
function defaultLayerColor(index) {
  const palette = ['#00ff88', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#c0a0ff', '#ff9f40']
  return palette[index % palette.length]
}

// ===== Gerber 手動解析器（修正 D02 位置追蹤）=====
function parseGerber(text) {
  const lines = text.split(/[\r\n]+/)
  const apertures = {}
  const commands = []

  let currentAperture = null
  let x = 0, y = 0           // 當前繪圖位置（模態座標）
  let formatX = { int: 3, dec: 5 }
  let formatY = { int: 3, dec: 5 }
  let units = 'mm'
  let polarity = 'dark'
  let interpolation = 'linear'
  let regionMode = false
  let regionPoints = []
  let regionPolarity = 'dark'

  const fullText = text.replace(/[\r\n]+/g, '\n')

  // 解析格式規格
  const fmtMatch = fullText.match(/%FSLAX(\d)(\d)Y(\d)(\d)\*%/)
  if (fmtMatch) {
    formatX = { int: parseInt(fmtMatch[1]), dec: parseInt(fmtMatch[2]) }
    formatY = { int: parseInt(fmtMatch[3]), dec: parseInt(fmtMatch[4]) }
  }

  // 單位
  if (fullText.includes('%MOMM*%')) units = 'mm'
  else if (fullText.includes('%MOIN*%')) units = 'in'

  function parseCoord(str, format) {
    return parseInt(str) / Math.pow(10, format.dec)
  }

  // Aperture 定義（支援 A-Z 及小寫，處理有無逗號分隔）
  const apRegex = /%ADD(\d+)([A-Za-z]+),?([^*]*)\*%/g
  let apMatch
  while ((apMatch = apRegex.exec(fullText)) !== null) {
    const id = apMatch[1]
    const shape = apMatch[2].toUpperCase()
    const raw = apMatch[3] ? apMatch[3].trim() : ''
    const params = raw ? raw.split('X').map(Number) : [0]
    apertures[id] = { shape, params }
  }

  // 逐行解析指令
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === '*') continue

    // 處理 % 開頭的參數塊（極性等）
    if (trimmed.startsWith('%')) {
      if (trimmed.includes('LPD')) polarity = 'dark'
      else if (trimmed.includes('LPC')) polarity = 'clear'
      continue
    }

    // G36 開始區域
    if (/G36\*?$/.test(trimmed)) {
      regionMode = true
      regionPoints = []
      regionPolarity = polarity
      continue
    }
    // G37 結束區域
    if (/G37\*?$/.test(trimmed)) {
      if (regionPoints.length >= 3) {
        commands.push({ type: 'region', points: [...regionPoints], polarity: regionPolarity })
      }
      regionMode = false
      regionPoints = []
      continue
    }

    // 插值模式
    if (/G0?1[^0-9]/.test(trimmed)) interpolation = 'linear'
    if (/G0?2[^0-9]/.test(trimmed)) interpolation = 'cw'
    if (/G0?3[^0-9]/.test(trimmed)) interpolation = 'ccw'

    // 選取 Aperture（Dxx*，xx >= 10）
    const selMatch = trimmed.match(/^(?:G54)?D(\d+)\*$/)
    if (selMatch) {
      const code = parseInt(selMatch[1])
      if (code >= 10) { currentAperture = selMatch[1]; continue }
    }

    // 座標 + D 碼指令（D01/D02/D03）
    const coordMatch = trimmed.match(
      /^(?:G\d+)?(X([+-]?\d+))?(Y([+-]?\d+))?(I([+-]?\d+))?(J([+-]?\d+))?D0?([123])\*$/
    )
    if (coordMatch) {
      // 記錄繪圖前的當前位置（D01 的 fromX/fromY 使用）
      const prevX = x
      const prevY = y

      if (coordMatch[2] != null) x = parseCoord(coordMatch[2], formatX)
      if (coordMatch[4] != null) y = parseCoord(coordMatch[4], formatY)
      const i = coordMatch[6] != null ? parseCoord(coordMatch[6], formatX) : 0
      const j = coordMatch[8] != null ? parseCoord(coordMatch[8], formatY) : 0
      const dCode = parseInt(coordMatch[9])

      if (regionMode) {
        // 區域模式：記錄點，並標記 D02（新子輪廓起點）vs D01（畫線）
        regionPoints.push({ x, y, move: dCode === 2 })
      } else if (dCode === 1) {
        // D01: 畫線 — 從 prevX/prevY 至 x/y（已在解析時確定起點）
        commands.push({
          type: 'draw',
          fromX: prevX, fromY: prevY,
          x, y, i, j,
          aperture: currentAperture,
          interpolation,
          polarity,
        })
      } else if (dCode === 2) {
        // D02: 移動（提筆） — 記錄起點與終點，供路徑分析
        commands.push({ type: 'move', fromX: prevX, fromY: prevY, x, y, polarity })
      } else if (dCode === 3) {
        // D03: 閃爍（蓋印 Aperture）
        commands.push({ type: 'flash', x, y, aperture: currentAperture, polarity })
      }
      continue
    }

    // 無 D 碼的純座標行（更新模態位置）
    const noDCode = trimmed.match(/^(?:G\d+)?(X([+-]?\d+))?(Y([+-]?\d+))?\*$/)
    if (noDCode) {
      if (noDCode[2] != null) x = parseCoord(noDCode[2], formatX)
      if (noDCode[4] != null) y = parseCoord(noDCode[4], formatY)
    }
  }

  return { apertures, commands, units, formatX, formatY }
}

// ===== Excellon 鑽孔檔偵測 =====
function isExcellon(text) {
  return /^M48\b/m.test(text) || /^T\d+C[\d.]+/m.test(text)
}

// ===== Excellon 鑽孔檔解析 =====
// 支援格式: METRIC/INCH, 顯式小數點座標, G85 槽孔
function parseExcellon(text) {
  const lines = text.split(/[\r\n]+/)
  const tools = {}    // { toolId: { diameter } }
  const commands = []
  let currentTool = null
  let units = 'mm'
  let inHeader = true

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(';')) continue

    if (trimmed === 'M48') { inHeader = true; continue }
    if (trimmed === '%') { inHeader = false; continue }
    if (trimmed === 'M30' || trimmed === 'M02') break

    // 單位
    if (/^METRIC/i.test(trimmed)) { units = 'mm'; continue }
    if (/^INCH/i.test(trimmed)) { units = 'in'; continue }

    // 工具定義: T01C0.30500
    const toolDefMatch = trimmed.match(/^T(\d+)C([\d.]+)/)
    if (toolDefMatch) {
      tools[toolDefMatch[1]] = { diameter: parseFloat(toolDefMatch[2]) }
      continue
    }

    if (inHeader) continue

    // G05/G90 等模式指令：忽略
    if (/^G\d+$/.test(trimmed)) continue

    // 工具選取: T01
    const toolSelMatch = trimmed.match(/^T(\d+)$/)
    if (toolSelMatch) { currentTool = toolSelMatch[1]; continue }

    // 槽孔 G85: X...Y...G85X...Y...
    const slotMatch = trimmed.match(/^X([+-]?[\d.]+)Y([+-]?[\d.]+)G85X([+-]?[\d.]+)Y([+-]?[\d.]+)/)
    if (slotMatch) {
      commands.push({
        type: 'slot',
        x1: parseFloat(slotMatch[1]), y1: parseFloat(slotMatch[2]),
        x2: parseFloat(slotMatch[3]), y2: parseFloat(slotMatch[4]),
        tool: currentTool,
      })
      continue
    }

    // 鑽孔點: X...Y...
    const drillMatch = trimmed.match(/^X([+-]?[\d.]+)Y([+-]?[\d.]+)/)
    if (drillMatch) {
      commands.push({
        type: 'drill',
        x: parseFloat(drillMatch[1]),
        y: parseFloat(drillMatch[2]),
        tool: currentTool,
      })
    }
  }

  return { tools, commands, units, fileType: 'excellon' }
}

// ===== tracespace 解析（優先嘗試）=====
async function parseWithTracespace(text) {
  try {
    const { parse } = await import('@tracespace/parser')
    const { plot } = await import('@tracespace/plotter')
    const tree = parse(text)
    const image = plot(tree)
    return image
  } catch (e) {
    console.warn('tracespace 解析失敗，回退手動解析:', e.message)
    return null
  }
}

// ===== 載入單一圖層 =====
async function loadLayer(layer) {
  layer.loading = true
  layer.error = null
  layer.imageTree = null
  layer.parsed = null

  try {
    let text = ''
    if (layer.gerberText) {
      text = layer.gerberText
    } else if (layer.src) {
      const res = await fetch(layer.src)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      text = await res.text()
    } else {
      throw new Error('缺少 src 或 gerberText')
    }

    // Excellon 鑽孔檔直接走專用解析器，不走 tracespace
    if (isExcellon(text)) {
      layer.parsed = parseExcellon(text)
    } else {
      const imageTree = await parseWithTracespace(text)
      if (imageTree && Array.isArray(imageTree.size) && imageTree.size.length === 4) {
        layer.imageTree = imageTree
      } else {
        layer.parsed = parseGerber(text)
      }
    }
  } catch (e) {
    layer.error = e.message
    console.warn(`圖層 "${layer.name}" 載入失敗:`, e)
  } finally {
    layer.loading = false
  }
}

// ===== 計算全域邊界（所有圖層聯集）=====
function computeGlobalBounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const layer of activeLayers.value) {
    if (layer.imageTree) {
      const [x1, y1, x2, y2] = layer.imageTree.size
      minX = Math.min(minX, x1); minY = Math.min(minY, y1)
      maxX = Math.max(maxX, x2); maxY = Math.max(maxY, y2)
    } else if (layer.parsed) {
      if (layer.parsed.fileType === 'excellon') {
        const { tools, commands } = layer.parsed
        for (const c of commands) {
          if (c.type === 'drill') {
            const r = (tools[c.tool]?.diameter ?? 0.3) / 2
            minX = Math.min(minX, c.x - r); maxX = Math.max(maxX, c.x + r)
            minY = Math.min(minY, c.y - r); maxY = Math.max(maxY, c.y + r)
          } else if (c.type === 'slot') {
            const r = (tools[c.tool]?.diameter ?? 0.3) / 2
            minX = Math.min(minX, c.x1 - r, c.x2 - r); maxX = Math.max(maxX, c.x1 + r, c.x2 + r)
            minY = Math.min(minY, c.y1 - r, c.y2 - r); maxY = Math.max(maxY, c.y1 + r, c.y2 + r)
          }
        }
      } else {
        for (const c of layer.parsed.commands) {
          // region 指令：遍歷所有頂點（這是大多數 silk/copper 內容的實際邊界）
          if (c.type === 'region' && Array.isArray(c.points)) {
            for (const p of c.points) {
              if (isFinite(p.x)) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x) }
              if (isFinite(p.y)) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
            }
          } else {
            if (c.x != null && isFinite(c.x)) { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x) }
            if (c.y != null && isFinite(c.y)) { minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y) }
            if (c.fromX != null && isFinite(c.fromX)) { minX = Math.min(minX, c.fromX); maxX = Math.max(maxX, c.fromX) }
            if (c.fromY != null && isFinite(c.fromY)) { minY = Math.min(minY, c.fromY); maxY = Math.max(maxY, c.fromY) }
          }
        }
      }
    }
  }

  if (!isFinite(minX) || !isFinite(minY)) return null
  return { x1: minX, y1: minY, x2: maxX, y2: maxY }
}

// ===== 渲染所有圖層 =====
function renderAllLayers(width, height) {
  svgSelection.selectAll('*').remove()
  layerGroupMap.clear()

  const bounds = computeGlobalBounds()
  if (!bounds) { fatalError.value = '無有效 Gerber 座標資料'; return }

  const { x1, y1, x2, y2 } = bounds
  const geoW = (x2 - x1) || 1
  const geoH = (y2 - y1) || 1
  const pad = props.padding

  const scale = Math.min((width - pad * 2) / geoW, (height - pad * 2) / geoH)
  const offsetX = (width - geoW * scale) / 2
  const offsetY = (height - geoH * scale) / 2

  mainGroup = svgSelection.append('g').attr('class', 'gerber-root')

  // 全域座標轉換：Gerber 座標 → SVG 像素（Y 軸翻轉）
  const globalGroup = mainGroup.append('g')
    .attr('class', 'gerber-world')
    .attr('transform',
      `translate(${offsetX},${offsetY + geoH * scale}) scale(${scale},${-scale}) translate(${-x1},${-y1})`)

  let totalShapes = 0
  let units = 'mm'

  for (const layer of activeLayers.value) {
    const layerG = globalGroup.append('g')
      .attr('id', `gerber-${layer.id}`)
      .attr('display', layer.visible ? null : 'none')
    layerGroupMap.set(layer.id, layerG)

    if (layer.imageTree) {
      renderLayerTracespace(layerG, layer.imageTree, layer.color)
      totalShapes += layer.imageTree.children?.length ?? 0
      units = layer.imageTree.units || units
    } else if (layer.parsed) {
      if (layer.parsed.fileType === 'excellon') {
        renderLayerExcellon(layerG, layer.parsed, layer.color)
      } else {
        renderLayerManual(layerG, layer.parsed, layer.color)
      }
      totalShapes += layer.parsed.commands.length
      units = layer.parsed.units || units
    }
  }

  imageInfo.value = {
    units,
    shapeCount: totalShapes,
    sizeText: `${geoW.toFixed(2)} × ${geoH.toFixed(2)} ${units}`,
  }

  setupZoom(svgSelection, mainGroup, width, height)
}

// ===== 渲染 tracespace ImageTree =====
function renderLayerTracespace(group, imageTree, color) {
  for (const child of imageTree.children ?? []) {
    renderImageGraphic(group, child, color)
  }
}

function renderImageGraphic(g, graphic, color) {
  if (graphic.type === 'imageShape') renderShape(g, graphic.shape, color)
  else if (graphic.type === 'imagePath') renderTsPath(g, graphic, color)
  else if (graphic.type === 'imageRegion') renderTsRegion(g, graphic, color)
}

function renderShape(g, shape, color) {
  if (shape.type === 'circle') {
    g.append('circle')
      .attr('cx', shape.cx).attr('cy', shape.cy).attr('r', shape.r)
      .attr('fill', color)
  } else if (shape.type === 'rectangle') {
    g.append('rect')
      .attr('x', shape.x).attr('y', shape.y)
      .attr('width', shape.xSize).attr('height', shape.ySize)
      .attr('rx', shape.r ?? 0).attr('ry', shape.r ?? 0)
      .attr('fill', color)
  } else if (shape.type === 'polygon') {
    g.append('polygon')
      .attr('points', shape.points.map(p => p.join(',')).join(' '))
      .attr('fill', color)
  } else if (shape.type === 'outline') {
    g.append('path').attr('d', segmentsToPath(shape.segments)).attr('fill', color)
  } else if (shape.type === 'layeredShape') {
    for (const s of shape.shapes) renderShape(g, s.shape ?? s, color)
  }
}

function renderTsPath(g, pathGraphic, color) {
  g.append('path')
    .attr('d', segmentsToPath(pathGraphic.segments))
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', pathGraphic.width ?? 0.01)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
}

function renderTsRegion(g, region, color) {
  g.append('path')
    .attr('d', segmentsToPath(region.segments) + 'Z')
    .attr('fill', color)
    .attr('stroke', 'none')
}

function segmentsToPath(segments) {
  if (!segments || segments.length === 0) return ''
  let d = `M${segments[0].start[0]},${segments[0].start[1]}`
  for (const seg of segments) {
    if (seg.type === 'line') {
      d += `L${seg.end[0]},${seg.end[1]}`
    } else if (seg.type === 'arc') {
      const r = seg.radius
      const largeArc = Math.abs(seg.end[2] - seg.start[2]) > Math.PI ? 1 : 0
      const sweep = seg.end[2] > seg.start[2] ? 1 : 0
      d += `A${r},${r} 0 ${largeArc} ${sweep} ${seg.end[0]},${seg.end[1]}`
    }
  }
  return d
}

// ===== 渲染 Excellon 鑽孔圖層（依行為類型分色）=====
function renderLayerExcellon(group, excellonData, _layerColor) {
  const { tools, commands } = excellonData

  // 鑽孔點（圓形）— 鑽孔顏色
  const drillCmds = commands.filter(c => c.type === 'drill')
  const drillByTool = d3.group(drillCmds, d => d.tool)
  for (const [toolId, cmds] of drillByTool) {
    const r = (tools[toolId]?.diameter ?? 0.3) / 2
    group.selectAll(null).data(cmds).join('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', r)
      .attr('fill', BEHAVIOR_COLORS.drill)
      .attr('fill-opacity', 0.9)
  }

  // 槽孔（G85）— 槽孔顏色
  const slotCmds = commands.filter(c => c.type === 'slot')
  for (const slot of slotCmds) {
    const diam = tools[slot.tool]?.diameter ?? 0.3
    const r = diam / 2
    const cx = (slot.x1 + slot.x2) / 2
    const cy = (slot.y1 + slot.y2) / 2
    const dx = slot.x2 - slot.x1
    const dy = slot.y2 - slot.y1
    const len = Math.sqrt(dx * dx + dy * dy)
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI
    // 圓角矩形：寬 = 孔距 + 直徑，高 = 直徑
    group.append('rect')
      .attr('x', cx - (len / 2 + r))
      .attr('y', cy - r)
      .attr('width', len + diam)
      .attr('height', diam)
      .attr('rx', r)
      .attr('ry', r)
      .attr('fill', BEHAVIOR_COLORS.slot)
      .attr('fill-opacity', 0.9)
      .attr('transform', `rotate(${angleDeg},${cx},${cy})`)
  }
}

// ===== 渲染手動解析圖層（依行為類型分色）=====
function renderLayerManual(group, parsed, _layerColor) {
  const { commands, apertures } = parsed

  // Flash (D03)：焊盤顏色
  const flashCmds = commands.filter(c => c.type === 'flash')
  const flashByAp = d3.group(flashCmds, d => d.aperture)
  for (const [apId, cmds] of flashByAp) {
    const ap = apertures[apId]
    if (!ap) continue
    renderFlashes(group, ap, cmds, BEHAVIOR_COLORS.flash)
  }

  // Draw (D01)：線條走線顏色
  const drawCmds = commands.filter(c => c.type === 'draw')
  if (drawCmds.length > 0) {
    const drawByAp = d3.group(drawCmds, d => d.aperture)
    for (const [apId, cmds] of drawByAp) {
      const ap = apertures[apId]
      const strokeW = ap ? (ap.params[0] || 0.01) : 0.01
      group.selectAll(null).data(cmds).join('line')
        .attr('x1', d => d.fromX)
        .attr('y1', d => d.fromY)
        .attr('x2', d => d.x)
        .attr('y2', d => d.y)
        .attr('stroke', BEHAVIOR_COLORS.draw)
        .attr('stroke-width', strokeW)
        .attr('stroke-linecap', 'round')
    }
  }

  // Move (D02)：工具移動軌跡（僅 showMovePathState 開啟時渲染，EDA 分析用）
  if (showMovePathState.value) {
    const moveCmds = commands.filter(c => c.type === 'move')
    // 每個 D02 渲染一條獨立虛線：從上一個動作終點（fromX/fromY）跳至新位置（x/y）
    for (const cmd of moveCmds) {
      group.append('line')
        .attr('x1', cmd.fromX)
        .attr('y1', cmd.fromY)
        .attr('x2', cmd.x)
        .attr('y2', cmd.y)
        .attr('stroke', BEHAVIOR_COLORS.move)
        .attr('stroke-width', 0.08)
        .attr('stroke-dasharray', '0.4,0.25')
        .attr('stroke-opacity', 0.7)
        .attr('stroke-linecap', 'round')
    }
  }

  // Region：填充區域顏色
  // D02 = 新子輪廓起點（M），D01 = 畫線（L），多個 D02 表示複合 region（如字母 O 的洞）
  const regionCmds = commands.filter(c => c.type === 'region')
  for (const region of regionCmds) {
    if (!region.points || region.points.length < 3) continue
    let d = ''
    for (const p of region.points) {
      if (p.move) {
        if (d) d += 'Z '   // 關閉前一個子輪廓
        d += `M${p.x},${p.y}`
      } else {
        d += `L${p.x},${p.y}`
      }
    }
    d += 'Z'
    group.append('path')
      .attr('d', d)
      .attr('fill', BEHAVIOR_COLORS.region)
      .attr('fill-rule', 'evenodd')  // 複合 region（有洞）用 evenodd 正確渲染
  }
}

function renderFlashes(group, ap, cmds, color) {
  const shape = ap.shape
  if (shape === 'C') {
    const r = (ap.params[0] || 0.1) / 2
    group.selectAll(null).data(cmds).join('circle')
      .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', r)
      .attr('fill', color)
  } else if (shape === 'R') {
    const w = ap.params[0] || 0.1
    const h = ap.params[1] ?? w
    group.selectAll(null).data(cmds).join('rect')
      .attr('x', d => d.x - w / 2).attr('y', d => d.y - h / 2)
      .attr('width', w).attr('height', h)
      .attr('fill', color)
  } else if (shape === 'O') {
    const w = ap.params[0] || 0.1
    const h = ap.params[1] ?? w
    const r = Math.min(w, h) / 2
    group.selectAll(null).data(cmds).join('rect')
      .attr('x', d => d.x - w / 2).attr('y', d => d.y - h / 2)
      .attr('width', w).attr('height', h)
      .attr('rx', r).attr('ry', r)
      .attr('fill', color)
  } else if (shape === 'P') {
    const od = (ap.params[0] || 0.1) / 2
    const n = Math.max(3, ap.params[1] || 6)
    const rot = (ap.params[2] || 0) * Math.PI / 180
    const pts = Array.from({ length: n }, (_, i) => {
      const a = (i * 2 * Math.PI / n) + rot
      return [Math.cos(a) * od, Math.sin(a) * od]
    })
    group.selectAll(null).data(cmds).join('polygon')
      .attr('points', d => pts.map(p => `${d.x + p[0]},${d.y + p[1]}`).join(' '))
      .attr('fill', color)
  }
}

// ===== 圖層可見性切換 =====
function toggleLayer(layer) {
  layer.visible = !layer.visible
  const layerGroup = layerGroupMap.get(layer.id)
  if (layerGroup) layerGroup.attr('display', layer.visible ? null : 'none')
}

// ===== Zoom =====
function setupZoom(svg, group, width, height) {
  zoomBehavior = d3.zoom()
    .scaleExtent([props.minZoom, props.maxZoom])
    .on('zoom', (event) => {
      group.attr('transform', event.transform)
      currentZoom.value = event.transform.k
      emit('zoom-change', { zoom: event.transform.k })
    })

  svg.call(zoomBehavior)
    .on('dblclick.zoom', () => resetView())
}

function zoomIn() {
  if (!svgSelection || !zoomBehavior) return
  svgSelection.transition().duration(300).call(zoomBehavior.scaleBy, 1.5)
}

function zoomOut() {
  if (!svgSelection || !zoomBehavior) return
  svgSelection.transition().duration(300).call(zoomBehavior.scaleBy, 0.67)
}

function resetView() {
  if (!svgSelection || !zoomBehavior) return
  svgSelection.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity)
  currentZoom.value = 1
}

// ===== 主載入流程 =====
async function loadAndRender() {
  globalLoading.value = true
  fatalError.value = null
  imageInfo.value = null

  try {
    buildActiveLayers()

    if (activeLayers.value.length === 0) {
      throw new Error('請提供 src、gerberText 或 layers 屬性')
    }

    loadingMessage.value = `載入 ${activeLayers.value.length} 個圖層...`
    await Promise.all(activeLayers.value.map(loadLayer))

    const successCount = activeLayers.value.filter(l => l.imageTree || l.parsed).length
    if (successCount === 0) throw new Error('所有圖層均載入失敗')

    loadingMessage.value = '渲染圖形...'
    await nextTick()

    const { width, height } = containerRef.value.getBoundingClientRect()
    if (width <= 0 || height <= 0) throw new Error('容器尺寸為 0，請確認父元素有設定高度')

    svgSelection = d3.select(svgRef.value).attr('width', width).attr('height', height)
    renderAllLayers(width, height)

    emit('loaded', {
      info: imageInfo.value,
      layerCount: activeLayers.value.length,
      successCount,
    })
  } catch (e) {
    console.error('GerberViewer 錯誤:', e)
    fatalError.value = e.message
    emit('error', { message: e.message })
  } finally {
    globalLoading.value = false
  }
}

function reload() {
  loadAndRender()
}

// ===== Resize（只重新渲染，不重新 fetch）=====
function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(async () => {
    if (!containerRef.value || !svgRef.value) return
    const { width, height } = containerRef.value.getBoundingClientRect()
    if (width <= 0 || height <= 0) return

    const hasData = activeLayers.value.some(l => l.imageTree || l.parsed)
    if (!hasData) return

    svgSelection = d3.select(svgRef.value).attr('width', width).attr('height', height)
    renderAllLayers(width, height)
    currentZoom.value = 1
  }, 200)
}

// ===== 生命週期 =====
onMounted(() => {
  if (props.autoResize && containerRef.value) {
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.value)
  }
  loadAndRender()
})

onBeforeUnmount(() => {
  clearTimeout(resizeTimer)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (svgSelection) svgSelection.on('.zoom', null)
})

// ===== 監聽 Props 變化 =====
watch(() => [props.src, props.gerberText, props.fillColor, props.backgroundColor], () => loadAndRender())
watch(() => props.layers, () => loadAndRender(), { deep: true })
watch(() => props.showMovePath, v => { showMovePathState.value = v }, { immediate: true })
watch(showMovePathState, () => {
  // 切換時直接重繪（不重新 fetch）
  if (!containerRef.value || !svgRef.value) return
  const { width, height } = containerRef.value.getBoundingClientRect()
  if (width > 0 && height > 0 && activeLayers.value.some(l => l.imageTree || l.parsed)) {
    svgSelection = d3.select(svgRef.value).attr('width', width).attr('height', height)
    renderAllLayers(width, height)
  }
})

defineExpose({ zoomIn, zoomOut, resetView, reload, toggleLayer })
</script>

<style scoped>
.gerber-viewer {
  user-select: none;
}
.gerber-viewer svg {
  cursor: grab;
  display: block;
}
.gerber-viewer svg:active {
  cursor: grabbing;
}
</style>
