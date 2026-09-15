<template>
  <div ref="containerRef" class="pcb-layout w-full h-full flex overflow-hidden">

    <!-- 圖層面板 -->
    <div
      v-if="showLayerPanel && internalLayers.length > 1"
      class="flex-shrink-0 w-40 bg-gray-950 border-r border-gray-700 flex flex-col select-none z-20"
    >
      <div class="px-2 py-1.5 text-xs text-gray-500 font-mono border-b border-gray-700 flex items-center gap-1.5">
        <span>⬛</span>
        <span>圖層 ({{ internalLayers.length }})</span>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="layer in internalLayers"
          :key="layer.id"
          class="flex items-center gap-2 px-2 py-2 cursor-pointer border-b border-gray-800/40 transition-colors"
          :class="layer.visible ? 'hover:bg-gray-800' : 'hover:bg-gray-900'"
          @click="toggleLayer(layer)"
          :title="layer.name"
        >
          <div
            class="w-3 h-3 rounded-sm border-2 flex-shrink-0"
            :style="{ backgroundColor: layer.visible ? layer.color : 'transparent', borderColor: layer.color }"
          ></div>
          <span
            class="text-xs font-mono truncate flex-1 leading-none transition-colors"
            :class="layer.visible ? 'text-gray-200' : 'text-gray-600'"
          >{{ layer.name }}</span>
        </div>
      </div>
    </div>

    <!-- 主視圖 -->
    <div class="relative flex-1 min-w-0 h-full">

      <!-- 資訊面板 -->
      <div
        v-if="showInfo && boardInfo"
        class="absolute top-3 left-3 bg-black/70 text-green-400 text-xs font-mono rounded px-3 py-2 pointer-events-none select-none leading-relaxed z-10"
      >
        <div>{{ boardInfo.units }} | {{ boardInfo.elementCount }} 個圖形</div>
        <div>{{ boardInfo.sizeText }}</div>
        <div v-if="currentZoom !== 1">縮放: {{ (currentZoom * 100).toFixed(0) }}%</div>
        <!-- 圖形類別圖例 -->
        <div class="mt-1.5 pt-1.5 border-t border-green-800/60 space-y-0.5">
          <div v-for="(entry, idx) in legendEntries" :key="idx" class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: entry.color }"></div>
            <span>{{ entry.label }}</span>
          </div>
        </div>
      </div>

      <!-- 縮放控制 -->
      <div v-if="showControls" class="absolute bottom-3 right-3 flex gap-1.5 z-10">
        <button @click="zoomIn" class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-lg transition-colors" title="放大">+</button>
        <button @click="zoomOut" class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-lg transition-colors" title="縮小">−</button>
        <button @click="resetView" class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-sm transition-colors" title="重置視角">⟳</button>
      </div>

      <!-- SVG 畫布 -->
      <svg ref="svgRef" class="w-full h-full" :style="{ background: backgroundColor }"></svg>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as d3 from 'd3'

// ===== 預設圖形類型顏色 =====
const TYPE_COLORS = {
  outline:  '#16a34a',
  trace:    '#4ecdc4',
  pad:      '#ffe66d',
  via:      '#ff6b6b',
  region:   '#00ff88',
  silk:     '#ffffff',
  component:'#c0a0ff',
}
const TYPE_LABELS = {
  outline:  '板框 (Outline)',
  trace:    '走線 (Trace)',
  pad:      '焊盤 (Pad)',
  via:      '過孔 (Via)',
  region:   '銅箔區域 (Region)',
  silk:     '絲印 (Silk)',
  component:'元件外框 (Component)',
}

// ===== Props =====
const props = defineProps({
  /**
   * PCB 資料 — 結構化 JSON
   * {
   *   board: { width, height, units? },
   *   layers?: [{ name, color?, visible?, elements: [...] }],
   *   elements?: [...],   // 若無 layers，直接給 elements
   * }
   *
   * 每個 element:
   *   { type: 'outline', path: [{x,y},...] }
   *   { type: 'trace', x1, y1, x2, y2, width? }
   *   { type: 'pad', x, y, shape: 'circle'|'rect'|'oblong', width, height?, drill? }
   *   { type: 'via', x, y, outerDia, innerDia }
   *   { type: 'region', path: [{x,y},...] }
   *   { type: 'silk', path?: [{x,y},...], text?: 'U1', x?, y?, fontSize? }
   *   { type: 'component', refDes, x, y, width, height, rotation? }
   */
  data: {
    type: Object,
    required: true,
  },
  /** 背景色 */
  backgroundColor: { type: String, default: '#1a1a2e' },
  /** 自訂顏色映射 { trace: '#xxx', pad: '#xxx', ... } */
  colorMap: { type: Object, default: () => ({}) },
  /** 是否顯示資訊面板 */
  showInfo: { type: Boolean, default: true },
  /** 是否顯示縮放按鈕 */
  showControls: { type: Boolean, default: true },
  /** 是否顯示圖層面板 */
  showLayerPanel: { type: Boolean, default: true },
  /** 是否自動響應容器 resize */
  autoResize: { type: Boolean, default: true },
  /** 邊距 */
  padding: { type: Number, default: 20 },
  /** 最大/最小縮放倍率 */
  maxZoom: { type: Number, default: 200 },
  minZoom: { type: Number, default: 0.1 },
  /** 預設走線寬度 (mm) */
  defaultTraceWidth: { type: Number, default: 0.2 },
  /** 預設焊盤大小 (mm) */
  defaultPadSize: { type: Number, default: 0.6 },
  /** 是否顯示元件 refDes 標籤 */
  showRefDes: { type: Boolean, default: true },
})

const emit = defineEmits(['loaded', 'error', 'zoom-change', 'element-click', 'element-hover'])

// ===== DOM Refs =====
const containerRef = ref(null)
const svgRef = ref(null)

// ===== 狀態 =====
const currentZoom = ref(1)
const boardInfo = ref(null)
const internalLayers = ref([])

// D3 物件
let svgSelection = null
let mainGroup = null
let zoomBehavior = null
let resizeObserver = null
let resizeTimer = null
const layerGroupMap = new Map()

// ===== 色彩工具 =====
function getColor(type) {
  return props.colorMap[type] || TYPE_COLORS[type] || '#888'
}

// ===== 取得所有 elements（快取）=====
const cachedElements = computed(() => {
  if (!props.data) return []
  if (props.data.layers?.length) {
    return props.data.layers.flatMap(l => l.elements || [])
  }
  return props.data.elements || []
})

function getAllElements() {
  return cachedElements.value
}

// ===== 圖例 =====
const legendEntries = computed(() => {
  const types = [...new Set(cachedElements.value.map(e => e.type))]
  return types
    .filter(t => TYPE_LABELS[t])
    .map(t => ({ label: TYPE_LABELS[t], color: getColor(t) }))
})

// ===== 建立內部圖層 =====
function buildLayers() {
  const defaultPalette = ['#4ecdc4', '#ffe66d', '#ff6b6b', '#00ff88', '#c0a0ff', '#ffffff', '#ff9f40']

  if (props.data?.layers?.length) {
    internalLayers.value = props.data.layers.map((l, i) => ({
      id: `layer-${i}`,
      name: l.name || `Layer ${i + 1}`,
      color: l.color || defaultPalette[i % defaultPalette.length],
      visible: l.visible !== false,
      elements: l.elements || [],
    }))
  } else if (props.data?.elements?.length) {
    // 無 layers：自動依 type 分組
    const grouped = d3.group(props.data.elements, d => d.type)
    internalLayers.value = Array.from(grouped, ([type, elements]) => ({
      id: `layer-${type}`,
      name: TYPE_LABELS[type] || type,
      color: getColor(type),
      visible: true,
      elements,
    }))
  } else {
    internalLayers.value = []
  }
}

// ===== 計算全域幾何邊界 =====
function computeBounds() {
  // 優先使用 board 尺寸
  if (props.data?.board?.width && props.data?.board?.height) {
    return { x1: 0, y1: 0, x2: props.data.board.width, y2: props.data.board.height }
  }

  const allEl = getAllElements()
  if (!allEl.length) return null

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const el of allEl) {
    if (el.type === 'outline' || el.type === 'region') {
      for (const p of (el.path || [])) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      }
    } else if (el.type === 'trace') {
      minX = Math.min(minX, el.x1, el.x2); maxX = Math.max(maxX, el.x1, el.x2)
      minY = Math.min(minY, el.y1, el.y2); maxY = Math.max(maxY, el.y1, el.y2)
    } else if (el.x != null && el.y != null) {
      const r = (el.width || el.outerDia || props.defaultPadSize) / 2
      minX = Math.min(minX, el.x - r); maxX = Math.max(maxX, el.x + r)
      minY = Math.min(minY, el.y - r); maxY = Math.max(maxY, el.y + r)
    }
    if (el.type === 'component') {
      const hw = (el.width || 0) / 2, hh = (el.height || 0) / 2
      minX = Math.min(minX, el.x - hw); maxX = Math.max(maxX, el.x + hw)
      minY = Math.min(minY, el.y - hh); maxY = Math.max(maxY, el.y + hh)
    }
  }

  if (!isFinite(minX)) return null
  return { x1: minX, y1: minY, x2: maxX, y2: maxY }
}

// ===== 渲染所有圖層 =====
function renderAll(width, height) {
  svgSelection.selectAll('*').remove()
  layerGroupMap.clear()

  const bounds = computeBounds()
  if (!bounds) return

  const { x1, y1, x2, y2 } = bounds
  const geoW = (x2 - x1) || 1
  const geoH = (y2 - y1) || 1
  const pad = props.padding

  const scale = Math.min((width - pad * 2) / geoW, (height - pad * 2) / geoH)
  const offsetX = (width - geoW * scale) / 2
  const offsetY = (height - geoH * scale) / 2

  mainGroup = svgSelection.append('g').attr('class', 'pcb-root')

  // 全域座標轉換（Y 軸翻轉，和 GerberViewer 相同）
  const worldGroup = mainGroup.append('g')
    .attr('class', 'pcb-world')
    .attr('transform',
      `translate(${offsetX},${offsetY + geoH * scale}) scale(${scale},${-scale}) translate(${-x1},${-y1})`)

  let totalElements = 0
  const units = props.data?.board?.units || 'mm'

  for (const layer of internalLayers.value) {
    const layerG = worldGroup.append('g')
      .attr('id', `pcb-${layer.id}`)
      .attr('display', layer.visible ? null : 'none')
    layerGroupMap.set(layer.id, layerG)

    renderLayerElements(layerG, layer.elements, layer.color)
    totalElements += layer.elements.length
  }

  boardInfo.value = {
    units,
    elementCount: totalElements,
    sizeText: `${geoW.toFixed(2)} × ${geoH.toFixed(2)} ${units}`,
  }

  setupZoom(svgSelection, mainGroup, width, height)
}

// ===== 渲染圖層內的元素 =====
function renderLayerElements(group, elements, _layerColor) {
  // 按照 type 渲染順序：outline → region → trace → pad → via → component → silk
  const renderOrder = ['outline', 'region', 'trace', 'pad', 'via', 'component', 'silk']

  const byType = d3.group(elements, d => d.type)

  for (const type of renderOrder) {
    const els = byType.get(type)
    if (!els?.length) continue
    const color = getColor(type)

    switch (type) {
      case 'outline': renderOutlines(group, els, color); break
      case 'region':  renderRegions(group, els, color); break
      case 'trace':   renderTraces(group, els, color); break
      case 'pad':     renderPads(group, els, color); break
      case 'via':     renderVias(group, els, color); break
      case 'component': renderComponents(group, els, color); break
      case 'silk':    renderSilks(group, els, color); break
    }
  }
}

// ===== 各類型渲染函數 =====

/** 板框 */
function renderOutlines(group, elements, color) {
  for (const el of elements) {
    if (!el.path?.length) continue
    const d = pathToD(el.path, true)
    group.append('path')
      .datum(el)
      .attr('d', d)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', el.width || 0.15)
      .attr('stroke-linejoin', 'round')
      .style('cursor', 'pointer')
      .on('mouseenter', handleHover)
      .on('mouseleave', handleLeave)
      .on('click', handleClick)
  }
}

/** 銅箔區域 */
function renderRegions(group, elements, color) {
  for (const el of elements) {
    if (!el.path?.length) continue
    const d = pathToD(el.path, true)
    group.append('path')
      .datum(el)
      .attr('d', d)
      .attr('fill', color)
      .attr('fill-opacity', 0.6)
      .attr('stroke', color)
      .attr('stroke-width', 0.05)
      .style('cursor', 'pointer')
      .on('mouseenter', handleHover)
      .on('mouseleave', handleLeave)
      .on('click', handleClick)
  }
}

/** 走線 */
function renderTraces(group, elements, color) {
  group.selectAll(null).data(elements).join('line')
    .attr('x1', d => d.x1)
    .attr('y1', d => d.y1)
    .attr('x2', d => d.x2)
    .attr('y2', d => d.y2)
    .attr('stroke', color)
    .attr('stroke-width', d => d.width || props.defaultTraceWidth)
    .attr('stroke-linecap', 'round')
    .style('cursor', 'pointer')
    .on('mouseenter', handleHover)
    .on('mouseleave', handleLeave)
    .on('click', handleClick)
}

/** 焊盤 — 依 shape 分組批次渲染 */
function renderPads(group, elements, color) {
  const byShape = d3.group(elements, d => d.shape || 'circle')

  // circle pads
  const circles = byShape.get('circle') || []
  if (circles.length) {
    group.selectAll(null).data(circles).join('circle')
      .attr('cx', d => d.x).attr('cy', d => d.y)
      .attr('r', d => (d.width || props.defaultPadSize) / 2)
      .attr('fill', color)
      .style('cursor', 'pointer')
      .on('mouseenter', handleHover)
      .on('mouseleave', handleLeave)
      .on('click', handleClick)
  }

  // rect pads
  const rects = byShape.get('rect') || []
  if (rects.length) {
    group.selectAll(null).data(rects).join('rect')
      .attr('x', d => d.x - (d.width || props.defaultPadSize) / 2)
      .attr('y', d => d.y - (d.height || d.width || props.defaultPadSize) / 2)
      .attr('width', d => d.width || props.defaultPadSize)
      .attr('height', d => d.height || d.width || props.defaultPadSize)
      .attr('fill', color)
      .style('cursor', 'pointer')
      .on('mouseenter', handleHover)
      .on('mouseleave', handleLeave)
      .on('click', handleClick)
  }

  // oblong pads
  const oblongs = byShape.get('oblong') || []
  if (oblongs.length) {
    group.selectAll(null).data(oblongs).join('rect')
      .attr('x', d => d.x - (d.width || props.defaultPadSize) / 2)
      .attr('y', d => d.y - (d.height || d.width || props.defaultPadSize) / 2)
      .attr('width', d => d.width || props.defaultPadSize)
      .attr('height', d => d.height || d.width || props.defaultPadSize)
      .attr('rx', d => Math.min(d.width || props.defaultPadSize, d.height || d.width || props.defaultPadSize) / 2)
      .attr('ry', d => Math.min(d.width || props.defaultPadSize, d.height || d.width || props.defaultPadSize) / 2)
      .attr('fill', color)
      .style('cursor', 'pointer')
      .on('mouseenter', handleHover)
      .on('mouseleave', handleLeave)
      .on('click', handleClick)
  }

  // 鑽孔 — 批次渲染
  const drilled = elements.filter(d => d.drill)
  if (drilled.length) {
    group.selectAll(null).data(drilled).join('circle')
      .attr('cx', d => d.x).attr('cy', d => d.y)
      .attr('r', d => d.drill / 2)
      .attr('fill', props.backgroundColor)
  }
}

/** 過孔 — 批次渲染 */
function renderVias(group, elements, color) {
  // 外圈
  group.selectAll(null).data(elements).join('circle')
    .attr('cx', d => d.x).attr('cy', d => d.y)
    .attr('r', d => (d.outerDia || 0.6) / 2)
    .attr('fill', color)
    .style('cursor', 'pointer')
    .on('mouseenter', handleHover)
    .on('mouseleave', handleLeave)
    .on('click', handleClick)
  // 內孔
  group.selectAll(null).data(elements).join('circle')
    .attr('cx', d => d.x).attr('cy', d => d.y)
    .attr('r', d => (d.innerDia || 0.3) / 2)
    .attr('fill', props.backgroundColor)
}

/** 元件外框 — 批次渲染 */
function renderComponents(group, elements, color) {
  const groups = group.selectAll(null).data(elements).join('g')
    .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotation || 0})`)
    .style('cursor', 'pointer')
    .on('mouseenter', handleHover)
    .on('mouseleave', handleLeave)
    .on('click', handleClick)

  // 外框
  groups.append('rect')
    .attr('x', d => -(d.width || 2) / 2).attr('y', d => -(d.height || 1) / 2)
    .attr('width', d => d.width || 2).attr('height', d => d.height || 1)
    .attr('rx', 0.1).attr('ry', 0.1)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 0.1)
    .attr('stroke-dasharray', '0.3,0.15')

  // Pin 1 標記
  groups.append('circle')
    .attr('cx', d => -(d.width || 2) / 2 + 0.2)
    .attr('cy', d => -(d.height || 1) / 2 + 0.2)
    .attr('r', 0.08)
    .attr('fill', color)

  // refDes 標籤（翻轉 Y 因為 SVG 座標已翻轉）
  if (props.showRefDes) {
    groups.filter(d => d.refDes)
      .append('text')
      .attr('x', 0).attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('transform', 'scale(1,-1)')
      .style('font-size', d => `${Math.min(d.width || 2, d.height || 1) * 0.3}px`)
      .style('fill', color)
      .style('font-family', 'monospace')
      .style('pointer-events', 'none')
      .text(d => d.refDes)
  }
}

/** 絲印圖形/文字 — 批次渲染 */
function renderSilks(group, elements, color) {
  // 絲印線條
  const pathEls = elements.filter(d => d.path?.length)
  if (pathEls.length) {
    group.selectAll(null).data(pathEls).join('path')
      .attr('d', d => pathToD(d.path, false))
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', d => d.width || 0.1)
      .attr('stroke-linecap', 'round')
      .style('cursor', 'pointer')
      .on('mouseenter', handleHover)
      .on('mouseleave', handleLeave)
      .on('click', handleClick)
  }

  // 絲印文字
  const textEls = elements.filter(d => d.text && d.x != null && d.y != null)
  if (textEls.length) {
    group.selectAll(null).data(textEls).join('text')
      .attr('x', d => d.x).attr('y', d => d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('transform', d => `translate(${d.x},${d.y}) scale(1,-1) translate(${-d.x},${-d.y})`)
      .style('font-size', d => `${d.fontSize || 0.8}px`)
      .style('fill', color)
      .style('font-family', 'monospace')
      .style('pointer-events', 'none')
      .text(d => d.text)
  }
}

// ===== 工具函數 =====

function pathToD(points, closed) {
  if (!points?.length) return ''
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += `L${points[i].x},${points[i].y}`
  }
  if (closed) d += 'Z'
  return d
}

// ===== 互動事件 =====
function handleHover(event, d) {
  d3.select(this).style('opacity', 0.7)
  emit('element-hover', { event, data: d })
}

function handleLeave() {
  d3.select(this).style('opacity', null)
  emit('element-hover', null)
}

function handleClick(event, d) {
  emit('element-click', { event, data: d })
}

// ===== 圖層切換 =====
function toggleLayer(layer) {
  layer.visible = !layer.visible
  const layerG = layerGroupMap.get(layer.id)
  if (layerG) layerG.attr('display', layer.visible ? null : 'none')
}

// ===== Zoom =====
function setupZoom(svg, group, _width, _height) {
  zoomBehavior = d3.zoom()
    .scaleExtent([props.minZoom, props.maxZoom])
    .on('zoom', (event) => {
      group.attr('transform', event.transform)
      currentZoom.value = event.transform.k
      emit('zoom-change', { zoom: event.transform.k })
    })

  svg.call(zoomBehavior).on('dblclick.zoom', () => resetView())
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

// ===== 主渲染流程 =====
async function renderChart() {
  if (!containerRef.value || !svgRef.value || !props.data) return

  buildLayers()

  await nextTick()
  const { width, height } = containerRef.value.getBoundingClientRect()
  if (width <= 0 || height <= 0) return

  svgSelection = d3.select(svgRef.value).attr('width', width).attr('height', height)
  renderAll(width, height)

  emit('loaded', {
    info: boardInfo.value,
    layerCount: internalLayers.value.length,
  })
}

function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(async () => {
    if (!containerRef.value || !svgRef.value) return
    const { width, height } = containerRef.value.getBoundingClientRect()
    if (width <= 0 || height <= 0) return
    svgSelection = d3.select(svgRef.value).attr('width', width).attr('height', height)
    renderAll(width, height)
    currentZoom.value = 1
  }, 200)
}

// ===== 生命週期 =====
onMounted(() => {
  if (props.autoResize && containerRef.value) {
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.value)
  }
  renderChart()
})

onBeforeUnmount(() => {
  clearTimeout(resizeTimer)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (svgSelection) svgSelection.on('.zoom', null)
})

watch(() => props.data, () => renderChart())
watch(() => props.backgroundColor, () => renderChart())

defineExpose({ zoomIn, zoomOut, resetView, toggleLayer, forceRender: renderChart })
</script>

<style scoped>
.pcb-layout {
  user-select: none;
}
.pcb-layout svg {
  cursor: grab;
  display: block;
}
.pcb-layout svg:active {
  cursor: grabbing;
}
</style>
