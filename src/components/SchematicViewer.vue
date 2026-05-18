<template>
  <div id="schematic-root">
    <!-- ====== HEADER ====== -->
    <header class="app-header">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 20 20" fill="none">
          <path d="M2 10 H6 M6 10 Q8 10 8 8 L8 4 Q8 2 10 2 H18"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M2 14 H5 M5 14 H8 M8 14 L8 10"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="18" cy="2" r="1.5" fill="currentColor"/>
          <circle cx="2" cy="10" r="1.5" fill="currentColor"/>
          <circle cx="2" cy="14" r="1.5" fill="currentColor"/>
          <rect x="6" y="7" width="4" height="6" rx="1"
            stroke="currentColor" stroke-width="1" fill="rgba(34,197,94,.15)"/>
        </svg>
        <span class="app-title">Schematic Viewer</span>
      </div>
      <div class="divider"></div>
      <div class="file-badge">
        <span class="filename">{{ schematic.filename }}</span>
        <span class="badge allegro">Allegro HDL</span>
        <span class="badge rev">{{ schematic.revision }}</span>
      </div>
      <div class="spacer"></div>
      <div class="toolbar">
        <!-- 隱藏 file input，支援 .json / .xml -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".json,.xml"
          style="display:none"
          @change="onFileChange"
        />
        <button class="tb-btn tb-btn--import" @click="fileInputRef.click()">IMPORT</button>
        <div class="divider"></div>
        <button class="tb-btn" @click="zoomIn">＋</button>
        <button class="tb-btn" @click="zoomOut">－</button>
        <button class="tb-btn" @click="zoomFit">FIT</button>
        <span class="zoom-readout">{{ zoomLevel }}%</span>
      </div>
    </header>

    <!-- ====== BODY ====== -->
    <div class="app-body">

      <!-- ===== SVG CANVAS ===== -->
      <div class="canvas-area" ref="canvasRef">
        <svg ref="svgRef" class="main-svg">
          <defs>
            <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="0.55" fill="#131d2b"/>
            </pattern>

            <filter id="wire-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="wire-glow-strong" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur1"/>
              <feGaussianBlur stdDeviation="1.5" result="blur2" in="SourceGraphic"/>
              <feMerge>
                <feMergeNode in="blur1"/>
                <feMergeNode in="blur2"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="comp-glow-blue" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feFlood flood-color="#67e8f9" flood-opacity="0.4" result="color"/>
              <feComposite in="color" in2="blur" operator="in" result="glow"/>
              <feMerge>
                <feMergeNode in="glow"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="comp-glow-amber" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feFlood flood-color="#f59e0b" flood-opacity="0.4" result="color"/>
              <feComposite in="color" in2="blur" operator="in" result="glow"/>
              <feMerge>
                <feMergeNode in="glow"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- ===== Zoom Group (D3 控制) ===== -->
          <g ref="zoomGroupRef">
            <!-- 背景網格 -->
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#dotGrid)"/>

            <!-- 背景浮水印文字 -->
            <text x="340" y="345" text-anchor="middle" class="bg-circuit-label">RC FILTER</text>

            <!-- ===== 電線 (Net) 層 ===== -->
            <g class="nets-layer">
              <path
                v-for="net in schematic.nets"
                :key="net.id"
                :d="net.path"
                class="net-wire"
                :class="{
                  'is-highlight': isNetHighlighted(net.name),
                  'is-dim':       isNetDimmed(net.name)
                }"
              />
            </g>

            <!-- ===== GND 符號層 ===== -->
            <g class="gnd-layer">
              <g
                v-for="gnd in schematic.gnds"
                :key="gnd.id"
                :transform="`translate(${gnd.x}, ${gnd.y})`"
                class="gnd-symbol"
              >
                <line x1="-14" y1="0" x2="14" y2="0"/>
                <line x1="-9"  y1="7" x2="9"  y2="7"/>
                <line x1="-4"  y1="14" x2="4" y2="14"/>
              </g>
            </g>

            <!-- ===== Port 標記層 ===== -->
            <g class="ports-layer">
              <g
                transform="translate(55, 220)"
                class="port-group"
                @mouseenter="hoverNet('NET_VIN')"
                @mouseleave="clearHover"
              >
                <polygon points="-11,-9 11,0 -11,9" class="port-arrow"/>
                <text x="-15" y="-14" text-anchor="middle" class="port-label">VIN</text>
              </g>
              <g
                transform="translate(625, 220)"
                class="port-group"
                @mouseenter="hoverNet('NET_B')"
                @mouseleave="clearHover"
              >
                <polygon points="-11,-9 11,0 -11,9" class="port-arrow"/>
                <text x="15" y="-14" text-anchor="start" class="port-label">VOUT</text>
              </g>
            </g>

            <!-- ===== 元件符號層 ===== -->
            <g class="components-layer">
              <g
                v-for="comp in schematic.components"
                :key="comp.id"
                :transform="`translate(${comp.x}, ${comp.y}) rotate(${comp.rotation})`"
                class="component-g"
                :class="{
                  'is-hovered':  hoveredComp?.id === comp.id,
                  'is-selected': selectedComp?.id === comp.id
                }"
                @mouseenter="onCompEnter(comp, $event)"
                @mousemove="onCompMove($event)"
                @mouseleave="clearHover"
                @click.stop="toggleSelect(comp)"
              >
                <!-- 電阻 (IEC 矩形樣式) -->
                <template v-if="comp.type === 'resistor'">
                  <line x1="-25" y1="0" x2="-12" y2="0" class="comp-wire"/>
                  <rect x="-12" y="-7" width="24" height="14" rx="2" class="comp-body"/>
                  <line x1="12"  y1="0" x2="25"  y2="0" class="comp-wire"/>
                </template>
                <!-- 電容 (雙板樣式) -->
                <template v-else-if="comp.type === 'capacitor'">
                  <line x1="-20" y1="0" x2="-5"  y2="0" class="comp-wire"/>
                  <line x1="-5"  y1="-12" x2="-5" y2="12" class="comp-plate"/>
                  <line x1="5"   y1="-12" x2="5"  y2="12" class="comp-plate"/>
                  <line x1="5"   y1="0"   x2="20" y2="0"  class="comp-wire"/>
                </template>
              </g>
            </g>

            <!-- ===== 標籤層（不隨元件旋轉）===== -->
            <g class="labels-layer" pointer-events="none">
              <g v-for="comp in schematic.components" :key="'lbl-' + comp.id">
                <text
                  :x="comp.lblX" :y="comp.lblY"
                  class="comp-refdes"
                  text-anchor="middle"
                >{{ comp.refdes }}</text>
                <text
                  :x="comp.valX" :y="comp.valY"
                  class="comp-value"
                  text-anchor="middle"
                >{{ comp.value }}</text>
              </g>
            </g>

            <!-- ===== Junction 節點圓點 ===== -->
            <g class="junctions-layer">
              <circle
                v-for="j in schematic.junctions"
                :key="j.id"
                :cx="j.x" :cy="j.y" r="4.5"
                class="junction-dot"
              />
            </g>
          </g><!-- /zoomGroupRef -->
        </svg>

        <!-- ===== Tooltip ===== -->
        <div
          v-if="tooltip.show && tooltip.comp"
          class="tooltip-box"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div class="tt-header">
            <span class="tt-refdes">{{ tooltip.comp.refdes }}</span>
            <span class="tt-type">{{ tooltip.comp.type }}</span>
          </div>
          <div class="tt-row"><span>Value</span><strong>{{ tooltip.comp.value }}</strong></div>
          <div class="tt-row"><span>Package</span><strong>{{ tooltip.comp.package }}</strong></div>
          <div v-if="tooltip.comp.tolerance" class="tt-row">
            <span>Tolerance</span><strong>{{ tooltip.comp.tolerance }}</strong>
          </div>
          <div v-if="tooltip.comp.voltage" class="tt-row">
            <span>Voltage</span><strong>{{ tooltip.comp.voltage }}</strong>
          </div>
          <div class="tt-nets">
            <span v-for="n in tooltip.comp.connectedNets" :key="n" class="tt-net-badge">{{ n }}</span>
          </div>
        </div>
      </div><!-- /canvas-area -->

      <!-- ===== SIDEBAR ===== -->
      <aside class="sidebar">
        <!-- Component list -->
        <div class="sidebar-header">
          <h2>COMPONENTS</h2>
          <span class="count-badge">{{ schematic.components.length }}</span>
        </div>
        <div class="comp-list">
          <div
            v-for="comp in schematic.components"
            :key="comp.id"
            class="comp-list-item"
            :class="{ active: selectedComp?.id === comp.id }"
            @click="toggleSelect(comp)"
            @mouseenter="hoverListItem(comp)"
            @mouseleave="clearHover"
          >
            <div class="cli-icon">
              <svg v-if="comp.type === 'resistor'" width="22" height="12" viewBox="-13 -7 26 14">
                <line x1="-12" y1="0" x2="-6" y2="0" stroke="currentColor" stroke-width="1.5"/>
                <rect x="-6" y="-5" width="12" height="10" rx="1"
                  fill="transparent" stroke="currentColor" stroke-width="1.5"/>
                <line x1="6" y1="0" x2="12" y2="0" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <svg v-else-if="comp.type === 'capacitor'" width="22" height="14" viewBox="-12 -7 24 14">
                <line x1="-11" y1="0" x2="-4" y2="0" stroke="currentColor" stroke-width="1.5"/>
                <line x1="-4" y1="-6" x2="-4" y2="6" stroke="currentColor" stroke-width="2"/>
                <line x1="4"  y1="-6" x2="4"  y2="6" stroke="currentColor" stroke-width="2"/>
                <line x1="4"  y1="0"  x2="11" y2="0" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </div>
            <div class="cli-info">
              <span class="cli-refdes">{{ comp.refdes }}</span>
              <span class="cli-desc">{{ comp.description }}</span>
            </div>
            <span class="cli-value">{{ comp.value }}</span>
          </div>
        </div>

        <!-- Properties panel -->
        <div class="sidebar-props">
          <div class="prop-header"><h2>PROPERTIES</h2></div>
          <div v-if="!selectedComp" class="prop-empty">
            <div class="prop-empty-icon">◈</div>
            <p>點選元件查看屬性</p>
          </div>
          <div v-else class="prop-body">
            <div class="prop-comp-title">
              <span class="prop-refdes">{{ selectedComp.refdes }}</span>
              <span class="prop-type-badge">{{ selectedComp.type }}</span>
            </div>
            <div class="prop-table">
              <div class="prop-row">
                <span class="pk">Value</span>
                <span class="pv">{{ selectedComp.value }}</span>
              </div>
              <div class="prop-row">
                <span class="pk">Package</span>
                <span class="pv">{{ selectedComp.package }}</span>
              </div>
              <div v-if="selectedComp.tolerance" class="prop-row">
                <span class="pk">Tolerance</span>
                <span class="pv">{{ selectedComp.tolerance }}</span>
              </div>
              <div v-if="selectedComp.voltage" class="prop-row">
                <span class="pk">Voltage</span>
                <span class="pv">{{ selectedComp.voltage }}</span>
              </div>
              <div class="prop-row">
                <span class="pk">Description</span>
                <span class="pv">{{ selectedComp.description }}</span>
              </div>
              <div class="prop-row">
                <span class="pk">Position</span>
                <span class="pv">({{ selectedComp.x }}, {{ selectedComp.y }})</span>
              </div>
              <div class="prop-row">
                <span class="pk">Rotation</span>
                <span class="pv">{{ selectedComp.rotation }}°</span>
              </div>
            </div>
            <div class="prop-nets-section">
              <div class="prop-nets-label">CONNECTED NETS</div>
              <div class="prop-nets">
                <span v-for="n in selectedComp.connectedNets" :key="n" class="net-badge">{{ n }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside><!-- /sidebar -->

    </div><!-- /app-body -->

    <!-- ====== STATUS BAR ====== -->
    <div class="status-bar">
      <div class="sb-item"><div class="dot"></div> Ready</div>
      <div class="sb-item">Components: {{ schematic.components.length }}</div>
      <div class="sb-item">Nets: {{ schematic.nets.length }}</div>
      <div v-if="selectedComp" class="sb-item">
        <div class="dot amber"></div> Selected: {{ selectedComp.refdes }}
      </div>
      <div v-if="importError" class="sb-item sb-error">
        <div class="dot red"></div> {{ importError }}
      </div>
      <div class="sb-item" style="margin-left: auto">Zoom: {{ zoomLevel }}%</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'

// ============================================================
// Props（外部可傳入自訂 schematic data）
// ============================================================
const props = defineProps({
  data: {
    type: Object,
    default: null,
  },
})

// ============================================================
// 預設電路圖資料（二階 RC 低通濾波器）
// ============================================================
const DEFAULT_SCHEMATIC = {
  title: '二階 RC 低通濾波器',
  filename: 'rc_lpf_2nd_order.xml',
  revision: 'REV_A',

  components: [
    {
      id: 'R1', type: 'resistor',
      refdes: 'R1', value: '10kΩ',
      package: '0603', tolerance: '1%',
      description: '輸入串聯電阻',
      x: 180, y: 220, rotation: 0,
      connectedNets: ['NET_VIN', 'NET_A'],
      lblX: 180, lblY: 204,
      valX: 180, valY: 244,
    },
    {
      id: 'C1', type: 'capacitor',
      refdes: 'C1', value: '100nF',
      package: '0402', voltage: '25V',
      description: '第一級旁路電容',
      x: 270, y: 295, rotation: 90,
      connectedNets: ['NET_A', 'GND'],
      lblX: 296, lblY: 288,
      valX: 296, valY: 303,
    },
    {
      id: 'R2', type: 'resistor',
      refdes: 'R2', value: '4.7kΩ',
      package: '0603', tolerance: '1%',
      description: '第二級串聯電阻',
      x: 390, y: 220, rotation: 0,
      connectedNets: ['NET_A', 'NET_B'],
      lblX: 390, lblY: 204,
      valX: 390, valY: 244,
    },
    {
      id: 'C2', type: 'capacitor',
      refdes: 'C2', value: '47nF',
      package: '0402', voltage: '25V',
      description: '第二級旁路電容',
      x: 480, y: 295, rotation: 90,
      connectedNets: ['NET_B', 'GND'],
      lblX: 506, lblY: 288,
      valX: 506, valY: 303,
    },
  ],

  nets: [
    { id: 'n01', name: 'NET_VIN', path: 'M 66 220 H 155' },
    { id: 'n02', name: 'NET_A',   path: 'M 205 220 H 270' },
    { id: 'n03', name: 'NET_A',   path: 'M 270 220 V 275' },
    { id: 'n04', name: 'NET_A',   path: 'M 270 220 H 365' },
    { id: 'n05', name: 'NET_B',   path: 'M 415 220 H 480' },
    { id: 'n06', name: 'NET_B',   path: 'M 480 220 V 275' },
    { id: 'n07', name: 'NET_B',   path: 'M 480 220 H 614' },
    { id: 'n08', name: 'GND',     path: 'M 270 315 V 340' },
    { id: 'n09', name: 'GND',     path: 'M 480 315 V 340' },
  ],

  gnds: [
    { id: 'gnd1', x: 270, y: 340 },
    { id: 'gnd2', x: 480, y: 340 },
  ],

  junctions: [
    { id: 'j1', x: 270, y: 220 },
    { id: 'j2', x: 480, y: 220 },
  ],
}

// ============================================================
// State
// ============================================================
const svgRef       = ref(null)
const zoomGroupRef = ref(null)
const canvasRef    = ref(null)
const fileInputRef = ref(null)

const importedData = ref(null)
const importError  = ref('')

// schematic 由 props.data 或匯入的檔案決定，fallback 為預設範例
const schematic = computed(() => importedData.value ?? props.data ?? DEFAULT_SCHEMATIC)

const hoveredComp  = ref(null)
const hoveredNet   = ref(null)
const selectedComp = ref(null)
const zoomLevel    = ref(100)

const tooltip = reactive({ show: false, x: 0, y: 0, comp: null })

let zoomBehavior = null

// ============================================================
// Net 高亮邏輯
// ============================================================
const activeNets = computed(() => {
  if (hoveredNet.value) return new Set([hoveredNet.value])
  if (hoveredComp.value) return new Set(hoveredComp.value.connectedNets)
  return null
})

const isNetHighlighted = (netName) => {
  if (!activeNets.value) return false
  return activeNets.value.has(netName)
}

const isNetDimmed = (netName) => {
  if (!activeNets.value) return false
  return !activeNets.value.has(netName)
}

// ============================================================
// 互動事件
// ============================================================
const onCompEnter = (comp, event) => {
  hoveredComp.value = comp
  hoveredNet.value  = null
  tooltip.show  = true
  tooltip.comp  = comp
  tooltip.x     = event.clientX + 16
  tooltip.y     = event.clientY - 16
}

const onCompMove = (event) => {
  if (!tooltip.show) return
  tooltip.x = event.clientX + 16
  tooltip.y = event.clientY - 16
}

const hoverListItem = (comp) => {
  hoveredComp.value = comp
  hoveredNet.value  = null
}

const hoverNet = (netName) => {
  hoveredNet.value  = netName
  hoveredComp.value = null
}

const clearHover = () => {
  hoveredComp.value = null
  hoveredNet.value  = null
  tooltip.show      = false
}

const toggleSelect = (comp) => {
  selectedComp.value = selectedComp.value?.id === comp.id ? null : comp
}

// ============================================================
// 檔案匯入
// ============================================================

/** 解析 JSON 格式的 schematic 檔案 */
const parseJsonFile = (text) => {
  const data = JSON.parse(text)
  // 驗證必要欄位
  if (!Array.isArray(data.components) || !Array.isArray(data.nets)) {
    throw new Error('JSON 格式錯誤：缺少 components 或 nets 欄位')
  }
  return data
}

/**
 * 解析簡易 XML 格式的 schematic 檔案
 * 預期格式：
 * <schematic title="..." filename="..." revision="...">
 *   <component id="R1" type="resistor" refdes="R1" value="10kΩ"
 *     package="0603" tolerance="1%" description="..."
 *     x="180" y="220" rotation="0"
 *     lblX="180" lblY="204" valX="180" valY="244"
 *     connectedNets="NET_VIN,NET_A" />
 *   <net id="n01" name="NET_VIN" path="M 66 220 H 155" />
 *   <gnd id="gnd1" x="270" y="340" />
 *   <junction id="j1" x="270" y="220" />
 * </schematic>
 */
const parseXmlFile = (text) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('XML 解析失敗：' + parseError.textContent.slice(0, 80))

  const root = doc.documentElement
  const attr = (el, name, fallback = '') => el.getAttribute(name) ?? fallback
  const num  = (el, name, fallback = 0) => parseFloat(attr(el, name, fallback))

  const components = [...root.querySelectorAll('component')].map(el => ({
    id:            attr(el, 'id'),
    type:          attr(el, 'type'),
    refdes:        attr(el, 'refdes'),
    value:         attr(el, 'value'),
    package:       attr(el, 'package'),
    tolerance:     attr(el, 'tolerance') || undefined,
    voltage:       attr(el, 'voltage')   || undefined,
    description:   attr(el, 'description'),
    x:             num(el, 'x'),
    y:             num(el, 'y'),
    rotation:      num(el, 'rotation'),
    lblX:          num(el, 'lblX'),
    lblY:          num(el, 'lblY'),
    valX:          num(el, 'valX'),
    valY:          num(el, 'valY'),
    connectedNets: attr(el, 'connectedNets').split(',').filter(Boolean),
  }))

  const nets = [...root.querySelectorAll('net')].map(el => ({
    id:   attr(el, 'id'),
    name: attr(el, 'name'),
    path: attr(el, 'path'),
  }))

  const gnds = [...root.querySelectorAll('gnd')].map(el => ({
    id: attr(el, 'id'),
    x:  num(el, 'x'),
    y:  num(el, 'y'),
  }))

  const junctions = [...root.querySelectorAll('junction')].map(el => ({
    id: attr(el, 'id'),
    x:  num(el, 'x'),
    y:  num(el, 'y'),
  }))

  if (!components.length) throw new Error('XML 中找不到任何 <component> 元素')

  return {
    title:      attr(root, 'title', ''),
    filename:   attr(root, 'filename', doc.documentElement.tagName + '.xml'),
    revision:   attr(root, 'revision', 'REV_A'),
    components,
    nets,
    gnds,
    junctions,
  }
}

const onFileChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  // 重置，讓同一個檔案可以重複選取
  event.target.value = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = e.target.result
      const data = file.name.endsWith('.xml') ? parseXmlFile(text) : parseJsonFile(text)
      importedData.value = data
      importError.value  = ''
      selectedComp.value = null
      nextTick(() => setTimeout(zoomFit, 80))
    } catch (err) {
      importError.value = err.message
    }
  }
  reader.readAsText(file)
}

// ============================================================
// Zoom 控制
// ============================================================
const zoomIn = () => {
  if (!zoomBehavior) return
  d3.select(svgRef.value).transition().duration(250).call(zoomBehavior.scaleBy, 1.4)
}

const zoomOut = () => {
  if (!zoomBehavior) return
  d3.select(svgRef.value).transition().duration(250).call(zoomBehavior.scaleBy, 1 / 1.4)
}

const zoomFit = () => {
  if (!svgRef.value || !zoomBehavior) return
  const w = svgRef.value.clientWidth
  const h = svgRef.value.clientHeight

  // 動態計算元件邊界
  const comps = schematic.value.components
  if (!comps.length) return
  const xs = comps.map(c => c.x)
  const ys = comps.map(c => c.y)
  const pad = 100
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minY = Math.min(...ys) - pad
  const maxY = Math.max(...ys) + pad
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const contentW = maxX - minX
  const contentH = maxY - minY

  const scale = Math.min(w / contentW, h / contentH) * 0.85
  const tx = w / 2 - cx * scale
  const ty = h / 2 - cy * scale
  const t  = d3.zoomIdentity.translate(tx, ty).scale(scale)

  d3.select(svgRef.value).transition().duration(450).call(zoomBehavior.transform, t)
}

// ============================================================
// 生命週期
// ============================================================
onMounted(() => {
  if (!svgRef.value) return

  zoomBehavior = d3.zoom()
    .scaleExtent([0.1, 10])
    .on('zoom', (event) => {
      if (!zoomGroupRef.value) return
      d3.select(zoomGroupRef.value).attr('transform', event.transform)
      zoomLevel.value = Math.round(event.transform.k * 100)
    })

  d3.select(svgRef.value).call(zoomBehavior)
  setTimeout(zoomFit, 80)
})

onUnmounted(() => {
  if (zoomBehavior) zoomBehavior.on('zoom', null)
  if (svgRef.value) d3.select(svgRef.value).on('.zoom', null)
})
</script>

<style scoped>
/* ============================================================
   CSS 變數
   ============================================================ */
#schematic-root {
  --bg:           #07090d;
  --bg-panel:     #0b0f17;
  --bg-card:      #111827;
  --border:       #1d2a3a;
  --border-hi:    #263548;

  --green:        #22c55e;
  --green-dim:    #0d2b1a;
  --green-bright: #4ade80;
  --green-wire:   #16a34a;

  --cyan:         #22d3ee;
  --amber:        #f59e0b;
  --blue:         #60a5fa;
  --red:          #f87171;

  --text-1: #e2e8f0;
  --text-2: #94a3b8;
  --text-3: #475569;
  --text-4: #1e293b;

  --font-ui:   'Exo 2', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --radius:    4px;
  --sidebar-w: 256px;

  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-family: var(--font-ui);
  color: var(--text-1);
  background: var(--bg);
}

/* ===========================
   HEADER
   =========================== */
.app-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  height: 46px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--green-bright);
}
.logo-icon { width: 20px; height: 20px; }

.app-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  letter-spacing: 0.5px;
}

.divider {
  width: 1px;
  height: 22px;
  background: var(--border);
  flex-shrink: 0;
}

.file-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filename {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-2);
}
.badge {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 99px;
  border: 1px solid var(--border-hi);
  color: var(--text-3);
  font-family: var(--font-mono);
  letter-spacing: 0.3px;
}
.badge.allegro {
  border-color: var(--green-dim);
  color: var(--green);
  background: rgba(22, 163, 74, 0.1);
}
.badge.rev {
  border-color: #1c2638;
  color: var(--amber);
  background: rgba(245, 158, 11, 0.08);
}

.spacer { flex: 1; }

.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tb-btn {
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.5px;
}
.tb-btn:hover {
  background: var(--border-hi);
  color: var(--text-1);
  border-color: var(--border-hi);
}
.tb-btn--import {
  border-color: rgba(34, 197, 94, 0.35);
  color: var(--green);
}
.tb-btn--import:hover {
  background: rgba(34, 197, 94, 0.12);
  border-color: var(--green);
  color: var(--green-bright);
}
.zoom-readout {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-3);
  min-width: 42px;
  text-align: right;
}

/* ===========================
   BODY
   =========================== */
.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ===========================
   CANVAS
   =========================== */
.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg);
  cursor: grab;
}
.canvas-area:active { cursor: grabbing; }

.main-svg {
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
}

/* === Net wires === */
.net-wire {
  fill: none;
  stroke: var(--green-wire);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 0.2s, opacity 0.2s;
  filter: url(#wire-glow);
}
.net-wire.is-highlight {
  stroke: var(--green-bright);
  stroke-width: 2.2;
  filter: url(#wire-glow-strong);
}
.net-wire.is-dim {
  stroke: #0a1f11;
  filter: none;
  opacity: 0.4;
}

/* === Component groups === */
.component-g { cursor: pointer; }
.comp-wire {
  stroke: var(--green);
  stroke-width: 1.8;
  stroke-linecap: round;
  fill: none;
}
.comp-body {
  fill: var(--bg);
  stroke: var(--green);
  stroke-width: 1.8;
  transition: stroke 0.15s, fill 0.15s;
}
.comp-plate {
  stroke: var(--green);
  stroke-width: 2.2;
  stroke-linecap: round;
  fill: none;
}

.component-g.is-hovered .comp-wire,
.component-g.is-hovered .comp-plate {
  stroke: var(--cyan);
  filter: url(#comp-glow-blue);
}
.component-g.is-hovered .comp-body {
  stroke: var(--cyan);
  fill: #081419;
  filter: url(#comp-glow-blue);
}

.component-g.is-selected .comp-wire,
.component-g.is-selected .comp-plate {
  stroke: var(--amber);
  filter: url(#comp-glow-amber);
}
.component-g.is-selected .comp-body {
  stroke: var(--amber);
  fill: #110e04;
  filter: url(#comp-glow-amber);
}

/* === Labels === */
.comp-refdes {
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 500;
  fill: var(--green-bright);
  letter-spacing: 0.3px;
  pointer-events: none;
}
.comp-value {
  font-family: var(--font-mono);
  font-size: 9.5px;
  fill: #334155;
  pointer-events: none;
}

/* === GND symbol === */
.gnd-symbol line {
  stroke: var(--cyan);
  stroke-width: 1.8;
  stroke-linecap: round;
}

/* === Port markers === */
.port-group { cursor: default; }
.port-arrow {
  fill: var(--amber);
  stroke: none;
  opacity: 0.85;
}
.port-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  fill: var(--amber);
  letter-spacing: 0.5px;
  pointer-events: none;
}

/* === Junctions === */
.junction-dot {
  fill: var(--green-bright);
  filter: url(#wire-glow);
}

/* === Watermark === */
.bg-circuit-label {
  font-family: var(--font-mono);
  font-size: 80px;
  font-weight: 700;
  fill: rgba(22, 163, 74, 0.025);
  letter-spacing: 6px;
  pointer-events: none;
  user-select: none;
}

/* ===========================
   TOOLTIP
   =========================== */
.tooltip-box {
  position: fixed;
  z-index: 999;
  background: #0e1825;
  border: 1px solid var(--border-hi);
  border-radius: 6px;
  padding: 10px 12px;
  min-width: 160px;
  pointer-events: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(34, 197, 94, 0.1);
  font-family: var(--font-mono);
  font-size: 11px;
  animation: tt-in 0.1s ease;
}
@keyframes tt-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.tt-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--border);
}
.tt-refdes {
  font-size: 13px;
  font-weight: 700;
  color: var(--green-bright);
  letter-spacing: 0.5px;
}
.tt-type {
  font-size: 9px;
  background: var(--green-dim);
  border: 1px solid rgba(22, 163, 74, 0.3);
  color: var(--green);
  padding: 1px 6px;
  border-radius: 99px;
  letter-spacing: 0.5px;
}
.tt-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
  color: var(--text-3);
}
.tt-row strong {
  color: var(--text-2);
  font-weight: 500;
}
.tt-nets {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.tt-net-badge {
  font-size: 9px;
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.25);
  color: var(--blue);
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.3px;
}

/* ===========================
   SIDEBAR
   =========================== */
.sidebar {
  width: var(--sidebar-w);
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.sidebar-header h2 {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.2px;
  color: var(--text-3);
  font-family: var(--font-mono);
}
.count-badge {
  font-size: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-3);
  padding: 1px 7px;
  border-radius: 99px;
  font-family: var(--font-mono);
}

.comp-list {
  flex: 0 0 auto;
  border-bottom: 1px solid var(--border);
}
.comp-list-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 14px;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  border-left: 2px solid transparent;
  transition: all 0.12s;
}
.comp-list-item:hover {
  background: var(--bg-card);
  border-bottom-color: var(--border);
}
.comp-list-item.active {
  background: rgba(245, 158, 11, 0.06);
  border-left-color: var(--amber);
}

.cli-icon {
  color: var(--green);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  width: 24px;
}
.comp-list-item.active .cli-icon    { color: var(--amber); }
.comp-list-item:hover:not(.active) .cli-icon { color: var(--cyan); }

.cli-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.cli-refdes {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-1);
}
.cli-desc {
  font-size: 10px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cli-value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-2);
  flex-shrink: 0;
}

/* Properties panel */
.sidebar-props {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.prop-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.prop-header h2 {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.2px;
  color: var(--text-3);
  font-family: var(--font-mono);
}
.prop-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-4);
  font-size: 12px;
  padding-bottom: 40px;
}
.prop-empty-icon {
  font-size: 24px;
  opacity: 0.5;
}
.prop-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.prop-comp-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
.prop-refdes {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--amber);
  letter-spacing: 1px;
}
.prop-type-badge {
  font-size: 9px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: var(--amber);
  padding: 2px 7px;
  border-radius: 99px;
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
}

.prop-table { display: flex; flex-direction: column; }
.prop-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid var(--text-4);
  font-size: 11px;
}
.pk {
  color: var(--text-3);
  font-family: var(--font-mono);
  flex-shrink: 0;
}
.pv {
  color: var(--text-2);
  font-family: var(--font-mono);
  text-align: right;
  word-break: break-all;
}

.prop-nets-section { margin-top: 12px; }
.prop-nets-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 1px;
  color: var(--text-3);
  margin-bottom: 6px;
}
.prop-nets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.net-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.25);
  color: var(--blue);
  padding: 2px 8px;
  border-radius: 3px;
  letter-spacing: 0.3px;
}

/* ===========================
   STATUS BAR
   =========================== */
.status-bar {
  height: 22px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 16px;
  flex-shrink: 0;
}
.sb-item {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
  display: flex;
  align-items: center;
  gap: 4px;
}
.sb-item .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 4px var(--green);
}
.sb-item .dot.amber {
  background: var(--amber);
  box-shadow: 0 0 4px var(--amber);
}
.sb-item .dot.red {
  background: var(--red);
  box-shadow: 0 0 4px var(--red);
}
.sb-error { color: var(--red); }
</style>
