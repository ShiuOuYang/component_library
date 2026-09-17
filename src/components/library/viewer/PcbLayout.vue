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
        <button type="button" @click="zoomIn" class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-lg transition-colors" title="放大">+</button>
        <button type="button" @click="zoomOut" class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-lg transition-colors" title="縮小">−</button>
        <button type="button" @click="resetView" class="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded flex items-center justify-center text-sm transition-colors" title="重置視角">⟳</button>
      </div>

      <!-- SVG 畫布 -->
      <svg ref="svgRef" class="w-full h-full" :style="{ background: backgroundColor }"></svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import type {
  PcbComponent,
  PcbData,
  PcbElement,
  PcbElementType,
  PcbOutline,
  PcbPad,
  PcbRegion,
  PcbSilk,
  PcbTrace,
  PcbVia,
} from './pcb/pcb.types'
import {
  DEFAULT_VIA_OUTER,
  collectElements,
  computeBounds,
  pathToD,
} from './pcb/pcbGeometry'
import {
  RENDER_ORDER,
  TYPE_COLORS,
  TYPE_LABELS,
  defaultLayerColor,
  isKnownType,
} from './pcb/typeColors'
import { fitToViewport } from './shared/viewportFit'

// ===== Props =====
interface PcbLayoutProps {
  /**
   * PCB 資料 — 結構化 JSON。
   * 有 layers 時依圖層分組，否則直接吃 elements 並依 type 自動分層。
   * 各元素的欄位定義見 pcb/pcb.types.ts。
   */
  data: PcbData
  /** 背景色 */
  backgroundColor?: string
  /** 自訂顏色映射，例如 { trace: '#xxx', pad: '#xxx' } */
  colorMap?: Partial<Record<PcbElementType, string>>
  /** 是否顯示資訊面板 */
  showInfo?: boolean
  /** 是否顯示縮放按鈕 */
  showControls?: boolean
  /** 是否顯示圖層面板 */
  showLayerPanel?: boolean
  /** 是否自動響應容器 resize */
  autoResize?: boolean
  /** 邊距 (px) */
  padding?: number
  /** 最大縮放倍率 */
  maxZoom?: number
  /** 最小縮放倍率 */
  minZoom?: number
  /** 預設走線寬度 (mm) */
  defaultTraceWidth?: number
  /** 預設焊盤大小 (mm) */
  defaultPadSize?: number
  /** 是否顯示元件 refDes 標籤 */
  showRefDes?: boolean
}

const props = withDefaults(defineProps<PcbLayoutProps>(), {
  backgroundColor: '#1a1a2e',
  colorMap: () => ({}),
  showInfo: true,
  showControls: true,
  showLayerPanel: true,
  autoResize: true,
  padding: 20,
  maxZoom: 200,
  minZoom: 0.1,
  defaultTraceWidth: 0.2,
  defaultPadSize: 0.6,
  showRefDes: true,
})

/** 載入完成後回報的板子資訊 */
export interface PcbBoardInfo {
  units: string
  elementCount: number
  sizeText: string
}

/** 互動事件的載荷 */
export interface PcbElementEvent {
  event: MouseEvent
  data: PcbElement
}

const emit = defineEmits<{
  loaded: [payload: { info: PcbBoardInfo | null; layerCount: number }]
  error: [payload: { message: string }]
  'zoom-change': [payload: { zoom: number }]
  'element-click': [payload: PcbElementEvent]
  /** 離開元素時發 null */
  'element-hover': [payload: PcbElementEvent | null]
}>()

// ===== DOM Refs =====
const containerRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)

// ===== 狀態 =====

/** 元件內部持有的圖層 */
interface PcbViewerLayer {
  id: string
  name: string
  color: string
  visible: boolean
  elements: PcbElement[]
}

const currentZoom = ref(1)
const boardInfo = ref<PcbBoardInfo | null>(null)
const internalLayers = ref<PcbViewerLayer[]>([])

// D3 物件（非響應式）
type SvgSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>
type GroupSelection = d3.Selection<SVGGElement, unknown, null, undefined>

let svgSelection: SvgSelection | null = null
let mainGroup: GroupSelection | null = null
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
const layerGroupMap = new Map<string, GroupSelection>()

// ===== 色彩工具 =====
function getColor(type: PcbElementType): string {
  return props.colorMap[type] || TYPE_COLORS[type] || '#888'
}

/** 統一取出錯誤訊息（catch 到的東西不保證是 Error） */
function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// ===== 取得所有 elements（快取）=====
const cachedElements = computed(() => collectElements(props.data))

// ===== 圖例 =====
const legendEntries = computed(() => {
  const types = [...new Set(cachedElements.value.map((e) => e.type))]
  return types
    .filter(isKnownType)
    .map((t) => ({ label: TYPE_LABELS[t], color: getColor(t) }))
})

// ===== 建立內部圖層 =====
function buildLayers(): void {
  if (props.data?.layers?.length) {
    internalLayers.value = props.data.layers.map((l, i) => ({
      id: `layer-${i}`,
      name: l.name || `Layer ${i + 1}`,
      color: l.color || defaultLayerColor(i),
      visible: l.visible !== false,
      elements: l.elements ?? [],
    }))
  } else if (props.data?.elements?.length) {
    // 無 layers：自動依 type 分組
    const grouped = d3.group(props.data.elements, (d) => d.type)
    internalLayers.value = Array.from(grouped, ([type, elements]) => ({
      id: `layer-${type}`,
      name: isKnownType(type) ? TYPE_LABELS[type] : type,
      color: getColor(type),
      visible: true,
      elements,
    }))
  } else {
    internalLayers.value = []
  }
}

// ===== 渲染所有圖層 =====
function renderAll(width: number, height: number): void {
  if (!svgSelection) return

  svgSelection.selectAll('*').remove()
  layerGroupMap.clear()

  const bounds = computeBounds(props.data, { defaultPadSize: props.defaultPadSize })
  if (!bounds) return

  // 視窗適配的算式與 GerberViewer 共用（含 Y 軸翻轉）
  const fit = fitToViewport(bounds, width, height, props.padding)

  mainGroup = svgSelection.append('g').attr('class', 'pcb-root')

  const worldGroup = mainGroup.append('g')
    .attr('class', 'pcb-world')
    .attr('transform', fit.transform)

  let totalElements = 0
  const units = props.data?.board?.units || 'mm'

  for (const layer of internalLayers.value) {
    const layerG = worldGroup.append('g')
      .attr('id', `pcb-${layer.id}`)
      .attr('display', layer.visible ? null : 'none')
    layerGroupMap.set(layer.id, layerG)

    renderLayerElements(layerG, layer.elements)
    totalElements += layer.elements.length
  }

  boardInfo.value = {
    units,
    elementCount: totalElements,
    sizeText: `${fit.geoWidth.toFixed(2)} × ${fit.geoHeight.toFixed(2)} ${units}`,
  }

  setupZoom(svgSelection, mainGroup)
}

// ===== 渲染圖層內的元素 =====
function renderLayerElements(group: GroupSelection, elements: PcbElement[]): void {
  // 依 RENDER_ORDER 繪製：先鋪底、再疊細節，最後才是文字
  const byType = d3.group(elements, (d) => d.type)

  for (const type of RENDER_ORDER) {
    const els = byType.get(type)
    if (!els?.length) continue
    const color = getColor(type)

    switch (type) {
      case 'outline':
        renderOutlines(group, els as PcbOutline[], color)
        break
      case 'region':
        renderRegions(group, els as PcbRegion[], color)
        break
      case 'trace':
        renderTraces(group, els as PcbTrace[], color)
        break
      case 'pad':
        renderPads(group, els as PcbPad[], color)
        break
      case 'via':
        renderVias(group, els as PcbVia[], color)
        break
      case 'component':
        renderComponents(group, els as PcbComponent[], color)
        break
      case 'silk':
        renderSilks(group, els as PcbSilk[], color)
        break
    }
  }
}

// ===== 各類型渲染函數 =====

/** 板框 */
function renderOutlines(group: GroupSelection, elements: PcbOutline[], color: string): void {
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
function renderRegions(group: GroupSelection, elements: PcbRegion[], color: string): void {
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
function renderTraces(group: GroupSelection, elements: PcbTrace[], color: string): void {
  group.selectAll(null).data(elements).join('line')
    .attr('x1', (d) => d.x1)
    .attr('y1', (d) => d.y1)
    .attr('x2', (d) => d.x2)
    .attr('y2', (d) => d.y2)
    .attr('stroke', color)
    .attr('stroke-width', (d) => d.width || props.defaultTraceWidth)
    .attr('stroke-linecap', 'round')
    .style('cursor', 'pointer')
    .on('mouseenter', handleHover)
    .on('mouseleave', handleLeave)
    .on('click', handleClick)
}

/** 焊盤 — 依 shape 分組批次渲染 */
function renderPads(group: GroupSelection, elements: PcbPad[], color: string): void {
  const byShape = d3.group(elements, (d) => d.shape || 'circle')

  /** 焊盤寬；沒給就用預設值 */
  const padWidth = (d: PcbPad): number => d.width || props.defaultPadSize
  /** 焊盤高；沒給就沿用寬（正方形／正圓） */
  const padHeight = (d: PcbPad): number => d.height || d.width || props.defaultPadSize

  // 圓形焊盤
  const circles = byShape.get('circle') ?? []
  if (circles.length) {
    group.selectAll(null).data(circles).join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => padWidth(d) / 2)
      .attr('fill', color)
      .style('cursor', 'pointer')
      .on('mouseenter', handleHover)
      .on('mouseleave', handleLeave)
      .on('click', handleClick)
  }

  // 矩形與長圓形焊盤：只差圓角半徑，共用同一段繪製
  for (const shape of ['rect', 'oblong'] as const) {
    const pads = byShape.get(shape) ?? []
    if (!pads.length) continue

    const cornerRadius = (d: PcbPad): number =>
      shape === 'oblong' ? Math.min(padWidth(d), padHeight(d)) / 2 : 0

    group.selectAll(null).data(pads).join('rect')
      .attr('x', (d) => d.x - padWidth(d) / 2)
      .attr('y', (d) => d.y - padHeight(d) / 2)
      .attr('width', padWidth)
      .attr('height', padHeight)
      .attr('rx', cornerRadius)
      .attr('ry', cornerRadius)
      .attr('fill', color)
      .style('cursor', 'pointer')
      .on('mouseenter', handleHover)
      .on('mouseleave', handleLeave)
      .on('click', handleClick)
  }

  // 鑽孔：用背景色蓋一個圓，做出「挖穿」的效果
  const drilled = elements.filter((d): d is PcbPad & { drill: number } => !!d.drill)
  if (drilled.length) {
    group.selectAll(null).data(drilled).join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.drill / 2)
      .attr('fill', props.backgroundColor)
  }
}

/** 過孔 — 批次渲染 */
function renderVias(group: GroupSelection, elements: PcbVia[], color: string): void {
  // 外圈
  group.selectAll(null).data(elements).join('circle')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', (d) => (d.outerDia || DEFAULT_VIA_OUTER) / 2)
    .attr('fill', color)
    .style('cursor', 'pointer')
    .on('mouseenter', handleHover)
    .on('mouseleave', handleLeave)
    .on('click', handleClick)
  // 內孔
  group.selectAll(null).data(elements).join('circle')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', (d) => (d.innerDia || 0.3) / 2)
    .attr('fill', props.backgroundColor)
}

/** 元件外框 — 批次渲染 */
function renderComponents(group: GroupSelection, elements: PcbComponent[], color: string): void {
  const groups = group.selectAll(null).data(elements).join('g')
    .attr('transform', (d) => `translate(${d.x},${d.y}) rotate(${d.rotation || 0})`)
    .style('cursor', 'pointer')
    .on('mouseenter', handleHover)
    .on('mouseleave', handleLeave)
    .on('click', handleClick)

  // 外框
  groups.append('rect')
    .attr('x', (d) => -(d.width || 2) / 2)
    .attr('y', (d) => -(d.height || 1) / 2)
    .attr('width', (d) => d.width || 2)
    .attr('height', (d) => d.height || 1)
    .attr('rx', 0.1).attr('ry', 0.1)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 0.1)
    .attr('stroke-dasharray', '0.3,0.15')

  // Pin 1 標記
  groups.append('circle')
    .attr('cx', (d) => -(d.width || 2) / 2 + 0.2)
    .attr('cy', (d) => -(d.height || 1) / 2 + 0.2)
    .attr('r', 0.08)
    .attr('fill', color)

  // refDes 標籤（翻轉 Y 因為 SVG 座標已翻轉）
  if (props.showRefDes) {
    groups.filter((d) => !!d.refDes)
      .append('text')
      .attr('x', 0).attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('transform', 'scale(1,-1)')
      .style('font-size', (d) => `${Math.min(d.width || 2, d.height || 1) * 0.3}px`)
      .style('fill', color)
      .style('font-family', 'monospace')
      .style('pointer-events', 'none')
      .text((d) => d.refDes ?? '')
  }
}

/** 絲印圖形/文字 — 批次渲染 */
function renderSilks(group: GroupSelection, elements: PcbSilk[], color: string): void {
  // 絲印線條
  const pathEls = elements.filter((d) => d.path?.length)
  if (pathEls.length) {
    group.selectAll(null).data(pathEls).join('path')
      .attr('d', (d) => pathToD(d.path, false))
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', (d) => d.width || 0.1)
      .attr('stroke-linecap', 'round')
      .style('cursor', 'pointer')
      .on('mouseenter', handleHover)
      .on('mouseleave', handleLeave)
      .on('click', handleClick)
  }

  // 絲印文字
  const textEls = elements.filter(
    (d): d is PcbSilk & { text: string; x: number; y: number } =>
      !!d.text && d.x != null && d.y != null
  )
  if (textEls.length) {
    group.selectAll(null).data(textEls).join('text')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      // 全域 transform 已翻轉 Y，文字要再翻回來才不會上下顛倒
      .attr('transform', (d) => `translate(${d.x},${d.y}) scale(1,-1) translate(${-d.x},${-d.y})`)
      .style('font-size', (d) => `${d.fontSize || 0.8}px`)
      .style('fill', color)
      .style('font-family', 'monospace')
      .style('pointer-events', 'none')
      .text((d) => d.text)
  }
}

// ===== 互動事件 =====
// this 是被指到的節點。用 selectAll(null).data().join() 建出來的選取，
// 其元素型別是 `XxxElement | null`，因此 this 也要容許 null。
function handleHover(this: SVGElement | null, event: MouseEvent, d: PcbElement): void {
  if (this) d3.select(this).style('opacity', 0.7)
  emit('element-hover', { event, data: d })
}

function handleLeave(this: SVGElement | null): void {
  if (this) d3.select(this).style('opacity', null)
  emit('element-hover', null)
}

function handleClick(event: MouseEvent, d: PcbElement): void {
  emit('element-click', { event, data: d })
}

// ===== 圖層切換 =====
function toggleLayer(layer: PcbViewerLayer): void {
  layer.visible = !layer.visible
  const layerG = layerGroupMap.get(layer.id)
  if (layerG) layerG.attr('display', layer.visible ? null : 'none')
}

// ===== Zoom =====
function setupZoom(svg: SvgSelection, group: GroupSelection): void {
  zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([props.minZoom, props.maxZoom])
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      group.attr('transform', event.transform.toString())
      currentZoom.value = event.transform.k
      emit('zoom-change', { zoom: event.transform.k })
    })

  svg.call(zoomBehavior).on('dblclick.zoom', () => resetView())
}

function zoomIn(): void {
  if (!svgSelection || !zoomBehavior) return
  svgSelection.transition().duration(300).call(zoomBehavior.scaleBy, 1.5)
}

function zoomOut(): void {
  if (!svgSelection || !zoomBehavior) return
  svgSelection.transition().duration(300).call(zoomBehavior.scaleBy, 0.67)
}

function resetView(): void {
  if (!svgSelection || !zoomBehavior) return
  svgSelection.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity)
  currentZoom.value = 1
}

// ===== 主渲染流程 =====
async function renderChart(): Promise<void> {
  if (!containerRef.value || !svgRef.value || !props.data) return

  // error 事件原本沒有任何地方會發出（渲染沒有包 try/catch，例外直接
  // 逸出到 Vue 的錯誤處理）；補上之後這個宣告的事件才真的可用。
  try {
    buildLayers()

    await nextTick()
    if (!containerRef.value || !svgRef.value) return
    const { width, height } = containerRef.value.getBoundingClientRect()
    if (width <= 0 || height <= 0) return

    svgSelection = d3.select(svgRef.value).attr('width', width).attr('height', height)
    renderAll(width, height)

    emit('loaded', {
      info: boardInfo.value,
      layerCount: internalLayers.value.length,
    })
  } catch (e) {
    console.error('PcbLayout 渲染失敗:', e)
    emit('error', { message: toMessage(e) })
  }
}

function handleResize(): void {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    if (!containerRef.value || !svgRef.value) return
    const { width, height } = containerRef.value.getBoundingClientRect()
    if (width <= 0 || height <= 0) return

    svgSelection = d3.select(svgRef.value).attr('width', width).attr('height', height)
    renderAll(width, height)
    // 重畫會重建 zoom behavior，縮放倍率也跟著回到 1
    currentZoom.value = 1
  }, 200)
}

// ===== 生命週期 =====
onMounted(() => {
  if (props.autoResize && containerRef.value) {
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.value)
  }
  void renderChart()
})

onBeforeUnmount(() => {
  if (resizeTimer) clearTimeout(resizeTimer)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (svgSelection) svgSelection.on('.zoom', null)
})

watch(() => props.data, () => void renderChart())
watch(() => props.backgroundColor, () => void renderChart())

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
