<template>
  <div class="treemap-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px` }">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <!-- 麵包屑：目前在哪一層，點了回到那一層 -->
      <nav v-if="crumbs.length > 1" :aria-label="i18n.treemap.breadcrumb" class="min-w-0">
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
      <p v-if="!tiles.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">
        {{ props.emptyText ?? i18n.treemap.empty }}
      </p>
      <svg
        v-else
        :width="effectiveWidth"
        :height="effectiveHeight"
        class="block select-none"
        role="group"
        :aria-label="ariaLabel"
        @mouseleave="hoverKey = null"
        @keydown="onKeydown"
      >
        <g
          v-for="t in tiles"
          :key="t.key"
          :ref="(el) => setTileEl(t.key, el as SVGGElement | null)"
          :role="t.depth === 1 ? 'button' : undefined"
          :tabindex="t.depth === 1 ? (t.key === activeKey ? 0 : -1) : undefined"
          :aria-label="t.depth === 1 ? tileLabel(t) : undefined"
          class="outline-none"
          :class="t.node.children?.length || t.depth === 1 ? 'cursor-pointer' : ''"
          @click.stop="onTileClick(t)"
          @mouseenter="hoverKey = t.key"
          @focus="activeKey = t.key; focusKey = t.key"
          @blur="focusKey = null"
        >
          <rect
            :x="t.x0"
            :y="t.y0"
            :width="Math.max(0, t.x1 - t.x0)"
            :height="Math.max(0, t.y1 - t.y0)"
            :style="{ fill: fillOf(t), stroke: hoverKey === t.key || focusKey === t.key ? chartTheme.text : chartTheme.surface }"
            :stroke-width="hoverKey === t.key || focusKey === t.key ? 2 : 1"
          />
          <!-- 兩層時第一層的標題列；一層（或第二層）時方塊左上角的名稱與數值 -->
          <template v-if="labelOf(t) !== 'none'">
            <text
              :x="t.x0 + 5"
              :y="t.y0 + 14"
              font-size="12"
              :font-weight="t.depth === 1 ? 600 : 400"
              paint-order="stroke"
              stroke-width="3"
              stroke-linejoin="round"
              :style="{ fill: chartTheme.text, stroke: chartTheme.surface }"
              pointer-events="none"
            >
              {{ t.node.data.name }}<tspan v-if="levels === 2 && t.depth === 1 && labelOf(t) === 'full'" dx="6" font-weight="400" :style="{ fill: chartTheme.textMuted }">{{ valueText(t.node.value ?? 0) }}</tspan>
            </text>
            <text
              v-if="labelOf(t) === 'full' && !(levels === 2 && t.depth === 1)"
              :x="t.x0 + 5"
              :y="t.y0 + 29"
              font-size="11"
              paint-order="stroke"
              stroke-width="3"
              stroke-linejoin="round"
              :style="{ fill: chartTheme.textMuted, stroke: chartTheme.surface }"
              pointer-events="none"
            >
              {{ valueText(t.node.value ?? 0) }}
            </text>
          </template>
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

    <!-- 指標色階 -->
    <div v-if="props.colorBy === 'metric' && metricDomain" class="flex items-center justify-center gap-2 text-xs text-content-secondary">
      <span v-if="props.metricLabel">{{ props.metricLabel }}</span>
      <span>{{ metricText(metricDomain[0]) }}</span>
      <span class="relative h-2.5 w-40 rounded-sm border border-stroke-light" :style="{ background: gradient }" aria-hidden="true"></span>
      <span>{{ metricText(metricDomain[1]) }}</span>
      <span v-if="props.metricCenter !== null" class="text-content-tertiary">{{ i18n.treemap.center(metricText(props.metricCenter)) }}</span>
    </div>
    <p class="text-xs text-content-tertiary">{{ i18n.treemap.hint }}</p>

    <!-- 給螢幕閱讀器：目前這一層的資料 -->
    <table class="sr-only">
      <caption>{{ crumbs.map((c) => c.name).join(' / ') }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ i18n.treemap.name }}</th>
          <th scope="col">{{ i18n.treemap.value }}</th>
          <th scope="col">{{ i18n.treemap.share }}</th>
          <th v-if="props.colorBy === 'metric'" scope="col">{{ props.metricLabel || i18n.treemap.metric }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in focus.children ?? []" :key="nodeKey(c.data)">
          <th scope="row">{{ c.data.name }}</th>
          <td>{{ valueText(c.value ?? 0) }}</td>
          <td>{{ shareText(c) }}</td>
          <td v-if="props.colorBy === 'metric'">{{ metricOrDash(c) }}</td>
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
import { buildHierarchy, findByPath, labelFit, layoutTreemap, metricColor, metricOf, metricRatio, nodeKey, pathOf, type TreemapNode, type TreemapTile } from './utils/treemap'
import { useLocale } from '../shared/config'

/**
 * TreemapChart —— 矩形樹圖
 *
 * 用途：階層的組成 —— 不良依「廠 → 線 → 站 → 不良代碼」、成本依「部門 → 科目」、庫存依「倉 → 料號」。
 * 面積是數量，一眼看出哪一塊最大；顏色可以是分組，或另一個指標（不良率、成長率）。
 *
 * - 一次畫一層（levels=2 時兩層，第一層有標題列）；點有子節點的方塊往下鑽，麵包屑回上層（v-model:path）
 * - colorBy='group'：每個子節點一個類別色；'metric'：依 metric 的連續色階（metricCenter 設定時為發散色階）
 * - 放不下的方塊不放文字（滑過看提示）；文字有底色描邊，在任何顏色上都看得清楚
 * - 鍵盤：Tab 進入後方向鍵依位置移動、Enter 往下鑽、Esc / Backspace 回上層
 * - 附隱藏的資料表（目前這一層的名稱、數量、佔比、指標）
 */

interface TreemapChartProps {
  /** 根節點 */
  data: TreemapNode
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  /** 一次畫幾層 */
  levels?: 1 | 2
  /** v-model:path：目前所在的節點（每層的 id 或 name） */
  path?: string[]
  colorBy?: 'group' | 'metric'
  /** 指標的範圍；不給時依資料 */
  metricDomain?: [number, number] | null
  /** 發散色階的中心（例如目標值）；null 為連續色階 */
  metricCenter?: number | null
  /** 色階兩端的顏色（任何 CSS 顏色）：low 只用於發散色階 */
  metricColors?: { low?: string; high?: string }
  metricLabel?: string
  metricFormat?: ((value: number) => string) | null
  unit?: string
  valueFormat?: ((value: number) => string) | null
  emptyText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
const props = withDefaults(defineProps<TreemapChartProps>(), {
  width: 640,
  height: 400,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  levels: 1,
  path: undefined,
  colorBy: 'group',
  metricDomain: null,
  metricCenter: null,
  metricColors: () => ({}),
  metricLabel: '',
  metricFormat: null,
  unit: '',
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:path', path: string[]): void
  /** 點一個沒有子節點的方塊（或 Enter） */
  (e: 'node-click', node: TreemapNode, path: string[]): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))
const levels = computed(() => props.levels)

// ---- 階層與目前位置 ----
const root = computed(() => buildHierarchy(props.data))
const innerPath = ref<string[]>(props.path ?? [])
watch(
  () => props.path,
  (p) => (innerPath.value = p ?? [])
)
const focus = computed(() => findByPath(root.value, innerPath.value))
function setPath(p: string[]): void {
  innerPath.value = p
  emit('update:path', p)
  hoverKey.value = null
  // 鑽取後焦點放在新一層的第一塊（鍵盤操作才不會掉到 body）
  if (focusKey.value !== null || document.activeElement?.closest('nav')) void nextTick(() => focusFirst())
}
const crumbs = computed(() => focus.value.ancestors().reverse().map((n) => ({ name: n.data.name, path: pathOf(n) })))

// ---- 版面 ----
const tiles = computed(() => layoutTreemap(focus.value, effectiveWidth.value, effectiveHeight.value, { levels: props.levels }))
const labelOf = (t: TreemapTile) => {
  const w = t.x1 - t.x0
  const h = t.y1 - t.y0
  // 兩層時第一層只在標題列放文字
  if (props.levels === 2 && t.depth === 1) {
    const full = `${t.node.data.name}  ${valueText(t.node.value ?? 0)}`
    if (labelFit(w, 40, full, '') === 'full') return 'full'
    return labelFit(w, 22, t.node.data.name, '') === 'none' ? 'none' : 'name'
  }
  if (props.levels === 2 && t.depth === 2 && h < 34) return 'none'
  return labelFit(w, h, t.node.data.name, valueText(t.node.value ?? 0))
}

// ---- 顏色 ----
const metricDomain = computed<[number, number] | null>(() => {
  if (props.metricDomain) return props.metricDomain
  const vals = tiles.value.map((t) => metricOf(t.node)).filter((v): v is number => v !== null)
  if (!vals.length) return null
  // 有中心時，中心兩側各自依資料的範圍換算（不會為了對稱編出不存在的負值）
  return d3.extent(vals) as [number, number]
})
const mColors = computed(() => ({
  low: props.metricColors.low ?? 'rgb(var(--t-chart-1))',
  high: props.metricColors.high ?? (props.metricCenter !== null ? 'rgb(var(--t-danger-solid))' : 'rgb(var(--t-chart-1))'),
  base: chartTheme.surfaceMuted,
}))
const groupIndex = computed(() => new Map((focus.value.children ?? []).map((c, i) => [nodeKey(c.data), i])))
function fillOf(t: TreemapTile): string {
  if (t.node.data.color) return t.node.data.color
  if (props.colorBy === 'metric') {
    const m = metricOf(t.node)
    if (m === null || !metricDomain.value) return chartPalette.muted
    return metricColor(metricRatio(m, metricDomain.value, props.metricCenter), mColors.value, props.metricCenter !== null)
  }
  // 分組：依第一層（目前節點的子節點）的順序取類別色；第二層用同色、淡一點
  const top = t.depth === 1 ? t.node : t.node.parent!
  const i = groupIndex.value.get(nodeKey(top.data)) ?? 0
  const c = top.data.color ?? (i < chartPalette.categorical.length ? chartPalette.categorical[i] : chartPalette.other)
  if (props.levels === 2 && t.depth === 1) return `color-mix(in srgb, ${c} 30%, ${chartTheme.surfaceMuted})`
  return t.depth === 2 ? `color-mix(in srgb, ${c} 78%, ${chartTheme.surface})` : c
}
const gradient = computed(() => {
  const c = mColors.value
  const d = metricDomain.value
  const center = props.metricCenter
  // 中心在色條上的位置（資料都在中心同一側時，色條只有那一側）
  const at = center !== null && d && d[1] > d[0] ? Math.min(100, Math.max(0, ((center - d[0]) / (d[1] - d[0])) * 100)) : 50
  return center !== null
    ? `linear-gradient(to right, ${metricColor(d && d[0] < center ? -1 : 0, c, true)}, ${c.base} ${at}%, ${metricColor(d && d[1] > center ? 1 : 0, c, true)})`
    : `linear-gradient(to right, ${metricColor(0, c, false)}, ${metricColor(1, c, false)})`
})

// ---- 文字 ----
const defaultFormat = d3.format(',~f')
const valueText = (v: number) => {
  const s = props.valueFormat ? props.valueFormat(v) : defaultFormat(Number(v.toPrecision(6)))
  return props.unit ? `${s} ${props.unit}` : s
}
const metricText = (v: number) => (props.metricFormat ? props.metricFormat(v) : defaultFormat(Number(v.toPrecision(4))))
const metricOrDash = (n: d3.HierarchyNode<TreemapNode>) => {
  const m = metricOf(n)
  return m === null ? '—' : metricText(m)
}
const shareText = (n: d3.HierarchyNode<TreemapNode>) => {
  const total = focus.value.value ?? 0
  return total > 0 ? `${d3.format('.1f')(((n.value ?? 0) / total) * 100)}%` : '—'
}
function tileLabel(t: TreemapTile): string {
  const parts = [t.node.data.name, valueText(t.node.value ?? 0), shareText(t.node)]
  if (props.colorBy === 'metric') parts.push(`${props.metricLabel || i18n.value.treemap.metric} ${metricOrDash(t.node)}`)
  if (t.node.children?.length) parts.push(i18n.value.treemap.drillable(t.node.children.length))
  return parts.join(', ')
}

// ---- 互動 ----
const hoverKey = ref<string | null>(null)
const focusKey = ref<string | null>(null)
const activeKey = ref<string | null>(null)
watch(
  tiles,
  (list) => {
    const top = list.filter((t) => t.depth === 1)
    if (!top.some((t) => t.key === activeKey.value)) activeKey.value = top[0]?.key ?? null
  },
  { immediate: true }
)
const tileEls = new Map<string, SVGGElement>()
function setTileEl(key: string, el: SVGGElement | null): void {
  if (el) tileEls.set(key, el)
  else tileEls.delete(key)
}
function focusFirst(): void {
  const first = tiles.value.find((t) => t.depth === 1)
  if (!first) return
  activeKey.value = first.key
  tileEls.get(first.key)?.focus()
}
function onTileClick(t: TreemapTile): void {
  if (t.node.children?.length) setPath(pathOf(t.node))
  else emit('node-click', t.node.data, pathOf(t.node))
}
function up(): void {
  if (innerPath.value.length) setPath(pathOf(focus.value).slice(0, -1))
}
function onKeydown(e: KeyboardEvent): void {
  const top = tiles.value.filter((t) => t.depth === 1)
  const cur = top.find((t) => t.key === activeKey.value)
  if (e.key === 'Escape' || e.key === 'Backspace') {
    if (!innerPath.value.length) return
    e.preventDefault()
    const from = pathOf(focus.value)
    up()
    // 回到上一層時焦點放在剛剛那一塊
    void nextTick(() => {
      const back = tiles.value.find((t) => t.depth === 1 && t.key === from.join('/'))
      if (back) {
        activeKey.value = back.key
        tileEls.get(back.key)?.focus()
      }
    })
    return
  }
  if (!cur) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    onTileClick(cur)
    return
  }
  const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key]
  if (!dir) return
  e.preventDefault()
  // 依位置找下一塊：整塊在目前這塊的那一側（越過邊緣），再挑離中心最近的（偏離方向的距離加重計算）
  const cx = (t: TreemapTile) => (t.x0 + t.x1) / 2
  const cy = (t: TreemapTile) => (t.y0 + t.y1) / 2
  const beyond = (t: TreemapTile) =>
    dir[0] > 0 ? t.x0 >= cur.x1 - 1 : dir[0] < 0 ? t.x1 <= cur.x0 + 1 : dir[1] > 0 ? t.y0 >= cur.y1 - 1 : t.y1 <= cur.y0 + 1
  let best: TreemapTile | null = null
  let bestScore = Infinity
  for (const t of top) {
    if (t === cur || !beyond(t)) continue
    const dx = cx(t) - cx(cur)
    const dy = cy(t) - cy(cur)
    const along = Math.abs(dx * dir[0] + dy * dir[1])
    const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0])
    const score = along + across * 2
    if (score < bestScore) {
      bestScore = score
      best = t
    }
  }
  if (best) {
    activeKey.value = best.key
    tileEls.get(best.key)?.focus()
  }
}

const tip = computed(() => {
  const t = tiles.value.find((x) => x.key === (hoverKey.value ?? focusKey.value))
  if (!t) return null
  const names = t.node.ancestors().reverse().slice(1).map((a) => a.data.name)
  const lines = [names.join(' / '), i18n.value.treemap.valueShare(valueText(t.node.value ?? 0), shareText(t.node))]
  if (props.colorBy === 'metric') lines.push(i18n.value.treemap.metricLine(props.metricLabel || i18n.value.treemap.metric, metricOrDash(t.node)))
  if (t.node.children?.length) lines.push(i18n.value.treemap.drillable(t.node.children.length))
  return { lines, style: tooltipPlacement((t.x0 + t.x1) / 2, t.y0 + 12, effectiveWidth.value, effectiveHeight.value, 200, 18 * lines.length + 8) }
})

const ariaLabel = computed(() =>
  i18n.value.treemap.ariaLabel(props.title || i18n.value.treemap.title, crumbs.value.map((c) => c.name).join(' / '), focus.value.children?.length ?? 0, valueText(focus.value.value ?? 0))
)

defineExpose({
  /** 回上一層 */
  up,
  /** 回到最上層 */
  reset: () => setPath([]),
  /** 前往某個節點 */
  drillTo: (path: string[]) => setPath(path),
})
</script>
