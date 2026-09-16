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
            <div v-for="item in BEHAVIOR_LEGEND" :key="item.type" class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: item.color }"></div>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- 縮放控制 -->
      <div v-if="showControls" class="absolute bottom-3 right-3 flex gap-1.5">
        <!-- D02 移動軌跡切換（hasManualParsedLayers 時才顯示）-->
        <button
          v-if="hasMovePathSupport"
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

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, markRaw } from 'vue'
import * as d3 from 'd3'
import type { ImageGraphic, ImageTree, Shape } from '@tracespace/plotter'
import type {
  Aperture,
  GerberBehavior,
  GerberUnits,
  ParsedExcellon,
  ParsedGerber,
  ParsedLayer,
  FlashCommand,
  MoveCommand,
} from './gerber/gerber.types'
import { isParsedExcellon } from './gerber/gerber.types'
import {
  declaresCoordinateFormat,
  extractMovePaths,
  parseGerber,
} from './gerber/parseGerber'
import { isExcellon, parseExcellon } from './gerber/parseExcellon'
import { computeBounds, fitToViewport, segmentsToPath } from './gerber/gerberGeometry'
import {
  BEHAVIOR_COLORS,
  BEHAVIOR_LABELS,
  BEHAVIOR_LEGEND,
  defaultLayerColor,
} from './gerber/behaviorColors'

// ===== Props =====

/** 外部傳入的圖層定義 */
export interface GerberLayerInput {
  src?: string
  gerberText?: string
  name?: string
  color?: string
  visible?: boolean
}

interface GerberViewerProps {
  /** 單一 Gerber URL（向下相容） */
  src?: string
  /** 單一 Gerber 原始文字（向下相容） */
  gerberText?: string
  /** 單一模式填充色（向下相容） */
  fillColor?: string
  /** 多圖層定義（優先於 src / gerberText） */
  layers?: GerberLayerInput[]
  /** 背景色 */
  backgroundColor?: string
  /** 是否顯示資訊面板 */
  showInfo?: boolean
  /** 是否顯示縮放按鈕 */
  showControls?: boolean
  /** 是否顯示圖層面板（多圖層時自動啟用） */
  showLayerPanel?: boolean
  /** 是否自動響應容器 resize */
  autoResize?: boolean
  /** 邊距 (px) */
  padding?: number
  /** 最大縮放倍率 */
  maxZoom?: number
  /** 最小縮放倍率 */
  minZoom?: number
  /** 是否顯示 D02 移動軌跡（EDA 工具路徑分析用） */
  showMovePath?: boolean
}

const props = withDefaults(defineProps<GerberViewerProps>(), {
  src: '',
  gerberText: '',
  fillColor: '#00ff88',
  layers: () => [],
  backgroundColor: '#1a1a2e',
  showInfo: true,
  showControls: true,
  showLayerPanel: true,
  autoResize: true,
  padding: 20,
  maxZoom: 200,
  minZoom: 0.1,
  showMovePath: false,
})

/** 載入完成後回報的圖形資訊 */
export interface GerberImageInfo {
  units: GerberUnits
  shapeCount: number
  sizeText: string
}

const emit = defineEmits<{
  loaded: [payload: { info: GerberImageInfo | null; layerCount: number; successCount: number }]
  error: [payload: { message: string }]
  'zoom-change': [payload: { zoom: number }]
}>()

// ===== 內部圖層狀態 =====

/**
 * 檢視器持有的圖層物件。
 *
 * imageTree / parsed 的內容量可達數萬個節點，而元件只需要「有沒有」與
 * 「拿去畫」，不需要深層響應式，因此指派時一律 markRaw，避免 Vue
 * 為整棵樹建 Proxy。
 */
interface ViewerLayer {
  id: string
  src: string
  gerberText: string
  name: string
  color: string
  visible: boolean
  loading: boolean
  error: string | null
  imageTree: ImageTree | null
  parsed: ParsedLayer | null
  /** 載入到的原始檔內容；D02 軌跡要用它再掃一次 */
  source: string
  /** D02 軌跡，第一次要顯示時才算（null = 還沒算過） */
  movePaths: MoveCommand[] | null
}

const containerRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)

// ===== 狀態 =====
const globalLoading = ref(false)
const loadingMessage = ref('載入中...')
const fatalError = ref<string | null>(null)
const currentZoom = ref(1)
const imageInfo = ref<GerberImageInfo | null>(null)
/** 內部圖層物件陣列（響應式） */
const activeLayers = ref<ViewerLayer[]>([])

// D3 物件（非響應式）
type SvgSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>
type GroupSelection = d3.Selection<SVGGElement, unknown, null, undefined>

let svgSelection: SvgSelection | null = null
let mainGroup: GroupSelection | null = null
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
/** layer.id → D3 Selection 對映 */
const layerGroupMap = new Map<string, d3.Selection<SVGGElement, unknown, null, undefined>>()

/** D02 移動軌跡顯示開關（可由 UI 按鈕切換，初始值由 prop 決定）*/
const showMovePathState = ref(false)

/** 是否有手動解析（非 tracespace）的圖層，用於顯示行為圖例 */
const hasManualParsedLayers = computed(() => activeLayers.value.some((l) => l.parsed))

/** 取得圖層實際包含的行為類型列表（供圖層面板色塊顯示） */
function layerBehaviorTypes(layer: ViewerLayer): GerberBehavior[] {
  const parsed = layer.parsed
  if (!parsed) return []

  const types = isParsedExcellon(parsed)
    ? parsed.commands.map((c) => c.type)
    // 移動軌跡不代表圖層內容，不列進色塊
    : parsed.commands.filter((c) => c.type !== 'move').map((c) => c.type)

  return [...new Set<GerberBehavior>(types)].filter((t) => t in BEHAVIOR_COLORS)
}

/**
 * 有沒有圖層可能含 D02 軌跡（Gerber 檔才有，Excellon 沒有提筆移動的概念）。
 * D02 切換按鈕依此決定要不要出現。
 */
const hasMovePathSupport = computed(() =>
  activeLayers.value.some((l) => {
    if (!l.source) return false
    return !l.parsed || !isParsedExcellon(l.parsed)
  })
)

/**
 * 補上還沒算過的 D02 軌跡。
 *
 * 手動解析的圖層可以直接從既有指令挑出來；走 tracespace 的圖層則要再掃一次
 * 原始檔（ImageTree 不保留提筆移動）。兩者都只在第一次需要時算，算完存起來。
 */
function ensureMovePaths(): void {
  for (const layer of activeLayers.value) {
    if (layer.movePaths !== null || !layer.source) continue

    if (layer.parsed && !isParsedExcellon(layer.parsed)) {
      layer.movePaths = markRaw(
        layer.parsed.commands.filter((c): c is MoveCommand => c.type === 'move')
      )
    } else if (layer.imageTree) {
      layer.movePaths = markRaw(extractMovePaths(layer.source))
    } else {
      layer.movePaths = markRaw([])
    }
  }
}

// ===== 建立內部圖層陣列 =====

/** 從 URL 取檔名當圖層名稱 */
function layerNameFromSrc(src: string): string {
  return src.split('/').pop()?.split('?')[0] || 'Gerber'
}

function buildActiveLayers(): void {
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
      source: '',
      movePaths: null,
    }))
  } else if (props.src || props.gerberText) {
    activeLayers.value = [
      {
        id: 'layer-0',
        src: props.src,
        gerberText: props.gerberText,
        name: props.src ? layerNameFromSrc(props.src) : 'Gerber',
        color: props.fillColor,
        visible: true,
        loading: false,
        error: null,
        imageTree: null,
        parsed: null,
        source: '',
        movePaths: null,
      },
    ]
  } else {
    activeLayers.value = []
  }
}

// ===== tracespace 解析（優先嘗試）=====

/**
 * 用 tracespace 解析，失敗則回傳 null 讓呼叫端回退手動解析。
 *
 * 動態 import：tracespace 只有真的要看 Gerber 時才需要載入。
 *
 * ⚠️ package.json 原本把 parser 開成 "^5.0.0-next.0"，但 plotter 依賴的是
 *    精確的 5.0.0-alpha.0：npm 於是裝了兩份，頂層的 next.0 已經移除
 *    parse()，所以 parse 永遠是 undefined，一呼叫就拋 TypeError 被 catch
 *    吃掉 —— 每個 Gerber 檔都默默走回退的手動解析，tracespace 從來沒跑過。
 *    已把版本對齊成 5.0.0-alpha.0（與 plotter 相同，兩份合為一份）。
 */
async function parseWithTracespace(text: string): Promise<ImageTree | null> {
  try {
    const { parse } = await import('@tracespace/parser')
    const { plot } = await import('@tracespace/plotter')
    return plot(parse(text))
  } catch (e) {
    console.warn('tracespace 解析失敗，回退手動解析:', toMessage(e))
    return null
  }
}

/** 統一取出錯誤訊息（catch 到的東西不保證是 Error） */
function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// ===== 載入單一圖層 =====
async function loadLayer(layer: ViewerLayer): Promise<void> {
  layer.loading = true
  layer.error = null
  layer.imageTree = null
  layer.parsed = null
  layer.source = ''
  layer.movePaths = null

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

    layer.source = text

    // Excellon 鑽孔檔直接走專用解析器，不走 tracespace
    if (isExcellon(text)) {
      layer.parsed = markRaw(parseExcellon(text))
    } else {
      // 沒自帶座標格式的檔案不能交給 tracespace
      // （原因見 declaresCoordinateFormat 的說明：plotter 會殘留狀態）
      const imageTree = declaresCoordinateFormat(text) ? await parseWithTracespace(text) : null
      // tracespace 有時回傳空的 size（沒解析出內容），這種情況改走手動解析
      if (imageTree && Array.isArray(imageTree.size) && imageTree.size.length === 4) {
        layer.imageTree = markRaw(imageTree)
      } else {
        layer.parsed = markRaw(parseGerber(text))
      }
    }
  } catch (e) {
    layer.error = toMessage(e)
    console.warn(`圖層 "${layer.name}" 載入失敗:`, e)
  } finally {
    layer.loading = false
  }
}

// ===== 渲染所有圖層 =====
function renderAllLayers(width: number, height: number): void {
  if (!svgSelection) return

  svgSelection.selectAll('*').remove()
  layerGroupMap.clear()

  // 顯示軌跡前先把它算出來，邊界才算得到（懶算：不顯示就不花這個成本）
  if (showMovePathState.value) ensureMovePaths()

  // 邊界要跟「實際畫出來的東西」一致：D02 軌跡沒顯示就不該撐開畫面
  const bounds = computeBounds(activeLayers.value, {
    includeMovePaths: showMovePathState.value,
  })
  if (!bounds) {
    fatalError.value = '無有效 Gerber 座標資料'
    return
  }

  const fit = fitToViewport(bounds, width, height, props.padding)

  mainGroup = svgSelection.append('g').attr('class', 'gerber-root')

  // 全域座標轉換：Gerber 座標 → SVG 像素（含 Y 軸翻轉）
  const globalGroup = mainGroup
    .append('g')
    .attr('class', 'gerber-world')
    .attr('transform', fit.transform)

  let totalShapes = 0
  let units: GerberUnits = 'mm'

  for (const layer of activeLayers.value) {
    const layerG = globalGroup
      .append('g')
      .attr('id', `gerber-${layer.id}`)
      .attr('display', layer.visible ? null : 'none')
    layerGroupMap.set(layer.id, layerG)

    if (layer.imageTree) {
      renderLayerTracespace(layerG, layer.imageTree, layer.color)
      totalShapes += layer.imageTree.children?.length ?? 0
      units = normalizeUnits(layer.imageTree.units) ?? units
    } else if (layer.parsed) {
      if (isParsedExcellon(layer.parsed)) {
        renderLayerExcellon(layerG, layer.parsed)
      } else {
        renderLayerManual(layerG, layer.parsed)
      }
      totalShapes += layer.parsed.commands.length
      units = layer.parsed.units || units
    }

    if (showMovePathState.value) {
      renderMovePaths(layerG, layer.movePaths ?? [])
    }
  }

  imageInfo.value = {
    units,
    shapeCount: totalShapes,
    sizeText: `${fit.geoWidth.toFixed(2)} × ${fit.geoHeight.toFixed(2)} ${units}`,
  }

  setupZoom(svgSelection, mainGroup)
}

/** tracespace 的 units 是自己的字串聯集，對不上的就忽略 */
function normalizeUnits(units: string | undefined): GerberUnits | null {
  return units === 'mm' || units === 'in' ? units : null
}

// ===== 渲染 tracespace ImageTree =====
function renderLayerTracespace(
  group: GroupSelection,
  imageTree: ImageTree,
  color: string
): void {
  for (const child of imageTree.children ?? []) {
    renderImageGraphic(group, child, color)
  }
}

function renderImageGraphic(g: GroupSelection, graphic: ImageGraphic, color: string): void {
  if (graphic.type === 'imageShape') renderShape(g, graphic.shape, color)
  else if (graphic.type === 'imagePath') renderTsPath(g, graphic, color)
  else if (graphic.type === 'imageRegion') renderTsRegion(g, graphic, color)
}

function renderShape(g: GroupSelection, shape: Shape, color: string): void {
  if (shape.type === 'circle') {
    g.append('circle')
      .attr('cx', shape.cx)
      .attr('cy', shape.cy)
      .attr('r', shape.r)
      .attr('fill', color)
  } else if (shape.type === 'rectangle') {
    g.append('rect')
      .attr('x', shape.x)
      .attr('y', shape.y)
      .attr('width', shape.xSize)
      .attr('height', shape.ySize)
      .attr('rx', shape.r ?? 0)
      .attr('ry', shape.r ?? 0)
      .attr('fill', color)
  } else if (shape.type === 'polygon') {
    g.append('polygon')
      .attr('points', shape.points.map((p) => p.join(',')).join(' '))
      .attr('fill', color)
  } else if (shape.type === 'outline') {
    g.append('path').attr('d', segmentsToPath(shape.segments)).attr('fill', color)
  } else if (shape.type === 'layeredShape') {
    for (const s of shape.shapes) renderShape(g, s, color)
  }
}

function renderTsPath(
  g: GroupSelection,
  pathGraphic: { segments: Parameters<typeof segmentsToPath>[0]; width?: number },
  color: string
): void {
  g.append('path')
    .attr('d', segmentsToPath(pathGraphic.segments))
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', pathGraphic.width ?? 0.01)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
}

function renderTsRegion(
  g: GroupSelection,
  region: { segments: Parameters<typeof segmentsToPath>[0] },
  color: string
): void {
  g.append('path')
    .attr('d', `${segmentsToPath(region.segments)}Z`)
    .attr('fill', color)
    .attr('stroke', 'none')
}

// ===== 渲染 Excellon 鑽孔圖層（依行為類型分色）=====

/** 鑽頭直徑缺失時的預設值（mm） */
const DEFAULT_DRILL_DIAMETER = 0.3

function renderLayerExcellon(group: GroupSelection, excellonData: ParsedExcellon): void {
  const { tools, commands } = excellonData
  const diameterOf = (tool: string | null): number =>
    tools[tool ?? '']?.diameter ?? DEFAULT_DRILL_DIAMETER

  // 鑽孔點（圓形）— 同一支鑽頭的孔徑相同，依鑽頭分組才能共用半徑
  const drillCmds = commands.filter((c) => c.type === 'drill')
  const drillByTool = d3.group(drillCmds, (d) => d.tool)
  for (const [toolId, cmds] of drillByTool) {
    const r = diameterOf(toolId) / 2
    group
      .selectAll(null)
      .data(cmds)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', r)
      .attr('fill', BEHAVIOR_COLORS.drill)
      .attr('fill-opacity', 0.9)
  }

  // 槽孔（G85）：畫成沿孔距方向的圓角矩形
  const slotCmds = commands.filter((c) => c.type === 'slot')
  for (const slot of slotCmds) {
    const diam = diameterOf(slot.tool)
    const r = diam / 2
    const cx = (slot.x1 + slot.x2) / 2
    const cy = (slot.y1 + slot.y2) / 2
    const dx = slot.x2 - slot.x1
    const dy = slot.y2 - slot.y1
    const len = Math.sqrt(dx * dx + dy * dy)
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
    // 寬 = 孔距 + 直徑，高 = 直徑
    group
      .append('rect')
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

/**
 * 渲染 D02 移動軌跡（EDA 工具路徑分析用）。
 *
 * 每個 D02 是一段獨立虛線：從上一個動作的終點跳到新位置。
 * 兩種解析路徑都走這裡 —— tracespace 的 ImageTree 不含提筆移動，
 * 因此那一路的軌跡是另外用 extractMovePaths() 掃出來的。
 */
function renderMovePaths(group: GroupSelection, moves: MoveCommand[]): void {
  if (moves.length === 0) return

  group
    .selectAll(null)
    .data(moves)
    .join('line')
    .attr('x1', (d) => d.fromX)
    .attr('y1', (d) => d.fromY)
    .attr('x2', (d) => d.x)
    .attr('y2', (d) => d.y)
    .attr('stroke', BEHAVIOR_COLORS.move)
    .attr('stroke-width', 0.08)
    .attr('stroke-dasharray', '0.4,0.25')
    .attr('stroke-opacity', 0.7)
    .attr('stroke-linecap', 'round')
}

// ===== 渲染手動解析圖層（依行為類型分色）=====
function renderLayerManual(group: GroupSelection, parsed: ParsedGerber): void {
  const { commands, apertures } = parsed

  // Flash (D03)：同一個 aperture 的形狀相同，分組後一次畫完
  const flashCmds = commands.filter((c) => c.type === 'flash')
  const flashByAp = d3.group(flashCmds, (d) => d.aperture)
  for (const [apId, cmds] of flashByAp) {
    const ap = apId === null ? undefined : apertures[apId]
    if (!ap) continue
    renderFlashes(group, ap, cmds, BEHAVIOR_COLORS.flash)
  }

  // Draw (D01)：線寬取自 aperture 的第一個參數
  const drawCmds = commands.filter((c) => c.type === 'draw')
  if (drawCmds.length > 0) {
    const drawByAp = d3.group(drawCmds, (d) => d.aperture)
    for (const [apId, cmds] of drawByAp) {
      const ap = apId === null ? undefined : apertures[apId]
      const strokeW = ap ? ap.params[0] || 0.01 : 0.01
      group
        .selectAll(null)
        .data(cmds)
        .join('line')
        .attr('x1', (d) => d.fromX)
        .attr('y1', (d) => d.fromY)
        .attr('x2', (d) => d.x)
        .attr('y2', (d) => d.y)
        .attr('stroke', BEHAVIOR_COLORS.draw)
        .attr('stroke-width', strokeW)
        .attr('stroke-linecap', 'round')
    }
  }

  // Region：填充區域
  // D02 = 新子輪廓起點（M），D01 = 畫線（L）；
  // 多個 D02 代表複合 region（例如字母 O 的內洞），因此用 evenodd 填充規則
  const regionCmds = commands.filter((c) => c.type === 'region')
  for (const region of regionCmds) {
    if (region.points.length < 3) continue
    let d = ''
    for (const p of region.points) {
      if (p.move) {
        if (d) d += 'Z ' // 關閉前一個子輪廓
        d += `M${p.x},${p.y}`
      } else {
        d += `L${p.x},${p.y}`
      }
    }
    d += 'Z'
    group
      .append('path')
      .attr('d', d)
      .attr('fill', BEHAVIOR_COLORS.region)
      .attr('fill-rule', 'evenodd')
  }
}

/** 依 aperture 形狀把 D03 蓋印畫出來 */
function renderFlashes(
  group: GroupSelection,
  ap: Aperture,
  cmds: FlashCommand[],
  color: string
): void {
  const shape = ap.shape
  if (shape === 'C') {
    const r = (ap.params[0] || 0.1) / 2
    group
      .selectAll(null)
      .data(cmds)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', r)
      .attr('fill', color)
  } else if (shape === 'R' || shape === 'O') {
    const w = ap.params[0] || 0.1
    const h = ap.params[1] ?? w
    // O（obround）是圓角矩形，圓角半徑取短邊的一半
    const r = shape === 'O' ? Math.min(w, h) / 2 : 0
    group
      .selectAll(null)
      .data(cmds)
      .join('rect')
      .attr('x', (d) => d.x - w / 2)
      .attr('y', (d) => d.y - h / 2)
      .attr('width', w)
      .attr('height', h)
      .attr('rx', r)
      .attr('ry', r)
      .attr('fill', color)
  } else if (shape === 'P') {
    const od = (ap.params[0] || 0.1) / 2
    const n = Math.max(3, ap.params[1] || 6)
    const rot = ((ap.params[2] || 0) * Math.PI) / 180
    const pts = Array.from({ length: n }, (_, i) => {
      const a = (i * 2 * Math.PI) / n + rot
      return [Math.cos(a) * od, Math.sin(a) * od]
    })
    group
      .selectAll(null)
      .data(cmds)
      .join('polygon')
      .attr('points', (d) => pts.map((p) => `${d.x + p[0]},${d.y + p[1]}`).join(' '))
      .attr('fill', color)
  }
}

// ===== 圖層可見性切換 =====
function toggleLayer(layer: ViewerLayer): void {
  layer.visible = !layer.visible
  const layerGroup = layerGroupMap.get(layer.id)
  if (layerGroup) layerGroup.attr('display', layer.visible ? null : 'none')
}

// ===== Zoom =====
function setupZoom(svg: SvgSelection, group: GroupSelection): void {
  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
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

// ===== 主載入流程 =====
async function loadAndRender(): Promise<void> {
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

    const successCount = activeLayers.value.filter((l) => l.imageTree || l.parsed).length
    if (successCount === 0) throw new Error('所有圖層均載入失敗')

    loadingMessage.value = '渲染圖形...'
    await nextTick()

    if (!containerRef.value || !svgRef.value) throw new Error('容器尚未掛載')
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
    fatalError.value = toMessage(e)
    emit('error', { message: toMessage(e) })
  } finally {
    globalLoading.value = false
  }
}

function reload(): void {
  loadAndRender()
}

/** 用目前的容器尺寸重畫（不重新 fetch）；沒有資料或尺寸為 0 時不動作 */
function rerenderAtCurrentSize(): boolean {
  if (!containerRef.value || !svgRef.value) return false
  const { width, height } = containerRef.value.getBoundingClientRect()
  if (width <= 0 || height <= 0) return false
  if (!activeLayers.value.some((l) => l.imageTree || l.parsed)) return false

  svgSelection = d3.select(svgRef.value).attr('width', width).attr('height', height)
  renderAllLayers(width, height)
  return true
}

// ===== Resize（只重新渲染，不重新 fetch）=====
function handleResize(): void {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (rerenderAtCurrentSize()) {
      // 重畫會重建 zoom behavior，縮放倍率也跟著回到 1
      currentZoom.value = 1
    }
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
  if (resizeTimer) clearTimeout(resizeTimer)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (svgSelection) svgSelection.on('.zoom', null)
})

// ===== 監聽 Props 變化 =====
watch(
  () => [props.src, props.gerberText, props.fillColor, props.backgroundColor],
  () => loadAndRender()
)
watch(() => props.layers, () => loadAndRender(), { deep: true })
watch(
  () => props.showMovePath,
  (v) => {
    showMovePathState.value = v
  },
  { immediate: true }
)
// 切換 D02 顯示只需重畫，不必重新 fetch
watch(showMovePathState, () => {
  rerenderAtCurrentSize()
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
