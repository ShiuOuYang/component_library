<template>
  <div class="sunburst-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px` }">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <nav v-if="crumbs.length > 1" :aria-label="i18n.sunburst.breadcrumb" class="min-w-0">
        <ol class="flex flex-wrap items-center gap-1 text-xs">
          <li v-for="(c, i) in crumbs" :key="c.path.join('/')" class="flex items-center gap-1">
            <span v-if="i > 0" class="material-symbols-outlined text-sm text-content-tertiary" aria-hidden="true">chevron_right</span>
            <button
              v-if="i < crumbs.length - 1"
              type="button"
              class="rounded px-1 text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
              @click="setPath(c.path)"
            >{{ c.name }}</button>
            <span v-else class="px-1 font-medium text-content-primary" aria-current="location">{{ c.name }}</span>
          </li>
        </ol>
      </nav>
    </div>

    <div ref="containerRef" class="relative min-h-0 flex-1" :style="props.autoResize ? undefined : { height: `${props.height}px` }">
      <p v-if="!layout.arcs.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? i18n.sunburst.empty }}</p>
      <svg v-else :width="effectiveWidth" :height="effectiveHeight" class="block select-none" role="group" :aria-label="ariaLabel" @mouseleave="hoverKey = null">
        <g :transform="`translate(${cx},${cy})`">
          <!-- 中心：目前節點；有上層時點了回上層 -->
          <g
            :role="innerPath.length ? 'button' : undefined"
            :tabindex="innerPath.length ? 0 : undefined"
            :aria-label="innerPath.length ? i18n.sunburst.back(parentName) : undefined"
            :class="innerPath.length ? 'cursor-pointer outline-none' : ''"
            @click="up()"
            @keydown.enter.prevent="up()"
            @keydown.space.prevent="up()"
          >
            <circle :r="Math.max(0, layout.inner - 2)" :style="{ fill: chartTheme.surfaceMuted }" />
            <text text-anchor="middle" dy="-0.2em" font-size="12" font-weight="600" :style="{ fill: chartTheme.text }">{{ fit(focus.data.name, layout.inner * 1.7, 12) }}</text>
            <text text-anchor="middle" dy="1.1em" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ valueText(focus.value ?? 0) }}</text>
            <text v-if="innerPath.length" text-anchor="middle" dy="2.4em" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ i18n.sunburst.upShort }}</text>
          </g>

          <g
            v-for="a in layout.arcs"
            :key="a.key"
            :ref="(el) => setArcEl(a.key, el as SVGGElement | null)"
            role="button"
            :tabindex="a.key === activeKey ? 0 : -1"
            :aria-label="arcLabelText(a)"
            class="cursor-pointer outline-none"
            @click.stop="onArcClick(a)"
            @mouseenter="hoverKey = a.key"
            @focus="activeKey = a.key; focusKey = a.key"
            @blur="focusKey = null"
            @keydown="onKeydown($event, a)"
          >
            <path
              :d="arcPath(a)"
              :style="{
                fill: fillOf(a),
                stroke: hotKey === a.key ? chartTheme.text : chartTheme.surface,
                opacity: hotPath && !hotPath.has(a.key) ? 0.4 : 1,
              }"
              :stroke-width="hotKey === a.key ? 2 : 1"
            />
            <text
              v-if="labelOf(a)"
              :transform="`translate(${labelOf(a)!.x},${labelOf(a)!.y}) rotate(${labelOf(a)!.rotate})`"
              text-anchor="middle"
              dy="0.32em"
              font-size="11"
              pointer-events="none"
              paint-order="stroke"
              stroke-width="3"
              stroke-linejoin="round"
              :style="{ fill: chartTheme.text, stroke: chartTheme.surface, opacity: hotPath && !hotPath.has(a.key) ? 0.4 : 1 }"
            >{{ a.node.data.name }}</text>
          </g>
        </g>
      </svg>
      <div
        v-if="tip"
        class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
        :style="{ ...tip.style, background: chartTheme.surface, borderColor: chartTheme.border, color: chartTheme.text }"
        data-export-ignore
      >
        <div v-for="(line, i) in tip.lines" :key="i" :class="i === 0 ? 'font-medium' : 'text-content-secondary'">{{ line }}</div>
      </div>
    </div>
    <p v-if="layout.arcs.length" class="text-xs text-content-tertiary">{{ i18n.sunburst.hint }}</p>

    <table class="sr-only">
      <caption>{{ crumbs.map((c) => c.name).join(' / ') }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ i18n.sunburst.name }}</th>
          <th scope="col">{{ i18n.sunburst.value }}</th>
          <th scope="col">{{ i18n.sunburst.share }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in focus.children ?? []" :key="nodeKey(c.data)">
          <th scope="row">{{ c.data.name }}</th>
          <td>{{ valueText(c.value ?? 0) }}</td>
          <td>{{ shareText(c, focus) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { estimateTextWidth } from './utils/chartText'
import { buildHierarchy, findByPath, nodeKey, pathOf, type TreemapNode } from './utils/treemap'
import { arcCentroid, arcLabel, layoutSunburst, siblingArc, type SunburstArc } from './utils/sunburst'
import { useLocale } from '../shared/config'

/**
 * SunburstChart —— 旭日圖
 *
 * 用途：階層的佔比，一次看好幾層 —— 不良類別 → 原因 → 站別、成本 → 科目 → 細項。角度是數量，越外圈越細。
 * 資料格式與 TreemapChart 相同（TreemapNode）。
 *
 * - 點有子節點的弧往下鑽，點中央或麵包屑回上層（v-model:path）
 * - 滑過時標出這一支的路徑（其他淡化），提示顯示佔目前節點與佔上一層的比例
 * - 顏色：最內圈每個節點一個類別色，外圈沿用、越外越淡
 * - 鍵盤：Tab 進入後 ← → 同一圈移動、↑ 往外、↓ 往內，Enter 往下鑽，Esc / Backspace 回上層
 */

interface SunburstChartProps {
  data: TreemapNode
  /** 一次畫幾圈 */
  levels?: number
  /** v-model:path：目前在中央的節點 */
  path?: string[]
  title?: string
  unit?: string
  valueFormat?: ((value: number) => string) | null
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  emptyText?: string
}

const i18n = useLocale()
const props = withDefaults(defineProps<SunburstChartProps>(), {
  levels: 3,
  path: undefined,
  title: '',
  unit: '',
  valueFormat: null,
  width: 480,
  height: 420,
  autoResize: false,
  debounceDelay: 100,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:path', path: string[]): void
  /** 點一個沒有子節點的弧（或 Enter） */
  (e: 'node-click', node: TreemapNode, path: string[]): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// ---- 階層與位置 ----
const root = computed(() => buildHierarchy(props.data))
const innerPath = ref<string[]>(props.path ?? [])
watch(
  () => props.path,
  (p) => (innerPath.value = p ?? [])
)
const focus = computed(() => findByPath(root.value, innerPath.value))
const crumbs = computed(() => focus.value.ancestors().reverse().map((n) => ({ name: n.data.name, path: pathOf(n) })))
const parentName = computed(() => focus.value.parent?.data.name ?? '')
function setPath(p: string[]): void {
  innerPath.value = p
  hoverKey.value = null
  emit('update:path', p)
}
function up(): void {
  if (!innerPath.value.length) return
  const from = pathOf(focus.value).join('/')
  setPath(pathOf(focus.value).slice(0, -1))
  // 回到上一層時焦點放在剛剛那一塊
  void nextTick(() => {
    if (arcEls.has(from)) {
      activeKey.value = from
      arcEls.get(from)?.focus()
    }
  })
}

// ---- 版面 ----
const cx = computed(() => effectiveWidth.value / 2)
const cy = computed(() => effectiveHeight.value / 2)
const radius = computed(() => Math.max(20, Math.min(effectiveWidth.value, effectiveHeight.value) / 2 - 6))
const layout = computed(() => layoutSunburst(focus.value, radius.value, Math.max(1, Math.round(props.levels))))
const arcGen = d3
  .arc<SunburstArc>()
  .startAngle((a) => a.a0)
  .endAngle((a) => a.a1)
  .innerRadius((a) => a.r0)
  .outerRadius((a) => a.r1 - 1)
  .padAngle((a) => Math.min(0.006, (a.a1 - a.a0) / 4))
  .padRadius(() => radius.value / 2)
const arcPath = (a: SunburstArc) => arcGen(a) ?? ''
const fit = (text: string, w: number, size: number) => {
  if (estimateTextWidth(text, size) <= w) return text
  let s = text
  while (s.length > 1 && estimateTextWidth(`${s}…`, size) > w) s = s.slice(0, -1)
  return `${s}…`
}
const labelOf = (a: SunburstArc) => arcLabel(a, estimateTextWidth(a.node.data.name, 11))

// ---- 顏色 ----
const topIndex = computed(() => new Map((focus.value.children ?? []).map((c, i) => [nodeKey(c.data), i])))
function fillOf(a: SunburstArc): string {
  if (a.node.data.color) return a.node.data.color
  const i = topIndex.value.get(nodeKey(a.top.data)) ?? 0
  const base = a.top.data.color ?? chartPalette.categorical[i] ?? chartPalette.other
  if (a.depth === 1) return base
  return `color-mix(in srgb, ${base} ${Math.max(30, 82 - (a.depth - 2) * 20)}%, ${chartTheme.surface})`
}

// ---- 文字 ----
const defaultFormat = d3.format(',~f')
const valueText = (v: number) => {
  const s = props.valueFormat ? props.valueFormat(v) : defaultFormat(Number(v.toPrecision(6)))
  return props.unit ? `${s} ${props.unit}` : s
}
const shareText = (n: d3.HierarchyNode<TreemapNode>, of: d3.HierarchyNode<TreemapNode>) => {
  const total = of.value ?? 0
  return total > 0 ? `${d3.format('.1f')(((n.value ?? 0) / total) * 100)}%` : '—'
}
const relPath = (a: SunburstArc) => a.node.ancestors().reverse().slice(focus.value.depth + 1).map((n) => n.data.name)
function arcLabelText(a: SunburstArc): string {
  const parts = [relPath(a).join(' / '), valueText(a.node.value ?? 0), shareText(a.node, focus.value)]
  if (a.node.children?.length) parts.push(i18n.value.sunburst.drillable(a.node.children.length))
  return parts.join(', ')
}

// ---- 互動 ----
const hoverKey = ref<string | null>(null)
const focusKey = ref<string | null>(null)
const activeKey = ref<string | null>(null)
const hotKey = computed(() => hoverKey.value ?? focusKey.value)
const hotPath = computed(() => {
  const a = layout.value.arcs.find((x) => x.key === hotKey.value)
  if (!a) return null
  return new Set(a.node.ancestors().map((n) => pathOf(n).join('/')))
})
watch(
  () => layout.value.arcs,
  (arcs) => {
    if (!arcs.some((a) => a.key === activeKey.value)) activeKey.value = arcs[0]?.key ?? null
  },
  { immediate: true }
)
const arcEls = new Map<string, SVGGElement>()
function setArcEl(key: string, el: SVGGElement | null): void {
  if (el) arcEls.set(key, el)
  else arcEls.delete(key)
}
function focusArc(key: string): void {
  activeKey.value = key
  void nextTick(() => arcEls.get(key)?.focus())
}
function onArcClick(a: SunburstArc): void {
  if (a.node.children?.length) {
    const wasKeyboard = focusKey.value !== null
    setPath(pathOf(a.node))
    if (wasKeyboard) void nextTick(() => layout.value.arcs[0] && focusArc(layout.value.arcs[0].key))
  } else emit('node-click', a.node.data, pathOf(a.node))
}
function onKeydown(e: KeyboardEvent, a: SunburstArc): void {
  const arcs = layout.value.arcs
  let target: SunburstArc | undefined
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault()
      return onArcClick(a)
    case 'Escape':
    case 'Backspace':
      if (!innerPath.value.length) return
      e.preventDefault()
      return up()
    case 'ArrowRight':
      target = siblingArc(arcs, a, 1)
      break
    case 'ArrowLeft':
      target = siblingArc(arcs, a, -1)
      break
    case 'ArrowUp':
      target = arcs.find((x) => x.node.parent === a.node)
      break
    case 'ArrowDown':
      target = arcs.find((x) => x.node === a.node.parent)
      break
    default:
      return
  }
  e.preventDefault()
  if (target) focusArc(target.key)
}

const tip = computed(() => {
  const a = layout.value.arcs.find((x) => x.key === hotKey.value)
  if (!a) return null
  const s = i18n.value.sunburst
  const lines = [relPath(a).join(' / '), s.valueShare(valueText(a.node.value ?? 0), shareText(a.node, focus.value))]
  if (a.depth > 1) lines.push(s.parentShare(shareText(a.node, a.node.parent!), a.node.parent!.data.name))
  if (a.node.children?.length) lines.push(s.drillable(a.node.children.length))
  const [x, y] = arcCentroid(a)
  return { lines, style: tooltipPlacement(cx.value + x, cy.value + y, effectiveWidth.value, effectiveHeight.value, 200, 18 * lines.length + 8) }
})

const ariaLabel = computed(() =>
  i18n.value.sunburst.ariaLabel(props.title || i18n.value.sunburst.title, crumbs.value.map((c) => c.name).join(' / '), focus.value.children?.length ?? 0, valueText(focus.value.value ?? 0))
)

defineExpose({
  up,
  reset: () => setPath([]),
  drillTo: (path: string[]) => setPath(path),
})
</script>
